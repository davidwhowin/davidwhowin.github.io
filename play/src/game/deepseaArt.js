// Deep Sea orb skin (premium themed pack, DESIGN.md "Premium themed packs"). Procedural Canvas only.
//
// Freeform pieces: no disc or ring. Each tier IS the sea creature, a free-standing kawaii shape that fills its
// cell like a candy in a match-3: a glowing plankton speck, coral shrimp, orange clownfish, yellow pufferfish,
// teal seahorse, pink jellyfish, green sea turtle, raspberry octopus, violet manta ray and a big blue whale.
// Tiers read by silhouette AND by one dominant colour (SEA_COLORS). Same finish as the other packs: a crisp dark
// outline around the whole silhouette, a thin light rim on the top-left edge, a soft inner shade bottom-right,
// glossy highlights and a contact shadow. The art stays inside the cell footprint (about 1r).
//
// Painted ONCE per tier/size/frame into the orb sprite cache (orbArt.js). Five frames per tier:
//   0 rest, 1 blink, 2 sparkle (first glint), 3 sparkle (second glint), 4 swish (fins / tentacles sway).
// The idle bob is a transform in drawOrb, so animation never repaints; Calm / reduced motion freezes it.
// Texture detail comes from a seeded mulberry32 stream per tier, so every sprite of a tier is identical.
import { mulberry32 } from './rng.js';

const TAU = Math.PI * 2;

/** Dominant colour per tier (index 1..10). Ten distinct hues: the colour carries the tier. */
export const SEA_COLORS = [null, '#b6ec4a', '#ff7a5c', '#ff9a1e', '#ffd83a', '#2cc4b4', '#ff96d6', '#46b45a', '#e03c64', '#7a5ce0', '#3a8cf0'];
/** Silhouette outline ink per tier: a deep shade of the dominant colour. */
const INKS = [null, '#2a4406', '#5a1408', '#4e2400', '#4e3a00', '#063e3a', '#5a1446', '#0e3a16', '#4a0618', '#22125a', '#0a2a5a'];

/** Main colour of a tier (particles, guides). */
export const seaColor = (tier) => SEA_COLORS[Math.max(1, Math.min(10, tier | 0))];

/** Display names of the ten tiers (shop preview, merge popups). */
export const SEA_NAMES = [null, 'Plankton', 'Shrimp', 'Clownfish', 'Pufferfish', 'Seahorse', 'Jellyfish', 'Sea turtle', 'Octopus', 'Manta ray', 'Whale'];

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
  g.fillStyle = rad(g, x, y, 0, x, y, rx, [[0, `rgba(0,6,16,${a})`], [0.6, `rgba(0,6,16,${a * 0.5})`], [1, 'rgba(0,6,16,0)']]);
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

/** Inner detail line (the bold silhouette outline is added by the compositor). */
function edge(g, r, col, k = 1) {
  g.strokeStyle = col; g.lineWidth = Math.max(1, r * 0.024 * k); g.lineJoin = 'round'; g.lineCap = 'round';
  g.stroke();
}

/**
 * Kawaii face centred at (x, y); s = size unit (about the eye spacing).
 * o: { blink, iris, mouth: 'smile' | 'open' | 'o', blush }
 */
function face(g, x, y, s, o = {}) {
  const ink = '#10182c';
  const ex = s * 0.5, er = s * 0.2;
  g.save();
  g.translate(x, y);
  if (o.blush !== false) {
    g.fillStyle = 'rgba(255,96,140,0.5)';
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
      g.fillStyle = rad(g, sx * ex, er * 0.95, 0, sx * ex, er * 0.95, er * 1.25, [[0, o.iris || '#3a8ad8'], [0.7, o.iris || '#3a8ad8'], [1, 'rgba(0,0,0,0)']]);
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
  } else {
    g.beginPath(); g.arc(0, my - s * 0.04, s * 0.13, 0.18 * Math.PI, 0.82 * Math.PI); g.stroke();
  }
  g.restore();
}

/** A fin: a soft fan from (x, y) pointing at angle a, length len, half-spread sp (radians), with ray lines. */
function fin(g, r, x, y, a, len, sp, P) {
  g.save(); g.translate(x, y); g.rotate(a);
  g.beginPath(); g.moveTo(0, 0);
  g.quadraticCurveTo(len * 0.7, -Math.tan(sp) * len * 1.1, len, -Math.tan(sp) * len * 0.5);
  g.quadraticCurveTo(len * 1.12, 0, len, Math.tan(sp) * len * 0.5);
  g.quadraticCurveTo(len * 0.7, Math.tan(sp) * len * 1.1, 0, 0);
  g.closePath();
  g.fillStyle = lin(g, 0, 0, len, 0, [[0, P.base], [1, P.li]]); g.fill();
  g.strokeStyle = P.line; g.lineWidth = Math.max(0.8, r * 0.016); g.globalAlpha = 0.55;
  for (const k of [-0.5, 0, 0.5]) { g.beginPath(); g.moveTo(len * 0.12, 0); g.lineTo(len * 0.88, Math.tan(sp) * len * 0.75 * k); g.stroke(); }
  g.restore();
}

