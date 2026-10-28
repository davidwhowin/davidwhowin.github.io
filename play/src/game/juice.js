// Success-graded juice (Wave E, research feature A). Presentation only: never touches rules.
//
// Feedback intensity follows the REAL outcome on 5 steps (0..4), so an ordinary merge stays
// light and only genuinely big moments get the loud stuff (Kao et al. 2024: success-contingent
// juice beats "more juice"). A fail, revive or "No thanks" never uses these celebration steps.
// Calm / reduced motion is applied later by Effects (it lowers amplification, never the cue).

/** 0..4 step for a merge: the biggest of its tier, combo and group-size steps. */
export function mergeLevel({ tier = 1, combo = 1, size = 2 } = {}) {
  const tierStep = tier >= 10 ? 4 : tier >= 8 ? 3 : tier >= 6 ? 2 : tier >= 4 ? 1 : 0;
  const comboStep = Math.max(0, Math.min(4, combo - 1));
  const sizeStep = size >= 5 ? 3 : size === 4 ? 2 : size === 3 ? 1 : 0;
  return Math.max(tierStep, comboStep, sizeStep);
}

const PARTICLES = [8, 16, 26, 38, 52];
const GLOW = [0.22, 0.3, 0.38, 0.46, 0.55];
const SHAKE = [0, 2, 4, 6.5, 9];
const HITSTOP = [0, 0, 0.05, 0.07, 0.09];
const HAPTIC = ['light', 'light', 'medium', 'medium', 'heavy'];

/** Effect budget for one merge. `ring` is off for ordinary merges. */
export function mergeJuice(m) {
  const level = mergeLevel(m);
  return {
    level,
    particles: PARTICLES[level],
    ring: level >= 1,
    glow: GLOW[level],
    shake: SHAKE[level],
    hitStop: HITSTOP[level],
    haptic: HAPTIC[level],
  };
}

/** Level-complete fanfare scaled by the stars actually earned (1..3). */
export function winJuice(stars) {
  const s = Math.max(1, Math.min(3, Math.floor(Number(stars) || 1)));
  return {
    bursts: s === 3 ? 5 : s === 2 ? 3 : 1,
    perBurst: s === 3 ? 26 : s === 2 ? 20 : 16,
    flash: s === 3 ? 0.3 : s === 2 ? 0.16 : 0,
    sfx: s === 3 ? 'newbest' : 'perk',
  };
}
