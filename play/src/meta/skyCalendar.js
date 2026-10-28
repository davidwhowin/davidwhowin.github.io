// Monthly sky calendar (Wave E, research feature F). Meta display only.
//
// Instead of a breakable streak number, every night you play lights a star in this month's
// sky: "12 nights this month". It can't "break", and a fresh page starts on the 1st.
// The daily reward rules (daily.js, with C# parity) are unchanged; this only reads a new list.
//
// Save shape (new, optional): save.nights = ['YYYY-MM-DD', ...] (local dates a run was played).
// Old saves load with [] (or a list seeded from their Daily Nebula / Daily Challenge dates).
import { dayKey, daysBetween } from './daily.js';
import { recordPlayDay } from './playDays.js';

export const NIGHTS_KEEP_DAYS = 70; // enough for this month and last; older dates are pruned

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

function cleanList(list) {
  return Array.isArray(list) ? list.filter((k) => typeof k === 'string' && KEY_RE.test(k)) : [];
}

/** Mark today (local date) as played. Returns true the first time per date. Also counts the lifetime play day
 *  (save.playDays, src/meta/playDays.js), which the calendar's 70-day window can't hold. */
export function recordNight(save, now = new Date()) {
  const today = dayKey(now);
  recordPlayDay(save, today);
  const list = cleanList(save.nights);
  const fresh = !list.includes(today);
  if (fresh) list.push(today);
  // prune old dates (and anything from a clock that jumped far ahead)
  save.nights = Array.from(new Set(list.filter((k) => {
    const d = daysBetween(k, today);
    return d != null && d >= -1 && d <= NIGHTS_KEEP_DAYS;
  }))).sort();
  return fresh;
}

/** Played dates in a month ('YYYY-MM'), as sorted day numbers (1..31). */
export function nightsInMonth(save, monthKey) {
  const days = new Set();
  for (const k of cleanList(save.nights)) if (k.startsWith(monthKey + '-')) days.add(Number(k.slice(8, 10)));
  return Array.from(days).sort((a, b) => a - b);
}

/** Count of nights played this calendar month. */
export function nightsThisMonth(save, now = new Date()) {
  return nightsInMonth(save, dayKey(now).slice(0, 7)).length;
}

/** Everything the calendar view needs (pure). */
export function skyMonth(save, now = new Date()) {
  const y = now.getFullYear(), m = now.getMonth();
  const monthKey = dayKey(now).slice(0, 7);
  const lit = nightsInMonth(save, monthKey);
  return {
    monthKey,
    name: MONTHS[m],
    days: new Date(y, m + 1, 0).getDate(),
    firstWeekday: new Date(y, m, 1).getDay(),
    today: now.getDate(),
    lit,
    count: lit.length,
  };
}

/** Headline copy. Never mentions loss, streaks or repairs. */
export function nightsLine(count) {
  if (count <= 0) return 'A fresh sky this month. Play a game to light your first star.';
  return `${count} night${count === 1 ? '' : 's'} this month`;
}

/**
 * Old saves (no `nights` field yet): seed from dates we already know were played, so the first
 * calendar isn't empty for regular players. `raw` is the parsed save as stored (or null).
 */
export function seedNights(save, raw) {
  if (raw && Array.isArray(raw.nights)) { save.nights = cleanList(raw.nights); return; }
  const known = new Set();
  const days = raw && raw.nebula && raw.nebula.days;
  if (days && typeof days === 'object' && !Array.isArray(days)) for (const k of Object.keys(days)) if (KEY_RE.test(k)) known.add(k);
  const dc = raw && raw.dailyChallenge;
  if (dc && typeof dc.date === 'string' && KEY_RE.test(dc.date) && (dc.plays || 0) > 0) known.add(dc.date);
  save.nights = Array.from(known).sort();
}
