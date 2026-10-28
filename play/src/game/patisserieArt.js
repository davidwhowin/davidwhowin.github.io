// Patisserie orb skin (premium themed pack, DESIGN.md "Premium themed packs"). Procedural Canvas only.
//
// Freeform pieces: no disc or ring. Each tier IS the pastry, a free-standing shaped object that fills its cell,
// like a candy in a match-3: a chunky sprinkle, pistachio macaron, pink-glazed cream puff, chocolate éclair,
// lavender cupcake, strawberry tart, butter croissant, mille-feuille slice, teal drip layer cake and a gold-trimmed
// wedding cake. Tiers read by silhouette AND by one dominant colour (PASTRY_COLORS). Every piece gets the same
// finish as the other packs: a crisp dark outline around the whole silhouette, a thin light rim on the top-left
// edge, a soft inner shade bottom-right, glossy highlights and a contact shadow. The art stays inside the cell
// footprint (about 1r), so hit areas and physics are unchanged.
//
// Painted ONCE per tier/size/frame into the orb sprite cache (orbArt.js). Five frames per tier:
//   0 rest, 1 blink, 2 sparkle (first glint), 3 sparkle (second glint), 4 cream wobble.
// The idle bob is a transform in drawOrb, so animation never repaints; Calm / reduced motion freezes it.
// Texture detail comes from a seeded mulberry32 stream per tier, so every sprite of a tier is identical.
import { mulberry32 } from './rng.js';

const TAU = Math.PI * 2;

/** Dominant colour per tier (index 1..10). Ten distinct hues: the colour carries the tier. */
export const PASTRY_COLORS = [null, '#5ec8ef', '#a6d86a', '#ff8fbf', '#7a4128', '#b48cf0', '#e8344a', '#e0862a', '#fbf1e0', '#40bfb4', '#f2c43c'];
/** Silhouette outline ink per tier: a deep shade of the dominant colour. */
const INKS = [null, '#123a52', '#2a4410', '#5a1436', '#2a1006', '#33175e', '#4a0610', '#4a2204', '#4a3218', '#0a3a36', '#4e3202'];

/** Main colour of a tier (particles, guides). */
export const pastryColor = (tier) => PASTRY_COLORS[Math.max(1, Math.min(10, tier | 0))];

/** Display names of the ten tiers (shop preview, merge popups). */
export const PASTRY_NAMES = [null, 'Sprinkle', 'Macaron', 'Cream puff', 'Éclair', 'Cupcake', 'Berry tart', 'Croissant', 'Mille-feuille', 'Layer cake', 'Wedding cake'];

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
  g.fillStyle = rad(g, x, y, 0, x, y, rx, [[0, `rgba(10,4,8,${a})`], [0.6, `rgba(10,4,8,${a * 0.5})`], [1, 'rgba(10,4,8,0)']]);
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

/** Four-point star glint. */
function sparkle(g, x, y, s, col) {
  g.fillStyle = col;
  g.beginPath();
  g.moveTo(x, y - s); g.quadraticCurveTo(x, y, x + s, y); g.quadraticCurveTo(x, y, x, y + s); g.quadraticCurveTo(x, y, x - s, y); g.quadraticCurveTo(x, y, x, y - s);
  g.fill();
}

function heart(g, x, y, s) {
  g.beginPath(); g.moveTo(x, y + s * 0.9);
  g.bezierCurveTo(x - s * 1.4, y - s * 0.2, x - s * 0.6, y - s * 1.2, x, y - s * 0.4);
  g.bezierCurveTo(x + s * 0.6, y - s * 1.2, x + s * 1.4, y - s * 0.2, x, y + s * 0.9);
  g.closePath();
}

/** A soft glossy fill lit from the top left. P = { li, base, dk }. */
function gloss(g, x, y, w, h, P) {
  return rad(g, x - w * 0.35, y - h * 0.45, Math.min(w, h) * 0.05, x, y, Math.max(w, h) * 1.1, [[0, P.li], [0.55, P.base], [1, P.dk]]);
}
const pal = (li, base, dk, line) => ({ li, base, dk, line });

/** Inner detail line (the bold silhouette outline is added by the compositor). */
function edge(g, r, col, k = 1) {
  g.strokeStyle = col; g.lineWidth = Math.max(1, r * 0.024 * k); g.lineJoin = 'round'; g.lineCap = 'round';
  g.stroke();
}

const PASTRY = pal('#ffe7b0', '#eaa652', '#a65c1e', '#6a3610'); // baked dough
const CREAM = pal('#ffffff', '#fff6e4', '#e8d4b4', '#b89a74'); // whipped cream / fondant

/**
 * Kawaii face centred at (x, y); s = size unit (about the eye spacing).
 * o: { blink, iris, mouth: 'smile' | 'open' | 'cat' | 'o', blush, dark (a light mouth line on dark glaze) }
 */
function face(g, x, y, s, o = {}) {
  const ink = '#2c1418';
  const ex = s * 0.5, er = s * 0.2;
  g.save();
  g.translate(x, y);
  if (o.blush !== false) {
    g.fillStyle = 'rgba(255,100,140,0.5)';
    ell(g, -s * 0.84, s * 0.28, s * 0.2, s * 0.12); g.fill();
    ell(g, s * 0.84, s * 0.28, s * 0.2, s * 0.12); g.fill();
  }
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (const sx of [-1, 1]) {
    if (o.blink) {
      g.strokeStyle = ink; g.lineWidth = Math.max(1, s * 0.1);
      g.beginPath(); g.arc(sx * ex, er * 0.6, er * 0.95, 1.18 * Math.PI, 1.82 * Math.PI); g.stroke(); // happy ^
    } else {
      g.save();
      ell(g, sx * ex, 0, er * 0.92, er * 1.14);
      g.fillStyle = ink; g.fill();
      g.clip();
      g.fillStyle = rad(g, sx * ex, er * 0.95, 0, sx * ex, er * 0.95, er * 1.25, [[0, o.iris || '#c07a4a'], [0.7, o.iris || '#c07a4a'], [1, 'rgba(0,0,0,0)']]);
      g.globalAlpha = 0.85;
      g.fillRect(sx * ex - er, -er * 1.2, er * 2, er * 2.4);
      g.restore();
      g.fillStyle = '#ffffff';
      g.beginPath(); g.arc(sx * ex - er * 0.28, -er * 0.42, er * 0.42, 0, TAU); g.fill();
      g.globalAlpha = 0.85;
      g.beginPath(); g.arc(sx * ex + er * 0.32, er * 0.4, er * 0.17, 0, TAU); g.fill();
      g.globalAlpha = 1;
    }
  }
  const my = s * 0.2, m = o.mouth || 'smile';
  g.strokeStyle = ink; g.fillStyle = ink; g.lineWidth = Math.max(1, s * 0.075);
  if (m === 'open') {
    g.beginPath(); g.moveTo(-s * 0.15, my); g.quadraticCurveTo(0, my + s * 0.36, s * 0.15, my); g.closePath(); g.fill();
    g.save(); g.clip();
    g.fillStyle = '#ff7f96'; ell(g, 0, my + s * 0.2, s * 0.11, s * 0.08); g.fill();
    g.restore();
  } else if (m === 'cat') {
    g.beginPath();
    g.arc(-s * 0.1, my + s * 0.02, s * 0.1, 0, 0.9 * Math.PI);
    g.moveTo(s * 0.2, my + s * 0.02);
    g.arc(s * 0.1, my + s * 0.02, s * 0.1, 0, Math.PI, false);
    g.stroke();
  } else if (m === 'o') {
    ell(g, 0, my + s * 0.08, s * 0.07, s * 0.09); g.fill();
  } else {
    g.beginPath(); g.arc(0, my - s * 0.04, s * 0.13, 0.18 * Math.PI, 0.82 * Math.PI); g.stroke();
  }
  g.restore();
}

