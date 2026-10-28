// Seasonal café decorations (src/meta/seasonal.js DECOR_IDS and KEEPSAKE_DECOR_IDS), drawn on the café scene (src/ui/cafeView.js).
// Each decoration is painted once into a small cached sprite per scale and then only blitted, so the café's
// frame loop does no extra path work: one drawImage per visible decoration. Same hand-drawn style as cafeArt.js
// (warm fills, soft brown outline). Positions are world units on The Terrace (1 area = 1000 units, cam x = 0).
const OUT = '#6b4a3a';
const TAU = Math.PI * 2;

let X = null; // the sprite being painted
const out = (w = 4) => { X.lineWidth = w; X.strokeStyle = OUT; X.lineJoin = 'round'; X.lineCap = 'round'; X.stroke(); };
const el = (x, y, rx, ry, rot = 0) => { X.beginPath(); X.ellipse(x, y, rx, ry, rot, 0, TAU); };
const rr = (x, y, w, h, r) => { X.beginPath(); if (X.roundRect) X.roundRect(x, y, w, h, r); else X.rect(x, y, w, h); };
const poly = (...p) => { X.beginPath(); X.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) X.lineTo(p[i], p[i + 1]); X.closePath(); };

function pumpkin(x, y, r, col = '#e8873a', dark = '#c96a2a') {
  // ribbed pumpkin sitting on y (its bottom)
  const h = r * 0.82;
  for (const [dx, s, c] of [[-0.5, 0.62, dark], [0.5, 0.62, dark], [0, 0.7, col]]) { el(x + dx * r, y - h, r * s, h, 0); X.fillStyle = c; X.fill(); out(3); }
  el(x, y - h, r * 0.24, h * 0.92); X.fillStyle = 'rgba(255,220,160,.35)'; X.fill();
  rr(x - r * 0.08, y - h * 2 - r * 0.22, r * 0.16, r * 0.3, 3); X.fillStyle = '#6f8a3c'; X.fill(); out(3);
}

function mapleLeaf(x, y, s, rot, col) {
  X.save(); X.translate(x, y); X.rotate(rot); X.scale(s, s);
  X.beginPath();
  X.moveTo(0, 10); X.lineTo(-2, 4); X.lineTo(-9, 6); X.lineTo(-7, 1); X.lineTo(-11, -3); X.lineTo(-5, -4); X.lineTo(-6, -10);
  X.lineTo(-2, -7); X.lineTo(0, -13); X.lineTo(2, -7); X.lineTo(6, -10); X.lineTo(5, -4); X.lineTo(11, -3); X.lineTo(7, 1);
  X.lineTo(9, 6); X.lineTo(2, 4); X.closePath();
  X.fillStyle = col; X.fill(); X.lineWidth = 1.4; X.strokeStyle = OUT; X.lineJoin = 'round'; X.stroke();
  X.restore();
}

function apple(x, y, r, col = '#d8453a') {
  el(x, y, r, r * 0.92); X.fillStyle = col; X.fill(); out(2.5);
  el(x - r * 0.35, y - r * 0.3, r * 0.28, r * 0.2, -0.5); X.fillStyle = 'rgba(255,255,255,.45)'; X.fill();
  X.beginPath(); X.moveTo(x, y - r * 0.8); X.lineTo(x + r * 0.15, y - r * 1.25); X.lineWidth = 2.5; X.strokeStyle = OUT; X.stroke();
}

function crate(x, y, w, h) {
  rr(x, y, w, h, 4); X.fillStyle = '#c9925a'; X.fill(); out(3.5);
  X.strokeStyle = '#a5703f'; X.lineWidth = 3;
  for (let i = 1; i < 3; i++) { X.beginPath(); X.moveTo(x + 6, y + (h * i) / 3); X.lineTo(x + w - 6, y + (h * i) / 3); X.stroke(); }
  rr(x + w / 2 - 16, y + h / 2 - 7, 32, 14, 3); X.fillStyle = '#f6e6c8'; X.fill(); out(2);
}

