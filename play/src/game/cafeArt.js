// Café restoration art (v3, "Nova's Seaside Café"): procedural Canvas, cozy illustrated style.
// Soft warm-brown outlines, warm flat fills with one shade band, gentle seeded-noise textures.
// Presentation only: nothing here reads rules, scores, coins or the store, and every bit of "noise"
// comes from mulberry32 seeded by a fixed label (never an unseeded random), so a scene always paints the same.
//
// World: one panorama in world units (1 area = 1000 units wide, y grows downward). The ground floor
// sits on y = FLOOR (150), the promenade runs to QUAY (400), the quay wall drops to WATER (470) and the
// harbour fills everything below. Book 1: Terrace (x 0) → Counter (1000) → Kitchen (2000) → Garden
// (3000) → Pier (4000), the Rooftop deck on top of the Counter (y ≈ -260 and up); Book 2 continues to
// the right along the harbour (5000 … 10000). Books 3–9 (the village, the riverside, the cliffs, the seafront,
// the hills, the island and the road home) carry on along the same coast, one area per 1000 units, to x 48000:
// their props and shells live in cafeArtBooks.js, installed into PROPS / INK / SHELLS below.
// Camera targets live in cafeData.js (area.cam).
//
// API
//   drawProp(ctx, propId, state, styleIdx, t, lit?)  draw one prop at its anchor (lit: on the brightened frontage) (ctx is in world units with
//       the origin moved to the anchor; see propAnchor). state 'broken' (greyed, cracked, dusty) or 'built'.
//   PROPS[propId] = { area, x, y, box: [x0, y0, x1, y1] (local), z, draw, live? }   the shared kit placement
//   propAnchor(propId), propBox(propId) (world rect), propAt(areaId, wx, wy) (hit test)
//   paintBackdrop(ctx, view, opts)   sky, sun, clouds, stars and constellations (per frame)
//   paintWater(ctx, view, t, reduced) the harbour (per frame)
//   AreaCache: renderArea(areaId, info, scale) → { canvas, x0, y0, scale } offscreen, redrawn only when
//       the area's state signature or the scale bucket changes; DPR is capped by the caller (≤ 2).
//   paintAreaLive(ctx, areaId, info, t) small live touches (steam, twinkles, the beacon) per frame
//   KEEPER_SPOTS, PIP_SPOTS  where the Regulars live and where Pip waits, per area (world)
//   paintPropChip(canvas, propId, state, styleIdx)  a framed preview for the build sheet
//   paintAreaPostcard(canvas, info) a share card of a finished area (onShare hook)
import { mulberry32, hashString } from './rng.js';
import { CAFE_AREAS, CAFE_AREA_BY_ID } from '../meta/cafeData.js';
import { gradeNight } from './cafeNight.js';
import { installBooks } from './cafeArtBooks.js';
import { t as tr } from '../i18n/index.js'; // pure lookup: the shop sign and the area card caption

export const FLOOR = 150;    // ground-floor level inside the café
export const GROUND = 200;   // promenade back edge (plinth bottom)
export const QUAY = 400;     // promenade front edge
export const WATER = 470;    // harbour water line
export const HILL_BASE = -150;
export const WORLD = { left: -900, right: 48760, top: -1700, bottom: 2000 };
export const AREA_W = 1000;

const TAU = Math.PI * 2;
const OUT = '#6b4a3a';
const SERIF = "'Iowan Old Style','Palatino Linotype',Georgia,serif";
const ROUND = "Fredoka,'Baloo 2',ui-rounded,system-ui,sans-serif";

// ------------------------------------------------------------------ colour helpers
const rgbCache = new Map();
function rgb(h) {
  let v = rgbCache.get(h);
  if (!v) { const n = parseInt(h.slice(1), 16); v = [(n >> 16) & 255, (n >> 8) & 255, n & 255]; rgbCache.set(h, v); }
  return v;
}
const hex = (r, g, b) => '#' + ((1 << 24) | (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b)).toString(16).slice(1);
/** Mix two #rrggbb colours (k = 0 → a, 1 → b). */
export function mix(a, b, k) {
  const A = rgb(a), B = rgb(b);
  return hex(A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k, A[2] + (B[2] - A[2]) * k);
}
const dk = (h, k = 0.22) => mix(h, '#3b2418', k);
const lt = (h, k = 0.35) => mix(h, '#fffaf0', k);
const weatherCache = new Map();
/** Broken look: faded toward a warm dusty grey (still warm, never grim). */
function weather(h) {
  let v = weatherCache.get(h);
  if (!v) {
    const [r, g, b] = rgb(h);
    const l = r * 0.3 + g * 0.59 + b * 0.11;
    const grey = hex(l, l * 0.97, l * 0.93);
    v = mix(mix(h, grey, 0.72), '#b9ab9b', 0.3);
    weatherCache.set(h, v);
  }
  return v;
}
/** The first-restore brighten (docs/UX_RETENTION.md item 8b): once the terrace has its first restore, the whole
 *  frontage's weathering lifts by FRONT_LIFT (shell walls and the still-broken props) and the door's sign says
 *  "Opening soon" instead of "Closed". */
export const FRONT_LIFT = 0.15;
const liftCache = new Map();
function weatherLifted(h) {
  let v = liftCache.get(h);
  if (!v) { v = mix(weather(h), h, FRONT_LIFT); liftCache.set(h, v); }
  return v;
}
/** Is the frontage brightened for this terrace info? (built >= 1, unless the view holds it back for the moment). */
export function frontLit(areaId, info) { return areaId === 'terrace' && !!info && (info.built || 0) >= 1 && !info.unlit; }

// ------------------------------------------------------------------ drawing state + primitives
// One prop/scene is painted at a time, so the helpers share module state (no allocations per call).
let X = null;              // current 2D context
let C = (h) => h;          // palette: identity when built, weather() when broken
let BR = false;            // painting the broken state
let LIFT = 0;              // the frontage brighten while painting the terrace (0 or FRONT_LIFT; see frontLit)
let TT = 0;                // time in seconds (live touches only)
let R = mulberry32(1);     // seeded noise for the current prop / area
// Wind-down "Evening calm" (src/meta/windDown.js): areas bake once at night (cache key), graded by cafeNight.gradeNight.
let NIGHT = false;
let NIGHT_LIGHTS = null;   // the lights glow() paints while a night bake runs
export function setCafeNight(on) { NIGHT = !!on; }
export function cafeNight() { return NIGHT; }

function begin(ctx, broken, seed) {
  X = ctx; BR = !!broken; C = broken ? (LIFT ? weatherLifted : weather) : (h) => h;
  R = mulberry32(typeof seed === 'number' ? seed : hashString(String(seed)));
}

function out(lw = 4, col = OUT) { X.lineWidth = lw; X.strokeStyle = col; X.lineJoin = 'round'; X.lineCap = 'round'; X.stroke(); }
function fill(h) { X.fillStyle = C(h); X.fill(); }
function fo(h, lw = 4) { fill(h); if (lw) out(lw); }
function rr(x, y, w, h, r = 0) {
  X.beginPath();
  if (!r) { X.rect(x, y, w, h); return; }
  r = Math.min(r, w / 2, h / 2);
  X.moveTo(x + r, y); X.arcTo(x + w, y, x + w, y + h, r); X.arcTo(x + w, y + h, x, y + h, r);
  X.arcTo(x, y + h, x, y, r); X.arcTo(x, y, x + w, y, r); X.closePath();
}
function el(x, y, rx, ry = rx) { X.beginPath(); X.ellipse(x, y, Math.abs(rx), Math.abs(ry), 0, 0, TAU); }
function poly(...p) { X.beginPath(); X.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) X.lineTo(p[i], p[i + 1]); X.closePath(); }
function ln(x1, y1, x2, y2, h, lw = 4) { X.beginPath(); X.moveTo(x1, y1); X.lineTo(x2, y2); X.strokeStyle = C(h); X.lineWidth = lw; X.lineCap = 'round'; X.stroke(); }
function box(x, y, w, h, col, r = 3, lw = 4) { rr(x, y, w, h, r); fo(col, lw); }
function shadow(x, y, rx, ry = rx * 0.2, a = 0.16) {
  X.save(); X.globalAlpha = a; el(x, y, rx, ry); X.fillStyle = '#4a2c1c'; X.fill(); X.restore();
}
function clip(pathFn, body) { X.save(); pathFn(); X.clip(); body(); X.restore(); }
function band(pathFn, col, x, y, w, h) { clip(pathFn, () => { X.fillStyle = C(col); X.fillRect(x, y, w, h); }); }
function stripes(x, y, w, h, cols, sw) {
  for (let i = 0, xx = x; xx < x + w; xx += sw, i++) { X.fillStyle = C(cols[i % cols.length]); X.fillRect(xx, y, Math.min(sw, x + w - xx) + 0.5, h); }
}
function hstripes(x, y, w, h, cols, sh) {
  for (let i = 0, yy = y; yy < y + h; yy += sh, i++) { X.fillStyle = C(cols[i % cols.length]); X.fillRect(x, yy, w, Math.min(sh, y + h - yy) + 0.5); }
}
function glow(x, y, r, col = '#ffd98a', a = 0.55) {
  if (BR) return;
  if (NIGHT_LIGHTS) NIGHT_LIGHTS.push([X.getTransform(), x, y, r, col, a]); // relit as lantern light by gradeNight
  const g = X.createRadialGradient(x, y, 0, x, y, r);
  const [cr, cg, cb] = rgb(col);
  g.addColorStop(0, `rgba(${cr},${cg},${cb},${a})`);
  g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
  X.fillStyle = g; X.beginPath(); X.arc(x, y, r, 0, TAU); X.fill();
}
function txt(s, x, y, size, col, { font = SERIF, weight = 700, align = 'center', italic = false, maxW = 0 } = {}) {
  X.font = `${italic ? 'italic ' : ''}${weight} ${size}px ${font}`;
  X.textAlign = align; X.textBaseline = 'middle'; X.fillStyle = C(col);
  if (maxW) X.fillText(s, x, y, maxW); else X.fillText(s, x, y);
}
/** Seeded speckle texture inside the current clip. */
function speckle(x, y, w, h, col, n, size = 3, a = 0.18) {
  X.save(); X.globalAlpha = a; X.fillStyle = C(col);
  for (let i = 0; i < n; i++) { const s = size * (0.5 + R()); X.fillRect(x + R() * w, y + R() * h, s, s * 0.8); }
  X.restore();
}
/** Wood planks with soft grain (horizontal boards). */
function planks(x, y, w, h, col, ph = 22, vertical = false) {
  X.fillStyle = C(col); X.fillRect(x, y, w, h);
  X.save(); X.strokeStyle = C(dk(col, 0.28)); X.lineWidth = 2.5; X.globalAlpha = 0.6;
  if (!vertical) {
    for (let yy = y + ph; yy < y + h - 1; yy += ph) { X.beginPath(); X.moveTo(x, yy); X.lineTo(x + w, yy); X.stroke(); }
    X.globalAlpha = 0.35; X.lineWidth = 2;
    for (let yy = y; yy < y + h; yy += ph) {
      const off = R() * w;
      for (let xx = x + off % 140; xx < x + w; xx += 110 + R() * 90) { X.beginPath(); X.moveTo(xx, yy); X.lineTo(xx, Math.min(y + h, yy + ph)); X.stroke(); }
    }
  } else {
    for (let xx = x + ph; xx < x + w - 1; xx += ph) { X.beginPath(); X.moveTo(xx, y); X.lineTo(xx, y + h); X.stroke(); }
  }
  X.restore();
}
/** A five-petal bloom. */
function bloom(x, y, r, petal, centre = '#f6d36b') {
  X.fillStyle = C(petal);
  for (let k = 0; k < 5; k++) { const a = k * TAU / 5 - Math.PI / 2; X.beginPath(); X.arc(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, r * 0.5, 0, TAU); X.fill(); }
  X.fillStyle = C(centre); X.beginPath(); X.arc(x, y, r * 0.34, 0, TAU); X.fill();
}
/** A union-outlined cluster of round leaves/foliage (stroke all, then fill all). */
function bush(cx, cy, w, h, col, n = 7, lw = 4) {
  const blobs = [];
  for (let i = 0; i < n; i++) {
    const a = i / n, bx = cx + (a - 0.5) * w * 0.8 + (R() - 0.5) * w * 0.12;
    const by = cy - Math.sin(a * Math.PI) * h * 0.45 + (R() - 0.3) * h * 0.18;
    blobs.push([bx, by, (0.26 + R() * 0.14) * Math.min(w, h * 1.6)]);
  }
  X.lineWidth = lw * 2; X.strokeStyle = OUT; X.lineJoin = 'round';
  for (const [bx, by, br] of blobs) { X.beginPath(); X.arc(bx, by, br, 0, TAU); X.stroke(); }
  X.fillStyle = C(col);
  for (const [bx, by, br] of blobs) { X.beginPath(); X.arc(bx, by, br, 0, TAU); X.fill(); }
  X.fillStyle = C(lt(col, 0.25));
  for (const [bx, by, br] of blobs) { X.beginPath(); X.arc(bx - br * 0.25, by - br * 0.3, br * 0.45, 0, TAU); X.fill(); }
  return blobs;
}
/** Flowers scattered over a bush. Broken: a few dry twigs instead. */
function flowersOn(blobs, cols, r = 9, n = 10) {
  if (BR) {
    for (let i = 0; i < 4; i++) { const [bx, by, br] = blobs[(i * 3) % blobs.length]; ln(bx, by, bx + (R() - 0.5) * br, by - br * 0.9, '#8a6a4a', 3); }
    return;
  }
  for (let i = 0; i < n; i++) {
    const [bx, by, br] = blobs[i % blobs.length];
    const a = R() * TAU, d = R() * br * 0.75;
    bloom(bx + Math.cos(a) * d, by + Math.sin(a) * d * 0.8, r * (0.8 + R() * 0.4), cols[i % cols.length]);
  }
}
/** A hanging catenary from (x1,y1) to (x2,y2) sagging by `sag`; returns n evenly spaced points. */
function swag(x1, y1, x2, y2, sag, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) { const t = i / n; pts.push([x1 + (x2 - x1) * t, y1 + (y2 - y1) * t + sag * 4 * t * (1 - t)]); }
  return pts;
}
function wire(pts, col = '#5b4636', lw = 3) {
  X.beginPath(); X.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) X.lineTo(pts[i][0], pts[i][1]);
  X.strokeStyle = C(col); X.lineWidth = lw; X.lineCap = 'round'; X.stroke();
}
/** A draped dust sheet over a rough silhouette (broken furniture waiting under cloth). */
function dustSheet(x, y, w, h) {
  X.beginPath();
  X.moveTo(x - w / 2, y);
  X.bezierCurveTo(x - w / 2 + 4, y - h * 0.7, x - w * 0.3, y - h, x, y - h);
  X.bezierCurveTo(x + w * 0.3, y - h, x + w / 2 - 4, y - h * 0.7, x + w / 2, y);
  for (let i = 4; i >= 0; i--) X.quadraticCurveTo(x - w / 2 + (i + 0.5) * w / 5, y + 8, x - w / 2 + i * w / 5, y);
  X.closePath();
  fo('#e9dfd0');
  X.save(); X.globalAlpha = 0.45; X.strokeStyle = '#b9a994'; X.lineWidth = 3;
  for (let i = 1; i < 4; i++) { X.beginPath(); X.moveTo(x - w / 2 + i * w / 4, y - 2); X.quadraticCurveTo(x - w / 2 + i * w / 4 + 6, y - h * 0.5, x - w * 0.1 + i * 8, y - h * 0.9); X.stroke(); }
  X.restore();
}
function star(x, y, r, inner = 0.45, pts = 5) {
  X.beginPath();
  for (let k = 0; k < pts * 2; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / pts, q = k % 2 ? r * inner : r;
    if (k) X.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); else X.moveTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
  }
  X.closePath();
}
/** Pennant bunting along a swag. */
function bunting(pts, cols, size = 26, shape = 'tri') {
  wire(pts, '#6b5040', 3);
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i], col = cols[i % cols.length];
    if (shape === 'square') { rr(x - size * 0.45, y, size * 0.9, size * 0.9, 2); fo(col, 2.5); }
    else if (shape === 'round') { X.beginPath(); X.moveTo(x - size / 2, y); X.lineTo(x + size / 2, y); X.arc(x, y, size / 2, 0, Math.PI); fo(col, 2.5); }
    else { poly(x - size / 2, y, x + size / 2, y, x, y + size * 1.15); fo(col, 2.5); }
    if (BR && i % 3 === 1) { X.save(); X.globalAlpha = 0.5; poly(x - size / 2, y, x + size / 2, y, x, y + size * 1.15); X.fillStyle = '#b9ab9b'; X.fill(); X.restore(); }
  }
}
/** A string of lights (bulbs, lanterns, shells, stars, moons, globes) along a swag. */
function lightString(pts, kind, col, lit) {
  wire(pts, '#4d3b30', 2.5);
  for (let i = 1; i < pts.length - 1; i++) {
    if (BR && i % 3 === 0) continue; // a few missing
    const [x, y] = pts[i];
    if (lit) glow(x, y + 12, 34, col, 0.45);
    const body = BR ? '#d8d0c4' : lit ? lt(col, 0.4) : col;
    if (kind === 'lantern' || kind === 'globe') { ln(x, y, x, y + 6, '#4d3b30', 2); el(x, y + 20, kind === 'globe' ? 13 : 11, 14); fo(body, 2.5); if (kind === 'lantern') { ln(x - 10, y + 20, x + 10, y + 20, dk(col, 0.2), 1.5); } }
    else if (kind === 'shell') { X.beginPath(); X.moveTo(x, y + 2); X.arc(x, y + 16, 13, -Math.PI * 0.95, -Math.PI * 0.05); X.closePath(); fo(body, 2.5); for (let k = -2; k <= 2; k++) ln(x, y + 15, x + k * 5, y + 5, dk(body, 0.15), 1.2); }
    else if (kind === 'star') { star(x, y + 14, 12, 0.48); fo(body, 2.5); }
    else if (kind === 'moon') { X.beginPath(); X.arc(x, y + 16, 12, 0, TAU); X.arc(x + 6, y + 12, 10, 0, TAU, true); fo(body, 2.5); }
    else { ln(x, y, x, y + 5, '#4d3b30', 2); el(x, y + 14, 7, 10); fo(body, 2.5); }
  }
}
/** Plant pot (terracotta, glazed, tin...). */
function pot(x, y, w, h, col, rim = true) {
  poly(x - w / 2, y - h, x + w / 2, y - h, x + w * 0.38, y, x - w * 0.38, y); fo(col, 3.5);
  if (rim) { rr(x - w / 2 - 4, y - h - 8, w + 8, 12, 3); fo(lt(col, 0.12), 3.5); }
}

// ------------------------------------------------------------------ prop painters (local coords: origin = anchor)
// Each painter is (s) => void with s = style index 0..2. They read BR (broken) and paint with C().

const P = {};

// ---- Terrace
P.steps = (s) => {
  const top = ['#efe7da', '#7fb7c9', '#c9925e'][s], side = dk(top, 0.18);
  for (let i = 0; i < 3; i++) {
    const w = 170 + i * 30, y = -50 + i * 17;
    rr(-w / 2, y, w, 18, 3); fo(i === 0 ? top : mix(top, side, 0.3 * i), 3.5);
    if (s === 1 && !BR) { X.save(); rr(-w / 2, y, w, 18, 3); X.clip(); for (let xx = -w / 2; xx < w / 2; xx += 24) ln(xx, y, xx, y + 18, lt(top, 0.4), 2); X.restore(); }
    if (s === 2 && !BR) ln(-w / 2 + 6, y + 9, w / 2 - 6, y + 9, dk(top, 0.25), 1.5);
  }
  if (BR) { ln(-40, -48, -20, -34, '#7a6a5a', 2.5); ln(-20, -34, -28, -20, '#7a6a5a', 2.5); rr(50, -36, 30, 10, 3); fo('#a89a8a', 2.5); }
};
P.sign = (s) => {
  const [bg, fg, edge] = [['#bfe3d4', '#2f6f6a', '#f6ead4'], ['#2f4a6b', '#f1c25a', '#d9a640'], ['#c9a27a', '#5b3a26', '#a07850']][s];
  X.save(); if (BR) X.rotate(-0.06);
  ln(-110, -48, -110, -30, '#6b5040', 4); ln(110, -48, 110, -30, '#6b5040', 4);
  if (s === 2) { X.beginPath(); X.moveTo(-140, -30); X.quadraticCurveTo(0, -40, 140, -28); X.lineTo(136, 36); X.quadraticCurveTo(0, 44, -138, 34); X.closePath(); fo(bg); planksClip(-140, -40, 280, 84, bg); }
  else { rr(-140, -32, 280, 66, 14); fo(edge); rr(-130, -24, 260, 50, 9); fo(bg, 3); }
  if (BR) { txt("Nova's", -10, 2, 40, mix(fg, '#b9ab9b', 0.5), { italic: true }); txt('C  FÉ', 70, 6, 18, mix(fg, '#b9ab9b', 0.6), { font: ROUND }); }
  else {
    txt("Nova's", -22, 0, 42, fg, { italic: true });
    txt('CAFÉ', 82, 4, 20, fg, { font: ROUND, weight: 700 });
    if (s === 1) { star(-112, 0, 9); fill('#f1c25a'); star(118, -12, 6); fill('#f1c25a'); }
    if (s === 0) { X.save(); X.globalAlpha = 0.8; for (let i = 0; i < 3; i++) { el(100 + i * 12, 18, 3.5); fill('#2f6f6a'); } X.restore(); }
  }
  X.restore();
};
function planksClip(x, y, w, h, col) {
  X.save(); X.clip(); planks(x, y, w, h, col, 21); X.restore();
  X.lineWidth = 4; X.strokeStyle = OUT; X.stroke();
}
P.awning = (s) => {
  const [a, b] = [['#e8846f', '#fff3e4'], ['#8fcfb5', '#fff3e4'], ['#f4d27a', '#fff3e4']][s];
  // sloped canopy: a trapezoid seen from the front, then the valance
  const shape = () => poly(-330, 0, 330, 0, 360, 58, -360, 58);
  shape(); fill(a);
  clip(shape, () => { stripes(-370, 0, 740, 60, [a, b], 40); X.fillStyle = 'rgba(80,40,20,.10)'; X.fillRect(-370, 0, 740, 14); });
  shape(); out(4);
  // valance
  const n = 18, w = 720 / n;
  X.beginPath(); X.moveTo(-360, 58);
  for (let i = 0; i < n; i++) {
    const x0 = -360 + i * w, torn = BR && (i === 4 || i === 5 || i === 12);
    const d = torn ? 6 : s === 2 ? 26 : 20;
    if (s === 1 && !torn) { X.lineTo(x0, 58 + d); X.lineTo(x0 + w, 58 + d); }
    else X.quadraticCurveTo(x0 + w / 2, 58 + d * 1.6, x0 + w, 58);
  }
  X.lineTo(360, 58); X.closePath();
  fill(a);
  clip(() => { X.beginPath(); X.rect(-370, 56, 740, 60); }, () => { for (let i = 0; i < n; i++) { X.fillStyle = C(i % 2 ? b : a); X.fillRect(-360 + i * w, 56, w + 0.5, 60); } });
  X.beginPath(); X.moveTo(-360, 58);
  for (let i = 0; i < n; i++) {
    const x0 = -360 + i * w, torn = BR && (i === 4 || i === 5 || i === 12), d = torn ? 6 : s === 2 ? 26 : 20;
    if (s === 1 && !torn) { X.lineTo(x0, 58 + d); X.lineTo(x0 + w, 58 + d); } else X.quadraticCurveTo(x0 + w / 2, 58 + d * 1.6, x0 + w, 58);
  }
  X.lineTo(360, 58); out(4);
  ln(-360, 58, 360, 58, dk(a, 0.25), 3);
  // brackets
  ln(-320, -2, -350, 56, '#6b5040', 4); ln(320, -2, 350, 56, '#6b5040', 4);
  if (BR) { X.save(); X.rotate(0.012); X.restore(); }
};
function bistroTable(x, y, s) {
  shadow(x, y + 2, 62, 10);
  if (s === 0) { // wrought iron, round marble-ish top
    ln(x, y - 4, x, y - 70, '#3d3a3f', 6); X.beginPath(); X.moveTo(x - 30, y); X.quadraticCurveTo(x - 8, y - 10, x, y - 30); X.quadraticCurveTo(x + 8, y - 10, x + 30, y); X.strokeStyle = C('#3d3a3f'); X.lineWidth = 5; X.stroke();
    el(x, y - 74, 58, 12); fo('#f2ede4'); el(x, y - 76, 50, 8); fill('#fbf8f2');
  } else if (s === 1) { // painted pine, square
    box(x - 44, y - 70, 9, 70, '#e9c9a0', 2, 3); box(x + 35, y - 70, 9, 70, '#e9c9a0', 2, 3);
    rr(x - 58, y - 82, 116, 16, 4); fo('#f5e6cf'); ln(x - 52, y - 74, x + 52, y - 74, '#d9bf9b', 2);
  } else { // mosaic
    ln(x, y - 4, x, y - 70, '#5a6b7a', 6); poly(x - 26, y, x + 26, y, x + 8, y - 8, x - 8, y - 8); fo('#5a6b7a', 3);
    el(x, y - 74, 58, 13); fo('#ffffff');
    X.save(); el(x, y - 75, 53, 10); X.clip();
    const cols = ['#4f9fb3', '#f4d27a', '#e8846f', '#9fd3bf', '#ffffff'];
    for (let i = 0; i < 26; i++) { X.fillStyle = C(cols[i % 5]); X.fillRect(x - 55 + (i % 9) * 12.5, y - 86 + Math.floor(i / 9) * 7.5, 10.5, 6); }
    X.restore(); el(x, y - 74, 58, 13); out(3.5);
  }
  if (!BR) { // a cup and a little vase
    rr(x - 26, y - 92, 16, 13, 3); fo('#ffffff', 2.5); X.beginPath(); X.arc(x - 9, y - 86, 4.5, -1.2, 1.2); X.strokeStyle = C(OUT); X.lineWidth = 2; X.stroke();
    rr(x + 14, y - 98, 11, 18, 4); fo('#9fd3bf', 2.5); bloom(x + 19, y - 104, 7, s === 2 ? '#f4d27a' : '#e8846f');
  }
}
P.tables = (s) => {
  if (BR) { // folded and stacked under a sheet
    dustSheet(-290, 0, 120, 92);
    X.save(); X.translate(20, 15); X.rotate(-0.25); el(0, -40, 50, 10); fo('#c9c0b2'); ln(0, -36, 0, 10, '#8f877d', 6); X.restore();
    return;
  }
  bistroTable(-290, 0, s); bistroTable(20, 15, s);
};
function chair(x, y, s, face = 1) {
  if (s === 0) { // rattan armchair
    shadow(x, y + 2, 44, 8);
    X.beginPath(); X.moveTo(x - 36, y - 2); X.lineTo(x - 40, y - 60); X.quadraticCurveTo(x - 42, y - 112, x, y - 112); X.quadraticCurveTo(x + 42, y - 112, x + 40, y - 60); X.lineTo(x + 36, y - 2); X.closePath(); fo('#d9b27a');
    X.save(); X.clip(); X.globalAlpha = 0.35; for (let yy = y - 110; yy < y; yy += 9) ln(x - 45, yy, x + 45, yy + 4, '#a5793f', 2); X.restore();
    rr(x - 32, y - 52, 64, 20, 9); fo('#f6ead4', 3); rr(x - 30, y - 98, 60, 44, 14); fo('#9fd3bf', 3);
  } else if (s === 1) { // striped deck chair
    shadow(x, y + 2, 40, 8);
    ln(x - 30 * face, y, x + 26 * face, y - 104, '#a0724a', 6); ln(x + 30 * face, y, x - 4 * face, y - 60, '#a0724a', 6);
    X.save(); X.translate(x, y); X.scale(face, 1);
    poly(-22, -10, 20, -100, 40, -96, 2, -6); fill('#e8846f');
    X.save(); poly(-22, -10, 20, -100, 40, -96, 2, -6); X.clip(); stripes(-30, -110, 80, 110, ['#e8846f', '#fff3e4', '#4f9fb3', '#fff3e4'], 10); X.restore();
    poly(-22, -10, 20, -100, 40, -96, 2, -6); out(3.5);
    X.restore();
  } else { // cushioned bench
    shadow(x, y + 2, 56, 8);
    box(x - 50, y - 40, 8, 40, '#8a5a3b', 2, 3); box(x + 42, y - 40, 8, 40, '#8a5a3b', 2, 3);
    rr(x - 58, y - 52, 116, 16, 4); fo('#b07a4f'); rr(x - 54, y - 64, 108, 16, 8); fo('#f4d27a', 3);
    rr(x - 58, y - 104, 116, 38, 6); fo('#b07a4f'); planks(x - 54, y - 100, 108, 30, '#b07a4f', 10); rr(x - 58, y - 104, 116, 38, 6); out(4);
    el(x - 30, y - 74, 16, 12); fo('#e8846f', 3); el(x + 32, y - 74, 16, 12); fo('#8fcfb5', 3);
  }
}
P.chairs = (s) => {
  if (BR) { dustSheet(-385, 4, 90, 88); dustSheet(-195, 6, 84, 70); dustSheet(115, 22, 92, 84); return; }
  chair(-385, 4, s, 1); chair(-195, 4, s, -1); chair(-75, 22, s, 1); chair(115, 22, s, -1);
};
P.planters = (s) => {
  const flowers = [['#d9443c', '#f07a6e', '#ffffff'], ['#a98bd6', '#c9b6ec', '#e6dcf7'], ['#f2a33a', '#f7c548', '#f08a3a']][s];
  const leaf = ['#5f9a5a', '#7fa889', '#6a9f50'][s];
  // window box under the shop window
  const wb = () => { rr(-140, 0, 280, 34, 5); };
  const blobs = bush(0, 2, 270, 52, leaf, 9);
  flowersOn(blobs, flowers, s === 1 ? 7 : 10, s === 1 ? 26 : 14);
  if (s === 1 && !BR) { for (let i = 0; i < 9; i++) { const x = -120 + i * 30; ln(x, 0, x + 4, -46 - (i % 3) * 8, '#7e6aa8', 4); } }
  wb(); fo(['#f6ead4', '#c9d9e6', '#e9c9a0'][s]);
  if (!BR) { X.save(); wb(); X.clip(); stripes(-140, 0, 280, 34, ['rgba(0,0,0,0)'], 1); X.restore(); }
  // two pots beside the door (x 300 / 520 from here)
  for (const px of [292, 528]) {
    const b2 = bush(px, 70, 64, 50, leaf, 5, 3.5);
    flowersOn(b2, flowers, 8, 6);
    pot(px, 104, 52, 40, ['#d9825b', '#7fb7c9', '#e8b04a'][s]);
  }
};
P.lights = (s) => {
  const kind = ['bulb', 'lantern', 'shell'][s], col = ['#ffd98a', '#f5a7a0', '#fff1d6'][s];
  ln(-470, 395 - 200 - 0, -470, -40, '#8a5a3b', 7); ln(470, 395 - 200, 470, -40, '#8a5a3b', 7);
  const a = swag(-470, -36, 0, -36, 70, 9), b = swag(0, -36, 470, -36, 70, 9);
  lightString(a, kind, col, !BR); lightString(b, kind, col, !BR);
  if (s === 1 && !BR) { /* alternate colours */ }
};
P.door = (s) => {
  const col = ['#3f7fa6', '#8fb08a', '#f2c64e'][s];
  rr(-74, -232, 148, 236, 6); fo('#f6ead4'); // frame
  X.beginPath(); X.moveTo(-60, 0); X.lineTo(-60, -170); X.arc(0, -170, 60, Math.PI, 0); X.lineTo(60, 0); X.closePath();
  if (BR) { fo('#9d958a'); ln(-70, -150, 70, -110, '#b9a080', 12); ln(-70, -60, 70, -90, '#b9a080', 12); ln(-70, -150, 70, -110, OUT, 2); }
  else {
    fo(col);
    // fanlight
    X.beginPath(); X.moveTo(-50, -170); X.arc(0, -170, 50, Math.PI, 0); X.closePath(); fo('#ffe6a8', 3); glow(0, -180, 50, '#ffd98a', 0.4);
    for (let k = 1; k < 4; k++) ln(0, -170, Math.cos(Math.PI + k * Math.PI / 4) * 50, -170 + Math.sin(Math.PI + k * Math.PI / 4) * 50, '#f6ead4', 2.5);
    rr(-44, -150, 88, 60, 4); fo(dk(col, 0.1), 3); rr(-44, -78, 88, 64, 4); fo(dk(col, 0.1), 3);
    rr(-28, -146, 56, 46, 3); fo('#ffe9b8', 3); glow(0, -124, 60, '#ffd98a', 0.35);
    el(40, -66, 5); fo('#d9a640', 2.5);
  }
  // the hanging sign
  ln(-22, -150, 0, -170, '#6b5040', 2); ln(22, -150, 0, -170, '#6b5040', 2);
  const soon = BR && LIFT > 0, sw = soon ? 56 : 36; // after the first restore the sign flips to "Opening soon"
  rr(-sw, -150, sw * 2, 28, 5); fo(BR ? '#f2e6d2' : '#fff8ec', 3);
  txt(BR ? (soon ? tr('cafe.sign.soon') : tr('cafe.sign.closed')) : tr('cafe.sign.open'), 0, -136, soon ? 15 : 17, BR ? (soon ? '#9a6a3c' : '#7a6a5a') : '#c0583c', { font: ROUND, weight: 700 });
};