/** Glossy round berry/cherry. */
function cherry(g, r, x, y, s, col = '#e8243c', stem = true) {
  if (stem) {
    g.strokeStyle = '#5a7a22'; g.lineWidth = Math.max(1, r * 0.03); g.lineCap = 'round';
    g.beginPath(); g.moveTo(x, y - s * 0.7); g.quadraticCurveTo(x + s * 0.2, y - s * 1.4, x + s * 0.9, y - s * 1.6); g.stroke();
  }
  ell(g, x, y, s, s * 0.94);
  g.fillStyle = rad(g, x - s * 0.35, y - s * 0.4, s * 0.05, x, y, s * 1.1, [[0, '#ffb0b8'], [0.45, col], [1, '#7a0616']]);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.85)'; ell(g, x - s * 0.35, y - s * 0.38, s * 0.22, s * 0.14, -0.6); g.fill();
}

/** A strawberry, tip up (rot rotates it). */
function strawberry(g, r, x, y, s, rot = 0, rnd = null) {
  g.save(); g.translate(x, y); g.rotate(rot);
  g.beginPath();
  g.moveTo(0, -s * 1.05);
  g.bezierCurveTo(s * 0.55, -s * 0.9, s * 0.95, -s * 0.1, s * 0.82, s * 0.38);
  g.quadraticCurveTo(s * 0.6, s * 0.8, 0, s * 0.78);
  g.quadraticCurveTo(-s * 0.6, s * 0.8, -s * 0.82, s * 0.38);
  g.bezierCurveTo(-s * 0.95, -s * 0.1, -s * 0.55, -s * 0.9, 0, -s * 1.05);
  g.closePath();
  g.fillStyle = rad(g, -s * 0.3, -s * 0.35, s * 0.05, 0, 0, s * 1.2, [[0, '#ff9aa4'], [0.45, '#ec2f45'], [1, '#8a0a1c']]);
  g.fill();
  edge(g, r, 'rgba(110,8,24,0.6)', 0.7);
  g.fillStyle = '#ffe9a0';
  for (const [sx, sy] of [[-0.4, -0.3], [0.1, -0.5], [0.42, -0.1], [-0.15, 0.1], [0.3, 0.38], [-0.45, 0.32], [0.0, -0.12]]) {
    ell(g, sx * s, sy * s, s * 0.06, s * 0.09); g.fill();
  }
  g.fillStyle = 'rgba(255,255,255,0.8)'; ell(g, -s * 0.35, -s * 0.45, s * 0.16, s * 0.09, -0.8); g.fill();
  // leaves at the base (the cut side)
  g.fillStyle = '#5cbf4a';
  for (const a of [-0.9, -0.3, 0.3, 0.9]) {
    g.save(); g.translate(0, s * 0.74); g.rotate(a);
    ell(g, 0, s * 0.16, s * 0.12, s * 0.22); g.fill();
    g.restore();
  }
  g.restore();
}

function blueberry(g, x, y, s) {
  ell(g, x, y, s, s);
  g.fillStyle = rad(g, x - s * 0.35, y - s * 0.35, s * 0.05, x, y, s * 1.1, [[0, '#9ab6ff'], [0.5, '#3b4fb8'], [1, '#141e5a']]);
  g.fill();
  g.strokeStyle = 'rgba(20,24,70,0.8)'; g.lineWidth = Math.max(0.8, s * 0.16);
  g.beginPath(); g.moveTo(x - s * 0.22, y - s * 0.1); g.lineTo(x + s * 0.22, y - s * 0.1); g.moveTo(x, y - s * 0.3); g.lineTo(x, y + s * 0.1); g.stroke();
}

function raspberry(g, x, y, s) {
  const pts = [[0, -0.55], [-0.45, -0.3], [0.45, -0.3], [-0.55, 0.15], [0, -0.05], [0.55, 0.15], [-0.28, 0.5], [0.28, 0.5], [0, 0.4]];
  for (const [px, py] of pts) {
    ell(g, x + px * s, y + py * s, s * 0.34, s * 0.34);
    g.fillStyle = rad(g, x + px * s - s * 0.1, y + py * s - s * 0.12, s * 0.02, x + px * s, y + py * s, s * 0.36, [[0, '#ffb3c8'], [0.5, '#e8326a'], [1, '#900a3a']]);
    g.fill();
  }
}

function mintLeaf(g, r, x, y, s, rot) {
  g.save(); g.translate(x, y); g.rotate(rot);
  g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(s * 0.6, -s * 0.5, s * 1.2, 0); g.quadraticCurveTo(s * 0.6, s * 0.5, 0, 0); g.closePath();
  g.fillStyle = lin(g, 0, -s * 0.4, 0, s * 0.4, [[0, '#9ff07a'], [1, '#2f9a3a']]); g.fill();
  g.strokeStyle = 'rgba(20,80,30,0.6)'; g.lineWidth = Math.max(0.8, r * 0.015);
  g.beginPath(); g.moveTo(s * 0.1, 0); g.lineTo(s * 1.05, 0); g.stroke();
  g.restore();
}

/** A swirl of piped cream: a stack of rolls narrowing to a tip. lean: the tip's sideways shift (wobble). */
function swirl(g, r, x, y, w, h, P, lean = 0) {
  const rolls = 3;
  for (let i = 0; i < rolls; i++) {
    const k = 1 - i * 0.28, cy = y - i * h * 0.26, cx = x + lean * i * 0.5;
    ell(g, cx, cy, w * k, h * 0.2 * (1 - i * 0.08));
    g.fillStyle = gloss(g, cx, cy, w * k, h * 0.2, P); g.fill();
    g.strokeStyle = P.line; g.globalAlpha = 0.35; g.lineWidth = Math.max(1, r * 0.02);
    g.beginPath(); g.ellipse(cx, cy + h * 0.02, w * k * 0.8, h * 0.13, 0, 0.1 * Math.PI, 0.9 * Math.PI); g.stroke();
    g.globalAlpha = 1;
  }
  const ty = y - rolls * h * 0.26, tx = x + lean * 1.6;
  g.beginPath();
  g.moveTo(tx - w * 0.36, ty + h * 0.08);
  g.quadraticCurveTo(tx - w * 0.26, ty - h * 0.2, tx + lean * 0.6, ty - h * 0.32);
  g.quadraticCurveTo(tx + w * 0.3, ty - h * 0.12, tx + w * 0.36, ty + h * 0.08);
  g.closePath();
  g.fillStyle = gloss(g, tx, ty, w * 0.4, h * 0.3, P); g.fill();
}

