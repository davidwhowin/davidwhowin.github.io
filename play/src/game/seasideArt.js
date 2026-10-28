// Seaside Café piece skin (v3 default look, DESIGN.md "v3 PIVOT"). Procedural Canvas only.
//
// Freeform pieces: no disc or ring. Each tier IS a café / harbour object, standing free in its cell like a candy in
// a match-3: a sugar cube, a coffee bean, a lemon slice, a seashell, a teacup on its saucer, a honey jar, a teapot,
// a geranium pot, a harbour lantern and a lighthouse. Tiers read by silhouette AND by one dominant colour
// (SEASIDE_COLORS): cream, dark roast, lemon yellow, peach, sky blue, amber, sage, geranium pink, navy + lamp gold,
// red-and-white stripes. The finish is a cozy storybook illustration: a soft warm-brown ink outline around the
// whole silhouette, a thin light rim on the top-left edge, a gentle inner shade bottom-right, warm highlights and a
// contact shadow. No faces: grown-up and calm. The art stays inside the cell footprint (about 1r), so hit areas and
// physics are unchanged.
//
// Painted ONCE per tier/size/frame into the orb sprite cache (orbArt.js). Five frames per tier:
//   0 rest, 1 accent A (steam / lamp glow / beam left), 2 and 3 glints, 4 accent B (steam drifts / beam right).
// The idle bob is a transform in drawOrb, so animation never repaints; Calm / reduced motion freezes it.
// Texture detail comes from a seeded mulberry32 stream per tier, so every sprite of a tier is identical.
import { mulberry32 } from './rng.js';

const TAU = Math.PI * 2;

/** Dominant colour per tier (index 1..10). Ten distinct hues and lightnesses: the colour carries the tier. */
export const SEASIDE_COLORS = [null, '#f3ece0', '#6e4026', '#f4cc2c', '#f59f86', '#6db4dc', '#e2902a', '#87b48c', '#e0507a', '#2f4b72', '#d9473d'];
/** Silhouette outline ink per tier: a deep warm shade of the dominant colour (soft, never pure black). */
const INKS = [null, '#6a5646', '#2a140a', '#6a4a06', '#6e3424', '#1e4a66', '#6a3a06', '#2c4a32', '#5e1a30', '#141e30', '#4e1612'];

/** Main colour of a tier (particles, guides). */
export const seasideColor = (tier) => SEASIDE_COLORS[Math.max(1, Math.min(10, tier | 0))];

/** Display names of the ten tiers (shop preview, merge popups, goal text). */
export const SEASIDE_NAMES = [null, 'Sugar Cube', 'Coffee Bean', 'Lemon Slice', 'Seashell', 'Teacup', 'Honey Jar', 'Teapot', 'Geranium Pot', 'Harbour Lantern', 'Lighthouse'];

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
function contact(g, x, y, rx, ry, a = 0.34) {
  g.save();
  g.fillStyle = rad(g, x, y, 0, x, y, rx, [[0, `rgba(60,34,18,${a})`], [0.6, `rgba(60,34,18,${a * 0.5})`], [1, 'rgba(60,34,18,0)']]);
  g.translate(x, y); g.scale(1, ry / rx);
  g.beginPath(); g.arc(0, 0, rx, 0, TAU); g.fill();
  g.restore();
}

