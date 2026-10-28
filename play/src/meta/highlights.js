// Run highlights for the Endless game-over screen: best moment, records broken, one next goal.
// Presentation only: reads real run numbers and the save; never alters scores or rules.
import { tierName } from '../game/tierNames.js'; // display names (skin-aware)
import { DISCOVERY_MIN_TIER } from './firstSession.js';
import { challengeBest, normChallenge, standardTide } from './challenge.js';

const fmt = (n) => Math.floor(n || 0).toLocaleString('en-US');

/**
 * Personal records this run beats. Call BEFORE the run is folded into save.stats / save.best.
 * A record only counts when there was a previous value to beat (no "records" on a first run
 * or for a stat that was never tracked before).
 */
export function runRecords(save, res) {
  const st = save.stats || {};
  const out = [];
  const bestBefore = res.bestBefore || 0;
  const tier = normChallenge(res.challenge);
  if (!res.daily && bestBefore > 0 && res.score > bestBefore) out.push(tier === 'standard' ? 'Best score' : tier === 'gentle' ? 'Best Gentle score' : 'Best Bold score');
  if (res.daily && bestBefore > 0 && res.score > bestBefore) out.push('Best today');
  if (standardTide(res) && (save.runs || 0) > 0 && (st.bestSector || 1) > 1 && res.sector > st.bestSector) out.push('Furthest sector'); // Standard tide only
  if ((st.highestTier || 0) > 0 && res.maxTier > st.highestTier) out.push('Biggest orb');
  if ((st.bestChain || 0) > 0 && res.bestChain && res.bestChain.points > st.bestChain) out.push('Biggest chain');
  if ((st.bestCombo || 0) > 0 && res.maxCombo > st.bestCombo) out.push('Longest combo');
  return out;
}

/** "×5 chain · 3,200 pts" (or a single merge's points), or '' when nothing scored. */
export function chainText(chain) {
  if (!chain || !chain.points) return '';
  return chain.combo >= 2 ? `×${chain.combo} chain · ${fmt(chain.points)} pts` : `${fmt(chain.points)} pts in one drop`;
}

/**
 * One clear, honest next goal. Call AFTER the run is folded into the save.
 * Priority: the next orb tier never made -> points to beat your best -> the next sector.
 */
export function nextGoal(save, res) {
  const found = new Set(Array.isArray(save.discovered) ? save.discovered : []);
  for (let t = DISCOVERY_MIN_TIER; t <= 10; t++) {
    if (!found.has(t)) return { kind: 'tier', tier: t, text: `Make your first ${tierName(t)}` };
  }
  const best = res.daily ? Math.max(res.bestBefore || 0, res.score) : challengeBest(save, res.challenge); // the run's own tide tier
  if (best > res.score) return { kind: 'score', text: `${fmt(best - res.score)} points to beat your best` };
  const s = (standardTide(res) ? Math.max(res.sector, (save.stats && save.stats.bestSector) || 1) : res.sector) + 1; // Gentle / Bold: this run's sector
  return { kind: 'sector', text: `Reach sector ${s}` };
}
