// Coast Path scenery (v3 "Nova's Seaside Café"): the Journey map is a cozy coastal walk. Each 20-level
// chapter is one stretch of the path; the free pockets beside the winding path hold little vignettes
// (coves with fishing boats, a harbour jetty, a lighthouse on its headland, beach huts, rock pools,
// dunes with a bench), with beach grass, wildflowers and lantern posts along the way. The chapter's
// time of day (chapters.js theme.backdropVariant: sunrise, noon, rain, golden, dusk, starry) tints the
// whole stretch and lights the lanterns after dark.
//
// Presentation only: no rules, no game RNG (a local seeded generator per chapter), no DOM here.
// Readability rule (35-65+ audience): scenery stays soft, pastel and low-contrast so the level
// buttons and the path are always the clearest thing on screen.
//
// Coordinates: painters get the chapter canvas size (w, h in CSS px; the caller has scaled the
// context for device pixels), the chapter's nodes `pts` and its free `pockets` in local coordinates.

const TAU = Math.PI * 2;
export const hsla = (h, s, l, a) => `hsla(${Math.round(h)},${Math.round(s)}%,${Math.round(l)}%,${a})`;

/** Vignettes for the pockets beside the path, rotated by chapter so neighbouring stretches differ. */
export const SCENE_ORDER = ['cove', 'huts', 'lighthouse', 'rockpool', 'harbour', 'dunes'];
const WATER = new Set(['cove', 'harbour', 'lighthouse']);

/**
 * Time-of-day looks. tint = multiply colour over the daylight art (null = none), base = the colour shown
 * before the canvas is painted, lamps = how strongly lanterns and windows glow (0 = unlit).
 * The look eases back to plain daylight over SEAM_FADE px at both ends of a chapter, so neighbouring
 * chapters with different times of day meet without a hard line under the gate plaque.
 */
export const SEAM_FADE = 300;
export const VARIANTS = {
  sunrise: { tint: '#fff2ea', wash: 'rgba(255,196,176,0.10)', base: '#e9ecc0', lamps: 0.2 },
  noon: { tint: null, wash: null, base: '#dcecb0', lamps: 0 },
  rain: { tint: '#e1e7e8', wash: 'rgba(176,190,204,0.14)', base: '#cfdcc0', lamps: 0.35 },
  golden: { tint: '#fff0d0', wash: 'rgba(255,204,120,0.10)', base: '#e6e6b0', lamps: 0.2 },
  dusk: { tint: '#ead6e4', wash: 'rgba(170,130,190,0.12)', base: '#cfc4c8', lamps: 0.75 },
  starry: { tint: '#8f9ce2', wash: 'rgba(60,60,170,0.12)', base: '#7f8db6', lamps: 1 },
};
export const variantOf = (v) => VARIANTS[v] || VARIANTS.noon;

const C = {
  grass: '#d5eaa6', grassHi: '#e4f2bf', grassLo: '#bcd98f', tuft: '#8fb466', tuftDk: '#77a055',
  sand: '#f6e7c1', sandLo: '#ead6a6', wet: '#dfc999', shoal: '#bdeee6', sea: '#86d4dc', deep: '#5ab3c9', foam: 'rgba(255,255,255,0.85)',
  rock: '#a9a39a', rockLo: '#857e74', rockHi: '#c9c3b8', wood: '#a7774a', woodLo: '#7d5634', post: '#5e4634',
  flowers: ['#f4a6b8', '#ffffff', '#f7d46b', '#c9a7e8'],
  huts: [['#f08a7e', '#fff3e6'], ['#6fbcb4', '#fff3e6'], ['#f6c75a', '#fff3e6'], ['#a9b8ec', '#fff3e6'], ['#f3a76b', '#fff3e6']],
};

// ------------------------------------------------------------------ helpers

