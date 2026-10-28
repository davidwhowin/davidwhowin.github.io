// Cottage Garden orb skin (premium themed pack, DESIGN.md "Premium themed packs"). Procedural Canvas only.
//
// Freeform pieces: no disc or ring. Each tier IS the garden thing, a free-standing kawaii sticker that fills its
// cell: a green seed packet, a sprout in a terracotta pot, a white daisy, a red tulip, a lavender bunch tied with a
// ribbon, a big sunflower, a pink rose, a teal watering can full of blooms, a plump brown robin with an orange-red breast on a mossy twig and a garden gnome in a
// tall blue hat. Tiers read by silhouette AND by one dominant colour (GARDEN_COLORS). Same finish as the other
// packs: a crisp dark outline around the whole silhouette, a thin light rim on the top-left edge, a soft inner shade
// bottom-right, glossy highlights and a contact shadow. The art stays inside the cell footprint (about 1r).
//
// Painted ONCE per tier/size/frame into the orb sprite cache (orbArt.js). Five frames per tier:
//   0 rest, 1 blink, 2 sparkle (first glint), 3 sparkle (second glint), 4 sway (leaves and petals lean in a breeze).
// The idle bob is a transform in drawOrb, so animation never repaints; Calm / reduced motion freezes it.
// Texture detail comes from a seeded mulberry32 stream per tier, so every sprite of a tier is identical.
import { mulberry32 } from './rng.js';

const TAU = Math.PI * 2;

/** Dominant colour per tier (index 1..10). Ten distinct hues: the colour carries the tier. */
export const GARDEN_COLORS = [null, '#7cc85a', '#e07a44', '#f4f0e2', '#e8344a', '#a07ae0', '#ffc824', '#ff86b8', '#36b8aa', '#a8683c', '#4a62e0'];
/** Silhouette outline ink per tier: a deep shade of the dominant colour. */
const INKS = [null, '#1e4a10', '#5a2410', '#4a4630', '#5a0a16', '#2e1a5a', '#5a3a00', '#5a1438', '#063e3a', '#3a1e0a', '#141e5a'];

/** Main colour of a tier (particles, guides). */
export const gardenColor = (tier) => GARDEN_COLORS[Math.max(1, Math.min(10, tier | 0))];

/** Display names of the ten tiers (shop preview, merge popups). */
export const GARDEN_NAMES = [null, 'Seed packet', 'Sprout', 'Daisy', 'Tulip', 'Lavender bunch', 'Sunflower', 'Rose', 'Watering can', 'Robin', 'Garden gnome'];

// ------------------------------------------------------------------ helpers

function ell(g, x, y, rx, ry, rot = 0) { g.beginPath(); g.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU); }

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
  g.fillStyle = rad(g, x, y, 0, x, y, rx, [[0, `rgba(10,8,0,${a})`], [0.6, `rgba(10,8,0,${a * 0.5})`], [1, 'rgba(10,8,0,0)']]);
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

/** A soft glossy fill lit from the top left. P = { li, base, dk }. */
function gloss(g, x, y, w, h, P) {
  return rad(g, x - w * 0.35, y - h * 0.45, Math.min(w, h) * 0.05, x, y, Math.max(w, h) * 1.1, [[0, P.li], [0.55, P.base], [1, P.dk]]);
}
const pal = (li, base, dk, line) => ({ li, base, dk, line });
const LEAF = pal('#c8f0a0', '#5cb848', '#2a7424', '#1a4a14');

/** Inner detail line (the bold silhouette outline is added by the compositor). */
function edge(g, r, col, k = 1) {
  g.strokeStyle = col; g.lineWidth = Math.max(1, r * 0.024 * k); g.lineJoin = 'round'; g.lineCap = 'round';
  g.stroke();
}

/**
 * Kawaii face centred at (x, y); s = size unit (about the eye spacing).
 * o: { blink, iris, mouth: 'smile' | 'open' | 'o' | 'none', blush }
 */
function face(g, x, y, s, o = {}) {
  const ink = '#1c1408';
  const ex = s * 0.5, er = s * 0.2;
  g.save();
  g.translate(x, y);
  if (o.blush !== false) {
    g.fillStyle = 'rgba(255,96,120,0.5)';
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
      g.fillStyle = rad(g, sx * ex, er * 0.95, 0, sx * ex, er * 0.95, er * 1.25, [[0, o.iris || '#6a4a20'], [0.7, o.iris || '#6a4a20'], [1, 'rgba(0,0,0,0)']]);
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
  } else if (m === 'o') {
    ell(g, 0, my + s * 0.08, s * 0.08, s * 0.1); g.fill();
  } else if (m === 'smile') {
    g.beginPath(); g.arc(0, my - s * 0.04, s * 0.13, 0.18 * Math.PI, 0.82 * Math.PI); g.stroke();
  }
  g.restore();
}

/** A pointed leaf from (x, y) at angle a: length len, half width wd, with a midrib. */
function leaf(g, r, x, y, a, len, wd, P = LEAF) {
  g.save(); g.translate(x, y); g.rotate(a);
  g.beginPath(); g.moveTo(0, 0);
  g.quadraticCurveTo(len * 0.4, -wd * 1.25, len, 0);
  g.quadraticCurveTo(len * 0.4, wd * 1.25, 0, 0);
  g.closePath();
  g.fillStyle = lin(g, 0, -wd, 0, wd, [[0, P.li], [0.5, P.base], [1, P.dk]]); g.fill();
  g.strokeStyle = 'rgba(230,255,200,0.55)'; g.lineWidth = Math.max(0.8, r * 0.02);
  g.beginPath(); g.moveTo(len * 0.08, 0); g.quadraticCurveTo(len * 0.5, -wd * 0.1, len * 0.86, 0); g.stroke();
  g.restore();
}

