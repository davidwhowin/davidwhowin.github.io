// Koi Pond orb skin (premium pack, DESIGN.md "Koi Pond pack"). Every tier is the creature or object itself
// (a shaped sticker: strong silhouette + one dominant body colour, crisp dark outline, thin light rim, glossy
// highlights), and, by user request, each one floats inside a transparent glass WATER BUBBLE (bubbleBack /
// bubbleFront below). Koi is the only pack with bubbles; the others stay free-standing. Everything stays inside
// the orb radius r, so hit areas and physics are unchanged. Frames are pre-drawn and cached by orbArt.js: frame = fin * 2 + blink, fin 0..2 (sway -1, 0, +1).
// Deterministic: no random numbers.

const TAU = Math.PI * 2;

export const KOI_NAMES = [null, 'Koi fry', 'Lily pad', 'Tancho koi', 'Kohaku koi', 'Asagi koi', 'Ogon koi', 'Butterfly koi', 'Koi pair', 'Lotus koi', 'Dragon koi'];
/** Dominant body colour per tier (particles, text). One distinct colour family per tier. */
export const KOI_COLORS = [null, '#ffad72', '#5fc25a', '#f3f1ec', '#ff5a36', '#4f97e6', '#ffc93a', '#a77cf0', '#25bfae', '#ff86bd', '#d8203a'];
export const koiColor = (tier) => KOI_COLORS[Math.max(1, Math.min(10, tier | 0))];

// ---------------------------------------------------------------- helpers
function ell(g, x, y, rx, ry, rot = 0) { g.beginPath(); g.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU); }
function lin(g, x0, y0, x1, y1, stops) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) gr.addColorStop(o, c);
  return gr;
}
function rad(g, x, y, r0, r1, stops, x1 = x, y1 = y) {
  const gr = g.createRadialGradient(x, y, r0, x1, y1, r1);
  for (const [o, c] of stops) gr.addColorStop(o, c);
  return gr;
}
const BIG = 4; // fill-the-clip rect half size, in r
function fillAll(g, r, style) { g.fillStyle = style; g.fillRect(-r * BIG, -r * BIG, r * BIG * 2, r * BIG * 2); }

/** Run a path tracer under a temporary transform (the path keeps the transformed points). */
function withT(g, x, y, a, fn) { g.save(); g.translate(x, y); if (a) g.rotate(a); fn(); g.restore(); }

/**
 * Sticker renderer: parts back to front, each { trace(g), paint(g), seam?, rim? }.
 * Pass 1 strokes + fills the union in the outline ink (one crisp outer outline); pass 2 paints each part
 * clipped to itself, adds a faint seam line where it overlaps earlier parts, and a thin light rim (lit top-left).
 */
function sticker(g, r, parts, ink) {
  g.save();
  g.lineJoin = 'round'; g.lineCap = 'round';
  g.fillStyle = ink; g.strokeStyle = ink; g.lineWidth = Math.max(1.6, r * 0.11);
  for (const p of parts) { g.beginPath(); p.trace(g); g.fill(); g.stroke(); }
  g.restore();
  parts.forEach((p, i) => {
    g.save();
    g.beginPath(); p.trace(g); g.clip();
    p.paint(g);
    g.lineJoin = 'round';
    if (i > 0 && p.seam !== false) {
      g.beginPath(); p.trace(g);
      g.strokeStyle = ink; g.globalAlpha = 0.6; g.lineWidth = Math.max(1, r * 0.05); g.stroke();
      g.globalAlpha = 1;
    }
    if (p.rim !== false) {
      g.beginPath(); p.trace(g);
      g.strokeStyle = lin(g, -r * 0.7, -r * 0.9, r * 0.5, r * 0.7, [[0, 'rgba(255,255,255,0.8)'], [0.45, 'rgba(255,255,255,0.28)'], [1, 'rgba(255,255,255,0)']]);
      g.lineWidth = Math.max(1, r * 0.075); g.stroke();
    }
    g.restore();
  });
}

/** Soft gloss: a blurred white ellipse (call while clipped to the part). */
function gloss(g, x, y, rx, ry, rot = -0.5, a = 0.75) {
  g.save();
  g.translate(x, y); g.rotate(rot); g.scale(1, ry / rx);
  g.fillStyle = rad(g, 0, 0, 0, rx, [[0, `rgba(255,255,255,${a})`], [0.55, `rgba(255,255,255,${a * 0.45})`], [1, 'rgba(255,255,255,0)']]);
  g.beginPath(); g.arc(0, 0, rx, 0, TAU); g.fill();
  g.restore();
}
/** Small crisp spark (the "wet" glint on top of a gloss). */
function glint(g, x, y, s) {
  g.fillStyle = 'rgba(255,255,255,0.95)';
  ell(g, x, y, s, s * 0.62, -0.6); g.fill();
}
/** Inner shade toward the bottom-right (call while clipped). */
function shade(g, r, cx, cy, rr, a = 0.32) {
  fillAll(g, r, rad(g, cx - rr * 0.35, cy - rr * 0.45, rr * 0.25, rr * 1.25, [[0, 'rgba(0,0,0,0)'], [0.6, 'rgba(0,0,0,0)'], [1, `rgba(20,10,40,${a})`]], cx, cy));
}

/** Kawaii face, h = head radius. */
function face(g, x, y, h, blink, { ink = '#24140f', mouth = 'smile', blush = true, spread = 1 } = {}) {
  const ex = h * 0.36 * spread, erx = h * 0.13, ery = h * 0.17;
  g.save();
  g.translate(x, y);
  g.lineCap = 'round'; g.lineJoin = 'round';
  if (blush) {
    g.fillStyle = 'rgba(255,95,130,0.5)';
    ell(g, -ex - h * 0.2, h * 0.2, h * 0.17, h * 0.1); g.fill();
    ell(g, ex + h * 0.2, h * 0.2, h * 0.17, h * 0.1); g.fill();
  }
  for (const sx of [-1, 1]) {
    if (blink) {
      g.strokeStyle = ink; g.lineWidth = Math.max(1, h * 0.075);
      g.beginPath(); g.arc(sx * ex, -ery * 0.1, erx * 1.05, 0.12 * Math.PI, 0.88 * Math.PI); g.stroke();
    } else {
      g.fillStyle = ink;
      ell(g, sx * ex, 0, erx, ery); g.fill();
      g.fillStyle = '#ffffff';
      g.beginPath(); g.arc(sx * ex - erx * 0.3, -ery * 0.38, erx * 0.46, 0, TAU); g.fill();
      g.globalAlpha = 0.85;
      g.beginPath(); g.arc(sx * ex + erx * 0.35, ery * 0.42, erx * 0.2, 0, TAU); g.fill();
      g.globalAlpha = 1;
    }
  }
  g.strokeStyle = ink; g.lineWidth = Math.max(1, h * 0.07);
  g.beginPath();
  if (mouth === 'o') {
    g.fillStyle = '#c23a4a';
    ell(g, 0, h * 0.27, h * 0.085, h * 0.075); g.fill(); g.stroke();
  } else if (mouth === 'cat') {
    g.arc(-h * 0.075, h * 0.2, h * 0.075, 0.05 * Math.PI, 0.95 * Math.PI);
    g.moveTo(h * 0.15, h * 0.2);
    g.arc(h * 0.075, h * 0.2, h * 0.075, 0.05 * Math.PI, 0.95 * Math.PI);
    g.stroke();
  } else if (mouth !== 'none') {
    g.arc(0, h * 0.13, h * 0.11, 0.18 * Math.PI, 0.82 * Math.PI); g.stroke();
  }
  g.restore();
}