/** Cylinder body (a round cake tier) from y0 (top) to y1 (bottom), half width w, ellipse depth d. */
function cylinder(g, x, w, y0, y1, d, side, top) {
  g.beginPath();
  g.moveTo(x - w, y0); g.lineTo(x - w, y1);
  g.ellipse(x, y1, w, d, 0, Math.PI, 0, true);
  g.lineTo(x + w, y0);
  g.closePath();
  g.fillStyle = side; g.fill();
  ell(g, x, y0, w, d);
  g.fillStyle = top; g.fill();
}

const sideShade = (g, x, w, stops) => lin(g, x - w, 0, x + w, 0, stops);

// ------------------------------------------------------------------ tiers (coordinates in units of r)

/** 1. Sprinkle: one fat, glossy candy sprinkle, tilted, with two tiny nonpareil friends. */
function t1Sprinkle(g, r, f) {
  ell(g, r * 0.12, r * 0.7, r * 0.1, r * 0.1); g.fillStyle = gloss(g, r * 0.12, r * 0.7, r * 0.1, r * 0.1, pal('#ffd6e8', '#ff7fb6', '#c23a78')); g.fill();
  ell(g, -r * 0.2, -r * 0.7, r * 0.085, r * 0.085); g.fillStyle = gloss(g, -r * 0.2, -r * 0.7, r * 0.085, r * 0.085, pal('#fff6c0', '#ffd23a', '#c48a00')); g.fill();
  g.save();
  g.rotate(-0.42 + (f === 4 ? 0.05 : 0));
  const L = r * 0.8, T = r * 0.4;
  rrect(g, -L, -T, L * 2, T * 2, T);
  g.fillStyle = lin(g, 0, -T, 0, T, [[0, '#c8f2ff'], [0.35, '#6fd2f5'], [0.75, '#3aa6d8'], [1, '#1f78ae']]);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.8)'; rrect(g, -L * 0.74, -T * 0.74, L * 1.05, T * 0.3, T * 0.15); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.5)'; ell(g, L * 0.52, -T * 0.6, T * 0.12, T * 0.1); g.fill();
  g.restore();
  face(g, 0, r * 0.02, r * 0.42, { blink: f === 1, mouth: 'open', iris: '#3a8ec4' });
}

/** 2. Macaron: pistachio shells with ruffled feet and a fat ribbon of cream. */
function t2Macaron(g, r, f) {
  const S = pal('#e4f7bc', '#a6d86a', '#5f9128', '#3a5c14');
  const wb = f === 4 ? 1 : 0;
  const feet = (y, n, dir) => {
    for (let i = 0; i < n; i++) {
      const x = -0.84 + (i / (n - 1)) * 1.68;
      ell(g, x * r, y * r + dir * Math.abs(x) * Math.abs(x) * r * 0.05, r * 0.075, r * 0.06);
      g.fillStyle = i % 2 ? '#c6ea92' : '#b2de78'; g.fill();
    }
  };
  // bottom shell
  g.beginPath();
  g.moveTo(-r * 0.86, r * 0.3); g.quadraticCurveTo(0, r * 0.22, r * 0.86, r * 0.3);
  g.bezierCurveTo(r * 0.9, r * 0.66, r * 0.5, r * 0.82, 0, r * 0.82);
  g.bezierCurveTo(-r * 0.5, r * 0.82, -r * 0.9, r * 0.66, -r * 0.86, r * 0.3);
  g.closePath();
  g.fillStyle = gloss(g, 0, r * 0.52, r * 0.88, r * 0.32, S); g.fill();
  edge(g, r, 'rgba(58,92,20,0.5)');
  feet(0.3, 13, -1);
  // cream
  const cw = 0.84 + wb * 0.04, ch = 0.2 + wb * 0.035;
  rrect(g, -cw * r, r * (0.2 - ch / 2) + r * 0.02, cw * 2 * r, ch * r + r * 0.04, r * 0.1);
  g.fillStyle = lin(g, 0, r * 0.08, 0, r * 0.32, [[0, '#ffffff'], [0.6, '#fff4dc'], [1, '#e6d2ae']]); g.fill();
  for (let i = 0; i < 7; i++) { ell(g, (-0.72 + i * 0.24) * r, r * (0.3 + ch / 2) , r * 0.11, r * 0.05); g.fillStyle = '#fff8ea'; g.fill(); }
  // top shell
  g.beginPath();
  g.moveTo(-r * 0.9, r * 0.06);
  g.bezierCurveTo(-r * 0.94, -r * 0.5, -r * 0.52, -r * 0.76, 0, -r * 0.76);
  g.bezierCurveTo(r * 0.52, -r * 0.76, r * 0.94, -r * 0.5, r * 0.9, r * 0.06);
  g.quadraticCurveTo(0, r * 0.16, -r * 0.9, r * 0.06);
  g.closePath();
  g.fillStyle = gloss(g, 0, -r * 0.3, r * 0.9, r * 0.46, S); g.fill();
  edge(g, r, 'rgba(58,92,20,0.5)');
  feet(0.07, 14, 1);
  shine(g, -r * 0.42, -r * 0.5, r * 0.26, r * 0.1, -0.35, 0.75);
  // crushed pistachio flecks
  g.fillStyle = 'rgba(70,120,30,0.45)';
  for (const [x, y] of [[0.5, -0.5], [0.62, -0.32], [-0.62, -0.22], [0.36, -0.62], [-0.2, -0.64]]) { ell(g, x * r, y * r, r * 0.03, r * 0.02, x); g.fill(); }
  face(g, 0, -r * 0.3, r * 0.42, { blink: f === 1, mouth: 'cat', iris: '#6aa63a' });
}

