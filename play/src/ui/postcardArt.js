// Postcard share: draws the 1080 x 1350 card (canvas, no images) and hands it to the share sheet.
// Rules, words and layout numbers live in src/meta/postcard.js; Unity mirror: Scripts/UI/PostcardRender.cs.
//
// Drawn from the game's own art: the nebula backdrop (sceneArt.paintBase), the orb sprites (orbArt.drawOrb)
// and the Observatory constellation (observatoryArt.paintConstellation). Nothing links anywhere.
import { paintBase } from '../game/sceneArt.js';
import { pageLook } from './copy.js';
import { BACKDROP_BY_ID, BACKDROPS } from '../game/backdrops.js';
import { drawOrb, tierColor } from '../game/orbArt.js';
import { mulberry32, hashString } from '../game/rng.js';
import { CONSTELLATIONS } from '../meta/observatory.js';
import { paintConstellation } from './observatoryArt.js';
import { shareCard } from '../meta/dailyNebula.js';
import { POSTCARD_W, POSTCARD_H, postcardLayoutFor, postcardFileName } from '../meta/postcard.js';
import { paintVisitorScene } from '../game/visitorArt.js';

const FONT = "Fredoka, 'Baloo 2', ui-rounded, system-ui, sans-serif";
const GOLD = '#ffd54a';

function starShape(ctx, x, y, r, inner = 0.45) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5;
    const rr = k % 2 ? r * inner : r;
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py);
  }
  ctx.closePath();
}

/** Word-wrap `text` into lines no wider than maxW with the current font. */
function wrapLines(ctx, text, maxW) {
  const out = [];
  let cur = '';
  for (const w of String(text).split(/\s+/)) {
    const next = cur ? cur + ' ' + w : w;
    if (cur && ctx.measureText(next).width > maxW) { out.push(cur); cur = w; } else cur = next;
  }
  if (cur) out.push(cur);
  return out;
}

/**
 * A café visitor's keepsake (kind 'visitor'): a cream seaside postcard, a painted picture with a white border, a
 * little stamp, the visitor's handwritten-style note and the café's name with the date. Nothing links anywhere.
 */