/** A ring of n rounded petals around (x, y): inner radius r0, length len, half width wd. */
function petals(g, x, y, n, r0, len, wd, fill, rot = 0, tip = false) {
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * TAU;
    g.save(); g.translate(x, y); g.rotate(a);
    g.beginPath(); g.moveTo(r0, -wd * 0.5);
    if (tip) { g.quadraticCurveTo(r0 + len * 0.55, -wd * 1.2, r0 + len, 0); g.quadraticCurveTo(r0 + len * 0.55, wd * 1.2, r0, wd * 0.5); }
    else { g.bezierCurveTo(r0 + len * 0.6, -wd * 1.3, r0 + len * 1.08, -wd * 0.8, r0 + len, 0); g.bezierCurveTo(r0 + len * 1.08, wd * 0.8, r0 + len * 0.6, wd * 1.3, r0, wd * 0.5); }
    g.closePath();
    g.fillStyle = typeof fill === 'function' ? fill(g, r0, len, i) : fill; g.fill();
    g.restore();
  }
}

/** A tiny five-petal flower (decoration on the packet, can and robin twig). */
function blossom(g, x, y, s, col, mid = '#ffd84a') {
  g.fillStyle = col;
  for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i * TAU) / 5; ell(g, x + Math.cos(a) * s * 0.55, y + Math.sin(a) * s * 0.55, s * 0.5, s * 0.5); g.fill(); }
  g.fillStyle = mid; ell(g, x, y, s * 0.36, s * 0.36); g.fill();
}

// ------------------------------------------------------------------ tiers (art inside about 1r, base near +0.85r)

/** 1: a little green seed packet (crimped top, cream label with a flower picture, seeds peeking out). */
function t1Packet(g, r, f) {
  const C = pal('#dcf6c0', '#7cc85a', '#3c8a28', '#1e4a10');
  g.save(); g.rotate(f === 4 ? 0.1 : -0.06);
  const x0 = -r * 0.5, x1 = r * 0.5, y0 = -r * 0.6, y1 = r * 0.74;
  // body
  g.beginPath();
  g.moveTo(x0, y0);
  for (let i = 0; i <= 8; i++) g.lineTo(x0 + (x1 - x0) * (i / 8), y0 - (i % 2 ? r * 0.07 : 0)); // crimped top
  g.lineTo(x1, y1 - r * 0.08); g.quadraticCurveTo(x1, y1, x1 - r * 0.08, y1);
  g.lineTo(x0 + r * 0.08, y1); g.quadraticCurveTo(x0, y1, x0, y1 - r * 0.08);
  g.closePath();
  g.fillStyle = gloss(g, 0, 0, r * 0.5, r * 0.7, C); g.fill();
  // crimp band
  g.fillStyle = 'rgba(30,80,16,0.25)'; g.fillRect(x0, y0, x1 - x0, r * 0.1);
  // cream label with a flower picture
  g.beginPath(); g.rect(x0 + r * 0.1, -r * 0.42, (x1 - x0) - r * 0.2, r * 0.5);
  g.fillStyle = '#fff6dc'; g.fill(); edge(g, r, 'rgba(60,100,30,0.6)', 0.9);
  g.strokeStyle = '#4a9a34'; g.lineWidth = Math.max(1, r * 0.04);
  g.beginPath(); g.moveTo(0, -r * 0.0); g.lineTo(0, -r * 0.2); g.stroke();
  leaf(g, r, 0, -r * 0.04, -0.5, r * 0.14, r * 0.05);
  blossom(g, 0, -r * 0.24, r * 0.1, '#ff86b8');
  shine(g, -r * 0.3, -r * 0.48, r * 0.12, r * 0.06, -0.3, 0.7);
  face(g, 0, r * 0.36, r * 0.4, { blink: f === 1, mouth: 'smile', iris: '#3c7a20' });
  g.restore();
}

/** 2: a sprout in a terracotta pot (two round seedling leaves on a short stem, dark soil). */
function t2Sprout(g, r, f) {
  const P = pal('#ffc8a0', '#e07a44', '#a04620', '#5a2410');
  const sw = f === 4 ? 0.22 : 0;
  // stem and seedling leaves
  g.strokeStyle = '#4aa83a'; g.lineWidth = Math.max(1.4, r * 0.07); g.lineCap = 'round';
  g.beginPath(); g.moveTo(0, -r * 0.02); g.quadraticCurveTo(r * 0.04 + sw * r * 0.2, -r * 0.3, sw * r * 0.3, -r * 0.48); g.stroke();
  const tx = sw * r * 0.3, ty = -r * 0.48;
  for (const s of [-1, 1]) {
    g.save(); g.translate(tx, ty); g.rotate(s * (0.5 + sw * s * 0.6));
    ell(g, s * r * 0.24, -r * 0.08, r * 0.25, r * 0.15, s * -0.2);
    g.fillStyle = gloss(g, s * r * 0.24, -r * 0.08, r * 0.25, r * 0.15, LEAF); g.fill();
    g.strokeStyle = 'rgba(230,255,200,0.6)'; g.lineWidth = Math.max(0.8, r * 0.02);
    g.beginPath(); g.moveTo(s * r * 0.04, -r * 0.04); g.lineTo(s * r * 0.4, -r * 0.12); g.stroke();
    g.restore();
  }
  // pot body
  g.beginPath();
  g.moveTo(-r * 0.5, r * 0.1); g.lineTo(r * 0.5, r * 0.1);
  g.lineTo(r * 0.38, r * 0.78); g.quadraticCurveTo(r * 0.36, r * 0.84, r * 0.3, r * 0.84);
  g.lineTo(-r * 0.3, r * 0.84); g.quadraticCurveTo(-r * 0.36, r * 0.84, -r * 0.38, r * 0.78);
  g.closePath();
  g.fillStyle = gloss(g, 0, r * 0.46, r * 0.46, r * 0.4, P); g.fill();
  // rim
  g.beginPath(); g.rect(-r * 0.6, -r * 0.08, r * 1.2, r * 0.22);
  g.fillStyle = lin(g, 0, -r * 0.08, 0, r * 0.14, [[0, '#ffb084'], [0.5, '#e88050'], [1, '#b85a2c']]); g.fill();
  edge(g, r, 'rgba(110,40,14,0.5)', 0.9);
  // soil showing at the top of the rim
  ell(g, 0, -r * 0.08, r * 0.52, r * 0.07); g.fillStyle = '#4a2a14'; g.fill();
  shine(g, -r * 0.36, -r * 0.03, r * 0.14, r * 0.04, 0, 0.7);
  shine(g, -r * 0.28, r * 0.34, r * 0.06, r * 0.16, 0.1, 0.45);
  face(g, 0, r * 0.42, r * 0.4, { blink: f === 1, mouth: 'smile', iris: '#8a3a14' });
}

