// Cat Café orb skin (premium themed pack, DESIGN.md "Premium themed packs"). Procedural Canvas only.
//
// Freeform pieces: no disc or ring. Each tier IS the cat, a free-standing shaped object that fills its cell,
// like a candy in a match-3: curled kitten ball, stretching tabby, tall calico, tuxedo in a top hat, bread loaf,
// teacup, gift box, red lucky chonk, lilac Persian on a cushion, lion king. Tiers read by silhouette AND by one
// dominant body colour (CAT_COLORS). Every piece gets the same finish: a crisp dark outline around the whole
// silhouette, a thin light rim on the top-left edge, a soft inner shade bottom-right, glossy highlights and a
// contact shadow. The art stays inside the cell footprint (about 1r), so hit areas and physics are unchanged.
//
// Painted ONCE per tier/size/frame into the orb sprite cache (orbArt.js). Five frames per tier:
//   0 rest, 1 blink, 2 ear twitch, 3 tail half-flick, 4 tail full flick.
// The idle breathe is a transform in drawOrb, so animation never repaints; Calm / reduced motion freezes it.
// Texture detail comes from a seeded mulberry32 stream per tier, so every sprite of a tier is identical.
import { mulberry32 } from './rng.js';

const TAU = Math.PI * 2;

/** Dominant body colour per tier (index 1..10). Ten distinct hues: the colour carries the tier. */
export const CAT_COLORS = [null, '#8fb0dc', '#f6a04a', '#f3ead9', '#2f2a3a', '#8a5a3c', '#ff8fb8', '#3fbdb5', '#d8323f', '#a685e8', '#f2bd3c'];
/** Silhouette outline ink per tier: a deep shade of the body colour. */
const INKS = [null, '#1b2846', '#4e1c04', '#3e2c1c', '#050308', '#2a1406', '#5a1436', '#08383a', '#3a040c', '#26104e', '#4e2c02'];

/** Main colour of a tier (particles, guides). */
export const catColor = (tier) => CAT_COLORS[Math.max(1, Math.min(10, tier | 0))];

/** Display names of the ten tiers (shop preview). */
export const CAT_NAMES = [null, 'Curled kitten', 'Stretchy tabby', 'Calico', 'Dapper tuxedo', 'Sleepy loaf', 'Teacup kitten', 'Siamese gift', 'Lucky chonk', 'Persian queen', 'Lion king'];

// ------------------------------------------------------------------ helpers

function ell(g, x, y, rx, ry, rot = 0) { g.beginPath(); g.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU); }

function rrect(g, x, y, w, h, rad) {
  const r = Math.min(rad, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function lin(g, x0, y0, x1, y1, stops) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([o, c]) => gr.addColorStop(o, c));
  return gr;
}

function rad(g, x, y, r0, x1, y1, r1, stops) {
  const gr = g.createRadialGradient(x, y, r0, x1, y1, r1);
  stops.forEach(([o, c]) => gr.addColorStop(o, c));
  return gr;
}

/** Soft contact shadow (ellipse). */
function contact(g, x, y, rx, ry, a = 0.45) {
  g.save();
  g.fillStyle = rad(g, x, y, 0, x, y, rx, [[0, `rgba(6,2,10,${a})`], [0.6, `rgba(6,2,10,${a * 0.5})`], [1, 'rgba(6,2,10,0)']]);
  g.translate(x, y); g.scale(1, ry / rx);
  g.beginPath(); g.arc(0, 0, rx, 0, TAU); g.fill();
  g.restore();
}

function shine(g, x, y, rx, ry, rot, a = 0.6) {
  g.save();
  g.fillStyle = rad(g, x, y, 0, x, y, Math.max(rx, ry), [[0, `rgba(255,255,255,${a})`], [1, 'rgba(255,255,255,0)']]);
  ell(g, x, y, rx, ry, rot); g.fill();
  g.restore();
}

function sparkle(g, x, y, s, col) {
  g.fillStyle = col;
  g.beginPath();
  g.moveTo(x, y - s); g.quadraticCurveTo(x, y, x + s, y); g.quadraticCurveTo(x, y, x, y + s); g.quadraticCurveTo(x, y, x - s, y); g.quadraticCurveTo(x, y, x, y - s);
  g.fill();
}

function heart(g, x, y, s, col) {
  g.fillStyle = col;
  g.beginPath(); g.moveTo(x, y + s * 0.9);
  g.bezierCurveTo(x - s * 1.4, y - s * 0.2, x - s * 0.6, y - s * 1.2, x, y - s * 0.4);
  g.bezierCurveTo(x + s * 0.6, y - s * 1.2, x + s * 1.4, y - s * 0.2, x, y + s * 0.9);
  g.fill();
}

/** A fur fill: radial light from the top left. fur = { li, base, dk, line }. */
function furFill(g, x, y, w, h, F) {
  return rad(g, x - w * 0.35, y - h * 0.45, Math.min(w, h) * 0.05, x, y, Math.max(w, h) * 1.1, [[0, F.li], [0.55, F.base], [1, F.dk]]);
}

/** Inner detail line (the bold silhouette outline is added by the compositor). */
function outline(g, r, col, k = 1) {
  g.strokeStyle = col; g.lineWidth = Math.max(1, r * 0.024 * k); g.lineJoin = 'round'; g.lineCap = 'round';
  g.stroke();
}

const fur = (li, base, dk, line) => ({ li, base, dk, line });

// ------------------------------------------------------------------ cat parts

/** One ear: base centred at (x, y), pointing along `ang` (0 = straight up). */
function ear(g, r, x, y, w, h, ang, F, inner, tuft = false) {
  g.save();
  g.translate(x, y); g.rotate(ang);
  g.beginPath();
  g.moveTo(-w / 2, h * 0.12);
  g.quadraticCurveTo(-w * 0.34, -h * 0.55, -w * 0.06, -h * 0.96);
  g.quadraticCurveTo(0, -h * 1.04, w * 0.06, -h * 0.96);
  g.quadraticCurveTo(w * 0.34, -h * 0.55, w / 2, h * 0.12);
  g.closePath();
  g.fillStyle = lin(g, 0, -h, 0, h * 0.2, [[0, F.li], [1, F.base]]);
  g.fill();
  outline(g, r, F.line);
  g.beginPath();
  g.moveTo(-w * 0.3, h * 0.05);
  g.quadraticCurveTo(-w * 0.18, -h * 0.5, 0, -h * 0.78);
  g.quadraticCurveTo(w * 0.18, -h * 0.5, w * 0.3, h * 0.05);
  g.closePath();
  g.fillStyle = lin(g, 0, -h * 0.8, 0, 0, [[0, inner[0]], [1, inner[1]]]);
  g.fill();
  if (tuft) {
    g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = Math.max(1, r * 0.018); g.lineCap = 'round';
    for (const dx of [-0.08, 0.04, 0.14]) { g.beginPath(); g.moveTo(w * dx, -h * 0.1); g.lineTo(w * dx * 0.4, -h * 0.55); g.stroke(); }
  }
  g.restore();
}

/** A pair of ears; frame 2 twitches the right one outward (and folds it a little). */
function ears(g, r, frame, cx, cy, spread, w, h, tilt, F, inner = ['#ffb3c6', '#ff8fae'], tuft = false) {
  ear(g, r, cx - spread, cy, w, h, -tilt, F, inner, tuft);
  const tw = frame === 2;
  ear(g, r, cx + spread + (tw ? r * 0.03 : 0), cy + (tw ? r * 0.03 : 0), w, h * (tw ? 0.84 : 1), tilt + (tw ? 0.45 : 0), F, inner, tuft);
}

/** Mochi head path: round top, full cheeks. */
function headPath(g, x, y, hw, hh) {
  g.beginPath();
  g.moveTo(x, y - hh);
  g.bezierCurveTo(x + hw * 0.72, y - hh, x + hw, y - hh * 0.5, x + hw, y + hh * 0.08);
  g.bezierCurveTo(x + hw, y + hh * 0.72, x + hw * 0.58, y + hh, x, y + hh);
  g.bezierCurveTo(x - hw * 0.58, y + hh, x - hw, y + hh * 0.72, x - hw, y + hh * 0.08);
  g.bezierCurveTo(x - hw, y - hh * 0.5, x - hw * 0.72, y - hh, x, y - hh);
  g.closePath();
}

