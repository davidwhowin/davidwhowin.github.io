// Café restoration art, Books 3–9 (chapters 13–50): the village, the riverside, the cliffs, the seafront, the
// hills, the island and the road home. Same painted style and the same rules as Books 1–2 in cafeArt.js, which
// installs this module once at load (installBooks): it lends us its drawing primitives and shared state, and we add
// our props (PROPS + INK), our area shells (SHELLS) and nothing else. Presentation only; every bit of noise is
// seeded (the R handed over by cafeArt), never unseeded.
//
// Layout: area i (index in CAFE_AREAS, 12…49) is centred at x = (i − 1) × 1000. Each area keeps its shell and its
// props' ink inside its own 1000-unit span (tests/cafe.test.mjs checks it), so the caches either side of a seam
// paint identical ground and never cover each other's props. The ground itself (promenade, lawns, bays, beach,
// rocks, the quay wall and its water-fade foot) is world-positioned in cafeArt.js (FRONT / QUAYS / heaps / shores).
import { CAFE_AREAS } from '../meta/cafeData.js';

let K = null;
/** World y of the prop being painted (fade() needs it to find the water line in local coordinates). */
let PY = 0;
let X = null, C = (h) => h, BR = false, R = () => 0.5;
const sync = () => { const s = K.state(); X = s.X; C = s.C; BR = s.BR; R = s.R; };
const wrap = (fn) => (s) => { sync(); fn(s); };

let rr, el, poly, ln, box, fill, fo, out, shadow, glow, txt, speckle, planks, bloom, bush, flowersOn, swag, wire, dustSheet,
  star, bunting, lightString, pot, stripes, bench, chair, bistroTable, lampPost, hut, crate, parcel, mix, dk, lt, landTop,
  backland, front, wallCol, freshness, seaScope;

const TAU = Math.PI * 2;
const OUT = '#6b4a3a';
const SERIF = "'Iowan Old Style','Palatino Linotype',Georgia,serif";
const ROUND = "Fredoka,'Baloo 2',ui-rounded,system-ui,sans-serif";
const GROUND = 200, QUAY = 400, WATER = 470;
const WOOD = '#a0724a', OAK = '#b98a5a', IRON = '#3d4a52', CREAM = '#fbf6ec', GOLD = '#d9a640', TRUNK = '#8a6a4a';
const mk = (box, draw) => ({ box, draw });
const pick = (v, s) => (Array.isArray(v) ? v[s] : v);
/** Broken text: every third letter has worn away. */
const worn = (t) => (BR ? [...t].map((c, i) => (i % 3 === 1 ? ' ' : c)).join('') : t);
function archPath(x, y, w, h) { X.beginPath(); X.moveTo(x, y + h); X.lineTo(x, y + w / 2); X.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); X.lineTo(x + w, y + h); X.closePath(); }
function post(x, y0, y1, col = WOOD, w = 7) { ln(x, y0, x, y1, OUT, w + 4); ln(x, y0, x, y1, col, w); }
function wheel(x, y, r, col = '#3d3a3f', flat = false) {
  if (flat) { el(x, y + r * 0.3, r, r * 0.7); X.strokeStyle = OUT; X.lineWidth = 9; X.stroke(); X.strokeStyle = C(col); X.lineWidth = 5; X.stroke(); return; }
  el(x, y, r); X.strokeStyle = OUT; X.lineWidth = 9; X.stroke(); X.strokeStyle = C(col); X.lineWidth = 5; X.stroke();
  for (let k = 0; k < 6; k++) { const a = k * TAU / 6; ln(x, y, x + Math.cos(a) * r, y + Math.sin(a) * r, col, 2); }
  el(x, y, 5); fo(col, 2);
}
function crack(x, y, len) { ln(x, y, x + len * 0.3, y + len * 0.4, '#7a6a5a', 2.5); ln(x + len * 0.3, y + len * 0.4, x + len * 0.1, y + len, '#7a6a5a', 2.5); }

// ------------------------------------------------------------------ small goods (windows, stalls, tables)
function good(kind, x, y) {
  switch (kind) {
    case 'loaf': el(x, y - 11, 19, 11); fo('#d99a55', 3); el(x, y - 25, 11, 8); fo('#e0a865', 3); ln(x - 8, y - 13, x - 2, y - 7, '#b27a3e', 2); ln(x + 2, y - 13, x + 8, y - 7, '#b27a3e', 2); break;
    case 'bun': el(x, y - 8, 15, 9); fo('#e8b070', 3); el(x, y - 13, 12, 5); fill('#fff6ea'); el(x, y - 19, 4); fill('#d0483a'); break;
    case 'plait': for (let i = 0; i < 4; i++) { el(x - 15 + i * 10, y - 10, 9, 12); fo('#d08c48', 2.5); } break;
    case 'sponge': rr(x - 22, y - 30, 44, 28, 6); fo('#f3d7a0', 3); X.fillStyle = C('#d0564a'); X.fillRect(x - 21, y - 18, 42, 5); el(x, y - 30, 20, 4); fill('#fffaf0'); break;
    case 'scone': el(x, y - 10, 15, 10); fo('#e6b277', 3); el(x, y - 20, 9, 4); fill('#fff6ea'); el(x, y - 23, 5, 3); fill('#c0392b'); break;
    case 'lemon': rr(x - 22, y - 22, 44, 20, 4); fo('#f6dd7a', 3); for (let k = -1; k <= 1; k++) ln(x + k * 12 - 4, y - 22, x + k * 12 + 4, y - 12, '#fffaf0', 2); break;
    case 'tart': el(x, y - 6, 18, 6); fo('#e0a865', 3); for (let k = -1; k <= 1; k++) { el(x + k * 8, y - 9, 4); fill(['#d0483a', '#7a4fa0', '#f2a33a'][k + 1]); } break;
    case 'cake': rr(x - 20, y - 34, 40, 32, 5); fo('#f5c6c0', 3); X.fillStyle = C('#fffaf0'); X.fillRect(x - 19, y - 22, 38, 4); el(x, y - 38, 4); fill('#d0483a'); break;
    case 'books': { const cols = ['#2f6f6a', '#c0583c', '#2f4a6b', '#d9a640', '#7a4fa0']; for (let i = 0; i < 5; i++) { const h = 30 + (i * 7) % 12; rr(x - 22 + i * 9, y - h, 8, h, 1); fo(cols[i], 2); } break; }
    case 'bookStand': rr(x - 16, y - 40, 32, 38, 2); fo('#f1e7d0', 2.5); ln(x - 10, y - 30, x + 10, y - 30, '#8a7a6a', 2); ln(x - 10, y - 22, x + 8, y - 22, '#8a7a6a', 2); break;
    case 'shell': X.beginPath(); X.moveTo(x, y); X.arc(x, y - 12, 14, Math.PI * 0.95, Math.PI * 0.05, false); X.closePath(); fo('#f6d6c4', 2.5); for (let k = -2; k <= 2; k++) ln(x, y - 1, x + k * 5, y - 20, '#c99a84', 1.5); break;
    case 'vase': rr(x - 7, y - 20, 14, 20, 5); fo('#9fd3bf', 2.5); bloom(x - 5, y - 26, 7, '#e8846f'); bloom(x + 6, y - 30, 7, '#f4d27a'); break;
    case 'apple': for (let k = 0; k < 5; k++) { el(x - 18 + k * 9, y - 8 - (k % 2) * 7, 7); fo(k % 2 ? '#d9443c' : '#e0573f', 2); } break;
    case 'pear': for (let k = 0; k < 4; k++) { el(x - 14 + k * 9, y - 9 - (k % 2) * 5, 6, 9); fo('#d6c25a', 2); } break;
    case 'greenApple': for (let k = 0; k < 5; k++) { el(x - 18 + k * 9, y - 8 - (k % 2) * 7, 7); fo('#9cc65a', 2); } break;
    case 'cheese': X.beginPath(); X.moveTo(x - 20, y); X.lineTo(x + 20, y); X.lineTo(x + 20, y - 16); X.lineTo(x - 20, y - 26); X.closePath(); fo('#f2cf63', 2.5); el(x + 6, y - 9, 3); fill('#d9b040'); break;
    case 'wheel': el(x, y - 13, 22, 13); fo('#e9c25a', 2.5); el(x, y - 18, 20, 6); fill('#f4d77a'); break;
    case 'fish': X.beginPath(); X.ellipse(x, y - 8, 20, 7, 0, 0, TAU); fo('#a9c3cc', 2.5); poly(x + 18, y - 8, x + 28, y - 15, x + 28, y - 1); fo('#a9c3cc', 2); el(x - 12, y - 9, 2); fill('#2f2a28'); break;
    case 'eggs': for (let k = 0; k < 5; k++) { el(x - 16 + k * 8, y - 7 - (k % 2) * 5, 5, 7); fo(k % 2 ? '#f6e6cf' : '#e9c8a0', 2); } break;
    case 'jar': rr(x - 9, y - 22, 18, 22, 4); fo('#e8a33a', 2.5); rr(x - 10, y - 26, 20, 6, 2); fo('#e9e1d2', 2); break;
    case 'milk': rr(x - 7, y - 26, 14, 26, 4); fo('#fbfaf6', 2.5); rr(x - 5, y - 30, 10, 5, 1); fo('#4f84b3', 2); break;
    case 'carrot': for (let k = 0; k < 4; k++) { poly(x - 16 + k * 10, y - 4, x - 10 + k * 10, y - 4, x - 13 + k * 10, y + 14); fo('#ef8a3a', 2); ln(x - 13 + k * 10, y - 4, x - 15 + k * 10, y - 16, '#5f9a5a', 3); } break;
    case 'cabbage': for (let k = 0; k < 3; k++) { el(x - 14 + k * 14, y - 10, 10); fo('#8cc06a', 2.5); el(x - 16 + k * 14, y - 12, 5); fill('#b5d98f'); } break;
    case 'squash': for (let k = 0; k < 3; k++) { el(x - 14 + k * 14, y - 9, 10, 9); fo(['#f2a33a', '#e8c25a', '#d9824a'][k], 2.5); } break;
    case 'pumpkin': el(x, y - 14, 20, 14); fo('#ef8a3a', 3); ln(x, y - 27, x, y - 1, '#c9682a', 2); ln(x, y - 28, x + 3, y - 36, '#5f7a3a', 3); break;
    case 'pie': el(x, y - 8, 20, 8); fo('#d9a05a', 3); for (let k = -1; k <= 1; k++) ln(x + k * 9 - 4, y - 12, x + k * 9 + 4, y - 4, '#b27a3e', 2); break;
    case 'bread': good('loaf', x, y); break;
    case 'cup': rr(x - 8, y - 14, 16, 14, 3); fo('#ffffff', 2.5); X.beginPath(); X.arc(x + 9, y - 8, 4, -1.2, 1.2); X.strokeStyle = C(OUT); X.lineWidth = 2; X.stroke(); break;
    case 'teapot': el(x, y - 13, 15, 12); fo('#f5c6c0', 2.5); poly(x + 13, y - 14, x + 24, y - 22, x + 15, y - 8); fo('#f5c6c0', 2); el(x, y - 26, 5, 3); fo('#f5c6c0', 2); break;
    case 'flowers': bloom(x - 9, y - 12, 8, '#e8846f'); bloom(x + 8, y - 16, 8, '#f4d27a'); bloom(x, y - 6, 7, '#b9a3d6'); break;
    default: break;
  }
}
const GOODS = {
  loaves: ['loaf', 'loaf', 'loaf'], buns: ['bun', 'bun', 'bun'], plait: ['plait', 'loaf', 'plait'],
  favourites: ['books', 'bookStand', 'books'], seaside: ['books', 'shell', 'books'], poetry: ['books', 'vase', 'bookStand'],
  sponges: ['sponge', 'cake', 'sponge'], scones: ['scone', 'teapot', 'scone'], lemon: ['lemon', 'cup', 'lemon'], tarts: ['tart', 'tart', 'tart'],
};
function goodsRow(kinds, x0, x1, y) { const n = kinds.length * 2 - 1, step = (x1 - x0) / n; for (let i = 0; i < n; i++) good(kinds[i % kinds.length], x0 + step * (i + 0.5), y); }

// ------------------------------------------------------------------ the kit (each returns { box, draw(s) }, local coords, y 0 = ground)
const door = ({ cols, w = 110, h = 190, frame = CREAM, kind = 'panel', fan = false }) => mk([-w / 2 - 22, -h - (fan ? w / 2 + 14 : 16), w / 2 + 22, 10], (s) => {
  const col = pick(cols, s);
  shadow(0, 4, w * 0.7, 7);
  rr(-w / 2 - 18, -4, w + 36, 12, 3); fo('#d9cfbf', 3.5);
  if (fan) { X.beginPath(); X.arc(0, -h - 12, w / 2 + 12, Math.PI, 0); X.closePath(); fo(frame); X.beginPath(); X.arc(0, -h - 12, w / 2 - 2, Math.PI, 0); X.closePath(); fo(BR ? '#9a9080' : '#ffe6a8', 3); for (let k = 1; k < 5; k++) { const a = Math.PI + k * Math.PI / 5; ln(0, -h - 12, Math.cos(a) * (w / 2 - 2), -h - 12 + Math.sin(a) * (w / 2 - 2), frame, 3); } }
  const body = () => (kind === 'arch' ? archPath(-w / 2, -h, w, h) : rr(-w / 2, -h, w, h, 3));
  if (kind === 'arch') { archPath(-w / 2 - 12, -h - 12, w + 24, h + 12); fo(frame); } else { rr(-w / 2 - 12, -h - 12, w + 24, h + 12, 3); fo(frame); }
  body(); fo(BR ? mix(col, '#a49a8e', 0.5) : col);
  X.save(); body(); X.clip();
  if (kind === 'plank' || kind === 'arch' || kind === 'studded') planks(-w / 2, -h, w, h, BR ? mix(col, '#a49a8e', 0.5) : col, 22, true);
  if (kind === 'studded') { for (let y = -h + 30; y < -10; y += 34) for (let x = -w / 2 + 14; x < w / 2; x += 26) { el(x, y, 3.5); fill('#3d3a3f'); } }
  if (kind === 'panel' || kind === 'stable') {
    rr(-w / 2 + 12, -h + 12, w - 24, h * 0.3, 3); fo(BR ? '#8f877d' : '#ffe9bf', 3);
    if (!BR) { X.fillStyle = 'rgba(255,255,255,.35)'; poly(-w / 2 + 14, -h + 14, -w / 2 + 40, -h + 14, -w / 2 + 14, -h + 40); X.fill(); }
    for (const px of [-w / 2 + 12, 6]) { rr(px, -h * 0.5, w / 2 - 18, h * 0.38, 3); out(2.5, dk(col, 0.35)); }
    if (kind === 'stable') ln(-w / 2, -h * 0.55, w / 2, -h * 0.55, dk(col, 0.35), 5);
  }
  X.restore(); body(); out(4);
  el(w / 2 - 16, -h * 0.45, 5.5); fo(GOLD, 2.5);
  if (BR) { for (const [a, b] of [[-0.62, -0.42], [-0.3, -0.12]]) { ln(-w / 2 - 6, h * a, w / 2 + 6, h * b, '#b9a080', 12); ln(-w / 2 - 6, h * a, w / 2 + 6, h * b, OUT, 2); } }
  else { rr(-14, -h * 0.66, 28, 9, 2); fo(GOLD, 2); }
});

const sign = ({ text, cols, w = 300, h = 70, hang = false, font = SERIF, size = 34, italic = false, shape = 'board' }) =>
  mk(hang ? [-w / 2 - 34, -h / 2 - 62, w / 2 + 8, h / 2 + 8] : [-w / 2 - 8, -h / 2 - 8, w / 2 + 8, h / 2 + 8], (s) => {
    const [bg, fg, edge] = cols[s];
    X.save();
    if (hang) {
      ln(-w / 2 - 28, -h / 2 - 54, w / 2 - 10, -h / 2 - 54, IRON, 6); ln(-w / 2 - 28, -h / 2 - 60, -w / 2 - 28, -h / 2 - 20, IRON, 7);
      ln(-w / 2 - 28, -h / 2 - 22, -w / 2 + 10, -h / 2 - 54, IRON, 3);
      if (BR) { X.translate(-w / 2 + 16, -h / 2 - 54); X.rotate(0.22); X.translate(w / 2 - 16, h / 2 + 54); }
      ln(-w / 2 + 16, -h / 2 - 54, -w / 2 + 16, -h / 2, '#6b5040', 2.5); ln(w / 2 - 16, -h / 2 - 54, w / 2 - 16, -h / 2, '#6b5040', 2.5);
    } else if (BR) X.rotate(-0.04);
    const sh = (d) => (shape === 'oval' ? el(0, 0, w / 2 - d, h / 2 - d) : rr(-w / 2 + d, -h / 2 + d, w - 2 * d, h - 2 * d, shape === 'round' ? h / 2 : 10));
    sh(0); fo(edge, 4); sh(7); fo(bg, 3);
    txt(worn(pick(text, s)), 0, 2, size, fg, { font, italic, maxW: w - 30 });
    if (BR) crack(w * 0.18, -h / 2 + 6, h - 14);
    X.restore();
  });

const awning = ({ cols, w = 320, d = 60, scallop = true }) => mk([-w / 2 - 26, -8, w / 2 + 26, d + 22], (s) => {
  const [a, b] = cols[s];
  const sh = () => poly(-w / 2, 0, w / 2, 0, w / 2 + 20, d, -w / 2 - 20, d);
  ln(-w / 2 + 8, 0, -w / 2 - 16, d - 4, '#6b5040', 4); ln(w / 2 - 8, 0, w / 2 + 16, d - 4, '#6b5040', 4);
  if (BR) {
    ln(-w / 2 - 20, d, w / 2 + 20, d, '#6b5040', 5); ln(-w / 2, 0, w / 2, 0, '#6b5040', 5);
    for (const [x, len] of [[-w * 0.36, 0.8], [-w * 0.06, 0.5], [w * 0.22, 0.95]]) { poly(x, 0, x + 40, 0, x + 46, d * len, x + 8, d * len + 12); fo(a, 3); }
    return;
  }
  sh(); fill(a); X.save(); sh(); X.clip(); stripes(-w / 2 - 24, 0, w + 48, d + 2, [a, b], 28); X.fillStyle = 'rgba(60,30,20,.12)'; X.fillRect(-w / 2 - 24, 0, w + 48, 12); X.restore(); sh(); out(4);
  for (let x = -w / 2 - 20, i = 0; x < w / 2 + 20 - 1; x += 28, i++) {
    X.beginPath(); X.moveTo(x, d); X.lineTo(x + 28, d);
    if (scallop) X.arc(x + 14, d, 14, 0, Math.PI); else X.lineTo(x + 14, d + 16);
    X.closePath(); fo(i % 2 ? b : a, 3);
  }
});

const shopWindow = ({ w = 240, h = 130, frame = CREAM, goods, bay = false }) => mk([-w / 2 - (bay ? 26 : 16), -h - (bay ? 52 : 16), w / 2 + (bay ? 26 : 16), 16], (s) => {
  const fr = pick(frame, s);
  if (bay) { poly(-w / 2 - 24, -h - 10, w / 2 + 24, -h - 10, w / 2, -h - 48, -w / 2, -h - 48); fo(dk(fr, 0.15)); }
  rr(-w / 2 - 12, -h - 12, w + 24, h + 12, 4); fo(fr);
  rr(-w / 2, -h, w, h - 6, 3); fo(BR ? '#b8b0a4' : '#ffe9bf', 3);
  X.save(); rr(-w / 2, -h, w, h - 6, 3); X.clip();
  if (BR) {
    X.globalAlpha = 0.55; X.strokeStyle = '#efe8dc'; X.lineWidth = 10; X.lineCap = 'round';
    for (let k = 0; k < 5; k++) { X.beginPath(); X.arc(-w / 2 + 30 + k * w / 5, -h / 2, 30 + k * 4, 0.4, 2.6); X.stroke(); }
    X.globalAlpha = 1;
  } else {
    const g = X.createRadialGradient(0, -h / 2, 10, 0, -h / 2, w * 0.6); g.addColorStop(0, 'rgba(255,200,120,.55)'); g.addColorStop(1, 'rgba(255,214,140,0)');
    X.fillStyle = g; X.fillRect(-w / 2, -h, w, h);
    X.fillStyle = C('#c98f5a'); X.fillRect(-w / 2, -h * 0.5, w, 6); X.fillRect(-w / 2, -12, w, 6);
    const kinds = GOODS[pick(goods, s)] || GOODS.loaves;
    goodsRow(kinds, -w / 2 + 6, -6, -h * 0.5); goodsRow(kinds, 6, w / 2 - 6, -h * 0.5);
    goodsRow(kinds.slice().reverse(), -w / 2 + 6, w / 2 - 6, -12);
    X.fillStyle = 'rgba(255,255,255,.35)'; poly(-w / 2 + 6, -h, -w / 2 + 50, -h, -w / 2 + 6, -h + 50); X.fill();
  }
  X.restore();
  ln(0, -h, 0, -6, fr, 6); ln(-w / 2, -h + 26, w / 2, -h + 26, fr, 5);
  rr(-w / 2, -h, w, h - 6, 3); out(3);
  rr(-w / 2 - 18, -6, w + 36, 14, 3); fo(lt(fr, 0.1), 3.5);
});

const benchK = ({ cols, w = 190, pair = 0 }) => mk(pair ? [-pair - w / 2 - 6, -110, pair + w / 2 + 6, 12] : [-w / 2 - 6, -110, w / 2 + 6, 12], (s) => {
  const xs = pair ? [-pair, pair] : [0];
  xs.forEach((x, i) => {
    if (BR && i === xs.length - 1) {
      X.save(); X.translate(x, 0); X.rotate(0.05); bench(0, 0, w, pick(cols, s), s); X.restore();
      rr(x - w * 0.35, -4, w * 0.5, 10, 3); fo(pick(cols, s), 3); return;
    }
    bench(x, 0, w, pick(cols, s), s);
  });
});

const lamps = ({ dx = 300, h = 240 }) => mk([-dx - 30, -h - 76, dx + 30, 8], (s) => {
  for (const x of [-dx, dx]) {
    if (BR && x > 0) { X.save(); X.translate(x, 0); X.rotate(0.08); lampPost(0, 0, h, s, false); X.restore(); continue; }
    lampPost(x, 0, h, s, !BR);
  }
});

/** A string of lights between two posts (or two wall hooks when posts is false). */
const lightsK = ({ w = 600, h = 300, kinds, cols, sag = 60, n = 10, posts = true, postCol = WOOD }) => mk([-w / 2 - 12, -h - 10, w / 2 + 12, posts ? 6 : -h + sag + 40], (s) => {
  if (posts) for (const x of [-w / 2, w / 2]) { shadow(x, 0, 14, 4); post(x, 0, -h, postCol, 7); el(x, -h - 4, 6); fo(postCol, 2.5); }
  else for (const x of [-w / 2, w / 2]) { el(x, -h + 4, 6); fo(IRON, 2.5); }
  const kind = pick(kinds, s), col = pick(cols, s);
  if (BR) { lightString(swag(-w / 2, -h + 6, -w * 0.05, posts ? -12 : -h + sag + 30, 30, 6), kind, col, false); return; }
  lightString(swag(-w / 2, -h + 6, w / 2, -h + 6, sag, n), kind, col, true);
});

const buntingK = ({ w = 600, h = 300, cols, shapes = 'tri', sag = 50, n = 12, posts = true, size = 26, postCol = WOOD }) => mk([-w / 2 - 12, -h - 10, w / 2 + 12, posts ? 6 : -h + sag + size * 1.2 + 10], (s) => {
  if (posts) for (const x of [-w / 2, w / 2]) { shadow(x, 0, 14, 4); post(x, 0, -h, postCol, 7); el(x, -h - 4, 6); fo(postCol, 2.5); }
  else for (const x of [-w / 2, w / 2]) { el(x, -h + 4, 6); fo(IRON, 2.5); }
  const c = cols[s], shape = pick(shapes, s);
  if (BR) { bunting(swag(-w / 2, -h + 6, -w * 0.1, posts ? -16 : -h + sag + 20, 20, 5), c, size, shape); return; }
  bunting(swag(-w / 2, -h + 6, w / 2, -h + 6, sag, n), c, size, shape);
});

const SIGNAL = [['#d0483a', '#ffffff'], ['#2f4a6b', '#f4d27a'], ['#f4d27a', '#d0483a'], ['#ffffff', '#2f4a6b'], ['#d0483a', '#f4d27a'], ['#2f4a6b', '#ffffff']];
/** A flagstaff with a halyard of flags: 'signal' squares, long 'pennant's or 'bunting'. */
const mast = ({ h = 300, kinds = ['signal', 'pennant', 'bunting'], col = '#f1ebe0', cols = null }) => mk([-26, -h - 20, 150, 8], (s) => {
  shadow(0, 0, 24, 5); rr(-16, -14, 32, 14, 3); fo('#d9cfbf', 3);
  post(0, -12, -h, col, 7); el(0, -h - 6, 8); fo(GOLD, 3);
  ln(-34, -h + 50, 34, -h + 50, col, 5);
  const kind = pick(kinds, s), palette = cols ? cols[s] : null;
  if (BR) { wire(swag(4, -h + 6, 110, -4, 30, 4), '#8a7a6a', 2.5); poly(90, -2, 124, -2, 112, -14); fo('#c9c0b2', 2.5); return; }
  const pts = swag(4, -h + 6, 130, -6, -10, 7);
  wire(pts, '#6b5040', 2.5);
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i];
    if (kind === 'signal') { const [a, b] = palette ? [palette[i % palette.length], '#ffffff'] : SIGNAL[i % SIGNAL.length]; rr(x - 13, y, 26, 26, 2); fo(a, 2.5); X.save(); rr(x - 13, y, 26, 26, 2); X.clip(); X.fillStyle = C(b); if (i % 3 === 0) X.fillRect(x - 13, y + 9, 26, 8); else if (i % 3 === 1) X.fillRect(x - 13, y, 13, 26); else { el(x, y + 13, 7); fill(b); } X.restore(); }
    else if (kind === 'pennant') { poly(x, y, x + 46, y + 9, x, y + 18); fo((palette || ['#d0483a', '#f4d27a', '#4f84b3', '#8fcfb5'])[i % 4], 2.5); }
    else { poly(x - 12, y, x + 12, y, x, y + 26); fo((palette || ['#e8846f', '#f4d27a', '#8fcfb5', '#b9a3d6', '#4f9fb3'])[i % 5], 2.5); }
  }
});

/** A tree: looks[s] = [leaf, dots, 'fruit' | 'bloom' | ''], kind 'round' | 'willow' | 'yew' | 'birch' | 'palm'. */
const treeK = ({ looks, w = 220, h = 300, kind = 'round' }) => mk([-w / 2 - 10, -h - w * 0.32, w / 2 + 10, 12], (s) => {
  const [leaf, dots, dk2] = looks[s];
  const k = pick(kind, s);
  shadow(0, 2, w * 0.36, 9);
  const bark = k === 'birch' ? '#efe8dc' : TRUNK;
  if (k === 'palm') {
    X.beginPath(); X.moveTo(-10, 0); X.quadraticCurveTo(-4, -h * 0.5, 14, -h); X.lineTo(26, -h); X.quadraticCurveTo(10, -h * 0.5, 12, 0); X.closePath(); fo(BR ? '#b9ab9b' : '#a07a55');
    for (let i = 0; i < (BR ? 3 : 7); i++) { const a = -Math.PI + i * Math.PI / 6 + (BR ? 0.6 : 0); X.save(); X.translate(20, -h); X.rotate(a); X.beginPath(); X.moveTo(0, 0); X.quadraticCurveTo(w * 0.25, -26, w * 0.5, 12); X.quadraticCurveTo(w * 0.25, 4, 0, 0); fo(BR ? '#a9a48c' : leaf, 3); X.restore(); }
    if (!BR && dk2 === 'bloom') { for (let i = 0; i < 5; i++) { el(-w * 0.3 + i * w * 0.15, 0, 12, 16); fo(dots, 2.5); } }
    return;
  }
  poly(-14, 0, 14, 0, 8, -h * 0.55, -8, -h * 0.55); fo(BR ? mix(bark, '#b9ab9b', 0.4) : bark);
  if (k === 'birch') for (let y = -20; y > -h * 0.5; y -= 26) ln(-8, y, 0, y - 3, '#3d3a3f', 3);
  ln(0, -h * 0.4, -w * 0.22, -h * 0.66, bark, 7); ln(0, -h * 0.45, w * 0.2, -h * 0.7, bark, 7);
  if (BR) { ln(-w * 0.22, -h * 0.66, -w * 0.3, -h * 0.85, bark, 4); ln(w * 0.2, -h * 0.7, w * 0.32, -h * 0.82, bark, 4); bush(0, -h * 0.72, w * 0.55, h * 0.3, '#9a9a80', 5); return; }
  if (k === 'yew') { poly(0, -h - 20, w * 0.36, -h * 0.25, -w * 0.36, -h * 0.25); fo(leaf); X.save(); poly(0, -h - 20, w * 0.36, -h * 0.25, -w * 0.36, -h * 0.25); X.clip(); speckle(-w / 2, -h - 20, w, h, dk(leaf, 0.3), 70, 8, 0.3); X.restore(); return; }
  const blobs = bush(0, -h * 0.62, w, h * 0.55, leaf, 8);
  if (k === 'willow') { X.save(); X.lineCap = 'round'; for (let i = 0; i < 16; i++) { const x = -w * 0.45 + i * w * 0.06; ln(x, -h * 0.7, x + 6, -h * 0.12 - (i % 3) * 18, dk(leaf, 0.05), 5); } X.restore(); }
  if (dk2 === 'fruit') { for (let i = 0; i < 14; i++) { const [bx, by, br] = blobs[i % blobs.length]; const a = R() * TAU, d = R() * br * 0.7; el(bx + Math.cos(a) * d, by + Math.sin(a) * d, 8); fo(dots, 2.5); } }
  else if (dk2 === 'bloom') flowersOn(blobs, Array.isArray(dots) ? dots : [dots, lt(dots, 0.4)], 9, 22);
});

const fence = ({ w = 360, cols, h = 70 }) => mk([-w / 2 - 8, -h - 12, w / 2 + 8, 8], (s) => {
  const col = pick(cols, s);
  rr(-w / 2, -h * 0.75, w, 9, 2); fo(col, 3); rr(-w / 2, -h * 0.32, w, 9, 2); fo(col, 3);
  for (let x = -w / 2 + 8, i = 0; x <= w / 2 - 8; x += 28, i++) {
    if (BR && i % 4 === 2) continue;
    X.save(); X.translate(x, 0); if (BR && i % 5 === 3) X.rotate(0.25);
    poly(-8, 0, 8, 0, 8, -h + 8, 0, -h, -8, -h + 8); fo(col, 3); X.restore();
  }
});

const fieldGate = ({ cols, w = 200 }) => mk([-w / 2 - 22, -132, w / 2 + 22, 10], (s) => {
  const col = pick(cols, s);
  for (const x of [-w / 2 - 10, w / 2 + 10]) { rr(x - 11, -126, 22, 126, 3); fo(TRUNK, 3.5); el(x, -126, 11, 5); fo(lt(TRUNK, 0.2), 2.5); }
  X.save(); X.translate(-w / 2, 0); if (BR) X.rotate(0.12);
  for (let i = 0; i < 5; i++) { if (BR && i === 2) continue; rr(0, -104 + i * 20, w, 9, 2); fo(col, 3); }
  ln(4, -16, w - 4, -100, col, 7); ln(w / 2, -104, w / 2, -16, col, 6); ln(4, -104, 4, -16, col, 8);
  X.restore();
});

const crates = ({ produce, w = 200 }) => mk([-w / 2 - 12, -128, w / 2 + 12, 10], (s) => {
  const p = pick(produce, s);
  const spots = [[-w / 2 + 40, 0], [w / 2 - 40, 0], [0, -54]];
  spots.forEach(([x, y], i) => {
    if (BR && i === 2) { X.save(); X.translate(x + 40, 0); X.rotate(0.5); crate(0, 0, 76, 50, '#b8a88e'); X.restore(); return; }
    crate(x, y, 76, 50, '#c9a06a');
    if (!BR) good(p, x, y - 50);
  });
});

