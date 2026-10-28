// Cat Café pack scenes (DESIGN.md "Premium themed packs"): Rainy Café and Rooftop Night.
// Same contract as sceneArt.js: every layer is painted ONCE per screen size into an offscreen canvas, and a
// frame only draws those canvases (2-8 drawImage calls, plus save / restore / translate / rotate / scale).
// The board band keeps a baked dark veil so the pieces stay the brightest thing on screen; the lively bits
// (window, lamp, latte, moon, chimney cat) sit between the HUD and the board or below the board, and the
// area behind the score stays dim. Calm / reduced motion stops the scene clock, so the picture holds still.
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

/** Draw a vertically periodic layer (period L.h / 2) scrolled down by `off` CSS px into the box (x, y, L.w, L.h / 2). */
function putScroll(ctx, L, x, y, off, alpha) {
  if (alpha <= 0.002) return;
  const ph = L.h / 2, k = L.res;
  const s = ph - (((off % ph) + ph) % ph);
  ctx.globalAlpha = alpha;
  ctx.drawImage(L.c, 0, s * k, L.w * k, ph * k, x, y, L.w, ph);
}

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

function lin(g, x0, y0, x1, y1, stops) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([o, c]) => gr.addColorStop(o, c));
  return gr;
}

// ------------------------------------------------------------------ Rainy Café