// ------------------------------------------------------------------ tiers (art inside about 1r, base near +0.85r)

/** 1: a glowing plankton speck (small, round, soft cilia). */
function t1Plankton(g, r, f) {
  const cy = r * 0.24, R = r * 0.58;
  const C = pal('#f4ffc8', '#b6ec4a', '#5e9614', '#3c6a0a');
  const n = 12, sw = f === 4 ? 0.14 : 0;
  g.fillStyle = '#9ad43a';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + sw * Math.sin(i * 1.7);
    ell(g, Math.cos(a) * R * 1.08, cy + Math.sin(a) * R * 1.02, R * 0.2, R * 0.09, a); g.fill();
  }
  ell(g, 0, cy, R, R * 0.96);
  g.fillStyle = gloss(g, 0, cy, R, R, C); g.fill();
  // inner glow and specks (a little living light)
  g.fillStyle = rad(g, 0, cy + R * 0.1, 0, 0, cy + R * 0.1, R * 0.8, [[0, 'rgba(255,255,210,0.55)'], [1, 'rgba(255,255,210,0)']]);
  ell(g, 0, cy + R * 0.1, R * 0.8, R * 0.7); g.fill();
  g.fillStyle = 'rgba(90,150,20,0.45)';
  for (const [x, y, s] of [[-0.62, -0.1, 0.08], [0.6, -0.28, 0.07], [0.5, 0.48, 0.06], [-0.4, 0.56, 0.07]]) { ell(g, x * R, cy + y * R, s * R, s * R); g.fill(); }
  shine(g, -R * 0.42, cy - R * 0.5, R * 0.26, R * 0.14, -0.6, 0.85);
  face(g, 0, cy + R * 0.06, R * 0.66, { blink: f === 1, mouth: 'smile', iris: '#5a9a1a' });
}

/** 2: a curled coral shrimp (comma silhouette, banded tail, feelers). */
function t2Shrimp(g, r, f) {
  const C = pal('#ffd8c8', '#ff7a5c', '#c0382a', '#7a1a10');
  // feelers first (behind the head)
  g.strokeStyle = '#ff9a7e'; g.lineWidth = Math.max(1.2, r * 0.045); g.lineCap = 'round';
  g.beginPath(); g.moveTo(-r * 0.36, -r * 0.42); g.quadraticCurveTo(-r * 0.56, -r * 0.74, -r * 0.8, -r * 0.78); g.stroke();
  g.beginPath(); g.moveTo(-r * 0.18, -r * 0.52); g.quadraticCurveTo(-r * 0.24, -r * 0.8, -r * 0.5, -r * 0.9); g.stroke();
  // tail fan
  const flick = f === 4 ? 0.28 : 0;
  g.save(); g.translate(r * 0.08, r * 0.7); g.rotate(-0.2 + flick);
  g.fillStyle = gloss(g, 0, 0, r * 0.3, r * 0.2, C);
  for (const a of [-0.55, 0, 0.55]) { ell(g, -Math.sin(a) * r * 0.16 - r * 0.14, Math.cos(a) * r * 0.04, r * 0.2, r * 0.1, Math.PI + a * 0.8); g.fill(); }
  g.restore();
  // little legs tucked into the curl
  g.strokeStyle = '#e8604a'; g.lineWidth = Math.max(1, r * 0.04);
  for (const [x, y] of [[0.0, 0.2], [0.12, 0.32], [0.22, 0.44]]) { g.beginPath(); g.moveTo(x * r, y * r); g.lineTo((x - 0.14) * r, (y + 0.1) * r); g.stroke(); }
  // segments, tail end to head
  const segs = [[0.26, 0.6, 0.19, 0.15], [0.46, 0.42, 0.22, 0.19], [0.54, 0.14, 0.25, 0.22], [0.42, -0.14, 0.28, 0.25]];
  for (const [x, y, rx, ry] of segs) {
    ell(g, x * r, y * r, rx * r, ry * r, Math.atan2(y, x) + Math.PI / 2);
    g.fillStyle = gloss(g, x * r, y * r, rx * r, ry * r, C); g.fill();
    edge(g, r, 'rgba(150,40,24,0.45)', 0.8);
    g.fillStyle = 'rgba(255,236,220,0.5)';
    ell(g, x * r - rx * r * 0.2, y * r - ry * r * 0.35, rx * r * 0.5, ry * r * 0.22, Math.atan2(y, x) + Math.PI / 2); g.fill();
  }
  // head
  ell(g, -r * 0.14, -r * 0.14, r * 0.46, r * 0.42);
  g.fillStyle = gloss(g, -r * 0.14, -r * 0.14, r * 0.46, r * 0.42, C); g.fill();
  // little rostrum spike on the brow
  g.beginPath(); g.moveTo(-r * 0.36, -r * 0.46); g.quadraticCurveTo(-r * 0.58, -r * 0.6, -r * 0.62, -r * 0.5); g.quadraticCurveTo(-r * 0.5, -r * 0.44, -r * 0.3, -r * 0.38); g.closePath();
  g.fillStyle = '#ff9a7e'; g.fill();
  shine(g, -r * 0.34, -r * 0.36, r * 0.14, r * 0.08, -0.6, 0.8);
  face(g, -r * 0.14, -r * 0.1, r * 0.38, { blink: f === 1, mouth: 'smile', iris: '#c05030' });
}