const bikeK = ({ cols, load = 'bread' }) => mk([-104, -150, 120, 10], (s) => {
  const col = pick(cols, s), ld = pick(load, s);
  shadow(0, 2, 100, 8);
  X.save(); if (BR) X.rotate(-0.04);
  wheel(-60, -36, 34); wheel(60, -36, 34, '#3d3a3f', BR);
  const tube = (pts) => { X.beginPath(); X.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) X.lineTo(pts[i], pts[i + 1]); X.strokeStyle = OUT; X.lineWidth = 10; X.lineJoin = 'round'; X.stroke(); X.strokeStyle = C(col); X.lineWidth = 6; X.stroke(); };
  tube([-60, -36, -12, -36, -28, -92, -60, -36]); tube([-12, -36, 44, -90, 60, -36]); tube([-28, -92, 44, -90]);
  rr(-46, -104, 34, 10, 5); fo('#5b4636', 3); ln(44, -90, 40, -112, IRON, 5); ln(30, -114, 52, -112, IRON, 5);
  rr(56, -122, 58, 36, 6); fo('#c9a06a', 3); for (let x = 64; x < 112; x += 10) ln(x, -120, x, -88, '#a07850', 2);
  if (!BR) { if (ld === 'bread') { good('loaf', 72, -118); good('loaf', 98, -120); } else if (ld === 'flowers') good('flowers', 84, -118); else { parcel(76, -120, 26, 20, '#c9a06a'); parcel(100, -120, 20, 16, '#e9dcc4'); } }
  else { el(-20, -60, 6); fill('#a0724a'); el(30, -70, 5); fill('#a0724a'); }
  X.restore();
});

const cartK = ({ cols, load }) => mk([-150, -170, 160, 10], (s) => {
  const col = pick(cols, s), ld = pick(load, s);
  shadow(0, 2, 130, 9);
  if (BR) {
    X.save(); X.translate(-10, -20); X.rotate(0.14); rr(-110, -60, 200, 46, 4); fo(col); planks(-106, -56, 192, 38, col, 13); rr(-110, -60, 200, 46, 4); out(4); X.restore();
    X.save(); X.translate(120, -8); X.scale(1, 0.35); wheel(0, 0, 38); X.restore(); ln(90, -40, 150, -12, WOOD, 7);
    return;
  }
  ln(90, -64, 150, -104, OUT, 10); ln(90, -64, 150, -104, WOOD, 6); ln(-100, -40, -110, 0, WOOD, 7);
  rr(-110, -100, 200, 56, 4); fo(col); X.save(); rr(-110, -100, 200, 56, 4); X.clip(); planks(-110, -100, 200, 56, col, 14); X.restore(); rr(-110, -100, 200, 56, 4); out(4);
  wheel(-10, -36, 36, '#5b4636');
  const top = -100;
  if (ld === 'sacks') for (let i = 0; i < 3; i++) { X.beginPath(); X.ellipse(-70 + i * 56, top - 18, 30, 22, 0, 0, TAU); fo('#efe4cc', 3); }
  else if (ld === 'flowers') { const b = bush(-10, top - 6, 190, 50, '#6a9f50', 8, 3.5); flowersOn(b, ['#e8846f', '#f4d27a', '#b9a3d6', '#ffffff'], 9, 18); }
  else if (ld === 'hay') { rr(-104, top - 54, 190, 56, 14); fo('#e9cf7a'); for (let i = 0; i < 9; i++) ln(-96 + i * 21, top - 50, -90 + i * 21, top - 4, '#c9a85a', 2); }
  else if (ld === 'grapes') for (let i = 0; i < 4; i++) { for (let k = 0; k < 6; k++) { el(-80 + i * 46 + (k % 3) * 9 - 9, top - 10 - Math.floor(k / 3) * 9, 6); fo(i % 2 ? '#7a3f6a' : '#9cc65a', 2); } }
  else for (let i = 0; i < 5; i++) good(ld, -88 + i * 42, top);
});

const sacks = ({ marks }) => mk([-92, -110, 92, 8], (s) => {
  const m = pick(marks, s);
  const sack = (x, y, rot) => {
    X.save(); X.translate(x, y); X.rotate(rot);
    X.beginPath(); X.moveTo(-30, 0); X.quadraticCurveTo(-36, -50, -22, -62); X.lineTo(22, -62); X.quadraticCurveTo(36, -50, 30, 0); X.closePath(); fo(BR ? '#d4cbbd' : '#efe4cc', 3.5);
    ln(-20, -60, 20, -60, '#c9b48a', 4); poly(-12, -62, 12, -62, 6, -74, -6, -74); fo('#efe4cc', 3);
    if (!BR) { if (m === 'stripe') { ln(-30, -22, 30, -22, '#4f84b3', 4); ln(-31, -30, 31, -30, '#4f84b3', 4); } else if (m === 'stamp') { el(0, -28, 13); X.strokeStyle = C('#c0583c'); X.lineWidth = 3; X.stroke(); txt('F', 0, -28, 14, '#c0583c'); } }
    else { el(18, -10, 8, 4); fill('#e6ddcc'); }
    X.restore();
  };
  sack(-44, 0, -0.06); sack(42, 0, 0.05); if (!BR) sack(0, -46, 0.02); else { X.save(); X.translate(64, 0); X.rotate(1.3); sack(0, 0, 0); X.restore(); }
});

const barrels = ({ kinds, cols }) => mk([-110, -150, 110, 8], (s) => {
  const k = pick(kinds, s), col = cols ? cols[s] : '#a8784a';
  const barrel = (x, y) => {
    X.beginPath(); X.moveTo(x - 34, y); X.quadraticCurveTo(x - 44, y - 44, x - 34, y - 88); X.lineTo(x + 34, y - 88); X.quadraticCurveTo(x + 44, y - 44, x + 34, y); X.closePath(); fo(col);
    for (const yy of [y - 18, y - 70]) ln(x - 38, yy, x + 38, yy, '#5b5550', 5);
    el(x, y - 88, 34, 8); fo(lt(col, 0.2), 3);
  };
  if (BR) { barrel(-50, 0); X.save(); X.translate(50, -30); X.rotate(1.57); barrel(0, 30); X.restore(); return; }
  barrel(-50, 0); barrel(50, 0);
  if (k === 'planter') { for (const x of [-50, 50]) { const b = bush(x, -96, 90, 54, '#6a9f50', 5, 3.5); flowersOn(b, x < 0 ? ['#e8846f', '#ffffff'] : ['#b9a3d6', '#f4d27a'], 8, 9); } }
  else if (k === 'stack') { barrel(0, -90); }
});

const hayK = ({ kinds }) => mk([-130, -150, 130, 8], (s) => {
  const k = pick(kinds, s);
  const round = (x) => { el(x, -46, 46); fo('#e9cf7a', 4); for (let r = 12; r < 46; r += 12) { el(x, -46, r); X.strokeStyle = C('#c9a85a'); X.lineWidth = 2; X.stroke(); } };
  const sq = (x, y, w = 110) => { rr(x - w / 2, y - 48, w, 48, 6); fo('#e9cf7a', 4); for (let i = 1; i < 6; i++) ln(x - w / 2 + i * w / 6, y - 46, x - w / 2 + i * w / 6 + 4, y - 2, '#c9a85a', 2); ln(x - w / 2, y - 24, x + w / 2, y - 24, '#b0583c', 2); };
  if (BR) { sq(-50, 0); X.save(); X.globalAlpha = 0.7; for (let i = 0; i < 14; i++) ln(10 + i * 8, 0, 18 + i * 8, -10 - (i % 3) * 6, '#c9a85a', 3); X.restore(); return; }
  if (k === 'round') { round(-56); round(56); }
  else { sq(-58, 0); sq(58, 0); sq(0, -48); if (k === 'bunting') bunting(swag(-112, -60, 112, -60, 20, 7), ['#e8846f', '#f4d27a', '#8fcfb5'], 18); if (k === 'rugs') { rr(-48, -66, 96, 20, 4); fo('#d0564a', 2.5); stripes(-48, -66, 96, 20, ['#d0564a', '#f4d27a'], 12); } }
});

const stallK = ({ cols, goods, w = 240, h = 220 }) => mk([-w / 2 - 22, -h - 34, w / 2 + 22, 10], (s) => {
  const [a, b] = cols[s];
  shadow(0, 2, w * 0.55, 9);
  for (const x of [-w / 2 + 8, w / 2 - 8]) post(x, 0, -h, '#8a6a4a', 7);
  rr(-w / 2, -86, w, 14, 3); fo(OAK);
  rr(-w / 2 + 4, -72, w - 8, 66, 3); fo(lt(a, 0.5), 3); X.save(); rr(-w / 2 + 4, -72, w - 8, 66, 3); X.clip(); stripes(-w / 2, -72, w, 66, [lt(a, 0.5), lt(b, 0.2)], 20); X.restore();
  const roof = () => poly(-w / 2 - 18, -h + 4, w / 2 + 18, -h + 4, w / 2 - 6, -h - 30, -w / 2 + 6, -h - 30);
  if (BR) { ln(-w / 2 - 18, -h + 4, w / 2 + 18, -h + 4, '#6b5040', 5); for (const x of [-w * 0.3, w * 0.1]) { poly(x, -h - 2, x + 40, -h - 2, x + 34, -h + 50, x + 4, -h + 40); fo(a, 3); } crate(-w / 4, -86, 60, 34, '#b8a88e'); return; }
  roof(); fill(a); X.save(); roof(); X.clip(); stripes(-w / 2 - 20, -h - 32, w + 40, 40, [a, b], 26); X.restore(); roof(); out(4);
  for (let x = -w / 2 - 18, i = 0; x < w / 2 + 18 - 1; x += 26, i++) { X.beginPath(); X.moveTo(x, -h + 4); X.lineTo(x + 26, -h + 4); X.arc(x + 13, -h + 4, 13, 0, Math.PI); X.closePath(); fo(i % 2 ? b : a, 3); }
  const g = pick(goods, s);
  const list = Array.isArray(g) ? g : [g];
  for (let i = 0; i < 5; i++) good(list[i % list.length], -w / 2 + 28 + i * (w - 56) / 4, -86);
});

/** A chalk A-board ('aboard') or a noticeboard on two posts ('notice'). */
const boardK = ({ cols, kind = 'aboard', lines = ['Today', 'Tea & cake'] }) => mk(kind === 'notice' ? [-90, -190, 90, 8] : [-58, -150, 58, 8], (s) => {
  const [frame, face, ink] = cols[s];
  if (kind === 'notice') {
    for (const x of [-64, 64]) post(x, 0, -110, frame, 8);
    X.save(); if (BR) X.rotate(0.06);
    rr(-84, -186, 168, 100, 5); fo(frame); rr(-74, -176, 148, 80, 3); fo(face, 3);
    poly(-90, -186, 90, -186, 0, -206); fo(dk(frame, 0.15), 3.5);
    if (!BR) { for (const [x, y, c] of [[-46, -150, '#fff8ec'], [10, -160, '#f6dd7a'], [44, -128, '#bfe3d4'], [-20, -122, '#f5c6c0']]) { rr(x - 20, y - 16, 40, 32, 2); fo(c, 2); el(x, y - 13, 3); fill('#d0483a'); } }
    else { rr(-30, -140, 36, 28, 2); fo('#e6ddcc', 2); }
    X.restore(); return;
  }
  if (BR) { shadow(0, 0, 60, 8); poly(-60, 0, 60, 0, 50, -20, -50, -20); fo(frame); poly(-48, -4, 48, -4, 42, -16, -42, -16); fo(face, 2.5); return; }
  shadow(0, 2, 52, 7);
  ln(-44, 0, -30, -140, OUT, 9); ln(44, 0, 30, -140, OUT, 9);
  rr(-48, -140, 96, 116, 6); fo(frame); rr(-40, -132, 80, 100, 4); fo(face, 3);
  txt(lines[0], 0, -110, 18, ink, { font: ROUND, weight: 600, maxW: 70 });
  txt(lines[1] || '', 0, -84, 14, ink, { font: ROUND, weight: 500, maxW: 70 });
  star(-20, -54, 7); fill(ink); el(16, -54, 9, 6); X.strokeStyle = C(ink); X.lineWidth = 2; X.stroke();
});

const clockK = ({ cols, h = 250, wall = false }) => mk(wall ? [-56, -56, 56, 56] : [-52, -h - 66, 52, 8], (s) => {
  const [col, face] = cols[s];
  X.save();
  if (!wall) { shadow(0, 2, 34, 6); rr(-26, -34, 52, 34, 4); fo(col); if (BR) X.rotate(0.05); post(0, -34, -h + 30, col, 12); X.translate(0, -h - 14); }
  el(0, 0, 46); fo(col); el(0, 0, 37); fo(face, 3);
  for (let k = 0; k < 12; k++) { const a = k * TAU / 12; ln(Math.cos(a) * 30, Math.sin(a) * 30, Math.cos(a) * 34, Math.sin(a) * 34, '#3d3a3f', k % 3 ? 2 : 4); }
  if (BR) { crack(-12, -30, 50); ln(0, 0, 4, 18, '#3d3a3f', 3); }
  else { ln(0, 0, 0, -26, '#3d3a3f', 4); ln(0, 0, 18, 6, '#3d3a3f', 4); el(0, 0, 4); fill(GOLD); }
  if (!wall) { el(0, -50, 8); fo(GOLD, 3); }
  X.restore();
});

const hutK = ({ cols, w = 180, h = 240 }) => mk([-w / 2 - 24, -h - w * 0.44 - 6, w / 2 + 24, 10], (s) => {
  const [c, t, roof] = cols[s];
  hut(w, h, c, t, s, BR ? '#9a9088' : roof);
});

const bellK = ({ cols, roof = '#7f93ad' }) => mk([-76, -262, 76, 8], (s) => {
  const col = cols[s];
  for (const x of [-52, 52]) post(x, 0, -196, TRUNK, 9);
  ln(-60, -190, 60, -190, TRUNK, 9);
  if (!BR) { poly(-76, -194, 76, -194, 0, -258); fo(roof); }
  else { poly(-76, -194, -10, -194, -40, -230); fo(roof); }
  const bell = (x, y, rot) => { X.save(); X.translate(x, y); X.rotate(rot); X.beginPath(); X.moveTo(-32, 0); X.quadraticCurveTo(-30, -56, 0, -58); X.quadraticCurveTo(30, -56, 32, 0); X.lineTo(38, 8); X.lineTo(-38, 8); X.closePath(); fo(col); el(-12, -30, 6, 14); fill(lt(col, 0.4)); el(0, 12, 7); fo(dk(col, 0.2), 2.5); X.restore(); };
  if (BR) { bell(0, -6, 1.2); ln(0, -190, 0, -150, '#c9a06a', 3); }
  else { bell(0, -128, 0); ln(0, -116, 0, -40, '#c9a06a', 3); el(0, -36, 6, 9); fo('#d0564a', 2.5); }
});

const ringK = ({ cols }) => mk([-60, -206, 60, 8], (s) => {
  const [a, b] = cols[s];
  shadow(0, 2, 24, 5); rr(-9, -196, 18, 196, 3); fo(OAK, 3.5); poly(-18, -196, 18, -196, 0, -212); fo(dk(OAK, 0.2), 3);
  if (BR) { el(0, -150, 6); fo(IRON, 2); for (let r = 8; r < 26; r += 6) { el(24, -6, r, r * 0.35); X.strokeStyle = C('#c9b48a'); X.lineWidth = 3; X.stroke(); } return; }
  X.beginPath(); X.arc(0, -120, 46, 0, TAU); X.arc(0, -120, 25, 0, TAU, true); fo(a);
  X.save(); X.beginPath(); X.arc(0, -120, 46, 0, TAU); X.arc(0, -120, 25, 0, TAU, true); X.clip(); X.fillStyle = C(b);
  for (let k = 0; k < 4; k++) { X.beginPath(); X.moveTo(0, -120); X.arc(0, -120, 50, k * TAU / 4 + 0.3, k * TAU / 4 + 0.75); X.closePath(); X.fill(); }
  X.restore(); X.beginPath(); X.arc(0, -120, 25, 0, TAU); out(3);
  for (let k = 0; k < 4; k++) { const ang = k * TAU / 4; X.beginPath(); X.arc(Math.cos(ang) * 36, -120 + Math.sin(ang) * 36, 11, 0, TAU); X.strokeStyle = C('#efe4cc'); X.lineWidth = 3; X.stroke(); }
});

/** A rowing boat afloat (anchor at its waterline) or on trestles (dry: true). */
const boatK = ({ cols, names = ['', '', ''], w = 170, dry = false }) => mk([-w - 8, dry ? -150 : -100, w + 8, dry ? 8 : 36], (s) => {
  const [hull, band] = cols[s];
  X.save();
  if (dry) { for (const x of [-w * 0.55, w * 0.55]) { ln(x - 22, 0, x, -50, WOOD, 7); ln(x + 22, 0, x, -50, WOOD, 7); } X.translate(0, -56); if (BR) X.rotate(0.05); }
  else if (BR) X.rotate(0.06);
  const hullP = () => { X.beginPath(); X.moveTo(-w, -52); X.quadraticCurveTo(-w * 0.7, 36, 0, 30); X.quadraticCurveTo(w * 0.76, 30, w, -56); X.lineTo(w * 0.88, -48); X.lineTo(-w * 0.88, -46); X.closePath(); };
  hullP(); fo(hull); X.save(); hullP(); X.clip(); X.fillStyle = C(band); X.fillRect(-w - 10, -56, w * 2 + 20, 16); X.fillStyle = 'rgba(40,20,10,.12)'; X.fillRect(-w - 10, 0, w * 2 + 20, 40); X.restore();
  hullP(); out(4); ln(-w * 0.94, -50, w * 0.95, -54, '#8a5a3b', 6);
  if (BR) { el(w * 0.24, -10, 16, 9); fill('#7a6a5a'); rr(-30, -30, 50, 10, 3); fo('#a89a8a', 3); }
  else { ln(-w * 0.35, -60, w * 0.47, -94, '#c9a06a', 6); if (names[s]) txt(names[s], w * 0.52, -20, 18, band === '#fff8ec' ? '#fff8ec' : lt(band, 0.2), { italic: true }); }
  X.restore();
});

/** Flower beds: a low hedge of blooms (w wide), or a row of pots. */
const bedK = ({ w = 300, h = 60, flowers, leaf = '#6a9f50', edge = null, pots = 0, potCols = null }) => mk([-w / 2 - 14, -h - 50, w / 2 + 14, 10], (s) => {
  const fl = flowers[s];
  if (pots) {
    for (let i = 0; i < pots; i++) {
      const x = -w / 2 + (i + 0.5) * w / pots;
      const b = bush(x, -46, w / pots * 0.8, h * 0.8, pick(leaf, s), 5, 3.5);
      flowersOn(b, fl, 8, 7);
      pot(x, 0, Math.min(64, w / pots * 0.6), 42, potCols ? potCols[s] : '#d9825b');
    }
    return;
  }
  if (edge) { rr(-w / 2, -16, w, 16, 3); fo(pick(edge, s), 3); }
  const b = bush(0, edge ? -12 : 0, w, h, pick(leaf, s), Math.max(5, Math.round(w / 40)));
  flowersOn(b, fl, 9, Math.round(w / 12));
});

/** Window boxes under two upper windows (anchor between them, dx apart). */
const boxesK = ({ dx = 150, w = 150, flowers, boxCols }) => mk([-dx - w / 2 - 14, -62, dx + w / 2 + 14, 34], (s) => {
  for (const x of [-dx, dx]) {
    const b = bush(x, 0, w, 44, '#6a9f50', 6, 3.5);
    flowersOn(b, flowers[s], 8, 10);
    if (!BR) for (let k = 0; k < 4; k++) ln(x - w / 2 + 14 + k * 38, 6, x - w / 2 + 20 + k * 38, 26 + (k % 2) * 6, '#5f9a5a', 3);
    rr(x - w / 2, 0, w, 26, 4); fo(boxCols ? boxCols[s] : '#e9c9a0');
  }
});

/** Hanging baskets on wall brackets (anchor between the outermost two). */
const basketsK = ({ xs = [-200, 200], flowers }) => mk([xs[0] - 66, -40, xs[xs.length - 1] + 66, 110], (s) => {
  xs.forEach((x, i) => {
    ln(x - 40, 0, x + 6, 0, IRON, 5); ln(x - 40, 0, x - 40, 24, IRON, 4);
    if (BR && i % 2) { ln(x, 0, x - 8, 40, '#6b5040', 2); return; }
    for (const dx of [-26, 26]) ln(x, 0, x + dx, 44, '#6b5040', 2);
    X.beginPath(); X.arc(x, 44, 32, 0, Math.PI); X.closePath(); fo('#9a7a4a', 3.5);
    const b = bush(x, 46, 92, 46, '#6a9f50', 6, 3.5); flowersOn(b, flowers[s], 8, 11);
    if (!BR) for (let k = 0; k < 5; k++) { const tx = x - 34 + k * 17; ln(tx, 60, tx + 2, 84 + (k % 2) * 14, '#5f9a5a', 3); bloom(tx + 2, 86 + (k % 2) * 14, 7, flowers[s][k % flowers[s].length]); }
  });
});

const tablesK = ({ dx = 120 }) => mk([-dx - 66, -112, dx + 66, 14], (s) => {
  if (BR) { dustSheet(-dx, 0, 120, 92); X.save(); X.translate(dx, 0); X.rotate(-0.25); el(0, -40, 50, 10); fo('#c9c0b2'); ln(0, -36, 0, 10, '#8f877d', 6); X.restore(); return; }
  bistroTable(-dx, 0, s); bistroTable(dx, 6, s);
});

const chairsK = ({ dx = 70 }) => mk([-dx - 60, -118, dx + 60, 12], (s) => {
  if (BR) { dustSheet(-dx, 0, 90, 86); dustSheet(dx, 2, 84, 70); return; }
  chair(-dx, 0, s, 1); chair(dx, 0, s, -1);
});

const potsK = ({ w = 200, n = 3, flowers, potCols, leaf = '#6a9f50' }) => bedK({ w, h: 60, flowers, pots: n, potCols, leaf });

const lanternsK = ({ dx = 160, h = 110, kinds }) => mk([-dx - 50, -h - 80, dx + 50, 8], (s) => {
  const k = pick(kinds, s);
  for (const x of [-dx, dx]) {
    X.save(); X.translate(x, 0); if (BR && x > 0) X.rotate(0.1);
    post(0, 0, -h, k === 'brass' ? '#c9a06a' : IRON, 7);
    if (k === 'jar') { rr(-16, -h - 34, 32, 34, 6); fo(BR ? '#d8d0c4' : '#fff1c8', 3); el(0, -h - 36, 16, 4); fo('#c9a06a', 2); if (!BR) { glow(0, -h - 18, 70, '#ffd98a', 0.45); el(0, -h - 16, 4, 7); fill('#f4a33a'); } }
    else { poly(-18, -h - 4, 18, -h - 4, 14, -h - 44, -14, -h - 44); fo(BR ? '#d8d0c4' : '#fff1c8', 3); poly(-20, -h - 44, 20, -h - 44, 0, -h - 62); fo(k === 'brass' ? '#c9a06a' : IRON, 3); if (!BR) glow(0, -h - 24, 80, '#ffd98a', 0.45); }
    X.restore();
  }
});

const picnicK = ({ cols, basket = true }) => mk([-120, -64, 120, 30], (s) => {
  const [a, b] = cols[s];
  const rug = () => poly(-112, 24, 112, 24, 90, -16, -90, -16);
  if (BR) { X.save(); rug(); X.clip(); X.fillStyle = C(a); X.fillRect(-120, -20, 140, 50); X.restore(); rug(); out(3); return; }
  rug(); fill(a); X.save(); rug(); X.clip(); if (b === 'patch') { const cs = ['#e8846f', '#8fcfb5', '#f4d27a', '#b9a3d6']; for (let i = 0; i < 12; i++) { X.fillStyle = C(cs[i % 4]); X.fillRect(-120 + (i % 6) * 40, -18 + Math.floor(i / 6) * 22, 40, 22); } } else { stripes(-120, -20, 240, 50, [a, b], 18); X.globalAlpha = 0.5; for (let y = -16; y < 26; y += 18) { X.fillStyle = C(b); X.fillRect(-120, y, 240, 8); } X.globalAlpha = 1; } X.restore(); rug(); out(3);
  if (basket) { rr(30, -40, 56, 36, 6); fo('#c9a06a', 3); X.beginPath(); X.arc(58, -40, 22, Math.PI, 0); X.strokeStyle = OUT; X.lineWidth = 4; X.stroke(); good('cup', -40, 0); good('bun', -6, 4); }
});

const deckK = ({ cols, n = 2, dx = 90 }) => mk([-dx * (n - 1) / 2 - 56, -112, dx * (n - 1) / 2 + 56, 12], (s) => {
  for (let i = 0; i < n; i++) {
    const x = -dx * (n - 1) / 2 + i * dx;
    if (BR) { X.save(); X.translate(x, 0); X.rotate(-1.2 + i * 0.1); ln(-46, 0, 46, 0, '#a89a8a', 6); ln(-36, 10, 36, 10, '#a89a8a', 6); X.restore(); continue; }
    const c = pick(cols, s), col = Array.isArray(c) ? c[i % c.length] : c;
    shadow(x, 0, 42, 7);
    ln(x - 34, 0, x + 26, -104, '#a0724a', 6); ln(x + 34, 0, x - 4, -62, '#a0724a', 6);
    const sh = () => poly(x - 24, -12, x + 18, -100, x + 38, -96, x + 2, -6);
    sh(); fill(col); X.save(); sh(); X.clip(); stripes(x - 30, -110, 80, 110, [col, '#fff3e4'], 10); X.restore(); sh(); out(3.5);
  }
});

const parasolsK = ({ cols, xs = [-90, 90] }) => mk([xs[0] - 110, -260, xs[xs.length - 1] + 110, 8], (s) => {
  xs.forEach((x, i) => {
    const [a, b] = cols[s];
    if (BR && i) { X.save(); X.translate(x, 0); X.rotate(1.35); post(0, 0, -160, '#c9b8a0', 5); poly(-150, -10, -150, 10, -60, 0); fo('#d4cbbd', 3); X.restore(); return; }
    post(x, 0, -220, CREAM, 5);
    X.beginPath(); X.moveTo(x - 100, -190); X.quadraticCurveTo(x, -270, x + 100, -190); X.closePath(); fill(a);
    X.save(); X.beginPath(); X.moveTo(x - 100, -190); X.quadraticCurveTo(x, -270, x + 100, -190); X.closePath(); X.clip(); stripes(x - 100, -260, 200, 72, [a, b], 25); X.restore();
    X.beginPath(); X.moveTo(x - 100, -190); X.quadraticCurveTo(x, -270, x + 100, -190); X.closePath(); out(3.5);
    for (let k = 0; k < 8; k++) { X.beginPath(); X.arc(x - 87.5 + k * 25, -190, 12.5, 0, Math.PI); fo(k % 2 ? b : a, 2.5); }
  });
});

const railK = ({ w = 960, cols, h = 70 }) => mk([-w / 2 - 6, -h - 12, w / 2 + 6, 6], (s) => {
  const col = pick(cols, s);
  for (let x = -w / 2 + 4; x <= w / 2 - 4; x += 60) { if (BR && (Math.round(x / 60) % 5 === 2)) continue; rr(x - 5, -h, 10, h + 2, 2); fo(col, 3); if (!BR) { el(x, -h * 0.5, 9); X.strokeStyle = C(col); X.lineWidth = 3; X.stroke(); } }
  if (BR) { rr(-w / 2, -h - 8, w * 0.4, 12, 3); fo(col, 3); X.save(); X.translate(-w * 0.1, -h - 2); X.rotate(0.12); rr(0, -6, w * 0.25, 12, 3); fo(col, 3); X.restore(); rr(w * 0.18, -h - 8, w * 0.32, 12, 3); fo(col, 3); return; }
  rr(-w / 2, -h - 8, w, 12, 3); fo(col, 3.5); rr(-w / 2, -16, w, 8, 2); fo(col, 3);
});

const bollardsK = ({ xs, cols }) => mk([xs[0] - 26, -60, Math.max(xs[xs.length - 1] + 26, xs[0] + 98), 66], (s) => {
  const [a, b] = cols[s];
  xs.forEach((x, i) => {
    if (BR && i % 2) { el(x, -6, 18, 6); fo('#8f877d', 3); return; }
    rr(x - 16, -40, 32, 40, 8); fo(a, 3.5); el(x, -40, 20, 8); fo(lt(a, 0.2), 3);
    if (b) { X.save(); rr(x - 16, -40, 32, 40, 8); X.clip(); X.fillStyle = C(b); X.fillRect(x - 16, -28, 32, 8); X.restore(); }
    if (!BR && i === 0) { X.beginPath(); X.moveTo(x + 14, -24); X.bezierCurveTo(x + 60, -10, x + 70, 30, x + 90, 60); X.strokeStyle = C('#c9b48a'); X.lineWidth = 5; X.stroke(); }
  });
});

const potsLobster = ({ cols }) => mk([-110, -110, 110, 8], (s) => {
  const net = cols[s];
  const lp = (x, y) => { X.beginPath(); X.moveTo(x - 40, y); X.lineTo(x - 40, y - 30); X.quadraticCurveTo(x, y - 76, x + 40, y - 30); X.lineTo(x + 40, y); X.closePath(); fo(BR ? '#c9c0b2' : '#d9c39a', 3.5); X.save(); X.clip(); X.strokeStyle = C(net); X.lineWidth = 2.5; for (let k = -40; k < 50; k += 12) { X.beginPath(); X.moveTo(x + k, y); X.lineTo(x + k + 20, y - 70); X.stroke(); X.beginPath(); X.moveTo(x + k, y); X.lineTo(x + k - 20, y - 70); X.stroke(); } X.restore(); rr(x - 42, y - 6, 84, 8, 2); fo(WOOD, 3); };
  lp(-50, 0); lp(50, 0); if (!BR) lp(0, -46); else { X.save(); X.translate(80, -10); X.rotate(1.2); rr(-40, -4, 80, 8, 2); fo(WOOD, 3); X.restore(); }
});


// ------------------------------------------------------------------ hero pieces (one-off props), same contract as the kit
/** A wooden fingerpost: arms point both ways. */
const fingerpost = ({ cols, words = ['Village', 'Harbour', 'Café'], h = 220 }) => mk([-150, -h - 30, 150, 8], (s) => {
  const [col, ink] = cols[s];
  shadow(0, 0, 26, 5); post(0, 0, -h, col === '#fbf6ec' ? OAK : col, 10); el(0, -h - 6, 9); fo(col, 3);
  const arm = (y, dir, w, word, rot) => {
    X.save(); X.translate(0, y); X.rotate(rot);
    const x0 = dir > 0 ? 6 : -6, x1 = x0 + dir * w;
    poly(x0, -15, x1, -15, x1 + dir * 18, 0, x1, 15, x0, 15); fo(col, 3.5);
    txt(worn(word), (x0 + x1) / 2, 1, 15, ink, { font: SERIF, maxW: w - 12 });
    X.restore();
  };
  arm(-h + 26, 1, 112, words[0], 0); arm(-h + 66, -1, 112, words[1], BR ? 0.6 : 0);
  if (!BR) arm(-h + 106, 1, 96, words[2], 0.04); else { X.save(); X.translate(40, -6); X.rotate(0.1); rr(-50, -12, 100, 24, 4); fo(col, 3); X.restore(); }
});

/** Tall reeds and flag irises at the water's edge. */
const reedsK = ({ w = 300, kinds }) => mk([-w / 2 - 20, -170, w / 2 + 20, 12], (s) => {
  const k = kinds[s];
  for (let i = 0; i < 18; i++) {
    const x = -w / 2 + 10 + i * (w - 20) / 17, hh = 90 + ((i * 37) % 60), lean = ((i * 13) % 9 - 4) * 3;
    if (BR && i % 3 === 0) { ln(x, 0, x + 30, -hh * 0.4, '#a89a7a', 4); continue; }
    ln(x, 4, x + lean, -hh, BR ? '#a89a7a' : '#5f8f4a', 5);
    if (!BR && i % 3 === 1) {
      if (k === 'rush') { rr(x + lean - 6, -hh - 34, 12, 36, 6); fo('#7a5236', 2.5); }
      else { const c = k === 'blue' ? '#6f7fc9' : '#f2cf4a'; poly(x + lean, -hh - 4, x + lean - 14, -hh - 22, x + lean, -hh - 34, x + lean + 14, -hh - 22); fo(c, 2.5); el(x + lean, -hh - 18, 4); fill(k === 'blue' ? '#f2cf4a' : '#c0583c'); }
    }
  }
  bush(0, 6, w, 30, BR ? '#9a9a80' : '#6a9f50', 7, 3);
});

