// Nova Drop — AdDirector: ad POLICY. Decides when an ad may be shown.
// It never touches difficulty, spawns or scores — it only gates ad calls.
//
// Interstitial rules (DESIGN.md → Ads), ALL must hold:
//   lifetime runs >= 3, >= 150 s since last ad of any kind, last run lasted >= 45 s,
//   no rewarded ad watched in the last 180 s, at most 1 per 2 runs,
//   "Remove Ads" not owned, no Café Club month running (src/meta/pass.js: the Club switches ad breaks off while it
//   runs, so it only makes the caps stricter), and only from the game-over screen (never mid-run).
// Regulars (played on >= 14 distinct days, from the save's own play-day count): at most 1 per 3 runs and >= 240 s
// since the last ad, whichever is stricter than the caps above (interstitialCaps). It only ever reduces ads.
// Quiet evening (src/meta/quietEvening.js): while save.ads.quietUntil is in the future (at most QUIET_HOURS ahead),
// interstitials are off. The player turns it on with one rewarded video she chooses, at most once per local day. It is
// one more "blocked" check next to Remove Ads and the Café Club, so it can only make the caps stricter. Its offer
// waits until an ad break has really been shown (save.ads.breaksSeen, counted here, never read by any cap).
// Menu banner: only after MENU_BANNER_FROM_RUNS finished games AND once Journey Level MENU_BANNER_AFTER_LEVEL is
// cleared (journey progress only, never ad state), never during a run, never with Remove Ads.
import { AdProvider } from './adProvider.js';
import { AD_RULES, AD_REWARDS, REWARDED_PLACEMENTS } from './adRules.js';
import { passState } from '../meta/pass.js';
import { playDayCount } from '../meta/playDays.js';
import { dayKey } from '../meta/daily.js';
import { sanitizeQuiet, sanitizeBreaksSeen, quietActive, quietLeftMs, quietOfferBlock, startQuiet } from '../meta/quietEvening.js';

// The caps live in adRules.js (pure data) so the "How ads work here" page reads the same numbers.
const RULES = AD_RULES;
export { AD_RULES, AD_REWARDS };

const log = (...a) => { try { console.debug('[Ads]', ...a); } catch (_) {} };
const now = () => Date.now();

let save = null;       // the shared save object from save.js
let persist = null;    // optional () => void that writes the save
// In-memory mirror of the ad bookkeeping (also written to save.ads).
const mem = {
  lastAdAt: 0,
  lastRewardedAt: 0,
  runsSinceInterstitial: RULES.RUNS_PER_INTERSTITIAL, // first eligible run is allowed
  lifetimeRuns: 0,
  quietUntil: 0,   // quiet evening: Unix ms when it ends (0 = never)
  quietDay: null,  // local 'YYYY-MM-DD' of the last quiet evening (once per day)
  breaksSeen: 0,   // ad breaks (interstitials) actually shown on this phone; only the quiet-evening offer reads it
};
let removeAds = false;
let run = { active: false, startedAt: 0, reviveUsed: false, lastDurationSec: 0 };
let busy = false;
// Puzzle Books (DESIGN.md "Puzzle Books"): while a book is open there are no ads of any kind, and a book puzzle
// never counts as a run (main.js never calls onRunStart/onRunEnd for it). Set by main.js on entering/leaving a book.
let inBook = false;

function num(v, d = 0) { return Number.isFinite(Number(v)) ? Number(v) : d; }

function writeBack() {
  if (!save || typeof save !== 'object') return;
  try {
    save.removeAds = removeAds;
    save.ads = {
      lastAdAt: mem.lastAdAt,
      lastRewardedAt: mem.lastRewardedAt,
      runsSinceInterstitial: mem.runsSinceInterstitial,
      lifetimeRuns: mem.lifetimeRuns,
      quietUntil: mem.quietUntil,
      quietDay: mem.quietDay,
      breaksSeen: mem.breaksSeen,
    };
    if (typeof persist === 'function') persist();
  } catch (e) { log('persist failed', e); }
}