function shine(g, x, y, rx, ry, rot, a = 0.6) {
  g.save();
  g.fillStyle = rad(g, x, y, 0, x, y, Math.max(rx, ry), [[0, `rgba(255,252,240,${a})`], [1, 'rgba(255,252,240,0)']]);
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
const pal = (li, base, dk, line) => ({ li, base, dk, line });

/** Inner detail line (the bold silhouette outline is added by the compositor). */
function edge(g, r, col, k = 1) {
  g.strokeStyle = col; g.lineWidth = Math.max(1, r * 0.026 * k); g.lineJoin = 'round'; g.lineCap = 'round';
  g.stroke();
}

/** A soft curl of steam rising from (x, y). phase shifts the S-curve (frames 1 / 4). Not outlined: drawn after. */
function steam(g, r, x, y, h, phase, a = 0.75) {
  g.save();
  g.lineCap = 'round';
  for (const [dx, k, w] of [[0, 1, 0.085], [0.2, 0.78, 0.065]]) {
    const sx = x + dx * r, top = y - h * r * k;
    const sw = (phase ? -1 : 1) * r * 0.1;
    const curl = () => { g.beginPath(); g.moveTo(sx, y); g.bezierCurveTo(sx + sw, y - (y - top) * 0.33, sx - sw, y - (y - top) * 0.66, sx + sw * 0.5, top); };
    curl();
    g.strokeStyle = `rgba(120,86,62,${a * 0.35 * (dx ? 0.75 : 1)})`; // warm shadow: reads on a light tray too
    g.lineWidth = Math.max(2, r * w * 1.7);
    g.stroke();
    g.strokeStyle = `rgba(255,255,255,${a * (dx ? 0.75 : 1)})`;
    g.lineWidth = Math.max(1.2, r * w);
    g.stroke();
  }
  g.restore();
}

/** Little leaf with a midrib. */
function leaf(g, r, x, y, s, rot, P) {
  g.save(); g.translate(x, y); g.rotate(rot);
  g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(s * 0.55, -s * 0.48, s * 1.15, 0); g.quadraticCurveTo(s * 0.55, s * 0.48, 0, 0); g.closePath();
  g.fillStyle = lin(g, 0, -s * 0.4, 0, s * 0.4, [[0, P.li], [1, P.dk]]); g.fill();
  g.strokeStyle = P.line; g.lineWidth = Math.max(0.8, r * 0.016);
  g.beginPath(); g.moveTo(s * 0.12, 0); g.lineTo(s * 1.0, 0); g.stroke();
  g.restore();
}

const LEAF = pal('#a8d68e', '#6aa65e', '#3f7a42', 'rgba(30,70,34,0.6)');

// ------------------------------------------------------------------ tiers (coordinates in units of r)

/** 1: a sugar cube, a rounded isometric cube with sparkly grain. */
function t1Sugar(g, r, f, rnd) {
  const s = 0.74;
  const T = [0, -s * 1.02], RU = [s * 0.94, -s * 0.5], RD = [s * 0.94, s * 0.56], B = [0, s * 1.08], LD = [-s * 0.94, s * 0.56], LU = [-s * 0.94, -s * 0.5], C = [0, 0.02];
  const poly = (pts) => {
    g.beginPath();
    g.moveTo(pts[0][0] * r, pts[0][1] * r);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0] * r, pts[i][1] * r);
    g.closePath();
  };
  g.lineJoin = 'round';
  // left face
  poly([LU, C, B, LD]);
  g.fillStyle = lin(g, -s * r, 0, 0, s * r, [[0, '#ece3d4'], [1, '#d9ccb8']]); g.fill();
  // right face
  poly([C, RU, RD, B]);
  g.fillStyle = lin(g, 0, 0, s * r, s * r, [[0, '#e2d6c2'], [1, '#c9b9a1']]); g.fill();
  // top face
  poly([LU, T, RU, C]);
  g.fillStyle = lin(g, -s * r, -s * r, s * r, 0, [[0, '#ffffff'], [1, '#f6f0e4']]); g.fill();
  // soft rounded edges: light ridges along the top
  g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = Math.max(1, r * 0.05);
  g.beginPath(); g.moveTo(LU[0] * r, LU[1] * r); g.lineTo(C[0] * r, C[1] * r); g.lineTo(RU[0] * r, RU[1] * r); g.stroke();
  g.strokeStyle = 'rgba(150,128,104,0.45)'; g.lineWidth = Math.max(1, r * 0.024);
  g.beginPath(); g.moveTo(C[0] * r, C[1] * r); g.lineTo(B[0] * r, B[1] * r); g.stroke();
  // sugar grain (clipped to the cube so no speck sits outside the silhouette)
  g.save();
  poly([T, RU, RD, B, LD, LU]); g.clip();
  for (let i = 0; i < 46; i++) {
    const face = i % 3;
    let x, y;
    const u = rnd(), v = rnd();
    if (face === 0) { x = LU[0] + (C[0] - LU[0]) * u + (T[0] - LU[0]) * v; y = LU[1] + (C[1] - LU[1]) * u + (T[1] - LU[1]) * v; if (u + v > 1) continue; }
    else if (face === 1) { x = -s * 0.9 * u; y = -s * 0.42 + u * s * 0.45 + v * s * 1.0; }
    else { x = s * 0.9 * u; y = -s * 0.42 + u * s * 0.45 + v * s * 1.0; }
    g.fillStyle = face === 0 ? 'rgba(200,184,160,0.55)' : 'rgba(255,255,255,0.75)';
    const d = r * (0.018 + rnd() * 0.02);
    g.fillRect(x * r - d / 2, y * r - d / 2, d, d);
  }
  g.restore();
  void f;
}

/** 2: a roasted coffee bean, glossy, with its S-shaped crease. */
function t2Bean(g, r, f) {
  g.save();
  g.rotate(-0.42);
  ell(g, 0, 0, r * 0.64, r * 0.88);
  g.fillStyle = gloss(g, 0, 0, r * 0.64, r * 0.88, pal('#b07a52', '#6e4026', '#2e160a')); g.fill();
  // the crease
  g.beginPath();
  g.moveTo(r * 0.02, -r * 0.78);
  g.bezierCurveTo(-r * 0.24, -r * 0.34, r * 0.24, r * 0.3, -r * 0.02, r * 0.78);
  g.strokeStyle = '#2a1206'; g.lineWidth = Math.max(1.2, r * 0.085); g.stroke();
  g.strokeStyle = 'rgba(200,150,110,0.55)'; g.lineWidth = Math.max(0.8, r * 0.025);
  g.beginPath();
  g.moveTo(r * 0.09, -r * 0.74);
  g.bezierCurveTo(-r * 0.14, -r * 0.32, r * 0.32, r * 0.3, r * 0.07, r * 0.76);
  g.stroke();
  shine(g, -r * 0.3, -r * 0.34, r * 0.13, r * 0.3, 0.1, 0.55);
  shine(g, r * 0.3, r * 0.3, r * 0.07, r * 0.16, 0.1, 0.25);
  g.restore();
  void f;
}

/** 3: a lemon slice seen at a slight tilt: rind edge, pith ring and juicy segments. */
function t3Lemon(g, r, f, rnd) {
  const rx = 0.9, ry = 0.74, cy = -0.04, th = 0.13;
  // rind thickness below
  g.fillStyle = lin(g, 0, (cy + ry - 0.1) * r, 0, (cy + ry + th) * r, [[0, '#f0bb10'], [1, '#c48a06']]);
  g.beginPath(); g.ellipse(0, (cy + th) * r, rx * r, ry * r, 0, 0, TAU); g.fill();
  // face: rind
  ell(g, 0, cy * r, rx * r, ry * r);
  g.fillStyle = lin(g, 0, -ry * r, 0, ry * r, [[0, '#ffe25a'], [1, '#f2c21a']]); g.fill();
  // pith
  ell(g, 0, cy * r, (rx - 0.09) * r, (ry - 0.08) * r);
  g.fillStyle = '#fff6d6'; g.fill();
  // segments
  const n = 9, ix = rx - 0.16, iy = ry - 0.14;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * TAU + 0.07, a1 = ((i + 1) / n) * TAU - 0.07, am = (a0 + a1) / 2;
    g.beginPath();
    g.moveTo(Math.cos(am) * 0.07 * r, cy * r + Math.sin(am) * 0.06 * r);
    g.lineTo(Math.cos(a0) * ix * r, cy * r + Math.sin(a0) * iy * r);
    g.ellipse(0, cy * r, ix * r, iy * r, 0, a0, a1);
    g.closePath();
    g.fillStyle = rad(g, 0, cy * r, r * 0.05, 0, cy * r, ix * r, [[0, '#fff3a6'], [0.6, '#ffe04a'], [1, '#f6c81e']]);
    g.fill();
    // juicy cells
    g.fillStyle = 'rgba(255,255,230,0.7)';
    for (let k = 0; k < 2; k++) {
      const t = 0.35 + rnd() * 0.45, aa = a0 + (a1 - a0) * (0.3 + rnd() * 0.4);
      ell(g, Math.cos(aa) * ix * t * r, cy * r + Math.sin(aa) * iy * t * r, r * 0.035, r * 0.06, aa + Math.PI / 2); g.fill();
    }
  }
  // a couple of pips
  g.fillStyle = '#f7ecc4';
  ell(g, r * 0.16, cy * r + r * 0.08, r * 0.04, r * 0.06, 0.6); g.fill();
  ell(g, -r * 0.12, cy * r - r * 0.12, r * 0.04, r * 0.06, -0.8); g.fill();
  // rind line
  ell(g, 0, cy * r, (rx - 0.09) * r, (ry - 0.08) * r); edge(g, r, 'rgba(200,150,20,0.5)', 0.8);
  shine(g, -r * 0.42, cy * r - r * 0.42, r * 0.22, r * 0.09, -0.5, 0.75);
  void f;
}

