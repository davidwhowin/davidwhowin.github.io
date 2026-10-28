// Endless "chosen challenge" (DESIGN.md): Gentle / Standard / Bold tide speed, picked before a run.
// Each tier keeps its OWN best score; Standard's best is the classic `save.best`, so old saves keep
// their best exactly where it was. Scores are never converted or scaled between tiers.
// The daily challenge is always Standard. Ads and interstitial caps ignore the tier.
import { CHALLENGES, normChallenge, challengeLine } from '../game/board.js';

export { CHALLENGES, normChallenge, challengeLine };

/**
 * Does this Endless run feed the sector-based stats (Lucky Start's recent sectors, stats.bestSector,
 * "Furthest sector", "Reach sector N")? Only Standard-tide runs (the daily challenge is Standard), so a
 * Gentle run can't inflate them or switch Lucky Start off. Coins follow the normal rules.
 */
export function standardTide(res) {
  return !!res && (!!res.daily || normChallenge(res.challenge) === 'standard');
}

/** Best score for a tier (Standard = save.best). */
export function challengeBest(save, id) {
  const t = normChallenge(id);
  if (t === 'standard') return Math.max(0, Math.floor(Number(save && save.best) || 0));
  const m = save && save.challengeBest;
  return Math.max(0, Math.floor(Number(m && m[t]) || 0));
}

/** Record a finished (non-daily, non-autoplay) Endless score on its own tier. Returns true on a new best. */
export function recordChallengeBest(save, id, score) {
  const t = normChallenge(id);
  const s = Math.max(0, Math.floor(Number(score) || 0));
  if (s <= challengeBest(save, t)) return false;
  if (t === 'standard') save.best = s;
  else {
    if (!save.challengeBest || typeof save.challengeBest !== 'object') save.challengeBest = { gentle: 0, bold: 0 };
    save.challengeBest[t] = s;
  }
  return true;
}

/** Save sanitiser: { gentle, bold } non-negative integers; last choice a known tier id. */
export function sanitizeChallenge(save) {
  const m = save.challengeBest && typeof save.challengeBest === 'object' && !Array.isArray(save.challengeBest) ? save.challengeBest : {};
  save.challengeBest = {
    gentle: Math.max(0, Math.floor(Number(m.gentle) || 0)),
    bold: Math.max(0, Math.floor(Number(m.bold) || 0)),
  };
  if (save.settings) save.settings.challenge = normChallenge(save.settings.challenge);
}