/** 3: a white daisy (twelve long petals, sunny yellow middle with the face, a leaf below). */
function t3Daisy(g, r, f) {
  const cy = -r * 0.06;
  const sw = f === 4 ? 0.12 : 0;
  // short stem and a leaf
  g.strokeStyle = '#4aa83a'; g.lineWidth = Math.max(1.4, r * 0.08); g.lineCap = 'round';
  g.beginPath(); g.moveTo(0, cy + r * 0.3); g.quadraticCurveTo(r * 0.06, r * 0.6, -r * 0.02, r * 0.86); g.stroke();
  leaf(g, r, r * 0.02, r * 0.66, -0.5 - sw, r * 0.36, r * 0.1);
  // petals: two layers, the back one a touch greyer so they read as separate
  petals(g, 0, cy, 12, r * 0.18, r * 0.52, r * 0.14, '#e6e2d2', 0.26 + sw);
  petals(g, 0, cy, 12, r * 0.16, r * 0.5, r * 0.14, (gg, r0, len) => lin(gg, r0, 0, r0 + len, 0, [[0, '#f2eee0'], [0.5, '#ffffff'], [1, '#fffdf4']]), sw);
  // yellow middle
  ell(g, 0, cy, r * 0.32, r * 0.3);
  g.fillStyle = gloss(g, 0, cy, r * 0.32, r * 0.3, pal('#fff6b0', '#ffd23a', '#d89a10', '#6a4a00')); g.fill();
  g.fillStyle = 'rgba(200,130,10,0.45)';
  for (let i = 0; i < 9; i++) { const a = i * 2.4; ell(g, Math.cos(a) * r * 0.22, cy + Math.sin(a) * r * 0.2, r * 0.025, r * 0.025); g.fill(); }
  shine(g, -r * 0.4, cy - r * 0.36, r * 0.14, r * 0.05, -0.8, 0.8);
  face(g, 0, cy + r * 0.02, r * 0.3, { blink: f === 1, mouth: 'smile', iris: '#a86a10' });
}

/** 4: a red tulip (closed cup of three petals on a stem with two long blade leaves). */
function t4Tulip(g, r, f) {
  const C = pal('#ffb0b8', '#e8344a', '#a01428', '#5a0a16');
  const sw = f === 4 ? 0.1 : 0;
  // stem and blade leaves
  g.strokeStyle = '#3e9a34'; g.lineWidth = Math.max(1.4, r * 0.08); g.lineCap = 'round';
  g.beginPath(); g.moveTo(sw * r, r * 0.1); g.quadraticCurveTo(0, r * 0.5, 0, r * 0.86); g.stroke();
  leaf(g, r, -r * 0.02, r * 0.86, -Math.PI / 2 - 0.62 - sw, r * 0.6, r * 0.13);
  leaf(g, r, r * 0.02, r * 0.86, -Math.PI / 2 + 0.66 - sw, r * 0.5, r * 0.12);
  g.save(); g.translate(sw * r, 0); g.rotate(sw * 0.6);
  // side petals (behind)
  for (const s of [-1, 1]) {
    g.beginPath();
    g.moveTo(s * r * 0.06, r * 0.22);
    g.bezierCurveTo(s * r * 0.66, r * 0.16, s * r * 0.6, -r * 0.5, s * r * 0.42, -r * 0.78);
    g.quadraticCurveTo(s * r * 0.2, -r * 0.42, 0, -r * 0.36);
    g.closePath();
    g.fillStyle = gloss(g, s * r * 0.3, -r * 0.2, r * 0.36, r * 0.5, pal('#ff8a98', '#d02a40', '#8a1020', '#5a0a16')); g.fill();
  }
  // front petal (the face sits on it)
  g.beginPath();
  g.moveTo(-r * 0.36, -r * 0.48);
  g.quadraticCurveTo(-r * 0.12, -r * 0.62, 0, -r * 0.82);
  g.quadraticCurveTo(r * 0.12, -r * 0.62, r * 0.36, -r * 0.48);
  g.bezierCurveTo(r * 0.5, -r * 0.1, r * 0.4, r * 0.22, 0, r * 0.24);
  g.bezierCurveTo(-r * 0.4, r * 0.22, -r * 0.5, -r * 0.1, -r * 0.36, -r * 0.48);
  g.closePath();
  g.fillStyle = gloss(g, 0, -r * 0.2, r * 0.42, r * 0.5, C); g.fill();
  g.strokeStyle = 'rgba(255,200,200,0.35)'; g.lineWidth = Math.max(1, r * 0.025);
  g.beginPath(); g.moveTo(0, -r * 0.7); g.quadraticCurveTo(-r * 0.03, -r * 0.5, 0, -r * 0.4); g.stroke();
  shine(g, -r * 0.22, -r * 0.42, r * 0.06, r * 0.16, 0.3, 0.75);
  face(g, 0, -r * 0.12, r * 0.36, { blink: f === 1, mouth: 'smile', iris: '#a01428' });
  g.restore();
}

