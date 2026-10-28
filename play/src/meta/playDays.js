// Lifetime count of distinct local days the player has played (DESIGN.md Ads, "Fewer ad breaks for regulars").
// Pure rules. Unity: Scripts/Meta/PlayDays.cs (same JSON shape, same behaviour).
//
// The sky calendar (save.nights) only keeps ~70 days, so it can't tell a long-time regular apart. This keeps a
// lifetime count instead. It is the player's own play history and nothing else: no device data, no ad data, no
// spending data. AdDirector reads it for one thing only: to make ad breaks RARER once she has played on
// AD_RULES.REGULAR_DAYS different days. It can never make them more frequent.
//
// Save field: playDays = { n: int >= 0 (distinct play days so far), last: 'YYYY-MM-DD' | null (newest counted day) }
// Migration: a save without `playDays` (or with a malformed one) is seeded from the sky calendar it already has
// (distinct valid dates in save.nights, newest as `last`), so a regular never starts from zero. `n` is never
// below the number of distinct nights the save holds (those are all real play days).
// Counting: recordNight (skyCalendar.js) calls recordPlayDay on every played run. A new day counts once, only when
// it is later than `last`. A clock set back never counts and never lowers the count; it just moves `last` back.

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const isDay = (v) => typeof v === 'string' && DAY_RE.test(v);
const nat = (v) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.min(Math.floor(v), 1e6) : 0);

export function defaultPlayDays() { return { n: 0, last: null }; }

function nightsOf(s) {
  const set = new Set();
  for (const k of Array.isArray(s && s.nights) ? s.nights : []) if (isDay(k)) set.add(k);
  return Array.from(set).sort();
}

/** Save sanitiser. Call after the nights are seeded (normalizeSave). */
export function sanitizePlayDays(s) {
  const p = s.playDays && typeof s.playDays === 'object' && !Array.isArray(s.playDays) ? s.playDays : {};
  const nights = nightsOf(s);
  const newest = nights.length ? nights[nights.length - 1] : null;
  let last = isDay(p.last) ? p.last : null;
  if (newest && (!last || newest > last)) last = newest;
  s.playDays = { n: Math.max(nat(p.n), nights.length), last };
}

/** Count `dayKey` (a local 'YYYY-MM-DD') as played. Returns true when it was a new day. */
export function recordPlayDay(s, dayKey) {
  if (!s || !isDay(dayKey)) return false;
  const p = s.playDays && typeof s.playDays === 'object' && !Array.isArray(s.playDays) ? s.playDays : defaultPlayDays();
  const n = nat(p.n), last = isDay(p.last) ? p.last : null;
  if (last === dayKey) { s.playDays = { n, last }; return false; }
  if (last && dayKey < last) { s.playDays = { n, last: dayKey }; return false; } // clock set back: no count
  s.playDays = { n: n + 1, last: dayKey };
  return true;
}

/** Distinct days played so far (0 for a missing or broken field). */
export function playDayCount(s) {
  return nat(s && s.playDays && s.playDays.n);
}
