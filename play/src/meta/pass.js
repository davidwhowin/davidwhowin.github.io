// Café Club (save id "pass", product ids `nova_pass` and `nova_pass_year`): a 30-day, NON-renewing purchase.
// Pure functions, no DOM. Display name "Café Club" (src/meta/shopMenu.js PASS_NAME); the ids stay as they were.
//
// What it gives (Café Club 2.0, DESIGN.md "Café Club"):
//  - PASS.upfront coins the moment the purchase is verified,
//  - PASS.daily coins for each of the PASS.days calendar days of entitlement (purchase day = day 1),
//  - no ad breaks while a Club block runs (src/ads/adDirector.js; rewarded ads stay optional),
//  - one café keepsake (a Keeper outfit, src/meta/outfits.js CLUB_KEEPSAKES) for each 30-day block that has
//    started, in the member's own order, kept forever (syncKeepsakes).
//  - The 12-month plan (`nova_pass_year`) is PASS_YEAR.blocks passes at once: the first starts now (or queues
//    behind a running one), the rest queue, so it is the same 30-day logic end to end. HELD BACK
//    (PASS_YEAR_ENABLED = false): it is not sold until a reinstall can restore the unused months (a
//    non-renewing subscription with server-side or receipt restore). The code stays; the shop hides it.
//  - Former members keep the cosmic Aurora skin the old Club gave (it is now in the Cosmic piece styles for coins).
// Fairness (DESIGN.md "Store fairness rules", docs/CHINA_GAMES_RESEARCH.md §3 #1):
//  - Missed days are never lost. Each entitlement day adds one claim; unclaimed days pile up and can be
//    collected at any later time, even after the 30 days are over. At most PASS.days claims per purchase.
//  - No auto-renew and no countdown pressure: the UI only shows "Days left: N" as a plain fact.
//  - It is NOT Remove Ads: ad breaks stop only while a block runs (Remove Ads is forever, a separate purchase).
//
//  - A paid pass is never lost. The shop only sells a pass when none is running, but a real store can still
//    deliver one while a pass is active (an interrupted purchase finishing at the next launch). That pass is
//    QUEUED: its up-front coins are paid at once, and its 30 days start by themselves the day after the
//    current pass ends (shown in the pass sheet). So the store order can always be confirmed.
//
// Save shape: save.pass = { start: 'YYYY-MM-DD'|null, claimed: n, banked: n, bought: n, queued: n }
//  start   local date the current pass began (null = never bought)
//  claimed claims already collected from the current pass (0..PASS.days)
//  banked  unclaimed days carried over from an earlier, finished pass (never lost on re-buy)
//  bought  lifetime purchases (info only)
//  queued  paid passes waiting to start (0 normally). Each starts on the day after the previous one ends.
// Dates use calendar-day keys (daily.js dayKey/daysBetween), so DST and month/year ends are safe.
import { dayKey, daysBetween } from './daily.js';
import { CLUB_KEEPSAKES, CLUB_KEEPSAKE_IDS } from './outfits.js';

export const PASS = Object.freeze({ id: 'nova_pass', days: 30, upfront: 1200, daily: 160 });
/** The 12-month plan: 12 back-to-back 30-day blocks through the queue (non-renewing, one payment). */
export const PASS_YEAR = Object.freeze({ id: 'nova_pass_year', blocks: 12 });
/** The 12-month plan is not sold yet: a consumable year would be lost on reinstall (no restore path). DESIGN.md. */
export const PASS_YEAR_ENABLED = false;
/** The cosmic skin the Club gave before 2.0. No longer granted; whoever has it keeps it. */
export const LEGACY_PASS_SKIN = 'aurora';

/** Total coins one pass gives if every day is collected (eventually). */
export const PASS_TOTAL_COINS = PASS.upfront + PASS.days * PASS.daily;

export function defaultPass() {
  return { start: null, claimed: 0, banked: 0, bought: 0, queued: 0 };
}

/** Most queued passes a save keeps (far beyond any real case; the sanitizer's bound). */
export const PASS_QUEUE_MAX = 1000;

const int = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.floor(Number(v) || 0)));

/** Repair a loaded save.pass in place (old saves have none). */
export function sanitizePass(save) {
  const p = save.pass && typeof save.pass === 'object' && !Array.isArray(save.pass) ? save.pass : defaultPass();
  const start = typeof p.start === 'string' && daysBetween(p.start, p.start) === 0 ? p.start : null;
  save.pass = {
    start,
    claimed: start ? int(p.claimed, 0, PASS.days) : 0,
    banked: int(p.banked, 0, PASS.days * 1000),
    bought: int(p.bought, 0, 1e6),
    queued: start ? int(p.queued, 0, PASS_QUEUE_MAX) : 0,
  };
  return save.pass;
}