/** 3: a clownfish (orange, three white bands with dark edges, round fins). */
function t3Clownfish(g, r, f) {
  const C = pal('#ffd49a', '#ff9a1e', '#c05a06', '#4e2400');
  const FN = pal('#ffc070', '#ff8a10', '#b04e04', '#2a1000');
  const sw = f === 4 ? 0.22 : 0;
  // tail
  g.save(); g.translate(-r * 0.62, r * 0.06); g.rotate(sw);
  g.beginPath(); g.moveTo(r * 0.1, 0);
  g.quadraticCurveTo(-r * 0.12, -r * 0.42, -r * 0.34, -r * 0.36);
  g.quadraticCurveTo(-r * 0.24, 0, -r * 0.34, r * 0.36);
  g.quadraticCurveTo(-r * 0.12, r * 0.42, r * 0.1, 0);
  g.fillStyle = lin(g, 0, 0, -r * 0.34, 0, [[0, FN.base], [0.75, FN.li], [0.86, '#ffffff'], [0.9, '#1a0a00']]); g.fill();
  g.restore();
  // dorsal + belly fins
  fin(g, r, -r * 0.08, -r * 0.42, -Math.PI / 2 - 0.35 + sw * 0.3, r * 0.34, 0.6, FN);
  fin(g, r, -r * 0.06, r * 0.5, Math.PI / 2 + 0.3, r * 0.26, 0.5, FN);
  // body
  ell(g, r * 0.06, r * 0.04, r * 0.74, r * 0.56);
  g.fillStyle = gloss(g, r * 0.06, r * 0.04, r * 0.74, r * 0.56, C); g.fill();
  g.save(); ell(g, r * 0.06, r * 0.04, r * 0.74, r * 0.56); g.clip();
  // white bands with dark borders
  for (const [x, w] of [[0.18, 0.13], [-0.32, 0.12], [-0.66, 0.08]]) {
    g.beginPath();
    g.moveTo((x - w) * r, -r * 0.7);
    g.quadraticCurveTo((x - w + 0.12) * r, 0, (x - w) * r, r * 0.7);
    g.lineTo((x + w) * r, r * 0.7);
    g.quadraticCurveTo((x + w + 0.12) * r, 0, (x + w) * r, -r * 0.7);
    g.closePath();
    g.fillStyle = '#ffffff'; g.fill();
    g.strokeStyle = '#2a1000'; g.lineWidth = Math.max(1.2, r * 0.045); g.stroke();
  }
  g.restore();
  // pectoral fin
  fin(g, r, r * 0.12, r * 0.3, 2.4 - sw, r * 0.22, 0.45, FN);
  shine(g, -r * 0.08, -r * 0.3, r * 0.3, r * 0.1, -0.15, 0.6);
  face(g, r * 0.48, -r * 0.02, r * 0.32, { blink: f === 1, mouth: 'smile', iris: '#c06010' });
}