/** Head fill + optional markings (clipped) + inner outline. */
function head(g, r, x, y, hw, hh, F, marks) {
  g.save();
  g.shadowColor = 'rgba(20,6,20,0.35)'; g.shadowBlur = r * 0.08; g.shadowOffsetY = r * 0.035;
  headPath(g, x, y, hw, hh);
  g.fillStyle = furFill(g, x, y, hw, hh, F);
  g.fill();
  g.restore();
  if (marks) {
    g.save();
    headPath(g, x, y, hw, hh); g.clip();
    marks(g);
    g.restore();
  }
  headPath(g, x, y, hw, hh);
  outline(g, r, F.line);
}

/** Muzzle puffs under the nose. */
function muzzle(g, x, y, s, col = 'rgba(255,255,255,0.85)') {
  g.fillStyle = col;
  ell(g, x - s * 0.2, y + s * 0.06, s * 0.26, s * 0.2); g.fill();
  ell(g, x + s * 0.2, y + s * 0.06, s * 0.26, s * 0.2); g.fill();
}

/**
 * Kawaii cat face centred at (x, y); s = size unit (about the eye spacing).
 * o: { iris, blink, sleepy (closed unless blink: then one eye peeks), light (whiskers for dark fur), nose, blush }
 */
function face(g, x, y, s, o = {}) {
  const ink = '#25141f';
  const ex = s * 0.5, er = s * 0.2;
  g.save();
  g.translate(x, y);
  if (o.blush !== false) {
    g.fillStyle = 'rgba(255,110,150,0.45)';
    ell(g, -s * 0.86, s * 0.3, s * 0.2, s * 0.12); g.fill();
    ell(g, s * 0.86, s * 0.3, s * 0.2, s * 0.12); g.fill();
  }
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (const sx of [-1, 1]) {
    const shut = o.sleepy ? !(o.blink && sx === 1) : o.blink;
    if (shut) {
      g.strokeStyle = ink; g.lineWidth = Math.max(1, s * 0.1);
      g.beginPath();
      if (o.sleepy) g.arc(sx * ex, -er * 0.5, er * 0.95, 0.18 * Math.PI, 0.82 * Math.PI); // content, closed
      else g.arc(sx * ex, er * 0.6, er * 0.95, 1.18 * Math.PI, 1.82 * Math.PI); // happy blink ^
      g.stroke();
    } else {
      g.save();
      ell(g, sx * ex, 0, er * 0.9, er * 1.12);
      g.fillStyle = ink; g.fill();
      g.clip();
      g.fillStyle = rad(g, sx * ex, er * 0.9, 0, sx * ex, er * 0.9, er * 1.25, [[0, o.iris || '#7fd0ff'], [0.7, o.iris || '#7fd0ff'], [1, 'rgba(0,0,0,0)']]);
      g.globalAlpha = 0.85;
      g.fillRect(sx * ex - er, -er * 1.2, er * 2, er * 2.4);
      g.restore();
      g.fillStyle = '#ffffff';
      g.beginPath(); g.arc(sx * ex - er * 0.28, -er * 0.4, er * 0.4, 0, TAU); g.fill();
      g.globalAlpha = 0.85;
      g.beginPath(); g.arc(sx * ex + er * 0.32, er * 0.38, er * 0.17, 0, TAU); g.fill();
      g.globalAlpha = 1;
    }
  }
  // nose + ω mouth
  const ny = s * 0.2;
  g.fillStyle = o.nose || '#ff8aa6';
  g.beginPath(); g.moveTo(-s * 0.09, ny - s * 0.03); g.quadraticCurveTo(0, ny - s * 0.07, s * 0.09, ny - s * 0.03); g.quadraticCurveTo(s * 0.02, ny + s * 0.07, 0, ny + s * 0.07); g.quadraticCurveTo(-s * 0.02, ny + s * 0.07, -s * 0.09, ny - s * 0.03); g.fill();
  g.strokeStyle = ink; g.lineWidth = Math.max(1, s * 0.075);
  g.beginPath();
  g.moveTo(0, ny + s * 0.06); g.lineTo(0, ny + s * 0.11);
  g.arc(-s * 0.1, ny + s * 0.11, s * 0.1, 0, 0.9 * Math.PI);
  g.moveTo(s * 0.2, ny + s * 0.11);
  g.arc(s * 0.1, ny + s * 0.11, s * 0.1, 0, Math.PI, false);
  g.stroke();
  // whiskers
  g.strokeStyle = o.light ? 'rgba(255,255,255,0.75)' : 'rgba(90,60,70,0.45)';
  g.lineWidth = Math.max(0.8, s * 0.035);
  for (const sx of [-1, 1]) for (const dy of [-0.02, 0.1]) {
    g.beginPath(); g.moveTo(sx * s * 0.62, ny + s * dy); g.quadraticCurveTo(sx * s * 0.9, ny + s * (dy - 0.05), sx * s * 1.12, ny + s * (dy * 1.6 - 0.02)); g.stroke();
  }
  g.restore();
}

/** Points along a chain of cubic segments [p0, c1, c2, p1, c3, c4, p2, ...] (scaled by r). */
function samplePath(pts, r, n = 28) {
  const out = [];
  const segs = (pts.length - 1) / 3;
  for (let s = 0; s < segs; s++) {
    const [a, b, c, d] = [pts[s * 3], pts[s * 3 + 1], pts[s * 3 + 2], pts[s * 3 + 3]];
    for (let i = s ? 1 : 0; i <= n; i++) {
      const t = i / n, u = 1 - t;
      const x = u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0];
      const y = u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1];
      out.push([x * r, y * r]);
    }
  }
  return out;
}

function polyline(g, p, from = 0, to = p.length) {
  g.beginPath();
  for (let i = from; i < to; i++) { if (i === from) g.moveTo(p[i][0], p[i][1]); else g.lineTo(p[i][0], p[i][1]); }
}

/** A tail tube along a cubic chain. o: { w, fur, tip, tipW, stripes, fluffy }. */
function tail(g, r, pts, o) {
  const p = samplePath(pts, r);
  const w = o.w * r;
  g.save();
  g.lineCap = 'round'; g.lineJoin = 'round';
  polyline(g, p);
  g.strokeStyle = o.fur.line; g.lineWidth = w + Math.max(1.5, r * 0.045); g.stroke();
  if (o.fluffy) { g.lineWidth = w * 1.5; g.strokeStyle = o.fur.base; g.globalAlpha = 0.55; g.stroke(); g.globalAlpha = 1; }
  g.strokeStyle = o.fur.base; g.lineWidth = w; g.stroke();
  if (o.stripes) {
    g.setLineDash([w * 0.55, w * 0.75]);
    g.strokeStyle = o.stripes; g.lineWidth = w * 0.98; g.lineCap = 'butt';
    polyline(g, p, Math.floor(p.length * 0.1)); g.stroke();
    g.setLineDash([]); g.lineCap = 'round';
  }
  if (o.tip) {
    polyline(g, p, Math.floor(p.length * 0.74));
    g.strokeStyle = o.tip; g.lineWidth = w * (o.tipW || 1); g.stroke();
  }
  g.translate(-w * 0.12, -w * 0.16);
  polyline(g, p, 1, p.length - 1);
  g.strokeStyle = 'rgba(255,255,255,0.32)'; g.lineWidth = w * 0.3; g.stroke();
  g.restore();
}

/** A furry limb / body tube along a cubic chain, lit from the top. Returns the sampled points. */
function tube(g, r, pts, wk, F) {
  const p = samplePath(pts, r, 20);
  const w = wk * r;
  let y0 = Infinity, y1 = -Infinity;
  for (const [, y] of p) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  g.save();
  g.lineCap = 'round'; g.lineJoin = 'round';
  polyline(g, p);
  g.strokeStyle = F.line; g.lineWidth = w + Math.max(1.5, r * 0.045); g.stroke();
  g.strokeStyle = lin(g, 0, y0 - w / 2, 0, y1 + w / 2, [[0, F.li], [0.45, F.base], [1, F.dk]]);
  g.lineWidth = w; g.stroke();
  g.restore();
  return p;
}

