// "Your puzzle week": a calm weekly recap of the player's own play (DESIGN.md "Your puzzle week").
// Counted locally only, real play only (autoplay never counts). No rewards, no streaks, no comparisons.
// Copy rules: no medical or cognitive-benefit claims (never "improves memory" or "brain health"), no guilt.
//
// A week is Monday-based, in local time. Only the current week and the one before are kept.
// Save field (same JSON shape in Unity): weekly = { cur: Week | null, last: Week | null, seen: 'YYYY-MM-DD' | null }
//   Week = { wk: 'YYYY-MM-DD' (that week's Monday), m: merges, top: biggest orb tier 0..10, lv: levels cleared,
//            st: new stars earned, days: bitmask of play days (bit 0 = Monday .. bit 6 = Sunday),
//            end: best Endless score that week, neb: Daily Nebulas solved }
//   seen: the Monday of the last week whose recap card was shown (the card shows once per week)
// Migration: a save without `weekly` (or a malformed one) starts empty; the first week fills from now on.
import { dayKey, daysBetween } from './daily.js';
import { tierName, pieceWord } from '../game/tierNames.js';
import { t } from '../i18n/index.js'; // text: UI keys weekly.* (docs/LOCALISATION.md phase 4c)

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const isDay = (v) => typeof v === 'string' && DAY_RE.test(v);
const nat = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Math.floor(Number(v)) : 0);

export const QUIET_LINE = t('weekly.quiet'); // read once at start-up; weeklySummary reads the key itself

/** Local Monday of the week holding `d`, as 'YYYY-MM-DD'. Built at noon so DST shifts never move the date. */
export function mondayKey(d = new Date()) {
  const back = (d.getDay() + 6) % 7; // Monday 0 .. Sunday 6
  return dayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - back, 12, 0, 0));
}

/** 'YYYY-MM-DD' + n calendar days (DST-proof). */
export function addDays(key, n) {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + n, 12, 0, 0));
}

export function emptyWeek(wk) { return { wk, m: 0, top: 0, lv: 0, st: 0, days: 0, end: 0, neb: 0 }; }
export function defaultWeekly() { return { cur: null, last: null, seen: null }; }

function cleanWeek(w) {
  if (!w || typeof w !== 'object' || Array.isArray(w) || !isDay(w.wk)) return null;
  return {
    wk: w.wk, m: nat(w.m), top: Math.min(10, nat(w.top)), lv: nat(w.lv), st: nat(w.st),
    days: nat(w.days) & 127, end: nat(w.end), neb: nat(w.neb),
  };
}

/** Save sanitiser (missing or malformed -> empty). */
export function sanitizeWeekly(s) {
  const w = s.weekly && typeof s.weekly === 'object' && !Array.isArray(s.weekly) ? s.weekly : {};
  s.weekly = { cur: cleanWeek(w.cur), last: cleanWeek(w.last), seen: isDay(w.seen) ? w.seen : null };
}

function state(save) {
  if (!save.weekly || typeof save.weekly !== 'object') save.weekly = defaultWeekly();
  return save.weekly;
}

/**
 * Move the weeks along to `now`. A new week makes the old current week "last week" (or an empty last week when
 * the player skipped a whole week). A clock moved back never rolls (the newer week is kept as it is).
 */
export function rollWeek(save, now = new Date()) {
  const w = state(save);
  const mk = mondayKey(now);
  if (!w.cur) { w.cur = emptyWeek(mk); return w; }
  if (w.cur.wk >= mk) return w;
  const prev = addDays(mk, -7);
  w.last = w.cur.wk === prev ? w.cur : emptyWeek(prev);
  w.cur = emptyWeek(mk);
  return w;
}

function cur(save, now) { return rollWeek(save, now).cur; }

/** Today (local) was a play day. Ignored when the clock was moved back before this week. */
export function weekPlayDay(save, now = new Date()) {
  const c = cur(save, now);
  const i = daysBetween(c.wk, dayKey(now));
  if (i != null && i >= 0 && i <= 6) c.days |= 1 << i;
}

/** A real drop resolved with `steps` merges (cascade steps). Also marks today as played. */
export function weekDrop(save, steps, now = new Date()) {
  weekPlayDay(save, now);
  cur(save, now).m += nat(steps);
}

/** An orb of this tier was made in a real game. */
export function weekTier(save, tier, now = new Date()) {
  const c = cur(save, now);
  c.top = Math.max(c.top, Math.min(10, nat(tier)));
}