/** 4: a scallop seashell: a ribbed fan with two little hinge ears. */
function t4Shell(g, r, f) {
  const by = 0.62; // hinge
  const fan = () => {
    g.beginPath();
    g.moveTo(-0.22 * r, by * r);
    // left side up to the scalloped rim
    g.bezierCurveTo(-0.62 * r, 0.36 * r, -0.92 * r, -0.02 * r, -0.86 * r, -0.36 * r);
    const n = 7;
    for (let i = 0; i < n; i++) {
      const a0 = Math.PI + 0.42 + (i / n) * (Math.PI - 0.84), a1 = Math.PI + 0.42 + ((i + 1) / n) * (Math.PI - 0.84);
      const am = (a0 + a1) / 2, R = 0.94, Rb = 1.06;
      const cx = Math.cos(am) * Rb * r, cyy = (0.36 + Math.sin(am) * Rb) * r;
      g.quadraticCurveTo(cx, cyy - 0.06 * r, Math.cos(a1) * R * r, (0.36 + Math.sin(a1) * R) * r);
    }
    g.bezierCurveTo(0.92 * r, -0.02 * r, 0.62 * r, 0.36 * r, 0.22 * r, by * r);
    g.closePath();
  };
  fan();
  g.fillStyle = rad(g, -0.2 * r, -0.4 * r, r * 0.05, 0, 0.1 * r, r * 1.1, [[0, '#ffe2d2'], [0.5, '#f9ae94'], [1, '#d8705a']]);
  g.fill();
  // ribs (fanning from the hinge)
  g.save();
  fan(); g.clip();
  const n = 7;
  for (let i = 0; i <= n; i++) {
    const a = Math.PI + 0.42 + (i / n) * (Math.PI - 0.84);
    g.beginPath(); g.moveTo(0, by * r); g.lineTo(Math.cos(a) * 1.1 * r, (0.36 + Math.sin(a) * 1.1) * r);
    g.strokeStyle = 'rgba(176,82,62,0.55)'; g.lineWidth = Math.max(1, r * 0.03); g.stroke();
  }
  for (let i = 0; i < n; i++) {
    const a = Math.PI + 0.42 + ((i + 0.5) / n) * (Math.PI - 0.84);
    g.beginPath(); g.moveTo(0, by * r); g.lineTo(Math.cos(a) * 1.1 * r, (0.36 + Math.sin(a) * 1.1) * r);
    g.strokeStyle = 'rgba(255,236,224,0.6)'; g.lineWidth = Math.max(1, r * 0.06); g.stroke();
  }
  // growth bands
  for (const k of [0.45, 0.72]) {
    g.beginPath(); g.ellipse(0, by * r, k * 1.3 * r, k * 1.2 * r, 0, Math.PI + 0.3, TAU - 0.3);
    g.strokeStyle = 'rgba(176,82,62,0.25)'; g.lineWidth = Math.max(1, r * 0.02); g.stroke();
  }
  g.restore();
  // hinge ears
  g.beginPath();
  g.moveTo(-0.36 * r, 0.58 * r); g.lineTo(-0.12 * r, 0.5 * r); g.lineTo(0.12 * r, 0.5 * r); g.lineTo(0.36 * r, 0.58 * r);
  g.lineTo(0.3 * r, 0.8 * r); g.lineTo(-0.3 * r, 0.8 * r); g.closePath();
  g.fillStyle = lin(g, 0, 0.5 * r, 0, 0.8 * r, [[0, '#f7a88e'], [1, '#d06a54']]); g.fill();
  g.beginPath(); g.moveTo(-0.12 * r, 0.52 * r); g.lineTo(-0.12 * r, 0.78 * r); g.moveTo(0.12 * r, 0.52 * r); g.lineTo(0.12 * r, 0.78 * r);
  edge(g, r, 'rgba(150,64,46,0.5)', 0.8);
  shine(g, -0.36 * r, -0.36 * r, r * 0.2, r * 0.1, -0.4, 0.7);
  void f;
}

