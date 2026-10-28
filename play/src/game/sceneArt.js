// Sky scenes (v0.5.8): layered, gently animated backgrounds drawn ON TOP of the theme's base nebula.
// Presentation only. Light on the CPU: every layer is painted ONCE per screen size into an offscreen
// canvas (soft layers at half resolution), and each frame only draws those canvases with a small
// offset / alpha (a handful of drawImage calls, no gradients or paths per frame). With Calm or
// reduced motion the renderer stops the scene clock, so the picture holds still.
// Shapes come from a seeded mulberry32 stream per scene (never the game RNG).
//
// Readability: layers stay dim (low alpha, 'lighter' only on soft glows) and the bright features
// (planet, suns, crystal clusters) sit near the top or bottom edges, away from the board centre.
import { mulberry32, hashString } from './rng.js';
import { drawSushi } from './sushiArt.js';
import { lilypond, raintemple } from './koiScenes.js';
import { CAT_SCENES } from './catScenes.js';
import { PATISSERIE_SCENES } from './patisserieScenes.js';
import { DEEPSEA_SCENES } from './deepseaScenes.js';
import { GARDEN_SCENES } from './gardenScenes.js';
import { SEASIDE_SCENES } from './seasideScenes.js';

export const SCENE_KINDS = ['saturn', 'comets', 'binary', 'deep', 'crystal', 'sushi', 'sakura', 'lilypond', 'raintemple', ...Object.keys(CAT_SCENES), ...Object.keys(PATISSERIE_SCENES), ...Object.keys(DEEPSEA_SCENES), ...Object.keys(GARDEN_SCENES), ...Object.keys(SEASIDE_SCENES)];

const TAU = Math.PI * 2;

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(2, Math.round(w));
  c.height = Math.max(2, Math.round(h));
  return c;
}

/** Offscreen layer of CSS size (w, h) painted at `res` pixels per CSS px. paint(g, w, h) works in CSS px. */
function layer(w, h, res, paint) {
  const c = canvas(w * res, h * res);
  const g = c.getContext('2d');
  g.scale(c.width / w, c.height / h);
  paint(g, w, h);
  return { c, w, h };
}

function glow(g, x, y, r, col, alpha = 1) {
  const rg = g.createRadialGradient(x, y, 0, x, y, r);
  rg.addColorStop(0, col);
  rg.addColorStop(1, 'rgba(0,0,0,0)');
  g.globalAlpha = alpha;
  g.fillStyle = rg;
  g.fillRect(x - r, y - r, r * 2, r * 2);
  g.globalAlpha = 1;
}

/** Draw a layer at (x, y) CSS px with its CSS size. */
function put(ctx, L, x, y, alpha) {
  if (alpha <= 0.002) return;
  ctx.globalAlpha = alpha;
  ctx.drawImage(L.c, x, y, L.w, L.h);
}

// ------------------------------------------------------------------ the five scenes

function saturn(w, h, rnd) {
  const M = 0.08; // parallax margin (fraction of w) on each side
  const curtain = (hues) => layer(w * (1 + M * 2), h * 0.55, 0.5, (g, W, H) => {
    g.globalCompositeOperation = 'lighter';
    const n = 46;
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1);
      const x = u * W;
      const top = H * (0.08 + 0.12 * Math.sin(u * 7.3 + rnd() * 0.6) + 0.06 * Math.sin(u * 2.1));
      const len = H * (0.35 + 0.25 * (0.5 + 0.5 * Math.sin(u * 5.1 + 1.3)));
      const col = hues[i % hues.length];
      const gr = g.createLinearGradient(0, top, 0, top + len);
      gr.addColorStop(0, 'rgba(0,0,0,0)');
      gr.addColorStop(0.35, col);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.globalAlpha = 0.16 + rnd() * 0.12;
      g.fillRect(x - W / n, top, (W / n) * 2.4, len);
    }
    g.globalAlpha = 1;
  });
  const auroraA = curtain(['rgba(70,255,170,1)', 'rgba(60,230,200,1)', 'rgba(120,255,150,1)']);
  const auroraB = curtain(['rgba(80,170,255,1)', 'rgba(170,110,255,1)', 'rgba(90,230,255,1)']);
  const R = Math.min(w, h) * 0.34;
  const planet = layer(R * 4.4, R * 2.6, 1, (g, W, H) => {
    const cx = W / 2, cy = H / 2;
    const ring = (front) => {
      g.save();
      g.translate(cx, cy); g.rotate(-0.32); g.scale(1, 0.28);
      g.beginPath();
      if (front) g.arc(0, 0, R * 1.85, 0, Math.PI); else g.arc(0, 0, R * 1.85, Math.PI, TAU);
      g.lineWidth = R * 0.42; g.strokeStyle = 'rgba(230,200,150,0.22)'; g.stroke();
      g.lineWidth = R * 0.12; g.strokeStyle = 'rgba(255,230,190,0.18)'; g.stroke();
      g.restore();
    };
    ring(false);
    const body = g.createRadialGradient(cx - R * 0.4, cy - R * 0.45, R * 0.1, cx, cy, R);
    body.addColorStop(0, 'rgba(214,170,118,1)'); body.addColorStop(0.6, 'rgba(120,84,60,1)'); body.addColorStop(1, 'rgba(36,24,30,1)');
    g.fillStyle = body; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fill();
    g.save(); g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.clip();
    g.translate(cx, cy); g.rotate(-0.32);
    for (let i = -5; i <= 5; i++) {
      g.fillStyle = i % 2 ? 'rgba(255,220,170,0.10)' : 'rgba(60,30,30,0.14)';
      g.fillRect(-R * 1.2, i * R * 0.18, R * 2.4, R * 0.09);
    }
    g.restore();
    ring(true);
  });
  const px = w * 0.86 - planet.w / 2, py = h * 0.86 - planet.h / 2;
  return {
    draw(ctx, t, a) {
      const sway = Math.sin(t * 0.07) * w * M * 0.8;
      put(ctx, auroraA, -w * M + sway, -h * 0.02, a * (0.7 + 0.3 * Math.sin(t * 0.31)));
      put(ctx, auroraB, -w * M - sway * 0.6, h * 0.04, a * (0.45 + 0.3 * Math.sin(t * 0.23 + 2)));
      put(ctx, planet, px + Math.sin(t * 0.05) * 4, py + Math.sin(t * 0.13) * 5, a * 0.62);
    },
  };
}