// Each decoration: world anchor (x, y), local box [x0, y0, x1, y1] around it, paint() in local units.
const DECOR = {
  // three pumpkins on the pavement, right of the café steps
  h_pumpkin: {
    x: 440, y: 222, box: [-70, -82, 62, 6],
    paint() {
      pumpkin(26, 0, 34);
      pumpkin(-32, 0, 26, '#f0a24a', '#d0802e');
      pumpkin(-6, -50, 18, '#f3c35a', '#d9a23a');
    },
  },
  // a garland of autumn leaves under the roof trim, both sides of the café sign
  h_bunting: {
    x: 0, y: -236, box: [-414, -8, 516, 70],
    paint() {
      const cols = ['#d8573a', '#e8913a', '#c9a23a', '#b8483a', '#e07a3a'];
      for (const [a, b] of [[-404, -156], [160, 506]]) {
        const sag = 34;
        X.beginPath(); X.moveTo(a, 0); X.quadraticCurveTo((a + b) / 2, sag * 2, b, 0); X.lineWidth = 3; X.strokeStyle = '#8a6a4a'; X.stroke();
        const n = Math.round((b - a) / 34);
        for (let i = 1; i < n; i++) {
          const t = i / n, px = a + (b - a) * t, py = 2 * t * (1 - t) * sag * 2;
          mapleLeaf(px, py + 10, 1.25, (i % 2 ? 0.25 : -0.25), cols[i % cols.length]);
        }
      }
    },
  },
  // an apple-crate stall on the pavement, a little gap right of the latte A-board (x ≤ 288)
  h_crates: {
    x: 384, y: 372, box: [-96, -132, 96, 6],
    paint() {
      crate(-90, -56, 96, 56); crate(4, -56, 86, 56); crate(-46, -112, 92, 56);
      for (let i = 0; i < 4; i++) apple(-74 + i * 22, -60, 11, i % 2 ? '#e0b43a' : '#d8453a');
      for (let i = 0; i < 4; i++) apple(18 + i * 20, -60, 10, '#d8453a');
      for (let i = 0; i < 4; i++) apple(-30 + i * 21, -116, 10.5, i % 3 ? '#d8453a' : '#9bbf4a');
    },
  },
  // a tartan blanket over the back of the right-hand terrace chair
  h_blanket: {
    x: 118, y: 262, box: [-50, -26, 50, 66],
    when: (info) => !!(info && info.done && info.done.terrace_chairs != null),
    paint() {
      X.beginPath();
      X.moveTo(-40, -14); X.quadraticCurveTo(0, -24, 40, -14);
      X.lineTo(44, 40); X.quadraticCurveTo(30, 56, 18, 44); X.quadraticCurveTo(0, 60, -16, 46); X.quadraticCurveTo(-32, 58, -44, 40);
      X.closePath();
      X.fillStyle = '#b8483a'; X.fill();
      X.save(); X.clip();
      X.strokeStyle = 'rgba(246,230,200,.75)'; X.lineWidth = 4;
      for (const vx of [-24, 2, 28]) { X.beginPath(); X.moveTo(vx, -30); X.lineTo(vx, 64); X.stroke(); }
      for (const vy of [4, 28]) { X.beginPath(); X.moveTo(-50, vy); X.lineTo(50, vy); X.stroke(); }
      X.strokeStyle = 'rgba(90,40,30,.45)'; X.lineWidth = 2;
      for (const vx of [-12, 15]) { X.beginPath(); X.moveTo(vx, -30); X.lineTo(vx, 64); X.stroke(); }
      X.restore();
      X.beginPath();
      X.moveTo(-40, -14); X.quadraticCurveTo(0, -24, 40, -14);
      X.lineTo(44, 40); X.quadraticCurveTo(30, 56, 18, 44); X.quadraticCurveTo(0, 60, -16, 46); X.quadraticCurveTo(-32, 58, -44, 40);
      X.closePath(); out(3);
    },
  },
  // an A-frame chalkboard: cinnamon latte
  h_latte: {
    x: 236, y: 392, box: [-52, -132, 52, 6],
    paint() {
      poly(-44, 0, -30, -124, 30, -124, 44, 0); X.fillStyle = '#a5703f'; X.fill(); out(3.5);
      rr(-32, -114, 64, 92, 4); X.fillStyle = '#3f4a44'; X.fill(); out(2.5);
      // a cup with steam and a cinnamon stick
      rr(-14, -62, 28, 24, 5); X.fillStyle = '#f6e6c8'; X.fill();
      X.beginPath(); X.arc(16, -52, 7, -1.2, 1.2); X.lineWidth = 3; X.strokeStyle = '#f6e6c8'; X.stroke();
      X.beginPath(); X.moveTo(-4, -70); X.quadraticCurveTo(-10, -78, -4, -86); X.moveTo(6, -70); X.quadraticCurveTo(0, -78, 6, -86); X.lineWidth = 2.5; X.strokeStyle = 'rgba(246,230,200,.8)'; X.stroke();
      X.save(); X.translate(10, -96); X.rotate(0.5); rr(-14, -3, 28, 6, 3); X.fillStyle = '#b06a3a'; X.fill(); X.restore();
      // chalk lines (a word would be unreadable this small): two soft underlines
      X.strokeStyle = 'rgba(246,230,200,.7)'; X.lineWidth = 2.5;
      X.beginPath(); X.moveTo(-22, -32); X.lineTo(22, -32); X.stroke();
      mapleLeaf(-20, -100, 0.75, -0.3, '#e8913a');
    },
  },

  // ---- Thank-you tip keepsake (src/meta/tips.js): a little glass tip jar on the counter, between the pastry case
  // and the till. Not seasonal: cafeView draws it on its own (only once the long counter is restored).
  tip_jar: {
    x: 1095, y: 20, box: [-28, -82, 28, 4],
    when: (info) => !!(info && info.done && info.done.counter_bar != null),
    paint() {
      // a few coins and a folded note inside, drawn first so the glass tints them
      for (const [cx, cy] of [[-9, -8], [6, -7], [-2, -15], [9, -17]]) { el(cx, cy, 7, 3.4); X.fillStyle = '#e8c25a'; X.fill(); out(1.6); }
      X.save(); X.translate(-4, -28); X.rotate(-0.35); rr(-10, -5, 20, 10, 2); X.fillStyle = '#9fcfa8'; X.fill(); out(1.6); X.restore();
      // the jar: rounded glass body, a neck and a cork-coloured lid
      rr(-22, -56, 44, 56, 12); X.fillStyle = 'rgba(214,236,240,.55)'; X.fill(); out(3);
      rr(-16, -64, 32, 10, 3); X.fillStyle = 'rgba(214,236,240,.7)'; X.fill(); out(2.5);
      rr(-18, -72, 36, 9, 3); X.fillStyle = '#c9925a'; X.fill(); out(2.5);
      // a glint on the glass
      X.beginPath(); X.moveTo(-14, -46); X.quadraticCurveTo(-16, -26, -12, -10); X.lineWidth = 3; X.strokeStyle = 'rgba(255,255,255,.75)'; X.stroke();
      // a cream tag on a string with a small heart
      X.beginPath(); X.moveTo(12, -66); X.quadraticCurveTo(22, -62, 22, -50); X.lineWidth = 1.6; X.strokeStyle = OUT; X.stroke();
      rr(14, -50, 16, 14, 3); X.fillStyle = '#f6e6c8'; X.fill(); out(1.8);
      X.beginPath(); X.moveTo(22, -39.5); X.bezierCurveTo(16, -44, 18, -48.5, 22, -45.5); X.bezierCurveTo(26, -48.5, 28, -44, 22, -39.5);
      X.fillStyle = '#d8573a'; X.fill();
    },
  },

  // ---- Frost & Lanterns (winter). Placed so they sit happily beside the autumn keepsakes.
  // a soft cap of snow along the top of the striped awning and the roof trim, with a few rounded drips
  w_snow: {
    x: 0, y: 0, box: [-490, -306, 530, -128],
    paint() {
      snowCap(-376, 376, -154, 9, 0x51);
      snowCap(-484, 524, -284, 17, 0x52);
    },
  },
  // an evergreen wreath with warm little lights and a red bow, on the café door panel under the hanging Open/Closed
  // sign (door at 260,150: the sign spans world y 0..28, the wreath and its bow tails 40..142, clear of the steps)
  w_wreath: {
    x: 260, y: 82, box: [-50, -50, 50, 70],
    paint() {
      const R = 30;
      X.beginPath(); X.arc(0, 0, R + 12, 0, TAU); X.arc(0, 0, R - 12, 0, TAU, true); X.fillStyle = '#3f6e45'; X.fill('evenodd');
      const r = rng(0x77);
      for (let i = 0; i < 34; i++) {
        const a = (i / 34) * TAU + r() * 0.1, rad = R + (r() - 0.5) * 16;
        el(Math.cos(a) * rad, Math.sin(a) * rad, 9, 4, a + 1.2 + (r() - 0.5));
        X.fillStyle = ['#4f8a52', '#3f7a48', '#62a05e'][i % 3]; X.fill();
      }
      X.beginPath(); X.arc(0, 0, R + 13, 0, TAU); X.lineWidth = 2.5; X.strokeStyle = OUT; X.stroke();
      X.beginPath(); X.arc(0, 0, R - 13, 0, TAU); X.stroke();
      for (let i = 0; i < 9; i++) { // warm lights: a soft glow and a bright bead
        const a = (i / 9) * TAU - 0.3, px = Math.cos(a) * R, py = Math.sin(a) * R;
        glow(px, py, 9, 'rgba(255,214,120,');
        el(px, py, 3.6, 3.6); X.fillStyle = '#ffe9a8'; X.fill();
      }
      // bow
      X.fillStyle = '#c8424a';
      poly(0, R + 4, -22, R - 6, -24, R + 16); X.fill(); out(2.5);
      poly(0, R + 4, 22, R - 6, 24, R + 16); X.fill(); out(2.5);
      poly(-3, R + 6, -12, R + 30, -5, R + 27); X.fillStyle = '#b5383f'; X.fill(); out(2);
      poly(3, R + 6, 12, R + 30, 5, R + 27); X.fill(); out(2);
      el(0, R + 4, 6, 5); X.fillStyle = '#d8545a'; X.fill(); out(2.5);
    },
  },
  // round paper lanterns on a string under the roof trim, either side of the café sign
  w_lanterns: {
    x: 0, y: 0, box: [-482, -282, 524, -200],
    paint() {
      const cols = [['#f6c45a', '#e0a23a'], ['#f39a6a', '#d9784a'], ['#fbe7b8', '#e8c88a'], ['#e8857a', '#c9655a']];
      for (const [a, b] of [[-476, -158], [158, 518]]) {
        const top = -266, sag = 18;
        X.beginPath(); X.moveTo(a, top); X.quadraticCurveTo((a + b) / 2, top + sag * 2, b, top); X.lineWidth = 2.5; X.strokeStyle = '#6b5a4a'; X.stroke();
        const n = Math.round((b - a) / 46);
        for (let i = 1; i < n; i++) {
          const t = i / n, px = a + (b - a) * t, py = top + 2 * t * (1 - t) * sag * 2;
          lantern(px, py + 15, 11, cols[i % cols.length]);
        }
      }
    },
  },
  // a little hot-cocoa cart on the promenade: striped canopy, a cocoa urn, mugs, and a teapot in a knitted cosy
  w_cocoa: {
    x: -150, y: 408, box: [-76, -168, 80, 6],
    paint() {
      // canopy posts
      for (const px of [-54, 54]) { rr(px - 3, -150, 6, 96, 2); X.fillStyle = '#8a6a4a'; X.fill(); out(2.5); }
      // canopy
      X.beginPath(); X.moveTo(-70, -142); X.lineTo(70, -142); X.lineTo(62, -162); X.lineTo(-62, -162); X.closePath(); X.fillStyle = '#f6e6c8'; X.fill(); out(3);
      X.save(); X.clip(); X.fillStyle = '#c8545a'; for (let sx = -60; sx < 70; sx += 28) X.fillRect(sx, -164, 14, 24); X.restore();
      X.beginPath(); X.moveTo(-70, -142); for (let i = 0; i < 7; i++) { const sx = -70 + i * 20; X.quadraticCurveTo(sx + 10, -128, sx + 20, -142); } X.closePath();
      X.fillStyle = '#c8545a'; X.fill(); out(2.5);
      // urn, mugs, teapot in a cosy (sitting on the cart top at y -60)
      rr(-48, -104, 30, 44, 6); X.fillStyle = '#b8b0a8'; X.fill(); out(2.5);
      rr(-44, -112, 22, 10, 4); X.fillStyle = '#9a928a'; X.fill(); out(2);
      rr(-36, -78, 6, 8, 2); X.fillStyle = '#6b4a3a'; X.fill();
      for (const mx of [-8, 10]) { rr(mx - 7, -76, 14, 16, 3); X.fillStyle = mx < 0 ? '#e8d6b8' : '#9fc3d8'; X.fill(); out(2); }
      X.beginPath(); X.moveTo(-8, -82); X.quadraticCurveTo(-13, -90, -8, -98); X.lineWidth = 2; X.strokeStyle = 'rgba(255,255,255,.8)'; X.stroke();
      // teapot: spout and the knitted cosy (a dome with ribs and a bobble)
      X.beginPath(); X.moveTo(26, -70); X.quadraticCurveTo(20, -82, 16, -86); X.lineWidth = 5; X.strokeStyle = '#6b4a3a'; X.stroke();
      X.beginPath(); X.moveTo(24, -60); X.bezierCurveTo(24, -98, 60, -98, 60, -60); X.closePath(); X.fillStyle = '#5f9a8c'; X.fill();
      X.save(); X.clip(); X.strokeStyle = 'rgba(246,230,200,.85)'; X.lineWidth = 3;
      for (const vy of [-66, -76]) { X.beginPath(); X.moveTo(20, vy); X.lineTo(64, vy); X.stroke(); }
      X.strokeStyle = 'rgba(40,70,60,.35)'; X.lineWidth = 1.6; for (let vx = 28; vx < 60; vx += 6) { X.beginPath(); X.moveTo(vx, -60); X.lineTo(vx + (vx - 42) * 0.15, -96); X.stroke(); }
      X.restore();
      X.beginPath(); X.moveTo(24, -60); X.bezierCurveTo(24, -98, 60, -98, 60, -60); X.closePath(); out(2.5);
      el(42, -91, 6, 6); X.fillStyle = '#fbf3e4'; X.fill(); out(2);
      // cart body, handle and wheels
      rr(-64, -60, 128, 40, 6); X.fillStyle = '#c9925a'; X.fill(); out(3);
      rr(-64, -50, 128, 9, 0); X.fillStyle = '#f6e6c8'; X.fill();
      rr(-64, -60, 128, 40, 6); out(3);
      X.beginPath(); X.moveTo(64, -46); X.lineTo(80, -64); X.lineWidth = 4; X.strokeStyle = OUT; X.stroke();
      for (const wx of [-38, 38]) { el(wx, -14, 15, 15); X.fillStyle = '#8a6a4a'; X.fill(); out(3); el(wx, -14, 4, 4); X.fillStyle = '#f6e6c8'; X.fill(); }
    },
  },
  // a little snowman by the sea wall, in a knitted scarf and bobble hat: in the gap between the cocoa cart (x ≤ -70)
  // and the chair blanket (x ≥ 68), so it never stands over the autumn latte A-board (x 184..288)
  w_snowman: {
    x: 0, y: 414, box: [-50, -150, 50, 8],
    paint() {
      el(0, 0, 44, 7); X.fillStyle = 'rgba(120,150,190,.35)'; X.fill();
      const ball = (y, r) => { el(0, y, r, r * 0.96); X.fillStyle = '#fbfdff'; X.fill(); out(3); el(-r * 0.3, y - r * 0.32, r * 0.3, r * 0.18, -0.5); X.fillStyle = '#ffffff'; X.fill(); };
      // stick arms behind the middle ball
      X.beginPath(); X.moveTo(-14, -70); X.lineTo(-46, -92); X.moveTo(-38, -86); X.lineTo(-44, -100); X.moveTo(14, -70); X.lineTo(46, -88); X.moveTo(38, -83); X.lineTo(48, -96);
      X.lineWidth = 3.5; X.strokeStyle = '#7a5a3a'; X.stroke();
      ball(-30, 32); ball(-80, 23); ball(-118, 17);
      for (const by of [-86, -72]) { el(0, by, 3, 3); X.fillStyle = '#6b4a3a'; X.fill(); }
      // face
      for (const ex of [-6, 6]) { el(ex, -122, 2.4, 2.6); X.fillStyle = '#4a3a30'; X.fill(); }
      poly(0, -117, 15, -114, 0, -112); X.fillStyle = '#e8873a'; X.fill(); out(1.5);
      X.beginPath(); X.arc(0, -114, 7, 0.5, 2.6); X.lineWidth = 1.8; X.strokeStyle = '#4a3a30'; X.stroke();
      // scarf
      rr(-19, -104, 38, 9, 4); X.fillStyle = '#c8545a'; X.fill(); out(2);
      poly(8, -100, 18, -76, 8, -74, 2, -98); X.fill(); out(2);
      // knitted bobble hat
      X.beginPath(); X.moveTo(-15, -128); X.bezierCurveTo(-15, -150, 15, -150, 15, -128); X.closePath(); X.fillStyle = '#5f9a8c'; X.fill(); out(2.5);
      rr(-17, -131, 34, 7, 3); X.fillStyle = '#f6e6c8'; X.fill(); out(2);
      el(0, -146, 5, 5); X.fillStyle = '#fbf3e4'; X.fill(); out(2);
    },
  },

  // ---- Season Keepsakes (src/meta/seasonal.js KEEPSAKES, paid, cosmetic only). Placed in their own spots so they
  // sit beside every free-path piece.
  // Autumn Harvest: a carved pumpkin lantern with a warm glow, at the left end of the pavement
  hk_lantern: {
    x: -436, y: 224, box: [-44, -84, 44, 6],
    paint() {
      glow(0, -34, 46, 'rgba(255,190,90,');
      pumpkin(0, 0, 32, '#e8873a', '#c96a2a');
      // carved face, lit from inside
      X.fillStyle = '#ffd36a';
      poly(-14, -36, -6, -36, -10, -46); X.fill();
      poly(6, -36, 14, -36, 10, -46); X.fill();
      X.beginPath(); X.moveTo(-16, -22); X.quadraticCurveTo(0, -10, 16, -22); X.lineTo(10, -20); X.lineTo(6, -16); X.lineTo(0, -19); X.lineTo(-6, -16); X.lineTo(-10, -20); X.closePath(); X.fill();
      // a little wire handle
      X.beginPath(); X.moveTo(-18, -54); X.quadraticCurveTo(0, -84, 18, -54); X.lineWidth = 2.5; X.strokeStyle = '#6b5a4a'; X.stroke();
    },
  },
  // Autumn Harvest: a tin bucket of sunflowers on the pavement, left of the café steps
  hk_sunflowers: {
    x: 112, y: 226, box: [-46, -122, 46, 6],
    paint() {
      // stems and leaves
      X.strokeStyle = '#5f7a34'; X.lineWidth = 4;
      for (const [tx, ty] of [[-24, -100], [2, -114], [26, -94]]) { X.beginPath(); X.moveTo(tx * 0.3, -40); X.quadraticCurveTo(tx * 0.6, -70, tx, ty); X.stroke(); }
      for (const [lx, ly, r] of [[-14, -62, -0.7], [14, -70, 0.7]]) { el(lx, ly, 11, 5, r); X.fillStyle = '#7fa043'; X.fill(); out(2); }
      // flower heads
      for (const [fx, fy, fr] of [[-24, -100, 16], [2, -114, 18], [26, -94, 15]]) {
        X.fillStyle = '#f3c35a';
        for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; el(fx + Math.cos(a) * fr * 0.85, fy + Math.sin(a) * fr * 0.85, fr * 0.42, fr * 0.2, a); X.fill(); }
        X.lineWidth = 1.2; X.strokeStyle = OUT;
        for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; el(fx + Math.cos(a) * fr * 0.85, fy + Math.sin(a) * fr * 0.85, fr * 0.42, fr * 0.2, a); X.stroke(); }
        el(fx, fy, fr * 0.5, fr * 0.5); X.fillStyle = '#7a4a2a'; X.fill(); out(2);
      }
      // the tin bucket
      poly(-30, -44, 30, -44, 24, 0, -24, 0); X.fillStyle = '#9fb0b8'; X.fill(); out(3);
      rr(-33, -48, 66, 8, 3); X.fillStyle = '#b8c6cc'; X.fill(); out(2.5);
      X.strokeStyle = 'rgba(255,255,255,.5)'; X.lineWidth = 3; X.beginPath(); X.moveTo(-16, -38); X.lineTo(-13, -6); X.stroke();
    },
  },
  // Autumn Harvest: a round wreath of autumn leaves and berries on the wall, right of the café door
  hk_wreath: {
    x: 404, y: -2, box: [-44, -44, 44, 44],
    paint() {
      const R = 26, cols = ['#d8573a', '#e8913a', '#c9a23a', '#b8483a', '#e07a3a'];
      X.beginPath(); X.arc(0, 0, R, 0, TAU); X.lineWidth = 10; X.strokeStyle = '#8a6a4a'; X.stroke();
      for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU; mapleLeaf(Math.cos(a) * R, Math.sin(a) * R, 1.15, a + 1.6, cols[i % cols.length]); }
      for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU + 0.3; el(Math.cos(a) * (R - 3), Math.sin(a) * (R - 3), 4, 4); X.fillStyle = '#b5383f'; X.fill(); out(1.5); }
      // a small bow at the top
      X.fillStyle = '#f6e6c8';
      poly(0, -R, -14, -R - 9, -14, -R + 7); X.fill(); out(2);
      poly(0, -R, 14, -R - 9, 14, -R + 7); X.fill(); out(2);
    },
  },
  // Frost & Lanterns: a little potted fir with warm lights, at the right end of the pavement
  wk_tree: {
    x: 470, y: 224, box: [-40, -150, 40, 6],
    paint() {
      // pot
      poly(-24, -34, 24, -34, 18, 0, -18, 0); X.fillStyle = '#b86a4a'; X.fill(); out(3);
      rr(-27, -40, 54, 9, 3); X.fillStyle = '#c97a5a'; X.fill(); out(2.5);
      rr(-4, -52, 8, 14, 2); X.fillStyle = '#7a5a3a'; X.fill();
      // three tiers of branches
      for (const [y0, w, h] of [[-48, 36, 44], [-82, 28, 40], [-112, 19, 36]]) {
        poly(-w, y0, w, y0, 0, y0 - h); X.fillStyle = '#3f7a48'; X.fill(); out(2.5);
      }
      // warm lights and a paper star on top
      const r = rng(0x7e3);
      for (let i = 0; i < 11; i++) {
        const t = r(), y = -56 - t * 80, half = 30 * (1 - t) + 4, x = (r() - 0.5) * 2 * half * 0.8;
        glow(x, y, 7, 'rgba(255,214,120,'); el(x, y, 2.8, 2.8); X.fillStyle = '#ffe9a8'; X.fill();
      }
      X.save(); X.translate(0, -150); star5(0, 0, 10, 4.4); X.fillStyle = '#f6c45a'; X.fill(); out(2); X.restore();
    },
  },
  // Frost & Lanterns: a wooden sled leaning on the sea wall, a woolly scarf over it
  wk_sled: {
    x: -300, y: 412, box: [-72, -64, 72, 6],
    paint() {
      // runners
      X.beginPath(); X.moveTo(-64, -6); X.lineTo(52, -6); X.quadraticCurveTo(70, -6, 66, -22); X.lineWidth = 5; X.strokeStyle = '#8a3a32'; X.stroke();
      for (const px of [-40, 24]) { rr(px - 3, -26, 6, 20, 2); X.fillStyle = '#8a3a32'; X.fill(); }
      // slats
      rr(-60, -40, 116, 16, 5); X.fillStyle = '#c9925a'; X.fill(); out(3);
      X.strokeStyle = '#a5703f'; X.lineWidth = 2.5; for (const vx of [-30, 0, 30]) { X.beginPath(); X.moveTo(vx, -38); X.lineTo(vx, -26); X.stroke(); }
      // scarf: draped over the top with two striped ends hanging down
      X.beginPath(); X.moveTo(-26, -40); X.quadraticCurveTo(0, -60, 24, -40); X.lineTo(24, -32); X.quadraticCurveTo(0, -50, -26, -32); X.closePath(); X.fillStyle = '#5f9a8c'; X.fill(); out(2.5);
      for (const ex of [-22, 18]) {
        rr(ex - 6, -34, 12, 30, 3); X.fillStyle = '#5f9a8c'; X.fill(); out(2);
        X.fillStyle = '#f6e6c8'; X.fillRect(ex - 6, -22, 12, 4); X.fillRect(ex - 6, -14, 12, 4);
      }
    },
  },
  // Frost & Lanterns: a folded paper star hung on the wall, right of the café door
  wk_star: {
    x: 404, y: -72, box: [-34, -56, 34, 34],
    paint() {
      X.beginPath(); X.moveTo(0, -56); X.lineTo(0, -30); X.lineWidth = 2; X.strokeStyle = '#6b5a4a'; X.stroke();
      glow(0, 0, 34, 'rgba(255,214,140,');
      star5(0, 0, 28, 12); X.fillStyle = '#fbe7b8'; X.fill(); out(2.5);
      X.strokeStyle = 'rgba(200,150,80,.6)'; X.lineWidth = 1.6;
      for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k * TAU) / 5; X.beginPath(); X.moveTo(0, 0); X.lineTo(Math.cos(a) * 26, Math.sin(a) * 26); X.stroke(); }
    },
  },
};