/** 5: a lavender bunch (a fan of purple flower spikes tied with a cream ribbon bow, green stems below). */
function t5Lavender(g, r, f, rnd) {
  const sw = f === 4 ? 0.08 : 0;
  // stems below the bow
  g.strokeStyle = '#5a9a4a'; g.lineWidth = Math.max(1, r * 0.045); g.lineCap = 'round';
  for (const k of [-0.16, -0.06, 0.04, 0.14]) { g.beginPath(); g.moveTo(k * r * 0.5, r * 0.34); g.lineTo(k * r * 1.6, r * 0.86); g.stroke(); }
  // flower spikes fanning up from the bow
  const spikes = [-0.62, -0.32, 0, 0.32, 0.62];
  spikes.forEach((a0, i) => {
    const a = a0 * 0.95 + sw, len = r * (i === 2 ? 1.16 : 1.04 - Math.abs(a0) * 0.12);
    g.save(); g.translate(0, r * 0.3); g.rotate(a);
    g.strokeStyle = '#5a9a4a'; g.lineWidth = Math.max(1, r * 0.04);
    g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -len * 0.5); g.stroke();
    for (let k = 0; k < 9; k++) {
      const y = -len * (0.34 + k * 0.072), s = r * (0.13 - k * 0.008);
      for (const sx of [-1, 1]) {
        ell(g, sx * s * 0.55, y, s * 0.62, s * 0.5, sx * 0.4);
        g.fillStyle = (k + (sx > 0 ? 1 : 0)) % 2 ? '#8a5ad0' : '#b896f0'; g.fill();
      }
    }
    ell(g, 0, -len * 0.96, r * 0.04, r * 0.05); g.fillStyle = '#c8aaf8'; g.fill();
    g.restore();
  });
  // a soft lavender body behind the face so the bunch has a middle
  ell(g, 0, -r * 0.04, r * 0.3, r * 0.28);
  g.fillStyle = gloss(g, 0, -r * 0.04, r * 0.3, r * 0.28, pal('#e6d8ff', '#a07ae0', '#5e3aa8', '#2e1a5a')); g.fill();
  g.fillStyle = 'rgba(80,40,150,0.35)';
  for (let i = 0; i < 8; i++) { const a = rnd() * TAU, d = r * (0.16 + rnd() * 0.1); ell(g, Math.cos(a) * d, -r * 0.04 + Math.sin(a) * d * 0.9, r * 0.03, r * 0.026); g.fill(); }
  // ribbon bow
  g.fillStyle = lin(g, 0, r * 0.2, 0, r * 0.46, [[0, '#fff4e8'], [1, '#f0c8d0']]);
  for (const s of [-1, 1]) {
    g.beginPath(); g.moveTo(0, r * 0.32);
    g.quadraticCurveTo(s * r * 0.3, r * 0.12, s * r * 0.34, r * 0.3); g.quadraticCurveTo(s * r * 0.3, r * 0.46, 0, r * 0.32);
    g.fill();
    g.beginPath(); g.moveTo(s * r * 0.02, r * 0.34); g.lineTo(s * r * 0.2, r * 0.62); g.lineTo(s * r * 0.1, r * 0.6); g.lineTo(0, r * 0.38); g.closePath(); g.fill();
  }
  ell(g, 0, r * 0.32, r * 0.07, r * 0.06); g.fillStyle = '#f4b8c4'; g.fill();
  shine(g, -r * 0.16, -r * 0.2, r * 0.08, r * 0.04, -0.6, 0.7);
  face(g, 0, -r * 0.04, r * 0.28, { blink: f === 1, mouth: 'smile', iris: '#6a3ab8' });
}

/** 6: a big sunflower (pointed golden petals around a caramel seed disk with the face; leaves peek below). */
function t6Sunflower(g, r, f) {
  const sw = f === 4 ? 0.1 : 0;
  leaf(g, r, -r * 0.1, r * 0.62, Math.PI - 0.3 - sw, r * 0.42, r * 0.14);
  leaf(g, r, r * 0.1, r * 0.62, -0.3 + sw, r * 0.42, r * 0.14);
  const cy = -r * 0.04;
  petals(g, 0, cy, 16, r * 0.3, r * 0.56, r * 0.13, '#e8a010', 0.2 + sw, true);
  petals(g, 0, cy, 16, r * 0.3, r * 0.52, r * 0.13, (gg, r0, len) => lin(gg, r0, 0, r0 + len, 0, [[0, '#ffb81c'], [0.5, '#ffd640'], [1, '#ffe680']]), sw, true);
  // seed disk
  ell(g, 0, cy, r * 0.38, r * 0.37);
  g.fillStyle = gloss(g, 0, cy, r * 0.38, r * 0.37, pal('#e0aa66', '#b8783a', '#6a3e14', '#3a2008')); g.fill();
  g.save(); ell(g, 0, cy, r * 0.38, r * 0.37); g.clip();
  g.fillStyle = 'rgba(70,36,8,0.5)';
  for (let i = 0; i < 40; i++) { const a = i * 2.39996, d = r * 0.38 * Math.sqrt((i + 0.5) / 40); if (d < r * 0.24) continue; ell(g, Math.cos(a) * d, cy + Math.sin(a) * d, r * 0.022, r * 0.022); g.fill(); }
  g.restore();
  shine(g, -r * 0.18, cy - r * 0.22, r * 0.1, r * 0.05, -0.6, 0.6);
  shine(g, -r * 0.5, cy - r * 0.52, r * 0.12, r * 0.05, -0.8, 0.7);
  face(g, 0, cy + r * 0.02, r * 0.36, { blink: f === 1, mouth: 'open', iris: '#3a2008' });
}