// ---------------------------------------------------------------- koi body kit
/** Quadratic spine H→Q→T: point + unit tangent at t. */
function spine(H, Q, T, t) {
  const u = 1 - t;
  const x = u * u * H[0] + 2 * u * t * Q[0] + t * t * T[0];
  const y = u * u * H[1] + 2 * u * t * Q[1] + t * t * T[1];
  let dx = 2 * u * (Q[0] - H[0]) + 2 * t * (T[0] - Q[0]);
  let dy = 2 * u * (Q[1] - H[1]) + 2 * t * (T[1] - Q[1]);
  const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
  return [x, y, dx, dy];
}
/** One smooth contour: round head (radius hr at H) tapering along the spine to a neck of half width w1 at T. */
function bodyTrace(H, Q, T, hr, w1) {
  return (g) => {
    const N = 18, L = [], R = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const [x, y, dx, dy] = spine(H, Q, T, t);
      const w = w1 + (hr - w1) * (1 - Math.pow(t, 1.5));
      L.push([x - dy * w, y + dx * w]); R.push([x + dy * w, y - dx * w]);
    }
    g.moveTo(R[0][0], R[0][1]);
    // front cap: half circle around the head, away from the tail
    g.arc(H[0], H[1], hr, Math.atan2(R[0][1] - H[1], R[0][0] - H[0]), Math.atan2(L[0][1] - H[1], L[0][0] - H[0]), true);
    for (let i = 1; i <= N; i++) {
      const p = L[i - 1], q = L[i];
      g.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
    }
    g.lineTo(L[N][0], L[N][1]); g.lineTo(R[N][0], R[N][1]);
    for (let i = N - 1; i >= 0; i--) {
      const p = R[i + 1], q = R[i];
      g.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
    }
    g.closePath();
  };
}
/** Tail pointing along local -y from the origin. style: fan | fork | veil. */
function tailPath(g, s, style) {
  g.moveTo(0, s * 0.08);
  if (style === 'fork') {
    g.bezierCurveTo(-s * 0.2, -s * 0.2, -s * 0.5, -s * 0.6, -s * 0.52, -s * 1.02);
    g.quadraticCurveTo(-s * 0.18, -s * 0.62, 0, -s * 0.42);
    g.quadraticCurveTo(s * 0.18, -s * 0.62, s * 0.52, -s * 1.02);
    g.bezierCurveTo(s * 0.5, -s * 0.6, s * 0.2, -s * 0.2, 0, s * 0.08);
  } else if (style === 'veil') {
    g.bezierCurveTo(-s * 0.3, -s * 0.1, -s * 0.95, -s * 0.25, -s * 0.92, -s * 0.78);
    g.bezierCurveTo(-s * 0.7, -s * 0.62, -s * 0.62, -s * 0.95, -s * 0.38, -s * 0.9);
    g.quadraticCurveTo(-s * 0.15, -s * 0.48, 0, -s * 0.5);
    g.quadraticCurveTo(s * 0.15, -s * 0.48, s * 0.38, -s * 0.9);
    g.bezierCurveTo(s * 0.62, -s * 0.95, s * 0.7, -s * 0.62, s * 0.92, -s * 0.78);
    g.bezierCurveTo(s * 0.95, -s * 0.25, s * 0.3, -s * 0.1, 0, s * 0.08);
  } else {
    g.bezierCurveTo(-s * 0.18, -s * 0.18, -s * 0.62, -s * 0.48, -s * 0.56, -s * 0.92);
    g.quadraticCurveTo(-s * 0.22, -s * 0.66, 0, -s * 0.7);
    g.quadraticCurveTo(s * 0.22, -s * 0.66, s * 0.56, -s * 0.92);
    g.bezierCurveTo(s * 0.62, -s * 0.48, s * 0.18, -s * 0.18, 0, s * 0.08);
  }
  g.closePath();
}
/** Leaf-shaped fin from (0,0) along +x. */
function finPath(g, len, wid) {
  g.moveTo(0, -wid * 0.5);
  g.quadraticCurveTo(len * 0.55, -wid * 1.05, len, wid * 0.1);
  g.quadraticCurveTo(len * 0.5, wid * 0.85, 0, wid * 0.5);
  g.closePath();
}
/** Fin paint: base colour fading to a pale edge, with soft rays. */
function finPaint(r, x, y, a, len, c0, c1) {
  return (g) => {
    fillAll(g, r, rad(g, x, y, 0, len * 1.05, [[0, c0], [0.55, c0], [1, c1]]));
    g.save(); g.translate(x, y); g.rotate(a);
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = Math.max(0.8, r * 0.022); g.lineCap = 'round';
    for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(len * 0.12, 0); g.lineTo(len * 0.95, k * len * 0.13); g.stroke(); }
    g.restore();
  };
}
function tailPaint(r, x, y, s, c0, c1) {
  return (g) => {
    fillAll(g, r, rad(g, x, y, 0, s * 1.05, [[0, c0], [0.4, c0], [1, c1]]));
  };
}

/** A whole chibi koi: tail + pectorals behind a head-led body. Returns { parts, H, hr, face pos }. */
function koi(g, r, o, sway) {
  const { H, Q, T, hr } = o;
  const w1 = o.neck ?? r * 0.1;
  const [tx, ty, tdx, tdy] = spine(H, Q, T, 1);
  const ta = Math.atan2(tdx, -tdy) + sway * (o.tailSway ?? 0.14);
  const parts = [];
  // tail
  const tS = o.tail;
  parts.push({
    trace: (gg) => withT(gg, tx, ty, ta, () => tailPath(gg, tS, o.tailStyle || 'fan')),
    paint: (gg) => {
      tailPaint(r, tx, ty, tS, o.fin0, o.fin1)(gg);
      gg.save(); gg.translate(tx, ty); gg.rotate(ta);
      gg.strokeStyle = 'rgba(255,255,255,0.3)'; gg.lineWidth = Math.max(0.8, r * 0.022); gg.lineCap = 'round';
      for (let k = -3; k <= 3; k++) { gg.beginPath(); gg.moveTo(0, -tS * 0.1); gg.lineTo(k * tS * 0.16, -tS * 0.8); gg.stroke(); }
      gg.restore();
    },
  });
  // pectoral fins (behind the head)
  const [, , fdx, fdy] = spine(H, Q, T, 0);
  const back = Math.atan2(fdy, fdx); // direction head → tail
  for (const side of [-1, 1]) {
    const fl = o.finLen, fw = o.finWid ?? fl * 0.62;
    const base = back + side * (o.finAng ?? 2.0) - side * sway * 0.18;
    const fx = H[0] + Math.cos(back + side * Math.PI / 2) * hr * 0.62 + fdx * hr * 0.12;
    const fy = H[1] + Math.sin(back + side * Math.PI / 2) * hr * 0.62 + fdy * hr * 0.12;
    parts.push({
      trace: (gg) => withT(gg, fx, fy, base, () => finPath(gg, fl, fw)),
      paint: finPaint(r, fx, fy, base, fl, o.fin0, o.fin1),
    });
  }
  // body
  parts.push({
    trace: bodyTrace(H, Q, T, hr, w1),
    paint: (gg) => {
      fillAll(gg, r, rad(gg, H[0] - hr * 0.35, H[1] - hr * 0.5, hr * 0.1, hr * 2.2, o.body));
      if (o.patches) o.patches(gg);
      // dorsal ridge
      gg.strokeStyle = o.ridge || 'rgba(0,0,0,0.12)'; gg.lineWidth = Math.max(1, r * 0.06); gg.lineCap = 'round';
      gg.beginPath();
      for (let i = 0; i <= 10; i++) { const [x, y] = spine(H, Q, T, 0.42 + i * 0.05); if (i) gg.lineTo(x, y); else gg.moveTo(x, y); }
      gg.stroke();
      shade(gg, r, H[0], H[1], hr * 1.35, 0.26);
      gloss(gg, H[0] - hr * 0.38, H[1] - hr * 0.48, hr * 0.42, hr * 0.2, -0.55);
      glint(gg, H[0] - hr * 0.5, H[1] - hr * 0.52, hr * 0.08);
    },
  });
  return parts;
}
const fwd = (H, Q) => { const dx = H[0] - Q[0], dy = H[1] - Q[1]; const l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };

