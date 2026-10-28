// Deep Sea pack scenes (DESIGN.md "Premium themed packs"): Coral Reef and The Abyss.
// Same contract as sceneArt.js: every layer is painted ONCE per screen size into an offscreen canvas, and a
// frame only draws those canvases (2-8 drawImage calls, plus save / restore / translate / rotate / scale).
// The board band keeps a baked dark veil so the pieces stay the brightest thing on screen; the lively bits
// (the fish school, the anglerfish lure) sit between the HUD and the board, the kelp and the bubble columns hug
// the screen edges, and the reef floor sits below the board. Calm / reduced motion stops the scene clock, so the
// picture holds still.
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

// --------------------------------------------------------------- reef pieces for the scenery

/** Branching coral from (x, y) upward. */
function branchCoral(g, x, y, s, col, tip, rnd) {
  g.lineCap = 'round';
  const grow = (x0, y0, a, len, wd, d) => {
    const x1 = x0 + Math.cos(a) * len, y1 = y0 + Math.sin(a) * len;
    g.strokeStyle = col; g.lineWidth = wd;
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    if (d <= 0) { g.fillStyle = tip; ell(g, x1, y1, wd * 0.7, wd * 0.7); g.fill(); return; }
    grow(x1, y1, a - 0.35 - rnd() * 0.25, len * 0.74, wd * 0.74, d - 1);
    grow(x1, y1, a + 0.35 + rnd() * 0.25, len * 0.74, wd * 0.74, d - 1);
  };
  grow(x, y, -Math.PI / 2, s * 0.38, s * 0.11, 3);
}

/** A round brain coral dome on the sand. */
function brainCoral(g, x, y, s, base, dk, li) {
  ell(g, x, y, s, s * 0.62);
  g.fillStyle = lin(g, 0, y - s * 0.6, 0, y + s * 0.2, [[0, li], [0.6, base], [1, dk]]); g.fill();
  g.save(); g.clip();
  g.strokeStyle = dk; g.globalAlpha = 0.6; g.lineWidth = Math.max(1, s * 0.06);
  for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(x + i * s * 0.28, y + s); g.bezierCurveTo(x + i * s * 0.28 - s * 0.2, y, x + i * s * 0.28 + s * 0.2, y - s * 0.3, x + i * s * 0.2, y - s * 0.7); g.stroke(); }
  g.restore();
}

/** A sea fan: a lacy fan of thin lines. */
function seaFan(g, x, y, s, col) {
  g.strokeStyle = col; g.lineWidth = Math.max(0.8, s * 0.025); g.lineCap = 'round';
  for (let i = 0; i < 11; i++) {
    const a = -Math.PI / 2 + (i - 5) * 0.13;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * s * 0.5, y + Math.sin(a) * s * 0.6, x + Math.cos(a) * s, y + Math.sin(a) * s); g.stroke();
  }
  g.globalAlpha = 0.6;
  for (let k = 1; k <= 3; k++) { g.beginPath(); g.arc(x, y, s * k * 0.28, -Math.PI / 2 - 0.7, -Math.PI / 2 + 0.7); g.stroke(); }
  g.globalAlpha = 1;
}

/** A little anemone tuft. */
function anemone(g, x, y, s, col, tip) {
  g.lineCap = 'round';
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + (i - 4) * 0.22;
    g.strokeStyle = col; g.lineWidth = s * 0.12;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * s * 0.6, y + Math.sin(a) * s * 0.4, x + Math.cos(a) * s, y + Math.sin(a) * s); g.stroke();
    g.fillStyle = tip; ell(g, x + Math.cos(a) * s, y + Math.sin(a) * s, s * 0.07, s * 0.07); g.fill();
  }
}

/** A tiny side-view fish facing right, centred at (x, y), length s. */
function tinyFish(g, x, y, s, body, fin) {
  g.fillStyle = fin;
  g.beginPath(); g.moveTo(x - s * 0.3, y); g.lineTo(x - s * 0.55, y - s * 0.2); g.lineTo(x - s * 0.55, y + s * 0.2); g.closePath(); g.fill();
  ell(g, x, y, s * 0.36, s * 0.2); g.fillStyle = body; g.fill();
  g.fillStyle = 'rgba(255,255,255,0.45)'; ell(g, x - s * 0.02, y - s * 0.08, s * 0.2, s * 0.05); g.fill();
  g.fillStyle = '#0a1420'; ell(g, x + s * 0.2, y - s * 0.03, s * 0.04, s * 0.04); g.fill();
}

