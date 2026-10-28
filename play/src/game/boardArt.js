// Board skins (DESIGN.md "Board skins"): the look of the play grid the renderer draws. Presentation only:
// a board skin never changes the layout, hit areas, rules, scores or ads.
//
// Every skin has the same parts: a frame + fill (`base`), lane dividers + slot markers (`marks`), the aimed-column
// highlight colour, a danger-line style and an optional subtle idle animation. `base` and `marks` are painted once
// into offscreen layers (per skin, cell size and pixel ratio) and drawn with 2 drawImage calls a frame; the idle
// motion is 0–2 more drawImage calls and stops under Calm / reduced motion. Art randomness uses its own seeded
// stream ('board:' + id), never the game RNG.
//
// Readability rules every skin keeps (35–65+ audience; the v3 Driftwood tray is the one light exception, see its note): the play fill stays dark (lightness about 25% or less) so
// every orb skin, number badge and shape symbol reads on it; columns stay marked at least as clearly as on Nova; the
// danger line keeps its red family and gets a dark backing stroke on lighter boards.
import { mulberry32, hashString } from './rng.js';
import { drawOrb, orbRadiusFactor } from './orbArt.js';
import { BOARD_LOOKS, DEFAULT_BOARD } from '../meta/looks.js';

export const DEFAULT_BOARD_SKIN = DEFAULT_BOARD;
const TAU = Math.PI * 2;

// ------------------------------------------------------------------ helpers

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
  return c;
}