const wellK = () => mk([-120, -290, 120, 10], (s) => {
  const [wall, roof] = [['#c9c0b2', '#c9a85a'], ['#c96f55', '#a86a5f'], ['#9fd3c7', '#7f93ad']][s];
  shadow(0, 2, 100, 10);
  for (const x of [-74, 74]) post(x, -60, -220, TRUNK, 10);
  if (BR) { poly(-104, -214, 10, -214, -40, -260); fo(roof); ln(-80, -218, 90, -200, TRUNK, 7); }
  else {
    poly(-110, -210, 110, -210, 0, -284); fo(roof);
    X.save(); poly(-110, -210, 110, -210, 0, -284); X.clip(); X.strokeStyle = C(dk(roof, 0.25)); X.lineWidth = 2.5; for (let y = -280; y < -210; y += 14) { X.beginPath(); X.moveTo(-120, y); X.lineTo(120, y); X.stroke(); } X.restore();
    ln(-74, -160, 74, -160, TRUNK, 8); ln(0, -160, 0, -120, '#c9a06a', 3); rr(-16, -122, 32, 30, 4); fo('#a07850', 3);
    ln(74, -160, 98, -150, IRON, 5); ln(98, -150, 98, -134, IRON, 5);
  }
  rr(-92, -70, 184, 74, 8); fo(wall);
  X.save(); rr(-92, -70, 184, 74, 8); X.clip(); X.strokeStyle = C(dk(wall, 0.2)); X.lineWidth = 2.5;
  for (let y = -70, r = 0; y < 4; y += 18, r++) { X.beginPath(); X.moveTo(-92, y); X.lineTo(92, y); X.stroke(); for (let x = -92 + (r % 2) * 22; x < 92; x += 44) { X.beginPath(); X.moveTo(x, y); X.lineTo(x, y + 18); X.stroke(); } }
  X.restore(); rr(-92, -70, 184, 74, 8); out(4);
  el(0, -70, 92, 12); fo(lt(wall, 0.15), 3.5); el(0, -70, 76, 8); fill('#4a5a5a');
  if (BR) crack(-40, -64, 50);
  else { bush(-96, -6, 70, 40, '#6a9f50', 4, 3); bush(96, -6, 70, 40, '#6a9f50', 4, 3); }
});

const maypoleK = () => mk([-170, -440, 170, 14], (s) => {
  const cols = [['#d0483a', '#f2c64e', '#4f84b3', '#5f9a5a', '#7a4fa0'], ['#f5c6c0', '#bfe3d4', '#d9ccf0', '#fff1b8', '#cfe3f2'], ['#d0483a', '#ffffff', '#d0483a', '#ffffff', '#d0483a']][s];
  shadow(0, 2, 120, 12);
  if (BR) {
    X.save(); X.translate(0, 0); X.rotate(-1.36); rr(-8, -400, 16, 400, 5); fo('#c9b8a0', 3.5); X.restore();
    for (let i = 0; i < 4; i++) ln(-60 + i * 50, -6, -30 + i * 50, 4, '#c9c0b2', 5);
    return;
  }
  rr(-9, -400, 18, 400, 6); fo(CREAM, 3.5);
  X.save(); rr(-9, -400, 18, 400, 6); X.clip(); for (let y = -400, i = 0; y < 0; y += 34, i++) { X.save(); X.translate(0, y); X.rotate(-0.5); X.fillStyle = C(cols[i % 5]); X.fillRect(-20, -6, 40, 12); X.restore(); } X.restore();
  el(0, -404, 30, 10); fo('#6a9f50', 3); for (let k = -2; k <= 2; k++) bloom(k * 12, -408, 7, cols[(k + 2) % 5]);
  el(0, -420, 10); fo(GOLD, 3);
  for (let i = 0; i < 10; i++) {
    const a = -1 + i * 0.22, ex = Math.sin(a) * 160, ey = -8 + Math.abs(Math.sin(a)) * -10;
    X.beginPath(); X.moveTo(0, -396); X.quadraticCurveTo(ex * 0.5, -200, ex, ey); X.strokeStyle = C(cols[i % 5]); X.lineWidth = 6; X.lineCap = 'round'; X.stroke();
  }
  rr(-40, -16, 80, 16, 4); fo('#6a9f50', 3);
});

/** An arched church window with glass panes (set into a wall). */
const chapelWin = ({ w = 120, h = 200 }) => mk([-w / 2 - 20, -h - 20, w / 2 + 20, 20], (s) => {
  const panes = [['#7fc6c3', '#bfe3d4', '#4f9fb3', '#d9ead0'], ['#f5c6c0', '#e8846f', '#f6e1d8', '#d9a3c0'], ['#f6dd7a', '#f2a33a', '#e8846f', '#fff1b8']][s];
  archPath(-w / 2 - 14, -h - 14, w + 28, h + 22); fo('#e3dbcc', 4);
  archPath(-w / 2, -h, w, h); fo(BR ? '#8f877d' : '#3d3a3f', 3);
  X.save(); archPath(-w / 2, -h, w, h); X.clip();
  if (BR) { ln(-w / 2, -h * 0.3, w / 2, -h * 0.7, '#b9a080', 14); ln(-w / 2, -h * 0.6, w / 2, -h * 0.1, '#b9a080', 14); }
  else {
    const rnd = mulberryLocal(s + 3);
    for (let y = -h; y < 0; y += 22) for (let x = -w / 2; x < w / 2; x += 22) { rr(x + 2, y + 2, 18, 18, 2); fill(panes[Math.floor(rnd() * 4)]); }
    glow(0, -h * 0.5, w * 0.8, '#fff1c8', 0.35);
    X.strokeStyle = C('#3d3a3f'); X.lineWidth = 4; X.beginPath(); X.moveTo(0, -h); X.lineTo(0, 0); X.moveTo(-w / 2, -h * 0.45); X.lineTo(w / 2, -h * 0.45); X.stroke();
  }
  X.restore(); archPath(-w / 2, -h, w, h); out(4);
  rr(-w / 2 - 20, -4, w + 40, 16, 3); fo('#e3dbcc', 3.5);
});
/** A tiny seeded generator for repeatable patterns inside one prop. */
function mulberryLocal(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** A roofed lychgate over a little wooden gate. */
const lychgate = () => mk([-150, -300, 150, 10], (s) => {
  const [wood, roof] = [['#8a6a4a', '#7f8a96'], ['#efe8dc', '#7f93ad'], ['#6f8f5f', '#a86a5f']][s];
  for (const x of [-104, 104]) { rr(x - 10, -220, 20, 222, 3); fo(wood === '#efe8dc' ? '#d9cfbf' : wood, 3.5); }
  if (BR) { poly(-140, -214, 30, -214, -40, -280); fo(roof); }
  else { poly(-146, -210, 146, -210, 60, -292, -60, -292); fo(roof); X.save(); poly(-146, -210, 146, -210, 60, -292, -60, -292); X.clip(); X.strokeStyle = C(dk(roof, 0.25)); X.lineWidth = 2.5; for (let y = -286; y < -210; y += 14) { X.beginPath(); X.moveTo(-150, y); X.lineTo(150, y); X.stroke(); } X.restore(); poly(-146, -210, 146, -210, 60, -292, -60, -292); out(4); }
  ln(-114, -206, 114, -206, wood === '#efe8dc' ? '#d9cfbf' : wood, 10);
  X.save(); X.translate(-94, 0); if (BR) X.rotate(0.14);
  for (let i = 0; i < 4; i++) { rr(0, -110 + i * 26, 188, 9, 2); fo(wood, 3); }
  ln(6, -14, 182, -104, wood, 6);
  X.restore();
});

const fountainK = () => mk([-150, -260, 150, 12], (s) => {
  const [stone, water] = [['#e3dbcc', '#9fd3e0'], ['#4f7f8a', '#9fd3e0'], ['#d9cfbf', '#9fd3e0']][s];
  shadow(0, 4, 140, 14);
  el(0, -20, 140, 26); fo(stone); el(0, -40, 130, 20); fo(lt(stone, 0.1), 3.5);
  if (s === 2 && !BR) { X.save(); el(0, -20, 140, 26); X.clip(); for (let x = -140, i = 0; x < 140; x += 18, i++) { rr(x, -26, 16, 16, 2); fill(['#4f9fb3', '#f2c64e', '#e8846f', '#8fcfb5'][i % 4]); } X.restore(); }
  el(0, -40, 112, 14); fill(BR ? '#a89a8a' : water);
  rr(-14, -170, 28, 132, 6); fo(stone, 3.5);
  el(0, -170, 60, 14); fo(stone, 3.5); el(0, -172, 48, 8); fill(BR ? '#a89a8a' : water);
  rr(-8, -220, 16, 50, 4); fo(stone, 3); el(0, -224, 16, 9); fo(stone, 3);
  if (BR) { el(40, -44, 26, 6); fill('#8a9a6a'); crack(-60, -36, 28); return; }
  X.strokeStyle = 'rgba(255,255,255,.85)'; X.lineWidth = 4; X.lineCap = 'round';
  for (const d of [-1, 1]) { X.beginPath(); X.moveTo(0, -232); X.quadraticCurveTo(d * 40, -270, d * 56, -176); X.stroke(); X.beginPath(); X.moveTo(d * 46, -170); X.quadraticCurveTo(d * 90, -150, d * 104, -44); X.stroke(); }
  for (let k = 0; k < 6; k++) { el(-80 + k * 32, -42, 6, 2); X.fillStyle = 'rgba(255,255,255,.7)'; X.fill(); }
});

const pillarBox = () => mk([-46, -170, 46, 8], (s) => {
  const col = ['#d0483a', '#2f4a8a', '#2f6f4a'][s];
  shadow(0, 2, 40, 6);
  X.save(); if (BR) X.rotate(0.05);
  rr(-32, -150, 64, 150, 10); fo(col);
  X.beginPath(); X.ellipse(0, -150, 40, 20, 0, Math.PI, 0); X.lineTo(40, -142); X.lineTo(-40, -142); X.closePath(); fo(dk(col, 0.15), 3.5);
  rr(-40, -146, 80, 10, 3); fo(dk(col, 0.1), 3);
  rr(-20, -118, 40, 8, 3); fo('#2b2a2a', 2.5);
  rr(-18, -96, 36, 30, 3); fo(BR ? '#d8d0c4' : '#fbf6ec', 2.5);
  if (!BR) { txt('GR', 0, -48, 14, GOLD); ln(-10, -88, 10, -88, '#8a7a6a', 2); ln(-10, -80, 6, -80, '#8a7a6a', 2); }
  rr(-36, -12, 72, 12, 3); fo(dk(col, 0.2), 3);
  if (BR) { X.save(); X.globalAlpha = 0.5; el(10, -120, 16, 10); fill('#a89a8a'); X.restore(); }
  X.restore();
});

const phoneBox = () => mk([-56, -290, 56, 10], (s) => {
  const col = ['#d0483a', '#e9e1cf', '#2f6f4a'][s];
  shadow(0, 2, 50, 7);
  X.save(); if (BR) X.rotate(-0.03);
  rr(-48, -14, 96, 14, 3); fo(dk(col, 0.15), 3);
  rr(-42, -252, 84, 240, 4); fo(col);
  X.beginPath(); X.moveTo(-46, -252); X.quadraticCurveTo(0, -292, 46, -252); X.closePath(); fo(dk(col, 0.1), 3.5);
  rr(-36, -246, 72, 18, 2); fo(BR ? '#c9c0b2' : '#fbf6ec', 2.5); if (!BR) txt('TELEPHONE', 0, -237, 11, '#3d3a3f', { maxW: 64 });
  rr(-32, -220, 64, 160, 3); fo(BR ? '#b8b0a4' : '#ffefc6', 3);
  X.save(); rr(-32, -220, 64, 160, 3); X.clip();
  for (let x = -32; x < 32; x += 21) ln(x, -220, x, -60, col, 4);
  for (let y = -220; y < -60; y += 20) ln(-32, y, 32, y, col, 4);
  if (BR) { ln(-32, -160, 32, -120, '#e6ddcc', 10); }
  else glow(0, -150, 70, '#ffd98a', 0.35);
  X.restore();
  if (!BR) { bush(-56, -10, 48, 34, '#6a9f50', 3, 3); }
  X.restore();
});

const scarecrow = () => mk([-110, -280, 110, 8], (s) => {
  const [hat, coat, band] = [['#e9cf7a', '#4f84b3', '#d0483a'], ['#8a6a4a', '#a86a5f', '#5b5550'], ['#f5c6c0', '#8fcfb5', '#e8846f']][s];
  shadow(0, 2, 40, 6);
  X.save(); if (BR) { X.translate(0, 0); X.rotate(0.18); }
  post(0, 0, -200, TRUNK, 9); ln(-90, -170, 90, -170, TRUNK, 9);
  poly(-50, -186, 50, -186, 60, -84, -60, -84); fo(BR ? '#b9ab9b' : coat);
  if (!BR) { X.save(); poly(-50, -186, 50, -186, 60, -84, -60, -84); X.clip(); rr(-26, -150, 20, 18, 2); fo('#f2c64e', 2); rr(10, -120, 22, 16, 2); fo('#e8846f', 2); X.restore(); }
  for (const d of [-1, 1]) { poly(d * 50, -184, d * 96, -176, d * 96, -158, d * 50, -150); fo(BR ? '#b9ab9b' : coat, 3); for (let k = 0; k < 4; k++) ln(d * 96, -168, d * (106 + k * 3), -160 + k * 6, '#e9cf7a', 3); }
  el(0, -214, 30, 32); fo('#efe4cc', 3.5);
  if (BR) { el(-10, -218, 4); fill('#3d3a3f'); ln(-12, -200, 12, -196, '#3d3a3f', 3); X.restore(); return; }
  el(-10, -220, 4); fill('#3d3a3f'); el(10, -220, 4); fill('#3d3a3f'); X.beginPath(); X.arc(0, -206, 10, 0.2, Math.PI - 0.2); X.strokeStyle = '#3d3a3f'; X.lineWidth = 3; X.stroke();
  if (s === 1) { el(0, -244, 34, 10); fo(hat, 3); X.beginPath(); X.ellipse(0, -248, 28, 16, 0, Math.PI, 0); fo(hat, 3); rr(-30, -256, 60, 8, 3); fo(lt(hat, 0.2), 2); }
  else { el(0, -242, 56, 12); fo(hat, 3.5); X.beginPath(); X.ellipse(0, -248, 30, 24, 0, Math.PI, 0); fo(hat, 3.5); rr(-30, -254, 60, 10, 3); fo(band, 2.5); if (s === 2) { bloom(-24, -250, 10, '#e8846f'); bloom(-6, -256, 8, '#f4d27a'); } }
  X.restore();
});

const ciderPress = () => mk([-120, -250, 120, 10], (s) => {
  const col = ['#a0724a', '#c0583c', '#3f6f5a'][s];
  shadow(0, 2, 110, 10);
  for (const x of [-90, 90]) { rr(x - 12, -230, 24, 230, 3); fo(col); }
  rr(-104, -240, 208, 26, 4); fo(col);
  X.save(); if (BR) { X.translate(0, -120); X.rotate(0.3); X.translate(0, 120); }
  rr(-8, -214, 16, 120, 3); fo(IRON, 3); rr(-70, -100, 140, 18, 3); fo(dk(col, 0.1), 3);
  ln(-60, -214, 60, -214, IRON, 7); el(-64, -214, 9); fo(IRON, 3); el(64, -214, 9); fo(IRON, 3);
  X.restore();
  rr(-80, -80, 160, 60, 6); fo(OAK); X.save(); rr(-80, -80, 160, 60, 6); X.clip(); planks(-80, -80, 160, 60, OAK, 20, true); X.restore(); rr(-80, -80, 160, 60, 6); out(3.5);
  ln(-84, -60, 84, -60, IRON, 5); ln(-84, -34, 84, -34, IRON, 5);
  rr(-112, -24, 224, 24, 3); fo(dk(col, 0.1));
  if (!BR) { good('apple', -40, -84); good('apple', 30, -84); rr(80, -40, 30, 40, 6); fo('#e8c25a', 2.5); }
});

/** Two beehives (white, pastel or straw skeps) on a stand. */
const hivesK = () => mk([-150, -160, 150, 8], (s) => {
  const cols = [['#ffffff', '#ffffff'], ['#f5c6c0', '#bfe3d4'], null][s];
  rr(-140, -40, 280, 12, 3); fo(TRUNK, 3); for (const x of [-120, 120]) post(x, 0, -34, TRUNK, 7);
  [-66, 66].forEach((x, i) => {
    if (BR && i) { X.save(); X.translate(x + 20, -6); X.rotate(1.4); rr(-36, -50, 72, 50, 4); fo('#c9c0b2', 3); X.restore(); return; }
    if (!cols) { el(x, -76, 50, 42); fo(BR ? '#c9b8a0' : '#e9cf7a', 3.5); for (let k = 1; k < 4; k++) { X.beginPath(); X.ellipse(x, -40 - k * 2, 50 - k * 4, 42 - k * 9, 0, Math.PI, 0); X.strokeStyle = C('#c9a85a'); X.lineWidth = 3; X.stroke(); } el(x, -48, 9, 6); fill('#5b4636'); return; }
    const c = BR ? '#d8d0c4' : cols[i];
    for (let k = 0; k < 3; k++) { rr(x - 44, -76 - k * 26 + 36, 88, 26, 2); fo(c, 3); }
    poly(x - 54, -106, x + 54, -106, x + 40, -126, x - 40, -126); fo(BR ? '#b8b0a4' : dk(c === '#ffffff' ? '#9fb0c0' : c, 0.25), 3.5);
    rr(x - 16, -46, 32, 6, 2); fill('#5b4636');
  });
  if (!BR) for (let k = 0; k < 5; k++) { const x = -110 + k * 52, y = -140 + (k % 2) * 20; el(x, y, 6, 4); fo('#f2c64e', 1.5); el(x - 3, y - 4, 4, 3); X.fillStyle = 'rgba(255,255,255,.8)'; X.fill(); }
});

const millWheel = () => mk([-170, -360, 170, 10], (s) => {
  const col = ['#a0724a', '#3d4a52', '#3f6f5a'][s];
  const cx = 0, cy = -170, r = 150;
  X.save(); X.translate(cx, cy); if (BR) X.rotate(0.2);
  X.beginPath(); X.arc(0, 0, r, 0, TAU); X.arc(0, 0, r - 24, 0, TAU, true); fo(col);
  for (let k = 0; k < 16; k++) {
    if (BR && k % 4 === 1) continue;
    const a = k * TAU / 16;
    X.save(); X.rotate(a); rr(r - 30, -10, 48, 20, 2); fo(s === 0 ? OAK : '#a0724a', 3); X.restore();
  }
  for (let k = 0; k < 8; k++) { const a = k * TAU / 8; ln(0, 0, Math.cos(a) * (r - 22), Math.sin(a) * (r - 22), col, 9); }
  el(0, 0, 22); fo(dk(col, 0.1), 3.5); el(0, 0, 8); fill(GOLD);
  X.restore();
  if (!BR) { X.strokeStyle = 'rgba(255,255,255,.75)'; X.lineWidth = 5; X.lineCap = 'round'; for (let k = 0; k < 4; k++) { X.beginPath(); X.moveTo(-r + 20 + k * 30, 0); X.quadraticCurveTo(-r + 30 + k * 30, -10, -r + 40 + k * 30, 0); X.stroke(); } }
});

/** The river bridge: a stone (or brick) arch over the river mouth, its feet fading into the water. */
const bridgeK = () => mk([-370, -170, 370, 220], (s) => {
  const stone = ['#e3c99a', '#b9b6ae', '#c98a6a'][s];
  const deck = -110;
  if (BR) {
    for (const d of [-1, 1]) { poly(d * 360, 120, d * 360, deck, d * 250, deck, d * 230, 120); X.save(); X.clip(); fade(d * 300, deck, '#b8b0a4'); X.restore(); poly(d * 360, 120, d * 360, deck, d * 250, deck, d * 230, 120); out(4); }
    for (let k = 0; k < 9; k++) { if (k === 3 || k === 6) continue; X.save(); X.translate(-240 + k * 60, deck - 6 + (k % 2) * 4); X.rotate((k % 3 - 1) * 0.06); rr(-28, -8, 56, 16, 3); fo('#b9a080', 3); X.restore(); }
    ln(-250, deck - 30, 250, deck - 10, '#8a7a6a', 3);
    return;
  }
  const body = () => { X.beginPath(); X.moveTo(-362, 220); X.lineTo(-362, deck - 20); X.quadraticCurveTo(0, deck - 74, 362, deck - 20); X.lineTo(362, 220); X.lineTo(236, 220); X.bezierCurveTo(236, -40, -236, -40, -236, 220); X.closePath(); };
  body(); X.save(); X.clip(); fade(0, deck - 80, stone);
  X.strokeStyle = C(dk(stone, 0.18)); X.lineWidth = 2.5; X.globalAlpha = 0.7;
  for (let y = deck - 60, r = 0; y < 220; y += 26, r++) { X.beginPath(); X.moveTo(-370, y); X.lineTo(370, y); X.stroke(); for (let x = -370 + (r % 2) * 30; x < 370; x += 60) { X.beginPath(); X.moveTo(x, y); X.lineTo(x, y + 26); X.stroke(); } }
  X.restore();
  X.beginPath(); X.moveTo(-362, 220); X.lineTo(-362, deck - 20); X.quadraticCurveTo(0, deck - 74, 362, deck - 20); X.lineTo(362, 220); out(4);
  X.beginPath(); X.moveTo(-236, 220); X.bezierCurveTo(-236, -40, 236, -40, 236, 220); out(4);
  // voussoirs round the arch
  for (let k = 1; k < 12; k++) { const t = k / 12, x = -236 + 472 * t, y = 220 - 260 * 4 * t * (1 - t) * 0.75; ln(x, y, x * 1.12, y - 22, dk(stone, 0.25), 3); }
  // parapet
  X.beginPath(); X.moveTo(-370, deck - 24); X.quadraticCurveTo(0, deck - 78, 370, deck - 24); X.lineTo(370, deck - 50); X.quadraticCurveTo(0, deck - 104, -370, deck - 50); X.closePath(); fo(lt(stone, 0.12), 3.5);
});
/** Fill the current clip with a colour that fades into the water below y 470 (the water-fade foot of anything standing in the sea). */
function fade(x, y0, col) {
  const w0 = WATER - 40 - PY;
  const g = X.createLinearGradient(0, w0, 0, w0 + 150);
  const c = C(col);
  g.addColorStop(0, c); g.addColorStop(1, c + '00');
  X.fillStyle = c; X.fillRect(x - 600, y0 - 200, 1200, Math.max(0, w0 - (y0 - 200)));
  X.fillStyle = g; X.fillRect(x - 600, w0, 1200, 150);
}

const lilies = () => mk([-190, -40, 190, 30], (s) => {
  const fl = ['#ffffff', '#f5b6c8', '#f6dd7a'][s];
  const pads = [[-150, 4, 34], [-80, -14, 28], [-20, 10, 38], [60, -8, 30], [130, 8, 34], [170, -16, 22], [-170, -20, 20]];
  pads.forEach(([x, y, r], i) => {
    if (BR && i % 2) { el(x, y, r * 0.6, r * 0.25); fill('#8a8a6a'); return; }
    X.beginPath(); X.moveTo(x, y); X.ellipse(x, y, r, r * 0.42, 0, 0.3, TAU - 0.1); X.closePath(); fo(BR ? '#9a9a80' : '#6aa35a', 3);
    if (!BR && i % 2 === 0) { for (let k = 0; k < 6; k++) { const a = k * TAU / 6; el(x + Math.cos(a) * 9, y - 8 + Math.sin(a) * 4, 7, 5); fo(fl, 1.5); } el(x, y - 10, 5); fill('#f2c64e'); }
  });
});

const duckHouse = () => mk([-90, -260, 90, 20], (s) => {
  const roof = ['#c0583c', '#4f84b3', '#c9a85a'][s];
  post(0, 20, -120, TRUNK, 9);
  rr(-80, -128, 160, 12, 3); fo(OAK, 3);
  X.save(); if (BR) { X.translate(0, -128); X.rotate(0.12); X.translate(0, 128); }
  rr(-60, -210, 120, 84, 4); fo(BR ? '#c9c0b2' : '#fbf1e2');
  archPath(-18, -184, 36, 58); fill('#3d3a3f');
  if (BR) { poly(-76, -206, 20, -206, -30, -246); fo('#9a9088'); }
  else { poly(-78, -206, 78, -206, 0, -256); fo(roof); if (s === 2) { X.save(); poly(-78, -206, 78, -206, 0, -256); X.clip(); for (let y = -250; y < -206; y += 8) ln(-80, y, 80, y + 4, '#b0904a', 2); X.restore(); } ln(-60, -100, 60, -120, '#fbf6ec', 0); }
  X.restore();
  if (!BR) { X.save(); X.translate(60, 12); el(0, 0, 22, 12); fo('#fbfaf6', 3); el(16, -16, 10); fo('#fbfaf6', 3); poly(24, -16, 36, -13, 24, -10); fo('#f2a33a', 2); el(18, -18, 2); fill('#2f2a28'); X.restore(); }
});

/** A short timber landing stage out over the water (anchor at its shore end, centre). */
const jettyK = ({ cols, len = 300, w = 160 }) => mk([-w / 2 - 14, -30, w / 2 + 14, len + 40], (s) => {
  const col = pick(cols, s);
  for (let y = 40; y <= len; y += 90) for (const x of [-w / 2 + 10, w / 2 - 10]) { X.save(); rr(x - 8, y - 20, 16, 120, 3); X.clip(); fade(x, y - 20, '#8a6a4a'); X.restore(); }
  for (let y = -20, i = 0; y < len; y += 26, i++) {
    if (BR && i % 4 === 2) continue;
    X.save(); X.translate(0, y); if (BR && i % 5 === 3) X.rotate(0.06);
    rr(-w / 2, 0, w, 22, 2); fo(col, 3); X.restore();
  }
  if (!BR) for (const x of [-w / 2, w / 2]) { post(x, len - 10, len - 70, col, 7); }
});

const swingK = () => mk([-160, -300, 160, 10], (s) => {
  const col = ['#d0483a', '#4f84b3', '#a0724a'][s];
  for (const x of [-130, 130]) { ln(x - 30, 0, x, -270, OUT, 13); ln(x - 30, 0, x, -270, col, 8); ln(x + 30, 0, x, -270, OUT, 13); ln(x + 30, 0, x, -270, col, 8); }
  ln(-140, -272, 140, -272, OUT, 14); ln(-140, -272, 140, -272, col, 9);
  for (const [x, i] of [[-60, 0], [60, 1]]) {
    if (BR && i) { ln(x - 20, -266, x - 22, -120, '#8a7a6a', 3); rr(x - 10, -16, 70, 12, 3); fo('#b9a080', 3); continue; }
    ln(x - 26, -266, x - 26, -76, '#8a7a6a', 3); ln(x + 26, -266, x + 26, -76, '#8a7a6a', 3); rr(x - 34, -80, 68, 12, 3); fo(BR ? '#b9a080' : OAK, 3);
  }
});

const hopscotch = () => mk([-170, -40, 170, 40], (s) => {
  const cols = [['#f08070', '#f6dd7a', '#8fcfb5', '#9fbfe8', '#c9a3e0'], ['#f5c6c0', '#fff1b8', '#bfe3d4', '#cfe3f2', '#e9d6f2'], ['#ffffff']][s];
  X.save(); X.transform(1, 0, -0.35, 0.45, 0, 0);
  const cells = [[-150, 0], [-90, 0], [-30, -30], [-30, 30], [30, 0], [90, -30], [90, 30], [150, 0]];
  cells.forEach(([x, y], i) => {
    if (BR && i % 3 !== 0) return;
    rr(x - 28, y - 28, 56, 56, 2); X.fillStyle = C(cols[i % cols.length]); X.globalAlpha = BR ? 0.25 : 0.55; X.fill(); X.globalAlpha = 1;
    X.strokeStyle = BR ? 'rgba(255,255,255,.4)' : '#ffffff'; X.lineWidth = 4; X.stroke();
    if (!BR) { X.save(); X.translate(x, y); X.scale(1, 2.2); txt(String(i + 1), 0, 0, 20, '#ffffff', { font: ROUND }); X.restore(); }
  });
  X.restore();
  if (!BR) { el(120, 20, 8, 5); fo('#f08070', 2); }
});

const teaTrolley = () => mk([-100, -170, 100, 10], (s) => {
  const col = ['#c9ccd0', '#a8cfc4', GOLD][s];
  X.save(); if (BR) X.rotate(0.06);
  for (const x of [-70, 70]) { ln(x, -150, x, -16, OUT, 10); ln(x, -150, x, -16, col, 6); }
  ln(70, -150, 92, -168, col, 6);
  for (const y of [-130, -60]) { rr(-86, y, 172, 12, 4); fo(s === 1 ? '#fbf6ec' : lt(col, 0.2), 3); }
  for (const x of [-70, 70]) { el(x, -10, 11); fo('#3d3a3f', 3); }
  if (!BR) { good('teapot', -40, -130); good('cake', 30, -130); good('cup', -50, -60); good('cup', -20, -60); good('scone', 30, -60); }
  else dustSheet(0, -60, 150, 60);
  X.restore();
});

const stileK = ({ cols }) => mk([-130, -160, 130, 10], (s) => {
  const col = pick(cols, s);
  for (let x = -120; x <= 120; x += 60) { if (BR && x === 60) continue; post(x, 0, -110, TRUNK, 9); }
  for (const y of [-96, -56]) { rr(-128, y, 256, 10, 2); fo(TRUNK, 3); }
  X.save(); if (BR) { X.translate(0, -40); X.rotate(0.25); X.translate(0, 40); }
  rr(-44, -46, 88, 14, 3); fo(col, 3); rr(-30, -150, 14, 110, 3); fo(col, 3); rr(16, -150, 14, 110, 3); fo(col, 3); rr(-36, -150, 72, 12, 3); fo(col, 3);
  X.restore();
});

/** A shelter: open-fronted with a pitched roof (cols[s] = [wall, roof, trim]). */
const shelterK = ({ cols, w = 300, h = 220 }) => mk([-w / 2 - 30, -h - 110, w / 2 + 30, 10], (s) => {
  const [wall, roof, trim] = cols[s];
  shadow(0, 2, w * 0.55, 10);
  rr(-w / 2, -h, w, h, 3); fo(wall);
  X.save(); rr(-w / 2, -h, w, h, 3); X.clip(); planks(-w / 2, -h, w, h, wall, 22, true); X.restore(); rr(-w / 2, -h, w, h, 3); out(4);
  rr(-w / 2 + 26, -h + 30, w - 52, h - 30, 3); fo(dk(wall, 0.35), 3);
  bench(0, -4, w - 80, trim === '#fbf6ec' ? '#c9a06a' : trim, s);
  if (BR) { poly(-w / 2 - 24, -h + 4, w * 0.1, -h + 4, -w * 0.2, -h - 80); fo('#9a9088'); return; }
  poly(-w / 2 - 28, -h + 6, w / 2 + 28, -h + 6, 0, -h - 104); fo(roof);
  X.save(); poly(-w / 2 - 28, -h + 6, w / 2 + 28, -h + 6, 0, -h - 104); X.clip(); X.strokeStyle = C(dk(roof, 0.25)); X.lineWidth = 2.5; for (let y = -h - 100; y < -h + 6; y += 16) { X.beginPath(); X.moveTo(-w, y); X.lineTo(w, y); X.stroke(); } X.restore();
  poly(-w / 2 - 28, -h + 6, w / 2 + 28, -h + 6, 0, -h - 104); out(4);
  poly(-w / 2 - 28, -h + 6, w / 2 + 28, -h + 6, w / 2 + 18, -h - 4, -w / 2 - 18, -h - 4); fill(trim);
});

const kiteK = () => mk([-180, -330, 120, 10], (s) => {
  const cols = [['#d0483a', '#f2c64e', '#4f84b3', '#5f9a5a'], ['#d0483a', '#ffffff'], ['#4f84b3', '#cfe3f2']][s];
  if (BR) { ln(-150, 0, -40, -40, '#8a7a6a', 2); X.save(); X.translate(-40, -40); X.rotate(0.9); poly(0, -40, 26, 0, 0, 40, -26, 0); fo('#c9c0b2', 3); ln(0, -40, 0, 40, '#8a7a6a', 2); X.restore(); post(-150, 0, -60, TRUNK, 6); return; }
  post(-150, 0, -60, TRUNK, 6);
  X.beginPath(); X.moveTo(-150, -60); X.quadraticCurveTo(-40, -100, 0, -230); X.strokeStyle = '#6b5040'; X.lineWidth = 2; X.stroke();
  X.save(); X.translate(10, -260);
  if (s === 0) { poly(0, -50, 34, 0, 0, 50, -34, 0); fo(cols[0], 3.5); X.save(); poly(0, -50, 34, 0, 0, 50, -34, 0); X.clip(); X.fillStyle = cols[1]; X.fillRect(0, -50, 40, 50); X.fillStyle = cols[2]; X.fillRect(-40, 0, 40, 50); X.fillStyle = cols[3]; X.fillRect(0, 0, 40, 50); X.restore(); poly(0, -50, 34, 0, 0, 50, -34, 0); out(3.5); }
  else if (s === 1) { rr(-28, -46, 56, 30, 2); fo(cols[0], 3); rr(-28, 14, 56, 30, 2); fo(cols[0], 3); ln(-28, -16, -28, 14, '#6b5040', 3); ln(28, -16, 28, 14, '#6b5040', 3); }
  else { X.beginPath(); X.moveTo(0, 0); X.quadraticCurveTo(-40, -36, -70, -10); X.quadraticCurveTo(-34, -10, 0, 16); X.quadraticCurveTo(34, -10, 70, -10); X.quadraticCurveTo(40, -36, 0, 0); fo(cols[0], 3.5); el(0, 4, 8, 16); fo(cols[1], 2.5); }
  X.beginPath(); X.moveTo(0, 50); X.quadraticCurveTo(30, 90, 10, 130); X.quadraticCurveTo(-10, 160, 20, 190); X.strokeStyle = '#6b5040'; X.lineWidth = 2; X.stroke();
  for (let k = 0; k < 4; k++) { X.save(); X.translate(10 + (k % 2) * 10, 80 + k * 30); X.rotate(0.6); rr(-8, -4, 16, 8, 2); fo(cols[k % cols.length], 2); X.restore(); }
  X.restore();
});

const shellsK = () => mk([-130, -60, 130, 12], (s) => {
  const kind = ['cockle', 'scallop', 'mussel'][s];
  rr(-80, -40, 160, 40, 8); fo(BR ? '#c9c0b2' : '#c9a06a', 3.5); X.save(); rr(-80, -40, 160, 40, 8); X.clip(); for (let x = -80; x < 80; x += 14) ln(x, -40, x + 10, 0, '#a07850', 2); X.restore();
  X.beginPath(); X.arc(0, -40, 66, Math.PI, 0); X.strokeStyle = OUT; X.lineWidth = 6; X.stroke(); X.strokeStyle = C('#c9a06a'); X.lineWidth = 3; X.stroke();
  if (BR) { for (let k = 0; k < 4; k++) { el(-110 + k * 70, 4, 10, 5); fill('#d8d0c4'); } return; }
  for (let k = 0; k < 7; k++) {
    const x = -66 + k * 22, y = -40 - (k % 2) * 8;
    if (kind === 'mussel') { el(x, y, 13, 7); fo('#3d4a6b', 2.5); el(x - 3, y - 2, 5, 2); fill('#6f7fa0'); }
    else { X.beginPath(); X.moveTo(x, y + 4); X.arc(x, y - 6, 12, Math.PI * 0.95, Math.PI * 0.05, false); X.closePath(); fo(kind === 'scallop' ? '#f6c6a4' : '#f2e2c4', 2.5); for (let q = -2; q <= 2; q++) ln(x, y + 3, x + q * 4, y - 14, '#c99a84', 1.2); }
  }
  for (const x of [-116, 116]) good('shell', x, 8);
});

const fireRing = () => mk([-110, -150, 110, 20], (s) => {
  const kind = s;
  if (kind === 1) { X.beginPath(); X.ellipse(0, -16, 70, 22, 0, 0, Math.PI); X.lineTo(-70, -16); X.closePath(); fo('#3d3a3f'); el(0, -16, 70, 14); fo('#5b5550', 3); for (const x of [-50, 50]) ln(x, -6, x * 1.2, 16, '#3d3a3f', 6); }
  else for (let k = 0; k < 9; k++) { const a = k * TAU / 9; el(Math.cos(a) * 76, -8 + Math.sin(a) * 22, kind ? 14 : 18, kind ? 9 : 12); fo(kind === 2 ? '#f6c6a4' : ['#c9bfb0', '#b3a898', '#d4cbbd'][k % 3], 3); }
  if (BR) { for (let k = 0; k < 3; k++) { X.save(); X.translate(-30 + k * 30, -12); X.rotate(0.4 - k * 0.4); rr(-30, -6, 60, 12, 5); fo('#5b4636', 3); X.restore(); } return; }
  for (let k = 0; k < 4; k++) { X.save(); X.translate(0, -20); X.rotate(-0.8 + k * 0.5); rr(-6, -60, 12, 64, 5); fo('#8a5a3b', 3); X.restore(); }
  glow(0, -60, 110, '#ffb060', 0.55);
  X.beginPath(); X.moveTo(-34, -24); X.quadraticCurveTo(-30, -80, 0, -120); X.quadraticCurveTo(26, -80, 34, -24); X.closePath(); fo('#f2a33a', 3);
  X.beginPath(); X.moveTo(-16, -24); X.quadraticCurveTo(-12, -60, 4, -84); X.quadraticCurveTo(16, -56, 18, -24); X.closePath(); fill('#f6dd7a');
});

/** A rock pool (anchor at its centre) with sea life. */
const rockPool = ({ kinds, w = 230 }) => mk([-w / 2 - 20, -60, w / 2 + 20, 50], (s) => {
  const k = kinds[s];
  el(0, 0, w / 2 + 14, 40); fo('#c9bfb0', 4);
  for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + 0.3; el(Math.cos(a) * (w / 2 + 6), Math.sin(a) * 34 - 4, 24, 14); fo(['#c9bfb0', '#b3a898', '#d4cbbd'][i % 3], 3); }
  el(0, 2, w / 2 - 6, 28); fo(BR ? '#8f9a94' : '#7fc0c8', 3);
  X.save(); el(0, 2, w / 2 - 6, 28); X.clip();
  if (BR) { el(-20, 6, 50, 14); X.fillStyle = 'rgba(120,110,90,.6)'; X.fill(); X.restore(); return; }
  X.fillStyle = 'rgba(255,255,255,.35)'; el(-w / 4, -10, w / 5, 6); X.fill();
  const life = (x, y, i) => {
    if (k === 'star') { star(x, y, 14, 0.42); fo(['#f2a33a', '#e8846f', '#c0583c'][i % 3], 2); }
    else if (k === 'anemone') { el(x, y, 12, 8); fo('#d0483a', 2); for (let q = -3; q <= 3; q++) ln(x + q * 3, y - 4, x + q * 5, y - 16, '#e8846f', 3); }
    else if (k === 'crab') { el(x, y, 13, 9); fo('#e0573f', 2); for (const d of [-1, 1]) { ln(x + d * 10, y - 4, x + d * 20, y - 14, '#e0573f', 3); el(x + d * 21, y - 16, 5); fo('#e0573f', 1.5); } el(x - 4, y - 8, 2); fill('#2f2a28'); el(x + 4, y - 8, 2); fill('#2f2a28'); }
    else if (k === 'shrimp') { X.beginPath(); X.arc(x, y, 10, 0.4, Math.PI * 1.4); X.strokeStyle = '#f2a8a0'; X.lineWidth = 5; X.stroke(); }
    else if (k === 'snail') { el(x, y, 9); fo('#7a6a9a', 2); X.beginPath(); X.arc(x, y, 4, 0, Math.PI * 1.5); X.strokeStyle = '#d9ccf0'; X.lineWidth = 2; X.stroke(); }
    else { for (let q = -2; q <= 2; q++) { X.beginPath(); X.moveTo(x + q * 6, y + 8); X.quadraticCurveTo(x + q * 6 + 8, y - 6, x + q * 4, y - 20); X.strokeStyle = '#e88aa0'; X.lineWidth = 4; X.stroke(); } }
  };
  for (let i = 0; i < 5; i++) life(-w / 2 + 40 + i * (w - 80) / 4, 8 + (i % 2) * 10 - 6, i);
  X.restore();
});

