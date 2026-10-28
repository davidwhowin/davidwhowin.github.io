// Café Classics piece skin ('cafeclassics', the default look). Procedural Canvas only.
// Port: unity/NovaDrop/Assets/NovaDrop/Scripts/Art/CafeClassicsArt.cs (keep the two in step).
//
// Freeform pieces: no disc or ring. Each tier IS a café-counter treat or prop, standing free and filling its round
// unit: a mint drop, a choc-chip cookie, a strawberry, a pink donut, a cocoa mug, a cinnamon roll, a pumpkin pie, a
// berry smoothie, a teal kettle and a three-tier cake stand. A big, bold, outlined number sits in the middle of every
// piece (drawCafeNumber, drawn by orbArt.drawOrb so a wild piece can hide it), so tiers read by colour + number +
// shape. Every tier has one clear dominant colour (CAFE_CLASSICS_COLORS): mint, golden biscuit, strawberry red,
// donut pink, cornflower blue, cinnamon brown, pumpkin orange, berry purple, teal and ivory-and-gold.
//
// The finish is a soft hand-painted look: a warm-brown ink outline around the whole silhouette, a light rim on the
// top-left edge, a gentle inner shade bottom-right, warm highlights and a contact shadow. No faces. Its subjects and
// palette are deliberately different from the Seaside Café coin skin (seasideArt.js) and the Patisserie pack.
//
// Painted ONCE per tier/size/frame into the orb sprite cache (orbArt.js). Five frames per tier:
//   0 rest, 1 accent A (steam left), 2 and 3 glints, 4 accent B (steam right).
// The idle bob is a transform in drawOrb, so animation never repaints; Calm / reduced motion freezes it.
// Texture detail comes from a seeded mulberry32 stream per tier, so every sprite of a tier is identical.
import { mulberry32 } from './rng.js';

const TAU = Math.PI * 2;

/** Dominant colour per tier (index 1..10). Ten distinct hues and lightnesses: the colour carries the tier. */
export const CAFE_CLASSICS_COLORS = [null, '#4fc596', '#e0a64e', '#e23f3d', '#f286b6', '#4a7fd6', '#9a5a2a', '#f08a2c', '#8e58c8', '#23a2a0', '#f3dfae'];
/** Silhouette outline ink per tier: a deep warm shade of the dominant colour. */
const INKS = [null, '#1d5a40', '#6a4210', '#6e1416', '#7a2650', '#1c3768', '#3e1e08', '#6e3408', '#3a1a64', '#0c4648', '#6a4a1a'];

/** Main colour of a tier (particles, guides). */
export const cafeClassicsColor = (tier) => CAFE_CLASSICS_COLORS[Math.max(1, Math.min(10, tier | 0))];

/** Display names of the ten tiers (merge popups, goal text, discovery cards). */
export const CAFE_CLASSICS_NAMES = [null, 'Mint Drop', 'Cookie', 'Strawberry', 'Donut', 'Cocoa Mug', 'Cinnamon Roll', 'Pumpkin Pie', 'Berry Smoothie', 'Kettle', 'Cake Stand'];

/** Number colours: [fill, outline]. A warm cream digit with a thick dark-cocoa outline reads on every prop colour. */
export const CAFE_NUMBER_FILL = '#fffaf0';
export const CAFE_NUMBER_STROKE = '#3a2014';
/** Number size as a fraction of the piece radius (as big as Simple Circles; "10" a little smaller to fit). */
export const cafeNumberScale = (tier) => (tier >= 10 ? 0.84 : 1.04);

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

/** Soft warm contact shadow (ellipse). */
function contact(g, x, y, rx, ry, a = 0.32) {
  g.save();
  g.fillStyle = rad(g, x, y, 0, x, y, rx, [[0, `rgba(66,38,20,${a})`], [0.6, `rgba(66,38,20,${a * 0.5})`], [1, 'rgba(66,38,20,0)']]);
  g.translate(x, y); g.scale(1, ry / rx);
  g.beginPath(); g.arc(0, 0, rx, 0, TAU); g.fill();
  g.restore();
}