/** 4: a puffed-up pufferfish (round, soft spikes, puffy cheeks, little "o" mouth). */
function t4Puffer(g, r, f) {
  const C = pal('#fff6c0', '#ffd83a', '#c8960a', '#5a3e00');
  const cy = r * 0.06, R = r * 0.72;
  // side fins (flap on frame 4)
  const fl = f === 4 ? 0.35 : 0;
  fin(g, r, -R * 0.96, cy + r * 0.12, Math.PI + 0.25 + fl, r * 0.24, 0.55, pal('#fff2a8', '#ffc828', '#b88200', '#7a5000'));
  fin(g, r, R * 0.96, cy + r * 0.12, -0.25 - fl, r * 0.24, 0.55, pal('#fff2a8', '#ffc828', '#b88200', '#7a5000'));
  // soft spikes around the top and sides
  g.fillStyle = '#f2c020';
  for (let i = 0; i < 13; i++) {
    const a = Math.PI * (1.02 + i * 0.075);
    const bx = Math.cos(a) * R * 0.92, by = cy + Math.sin(a) * R * 0.92;
    const tx = Math.cos(a) * R * 1.16, ty = cy + Math.sin(a) * R * 1.16;
    const px = -Math.sin(a) * R * 0.1, py = Math.cos(a) * R * 0.1;
    g.beginPath(); g.moveTo(bx + px, by + py); g.quadraticCurveTo(tx, ty, tx, ty); g.lineTo(bx - px, by - py); g.closePath(); g.fill();
  }
  ell(g, 0, cy, R, R * 0.97);
  g.fillStyle = gloss(g, 0, cy, R, R, C); g.fill();
  // pale belly
  g.save(); ell(g, 0, cy, R, R * 0.97); g.clip();
  g.fillStyle = 'rgba(255,252,232,0.85)'; ell(g, 0, cy + R * 0.72, R * 0.9, R * 0.5); g.fill();
  // a few brown freckles on top
  g.fillStyle = 'rgba(170,110,20,0.55)';
  for (const [x, y, s] of [[-0.36, -0.6, 0.08], [0.0, -0.74, 0.07], [0.36, -0.58, 0.08], [-0.62, -0.28, 0.06], [0.62, -0.26, 0.06]]) { ell(g, x * R, cy + y * R, s * R, s * R * 0.85); g.fill(); }
  g.restore();
  shine(g, -R * 0.42, cy - R * 0.46, R * 0.26, R * 0.14, -0.7, 0.85);
  face(g, 0, cy + R * 0.06, R * 0.62, { blink: f === 1, mouth: 'o', iris: '#c88a10' });
}

/** 5: a teal seahorse (S-curve body, snout, crown, curled tail, back fin). */
function t5Seahorse(g, r, f) {
  const C = pal('#c4fff4', '#2cc4b4', '#0a7a70', '#063e3a');
  g.save(); g.scale(1.1, 1.08); // the upright silhouette reads small otherwise
  // curled tail
  g.strokeStyle = lin(g, 0, r * 0.2, 0, r * 0.85, [[0, '#26b4a6'], [1, '#128a80']]);
  g.lineWidth = r * 0.2; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-r * 0.04, r * 0.26);
  g.bezierCurveTo(-r * 0.2, r * 0.6, -r * 0.02, r * 0.84, r * 0.2, r * 0.76);
  g.bezierCurveTo(r * 0.36, r * 0.7, r * 0.34, r * 0.5, r * 0.18, r * 0.52);
  g.stroke();
  // back fin (flutters on frame 4)
  fin(g, r, -r * 0.24, -r * 0.02, Math.PI + (f === 4 ? 0.3 : 0.05), r * 0.3, 0.6, pal('#e0fffa', '#7ae8dc', '#2ab0a2', '#0a6a62'));
  // belly, neck, head
  ell(g, 0, r * 0.06, r * 0.32, r * 0.38, -0.15);
  g.fillStyle = gloss(g, 0, r * 0.06, r * 0.32, r * 0.38, C); g.fill();
  ell(g, -r * 0.04, -r * 0.3, r * 0.2, r * 0.26, 0.25);
  g.fillStyle = gloss(g, -r * 0.04, -r * 0.3, r * 0.2, r * 0.26, C); g.fill();
  // snout
  g.beginPath(); g.moveTo(r * 0.2, -r * 0.6); g.quadraticCurveTo(r * 0.44, -r * 0.6, r * 0.6, -r * 0.6);
  g.quadraticCurveTo(r * 0.7, -r * 0.52, r * 0.6, -r * 0.44); g.quadraticCurveTo(r * 0.44, -r * 0.46, r * 0.2, -r * 0.42); g.closePath();
  g.fillStyle = '#34ccbc'; g.fill();
  // crown nubs
  g.fillStyle = '#5ae0d0';
  for (const [x, y] of [[-0.12, -0.8], [0.04, -0.86], [0.2, -0.8]]) { ell(g, x * r, y * r, r * 0.07, r * 0.08); g.fill(); }
  ell(g, r * 0.04, -r * 0.54, r * 0.3, r * 0.27);
  g.fillStyle = gloss(g, r * 0.04, -r * 0.54, r * 0.3, r * 0.27, C); g.fill();
  // belly ridges
  g.strokeStyle = 'rgba(220,255,248,0.7)'; g.lineWidth = Math.max(1, r * 0.03);
  for (const y of [-0.06, 0.08, 0.22]) { g.beginPath(); g.arc(r * 0.12, y * r, r * 0.16, -0.3, 0.9); g.stroke(); }
  shine(g, -r * 0.1, -r * 0.68, r * 0.12, r * 0.06, -0.5, 0.8);
  shine(g, -r * 0.14, -r * 0.06, r * 0.07, r * 0.14, 0, 0.5);
  face(g, r * 0.04, -r * 0.52, r * 0.3, { blink: f === 1, mouth: 'smile', iris: '#0a8a80' });
  g.restore();
}