function comets(w, h, rnd) {
  const M = 0.06;
  const band = layer(w * (1 + M * 2), h * (1 + M * 2), 0.5, (g, W, H) => {
    g.save(); g.translate(W / 2, H * 0.45); g.rotate(-0.6);
    for (let i = 0; i < 9; i++) glow(g, (rnd() - 0.5) * W * 1.2, (rnd() - 0.5) * H * 0.08, W * (0.18 + rnd() * 0.14), 'rgba(120,140,255,0.5)', 0.22);
    for (let i = 0; i < 420; i++) {
      const x = (rnd() - 0.5) * W * 1.6, y = (rnd() + rnd() + rnd() - 1.5) * H * 0.07;
      g.fillStyle = `rgba(${200 + rnd() * 55 | 0},${200 + rnd() * 55 | 0},255,${0.15 + rnd() * 0.35})`;
      g.fillRect(x, y, 1.2, 1.2);
    }
    g.restore();
  });
  const L = Math.max(70, Math.min(w, h) * 0.32);
  const sprite = layer(L, 10, 2, (g, W, H) => {
    const gr = g.createLinearGradient(0, 0, W, 0);
    gr.addColorStop(0, 'rgba(120,180,255,0)'); gr.addColorStop(0.8, 'rgba(170,215,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0.95)');
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(0, H / 2); g.lineTo(W - 4, H / 2 - 2.2); g.lineTo(W - 4, H / 2 + 2.2); g.closePath(); g.fill();
    glow(g, W - 4, H / 2, 5, 'rgba(255,255,255,0.9)');
  });
  const ang = 0.52;
  const list = [];
  for (let i = 0; i < 7; i++) list.push({ x0: rnd() * 1.2 - 0.3, y0: rnd() * 0.75 - 0.15, period: 9 + rnd() * 9, ph: rnd(), sc: 0.55 + rnd() * 0.6 });
  const travel = Math.hypot(w, h) * 0.75;
  return {
    draw(ctx, t, a) {
      put(ctx, band, -w * M + Math.sin(t * 0.03) * w * M * 0.7, -h * M + Math.cos(t * 0.025) * h * M * 0.5, a * 0.8);
      const c = Math.cos(ang), s = Math.sin(ang);
      for (const k of list) {
        const p = ((t / k.period + k.ph) % 1 + 1) % 1;
        const fade = Math.sin(p * Math.PI);
        const x = k.x0 * w + c * travel * (p - 0.3), y = k.y0 * h + s * travel * (p - 0.3);
        ctx.globalAlpha = a * 0.55 * fade * fade;
        if (ctx.globalAlpha < 0.01) continue;
        ctx.save();
        ctx.translate(x, y); ctx.rotate(ang); ctx.scale(k.sc, k.sc);
        ctx.drawImage(sprite.c, -sprite.w, -sprite.h / 2, sprite.w, sprite.h);
        ctx.restore();
      }
    },
  };
}