function spark(g, x, y, s, col = 'rgba(255,255,240,0.95)') {
  g.fillStyle = col;
  g.beginPath();
  g.moveTo(x, y - s); g.quadraticCurveTo(x, y, x + s, y); g.quadraticCurveTo(x, y, x, y + s); g.quadraticCurveTo(x, y, x - s, y); g.quadraticCurveTo(x, y, x, y - s);
  g.fill();
}

// ---------------------------------------------------------------- tiers
/** Simple koi tiers share the chibi kit; spec(r) gives geometry + colours. */
const KOI_SPECS = {
  1: (r) => ({ // Koi fry: round little blob, curled tail
    H: [-r * 0.04, r * 0.16], Q: [-r * 0.02, -r * 0.42], T: [r * 0.3, -r * 0.4], hr: r * 0.54, neck: r * 0.1,
    tail: r * 0.36, tailStyle: 'fan', finLen: r * 0.22, finAng: 1.9,
    body: [[0, '#ffe2c4'], [0.45, '#ffb07a'], [1, '#e8743e']], fin0: 'rgba(255,190,140,1)', fin1: 'rgba(255,236,214,1)',
    ink: '#5a2410', mouth: 'o',
    patches: null,
  }),
  3: (r) => ({ // Tancho: white, straight, red crown
    H: [0, r * 0.24], Q: [0, -r * 0.14], T: [0, -r * 0.36], hr: r * 0.46, neck: r * 0.1,
    tail: r * 0.6, tailStyle: 'fan', finLen: r * 0.4, finAng: 2.05,
    body: [[0, '#ffffff'], [0.55, '#f1f2f6'], [1, '#bcc4d6']], fin0: 'rgba(236,240,250,1)', fin1: 'rgba(196,214,240,1)',
    ink: '#33395a', mouth: 'smile', ridge: 'rgba(80,90,130,0.12)',
    patches: (g, r2, o) => {
      g.fillStyle = rad(g, o.H[0] - r * 0.05, o.H[1] - r * 0.24, r * 0.02, r * 0.17, [[0, '#ff7a6a'], [0.6, '#e8303a'], [1, '#b81c2a']]);
      g.beginPath(); g.arc(o.H[0], o.H[1] - r * 0.2, r * 0.155, 0, TAU); g.fill();
    },
  }),
  4: (r) => ({ // Kohaku: red with white patches, strong C curl
    H: [-r * 0.12, r * 0.22], Q: [-r * 0.34, -r * 0.7], T: [r * 0.36, -r * 0.24], hr: r * 0.46, neck: r * 0.1,
    tail: r * 0.48, tailStyle: 'fan', finLen: r * 0.34, finAng: 2.0, tailSway: 0.18,
    body: [[0, '#ffb39a'], [0.4, '#ff5a36'], [1, '#c52a16']], fin0: 'rgba(255,120,92,1)', fin1: 'rgba(255,226,214,1)',
    ink: '#5a160c', mouth: 'smile',
    patches: (g, r2, o) => {
      g.fillStyle = 'rgba(255,250,244,0.97)';
      ell(g, o.H[0] + r * 0.02, o.H[1] + r * 0.2, r * 0.32, r * 0.2); g.fill(); // white muzzle
      let [x, y] = spine(o.H, o.Q, o.T, 0.55);
      ell(g, x + r * 0.06, y, r * 0.09, r * 0.07, 0.6); g.fill();
      [x, y] = spine(o.H, o.Q, o.T, 0.2);
      ell(g, x - r * 0.12, y - r * 0.16, r * 0.11, r * 0.08, -0.5); g.fill();
    },
  }),
  5: (r) => ({ // Asagi: blue net scales, orange cheeks, forked tail, curls left
    H: [r * 0.02, r * 0.22], Q: [r * 0.12, -r * 0.16], T: [-r * 0.05, -r * 0.4], hr: r * 0.46, neck: r * 0.1,
    tail: r * 0.6, tailStyle: 'fork', finLen: r * 0.34, finAng: 2.0,
    body: [[0, '#cfe8ff'], [0.4, '#5aa2ea'], [1, '#2a5fae']], fin0: 'rgba(255,140,80,1)', fin1: 'rgba(255,214,170,1)',
    ink: '#13325e', mouth: 'smile',
    patches: (g, r2, o) => {
      g.strokeStyle = 'rgba(225,242,255,0.55)'; g.lineWidth = Math.max(0.8, r * 0.025);
      for (let i = 0; i < 6; i++) {
        const [x, y] = spine(o.H, o.Q, o.T, 0.18 + i * 0.13);
        for (const s of [-1, 0, 1]) { g.beginPath(); g.arc(x + s * r * 0.11, y, r * 0.075, 0.1 * Math.PI, 0.9 * Math.PI); g.stroke(); }
      }
      g.fillStyle = 'rgba(255,124,64,0.9)';
      ell(g, o.H[0] - r * 0.3, o.H[1] + r * 0.12, r * 0.12, r * 0.18, 0.3); g.fill();
      ell(g, o.H[0] + r * 0.3, o.H[1] + r * 0.12, r * 0.12, r * 0.18, -0.3); g.fill();
    },
  }),
  6: (r) => ({ // Ogon: wide metallic gold, wing-like pectorals
    H: [0, r * 0.2], Q: [0, -r * 0.14], T: [0, -r * 0.34], hr: r * 0.5, neck: r * 0.12,
    tail: r * 0.6, tailStyle: 'fan', finLen: r * 0.5, finWid: r * 0.36, finAng: 1.72,
    body: [[0, '#fffbe0'], [0.3, '#ffd84a'], [0.75, '#f0a816'], [1, '#b86e00']], fin0: 'rgba(255,214,90,1)', fin1: 'rgba(255,248,206,1)',
    ink: '#5e3500', mouth: 'cat', ridge: 'rgba(160,90,0,0.18)',
    patches: (g, r2, o) => {
      g.strokeStyle = 'rgba(255,255,255,0.32)'; g.lineWidth = Math.max(0.8, r * 0.03);
      for (let i = 0; i < 4; i++) { const [x, y] = spine(o.H, o.Q, o.T, 0.3 + i * 0.16); g.beginPath(); g.arc(x, y + r * 0.06, r * 0.2, 1.15 * Math.PI, 1.85 * Math.PI); g.stroke(); }
    },
  }),
  7: (r) => ({ // Butterfly koi: violet, long flowing veil fins
    H: [0, r * 0.26], Q: [r * 0.04, -r * 0.12], T: [0, -r * 0.28], hr: r * 0.42, neck: r * 0.09,
    tail: r * 0.72, tailStyle: 'veil', finLen: r * 0.56, finWid: r * 0.3, finAng: 2.45, tailSway: 0.1,
    body: [[0, '#efe4ff'], [0.4, '#b08af6'], [1, '#6a40c8']], fin0: 'rgba(206,176,255,1)', fin1: 'rgba(255,170,222,1)',
    ink: '#2e1863', mouth: 'smile',
    patches: (g, r2, o) => {
      g.fillStyle = 'rgba(255,255,255,0.85)';
      ell(g, o.H[0], o.H[1] + r * 0.18, r * 0.26, r * 0.16); g.fill();
      g.fillStyle = 'rgba(255,150,210,0.55)';
      const [x, y] = spine(o.H, o.Q, o.T, 0.7); ell(g, x, y, r * 0.09, r * 0.12); g.fill();
    },
  }),
};