/** 3. Cream puff: a pink-glazed choux cap on a fat ribbon of whipped cream, crowned with a strawberry. */
function t3CreamPuff(g, r, f, rnd) {
  const wb = f === 4 ? 1 : 0;
  // bottom choux
  g.beginPath();
  g.moveTo(-r * 0.8, r * 0.2);
  g.bezierCurveTo(-r * 0.86, r * 0.64, -r * 0.48, r * 0.84, 0, r * 0.84);
  g.bezierCurveTo(r * 0.48, r * 0.84, r * 0.86, r * 0.64, r * 0.8, r * 0.2);
  g.closePath();
  g.fillStyle = gloss(g, 0, r * 0.5, r * 0.8, r * 0.34, PASTRY); g.fill();
  g.strokeStyle = 'rgba(120,60,16,0.35)'; g.lineWidth = Math.max(1, r * 0.022);
  for (const [x0, y0, x1, y1] of [[-0.5, 0.42, -0.3, 0.58], [-0.1, 0.5, 0.15, 0.66], [0.4, 0.38, 0.56, 0.56], [-0.62, 0.3, -0.7, 0.5]]) {
    g.beginPath(); g.moveTo(x0 * r, y0 * r); g.lineTo(x1 * r, y1 * r); g.stroke();
  }
  // cream ribbon
  for (let i = 0; i < 9; i++) {
    const x = -0.78 + i * 0.195, y = 0.16 + (i % 2) * 0.05;
    const s = 0.15 + wb * 0.025 + (i % 3 === 1 ? 0.02 : 0);
    ell(g, x * r, y * r, s * r, s * r * 0.9);
    g.fillStyle = gloss(g, x * r, y * r, s * r, s * r, CREAM); g.fill();
  }
  // cap
  const cap = () => {
    g.beginPath();
    g.moveTo(-r * 0.78, r * 0.08);
    g.bezierCurveTo(-r * 0.8, -r * 0.4, -r * 0.44, -r * 0.62, 0, -r * 0.62);
    g.bezierCurveTo(r * 0.44, -r * 0.62, r * 0.8, -r * 0.4, r * 0.78, r * 0.08);
    g.quadraticCurveTo(0, r * 0.16, -r * 0.78, r * 0.08);
    g.closePath();
  };
  cap(); g.fillStyle = gloss(g, 0, -r * 0.24, r * 0.8, r * 0.4, PASTRY); g.fill();
  g.save(); cap(); g.clip();
  g.beginPath();
  g.moveTo(-r, -r);
  g.lineTo(r, -r);
  g.lineTo(r, -r * 0.02);
  const drips = [[0.66, 0.0], [0.5, 0.12], [0.34, -0.04], [0.16, 0.1], [-0.04, -0.02], [-0.22, 0.14], [-0.42, -0.02], [-0.58, 0.1], [-0.76, -0.04]];
  for (const [x, y] of drips) g.quadraticCurveTo(x * r + r * 0.08, (y + 0.02) * r, x * r, y * r);
  g.lineTo(-r, -r * 0.02);
  g.closePath();
  g.fillStyle = gloss(g, -r * 0.1, -r * 0.3, r * 0.8, r * 0.4, pal('#ffd6e8', '#ff8fbf', '#d0507f')); g.fill();
  g.restore();
  cap(); edge(g, r, 'rgba(110,30,60,0.45)');
  shine(g, -r * 0.4, -r * 0.4, r * 0.22, r * 0.09, -0.5, 0.8);
  // sugar dust
  g.fillStyle = 'rgba(255,255,255,0.9)';
  for (let i = 0; i < 9; i++) { const a = rnd() * Math.PI, d = 0.25 + rnd() * 0.3; ell(g, Math.cos(a) * d * r * 1.3 - 0, -Math.sin(a) * d * r - r * 0.18, r * 0.018, r * 0.018); g.fill(); }
  strawberry(g, r, r * 0.04, -r * 0.74, r * 0.17, 0.12);
  face(g, 0, -r * 0.24, r * 0.4, { blink: f === 1, mouth: 'smile', iris: '#c0507a' });
}

/** 4. Éclair: a long golden choux finger under a glossy chocolate glaze with a white drizzle. */
function t4Eclair(g, r, f) {
  g.save(); g.rotate(-0.08);
  const body = () => rrect(g, -r * 0.94, -r * 0.42, r * 1.88, r * 0.92, r * 0.42);
  body(); g.fillStyle = lin(g, 0, -r * 0.42, 0, r * 0.5, [[0, '#ffe2a6'], [0.55, '#e9a452'], [1, '#a65c1e']]); g.fill();
  g.save(); body(); g.clip();
  // baked ridges on the dough
  g.strokeStyle = 'rgba(140,72,20,0.28)'; g.lineWidth = Math.max(1, r * 0.022);
  for (const y of [0.18, 0.32]) { g.beginPath(); g.moveTo(-r * 0.8, y * r); g.quadraticCurveTo(0, (y + 0.05) * r, r * 0.8, y * r); g.stroke(); }
  // glaze
  const wb = f === 4 ? 0.03 : 0;
  g.beginPath();
  g.moveTo(-r, -r * 0.6); g.lineTo(r, -r * 0.6); g.lineTo(r, -r * 0.06);
  const drips = [[0.78, -0.04], [0.62, 0.06 + wb], [0.46, -0.06], [0.28, 0.02], [0.1, -0.06], [-0.1, 0.08 + wb], [-0.3, -0.04], [-0.5, 0.04], [-0.7, -0.06], [-0.9, 0.0]];
  for (const [x, y] of drips) g.quadraticCurveTo(x * r + r * 0.1, (y + 0.04) * r, x * r, y * r);
  g.lineTo(-r, -r * 0.06);
  g.closePath();
  g.fillStyle = lin(g, 0, -r * 0.42, 0, r * 0.06, [[0, '#a8653e'], [0.45, '#6e3520'], [1, '#3e180a']]); g.fill();
  g.restore();
  body(); edge(g, r, 'rgba(70,30,8,0.5)');
  // drizzle
  g.strokeStyle = '#fff4e2'; g.lineWidth = Math.max(1, r * 0.04); g.lineJoin = 'round';
  g.beginPath(); g.moveTo(-r * 0.74, -r * 0.3);
  for (let i = 0; i < 9; i++) g.lineTo((-0.6 + i * 0.16) * r, (i % 2 ? -0.32 : -0.14) * r);
  g.stroke();
  shine(g, -r * 0.5, -r * 0.33, r * 0.3, r * 0.06, -0.05, 0.6);
  g.fillStyle = '#ffd765';
  for (const [x, y] of [[-0.35, -0.2], [0.12, -0.24], [0.56, -0.18]]) { ell(g, x * r, y * r, r * 0.04, r * 0.04); g.fill(); }
  g.restore();
  face(g, 0, r * 0.2, r * 0.36, { blink: f === 1, mouth: 'open', iris: '#9a5a2a' });
}

