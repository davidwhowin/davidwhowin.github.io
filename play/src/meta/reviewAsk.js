// Honest review prompt (docs/MARKET_RESEARCH.md §7, DESIGN.md "Honest review prompt"). Pure rules.
//
// Store policy: Google Play and Apple both forbid gating the review ask behind a custom "Do you like the app?"
// question (sending happy players to the store and unhappy ones elsewhere). So there is NO custom yes/no step:
// when these rules say yes, the game calls the OS prompt directly (platform.requestReview) and the OS decides
// whether it actually shows (Apple: at most 3 times a year). "Rate Nova Drop" and "Send feedback" are separate,
// always-available rows in Settings > Extras, never shown as a pair at this moment.
//
// The rules read only progress, dates and this session's own events. Never ad value, spending totals or device data.
//
// Save field (same JSON shape in Unity): review = { n: int (asks so far, max 3), last: 'YYYY-MM-DD' | null }
// Migration: a save without `review` (or with a malformed one) gets { n: 0, last: null }.
import { dayKey, daysBetween } from './daily.js';

export const REVIEW_MIN_LEVEL = 8;     // the player has cleared Level 8 or later
export const REVIEW_MIN_DAYS = 2;      // never on the first play day: 2+ distinct play days
export const REVIEW_COOLDOWN_DAYS = 120; // at most once per 120 days
export const REVIEW_MAX_ASKS = 3;      // and at most 3 asks ever

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const isDay = (v) => typeof v === 'string' && DAY_RE.test(v);
const nat = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Math.floor(Number(v)) : 0);

export function defaultReview() { return { n: 0, last: null }; }

/** Save sanitiser (missing or malformed -> defaults). */
export function sanitizeReview(s) {
  const r = s.review && typeof s.review === 'object' && !Array.isArray(s.review) ? s.review : {};
  s.review = { n: Math.min(REVIEW_MAX_ASKS, nat(r.n)), last: isDay(r.last) ? r.last : null };
}

/** Distinct local play days the save knows about (sky-calendar nights), today included when given. */
export function playDays(save, today = null) {
  const set = new Set();
  for (const k of Array.isArray(save && save.nights) ? save.nights : []) if (isDay(k)) set.add(k);
  if (isDay(today)) set.add(today);
  return set.size;
}

/** Highest Journey level cleared so far (journey.level is the next level to play). */
export function highestCleared(save) {
  return Math.max(0, nat(save && save.journey && save.journey.level) - 1);
}

/**
 * Is this the moment to call the OS review prompt? Call it right after a real result is booked.
 * ctx = {
 *   mode, won, nebula, autoplay, level,      // the run that just ended (a game.js result works)
 *   adInRun, revivedInRun, purchaseInRun,    // anything ad- or money-shaped in that run blocks it
 *   continued,                               // a continue (coins or ad) means the run had a fail offer
 *   failOfferThisSession, purchaseThisSession, // never in the same session as a fail offer or a purchase
 *   now: Date
 * }
 * True only right after a Journey level WIN (not a Daily Nebula, not autoplay), Level 8+ cleared, on the 2nd+
 * play day, under the 120-day and 3-ask caps.
 */
export function shouldAskReview(save, ctx = {}) {
  if (!save || !ctx) return false;
  if (ctx.mode !== 'journey' || ctx.won !== true || ctx.nebula || ctx.autoplay) return false;
  if (ctx.adInRun || ctx.revivedInRun || ctx.purchaseInRun || ctx.continued) return false;
  if (ctx.failOfferThisSession || ctx.purchaseThisSession) return false;
  const cleared = Math.max(highestCleared(save), nat(ctx.level));
  if (cleared < REVIEW_MIN_LEVEL) return false;
  const today = dayKey(ctx.now instanceof Date ? ctx.now : new Date());
  if (playDays(save, today) < REVIEW_MIN_DAYS) return false;
  const r = save.review && typeof save.review === 'object' ? save.review : defaultReview();
  if (nat(r.n) >= REVIEW_MAX_ASKS) return false;
  if (isDay(r.last)) {
    const since = daysBetween(r.last, today);
    if (since != null && since < REVIEW_COOLDOWN_DAYS) return false; // a future date (clock moved back) also waits
  }
  return true;
}

/** The OS prompt was requested: count it. (The OS may still decide not to show it; it counts either way.) */
export function markAsked(save, now = new Date()) {
  const r = save.review && typeof save.review === 'object' ? save.review : defaultReview();
  save.review = { n: Math.min(REVIEW_MAX_ASKS, nat(r.n) + 1), last: dayKey(now) };
  return save.review;
}