function rr(g, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function sparkle(g, x, y, s) {
  g.beginPath();
  g.moveTo(x, y - s); g.lineTo(x + s * 0.25, y - s * 0.25); g.lineTo(x + s, y); g.lineTo(x + s * 0.25, y + s * 0.25);
  g.lineTo(x, y + s); g.lineTo(x - s * 0.25, y + s * 0.25); g.lineTo(x - s, y); g.lineTo(x - s * 0.25, y - s * 0.25);
  g.closePath(); g.fill();
}

const laneX = (G, c) => G.cx + c * G.cell;
const rowY = (G, r) => G.cy + r * G.cell;
const cellCX = (G, c) => G.cx + (c + 0.5) * G.cell;
const cellCY = (G, r) => G.cy + (r + 0.5) * G.cell;

// ------------------------------------------------------------------ skins
// G (layer coords): px, py, pw, ph = the panel (board + pad); cx, cy = first cell's top-left; cell, cols, rows, pad.

const nova = {
  base(g, G) {
    g.save();
    rr(g, G.px, G.py, G.pw, G.ph, G.cell * 0.28);
    const gr = g.createLinearGradient(0, G.cy, 0, G.cy + G.rows * G.cell);
    gr.addColorStop(0, 'rgba(36,26,96,0.55)');
    gr.addColorStop(1, 'rgba(18,12,58,0.72)');
    g.fillStyle = gr;
    g.shadowColor = 'rgba(120,80,255,0.35)';
    g.shadowBlur = 24;
    g.fill();
    g.shadowBlur = 0;
    g.strokeStyle = 'rgba(160,140,255,0.28)';
    g.lineWidth = 1.5;
    g.stroke();
    g.restore();
  },
  marks(g, G) {
    g.fillStyle = 'rgba(180,170,255,0.10)';
    for (let r = 0; r < G.rows; r++) for (let c = 0; c < G.cols; c++) {
      g.beginPath(); g.arc(cellCX(G, c), cellCY(G, r), G.cell * 0.07, 0, TAU); g.fill();
    }
    g.strokeStyle = 'rgba(160,140,255,0.07)';
    g.lineWidth = 1;
    for (let c = 1; c < G.cols; c++) {
      const x = laneX(G, c) + 0.5;
      g.beginPath(); g.moveTo(x, G.cy + 6); g.lineTo(x, G.cy + G.rows * G.cell - 6); g.stroke();
    }
  },
  aim: ['rgba(160,200,255,0.16)', 'rgba(160,200,255,0.04)'],
  danger: { dash: [6, 6], hot: [255, 80, 110], cold: 'rgba(255,120,150,0.22)', width: 2 },
};

const starglass = {
  base(g, G, rng) {
    g.save();
    rr(g, G.px, G.py, G.pw, G.ph, G.cell * 0.3);
    const gr = g.createLinearGradient(0, G.py, 0, G.py + G.ph);
    gr.addColorStop(0, 'rgba(22,44,86,0.82)');
    gr.addColorStop(1, 'rgba(8,16,42,0.9)');
    g.fillStyle = gr;
    g.shadowColor = 'rgba(110,200,255,0.32)';
    g.shadowBlur = 22;
    g.fill();
    g.shadowBlur = 0;
    g.clip();
    // frosted sheen from the top-left corner
    const sh = g.createLinearGradient(G.px, G.py, G.px + G.pw * 0.7, G.py + G.ph * 0.5);
    sh.addColorStop(0, 'rgba(200,240,255,0.2)');
    sh.addColorStop(0.45, 'rgba(200,240,255,0.04)');
    sh.addColorStop(1, 'rgba(200,240,255,0)');
    g.fillStyle = sh; g.fillRect(G.px, G.py, G.pw, G.ph);
    // cut-glass facets: a few faint diagonal light bands
    for (let i = 0; i < 3; i++) {
      const x0 = G.px + G.pw * (0.12 + i * 0.34 + rng() * 0.08), w = G.cell * (0.3 + rng() * 0.5);
      g.fillStyle = `rgba(190,235,255,${0.035 + rng() * 0.025})`;
      g.beginPath();
      g.moveTo(x0, G.py); g.lineTo(x0 + w, G.py); g.lineTo(x0 + w - G.ph * 0.45, G.py + G.ph); g.lineTo(x0 - G.ph * 0.45, G.py + G.ph);
      g.closePath(); g.fill();
    }
    // star flecks and a few small four-point stars set in the glass
    for (let i = 0; i < 80; i++) {
      g.globalAlpha = 0.14 + rng() * 0.26;
      g.fillStyle = rng() < 0.3 ? '#bfe8ff' : '#ffffff';
      const s = 0.5 + rng() * 1;
      g.fillRect(G.px + rng() * G.pw, G.py + rng() * G.ph, s, s);
    }
    g.fillStyle = '#e6f7ff';
    for (let i = 0; i < 7; i++) {
      g.globalAlpha = 0.18 + rng() * 0.16;
      sparkle(g, G.px + G.pw * (0.08 + rng() * 0.84), G.py + G.ph * (0.06 + rng() * 0.88), G.cell * (0.05 + rng() * 0.05));
    }
    g.globalAlpha = 1;
    // bevel: a bright band just inside the top edge
    const bev = g.createLinearGradient(0, G.py, 0, G.py + G.cell * 0.35);
    bev.addColorStop(0, 'rgba(220,245,255,0.16)');
    bev.addColorStop(1, 'rgba(220,245,255,0)');
    g.fillStyle = bev; g.fillRect(G.px, G.py, G.pw, G.cell * 0.35);
    g.restore();
    // double rim: a thick luminous ice edge that fades down the sides, and a fine inner bevel
    g.save();
    rr(g, G.px + 1.25, G.py + 1.25, G.pw - 2.5, G.ph - 2.5, G.cell * 0.3);
    const rim = g.createLinearGradient(0, G.py, 0, G.py + G.ph);
    rim.addColorStop(0, 'rgba(235,252,255,0.95)');
    rim.addColorStop(0.3, 'rgba(160,225,255,0.62)');
    rim.addColorStop(1, 'rgba(110,180,255,0.48)');
    g.shadowColor = 'rgba(140,220,255,0.6)'; g.shadowBlur = 8;
    g.strokeStyle = rim; g.lineWidth = 2.5; g.stroke();
    g.shadowBlur = 0;
    rr(g, G.px + 4.5, G.py + 4.5, G.pw - 9, G.ph - 9, G.cell * 0.26);
    g.strokeStyle = 'rgba(190,240,255,0.26)'; g.lineWidth = 1; g.stroke();
    g.restore();
  },
  marks(g, G) {
    g.strokeStyle = 'rgba(150,220,255,0.11)';
    g.lineWidth = 1;
    for (let c = 1; c < G.cols; c++) {
      const x = laneX(G, c) + 0.5;
      g.beginPath(); g.moveTo(x, G.cy + 4); g.lineTo(x, G.cy + G.rows * G.cell - 4); g.stroke();
    }
    g.fillStyle = 'rgba(200,240,255,0.26)';
    for (let c = 1; c < G.cols; c++) for (let r = 1; r < G.rows; r++) sparkle(g, laneX(G, c) + 0.5, rowY(G, r), G.cell * 0.06);
    g.fillStyle = 'rgba(170,230,255,0.10)';
    for (let r = 0; r < G.rows; r++) for (let c = 0; c < G.cols; c++) {
      g.beginPath(); g.arc(cellCX(G, c), cellCY(G, r), G.cell * 0.06, 0, TAU); g.fill();
    }
  },
  // a soft glint sweeps across the glass every 7 s
  idle(ctx, G, t) {
    const per = 7, k = (t % per) / 1.8;
    if (k >= 1) return;
    const x = G.px - G.pw * 0.4 + k * G.pw * 1.8;
    const gr = ctx.createLinearGradient(x - G.cell, G.py, x + G.cell, G.py + G.cell * 0.6);
    gr.addColorStop(0, 'rgba(200,240,255,0)');
    gr.addColorStop(0.5, 'rgba(200,240,255,0.09)');
    gr.addColorStop(1, 'rgba(200,240,255,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(G.px, G.py, G.pw, G.ph);
  },
  aim: ['rgba(150,225,255,0.18)', 'rgba(150,225,255,0.04)'],
  danger: { dash: [8, 5], hot: [255, 90, 125], cold: 'rgba(255,140,170,0.32)', width: 2, backing: 'rgba(4,10,30,0.55)' },
};

const velvet = {
  base(g, G, rng) {
    g.save();
    rr(g, G.px, G.py, G.pw, G.ph, G.cell * 0.3);
    const gr = g.createLinearGradient(0, G.py, 0, G.py + G.ph);
    gr.addColorStop(0, 'rgba(66,22,92,0.92)');
    gr.addColorStop(1, 'rgba(30,10,52,0.95)');
    g.fillStyle = gr;
    g.shadowColor = 'rgba(220,90,200,0.34)';
    g.shadowBlur = 22;
    g.fill();
    g.shadowBlur = 0;
    g.save();
    g.clip();
    // nebula clouds woven into the velvet
    const cols = ['255,110,200', '150,110,255', '80,170,255', '255,150,120', '120,220,230'];
    for (let i = 0; i < 7; i++) {
      const x = G.px + rng() * G.pw, y = G.py + rng() * G.ph, r = G.cell * (1.4 + rng() * 1.8);
      const rg = g.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, `rgba(${cols[i % cols.length]},${0.16 + rng() * 0.08})`);
      rg.addColorStop(0.55, `rgba(${cols[i % cols.length]},0.05)`);
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = rg; g.fillRect(G.px, G.py, G.pw, G.ph);
    }
    // a scatter of tiny embroidered stars
    for (let i = 0; i < 34; i++) {
      g.globalAlpha = 0.18 + rng() * 0.3;
      g.fillStyle = rng() < 0.4 ? '#ffd9a0' : '#ffe8ff';
      const s = 0.6 + rng() * 1;
      g.fillRect(G.px + rng() * G.pw, G.py + rng() * G.ph, s, s);
    }
    g.globalAlpha = 1;
    // velvet nap: darker toward the padded edge
    const v = g.createRadialGradient(G.px + G.pw / 2, G.py + G.ph / 2, Math.min(G.pw, G.ph) * 0.3, G.px + G.pw / 2, G.py + G.ph / 2, Math.max(G.pw, G.ph) * 0.62);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(8,0,16,0.38)');
    g.fillStyle = v; g.fillRect(G.px, G.py, G.pw, G.ph);
    g.restore();
    // padded rim (lit from above) with a gold piping
    rr(g, G.px + 3, G.py + 3, G.pw - 6, G.ph - 6, G.cell * 0.28);
    const pad = g.createLinearGradient(0, G.py, 0, G.py + G.ph);
    pad.addColorStop(0, 'rgba(170,80,170,0.95)'); pad.addColorStop(0.5, 'rgba(120,44,128,0.9)'); pad.addColorStop(1, 'rgba(84,26,96,0.9)');
    g.strokeStyle = pad; g.lineWidth = 6; g.stroke();
    rr(g, G.px + 6.5, G.py + 6.5, G.pw - 13, G.ph - 13, G.cell * 0.25);
    const gold = g.createLinearGradient(0, G.py, 0, G.py + G.ph);
    gold.addColorStop(0, 'rgba(255,228,160,0.95)'); gold.addColorStop(1, 'rgba(214,160,80,0.8)');
    g.strokeStyle = gold; g.lineWidth = 1.6; g.stroke();
    rr(g, G.px + 0.5, G.py + 0.5, G.pw - 1, G.ph - 1, G.cell * 0.3);
    g.strokeStyle = 'rgba(255,170,230,0.35)'; g.lineWidth = 1; g.stroke();
    g.restore();
  },
  marks(g, G) {
    for (let c = 1; c < G.cols; c++) {
      const x = laneX(G, c);
      g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(x, G.cy + 6); g.lineTo(x, G.cy + G.rows * G.cell - 6); g.stroke();
      g.strokeStyle = 'rgba(255,170,240,0.09)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(x + 1.5, G.cy + 6); g.lineTo(x + 1.5, G.cy + G.rows * G.cell - 6); g.stroke();
    }
    g.fillStyle = 'rgba(255,190,240,0.11)';
    for (let r = 0; r < G.rows; r++) for (let c = 0; c < G.cols; c++) {
      g.beginPath(); g.arc(cellCX(G, c), cellCY(G, r), G.cell * 0.065, 0, TAU); g.fill();
    }
  },
  // a soft nebula glow drifts very slowly through the velvet
  idleLayer(G, dpr, rng) {
    const s = Math.round(G.cell * 3);
    const c = makeCanvas(s * dpr, s * dpr);
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    const rg = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    rg.addColorStop(0, 'rgba(255,140,220,0.16)');
    rg.addColorStop(0.5, 'rgba(160,120,255,0.07)');
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg; g.fillRect(0, 0, s, s);
    void rng;
    return { canvas: c, size: s };
  },
  idle(ctx, G, t, layer) {
    const s = layer.size;
    const x = G.px + G.pw * (0.5 + 0.32 * Math.sin(t * 0.11)) - s / 2;
    const y = G.py + G.ph * (0.5 + 0.3 * Math.sin(t * 0.07 + 1.3)) - s / 2;
    ctx.drawImage(layer.canvas, x, y, s, s);
  },
  aim: ['rgba(255,190,240,0.16)', 'rgba(255,190,240,0.04)'],
  danger: { dash: [7, 5], hot: [255, 90, 130], cold: 'rgba(255,150,190,0.32)', width: 2, backing: 'rgba(16,0,24,0.55)' },
};

function brassStroke(g, x0, y0, x1, y1) {
  const b = g.createLinearGradient(x0, y0, x1, y1);
  b.addColorStop(0, '#6b4a1c'); b.addColorStop(0.2, '#e8c27a'); b.addColorStop(0.45, '#8a6224');
  b.addColorStop(0.7, '#f3d58f'); b.addColorStop(1, '#6b4a1c');
  return b;
}

function rivet(g, x, y, r) {
  const rg = g.createRadialGradient(x - r * 0.35, y - r * 0.35, 0, x, y, r);
  rg.addColorStop(0, '#fff2c8'); rg.addColorStop(0.45, '#d9ad5c'); rg.addColorStop(1, '#5a3c12');
  g.fillStyle = rg;
  g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
}

const brass = {
  base(g, G, rng) {
    g.save();
    rr(g, G.px, G.py, G.pw, G.ph, G.cell * 0.22);
    const gr = g.createLinearGradient(0, G.py, 0, G.py + G.ph);
    gr.addColorStop(0, 'rgba(12,22,48,0.92)');
    gr.addColorStop(1, 'rgba(6,10,28,0.95)');
    g.fillStyle = gr;
    g.shadowColor = 'rgba(255,200,110,0.22)';
    g.shadowBlur = 18;
    g.fill();
    g.shadowBlur = 0;
    g.save();
    g.clip();
    // star chart: declination circles and hour spokes around the board centre
    const mx = G.px + G.pw / 2, my = G.py + G.ph / 2;
    g.strokeStyle = 'rgba(225,190,120,0.075)';
    g.lineWidth = 1;
    for (let i = 1; i <= 5; i++) { g.beginPath(); g.arc(mx, my, G.cell * 1.15 * i, 0, TAU); g.stroke(); }
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      g.beginPath(); g.moveTo(mx + Math.cos(a) * G.cell * 1.15, my + Math.sin(a) * G.cell * 1.15);
      g.lineTo(mx + Math.cos(a) * G.ph, my + Math.sin(a) * G.ph); g.stroke();
    }
    // a few charted stars joined into two faint constellations
    for (let k = 0; k < 2; k++) {
      const pts = [];
      let x = G.px + G.pw * (0.15 + rng() * 0.3) + k * G.pw * 0.4, y = G.py + G.ph * (0.12 + rng() * 0.7);
      for (let i = 0; i < 5; i++) { pts.push([x, y]); x += (rng() - 0.3) * G.cell * 0.9; y += (rng() - 0.5) * G.cell * 1.1; }
      g.strokeStyle = 'rgba(240,215,160,0.1)'; g.beginPath();
      pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py))); g.stroke();
      g.fillStyle = 'rgba(255,235,190,0.3)';
      for (const [px, py] of pts) { g.beginPath(); g.arc(px, py, 1.3, 0, TAU); g.fill(); }
    }
    g.restore();
    // brass frame: drawn inside the panel edge so it never reaches past the old board outline
    const fw = Math.max(5, G.pad * 0.9);
    rr(g, G.px + fw / 2, G.py + fw / 2, G.pw - fw, G.ph - fw, G.cell * 0.2);
    g.strokeStyle = brassStroke(g, G.px, G.py, G.px + G.pw, G.py + G.ph); g.lineWidth = fw; g.stroke();
    rr(g, G.px + 0.5, G.py + 0.5, G.pw - 1, G.ph - 1, G.cell * 0.22);
    g.strokeStyle = 'rgba(50,30,6,0.9)'; g.lineWidth = 1; g.stroke();
    rr(g, G.px + fw + 0.5, G.py + fw + 0.5, G.pw - fw * 2 - 1, G.ph - fw * 2 - 1, G.cell * 0.16);
    g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 1; g.stroke();
    // rivets on the corners and the middle of each side
    const rv = Math.max(1.6, fw * 0.3), o = fw / 2;
    for (const [x, y] of [[G.px + o + 2, G.py + o + 2], [G.px + G.pw - o - 2, G.py + o + 2], [G.px + o + 2, G.py + G.ph - o - 2], [G.px + G.pw - o - 2, G.py + G.ph - o - 2],
      [G.px + G.pw / 2, G.py + o], [G.px + G.pw / 2, G.py + G.ph - o], [G.px + o, G.py + G.ph / 2], [G.px + G.pw - o, G.py + G.ph / 2]]) rivet(g, x, y, rv);
    g.restore();
  },
  marks(g, G) {
    g.strokeStyle = 'rgba(230,195,120,0.14)';
    g.lineWidth = 1;
    for (let c = 1; c < G.cols; c++) {
      const x = laneX(G, c) + 0.5;
      g.beginPath(); g.moveTo(x, G.cy + 4); g.lineTo(x, G.cy + G.rows * G.cell - 4); g.stroke();
    }
    // graduation ticks where the lanes cross the rows
    g.strokeStyle = 'rgba(240,205,135,0.28)';
    for (let c = 1; c < G.cols; c++) for (let r = 1; r < G.rows; r++) {
      const x = laneX(G, c) + 0.5, y = rowY(G, r) + 0.5;
      g.beginPath(); g.moveTo(x - 3, y); g.lineTo(x + 3, y); g.stroke();
    }
    // slot markers: tiny sighting crosses
    g.strokeStyle = 'rgba(240,210,150,0.13)';
    const s = G.cell * 0.065;
    for (let r = 0; r < G.rows; r++) for (let c = 0; c < G.cols; c++) {
      const x = cellCX(G, c), y = cellCY(G, r);
      g.beginPath(); g.moveTo(x - s, y); g.lineTo(x + s, y); g.moveTo(x, y - s); g.lineTo(x, y + s); g.stroke();
    }
  },
  // an astrolabe ring turns very slowly behind the pieces
  idleLayer(G, dpr) {
    const R = Math.min(G.pw, G.ph) * 0.46, s = Math.ceil(R * 2 + 4);
    const c = makeCanvas(s * dpr, s * dpr);
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    const m = s / 2;
    g.strokeStyle = 'rgba(240,205,135,0.5)'; g.lineWidth = 1;
    g.beginPath(); g.arc(m, m, R, 0, TAU); g.stroke();
    g.beginPath(); g.arc(m, m, R - 6, 0, TAU); g.stroke();
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * TAU, l = i % 6 === 0 ? 6 : 3;
      g.beginPath(); g.moveTo(m + Math.cos(a) * R, m + Math.sin(a) * R); g.lineTo(m + Math.cos(a) * (R - l), m + Math.sin(a) * (R - l)); g.stroke();
    }
    return { canvas: c, size: s };
  },
  idle(ctx, G, t, layer) {
    ctx.save();
    ctx.globalAlpha *= 0.22;
    ctx.translate(G.px + G.pw / 2, G.py + G.ph / 2);
    ctx.rotate(t * 0.025);
    ctx.drawImage(layer.canvas, -layer.size / 2, -layer.size / 2, layer.size, layer.size);
    ctx.restore();
  },
  aim: ['rgba(255,220,150,0.15)', 'rgba(255,220,150,0.035)'],
  danger: { dash: [7, 5], hot: [255, 95, 90], cold: 'rgba(255,150,130,0.34)', width: 2, backing: 'rgba(0,0,0,0.5)' },
};