function drawChibi(g, r, tier, sway, blink) {
  const o = KOI_SPECS[tier](r);
  const orig = o.patches;
  if (orig) o.patches = (gg) => orig(gg, r, o);
  const parts = koi(g, r, o, sway);
  sticker(g, r, parts, o.ink);
  const [fx, fy] = fwd(o.H, o.Q);
  face(g, o.H[0] + fx * o.hr * 0.18, o.H[1] + fy * o.hr * 0.12 + o.hr * 0.02, o.hr, blink, { ink: o.ink, mouth: o.mouth });
  if (tier === 6) { spark(g, -r * 0.62, -r * 0.42, r * 0.09); spark(g, r * 0.5, -r * 0.7, r * 0.07); spark(g, r * 0.66, r * 0.3, r * 0.06); }
}

// 2 Lily pad: notched green pad, pink bud, a baby koi tail peeking out
function drawLily(g, r, sway, blink) {
  const ink = '#14401c';
  const cx = 0, cy = r * 0.06, R = r * 0.84;
  const n0 = -Math.PI / 2 + 0.95, n1 = n0 + 0.5; // notch toward upper-right
  const ta = 2.2 + sway * 0.2;
  const tx = r * 0.55, ty = r * 0.52;
  const bx = -r * 0.42, by = -r * 0.5, ba = -0.25 + sway * 0.09;
  const parts = [
    { // baby koi tail under the pad
      trace: (g2) => withT(g2, tx, ty, ta, () => tailPath(g2, r * 0.42, 'fan')),
      paint: tailPaint(r, tx, ty, r * 0.42, '#ff8a4c', '#ffe1c8'),
    },
    { // pad
      trace: (g2) => { g2.moveTo(cx, cy); g2.arc(cx, cy, R, n1, n0 + TAU, false); g2.closePath(); },
      paint: (g2) => {
        fillAll(g2, r, rad(g2, cx - R * 0.35, cy - R * 0.4, R * 0.1, R * 1.25, [[0, '#c6f59c'], [0.45, '#6fcd5a'], [1, '#2f8a3a']]));
        g2.strokeStyle = 'rgba(30,100,40,0.45)'; g2.lineWidth = Math.max(1, r * 0.035); g2.lineCap = 'round';
        for (let i = 0; i < 9; i++) {
          const a = n1 + 0.25 + i * ((TAU - 0.5 - 0.5) / 8);
          g2.beginPath(); g2.moveTo(cx, cy); g2.quadraticCurveTo(cx + Math.cos(a - 0.12) * R * 0.5, cy + Math.sin(a - 0.12) * R * 0.5, cx + Math.cos(a) * R * 0.92, cy + Math.sin(a) * R * 0.92); g2.stroke();
        }
        shade(g2, r, cx, cy, R * 1.05, 0.3);
        gloss(g2, cx - R * 0.42, cy - R * 0.42, R * 0.34, R * 0.16, -0.7, 0.6);
        // water drop
        g2.fillStyle = 'rgba(220,255,250,0.55)'; ell(g2, cx + R * 0.48, cy + R * 0.18, R * 0.09, R * 0.075); g2.fill();
        glint(g2, cx + R * 0.45, cy + R * 0.15, R * 0.03);
      },
    },
    { // pink bud
      trace: (g2) => withT(g2, bx, by, ba, () => {
        g2.moveTo(0, r * 0.2);
        g2.bezierCurveTo(-r * 0.3, r * 0.12, -r * 0.24, -r * 0.18, 0, -r * 0.34);
        g2.bezierCurveTo(r * 0.24, -r * 0.18, r * 0.3, r * 0.12, 0, r * 0.2);
        g2.closePath();
      }),
      paint: (g2) => {
        fillAll(g2, r, rad(g2, bx - r * 0.06, by - r * 0.1, 0, r * 0.36, [[0, '#fff0f6'], [0.5, '#ff9cc8'], [1, '#e2508e']]));
        g2.save(); g2.translate(bx, by); g2.rotate(ba);
        g2.strokeStyle = 'rgba(190,40,100,0.5)'; g2.lineWidth = Math.max(1, r * 0.03);
        g2.beginPath(); g2.moveTo(0, r * 0.18); g2.quadraticCurveTo(-r * 0.1, -r * 0.05, 0, -r * 0.3); g2.stroke();
        g2.beginPath(); g2.moveTo(0, r * 0.18); g2.quadraticCurveTo(r * 0.1, -r * 0.05, 0, -r * 0.3); g2.stroke();
        g2.restore();
        gloss(g2, bx - r * 0.07, by - r * 0.1, r * 0.08, r * 0.05, -0.9, 0.7);
      },
    },
  ];
  sticker(g, r, parts, ink);
  face(g, cx - r * 0.04, cy + r * 0.12, r * 0.5, blink, { ink: '#16361a', mouth: 'cat' });
}

// 8 Koi pair: two koi chasing in a yin-yang swirl, tails breaking out of the round
function drawPair(g, r, sway, blink) {
  const ink = '#0e3836';
  const R = r * 0.74;
  const half = (g2) => {
    g2.moveTo(0, -R);
    g2.arc(0, -R / 2, R / 2, -Math.PI / 2, Math.PI / 2, false);
    g2.arc(0, R / 2, R / 2, -Math.PI / 2, Math.PI / 2, true);
    g2.arc(0, 0, R, Math.PI / 2, -Math.PI / 2, false);
    g2.closePath();
  };
  const fish = [
    { rot: 0, body: [[0, '#b8fff2'], [0.45, '#2cc8b4'], [1, '#0f7f78']], fin0: '#3fd6c2', fin1: '#d6fff8' },
    { rot: Math.PI, body: [[0, '#ffffff'], [0.5, '#fff1d6'], [1, '#e8b98a']], fin0: '#ffcf9a', fin1: '#fff6ea' },
  ];
  const parts = [];
  for (const f of fish) {
    const c = Math.cos(f.rot), s = Math.sin(f.rot);
    const P = (x, y) => [x * c - y * s, x * s + y * c];
    const [tx, ty] = P(-R * 0.22, R * 0.92);
    const ta = Math.atan2(-0.62, -0.8) + f.rot + sway * 0.16 * (f.rot ? -1 : 1);
    parts.push({ trace: (g2) => withT(g2, tx, ty, ta, () => tailPath(g2, r * 0.34, 'fan')), paint: tailPaint(r, tx, ty, r * 0.34, f.fin0, f.fin1) });
    const [px, py] = P(-R * 0.9, -R * 0.18);
    const pa = Math.PI + 0.35 + f.rot - sway * 0.15;
    parts.push({ trace: (g2) => withT(g2, px, py, pa, () => finPath(g2, r * 0.22, r * 0.15)), paint: finPaint(r, px, py, pa, r * 0.22, f.fin0, f.fin1) });
  }
  fish.forEach((f) => {
    const c = Math.cos(f.rot), s = Math.sin(f.rot);
    const hx = (0) * c - (-R / 2) * s, hy = (0) * s + (-R / 2) * c;
    parts.push({
      trace: (g2) => withT(g2, 0, 0, f.rot, () => half(g2)),
      paint: (g2) => {
        fillAll(g2, r, rad(g2, hx - R * 0.2, hy - R * 0.25, R * 0.05, R * 1.3, f.body));
        // scales
        g2.strokeStyle = 'rgba(255,255,255,0.28)'; g2.lineWidth = Math.max(0.8, r * 0.022);
        for (let i = 0; i < 5; i++) {
          const a = f.rot + Math.PI * (0.62 + i * 0.13);
          g2.beginPath(); g2.arc(Math.cos(a) * R * 0.62, Math.sin(a) * R * 0.62, r * 0.08, a + 0.4 * Math.PI, a + 1.1 * Math.PI); g2.stroke();
        }
        shade(g2, r, 0, 0, R * 1.1, 0.22);
        gloss(g2, hx - R * 0.16, hy - R * 0.2, R * 0.2, R * 0.1, -0.6 + f.rot * 0, 0.7);
      },
    });
  });
  sticker(g, r, parts, ink);
  // faces: one eye each (they are seen from the side as they chase), plus a blush and smile
  fish.forEach((f, i) => {
    const c = Math.cos(f.rot), s = Math.sin(f.rot);
    const P = (x, y) => [x * c - y * s, x * s + y * c];
    const [ex, ey] = P(R * 0.12, -R * 0.52);
    const inkF = i ? '#3a2410' : '#063331';
    g.save();
    g.translate(ex, ey);
    const er = R * 0.13;
    if (blink) {
      g.strokeStyle = inkF; g.lineWidth = Math.max(1, r * 0.05); g.lineCap = 'round';
      g.beginPath(); g.arc(0, -er * 0.1, er * 0.85, 0.12 * Math.PI, 0.88 * Math.PI); g.stroke();
    } else {
      g.fillStyle = inkF; ell(g, 0, 0, er * 0.78, er); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(-er * 0.25, -er * 0.35, er * 0.36, 0, TAU); g.fill();
      g.beginPath(); g.arc(er * 0.28, er * 0.38, er * 0.15, 0, TAU); g.fill();
    }
    g.fillStyle = 'rgba(255,95,130,0.5)';
    const [bx, by] = [(P(R * 0.3, -R * 0.3)[0] - ex), (P(R * 0.3, -R * 0.3)[1] - ey)];
    ell(g, bx, by, R * 0.1, R * 0.06, f.rot); g.fill();
    g.restore();
  });
}