/** 5: a sky-blue teacup on its saucer, a gold rim line and a little heart of tea, steam rising. */
function t5Teacup(g, r, f) {
  // saucer
  ell(g, 0, 0.66 * r, 0.92 * r, 0.22 * r);
  g.fillStyle = lin(g, 0, 0.46 * r, 0, 0.88 * r, [[0, '#e8f4fb'], [0.5, '#a8d4ec'], [1, '#5a98c0']]); g.fill();
  ell(g, 0, 0.6 * r, 0.58 * r, 0.11 * r);
  g.fillStyle = 'rgba(70,130,170,0.35)'; g.fill();
  // handle (behind the body on the right)
  g.beginPath();
  g.ellipse(0.66 * r, 0.06 * r, 0.24 * r, 0.22 * r, 0, -1.7, 1.9);
  g.strokeStyle = '#4f97c4'; g.lineWidth = Math.max(1.6, r * 0.11); g.stroke();
  g.strokeStyle = 'rgba(220,240,252,0.7)'; g.lineWidth = Math.max(0.8, r * 0.03);
  g.beginPath(); g.ellipse(0.66 * r, 0.06 * r, 0.24 * r, 0.22 * r, 0, -1.4, 0.4); g.stroke();
  // cup body
  g.beginPath();
  g.moveTo(-0.7 * r, -0.26 * r);
  g.bezierCurveTo(-0.7 * r, 0.3 * r, -0.4 * r, 0.6 * r, 0, 0.6 * r);
  g.bezierCurveTo(0.4 * r, 0.6 * r, 0.7 * r, 0.3 * r, 0.7 * r, -0.26 * r);
  g.closePath();
  g.fillStyle = lin(g, -0.7 * r, 0, 0.7 * r, 0, [[0, '#bfe2f5'], [0.4, '#7cc0e4'], [1, '#3f86b4']]); g.fill();
  // little scallop band
  g.save();
  g.clip();
  g.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = -3; i <= 3; i++) { ell(g, i * 0.2 * r, 0.06 * r, 0.055 * r, 0.055 * r); g.fill(); }
  g.restore();
  // rim + tea
  ell(g, 0, -0.26 * r, 0.7 * r, 0.17 * r);
  g.fillStyle = '#f2f9fd'; g.fill();
  ell(g, 0, -0.24 * r, 0.6 * r, 0.12 * r);
  g.fillStyle = lin(g, 0, -0.34 * r, 0, -0.12 * r, [[0, '#a5582a'], [1, '#d48a4c']]); g.fill();
  ell(g, -0.16 * r, -0.27 * r, 0.16 * r, 0.035 * r);
  g.fillStyle = 'rgba(255,220,180,0.55)'; g.fill();
  ell(g, 0, -0.26 * r, 0.7 * r, 0.17 * r); edge(g, r, '#d8a640', 1.1);
  shine(g, -0.46 * r, 0.06 * r, r * 0.08, r * 0.2, 0.2, 0.7);
  if (f === 1 || f === 4) steam(g, r, -0.06 * r, -0.36 * r, 0.6, f === 4, 0.7);
}

/** 6: an amber honey jar with a gingham cloth lid tied with twine, a drip running down. */
function t6Honey(g, r, f) {
  // jar body
  g.beginPath();
  g.moveTo(-0.5 * r, -0.36 * r);
  g.bezierCurveTo(-0.86 * r, -0.26 * r, -0.86 * r, 0.76 * r, -0.4 * r, 0.82 * r);
  g.lineTo(0.4 * r, 0.82 * r);
  g.bezierCurveTo(0.86 * r, 0.76 * r, 0.86 * r, -0.26 * r, 0.5 * r, -0.36 * r);
  g.closePath();
  g.fillStyle = rad(g, -0.2 * r, 0.05 * r, r * 0.05, 0, 0.25 * r, r * 0.95, [[0, '#ffd77a'], [0.55, '#ee9e2a'], [1, '#b0600c']]); g.fill();
  // honey line inside the glass (the top air gap)
  g.fillStyle = 'rgba(255,240,200,0.45)';
  g.beginPath(); g.moveTo(-0.62 * r, -0.2 * r); g.lineTo(0.62 * r, -0.2 * r); g.lineTo(0.66 * r, -0.08 * r); g.lineTo(-0.66 * r, -0.08 * r); g.closePath(); g.fill();
  // label
  rrect(g, -0.4 * r, 0.12 * r, 0.8 * r, 0.42 * r, 0.1 * r);
  g.fillStyle = '#fbf3e0'; g.fill(); edge(g, r, 'rgba(140,90,30,0.5)', 0.8);
  // a tiny bee-hex on the label
  g.beginPath();
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + Math.PI / 6; g.lineTo(Math.cos(a) * 0.11 * r, 0.33 * r + Math.sin(a) * 0.11 * r); }
  g.closePath(); g.fillStyle = '#f0b440'; g.fill(); edge(g, r, 'rgba(140,90,30,0.6)', 0.7);
  // neck
  rrect(g, -0.44 * r, -0.5 * r, 0.88 * r, 0.18 * r, 0.06 * r);
  g.fillStyle = lin(g, 0, -0.5 * r, 0, -0.32 * r, [[0, '#f6c068'], [1, '#c87818']]); g.fill();
  // cloth lid: rounded puff with gingham + frilly edge
  g.beginPath();
  g.moveTo(-0.66 * r, -0.44 * r);
  g.quadraticCurveTo(-0.62 * r, -0.92 * r, 0, -0.92 * r);
  g.quadraticCurveTo(0.62 * r, -0.92 * r, 0.66 * r, -0.44 * r);
  for (let i = 0; i <= 8; i++) { const x = 0.66 - i * 0.165; g.quadraticCurveTo((x - 0.08) * r, -0.3 * r, (x - 0.165) * r, -0.44 * r); }
  g.closePath();
  g.fillStyle = '#fbf3e6'; g.fill();
  g.save(); g.clip();
  g.fillStyle = 'rgba(208,96,80,0.42)';
  for (let i = -5; i <= 5; i++) { g.fillRect((i * 0.17 - 0.04) * r, -1 * r, 0.08 * r, 0.8 * r); g.fillRect(-0.8 * r, (-0.92 + (i + 5) * 0.12) * r, 1.6 * r, 0.06 * r); }
  g.restore();
  // twine
  g.beginPath(); g.moveTo(-0.6 * r, -0.44 * r); g.quadraticCurveTo(0, -0.38 * r, 0.6 * r, -0.44 * r);
  g.strokeStyle = '#a4703a'; g.lineWidth = Math.max(1, r * 0.05); g.stroke();
  ell(g, 0.14 * r, -0.4 * r, 0.08 * r, 0.05 * r, -0.4); g.fillStyle = '#b8824a'; g.fill();
  // honey drip from under the lid
  const dl = f === 4 ? 0.1 : 0;
  g.beginPath();
  g.moveTo(-0.56 * r, -0.34 * r);
  g.lineTo(-0.56 * r, (-0.02 + dl) * r);
  g.arc(-0.5 * r, (-0.02 + dl) * r, 0.06 * r, Math.PI, 0, true);
  g.lineTo(-0.44 * r, -0.34 * r);
  g.closePath();
  g.fillStyle = '#e88a14'; g.fill();
  shine(g, -0.52 * r, -0.12 * r, r * 0.025, r * 0.06, 0, 0.8);
  shine(g, -0.56 * r, 0.36 * r, r * 0.07, r * 0.22, 0.1, 0.65);
  shine(g, 0.6 * r, 0.3 * r, r * 0.04, r * 0.14, -0.1, 0.35);
}