/** 5. Cupcake: a tall lavender swirl with sprinkles and a cherry, in a striped paper case. */
function t5Cupcake(g, r, f, rnd) {
  // case
  const caseP = () => {
    g.beginPath();
    g.moveTo(-r * 0.68, r * 0.08); g.lineTo(r * 0.68, r * 0.08);
    g.lineTo(r * 0.5, r * 0.8); g.quadraticCurveTo(0, r * 0.88, -r * 0.5, r * 0.8);
    g.closePath();
  };
  caseP(); g.fillStyle = lin(g, -r * 0.6, 0, r * 0.6, 0, [[0, '#fff8fc'], [0.6, '#f4e8fb'], [1, '#d4bfe6']]); g.fill();
  g.save(); caseP(); g.clip();
  for (let i = 0; i < 7; i++) {
    const t = -0.6 + i * 0.2;
    g.beginPath();
    g.moveTo((t - 0.05) * r, r * 0.08); g.lineTo((t + 0.05) * r, r * 0.08);
    g.lineTo((t * 0.72 + 0.035) * r, r * 0.9); g.lineTo((t * 0.72 - 0.035) * r, r * 0.9);
    g.closePath(); g.fillStyle = 'rgba(180,140,240,0.55)'; g.fill();
  }
  g.restore();
  caseP(); edge(g, r, 'rgba(80,50,120,0.45)');
  // frosting
  const P = pal('#f2e6ff', '#b48cf0', '#7650bc', '#3e2470');
  const lean = f === 4 ? r * 0.07 : 0;
  // scalloped base roll
  g.beginPath();
  g.moveTo(-r * 0.82, r * 0.06);
  for (let i = 0; i < 6; i++) { const x0 = -0.82 + i * 0.273; g.quadraticCurveTo((x0 + 0.137) * r, r * 0.24, (x0 + 0.273) * r, r * 0.06); }
  g.bezierCurveTo(r * 0.9, -r * 0.2, r * 0.5, -r * 0.3, 0, -r * 0.3);
  g.bezierCurveTo(-r * 0.5, -r * 0.3, -r * 0.9, -r * 0.2, -r * 0.82, r * 0.06);
  g.closePath();
  g.fillStyle = gloss(g, 0, -r * 0.05, r * 0.85, r * 0.3, P); g.fill();
  swirl(g, r, lean * 0.2, -r * 0.26, r * 0.62, r * 0.9, P, lean);
  shine(g, -r * 0.42, -r * 0.08, r * 0.2, r * 0.07, -0.3, 0.7);
  shine(g, -r * 0.2 + lean * 0.4, -r * 0.5, r * 0.14, r * 0.05, -0.3, 0.7);
  // sprinkles
  const cols = ['#ff7fb6', '#ffd23a', '#5ec8ef', '#ffffff', '#7ee08a'];
  g.lineCap = 'round'; g.lineWidth = Math.max(1, r * 0.045);
  for (let i = 0; i < 12; i++) {
    const x = (rnd() - 0.5) * 1.3 * (1 - (i % 3) * 0.2), y = -0.02 - (i % 3) * 0.22 - rnd() * 0.08, a = rnd() * Math.PI;
    g.strokeStyle = cols[i % cols.length];
    g.beginPath(); g.moveTo(x * r - Math.cos(a) * r * 0.04, y * r - Math.sin(a) * r * 0.04); g.lineTo(x * r + Math.cos(a) * r * 0.04, y * r + Math.sin(a) * r * 0.04); g.stroke();
  }
  cherry(g, r, r * 0.08 + lean * 1.2, -r * 0.78, r * 0.13);
  face(g, 0, r * 0.4, r * 0.36, { blink: f === 1, mouth: 'smile', iris: '#8a5ad0' });
}

/** 6. Berry tart: a fluted golden shell heaped with glazed strawberries, blueberries and mint. */
function t6Tart(g, r, f) {
  // shell
  const shell = () => {
    g.beginPath();
    g.moveTo(-r * 0.94, r * 0.16);
    g.lineTo(-r * 0.78, r * 0.66);
    g.quadraticCurveTo(0, r * 0.94, r * 0.78, r * 0.66);
    g.lineTo(r * 0.94, r * 0.16);
    g.closePath();
  };
  shell(); g.fillStyle = gloss(g, 0, r * 0.42, r * 0.9, r * 0.4, PASTRY); g.fill();
  g.save(); shell(); g.clip();
  g.strokeStyle = 'rgba(140,72,20,0.35)'; g.lineWidth = Math.max(1, r * 0.03);
  for (let i = -6; i <= 6; i++) { g.beginPath(); g.moveTo(i * 0.15 * r, r * 0.2); g.lineTo(i * 0.13 * r, r * 0.95); g.stroke(); }
  g.restore();
  shell(); edge(g, r, 'rgba(110,56,16,0.45)');
  // rim + custard
  ell(g, 0, r * 0.16, r * 0.94, r * 0.2); g.fillStyle = gloss(g, 0, r * 0.16, r * 0.94, r * 0.2, pal('#fff0c4', '#f4bc66', '#b8702a')); g.fill();
  ell(g, 0, r * 0.15, r * 0.82, r * 0.14); g.fillStyle = lin(g, 0, 0, 0, r * 0.3, [[0, '#fff6d0'], [1, '#f6d880']]); g.fill();
  // berries, back to front
  const wb = f === 4 ? 0.02 : 0;
  strawberry(g, r, -r * 0.02, -r * 0.5 - wb * r, r * 0.22, 0.05);
  strawberry(g, r, -r * 0.36, -r * 0.24, r * 0.22, -0.45);
  strawberry(g, r, r * 0.36, -r * 0.24, r * 0.22, 0.45);
  blueberry(g, -r * 0.68, r * 0.02, r * 0.11);
  blueberry(g, r * 0.66, r * 0.04, r * 0.1);
  strawberry(g, r, -r * 0.5, r * 0.04, r * 0.2, -0.9);
  strawberry(g, r, r * 0.5, r * 0.04, r * 0.2, 0.9);
  strawberry(g, r, 0, -r * 0.06, r * 0.24, 0);
  blueberry(g, -r * 0.18, r * 0.16, r * 0.09);
  blueberry(g, r * 0.2, r * 0.16, r * 0.09);
  mintLeaf(g, r, r * 0.02, -r * 0.74, r * 0.2, -2.2);
  mintLeaf(g, r, r * 0.04, -r * 0.74, r * 0.18, -0.9);
  face(g, 0, r * 0.48, r * 0.34, { blink: f === 1, mouth: 'open', iris: '#c0602a' });
}

/** 7. Croissant: a plump, flaky crescent with a buttery egg-wash shine. */
function t7Croissant(g, r, f, rnd) {
  const P = pal('#ffdc96', '#e0862a', '#8a400c', '#5a2804');
  const lobe = (x, y, rx, ry, rot) => {
    ell(g, x * r, y * r, rx * r, ry * r, rot);
    g.fillStyle = rad(g, (x - rx * 0.35) * r, (y - ry * 0.45) * r, r * 0.02, x * r, y * r, Math.max(rx, ry) * r * 1.15, [[0, P.li], [0.5, P.base], [1, P.dk]]);
    g.fill();
    edge(g, r, 'rgba(90,40,4,0.55)');
    g.save(); ell(g, x * r, y * r, rx * r, ry * r, rot); g.clip();
    g.strokeStyle = 'rgba(255,230,170,0.55)'; g.lineWidth = Math.max(1, r * 0.03);
    g.beginPath(); g.ellipse(x * r, y * r, rx * r * 0.7, ry * r * 0.7, rot, 1.1 * Math.PI, 1.6 * Math.PI); g.stroke();
    g.restore();
  };
  lobe(-0.88, 0.44, 0.14, 0.11, 1.0);
  lobe(0.88, 0.44, 0.14, 0.11, -1.0);
  lobe(-0.72, 0.22, 0.22, 0.2, 0.8);
  lobe(0.72, 0.22, 0.22, 0.2, -0.8);
  lobe(-0.46, 0.04, 0.3, 0.3, 0.5);
  lobe(0.46, 0.04, 0.3, 0.3, -0.5);
  lobe(0, -0.06, 0.44, 0.44, 0);
  // rolled-dough bands across the centre lobe
  g.save(); ell(g, 0, -r * 0.06, r * 0.44, r * 0.44); g.clip();
  g.strokeStyle = 'rgba(120,52,8,0.4)'; g.lineWidth = Math.max(1, r * 0.03);
  for (const y of [-0.3, 0.24]) { g.beginPath(); g.moveTo(-r * 0.5, (y + 0.06) * r); g.quadraticCurveTo(0, (y - 0.06) * r, r * 0.5, (y + 0.06) * r); g.stroke(); }
  g.restore();
  // side-lobe creases
  g.strokeStyle = 'rgba(120,52,8,0.35)'; g.lineWidth = Math.max(1, r * 0.024);
  for (const sx of [-1, 1]) {
    g.beginPath(); g.moveTo(sx * 0.36 * r, -0.2 * r); g.quadraticCurveTo(sx * 0.5 * r, 0.02 * r, sx * 0.44 * r, 0.3 * r); g.stroke();
  }
  // butter shine + flakes
  shine(g, -r * 0.18, -r * 0.36, r * 0.16, r * 0.06, -0.3, f === 4 ? 0.8 : 0.6);
  shine(g, -r * 0.56, -r * 0.08, r * 0.1, r * 0.05, 0.5, 0.5);
  g.fillStyle = 'rgba(255,236,190,0.9)';
  for (let i = 0; i < 6; i++) { ell(g, (rnd() - 0.5) * 1.1 * r, (-0.3 + rnd() * 0.12) * r, r * 0.022, r * 0.012, rnd() * 3); g.fill(); }
  face(g, 0, r * 0.0, r * 0.36, { blink: f === 1, mouth: 'cat', iris: '#a6561a' });
}

