// Cookie tin (Journey "Cookie tins" token from chapter 15, DESIGN.md "Cookie tins"). Presentation only.
// A short round biscuit tin in the café palette: a soft blue body with a cream band, a domed lid with a rim and a
// little cookie motif, seen from slightly above. The dots on the band show the merges still needed to open it
// (3 -> 2 -> 1): big rose dots for taps left, dark hollow rings (about 4:1 on the cream band) with a small tick for
// taps done. Each tap also leaves the lid a little more ajar, with a cookie peeking out, so progress reads as a change
// of the whole object even when the dots are blurred (docs/UX_TINS.md T1). Same dark outline and cream glow ring as the
// teapot, so it reads as a special piece on light pieces and light scenes, and its flat-topped silhouette never reads
// as a merge piece. Drawn at full piece size, the same for every skin and in Calm (no idle motion).
import { TIN_TAPS } from './board.js';

const OUT = 'rgba(60,36,26,0.95)';
const DONE = '#8a6a52'; // "done" ring ink, about 4:1 on the cream band (WCAG 1.4.11 asks for 3:1)

/** How far the lid sits ajar on a closed tin with `taps` taps left: 0 when untouched, then 0.12 per tap done. */
export function tinAjar(taps) {
  return Math.max(0, TIN_TAPS - taps) * 0.12;
}

/** Rounded-rectangle body path of the tin (x from -w to w, y from top to bot). */
function bodyPath(ctx, w, top, bot, rad) {
  ctx.beginPath();
  ctx.moveTo(-w, top);
  ctx.lineTo(w, top);
  ctx.lineTo(w, bot - rad);
  ctx.quadraticCurveTo(w, bot, w - rad, bot);
  ctx.lineTo(-w + rad, bot);
  ctx.quadraticCurveTo(-w, bot, -w, bot - rad);
  ctx.closePath();
}

/**
 * Draw a cookie tin centred at the current origin. h: half the cell size (CSS px).
 * taps: taps left (1..TIN_TAPS). opts.open (0..1): the lid lifts and tips while the tin opens; when not given, the
 * lid sits ajar by tinAjar(taps).
 */