// ---- Counter
P.menuBoard = (s) => {
  const frame = ['#8a5a3b', '#9aa7ad', '#c9925e'][s];
  rr(-82, -96, 164, 180, 8); fo(frame);
  rr(-70, -84, 140, 156, 4); fo(s === 2 ? '#f6ead4' : s === 1 ? '#40505a' : '#33403c', 3);
  const ink = s === 2 ? '#5b3a26' : '#f6f0e4';
  if (BR) { X.save(); X.globalAlpha = 0.35; ln(-50, -40, 40, -44, ink, 3); ln(-50, 0, 20, -2, ink, 3); X.restore(); return; }
  txt('Menu', 0, -60, 26, ink, { italic: true });
  const items = [['Tea', '2'], ['Coffee', '3'], ['Scones', '3'], ['Cake', '4']];
  items.forEach(([n, p], i) => { txt(n, -54, -26 + i * 24, 15, ink, { font: ROUND, weight: 500, align: 'left' }); txt(p, 54, -26 + i * 24, 15, ink, { font: ROUND, weight: 500, align: 'right' }); });
  if (s === 1) for (let i = 0; i < 4; i++) { X.beginPath(); X.arc(-64 + i * 42, 78, 9, Math.PI, 0); fo(['#f5c6c0', '#fff1d6', '#bfe3d4', '#f4d27a'][i], 2.5); }
  if (s === 0) { star(58, -62, 7); fill('#f4d27a'); }
};
P.till = (s) => {
  const col = ['#d9a640', '#9fd3bf', '#9a5a3c'][s];
  shadow(0, 0, 50, 6);
  poly(-46, 0, 46, 0, 40, -40, -40, -40); fo(col);
  rr(-34, -76, 68, 38, 6); fo(lt(col, 0.15));
  rr(-22, -70, 44, 16, 3); fo('#fff8ec', 3);
  txt(BR ? '0.00' : '1.50', 0, -62, 11, '#5b3a26', { font: ROUND });
  for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { el(-27 + i * 18, -28 + j * 13, 5, 4); fo('#fff8ec', 2); }
  if (!BR) { X.save(); X.globalAlpha = 0.5; ln(-30, -36, -10, -4, '#ffffff', 3); X.restore(); }
};
P.stools = (s) => {
  const seat = ['#c0583c', '#4f9fb3', '#d9b27a'][s];
  for (const x of [-180, 0, 180]) {
    shadow(x, 0, 34, 6);
    if (BR && x === 0) { X.save(); X.translate(x, -6); X.rotate(1.35); ln(-40, 0, 40, 0, '#8f877d', 6); el(-44, 0, 10, 26); fo('#b9ab9b', 3); X.restore(); continue; }
    ln(x - 18, 0, x - 10, -90, '#5b4a40', 5); ln(x + 18, 0, x + 10, -90, '#5b4a40', 5); ln(x - 14, -30, x + 14, -30, '#5b4a40', 4);
    el(x, -96, 34, 11); fo(dk(seat, 0.1)); el(x, -101, 32, 10); fo(seat, 3);
    if (s === 1 && !BR) { X.save(); el(x, -101, 32, 10); X.clip(); stripes(x - 34, -112, 68, 22, ['#4f9fb3', '#fff3e4'], 8); X.restore(); el(x, -101, 32, 10); out(3); }
    if (s === 2 && !BR) { X.save(); el(x, -101, 32, 10); X.clip(); for (let k = -34; k < 34; k += 7) ln(x + k, -112, x + k + 8, -90, '#b08850', 1.6); X.restore(); }
  }
};
P.pendants = (s) => {
  const col = ['#c97a4a', '#fbf6ec', '#c9a06a'][s];
  for (const [x, len] of [[-200, 70], [0, 92], [200, 70]]) {
    ln(x, 0, x, len, '#4d3b30', 2.5);
    if (!BR) glow(x, len + 40, 110, '#ffd98a', 0.32);
    if (s === 0) { X.beginPath(); X.moveTo(x - 38, len + 38); X.quadraticCurveTo(x - 36, len, x, len); X.quadraticCurveTo(x + 36, len, x + 38, len + 38); X.closePath(); fo(BR ? '#a49a8e' : col); if (!BR) { el(x, len + 40, 14, 6); fill('#fff1c8'); } }
    else if (s === 1) { el(x, len + 24, 26, 26); fo(BR ? '#d8d0c4' : '#fff6e2'); if (!BR) { X.save(); X.globalAlpha = 0.6; el(x - 8, len + 16, 8, 10); fill('#ffffff'); X.restore(); } rr(x - 9, len - 4, 18, 8, 2); fo('#c9a06a', 2.5); }
    else { X.beginPath(); X.moveTo(x - 34, len + 40); X.quadraticCurveTo(x - 30, len, x, len); X.quadraticCurveTo(x + 30, len, x + 34, len + 40); X.closePath(); fill(col); X.save(); X.clip(); for (let k = -36; k < 36; k += 7) ln(x + k, len, x + k * 1.2, len + 42, dk(col, 0.25), 2); for (let yy = len + 8; yy < len + 42; yy += 8) ln(x - 40, yy, x + 40, yy, lt(col, 0.2), 1.5); X.restore(); X.beginPath(); X.moveTo(x - 34, len + 40); X.quadraticCurveTo(x - 30, len, x, len); X.quadraticCurveTo(x + 30, len, x + 34, len + 40); X.closePath(); out(3.5); }
    if (BR) { X.save(); X.globalAlpha = 0.5; X.strokeStyle = '#ffffff'; X.lineWidth = 1.2; X.beginPath(); X.moveTo(x - 30, len + 30); X.lineTo(x - 50, len + 50); X.moveTo(x - 30, len + 30); X.lineTo(x - 40, len + 56); X.stroke(); X.restore(); }
  }
};
P.pastryCase = (s) => {
  shadow(0, 0, 110, 6);
  rr(-108, -16, 216, 16, 3); fo('#c9a06a');
  rr(-100, -86, 200, 70, 10); fill('#e7f3f2'); X.save(); X.globalAlpha = 0.4; X.fill(); X.restore(); out(3.5);
  ln(-100, -50, 100, -50, '#c9d9d8', 3);
  if (!BR) {
    for (let row = 0; row < 2; row++) for (let i = 0; i < 5; i++) {
      const x = -76 + i * 38, y = row ? -24 : -58;
      if (s === 0) { el(x, y, 14, 9); fo('#e6b77a', 2.5); el(x, y - 5, 10, 4); fill('#fff3e4'); el(x, y - 7, 5, 2.5); fill('#d9443c'); }
      else if (s === 1) { el(x, y, 15, 7); fo('#e9c48a', 2.5); el(x, y - 3, 12, 4.5); fill('#f7dc5c'); }
      else { el(x, y, 14, 10); fo('#d9a46a', 2.5); X.beginPath(); X.arc(x, y, 7, 0, 5); X.strokeStyle = C('#9a6234'); X.lineWidth = 2; X.stroke(); X.save(); X.globalAlpha = 0.8; X.beginPath(); X.moveTo(x - 10, y - 4); X.lineTo(x + 10, y - 6); X.strokeStyle = '#fff8ec'; X.stroke(); X.restore(); }
    }
    X.save(); X.globalAlpha = 0.55; ln(-80, -80, -60, -56, '#ffffff', 4); X.restore();
  } else { X.save(); X.globalAlpha = 0.5; for (let i = 0; i < 3; i++) ln(-90 + i * 70, -84, -60 + i * 70, -20, '#ffffff', 2); X.restore(); }
};
P.espresso = (s) => {
  const [body, trim] = [['#c97a4a', '#e9c06a'], ['#f3ead8', '#c9a06a'], ['#a8cfa0', '#e0b85a']][s];
  shadow(0, 0, 66, 7);
  rr(-62, -18, 124, 18, 4); fo(trim);
  rr(-56, -96, 112, 80, 14); fo(body);
  band(() => rr(-56, -96, 112, 80, 14), dk(body, 0.12), 20, -96, 40, 80);
  rr(-56, -96, 112, 80, 14); out(4);
  if (s === 0) { el(0, -110, 28, 16); fo(trim); el(0, -128, 10, 8); fo(trim); }
  else { rr(-46, -112, 92, 16, 6); fo(trim); }
  el(-26, -64, 13, 13); fo('#fff8ec', 3); ln(-26, -64, -20, -70, '#5b3a26', 2);
  el(26, -64, 13, 13); fo('#fff8ec', 3); ln(26, -64, 31, -58, '#5b3a26', 2);
  rr(-40, -34, 16, 12, 3); fo('#5b4a40', 2.5); rr(24, -34, 16, 12, 3); fo('#5b4a40', 2.5);
  if (!BR) { rr(-38, -22, 13, 10, 2); fo('#ffffff', 2); rr(26, -22, 13, 10, 2); fo('#ffffff', 2); X.save(); X.globalAlpha = 0.6; ln(-46, -88, -46, -40, '#ffffff', 4); X.restore(); }
  else { X.save(); X.globalAlpha = 0.6; X.strokeStyle = '#ffffff'; X.lineWidth = 1.2; X.beginPath(); X.moveTo(40, -96); X.lineTo(64, -120); X.moveTo(50, -96); X.lineTo(70, -108); X.stroke(); X.restore(); }
};
P.cupShelves = (s) => {
  for (const y of [-130, -60]) {
    rr(-210, y, 420, 12, 3); fo('#b07a4f', 3.5);
    ln(-180, y + 12, -160, y + 30, '#8a5a3b', 4); ln(180, y + 12, 160, y + 30, '#8a5a3b', 4);
    if (BR) { if (y === -60) { X.save(); X.translate(-120, y); X.rotate(-0.4); rr(-10, -24, 22, 24, 3); fo('#d8d0c4', 3); X.restore(); rr(60, y - 22, 22, 22, 4); fo('#d8d0c4', 3); } continue; }
    for (let i = 0; i < 9; i++) {
      const x = -190 + i * 46;
      if (s === 0) { // blue willow: cups and a plate standing
        if (i % 3 === 1) { el(x + 6, y - 26, 22, 24); fo('#ffffff', 3); el(x + 6, y - 26, 15, 16); fill('#5d86b8'); el(x + 6, y - 26, 8, 9); fill('#ffffff'); }
        else { rr(x - 4, y - 24, 26, 24, 5); fo('#ffffff', 3); X.save(); X.globalAlpha = 0.9; ln(x, y - 14, x + 18, y - 14, '#5d86b8', 3); X.restore(); X.beginPath(); X.arc(x + 24, y - 13, 6, -1.3, 1.3); X.strokeStyle = C(OUT); X.lineWidth = 2.5; X.stroke(); }
      } else if (s === 1) {
        const col = ['#e8846f', '#f4d27a', '#8fcfb5', '#4f9fb3', '#b9a3d6', '#eea0a8'][i % 6];
        rr(x - 4, y - 28, 28, 28, 6); fo(col, 3); X.beginPath(); X.arc(x + 26, y - 14, 7, -1.3, 1.3); X.strokeStyle = C(OUT); X.lineWidth = 2.5; X.stroke();
      } else {
        const col = ['#a8d8c8', '#9fc6e0', '#c8e6b0', '#d6ecec'][i % 4];
        rr(x - 4, y - 36, 26, 36, 6); fill(col); X.save(); X.globalAlpha = 0.5; X.fill(); X.restore(); out(3); rr(x - 1, y - 44, 20, 9, 3); fo('#c9a06a', 2.5);
      }
    }
  }
};
P.bar = (s) => {
  const top = ['#c98a4f', '#f0e2c8', '#c98a4f'][s];
  shadow(0, 0, 330, 10);
  rr(-320, -128, 640, 18, 5); fo(top);
  rr(-306, -112, 612, 112, 4);
  if (s === 0) { fill('#d9a46a'); X.save(); X.clip(); planks(-306, -112, 612, 112, '#d9a46a', 28, true); X.restore(); out(4); }
  else if (s === 1) { fill('#a9cfc6'); X.save(); X.clip(); for (let x = -306; x < 306; x += 68) { rr(x + 8, -100, 52, 88, 4); X.strokeStyle = C(dk('#a9cfc6', 0.2)); X.lineWidth = 3; X.stroke(); } X.restore(); out(4); }
  else { fill('#ffffff'); X.save(); X.clip(); for (let x = -306, i = 0; x < 306; x += 22, i++) for (let y = -112, j = 0; y < 0; y += 22, j++) { X.fillStyle = C((i + j) % 2 ? '#4f9fb3' : '#e9f4f6'); X.fillRect(x + 1, y + 1, 20, 20); } X.restore(); out(4); }
  if (BR) dustSheet(0, -110, 660, 34);
};

// ---- Kitchen
P.kitchenWindow = (s) => {
  rr(-120, -110, 240, 196, 8); fo('#f6ead4');
  rr(-100, -92, 200, 162, 4); fo(BR ? '#c9c2b6' : '#bfe0e6');
  if (!BR) { // the view: sea and a little boat
    X.save(); rr(-100, -92, 200, 162, 4); X.clip();
    X.fillStyle = '#ffe2b8'; X.fillRect(-100, -92, 200, 70);
    X.fillStyle = '#7cc4c4'; X.fillRect(-100, -22, 200, 100);
    X.fillStyle = '#9dbb8f'; el(60, -22, 90, 22); X.fill();
    poly(-30, 10, 10, 10, 2, 22, -22, 22); X.fillStyle = '#e8846f'; X.fill(); ln(-10, 10, -10, -20, '#5b4636', 2);
    poly(-8, -18, -8, 8, 10, 8); X.fillStyle = '#ffffff'; X.fill();
    X.restore();
  } else { X.save(); X.globalAlpha = 0.5; for (let i = 0; i < 20; i++) { el(-90 + R() * 180, -80 + R() * 140, 6 + R() * 8); fill('#ffffff'); } X.restore(); }
  ln(0, -92, 0, 70, '#f6ead4', 6); ln(-100, -10, 100, -10, '#f6ead4', 6);
  rr(-112, 70, 224, 14, 3); fo('#f6ead4', 3.5);
  if (s === 0) { // gingham curtains + valance
    for (const side of [-1, 1]) { X.beginPath(); X.moveTo(side * 104, -96); X.lineTo(side * 52, -96); X.quadraticCurveTo(side * 70, -10, side * 104, 30); X.closePath(); fill('#e8846f'); X.save(); X.clip(); for (let x = -110; x < 110; x += 12) { X.fillStyle = C('rgba(255,255,255,.45)'); X.fillRect(x, -100, 6, 140); } for (let y = -100; y < 40; y += 12) { X.fillStyle = 'rgba(255,255,255,.35)'; X.fillRect(-110, y, 220, 6); } X.restore(); X.beginPath(); X.moveTo(side * 104, -96); X.lineTo(side * 52, -96); X.quadraticCurveTo(side * 70, -10, side * 104, 30); X.closePath(); out(3); }
  } else if (s === 1) { // lace café curtain across the lower half
    X.beginPath(); X.moveTo(-100, -14); X.lineTo(100, -14); X.lineTo(100, 70); X.lineTo(-100, 70); X.closePath(); fill('#fffaf2'); X.save(); X.globalAlpha = 0.8; X.fill(); X.restore(); out(3);
    for (let i = 0; i < 10; i++) { X.beginPath(); X.arc(-90 + i * 20, -14, 10, 0, Math.PI); X.strokeStyle = C('#e6d9c4'); X.lineWidth = 2; X.stroke(); }
    ln(-104, -14, 104, -14, '#c9a06a', 4);
  } else { // shutters open on each side
    for (const side of [-1, 1]) { rr(side > 0 ? 120 : -170, -100, 50, 176, 4); fo('#4f9fb3'); for (let y = -88; y < 70; y += 14) ln(side > 0 ? 126 : -164, y, side > 0 ? 164 : -126, y, dk('#4f9fb3', 0.2), 2.5); }
  }
  if (!BR) { // herbs on the sill
    for (const x of [-66, 66]) { const b = bush(x, 58, 40, 34, '#6a9f50', 4, 3); pot(x, 70, 32, 18, '#d9825b', false); }
  }
};
P.pans = (s) => {
  const col = ['#c97a4a', '#a9d3cf', '#d0564a'][s];
  ln(-140, 40, 140, 40, '#5b4636', 6); ln(-120, 0, -120, 40, '#5b4636', 3); ln(120, 0, 120, 40, '#5b4636', 3);
  const sizes = [26, 34, 22, 30, 20];
  sizes.forEach((r, i) => {
    const x = -112 + i * 56;
    if (BR && i === 2) return;
    ln(x, 40, x, 52, '#5b4636', 2.5);
    rr(x - 4, 50, 8, 34, 3); fo(s === 0 ? '#9a5a34' : '#3d3a3f', 2.5);
    el(x, 84 + r, r, r); fo(i % 2 && s !== 0 ? lt(col, 0.1) : col);
    if (!BR) { X.save(); X.globalAlpha = 0.45; el(x - r * 0.35, 84 + r * 0.7, r * 0.3, r * 0.45); fill('#ffffff'); X.restore(); }
    if (s !== 0) { el(x, 84 + r, r * 0.6, r * 0.6); fill('#fffaf0'); X.save(); X.globalAlpha = 0.6; X.fill(); X.restore(); }
  });
  if (BR) { X.save(); X.globalAlpha = 0.6; X.strokeStyle = '#ffffff'; X.lineWidth = 1.2; X.beginPath(); X.moveTo(-140, 40); X.lineTo(-100, 90); X.moveTo(-140, 60); X.lineTo(-120, 40); X.stroke(); X.restore(); }
};
P.spiceShelf = (s) => {
  rr(-96, 0, 192, 10, 3); fo('#b07a4f', 3.5);
  rr(-96, -66, 192, 8, 3); fo('#b07a4f', 3.5);
  ln(-90, -58, -90, 0, '#8a5a3b', 4); ln(90, -58, 90, 0, '#8a5a3b', 4);
  if (BR) { rr(-60, -24, 18, 24, 3); fo('#d8d0c4', 2.5); return; }
  for (let i = 0; i < 6; i++) {
    const x = -72 + i * 29, col = ['#c0583c', '#e8b04a', '#6a9f50', '#8a5a3b', '#d97a4a', '#9a7ab0'][i];
    if (s === 0) { rr(x - 10, -40, 20, 40, 5); fill('#e7f3f2'); X.save(); X.globalAlpha = 0.6; X.fill(); X.restore(); out(2.5); rr(x - 8, -20, 16, 18, 3); fill(col); rr(x - 9, -46, 18, 8, 2); fo('#c9a06a', 2); }
    else if (s === 1) { rr(x - 11, -36, 22, 36, 3); fo(['#d0564a', '#4f9fb3', '#f4d27a', '#6a9f6b', '#e8846f', '#2f4a6b'][i], 2.5); rr(x - 8, -26, 16, 12, 2); fo('#fff8ec', 1.5); }
    else { X.beginPath(); X.moveTo(x - 9, -30); X.quadraticCurveTo(x - 14, 0, x, 0); X.quadraticCurveTo(x + 14, 0, x + 9, -30); X.closePath(); fo('#c97a4a', 2.5); el(x, -31, 10, 4); fo('#b06a3a', 2); }
  }
};
P.bakingTable = (s) => {
  const top = ['#d9a46a', '#ece7e2', '#e9c9a0'][s], legs = ['#8a5a3b', '#8a5a3b', '#9fbfd0'][s];
  shadow(0, 0, 160, 10);
  box(-136, -78, 16, 78, legs, 3, 3.5); box(120, -78, 16, 78, legs, 3, 3.5);
  rr(-146, -40, 292, 10, 2); fo(dk(legs, 0.1), 3);
  rr(-156, -96, 312, 24, 5); fo(top);
  if (s === 0 && !BR) { X.save(); rr(-156, -96, 312, 24, 5); X.clip(); for (let x = -156; x < 160; x += 26) ln(x, -96, x, -72, dk(top, 0.2), 2); X.restore(); }
  if (s === 1 && !BR) { X.save(); rr(-156, -96, 312, 24, 5); X.clip(); X.globalAlpha = 0.5; for (let i = 0; i < 5; i++) { X.beginPath(); X.moveTo(-150 + i * 70, -96); X.quadraticCurveTo(-120 + i * 70, -84, -90 + i * 66, -72); X.strokeStyle = '#b8b0aa'; X.lineWidth = 2; X.stroke(); } X.restore(); }
  if (BR) dustSheet(0, -72, 330, 40);
};
P.bread = (s) => {
  if (BR) { // an empty bread board with a few crumbs
    rr(-110, -14, 220, 14, 5); fo('#c9a06a', 3);
    return;
  }
  rr(-110, -14, 220, 14, 5); fo('#c98a4f', 3);
  if (s === 0) for (const [x, r] of [[-60, 36], [8, 40], [70, 30]]) { el(x, -14 - r * 0.62, r, r * 0.68); fo('#d99a55'); for (let k = -1; k <= 1; k++) ln(x + k * r * 0.35 - 6, -14 - r * 0.95, x + k * r * 0.35 + 6, -14 - r * 0.45, '#f3d39c', 3); }
  else if (s === 1) for (const x of [-56, 42]) { for (let k = 0; k < 4; k++) { el(x - 36 + k * 24, -32 - (k % 2) * 6, 18, 16); fo('#d89a50', 3); } X.save(); X.globalAlpha = 0.5; for (let i = 0; i < 12; i++) { el(x - 40 + R() * 80, -40 + R() * 12, 1.8); fill('#fff8ec'); } X.restore(); }
  else for (let i = 0; i < 6; i++) { const x = -80 + i * 32; el(x, -30, 16, 15); fo('#e6b77a', 3); X.beginPath(); X.moveTo(x - 15, -32); X.quadraticCurveTo(x, -50, x + 15, -32); X.closePath(); fill(['#fff3e4', '#f5c6c0', '#fff3e4'][i % 3]); el(x, -44, 4); fill('#d9443c'); }
};
P.sink = (s) => {
  const col = ['#ffffff', '#b9b4ae', '#c97a4a'][s];
  shadow(0, 0, 110, 8);
  rr(-110, -64, 220, 64, 4); fo('#e9dccb');
  ln(-36, -62, -36, -2, '#c9b8a0', 2.5); ln(36, -62, 36, -2, '#c9b8a0', 2.5);
  el(-70, -32, 4); fill('#c9a06a'); el(70, -32, 4); fill('#c9a06a');
  rr(-120, -80, 240, 18, 4); fo('#c98a4f');
  rr(-70, -118, 140, 40, 8); fo(col);
  if (s === 2 && !BR) { X.save(); rr(-70, -118, 140, 40, 8); X.clip(); X.globalAlpha = 0.35; for (let i = 0; i < 26; i++) { el(-66 + R() * 132, -114 + R() * 32, 5); fill('#f0b68a'); } X.restore(); }
  // taps
  ln(-20, -118, -20, -140, '#c9a06a', 6); ln(20, -118, 20, -140, '#c9a06a', 6);
  X.beginPath(); X.moveTo(-20, -140); X.quadraticCurveTo(0, -158, 4, -126); X.strokeStyle = C('#c9a06a'); X.lineWidth = 6; X.stroke();
  if (!BR) { el(-60, -100, 8, 6); fo('#9fd3bf', 2); rr(40, -130, 18, 22, 4); fo('#f4d27a', 2.5); }
  else { X.save(); X.globalAlpha = 0.6; X.strokeStyle = '#ffffff'; X.lineWidth = 1.2; X.beginPath(); X.moveTo(-110, -64); X.lineTo(-80, -30); X.stroke(); X.restore(); }
};
P.range = (s) => {
  const col = ['#f1e4c8', '#3f6b52', '#6f9fd8'][s];
  shadow(0, 0, 130, 10);
  // flue to the ceiling
  rr(-24, -340, 48, 150, 2); fo('#5b4a40', 3.5);
  rr(-120, -190, 240, 190, 10); fo(col);
  band(() => rr(-120, -190, 240, 190, 10), dk(col, 0.1), 60, -190, 60, 190);
  rr(-120, -190, 240, 190, 10); out(4);
  rr(-130, -200, 260, 22, 6); fo('#c9c2b6');
  for (const x of [-56, 56]) { rr(x - 46, -150, 92, 80, 6); fo(dk(col, 0.08), 3); rr(x - 30, -134, 60, 34, 4); fo(BR ? '#8a8278' : '#3d3a3f', 3); if (!BR) glow(x, -118, 40, '#ffb36b', 0.45); ln(x - 30, -86, x + 30, -86, '#c9a06a', 5); }
  rr(-104, -54, 208, 40, 5); fo(dk(col, 0.08), 3);
  ln(-90, -34, 90, -34, '#c9a06a', 4);
  // a kettle
  if (!BR) { el(-50, -216, 30, 20); fo('#e8846f'); X.beginPath(); X.arc(-50, -228, 20, Math.PI, 0); X.strokeStyle = C(OUT); X.lineWidth = 3; X.stroke(); poly(-22, -220, -2, -236, 0, -230, -20, -210); fo('#e8846f', 3); }
};
P.dresser = (s) => {
  const col = ['#d9a46a', '#a9bf9a', '#f2d27a'][s];
  shadow(0, 0, 112, 10);
  rr(-104, -330, 208, 16, 4); fo(dk(col, 0.06));
  rr(-96, -316, 192, 180, 4); fo(lt(col, 0.18));
  rr(-104, -140, 208, 140, 6); fo(col);
  rr(-112, -150, 224, 16, 4); fo(dk(col, 0.08));
  for (const y of [-262, -204]) ln(-96, y, 96, y, dk(col, 0.25), 5);
  rr(-90, -128, 84, 50, 4); fo(dk(col, 0.06), 3); rr(6, -128, 84, 50, 4); fo(dk(col, 0.06), 3);
  rr(-90, -70, 180, 60, 4); fo(dk(col, 0.06), 3);
  for (const x of [-48, 48]) { el(x, -103, 5); fo('#c9a06a', 2); }
  el(0, -40, 5); fo('#c9a06a', 2);
  if (BR) { X.save(); X.translate(30, -264); X.rotate(0.6); rr(-20, -30, 40, 30, 4); fo('#d8d0c4', 3); X.restore(); X.save(); X.globalAlpha = 0.6; X.strokeStyle = '#ffffff'; X.lineWidth = 1.2; X.beginPath(); X.moveTo(-96, -316); X.lineTo(-60, -280); X.moveTo(-96, -296); X.lineTo(-76, -316); X.stroke(); X.restore(); return; }
  // plates and jugs on the shelves
  for (let i = 0; i < 5; i++) { const x = -76 + i * 38; el(x, -292, 17, 20); fo('#ffffff', 3); el(x, -292, 10, 12); fill(['#5d86b8', '#e8846f', '#6a9f6b'][s]); }
  for (let i = 0; i < 4; i++) { const x = -66 + i * 44; rr(x - 12, -236, 24, 30, 6); fo(['#f4d27a', '#e8846f', '#8fcfb5', '#4f9fb3'][(i + s) % 4], 3); X.beginPath(); X.arc(x + 13, -222, 7, -1.3, 1.3); X.strokeStyle = C(OUT); X.lineWidth = 2.5; X.stroke(); }
};

