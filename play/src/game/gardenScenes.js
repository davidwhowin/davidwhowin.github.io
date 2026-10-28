// Cottage Garden pack scenes (DESIGN.md "Premium themed packs"): Potting Shed and Summer Border.
// Same contract as sceneArt.js: every layer is painted ONCE per screen size into an offscreen canvas, and a
// frame only draws those canvases (2-8 drawImage calls, plus save / restore / translate / rotate / scale).
// The board band keeps a baked dark veil so the pieces stay the brightest thing on screen; the lively bits
// (the string of bulbs, the butterflies) sit between the HUD and the board or at the screen edges, and the
// potting bench, the sleepy cat and the flower bed sit below the board. Calm / reduced motion stops the scene
// clock, so the picture holds still.
// Shapes come from the seeded mulberry32 stream sceneArt.js hands in (never the game RNG, never an unseeded random).

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
  return { c, w, h, res: c.width / w };
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

function put(ctx, L, x, y, alpha) {
  if (alpha <= 0.002) return;
  ctx.globalAlpha = alpha;
  ctx.drawImage(L.c, x, y, L.w, L.h);
}

/** Draw a vertically periodic layer (period L.h / 2) scrolled by `off` CSS px into the box (x, y, L.w, L.h / 2). */
function putScroll(ctx, L, x, y, off, alpha) {
  if (alpha <= 0.002) return;
  const ph = L.h / 2, k = L.res;
  const s = ph - (((off % ph) + ph) % ph);
  ctx.globalAlpha = alpha;
  ctx.drawImage(L.c, 0, s * k, L.w * k, ph * k, x, y, L.w, ph);
}

/** Dark veil over the board band (the middle of the screen), baked into a backdrop layer. */
function boardVeil(g, w, h, a) {
  const v = g.createLinearGradient(0, 0, 0, h);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(0.17, `rgba(0,0,0,${a * 0.6})`);
  v.addColorStop(0.3, `rgba(0,0,0,${a})`); v.addColorStop(0.72, `rgba(0,0,0,${a})`);
  v.addColorStop(0.86, `rgba(0,0,0,${a * 0.4})`); v.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = v; g.fillRect(0, 0, w, h);
}

function lin(g, x0, y0, x1, y1, stops) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([o, c]) => gr.addColorStop(o, c));
  return gr;
}

function ell(g, x, y, rx, ry, rot = 0) { g.beginPath(); g.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU); }

// --------------------------------------------------------------- garden pieces for the scenery

/** A terracotta pot at (x, y = base), size s, with a few leaves. */
function pot(g, x, y, s, leafCol, rnd) {
  g.fillStyle = leafCol;
  for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (rnd() - 0.5) * 1.6; ell(g, x + Math.cos(a) * s * 0.4, y - s * 0.95 + Math.sin(a) * s * 0.4, s * 0.26, s * 0.12, a); g.fill(); }
  g.fillStyle = lin(g, x - s * 0.5, 0, x + s * 0.5, 0, [[0, '#8a4424'], [0.4, '#c06a3a'], [1, '#6a3018']]);
  g.beginPath(); g.moveTo(x - s * 0.44, y - s * 0.7); g.lineTo(x + s * 0.44, y - s * 0.7); g.lineTo(x + s * 0.32, y); g.lineTo(x - s * 0.32, y); g.closePath(); g.fill();
  g.fillStyle = '#b05e30'; g.fillRect(x - s * 0.5, y - s * 0.82, s, s * 0.16);
}

/** A seed tray: a shallow wooden box of soil with rows of tiny seedlings. */
function seedTray(g, x, y, w, s, rnd) {
  g.fillStyle = '#5a3a1e'; g.fillRect(x, y - s * 0.3, w, s * 0.3);
  g.fillStyle = 'rgba(255,220,170,0.18)'; g.fillRect(x, y - s * 0.3, w, s * 0.05);
  g.fillStyle = '#2e1c0e'; g.fillRect(x + s * 0.06, y - s * 0.32, w - s * 0.12, s * 0.06);
  for (let k = x + s * 0.18; k < x + w - s * 0.1; k += s * 0.28) {
    const hh = s * (0.14 + rnd() * 0.12);
    g.strokeStyle = '#5aa040'; g.lineWidth = Math.max(1, s * 0.04);
    g.beginPath(); g.moveTo(k, y - s * 0.3); g.lineTo(k, y - s * 0.3 - hh); g.stroke();
    g.fillStyle = '#7cc85a';
    ell(g, k - s * 0.06, y - s * 0.3 - hh, s * 0.07, s * 0.035, -0.4); g.fill();
    ell(g, k + s * 0.06, y - s * 0.3 - hh, s * 0.07, s * 0.035, 0.4); g.fill();
  }
}

