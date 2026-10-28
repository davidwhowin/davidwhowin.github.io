// The café at night (wind-down "Evening calm", src/meta/windDown.js). Presentation only.
// - gradeNight: run ONCE when an area is baked at night (cafeArt.renderArea keys its cache on the night flag): the area is
//   dimmed and warmed with less blue, then every light it painted (windows, lamps, lanterns) is drawn again as amber
//   lantern light, so the windows glow. Nothing here runs per frame.
// - paintNightSky: per frame, one multiply wash over the visible backdrop (a dusk sky and a darker bay) plus a few seeded
//   stars and a soft moon. Two fills and ~40 dots: cheap on a phone.
import { mulberry32 } from './rng.js';

const TAU = Math.PI * 2;
/** Multiply colour for the baked areas: about 62% red, 52% green, 44% blue (warmer and dimmer, reduced blue). */
const AREA_MULT = 'rgb(160,132,112)';
const AMBER = [255, 178, 92];

let maskCanvas = null;
function scratch(w, h) {
  if (!maskCanvas) maskCanvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : document.createElement('canvas');
  if (maskCanvas.width !== w) maskCanvas.width = w;
  if (maskCanvas.height !== h) maskCanvas.height = h;
  return maskCanvas;
}

/**
 * Grade a freshly baked area canvas (device px). lights: [[DOMMatrix, x, y, r, col, a], ...] recorded by cafeArt's glow().
 * Keeps the area's own transparency (the multiply is masked back to the painted pixels).
 */
export function gradeNight(g, W, H, lights) {
  const cv = g.canvas;
  const m = scratch(W, H);
  const mg = m.getContext('2d');
  mg.setTransform(1, 0, 0, 1, 0, 0); mg.clearRect(0, 0, W, H); mg.drawImage(cv, 0, 0);
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = AREA_MULT; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'destination-in';
  g.drawImage(m, 0, 0); // the multiply painted the empty pixels too: keep only the area's own shape
  // lantern light: each recorded glow again, amber, a little larger, added on top
  g.globalCompositeOperation = 'lighter';
  for (const [mx, x, y, r, , a] of lights) {
    g.setTransform(mx);
    const rr = r * 1.25;
    const gr = g.createRadialGradient(x, y, 0, x, y, rr);
    const k = Math.min(0.75, a * 1.1);
    gr.addColorStop(0, `rgba(${AMBER[0]},${AMBER[1]},${AMBER[2]},${k})`);
    gr.addColorStop(0.45, `rgba(${AMBER[0]},${AMBER[1] - 20},${AMBER[2] - 30},${k * 0.45})`);
    gr.addColorStop(1, 'rgba(255,150,70,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill();
  }
  g.restore();
}

let skyGrad = null, skyCtx = null;
/** Per-frame dusk over the backdrop (world units; view = { x0, y0, x1, y1 }). Call after paintBackdrop / paintWater. */
export function paintNightSky(ctx, view, { t = 0, reduced = false, horizon = -150 } = {}) {
  const { x0, y0, x1, y1 } = view;
  if (skyCtx !== ctx || !skyGrad) {
    // world-space gradient, built once per context
    skyGrad = ctx.createLinearGradient(0, -1800, 0, 900);
    skyGrad.addColorStop(0, 'rgb(58,52,92)');                         // deep dusk overhead
    skyGrad.addColorStop((-700 + 1800) / 2700, 'rgb(118,92,126)');    // mauve
    skyGrad.addColorStop((horizon + 1800) / 2700, 'rgb(214,150,120)'); // the last warm band at the horizon
    skyGrad.addColorStop((horizon + 40 + 1800) / 2700, 'rgb(112,100,118)'); // the bay
    skyGrad.addColorStop(1, 'rgb(84,76,96)');
    skyCtx = ctx;
  }
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = skyGrad; ctx.fillRect(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4);
  ctx.globalCompositeOperation = 'source-over';
  // a few stars above the hills (seeded: the same sky every night)
  if (y0 < horizon - 200) {
    const r = mulberry32(0x5eed1e);
    ctx.fillStyle = '#fff3d8';
    for (let i = 0; i < 90; i++) {
      const sx = -3000 + r() * 14000, sy = -1500 + r() * 1150, s = 1.6 + r() * 2.2, ph = r() * TAU;
      if (sx < x0 - 6 || sx > x1 + 6 || sy < y0 - 6 || sy > y1 + 6) continue;
      ctx.globalAlpha = (0.45 + 0.35 * r()) * (reduced ? 1 : 0.75 + 0.25 * Math.sin(t * 0.9 + ph));
      ctx.beginPath(); ctx.arc(sx, sy, s, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}