/** Pick the tail pose for a frame: rest, half flick (3), full flick (4). */
function pose(frame, rest, flick) {
  if (frame === 4) return flick;
  if (frame === 3) return rest.map((p, i) => [(p[0] + flick[i][0]) / 2, (p[1] + flick[i][1]) / 2]);
  return rest;
}

/** A round front paw with toe lines. */
function paw(g, r, x, y, s, F, pad = false) {
  g.save();
  ell(g, x, y, s, s * 0.8);
  g.fillStyle = furFill(g, x, y, s, s * 0.8, F); g.fill();
  outline(g, r, F.line);
  g.strokeStyle = F.line; g.lineWidth = Math.max(0.8, r * 0.016); g.lineCap = 'round';
  for (const dx of [-0.32, 0.32]) { g.beginPath(); g.moveTo(x + s * dx, y + s * 0.55); g.lineTo(x + s * dx, y + s * 0.15); g.stroke(); }
  if (pad) { g.fillStyle = '#ff9fb8'; ell(g, x, y - s * 0.05, s * 0.32, s * 0.24); g.fill(); }
  g.restore();
}

/** A scalloped fluffy outline path (ring of bumps), for Persian fluff and the lion mane. */
function fluffPath(g, x, y, rx, ry, n, bump, phase = 0) {
  g.beginPath();
  for (let i = 0; i <= n * 6; i++) {
    const a = (i / (n * 6)) * TAU + phase;
    const k = 1 + bump * Math.abs(Math.sin((a - phase) * n / 2));
    const px = x + Math.cos(a) * rx * k, py = y + Math.sin(a) * ry * k;
    if (i) g.lineTo(px, py); else g.moveTo(px, py);
  }
  g.closePath();
}

/** Fill a body path with fur, optional clipped markings, then the inner outline. */
function bodyBlob(g, r, pathFn, F, cx, cy, w, h, marks) {
  g.save();
  g.shadowColor = 'rgba(20,6,20,0.3)'; g.shadowBlur = r * 0.08; g.shadowOffsetY = r * 0.03;
  pathFn(); g.fillStyle = furFill(g, cx, cy, w, h, F); g.fill();
  g.restore();
  if (marks) { g.save(); pathFn(); g.clip(); marks(g); g.restore(); }
  pathFn(); outline(g, r, F.line);
}

// ------------------------------------------------------------------ the ten tiers
// Coordinates are in units of r, origin at the cell centre; art stays within about 0.97r.

/** 1. Curled kitten: a round blue-grey ball of fluff, tail wrapped round the front. */
function t1Kitten(g, r, f) {
  const F = fur('#e2ecfb', '#8fb0dc', '#4a6898', '#26365a');
  bodyBlob(g, r, () => ell(g, 0, r * 0.24, r * 0.84, r * 0.62), F, 0, r * 0.24, r * 0.84, r * 0.62, (gg) => {
    gg.strokeStyle = 'rgba(70,95,140,0.45)'; gg.lineWidth = r * 0.05; gg.lineCap = 'round';
    for (const a of [-2.5, -2.1, -0.95, -0.55]) { gg.beginPath(); gg.arc(0, r * 0.24, r * 0.74, a - 0.12, a + 0.12); gg.stroke(); }
  });
  tail(g, r, pose(f, [[0.72, 0.42], [0.66, 0.92], [-0.3, 0.92], [-0.66, 0.62]], [[0.72, 0.42], [0.66, 0.92], [-0.42, 0.86], [-0.74, 0.4]]),
    { w: 0.17, fur: F, tip: '#c9d8f0' });
  paw(g, r, -r * 0.3, r * 0.56, r * 0.13, F);
  paw(g, r, r * 0.06, r * 0.6, r * 0.13, F);
  ears(g, r, f, -r * 0.06, -r * 0.48, r * 0.32, r * 0.3, r * 0.34, 0.36, F);
  const hx = -r * 0.06, hy = -r * 0.12;
  head(g, r, hx, hy, r * 0.54, r * 0.44, F, (gg) => {
    gg.strokeStyle = 'rgba(70,95,140,0.5)'; gg.lineWidth = r * 0.04; gg.lineCap = 'round';
    for (const dx of [-0.1, 0, 0.1]) { gg.beginPath(); gg.moveTo(hx + dx * r, hy - r * 0.44); gg.lineTo(hx + dx * r * 0.8, hy - r * 0.3); gg.stroke(); }
  });
  shine(g, hx - r * 0.24, hy - r * 0.24, r * 0.16, r * 0.07, -0.5, 0.7);
  shine(g, -r * 0.5, r * 0.02, r * 0.16, r * 0.08, -0.7, 0.5);
  muzzle(g, hx, hy + r * 0.14, r * 0.26, 'rgba(240,246,255,0.9)');
  face(g, hx, hy + r * 0.04, r * 0.42, { iris: '#9be06a', blink: f === 1 });
}

/** 2. Stretchy tabby: a long orange downward-cat stretch, rump and tail up. */
function t2Tabby(g, r, f) {
  const F = fur('#ffe2b4', '#f6a04a', '#c0601c', '#6a2a06');
  const stripe = 'rgba(190,80,16,0.9)';
  tail(g, r, pose(f, [[0.5, -0.1], [0.8, -0.3], [0.86, -0.7], [0.62, -0.86]], [[0.5, -0.1], [0.86, -0.42], [0.62, -0.88], [0.34, -0.9]]), { w: 0.15, fur: F, stripes: stripe });
  tube(g, r, [[0.48, 0.0], [0.52, 0.22], [0.56, 0.44], [0.6, 0.66]], 0.26, F); // rear leg
  paw(g, r, r * 0.62, r * 0.74, r * 0.16, F);
  const body = tube(g, r, [[-0.28, 0.44], [-0.02, 0.3], [0.26, -0.12], [0.5, -0.08]], 0.56, F);
  // back stripes: short strokes from the spine line towards the top edge
  g.save();
  g.strokeStyle = stripe; g.lineWidth = r * 0.07; g.lineCap = 'round';
  for (const t of [0.42, 0.58, 0.74, 0.9]) {
    const i = Math.floor(t * (body.length - 1)), [x, y] = body[i], [x2, y2] = body[Math.min(body.length - 1, i + 1)];
    const dx = x2 - x, dy = y2 - y, l = Math.hypot(dx, dy) || 1, nx = dy / l, ny = -dx / l;
    g.beginPath(); g.moveTo(x - nx * r * 0.04, y - ny * r * 0.04); g.lineTo(x + nx * r * 0.24, y + ny * r * 0.24); g.stroke();
  }
  g.restore();
  shine(g, r * 0.12, -r * 0.06, r * 0.18, r * 0.06, -0.7, 0.55);
  // front legs reaching forward
  tube(g, r, [[-0.3, 0.46], [-0.5, 0.56], [-0.66, 0.62], [-0.78, 0.66]], 0.2, F);
  paw(g, r, -r * 0.66, r * 0.74, r * 0.13, F);
  paw(g, r, -r * 0.82, r * 0.7, r * 0.14, F);
  ears(g, r, f, -r * 0.38, -r * 0.26, r * 0.3, r * 0.28, r * 0.3, 0.38, F);
  const hx = -r * 0.38, hy = r * 0.06;
  head(g, r, hx, hy, r * 0.48, r * 0.38, F, (gg) => {
    gg.lineWidth = r * 0.045; gg.strokeStyle = stripe; gg.lineCap = 'round'; gg.lineJoin = 'round';
    gg.beginPath(); gg.moveTo(hx - r * 0.15, hy - r * 0.16); gg.lineTo(hx - r * 0.09, hy - r * 0.32); gg.lineTo(hx, hy - r * 0.21); gg.lineTo(hx + r * 0.09, hy - r * 0.32); gg.lineTo(hx + r * 0.15, hy - r * 0.16); gg.stroke();
    for (const sx of [-1, 1]) for (const k of [0, 1]) {
      gg.beginPath(); gg.moveTo(hx + sx * r * 0.5, hy + r * (0.0 + k * 0.1)); gg.lineTo(hx + sx * r * 0.34, hy + r * (0.03 + k * 0.09)); gg.stroke();
    }
  });
  shine(g, hx - r * 0.2, hy - r * 0.22, r * 0.14, r * 0.06, -0.4, 0.65);
  muzzle(g, hx, hy + r * 0.12, r * 0.24);
  face(g, hx, hy + r * 0.03, r * 0.36, { iris: '#8ad85a', blink: f === 1 });
}