/** 7: a round sage teapot: spout left, loop handle right, lid knob, a band of little flowers, steam from the spout. */
function t7Teapot(g, r, f) {
  const P = pal('#d4ebd2', '#8bba8f', '#4a7a52');
  // handle (right)
  g.beginPath(); g.ellipse(0.7 * r, 0.12 * r, 0.24 * r, 0.3 * r, 0, -1.6, 1.6);
  g.strokeStyle = '#5f9466'; g.lineWidth = Math.max(1.6, r * 0.11); g.stroke();
  // spout (left)
  g.beginPath();
  g.moveTo(-0.56 * r, 0.32 * r);
  g.quadraticCurveTo(-0.84 * r, 0.24 * r, -0.98 * r, -0.2 * r);
  g.lineTo(-0.86 * r, -0.24 * r);
  g.quadraticCurveTo(-0.76 * r, 0.04 * r, -0.54 * r, 0.04 * r);
  g.closePath();
  g.fillStyle = lin(g, -0.9 * r, -0.2 * r, -0.6 * r, 0.3 * r, [[0, '#b4d8b4'], [1, '#5f9466']]); g.fill();
  // body
  ell(g, 0, 0.24 * r, 0.72 * r, 0.6 * r);
  g.fillStyle = gloss(g, 0, 0.24 * r, 0.72 * r, 0.6 * r, P); g.fill();
  // foot
  ell(g, 0, 0.8 * r, 0.42 * r, 0.08 * r); g.fillStyle = '#5f9466'; g.fill();
  // flower band
  g.save(); ell(g, 0, 0.24 * r, 0.72 * r, 0.6 * r); g.clip();
  g.beginPath(); g.ellipse(0, 0.0 * r, 0.9 * r, 0.24 * r, 0, 0.15, Math.PI - 0.15);
  g.strokeStyle = 'rgba(255,250,236,0.85)'; g.lineWidth = Math.max(1, r * 0.035); g.stroke();
  for (const [x, y] of [[-0.42, 0.3], [0, 0.4], [0.42, 0.3]]) {
    g.fillStyle = '#fbf3e4';
    for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; ell(g, (x + Math.cos(a) * 0.06) * r, (y + Math.sin(a) * 0.06) * r, 0.05 * r, 0.05 * r); g.fill(); }
    ell(g, x * r, y * r, 0.035 * r, 0.035 * r); g.fillStyle = '#f0b440'; g.fill();
  }
  g.restore();
  // lid
  ell(g, 0, -0.3 * r, 0.42 * r, 0.12 * r); g.fillStyle = lin(g, 0, -0.42 * r, 0, -0.18 * r, [[0, '#c8e4c6'], [1, '#6a9e70']]); g.fill();
  g.beginPath(); g.ellipse(0, -0.34 * r, 0.34 * r, 0.2 * r, 0, Math.PI, 0); g.closePath();
  g.fillStyle = gloss(g, 0, -0.42 * r, 0.34 * r, 0.16 * r, P); g.fill();
  // knob
  ell(g, 0, -0.6 * r, 0.1 * r, 0.09 * r); g.fillStyle = gloss(g, 0, -0.6 * r, 0.1 * r, 0.09 * r, pal('#fff3c8', '#e8b74a', '#a8741a')); g.fill();
  shine(g, -0.36 * r, 0.02 * r, r * 0.12, r * 0.2, 0.4, 0.7);
  if (f === 1 || f === 4) steam(g, r, -0.94 * r, -0.3 * r, 0.52, f === 4, 0.7);
}