// 9 Lotus koi: pink lotus with a little koi face in its heart
function drawLotus(g, r, sway, blink) {
  const ink = '#5a1036';
  const petal = (a, len, w) => (g2) => withT(g2, 0, r * 0.06, a, () => {
    g2.moveTo(0, 0);
    g2.bezierCurveTo(w, -len * 0.25, w * 0.9, -len * 0.75, 0, -len);
    g2.bezierCurveTo(-w * 0.9, -len * 0.75, -w, -len * 0.25, 0, 0);
    g2.closePath();
  });
  const petalPaint = (a, len, c) => (g2) => {
    g2.save(); g2.translate(0, r * 0.06); g2.rotate(a);
    g2.fillStyle = lin(g2, 0, 0, 0, -len, [[0, c[0]], [0.55, c[1]], [1, c[2]]]);
    g2.fillRect(-len, -len * 1.1, len * 2, len * 1.2);
    g2.strokeStyle = 'rgba(255,255,255,0.45)'; g2.lineWidth = Math.max(0.8, r * 0.025); g2.lineCap = 'round';
    g2.beginPath(); g2.moveTo(0, -len * 0.18); g2.lineTo(0, -len * 0.82); g2.stroke();
    g2.restore();
  };
  const parts = [];
  for (const s of [-1, 1]) { // leaves
    parts.push({
      trace: (g2) => withT(g2, s * r * 0.08, r * 0.4, s > 0 ? 0.18 : Math.PI - 0.18, () => finPath(g2, r * 0.62, r * 0.32)),
      paint: (g2) => fillAll(g2, r, rad(g2, 0, r * 0.4, r * 0.1, r * 0.75, [[0, '#2f8a3a'], [0.6, '#5cc25a'], [1, '#a9ea86']])),
    });
  }
  const outer = ['#e2407e', '#ff8fc0', '#fff2f8'];
  const inner = ['#ff5f9e', '#ffb3d6', '#ffffff'];
  for (let i = 0; i < 8; i++) {
    const a = (i + 0.5) * (TAU / 8) + sway * 0.02;
    parts.push({ trace: petal(a, r * 0.86, r * 0.3), paint: petalPaint(a, r * 0.86, outer) });
  }
  for (let i = 0; i < 6; i++) {
    const a = i * (TAU / 6) - sway * 0.06;
    parts.push({ trace: petal(a, r * 0.62, r * 0.26), paint: petalPaint(a, r * 0.62, inner) });
  }
  const hr = r * 0.34, hx = 0, hy = r * 0.08;
  parts.push({
    trace: (g2) => { g2.arc(hx, hy, hr, 0, TAU); },
    paint: (g2) => {
      fillAll(g2, r, rad(g2, hx - hr * 0.3, hy - hr * 0.4, hr * 0.1, hr * 1.4, [[0, '#ffe6c8'], [0.4, '#ff9a52'], [1, '#e0602a']]));
      g2.fillStyle = 'rgba(255,252,246,0.95)'; ell(g2, hx, hy + hr * 0.45, hr * 0.62, hr * 0.42); g2.fill();
      g2.fillStyle = 'rgba(232,48,58,0.9)'; ell(g2, hx + hr * 0.45, hy - hr * 0.55, hr * 0.3, hr * 0.22, 0.4); g2.fill();
      gloss(g2, hx - hr * 0.38, hy - hr * 0.45, hr * 0.38, hr * 0.18, -0.55);
      glint(g2, hx - hr * 0.5, hy - hr * 0.5, hr * 0.09);
    },
  });
  sticker(g, r, parts, ink);
  face(g, hx, hy + hr * 0.05, hr, blink, { ink: '#3a160a', mouth: 'o' });
  spark(g, -r * 0.68, -r * 0.5, r * 0.07); spark(g, r * 0.72, -r * 0.18, r * 0.06);
}

