// Daily Nebula: one Journey-format puzzle level per local date, the same for everyone.
//
// - The level comes from levels.getDailyLevel(dateKey, twist): date-seeded, bot-verified solvable.
// - Weekly café rotation: the day's twist (dailyTwistFor) uses a Journey café mechanic the player has already met,
//   else the day is plain. A day keeps the twist of its first recorded attempt, so replays show the same board.
// - The FIRST finished attempt of a date is its "scored attempt" (stars + drops, used for the
//   share card). Replays are always allowed; they never change the scored attempt.
// - A date counts toward its month once it has been solved at least once (any attempt, any
//   time it is still reachable: today plus the last 6 days). No streaks, no penalties.
// - Monthly badge: solve NEBULA_BADGE_TARGET dailies in one calendar month.
// - No ads, no boosters, no continues in this mode; nothing to buy.
//
// Save shape (new, optional; old saves load with the defaults):
//   save.nebula = { days: { 'YYYY-MM-DD': { won, stars, drops, grid, solved, best, twist } }, badges: ['YYYY-MM', ...] }
//   (twist: a DAILY_TWISTS id; records from before the rotation have none and were plain)
import { dayKey, daysBetween } from './daily.js';
import { dailyTwist, dailyStage, normTwist } from '../game/levels.js';

export const NEBULA_BADGE_TARGET = 15;
export const NEBULA_REPLAY_DAYS = 7;   // today + the 6 days before it
export const NEBULA_FIRST_SOLVE_COINS = 30;
const KEEP_DAYS = 120;                 // older day records are pruned (badges are kept forever)

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Short names of the daily twists ("Today: café orders"). Mixed days join their two names with " + ". */
export const TWIST_LABELS = Object.freeze({
  plain: 'the classic', orders: 'café orders', glaze: 'sugar glaze', teapot: 'teapot deliveries', tin: 'cookie tins',
  relaxed: 'relaxed, extra drops',
});

/** Display name of a twist id (unknown ids: the classic). */
export function twistLabel(twist) {
  const t = normTwist(twist);
  return t.includes('+') ? t.split('+').map((m) => TWIST_LABELS[m]).join(' + ') : TWIST_LABELS[t];
}

/**
 * The twist the player gets for date `key`: the twist of the day's first recorded attempt (records from before the
 * rotation: plain), else the weekly rotation at the player's unlock stage (levels.dailyTwist / dailyStage).
 */
export function dailyTwistFor(save, key) {
  const days = save && save.nebula && save.nebula.days && typeof save.nebula.days === 'object' ? save.nebula.days : null;
  const rec = days && Object.prototype.hasOwnProperty.call(days, key) ? days[key] : null;
  if (rec && typeof rec === 'object') return normTwist(rec.twist);
  return dailyTwist(key, dailyStage(save && save.journey ? save.journey.stars : null));
}

export function monthKeyOf(key) { return String(key).slice(0, 7); }

export function monthName(monthKey) {
  const m = /^(\d{4})-(\d{2})$/.exec(monthKey);
  return m ? `${MONTHS[Number(m[2]) - 1]} ${m[1]}` : monthKey;
}

/** Ensure save.nebula exists with sane fields. Returns it. */
export function nebulaState(save) {
  let n = save.nebula;
  if (!n || typeof n !== 'object') n = save.nebula = { days: {}, badges: [] };
  if (!n.days || typeof n.days !== 'object' || Array.isArray(n.days)) n.days = {};
  if (!Array.isArray(n.badges)) n.badges = [];
  return n;
}

/** Date keys for the replayable window, oldest first, ending with today. */
export function recentDays(now = new Date(), count = NEBULA_REPLAY_DAYS) {
  const out = [];
  for (let i = count - 1; i >= 0; i--) out.push(dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)));
  return out;
}

/** True when `key` is today or one of the replayable past days (never the future). */
export function isPlayableDay(key, now = new Date()) {
  const d = daysBetween(key, dayKey(now));
  return d != null && d >= 0 && d < NEBULA_REPLAY_DAYS;
}

/** How many dailies were solved in a month ('YYYY-MM'). */
export function monthSolved(save, monthKey) {
  const days = nebulaState(save).days;
  let n = 0;
  for (const k of Object.keys(days)) if (k.startsWith(monthKey + '-') && days[k] && days[k].solved) n++;
  return n;
}

export function hasBadge(save, monthKey) {
  return nebulaState(save).badges.includes(monthKey);
}

/** One emoji per drop: the biggest orb that drop made (Wordle-style squares). */
export function dropEmoji(tier) {
  const t = Number(tier) || 0;
  if (t <= 0) return '⬛';
  if (t <= 2) return '🟦';
  if (t <= 4) return '🟩';
  if (t <= 6) return '🟨';
  if (t <= 8) return '🟧';
  return '🟥';
}