/** 3. Calico: a tall sitting cat, cream with orange and black patches, question-mark tail. */
function t3Calico(g, r, f) {
  const F = fur('#ffffff', '#f3ead9', '#c4b29a', '#6a5038');
  const orange = '#f0973c', black = '#3b3036';
  tail(g, r, pose(f,
    [[-0.26, 0.76], [-0.74, 0.8], [-0.86, 0.3], [-0.78, -0.02], [-0.72, -0.3], [-0.5, -0.36], [-0.46, -0.2]],
    [[-0.26, 0.76], [-0.8, 0.72], [-0.94, 0.2], [-0.9, -0.12], [-0.86, -0.4], [-0.62, -0.5], [-0.56, -0.34]]),
  { w: 0.13, fur: F, tip: black });
  const body = () => {
    g.beginPath();
    g.moveTo(0, -r * 0.16);
    g.bezierCurveTo(r * 0.4, -r * 0.16, r * 0.52, r * 0.42, r * 0.5, r * 0.66);
    g.bezierCurveTo(r * 0.5, r * 0.88, r * 0.26, r * 0.9, 0, r * 0.9);
    g.bezierCurveTo(-r * 0.26, r * 0.9, -r * 0.5, r * 0.88, -r * 0.5, r * 0.66);
    g.bezierCurveTo(-r * 0.52, r * 0.42, -r * 0.4, -r * 0.16, 0, -r * 0.16);
    g.closePath();
  };
  bodyBlob(g, r, body, F, 0, r * 0.4, r * 0.5, r * 0.5, (gg) => {
    gg.fillStyle = orange; ell(gg, r * 0.42, r * 0.46, r * 0.26, r * 0.34, 0.3); gg.fill();
    gg.fillStyle = black; ell(gg, -r * 0.44, r * 0.26, r * 0.18, r * 0.24, -0.2); gg.fill();
  });
  const W = fur('#ffffff', '#f6f0e6', '#d2c4ae', F.line);
  for (const sx of [-1, 1]) {
    g.save(); // front leg: a soft shaded crease, then a round paw
    g.strokeStyle = 'rgba(150,120,90,0.5)'; g.lineWidth = Math.max(1, r * 0.03); g.lineCap = 'round';
    g.beginPath(); g.moveTo(sx * r * 0.07, r * 0.42); g.quadraticCurveTo(sx * r * 0.05, r * 0.62, sx * r * 0.06, r * 0.76); g.stroke();
    g.restore();
    paw(g, r, sx * r * 0.17, r * 0.8, r * 0.13, W);
  }
  shine(g, -r * 0.26, r * 0.14, r * 0.12, r * 0.2, 0.2, 0.45);
  ears(g, r, f, 0, -r * 0.62, r * 0.3, r * 0.28, r * 0.32, 0.36, F);
  const hy = -r * 0.38;
  head(g, r, 0, hy, r * 0.54, r * 0.4, F, (gg) => {
    gg.fillStyle = orange; ell(gg, -r * 0.38, hy - r * 0.24, r * 0.32, r * 0.26, -0.4); gg.fill();
    gg.fillStyle = black; ell(gg, r * 0.4, hy - r * 0.26, r * 0.28, r * 0.24, 0.4); gg.fill();
  });
  shine(g, -r * 0.24, hy - r * 0.2, r * 0.14, r * 0.06, -0.5, 0.7);
  muzzle(g, 0, hy + r * 0.13, r * 0.26);
  face(g, 0, hy + r * 0.04, r * 0.42, { iris: '#f4b93a', blink: f === 1 });
}

/** 4. Dapper tuxedo: black cat with white bib, red bow tie and a tipped top hat. */
function t4Tuxedo(g, r, f) {
  const F = fur('#6a6278', '#2f2a3a', '#120e18', '#000000');
  const W = fur('#ffffff', '#f2eef4', '#c4bccc', '#4a4058');
  tail(g, r, pose(f, [[0.4, 0.76], [0.9, 0.76], [0.92, 0.2], [0.74, 0.02]], [[0.4, 0.76], [0.94, 0.64], [0.8, 0.0], [0.54, -0.12]]), { w: 0.14, fur: F, tip: '#f4f0ea' });
  const body = () => { g.beginPath(); g.moveTo(-r * 0.58, r * 0.86); g.bezierCurveTo(-r * 0.62, r * 0.3, -r * 0.42, r * 0.08, 0, r * 0.08); g.bezierCurveTo(r * 0.42, r * 0.08, r * 0.62, r * 0.3, r * 0.58, r * 0.86); g.quadraticCurveTo(0, r * 0.94, -r * 0.58, r * 0.86); g.closePath(); };
  bodyBlob(g, r, body, F, 0, r * 0.45, r * 0.58, r * 0.4, (gg) => {
    gg.fillStyle = lin(gg, 0, r * 0.1, 0, r * 0.9, [[0, '#ffffff'], [1, '#e2dce6']]);
    gg.beginPath(); gg.moveTo(-r * 0.28, r * 0.12); gg.quadraticCurveTo(0, r * 0.36, r * 0.28, r * 0.12); gg.lineTo(r * 0.22, r * 0.94); gg.lineTo(-r * 0.22, r * 0.94); gg.closePath(); gg.fill();
  });
  shine(g, -r * 0.4, r * 0.4, r * 0.08, r * 0.2, 0.2, 0.35);
  paw(g, r, -r * 0.22, r * 0.82, r * 0.14, W);
  paw(g, r, r * 0.22, r * 0.82, r * 0.14, W);
  ears(g, r, f, 0, -r * 0.42, r * 0.36, r * 0.32, r * 0.32, 0.4, F, ['#ff9fbc', '#d8628a']);
  const hy = -r * 0.14;
  head(g, r, 0, hy, r * 0.58, r * 0.42, F, (gg) => {
    gg.fillStyle = '#f6f2f8';
    gg.beginPath(); gg.moveTo(-r * 0.07, hy - r * 0.42); gg.quadraticCurveTo(0, hy - r * 0.46, r * 0.07, hy - r * 0.42);
    gg.lineTo(r * 0.14, hy); gg.quadraticCurveTo(r * 0.42, hy + r * 0.1, r * 0.36, hy + r * 0.44); gg.lineTo(-r * 0.36, hy + r * 0.44); gg.quadraticCurveTo(-r * 0.42, hy + r * 0.1, -r * 0.14, hy); gg.closePath(); gg.fill();
  });
  // red bow tie at the neck
  const by = r * 0.26;
  g.save();
  g.fillStyle = lin(g, 0, by - r * 0.12, 0, by + r * 0.12, [[0, '#ff5a64'], [1, '#b0142a']]);
  for (const sx of [-1, 1]) {
    g.beginPath(); g.moveTo(0, by); g.lineTo(sx * r * 0.24, by - r * 0.12); g.quadraticCurveTo(sx * r * 0.29, by, sx * r * 0.24, by + r * 0.12); g.closePath(); g.fill(); outline(g, r, '#5a0010', 0.8);
  }
  g.fillStyle = '#d81e34'; ell(g, 0, by, r * 0.065, r * 0.07); g.fill(); outline(g, r, '#5a0010', 0.8);
  g.fillStyle = 'rgba(255,255,255,0.5)'; ell(g, -r * 0.14, by - r * 0.05, r * 0.06, r * 0.025, 0.4); g.fill();
  g.restore();
  // top hat, tipped to one side
  g.save();
  g.translate(r * 0.1, hy - r * 0.4); g.rotate(0.16);
  g.fillStyle = '#1b1720'; ell(g, 0, 0, r * 0.3, r * 0.07); g.fill(); outline(g, r, '#000');
  rrect(g, -r * 0.17, -r * 0.36, r * 0.34, r * 0.36, r * 0.035);
  g.fillStyle = lin(g, -r * 0.17, 0, r * 0.17, 0, [[0, '#4a4454'], [0.4, '#26222c'], [1, '#100d14']]); g.fill();
  outline(g, r, '#000');
  g.fillStyle = '#d81e34'; g.fillRect(-r * 0.17, -r * 0.1, r * 0.34, r * 0.07);
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(-r * 0.12, -r * 0.32, r * 0.035, r * 0.2);
  g.restore();
  shine(g, -r * 0.32, hy - r * 0.16, r * 0.13, r * 0.06, -0.5, 0.5);
  face(g, 0, hy + r * 0.08, r * 0.42, { iris: '#c9e24a', blink: f === 1, light: true });
}