/** 8: a terracotta pot of red-pink geraniums with round scalloped leaves. */
function t8Geranium(g, r, f, rnd) {
  // pot
  g.beginPath();
  g.moveTo(-0.5 * r, 0.22 * r); g.lineTo(0.5 * r, 0.22 * r); g.lineTo(0.38 * r, 0.86 * r); g.lineTo(-0.38 * r, 0.86 * r); g.closePath();
  g.fillStyle = lin(g, -0.5 * r, 0, 0.5 * r, 0, [[0, '#e69a6c'], [0.45, '#cc7044'], [1, '#94482a']]); g.fill();
  rrect(g, -0.58 * r, 0.12 * r, 1.16 * r, 0.2 * r, 0.05 * r);
  g.fillStyle = lin(g, -0.58 * r, 0, 0.58 * r, 0, [[0, '#f0a878'], [0.5, '#d27a4c'], [1, '#a0522e']]); g.fill();
  // leaves (scalloped rounds)
  const LV = pal('#9fd08a', '#5f9e56', '#336a36');
  const leafR = (x, y, s) => {
    g.beginPath();
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; const k = i % 2 ? 0.86 : 1; g.lineTo((x + Math.cos(a) * s * k) * r, (y + Math.sin(a) * s * k) * r); }
    g.closePath();
    g.fillStyle = gloss(g, x * r, y * r, s * r, s * r, LV); g.fill();
    ell(g, x * r, y * r, s * 0.55 * r, s * 0.55 * r); g.strokeStyle = 'rgba(60,40,20,0.22)'; g.lineWidth = Math.max(1, r * 0.03); g.stroke();
  };
  leafR(-0.56, 0.0, 0.24); leafR(0.58, -0.02, 0.24); leafR(-0.24, 0.08, 0.2); leafR(0.26, 0.1, 0.2);
  // bloom clusters: many small 5-petal florets in a ball
  const sway = f === 1 ? -0.02 : f === 4 ? 0.02 : 0;
  const ball = (cx, cy, s) => {
    cx += sway;
    ell(g, cx * r, cy * r, s * r, s * 0.92 * r);
    g.fillStyle = gloss(g, cx * r, cy * r, s * r, s * r, pal('#ff9ab0', '#e0507a', '#9e2048')); g.fill();
    for (let i = 0; i < 9; i++) {
      const a = rnd() * TAU, d = Math.sqrt(rnd()) * s * 0.72;
      const fx = (cx + Math.cos(a) * d) * r, fy = (cy + Math.sin(a) * d * 0.9) * r, ps = s * 0.17 * r;
      g.fillStyle = d < s * 0.4 ? '#ffb4c4' : '#f0708e';
      for (let k = 0; k < 5; k++) { const b = k / 5 * TAU + a; ell(g, fx + Math.cos(b) * ps, fy + Math.sin(b) * ps, ps * 0.8, ps * 0.8); g.fill(); }
      ell(g, fx, fy, ps * 0.45, ps * 0.45); g.fillStyle = '#fff0c8'; g.fill();
    }
  };
  // stems
  g.strokeStyle = '#4f8a48'; g.lineWidth = Math.max(1, r * 0.04);
  g.beginPath(); g.moveTo(0, 0.12 * r); g.quadraticCurveTo(-0.1 * r, -0.2 * r, (-0.34 + sway) * r, -0.36 * r);
  g.moveTo(0, 0.12 * r); g.quadraticCurveTo(0.1 * r, -0.2 * r, (0.36 + sway) * r, -0.3 * r);
  g.moveTo(0, 0.12 * r); g.lineTo(sway * r, -0.5 * r); g.stroke();
  ball(-0.36, -0.36, 0.3);
  ball(0.38, -0.3, 0.28);
  ball(0.0, -0.62, 0.3);
  // pot rim line + shine
  rrect(g, -0.58 * r, 0.12 * r, 1.16 * r, 0.2 * r, 0.05 * r); edge(g, r, 'rgba(110,50,26,0.5)', 0.8);
  shine(g, -0.3 * r, 0.5 * r, r * 0.06, r * 0.18, 0.1, 0.5);
}

/** 9: a navy harbour lantern: hanging ring, peaked cap, four glass panes with a warm flame, brass trim. */
function t9Lantern(g, r, f) {
  const glow = f === 1 ? 1 : f === 4 ? 0.8 : 0.9;
  const NAVY = pal('#6a86b0', '#2f4b72', '#16243c');
  const BRASS = pal('#fff0b8', '#e2b450', '#9a6c18');
  // ring
  g.beginPath(); g.arc(0, -0.86 * r, 0.12 * r, 0, TAU);
  g.strokeStyle = '#c8962e'; g.lineWidth = Math.max(1.2, r * 0.05); g.stroke();
  // cap
  g.beginPath();
  g.moveTo(-0.5 * r, -0.44 * r); g.lineTo(0, -0.78 * r); g.lineTo(0.5 * r, -0.44 * r); g.closePath();
  g.fillStyle = gloss(g, 0, -0.6 * r, 0.5 * r, 0.3 * r, NAVY); g.fill();
  rrect(g, -0.56 * r, -0.5 * r, 1.12 * r, 0.12 * r, 0.05 * r); g.fillStyle = gloss(g, 0, -0.44 * r, 0.56 * r, 0.06 * r, BRASS); g.fill();
  // glass body (slight taper)
  g.beginPath();
  g.moveTo(-0.46 * r, -0.38 * r); g.lineTo(0.46 * r, -0.38 * r); g.lineTo(0.4 * r, 0.5 * r); g.lineTo(-0.4 * r, 0.5 * r); g.closePath();
  g.fillStyle = rad(g, 0, 0.08 * r, r * 0.04, 0, 0.08 * r, r * 0.62, [[0, '#fff8d8'], [0.35, `rgba(255,214,110,${glow})`], [1, '#d68a2a']]);
  g.fill();
  // flame
  g.beginPath();
  g.moveTo(0, -0.14 * r);
  g.quadraticCurveTo(0.12 * r, 0.06 * r, 0, 0.2 * r);
  g.quadraticCurveTo(-0.12 * r, 0.06 * r, 0, -0.14 * r);
  g.fillStyle = f === 1 ? '#fffbe8' : '#fff2b8'; g.fill();
  ell(g, 0, 0.26 * r, 0.06 * r, 0.04 * r); g.fillStyle = '#b8742a'; g.fill();
  // frame bars
  g.strokeStyle = '#22385a'; g.lineWidth = Math.max(1.2, r * 0.07); g.lineCap = 'round';
  g.beginPath();
  g.moveTo(-0.43 * r, -0.38 * r); g.lineTo(-0.38 * r, 0.5 * r);
  g.moveTo(0.43 * r, -0.38 * r); g.lineTo(0.38 * r, 0.5 * r);
  g.moveTo(-0.15 * r, -0.38 * r); g.lineTo(-0.13 * r, 0.5 * r);
  g.moveTo(0.15 * r, -0.38 * r); g.lineTo(0.13 * r, 0.5 * r);
  g.stroke();
  // base
  rrect(g, -0.52 * r, 0.46 * r, 1.04 * r, 0.14 * r, 0.05 * r); g.fillStyle = gloss(g, 0, 0.52 * r, 0.52 * r, 0.07 * r, BRASS); g.fill();
  g.beginPath();
  g.moveTo(-0.42 * r, 0.6 * r); g.lineTo(0.42 * r, 0.6 * r); g.lineTo(0.3 * r, 0.82 * r); g.lineTo(-0.3 * r, 0.82 * r); g.closePath();
  g.fillStyle = gloss(g, 0, 0.7 * r, 0.42 * r, 0.12 * r, NAVY); g.fill();
  // glass sheen
  g.fillStyle = 'rgba(255,255,255,0.45)';
  g.beginPath(); g.moveTo(-0.36 * r, -0.32 * r); g.lineTo(-0.22 * r, -0.32 * r); g.lineTo(-0.26 * r, 0.1 * r); g.lineTo(-0.34 * r, 0.1 * r); g.closePath(); g.fill();
  shine(g, -0.2 * r, -0.62 * r, r * 0.1, r * 0.05, -0.5, 0.6);
}