// --- Sushi Bar: a hinoki geta board. Five planks (one per column), a lighter hinoki rim and two little feet.
const geta = {
  base(g, G, rng) {
    const R = G.cell * 0.22;
    g.save();
    // geta feet peeking out under the board
    for (const [a, b] of [[0.12, 0.3], [0.7, 0.88]]) {
      const x = G.px + G.pw * a, w = G.pw * (b - a), y = G.py + G.ph - 4, h = Math.max(6, G.pad * 1.3) + 4;
      rr(g, x, y, w, h, 2.5);
      const fg = g.createLinearGradient(0, y, 0, y + h);
      fg.addColorStop(0, '#6b4024'); fg.addColorStop(1, '#3a2010');
      g.fillStyle = fg; g.fill();
    }
    // rim: light hinoki
    rr(g, G.px, G.py, G.pw, G.ph, R);
    const rim = g.createLinearGradient(0, G.py, 0, G.py + G.ph);
    rim.addColorStop(0, '#d39a62'); rim.addColorStop(1, '#a8693a');
    g.fillStyle = rim;
    g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 14; g.shadowOffsetY = 3;
    g.fill();
    g.shadowColor = 'transparent'; g.shadowBlur = 0; g.shadowOffsetY = 0;
    g.save(); g.clip();
    g.strokeStyle = 'rgba(120,64,24,0.22)'; g.lineWidth = 1;
    for (let y = G.py + 2; y < G.py + G.ph; y += 2.6 + rng() * 2.2) {
      g.beginPath(); g.moveTo(G.px, y);
      for (let x = G.px; x <= G.px + G.pw; x += 12) g.lineTo(x, y + Math.sin(x * 0.05 + y) * 0.8);
      g.stroke();
    }
    g.restore();
    g.strokeStyle = '#5a361b'; g.lineWidth = 1.25; g.stroke();
    rr(g, G.px + 1.5, G.py + 1.2, G.pw - 3, G.ph - 3, R - 1);
    g.strokeStyle = 'rgba(255,236,205,0.45)'; g.lineWidth = 1; g.stroke();
    // inner playing surface: darker cedar planks, recessed
    const ins = Math.max(4, G.pad * 0.8);
    const ix = G.px + ins, iy = G.py + ins, iw = G.pw - ins * 2, ih = G.ph - ins * 2;
    rr(g, ix, iy, iw, ih, R * 0.6);
    const pf = g.createLinearGradient(0, iy, 0, iy + ih);
    pf.addColorStop(0, '#5a3820'); pf.addColorStop(1, '#45291a');
    g.fillStyle = pf; g.fill();
    g.save(); g.clip();
    for (let c = 0; c < G.cols; c++) {
      const x0 = c === 0 ? ix : laneX(G, c), x1 = c === G.cols - 1 ? ix + iw : laneX(G, c + 1);
      // each plank a touch different
      g.fillStyle = `rgba(${rng() < 0.5 ? '255,200,150' : '20,8,0'},${0.03 + rng() * 0.04})`;
      g.fillRect(x0, iy, x1 - x0, ih);
      // long grain running down the plank
      for (let k = 0; k < 7; k++) {
        const gx = x0 + 3 + rng() * (x1 - x0 - 6), ph = rng() * TAU, amp = 0.6 + rng() * 1.4;
        g.strokeStyle = rng() < 0.65 ? `rgba(28,12,2,${0.16 + rng() * 0.14})` : `rgba(255,214,170,${0.05 + rng() * 0.05})`;
        g.lineWidth = 0.6 + rng() * 0.8;
        g.beginPath(); g.moveTo(gx, iy);
        for (let y = iy; y <= iy + ih; y += 8) g.lineTo(gx + Math.sin(y * 0.03 + ph) * amp, y);
        g.stroke();
      }
      if (rng() < 0.5) { // a soft knot
        const kx = x0 + (x1 - x0) * (0.3 + rng() * 0.4), ky = iy + ih * (0.15 + rng() * 0.7);
        g.strokeStyle = 'rgba(30,12,2,0.22)'; g.lineWidth = 0.8;
        for (let i = 1; i <= 3; i++) { g.beginPath(); g.ellipse(kx, ky, 1.6 * i, 3.4 * i, 0, 0, TAU); g.stroke(); }
      }
    }
    // recess shadow under the rim
    const sh = g.createLinearGradient(0, iy, 0, iy + 9);
    sh.addColorStop(0, 'rgba(0,0,0,0.42)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = sh; g.fillRect(ix, iy, iw, 9);
    g.restore();
    rr(g, ix, iy, iw, ih, R * 0.6);
    g.strokeStyle = 'rgba(40,18,4,0.7)'; g.lineWidth = 1; g.stroke();
    g.restore();
  },
  marks(g, G) {
    // plank seams: a dark groove with a light bevel = the column dividers
    const top = G.cy - G.pad * 0.2, bot = G.cy + G.rows * G.cell + G.pad * 0.2;
    for (let c = 1; c < G.cols; c++) {
      const x = laneX(G, c);
      g.strokeStyle = 'rgba(22,9,2,0.62)'; g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(x, top); g.lineTo(x, bot); g.stroke();
      g.strokeStyle = 'rgba(255,215,170,0.13)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(x + 1.5, top); g.lineTo(x + 1.5, bot); g.stroke();
    }
    // slot markers: a single sesame seed per cell
    g.fillStyle = 'rgba(255,232,196,0.16)';
    for (let r = 0; r < G.rows; r++) for (let c = 0; c < G.cols; c++) {
      g.beginPath(); g.ellipse(cellCX(G, c), cellCY(G, r), G.cell * 0.035, G.cell * 0.06, 0.5, 0, TAU); g.fill();
    }
  },
  aim: ['rgba(255,232,190,0.15)', 'rgba(255,232,190,0.04)'],
  // a red lacquer cord on a dark backing so it reads on the warm wood
  danger: { dash: [9, 5], hot: [240, 50, 60], cold: 'rgba(235,80,80,0.6)', width: 2.4, backing: 'rgba(30,10,2,0.7)' },
};

// --- Koi Pond: a stone-edged basin full of dark water with drifting caustics.
const basin = {
  base(g, G, rng) {
    const R = G.cell * 0.3;
    g.save();
    rr(g, G.px, G.py, G.pw, G.ph, R);
    g.fillStyle = '#353c43';
    g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 14; g.shadowOffsetY = 3;
    g.fill();
    g.shadowColor = 'transparent'; g.shadowBlur = 0; g.shadowOffsetY = 0;
    // water
    const ins = Math.max(4.5, G.pad * 0.85);
    const ix = G.px + ins, iy = G.py + ins, iw = G.pw - ins * 2, ih = G.ph - ins * 2;
    rr(g, ix, iy, iw, ih, R * 0.7);
    const wg = g.createLinearGradient(0, iy, 0, iy + ih);
    wg.addColorStop(0, '#11404f'); wg.addColorStop(0.6, '#0b2f3c'); wg.addColorStop(1, '#07222d');
    g.fillStyle = wg; g.fill();
    g.save(); g.clip();
    // pebbles faintly visible on the floor
    for (let i = 0; i < 40; i++) {
      g.fillStyle = `rgba(${rng() < 0.5 ? '120,170,170' : '60,100,110'},${0.06 + rng() * 0.06})`;
      g.beginPath(); g.ellipse(ix + rng() * iw, iy + rng() * ih, 2 + rng() * 4, 1.5 + rng() * 2.5, rng() * 3, 0, TAU); g.fill();
    }
    // stones cast a soft shadow into the water
    g.shadowColor = 'rgba(0,0,0,0.7)'; g.shadowBlur = 10;
    g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 6;
    rr(g, ix - 3, iy - 3, iw + 6, ih + 6, R * 0.7 + 3); g.stroke();
    g.restore();
    // stone rim: rounded river stones placed around the edge
    g.save();
    rr(g, G.px - 1, G.py - 1, G.pw + 2, G.ph + 2, R + 1); g.clip();
    const per = 2 * (G.pw + G.ph);
    const pal = ['#7d868e', '#6a737b', '#8d948e', '#5f686f', '#99a09a'];
    const pointAt = (d) => {
      d = ((d % per) + per) % per;
      const m = ins / 2;
      if (d < G.pw) return [G.px + d, G.py + m];
      d -= G.pw; if (d < G.ph) return [G.px + G.pw - m, G.py + d];
      d -= G.ph; if (d < G.pw) return [G.px + G.pw - d, G.py + G.ph - m];
      d -= G.pw; return [G.px + m, G.py + G.ph - d];
    };
    for (let d = 0; d < per;) {
      const s = ins * (0.75 + rng() * 0.55);
      const [x, y] = pointAt(d + s);
      const rx = s * (1.05 + rng() * 0.4), ry = s * (0.8 + rng() * 0.3), rot = rng() * 3;
      g.fillStyle = 'rgba(0,0,0,0.35)';
      g.beginPath(); g.ellipse(x + 0.8, y + 1.2, rx, ry, rot, 0, TAU); g.fill();
      const sg = g.createRadialGradient(x - rx * 0.35, y - ry * 0.45, 0, x, y, Math.max(rx, ry));
      const base = pal[(rng() * pal.length) | 0];
      sg.addColorStop(0, '#c9cfcb'); sg.addColorStop(0.35, base); sg.addColorStop(1, '#3d454b');
      g.fillStyle = sg;
      g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, TAU); g.fill();
      if (rng() < 0.35) { // moss
        g.fillStyle = 'rgba(110,150,80,0.45)';
        g.beginPath(); g.ellipse(x + rx * 0.2, y + ry * 0.35, rx * 0.5, ry * 0.3, rot, 0, TAU); g.fill();
      }
      d += s * 1.55;
    }
    g.restore();
    // waterline glint along the inner edge
    rr(g, ix + 0.5, iy + 0.5, iw - 1, ih - 1, R * 0.7);
    g.strokeStyle = 'rgba(170,240,255,0.28)'; g.lineWidth = 1; g.stroke();
    g.restore();
  },
  marks(g, G) {
    // lane dividers: rising bubble strings
    for (let c = 1; c < G.cols; c++) {
      const x = laneX(G, c);
      for (let y = G.cy + 5, i = 0; y < G.cy + G.rows * G.cell - 4; y += 6.5, i++) {
        g.fillStyle = `rgba(175,240,255,${i % 3 === 0 ? 0.24 : 0.14})`;
        g.beginPath(); g.arc(x + (i % 2 ? 0.6 : -0.6), y, i % 3 === 0 ? 1.4 : 1, 0, TAU); g.fill();
      }
    }
    // slot markers: tiny ripple rings
    g.strokeStyle = 'rgba(170,235,255,0.14)'; g.lineWidth = 1;
    for (let r = 0; r < G.rows; r++) for (let c = 0; c < G.cols; c++) {
      g.beginPath(); g.ellipse(cellCX(G, c), cellCY(G, r), G.cell * 0.08, G.cell * 0.055, 0, 0, TAU); g.stroke();
    }
  },
  // caustic light network: one seamless panel-sized tile painted once, two copies drift slowly (<= 8 drawImage a frame)
  idleLayer(G, dpr, rng) {
    const w = Math.round(G.pw), h = Math.round(G.ph);
    const c = makeCanvas(w * dpr, h * dpr);
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    g.strokeStyle = 'rgba(160,240,255,0.5)';
    g.lineCap = 'round';
    const n = Math.round((w * h) / (G.cell * G.cell) * 3);
    for (let i = 0; i < n; i++) {
      const x = rng() * w, y = rng() * h, r = G.cell * (0.18 + rng() * 0.3), ry = r * (0.6 + rng() * 0.4);
      const rot = rng() * 3, a0 = rng() * 3, a1 = a0 + 1.6 + rng() * 1.6;
      g.lineWidth = 0.8 + rng() * 1.2;
      for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) { // wrap: the tile repeats seamlessly
        if (x + dx + r < 0 || x + dx - r > w || y + dy + r < 0 || y + dy - r > h) continue;
        g.beginPath(); g.ellipse(x + dx, y + dy, r, ry, rot, a0, a1); g.stroke();
      }
    }
    return { canvas: c, w, h };
  },
  idle(ctx, G, t, layer) {
    const { w, h } = layer, ins = Math.max(4.5, G.pad * 0.85);
    ctx.save();
    ctx.beginPath(); ctx.rect(G.px + ins, G.py + ins, G.pw - ins * 2, G.ph - ins * 2); ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha *= 0.08;
    for (const [vx, vy, o] of [[4, 2.5, 0], [-3, 3.6, 0.5]]) {
      const ox = ((t * vx + o * w) % w + w) % w, oy = ((t * vy + o * h) % h + h) % h;
      for (const x of [G.px + ox - w, G.px + ox]) for (const y of [G.py + oy - h, G.py + oy]) ctx.drawImage(layer.canvas, x, y, w, h);
    }
    ctx.restore();
  },
  stillIdle: true, // the caustics also show (frozen) under Calm
  aim: ['rgba(170,240,255,0.16)', 'rgba(170,240,255,0.04)'],
  danger: { dash: [8, 5], hot: [255, 90, 110], cold: 'rgba(255,140,160,0.42)', width: 2.2, backing: 'rgba(0,14,20,0.6)' },
};

