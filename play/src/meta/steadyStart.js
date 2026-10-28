// Steady Start (DESIGN.md): after STEADY_FAILS fails in a row on the same Journey level, the next
// attempt may start with one Wild Orb pre-placed on the board (src/game/levels.js steadyPlacement).
// Free, optional, clearly labelled, and NEVER tied to ads: it does not look at ad readiness, ad
// history or spend. Stars still count. The fail streak resets when the level is won.
// Not offered in the Daily Nebula (a shared daily puzzle must be the same board for everyone)
// and autoplay/test runs never count.

export const STEADY_FAILS = 3;

function fails(save) {
  if (!save.journey || typeof save.journey !== 'object') save.journey = { level: 1, stars: {} };
  const f = save.journey.fails;
  if (!f || typeof f !== 'object' || Array.isArray(f)) save.journey.fails = {};
  return save.journey.fails;
}

/** Fails in a row on level n (0 if none). */
export function failStreak(save, n) {
  const f = save && save.journey && save.journey.fails;
  return f && typeof f === 'object' ? Math.max(0, Math.floor(Number(f[n]) || 0)) : 0;
}

/**
 * Count a finished Journey attempt: a win clears the level's streak, any other ending (fail,
 * give-up, forfeit after at least one drop) adds one. Ignores the Daily Nebula and autoplay. Returns the new streak.
 */
export function recordJourneyResult(save, res) {
  if (!res || res.mode !== 'journey' || res.nebula || res.autoplay) return 0;
  const f = fails(save);
  const n = res.level;
  if (res.won) { delete f[n]; return 0; }
  if (res.forfeit && !res.dropsUsed) return failStreak(save, n); // quitting before any drop is not an attempt
  f[n] = failStreak(save, n) + 1;
  return f[n];
}

/** Offer Steady Start before the next attempt at level n? (Setting on + 3 fails in a row.) */
export function shouldOfferSteady(save, n) {
  if (!save || !save.settings || save.settings.steadyStart === false) return false;
  return failStreak(save, n) >= STEADY_FAILS;
}

/** Save sanitiser: { levelNumber: positive integer }. */
export function sanitizeSteady(save) {
  const f = fails(save);
  for (const k of Object.keys(f)) {
    const v = Math.floor(Number(f[k]) || 0);
    if (!/^[1-9]\d*$/.test(k) || v <= 0) delete f[k];
    else f[k] = v;
  }
  if (typeof save.settings.steadyStart !== 'boolean') save.settings.steadyStart = true;
}