function shine(g, x, y, rx, ry, rot, a = 0.6) {
  g.save();
  g.fillStyle = rad(g, x, y, 0, x, y, Math.max(rx, ry), [[0, `rgba(255,253,244,${a})`], [1, 'rgba(255,253,244,0)']]);
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

/** A soft fill lit from the top left. P = { li, base, dk }. */
function gloss(g, x, y, w, h, P) {
  return rad(g, x - w * 0.35, y - h * 0.45, Math.min(w, h) * 0.05, x, y, Math.max(w, h) * 1.1, [[0, P.li], [0.55, P.base], [1, P.dk]]);
}
const pal = (li, base, dk) => ({ li, base, dk });

function st(g, col, w) { g.strokeStyle = col; g.lineWidth = w; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(); }

/** A soft curl of steam rising from (x, y). Not outlined: drawn after the compositor. */
function steam(g, r, x, y, h, phase, a = 0.8) {
  g.save();
  g.lineCap = 'round';
  for (const [dx, k, w] of [[0, 1, 0.08], [0.18, 0.75, 0.06]]) {
    const sx = x + dx * r, top = y - h * r * k;
    const sw = (phase ? -1 : 1) * r * 0.09;
    g.beginPath(); g.moveTo(sx, y); g.bezierCurveTo(sx + sw, y - (y - top) * 0.33, sx - sw, y - (y - top) * 0.66, sx + sw * 0.5, top);
    g.strokeStyle = `rgba(110,78,58,${a * 0.32})`; g.lineWidth = Math.max(2, r * w * 1.7); g.stroke();
    g.strokeStyle = `rgba(255,255,255,${a})`; g.lineWidth = Math.max(1.2, r * w); g.stroke();
  }
  g.restore();
}

// ------------------------------------------------------------------ tiers (coordinates in units of r)

const MINT = pal('#c4f4dc', '#4fc596', '#22855c');
/** 1: a wrapped mint drop: a glossy round sweet with white pinwheel stripes and twisted cellophane ends. */
function t1Mint(g, r, f) {
  // twisted wrapper ends (frame 4: a little crinkle)
  const crinkle = f === 4 ? 0.04 : 0;
  for (const s of [-1, 1]) {
    g.beginPath();
    g.moveTo(s * 0.5 * r, -0.14 * r);
    g.lineTo(s * (0.96 + crinkle) * r, -0.46 * r);
    g.lineTo(s * 0.86 * r, -0.2 * r);
    g.lineTo(s * 0.98 * r, -0.02 * r);
    g.lineTo(s * 0.86 * r, 0.18 * r);
    g.lineTo(s * (0.96 - crinkle) * r, 0.46 * r);
    g.lineTo(s * 0.5 * r, 0.14 * r);
    g.closePath();
    g.fillStyle = lin(g, s * 0.5 * r, -0.4 * r, s * 0.9 * r, 0.4 * r, [[0, 'rgba(230,252,242,0.98)'], [1, 'rgba(170,228,204,0.98)']]);
    g.fill();
    // pleats
    for (const yy of [-0.24, 0, 0.24]) { g.beginPath(); g.moveTo(s * 0.56 * r, yy * 0.4 * r); g.lineTo(s * 0.88 * r, yy * r * 1.3); st(g, 'rgba(60,140,110,0.45)', Math.max(0.8, r * 0.022)); }
  }
  // the sweet
  ell(g, 0, 0, 0.62 * r, 0.6 * r); g.fillStyle = gloss(g, 0, 0, 0.62 * r, 0.6 * r, MINT); g.fill();
  // pinwheel stripes
  g.save(); ell(g, 0, 0, 0.62 * r, 0.6 * r); g.clip();
  for (let i = 0; i < 6; i++) {
    const a0 = (i / 6) * TAU + 0.3;
    g.beginPath(); g.moveTo(0, 0);
    g.quadraticCurveTo(Math.cos(a0 + 0.35) * 0.4 * r, Math.sin(a0 + 0.35) * 0.4 * r, Math.cos(a0 + 0.5) * 0.7 * r, Math.sin(a0 + 0.5) * 0.7 * r);
    g.lineTo(Math.cos(a0 + 0.78) * 0.7 * r, Math.sin(a0 + 0.78) * 0.7 * r);
    g.quadraticCurveTo(Math.cos(a0 + 0.5) * 0.36 * r, Math.sin(a0 + 0.5) * 0.36 * r, 0, 0);
    g.fillStyle = 'rgba(255,255,255,0.78)'; g.fill();
  }
  g.restore();
  shine(g, -0.24 * r, -0.32 * r, 0.22 * r, 0.12 * r, -0.5, 0.75);
}

const BISCUIT = pal('#fbdc9c', '#e0a64e', '#a96a22');
/** 2: a round choc-chip cookie with a bumpy, scalloped edge. */
function t2Cookie(g, r, f, rnd) {
  const n = 13;
  g.beginPath();
  for (let i = 0; i <= 120; i++) {
    const a = (i / 120) * TAU;
    const rr = (0.9 + 0.035 * Math.sin(a * n) + 0.015 * Math.sin(a * 5 + 1)) * r;
    const x = Math.cos(a) * rr, y = Math.sin(a) * rr * 0.96;
    if (i) g.lineTo(x, y); else g.moveTo(x, y);
  }
  g.closePath();
  g.fillStyle = gloss(g, 0, 0, 0.9 * r, 0.88 * r, BISCUIT); g.fill();
  // golden baked edge
  ell(g, 0, 0, 0.8 * r, 0.77 * r); st(g, 'rgba(176,108,36,0.35)', r * 0.06);
  // crumbs / sugar texture
  for (let i = 0; i < 26; i++) {
    const a = rnd() * TAU, d = Math.sqrt(rnd()) * 0.78;
    ell(g, Math.cos(a) * d * r, Math.sin(a) * d * r, r * 0.018, r * 0.014); g.fillStyle = rnd() < 0.5 ? 'rgba(255,240,200,0.7)' : 'rgba(150,90,30,0.35)'; g.fill();
  }
  // chocolate chips around the middle
  const chips = [[-0.55, -0.36, 0.12], [0.08, -0.66, 0.11], [0.58, -0.32, 0.12], [0.64, 0.3, 0.1], [0.18, 0.66, 0.12], [-0.42, 0.56, 0.11], [-0.72, 0.1, 0.09], [-0.12, -0.3, 0.07], [0.3, 0.2, 0.07]];
  for (const [x, y, s] of chips) {
    g.beginPath();
    g.moveTo((x - s) * r, (y + s * 0.5) * r);
    g.quadraticCurveTo((x - s * 0.6) * r, (y - s * 0.9) * r, x * r, (y - s) * r);
    g.quadraticCurveTo((x + s * 0.7) * r, (y - s * 0.6) * r, (x + s) * r, (y + s * 0.5) * r);
    g.quadraticCurveTo(x * r, (y + s * 0.9) * r, (x - s) * r, (y + s * 0.5) * r);
    g.fillStyle = rad(g, (x - s * 0.3) * r, (y - s * 0.4) * r, 0, x * r, y * r, s * r * 1.2, [[0, '#8a5a3a'], [0.5, '#4a2614'], [1, '#2e160a']]); g.fill();
  }
  shine(g, -0.38 * r, -0.5 * r, 0.26 * r, 0.12 * r, -0.5, 0.55);
}

const BERRY = pal('#ff9f92', '#e23f3d', '#981a1e');
const LEAF = pal('#9ee08a', '#4ea94a', '#2a6e2c');
/** 3: a plump strawberry with golden seeds and a leafy green cap. */
function t3Strawberry(g, r, f, rnd) {
  g.beginPath();
  g.moveTo(0, -0.6 * r);
  g.bezierCurveTo(0.5 * r, -0.78 * r, 0.96 * r, -0.5 * r, 0.82 * r, 0.05 * r);
  g.bezierCurveTo(0.7 * r, 0.5 * r, 0.3 * r, 0.9 * r, 0, 0.96 * r);
  g.bezierCurveTo(-0.3 * r, 0.9 * r, -0.7 * r, 0.5 * r, -0.82 * r, 0.05 * r);
  g.bezierCurveTo(-0.96 * r, -0.5 * r, -0.5 * r, -0.78 * r, 0, -0.6 * r);
  g.closePath();
  g.fillStyle = gloss(g, 0, 0.05 * r, 0.85 * r, 0.9 * r, BERRY); g.fill();
  // seeds in staggered rows (a little dimple + a golden seed)
  for (let row = 0; row < 6; row++) {
    const y = -0.4 + row * 0.24;
    const w = row < 2 ? 0.7 : 0.72 - (row - 1) * 0.13;
    const cnt = Math.max(2, Math.round(w * 6));
    for (let i = 0; i < cnt; i++) {
      const x = -w + ((i + (row % 2 ? 0.5 : 0.25)) / cnt) * w * 2 + (rnd() - 0.5) * 0.04;
      if (Math.abs(x) > w) continue;
      ell(g, x * r, (y + 0.015) * r, r * 0.032, r * 0.042); g.fillStyle = 'rgba(120,10,20,0.4)'; g.fill();
      ell(g, x * r, y * r, r * 0.022, r * 0.034); g.fillStyle = '#ffe07a'; g.fill();
    }
  }
  // leafy cap
  const lift = f === 4 ? -0.03 : 0;
  for (let i = 0; i < 6; i++) {
    const a = Math.PI + (i / 5) * Math.PI;
    const tx = Math.cos(a) * 0.5, ty = -0.66 + Math.sin(a) * 0.22 + lift + (i % 2 ? 0.12 : 0.18);
    g.beginPath();
    g.moveTo(-0.08 * r, -0.62 * r);
    g.quadraticCurveTo((tx * 0.4 - 0.06) * r, (ty - 0.1) * r, tx * r, ty * r);
    g.quadraticCurveTo((tx * 0.4 + 0.06) * r, (ty + 0.04) * r, 0.08 * r, -0.6 * r);
    g.closePath();
    g.fillStyle = gloss(g, tx * 0.5 * r, -0.6 * r, 0.3 * r, 0.12 * r, LEAF); g.fill();
  }
  // stem
  g.beginPath(); g.moveTo(0, -0.66 * r); g.quadraticCurveTo(0.04 * r, -0.86 * r, 0.14 * r, (-0.92 + lift) * r); st(g, '#3f8a3a', Math.max(1.5, r * 0.07));
  shine(g, -0.42 * r, -0.28 * r, 0.12 * r, 0.24 * r, 0.4, 0.6);
}

const GLAZE = pal('#ffd6e8', '#f286b6', '#c24d82');
const DOUGH = pal('#f8d6a2', '#e0a65e', '#a9692c');
/** 4: a pink-glazed donut with rainbow sprinkles and a real hole in the middle. */
function t4Donut(g, r, f, rnd) {
  // dough ring
  ell(g, 0, 0.04 * r, 0.94 * r, 0.88 * r); g.fillStyle = gloss(g, 0, 0.04 * r, 0.94 * r, 0.88 * r, DOUGH); g.fill();
  // glaze with soft drips
  g.beginPath();
  for (let i = 0; i <= 96; i++) {
    const a = (i / 96) * TAU;
    let rr = 0.78 + 0.05 * Math.sin(a * 7 + 0.6) + 0.03 * Math.sin(a * 3);
    if (Math.sin(a) > 0.2) rr += 0.06 * Math.max(0, Math.sin(a * 9 + 1.2)); // drips at the bottom
    const x = Math.cos(a) * rr * r, y = Math.sin(a) * rr * 0.94 * r;
    if (i) g.lineTo(x, y); else g.moveTo(x, y);
  }
  g.closePath();
  g.fillStyle = gloss(g, 0, 0, 0.82 * r, 0.78 * r, GLAZE); g.fill();
  // sprinkles on the glaze ring (kept off the hole)
  const cols = ['#ffffff', '#ffd84a', '#5ab8f0', '#7ed6a0', '#ffffff', '#b98cf0'];
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * TAU + rnd() * 0.25, d = 0.4 + rnd() * 0.3;
    const x = Math.cos(a) * d * r, y = Math.sin(a) * d * 0.94 * r, rot = rnd() * Math.PI;
    g.save(); g.translate(x, y); g.rotate(rot);
    rrect(g, -0.055 * r, -0.017 * r, 0.11 * r, 0.034 * r, 0.017 * r); g.fillStyle = cols[i % cols.length]; g.fill();
    g.restore();
  }
  // the hole: a soft dough lip, then cut through
  ell(g, 0, 0.02 * r, 0.22 * r, 0.19 * r); g.fillStyle = '#c98a48'; g.fill();
  g.save(); g.globalCompositeOperation = 'destination-out';
  ell(g, 0, 0.04 * r, 0.16 * r, 0.13 * r); g.fill();
  g.restore();
  shine(g, -0.4 * r, -0.46 * r, 0.24 * r, 0.11 * r, -0.55, 0.7);
}

