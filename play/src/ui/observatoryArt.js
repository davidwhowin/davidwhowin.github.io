// Procedural constellation drawing for the Observatory (canvas, no images). Unity mirror:
// Scripts/UI/ScreensObservatory.cs (same colours, same rules for which lines and stars show).
//
// Lit stars glow gold; unlit stars are faint dots. A line is drawn only when both of its stars are
// lit, so the shape fills in as the player earns stars. A finished constellation also gets a soft
// halo behind it.

const GOLD = '#ffe17a';
const LINE = 'rgba(255,225,122,0.45)';
const DIM = '#cfd6ff';

function starPath(ctx, x, y, r) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5;
    const rr = k % 2 ? r * 0.45 : r;
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py);
  }
  ctx.closePath();
}

/**
 * Draw one constellation into a canvas sized by CSS (or its width/height attributes).
 * opts: { lit (number of lit stars), complete, locked, progress (0..1, for the line-draw animation) }
 */
export function paintConstellation(canvas, c, opts = {}) {
  if (!canvas || !canvas.getContext || !c) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
  const w = canvas.clientWidth || canvas.width, h = canvas.clientHeight || canvas.height;
  if (canvas.width !== Math.round(w * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const lit = opts.locked ? 0 : Math.max(0, Math.min(c.stars.length, opts.lit | 0));
  const progress = opts.progress == null ? 1 : Math.max(0, Math.min(1, opts.progress));
  const pad = Math.min(w, h) * 0.1;
  const box = Math.min(w, h) - pad * 2;
  const ox = (w - box) / 2, oy = (h - box) / 2;
  const P = (s) => [ox + (s.x / 100) * box, oy + (s.y / 100) * box];
  const unit = box / 100;

  if (opts.complete) {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, box * 0.62);
    g.addColorStop(0, 'rgba(255,213,74,0.16)');
    g.addColorStop(1, 'rgba(255,213,74,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  // lines between two lit stars (drawn in order; progress < 1 draws them in one by one)
  ctx.strokeStyle = LINE;
  ctx.lineWidth = Math.max(1, unit * 1.1);
  ctx.lineCap = 'round';
  const shown = c.lines.filter(([a, b]) => a < lit && b < lit);
  const span = shown.length * progress;
  shown.forEach(([a, b], i) => {
    const f = Math.max(0, Math.min(1, span - i));
    if (f <= 0) return;
    const [x1, y1] = P(c.stars[a]);
    const [x2, y2] = P(c.stars[b]);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 + (x2 - x1) * f, y1 + (y2 - y1) * f);
    ctx.stroke();
  });

  c.stars.forEach((s, i) => {
    const [x, y] = P(s);
    if (i < lit) {
      const r = unit * (2.6 + s.b * 0.9);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.2);
      g.addColorStop(0, 'rgba(255,213,74,0.55)');
      g.addColorStop(1, 'rgba(255,213,74,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r * 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = GOLD;
      starPath(ctx, x, y, r);
      ctx.fill();
    } else {
      ctx.globalAlpha = opts.locked ? 0.22 : 0.45;
      ctx.fillStyle = DIM;
      ctx.beginPath(); ctx.arc(x, y, Math.max(1.2, unit * (0.9 + s.b * 0.35)), 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
  });
}

/** Draw with the lines growing in over ~1.2 s (or at once when motion is reduced). */
export function animateConstellation(canvas, c, opts = {}, reduced = false) {
  if (reduced || typeof requestAnimationFrame !== 'function' || typeof performance === 'undefined') {
    paintConstellation(canvas, c, { ...opts, progress: 1 });
    return;
  }
  const t0 = performance.now();
  const step = (now) => {
    if (!canvas.isConnected) return;
    const p = Math.min(1, (now - t0) / 1200);
    paintConstellation(canvas, c, { ...opts, progress: 1 - (1 - p) * (1 - p) });
    if (p < 1) requestAnimationFrame(step);
  };
  paintConstellation(canvas, c, { ...opts, progress: 0 });
  requestAnimationFrame(step);
}