const netsK = () => mk([-110, -220, 120, 10], (s) => {
  const cols = [['#d0483a', '#f2c64e', '#4f84b3'], ['#f5c6c0', '#bfe3d4', '#fff1b8'], ['#c9ccd0', '#c9ccd0', '#c9ccd0']][s];
  for (let i = 0; i < 3; i++) {
    if (BR && i === 1) { X.save(); X.translate(-20, -6); X.rotate(1.45); ln(0, 0, 0, -160, '#c9b8a0', 5); X.restore(); continue; }
    const x = -70 + i * 50;
    X.save(); X.translate(x, 0); X.rotate(-0.12 + i * 0.1);
    ln(0, 0, 0, -170, '#c9a06a', 5); el(0, -186, 22, 26); fo(BR ? '#d8d0c4' : '#fff8ec', 2.5);
    X.save(); el(0, -186, 22, 26); X.clip(); X.strokeStyle = C(BR ? '#a89a8a' : cols[i]); X.lineWidth = 2; for (let k = -24; k < 24; k += 8) { X.beginPath(); X.moveTo(k, -212); X.lineTo(k + 12, -160); X.stroke(); X.beginPath(); X.moveTo(k, -160); X.lineTo(k + 12, -212); X.stroke(); } X.restore();
    el(0, -186, 22, 26); X.strokeStyle = C(BR ? '#a89a8a' : cols[i]); X.lineWidth = 4; X.stroke();
    X.restore();
  }
  // buckets and spades
  for (const [x, i] of [[60, 0], [100, 1]]) { if (BR && i) continue; poly(x - 18, -44, x + 18, -44, x + 13, 0, x - 13, 0); fo(s === 2 ? '#c9ccd0' : cols[i + 1], 3); X.beginPath(); X.arc(x, -44, 16, Math.PI, 0); X.strokeStyle = OUT; X.lineWidth = 2.5; X.stroke(); }
});

const stepsK = ({ cols }) => mk([-110, -20, 110, 160], (s) => {
  const col = pick(cols, s);
  for (let k = 0; k < 5; k++) { if (BR && k === 2) continue; X.save(); X.translate(0, k * 30); if (BR && k === 3) X.rotate(0.1); rr(-80 + k * 6, 0, 160 - k * 12, 20, 3); fo(col === 'rope' ? '#c9a06a' : col, 3); X.restore(); }
  for (const x of [-96, 96]) {
    if (BR && x > 0) continue;
    post(x, 150, -10, '#8a6a4a', 7);
    if (col === 'rope') { X.beginPath(); X.moveTo(x, -6); X.quadraticCurveTo(x + (x < 0 ? 10 : -10), 70, x, 146); X.strokeStyle = C('#c9b48a'); X.lineWidth = 5; X.stroke(); }
  }
});

const winch = () => mk([-100, -170, 110, 10], (s) => {
  const [col, trim] = [['#3f6f5a', GOLD], ['#c0392b', GOLD], ['#2b2a2a', '#d9a640']][s];
  shadow(0, 2, 90, 8);
  rr(-80, -16, 160, 16, 3); fo('#8a7a6a', 3);
  for (const x of [-60, 60]) { poly(x - 16, -16, x + 16, -16, x + 6, -120, x - 6, -120); fo(col); }
  X.save(); if (BR) { X.translate(0, -100); X.rotate(0.3); X.translate(0, 100); }
  rr(-66, -116, 132, 34, 14); fo(BR ? '#a89a8a' : '#c9b48a'); for (let x = -60; x < 60; x += 10) ln(x, -114, x + 4, -84, '#a08a5a', 2);
  el(70, -100, 26); fo(col, 3.5); for (let k = 0; k < 6; k++) { const a = k * TAU / 6; ln(70, -100, 70 + Math.cos(a) * 22, -100 + Math.sin(a) * 22, trim, 3); }
  ln(70, -100, 96, -150, IRON, 6); el(98, -152, 7); fo('#a0724a', 2.5);
  X.restore();
});

const paintTins = () => mk([-130, -150, 130, 10], (s) => {
  const cols = [['#2f4a6b', '#4f84b3', '#9fd3e0', '#1f6f8a'], ['#c0392b', '#e8846f', '#f2a33a', '#f6dd7a'], ['#3f6f5a', '#6aa35a', '#9cc65a', '#d9ead0']][s];
  crate(-60, 0, 100, 60, '#c9a06a');
  const tin = (x, y, c, i) => { rr(x - 18, y - 36, 36, 36, 3); fo(BR ? '#c9c0b2' : '#d9dde0', 3); if (!BR) { rr(x - 18, y - 26, 36, 14, 2); fill(c); X.fillStyle = C(c); X.fillRect(x - 6, y - 40, 12, 6 + (i % 2) * 6); } el(x, y - 36, 18, 5); fo('#c9ccd0', 2.5); };
  [[-84, -60], [-38, -60], [40, 0], [84, 0], [62, -36]].forEach(([x, y], i) => { if (BR && i === 4) return; tin(x, y, cols[i % 4], i); });
  if (!BR) { X.save(); X.translate(110, -6); X.rotate(-0.6); rr(-4, -70, 8, 50, 3); fo('#c9a06a', 2.5); rr(-10, -24, 20, 26, 3); fo(cols[0], 2.5); X.restore(); }
  else { el(30, 6, 30, 6); fill('#a89a8a'); }
});

const fishCrates = () => mk([-130, -150, 130, 10], (s) => {
  const col = ['#4f84b3', '#c9a06a', '#d0483a'][s];
  const fc = (x, y) => { rr(x - 50, y - 40, 100, 40, 4); fo(col); X.save(); rr(x - 50, y - 40, 100, 40, 4); X.clip(); ln(x - 50, y - 20, x + 50, y - 20, dk(col, 0.2), 3); X.restore(); rr(x - 18, y - 32, 36, 10, 4); fill('#2b2a2a'); };
  fc(-60, 0); fc(60, 0);
  if (BR) { X.save(); X.translate(110, -10); X.rotate(0.7); fc(0, 0); X.restore(); return; }
  fc(0, -40);
  for (let k = 0; k < 2; k++) good('fish', -20 + k * 40, -82);
  bush(0, -84, 120, 10, '#e9f3f6', 4, 0);
});

const buoysK = ({ kinds }) => mk([-150, -230, 150, 10], (s) => {
  const k = kinds[s];
  ln(-140, -210, 140, -210, '#8a6a4a', 8); for (const x of [-140, 140]) post(x, 0, -214, '#8a6a4a', 8);
  for (let i = 0; i < 5; i++) {
    const x = -100 + i * 50, len = 40 + (i % 2) * 30;
    if (BR && i % 2) { el(x, -8, 18, 10); fo('#c9c0b2', 3); continue; }
    ln(x, -206, x, -206 + len, '#c9b48a', 3);
    const y = -206 + len + 24;
    if (k === 'glass') { el(x, y, 22); fo(['#9fd3c7', '#7fc6c3', '#bfe3d4'][i % 3], 3); X.save(); X.strokeStyle = C('#c9a06a'); X.lineWidth = 2; for (let q = -1; q <= 1; q++) { X.beginPath(); X.moveTo(x + q * 12, y - 20); X.lineTo(x + q * 14, y + 20); X.stroke(); } X.restore(); el(x - 8, y - 8, 6, 4); X.fillStyle = 'rgba(255,255,255,.7)'; X.fill(); }
    else { el(x, y, 20, 26); fo(['#f2a33a', '#d0483a', '#f6dd7a', '#4f84b3', '#8fcfb5'][i], 3); if (k === 'stripe') { X.save(); el(x, y, 20, 26); X.clip(); X.fillStyle = '#ffffff'; X.fillRect(x - 22, y - 6, 44, 12); X.restore(); } }
  }
});

const coneSign = () => mk([-80, -330, 80, 10], (s) => {
  const scoop = [['#f5a8b8', '#e8869a'], ['#bfe8d4', '#5b4636'], ['#fff1c8', '#e9d29a']][s];
  shadow(0, 2, 40, 6);
  rr(-24, -16, 48, 16, 3); fo('#d9cfbf', 3); post(0, -14, -150, IRON, 8);
  X.save(); X.translate(0, -150); if (BR) X.rotate(0.3);
  poly(-50, -60, 50, -60, 0, 60); fo('#e0a865'); X.save(); poly(-50, -60, 50, -60, 0, 60); X.clip(); X.strokeStyle = C('#b27a3e'); X.lineWidth = 3; for (let k = -60; k < 60; k += 16) { X.beginPath(); X.moveTo(k - 40, -60); X.lineTo(k + 40, 60); X.stroke(); X.beginPath(); X.moveTo(k + 40, -60); X.lineTo(k - 40, 60); X.stroke(); } X.restore(); poly(-50, -60, 50, -60, 0, 60); out(4);
  if (BR) { el(0, -70, 50, 30); fo('#d8d0c4'); X.restore(); return; }
  for (const [x, y, r] of [[-26, -80, 34], [26, -80, 34], [0, -118, 38]]) { el(x, y, r); fo(scoop[0]); }
  for (let k = 0; k < 7; k++) { el(-30 + k * 10, -96 - (k % 3) * 22, 3, 2); fill(scoop[1]); }
  X.beginPath(); X.moveTo(-56, -66); for (let k = 0; k <= 7; k++) X.quadraticCurveTo(-56 + k * 16 - 8, -40 - (k % 2) * 14, -56 + k * 16, -62); X.strokeStyle = C(scoop[0]); X.lineWidth = 10; X.stroke();
  el(10, -160, 10); fo('#d0483a', 3); ln(10, -170, 16, -184, '#5f9a5a', 3);
  X.restore();
});

const iceCart = () => mk([-140, -270, 150, 10], (s) => {
  const [a, b] = [['#f5a8b8', '#ffffff'], ['#9fd3e0', '#ffffff'], ['#f6dd7a', '#ffffff']][s];
  shadow(0, 2, 120, 9);
  X.save(); if (BR) X.rotate(0.05);
  rr(-110, -140, 200, 100, 10); fo(BR ? '#c9c0b2' : a);
  if (!BR) { X.save(); rr(-110, -140, 200, 100, 10); X.clip(); stripes(-110, -90, 200, 50, [a, b], 20); X.restore(); rr(-110, -140, 200, 100, 10); out(4); txt('Ices', -10, -112, 28, '#7a3f5a', { font: ROUND, weight: 700 }); }
  wheel(-60, -36, 30); wheel(50, -36, 30, '#3d3a3f', BR);
  ln(90, -110, 140, -130, IRON, 6);
  if (!BR) { post(-90, -140, -230, '#efe8dc', 5); X.beginPath(); X.moveTo(-170, -200); X.quadraticCurveTo(-90, -270, -10, -200); X.closePath(); fo(a, 3.5); X.save(); X.beginPath(); X.moveTo(-170, -200); X.quadraticCurveTo(-90, -270, -10, -200); X.closePath(); X.clip(); stripes(-170, -260, 160, 60, [a, b], 22); X.restore(); X.beginPath(); X.moveTo(-170, -200); X.quadraticCurveTo(-90, -270, -10, -200); X.closePath(); out(3.5); for (const x of [-40, 0, 40]) { el(x, -146, 14); fo(['#f5a8b8', '#bfe8d4', '#fff1c8'][(x / 40 + 1) | 0], 2.5); } }
  else dustSheet(-10, -140, 160, 40);
  X.restore();
});

/** A floral clock set into a sloping bed (anchor at its centre). */
const floralClock = () => mk([-210, -110, 210, 70], (s) => {
  const ring = [['#f2c64e', '#e8846f', '#ffffff'], ['#d0483a', '#f6dd7a', '#7a4fa0'], ['#f2a33a', '#c0583c', '#f6dd7a']][s];
  el(0, 0, 200, 64); fo(BR ? '#a8a08a' : '#6aa35a');
  X.save(); el(0, 0, 200, 64); X.clip();
  if (BR) { for (let i = 0; i < 6; i++) { el(-150 + i * 60, (i % 2) * 20 - 10, 26, 10); fill('#9a8a6a'); } }
  else {
    for (let k = 0; k < 3; k++) { el(0, 0, 186 - k * 50, 58 - k * 16); X.strokeStyle = ring[k]; X.lineWidth = 16; X.setLineDash([6, 6]); X.stroke(); X.setLineDash([]); }
    for (let k = 0; k < 12; k++) { const a = k * TAU / 12; el(Math.cos(a) * 160, Math.sin(a) * 48, 7, 4); fill('#fbf6ec'); }
  }
  X.restore();
  if (!BR) { ln(0, 0, -90, -16, '#2b2a2a', 9); ln(0, 0, 40, -40, '#2b2a2a', 9); el(0, 0, 10, 6); fo(GOLD, 3); }
  else { ln(0, 0, 60, 20, '#5b5550', 7); }
});

const scoreboard = ({ cols }) => mk([-120, -260, 120, 10], (s) => {
  const [frame, face] = cols[s];
  for (const x of [-90, 90]) post(x, 0, -140, frame, 10);
  X.save(); if (BR) X.rotate(0.04);
  rr(-110, -250, 220, 120, 6); fo(frame); rr(-98, -238, 196, 96, 3); fo(face, 3);
  const ink = face === '#fbf6ec' ? '#2b2a2a' : '#fbf6ec';
  txt('HOME', -50, -222, 16, ink, { font: ROUND, weight: 600 }); txt('AWAY', 50, -222, 16, ink, { font: ROUND, weight: 600 });
  for (const x of [-50, 50]) { rr(x - 34, -206, 68, 46, 4); fo(BR ? '#a89a8a' : '#2b2a2a', 2.5); if (!BR) txt(x < 0 ? '142' : '138', x, -183, 26, '#fbf6ec', { font: ROUND, weight: 700 }); }
  X.restore();
});

const rollerK = () => mk([-140, -170, 130, 10], (s) => {
  const col = ['#3f6f5a', '#c0392b', '#2f4a6b'][s];
  shadow(0, 2, 100, 9);
  X.save(); if (BR) { X.translate(0, 0); X.rotate(0.05); }
  rr(-90, -76, 180, 76, 34); fo(col);
  X.save(); rr(-90, -76, 180, 76, 34); X.clip(); X.fillStyle = 'rgba(255,255,255,.2)'; X.fillRect(-90, -70, 180, 14); X.restore();
  el(-90, -38, 18, 38); fo(dk(col, 0.15), 3.5); el(-90, -38, 8, 16); fill(GOLD);
  ln(60, -40, 128, -150, OUT, 12); ln(60, -40, 128, -150, col, 7); ln(108, -156, 148, -144, col, 9);
  X.restore();
  if (BR) { for (let i = 0; i < 6; i++) { el(-120 + i * 46, 4, 10, 4); fill('#8a9a6a'); } }
});

const carouselTop = () => mk([-300, -190, 300, 70], (s) => {
  const [a, b] = [['#d0483a', '#fff1e0'], ['#2f6fa8', '#fff1e0'], ['#f2a8b8', '#fff8ec']][s];
  if (BR) {
    ln(0, 40, 0, -150, '#a89a8a', 12);
    for (let k = 0; k < 3; k++) { const x = -220 + k * 180; poly(x, -100, x + 100, -100, x + 80, -40, x + 10, -60); fo(a, 3); }
    ln(-260, -100, 260, -100, '#8a7a6a', 6);
    return;
  }
  ln(0, 60, 0, -160, OUT, 18); ln(0, 60, 0, -160, GOLD, 12);
  X.beginPath(); X.moveTo(-290, -40); X.quadraticCurveTo(-120, -150, 0, -176); X.quadraticCurveTo(120, -150, 290, -40); X.closePath(); fill(a);
  X.save(); X.beginPath(); X.moveTo(-290, -40); X.quadraticCurveTo(-120, -150, 0, -176); X.quadraticCurveTo(120, -150, 290, -40); X.closePath(); X.clip();
  for (let k = -6; k <= 6; k++) { if (k % 2) { X.beginPath(); X.moveTo(0, -176); X.lineTo(k * 50 - 25, -30); X.lineTo(k * 50 + 25, -30); X.closePath(); X.fillStyle = C(b); X.fill(); } }
  X.restore();
  X.beginPath(); X.moveTo(-290, -40); X.quadraticCurveTo(-120, -150, 0, -176); X.quadraticCurveTo(120, -150, 290, -40); X.closePath(); out(4);
  rr(-296, -44, 592, 34, 4); fo(GOLD, 3.5);
  for (let k = 0; k < 14; k++) { el(-270 + k * 41.5, -27, 7); fo('#fff1c8', 2); glow(-270 + k * 41.5, -27, 26, '#ffd98a', 0.5); }
  for (let x = -290, i = 0; x < 290; x += 41.5, i++) { X.beginPath(); X.moveTo(x, -10); X.lineTo(x + 41.5, -10); X.arc(x + 20.75, -10, 20.75, 0, Math.PI); X.closePath(); fo(i % 2 ? b : a, 3); }
  el(0, -182, 20, 10); fo(GOLD, 3); poly(0, -200, 26, -192, 0, -184); fo(a, 2.5);
});

const carouselHorses = () => mk([-300, -250, 300, 30], (s) => {
  const looks = [['#fbfaf6', '#8a8a8a'], ['#f5c6c0', '#bfe3d4'], ['#fbf1e2', GOLD]][s];
  el(0, 6, 290, 26); fo(BR ? '#b8b0a4' : '#c9a06a'); el(0, 0, 280, 18); fo(BR ? '#c9c0b2' : '#e9d29a', 3);
  const horse = (x, y, dir, i) => {
    X.save(); X.translate(x, y); X.scale(dir, 1);
    ln(0, -240, 0, 10, OUT, 9); ln(0, -240, 0, 10, BR ? '#a89a8a' : GOLD, 5);
    if (BR && i % 2) { X.restore(); return; }
    const body = s === 1 ? looks[i % 2] : looks[0];
    el(0, -100, 52, 28); fo(BR ? '#c9c0b2' : body, 3.5);
    poly(36, -112, 60, -170, 84, -162, 70, -130, 50, -96); fo(BR ? '#c9c0b2' : body, 3.5);
    el(78, -158, 18, 12); fo(BR ? '#c9c0b2' : body, 3);
    for (const [lx, a] of [[-30, 0.5], [-14, -0.3], [24, 0.6], [38, -0.4]]) { X.save(); X.translate(lx, -80); X.rotate(a); rr(-6, 0, 12, 52, 5); fo(BR ? '#c9c0b2' : body, 3); X.restore(); }
    if (!BR) { X.beginPath(); X.moveTo(40, -150); X.quadraticCurveTo(56, -190, 76, -172); X.strokeStyle = s === 2 ? GOLD : looks[1]; X.lineWidth = 8; X.stroke(); rr(-24, -134, 46, 16, 5); fo(s === 0 ? '#d0483a' : s === 1 ? '#7a4fa0' : '#d0483a', 2.5); el(80, -162, 2.5); fill('#2f2a28'); X.beginPath(); X.moveTo(-50, -104); X.quadraticCurveTo(-80, -90, -70, -60); X.strokeStyle = looks[1]; X.lineWidth = 7; X.stroke(); }
    X.restore();
  };
  horse(-180, 0, 1, 0); horse(0, -24, -1, 1); horse(180, 0, 1, 2);
});

const organK = () => mk([-130, -270, 130, 10], (s) => {
  const [a, trim] = [['#c0392b', GOLD], ['#3f6f5a', GOLD], ['#2f4a8a', GOLD]][s];
  shadow(0, 2, 120, 9);
  rr(-120, -180, 240, 170, 6); fo(BR ? '#b8b0a4' : a);
  X.beginPath(); X.moveTo(-120, -180); X.quadraticCurveTo(0, -270, 120, -180); X.closePath(); fo(BR ? '#c9c0b2' : trim, 3.5);
  for (let k = 0; k < 9; k++) { const x = -88 + k * 22, h = 70 - Math.abs(k - 4) * 10; rr(x - 7, -170 + (70 - h), 14, h, 6); fo(BR ? '#d8d0c4' : '#e9d29a', 2.5); }
  rr(-100, -86, 200, 60, 4); fo(BR ? '#a89a8a' : lt(a, 0.15), 3);
  if (!BR) { for (const x of [-60, 60]) { el(x, -56, 20); fo('#fff1c8', 2.5); } star(0, -56, 16, 0.45); fo(trim, 2.5); }
  wheel(-80, -10, 18); wheel(80, -10, 18, '#3d3a3f', BR);
});

const balloonsK = () => mk([-110, -330, 110, 10], (s) => {
  const cols = [['#d0483a', '#f2c64e', '#4f84b3', '#5f9a5a', '#7a4fa0', '#f2a33a'], ['#f5c6c0', '#bfe3d4', '#fff1b8', '#d9ccf0', '#cfe3f2', '#fbd8c0'], ['#d0483a', '#f08070', '#f5a8b8', '#d0483a', '#f5c6c0', '#e8846f']][s];
  shadow(0, 2, 30, 5); post(0, 0, -120, '#c9a06a', 6);
  if (BR) { for (let k = 0; k < 3; k++) { ln(0, -120, 20 + k * 12, -60, '#8a7a6a', 2); el(26 + k * 16, -56, 12, 9); fill('#c9c0b2'); } return; }
  const spots = [[-60, -280], [0, -300], [60, -276], [-80, -220], [-16, -236], [52, -212]];
  spots.forEach(([x, y], i) => {
    ln(0, -120, x, y + 26, '#8a7a6a', 2);
    if (s === 2) { X.save(); X.translate(x, y); X.beginPath(); X.moveTo(0, 22); X.bezierCurveTo(-34, 0, -26, -28, 0, -12); X.bezierCurveTo(26, -28, 34, 0, 0, 22); fo(cols[i], 3); X.restore(); }
    else { el(x, y, 24, 28); fo(cols[i], 3); poly(x - 5, y + 30, x + 5, y + 30, x, y + 24); fo(cols[i], 2); }
    el(x - 8, y - 10, 5, 7); X.fillStyle = 'rgba(255,255,255,.6)'; X.fill();
  });
});

const photoBooth = () => mk([-80, -280, 80, 10], (s) => {
  const [col, curtain] = [['#c0392b', '#d0483a'], ['#2f4a8a', '#4f84b3'], ['#2f6f4a', '#3f8f5a']][s];
  shadow(0, 2, 70, 8);
  rr(-70, -250, 140, 250, 5); fo(BR ? '#b8b0a4' : col);
  rr(-74, -276, 148, 30, 4); fo(BR ? '#c9c0b2' : GOLD, 3.5); txt(worn('PHOTOS'), 0, -261, 18, BR ? '#8a7a6a' : col, { font: ROUND, weight: 700 });
  rr(-54, -230, 70, 200, 3); fo(BR ? '#a89a8a' : curtain, 3);
  if (!BR) { X.save(); rr(-54, -230, 70, 200, 3); X.clip(); for (let x = -50; x < 16; x += 12) ln(x, -230, x + 4, -30, dk(curtain, 0.2), 3); X.restore(); rr(28, -200, 32, 120, 3); fo('#fbf6ec', 2.5); for (let k = 0; k < 4; k++) { rr(32, -196 + k * 29, 24, 25, 2); fo(['#f5c6c0', '#bfe3d4', '#fff1b8', '#d9ccf0'][k], 1.5); } }
  else { X.save(); X.translate(-20, -120); X.rotate(0.6); ln(0, -90, 0, 90, '#b9a080', 10); X.restore(); }
});