/** 6: a pink jellyfish (domed bell, scalloped skirt, wavy tentacles). */
function t6Jelly(g, r, f, rnd) {
  const C = pal('#fff0fa', '#ff96d6', '#c8489c', '#5a1446');
  const ph = f === 4 ? 1.2 : 0;
  // tentacles
  g.lineCap = 'round';
  for (let i = 0; i < 5; i++) {
    const x0 = (-0.44 + i * 0.22) * r, y0 = r * 0.08;
    g.strokeStyle = i % 2 ? '#ffb4e2' : '#f084c8'; g.lineWidth = r * (i === 2 ? 0.1 : 0.075);
    g.beginPath(); g.moveTo(x0, y0);
    const amp = r * 0.08, len = r * (0.66 + (i % 2) * 0.1 + rnd() * 0.04);
    g.bezierCurveTo(x0 + Math.sin(i + ph) * amp * 2, y0 + len * 0.33, x0 - Math.sin(i + ph) * amp * 2, y0 + len * 0.66, x0 + Math.sin(i * 2 + ph) * amp, y0 + len);
    g.stroke();
  }
  // bell
  const by = r * 0.04;
  g.beginPath();
  g.moveTo(-r * 0.74, by);
  g.bezierCurveTo(-r * 0.78, -r * 0.84, r * 0.78, -r * 0.84, r * 0.74, by);
  for (let i = 0; i < 5; i++) { // scalloped skirt, right to left
    const xa = r * (0.74 - i * 0.296), xb = r * (0.74 - (i + 1) * 0.296);
    g.quadraticCurveTo((xa + xb) / 2, by + r * 0.16, xb, by);
  }
  g.closePath();
  g.fillStyle = gloss(g, 0, -r * 0.3, r * 0.74, r * 0.6, C); g.fill();
  // inner dome glow + dots
  g.fillStyle = rad(g, 0, -r * 0.2, 0, 0, -r * 0.2, r * 0.5, [[0, 'rgba(255,255,255,0.4)'], [1, 'rgba(255,255,255,0)']]);
  ell(g, 0, -r * 0.2, r * 0.5, r * 0.38); g.fill();
  g.fillStyle = 'rgba(255,230,248,0.7)';
  for (const [x, y, s] of [[-0.48, -0.42, 0.05], [0.46, -0.36, 0.05], [0.28, -0.6, 0.04], [-0.26, -0.62, 0.04]]) { ell(g, x * r, y * r, s * r, s * r); g.fill(); }
  shine(g, -r * 0.34, -r * 0.5, r * 0.22, r * 0.1, -0.6, 0.85);
  face(g, 0, -r * 0.2, r * 0.42, { blink: f === 1, mouth: 'open', iris: '#c04898' });
}

/** 7: a sea turtle (green patterned shell, head peeking right, flippers). */
function t7Turtle(g, r, f) {
  const SH = pal('#b8f0a0', '#46b45a', '#1e6e2c', '#0e3a16');
  const SK = pal('#f0ffd0', '#b4e27a', '#6a9a38', '#3a5a18');
  const fl = f === 4 ? 0.3 : 0;
  // flippers
  for (const [x, y, rx, ry, a] of [[0.34, 0.56, 0.3, 0.12, 0.55 + fl], [-0.66, 0.5, 0.22, 0.1, -0.5 - fl * 0.6]]) {
    ell(g, x * r, y * r, rx * r, ry * r, a); g.fillStyle = gloss(g, x * r, y * r, rx * r, ry * r, SK); g.fill();
  }
  // neck + head
  ell(g, r * 0.36, r * 0.2, r * 0.2, r * 0.16, -0.3); g.fillStyle = gloss(g, r * 0.36, r * 0.2, r * 0.2, r * 0.16, SK); g.fill();
  ell(g, r * 0.56, r * 0.04, r * 0.34, r * 0.31); g.fillStyle = gloss(g, r * 0.56, r * 0.04, r * 0.34, r * 0.31, SK); g.fill();
  // shell rim then dome
  ell(g, -r * 0.16, r * 0.4, r * 0.66, r * 0.15); g.fillStyle = lin(g, 0, r * 0.28, 0, r * 0.55, [[0, '#f0e08a'], [1, '#b8a040']]); g.fill();
  g.beginPath();
  g.moveTo(-r * 0.78, r * 0.38);
  g.bezierCurveTo(-r * 0.8, -r * 0.7, r * 0.48, -r * 0.7, r * 0.46, r * 0.38);
  g.closePath();
  g.fillStyle = gloss(g, -r * 0.16, -r * 0.1, r * 0.64, r * 0.5, SH); g.fill();
  // shell plates
  g.save(); g.clip();
  g.strokeStyle = 'rgba(14,70,30,0.55)'; g.lineWidth = Math.max(1.2, r * 0.035); g.lineJoin = 'round';
  const hex = (cx, cy, s) => { g.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + (i * TAU) / 6; const x = cx + Math.cos(a) * s, y = cy + Math.sin(a) * s * 0.85; if (i) g.lineTo(x, y); else g.moveTo(x, y); } g.closePath(); };
  hex(-r * 0.16, -r * 0.1, r * 0.22); g.fillStyle = 'rgba(160,230,130,0.35)'; g.fill(); g.stroke();
  for (const [x, y] of [[-0.56, 0.06], [0.24, 0.06], [-0.42, -0.42], [0.1, -0.42]]) { hex(x * r, y * r, r * 0.2); g.stroke(); }
  g.restore();
  shine(g, -r * 0.42, -r * 0.3, r * 0.2, r * 0.09, -0.5, 0.75);
  shine(g, r * 0.44, -r * 0.14, r * 0.1, r * 0.05, -0.5, 0.7);
  face(g, r * 0.58, r * 0.06, r * 0.3, { blink: f === 1, mouth: 'smile', iris: '#3a7a20' });
}