/** 8. Mille-feuille slice: flaky pastry and vanilla cream layers under feathered fondant, with a raspberry. */
function t8MilleFeuille(g, r, f) {
  const x0 = -0.86, x1 = 0.72, top = -0.5, bot = 0.8, dx = 0.16, dy = -0.24;
  const X = (v) => v * r, Y = (v) => v * r;
  const wb = f === 4 ? 0.025 : 0;
  // side face (right), shaded
  g.beginPath(); g.moveTo(X(x1), Y(top)); g.lineTo(X(x1 + dx), Y(top + dy)); g.lineTo(X(x1 + dx), Y(bot + dy)); g.lineTo(X(x1), Y(bot)); g.closePath();
  g.fillStyle = '#d9a35e'; g.fill();
  // front layers
  const layers = [
    [top, top + 0.1, '#fffdf6', '#efe2c8'], // fondant edge
    [top + 0.1, top + 0.32, '#ffd994', '#d9913e'], // pastry
    [top + 0.32, top + 0.84 + wb, '#fffaf0', '#f2dfb6'], // cream (face)
    [top + 0.84 + wb, top + 1.04, '#ffd994', '#d9913e'], // pastry
    [top + 1.04, top + 1.14, '#fffaf0', '#f2dfb6'], // cream
    [top + 1.14, bot, '#ffd38a', '#c47e30'], // pastry
  ];
  for (const [a, b, c0, c1] of layers) {
    g.fillStyle = lin(g, 0, Y(a), 0, Y(b), [[0, c0], [1, c1]]);
    g.fillRect(X(x0), Y(a), X(x1 - x0), Y(b - a) + 0.5);
  }
  // flaky lines on pastry layers + piped cream bumps on the edges
  g.strokeStyle = 'rgba(150,80,20,0.4)'; g.lineWidth = Math.max(1, r * 0.018);
  for (const [a, b] of [[top + 0.1, top + 0.32], [top + 0.84 + wb, top + 1.04], [top + 1.14, bot]]) {
    const m = (a + b) / 2;
    g.beginPath(); g.moveTo(X(x0 + 0.05), Y(m)); for (let i = 1; i <= 8; i++) g.lineTo(X(x0 + 0.05 + i * (x1 - x0 - 0.1) / 8), Y(m + (i % 2 ? 0.025 : -0.025))); g.stroke();
  }
  // front outline
  g.beginPath(); g.rect(X(x0), Y(top), X(x1 - x0), Y(bot - top)); edge(g, r, 'rgba(110,70,30,0.45)');
  // side stripes
  g.save();
  g.beginPath(); g.moveTo(X(x1), Y(top)); g.lineTo(X(x1 + dx), Y(top + dy)); g.lineTo(X(x1 + dx), Y(bot + dy)); g.lineTo(X(x1), Y(bot)); g.closePath(); g.clip();
  for (const [a, b, c] of [[top + 0.32, top + 0.84 + wb, '#f6e8cc'], [top + 1.04, top + 1.14, '#f6e8cc'], [top, top + 0.1, '#ffffff']]) {
    g.beginPath(); g.moveTo(X(x1), Y(a)); g.lineTo(X(x1 + dx), Y(a + dy)); g.lineTo(X(x1 + dx), Y(b + dy)); g.lineTo(X(x1), Y(b)); g.closePath(); g.fillStyle = c; g.fill();
  }
  g.fillStyle = 'rgba(80,40,10,0.18)'; g.fillRect(X(x1), Y(top + dy), X(dx), Y(bot - top - dy));
  g.restore();
  // top surface: white fondant with chocolate feathering
  const topP = () => { g.beginPath(); g.moveTo(X(x0), Y(top)); g.lineTo(X(x1), Y(top)); g.lineTo(X(x1 + dx), Y(top + dy)); g.lineTo(X(x0 + dx), Y(top + dy)); g.closePath(); };
  topP(); g.fillStyle = lin(g, 0, Y(top + dy), 0, Y(top), [[0, '#ffffff'], [1, '#f6efe2']]); g.fill();
  g.save(); topP(); g.clip();
  g.strokeStyle = '#7a4128'; g.lineWidth = Math.max(1, r * 0.022);
  for (let i = 1; i <= 3; i++) {
    const t = i / 4;
    g.beginPath(); g.moveTo(X(x0 + dx * t), Y(top + dy * t)); g.lineTo(X(x1 + dx * t), Y(top + dy * t)); g.stroke();
  }
  g.strokeStyle = 'rgba(122,65,40,0.55)'; g.lineWidth = Math.max(0.8, r * 0.014);
  for (let i = 0; i < 7; i++) {
    const x = x0 + 0.15 + i * 0.22;
    g.beginPath(); g.moveTo(X(x), Y(top)); g.lineTo(X(x + dx * 0.5 + (i % 2 ? 0.05 : -0.05)), Y(top + dy * 0.5)); g.lineTo(X(x + dx), Y(top + dy)); g.stroke();
  }
  g.restore();
  topP(); edge(g, r, 'rgba(110,70,30,0.4)');
  raspberry(g, X(0.12), Y(-0.78), r * 0.13);
  mintLeaf(g, r, X(0.24), Y(-0.78), r * 0.16, -0.5);
  shine(g, X(-0.6), Y(-0.6), r * 0.16, r * 0.04, -0.15, 0.6);
  face(g, X(-0.07), Y(top + 0.56 + wb / 2), r * 0.36, { blink: f === 1, mouth: 'open', iris: '#c0883a' });
}