/** Small seeded generator (mulberry32) for scenery only. */
export function rngFor(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The path's x at local height y (linear between the chapter's nodes; the gates sit on the centre). */
export function pathXAt(pts, y, w, h) {
  const s = [{ x: w / 2, y: h }, ...[...pts].sort((a, b) => b.y - a.y), { x: w / 2, y: 0 }];
  for (let i = 1; i < s.length; i++) {
    if (y >= s[i].y) {
      const t = (s[i - 1].y - y) / Math.max(1, s[i - 1].y - s[i].y);
      return s[i - 1].x + (s[i].x - s[i - 1].x) * Math.max(0, Math.min(1, t));
    }
  }
  return w / 2;
}

function distToPath(pts, x, y, w, h) {
  return Math.abs(x - pathXAt(pts, y, w, h));
}

/** Soft radial glow. `color` is rgba(r,g,b,a); it fades to the same colour at alpha 0 (no grey fringe). */
export function glow(ctx, x, y, r, color) {
  if (r <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, color.replace(/,\s*[\d.]+\)\s*$/, ',0)'));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

/** A soft organic blob: a smooth closed curve through k wobbly points (midpoint quadratics). */
function blob(ctx, x, y, rx, ry, rnd, wob = 0.18) {
  const k = 10;
  const p = [];
  for (let i = 0; i < k; i++) {
    const a = (i / k) * TAU, r = 1 + (rnd() - 0.5) * 2 * wob;
    p.push([x + Math.cos(a) * rx * r, y + Math.sin(a) * ry * r]);
  }
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  ctx.beginPath();
  const m0 = mid(p[k - 1], p[0]);
  ctx.moveTo(m0[0], m0[1]);
  for (let i = 0; i < k; i++) {
    const m = mid(p[i], p[(i + 1) % k]);
    ctx.quadraticCurveTo(p[i][0], p[i][1], m[0], m[1]);
  }
  ctx.closePath();
}

function shadow(ctx, x, y, rx, ry, a = 0.18) {
  ctx.fillStyle = `rgba(90,70,40,${a})`;
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill();
}

function tuft(ctx, x, y, s, rnd, col = C.tuft) {
  ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.32 + (rnd() - 0.5) * 0.2;
    const l = s * (0.7 + rnd() * 0.5);
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.cos(a) * l * 0.4, y + Math.sin(a) * l * 0.6, x + Math.cos(a) * l + (i - 2) * 1.5, y + Math.sin(a) * l);
    ctx.stroke();
  }
}

function gull(ctx, x, y, s, col = 'rgba(90,90,100,0.75)') {
  ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - s, y);
  ctx.quadraticCurveTo(x - s * 0.5, y - s * 0.6, x, y);
  ctx.quadraticCurveTo(x + s * 0.5, y - s * 0.6, x + s, y);
  ctx.stroke();
}

function starfish(ctx, x, y, r, col) {
  ctx.fillStyle = col;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.42 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fill();
}

// ------------------------------------------------------------------ plan (pure, shared with the DOM layer)

/**
 * Where everything goes in one chapter. Pure and deterministic (no canvas): the painter and the ambient
 * DOM layer both read it. Returns { vignettes, lanterns, glints, gulls }.
 *  vignettes[j] = { kind, side, cy, cx, fw, water } (fw = free width between the path and the edge)
 */