function star5(x, y, r, ri) {
  X.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5, rad = k % 2 ? ri : r;
    if (k) X.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); else X.moveTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }
  X.closePath();
}

// small seeded random (the art is the same on every device and every repaint)
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function glow(x, y, r, rgba) {
  const g = X.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba + '.75)'); g.addColorStop(1, rgba + '0)');
  X.fillStyle = g; X.beginPath(); X.arc(x, y, r, 0, TAU); X.fill();
}

function snowCap(x0, x1, y, th, seed) {
  // a lumpy cap resting on y, with rounded drips hanging a little below it
  const r = rng(seed);
  X.beginPath(); X.moveTo(x0, y + 4);
  X.quadraticCurveTo(x0 - 6, y - th * 0.6, x0 + 10, y - th * 0.7);
  for (let x = x0 + 10; x < x1 - 10;) {
    const step = 26 + r() * 30, nx = Math.min(x1 - 10, x + step);
    X.quadraticCurveTo((x + nx) / 2, y - th * (1 + r() * 0.5), nx, y - th * (0.65 + r() * 0.2));
    x = nx;
  }
  X.quadraticCurveTo(x1 + 6, y - th * 0.6, x1, y + 4);
  for (let x = x1; x > x0 + 14;) {
    const step = 30 + r() * 46, nx = Math.max(x0, x - step);
    if (r() < 0.45) { const m = (x + nx) / 2, d = 6 + r() * 8; X.lineTo(m + 7, y + 4); X.quadraticCurveTo(m + 7, y + 4 + d, m, y + 4 + d); X.quadraticCurveTo(m - 7, y + 4 + d, m - 7, y + 4); }
    X.lineTo(nx, y + 4);
    x = nx;
  }
  X.closePath();
  X.fillStyle = '#fbfdff'; X.fill();
  X.lineWidth = 2.5; X.strokeStyle = '#8fa6bf'; X.lineJoin = 'round'; X.stroke();
  // a cool shadow along its foot
  X.save(); X.clip();
  X.fillStyle = 'rgba(160,190,225,.45)'; X.fillRect(x0 - 10, y - 2, x1 - x0 + 20, 30);
  X.restore();
}

