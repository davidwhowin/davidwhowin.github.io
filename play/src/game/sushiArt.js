// Sushi Bar orb skin (premium themed pack, DESIGN.md "Premium themed packs"). Procedural Canvas only.
//
// Free-standing pieces, Candy Crush style: each tier IS its food shape (no disc behind it). Tiers read by
// silhouette, size and one dominant colour: cream grain, lime pod, yellow block, nori roll, orange salmon,
// red tuna, orange-pearl gunkan, jade dragon, wooden geta, white-and-gold lucky cat.
// Every piece is painted food-only into a small offscreen, then composited as a sticker: soft contact shadow,
// a crisp ink outline grown from the silhouette, the food, an inner shade, a light rim along the top-left
// edges, then glossy highlights and the kawaii face on top.
// Painted ONCE per tier/size/frame into the orb sprite cache (orbArt.js). Two frames per tier: eyes open and a
// blink. The idle squish is a transform in drawOrb, so animation costs no repaint; Calm freezes both.
// Texture detail comes from a seeded mulberry32 stream per tier, so every sprite of a tier looks identical.
import { mulberry32 } from './rng.js';

const TAU = Math.PI * 2;

/** Kaiten plate colours per tier (index 1..10): [light, base, dark, rim]. Only the Sushi Counter belt uses them. */
export const SUSHI_PLATES = [
  null,
  ['#d9f1ff', '#7cc4f2', '#2f6fa8', '#eaf7ff'],
  ['#ffe3ea', '#f59ab0', '#b2456a', '#fff0f4'],
  ['#e6dcff', '#9a7ef0', '#4d33a6', '#f1ebff'],
  ['#ffe2c2', '#f5a25a', '#b05a1c', '#fff0de'],
  ['#d4fbf3', '#4fcfbd', '#1b7c74', '#e6fffa'],
  ['#fffbe0', '#f2dc84', '#a88b2c', '#fffdf0'],
  ['#fbe0ff', '#d483e6', '#7c2f94', '#fff0ff'],
  ['#f06a6a', '#b81c2c', '#4a0710', '#ffd27a'],
  ['#f3cf98', '#c88a48', '#7a4a1e', '#2a1a10'],
  ['#fff4c0', '#f6c444', '#a26a0c', '#fff8dc'],
];

/** Dominant colour of each tier's piece (index 1..10): particles, guides, legends. */
export const SUSHI_COLORS = [null, '#f6eedb', '#8fd14a', '#ffd23f', '#2f9c6c', '#ff8a4c', '#e3263f', '#ff5a1e', '#3fd0a0', '#e0a660', '#ffc83d'];

/** Main colour of a tier (particles, guides). */
export const sushiColor = (tier) => SUSHI_COLORS[Math.max(1, Math.min(10, tier | 0))];

/** Display names of the ten tiers (shop preview). */
export const SUSHI_NAMES = [null, 'Rice grain', 'Edamame', 'Tamago', 'Cucumber maki', 'Salmon nigiri', 'Tuna nigiri', 'Ikura gunkan', 'Dragon roll', 'Sushi platter', 'Lucky cat chef'];

const INK = '#2a1420'; // outline: warm dark plum, softer than black

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

/** Egg outline with a slightly narrower top. */
function egg(g, cx, cy, w, h) {
  g.beginPath();
  g.moveTo(cx, cy - h);
  g.bezierCurveTo(cx + w * 0.62, cy - h, cx + w, cy - h * 0.38, cx + w, cy + h * 0.12);
  g.bezierCurveTo(cx + w, cy + h * 0.68, cx + w * 0.58, cy + h, cx, cy + h);
  g.bezierCurveTo(cx - w * 0.58, cy + h, cx - w, cy + h * 0.68, cx - w, cy + h * 0.12);
  g.bezierCurveTo(cx - w, cy - h * 0.38, cx - w * 0.62, cy - h, cx, cy - h);
  g.closePath();
}

function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') {
    try { return new OffscreenCanvas(w, h); } catch (_) { /* fall through */ }
  }
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

/** Soft contact shadow (an ellipse that fades out), drawn on the surface under the piece. */
function contact(g, x, y, rx, ry, a = 0.42) {
  g.save();
  g.translate(x, y); g.scale(1, ry / rx);
  g.fillStyle = rad(g, 0, 0, 0, 0, 0, rx, [[0, `rgba(6,2,8,${a})`], [0.6, `rgba(6,2,8,${a * 0.55})`], [1, 'rgba(6,2,8,0)']]);
  g.beginPath(); g.arc(0, 0, rx, 0, TAU); g.fill();
  g.restore();
}

/** Glossy candy highlight: a bright soft-edged streak. */
function gloss(g, x, y, rx, ry, rot, a = 0.85) {
  g.save();
  g.translate(x, y); g.rotate(rot); g.scale(1, ry / rx);
  g.fillStyle = rad(g, 0, 0, 0, 0, 0, rx, [[0, `rgba(255,255,255,${a})`], [0.55, `rgba(255,255,255,${a * 0.8})`], [1, 'rgba(255,255,255,0)']]);
  g.beginPath(); g.arc(0, 0, rx, 0, TAU); g.fill();
  g.restore();
}

/** Small crisp specular dot. */
function dot(g, x, y, s, a = 0.95) {
  g.fillStyle = `rgba(255,255,255,${a})`;
  g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill();
}

function sparkle(g, x, y, s, col) {
  g.fillStyle = col;
  g.beginPath();
  g.moveTo(x, y - s); g.quadraticCurveTo(x, y, x + s, y); g.quadraticCurveTo(x, y, x, y + s); g.quadraticCurveTo(x, y, x - s, y); g.quadraticCurveTo(x, y, x, y - s);
  g.fill();
}

/**
 * Kawaii face centred at (x, y), size s (about the eye spacing). blink: closed eyes.
 * light: light eyes for dark surfaces (nori).
 */