/** 10: a red-and-white lighthouse on a little rock: gallery rail, glowing lamp room, a beam that sweeps. */
function t10Lighthouse(g, r, f, rnd) {
  // rocks + a curl of sea
  g.beginPath();
  g.moveTo(-0.74 * r, 0.86 * r);
  g.quadraticCurveTo(-0.7 * r, 0.52 * r, -0.42 * r, 0.5 * r);
  g.quadraticCurveTo(-0.2 * r, 0.36 * r, 0.1 * r, 0.44 * r);
  g.quadraticCurveTo(0.5 * r, 0.4 * r, 0.62 * r, 0.6 * r);
  g.quadraticCurveTo(0.8 * r, 0.7 * r, 0.76 * r, 0.86 * r);
  g.closePath();
  g.fillStyle = lin(g, 0, 0.4 * r, 0, 0.86 * r, [[0, '#a8a090'], [1, '#6a6254']]); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.18)';
  for (let i = 0; i < 4; i++) { ell(g, (-0.5 + i * 0.32 + rnd() * 0.06) * r, (0.6 + rnd() * 0.1) * r, 0.1 * r, 0.04 * r); g.fill(); }
  // tower (tapered) with stripes
  const top = -0.36, bot = 0.56, wt = 0.24, wb = 0.38;
  const tower = () => {
    g.beginPath();
    g.moveTo(-wt * r, top * r); g.lineTo(wt * r, top * r); g.lineTo(wb * r, bot * r); g.lineTo(-wb * r, bot * r); g.closePath();
  };
  tower();
  g.fillStyle = '#fbf6ec'; g.fill();
  g.save(); tower(); g.clip();
  const bands = [[-0.36, -0.14], [0.08, 0.3]];
  for (const [y0, y1] of bands) {
    g.fillStyle = lin(g, -wb * r, 0, wb * r, 0, [[0, '#f07a68'], [0.45, '#d9473d'], [1, '#9a2a22']]);
    g.fillRect(-r, y0 * r, 2 * r, (y1 - y0) * r);
  }
  g.fillStyle = 'rgba(120,80,50,0.18)';
  g.fillRect(0.12 * r, top * r, 0.3 * r, (bot - top) * r);
  g.restore();
  // door + window
  rrect(g, -0.08 * r, 0.36 * r, 0.16 * r, 0.2 * r, 0.07 * r); g.fillStyle = '#3a4a62'; g.fill();
  ell(g, 0, 0.0 * r, 0.06 * r, 0.06 * r); g.fillStyle = '#ffd36a'; g.fill();
  // gallery
  rrect(g, -0.36 * r, -0.44 * r, 0.72 * r, 0.1 * r, 0.03 * r); g.fillStyle = '#2f3a4e'; g.fill();
  g.strokeStyle = '#2f3a4e'; g.lineWidth = Math.max(1, r * 0.03);
  g.beginPath(); g.moveTo(-0.34 * r, -0.56 * r); g.lineTo(0.34 * r, -0.56 * r);
  for (let i = 0; i <= 4; i++) { const x = -0.34 + i * 0.17; g.moveTo(x * r, -0.56 * r); g.lineTo(x * r, -0.44 * r); }
  g.stroke();
  // lamp room
  const lit = f === 1 || f === 4 ? 1 : 0.85;
  rrect(g, -0.2 * r, -0.72 * r, 0.4 * r, 0.3 * r, 0.04 * r);
  g.fillStyle = rad(g, 0, -0.58 * r, r * 0.02, 0, -0.58 * r, r * 0.3, [[0, '#fffbe6'], [0.5, `rgba(255,214,100,${lit})`], [1, '#e8a43a']]); g.fill();
  g.strokeStyle = '#2f3a4e'; g.lineWidth = Math.max(1, r * 0.03);
  g.beginPath(); g.moveTo(0, -0.72 * r); g.lineTo(0, -0.44 * r); g.stroke();
  // roof + finial
  g.beginPath(); g.moveTo(-0.28 * r, -0.7 * r); g.quadraticCurveTo(0, -0.98 * r, 0.28 * r, -0.7 * r); g.closePath();
  g.fillStyle = lin(g, -0.28 * r, 0, 0.28 * r, 0, [[0, '#f07a68'], [1, '#9a2a22']]); g.fill();
  ell(g, 0, -0.92 * r, 0.04 * r, 0.04 * r); g.fillStyle = '#2f3a4e'; g.fill();
  shine(g, -0.16 * r, -0.04 * r, r * 0.04, r * 0.3, 0.05, 0.55);
}

const TIERS = [null, t1Sugar, t2Bean, t3Lemon, t4Shell, t5Teacup, t6Honey, t7Teapot, t8Geranium, t9Lantern, t10Lighthouse];