function lantern(x, y, r, [col, dark]) {
  glow(x, y, r * 2.1, 'rgba(255,205,120,');
  X.beginPath(); X.moveTo(x, y - r * 1.6); X.lineTo(x, y - r); X.lineWidth = 1.5; X.strokeStyle = '#6b5a4a'; X.stroke();
  el(x, y, r, r * 0.9); X.fillStyle = col; X.fill();
  X.save(); X.clip(); X.strokeStyle = dark; X.lineWidth = 1.4;
  for (const dx of [-0.5, 0, 0.5]) { X.beginPath(); X.ellipse(x, y, Math.abs(dx) * r + 0.01, r * 0.9, 0, 0, TAU); X.stroke(); }
  X.restore();
  el(x, y, r, r * 0.9); out(1.8);
  rr(x - r * 0.45, y - r * 1.05, r * 0.9, r * 0.3, 1.5); X.fillStyle = '#5a4a3a'; X.fill();
  rr(x - r * 0.45, y + r * 0.78, r * 0.9, r * 0.3, 1.5); X.fill();
}

export const DECOR_ART_IDS = Object.freeze(Object.keys(DECOR));
/** The world rect [x0, y0, x1, y1] a decoration is placed in (its box at its anchor), or null (tests: no overlaps). */
export const decorRect = (id) => { const d = DECOR[id]; return d ? [d.x + d.box[0], d.y + d.box[1], d.x + d.box[2], d.y + d.box[3]] : null; };