function face(g, x, y, s, blink, { light = false, mouth = 'smile', blush = true } = {}) {
  const ink = light ? '#fff7ea' : '#2a1610';
  const ex = s * 0.5, ey = 0, er = s * 0.19;
  g.save();
  g.translate(x, y);
  if (blush) {
    g.fillStyle = light ? 'rgba(255,120,150,0.7)' : 'rgba(255,95,125,0.5)';
    ell(g, -s * 0.88, s * 0.28, s * 0.22, s * 0.13); g.fill();
    ell(g, s * 0.88, s * 0.28, s * 0.22, s * 0.13); g.fill();
  }
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (const sx of [-1, 1]) {
    if (blink) {
      g.strokeStyle = ink; g.lineWidth = Math.max(1, s * 0.13);
      g.beginPath(); g.arc(sx * ex, ey - er * 0.2, er * 0.95, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
    } else {
      g.fillStyle = ink;
      ell(g, sx * ex, ey, er * 0.92, er * 1.2); g.fill();
      g.fillStyle = light ? '#1a1014' : '#ffffff';
      g.beginPath(); g.arc(sx * ex - er * 0.3, ey - er * 0.42, er * 0.4, 0, TAU); g.fill();
      g.globalAlpha = 0.8;
      g.beginPath(); g.arc(sx * ex + er * 0.32, ey + er * 0.44, er * 0.17, 0, TAU); g.fill();
      g.globalAlpha = 1;
    }
  }
  g.strokeStyle = ink; g.lineWidth = Math.max(1, s * 0.12);
  g.beginPath();
  if (mouth === 'cat') { // ω
    g.arc(-s * 0.13, s * 0.3, s * 0.13, 0.05 * Math.PI, 0.95 * Math.PI);
    g.moveTo(s * 0.26, s * 0.3);
    g.arc(s * 0.13, s * 0.3, s * 0.13, 0.05 * Math.PI, 0.95 * Math.PI);
    g.stroke();
  } else if (mouth === 'open') {
    g.arc(0, s * 0.24, s * 0.17, 0, Math.PI); g.closePath();
    g.fillStyle = light ? '#ff8aa0' : '#8a2a32'; g.fill(); g.stroke();
  } else {
    g.arc(0, s * 0.2, s * 0.18, 0.15 * Math.PI, 0.85 * Math.PI);
    g.stroke();
  }
  g.restore();
}

/** Rice texture inside the current clip: little grains, light and shaded. */
function grains(g, rnd, x, y, w, h, n, gs) {
  for (let i = 0; i < n; i++) {
    const gx = x + rnd() * w, gy = y + rnd() * h;
    const gr = gs * (0.85 + rnd() * 0.4);
    g.fillStyle = rnd() < 0.55 ? 'rgba(255,255,255,0.95)' : 'rgba(196,182,150,0.55)';
    ell(g, gx, gy, gr, gr * 0.55, rnd() * Math.PI); g.fill();
  }
}

/** A puffy rice pillow (rounded block) with grains and a shaded underside, plus a thin tan edge line. */
function ricePillow(g, rnd, x, y, w, h, radius = 0.48) {
  g.save();
  rrect(g, x, y, w, h, h * radius);
  g.fillStyle = lin(g, x, y, x, y + h, [[0, '#ffffff'], [0.5, '#f6f1e3'], [1, '#d9ccad']]);
  g.fill();
  g.strokeStyle = 'rgba(150,120,80,0.55)'; g.lineWidth = h * 0.05; g.stroke();
  g.clip();
  grains(g, rnd, x, y, w, h, Math.min(46, Math.round((w / h) * 14)), h * 0.12);
  g.restore();
}

function noriFill(g, x0, x1) {
  return lin(g, x0, 0, x1, 0, [[0, '#0e2116'], [0.22, '#2c5a3c'], [0.36, '#3c6e4c'], [0.5, '#24482f'], [0.8, '#163020'], [1, '#0b1a11']]);
}

/** Faint vertical texture streaks on nori inside the current clip. */
function noriTexture(g, rnd, x0, x1, y0, y1, r) {
  g.strokeStyle = 'rgba(150,210,160,0.14)'; g.lineWidth = r * 0.018;
  for (let i = 0; i < 9; i++) {
    const x = x0 + rnd() * (x1 - x0);
    g.beginPath(); g.moveTo(x, y0); g.lineTo(x + (rnd() - 0.5) * r * 0.06, y1); g.stroke();
  }
}

// ------------------------------------------------------------------ sticker compositor

/**
 * Paint a piece as a sticker centred at the origin. body(b) paints the opaque food (no shadows, no glows).
 * top(g) paints highlights and the face over the composite. foot = [y, halfWidth] of the contact shadow.
 */
function sticker(g, r, body, top, foot) {
  const T = typeof g.getTransform === 'function' ? g.getTransform() : null;
  const sc = Math.max(1, T ? Math.hypot(T.a, T.b) : 1); // device px per unit
  const N = Math.max(8, Math.ceil(r * 2.7 * sc));
  const mk = () => { const c = makeCanvas(N, N); return [c, c.getContext('2d')]; };
  const [bc, b] = mk();
  b.setTransform(sc, 0, 0, sc, N / 2, N / 2);
  b.lineCap = 'round'; b.lineJoin = 'round';
  body(b);
  // ink outline: the silhouette grown outward, tinted
  const ow = Math.max(1.6, r * 0.085 * sc);
  const [oc, o] = mk();
  for (const k of [1, 0.55]) for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; o.drawImage(bc, Math.cos(a) * ow * k, Math.sin(a) * ow * k); }
  o.globalCompositeOperation = 'source-in'; o.fillStyle = INK; o.fillRect(0, 0, N, N);
  // inner shade along the bottom-right edges (volume)
  const d = Math.max(1.2, r * 0.11 * sc);
  const [sc2, s] = mk();
  s.drawImage(bc, 0, 0);
  s.globalCompositeOperation = 'source-in'; s.fillStyle = 'rgba(40,8,30,0.30)'; s.fillRect(0, 0, N, N);
  s.globalCompositeOperation = 'destination-out'; s.drawImage(bc, -d, -d * 1.2);
  // light rim along the top-left edges
  const e = Math.max(1, r * 0.06 * sc);
  const [rc, rr] = mk();
  rr.drawImage(bc, 0, 0);
  rr.globalCompositeOperation = 'source-in'; rr.fillStyle = 'rgba(255,255,255,0.6)'; rr.fillRect(0, 0, N, N);
  rr.globalCompositeOperation = 'destination-out'; rr.drawImage(bc, e, e * 1.3);
  // composite in the caller's space
  contact(g, 0, foot[0] * r, foot[1] * r, r * 0.13);
  const h = N / 2 / sc, w = N / sc;
  g.drawImage(oc, -h, -h, w, w);
  g.drawImage(bc, -h, -h, w, w);
  g.drawImage(sc2, -h, -h, w, w);
  g.drawImage(rc, -h, -h, w, w);
  g.save();
  g.lineCap = 'round'; g.lineJoin = 'round';
  top(g);
  g.restore();
}

// ------------------------------------------------------------------ the ten tiers
// Each returns { body, top, foot } in units of r. Sizes grow with the tier: small, light pieces first,
// chunky, cell-filling ones at the top of the ladder.

function t1RiceGrain(r, blink, rnd) {
  const W = r * 0.48, H = r * 0.68, rot = -0.18;
  return {
    foot: [0.68, 0.46],
    body(b) {
      b.save(); b.rotate(rot);
      egg(b, 0, 0, W, H);
      b.fillStyle = rad(b, -W * 0.35, -H * 0.4, r * 0.04, 0, 0, H * 1.08, [[0, '#ffffff'], [0.5, '#fdf9ef'], [0.82, '#efe4c8'], [1, '#d6c49c']]);
      b.fill();
      b.save(); egg(b, 0, 0, W, H); b.clip();
      // translucent pearly tip
      b.fillStyle = lin(b, 0, -H, 0, -H * 0.3, [[0, 'rgba(214,232,246,0.95)'], [1, 'rgba(214,232,246,0)']]);
      b.fillRect(-W, -H, W * 2, H * 0.7);
      // germ notch at the base
      b.fillStyle = '#e5d3a6';
      ell(b, -W * 0.5, H * 0.74, W * 0.28, H * 0.12, -0.7); b.fill();
      // long grain lines
      b.strokeStyle = 'rgba(190,170,130,0.35)'; b.lineWidth = r * 0.025;
      b.beginPath(); b.ellipse(W * 0.12, 0, W * 0.62, H * 0.8, 0, -0.45 * Math.PI, 0.35 * Math.PI); b.stroke();
      b.restore();
      b.restore();
    },
    top(g) {
      g.save(); g.rotate(rot);
      gloss(g, -W * 0.48, -H * 0.42, W * 0.2, H * 0.3, 0.2, 0.95);
      dot(g, -W * 0.18, -H * 0.82, r * 0.035);
      g.restore();
      face(g, r * 0.02, r * 0.1, r * 0.34, blink);
    },
  };
}

