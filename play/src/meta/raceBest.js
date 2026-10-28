// "Race your best" (web v0.5.4, docs/RETENTION_RESEARCH.md idea 7). Presentation only: scores are
// never changed. In Endless, a faint ghost tick on the best bar shows where the player's own best
// run on that tide tier was at the same drop count, and the label says "ahead by" / "behind by".
// Each tier (Gentle / Standard / Bold) keeps its own curve, saved only when a non-daily,
// non-autoplay run sets that tier's best. No ranking against anyone else.
// Save: raceBest { gentle|standard|bold: { score, drops, step, pts: [score after step, 2*step, ...] } }
// pts[i] = score after (i + 1) * step drops. The curve halves itself (step doubles) past RACE_MAX
// points, so it stays compact for any run length. Comfort toggle "Race your best" (settings.raceBest).
import { normChallenge } from './challenge.js';
import { t } from '../i18n/index.js'; // pure lookup, no UI imports (docs/LOCALISATION.md phase 4)

export const RACE_STEP = 5;
export const RACE_MAX = 120;
const TIERS = ['gentle', 'standard', 'bold'];
const int = (v) => typeof v === 'number' && Number.isInteger(v);

export function newCurve() {
  return { step: RACE_STEP, pts: [] };
}

/**
 * Record the score after `drops` finished drops (call before the next drop is counted, so a drop
 * replayed after a reload is never counted twice). Mutates and returns the curve.
 */
export function curveTick(curve, drops, score) {
  if (!curve || !Array.isArray(curve.pts) || !(curve.step >= 1)) return curve;
  if (drops <= 0 || drops % curve.step !== 0) return curve;
  const i = drops / curve.step - 1;
  if (i !== curve.pts.length) return curve; // out of order (should not happen): keep the curve honest
  curve.pts.push(Math.max(0, Math.floor(score)));
  if (curve.pts.length > RACE_MAX) {
    curve.pts = curve.pts.filter((_, k) => k % 2 === 1); // keep scores at 2*step, 4*step, ...
    curve.step *= 2;
  }
  return curve;
}

/** Where the best run was after `drops` drops (linear between checkpoints; its final score past its end). */
export function ghostAt(rec, drops) {
  if (!rec) return null;
  if (drops <= 0) return 0;
  if (drops >= rec.drops) return rec.score;
  const { step, pts } = rec;
  const k = Math.floor(drops / step); // checkpoints passed
  const x0 = k * step, y0 = k === 0 ? 0 : pts[k - 1];
  let x1, y1;
  if (k < pts.length) { x1 = (k + 1) * step; y1 = pts[k]; } else { x1 = rec.drops; y1 = rec.score; }
  if (y0 == null || y1 == null || x1 <= x0) return y0 == null ? null : y0;
  return Math.round(y0 + (y1 - y0) * (drops - x0) / (x1 - x0));
}

/** The stored curve for a tier, only if it is the run that set the current best (else null). */
export function raceFor(save, tier, best) {
  if (!save || !save.settings || save.settings.raceBest === false) return null;
  const m = save.raceBest;
  const rec = m && m[normChallenge(tier)];
  if (!rec || !best || rec.score !== best) return null;
  return rec;
}

/**
 * A finished Endless run: if it set its tier's best (call before the best is updated), keep its
 * curve. Never for the daily challenge or autoplay. Returns true when stored.
 */
export function recordRaceBest(save, res, prevBest) {
  if (!res || res.mode !== 'endless' || res.daily || res.autoplay) return false;
  const score = Math.max(0, Math.floor(Number(res.score) || 0));
  if (score <= prevBest || !res.curve) return false;
  const drops = Math.max(0, Math.floor(Number(res.drops) || 0));
  const rec = cleanRec({ score, drops, step: res.curve.step, pts: res.curve.pts });
  if (!rec) return false;
  if (!save.raceBest || typeof save.raceBest !== 'object' || Array.isArray(save.raceBest)) save.raceBest = {};
  save.raceBest[normChallenge(res.challenge)] = rec;
  return true;
}

function cleanRec(r) {
  if (!r || typeof r !== 'object') return null;
  const { score, drops, step } = r;
  if (!int(score) || score <= 0 || !int(drops) || drops < 1 || !int(step) || step < 1 || step > 1 << 20) return null;
  if (!Array.isArray(r.pts) || r.pts.length > RACE_MAX) return null;
  const pts = [];
  let prev = 0;
  for (const p of r.pts) {
    if (!int(p) || p < prev || p > score) return null; // scores only ever go up during a run
    pts.push(p);
    prev = p;
  }
  if (pts.length * step > drops) return null;
  return { score, drops, step, pts };
}

/** Save sanitiser: unknown tiers and malformed curves are dropped; settings.raceBest boolean (default on). */
export function sanitizeRace(save) {
  const m = save.raceBest && typeof save.raceBest === 'object' && !Array.isArray(save.raceBest) ? save.raceBest : {};
  const out = {};
  for (const t of TIERS) { const r = cleanRec(m[t]); if (r) out[t] = r; }
  save.raceBest = out;
  if (save.settings && typeof save.settings.raceBest !== 'boolean') save.settings.raceBest = true;
}

/** HUD wording, e.g. "ahead by 120" / "behind by 340" / "level with your best". */
export function raceLine(score, ghost) {
  const d = Math.round(score - ghost);
  if (d > 0) return t('race.ahead', { n: d.toLocaleString('en-US') });
  if (d < 0) return t('race.behind', { n: (-d).toLocaleString('en-US') });
  return t('race.level');
}