function binary(w, h, rnd) {
  const M = 0.05;
  const horizonY = h * 0.84;
  const haze = layer(w, h * 0.5, 0.5, (g, W, H) => {
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, 'rgba(255,120,80,0)'); gr.addColorStop(0.62, 'rgba(255,120,90,0.20)'); gr.addColorStop(0.75, 'rgba(255,170,110,0.28)'); gr.addColorStop(1, 'rgba(120,40,60,0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  });
  const sun = (col, r) => layer(r * 2, r * 2, 0.5, (g, W) => {
    glow(g, W / 2, W / 2, W / 2, col, 0.55);
    glow(g, W / 2, W / 2, W * 0.12, 'rgba(255,250,235,1)', 0.85);
  });
  const big = sun('rgba(255,150,80,1)', Math.min(w, h) * 0.36);
  const small = sun('rgba(170,200,255,1)', Math.min(w, h) * 0.24);
  const dunes = (shade, amp, base, seedOff) => layer(w * (1 + M * 2), h * 0.3, 1, (g, W, H) => {
    g.fillStyle = shade;
    g.beginPath(); g.moveTo(0, H);
    const k1 = 1.6 + seedOff, k2 = 3.7 + seedOff * 2, p = rnd() * TAU;
    for (let x = 0; x <= W; x += 6) {
      const u = x / W;
      g.lineTo(x, H * base - H * amp * (0.6 * Math.sin(u * TAU * k1 + p) + 0.4 * Math.sin(u * TAU * k2 + p * 2)));
    }
    g.lineTo(W, H); g.closePath(); g.fill();
  });
  const far = dunes('rgba(40,18,34,1)', 0.12, 0.35, 0.1);
  const near = dunes('rgba(14,6,14,1)', 0.16, 0.62, 0.45);
  return {
    draw(ctx, t, a) {
      put(ctx, haze, 0, horizonY - h * 0.38, a * (0.85 + 0.15 * Math.sin(t * 0.2)));
      const o = t * 0.06, cx = w * 0.5, cy = horizonY - h * 0.035;
      const dx = Math.cos(o) * w * 0.13, dy = Math.sin(o) * h * 0.012;
      // the nearer sun (lower on screen in its orbit) draws last
      const A = [big, cx + dx * 0.55, cy + dy * 0.55], B = [small, cx - dx, cy - dy];
      for (const [L, x, y] of dy > 0 ? [B, A] : [A, B]) put(ctx, L, x - L.w / 2, y - L.h / 2, a * 0.8);
      put(ctx, far, -w * M + Math.sin(t * 0.03) * w * M * 0.4, horizonY - far.h * 0.36, a);
      put(ctx, near, -w * M + Math.sin(t * 0.03) * w * M * 0.9, horizonY - near.h * 0.2, a);
    },
  };
}

function deep(w, h, rnd) {
  const M = 0.07;
  const galaxies = (n, rMin, rMax, alpha) => layer(w * (1 + M * 2), h * (1 + M * 2), 0.5, (g, W, H) => {
    const cols = ['255,210,170', '200,210,255', '255,170,200', '170,230,255', '255,240,210'];
    for (let i = 0; i < n; i++) {
      const x = rnd() * W, y = rnd() * H, r = rMin + rnd() * (rMax - rMin), col = cols[i % cols.length];
      g.save(); g.translate(x, y); g.rotate(rnd() * Math.PI); g.scale(1, 0.25 + rnd() * 0.55);
      const rg = g.createRadialGradient(0, 0, 0, 0, 0, r);
      rg.addColorStop(0, `rgba(255,250,240,${alpha})`); rg.addColorStop(0.25, `rgba(${col},${alpha * 0.6})`); rg.addColorStop(1, `rgba(${col},0)`);
      g.fillStyle = rg; g.fillRect(-r, -r, r * 2, r * 2);
      if (r > rMax * 0.6) { // a hint of spiral arms on the bigger ones
        g.strokeStyle = `rgba(${col},${alpha * 0.35})`; g.lineWidth = r * 0.12;
        for (let k = 0; k < 2; k++) { g.beginPath(); g.arc(0, 0, r * 0.55, k * Math.PI, k * Math.PI + 2.2); g.stroke(); }
      }
      g.restore();
    }
  });
  const s = Math.min(w, h);
  const farL = galaxies(70, s * 0.006, s * 0.02, 0.55);
  const nearL = galaxies(16, s * 0.02, s * 0.06, 0.4);
  return {
    draw(ctx, t, a) {
      put(ctx, farL, -w * M + Math.sin(t * 0.017) * w * M * 0.3, -h * M + Math.cos(t * 0.013) * h * M * 0.3, a * 0.9);
      put(ctx, nearL, -w * M + Math.sin(t * 0.017) * w * M * 0.9, -h * M + Math.cos(t * 0.013) * h * M * 0.9, a * (0.75 + 0.15 * Math.sin(t * 0.21)));
    },
  };
}

function crystal(w, h, rnd) {
  const M = 0.05;
  const shard = (g, x, y, len, wid, rot, c1, c2) => {
    g.save(); g.translate(x, y); g.rotate(rot);
    const gr = g.createLinearGradient(-wid, 0, wid, 0);
    gr.addColorStop(0, c1); gr.addColorStop(0.5, 'rgba(255,255,255,0.32)'); gr.addColorStop(1, c2);
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(0, -len); g.lineTo(wid, -len * 0.72); g.lineTo(wid * 0.85, 0); g.lineTo(-wid * 0.85, 0); g.lineTo(-wid, -len * 0.72); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(220,240,255,0.30)'; g.lineWidth = 1; g.stroke();
    g.beginPath(); g.moveTo(0, -len); g.lineTo(0, 0); g.strokeStyle = 'rgba(255,255,255,0.16)'; g.stroke();
    g.restore();
  };
  const s = Math.min(w, h);
  const cluster = (g, x, y, up, n) => {
    for (let i = 0; i < n; i++) {
      const rot = (up ? 0 : Math.PI) + (rnd() - 0.5) * 1.5;
      const pal = [['rgba(120,90,255,0.45)', 'rgba(70,200,255,0.30)'], ['rgba(255,110,220,0.35)', 'rgba(130,100,255,0.40)'], ['rgba(80,230,255,0.40)', 'rgba(160,120,255,0.30)']][i % 3];
      shard(g, x + (rnd() - 0.5) * s * 0.3, y, s * (0.14 + rnd() * 0.22), s * (0.035 + rnd() * 0.035), rot, pal[0], pal[1]);
    }
  };
  const shards = layer(w * (1 + M * 2), h * (1 + M * 2), 1, (g, W, H) => {
    cluster(g, W * 0.12, H * 1.0, true, 9);
    cluster(g, W * 0.92, H * 0.0, false, 7);
    cluster(g, W * 0.96, H * 0.98, true, 5);
  });
  const glints = () => layer(w, h, 0.5, (g, W, H) => {
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 22; i++) {
      const edge = rnd() < 0.5;
      const x = rnd() * W, y = edge ? H * (0.82 + rnd() * 0.18) : H * rnd() * 0.2;
      glow(g, x, y, s * (0.02 + rnd() * 0.04), i % 2 ? 'rgba(160,230,255,1)' : 'rgba(255,170,240,1)', 0.35);
    }
  });
  const beams = layer(w, h, 0.5, (g, W, H) => {
    g.globalCompositeOperation = 'lighter';
    const cols = ['rgba(255,120,200,0.07)', 'rgba(120,200,255,0.07)', 'rgba(170,130,255,0.07)'];
    for (let i = 0; i < 3; i++) {
      g.save(); g.translate(W * (0.15 + i * 0.12), H); g.rotate(-0.5 + i * 0.08);
      const gr = g.createLinearGradient(0, 0, 0, -H * 1.2);
      gr.addColorStop(0, cols[i]); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(-W * 0.05, -H * 1.2, W * 0.1, H * 1.2);
      g.restore();
    }
  });
  const gA = glints(), gB = glints();
  return {
    draw(ctx, t, a) {
      put(ctx, beams, 0, 0, a * (0.7 + 0.3 * Math.sin(t * 0.17)));
      put(ctx, shards, -w * M + Math.sin(t * 0.04) * w * M * 0.6, -h * M + Math.cos(t * 0.035) * h * M * 0.4, a * 0.7);
      const k = 0.5 + 0.5 * Math.sin(t * 0.45);
      put(ctx, gA, 0, 0, a * 0.6 * k);
      put(ctx, gB, 0, 0, a * 0.6 * (1 - k));
    },
  };
}

// ------------------------------------------------------------------ premium pack scenes (Sushi Bar pack)
// Same contract as the sky scenes: every layer painted once, at most 8 drawImage calls a frame with
// transforms only. The board area keeps a baked dark veil so the orbs stay the brightest thing on screen.

function rr(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

/** Dark veil over the board band (the middle of the screen), baked into a backdrop layer. */
function boardVeil(g, w, h, a) {
  const v = g.createLinearGradient(0, 0, 0, h);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(0.17, `rgba(0,0,0,${a * 0.6})`);
  v.addColorStop(0.3, `rgba(0,0,0,${a})`); v.addColorStop(0.72, `rgba(0,0,0,${a})`);
  v.addColorStop(0.86, `rgba(0,0,0,${a * 0.4})`); v.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = v; g.fillRect(0, 0, w, h);
}

/** Draw a layer rotated by `ang` around its own point (ax, ay), placed so that point lands at (x, y). */
function putRot(ctx, L, x, y, ax, ay, ang, alpha) {
  if (alpha <= 0.002) return;
  ctx.save();
  ctx.translate(x, y); ctx.rotate(ang);
  ctx.globalAlpha = alpha;
  ctx.drawImage(L.c, -ax, -ay, L.w, L.h);
  ctx.restore();
}

function sushi(w, h, rnd) {
  const u = Math.min(w, h * 0.6);
  // 1) the room: warm wood wall, shelf of sake bottles, noren curtain, lantern glow, board veil
  const room = layer(w, h, 1, (g, W, H) => {
    const wall = g.createLinearGradient(0, 0, 0, H);
    wall.addColorStop(0, '#241309'); wall.addColorStop(0.45, '#180c06'); wall.addColorStop(1, '#0e0704');
    g.fillStyle = wall; g.fillRect(0, 0, W, H);
    // vertical planks
    const pw = W / 9;
    for (let i = 0; i < 10; i++) {
      g.fillStyle = i % 2 ? 'rgba(255,190,120,0.025)' : 'rgba(0,0,0,0.08)';
      g.fillRect(i * pw, 0, pw, H);
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(i * pw, 0, 1, H);
      for (let k = 0; k < 6; k++) { // grain
        g.strokeStyle = 'rgba(255,200,140,0.03)'; g.lineWidth = 1;
        const x = i * pw + rnd() * pw;
        g.beginPath(); g.moveTo(x, 0);
        g.bezierCurveTo(x + 4, H * 0.3, x - 4, H * 0.6, x + 2, H); g.stroke();
      }
    }
    // shelf with bottles and cups (upper area, under the curtain)
    const sy = H * 0.205;
    g.fillStyle = '#2c180c'; g.fillRect(0, sy, W, u * 0.022);
    g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(0, sy + u * 0.022, W, u * 0.012);
    for (let x = W * 0.24; x < W * 0.78; x += u * (0.07 + rnd() * 0.05)) {
      const kind = rnd();
      if (kind < 0.55) { // sake bottle
        const bh = u * (0.11 + rnd() * 0.05), bw = u * 0.045;
        const col = ['#3a4a5c', '#4a2c22', '#2f4433', '#5a4a30'][Math.floor(rnd() * 4)];
        g.fillStyle = col;
        g.beginPath();
        g.moveTo(x - bw * 0.5, sy); g.lineTo(x - bw * 0.5, sy - bh * 0.55);
        g.quadraticCurveTo(x - bw * 0.5, sy - bh * 0.72, x - bw * 0.18, sy - bh * 0.8);
        g.lineTo(x - bw * 0.18, sy - bh); g.lineTo(x + bw * 0.18, sy - bh); g.lineTo(x + bw * 0.18, sy - bh * 0.8);
        g.quadraticCurveTo(x + bw * 0.5, sy - bh * 0.72, x + bw * 0.5, sy - bh * 0.55);
        g.lineTo(x + bw * 0.5, sy); g.closePath(); g.fill();
        g.fillStyle = 'rgba(240,225,200,0.35)'; g.fillRect(x - bw * 0.32, sy - bh * 0.45, bw * 0.64, bh * 0.22); // label
        g.fillStyle = 'rgba(255,220,170,0.18)'; g.fillRect(x - bw * 0.36, sy - bh * 0.62, bw * 0.08, bh * 0.5); // glint
      } else { // cup
        const cw = u * 0.05, ch = u * 0.04;
        g.fillStyle = ['#5a4636', '#3d4b55', '#6a5a48'][Math.floor(rnd() * 3)];
        rr(g, x - cw / 2, sy - ch, cw, ch, cw * 0.18); g.fill();
        g.fillStyle = 'rgba(255,230,190,0.12)'; g.fillRect(x - cw / 2, sy - ch, cw, ch * 0.2);
      }
    }
    // lantern glow on the wall
    glow(g, W * 0.12, H * 0.16, u * 0.42, 'rgba(255,120,50,1)', 0.22);
    glow(g, W * 0.88, H * 0.16, u * 0.42, 'rgba(255,120,50,1)', 0.22);
    // noren curtain: rod, then panels with slits and a white wave crest
    const ny = H * 0.035, nh = H * 0.105;
    g.fillStyle = '#4a2a14'; rr(g, -4, ny - u * 0.022, W + 8, u * 0.024, u * 0.01); g.fill();
    const panels = 5, gap = u * 0.012, pw2 = (W - gap * (panels - 1)) / panels;
    for (let i = 0; i < panels; i++) {
      const x = i * (pw2 + gap);
      const pg = g.createLinearGradient(x, 0, x + pw2, 0);
      pg.addColorStop(0, '#16224a'); pg.addColorStop(0.5, '#22336a'); pg.addColorStop(1, '#141e42');
      g.fillStyle = pg;
      g.beginPath(); g.moveTo(x, ny); g.lineTo(x + pw2, ny); g.lineTo(x + pw2, ny + nh * (0.98 + 0.02 * (i % 2)));
      g.quadraticCurveTo(x + pw2 / 2, ny + nh * 1.03, x, ny + nh * (0.98 + 0.02 * ((i + 1) % 2))); g.closePath(); g.fill();
      // folds
      for (let f = 1; f < 3; f++) { g.fillStyle = 'rgba(0,0,0,0.16)'; g.fillRect(x + pw2 * f / 3 - 1, ny, 2, nh); }
      // white wave crest across the bottom of the panels
      g.strokeStyle = 'rgba(235,240,255,0.55)'; g.lineWidth = u * 0.008;
      for (let k = 0; k < 2; k++) {
        const wy = ny + nh * (0.7 + k * 0.12);
        g.beginPath();
        for (let s = 0; s <= 3; s++) {
          const cx = x + (s / 3) * pw2;
          g.moveTo(cx - pw2 / 6, wy); g.arc(cx, wy, pw2 / 6, Math.PI, 0);
        }
        g.stroke();
      }
    }
    // centre panel crest: a little sushi emblem (circle + rice + fish)
    const cx = W / 2, cy = ny + nh * 0.38, cr = u * 0.045;
    g.fillStyle = 'rgba(240,235,225,0.9)'; g.beginPath(); g.arc(cx, cy, cr, 0, TAU); g.fill();
    g.fillStyle = '#22336a'; g.beginPath(); g.arc(cx, cy, cr * 0.8, 0, TAU); g.fill();
    g.fillStyle = 'rgba(245,240,230,0.95)'; rr(g, cx - cr * 0.52, cy - cr * 0.05, cr * 1.04, cr * 0.42, cr * 0.2); g.fill();
    g.fillStyle = '#ff8a5c'; rr(g, cx - cr * 0.58, cy - cr * 0.34, cr * 1.16, cr * 0.36, cr * 0.18); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = cr * 0.07;
    for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(cx - cr * 0.3 + k * cr * 0.28, cy - cr * 0.3); g.lineTo(cx - cr * 0.18 + k * cr * 0.28, cy - cr * 0.02); g.stroke(); }
    // soft shadow under the curtain
    const sh = g.createLinearGradient(0, ny + nh, 0, ny + nh + u * 0.08);
    sh.addColorStop(0, 'rgba(0,0,0,0.35)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = sh; g.fillRect(0, ny + nh, W, u * 0.08);
    boardVeil(g, W, H, 0.5);
  });
  // 2) paper lantern (one sprite, drawn twice with a sway)
  const lw = u * 0.15, lh = u * 0.2;
  const lantern = layer(lw * 2.2, lh * 1.9, 1, (g, W, H) => {
    const cx = W / 2, top = H * 0.12, bh = lh * 0.78;
    glow(g, cx, top + lh * 0.55, W * 0.5, 'rgba(255,140,60,1)', 0.35);
    g.strokeStyle = '#1a0d06'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx, 0); g.lineTo(cx, top); g.stroke();
    const capH = lh * 0.09, bodyTop = top + capH;
    const bg = g.createRadialGradient(cx - lw * 0.12, bodyTop + bh * 0.42, lw * 0.05, cx, bodyTop + bh * 0.5, lw * 0.62);
    bg.addColorStop(0, '#ffd27a'); bg.addColorStop(0.35, '#ff7a3a'); bg.addColorStop(0.8, '#c8261c'); bg.addColorStop(1, '#7a1410');
    g.fillStyle = bg;
    g.beginPath(); g.ellipse(cx, bodyTop + bh / 2, lw / 2, bh / 2, 0, 0, TAU); g.fill();
    // ribs
    g.strokeStyle = 'rgba(90,20,10,0.45)'; g.lineWidth = 1;
    for (let k = 1; k < 7; k++) {
      const yy = bodyTop + (k / 7) * bh, dy = yy - (bodyTop + bh / 2);
      const hw = (lw / 2) * Math.sqrt(Math.max(0, 1 - (dy * dy) / ((bh / 2) * (bh / 2))));
      g.beginPath(); g.moveTo(cx - hw, yy); g.quadraticCurveTo(cx, yy + bh * 0.025, cx + hw, yy); g.stroke();
    }
    // a round crest (a simple wave mon, no lettering)
    const my = bodyTop + bh * 0.5, mr = lw * 0.19;
    g.strokeStyle = 'rgba(40,10,6,0.7)'; g.lineWidth = lw * 0.035;
    g.beginPath(); g.arc(cx, my, mr, 0, TAU); g.stroke();
    g.lineWidth = lw * 0.03; g.lineCap = 'round';
    for (let k = -1; k <= 1; k++) {
      g.beginPath(); g.arc(cx + k * mr * 0.48, my + mr * 0.2, mr * 0.26, Math.PI, 0); g.stroke();
    }
    g.fillStyle = 'rgba(40,10,6,0.7)'; g.beginPath(); g.arc(cx, my - mr * 0.4, mr * 0.13, 0, TAU); g.fill();
    // caps
    g.fillStyle = '#2a1408';
    rr(g, cx - lw * 0.3, top, lw * 0.6, capH * 1.2, capH * 0.3); g.fill();
    rr(g, cx - lw * 0.3, bodyTop + bh - capH * 0.2, lw * 0.6, capH * 1.2, capH * 0.3); g.fill();
    g.fillStyle = 'rgba(255,200,120,0.25)'; g.fillRect(cx - lw * 0.28, top + 1, lw * 0.56, 1.5);
    // tassel
    g.strokeStyle = '#d8342a'; g.lineWidth = 1.5;
    for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(cx + k, bodyTop + bh + capH); g.lineTo(cx + k * 1.6, bodyTop + bh + capH + lh * 0.2); g.stroke(); }
    // highlight
    g.fillStyle = 'rgba(255,240,200,0.25)';
    g.beginPath(); g.ellipse(cx - lw * 0.18, bodyTop + bh * 0.35, lw * 0.06, bh * 0.2, 0.2, 0, TAU); g.fill();
  });
  // 3) warm bokeh (soft circles near the edges)
  const bokeh = layer(w * 1.1, h, 0.5, (g, W, H) => {
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 26; i++) {
      const side = rnd() < 0.5;
      const x = side ? rnd() * W * 0.24 : W - rnd() * W * 0.24;
      const y = rnd() < 0.6 ? H * (0.05 + rnd() * 0.25) : H * (0.72 + rnd() * 0.22);
      const r = u * (0.02 + rnd() * 0.05);
      const col = rnd() < 0.7 ? 'rgba(255,170,90,1)' : 'rgba(255,215,150,1)';
      glow(g, x, y, r, col, 0.16 + rnd() * 0.12);
      g.globalAlpha = 0.06; g.fillStyle = col; g.beginPath(); g.arc(x, y, r * 0.55, 0, TAU); g.fill(); g.globalAlpha = 1;
    }
  });
  // 4) counter: conveyor rail + wooden counter top + front (bottom of the screen)
  const cy0 = h * 0.86, beltH = u * 0.13;
  const counter = layer(w, h - cy0 + 2, 1, (g, W, H) => {
    // belt bed (dark steel) with rails
    const bg = g.createLinearGradient(0, 0, 0, beltH);
    bg.addColorStop(0, '#3a3e44'); bg.addColorStop(0.12, '#1d2024'); bg.addColorStop(0.88, '#16181b'); bg.addColorStop(1, '#5a5f66');
    g.fillStyle = bg; g.fillRect(0, 0, W, beltH);
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(0, 0, W, 1.5); g.fillRect(0, beltH - 2, W, 1.5);
    // wooden counter top (hinoki) with grain + front lip
    const top = beltH, th = u * 0.07;
    const wg = g.createLinearGradient(0, top, 0, top + th);
    wg.addColorStop(0, '#c99a62'); wg.addColorStop(1, '#8c6238');
    g.fillStyle = wg; g.fillRect(0, top, W, th);
    g.strokeStyle = 'rgba(90,55,25,0.35)'; g.lineWidth = 1;
    for (let k = 0; k < 7; k++) { const y = top + th * (0.15 + rnd() * 0.75); g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(W * 0.3, y + 1.5, W * 0.7, y - 1.5, W, y + rnd()); g.stroke(); }
    g.fillStyle = 'rgba(255,240,210,0.35)'; g.fillRect(0, top, W, 1);
    const fy = top + th;
    const fg = g.createLinearGradient(0, fy, 0, H);
    fg.addColorStop(0, '#4a2c16'); fg.addColorStop(0.3, '#2c180b'); fg.addColorStop(1, '#120904');
    g.fillStyle = fg; g.fillRect(0, fy, W, H - fy);
    for (let x = 0; x < W; x += W / 7) { g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x, fy, 1.5, H - fy); }
  });
  // 5) plates on the belt: two periods of the loop in one strip, slid left and wrapped
  const nPl = Math.max(4, Math.round(w / (u * 0.24)));
  const period = w;
  const pr = beltH * 0.36;
  const plates = layer(period * 2, beltH, 1, (g, W, H) => {
    const tiers = [1, 5, 2, 6, 3, 8, 4, 7, 9];
    for (let i = 0; i < nPl * 2; i++) {
      g.save();
      g.translate((i + 0.5) * (period / nPl), H * 0.5);
      g.scale(1, 0.92);
      drawSushi(g, pr, tiers[(i % nPl) % tiers.length], 0, { plate: true });
      g.restore();
    }
  });
  // 6) tea cup standing on the counter, in front of the belt (steam rises from it)
  const cupW = u * 0.12, cupH = u * 0.1, cupTop = beltH + u * 0.07 * 0.55;
  const cup = layer(cupW, cupH, 1, (g, W, H) => {
    const tx = W / 2, ty = H - 2, tw = u * 0.075;
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(tx, ty + 1, tw * 0.62, tw * 0.12, 0, 0, TAU); g.fill();
    const cg = g.createLinearGradient(tx - tw / 2, 0, tx + tw / 2, 0);
    cg.addColorStop(0, '#4d6b5a'); cg.addColorStop(0.45, '#8db39a'); cg.addColorStop(1, '#3a5546');
    g.fillStyle = cg; rr(g, tx - tw / 2, ty - tw * 0.95, tw, tw * 0.95, tw * 0.16); g.fill();
    g.fillStyle = '#2f4a3a'; g.beginPath(); g.ellipse(tx, ty - tw * 0.95, tw / 2, tw * 0.1, 0, 0, TAU); g.fill();
    g.fillStyle = '#9ab86a'; g.beginPath(); g.ellipse(tx, ty - tw * 0.93, tw * 0.42, tw * 0.07, 0, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(tx - tw * 0.3, ty - tw * 0.8); g.lineTo(tx - tw * 0.3, ty - tw * 0.2); g.stroke();
  });
  // 7) steam wisp
  const sw = u * 0.12, shh = u * 0.32;
  const steam = layer(sw, shh, 0.5, (g, W, H) => {
    g.lineCap = 'round';
    for (let k = 0; k < 3; k++) {
      g.strokeStyle = `rgba(255,245,235,${0.16 - k * 0.04})`; g.lineWidth = W * (0.16 + k * 0.1);
      g.beginPath(); g.moveTo(W * 0.5, H);
      g.bezierCurveTo(W * 0.15, H * 0.7, W * 0.85, H * 0.45, W * 0.45, H * 0.05); g.stroke();
    }
  });
  return {
    draw(ctx, t, a) {
      put(ctx, room, 0, 0, a);
      put(ctx, bokeh, -w * 0.05 + Math.sin(t * 0.07) * w * 0.04, 0, a * (0.75 + 0.25 * Math.sin(t * 0.5)));
      const ly = h * 0.135;
      putRot(ctx, lantern, w * 0.12, ly, lantern.w / 2, 0, Math.sin(t * 0.9) * 0.05, a);
      putRot(ctx, lantern, w * 0.88, ly, lantern.w / 2, 0, Math.sin(t * 0.9 + 1.7) * 0.05, a);
      put(ctx, counter, 0, cy0, a);
      const off = (t * 14) % period;
      put(ctx, plates, -off, cy0, a * 0.9);
      put(ctx, cup, w * 0.9 - cupW / 2, cy0 + cupTop + u * 0.03 - cupH, a);
      // steam: rises from the tea cup, grows and fades on a 4 s loop
      const k = (t / 4) % 1;
      ctx.save();
      ctx.translate(w * 0.9 + Math.sin(t * 0.8) * 3, cy0 + cupTop + u * 0.03 - cupH * 0.85 - k * u * 0.06);
      ctx.scale(0.8 + k * 0.4, 0.8 + k * 0.4);
      ctx.globalAlpha = a * Math.sin(k * Math.PI);
      ctx.drawImage(steam.c, -sw / 2, -shh, sw, shh);
      ctx.restore();
    },
  };
}