function t2Edamame(r, blink, rnd) {
  const beans = [[-0.5, -0.06, 0.33], [0, 0.04, 0.36], [0.5, -0.06, 0.33]];
  const rot = -0.1;
  const podFill = (b) => lin(b, 0, -r * 0.42, 0, r * 0.42, [[0, '#c9f27a'], [0.45, '#86cf3e'], [1, '#3f8a1c']]);
  return {
    foot: [0.42, 0.8],
    body(b) {
      b.save(); b.rotate(rot);
      // stalk at the left end
      b.fillStyle = '#6a8a2a';
      rrect(b, -r * 0.98, -r * 0.2, r * 0.2, r * 0.1, r * 0.05); b.fill();
      b.fillStyle = podFill(b);
      // pointed tip at the right end
      b.beginPath(); b.moveTo(r * 0.7, -r * 0.3); b.quadraticCurveTo(r * 0.98, -r * 0.34, r * 0.96, -r * 0.2); b.quadraticCurveTo(r * 0.9, r * 0.06, r * 0.66, r * 0.14); b.closePath(); b.fill();
      // blunt end at the left
      b.beginPath(); b.moveTo(-r * 0.66, -r * 0.3); b.quadraticCurveTo(-r * 0.92, -r * 0.24, -r * 0.84, -r * 0.06); b.quadraticCurveTo(-r * 0.78, r * 0.12, -r * 0.62, r * 0.14); b.closePath(); b.fill();
      ell(b, 0, r * 0.0, r * 0.66, r * 0.27); b.fill();
      for (const [x, y, R] of beans) { b.beginPath(); b.arc(x * r, y * r, R * r, 0, TAU); b.fill(); }
      // bean bulges
      for (const [x, y, R] of beans) {
        const bx = x * r, by = y * r - r * 0.02;
        b.fillStyle = rad(b, bx - R * r * 0.35, by - R * r * 0.4, 0, bx, by, R * r, [[0, '#e6fcae'], [0.45, '#a6e05a'], [1, 'rgba(96,160,40,0)']]);
        ell(b, bx, by, R * r * 0.92, R * r * 0.86); b.fill();
      }
      // dimples between beans + seam along the belly
      b.strokeStyle = 'rgba(40,96,20,0.55)'; b.lineWidth = r * 0.03;
      for (const x of [-0.25, 0.25]) { b.beginPath(); b.moveTo(x * r, -r * 0.24); b.quadraticCurveTo(x * r + r * 0.02, -r * 0.08, x * r, r * 0.02); b.stroke(); }
      b.strokeStyle = 'rgba(40,96,20,0.6)'; b.lineWidth = r * 0.035;
      b.beginPath(); b.moveTo(-r * 0.72, r * 0.16); b.quadraticCurveTo(0, r * 0.44, r * 0.72, r * 0.16); b.stroke();
      // soft fuzz
      for (let i = 0; i < 26; i++) { b.fillStyle = 'rgba(240,255,210,0.45)'; b.fillRect((rnd() - 0.5) * r * 1.5, (rnd() - 0.65) * r * 0.6, r * 0.02, r * 0.02); }
      b.restore();
    },
    top(g) {
      g.save(); g.rotate(rot);
      for (const [x, y, R] of beans) { gloss(g, (x - R * 0.36) * r, (y - R * 0.48) * r, R * r * 0.34, R * r * 0.16, -0.5, 0.85); }
      for (let i = 0; i < 6; i++) sparkle(g, (rnd() - 0.5) * r * 1.3, -r * 0.3 + rnd() * r * 0.1, r * 0.035, 'rgba(255,255,255,0.9)'); // salt
      g.restore();
      face(g, 0, r * 0.06, r * 0.28, blink);
    },
  };
}

function t3Tamago(r, blink, rnd) {
  const X0 = -r * 0.78, X1 = r * 0.78, Y0 = -r * 0.5, Y1 = r * 0.3;
  const bx0 = r * 0.2, bw = r * 0.28;
  return {
    foot: [0.66, 0.72],
    body(b) {
      ricePillow(b, rnd, -r * 0.62, r * 0.16, r * 1.24, r * 0.5);
      // omelette block
      b.save();
      rrect(b, X0, Y0, X1 - X0, Y1 - Y0, r * 0.2);
      b.fillStyle = lin(b, 0, Y0, 0, Y1, [[0, '#ffe98a'], [0.3, '#ffdc52'], [0.32, '#ffd23f'], [0.75, '#f9c22e'], [1, '#e2a21c']]);
      b.fill();
      b.clip();
      // top face (lighter) and its front edge
      b.fillStyle = 'rgba(255,248,200,0.55)';
      b.fillRect(X0, Y0, X1 - X0, r * 0.22);
      b.strokeStyle = 'rgba(214,150,30,0.55)'; b.lineWidth = r * 0.03;
      b.beginPath(); b.moveTo(X0, Y0 + r * 0.24); b.bezierCurveTo(-r * 0.3, Y0 + r * 0.27, r * 0.3, Y0 + r * 0.21, X1, Y0 + r * 0.24); b.stroke();
      // rolled layers on the front
      b.strokeStyle = 'rgba(214,140,24,0.38)'; b.lineWidth = r * 0.022;
      for (let i = 1; i < 4; i++) { const y = Y0 + r * 0.24 + i * r * 0.14; b.beginPath(); b.moveTo(X0, y); b.bezierCurveTo(-r * 0.2, y + r * 0.03, r * 0.3, y - r * 0.03, X1, y); b.stroke(); }
      // toasty speckles
      for (let i = 0; i < 12; i++) { b.fillStyle = 'rgba(190,110,20,0.35)'; ell(b, X0 + rnd() * (X1 - X0), Y0 + rnd() * r * 0.2, r * 0.03, r * 0.018, rnd() * 3); b.fill(); }
      b.restore();
      // nori belt wrapping the block and the rice
      rrect(b, bx0, Y0 - r * 0.04, bw, r * 1.18, r * 0.06);
      b.fillStyle = noriFill(b, bx0, bx0 + bw);
      b.fill();
      b.fillStyle = 'rgba(120,190,140,0.25)';
      b.fillRect(bx0 + bw * 0.18, Y0, bw * 0.12, r * 1.1);
    },
    top(g) {
      gloss(g, -r * 0.42, -r * 0.4, r * 0.24, r * 0.06, -0.05, 0.9);
      dot(g, r * 0.62, -r * 0.4, r * 0.035);
      face(g, -r * 0.3, -r * 0.02, r * 0.32, blink);
    },
  };
}