/** 8: a raspberry octopus (big round head, six curly arms with suckers). */
function t8Octopus(g, r, f) {
  const C = pal('#ffc4d2', '#e03c64', '#8a1032', '#4a0618');
  const ph = f === 4 ? 0.5 : 0;
  // arms: thick tapered strokes curling outward
  g.lineCap = 'round';
  const arms = [[-0.5, -1], [-0.3, -1], [-0.1, -1], [0.1, 1], [0.3, 1], [0.5, 1]];
  arms.forEach(([x, s], i) => {
    const x0 = x * r, y0 = r * 0.16, wig = Math.sin(i * 1.3 + ph) * r * 0.05;
    const x1 = x0 + s * r * (0.12 + Math.abs(x) * 0.5) + wig, y1 = r * (0.74 + (i % 2) * 0.06);
    g.strokeStyle = lin(g, 0, y0, 0, y1, [[0, '#d83860'], [1, '#c02a52']]);
    g.lineWidth = r * 0.17;
    g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x0 + wig, (y0 + y1) / 2 + r * 0.06, x1, y1); g.stroke();
    // curl at the tip
    g.lineWidth = r * 0.09;
    g.beginPath(); g.arc(x1 + s * r * 0.06, y1 - r * 0.04, r * 0.07, s > 0 ? Math.PI * 0.9 : Math.PI * 0.1, s > 0 ? Math.PI * 0.1 : Math.PI * 0.9, s > 0); g.stroke();
    // suckers
    g.fillStyle = '#ffd0dc';
    for (const k of [0.45, 0.75]) { const sx = x0 + (x1 - x0) * k + wig * 0.5, sy = y0 + (y1 - y0) * k + r * 0.03; ell(g, sx, sy, r * 0.032, r * 0.028); g.fill(); }
  });
  // head
  ell(g, 0, -r * 0.2, r * 0.66, r * 0.62);
  g.fillStyle = gloss(g, 0, -r * 0.2, r * 0.66, r * 0.62, C); g.fill();
  // spots
  g.fillStyle = 'rgba(255,180,200,0.5)';
  for (const [x, y, s] of [[-0.36, -0.56, 0.09], [0.32, -0.6, 0.11], [0.5, -0.3, 0.07], [-0.06, -0.72, 0.06]]) { ell(g, x * r, y * r, s * r, s * r); g.fill(); }
  shine(g, -r * 0.3, -r * 0.6, r * 0.24, r * 0.12, -0.6, 0.8);
  face(g, 0, -r * 0.06, r * 0.44, { blink: f === 1, mouth: 'open', iris: '#b02048' });
}

