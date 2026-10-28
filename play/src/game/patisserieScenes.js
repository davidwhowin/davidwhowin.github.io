// Patisserie pack scenes (DESIGN.md "Premium themed packs"): Pâtisserie Counter and Pastel Rooftop.
// Same contract as sceneArt.js: every layer is painted ONCE per screen size into an offscreen canvas, and a
// frame only draws those canvases (2-8 drawImage calls, plus save / restore / translate / rotate / scale).
// The board band keeps a baked dark veil so the pieces stay the brightest thing on screen; the lively bits
// (the glowing display case, the string lights, the cake stand, the coffee steam) sit between the HUD and the
// board or below the board, and the area behind the score stays dim. Calm / reduced motion stops the scene clock,
// so the picture holds still.
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

// --------------------------------------------------------------- little pastries for the scenery

function miniCake(g, x, y, s, top, side, berry = '#ff4a6a') {
  // a round cake on a short stand, base at (x, y), width s
  g.fillStyle = 'rgba(255,240,220,0.5)'; g.fillRect(x - s * 0.08, y - s * 0.16, s * 0.16, s * 0.16);
  g.beginPath(); g.ellipse(x, y - s * 0.16, s * 0.6, s * 0.08, 0, 0, TAU); g.fillStyle = '#e8d6c0'; g.fill();
  const y0 = y - s * 0.62, y1 = y - s * 0.2;
  g.fillStyle = lin(g, x - s * 0.5, 0, x + s * 0.5, 0, [[0, side[0]], [0.5, side[1]], [1, side[2]]]);
  g.beginPath(); g.moveTo(x - s * 0.5, y0); g.lineTo(x - s * 0.5, y1); g.ellipse(x, y1, s * 0.5, s * 0.1, 0, Math.PI, 0, true); g.lineTo(x + s * 0.5, y0); g.closePath(); g.fill();
  g.beginPath(); g.ellipse(x, y0, s * 0.5, s * 0.1, 0, 0, TAU); g.fillStyle = top; g.fill();
  for (const dx of [-0.3, 0, 0.3]) {
    g.beginPath(); g.arc(x + dx * s, y0 - s * 0.04, s * 0.07, 0, TAU); g.fillStyle = berry; g.fill();
  }
}

function miniMacarons(g, x, y, s, cols) {
  // a small stack of macarons, base at (x, y)
  cols.forEach((c, i) => {
    const yy = y - i * s * 0.32 - s * 0.16;
    g.fillStyle = c; g.beginPath(); g.ellipse(x, yy, s * 0.36, s * 0.13, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,250,240,0.9)'; g.fillRect(x - s * 0.3, yy - s * 0.02, s * 0.6, s * 0.04);
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(x - s * 0.12, yy - s * 0.07, s * 0.12, s * 0.035, 0, 0, TAU); g.fill();
  });
}

function miniCroissant(g, x, y, s) {
  g.fillStyle = '#d98a34';
  for (const [dx, dy, rx, ry] of [[-0.42, -0.05, 0.16, 0.11], [0.42, -0.05, 0.16, 0.11], [-0.22, -0.14, 0.2, 0.17], [0.22, -0.14, 0.2, 0.17], [0, -0.2, 0.24, 0.22]]) {
    g.beginPath(); g.ellipse(x + dx * s, y + dy * s, rx * s, ry * s, 0, 0, TAU); g.fill();
  }
  g.fillStyle = 'rgba(255,220,150,0.5)'; g.beginPath(); g.ellipse(x - s * 0.06, y - s * 0.3, s * 0.1, s * 0.04, 0, 0, TAU); g.fill();
}

// --------------------------------------------------------------- Pâtisserie Counter