function t4Maki(r, blink, rnd) {
  const rx = r * 0.66, ry = r * 0.32, cyT = -r * 0.3, cyB = r * 0.42;
  return {
    foot: [0.74, 0.66],
    body(b) {
      // nori side of the cylinder
      b.save();
      b.beginPath(); b.moveTo(-rx, cyT); b.lineTo(-rx, cyB); b.ellipse(0, cyB, rx, ry, 0, Math.PI, 0, true); b.lineTo(rx, cyT); b.closePath();
      b.fillStyle = noriFill(b, -rx, rx); b.fill();
      b.clip(); noriTexture(b, rnd, -rx, rx, cyT, cyB + ry, r);
      b.restore();
      // top face: nori lip, rice ring, cucumber core
      ell(b, 0, cyT, rx, ry); b.fillStyle = '#1d3a27'; b.fill();
      b.save();
      ell(b, 0, cyT, rx * 0.88, ry * 0.82);
      b.fillStyle = rad(b, -rx * 0.3, cyT - ry * 0.3, 0, 0, cyT, rx, [[0, '#ffffff'], [0.7, '#f5efe0'], [1, '#dcd0b2']]);
      b.fill(); b.clip();
      grains(b, rnd, -rx, cyT - ry, rx * 2, ry * 2, 40, r * 0.06);
      b.restore();
      const cx = 0, cy = cyT + ry * 0.04, C = rx * 0.38;
      ell(b, cx, cy, C, C * 0.5); b.fillStyle = '#2f6b1f'; b.fill();
      ell(b, cx, cy - C * 0.03, C * 0.82, C * 0.4);
      b.fillStyle = rad(b, cx - C * 0.2, cy - C * 0.15, 0, cx, cy, C * 0.85, [[0, '#ecffcc'], [0.6, '#b6e57e'], [1, '#78bb44']]); b.fill();
      b.fillStyle = 'rgba(245,255,220,0.95)';
      for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; ell(b, cx + Math.cos(a) * C * 0.36, cy + Math.sin(a) * C * 0.17, C * 0.09, C * 0.05, a); b.fill(); }
    },
    top(g) {
      // glossy nori sheen
      g.save();
      g.fillStyle = lin(g, -rx * 0.62, 0, -rx * 0.38, 0, [[0, 'rgba(255,255,255,0)'], [0.5, 'rgba(200,255,220,0.38)'], [1, 'rgba(255,255,255,0)']]);
      g.fillRect(-rx * 0.62, cyT + ry * 0.9, rx * 0.24, (cyB - cyT) * 0.9);
      g.restore();
      gloss(g, -rx * 0.42, cyT - ry * 0.32, rx * 0.22, ry * 0.18, -0.3, 0.8);
      face(g, 0, r * 0.2, r * 0.34, blink, { light: true });
    },
  };
}

/** Shared nigiri: rice pillow + a draped fish slice. */
function nigiri(r, blink, rnd, f) {
  const W = r * f.w, top = -r * f.top, bot = r * f.bot;
  const fishPath = (b) => {
    b.beginPath();
    b.moveTo(-W, bot);
    b.bezierCurveTo(-W * 1.06, top + r * f.round, -W * 0.6, top, 0, top);
    b.bezierCurveTo(W * 0.6, top, W * 1.06, top + r * f.round, W, bot);
    b.bezierCurveTo(W * 0.62, bot + r * 0.08, -W * 0.62, bot + r * 0.08, -W, bot);
    b.closePath();
  };
  return {
    foot: [f.foot, f.w * 0.82],
    body(b) {
      b.save(); b.rotate(f.tilt);
      if (f.back) f.back(b, r);
      ricePillow(b, rnd, -W * 0.74, bot - r * 0.24, W * 1.48, r * f.riceH);
      b.save();
      fishPath(b);
      b.fillStyle = lin(b, 0, top, 0, bot + r * 0.06, [[0, f.c[0]], [0.4, f.c[1]], [1, f.c[2]]]);
      b.fill();
      b.clip();
      // stripes / sinew
      b.strokeStyle = f.fat;
      for (let i = 0; i < f.lines; i++) {
        const x = -W + (i + 0.55) * (2 * W / f.lines);
        b.lineWidth = r * (f.lineW + rnd() * 0.015);
        b.beginPath(); b.moveTo(x - r * 0.2, top - r * 0.04); b.bezierCurveTo(x - r * 0.04, top + r * 0.16, x + r * 0.06, bot - r * 0.16, x + r * 0.22, bot + r * 0.06); b.stroke();
      }
      // underside shade where the slice drapes over the rice
      b.fillStyle = lin(b, 0, top, 0, bot + r * 0.06, [[0, 'rgba(0,0,0,0)'], [0.72, 'rgba(0,0,0,0)'], [1, 'rgba(90,0,10,0.28)']]);
      b.fillRect(-W * 1.1, top, W * 2.2, bot - top + r * 0.1);
      b.restore();
      b.restore();
    },
    top(g) {
      g.save(); g.rotate(f.tilt);
      gloss(g, -W * 0.42, top + r * 0.1, W * 0.3, r * 0.06, -0.08, 0.9);
      dot(g, W * 0.5, top + r * 0.08, r * 0.035);
      if (f.garnish) f.garnish(g, r, top, W);
      g.restore();
      face(g, f.faceX * r, f.faceY * r, r * 0.32, blink);
    },
  };
}

function t5Salmon(r, blink, rnd) {
  return nigiri(r, blink, rnd, {
    w: 0.9, top: 0.36, bot: 0.16, round: 0.12, riceH: 0.62, tilt: 0, foot: 0.56,
    c: ['#ffb985', '#ff8f4e', '#ec6a30'], fat: 'rgba(255,240,226,0.92)', lines: 5, lineW: 0.06,
    faceX: 0, faceY: -0.1,
  });
}

function t6Tuna(r, blink, rnd) {
  return nigiri(r, blink, rnd, {
    w: 0.92, top: 0.5, bot: 0.2, round: 0.06, riceH: 0.6, tilt: -0.1, foot: 0.62,
    c: ['#ff5f74', '#e0213f', '#a3102c'], fat: 'rgba(255,170,182,0.28)', lines: 3, lineW: 0.035,
    faceX: 0.02, faceY: -0.12,
    back(b, rr) { // shiso leaf tucked behind the slice
      b.save();
      b.translate(-rr * 0.6, -rr * 0.36); b.rotate(-0.75);
      b.beginPath(); b.moveTo(0, rr * 0.3); b.quadraticCurveTo(rr * 0.3, -rr * 0.05, 0, -rr * 0.42); b.quadraticCurveTo(-rr * 0.3, -rr * 0.05, 0, rr * 0.3); b.closePath();
      b.fillStyle = lin(b, -rr * 0.2, 0, rr * 0.2, 0, [[0, '#4fae3a'], [0.5, '#7ed35a'], [1, '#2f8a2a']]); b.fill();
      b.strokeStyle = 'rgba(30,90,20,0.7)'; b.lineWidth = rr * 0.025;
      b.beginPath(); b.moveTo(0, rr * 0.26); b.lineTo(0, -rr * 0.36); b.stroke();
      for (const y of [-0.2, -0.06, 0.08]) { b.beginPath(); b.moveTo(0, y * rr); b.lineTo(rr * 0.12, (y - 0.08) * rr); b.moveTo(0, y * rr); b.lineTo(-rr * 0.12, (y - 0.08) * rr); b.stroke(); }
      b.restore();
    },
    garnish(g, rr, top, W) { // dab of wasabi
      const x = W * 0.48, y = top + rr * 0.04;
      g.fillStyle = rad(g, x - rr * 0.04, y - rr * 0.04, 0, x, y, rr * 0.14, [[0, '#e8ffb0'], [0.6, '#a6d84a'], [1, '#6e9e22']]);
      g.beginPath(); g.moveTo(x - rr * 0.14, y + rr * 0.04); g.quadraticCurveTo(x - rr * 0.12, y - rr * 0.1, x, y - rr * 0.13); g.quadraticCurveTo(x + rr * 0.14, y - rr * 0.08, x + rr * 0.14, y + rr * 0.04); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(60,90,20,0.7)'; g.lineWidth = rr * 0.02; g.stroke();
    },
  });
}