/** A Café Club month is running (a purchase fact read from the save; never device or "ad value" data). */
function clubActive() {
  try { return !!(save && save.pass && passState(save, new Date(now())).active); } catch (_) { return false; }
}

/** Lifetime runs: max of our own counter and whatever the save already tracks. */
function lifetimeRuns() {
  const s = save || {};
  return Math.max(
    mem.lifetimeRuns,
    num(s.runs), num(s.totalRuns), num(s.lifetimeRuns),
    num(s.stats?.runs), num(s.stats?.totalRuns), num(s.stats?.gamesPlayed),
  );
}

/** True once Journey level n is cleared (the next level is past it, or it has a star). Same test as onboarding.menuExtrasOpen. */
function journeyCleared(n) {
  const j = (save && save.journey) || {};
  return num(j.level, 1) > n || num(j.stars && j.stars[n]) > 0;
}

/** AdDirector's lifetime-games rule: an Endless game over can be followed by an ad break once this is true. */
function endlessEligible() { return lifetimeRuns() >= RULES.MIN_LIFETIME_RUNS; }

/** A quiet evening is running right now. */
function quietNow() { return quietActive(mem.quietUntil, now()); }

function secondsSince(t) { return t ? (now() - t) / 1000 : Infinity; }

/**
 * PURE: the two count/gap caps that apply for a player with `playDays` distinct play days (DESIGN.md Ads,
 * "Fewer ad breaks for regulars"). From R.REGULAR_DAYS days on, each cap is the STRICTER of the base cap and the
 * regulars' cap (Math.max), so this can never loosen a cap for anyone. Reads play history only.
 * Returns { regular, runsPerInterstitial, minSecSinceAnyAd }.
 */
export function interstitialCaps(playDays, R = RULES) {
  const days = Number.isFinite(Number(playDays)) ? Number(playDays) : 0;
  const regular = days >= R.REGULAR_DAYS;
  return {
    regular,
    runsPerInterstitial: regular ? Math.max(R.RUNS_PER_INTERSTITIAL, R.REGULAR_RUNS_PER_INTERSTITIAL) : R.RUNS_PER_INTERSTITIAL,
    minSecSinceAnyAd: regular ? Math.max(R.MIN_SEC_SINCE_ANY_AD, R.REGULAR_MIN_SEC_SINCE_ANY_AD) : R.MIN_SEC_SINCE_ANY_AD,
  };
}

/** The caps for the current save's own play-day count. */
function caps() { return interstitialCaps(playDayCount(save)); }

/**
 * PURE, read-only forecast for the honest "ad break" line on result screens (DESIGN.md v0.5.3).
 * Uses exactly the caps interstitialBlockReason() checks and never changes them.
 * state: { removeAds, clubActive?, quietUntil?, nowMs?, lifetimeRuns, runsSinceInterstitial, lastDurationSec, runsPerInterstitial? }
 *   runsPerInterstitial: the count cap in force (interstitialCaps; default AD_RULES.RUNS_PER_INTERSTITIAL)
 * screenAllows: whether leaving this screen asks for an interstitial at all (main.js: an Endless
 * game over, or a won Journey level >= AD_RULES.JOURNEY_FROM_LEVEL; never a fail, the Daily Nebula or an autoplay run).
 * Returns
 *   { kind: 'removed' }               Remove Ads owned: no interstitial ever.
 *   { kind: 'quiet', until }          a quiet evening runs until `until` (Unix ms) and screenAllows: no interstitial before then.
 *   { kind: 'none', gamesUntil: n }   no interstitial when leaving this screen (guaranteed: it only
 *                                      uses caps that can't change while the screen is open), and none
 *                                      before at least n more games have ended (n >= 1).
 *   { kind: 'maybe' }                 the count caps pass, so one MAY play (time caps, ad fill).
 */