// ---- Garden
P.gate = (s) => {
  const col = ['#fbf6ec', '#6f9fd8', '#b08850'][s];
  // gate posts
  box(-98, -126, 18, 128, '#c9b8a0', 3, 3.5); box(80, -126, 18, 128, '#c9b8a0', 3, 3.5);
  el(-89, -130, 12, 8); fo('#c9b8a0', 3); el(89, -130, 12, 8); fo('#c9b8a0', 3);
  X.save(); if (BR) { X.translate(-80, 0); X.rotate(0.12); X.translate(80, 0); }
  if (s === 0) { for (let i = 0; i < 7; i++) { const x = -74 + i * 24; poly(x - 8, -4, x + 8, -4, x + 8, -92, x, -104, x - 8, -92); fo(col, 3); } box(-80, -76, 160, 12, col, 2, 3); box(-80, -28, 160, 12, col, 2, 3); }
  else if (s === 1) { rr(-78, -100, 156, 96, 4); X.save(); X.clip(); for (let k = -200; k < 200; k += 26) { ln(k, -100, k + 100, -4, col, 6); ln(k + 100, -100, k, -4, col, 6); } X.restore(); rr(-78, -100, 156, 96, 4); out(5); X.beginPath(); X.moveTo(-78, -100); X.quadraticCurveTo(0, -132, 78, -100); X.strokeStyle = C(col); X.lineWidth = 8; X.stroke(); }
  else { for (let i = 0; i < 9; i++) { const x = -72 + i * 18; X.beginPath(); X.moveTo(x, -4); X.quadraticCurveTo(x + (i % 2 ? 6 : -6), -50, x + (i % 2 ? -2 : 2), -98); X.strokeStyle = C(col); X.lineWidth = 6; X.stroke(); } X.beginPath(); X.moveTo(-80, -60); X.quadraticCurveTo(0, -80, 80, -60); X.strokeStyle = C(dk(col, 0.15)); X.lineWidth = 7; X.stroke(); }
  X.restore();
};
P.gardenPath = (s) => {
  if (BR) { X.save(); X.globalAlpha = 0.8; for (let i = 0; i < 9; i++) { const y = 10 + i * 20; el(-30 + R() * 60, y, 14, 6); fo('#b9ab9b', 2.5); } X.restore(); return; }
  const shape = () => poly(-40, 0, 40, 0, 96, 190, -96, 190);
  if (s === 0) { shape(); fo('#f3e6d2', 3); X.save(); shape(); X.clip(); for (let i = 0; i < 220; i++) { el(-96 + R() * 192, R() * 190, 2 + R() * 3, 1.5 + R() * 2); fill(['#ffffff', '#f5c6c0', '#e9dccb', '#d9c9b4'][i % 4]); } X.restore(); }
  else if (s === 1) { shape(); fo('#c0583c', 3); X.save(); shape(); X.clip(); for (let y = 0; y < 200; y += 16) for (let x = -110; x < 110; x += 32) { const o = (y / 16) % 2 ? 16 : 0; rr(x + o, y, 28, 13, 2); X.fillStyle = C(['#d0684a', '#c25c40', '#d9765a'][(x + y) % 3 === 0 ? 0 : 1]); X.fill(); X.strokeStyle = C('#e9c9a0'); X.lineWidth = 2; X.stroke(); } X.restore(); shape(); out(3); }
  else { for (let i = 0; i < 7; i++) { const t = i / 6, y = 10 + t * 170, w = 34 + t * 34; el((i % 2 ? 12 : -12), y, w, 9 + t * 7); fo('#d9d0c2', 3); } }
};
P.herbs = (s) => {
  const leaf = ['#7a9a6a', '#5f9a5a', '#4f8a3a'][s], fl = [['#9a8ad6'], ['#c9b6ec', '#ffffff'], ['#f2a33a', '#d9443c', '#f7c548']][s];
  rr(-140, -46, 280, 46, 5); fo('#b07a4f'); planks(-136, -42, 272, 38, '#b07a4f', 19); rr(-140, -46, 280, 46, 5); out(4);
  rr(-132, -52, 264, 10, 3); fo('#6a4a34', 3);
  for (let i = 0; i < 4; i++) {
    const x = -100 + i * 66;
    const b = BR ? bush(x, -48, 40, 18, '#9a9180', 3, 3) : bush(x, -56, 58, 46, i % 2 ? lt(leaf, 0.1) : leaf, 5, 3.5);
    if (!BR) { if (s === 0 && i % 2 === 0) for (let k = -2; k <= 2; k++) ln(x + k * 6, -56, x + k * 9, -100, '#4f6f4a', 3); flowersOn(b, fl, 6, s === 1 ? 2 : 4); }
  }
  // a little label stake
  if (!BR) { ln(120, -40, 120, -84, '#8a5a3b', 3); rr(104, -100, 32, 18, 3); fo('#fff8ec', 2.5); }
};
P.birdbath = (s) => {
  const col = ['#d9d0c2', '#6f9fd8', '#c97a4a'][s];
  shadow(0, 0, 44, 8);
  rr(-30, -14, 60, 14, 4); fo('#cfc4b4');
  poly(-14, -14, 14, -14, 9, -76, -9, -76); fo('#cfc4b4');
  if (s === 0) { X.beginPath(); X.moveTo(-58, -82); for (let i = 0; i <= 8; i++) { const x = -58 + i * 14.5; X.quadraticCurveTo(x - 7, -96, x, -84); } X.lineTo(40, -76); X.quadraticCurveTo(0, -60, -40, -76); X.closePath(); fo(col); }
  else { X.beginPath(); X.moveTo(-58, -84); X.quadraticCurveTo(0, -48, 58, -84); X.closePath(); fo(col); }
  el(0, -86, 58, 10); fo(BR ? '#a8a092' : lt(col, 0.1));
  if (!BR) { el(0, -86, 48, 7); fill('#a9dde0'); X.save(); X.globalAlpha = 0.7; ln(-20, -87, 0, -87, '#ffffff', 2.5); X.restore();
    // a robin
    el(38, -102, 13, 11); fo('#8a6a4a', 3); el(42, -100, 7, 6); fill('#e8846f'); el(46, -108, 2); fill('#2a1d16'); poly(51, -106, 58, -104, 51, -102); fill('#e8b04a'); }
  else { X.save(); X.globalAlpha = 0.6; for (let i = 0; i < 4; i++) { el(-30 + i * 18, -88, 7, 3); fill('#8a7a5a'); } X.restore(); }
};
P.gardenBench = (s) => {
  const col = ['#fbf6ec', '#5fa89a', '#f2c64e'][s];
  shadow(0, 2, 110, 9);
  X.save(); if (BR) { X.translate(0, 0); X.rotate(-0.03); }
  box(-92, -46, 12, 46, dk(col, 0.1), 2, 3); box(80, -46, 12, 46, dk(col, 0.1), 2, 3);
  for (let i = 0; i < 3; i++) { rr(-104, -54 + i * 0, 208, 10, 3); }
  rr(-106, -56, 212, 14, 3); fo(col);
  for (let i = 0; i < 3; i++) { rr(-100, -110 + i * 17, 200, 12, 3); fo(BR && i === 1 ? '#a89a8a' : col, 3.5); }
  box(-104, -114, 12, 70, dk(col, 0.1), 2, 3); box(92, -114, 12, 70, dk(col, 0.1), 2, 3);
  if (!BR) { el(-50, -70, 18, 14); fo(s === 0 ? '#9fd3bf' : '#f5c6c0', 3); }
  X.restore();
};
P.arch = (s) => {
  const fl = [['#eea0a8', '#f5c6c0', '#e47f8c'], ['#ffffff', '#fff6dc'], ['#9a7ab0', '#b9a3d6', '#7e5aa0']][s];
  // the iron arch
  X.beginPath(); X.moveTo(-96, 0); X.lineTo(-96, -180); X.arc(0, -180, 96, Math.PI, 0); X.lineTo(96, 0);
  X.strokeStyle = C(OUT); X.lineWidth = 14; X.stroke(); X.strokeStyle = C('#5b5a62'); X.lineWidth = 8; X.stroke();
  X.beginPath(); X.moveTo(-70, 0); X.lineTo(-70, -180); X.arc(0, -180, 70, Math.PI, 0); X.lineTo(70, 0); X.strokeStyle = C('#5b5a62'); X.lineWidth = 4; X.stroke();
  // greenery climbing it
  const pts = [];
  for (let i = 0; i <= 14; i++) { const a = Math.PI + (i / 14) * Math.PI; pts.push([Math.cos(a) * 84, -180 + Math.sin(a) * 84]); }
  for (let i = 0; i < 6; i++) { pts.push([-84, -150 + i * 26]); pts.push([84, -150 + i * 26]); }
  const leaf = BR ? '#9a9180' : '#5f9a5a';
  X.lineWidth = 8; X.strokeStyle = OUT;
  const sz = BR ? 10 : 20;
  const step = BR ? 3 : 1;
  for (let i = 0; i < pts.length; i += step) { X.beginPath(); X.arc(pts[i][0], pts[i][1], sz, 0, TAU); X.stroke(); }
  X.fillStyle = C(leaf);
  for (let i = 0; i < pts.length; i += step) { X.beginPath(); X.arc(pts[i][0], pts[i][1], sz, 0, TAU); X.fill(); }
  if (!BR) { X.fillStyle = C(lt(leaf, 0.2)); for (const [x, y] of pts) { X.beginPath(); X.arc(x - 5, y - 6, 8, 0, TAU); X.fill(); }
    for (let i = 0; i < pts.length; i++) { const [x, y] = pts[i]; if (s === 2) { star(x + (R() - 0.5) * 10, y + (R() - 0.5) * 10, 11, 0.55, 4); fill(fl[i % 3]); el(x, y, 3); fill('#f6d36b'); } else bloom(x + (R() - 0.5) * 12, y + (R() - 0.5) * 12, s === 1 ? 8 : 11, fl[i % fl.length], s === 1 ? '#f4d27a' : '#f7d9a0'); } }
};
P.tree = (s) => {
  shadow(0, 0, 120, 14);
  X.beginPath(); X.moveTo(-26, 0); X.quadraticCurveTo(-16, -120, -40, -210); X.lineTo(-14, -214); X.quadraticCurveTo(4, -150, 22, -230); X.lineTo(40, -222); X.quadraticCurveTo(14, -120, 28, 0); X.closePath(); fo('#9a6a44');
  const leaf = ['#5f9a5a', '#7fae6a', '#4f8a4a'][s];
  if (BR) { // bare-ish and overgrown
    for (const [x, y, a] of [[-40, -210, -2.2], [30, -226, -0.9], [0, -170, -1.6]]) ln(x, y, x + Math.cos(a) * 70, y + Math.sin(a) * 70, '#8a7a6a', 5);
    const b = bush(0, -250, 230, 140, '#9a9a80', 7, 4); return;
  }
  const b = bush(0, -250, 290, 230, leaf, 11, 4);
  for (let i = 0; i < 18; i++) {
    const [bx, by, br] = b[i % b.length], a = R() * TAU, d = R() * br * 0.7;
    const x = bx + Math.cos(a) * d, y = by + Math.sin(a) * d;
    if (s === 0) { el(x, y, 9, 7); fo('#f7dc5c', 2.5); }
    else if (s === 1) bloom(x, y, 9, i % 2 ? '#ffffff' : '#f9d0d6', '#f4d27a');
    else { el(x, y, 8); fo('#f29a3a', 2.5); }
  }
};
P.borders = (s) => {
  const cols = [['#eea0a8', '#b9a3d6', '#f4d27a', '#ffffff'], ['#6f9fd8', '#ffffff', '#9fc6e0'], ['#e8846f', '#f2a33a', '#d0564a', '#f7c548']][s];
  for (const side of [-1, 1]) {
    const cx = side * 290;
    const b = BR ? bush(cx, -6, 300, 50, '#9a9a80', 7, 4) : bush(cx, -16, 320, 90, '#5f9a5a', 9, 4);
    if (!BR) {
      if (s === 1) for (let i = 0; i < 8; i++) { const x = cx - 130 + i * 37; ln(x, -30, x, -110 - (i % 3) * 14, '#4f7f4a', 4); for (let k = 0; k < 5; k++) el(x, -70 - (i % 3) * 14 - k * 9, 7 - k, 5); fill(i % 2 ? '#6f9fd8' : '#ffffff'); }
      flowersOn(b, cols, s === 2 ? 14 : 10, s === 2 ? 10 : 14);
    }
  }
};

// ---- Pier
P.pierBoards = (s) => {
  const col = ['#b7ada0', '#d9a46a', '#f3ede2'][s];
  rr(-500, -10, 1000, 22, 2); fill(col);
  X.save(); rr(-500, -10, 1000, 22, 2); X.clip();
  for (let x = -500, i = 0; x < 500; x += 26, i++) {
    if (BR && (i % 7 === 3)) { X.fillStyle = '#5a6f78'; X.fillRect(x, -10, 26, 22); continue; }
    X.fillStyle = C(i % 3 === 0 ? dk(col, 0.06) : col); X.fillRect(x, -10, 26, 22);
    ln(x, -10, x, 12, dk(col, 0.25), 2);
  }
  X.restore(); rr(-500, -10, 1000, 22, 2); out(4);
  rr(-500, 12, 1000, 22, 2); fo(dk(col, 0.18));
  if (BR) { X.save(); X.translate(140, 12); X.rotate(0.25); rr(0, 0, 70, 10, 2); fo('#a89a8a', 3); X.restore(); }
};
P.buoys = (s) => {
  for (let i = 0; i < 6; i++) {
    const x = -400 + i * 160 + (i % 2) * 20, len = 34 + (i % 3) * 12;
    if (BR && i % 2) continue;
    ln(x, 0, x, len, '#8a7050', 3);
    const cols = [['#d0564a', '#ffffff'], [['#e8846f', '#f4d27a', '#8fcfb5', '#4f9fb3', '#b9a3d6', '#eea0a8'][i], '#ffffff'], ['#a8d8c8', '#d6ecec']][s];
    if (s === 2) { el(x, len + 16, 16); fill(cols[i % 2]); X.save(); X.globalAlpha = 0.6; X.fill(); X.restore(); out(3); X.save(); X.beginPath(); X.arc(x, len + 16, 16, 0, TAU); X.clip(); for (let k = -20; k < 20; k += 10) { ln(x + k, len, x + k + 14, len + 32, '#8a7050', 1.5); ln(x + k + 14, len, x + k, len + 32, '#8a7050', 1.5); } X.restore(); }
    else { el(x, len + 18, 15, 19); fill(cols[0]); X.save(); el(x, len + 18, 15, 19); X.clip(); X.fillStyle = C(cols[1]); X.fillRect(x - 16, len + 12, 32, 12); X.restore(); el(x, len + 18, 15, 19); out(3); }
  }
  // a net draped between two posts
  if (!BR) { X.save(); X.globalAlpha = 0.65; X.beginPath(); for (let k = 0; k < 8; k++) { X.moveTo(-260 + k * 14, 0); X.quadraticCurveTo(-210, 40, -160 + k * 6, 4); } X.strokeStyle = '#8a7050'; X.lineWidth = 1.5; X.stroke(); X.restore(); }
};
function lampPost(x, y, h, s, lit) {
  const col = ['#3d4a52', '#c9a06a', '#3d4a52'][s];
  shadow(x, y, 28, 6);
  rr(x - 16, y - 20, 32, 20, 3); fo(col, 3.5);
  ln(x, y - 20, x, y - h, OUT, 12); ln(x, y - 20, x, y - h, col, 7);
  if (s === 0) { poly(x - 22, y - h - 8, x + 22, y - h - 8, x + 14, y - h - 50, x - 14, y - h - 50); fo(lit ? '#fff1c8' : '#d8d0c4', 3.5); poly(x - 24, y - h - 50, x + 24, y - h - 50, x, y - h - 70); fo(col, 3.5); }
  else if (s === 1) { rr(x - 18, y - h - 50, 36, 46, 6); fo(lit ? '#ffe8b0' : '#d8d0c4', 3.5); ln(x - 18, y - h - 28, x + 18, y - h - 28, col, 3); X.beginPath(); X.moveTo(x - 22, y - h - 50); X.quadraticCurveTo(x, y - h - 74, x + 22, y - h - 50); X.closePath(); fo(col, 3.5); el(x, y - h - 70, 5); fo(col, 2); }
  else { el(x, y - h - 28, 24); fo(lit ? '#fff6e2' : '#e0dad0', 3.5); rr(x - 9, y - h - 8, 18, 8, 2); fo(col, 2.5); }
  if (lit) glow(x, y - h - 28, 110, '#ffd98a', 0.4);
}
P.pierLamps = (s) => {
  for (const x of [-275, 275]) {
    if (BR && x > 0) { X.save(); X.translate(x, 0); X.rotate(0.08); lampPost(0, 0, 300, s, false); X.restore(); continue; }
    lampPost(x, 0, 300, s, !BR);
  }
};
P.seaScope = (s) => {
  const col = ['#d9a640', '#8fcfb5', '#d0564a'][s];
  shadow(0, 0, 36, 6);
  poly(-26, 0, 26, 0, 10, -60, -10, -60); fo(dk(col, 0.1));
  X.save(); X.translate(0, -76); X.rotate(BR ? 0.5 : -0.25);
  rr(-42, -16, 84, 32, 14); fo(col);
  rr(36, -20, 14, 40, 5); fo(dk(col, 0.15), 3); rr(-50, -12, 12, 24, 4); fo('#3d3a3f', 3);
  X.restore();
  el(0, -66, 12, 8); fo(dk(col, 0.2), 3);
};
P.pierRail = (s) => {
  const col = ['#fbf6ec', '#a0724a', '#4f84b3'][s];
  for (let x = -490; x <= 490; x += 70) { if (BR && (x === -70 || x === 280)) continue; rr(x - 5, -70, 10, 72, 2); fo(col, 3); }
  if (s === 1) { for (const y of [-64, -34]) { const pts = []; for (let x = -490; x <= 490; x += 35) pts.push([x, y + (Math.abs(((x + 490) / 70) % 1 - 0.5) < 0.3 ? 8 : 0)]); X.beginPath(); for (let x = -490; x < 490; x += 70) { X.moveTo(x, y); X.quadraticCurveTo(x + 35, y + 14, x + 70, y); } X.strokeStyle = C(OUT); X.lineWidth = 8; X.stroke(); X.strokeStyle = C('#d9b27a'); X.lineWidth = 5; X.stroke(); } }
  else {
    const top = () => rr(-496, -78, 992, 12, 3);
    if (BR) { rr(-496, -78, 420, 12, 3); fo(col, 3); X.save(); X.translate(-70, -72); X.rotate(0.18); rr(0, -6, 330, 12, 3); fo(col, 3); X.restore(); rr(260, -78, 236, 12, 3); fo(col, 3); }
    else { top(); fo(col, 3.5); rr(-496, -40, 992, 8, 3); fo(col, 3); }
  }
};
P.rowboat = (s) => {
  const col = ['#d0564a', '#6fb3d8', '#f2c64e'][s];
  X.save(); if (BR) X.rotate(0.06);
  X.beginPath(); X.moveTo(-170, -52); X.quadraticCurveTo(-120, 36, 0, 30); X.quadraticCurveTo(130, 30, 172, -56); X.lineTo(150, -48); X.lineTo(-150, -46); X.closePath(); fo(col);
  X.save(); X.clip(); X.fillStyle = C('#fff8ec'); X.fillRect(-180, -56, 360, 16); X.fillStyle = 'rgba(40,20,10,.12)'; X.fillRect(-180, 0, 360, 40); X.restore();
  X.beginPath(); X.moveTo(-170, -52); X.quadraticCurveTo(-120, 36, 0, 30); X.quadraticCurveTo(130, 30, 172, -56); X.lineTo(150, -48); X.lineTo(-150, -46); X.closePath(); out(4);
  ln(-160, -50, 162, -54, '#8a5a3b', 6);
  if (BR) { el(40, -10, 16, 9); fill('#7a6a5a'); rr(-30, -30, 50, 10, 3); fo('#a89a8a', 3); }
  else { ln(-60, -60, 80, -94, '#c9a06a', 6); ln(-60, -60, 80, -94, OUT, 1.5); txt(['Rosie', 'Bluebell', 'Sunny'][s], 92, -20, 18, '#fff8ec', { italic: true }); }
  X.restore();
};
P.teaHut = (s) => {
  const [a, b, roof] = [['#e8846f', '#fff3e4', '#d0564a'], ['#6fb3d8', '#fff3e4', '#2f4a6b'], ['#f5c6c0', '#bfe3d4', '#f4d27a']][s];
  shadow(0, 0, 130, 10);
  rr(-110, -190, 220, 190, 4); fill(a);
  X.save(); rr(-110, -190, 220, 190, 4); X.clip();
  if (BR) planks(-110, -190, 220, 190, '#bdb2a4', 24, true);
  else stripes(-110, -190, 220, 190, s === 2 ? [a, b, '#fff3e4', b] : [a, b], 22);
  X.restore(); rr(-110, -190, 220, 190, 4); out(4);
  // hatch with counter
  rr(-74, -150, 148, 76, 4); fo(BR ? '#9a9080' : '#fff1d6');
  if (BR) { for (let i = 0; i < 4; i++) ln(-74, -140 + i * 20, 74, -140 + i * 20, '#7a6a5a', 3); }
  else { glow(0, -112, 80, '#ffd98a', 0.4); rr(-50, -116, 22, 26, 4); fo('#ffffff', 2.5); el(30, -100, 18, 10); fo('#e8846f', 2.5); }
  rr(-84, -76, 168, 14, 3); fo('#c98a4f');
  poly(-136, -186, 136, -186, 0, -262); fo(roof);
  ln(0, -262, 0, -290, '#6b5040', 3); if (!BR) { poly(0, -290, 30, -282, 0, -274); fo('#f4d27a', 2.5); }
  txt('TEA', 0, -212, 22, BR ? '#8a7a6a' : '#fff8ec', { font: ROUND, weight: 700 });
};
P.pierFlags = (s) => {
  const cols = [['#f5c6c0', '#bfe3d4', '#fff1b8', '#d9ccf0'], ['#2f4a6b', '#ffffff', '#d0564a', '#f4d27a'], ['#e8846f', '#f4d27a', '#8fcfb5', '#4f9fb3', '#b9a3d6']][s];
  const a = swag(-480, 60, -275, -330, 50, 7), b = swag(-275, -330, 275, -330, 90, 16), c = swag(275, -330, 330, -280, 18, 3);
  if (BR) { // one sagging, half-fallen line
    wire(swag(-480, 60, -275, -330, 80, 6), '#8a7a6a', 2.5);
    bunting(swag(-275, -330, 40, -150, 120, 9), cols, 22, 'tri');
    return;
  }
  bunting(a, cols, 22, s === 1 ? 'square' : 'tri'); bunting(b, cols, 24, s === 1 ? 'square' : 'tri'); bunting(c, cols, 20, 'tri');
};

// ---- Rooftop
P.hatch = (s) => {
  const col = ['#2f4a6b', '#b08850', '#5fa89a'][s];
  rr(-62, -40, 124, 40, 4); fo('#cfc4b4');
  X.save(); X.translate(-58, -40); X.rotate(BR ? -0.04 : -0.5);
  rr(0, -12, 116, 14, 3); fo(col); ln(14, -5, 100, -5, dk(col, 0.2), 2);
  X.restore();
  if (!BR) glow(0, -46, 70, '#ffd98a', 0.5);
};
P.blankets = (s) => {
  const cols = [['#c0583c', '#2f6f5a', '#f4d27a'], ['#f6ead4', '#e9dccb', '#ffffff'], ['#e8846f', '#8fcfb5', '#f4d27a', '#b9a3d6']][s];
  shadow(0, 0, 60, 7);
  // wicker basket
  rr(-56, -50, 112, 50, 8); fo('#c9a06a'); X.save(); rr(-56, -50, 112, 50, 8); X.clip(); for (let y = -46; y < 0; y += 8) ln(-60, y, 60, y, '#a5793f', 2); for (let x = -50; x < 60; x += 12) ln(x, -50, x, 0, '#b08850', 1.5); X.restore(); rr(-56, -50, 112, 50, 8); out(3.5);
  if (BR) { rr(-44, -66, 88, 20, 8); fo('#cfc4b4', 3); return; }
  for (let i = 0; i < 3; i++) {
    rr(-48 + i * 4, -72 - i * 16, 96, 22, 9); fill(cols[i % cols.length]);
    X.save(); rr(-48 + i * 4, -72 - i * 16, 96, 22, 9); X.clip();
    if (s === 0) { for (let x = -60; x < 60; x += 20) { X.fillStyle = 'rgba(255,255,255,.25)'; X.fillRect(x, -100, 6, 60); } X.fillStyle = 'rgba(0,0,0,.15)'; X.fillRect(-60, -64 - i * 16, 120, 5); }
    else if (s === 1) { for (let x = -60; x < 60; x += 9) ln(x, -100, x + 4, -40, dk(cols[i], 0.08), 2); }
    else { for (let x = -60, j = 0; x < 60; x += 24, j++) { X.fillStyle = C(cols[(i + j) % cols.length]); X.fillRect(x, -100, 24, 70); } }
    X.restore(); rr(-48 + i * 4, -72 - i * 16, 96, 22, 9); out(3);
  }
};
P.deckRail = (s) => {
  const col = ['#fbf6ec', '#a0724a', '#3d4a52'][s];
  if (s === 1) { for (let x = -470; x <= 470; x += 94) rr(x - 7, -78, 14, 80, 3), fo('#a0724a', 3); X.beginPath(); for (let x = -470; x < 470; x += 94) { X.moveTo(x, -66); X.quadraticCurveTo(x + 47, -50, x + 94, -66); X.moveTo(x, -34); X.quadraticCurveTo(x + 47, -20, x + 94, -34); } X.strokeStyle = C(OUT); X.lineWidth = 8; X.stroke(); X.strokeStyle = C('#e0c08a'); X.lineWidth = 5; X.stroke(); return; }
  if (!BR || true) {
    for (let x = -476; x <= 476; x += (s === 0 ? 28 : 56)) {
      if (BR && Math.abs(x - 112) < 40) continue;
      if (s === 0) { X.beginPath(); X.moveTo(x - 6, -2); X.quadraticCurveTo(x - 12, -26, x - 4, -40); X.lineTo(x + 4, -40); X.quadraticCurveTo(x + 12, -26, x + 6, -2); X.closePath(); fo(col, 2.5); }
      else { ln(x, 0, x, -70, col, 5); }
    }
    if (s === 2 && !BR) for (let x = -448; x < 476; x += 56) { star(x, -38, 14, 0.5); fo('#f4d27a', 2.5); }
    rr(-484, -54, 968, 14, 4); fo(col, 3.5);
    if (s === 2) rr(-484, -8, 968, 8, 3), fo(col, 3);
  }
};
P.nightPlants = (s) => {
  const fl = [['#ffffff', '#fff6dc'], ['#f6f2ff', '#e6dcf7'], ['#b9a3d6', '#eea0a8', '#9a7ab0']][s];
  for (const [x, w, h] of [[-420, 70, 90], [-330, 56, 60], [400, 76, 110], [312, 50, 56]]) {
    const b = bush(x, -h + 6, w, h * 0.9, '#4f8a5a', 5, 3.5);
    if (s === 2 && !BR) for (let i = 0; i < 4; i++) { const xx = x - w / 3 + i * w / 4.5; for (let k = 0; k < 5; k++) { el(xx, -h - k * 10, 6 - k * 0.6, 5); fill(fl[(i + k) % 3]); } }
    else flowersOn(b, fl, s === 1 ? 13 : 7, s === 1 ? 4 : 9);
    pot(x, 0, w * 0.75, h * 0.42, ['#d9825b', '#2f4a6b', '#c9b8a0'][(x > 0 ? 1 : 0) + (s === 2 ? 1 : 0)]);
    if (!BR && s === 1) glow(x, -h, 50, '#e8e0ff', 0.3);
  }
};
P.loungers = (s) => {
  if (BR) { dustSheet(-160, 0, 150, 70); dustSheet(140, 0, 150, 60); rr(-40, -46, 70, 46, 4); fo('#bdb2a4'); ln(-40, -23, 30, -23, '#8a7a6a', 2); return; }
  if (s === 0) for (const x of [-170, 120]) {
    shadow(x, 0, 90, 8);
    ln(x - 70, 0, x - 60, -30, '#a0724a', 5); ln(x + 60, 0, x + 50, -30, '#a0724a', 5);
    poly(x - 80, -30, x + 40, -30, x + 80, -100, x + 64, -106, x + 26, -44, x - 80, -44); fill('#4f9fb3');
    X.save(); poly(x - 80, -30, x + 40, -30, x + 80, -100, x + 64, -106, x + 26, -44, x - 80, -44); X.clip(); stripes(x - 90, -110, 180, 90, ['#4f9fb3', '#fff3e4'], 14); X.restore();
    poly(x - 80, -30, x + 40, -30, x + 80, -100, x + 64, -106, x + 26, -44, x - 80, -44); out(3.5);
  }
  else if (s === 1) { const cols = ['#e8846f', '#f4d27a', '#8fcfb5', '#b9a3d6', '#4f9fb3']; [[-200, 0], [-120, 6], [-40, -2], [60, 4], [150, 0]].forEach(([x, y], i) => { el(x, y - 22, 46, 24); fo(cols[i]); X.beginPath(); X.moveTo(x - 30, y - 30); X.quadraticCurveTo(x, y - 16, x + 30, y - 30); X.strokeStyle = C(dk(cols[i], 0.2)); X.lineWidth = 2.5; X.stroke(); el(x, y - 24, 4); fill(dk(cols[i], 0.25)); }); }
  else {
    // a hanging egg chair on a stand
    X.beginPath(); X.moveTo(-170, 0); X.quadraticCurveTo(-170, -240, -40, -240); X.strokeStyle = C(OUT); X.lineWidth = 12; X.stroke(); X.strokeStyle = C('#3d4a52'); X.lineWidth = 7; X.stroke();
    rr(-200, -8, 80, 10, 3); fo('#3d4a52', 3);
    ln(-40, -240, -40, -190, '#6b5040', 3);
    el(-40, -120, 60, 74); fo('#d9b27a');
    X.save(); el(-40, -120, 60, 74); X.clip(); for (let y = -200; y < -40; y += 10) ln(-110, y, 30, y + 6, '#b08850', 2); X.restore(); el(-40, -120, 60, 74); out(4);
    el(-40, -110, 42, 52); fo('#7a4e33', 3); el(-40, -88, 40, 22); fo('#f5c6c0', 3);
    shadow(110, 0, 70, 7); el(110, -20, 60, 22); fo('#8fcfb5'); el(110, -26, 50, 12); fill(lt('#8fcfb5', 0.2));
  }
};
P.deckLights = (s) => {
  const kind = ['moon', 'star', 'globe'][s], col = ['#fff1c8', '#ffe58a', '#f5c6c0'][s];
  ln(-470, 0, -470, -300, '#8a5a3b', 7); ln(470, 0, 470, -300, '#8a5a3b', 7);
  const a = swag(-470, -296, 0, -260, 60, 8), b = swag(0, -260, 470, -296, 60, 8);
  if (BR) { wire(swag(-470, -296, 300, -40, 120, 8), '#8a7a6a', 2.5); return; }
  lightString(a, kind, col, true); lightString(b, kind, col, true);
};
P.telescope = (s) => {
  const col = ['#d9a640', '#2f4a6b', '#c97a4a'][s];
  shadow(0, 0, 70, 8);
  ln(0, -110, -56, 0, '#5b4636', 6); ln(0, -110, 56, 0, '#5b4636', 6); ln(0, -110, 0, -4, '#5b4636', 6);
  X.save(); X.translate(0, -118); X.rotate(BR ? 0.25 : -0.55);
  rr(-80, -16, 160, 32, 12); fo(col);
  rr(70, -21, 22, 42, 6); fo(dk(col, 0.15), 3.5); rr(-96, -10, 20, 20, 4); fo(dk(col, 0.25), 3);
  if (s === 1 && !BR) { star(-20, 0, 7); fill('#f4d27a'); star(14, -2, 5); fill('#f4d27a'); }
  if (!BR) { X.save(); X.globalAlpha = 0.5; ln(-60, -8, 50, -8, '#ffffff', 3); X.restore(); }
  X.restore();
  el(0, -116, 12); fo('#5b4636', 3);
};
P.starChart = (s) => {
  const [bg, ink] = [['#f2e3c2', '#5b3a26'], ['#1f2d4a', '#f6e7b8'], ['#dbe7f2', '#2f4a6b']][s];
  ln(0, -170, -50, 0, '#8a5a3b', 6); ln(0, -170, 50, 0, '#8a5a3b', 6); ln(0, -170, 0, 0, '#8a5a3b', 5);
  X.save(); if (BR) X.rotate(0.05);
  rr(-74, -200, 148, 130, 5); fo('#c9a06a');
  rr(-64, -190, 128, 110, 3); fo(bg, 3);
  if (s === 2 && !BR) { X.save(); rr(-64, -190, 128, 110, 3); X.clip(); for (let i = 0; i < 7; i++) { el(-50 + R() * 100, -170 + R() * 80, 30, 20); X.fillStyle = ['rgba(185,163,214,.35)', 'rgba(143,207,181,.3)', 'rgba(245,198,192,.35)'][i % 3]; X.fill(); } X.restore(); }
  if (!BR) {
    const pts = [[-40, -160], [-14, -140], [6, -156], [30, -128], [44, -150], [-30, -110], [10, -100]];
    X.strokeStyle = C(ink); X.lineWidth = 1.6; X.beginPath(); X.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < 5; i++) X.lineTo(pts[i][0], pts[i][1]); X.moveTo(pts[1][0], pts[1][1]); X.lineTo(pts[5][0], pts[5][1]); X.lineTo(pts[6][0], pts[6][1]); X.stroke();
    for (const [x, y] of pts) { star(x, y, 5, 0.45); fill(ink); }
    X.beginPath(); X.arc(0, -135, 46, 0, TAU); X.strokeStyle = C(ink); X.globalAlpha = 0.35; X.stroke(); X.globalAlpha = 1;
  } else { X.save(); X.globalAlpha = 0.6; X.beginPath(); X.moveTo(64, -190); X.lineTo(30, -150); X.lineTo(64, -120); X.closePath(); X.fillStyle = '#efe6d8'; X.fill(); X.restore(); }
  X.restore();
};