/** A Journey level was cleared (Daily Nebula wins go to weekNebula). newStars: stars earned for the first time. */
export function weekLevel(save, newStars, now = new Date()) {
  const c = cur(save, now);
  c.lv++;
  c.st += nat(newStars);
}

/** A real Endless run (not Zen) ended with this score. */
export function weekEndless(save, score, now = new Date()) {
  const c = cur(save, now);
  c.end = Math.max(c.end, nat(score));
}

/** A Daily Nebula was solved for the first time. */
export function weekNebula(save, now = new Date()) { cur(save, now).neb++; }

/** Number of play days in a week (0..7). */
export function dayCount(week) {
  let n = 0;
  for (let b = nat(week && week.days) & 127; b; b &= b - 1) n++;
  return n;
}

/**
 * Show the recap card now? Once, on a menu visit in a new week, when last week (the one just before this week)
 * had at least one play day and its card wasn't shown yet. Pure: rolls a copy.
 */
export function weeklyCardDue(save, now = new Date()) {
  if (!save) return false;
  const copy = { weekly: { ...(save.weekly || defaultWeekly()) } };
  const w = rollWeek(copy, now);
  if (!w.last || w.last.wk !== addDays(mondayKey(now), -7)) return false;
  if (dayCount(w.last) < 1) return false;
  return w.seen !== w.last.wk;
}

/** The card is on screen: remember it for last week (rolls first). */
export function markWeeklySeen(save, now = new Date()) {
  const w = rollWeek(save, now);
  if (w.last) w.seen = w.last.wk;
}

const fmt = (n) => nat(n).toLocaleString('en-US');

/** 'Oct 19 – 25' (or 'Dec 28 – Jan 3') for the week starting at `wk`. */
export function weekRange(wk) {
  const opt = { month: 'short', day: 'numeric' };
  const [y, m, d] = wk.split('-').map(Number);
  const a = new Date(y, m - 1, d, 12), b = new Date(y, m - 1, d + 6, 12);
  const left = a.toLocaleDateString('en-US', opt);
  const right = a.getMonth() === b.getMonth() ? String(b.getDate()) : b.toLocaleDateString('en-US', opt);
  return `${left} – ${right}`;
}

/**
 * Everything the recap card and the Journal's "This week" / "Last week" show. Pure.
 * which: 'last' | 'this'. Returns { which, title, range, quiet, headline, stats: [{ value, label }], days, dayBits }.
 */
export function weekSummary(save, which = 'last', now = new Date(), skin) {
  const copy = { weekly: { ...((save && save.weekly) || defaultWeekly()) } };
  const w = rollWeek(copy, now);
  const mk = mondayKey(now);
  const week = which === 'this' ? w.cur : (w.last && w.last.wk === addDays(mk, -7) ? w.last : emptyWeek(addDays(mk, -7)));
  const days = dayCount(week);
  const quiet = days === 0;
  let headline;
  const tw = which === 'this';
  if (quiet) headline = tw ? t('weekly.quietThis') : t('weekly.quiet');
  else if (week.m > 0) headline = week.m === 1 ? (tw ? t('weekly.mergesThis.one', { n: fmt(week.m) }) : t('weekly.mergesLast.one', { n: fmt(week.m) })) : (tw ? t('weekly.mergesThis.other', { n: fmt(week.m) }) : t('weekly.mergesLast.other', { n: fmt(week.m) }));
  else headline = days === 1 ? (tw ? t('weekly.daysThis.one', { n: fmt(days) }) : t('weekly.daysLast.one', { n: fmt(days) })) : (tw ? t('weekly.daysThis.other', { n: fmt(days) }) : t('weekly.daysLast.other', { n: fmt(days) }));
  const stats = [
    { value: fmt(week.m), label: t('weekly.merges') },
    { value: week.top ? tierName(week.top, skin) : '—', label: t('weekly.biggest', { piece: pieceWord(false, skin) }), tier: true },
    { value: fmt(week.lv), label: t('weekly.levels') },
    { value: fmt(week.st), label: t('weekly.stars') },
    { value: t('weekly.daysOf', { n: days }), label: t('weekly.days') },
    { value: week.end ? fmt(week.end) : '—', label: t('weekly.endless') },
    { value: fmt(week.neb), label: t('weekly.nebulas') },
  ];
  return { which, title: t('weekly.title'), range: weekRange(week.wk), quiet, headline, stats, days, dayBits: week.days };
}
