// Welcome-back card (docs/RETENTION_RESEARCH.md §5 idea 8). After 3+ days away (by local date) the
// menu shows, once at launch, a calm summary built from the real save plus one modest gift.
// At most once a week, never in the first session (needs 1 finished run and Level 2+), never stacked
// with another modal (main.js queues it until the menu is clear). No guilt copy, no expiring reward,
// no ad on it, and nothing here reads ad state. Unity port: Scripts/Meta/WelcomeBack.cs (same rules).
//
// Save field (same JSON shape in Unity): welcomeBack = { lastSeen: 'YYYY-MM-DD' | null, shown: 'YYYY-MM-DD' | null }
//   lastSeen: the local date the game was last launched (updated at every launch, after the check)
//   shown:    the local date the card was last shown (the gift is added when it shows)
// Migration: a save without `welcomeBack` seeds lastSeen from the newest sky-calendar night (a real play date).
import { dayKey, daysBetween } from './daily.js';
import { CHAPTERS, CHAPTER_SIZE, chapterOf, chapterRange } from '../game/chapters.js';
import { LEVEL_COUNT } from '../game/levels.js';
import { starsEarned } from './cafe.js';
import { t, tp } from '../i18n/index.js'; // pure lookup, no UI imports (docs/LOCALISATION.md phase 4)

export const WELCOME_DAYS_AWAY = 3;    // show after 3 or more calendar days away
export const WELCOME_COOLDOWN_DAYS = 7; // at most once a week
export const WELCOME_MIN_RUNS = 1;     // never in the first session: at least one finished run...
export const WELCOME_MIN_LEVEL = 2;    // ...and Level 2 or higher
export const WELCOME_GIFT_COINS = 100; // the one modest gift: fixed, never doubled, never ad-gated

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const isDay = (v) => typeof v === 'string' && DAY_RE.test(v);

export function defaultWelcome() { return { lastSeen: null, shown: null }; }

/** Newest valid 'YYYY-MM-DD' in a list (the sky calendar's played nights), or null. */
export function newestDay(list) {
  let best = null;
  if (Array.isArray(list)) for (const k of list) if (isDay(k) && (best == null || k > best)) best = k;
  return best;
}

/** Save sanitiser. `raw` is the parsed stored object (null for a new player). */
export function sanitizeWelcome(s, raw) {
  const had = raw && typeof raw === 'object' && raw.welcomeBack && typeof raw.welcomeBack === 'object' && !Array.isArray(raw.welcomeBack);
  const w = had ? raw.welcomeBack : {};
  s.welcomeBack = {
    lastSeen: isDay(w.lastSeen) ? w.lastSeen : (had ? null : newestDay(s.nights)),
    shown: isDay(w.shown) ? w.shown : null,
  };
}

function state(save) {
  const w = save && save.welcomeBack;
  return { lastSeen: w && isDay(w.lastSeen) ? w.lastSeen : null, shown: w && isDay(w.shown) ? w.shown : null };
}

/** Whole calendar days since the last launch (null when unknown). */
export function daysAway(save, now = new Date()) {
  const { lastSeen } = state(save);
  return lastSeen ? daysBetween(lastSeen, dayKey(now)) : null;
}

/**
 * Is the card due at this launch? Check BEFORE markSeen. Pure. Only reads progress dates and counts:
 * never ads, spending or device data.
 */
export function welcomeBackDue(save, now = new Date()) {
  if (!save) return false;
  if ((save.runs || 0) < WELCOME_MIN_RUNS) return false;
  if (((save.journey && save.journey.level) || 1) < WELCOME_MIN_LEVEL) return false;
  const away = daysAway(save, now);
  if (away == null || away < WELCOME_DAYS_AWAY) return false;
  const { shown } = state(save);
  if (shown) {
    const since = daysBetween(shown, dayKey(now));
    if (since >= 0 && since < WELCOME_COOLDOWN_DAYS) return false; // a future date (clock moved back) never blocks forever
  }
  return true;
}

/** Remember today as the last launch (call at every launch, after welcomeBackDue). */
export function markSeen(save, now = new Date()) {
  const w = state(save);
  save.welcomeBack = { lastSeen: dayKey(now), shown: w.shown };
}

/** The card is on screen: record it and add the gift. Returns the coins added (0 if already shown today). */
export function claimWelcomeBack(save, now = new Date()) {
  const w = state(save);
  const today = dayKey(now);
  if (w.shown === today) return 0;
  save.welcomeBack = { lastSeen: w.lastSeen, shown: today };
  save.coins = Math.max(0, Math.floor(Number(save.coins) || 0)) + WELCOME_GIFT_COINS;
  return WELCOME_GIFT_COINS;
}

const fmt = (n) => Math.max(0, Math.floor(Number(n) || 0)).toLocaleString('en-US');

/** Best Endless score across the three tide tiers (the player's own record, read only). */
export function bestEndless(save) {
  const cb = (save && save.challengeBest) || {};
  return Math.max(0, Math.floor(Number(save && save.best) || 0), Math.floor(Number(cb.gentle) || 0), Math.floor(Number(cb.bold) || 0));
}

/** The nebula line: the current level opens a new chapter, or the next chapter's first level. '' at the end. */
export function nebulaLine(level) {
  const n = Math.max(1, Math.min(LEVEL_COUNT, Math.floor(Number(level) || 1)));
  const ch = chapterOf(n); // 1-based (chapters.js)
  if (n > 1 && (n - 1) % CHAPTER_SIZE === 0) return t('welcome.areaAhead', { name: CHAPTERS[ch - 1].name });
  if (ch >= CHAPTERS.length) return '';
  const start = chapterRange(ch + 1).from;
  if (start > LEVEL_COUNT) return '';
  return t('welcome.areaNext', { name: CHAPTERS[ch].name, level: start.toLocaleString('en-US') });
}

/**
 * Calm summary from the real save: { title, lines: [...], gift, level }. Same strings as Unity WelcomeBack.Summary.
 * No guilt copy, no countdown, no "limited" wording.
 */
export function welcomeSummary(save) {
  const level = Math.max(1, Math.min(LEVEL_COUNT, Math.floor(Number(save.journey && save.journey.level) || 1)));
  // café stars earned (1 per level ever finished), not the 1–3 rating sum: ★ means only the café star (docs/UX_STARS.md)
  const stars = starsEarned(save);
  const lines = [tp('welcome.level', stars, { level, n: fmt(stars) })];
  const best = bestEndless(save);
  if (best > 0) lines.push(t('welcome.best', { n: fmt(best) }));
  const neb = nebulaLine(level);
  if (neb) lines.push(neb);
  return { title: t('welcome.title'), lines, gift: t('welcome.gift', { n: fmt(WELCOME_GIFT_COINS) }), level };
}