/** A hollyhock spike from (x, y) upward, height H: a stem with stacked open blooms, buds at the top. */
function hollyhock(g, x, y, H, col, mid, rnd) {
  g.strokeStyle = '#3e6a2a'; g.lineWidth = Math.max(2, H * 0.018); g.lineCap = 'round';
  g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + H * 0.03, y - H * 0.5, x - H * 0.01, y - H); g.stroke();
  // big leaves low down
  g.fillStyle = '#3a6e2c';
  for (const [k, s] of [[0.12, -1], [0.22, 1], [0.34, -1]]) { ell(g, x + s * H * 0.07, y - H * k, H * 0.08, H * 0.045, s * 0.4); g.fill(); }
  for (let k = 0.4; k < 1.0; k += 0.075) {
    const yy = y - H * k, xx = x + H * 0.02 * Math.sin(k * 3), s = H * (0.06 - (k - 0.4) * 0.06);
    const side = ((k * 40) | 0) % 2 ? 1 : -1;
    if (k > 0.86) { g.fillStyle = '#6aa04a'; ell(g, xx, yy, s * 0.4, s * 0.5); g.fill(); continue; }
    const bx = xx + side * s * 0.5;
    g.fillStyle = col; ell(g, bx, yy, s, s * 0.9); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.22)'; ell(g, bx - s * 0.3, yy - s * 0.3, s * 0.4, s * 0.3); g.fill();
    g.fillStyle = mid; ell(g, bx, yy, s * 0.26, s * 0.26); g.fill();
    if (rnd() < 0.4) { g.fillStyle = '#6aa04a'; ell(g, xx - side * s * 0.6, yy + s * 0.3, s * 0.3, s * 0.36); g.fill(); }
  }
}

/** A small butterfly facing up (wings open), centred at the layer middle, wing span s. */
function butterfly(g, x, y, s, up, low, dot) {
  for (const sx of [-1, 1]) {
    g.fillStyle = up; ell(g, x + sx * s * 0.27, y - s * 0.14, s * 0.27, s * 0.22, sx * 0.5); g.fill();
    g.fillStyle = low; ell(g, x + sx * s * 0.2, y + s * 0.14, s * 0.18, s * 0.15, -sx * 0.4); g.fill();
    g.fillStyle = dot; ell(g, x + sx * s * 0.3, y - s * 0.17, s * 0.06, s * 0.06); g.fill();
  }
  g.fillStyle = '#2a1a10'; ell(g, x, y, s * 0.05, s * 0.24); g.fill();
  g.strokeStyle = '#2a1a10'; g.lineWidth = Math.max(0.8, s * 0.03);
  for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(x, y - s * 0.2); g.quadraticCurveTo(x + sx * s * 0.06, y - s * 0.36, x + sx * s * 0.14, y - s * 0.4); g.stroke(); }
}

/** A round little bumblebee (seen from the side) with soft wings. */
function bee(g, x, y, s) {
  g.fillStyle = 'rgba(230,245,255,0.75)';
  ell(g, x - s * 0.1, y - s * 0.38, s * 0.22, s * 0.14, -0.5); g.fill();
  ell(g, x + s * 0.12, y - s * 0.36, s * 0.18, s * 0.11, 0.4); g.fill();
  g.fillStyle = '#ffc824'; ell(g, x, y, s * 0.42, s * 0.32); g.fill();
  g.save(); ell(g, x, y, s * 0.42, s * 0.32); g.clip();
  g.fillStyle = '#2a1a08';
  for (const k of [-0.12, 0.12]) g.fillRect(x + k * s - s * 0.06, y - s * 0.4, s * 0.12, s * 0.8);
  g.restore();
  g.fillStyle = '#2a1a08'; ell(g, x + s * 0.38, y - s * 0.02, s * 0.16, s * 0.15); g.fill();
  g.fillStyle = '#ffffff'; ell(g, x + s * 0.42, y - s * 0.06, s * 0.04, s * 0.04); g.fill();
}