// ---------------------------------------------------------------- falling snow (Home, winter only)
// One pre-rendered tile, made once per screen size: flakes repeat every SNOW_P css px down the tile, so the layer
// scrolls by moving a source window and costs one drawImage a frame. The caller skips it under Calm / reduced motion.
const SNOW_P = 240;
const SNOWY_SEASONS = new Set(['winter-2026']);
/** True when the season id is a snowy one (the café shows the falling-snow layer). */
export const isSnowySeason = (season) => !!(season && SNOWY_SEASONS.has(season.id));
let snowTile = null; // { canvas, w, h }

function makeSnowTile(w, h) {
  const th = h + SNOW_P;
  const canvas = makeCanvas(w, th);
  const g = canvas.getContext('2d');
  if (!g) return null;
  const r = rng(0x5e0f);
  const n = Math.max(12, Math.round((w * SNOW_P) / 2600)); // a light fall: about 36 flakes per tile on a phone
  const flakes = [];
  for (let i = 0; i < n; i++) flakes.push([r() * w, r() * SNOW_P, 1.1 + r() * 1.9, 0.45 + r() * 0.4]);
  for (let k = 0; k * SNOW_P < th + SNOW_P; k++) {
    for (const [fx, fy, fr, fa] of flakes) {
      const y = fy + k * SNOW_P;
      if (y - fr > th) continue;
      g.globalAlpha = fa * 0.35; g.fillStyle = '#9fb6d4'; g.beginPath(); g.arc(fx, y + 0.6, fr + 0.8, 0, TAU); g.fill();
      g.globalAlpha = fa; g.fillStyle = '#ffffff'; g.beginPath(); g.arc(fx, y, fr, 0, TAU); g.fill();
    }
  }
  return { canvas, w, h };
}