function sakura(w, h, rnd) {
  const u = Math.min(w, h * 0.6);
  const horizon = h * 0.84;
  // 1) dusk sky + moon + distant pagoda and torii + pond, with the board veil
  const sky = layer(w, h, 1, (g, W, H) => {
    const sg = g.createLinearGradient(0, 0, 0, H);
    sg.addColorStop(0, '#120a24'); sg.addColorStop(0.5, '#1a0f2a'); sg.addColorStop(0.8, '#3a1a3c'); sg.addColorStop(0.84, '#4a2244'); sg.addColorStop(1, '#0a0612');
    g.fillStyle = sg; g.fillRect(0, 0, W, H);
    // moon (top right)
    const mx = W * 0.74, my = H * 0.11, mr = u * 0.085;
    glow(g, mx, my, mr * 4.2, 'rgba(255,200,220,1)', 0.18);
    glow(g, mx, my, mr * 1.9, 'rgba(255,235,220,1)', 0.3);
    const mg = g.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, mr * 0.1, mx, my, mr);
    mg.addColorStop(0, '#fffaf0'); mg.addColorStop(0.7, '#f6e6d4'); mg.addColorStop(1, '#e4cdbd');
    g.fillStyle = mg; g.beginPath(); g.arc(mx, my, mr, 0, TAU); g.fill();
    g.fillStyle = 'rgba(190,160,160,0.25)';
    for (const [dx, dy, s] of [[-0.3, 0.1, 0.22], [0.25, -0.2, 0.15], [0.15, 0.35, 0.12], [-0.05, -0.4, 0.09]]) {
      g.beginPath(); g.arc(mx + dx * mr, my + dy * mr, s * mr, 0, TAU); g.fill();
    }
    // thin clouds across the moon
    for (const [dx, dy, ww, hh] of [[-0.7, 0.42, 1.9, 0.2], [0.6, 0.7, 1.5, 0.16], [-0.1, 0.56, 1.1, 0.12]]) {
      g.save(); g.translate(mx + dx * mr, my + dy * mr); g.scale(ww, hh);
      const cg2 = g.createRadialGradient(0, 0, 0, 0, 0, mr);
      cg2.addColorStop(0, 'rgba(58,30,66,0.75)'); cg2.addColorStop(0.6, 'rgba(58,30,66,0.4)'); cg2.addColorStop(1, 'rgba(58,30,66,0)');
      g.fillStyle = cg2; g.beginPath(); g.arc(0, 0, mr, 0, TAU); g.fill();
      g.restore();
    }
    // distant hills
    for (const [base, amp, col, ph] of [[0.79, 0.035, '#24122c', 0.4], [0.82, 0.025, '#180c20', 2.1]]) {
      g.fillStyle = col; g.beginPath(); g.moveTo(0, H);
      for (let x = 0; x <= W; x += 4) g.lineTo(x, H * base - H * amp * (0.6 + 0.4 * Math.sin(x / W * 5 + ph)) * (0.7 + 0.3 * Math.sin(x / W * 13 + ph * 2)));
      g.lineTo(W, H); g.closePath(); g.fill();
    }
    // pagoda silhouette (left, on the hill)
    const px = W * 0.2, pb = H * 0.79, ps = u * 0.05;
    g.fillStyle = '#120818';
    g.fillRect(px - ps * 0.06, pb - ps * 6.4, ps * 0.12, ps * 1.2); // spire
    for (let i = 0; i < 5; i++) {
      const yy = pb - i * ps * 1.05, hw = ps * (1.25 - i * 0.16);
      g.fillRect(px - hw * 0.55, yy - ps * 0.8, hw * 1.1, ps * 0.8); // storey
      g.beginPath(); // curved eave
      g.moveTo(px - hw * 1.15, yy - ps * 0.62);
      g.quadraticCurveTo(px - hw * 0.6, yy - ps * 0.82, px, yy - ps * 1.12);
      g.quadraticCurveTo(px + hw * 0.6, yy - ps * 0.82, px + hw * 1.15, yy - ps * 0.62);
      g.lineTo(px + hw * 0.9, yy - ps * 0.78); g.lineTo(px - hw * 0.9, yy - ps * 0.78); g.closePath(); g.fill();
    }
    // a lit window in the pagoda
    glow(g, px, pb - ps * 1.5, ps * 0.6, 'rgba(255,170,90,1)', 0.5);
    // torii gate (right, at the pond edge)
    const tx = W * 0.8, tb = horizon + u * 0.01, ts = u * 0.07;
    g.fillStyle = '#5a1416';
    g.fillRect(tx - ts * 0.85, tb - ts * 1.9, ts * 0.12, ts * 1.9);
    g.fillRect(tx + ts * 0.73, tb - ts * 1.9, ts * 0.12, ts * 1.9);
    g.fillRect(tx - ts * 1.0, tb - ts * 1.55, ts * 2.0, ts * 0.1); // nuki
    g.beginPath(); // kasagi
    g.moveTo(tx - ts * 1.3, tb - ts * 1.98); g.quadraticCurveTo(tx, tb - ts * 1.82, tx + ts * 1.3, tb - ts * 1.98);
    g.lineTo(tx + ts * 1.22, tb - ts * 1.84); g.quadraticCurveTo(tx, tb - ts * 1.7, tx - ts * 1.22, tb - ts * 1.84); g.closePath(); g.fill();
    g.fillRect(tx - ts * 0.05, tb - ts * 1.8, ts * 0.1, ts * 0.26);
    // pond
    const pg = g.createLinearGradient(0, horizon, 0, H);
    pg.addColorStop(0, '#2a1430'); pg.addColorStop(0.4, '#160a1e'); pg.addColorStop(1, '#07040c');
    g.fillStyle = pg; g.fillRect(0, horizon, W, H - horizon);
    // reflections: torii (faint) and the moon path
    g.globalAlpha = 0.28; g.fillStyle = '#5a1416';
    g.fillRect(tx - ts * 0.85, tb, ts * 0.12, ts * 1.2); g.fillRect(tx + ts * 0.73, tb, ts * 0.12, ts * 1.2);
    g.globalAlpha = 1;
    glow(g, mx, horizon + (H - horizon) * 0.35, u * 0.12, 'rgba(255,215,220,1)', 0.12);
    // mist on the water line
    const mist = g.createLinearGradient(0, horizon - u * 0.04, 0, horizon + u * 0.05);
    mist.addColorStop(0, 'rgba(200,150,190,0)'); mist.addColorStop(0.5, 'rgba(200,150,190,0.14)'); mist.addColorStop(1, 'rgba(200,150,190,0)');
    g.fillStyle = mist; g.fillRect(0, horizon - u * 0.04, W, u * 0.09);
    boardVeil(g, W, H, 0.42);
  });
  // 2) shimmer: short light streaks on the pond (moon path), slid sideways
  const shimmer = layer(w * 1.2, h - horizon, 1, (g, W, H) => {
    g.globalCompositeOperation = 'lighter';
    const mx = w * 0.74 + w * 0.1;
    for (let i = 0; i < 46; i++) {
      const y = H * (0.05 + Math.pow(rnd(), 1.3) * 0.85);
      const spread = u * (0.04 + (y / H) * 0.16);
      const x = mx + (rnd() - 0.5) * 2 * spread;
      const len = u * (0.015 + rnd() * 0.05);
      g.fillStyle = rnd() < 0.7 ? 'rgba(255,225,230,0.5)' : 'rgba(255,180,210,0.45)';
      g.fillRect(x - len / 2, y, len, 1 + rnd());
    }
    for (let i = 0; i < 18; i++) { // faint ripples elsewhere
      const y = H * (0.1 + rnd() * 0.8), x = rnd() * W, len = u * (0.04 + rnd() * 0.08);
      g.fillStyle = 'rgba(220,170,220,0.12)'; g.fillRect(x, y, len, 1);
    }
  });
  // 3) blossom branch (painted twice with different shapes; the right one is mirrored).
  // Twigs, flowers and glows reach past the branch's len x len*0.62 box (twig tips up to ~0.3*len,
  // plus a flower and its glow ~0.1*u), so the cached canvas gets a transparent margin `pad` on every
  // side and the branch is painted offset by it. Without it the blossoms were cut by a hard edge.
  const branch = (len, seedTilt) => {
    const pad = Math.ceil(len * 0.3 + u * 0.1);
    const L = layer(len + pad * 2, len * 0.62 + pad * 2, 1, (g) => { g.translate(pad, pad); paintBranch(g, len, len * 0.62, seedTilt); });
    L.pad = pad; L.ih = len * 0.62; // inner (unpadded) height: the pivot sits at ih * 0.12
    return L;
  };
  const paintBranch = (g, W, H, seedTilt) => {
    const pts = [];
    let x = 0, y = H * 0.12, ang = 0.32 + seedTilt;
    g.lineCap = 'round';
    const seg = 9;
    for (let i = 0; i <= seg; i++) { pts.push([x, y, (1 - i / seg)]); ang += (rnd() - 0.45) * 0.35; x += Math.cos(ang) * W / seg; y += Math.sin(ang) * W / seg * 0.55; }
    const wood = (p, wMax, col) => {
      g.strokeStyle = col;
      for (let i = 0; i < p.length - 1; i++) {
        g.lineWidth = Math.max(1.2, wMax * p[i][2]);
        g.beginPath(); g.moveTo(p[i][0], p[i][1]); g.lineTo(p[i + 1][0], p[i + 1][1]); g.stroke();
      }
    };
    wood(pts, u * 0.045, '#1c0d10');
    const twigs = [];
    for (let i = 2; i < seg; i += 2) {
      const [bx, by, k] = pts[i];
      const tw = [[bx, by, k]];
      let tx = bx, ty = by, ta = (rnd() < 0.5 ? -1 : 1) * (0.6 + rnd() * 0.5) + 0.3;
      for (let j = 1; j <= 4; j++) { tx += Math.cos(ta) * W * 0.06; ty += Math.sin(ta) * W * 0.05; ta += (rnd() - 0.5) * 0.5; tw.push([tx, ty, k * (1 - j / 5)]); }
      twigs.push(tw); wood(tw, u * 0.03, '#1c0d10');
    }
    g.strokeStyle = 'rgba(120,70,70,0.4)'; g.lineWidth = 1; // top-edge highlight on the bark
    g.beginPath(); for (let i = 0; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1] - u * 0.012 * pts[i][2]); g.stroke();
    const flower = (fx, fy, fr, open) => {
      g.save(); g.translate(fx, fy); g.rotate(rnd() * TAU);
      for (let p = 0; p < 5; p++) {
        g.rotate(TAU / 5);
        const pg2 = g.createRadialGradient(0, -fr * 0.5, 0, 0, -fr * 0.5, fr * 0.7);
        pg2.addColorStop(0, open ? '#ffe8f0' : '#ffc2d6'); pg2.addColorStop(1, open ? '#ff9ec0' : '#ef7aa4');
        g.fillStyle = pg2;
        g.beginPath(); g.moveTo(0, 0);
        g.bezierCurveTo(-fr * 0.55, -fr * 0.3, -fr * 0.45, -fr, -fr * 0.1, -fr * 0.98);
        g.lineTo(0, -fr * 0.86); g.lineTo(fr * 0.1, -fr * 0.98);
        g.bezierCurveTo(fr * 0.45, -fr, fr * 0.55, -fr * 0.3, 0, 0); g.fill();
      }
      g.fillStyle = '#c23a62'; g.beginPath(); g.arc(0, 0, fr * 0.2, 0, TAU); g.fill();
      g.fillStyle = '#ffe07a';
      for (let s = 0; s < 6; s++) { const a2 = s / 6 * TAU; g.beginPath(); g.arc(Math.cos(a2) * fr * 0.32, Math.sin(a2) * fr * 0.32, fr * 0.05, 0, TAU); g.fill(); }
      g.restore();
    };
    const spots = [];
    for (let i = 1; i < pts.length; i++) spots.push(pts[i]);
    for (const tw of twigs) spots.push(...tw.slice(1));
    for (const [sx, sy] of spots) {
      glow(g, sx, sy, u * 0.07, 'rgba(255,140,190,1)', 0.12);
      const n = 2 + Math.floor(rnd() * 3);
      for (let k = 0; k < n; k++) {
        const fr = u * (0.018 + rnd() * 0.016);
        flower(sx + (rnd() - 0.5) * u * 0.06, sy + (rnd() - 0.5) * u * 0.05, fr, rnd() < 0.7);
      }
      if (rnd() < 0.5) { g.fillStyle = '#e8608e'; g.beginPath(); g.arc(sx + (rnd() - 0.5) * u * 0.05, sy + u * 0.02, u * 0.007, 0, TAU); g.fill(); } // bud
    }
  };
  const bL = branch(w * 0.3, -0.16), bR = branch(w * 0.5, 0.02); // kept to the corners: clear of the score and the board
  // 4) petal sheets (pooled: a fixed set of petals painted once, scrolled down and wrapped)
  const petals = (n, smin, smax, alpha) => layer(w, h, 1, (g, W, H) => {
    for (let i = 0; i < n; i++) {
      const x = rnd() * W, y = rnd() * H, s = smin + rnd() * (smax - smin);
      g.save(); g.translate(x, y); g.rotate(rnd() * TAU); g.scale(1, 0.45 + rnd() * 0.5);
      g.globalAlpha = alpha * (0.6 + rnd() * 0.4);
      g.fillStyle = rnd() < 0.6 ? '#ffc4d8' : '#ff9fc0';
      g.beginPath(); g.moveTo(0, -s); g.bezierCurveTo(s * 0.9, -s * 0.6, s * 0.7, s * 0.7, 0, s);
      g.bezierCurveTo(-s * 0.7, s * 0.7, -s * 0.9, -s * 0.6, 0, -s); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.4)'; g.beginPath(); g.ellipse(-s * 0.2, -s * 0.3, s * 0.18, s * 0.4, 0, 0, TAU); g.fill();
      g.restore();
    }
  });
  const far = petals(26, 1.6, 2.6, 0.45), near = petals(16, 3, 4.6, 0.75);
  return {
    draw(ctx, t, a) {
      put(ctx, sky, 0, 0, a);
      put(ctx, shimmer, -w * 0.1 + Math.sin(t * 0.35) * w * 0.03, horizon, a * (0.6 + 0.3 * Math.sin(t * 0.9)));
      // far petals fall slowly, near ones faster with a wider sway; each sheet wraps vertically
      const fy = (t * 10) % h, ny = (t * 22) % h;
      const fx = Math.sin(t * 0.3) * w * 0.03, nx = Math.sin(t * 0.45 + 1) * w * 0.06;
      put(ctx, far, fx, fy - h, a); put(ctx, far, fx, fy, a);
      put(ctx, near, nx, ny - h, a); put(ctx, near, nx, ny, a);
      // branches sway a touch in the breeze (pivot at the screen edge)
      putRot(ctx, bL, -w * 0.03, -h * 0.035, bL.pad, bL.pad + bL.ih * 0.12, Math.sin(t * 0.5) * 0.018, a * 0.85);
      ctx.save(); ctx.translate(w + w * 0.02, h * 0.075); ctx.scale(-1, 1); ctx.rotate(Math.sin(t * 0.5 + 1.2) * 0.02);
      ctx.globalAlpha = a; ctx.drawImage(bR.c, -bR.pad, -bR.pad - bR.ih * 0.12, bR.w, bR.h); ctx.restore();
    },
  };
}

