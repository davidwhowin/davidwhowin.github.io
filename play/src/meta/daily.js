// Daily reward streak + daily challenge helpers.
//
// Gentle streak (Wave A): a missed day no longer wipes the streak.
//  - Each missed day steps the streak back 2 days (never below day 1).
//  - One free "grace day" per rolling 7 days: a single missed day costs nothing.
//  - Grace is automatic and can never be bought.
// Save shape: save.daily = { lastClaim: 'YYYY-MM-DD'|null, streak: n, graceUsed: 'YYYY-MM-DD'|null }.
// `graceUsed` is new (defaults to null), so old saves load unchanged.
import { dateSeed } from '../game/rng.js';

export const DAILY_REWARDS = [50, 80, 120, 160, 220, 300, 500];
export const STREAK_STEP_BACK = 2;   // days lost per missed day
export const GRACE_WINDOW_DAYS = 7;  // one grace day per rolling week

export function dayKey(d = new Date()) {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Day number of a 'YYYY-MM-DD' key (calendar days, DST-proof), or null if malformed. */
function keyToDayNumber(k) {
  if (typeof k !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(k);
  if (!m) return null;
  return Math.round(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86400000);
}

/** Whole calendar days from key `a` to key `b` (b - a), or null if either is malformed. */
export function daysBetween(a, b) {
  const x = keyToDayNumber(a), y = keyToDayNumber(b);
  return x == null || y == null ? null : y - x;
}

const cycleDay = (streak) => ((Math.max(1, streak) - 1) % 7) + 1;

/**
 * State of today's reward. Pure (never mutates the save).
 * { available, day (1..7), amount, streak, reset, outcome, missed, graceUsed }
 *  outcome: 'claimed' (already claimed today) | 'first' (never claimed) | 'continue' (claimed yesterday)
 *           | 'grace' (one missed day, forgiven by the weekly grace day) | 'eased' (stepped back)
 *  missed:  calendar days missed since the last claim (0 when continuing)
 *  reset:   true when the streak went down (kept for older callers)
 */
export function dailyRewardState(save, now = new Date()) {
  const today = dayKey(now);
  const d = save.daily || { lastClaim: null, streak: 0, graceUsed: null };
  const prevStreak = Math.max(0, Math.floor(Number(d.streak) || 0));
  if (d.lastClaim === today) {
    const day = cycleDay(prevStreak);
    return { available: false, day, amount: DAILY_REWARDS[day - 1], streak: prevStreak, reset: false, outcome: 'claimed', missed: 0, graceUsed: false };
  }
  const gap = d.lastClaim ? daysBetween(d.lastClaim, today) : null;
  let streak, outcome, missed = 0, graceUsed = false;
  if (gap == null || prevStreak <= 0) {
    streak = 1; outcome = 'first';
  } else if (gap <= 1) {
    // yesterday (or a clock that moved backwards): just keep going
    streak = prevStreak + 1; outcome = 'continue';
  } else {
    missed = gap - 1;
    const sinceGrace = d.graceUsed ? daysBetween(d.graceUsed, today) : null;
    const graceReady = sinceGrace == null || sinceGrace >= GRACE_WINDOW_DAYS || sinceGrace < 0;
    let penalised = missed;
    if (graceReady) { penalised--; graceUsed = true; }
    if (penalised <= 0) {
      streak = prevStreak + 1; outcome = 'grace';
    } else {
      // step back from the day you last claimed, then today's claim counts as +1
      streak = Math.max(1, cycleDay(prevStreak) - STREAK_STEP_BACK * penalised + 1);
      outcome = 'eased';
    }
  }
  const day = cycleDay(streak);
  return { available: true, day, amount: DAILY_REWARDS[day - 1], streak, reset: outcome === 'eased', outcome, missed, graceUsed };
}

/** Player-facing line for the reward screen (honest about what happened). */
export function streakMessage(st) {
  if (!st.available) return 'Come back tomorrow for the next reward.';
  if (st.outcome === 'grace') return `Welcome back! You kept your streak (free grace day used). Day ${st.day}!`;
  if (st.outcome === 'eased') return `Welcome back! Streak eased back to day ${st.day}.`;
  return `Day ${st.day} of your streak!`;
}

export function claimDailyReward(save, multiplier = 1, now = new Date()) {
  const st = dailyRewardState(save, now);
  if (!st.available) return 0;
  const prevGrace = (save.daily && save.daily.graceUsed) || null;
  save.daily = { lastClaim: dayKey(now), streak: st.streak, graceUsed: st.graceUsed ? dayKey(now) : prevGrace };
  const amount = st.amount * multiplier;
  save.coins += amount;
  return amount;
}

export function dailyChallengeSeed(now = new Date()) {
  return dateSeed(now);
}

export function dailyChallengeBest(save, now = new Date()) {
  const k = dayKey(now);
  return save.dailyChallenge && save.dailyChallenge.date === k ? save.dailyChallenge.best : 0;
}

export function recordDailyChallenge(save, score, now = new Date()) {
  const k = dayKey(now);
  if (!save.dailyChallenge || save.dailyChallenge.date !== k) save.dailyChallenge = { date: k, best: 0, plays: 0 };
  save.dailyChallenge.plays++;
  const isBest = score > save.dailyChallenge.best;
  if (isBest) save.dailyChallenge.best = score;
  return isBest;
}