/** 7: a pink rose (cupped layered petals with a spiral heart, two leaves below). */
function t7Rose(g, r, f) {
  const sw = f === 4 ? 0.14 : 0;
  leaf(g, r, -r * 0.08, r * 0.5, Math.PI - 0.5 - sw, r * 0.44, r * 0.15);
  leaf(g, r, r * 0.08, r * 0.52, -0.42 + sw, r * 0.44, r * 0.15);
  const cy = -r * 0.06;
  const P = pal('#ffe0ee', '#ff86b8', '#c8447e', '#5a1438');
  // outer petals
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * TAU) / 5 + 0.3;
    const x = Math.cos(a) * r * 0.4, y = cy + Math.sin(a) * r * 0.36;
    ell(g, x, y, r * 0.36, r * 0.32, a);
    g.fillStyle = gloss(g, x, y, r * 0.36, r * 0.32, pal('#ffc8de', '#f070a4', '#b03a6c', '#5a1438')); g.fill();
  }
  // the cup
  ell(g, 0, cy, r * 0.56, r * 0.52);
  g.fillStyle = gloss(g, 0, cy, r * 0.56, r * 0.52, P); g.fill();
  // spiral heart at the top of the cup
  g.strokeStyle = 'rgba(160,40,90,0.6)'; g.lineWidth = Math.max(1.1, r * 0.035); g.lineCap = 'round';
  g.beginPath();
  for (let k = 0; k <= 40; k++) {
    const t = k / 40, a = -Math.PI / 2 + t * TAU * 1.6, d = r * (0.03 + t * 0.2);
    const x = Math.cos(a) * d, y = cy - r * 0.26 + Math.sin(a) * d * 0.6;
    if (k) g.lineTo(x, y); else g.moveTo(x, y);
  }
  g.stroke();
  // petal edge lines curving round the cheeks
  g.strokeStyle = 'rgba(180,50,100,0.4)'; g.lineWidth = Math.max(1, r * 0.028);
  for (const s of [-1, 1]) { g.beginPath(); g.arc(s * r * 0.08, cy + r * 0.02, r * 0.46, s > 0 ? -0.4 : Math.PI - 0.9, s > 0 ? 0.9 : Math.PI + 0.4); g.stroke(); }
  shine(g, -r * 0.3, cy - r * 0.32, r * 0.14, r * 0.06, -0.6, 0.8);
  face(g, 0, cy + r * 0.1, r * 0.36, { blink: f === 1, mouth: 'smile', iris: '#b03a6c' });
}

/** 8: a teal watering can full of little blooms (round body, long spout with a rose head, arched handle). */
function t8Can(g, r, f) {
  const C = pal('#c4fff4', '#36b8aa', '#14786e', '#063e3a');
  const sw = f === 4 ? 0.12 : 0;
  // handle (behind, arching over the top left)
  g.strokeStyle = lin(g, 0, -r * 0.5, 0, r * 0.2, [[0, '#5ad0c2'], [1, '#1e8a7e']]); g.lineWidth = r * 0.1; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-r * 0.6, r * 0.2); g.bezierCurveTo(-r * 0.92, -r * 0.0, -r * 0.7, -r * 0.5, -r * 0.3, -r * 0.4); g.stroke();
  // blooms poking out of the top
  g.save(); g.translate(-r * 0.12, -r * 0.3); g.rotate(sw);
  g.strokeStyle = '#4aa83a'; g.lineWidth = Math.max(1, r * 0.04);
  for (const [x, y] of [[-0.18, -0.4], [0.06, -0.52], [0.26, -0.36]]) { g.beginPath(); g.moveTo(x * r * 0.4, 0); g.lineTo(x * r, y * r); g.stroke(); }
  leaf(g, r, 0, -r * 0.06, -Math.PI / 2 - 0.9, r * 0.24, r * 0.07);
  blossom(g, -r * 0.18, -r * 0.42, r * 0.12, '#ff86b8');
  blossom(g, r * 0.06, -r * 0.56, r * 0.13, '#ffffff', '#ffc824');
  blossom(g, r * 0.26, -r * 0.38, r * 0.11, '#ffd23a', '#e07a44');
  g.restore();
  // spout from the lower right up to a sprinkler rose
  g.beginPath(); g.moveTo(r * 0.32, r * 0.42); g.lineTo(r * 0.8, -r * 0.28); g.lineTo(r * 0.9, -r * 0.2); g.lineTo(r * 0.42, r * 0.56); g.closePath();
  g.fillStyle = lin(g, r * 0.3, 0, r * 0.9, 0, [[0, '#1e9a8e'], [1, '#5ad0c2']]); g.fill();
  g.save(); g.translate(r * 0.86, -r * 0.26); g.rotate(-0.95);
  ell(g, 0, 0, r * 0.15, r * 0.08); g.fillStyle = '#7ae0d4'; g.fill();
  g.fillStyle = 'rgba(6,62,58,0.6)';
  for (const k of [-0.08, 0, 0.08]) { ell(g, k * r, 0, r * 0.015, r * 0.015); g.fill(); }
  g.restore();
  // body
  g.beginPath();
  g.moveTo(-r * 0.6, -r * 0.24);
  g.lineTo(r * 0.36, -r * 0.24);
  g.bezierCurveTo(r * 0.5, r * 0.2, r * 0.48, r * 0.84, r * 0.26, r * 0.84);
  g.lineTo(-r * 0.5, r * 0.84);
  g.bezierCurveTo(-r * 0.72, r * 0.84, -r * 0.74, r * 0.2, -r * 0.6, -r * 0.24);
  g.closePath();
  g.fillStyle = gloss(g, -r * 0.12, r * 0.3, r * 0.56, r * 0.56, C); g.fill();
  // rim band and a painted flower stripe
  ell(g, -r * 0.12, -r * 0.24, r * 0.48, r * 0.08); g.fillStyle = '#14786e'; g.fill();
  g.beginPath(); g.rect(-r * 0.7, r * 0.62, r * 1.18, r * 0.07); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fill();
  shine(g, -r * 0.44, r * 0.04, r * 0.07, r * 0.22, 0.05, 0.6);
  face(g, -r * 0.12, r * 0.24, r * 0.4, { blink: f === 1, mouth: 'open', iris: '#0e6a60' });
}