// --------------------------------------------------------------- Potting Shed

function pottingshed(w, h, rnd) {
  const u = Math.min(w, h * 0.6);
  const benchY = h * 0.94; // low enough that the cat, trays and pots stay under the tide row
  const winX = w * 0.5, winY = h * 0.075, winW = u * 0.5, winH = h * 0.1;

  const base = layer(w, h, 1, (g, W, H) => {
    // warm plank wall
    g.fillStyle = lin(g, 0, 0, 0, H, [[0, '#4a3020'], [0.3, '#3a2416'], [0.7, '#2e1c10'], [1, '#1c1008']]);
    g.fillRect(0, 0, W, H);
    const pw = u * 0.14;
    for (let x = 0; x < W; x += pw) {
      g.fillStyle = `rgba(${rnd() < 0.5 ? '255,200,140' : '0,0,0'},${0.03 + rnd() * 0.05})`; g.fillRect(x, 0, pw, H);
      g.fillStyle = 'rgba(10,4,0,0.45)'; g.fillRect(x, 0, 1.5, H);
      for (let k = 0; k < 4; k++) { // grain
        g.strokeStyle = `rgba(20,8,0,${0.12 + rnd() * 0.1})`; g.lineWidth = 0.7;
        const gx = x + rnd() * pw; g.beginPath(); g.moveTo(gx, 0);
        for (let y = 0; y < H; y += 20) g.lineTo(gx + Math.sin(y * 0.02 + k) * 1.5, y);
        g.stroke();
      }
    }
    // the window: a warm sunlit sky with a garden glimpse through four panes
    glow(g, winX, winY + winH * 0.5, u * 0.7, 'rgba(255,200,120,1)', 0.22);
    g.fillStyle = lin(g, 0, winY, 0, winY + winH, [[0, '#ffe2a8'], [0.6, '#f4c27a'], [1, '#9ac06a']]);
    g.fillRect(winX - winW / 2, winY, winW, winH);
    g.fillStyle = '#5a8a3a';
    for (let x = winX - winW / 2; x < winX + winW / 2; x += u * 0.03) { ell(g, x, winY + winH * (0.86 + rnd() * 0.06), u * 0.03, winH * 0.16); g.fill(); }
    g.fillStyle = '#ffffff';
    for (let i = 0; i < 4; i++) { ell(g, winX - winW * 0.3 + rnd() * winW * 0.6, winY + winH * 0.84, u * 0.006, u * 0.006); g.fill(); }
    g.strokeStyle = '#6a4428'; g.lineWidth = u * 0.016;
    g.strokeRect(winX - winW / 2, winY, winW, winH);
    g.beginPath(); g.moveTo(winX, winY); g.lineTo(winX, winY + winH); g.moveTo(winX - winW / 2, winY + winH / 2); g.lineTo(winX + winW / 2, winY + winH / 2); g.stroke();
    g.fillStyle = '#7a5030'; g.fillRect(winX - winW * 0.58, winY + winH, winW * 1.16, u * 0.025); // sill
    // little pots on the sill
    pot(g, winX - winW * 0.36, winY + winH, u * 0.05, '#5aa040', rnd);
    pot(g, winX + winW * 0.38, winY + winH, u * 0.045, '#6ab04a', rnd);
    // hanging tools on the left wall, a straw hat on the right
    g.strokeStyle = '#2a1a0e'; g.lineWidth = u * 0.008;
    g.fillStyle = '#8a8a90'; g.fillRect(W * 0.06, H * 0.2, u * 0.012, H * 0.08);
    g.beginPath(); g.moveTo(W * 0.06 - u * 0.02, H * 0.28); g.lineTo(W * 0.06 + u * 0.032, H * 0.28); g.lineTo(W * 0.06 + u * 0.006, H * 0.31); g.closePath(); g.fill();
    g.fillStyle = 'rgba(210,170,90,0.5)'; ell(g, W * 0.92, H * 0.24, u * 0.08, u * 0.022); g.fill(); ell(g, W * 0.92, H * 0.228, u * 0.045, u * 0.03); g.fill();
    boardVeil(g, W, H, 0.48);
    // potting bench below the board: a thick plank with seed trays and pots
    g.fillStyle = lin(g, 0, benchY, 0, H, [[0, '#7a5030'], [0.12, '#5a3820'], [1, '#24140a']]);
    g.fillRect(0, benchY, W, H - benchY);
    g.fillStyle = 'rgba(255,220,170,0.25)'; g.fillRect(0, benchY, W, 1.5);
    seedTray(g, W * 0.6, benchY + 1, u * 0.22, u * 0.1, rnd);
    pot(g, W * 0.33, benchY + 1, u * 0.07, '#6ab04a', rnd);
    pot(g, W * 0.86, benchY + 1, u * 0.055, '#6ab04a', rnd);
    pot(g, W * 0.96, benchY + 1, u * 0.06, '#e07a9a', rnd);
  });

  // slanted sunbeam from the window, fading out before the board
  const beam = layer(w, h * 0.55, 1, (g, W, H) => {
    g.fillStyle = lin(g, 0, 0, 0, H, [[0, 'rgba(255,220,150,0.22)'], [0.5, 'rgba(255,220,150,0.07)'], [1, 'rgba(255,220,150,0)']]);
    g.beginPath(); g.moveTo(winX - winW * 0.5, winY + winH); g.lineTo(winX + winW * 0.5, winY + winH);
    g.lineTo(winX + winW * 0.5 + u * 0.36, H); g.lineTo(winX - winW * 0.5 + u * 0.12, H); g.closePath(); g.fill();
  });
  // dust motes drifting in the sunbeam (periodic in y)
  const mph = h * 0.3;
  const motes = layer(winW + u * 0.24, mph * 2, 2, (g, W, H) => {
    for (let i = 0; i < 16; i++) {
      const x = rnd() * W, y = rnd() * H / 2, s = u * (0.003 + rnd() * 0.004);
      for (const yy of [y, y + H / 2]) { g.fillStyle = `rgba(255,236,190,${0.45 + rnd() * 0.4})`; ell(g, x, yy, s, s); g.fill(); }
    }
  });
  // a string of bulbs dangling across the top, under the HUD
  const sw = w * 1.1, sh = u * 0.12;
  const sag = (x) => sh * 0.25 + Math.sin((x / sw) * Math.PI) * sh * 0.3;
  const bulbs = layer(sw, sh, 2, (g, W, H) => {
    g.strokeStyle = '#1a120a'; g.lineWidth = Math.max(1, u * 0.004);
    g.beginPath(); for (let x = 0; x <= W; x += 4) { if (x) g.lineTo(x, sag(x)); else g.moveTo(x, sag(x)); } g.stroke();
    for (let x = W * 0.06; x < W; x += W / 9) {
      const y = sag(x);
      g.fillStyle = '#3a2a1a'; g.fillRect(x - u * 0.006, y, u * 0.012, u * 0.014);
      g.fillStyle = 'rgba(255,214,130,0.95)'; ell(g, x, y + u * 0.026, u * 0.012, u * 0.016); g.fill();
      g.fillStyle = 'rgba(255,250,220,0.9)'; ell(g, x - u * 0.003, y + u * 0.022, u * 0.004, u * 0.006); g.fill();
    }
  });
  const bulbGlow = layer(sw, sh, 1, (g, W) => {
    for (let x = W * 0.06; x < W; x += W / 9) glow(g, x, sag(x) + u * 0.026, u * 0.05, 'rgba(255,200,110,1)', 0.55);
  });
  // a sleepy ginger cat curled on the bench (body breathes, tail tip flicks)
  const cs = u * 0.13;
  const cat = layer(cs * 1.4, cs, 2, (g, W, H) => {
    const x = W * 0.5, y = H * 0.66;
    g.fillStyle = 'rgba(0,0,0,0.35)'; ell(g, x, H * 0.95, W * 0.42, H * 0.06); g.fill();
    g.fillStyle = lin(g, 0, y - H * 0.3, 0, y + H * 0.3, [[0, '#f0a050'], [1, '#b86424']]);
    ell(g, x, y, W * 0.4, H * 0.3); g.fill();
    g.strokeStyle = 'rgba(140,60,10,0.5)'; g.lineWidth = Math.max(1, cs * 0.03);
    for (const k of [-0.2, 0, 0.2]) { g.beginPath(); g.arc(x + k * W, y - H * 0.06, H * 0.16, -2.2, -1.0); g.stroke(); }
    // head tucked on the left with ears and closed eyes
    const hx = x - W * 0.28, hy = y + H * 0.02;
    g.fillStyle = '#f2a656';
    g.beginPath(); g.moveTo(hx - H * 0.2, hy - H * 0.08); g.lineTo(hx - H * 0.16, hy - H * 0.34); g.lineTo(hx - H * 0.02, hy - H * 0.16); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(hx + H * 0.04, hy - H * 0.16); g.lineTo(hx + H * 0.16, hy - H * 0.34); g.lineTo(hx + H * 0.22, hy - H * 0.08); g.closePath(); g.fill();
    ell(g, hx, hy, H * 0.24, H * 0.2); g.fill();
    g.strokeStyle = '#4a2208'; g.lineWidth = Math.max(1, cs * 0.025);
    for (const s of [-1, 1]) { g.beginPath(); g.arc(hx + s * H * 0.09, hy - H * 0.02, H * 0.05, 0.2, Math.PI - 0.2); g.stroke(); }
    g.fillStyle = '#ff9aa8'; ell(g, hx, hy + H * 0.06, H * 0.025, H * 0.018); g.fill();
    g.fillStyle = 'rgba(255,240,220,0.6)'; ell(g, hx, hy + H * 0.1, H * 0.12, H * 0.06); g.fill();
  });
  const tail = layer(cs * 0.5, cs * 0.3, 2, (g, W, H) => {
    g.strokeStyle = '#d8843a'; g.lineWidth = H * 0.24; g.lineCap = 'round';
    g.beginPath(); g.moveTo(W * 0.05, H * 0.6); g.quadraticCurveTo(W * 0.5, H * 0.85, W * 0.85, H * 0.4); g.stroke();
    g.strokeStyle = '#fff0dc'; g.lineWidth = H * 0.2;
    g.beginPath(); g.moveTo(W * 0.78, H * 0.47); g.lineTo(W * 0.88, H * 0.36); g.stroke();
  });
  const zz = layer(u * 0.08, u * 0.08, 2, (g, W, H) => {
    g.fillStyle = 'rgba(255,240,210,0.85)'; g.font = `600 ${H * 0.4}px sans-serif`;
    g.fillText('z', W * 0.1, H * 0.9); g.font = `600 ${H * 0.3}px sans-serif`; g.fillText('z', W * 0.55, H * 0.45);
  });
  const catX = w * 0.03, catY = benchY - cs * 0.86;

  return {
    draw(ctx, t, a) {
      put(ctx, base, 0, 0, a);
      put(ctx, beam, Math.sin(t * 0.05) * u * 0.02, 0, a * (0.8 + 0.2 * Math.sin(t * 0.21)));
      putScroll(ctx, motes, winX - motes.w / 2 + u * 0.08, winY + winH, -t * u * 0.012, a * 0.8);
      ctx.save(); ctx.translate(w * 0.5, h * 0.135); ctx.rotate(Math.sin(t * 0.4) * 0.008);
      put(ctx, bulbs, -sw / 2, 0, a);
      put(ctx, bulbGlow, -sw / 2, 0, a * (0.75 + 0.15 * Math.sin(t * 1.3) + 0.1 * Math.sin(t * 2.9)));
      ctx.restore();
      ctx.save(); ctx.translate(catX + cat.w * 0.5, catY + cat.h); ctx.scale(1, 1 + 0.025 * Math.sin(t * 1.4));
      put(ctx, cat, -cat.w * 0.5, -cat.h, a);
      ctx.restore();
      ctx.save(); ctx.translate(catX + cat.w * 0.82, catY + cat.h * 0.78); ctx.rotate(Math.sin(t * 0.8) * 0.18);
      put(ctx, tail, -tail.w * 0.05, -tail.h * 0.6, a);
      ctx.restore();
      const zp = (t * 0.25) % 1;
      put(ctx, zz, catX + cs * 0.05 + zp * u * 0.03, catY - u * 0.02 - zp * u * 0.07, a * Math.sin(zp * Math.PI) * 0.8);
    },
  };
}