// 10 Dragon koi: front-facing crimson dragon head, gold flame mane and antlers, whiskers
function drawDragon(g, r, sway, blink) {
  const ink = '#3e050e';
  const hx = 0, hy = r * 0.1, hr = r * 0.52;
  const parts = [];
  // flame mane: tufts fanning out around the head (none at the chin)
  const N = 9;
  for (let i = 0; i < N; i++) {
    const a = -Math.PI / 2 + (i - (N - 1) / 2) * 0.5; // spread over the top and sides
    const len = r * (0.5 - Math.abs(i - (N - 1) / 2) * 0.012), w = r * 0.2;
    const bx = hx + Math.cos(a) * hr * 0.7, by = hy + Math.sin(a) * hr * 0.66;
    const rot = a + Math.PI / 2 + sway * 0.04;
    parts.push({
      trace: (g2) => withT(g2, bx, by, rot, () => {
        g2.moveTo(-w, 0);
        g2.bezierCurveTo(-w * 1.1, -len * 0.5, -w * 0.1, -len * 0.7, w * 0.35, -len);
        g2.bezierCurveTo(w * 0.2, -len * 0.7, w * 1.2, -len * 0.45, w, 0);
        g2.closePath();
      }),
      paint: (g2) => {
        g2.save(); g2.translate(bx, by); g2.rotate(rot);
        g2.fillStyle = lin(g2, 0, 0, 0, -len, [[0, '#e07a10'], [0.45, '#ffc23a'], [1, '#fff3b0']]);
        g2.fillRect(-w * 2, -len * 1.2, w * 4, len * 1.4);
        g2.restore();
      },
    });
  }
  // beard tufts at the chin sides
  for (const s of [-1, 1]) {
    const bx = hx + s * hr * 0.62, by = hy + hr * 0.62, rot = s * 2.35;
    parts.push({
      trace: (g2) => withT(g2, bx, by, rot, () => {
        g2.moveTo(-r * 0.12, 0);
        g2.bezierCurveTo(-r * 0.12, -r * 0.18, 0, -r * 0.24, r * 0.06, -r * 0.34);
        g2.bezierCurveTo(r * 0.08, -r * 0.2, r * 0.14, -r * 0.1, r * 0.12, 0);
        g2.closePath();
      }),
      paint: (g2) => fillAll(g2, r, rad(g2, bx, by, 0, r * 0.34, [[0, '#e07a10'], [0.5, '#ffc23a'], [1, '#fff3b0']])),
    });
  }
  // antlers (ivory, in front of the mane)
  for (const s of [-1, 1]) {
    const ax = hx + s * hr * 0.42, ay = hy - hr * 0.72, rot = s * 0.32 + sway * 0.03 * s;
    parts.push({
      trace: (g2) => withT(g2, ax, ay, rot, () => {
        g2.moveTo(-r * 0.06, r * 0.04);
        g2.quadraticCurveTo(-r * 0.08, -r * 0.2, -r * 0.03, -r * 0.4);
        g2.quadraticCurveTo(r * 0.03, -r * 0.43, r * 0.04, -r * 0.36);
        g2.lineTo(r * 0.035, -r * 0.24);
        g2.quadraticCurveTo(s * r * 0.12, -r * 0.26, s * r * 0.17, -r * 0.33);
        g2.quadraticCurveTo(s * r * 0.2, -r * 0.24, s * r * 0.12, -r * 0.17);
        g2.quadraticCurveTo(r * 0.06, -r * 0.13, r * 0.06, r * 0.04);
        g2.closePath();
      }),
      paint: (g2) => fillAll(g2, r, lin(g2, ax, ay - r * 0.42, ax, ay + r * 0.05, [[0, '#ffffff'], [0.5, '#ffe9c4'], [1, '#d99a52']])),
    });
  }
  // head
  parts.push({
    trace: (g2) => { g2.ellipse(hx, hy, hr, hr * 0.94, 0, 0, TAU); },
    paint: (g2) => {
      fillAll(g2, r, rad(g2, hx - hr * 0.35, hy - hr * 0.45, hr * 0.1, hr * 1.5, [[0, '#ff8f8f'], [0.4, '#e8303e'], [1, '#8a0d1c']]));
      g2.fillStyle = 'rgba(255,214,90,0.95)'; // gold brows
      for (const s of [-1, 1]) { ell(g2, hx + s * hr * 0.4, hy - hr * 0.5, hr * 0.2, hr * 0.085, s * 0.35); g2.fill(); }
      g2.strokeStyle = 'rgba(255,200,120,0.35)'; g2.lineWidth = Math.max(1, r * 0.025); // forehead scales
      for (let k = -1; k <= 1; k++) { g2.beginPath(); g2.arc(hx + k * hr * 0.2, hy - hr * 0.72, hr * 0.1, 0.1 * Math.PI, 0.9 * Math.PI); g2.stroke(); }
      gloss(g2, hx - hr * 0.42, hy - hr * 0.42, hr * 0.36, hr * 0.16, -0.6);
      glint(g2, hx - hr * 0.55, hy - hr * 0.45, hr * 0.08);
    },
  });
  // muzzle
  parts.push({
    trace: (g2) => { g2.ellipse(hx, hy + hr * 0.5, hr * 0.5, hr * 0.32, 0, 0, TAU); },
    paint: (g2) => {
      fillAll(g2, r, rad(g2, hx - hr * 0.15, hy + hr * 0.35, hr * 0.05, hr * 0.7, [[0, '#fff2e0'], [0.6, '#ffc7a6'], [1, '#e88a7a']]));
      g2.fillStyle = '#7a1a22';
      for (const s of [-1, 1]) { ell(g2, hx + s * hr * 0.16, hy + hr * 0.36, hr * 0.045, hr * 0.03, s * 0.6); g2.fill(); }
      g2.strokeStyle = '#7a1a22'; g2.lineWidth = Math.max(1, r * 0.03); g2.lineCap = 'round';
      g2.beginPath(); g2.arc(hx - hr * 0.1, hy + hr * 0.5, hr * 0.1, 0.1 * Math.PI, 0.9 * Math.PI); g2.stroke();
      g2.beginPath(); g2.arc(hx + hr * 0.1, hy + hr * 0.5, hr * 0.1, 0.1 * Math.PI, 0.9 * Math.PI); g2.stroke();
      g2.fillStyle = '#ffffff';
      g2.beginPath(); g2.moveTo(hx + hr * 0.12, hy + hr * 0.585); g2.lineTo(hx + hr * 0.16, hy + hr * 0.7); g2.lineTo(hx + hr * 0.2, hy + hr * 0.57); g2.fill();
    },
  });
  sticker(g, r, parts, ink);
  // whiskers: long, flowing, gold
  for (const s of [-1, 1]) {
    const path = () => {
      g.beginPath();
      g.moveTo(hx + s * hr * 0.44, hy + hr * 0.42);
      g.bezierCurveTo(hx + s * r * 0.6, hy + r * 0.42, hx + s * r * 0.74, hy + r * 0.1, hx + s * r * (0.8 + sway * 0.03), hy - r * (0.12 + sway * 0.04));
    };
    g.save(); g.lineCap = 'round';
    path(); g.strokeStyle = ink; g.lineWidth = Math.max(2, r * 0.085); g.stroke();
    path(); g.strokeStyle = '#ffd256'; g.lineWidth = Math.max(1, r * 0.038); g.stroke();
    g.restore();
  }
  face(g, hx, hy - hr * 0.08, hr, blink, { ink: '#2a0308', mouth: 'none', spread: 1.05 });
  spark(g, -r * 0.8, -r * 0.62, r * 0.07); spark(g, r * 0.8, -r * 0.55, r * 0.05);
}

// ---------------------------------------------------------------- water bubble
// By user request the Koi Pond is the one pack whose pieces live in water bubbles: a mostly see-through glass
// sphere (the scene shows through), a thin bright aqua rim with a faint tier tint, refraction and slight
// darkening at the lower edge, a big curved specular top-left, a small glint bottom-right and a couple of tiny
// inner bubbles. The bubble (radius BUBBLE * r, plus its rim) stays inside r, so hit areas are unchanged.
export const BUBBLE = 0.93;
export const FISH_SCALE = 0.86;
const hexA = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

/** Behind the fish: the water body (faint, mostly transparent) with a soft edge darkening. */
function bubbleBack(g, r, tier) {
  const R = r * BUBBLE, col = koiColor(tier);
  g.save();
  g.beginPath(); g.arc(0, 0, R, 0, TAU); g.clip();
  // water: clear in the middle, denser toward the edge (fresnel), cooler and darker at the bottom
  fillAll(g, r, rad(g, 0, -R * 0.12, R * 0.1, R * 1.05, [
    [0, 'rgba(150,235,255,0.07)'], [0.6, 'rgba(110,210,240,0.13)'], [0.85, 'rgba(70,170,215,0.2)'], [1, 'rgba(40,120,180,0.38)'],
  ]));
  fillAll(g, r, rad(g, 0, -R * 0.12, R * 0.55, R * 1.05, [[0, hexA(col, 0)], [0.75, hexA(col, 0)], [1, hexA(col, 0.16)]]));
  fillAll(g, r, lin(g, 0, R * 0.05, 0, R, [[0, 'rgba(8,40,70,0)'], [1, 'rgba(8,40,70,0.3)']]));
  g.restore();
}

/** One tiny air bead (inner bubble): faint body, bright outline, specular dot. */
function bead(g, r, x, y, s, a) {
  const ga = g.globalAlpha;
  g.globalAlpha = ga * a;
  g.fillStyle = 'rgba(200,250,255,0.18)'; g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(230,255,255,0.75)'; g.lineWidth = Math.max(0.8, r * 0.014); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.95)'; g.beginPath(); g.arc(x - s * 0.35, y - s * 0.35, s * 0.28, 0, TAU); g.fill();
  g.globalAlpha = ga;
}