/** Glint positions per tier (units of r): frame 2 lights set A, frame 3 set B. Drawn on top, never outlined. */
const GLINTS = [null,
  [[[-0.34, -0.5, 0.15]], [[0.44, -0.2, 0.12], [-0.5, 0.3, 0.08]]],
  [[[-0.32, -0.44, 0.15]], [[0.34, 0.36, 0.1]]],
  [[[-0.46, -0.46, 0.15]], [[0.5, 0.16, 0.12]]],
  [[[-0.4, -0.5, 0.15]], [[0.44, -0.38, 0.12]]],
  [[[-0.46, 0.0, 0.14]], [[0.5, -0.3, 0.12], [-0.6, 0.66, 0.08]]],
  [[[-0.5, 0.3, 0.15]], [[0.5, 0.0, 0.12]]],
  [[[-0.36, -0.06, 0.15]], [[0.0, -0.62, 0.11], [0.44, 0.44, 0.09]]],
  [[[-0.34, -0.52, 0.13]], [[0.1, -0.78, 0.11], [0.5, -0.4, 0.09]]],
  [[[-0.3, -0.2, 0.15]], [[0.1, -0.7, 0.11]]],
  [[[-0.12, -0.6, 0.14]], [[0.0, -0.94, 0.1], [-0.2, 0.2, 0.09]]],
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

/** Lighthouse beam (frames 1 / 4) and lantern halo: soft light drawn behind the outline, never outlined. */
function lightBehind(g, r, tier, frame) {
  if (tier === 9) {
    const a = frame === 1 ? 0.5 : 0.36;
    g.fillStyle = rad(g, 0, 0.06 * r, r * 0.1, 0, 0.06 * r, r * 0.95, [[0, `rgba(255,214,120,${a})`], [1, 'rgba(255,214,120,0)']]);
    g.beginPath(); g.arc(0, 0.06 * r, r * 0.95, 0, TAU); g.fill();
  }
  if (tier === 10 && (frame === 1 || frame === 4)) {
    const dir = frame === 1 ? -1 : 1;
    g.save();
    g.translate(0, -0.58 * r);
    g.fillStyle = lin(g, 0, 0, dir * r * 1.0, 0, [[0, 'rgba(255,236,170,0.8)'], [1, 'rgba(255,236,170,0)']]);
    g.beginPath(); g.moveTo(0, -0.05 * r); g.lineTo(dir * r * 1.0, -0.26 * r); g.lineTo(dir * r * 1.0, 0.18 * r); g.lineTo(0, 0.05 * r); g.closePath(); g.fill();
    g.restore();
  }
}

/**
 * Paint one Seaside piece centred at the origin, radius r (CSS px). frame: see the file header.
 * The object is painted into an offscreen layer first so the outline, rim light and inner shade follow its exact
 * silhouette. dpr: device pixel ratio of the target (the sprite cache passes it).
 */
export function drawSeaside(g, r, tier, frame = 0, dpr = 1) {
  tier = Math.max(1, Math.min(10, tier | 0));
  frame = frame | 0;
  const rnd = mulberry32((0x5ea51de + tier * 7919) >>> 0);
  const size = Math.ceil(r * 2 * 1.3 * dpr), half = size / 2 / dpr;
  const art = makeCanvas(size, size), a = art.getContext('2d');
  a.translate(size / 2, size / 2); a.scale(dpr, dpr);
  a.lineCap = 'round';
  // steam is painted separately so it never gets an ink outline
  const steamy = tier === 5 || tier === 7;
  TIERS[tier](a, r, steamy ? 0 : frame, rnd);
  const ow = Math.max(1.1, r * 0.055), od = ow * dpr;
  const sil = tinted(art, size, INKS[tier]);
  const rim = tinted(art, size, '#fffaf0', od * 0.75, od * 0.9);
  const shade = tinted(art, size, INKS[tier], -od * 0.9, -od * 1.1);

  contact(g, 0, r * 0.9, r * 0.8, r * 0.13);
  lightBehind(g, r, tier, frame);
  for (let i = 0; i < 16; i++) {
    const t = (i / 16) * TAU;
    g.drawImage(sil, -half + Math.cos(t) * ow, -half + Math.sin(t) * ow, half * 2, half * 2);
  }
  g.drawImage(art, -half, -half, half * 2, half * 2);
  g.save();
  g.globalAlpha = 0.2;
  g.drawImage(shade, -half, -half, half * 2, half * 2);
  g.globalAlpha = tier === 1 ? 0.35 : 0.55;
  g.drawImage(rim, -half, -half, half * 2, half * 2);
  g.restore();
  if (steamy && (frame === 1 || frame === 4)) {
    if (tier === 5) steam(g, r, -0.06 * r, -0.36 * r, 0.72, frame === 4, 0.85);
    else steam(g, r, -0.94 * r, -0.3 * r, 0.5, frame === 4, 0.8);
  }
  // sparkle glints (frames 2 and 3): soft halo + four-point star, on top of the outline
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
 * Idle animation for a Seaside piece at clock t (seconds, per-orb offset already applied).
 * frame: 0 rest, 1 / 4 accents (steam curls, lamp flicker, lighthouse beam sweep), 2 / 3 glints.
 * Plus a gentle bob-squish (about ±1.8%). Each cycle has its own period per tier, so a tray never moves in lockstep.
 */
export function seasideIdle(t, tier) {
  const cyc = (off, per) => { const p = (t + off) % per; return p < 0 ? p + per : p; };
  const sp = cyc(1.3 + tier * 0.53, 5.1 + (tier % 3) * 0.6);
  const spark = sp < 0.22 ? 2 : sp < 0.44 ? 3 : 0;
  let accent = 0;
  if (tier === 5 || tier === 7 || tier === 10) {
    // steam / beam: a slow two-pose loop that is on most of the time
    const p = cyc(tier * 0.37, 2.4);
    accent = p < 1.2 ? 1 : 4;
    if (cyc(0.9 + tier, 9.5) < 2.2) accent = 0; // and sometimes rests
  } else if (tier === 9) {
    accent = cyc(tier * 0.3, 0.9) < 0.45 ? 1 : 4; // the flame flickers softly
  } else {
    const w = cyc(2.7 + tier * 0.71, 6.4 + (tier % 5) * 0.5);
    accent = w < 0.3 ? 1 : w < 0.6 ? 4 : 0;
  }
  const frame = spark || accent;
  const w = Math.sin(t * (1.7 + tier * 0.05));
  return { frame, sx: 1 + 0.018 * w, sy: 1 - 0.018 * w };
}