/** One kelp strand, base at the bottom centre of a (W, H) layer. */
function kelp(g, W, H, col, leaf, rnd) {
  const n = 10;
  g.strokeStyle = col; g.lineWidth = W * 0.07; g.lineCap = 'round';
  g.beginPath(); g.moveTo(W / 2, H);
  const pts = [];
  for (let i = 1; i <= n; i++) {
    const y = H - (i / n) * H * 0.97, x = W / 2 + Math.sin(i * 0.9) * W * 0.12;
    g.lineTo(x, y); pts.push([x, y]);
  }
  g.stroke();
  pts.forEach(([x, y], i) => {
    const s = i % 2 ? 1 : -1, len = W * (0.34 - i * 0.012) * (0.85 + rnd() * 0.3);
    g.fillStyle = leaf;
    g.beginPath(); g.moveTo(x, y);
    g.quadraticCurveTo(x + s * len * 0.6, y - len * 0.5, x + s * len, y - len * 0.2);
    g.quadraticCurveTo(x + s * len * 0.5, y + len * 0.05, x, y);
    g.fill();
  });
}

// --------------------------------------------------------------- Coral Reef

function coralreef(w, h, rnd) {
  const u = Math.min(w, h * 0.6);
  const floorY = h * 0.885;

  const base = layer(w, h, 1, (g, W, H) => {
    g.fillStyle = lin(g, 0, 0, 0, H, [[0, '#0c5868'], [0.16, '#084250'], [0.45, '#062e3a'], [0.8, '#05232e'], [1, '#03141a']]);
    g.fillRect(0, 0, W, H);
    glow(g, W * 0.5, -H * 0.06, W * 0.9, 'rgba(120,235,240,1)', 0.28); // the bright surface far above
    // far reef silhouettes in the blue haze
    g.fillStyle = 'rgba(10,70,80,0.55)';
    g.beginPath(); g.moveTo(0, floorY);
    for (let x = 0; x <= W; x += u * 0.04) g.lineTo(x, floorY - u * (0.05 + 0.04 * Math.sin(x / u * 9) + rnd() * 0.03));
    g.lineTo(W, floorY); g.closePath(); g.fill();
    boardVeil(g, W, H, 0.46);
    // sand floor
    g.fillStyle = lin(g, 0, floorY, 0, H, [[0, '#8a7a56'], [0.3, '#5a4e36'], [1, '#2a2418']]);
    g.beginPath(); g.moveTo(0, floorY + u * 0.02);
    for (let x = 0; x <= W; x += u * 0.05) g.lineTo(x, floorY + u * (0.01 + 0.012 * Math.sin(x / u * 6)));
    g.lineTo(W, H); g.lineTo(0, H); g.closePath(); g.fill();
    // sand caustic speckle (static)
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(220,255,240,${0.08 + rnd() * 0.12})`; ell(g, rnd() * W, floorY + u * 0.03 + rnd() * (H - floorY), u * (0.01 + rnd() * 0.02), u * 0.004); g.fill(); }
    // the reef
    const cols = [['#ff7a8a', '#ffc0c8'], ['#ff9a4a', '#ffd49a'], ['#c87ae8', '#f0c8ff'], ['#ffd84a', '#fff4b0']];
    let x = u * 0.04, i = 0;
    while (x < W) {
      const k = i % 5;
      if (k === 0) brainCoral(g, x, floorY + u * 0.03, u * 0.06, '#a05ac0', '#5a2a70', '#d8a0f0');
      else if (k === 1) branchCoral(g, x, floorY + u * 0.03, u * 0.16, cols[i % 4][0], cols[i % 4][1], rnd);
      else if (k === 2) seaFan(g, x, floorY + u * 0.03, u * 0.12, 'rgba(255,140,120,0.85)');
      else if (k === 3) anemone(g, x, floorY + u * 0.04, u * 0.07, '#ff9ad0', '#fff0fa');
      else branchCoral(g, x, floorY + u * 0.03, u * 0.12, '#ffb04a', '#ffe8a0', rnd);
      x += u * (0.1 + rnd() * 0.06); i++;
    }
    // small rocks
    for (let j = 0; j < 6; j++) { const rx = rnd() * W; ell(g, rx, floorY + u * 0.06, u * 0.03, u * 0.014); g.fillStyle = '#3a3a3a'; g.fill(); }
  });
  // god rays from the surface: soft slanted shafts that fade out before the board
  const rays = layer(w, h * 0.62, 1, (g, W, H) => {
    for (let i = 0; i < 6; i++) {
      const x0 = W * (0.05 + i * 0.18 + rnd() * 0.06), wd = u * (0.05 + rnd() * 0.06), sl = u * 0.22;
      g.fillStyle = lin(g, 0, 0, 0, H, [[0, 'rgba(190,255,250,0.2)'], [0.5, 'rgba(190,255,250,0.06)'], [1, 'rgba(190,255,250,0)']]);
      g.beginPath(); g.moveTo(x0, 0); g.lineTo(x0 + wd, 0); g.lineTo(x0 + wd * 2.2 + sl, H); g.lineTo(x0 + sl, H); g.closePath(); g.fill();
    }
  });
  // caustic shimmer near the surface: a net of bright wobbly cells
  const caustic = layer(w + u * 0.3, h * 0.2, 1, (g, W, H) => {
    // jittered, rounded cells so the net reads as light on water rather than a honeycomb
    g.strokeStyle = 'rgba(190,255,250,0.15)'; g.lineJoin = 'round';
    const cs = u * 0.075;
    for (let y = cs * 0.5; y < H; y += cs * 0.78) {
      for (let x = (y / cs) % 2 ? cs * 0.5 : 0; x < W; x += cs) {
        const cx = x + (rnd() - 0.5) * cs * 0.4, cy = y + (rnd() - 0.5) * cs * 0.3;
        const n = 5 + ((rnd() * 3) | 0), pts = [];
        for (let k = 0; k < n; k++) {
          const a = (k / n) * TAU + rnd() * 0.5, rr = cs * (0.3 + rnd() * 0.2);
          pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.7]);
        }
        const mid = (i) => { const p = pts[i % n], q = pts[(i + 1) % n]; return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]; };
        g.beginPath();
        g.moveTo(...mid(0));
        for (let k = 1; k <= n; k++) { const p = pts[k % n], m = mid(k); g.quadraticCurveTo(p[0], p[1], m[0], m[1]); }
        g.lineWidth = 0.9 + rnd() * 1.1;
        g.globalAlpha = Math.max(0, 1 - y / H);
        g.stroke();
      }
    }
    g.globalAlpha = 1;
  });
  // kelp strands at the screen edges
  const kelpL = layer(u * 0.16, h * 0.34, 2, (g, W, H) => kelp(g, W, H, '#2e7a3a', '#3e9a46', rnd));
  const kelpR = layer(u * 0.14, h * 0.28, 2, (g, W, H) => kelp(g, W, H, '#2a6e40', '#48a050', rnd));
  // a little school of fish
  const school = layer(u * 0.42, u * 0.16, 2, (g, W, H) => {
    const fish = [[0.12, 0.5], [0.3, 0.3], [0.32, 0.72], [0.5, 0.48], [0.66, 0.26], [0.7, 0.7], [0.88, 0.5]];
    for (const [fx, fy] of fish) tinyFish(g, fx * W, fy * H, u * (0.055 + rnd() * 0.01), '#ffd84a', '#3a8cf0');
  });
  // rising bubbles (periodic in y), drawn at both screen edges
  const ph = h * 0.5;
  const bubbles = layer(u * 0.08, ph * 2, 2, (g, W, H) => {
    for (let i = 0; i < 9; i++) {
      const x = W * (0.25 + rnd() * 0.5), y = rnd() * H / 2, s = u * (0.006 + rnd() * 0.01);
      for (const yy of [y, y + H / 2]) {
        g.strokeStyle = 'rgba(220,255,255,0.7)'; g.lineWidth = 1;
        g.beginPath(); g.arc(x, yy, s, 0, TAU); g.stroke();
        g.fillStyle = 'rgba(220,255,255,0.18)'; g.fill();
        g.fillStyle = 'rgba(255,255,255,0.8)'; ell(g, x - s * 0.35, yy - s * 0.35, s * 0.25, s * 0.25); g.fill();
      }
    }
  });
  const swim = w + u * 0.9; // the school crosses the screen in about 45 s

  return {
    draw(ctx, t, a) {
      put(ctx, base, 0, 0, a);
      put(ctx, rays, Math.sin(t * 0.07) * u * 0.04, 0, a * (0.75 + 0.25 * Math.sin(t * 0.31)));
      put(ctx, caustic, -u * 0.15 + Math.sin(t * 0.23) * u * 0.12, 0, a * 0.9);
      ctx.save(); ctx.translate(w * 0.05, h); ctx.rotate(Math.sin(t * 0.55) * 0.05);
      put(ctx, kelpL, -kelpL.w / 2, -kelpL.h, a * 0.9);
      ctx.restore();
      ctx.save(); ctx.translate(w * 0.95, h); ctx.rotate(Math.sin(t * 0.47 + 1.3) * 0.05); ctx.scale(-1, 1);
      put(ctx, kelpR, -kelpR.w / 2, -kelpR.h, a * 0.9);
      ctx.restore();
      const sx = ((t * u * 0.03) % swim) - u * 0.5;
      put(ctx, school, sx, h * 0.17 + Math.sin(t * 0.6) * u * 0.012, a * 0.8);
      putScroll(ctx, bubbles, w * 0.015 - bubbles.w / 2, h * 0.38, t * u * 0.05, a * 0.7);
      putScroll(ctx, bubbles, w * 0.985 - bubbles.w / 2, h * 0.36, t * u * 0.04 + ph * 0.5, a * 0.6);
    },
  };
}

// --------------------------------------------------------------- The Abyss

function abyss(w, h, rnd) {
  const u = Math.min(w, h * 0.6);
  const floorY = h * 0.9;

  const base = layer(w, h, 1, (g, W, H) => {
    g.fillStyle = lin(g, 0, 0, 0, H, [[0, '#04102a'], [0.3, '#030a1e'], [0.7, '#020616'], [1, '#01030a']]);
    g.fillRect(0, 0, W, H);
    glow(g, W * 0.2, H * 0.08, W * 0.7, 'rgba(40,90,170,1)', 0.16); // faint last light from far above
    glow(g, W * 0.85, H * 0.95, W * 0.5, 'rgba(60,40,140,1)', 0.12);
    boardVeil(g, W, H, 0.46);
    // dark rock ridge with a faint blue rim
    g.beginPath(); g.moveTo(0, H);
    for (let x = 0; x <= W; x += u * 0.03) g.lineTo(x, floorY - u * (0.02 + 0.03 * Math.abs(Math.sin(x / u * 5)) + rnd() * 0.015));
    g.lineTo(W, H); g.closePath();
    g.fillStyle = lin(g, 0, floorY - u * 0.06, 0, H, [[0, '#0a1630'], [1, '#02050c']]); g.fill();
    g.strokeStyle = 'rgba(90,140,220,0.3)'; g.lineWidth = 1.2; g.stroke();
    // glowing tube worms and sea pens on the ridge
    for (let i = 0; i < 9; i++) {
      const x = u * 0.05 + rnd() * (W - u * 0.1), hgt = u * (0.03 + rnd() * 0.05), y = floorY + u * 0.01;
      const col = i % 3 ? '120,240,255' : '200,140,255';
      g.strokeStyle = 'rgba(30,50,80,0.9)'; g.lineWidth = u * 0.008; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + u * 0.01, y - hgt * 0.5, x, y - hgt); g.stroke();
      glow(g, x, y - hgt, u * 0.03, `rgba(${col},1)`, 0.45);
      g.fillStyle = `rgba(${col},0.95)`; ell(g, x, y - hgt, u * 0.006, u * 0.006); g.fill();
    }
  });
  // the anglerfish: a dark round body, big eye, toothy grin; its lure is a separate glowing layer
  const fishW = u * 0.34, fishH = u * 0.26;
  const lureAt = [fishW * 0.08, fishH * 0.12]; // lure tip inside the angler layer
  const angler = layer(fishW, fishH, 2, (g, W, H) => {
    const cx = W * 0.56, cy = H * 0.6, R = H * 0.3;
    // tail
    g.fillStyle = '#0c1a30';
    g.beginPath(); g.moveTo(cx + R * 0.8, cy); g.lineTo(cx + R * 1.5, cy - R * 0.5); g.lineTo(cx + R * 1.42, cy + R * 0.5); g.closePath(); g.fill();
    // body
    ell(g, cx, cy, R * 1.05, R * 0.9);
    g.fillStyle = lin(g, 0, cy - R, 0, cy + R, [[0, '#1c3050'], [1, '#08101e']]); g.fill();
    g.strokeStyle = 'rgba(110,170,240,0.45)'; g.lineWidth = 1.2; g.stroke();
    // stalk to the lure
    g.strokeStyle = '#1c3050'; g.lineWidth = R * 0.08; g.lineCap = 'round';
    g.beginPath(); g.moveTo(cx - R * 0.2, cy - R * 0.85); g.quadraticCurveTo(cx - R * 0.4, H * 0.02, lureAt[0], lureAt[1]); g.stroke();
    // grin with little teeth
    g.fillStyle = '#04060c';
    g.beginPath(); g.moveTo(cx - R * 1.0, cy + R * 0.05); g.quadraticCurveTo(cx - R * 0.5, cy + R * 0.6, cx - R * 0.05, cy + R * 0.25); g.quadraticCurveTo(cx - R * 0.5, cy + R * 0.3, cx - R * 1.0, cy + R * 0.05); g.fill();
    g.fillStyle = 'rgba(230,240,255,0.85)';
    for (let i = 0; i < 4; i++) { const tx = cx - R * (0.9 - i * 0.22), ty = cy + R * (0.12 + i * 0.04); g.beginPath(); g.moveTo(tx, ty); g.lineTo(tx + R * 0.06, ty + R * 0.12); g.lineTo(tx + R * 0.12, ty); g.closePath(); g.fill(); }
    // big friendly eye
    ell(g, cx - R * 0.4, cy - R * 0.3, R * 0.24, R * 0.24); g.fillStyle = '#e8f4ff'; g.fill();
    ell(g, cx - R * 0.46, cy - R * 0.3, R * 0.14, R * 0.15); g.fillStyle = '#060a14'; g.fill();
    ell(g, cx - R * 0.5, cy - R * 0.36, R * 0.05, R * 0.05); g.fillStyle = '#ffffff'; g.fill();
    // fin
    g.fillStyle = '#132440';
    g.beginPath(); g.moveTo(cx + R * 0.1, cy + R * 0.2); g.quadraticCurveTo(cx + R * 0.5, cy + R * 0.7, cx + R * 0.1, cy + R * 0.75); g.closePath(); g.fill();
  });
  const lure = layer(u * 0.22, u * 0.22, 2, (g, W, H) => {
    glow(g, W / 2, H / 2, W / 2, 'rgba(160,255,230,1)', 0.55);
    glow(g, W / 2, H / 2, W * 0.16, 'rgba(240,255,220,1)', 1);
    g.fillStyle = '#ffffff'; ell(g, W / 2, H / 2, W * 0.035, W * 0.035); g.fill();
  });
  // bioluminescent specks (two sets, twinkling out of phase), periodic in y
  const specks = (n, cols) => layer(w, h * 2, 1, (g, W, H) => {
    for (let i = 0; i < n; i++) {
      const x = rnd() * W, y = rnd() * H / 2, s = 0.8 + rnd() * 1.4, col = cols[i % cols.length];
      for (const yy of [y, y + H / 2]) {
        glow(g, x, yy, s * 4, `rgba(${col},1)`, 0.35);
        g.fillStyle = `rgba(${col},0.95)`; g.beginPath(); g.arc(x, yy, s * 0.6, 0, TAU); g.fill();
      }
    }
  });
  const specksA = specks(26, ['120,240,255', '140,200,255']);
  const specksB = specks(20, ['200,150,255', '120,255,200']);
  // marine snow: pale flecks drifting down (near = bigger and faster)
  const snow = (n, smin, smax) => layer(w, h * 2, 1, (g, W, H) => {
    for (let i = 0; i < n; i++) {
      const x = rnd() * W, y = rnd() * H / 2, s = smin + rnd() * (smax - smin), al = 0.25 + rnd() * 0.35;
      for (const yy of [y, y + H / 2]) { g.fillStyle = `rgba(210,225,240,${al})`; ell(g, x, yy, s, s * 0.8, rnd()); g.fill(); }
    }
  });
  const snowFar = snow(90, 0.4, 0.9), snowNear = snow(40, 0.9, 1.7);

  return {
    draw(ctx, t, a) {
      put(ctx, base, 0, 0, a);
      putScroll(ctx, snowFar, 0, 0, t * u * 0.008, a * 0.8);
      putScroll(ctx, specksA, 0, 0, -t * u * 0.004, a * (0.7 + 0.3 * Math.sin(t * 0.7)));
      putScroll(ctx, specksB, 0, 0, -t * u * 0.0025, a * (0.7 + 0.3 * Math.sin(t * 0.7 + 2.4)));
      // the anglerfish drifts lazily in the band between the HUD and the board
      const ax = (w - fishW) * (0.6 + 0.3 * Math.sin(t * 0.11)), ay = h * 0.15 + Math.sin(t * 0.19) * u * 0.025;
      put(ctx, angler, ax, ay, a * 0.95);
      put(ctx, lure, ax + lureAt[0] - lure.w / 2, ay + lureAt[1] - lure.h / 2 + Math.sin(t * 1.3) * u * 0.004, a * (0.75 + 0.25 * Math.sin(t * 1.7)));
      putScroll(ctx, snowNear, 0, 0, t * u * 0.02, a * 0.85);
    },
  };
}

export const DEEPSEA_SCENES = { coralreef, abyss };