export function drawTin(ctx, h, taps = TIN_TAPS, opts = {}) {
  const lw = Math.max(1, h * 0.06);
  const open = Math.max(0, Math.min(1, opts.open == null ? tinAjar(taps) : opts.open));
  const w = h * 0.76, top = -h * 0.12, bot = h * 0.56;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // soft cream glow ring + shadow on the board (like the teapot); radius 0.88 h around y 0.1 h keeps it inside the
  // cell now that the tin is drawn at full piece size
  const glow = ctx.createRadialGradient(0, h * 0.1, h * 0.45, 0, h * 0.1, h * 0.88);
  glow.addColorStop(0, 'rgba(255,236,200,0.5)');
  glow.addColorStop(0.7, 'rgba(255,214,150,0.2)');
  glow.addColorStop(1, 'rgba(255,214,150,0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(0, h * 0.1, h * 0.88, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(40,24,16,0.22)';
  ctx.beginPath(); ctx.ellipse(0, h * 0.64, h * 0.76, h * 0.12, 0, 0, Math.PI * 2); ctx.fill();
  // body: soft blue with a darker base and a taller cream band (the tin's "face" is mostly cream with rose dots)
  bodyPath(ctx, w, top, bot, h * 0.12);
  const g = ctx.createLinearGradient(-w, 0, w, 0);
  g.addColorStop(0, '#6f97c4'); g.addColorStop(0.35, '#a9c6e6'); g.addColorStop(0.7, '#86aad3'); g.addColorStop(1, '#5d84b2');
  ctx.fillStyle = g; ctx.fill();
  ctx.save();
  bodyPath(ctx, w, top, bot, h * 0.12); ctx.clip();
  ctx.fillStyle = '#fbefdc';
  ctx.fillRect(-w, h * 0.06, w * 2, h * 0.32);
  ctx.fillStyle = 'rgba(30,50,90,0.18)';
  ctx.fillRect(-w, bot - h * 0.1, w * 2, h * 0.1);
  ctx.restore();
  bodyPath(ctx, w, top, bot, h * 0.12);
  ctx.strokeStyle = OUT; ctx.lineWidth = lw; ctx.stroke();
  // tap dots on the band (about 60% bigger than the first version): taps left are rose dots with a dark outline,
  // taps done are dark hollow rings with a small tick inside, so "done" is its own shape, not only a colour
  const n = TIN_TAPS, gap = h * 0.4, dy = h * 0.22, dr = h * 0.13;
  for (let i = 0; i < n; i++) {
    const dx = (i - (n - 1) / 2) * gap;
    ctx.beginPath(); ctx.arc(dx, dy, dr, 0, Math.PI * 2);
    if (i < taps) { ctx.fillStyle = '#d9707e'; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = lw * 0.8; ctx.stroke(); }
    else {
      ctx.strokeStyle = DONE; ctx.lineWidth = lw * 0.8; ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(dx - dr * 0.45, dy + dr * 0.02); ctx.lineTo(dx - dr * 0.1, dy + dr * 0.38); ctx.lineTo(dx + dr * 0.48, dy - dr * 0.36);
      ctx.lineWidth = lw * 0.7; ctx.stroke();
    }
  }
  // a cookie peeking out under the lid once it sits ajar (after the first tap, and while opening)
  if (open > 0.01) {
    ctx.beginPath(); ctx.ellipse(-w * 0.12, top - h * 0.03, h * 0.26, h * 0.1, -0.1, 0, Math.PI * 2);
    ctx.fillStyle = '#e8b878'; ctx.fill(); ctx.strokeStyle = 'rgba(120,70,30,0.8)'; ctx.lineWidth = lw * 0.6; ctx.stroke();
    ctx.fillStyle = '#7a4a2a';
    for (const [cx, cy] of [[-0.24, -0.05], [-0.08, -0.07], [0.03, -0.01]]) {
      ctx.beginPath(); ctx.arc(cx * h, top + cy * h, h * 0.024, 0, Math.PI * 2); ctx.fill();
    }
  }
  // lid (sits ajar after taps; lifts and tips while opening)
  ctx.save();
  ctx.translate(open * h * 0.18, top - open * h * 0.5);
  ctx.rotate(open * 0.45);
  // rim
  ctx.beginPath(); ctx.ellipse(0, 0, w * 1.06, h * 0.14, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#4f76a6'; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = lw; ctx.stroke();
  // domed top
  ctx.beginPath(); ctx.ellipse(0, -h * 0.06, w * 0.98, h * 0.16, 0, 0, Math.PI * 2);
  const lg = ctx.createLinearGradient(0, -h * 0.22, 0, h * 0.1);
  lg.addColorStop(0, '#cfe0f2'); lg.addColorStop(1, '#8fb2da');
  ctx.fillStyle = lg; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = lw; ctx.stroke();
  // little cookie motif on the lid
  ctx.beginPath(); ctx.ellipse(0, -h * 0.06, h * 0.2, h * 0.075, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#e8b878'; ctx.fill(); ctx.strokeStyle = 'rgba(120,70,30,0.7)'; ctx.lineWidth = lw * 0.6; ctx.stroke();
  ctx.fillStyle = '#7a4a2a';
  for (const [cx, cy] of [[-0.08, -0.07], [0.07, -0.04], [0.0, -0.1]]) {
    ctx.beginPath(); ctx.arc(cx * h, cy * h, h * 0.022, 0, Math.PI * 2); ctx.fill();
  }
  // glossy highlight
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath(); ctx.ellipse(-w * 0.55, -h * 0.1, h * 0.12, h * 0.035, -0.2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.restore();
}