/** 5. Sleepy loaf: a wide chocolate bread-loaf cat, paws tucked, dozing. */
function t5Loaf(g, r, f) {
  const F = fur('#d6a882', '#8a5a3c', '#4a2a16', '#2a1406');
  const body = () => rrect(g, -r * 0.92, -r * 0.04, r * 1.84, r * 0.86, r * 0.42);
  bodyBlob(g, r, body, F, 0, r * 0.38, r * 0.92, r * 0.43, (gg) => {
    gg.fillStyle = lin(gg, 0, -r * 0.04, 0, r * 0.3, [[0, 'rgba(60,30,10,0.55)'], [1, 'rgba(60,30,10,0)']]);
    gg.fillRect(-r * 0.92, -r * 0.04, r * 1.84, r * 0.34);
    gg.strokeStyle = 'rgba(50,24,8,0.45)'; gg.lineWidth = r * 0.05; gg.lineCap = 'round';
    for (const dx of [-0.72, -0.58, 0.58, 0.72]) { gg.beginPath(); gg.moveTo(dx * r, r * 0.0); gg.quadraticCurveTo(dx * r + r * 0.04, r * 0.14, dx * r, r * 0.26); gg.stroke(); }
    gg.fillStyle = 'rgba(255,236,214,0.5)'; ell(gg, 0, r * 0.7, r * 0.5, r * 0.18); gg.fill(); // pale chest
  });
  shine(g, -r * 0.58, r * 0.16, r * 0.2, r * 0.07, -0.25, 0.45);
  tail(g, r, pose(f, [[0.86, 0.46], [0.8, 0.84], [0.1, 0.84], [-0.24, 0.74]], [[0.86, 0.46], [0.8, 0.84], [0.06, 0.78], [-0.2, 0.56]]), { w: 0.13, fur: F, tip: '#c89a72' });
  const P = fur('#fff2e2', '#f0d8bc', '#c8a684', '#6a4a30');
  paw(g, r, -r * 0.5, r * 0.76, r * 0.13, P);
  paw(g, r, -r * 0.24, r * 0.78, r * 0.13, P);
  ears(g, r, f, 0, -r * 0.36, r * 0.32, r * 0.26, r * 0.26, 0.5, F, ['#e8a0a8', '#c07078']);
  const hy = -r * 0.04;
  head(g, r, 0, hy, r * 0.5, r * 0.38, F, (gg) => {
    gg.fillStyle = 'rgba(255,236,214,0.6)'; ell(gg, 0, hy + r * 0.24, r * 0.3, r * 0.18); gg.fill();
  });
  shine(g, -r * 0.24, hy - r * 0.2, r * 0.14, r * 0.06, -0.5, 0.6);
  muzzle(g, 0, hy + r * 0.13, r * 0.24, 'rgba(255,240,224,0.9)');
  face(g, 0, hy + r * 0.04, r * 0.4, { blink: f === 1, sleepy: true, iris: '#8fd88a', light: true });
  // Zz
  g.save();
  g.fillStyle = '#ffffff'; g.strokeStyle = '#2a3e5a'; g.lineWidth = Math.max(1, r * 0.035); g.lineJoin = 'round';
  g.font = `800 ${Math.round(r * 0.28)}px Fredoka, "Baloo 2", system-ui, sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.strokeText('z', r * 0.6, -r * 0.44); g.fillText('z', r * 0.6, -r * 0.44);
  g.font = `800 ${Math.round(r * 0.2)}px Fredoka, "Baloo 2", system-ui, sans-serif`;
  g.strokeText('z', r * 0.8, -r * 0.68); g.fillText('z', r * 0.8, -r * 0.68);
  g.restore();
}

/** 6. Teacup kitten: a lilac kitten peeking out of a big pink polka-dot teacup. */
function t6Teacup(g, r, f) {
  const F = fur('#f6f2fc', '#cfc4e2', '#8f80aa', '#4a3c66');
  g.save(); // saucer
  g.fillStyle = lin(g, 0, r * 0.64, 0, r * 0.94, [[0, '#ffffff'], [1, '#e2c8d6']]);
  ell(g, 0, r * 0.8, r * 0.96, r * 0.16); g.fill(); outline(g, r, '#7a3a5a');
  g.strokeStyle = '#f6c444'; g.lineWidth = Math.max(1, r * 0.03);
  g.beginPath(); g.ellipse(0, r * 0.8, r * 0.82, r * 0.11, 0, 0.05 * Math.PI, 0.95 * Math.PI); g.stroke();
  g.restore();
  tail(g, r, pose(f, [[-0.5, 0.12], [-0.84, 0.08], [-0.92, 0.36], [-0.82, 0.52]], [[-0.5, 0.12], [-0.88, -0.04], [-0.98, 0.18], [-0.94, 0.36]]), { w: 0.12, fur: F, stripes: 'rgba(130,115,150,0.8)' });
  const cupTop = r * 0.1, rimW = r * 0.76;
  g.fillStyle = '#7a4a2a'; ell(g, 0, cupTop, rimW, r * 0.12); g.fill();
  ears(g, r, f, 0, -r * 0.52, r * 0.3, r * 0.28, r * 0.3, 0.38, F);
  const hy = -r * 0.24;
  head(g, r, 0, hy, r * 0.52, r * 0.4, F, (gg) => {
    gg.fillStyle = 'rgba(140,120,170,0.55)';
    ell(gg, -r * 0.38, hy - r * 0.24, r * 0.22, r * 0.2, -0.4); gg.fill();
    ell(gg, r * 0.4, hy - r * 0.22, r * 0.2, r * 0.18, 0.4); gg.fill();
  });
  g.save(); // handle
  g.lineWidth = r * 0.09; g.strokeStyle = '#ff8fb8';
  g.beginPath(); g.ellipse(rimW + r * 0.02, r * 0.36, r * 0.15, r * 0.17, 0, -0.55 * Math.PI, 0.6 * Math.PI); g.stroke();
  g.lineWidth = r * 0.025; g.strokeStyle = '#ffd2e4';
  g.beginPath(); g.ellipse(rimW + r * 0.02, r * 0.36, r * 0.15, r * 0.17, 0, -0.4 * Math.PI, 0.1 * Math.PI); g.stroke();
  g.restore();
  const cup = () => {
    g.beginPath();
    g.moveTo(-rimW, cupTop);
    g.bezierCurveTo(-rimW, r * 0.48, -r * 0.46, r * 0.76, 0, r * 0.76);
    g.bezierCurveTo(r * 0.46, r * 0.76, rimW, r * 0.48, rimW, cupTop);
    g.ellipse(0, cupTop, rimW, r * 0.12, 0, 0, Math.PI, false);
    g.closePath();
  };
  g.save();
  g.shadowColor = 'rgba(60,10,40,0.35)'; g.shadowBlur = r * 0.08; g.shadowOffsetY = r * 0.03;
  cup(); g.fillStyle = lin(g, -rimW, 0, rimW, 0, [[0, '#e86a9e'], [0.3, '#ffb2d0'], [0.65, '#ff8fb8'], [1, '#c24a7c']]); g.fill();
  g.restore();
  g.save(); cup(); g.clip();
  g.fillStyle = 'rgba(255,255,255,0.9)';
  for (const [x, y, s] of [[-0.5, 0.3, 0.05], [-0.2, 0.46, 0.06], [0.14, 0.32, 0.05], [0.44, 0.48, 0.05], [-0.36, 0.62, 0.04], [0.26, 0.64, 0.045], [0.56, 0.24, 0.04]]) { g.beginPath(); g.arc(x * r, y * r, s * r, 0, TAU); g.fill(); }
  g.fillStyle = '#f6c444'; g.fillRect(-rimW, cupTop + r * 0.1, rimW * 2, r * 0.035);
  heart(g, -r * 0.02, r * 0.28, r * 0.07, '#ffffff');
  g.restore();
  cup(); outline(g, r, '#7a2a50');
  g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = Math.max(1, r * 0.04); g.lineCap = 'round';
  g.beginPath(); g.moveTo(-rimW * 0.84, r * 0.26); g.quadraticCurveTo(-rimW * 0.76, r * 0.48, -rimW * 0.48, r * 0.62); g.stroke();
  paw(g, r, -r * 0.26, cupTop + r * 0.04, r * 0.12, F);
  paw(g, r, r * 0.26, cupTop + r * 0.04, r * 0.12, F);
  shine(g, -r * 0.24, hy - r * 0.2, r * 0.14, r * 0.06, -0.5, 0.7);
  muzzle(g, 0, hy + r * 0.13, r * 0.26);
  face(g, 0, hy + r * 0.04, r * 0.4, { iris: '#b48cff', blink: f === 1 });
}

/** 7. Siamese gift: a cream Siamese with dark points popping out of a teal gift box with a gold ribbon. */
function t7Gift(g, r, f) {
  const F = fur('#fffaf0', '#f0e2c8', '#c9ad86', '#5a3e22');
  const D = fur('#8a6450', '#5a3a2c', '#2e1c14', '#1a0e08');
  tail(g, r, pose(f, [[0.5, 0.1], [0.86, 0.02], [0.92, -0.36], [0.74, -0.52]], [[0.5, 0.1], [0.92, -0.08], [0.76, -0.5], [0.5, -0.62]]), { w: 0.12, fur: D });
  const top = r * 0.08, bw = r * 0.78;
  g.fillStyle = '#0c4a46'; g.fillRect(-bw + r * 0.04, top - r * 0.04, bw * 2 - r * 0.08, r * 0.08);
  ears(g, r, f, 0, -r * 0.54, r * 0.3, r * 0.28, r * 0.3, 0.36, D, ['#c48a8a', '#8a5050']);
  const hy = -r * 0.26;
  head(g, r, 0, hy, r * 0.52, r * 0.4, F, (gg) => {
    gg.fillStyle = rad(gg, 0, hy + r * 0.2, 0, 0, hy + r * 0.14, r * 0.4, [[0, 'rgba(90,58,44,0.9)'], [0.6, 'rgba(90,58,44,0.45)'], [1, 'rgba(90,58,44,0)']]);
    gg.fillRect(-r * 0.6, hy - r * 0.5, r * 1.2, r);
  });
  const front = () => rrect(g, -bw, top, bw * 2, r * 0.82, r * 0.08);
  g.save();
  g.shadowColor = 'rgba(0,30,30,0.4)'; g.shadowBlur = r * 0.08; g.shadowOffsetY = r * 0.03;
  front(); g.fillStyle = lin(g, 0, top, 0, top + r * 0.82, [[0, '#7ae6dc'], [0.45, '#3fbdb5'], [1, '#17736c']]); g.fill();
  g.restore();
  g.save(); front(); g.clip();
  g.fillStyle = 'rgba(255,255,255,0.18)';
  for (let i = -3; i <= 3; i++) { g.beginPath(); g.arc(i * r * 0.26, top + r * 0.5 + (i % 2) * r * 0.16, r * 0.04, 0, TAU); g.fill(); }
  g.fillStyle = lin(g, -r * 0.1, 0, r * 0.1, 0, [[0, '#e0a020'], [0.5, '#ffe080'], [1, '#c08010']]);
  g.fillRect(-r * 0.1, top, r * 0.2, r * 0.82);
  g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(-bw, top, bw * 2, Math.max(1, r * 0.03));
  g.restore();
  front(); outline(g, r, '#0a3836');
  g.save(); // bow on the front corner
  g.translate(-r * 0.5, top + r * 0.1);
  g.fillStyle = lin(g, 0, -r * 0.14, 0, r * 0.14, [[0, '#ffe080'], [1, '#c08010']]);
  for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(sx * r * 0.2, -r * 0.22, sx * r * 0.3, r * 0.02, 0, 0); g.fill(); outline(g, r, '#6a4200', 0.8); }
  g.beginPath(); g.arc(0, 0, r * 0.05, 0, TAU); g.fill(); outline(g, r, '#6a4200', 0.8);
  g.restore();
  paw(g, r, -r * 0.2, top + r * 0.02, r * 0.12, D);
  paw(g, r, r * 0.24, top + r * 0.02, r * 0.12, D);
  shine(g, -r * 0.24, hy - r * 0.2, r * 0.14, r * 0.06, -0.5, 0.7);
  face(g, 0, hy + r * 0.05, r * 0.4, { iris: '#4aa8ff', blink: f === 1, light: true, nose: '#8a5050' });
}

/** 8. Lucky chonk: a round red lacquer beckoning cat with a gold koban, collar and bell. */
function t8Chonk(g, r, f) {
  const F = fur('#ff9a9a', '#d8323f', '#7a0a18', '#3a040c');
  const gold = '#ffd040';
  tail(g, r, pose(f, [[0.5, 0.6], [0.92, 0.62], [0.94, 0.24], [0.8, 0.12]], [[0.5, 0.6], [0.96, 0.5], [0.86, 0.06], [0.62, 0.0]]), { w: 0.14, fur: F, tip: '#ffffff' });
  bodyBlob(g, r, () => ell(g, 0, r * 0.38, r * 0.8, r * 0.54), F, 0, r * 0.38, r * 0.8, r * 0.54, (gg) => {
    gg.fillStyle = 'rgba(255,255,255,0.92)'; ell(gg, 0, r * 0.52, r * 0.42, r * 0.34); gg.fill(); // belly
    gg.strokeStyle = 'rgba(255,208,64,0.85)'; gg.lineWidth = r * 0.035; gg.lineCap = 'round';
    for (const sx of [-1, 1]) { // gold swirls on the flanks
      gg.beginPath(); gg.arc(sx * r * 0.6, r * 0.42, r * 0.1, 0, TAU * 0.75); gg.stroke();
      gg.beginPath(); gg.arc(sx * r * 0.6, r * 0.42, r * 0.04, 0, TAU * 0.75); gg.stroke();
    }
  });
  g.save(); // raised beckoning paw
  g.translate(-r * 0.62, -r * 0.06); g.rotate(-0.2);
  rrect(g, -r * 0.14, -r * 0.46, r * 0.28, r * 0.56, r * 0.14);
  g.fillStyle = lin(g, -r * 0.14, 0, r * 0.14, 0, [[0, '#ffffff'], [1, '#e8d8d8']]); g.fill(); outline(g, r, F.line);
  g.fillStyle = '#ffa8bf'; ell(g, 0, -r * 0.26, r * 0.075, r * 0.06); g.fill();
  for (const dx of [-0.075, 0, 0.075]) { g.beginPath(); g.arc(dx * r, -r * 0.36, r * 0.028, 0, TAU); g.fill(); }
  g.restore();
  ears(g, r, f, 0, -r * 0.52, r * 0.36, r * 0.26, r * 0.26, 0.5, F, ['#ffd040', '#e0a020']);
  const hy = -r * 0.24;
  head(g, r, 0, hy, r * 0.58, r * 0.4, F, (gg) => {
    gg.fillStyle = 'rgba(255,255,255,0.95)';
    gg.beginPath(); gg.moveTo(0, hy - r * 0.2); gg.bezierCurveTo(r * 0.3, hy - r * 0.2, r * 0.48, hy + r * 0.1, r * 0.42, hy + r * 0.42); gg.lineTo(-r * 0.42, hy + r * 0.42); gg.bezierCurveTo(-r * 0.48, hy + r * 0.1, -r * 0.3, hy - r * 0.2, 0, hy - r * 0.2); gg.fill();
    gg.fillStyle = gold; // forehead mark
    gg.beginPath(); gg.arc(0, hy - r * 0.3, r * 0.05, 0, TAU); gg.fill();
  });
  g.save(); // gold collar + bell
  g.fillStyle = lin(g, 0, r * 0.12, 0, r * 0.22, [[0, '#ffe680'], [1, '#c08010']]);
  g.beginPath(); g.ellipse(0, r * 0.12, r * 0.42, r * 0.08, 0, 0, Math.PI); g.ellipse(0, r * 0.16, r * 0.42, r * 0.055, 0, Math.PI, 0, true); g.closePath(); g.fill();
  outline(g, r, '#6a4200', 0.7);
  g.restore();
  g.fillStyle = rad(g, -r * 0.03, r * 0.22, 0, 0, r * 0.26, r * 0.09, [[0, '#fff7c2'], [0.5, gold], [1, '#b07a08']]);
  g.beginPath(); g.arc(0, r * 0.26, r * 0.085, 0, TAU); g.fill(); outline(g, r, '#6a4200', 0.7);
  g.save(); // gold koban held at the belly
  g.translate(r * 0.2, r * 0.56); g.rotate(0.18);
  g.fillStyle = rad(g, -r * 0.05, -r * 0.07, 0, 0, 0, r * 0.24, [[0, '#fff6c8'], [0.45, gold], [1, '#c08a10']]);
  ell(g, 0, 0, r * 0.16, r * 0.23); g.fill();
  outline(g, r, '#6a4200', 0.9);
  g.strokeStyle = 'rgba(150,95,0,0.7)'; g.lineWidth = Math.max(1, r * 0.016);
  for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(-r * 0.09, i * r * 0.06); g.lineTo(r * 0.09, i * r * 0.06); g.stroke(); }
  g.restore();
  paw(g, r, r * 0.02, r * 0.66, r * 0.12, fur('#ffffff', '#f6eeee', '#d0c0c0', '#3a040c'));
  shine(g, -r * 0.3, hy - r * 0.2, r * 0.16, r * 0.06, -0.5, 0.75);
  shine(g, -r * 0.5, r * 0.22, r * 0.16, r * 0.07, -0.8, 0.5);
  muzzle(g, 0, hy + r * 0.14, r * 0.26);
  face(g, 0, hy + r * 0.05, r * 0.42, { iris: '#ffc23a', blink: f === 1 });
  sparkle(g, r * 0.5, r * 0.54, r * 0.08, 'rgba(255,250,210,0.95)');
}

/** 9. Persian queen: a fluffy lilac Persian with a tiara and pearls on a violet velvet cushion. */
function t9Persian(g, r, f) {
  const F = fur('#f6f0ff', '#a685e8', '#5e3eaa', '#2a1458');
  const cy = r * 0.66;
  const cushion = () => { g.beginPath(); g.moveTo(-r * 0.9, cy - r * 0.12); g.quadraticCurveTo(0, cy - r * 0.24, r * 0.9, cy - r * 0.12); g.quadraticCurveTo(r * 0.98, cy + r * 0.04, r * 0.9, cy + r * 0.2); g.quadraticCurveTo(0, cy + r * 0.32, -r * 0.9, cy + r * 0.2); g.quadraticCurveTo(-r * 0.98, cy + r * 0.04, -r * 0.9, cy - r * 0.12); g.closePath(); };
  g.save();
  g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = r * 0.08; g.shadowOffsetY = r * 0.04;
  cushion(); g.fillStyle = lin(g, 0, cy - r * 0.24, 0, cy + r * 0.32, [[0, '#9a6af0'], [0.5, '#5a2fb0'], [1, '#2a1260']]); g.fill();
  g.restore();
  cushion(); outline(g, r, '#1a0840');
  g.strokeStyle = 'rgba(255,215,106,0.9)'; g.lineWidth = Math.max(1, r * 0.028);
  g.beginPath(); g.moveTo(-r * 0.84, cy + r * 0.14); g.quadraticCurveTo(0, cy + r * 0.26, r * 0.84, cy + r * 0.14); g.stroke();
  for (const sx of [-1, 1]) {
    g.fillStyle = '#ffd56a';
    g.beginPath(); g.moveTo(sx * r * 0.88, cy - r * 0.08); g.lineTo(sx * r * 0.98, cy + r * 0.12); g.lineTo(sx * r * 0.86, cy + r * 0.14); g.closePath(); g.fill();
    g.beginPath(); g.arc(sx * r * 0.88, cy - r * 0.08, r * 0.04, 0, TAU); g.fill();
  }
  tail(g, r, pose(f, [[0.34, 0.44], [0.7, 0.46], [0.84, 0.36], [0.82, 0.16]], [[0.34, 0.44], [0.74, 0.38], [0.8, 0.12], [0.68, -0.02]]), { w: 0.18, fur: F, fluffy: true });
  g.save();
  g.shadowColor = 'rgba(30,10,50,0.3)'; g.shadowBlur = r * 0.08; g.shadowOffsetY = r * 0.03;
  fluffPath(g, 0, r * 0.36, r * 0.56, r * 0.3, 10, 0.08);
  g.fillStyle = furFill(g, 0, r * 0.36, r * 0.56, r * 0.3, F); g.fill();
  g.restore();
  fluffPath(g, 0, r * 0.36, r * 0.56, r * 0.3, 10, 0.08); outline(g, r, F.line);
  paw(g, r, -r * 0.2, r * 0.56, r * 0.12, F);
  paw(g, r, r * 0.2, r * 0.56, r * 0.12, F);
  ears(g, r, f, 0, -r * 0.5, r * 0.34, r * 0.24, r * 0.2, 0.62, F, ['#ffc2d4', '#ff9ebc'], true);
  const hy = -r * 0.16;
  fluffPath(g, 0, hy + r * 0.02, r * 0.62, r * 0.48, 12, 0.1, 0.2);
  g.fillStyle = furFill(g, 0, hy, r * 0.62, r * 0.48, F); g.fill();
  outline(g, r, F.line);
  head(g, r, 0, hy, r * 0.48, r * 0.37, fur('#fbf8ff', '#d2c0f4', '#9a80d0', '#2a1458'), null);
  g.save(); // tiara
  g.translate(0, hy - r * 0.38);
  g.beginPath();
  g.moveTo(-r * 0.2, r * 0.04); g.lineTo(-r * 0.12, -r * 0.06); g.lineTo(-r * 0.06, r * 0.0); g.lineTo(0, -r * 0.13); g.lineTo(r * 0.06, r * 0.0); g.lineTo(r * 0.12, -r * 0.06); g.lineTo(r * 0.2, r * 0.04); g.closePath();
  g.fillStyle = lin(g, 0, -r * 0.13, 0, r * 0.04, [[0, '#ffffff'], [1, '#c8c0e0']]); g.fill(); outline(g, r, '#4a3a7a', 0.7);
  g.fillStyle = '#ff6fa8'; g.beginPath(); g.arc(0, -r * 0.03, r * 0.03, 0, TAU); g.fill();
  g.restore();
  for (let i = -4; i <= 4; i++) {
    const a = Math.PI / 2 + i * 0.2, x = Math.cos(a) * r * 0.36, y = hy + r * 0.3 + Math.sin(a) * r * 0.12;
    g.fillStyle = rad(g, x - r * 0.01, y - r * 0.01, 0, x, y, r * 0.04, [[0, '#ffffff'], [0.6, '#f2ecf8'], [1, '#b9aed0']]);
    g.beginPath(); g.arc(x, y, r * 0.038, 0, TAU); g.fill();
  }
  shine(g, -r * 0.22, hy - r * 0.18, r * 0.14, r * 0.06, -0.5, 0.75);
  muzzle(g, 0, hy + r * 0.13, r * 0.24);
  face(g, 0, hy + r * 0.05, r * 0.38, { iris: '#ff9a3c', blink: f === 1 });
  sparkle(g, -r * 0.68, -r * 0.56, r * 0.1, 'rgba(255,240,200,0.95)');
}

/** 10. Lion king: a golden lion face in a full mane, wearing a jewelled crown. */
function t10Lion(g, r, f, rnd) {
  const F = fur('#fff2c6', '#f2bd3c', '#b47a10', '#4e2c02');
  const M = fur('#ffd870', '#e8962a', '#8a4a08', '#3e1e00');
  tail(g, r, pose(f, [[0.5, 0.6], [0.9, 0.66], [0.94, 0.3], [0.84, 0.14]], [[0.5, 0.6], [0.96, 0.56], [0.9, 0.1], [0.7, 0.02]]), { w: 0.08, fur: F, tip: '#8a3a12', tipW: 2.2 });
  ell(g, 0, r * 0.62, r * 0.42, r * 0.26);
  g.fillStyle = furFill(g, 0, r * 0.62, r * 0.42, r * 0.26, F); g.fill(); outline(g, r, F.line);
  const my = -r * 0.04;
  g.save();
  g.shadowColor = 'rgba(80,30,0,0.4)'; g.shadowBlur = r * 0.1; g.shadowOffsetY = r * 0.04;
  fluffPath(g, 0, my, r * 0.78, r * 0.72, 12, 0.13);
  g.fillStyle = rad(g, -r * 0.25, my - r * 0.3, r * 0.05, 0, my, r * 0.9, [[0, M.li], [0.55, M.base], [1, M.dk]]); g.fill();
  g.restore();
  fluffPath(g, 0, my, r * 0.78, r * 0.72, 12, 0.13); outline(g, r, M.line);
  g.save();
  g.strokeStyle = 'rgba(255,220,120,0.55)'; g.lineWidth = Math.max(1, r * 0.025); g.lineCap = 'round';
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * TAU + rnd() * 0.1;
    g.beginPath(); g.moveTo(Math.cos(a) * r * 0.54, my + Math.sin(a) * r * 0.5); g.lineTo(Math.cos(a) * r * 0.76, my + Math.sin(a) * r * 0.7); g.stroke();
  }
  g.restore();
  paw(g, r, -r * 0.22, r * 0.78, r * 0.14, F);
  paw(g, r, r * 0.22, r * 0.78, r * 0.14, F);
  ears(g, r, f, 0, my - r * 0.3, r * 0.36, r * 0.2, r * 0.17, 0.55, F, ['#ffcf9a', '#d8894a']);
  const hy = my + r * 0.06;
  head(g, r, 0, hy, r * 0.48, r * 0.4, F, null);
  muzzle(g, 0, hy + r * 0.16, r * 0.3, 'rgba(255,248,226,0.95)');
  shine(g, -r * 0.22, hy - r * 0.2, r * 0.15, r * 0.06, -0.5, 0.75);
  face(g, 0, hy + r * 0.06, r * 0.42, { iris: '#ffb02a', blink: f === 1, nose: '#c0605a' });
  g.save(); // crown
  g.translate(0, my - r * 0.66);
  g.beginPath();
  g.moveTo(-r * 0.26, r * 0.12); g.lineTo(-r * 0.29, -r * 0.12); g.lineTo(-r * 0.14, r * 0.0); g.lineTo(0, -r * 0.2); g.lineTo(r * 0.14, r * 0.0); g.lineTo(r * 0.29, -r * 0.12); g.lineTo(r * 0.26, r * 0.12); g.closePath();
  g.fillStyle = lin(g, 0, -r * 0.2, 0, r * 0.12, [[0, '#fff6c8'], [0.4, '#ffd040'], [1, '#c08a10']]); g.fill();
  outline(g, r, '#5a3400', 1);
  for (const [x, y, c] of [[-0.29, -0.12, '#ff4a6a'], [0, -0.2, '#4ad0ff'], [0.29, -0.12, '#ff4a6a']]) { g.fillStyle = c; g.beginPath(); g.arc(x * r, y * r, r * 0.042, 0, TAU); g.fill(); }
  g.fillStyle = '#7a4ae0'; g.beginPath(); g.arc(0, r * 0.05, r * 0.042, 0, TAU); g.fill();
  g.restore();
  sparkle(g, -r * 0.76, -r * 0.62, r * 0.12, 'rgba(255,250,220,0.95)');
  sparkle(g, r * 0.8, -r * 0.5, r * 0.08, 'rgba(255,250,220,0.9)');
}

const TIERS = [null, t1Kitten, t2Tabby, t3Calico, t4Tuxedo, t5Loaf, t6Teacup, t7Gift, t8Chonk, t9Persian, t10Lion];

// ------------------------------------------------------------------ compositor

function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') {
    try { return new OffscreenCanvas(w, h); } catch (_) { /* fall through */ }
  }
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

/** A copy of `src` filled flat with `col` (source-in), optionally minus `src` shifted by (dx, dy) device px. */
function tinted(src, size, col, dx = 0, dy = 0) {
  const c = makeCanvas(size, size), x = c.getContext('2d');
  x.drawImage(src, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = col; x.fillRect(0, 0, size, size);
  if (dx || dy) { x.globalCompositeOperation = 'destination-out'; x.drawImage(src, dx, dy); }
  return c;
}

/**
 * Paint one Cat Café piece centred at the origin, radius r (CSS px). frame: see the file header.
 * The cat is painted into an offscreen layer first so the outline, rim light and inner shade follow its exact
 * silhouette. dpr: device pixel ratio of the target (the sprite cache passes it).
 */
export function drawCat(g, r, tier, frame = 0, dpr = 1) {
  tier = Math.max(1, Math.min(10, tier | 0));
  const rnd = mulberry32((0xca7caf + tier * 7919) >>> 0);
  const size = Math.ceil(r * 2 * 1.3 * dpr), half = size / 2 / dpr;
  const art = makeCanvas(size, size), a = art.getContext('2d');
  a.translate(size / 2, size / 2); a.scale(dpr, dpr);
  a.lineCap = 'round';
  TIERS[tier](a, r, frame | 0, rnd);
  const ow = Math.max(1.2, r * 0.06), od = ow * dpr;
  const sil = tinted(art, size, INKS[tier]);
  const rim = tinted(art, size, '#ffffff', od * 0.75, od * 0.9);
  const shade = tinted(art, size, INKS[tier], -od * 0.9, -od * 1.1);

  contact(g, 0, r * 0.9, r * 0.82, r * 0.13);
  if (tier === 10) { // royal glow behind the lion (not outlined)
    g.save();
    g.fillStyle = rad(g, 0, -r * 0.05, r * 0.2, 0, -r * 0.05, r * 1.05, [[0, 'rgba(255,230,140,0.55)'], [1, 'rgba(255,230,140,0)']]);
    g.beginPath(); g.arc(0, -r * 0.05, r * 1.05, 0, TAU); g.fill();
    g.restore();
  }
  for (let i = 0; i < 16; i++) {
    const t = (i / 16) * TAU;
    g.drawImage(sil, -half + Math.cos(t) * ow, -half + Math.sin(t) * ow, half * 2, half * 2);
  }
  g.drawImage(art, -half, -half, half * 2, half * 2);
  g.save();
  g.globalAlpha = 0.28;
  g.drawImage(shade, -half, -half, half * 2, half * 2);
  g.globalAlpha = tier === 4 ? 0.85 : 0.6;
  g.drawImage(rim, -half, -half, half * 2, half * 2);
  g.restore();
}

/**
 * Idle animation for a Cat Café piece at clock t (seconds, per-orb offset already applied).
 * frame: 0 rest, 1 blink, 2 ear twitch, 3/4 tail flick (half, full). Plus a gentle breathe (±2.2%).
 * Each cycle has its own period per tier, so a board of cats never moves in lockstep.
 */
export function catIdle(t, tier) {
  const cyc = (off, per) => { const p = (t + off) % per; return p < 0 ? p + per : p; };
  const blink = cyc(0, 3.7 + (tier % 4) * 0.4) < 0.14;
  const earT = cyc(1.9 + tier * 0.37, 6.3 + (tier % 3) * 0.7) < 0.22;
  const tp = cyc(3.1 + tier * 0.61, 5.1 + (tier % 5) * 0.5);
  const tailF = tp < 0.42 ? (tp < 0.1 || tp >= 0.32 ? 3 : 4) : 0;
  const frame = blink ? 1 : earT ? 2 : tailF;
  const w = Math.sin(t * (1.9 + tier * 0.05));
  return { frame, sx: 1 + 0.022 * w, sy: 1 - 0.022 * w };
}