export function coastPlan({ w, h, index, pts, pockets }) {
  const rnd = rngFor(0xc0a57 + index * 7919);
  const vignettes = (pockets || []).map((p, j) => {
    const kind = SCENE_ORDER[(index * 2 + j) % SCENE_ORDER.length];
    const px = pathXAt(pts, p.y, w, h);
    const fw = p.side > 0 ? w - (px + 46) : px - 46;
    const cx = p.side > 0 ? w - fw / 2 : fw / 2;
    // maxHalf keeps water inside this chapter's canvas (no cut-off sea at a seam)
    return { kind, side: p.side, cy: p.y, cx, fw: Math.max(60, fw), water: WATER.has(kind), maxHalf: Math.max(80, Math.min(p.y, h - p.y) - 28) };
  });
  // lantern posts beside the path, every third step, on alternating sides, clear of every node
  const lanterns = [];
  const s = [...pts].sort((a, b) => b.y - a.y);
  for (let i = 1; i < s.length; i += 3) {
    const a = s[i - 1], b = s[i];
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
    const side = (i % 2 ? 1 : -1);
    const x = mx + (-dy / len) * 44 * side, y = my + (dx / len) * 44 * side;
    if (x < 16 || x > w - 16) continue;
    if (pts.some((p) => Math.hypot(p.x - x, p.y - y) < 54)) continue;
    lanterns.push({ x: Math.round(x), y: Math.round(y) });
  }
  const glints = [], gulls = [];
  for (const v of vignettes) {
    if (v.water) for (let k = 0; k < 3; k++) glints.push({ x: Math.round(v.side > 0 ? w - v.fw * (0.15 + rnd() * 0.3) : v.fw * (0.15 + rnd() * 0.3)), y: Math.round(v.cy + (rnd() - 0.5) * Math.min(220, v.maxHalf * 1.2)) });
    gulls.push({ x: Math.round(v.cx + (rnd() - 0.5) * v.fw * 0.5), y: Math.round(v.cy - 120 - rnd() * 60) });
  }
  return { vignettes, lanterns, glints, gulls };
}

// ------------------------------------------------------------------ painters

/** A sea inlet from the map edge (side +1 = right edge). Returns the shoreline as [[x, y], ...]. */
function seaInlet(ctx, v, w, rnd, depthK = 0.86, half = 190) {
  half = Math.min(half, v.maxHalf || half);
  const edge = v.side > 0 ? w + 12 : -12;
  const D = Math.min(v.fw * depthK, w * 0.5);
  const shore = [];
  const n = 18;
  const ph = rnd() * TAU;
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const y = v.cy - half + u * half * 2;
    const d = D * Math.pow(Math.sin(Math.PI * u), 0.65) * (0.92 + 0.08 * Math.sin(ph + u * 9));
    shore.push([edge - v.side * (12 + d), y]);
  }
  const fill = (grow, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(edge, v.cy - half - grow);
    for (const [x, y] of shore) ctx.lineTo(x - v.side * grow * Math.sin(Math.PI * Math.max(0, Math.min(1, (y - v.cy + half) / (half * 2)))), y);
    ctx.lineTo(edge, v.cy + half + grow);
    ctx.closePath(); ctx.fill();
  };
  fill(26, C.sand);
  fill(12, C.wet);
  const g = ctx.createLinearGradient(edge - v.side * D, 0, edge, 0);
  g.addColorStop(0, C.shoal); g.addColorStop(0.45, C.sea); g.addColorStop(1, C.deep);
  fill(0, g);
  // foam along the shore and a few soft wave ticks
  ctx.strokeStyle = C.foam; ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath();
  shore.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1.6;
  ctx.beginPath();
  shore.forEach(([x, y], i) => (i ? ctx.lineTo(x + v.side * 7, y) : ctx.moveTo(x + v.side * 7, y)));
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.4;
  for (let k = 0; k < 7; k++) {
    const y = v.cy + (rnd() - 0.5) * half * 1.4;
    const u = (y - v.cy + half) / (half * 2);
    const d = D * Math.pow(Math.max(0, Math.sin(Math.PI * u)), 0.65);
    if (d < 30) continue;
    const x = edge - v.side * (12 + d * (0.2 + rnd() * 0.6));
    ctx.beginPath(); ctx.arc(x, y, 6, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
  }
  return { shore, D, edge };
}