/** In front of the fish: refraction tint, rim, speculars, inner bubbles. f = fin frame (0..2) shifts the shimmer. */
function bubbleFront(g, r, tier, f, beads = true) {
  const R = r * BUBBLE, col = koiColor(tier);
  g.save();
  g.beginPath(); g.arc(0, 0, R, 0, TAU); g.clip();
  // lower-edge refraction: a teal lens band that also tints the fish where it meets the edge
  fillAll(g, r, rad(g, 0, -R * 0.35, R * 0.9, R * 1.4, [[0, 'rgba(30,150,190,0)'], [0.72, 'rgba(30,150,190,0)'], [1, 'rgba(20,110,160,0.32)']]));
  // inner fresnel ring with a faint tier tint
  fillAll(g, r, rad(g, 0, 0, R * 0.8, R, [[0, 'rgba(200,250,255,0)'], [0.75, hexA(col, 0.1)], [1, 'rgba(210,250,255,0.42)']]));
  // caustic: light focused through the sphere pools softly inside the bottom edge (opposite the specular),
  // drifting a touch with the fin frame
  g.save();
  g.translate((f - 1) * R * 0.04, R * 0.7); g.scale(1, 0.34);
  g.fillStyle = rad(g, 0, 0, 0, R * 0.62, [[0, 'rgba(190,255,250,0.34)'], [0.5, 'rgba(160,240,245,0.14)'], [1, 'rgba(160,240,245,0)']]);
  g.beginPath(); g.arc(0, 0, R * 0.62, 0, TAU); g.fill();
  g.restore();
  // big curved specular, top-left: a tapered crescent hugging the rim
  g.save();
  g.rotate(-2.35);
  g.beginPath();
  g.arc(0, 0, R * 0.86, -0.62, 0.62, false);
  g.quadraticCurveTo(R * 0.6, 0, Math.cos(-0.62) * R * 0.86, Math.sin(-0.62) * R * 0.86);
  g.closePath();
  g.fillStyle = lin(g, R * 0.86, -R * 0.55, R * 0.86, R * 0.55, [[0, 'rgba(255,255,255,0)'], [0.4, 'rgba(255,255,255,0.85)'], [0.6, 'rgba(255,255,255,0.85)'], [1, 'rgba(255,255,255,0)']]);
  g.fill();
  g.restore();
  // soft sheen pool + crisp dot inside the crescent
  gloss(g, -R * 0.42, -R * 0.5, R * 0.26, R * 0.12, -0.75, 0.32);
  g.fillStyle = 'rgba(255,255,255,0.95)';
  g.beginPath(); g.arc(-R * 0.38, -R * 0.66, R * 0.05, 0, TAU); g.fill();
  // small glint bottom-right
  g.save(); g.rotate(0.78);
  g.beginPath(); g.arc(0, 0, R * 0.84, -0.26, 0.26, false); g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = Math.max(1.2, r * 0.04); g.stroke();
  g.restore();
  g.fillStyle = 'rgba(255,255,255,0.85)'; ell(g, R * 0.5, R * 0.6, R * 0.035, R * 0.025, -0.7); g.fill();
  // two tiny inner bubbles drifting up on the right
  const dy = (f - 1) * R * 0.03;
  if (beads) for (const [x, y, s] of [[R * 0.6, -R * 0.12 - dy, R * 0.07], [R * 0.44, -R * 0.4 - dy * 1.5, R * 0.045]]) bead(g, r, x, y, s, 1);
  g.restore();
  // rim: a hairline dark outer edge (separates the bubble from bright scenery), then the bright aqua rim
  g.save();
  g.beginPath(); g.arc(0, 0, R, 0, TAU);
  g.strokeStyle = 'rgba(4,24,44,0.35)'; g.lineWidth = Math.max(1, r * 0.05); g.stroke();
  g.beginPath(); g.arc(0, 0, R - r * 0.008, 0, TAU);
  g.strokeStyle = lin(g, -R, -R, R, R, [[0, 'rgba(255,255,255,0.95)'], [0.35, 'rgba(190,245,255,0.7)'], [0.62, hexA(col, 0.6)], [1, 'rgba(120,225,245,0.85)']]);
  g.lineWidth = Math.max(1, r * 0.028); g.stroke();
  if (tier >= 9) { // gold rim glint on the top tiers
    g.lineCap = 'round';
    g.beginPath(); g.arc(0, 0, R - r * 0.008, -1.2, -0.35, false);
    g.strokeStyle = 'rgba(255,214,90,0.95)'; g.lineWidth = Math.max(1.5, r * 0.05); g.stroke();
    g.beginPath(); g.arc(0, 0, R - r * 0.008, -1.0, -0.6, false);
    g.strokeStyle = 'rgba(255,250,210,0.95)'; g.lineWidth = Math.max(1, r * 0.022); g.stroke();
    if (tier === 10) { // the crown tier: a full fine gold ring plus a second glint low on the left
      g.beginPath(); g.arc(0, 0, R - r * 0.008, 0, TAU);
      g.strokeStyle = 'rgba(255,206,80,0.55)'; g.lineWidth = Math.max(1, r * 0.02); g.stroke();
      g.beginPath(); g.arc(0, 0, R - r * 0.008, 2.1, 2.7, false);
      g.strokeStyle = 'rgba(255,214,90,0.9)'; g.lineWidth = Math.max(1.5, r * 0.04); g.stroke();
    }
    spark(g, Math.cos(-0.78) * R, Math.sin(-0.78) * R, r * 0.1, 'rgba(255,248,214,1)');
  }
  g.restore();
}

/**
 * Paint one Koi Pond piece centred at the origin, radius r: the creature inside its water bubble.
 * frame = fin * 2 + blink (fin 0..2 → sway -1..1).
 */
export function drawKoi(g, r, tier, frame = 0) {
  tier = Math.max(1, Math.min(10, tier | 0));
  if (frame >= KOI_LAYER.BACK) { drawKoiLayer(g, r, tier, frame); return; }
  const blink = frame & 1;
  const fin = (frame >> 1) % 3;
  bubbleBack(g, r, tier);
  g.save();
  g.beginPath(); g.arc(0, 0, r * BUBBLE, 0, TAU); g.clip(); // tail tips that reach the glass tuck under the rim
  creature(g, r, tier, fin - 1, blink);
  g.restore();
  bubbleFront(g, r, tier, fin);
}

function creature(g, r, tier, sway, blink) {
  g.scale(FISH_SCALE, FISH_SCALE);
  if (tier === 2) drawLily(g, r, sway, blink);
  else if (tier === 8) drawPair(g, r, sway, blink);
  else if (tier === 9) drawLotus(g, r, sway, blink);
  else if (tier === 10) drawDragon(g, r, sway, blink);
  else drawChibi(g, r, tier, sway, blink);
}

// ---------------------------------------------------------------- animated layers
// Frames 0..5 are the full composite (Calm / reduced motion, menus, HUD, ghost). On the board the piece is
// drawn from separately cached layers instead, so the glass can wobble, the film swirl and the specular slide
// without repainting anything: BACK (water body), FISH + frame (the creature, clipped to the bubble), IRIS
// (thin-film colour band, rotated), FRONT (refraction, specular, rim; no beads), then 2-3 live air beads.
export const KOI_LAYER = { BACK: 10, IRIS: 11, FRONT: 12, FISH: 20 };