const MUG = pal('#a8c8fa', '#4a7fd6', '#26498e');
/** 5: a cornflower-blue mug of cocoa with marshmallows (steam on frames 1 / 4, drawn after the outline). */
function t5Mug(g, r, f) {
  const x0 = -0.72, x1 = 0.44, y0 = -0.5, y1 = 0.84;
  // handle (behind the body)
  g.beginPath();
  g.moveTo(0.36 * r, -0.3 * r);
  g.bezierCurveTo(1.06 * r, -0.38 * r, 1.06 * r, 0.62 * r, 0.36 * r, 0.52 * r);
  st(g, MUG.dk, r * 0.2);
  g.beginPath();
  g.moveTo(0.36 * r, -0.3 * r);
  g.bezierCurveTo(1.06 * r, -0.38 * r, 1.06 * r, 0.62 * r, 0.36 * r, 0.52 * r);
  st(g, MUG.base, r * 0.12);
  // body: slightly rounded at the bottom
  g.beginPath();
  g.moveTo(x0 * r, y0 * r);
  g.lineTo(x1 * r, y0 * r);
  g.lineTo((x1 - 0.03) * r, (y1 - 0.12) * r);
  g.quadraticCurveTo((x1 - 0.04) * r, y1 * r, (x1 - 0.18) * r, y1 * r);
  g.lineTo((x0 + 0.18) * r, y1 * r);
  g.quadraticCurveTo((x0 + 0.04) * r, y1 * r, (x0 + 0.03) * r, (y1 - 0.12) * r);
  g.closePath();
  g.fillStyle = lin(g, x0 * r, 0, x1 * r, 0, [[0, MUG.li], [0.3, MUG.base], [0.85, MUG.base], [1, MUG.dk]]); g.fill();
  // a cream band near the foot
  g.beginPath(); g.moveTo((x0 + 0.03) * r, 0.62 * r); g.lineTo((x1 - 0.03) * r, 0.62 * r); st(g, 'rgba(255,246,226,0.85)', r * 0.06);
  // rim + cocoa
  const cx = (x0 + x1) / 2, rx = (x1 - x0) / 2;
  ell(g, cx * r, y0 * r, rx * r, 0.15 * r); g.fillStyle = '#d6e6ff'; g.fill();
  ell(g, cx * r, (y0 + 0.02) * r, (rx - 0.07) * r, 0.11 * r); g.fillStyle = rad(g, (cx - 0.1) * r, y0 * r, 0, cx * r, y0 * r, rx * r, [[0, '#9a6040'], [1, '#5a3018']]); g.fill();
  // marshmallows
  for (const [mx, my, c] of [[-0.36, -0.6, '#ffffff'], [-0.06, -0.66, '#ffd6e4'], [0.18, -0.58, '#ffffff']]) {
    rrect(g, (mx - 0.1) * r, (my - 0.07) * r, 0.2 * r, 0.15 * r, 0.05 * r);
    g.fillStyle = lin(g, 0, (my - 0.07) * r, 0, (my + 0.08) * r, [[0, c], [1, '#e8dcd0']]); g.fill();
  }
  shine(g, (x0 + 0.14) * r, 0.05 * r, 0.06 * r, 0.3 * r, 0, 0.55);
}

