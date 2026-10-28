// Zen Drift (DESIGN.md "Zen Drift"; docs/RETENTION_RESEARCH.md §5 idea 9). Endless with the rising
// tide switched off: no tide rows, no tide game over. A run ends when the player ends it (pause,
// End run) or when the board locks (full, no comets left). Low pressure on purpose:
//   - no ads at all: no revive, no reroll, no ×2 Coins, and a Zen run is not a "run" for the
//     interstitial counters (it never bumps save.runs or AdDirector's counters);
//   - no Nova Streak, no Daily Orbits progress, no records or Race your best;
//   - its own best (save.zen.best), never mixed with the tide bests;
//   - modest coins only (zenCoins below).
// Opens with the menu extras (Level 3 cleared, src/meta/onboarding.js). Mirrored by
// Scripts/Core/Meta/Zen.cs (same save shape: save.zen = { best, runs }).
import { menuExtrasOpen } from './onboarding.js';

/** Score per coin in Zen (Endless pays 1 per 50 plus a sector bonus). */
export const ZEN_SCORE_PER_COIN = 100;
/** Most coins one Zen run can pay, whatever its length (a calm mode, not a coin farm). */
export const ZEN_COIN_CAP = 50;

/** Is Zen Drift on the menu / in the evening offer? Same gate as the other menu extras. */
export function zenOpen(save) {
  return menuExtrasOpen(save);
}

/** A stored count: a finite number floored, else 0 (never negative, at most 2^53 - 1). Same in C# Zen.Count. */
function count(v) {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n > 0 ? Math.min(n, Number.MAX_SAFE_INTEGER) : 0;
}

/** The Zen best (0 when none). */
export function zenBest(save) {
  const z = save && save.zen;
  return z ? count(z.best) : 0;
}

/**
 * Coins for a finished Zen run: floor(score / 100), times the usual perk / Coin Boost bonus,
 * capped at 50. No sector bonus. Never doubled by an ad (Zen has none).
 */
export function zenCoins(score, { perkBonus = 0, coinLevel = 0 } = {}) {
  const base = Math.floor(count(score) / ZEN_SCORE_PER_COIN);
  return Math.min(ZEN_COIN_CAP, Math.floor(base * (1 + perkBonus + 0.1 * coinLevel)));
}

/** Record a finished (non-autoplay) Zen run. Returns true on a new Zen best. Scores are never altered. */
export function recordZen(save, score) {
  if (!save.zen || typeof save.zen !== 'object') save.zen = { best: 0, runs: 0 };
  const s = count(score);
  save.zen.runs = count(save.zen.runs) + 1;
  if (s <= zenBest(save)) return false;
  save.zen.best = s;
  return true;
}

/** Save sanitiser: { best, runs } non-negative integers (older saves get { 0, 0 }). */
export function sanitizeZen(save) {
  const z = save.zen && typeof save.zen === 'object' && !Array.isArray(save.zen) ? save.zen : {};
  save.zen = {
    best: count(z.best),
    runs: count(z.runs),
  };
}
