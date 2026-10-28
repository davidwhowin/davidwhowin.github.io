// Quiet evening (DESIGN.md Ads; docs/MARKET_MONETIZATION_NEXT.md idea 2): an opt-in rewarded ad that turns
// interstitial ad breaks off for AD_RULES.QUIET_HOURS hours, at most once per local calendar day.
// Pure rules (no DOM, no SDK, no save writes). C# port: Scripts/Core/Meta/QuietEvening.cs (bit-exact, fixture parity).
//
// Save: save.ads.quietUntil (Unix ms, 0 = never) and save.ads.quietDay ('YYYY-MM-DD' of the last use, or null).
// Both live under save.ads, which transfer codes never carry (LOCAL_ONLY_KEYS): the window is short-lived and belongs
// to this phone, so a code moved to another phone starts with no quiet evening and its own once-a-day offer.
//
// Ethics: it only ever REMOVES ad breaks (AdDirector checks it next to Remove Ads and the Café Club). It never reads
// difficulty, scores, ad readiness or ad value, and the offer is the same for everyone who still sees ad breaks.
import { AD_RULES } from '../ads/adRules.js';
import { t, tp } from '../i18n/index.js'; // pure lookup, no UI imports (docs/LOCALISATION.md phase 4)

const HOUR_MS = 3600000;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Length of one quiet evening in ms. */
export function quietMs(R = AD_RULES) { return Math.max(0, Math.floor(Number(R.QUIET_HOURS) || 0)) * HOUR_MS; }

/** Stored values -> { quietUntil (finite ms >= 0, else 0), quietDay ('YYYY-MM-DD' or null) }. */
export function sanitizeQuiet(ads) {
  const a = ads && typeof ads === 'object' ? ads : {};
  const u = typeof a.quietUntil === 'number' && Number.isFinite(a.quietUntil) && a.quietUntil > 0 ? Math.floor(a.quietUntil) : 0;
  const d = typeof a.quietDay === 'string' && DAY_RE.test(a.quietDay) ? a.quietDay : null;
  return { quietUntil: u, quietDay: d };
}

/**
 * True while a quiet evening runs at nowMs. A window further away than one full quiet evening (the clock was set
 * back after it started) is treated as over, so a changed clock can never stretch it past QUIET_HOURS.
 */
export function quietActive(quietUntil, nowMs, R = AD_RULES) {
  const u = Number(quietUntil), n = Number(nowMs);
  if (!Number.isFinite(u) || !Number.isFinite(n) || u <= 0) return false;
  return u > n && u - n <= quietMs(R);
}

/** Ms left of the running quiet evening (0 when none). */
export function quietLeftMs(quietUntil, nowMs, R = AD_RULES) {
  return quietActive(quietUntil, nowMs, R) ? Number(quietUntil) - Number(nowMs) : 0;
}

/**
 * How many ad breaks (interstitials) this phone has actually shown, from save.ads (a whole number >= 0). A save from
 * before the counter existed is seeded with 1 when its last ad of any kind came after its last rewarded ad (so that
 * last ad was an ad break), else 0. C#: QuietEvening.SanitizeBreaks (fixture parity).
 */
export function sanitizeBreaksSeen(ads) {
  const a = ads && typeof ads === 'object' ? ads : {};
  const b = a.breaksSeen;
  if (typeof b === 'number' && Number.isFinite(b)) return Math.max(0, Math.floor(b));
  const l = typeof a.lastAdAt === 'number' && Number.isFinite(a.lastAdAt) ? a.lastAdAt : 0;
  const r = typeof a.lastRewardedAt === 'number' && Number.isFinite(a.lastRewardedAt) ? a.lastRewardedAt : 0;
  return l > 0 && l > r ? 1 : 0;
}