const CINN = pal('#f2c48a', '#c98a4e', '#8a4e1e');
/** 6: a cinnamon roll from above: a soft swirl of dough and cinnamon with a drizzle of white icing. */
function t6Cinnamon(g, r, f, rnd) {
  // side of the roll (darker, peeks out below)
  ell(g, 0, 0.08 * r, 0.92 * r, 0.84 * r); g.fillStyle = '#7a4218'; g.fill();
  ell(g, 0, 0, 0.92 * r, 0.84 * r); g.fillStyle = gloss(g, 0, 0, 0.92 * r, 0.84 * r, CINN); g.fill();
  // the swirl: a wide cinnamon band following an Archimedean spiral
  g.save(); ell(g, 0, 0, 0.9 * r, 0.82 * r); g.clip();
  g.beginPath();
  const turns = 3.1, steps = 160;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, a = t * turns * TAU + 0.4;
    const d = (0.06 + 0.8 * t) * r;
    const x = Math.cos(a) * d, y = Math.sin(a) * d * 0.92;
    if (i) g.lineTo(x, y); else g.moveTo(x, y);
  }
  st(g, '#8a4a1c', r * 0.1);
  g.globalAlpha = 0.5; st(g, '#b06a30', r * 0.04); g.globalAlpha = 1;
  g.restore();
  // icing drizzle (frame 4: a fresh shine)
  // three soft, wavy strands of icing across the top
  g.save(); ell(g, 0, 0, 0.86 * r, 0.78 * r); g.clip();
  for (const [y, ph, amp] of [[-0.42, 0.4, 0.08], [0.02, 1.9, 0.09], [0.44, 3.1, 0.07]]) {
    g.beginPath();
    for (let i = 0; i <= 40; i++) {
      const x = -0.9 + (i / 40) * 1.8;
      const yy = y + amp * Math.sin(x * 5.2 + ph) - x * 0.12;
      if (i) g.lineTo(x * r, yy * r); else g.moveTo(x * r, yy * r);
    }
    st(g, 'rgba(120,70,40,0.22)', r * 0.085);
    st(g, f === 4 ? '#ffffff' : '#fff8ee', r * 0.06);
  }
  g.restore();
  shine(g, -0.4 * r, -0.44 * r, 0.24 * r, 0.12 * r, -0.5, 0.45);
}

const PUMPKIN = pal('#ffc483', '#f08a2c', '#b4521a');
const CRUST = pal('#f6d39a', '#d9a05a', '#9a6326');
/** 7: a whole pumpkin pie in a fluted crust, seen from a little above, with a dollop of cream. */
function t7Pie(g, r, f) {
  const cy = -0.12, rx = 0.96, ry = 0.5, depth = 0.4;
  // the dish / crust side
  g.beginPath();
  g.ellipse(0, cy * r, rx * r, ry * r, 0, 0, Math.PI);
  g.lineTo(-0.82 * r, (cy + depth) * r);
  g.ellipse(0, (cy + depth) * r, 0.82 * r, 0.42 * r, 0, Math.PI, 0, true);
  g.closePath();
  g.fillStyle = lin(g, -rx * r, 0, rx * r, 0, [[0, CRUST.li], [0.5, CRUST.base], [1, CRUST.dk]]); g.fill();
  // fluting on the side
  for (let i = 1; i < 14; i++) {
    const t = -1 + (i / 14) * 2, xt = t * rx, yt = cy + Math.sqrt(1 - t * t) * ry;
    const xb = t * 0.82, yb = cy + depth + Math.sqrt(1 - t * t) * 0.42;
    g.beginPath(); g.moveTo(xt * r, yt * r); g.lineTo(xb * r, yb * r); st(g, 'rgba(140,82,30,0.35)', Math.max(0.8, r * 0.025));
  }
  // crimped rim
  g.beginPath();
  for (let i = 0; i <= 120; i++) {
    const a = (i / 120) * TAU, k = 1 + 0.035 * Math.cos(a * 18);
    const x = Math.cos(a) * rx * k * r, y = (cy + Math.sin(a) * ry * k) * r;
    if (i) g.lineTo(x, y); else g.moveTo(x, y);
  }
  g.closePath();
  g.fillStyle = gloss(g, 0, cy * r, rx * r, ry * r, CRUST); g.fill();
  // the filling
  ell(g, 0, (cy + 0.02) * r, 0.8 * r, 0.38 * r); g.fillStyle = gloss(g, 0, cy * r, 0.8 * r, 0.38 * r, PUMPKIN); g.fill();
  ell(g, 0, (cy + 0.02) * r, 0.8 * r, 0.38 * r); st(g, 'rgba(150,70,20,0.35)', Math.max(0.8, r * 0.025));
  // cream dollop + a dusting of cinnamon
  const dy = f === 4 ? -0.02 : 0;
  const cream = pal('#ffffff', '#fff6e8', '#e2cfb4');
  ell(g, 0.42 * r, (cy - 0.06 + dy) * r, 0.17 * r, 0.1 * r); g.fillStyle = gloss(g, 0.42 * r, (cy - 0.06) * r, 0.17 * r, 0.1 * r, cream); g.fill();
  ell(g, 0.42 * r, (cy - 0.15 + dy) * r, 0.1 * r, 0.08 * r); g.fillStyle = gloss(g, 0.42 * r, (cy - 0.15) * r, 0.1 * r, 0.08 * r, cream); g.fill();
  for (const [x, y] of [[-0.5, -0.04], [-0.3, -0.26], [0.1, -0.3], [-0.6, -0.2], [0.6, 0.0], [-0.12, -0.02]]) {
    ell(g, x * r, (cy + y + 0.1) * r, r * 0.022, r * 0.014); g.fillStyle = 'rgba(122,60,20,0.5)'; g.fill();
  }
  shine(g, -0.46 * r, (cy - 0.14) * r, 0.24 * r, 0.08 * r, -0.2, 0.55);
}