function t7Ikura(r, blink, rnd) {
  const rx = r * 0.66, ry = r * 0.25, cyT = -r * 0.1, cyB = r * 0.5;
  // heaped roe: a dome of pearls over the top opening, drawn back to front
  const roe = [];
  const pr = r * 0.135;
  for (let row = 0; row < 4; row++) {
    const y0 = cyT + ry * 0.35 - row * pr * 1.2;
    const span = Math.sqrt(Math.max(0, 1 - (row / 3.7) ** 2)) * rx * 0.9;
    const n = Math.max(1, Math.round((span * 2) / (pr * 1.7)));
    for (let i = 0; i < n; i++) {
      const x = n === 1 ? 0 : -span + (i / (n - 1)) * span * 2;
      roe.push([x + (rnd() - 0.5) * pr * 0.3, y0 + (rnd() - 0.5) * pr * 0.3, pr * (0.92 + rnd() * 0.16)]);
    }
  }
  roe.sort((a, b) => a[1] - b[1]);
  return {
    foot: [0.74, 0.64],
    body(b) {
      // cucumber fan at the back
      b.save();
      b.translate(r * 0.36, cyT - r * 0.42);
      for (let i = 0; i < 3; i++) {
        b.save(); b.rotate(-0.5 + i * 0.32);
        ell(b, 0, -r * 0.08, r * 0.1, r * 0.24);
        b.fillStyle = lin(b, -r * 0.1, 0, r * 0.1, 0, [[0, '#2f7a24'], [0.25, '#9fdc6a'], [1, '#d9f7b0']]); b.fill();
        b.strokeStyle = 'rgba(30,80,20,0.7)'; b.lineWidth = r * 0.02; b.stroke();
        b.restore();
      }
      b.restore();
      // nori wall
      b.save();
      b.beginPath(); b.moveTo(-rx, cyT); b.lineTo(-rx, cyB); b.ellipse(0, cyB, rx, ry, 0, Math.PI, 0, true); b.lineTo(rx, cyT); b.closePath();
      b.fillStyle = noriFill(b, -rx, rx); b.fill();
      b.clip(); noriTexture(b, rnd, -rx, rx, cyT, cyB + ry, r);
      b.restore();
      // opening + rice inside
      ell(b, 0, cyT, rx, ry); b.fillStyle = '#16301f'; b.fill();
      ell(b, 0, cyT, rx * 0.9, ry * 0.8); b.fillStyle = '#efe6d0'; b.fill();
      // pearls
      for (const [x, y, R] of roe) {
        b.fillStyle = '#9e1c06';
        b.beginPath(); b.arc(x, y, R, 0, TAU); b.fill();
        b.fillStyle = rad(b, x - R * 0.3, y - R * 0.3, 0, x, y, R * 0.95, [[0, '#ffd890'], [0.35, '#ff7a24'], [0.8, '#e2400e'], [1, '#b42808']]);
        b.beginPath(); b.arc(x, y, R * 0.9, 0, TAU); b.fill();
        b.fillStyle = 'rgba(255,214,140,0.7)';
        b.beginPath(); b.arc(x + R * 0.18, y + R * 0.22, R * 0.3, 0, TAU); b.fill();
      }
      // front lip of the nori over the lowest pearls
      b.beginPath(); b.ellipse(0, cyT, rx, ry, 0, 0.08 * Math.PI, 0.92 * Math.PI); b.lineTo(-rx, cyT + r * 0.04); b.ellipse(0, cyT + r * 0.04, rx, ry, 0, Math.PI, 0, true); b.closePath();
      b.fillStyle = '#244a31'; b.fill();
    },
    top(g) {
      for (const [x, y, R] of roe) dot(g, x - R * 0.36, y - R * 0.38, R * 0.24, 0.95);
      g.save();
      g.fillStyle = lin(g, -rx * 0.64, 0, -rx * 0.4, 0, [[0, 'rgba(255,255,255,0)'], [0.5, 'rgba(200,255,220,0.36)'], [1, 'rgba(255,255,255,0)']]);
      g.fillRect(-rx * 0.64, cyT + ry * 1.2, rx * 0.24, (cyB - cyT) * 0.85);
      g.restore();
      face(g, 0, r * 0.3, r * 0.32, blink, { light: true });
    },
  };
}