/**
 * Draw the light falling-snow layer in screen space (css px; `dpr` device px per css px). One drawImage.
 * `t` is the café clock in seconds.
 */
export function paintSnow(ctx, W, H, dpr, t) {
  const w = Math.ceil(W), h = Math.ceil(H);
  if (!snowTile || snowTile.w !== w || snowTile.h !== h) snowTile = makeSnowTile(w, h);
  if (!snowTile) return;
  const off = SNOW_P - ((t * 22) % SNOW_P); // 22 css px a second: a slow, calm drift
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.drawImage(snowTile.canvas, 0, off, w, h, 0, 0, w, h);
}

const cache = new Map(); // `${id}|${scale bucket}` -> { canvas, x0, y0, w, h }

function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
}

/** The cached sprite of one decoration at `pxPerUnit` (bucketed so small zoom changes reuse it). */
export function decorSprite(id, pxPerUnit) {
  const d = DECOR[id];
  if (!d) return null;
  const q = Math.max(0.1, Math.min(4, Math.round(pxPerUnit * 8) / 8));
  const key = `${id}|${q}`;
  let e = cache.get(key);
  if (e) return e;
  const [bx0, by0, bx1, by1] = d.box;
  const pad = 6;
  const w = Math.max(1, Math.ceil((bx1 - bx0 + pad * 2) * q)), h = Math.max(1, Math.ceil((by1 - by0 + pad * 2) * q));
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.setTransform(q, 0, 0, q, (pad - bx0) * q, (pad - by0) * q);
  X = ctx;
  try { d.paint(); } finally { X = null; }
  e = { canvas, x0: d.x + bx0 - pad, y0: d.y + by0 - pad, w: bx1 - bx0 + pad * 2, h: by1 - by0 + pad * 2 };
  if (cache.size > 24) cache.delete(cache.keys().next().value);
  cache.set(key, e);
  return e;
}