function patisserie(w, h, rnd) {
  const u = Math.min(w, h * 0.6);
  // the display case fills the band between the HUD and the board; the marble counter sits below the board
  const cx0 = w * 0.04, cw = w * 0.92, cy0 = h * 0.075, ch = h * 0.165; // case glass box
  const shelfY = [cy0 + ch * 0.5, cy0 + ch * 0.96];
  const counterY = h * 0.9;
  const standX = w * 0.14, cupX = w * 0.86;

  const base = layer(w, h, 1, (g, W, H) => {
    // rosy plum wall with soft damask stripes
    g.fillStyle = lin(g, 0, 0, 0, H, [[0, '#24101a'], [0.5, '#1a0c14'], [1, '#10070c']]);
    g.fillRect(0, 0, W, H);
    for (let x = 0; x < W; x += W / 11) {
      g.fillStyle = 'rgba(255,170,200,0.03)'; g.fillRect(x, 0, W / 22, H);
      for (let y = H * 0.3; y < H * 0.84; y += u * 0.12) {
        g.fillStyle = 'rgba(255,190,210,0.035)';
        g.beginPath(); g.ellipse(x + W / 44, y + (Math.round(x) % 2 ? u * 0.06 : 0), u * 0.012, u * 0.022, 0, 0, TAU); g.fill();
      }
    }
    // scalloped awning edge along the very top (dim behind the HUD)
    g.fillStyle = '#3a1428';
    g.fillRect(0, 0, W, h * 0.03);
    const n = Math.ceil(W / (u * 0.09));
    for (let i = 0; i < n; i++) {
      const x = i * W / n;
      g.fillStyle = i % 2 ? '#4a1a34' : '#2e1020';
      g.beginPath(); g.moveTo(x, h * 0.03); g.arc(x + W / n / 2, h * 0.03, W / n / 2, 0, Math.PI); g.closePath(); g.fill();
    }
    // the display case: brass frame, warm glass, two shelves of pastries
    rr(g, cx0 - u * 0.012, cy0 - u * 0.012, cw + u * 0.024, ch + u * 0.03, u * 0.02);
    g.fillStyle = lin(g, 0, cy0, 0, cy0 + ch, [[0, '#6a4a22'], [0.5, '#3e2810'], [1, '#2a1a0a']]); g.fill();
    g.fillStyle = lin(g, 0, cy0, 0, cy0 + ch, [[0, '#4a2a22'], [1, '#2a1612']]);
    g.fillRect(cx0, cy0, cw, ch);
    glow(g, W * 0.5, cy0 + ch * 0.25, cw * 0.55, 'rgba(255,200,140,1)', 0.18);
    for (const sy of shelfY) {
      g.fillStyle = 'rgba(255,240,220,0.35)'; g.fillRect(cx0 + u * 0.01, sy - 1, cw - u * 0.02, 2);
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(cx0 + u * 0.01, sy + 1, cw - u * 0.02, u * 0.006);
    }
    // top shelf: macaron stacks and mini cakes; bottom shelf: croissants, cakes, tarts
    const cols = [['#ffb3d0', '#b8e888', '#fff1a8'], ['#c8b0ff', '#ffc8a0', '#a8e8ff'], ['#ffd0e0', '#d8f0b0']];
    let x = cx0 + u * 0.06, i = 0;
    while (x < cx0 + cw - u * 0.05) {
      if (i % 3 === 1) miniCake(g, x, shelfY[0], u * 0.085, '#fff4ec', ['#ffc8dc', '#ff9ec0', '#c8648a']);
      else miniMacarons(g, x, shelfY[0], u * 0.07, cols[i % 3]);
      x += u * (0.1 + rnd() * 0.03); i++;
    }
    x = cx0 + u * 0.07; i = 0;
    while (x < cx0 + cw - u * 0.06) {
      if (i % 3 === 0) miniCroissant(g, x, shelfY[1], u * 0.1);
      else if (i % 3 === 1) miniCake(g, x, shelfY[1], u * 0.1, '#fdf6ea', ['#7ee0d4', '#40bfb4', '#1e7a72'], '#5a6aff');
      else miniCake(g, x, shelfY[1], u * 0.09, '#5a2a18', ['#a0603a', '#7a4128', '#3a1a0a'], '#ff4a6a');
      x += u * (0.12 + rnd() * 0.03); i++;
    }
    // glass reflections
    g.fillStyle = 'rgba(255,255,255,0.06)';
    g.beginPath(); g.moveTo(cx0 + cw * 0.08, cy0); g.lineTo(cx0 + cw * 0.16, cy0); g.lineTo(cx0 + cw * 0.04, cy0 + ch); g.lineTo(cx0 - cw * 0.04, cy0 + ch); g.closePath(); g.fill();
    // brass rail under the case
    g.fillStyle = lin(g, 0, cy0 + ch, 0, cy0 + ch + u * 0.02, [[0, '#ffe0a0'], [0.4, '#c8962e'], [1, '#5a3a10']]);
    g.fillRect(cx0 - u * 0.02, cy0 + ch + u * 0.012, cw + u * 0.04, u * 0.014);
    boardVeil(g, W, H, 0.46);
    // marble counter below the board
    g.fillStyle = lin(g, 0, counterY, 0, H, [[0, '#d8ccc6'], [0.08, '#a89a96'], [0.5, '#7a6e70'], [1, '#3a3036']]);
    g.fillRect(0, counterY, W, H - counterY);
    g.strokeStyle = 'rgba(120,100,110,0.35)'; g.lineWidth = 1;
    for (let k = 0; k < 6; k++) {
      g.beginPath(); let px = rnd() * W, py = counterY + rnd() * (H - counterY);
      g.moveTo(px, py);
      for (let s = 0; s < 6; s++) { px += u * (0.03 + rnd() * 0.05); py += (rnd() - 0.5) * u * 0.03; g.lineTo(px, py); }
      g.stroke();
    }
    g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(0, counterY, W, 1.5);
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, counterY - u * 0.01, W, u * 0.01);
    // cake stand with a domed cloche on the left, a little bell, a coffee cup on the right
    const sb = counterY + u * 0.075;
    g.save(); g.translate(standX, sb); g.scale(0.72, 0.72); g.translate(-standX, -sb);
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(standX, sb + u * 0.005, u * 0.13, u * 0.015, 0, 0, TAU); g.fill();
    g.fillStyle = '#e8e0f0'; g.fillRect(standX - u * 0.012, sb - u * 0.05, u * 0.024, u * 0.05);
    g.beginPath(); g.ellipse(standX, sb - u * 0.05, u * 0.12, u * 0.018, 0, 0, TAU); g.fill();
    miniCake(g, standX, sb - u * 0.05, u * 0.17, '#fff6ee', ['#ffd0e0', '#ff8fbf', '#c0507a']);
    g.fillStyle = 'rgba(220,235,255,0.12)'; g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(standX - u * 0.11, sb - u * 0.055); g.bezierCurveTo(standX - u * 0.11, sb - u * 0.24, standX + u * 0.11, sb - u * 0.24, standX + u * 0.11, sb - u * 0.055); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#e8e0f0'; g.beginPath(); g.arc(standX, sb - u * 0.205, u * 0.012, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(standX - u * 0.06, sb - u * 0.15, u * 0.012, u * 0.04, 0.3, 0, TAU); g.fill();
    g.restore();
    // service bell
    const bx = w * 0.5, by = counterY + u * 0.06;
    g.fillStyle = '#5a3a10'; g.fillRect(bx - u * 0.045, by, u * 0.09, u * 0.01);
    g.fillStyle = lin(g, bx - u * 0.04, 0, bx + u * 0.04, 0, [[0, '#8a6020'], [0.35, '#ffe9a8'], [1, '#8a6020']]);
    g.beginPath(); g.arc(bx, by, u * 0.04, Math.PI, 0); g.closePath(); g.fill();
    g.fillRect(bx - u * 0.004, by - u * 0.052, u * 0.008, u * 0.014);
    // coffee cup on its saucer
    const cb = counterY + u * 0.07;
    g.fillStyle = '#f4ece6'; g.beginPath(); g.ellipse(cupX, cb, u * 0.075, u * 0.016, 0, 0, TAU); g.fill();
    g.fillStyle = lin(g, cupX - u * 0.045, 0, cupX + u * 0.045, 0, [[0, '#fffaf6'], [0.6, '#f0e2dc'], [1, '#bfa8a0']]);
    g.beginPath(); g.moveTo(cupX - u * 0.048, cb - u * 0.06); g.lineTo(cupX - u * 0.038, cb - u * 0.008); g.quadraticCurveTo(cupX, cb + u * 0.004, cupX + u * 0.038, cb - u * 0.008); g.lineTo(cupX + u * 0.048, cb - u * 0.06); g.closePath(); g.fill();
    g.strokeStyle = '#f0e2dc'; g.lineWidth = u * 0.009; g.beginPath(); g.arc(cupX + u * 0.055, cb - u * 0.038, u * 0.016, -1.4, 1.4); g.stroke();
    g.fillStyle = '#6a3a1c'; g.beginPath(); g.ellipse(cupX, cb - u * 0.06, u * 0.046, u * 0.01, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,230,200,0.6)'; g.beginPath(); g.ellipse(cupX, cb - u * 0.06, u * 0.02, u * 0.005, 0, 0, TAU); g.fill();
    // a macaron plate between the bell and the cup
    miniMacarons(g, w * 0.66, counterY + u * 0.07, u * 0.08, ['#b8e888', '#ffb3d0']);
  });
  // warm display-case light: breathes gently
  const caseGlow = layer(w, cy0 + ch + u * 0.06, 1, (g, W) => {
    glow(g, W * 0.3, cy0 + ch * 0.3, cw * 0.32, 'rgba(255,214,160,1)', 0.22);
    glow(g, W * 0.72, cy0 + ch * 0.35, cw * 0.32, 'rgba(255,190,200,1)', 0.18);
    g.fillStyle = 'rgba(255,240,220,0.5)';
    for (let x = cx0 + u * 0.04; x < cx0 + cw; x += u * 0.08) { g.beginPath(); g.arc(x, cy0 + u * 0.006, u * 0.004, 0, TAU); g.fill(); } // case lamps
  });
  // a soft diagonal glint that sweeps along the glass now and then
  const gl = layer(u * 0.16, ch, 2, (g, W, H) => {
    g.fillStyle = lin(g, 0, 0, W, 0, [[0, 'rgba(255,255,255,0)'], [0.5, 'rgba(255,250,240,0.32)'], [1, 'rgba(255,255,255,0)']]);
    g.beginPath(); g.moveTo(W * 0.55, 0); g.lineTo(W, 0); g.lineTo(W * 0.45, H); g.lineTo(0, H); g.closePath(); g.fill();
  });
  // drifting sugar motes in the case light (vertically periodic, scrolls up)
  const motes = layer(cw, ch * 2, 2, (g, W, H) => {
    for (let i = 0; i < 26; i++) {
      const x = rnd() * W, y = rnd() * H / 2, s = 0.6 + rnd() * 1.1;
      for (const yy of [y, y + H / 2]) { g.fillStyle = `rgba(255,240,225,${0.25 + rnd() * 0.4})`; g.beginPath(); g.arc(x, yy, s, 0, TAU); g.fill(); }
    }
  });
  // coffee steam (two copies out of phase)
  const steam = layer(u * 0.07, u * 0.1, 2, (g, W, H) => {
    g.lineCap = 'round';
    for (const [dx, ph] of [[-0.16, 0], [0.16, 1.7]]) {
      g.strokeStyle = 'rgba(255,245,235,0.35)'; g.lineWidth = W * 0.12;
      g.beginPath(); g.moveTo(W * (0.5 + dx), H);
      for (let i = 1; i <= 12; i++) { const y = H - (i / 12) * H * 0.95; g.lineTo(W * (0.5 + dx) + Math.sin(i * 0.7 + ph) * W * 0.16, y); }
      g.stroke();
    }
  });
  const steamX = cupX - steam.w / 2, steamY = counterY + u * 0.01 - steam.h;
  const sweep = 7.5; // seconds per glint pass (including the pause)

  return {
    draw(ctx, t, a) {
      put(ctx, base, 0, 0, a);
      put(ctx, caseGlow, 0, 0, a * (0.75 + 0.25 * Math.sin(t * 0.9)));
      putScroll(ctx, motes, cx0, cy0, -t * u * 0.012, a * 0.8);
      const p = (t % sweep) / sweep;
      if (p < 0.4) { const q = p / 0.4; put(ctx, gl, cx0 + q * (cw - gl.w), cy0, a * Math.sin(Math.PI * q)); }
      for (const k of [0, 0.5]) {
        const s = (t * 0.22 + k) % 1;
        put(ctx, steam, steamX + Math.sin(t * 0.8 + k * 5) * u * 0.005, steamY - s * u * 0.02, a * 0.75 * Math.sin(Math.PI * s));
      }
    },
  };
}