export function forecastAdBreak(state = {}, { screenAllows = true } = {}) {
  if (state.removeAds || state.clubActive) return { kind: 'removed' };
  // only on screens that could ask for an ad break: a Journey fail card never reads "Enjoy your quiet evening"
  if (screenAllows && state.quietUntil && quietActive(state.quietUntil, num(state.nowMs, now()))) return { kind: 'quiet', until: num(state.quietUntil) };
  const life = num(state.lifetimeRuns);
  const per = Math.max(RULES.RUNS_PER_INTERSTITIAL, num(state.runsPerInterstitial, RULES.RUNS_PER_INTERSTITIAL));
  const since = num(state.runsSinceInterstitial, RULES.RUNS_PER_INTERSTITIAL);
  const hardBlocked = !screenAllows
    || life < RULES.MIN_LIFETIME_RUNS
    || num(state.lastDurationSec) < RULES.MIN_RUN_SEC
    || since < per;
  if (!hardBlocked) return { kind: 'maybe' };
  // every finished game adds at least 1 to both counters; nothing resets them without an interstitial
  const gamesUntil = Math.max(1, per - since, RULES.MIN_LIFETIME_RUNS - life);
  return { kind: 'none', gamesUntil };
}

export const AdDirector = {
  /**
   * @param {object} saveObj  the save object from save.js (mutated: save.ads, save.removeAds)
   * @param {Function} [persistFn] optional; called after bookkeeping changes to persist the save
   */
  init(saveObj, persistFn) {
    save = saveObj && typeof saveObj === 'object' ? saveObj : null;
    persist = typeof persistFn === 'function' ? persistFn : null;
    const a = save?.ads || {};
    mem.lastAdAt = num(a.lastAdAt);
    mem.lastRewardedAt = num(a.lastRewardedAt);
    mem.runsSinceInterstitial = num(a.runsSinceInterstitial, RULES.RUNS_PER_INTERSTITIAL);
    mem.lifetimeRuns = num(a.lifetimeRuns);
    const q = sanitizeQuiet(a);
    mem.quietUntil = q.quietUntil;
    mem.quietDay = q.quietDay;
    mem.breaksSeen = sanitizeBreaksSeen(a);
    removeAds = !!save?.removeAds;
    log('init', { ...mem, removeAds });
    // Kick off SDK + consent early so the first ad is preloaded. Never blocks the game.
    AdProvider.init().catch?.(() => {});
  },

  /** Puzzle Books: true while a book (or one of its puzzles) is open. No interstitial, rewarded ad or banner then. */
  setInBook(b) {
    inBook = !!b;
    if (inBook) AdProvider.hideBanner?.();
    log('inBook', inBook);
  },

  inBook() { return inBook; },

  onRunStart() {
    run = { active: true, startedAt: now(), reviveUsed: false, lastDurationSec: 0 };
    log('run start');
  },

  /** Call once when a run truly ends (after any revive was declined/used). */
  onRunEnd({ durationSec, score, best } = {}) {
    const dur = Number.isFinite(durationSec) ? durationSec
      : run.startedAt ? (now() - run.startedAt) / 1000 : 0;
    run.active = false;
    run.lastDurationSec = dur;
    // One finished game = +1. main.js (settleRun/settleEndless) already bumped save.runs for this same game
    // before calling us, so never add 1 on top of save.runs (that counted the game twice and let the
    // first ad break come one game early). Our own counter catches up to save.runs, never past it.
    mem.lifetimeRuns = Math.max(mem.lifetimeRuns + 1, num(save?.runs));
    mem.runsSinceInterstitial += 1;
    log('run end', { durationSec: Math.round(dur), score, best, lifetimeRuns: mem.lifetimeRuns, runsSinceInterstitial: mem.runsSinceInterstitial });
    writeBack();
  },

  /**
   * Revive is offered at most once per run, and not if Second Wind already revived.
   * runState may carry: { reviveUsed, revived, secondWindUsed, usedSecondWind }.
   */
  canOfferRevive(runState = {}) {
    const rs = runState || {};
    let ok = true, why = 'ok';
    if (run.reviveUsed) { ok = false; why = 'revive already offered this run'; }
    else if (rs.reviveUsed || rs.revived) { ok = false; why = 'run already revived'; }
    else if (rs.secondWindUsed || rs.usedSecondWind) { ok = false; why = 'second wind used'; }
    log('canOfferRevive', ok, why);
    return ok;
  },

  /** Honest emphasis copy for the revive offer. Never exaggerates. */
  reviveEmphasis({ score = 0, best = 0 } = {}) {
    score = Math.floor(num(score)); best = Math.floor(num(best));
    let out;
    if (best > 0 && score > best) out = { emphasise: true, message: 'New best! Keep it going?' };
    else if (best > 0 && score === best) out = { emphasise: true, message: 'You tied your best! Keep it going?' };
    else if (best > 0 && score >= best * RULES.EMPHASIS_RATIO) {
      out = { emphasise: true, message: `You were ${(best - score).toLocaleString('en-US')} from your best!` };
    } else out = { emphasise: false, message: 'Continue this run?' };
    log('reviveEmphasis', { score, best }, out);
    return out;
  },

  /** placement: 'revive' | 'double_coins' | 'reroll' | 'daily_x2' | 'quiet_evening'. Resolves true if reward earned. */
  async showRewarded(placement) {
    if (!REWARDED_PLACEMENTS.includes(placement)) log('unknown rewarded placement', placement);
    if (inBook) { log('rewarded skipped: no ads inside a puzzle book'); return false; }
    if (busy) { log('rewarded skipped: another ad is showing'); return false; }
    if (placement === 'revive') run.reviveUsed = true; // one offer per run, regardless of outcome
    busy = true;
    let ok = false;
    try {
      ok = !!(await AdProvider.showRewarded(placement));
    } catch (_) { ok = false; }
    finally { busy = false; }
    if (ok) {
      mem.lastAdAt = now();
      mem.lastRewardedAt = mem.lastAdAt;
      writeBack();
    }
    log('rewarded', placement, ok ? 'earned' : 'not earned');
    return ok;
  },

  /** Returns why an interstitial would be blocked right now, or null if allowed. */
  interstitialBlockReason(placement = 'post_run') {
    if (placement !== 'post_run') return `placement ${placement} not allowed`;
    if (inBook) return 'puzzle book open';
    if (removeAds) return 'remove ads owned';
    if (clubActive()) return 'cafe club active';
    if (quietNow()) return 'quiet evening';
    if (run.active) return 'run in progress';
    if (!endlessEligible()) return `lifetime runs ${lifetimeRuns()} < ${RULES.MIN_LIFETIME_RUNS}`;
    const c = caps(); // regulars: the stricter of the base and regulars' caps (never looser)
    if (secondsSince(mem.lastAdAt) < c.minSecSinceAnyAd) return `last ad ${Math.round(secondsSince(mem.lastAdAt))}s ago`;
    if (run.lastDurationSec < RULES.MIN_RUN_SEC) return `run lasted ${Math.round(run.lastDurationSec)}s`;
    if (secondsSince(mem.lastRewardedAt) < RULES.MIN_SEC_SINCE_REWARDED) return `rewarded ${Math.round(secondsSince(mem.lastRewardedAt))}s ago`;
    if (mem.runsSinceInterstitial < c.runsPerInterstitial) return `only ${mem.runsSinceInterstitial} run(s) since last interstitial`;
    if (busy) return 'another ad is showing';
    return null;
  },

  /**
   * Read-only forecast for the result-screen line (see forecastAdBreak). Never changes any cap,
   * counter or timer. Call after onRunEnd().
   */
  adBreakForecast({ screenAllows = true } = {}) {
    return forecastAdBreak({
      removeAds, clubActive: clubActive(), quietUntil: mem.quietUntil, nowMs: now(), lifetimeRuns: lifetimeRuns(), runsSinceInterstitial: mem.runsSinceInterstitial, lastDurationSec: run.lastDurationSec,
      runsPerInterstitial: caps().runsPerInterstitial,
    }, { screenAllows });
  },

  /** Read-only: the caps in force for this save (interstitialCaps). `regular` drives the quiet About ads line. */
  interstitialCaps() { return caps(); },

  /**
   * Quiet evening: why its button is hidden right now, or null to show it (quietOfferBlock). Reads purchases, the
   * run flag, Journey progress, the director's own count of ad breaks shown and its own once-a-day record only.
   */
  quietOfferBlock() {
    const j = (save && save.journey) || {};
    return quietOfferBlock({
      removeAds, clubActive: clubActive(), runActive: run.active, quietUntil: mem.quietUntil, quietDay: mem.quietDay,
      today: dayKey(new Date(now())), breaksSeen: mem.breaksSeen, journeyLevel: num(j.level, 1),
    }, now());
  },

  /** Read-only: { active, until (Unix ms), leftMs } of the quiet evening. */
  quietState() {
    const active = quietNow();
    return { active, until: active ? mem.quietUntil : 0, leftMs: quietLeftMs(mem.quietUntil, now()) };
  },

  /**
   * The player tapped "Watch video" on the quiet-evening card. Plays the rewarded ad; only when the reward is earned
   * does the quiet evening start (QUIET_HOURS from now) and today's use get recorded. Resolves true if it started.
   */
  async startQuietEvening() {
    const why = this.quietOfferBlock();
    if (why) { log('quiet evening not offered:', why); return false; }
    const ok = await this.showRewarded('quiet_evening');
    if (!ok) return false;
    const q = startQuiet(now(), dayKey(new Date(now())));
    mem.quietUntil = q.quietUntil;
    mem.quietDay = q.quietDay;
    writeBack();
    log('quiet evening until', new Date(mem.quietUntil).toISOString());
    return true;
  },

  /** Call when leaving the game-over screen. Resolves true if an interstitial was shown. */
  async maybeShowInterstitial(placement = 'post_run') {
    const reason = this.interstitialBlockReason(placement);
    if (reason) { log('interstitial skipped:', reason); return false; }
    busy = true;
    let shown = false;
    try { shown = !!(await AdProvider.showInterstitial(placement)); } catch (_) { shown = false; }
    finally { busy = false; }
    if (shown) {
      mem.lastAdAt = now();
      mem.runsSinceInterstitial = 0;
      mem.breaksSeen += 1;
      writeBack();
    }
    log('interstitial', shown ? 'shown' : 'not shown');
    return shown;
  },

  setRemoveAds(b) {
    removeAds = !!b;
    if (removeAds) AdProvider.hideBanner();
    log('removeAds', removeAds);
    writeBack();
  },

  removeAdsOwned() { return removeAds; },

  /** A Café Club month is running (a purchase fact; "How ads work here" hides the quiet-evening line then). */
  clubActive() { return clubActive(); },

  /** Why the menu banner would be blocked right now, or null if allowed. */
  bannerBlockReason() {
    if (!RULES.MENU_BANNER) return 'banner retired (no banner beside the tab bar)';
    if (inBook) return 'puzzle book open';
    if (removeAds) return 'remove ads owned';
    if (clubActive()) return 'cafe club active';
    if (run.active) return 'run in progress';
    if (lifetimeRuns() < RULES.MENU_BANNER_FROM_RUNS) return `lifetime runs ${lifetimeRuns()} < ${RULES.MENU_BANNER_FROM_RUNS}`;
    if (!journeyCleared(RULES.MENU_BANNER_AFTER_LEVEL)) return `level ${RULES.MENU_BANNER_AFTER_LEVEL} not cleared yet`;
    return null;
  },

  /** Main menu only. No-op when Remove Ads is owned, during a run, or before MENU_BANNER_FROM_RUNS finished games and Level MENU_BANNER_AFTER_LEVEL cleared. */
  showMenuBanner() {
    const reason = this.bannerBlockReason();
    if (reason) { log('banner skipped:', reason); return Promise.resolve(false); }
    return AdProvider.showBanner();
  },

  hideBanner() { return AdProvider.hideBanner(); },
};