/**
 * Draw the earned decorations. `ctx` is in café world space; `v` the visible world rect { x0, y0, x1, y1 };
 * `pxPerUnit` device pixels per world unit; `terrace` the terrace's area info (some pieces need a built prop).
 */
export function paintSeasonDecor(ctx, ids, v, pxPerUnit, terrace) {
  if (!ids || !ids.length) return;
  for (const id of ids) {
    const d = DECOR[id];
    if (!d) continue;
    if (d.x + d.box[2] < v.x0 || d.x + d.box[0] > v.x1 || d.y + d.box[3] < v.y0 || d.y + d.box[1] > v.y1) continue;
    if (d.when && !d.when(terrace)) continue;
    const e = decorSprite(id, pxPerUnit);
    if (e) ctx.drawImage(e.canvas, e.x0, e.y0, e.w, e.h);
  }
}

/** A small preview of a decoration on a 2D canvas context (the season card's step icons), fit into size x size. */
export function paintDecorIcon(ctx, id, size) {
  const d = DECOR[id];
  if (!d) return;
  const [bx0, by0, bx1, by1] = d.box;
  const s = Math.min(size / (bx1 - bx0), size / (by1 - by0)) * 0.9;
  ctx.save();
  ctx.translate(size / 2 - ((bx0 + bx1) / 2) * s, size / 2 - ((by0 + by1) / 2) * s);
  ctx.scale(s, s);
  X = ctx;
  try { d.paint(); } finally { X = null; ctx.restore(); }
}