const clawCrane = () => mk([-80, -300, 80, 10], (s) => {
  const toy = ['#c9a06a', '#f6dd7a', '#f5e6e0'][s];
  shadow(0, 2, 70, 8);
  rr(-66, -90, 132, 90, 6); fo(BR ? '#b8b0a4' : '#d0483a');
  rr(-66, -260, 132, 170, 4); fo(BR ? '#b8b0a4' : '#e9f3f6', 3.5);
  rr(-74, -290, 148, 34, 6); fo(BR ? '#c9c0b2' : '#f2c64e', 3.5);
  if (!BR) { for (let k = 0; k < 6; k++) el(-56 + k * 22, -273, 5); X.fillStyle = '#fff1c8'; for (let k = 0; k < 6; k++) { el(-56 + k * 22, -273, 5); X.fill(); } }
  X.save(); rr(-66, -260, 132, 170, 4); X.clip();
  if (BR) { ln(-66, -200, 66, -150, '#d8d0c4', 10); }
  else {
    ln(10, -260, 10, -190, '#5b5550', 3); poly(0, -190, 20, -190, 26, -172, 10, -180, -6, -172); fo('#c9ccd0', 2);
    for (let k = 0; k < 6; k++) { const x = -48 + k * 19, y = -104 - (k % 2) * 16; el(x, y, 14, 13); fo(toy, 2); if (s === 1) { el(x + 10, y - 2, 6, 3); fill('#f2a33a'); } else { el(x - 7, y - 11, 5); fo(toy, 1.5); el(x + 7, y - 11, 5); fo(toy, 1.5); if (s === 2) { el(x - 5, y - 18, 3, 8); fo(toy, 1.5); el(x + 5, y - 18, 3, 8); fo(toy, 1.5); } } el(x - 4, y - 2, 1.6); fill('#2f2a28'); el(x + 4, y - 2, 1.6); fill('#2f2a28'); }
    X.fillStyle = 'rgba(255,255,255,.35)'; poly(-66, -260, -20, -260, -66, -180); X.fill();
  }
  X.restore();
  rr(-30, -66, 60, 28, 4); fo(BR ? '#8f877d' : '#2b2a2a', 2.5);
});

const teacupRide = () => mk([-130, -170, 130, 10], (s) => {
  const col = ['#f5a8b8', '#9fd3e0', '#e9cf7a'][s];
  shadow(0, 2, 120, 10);
  el(0, -10, 124, 16); fo(BR ? '#a89a8a' : '#c9ccd0');
  X.save(); if (BR) { X.translate(0, -10); X.rotate(0.12); X.translate(0, 10); }
  X.beginPath(); X.moveTo(-90, -110); X.quadraticCurveTo(-90, -20, 0, -20); X.quadraticCurveTo(90, -20, 90, -110); X.closePath(); fo(BR ? '#c9c0b2' : col);
  el(0, -110, 90, 18); fo(BR ? '#b8b0a4' : lt(col, 0.3), 3.5);
  X.beginPath(); X.arc(96, -70, 26, -1.2, 1.4); X.strokeStyle = OUT; X.lineWidth = 16; X.stroke(); X.strokeStyle = C(BR ? '#c9c0b2' : col); X.lineWidth = 10; X.stroke();
  if (!BR) { for (let k = 0; k < 5; k++) bloom(-60 + k * 30, -60 + (k % 2) * 10, 9, ['#ffffff', GOLD][k % 2]); el(0, -118, 26, 6); fo('#c9a06a', 2.5); ln(0, -118, 0, -150, IRON, 5); el(0, -152, 26, 8); fo('#c9ccd0', 3); }
  X.restore();
});

const flossCart = () => mk([-120, -290, 120, 10], (s) => {
  const floss = [['#f5a8b8', '#fbd0dc'], ['#9fd3e0', '#cfe9f2'], ['#f5a8b8', '#9fd3e0']][s];
  shadow(0, 2, 100, 8);
  rr(-90, -140, 180, 100, 8); fo(BR ? '#c9c0b2' : '#fbf6ec');
  if (!BR) { X.save(); rr(-90, -140, 180, 100, 8); X.clip(); stripes(-90, -140, 180, 100, ['#fbf6ec', floss[0]], 22); X.restore(); rr(-90, -140, 180, 100, 8); out(4); }
  wheel(-56, -32, 28); wheel(56, -32, 28, '#3d3a3f', BR);
  el(0, -160, 60, 22); fo('#e9f3f6', 3);
  if (BR) { el(0, -170, 40, 10); fill('#d8d0c4'); return; }
  for (let k = 0; k < 3; k++) { const x = -50 + k * 50; ln(x, -170, x, -220, '#efe8dc', 4); for (let q = 0; q < 5; q++) { el(x + (q % 3 - 1) * 14, -240 - Math.floor(q / 3) * 16, 18); fill(s === 2 ? floss[k % 2] : floss[q % 2]); } el(x, -244, 30, 30); X.strokeStyle = 'rgba(107,74,58,.25)'; X.lineWidth = 2; X.stroke(); }
});

const craneK = () => mk([-220, -440, 160, 10], (s) => {
  const col = ['#3f6f5a', '#c0392b', '#2f4a6b'][s];
  shadow(0, 2, 70, 8);
  rr(-60, -40, 120, 40, 4); fo(dk(col, 0.1));
  for (const x of [-40, 40]) { ln(x, -40, x * 0.3, -280, OUT, 14); ln(x, -40, x * 0.3, -280, col, 9); }
  for (let y = -80; y > -260; y -= 50) ln(-36 + (y + 40) * -0.06, y, 36 - (y + 40) * -0.06, y - 40, col, 4);
  rr(-40, -320, 80, 50, 6); fo(col); rr(-28, -310, 30, 26, 3); fo(BR ? '#b8b0a4' : '#ffe6a8', 2.5);
  X.save(); X.translate(0, -300); X.rotate(BR ? 0.5 : -0.35);
  ln(0, 0, -260, 0, OUT, 14); ln(0, 0, -260, 0, col, 9);
  for (let x = -20; x > -250; x -= 30) ln(x, -5, x - 15, 5, lt(col, 0.2), 3);
  X.restore();
  const tip = BR ? [-260 * Math.cos(0.5), -300 - 260 * Math.sin(0.5)] : [-260 * Math.cos(-0.35), -300 - 260 * Math.sin(-0.35)];
  if (!BR) { ln(tip[0], tip[1], tip[0], -120, '#5b5550', 3); X.beginPath(); X.arc(tip[0], -110, 12, 0, Math.PI * 1.4); X.strokeStyle = IRON; X.lineWidth = 5; X.stroke(); crate(tip[0] + 6, -40, 70, 50, '#c9a06a'); for (const d of [-1, 1]) ln(tip[0], -100, tip[0] + d * 30, -90, '#5b5550', 2); }
});

const lifeboatK = () => mk([-260, -260, 260, 10], (s) => {
  const [hull, band, cab] = [['#2f4a8a', '#f2a33a', '#fbf6ec'], ['#c0392b', '#ffffff', '#fbf6ec'], ['#3f6f5a', '#fbf1e2', '#fbf1e2']][s];
  // the slipway trolley
  rr(-230, -30, 460, 22, 3); fo('#8a7a6a', 3); for (const x of [-180, -60, 60, 180]) { el(x, -6, 14); fo('#3d3a3f', 3); }
  X.save(); X.translate(0, -36); if (BR) X.rotate(0.03);
  const hp = () => { X.beginPath(); X.moveTo(-240, -110); X.quadraticCurveTo(-200, 0, -40, 0); X.lineTo(150, 0); X.quadraticCurveTo(230, -20, 250, -120); X.closePath(); };
  hp(); fo(BR ? '#a89a8a' : hull); X.save(); hp(); X.clip(); X.fillStyle = C(BR ? '#c9c0b2' : band); X.fillRect(-260, -120, 520, 24); X.restore(); hp(); out(4);
  if (BR) { el(-60, -60, 26, 12); fill('#7a6a5a'); rr(-60, -170, 120, 60, 4); fo('#c9c0b2'); X.restore(); return; }
  rr(-70, -190, 150, 80, 6); fo(cab); for (let k = 0; k < 3; k++) { rr(-56 + k * 44, -176, 34, 30, 3); fo('#9fd3e0', 2.5); }
  rr(-80, -198, 170, 14, 3); fo(band, 3); ln(10, -198, 10, -250, IRON, 5); el(10, -252, 6); fo(band, 2.5);
  txt('NOVA 1', 120, -60, 22, '#fbf6ec', { font: ROUND, weight: 700 });
  X.restore();
});

const churnsK = () => mk([-130, -130, 130, 10], (s) => {
  const col = ['#c9ccd0', '#4f84b3', '#c0392b'][s];
  const churn = (x, y, rot) => { X.save(); X.translate(x, y); X.rotate(rot); poly(-26, 0, 26, 0, 30, -60, 16, -80, -16, -80, -30, -60); fo(BR ? '#a89a8a' : col); ln(-29, -50, 29, -50, dk(col, 0.25), 3); rr(-20, -96, 40, 16, 4); fo(lt(col, 0.2), 3); for (const d of [-1, 1]) { X.beginPath(); X.arc(d * 32, -66, 8, -1.5, 1.5); X.strokeStyle = OUT; X.lineWidth = 4; X.stroke(); } X.restore(); };
  rr(-120, -20, 240, 20, 3); fo(OAK, 3);
  churn(-70, -20, 0); churn(0, -20, 0);
  if (BR) { churn(90, -10, 1.4); return; } churn(70, -20, 0);
  bloom(0, -110, 10, '#f6dd7a'); bloom(-70, -110, 10, '#ffffff');
});

const cowK = () => mk([-170, -170, 150, 14], (s) => {
  const deco = s;
  rr(-150, -20, 290, 30, 14); fo(BR ? '#c9b8a0' : '#e9cf7a', 3.5); X.save(); rr(-150, -20, 290, 30, 14); X.clip(); for (let k = 0; k < 24; k++) ln(-150 + k * 13, -20, -142 + k * 13, 10, '#c9a85a', 2); X.restore();
  if (BR) { for (let i = 0; i < 6; i++) ln(-120 + i * 40, -20, -100 + i * 40, -40, '#c9a85a', 3); return; }
  el(-10, -66, 110, 52); fo('#fbfaf6');
  X.save(); el(-10, -66, 110, 52); X.clip(); for (const [x, y, r] of [[-60, -90, 30], [30, -50, 26], [-10, -110, 18]]) { el(x, y, r, r * 0.8); fill('#3d3a3f'); } X.restore();
  el(100, -96, 40, 34); fo('#fbfaf6'); el(126, -82, 24, 18); fo('#f5c6c0', 3); el(118, -84, 3); fill('#7a4a4a'); el(134, -84, 3); fill('#7a4a4a');
  X.beginPath(); X.arc(96, -106, 4, 0, Math.PI); X.strokeStyle = '#2f2a28'; X.lineWidth = 2.5; X.stroke();
  for (const d of [-1, 1]) { el(100 + d * 34, -126, 14, 7); fo('#fbfaf6', 2.5); }
  ln(80, -134, 70, -150, '#e9d29a', 5); ln(120, -134, 130, -150, '#e9d29a', 5);
  X.beginPath(); X.moveTo(-118, -70); X.quadraticCurveTo(-150, -50, -140, -20); X.strokeStyle = OUT; X.lineWidth = 4; X.stroke();
  if (deco === 0) { for (let k = 0; k < 7; k++) bloom(76 + k * 9, -66 + Math.sin(k) * 3, 6, '#ffffff'); }
  else if (deco === 1) { X.beginPath(); X.moveTo(70, -70); X.quadraticCurveTo(100, -56, 130, -66); X.strokeStyle = '#c0583c'; X.lineWidth = 5; X.stroke(); poly(92, -60, 108, -60, 112, -36, 88, -36); fo(GOLD, 2.5); }
  else for (let k = 0; k < 6; k++) bloom(72 + k * 11, -136 + Math.abs(k - 2.5) * 3, 8, ['#e8846f', '#f4d27a', '#b9a3d6'][k % 3]);
});

const henHouse = () => mk([-150, -230, 150, 10], (s) => {
  const roof = ['#c0583c', '#4f84b3', '#5f9a5a'][s];
  shadow(0, 2, 120, 9);
  for (const x of [-90, 90]) post(x, 0, -50, TRUNK, 9);
  X.save(); if (BR) { X.translate(0, -50); X.rotate(0.06); X.translate(0, 50); }
  rr(-110, -150, 220, 100, 4); fo(BR ? '#c9c0b2' : '#fbf1e2'); X.save(); rr(-110, -150, 220, 100, 4); X.clip(); planks(-110, -150, 220, 100, BR ? '#c9c0b2' : '#fbf1e2', 20, true); X.restore(); rr(-110, -150, 220, 100, 4); out(4);
  archPath(-20, -110, 40, 60); fill('#3d3a3f');
  if (BR) { poly(-126, -146, 20, -146, -60, -196); fo('#9a9088'); }
  else { poly(-130, -146, 130, -146, 0, -220); fo(roof); }
  X.restore();
  ln(20, -50, 90, 0, OAK, 6);
  if (!BR) for (const [x, c] of [[-60, '#c0583c'], [130, '#e9d29a']]) { X.save(); X.translate(x, 0); el(0, -22, 22, 18); fo(c, 3); el(16, -42, 10, 11); fo(c, 2.5); poly(24, -44, 34, -40, 24, -36); fo('#f2a33a', 2); el(16, -54, 5, 4); fill('#d0483a'); el(18, -44, 2); fill('#2f2a28'); ln(-4, -4, -6, 8, '#f2a33a', 3); ln(4, -4, 6, 8, '#f2a33a', 3); X.restore(); }
});

/** A weathervane on a short spire (cockerel, cow or running hare). */
const vaneK = () => mk([-80, -200, 80, 6], (s) => {
  post(0, 0, -130, IRON, 6); ln(-40, -100, 40, -100, IRON, 4); txt('W', -50, -100, 14, IRON); txt('E', 50, -100, 14, IRON);
  X.save(); X.translate(0, -150); if (BR) X.rotate(0.7);
  const col = BR ? '#8f877d' : GOLD;
  if (s === 0) { el(0, 0, 30, 18); fo(col, 3); el(26, -18, 10); fo(col, 3); poly(34, -20, 44, -16, 34, -12); fo(col, 2); poly(-26, -4, -50, -40, -40, -2); fo(col, 3); poly(18, -28, 24, -40, 30, -28); fo('#d0483a', 2); }
  else if (s === 1) { rr(-34, -14, 60, 28, 10); fo(col, 3); el(32, -8, 12, 10); fo(col, 3); for (const x of [-26, -12, 10, 20]) ln(x, 12, x, 26, col, 4); ln(-34, -6, -44, 10, col, 3); }
  else { el(0, 0, 32, 14); fo(col, 3); el(32, -10, 10, 8); fo(col, 3); poly(30, -16, 34, -44, 40, -16); fo(col, 2); ln(-24, 8, -44, 20, col, 4); ln(20, 8, 40, 22, col, 4); }
  X.restore();
});

const vineRows = () => mk([-260, -180, 260, 14], (s) => {
  const [leaf, fruit] = [['#6a9f50', '#7a3f6a'], ['#7aaf5a', '#b5d06a'], ['#d9823a', '#7a3f6a']][s];
  for (let r = 0; r < 2; r++) {
    const y = -r * 60, x0 = -240 + r * 20, x1 = 240 - r * 20;
    for (let x = x0; x <= x1; x += 120) post(x, y, y - 110, TRUNK, 7);
    ln(x0, y - 100, x1, y - 100, '#8a7a6a', 2); ln(x0, y - 60, x1, y - 60, '#8a7a6a', 2);
    if (BR) { for (let x = x0 + 30; x < x1; x += 60) { X.beginPath(); X.moveTo(x, y); X.quadraticCurveTo(x + 20, y - 50, x - 10, y - 90); X.strokeStyle = C('#8a6a4a'); X.lineWidth = 4; X.stroke(); } continue; }
    const b = bush(0, y - 70, x1 - x0, 60, r ? dk(leaf, 0.1) : leaf, 9, 3.5);
    for (let k = 0; k < 9; k++) { const [bx, by] = b[k % b.length]; for (let q = 0; q < 6; q++) { el(bx - 10 + (q % 3) * 7, by + 14 + Math.floor(q / 3) * 8, 5); fo(fruit, 1.5); } }
  }
});

const pergolaK = ({ cols }) => mk([-220, -300, 220, 10], (s) => {
  const col = pick(cols, s);
  for (const x of [-180, 180]) { rr(x - 12, -260, 24, 260, 3); fo(col); }
  if (BR) { X.save(); X.translate(-200, -260); X.rotate(0.1); rr(0, -10, 260, 20, 3); fo(col, 3); X.restore(); return; }
  rr(-210, -270, 420, 22, 3); fo(col);
  for (let x = -190; x <= 190; x += 38) { rr(x - 6, -286, 12, 36, 3); fo(lt(col, 0.1), 3); }
  const b = bush(0, -270, 460, 50, '#6a9f50', 10, 3.5);
  for (let k = 0; k < 8; k++) { const [bx, by] = b[k]; for (let q = 0; q < 5; q++) { el(bx + (q % 2) * 7, by + 22 + q * 6, 5); fo('#7a3f6a', 1.5); } }
  for (const x of [-180, 180]) { X.beginPath(); X.moveTo(x, -10); for (let y = -10; y > -250; y -= 30) X.quadraticCurveTo(x + (y % 60 ? 18 : -18), y - 15, x, y - 30); X.strokeStyle = '#5f8f4a'; X.lineWidth = 5; X.stroke(); }
});

const longTable = ({ cols, goods }) => mk([-220, -140, 220, 10], (s) => {
  const [top, cloth] = cols[s];
  shadow(0, 2, 200, 10);
  if (BR) { dustSheet(0, 0, 380, 90); return; }
  for (const x of [-180, 180]) { rr(x - 8, -70, 16, 70, 3); fo(top, 3); }
  rr(-210, -84, 420, 18, 4); fo(top);
  if (cloth) { X.beginPath(); X.moveTo(-200, -84); X.lineTo(200, -84); X.lineTo(196, -44); X.quadraticCurveTo(0, -36, -196, -44); X.closePath(); fo(cloth, 3); if (cloth === '#d0483a' || cloth === '#4f84b3') { X.save(); X.clip(); X.globalAlpha = 0.5; for (let x = -200; x < 200; x += 20) { X.fillStyle = '#ffffff'; X.fillRect(x, -84, 10, 50); } X.restore(); } }
  const g = pick(goods, s), list = Array.isArray(g) ? g : [g];
  for (let i = 0; i < 6; i++) good(list[i % list.length], -170 + i * 68, -84);
  for (const x of [-120, 120]) { bench(x, 30, 150, top === '#fbf6ec' ? '#c9a06a' : top, s); }
});

const birdBoxes = ({ cols }) => mk([-160, -230, 160, 10], (s) => {
  [-100, 0, 100].forEach((x, i) => {
    const c = Array.isArray(cols[s]) ? cols[s][i] : cols[s];
    post(x, 0, -130, TRUNK, 7);
    if (BR && i === 1) { X.save(); X.translate(x + 30, -6); X.rotate(1.3); rr(-24, -40, 48, 40, 3); fo('#c9c0b2', 3); X.restore(); return; }
    rr(x - 28, -200, 56, 70, 3); fo(BR ? '#c9c0b2' : c);
    if (s === 2 && !BR) { rr(x - 22, -170, 14, 14, 2); fo('#ffe6a8', 2); rr(x + 8, -170, 14, 14, 2); fo('#ffe6a8', 2); }
    el(x, -176, 9); fill('#3d3a3f');
    poly(x - 38, -196, x + 38, -196, x, -232); fo(BR ? '#9a9088' : (s === 2 ? '#c0583c' : dk(c, 0.3)), 3.5);
    if (!BR && i === 2) { el(x + 26, -214, 10, 8); fo('#8a6a4a', 2); el(x + 32, -222, 6); fo('#8a6a4a', 2); el(x + 20, -210, 5, 4); fill('#f2a33a'); }
  });
});

const logPile = ({ kinds }) => mk([-150, -140, 150, 10], (s) => {
  const k = kinds[s];
  const bark = k === 'birch' ? '#efe8dc' : '#8a6a4a';
  const logEnd = (x, y, r) => { el(x, y, r); fo(BR ? '#c9b8a0' : '#e9cf9a', 3.5); for (let q = 1; q < 3; q++) { el(x, y, r * q / 3); X.strokeStyle = C('#c9a06a'); X.lineWidth = 2; X.stroke(); } };
  const rows = [[[-90, -30], [-30, -30], [30, -30], [90, -30]], [[-60, -84], [0, -84], [60, -84]], [[-30, -132], [30, -132]]];
  rows.forEach((row, ri) => row.forEach(([x, y], i) => {
    if (BR && ri === 2) return;
    rr(x - 26, y - 26, 60, 52, 20); fo(bark);
    if (k === 'birch') { ln(x, y - 12, x + 20, y - 14, '#3d3a3f', 3); }
    logEnd(x - 4, y, 26);
    if (k === 'moss' && !BR) { el(x - 4, y - 24, 22, 8); fill('#7aa865'); }
  }));
  if (BR) { X.save(); X.translate(110, -20); X.rotate(0.4); rr(-30, -24, 60, 48, 20); fo(bark); X.restore(); }
});

const toadstools = () => mk([-140, -110, 140, 10], (s) => {
  const [cap, dots] = [['#d0483a', '#ffffff'], ['#a0724a', '#e9cf9a'], ['#f5c6c0', '#ffffff']][s];
  [[-90, 0, 1], [0, -6, 1.3], [90, 0, 0.9], [44, 8, 0.6]].forEach(([x, y, k], i) => {
    if (BR && i % 2) { el(x, y - 6, 20 * k, 6 * k); fill('#a89a8a'); return; }
    rr(x - 12 * k, y - 50 * k, 24 * k, 50 * k, 8 * k); fo('#fbf1e2', 3);
    X.beginPath(); X.ellipse(x, y - 50 * k, 44 * k, 34 * k, 0, Math.PI, 0); X.closePath(); fo(BR ? '#b8a89a' : cap, 3.5);
    if (!BR) for (let q = 0; q < 4; q++) { el(x - 26 * k + q * 17 * k, y - 62 * k - (q % 2) * 12 * k, 5 * k); fill(dots); }
  });
  if (!BR) bush(0, 6, 260, 20, '#6a9f50', 6, 3);
});

/** A little footbridge over a woodland stream (painted in the shell). */
const footbridge = ({ cols }) => mk([-180, -150, 180, 30], (s) => {
  const col = pick(cols, s);
  X.beginPath(); X.moveTo(-170, 20); X.quadraticCurveTo(0, -60, 170, 20); X.lineTo(170, 34); X.quadraticCurveTo(0, -44, -170, 34); X.closePath(); fo(BR ? '#b9a080' : OAK);
  if (BR) { for (let k = 0; k < 3; k++) { X.save(); X.translate(-80 + k * 80, -10); X.rotate(0.3 - k * 0.3); rr(-24, -5, 48, 10, 3); fo('#b9a080', 3); X.restore(); } return; }
  for (const x of [-150, -50, 50, 150]) { const y = 20 - 80 * (1 - (x / 170) ** 2) * 0.5; post(x, y, y - 70, col === 'rope' ? '#8a6a4a' : col, 6); }
  if (col === 'rope') { for (const dy of [-64, -34]) { X.beginPath(); X.moveTo(-150, 6 + dy); X.quadraticCurveTo(-100, -16 + dy + 14, -50, -20 + dy); X.quadraticCurveTo(0, -24 + dy + 10, 50, -20 + dy); X.quadraticCurveTo(100, -16 + dy + 14, 150, 6 + dy); X.strokeStyle = C('#c9b48a'); X.lineWidth = 4; X.stroke(); } }
  else { X.beginPath(); X.moveTo(-150, -50); X.quadraticCurveTo(0, -110, 150, -50); X.strokeStyle = OUT; X.lineWidth = 11; X.stroke(); X.strokeStyle = C(col); X.lineWidth = 7; X.stroke(); }
});

const logBench = ({ kinds }) => mk([-130, -90, 130, 10], (s) => {
  const k = kinds[s];
  shadow(0, 2, 110, 8);
  for (const x of [-80, 80]) { rr(x - 22, -40, 44, 40, 10); fo('#8a6a4a'); el(x, -40, 22, 7); fo('#e9cf9a', 3); }
  X.save(); if (BR) { X.translate(-40, 0); X.rotate(0.2); X.translate(40, 0); }
  rr(-120, -64, 240, 26, 12); fo(k === 'moss' ? '#8a7a5a' : '#a0724a');
  if (k === 'carved') { rr(-110, -64, 220, 8, 3); fill('#c9a06a'); for (let x = -80; x <= 80; x += 40) bloom(x, -50, 6, '#e9cf9a', '#c9a06a'); }
  if (k === 'moss' && !BR) { for (let x = -100; x < 100; x += 40) { el(x, -62, 20, 6); fill('#7aa865'); } }
  el(-120, -51, 8, 13); fo('#e9cf9a', 3);
  X.restore();
});

const denK = () => mk([-150, -220, 150, 10], (s) => {
  const roof = ['#8a6a4a', '#7aa865', '#a0907a'][s];
  shadow(0, 2, 130, 10);
  if (BR) { for (let k = 0; k < 6; k++) { X.save(); X.translate(-100 + k * 40, -6); X.rotate(-0.2 + k * 0.08); rr(-6, -60, 12, 64, 4); fo('#9a8a6a', 3); X.restore(); } return; }
  X.beginPath(); X.moveTo(-140, 0); X.lineTo(0, -210); X.lineTo(140, 0); X.closePath(); fo(roof);
  X.save(); X.beginPath(); X.moveTo(-140, 0); X.lineTo(0, -210); X.lineTo(140, 0); X.closePath(); X.clip();
  if (s === 2) { for (let y = -200; y < 0; y += 18) for (let x = -140 + ((y / 18) % 2) * 12; x < 140; x += 24) { X.beginPath(); X.arc(x, y + 18, 12, 0, Math.PI); X.strokeStyle = '#7a6a5a'; X.lineWidth = 2; X.stroke(); } }
  else for (let x = -140; x < 140; x += 18) ln(x, 0, 0, -210, dk(roof, 0.2), 3);
  X.restore();
  archPath(-40, -100, 80, 100); fo('#3d3a3f', 3);
  glow(0, -50, 60, '#ffd98a', 0.4);
  lightString(swag(-120, -40, 120, -40, -60, 7), 'star', '#f6dd7a', true);
});

const domeK = () => mk([-200, -460, 200, 10], (s) => {
  const dome = ['#7fb7a4', '#c9ccd0', '#2f3f6b'][s];
  shadow(0, 2, 180, 12);
  rr(-170, -220, 340, 220, 4); fo(BR ? '#c9c0b2' : '#fbf1e2');
  X.save(); rr(-170, -220, 340, 220, 4); X.clip(); X.strokeStyle = C('#d9cfbf'); X.lineWidth = 2.5; for (let y = -200; y < 0; y += 30) { X.beginPath(); X.moveTo(-170, y); X.lineTo(170, y); X.stroke(); } X.restore();
  archPath(-40, -150, 80, 150); fo(BR ? '#a89a8a' : '#2f3f6b', 3.5);
  for (const x of [-110, 110]) { archPath(x - 26, -170, 52, 80); fo(BR ? '#b8b0a4' : '#ffe6a8', 3); }
  rr(-186, -236, 372, 22, 4); fo(lt('#fbf1e2', 0.1), 3.5);
  X.save();
  X.beginPath(); X.moveTo(-170, -236); X.bezierCurveTo(-170, -460, 170, -460, 170, -236); X.closePath(); fo(BR ? '#a8a08a' : dome);
  X.save(); X.beginPath(); X.moveTo(-170, -236); X.bezierCurveTo(-170, -460, 170, -460, 170, -236); X.closePath(); X.clip();
  for (let k = -3; k <= 3; k++) { X.beginPath(); X.moveTo(k * 48, -236); X.quadraticCurveTo(k * 30, -360, 0, -410); X.strokeStyle = C(dk(dome, 0.2)); X.lineWidth = 3; X.stroke(); }
  if (BR) { rr(30, -380, 40, 120, 3); fill('#7a6a5a'); }
  else { rr(-24, -420, 48, 190, 4); fill(s === 2 ? '#1f2a4a' : dk(dome, 0.35)); ln(-30, -240, 60, -400, '#e9e1d2', 0); }
  X.restore(); X.restore();
  if (!BR) { X.save(); X.translate(0, -300); X.rotate(-0.6); rr(-14, -110, 28, 120, 10); fo(GOLD, 3); X.restore(); for (const [x, y] of [[-150, -420], [160, -400], [120, -460]]) { star(x, y, 12, 0.45); fo('#fff1c8', 2.5); } }
});

const starBoard = () => mk([-110, -270, 110, 8], (s) => {
  const [bg, ink] = [['#2f3f6b', '#fff1c8'], ['#4a2f6b', '#f6dd7a'], ['#1f6f8a', '#fff8ec']][s];
  for (const x of [-80, 80]) post(x, 0, -110, '#8a6a4a', 8);
  X.save(); if (BR) X.rotate(0.08);
  rr(-104, -262, 208, 160, 6); fo('#c9a06a'); rr(-94, -252, 188, 140, 3); fo(BR ? '#a89a8a' : bg, 3);
  if (!BR) {
    const pts = [[-60, -220], [-20, -200], [10, -228], [50, -190], [70, -150], [-40, -150], [0, -140]];
    X.strokeStyle = ink; X.lineWidth = 1.5; X.globalAlpha = 0.6; X.beginPath(); pts.forEach(([x, y], i) => (i ? X.lineTo(x, y) : X.moveTo(x, y))); X.stroke(); X.globalAlpha = 1;
    for (const [x, y] of pts) { star(x, y, 7, 0.45); fill(ink); }
    X.beginPath(); X.arc(-60, -140, 14, 0, TAU); X.arc(-54, -146, 12, 0, TAU, true); fill(ink);
  } else { for (let k = 0; k < 3; k++) { el(-40 + k * 40, -180, 3); fill('#d8d0c4'); } }
  X.restore();
});

const kayaks = () => mk([-200, -190, 200, 10], (s) => {
  const cols = [['#d0483a', '#f2c64e', '#4f84b3'], ['#f5c6c0', '#bfe3d4', '#fff1b8'], ['#b98a5a', '#a0724a', '#c9a06a']][s];
  for (const x of [-170, 170]) post(x, 0, -170, '#8a6a4a', 8);
  for (const y of [-150, -100, -50]) ln(-176, y + 10, 176, y + 10, '#8a6a4a', 6);
  [-150, -100, -50].forEach((y, i) => {
    if (BR && i === 1) { X.save(); X.translate(30, -6); X.rotate(0.08); el(0, -14, 150, 18); fo('#c9c0b2', 3); X.restore(); return; }
    X.beginPath(); X.moveTo(-190, y); X.quadraticCurveTo(0, y - 34, 190, y); X.quadraticCurveTo(0, y + 26, -190, y); X.closePath(); fo(BR ? '#c9c0b2' : cols[i]);
    if (!BR) { el(0, y - 6, 40, 9); fo('#3d3a3f', 2.5); }
  });
  if (!BR) { X.save(); X.translate(150, -10); X.rotate(-0.3); ln(0, 0, 0, -170, '#3d3a3f', 5); el(0, -176, 10, 22); fo(cols[0], 2.5); el(0, 4, 10, 22); fo(cols[0], 2.5); X.restore(); }
});