const SMOOTH = pal('#d8b8f6', '#8e58c8', '#53268a');
/** 8: a tall berry smoothie in a glass, topped with cream, berries and a striped straw. */
function t8Smoothie(g, r, f) {
  const top = -0.5, bot = 0.9, wt = 0.56, wb = 0.4;
  // straw (behind the cream)
  g.save();
  g.translate(0.16 * r, -0.62 * r); g.rotate(0.42);
  rrect(g, -0.055 * r, -0.42 * r, 0.11 * r, 0.5 * r, 0.04 * r); g.fillStyle = '#ffffff'; g.fill();
  g.save(); rrect(g, -0.055 * r, -0.42 * r, 0.11 * r, 0.5 * r, 0.04 * r); g.clip();
  for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(-0.1 * r, (-0.42 + i * 0.1) * r); g.lineTo(0.1 * r, (-0.36 + i * 0.1) * r); st(g, '#ef5a7a', r * 0.04); }
  g.restore();
  g.restore();
  // the glass with the smoothie
  g.beginPath();
  g.moveTo(-wt * r, top * r);
  g.lineTo(wt * r, top * r);
  g.lineTo(wb * r, (bot - 0.08) * r);
  g.quadraticCurveTo(wb * r, bot * r, (wb - 0.1) * r, bot * r);
  g.lineTo((-wb + 0.1) * r, bot * r);
  g.quadraticCurveTo(-wb * r, bot * r, -wb * r, (bot - 0.08) * r);
  g.closePath();
  g.fillStyle = lin(g, -wt * r, 0, wt * r, 0, [[0, SMOOTH.li], [0.28, SMOOTH.base], [0.8, SMOOTH.base], [1, SMOOTH.dk]]); g.fill();
  // a pink layer at the bottom, and the glass's foot
  g.save();
  g.beginPath(); g.moveTo(-wt * r, top * r); g.lineTo(wt * r, top * r); g.lineTo(wb * r, bot * r); g.lineTo(-wb * r, bot * r); g.closePath(); g.clip();
  g.fillStyle = 'rgba(255,140,190,0.55)'; g.fillRect(-r, 0.56 * r, 2 * r, 0.5 * r);
  g.beginPath(); g.moveTo(-r, 0.56 * r); g.quadraticCurveTo(-0.2 * r, 0.5 * r, r, 0.58 * r); st(g, 'rgba(255,230,240,0.6)', r * 0.03);
  g.restore();
  // glass shine streaks
  g.beginPath(); g.moveTo(-0.42 * r, -0.36 * r); g.lineTo(-0.32 * r, 0.72 * r); st(g, 'rgba(255,255,255,0.55)', r * 0.06);
  g.beginPath(); g.moveTo(0.4 * r, -0.36 * r); g.lineTo(0.33 * r, 0.2 * r); st(g, 'rgba(255,255,255,0.3)', r * 0.03);
  // rim
  g.beginPath(); g.moveTo(-wt * r, top * r); g.lineTo(wt * r, top * r); st(g, 'rgba(255,255,255,0.85)', r * 0.05);
  // whipped cream cloud
  const cream = pal('#ffffff', '#fff7f0', '#e6d6cc');
  const lift = f === 4 ? -0.02 : 0;
  for (const [x, y, s] of [[-0.36, -0.58, 0.18], [0.36, -0.58, 0.18], [-0.12, -0.66, 0.2], [0.14, -0.68, 0.19], [0, -0.82, 0.15]]) {
    ell(g, x * r, (y + lift) * r, s * r, s * 0.82 * r); g.fillStyle = gloss(g, x * r, (y + lift) * r, s * r, s * 0.82 * r, cream); g.fill();
  }
  // berries on top
  ell(g, -0.2 * r, (-0.86 + lift) * r, 0.09 * r, 0.085 * r); g.fillStyle = rad(g, -0.23 * r, -0.9 * r, 0, -0.2 * r, -0.86 * r, 0.1 * r, [[0, '#8fa8f0'], [1, '#2e3c8a']]); g.fill();
  ell(g, 0.06 * r, (-0.92 + lift) * r, 0.09 * r, 0.085 * r); g.fillStyle = rad(g, 0.03 * r, -0.96 * r, 0, 0.06 * r, -0.92 * r, 0.1 * r, [[0, '#ff8a9e'], [1, '#b0183a']]); g.fill();
}