/** 9: a violet manta ray (wide wings, horn lobes, thin tail), seen from above. */
function t9Manta(g, r, f) {
  const C = pal('#dcd2ff', '#7a5ce0', '#3a2496', '#22125a');
  const up = f === 4 ? -0.12 : 0;
  // tail
  g.strokeStyle = '#5a40b8'; g.lineWidth = Math.max(1.4, r * 0.05); g.lineCap = 'round';
  g.beginPath(); g.moveTo(0, r * 0.4); g.quadraticCurveTo(r * 0.04, r * 0.7, r * 0.22, r * 0.9); g.stroke();
  // horn lobes
  for (const s of [-1, 1]) {
    ell(g, s * r * 0.2, -r * 0.5, r * 0.08, r * 0.16, s * 0.35);
    g.fillStyle = '#6a4ed0'; g.fill();
  }
  // wings + body
  g.beginPath();
  g.moveTo(0, -r * 0.44);
  g.bezierCurveTo(r * 0.34, -r * 0.48, r * 0.74, -r * 0.18 + up * r, r * 0.98, r * (0.16 + up));
  g.bezierCurveTo(r * 0.7, r * 0.26, r * 0.38, r * 0.3, r * 0.2, r * 0.46);
  g.quadraticCurveTo(0, r * 0.56, -r * 0.2, r * 0.46);
  g.bezierCurveTo(-r * 0.38, r * 0.3, -r * 0.7, r * 0.26, -r * 0.98, r * (0.16 + up));
  g.bezierCurveTo(-r * 0.74, -r * 0.18 + up * r, -r * 0.34, -r * 0.48, 0, -r * 0.44);
  g.closePath();
  g.fillStyle = gloss(g, 0, -r * 0.05, r * 0.8, r * 0.5, C); g.fill();
  // pale trailing edge + shoulder spots
  g.save(); g.clip();
  g.fillStyle = 'rgba(236,230,255,0.55)';
  ell(g, 0, r * 0.5, r * 1.0, r * 0.2); g.fill();
  g.fillStyle = 'rgba(240,236,255,0.75)';
  for (const [x, y, s] of [[-0.42, 0.02, 0.06], [0.42, 0.02, 0.06], [-0.56, 0.12, 0.04], [0.56, 0.12, 0.04]]) { ell(g, x * r, y * r, s * r, s * r); g.fill(); }
  g.restore();
  // centre ridge
  g.strokeStyle = 'rgba(40,20,110,0.35)'; g.lineWidth = Math.max(1, r * 0.03);
  g.beginPath(); g.moveTo(0, r * 0.14); g.lineTo(0, r * 0.42); g.stroke();
  shine(g, -r * 0.32, -r * 0.26, r * 0.24, r * 0.08, -0.35, 0.75);
  face(g, 0, -r * 0.14, r * 0.36, { blink: f === 1, mouth: 'smile', iris: '#5a3ac8' });
}

/** 10: a big blue whale (round body, tail flukes up, water spout, cream belly grooves). */
function t10Whale(g, r, f) {
  const C = pal('#cfe8ff', '#3a8cf0', '#14489a', '#0a2a5a');
  const tl = f === 4 ? 0.2 : 0;
  // tail stalk + flukes
  g.strokeStyle = '#2f78d8'; g.lineWidth = r * 0.24; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-r * 0.38, r * 0.2); g.quadraticCurveTo(-r * 0.66, r * 0.1, -r * 0.7, -r * 0.3 - tl * r * 0.3); g.stroke();
  g.save(); g.translate(-r * 0.7, -r * 0.36 - tl * r * 0.3); g.rotate(-0.1 + tl);
  g.fillStyle = gloss(g, 0, -r * 0.08, r * 0.3, r * 0.12, C);
  g.beginPath(); g.moveTo(0, r * 0.04);
  g.quadraticCurveTo(-r * 0.12, -r * 0.24, -r * 0.34, -r * 0.18); g.quadraticCurveTo(-r * 0.2, -r * 0.06, 0, r * 0.04);
  g.quadraticCurveTo(r * 0.12, -r * 0.24, r * 0.32, -r * 0.2); g.quadraticCurveTo(r * 0.2, -r * 0.06, 0, r * 0.04);
  g.closePath(); g.fill();
  g.restore();
  // water spout (pale blue, rises from the blowhole)
  const sx = r * 0.26, sy = -r * 0.46;
  g.fillStyle = lin(g, 0, -r * 0.98, 0, sy, [[0, '#e8f8ff'], [1, '#8cd2ff']]);
  g.beginPath(); g.moveTo(sx - r * 0.05, sy);
  g.quadraticCurveTo(sx - r * 0.06, -r * 0.7, sx - r * 0.26, -r * 0.78);
  g.quadraticCurveTo(sx - r * 0.06, -r * 0.92, sx, -r * 0.78);
  g.quadraticCurveTo(sx + r * 0.06, -r * 0.92, sx + r * 0.26, -r * 0.78);
  g.quadraticCurveTo(sx + r * 0.06, -r * 0.7, sx + r * 0.05, sy);
  g.closePath(); g.fill();
  for (const [x, y, s] of [[-0.3, -0.62, 0.05], [0.3, -0.64, 0.05]]) { ell(g, sx + x * r, y * r, s * r, s * r * 1.2); g.fill(); }
  // body
  ell(g, r * 0.1, r * 0.16, r * 0.8, r * 0.62);
  g.fillStyle = gloss(g, r * 0.1, r * 0.16, r * 0.8, r * 0.62, C); g.fill();
  g.save(); ell(g, r * 0.1, r * 0.16, r * 0.8, r * 0.62); g.clip();
  // cream belly with grooves
  g.beginPath(); g.moveTo(-r * 0.8, r * 0.9); g.quadraticCurveTo(-r * 0.3, r * 0.3, r * 0.92, r * 0.34); g.lineTo(r * 0.92, r * 0.9); g.closePath();
  g.fillStyle = lin(g, 0, r * 0.3, 0, r * 0.8, [[0, '#fff4dc'], [1, '#e4c89a']]); g.fill();
  g.strokeStyle = 'rgba(180,140,90,0.55)'; g.lineWidth = Math.max(1, r * 0.025);
  for (const k of [0.46, 0.56, 0.66]) { g.beginPath(); g.moveTo(-r * 0.2, r * (k + 0.12)); g.quadraticCurveTo(r * 0.3, r * k, r * 0.86, r * (k - 0.06)); g.stroke(); }
  g.restore();
  // pectoral fin
  fin(g, r, -r * 0.02, r * 0.5, 2.2 - tl, r * 0.26, 0.4, pal('#7ab8ff', '#2f78d8', '#14489a', '#0a2a5a'));
  shine(g, -r * 0.24, -r * 0.22, r * 0.3, r * 0.1, -0.3, 0.7);
  face(g, r * 0.4, r * 0.08, r * 0.4, { blink: f === 1, mouth: 'open', iris: '#1a5ab8' });
}