const hammock = () => mk([-240, -330, 240, 10], (s) => {
  const cols = [['#d0483a', '#f2c64e', '#4f84b3', '#5f9a5a'], ['#4f84b3', '#cfe3f2'], ['#f2a33a', '#e8846f', '#f5c6c0']][s];
  for (const x of [-210, 210]) { X.save(); X.translate(x, 0); X.beginPath(); X.moveTo(-10, 0); X.quadraticCurveTo(x < 0 ? -6 : 6, -160, x < 0 ? 4 : -4, -300); X.lineTo(x < 0 ? 18 : 10, -300); X.quadraticCurveTo(x < 0 ? 10 : 14, -160, 12, 0); X.closePath(); fo('#a07a55'); X.restore(); }
  for (const x of [-210, 210]) for (let i = 0; i < 6; i++) { X.save(); X.translate(x + 6, -300); X.rotate(-Math.PI + i * Math.PI / 5); X.beginPath(); X.moveTo(0, 0); X.quadraticCurveTo(50, -18, 90, 10); X.quadraticCurveTo(50, 4, 0, 0); fo(BR ? '#a9a48c' : '#5f9a4a', 3); X.restore(); }
  if (BR) { ln(-200, -150, -120, -40, '#c9b48a', 3); X.save(); X.translate(-100, -20); X.rotate(0.3); rr(-60, -10, 120, 20, 6); fo('#c9c0b2', 3); X.restore(); return; }
  for (const d of [-1, 1]) ln(d * 200, -160, d * 140, -110, '#c9b48a', 3);
  X.beginPath(); X.moveTo(-140, -110); X.quadraticCurveTo(0, -20, 140, -110); X.quadraticCurveTo(0, -60, -140, -110); fo(cols[0]);
  X.save(); X.beginPath(); X.moveTo(-140, -110); X.quadraticCurveTo(0, -20, 140, -110); X.quadraticCurveTo(0, -60, -140, -110); X.clip(); stripes(-140, -120, 280, 100, cols, 20); X.restore();
  X.beginPath(); X.moveTo(-140, -110); X.quadraticCurveTo(0, -20, 140, -110); X.quadraticCurveTo(0, -60, -140, -110); out(3.5);
});

const marquee = () => mk([-250, -330, 250, 10], (s) => {
  const [a, b] = [['#d0483a', '#fff8ec'], ['#3f8f5a', '#fbf1e2'], ['#2f6fa8', '#fff8ec']][s];
  shadow(0, 2, 230, 12);
  rr(-220, -170, 440, 170, 3); fo(BR ? '#d8d0c4' : b);
  if (!BR) { X.save(); rr(-220, -170, 440, 170, 3); X.clip(); stripes(-220, -170, 440, 170, [b, lt(a, 0.6)], 40); X.restore(); rr(-220, -170, 440, 170, 3); out(4); poly(-60, 0, 60, 0, 30, -150, -30, -150); fo('#3d3a3f', 3); poly(-60, 0, -30, -150, -90, -40); fo(b, 3); poly(60, 0, 30, -150, 90, -40); fo(b, 3); }
  if (BR) { poly(-220, -170, 60, -170, -60, -260); fo('#c9c0b2'); ln(-230, -170, 230, -170, '#8a7a6a', 5); return; }
  poly(-240, -166, 240, -166, 0, -300); fill(a);
  X.save(); poly(-240, -166, 240, -166, 0, -300); X.clip(); for (let k = -6; k <= 6; k += 2) { poly(0, -300, k * 40 - 20, -166, k * 40 + 20, -166); X.fillStyle = C(b); X.fill(); } X.restore();
  poly(-240, -166, 240, -166, 0, -300); out(4);
  for (let x = -240, i = 0; x < 240; x += 30, i++) { X.beginPath(); X.moveTo(x, -166); X.lineTo(x + 30, -166); X.arc(x + 15, -166, 15, 0, Math.PI); X.closePath(); fo(i % 2 ? b : a, 2.5); }
  post(0, -300, -326, IRON, 4); poly(4, -326, 40, -318, 4, -310); fo(a, 2.5);
});

const pumpkins = ({ kinds }) => mk([-150, -90, 150, 10], (s) => {
  const k = kinds[s];
  const spots = [[-100, 0, 1], [-20, -4, 1.3], [70, 0, 1], [120, 4, 0.7], [20, -50, 0.8]];
  spots.forEach(([x, y, sc], i) => {
    if (BR && i % 2) return;
    X.save(); X.translate(x, y); X.scale(sc, sc);
    if (k === 'gourd') { el(0, -14, 14, 18); fo(['#f2c64e', '#9cc65a', '#f2a33a'][i % 3], 3); el(0, -34, 9, 10); fo(['#f2c64e', '#9cc65a', '#f2a33a'][i % 3], 3); }
    else { el(0, -24, 32, 24); fo(BR ? '#c9b8a0' : k === 'pale' ? '#f1e2c4' : '#ef8a3a'); ln(-12, -46, -14, -4, k === 'pale' ? '#d9c39a' : '#c9682a', 2); ln(12, -46, 14, -4, k === 'pale' ? '#d9c39a' : '#c9682a', 2); ln(0, -48, 4, -58, '#5f7a3a', 4); }
    X.restore();
  });
  if (!BR) { bush(0, 6, 300, 18, '#6a9f50', 6, 3); }
});

const nameBoard = ({ text, cols, w = 360 }) => mk([-w / 2 - 10, -260, w / 2 + 10, 8], (s) => {
  const [bg, fg, edge] = cols[s];
  for (const x of [-w / 2 + 30, w / 2 - 30]) post(x, 0, -170, edge, 9);
  X.save(); if (BR) X.rotate(-0.05);
  rr(-w / 2, -250, w, 80, 10); fo(edge); rr(-w / 2 + 8, -242, w - 16, 64, 6); fo(bg, 3);
  txt(worn(text), 0, -209, 34, fg, { font: SERIF, maxW: w - 40 });
  if (BR) crack(w * 0.2, -244, 50);
  X.restore();
});

const luggage = ({ kinds }) => mk([-140, -200, 150, 10], (s) => {
  const k = kinds[s];
  shadow(0, 2, 120, 8);
  X.save(); if (BR) X.rotate(0.04);
  rr(-120, -40, 240, 14, 3); fo('#8a6a4a', 3); for (const x of [-90, 90]) { el(x, -14, 14); fo('#3d3a3f', 3); }
  ln(120, -40, 150, -170, IRON, 6); ln(132, -176, 160, -164, IRON, 6);
  if (!BR) {
    if (k === 'cases') { rr(-110, -110, 120, 70, 6); fo('#8a5a3b'); rr(-10, -96, 100, 56, 6); fo('#c0583c'); rr(-80, -160, 110, 50, 6); fo('#3f6f5a'); for (const [x, y] of [[-50, -110], [40, -96], [-25, -160]]) { X.beginPath(); X.arc(x, y, 12, Math.PI, 0); X.strokeStyle = OUT; X.lineWidth = 4; X.stroke(); } }
    else if (k === 'hat') { for (const [x, y, r, c] of [[-60, -74, 40, '#f5c6c0'], [30, -70, 36, '#bfe3d4'], [-20, -140, 32, '#fff1b8']]) { rr(x - r, y - 34, r * 2, 34, 6); fo(c); el(x, y - 34, r, 8); fo(lt(c, 0.2), 3); ln(x - r, y - 18, x + r, y - 18, '#d0483a', 4); } }
    else { for (const [x, y] of [[-60, -40], [40, -40], [-10, -100]]) { rr(x - 46, y - 56, 92, 56, 6); fo('#c9a06a'); X.save(); rr(x - 46, y - 56, 92, 56, 6); X.clip(); for (let q = -46; q < 46; q += 10) ln(x + q, y - 56, x + q, y, '#a07850', 2); X.restore(); rr(x - 46, y - 56, 92, 56, 6); out(3); ln(x - 46, y - 30, x + 46, y - 30, '#d0483a', 4); } }
  } else { rr(-100, -80, 110, 40, 6); fo('#b8a88e'); X.save(); X.translate(60, -40); X.rotate(0.5); rr(-40, -40, 80, 40, 6); fo('#b8a88e'); X.restore(); }
  X.restore();
});

const canopy = ({ cols, w = 560 }) => mk([-w / 2 - 20, -320, w / 2 + 20, 10], (s) => {
  const [col, glass] = cols[s];
  for (const x of [-w / 2 + 30, 0, w / 2 - 30]) { if (BR && x > 0) continue; rr(x - 9, -260, 18, 260, 3); fo(col); el(x, -260, 22, 10); fo(col, 3); }
  if (BR) { poly(-w / 2, -270, 10, -270, 10, -250, -w / 2 + 20, -240); fo('#b8b0a4'); X.save(); X.translate(30, -270); X.rotate(0.3); rr(0, -10, 200, 20, 3); fo('#b8b0a4', 3); X.restore(); return; }
  poly(-w / 2 - 10, -264, w / 2 + 10, -264, w / 2 - 40, -312, -w / 2 + 40, -312); fo(glass);
  X.save(); poly(-w / 2 - 10, -264, w / 2 + 10, -264, w / 2 - 40, -312, -w / 2 + 40, -312); X.clip(); for (let x = -w / 2; x < w / 2; x += 40) ln(x, -264, x + 16, -312, col, 3); X.restore();
  for (let x = -w / 2 - 10; x < w / 2 + 10; x += 20) { poly(x, -264, x + 20, -264, x + 10, -246); fo(col === '#fbf6ec' ? '#c0583c' : col, 2); }
});

const engineK = () => mk([-240, -300, 240, 10], (s) => {
  const col = ['#2f6f4a', '#2f4a8a', '#a8333a'][s];
  shadow(0, 2, 220, 10);
  ln(-240, -6, 240, -6, '#5b5550', 8);
  X.save(); if (BR) { X.translate(0, 0); X.rotate(0.015); }
  rr(-210, -60, 420, 30, 4); fo('#2b2a2a');
  rr(-160, -170, 260, 110, 50); fo(BR ? '#a89a8a' : col);
  X.save(); rr(-160, -170, 260, 110, 50); X.clip(); for (const x of [-100, -20, 60]) ln(x, -170, x, -60, BR ? '#8f877d' : GOLD, 5); X.restore();
  rr(80, -250, 130, 190, 6); fo(BR ? '#a89a8a' : col); rr(100, -230, 90, 60, 4); fo(BR ? '#b8b0a4' : '#ffe6a8', 3); rr(70, -266, 150, 22, 4); fo('#2b2a2a', 3);
  rr(-140, -250, 40, 80, 4); fo('#2b2a2a'); rr(-150, -262, 60, 18, 4); fo(BR ? '#8f877d' : GOLD, 3);
  el(-30, -186, 22, 16); fo(BR ? '#8f877d' : GOLD, 3);
  rr(-230, -86, 30, 30, 4); fo('#d0483a', 3);
  for (const x of [-120, -20, 80, 160]) { wheel(x, -36, 34, BR ? '#5b5550' : '#2b2a2a', BR && x === 160); }
  if (!BR) { ln(-120, -36, 80, -36, '#c9ccd0', 6); for (let k = 0; k < 4; k++) { el(-120 - k * 20, -280 - k * 10, 20 + k * 6, 16 + k * 4); X.fillStyle = 'rgba(255,255,255,.75)'; X.fill(); } }
  X.restore();
});

const muralK = ({ w = 640 }) => mk([-w / 2 - 6, -170, w / 2 + 6, 6], (s) => {
  rr(-w / 2, -160, w, 160, 4); fo(BR ? '#c9c0b2' : '#e9e1d2');
  X.save(); rr(-w / 2, -160, w, 160, 4); X.clip();
  if (BR) { for (let i = 0; i < 6; i++) { el(-w / 2 + 60 + i * 100, -80 + (i % 2) * 30, 40, 20); fill('#b8b0a4'); } X.restore(); return; }
  if (s === 2) { const g = X.createLinearGradient(0, -160, 0, 0); g.addColorStop(0, '#f6c6a4'); g.addColorStop(0.5, '#f2a37a'); g.addColorStop(1, '#4f84b3'); X.fillStyle = g; X.fillRect(-w / 2, -160, w, 160); el(0, -70, 50); fill('#f6dd7a'); X.fillStyle = '#2f6f8a'; X.fillRect(-w / 2, -60, w, 60); }
  else { X.fillStyle = '#cfe9f2'; X.fillRect(-w / 2, -160, w, 160); X.fillStyle = '#4f9fb3'; X.fillRect(-w / 2, -70, w, 70); }
  X.strokeStyle = '#ffffff'; X.lineWidth = 5;
  for (let x = -w / 2; x < w / 2; x += 60) { X.beginPath(); X.arc(x + 30, -60, 22, Math.PI, 0); X.stroke(); }
  if (s === 0) for (let k = 0; k < 5; k++) { const x = -w / 2 + 80 + k * 120, y = -120 + (k % 2) * 20; X.beginPath(); X.moveTo(x - 20, y); X.quadraticCurveTo(x - 10, y - 10, x, y); X.quadraticCurveTo(x + 10, y - 10, x + 20, y); X.strokeStyle = '#3d3a3f'; X.lineWidth = 3; X.stroke(); }
  if (s === 1) for (let k = 0; k < 6; k++) { const x = -w / 2 + 60 + k * 100; if (k % 2) good('shell', x, -16); else good('fish', x, -26); }
  X.restore();
});

const chalets = () => mk([-330, -270, 330, 10], (s) => {
  const rows = [['#f08070', '#f6dd7a', '#8fcfb5', '#9fbfe8', '#c9a3e0'], ['#f5c6c0', '#fff1b8', '#bfe3d4', '#cfe3f2', '#e9d6f2'], ['#4f84b3', '#ffffff', '#4f84b3', '#ffffff', '#4f84b3']][s];
  for (let i = 0; i < 5; i++) {
    const x = -260 + i * 130;
    X.save(); X.translate(x, 0);
    if (BR && i % 2) { rr(-56, -150, 112, 150, 2); fo('#c9c0b2'); poly(-64, -146, 30, -146, -20, -190); fo('#9a9088'); X.restore(); continue; }
    hut(112, 170, BR ? '#c9c0b2' : rows[i], s === 2 && i % 2 ? '#4f84b3' : '#ffffff', 0, BR ? '#9a9088' : dk(rows[i], 0.25));
    X.restore();
  }
});

const banner = ({ cols }) => mk([-260, -380, 260, 10], (s) => {
  const [bg, fg] = cols[s];
  for (const x of [-240, 240]) post(x, 0, -340, '#a0724a', 9);
  if (BR) { X.save(); X.translate(-230, -320); X.rotate(1.2); rr(0, -20, 200, 40, 6); fo('#d8d0c4', 3); X.restore(); return; }
  X.beginPath(); X.moveTo(-236, -330); X.quadraticCurveTo(0, -300, 236, -330); X.lineTo(236, -250); X.quadraticCurveTo(0, -220, -236, -250); X.closePath(); fo(bg);
  if (fg === 'rainbow') { const word = 'Welcome Home', cs = ['#d0483a', '#f2a33a', '#f2c64e', '#5f9a5a', '#4f84b3', '#7a4fa0']; X.font = `700 40px ${SERIF}`; let x = -X.measureText(word).width / 2; for (let i = 0; i < word.length; i++) { const ch = word[i], w = X.measureText(ch).width; txt(ch, x + w / 2, -284, 40, cs[i % 6]); x += w; } }
  else txt('Welcome Home', 0, -284, 40, fg, { maxW: 440 });
  for (const x of [-236, 236]) { X.beginPath(); X.moveTo(x, -250); X.lineTo(x + (x < 0 ? 14 : -14), -226); X.lineTo(x, -230); X.closePath(); fo(bg, 3); }
});

const cakeK = () => mk([-110, -250, 110, 10], (s) => {
  const [sponge, icing, top] = [['#f3d7a0', '#fffaf0', '#d0483a'], ['#7a4a32', '#5b3626', '#f6dd7a'], ['#f6e6a0', '#f5c6c0', '#f2a8b8']][s];
  rr(-100, -30, 200, 18, 6); fo('#c9ccd0', 3); rr(-16, -14, 32, 14, 3); fo('#c9ccd0', 3);
  if (BR) { dustSheet(0, -30, 150, 110); return; }
  for (const [y, w, h] of [[-30, 170, 70], [-100, 130, 60], [-160, 90, 50]]) {
    rr(-w / 2, y - h, w, h, 8); fo(sponge);
    X.fillStyle = C(icing); X.fillRect(-w / 2 + 2, y - h * 0.55, w - 4, 8);
    X.beginPath(); X.moveTo(-w / 2, y - h + 6); for (let x = -w / 2; x <= w / 2; x += 14) X.quadraticCurveTo(x + 7, y - h + 22, x + 14, y - h + 6); X.lineTo(w / 2, y - h); X.lineTo(-w / 2, y - h); X.closePath(); fill(icing);
  }
  for (let k = 0; k < 5; k++) { el(-36 + k * 18, -214, 7); fo(top, 2); }
  for (const x of [-20, 0, 20]) { rr(x - 3, -246, 6, 26, 2); fo('#bfe3d4', 2); el(x, -250, 4, 7); fill('#f6a33a'); glow(x, -250, 30, '#ffd98a', 0.5); }
});

const flowerArch = ({ looks }) => mk([-170, -360, 170, 10], (s) => {
  const [leaf, cols] = looks[s];
  X.beginPath(); X.moveTo(-140, 0); X.lineTo(-140, -200); X.arc(0, -200, 140, Math.PI, 0); X.lineTo(140, 0);
  X.strokeStyle = OUT; X.lineWidth = 16; X.stroke(); X.strokeStyle = C('#fbf6ec'); X.lineWidth = 10; X.stroke();
  if (BR) { for (let k = 0; k < 5; k++) ln(-140 + k * 6, -40 - k * 30, -120 + k * 6, -60 - k * 30, '#8a6a4a', 3); return; }
  const pts = []; for (let k = 0; k <= 12; k++) { const a = Math.PI + k * Math.PI / 12; pts.push([Math.cos(a) * 140, -200 + Math.sin(a) * 140]); }
  for (let y = -190; y > -10; y -= 40) { pts.push([-140, y + 10]); pts.push([140, y + 10]); }
  X.lineWidth = 8; X.strokeStyle = OUT; for (const [x, y] of pts) { X.beginPath(); X.arc(x, y, 26, 0, TAU); X.stroke(); }
  X.fillStyle = C(leaf); for (const [x, y] of pts) { X.beginPath(); X.arc(x, y, 26, 0, TAU); X.fill(); }
  pts.forEach(([x, y], i) => { if (cols === 'sun') { bloom(x, y, 22, '#f2c64e', '#7a4a32'); } else bloom(x + (i % 2) * 6, y - 4, 11, cols[i % cols.length]); });
});

const fireworks = () => mk([-440, -1120, 170, 10], (s) => {
  const cs = [['#f6dd7a', '#ffd98a', '#fff1c8'], ['#f08070', '#8fcfb5', '#9fbfe8', '#f6dd7a', '#c9a3e0'], ['#e9f3f6', '#cfe3f2', '#ffffff']][s];
  // the launch box on the ground and three bursts high above it
  rr(-60, -40, 120, 40, 4); fo(BR ? '#b8a88e' : '#c0583c'); for (let k = 0; k < 4; k++) { rr(-48 + k * 26, -64, 18, 26, 3); fo(BR ? '#c9c0b2' : ['#f2c64e', '#4f84b3', '#5f9a5a', '#7a4fa0'][k], 2.5); }
  if (BR) { for (let k = 0; k < 3; k++) { X.save(); X.translate(80 + k * 30, -6); X.rotate(1.4); rr(-6, -40, 12, 40, 3); fo('#c9c0b2', 2.5); X.restore(); } return; }
  for (const [x, y, r, i] of [[-320, -960, 80, 0], [-110, -1010, 90, 1], [40, -920, 64, 2]]) {
    X.save(); X.globalAlpha = 0.3; ln(0, -70, x, y + r * 0.3, cs[i % cs.length], 3); X.restore();
    glow(x, y, r * 1.4, cs[i % cs.length], 0.35);
    for (let k = 0; k < 16; k++) {
      const a = k * TAU / 16, c = cs[(k + i) % cs.length];
      if (s === 2) { X.beginPath(); X.moveTo(x + Math.cos(a) * r * 0.2, y + Math.sin(a) * r * 0.2); X.quadraticCurveTo(x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.6, x + Math.cos(a) * r, y + Math.sin(a) * r + 30); X.strokeStyle = c; X.lineWidth = 3; X.stroke(); }
      else { ln(x + Math.cos(a) * r * 0.3, y + Math.sin(a) * r * 0.3, x + Math.cos(a) * r * 0.85, y + Math.sin(a) * r * 0.85, c, 4); if (s === 0) { star(x + Math.cos(a) * r, y + Math.sin(a) * r, 8, 0.45); fill(c); } else { el(x + Math.cos(a) * r, y + Math.sin(a) * r, 5); fill(c); } }
    }
  }
});

const gangwayK = ({ cols }) => mk([-40, -120, 260, 100], (s) => {
  const col = pick(cols, s);
  X.save(); X.translate(0, 0); X.rotate(0.22);
  rr(0, -10, 250, 20, 3); fo(OAK); X.save(); rr(0, -10, 250, 20, 3); X.clip(); for (let x = 10; x < 250; x += 18) ln(x, -10, x, 10, '#8a6a4a', 2); X.restore();
  if (BR) { X.restore(); ln(30, 6, 120, 70, '#8a7a6a', 3); return; }
  for (let x = 10; x <= 240; x += 46) post(x, -8, -70, col === 'rope' ? '#8a6a4a' : col, 5);
  if (col === 'rope') { for (const dy of [-66, -38]) { X.beginPath(); X.moveTo(10, dy); X.quadraticCurveTo(125, dy + 18, 240, dy); X.strokeStyle = C('#c9b48a'); X.lineWidth = 4; X.stroke(); } }
  else { ln(10, -68, 240, -68, col, 6); ln(10, -40, 240, -40, col, 4); }
  X.restore();
});

const chartTable = ({ cols }) => mk([-120, -150, 120, 10], (s) => {
  const [col, cloth] = cols[s];
  shadow(0, 2, 100, 8);
  for (const x of [-90, 90]) { rr(x - 7, -80, 14, 80, 3); fo(col, 3); }
  rr(-110, -94, 220, 16, 4); fo(col);
  if (BR) { dustSheet(0, -76, 160, 50); return; }
  X.beginPath(); X.moveTo(-104, -94); X.lineTo(104, -94); X.lineTo(100, -62); X.quadraticCurveTo(0, -54, -100, -62); X.closePath(); fo(cloth, 3);
  good('cup', -60, -94); good('flowers', 0, -94); good('cake', 60, -94);
});


// ------------------------------------------------------------------ a few more one-off pieces
/** A cat basket by the door (a ginger cat moves in once it's done). */
const catBed = () => mk([-80, -84, 80, 10], (s) => {
  shadow(0, 2, 66, 7);
  if (s === 0) { el(0, -18, 66, 22); fo(BR ? '#c9c0b2' : '#c9a06a'); X.save(); el(0, -18, 66, 22); X.clip(); for (let x = -70; x < 70; x += 12) ln(x, -40, x + 8, 4, dk(BR ? '#c9c0b2' : '#c9a06a', 0.2), 2); X.restore(); el(0, -30, 54, 10); fill(BR ? '#b8b0a4' : '#a0724a'); }
  else if (s === 1) { rr(-66, -32, 132, 32, 14); fo(BR ? '#c9c0b2' : '#e8846f'); if (!BR) { X.save(); rr(-66, -32, 132, 32, 14); X.clip(); const cs = ['#f4d27a', '#8fcfb5', '#b9a3d6']; for (let i = 0; i < 6; i++) { X.fillStyle = C(cs[i % 3]); X.fillRect(-66 + i * 44, -32 + (i % 2) * 16, 22, 16); } X.restore(); rr(-66, -32, 132, 32, 14); out(3); } }
  else { crate(0, 0, 136, 44, BR ? '#b8a88e' : '#c9a06a'); if (!BR) txt('APPLES', 0, -20, 14, '#8a5a3b', { font: ROUND }); }
  if (BR) { el(30, -6, 14, 5); fill('#b8b0a4'); return; }
  const fur = '#eaa45e', y0 = s === 2 ? -44 : -30;
  el(-4, y0 - 14, 42, 20); fo(fur, 3);
  for (let k = 0; k < 3; k++) ln(-24 + k * 16, y0 - 32, -20 + k * 16, y0 - 18, '#c9783a', 3);
  X.beginPath(); X.moveTo(-40, y0 - 6); X.quadraticCurveTo(-56, y0 - 30, -26, y0 - 34); X.strokeStyle = OUT; X.lineWidth = 11; X.stroke(); X.strokeStyle = C(fur); X.lineWidth = 7; X.stroke();
  el(30, y0 - 22, 17, 15); fo(fur, 3);
  poly(19, y0 - 32, 22, y0 - 48, 31, y0 - 35); fo(fur, 2.5); poly(32, y0 - 35, 41, y0 - 48, 44, y0 - 30); fo(fur, 2.5);
  ln(22, y0 - 22, 28, y0 - 21, '#5b3a2a', 2); ln(34, y0 - 21, 40, y0 - 22, '#5b3a2a', 2); el(31, y0 - 16, 2.5); fill('#d07070');
});

/** Big double doors for a shed, a barn or a lifeboat house (anchor at the sill, centre). */
const shedDoors = ({ cols, w = 300, h = 260, frame = '#efe4cc' }) => mk([-w / 2 - 16, -h - 30, w / 2 + 16, 10], (s) => {
  const col = pick(cols, s), c = BR ? mix(col, '#a49a8e', 0.5) : col;
  shadow(0, 4, w * 0.6, 8);
  rr(-w / 2 - 12, -h - 12, w + 24, h + 14, 3); fo(frame);
  poly(-w / 2 - 16, -h - 12, w / 2 + 16, -h - 12, 0, -h - 30); fo(frame, 3.5);
  for (const d of [-1, 1]) {
    X.save();
    if (BR && d > 0) { X.translate(w / 2, 0); X.rotate(-0.05); X.translate(-w / 2, 0); }
    const x = d < 0 ? -w / 2 : 2;
    rr(x, -h, w / 2 - 2, h, 2); fill(c); X.save(); rr(x, -h, w / 2 - 2, h, 2); X.clip(); planks(x, -h, w / 2 - 2, h, c, 22, true); X.restore(); rr(x, -h, w / 2 - 2, h, 2); out(4);
    ln(x + 8, -16, x + w / 2 - 10, -h + 16, dk(c, 0.25), 7); ln(x + 6, -h + 16, x + w / 2 - 8, -h + 16, dk(c, 0.25), 7); ln(x + 6, -16, x + w / 2 - 8, -16, dk(c, 0.25), 7);
    X.restore();
  }
  if (BR) { for (const [a, b] of [[-0.7, -0.5], [-0.35, -0.2]]) { ln(-w / 2 - 6, h * a, w / 2 + 6, h * b, '#b9a080', 12); ln(-w / 2 - 6, h * a, w / 2 + 6, h * b, OUT, 2); } }
  else { rr(-20, -h * 0.5, 40, 12, 3); fo(GOLD, 2.5); }
});

/** A pub bench: table and seats in one. */
const pubBench = ({ cols }) => mk([-156, -124, 156, 12], (s) => {
  const col = pick(cols, s);
  shadow(0, 2, 140, 9);
  if (BR) { dustSheet(-60, 0, 150, 84); X.save(); X.translate(90, 0); X.rotate(-0.2); rr(-60, -14, 120, 14, 3); fo(col, 3); X.restore(); return; }
  for (const x of [-96, 96]) { ln(x - 34, 0, x + 12, -84, OUT, 11); ln(x - 34, 0, x + 12, -84, col, 7); ln(x + 34, 0, x - 12, -84, OUT, 11); ln(x + 34, 0, x - 12, -84, col, 7); }
  rr(-150, -40, 300, 13, 3); fo(dk(col, 0.08), 3);
  rr(-136, -96, 272, 16, 4); fo(col);
  good('cup', -70, -96); good('cup', 60, -96); good('vase', -6, -96);
});

/** The windmill's cap (anchor on the tower top). */
const windCap = () => mk([-132, -132, 132, 14], (s) => {
  const col = ['#fbf6ec', '#5f9a7a', '#c98a5a'][s];
  rr(-116, -10, 232, 20, 4); fo(BR ? '#a89a8a' : '#e9e1d2', 3.5);
  const cap = () => { X.beginPath(); X.moveTo(-104, -8); X.quadraticCurveTo(-96, -112, 0, -120); X.quadraticCurveTo(96, -112, 104, -8); X.closePath(); };
  cap(); fill(BR ? '#b8b0a4' : col); X.save(); cap(); X.clip(); for (let x = -100; x < 110; x += 20) ln(x, -130, x, 0, dk(BR ? '#b8b0a4' : col, 0.14), 2.5); X.restore(); cap(); out(4);
  if (BR) { el(-30, -60, 22, 14); fill('#6b5a4a'); el(40, -40, 14, 9); fill('#6b5a4a'); return; }
  el(0, -124, 9); fo(GOLD, 3);
  for (const x of [-120, 120]) { X.beginPath(); X.arc(x, 0, 8, 0, TAU); fo(GOLD, 2.5); }
});

/** The windmill's four sails (anchor at the hub). */
const windSails = () => mk([-322, -322, 322, 322], (s) => {
  const [cloth, frame] = [['#fbf6ec', '#8a6a4a'], ['#d0564a', '#8a6a4a'], [null, '#f1e2c4']][s];
  for (let k = 0; k < 4; k++) {
    if (BR && k % 2) continue;
    X.save(); X.rotate(0.4 + k * TAU / 4);
    ln(0, 0, 0, -304, OUT, 14); ln(0, 0, 0, -304, BR ? '#a89a8a' : '#8a6a4a', 9);
    if (!BR && cloth) { rr(8, -292, 64, 236, 3); fo(cloth, 3.5); }
    for (let y = -292; y <= -56; y += 26) ln(6, y, 74, y, BR ? '#a89a8a' : frame, 3);
    ln(74, -292, 74, -56, BR ? '#a89a8a' : frame, 4);
    if (BR && k === 0) { X.restore(); continue; }
    X.restore();
  }
  if (BR) { X.save(); X.rotate(0.4 + TAU / 4); X.translate(0, 330); X.rotate(1.2); X.restore(); }
  el(0, 0, 24); fo('#5b4636'); el(0, 0, 9); fo(GOLD, 2.5);
});

/** The arcade's 'Amusements' board, rimmed with bulbs. */
const arcSign = () => mk([-236, -76, 236, 76], (s) => {
  const bulbs = [['#ffe6a8'], ['#f28a8a', '#f6d36b', '#8fcfb5', '#8fb3e8', '#c9a3e8'], ['#f2c64e']][s];
  X.save(); if (BR) X.rotate(-0.04);
  rr(-226, -66, 452, 132, 30); fo('#7a2f4a'); rr(-206, -48, 412, 96, 20); fo('#fff3dc', 3);
  txt(worn('Amusements'), 0, 4, 52, '#c0392b', { font: ROUND, maxW: 370 });
  const pts = [];
  for (let k = 0; k < 13; k++) { pts.push([-200 + k * 33.3, -57]); pts.push([-200 + k * 33.3, 57]); }
  for (const y of [-20, 20]) { pts.push([-216, y]); pts.push([216, y]); }
  pts.forEach(([x, y], i) => {
    if (BR) { el(x, y, 6); fo(i % 3 ? '#b8b0a4' : '#8a8a8a', 2); return; }
    const c = bulbs[i % bulbs.length]; glow(x, y, 18, c, 0.5); el(x, y, 6.5); fo(c, 2);
  });
  X.restore();
});

// ------------------------------------------------------------------ shared palettes
const B_OGW = ['#b98a5a', '#3f6f5a', '#fbf6ec'];
const B_OGS = ['#b98a5a', '#3f6f5a', '#8fc3dc'];
const FL = {
  gera: ['#d0483a', '#e8574a', '#f07a6a'], lav: ['#9a7fc8', '#b9a3d6', '#7f6aa8'], pet: ['#e88aa0', '#d96aa0', '#f5b6c8'],
  fuch: ['#d04890', '#7a4fa0'], lob: ['#4f6fd0', '#7f8fe0', '#fffaf0'], sunny: ['#f6d36b', '#f2a33a', '#e8846f'],
  blush: ['#f5c6c0', '#f0a8b0'], cream: ['#fbf1d8', '#f6e6c0'], crimson: ['#c0283c', '#d0483a'], marig: ['#f2a33a', '#e8c25a'],
  poppy: ['#d0483a', '#c0283c'], corn: ['#4f6fd0', '#6f8fe0'], daisy: ['#fffaf0', '#f6e6c0'], fox: ['#c97ab0', '#e0a0c8'],
  holly: ['#f0a8b0', '#fbf1d8', '#d04890'], lupin: ['#7a6fc8', '#e88aa0', '#f6d36b'], sun: ['#f6c63a', '#e8a020'],
  tulip: ['#e8574a', '#f6d36b', '#f5b6c8'], sweetW: ['#c0283c', '#f5b6c8', '#fffaf0'], pinks: ['#f5b6c8', '#e88aa0', '#fffaf0'],
  peas: ['#d9ccf0', '#f5c6c0', '#fbf1d8'], heather: ['#a070b0', '#c090c8'], gorse: ['#f2cf4a', '#f6dd7a'], thrift: ['#f0a8c0', '#e88aa0'],
  bluebell: ['#6f7fc9', '#8f9fe0'], garlic: ['#fffaf0', '#f1f1e6'], primrose: ['#f6e48a', '#fbf1b8'], agapanthus: ['#6f8fe0', '#9fb3f0'],
  rosemary: ['#9fb3e8', '#c9d6f0'], olive: ['#c9d6a0', '#e9e1b0'], welsh: ['#f2cf4a', '#f6a53a'], white: ['#fffaf0', '#f1ebe0'],
};
const BASKETS = [FL.fuch, FL.lob, FL.sunny];
const LIGHT_COLS = ['#ffd98a', '#ffc870', '#fff1c8'];
const FLAG3 = [['#d0483a', '#f4d27a', '#4f84b3', '#8fcfb5', '#f2a33a'], ['#f5c6c0', '#bfe3d4', '#d9ccf0', '#fff1b8'], ['#d0483a', '#ffffff', '#2f4a6b']];