function boat(ctx, x, y, s, rnd, hull = '#c8553d', dir = 1) {
  // a small fishing boat seen from above-front: hull, cabin, mast, a cream sail
  shadow(ctx, x + 3, y + s * 0.42, s * 0.95, s * 0.22, 0.12);
  ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
  ctx.fillStyle = hull;
  ctx.beginPath();
  ctx.moveTo(-s, -s * 0.05); ctx.lineTo(s * 1.05, -s * 0.12);
  ctx.quadraticCurveTo(s * 0.8, s * 0.4, s * 0.45, s * 0.42);
  ctx.lineTo(-s * 0.7, s * 0.42); ctx.quadraticCurveTo(-s * 0.95, s * 0.3, -s, -s * 0.05);
  ctx.fill();
  ctx.fillStyle = '#fff6e6';
  ctx.fillRect(-s * 0.95, -s * 0.06, s * 1.95, s * 0.1);
  ctx.fillStyle = '#f4ead8';
  ctx.fillRect(-s * 0.55, -s * 0.42, s * 0.5, s * 0.36);
  ctx.fillStyle = '#6aa5b8';
  ctx.fillRect(-s * 0.48, -s * 0.34, s * 0.16, s * 0.12); ctx.fillRect(-s * 0.26, -s * 0.34, s * 0.16, s * 0.12);
  ctx.strokeStyle = '#6b4b32'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(s * 0.2, -s * 0.08); ctx.lineTo(s * 0.2, -s * 1.25); ctx.stroke();
  ctx.fillStyle = 'rgba(255,248,232,0.95)';
  ctx.beginPath(); ctx.moveTo(s * 0.24, -s * 1.2); ctx.lineTo(s * 0.95, -s * 0.2); ctx.lineTo(s * 0.24, -s * 0.2); ctx.closePath(); ctx.fill();
  ctx.restore();
  // a soft wake
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(x - dir * s * 1.1, y + s * 0.3); ctx.quadraticCurveTo(x - dir * s * 1.6, y + s * 0.35, x - dir * s * 2.1, y + s * 0.2); ctx.stroke();
}

function hut(ctx, x, y, s, cols) {
  const [a, b] = cols;
  shadow(ctx, x + s * 0.15, y + s * 0.05, s * 0.7, s * 0.16, 0.2);
  // striped front
  const w = s, hh = s * 0.95;
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i % 2 ? b : a;
    ctx.fillRect(x - w / 2 + (i * w) / 5, y - hh, w / 5 + 0.5, hh);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(x - w / 2, y - hh * 0.25, w, hh * 0.25);
  // roof
  ctx.fillStyle = '#8f5e3d';
  ctx.beginPath(); ctx.moveTo(x - w * 0.62, y - hh); ctx.lineTo(x, y - hh - s * 0.5); ctx.lineTo(x + w * 0.62, y - hh); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#b07a52';
  ctx.beginPath(); ctx.moveTo(x - w * 0.5, y - hh); ctx.lineTo(x, y - hh - s * 0.4); ctx.lineTo(x + w * 0.5, y - hh); ctx.closePath(); ctx.fill();
  // door
  ctx.fillStyle = '#6e4a33';
  ctx.fillRect(x - w * 0.16, y - hh * 0.62, w * 0.32, hh * 0.62);
  ctx.fillStyle = '#f6d76b'; ctx.beginPath(); ctx.arc(x + w * 0.09, y - hh * 0.3, 1.4, 0, TAU); ctx.fill();
}

function lighthouse(ctx, x, y, s, lamps) {
  // tapered tower with red bands, a gallery, the lamp room and a red cap; y = the base
  shadow(ctx, x + s * 0.3, y + 2, s * 0.6, s * 0.14, 0.22);
  const H = s * 3, bw = s * 0.62, tw = s * 0.42;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x - bw / 2, y); ctx.lineTo(x - tw / 2, y - H); ctx.lineTo(x + tw / 2, y - H); ctx.lineTo(x + bw / 2, y); ctx.closePath();
  ctx.fillStyle = '#fbf6ee'; ctx.fill();
  ctx.clip();
  ctx.fillStyle = '#e0685a';
  for (let i = 0; i < 3; i++) ctx.fillRect(x - bw, y - H * (0.2 + i * 0.3), bw * 2, H * 0.13);
  ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(x + tw * 0.1, y - H, bw, H);
  ctx.restore();
  ctx.fillStyle = '#6e4a33'; ctx.fillRect(x - s * 0.1, y - s * 0.32, s * 0.2, s * 0.32);
  ctx.fillStyle = '#5b5f6b'; ctx.fillRect(x - tw * 0.75, y - H - 3, tw * 1.5, 4);
  ctx.fillStyle = lamps > 0 ? '#ffe7a0' : '#d6eef2';
  ctx.fillRect(x - tw * 0.42, y - H - s * 0.42, tw * 0.84, s * 0.38);
  ctx.strokeStyle = '#5b5f6b'; ctx.lineWidth = 1;
  ctx.strokeRect(x - tw * 0.42, y - H - s * 0.42, tw * 0.84, s * 0.38);
  ctx.fillStyle = '#d0584a';
  ctx.beginPath(); ctx.moveTo(x - tw * 0.6, y - H - s * 0.42); ctx.lineTo(x, y - H - s * 0.78); ctx.lineTo(x + tw * 0.6, y - H - s * 0.42); ctx.closePath(); ctx.fill();
  return { lampX: x, lampY: y - H - s * 0.23 };
}