const TEAL = pal('#9ce8e0', '#23a2a0', '#0f5e62');
/** 9: a round teal enamel kettle with a wooden handle and a curved spout (steam on frames 1 / 4). */
function t9Kettle(g, r, f) {
  // handle arch (behind)
  g.beginPath(); g.moveTo(-0.44 * r, -0.2 * r); g.bezierCurveTo(-0.44 * r, -0.98 * r, 0.44 * r, -0.98 * r, 0.44 * r, -0.2 * r);
  st(g, '#3e2210', r * 0.15);
  st(g, '#8a5a34', r * 0.09);
  // spout (left)
  g.beginPath();
  g.moveTo(-0.5 * r, 0.42 * r);
  g.quadraticCurveTo(-0.82 * r, 0.3 * r, -0.96 * r, -0.2 * r);
  g.lineTo(-0.84 * r, -0.26 * r);
  g.quadraticCurveTo(-0.76 * r, 0.08 * r, -0.5 * r, 0.06 * r);
  g.closePath();
  g.fillStyle = lin(g, -0.96 * r, 0, -0.5 * r, 0, [[0, TEAL.base], [1, TEAL.dk]]); g.fill();
  // body: a wide dome on a flat base
  g.beginPath();
  g.moveTo(-0.72 * r, 0.72 * r);
  g.bezierCurveTo(-0.9 * r, 0.1 * r, -0.5 * r, -0.36 * r, 0, -0.36 * r);
  g.bezierCurveTo(0.5 * r, -0.36 * r, 0.9 * r, 0.1 * r, 0.72 * r, 0.72 * r);
  g.quadraticCurveTo(0.68 * r, 0.86 * r, 0.5 * r, 0.86 * r);
  g.lineTo(-0.5 * r, 0.86 * r);
  g.quadraticCurveTo(-0.68 * r, 0.86 * r, -0.72 * r, 0.72 * r);
  g.closePath();
  g.fillStyle = gloss(g, 0, 0.2 * r, 0.82 * r, 0.62 * r, TEAL); g.fill();
  // cream enamel band at the base
  g.beginPath(); g.moveTo(-0.74 * r, 0.66 * r); g.quadraticCurveTo(0, 0.74 * r, 0.74 * r, 0.66 * r); st(g, 'rgba(255,246,226,0.9)', r * 0.07);
  // lid
  ell(g, 0, -0.34 * r, 0.36 * r, 0.09 * r); g.fillStyle = lin(g, 0, -0.43 * r, 0, -0.25 * r, [[0, '#c8f2ec'], [1, TEAL.base]]); g.fill();
  ell(g, 0, -0.34 * r, 0.36 * r, 0.09 * r); st(g, 'rgba(10,70,72,0.45)', Math.max(0.8, r * 0.02));
  ell(g, 0, -0.46 * r, 0.1 * r, 0.08 * r); g.fillStyle = rad(g, -0.03 * r, -0.49 * r, 0, 0, -0.46 * r, 0.11 * r, [[0, '#c08a5a'], [1, '#5a3418']]); g.fill();
  shine(g, -0.38 * r, -0.04 * r, 0.12 * r, 0.24 * r, 0.5, 0.6);
}

/** 10: an afternoon-tea cake stand: three ivory plates with gold rims, piled with little treats. */
function t10Stand(g, r, f, rnd) {
  const gold = (y0, y1) => lin(g, -0.05 * r, 0, 0.05 * r, 0, [[0, '#fff0b0'], [0.5, '#d9a53a'], [1, '#8a6012']]);
  // centre rod + ring handle
  rrect(g, -0.035 * r, -0.86 * r, 0.07 * r, 1.66 * r, 0.03 * r); g.fillStyle = gold(); g.fill();
  g.beginPath(); g.arc(0, -0.9 * r, 0.08 * r, 0, TAU); st(g, '#c8922a', r * 0.045);
  const plate = (y, w) => {
    ell(g, 0, (y + 0.035) * r, w * r, w * 0.2 * r); g.fillStyle = '#c8922a'; g.fill();
    ell(g, 0, y * r, w * r, w * 0.2 * r); g.fillStyle = lin(g, 0, (y - w * 0.2) * r, 0, (y + w * 0.2) * r, [[0, '#fffdf6'], [1, '#efe0c0']]); g.fill();
    ell(g, 0, y * r, w * 0.97 * r, w * 0.19 * r); st(g, '#e0b44a', Math.max(1, r * 0.025));
  };
  const treat = (x, y, w, h, col, dk, top) => {
    w *= 1.22; h *= 1.22; y -= 0.02;
    ell(g, x * r, y * r, w * r, h * r); g.fillStyle = rad(g, (x - w * 0.3) * r, (y - h * 0.4) * r, 0, x * r, y * r, w * 1.1 * r, [[0, '#ffffff'], [0.35, col], [1, dk]]); g.fill();
    if (top) { ell(g, x * r, (y - h * 0.8) * r, w * 0.32 * r, w * 0.28 * r); g.fillStyle = top; g.fill(); }
  };
  // bottom plate: scones and macarons
  plate(0.72, 0.94);
  treat(-0.6, 0.6, 0.16, 0.12, '#f4c27a', '#b47a30', '#ffffff');
  treat(-0.24, 0.58, 0.15, 0.12, '#f7a8c4', '#c4587e', null);
  treat(0.22, 0.58, 0.15, 0.12, '#a8dca0', '#4a9a52', null);
  treat(0.58, 0.6, 0.16, 0.12, '#f4c27a', '#b47a30', '#e8344a');
  // middle plate: little cakes
  plate(0.16, 0.72);
  treat(-0.42, 0.04, 0.15, 0.13, '#fbe8a8', '#d0a040', '#ff8fb0');
  treat(0.0, 0.0, 0.15, 0.14, '#f7a8c4', '#c4587e', '#ffffff');
  treat(0.42, 0.04, 0.15, 0.13, '#c9b4f0', '#7a5ac0', '#ffd84a');
  // top plate: strawberries
  plate(-0.42, 0.5);
  treat(-0.18, -0.52, 0.12, 0.12, '#ff7a7a', '#b81e2a', '#4ea94a');
  treat(0.18, -0.52, 0.12, 0.12, '#ff7a7a', '#b81e2a', '#4ea94a');
  // finial on top of the rod
  ell(g, 0, (-0.6 + (f === 4 ? -0.01 : 0)) * r, 0.05 * r, 0.05 * r); g.fillStyle = '#e8b840'; g.fill();
}

const TIERS = [null, t1Mint, t2Cookie, t3Strawberry, t4Donut, t5Mug, t6Cinnamon, t7Pie, t8Smoothie, t9Kettle, t10Stand];