function t8Dragon(r, blink, rnd) {
  // body: a quadratic curve from the raised tail (right) down and round to the head (left)
  const P0 = [0.8, -0.3], P1 = [0.28, 0.82], P2 = [-0.44, 0.12];
  const at = (t) => {
    const u = 1 - t;
    return [(u * u * P0[0] + 2 * u * t * P1[0] + t * t * P2[0]) * r, (u * u * P0[1] + 2 * u * t * P1[1] + t * t * P2[1]) * r];
  };
  const tan = (t) => {
    const dx = 2 * (1 - t) * (P1[0] - P0[0]) + 2 * t * (P2[0] - P1[0]);
    const dy = 2 * (1 - t) * (P1[1] - P0[1]) + 2 * t * (P2[1] - P1[1]);
    return Math.atan2(dy, dx);
  };
  const curve = (b, dy) => { b.beginPath(); b.moveTo(P0[0] * r, P0[1] * r + dy); b.quadraticCurveTo(P1[0] * r, P1[1] * r + dy, P2[0] * r, P2[1] * r + dy); };
  const hx = -r * 0.5, hy = -r * 0.26;
  const scales = [];
  for (let i = 0; i < 7; i++) scales.push(0.06 + i * 0.145);
  return {
    foot: [0.64, 0.86],
    body(b) {
      // tail fin
      b.beginPath(); b.moveTo(r * 0.66, -r * 0.16); b.quadraticCurveTo(r * 0.78, -r * 0.6, r * 1.0, -r * 0.7); b.quadraticCurveTo(r * 0.92, -r * 0.36, r * 0.92, -r * 0.14); b.closePath();
      b.fillStyle = lin(b, r * 0.7, -r * 0.7, r * 0.9, -r * 0.1, [[0, '#a8f5cf'], [1, '#1f9a6c']]); b.fill();
      // the roll: nori underside, then rice
      b.lineCap = 'round';
      curve(b, r * 0.14); b.strokeStyle = '#13281b'; b.lineWidth = r * 0.36; b.stroke();
      curve(b, r * 0.04); b.strokeStyle = '#f4eedf'; b.lineWidth = r * 0.38; b.stroke();
      // avocado scales, tail first so the head end overlaps
      for (const t of scales) {
        const [x, y] = at(t), a = tan(t);
        b.save(); b.translate(x, y - r * 0.08); b.rotate(a);
        ell(b, 0, 0, r * 0.2, r * 0.19);
        b.fillStyle = rad(b, -r * 0.05, -r * 0.08, 0, 0, 0, r * 0.22, [[0, '#d8ffc0'], [0.45, '#6ad69a'], [1, '#1f8f63']]);
        b.fill();
        b.strokeStyle = 'rgba(14,90,58,0.75)'; b.lineWidth = r * 0.025; b.stroke();
        b.strokeStyle = 'rgba(14,90,58,0.4)'; b.lineWidth = r * 0.018;
        b.beginPath(); b.arc(0, r * 0.1, r * 0.13, 1.2 * Math.PI, 1.8 * Math.PI); b.stroke();
        b.restore();
      }
      // eel sauce zigzag + tobiko
      b.strokeStyle = '#6a2c12'; b.lineWidth = r * 0.045;
      b.beginPath();
      for (let i = 0; i <= 32; i++) { const t = 0.1 + i * 0.024; const [x, y] = at(t); const yy = y - r * 0.12 + Math.sin(i * 0.9) * r * 0.07; if (i) b.lineTo(x, yy); else b.moveTo(x, yy); }
      b.stroke();
      for (let i = 0; i < 14; i++) { const [x, y] = at(0.05 + rnd() * 0.85); b.fillStyle = '#ff6a1f'; b.beginPath(); b.arc(x + (rnd() - 0.5) * r * 0.2, y - r * 0.2 + (rnd() - 0.5) * r * 0.06, r * 0.032, 0, TAU); b.fill(); }
      // head: mane, horns, skull, snout
      b.fillStyle = '#ff8a2a';
      for (let i = 0; i < 3; i++) { const a = -0.2 + i * 0.5; b.beginPath(); b.moveTo(hx + r * 0.2 + Math.cos(a) * r * 0.1, hy - r * 0.1 + Math.sin(a) * r * 0.1); b.lineTo(hx + r * 0.42 + Math.cos(a) * r * 0.12, hy - r * 0.08 + Math.sin(a) * r * 0.2); b.lineTo(hx + r * 0.22, hy + r * 0.04 + i * r * 0.06); b.closePath(); b.fill(); }
      b.fillStyle = lin(b, 0, hy - r * 0.6, 0, hy - r * 0.2, [[0, '#fff2a8'], [1, '#e8a420']]);
      b.beginPath(); b.moveTo(hx - r * 0.18, hy - r * 0.2); b.quadraticCurveTo(hx - r * 0.32, hy - r * 0.48, hx - r * 0.22, hy - r * 0.66); b.quadraticCurveTo(hx - r * 0.12, hy - r * 0.4, hx - r * 0.02, hy - r * 0.26); b.closePath(); b.fill();
      b.beginPath(); b.moveTo(hx + r * 0.06, hy - r * 0.26); b.quadraticCurveTo(hx + r * 0.1, hy - r * 0.52, hx + r * 0.26, hy - r * 0.64); b.quadraticCurveTo(hx + r * 0.22, hy - r * 0.4, hx + r * 0.22, hy - r * 0.18); b.closePath(); b.fill();
      ell(b, hx, hy, r * 0.4, r * 0.35);
      b.fillStyle = rad(b, hx - r * 0.12, hy - r * 0.14, 0, hx, hy, r * 0.38, [[0, '#d8ffc8'], [0.5, '#6ad69a'], [1, '#22966a']]); b.fill();
      ell(b, hx - r * 0.12, hy + r * 0.18, r * 0.24, r * 0.13);
      b.fillStyle = lin(b, 0, hy + r * 0.06, 0, hy + r * 0.3, [[0, '#e6ffd8'], [1, '#9be2b4']]); b.fill();
      b.fillStyle = '#1d5a3c';
      b.beginPath(); b.arc(hx - r * 0.2, hy + r * 0.15, r * 0.025, 0, TAU); b.arc(hx - r * 0.04, hy + r * 0.15, r * 0.025, 0, TAU); b.fill();
    },
    top(g) {
      // whiskers
      g.strokeStyle = '#ffd04a'; g.lineWidth = r * 0.03;
      g.beginPath(); g.moveTo(hx - r * 0.3, hy + r * 0.16); g.quadraticCurveTo(hx - r * 0.5, hy + r * 0.12, hx - r * 0.56, hy + r * 0.32); g.stroke();
      for (const t of scales) { const [x, y] = at(t); dot(g, x - r * 0.07, y - r * 0.18, r * 0.03, 0.85); }
      gloss(g, hx - r * 0.16, hy - r * 0.18, r * 0.12, r * 0.06, -0.5, 0.9);
      face(g, hx + r * 0.02, hy - r * 0.05, r * 0.3, blink);
    },
  };
}

function miniNigiri(b, rnd, x, y, s, c, stripes) {
  ricePillow(b, rnd, x - s * 0.5, y, s, s * 0.4, 0.5);
  b.beginPath();
  b.moveTo(x - s * 0.58, y + s * 0.08);
  b.bezierCurveTo(x - s * 0.6, y - s * 0.22, x - s * 0.3, y - s * 0.26, x, y - s * 0.26);
  b.bezierCurveTo(x + s * 0.3, y - s * 0.26, x + s * 0.6, y - s * 0.22, x + s * 0.58, y + s * 0.08);
  b.quadraticCurveTo(x, y + s * 0.14, x - s * 0.58, y + s * 0.08); b.closePath();
  b.fillStyle = lin(b, 0, y - s * 0.26, 0, y + s * 0.12, [[0, c[0]], [1, c[1]]]); b.fill();
  b.strokeStyle = 'rgba(90,10,10,0.35)'; b.lineWidth = s * 0.04; b.stroke();
  if (stripes) {
    b.strokeStyle = stripes; b.lineWidth = s * 0.06;
    for (let i = 0; i < 3; i++) { const sx = x - s * 0.3 + i * s * 0.3; b.beginPath(); b.moveTo(sx - s * 0.07, y - s * 0.22); b.lineTo(sx + s * 0.07, y + s * 0.08); b.stroke(); }
  }
}

function t9Platter(r, blink, rnd) {
  const L = -r * 0.95, R = r * 0.95, ty = r * 0.0, fy = r * 0.26, by = r * 0.42;
  const mx = r * 0.02, mrx = r * 0.3, mry = r * 0.14, mT = -r * 0.42, mB = -r * 0.08;
  return {
    foot: [0.7, 0.86],
    body(b) {
      // legs
      b.fillStyle = lin(b, 0, by, 0, r * 0.66, [[0, '#7a4520'], [1, '#4e2a12']]);
      rrect(b, -r * 0.7, by - r * 0.04, r * 0.24, r * 0.3, r * 0.05); b.fill();
      rrect(b, r * 0.46, by - r * 0.04, r * 0.24, r * 0.3, r * 0.05); b.fill();
      // board top (3/4 view) and front edge
      b.beginPath(); b.moveTo(L + r * 0.1, ty - r * 0.22); b.lineTo(R - r * 0.06, ty - r * 0.22); b.quadraticCurveTo(R + r * 0.02, ty - r * 0.2, R, ty - r * 0.12); b.lineTo(R, fy); b.lineTo(L, fy); b.lineTo(L, ty - r * 0.06); b.quadraticCurveTo(L + r * 0.02, ty - r * 0.2, L + r * 0.1, ty - r * 0.22); b.closePath();
      b.fillStyle = lin(b, 0, ty - r * 0.22, 0, fy, [[0, '#ffdca2'], [1, '#e2a864']]); b.fill();
      rrect(b, L, fy - r * 0.02, R - L, by - fy + r * 0.06, r * 0.06);
      b.fillStyle = lin(b, 0, fy, 0, by, [[0, '#c88646'], [1, '#93582a']]); b.fill();
      b.strokeStyle = 'rgba(110,60,25,0.35)'; b.lineWidth = r * 0.014;
      for (let i = 0; i < 6; i++) { const y = ty - r * 0.18 + i * r * 0.07; b.beginPath(); b.moveTo(L + r * 0.06, y); b.bezierCurveTo(-r * 0.3, y + r * 0.02 * (rnd() - 0.5), r * 0.3, y + r * 0.02, R - r * 0.04, y + rnd() * r * 0.01); b.stroke(); }
      // shiso, ginger, wasabi
      b.fillStyle = lin(b, -r * 0.9, -r * 0.5, -r * 0.5, 0, [[0, '#8be06a'], [1, '#2f8a2a']]);
      b.beginPath(); b.moveTo(-r * 0.86, -r * 0.1); b.quadraticCurveTo(-r * 0.9, -r * 0.42, -r * 0.6, -r * 0.46); b.quadraticCurveTo(-r * 0.58, -r * 0.2, -r * 0.86, -r * 0.1); b.fill();
      for (let i = 0; i < 3; i++) { b.fillStyle = i % 2 ? '#ffc6d2' : '#f7a6b8'; ell(b, r * 0.78 - i * r * 0.05, r * 0.06 - i * r * 0.05, r * 0.13, r * 0.07, -0.4); b.fill(); }
      b.fillStyle = rad(b, -r * 0.82, r * 0.06, 0, -r * 0.8, r * 0.08, r * 0.1, [[0, '#d9f59a'], [1, '#7aae2c']]);
      ell(b, -r * 0.8, r * 0.1, r * 0.1, r * 0.07); b.fill();
      // salmon and tuna either side, maki in the middle
      miniNigiri(b, rnd, -r * 0.5, -r * 0.16, r * 0.46, ['#ffb27a', '#f0642c'], 'rgba(255,238,222,0.9)');
      miniNigiri(b, rnd, r * 0.52, -r * 0.16, r * 0.46, ['#ff5a6e', '#b8142e'], null);
      b.save();
      b.beginPath(); b.moveTo(mx - mrx, mT); b.lineTo(mx - mrx, mB); b.ellipse(mx, mB, mrx, mry, 0, Math.PI, 0, true); b.lineTo(mx + mrx, mT); b.closePath();
      b.fillStyle = noriFill(b, mx - mrx, mx + mrx); b.fill();
      b.restore();
      ell(b, mx, mT, mrx, mry); b.fillStyle = '#1d3a27'; b.fill();
      ell(b, mx, mT, mrx * 0.86, mry * 0.8); b.fillStyle = '#f7f2e6'; b.fill();
      ell(b, mx, mT, mrx * 0.36, mry * 0.34); b.fillStyle = '#ff8a4c'; b.fill();
    },
    top(g) {
      gloss(g, -r * 0.6, -r * 0.18, r * 0.12, r * 0.03, -0.05, 0.85);
      gloss(g, r * 0.42, -r * 0.18, r * 0.12, r * 0.03, -0.05, 0.85);
      gloss(g, -r * 0.5, r * 0.3, r * 0.3, r * 0.025, 0, 0.5);
      face(g, mx, mB - r * 0.08, r * 0.24, blink, { light: true });
      sparkle(g, r * 0.72, -r * 0.5, r * 0.11, 'rgba(255,246,210,0.95)');
    },
  };
}