// --- Cat Café: a tufted velvet cushion with cream piping; buttons at the grid corners, stitched lanes.
function paw(g, x, y, s) {
  g.beginPath(); g.ellipse(x, y + s * 0.35, s * 0.55, s * 0.45, 0, 0, TAU); g.fill();
  for (const [dx, dy] of [[-0.62, -0.32], [-0.22, -0.72], [0.22, -0.72], [0.62, -0.32]]) {
    g.beginPath(); g.arc(x + dx * s, y + dy * s, s * 0.2, 0, TAU); g.fill();
  }
}

const cushion = {
  base(g, G) {
    const R = G.cell * 0.32;
    g.save();
    // tassels on the two bottom corners
    for (const x of [G.px + R * 0.55, G.px + G.pw - R * 0.55]) {
      const y = G.py + G.ph - R * 0.4;
      g.strokeStyle = '#e8c9a4'; g.lineWidth = 1;
      for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + i * 1.1, y + 11); g.stroke(); }
      g.fillStyle = '#f2dcc0'; g.beginPath(); g.arc(x, y, 2.6, 0, TAU); g.fill();
    }
    // cream piping
    rr(g, G.px, G.py, G.pw, G.ph, R);
    const pg = g.createLinearGradient(0, G.py, 0, G.py + G.ph);
    pg.addColorStop(0, '#f3e1cd'); pg.addColorStop(1, '#d4b597');
    g.fillStyle = pg;
    g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 14; g.shadowOffsetY = 3;
    g.fill();
    g.shadowColor = 'transparent'; g.shadowBlur = 0; g.shadowOffsetY = 0;
    g.strokeStyle = '#9c7861'; g.lineWidth = 1.2; g.stroke();
    // twisted cord hint on the piping
    g.save(); g.clip();
    g.strokeStyle = 'rgba(150,110,80,0.28)'; g.lineWidth = 1;
    for (let d = 0; d < G.pw; d += 4) {
      g.beginPath(); g.moveTo(G.px + d, G.py); g.lineTo(G.px + d + 3, G.py + 4); g.stroke();
      g.beginPath(); g.moveTo(G.px + d, G.py + G.ph - 4); g.lineTo(G.px + d + 3, G.py + G.ph); g.stroke();
    }
    g.restore();
    // velvet fabric
    const ins = Math.max(4, G.pad * 0.75);
    const ix = G.px + ins, iy = G.py + ins, iw = G.pw - ins * 2, ih = G.ph - ins * 2;
    rr(g, ix, iy, iw, ih, R * 0.7);
    const fg = g.createLinearGradient(0, iy, 0, iy + ih);
    fg.addColorStop(0, '#5a2f4a'); fg.addColorStop(1, '#40203a');
    g.fillStyle = fg; g.fill();
    g.save(); g.clip();
    // each cell a soft puff (tufting): lighter centre, deeper toward the buttons
    for (let r = 0; r < G.rows; r++) for (let c = 0; c < G.cols; c++) {
      const x = cellCX(G, c), y = cellCY(G, r);
      const rg = g.createRadialGradient(x - G.cell * 0.1, y - G.cell * 0.12, G.cell * 0.05, x, y, G.cell * 0.72);
      rg.addColorStop(0, 'rgba(255,200,230,0.10)');
      rg.addColorStop(0.6, 'rgba(255,200,230,0.02)');
      rg.addColorStop(1, 'rgba(10,0,8,0.28)');
      g.fillStyle = rg;
      g.fillRect(laneX(G, c), rowY(G, r), G.cell, G.cell);
    }
    const sh = g.createLinearGradient(0, iy, 0, iy + 8);
    sh.addColorStop(0, 'rgba(0,0,0,0.35)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = sh; g.fillRect(ix, iy, iw, 8);
    g.restore();
    g.restore();
  },
  marks(g, G) {
    const top = G.cy + 2, bot = G.cy + G.rows * G.cell - 2;
    g.save();
    // stitched seams: columns clearly, rows faintly
    g.setLineDash([3, 3]);
    g.strokeStyle = 'rgba(255,222,236,0.3)'; g.lineWidth = 1.2;
    for (let c = 1; c < G.cols; c++) { const x = laneX(G, c); g.beginPath(); g.moveTo(x, top); g.lineTo(x, bot); g.stroke(); }
    g.strokeStyle = 'rgba(255,222,236,0.1)'; g.lineWidth = 1;
    for (let r = 1; r < G.rows; r++) { const y = rowY(G, r); g.beginPath(); g.moveTo(G.cx + 3, y); g.lineTo(G.cx + G.cols * G.cell - 3, y); g.stroke(); }
    g.restore();
    // tufting buttons where seams cross
    const br = Math.max(1.8, G.cell * 0.05);
    for (let c = 1; c < G.cols; c++) for (let r = 1; r < G.rows; r++) {
      const x = laneX(G, c), y = rowY(G, r);
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.arc(x + 0.6, y + 0.9, br, 0, TAU); g.fill();
      const bg = g.createRadialGradient(x - br * 0.3, y - br * 0.4, 0, x, y, br);
      bg.addColorStop(0, '#f7d3e2'); bg.addColorStop(1, '#a8708c');
      g.fillStyle = bg; g.beginPath(); g.arc(x, y, br, 0, TAU); g.fill();
    }
    // slot markers: a faint embroidered paw per cell
    g.fillStyle = 'rgba(255,210,232,0.11)';
    for (let r = 0; r < G.rows; r++) for (let c = 0; c < G.cols; c++) paw(g, cellCX(G, c), cellCY(G, r), G.cell * 0.085);
  },
  aim: ['rgba(255,215,235,0.15)', 'rgba(255,215,235,0.04)'],
  danger: { dash: [8, 5], hot: [255, 70, 100], cold: 'rgba(255,120,150,0.5)', width: 2.2, backing: 'rgba(30,6,20,0.65)' },
};