/** 9: a plump garden robin (warm brown back and wings, orange-red breast, cream tummy) perched on a mossy twig. */
function t9Robin(g, r, f) {
  const B = pal('#e0a878', '#9a5a30', '#5a3014', '#3a1e0a');
  const sw = f === 4 ? 0.12 : 0;
  const cx = 0, cy = -r * 0.04;
  // mossy twig (the robin's perch), a little side shoot with a leaf on the right
  g.strokeStyle = lin(g, 0, r * 0.62, 0, r * 0.82, [[0, '#a0703e'], [1, '#5a3418']]); g.lineWidth = r * 0.12; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-r * 0.78, r * 0.76); g.quadraticCurveTo(0, r * 0.64, r * 0.8, r * 0.72); g.stroke();
  g.lineWidth = r * 0.06;
  g.beginPath(); g.moveTo(r * 0.56, r * 0.7); g.quadraticCurveTo(r * 0.7, r * 0.56, r * 0.8, r * 0.5); g.stroke();
  leaf(g, r, r * 0.78, r * 0.52, -0.9 + sw, r * 0.24, r * 0.08);
  g.fillStyle = '#7cb848';
  for (const [x, y, s] of [[-0.62, 0.7, 0.09], [-0.44, 0.68, 0.07], [0.36, 0.66, 0.08], [0.52, 0.67, 0.06]]) { ell(g, x * r, y * r, s * r, s * r * 0.6); g.fill(); }
  // tail, cocked up behind the body on the right
  g.save(); g.translate(r * 0.42, r * 0.22); g.rotate(-0.75 - sw * 0.5);
  g.beginPath(); g.moveTo(0, -r * 0.1); g.lineTo(r * 0.5, -r * 0.16); g.quadraticCurveTo(r * 0.58, 0, r * 0.5, r * 0.16); g.lineTo(0, r * 0.1); g.closePath();
  g.fillStyle = lin(g, 0, 0, r * 0.56, 0, [[0, '#6a3a18'], [1, '#9a5a30']]); g.fill();
  g.strokeStyle = 'rgba(58,30,10,0.5)'; g.lineWidth = Math.max(1, r * 0.022);
  g.beginPath(); g.moveTo(r * 0.14, 0); g.lineTo(r * 0.5, 0); g.stroke();
  g.restore();
  // little legs gripping the twig
  g.strokeStyle = '#7a4a26'; g.lineWidth = Math.max(1, r * 0.045);
  for (const x of [-0.14, 0.14]) {
    g.beginPath(); g.moveTo(x * r, r * 0.46); g.lineTo(x * r, r * 0.66); g.stroke();
    g.beginPath(); g.moveTo(x * r - r * 0.07, r * 0.69); g.lineTo(x * r, r * 0.65); g.lineTo(x * r + r * 0.07, r * 0.69); g.stroke();
  }
  // round body (head and body are one plump ball)
  ell(g, cx, cy, r * 0.62, r * 0.58);
  g.fillStyle = gloss(g, cx, cy, r * 0.62, r * 0.58, B); g.fill();
  g.save(); ell(g, cx, cy, r * 0.62, r * 0.58); g.clip();
  // cream tummy at the bottom, then the orange-red breast over it
  ell(g, cx, cy + r * 0.5, r * 0.36, r * 0.24);
  g.fillStyle = '#fbeedc'; g.fill();
  ell(g, cx, cy + r * 0.24, r * 0.4, r * 0.32);
  g.fillStyle = gloss(g, cx, cy + r * 0.24, r * 0.4, r * 0.32, pal('#ffc89a', '#f45a24', '#b8300e', '#5a1a06')); g.fill();
  g.restore();
  // wings folded at the sides (a soft flutter on the sway frame)
  for (const s of [-1, 1]) {
    g.save(); g.translate(s * r * 0.5, cy + r * 0.12); g.rotate(s * (0.28 + sw));
    ell(g, 0, 0, r * 0.17, r * 0.3);
    g.fillStyle = gloss(g, 0, 0, r * 0.17, r * 0.3, pal('#c88a58', '#7a4520', '#4a2610', '#3a1e0a')); g.fill();
    g.strokeStyle = 'rgba(40,20,6,0.45)'; g.lineWidth = Math.max(1, r * 0.02);
    for (const k of [-0.05, 0.05]) { g.beginPath(); g.moveTo(k * r, r * 0.04); g.quadraticCurveTo(k * r * 1.4, r * 0.18, k * r * 0.4, r * 0.26); g.stroke(); }
    g.restore();
  }
  // a little head tuft
  g.fillStyle = '#8a5028';
  ell(g, r * 0.02, cy - r * 0.62, r * 0.05, r * 0.11, 0.3); g.fill();
  ell(g, r * 0.1, cy - r * 0.6, r * 0.04, r * 0.09, 0.8); g.fill();
  // a tiny blossom tucked by the tuft
  leaf(g, r, -r * 0.3, cy - r * 0.5, -2.5, r * 0.18, r * 0.06);
  blossom(g, -r * 0.3, cy - r * 0.5, r * 0.1, '#ffffff', '#ffc824');
  shine(g, -r * 0.24, cy - r * 0.34, r * 0.16, r * 0.06, -0.6, 0.6);
  face(g, 0, cy - r * 0.12, r * 0.38, { blink: f === 1, mouth: 'none', iris: '#5a3014' });
  // tiny beak between the eyes
  g.beginPath(); g.moveTo(-r * 0.07, cy - r * 0.06); g.quadraticCurveTo(0, cy - r * 0.1, r * 0.07, cy - r * 0.06); g.lineTo(0, cy + r * 0.06); g.closePath();
  g.fillStyle = lin(g, 0, cy - r * 0.1, 0, cy + r * 0.06, [[0, '#6a5040'], [1, '#2a1a10']]); g.fill();
}