function t10LuckyCat(r, blink, rnd) {
  const hy = -r * 0.34, by = r * 0.42;
  const white = (b, x0, y0, x1, y1) => lin(b, x0, y0, x1, y1, [[0, '#ffffff'], [0.7, '#f7f1e6'], [1, '#e2d4bc']]);
  return {
    foot: [0.92, 0.6],
    body(b) {
      // tail curling up behind on the left
      b.strokeStyle = '#f2ebde'; b.lineWidth = r * 0.16; b.lineCap = 'round';
      b.beginPath(); b.moveTo(-r * 0.4, r * 0.76); b.quadraticCurveTo(-r * 0.86, r * 0.7, -r * 0.8, r * 0.3); b.stroke();
      b.strokeStyle = '#f08a3c'; b.lineWidth = r * 0.16;
      b.beginPath(); b.moveTo(-r * 0.81, r * 0.36); b.lineTo(-r * 0.8, r * 0.3); b.stroke();
      // body
      egg(b, 0, by, r * 0.6, r * 0.5);
      b.fillStyle = white(b, -r * 0.4, by - r * 0.4, r * 0.4, by + r * 0.5); b.fill();
      b.save(); egg(b, 0, by, r * 0.6, r * 0.5); b.clip();
      b.fillStyle = '#f08a3c'; ell(b, r * 0.5, by + r * 0.2, r * 0.22, r * 0.3, 0.3); b.fill();
      b.restore();
      // feet
      b.fillStyle = '#fbf7ef';
      ell(b, -r * 0.28, by + r * 0.44, r * 0.18, r * 0.09); b.fill();
      ell(b, r * 0.28, by + r * 0.44, r * 0.18, r * 0.09); b.fill();
      // gold koban held at the belly
      ell(b, 0, by + r * 0.12, r * 0.24, r * 0.3, 0.12);
      b.fillStyle = rad(b, -r * 0.08, by - r * 0.02, 0, 0, by + r * 0.12, r * 0.32, [[0, '#fff6b8'], [0.5, '#ffcc33'], [1, '#c48a0c']]); b.fill();
      b.strokeStyle = '#a8720a'; b.lineWidth = r * 0.03;
      ell(b, 0, by + r * 0.12, r * 0.17, r * 0.23, 0.12); b.stroke();
      b.lineWidth = r * 0.025;
      for (const dy of [-0.08, 0, 0.08]) { b.beginPath(); b.moveTo(-r * 0.08, by + r * (0.12 + dy)); b.lineTo(r * 0.08, by + r * (0.12 + dy) + r * 0.016); b.stroke(); }
      // left paw holding the coin
      b.fillStyle = white(b, -r * 0.3, 0, -r * 0.1, 0);
      ell(b, -r * 0.22, by + r * 0.06, r * 0.13, r * 0.1, -0.3); b.fill();
      // raised beckoning paw (right)
      b.save();
      b.translate(r * 0.6, hy + r * 0.32); b.rotate(0.14);
      b.fillStyle = white(b, -r * 0.14, 0, r * 0.14, 0);
      rrect(b, -r * 0.14, -r * 0.46, r * 0.28, r * 0.62, r * 0.14); b.fill();
      b.fillStyle = '#ffb3c1';
      ell(b, 0, -r * 0.3, r * 0.065, r * 0.055); b.fill();
      for (const sx of [-1, 0, 1]) { b.beginPath(); b.arc(sx * r * 0.07, -r * 0.39, r * 0.03, 0, TAU); b.fill(); }
      b.restore();
      // ears
      b.fillStyle = '#fbf7ef';
      b.beginPath(); b.moveTo(-r * 0.6, hy - r * 0.12); b.quadraticCurveTo(-r * 0.62, hy - r * 0.56, -r * 0.5, hy - r * 0.66); b.quadraticCurveTo(-r * 0.32, hy - r * 0.52, -r * 0.16, hy - r * 0.4); b.closePath(); b.fill();
      b.beginPath(); b.moveTo(r * 0.6, hy - r * 0.12); b.quadraticCurveTo(r * 0.62, hy - r * 0.56, r * 0.5, hy - r * 0.66); b.quadraticCurveTo(r * 0.32, hy - r * 0.52, r * 0.16, hy - r * 0.4); b.closePath(); b.fill();
      b.fillStyle = '#ffadbd';
      b.beginPath(); b.moveTo(-r * 0.5, hy - r * 0.24); b.quadraticCurveTo(-r * 0.52, hy - r * 0.48, -r * 0.47, hy - r * 0.54); b.lineTo(-r * 0.28, hy - r * 0.4); b.closePath(); b.fill();
      b.fillStyle = '#f08a3c';
      b.beginPath(); b.moveTo(r * 0.5, hy - r * 0.24); b.quadraticCurveTo(r * 0.52, hy - r * 0.48, r * 0.47, hy - r * 0.54); b.lineTo(r * 0.28, hy - r * 0.4); b.closePath(); b.fill();
      // head
      ell(b, 0, hy, r * 0.64, r * 0.47);
      b.fillStyle = rad(b, -r * 0.22, hy - r * 0.22, r * 0.05, 0, hy, r * 0.7, [[0, '#ffffff'], [0.72, '#f7f1e6'], [1, '#dccdb2']]); b.fill();
      b.save(); ell(b, 0, hy, r * 0.64, r * 0.47); b.clip();
      b.fillStyle = '#f08a3c'; ell(b, r * 0.44, hy - r * 0.3, r * 0.26, r * 0.22, 0.4); b.fill();
      b.fillStyle = '#4a3a3a'; ell(b, -r * 0.52, hy - r * 0.16, r * 0.15, r * 0.13, -0.3); b.fill();
      // hachimaki headband
      b.fillStyle = lin(b, 0, hy - r * 0.4, 0, hy - r * 0.22, [[0, '#ff4a4a'], [1, '#c01a2a']]);
      b.beginPath(); b.moveTo(-r * 0.7, hy - r * 0.2); b.quadraticCurveTo(0, hy - r * 0.44, r * 0.7, hy - r * 0.2); b.lineTo(r * 0.7, hy - r * 0.07); b.quadraticCurveTo(0, hy - r * 0.31, -r * 0.7, hy - r * 0.07); b.fill();
      b.strokeStyle = '#ffffff'; b.lineWidth = r * 0.032;
      b.beginPath(); b.moveTo(-r * 0.7, hy - r * 0.135); b.quadraticCurveTo(0, hy - r * 0.375, r * 0.7, hy - r * 0.135); b.stroke();
      b.restore();
      // knot with tails on the left
      b.fillStyle = '#d0202e';
      b.beginPath(); b.moveTo(-r * 0.6, hy - r * 0.12); b.lineTo(-r * 0.86, hy - r * 0.02); b.lineTo(-r * 0.78, hy + r * 0.06); b.closePath(); b.fill();
      b.beginPath(); b.moveTo(-r * 0.6, hy - r * 0.12); b.lineTo(-r * 0.82, hy - r * 0.26); b.lineTo(-r * 0.86, hy - r * 0.14); b.closePath(); b.fill();
      ell(b, -r * 0.6, hy - r * 0.13, r * 0.08, r * 0.07); b.fill();
      // red collar + gold bell
      b.fillStyle = lin(b, 0, hy + r * 0.38, 0, hy + r * 0.5, [[0, '#ff3c48'], [1, '#a81422']]);
      b.beginPath(); b.ellipse(0, hy + r * 0.42, r * 0.42, r * 0.09, 0, 0, Math.PI); b.lineTo(-r * 0.42, hy + r * 0.42); b.ellipse(0, hy + r * 0.38, r * 0.42, r * 0.07, 0, Math.PI, 0, true); b.fill();
      b.fillStyle = rad(b, -r * 0.04, hy + r * 0.5, 0, 0, hy + r * 0.56, r * 0.12, [[0, '#fff7c2'], [0.5, '#ffcc33'], [1, '#b07a08']]);
      b.beginPath(); b.arc(0, hy + r * 0.57, r * 0.1, 0, TAU); b.fill();
      b.strokeStyle = 'rgba(110,70,0,0.8)'; b.lineWidth = r * 0.018;
      b.beginPath(); b.moveTo(-r * 0.09, hy + r * 0.57); b.lineTo(r * 0.09, hy + r * 0.57); b.stroke();
    },
    top(g) {
      // whiskers, nose
      g.strokeStyle = 'rgba(120,100,90,0.6)'; g.lineWidth = r * 0.016;
      for (const sx of [-1, 1]) for (const dy of [-0.02, 0.06]) { g.beginPath(); g.moveTo(sx * r * 0.34, hy + r * (0.14 + dy)); g.lineTo(sx * r * 0.62, hy + r * (0.1 + dy * 1.8)); g.stroke(); }
      g.fillStyle = '#ff8fa6';
      g.beginPath(); g.moveTo(-r * 0.05, hy + r * 0.08); g.lineTo(r * 0.05, hy + r * 0.08); g.lineTo(0, hy + r * 0.13); g.fill();
      face(g, 0, hy + r * 0.02, r * 0.36, blink, { mouth: 'cat' });
      gloss(g, -r * 0.3, hy - r * 0.04, r * 0.14, r * 0.05, -0.5, 0.7);
      gloss(g, -r * 0.08, by + r * 0.0, r * 0.06, r * 0.1, 0.2, 0.9);
      dot(g, -r * 0.03, hy + r * 0.54, r * 0.025);
      sparkle(g, -r * 0.84, -r * 0.62, r * 0.12, 'rgba(255,240,170,0.95)');
      sparkle(g, r * 0.86, r * 0.18, r * 0.09, 'rgba(255,240,170,0.9)');
      sparkle(g, r * 0.56, r * 0.82, r * 0.06, 'rgba(255,240,170,0.85)');
    },
  };
}