// --- Patisserie: a rose marble pastry tray in a gilded rim; piped-cream lanes and a faint lace doily per slot.
const tray = {
  base(g, G) {
    const R = G.cell * 0.3;
    g.save();
    // gilded rim
    rr(g, G.px, G.py, G.pw, G.ph, R);
    const pg = g.createLinearGradient(0, G.py, 0, G.py + G.ph);
    pg.addColorStop(0, '#ffe7a8'); pg.addColorStop(0.18, '#d8a446'); pg.addColorStop(0.5, '#f4cf7a'); pg.addColorStop(1, '#9a6a24');
    g.fillStyle = pg;
    g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 14; g.shadowOffsetY = 3;
    g.fill();
    g.shadowColor = 'transparent'; g.shadowBlur = 0; g.shadowOffsetY = 0;
    g.strokeStyle = '#6a4414'; g.lineWidth = 1.2; g.stroke();
    // beaded edge on the rim
    g.fillStyle = 'rgba(255,246,214,0.55)';
    const bead = Math.max(1.1, G.pad * 0.16);
    for (let d = R; d < G.pw - R; d += bead * 4) {
      g.beginPath(); g.arc(G.px + d, G.py + G.pad * 0.38, bead, 0, TAU); g.fill();
      g.beginPath(); g.arc(G.px + d, G.py + G.ph - G.pad * 0.38, bead, 0, TAU); g.fill();
    }
    // the marble slab: dusky rose, kept dark so the pastries pop
    const ins = Math.max(4, G.pad * 0.75);
    const ix = G.px + ins, iy = G.py + ins, iw = G.pw - ins * 2, ih = G.ph - ins * 2;
    rr(g, ix, iy, iw, ih, R * 0.7);
    const fg = g.createLinearGradient(ix, iy, ix + iw, iy + ih);
    fg.addColorStop(0, '#4a2a3c'); fg.addColorStop(0.55, '#3a2032'); fg.addColorStop(1, '#2c1828');
    g.fillStyle = fg; g.fill();
    g.save(); g.clip();
    // marble veins (deterministic: a fixed pattern relative to the slab)
    g.lineCap = 'round';
    const veins = [[0.05, 0.1, 0.45, 0.32, 0.9, 0.2], [0.0, 0.55, 0.35, 0.7, 0.75, 0.62], [0.2, 0.95, 0.55, 0.82, 1.0, 0.9], [0.6, 0.0, 0.7, 0.3, 0.95, 0.45]];
    for (const [a, b, c, d, e, f] of veins) {
      for (const [lw, al] of [[4, 0.035], [1, 0.08]]) {
        g.strokeStyle = `rgba(255,214,232,${al})`; g.lineWidth = lw;
        g.beginPath(); g.moveTo(ix + a * iw, iy + b * ih); g.quadraticCurveTo(ix + c * iw, iy + d * ih, ix + e * iw, iy + f * ih); g.stroke();
      }
    }
    const gl = g.createRadialGradient(ix + iw * 0.3, iy + ih * 0.2, 0, ix + iw * 0.3, iy + ih * 0.2, iw * 0.9);
    gl.addColorStop(0, 'rgba(255,220,236,0.08)'); gl.addColorStop(1, 'rgba(255,220,236,0)');
    g.fillStyle = gl; g.fillRect(ix, iy, iw, ih);
    const sh = g.createLinearGradient(0, iy, 0, iy + 8);
    sh.addColorStop(0, 'rgba(0,0,0,0.35)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = sh; g.fillRect(ix, iy, iw, 8);
    g.restore();
    g.restore();
  },
  marks(g, G) {
    const top = G.cy + 3, bot = G.cy + G.rows * G.cell - 3;
    g.save();
    // piped cream lanes: a row of tiny dots down each column line
    g.fillStyle = 'rgba(255,232,242,0.3)';
    const step = Math.max(5, G.cell * 0.16), dr = Math.max(1, G.cell * 0.028);
    for (let c = 1; c < G.cols; c++) {
      const x = laneX(G, c);
      for (let y = top + step / 2; y < bot; y += step) { g.beginPath(); g.arc(x, y, dr, 0, TAU); g.fill(); }
    }
    g.strokeStyle = 'rgba(255,232,242,0.08)'; g.lineWidth = 1;
    for (let r = 1; r < G.rows; r++) { const y = rowY(G, r); g.beginPath(); g.moveTo(G.cx + 3, y); g.lineTo(G.cx + G.cols * G.cell - 3, y); g.stroke(); }
    // slot markers: a faint scalloped lace doily per cell
    g.strokeStyle = 'rgba(255,226,238,0.1)'; g.lineWidth = 1;
    const dRad = G.cell * 0.2, n = 10;
    for (let r = 0; r < G.rows; r++) for (let c = 0; c < G.cols; c++) {
      const x = cellCX(G, c), y = cellCY(G, r);
      g.beginPath();
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * TAU, a1 = ((i + 1) / n) * TAU, am = (a0 + a1) / 2;
        const px = x + Math.cos(a0) * dRad, py = y + Math.sin(a0) * dRad;
        if (!i) g.moveTo(px, py);
        g.quadraticCurveTo(x + Math.cos(am) * dRad * 1.28, y + Math.sin(am) * dRad * 1.28, x + Math.cos(a1) * dRad, y + Math.sin(a1) * dRad);
      }
      g.closePath(); g.stroke();
    }
    g.restore();
  },
  aim: ['rgba(255,220,236,0.15)', 'rgba(255,220,236,0.04)'],
  danger: { dash: [8, 5], hot: [255, 70, 110], cold: 'rgba(255,130,160,0.5)', width: 2.2, backing: 'rgba(34,8,22,0.65)' },
};

