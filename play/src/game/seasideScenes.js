// Seaside Café scene (v3 default backdrop, DESIGN.md "v3 PIVOT"): the view from the café window over a little cove.
// A warm sky, a layered sea, a harbour village on the left headland, a distant red-and-white lighthouse on the
// right, bunting under the window lintel and a cup steaming on the sill. Six cheap variants (chapters.js
// BACKDROP_VARIANTS): sunrise, noon, rain, golden, dusk and starry, each a tint plus a few props (sun, clouds,
// rain, lit windows, stars, the lighthouse beam).
//
// Same contract as sceneArt.js: every layer is painted ONCE per screen size into an offscreen canvas, and a frame
// only draws those canvases (about 10-16 drawImage calls with translate / scale, no paths or gradients per frame).
// Motion: waves slide, clouds drift, steam rises, gulls glide, rain falls, stars twinkle, the lighthouse beam sweeps
// at dusk and at night. Calm / reduced motion stops the renderer's scene clock, so the picture holds still.
// Shapes come from the seeded mulberry32 stream sceneArt.js hands in (never the game RNG, never an unseeded random).
//
// Readability: this is the one LIGHT backdrop family. The board is an opaque tray (Driftwood), so pieces never sit
// on the scene itself; the busy features (village, lighthouse, sill props) keep to the edges and the top and bottom
// bands, and the middle of the sea stays calm and plain.

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
  const L = { c, w, h, res: c.width / w, rects: null };
  if (w * h >= 60000) L.rects = opaqueRects(c); // big, mostly empty layers (the window frame, the shore) draw only their painted parts
  return L;
}

/**
 * Perf: cover a layer's painted pixels with a few rects (32 px tiles; empty tiles are skipped and runs of
 * tile rows with the same spans are merged), so put() never blends large fully transparent areas. Pixel-exact:
 * only tiles with no painted pixel at all are left out. Null when trimming would not save much.
 */
function opaqueRects(c) {
  let px;
  try { px = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; } catch (_) { return null; }
  const T = 32, W = c.width, H = c.height, tw = Math.ceil(W / T), th = Math.ceil(H / T);
  const rows = [];
  let filled = 0;
  for (let ty = 0; ty < th; ty++) {
    const used = new Uint8Array(tw);
    const y1 = Math.min(H, (ty + 1) * T);
    for (let y = ty * T; y < y1; y++) {
      for (let x = 0, o = y * W * 4 + 3; x < W; x++, o += 4) if (px[o]) used[(x / T) | 0] = 1;
    }
    const spans = [];
    for (let tx = 0; tx < tw; tx++) {
      if (!used[tx]) continue;
      let e = tx;
      while (e + 1 < tw && used[e + 1]) e++;
      spans.push([tx * T, Math.min(W, (e + 1) * T)]);
      filled += e - tx + 1;
      tx = e;
    }
    rows.push(spans);
  }
  if (filled > tw * th * 0.75) return null;
  const out = [];
  const key = (sp) => sp.map((v) => v.join(',')).join(';');
  for (let ty = 0; ty < th;) {
    const k = key(rows[ty]);
    let e = ty;
    while (e + 1 < th && key(rows[e + 1]) === k) e++;
    for (const [x0, x1] of rows[ty]) out.push([x0, ty * T, x1 - x0, Math.min(H, (e + 1) * T) - ty * T]);
    ty = e + 1;
  }
  return out;
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

function put(ctx, L, x, y, alpha = 1) {
  if (alpha <= 0.002) return;
  ctx.globalAlpha = alpha;
  if (!L.rects) { ctx.drawImage(L.c, x, y, L.w, L.h); return; }
  // one blit clipped to the painted tiles (a clip, not per-tile source rects, so no resampling seams)
  const k = L.res;
  ctx.save();
  ctx.beginPath();
  for (const [sx, sy, sw, sh] of L.rects) ctx.rect(x + sx / k, y + sy / k, sw / k, sh / k);
  ctx.clip();
  ctx.drawImage(L.c, x, y, L.w, L.h);
  ctx.restore();
}

/** Horizontally periodic layer (period L.w / 2) scrolled right by `off`, drawn into (x, y, L.w / 2, L.h). */
function putSlide(ctx, L, x, y, off, alpha = 1) {
  if (alpha <= 0.002) return;
  const pw = L.w / 2, k = L.res;
  const s = pw - (((off % pw) + pw) % pw);
  ctx.globalAlpha = alpha;
  ctx.drawImage(L.c, s * k, 0, pw * k, L.h * k, x, y, pw, L.h);
}

/** Vertically periodic layer (period L.h / 2) scrolled down by `off`, drawn into (x, y, L.w, L.h / 2). */
function putScroll(ctx, L, x, y, off, alpha = 1) {
  if (alpha <= 0.002) return;
  const ph = L.h / 2, k = L.res;
  const s = ph - (((off % ph) + ph) % ph);
  ctx.globalAlpha = alpha;
  ctx.drawImage(L.c, 0, s * k, L.w * k, ph * k, x, y, L.w, ph);
}

function rr(g, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

function lin(g, x0, y0, x1, y1, stops) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([o, c]) => gr.addColorStop(o, c));
  return gr;
}