function rocks(ctx, x, y, r, rnd, n = 5) {
  for (let i = 0; i < n; i++) {
    const rx = x + (rnd() - 0.5) * r * 1.6, ry = y + (rnd() - 0.5) * r * 0.9, rr = r * (0.25 + rnd() * 0.3);
    shadow(ctx, rx + 2, ry + rr * 0.45, rr * 1.05, rr * 0.4, 0.16);
    ctx.fillStyle = C.rockLo; blob(ctx, rx, ry + 2, rr, rr * 0.72, rnd, 0.2); ctx.fill();
    ctx.fillStyle = C.rock; blob(ctx, rx - 1, ry, rr * 0.95, rr * 0.66, rnd, 0.2); ctx.fill();
    ctx.fillStyle = C.rockHi; blob(ctx, rx - rr * 0.25, ry - rr * 0.2, rr * 0.45, rr * 0.28, rnd, 0.15); ctx.fill();
  }
}

function lantern(ctx, x, y) {
  shadow(ctx, x + 2, y + 1, 5, 2, 0.25);
  ctx.fillStyle = C.post; ctx.fillRect(x - 1.5, y - 26, 3, 26);
  ctx.fillRect(x - 4, y - 2, 8, 2);
  ctx.fillStyle = '#3f3229'; ctx.fillRect(x - 5, y - 33, 10, 2);
  ctx.fillStyle = '#ffe3a1'; ctx.fillRect(x - 3.5, y - 31, 7, 6);
  ctx.fillStyle = '#3f3229';
  ctx.beginPath(); ctx.moveTo(x - 5, y - 33); ctx.lineTo(x, y - 37); ctx.lineTo(x + 5, y - 33); ctx.closePath(); ctx.fill();
}

function bench(ctx, x, y) {
  shadow(ctx, x + 2, y + 3, 16, 3, 0.2);
  ctx.fillStyle = C.woodLo; ctx.fillRect(x - 13, y - 6, 2.5, 9); ctx.fillRect(x + 10.5, y - 6, 2.5, 9);
  ctx.fillStyle = C.wood; ctx.fillRect(x - 15, y - 8, 30, 3.5); ctx.fillRect(x - 15, y - 15, 30, 3.2);
}

function sandPatch(ctx, v, w, rnd, rx, ry) {
  ctx.fillStyle = C.sandLo; blob(ctx, v.cx, v.cy + 4, rx + 6, ry + 5, rnd, 0.16); ctx.fill();
  ctx.fillStyle = C.sand; blob(ctx, v.cx, v.cy, rx, ry, rnd, 0.16); ctx.fill();
}