function catcafe(w, h, rnd) {
  const u = Math.min(w, h * 0.6);
  // window over the top band (behind the HUD, glass kept dim), sill just above the board
  const wx = w * 0.05, wy = h * 0.018, ww = w * 0.9, sillY = h * 0.232;
  const transom = wy + h * 0.035; // glass below the transom bar is where the rain runs
  const gx = wx, gy = transom + u * 0.008, gw = ww, gh = sillY - gy;
  const mull = [wx + ww / 3, wx + ww * 2 / 3], mw = u * 0.014;
  const lampX = w * 0.84, shadeY = h * 0.168, shadeW = u * 0.14;
  const cupX = w * 0.885, tableY = h * 0.89;
  const inMullion = (x) => mull.some((m) => Math.abs(x - m) < mw * 0.9);

  const base = layer(w, h, 1, (g, W, H) => {
    // warm wall + soft wallpaper stripes
    g.fillStyle = lin(g, 0, 0, 0, H, [[0, '#2c1a10'], [0.5, '#1f130c'], [1, '#120a06']]);
    g.fillRect(0, 0, W, H);
    for (let x = 0; x < W; x += W / 13) { g.fillStyle = 'rgba(255,200,150,0.035)'; g.fillRect(x, 0, W / 26, H); }
    glow(g, lampX, shadeY + u * 0.05, u * 0.9, 'rgba(255,170,90,1)', 0.16); // lamp light on the wall
    boardVeil(g, W, H, 0.45);
    // window glass: night city through the rain, misted at the bottom
    g.fillStyle = lin(g, 0, wy, 0, sillY, [[0, '#0b1424'], [0.55, '#14223a'], [1, '#1f2a3c']]);
    g.fillRect(wx, wy, ww, sillY - wy);
    g.save();
    g.beginPath(); g.rect(wx, wy, ww, sillY - wy); g.clip();
    for (let i = 0; i < 16; i++) { // far buildings
      const bx = wx + rnd() * ww, bw = u * (0.05 + rnd() * 0.09), bh = (sillY - wy) * (0.25 + rnd() * 0.45);
      g.fillStyle = 'rgba(6,10,22,0.75)'; g.fillRect(bx, sillY - bh, bw, bh);
    }
    for (let i = 0; i < 46; i++) { // blurry city lights (bokeh)
      const x = wx + rnd() * ww, y = wy + (sillY - wy) * (0.35 + rnd() * 0.62), r = u * (0.008 + rnd() * 0.03);
      const c = rnd();
      glow(g, x, y, r, c < 0.55 ? 'rgba(255,190,110,1)' : c < 0.8 ? 'rgba(120,200,255,1)' : 'rgba(255,120,170,1)', 0.18 + rnd() * 0.3);
    }
    g.fillStyle = lin(g, 0, sillY - (sillY - wy) * 0.35, 0, sillY, [[0, 'rgba(190,210,235,0)'], [1, 'rgba(190,210,235,0.12)']]);
    g.fillRect(wx, wy, ww, sillY - wy);
    for (let i = 0; i < 120; i++) { // still condensation beads
      const x = wx + rnd() * ww, y = gy + rnd() * gh;
      if (inMullion(x)) continue;
      g.fillStyle = `rgba(200,220,245,${0.08 + rnd() * 0.14})`;
      g.beginPath(); g.arc(x, y, 0.6 + rnd() * 1.2, 0, TAU); g.fill();
    }
    g.restore();
    // window frame: outer frame, transom bar, two mullions (warm painted wood)
    const wood = (x, y, w2, h2) => {
      g.fillStyle = lin(g, x, y, x + w2, y + h2, [[0, '#5a3a22'], [0.5, '#3e2414'], [1, '#2a170c']]);
      g.fillRect(x, y, w2, h2);
      g.fillStyle = 'rgba(255,200,140,0.18)'; g.fillRect(x, y, w2, Math.max(1, Math.min(w2, h2) * 0.18));
    };
    const fw = u * 0.022;
    wood(wx - fw, wy - fw, ww + fw * 2, fw);
    wood(wx - fw, wy, fw, sillY - wy);
    wood(wx + ww, wy, fw, sillY - wy);
    wood(wx, transom - u * 0.006, ww, u * 0.014);
    for (const m of mull) wood(m - mw / 2, wy, mw, sillY - wy);
    // sill (deeper, catches the lamp light)
    g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(wx - fw * 1.6, sillY + u * 0.018, ww + fw * 3.2, u * 0.012);
    g.fillStyle = lin(g, 0, sillY, 0, sillY + u * 0.02, [[0, '#8a5a34'], [0.35, '#6a4024'], [1, '#3a2010']]);
    rr(g, wx - fw * 1.6, sillY - u * 0.004, ww + fw * 3.2, u * 0.024, u * 0.006); g.fill();
    g.fillStyle = 'rgba(255,214,160,0.35)'; g.fillRect(wx - fw * 1.6, sillY - u * 0.004, ww + fw * 3.2, 1);
    // curtains at the sides, tied back
    for (const side of [0, 1]) {
      g.save();
      if (side) { g.translate(W, 0); g.scale(-1, 1); }
      const cw = w * 0.085;
      g.beginPath();
      g.moveTo(0, 0); g.lineTo(cw * 1.25, 0);
      g.quadraticCurveTo(cw * 0.95, sillY * 0.55, cw * 0.55, sillY * 0.7);
      g.quadraticCurveTo(cw * 0.75, sillY * 0.9, cw * 0.9, sillY * 1.04);
      g.lineTo(0, sillY * 1.08); g.closePath();
      g.fillStyle = lin(g, 0, 0, cw * 1.2, 0, [[0, '#3a0c12'], [0.3, '#6a1a22'], [0.55, '#4a1018'], [0.8, '#7a2430'], [1, '#4a1018']]);
      g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1; g.stroke();
      g.fillStyle = '#c8962e'; rr(g, cw * 0.38, sillY * 0.67, cw * 0.4, u * 0.012, u * 0.006); g.fill(); // tie-back
      g.restore();
    }
    // café table across the bottom
    g.fillStyle = lin(g, 0, tableY, 0, H, [[0, '#6e4428'], [0.18, '#5a361e'], [0.2, '#3a2012'], [1, '#1c0e06']]);
    g.fillRect(0, tableY, W, H - tableY);
    g.fillStyle = 'rgba(255,214,160,0.3)'; g.fillRect(0, tableY, W, 1.5);
    g.strokeStyle = 'rgba(30,14,4,0.35)'; g.lineWidth = 1;
    for (let i = 0; i < 7; i++) { // grain
      const y = tableY + (H - tableY) * (0.05 + rnd() * 0.12);
      g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= W; x += 20) g.lineTo(x, y + Math.sin(x / 40 + i) * 1.2); g.stroke();
    }
    glow(g, cupX, tableY + u * 0.02, u * 0.22, 'rgba(255,170,90,1)', 0.18);
    // latte: saucer, mug, foam with a heart
    const cy = tableY + u * 0.035, cr = u * 0.06;
    g.fillStyle = 'rgba(0,0,0,0.4)'; g.beginPath(); g.ellipse(cupX, cy + cr * 0.62, cr * 1.6, cr * 0.32, 0, 0, TAU); g.fill();
    g.fillStyle = lin(g, 0, cy + cr * 0.3, 0, cy + cr * 0.8, [[0, '#f4ece2'], [1, '#b8a898']]);
    g.beginPath(); g.ellipse(cupX, cy + cr * 0.52, cr * 1.5, cr * 0.28, 0, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = u * 0.006;
    g.beginPath(); g.arc(cupX + cr * 1.08, cy - cr * 0.05, cr * 0.36, -1.2, 1.3); g.stroke(); // handle
    g.strokeStyle = '#d8ccbe'; g.lineWidth = u * 0.012;
    g.beginPath(); g.arc(cupX + cr * 1.08, cy - cr * 0.05, cr * 0.36, -1.2, 1.3); g.stroke();
    g.fillStyle = lin(g, cupX - cr, 0, cupX + cr, 0, [[0, '#c8b8a6'], [0.35, '#fff8ee'], [1, '#bcae9e']]);
    g.beginPath(); g.moveTo(cupX - cr * 1.08, cy - cr * 0.5); g.lineTo(cupX + cr * 1.08, cy - cr * 0.5);
    g.quadraticCurveTo(cupX + cr * 1.02, cy + cr * 0.5, cupX + cr * 0.7, cy + cr * 0.55); g.lineTo(cupX - cr * 0.7, cy + cr * 0.55);
    g.quadraticCurveTo(cupX - cr * 1.02, cy + cr * 0.5, cupX - cr * 1.08, cy - cr * 0.5); g.fill();
    g.fillStyle = '#e8dccb'; g.beginPath(); g.ellipse(cupX, cy - cr * 0.5, cr * 1.08, cr * 0.26, 0, 0, TAU); g.fill();
    g.fillStyle = '#b07040'; g.beginPath(); g.ellipse(cupX, cy - cr * 0.5, cr * 0.96, cr * 0.2, 0, 0, TAU); g.fill();
    g.fillStyle = '#f6e8d4';
    g.beginPath(); const hx = cupX, hy = cy - cr * 0.48, hs = cr * 0.22;
    g.moveTo(hx, hy + hs * 0.5); g.bezierCurveTo(hx - hs * 1.6, hy - hs * 0.2, hx - hs * 0.6, hy - hs * 0.9, hx, hy - hs * 0.3);
    g.bezierCurveTo(hx + hs * 0.6, hy - hs * 0.9, hx + hs * 1.6, hy - hs * 0.2, hx, hy + hs * 0.5); g.fill();
    // a croissant on a little plate (left)
    const px = w * 0.13, py = tableY + u * 0.045;
    g.fillStyle = 'rgba(0,0,0,0.4)'; g.beginPath(); g.ellipse(px, py + u * 0.02, u * 0.1, u * 0.02, 0, 0, TAU); g.fill();
    g.fillStyle = lin(g, 0, py - u * 0.01, 0, py + u * 0.025, [[0, '#f4ece2'], [1, '#a89888']]);
    g.beginPath(); g.ellipse(px, py + u * 0.008, u * 0.095, u * 0.022, 0, 0, TAU); g.fill();
    for (let i = -2; i <= 2; i++) {
      const sx = px + i * u * 0.022, s = u * (0.026 - Math.abs(i) * 0.005);
      g.fillStyle = lin(g, 0, py - s, 0, py + s * 0.4, [[0, '#f2b45a'], [0.6, '#c87828'], [1, '#7a4010']]);
      g.beginPath(); g.ellipse(sx, py - s * 0.2 + Math.abs(i) * u * 0.004, s * 0.75, s, 0, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(90,40,8,0.6)'; g.lineWidth = 1; g.stroke();
    }
  });

  // rain outside the glass: thin streaks, one period painted twice (seamless vertical scroll)
  const streaks = layer(gw, gh * 2, 1, (g, W, H) => {
    const P = H / 2;
    g.lineCap = 'round';
    for (let i = 0; i < 90; i++) {
      const x = rnd() * W, y = rnd() * P, len = u * (0.02 + rnd() * 0.035);
      if (inMullion(gx + x) || inMullion(gx + x - len * 0.12)) continue;
      g.strokeStyle = `rgba(170,200,240,${0.12 + rnd() * 0.2})`; g.lineWidth = 0.8 + rnd() * 0.6;
      for (const oy of [0, P]) { g.beginPath(); g.moveTo(x, y + oy); g.lineTo(x - len * 0.12, y + oy + len); g.stroke(); }
    }
  });
  // drops running down the glass: a bright bead with a wet trail above it
  const drops = layer(gw, gh * 2, 2, (g, W, H) => {
    const P = H / 2;
    for (let i = 0; i < 26; i++) {
      const x = rnd() * W, y = rnd() * P, s = u * (0.005 + rnd() * 0.006), tl = u * (0.03 + rnd() * 0.07);
      if (inMullion(gx + x)) continue;
      for (const oy of [-P, 0, P]) {
        const yy = y + oy;
        g.fillStyle = lin(g, 0, yy - tl, 0, yy, [[0, 'rgba(190,215,245,0)'], [1, 'rgba(190,215,245,0.28)']]);
        g.fillRect(x - s * 0.35, yy - tl, s * 0.7, tl);
        const rg = g.createRadialGradient(x - s * 0.3, yy - s * 0.3, 0, x, yy, s * 1.2);
        rg.addColorStop(0, 'rgba(255,255,255,0.95)'); rg.addColorStop(0.45, 'rgba(170,205,245,0.55)'); rg.addColorStop(1, 'rgba(120,160,220,0)');
        g.fillStyle = rg; g.beginPath(); g.ellipse(x, yy, s, s * 1.25, 0, 0, TAU); g.fill();
      }
    }
  });
  // pendant lamp (shade + bulb + warm cone), drawn over the rain with a soft flicker
  const lampH = sillY + u * 0.2;
  const lamp = layer(u * 0.7, lampH, 2, (g, W) => {
    const cx = W / 2;
    glow(g, cx, shadeY + u * 0.06, u * 0.32, 'rgba(255,190,110,1)', 0.45);
    glow(g, cx, shadeY + u * 0.05, u * 0.12, 'rgba(255,230,170,1)', 0.6);
    g.strokeStyle = '#120a06'; g.lineWidth = u * 0.006;
    g.beginPath(); g.moveTo(cx, 0); g.lineTo(cx, shadeY - u * 0.04); g.stroke();
    g.fillStyle = '#2a1a10'; rr(g, cx - u * 0.012, shadeY - u * 0.05, u * 0.024, u * 0.022, u * 0.005); g.fill();
    g.beginPath(); // enamel shade
    g.moveTo(cx - u * 0.02, shadeY - u * 0.03);
    g.quadraticCurveTo(cx - shadeW * 0.42, shadeY - u * 0.02, cx - shadeW / 2, shadeY + u * 0.035);
    g.lineTo(cx + shadeW / 2, shadeY + u * 0.035);
    g.quadraticCurveTo(cx + shadeW * 0.42, shadeY - u * 0.02, cx + u * 0.02, shadeY - u * 0.03); g.closePath();
    g.fillStyle = lin(g, cx - shadeW / 2, 0, cx + shadeW / 2, 0, [[0, '#0e3a30'], [0.35, '#2c7a62'], [0.6, '#1a5a48'], [1, '#08241e']]); g.fill();
    g.fillStyle = lin(g, cx - shadeW / 2, 0, cx + shadeW / 2, 0, [[0, '#8a6020'], [0.4, '#ffd27a'], [1, '#7a5018']]);
    g.fillRect(cx - shadeW / 2, shadeY + u * 0.03, shadeW, u * 0.008);
    g.fillStyle = 'rgba(255,255,255,0.3)'; g.beginPath(); g.ellipse(cx - shadeW * 0.2, shadeY, shadeW * 0.08, u * 0.01, -0.5, 0, TAU); g.fill();
    const bg = g.createRadialGradient(cx, shadeY + u * 0.042, 0, cx, shadeY + u * 0.042, u * 0.022);
    bg.addColorStop(0, '#fffbe8'); bg.addColorStop(0.6, '#ffe0a0'); bg.addColorStop(1, 'rgba(255,200,120,0)');
    g.fillStyle = bg; g.beginPath(); g.arc(cx, shadeY + u * 0.042, u * 0.022, 0, TAU); g.fill();
  });
  // sleeping cat curled on the sill (ginger, lit warm from the right), breathes slowly
  const catW = u * 0.2, catH = u * 0.1;
  const cat = layer(catW, catH, 2, (g, W, H) => {
    const cx = W * 0.5, by = H * 0.96;
    g.fillStyle = 'rgba(0,0,0,0.4)'; g.beginPath(); g.ellipse(cx, by, W * 0.46, H * 0.06, 0, 0, TAU); g.fill();
    const fur = lin(g, W * 0.1, H * 0.2, W * 0.9, H, [[0, '#f0a050'], [0.5, '#c86a28'], [1, '#6a3010']]);
    g.fillStyle = fur; g.strokeStyle = '#3a1806'; g.lineWidth = 1.2;
    g.beginPath(); g.ellipse(cx + W * 0.05, by - H * 0.36, W * 0.38, H * 0.36, 0, 0, TAU); g.fill(); g.stroke(); // body
    g.strokeStyle = 'rgba(120,50,10,0.55)'; g.lineWidth = 1.6;
    for (const a of [-2.3, -1.9, -1.5]) { g.beginPath(); g.arc(cx + W * 0.05, by - H * 0.36, W * 0.3, a - 0.1, a + 0.1); g.stroke(); }
    // tail wrapped round the front
    g.strokeStyle = '#3a1806'; g.lineWidth = H * 0.2; g.lineCap = 'round';
    g.beginPath(); g.moveTo(cx + W * 0.4, by - H * 0.2); g.quadraticCurveTo(cx + W * 0.2, by + H * 0.02, cx - W * 0.22, by - H * 0.08); g.stroke();
    g.strokeStyle = '#d8843a'; g.lineWidth = H * 0.15;
    g.beginPath(); g.moveTo(cx + W * 0.4, by - H * 0.2); g.quadraticCurveTo(cx + W * 0.2, by + H * 0.02, cx - W * 0.22, by - H * 0.08); g.stroke();
    // head tucked on the left
    const hx = cx - W * 0.24, hy = by - H * 0.38;
    for (const s of [-1, 1]) {
      g.fillStyle = '#c86a28'; g.strokeStyle = '#3a1806'; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(hx + s * W * 0.1, hy - H * 0.16); g.lineTo(hx + s * W * 0.06, hy - H * 0.5); g.lineTo(hx + s * W * 0.01, hy - H * 0.22); g.closePath(); g.fill(); g.stroke();
    }
    g.fillStyle = lin(g, hx - W * 0.1, hy - H * 0.3, hx + W * 0.1, hy + H * 0.2, [[0, '#f6b060'], [1, '#b05a20']]);
    g.beginPath(); g.ellipse(hx, hy, W * 0.13, H * 0.27, 0, 0, TAU); g.fill(); g.strokeStyle = '#3a1806'; g.stroke();
    g.strokeStyle = '#2a1004'; g.lineWidth = 1.3; g.lineCap = 'round';
    for (const s of [-1, 1]) { g.beginPath(); g.arc(hx + s * W * 0.05, hy - H * 0.02, W * 0.025, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); }
    g.fillStyle = '#ff8aa6'; g.beginPath(); g.arc(hx, hy + H * 0.06, W * 0.012, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,230,180,0.5)'; g.beginPath(); g.ellipse(cx + W * 0.12, by - H * 0.6, W * 0.12, H * 0.06, -0.2, 0, TAU); g.fill(); // rim light
  });
  const catX = w * 0.22, catY = sillY - catH * 0.92;
  // steam wisps over the latte (rise and fade; two copies out of phase)
  const steam = layer(u * 0.08, u * 0.1, 2, (g, W, H) => {
    g.lineCap = 'round';
    for (const [dx, ph] of [[-0.18, 0], [0.16, 1.7]]) {
      g.strokeStyle = 'rgba(255,245,235,0.35)'; g.lineWidth = W * 0.12;
      g.beginPath(); g.moveTo(W * (0.5 + dx), H);
      for (let i = 1; i <= 12; i++) { const y = H - (i / 12) * H * 0.95; g.lineTo(W * (0.5 + dx) + Math.sin(i * 0.7 + ph) * W * 0.16, y); }
      g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = W * 0.05; g.stroke();
    }
  });
  const steamX = cupX - steam.w / 2, steamY = tableY - steam.h * 0.42;

  return {
    draw(ctx, t, a) {
      put(ctx, base, 0, 0, a);
      putScroll(ctx, streaks, gx, gy, t * u * 0.9, a * 0.9);
      putScroll(ctx, drops, gx, gy, t * u * 0.055, a);
      put(ctx, lamp, lampX - lamp.w / 2, 0, a * (0.95 + 0.05 * Math.sin(t * 2.3) * Math.sin(t * 0.7)));
      // the cat breathes: a slow 2% swell anchored at the sill
      ctx.save();
      ctx.translate(catX, sillY); ctx.scale(1, 1 + 0.025 * Math.sin(t * 1.3));
      ctx.globalAlpha = a; ctx.drawImage(cat.c, -cat.w / 2, catY - sillY, cat.w, cat.h);
      ctx.restore();
      for (const k of [0, 0.5]) {
        const p = (t * 0.22 + k) % 1;
        put(ctx, steam, steamX + Math.sin(t * 0.8 + k * 5) * u * 0.006, steamY - p * u * 0.025, a * 0.8 * Math.sin(Math.PI * p));
      }
    },
  };
}

// ------------------------------------------------------------------ Rooftop Night

function rooftop(w, h, rnd) {
  const u = Math.min(w, h * 0.6);
  // the moon and the chimney cat sit between the HUD and the board (right); city roofs below the board
  const moonX = w * 0.8, moonY = h * 0.172, moonR = u * 0.088;
  const roofY = h * 0.236, bldX = w * 0.6; // the near building top right
  const chX = w * 0.785, chW = u * 0.075, chTop = h * 0.21;
  const catBaseY = chTop, catCX = chX + chW / 2;
  const nearY = h * 0.872;

  // building geometry first (shared by the base and the window layers)
  const far = [];
  for (let x = -u * 0.02; x < w; ) {
    const bw = u * (0.07 + rnd() * 0.1);
    far.push({ x, w: bw, top: h * (0.6 + rnd() * 0.2) });
    x += bw + u * 0.004;
  }
  const tower = { x: w * 0.06, w: u * 0.07, top: h * 0.162 }; // tall distant tower top left, beacon on its mast
  const near = [];
  for (let x = -u * 0.03; x < w; ) {
    const bw = u * (0.16 + rnd() * 0.16);
    near.push({ x, w: bw, top: nearY + h * (rnd() * 0.03 - 0.01) });
    x += bw;
  }
  const winSets = [[], [], []]; // 0 always on (base), 1 and 2 twinkle in turn
  const addWin = (x, y, ww, wh) => winSets[rnd() < 0.5 ? 0 : rnd() < 0.5 ? 1 : 2].push([x, y, ww, wh, rnd()]);
  const grid = (b, y0, y1, cols) => {
    const cw = b.w / cols;
    for (let c = 0; c < cols; c++) for (let y = y0; y < y1; y += u * 0.03) if (rnd() < 0.45) addWin(b.x + c * cw + cw * 0.28, y, cw * 0.44, u * 0.014);
  };
  for (const b of far) if (b.x < w * 0.07 || b.x + b.w > w * 0.93) grid(b, b.top + u * 0.02, h * 0.86, 3);
  grid(tower, tower.top + u * 0.03, h * 0.26, 2);
  grid({ x: bldX + u * 0.02, w: w - bldX }, roofY + u * 0.01, h * 0.27, 6);
  for (const b of near) grid(b, b.top + u * 0.035, h, Math.max(3, Math.round(b.w / (u * 0.05))));

  const base = layer(w, h, 1, (g, W, H) => {
    g.fillStyle = lin(g, 0, 0, 0, H, [[0, '#070a1c'], [0.35, '#0e1432'], [0.7, '#1a1a3c'], [0.9, '#2a2048'], [1, '#120c1e']]);
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 110; i++) { // stars
      const x = rnd() * W, y = rnd() * H * 0.7, s = rnd() < 0.08 ? 1.6 : 0.5 + rnd() * 0.8;
      g.fillStyle = `rgba(230,235,255,${0.25 + rnd() * 0.55})`; g.fillRect(x, y, s, s);
    }
    // moon: halo, disc, maria
    glow(g, moonX, moonY, moonR * 4.5, 'rgba(170,190,255,1)', 0.16);
    glow(g, moonX, moonY, moonR * 1.9, 'rgba(240,240,255,1)', 0.3);
    const mg = g.createRadialGradient(moonX - moonR * 0.35, moonY - moonR * 0.35, moonR * 0.1, moonX, moonY, moonR);
    mg.addColorStop(0, '#fffef6'); mg.addColorStop(0.7, '#eceadc'); mg.addColorStop(1, '#cfcbc0');
    g.fillStyle = mg; g.beginPath(); g.arc(moonX, moonY, moonR, 0, TAU); g.fill();
    g.fillStyle = 'rgba(160,160,170,0.28)';
    for (const [dx, dy, s] of [[-0.35, -0.1, 0.24], [0.2, 0.25, 0.2], [0.3, -0.35, 0.13], [-0.1, 0.45, 0.1], [-0.45, 0.35, 0.08]]) {
      g.beginPath(); g.arc(moonX + dx * moonR, moonY + dy * moonR, s * moonR, 0, TAU); g.fill();
    }
    // distant skyline + the tall tower
    for (const b of far) {
      g.fillStyle = lin(g, 0, b.top, 0, H, [[0, '#1a1e3e'], [1, '#0c0e22']]);
      g.fillRect(b.x, b.top, b.w, H - b.top);
      g.fillStyle = 'rgba(150,160,230,0.12)'; g.fillRect(b.x, b.top, b.w, 1);
    }
    g.fillStyle = lin(g, 0, tower.top, 0, H, [[0, '#1c1f40'], [1, '#0c0e22']]);
    g.fillRect(tower.x, tower.top, tower.w, H - tower.top);
    g.fillRect(tower.x + tower.w * 0.2, tower.top - u * 0.02, tower.w * 0.6, u * 0.02);
    g.fillStyle = '#1c1f40'; g.fillRect(tower.x + tower.w / 2 - 1, tower.top - u * 0.08, 2, u * 0.06); // mast
    g.fillStyle = 'rgba(170,180,240,0.25)'; g.fillRect(tower.x + tower.w - 1, tower.top, 1, H * 0.1);
    boardVeil(g, W, H, 0.45);
    // near rooftops below the board: ledges, chimneys, an antenna, a water tower (moonlit edges)
    for (const b of near) {
      g.fillStyle = lin(g, 0, b.top, 0, H, [[0, '#14142a'], [1, '#07070f']]);
      g.fillRect(b.x, b.top, b.w, H - b.top);
      g.fillStyle = '#1c1c36'; g.fillRect(b.x - u * 0.006, b.top - u * 0.008, b.w + u * 0.012, u * 0.012); // ledge
      g.fillStyle = 'rgba(190,200,255,0.35)'; g.fillRect(b.x - u * 0.006, b.top - u * 0.008, b.w + u * 0.012, 1);
      if (rnd() < 0.7) { // chimney pots
        const cx = b.x + b.w * (0.15 + rnd() * 0.6), cw = u * 0.035;
        g.fillStyle = '#24182a'; g.fillRect(cx, b.top - u * 0.035, cw, u * 0.03);
        g.fillStyle = '#2e2036'; g.fillRect(cx - u * 0.004, b.top - u * 0.04, cw + u * 0.008, u * 0.008);
        g.fillStyle = 'rgba(190,200,255,0.3)'; g.fillRect(cx - u * 0.004, b.top - u * 0.04, cw + u * 0.008, 1);
      }
    }
    const ax = w * 0.3, ay = near[1] ? near[1].top : nearY; // TV antenna
    g.strokeStyle = '#2a2a48'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(ax, ay); g.lineTo(ax, ay - u * 0.06);
    for (let i = 0; i < 3; i++) { const yy = ay - u * (0.055 - i * 0.014), hw = u * (0.03 - i * 0.006); g.moveTo(ax - hw, yy); g.lineTo(ax + hw, yy); }
    g.stroke();
    // the near building top right, its chimney, and the cat sitting on it against the moon
    g.fillStyle = lin(g, 0, roofY, 0, H * 0.3, [[0, '#121230'], [1, '#08081a']]);
    g.fillRect(bldX, roofY, W - bldX, H * 0.3 - roofY);
    g.fillStyle = '#1e1e3c'; g.fillRect(bldX - u * 0.01, roofY - u * 0.01, W - bldX + u * 0.01, u * 0.014);
    g.fillStyle = 'rgba(200,210,255,0.45)'; g.fillRect(bldX - u * 0.01, roofY - u * 0.01, W - bldX + u * 0.01, 1);
    g.fillStyle = lin(g, chX, 0, chX + chW, 0, [[0, '#3a1e22'], [0.5, '#2a1418'], [1, '#160a0c']]);
    g.fillRect(chX, chTop, chW, roofY - chTop);
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1;
    for (let y = chTop + u * 0.012; y < roofY; y += u * 0.012) { g.beginPath(); g.moveTo(chX, y); g.lineTo(chX + chW, y); g.stroke(); }
    g.fillStyle = '#3a2228'; g.fillRect(chX - u * 0.008, chTop - u * 0.008, chW + u * 0.016, u * 0.012);
    g.fillStyle = 'rgba(220,220,255,0.5)'; g.fillRect(chX - u * 0.008, chTop - u * 0.008, chW + u * 0.016, 1);
    // cat silhouette (sitting, facing us), moon rim on the edges, glowing eyes
    const cs = u * 0.05, cx = catCX, cb = catBaseY - u * 0.008;
    const catPath = () => {
      g.beginPath();
      g.moveTo(cx - cs * 0.55, cb);
      g.bezierCurveTo(cx - cs * 0.62, cb - cs * 0.55, cx - cs * 0.42, cb - cs * 0.95, cx - cs * 0.3, cb - cs * 1.05);
      g.bezierCurveTo(cx - cs * 0.46, cb - cs * 1.2, cx - cs * 0.46, cb - cs * 1.5, cx - cs * 0.38, cb - cs * 1.62);
      g.lineTo(cx - cs * 0.42, cb - cs * 1.98); g.lineTo(cx - cs * 0.18, cb - cs * 1.76);
      g.quadraticCurveTo(cx, cb - cs * 1.82, cx + cs * 0.18, cb - cs * 1.76);
      g.lineTo(cx + cs * 0.42, cb - cs * 1.98); g.lineTo(cx + cs * 0.38, cb - cs * 1.62);
      g.bezierCurveTo(cx + cs * 0.46, cb - cs * 1.5, cx + cs * 0.46, cb - cs * 1.2, cx + cs * 0.3, cb - cs * 1.05);
      g.bezierCurveTo(cx + cs * 0.42, cb - cs * 0.95, cx + cs * 0.62, cb - cs * 0.55, cx + cs * 0.55, cb);
      g.closePath();
    };
    g.save();
    g.strokeStyle = 'rgba(220,225,255,0.75)'; g.lineWidth = 2.2; catPath(); g.stroke();
    g.fillStyle = '#06060e'; catPath(); g.fill();
    g.restore();
    for (const s of [-1, 1]) {
      glow(g, cx + s * cs * 0.17, cb - cs * 1.42, cs * 0.16, 'rgba(255,220,90,1)', 0.7);
      g.fillStyle = '#ffe070'; g.beginPath(); g.ellipse(cx + s * cs * 0.17, cb - cs * 1.42, cs * 0.07, cs * 0.05, 0, 0, TAU); g.fill();
      g.fillStyle = '#1a1000'; g.fillRect(cx + s * cs * 0.17 - 0.5, cb - cs * 1.46, 1, cs * 0.08);
    }
    for (const [x, y, ww, wh, k] of winSets[0]) { // windows that stay lit
      g.fillStyle = k < 0.7 ? 'rgba(255,200,120,0.55)' : 'rgba(170,210,255,0.45)'; g.fillRect(x, y, ww, wh);
    }
  });
  // twinkling windows: two sets lit in turn (soft fades, never a strobe)
  const winLayer = (set) => layer(w, h, 1, (g) => {
    for (const [x, y, ww, wh, k] of set) {
      glow(g, x + ww / 2, y + wh / 2, ww * 1.6, k < 0.7 ? 'rgba(255,190,110,1)' : 'rgba(160,200,255,1)', 0.18);
      g.fillStyle = k < 0.7 ? 'rgba(255,214,140,0.85)' : 'rgba(190,220,255,0.7)'; g.fillRect(x, y, ww, wh);
    }
    // the tower's red beacon belongs to set 1
    if (set === winSets[1]) {
      const bx = tower.x + tower.w / 2, by = tower.top - u * 0.08;
      glow(g, bx, by, u * 0.03, 'rgba(255,70,70,1)', 0.8);
      g.fillStyle = '#ff6a6a'; g.beginPath(); g.arc(bx, by, 1.6, 0, TAU); g.fill();
    }
  });
  const winA = winLayer(winSets[1]), winB = winLayer(winSets[2]);
  // drifting clouds (top of the sky, lit from the moon), one period painted with wrap
  const cloudsH = h * 0.3;
  const clouds = layer(w, cloudsH, 1, (g, W, H) => {
    for (let i = 0; i < 7; i++) {
      const cx = rnd() * W, cy = H * (0.15 + rnd() * 0.6), cw = u * (0.18 + rnd() * 0.22), ch = u * (0.025 + rnd() * 0.025);
      for (const ox of [-W, 0, W]) {
        for (let j = 0; j < 5; j++) {
          const px = cx + ox + (j - 2) * cw * 0.22, py = cy + Math.sin(j * 1.7 + i) * ch * 0.4;
          g.save(); g.translate(px, py); g.scale(1, ch / (cw * 0.3));
          const rg = g.createRadialGradient(0, 0, 0, 0, 0, cw * 0.3);
          rg.addColorStop(0, 'rgba(120,120,170,0.32)'); rg.addColorStop(0.6, 'rgba(90,90,140,0.16)'); rg.addColorStop(1, 'rgba(60,60,110,0)');
          g.fillStyle = rg; g.beginPath(); g.arc(0, 0, cw * 0.3, 0, TAU); g.fill();
          g.restore();
        }
      }
    }
  });
  // the cat's tail hangs over the chimney edge and swishes
  const tailL = u * 0.07;
  const tail = layer(tailL * 0.6, tailL * 1.1, 3, (g, W, H) => {
    g.lineCap = 'round';
    const path = () => { g.beginPath(); g.moveTo(W * 0.3, 2); g.bezierCurveTo(W * 0.3, H * 0.45, W * 0.85, H * 0.5, W * 0.65, H * 0.92); };
    g.strokeStyle = 'rgba(220,225,255,0.7)'; g.lineWidth = u * 0.011 + 2; path(); g.stroke();
    g.strokeStyle = '#06060e'; g.lineWidth = u * 0.011; path(); g.stroke();
  });
  const tailX = catCX + u * 0.024, tailY = catBaseY - u * 0.012;

  return {
    draw(ctx, t, a) {
      put(ctx, base, 0, 0, a);
      const cx = -((t * u * 0.012) % w);
      put(ctx, clouds, cx, 0, a); put(ctx, clouds, cx + w, 0, a);
      const tw = 0.5 + 0.5 * Math.sin(t * 0.9);
      put(ctx, winA, 0, 0, a * (0.25 + 0.75 * tw));
      put(ctx, winB, 0, 0, a * (1 - 0.75 * tw));
      ctx.save();
      ctx.translate(tailX, tailY);
      ctx.rotate(0.22 * Math.sin(t * 1.4) * Math.max(0, Math.sin(t * 0.37)));
      ctx.globalAlpha = a; ctx.drawImage(tail.c, -tail.w * 0.3, 0, tail.w, tail.h);
      ctx.restore();
    },
  };
}

export const CAT_SCENES = { catcafe, rooftop };