// --------------------------------------------------------------- Summer Border

function summerborder(w, h, rnd) {
  const u = Math.min(w, h * 0.6);
  const bedY = h * 0.885;

  const base = layer(w, h, 1, (g, W, H) => {
    // golden-hour sky: warm amber up top fading to dusky plum
    g.fillStyle = lin(g, 0, 0, 0, H, [[0, '#6a3a24'], [0.16, '#4e2c22'], [0.45, '#2e1c1c'], [0.8, '#1e1416'], [1, '#120c0c']]);
    g.fillRect(0, 0, W, H);
    glow(g, W * 0.78, H * 0.06, W * 0.8, 'rgba(255,190,110,1)', 0.3);
    // a distant hedge and a cottage roofline
    g.fillStyle = 'rgba(40,50,26,0.85)';
    g.beginPath(); g.moveTo(0, H * 0.24);
    for (let x = 0; x <= W; x += u * 0.04) g.lineTo(x, H * 0.22 - u * (0.01 + 0.012 * Math.sin(x / u * 11) + rnd() * 0.012));
    g.lineTo(W, H * 0.3); g.lineTo(0, H * 0.3); g.closePath(); g.fill();
    g.fillStyle = 'rgba(60,36,30,0.85)';
    g.beginPath(); g.moveTo(W * 0.12, H * 0.215); g.lineTo(W * 0.22, H * 0.175); g.lineTo(W * 0.34, H * 0.215); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,200,120,0.5)'; g.fillRect(W * 0.2, H * 0.195, u * 0.02, u * 0.02);
    boardVeil(g, W, H, 0.5);
    // the flower bed below the board
    g.fillStyle = lin(g, 0, bedY, 0, H, [[0, '#2e3a1a'], [0.4, '#1e2612'], [1, '#100c08']]);
    g.fillRect(0, bedY, W, H - bedY);
    const cols = ['#ff86b8', '#ffd23a', '#ffffff', '#b896f0', '#ff9a5a', '#e8344a'];
    for (let i = 0; i < 46; i++) {
      const x = rnd() * W, y = bedY + u * 0.01 + rnd() * (H - bedY) * 0.7, s = u * (0.012 + rnd() * 0.012);
      g.fillStyle = '#3a6a2a'; ell(g, x, y + s, s * 1.4, s * 0.6, rnd() - 0.5); g.fill();
      g.fillStyle = cols[i % cols.length]; g.globalAlpha = 0.85;
      for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU; ell(g, x + Math.cos(a) * s * 0.5, y + Math.sin(a) * s * 0.5, s * 0.45, s * 0.45); g.fill(); }
      g.globalAlpha = 1;
      g.fillStyle = '#ffcc40'; ell(g, x, y, s * 0.25, s * 0.25); g.fill();
    }
    g.fillStyle = 'rgba(255,220,150,0.18)'; g.fillRect(0, bedY, W, 1.5);
  });
  // soft sun haze that breathes slowly
  const haze = layer(w, h * 0.4, 1, (g, W, H) => {
    glow(g, W * 0.78, H * 0.1, W * 0.55, 'rgba(255,214,140,1)', 0.25);
  });
  // hollyhocks at the screen edges, swaying from their roots
  const hhH = h * 0.42;
  const hollyL = layer(u * 0.2, hhH, 2, (g, W, H) => {
    hollyhock(g, W * 0.35, H, H * 0.96, '#ff86b8', '#fff0a0', rnd);
    hollyhock(g, W * 0.75, H, H * 0.74, '#ffffff', '#ffd23a', rnd);
  });
  const hollyR = layer(u * 0.2, hhH * 0.9, 2, (g, W, H) => {
    hollyhock(g, W * 0.4, H, H * 0.96, '#e8344a', '#ffe0a0', rnd);
    hollyhock(g, W * 0.78, H, H * 0.7, '#ffb0d0', '#fff0a0', rnd);
  });
  // two butterflies and a bee, painted once; the flap is a horizontal scale
  const bs = u * 0.07;
  const bfA = layer(bs, bs, 3, (g, W, H) => butterfly(g, W / 2, H / 2, W * 0.9, '#ffb46a', '#ffd89a', '#ffffff'));
  const bfB = layer(bs, bs, 3, (g, W, H) => butterfly(g, W / 2, H / 2, W * 0.9, '#c8b0ff', '#f0e0ff', '#ffffff'));
  const beeL = layer(u * 0.06, u * 0.06, 3, (g, W, H) => bee(g, W / 2, H * 0.58, W * 0.7));
  // floating pollen (periodic in y), drawn up the left edge
  const pph = h * 0.5;
  const pollen = layer(u * 0.12, pph * 2, 2, (g, W, H) => {
    for (let i = 0; i < 10; i++) {
      const x = rnd() * W, y = rnd() * H / 2, s = u * (0.003 + rnd() * 0.004);
      for (const yy of [y, y + H / 2]) { g.fillStyle = 'rgba(255,230,150,0.75)'; ell(g, x, yy, s, s); g.fill(); }
    }
  });
  const flap = (t, k) => 0.35 + 0.65 * Math.abs(Math.cos(t * k));
  const cross = w + u * 0.4;

  return {
    draw(ctx, t, a) {
      put(ctx, base, 0, 0, a);
      put(ctx, haze, 0, 0, a * (0.7 + 0.3 * Math.sin(t * 0.18)));
      ctx.save(); ctx.translate(0, h); ctx.rotate(Math.sin(t * 0.5) * 0.025);
      put(ctx, hollyL, -hollyL.w * 0.35, -hollyL.h, a * 0.9);
      ctx.restore();
      ctx.save(); ctx.translate(w, h * 0.98); ctx.rotate(Math.sin(t * 0.43 + 1.1) * 0.025); ctx.scale(-1, 1);
      put(ctx, hollyR, -hollyR.w * 0.35, -hollyR.h, a * 0.9);
      ctx.restore();
      // butterfly A drifts slowly across the band between the HUD and the board
      const ax = ((t * u * 0.025) % cross) - u * 0.2, ay = h * 0.165 + Math.sin(t * 0.7) * u * 0.02;
      ctx.save(); ctx.translate(ax, ay); ctx.rotate(0.25 + Math.sin(t * 0.9) * 0.15); ctx.scale(flap(t, 5.2), 1);
      put(ctx, bfA, -bs / 2, -bs / 2, a * 0.9);
      ctx.restore();
      // butterfly B loops near the right edge, beside the board
      const bx = w * 0.93 + Math.sin(t * 0.31) * u * 0.04, by = h * 0.5 + Math.sin(t * 0.23) * h * 0.12;
      ctx.save(); ctx.translate(bx, by); ctx.rotate(Math.sin(t * 0.6) * 0.3); ctx.scale(flap(t + 1, 4.6), 1);
      put(ctx, bfB, -bs / 2, -bs / 2, a * 0.75);
      ctx.restore();
      // a bee bumbling over the flower bed, well below the HUD labels
      const ex = w * 0.5 + Math.sin(t * 0.37) * w * 0.32, ey = bedY + u * 0.04 + Math.sin(t * 1.9) * u * 0.012;
      ctx.save(); ctx.translate(ex, ey); ctx.scale(Math.cos(t * 0.37) >= 0 ? 1 : -1, 1);
      put(ctx, beeL, -beeL.w / 2, -beeL.h / 2, a);
      ctx.restore();
      putScroll(ctx, pollen, w * 0.02, h * 0.3, -t * u * 0.02, a * 0.6);
    },
  };
}

export const GARDEN_SCENES = { pottingshed, summerborder };