const VIGNETTES = {
  cove(ctx, v, P, rnd) {
    seaInlet(ctx, v, P.w, rnd, 0.9, 200);
    const bx = v.side > 0 ? P.w - v.fw * 0.32 : v.fw * 0.32;
    boat(ctx, bx, v.cy - 40, 20, rnd, '#c8553d', -v.side);
    boat(ctx, bx + v.side * 18, v.cy + 76, 15, rnd, '#3f7aa0', -v.side);
    gull(ctx, bx - v.side * 30, v.cy - 120, 7);
  },
  harbour(ctx, v, P, rnd) {
    const { D, edge } = seaInlet(ctx, v, P.w, rnd, 0.92, 210);
    // a wooden jetty from the shore into the water, with a moored boat
    const y = v.cy + 10, x0 = edge - v.side * (D + 30), x1 = edge - v.side * (D * 0.25);
    ctx.fillStyle = C.woodLo;
    ctx.fillRect(Math.min(x0, x1), y + 4, Math.abs(x1 - x0), 4);
    ctx.fillStyle = C.wood;
    ctx.fillRect(Math.min(x0, x1), y - 9, Math.abs(x1 - x0), 13);
    ctx.strokeStyle = 'rgba(80,55,30,0.45)'; ctx.lineWidth = 1;
    for (let x = Math.min(x0, x1) + 6; x < Math.max(x0, x1); x += 7) { ctx.beginPath(); ctx.moveTo(x, y - 9); ctx.lineTo(x, y + 4); ctx.stroke(); }
    ctx.fillStyle = C.post;
    for (let k = 0; k <= 3; k++) { const x = x0 + (x1 - x0) * (k / 3); ctx.fillRect(x - 2, y - 12, 4, 20); }
    boat(ctx, x1 - v.side * 6, y + 34, 15, rnd, '#2f6f8f', v.side);
    boat(ctx, edge - v.side * D * 0.55, v.cy - 110, 11, rnd, '#e0a33c', -v.side);
  },
  lighthouse(ctx, v, P, rnd) {
    const { D, edge } = seaInlet(ctx, v, P.w, rnd, 0.62, 230);
    const hx = edge - v.side * (D + 4), hy = v.cy + 10;
    rocks(ctx, hx, hy + 6, 34, rnd, 6);
    const lamp = lighthouse(ctx, hx - v.side * 4, hy, 22, P.lamps);
    P.lights.push({ x: lamp.lampX, y: lamp.lampY, r: 46, beam: v.side });
    gull(ctx, hx + v.side * 50, hy - 110, 6);
    gull(ctx, hx + v.side * 70, hy - 90, 5);
  },
  huts(ctx, v, P, rnd) {
    sandPatch(ctx, v, P.w, rnd, Math.min(v.fw * 0.48, 120), 120);
    const n = v.fw > 200 ? 4 : 3;
    const span = Math.min(v.fw * 0.7, 170);
    for (let i = 0; i < n; i++) {
      const x = v.cx - span / 2 + (span * i) / Math.max(1, n - 1);
      const y = v.cy - 30 + Math.sin(i * 1.3) * 8 + i * 14 * -v.side * 0.4;
      hut(ctx, x, y, 27, C.huts[(i + P.index) % C.huts.length]);
      if (P.lamps > 0.3) P.lights.push({ x, y: y - 10, r: 22 });
    }
    // a striped windbreak and a parasol on the sand
    const ux = v.cx + (rnd() - 0.5) * 40, uy = v.cy + 62;
    shadow(ctx, ux + 6, uy + 4, 16, 5, 0.18);
    ctx.strokeStyle = C.post; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(ux, uy + 2); ctx.lineTo(ux, uy - 18); ctx.stroke();
    for (let k = 0; k < 6; k++) {
      ctx.fillStyle = k % 2 ? '#fff3e6' : '#f08a7e';
      ctx.beginPath(); ctx.moveTo(ux, uy - 24); ctx.arc(ux, uy - 18, 17, Math.PI + (k * Math.PI) / 6, Math.PI + ((k + 1) * Math.PI) / 6); ctx.closePath(); ctx.fill();
    }
    for (let k = 0; k < 5; k++) tuft(ctx, v.cx + (rnd() - 0.5) * v.fw * 0.8, v.cy + 95 + rnd() * 30, 11, rnd);
  },
  rockpool(ctx, v, P, rnd) {
    sandPatch(ctx, v, P.w, rnd, Math.min(v.fw * 0.46, 115), 110);
    for (let k = 0; k < 2; k++) {
      const x = v.cx + (k ? 26 : -24) + (rnd() - 0.5) * 10, y = v.cy + (k ? 34 : -26);
      const r = k ? 24 : 30;
      ctx.fillStyle = C.wet; blob(ctx, x, y, r + 7, r * 0.7 + 6, rnd, 0.2); ctx.fill();
      const g = ctx.createRadialGradient(x - 4, y - 4, 2, x, y, r);
      g.addColorStop(0, '#bfe9e2'); g.addColorStop(1, '#6fb8c4');
      ctx.fillStyle = g; blob(ctx, x, y, r, r * 0.62, rnd, 0.18); ctx.fill();
      ctx.fillStyle = 'rgba(80,140,90,0.55)';
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(x + (rnd() - 0.5) * r, y + (rnd() - 0.5) * r * 0.5, 2 + rnd() * 2, 0, TAU); ctx.fill(); }
      starfish(ctx, x + (rnd() - 0.5) * r * 0.8, y + (rnd() - 0.5) * r * 0.3, 5, k ? '#f08a5e' : '#f4a6b8');
      rocks(ctx, x + r * 0.9, y - r * 0.3, 16, rnd, 3);
    }
    rocks(ctx, v.cx - v.side * 40, v.cy + 80, 18, rnd, 3);
    for (let k = 0; k < 4; k++) {
      const x = v.cx + (rnd() - 0.5) * v.fw * 0.7, y = v.cy + (rnd() - 0.5) * 150;
      ctx.fillStyle = '#fff3ea'; ctx.beginPath(); ctx.ellipse(x, y, 3, 2.2, rnd() * 3, 0, TAU); ctx.fill();
    }
  },
  dunes(ctx, v, P, rnd) {
    for (let k = 0; k < 3; k++) {
      const x = v.cx + (k - 1) * Math.min(48, v.fw * 0.22), y = v.cy + (k - 1) * 46;
      ctx.fillStyle = C.sandLo; blob(ctx, x + 4, y + 6, 46, 26, rnd, 0.2); ctx.fill();
      ctx.fillStyle = C.sand; blob(ctx, x, y, 44, 24, rnd, 0.2); ctx.fill();
      for (let i = 0; i < 4; i++) tuft(ctx, x + (rnd() - 0.5) * 60, y + (rnd() - 0.5) * 20 - 4, 13, rnd, i % 2 ? C.tuft : C.tuftDk);
    }
    bench(ctx, v.cx + v.side * 10, v.cy + 108);
    // a little picket of wildflowers in a café planter
    const fx = v.cx - v.side * 30, fy = v.cy - 96;
    ctx.fillStyle = C.wood; ctx.fillRect(fx - 16, fy - 6, 32, 10);
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = C.flowers[i % C.flowers.length];
      ctx.beginPath(); ctx.arc(fx - 13 + i * 4.4, fy - 9 - (i % 2) * 3, 3, 0, TAU); ctx.fill();
    }
  },
};