// ------------------------------------------------------------------ placing props and building shells
const FLOOR = 150;
let PROPS, INK, SHELLS, TOPS, P;
const idx = (id) => CAFE_AREAS.findIndex((a) => a.id === id);
const CXOF = (id) => (idx(id) - 1) * 1000;
let CUR = null;
/** Put prop `id` in the current area at (cx + dx, y); z orders it inside the area (default: its foot y). */
function place(id, dx, y, kit, z = y) {
  PROPS[id] = { area: CUR, x: CXOF(CUR) + dx, y, box: kit.box, draw: (s) => { sync(); PY = y; kit.draw(s); }, z, live: null };
}
/** The area's ground and buildings: the land behind, then (build) walls in world coordinates, then the band in front. */
function shell(id, land, opt = {}) {
  CUR = id;
  const cx = CXOF(id), x0 = cx - 500, x1 = id === 'homecoming' ? 48760 : cx + 500;
  if (opt.top != null) TOPS[id] = opt.top;
  SHELLS[id] = (info) => {
    sync(); backland(x0, x1, land);
    if (opt.build) { sync(); opt.build(info, cx); }
    front(x0, x1, opt.mid ? () => { sync(); opt.mid(info, cx); } : undefined);
    if (opt.after) { sync(); opt.after(info, cx); }
  };
}
const wfill = (col, info, lw = 4) => { X.fillStyle = wallCol(col, info); X.fill(); if (lw) out(lw); };
/** An upper window that brightens as the area is restored. */
function upWin(x, y, info, trim, w = 100, h = 108, arch = false) {
  const sh = (d) => (arch ? archPath(x - w / 2 + d, y + d, w - 2 * d, h - 2 * d) : rr(x - w / 2 + d, y + d, w - 2 * d, h - 2 * d, 4));
  sh(0); wfill(trim, info);
  sh(10); X.fillStyle = mix('#b8b0a4', '#ffe6a8', freshness(info)); X.fill(); out(3);
  const tc = wallCol(trim, info);
  ln(x, y + 10, x, y + h - 10, tc, 5); ln(x - w / 2 + 10, y + h * 0.55, x + w / 2 - 10, y + h * 0.55, tc, 5);
}
/** A building front in world coordinates: roof, wall (with texture), plinth, eaves and upper windows. */
function facade(info, cx, o) {
  const { dx = 0, w = 760, h = 440, wall, roof, trim = CREAM, wins = [-253, 0, 253], chimney = null, roofH = 170, kind = 'pitch', texture = '', plinth = true, arch = false } = o;
  const xc = cx + dx, x0 = xc - w / 2, x1 = xc + w / 2, top = GROUND - h;
  const fresh = freshness(info);
  if (chimney != null && kind !== 'flat') {
    rr(xc + chimney - 26, top - roofH - 34, 52, roofH, 3); wfill('#c9a88a', info);
    rr(xc + chimney - 34, top - roofH - 46, 68, 16, 3); wfill('#b8977a', info, 3.5);
  }
  if (kind !== 'flat') {
    const roofP = kind === 'gable' ? () => poly(x0 - 34, top + 4, x1 + 34, top + 4, xc, top - roofH) : () => poly(x0 - 34, top + 4, x1 + 34, top + 4, x1 - w * 0.17, top - roofH, x0 + w * 0.17, top - roofH);
    roofP(); X.fillStyle = wallCol(roof, info); X.fill();
    X.save(); roofP(); X.clip(); X.strokeStyle = wallCol(dk(roof, 0.14), info); X.lineWidth = 3; for (let y = top - roofH; y < top; y += 22) { X.beginPath(); X.moveTo(x0 - 60, y); X.lineTo(x1 + 60, y); X.stroke(); } X.restore();
    roofP(); out(5);
  }
  rr(x0, top, w, h, 0); X.fillStyle = wallCol(wall, info); X.fill();
  X.save(); rr(x0, top, w, h, 0); X.clip();
  speckle(x0, top, w, h, '#b9a080', Math.round(w * h / 1600), 6, 0.14 + 0.2 * (1 - fresh));
  X.strokeStyle = wallCol(dk(wall, 0.16), info); X.lineWidth = 2.5;
  if (texture === 'stone') { for (let y = top + 6, r = 0; y < GROUND; y += 28, r++) { X.beginPath(); X.moveTo(x0, y); X.lineTo(x1, y); X.stroke(); for (let x = x0 + (r % 2) * 34; x < x1; x += 68) { X.beginPath(); X.moveTo(x, y); X.lineTo(x, y + 28); X.stroke(); } } }
  else if (texture === 'brick') { for (let y = top + 6, r = 0; y < GROUND; y += 18, r++) { X.beginPath(); X.moveTo(x0, y); X.lineTo(x1, y); X.stroke(); for (let x = x0 + (r % 2) * 20; x < x1; x += 40) { X.beginPath(); X.moveTo(x, y); X.lineTo(x, y + 18); X.stroke(); } } }
  else if (texture === 'boards') { for (let y = top + 20; y < GROUND; y += 22) { X.beginPath(); X.moveTo(x0, y); X.lineTo(x1, y); X.stroke(); } }
  X.restore(); rr(x0, top, w, h, 0); out(5);
  if (plinth) { rr(x0, FLOOR, w, 50, 0); wfill(dk(wall, 0.18), info); }
  if (kind === 'flat') { rr(x0 - 12, top - 44, w + 24, 48, 4); wfill(roof, info); rr(x0 - 24, top - 56, w + 48, 16, 4); wfill(trim, info); }
  else { rr(x0 - 20, top - 22, w + 40, 26, 4); wfill(trim, info); }
  for (const wx of wins) upWin(xc + wx, top + 24, info, trim, 100, 108, arch);
  return top;
}
/** A dark open shopfront (a counter seen through an opening) for stalls set into a wall. */
function opening(info, x, y, w, h) {
  rr(x - w / 2, y - h, w, h, 4); X.fillStyle = mix('#8f877d', '#6b5a4a', freshness(info)); X.fill(); out(4);
}
/** A little pond (drawn inside the ground band). */
function pondWater(x, y, rx, ry) {
  el(x, y + 6, rx + 14, ry + 10); X.fillStyle = C('#c9b48a'); X.fill(); out(4);
  el(x, y, rx, ry); const g = X.createLinearGradient(0, y - ry, 0, y + ry); g.addColorStop(0, C('#8fc7d8')); g.addColorStop(1, C('#5f9fbf')); X.fillStyle = g; X.fill(); out(3);
  X.globalAlpha = 0.5; for (let k = 0; k < 4; k++) ln(x - rx * 0.6 + k * rx * 0.35, y - ry * 0.3 + (k % 2) * ry * 0.4, x - rx * 0.45 + k * rx * 0.35, y - ry * 0.3 + (k % 2) * ry * 0.4, '#e6f4f8', 3); X.globalAlpha = 1;
}
/** Railway lines along the front of the platform. */
function rails(x0, x1, y) {
  for (let x = x0 + 10; x < x1; x += 36) { rr(x, y - 6, 22, 22, 2); X.fillStyle = C('#8a6a4a'); X.fill(); out(2.5); }
  for (const yy of [y, y + 12]) ln(x0, yy, x1, yy, '#6f7a80', 5);
}

const reuse = (box, fn) => mk(box, (s) => fn(s));