/** Entitlement days that have started so far (0..PASS.days). A clock set back before `start` gives 0. */
function accruedDays(start, today) {
  if (!start) return 0;
  const e = daysBetween(start, today);
  if (e == null || e < 0) return 0;
  return Math.min(PASS.days, e + 1);
}

/** Key `n` calendar days after a 'YYYY-MM-DD' key (same Date.UTC rules as daily.js daysBetween), or null. */
function keyPlusDays(k, n) {
  const m = typeof k === 'string' ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(k) : null;
  if (!m) return null;
  const t = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + n));
  return `${String(t.getUTCFullYear()).padStart(4, '0')}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`;
}

/**
 * The pass as it stands on `today` once queued passes have started (pure, returns a new object).
 * While a queued pass waits and the current pass's 30 days are over, the finished pass's unclaimed days
 * move to `banked` and the next pass starts on the day after it ended (contiguous, no day lost).
 */
function rolled(p, today) {
  let start = p.start || null, claimed = p.claimed, banked = p.banked | 0;
  let queued = start ? Math.max(0, p.queued | 0) : 0;
  while (queued > 0) {
    const e = daysBetween(start, today);
    if (e == null || e < PASS.days) break;
    banked += PASS.days - Math.min(PASS.days, Math.max(0, claimed | 0));
    start = keyPlusDays(start, PASS.days);
    claimed = 0;
    queued -= 1;
  }
  return { start, claimed, banked, bought: p.bought | 0, queued };
}

/** Write the rolled pass back into the save (only where the save is being changed anyway). */
function applyRoll(save, today) {
  Object.assign(save.pass, rolled(save.pass, today));
  return save.pass;
}

/**
 * Pass state for `now`. Pure (never mutates the save).
 * { owned, active, daysLeft, accrued, claimable, claimableCoins, claimedTotal, canBuy }
 *  owned      ever bought a pass
 *  active     inside the 30-day entitlement window
 *  daysLeft   entitlement days left including today (30 on purchase day, 1 on the last day, 0 after)
 *  claimable  days ready to collect now (banked + accrued - claimed)
 *  canBuy     a new pass can be bought (never owned, or the last one's 30 days are over)
 *  queued     paid passes waiting to start after the current one (each starts by itself)
 */
export function passState(save, now = new Date()) {
  const today = dayKey(now);
  const p = rolled(save.pass || defaultPass(), today);
  const start = p.start || null;
  const e = start ? daysBetween(start, today) : null;
  const daysLeft = start ? (e == null ? 0 : e < 0 ? PASS.days : Math.max(0, PASS.days - e)) : 0;
  const accrued = accruedDays(start, today);
  const claimed = Math.min(PASS.days, Math.max(0, p.claimed | 0));
  const claimable = Math.max(0, (p.banked | 0) + accrued - claimed);
  return {
    owned: !!start,
    active: daysLeft > 0,
    daysLeft,
    accrued,
    claimable,
    claimableCoins: claimable * PASS.daily,
    claimedTotal: claimed,
    canBuy: daysLeft === 0,
    queued: p.queued,
  };
}

/** Collect every ready day at once. Returns the coins granted (0 if nothing is ready). */
export function claimPass(save, now = new Date()) {
  const st = passState(save, now);
  if (st.claimable <= 0) return 0;
  const p = applyRoll(save, dayKey(now));
  p.claimed = Math.max(p.claimed | 0, st.accrued);
  p.banked = 0;
  const coins = st.claimable * PASS.daily;
  save.coins = Math.max(0, Math.floor((save.coins || 0) + coins));
  syncKeepsakes(save, now);
  return coins;
}

/**
 * Apply a VERIFIED pass purchase: up-front coins, a fresh 30-day window and its café keepsake.
 * Never refused, because the player has paid: while a pass is still inside its 30 days the new one is
 * queued (its 30 days start the day after the current pass ends) and its up-front coins are paid now.
 * Days left unclaimed from an earlier pass move to `banked`, so a re-buy never wipes them.
 * Always returns true.
 */
