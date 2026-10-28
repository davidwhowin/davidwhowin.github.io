// Koi Pond pack scenes (DESIGN.md "Premium themed packs"): Lily Pond and Rainy Temple. Same rules as the
// Sky scenes in sceneArt.js, which registers these builders: every layer is painted ONCE per screen size,
// and a frame only draws those canvases with a transform + alpha (2-8 drawImage calls, no paths or
// gradients per frame). Shapes come from the seeded stream sceneArt.js passes in (no unseeded randomness).
// The renderer stops the clock under Calm / reduced motion, so the picture holds still.
// Readability: the middle band behind the board is veiled dark; bright features sit at the sides and
// bottom, never behind the HUD score at the top centre.

const TAU = Math.PI * 2;

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(2, Math.round(w));
  c.height = Math.max(2, Math.round(h));
  return c;
}
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
function put(ctx, L, x, y, alpha) {
  if (alpha <= 0.002) return;
  ctx.globalAlpha = alpha;
  ctx.drawImage(L.c, x, y, L.w, L.h);
}
/** Draw L rotated by ang about its own point (ax, ay), which lands on (x, y); s scales it. */
function putRot(ctx, L, x, y, ax, ay, ang, alpha, s = 1) {
  if (alpha <= 0.002) return;
  ctx.save();
  ctx.translate(x, y); ctx.rotate(ang);
  if (s !== 1) ctx.scale(s, s);
  ctx.globalAlpha = alpha;
  ctx.drawImage(L.c, -ax, -ay, L.w, L.h);
  ctx.restore();
}
function boardVeil(g, w, h, a) {
  const v = g.createLinearGradient(0, 0, 0, h);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(0.17, `rgba(0,0,0,${a * 0.6})`);
  v.addColorStop(0.3, `rgba(0,0,0,${a})`); v.addColorStop(0.72, `rgba(0,0,0,${a})`);
  v.addColorStop(0.86, `rgba(0,0,0,${a * 0.4})`); v.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = v; g.fillRect(0, 0, w, h);
}

// ------------------------------------------------------------------ shared pond props
/** Lily pad (notched disc) in twilight greens, seen from above. */
function lilyPad(g, x, y, R, rot, rnd, tone = 1) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(1, 0.92);
  const notch = 0.26;
  g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, R, notch, TAU - notch); g.closePath();
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.save(); g.translate(R * 0.06, R * 0.1); g.fill(); g.restore();
  const pg = g.createRadialGradient(-R * 0.3, -R * 0.35, R * 0.1, 0, 0, R);
  pg.addColorStop(0, `rgba(${Math.round(70 * tone)},${Math.round(130 * tone)},${Math.round(80 * tone)},1)`);
  pg.addColorStop(1, `rgba(${Math.round(22 * tone)},${Math.round(58 * tone)},${Math.round(36 * tone)},1)`);
  g.fillStyle = pg; g.fill();
  g.strokeStyle = 'rgba(150,215,160,0.22)'; g.lineWidth = Math.max(1, R * 0.04); g.stroke();
  g.strokeStyle = 'rgba(10,30,18,0.5)'; g.lineWidth = Math.max(0.8, R * 0.025);
  for (let i = 0; i < 7; i++) {
    const a = notch + 0.35 + i * ((TAU - notch * 2 - 0.7) / 6);
    g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * R * 0.92, Math.sin(a) * R * 0.92); g.stroke();
  }
  if (rnd() < 0.6) { // a bead of water
    const a = rnd() * TAU, d = R * (0.3 + rnd() * 0.4);
    g.fillStyle = 'rgba(200,240,255,0.35)'; g.beginPath(); g.arc(Math.cos(a) * d, Math.sin(a) * d, R * 0.07, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.arc(Math.cos(a) * d - R * 0.02, Math.sin(a) * d - R * 0.02, R * 0.025, 0, TAU); g.fill();
  }
  g.restore();
}
/** Water lily flower: layered pink petals and a warm heart. */
function lotus(g, x, y, s) {
  glow(g, x, y, s * 2.6, 'rgba(255,150,200,1)', 0.16);
  g.save(); g.translate(x, y);
  for (const [n, len, wid, c0, c1, off] of [[8, 1, 0.34, '#c8487c', '#ffb0d0', 0], [6, 0.72, 0.3, '#e66a9a', '#ffe0ee', 0.3]]) {
    for (let i = 0; i < n; i++) {
      g.save(); g.rotate(off + (i / n) * TAU);
      const pg = g.createLinearGradient(0, 0, 0, -s * len);
      pg.addColorStop(0, c0); pg.addColorStop(1, c1);
      g.fillStyle = pg;
      g.beginPath(); g.moveTo(0, 0);
      g.bezierCurveTo(s * wid, -s * len * 0.3, s * wid * 0.8, -s * len * 0.8, 0, -s * len);
      g.bezierCurveTo(-s * wid * 0.8, -s * len * 0.8, -s * wid, -s * len * 0.3, 0, 0);
      g.fill();
      g.restore();
    }
  }
  g.fillStyle = '#ffd36a'; g.beginPath(); g.arc(0, 0, s * 0.2, 0, TAU); g.fill();
  g.restore();
}
/** Ripple rings (an ellipse family) centred in a layer. */
function rippleLayer(R, alpha) {
  return layer(R * 2.2, R * 0.9, 1, (g, W, H) => {
    g.translate(W / 2, H / 2); g.scale(1, 0.38);
    for (const [k, a] of [[1, 1], [0.72, 0.7], [0.45, 0.45]]) {
      g.strokeStyle = `rgba(190,235,240,${alpha * a})`; g.lineWidth = 1.6;
      g.beginPath(); g.arc(0, 0, R * k, 0, TAU); g.stroke();
    }
  });
}