const BUILDERS = { saturn, comets, binary, deep, crystal, sushi, sakura, lilypond, raintemple, ...CAT_SCENES, ...PATISSERIE_SCENES, ...DEEPSEA_SCENES, ...GARDEN_SCENES, ...SEASIDE_SCENES };

/**
 * Build a scene for a theme (backdrops.js SCENE_BACKDROPS entry) at CSS size (w, h).
 * Returns { draw(ctx, t, alpha) } or null if the theme isn't a scene.
 */
export function buildScene(theme, w, h) {
  const make = theme && BUILDERS[theme.scene];
  if (!make) return null;
  const rnd = mulberry32(hashString('scene:' + theme.id));
  return make(Math.max(2, w), Math.max(2, h), rnd, theme); // variant-aware builders (harbour) read theme.variant
}

/** Base nebula of a theme (gradient + blobs) at CSS size (w, h). Same look as the renderer's cache. */
export function paintBase(g, theme, w, h) {
  const bg = g.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, theme.grad[0]); bg.addColorStop(0.55, theme.grad[1]); bg.addColorStop(1, theme.grad[2]);
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  for (const [x, y, r, col] of theme.blobs) {
    const rg = g.createRadialGradient(x * w, y * h, 0, x * w, y * h, r * Math.max(w, h));
    rg.addColorStop(0, col); rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg; g.fillRect(0, 0, w, h);
  }
}

/** Still preview of a scene into a <canvas> (shop cards, Background rows). Sized from its CSS box. */
export function paintScenePreview(cv, theme, t = 12) {
  const r = cv.getBoundingClientRect();
  const w = Math.max(20, Math.round(r.width || 60)), h = Math.max(20, Math.round(r.height || 110));
  const dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  const g = cv.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  // compose at phone proportions so the preview matches the real screen, then fit it into the box
  const PW = 390, PH = 844, k = Math.max(w / PW, h / PH);
  g.save();
  g.translate((w - PW * k) / 2, (h - PH * k) / 2); g.scale(k, k);
  paintBase(g, theme, PW, PH);
  const sc = buildScene(theme, PW, PH);
  if (sc) sc.draw(g, t, 1);
  g.globalAlpha = 1;
  const rnd = mulberry32(hashString('preview:' + theme.id));
  g.fillStyle = '#fff';
  for (let i = 0; i < 90; i++) { g.globalAlpha = 0.3 + rnd() * 0.6; const s = 1 + rnd() * 1.6; g.fillRect(rnd() * PW, rnd() * PH, s, s); }
  g.restore();
  g.globalAlpha = 1;
}
