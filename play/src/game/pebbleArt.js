// Café look stones (docs/UX_OPPORTUNITIES.md item 6): the board blocker drawn as a smooth gray beach pebble from
// the harbour, not a cratered asteroid. Presentation only: the blocker is still `kind: 'asteroid'` in the rules and
// saves; the Cosmic look keeps its asteroid art (orbArt.js drawAsteroidShape). Unity mirror: Scripts/Art (OrbArt stone).
import { mulberry32 } from './rng.js';

// Six tones, picked by the stone's variant (its id % 6): warm and cool grays, a taupe, a slate, one sandy and one
// with a pale quartz band. All stay gray enough to read as "stone", never as a piece.
const TONES = [
  { hi: '#e2ded7', mid: '#a7a198', lo: '#69645d', band: null },
  { hi: '#dfe3e6', mid: '#9ca4ab', lo: '#5d656c', band: null },
  { hi: '#e6ddd2', mid: '#ab9f92', lo: '#6c6257', band: 'rgba(250,246,238,0.75)' },
  { hi: '#d9dcdf', mid: '#8f969d', lo: '#53595f', band: null },
  { hi: '#e9e2d6', mid: '#b2a898', lo: '#736a5c', band: null },
  { hi: '#dcdcda', mid: '#9d9c97', lo: '#62615c', band: 'rgba(248,248,244,0.7)' },
];

/** The pebble outline points: a smooth, slightly flattened blob (low-frequency wobble only, so it never looks rocky). */
function pebblePoints(r, rng) {
  const p1 = rng() * Math.PI * 2, p2 = rng() * Math.PI * 2;
  const a2 = 0.035 + rng() * 0.03, a3 = 0.02 + rng() * 0.025;
  const sy = 0.8 + rng() * 0.08; // wider than tall, like a stone lying on its side
  const rot = (rng() - 0.5) * 0.5;
  const n = 40;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const d = r * (0.9 + a2 * Math.sin(2 * a + p1) + a3 * Math.sin(3 * a + p2));
    const x0 = Math.cos(a) * d, y0 = Math.sin(a) * d * sy;
    pts.push([x0 * Math.cos(rot) - y0 * Math.sin(rot), x0 * Math.sin(rot) + y0 * Math.cos(rot)]);
  }
  return { pts, sy };
}
function tracePts(ctx, pts) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
}

/**
 * Paint one pebble centred at the origin. hp 1 adds a thin dark crack (it breaks on the next merge beside it);
 * the Cosmic asteroid's glowing lava crack has no place in the café.
 */
export function drawPebbleShape(ctx, r, hp, variant) {
  const v = ((variant | 0) % 6 + 6) % 6;
  const tone = TONES[v];
  const rng = mulberry32(v * 977 + 13);
  // soft contact shadow on the board, under the stone
  ctx.save();
  ctx.fillStyle = 'rgba(60,40,25,0.22)';
  ctx.beginPath(); ctx.ellipse(0, r * 0.62, r * 0.82, r * 0.18, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  ctx.save();
  const { pts, sy } = pebblePoints(r, rng);
  tracePts(ctx, pts);
  const g = ctx.createRadialGradient(-r * 0.32, -r * 0.38 * sy, r * 0.08, 0, 0, r * 1.05);
  g.addColorStop(0, tone.hi); g.addColorStop(0.55, tone.mid); g.addColorStop(1, tone.lo);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // a pale quartz band on two of the tones
  if (tone.band) {
    ctx.strokeStyle = tone.band;
    ctx.lineWidth = r * 0.1;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 1.1, r * 0.25); ctx.quadraticCurveTo(0, -r * 0.05, r * 1.1, r * 0.1);
    ctx.stroke();
  }
  // fine speckles (granite-like), a few dark and a few light
  for (let i = 0; i < 14; i++) {
    const x = (rng() - 0.5) * r * 1.6, y = (rng() - 0.5) * r * 1.3 * sy;
    ctx.fillStyle = i % 3 ? 'rgba(60,55,50,0.28)' : 'rgba(255,255,255,0.4)';
    ctx.beginPath(); ctx.arc(x, y, r * (0.025 + rng() * 0.03), 0, Math.PI * 2); ctx.fill();
  }
  // a darker underside so it sits on the board
  const under = ctx.createLinearGradient(0, -r * sy, 0, r * sy);
  under.addColorStop(0.55, 'rgba(0,0,0,0)'); under.addColorStop(1, 'rgba(40,32,26,0.28)');
  ctx.fillStyle = under;
  ctx.fillRect(-r * 1.2, -r * 1.2, r * 2.4, r * 2.4);
  // the wet-stone sheen: one soft highlight top-left
  const hl = ctx.createRadialGradient(-r * 0.34, -r * 0.42 * sy, 0, -r * 0.34, -r * 0.42 * sy, r * 0.45);
  hl.addColorStop(0, 'rgba(255,255,255,0.65)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hl;
  ctx.beginPath(); ctx.ellipse(-r * 0.34, -r * 0.42 * sy, r * 0.42, r * 0.24, -0.5, 0, Math.PI * 2); ctx.fill();
  if (hp <= 1) {
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const crack = () => {
      ctx.beginPath();
      ctx.moveTo(-r * 0.62, -r * 0.18); ctx.lineTo(-r * 0.22, -r * 0.02); ctx.lineTo(-r * 0.08, -r * 0.38); ctx.lineTo(r * 0.3, -r * 0.08); ctx.lineTo(r * 0.7, -r * 0.16);
      ctx.moveTo(-r * 0.22, -r * 0.02); ctx.lineTo(-r * 0.1, r * 0.32); ctx.lineTo(r * 0.22, r * 0.56);
    };
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = Math.max(1.5, r * 0.08); ctx.save(); ctx.translate(0, r * 0.03); crack(); ctx.stroke(); ctx.restore();
    ctx.strokeStyle = 'rgba(48,38,32,0.85)'; ctx.lineWidth = Math.max(1.2, r * 0.055); crack(); ctx.stroke();
  }
  ctx.restore();
  // a gentle cocoa outline, like the café pieces
  ctx.strokeStyle = 'rgba(70,52,40,0.6)';
  ctx.lineWidth = Math.max(1, r * 0.045);
  tracePts(ctx, pts);
  ctx.stroke();
  ctx.restore();
}