// ------------------------------------------------------------------ Lily Pond
export function lilypond(w, h, rnd) {
  const u = Math.min(w, h * 0.6);
  // 1) the water: deep twilight pond, moon on the water, reeds in the corners, board veil
  const water = layer(w, h, 1, (g, W, H) => {
    const wg = g.createLinearGradient(0, 0, 0, H);
    wg.addColorStop(0, '#0a1c26'); wg.addColorStop(0.45, '#081820'); wg.addColorStop(1, '#040b10');
    g.fillStyle = wg; g.fillRect(0, 0, W, H);
    // twilight sky reflection: violet at the top, teal depth below
    glow(g, W * 0.2, H * 0.02, u * 0.8, 'rgba(120,80,170,1)', 0.18);
    glow(g, W * 0.6, H * 0.6, u * 0.9, 'rgba(30,110,120,1)', 0.12);
    // moon reflection (top right), broken by the water
    const mx = W * 0.8, my = H * 0.075;
    glow(g, mx, my, u * 0.22, 'rgba(210,235,255,1)', 0.22);
    for (let i = 0; i < 16; i++) {
      const yy = my - u * 0.05 + i * u * 0.008, ww = u * (0.07 - Math.abs(i - 7) * 0.006) * (0.7 + rnd() * 0.5);
      g.fillStyle = `rgba(230,245,255,${0.35 - Math.abs(i - 7) * 0.03})`;
      g.fillRect(mx - ww / 2 + (rnd() - 0.5) * u * 0.02, yy, ww, 1.4);
    }
    // caustic wobble lines
    g.lineWidth = 1;
    for (let i = 0; i < 70; i++) {
      const x = rnd() * W, y = rnd() * H, l = u * (0.04 + rnd() * 0.1);
      g.strokeStyle = `rgba(120,210,220,${0.03 + rnd() * 0.05})`;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y + (rnd() - 0.5) * u * 0.03, x + l, y); g.stroke();
    }
    // reeds (corners, in silhouette with a lit edge)
    const reeds = (x0, dir, n) => {
      for (let i = 0; i < n; i++) {
        const bx = x0 + dir * rnd() * u * 0.2, top = H - u * (0.3 + rnd() * 0.32), lean = dir * u * (0.02 + rnd() * 0.06);
        const bw = u * (0.012 + rnd() * 0.01);
        g.fillStyle = i % 3 ? '#0a1d16' : '#0d2a1c';
        g.beginPath(); g.moveTo(bx - bw, H); g.quadraticCurveTo(bx, H - (H - top) * 0.5, bx + lean, top); g.quadraticCurveTo(bx + bw * 0.5, H - (H - top) * 0.5, bx + bw, H); g.fill();
        g.strokeStyle = 'rgba(120,200,150,0.12)'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(bx + bw * 0.6, H); g.quadraticCurveTo(bx + bw * 0.4, H - (H - top) * 0.5, bx + lean, top); g.stroke();
        if (rnd() < 0.3) { // cattail head
          g.fillStyle = '#2a1a10'; g.beginPath(); g.ellipse(bx + lean * 0.85, top + u * 0.06, u * 0.012, u * 0.04, dir * 0.15, 0, TAU); g.fill();
        }
      }
    };
    reeds(0, 1, 9); reeds(W, -1, 7);
    boardVeil(g, W, H, 0.42);
  });
  // 2) koi shadows gliding under the surface (one sprite, drawn twice)
  const L = u * 0.34;
  const fish = layer(L * 1.1, L * 0.5, 1, (g, W, H) => {
    const cx = W * 0.56, cy = H / 2, bl = L * 0.5, bw = L * 0.13;
    const body = (col, grow) => {
      g.fillStyle = col;
      g.beginPath(); // body: head at +x
      g.moveTo(cx + bl * 0.55 + grow, cy);
      g.bezierCurveTo(cx + bl * 0.5, cy - bw - grow, cx - bl * 0.2, cy - bw * 0.95 - grow, cx - bl * 0.75, cy - bw * 0.2);
      g.lineTo(cx - bl * 0.75, cy + bw * 0.2);
      g.bezierCurveTo(cx - bl * 0.2, cy + bw * 0.95 + grow, cx + bl * 0.5, cy + bw + grow, cx + bl * 0.55 + grow, cy);
      g.fill();
      g.beginPath(); // tail
      g.moveTo(cx - bl * 0.7, cy);
      g.quadraticCurveTo(cx - bl * 0.95, cy - bw * 1.5 - grow, cx - bl * 1.12 - grow, cy - bw * 1.4 - grow);
      g.quadraticCurveTo(cx - bl * 0.95, cy, cx - bl * 1.12 - grow, cy + bw * 1.4 + grow);
      g.quadraticCurveTo(cx - bl * 0.95, cy + bw * 1.5 + grow, cx - bl * 0.7, cy);
      g.fill();
      for (const s of [-1, 1]) { // pectorals
        g.beginPath(); g.ellipse(cx + bl * 0.25, cy + s * (bw + grow * 0.5), bw * 0.9 + grow, bw * 0.35 + grow * 0.5, s * 0.6, 0, TAU); g.fill();
      }
    };
    body('rgba(0,0,0,0.10)', 5); body('rgba(0,0,0,0.16)', 2.5); body('rgba(0,0,0,0.34)', 0);
    // a faint warm koi glow deep down
    g.globalCompositeOperation = 'source-atop';
    glow(g, cx + bl * 0.2, cy, bl * 0.6, 'rgba(255,140,70,1)', 0.22);
    glow(g, cx - bl * 0.3, cy, bl * 0.3, 'rgba(255,240,230,1)', 0.12);
    g.globalCompositeOperation = 'source-over';
  });
  // 3) drifting lily pads: a top strip (kept to the corners, clear of the score) and a bottom strip
  const padsTop = layer(w * 1.2, h * 0.2, 1, (g, W, H) => {
    lilyPad(g, W * 0.06, H * 0.32, u * 0.11, 0.6, rnd, 0.9);
    lilyPad(g, W * 0.17, H * 0.12, u * 0.07, 2.1, rnd, 0.85);
    lilyPad(g, W * 0.95, H * 0.42, u * 0.12, 3.6, rnd, 0.9);
    lilyPad(g, W * 1.06, H * 0.12, u * 0.08, 1.2, rnd, 0.8);
    lilyPad(g, W * 0.84, H * 0.14, u * 0.06, 4.4, rnd, 0.8);
  });
  const padsBot = layer(w * 1.2, h * 0.24, 1, (g, W, H) => {
    lilyPad(g, W * 0.1, H * 0.62, u * 0.15, 5.2, rnd);
    lilyPad(g, W * 0.27, H * 0.82, u * 0.09, 1.0, rnd, 0.9);
    lilyPad(g, W * 0.6, H * 0.88, u * 0.08, 2.6, rnd, 0.85);
    lilyPad(g, W * 0.86, H * 0.55, u * 0.14, 0.3, rnd);
    lilyPad(g, W * 1.04, H * 0.84, u * 0.1, 3.9, rnd, 0.9);
    lotus(g, W * 0.12, H * 0.58, u * 0.07);
    lotus(g, W * 0.88, H * 0.5, u * 0.055);
  });
  // 4) one ripple ring set
  const ripple = rippleLayer(u * 0.18, 0.55);
  const spots = [[0.2, 0.9], [0.8, 0.12], [0.75, 0.86], [0.12, 0.14], [0.45, 0.94], [0.9, 0.9]];
  // 5) fireflies: two pulsing sheets (soft glows, kept out of the board's middle band mostly)
  const flies = (n) => layer(w, h, 1, (g, W, H) => {
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const band = rnd();
      const y = band < 0.45 ? H * (0.04 + rnd() * 0.16) : band < 0.9 ? H * (0.8 + rnd() * 0.17) : H * (0.2 + rnd() * 0.6);
      const x = band >= 0.9 ? (rnd() < 0.5 ? rnd() * W * 0.08 : W * (0.92 + rnd() * 0.08)) : rnd() * W;
      if (y < H * 0.12 && Math.abs(x - W / 2) < W * 0.2) continue; // keep clear of the score
      const s = u * (0.012 + rnd() * 0.012);
      glow(g, x, y, s * 3.2, 'rgba(210,255,120,1)', 0.35);
      glow(g, x, y, s, 'rgba(250,255,200,1)', 0.9);
    }
  });
  const fA = flies(12), fB = flies(10);
  return {
    draw(ctx, t, a) {
      put(ctx, water, 0, 0, a);
      // fish: one along the top band heading right, one along the bottom heading left
      const span = w + L * 1.4;
      const x1 = ((t * 11) % span) - L * 0.7, y1 = h * 0.16 + Math.sin(t * 0.21) * h * 0.035;
      const x2 = w - (((t * 8 + span * 0.55) % span) - L * 0.7), y2 = h * 0.8 + Math.sin(t * 0.17 + 2) * h * 0.03;
      putRot(ctx, fish, x1, y1, fish.w * 0.56, fish.h / 2, Math.cos(t * 0.21) * 0.12 + Math.sin(t * 1.3) * 0.03, a * 0.85);
      putRot(ctx, fish, x2, y2, fish.w * 0.56, fish.h / 2, Math.PI - Math.cos(t * 0.17 + 2) * 0.1 + Math.sin(t * 1.1) * 0.03, a * 0.75, 1.15);
      // pads drift on a slow swell
      put(ctx, padsTop, -w * 0.1 + Math.sin(t * 0.06) * w * 0.035, Math.sin(t * 0.11) * 3, a);
      put(ctx, padsBot, -w * 0.1 + Math.sin(t * 0.05 + 1.7) * w * 0.04, h * 0.76 + Math.sin(t * 0.09 + 0.5) * 4, a);
      // a ripple spreads, fades, and the next one starts elsewhere
      const P = 4.2, n = Math.floor(t / P), k = (t - n * P) / P;
      const [sx, sy] = spots[((n % spots.length) + spots.length) % spots.length];
      putRot(ctx, ripple, w * sx, h * sy, ripple.w / 2, ripple.h / 2, 0, a * 0.8 * (1 - k) * Math.min(1, k * 6), 0.25 + k * 0.95);
      // fireflies breathe in and out of phase and wander a little
      put(ctx, fA, Math.sin(t * 0.21) * 10, Math.cos(t * 0.17) * 8, a * (0.55 + 0.45 * Math.sin(t * 1.2)));
      put(ctx, fB, Math.cos(t * 0.19 + 1) * 12, Math.sin(t * 0.23 + 2) * 9, a * (0.55 + 0.45 * Math.sin(t * 0.9 + 2.4)));
    },
  };
}