/** 9. Layer cake: a teal-frosted round cake with a white drip, cream dollops and berries, on a gold stand. */
function t9LayerCake(g, r, f, rnd) {
  // stand
  ell(g, 0, r * 0.8, r * 0.92, r * 0.13); g.fillStyle = lin(g, -r, 0, r, 0, [[0, '#fff3b8'], [0.5, '#e8b83c'], [1, '#9a6a10']]); g.fill();
  ell(g, 0, r * 0.76, r * 0.88, r * 0.1); g.fillStyle = '#fff6d6'; g.fill();
  const w = 0.8, y0 = -0.34, y1 = 0.66, d = 0.2;
  cylinder(g, 0, w * r, y0 * r, y1 * r, d * r,
    sideShade(g, 0, w * r, [[0, '#9ef0e6'], [0.3, '#5fd2c6'], [0.75, '#34a89e'], [1, '#1d746c']]),
    lin(g, 0, (y0 - d) * r, 0, (y0 + d) * r, [[0, '#c8fff8'], [1, '#6adacf']]));
  // layer seam: a piped pearl band
  for (let i = 0; i < 11; i++) {
    const t = -1 + i * 0.2, x = t * w * 0.94, y = y1 - 0.08 + Math.sqrt(1 - t * t * 0.88) * d * 0.9;
    ell(g, x * r, y * r, r * 0.075, r * 0.06); g.fillStyle = gloss(g, x * r, y * r, r * 0.075, r * 0.06, CREAM); g.fill();
  }
  // white drip from the top rim (front half)
  const wb = f === 4 ? 0.03 : 0;
  g.beginPath();
  g.moveTo(-w * r, y0 * r);
  const n = 12;
  for (let i = 0; i <= n; i++) {
    const t = -1 + (i / n) * 2, x = t * w, yb = y0 + Math.sqrt(Math.max(0, 1 - t * t)) * d;
    const len = (i % 3 === 1 ? 0.2 : i % 2 ? 0.12 : 0.07) + (i % 3 === 1 ? wb : 0) + rnd() * 0.04;
    g.lineTo(x * r - r * 0.05, (yb + 0.02) * r);
    g.quadraticCurveTo(x * r - r * 0.05, (yb + len) * r, x * r, (yb + len) * r);
    g.quadraticCurveTo(x * r + r * 0.05, (yb + len) * r, x * r + r * 0.05, (yb + 0.02) * r);
  }
  g.lineTo(w * r, y0 * r);
  g.ellipse(0, y0 * r, w * r, d * r, 0, 0, Math.PI, true);
  g.closePath();
  g.fillStyle = lin(g, 0, (y0 - d) * r, 0, (y0 + d + 0.2) * r, [[0, '#ffffff'], [1, '#f2ece6']]); g.fill();
  shine(g, -r * 0.56, r * 0.1, r * 0.08, r * 0.26, 0, 0.55);
  // toppings
  const P = CREAM;
  const dollop = (x, y, s) => {
    ell(g, x * r, y * r, s * r, s * r * 0.62); g.fillStyle = gloss(g, x * r, y * r, s * r, s * r * 0.62, P); g.fill();
    ell(g, x * r, (y - s * 0.42) * r, s * r * 0.6, s * r * 0.42); g.fillStyle = gloss(g, x * r, (y - s * 0.42) * r, s * r * 0.6, s * r * 0.42, P); g.fill();
    g.strokeStyle = 'rgba(184,154,116,0.5)'; g.lineWidth = Math.max(1, r * 0.018);
    g.beginPath(); g.ellipse(x * r, y * r, s * r * 0.7, s * r * 0.36, 0, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
  };
  dollop(-0.52, -0.38, 0.16); dollop(0.52, -0.38, 0.16);
  dollop(0, -0.44 - (f === 4 ? 0.02 : 0), 0.2);
  raspberry(g, -r * 0.52, -r * 0.6, r * 0.09);
  blueberry(g, r * 0.52, -r * 0.58, r * 0.085);
  cherry(g, r, f === 4 ? r * 0.04 : r * 0.02, -r * 0.7, r * 0.12);
  face(g, 0, r * 0.18, r * 0.42, { blink: f === 1, mouth: 'smile', iris: '#2a8a82' });
}

/** 10. Wedding cake: three ivory tiers with gold bands, pearls, a cascade of roses and a gold heart topper. */
function t10Wedding(g, r, f, rnd) {
  const ivory = (w) => sideShade(g, 0, w, [[0, '#ffffff'], [0.35, '#fff8ec'], [0.8, '#efe0c6'], [1, '#d6c19c']]);
  const topF = (y, d) => lin(g, 0, y - d, 0, y + d, [[0, '#ffffff'], [1, '#f6ecd8']]);
  const tiers = [[0.88, 0.3, 0.8, 0.14], [0.64, -0.18, 0.3, 0.11], [0.42, -0.56, -0.18, 0.08]];
  for (const [w, y0, y1, d] of tiers) {
    cylinder(g, 0, w * r, y0 * r, y1 * r, d * r, ivory(w * r), topF(y0 * r, d * r));
    // gold band at the base
    g.beginPath(); g.ellipse(0, (y1 - 0.03) * r, w * r, d * r, 0, 0.02, Math.PI - 0.02);
    g.strokeStyle = '#e2b03a'; g.lineWidth = Math.max(1.5, r * 0.05); g.stroke();
    g.strokeStyle = 'rgba(255,248,200,0.8)'; g.lineWidth = Math.max(0.8, r * 0.015); g.stroke();
    // pearls along the top rim
    const n = Math.round(w * 12);
    for (let i = 0; i <= n; i++) {
      const t = -1 + (i / n) * 2, x = t * w * 0.97, y = y0 + Math.sqrt(Math.max(0, 1 - t * t)) * d;
      ell(g, x * r, y * r, r * 0.03, r * 0.03); g.fillStyle = gloss(g, x * r, y * r, r * 0.03, r * 0.03, pal('#ffffff', '#f6eedc', '#c8b48e')); g.fill();
    }
  }
  // gentle swags on the bottom tier
  g.strokeStyle = 'rgba(214,180,120,0.6)'; g.lineWidth = Math.max(1, r * 0.022);
  for (let i = 0; i < 4; i++) { const xa = (-0.76 + i * 0.38) * r; g.beginPath(); g.moveTo(xa, r * 0.42); g.quadraticCurveTo(xa + r * 0.19, r * 0.58, xa + r * 0.38, r * 0.42); g.stroke(); }
  // rose cascade
  const rose = (x, y, s, col, dk) => {
    ell(g, x * r, y * r, s * r, s * r);
    g.fillStyle = rad(g, (x - s * 0.3) * r, (y - s * 0.3) * r, 0, x * r, y * r, s * r * 1.1, [[0, '#ffe0ea'], [0.55, col], [1, dk]]); g.fill();
    g.strokeStyle = dk; g.lineWidth = Math.max(0.8, r * 0.015);
    g.beginPath(); g.arc(x * r, y * r, s * r * 0.55, 0.3, 4.4); g.stroke();
    g.beginPath(); g.arc(x * r + s * r * 0.08, y * r, s * r * 0.25, 2, 6.2); g.stroke();
  };
  mintLeaf(g, r, r * 0.4, -r * 0.28, r * 0.16, -0.3);
  mintLeaf(g, r, r * 0.6, r * 0.22, r * 0.16, 0.2);
  rose(0.36, -0.3, 0.1, '#ff9cbc', '#c84c78');
  rose(0.56, 0.18, 0.12, '#ffb3c8', '#d0607f');
  rose(0.74, 0.32, 0.09, '#ff8fb0', '#b83a66');
  rose(-0.66, 0.72, 0.08, '#ffb3c8', '#d0607f');
  // gold heart topper
  const hy = -0.8 + (f === 4 ? -0.02 : 0);
  heart(g, 0, hy * r, r * 0.13);
  g.fillStyle = rad(g, -r * 0.05, (hy - 0.06) * r, 0, 0, hy * r, r * 0.18, [[0, '#fff6c0'], [0.5, '#f2c43c'], [1, '#a8740c']]); g.fill();
  g.strokeStyle = '#c8961e'; g.lineWidth = Math.max(1, r * 0.025);
  g.beginPath(); g.moveTo(0, (hy + 0.12) * r); g.lineTo(0, -r * 0.62); g.stroke();
  shine(g, -r * 0.3, -r * 0.42, r * 0.06, r * 0.1, 0, 0.6);
  shine(g, -r * 0.64, r * 0.48, r * 0.07, r * 0.16, 0, 0.6);
  face(g, 0, r * 0.03, r * 0.38, { blink: f === 1, mouth: 'open', iris: '#c8961e' });
  void rnd;
}

const TIERS = [null, t1Sprinkle, t2Macaron, t3CreamPuff, t4Eclair, t5Cupcake, t6Tart, t7Croissant, t8MilleFeuille, t9LayerCake, t10Wedding];

/** Glint positions per tier (units of r): frame 2 lights set A, frame 3 set B. Drawn on top, never outlined. */
const GLINTS = [null,
  [[[-0.42, -0.32, 0.16]], [[0.5, -0.12, 0.13]]],
  [[[-0.52, -0.52, 0.16]], [[0.52, -0.44, 0.12], [-0.6, 0.5, 0.09]]],
  [[[-0.46, -0.44, 0.16]], [[0.32, -0.5, 0.12], [0.2, -0.86, 0.09]]],
  [[[-0.56, -0.36, 0.16]], [[0.4, -0.3, 0.13]]],
  [[[0.18, -0.86, 0.14], [-0.46, -0.1, 0.1]], [[-0.22, -0.52, 0.14]]],
  [[[-0.08, -0.62, 0.14], [0.5, -0.1, 0.1]], [[-0.42, -0.34, 0.14]]],
  [[[-0.2, -0.44, 0.16]], [[0.5, -0.04, 0.12], [-0.6, 0.2, 0.09]]],
  [[[-0.6, -0.62, 0.15]], [[0.06, -0.9, 0.12], [0.5, -0.66, 0.1]]],
  [[[-0.56, 0.0, 0.15], [0.02, -0.92, 0.1]], [[0.4, -0.46, 0.13]]],
  [[[0.0, -0.94, 0.15], [-0.34, -0.44, 0.1]], [[-0.62, 0.36, 0.13], [0.5, -0.14, 0.11]]],
];

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
 * Paint one Patisserie piece centred at the origin, radius r (CSS px). frame: see the file header.
 * The pastry is painted into an offscreen layer first so the outline, rim light and inner shade follow its exact
 * silhouette. dpr: device pixel ratio of the target (the sprite cache passes it).
 */
export function drawPastry(g, r, tier, frame = 0, dpr = 1) {
  tier = Math.max(1, Math.min(10, tier | 0));
  frame = frame | 0;
  const rnd = mulberry32((0xca4e5 + tier * 7919) >>> 0);
  const size = Math.ceil(r * 2 * 1.3 * dpr), half = size / 2 / dpr;
  const art = makeCanvas(size, size), a = art.getContext('2d');
  a.translate(size / 2, size / 2); a.scale(dpr, dpr);
  a.lineCap = 'round';
  TIERS[tier](a, r, frame, rnd);
  const ow = Math.max(1.2, r * 0.06), od = ow * dpr;
  const sil = tinted(art, size, INKS[tier]);
  const rim = tinted(art, size, '#ffffff', od * 0.75, od * 0.9);
  const shade = tinted(art, size, INKS[tier], -od * 0.9, -od * 1.1);

  contact(g, 0, r * 0.9, r * 0.82, r * 0.13);
  if (tier === 10) { // celebration glow behind the wedding cake (not outlined)
    g.save();
    g.fillStyle = rad(g, 0, -r * 0.05, r * 0.2, 0, -r * 0.05, r * 1.05, [[0, 'rgba(255,226,150,0.55)'], [1, 'rgba(255,226,150,0)']]);
    g.beginPath(); g.arc(0, -r * 0.05, r * 1.05, 0, TAU); g.fill();
    g.restore();
  }
  for (let i = 0; i < 16; i++) {
    const t = (i / 16) * TAU;
    g.drawImage(sil, -half + Math.cos(t) * ow, -half + Math.sin(t) * ow, half * 2, half * 2);
  }
  g.drawImage(art, -half, -half, half * 2, half * 2);
  g.save();
  g.globalAlpha = 0.24;
  g.drawImage(shade, -half, -half, half * 2, half * 2);
  g.globalAlpha = tier === 8 || tier === 10 ? 0.4 : 0.6;
  g.drawImage(rim, -half, -half, half * 2, half * 2);
  g.restore();
  // sparkle glints (frames 2 and 3): soft halo + four-point star, on top of the outline
  const set = frame === 2 ? GLINTS[tier][0] : frame === 3 ? GLINTS[tier][1] : null;
  if (set) {
    g.save();
    for (const [x, y, s] of set) {
      g.fillStyle = rad(g, x * r, y * r, 0, x * r, y * r, s * r * 1.3, [[0, 'rgba(255,255,255,0.7)'], [1, 'rgba(255,255,255,0)']]);
      g.beginPath(); g.arc(x * r, y * r, s * r * 1.3, 0, TAU); g.fill();
      sparkle(g, x * r, y * r, s * r, '#ffffff');
    }
    g.restore();
  }
}

/**
 * Idle animation for a Patisserie piece at clock t (seconds, per-orb offset already applied).
 * frame: 0 rest, 1 blink, 2/3 sparkle glints, 4 cream wobble. Plus a gentle bob-squish (±2.4%).
 * Each cycle has its own period per tier, so a tray of pastries never moves in lockstep.
 */
export function pastryIdle(t, tier) {
  const cyc = (off, per) => { const p = (t + off) % per; return p < 0 ? p + per : p; };
  const blink = cyc(0, 3.9 + (tier % 4) * 0.4) < 0.14;
  const sp = cyc(1.3 + tier * 0.53, 4.7 + (tier % 3) * 0.6);
  const spark = sp < 0.22 ? 2 : sp < 0.44 ? 3 : 0;
  const wob = cyc(2.7 + tier * 0.71, 6.1 + (tier % 5) * 0.5) < 0.3;
  const frame = blink ? 1 : spark || (wob ? 4 : 0);
  const w = Math.sin(t * (2.1 + tier * 0.05)) * (wob ? 1.1 : 1);
  return { frame, sx: 1 + 0.022 * w, sy: 1 - 0.022 * w };
}