function paintVisitorCard(ctx, m, W, H) {
  const SER = "'Iowan Old Style','Palatino Linotype',Georgia,serif";
  const INK = '#3b2a20';
  ctx.fillStyle = '#fbf3e6'; ctx.fillRect(0, 0, W, H);
  // paper grain + a soft inner border
  const rnd = mulberry32(hashString('visitor:' + m.id));
  ctx.fillStyle = 'rgba(150,110,70,0.05)';
  for (let i = 0; i < 900; i++) ctx.fillRect(rnd() * W, rnd() * H, 2, 2);
  ctx.strokeStyle = '#d8b892'; ctx.lineWidth = 4; ctx.strokeRect(28, 28, W - 56, H - 56);
  // the painted picture, a white print border and a soft shadow
  const px = 84, py = 84, pw = W - 168, ph = 640;
  ctx.save(); ctx.shadowColor = 'rgba(90,60,40,0.22)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
  ctx.fillStyle = '#ffffff'; ctx.fillRect(px - 18, py - 18, pw + 36, ph + 36); ctx.restore();
  paintVisitorScene(ctx, m.id, px, py, pw, ph);
  // stamp, overlapping the picture's corner
  const sx = W - 230, sy = py + ph - 96, sw = 150, sh = 180;
  ctx.save(); ctx.translate(sx + sw / 2, sy + sh / 2); ctx.rotate(0.06);
  ctx.fillStyle = '#fffdf8'; ctx.fillRect(-sw / 2, -sh / 2, sw, sh);
  ctx.fillStyle = '#fbf3e6';
  for (let i = 0; i <= 8; i++) for (const [ax, ay] of [[-sw / 2 + (i * sw) / 8, -sh / 2], [-sw / 2 + (i * sw) / 8, sh / 2]]) { ctx.beginPath(); ctx.arc(ax, ay, 6, 0, Math.PI * 2); ctx.fill(); }
  for (let i = 0; i <= 10; i++) for (const ax of [-sw / 2, sw / 2]) { ctx.beginPath(); ctx.arc(ax, -sh / 2 + (i * sh) / 10, 6, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#e7c9a6'; ctx.fillRect(-sw / 2 + 16, -sh / 2 + 16, sw - 32, sh - 32);
  ctx.fillStyle = '#f7e6cf'; ctx.beginPath(); ctx.arc(0, 4, 34, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#b5546a'; ctx.beginPath();
  ctx.moveTo(0, 22); ctx.bezierCurveTo(-36, -2, -18, -30, 0, -10); ctx.bezierCurveTo(18, -30, 36, -2, 0, 22); ctx.fill();
  ctx.fillStyle = '#6b4a3a'; ctx.font = `700 22px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('CAFÉ', 0, sh / 2 - 34);
  ctx.restore();
  // words
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  const tx = 96, maxW = W - 192;
  let y = py + ph + 104;
  ctx.fillStyle = '#9a5a46'; ctx.font = `700 30px ${FONT}`;
  ctx.fillText(m.kicker, tx, y);
  y += 72;
  ctx.fillStyle = INK; ctx.font = `700 60px ${SER}`;
  let ts = 60;
  while (ts > 36 && ctx.measureText(m.title).width > maxW) { ts -= 2; ctx.font = `700 ${ts}px ${SER}`; }
  ctx.fillText(m.title, tx, y);
  y += 66;
  ctx.font = `italic 400 40px ${SER}`; ctx.fillStyle = '#4a3428';
  const lines = wrapLines(ctx, m.sub, maxW);
  // ruled lines under the note, like a real postcard
  for (const ln of lines.slice(0, 5)) {
    ctx.strokeStyle = 'rgba(160,120,90,0.25)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(tx, y + 12); ctx.lineTo(W - 96, y + 12); ctx.stroke();
    ctx.fillText(ln, tx, y); y += 56;
  }
  ctx.fillStyle = '#7a5a48'; ctx.font = `700 28px ${FONT}`;
  ctx.fillText(`Nova's Seaside Café · ${m.date}`, tx, H - 76);
}

/** One line of text, shrunk until it fits maxW. */
function fitText(ctx, text, x, y, size, maxW, weight = 700) {
  let s = size;
  ctx.font = `${weight} ${s}px ${FONT}`;
  while (s > 18 && ctx.measureText(text).width > maxW) { s -= 2; ctx.font = `${weight} ${s}px ${FONT}`; }
  ctx.fillText(text, x, y);
}

function paintHero(ctx, m, L, skin) {
  const { heroCx: cx, heroCy: cy, heroR: r } = L;
  const h = m.hero || {};
  if (h.type === 'orb') {
    const col = tierColor(h.tier, skin);
    const g = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r * 1.7);
    g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r * 1.7, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    if (m.kind === 'supernova') {
      // soft burst rays behind the orb
      ctx.save();
      ctx.translate(cx, cy);
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = '#ffe9a8';
      for (let i = 0; i < 12; i++) {
        ctx.rotate(Math.PI / 6);
        ctx.beginPath(); ctx.moveTo(-r * 0.08, 0); ctx.lineTo(0, -r * 1.75); ctx.lineTo(r * 0.08, 0); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    drawOrb(ctx, cx, cy, r * 0.82, h.tier, skin, 1, {});
    return;
  }
  // dark round sky window behind constellations and Nebula stars (the Observatory tile's colours)
  const sky = ctx.createRadialGradient(cx, cy - r * 0.2, 0, cx, cy, r * 1.15);
  sky.addColorStop(0, 'rgba(36,29,92,0.95)'); sky.addColorStop(0.8, 'rgba(18,14,51,0.85)'); sky.addColorStop(1, 'rgba(18,14,51,0)');
  ctx.fillStyle = sky;
  ctx.beginPath(); ctx.arc(cx, cy, r * 1.15, 0, Math.PI * 2); ctx.fill();
  if (h.type === 'constellation') {
    const c = CONSTELLATIONS[h.index];
    if (!c) return;
    const size = Math.round(r * 2.1);
    const tmp = document.createElement('canvas');
    tmp.width = size; tmp.height = size;
    paintConstellation(tmp, c, { lit: c.stars.length, complete: true });
    ctx.drawImage(tmp, cx - size / 2, cy - size / 2, size, size); // paintConstellation may upscale by dpr; drawn back at size
    return;
  }
  if (h.type === 'stars') {
    const sr = r * 0.3;
    if (pageLook() !== 'cosmic') {
      // café looks: the finish rating as blossoms (★ is only the café star, docs/UX_STARS.md)
      for (let i = 0; i < 3; i++) {
        const x = cx + (i - 1) * sr * 2.3, y = cy + (i === 1 ? -sr * 0.35 : 0);
        const on = i < (h.stars | 0);
        ctx.save();
        ctx.beginPath();
        for (let k = 0; k < 5; k++) {
          const a = -Math.PI / 2 + k * (2 * Math.PI / 5);
          const px = x + Math.cos(a) * sr * 0.47, py = y + Math.sin(a) * sr * 0.47;
          ctx.moveTo(px + sr * 0.37, py);
          ctx.arc(px, py, sr * 0.37, 0, Math.PI * 2);
        }
        if (on) { ctx.fillStyle = '#b5475a'; ctx.fill(); } else { ctx.strokeStyle = 'rgba(255,243,220,0.7)'; ctx.lineWidth = Math.max(1.5, sr * 0.08); ctx.stroke(); }
        ctx.beginPath(); ctx.arc(x, y, sr * 0.19, 0, Math.PI * 2);
        ctx.fillStyle = on ? '#fff3e6' : 'rgba(255,243,220,0.5)'; ctx.fill();
        ctx.restore();
      }
      return;
    }
    for (let i = 0; i < 3; i++) {
      const x = cx + (i - 1) * sr * 2.3, y = cy + (i === 1 ? -sr * 0.35 : 0);
      const on = i < (h.stars | 0);
      ctx.save();
      if (on) { ctx.shadowColor = 'rgba(255,213,74,0.8)'; ctx.shadowBlur = sr * 0.6; }
      ctx.fillStyle = on ? GOLD : 'rgba(207,214,255,0.25)';
      starShape(ctx, x, y, sr, 0.48); ctx.fill();
      ctx.restore();
    }
  }
}

// ---------------------------------------------------------------- Season Keepsakes postcard frames
// (src/meta/seasonal.js KEEPSAKES; chosen by keepsakeFrame). A painted band around the card's outer edge with a cluster
// in each corner. It stays inside the card's margin and corners, so it never covers the words or the picture.
function frameLeaf(ctx, x, y, s, rot, col) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(0, 10); ctx.lineTo(-2, 4); ctx.lineTo(-9, 6); ctx.lineTo(-7, 1); ctx.lineTo(-11, -3); ctx.lineTo(-5, -4); ctx.lineTo(-6, -10);
  ctx.lineTo(-2, -7); ctx.lineTo(0, -13); ctx.lineTo(2, -7); ctx.lineTo(6, -10); ctx.lineTo(5, -4); ctx.lineTo(11, -3); ctx.lineTo(7, 1);
  ctx.lineTo(9, 6); ctx.lineTo(2, 4); ctx.closePath();
  ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = '#6b4a3a'; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.restore();
}
function frameFlake(ctx, x, y, r, col) {
  ctx.save(); ctx.translate(x, y); ctx.strokeStyle = col; ctx.lineWidth = Math.max(2, r * 0.14); ctx.lineCap = 'round';
  for (let k = 0; k < 6; k++) {
    ctx.rotate(Math.PI / 3);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -r);
    ctx.moveTo(0, -r * 0.55); ctx.lineTo(-r * 0.25, -r * 0.78); ctx.moveTo(0, -r * 0.55); ctx.lineTo(r * 0.25, -r * 0.78);
    ctx.stroke();
  }
  ctx.restore();
}
const FRAME_STYLE = {
  harvest: { band: '#c8743a', edge: '#7a4a2a', dot: '#f3c35a', paint: (ctx, cx, cy, sx, sy) => {
    const cols = ['#d8573a', '#e8913a', '#c9a23a', '#b8483a'];
    frameLeaf(ctx, cx + sx * 34, cy + sy * 84, 3.4, sx * sy * 0.6, cols[0]);
    frameLeaf(ctx, cx + sx * 84, cy + sy * 34, 3.4, -sx * sy * 0.9 + 1.4, cols[1]);
    frameLeaf(ctx, cx + sx * 46, cy + sy * 44, 3.9, sx * sy * -0.3 + (sy < 0 ? 0 : Math.PI), cols[2]);
    for (const [ax, ay, c] of [[96, 92, '#d8453a'], [118, 70, '#9bbf4a']]) {
      ctx.beginPath(); ctx.arc(cx + sx * ax, cy + sy * ay, 13, 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill();
      ctx.lineWidth = 2.5; ctx.strokeStyle = '#6b4a3a'; ctx.stroke();
    }
  } },
  winter: { band: '#8fb3d9', edge: '#4f6f96', dot: '#ffffff', paint: (ctx, cx, cy, sx, sy) => {
    frameFlake(ctx, cx + sx * 58, cy + sy * 58, 40, '#ffffff');
    frameFlake(ctx, cx + sx * 124, cy + sy * 40, 18, '#dcecff');
    frameFlake(ctx, cx + sx * 40, cy + sy * 124, 18, '#dcecff');
  } },
};

/** Draw a Season Keepsakes frame (set id 'harvest' | 'winter') over the whole card. Unknown ids draw nothing. */
export function paintKeepsakeFrame(ctx, frame, W = POSTCARD_W, H = POSTCARD_H) {
  const st = FRAME_STYLE[frame];
  if (!ctx || !st) return;
  const inset = 12, band = 22;
  ctx.save();
  ctx.lineWidth = band; ctx.strokeStyle = st.band;
  ctx.strokeRect(inset + band / 2, inset + band / 2, W - inset * 2 - band, H - inset * 2 - band);
  ctx.lineWidth = 3; ctx.strokeStyle = st.edge;
  ctx.strokeRect(inset, inset, W - inset * 2, H - inset * 2);
  ctx.strokeRect(inset + band, inset + band, W - (inset + band) * 2, H - (inset + band) * 2);
  // a row of little dots along the band (stitches / frost beads)
  ctx.fillStyle = st.dot; ctx.globalAlpha = 0.8;
  const c = inset + band / 2;
  for (let x = 150; x <= W - 150; x += 36) { for (const y of [c, H - c]) { ctx.beginPath(); ctx.arc(x, y, 3.2, 0, Math.PI * 2); ctx.fill(); } }
  for (let y = 150; y <= H - 150; y += 36) { for (const x of [c, W - c]) { ctx.beginPath(); ctx.arc(x, y, 3.2, 0, Math.PI * 2); ctx.fill(); } }
  ctx.globalAlpha = 1;
  for (const [cx, cy, sx, sy] of [[0, 0, 1, 1], [W, 0, -1, 1], [0, H, 1, -1], [W, H, -1, -1]]) st.paint(ctx, cx, cy, sx, sy);
  ctx.restore();
}

/** Draw the postcard into a new 1080 x 1350 canvas and return it. opts: { skin, frame } (frame: a keepsake set id or null) */
export function renderPostcard(m, { skin = 'classic', frame = null } = {}) {
  const cv = renderPostcardBase(m, skin);
  if (frame && m) paintKeepsakeFrame(cv.getContext('2d'), frame, POSTCARD_W, POSTCARD_H);
  return cv;
}

function renderPostcardBase(m, skin) {
  const W = POSTCARD_W, H = POSTCARD_H;
  const L = postcardLayoutFor(m, W, H);
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  if (!ctx || !m) return cv;
  if (m.kind === 'visitor') { paintVisitorCard(ctx, m, W, H); return cv; }
  const theme = BACKDROP_BY_ID[m.backdrop] || BACKDROPS[0];
  paintBase(ctx, theme, W, H);
  // seeded star field (same card, same sky)
  const rnd = mulberry32(hashString('postcard:' + m.kind + ':' + theme.id));
  for (let i = 0; i < 170; i++) {
    const x = rnd() * W, y = rnd() * H, s = 1.5 + rnd() * 3;
    ctx.globalAlpha = 0.25 + rnd() * 0.6;
    ctx.fillStyle = rnd() < 0.15 ? `hsl(${theme.starHue},80%,82%)` : '#fff';
    ctx.beginPath(); ctx.arc(x, y, s / 2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // frame
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = L.frameWidth;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(L.margin, L.margin, W - L.margin * 2, H - L.margin * 2, L.frameRadius);
  else ctx.rect(L.margin, L.margin, W - L.margin * 2, H - L.margin * 2);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = GOLD;
  fitText(ctx, m.kicker, W / 2, L.kickerY, L.kickerSize, L.textMaxW);

  paintHero(ctx, m, L, skin);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(10,6,30,0.8)'; ctx.shadowBlur = 18;
  fitText(ctx, m.title, W / 2, L.titleY, L.titleSize, L.textMaxW);
  if (m.big) {
    const g = ctx.createLinearGradient(0, L.bigY - L.bigSize / 2, 0, L.bigY + L.bigSize / 2);
    g.addColorStop(0, '#fff6cf'); g.addColorStop(1, GOLD);
    ctx.fillStyle = g;
    fitText(ctx, m.big, W / 2, L.bigY, L.bigSize, L.textMaxW);
    ctx.fillStyle = '#b9b0e6';
    fitText(ctx, m.bigLabel, W / 2, L.bigLabelY, L.bigLabelSize, L.textMaxW, 600);
  }
  ctx.fillStyle = '#d9d3ff';
  fitText(ctx, m.sub, W / 2, L.subY, L.subSize, L.textMaxW, 600);
  // foot: game name + date
  const bg = ctx.createLinearGradient(W / 2 - 200, 0, W / 2 + 200, 0);
  bg.addColorStop(0, '#7ad7ff'); bg.addColorStop(1, '#ff8ae0');
  ctx.fillStyle = bg;
  fitText(ctx, 'Nova\'s Café', W / 2, L.brandY, L.brandSize, L.textMaxW);
  ctx.fillStyle = '#b9b0e6';
  fitText(ctx, m.date, W / 2, L.dateY, L.dateSize, L.textMaxW, 600);
  ctx.shadowBlur = 0;
  return cv;
}

/** Wait (briefly) for the Fredoka web font so the card isn't drawn in a fallback face. */
export async function fontsReady() {
  try {
    if (typeof document === 'undefined' || !document.fonts || !document.fonts.load) return;
    await Promise.race([
      Promise.all([document.fonts.load(`700 64px ${FONT}`), document.fonts.load(`600 40px ${FONT}`)]),
      new Promise((r) => setTimeout(r, 800)),
    ]);
  } catch (_) { /* draw with whatever font is there */ }
}

function toBlob(cv) {
  return new Promise((resolve) => {
    try { cv.toBlob((b) => resolve(b), 'image/png'); } catch (_) { resolve(null); }
  });
}

function download(blob, name) {
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return true;
  } catch (_) { return false; }
}

/**
 * Share the postcard. Phones with file sharing get the native sheet with the picture and the caption.
 * Otherwise: phones fall back to the existing text share (shareCard); computers save the PNG and copy the caption.
 * Resolves 'shared' | 'cancelled' | 'saved' | 'copied' | 'failed'. No reward, no ad, no link.
 */
export async function sharePostcard(cv, m, caption) {
  const nav = typeof navigator !== 'undefined' ? navigator : null;
  const coarse = (() => { try { return !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches); } catch (_) { return false; } })();
  const blob = await toBlob(cv);
  const name = postcardFileName(m);
  if (blob && nav && coarse && nav.share && nav.canShare && typeof File === 'function') {
    let file = null;
    try { file = new File([blob], name, { type: 'image/png' }); } catch (_) { file = null; }
    let can = false;
    try { can = !!(file && nav.canShare({ files: [file] })); } catch (_) { can = false; }
    if (can) {
      try { await nav.share({ files: [file], text: caption }); return 'shared'; } catch (e) { if (e && e.name === 'AbortError') return 'cancelled'; }
    }
  }
  if (coarse || !blob) return shareCard(caption);
  const saved = download(blob, name);
  await shareCard(caption); // desktop: copies the caption too
  return saved ? 'saved' : 'failed';
}
