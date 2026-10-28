// Daily Orbits: 3 small daily tasks (evolved from Daily Missions, research #4).
//
// - Picked deterministically from the LOCAL date with a seeded hash of the date key
//   (mulberry32(hashString('orbits:'+date))). Never the game RNG, never device data.
// - A modest coin reward each, plus a small bonus once all 3 are claimed.
// - No streak. Skipping a day costs nothing: tasks just refresh tomorrow, and any task
//   finished but not collected before midnight is paid out automatically on the next visit.
// - No ads are tied to it, and autoplay runs never count (Game.track skips them).
//
// Save shape: save.orbits = { date: 'YYYY-MM-DD'|null, list: [{ type, scope, target, reward,
//   progress, done, claimed }], bonusClaimed: bool }.
// scope 'best' = best single value (combo, tier, score, sector); 'count' = adds up over the day.
//
// v3: the old Daily Missions are gone (src/meta/migrateV3.js paid any finished, uncollected mission once).
import { mulberry32, hashString } from '../game/rng.js';
import { aTierName, novaGoalText } from '../game/tierNames.js'; // display names (skin-aware)
import { dayKey } from './daily.js';

// v3: Stardust was cut, so its value moved into coins: +65 per task and +100 on the bonus (was [50, 70, 90] and 75).
export const ORBIT_REWARDS = [115, 135, 155]; // coins per task by difficulty step
export const ORBIT_BONUS = 175;               // all three collected
export const ORBIT_COUNT = 3;

// minStep: only offered once the player has that much experience (keeps day one gentle)
const TEMPLATES = [
  { type: 'tier', scope: 'best', targets: [5, 6, 7], text: (t, skin) => `Make ${aTierName(t, skin)}` },
  { type: 'nebula', scope: 'count', targets: [1, 1, 1], text: () => 'Play the Daily Nebula' },
  { type: 'combo', scope: 'best', targets: [3, 4, 5], text: (t) => `Reach combo ×${t}` },
  { type: 'asteroids', scope: 'count', targets: [2, 4, 6], text: (t) => `Clear ${t} asteroids` },
  { type: 'level', scope: 'count', targets: [1, 1, 2], text: (t) => (t > 1 ? `Clear ${t} Journey levels` : 'Clear a Journey level') },
  { type: 'merges', scope: 'count', targets: [30, 60, 100], text: (t) => `Merge ${t} times` },
  { type: 'sector', scope: 'best', targets: [2, 3, 4], text: (t) => `Reach sector ${t} in Endless` },
  { type: 'score', scope: 'best', targets: [1500, 4000, 8000], text: (t) => `Score ${t.toLocaleString('en-US')} in one game` },
  { type: 'supernova', scope: 'count', targets: [1, 1, 1], minStep: 2, text: (t, skin) => novaGoalText(1, skin) },
];

export const ORBIT_TYPES = TEMPLATES.map((t) => t.type);

export function orbitText(o, skin) {
  const t = TEMPLATES.find((x) => x.type === o.type);
  return t ? t.text(o.target, skin) : o.type;
}

/** Experience step 0..2 from finished runs (difficulty of today's targets). */
export function orbitStep(save) {
  return Math.min(2, Math.floor(((save && save.runs) || 0) / 8));
}

/** Pure: today's 3 tasks for a date key and experience step. Same inputs, same tasks. */
export function pickOrbits(key, step = 0) {
  const rng = mulberry32(hashString('orbits:' + key));
  const pool = TEMPLATES.filter((t) => (t.minStep || 0) <= step);
  const list = [];
  while (list.length < ORBIT_COUNT && pool.length) {
    const t = pool.splice(Math.floor(rng() * pool.length), 1)[0];
    const lv = Math.max(0, Math.min(2, step + (rng() < 0.25 ? 1 : 0) - (rng() < 0.25 ? 1 : 0)));
    list.push({ type: t.type, scope: t.scope, target: t.targets[lv], reward: ORBIT_REWARDS[lv], progress: 0, done: false, claimed: false });
  }
  return list;
}

/** Coins still owed by a day's orbits (finished but never collected), bonus included. */
function owed(o) {
  if (!o || !Array.isArray(o.list)) return 0;
  let c = 0;
  for (const m of o.list) if (m.done && !m.claimed) c += m.reward || 0;
  if (o.list.length === ORBIT_COUNT && o.list.every((m) => m.done) && !o.bonusClaimed) c += ORBIT_BONUS;
  return c;
}

/**
 * Make sure save.orbits holds today's tasks. On a new day, anything finished but not collected
 * yesterday is paid out (nothing is lost by not opening the sheet). Returns { list, carried }
 * where `carried` is the coins just paid for an earlier day.
 */
export function ensureOrbits(save, now = new Date()) {
  const k = dayKey(now);
  const o = save.orbits;
  if (o && o.date === k && Array.isArray(o.list) && o.list.length === ORBIT_COUNT) return { list: o.list, carried: 0 };
  const carried = owed(o);
  if (carried) save.coins = (save.coins || 0) + carried;
  save.orbits = { date: k, list: pickOrbits(k, orbitStep(save)), bonusClaimed: false };
  return { list: save.orbits.list, carried };
}

/**
 * Feed a progress event. 'best' tasks take the value as-is (in-run value), 'count' tasks add it.
 * Returns tasks that became complete with this event.
 */
export function trackOrbit(save, type, value) {
  const completed = [];
  const list = (save.orbits && save.orbits.list) || [];
  for (const m of list) {
    if (m.type !== type || m.done) continue;
    if (m.scope === 'best') m.progress = Math.max(m.progress, value);
    else m.progress += value;
    if (m.progress >= m.target) { m.progress = m.target; m.done = true; completed.push(m); }
  }
  return completed;
}

/** Collect one finished task. Returns the coins paid (0 if not ready or already collected). */
export function claimOrbit(save, index, now = new Date()) {
  const m = save.orbits && save.orbits.list[index];
  if (!m || !m.done || m.claimed) return 0;
  m.claimed = true;
  save.coins += m.reward;
  return m.reward;
}

export function bonusReady(save) {
  const o = save.orbits;
  return !!(o && o.list.length === ORBIT_COUNT && o.list.every((m) => m.claimed) && !o.bonusClaimed);
}

/** Collect the all-three bonus. Returns coins paid (0 if not ready or already collected). */
export function claimOrbitBonus(save, now = new Date()) {
  if (!bonusReady(save)) return 0;
  save.orbits.bonusClaimed = true;
  save.coins += ORBIT_BONUS;
  return ORBIT_BONUS;
}

/** Number of things ready to collect (menu badge). */
export function claimableOrbits(save) {
  const list = (save.orbits && save.orbits.list) || [];
  return list.filter((m) => m.done && !m.claimed).length + (bonusReady(save) ? 1 : 0);
}

/** Short menu line: "2/3 today" or "Done for today". */
export function orbitsSummary(save) {
  const list = (save.orbits && save.orbits.list) || [];
  const done = list.filter((m) => m.done).length;
  return { done, total: list.length, allDone: list.length > 0 && done === list.length && !!save.orbits.bonusClaimed };
}