// ------------------------------------------------------------------ bake-only art (Tonight's bake, src/ui/bakeView.js)
// A few bakes have a picture of their own instead of a tier's stand-in, so no two bakes offered side by side look the
// same (docs/UX_FIRST_WEEK.md F4). Same finish as the tiers (outline, rim, shade, contact shadow), never a board piece.

const TEA_CRUST = pal('#c98a52', '#8a4a20', '#52280c');
const TEA_CRUMB = pal('#f2cf98', '#d9a464', '#a8703a');
/** Tea Loaf: a dark, fruit-studded loaf with one thick slice leaning in front, showing the crumb and a pat of butter. */
function bakeTeaLoaf(g, r, f, rnd) {
  g.translate(0.04 * r, 0.16 * r); g.scale(1.12, 1.12); // sit on the contact shadow and fill the round like a tier
  // the loaf: a flat-bottomed tin loaf with a gently domed top, seen from the side
  g.beginPath();
  g.moveTo(-0.92 * r, 0.6 * r); g.lineTo(-0.92 * r, -0.12 * r);
  g.bezierCurveTo(-0.9 * r, -0.62 * r, 0.5 * r, -0.66 * r, 0.6 * r, -0.14 * r);
  g.lineTo(0.6 * r, 0.6 * r); g.closePath();
  g.fillStyle = gloss(g, -0.16 * r, 0.0, 0.8 * r, 0.62 * r, TEA_CRUST); g.fill();
  // a crack along the top crust and a few raisins showing through the side
  g.beginPath(); g.moveTo(-0.66 * r, -0.36 * r); g.quadraticCurveTo(-0.16 * r, -0.5 * r, 0.32 * r, -0.36 * r);
  st(g, 'rgba(60,28,8,0.55)', r * 0.05);
  g.fillStyle = '#3a1a0c';
  for (let i = 0; i < 7; i++) { ell(g, (-0.8 + rnd() * 1.2) * r, (-0.1 + rnd() * 0.6) * r, 0.05 * r, 0.035 * r, rnd() * 3); g.fill(); }
  shine(g, -0.4 * r, -0.36 * r, 0.26 * r, 0.09 * r, -0.2, 0.35);
  // the slice, leaning a little, in front on the right
  g.save();
  g.translate(0.4 * r, 0.2 * r); g.rotate(0.16);
  const w = 0.62 * r, h = 0.86 * r;
  g.beginPath();
  g.moveTo(-w / 2, h / 2); g.lineTo(-w / 2, -h * 0.18);
  g.bezierCurveTo(-w / 2, -h * 0.62, w / 2, -h * 0.62, w / 2, -h * 0.18);
  g.lineTo(w / 2, h / 2); g.closePath();
  g.fillStyle = '#7a3e16'; g.fill(); // crust edge
  g.save(); g.translate(0, h * 0.02); g.scale(0.84, 0.88);
  g.beginPath();
  g.moveTo(-w / 2, h / 2); g.lineTo(-w / 2, -h * 0.18);
  g.bezierCurveTo(-w / 2, -h * 0.62, w / 2, -h * 0.62, w / 2, -h * 0.18);
  g.lineTo(w / 2, h / 2); g.closePath();
  g.fillStyle = gloss(g, 0, 0, w * 0.5, h * 0.5, TEA_CRUMB); g.fill();
  g.clip();
  // tea-soaked fruit: raisins, sultanas and a little orange peel
  for (let i = 0; i < 9; i++) {
    const x = (rnd() - 0.5) * w * 0.86, y = (-0.3 + rnd() * 0.75) * h;
    ell(g, x, y, 0.055 * r, 0.04 * r, rnd() * 3); g.fillStyle = i % 3 === 2 ? '#c06a1e' : i % 3 === 1 ? '#8a4a1a' : '#3a1a0c'; g.fill();
  }
  g.restore();
  // a pat of butter melting on top of the slice
  rrect(g, -0.15 * r, -0.4 * h - 0.02 * r, 0.3 * r, 0.16 * r, 0.05 * r);
  g.fillStyle = f === 4 ? '#fff2a6' : '#ffe58a'; g.fill();
  shine(g, -0.06 * r, -0.4 * h + 0.02 * r, 0.08 * r, 0.03 * r, 0, 0.7);
  g.restore();
}

const BAKE_ART = {
  tealoaf: { paint: bakeTeaLoaf, ink: '#3e1e08', seed: 0x7ea10af },
};
/** Keys of the bakes drawn with a picture of their own (bakeArtCanvas falls back to the tier stand-in otherwise). */
export const BAKE_ART_KEYS = Object.freeze(Object.keys(BAKE_ART));

/** Paint a bake-only picture centred at the origin, radius r (CSS px), with the Café Classics finish. */
export function drawBakeArt(g, r, key, dpr = 1) {
  const def = BAKE_ART[key];
  if (!def) return false;
  const size = Math.ceil(r * 2 * 1.3 * dpr), half = size / 2 / dpr;
  const art = makeCanvas(size, size), a = art.getContext('2d');
  a.translate(size / 2, size / 2); a.scale(dpr, dpr);
  a.lineCap = 'round';
  def.paint(a, r, 0, mulberry32(def.seed >>> 0));
  const ow = Math.max(1.1, r * 0.055), od = ow * dpr;
  const sil = tinted(art, size, def.ink);
  const rim = tinted(art, size, '#fffaf0', od * 0.75, od * 0.9);
  const shade = tinted(art, size, def.ink, -od * 0.9, -od * 1.1);
  contact(g, 0, r * 0.9, r * 0.82, r * 0.13);
  for (let i = 0; i < 16; i++) {
    const t = (i / 16) * TAU;
    g.drawImage(sil, -half + Math.cos(t) * ow, -half + Math.sin(t) * ow, half * 2, half * 2);
  }
  g.drawImage(art, -half, -half, half * 2, half * 2);
  g.save();
  g.globalAlpha = 0.2; g.drawImage(shade, -half, -half, half * 2, half * 2);
  g.globalAlpha = 0.5; g.drawImage(rim, -half, -half, half * 2, half * 2);
  g.restore();
  return true;
}