/** 10: a garden gnome gardener (tall curly blue hat, rosy cheeks, big white beard, blue tunic, a little trowel). */
function t10Gnome(g, r, f) {
  const H = pal('#b8c4ff', '#4a62e0', '#24349a', '#141e5a');
  const sw = f === 4 ? 0.14 : 0;
  // boots
  g.fillStyle = '#5a3418';
  for (const s of [-1, 1]) { ell(g, s * r * 0.2, r * 0.8, r * 0.17, r * 0.08); g.fill(); }
  // tunic
  g.beginPath();
  g.moveTo(-r * 0.3, r * 0.06); g.lineTo(r * 0.3, r * 0.06);
  g.quadraticCurveTo(r * 0.5, r * 0.5, r * 0.44, r * 0.78); g.lineTo(-r * 0.44, r * 0.78);
  g.quadraticCurveTo(-r * 0.5, r * 0.5, -r * 0.3, r * 0.06); g.closePath();
  g.fillStyle = gloss(g, 0, r * 0.42, r * 0.44, r * 0.4, pal('#9ac8ff', '#3a88e0', '#1a4a9a', '#141e5a')); g.fill();
  g.fillStyle = '#6a3e1e'; g.fillRect(-r * 0.46, r * 0.54, r * 0.92, r * 0.07);
  g.fillStyle = '#ffd23a'; g.fillRect(-r * 0.06, r * 0.53, r * 0.12, r * 0.09);
  // a little trowel held out to the right
  g.save(); g.translate(r * 0.46, r * 0.42); g.rotate(-0.6 + sw);
  g.fillStyle = '#8a5a30'; g.fillRect(-r * 0.03, -r * 0.02, r * 0.06, r * 0.16);
  g.beginPath(); g.moveTo(-r * 0.08, -r * 0.02); g.quadraticCurveTo(-r * 0.08, -r * 0.24, 0, -r * 0.3); g.quadraticCurveTo(r * 0.08, -r * 0.24, r * 0.08, -r * 0.02); g.closePath();
  g.fillStyle = lin(g, -r * 0.08, 0, r * 0.08, 0, [[0, '#e8eef4'], [1, '#98a4b0']]); g.fill();
  g.restore();
  // hands
  g.fillStyle = '#ffd2b4';
  for (const s of [-1, 1]) { ell(g, s * r * 0.42, r * 0.44, r * 0.08, r * 0.08); g.fill(); }
  // face (skin)
  ell(g, 0, -r * 0.08, r * 0.3, r * 0.24);
  g.fillStyle = gloss(g, 0, -r * 0.08, r * 0.3, r * 0.24, pal('#fff0e4', '#ffd2b4', '#e0a080', '#5a3020')); g.fill();
  // tall curly hat (tip bends with the breeze on frame 4)
  g.beginPath();
  g.moveTo(-r * 0.4, -r * 0.18);
  g.bezierCurveTo(-r * 0.36, -r * 0.6, -r * 0.1, -r * 0.84, r * (0.2 + sw), -r * 0.96);
  g.quadraticCurveTo(r * (0.3 + sw), -r * 0.96, r * (0.26 + sw), -r * 0.88);
  g.bezierCurveTo(r * 0.12, -r * 0.7, r * 0.34, -r * 0.5, r * 0.4, -r * 0.18);
  g.quadraticCurveTo(0, -r * 0.08, -r * 0.4, -r * 0.18);
  g.closePath();
  g.fillStyle = gloss(g, 0, -r * 0.5, r * 0.4, r * 0.46, H); g.fill();
  g.beginPath(); g.moveTo(-r * 0.42, -r * 0.2); g.quadraticCurveTo(0, -r * 0.3, r * 0.42, -r * 0.2); g.quadraticCurveTo(0, -r * 0.08, -r * 0.42, -r * 0.2); g.closePath();
  g.fillStyle = '#24349a'; g.fill();
  // eyes and blush (the beard hides the mouth)
  face(g, 0, -r * 0.08, r * 0.3, { blink: f === 1, mouth: 'none', iris: '#24349a' });
  // big white beard
  g.beginPath();
  g.moveTo(-r * 0.3, r * 0.0);
  g.quadraticCurveTo(-r * 0.36, r * 0.36, -r * 0.08, r * 0.52);
  g.quadraticCurveTo(0, r * 0.6, r * 0.08, r * 0.52);
  g.quadraticCurveTo(r * 0.36, r * 0.36, r * 0.3, r * 0.0);
  g.quadraticCurveTo(r * 0.14, r * 0.12, 0, r * 0.08);
  g.quadraticCurveTo(-r * 0.14, r * 0.12, -r * 0.3, r * 0.0);
  g.closePath();
  g.fillStyle = gloss(g, 0, r * 0.26, r * 0.3, r * 0.3, pal('#ffffff', '#f4f2ec', '#c8c4b8', '#5a5850')); g.fill();
  g.strokeStyle = 'rgba(150,146,130,0.5)'; g.lineWidth = Math.max(1, r * 0.022);
  for (const k of [-0.12, 0, 0.12]) { g.beginPath(); g.moveTo(k * r, r * 0.16); g.quadraticCurveTo(k * r * 1.3, r * 0.32, k * r * 0.6, r * 0.46); g.stroke(); }
  // round nose
  ell(g, 0, r * 0.04, r * 0.08, r * 0.07);
  g.fillStyle = gloss(g, 0, r * 0.04, r * 0.08, r * 0.07, pal('#ffd8d0', '#ff9a8a', '#d06050', '#5a2010')); g.fill();
  shine(g, -r * 0.18, -r * 0.56, r * 0.06, r * 0.16, 0.5, 0.7);
}

