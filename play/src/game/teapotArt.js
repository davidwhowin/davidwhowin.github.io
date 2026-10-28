// Teapot (Journey "Teapot deliveries" token from chapter 13, DESIGN.md "Teapot deliveries"). Presentation only.
// A round, cosy café teapot: cream glaze with a soft rose band and a little heart, a spout on the right, a loop
// handle on the left and a knobbed lid. A dark outline keeps it readable on light pieces and light scenes, and the
// silhouette (spout + handle) never reads as a merge piece. A small "down" chevron under it hints where it goes.
// Drawn the same for every skin and in Calm (no idle motion; the steam wisp only moves when anim is on).

// darker outline + a soft cream glow ring so the teapot stands out on light wood and light pieces (UX_MECHANICS P7)
const OUT = 'rgba(60,36,26,0.95)';

function body(ctx, h) {
  const w = h * 0.6, top = -h * 0.28, bot = h * 0.56;
  ctx.beginPath();
  ctx.moveTo(-w * 0.72, bot);
  ctx.bezierCurveTo(-w * 1.18, bot - h * 0.06, -w * 1.18, top + h * 0.02, -w * 0.62, top);
  ctx.lineTo(w * 0.62, top);
  ctx.bezierCurveTo(w * 1.18, top + h * 0.02, w * 1.18, bot - h * 0.06, w * 0.72, bot);
  ctx.closePath();
}

/**
 * Draw a teapot centred at the current origin. h: half the cell size (CSS px).
 * opts.time (seconds) + opts.anim: a faint steam wisp drifts above the lid.
 */
export function drawTeapot(ctx, h, opts = {}) {
  const lw = Math.max(1, h * 0.06);
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // soft cream glow ring behind it (a "special piece" halo that reads on dark and light scenes)
  const glow = ctx.createRadialGradient(0, h * 0.08, h * 0.45, 0, h * 0.08, h * 1.0);
  glow.addColorStop(0, 'rgba(255,236,200,0.55)');
  glow.addColorStop(0.7, 'rgba(255,214,150,0.22)');
  glow.addColorStop(1, 'rgba(255,214,150,0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(0, h * 0.08, h * 1.0, 0, Math.PI * 2); ctx.fill();
  // soft shadow on the board
  ctx.fillStyle = 'rgba(40,24,16,0.22)';
  ctx.beginPath(); ctx.ellipse(0, h * 0.66, h * 0.62, h * 0.12, 0, 0, Math.PI * 2); ctx.fill();
  // handle (left loop)
  ctx.strokeStyle = OUT; ctx.lineWidth = lw * 3.2;
  ctx.beginPath(); ctx.ellipse(-h * 0.62, h * 0.1, h * 0.24, h * 0.26, 0, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
  ctx.strokeStyle = '#f4e6d4'; ctx.lineWidth = lw * 1.6;
  ctx.beginPath(); ctx.ellipse(-h * 0.62, h * 0.1, h * 0.24, h * 0.26, 0, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
  // spout (right)
  ctx.beginPath();
  ctx.moveTo(h * 0.5, h * 0.3);
  ctx.quadraticCurveTo(h * 0.78, h * 0.26, h * 0.9, -h * 0.12);
  ctx.lineTo(h * 0.98, -h * 0.16);
  ctx.quadraticCurveTo(h * 0.94, h * 0.04, h * 0.78, h * 0.36);
  ctx.quadraticCurveTo(h * 0.66, h * 0.48, h * 0.5, h * 0.48);
  ctx.closePath();
  ctx.fillStyle = '#f4e6d4'; ctx.fill();
  ctx.strokeStyle = OUT; ctx.lineWidth = lw; ctx.stroke();
  // body
  body(ctx, h);
  const g = ctx.createLinearGradient(0, -h * 0.3, 0, h * 0.58);
  g.addColorStop(0, '#fff8ee'); g.addColorStop(0.65, '#f4e4cf'); g.addColorStop(1, '#e2c9ab');
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = OUT; ctx.lineWidth = lw; ctx.stroke();
  // rose band + heart
  ctx.save();
  body(ctx, h); ctx.clip();
  ctx.fillStyle = '#e59a9a';
  ctx.fillRect(-h, h * 0.06, h * 2, h * 0.16);
  ctx.restore();
  ctx.fillStyle = '#c95b6a';
  const hy = h * 0.14, hs = h * 0.13;
  ctx.beginPath();
  ctx.moveTo(0, hy + hs * 0.9);
  ctx.bezierCurveTo(-hs * 1.4, hy, -hs * 0.7, hy - hs * 1.1, 0, hy - hs * 0.3);
  ctx.bezierCurveTo(hs * 0.7, hy - hs * 1.1, hs * 1.4, hy, 0, hy + hs * 0.9);
  ctx.fill();
  // glossy highlight
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath(); ctx.ellipse(-h * 0.3, -h * 0.12, h * 0.14, h * 0.06, -0.5, 0, Math.PI * 2); ctx.fill();
  // lid + knob
  ctx.fillStyle = '#e8cfb2';
  ctx.beginPath(); ctx.ellipse(0, -h * 0.3, h * 0.42, h * 0.1, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = OUT; ctx.lineWidth = lw; ctx.stroke();
  ctx.fillStyle = '#c95b6a';
  ctx.beginPath(); ctx.arc(0, -h * 0.44, h * 0.09, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // steam wisp (only with motion on)
  if (opts.anim) {
    const t = opts.time || 0;
    ctx.strokeStyle = `rgba(255,255,255,${0.35 + 0.2 * Math.sin(t * 1.3)})`;
    ctx.lineWidth = lw * 1.1;
    ctx.beginPath();
    const sx = h * 0.94, sy = -h * 0.22, d = Math.sin(t * 1.7) * h * 0.05;
    ctx.moveTo(sx, sy);
    ctx.bezierCurveTo(sx + h * 0.1 + d, sy - h * 0.14, sx - h * 0.08 - d, sy - h * 0.26, sx + h * 0.04, sy - h * 0.42);
    ctx.stroke();
  }
  ctx.restore();
}

/** A "down" chevron below a teapot (where it is headed): 2x the old size, a dark edge under a bright stroke. a: alpha. */
export function drawTeapotHint(ctx, h, a = 0.7) {
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(-h * 0.28, h * 0.66); ctx.lineTo(0, h * 0.92); ctx.lineTo(h * 0.28, h * 0.66);
  };
  path(); ctx.strokeStyle = OUT; ctx.lineWidth = Math.max(2, h * 0.2); ctx.stroke();
  path(); ctx.strokeStyle = '#fff3dc'; ctx.lineWidth = Math.max(1, h * 0.11); ctx.stroke();
  ctx.restore();
}