/** Glint positions per tier (units of r): frame 2 lights set A, frame 3 set B. Drawn on top, never outlined. */
const GLINTS = [null,
  [[[-0.3, -0.36, 0.14]], [[0.4, 0.3, 0.1]]],
  [[[-0.46, -0.5, 0.14]], [[0.52, 0.42, 0.1]]],
  [[[-0.46, -0.24, 0.14]], [[0.46, -0.3, 0.1]]],
  [[[-0.5, -0.5, 0.14]], [[0.56, 0.36, 0.1]]],
  [[[-0.6, 0.0, 0.13]], [[0.1, -0.7, 0.1]]],
  [[[-0.44, -0.5, 0.14]], [[0.5, 0.36, 0.1]]],
  [[[-0.52, -0.32, 0.14]], [[0.6, 0.2, 0.1]]],
  [[[-0.42, -0.2, 0.13]], [[0.3, -0.86, 0.1]]],
  [[[-0.4, -0.1, 0.14]], [[0.34, -0.7, 0.1]]],
  [[[0.0, -0.98, 0.12]], [[-0.7, 0.66, 0.1], [0.6, 0.1, 0.09]]],
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
 * Paint one Café Classics piece centred at the origin, radius r (CSS px). frame: see the file header.
 * The prop is painted into an offscreen layer first so the outline, rim light and inner shade follow its exact
 * silhouette. The number is NOT painted here (drawCafeNumber, on top). dpr: device pixel ratio of the target.
 */
export function drawCafeClassics(g, r, tier, frame = 0, dpr = 1) {
  tier = Math.max(1, Math.min(10, tier | 0));
  frame = frame | 0;
  const rnd = mulberry32((0xcafe5 + tier * 7919) >>> 0);
  const size = Math.ceil(r * 2 * 1.3 * dpr), half = size / 2 / dpr;
  const art = makeCanvas(size, size), a = art.getContext('2d');
  a.translate(size / 2, size / 2); a.scale(dpr, dpr);
  a.lineCap = 'round';
  const steamy = tier === 5 || tier === 9;
  TIERS[tier](a, r, steamy ? 0 : frame, rnd);
  const ow = Math.max(1.1, r * 0.055), od = ow * dpr;
  const sil = tinted(art, size, INKS[tier]);
  const rim = tinted(art, size, '#fffaf0', od * 0.75, od * 0.9);
  const shade = tinted(art, size, INKS[tier], -od * 0.9, -od * 1.1);

  contact(g, 0, r * 0.9, r * 0.82, r * 0.13);
  for (let i = 0; i < 16; i++) {
    const t = (i / 16) * TAU;
    g.drawImage(sil, -half + Math.cos(t) * ow, -half + Math.sin(t) * ow, half * 2, half * 2);
  }
  g.drawImage(art, -half, -half, half * 2, half * 2);
  g.save();
  g.globalAlpha = 0.2;
  g.drawImage(shade, -half, -half, half * 2, half * 2);
  g.globalAlpha = tier === 10 ? 0.35 : 0.5;
  g.drawImage(rim, -half, -half, half * 2, half * 2);
  g.restore();
  if (steamy && (frame === 1 || frame === 4)) {
    if (tier === 5) steam(g, r, -0.24 * r, -0.66 * r, 0.3, frame === 4, 0.8);
    else steam(g, r, -0.92 * r, -0.3 * r, 0.5, frame === 4, 0.8);
  }
  const set = frame === 2 ? GLINTS[tier][0] : frame === 3 ? GLINTS[tier][1] : null;
  if (set) {
    g.save();
    for (const [x, y, s] of set) {
      g.fillStyle = rad(g, x * r, y * r, 0, x * r, y * r, s * r * 1.3, [[0, 'rgba(255,252,236,0.7)'], [1, 'rgba(255,252,236,0)']]);
      g.beginPath(); g.arc(x * r, y * r, s * r * 1.3, 0, TAU); g.fill();
      sparkle(g, x * r, y * r, s * r, '#fffdf4');
    }
    g.restore();
  }
}

/**
 * The big centred number of a Café Classics piece (radius r, centred at the origin): a warm cream digit with a thick
 * dark-cocoa outline and a soft drop shadow, so it reads on every prop at the smallest size. Always shown (whatever
 * the Numbers setting); drawOrb skips it on wild pieces.
 */
export function drawCafeNumber(g, r, tier) {
  const px = Math.round(r * cafeNumberScale(tier));
  g.font = `800 ${px}px Fredoka, "Baloo 2", system-ui, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  const s = String(tier), y = r * 0.08;
  g.lineWidth = Math.max(3, r * 0.24);
  g.strokeStyle = 'rgba(40,20,10,0.35)';
  g.strokeText(s, r * 0.03, y + r * 0.05);
  g.strokeStyle = CAFE_NUMBER_STROKE;
  g.strokeText(s, 0, y);
  g.fillStyle = CAFE_NUMBER_FILL;
  g.fillText(s, 0, y);
}

/**
 * Idle animation for a Café Classics piece at clock t (seconds, per-orb offset already applied).
 * frame: 0 rest, 1 / 4 accents (steam curls on the mug and kettle, small wobbles elsewhere), 2 / 3 glints.
 * Plus a gentle bob-squish (about ±1.8%). Each cycle has its own period per tier, so a tray never moves in lockstep.
 */
export function cafeClassicsIdle(t, tier) {
  const cyc = (off, per) => { const p = (t + off) % per; return p < 0 ? p + per : p; };
  const sp = cyc(1.3 + tier * 0.53, 5.1 + (tier % 3) * 0.6);
  const spark = sp < 0.22 ? 2 : sp < 0.44 ? 3 : 0;
  let accent;
  if (tier === 5 || tier === 9) {
    const p = cyc(tier * 0.37, 2.4);
    accent = p < 1.2 ? 1 : 4;
    if (cyc(0.9 + tier, 9.5) < 2.2) accent = 0;
  } else {
    const w = cyc(2.7 + tier * 0.71, 6.4 + (tier % 5) * 0.5);
    accent = w < 0.3 ? 1 : w < 0.6 ? 4 : 0;
  }
  const frame = spark || accent;
  const w = Math.sin(t * (1.7 + tier * 0.05));
  return { frame, sx: 1 + 0.018 * w, sy: 1 - 0.018 * w };
}