const TIERS = [null, t1Packet, t2Sprout, t3Daisy, t4Tulip, t5Lavender, t6Sunflower, t7Rose, t8Can, t9Robin, t10Gnome];

/** Glint positions per tier (units of r): frame 2 lights set A, frame 3 set B. Drawn on top, never outlined. */
const GLINTS = [null,
  [[[-0.32, -0.5, 0.14]], [[0.36, 0.5, 0.11]]],
  [[[-0.4, -0.04, 0.14]], [[0.3, -0.56, 0.11]]],
  [[[-0.42, -0.42, 0.14]], [[0.5, 0.1, 0.11], [0.0, -0.66, 0.08]]],
  [[[-0.22, -0.46, 0.15]], [[0.42, -0.7, 0.11], [0.26, 0.1, 0.08]]],
  [[[-0.22, -0.36, 0.14]], [[0.4, -0.8, 0.11], [-0.5, -0.66, 0.08]]],
  [[[-0.48, -0.5, 0.15]], [[0.56, -0.4, 0.12], [-0.2, 0.62, 0.08]]],
  [[[-0.32, -0.4, 0.15]], [[0.48, -0.2, 0.12], [-0.6, 0.0, 0.08]]],
  [[[-0.44, 0.0, 0.15]], [[0.86, -0.3, 0.12], [0.06, -0.86, 0.08]]],
  [[[-0.3, -0.12, 0.15]], [[0.6, 0.1, 0.11], [-0.42, -0.42, 0.09]]],
  [[[-0.18, -0.58, 0.15], [0.26, -0.92, 0.1]], [[0.46, 0.2, 0.12], [-0.5, 0.3, 0.1]]],
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
 * Paint one Cottage Garden piece centred at the origin, radius r (CSS px). frame: see the file header.
 * The piece is painted into an offscreen layer first so the outline, rim light and inner shade follow its exact
 * silhouette. dpr: device pixel ratio of the target (the sprite cache passes it).
 */
export function drawGardenPiece(g, r, tier, frame = 0, dpr = 1) {
  tier = Math.max(1, Math.min(10, tier | 0));
  frame = frame | 0;
  const rnd = mulberry32((0x6a2de + tier * 7919) >>> 0);
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
  if (tier === 10) { // a warm sunny glow behind the gnome (not outlined)
    g.save();
    g.fillStyle = rad(g, 0, 0, r * 0.2, 0, 0, r * 1.05, [[0, 'rgba(255,230,150,0.5)'], [1, 'rgba(255,230,150,0)']]);
    g.beginPath(); g.arc(0, 0, r * 1.05, 0, TAU); g.fill();
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
  g.globalAlpha = tier === 3 ? 0.35 : 0.55;
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
 * Idle animation for a Cottage Garden piece at clock t (seconds, per-orb offset already applied).
 * frame: 0 rest, 1 blink, 2/3 sparkle glints, 4 sway. Plus a gentle breezy squish (about ±2%).
 * Each cycle has its own period per tier, so a border of flowers never moves in lockstep.
 */
export function gardenIdle(t, tier) {
  const cyc = (off, per) => { const p = (t + off) % per; return p < 0 ? p + per : p; };
  const blink = cyc(0.7, 4.3 + (tier % 4) * 0.4) < 0.14;
  const sp = cyc(1.3 + tier * 0.53, 5.1 + (tier % 3) * 0.6);
  const spark = sp < 0.22 ? 2 : sp < 0.44 ? 3 : 0;
  const sw = cyc(2.1 + tier * 0.71, 5.9 + (tier % 5) * 0.5) < 0.36;
  const frame = blink ? 1 : spark || (sw ? 4 : 0);
  const w = Math.sin(t * (1.7 + tier * 0.05)) * (sw ? 1.1 : 1);
  return { frame, sx: 1 + 0.02 * w, sy: 1 - 0.02 * w };
}