// --- Deep Sea: a deep blue glass basin. A thick bevelled glass rim with a cool highlight, dark water inside, a faint
// caustic net drifting across it (re-uses the Koi pond caustic tile; fainter and bluer), clear lanes of tiny pearls.
const abyssGlass = {
  base(g, G, rng) {
    const R = G.cell * 0.3;
    g.save();
    rr(g, G.px, G.py, G.pw, G.ph, R);
    const rim = g.createLinearGradient(0, G.py, 0, G.py + G.ph);
    rim.addColorStop(0, '#2c6c98'); rim.addColorStop(0.5, '#15406a'); rim.addColorStop(1, '#0c2a4c');
    g.fillStyle = rim;
    g.shadowColor = 'rgba(40,150,255,0.35)'; g.shadowBlur = 20;
    g.fill();
    g.shadowColor = 'transparent'; g.shadowBlur = 0;
    // outer glass edge highlight
    g.strokeStyle = 'rgba(170,225,255,0.45)'; g.lineWidth = 1.2; g.stroke();
    const ins = Math.max(4.5, G.pad * 0.85);
    const ix = G.px + ins, iy = G.py + ins, iw = G.pw - ins * 2, ih = G.ph - ins * 2;
    rr(g, ix, iy, iw, ih, R * 0.7);
    const wg = g.createLinearGradient(0, iy, 0, iy + ih);
    wg.addColorStop(0, '#0b2a48'); wg.addColorStop(0.55, '#071d36'); wg.addColorStop(1, '#041226');
    g.fillStyle = wg; g.fill();
    g.save(); g.clip();
    // light from above fades into the deep
    const lg = g.createRadialGradient(ix + iw * 0.5, iy - ih * 0.1, 0, ix + iw * 0.5, iy - ih * 0.1, ih * 0.8);
    lg.addColorStop(0, 'rgba(90,190,255,0.12)'); lg.addColorStop(1, 'rgba(90,190,255,0)');
    g.fillStyle = lg; g.fillRect(ix, iy, iw, ih);
    // faint sand ripples on the floor
    g.strokeStyle = 'rgba(120,180,230,0.05)'; g.lineWidth = 1;
    for (let i = 0; i < 7; i++) {
      const y = iy + ih * (0.72 + i * 0.04);
      g.beginPath(); g.moveTo(ix, y);
      for (let x = ix; x <= ix + iw; x += 12) g.lineTo(x, y + Math.sin(x * 0.05 + i + rng() * 0.4) * 2);
      g.stroke();
    }
    // inner glass shadow under the rim
    g.shadowColor = 'rgba(0,0,0,0.75)'; g.shadowBlur = 10;
    g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 6;
    rr(g, ix - 3, iy - 3, iw + 6, ih + 6, R * 0.7 + 3); g.stroke();
    g.restore();
    // bevel sheen along the top of the rim
    g.save();
    rr(g, G.px, G.py, G.pw, G.ph, R); g.clip();
    const sh = g.createLinearGradient(0, G.py, 0, G.py + ins * 1.4);
    sh.addColorStop(0, 'rgba(200,240,255,0.35)'); sh.addColorStop(1, 'rgba(200,240,255,0)');
    g.fillStyle = sh; g.fillRect(G.px, G.py, G.pw, ins * 1.4);
    g.restore();
    // waterline glint along the inner edge
    rr(g, ix + 0.5, iy + 0.5, iw - 1, ih - 1, R * 0.7);
    g.strokeStyle = 'rgba(150,215,255,0.3)'; g.lineWidth = 1; g.stroke();
    g.restore();
  },
  marks(g, G) {
    // lane dividers: a fine glass line with tiny pearls every few steps
    for (let c = 1; c < G.cols; c++) {
      const x = laneX(G, c) + 0.5;
      g.strokeStyle = 'rgba(150,210,255,0.13)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(x, G.cy + 6); g.lineTo(x, G.cy + G.rows * G.cell - 6); g.stroke();
      g.fillStyle = 'rgba(200,235,255,0.26)';
      for (let r = 1; r < G.rows; r++) { g.beginPath(); g.arc(x, rowY(G, r), 1.5, 0, TAU); g.fill(); }
    }
    // slot markers: a faint ring
    g.strokeStyle = 'rgba(150,210,255,0.11)'; g.lineWidth = 1;
    for (let r = 0; r < G.rows; r++) for (let c = 0; c < G.cols; c++) {
      g.beginPath(); g.arc(cellCX(G, c), cellCY(G, r), G.cell * 0.075, 0, TAU); g.stroke();
    }
  },
  idleLayer(G, dpr, rng) { return basin.idleLayer(G, dpr, rng); },
  idle(ctx, G, t, layer) {
    const { w, h } = layer, ins = Math.max(4.5, G.pad * 0.85);
    ctx.save();
    ctx.beginPath(); ctx.rect(G.px + ins, G.py + ins, G.pw - ins * 2, G.ph - ins * 2); ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha *= 0.055;
    for (const [vx, vy, o] of [[3, 2, 0], [-2.4, 2.8, 0.5]]) {
      const ox = ((t * vx + o * w) % w + w) % w, oy = ((t * vy + o * h) % h + h) % h;
      for (const x of [G.px + ox - w, G.px + ox]) for (const y of [G.py + oy - h, G.py + oy]) ctx.drawImage(layer.canvas, x, y, w, h);
    }
    ctx.restore();
  },
  stillIdle: true,
  aim: ['rgba(140,210,255,0.16)', 'rgba(140,210,255,0.04)'],
  danger: { dash: [8, 5], hot: [255, 80, 100], cold: 'rgba(255,130,150,0.5)', width: 2.4, backing: 'rgba(2,10,24,0.7)' },
};