/** A soft cumulus cloud: overlapping puffs, lit from above. */
function cloud(g, x, y, s, top, bot) {
  const puffs = [[-0.9, 0.12, 0.5], [-0.4, -0.12, 0.66], [0.25, -0.22, 0.74], [0.85, 0.05, 0.52], [0, 0.18, 0.6]];
  g.fillStyle = lin(g, 0, y - s * 0.9, 0, y + s * 0.6, [[0, top], [1, bot]]);
  g.beginPath();
  for (const [dx, dy, r] of puffs) { g.moveTo(x + dx * s + r * s, y + dy * s); g.arc(x + dx * s, y + dy * s, r * s, 0, TAU); }
  g.fill();
  g.fillRect(x - s * 1.1, y + s * 0.05, s * 2.2, s * 0.6 - s * 0.05); // flat base
}

// ------------------------------------------------------------------ variants
// sky: 4 stops top -> horizon. sea: 3 stops horizon -> sill. sun: [x, y, r, core, halo] in fractions (null = none).
// hill: headland greens [lit, shade]; rock; lit: village windows glow; beam: lighthouse beam sweeps; stars;
// rain; clouds: [count, top, bottom, alpha]; tint: a soft colour wash over the far scenery; glints: sea sparkle colour.
export const HARBOUR_VARIANTS = {
  sunrise: {
    sky: ['#f4c4b4', '#f8d6be', '#fbe6c8', '#fff1d6'], sea: ['#a9d2cf', '#7fb6ba', '#5e98a4'],
    sun: [0.5, 0.33, 0.05, '#fff6dc', 'rgba(255,196,150,0.55)'], hill: ['#9cc28a', '#6e9a6a'], rock: '#b9a48e',
    clouds: [4, '#fff6ee', '#f2c6b6', 0.85], glints: 'rgba(255,236,206,0.75)', tint: 'rgba(255,214,190,0.18)',
    lit: false, beam: false, stars: 0, rain: false, gulls: 3, house: 1,
  },
  noon: {
    sky: ['#7fc0e4', '#a6d6ee', '#cbe8f2', '#eaf6f4'], sea: ['#6fbcc6', '#3f9cb0', '#2c7f98'],
    sun: [0.8, 0.09, 0.045, '#fffdf2', 'rgba(255,250,220,0.6)'], hill: ['#8fc47a', '#5f9a5a'], rock: '#c4b29a',
    clouds: [5, '#ffffff', '#dceaf2', 0.95], glints: 'rgba(255,255,255,0.85)', tint: null,
    lit: false, beam: false, stars: 0, rain: false, gulls: 3, house: 1,
  },
  rain: {
    sky: ['#8e9ca6', '#a4b0b6', '#b9c2c2', '#cbd0cc'], sea: ['#8aa2a4', '#6a878e', '#536f7a'],
    sun: null, hill: ['#7e9e7a', '#5c7a5e'], rock: '#9a9288',
    clouds: [6, '#c8cfd2', '#97a2aa', 0.9], glints: 'rgba(230,238,240,0.4)', tint: 'rgba(150,164,172,0.28)',
    lit: true, beam: false, stars: 0, rain: true, gulls: 0, house: 0.82,
  },
  golden: {
    sky: ['#eea86a', '#f4be7c', '#f9d496', '#fde6b6'], sea: ['#8cb6b0', '#5e949c', '#3f7686'],
    sun: [0.56, 0.28, 0.06, '#fff2c4', 'rgba(255,190,100,0.6)'], hill: ['#a4b86c', '#728a52'], rock: '#c0a07a',
    clouds: [3, '#fff0d4', '#f0b47e', 0.8], glints: 'rgba(255,226,150,0.85)', tint: 'rgba(255,190,110,0.16)',
    lit: false, beam: false, stars: 0, rain: false, gulls: 2, house: 1,
  },
  dusk: {
    sky: ['#4c5482', '#8a6c94', '#d4889a', '#f4b088'], sea: ['#6a7a98', '#45587a', '#2f405e'],
    sun: [0.52, 0.352, 0.055, '#ffe0b0', 'rgba(255,150,120,0.5)'], hill: ['#6a7a76', '#4a5a5e'], rock: '#7a7078',
    clouds: [3, '#f2b4a4', '#9a7090', 0.75], glints: 'rgba(255,200,170,0.6)', tint: 'rgba(120,90,140,0.2)',
    lit: true, beam: true, stars: 30, rain: false, gulls: 1, house: 0.78,
  },
  starry: {
    sky: ['#121c38', '#1a2948', '#24375a', '#33486a'], sea: ['#26385a', '#1c2c4a', '#14203a'],
    sun: null, moon: [0.76, 0.12, 0.036], hill: ['#3a4a52', '#2a3640'], rock: '#4a4c58',
    clouds: [2, '#4a5878', '#2c3a58', 0.6], glints: 'rgba(230,236,255,0.55)', tint: 'rgba(40,56,100,0.3)',
    lit: true, beam: true, stars: 110, rain: false, gulls: 0, house: 0.6,
  },
};
export const HARBOUR_VARIANT_IDS = Object.keys(HARBOUR_VARIANTS);