// ---- Book 2 shared kit
function pennant(x, y, w, h, col, side = 1) { poly(x, y, x + side * w, y + h / 2, x, y + h); fo(col, 2.5); }
function bench(x, y, w, col, s) {
  shadow(x, y + 2, w * 0.55, 8);
  box(x - w / 2 + 8, y - 44, 10, 44, dk(col, 0.15), 2, 3); box(x + w / 2 - 18, y - 44, 10, 44, dk(col, 0.15), 2, 3);
  rr(x - w / 2, y - 52, w, 13, 3); fo(col);
  for (let i = 0; i < 2; i++) { rr(x - w / 2 + 4, y - 100 + i * 20, w - 8, 12, 3); fo(col, 3.5); }
  box(x - w / 2 + 2, y - 104, 10, 60, dk(col, 0.15), 2, 3); box(x + w / 2 - 12, y - 104, 10, 60, dk(col, 0.15), 2, 3);
  if (s === 2 && !BR) { ln(x - w / 2 + 16, y - 70, x + w / 2 - 16, y - 70, lt(col, 0.3), 2); }
}
function crate(x, y, w, h, col) {
  rr(x - w / 2, y - h, w, h, 3); fo(col);
  X.save(); rr(x - w / 2, y - h, w, h, 3); X.clip(); ln(x - w / 2, y - h / 2, x + w / 2, y - h / 2, dk(col, 0.25), 2.5); ln(x - w / 2, y, x + w / 2, y - h, dk(col, 0.2), 4); X.restore();
}
function parcel(x, y, w, h, col) {
  rr(x - w / 2, y - h, w, h, 3); fo(col);
  ln(x, y - h, x, y, '#c0583c', 3); ln(x - w / 2, y - h / 2, x + w / 2, y - h / 2, '#c0583c', 3);
}
function hut(w, h, col, trim, s, roof) {
  shadow(0, 0, w * 0.6, 10);
  rr(-w / 2 - 6, -10, w + 12, 14, 2); fo('#c9a06a', 3);
  rr(-w / 2, -h, w, h - 10, 2); fill(col);
  X.save(); rr(-w / 2, -h, w, h - 10, 2); X.clip(); planks(-w / 2, -h, w, h, col, 18, true); X.restore();
  rr(-w / 2, -h, w, h - 10, 2); out(4);
  poly(-w / 2 - 18, -h + 4, w / 2 + 18, -h + 4, 0, -h - w * 0.42); fo(roof);
  poly(-w / 2 - 18, -h + 4, w / 2 + 18, -h + 4, w / 2 + 10, -h - 6, -w / 2 - 10, -h - 6); fill(trim);
  // door
  rr(-w * 0.26, -h * 0.72, w * 0.52, h * 0.72 - 10, 3); fo(BR ? '#a49a8e' : trim, 3.5);
  if (BR) { ln(-w * 0.3, -h * 0.55, w * 0.3, -h * 0.4, '#b9a080', 10); ln(-w * 0.3, -h * 0.55, w * 0.3, -h * 0.4, OUT, 2); }
  else { el(0, -h * 0.58, w * 0.1); fo('#fff6e2', 2.5); el(w * 0.18, -h * 0.36, 3.5); fill('#d9a640'); }
}

// ---- Boathouse
P.oars = (s) => {
  rr(-80, -150, 160, 12, 3); fo('#8a5a3b', 3); rr(-80, -40, 160, 12, 3); fo('#8a5a3b', 3);
  const tips = [['#d0564a', '#fff8ec'], ['#f2c64e', '#f2c64e'], ['#f5c6c0', '#bfe3d4', '#d9ccf0', '#fff1b8']][s];
  for (let i = 0; i < 5; i++) {
    if (BR && (i === 1 || i === 3)) continue;
    const x = -62 + i * 31, tilt = BR ? 0.2 : 0;
    X.save(); X.translate(x, 0); X.rotate(tilt);
    ln(0, -250, 0, -60, '#c9a06a', 7); ln(0, -250, 0, -60, OUT, 1);
    rr(-11, -60, 22, 62, 10); fo(BR ? '#c9b8a0' : (s === 2 ? tips[i % 4] : tips[0]), 3);
    if (s === 0 && !BR) { X.save(); rr(-11, -60, 22, 62, 10); X.clip(); X.fillStyle = tips[1]; X.fillRect(-12, -30, 24, 10); X.restore(); }
    X.restore();
  }
};
P.ropes = (s) => {
  const [a, b] = [['#c9a06a', '#b08850'], ['#d0564a', '#fff8ec'], ['#4f84b3', '#fff8ec']][s];
  for (const [x, r] of [[-60, 40], [30, 32], [-14, 24]]) {
    const y = x === -14 ? -54 : 0;
    if (BR && x === 30) { X.beginPath(); X.moveTo(x - 40, y); X.bezierCurveTo(x - 10, y - 40, x + 20, y + 10, x + 60, y - 10); X.strokeStyle = C(OUT); X.lineWidth = 9; X.stroke(); X.strokeStyle = C(a); X.lineWidth = 6; X.stroke(); continue; }
    el(x, y - r * 0.5, r, r * 0.5); fo(a);
    for (let k = 1; k < 4; k++) { el(x, y - r * 0.5, r * (1 - k * 0.22), r * 0.5 * (1 - k * 0.22)); X.strokeStyle = C(k % 2 ? b : dk(a, 0.2)); X.lineWidth = 3; X.stroke(); }
  }
};
P.shipLantern = (s) => {
  const glass = ['#ffe6a8', '#f08070', '#7fd0a0'][s];
  ln(-60, -60, 0, -60, '#3d3a3f', 5); ln(-60, -60, -60, -20, '#3d3a3f', 5);
  ln(0, -60, 0, -44, '#3d3a3f', 3);
  if (!BR) glow(0, -2, 110, glass, 0.45);
  rr(-24, -44, 48, 12, 4); fo('#c9a06a', 3);
  rr(-20, -32, 40, 52, 6); fo(BR ? '#d8d0c4' : glass, 3.5);
  for (const x of [-8, 8]) ln(x, -32, x, 20, '#c9a06a', 2.5);
  rr(-26, 18, 52, 12, 4); fo('#c9a06a', 3);
};
P.signalFlags = (s) => {
  ln(0, 0, 0, -500, OUT, 12); ln(0, 0, 0, -500, '#fbf6ec', 7); ln(-50, -440, 50, -440, '#fbf6ec', 5);
  el(0, -504, 9); fo('#d9a640', 3);
  if (BR) { wire(swag(0, -440, 60, -80, 40, 3), '#8a7a6a', 2.5); return; }
  const sets = [[['#d0564a', '#ffffff'], ['#2f4a6b', '#f4d27a'], ['#f4d27a', '#d0564a'], ['#ffffff', '#4f84b3'], ['#2f6f5a', '#ffffff']],
    [['#f5c6c0', '#fff8ec'], ['#bfe3d4', '#fff8ec'], ['#d9ccf0', '#fff1b8'], ['#fff1b8', '#f5c6c0'], ['#bfe3d4', '#d9ccf0']],
    [['#e8846f', '#f4d27a'], ['#f2a33a', '#fff1b8'], ['#d0564a', '#f2a33a'], ['#b9a3d6', '#e8846f'], ['#f4d27a', '#b9a3d6']]][s];
  ln(46, -440, 46, -60, '#6b5040', 2);
  sets.forEach(([a, b], i) => {
    const y = -420 + i * 70;
    rr(48, y, 56, 50, 2); fill(a); X.save(); rr(48, y, 56, 50, 2); X.clip(); X.fillStyle = C(b);
    if (i % 3 === 0) X.fillRect(48, y + 17, 56, 16); else if (i % 3 === 1) X.fillRect(62, y + 12, 28, 26); else { poly(48, y, 104, y + 50, 48, y + 50); X.fill(); }
    X.restore(); rr(48, y, 56, 50, 2); out(3);
  });
};
P.boathouseDoors = (s) => {
  const col = ['#b5453a', '#2f4a6b', '#3f8f7a'][s];
  if (BR) {
    rr(-130, -300, 260, 300, 4); fo('#a49a8e');
    planks(-126, -296, 252, 292, '#a49a8e', 26, true); rr(-130, -300, 260, 300, 4); out(4);
    ln(-130, -200, 130, -140, '#b9a080', 16); ln(-130, -200, 130, -140, OUT, 2); ln(-130, -90, 130, -120, '#b9a080', 16);
    return;
  }
  rr(-130, -300, 260, 300, 4); fo('#4a3428'); // dark inside
  glow(0, -60, 140, '#ffcf8a', 0.25);
  for (const side of [-1, 1]) {
    X.save(); X.translate(side * 130, 0);
    poly(0, -300, side * 60, -290, side * 60, 8, 0, 0); fill(col);
    X.save(); X.clip(); for (let k = 0; k < 4; k++) ln(side * 15 * k, -300, side * 15 * k, 8, dk(col, 0.25), 2); X.restore();
    poly(0, -300, side * 60, -290, side * 60, 8, 0, 0); out(4);
    ln(0, -260, side * 60, -248, '#fbf6ec', 5); ln(0, -40, side * 60, -32, '#fbf6ec', 5);
    X.restore();
  }
  // the boat silhouette waiting inside
  X.beginPath(); X.moveTo(-90, -70); X.quadraticCurveTo(0, -10, 90, -70); X.closePath(); fill('#6b4a3a');
};
P.slipway = (s) => {
  const shape = () => poly(-110, 0, 110, 0, 150, 340, -150, 340);
  shape(); fill(['#a9a39a', '#b07a4f', '#bfb4a4'][s]);
  X.save(); shape(); X.clip();
  if (s === 0) for (let y = 0; y < 340; y += 22) for (let x = -160 + ((y / 22) % 2) * 18; x < 160; x += 36) { rr(x, y, 34, 20, 3); X.fillStyle = C(['#b9b3aa', '#a39d94', '#c4beb4'][(x + y) & 3 ? 0 : 1]); X.fill(); X.strokeStyle = C('#8a847c'); X.lineWidth = 1.5; X.stroke(); }
  else if (s === 1) { planks(-160, 0, 320, 340, '#b07a4f', 30); for (const x of [-60, 60]) { X.fillStyle = C('#7a6a5a'); X.fillRect(x - 6, 0, 12, 340); } }
  else for (let i = 0; i < 90; i++) { el(-150 + R() * 300, R() * 340, 12 + R() * 6, 9); X.fillStyle = C(['#cfc4b4', '#b9ad9c', '#d9d0c2'][i % 3]); X.fill(); X.strokeStyle = C('#8a7a6a'); X.lineWidth = 1.5; X.stroke(); }
  if (BR) { for (let i = 0; i < 18; i++) { el(-120 + R() * 240, 20 + R() * 300, 8 + R() * 10, 6); X.fillStyle = C(i % 2 ? '#7a8a5a' : '#9a8a6a'); X.fill(); } }
  X.restore(); shape(); out(4);
};
P.dinghy = (s) => {
  const [hull, band2] = [['#c98a4f', '#e9c06a'], ['#fbf6ec', '#d0564a'], ['#4f84b3', '#fbf6ec']][s];
  X.save(); if (BR) X.rotate(-0.05);
  X.beginPath(); X.moveTo(-140, -64); X.quadraticCurveTo(-110, 22, 0, 24); X.quadraticCurveTo(110, 22, 150, -70); X.closePath(); fo(hull);
  X.save(); X.beginPath(); X.moveTo(-140, -64); X.quadraticCurveTo(-110, 22, 0, 24); X.quadraticCurveTo(110, 22, 150, -70); X.closePath(); X.clip();
  if (s === 0) planks(-150, -70, 300, 100, hull, 16); X.fillStyle = C(band2); X.fillRect(-160, -66, 320, 12);
  if (BR) { X.fillStyle = 'rgba(120,110,95,.35)'; for (let i = 0; i < 6; i++) X.fillRect(-120 + i * 40, -40 + (i % 2) * 20, 30, 14); }
  X.restore();
  X.beginPath(); X.moveTo(-140, -64); X.quadraticCurveTo(-110, 22, 0, 24); X.quadraticCurveTo(110, 22, 150, -70); X.closePath(); out(4);
  if (!BR) txt(['Wren', 'Pearl', 'Skylark'][s], 50, -24, 17, s === 1 ? '#2f4a6b' : '#fff8ec', { italic: true });
  // trailer chocks
  rr(-100, 18, 30, 14, 3); fo('#8a5a3b', 3); rr(70, 18, 30, 14, 3); fo('#8a5a3b', 3);
  X.restore();
};
P.boathouseRoof = (s) => {
  const col = ['#6f7a86', '#c9704a', '#c0483c'][s];
  const shape = () => poly(-330, 0, 330, 0, 0, -230);
  shape(); fill(BR ? '#8f8a84' : col);
  X.save(); shape(); X.clip();
  if (BR) { X.fillStyle = C('#7f97a4'); X.fillRect(-150, -120, 160, 90); X.fillStyle = C('#a8a19a'); X.fillRect(60, -70, 140, 60); }
  else if (s === 2) for (let x = -340; x < 340; x += 26) ln(x, 0, x * 0.1, -230, dk(col, 0.25), 3);
  else for (let y = -230, r = 0; y < 0; y += 22, r++) for (let x = -340 + (r % 2) * 18; x < 340; x += 36) { X.beginPath(); X.arc(x + 18, y + 18, 18, 0, Math.PI); X.strokeStyle = C(dk(col, 0.22)); X.lineWidth = 2.5; X.stroke(); }
  X.restore(); shape(); out(5);
  rr(-350, -6, 700, 14, 4); fo('#fbf6ec', 3.5);
  // a little round window in the gable
  el(0, -90, 34); fo('#fbf6ec', 3.5); el(0, -90, 24); fo(BR ? '#8a8278' : '#ffe6a8', 3); ln(-24, -90, 24, -90, '#fbf6ec', 3); ln(0, -114, 0, -66, '#fbf6ec', 3);
};

// ---- Flower stall
P.buckets = (s) => {
  const fl = [['#e8546a', '#f4d27a', '#f08aa0'], ['#f7c548', '#f2a33a'], ['#d9a0e6', '#f5c6c0', '#ffffff', '#b9a3d6']][s];
  for (let i = 0; i < 4; i++) {
    const x = -150 + i * 100;
    if (!BR) {
      for (let k = 0; k < 6; k++) { const fx = x - 26 + k * 10.4, fy = -78 - (k % 3) * 14; ln(x + (k - 2.5) * 4, -40, fx, fy, '#4f8a3a', 3);
        if (s === 1) { bloom(fx, fy, 13, fl[k % 2], '#7a4e33'); } else if (s === 0) { X.beginPath(); X.moveTo(fx - 8, fy + 6); X.lineTo(fx - 8, fy - 6); X.lineTo(fx - 3, fy - 1); X.lineTo(fx, fy - 9); X.lineTo(fx + 3, fy - 1); X.lineTo(fx + 8, fy - 6); X.lineTo(fx + 8, fy + 6); X.quadraticCurveTo(fx, fy + 12, fx - 8, fy + 6); fo(fl[(i + k) % 3], 2.5); } else { el(fx, fy, 9, 8); fo(fl[(i + k) % 4], 2); el(fx + 7, fy + 3, 7, 6); fo(fl[(i + k + 1) % 4], 2); } }
    } else { for (let k = 0; k < 3; k++) ln(x - 10 + k * 10, -40, x - 14 + k * 14, -66, '#8a7a5a', 3); }
    poly(x - 34, -44, x + 34, -44, x + 26, 0, x - 26, 0); fo('#b9c4c8');
    ln(x - 34, -44, x + 34, -44, '#9aa7ad', 5); ln(x - 30, -22, x + 30, -22, '#a9b4b8', 2);
  }
};
P.stallSign = (s) => {
  const [bg, ink] = [['#33403c', '#f6f0e4'], ['#fbf6ec', '#3f8f7a'], ['#c9a27a', '#5b3a26']][s];
  ln(-80, -70, -70, -40, '#6b5040', 2.5); ln(80, -70, 70, -40, '#6b5040', 2.5);
  X.save(); if (BR) X.rotate(0.08);
  rr(-120, -42, 240, 64, 10); fo(bg); if (s === 2) { X.save(); rr(-120, -42, 240, 64, 10); X.clip(); planks(-120, -42, 240, 64, bg, 21); X.restore(); rr(-120, -42, 240, 64, 10); out(4); }
  if (BR) { X.save(); X.globalAlpha = 0.4; txt('Flo  ers', 0, -10, 28, ink, { italic: true }); X.restore(); }
  else { txt('Fresh Flowers', 0, -12, 28, ink, { italic: true, maxW: 210 }); bloom(-100, 8, 9, '#e8846f'); bloom(100, 8, 9, '#f4d27a'); }
  X.restore();
};
P.stallCanopy = (s) => {
  const [a, b] = [['#f2a0b0', '#fff3e4'], ['#7fbf8f', '#fff3e4'], ['#c8b0e6', '#fff3e4']][s];
  const shape = () => poly(-230, 0, 230, 0, 260, 80, -260, 80);
  shape(); fill(BR ? '#c9c0b2' : a);
  if (!BR) clip(shape, () => stripes(-270, 0, 540, 90, s === 2 ? [a, a] : [a, b], 36));
  else clip(shape, () => { X.fillStyle = '#7a6a5a'; X.fillRect(-60, 20, 80, 36); });
  shape(); out(4);
  X.beginPath(); X.moveTo(-260, 80);
  for (let i = 0; i < 13; i++) X.quadraticCurveTo(-260 + (i + 0.5) * 40, 80 + (s === 2 ? 32 : 22), -260 + (i + 1) * 40, 80);
  X.closePath(); fo(BR ? '#c9c0b2' : s === 2 ? b : a);
};
P.hangingBaskets = (s) => {
  const fl = [['#d0306a', '#8a4ab0'], ['#e86aa0', '#f5c6c0', '#b05ad0'], ['#ffffff', '#fff1b8']][s];
  for (const x of [-200, 200]) {
    ln(x, 0, x - 26, 60, '#6b5040', 2); ln(x, 0, x + 26, 60, '#6b5040', 2);
    const b = BR ? bush(x, 62, 50, 20, '#9a9180', 4, 3) : bush(x, 58, 90, 60, '#5f9a5a', 6, 3.5);
    if (!BR) { for (let k = 0; k < 5; k++) { const dx = x - 36 + k * 18; ln(dx, 70, dx + 4, 100 + (k % 2) * 16, '#4f8a3a', 3); bloom(dx + 4, 102 + (k % 2) * 16, 8, fl[k % fl.length], s === 2 ? '#f4d27a' : '#fff1b8'); } flowersOn(b, fl, 9, 8); }
    X.beginPath(); X.moveTo(x - 36, 60); X.quadraticCurveTo(x, 104, x + 36, 60); X.closePath(); fo('#b08850', 3.5);
    X.save(); X.globalAlpha = 0.5; for (let k = -2; k <= 2; k++) ln(x + k * 12, 62, x + k * 8, 86, '#8a5a3b', 1.5); X.restore();
  }
};
P.flowerCart = (s) => {
  const col = ['#c0483c', '#9fc6e0', '#c9a06a'][s];
  shadow(0, 0, 140, 10);
  ln(110, -50, 190, -96, OUT, 10); ln(110, -50, 190, -96, dk(col, 0.1), 6);
  rr(-120, -96, 240, 70, 6); fo(col);
  if (s === 2) { X.save(); rr(-120, -96, 240, 70, 6); X.clip(); planks(-120, -96, 240, 70, col, 18); X.restore(); rr(-120, -96, 240, 70, 6); out(4); }
  else { ln(-110, -60, 110, -60, lt(col, 0.3), 3); }
  if (!BR) { const b = bush(0, -100, 220, 60, '#5f9a5a', 8, 3.5); flowersOn(b, ['#e8846f', '#f4d27a', '#f5c6c0', '#ffffff', '#b9a3d6'], 11, 16); }
  // wheels: broken one lies flat
  for (const x of BR ? [-70] : [-70, 70]) { el(x, -26, 30); fo('#8a5a3b', 4); el(x, -26, 24); fo('#fbf6ec', 3); for (let k = 0; k < 6; k++) ln(x, -26, x + Math.cos(k * 1.05) * 22, -26 + Math.sin(k * 1.05) * 22, '#8a5a3b', 3); el(x, -26, 6); fo('#8a5a3b', 2); }
  if (BR) { X.save(); X.translate(90, -6); X.scale(1, 0.35); el(0, 0, 30); fo('#9a8a7a', 4); X.restore(); rr(56, -36, 20, 36, 3); fo('#8a7a6a', 3); }
};
P.flowerBike = (s) => {
  const col = ['#8fcfb5', '#f1e4c8', '#c0483c'][s];
  shadow(0, 0, 120, 9);
  for (const x of [-80, 80]) { el(x, -48, 46); X.strokeStyle = C(OUT); X.lineWidth = 9; X.stroke(); X.strokeStyle = C('#3d3a3f'); X.lineWidth = 6; X.stroke(); for (let k = 0; k < 8; k++) ln(x, -48, x + Math.cos(k * 0.785) * 42, -48 + Math.sin(k * 0.785) * 42, '#b9b3aa', 1.5); }
  X.beginPath(); X.moveTo(-80, -48); X.lineTo(-20, -48); X.lineTo(30, -120); X.lineTo(-40, -120); X.closePath(); X.moveTo(-20, -48); X.lineTo(-48, -134); X.moveTo(80, -48); X.lineTo(44, -150);
  X.strokeStyle = C(OUT); X.lineWidth = 11; X.stroke(); X.strokeStyle = C(col); X.lineWidth = 7; X.stroke();
  rr(-66, -146, 40, 12, 6); fo('#5b4636', 3); ln(30, -152, 62, -156, '#3d3a3f', 6);
  // front basket
  rr(56, -176, 80, 46, 6); fo('#c9a06a'); X.save(); rr(56, -176, 80, 46, 6); X.clip(); for (let x = 56; x < 140; x += 10) ln(x, -176, x + 4, -130, '#a5793f', 2); X.restore(); rr(56, -176, 80, 46, 6); out(3.5);
  if (!BR) { const b = bush(96, -180, 90, 50, '#5f9a5a', 5, 3); flowersOn(b, ['#e8846f', '#f4d27a', '#f5c6c0', '#b9a3d6'], 10, 9); const b2 = bush(-46, -146, 60, 30, '#5f9a5a', 4, 3); flowersOn(b2, ['#ffffff', '#f5c6c0'], 8, 5); }
  else { X.save(); X.globalAlpha = 0.7; for (let i = 0; i < 6; i++) ln(60 + i * 12, -176, 70 + i * 10, -200, '#8a7a5a', 2.5); X.restore(); }
};
P.wreaths = (s) => {
  for (const x of [-280, 0, 280]) {
    ln(x, -60, x, -40, '#6b5040', 2.5);
    el(x, 0, 46); X.strokeStyle = C(OUT); X.lineWidth = 26; X.stroke();
    X.strokeStyle = C(BR ? '#a49a8e' : ['#d9c9b4', '#b9a3d6', '#7a8a5a'][s]); X.lineWidth = 20; X.stroke();
    if (!BR) for (let k = 0; k < 12; k++) {
      const a = k * TAU / 12, px = x + Math.cos(a) * 46, py = Math.sin(a) * 46;
      if (s === 0) { X.beginPath(); X.moveTo(px, py + 6); X.arc(px, py, 8, Math.PI * 1.1, Math.PI * 1.9); X.closePath(); fo(['#fff3e4', '#f5c6c0', '#f2e3c2'][k % 3], 2); }
      else if (s === 1) { el(px, py, 3.5, 7); fill(k % 2 ? '#8a6ab8' : '#a98bd6'); }
      else { el(px, py, 6); fo('#d0483a', 2); }
    }
    if (!BR) { poly(x - 18, 40, x + 18, 40, x + 10, 60, x, 46, x - 10, 60); fo(['#f2a0b0', '#fbf6ec', '#c0483c'][s], 2.5); }
  }
};
P.pottingTable = (s) => {
  shadow(0, 0, 210, 10);
  rr(-200, -96, 400, 18, 4); fo('#b07a4f'); box(-190, -80, 14, 80, '#8a5a3b', 2, 3); box(176, -80, 14, 80, '#8a5a3b', 2, 3);
  rr(-190, -36, 380, 10, 3); fo('#8a5a3b', 3);
  if (BR) { X.save(); X.translate(-60, -96); X.rotate(-0.5); pot(0, 0, 36, 28, '#b9ab9b'); X.restore(); return; }
  for (let i = 0; i < 6; i++) {
    const x = -160 + i * 64, y = -96;
    const b = bush(x, y - 40, 50, 46, i % 2 ? '#6a9f50' : '#5f9a5a', 4, 3);
    flowersOn(b, [['#e8846f', '#f4d27a'], ['#ffffff', '#9fc6e0'], ['#f5c6c0', '#b9a3d6']][s], 7, 3);
    if (s === 0) pot(x, y, 42, 34, '#d9825b');
    else if (s === 1) { rr(x - 18, y - 36, 36, 36, 6); fo(['#fbf6ec', '#9fc6e0', '#f2a0b0'][i % 3], 3); X.beginPath(); X.arc(x + 18, y - 20, 9, -1.3, 1.3); X.strokeStyle = C(OUT); X.lineWidth = 3; X.stroke(); }
    else { rr(x - 16, y - 38, 32, 38, 5); fill('#d6ecec'); X.save(); X.globalAlpha = 0.6; X.fill(); X.restore(); out(3); rr(x - 18, y - 42, 36, 8, 2); fo('#d9b27a', 2); }
  }
};