function drawKoiLayer(g, r, tier, code) {
  const R = r * BUBBLE;
  if (code === KOI_LAYER.BACK) { bubbleBack(g, r, tier); return; }
  if (code === KOI_LAYER.FRONT) { bubbleFront(g, r, tier, 1, false); return; }
  if (code === KOI_LAYER.IRIS) {
    // soap-film iridescence: a faint conic hue band hugging the inside of the rim, strongest on a few lobes
    if (typeof g.createConicGradient !== 'function') return;
    g.save();
    g.beginPath(); g.arc(0, 0, R, 0, TAU); g.clip();
    const cg = g.createConicGradient(0, 0, 0);
    const hues = ['rgba(255,140,220,0.30)', 'rgba(255,220,120,0.06)', 'rgba(120,255,220,0.26)', 'rgba(140,170,255,0.05)',
      'rgba(200,140,255,0.28)', 'rgba(255,240,160,0.05)', 'rgba(110,230,255,0.24)', 'rgba(255,170,200,0.04)', 'rgba(255,140,220,0.30)'];
    hues.forEach((c, i) => cg.addColorStop(i / (hues.length - 1), c));
    g.fillStyle = cg; g.fillRect(-R, -R, R * 2, R * 2);
    g.globalCompositeOperation = 'destination-in';
    g.fillStyle = rad(g, 0, 0, 0, R, [[0, 'rgba(0,0,0,0)'], [0.62, 'rgba(0,0,0,0)'], [0.86, 'rgba(0,0,0,0.6)'], [0.95, 'rgba(0,0,0,1)'], [1, 'rgba(0,0,0,0.35)']]);
    g.fillRect(-R, -R, R * 2, R * 2);
    g.restore();
    return;
  }
  const f = code - KOI_LAYER.FISH; // FISH + frame (0..5)
  g.save();
  g.beginPath(); g.arc(0, 0, R, 0, TAU); g.clip();
  creature(g, r, tier, ((f >> 1) % 3) - 1, f & 1);
  g.restore();
}

/** Number badge (top-left corner) for when Numbers is on. */
export function drawKoiNumber(g, r, tier) {
  g.save();
  g.translate(-r * 0.64, -r * 0.64);
  g.beginPath(); g.arc(0, 0, r * 0.4, 0, TAU);
  g.fillStyle = 'rgba(8,20,36,0.9)'; g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.78)'; g.lineWidth = Math.max(1, r * 0.05); g.stroke();
  g.font = `800 ${Math.round(r * (tier >= 10 ? 0.42 : 0.52))}px Fredoka, "Baloo 2", system-ui, sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#ffffff';
  g.fillText(String(tier), 0, r * 0.03);
  g.restore();
}

const FIN_SEQ = [1, 2, 1, 0];
/**
 * Idle animation at clock t (seconds, per-orb offset applied): a pre-drawn frame (blink x fin sway) plus a
 * gentle squish and tilt. Callers skip this entirely under Calm / reduced motion.
 */
export function koiIdle(t, tier) {
  const period = 3.4 + (tier % 4) * 0.5;
  const p = ((t % period) + period) % period;
  const blink = p < 0.13 ? 1 : 0;
  const step = Math.floor(t * 3 + tier * 0.7);
  const fin = FIN_SEQ[((step % 4) + 4) % 4];
  const w = Math.sin(t * (1.9 + tier * 0.05));
  return { frame: fin * 2 + blink, sx: 1 + 0.025 * w, sy: 1 - 0.025 * w, rot: 0.035 * Math.sin(t * (1.3 + tier * 0.04) + tier) };
}

// Rising air beads: [lane x, size, period s, phase], in bubble radii. Lanes sit off-centre so beads skim past
// the fish rather than across its face.
const BEADS = [[0.5, 0.07, 3.3, 0], [0.64, 0.045, 2.7, 0.45], [-0.46, 0.04, 3.9, 0.7]];
const frac = (x) => x - Math.floor(x);

/**
 * Idle pose at clock t (seconds, per-piece offset already applied). Pure and deterministic. `still` (Calm /
 * reduced motion) returns the neutral pose: no wobble, no swirl, frame 0, beads parked.
 */
export function koiPose(t, tier, still = false) {
  if (still) return { frame: 0, a: 0, a2: 0, th: 0, br: 1, swirl: 0, spec: 0, bob: 0, tilt: 0, t: 0, still: true };
  const ph = tier * 1.37;
  const env = 0.7 + 0.3 * Math.sin(t * 0.83 + ph); // the wobble swells and eases so it never reads as a loop
  return {
    frame: koiIdle(t, tier).frame,
    a: 0.026 * Math.sin(t * 3.1 + ph) * env, // glass: stretch along th, squeeze across
    a2: 0.012 * Math.sin(t * 3.1 + ph - 0.9) * env, // fish: smaller, lagging the glass like water drag
    th: 0.5 + 0.9 * Math.sin(t * 0.31 + ph), // the wobble axis drifts slowly
    br: 1 + 0.012 * Math.sin(t * 1.2 + ph * 0.7), // breathing
    swirl: t * 0.42 + ph, // the iridescent film turns
    spec: 0.1 * Math.sin(t * 0.9 + ph), // the specular slides along the rim
    bob: 0.014 * Math.sin(t * 1.6 + ph),
    tilt: 0.045 * Math.sin(t * (1.3 + tier * 0.04) + tier),
    t,
    still: false,
  };
}

/** Largest glass radius a pose can reach, in r (bubble x wobble x breathing, before the rim stroke). */
export const KOI_MAX_GLASS = BUBBLE * 1.012 * 1.026;

/** Live air beads for a pose: [x, y, size, alpha] in px for bubble radius R. Parked when still. */
export function koiBeads(p, tier, R) {
  const out = [];
  for (let i = 0; i < BEADS.length; i++) {
    const [lane, size, period, phase] = BEADS[i];
    const u = p.still ? 0.35 + i * 0.2 : frac(p.t / period + phase + tier * 0.13);
    const y = R * (0.6 - 1.25 * u);
    const x = R * (lane + 0.04 * Math.sin(u * TAU * 1.5 + i));
    const edge = Math.min(1, Math.max(0, (R * 0.8 - Math.hypot(x, y)) / (R * 0.12)));
    const a = Math.min(1, u * 6, (1 - u) * 5) * edge;
    if (a > 0.02) out.push([x, y, R * size * (0.8 + 0.4 * u), a]);
  }
  return out;
}

/**
 * Draw an animated piece at (x, y) from cached layers. layer(code) returns a sprite {canvas, half} for
 * KOI_LAYER codes; k scales sprite px to the requested r. opt: still (Calm: neutral pose), bare (the glass is
 * gone, fish only: a pop), fishS (fish scale, the merged fish swimming in).
 * Cost: 4 drawImage calls plus up to 3 beads (6 arcs), no gradients or repaints per frame.
 */
export function koiAnimate(ctx, x, y, r, k, tier, t, layer, opt = {}) {
  const p = koiPose(t, tier, !!opt.still);
  const R = r * BUBBLE;
  const img = (s) => { const h = s.half * k; ctx.drawImage(s.canvas, -h, -h, h * 2, h * 2); };
  const glass = () => { ctx.rotate(p.th); ctx.scale(p.br * (1 + p.a), p.br * (1 - p.a)); ctx.rotate(-p.th); };
  ctx.save();
  ctx.translate(x, y);
  if (!opt.bare) { ctx.save(); glass(); img(layer(KOI_LAYER.BACK)); ctx.restore(); }
  const fs = Math.min(1.04, opt.fishS ?? 1);
  if (fs > 0.01) {
    ctx.save();
    ctx.translate(0, p.bob * r);
    ctx.rotate(p.tilt + p.th);
    ctx.scale(fs * (1 + p.a2), fs * (1 - p.a2));
    ctx.rotate(-p.th);
    img(layer(KOI_LAYER.FISH + p.frame));
    ctx.restore();
  }
  if (!opt.bare) {
    ctx.save(); glass();
    ctx.save(); ctx.rotate(p.swirl); img(layer(KOI_LAYER.IRIS)); ctx.restore();
    for (const [bx, by, bs, ba] of koiBeads(p, tier, R)) bead(ctx, r, bx, by, bs, ba);
    ctx.rotate(p.spec); img(layer(KOI_LAYER.FRONT));
    ctx.restore();
  }
  ctx.restore();
}