// ------------------------------------------------------------------ the scene

/** Mix a #rrggbb colour toward black (k < 1) for darker variants. */
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * k));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

export function harbour(w, h, rnd, theme) {
  const V = HARBOUR_VARIANTS[(theme && theme.variant) || 'sunrise'] || HARBOUR_VARIANTS.sunrise;
  const u = Math.min(w, h * 0.6);
  const HY = h * 0.36;          // horizon
  const SY = h * 0.885;         // top of the sill
  const FT = Math.max(10, h * 0.03), FS = Math.max(8, w * 0.035); // window frame: top lintel, sides
  const LX = w * 0.86, LTop = h * 0.215; // lighthouse

  // 1) sky: gradient, sun / moon glow, stars (painted at half res; the stars get their own crisp layer)
  const sky = layer(w, HY + 2, 0.5, (g, W, H) => {
    g.fillStyle = lin(g, 0, 0, 0, H, [[0, V.sky[0]], [0.4, V.sky[1]], [0.75, V.sky[2]], [1, V.sky[3]]]);
    g.fillRect(0, 0, W, H);
    if (V.sun) {
      const [sx, sy, sr, , halo] = V.sun;
      glow(g, sx * W, sy * h, u * 0.7, halo, 0.9);
    }
    if (V.moon) glow(g, V.moon[0] * W, V.moon[1] * h, u * 0.35, 'rgba(210,220,255,0.35)', 1);
  });
  const stars = V.stars ? layer(w, HY, 1, (g, W, H) => {
    for (let i = 0; i < V.stars; i++) {
      const x = rnd() * W, y = rnd() * H * (V.stars > 60 ? 0.85 : 0.5), s = 0.6 + rnd() * 1.3;
      g.globalAlpha = (0.35 + rnd() * 0.6) * (V.stars > 60 ? 1 : 0.7);
      g.fillStyle = rnd() < 0.2 ? '#ffe9b8' : '#ffffff';
      g.fillRect(x, y, s, s);
    }
    g.globalAlpha = 1;
  }) : null;
  const twinkle = V.stars > 60 ? layer(w, HY, 1, (g, W, H) => {
    g.fillStyle = '#ffffff';
    for (let i = 0; i < 14; i++) {
      const x = rnd() * W, y = rnd() * H * 0.8, s = 1.4 + rnd() * 1.4;
      g.globalAlpha = 0.9;
      g.beginPath(); g.moveTo(x, y - s * 1.8); g.lineTo(x + s * 0.4, y); g.lineTo(x, y + s * 1.8); g.lineTo(x - s * 0.4, y); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(x - s * 1.8, y); g.lineTo(x, y + s * 0.4); g.lineTo(x + s * 1.8, y); g.lineTo(x, y - s * 0.4); g.closePath(); g.fill();
    }
    g.globalAlpha = 1;
  }) : null;
  // sun or moon disc, crisp
  const orb = (V.sun || V.moon) ? layer(w, HY, 1, (g, W) => {
    if (V.sun) {
      const [sx, sy, sr, core] = V.sun;
      glow(g, sx * W, sy * h, u * sr * 2.4, core, 0.6);
      g.fillStyle = core; g.beginPath(); g.arc(sx * W, sy * h, u * sr, 0, TAU); g.fill();
    } else {
      const [mx, my, mr] = V.moon;
      g.fillStyle = '#f4f0dc'; g.beginPath(); g.arc(mx * W, my * h, u * mr, 0, TAU); g.fill();
      g.fillStyle = V.sky[0]; g.beginPath(); g.arc(mx * W + u * mr * 0.45, my * h - u * mr * 0.2, u * mr * 0.9, 0, TAU); g.fill();
    }
  }) : null;

  // 2) clouds: a periodic strip (two copies of the same set) that drifts slowly to the right
  const [cn, ctop, cbot, ca] = V.clouds;
  const clouds = layer(w * 2, HY * 0.75, 0.5, (g, W, H) => {
    const set = [];
    for (let i = 0; i < cn; i++) set.push([(i + 0.2 + rnd() * 0.6) / cn * (W / 2), H * (0.18 + rnd() * 0.55), u * (0.06 + rnd() * 0.06)]);
    for (const off of [0, W / 2]) for (const [x, y, s] of set) cloud(g, x + off, y, s, ctop, cbot);
  });

  // 3) the far shore: headlands, the village on the left and the lighthouse on the right (static)
  const shore = layer(w, h * 0.5, 1, (g, W) => {
    // far hazy hills on the horizon
    g.fillStyle = V.tint ? shade(V.hill[1], 0.95) : V.hill[1];
    g.globalAlpha = 0.45;
    g.beginPath(); g.moveTo(W * 0.25, HY);
    g.quadraticCurveTo(W * 0.45, HY - h * 0.035, W * 0.62, HY - h * 0.01);
    g.quadraticCurveTo(W * 0.7, HY - h * 0.02, W * 0.78, HY); g.closePath(); g.fill();
    g.globalAlpha = 1;
    // left headland (the village hill)
    const lh = () => {
      g.beginPath();
      g.moveTo(0, h * 0.2);
      g.bezierCurveTo(W * 0.16, h * 0.205, W * 0.3, h * 0.25, W * 0.42, HY + h * 0.012);
      g.lineTo(0, HY + h * 0.03); g.closePath();
    };
    lh();
    g.fillStyle = lin(g, 0, h * 0.2, 0, HY, [[0, V.hill[0]], [1, V.hill[1]]]); g.fill();
    // cliff face along the water
    g.fillStyle = V.rock;
    g.beginPath(); g.moveTo(0, HY - h * 0.012); g.quadraticCurveTo(W * 0.2, HY - h * 0.02, W * 0.42, HY + h * 0.012); g.lineTo(0, HY + h * 0.03); g.closePath(); g.fill();
    // cottages on the hill: little colour-washed houses with pitched roofs
    const walls = ['#f6efe2', '#f2c9a0', '#cfe3e6', '#f4dfa0', '#e8b8b0', '#f6efe2'];
    const roofs = ['#c8644a', '#4f6f8a', '#b5523e', '#6a8a6e', '#4f6f8a', '#b5523e'];
    const hw = u * 0.075;
    const spots = [[0.03, 0.212], [0.12, 0.218], [0.2, 0.236], [0.07, 0.262], [0.27, 0.262], [0.16, 0.283]];
    spots.forEach(([fx, fy], i) => {
      const x = W * fx, y = h * fy, bw = hw * (0.9 + (i % 3) * 0.15), bh = hw * 0.78;
      g.fillStyle = shade(walls[i], V.house); g.fillRect(x, y - bh, bw, bh);
      g.fillStyle = 'rgba(60,40,30,0.18)'; g.fillRect(x + bw * 0.62, y - bh, bw * 0.38, bh);
      g.fillStyle = shade(roofs[i], V.house);
      g.beginPath(); g.moveTo(x - bw * 0.08, y - bh); g.lineTo(x + bw * 0.5, y - bh - bw * 0.42); g.lineTo(x + bw * 1.08, y - bh); g.closePath(); g.fill();
      // windows (lit at dusk / night / in the rain) and a door
      const lit = V.lit && (i % 3 !== 1);
      g.fillStyle = lit ? '#ffd27a' : 'rgba(70,90,110,0.55)';
      g.fillRect(x + bw * 0.16, y - bh * 0.72, bw * 0.2, bw * 0.18);
      g.fillRect(x + bw * 0.62, y - bh * 0.72, bw * 0.2, bw * 0.18);
      g.fillStyle = 'rgba(80,56,40,0.6)'; g.fillRect(x + bw * 0.4, y - bh * 0.42, bw * 0.18, bh * 0.42);
      if (lit) glow(g, x + bw * 0.5, y - bh * 0.6, bw * 0.9, 'rgba(255,200,110,0.35)', 1);
    });
    // right headland
    g.beginPath();
    g.moveTo(W, h * 0.255);
    g.bezierCurveTo(W * 0.9, h * 0.255, W * 0.8, h * 0.29, W * 0.66, HY + h * 0.01);
    g.lineTo(W, HY + h * 0.03); g.closePath();
    g.fillStyle = lin(g, 0, h * 0.25, 0, HY, [[0, V.hill[0]], [1, V.hill[1]]]); g.fill();
    g.fillStyle = V.rock;
    g.beginPath(); g.moveTo(W, HY - h * 0.016); g.quadraticCurveTo(W * 0.8, HY - h * 0.016, W * 0.66, HY + h * 0.01); g.lineTo(W, HY + h * 0.03); g.closePath(); g.fill();
    // the lighthouse: tapered tower, two red bands, gallery and lamp room
    const lw = u * 0.034, lb = u * 0.05, top = LTop, base = h * 0.262;
    const tower = () => { g.beginPath(); g.moveTo(LX - lw, top); g.lineTo(LX + lw, top); g.lineTo(LX + lb, base); g.lineTo(LX - lb, base); g.closePath(); };
    tower(); g.fillStyle = shade('#fbf6ec', V.house); g.fill();
    g.save(); tower(); g.clip();
    g.fillStyle = shade('#d9473d', V.house);
    const th = base - top;
    g.fillRect(LX - lb, top + th * 0.2, lb * 2, th * 0.22); g.fillRect(LX - lb, top + th * 0.62, lb * 2, th * 0.22);
    g.fillStyle = 'rgba(60,40,30,0.18)'; g.fillRect(LX + lw * 0.3, top, lb, th);
    g.restore();
    g.fillStyle = shade('#2f3a4e', V.house); g.fillRect(LX - lw * 1.45, top - u * 0.008, lw * 2.9, u * 0.012);
    g.fillStyle = V.lit ? '#ffe7a0' : shade('#f8e8b8', V.house); g.fillRect(LX - lw * 0.75, top - u * 0.034, lw * 1.5, u * 0.026);
    g.fillStyle = shade('#c8463c', V.house);
    g.beginPath(); g.moveTo(LX - lw * 1.05, top - u * 0.034); g.lineTo(LX, top - u * 0.058); g.lineTo(LX + lw * 1.05, top - u * 0.034); g.closePath(); g.fill();
    // a little keeper's cottage beside it
    g.fillStyle = shade('#f6efe2', V.house); g.fillRect(LX - lb * 2.9, base - u * 0.03, u * 0.05, u * 0.03);
    g.fillStyle = shade('#4f6f8a', V.house);
    g.beginPath(); g.moveTo(LX - lb * 3.0, base - u * 0.03); g.lineTo(LX - lb * 2.9 + u * 0.025, base - u * 0.05); g.lineTo(LX - lb * 2.9 + u * 0.054, base - u * 0.03); g.closePath(); g.fill();
    // atmosphere wash so the far shore sits back
    if (V.tint) { g.fillStyle = V.tint; g.fillRect(0, 0, W, HY + h * 0.03); }
  });
  const lamp = (V.beam) ? layer(u * 0.28, u * 0.28, 1, (g, W, H) => glow(g, W / 2, H / 2, W / 2, 'rgba(255,226,150,0.85)', 1)) : null;
  // beam: a long soft wedge from the lamp to the right (mirrored by a negative x-scale as it sweeps)
  const beam = V.beam ? layer(w * 0.9, u * 0.2, 0.5, (g, W, H) => {
    g.fillStyle = lin(g, 0, 0, W, 0, [[0, 'rgba(255,236,180,0.55)'], [0.5, 'rgba(255,236,180,0.18)'], [1, 'rgba(255,236,180,0)']]);
    g.beginPath(); g.moveTo(0, H * 0.46); g.lineTo(W, 0); g.lineTo(W, H); g.lineTo(0, H * 0.54); g.closePath(); g.fill();
  }) : null;

  // 4) the sea: gradient, still sparkle lines and two sliding wave strips (far and near)
  const sea = layer(w, SY - HY + 4, 0.5, (g, W, H) => {
    g.fillStyle = lin(g, 0, 0, 0, H, [[0, V.sea[0]], [0.45, V.sea[1]], [1, V.sea[2]]]);
    g.fillRect(0, 0, W, H);
    if (V.sun) { // the sun's path on the water
      const sx = V.sun[0] * W;
      // a soft pool of light on the water under a low sun (a high noon sun only leaves sparkles)
      if (V.sun[1] > 0.2) {
        g.save(); g.translate(sx, 0); g.scale(1, 2.2);
        glow(g, 0, 0, u * 0.32, V.glints, 0.55);
        g.restore();
      }
    }
  });
  const waveStrip = (H, n, col, lw, amp) => layer(w * 2, H, 1, (g, W) => {
    g.strokeStyle = col; g.lineCap = 'round';
    const set = [];
    for (let i = 0; i < n; i++) set.push([rnd() * (W / 2), H * (0.1 + rnd() * 0.8), u * (0.03 + rnd() * 0.05)]);
    for (const off of [0, W / 2]) for (const [x, y, s] of set) {
      g.lineWidth = lw * (0.7 + (y / H) * 0.6);
      const k = s * (0.6 + (y / H) * 0.9);
      g.beginPath(); g.moveTo(x + off - k, y); g.quadraticCurveTo(x + off - k * 0.5, y - amp, x + off, y); g.quadraticCurveTo(x + off + k * 0.5, y + amp * 0.6, x + off + k, y); g.stroke();
    }
  });
  const farWaves = waveStrip((SY - HY) * 0.4, 26, V.glints, 1, 1.4);
  const nearWaves = waveStrip((SY - HY) * 0.6, 20, V.glints.replace(/[\d.]+\)$/, '0.55)'), 1.8, 2.6);
  const sparkle = (V.sun) ? layer(w, (SY - HY) * 0.5, 1, (g, W, H) => {
    g.fillStyle = '#ffffff';
    const sx = V.sun[0] * W;
    for (let i = 0; i < 26; i++) {
      const y = rnd() * H, spread = u * (0.05 + (y / H) * 0.2), x = sx + (rnd() - 0.5) * 2 * spread, s = 1 + rnd() * 2;
      g.globalAlpha = 0.5 + rnd() * 0.5;
      g.fillRect(x - s, y, s * 2, 1);
    }
    g.globalAlpha = 1;
  }) : null;

  // a little sailboat that rocks at anchor near the village
  const boat = layer(u * 0.16, u * 0.16, 2, (g, W, H) => {
    const cx = W / 2, by = H * 0.74;
    g.fillStyle = shade('#c8463c', V.house);
    g.beginPath(); g.moveTo(cx - W * 0.36, by); g.lineTo(cx + W * 0.4, by); g.lineTo(cx + W * 0.28, by + H * 0.12); g.lineTo(cx - W * 0.26, by + H * 0.12); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(cx - W * 0.3, by + H * 0.02, W * 0.64, H * 0.02);
    g.strokeStyle = shade('#6a5040', V.house); g.lineWidth = Math.max(1, W * 0.025);
    g.beginPath(); g.moveTo(cx, by); g.lineTo(cx, H * 0.12); g.stroke();
    g.fillStyle = shade('#fbf6ec', V.house);
    g.beginPath(); g.moveTo(cx + W * 0.03, H * 0.14); g.lineTo(cx + W * 0.3, by - H * 0.05); g.lineTo(cx + W * 0.03, by - H * 0.05); g.closePath(); g.fill();
    g.fillStyle = shade('#f3d9a8', V.house);
    g.beginPath(); g.moveTo(cx - W * 0.03, H * 0.22); g.lineTo(cx - W * 0.24, by - H * 0.05); g.lineTo(cx - W * 0.03, by - H * 0.05); g.closePath(); g.fill();
  });

  // 5) weather: rain streaks (periodic, falls) and drops on the glass (still)
  const rain = V.rain ? layer(w, h * 2, 0.5, (g, W, H) => {
    g.strokeStyle = 'rgba(235,242,246,0.45)'; g.lineCap = 'round';
    const set = [];
    for (let i = 0; i < 90; i++) set.push([rnd() * W, rnd() * (H / 2), 8 + rnd() * 14, 0.6 + rnd() * 0.8]);
    for (const off of [0, H / 2]) for (const [x, y, l, lw] of set) {
      g.lineWidth = lw; g.beginPath(); g.moveTo(x, y + off); g.lineTo(x - l * 0.12, y + off + l); g.stroke();
    }
  }) : null;
  const glass = V.rain ? layer(w, SY, 1, (g, W, H) => {
    for (let i = 0; i < 60; i++) {
      const x = FS + rnd() * (W - FS * 2), y = FT + rnd() * (H - FT), r = 0.8 + rnd() * 2.2;
      g.fillStyle = 'rgba(80,96,110,0.18)'; g.beginPath(); g.arc(x + 0.4, y + 0.6, r, 0, TAU); g.fill();
      g.fillStyle = 'rgba(245,250,252,0.55)'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(x - r * 0.35, y - r * 0.35, r * 0.3, 0, TAU); g.fill();
    }
  }) : null;

  // 6) gulls: one sprite, two wing poses
  const gull = (up) => layer(u * 0.07, u * 0.04, 2, (g, W, H) => {
    g.strokeStyle = V.stars > 60 ? '#cfd6e6' : '#4a4a52'; g.lineWidth = Math.max(1, W * 0.07); g.lineCap = 'round'; g.lineJoin = 'round';
    const cy = H * 0.6, dy = up ? -H * 0.4 : H * 0.05;
    g.beginPath(); g.moveTo(W * 0.06, cy + dy); g.quadraticCurveTo(W * 0.28, cy + dy - H * 0.25, W * 0.5, cy); g.quadraticCurveTo(W * 0.72, cy + dy - H * 0.25, W * 0.94, cy + dy); g.stroke();
  });
  const gullA = V.gulls ? gull(true) : null, gullB = V.gulls ? gull(false) : null;
  const gulls = [];
  for (let i = 0; i < V.gulls; i++) gulls.push({ y: h * (0.08 + rnd() * 0.16), sp: 9 + rnd() * 8, off: rnd() * w * 1.5, flap: 1.6 + rnd() * 0.9, ph: rnd() * TAU, s: 0.7 + rnd() * 0.5 });

  // 7) the window: lintel, side jambs, bunting, the sill and its props (static foreground)
  const frame = layer(w, h, 1, (g, W, H) => {
    const wood = (x, y, ww, hh, vertical) => {
      g.fillStyle = vertical ? lin(g, x, 0, x + ww, 0, [[0, '#e9dcc6'], [0.5, '#f6ecdc'], [1, '#d8c8ae']]) : lin(g, 0, y, 0, y + hh, [[0, '#f6ecdc'], [1, '#d8c8ae']]);
      g.fillRect(x, y, ww, hh);
    };
    // sides and lintel
    wood(0, 0, FS, H, true); wood(W - FS, 0, FS, H, true); wood(0, 0, W, FT, false);
    g.fillStyle = 'rgba(90,64,40,0.25)';
    g.fillRect(FS, FT, W - FS * 2, 2.5); g.fillRect(FS, FT, 2, SY - FT); g.fillRect(W - FS - 2, FT, 2, SY - FT);
    // bunting: two sagging strings of little flags
    const flagCols = ['#2f8f9d', '#e2847e', '#e3a23b', '#fbf3e4', '#6a9f6b'];
    const string = (y0, sag, n, size, phase) => {
      const pt = (t) => [FS + (W - FS * 2) * t, y0 + Math.sin(Math.PI * t) * sag];
      g.strokeStyle = 'rgba(110,84,60,0.75)'; g.lineWidth = 1.2;
      g.beginPath(); for (let i = 0; i <= 40; i++) { const [x, y] = pt(i / 40); if (i) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke();
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n, [x, y] = pt(t), [x2, y2] = pt(t + 0.5 / n * 0.8), ang = Math.atan2(y2 - y, x2 - x);
        g.save(); g.translate(x, y); g.rotate(ang);
        g.fillStyle = flagCols[(i + phase) % flagCols.length];
        g.beginPath(); g.moveTo(-size * 0.5, 0); g.lineTo(size * 0.5, 0); g.lineTo(0, size * 1.05); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(90,64,40,0.35)'; g.lineWidth = 1; g.stroke();
        g.restore();
      }
    };
    const fz = Math.max(8, u * 0.045);
    string(FT + 2, H * 0.035, 9, fz, 0);
    string(FT + 2, H * 0.06, 12, fz * 0.85, 2);
    // sill
    g.fillStyle = lin(g, 0, SY, 0, H, [[0, '#d9b98e'], [0.12, '#c9a274'], [0.2, '#a87f52'], [1, '#8a6440']]);
    g.fillRect(0, SY, W, H - SY);
    g.fillStyle = 'rgba(255,244,224,0.55)'; g.fillRect(0, SY, W, 2);
    g.fillStyle = 'rgba(70,46,24,0.3)'; g.fillRect(0, SY + (H - SY) * 0.2, W, 1.5);
    g.strokeStyle = 'rgba(110,76,44,0.25)'; g.lineWidth = 1;
    for (let i = 0; i < 4; i++) { const y = SY + (H - SY) * (0.35 + i * 0.16); g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(W * 0.3, y - 2, W * 0.6, y + 2, W, y); g.stroke(); }
    // a teacup on its saucer, bottom left
    const cx = W * 0.15, cs = u * 0.075, cb = SY + (H - SY) * 0.12;
    g.fillStyle = 'rgba(60,36,18,0.25)'; g.beginPath(); g.ellipse(cx, cb + cs * 0.12, cs * 1.25, cs * 0.22, 0, 0, TAU); g.fill();
    g.fillStyle = '#e8f2f6'; g.beginPath(); g.ellipse(cx, cb, cs * 1.15, cs * 0.24, 0, 0, TAU); g.fill();
    g.strokeStyle = '#6a8ea4'; g.lineWidth = 1.2; g.stroke();
    g.beginPath(); g.ellipse(cx + cs * 0.78, cb - cs * 0.55, cs * 0.26, cs * 0.24, 0, -1.6, 1.8); g.strokeStyle = '#4f97c4'; g.lineWidth = Math.max(2, cs * 0.14); g.stroke();
    g.fillStyle = lin(g, cx - cs, 0, cx + cs, 0, [[0, '#bfe2f5'], [0.45, '#7cc0e4'], [1, '#3f86b4']]);
    g.beginPath(); g.moveTo(cx - cs * 0.85, cb - cs * 0.95); g.bezierCurveTo(cx - cs * 0.85, cb - cs * 0.1, cx - cs * 0.4, cb, cx, cb); g.bezierCurveTo(cx + cs * 0.4, cb, cx + cs * 0.85, cb - cs * 0.1, cx + cs * 0.85, cb - cs * 0.95); g.closePath(); g.fill();
    g.strokeStyle = '#2f6a90'; g.lineWidth = 1.2; g.stroke();
    g.fillStyle = '#f2f9fd'; g.beginPath(); g.ellipse(cx, cb - cs * 0.95, cs * 0.85, cs * 0.2, 0, 0, TAU); g.fill();
    g.fillStyle = '#b8682e'; g.beginPath(); g.ellipse(cx, cb - cs * 0.93, cs * 0.72, cs * 0.14, 0, 0, TAU); g.fill();
    g.strokeStyle = '#d8a640'; g.lineWidth = 1.2; g.beginPath(); g.ellipse(cx, cb - cs * 0.95, cs * 0.85, cs * 0.2, 0, 0, TAU); g.stroke();
    // a seashell and a little pot of geraniums, bottom right
    const px = W * 0.86, ps = u * 0.06, pb = SY + (H - SY) * 0.14;
    g.fillStyle = 'rgba(60,36,18,0.25)'; g.beginPath(); g.ellipse(px, pb, ps * 1.1, ps * 0.2, 0, 0, TAU); g.fill();
    g.fillStyle = lin(g, px - ps, 0, px + ps, 0, [[0, '#e69a6c'], [0.5, '#cc7044'], [1, '#94482a']]);
    g.beginPath(); g.moveTo(px - ps * 0.8, pb - ps * 1.2); g.lineTo(px + ps * 0.8, pb - ps * 1.2); g.lineTo(px + ps * 0.6, pb); g.lineTo(px - ps * 0.6, pb); g.closePath(); g.fill();
    g.fillStyle = '#d27a4c'; g.fillRect(px - ps * 0.92, pb - ps * 1.36, ps * 1.84, ps * 0.3);
    for (const [dx, dy, r, c] of [[-0.6, -1.7, 0.42, '#5f9e56'], [0.6, -1.65, 0.42, '#6aa65e'], [0, -1.95, 0.4, '#5f9e56']]) { g.fillStyle = c; g.beginPath(); g.arc(px + dx * ps, pb + dy * ps, r * ps, 0, TAU); g.fill(); }
    for (const [dx, dy, r] of [[-0.45, -2.15, 0.36], [0.4, -2.3, 0.4], [0.0, -2.6, 0.34]]) {
      g.fillStyle = '#e0507a'; g.beginPath(); g.arc(px + dx * ps, pb + dy * ps, r * ps, 0, TAU); g.fill();
      g.fillStyle = '#ff9ab0'; g.beginPath(); g.arc(px + dx * ps - r * ps * 0.3, pb + dy * ps - r * ps * 0.3, r * ps * 0.4, 0, TAU); g.fill();
    }
    const shx = W * 0.7, shy = SY + (H - SY) * 0.16, ss = u * 0.03;
    g.fillStyle = '#f9b8a2'; g.beginPath(); g.moveTo(shx, shy); g.arc(shx, shy, ss * 1.2, Math.PI * 1.15, Math.PI * 1.85); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(176,82,62,0.6)'; g.lineWidth = 0.8;
    for (let i = 1; i < 5; i++) { const a = Math.PI * (1.15 + i * 0.14); g.beginPath(); g.moveTo(shx, shy); g.lineTo(shx + Math.cos(a) * ss * 1.15, shy + Math.sin(a) * ss * 1.15); g.stroke(); }
    // evening / rainy light: a warm glow in the room
    if (V.lit) glow(g, W * 0.15, H, u * 0.6, 'rgba(255,190,110,0.22)', 1);
  });

  // steam wisp sprite (rises from the sill cup)
  const cupX = w * 0.15, cupY = SY + (h - SY) * 0.12 - u * 0.075 * 1.05;
  const wisp = layer(u * 0.08, u * 0.16, 2, (g, W, H) => {
    g.lineCap = 'round';
    g.strokeStyle = V.stars > 60 ? 'rgba(220,226,240,0.7)' : 'rgba(255,255,255,0.85)'; g.lineWidth = Math.max(1.4, W * 0.12);
    g.beginPath(); g.moveTo(W * 0.5, H); g.bezierCurveTo(W * 0.85, H * 0.7, W * 0.15, H * 0.4, W * 0.55, H * 0.05); g.stroke();
  });

  const span = w * 1.5;
  return {
    draw(ctx, t, alpha = 1) {
      ctx.save();
      put(ctx, sky, 0, 0, alpha);
      if (stars) put(ctx, stars, 0, 0, alpha);
      if (twinkle) put(ctx, twinkle, 0, 0, alpha * (0.35 + 0.35 * Math.sin(t * 1.3)));
      if (orb) put(ctx, orb, 0, 0, alpha);
      putSlide(ctx, clouds, 0, 0, t * 3.5, alpha * ca);
      put(ctx, sea, 0, HY - 2, alpha);
      if (sparkle) put(ctx, sparkle, 0, HY + 2, alpha * (0.55 + 0.35 * Math.sin(t * 2.1)));
      putSlide(ctx, farWaves, 0, HY + 2 + Math.sin(t * 0.9) * 0.8, t * 4, alpha);
      putSlide(ctx, nearWaves, 0, HY + (SY - HY) * 0.38 + Math.sin(t * 0.7 + 1) * 1.6, -t * 6, alpha);
      put(ctx, shore, 0, 0, alpha);
      if (beam) {
        const sw = Math.cos(t * 0.55);
        const k = Math.abs(sw);
        put(ctx, lamp, LX - lamp.w / 2, LTop - u * 0.022 - lamp.h / 2, alpha * (0.5 + 0.5 * k));
        ctx.save();
        ctx.translate(LX, LTop - u * 0.022);
        ctx.scale(sw >= 0 ? 1 : -1, 1);
        ctx.scale(Math.max(0.05, 0.25 + 0.75 * k), 1);
        put(ctx, beam, 0, -beam.h / 2, alpha * (0.25 + 0.6 * k));
        ctx.restore();
      }
      // the boat rocks gently at anchor
      ctx.save();
      ctx.translate(w * 0.3, HY + (SY - HY) * 0.1 + Math.sin(t * 1.1) * 1.2);
      ctx.rotate(Math.sin(t * 0.9) * 0.05);
      put(ctx, boat, -boat.w / 2, -boat.h * 0.86, alpha);
      ctx.restore();
      for (const gl of gulls) {
        const x = ((t * gl.sp + gl.off) % span) - w * 0.2;
        const y = gl.y + Math.sin(t * 0.6 + gl.ph) * h * 0.006;
        const S = Math.sin(t * gl.flap * TAU * 0.5 + gl.ph) > 0 ? gullA : gullB;
        ctx.save(); ctx.translate(x, y); ctx.scale(gl.s, gl.s);
        put(ctx, S, -S.w / 2, -S.h / 2, alpha);
        ctx.restore();
      }
      if (rain) putScroll(ctx, rain, 0, 0, t * 260, alpha * 0.8);
      if (glass) put(ctx, glass, 0, 0, alpha);
      put(ctx, frame, 0, 0, alpha);
      // three steam wisps rising and fading in turn
      for (let i = 0; i < 3; i++) {
        const p = ((t / 3.2 + i / 3) % 1 + 1) % 1;
        const a = Math.sin(p * Math.PI) * 0.75;
        put(ctx, wisp, cupX - wisp.w / 2 + Math.sin(t * 1.3 + i * 2) * u * 0.006, cupY - wisp.h - p * u * 0.07, alpha * a);
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    },
  };
}

export const SEASIDE_SCENES = { harbour };