// ---- Beach huts
P.boardwalk = (s) => {
  const col = ['#efe5d4', '#c4b29a', '#8fbfdc'][s];
  rr(-460, 0, 920, 30, 3); fill(col);
  X.save(); rr(-460, 0, 920, 30, 3); X.clip();
  for (let x = -460, i = 0; x < 460; x += 24, i++) { X.fillStyle = C(i % 4 === 0 ? dk(col, 0.06) : col); X.fillRect(x, 0, 24, 30); ln(x, 0, x, 30, dk(col, 0.25), 2); }
  if (BR) { for (let i = 0; i < 9; i++) { el(-420 + i * 100 + R() * 40, 18, 50, 12); X.fillStyle = '#e6cf9e'; X.fill(); } }
  X.restore(); rr(-460, 0, 920, 30, 3); out(4);
};
P.windbreak = (s) => {
  const cols = [['#e8546a', '#fff3e4'], ['#4f84b3', '#fff3e4'], ['#f2c64e', '#f2a33a']][s];
  for (let i = 0; i < 4; i++) ln(-120 + i * 80, 10, -120 + i * 80, -110, '#a0724a', 6);
  if (BR) { X.save(); X.translate(-120, -10); X.rotate(0.6); rr(0, -40, 160, 40, 2); fo('#cfc4b4', 3); X.restore(); return; }
  for (let i = 0; i < 3; i++) {
    const x = -120 + i * 80;
    X.beginPath(); X.moveTo(x, -100); X.quadraticCurveTo(x + 40, -94, x + 80, -100); X.lineTo(x + 80, -10); X.quadraticCurveTo(x + 40, -4, x, -10); X.closePath();
    fill(cols[0]); X.save(); X.clip(); stripes(x, -110, 80, 110, cols, 16); X.restore();
    X.beginPath(); X.moveTo(x, -100); X.quadraticCurveTo(x + 40, -94, x + 80, -100); X.lineTo(x + 80, -10); X.quadraticCurveTo(x + 40, -4, x, -10); X.closePath(); out(3.5);
  }
};
function hutPainter(cols) { return (s) => { const [c, t] = cols[s]; hut(180, 290, c, t, s, BR ? '#9a9088' : t); }; }
P.hut1 = hutPainter([['#9fd8c4', '#fbf6ec'], ['#f29a86', '#fbf6ec'], ['#f6dd7a', '#fbf6ec']]);
P.hut2 = hutPainter([['#9cc8ec', '#fbf6ec'], ['#c9b0e6', '#fbf6ec'], ['#f7c3a0', '#fbf6ec']]);
P.hut3 = hutPainter([['#7fc0a8', '#fbf6ec'], ['#f2b0be', '#fbf6ec'], ['#fbf3dc', '#2f4a6b']]);
P.deckchairs = (s) => {
  const sets = [['#d0483a', '#f4d27a', '#4f84b3'], ['#f5c6c0', '#bfe3d4', '#fff1b8'], ['#2f4a6b', '#2f4a6b', '#2f4a6b']][s];
  [-200, 0, 200].forEach((x, i) => {
    if (BR) { X.save(); X.translate(x, 0); X.rotate(-1.2 + i * 0.1); ln(-50, 0, 50, 0, '#a89a8a', 6); ln(-40, 10, 40, 10, '#a89a8a', 6); X.restore(); return; }
    shadow(x, 0, 44, 8);
    ln(x - 34, 0, x + 26, -104, '#a0724a', 6); ln(x + 34, 0, x - 4, -62, '#a0724a', 6);
    const sh = () => poly(x - 24, -12, x + 18, -100, x + 38, -96, x + 2, -6);
    sh(); fill(sets[i]); X.save(); sh(); X.clip(); stripes(x - 30, -110, 80, 110, [sets[i], '#fff3e4'], 10); X.restore(); sh(); out(3.5);
  });
};
P.hutBunting = (s) => {
  const cols = [['#f5c6c0', '#bfe3d4', '#fff1b8', '#d9ccf0'], ['#e8846f', '#4f9fb3', '#f4d27a'], ['#e8846f', '#f2a33a', '#f4d27a', '#d0564a']][s];
  if (BR) { wire(swag(-300, 0, 0, 0, 30, 5), '#8a7a6a', 2.5); wire(swag(0, 0, 60, 130, 20, 4), '#8a7a6a', 2.5); return; }
  bunting(swag(-300, 0, 0, 0, 60, 8), cols, 22, s === 1 ? 'round' : 'tri');
  bunting(swag(0, 0, 300, 0, 60, 8), cols, 22, s === 1 ? 'round' : 'tri');
  if (s === 1) for (const p of swag(-300, 0, 300, 0, 0, 16)) void p;
};
P.parasols = (s) => {
  const [a, b] = [['#fbf3dc', '#f2e3c2'], ['#4f9fb3', '#fff3e4'], ['#f2a0b0', '#fff3e4']][s];
  for (const [x, h, tilt] of [[-60, 220, -0.12], [70, 180, 0.1]]) {
    X.save(); X.translate(x, 0); X.rotate(BR ? tilt * 4 : tilt);
    ln(0, 0, 0, -h, '#a0724a', 6);
    if (BR) { X.beginPath(); X.moveTo(0, -h); X.lineTo(-18, -h + 90); X.lineTo(18, -h + 90); X.closePath(); fo('#cfc4b4', 3); X.restore(); continue; }
    const sh = () => { X.beginPath(); X.moveTo(-110, -h + 40); X.quadraticCurveTo(0, -h - 50, 110, -h + 40); X.closePath(); };
    sh(); fill(a); X.save(); sh(); X.clip(); for (let k = -5; k <= 5; k++) if (k % 2 === 0) { poly(0, -h - 20, k * 22 - 11, -h + 50, k * 22 + 11, -h + 50); X.fillStyle = C(b); X.fill(); } X.restore(); sh(); out(4);
    X.beginPath(); X.moveTo(-110, -h + 40);
    for (let k = 0; k < 10; k++) { if (s === 0) { X.lineTo(-110 + k * 22 + 11, -h + 54); X.lineTo(-110 + (k + 1) * 22, -h + 40); } else X.quadraticCurveTo(-110 + k * 22 + 11, -h + 56, -110 + (k + 1) * 22, -h + 40); }
    X.closePath(); fo(s === 0 ? '#e9c48a' : a, 3);
    el(0, -h - 6, 5); fo('#c9a06a', 2);
    X.restore();
  }
};

// ---- Lighthouse
P.rockPath = (s) => {
  if (BR) { for (let i = 0; i < 10; i++) { el(-40 + R() * 80, 10 + i * 18, 16, 7); fo('#a89a8a', 2.5); } return; }
  const sh = () => poly(-30, 0, 30, 0, 70, 190, -70, 190);
  if (s === 0) { sh(); fo('#e9e1d2', 3); X.save(); sh(); X.clip(); for (let i = 0; i < 160; i++) { el(-70 + R() * 140, R() * 190, 2.5, 2); X.fillStyle = C('#c9bba6'); X.fill(); } X.restore(); }
  else if (s === 1) for (let i = 0; i < 7; i++) { const t = i / 6, y = 12 + t * 168, w = 26 + t * 30; poly(-w, y - 10, w * 0.9, y - 12, w, y + 9, -w * 0.8, y + 11); fo(['#c4bdb2', '#b5ada2', '#cfc8bd'][i % 3], 3); }
  else { sh(); fo('#c98a4f', 3); X.save(); sh(); X.clip(); for (let y = 0; y < 200; y += 18) ln(-80, y, 80, y, '#9a6a44', 2.5); X.restore(); }
};
P.keeperDoor = (s) => {
  const col = ['#c0483c', '#3f7fa6', '#3f8f6a'][s];
  X.beginPath(); X.moveTo(-40, 0); X.lineTo(-40, -100); X.arc(0, -100, 40, Math.PI, 0); X.lineTo(40, 0); X.closePath(); fo(BR ? '#9d958a' : col);
  if (!BR) { rr(-26, -110, 52, 40, 4); fo(dk(col, 0.1), 3); rr(-26, -60, 52, 50, 4); fo(dk(col, 0.1), 3); el(26, -44, 4.5); fo('#d9a640', 2); el(0, -126, 12); fo('#ffe6a8', 3); }
  else { ln(-40, -80, 40, -60, '#b9a080', 10); ln(-40, -80, 40, -60, OUT, 2); }
};
P.seaPinks = (s) => {
  const fl = [['#f290b8', '#f5b6cf'], ['#ffffff', '#f5eedd'], ['#c8d8a0', '#e0e8b0']][s];
  for (const [x, y, w] of [[-260, 0, 90], [-150, 30, 70], [150, 20, 80], [270, -4, 100], [-40, 50, 60]]) {
    if (BR) { bush(x, y, w * 0.5, 14, '#9a9a80', 3, 3); continue; }
    const b = bush(x, y - 10, w, 30, s === 2 ? '#8ab060' : '#6a8a50', 5, 3);
    if (s === 2) continue;
    for (let i = 0; i < 7; i++) { const [bx, by, br] = b[i % b.length]; el(bx + (R() - 0.5) * br, by - br * 0.7 - R() * 6, 7, 7); fo(fl[i % 2], 2); }
  }
};
P.weathervane = (s) => {
  ln(0, 0, 0, -120, '#3d3a3f', 5); ln(-30, -70, 30, -70, '#3d3a3f', 3); ln(0, -100, 0, -40, '#3d3a3f', 3);
  txt('N', 0, -30, 14, '#3d3a3f', { font: ROUND });
  X.save(); X.translate(0, -130); if (BR) X.rotate(0.5);
  const col = '#d9a640';
  if (s === 0) { X.beginPath(); X.moveTo(-40, 6); X.quadraticCurveTo(0, 22, 40, 6); X.closePath(); fo(col, 3); poly(-4, 4, -4, -44, 26, 2); fo(col, 3); }
  else if (s === 1) { X.beginPath(); X.moveTo(-40, 0); X.quadraticCurveTo(0, -30, 30, 0); X.quadraticCurveTo(0, 24, -40, 0); fo(col, 3); poly(28, 0, 50, -16, 50, 16); fo(col, 3); }
  else { X.beginPath(); X.moveTo(-46, -6); X.quadraticCurveTo(-20, -24, 0, -4); X.quadraticCurveTo(20, -24, 46, -6); X.quadraticCurveTo(20, -10, 0, 6); X.quadraticCurveTo(-20, -10, -46, -6); fo(col, 3); }
  X.restore();
};
P.cottage = (s) => {
  const col = ['#fbf6ec', '#f6d4cc', '#f8eaa8'][s];
  shadow(0, 0, 170, 12);
  rr(-150, -200, 300, 200, 4); fo(col);
  X.save(); rr(-150, -200, 300, 200, 4); X.clip(); speckle(-150, -200, 300, 200, '#c9b8a0', 120, 4, 0.2); X.restore();
  poly(-176, -194, 176, -194, 120, -300, -120, -300); fo('#6f7a86');
  X.save(); poly(-176, -194, 176, -194, 120, -300, -120, -300); X.clip(); for (let y = -300; y < -194; y += 18) ln(-180, y, 180, y, '#5f6a76', 2); X.restore();
  rr(80, -340, 34, 60, 3); fo('#c9b8a0', 3.5);
  for (const x of [-90, 70]) { rr(x - 34, -150, 68, 70, 4); fo('#fbf6ec', 3.5); rr(x - 26, -142, 52, 54, 2); fo(BR ? '#8a8278' : '#ffe6a8', 3); if (!BR) glow(x, -116, 60, '#ffd98a', 0.3); ln(x, -142, x, -88, '#fbf6ec', 3); ln(x - 26, -115, x + 26, -115, '#fbf6ec', 3); rr(x - 38, -82, 76, 12, 3); fo('#fbf6ec', 3); if (!BR) { const b = bush(x, -84, 70, 22, '#5f9a5a', 4, 3); flowersOn(b, ['#e8846f', '#f5c6c0'], 6, 6); } }
  rr(-20, -110, 40, 110, 3); fo(BR ? '#9d958a' : '#6f9fd8', 3.5);
  if (BR) { X.save(); X.globalAlpha = 0.5; for (let i = 0; i < 8; i++) { el(-140 + R() * 280, -190 + R() * 180, 12, 8); fill('#b9ad9c'); } X.restore(); }
};
P.lighthouseTower = (s) => {
  const [a, b] = [['#fbf6ec', '#c8463c'], ['#fbf6ec', '#3f6fa6'], ['#f6efd8', '#3f8f6a']][s];
  const sh = () => poly(-80, 0, 80, 0, 56, -560, -56, -560);
  sh(); fill(BR ? '#e2dbd0' : a);
  X.save(); sh(); X.clip();
  if (!BR) for (let y = -560; y < 0; y += 140) { X.fillStyle = C(b); X.fillRect(-90, y, 180, 70); }
  else { X.fillStyle = 'rgba(160,80,70,.25)'; X.fillRect(-90, -420, 180, 70); X.fillRect(-90, -140, 180, 70); speckle(-90, -560, 180, 560, '#8a7a6a', 200, 6, 0.25); }
  X.fillStyle = 'rgba(80,40,20,.10)'; X.fillRect(20, -560, 70, 560);
  X.restore(); sh(); out(5);
  for (const y of [-200, -380]) { rr(-14, y - 26, 28, 40, 12); fo('#3d4a52', 3); if (!BR) { rr(-9, y - 20, 18, 28, 8); fill('#ffe6a8'); } }
  // gallery
  rr(-90, -580, 180, 22, 4); fo('#3d3a3f');
  for (let x = -80; x <= 80; x += 20) ln(x, -580, x, -610, '#3d3a3f', 3); ln(-88, -610, 88, -610, '#3d3a3f', 4);
};
P.beacon = (s) => {
  const glassC = ['#ffe28a', '#fff6e2', '#f7b8c0'][s];
  if (!BR) glow(0, -50, 170, glassC, 0.55);
  rr(-50, -96, 100, 92, 6); fo(BR ? '#bdb6ac' : glassC);
  for (const x of [-25, 0, 25]) ln(x, -96, x, -4, '#3d3a3f', 3);
  if (!BR) { el(0, -50, 22); fill('#ffffff'); }
  X.beginPath(); X.moveTo(-60, -94); X.quadraticCurveTo(0, -160, 60, -94); X.closePath(); fo('#c8463c');
  ln(0, -140, 0, -170, '#3d3a3f', 4); el(0, -172, 7); fo('#d9a640', 2.5);
};
P.pointBench = (s) => {
  if (s === 2 && !BR) { shadow(0, 2, 100, 9); rr(-100, -50, 200, 22, 6); fo('#c9c2b6'); rr(-80, -28, 30, 28, 4); fo('#b5ada2'); rr(50, -28, 30, 28, 4); fo('#b5ada2'); rr(-96, -100, 192, 46, 10); fo('#c9c2b6'); txt('Rest awhile', 0, -77, 18, '#7a6a5a', { italic: true }); return; }
  bench(0, 0, 200, ['#b07a4f', '#4f84b3', '#b07a4f'][s], s);
};

// ---- Bandstand
P.bandSteps = (s) => {
  const col = ['#d9d0c2', '#fbf6ec', '#c0583c'][s];
  for (let i = 0; i < 3; i++) { const w = 120 + i * 26, y = -54 + i * 18; rr(-w / 2, y, w, 19, 3); fo(i ? dk(col, 0.06 * i) : col, 3.5);
    if (s === 2 && !BR) { X.save(); rr(-w / 2, y, w, 19, 3); X.clip(); for (let x = -w / 2; x < w / 2; x += 20) ln(x, y, x, y + 19, '#e9c9a0', 1.5); X.restore(); } }
  if (BR) { ln(-30, -50, -10, -36, '#7a6a5a', 2.5); }
};
P.musicStands = (s) => {
  const col = ['#d9a640', '#3d3a3f', '#a0724a'][s];
  for (const x of [-120, -40, 40, 120]) {
    if (BR && (x === -40 || x === 120)) { X.save(); X.translate(x, -4); X.rotate(1.4); ln(0, 0, 0, -70, col, 4); X.restore(); continue; }
    ln(x, 0, x, -76, col, 4); ln(x - 18, 0, x, -16, col, 3); ln(x + 18, 0, x, -16, col, 3);
    poly(x - 26, -110, x + 26, -110, x + 22, -74, x - 22, -74); fo(col, 3);
    if (!BR) { rr(x - 18, -114, 36, 30, 2); fo('#fffaf0', 2); for (let k = 0; k < 3; k++) ln(x - 13, -106 + k * 8, x + 13, -106 + k * 8, '#9a8a7a', 1); }
  }
};
P.bandRails = (s) => {
  const col = ['#3f6f5a', '#fbf6ec', '#2f4a8a'][s];
  for (let x = -200; x <= 200; x += 25) { if (BR && (x === -50 || x === 100)) continue; ln(x, 0, x, -50, col, 4); }
  if (!BR) for (let x = -187; x < 200; x += 50) { el(x, -26, 9, 12); X.strokeStyle = C(col); X.lineWidth = 3; X.stroke(); }
  rr(-208, -58, 416, 10, 3); fo(BR ? '#a49a8e' : col, 3);
};
P.bandBunting = (s) => {
  const cols = [['#d0483a', '#fbf6ec', '#2f4a8a'], ['#f5c6c0', '#bfe3d4', '#fff1b8', '#d9ccf0'], ['#e3b23b', '#fbf3dc']][s];
  if (BR) { wire(swag(-240, 0, -60, 120, 20, 3), '#8a7a6a', 2.5); return; }
  bunting(swag(-240, 0, -470, 230, 40, 6), cols, 20); bunting(swag(240, 0, 470, 230, 40, 6), cols, 20);
  bunting(swag(-240, 0, 240, 0, 50, 12), cols, 20, s === 0 ? 'square' : 'tri');
  ln(-470, 230, -470, 420, '#a0724a', 6); ln(470, 230, 470, 420, '#a0724a', 6);
};
P.foldingChairs = (s) => {
  const col = ['#3f8f6a', '#e8846f', '#fbf6ec'][s];
  for (let i = 0; i < 6; i++) {
    const x = -330 + i * 132 + (i > 2 ? 0 : 0);
    if (BR && i % 2) { X.save(); X.translate(x, 0); X.rotate(-1.5); rr(-40, -10, 80, 16, 3); fo('#a89a8a', 3); X.restore(); continue; }
    shadow(x, 0, 30, 6);
    ln(x - 22, 0, x + 18, -64, '#5b4a40', 4); ln(x + 22, 0, x - 14, -48, '#5b4a40', 4);
    rr(x - 26, -50, 52, 10, 3); fo(col, 3);
    rr(x - 22, -96, 44, 34, 4); fo(col, 3);
    if (s === 1 && !BR) { X.save(); rr(x - 22, -96, 44, 34, 4); X.clip(); stripes(x - 22, -96, 44, 34, [col, '#fff3e4'], 8); X.restore(); rr(x - 22, -96, 44, 34, 4); out(3); }
    if (s === 2 && !BR) { for (let k = 0; k < 3; k++) ln(x - 18, -90 + k * 10, x + 18, -90 + k * 10, '#c9b8a0', 2); }
  }
};
P.bandRoof = (s) => {
  const [a, b] = [['#d0483a', '#fbf6ec'], ['#9fd8c4', '#fbf3dc'], ['#2f4a6b', '#e3b23b']][s];
  const sh = () => { X.beginPath(); X.moveTo(-260, 0); X.quadraticCurveTo(-120, -50, -40, -150); X.quadraticCurveTo(0, -190, 40, -150); X.quadraticCurveTo(120, -50, 260, 0); X.closePath(); };
  sh(); fill(BR ? '#a9a39a' : a);
  X.save(); sh(); X.clip();
  if (!BR) for (let k = -6; k <= 6; k += 2) { poly(0, -190, k * 44 - 22, 4, k * 44 + 22, 4); X.fillStyle = C(b); X.fill(); }
  else { X.fillStyle = '#8a8278'; X.fillRect(-100, -60, 60, 40); X.fillRect(80, -30, 50, 30); }
  X.restore(); sh(); out(5);
  X.beginPath(); X.moveTo(-260, 0); for (let k = 0; k < 13; k++) X.quadraticCurveTo(-260 + k * 40 + 20, 26, -260 + (k + 1) * 40, 0); X.closePath(); fo(BR ? '#c9c0b2' : b);
  ln(0, -186, 0, -230, '#3d3a3f', 4); if (!BR) { poly(0, -230, 36, -220, 0, -210); fo('#e3b23b', 2.5); }
};
P.bandLights = (s) => {
  const kind = ['bulb', 'star', 'lantern'][s], col = ['#ffd98a', '#ffe58a', '#f5a7a0'][s];
  if (BR) { wire(swag(-250, 0, 0, 120, 30, 6), '#8a7a6a', 2.5); return; }
  for (const [x1, x2] of [[-250, -90], [-90, 90], [90, 250]]) lightString(swag(x1, 0, x2, 0, 40, 5), kind, col, true);
};
P.flowerRing = (s) => {
  const fl = [['#d0303a', '#e8546a'], ['#4f6fd8', '#7f9ff0', '#ffffff'], ['#e8846f', '#f4d27a', '#b9a3d6', '#ffffff']][s];
  for (const side of [-1, 1]) {
    const cx = side * 190;
    const b = BR ? bush(cx, 0, 120, 24, '#9a9a80', 5, 3.5) : bush(cx, -6, 150, 50, '#5f9a5a', 7, 3.5);
    flowersOn(b, fl, s === 1 ? 7 : 9, 16);
  }
};

// ---- Ferry dock
P.dockBell = (s) => {
  const col = ['#e3b23b', '#b07a3a', '#c9ccd2'][s];
  ln(0, 0, 0, -170, OUT, 12); ln(0, 0, 0, -170, '#8a5a3b', 8); ln(0, -170, 50, -170, '#8a5a3b', 7);
  ln(50, -170, 50, -156, '#3d3a3f', 3);
  X.save(); X.translate(50, -156); if (BR) X.rotate(0.25);
  X.beginPath(); X.moveTo(-14, 0); X.quadraticCurveTo(-16, 30, -28, 46); X.lineTo(28, 46); X.quadraticCurveTo(16, 30, 14, 0); X.closePath(); fo(BR ? '#9a9a90' : col);
  if (!BR) { X.save(); X.globalAlpha = 0.5; ln(-8, 8, -16, 38, '#ffffff', 3); X.restore(); }
  el(0, 50, 6); fo('#3d3a3f', 2);
  X.restore();
};
P.timetable = (s) => {
  const [bg, ink] = [['#33403c', '#f6f0e4'], ['#fbf6ec', '#2f4a6b'], ['#c9a27a', '#5b3a26']][s];
  ln(-60, 0, -60, -150, '#6b5040', 7); ln(60, 0, 60, -150, '#6b5040', 7);
  X.save(); if (BR) X.rotate(-0.04);
  rr(-90, -250, 180, 130, 8); fo(bg); if (s === 1) { rr(-82, -242, 164, 114, 6); X.strokeStyle = C('#2f4a6b'); X.lineWidth = 3; X.stroke(); }
  if (BR) { X.save(); X.globalAlpha = 0.3; txt('Ferr', 0, -220, 20, ink); X.restore(); }
  else { txt('Island Ferry', 0, -224, 20, ink, { italic: true }); [['10:00', 'Gull Isle'], ['13:30', 'Puffin Rock'], ['16:00', 'Gull Isle']].forEach(([a, b], i) => { txt(a, -70, -194 + i * 22, 13, ink, { font: ROUND, weight: 500, align: 'left' }); txt(b, 70, -194 + i * 22, 13, ink, { font: ROUND, weight: 500, align: 'right' }); }); }
  X.restore();
};
P.dockBenches = (s) => {
  const col = ['#b07a4f', '#3f6f5a', '#3f7fa6'][s];
  for (const x of [-130, 130]) { if (BR && x > 0) { dustSheet(x, 0, 200, 70); continue; } bench(x, 0, 200, col, s); }
};
P.dockLamps = (s) => {
  const ss = s === 2 ? 2 : s === 1 ? 1 : 0;
  for (const x of [-230, 230]) { if (BR && x < 0) { X.save(); X.translate(x, 0); X.rotate(-0.07); lampPost(0, 0, 250, ss, false); X.restore(); continue; } lampPost(x, 0, 250, ss, !BR); }
};
P.parcels = (s) => {
  if (BR) { parcel(-30, 0, 70, 40, '#c9bba6'); X.save(); X.translate(40, 0); X.rotate(0.3); parcel(0, 0, 50, 30, '#c9bba6'); X.restore(); return; }
  if (s === 0) { parcel(-70, 0, 90, 60, '#d9b27a'); parcel(30, 0, 100, 50, '#c99a5f'); parcel(-30, -60, 80, 50, '#e0bf8a'); parcel(40, -50, 60, 40, '#d9b27a'); }
  else if (s === 1) { crate(-60, 0, 100, 80, '#c98a4f'); crate(50, 0, 90, 70, '#b07a4f'); crate(-10, -80, 80, 60, '#d99a5f'); }
  else for (const [x, y, w] of [[-70, 0, 100], [50, 0, 100], [-10, -64, 100]]) { rr(x - w / 2, y - 60, w, 60, 8); fo('#d9b27a'); X.save(); rr(x - w / 2, y - 60, w, 60, 8); X.clip(); for (let k = 0; k < 12; k++) ln(x - w / 2 + k * 9, y - 60, x - w / 2 + k * 9 + 6, y, '#b08850', 2); X.restore(); rr(x - w / 2, y - 60, w, 60, 8); out(3.5); X.beginPath(); X.arc(x, y - 60, 22, Math.PI, 0); X.strokeStyle = C('#8a5a3b'); X.lineWidth = 5; X.stroke(); X.save(); rr(x - w / 2, y - 40, w, 12, 0); X.clip(); stripes(x - w / 2, y - 40, w, 12, ['#d0483a', '#fff3e4'], 8); X.restore(); }
};
P.ticketBooth = (s) => {
  const [a, b] = [['#c8463c', '#fbf3dc'], ['#3f6fa6', '#fbf6ec'], ['#3f8f6a', '#e3b23b']][s];
  shadow(0, 0, 120, 10);
  rr(-100, -230, 200, 230, 6); fo(BR ? '#bdb2a4' : b);
  X.save(); rr(-100, -230, 200, 230, 6); X.clip(); if (!BR) { X.fillStyle = C(a); X.fillRect(-100, -80, 200, 80); } planks(-100, -80, 200, 80, BR ? '#a89a8a' : a, 20, true); X.restore(); rr(-100, -230, 200, 230, 6); out(4);
  rr(-66, -190, 132, 90, 6); fo(BR ? '#9a9080' : '#fff1d6');
  if (BR) for (let i = 0; i < 4; i++) ln(-66, -180 + i * 22, 66, -180 + i * 22, '#7a6a5a', 3); else glow(0, -140, 80, '#ffd98a', 0.35);
  rr(-76, -104, 152, 12, 3); fo('#c98a4f', 3);
  X.beginPath(); X.moveTo(-120, -228); X.quadraticCurveTo(0, -300, 120, -228); X.closePath(); fo(BR ? '#9a9088' : a);
  txt('TICKETS', 0, -248, 20, BR ? '#7a6a5a' : b, { font: ROUND, weight: 700 });
};
P.gangway = (s) => {
  const col = ['#fbf6ec', '#c9a06a', '#b07a4f'][s];
  X.save(); if (BR) X.rotate(0.08);
  poly(-30, -10, 230, 70, 230, 92, -30, 12); fo('#c98a4f');
  if (s === 1) { X.beginPath(); for (let k = 0; k <= 4; k++) { X.moveTo(-30 + k * 65, -60 + k * 20); X.lineTo(-30 + k * 65, -10 + k * 20); } X.strokeStyle = C('#8a5a3b'); X.lineWidth = 5; X.stroke(); X.beginPath(); X.moveTo(-30, -60); X.quadraticCurveTo(100, -10, 230, 20); X.strokeStyle = C(OUT); X.lineWidth = 8; X.stroke(); X.strokeStyle = C(col); X.lineWidth = 5; X.stroke(); }
  else { for (let k = 0; k <= 4; k++) ln(-30 + k * 65, -50 + k * 20, -30 + k * 65, -10 + k * 20, col, 5); ln(-30, -50, 230, 30, col, 7); ln(-30, -30, 230, 50, col, 4); }
  X.restore();
};
P.ferry = (s) => {
  const [hull, cab] = [['#c8463c', '#fbf3dc'], ['#3f6fa6', '#fbf6ec'], ['#3f8f6a', '#f3e2a8']][s];
  X.save(); if (BR) X.rotate(0.03);
  // cabin + funnel
  rr(-150, -170, 240, 90, 10); fo(BR ? '#d2cbc0' : cab);
  for (let i = 0; i < 5; i++) { rr(-136 + i * 44, -150, 32, 30, 6); fo(BR ? '#9a9080' : '#bfe0e6', 3); }
  rr(40, -250, 46, 84, 6); fo(BR ? '#9a9088' : hull); if (!BR) rr(40, -236, 46, 14, 0), fill('#1f2328');
  X.beginPath(); X.moveTo(-300, -86); X.lineTo(290, -86); X.quadraticCurveTo(260, 10, 180, 20); X.lineTo(-240, 20); X.quadraticCurveTo(-290, 0, -300, -86); X.closePath(); fo(BR ? '#a9a39a' : hull);
  ln(-296, -70, 286, -70, BR ? '#cfc4b4' : '#fbf6ec', 6);
  if (BR) { X.save(); X.globalAlpha = 0.6; for (let i = 0; i < 7; i++) { el(-260 + i * 80, -30 + (i % 2) * 20, 20, 10); fill('#8a6a5a'); } X.restore(); }
  else { txt(['Puffin', 'Mermaid', 'Seaholly'][s], -80, -34, 30, '#fbf6ec', { italic: true }); for (let k = 0; k < 3; k++) { el(160 + k * 34, -40, 12); fo('#fbf6ec', 3); el(160 + k * 34, -40, 6); fill(hull); } }
  X.restore();
};