const TIERS = [null, t1RiceGrain, t2Edamame, t3Tamago, t4Maki, t5Salmon, t6Tuna, t7Ikura, t8Dragon, t9Platter, t10LuckyCat];

/** Glossy kaiten plate (Sushi Counter belt only: the board pieces never sit on discs). */
function plate(g, r, tier) {
  const [li, base, dk, rim] = SUSHI_PLATES[tier];
  g.save();
  g.fillStyle = rad(g, -r * 0.3, -r * 0.35, r * 0.05, 0, 0, r * 1.05, [[0, li], [0.55, base], [1, dk]]);
  g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
  g.lineWidth = r * 0.07; g.strokeStyle = rim; g.globalAlpha = 0.55;
  g.beginPath(); g.arc(0, 0, r * 0.86, 0, TAU); g.stroke();
  g.restore();
}

/**
 * Paint one Sushi Bar piece centred at the origin, sized for orb radius r. frame 1 = blink.
 * opt.plate: sit it on a small kaiten plate (the Sushi Counter conveyor belt only).
 */
export function drawSushi(g, r, tier, frame = 0, opt = {}) {
  tier = Math.max(1, Math.min(10, tier | 0));
  const rnd = mulberry32((0x5a5e1 + tier * 7919) >>> 0);
  if (opt.plate) {
    plate(g, r, tier);
    g.save(); g.scale(0.78, 0.78);
  }
  const p = TIERS[tier](r, frame === 1, rnd);
  sticker(g, r, p.body, p.top, p.foot);
  if (opt.plate) g.restore();
}

/** Small dark number badge (top-left) used when the Numbers setting is on. */
export function drawSushiNumber(g, r, tier) {
  g.save();
  g.translate(-r * 0.66, -r * 0.66);
  g.beginPath(); g.arc(0, 0, r * 0.38, 0, TAU);
  g.fillStyle = 'rgba(15,8,40,0.92)'; g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = Math.max(1, r * 0.06); g.stroke();
  g.font = `800 ${Math.round(r * (tier >= 10 ? 0.4 : 0.5))}px Fredoka, "Baloo 2", system-ui, sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#ffffff';
  g.fillText(String(tier), 0, r * 0.03);
  g.restore();
}

/** Idle animation for a Sushi Bar piece at clock t (seconds, per-orb offset already applied): blink frame + squish. */
export function sushiIdle(t, tier) {
  const period = 3.6 + (tier % 4) * 0.45;
  const p = ((t % period) + period) % period;
  const blink = p < 0.13 ? 1 : 0;
  const w = Math.sin(t * (2.1 + tier * 0.05));
  return { frame: blink, sx: 1 + 0.028 * w, sy: 1 - 0.028 * w };
}