// ------------------------------------------------------------------ Books 3–9
export function installBooks(api) {
  K = api;
  ({ rr, el, poly, ln, box, fill, fo, out, shadow, glow, txt, speckle, planks, bloom, bush, flowersOn, swag, wire, dustSheet, star, bunting, lightString, pot, stripes, bench, chair, bistroTable, lampPost, hut, crate, parcel, mix, dk, lt, landTop, backland, front, wallCol, freshness } = api);
  seaScope = api.P.seaScope; PROPS = api.PROPS; INK = api.INK; SHELLS = api.SHELLS; TOPS = api.TOPS; P = api.P;
  const Pk = (name, box) => reuse(box, (s) => P[name](s));

  // ---- Book 3: The Village
  shell('bakery', 'village', { top: -600, build: (info, cx) => facade(info, cx, { dx: 40, w: 720, wall: '#f7e3c8', roof: '#c9765a', chimney: 230, wins: [-240, 0, 240] }) });
  place('bakerySign', -120, -55, sign({ text: 'Bakery', cols: [['#f7e9c9', '#b8862a', '#d9a640'], ['#f3e3c8', '#6b4030', '#8a5a3b'], ['#3d4440', '#fbf6ec', '#8a6a4a']], w: 290 }), -55);
  place('bakeryAwning', -120, -8, awning({ cols: [['#d84a6a', '#fff3e4'], ['#f6d36b', '#fff3e4'], ['#8fcfb5', '#fff3e4']], w: 360 }), 70);
  place('bakeryWindow', -120, 185, shopWindow({ w: 290, goods: ['loaves', 'buns', 'plait'] }), 60);
  place('bakeryDoor', 270, 200, door({ cols: ['#a9cfd8', '#c0283c', '#9cb59a'], fan: true }), 150);
  place('bakeryBoxes', 40, -104, boxesK({ dx: 240, w: 140, flowers: [FL.gera, FL.lav, FL.pet] }), -104);
  place('bakeryBench', -230, 330, benchK({ cols: ['#b98a5a', '#e9dcc0', '#3d4a52'] }));
  place('bakeryBike', 120, 362, bikeK({ cols: ['#f6d36b', '#c0283c', '#a9cfd8'], load: 'bread' }));
  place('bakeryLamps', 20, 395, lamps({ dx: 300 }));

  shell('bookshop', 'village', { top: -560, build: (info, cx) => facade(info, cx, { w: 760, wall: '#dfe8e2', roof: '#7f93ad', kind: 'flat', wins: [-253, 0, 253] }) });
  place('bookSign', -110, -55, sign({ text: 'Books', cols: [['#2f5a3a', '#f4e6c0', '#d9a640'], ['#2f3f6b', '#e9c25a', '#d9a640'], ['#6a3f6a', '#fbf1d8', '#c9a06a']], w: 300, italic: true }), -55);
  place('bookWindow', -110, 185, shopWindow({ w: 300, goods: ['favourites', 'seaside', 'poetry'], bay: true }), 60);
  place('bookDoor', 240, 200, door({ cols: ['#2f5a3a', '#6b2a2a', '#2f3f6b'] }), 150);
  place('bookLights', 0, -10, lightsK({ w: 640, h: 0, posts: false, sag: 40, kinds: ['lantern', 'bulb', 'star'], cols: LIGHT_COLS }), -10);
  place('bookTrolley', -260, 372, cartK({ cols: ['#b98a5a', '#4f84b3', '#c9a06a'], load: 'books' }));
  place('bookChairs', 60, 340, chairsK({ dx: 70 }));
  place('bookPlanters', 300, 395, potsK({ w: 260, n: 3, flowers: [FL.gera, FL.lob, FL.sunny], potCols: ['#d9825b', '#4f84b3', '#a9b0b5'] }));
  place('bookCat', 370, 250, catBed());

  shell('villageGreen', 'park', {});
  place('greenTree', -300, 250, treeK({ looks: [['#6f9f5f', '#000', ''], ['#d9a640', '#000', ''], ['#9fc78a', '#f5c6c0', 'bloom']], w: 250, h: 330 }));
  place('greenWell', 270, 250, wellK());
  place('greenMaypole', 0, 262, maypoleK());
  place('greenBunting', 0, 215, buntingK({ w: 940, h: 320, cols: FLAG3, sag: 40, n: 16 }), 214);
  place('greenFence', -250, 398, fence({ w: 380, cols: ['#fbf6ec', '#a9cfd8', '#b98a5a'] }));
  place('greenBeds', 250, 398, bedK({ w: 300, flowers: [FL.pinks, FL.peas, FL.marig] }));
  place('greenBench', -170, 330, benchK({ cols: ['#a08a6a', '#9cb59a', '#f1e2c4'] }));
  place('greenPicnic', 150, 330, picnicK({ cols: [['#d0483a', '#fff8ec'], ['#4f84b3', '#fff8ec'], ['#e8846f', 'patch']] }));

  shell('chapel', 'village', { top: -560, build: (info, cx) => facade(info, cx, { dx: 60, w: 520, h: 380, wall: '#d9d2c4', roof: '#6f7f8f', kind: 'gable', roofH: 240, texture: 'stone', wins: [], trim: '#efe8dc' }) });
  place('chapelWindow', 60, 60, chapelWin({ w: 130, h: 210 }), 50);
  place('chapelDoor', 60, 200, door({ cols: ['#8a5a3b', '#a9cfd8', '#8a2a2a'], kind: 'arch', w: 120, h: 200, frame: '#efe8dc' }), 150);
  place('chapelTree', -350, 215, treeK({ looks: [['#3f6a4a', '#000', ''], ['#7fae63', '#000', ''], ['#9fc78a', '#f5c6c0', 'bloom']], kind: ['yew', 'birch', 'round'], w: 220, h: 320 }), 205);
  place('chapelLanterns', 60, 260, lanternsK({ dx: 110, h: 90, kinds: ['iron', 'jar', 'brass'] }));
  place('chapelBell', 400, 230, bellK({ cols: ['#b8862a', '#c9ced6', '#e9c25a'], roof: '#6f7f8f' }));
  place('chapelBench', 330, 345, benchK({ cols: ['#a0724a', '#c9c0b2', '#8fb3d0'], w: 170 }));
  place('chapelGate', -330, 395, lychgate());
  place('chapelRoses', 90, 398, bedK({ w: 280, flowers: [FL.blush, FL.cream, FL.crimson] }));

  shell('market', 'village', {});
  place('marketClock', 0, 232, clockK({ cols: [['#3f6f5a', '#fbf6ec'], ['#2f2f33', '#fbf6ec'], ['#f1e2c4', '#fffaf0']], h: 270 }), 228);
  place('marketBunting', 0, 210, buntingK({ w: 950, h: 380, cols: FLAG3, sag: 50, n: 16, shapes: ['tri', 'tri', 'square'] }), 205);
  place('marketLights', 0, 214, lightsK({ w: 760, h: 300, kinds: ['bulb', 'lantern', 'globe'], cols: LIGHT_COLS, sag: 50, n: 13 }), 206);
  place('marketFruit', -290, 300, stallK({ cols: [['#d0483a', '#fff3e4'], ['#5f9a5a', '#fff3e4'], ['#e8c25a', '#fff3e4']], goods: ['apple', 'pear', 'greenApple', 'apple'] }));
  place('marketCheese', 290, 300, stallK({ cols: [['#4f84b3', '#fff3e4'], ['#e88aa0', '#fff3e4'], ['#f2a33a', '#fff3e4']], goods: ['wheel', 'cheese', 'wheel', 'jar'] }));
  place('marketFountain', 0, 340, fountainK());
  place('marketFlowers', -260, 398, potsK({ w: 300, n: 3, flowers: [FL.sun, FL.tulip, FL.sweetW], potCols: ['#d9825b', '#d9825b', '#d9825b'] }));
  place('marketCrates', 270, 398, crates({ produce: ['carrot', 'cabbage', 'squash'], w: 220 }));

  shell('postOffice', 'village', { top: -600, build: (info, cx) => facade(info, cx, { w: 760, wall: '#f3e6d6', roof: '#a86a5f', chimney: -260, wins: [-253, 0, 253], texture: 'brick' }) });
  place('postSign', -110, -55, sign({ text: 'Post Office', cols: [['#c0283c', '#f2c64e', '#8a2a2a'], ['#f3ead8', '#2f2f33', '#3d3a3f'], ['#2f4a8a', '#ffffff', '#1f3a6a']], w: 320, size: 30 }), -55);
  place('postDoor', 240, 200, door({ cols: ['#c0283c', '#2f5a3a', '#2f3f6b'], fan: true }), 150);
  place('postBaskets', 0, -96, basketsK({ xs: [-380, -120, 120, 380].map((x) => x * 0.95), flowers: BASKETS }), -96);
  place('postBoard', -110, 200, boardK({ cols: [['#a0724a', '#e9dcc0', '#3d3a3f'], ['#3f6f5a', '#e9dcc0', '#3d3a3f'], ['#4f84b3', '#e9dcc0', '#3d3a3f']], kind: 'notice' }), 140);
  place('postBox', -340, 330, pillarBox());
  place('postPhone', 400, 300, phoneBox());
  place('postParcels', -200, 362, Pk('parcels', [-110, -150, 110, 4]));
  place('postBike', 110, 362, bikeK({ cols: ['#c0283c', '#2f5a3a', '#8fc3dc'], load: 'parcels' }));

  // ---- Book 4: The Riverside
  shell('orchard', 'hill', {});
  place('orchardApples', -280, 250, treeK({ looks: [['#6f9f5f', '#d9443c', 'fruit'], ['#9fc78a', ['#fbf1f4', '#f5c6c0'], 'bloom'], ['#7fae63', '#f2c64e', 'fruit']], w: 230, h: 300 }));
  place('orchardPlums', 290, 250, treeK({ looks: [['#6a9a5f', '#7a3f8a', 'fruit'], ['#9fc78a', ['#ffffff', '#f6e6f0'], 'bloom'], ['#6f9f5f', '#c0283c', 'fruit']], w: 230, h: 300 }));
  place('orchardGate', 0, 220, fieldGate({ cols: ['#c9c0b2', '#fbf6ec', '#5f8f6a'] }));
  place('orchardScarecrow', 150, 270, scarecrow());
  place('orchardTable', -60, 330, longTable({ cols: [['#e9dcc0', null], ['#8fb3d0', '#fff8ec'], ['#a0724a', null]], goods: ['pie', 'jar', 'apple'] }));
  place('orchardHives', -340, 398, hivesK());
  place('orchardCrates', 60, 398, crates({ produce: ['apple', 'greenApple', 'pear'], w: 220 }));
  place('orchardPress', 360, 398, ciderPress());

  shell('mill', 'hill', { top: -620, build: (info, cx) => facade(info, cx, { dx: -110, w: 540, h: 420, wall: '#e3d6bc', roof: '#8a7a6a', kind: 'gable', roofH: 200, texture: 'stone', wins: [-140, 140], trim: '#efe4cc' }) });
  place('millSign', -110, -110, sign({ text: 'The Mill', cols: [['#f3ead8', '#5b4636', '#8a6a4a'], ['#c9a06a', '#4a3020', '#8a5a3b'], ['#2f4a8a', '#ffffff', '#1f3a6a']], w: 260 }), -110);
  place('millDoor', -110, 200, door({ cols: ['#a0906a', '#a03a2a', '#9cb59a'], kind: 'plank', w: 140, h: 210, frame: '#efe4cc' }), 150);
  place('millWheel', 300, 220, millWheel());
  place('millBeds', -330, 230, bedK({ w: 200, flowers: [FL.fox, FL.holly, FL.lupin] }), 225);
  place('millSacks', -340, 330, sacks({ marks: ['plain', 'stripe', 'stamp'] }));
  place('millCart', -40, 362, cartK({ cols: ['#b98a5a', '#4f84b3', '#c0583c'], load: 'sacks' }));
  place('millBench', 230, 380, benchK({ cols: B_OGW }));
  place('millLamps', -40, 398, lamps({ dx: 330 }));

  shell('bridge', 'park', { top: -420 });
  place('bridgeArch', 0, 370, bridgeK(), 370);
  place('bridgeBench', -160, 262, benchK({ cols: B_OGW, w: 170 }), 372);
  place('bridgeLamps', 0, 262, lamps({ dx: 300, h: 220 }), 373);
  place('bridgeBoat', 140, 600, boatK({ cols: [['#4f84b3', '#fff8ec'], ['#c0392b', '#fff1d8'], ['#3f6f5a', '#e9c25a']] }), 600);
  place('bridgeReeds', -230, 470, reedsK({ w: 200, kinds: ['yellow', 'blue', 'rush'] }), 380);
  place('bridgeWillow', -405, 300, treeK({ looks: [['#8fb86a', '#000', ''], ['#c9b85a', '#000', ''], ['#b9c9a8', '#000', '']], kind: 'willow', w: 140, h: 260 }), 300);
  place('bridgePost', 340, 300, fingerpost({ cols: [['#fbf6ec', '#3d3a3f'], ['#3f6f5a', '#fbf6ec'], ['#b98a5a', '#3d2a20']], words: ['Village', 'Mill', 'Café'], h: 200 }), 301);
  place('bridgeFlowers', 420, 398, bedK({ w: 110, flowers: [FL.corn, FL.poppy, FL.daisy] }), 398);

  shell('pond', 'park', { mid: (info, cx) => pondWater(cx - 30, 318, 270, 46) });
  place('pondLilies', -40, 318, lilies(), 318);
  place('pondHouse', 170, 330, duckHouse(), 330);
  place('pondJetty', -250, 268, jettyK({ cols: ['#b98a5a', '#c9c0b2', '#fbf6ec'], len: 40, w: 120 }), 300);
  place('pondBoat', -120, 360, boatK({ cols: [['#4f84b3', '#fff8ec'], ['#c0392b', '#fff1d8'], ['#3f6f5a', '#e9c25a']], w: 90 }), 361);
  place('pondTrees', -360, 240, treeK({ looks: [['#9fc78a', '#000', ''], ['#9a4a3a', '#000', ''], ['#6f9f5f', '#d0483a', 'fruit']], kind: ['birch', 'round', 'round'], w: 200, h: 300 }));
  place('pondKiosk', 340, 240, hutK({ cols: [['#e8846f', '#fff3e4', '#d0564a'], ['#8fb3a0', '#fbf6ec', '#5f8f6a'], ['#c9a06a', '#fbf6ec', '#8a5a3b']], w: 160, h: 220 }));
  place('pondBench', 260, 398, benchK({ cols: B_OGW, w: 170 }));
  place('pondLamps', -30, 398, lamps({ dx: 300, h: 220 }));

  shell('schoolhouse', 'village', { top: -720, build: (info, cx) => facade(info, cx, { dx: -150, w: 560, h: 400, wall: '#d9a07d', roof: '#6f7f8f', kind: 'gable', roofH: 180, texture: 'brick', wins: [-170, 170], trim: '#fbf6ec', arch: true }) });
  place('schoolBell', -150, -380, bellK({ cols: ['#b8862a', '#c9ced6', '#e9c25a'], roof: '#6f7f8f' }), -380);
  place('schoolSign', -150, -60, sign({ text: 'School House', cols: [['#f3ead8', '#3f6f5a', '#3f6f5a'], ['#2f4a8a', '#ffffff', '#1f3a6a'], ['#c0283c', '#f2c64e', '#8a2a2a']], w: 300, size: 30 }), -60);
  place('schoolDoor', -150, 200, door({ cols: ['#2f5a3a', '#f2d36b', '#c0283c'], kind: 'stable', fan: true }), 150);
  place('schoolSwing', 320, 260, swingK());
  place('schoolGarden', -340, 398, bedK({ w: 220, flowers: [FL.sun, ['#d0483a', '#e8574a'], ['#ef8a3a', '#f2a33a']] }));
  place('schoolBoard', 40, 330, boardK({ cols: [['#a0724a', '#3d4440', '#fbf6ec'], ['#a0724a', '#3f5a48', '#fbf6ec'], ['#e8846f', '#3d4440', '#fbf6ec']], lines: ['Lessons', '9 o’clock'] }));
  place('schoolHopscotch', 150, 380, hopscotch(), 360);
  place('schoolBench', -120, 362, benchK({ cols: ['#b98a5a', '#5f9a5a', '#8fc3dc'], w: 170 }));

  shell('tearoom', 'village', { top: -600, build: (info, cx) => facade(info, cx, { w: 760, wall: '#f6dcd6', roof: '#7f93ad', chimney: 250, wins: [-253, 0, 253] }) });
  place('teaSign', -110, -55, sign({ text: 'Tea Room', cols: [['#f5c6c0', '#8a2a4a', '#c9a06a'], ['#fbf6ec', '#2f4a8a', '#4f84b3'], ['#fbf1d8', '#b8862a', '#d9a640']], w: 300, italic: true }), -55);
  place('teaAwning', -110, -8, awning({ cols: [['#e88aa0', '#fff3e4'], ['#8fb3e8', '#fff3e4'], ['#b9a3d6', '#fff3e4']], w: 380 }), 70);
  place('teaWindow', -110, 185, shopWindow({ w: 300, goods: ['sponges', 'scones', 'lemon'] }), 60);
  place('teaDoor', 240, 200, door({ cols: ['#e8a0b0', '#a9cfd8', '#f2d36b'], fan: true }), 150);
  place('teaRoses', 0, -104, boxesK({ dx: 253, w: 140, flowers: [FL.blush, FL.cream, FL.crimson] }), -104);
  place('teaBunting', 180, 398, buntingK({ w: 560, h: 280, cols: [['#f5c6c0', '#bfe3d4', '#f6dd7a', '#d9ccf0'], ['#e8846f', '#fff8ec', '#8fb3e8', '#fff8ec'], ['#fffaf0', '#fbf1d8']], shapes: ['tri', 'round', 'round'], n: 10 }), 210);
  place('teaTables', 180, 340, tablesK({ dx: 120 }));
  place('teaTrolley', -300, 362, teaTrolley());

  // ---- Book 5: The Cliffs
  shell('clifftop', 'hill', {});
  place('cliffTree', -330, 240, treeK({ looks: [['#7fae63', '#f5f0e8', 'bloom'], ['#6f9f5f', '#d0483a', 'fruit'], ['#9fc78a', '#f5c6c0', 'bloom']], w: 220, h: 280 }));
  place('cliffShelter', 120, 250, shelterK({ cols: [['#e9e1d2', '#6f7f8f', '#fbf6ec'], ['#e9e1d2', '#5f8f6a', '#fbf6ec'], ['#e9dcc0', '#c9a85a', '#a0724a']], w: 300, h: 210 }));
  place('cliffKite', 340, 230, kiteK());
  place('cliffPost', -120, 260, fingerpost({ cols: [['#b98a5a', '#3d2a20'], ['#fbf6ec', '#3d3a3f'], ['#9a7a5a', '#fbf6ec']], words: ['Cove', 'Lighthouse', 'Café'] }));
  place('cliffStile', -320, 398, stileK({ cols: ['#b98a5a', '#fbf6ec', '#5f8f6a'] }));
  place('cliffBench', -60, 362, benchK({ cols: ['#a08a6a', '#4f84b3', '#fbf6ec'] }));
  place('cliffScope', 160, 392, Pk('seaScope', [-52, -124, 64, 6]));
  place('cliffThrift', 340, 398, bedK({ w: 240, flowers: [FL.thrift, FL.heather, FL.gorse] }));

  shell('cove', 'dunes', {});
  place('coveHut', -320, 240, hutK({ cols: [['#8fc3dc', '#fff8ec', '#4f84b3'], ['#f6d36b', '#fff8ec', '#e8a020'], ['#9fd3c7', '#fff8ec', '#5f9f8f']], w: 170, h: 230 }));
  place('coveFlags', 60, 230, buntingK({ w: 520, h: 280, cols: [FLAG3[0], ['#f1ebe0', '#e9e1d2', '#d9cfbf'], ['#2f4a6b', '#ffffff', '#d0483a']], shapes: ['tri', 'tri', 'square'] }), 225);
  place('coveLanterns', 60, 240, lightsK({ w: 360, h: 200, kinds: ['bulb', 'lantern', 'moon'], cols: LIGHT_COLS, posts: true }), 230);
  place('coveFire', 60, 340, fireRing());
  place('coveChairs', -150, 362, deckK({ cols: ['#d0483a', '#4f84b3', ['#d0483a', '#f2c64e', '#4f84b3']], n: 2 }));
  place('coveWindbreak', 290, 370, Pk('windbreak', [-130, -112, 170, 14]));
  place('coveShells', -330, 398, shellsK());
  place('coveBoat', 180, 430, boatK({ cols: [['#4f84b3', '#fff8ec'], ['#c0392b', '#fff1d8'], ['#3f6f5a', '#e9c25a']], w: 140, dry: true }), 420);

  shell('rockPools', 'hill', {});
  place('poolsHut', -300, 240, hutK({ cols: [['#f5b6a8', '#fff8ec', '#e8846f'], ['#9fd3c7', '#fff8ec', '#5f9f8f'], ['#f6d36b', '#fff8ec', '#e8a020']], w: 170, h: 220 }));
  place('poolsSign', 0, 230, nameBoard({ text: 'Rock Pools', cols: [['#c9b48a', '#4a3020', '#8a6a4a'], ['#4f84b3', '#ffffff', '#2f5a8a'], ['#f2a08a', '#fff8ec', '#c0583c']], w: 320 }));
  place('poolsRing', 280, 240, ringK({ cols: [['#d0483a', '#ffffff'], ['#f2843a', '#ffd9b0'], ['#4f84b3', '#ffffff']] }));
  place('poolsNets', 370, 330, netsK());
  place('poolsPlants', -130, 340, bedK({ w: 220, flowers: [['#cfe0d8', '#e9f0ea'], FL.thrift, ['#b9d07a', '#9fc06a']], leaf: '#7fa08a' }));
  place('poolsSteps', 160, 400, stepsK({ cols: ['#c9b48a', '#4f84b3', 'rope'] }), 380);
  place('poolsPool', -260, 440, rockPool({ kinds: ['star', 'anemone', 'crab'] }), 440);
  place('poolsPool2', 340, 446, rockPool({ kinds: ['shrimp', 'snail', 'weed'], w: 200 }), 446);

  shell('boatyard', 'village', { top: -600, build: (info, cx) => facade(info, cx, { dx: -110, w: 560, h: 380, wall: '#d8c8ae', roof: '#6f7f8f', kind: 'gable', roofH: 190, texture: 'boards', wins: [], plinth: false }) });
  place('yardSign', -110, -110, sign({ text: 'Boatyard', cols: [['#2f4a8a', '#ffffff', '#1f3a6a'], ['#2f5a3a', '#e9c25a', '#1f4a2a'], ['#fbf1d8', '#c0283c', '#8a2a2a']], w: 280 }), -110);
  place('yardDoors', -110, 200, shedDoors({ cols: ['#3d3a3f', '#4f84b3', '#a03a2a'], w: 320, h: 250 }), 150);
  place('yardFlags', 330, 230, mast({ h: 320 }));
  place('yardWinch', 260, 300, winch());
  place('yardBoat', -150, 362, boatK({ cols: [['#4f84b3', '#fff8ec'], ['#c0392b', '#fff1d8'], ['#3f6f5a', '#e9c25a']], w: 160, dry: true }));
  place('yardTins', 230, 398, paintTins());
  place('yardDinghy', 300, 560, Pk('dinghy', [-152, -74, 152, 34]), 560);
  place('yardLamps', -20, 398, lamps({ dx: 320 }), 399);

  shell('fishmonger', 'village', { top: -600, build: (info, cx) => { facade(info, cx, { w: 760, wall: '#dfeaf0', roof: '#7f93ad', chimney: -250, wins: [-253, 0, 253] }); opening(info, cx - 110, 185, 320, 140); } });
  place('fishSign', -110, -55, sign({ text: 'Fresh Fish', cols: [['#4f84b3', '#ffffff', '#2f5a8a'], ['#2f3f6b', '#e9c25a', '#1f2a4a'], ['#5f9f8f', '#ffffff', '#3f7f6f']], w: 300 }), -55);
  place('fishAwning', -110, -8, awning({ cols: [['#4f84b3', '#fff8ec'], ['#5f9a5a', '#fff8ec'], ['#d0483a', '#fff8ec']], w: 380, scallop: false }), 70);
  place('fishStall', -110, 300, stallK({ cols: [['#4f84b3', '#fff8ec'], ['#5f6f7a', '#e9e1d2'], ['#c9a06a', '#fff3e4']], goods: 'fish', w: 300, h: 160 }), 300);
  place('fishBoard', 240, 300, boardK({ cols: [['#5f6f7a', '#3d4440', '#fbf6ec'], ['#a0724a', '#2f3330', '#fbf6ec'], ['#c9b48a', '#8fc3dc', '#2f4a6b']], lines: ['Today', 'Crab & mackerel'] }));
  place('fishPots', -360, 362, potsLobster({ cols: ['#a07850', '#4f84b3', '#d0483a'] }));
  place('fishCrates', 80, 380, fishCrates());
  place('fishBuoys', 340, 362, buoysK({ kinds: ['stripe', 'glass', 'plain'] }));
  place('fishLamps', 0, 398, lamps({ dx: 320 }), 399);

  // ---- Book 6: The Seafront
  shell('icecream', 'dunes', {});
  place('iceHut', -280, 240, hutK({ cols: [['#f5b6c8', '#fff8ec', '#e88aa0'], ['#a9dcc0', '#fff8ec', '#5f9f8f'], ['#f6e48a', '#fff8ec', '#e8c25a']], w: 190, h: 230 }));
  place('iceCone', -60, 250, coneSign());
  place('iceBunting', 0, 215, buntingK({ w: 940, h: 340, cols: [['#e88aa0', '#8fcfb5', '#f6d36b', '#8fb3e8'], ['#f5c6c0', '#bfe3d4', '#fff1b8', '#d9ccf0'], ['#d0483a', '#ffffff']], sag: 40, n: 16 }), 210);
  place('iceParasols', 260, 300, parasolsK({ cols: [['#e8846f', '#fff3e4'], ['#bfe3d4', '#fff3e4'], ['#f6d36b', '#fff3e4']], xs: [-90, 90] }));
  place('iceTables', 260, 345, tablesK({ dx: 110 }));
  place('iceCart', -160, 375, iceCart());
  place('iceMenu', 70, 375, boardK({ cols: [['#e88aa0', '#fff3f6', '#8a2a4a'], ['#a0724a', '#3d4440', '#fbf6ec'], ['#c9b48a', '#fbf6ec', '#4a3020']], lines: ['Ices', 'Two scoops'] }));
  place('icePlanters', -370, 398, potsK({ w: 220, n: 2, flowers: [FL.pet, FL.marig, FL.lav], potCols: ['#f2f2f2', '#f2f2f2', '#f2f2f2'] }));

  shell('promenade', 'village', {});
  place('promShelter', 0, 240, shelterK({ cols: [['#f1e2c4', '#3f6f5a', '#fbf6ec'], ['#fbf6ec', '#4f84b3', '#fbf6ec'], ['#f6dcd6', '#e88aa0', '#fbf6ec']], w: 340, h: 220 }));
  place('promKiosk', -340, 240, hutK({ cols: [['#e8846f', '#fff3e4', '#d0564a'], ['#5f9a5a', '#fbf6ec', '#3f6f5a'], ['#4f84b3', '#fbf6ec', '#2f5a8a']], w: 160, h: 220 }));
  place('promClock', 280, 300, floralClock());
  place('promLights', 0, 218, lightsK({ w: 960, h: 330, kinds: ['bulb', 'lantern', 'globe'], cols: LIGHT_COLS, sag: 40, n: 16 }), 215);
  place('promBenches', -60, 345, benchK({ cols: B_OGS, w: 170, pair: 140 }));
  place('promChairs', 300, 380, deckK({ cols: ['#d0483a', '#4f84b3', ['#d0483a', '#f2c64e', '#4f84b3']], n: 3, dx: 80 }));
  place('promLamps', -20, 395, lamps({ dx: 340 }));
  place('promRailings', 0, 404, railK({ w: 960, cols: ['#4f84b3', '#8fcfb5', '#fbf6ec'], h: 60 }), 404);

  shell('pavilion', 'park', { top: -600, build: (info, cx) => {
    const top = facade(info, cx, { dx: -60, w: 600, h: 330, wall: '#fbf6ec', roof: '#3f6f5a', kind: 'gable', roofH: 170, texture: 'boards', wins: [-200, 200], trim: '#e9e1d2' });
    // the veranda: a deck and posts across the front
    rr(cx - 380, FLOOR - 10, 640, 24, 3); wfill('#b98a5a', info, 3.5);
    for (const x of [-350, -170, 50, 230]) { rr(cx + x - 7, top + 120, 14, FLOOR - 10 - top - 120, 2); wfill('#fbf6ec', info, 3); }
    rr(cx - 380, top + 104, 640, 22, 3); wfill('#3f6f5a', info, 3.5);
  } });
  place('pavClock', -60, -210, clockK({ cols: [['#fbf6ec', '#fffaf0'], ['#2f2f33', '#fbf6ec'], ['#3f6f5a', '#f1e2c4']], wall: true }), -210);
  place('pavBunting', -60, -6, buntingK({ w: 600, h: 0, posts: false, sag: 26, n: 12, cols: [['#3f6f5a', '#fbf6ec', '#d0483a'], ['#f5c6c0', '#bfe3d4', '#fff1b8'], ['#d0483a', '#ffffff', '#2f4a6b']] }), -6);
  place('pavBaskets', -60, 20, basketsK({ xs: [-200, 200], flowers: BASKETS }), 20);
  place('pavFlag', 340, 230, mast({ h: 330, kinds: ['pennant', 'pennant', 'pennant'], cols: [['#3f6f5a', '#f2c64e', '#d0483a'], ['#8fc3dc', '#fbf6ec'], ['#f6d36b', '#f2a33a']] }));
  place('pavScore', 370, 300, scoreboard({ cols: [['#3f6f5a', '#2f3330'], ['#5f6f5a', '#3f5a48'], ['#3f6f5a', '#fbf6ec']] }), 290);
  place('pavTables', -200, 345, tablesK({ dx: 110 }));
  place('pavBench', 100, 330, benchK({ cols: ['#fbf6ec', '#3f6f5a', '#b98a5a'], w: 180 }));
  place('pavRoller', 230, 398, rollerK());

  shell('carousel', 'village', {});
  place('carHorses', 0, 340, carouselHorses(), 340);
  place('carCanopy', 0, 100, carouselTop(), 341);
  place('carLights', 0, 214, lightsK({ w: 940, h: 340, kinds: ['bulb', 'globe', 'star'], cols: [['#ffd98a'], ['#f28a8a'], ['#fff1c8']].map((c) => c[0]), sag: 40, n: 16 }), 210);
  place('carTicket', -370, 240, hutK({ cols: [['#c0392b', '#f2c64e', '#8a2a2a'], ['#2f5a8a', '#f2c64e', '#1f3a6a'], ['#3f6f5a', '#f2c64e', '#2f4a3a']], w: 140, h: 210 }));
  place('carOrgan', 360, 260, organK());
  place('carRail', 0, 398, railK({ w: 640, cols: ['#d9a640', '#fbf6ec', '#c0392b'], h: 50 }), 398);
  place('carBalloons', -380, 398, balloonsK(), 397);
  place('carBench', 360, 398, benchK({ cols: B_OGS, w: 160 }), 396);

  shell('arcade', 'village', { top: -460, build: (info, cx) => facade(info, cx, { w: 780, h: 420, wall: '#f6e6c8', roof: '#e8846f', kind: 'flat', wins: [-270, -90, 90, 270], trim: '#fbf6ec' }) });
  place('arcSign', 0, -300, arcSign(), -300);
  place('arcDoors', 0, 200, shedDoors({ cols: ['#c0392b', '#2f5a8a', '#3f6f5a'], w: 220, h: 200, frame: '#f2c64e' }), 150);
  place('arcLights', 0, 0, lightsK({ w: 760, h: 0, posts: false, sag: 30, n: 14, kinds: ['bulb', 'star', 'globe'], cols: ['#ffd98a', '#fff1c8', '#f28a8a'] }), 0);
  place('arcPhoto', -300, 230, photoBooth(), 230);
  place('arcCrane', 300, 230, clawCrane(), 230);
  place('arcRide', -230, 370, teacupRide());
  place('arcCandy', 220, 372, flossCart());
  place('arcPlanters', 0, 398, potsK({ w: 220, n: 2, flowers: [FL.pet, FL.marig, FL.lav], potCols: ['#f2f2f2', '#f2f2f2', '#f2f2f2'] }));

  shell('harbourInn', 'village', { top: -600, build: (info, cx) => facade(info, cx, { w: 760, wall: '#fbf1e2', roof: '#6f7f8f', chimney: -250, wins: [-253, 0, 253] }) });
  place('innSign', -150, -40, sign({ text: ['The Anchor', 'The Mermaid', 'The Lantern'], cols: [['#2f3f6b', '#e9c25a', '#1f2a4a'], ['#3f6f5a', '#fbf1d8', '#2f4a3a'], ['#6b2a2a', '#f2c64e', '#4a1a1a']], w: 260, h: 80, hang: true, size: 30 }), -40);
  place('innDoor', 0, 200, door({ cols: ['#2f5a3a', '#6b2a2a', '#2f3f6b'], w: 120, h: 200 }), 150);
  place('innBaskets', 0, -96, basketsK({ xs: [-300, 300], flowers: BASKETS }), -96);
  place('innLights', 0, 10, lightsK({ w: 740, h: 0, posts: false, sag: 26, n: 14, kinds: ['bulb', 'lantern', 'globe'], cols: LIGHT_COLS }), 10);
  place('innBoard', 160, 300, boardK({ cols: [['#a0724a', '#2f3330', '#fbf6ec'], ['#5f6f7a', '#3d4440', '#fbf6ec'], ['#c9b48a', '#3d4440', '#fbf6ec']], lines: ['Pie night', 'Fish & chips'] }));
  place('innBarrels', -330, 330, barrels({ kinds: ['plain', 'stack', 'planter'], cols: ['#a8784a', '#4f84b3', '#a8784a'] }));
  place('innTables', -60, 362, pubBench({ cols: ['#b98a5a', '#4f84b3', '#5f9a5a'] }));
  place('innLamps', 20, 398, lamps({ dx: 340 }));

  shell('quay', 'village', {});
  place('quayCrane', -270, 290, craneK());
  place('quayFlags', 340, 230, mast({ h: 320 }));
  place('quayNets', 120, 260, netsK());
  place('quayPots', -40, 330, potsLobster({ cols: ['#a07850', '#4f84b3', '#d0483a'] }));
  place('quayBenches', 200, 350, benchK({ cols: B_OGS }));
  place('quayLamps', 0, 395, lamps({ dx: 360 }));
  place('quayBollards', -300, 400, bollardsK({ xs: [0, 260, 520], cols: [['#2f2f33', '#ffffff'], ['#2f5a8a', null], ['#c0392b', null]] }), 400);
  place('quayBoat', 120, 580, boatK({ cols: [['#4f84b3', '#fff8ec'], ['#c0392b', '#fff1d8'], ['#3f6f5a', '#e9c25a']], names: ['Molly', 'Rosie', 'Hope'], w: 180 }), 580);

  shell('lifeboat', 'village', { top: -600, build: (info, cx) => facade(info, cx, { dx: -100, w: 560, h: 410, wall: '#fbf6ec', roof: '#c0583c', kind: 'gable', roofH: 190, texture: 'boards', wins: [], trim: '#e9e1d2' }) });
  place('lifeBoard', -100, -96, nameBoard({ text: 'Lifeboat Station', cols: [['#2f3f6b', '#f2c64e', '#1f2a4a'], ['#c0392b', '#f2c64e', '#8a2a2a'], ['#3f6f5a', '#f2c64e', '#2f4a3a']], w: 380 }), -96);
  place('lifeDoors', -100, 200, shedDoors({ cols: ['#2f5a8a', '#c0392b', '#fbf6ec'], w: 340, h: 260 }), 150);
  place('lifeBoat', -100, 380, lifeboatK(), 380);
  place('lifeBell', 300, 240, bellK({ cols: ['#b8862a', '#c9ced6', '#e9c25a'], roof: '#c0583c' }));
  place('lifeFlag', 340, 330, mast({ h: 330, kinds: ['pennant', 'pennant', 'signal'], cols: [['#2f4a8a', '#ffffff'], ['#c0392b', '#ffffff'], null] }));
  place('lifeRings', 230, 360, ringK({ cols: [['#d0483a', '#ffffff'], ['#f2843a', '#ffd9b0'], ['#4f84b3', '#ffffff']] }));
  place('lifeBench', -390, 345, benchK({ cols: B_OGS, w: 150 }));
  place('lifeLamps', -100, 398, lamps({ dx: 360 }), 399);

  // ---- Book 7: The Hills
  shell('windmill', 'hill', { top: -760, build: (info, cx) => {
    const xc = cx - 140, tw0 = 300, tw1 = 180, yt = -330;
    const tower = () => poly(xc - tw0 / 2, GROUND, xc + tw0 / 2, GROUND, xc + tw1 / 2, yt, xc - tw1 / 2, yt);
    tower(); X.fillStyle = wallCol('#f1ebe0', info); X.fill();
    X.save(); tower(); X.clip(); speckle(xc - 160, yt, 320, GROUND - yt, '#b9a080', 90, 6, 0.14 + 0.2 * (1 - freshness(info))); X.strokeStyle = wallCol('#d9d0c0', info); X.lineWidth = 2.5; for (let y = yt + 40; y < GROUND; y += 60) { X.beginPath(); X.moveTo(xc - 200, y); X.lineTo(xc + 200, y); X.stroke(); } X.restore();
    tower(); out(5);
    upWin(xc, yt + 60, info, '#efe4cc', 60, 70); upWin(xc, yt + 220, info, '#efe4cc', 70, 80);
    rr(xc - 190, -40, 380, 20, 4); wfill('#a0724a', info, 3.5);
    for (let x = xc - 180; x <= xc + 180; x += 30) ln(x, -38, x, -78, wallCol('#a0724a', info), 4);
    ln(xc - 186, -78, xc + 186, -78, wallCol('#a0724a', info), 6);
  } });
  place('windCap', -140, -330, windCap(), -330);
  place('windSails', -140, -386, windSails(), -320);
  place('windDoor', -140, 200, door({ cols: ['#3d3a3f', '#4f84b3', '#a03a2a'], kind: 'plank', w: 100, h: 170, frame: '#efe4cc' }), 150);
  place('windSacks', 120, 300, sacks({ marks: ['plain', 'stripe', 'stamp'] }));
  place('windCart', 300, 330, cartK({ cols: ['#b98a5a', '#4f84b3', '#c0583c'], load: 'sacks' }));
  place('windBench', -360, 345, benchK({ cols: B_OGW, w: 150 }));
  place('windFence', -170, 398, fence({ w: 400, cols: ['#b98a5a', '#fbf6ec', '#5f8f6a'] }));
  place('windFlowers', 230, 398, bedK({ w: 300, flowers: [FL.poppy, FL.corn, FL.daisy] }));

  shell('dairy', 'hill', { top: -620, build: (info, cx) => facade(info, cx, { dx: -170, w: 560, h: 360, wall: '#e9d6bb', roof: '#a85a4a', kind: 'gable', roofH: 200, texture: 'boards', wins: [], plinth: false }) });
  place('dairyVane', -170, -358, vaneK(), -358);
  place('dairyDoors', -170, 200, shedDoors({ cols: ['#a03a2a', '#8fae8a', '#efe4cc'], w: 300, h: 240 }), 150);
  place('dairyHens', 300, 240, henHouse());
  place('dairyCow', 120, 330, cowK());
  place('dairyStand', -300, 340, stallK({ cols: [['#4f84b3', '#fff8ec'], ['#e8c25a', '#fff8ec'], ['#e88aa0', '#fff8ec']], goods: [['eggs', 'milk'], ['jar'], ['flowers', 'eggs']], w: 220, h: 200 }));
  place('dairyChurns', -60, 375, churnsK());
  place('dairyHay', 360, 398, hayK({ kinds: ['round', 'square', 'bunting'] }));
  place('dairyGate', 190, 398, fieldGate({ cols: ['#c9c0b2', '#fbf6ec', '#5f8f6a'], w: 160 }));

  shell('vineyard', 'hill', {});
  place('vineRows', 0, 230, vineRows(), 228);
  place('vinePergola', -250, 300, pergolaK({ cols: ['#a0724a', '#fbf6ec', '#5f8f6a'] }), 300);
  place('vineTable', -250, 340, longTable({ cols: [['#c9a06a', null], ['#c9a06a', '#fffaf0'], ['#8fb3d0', null]], goods: [['bread', 'cheese'], ['cup', 'wheel'], ['pear', 'bread']] }));
  place('vineLights', 220, 225, lightsK({ w: 500, h: 290, kinds: ['bulb', 'lantern', 'globe'], cols: LIGHT_COLS, sag: 40 }), 226);
  place('vineSign', 240, 330, nameBoard({ text: 'Vineyard', cols: [['#6b2a3a', '#f2c64e', '#4a1a2a'], ['#3f6f5a', '#fbf1d8', '#2f4a3a'], ['#c9a06a', '#4a3020', '#8a5a3b']], w: 300 }));
  place('vineCart', 150, 380, cartK({ cols: ['#b98a5a', '#4f84b3', '#c0583c'], load: 'grapes' }));
  place('vineBarrels', 380, 398, barrels({ kinds: ['plain', 'stack', 'planter'], cols: ['#a8784a', '#8fb3d0', '#a8784a'] }));
  place('vinePots', -380, 398, potsK({ w: 200, n: 2, flowers: [FL.lav, FL.rosemary, FL.olive], leaf: ['#6a9f50', '#6f8f6a', '#8fa070'] }));

  shell('meadow', 'park', {});
  place('meadowFlowers', 0, 236, bedK({ w: 900, h: 50, flowers: [['#d0483a', '#4f6fd0', '#f6d36b'], FL.daisy, FL.fox] }), 230);
  place('meadowBoxes', -260, 280, birdBoxes({ cols: ['#b98a5a', ['#f5c6c0', '#bfe3d4', '#fff1b8'], ['#e8846f', '#8fb3e8', '#f6d36b']] }));
  place('meadowHives', 260, 300, hivesK());
  place('meadowSign', 40, 300, fingerpost({ cols: [['#b98a5a', '#3d2a20'], ['#fbf6ec', '#3d3a3f'], ['#3f6f5a', '#fbf6ec']], words: ['Hills', 'Woods', 'Café'] }));
  place('meadowPicnic', -60, 370, picnicK({ cols: [['#d0483a', '#fff8ec'], ['#4f84b3', '#fff8ec'], ['#e8846f', 'patch']] }));
  place('meadowBench', 220, 380, benchK({ cols: ['#a08a6a', '#9cb59a', '#f1e2c4'], w: 170 }));
  place('meadowGate', -360, 398, fieldGate({ cols: ['#c9c0b2', '#fbf6ec', '#5f8f6a'], w: 150 }));
  place('meadowPoppies', 400, 398, bedK({ w: 150, flowers: [FL.poppy, FL.welsh, FL.white] }));

  shell('woodland', 'park', { mid: (info, cx) => {
    // a little brook running down to the sea, under the footbridge
    X.beginPath(); X.moveTo(cx + 120, GROUND - 2); X.bezierCurveTo(cx + 170, 280, cx + 60, 330, cx + 120, QUAY + 4); X.lineTo(cx + 230, QUAY + 4); X.bezierCurveTo(cx + 170, 330, cx + 280, 280, cx + 220, GROUND - 2); X.closePath();
    X.fillStyle = C('#8fc7d8'); X.fill(); out(3);
  } });
  place('woodDen', -300, 250, denK());
  place('woodLanterns', 0, 220, lightsK({ w: 620, h: 300, kinds: ['bulb', 'lantern', 'star'], cols: LIGHT_COLS, sag: 50, postCol: '#8a6a4a' }), 218);
  place('woodSign', -40, 270, fingerpost({ cols: [['#b98a5a', '#3d2a20'], ['#3f6f5a', '#fbf6ec'], ['#9a7a5a', '#fbf6ec']], words: ['Meadow', 'Hill', 'Café'] }));
  place('woodBridge', 170, 330, footbridge({ cols: ['#a0724a', '#5f8f6a', 'rope'] }), 330);
  place('woodLogs', 340, 300, logPile({ kinds: ['oak', 'birch', 'moss'] }));
  place('woodBench', -150, 365, logBench({ kinds: ['split', 'carved', 'moss'] }));
  place('woodStools', -350, 398, toadstools());
  place('woodBluebells', 390, 398, bedK({ w: 180, flowers: [FL.bluebell, FL.garlic, FL.primrose] }));

  shell('observatoryHill', 'hill', {});
  place('obsDome', -250, 245, domeK());
  place('obsSign', 130, 240, nameBoard({ text: 'Observatory', cols: [['#1f2a4a', '#f2c64e', '#2f3f6b'], ['#f3ead8', '#1f2a4a', '#2f3f6b'], ['#b8743a', '#fff8ec', '#8a4a2a']], w: 320 }));
  place('obsLights', 0, 222, lightsK({ w: 960, h: 340, kinds: ['star', 'moon', 'bulb'], cols: LIGHT_COLS, sag: 40, n: 16 }), 220);
  place('obsChart', 380, 300, starBoard());
  place('obsScope', 180, 345, Pk('telescope', [-104, -170, 104, 8]));
  place('obsBlankets', -40, 360, picnicK({ cols: [['#c0392b', '#2f5a3a'], ['#e8846f', 'patch'], ['#1f2a4a', '#3f4f7a']], basket: true }));
  place('obsBench', -300, 380, benchK({ cols: ['#b98a5a', '#3f6f5a', '#2f3f6b'], w: 170 }));
  place('obsLamps', 40, 398, lamps({ dx: 360 }));

  // ---- Book 8: The Island
  shell('island', 'dunes', {});
  place('islePalms', -330, 250, treeK({ looks: [['#6f9f5f', '#000', ''], ['#5f9a5a', '#000', ''], ['#6f9f5f', '#8fb37a', 'bloom']], kind: 'palm', w: 220, h: 300 }));
  place('isleShack', 300, 240, hutK({ cols: [['#8fc3dc', '#fff8ec', '#4f84b3'], ['#f6d36b', '#fff8ec', '#e8a020'], ['#f2a08a', '#fff8ec', '#c0583c']], w: 180, h: 220 }));
  place('isleSign', -100, 236, nameBoard({ text: 'Puffin Isle', cols: [['#c9b48a', '#4a3020', '#8a6a4a'], ['#4f84b3', '#ffffff', '#2f5a8a'], ['#f2a08a', '#fff8ec', '#c0583c']], w: 240 }));
  place('isleLanterns', 50, 250, lightsK({ w: 400, h: 210, kinds: ['bulb', 'lantern', 'moon'], cols: LIGHT_COLS }), 248);
  place('isleHammock', -120, 330, hammock());
  place('isleKayaks', 220, 380, kayaks());
  place('islePicnic', -330, 390, picnicK({ cols: [['#d0483a', '#fff8ec'], ['#4f84b3', '#fff8ec'], ['#e8846f', 'patch']] }));
  place('isleJetty', 0, 410, jettyK({ cols: ['#b98a5a', '#c9c0b2', '#fbf6ec'], len: 220, w: 150 }), 410);

  shell('ferry', 'village', {});
  place('fryShelter', -280, 240, shelterK({ cols: [['#f1e2c4', '#3f6f5a', '#fbf6ec'], ['#fbf6ec', '#4f84b3', '#fbf6ec'], ['#f6dcd6', '#e88aa0', '#fbf6ec']], w: 300, h: 210 }));
  place('fryBoard', 60, 240, boardK({ cols: [['#2f4a8a', '#e9e1d2', '#3d3a3f'], ['#e9dcc0', '#fbf6ec', '#3d3a3f'], ['#3f6f5a', '#e9e1d2', '#3d3a3f']], kind: 'notice' }));
  place('fryFlags', 340, 230, mast({ h: 320 }));
  place('fryBenches', -100, 345, benchK({ cols: B_OGS, w: 160, pair: 120 }));
  place('fryLamps', 0, 395, lamps({ dx: 340 }));
  place('fryBollards', 220, 400, bollardsK({ xs: [0, 160], cols: [['#2f2f33', '#ffffff'], ['#2f5a8a', null], ['#c0392b', null]] }), 400);
  place('fryGangway', -330, 400, gangwayK({ cols: ['#fbf6ec', '#b98a5a', 'rope'] }), 410);
  place('fryBoat', 120, 600, Pk('ferry', [-304, -254, 294, 24]), 600);

  shell('islandCafe', 'dunes', { top: -600, build: (info, cx) => facade(info, cx, { w: 760, wall: '#fbf6ec', roof: '#4f9fb3', chimney: 250, wins: [-253, 0, 253], trim: '#e9f3f6' }) });
  place('icafeSign', -110, -55, sign({ text: 'Island Café', cols: [['#4f9fb3', '#ffffff', '#2f7f93'], ['#f2a08a', '#fff8ec', '#c0583c'], ['#f6d36b', '#6b4a20', '#e8a020']], w: 300, size: 30 }), -55);
  place('icafeAwning', -110, -8, awning({ cols: [['#4f9fb3', '#fff8ec'], ['#f2a08a', '#fff8ec'], ['#f6d36b', '#fff8ec']], w: 380 }), 70);
  place('icafeWindow', -110, 185, shopWindow({ w: 300, goods: ['lemon', 'scones', 'tarts'] }), 60);
  place('icafeDoor', 240, 200, door({ cols: ['#3fb0b0', '#f2a08a', '#f2d36b'] }), 150);
  place('icafeLights', 0, -110, lightsK({ w: 740, h: 0, posts: false, sag: 26, n: 14, kinds: ['bulb', 'shell', 'globe'], cols: LIGHT_COLS }), -110);
  place('icafeTables', -150, 345, tablesK({ dx: 120 }));
  place('icafeBoard', 160, 330, boardK({ cols: [['#a0724a', '#2f3330', '#fbf6ec'], ['#c9b48a', '#8fc3dc', '#2f4a6b'], ['#5f6f7a', '#3d4440', '#fbf6ec']], lines: ['Today', 'Lemon cake'] }));
  place('icafePlanters', 330, 398, potsK({ w: 240, n: 3, flowers: [FL.gera, FL.agapanthus, FL.lav], potCols: ['#f2f2f2', '#4f9fb3', '#d9825b'] }));

  // ---- Book 9: Homeward
  shell('festival', 'hill', {});
  place('festTent', -230, 260, marquee());
  place('festBunting', 0, 212, buntingK({ w: 950, h: 360, cols: [['#d0483a', '#f2a33a', '#e8c25a', '#a0583a'], FLAG3[0], ['#d0483a', '#fff8ec', '#4f84b3', '#fff8ec']], sag: 50, n: 16 }), 208);
  place('festLanterns', 230, 222, lightsK({ w: 440, h: 300, kinds: ['lantern', 'globe', 'bulb'], cols: ['#ffd98a', '#f2943a', '#fff1c8'], sag: 40 }), 216);
  place('festSign', 260, 300, nameBoard({ text: 'Harvest Fair', cols: [['#e9c25a', '#6b3a1a', '#a0724a'], ['#c0392b', '#fff8ec', '#8a2a2a'], ['#6a3f6a', '#fbf1d8', '#4a2a4a']], w: 320 }));
  place('festTable', -210, 360, longTable({ cols: [['#c9a06a', '#fffaf0'], ['#c9a06a', '#d0483a'], ['#c9a06a', '#4f84b3']], goods: [['pie', 'bread'], ['apple', 'wheel'], ['jar', 'cake']] }));
  place('festWagon', 180, 370, cartK({ cols: ['#c0583c', '#c0583c', '#c0583c'], load: ['pumpkin', 'apple', 'hay'] }));
  place('festHay', 360, 398, hayK({ kinds: ['round', 'square', 'rugs'] }));
  place('festPumpkins', -10, 398, pumpkins({ kinds: ['orange', 'pale', 'gourd'] }));

  shell('station', 'village', { top: -600, mid: (info, cx) => rails(cx - 500 - 60, cx + 500 + 60, 386), build: (info, cx) => {
    facade(info, cx, { dx: 250, w: 480, h: 380, wall: '#d9a07d', roof: '#6f7f8f', chimney: 110, wins: [-120, 120], texture: 'brick', trim: '#f1e2c4' });
  } });
  place('stnSign', 250, -96, nameBoard({ text: 'Seaview', cols: [['#f1e2c4', '#3f6f5a', '#3f6f5a'], ['#fbf6ec', '#2f4a8a', '#2f4a8a'], ['#f3ead8', '#c0392b', '#8a2a2a']], w: 340 }), -96);
  place('stnClock', 250, 40, clockK({ cols: [['#fbf6ec', '#fffaf0'], ['#2f2f33', '#fbf6ec'], ['#3f6f5a', '#f1e2c4']], wall: true }), 40);
  place('stnBaskets', 250, -10, basketsK({ xs: [-150, 150], flowers: BASKETS }), -10);
  place('stnCanopy', -190, 300, canopy({ cols: [['#3f6f5a', '#d9e8e0'], ['#2f4a8a', '#dde6f0'], ['#c0392b', '#f0e0d8']], w: 560 }), 250);
  place('stnBenches', -200, 300, benchK({ cols: B_OGS, w: 170 }), 300);
  place('stnTrolley', 60, 330, luggage({ kinds: ['cases', 'hat', 'hamper'] }));
  place('stnEngine', -220, 400, engineK(), 400);
  place('stnLamps', 220, 340, lamps({ dx: 200 }), 340);

  shell('seaWall', 'village', {});
  place('wallChalets', -120, 235, chalets());
  place('wallMural', 280, 240, muralK({ w: 380 }), 236);
  place('wallFlags', 340, 330, mast({ h: 320 }));
  place('wallRings', -420, 330, ringK({ cols: [['#d0483a', '#ffffff'], ['#f2843a', '#ffd9b0'], ['#4f84b3', '#ffffff']] }));
  place('wallBenches', -120, 350, benchK({ cols: B_OGS, w: 160, pair: 130 }));
  place('wallScope', 220, 380, Pk('seaScope', [-52, -124, 64, 6]));
  place('wallLamps', 0, 395, lamps({ dx: 340 }));
  place('wallRailings', 0, 404, railK({ w: 960, cols: ['#4f84b3', '#8fcfb5', '#fbf6ec'], h: 60 }), 404);

  shell('homecoming', 'village', {});
  place('homeBanner', 0, 240, banner({ cols: [['#fffaf0', '#d9a640'], ['#fffaf0', 'rainbow'], ['#fff3f4', '#d06a8a']] }), 236);
  place('homeBunting', 0, 210, buntingK({ w: 950, h: 400, cols: [FLAG3[0], FLAG3[1], ['#d9a640', '#fffaf0']], sag: 50, n: 16 }), 205);
  place('homeLights', 0, 214, lightsK({ w: 760, h: 330, kinds: ['bulb', 'star', 'lantern'], cols: LIGHT_COLS, sag: 50, n: 14 }), 206);
  place('homeFireworks', 150, 300, fireworks(), -400);
  place('homeArch', -320, 300, flowerArch({ looks: [['#6a9f50', FL.blush.concat(FL.crimson)], ['#6a9f50', ['#d0483a', '#4f6fd0', '#f6d36b', '#fffaf0']], ['#6a9f50', 'sun']] }));
  place('homeTable', 60, 350, longTable({ cols: [['#c9a06a', '#fffaf0'], ['#c9a06a', '#d0483a'], ['#c9a06a', '#f5c6c0']], goods: [['cake', 'cup', 'teapot'], ['bun', 'cup', 'teapot'], ['sponge', 'cup', 'flowers']] }));
  place('homeCake', 330, 330, cakeK());
  place('homeLanterns', 0, 398, lanternsK({ dx: 380, h: 120, kinds: ['jar', 'jar', 'brass'] }));
}