// --------------------------------------------------------------- Pastel Rooftop

function pastelroof(w, h, rnd) {
  const u = Math.min(w, h * 0.6);
  const roofY = h * 0.875; // zinc rooftops below the board
  const towerX = w * 0.82, towerTop = h * 0.11, towerBase = h * 0.245;
  // string-light catenaries across the band between the HUD and the board
  const strands = [
    { x0: -u * 0.02, y0: h * 0.07, x1: w * 0.62, y1: h * 0.09, sag: h * 0.075 },
    { x0: w * 0.36, y0: h * 0.12, x1: w + u * 0.02, y1: h * 0.1, sag: h * 0.07 },
  ];
  const at = (s, t) => ({ x: s.x0 + (s.x1 - s.x0) * t, y: s.y0 + (s.y1 - s.y0) * t + s.sag * 4 * t * (1 - t) });
  const bulbs = [];
  for (const s of strands) for (let t = 0.04; t < 1; t += 0.075) bulbs.push({ ...at(s, t), k: bulbs.length });
  const BULB = ['255,214,140', '255,170,200', '200,220,255', '255,236,170'];

  const base = layer(w, h, 1, (g, W, H) => {
    // pastel dusk: deep lavender above, rose and peach near the horizon (kept low-key)
    g.fillStyle = lin(g, 0, 0, 0, H, [[0, '#1a1430'], [0.25, '#2a1c40'], [0.55, '#2c1a36'], [0.8, '#4a2440'], [0.9, '#5a2c3e'], [1, '#22101a']]);
    g.fillRect(0, 0, W, H);
    glow(g, W * 0.3, H * 0.86, W * 0.7, 'rgba(255,170,150,1)', 0.18);
    for (let i = 0; i < 70; i++) { // first stars
      const x = rnd() * W, y = rnd() * H * 0.5, s = 0.5 + rnd() * 0.9;
      g.fillStyle = `rgba(255,240,250,${0.2 + rnd() * 0.45})`; g.fillRect(x, y, s, s);
    }
    // a crescent moon, top left of the tower
    const mx = W * 0.62, my = H * 0.19, mr = u * 0.035;
    glow(g, mx, my, mr * 4, 'rgba(255,220,240,1)', 0.14);
    g.fillStyle = '#fff2e6'; g.beginPath(); g.arc(mx, my, mr, 0, TAU); g.fill();
    g.fillStyle = '#2a1c40'; g.beginPath(); g.arc(mx + mr * 0.45, my - mr * 0.2, mr * 0.9, 0, TAU); g.fill();
    // the iron tower in silhouette (rose rim light)
    const tw = u * 0.11;
    g.fillStyle = '#140c20';
    g.beginPath();
    g.moveTo(towerX - tw, towerBase);
    g.quadraticCurveTo(towerX - tw * 0.3, towerBase - (towerBase - towerTop) * 0.45, towerX - tw * 0.06, towerTop + u * 0.02);
    g.lineTo(towerX, towerTop - u * 0.025);
    g.lineTo(towerX + tw * 0.06, towerTop + u * 0.02);
    g.quadraticCurveTo(towerX + tw * 0.3, towerBase - (towerBase - towerTop) * 0.45, towerX + tw, towerBase);
    g.lineTo(towerX + tw * 0.6, towerBase);
    g.quadraticCurveTo(towerX, towerBase - u * 0.06, towerX - tw * 0.6, towerBase);
    g.closePath(); g.fill();
    g.strokeStyle = 'rgba(255,170,200,0.35)'; g.lineWidth = 1; g.stroke();
    g.fillStyle = '#140c20';
    g.fillRect(towerX - tw * 0.42, towerBase - (towerBase - towerTop) * 0.36, tw * 0.84, u * 0.008);
    g.fillRect(towerX - tw * 0.2, towerBase - (towerBase - towerTop) * 0.66, tw * 0.4, u * 0.006);
    glow(g, towerX, towerTop - u * 0.025, u * 0.03, 'rgba(255,220,160,1)', 0.6);
    // distant roofline under the tower
    g.fillStyle = '#1a1028';
    let x = -u * 0.02;
    g.beginPath(); g.moveTo(x, H * 0.3);
    while (x < W) { const bw = u * (0.06 + rnd() * 0.08), top = H * (0.235 + rnd() * 0.02); g.lineTo(x, top); g.lineTo(x + bw * 0.5, top - u * 0.02); g.lineTo(x + bw, top); x += bw; }
    g.lineTo(W, H * 0.3); g.closePath(); g.fill();
    boardVeil(g, W, H, 0.46);
    // the string-light wires
    g.strokeStyle = 'rgba(30,20,40,0.9)'; g.lineWidth = 1.2;
    for (const s of strands) { g.beginPath(); for (let t = 0; t <= 1.0001; t += 0.02) { const p = at(s, t); t ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y); } g.stroke(); }
    for (const b of bulbs) { // unlit glass (the glow layers light them)
      g.fillStyle = '#3a2a3a'; g.fillRect(b.x - 1, b.y, 2, u * 0.008);
      g.fillStyle = 'rgba(255,240,230,0.35)'; g.beginPath(); g.ellipse(b.x, b.y + u * 0.016, u * 0.007, u * 0.01, 0, 0, TAU); g.fill();
    }
    // pastel zinc rooftops, chimney pots and a little terrace below the board
    g.fillStyle = lin(g, 0, roofY, 0, H, [[0, '#5a5a78'], [0.2, '#3a3a56'], [1, '#14121e']]);
    g.beginPath(); g.moveTo(0, H); g.lineTo(0, roofY + u * 0.02);
    let rx = 0;
    while (rx < W) { const bw = u * (0.2 + rnd() * 0.12); g.lineTo(rx + bw * 0.1, roofY - u * 0.01 * rnd()); g.lineTo(rx + bw, roofY + u * 0.01); rx += bw; }
    g.lineTo(W, H); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(200,190,230,0.15)'; g.lineWidth = 1;
    for (let y = roofY + u * 0.03; y < H; y += u * 0.022) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    for (const px of [W * 0.12, W * 0.46, W * 0.9]) {
      g.fillStyle = '#8a4a5a'; g.fillRect(px, roofY - u * 0.055, u * 0.05, u * 0.06);
      g.fillStyle = '#a85a6a'; g.fillRect(px - u * 0.005, roofY - u * 0.06, u * 0.06, u * 0.01);
      for (const k of [0.012, 0.03]) { g.fillStyle = '#c87a6a'; g.fillRect(px + k * u, roofY - u * 0.075, u * 0.012, u * 0.02); }
    }
    // terrace table with a macaron tower (pink, mint, lemon, lilac)
    const tx = W * 0.27, ty = roofY + u * 0.075;
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(tx, ty + u * 0.065, u * 0.1, u * 0.012, 0, 0, TAU); g.fill();
    g.fillStyle = '#e8e0f0'; g.fillRect(tx - u * 0.006, ty, u * 0.012, u * 0.065);
    g.beginPath(); g.ellipse(tx, ty, u * 0.1, u * 0.016, 0, 0, TAU); g.fill();
    const tcols = ['#ffb3d0', '#b8e888', '#fff1a8', '#c8b0ff', '#ffc8a0', '#a8e8ff'];
    for (let row = 0; row < 4; row++) {
      const n = 4 - row, yy = ty - u * 0.02 - row * u * 0.03;
      for (let i = 0; i < n; i++) {
        const xx = tx + (i - (n - 1) / 2) * u * 0.034;
        g.fillStyle = tcols[(row * 3 + i) % tcols.length]; g.beginPath(); g.ellipse(xx, yy, u * 0.017, u * 0.013, 0, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,250,240,0.8)'; g.fillRect(xx - u * 0.014, yy - 0.5, u * 0.028, 1);
      }
    }
    // potted flowers on the right
    const fx = W * 0.72, fy = roofY + u * 0.09;
    g.fillStyle = '#c8705a'; g.beginPath(); g.moveTo(fx - u * 0.04, fy - u * 0.05); g.lineTo(fx + u * 0.04, fy - u * 0.05); g.lineTo(fx + u * 0.03, fy); g.lineTo(fx - u * 0.03, fy); g.closePath(); g.fill();
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI * (0.15 + 0.7 * (i / 8)), d = u * (0.03 + rnd() * 0.03);
      const px = fx + Math.cos(a) * d, py = fy - u * 0.05 + Math.sin(a) * d;
      g.fillStyle = '#4a8a4a'; g.beginPath(); g.ellipse(px, py + u * 0.01, u * 0.008, u * 0.016, a, 0, TAU); g.fill();
      g.fillStyle = ['#ffb3d0', '#ffffff', '#ffd6a0'][i % 3]; g.beginPath(); g.arc(px, py, u * 0.011, 0, TAU); g.fill();
    }
  });
  // two bulb glow sets, twinkling in turn
  const bulbLayer = (odd) => layer(w, h * 0.3, 1, (g) => {
    for (const b of bulbs) {
      if ((b.k % 2 === 1) !== odd) continue;
      const c = BULB[b.k % BULB.length], by = b.y + u * 0.016;
      glow(g, b.x, by, u * 0.045, `rgba(${c},1)`, 0.45);
      g.fillStyle = `rgb(${c})`; g.beginPath(); g.ellipse(b.x, by, u * 0.007, u * 0.01, 0, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(b.x - u * 0.002, by - u * 0.003, u * 0.003, 0, TAU); g.fill();
    }
  });
  const bulbsA = bulbLayer(false), bulbsB = bulbLayer(true);
  // soft pastel clouds drifting across the top band (two copies side by side)
  const clouds = layer(w, h * 0.26, 1, (g, W, H) => {
    for (let i = 0; i < 6; i++) {
      const x = rnd() * W, y = H * (0.25 + rnd() * 0.6), s = u * (0.06 + rnd() * 0.06);
      const col = rnd() < 0.5 ? '255,190,215' : '210,190,255';
      for (let k = 0; k < 4; k++) glow(g, x + (k - 1.5) * s * 0.7, y + (k % 2) * s * 0.15, s, `rgba(${col},1)`, 0.08);
      for (const xx of [x - W, x + W]) for (let k = 0; k < 4; k++) glow(g, xx + (k - 1.5) * s * 0.7, y + (k % 2) * s * 0.15, s, `rgba(${col},1)`, 0.08);
    }
  });
  // fireflies over the terrace (vertically periodic, rise slowly)
  const flies = layer(w, (h - roofY) * 2 + u * 0.2, 2, (g, W, H) => {
    for (let i = 0; i < 10; i++) {
      const x = rnd() * W, y = rnd() * H / 2;
      for (const yy of [y, y + H / 2]) { glow(g, x, yy, u * 0.012, 'rgba(255,236,170,1)', 0.7); g.fillStyle = '#fff6d0'; g.fillRect(x - 0.6, yy - 0.6, 1.2, 1.2); }
    }
  });

  return {
    draw(ctx, t, a) {
      put(ctx, base, 0, 0, a);
      const cx = -((t * u * 0.006) % w);
      put(ctx, clouds, cx, h * 0.02, a); put(ctx, clouds, cx + w, h * 0.02, a);
      const tw = 0.5 + 0.5 * Math.sin(t * 1.6);
      put(ctx, bulbsA, 0, 0, a * (0.45 + 0.55 * tw));
      put(ctx, bulbsB, 0, 0, a * (1 - 0.55 * tw));
      putScroll(ctx, flies, 0, roofY - u * 0.2, -t * u * 0.01, a * (0.6 + 0.3 * Math.sin(t * 0.7)));
    },
  };
}

export const PATISSERIE_SCENES = { patisserie, pastelroof };