export function grantPass(save, now = new Date()) {
  if (!save.pass) save.pass = defaultPass();
  const today = dayKey(now);
  const p = applyRoll(save, today);
  const st = passState(save, now);
  if (st.canBuy) {
    if (p.start) p.banked = st.claimable; // finished pass: everything it still owes carries over
    p.start = today;
    p.claimed = 0;
  } else {
    p.queued = Math.min(PASS_QUEUE_MAX, (p.queued | 0) + 1); // paid while a pass runs: it waits its turn
  }
  p.bought = (p.bought | 0) + 1;
  save.coins = Math.max(0, Math.floor((save.coins || 0) + PASS.upfront));
  syncKeepsakes(save, now);
  return true;
}

/** Apply a VERIFIED 12-month purchase: PASS_YEAR.blocks passes (the first starts or queues, the rest queue). Always true. */
export function grantPassYear(save, now = new Date()) {
  for (let i = 0; i < PASS_YEAR.blocks; i++) grantPass(save, now);
  return true;
}

/** 30-day Club blocks that have started by `now` (queued ones not yet). Pure. */
export function blocksStarted(save, now = new Date()) {
  const p = rolled(save.pass || defaultPass(), dayKey(now));
  if (!p.start) return 0;
  return Math.max(1, (p.bought | 0) - (p.queued | 0));
}

/** Keepsakes earned by `now`: the first min(blocks started, 6) of CLUB_KEEPSAKE_IDS. Pure. */
export function keepsakesEarned(save, now = new Date()) {
  return CLUB_KEEPSAKE_IDS.slice(0, Math.min(CLUB_KEEPSAKE_IDS.length, blocksStarted(save, now)));
}

/** The keepsake the next Club block bought now would bring (null once every keepsake is earned or on its way). Pure. */
export function nextKeepsake(save, now = new Date()) {
  const p = rolled(save.pass || defaultPass(), dayKey(now));
  const n = p.start ? Math.max(blocksStarted(save, now) + (p.queued | 0), p.bought | 0) : 0;
  return n < CLUB_KEEPSAKE_IDS.length ? CLUB_KEEPSAKE_IDS[n] : null;
}

/** How many café keepsakes are still to come (not earned and not already paid for in a waiting month). Pure. */
export function keepsakesLeft(save, now = new Date()) {
  const next = nextKeepsake(save, now);
  return next ? CLUB_KEEPSAKE_IDS.length - CLUB_KEEPSAKE_IDS.indexOf(next) : 0;
}

/**
 * Keepsake line for the Club card and sheet: what you have and what is truly left (never more than the six). Plain
 * facts, no pressure. Pure; C# NovaPass.KeepsakeLine (fixture-checked).
 */
export function keepsakeLine(save, now = new Date()) {
  const got = keepsakesEarned(save, now).length, next = nextKeepsake(save, now), all = CLUB_KEEPSAKES.length, left = keepsakesLeft(save, now);
  if (!next) return got < all ? `You have ${got === 1 ? '1 café keepsake' : `${got} café keepsakes`} and the rest come with your waiting months. New Club months bring coins and no ad breaks.` : `You have all ${all} café keepsakes. Club months from now on bring coins and no ad breaks.`;
  const n = left === 1 ? '1 café keepsake' : `${left} café keepsakes`;
  return `${n} over the next Club months, one per month (you have ${got}). Next: ${CLUB_KEEPSAKES[CLUB_KEEPSAKE_IDS.indexOf(next)].name}.`;
}

/**
 * The quiet thank-you for Club members who own Aurora (the old Club reward), or null. True for anyone it shows to:
 * they have joined the Club and they own Aurora, which used to come with it. Pure.
 */
export function auroraThanks(save) {
  const owned = save && save.skins && Array.isArray(save.skins.owned) ? save.skins.owned : [];
  const bought = save && save.pass ? save.pass.bought | 0 : 0;
  return bought > 0 && owned.includes(LEGACY_PASS_SKIN) ? 'Thank you for being a Club member. Aurora, once a Club reward, stays yours.' : null;
}

/**
 * Put every earned keepsake into save.outfits.owned (kept forever; never removed). Call after a grant or claim
 * and whenever the app opens, so a queued block that started today brings its keepsake. Returns ids newly added.
 */
export function syncKeepsakes(save, now = new Date()) {
  const earned = keepsakesEarned(save, now);
  if (!earned.length) return [];
  if (!save.outfits || typeof save.outfits !== 'object' || Array.isArray(save.outfits)) save.outfits = { owned: [], equipped: null };
  if (!Array.isArray(save.outfits.owned)) save.outfits.owned = [];
  const added = [];
  for (const id of earned) if (!save.outfits.owned.includes(id)) { save.outfits.owned.push(id); added.push(id); }
  return added;
}