// ------------------------------------------------------------------ placement (world anchor + local box)
// box is local to the anchor; z orders props inside an area (higher = in front).
const def = (area, x, y, box, draw, z = y, live = null) => ({ area, x, y, box, draw, z, live });

export const PROPS = {
  // Terrace (x 0): facade from -400 to 500, door at 260
  steps: def('terrace', 260, 200, [-112, -56, 112, 6], P.steps, 205),
  sign: def('terrace', 0, -190, [-148, -52, 148, 46], P.sign, -100),
  awning: def('terrace', 0, -150, [-366, -6, 366, 112], P.awning, -95),
  tables: def('terrace', 0, 345, [-360, -120, 90, 20], P.tables, 345),
  chairs: def('terrace', 0, 335, [-440, -125, 175, 35], P.chairs, 344),
  planters: def('terrace', -180, 100, [-150, -60, 560, 110], P.planters, 120),
  lights: def('terrace', 0, 0, [-480, -60, 480, 400], P.lights, 400),
  door: def('terrace', 260, 150, [-78, -236, 78, 6], P.door, 100),
  // Counter (x 1000): cutaway room
  menuBoard: def('counter', 1365, -70, [-86, -100, 86, 90], P.menuBoard, -70),
  till: def('counter', 1180, 20, [-52, -82, 52, 4], P.till, 30),
  stools: def('counter', 940, 150, [-220, -116, 220, 8], P.stools, 150),
  pendants: def('counter', 940, -230, [-245, -4, 245, 150], P.pendants, 160),
  pastryCase: def('counter', 950, 20, [-112, -92, 112, 4], P.pastryCase, 30),
  espresso: def('counter', 720, 20, [-68, -140, 72, 4], P.espresso, 30),
  cupShelves: def('counter', 940, -40, [-214, -176, 214, 34], P.cupShelves, -60),
  bar: def('counter', 940, 140, [-334, -132, 334, 10], P.bar, 20),
  // Kitchen (x 2000)
  kitchenWindow: def('kitchen', 2100, -90, [-172, -114, 172, 90], P.kitchenWindow, -90),
  pans: def('kitchen', 1880, -230, [-146, -4, 146, 154], P.pans, -40),
  spiceShelf: def('kitchen', 1880, -20, [-100, -72, 100, 14], P.spiceShelf, -30),
  bakingTable: def('kitchen', 1990, 150, [-162, -100, 162, 12], P.bakingTable, 150),
  bread: def('kitchen', 1990, 54, [-114, -66, 114, 4], P.bread, 155),
  sink: def('kitchen', 2100, 110, [-124, -160, 124, 8], P.sink, 110),
  range: def('kitchen', 1660, 110, [-132, -345, 132, 10], P.range, 111),
  dresser: def('kitchen', 2360, 110, [-116, -334, 116, 10], P.dresser, 112),
  // Garden (x 3000)
  gate: def('garden', 3000, 398, [-104, -140, 104, 6], P.gate, 398),
  gardenPath: def('garden', 3000, 205, [-100, -4, 100, 194], P.gardenPath, 206),
  herbs: def('garden', 3290, 370, [-146, -110, 146, 6], P.herbs, 370),
  birdbath: def('garden', 2760, 330, [-62, -118, 62, 10], P.birdbath, 330),
  gardenBench: def('garden', 3270, 255, [-112, -118, 112, 12], P.gardenBench, 255),
  arch: def('garden', 3000, 205, [-118, -300, 118, 4], P.arch, 207),
  tree: def('garden', 2680, 210, [-160, -400, 160, 16], P.tree, 209),
  borders: def('garden', 3000, 200, [-470, -130, 470, 20], P.borders, 201),
  // Pier (x 4000): deck at y 300 over the bay
  pierBoards: def('pier', 3990, 300, [-504, -14, 504, 38], P.pierBoards, 300),
  buoys: def('pier', 4000, 334, [-420, -4, 420, 90], P.buoys, 335),
  pierLamps: def('pier', 3990, 300, [-310, -380, 310, 8], P.pierLamps, 290),
  seaScope: def('pier', 3790, 300, [-52, -124, 64, 6], P.seaScope, 296),
  pierRail: def('pier', 3990, 300, [-500, -84, 500, 4], P.pierRail, 280),
  rowboat: def('pier', 3830, 560, [-178, -100, 178, 36], P.rowboat, 560),
  teaHut: def('pier', 4320, 300, [-140, -296, 140, 10], P.teaHut, 292),
  pierFlags: def('pier', 3990, 0, [-490, -340, 340, 100], P.pierFlags, 299),
  // Rooftop (deck on the counter at y -262)
  hatch: def('rooftop', 640, -262, [-66, -80, 66, 4], P.hatch, -270),
  blankets: def('rooftop', 820, -270, [-62, -112, 62, 6], P.blankets, -268),
  deckRail: def('rooftop', 1000, -258, [-490, -82, 490, 6], P.deckRail, -200),
  nightPlants: def('rooftop', 1000, -266, [-470, -125, 480, 4], P.nightPlants, -266),
  loungers: def('rooftop', 1000, -270, [-250, -250, 210, 8], P.loungers, -269),
  deckLights: def('rooftop', 1000, -268, [-480, -320, 480, 4], P.deckLights, -264),
  telescope: def('rooftop', 1330, -270, [-104, -170, 104, 8], P.telescope, -267),
  starChart: def('rooftop', 1180, -270, [-80, -206, 80, 4], P.starChart, -268),
  // Boathouse (x 5000)
  boathouseRoof: def('boathouse', 5000, -200, [-352, -234, 352, 10], P.boathouseRoof, -200),
  boathouseDoors: def('boathouse', 5000, 200, [-192, -302, 192, 10], P.boathouseDoors, 190),
  oars: def('boathouse', 4752, 200, [-84, -256, 84, 4], P.oars, 195),
  shipLantern: def('boathouse', 5250, -90, [-64, -66, 30, 34], P.shipLantern, 0),
  signalFlags: def('boathouse', 5420, 350, [-14, -512, 106, 6], P.signalFlags, 350),
  slipway: def('boathouse', 5000, 200, [-152, -4, 152, 344], P.slipway, 200),
  dinghy: def('boathouse', 5000, 330, [-152, -74, 152, 34], P.dinghy, 330),
  ropes: def('boathouse', 4800, 380, [-104, -82, 76, 4], P.ropes, 380),
  // Flower stall (x 6000)
  wreaths: def('flowerStall', 6000, -90, [-334, -66, 334, 64], P.wreaths, -90),
  stallCanopy: def('flowerStall', 6000, 40, [-264, -4, 264, 116], P.stallCanopy, 40),
  stallSign: def('flowerStall', 6000, 0, [-124, -74, 124, 26], P.stallSign, 50),
  hangingBaskets: def('flowerStall', 6000, 116, [-240, -4, 240, 124], P.hangingBaskets, 120),
  pottingTable: def('flowerStall', 6000, 360, [-204, -150, 204, 8], P.pottingTable, 360),
  buckets: def('flowerStall', 6000, 400, [-190, -122, 190, 4], P.buckets, 398),
  flowerCart: def('flowerStall', 5640, 390, [-126, -180, 196, 6], P.flowerCart, 390),
  flowerBike: def('flowerStall', 6380, 395, [-132, -226, 140, 6], P.flowerBike, 395),
  // Beach huts (x 7000)
  boardwalk: def('beachHuts', 7000, 260, [-464, -4, 464, 34], P.boardwalk, 240),
  hut1: def('beachHuts', 6720, 250, [-112, -370, 112, 8], P.hut1, 250),
  hut2: def('beachHuts', 7000, 250, [-112, -370, 112, 8], P.hut2, 251),
  hut3: def('beachHuts', 7280, 250, [-112, -370, 112, 8], P.hut3, 252),
  hutBunting: def('beachHuts', 7000, -100, [-304, -4, 304, 96], P.hutBunting, 260),
  deckchairs: def('beachHuts', 7000, 392, [-246, -110, 246, 10], P.deckchairs, 392),
  windbreak: def('beachHuts', 6560, 382, [-130, -112, 170, 14], P.windbreak, 382),
  parasols: def('beachHuts', 7400, 400, [-180, -280, 190, 6], P.parasols, 400),
  // Lighthouse (x 8000)
  lighthouseTower: def('lighthouse', 8130, 220, [-94, -614, 94, 6], P.lighthouseTower, 200),
  beacon: def('lighthouse', 8130, -358, [-64, -178, 64, 2], P.beacon, 201),
  keeperDoor: def('lighthouse', 8130, 220, [-44, -144, 44, 4], P.keeperDoor, 230),
  cottage: def('lighthouse', 7790, 230, [-180, -344, 180, 8], P.cottage, 205),
  weathervane: def('lighthouse', 7650, -70, [-50, -180, 54, 4], P.weathervane, 206),
  rockPath: def('lighthouse', 8000, 250, [-74, -4, 74, 194], P.rockPath, 240),
  seaPinks: def('lighthouse', 8000, 330, [-360, -62, 380, 62], P.seaPinks, 330),
  pointBench: def('lighthouse', 8390, 340, [-104, -106, 104, 10], P.pointBench, 340),
  // Bandstand (x 9000)
  bandRoof: def('bandstand', 9000, -40, [-264, -236, 264, 30], P.bandRoof, -40),
  bandLights: def('bandstand', 9000, -36, [-256, -4, 256, 60], P.bandLights, -30),
  bandBunting: def('bandstand', 9000, -30, [-476, -10, 476, 424], P.bandBunting, -20),
  musicStands: def('bandstand', 9000, 248, [-150, -118, 150, 4], P.musicStands, 249),
  bandRails: def('bandstand', 9000, 250, [-212, -62, 212, 4], P.bandRails, 251),
  bandSteps: def('bandstand', 9000, 304, [-82, -58, 82, 6], P.bandSteps, 305),
  flowerRing: def('bandstand', 9000, 300, [-270, -52, 270, 22], P.flowerRing, 302),
  foldingChairs: def('bandstand', 9000, 400, [-360, -100, 360, 8], P.foldingChairs, 400),
  // Ferry dock (x 10000)
  ticketBooth: def('ferryDock', 9740, 220, [-124, -300, 124, 10], P.ticketBooth, 220),
  timetable: def('ferryDock', 9930, 220, [-94, -254, 94, 4], P.timetable, 221),
  parcels: def('ferryDock', 10170, 240, [-110, -150, 110, 4], P.parcels, 240),
  dockBell: def('ferryDock', 10390, 240, [-20, -176, 86, 4], P.dockBell, 241),
  dockBenches: def('ferryDock', 9960, 350, [-234, -108, 234, 10], P.dockBenches, 350),
  dockLamps: def('ferryDock', 10000, 395, [-260, -330, 260, 8], P.dockLamps, 395),
  gangway: def('ferryDock', 10300, 400, [-36, -66, 236, 96], P.gangway, 420),
  ferry: def('ferryDock', 10330, 600, [-304, -254, 294, 24], P.ferry, 600),
};

/** World anchor of a prop. */
export function propAnchor(propId) { const d = PROPS[propId]; return d ? { x: d.x, y: d.y } : null; }
/** World rect [x0, y0, x1, y1] of a prop. */
export function propBox(propId) {
  const d = PROPS[propId];
  return d ? [d.x + d.box[0], d.y + d.box[1], d.x + d.box[2], d.y + d.box[3]] : null;
}

// Where a prop's paint reaches beyond its hit box (glows, hanging bunting, fallen pieces, tree crowns), measured
// over every state and style. Rasters (broken sprites, area caches) are sized to this, so no prop is ever cut off
// by its own canvas edge; the box stays the tap target.
const INK = {
  steps: [-121, -60, 121, 10], sign: [-152, -61, 152, 50], awning: [-370, -10, 370, 120], tables: [-364, -124, 94, 32],
  chairs: [-449, -129, 179, 39], planters: [-154, -68, 576, 114], stools: [-224, -120, 224, 40], pendants: [-303, -8, 303, 235],
  espresso: [-72, -144, 76, 11], cupShelves: [-218, -186, 218, 38], bar: [-338, -150, 338, 14], bakingTable: [-171, -118, 171, 16],
  gate: [-108, -144, 108, 21], gardenPath: [-104, -8, 104, 202], herbs: [-156, -114, 150, 10], tree: [-237, -464, 214, 20],
  borders: [-490, -144, 474, 55], pierBoards: [-508, -18, 508, 45], buoys: [-424, -8, 442, 101], pierLamps: [-380, -433, 380, 12],
  hatch: [-70, -115, 70, 23], nightPlants: [-482, -183, 484, 8], loungers: [-264, -254, 221, 14], telescope: [-108, -188, 108, 12],
  starChart: [-84, -210, 90, 8], boathouseDoors: [-197, -306, 197, 65], oars: [-88, -260, 120, 8], shipLantern: [-106, -108, 106, 104],
  signalFlags: [-57, -519, 110, 10], dinghy: [-156, -84, 156, 43], ropes: [-108, -86, 99, 9], wreaths: [-343, -70, 343, 68],
  stallSign: [-128, -78, 129, 37], hangingBaskets: [-279, -10, 271, 130], pottingTable: [-214, -183, 214, 14], flowerCart: [-144, -184, 200, 14],
  flowerBike: [-136, -239, 158, 13], hutBunting: [-308, -8, 308, 136], deckchairs: [-250, -114, 250, 54], windbreak: [-134, -117, 174, 86],
  parasols: [-197, -284, 200, 10], beacon: [-164, -214, 164, 114], cottage: [-184, -348, 184, 16], pointBench: [-114, -110, 114, 15],
  bandLights: [-260, -8, 260, 126], musicStands: [-154, -122, 195, 8], bandSteps: [-92, -62, 92, 10], flowerRing: [-290, -69, 277, 34],
  foldingChairs: [-364, -104, 364, 46], timetable: [-106, -259, 98, 8], parcels: [-126, -154, 114, 13], dockBenches: [-244, -112, 244, 14],
  dockLamps: [-335, -383, 335, 12], gangway: [-40, -70, 240, 116], ferry: [-308, -258, 299, 32],
};
/** Local rect a prop's paint can cover (its box grown to everything it draws). */
function inkBox(propId) {
  const d = PROPS[propId], k = INK[propId];
  return k ? [Math.min(d.box[0], k[0]), Math.min(d.box[1], k[1]), Math.max(d.box[2], k[2]), Math.max(d.box[3], k[3])] : d.box;
}
/** World rect a prop's paint can cover (for clips and wipes; propBox is the tap target). */
export function propInkBox(propId) {
  const d = PROPS[propId];
  if (!d) return null;
  const b = inkBox(propId);
  return [d.x + b[0], d.y + b[1], d.x + b[2], d.y + b[3]];
}

// ------------------------------------------------------------------ drawProp

const canMake = () => typeof document !== 'undefined' || typeof OffscreenCanvas !== 'undefined';
function makeCanvas(w, h) {
  w = Math.max(1, Math.ceil(w)); h = Math.max(1, Math.ceil(h));
  if (typeof document !== 'undefined') { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  return new OffscreenCanvas(w, h);
}

/** Paint a prop as vectors at the current origin (anchor). Exported for the tools that measure INK. */
export { paintVector as paintPropVector };
function paintVector(ctx, propId, broken, styleIdx, t) {
  const d = PROPS[propId];
  if (!d) return;
  begin(ctx, broken, hashString(propId) ^ (broken ? 0x55aa : 0) ^ (styleIdx * 7919));
  TT = t || 0;
  ctx.save();
  d.draw(Math.max(0, Math.min(2, styleIdx | 0)));
  ctx.restore();
}

/** Grime pass over a broken prop sprite (only on the prop's own pixels). */
function grime(g, w, h, seed) {
  const r = mulberry32(seed);
  g.save();
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = 'rgba(150,132,112,0.16)'; g.fillRect(0, 0, w, h);
  // dust speckles
  for (let i = 0; i < (w * h) / 900; i++) { g.fillStyle = r() < 0.5 ? 'rgba(90,70,55,0.20)' : 'rgba(255,248,236,0.22)'; const s = 1 + r() * 2.5; g.fillRect(r() * w, r() * h, s, s); }
  // soft dust settling on top edges
  const lg = g.createLinearGradient(0, 0, 0, h);
  lg.addColorStop(0, 'rgba(255,250,240,0.22)'); lg.addColorStop(0.35, 'rgba(255,250,240,0)');
  g.fillStyle = lg; g.fillRect(0, 0, w, h);
  // a couple of hairline cracks
  g.strokeStyle = 'rgba(80,58,44,0.55)'; g.lineWidth = Math.max(1, w / 260); g.lineCap = 'round';
  for (let k = 0; k < 2; k++) {
    let x = w * (0.2 + r() * 0.6), y = h * (0.15 + r() * 0.3);
    g.beginPath(); g.moveTo(x, y);
    for (let s = 0; s < 4; s++) { x += (r() - 0.5) * w * 0.12; y += h * (0.06 + r() * 0.08); g.lineTo(x, y); }
    g.stroke();
  }
  g.restore();
}

const spriteCache = new Map();
/** A cached raster of a prop (used for broken props, sparkle wipes and chips). */
export function propSprite(propId, state, styleIdx, scale) {
  const d = PROPS[propId];
  if (!d || !canMake()) return null;
  const q = Math.max(0.1, Math.round(scale * 8) / 8);
  const key = `${propId}|${state}|${styleIdx}|${q}${LIFT && state === 'broken' ? '|lit' : ''}`;
  let sp = spriteCache.get(key);
  if (sp) return sp;
  const pad = 10;
  const [x0, y0, x1, y1] = inkBox(propId);
  const cv = makeCanvas((x1 - x0 + 2 * pad) * q, (y1 - y0 + 2 * pad) * q);
  const g = cv.getContext('2d');
  g.setTransform(q, 0, 0, q, (-x0 + pad) * q, (-y0 + pad) * q);
  paintVector(g, propId, state === 'broken', styleIdx, 0);
  g.setTransform(1, 0, 0, 1, 0, 0);
  if (state === 'broken') grime(g, cv.width, cv.height, hashString(propId));
  sp = { canvas: cv, x0: x0 - pad, y0: y0 - pad, w: x1 - x0 + 2 * pad, h: y1 - y0 + 2 * pad };
  if (spriteCache.size > 120) spriteCache.delete(spriteCache.keys().next().value);
  spriteCache.set(key, sp);
  return sp;
}

/**
 * Draw one prop at the current origin (= its anchor; ctx in world units). state 'broken' | 'built'.
 * Built props paint as vectors; broken ones go through a raster so the grime stays on the prop.
 */
export function drawProp(ctx, propId, state, styleIdx = 0, t = 0, lit = false) {
  if (!PROPS[propId]) return;
  const prev = LIFT;
  if (lit) LIFT = FRONT_LIFT; // a broken prop on the brightened frontage (see frontLit)
  try {
    if (state === 'broken' && canMake()) {
      const m = ctx.getTransform ? ctx.getTransform() : null;
      const sc = m ? Math.hypot(m.a, m.b) : 1;
      const sp = propSprite(propId, 'broken', 0, Math.min(3, Math.max(0.25, sc)));
      if (sp) { ctx.drawImage(sp.canvas, sp.x0, sp.y0, sp.w, sp.h); return; }
    }
    paintVector(ctx, propId, state === 'broken', state === 'broken' ? 0 : styleIdx, t);
  } finally { LIFT = prev; }
}

/** Props of an area, back to front. */
export function areaProps(areaId) {
  const area = CAFE_AREA_BY_ID[areaId];
  if (!area) return [];
  return area.tasks.map((t) => ({ taskId: t.id, propId: t.prop, d: PROPS[t.prop] })).filter((p) => p.d).sort((a, b) => a.d.z - b.d.z);
}

/** The built/broken prop under a world point in an area (front-most first), or null. */
export function propAt(areaId, wx, wy, slack = 10) {
  const list = areaProps(areaId);
  for (let i = list.length - 1; i >= 0; i--) {
    const { d, taskId, propId } = list[i];
    // big composite props (lights, flags) only count near their busy middle
    const [x0, y0, x1, y1] = [d.x + d.box[0], d.y + d.box[1], d.x + d.box[2], d.y + d.box[3]];
    if (wx >= x0 - slack && wx <= x1 + slack && wy >= y0 - slack && wy <= y1 + slack) return { taskId, propId };
  }
  return null;
}

// ------------------------------------------------------------------ the world: sky, far hills, sea, land
const HORIZON = -150;
// Height of the land behind the harbour front (world y of its top edge) along x; low = the bay shows.
const LAND = [[-1400, -190], [-400, -210], [500, -240], [1500, -250], [2500, -200], [3000, -160], [3380, -60], [3620, 110], [4420, 120],
  [4700, -40], [5000, -150], [5600, -250], [6400, -220], [6700, -90], [7000, -10], [7500, -30], [7800, -80], [8300, -40], [8700, -120],
  [9000, -190], [9400, -160], [9800, -20], [10200, 60], [10700, 20],
  // Books 3–9: the village, down to the river mouth, the clifftop and the cove, the seafront, up into the hills,
  // down to the island beach and home along the front (low points are the river mouth, the cove and the island)
  [11000, -150], [11600, -230], [12400, -210], [13000, -160], [14000, -260], [15000, -200], [16000, -220], [17000, -180], [17800, -150],
  [18380, -60], [18620, 110], [19380, 110], [19650, -60], [20000, -120], [21000, -200], [22000, -220], [22800, -340], [23300, -200],
  [23700, -40], [24300, -30], [24700, -80], [25000, -120], [26000, -170], [27000, -210], [28000, -190], [29000, -210], [30000, -230],
  [31000, -220], [32000, -240], [33000, -230], [34000, -200], [35000, -170], [36000, -360], [37000, -280], [38000, -300], [39000, -250],
  [40000, -320], [41000, -400], [42000, -120], [43000, -60], [44000, -150], [45000, -200], [46000, -230], [47000, -180], [48000, -220],
  [49600, -220]];
export function landTop(x) {
  for (let i = 1; i < LAND.length; i++) {
    const [x1, y1] = LAND[i];
    if (x <= x1) { const [x0, y0] = LAND[i - 1]; const k = (x - x0) / (x1 - x0); return y0 + (y1 - y0) * (0.5 - Math.cos(Math.PI * k) / 2); }
  }
  return LAND[LAND.length - 1][1];
}
const SKY = [[-1800, '#27305e'], [-1250, '#4c4f8a'], [-850, '#8e7fb4'], [-560, '#d9a3b5'], [-330, '#f7c3a3'], [HORIZON, '#ffe0aa']];

const areaCx = (id) => { const a = CAFE_AREA_BY_ID[id]; if (a.id === 'rooftop') return 1000; const i = CAFE_AREAS.indexOf(a); return (i > 5 ? i - 1 : i) * AREA_W; };
/** Centre x of each area in world units (the rooftop sits on top of the counter). */
export const AREA_X = Object.fromEntries(CAFE_AREAS.map((a) => [a.id, areaCx(a.id)]));

/**
 * Per-frame backdrop: sky gradient, sun, clouds, stars (+ constellations over the rooftop), far hills, sea.
 * ctx must already be in world units; view = { x0, y0, x1, y1 } is the visible world rect.
 */
export function paintBackdrop(ctx, view, { t = 0, starsLit = false, reduced = false } = {}) {
  const { x0, y0, x1, y1 } = view;
  begin(ctx, false, 'sky');
  if (y0 < HORIZON) {
    const g = ctx.createLinearGradient(0, SKY[0][0], 0, SKY[SKY.length - 1][0]);
    for (const [y, c] of SKY) g.addColorStop((y - SKY[0][0]) / (SKY[SKY.length - 1][0] - SKY[0][0]), c);
    ctx.fillStyle = g; ctx.fillRect(x0 - 2, y0 - 2, x1 - x0 + 4, HORIZON - y0 + 4);
  }
  if (y0 < -420) {
    // ~60 stars per 1000-wide column, each column seeded by its index: the cost follows the view, not the world
    for (let col = Math.floor((x0 - 10) / 1000); col * 1000 <= x1 + 10; col++) for (let i = 0, r = mulberry32((0xc0ffee ^ Math.imul(col, 0x9e3779b1)) >>> 0); i < 60; i++) {
      const sx = col * 1000 + r() * 1000, sy = -1750 + r() * 1300, s = 1.2 + r() * 2.4, ph = r() * TAU;
      if (sx < x0 - 10 || sx > x1 + 10 || sy < y0 - 10 || sy > y1 + 10) continue;
      const a = Math.min(1, Math.max(0, (-450 - sy) / 500)) * (reduced ? 0.8 : 0.6 + 0.4 * Math.sin(t * 1.3 + ph));
      if (a <= 0.02) continue;
      ctx.globalAlpha = a; ctx.fillStyle = '#fff6e0'; ctx.beginPath(); ctx.arc(sx, sy, s, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    paintConstellations(ctx, view, starsLit, t, reduced);
  }
  // the sun low over the bay (gentle parallax) with a soft halo
  const sunX = 3600 + ((x0 + x1) / 2 - 3600) * 0.6, sunY = HORIZON - 110;
  if (sunY + 360 > y0 && sunY - 360 < y1) {
    const sg = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 380);
    sg.addColorStop(0, 'rgba(255,240,200,0.9)'); sg.addColorStop(0.25, 'rgba(255,214,150,0.4)'); sg.addColorStop(1, 'rgba(255,200,150,0)');
    ctx.fillStyle = sg; ctx.fillRect(sunX - 380, sunY - 380, 760, 760);
    ctx.fillStyle = '#fff4d6'; ctx.beginPath(); ctx.arc(sunX, sunY, 58, 0, TAU); ctx.fill();
  }
  // clouds drifting slowly: two or three per 1000-wide cell of the drifting sky, seeded per cell (view-bounded cost)
  const drift = reduced ? 0 : t * 5;
  for (let cell = Math.floor((x0 - drift - 420) / 1000); cell * 1000 <= x1 - drift + 420; cell++) {
    const cr = mulberry32((0xc10d ^ Math.imul(cell, 0x85ebca6b)) >>> 0), n = cr() < 0.3 ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const cx = cell * 1000 + cr() * 1000 + drift, cy = -780 + cr() * 560, w = 170 + cr() * 230;
      if (cx + w < x0 || cx - w > x1 || cy + 90 < y0 || cy - 90 > y1) continue;
      cloud(ctx, cx, cy, w, cy < -600 ? '#f6dbe0' : '#fff3e6');
    }
  }
  // far hills across the bay, with a few white cottages
  if (y0 < HORIZON + 10 && y1 > HORIZON - 320) {
    const mid = (x0 + x1) / 2;
    hillLayer(ctx, x0, x1, mid * 0.35, 'hillsFar', '#c9b8cc', 210, 0.0021);
    hillLayer(ctx, x0, x1, mid * 0.2, 'hillsNear', '#adc3ab', 120, 0.0034);
  }
  // the sea: the bay behind the land and the harbour in front of the quay
  if (y1 > HORIZON) {
    const sg2 = ctx.createLinearGradient(0, HORIZON, 0, 1200);
    sg2.addColorStop(0, '#cfe6dc'); sg2.addColorStop(0.2, '#97d0cf'); sg2.addColorStop(0.55, '#62b3bf'); sg2.addColorStop(1, '#3f8ea3');
    ctx.fillStyle = sg2; ctx.fillRect(x0 - 2, HORIZON, x1 - x0 + 4, y1 - HORIZON + 2);
    ctx.save(); ctx.globalAlpha = 0.55; ctx.strokeStyle = '#fff4d6'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let i = 0; i < 9; i++) { const yy = HORIZON + 8 + i * 12, w = 110 - i * 9; ctx.beginPath(); ctx.moveTo(sunX - w, yy); ctx.lineTo(sunX + w, yy); ctx.stroke(); }
    ctx.restore();
  }
}
function cloud(ctx, cx, cy, w, col) {
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.ellipse(cx, cy, w * 0.5, w * 0.12, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx - w * 0.18, cy - w * 0.08, w * 0.2, w * 0.14, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + w * 0.1, cy - w * 0.12, w * 0.24, w * 0.18, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + w * 0.3, cy - w * 0.04, w * 0.16, w * 0.1, 0, 0, TAU); ctx.fill();
  ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = '#c98a8a'; ctx.beginPath(); ctx.ellipse(cx, cy + w * 0.06, w * 0.46, w * 0.05, 0, 0, TAU); ctx.fill(); ctx.restore();
}
function hillLayer(ctx, x0, x1, px, seed, col, amp, freq) {
  const r = mulberry32(hashString(seed)), p1 = r() * 10, p2 = r() * 10;
  const h = (x) => HORIZON - amp * (0.45 + 0.3 * Math.sin((x + px) * freq + p1) + 0.2 * Math.sin((x + px) * freq * 2.7 + p2));
  ctx.beginPath(); ctx.moveTo(x0 - 4, HORIZON + 2);
  for (let x = x0 - 4; x <= x1 + 40; x += 30) ctx.lineTo(x, h(x));
  ctx.lineTo(x1 + 40, HORIZON + 2); ctx.closePath();
  ctx.fillStyle = col; ctx.fill();
  if (seed === 'hillsNear') {
    const start = Math.floor((x0 + px) / 260) * 260;
    for (let k = start; k < x1 + px + 260; k += 260) {
      const r2 = mulberry32(hashString('c' + k));
      if (r2() < 0.45) continue;
      const x = k - px + r2() * 120, y = h(x) + 14 + r2() * 20;
      if (y > HORIZON - 4) continue;
      ctx.fillStyle = '#fbf3e6'; ctx.fillRect(x - 9, y - 9, 18, 11);
      ctx.fillStyle = ['#d9876a', '#8a9fb8', '#c98f9f'][Math.floor(r2() * 3)]; ctx.beginPath(); ctx.moveTo(x - 11, y - 9); ctx.lineTo(x, y - 18); ctx.lineTo(x + 11, y - 9); ctx.closePath(); ctx.fill();
    }
  }
}