// --- Seaside Café (v3 default): a pale driftwood tray, one weathered plank per column, in a twisted rope rim.
// The one LIGHT board: it breaks the dark-fill rule on purpose for the cozy default look. Readability holds because
// the seaside pieces carry their own dark ink outline and contact shadow, the plank seams mark the columns, and the
// danger line sits on a dark backing.
function rope(g, x, y, w, h, R, thick) {
  rr(g, x, y, w, h, R);
  g.lineWidth = thick + 2; g.strokeStyle = '#6e5236'; g.stroke(); // dark under-edge
  g.lineWidth = thick; g.strokeStyle = '#d9bf93'; g.stroke();
  // twists: short diagonal strands along the straight runs
  const step = Math.max(3.2, thick * 0.62);
  const runs = [
    [x + R, y, x + w - R, y], [x + w, y + R, x + w, y + h - R],
    [x + w - R, y + h, x + R, y + h], [x, y + h - R, x, y + R],
  ];
  g.save();
  g.lineCap = 'round';
  for (const [x0, y0, x1, y1] of runs) {
    const len = Math.hypot(x1 - x0, y1 - y0), a = Math.atan2(y1 - y0, x1 - x0);
    for (let d = step * 0.5; d < len; d += step) {
      g.save(); g.translate(x0 + Math.cos(a) * d, y0 + Math.sin(a) * d); g.rotate(a + 0.8);
      g.strokeStyle = 'rgba(110,80,46,0.55)'; g.lineWidth = Math.max(1, thick * 0.16);
      g.beginPath(); g.moveTo(-thick * 0.52, 0); g.lineTo(thick * 0.52, 0); g.stroke();
      g.strokeStyle = 'rgba(255,244,214,0.6)'; g.lineWidth = Math.max(0.8, thick * 0.12);
      g.beginPath(); g.moveTo(-thick * 0.42, -thick * 0.2); g.lineTo(thick * 0.28, -thick * 0.2); g.stroke();
      g.restore();
    }
  }
  g.restore();
  // corner knots: a round wrap where the rope turns
  const ins = R * 0.29;
  for (const [cx, cy] of [[x + ins, y + ins], [x + w - ins, y + ins], [x + ins, y + h - ins], [x + w - ins, y + h - ins]]) {
    const kr = thick * 0.8;
    g.fillStyle = '#6e5236'; g.beginPath(); g.arc(cx, cy + 0.8, kr + 1, 0, TAU); g.fill();
    const kg = g.createRadialGradient(cx - kr * 0.35, cy - kr * 0.4, 0, cx, cy, kr);
    kg.addColorStop(0, '#f4e2bc'); kg.addColorStop(1, '#b8986a');
    g.fillStyle = kg; g.beginPath(); g.arc(cx, cy, kr, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(110,80,46,0.5)'; g.lineWidth = 1;
    for (const k of [-0.35, 0.05, 0.45]) { g.beginPath(); g.moveTo(cx - kr * 0.75, cy + kr * k - kr * 0.25); g.lineTo(cx + kr * 0.75, cy + kr * k + kr * 0.1); g.stroke(); }
  }
}

const driftwood = {
  base(g, G, rng) {
    const R = G.cell * 0.26;
    g.save();
    rr(g, G.px, G.py, G.pw, G.ph, R);
    g.fillStyle = '#b89c78';
    g.shadowColor = 'rgba(70,44,22,0.38)'; g.shadowBlur = 16; g.shadowOffsetY = 5;
    g.fill();
    g.shadowColor = 'transparent'; g.shadowBlur = 0; g.shadowOffsetY = 0;
    g.clip();
    // planks: one per column, each its own weathered tone, with grain and a knot or two
    const top = G.py, h = G.ph;
    for (let c = -1; c <= G.cols; c++) {
      const x0 = c < 0 ? G.px : laneX(G, c), x1 = c >= G.cols ? G.px + G.pw : c < 0 ? G.cx : laneX(G, c + 1);
      const tone = rng();
      const pg = g.createLinearGradient(x0, 0, x1, 0);
      const l = 72 + tone * 6, sat = 24 + tone * 8;
      pg.addColorStop(0, `hsl(34,${sat}%,${l - 3}%)`);
      pg.addColorStop(0.5, `hsl(36,${sat}%,${l}%)`);
      pg.addColorStop(1, `hsl(33,${sat}%,${l - 6}%)`);
      g.fillStyle = pg; g.fillRect(x0, top, x1 - x0, h);
      const n = 5 + Math.floor(rng() * 3);
      for (let i = 0; i < n; i++) {
        const gx = x0 + (x1 - x0) * (0.1 + rng() * 0.8), amp = 1 + rng() * 2.4, ph = rng() * TAU, fq = 0.012 + rng() * 0.02;
        g.strokeStyle = `rgba(120,88,58,${0.1 + rng() * 0.12})`; g.lineWidth = 0.8 + rng() * 0.7;
        g.beginPath();
        for (let y = top; y <= top + h; y += 6) { const xx = gx + Math.sin(y * fq + ph) * amp; if (y === top) g.moveTo(xx, y); else g.lineTo(xx, y); }
        g.stroke();
      }
      if (c >= 0 && c < G.cols && rng() < 0.55) {
        const kx = (x0 + x1) / 2 + (rng() - 0.5) * G.cell * 0.4, ky = top + h * (0.15 + rng() * 0.7), kr = G.cell * (0.06 + rng() * 0.04);
        g.strokeStyle = 'rgba(120,88,58,0.22)'; g.lineWidth = 1;
        g.beginPath(); g.ellipse(kx, ky, kr * 2.1, kr * 3.4, 0, 0, TAU); g.stroke();
        g.fillStyle = 'rgba(112,80,50,0.32)'; g.beginPath(); g.ellipse(kx, ky, kr, kr * 1.5, 0, 0, TAU); g.fill();
      }
      g.fillStyle = 'rgba(255,250,236,0.12)'; g.fillRect(x0 + (x1 - x0) * 0.15, top, (x1 - x0) * 0.25, h);
    }
    // soft inner shadow all round (the tray is a shallow box)
    const ins = G.cell * 0.55;
    const edges = [
      [G.px, G.py, G.px, G.py + ins, G.px, G.py, G.pw, ins],
      [G.px, G.py + G.ph, G.px, G.py + G.ph - ins * 0.6, G.px, G.py + G.ph - ins * 0.6, G.pw, ins * 0.6],
      [G.px, G.py, G.px + ins * 0.7, G.py, G.px, G.py, ins * 0.7, G.ph],
      [G.px + G.pw, G.py, G.px + G.pw - ins * 0.7, G.py, G.px + G.pw - ins * 0.7, G.py, ins * 0.7, G.ph],
    ];
    for (const [x0, y0, x1, y1, rx, ry, rw, rh] of edges) {
      const sg = g.createLinearGradient(x0, y0, x1, y1);
      sg.addColorStop(0, 'rgba(84,56,30,0.34)'); sg.addColorStop(1, 'rgba(84,56,30,0)');
      g.fillStyle = sg; g.fillRect(rx, ry, rw, rh);
    }
    g.restore();
    rope(g, G.px, G.py, G.pw, G.ph, R, Math.max(5, Math.min(9, G.cell * 0.15)));
  },
  marks(g, G) {
    const top = G.cy + 1, bot = G.cy + G.rows * G.cell - 1;
    g.save();
    // plank seams: a dark groove with a light lip, so every column reads clearly
    for (let c = 1; c < G.cols; c++) {
      const x = laneX(G, c);
      g.strokeStyle = 'rgba(92,62,36,0.5)'; g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(x, top); g.lineTo(x, bot); g.stroke();
      g.strokeStyle = 'rgba(255,248,230,0.5)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(x + 1.5, top); g.lineTo(x + 1.5, bot); g.stroke();
    }
    // brass nail heads at the top and bottom of each plank
    const nr = Math.max(1.4, G.cell * 0.04);
    for (let c = 0; c < G.cols; c++) for (const y of [G.cy + G.cell * 0.14, G.cy + G.rows * G.cell - G.cell * 0.14]) {
      const x = cellCX(G, c);
      g.fillStyle = 'rgba(70,46,24,0.35)'; g.beginPath(); g.arc(x + 0.5, y + 0.8, nr, 0, TAU); g.fill();
      const ng = g.createRadialGradient(x - nr * 0.3, y - nr * 0.4, 0, x, y, nr);
      ng.addColorStop(0, '#f6e2a8'); ng.addColorStop(1, '#9c7a3a');
      g.fillStyle = ng; g.beginPath(); g.arc(x, y, nr, 0, TAU); g.fill();
    }
    // slot markers: a faint worn ring per cell (where many a cup has stood)
    g.strokeStyle = 'rgba(110,78,46,0.13)'; g.lineWidth = 1.2;
    for (let r = 0; r < G.rows; r++) for (let c = 0; c < G.cols; c++) {
      g.beginPath(); g.arc(cellCX(G, c), cellCY(G, r), G.cell * 0.13, 0, TAU); g.stroke();
    }
    g.restore();
  },
  aim: ['rgba(255,246,214,0.42)', 'rgba(255,246,214,0.08)'],
  // a red cord on a dark backing so it reads on the pale wood
  danger: { dash: [9, 5], hot: [214, 52, 46], cold: 'rgba(196,64,52,0.72)', width: 2.4, backing: 'rgba(48,24,10,0.62)' },
};

// --- Cottage Garden: a weathered potting bench. A sage-painted rim worn back to the wood, dark bench planks,
// twine lane dividers and a tiny green sprig per slot.
const pottingBench = {
  base(g, G, rng) {
    const R = G.cell * 0.2;
    g.save();
    // rim: sage paint, worn through to warm wood here and there
    rr(g, G.px, G.py, G.pw, G.ph, R);
    const rim = g.createLinearGradient(0, G.py, 0, G.py + G.ph);
    rim.addColorStop(0, '#8aa882'); rim.addColorStop(1, '#5e7c58');
    g.fillStyle = rim;
    g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 14; g.shadowOffsetY = 3;
    g.fill();
    g.shadowColor = 'transparent'; g.shadowBlur = 0; g.shadowOffsetY = 0;
    g.save(); g.clip();
    for (let i = 0; i < 26; i++) {
      const x = G.px + rng() * G.pw, y = G.py + rng() * G.ph;
      g.fillStyle = `rgba(150,96,52,${0.25 + rng() * 0.3})`;
      g.beginPath(); g.ellipse(x, y, 2 + rng() * 6, 1 + rng() * 2, rng() * 0.6 - 0.3, 0, TAU); g.fill();
    }
    g.restore();
    g.strokeStyle = '#34482e'; g.lineWidth = 1.25; g.stroke();
    rr(g, G.px + 1.5, G.py + 1.2, G.pw - 3, G.ph - 3, R - 1);
    g.strokeStyle = 'rgba(236,246,220,0.4)'; g.lineWidth = 1; g.stroke();
    // inner surface: dark bench planks running across
    const ins = Math.max(4, G.pad * 0.8);
    const ix = G.px + ins, iy = G.py + ins, iw = G.pw - ins * 2, ih = G.ph - ins * 2;
    rr(g, ix, iy, iw, ih, R * 0.6);
    const pf = g.createLinearGradient(0, iy, 0, iy + ih);
    pf.addColorStop(0, '#4a3220'); pf.addColorStop(1, '#3a2616');
    g.fillStyle = pf; g.fill();
    g.save(); g.clip();
    const plank = G.cell * 1.15;
    for (let y = iy; y < iy + ih; y += plank) {
      g.fillStyle = `rgba(${rng() < 0.5 ? '255,210,160' : '20,8,0'},${0.03 + rng() * 0.05})`;
      g.fillRect(ix, y, iw, plank);
      g.strokeStyle = 'rgba(16,6,0,0.5)'; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(ix, y); g.lineTo(ix + iw, y); g.stroke();
      for (let k = 0; k < 5; k++) {
        const gy = y + 3 + rng() * (plank - 6), ph = rng() * TAU;
        g.strokeStyle = `rgba(24,10,2,${0.14 + rng() * 0.12})`; g.lineWidth = 0.6 + rng() * 0.6;
        g.beginPath(); g.moveTo(ix, gy);
        for (let x = ix; x <= ix + iw; x += 10) g.lineTo(x, gy + Math.sin(x * 0.03 + ph) * 0.9);
        g.stroke();
      }
    }
    // a few soft soil smudges
    for (let i = 0; i < 6; i++) {
      g.fillStyle = 'rgba(20,10,4,0.22)';
      g.beginPath(); g.ellipse(ix + rng() * iw, iy + rng() * ih, 4 + rng() * 8, 2 + rng() * 4, 0, 0, TAU); g.fill();
    }
    const sh = g.createLinearGradient(0, iy, 0, iy + 9);
    sh.addColorStop(0, 'rgba(0,0,0,0.42)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = sh; g.fillRect(ix, iy, iw, 9);
    g.restore();
    rr(g, ix, iy, iw, ih, R * 0.6);
    g.strokeStyle = 'rgba(30,14,4,0.7)'; g.lineWidth = 1; g.stroke();
    g.restore();
  },
  marks(g, G) {
    // garden twine down each lane divider: a soft dashed jute line
    const top = G.cy - G.pad * 0.2, bot = G.cy + G.rows * G.cell + G.pad * 0.2;
    for (let c = 1; c < G.cols; c++) {
      const x = laneX(G, c);
      g.strokeStyle = 'rgba(10,4,0,0.45)'; g.lineWidth = 2.2;
      g.beginPath(); g.moveTo(x + 0.6, top); g.lineTo(x + 0.6, bot); g.stroke();
      g.strokeStyle = 'rgba(214,180,120,0.42)'; g.lineWidth = 1.4; g.setLineDash([4, 2.5]);
      g.beginPath(); g.moveTo(x, top); g.lineTo(x, bot); g.stroke();
      g.setLineDash([]);
    }
    // slot markers: a tiny two-leaf sprig per cell
    g.fillStyle = 'rgba(150,210,120,0.2)';
    for (let r = 0; r < G.rows; r++) for (let c = 0; c < G.cols; c++) {
      const x = cellCX(G, c), y = cellCY(G, r), s = G.cell * 0.06;
      g.beginPath(); g.ellipse(x - s * 0.8, y, s, s * 0.5, -0.5, 0, TAU); g.fill();
      g.beginPath(); g.ellipse(x + s * 0.8, y, s, s * 0.5, 0.5, 0, TAU); g.fill();
    }
  },
  aim: ['rgba(240,250,210,0.16)', 'rgba(240,250,210,0.04)'],
  // a red garden-twine cord on a dark backing so it reads on the wood
  danger: { dash: [9, 5], hot: [240, 60, 60], cold: 'rgba(230,84,80,0.62)', width: 2.4, backing: 'rgba(24,10,2,0.7)' },
};

const ART = { nova, starglass, nebula_velvet: velvet, brass_observatory: brass, hinoki: geta, stone_pond: basin, cafe_cushion: cushion, marble_tray: tray, abyss_glass: abyssGlass, driftwood, potting_bench: pottingBench };

/**
 * The board skin registry: the catalogue (src/meta/looks.js: id, name, cost, pack, desc) plus each skin's art.
 */
export const BOARD_SKINS = BOARD_LOOKS.map((l) => ({ ...l, art: ART[l.id] || nova }));
export const BOARD_SKIN_BY_ID = Object.fromEntries(BOARD_SKINS.map((s) => [s.id, s]));
export const BOARD_SKIN_IDS = BOARD_SKINS.map((s) => s.id);
export const boardSkin = (id) => BOARD_SKIN_BY_ID[id] || BOARD_SKIN_BY_ID[DEFAULT_BOARD_SKIN];

// ------------------------------------------------------------------ layers (cached)

const MARGIN = 30; // room around the panel for glows, shadows, feet and tassels
const cache = new Map();

export function clearBoardArtCache() { cache.clear(); }

function geometry(cell, cols, rows) {
  const pad = Math.round(cell * 0.1);
  const pw = cell * cols + pad * 2, ph = cell * rows + pad * 2;
  return { cell, cols, rows, pad, px: MARGIN, py: MARGIN, pw, ph, cx: MARGIN + pad, cy: MARGIN + pad, W: pw + MARGIN * 2, H: ph + MARGIN * 2 };
}

function layersFor(id, cell, cols, rows, dpr) {
  const key = `${id}|${cell}|${cols}|${rows}|${dpr}`;
  let L = cache.get(key);
  if (L) return L;
  if (cache.size > 12) cache.clear();
  const def = boardSkin(id);
  const G = geometry(cell, cols, rows);
  const paint = (fn, salt) => {
    const c = makeCanvas(G.W * dpr, G.H * dpr);
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    fn(g, G, mulberry32(hashString('board:' + def.id + salt)));
    return c;
  };
  L = {
    G,
    base: paint(def.art.base, ':base'),
    marks: paint(def.art.marks, ':marks'),
    idle: def.art.idleLayer ? def.art.idleLayer(G, dpr, mulberry32(hashString('board:' + def.id + ':idle'))) : null,
  };
  cache.set(key, L);
  return L;
}

// ------------------------------------------------------------------ drawing

/**
 * Draw the board for the renderer: panel, aimed-column highlight, lanes + slot markers and the danger warnings.
 * L = the renderer layout { cols, rows, cell, bx, by, bw, bh }. view: the game view (aim, danger, tideLeft, cometMode).
 * opts: { time, reduced (Calm / reduced motion: idle motion holds still), dpr }.
 */
export function drawBoardSkin(ctx, id, L, view, { time = 0, reduced = false, dpr = 1 } = {}) {
  const def = boardSkin(id);
  const art = def.art;
  const lay = layersFor(def.id, L.cell, L.cols, L.rows, dpr);
  const G = lay.G;
  const ox = L.bx - G.pad - MARGIN, oy = L.by - G.pad - MARGIN;
  ctx.drawImage(lay.base, ox, oy, G.W, G.H);
  if (art.idle && lay.idle !== undefined && (!reduced || art.stillIdle)) {
    ctx.save();
    ctx.translate(ox, oy);
    art.idle(ctx, G, reduced ? 12 : time, lay.idle);
    ctx.restore();
  }

  // aimed column highlight
  if (view && view.aim && view.aim.visible && !view.cometMode) {
    const x = L.bx + view.aim.x * L.cell;
    const grad = ctx.createLinearGradient(0, L.by, 0, L.by + L.bh);
    grad.addColorStop(0, art.aim[0]);
    grad.addColorStop(1, art.aim[1]);
    ctx.fillStyle = grad;
    rr(ctx, x + 2, L.by, L.cell - 4, L.bh, L.cell * 0.2);
    ctx.fill();
  }

  ctx.drawImage(lay.marks, ox, oy, G.W, G.H);
  if (view && view.danger) drawDanger(ctx, art.danger, L, view, time);
}

/**
 * Perf helper for the renderer: the screen rect (CSS px, same space as L) where this skin's base layer is fully
 * opaque over the play area, or null if any of it is see-through. Measured once per cached layer set.
 */
export function boardOpaqueRect(id, L, dpr = 1) {
  if (!L) return null;
  const lay = layersFor(boardSkin(id).id, L.cell, L.cols, L.rows, dpr);
  if (lay.opaque === undefined) {
    lay.opaque = false;
    try {
      const G = lay.G, c = lay.base;
      const sx = Math.ceil(G.cx * dpr), sy = Math.ceil(G.cy * dpr);
      const sw = Math.floor(G.cols * G.cell * dpr), sh = Math.floor(G.rows * G.cell * dpr);
      const px = c.getContext('2d').getImageData(sx, sy, sw, sh).data;
      let ok = true;
      for (let i = 3; i < px.length; i += 4) if (px[i] < 255) { ok = false; break; }
      lay.opaque = ok;
    } catch (_) { /* tainted or unsupported: treat as see-through */ }
  }
  if (!lay.opaque) return null;
  return { x: L.bx, y: L.by, w: L.cols * L.cell, h: L.rows * L.cell };
}

function drawDanger(ctx, d, L, view, t) {
  const urgent = view.tideLeft <= 2;
  for (let c = 0; c < L.cols; c++) {
    const lvl = view.danger[c];
    if (!lvl) continue;
    const pulse = 0.5 + 0.5 * Math.sin(t * (urgent ? 10 : 5));
    const a = (lvl >= 2 ? 0.35 : 0.16) * (0.5 + pulse * 0.5) * (urgent ? 1.4 : 1);
    const x = L.bx + c * L.cell;
    const gr = ctx.createLinearGradient(0, L.by, 0, L.by + L.cell * 2.2);
    gr.addColorStop(0, `rgba(255,60,90,${a})`);
    gr.addColorStop(1, 'rgba(255,60,90,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(x + 1, L.by, L.cell - 2, L.cell * 2.2);
  }
  const hot = view.danger.some((v) => v >= 2);
  ctx.save();
  if (d.backing) {
    ctx.strokeStyle = d.backing;
    ctx.lineWidth = d.width + 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(L.bx + 2, L.by); ctx.lineTo(L.bx + L.bw - 2, L.by); ctx.stroke();
    ctx.lineCap = 'butt';
  }
  ctx.setLineDash(d.dash);
  ctx.lineDashOffset = -t * 20;
  ctx.strokeStyle = hot ? `rgba(${d.hot[0]},${d.hot[1]},${d.hot[2]},${0.5 + 0.4 * Math.sin(t * 8) + (d.backing ? 0.1 : 0)})` : d.cold;
  ctx.lineWidth = d.width;
  ctx.beginPath(); ctx.moveTo(L.bx, L.by); ctx.lineTo(L.bx + L.bw, L.by); ctx.stroke();
  ctx.restore();
}

// sample pieces for previews: [row from the bottom, col, tier]
const PREVIEW_PIECES = [[0, 0, 3], [0, 1, 5], [0, 2, 2], [0, 3, 7], [0, 4, 4], [1, 0, 1], [1, 1, 6], [1, 3, 2], [1, 4, 8], [2, 1, 1], [2, 4, 3]];

/**
 * Preview of a board skin for a Wardrobe / shop card: the board with a few sample pieces and its danger line.
 * Draws into (0, 0, w, h) of ctx in CSS px; the caller sets any device-pixel scale and passes it as opts.dpr.
 * opts: { dpr = 1, time = 12, reduced = false, skin = 'classic' (orb skin for the sample pieces), pieces = true,
 *         numbers = false, danger = true, rows (default: fits the box, 3..7) }.
 */
export function drawBoardPreview(ctx, w, h, id, opts = {}) {
  const { dpr = 1, time = 12, reduced = false, skin = 'classic', pieces = true, numbers = false, danger = true } = opts;
  const cols = 5;
  const rows = opts.rows || Math.max(3, Math.min(7, Math.round(((h - 16) / (w - 16)) * cols)));
  const cell = Math.max(8, Math.floor(Math.min((w - 16) / (cols + 0.2), (h - 18) / (rows + 0.2))));
  const bw = cell * cols, bh = cell * rows;
  const L = { cols, rows, cell, bx: Math.round((w - bw) / 2), by: Math.round((h - bh) / 2) - 2, bw, bh };
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip();
  drawBoardSkin(ctx, id, L, danger ? { danger: [0, 0, 0, 0, 0], tideLeft: 9 } : null, { time, reduced, dpr });
  if (pieces) {
    for (const [rb, c, tier] of PREVIEW_PIECES) {
      const r = rows - 1 - rb;
      if (r < 0) continue;
      drawOrb(ctx, L.bx + (c + 0.5) * cell, L.by + (r + 0.5) * cell, (cell / 2) * orbRadiusFactor(tier), tier, skin, dpr, { time: time + c, number: numbers, anim: !reduced });
    }
  }
  ctx.restore();
}