/**
 * Paint one chapter of the Coast Path. P = { w, h, index, variant, pts, pockets }.
 * Order: meadow ground, the worn verge under the path, vignettes in the pockets, beach grass and
 * wildflowers, lantern posts, gulls; then the time-of-day tint and, after dark, warm lights.
 */
export function paintCoast(ctx, P) {
  const { w, h, index, pts } = P;
  const look = variantOf(P.variant);
  const rnd = rngFor(0x51a4 + index * 7919);
  const plan = coastPlan(P);
  // ground: a soft meadow with lighter and deeper patches
  ctx.fillStyle = C.grass; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < Math.round(h / 70); i++) {
    const x = rnd() * w, y = rnd() * h, r = 50 + rnd() * 90;
    glow(ctx, x, y, r, rnd() < 0.5 ? 'rgba(232,242,196,0.55)' : 'rgba(170,200,130,0.45)');
  }
  // a worn sandy verge under the footpath (the path itself is drawn by the map's SVG)
  const s = [{ x: w / 2, y: h + 30 }, ...[...pts].sort((a, b) => b.y - a.y), { x: w / 2, y: -30 }];
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(240,226,178,0.45)'; ctx.lineWidth = 70;
  ctx.beginPath(); ctx.moveTo(s[0].x, s[0].y);
  for (let i = 1; i < s.length - 1; i++) ctx.quadraticCurveTo(s[i].x, s[i].y, (s[i].x + s[i + 1].x) / 2, (s[i].y + s[i + 1].y) / 2);
  ctx.lineTo(s[s.length - 1].x, s[s.length - 1].y);
  ctx.stroke();
  ctx.restore();
  const lights = [];
  const PP = { ...P, lamps: look.lamps, lights };
  for (const v of plan.vignettes) VIGNETTES[v.kind](ctx, v, PP, rngFor(0x77 + index * 131 + Math.round(v.cy)));
  // beach grass tufts and wildflowers, clear of the path
  for (let i = 0; i < Math.round(h / 34); i++) {
    const x = 10 + rnd() * (w - 20), y = rnd() * h;
    if (distToPath(pts, x, y, w, h) < 52) continue;
    if (plan.vignettes.some((v) => Math.abs(y - v.cy) < 150 && Math.abs(x - v.cx) < v.fw * 0.5)) continue;
    if (rnd() < 0.55) tuft(ctx, x, y, 9 + rnd() * 6, rnd, rnd() < 0.5 ? C.tuft : C.tuftDk);
    else {
      const col = C.flowers[Math.floor(rnd() * C.flowers.length)];
      for (let k = 0; k < 4; k++) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x + (rnd() - 0.5) * 14, y + (rnd() - 0.5) * 8, 2 + rnd() * 1.2, 0, TAU); ctx.fill(); }
    }
  }
  for (const l of plan.lanterns) { lantern(ctx, l.x, l.y); lights.push({ x: l.x, y: l.y - 28, r: 34 }); }
  for (const g of plan.gulls) gull(ctx, g.x, g.y, 6 + (g.x % 3));
  // time of day, easing to daylight at both seams (white multiplies to no change)
  const f = Math.min(0.45, SEAM_FADE / h);
  const ramp = (inner, outer) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, outer); g.addColorStop(f, inner); g.addColorStop(1 - f, inner); g.addColorStop(1, outer);
    return g;
  };
  if (look.tint) {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = ramp(look.tint, '#ffffff'); ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  if (look.wash) { ctx.fillStyle = ramp(look.wash, look.wash.replace(/,\s*[\d.]+\)\s*$/, ',0)')); ctx.fillRect(0, 0, w, h); }
  const edgeK = (y) => Math.max(0, Math.min(1, Math.min(y, h - y) / SEAM_FADE));
  if (look.lamps > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (const L of lights) {
      const k = edgeK(L.y);
      if (k <= 0) continue;
      glow(ctx, L.x, L.y, L.r * (0.6 + look.lamps * 0.6), `rgba(255,214,140,${((0.25 + look.lamps * 0.45) * k).toFixed(3)})`);
      if (L.beam && look.lamps >= 0.7) {
        // the lighthouse beam sweeps out to sea (towards the map edge), never across the path
        const ex = L.x + L.beam * w * 0.5;
        const g = ctx.createLinearGradient(L.x, L.y, ex, L.y - 30);
        g.addColorStop(0, `rgba(255,236,170,${(0.4 * k).toFixed(3)})`); g.addColorStop(1, 'rgba(255,236,170,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(L.x, L.y); ctx.lineTo(ex, L.y - 60); ctx.lineTo(ex, L.y + 4); ctx.closePath(); ctx.fill();
      }
    }
    if (P.variant === 'starry') {
      // stars reflected in the water and a few fireflies over the meadow
      for (const g of plan.glints) for (let k = 0; k < 4; k++) {
        ctx.fillStyle = `rgba(255,255,240,${0.4 + rnd() * 0.4})`;
        ctx.fillRect(g.x + (rnd() - 0.5) * 60, g.y + (rnd() - 0.5) * 60, 1.6, 1.6);
      }
    }
    ctx.restore();
  }
  return plan;
}