// Constellations over the rooftop (patterns in a 100 × 100 box; third value = brightness 1..3).
const CONSTELLATIONS = [
  { name: 'Cassiopeia', x: 560, y: -1080, s: 2.4, stars: [[70, 64, 3], [90, 38, 3], [52, 40, 3], [32, 58, 2], [12, 30, 2]], lines: [[1, 0], [0, 2], [2, 3], [3, 4]] },
  { name: 'Orion', x: 1120, y: -1200, s: 2.8, stars: [[50, 50, 3], [41, 53, 3], [59, 47, 2], [28, 20, 3], [70, 25, 2], [74, 82, 3], [34, 86, 2], [50, 8, 1]], lines: [[1, 0], [0, 2], [3, 1], [4, 2], [1, 6], [2, 5], [7, 3], [7, 4]] },
  { name: 'Ursa Major', x: 1460, y: -930, s: 2.6, stars: [[80, 26, 3], [80, 54, 3], [54, 56, 2], [50, 32, 2], [36, 26, 3], [22, 22, 3], [8, 32, 3]], lines: [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 5], [5, 6]] },
  { name: 'Cygnus', x: 300, y: -830, s: 2.2, stars: [[52, 10, 3], [50, 38, 3], [22, 30, 2], [78, 48, 2], [48, 64, 1], [46, 90, 2]], lines: [[0, 1], [2, 1], [1, 3], [1, 4], [4, 5]] },
];
function paintConstellations(ctx, view, lit, t, reduced) {
  X = ctx;
  for (const c of CONSTELLATIONS) {
    const w = 100 * c.s;
    if (c.x + w < view.x0 || c.x > view.x1 || c.y + w < view.y0 || c.y > view.y1) continue;
    const pt = (s) => [c.x + s[0] * c.s, c.y + s[1] * c.s];
    if (lit) {
      ctx.save(); ctx.strokeStyle = 'rgba(255,236,190,0.55)'; ctx.lineWidth = 3; ctx.setLineDash([2, 9]); ctx.lineCap = 'round';
      for (const [a, b] of c.lines) { const [ax, ay] = pt(c.stars[a]), [bx, by] = pt(c.stars[b]); ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); }
      ctx.restore();
    }
    c.stars.forEach((s, i) => {
      const [x, y] = pt(s), r = (lit ? 4 : 2.6) + s[2] * (lit ? 2.2 : 1);
      const tw = reduced ? 1 : 0.85 + 0.15 * Math.sin(t * 1.7 + i * 1.3);
      if (lit) { const gg = ctx.createRadialGradient(x, y, 0, x, y, r * 4); gg.addColorStop(0, 'rgba(255,230,170,0.6)'); gg.addColorStop(1, 'rgba(255,230,170,0)'); ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(x, y, r * 4, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = (lit ? 1 : 0.7) * tw; ctx.fillStyle = lit ? '#fff1c4' : '#f6efff';
      star(x, y, r * 1.5, 0.42, 4); ctx.fill(); ctx.globalAlpha = 1;
    });
    if (lit) { ctx.font = `italic 600 26px ${SERIF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(255,236,200,0.8)'; ctx.fillText(c.name, c.x + w / 2, c.y + w + 26); }
  }
}

/** Gentle shimmer on the harbour (per frame, cheap). */
export function paintWater(ctx, view, t = 0, reduced = false) {
  const { x0, x1, y1 } = view;
  if (y1 < WATER) return;
  ctx.save();
  // the harbour darkens softly under the front, so the quay's foot fades into the water instead of a hard edge;
  // one full-width band here, not per area, so overlapping area caches can't double it into faint stripes
  const wx0 = Math.max(x0, WORLD.left), wx1 = Math.min(x1, WORLD.right);
  const wg = ctx.createLinearGradient(0, WATER, 0, WATER + 150);
  wg.addColorStop(0, 'rgba(28,62,78,.34)'); wg.addColorStop(0.45, 'rgba(28,62,78,.12)'); wg.addColorStop(1, 'rgba(28,62,78,0)');
  ctx.fillStyle = wg; ctx.fillRect(wx0, WATER, wx1 - wx0, 150);
  ctx.strokeStyle = '#fffdf3'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  const drift = reduced ? 0 : t;
  // ~22 ripples per 500-wide cell, each cell seeded by its index (the cost follows the view, not the world)
  for (let cell = Math.floor((x0 - 64) / 500); cell * 500 <= x1 + 64; cell++) {
    const r = mulberry32((0x5ea ^ Math.imul(cell, 0x27d4eb2d)) >>> 0);
    for (let i = 0; i < 22; i++) {
      const bx = cell * 500 + r() * 500, by = WATER + 30 + r() * 800, w = 20 + r() * 50, ph = r() * TAU;
      const x = bx + Math.sin(drift * 0.6 + ph) * 14;
      if (x + w < x0 || x - w > x1 || by > y1 + 10) continue;
      ctx.globalAlpha = 0.2 + 0.25 * (reduced ? 1 : (0.5 + 0.5 * Math.sin(drift * 1.1 + ph)));
      ctx.beginPath(); ctx.moveTo(x - w / 2, by); ctx.quadraticCurveTo(x, by - 5, x + w / 2, by); ctx.stroke();
    }
  }
  ctx.restore();
}

// ------------------------------------------------------------------ area shells (buildings and ground)
// One continuous painted scene. Each area cache paints the ground for its own span (plus SEAM world units of
// overlap), but everything on the ground is a pure function of world position: the land, the promenade, lawns,
// beach, rocks, the quay wall and every speck of texture are anchored to world cells, never to the area. Two
// neighbouring caches therefore paint identical pixels where they overlap, so their join is invisible. Where the
// kind of ground changes, the boundary is a soft wavy edge (or sand and rocks heaped over the quay's end) rather
// than a straight vertical cut at the area line.
const SEAM = 3;
const AREA_SPAN = { terrace: [WORLD.left, 500], homecoming: [47500, WORLD.right] };
/** World x-span [x0, x1] whose ground an area paints. */
function areaSpan(id) { return AREA_SPAN[id] || [AREA_X[id] - AREA_W / 2, AREA_X[id] + AREA_W / 2]; }

/** Calls cb(rand, cellX, cellY) for every size×size world cell touching the rect; rand is seeded by the cell. */
function cells(x0, y0, x1, y1, size, salt, cb) {
  for (let ix = Math.floor(x0 / size); ix * size < x1; ix++) {
    for (let iy = Math.floor(y0 / size); iy * size < y1; iy++) cb(mulberry32(((ix * 73856093) ^ (iy * 19349663) ^ salt) >>> 0), ix * size, iy * size);
  }
}
/** World-anchored speckle (same specks whichever area paints them). */
function wspeckle(x0, y0, x1, y1, col, per, size, a, salt) {
  X.save(); X.globalAlpha = a; X.fillStyle = C(col);
  cells(x0, y0, x1, y1, 60, salt, (r, cx, cy) => { for (let i = 0; i < per; i++) { const s = size * (0.5 + r()); X.fillRect(cx + r() * 60, cy + r() * 60, s, s * 0.8); } });
  X.restore();
}

// The harbour front along x: [start x, kind]. 'bay' is open water under the pier.
const FRONT = [[-Infinity, 'pave'], [2500, 'grass'], [3560, 'bay'], [4500, 'pave'], [6500, 'sand'], [7500, 'grass'], [9500, 'pave'],
  // Books 3–9: village lanes, the green, the market, the orchard and mill, the river mouth under the bridge, the pond,
  // the school lane, the clifftop, the cove beach, the rock pools, the seafront, the pavilion lawn, the harbour, the hills, the island beach, home
  [12500, 'grass'], [14500, 'pave'], [16500, 'grass'], [18640, 'bay'], [19360, 'grass'], [20500, 'pave'], [22500, 'grass'],
  [23500, 'sand'], [24500, 'pave'], [29500, 'grass'], [30500, 'pave'], [35500, 'grass'], [41500, 'sand'], [42500, 'pave'],
  [44500, 'grass'], [45500, 'pave']];
// stretches with a stone quay wall (it stops at each bay and runs under the beaches' sand)
const QUAYS = [[-Infinity, 3560], [4500, 6500], [8500, 18640], [19360, 23500], [24500, 41500], [42500, Infinity]];
// beaches: [x0, x1, tapers at the right end too]; the first two run under rocks on their right (the lighthouse point, the rock pools)
const BEACHES = [[6420, 7580, false], [23420, 24580, false], [41420, 42580, true]];
const ROCKS = [[7420, 8580], [24440, 25360]];
// where a quay stops at a bay: [x, side of the bay]; and the strip of sand along the land's foot in each bay
const HEAPS = [[3560, 1], [4500, -1], [18640, 1], [19360, -1]];
const SHORES = [[3540, 4520], [18620, 19380]];
// every change of ground kind is a soft wave, except at a bay's edges (there the quay ends in a heap of boulders)
const WAVY = new Set(FRONT.filter(([, k], i) => i && k !== 'bay' && FRONT[i - 1][1] !== 'bay').map(([s]) => s));
const wavy = (s) => WAVY.has(s);
/** x of the boundary that starts at s, at height y (a soft wave for lawn / sand edges, straight at the bay). */
function edgeX(s, y) { return wavy(s) ? s + 22 * Math.sin(y * 0.05 + s * 0.013) + 10 * Math.sin(y * 0.13 + s * 0.007) : s; }
/** Top of a beach's sand: level with the promenade, sloping down to the water over the quay's end (and at its right end too when tapered). */
function sandTop(x, [b0, b1, tapR]) {
  const l = x < b0 + 100 ? Math.min(1, ((b0 + 100 - x) / 100) ** 2) : 0, r = tapR && x > b1 - 100 ? Math.min(1, ((x - b1 + 100) / 100) ** 2) : 0;
  return QUAY - 8 + Math.max(l, r) * (WATER + 38 - QUAY);
}
const sandBottom = (x, [b0, b1]) => WATER + 30 + 30 * Math.sin(Math.PI * Math.min(1, Math.max(0, (x - b0) / (b1 - b0))));
function rockTop(x, [r0, r1]) {
  const l = Math.max(0, (r0 + 140 - x) / 140), r = Math.max(0, (x - r1 + 160) / 160);
  return Math.min(WATER + 40, 320 + Math.sin(x * 0.05) * 8 + (l * l + r * r) * 190);
}
let sandGrad = null;
function sandFill() { const g = X.createLinearGradient(0, GROUND, 0, WATER + 60); g.addColorStop(0, '#f3dfb4'); g.addColorStop(1, '#e6c992'); return g; }

function paveBand(a, b) {
  X.fillStyle = C('#ead8bd'); X.fillRect(a, GROUND, b - a, QUAY - GROUND);
  X.strokeStyle = C('#d6c0a0'); X.lineWidth = 2.5;
  for (let y = GROUND, row = 0; y < QUAY; y += 40, row++) {
    X.beginPath(); X.moveTo(a, y); X.lineTo(b, y); X.stroke();
    for (let x = Math.floor(a / 80) * 80 + (row % 2) * 40; x < b; x += 80) { X.beginPath(); X.moveTo(x, y); X.lineTo(x, y + 40); X.stroke(); }
  }
  wspeckle(a, GROUND, b, QUAY, '#b39a7a', 3, 4, 0.22, 0x9a7e);
  const sh = X.createLinearGradient(0, GROUND, 0, GROUND + 50); sh.addColorStop(0, 'rgba(90,60,40,.22)'); sh.addColorStop(1, 'rgba(90,60,40,0)');
  X.fillStyle = sh; X.fillRect(a, GROUND, b - a, 50);
}
function grassBand(a, b) {
  const g = X.createLinearGradient(0, GROUND, 0, QUAY); g.addColorStop(0, C('#a3c783')); g.addColorStop(1, C('#8ab86e'));
  X.fillStyle = g; X.fillRect(a, GROUND, b - a, QUAY - GROUND);
  X.save(); X.globalAlpha = 0.35; X.strokeStyle = C('#5f9a5a'); X.lineWidth = 2.5; X.beginPath();
  cells(a, GROUND, b, QUAY, 50, 0x6a55, (r, cx, cy) => {
    for (let i = 0; i < 5; i++) { const x = cx + r() * 50, y = cy + r() * 50; if (y < GROUND + 10 || y > QUAY - 4) continue; X.moveTo(x, y); X.lineTo(x - 3, y - 9); X.moveTo(x, y); X.lineTo(x + 4, y - 8); }
  });
  X.stroke(); X.restore();
}
function sandBand(a, b) {
  X.fillStyle = sandGrad; X.fillRect(a, GROUND, b - a, QUAY - GROUND);
  wspeckle(a, GROUND, b, QUAY, '#c9a86a', 3, 4, 0.3, 0x5a4d);
}
function quayBody(a, b, qs = -Infinity, qe = Infinity) {
  X.fillStyle = C('#b79f82'); X.fillRect(a, QUAY + 6, b - a, WATER - QUAY + 24);
  X.save(); X.beginPath(); X.rect(a, QUAY + 6, b - a, WATER - QUAY + 24); X.clip();
  X.strokeStyle = C('#9c8468'); X.lineWidth = 3;
  for (let y = QUAY + 6, row = 0; y < WATER + 30; y += 32, row++) { X.beginPath(); X.moveTo(a, y); X.lineTo(b, y); X.stroke(); for (let x = Math.floor(a / 90) * 90 + (row % 2) * 45; x < b; x += 90) { X.beginPath(); X.moveTo(x, y); X.lineTo(x, y + 32); X.stroke(); } }
  X.fillStyle = 'rgba(70,40,25,.2)'; X.fillRect(a, QUAY + 6, b - a, 10);
  // the wall's wet foot sinks into the harbour: weed-dark, then the water's own colour, so no hard bottom edge
  const fg = X.createLinearGradient(0, WATER - 30, 0, WATER + 30);
  fg.addColorStop(0, 'rgba(70,110,90,0)'); fg.addColorStop(0.45, 'rgba(70,110,90,.34)'); fg.addColorStop(1, 'rgba(84,150,162,.96)');
  X.fillStyle = fg; X.fillRect(a, WATER - 30, b - a, 60);
  X.restore();
  X.fillStyle = C('#d9c3a4'); X.fillRect(a, QUAY - 6, b - a, 14);
  X.fillStyle = 'rgba(70,40,25,.25)'; X.fillRect(a, QUAY + 6, b - a, 2);
  // its broken reflection and a soft lapping line (world-anchored, so neighbouring caches agree)
  X.save(); X.beginPath(); X.rect(a, WATER + 18, b - a, 62); X.clip();
  X.globalAlpha = 0.2; X.fillStyle = '#7d6a55';
  cells(a - 50, WATER + 30, b, WATER + 78, 40, 0x3ef1, (r, cx, cy) => {
    for (let i = 0; i < 2; i++) { const y = cy + r() * 40, x = cx + r() * 40, d = (y - WATER - 30) / 48, w = (14 + r() * 34) * (1 - d * 0.7); if (d < 0 || d > 1 || x < qs + 60 || x + w > qe - 60) continue; X.fillRect(x, y, w, 3); }
  });
  X.globalAlpha = 0.55; X.strokeStyle = '#eefaf6'; X.lineWidth = 3; X.lineCap = 'round'; X.beginPath();
  for (let x = Math.floor(a / 10) * 10; x <= b + 10; x += 10) { const y = WATER + 29 + 2.5 * Math.sin(x * 0.07) + 1.5 * Math.sin(x * 0.19); if (x === Math.floor(a / 10) * 10) X.moveTo(x, y); else X.lineTo(x, y); }
  X.stroke(); X.restore();
}
/**
 * A heap of boulders where a quay stops at the bay (the bay lies on the `side` of x: +1 right, -1 left): it climbs
 * from the quay's face up over the end of the promenade and tumbles down into the water, so the quay has a natural
 * end instead of a squared-off cut. Pure function of world x, so the caches either side paint it identically.
 */
const HEAP_IN = 120, HEAP_OUT = 165;
function heapTop(x, at, side) {
  const u = (x - at) * side, cos = (k) => 0.5 - Math.cos(Math.PI * Math.min(1, Math.max(0, k))) / 2;
  const y = u < 0 ? WATER + 36 + (GROUND - 14 - WATER - 36) * cos((u + HEAP_IN) / HEAP_IN) ** 0.8 : GROUND - 14 + (WATER + 36 - GROUND + 14) * cos(u / HEAP_OUT) ** 1.3;
  return y + 5 * Math.sin(x * 0.09) + 3 * Math.sin(x * 0.23);
}
function quayHeap(at, side) {
  const xa = side > 0 ? at - HEAP_IN : at - HEAP_OUT, xb = side > 0 ? at + HEAP_OUT : at + HEAP_IN;
  X.save();
  X.beginPath(); X.moveTo(xa, heapTop(xa, at, side));
  for (let x = xa; x <= xb; x += 6) X.lineTo(x, heapTop(x, at, side));
  X.lineTo(xb, WATER + 40); X.lineTo(xa, WATER + 40); X.closePath();
  X.fillStyle = C('#a99d8c'); X.fill(); X.clip();
  cells(xa - 40, GROUND - 40, xb + 40, WATER + 40, 46, 0x4ea9, (r, cx, cy) => {
    const x = cx + r() * 46, y = cy + r() * 46, rw = 24 + r() * 26, rh = 15 + r() * 12;
    el(x, y, rw / 2 + 6, rh / 2 + 4); fo(['#c9bfb0', '#b3a898', '#d4cbbd', '#bfb4a2'][Math.floor(r() * 4)], 3.5);
  });
  // wet stones at the waterline
  const wg = X.createLinearGradient(0, WATER - 10, 0, WATER + 40); wg.addColorStop(0, 'rgba(60,90,85,0)'); wg.addColorStop(1, 'rgba(60,100,105,.5)');
  X.fillStyle = wg; X.fillRect(xa, WATER - 10, xb - xa, 50);
  X.restore();
  X.beginPath(); for (let x = xa; x <= xb; x += 6) { if (x === xa) X.moveTo(x, heapTop(x, at, side)); else X.lineTo(x, heapTop(x, at, side)); }
  X.strokeStyle = OUT; X.lineWidth = 4; X.lineJoin = 'round'; X.stroke();
  // foam where the water laps the stones
  X.save(); X.globalAlpha = 0.6; X.strokeStyle = '#f4fbf8'; X.lineWidth = 4; X.lineCap = 'round';
  for (let x = xa + 10; x < xb - 6; x += 22) { const y = WATER + 36 + 3 * Math.sin(x * 0.3); X.beginPath(); X.moveTo(x, y); X.quadraticCurveTo(x + 7, y - 5, x + 15, y); X.stroke(); }
  X.restore();
}
/** The little beach along the foot of the land where it meets the bay under the pier (tapers into both heaps). */
function shoreTaper(x, S) { const s = (k) => { k = Math.min(1, Math.max(0, k)); return k * k * (3 - 2 * k); }; return s((x - S[0]) / 70) * s((S[1] - x) / 70); }
const shoreUp = (x, S) => GROUND + 4 - shoreTaper(x, S) * (20 + 6 * Math.sin(x * 0.011) + 3 * Math.sin(x * 0.037));
const shoreDown = (x, S) => GROUND + 4 + shoreTaper(x, S) * (20 + 6 * Math.sin(x * 0.021 + 1) + 4 * Math.sin(x * 0.057));
function shore(a, b) { for (const S of SHORES) shoreStrip(a, b, S); }
function shoreStrip(a, b, S) {
  const xa = Math.max(a, S[0]), xb = Math.min(b, S[1]);
  if (xb <= xa) return;
  const x0 = Math.floor(xa / 8) * 8;
  X.save(); X.beginPath(); X.rect(a, GROUND - 60, b - a, 140); X.clip();
  X.beginPath(); X.moveTo(x0, shoreUp(x0, S));
  for (let x = x0; x <= xb + 8; x += 8) X.lineTo(x, shoreUp(x, S));
  for (let x = Math.ceil((xb + 8) / 8) * 8; x >= x0; x -= 8) X.lineTo(x, shoreDown(x, S));
  X.closePath(); X.fillStyle = sandGrad; X.fill();
  X.lineCap = 'round'; X.lineJoin = 'round';
  const along = (f, dy, col, lw, alpha) => {
    X.globalAlpha = alpha; X.strokeStyle = col; X.lineWidth = lw; X.beginPath();
    for (let x = x0; x <= xb + 8; x += 8) { const y = f(x, S) + dy * shoreTaper(x, S); if (x === x0) X.moveTo(x, y); else X.lineTo(x, y); }
    X.stroke();
  };
  along(shoreDown, -4, '#cfb27c', 7, 0.6);   // wet sand
  along(shoreDown, 1, '#f6fcf8', 4, 0.75);   // the lapping edge
  along(shoreDown, 12, '#f6fcf8', 3, 0.3);   // a second, fainter ripple
  X.restore();
}

/**
 * Everything from the promenade's back edge down to the water for world span [x0, x1]: soft water shade under
 * the front, the promenade / lawns / beach band, the quay wall with its proper ends, the beach slope and the rocky
 * point. mid() runs between the band and the quay (for things that sit on the band but behind the quay's coping).
 */
function front(x0, x1, mid) {
  const a = x0 - SEAM, b = x1 + SEAM;
  sandGrad = sandFill();
  shore(a, b);
  X.save(); X.beginPath(); X.rect(a, GROUND - 2, b - a, WATER + 200 - GROUND); X.clip();
  // the band: promenade, lawns and sand with soft edges between them
  const ys = []; for (let y = GROUND - 2; y < QUAY + 2; y += 8) ys.push(y); ys.push(QUAY + 2);
  for (let i = 0; i < FRONT.length; i++) {
    const [s, kind] = FRONT[i], e = i + 1 < FRONT.length ? FRONT[i + 1][0] : Infinity;
    if (kind === 'bay' || e < a - 40 || s > b + 40) continue;
    const L = (y) => (s === -Infinity ? a - 10 : Math.max(a - 10, edgeX(s, y))), Rt = (y) => (e === Infinity ? b + 10 : Math.min(b + 10, edgeX(e, y)));
    X.save(); X.beginPath();
    ys.forEach((y, k) => (k ? X.lineTo(L(y), y) : X.moveTo(L(y), y)));
    for (let k = ys.length - 1; k >= 0; k--) X.lineTo(Rt(ys[k]), ys[k]);
    X.closePath(); X.clip();
    const pa = s === -Infinity ? a : Math.max(a, s - 40), pb = e === Infinity ? b : Math.min(b, e + 40);
    if (kind === 'pave') paveBand(pa, pb); else if (kind === 'grass') grassBand(pa, pb); else sandBand(pa, pb);
    X.restore();
  }
  // a soft rim along each wavy edge (lawn green where a lawn is involved, else sand)
  X.save(); X.globalAlpha = 0.6; X.lineWidth = 5; X.lineCap = 'round';
  for (let i = 1; i < FRONT.length; i++) {
    const s = FRONT[i][0];
    if (!wavy(s) || s < a - 40 || s > b + 40) continue;
    X.strokeStyle = FRONT[i][1] === 'grass' || FRONT[i - 1][1] === 'grass' ? C('#7fae63') : '#dcc08a';
    X.beginPath(); ys.forEach((y, k) => (k ? X.lineTo(edgeX(s, y), y) : X.moveTo(edgeX(s, y), y))); X.stroke();
  }
  X.restore();
  if (mid) mid();
  // the quay wall, ending in heaps of boulders at the pier's open water
  for (const [qs, qe] of QUAYS) {
    const qa = Math.max(a, qs), qb = Math.min(b, qe);
    if (qb > qa) quayBody(qa, qb, qs, qe);
  }
  for (const [x, side] of HEAPS) if (x + HEAP_OUT + 50 > a && x - HEAP_OUT - 50 < b) quayHeap(x, side);
  // the beaches slope down to the water, heaped over the quay's end
  for (const B of BEACHES) {
    const [b0, b1, tapR] = B;
    if (b <= b0 || a >= b1) continue;
    X.save(); X.beginPath(); X.moveTo(b0, sandTop(b0, B));
    for (let x = b0; x <= b1; x += 10) X.lineTo(x, sandTop(x, B));
    for (let x = b1; x >= b0; x -= 10) X.lineTo(x, sandBottom(x, B));
    X.closePath(); X.fillStyle = sandGrad; X.fill(); X.clip();
    wspeckle(Math.max(a, b0), QUAY - 8, Math.min(b, b1), WATER + 70, '#c9a86a', 3, 4, 0.3, 0x5a4d);
    X.restore();
    X.save(); X.globalAlpha = 0.6; X.strokeStyle = '#fffaf0'; X.lineWidth = 6; X.lineCap = 'round'; X.beginPath();
    for (let x = b0 + 40; x <= (tapR ? b1 - 40 : b1 - 120); x += 10) { const y = sandBottom(x, B) - 2; if (x === b0 + 40) X.moveTo(x, y); else X.lineTo(x, y); }
    X.stroke(); X.restore();
  }
  // the rocky points (under the lighthouse, and the rock pools), tumbling over the sand or the quay
  for (const RK of ROCKS) {
    const [r0, r1] = RK;
    if (b <= r0 || a >= r1) continue;
    X.beginPath(); X.moveTo(r0, WATER + 40);
    for (let x = r0; x <= r1; x += 10) X.lineTo(x, rockTop(x, RK));
    X.lineTo(r1, WATER + 40); X.closePath(); X.fillStyle = C('#b9ad9c'); X.fill();
    X.beginPath(); for (let x = r0; x <= r1; x += 10) { if (x === r0) X.moveTo(x, rockTop(x, RK)); else X.lineTo(x, rockTop(x, RK)); }
    X.strokeStyle = OUT; X.lineWidth = 4; X.lineJoin = 'round'; X.stroke();
    let n = 0;
    cells(Math.max(a, r0) - 40, 340, Math.min(b, r1) + 40, WATER + 20, 70, 0x70c5, (r, cx, cy) => {
      const x = cx + r() * 70, y = cy + r() * 70, rw = 30 + r() * 40, rh = 18 + r() * 16, col = ['#c9bfb0', '#b3a898', '#d4cbbd'][Math.floor(r() * 3)];
      if (x < r0 + 20 || x > r1 - 20 || y - rh < rockTop(x, RK) + 6 || y > WATER + 30 || n > 400) return;
      n++; el(x, y, rw / 2, rh / 2); fo(col, 3.5);
    });
  }
  X.restore();
}

/** Soft land behind the harbour front for world span [x0, x1], with cottages and trees kept inside the span. */
function backland(x0, x1, kind) {
  const a = x0 - SEAM, b = x1 + SEAM;
  X.save();
  X.beginPath(); X.moveTo(a, GROUND + 4);
  for (let x = Math.floor(a / 20) * 20; x < b; x += 20) X.lineTo(Math.max(a, x), landTop(Math.max(a, x)));
  X.lineTo(b, landTop(b)); X.lineTo(b, GROUND + 4); X.closePath();
  const g = X.createLinearGradient(0, -260, 0, GROUND); g.addColorStop(0, '#bdd3a0'); g.addColorStop(1, '#97bc7c');
  X.fillStyle = g; X.fill();
  X.clip();
  X.globalAlpha = 0.16; X.strokeStyle = '#6f9a5a'; X.lineWidth = 3;
  for (let k = 0; k < 7; k++) { X.beginPath(); for (let x = Math.floor(a / 40) * 40; x <= b + 40; x += 40) { const y = landTop(x) + 28 + k * 34; if (x <= a) X.moveTo(x, y); else X.lineTo(x, y); } X.stroke(); }
  X.globalAlpha = 1;
  // houses and trees stand ON the land: clip only their feet (to the land's flat bottom), never their roofs or crowns
  X.restore(); X.save(); X.beginPath(); X.rect(a, -2000, b - a, GROUND + 4 + 2000); X.clip();
  const r = mulberry32(hashString('land' + x0));
  const n = kind === 'village' ? Math.round(6 * (x1 - x0) / 1000) : kind === 'park' || kind === 'dunes' ? 0 : 3;
  for (let i = 0; i < n; i++) {
    const x = x0 + 80 + (i + r() * 0.5) * (x1 - x0 - 160) / n, y = landTop(x) + 46 + r() * 30;
    const w = kind === 'village' ? 84 + r() * 40 : 64 + r() * 20, h = kind === 'village' ? 80 + r() * 50 : 50;
    if (y - h > GROUND - 60) continue;
    const wall = ['#fbf1e2', '#f7d8cf', '#d8e7ef', '#fbefc2', '#dcefe0'][Math.floor(r() * 5)];
    const roof = ['#c96f55', '#7f93ad', '#a86a5f', '#6f8f7f'][Math.floor(r() * 4)];
    X.fillStyle = wall; X.strokeStyle = OUT; X.lineWidth = 3; X.beginPath(); X.rect(x - w / 2, y - h, w, h + 200); X.fill(); X.stroke();
    X.fillStyle = roof; X.beginPath(); X.moveTo(x - w / 2 - 8, y - h); X.lineTo(x, y - h - w * 0.4); X.lineTo(x + w / 2 + 8, y - h); X.closePath(); X.fill(); X.stroke();
    X.fillStyle = '#ffe6a8';
    for (let k = 0; k < (kind === 'village' ? 4 : 2); k++) { const wx = x - w / 4 + (k % 2) * w / 2 - 9, wy = y - h + 18 + Math.floor(k / 2) * 40; X.beginPath(); X.rect(wx, wy, 18, 22); X.fill(); X.stroke(); }
  }
  const trees = kind === 'park' ? 9 : kind === 'dunes' ? 0 : 5;
  for (let i = 0; i < trees; i++) {
    // crowns reach 0.75 × size (max ~59) to each side: keep them clear of the span's edges so none is cut in half
    const x = x0 + 75 + r() * (x1 - x0 - 150), y = landTop(x) + 30 + r() * 50, s = 44 + r() * 34;
    if (y - s > GROUND - 40) continue;
    X.fillStyle = '#8a6a4a'; X.fillRect(x - 5, y - s * 0.4, 10, s * 0.8);
    X.fillStyle = ['#7aa865', '#88b672', '#6a9a5f'][i % 3]; X.strokeStyle = OUT; X.lineWidth = 3;
    X.beginPath(); X.arc(x, y - s * 0.7, s * 0.55, 0, TAU); X.stroke(); X.beginPath(); X.arc(x - s * 0.35, y - s * 0.45, s * 0.4, 0, TAU); X.stroke(); X.beginPath(); X.arc(x + s * 0.35, y - s * 0.45, s * 0.4, 0, TAU); X.stroke();
    X.beginPath(); X.arc(x, y - s * 0.7, s * 0.55, 0, TAU); X.arc(x - s * 0.35, y - s * 0.45, s * 0.4, 0, TAU); X.fill(); X.beginPath(); X.arc(x + s * 0.35, y - s * 0.45, s * 0.4, 0, TAU); X.fill();
  }
  if (kind === 'dunes') {
    // dunes swell up in the middle of the span and sink back to the plain land at both ends
    const t = (x) => { const k = Math.min(1, Math.max(0, Math.min(x - x0, x1 - x) / 180)); return k * k * (3 - 2 * k); };
    X.fillStyle = '#ecd9ac'; X.beginPath(); X.moveTo(a, GROUND + 4);
    for (let x = x0; x <= x1; x += 20) { const top = Math.max(landTop(x), landTop(x) + 50 + Math.sin(x * 0.01) * 20); X.lineTo(x, GROUND + 4 + (top - GROUND - 4) * t(x)); }
    X.lineTo(b, GROUND + 4); X.closePath(); X.fill();
    for (let i = 0; i < 30; i++) { const x = x0 + 120 + r() * (x1 - x0 - 240), y = landTop(x) + 60 + r() * 60; if (t(x) < 0.9) continue; X.strokeStyle = '#8aa060'; X.lineWidth = 2.5; X.beginPath(); X.moveTo(x, y); X.lineTo(x - 6, y - 22); X.moveTo(x, y); X.lineTo(x + 5, y - 18); X.stroke(); }
  }
  X.restore();
}

/** Café walls fade from weathered to fresh as an area is restored. */
function freshness(info) { return Math.min(1, (info && info.total ? info.built / info.total : 0) + LIFT); }
function wallCol(base, info) { return mix(weather(base), base, freshness(info)); }

/** Areas whose shell reaches higher than the land line allows for (roof ridges, chimneys, towers): the cache's top. */
const TOPS = { terrace: -590, kitchen: -590 };
const SHELLS = {
  terrace(info) {
    backland(WORLD.left, 500, 'village');
    const wall = wallCol('#f6e2c4', info), trim = wallCol('#fbf6ec', info);
    rr(-410, -240, 920, 440, 0); X.fillStyle = wall; X.fill(); out(5);
    X.save(); rr(-410, -240, 920, 440, 0); X.clip(); speckle(-410, -240, 920, 440, '#b9a080', 260, 6, 0.14 + 0.2 * (1 - freshness(info))); X.restore();
    rr(-410, FLOOR, 920, 50, 0); X.fillStyle = wallCol('#d9b48c', info); X.fill(); out(4);
    rr(-430, -268, 960, 30, 4); X.fillStyle = trim; X.fill(); out(4);
    poly(-440, -262, 540, -262, 380, -470, -280, -470); X.fillStyle = wallCol('#c9765a', info); X.fill();
    X.save(); poly(-440, -262, 540, -262, 380, -470, -280, -470); X.clip(); X.strokeStyle = wallCol('#b0634a', info); X.lineWidth = 3; for (let y = -460; y < -262; y += 22) { X.beginPath(); X.moveTo(-460, y); X.lineTo(560, y); X.stroke(); } X.restore();
    poly(-440, -262, 540, -262, 380, -470, -280, -470); out(5);
    rr(300, -540, 50, 90, 3); X.fillStyle = wallCol('#c9a88a', info); X.fill(); out(4);
    rr(-60, -440, 120, 110, 50); X.fillStyle = trim; X.fill(); out(4); rr(-44, -424, 88, 80, 40); X.fillStyle = '#ffe6a8'; X.fill(); out(3);
    // the shop window keeps its shutters closed until the window box is planted
    const open = !!(info && info.done && info.done.terrace_planters != null);
    rr(-350, -110, 340, 210, 6); X.fillStyle = trim; X.fill(); out(4);
    rr(-334, -94, 308, 180, 3); X.fillStyle = open ? '#ffe9bf' : '#c9bfb0'; X.fill(); out(3);
    if (open) {
      X.save(); rr(-334, -94, 308, 180, 3); X.clip();
      const gg = X.createRadialGradient(-180, 0, 10, -180, 0, 220); gg.addColorStop(0, 'rgba(255,200,120,.7)'); gg.addColorStop(1, 'rgba(255,214,140,0)'); X.fillStyle = gg; X.fillRect(-340, -100, 320, 200);
      // a peek inside: a cake stand and teapot on a shelf
      X.fillStyle = '#c98f5a'; X.fillRect(-334, 20, 308, 10);
      el(-260, 6, 30, 8); X.fillStyle = '#ffffff'; X.fill(); el(-260, -10, 22, 14); X.fillStyle = '#f5c6c0'; X.fill(); el(-90, 2, 20, 16); X.fillStyle = '#8fcfb5'; X.fill();
      X.fillStyle = 'rgba(255,255,255,.45)'; poly(-320, -94, -250, -94, -334, -10, -334, -60); X.fill();
      X.restore();
      X.beginPath(); X.moveTo(-180, -94); X.lineTo(-180, 86); X.strokeStyle = trim; X.lineWidth = 7; X.stroke();
    } else {
      X.save(); rr(-334, -94, 308, 180, 3); X.clip();
      for (let x = -334; x < -26; x += 154) { X.fillStyle = wallCol('#8fb7c4', info); X.fillRect(x + 3, -94, 148, 180); X.strokeStyle = wallCol('#6f97a4', info); X.lineWidth = 3; for (let y = -84; y < 86; y += 16) { X.beginPath(); X.moveTo(x + 10, y); X.lineTo(x + 144, y); X.stroke(); } }
      X.restore(); X.beginPath(); X.moveTo(-180, -94); X.lineTo(-180, 86); X.strokeStyle = OUT; X.lineWidth = 3; X.stroke();
    }
    front(WORLD.left, 500);
  },
  counter(info) { interior(500, 1500, info, 'counter'); front(500, 1500); },
  kitchen(info) {
    backland(1500, 2500, 'hill');
    interior(1500, 2500, info, 'kitchen');
    poly(1460, -262, 2540, -262, 2380, -460, 1640, -460); X.fillStyle = wallCol('#c9765a', info); X.fill();
    X.save(); poly(1460, -262, 2540, -262, 2380, -460, 1640, -460); X.clip(); X.strokeStyle = wallCol('#b0634a', info); X.lineWidth = 3; for (let y = -450; y < -262; y += 22) { X.beginPath(); X.moveTo(1440, y); X.lineTo(2560, y); X.stroke(); } X.restore();
    poly(1460, -262, 2540, -262, 2380, -460, 1640, -460); out(5);
    rr(1650, -560, 70, 140, 3); X.fillStyle = wallCol('#c9a88a', info); X.fill(); out(4); rr(1640, -572, 90, 18, 3); X.fillStyle = wallCol('#b8977a', info); X.fill(); out(3.5);
    front(1500, 2500);
  },
  garden(info) {
    backland(2500, 3500, 'hill');
    const brick = wallCol('#dca37d', info), WE = 3420; // the wall stops at a proper brick pier, not at the area line
    // shrubs grow behind the wall and peek over its coping
    for (const x of [2600, 3360]) bush(x, -66, 150, 100, mix('#9a9a80', '#6f9f5f', freshness(info)), 6, 3.5);
    rr(2500, -40, WE - 2500, 245, 0); X.fillStyle = brick; X.fill();
    X.save(); rr(2500, -40, WE - 2500, 245, 0); X.clip(); X.strokeStyle = wallCol('#c48d69', info); X.lineWidth = 2.5; for (let y = -40, row = 0; y < 205; y += 22, row++) { X.beginPath(); X.moveTo(2500, y); X.lineTo(WE, y); X.stroke(); for (let x = 2500 + (row % 2) * 30; x < WE; x += 60) { X.beginPath(); X.moveTo(x, y); X.lineTo(x, y + 22); X.stroke(); } } X.restore();
    rr(2500, -40, WE - 2500, 245, 0); out(4); rr(2490, -58, WE - 2490, 22, 4); X.fillStyle = wallCol('#e9d6bb', info); X.fill(); out(4);
    rr(WE - 8, -86, 52, 291, 4); X.fillStyle = wallCol('#d0946d', info); X.fill(); out(4);
    X.save(); rr(WE - 8, -86, 52, 291, 4); X.clip(); X.strokeStyle = wallCol('#b98060', info); X.lineWidth = 2.5; for (let y = -64; y < 205; y += 22) { X.beginPath(); X.moveTo(WE - 8, y); X.lineTo(WE + 44, y); X.stroke(); } X.restore();
    rr(WE - 16, -100, 68, 20, 4); X.fillStyle = wallCol('#e9d6bb', info); X.fill(); out(4);
    el(WE + 18, -114, 16); X.fillStyle = wallCol('#e9d6bb', info); X.fill(); out(3.5);
    front(2500, 3500, () => {
      // hedges along the lawn's front: only their roots are tucked under the quay coping
      for (const [a, b] of [[2530, 2885], [3115, 3420]]) { X.save(); X.beginPath(); X.rect(a - 90, 300, b - a + 180, 110); X.clip(); bush((a + b) / 2, 404, b - a + 60, 44, mix('#9a9a80', '#6a9f5a', freshness(info)), Math.round((b - a) / 50), 3.5); X.restore(); }
    });
  },
  pier(info) {
    backland(3500, 4500, 'dunes');
    front(3500, 4500);
    for (let x = 3520; x <= 4480; x += 120) { rr(x - 10, 320, 20, 330, 3); X.fillStyle = C('#8a6a4a'); X.fill(); out(3.5); X.fillStyle = 'rgba(40,90,90,.35)'; X.fillRect(x - 10, WATER + 20, 20, 160); }
    // the posts fade out into deep water instead of ending in a flat cut (the cache is transparent there: the sea shows)
    X.save(); X.globalCompositeOperation = 'destination-out';
    const sink = X.createLinearGradient(0, WATER + 50, 0, 654); sink.addColorStop(0, 'rgba(0,0,0,0)'); sink.addColorStop(1, 'rgba(0,0,0,1)');
    X.fillStyle = sink; for (let x = 3520; x <= 4480; x += 120) X.fillRect(x - 14, WATER + 50, 28, 606); X.restore();
    ln(3520, 360, 4480, 360, '#7a5a3a', 6);
    for (let x = 3520; x < 4480; x += 120) { ln(x, 360, x + 120, 450, '#7a5a3a', 4); ln(x + 120, 360, x, 450, '#7a5a3a', 4); }
  },
  rooftop(info) {
    rr(510, -282, 980, 24, 3); X.fillStyle = wallCol('#c98f5a', info); X.fill();
    X.save(); rr(510, -282, 980, 24, 3); X.clip(); planks(510, -282, 980, 24, wallCol('#c98f5a', info), 12); X.restore(); rr(510, -282, 980, 24, 3); out(4);
  },
  boathouse(info) {
    backland(4500, 5500, 'hill');
    front(4500, 5500);
    const wall = wallCol('#9cc0d0', info);
    rr(4680, -205, 640, 410, 0); X.fillStyle = wall; X.fill(); X.save(); rr(4680, -205, 640, 410, 0); X.clip(); planks(4680, -205, 640, 410, wall, 28, true); X.restore(); rr(4680, -205, 640, 410, 0); out(5);
  },
  flowerStall(info) {
    backland(5500, 6500, 'village');
    const cols = ['#f7d8cf', '#fbefc2', '#d8e7ef', '#dcefe0', '#f2dcef'];
    for (let i = 0; i < 5; i++) {
      const x = 5500 + i * 200, h = 330 + (i % 2) * 60, c = wallCol(cols[i], info);
      rr(x, GROUND - h, 200, h, 0); X.fillStyle = c; X.fill(); out(4);
      poly(x - 6, GROUND - h, x + 206, GROUND - h, x + 100, GROUND - h - 90); X.fillStyle = wallCol(['#c96f55', '#7f93ad', '#a86a5f'][i % 3], info); X.fill(); out(4);
      for (let k = 0; k < 2; k++) { rr(x + 40 + k * 80, GROUND - h + 40, 40, 54, 4); X.fillStyle = '#ffe6a8'; X.fill(); out(3); }
    }
    for (const x of [5760, 6240]) { rr(x - 8, 60, 16, 300, 3); X.fillStyle = C('#a0724a'); X.fill(); out(3.5); }
    front(5500, 6500);
  },
  beachHuts(info) {
    backland(6500, 7500, 'dunes');
    front(6500, 7500);
  },
  lighthouse(info) {
    backland(7500, 8500, 'hill');
    front(7500, 8500);
  },
  bandstand(info) {
    backland(8500, 9500, 'park');
    front(8500, 9500);
    poly(8770, 250, 9230, 250, 9250, 300, 8750, 300); X.fillStyle = wallCol('#e9e1d2', info); X.fill(); out(4);
    rr(8770, 236, 460, 18, 3); X.fillStyle = wallCol('#d9cfbf', info); X.fill(); out(3.5);
    for (const x of [8790, 8900, 9100, 9210]) { rr(x - 7, -20, 14, 258, 3); X.fillStyle = wallCol('#3f6f5a', info); X.fill(); out(3); }
  },
  ferryDock(info) {
    backland(9500, 10500, 'hill');
    front(9500, 10500);
    for (const x of [9560, 10520]) { rr(x - 16, 372, 32, 34, 8); X.fillStyle = C('#3d3a3f'); X.fill(); out(3); }
  },
};
// Books 3–9 add their props, paint boxes and shells here (cafeArtBooks.js), before anything reads PROPS or measures an area.
installBooks({
  state: () => ({ X, C, BR, R }), rr, el, poly, ln, box, fill, fo, out, shadow, glow, txt, speckle, planks, bloom, bush, flowersOn, swag, wire,
  dustSheet, star, bunting, lightString, pot, stripes, bench, chair, bistroTable, lampPost, hut, crate, parcel, mix, dk, lt, landTop, backland, front,
  wallCol, freshness, P, PROPS, INK, SHELLS, TOPS,
});

/** Dollhouse cutaway room for the Counter and Kitchen. */
function interior(x0, x1, info, kind) {
  const f = freshness(info);
  X.fillStyle = wallCol(kind === 'counter' ? '#f3dcc6' : '#f6ead4', info); X.fillRect(x0, -232, x1 - x0, FLOOR + 232);
  X.save(); X.beginPath(); X.rect(x0, -232, x1 - x0, FLOOR + 232); X.clip();
  if (kind === 'counter') {
    X.globalAlpha = 0.5; for (let x = x0 + 20; x < x1; x += 60) { X.fillStyle = wallCol('#ead0b4', info); X.fillRect(x, -232, 26, 400); }
    X.globalAlpha = 0.6; for (let x = x0 + 50, k = 0; x < x1; x += 60, k++) for (let y = -200 + (k % 2) * 40; y < 0; y += 80) { X.fillStyle = wallCol('#e2a593', info); X.beginPath(); X.arc(x, y, 5, 0, TAU); X.fill(); }
    X.globalAlpha = 1; X.fillStyle = wallCol('#a8cfc4', info); X.fillRect(x0, 40, x1 - x0, FLOOR - 40); X.strokeStyle = wallCol('#8fb7aa', info); X.lineWidth = 3; for (let x = x0 + 25; x < x1; x += 50) { X.beginPath(); X.moveTo(x, 52); X.lineTo(x, FLOOR - 6); X.stroke(); }
    X.fillStyle = wallCol('#fbf6ec', info); X.fillRect(x0, 34, x1 - x0, 10);
  } else {
    X.fillStyle = wallCol('#ffffff', info); X.fillRect(x0, -60, x1 - x0, FLOOR + 60);
    X.strokeStyle = wallCol('#d9e3e4', info); X.lineWidth = 2.5;
    for (let y = -60, r = 0; y < FLOOR; y += 26, r++) { X.beginPath(); X.moveTo(x0, y); X.lineTo(x1, y); X.stroke(); for (let x = x0 + (r % 2) * 26; x < x1; x += 52) { X.beginPath(); X.moveTo(x, y); X.lineTo(x, y + 26); X.stroke(); } }
    X.fillStyle = wallCol('#7fb7c9', info); X.fillRect(x0, -66, x1 - x0, 8);
  }
  if (f < 1) { X.globalAlpha = 0.3 * (1 - f); X.fillStyle = '#8a7a6a'; for (let i = 0; i < 8; i++) { const x = x0 + R() * (x1 - x0), y = -200 + R() * 200; X.beginPath(); X.ellipse(x, y, 40 + R() * 40, 16 + R() * 20, 0, 0, TAU); X.fill(); } X.globalAlpha = 1; }
  const lg = X.createLinearGradient(0, -232, 0, FLOOR); lg.addColorStop(0, 'rgba(255,220,160,0.18)'); lg.addColorStop(1, 'rgba(120,70,40,0.12)');
  X.fillStyle = lg; X.fillRect(x0, -232, x1 - x0, FLOOR + 232);
  X.restore();
  planks(x0, FLOOR, x1 - x0, GROUND - FLOOR, wallCol('#c98f5a', info), 16);
  rr(x0 - 20, -262, x1 - x0 + 40, 32, 3); X.fillStyle = wallCol('#fbf6ec', info); X.fill(); out(4);
  for (const x of [x0, x1]) { rr(x - 22, -240, 44, GROUND - FLOOR + 390, 3); X.fillStyle = wallCol('#f1dcc0', info); X.fill(); out(4); }
  X.fillStyle = 'rgba(70,40,25,.18)'; X.fillRect(x0 + 22, -230, x1 - x0 - 44, 12);
}

// ------------------------------------------------------------------ area caches

const boundsCache = new Map();
/** World bounds [x0, y0, x1, y1] of an area's cache (union of its shell and its props). */
export function areaBounds(areaId) {
  let b = boundsCache.get(areaId);
  if (b) return b;
  const cx = AREA_X[areaId];
  if (areaId === 'rooftop') b = [500, -620, 1500, -250];
  else b = [cx - 500, Math.min(-260, landTop(cx - 500), landTop(cx), landTop(cx + 500)) - 140, cx + 500 + (areaId === 'ferryDock' ? 260 : 0), WATER + 80];
  if (TOPS[areaId] != null) b[1] = Math.min(b[1], TOPS[areaId]);
  for (const { propId, d } of areaProps(areaId)) { const k = inkBox(propId); b[0] = Math.min(b[0], d.x + k[0] - 12); b[1] = Math.min(b[1], d.y + k[1] - 12); b[2] = Math.max(b[2], d.x + k[2] + 12); b[3] = Math.max(b[3], d.y + k[3] + 12); }
  boundsCache.set(areaId, b);
  return b;
}
const cacheBoundsCache = new Map();
/** World bounds of an area's offscreen cache: its bounds plus room for roofs and posts that overhang the area line,
 *  the whole ground span it paints (the terrace and ferry dock run out to the world's ends) and the soft water
 *  shade under the quay. */
export function cacheBounds(areaId) {
  let c = cacheBoundsCache.get(areaId);
  if (c) return c;
  const b = areaBounds(areaId);
  if (areaId === 'rooftop') c = b;
  else {
    const [s0, s1] = areaSpan(areaId);
    c = [Math.min(b[0] - 60, s0 - SEAM - 2), b[1], Math.max(b[2] + 60, s1 + SEAM + 2), Math.max(b[3], WATER + 80)];
  }
  cacheBoundsCache.set(areaId, c);
  return c;
}

/** Paint a whole area (shell + props) in world units. info = { done: {taskId: style}, built, total, hide? }. */
export function paintArea(ctx, areaId, info = {}) {
  LIFT = frontLit(areaId, info) ? FRONT_LIFT : 0;
  try {
    begin(ctx, false, 'shell:' + areaId);
    ctx.save(); if (SHELLS[areaId]) SHELLS[areaId](info); ctx.restore();
    const done = info.done || {};
    for (const { taskId, propId } of areaProps(areaId)) {
      if (info.hide === propId) continue;
      const d = PROPS[propId];
      ctx.save(); ctx.translate(d.x, d.y);
      if (done[taskId] != null) drawProp(ctx, propId, 'built', done[taskId], 0);
      else drawProp(ctx, propId, 'broken', 0, 0);
      ctx.restore();
    }
  } finally { LIFT = 0; }
}

const areaCache = new Map(); // areaId -> { key, canvas, x0, y0, w, h, scale } (LRU)
const MAX_AREA_CACHE = 6;
/** Quantise device px per world unit so zooming doesn't redraw every frame (callers cap DPR at 2). */
export function cacheScale(pxPerUnit) { const q = Math.pow(2, Math.round(Math.log2(Math.max(0.05, pxPerUnit)) * 3) / 3); return Math.min(1.6, q); }

// info.done -> its JSON signature, computed once per object (callers build a fresh done object whenever the
// café changes and treat it as read-only, so the per-frame cache check costs a WeakMap lookup, not a stringify)
const doneSigs = new WeakMap();
function doneSig(done) {
  if (!done) return '{}';
  let s = doneSigs.get(done);
  if (s === undefined) { s = JSON.stringify(done); doneSigs.set(done, s); }
  return s;
}

/** Offscreen render of an area; redrawn only when its state signature or scale bucket changes.
 *  Treat info.done as read-only: build a new object when the café changes (its signature is cached per object). */
export function renderArea(areaId, info = {}, pxPerUnit = 1) {
  if (!canMake() || !CAFE_AREA_BY_ID[areaId]) return null;
  const scale = cacheScale(pxPerUnit);
  const key = `${scale}|${info.hide || ''}|${doneSig(info.done)}|${info.built || 0}${info.unlit ? '|unlit' : ''}${NIGHT ? '|night' : ''}`;
  const hit = areaCache.get(areaId);
  if (hit && hit.key === key) { areaCache.delete(areaId); areaCache.set(areaId, hit); return hit; }
  const [x0, y0, x1, y1] = cacheBounds(areaId);
  const W = Math.ceil((x1 - x0) * scale), H = Math.ceil((y1 - y0) * scale);
  const cv = hit && hit.canvas.width === W && hit.canvas.height === H ? hit.canvas : makeCanvas(W, H);
  const g = cv.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
  // exact per-axis scale so the bitmap maps onto [x0, x1] × [y0, y1] with no half-covered last row or column
  const sx = W / (x1 - x0), sy = H / (y1 - y0);
  g.setTransform(sx, 0, 0, sy, -x0 * sx, -y0 * sy);
  if (NIGHT) NIGHT_LIGHTS = [];
  try { paintArea(g, areaId, info); } finally { if (NIGHT) { const l = NIGHT_LIGHTS; NIGHT_LIGHTS = null; gradeNight(g, W, H, l); } }
  g.setTransform(1, 0, 0, 1, 0, 0);
  const entry = { key, canvas: cv, x0, y0, w: x1 - x0, h: y1 - y0, scale };
  areaCache.delete(areaId); areaCache.set(areaId, entry);
  while (areaCache.size > MAX_AREA_CACHE) areaCache.delete(areaCache.keys().next().value);
  return entry;
}
export function clearCafeArtCache() { areaCache.clear(); spriteCache.clear(); }

/** Back-to-front paint order (the rooftop sits on the counter; neighbours overlap at their seams). */
// (the ferry dock paints last: its ferry's stern overhangs the first village area's span)
export const PAINT_ORDER = ['pier', 'garden', 'kitchen', 'counter', 'terrace', 'rooftop', 'boathouse', 'flowerStall', 'beachHuts', 'lighthouse', 'bandstand',
  ...CAFE_AREAS.slice(12).map((a) => a.id), 'ferryDock'];

const beamGrads = new WeakMap(); // ctx -> the lighthouse beam gradient (fixed in the beam's local space)
/** Small per-frame touches over the cached areas: steam and the lighthouse beam. */
export function paintAreaLive(ctx, areaId, info, t = 0, reduced = false) {
  if (reduced) return;
  const done = (info && info.done) || {};
  if (areaId === 'counter' && done.counter_espresso != null) steam(ctx, 720, -130, t);
  if (areaId === 'kitchen' && done.kitchen_range != null) steam(ctx, 1950, -100, t + 1.3);
  if (areaId === 'pier' && done.pier_hut != null) steam(ctx, 4350, -170, t + 0.6);
  if (areaId === 'lighthouse' && done.lighthouse_lamp != null) {
    const a = Math.sin(t * 0.5) * 0.9;
    ctx.save(); ctx.translate(8130, -408); ctx.rotate(a);
    let gg = beamGrads.get(ctx);
    if (!gg) { gg = ctx.createLinearGradient(0, 0, 900, 0); gg.addColorStop(0, 'rgba(255,240,190,0.45)'); gg.addColorStop(1, 'rgba(255,240,190,0)'); beamGrads.set(ctx, gg); }
    ctx.fillStyle = gg; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(900, -90); ctx.lineTo(900, 90); ctx.closePath(); ctx.fill();
    ctx.scale(-1, 1); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(900, -90); ctx.lineTo(900, 90); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}
function steam(ctx, x, y, t) {
  ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  for (let k = 0; k < 3; k++) {
    const p = ((t * 0.35 + k / 3) % 1);
    ctx.globalAlpha = Math.sin(p * Math.PI) * 0.7;
    const yy = y - p * 70, xx = x + (k - 1) * 12;
    ctx.beginPath(); ctx.moveTo(xx, yy + 20); ctx.bezierCurveTo(xx - 10, yy + 10, xx + 10, yy, xx, yy - 14); ctx.stroke();
  }
  ctx.restore();
}

/** Where each Regular lives once moved in (feet position, world). */
export const KEEPER_SPOTS = {
  terrace: { x: 420, y: 352 }, counter: { x: 1300, y: 318 }, kitchen: { x: 2230, y: 318 }, garden: { x: 3160, y: 330 },
  pier: { x: 4140, y: 296 }, rooftop: { x: 1290, y: -262 }, boathouse: { x: 5240, y: 345 },
};
/** Where Pip waits in each area (feet position, world). */
export const PIP_SPOTS = Object.fromEntries(CAFE_AREAS.map((a) => {
  const cx = AREA_X[a.id];
  const spot = a.id === 'rooftop' ? { x: 640, y: -262 } : a.id === 'pier' ? { x: 3660, y: 296 } : a.id === 'terrace' ? { x: -400, y: 360 } : { x: cx - 340, y: 352 };
  return [a.id, spot];
}));

// ------------------------------------------------------------------ chips + postcard

/** Paint a framed preview of one prop into a canvas (sized by the caller in device px). */
export function paintPropChip(canvas, propId, state = 'built', styleIdx = 0, { bg = '#fbf3e6' } = {}) {
  const d = PROPS[propId];
  const g = canvas && canvas.getContext && canvas.getContext('2d');
  if (!d || !g) return;
  const W = canvas.width, H = canvas.height;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
  const grd = g.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, bg); grd.addColorStop(1, mix(bg, '#e9d6bb', 0.6));
  g.fillStyle = grd; g.fillRect(0, 0, W, H);
  const [x0, y0, x1, y1] = d.box;
  // wide props (steps, bunting) are cropped at the sides rather than shrunk to a sliver
  const s = Math.min((H * 0.78) / (y1 - y0), 1.35 * (W * 0.86) / (x1 - x0));
  g.fillStyle = 'rgba(120,84,50,.10)'; g.beginPath(); g.ellipse(W / 2, H * 0.52 + ((y1 - y0) / 2) * s, Math.min(W * 0.4, ((x1 - x0) / 2) * s), H * 0.04, 0, 0, TAU); g.fill();
  g.save();
  g.translate(W / 2 - ((x0 + x1) / 2) * s, H * 0.52 - ((y0 + y1) / 2) * s); g.scale(s, s);
  drawProp(g, propId, state, styleIdx, 0);
  g.restore();
}

/** A share postcard of an area (the caller sizes the canvas, e.g. 1080 × 1350). */
export function paintAreaPostcard(canvas, areaId, info = {}) {
  const g = canvas && canvas.getContext && canvas.getContext('2d');
  const area = CAFE_AREA_BY_ID[areaId];
  if (!g || !area) return;
  const W = canvas.width, H = canvas.height, pad = W * 0.06;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = '#fbf3e6'; g.fillRect(0, 0, W, H);
  const [bx0, by0, bx1, by1] = areaBounds(areaId);
  const iw = W - pad * 2, ih = H * 0.72;
  const s = Math.min(iw / (bx1 - bx0), ih / (by1 - by0)) * 1.12;
  const cx = (bx0 + bx1) / 2, cy = (by0 + by1) / 2;
  g.save(); g.beginPath(); g.rect(pad, pad, iw, ih); g.clip();
  g.setTransform(s, 0, 0, s, pad + iw / 2 - cx * s, pad + ih / 2 - cy * s);
  const view = { x0: cx - iw / 2 / s, x1: cx + iw / 2 / s, y0: cy - ih / 2 / s, y1: cy + ih / 2 / s };
  paintBackdrop(g, view, { starsLit: areaId === 'rooftop', reduced: true });
  paintWater(g, view, 0, true);
  if (areaId === 'rooftop') { const c = renderArea('counter', info.under || {}, s); if (c) g.drawImage(c.canvas, c.x0, c.y0, c.w, c.h); }
  const e = renderArea(areaId, info, s);
  if (e) g.drawImage(e.canvas, e.x0, e.y0, e.w, e.h);
  g.restore();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.strokeStyle = '#6b4a3a'; g.lineWidth = W * 0.006; g.strokeRect(pad, pad, iw, ih);
  g.fillStyle = '#3b2a20'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `italic 700 ${Math.round(W * 0.07)}px ${SERIF}`; g.fillText(area.name, W / 2, pad + ih + H * 0.08);
  g.font = `500 ${Math.round(W * 0.036)}px ${ROUND}`; g.fillStyle = '#7a6555'; g.fillText(tr('cafe.restoredAt'), W / 2, pad + ih + H * 0.15);
}