/** Drop log (array of per-drop max tiers) → rows of 5 emoji, at most 8 rows (the tail is summarised). */
export function dropGrid(log, perRow = 5, maxRows = 8) {
  const cells = (Array.isArray(log) ? log : []).map(dropEmoji);
  const rows = [];
  for (let i = 0; i < cells.length && rows.length < maxRows; i += perRow) rows.push(cells.slice(i, i + perRow).join(''));
  const shown = Math.min(cells.length, perRow * maxRows);
  if (cells.length > shown) rows.push(`+${(cells.length - shown).toLocaleString('en-US')} more`);
  return rows.join('\n');
}

export function starText(stars) {
  const s = Math.max(0, Math.min(3, Math.floor(Number(stars) || 0)));
  return '★'.repeat(s) + '☆'.repeat(3 - s);
}

/**
 * Link-free share card for a scored attempt.
 * "Nova Drop · Daily Nebula 2026-10-21 · ★★☆ · 12 drops" + emoji grid; a twist day names its twist after the date
 * ("... 2026-10-21 · café orders · ★★☆ ..."). The café look shows it through cozyText ("Today's Special").
 */
export function shareText(key, rec) {
  const drops = Math.max(0, Math.floor(Number(rec && rec.drops) || 0));
  const dropsTxt = `${drops.toLocaleString('en-US')} drop${drops === 1 ? '' : 's'}`;
  const tw = normTwist(rec && rec.twist);
  const day = tw === 'plain' ? key : `${key} · ${twistLabel(tw)}`;
  const head = rec && rec.won
    ? `Nova's Café · Daily Nebula ${day} · ${starText(rec.stars)} · ${dropsTxt}`
    : `Nova's Café · Daily Nebula ${day} · not solved · ${dropsTxt}`;
  const grid = rec && rec.grid ? rec.grid : '';
  return grid ? `${head}\n${grid}` : head;
}

/**
 * Record a finished attempt for date `key`. Mutates the save.
 * attempt: { won, stars, drops, log, twist } (twist: the day's DAILY_TWISTS id; only the first attempt's is kept)
 * Returns { scored, firstSolve, coins, record, monthKey, monthCount, badgeEarned }.
 *  scored:     this attempt became the date's scored attempt (it was the first one)
 *  firstSolve: the date was solved for the first time (counts toward the month, pays coins once)
 */
export function recordNebulaAttempt(save, key, attempt, now = new Date()) {
  const st = nebulaState(save);
  const won = !!attempt.won;
  const stars = won ? Math.max(1, Math.min(3, Math.floor(Number(attempt.stars) || 1))) : 0;
  const drops = Math.max(0, Math.floor(Number(attempt.drops) || 0));
  let rec = st.days[key];
  let scored = false, firstSolve = false;
  if (!rec) {
    scored = true;
    rec = st.days[key] = { won, stars, drops, grid: dropGrid(attempt.log), solved: false, best: 0, twist: normTwist(attempt.twist) };
  }
  if (won && !rec.solved) { rec.solved = true; firstSolve = true; }
  rec.best = Math.max(rec.best || 0, stars);
  const coins = firstSolve ? NEBULA_FIRST_SOLVE_COINS : 0;
  if (coins) save.coins = (save.coins || 0) + coins;
  const monthKey = monthKeyOf(key);
  const monthCount = monthSolved(save, monthKey);
  let badgeEarned = false;
  if (monthCount >= NEBULA_BADGE_TARGET && !st.badges.includes(monthKey)) {
    st.badges.push(monthKey);
    st.badges.sort();
    badgeEarned = true;
  }
  pruneNebula(save, now);
  return { scored, firstSolve, coins, record: rec, monthKey, monthCount, badgeEarned };
}

/** Drop day records older than KEEP_DAYS (badges stay). */
export function pruneNebula(save, now = new Date()) {
  const st = nebulaState(save);
  const today = dayKey(now);
  for (const k of Object.keys(st.days)) {
    const d = daysBetween(k, today);
    if (d == null || d > KEEP_DAYS) delete st.days[k];
  }
}

/** Share (native sheet on phones) or copy the card. Resolves 'shared' | 'copied' | 'cancelled' | 'failed'. */
export async function shareCard(text) {
  const nav = typeof navigator !== 'undefined' ? navigator : null;
  const coarse = (() => { try { return !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches); } catch (_) { return false; } })();
  if (nav && nav.share && coarse) {
    try { await nav.share({ text }); return 'shared'; } catch (e) { if (e && e.name === 'AbortError') return 'cancelled'; }
  }
  if (nav && nav.clipboard && nav.clipboard.writeText) {
    try { await nav.clipboard.writeText(text); return 'copied'; } catch (_) { /* fall through */ }
  }
  // legacy fallback (older WebViews)
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand && document.execCommand('copy');
    ta.remove();
    if (ok) return 'copied';
  } catch (_) { /* ignore */ }
  return 'failed';
}