/**
 * Why the quiet-evening button is hidden right now, or null to show it. It reads purchases, the run flag, Journey
 * progress, how many ad breaks this phone has really shown and its own once-a-day record. Never difficulty, scores or
 * ad readiness.
 * st: { removeAds, clubActive, runActive, quietUntil, quietDay, today, breaksSeen, journeyLevel }
 *   breaksSeen: AdDirector's own count of ad breaks actually shown. The offer waits until she has met at least one,
 *   so it never sells relief from something she has not seen (docs/UX_FEATURE_GATES.md finding 1).
 *   journeyLevel: save.journey.level (the next level to play); AD_RULES.JOURNEY_FROM_LEVEL stays the floor. Both must
 *   hold. This only moves an ad offer later; it never touches an ad-break cap.
 */
export function quietOfferBlock(st = {}, nowMs = Date.now(), R = AD_RULES) {
  const s = st || {};
  if (s.removeAds) return 'remove ads owned';
  if (s.clubActive) return 'cafe club active';
  if (s.runActive) return 'run in progress';
  if (quietActive(s.quietUntil, nowMs, R)) return 'quiet evening running';
  if (typeof s.today === 'string' && s.quietDay === s.today) return 'used today';
  const lvl = Number(s.journeyLevel);
  const seen = typeof s.breaksSeen === 'number' && Number.isFinite(s.breaksSeen) ? s.breaksSeen : 0;
  if (!(seen >= 1) || !(Number.isFinite(lvl) && lvl >= R.JOURNEY_FROM_LEVEL)) return 'too early';
  return null;
}

/** The new record after the reward was earned at nowMs on local day `today`. */
export function startQuiet(nowMs, today, R = AD_RULES) {
  return { quietUntil: Math.floor(Number(nowMs) || 0) + quietMs(R), quietDay: DAY_RE.test(String(today)) ? String(today) : null };
}

/** 22, 41 -> "10:41 pm"; 0, 5 -> "12:05 am"; 12, 0 -> "12:00 pm". */
export function clockLabel(h, m) {
  const hh = ((Math.floor(Number(h) || 0) % 24) + 24) % 24, mm = ((Math.floor(Number(m) || 0) % 60) + 60) % 60;
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'am' : 'pm'}`;
}

/** Local end time of a quiet evening, e.g. "10:41 pm". */
export function quietUntilLabel(quietUntil) {
  const d = new Date(Number(quietUntil) || 0);
  return clockLabel(d.getHours(), d.getMinutes());
}

/** Ms left -> "3 hours", "2 h 41 min", "45 min", "1 min" (whole minutes, rounded up). */
export function leftLabel(ms) {
  const min = Math.max(0, Math.ceil((Number(ms) || 0) / 60000));
  const h = Math.floor(min / 60), m = min % 60;
  if (h > 0 && m === 0) return `${h} hour${h === 1 ? '' : 's'}`;
  if (h > 0) return `${h} h ${m} min`;
  return `${m} min`;
}

/** The plain copy (C# QuietEvening.Copy must match word for word). */
export function quietCopy(R = AD_RULES) {
  const h = Math.max(0, Math.floor(Number(R.QUIET_HOURS) || 0));
  const hours = tp('quiet.hours', h, { n: h });
  return {
    row: t('quiet.row'),
    rowSub: t('quiet.rowSub', { hours }),
    title: t('quiet.title'),
    body: t('quiet.body', { hours }),
    note: t('quiet.note'),
    watch: t('quiet.watch'),
    no: t('quiet.no'),
    noAd: t('quiet.noAd'),
    done: t('quiet.done', { hours }),
  };
}

/** The Today row's line while a quiet evening runs: "No ad breaks until 10:41 pm (2 h 41 min left)". */
export function quietActiveLine(untilLabel, left) {
  return t('quiet.active', { until: untilLabel, left });
}

/** The result screen's ad-break line while a quiet evening runs: "No ad breaks until 10:41 pm. Enjoy your quiet evening." */
export function quietForecastLine(untilLabel) {
  return t('adBreak.quiet', { until: untilLabel });
}