// ------------------------------------------------------------------ Rainy Temple
export function raintemple(w, h, rnd) {
  const u = Math.min(w, h * 0.6);
  const floorY = h * 0.84;
  const eaveY = h * 0.075;
  const lx = [w * 0.15, w * 0.85];
  // 1) the night: temple eave across the top, pillars at the sides, wet stone court, mist, board veil
  const base = layer(w, h, 1, (g, W, H) => {
    const sg = g.createLinearGradient(0, 0, 0, H);
    sg.addColorStop(0, '#060814'); sg.addColorStop(0.5, '#0a1020'); sg.addColorStop(0.84, '#121a2c'); sg.addColorStop(1, '#05070c');
    g.fillStyle = sg; g.fillRect(0, 0, W, H);
    // far courtyard: misty pine and a distant hall roof on the horizon
    g.fillStyle = '#0c1220';
    g.beginPath(); g.moveTo(0, floorY);
    for (let x = 0; x <= W; x += 6) g.lineTo(x, floorY - u * (0.05 + 0.03 * Math.sin(x / W * 9 + 1) + 0.02 * Math.sin(x / W * 23)));
    g.lineTo(W, floorY); g.closePath(); g.fill();
    const hx = W * 0.5, hy = floorY - u * 0.06, hw = u * 0.32;
    g.fillStyle = '#0a0f1a';
    g.beginPath(); g.moveTo(hx - hw, hy); g.quadraticCurveTo(hx - hw * 0.5, hy - u * 0.05, hx, hy - u * 0.09); g.quadraticCurveTo(hx + hw * 0.5, hy - u * 0.05, hx + hw, hy); g.closePath(); g.fill();
    g.fillRect(hx - hw * 0.7, hy - u * 0.005, hw * 1.4, u * 0.05);
    // stone lanterns (toro) on the court, softly lit
    for (const [x, s] of [[W * 0.3, 1], [W * 0.7, 0.9]]) {
      const b = floorY + u * 0.01, k = u * 0.05 * s;
      g.fillStyle = '#141a26';
      g.fillRect(x - k * 0.18, b - k * 1.6, k * 0.36, k * 1.6);
      g.fillRect(x - k * 0.45, b - k * 2.2, k * 0.9, k * 0.6);
      g.beginPath(); g.moveTo(x - k * 0.75, b - k * 2.2); g.lineTo(x, b - k * 2.75); g.lineTo(x + k * 0.75, b - k * 2.2); g.closePath(); g.fill();
      g.fillRect(x - k * 0.5, b - k * 0.12, k, k * 0.12);
      glow(g, x, b - k * 1.9, k * 1.2, 'rgba(255,190,110,1)', 0.35);
      g.fillStyle = 'rgba(255,200,130,0.8)'; g.fillRect(x - k * 0.16, b - k * 2.05, k * 0.32, k * 0.3);
    }
    // mist along the court
    const mist = g.createLinearGradient(0, floorY - u * 0.12, 0, floorY + u * 0.06);
    mist.addColorStop(0, 'rgba(120,140,180,0)'); mist.addColorStop(0.6, 'rgba(120,140,180,0.12)'); mist.addColorStop(1, 'rgba(120,140,180,0)');
    g.fillStyle = mist; g.fillRect(0, floorY - u * 0.12, W, u * 0.18);
    // wet stone court: flagstones in perspective with puddles that hold the lantern light
    const fg = g.createLinearGradient(0, floorY, 0, H);
    fg.addColorStop(0, '#141b2a'); fg.addColorStop(1, '#070a10');
    g.fillStyle = fg; g.fillRect(0, floorY, W, H - floorY);
    g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 1.2;
    for (let i = 1; i < 6; i++) { const y = floorY + (H - floorY) * Math.pow(i / 6, 1.4); g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    for (let i = -6; i <= 6; i++) { g.beginPath(); g.moveTo(W / 2 + i * W * 0.06, floorY); g.lineTo(W / 2 + i * W * 0.2, H); g.stroke(); }
    g.strokeStyle = 'rgba(150,170,210,0.06)';
    for (let i = 1; i < 6; i++) { const y = floorY + (H - floorY) * Math.pow(i / 6, 1.4) + 1.2; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    for (const [px, py, pw] of [[0.2, 0.93, 0.26], [0.78, 0.9, 0.3], [0.5, 0.97, 0.22]]) {
      g.save(); g.translate(W * px, H * py); g.scale(1, 0.22);
      const pg = g.createRadialGradient(0, 0, 0, 0, 0, W * pw * 0.5);
      pg.addColorStop(0, 'rgba(30,40,64,0.9)'); pg.addColorStop(0.8, 'rgba(20,28,46,0.7)'); pg.addColorStop(1, 'rgba(20,28,46,0)');
      g.fillStyle = pg; g.beginPath(); g.arc(0, 0, W * pw * 0.5, 0, TAU); g.fill();
      g.restore();
    }
    // lantern reflections in the puddles (warm, wavy)
    for (const x of lx) {
      for (let i = 0; i < 9; i++) {
        const yy = H * 0.89 + i * u * 0.012, ww = u * (0.07 - i * 0.005);
        g.fillStyle = `rgba(255,120,70,${0.32 - i * 0.03})`;
        g.fillRect(x - ww / 2 + (rnd() - 0.5) * u * 0.015, yy, ww, 1.6);
      }
      glow(g, x, H * 0.93, u * 0.14, 'rgba(255,110,60,1)', 0.18);
    }
    // pillars (dark lacquer, lit on the inner edge by the lanterns)
    for (const [x0, dir] of [[0, 1], [W, -1]]) {
      const pw = u * 0.075, x = x0 + dir * u * 0.02;
      const pg = g.createLinearGradient(x, 0, x + dir * pw, 0);
      pg.addColorStop(0, '#12070a'); pg.addColorStop(0.7, '#2a0d10'); pg.addColorStop(1, '#4a1a16');
      g.fillStyle = pg; g.fillRect(Math.min(x, x + dir * pw), 0, pw, floorY + u * 0.02);
      g.fillStyle = '#0a0608'; g.fillRect(Math.min(x, x + dir * pw) - u * 0.01, floorY - u * 0.005, pw + u * 0.02, u * 0.03); // base stone
    }
    // the eave: roof underside with rafter ends, sweeping up at the corners
    g.fillStyle = '#07060a';
    g.beginPath(); g.moveTo(0, 0); g.lineTo(W, 0); g.lineTo(W, eaveY - u * 0.07);
    g.quadraticCurveTo(W * 0.82, eaveY + u * 0.01, W * 0.5, eaveY + u * 0.015);
    g.quadraticCurveTo(W * 0.18, eaveY + u * 0.01, 0, eaveY - u * 0.07); g.closePath(); g.fill();
    // rafter ends + a lit lower edge
    g.fillStyle = 'rgba(120,70,50,0.35)';
    for (let i = 0; i < 22; i++) {
      const x = (i + 0.5) / 22 * W, yy = eaveY + u * 0.015 - Math.pow(Math.abs(x / W - 0.5) * 2, 2.2) * u * 0.085;
      g.fillRect(x - u * 0.008, yy - u * 0.03, u * 0.016, u * 0.02);
    }
    g.strokeStyle = 'rgba(255,150,90,0.22)'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(0, eaveY - u * 0.07); g.quadraticCurveTo(W * 0.18, eaveY + u * 0.01, W * 0.5, eaveY + u * 0.015); g.quadraticCurveTo(W * 0.82, eaveY + u * 0.01, W, eaveY - u * 0.07); g.stroke();
    // warm spill of lantern light under the eave, at the sides only
    for (const x of lx) glow(g, x, eaveY + u * 0.14, u * 0.32, 'rgba(255,120,60,1)', 0.16);
    boardVeil(g, W, H, 0.44);
  });
  // 2) paper lantern (chochin) with its own halo; hung from the eave, sways a touch
  const LH = u * 0.14, LW = LH * 0.78, cord = Math.max(u * 0.05, h * 0.2 - eaveY - LH * 0.6);
  const lantern = layer(LW * 3.2, LH * 2.6 + cord, 1, (g, W, H) => {
    const cx = W / 2, top = cord, cy = top + LH * 0.62;
    glow(g, cx, cy, LH * 1.25, 'rgba(255,110,50,1)', 0.35);
    g.strokeStyle = '#1a0c08'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx, 0); g.lineTo(cx, top + LH * 0.08); g.stroke();
    // body
    const bg = g.createRadialGradient(cx - LW * 0.12, cy - LH * 0.08, LW * 0.05, cx, cy, LW * 0.62);
    bg.addColorStop(0, '#ffe6a0'); bg.addColorStop(0.35, '#ff8a3c'); bg.addColorStop(0.8, '#d0302a'); bg.addColorStop(1, '#7a1414');
    g.fillStyle = bg;
    g.beginPath(); g.ellipse(cx, cy, LW / 2, LH * 0.44, 0, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(90,20,14,0.45)'; g.lineWidth = 1;
    for (let i = 1; i < 7; i++) { const y = cy - LH * 0.44 + i * LH * 0.88 / 7, k = Math.sqrt(Math.max(0, 1 - Math.pow((y - cy) / (LH * 0.44), 2))); g.beginPath(); g.moveTo(cx - LW / 2 * k, y); g.quadraticCurveTo(cx, y + LH * 0.03, cx + LW / 2 * k, y); g.stroke(); }
    // a dark kanji-like mark (an abstract brush stroke, not text)
    g.strokeStyle = 'rgba(40,6,6,0.55)'; g.lineWidth = LW * 0.07; g.lineCap = 'round';
    g.beginPath(); g.moveTo(cx - LW * 0.12, cy - LH * 0.12); g.lineTo(cx + LW * 0.12, cy - LH * 0.12); g.moveTo(cx, cy - LH * 0.2); g.lineTo(cx, cy + LH * 0.14); g.moveTo(cx - LW * 0.14, cy + LH * 0.02); g.quadraticCurveTo(cx, cy + LH * 0.1, cx + LW * 0.14, cy + LH * 0.0); g.stroke();
    // caps + tassel
    g.fillStyle = '#16090a';
    g.fillRect(cx - LW * 0.28, cy - LH * 0.5, LW * 0.56, LH * 0.09);
    g.fillRect(cx - LW * 0.28, cy + LH * 0.41, LW * 0.56, LH * 0.09);
    g.strokeStyle = '#c0402a'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(cx, cy + LH * 0.5); g.lineTo(cx, cy + LH * 0.72); g.stroke();
    g.fillStyle = 'rgba(255,240,200,0.5)'; g.beginPath(); g.ellipse(cx - LW * 0.2, cy - LH * 0.18, LW * 0.06, LH * 0.12, 0.2, 0, TAU); g.fill();
  });
  // 3) rain: a far and a near sheet, scrolled down and wrapped (two draws each)
  const rain = (n, l0, l1, a0, a1, lw) => layer(w, h, 1, (g, W, H) => {
    g.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const x = rnd() * W * 1.1, y = rnd() * H, l = l0 + rnd() * (l1 - l0);
      g.strokeStyle = `rgba(175,195,235,${a0 + rnd() * (a1 - a0)})`; g.lineWidth = lw;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x - l * 0.2, y + l); g.stroke();
    }
  });
  const far = rain(150, 7, 13, 0.1, 0.2, 1), near = rain(46, 16, 26, 0.16, 0.3, 1.3);
  // 4) splash rings on the wet court (a field that fades in and out, moving each beat)
  const ringField = layer(w * 1.6, h - floorY, 1, (g, W, H) => {
    for (let i = 0; i < 26; i++) {
      const x = rnd() * W, y = H * (0.12 + rnd() * 0.82), R = u * (0.012 + (y / H) * 0.025) * (0.7 + rnd() * 0.6);
      g.save(); g.translate(x, y); g.scale(1, 0.32);
      g.strokeStyle = 'rgba(190,210,245,0.42)'; g.lineWidth = 1.2;
      g.beginPath(); g.arc(0, 0, R, 0, TAU); g.stroke();
      g.strokeStyle = 'rgba(190,210,245,0.2)';
      g.beginPath(); g.arc(0, 0, R * 1.6, 0, TAU); g.stroke();
      g.restore();
    }
  });
  return {
    draw(ctx, t, a) {
      put(ctx, base, 0, 0, a);
      // lanterns: hung from the eave, swaying out of step
      for (let i = 0; i < 2; i++) {
        const ang = Math.sin(t * 0.8 + i * 1.9) * 0.05 + Math.sin(t * 1.9 + i) * 0.012;
        const flick = 0.92 + 0.08 * Math.sin(t * 7.3 + i * 2.1) * Math.sin(t * 3.1 + i);
        putRot(ctx, lantern, lx[i], eaveY - u * 0.02, lantern.w / 2, 0, ang, a * flick);
      }
      // rain
      const fy = (t * 260) % h, ny = (t * 560) % h;
      put(ctx, far, -w * 0.05, fy - h, a * 0.9); put(ctx, far, -w * 0.05, fy, a * 0.9);
      put(ctx, near, -w * 0.05, ny - h, a); put(ctx, near, -w * 0.05, ny, a);
      // splash rings
      const P = 0.9, n = Math.floor(t / P), k = (t - n * P) / P;
      const off = ((n * 0.37) % 1) * w * 0.6;
      put(ctx, ringField, -off, floorY, a * Math.sin(k * Math.PI) * 0.9);
    },
  };
}