const TIERS = [null, t1Plankton, t2Shrimp, t3Clownfish, t4Puffer, t5Seahorse, t6Jelly, t7Turtle, t8Octopus, t9Manta, t10Whale];

/** Glint positions per tier (units of r): frame 2 lights set A, frame 3 set B. Drawn on top, never outlined. */
const GLINTS = [null,
  [[[-0.26, -0.08, 0.14]], [[0.4, 0.0, 0.11]]],
  [[[-0.36, -0.36, 0.15]], [[0.5, 0.1, 0.12]]],
  [[[-0.1, -0.32, 0.15]], [[0.4, 0.3, 0.11], [-0.7, -0.2, 0.08]]],
  [[[-0.32, -0.3, 0.16]], [[0.4, -0.4, 0.12], [0.0, -0.78, 0.08]]],
  [[[-0.1, -0.7, 0.14]], [[0.2, 0.1, 0.12], [0.62, -0.56, 0.08]]],
  [[[-0.34, -0.5, 0.15]], [[0.36, -0.44, 0.12], [0.1, 0.62, 0.08]]],
  [[[-0.42, -0.3, 0.15]], [[0.6, -0.16, 0.11], [0.0, -0.46, 0.09]]],
  [[[-0.3, -0.6, 0.16]], [[0.36, -0.5, 0.12], [0.5, 0.7, 0.08]]],
  [[[-0.34, -0.26, 0.15]], [[0.64, 0.12, 0.12], [-0.7, 0.12, 0.09]]],
  [[[-0.24, -0.22, 0.16], [0.26, -0.86, 0.1]], [[0.6, -0.1, 0.13], [-0.7, -0.5, 0.1]]],
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
 * Paint one Deep Sea piece centred at the origin, radius r (CSS px). frame: see the file header.
 * The creature is painted into an offscreen layer first so the outline, rim light and inner shade follow its exact
 * silhouette. dpr: device pixel ratio of the target (the sprite cache passes it).
 */
export function drawSeaCreature(g, r, tier, frame = 0, dpr = 1) {
  tier = Math.max(1, Math.min(10, tier | 0));
  frame = frame | 0;
  const rnd = mulberry32((0x5ea5e + tier * 7919) >>> 0);
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
  if (tier === 10) { // celebration glow behind the whale (not outlined)
    g.save();
    g.fillStyle = rad(g, 0, 0, r * 0.2, 0, 0, r * 1.05, [[0, 'rgba(150,230,255,0.5)'], [1, 'rgba(150,230,255,0)']]);
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
  g.globalAlpha = tier === 1 || tier === 4 ? 0.45 : 0.6;
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
 * Idle animation for a Deep Sea piece at clock t (seconds, per-orb offset already applied).
 * frame: 0 rest, 1 blink, 2/3 sparkle glints, 4 swish. Plus a gentle floaty bob-squish (about ±2.2%).
 * Each cycle has its own period per tier, so a reef of creatures never moves in lockstep.
 */
export function seaIdle(t, tier) {
  const cyc = (off, per) => { const p = (t + off) % per; return p < 0 ? p + per : p; };
  const blink = cyc(0.4, 4.1 + (tier % 4) * 0.4) < 0.14;
  const sp = cyc(1.1 + tier * 0.57, 4.9 + (tier % 3) * 0.6);
  const spark = sp < 0.22 ? 2 : sp < 0.44 ? 3 : 0;
  const sw = cyc(2.3 + tier * 0.67, 5.7 + (tier % 5) * 0.5) < 0.34;
  const frame = blink ? 1 : spark || (sw ? 4 : 0);
  const w = Math.sin(t * (1.9 + tier * 0.05)) * (sw ? 1.1 : 1);
  return { frame, sx: 1 + 0.022 * w, sy: 1 - 0.022 * w };
}
