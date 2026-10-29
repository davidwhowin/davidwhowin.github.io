// Tester tools (web only for now; the Unity mirror is deferred). Pure apart from the storage handed in.
//
// - The flag turns on by opening the game with ?tester=1 and is kept in localStorage (TESTER_KEY), so it
//   stays on for that device; ?tester=0 (or Settings › Extras › Tester tools › Turn off) clears it.
//   Without the flag nothing here is ever shown: real players and the public tester copy never see it.
// - "Skip level (tester)" completes the current Journey level as a 1-star pass through the same save writes a
//   real 1-star win makes (journey.stars / journey.level, so café stars, chapters and unlocks follow; the base
//   level coins; the first-clear gift; Tonight's bake; the Steady Start fail count; the Observatory check).
//   It never writes a score, best or record, never touches level stats, the Skill Journal, Nova Streak,
//   "Your puzzle week", Daily Orbits or save.runs, and never calls an ad hook (so interstitial pacing never sees it).
import { getLevel, levelReward, LEVEL_COUNT } from '../game/levels.js';
import { claimLevelGift } from './firstSession.js';
import { bakeLevelWon } from './bakes.js';
import { newlyCompleted } from './observatory.js';
import { recordJourneyResult } from './steadyStart.js';

export const TESTER_KEY = 'novadrop.tester';
export const SKIP_STARS = 1;

/**
 * Read the tester flag for this page load. `search` is location.search (+ hash is fine). ?tester=1 stores the flag,
 * ?tester=0 removes it, anything else reads what this device stored. Storage errors read as off.
 */
export function testerFromUrl(search, store) {
  const m = /[?&#]tester=([01])(?![\w])/.exec(String(search || ''));
  try {
    if (m && m[1] === '1') { store.setItem(TESTER_KEY, '1'); return true; }
    if (m && m[1] === '0') { store.removeItem(TESTER_KEY); return false; }
    return store.getItem(TESTER_KEY) === '1';
  } catch (_) {
    return !!(m && m[1] === '1');
  }
}

/** Turn the stored flag off (Settings › Extras › Tester tools). */
export function clearTester(store) {
  try { store.removeItem(TESTER_KEY); } catch (_) { /* nothing stored */ }
}

/** May this run be skipped? A plain Journey level only (never a Daily Nebula, book, lesson, friend or autoplay run). */
export function canSkipRun(run) {
  return !!(run && run.mode === 'journey' && run.level && !run.nebula && !run.book && !run.tutorial && !run.autoplay && !run.friend);
}

/**
 * Complete Journey level n as a 1-star pass in the save. Returns what was paid:
 * { level, stars, prevStars, firstTime, coins, gift, constellation } (constellation: chapter index or -1).
 */
export function skipLevel(save, n) {
  n = Math.max(1, Math.min(Math.floor(Number(n)) || 1, LEVEL_COUNT));
  const lv = getLevel(n);
  save.journey = save.journey || { level: 1, stars: {} };
  save.journey.stars = save.journey.stars || {};
  const prevStars = save.journey.stars[n] || 0;
  const firstTime = prevStars === 0;
  const coins = levelReward(lv, SKIP_STARS, firstTime); // the base for a 1-star pass, no Closing time bonus
  save.journey.stars[n] = Math.max(prevStars, SKIP_STARS);
  if (save.journey.level <= n) save.journey.level = n + 1;
  recordJourneyResult(save, { mode: 'journey', won: true, level: n }); // Steady Start: a pass clears the fail count
  bakeLevelWon(save, n);
  save.coins = (save.coins || 0) + coins;
  const gift = firstTime ? claimLevelGift(save, n) : null;
  const constellation = newlyCompleted(save, n, prevStars);
  return { level: n, stars: SKIP_STARS, prevStars, firstTime, coins, gift, constellation };
}
