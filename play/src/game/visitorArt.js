// Café visitors' art (src/meta/visitors.js holds who they are and what they say). Same flat painted style as the
// Keepers (src/game/keeperArt.js): soft outline, one radial gradient per part, light from the top left, no shadowBlur.
//
// Cheap on purpose: each visitor is painted once into a small bitmap per on-screen size bucket (VISITOR_CACHE) and
// then blitted with a couple of transforms a frame (a slow breath, a sway, a hop when tapped). Only the tiny live bits
// are stroked each frame: Barnaby's fishing line and float, Wren's kite string, and the "story waiting" dots.
//
// A painter draws a visitor with its feet centred on (x, y) at size r (about a head and a half tall per r).

const TAU = Math.PI * 2;
const PI = Math.PI;
const SERIF = "'Iowan Old Style','Palatino Linotype',Georgia,serif";
const ROUND = "Fredoka,'Baloo 2',ui-rounded,system-ui,sans-serif";

/** Size of a visitor in café world units (a Keeper is 58). */
export const VISITOR_R = 54;

/**
 * Where each visitor stands in the café world (feet, world units), keyed by visitor id. A visitor with no spot here
 * (a new area's visitor that has not been placed yet) is simply not drawn.
 */
export const VISITOR_SPOTS = {
  hazel: { x: -175, y: 362 },
  bookclub: { x: 700, y: 152 },
  ducks: { x: 2870, y: 402 },
  barnaby: { x: 3905, y: 300 },
  juniper: { x: 4820, y: 398 },
  wren: { x: 6870, y: 402 },
  marguerite: { x: 8150, y: 352 },
};

// ------------------------------------------------------------------ paint helpers (as in keeperArt.js)
const OW = (r) => Math.max(1, r * 0.045);
function shade(ctx, x, y, rr, light, base, dark) {
  const g = ctx.createRadialGradient(x - rr * 0.35, y - rr * 0.45, rr * 0.05, x, y, rr * 1.15);
  g.addColorStop(0, light); g.addColorStop(0.55, base); g.addColorStop(1, dark);
  return g;
}
function ell(ctx, x, y, rx, ry, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); }
function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); }
function paint(ctx, fill, line, lw) {
  ctx.fillStyle = fill; ctx.fill();
  if (line) { ctx.strokeStyle = line; ctx.lineWidth = lw; ctx.stroke(); }
}
function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}
function line(ctx, pts, col, lw) {
  ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.stroke();
}

/**
 * A simple face at (x, y) (eye line), size s (head radius). o: { ink, eyes: 'dot' | 'happy' | 'down', cheek,
 * nose: colour | null, beak: colour | null, glasses: colour | null, mouth: 'smile' | 'open' | 'none' }.
 */
function face(ctx, x, y, s, o) {
  const ink = o.ink || '#3a2216';
  const ex = s * (o.ex || 0.36), er = s * 0.1;
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // cheeks
  ctx.fillStyle = o.cheek || 'rgba(240,110,100,0.5)';
  for (const k of [-1, 1]) { ell(ctx, x + k * s * 0.55, y + s * 0.3, s * 0.15, s * 0.09); ctx.fill(); }
  // eyes
  ctx.fillStyle = ink; ctx.strokeStyle = ink; ctx.lineWidth = Math.max(1, s * 0.07);
  for (const k of [-1, 1]) {
    const cx = x + k * ex;
    if (o.eyes === 'happy') { ctx.beginPath(); ctx.arc(cx, y + er * 0.6, er * 1.15, 1.15 * PI, 1.85 * PI); ctx.stroke(); }
    else if (o.eyes === 'down') { ctx.beginPath(); ctx.arc(cx, y - er * 0.2, er * 1.1, 0.15 * PI, 0.85 * PI); ctx.stroke(); }
    else {
      circle(ctx, cx, y, er * 1.15); ctx.fill();
      ctx.fillStyle = '#ffffff'; circle(ctx, cx - er * 0.4, y - er * 0.45, er * 0.42); ctx.fill(); ctx.fillStyle = ink;
    }
  }
  if (o.glasses) {
    ctx.strokeStyle = o.glasses; ctx.lineWidth = Math.max(1, s * 0.05);
    for (const k of [-1, 1]) { circle(ctx, x + k * ex, y, er * 2.3); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(x - ex + er * 2.3, y); ctx.lineTo(x + ex - er * 2.3, y); ctx.stroke();
  }
  // nose / beak and mouth
  if (o.beak) {
    ell(ctx, x, y + s * 0.3, s * 0.3, s * 0.15); paint(ctx, o.beak, 'rgba(120,60,20,0.55)', Math.max(1, s * 0.04));
    ctx.strokeStyle = 'rgba(120,60,20,0.55)'; ctx.lineWidth = Math.max(1, s * 0.035);
    ctx.beginPath(); ctx.moveTo(x - s * 0.22, y + s * 0.31); ctx.quadraticCurveTo(x, y + s * 0.37, x + s * 0.22, y + s * 0.31); ctx.stroke();
  } else {
    if (o.nose) {
      ctx.fillStyle = o.nose;
      ctx.beginPath(); ctx.moveTo(x - s * 0.1, y + s * 0.17); ctx.quadraticCurveTo(x, y + s * 0.12, x + s * 0.1, y + s * 0.17);
      ctx.quadraticCurveTo(x, y + s * 0.3, x - s * 0.1, y + s * 0.17); ctx.fill();
    }
    if (o.mouth !== 'none') {
      ctx.strokeStyle = ink; ctx.lineWidth = Math.max(1, s * 0.05);
      ctx.beginPath();
      if (o.mouth === 'open') { ell(ctx, x, y + s * 0.38, s * 0.08, s * 0.07); ctx.fillStyle = ink; ctx.fill(); }
      else { ctx.arc(x, y + s * 0.26, s * 0.12, 0.2 * PI, 0.8 * PI); ctx.stroke(); }
    }
  }
  ctx.restore();
}

// ------------------------------------------------------------------ the visitors
// Each: box (bounds around the feet, in r units: [x0, y0, x1, y1]), paint(ctx, x, y, r), plus where the live bits go.
const ART = {
  // Hazel: a grey rabbit grandma in a lilac cardigan and round glasses, knitting a harbour-blue scarf on a stool.
  hazel: {
    box: [-1.0, -3.0, 1.15, 0.12],
    paint(ctx, x, y, r) {
      const ow = OW(r), ln = '#6b5a66';
      const fur = (cx, cy, rr) => shade(ctx, cx, cy, rr, '#f4f0ee', '#cfc7c6', '#9b908f');
      ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      // stool
      for (const k of [-1, 1]) line(ctx, [x + k * r * 0.4, y - r * 0.6, x + k * r * 0.5, y], '#8a5a3a', r * 0.09);
      rrect(ctx, x - r * 0.62, y - r * 0.72, r * 1.24, r * 0.16, r * 0.06); paint(ctx, '#b87c4e', '#6e4529', ow);
      // scarf hanging from the lap down to a ball of wool
      ctx.beginPath();
      ctx.moveTo(x - r * 0.05, y - r * 0.95);
      ctx.quadraticCurveTo(x + r * 0.15, y - r * 0.5, x + r * 0.3, y - r * 0.12);
      ctx.lineTo(x + r * 0.62, y - r * 0.12);
      ctx.quadraticCurveTo(x + r * 0.42, y - r * 0.55, x + r * 0.3, y - r * 0.95);
      ctx.closePath(); paint(ctx, shade(ctx, x + r * 0.3, y - r * 0.5, r * 0.5, '#9fd0f0', '#4f8fc4', '#2f6596'), '#2c5578', ow);
      ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = ow * 0.8;
      for (let i = 1; i < 4; i++) { const t = i / 4; ctx.beginPath(); ctx.moveTo(x + r * (0.0 + t * 0.3), y - r * (0.95 - t * 0.83)); ctx.lineTo(x + r * (0.32 + t * 0.3), y - r * (0.95 - t * 0.83)); ctx.stroke(); }
      circle(ctx, x + r * 0.86, y - r * 0.16, r * 0.17); paint(ctx, shade(ctx, x + r * 0.86, y - r * 0.16, r * 0.17, '#9fd0f0', '#4f8fc4', '#2f6596'), '#2c5578', ow);
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = ow * 0.7;
      ctx.beginPath(); ctx.arc(x + r * 0.86, y - r * 0.16, r * 0.1, 0.9 * PI, 1.9 * PI); ctx.stroke();
      // feet dangling
      for (const k of [-1, 1]) { ell(ctx, x + k * r * 0.24, y - r * 0.5, r * 0.17, r * 0.1); paint(ctx, fur(x, y - r * 0.5, r * 0.2), ln, ow); }
      // body: cardigan
      ell(ctx, x, y - r * 1.12, r * 0.56, r * 0.52); paint(ctx, shade(ctx, x, y - r * 1.12, r * 0.56, '#e6d4f0', '#b796cc', '#7f5f98'), '#5d4472', ow);
      ell(ctx, x, y - r * 1.12, r * 0.2, r * 0.44); ctx.fillStyle = 'rgba(255,248,240,0.85)'; ctx.fill();
      ctx.fillStyle = '#f2c46d'; for (let i = 0; i < 3; i++) { circle(ctx, x + r * 0.24, y - r * (1.38 - i * 0.2), r * 0.04); ctx.fill(); }
      // needles and paws
      line(ctx, [x - r * 0.42, y - r * 1.25, x + r * 0.18, y - r * 0.82], '#c9a36a', r * 0.05);
      line(ctx, [x + r * 0.38, y - r * 1.25, x - r * 0.12, y - r * 0.82], '#c9a36a', r * 0.05);
      ell(ctx, x + r * 0.1, y - r * 0.98, r * 0.22, r * 0.1); paint(ctx, '#4f8fc4', '#2c5578', ow * 0.8);
      for (const k of [-1, 1]) { ell(ctx, x + k * r * 0.3, y - r * 1.02, r * 0.12, r * 0.1); paint(ctx, fur(x + k * r * 0.3, y - r * 1.02, r * 0.12), ln, ow); }
      // ears: one up, one flopped over
      ell(ctx, x - r * 0.2, y - r * 2.4, r * 0.13, r * 0.45, -0.12); paint(ctx, fur(x - r * 0.2, y - r * 2.4, r * 0.4), ln, ow);
      ell(ctx, x - r * 0.2, y - r * 2.38, r * 0.06, r * 0.33, -0.12); ctx.fillStyle = '#f2b8c0'; ctx.fill();
      ell(ctx, x + r * 0.45, y - r * 2.12, r * 0.13, r * 0.42, 1.0); paint(ctx, fur(x + r * 0.45, y - r * 2.12, r * 0.4), ln, ow);
      ell(ctx, x + r * 0.45, y - r * 2.12, r * 0.06, r * 0.3, 1.0); ctx.fillStyle = '#f2b8c0'; ctx.fill();
      // head
      ell(ctx, x, y - r * 1.8, r * 0.48, r * 0.43); paint(ctx, fur(x, y - r * 1.8, r * 0.48), ln, ow);
      ell(ctx, x, y - r * 1.68, r * 0.24, r * 0.15); ctx.fillStyle = '#fbf7f4'; ctx.fill();
      face(ctx, x, y - r * 1.84, r * 0.45, { eyes: 'down', glasses: '#8a5a3a', nose: '#d98a99', ink: '#3b2b33' });
      ctx.restore();
    },
  },

  // Olive (an owl with half-moon glasses and a red book) and Mabel (a tortoise in a straw hat with a teacup).
  bookclub: {
    box: [-1.25, -2.45, 1.3, 0.12],
    paint(ctx, x, y, r) {
      const ow = OW(r);
      ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      // --- Olive, the owl (left)
      const ox = x - r * 0.62;
      for (const k of [-1, 1]) { ell(ctx, ox + k * r * 0.16, y - r * 0.04, r * 0.12, r * 0.06); paint(ctx, '#e7a14a', '#8a5420', ow); }
      ell(ctx, ox, y - r * 0.92, r * 0.52, r * 0.86); paint(ctx, shade(ctx, ox, y - r * 0.95, r * 0.8, '#c99a6a', '#946640', '#5e3d22'), '#4a2e18', ow);
      ell(ctx, ox, y - r * 0.62, r * 0.32, r * 0.48); ctx.fillStyle = '#f1dfc0'; ctx.fill();
      ctx.strokeStyle = 'rgba(120,80,40,0.5)'; ctx.lineWidth = ow * 0.8;
      for (let i = 0; i < 3; i++) for (let j = -1; j <= 1; j++) { const cx = ox + j * r * 0.14, cy = y - r * (0.85 - i * 0.18); ctx.beginPath(); ctx.arc(cx, cy, r * 0.05, 0.2 * PI, 0.8 * PI); ctx.stroke(); }
      // ear tufts
      for (const k of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(ox + k * r * 0.22, y - r * 1.62); ctx.lineTo(ox + k * r * 0.46, y - r * 1.98); ctx.lineTo(ox + k * r * 0.44, y - r * 1.55); ctx.closePath();
        paint(ctx, '#7a5232', '#4a2e18', ow);
      }
      // face disc
      for (const k of [-1, 1]) { circle(ctx, ox + k * r * 0.2, y - r * 1.38, r * 0.22); paint(ctx, '#f6ead6', 'rgba(74,46,24,0.6)', ow * 0.8); }
      face(ctx, ox, y - r * 1.38, r * 0.55, { ex: 0.36, beak: '#e7a14a', ink: '#2a1a10', cheek: 'rgba(240,120,100,0.35)', glasses: '#b07a2a' });
      // the open book in her wings
      ctx.beginPath(); ctx.moveTo(ox, y - r * 0.82); ctx.lineTo(ox - r * 0.46, y - r * 0.92); ctx.lineTo(ox - r * 0.42, y - r * 0.5); ctx.lineTo(ox, y - r * 0.42); ctx.closePath(); paint(ctx, '#fffaf0', '#8a6a50', ow);
      ctx.beginPath(); ctx.moveTo(ox, y - r * 0.82); ctx.lineTo(ox + r * 0.46, y - r * 0.92); ctx.lineTo(ox + r * 0.42, y - r * 0.5); ctx.lineTo(ox, y - r * 0.42); ctx.closePath(); paint(ctx, '#fffaf0', '#8a6a50', ow);
      ctx.strokeStyle = 'rgba(90,70,60,0.45)'; ctx.lineWidth = ow * 0.6;
      for (let i = 0; i < 3; i++) for (const k of [-1, 1]) { ctx.beginPath(); ctx.moveTo(ox + k * r * 0.08, y - r * (0.76 - i * 0.1)); ctx.lineTo(ox + k * r * 0.36, y - r * (0.82 - i * 0.1)); ctx.stroke(); }
      line(ctx, [ox - r * 0.44, y - r * 0.44, ox, y - r * 0.36, ox + r * 0.44, y - r * 0.44], '#c0504a', r * 0.08);
      for (const k of [-1, 1]) { ell(ctx, ox + k * r * 0.44, y - r * 0.62, r * 0.12, r * 0.18, k * 0.3); paint(ctx, '#7a5232', '#4a2e18', ow); }
      // --- Mabel, the tortoise (right)
      const tx = x + r * 0.66;
      for (const k of [-1, 1]) { ell(ctx, tx + k * r * 0.26, y - r * 0.08, r * 0.16, r * 0.1); paint(ctx, '#9cb46a', '#4d6030', ow); }
      ell(ctx, tx, y - r * 0.72, r * 0.6, r * 0.62); paint(ctx, shade(ctx, tx, y - r * 0.75, r * 0.6, '#a8c27a', '#6f8f45', '#46612a'), '#33461d', ow);
      ctx.strokeStyle = 'rgba(51,70,29,0.5)'; ctx.lineWidth = ow;
      for (const k of [-1, 1]) { ctx.beginPath(); ctx.arc(tx + k * r * 0.5, y - r * 0.72, r * 0.18, 0, TAU); ctx.stroke(); }
      ell(ctx, tx, y - r * 0.66, r * 0.36, r * 0.5); paint(ctx, shade(ctx, tx, y - r * 0.66, r * 0.4, '#fbeec0', '#e8cf86', '#bfa055'), '#8a7236', ow);
      ctx.strokeStyle = 'rgba(138,114,54,0.6)'; ctx.lineWidth = ow * 0.8;
      for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(tx - r * 0.3, y - r * (1.08 - i * 0.22)); ctx.lineTo(tx + r * 0.3, y - r * (1.08 - i * 0.22)); ctx.stroke(); }
      // teacup held in both hands
      for (const k of [-1, 1]) { ell(ctx, tx + k * r * 0.2, y - r * 0.82, r * 0.11, r * 0.09); paint(ctx, '#9cb46a', '#4d6030', ow); }
      ctx.beginPath(); ctx.moveTo(tx - r * 0.14, y - r * 0.96); ctx.lineTo(tx + r * 0.14, y - r * 0.96); ctx.quadraticCurveTo(tx + r * 0.13, y - r * 0.78, tx, y - r * 0.78); ctx.quadraticCurveTo(tx - r * 0.13, y - r * 0.78, tx - r * 0.14, y - r * 0.96); ctx.closePath();
      paint(ctx, '#ffffff', '#8a7660', ow * 0.8);
      ctx.fillStyle = '#e88aa0'; circle(ctx, tx, y - r * 0.87, r * 0.035); ctx.fill();
      // head
      ell(ctx, tx, y - r * 1.55, r * 0.36, r * 0.34); paint(ctx, shade(ctx, tx, y - r * 1.55, r * 0.36, '#c6d99a', '#9cb46a', '#6c8343'), '#4d6030', ow);
      face(ctx, tx, y - r * 1.57, r * 0.36, { eyes: 'happy', ink: '#2c3a18', nose: null, cheek: 'rgba(240,120,110,0.45)' });
      // straw hat with a flower
      ell(ctx, tx, y - r * 1.84, r * 0.52, r * 0.12); paint(ctx, '#f1d58f', '#a8853c', ow);
      ctx.beginPath(); ctx.moveTo(tx - r * 0.28, y - r * 1.86); ctx.quadraticCurveTo(tx - r * 0.26, y - r * 2.18, tx, y - r * 2.18); ctx.quadraticCurveTo(tx + r * 0.26, y - r * 2.18, tx + r * 0.28, y - r * 1.86); ctx.closePath();
      paint(ctx, '#f1d58f', '#a8853c', ow);
      line(ctx, [tx - r * 0.28, y - r * 1.92, tx + r * 0.28, y - r * 1.92], '#d9789a', r * 0.07);
      ctx.fillStyle = '#ffffff'; for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; circle(ctx, tx + r * 0.22 + Math.cos(a) * r * 0.07, y - r * 1.98 + Math.sin(a) * r * 0.07, r * 0.055); ctx.fill(); }
      ctx.fillStyle = '#f2c84b'; circle(ctx, tx + r * 0.22, y - r * 1.98, r * 0.045); ctx.fill();
      ctx.restore();
    },
  },

  // Arthur (flat cap, bow tie) and Bea (rose headscarf) walking Biscuit, a sandy little terrier, on a red lead.
  ducks: {
    box: [-1.45, -2.2, 1.65, 0.12],
    paint(ctx, x, y, r) {
      const ow = OW(r), ln = '#7d7468';
      ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      const duck = (dx, hat) => {
        for (const k of [-1, 1]) {
          ctx.beginPath(); ctx.moveTo(dx + k * r * 0.14 - r * 0.12, y); ctx.lineTo(dx + k * r * 0.14 + r * 0.12, y); ctx.lineTo(dx + k * r * 0.14, y - r * 0.14); ctx.closePath();
          paint(ctx, '#f0a040', '#a8641c', ow);
        }
        ell(ctx, dx, y - r * 0.62, r * 0.46, r * 0.52); paint(ctx, shade(ctx, dx, y - r * 0.65, r * 0.5, '#ffffff', '#efeae0', '#c2b9a8'), ln, ow);
        for (const k of [-1, 1]) { ell(ctx, dx + k * r * 0.4, y - r * 0.66, r * 0.13, r * 0.26, k * 0.25); paint(ctx, '#e4ddcf', ln, ow); }
        ell(ctx, dx, y - r * 1.36, r * 0.36, r * 0.34); paint(ctx, shade(ctx, dx, y - r * 1.36, r * 0.36, '#ffffff', '#efeae0', '#c2b9a8'), ln, ow);
        face(ctx, dx, y - r * 1.4, r * 0.36, { beak: '#f0a040', ink: '#2a2420', cheek: 'rgba(240,120,110,0.4)' });
        hat(dx);
      };
      // Arthur, flat cap and a bow tie
      duck(x - r * 0.88, (dx) => {
        ctx.beginPath(); ctx.moveTo(dx - r * 0.34, y - r * 1.52); ctx.quadraticCurveTo(dx - r * 0.3, y - r * 1.84, dx + r * 0.04, y - r * 1.82);
        ctx.quadraticCurveTo(dx + r * 0.34, y - r * 1.8, dx + r * 0.36, y - r * 1.58); ctx.quadraticCurveTo(dx + r * 0.52, y - r * 1.55, dx + r * 0.46, y - r * 1.5);
        ctx.lineTo(dx - r * 0.34, y - r * 1.52); ctx.closePath(); paint(ctx, shade(ctx, dx, y - r * 1.7, r * 0.4, '#b59a78', '#8a6e4e', '#5e4a33'), '#4a3a28', ow);
        ctx.fillStyle = '#3f6a8f';
        ctx.beginPath(); ctx.moveTo(dx, y - r * 1.04); ctx.lineTo(dx - r * 0.14, y - r * 1.12); ctx.lineTo(dx - r * 0.14, y - r * 0.96); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(dx, y - r * 1.04); ctx.lineTo(dx + r * 0.14, y - r * 1.12); ctx.lineTo(dx + r * 0.14, y - r * 0.96); ctx.closePath(); ctx.fill();
      });
      // Bea, a rose headscarf
      duck(x + r * 0.08, (dx) => {
        ctx.beginPath(); ctx.moveTo(dx - r * 0.38, y - r * 1.3); ctx.quadraticCurveTo(dx - r * 0.4, y - r * 1.8, dx, y - r * 1.78);
        ctx.quadraticCurveTo(dx + r * 0.4, y - r * 1.8, dx + r * 0.38, y - r * 1.3); ctx.quadraticCurveTo(dx + r * 0.3, y - r * 1.56, dx, y - r * 1.6);
        ctx.quadraticCurveTo(dx - r * 0.3, y - r * 1.56, dx - r * 0.38, y - r * 1.3); ctx.closePath();
        paint(ctx, shade(ctx, dx, y - r * 1.65, r * 0.4, '#f6b8c4', '#e07d93', '#b2566c'), '#8e3f53', ow);
        ctx.fillStyle = '#ffffff'; for (const [a, b] of [[-0.2, 1.68], [0.12, 1.72], [0.26, 1.58], [-0.3, 1.5]]) { circle(ctx, dx + a * r, y - b * r, r * 0.03); ctx.fill(); }
      });
      // the lead from Bea's wing to Biscuit's collar
      ctx.strokeStyle = '#c0453f'; ctx.lineWidth = r * 0.05;
      ctx.beginPath(); ctx.moveTo(x + r * 0.5, y - r * 0.7); ctx.quadraticCurveTo(x + r * 0.85, y - r * 0.35, x + r * 1.08, y - r * 0.56); ctx.stroke();
      // Biscuit
      const bx = x + r * 1.2;
      for (const k of [-1, 1]) { ell(ctx, bx + k * r * 0.18, y - r * 0.06, r * 0.08, r * 0.07); paint(ctx, '#d9b07a', '#7a5630', ow); }
      ctx.beginPath(); ctx.moveTo(bx + r * 0.3, y - r * 0.38); ctx.quadraticCurveTo(bx + r * 0.52, y - r * 0.6, bx + r * 0.46, y - r * 0.78); ctx.strokeStyle = '#7a5630'; ctx.lineWidth = r * 0.1; ctx.stroke();
      ctx.strokeStyle = '#e7c48f'; ctx.lineWidth = r * 0.06; ctx.stroke();
      ell(ctx, bx, y - r * 0.32, r * 0.34, r * 0.24); paint(ctx, shade(ctx, bx, y - r * 0.34, r * 0.34, '#f4dcb0', '#dbb57e', '#a8814f'), '#7a5630', ow);
      ell(ctx, bx - r * 0.1, y - r * 0.68, r * 0.25, r * 0.23); paint(ctx, shade(ctx, bx - r * 0.1, y - r * 0.68, r * 0.25, '#f4dcb0', '#dbb57e', '#a8814f'), '#7a5630', ow);
      for (const k of [-1, 1]) { ell(ctx, bx - r * 0.1 + k * r * 0.22, y - r * 0.72, r * 0.08, r * 0.15, k * 0.35); paint(ctx, '#9a6a3a', '#5e3f20', ow); }
      line(ctx, [bx - r * 0.3, y - r * 0.5, bx + r * 0.1, y - r * 0.5], '#c0453f', r * 0.06);
      face(ctx, bx - r * 0.1, y - r * 0.72, r * 0.24, { ink: '#2a1a10', nose: '#2a1a10', cheek: 'rgba(240,120,110,0.45)' });
      ctx.restore();
    },
  },

  // Barnaby: an old badger in a yellow sou'wester and a navy fisherman's jumper, sat on a crate with his rod.
  barnaby: {
    box: [-0.85, -2.65, 2.15, 0.12],
    tip: [2.0, -2.5], // rod tip (r units from the feet): the live line drops from here to the water
    paint(ctx, x, y, r) {
      const ow = OW(r);
      ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      // crate
      rrect(ctx, x - r * 0.55, y - r * 0.62, r * 1.1, r * 0.62, r * 0.05); paint(ctx, shade(ctx, x, y - r * 0.3, r * 0.6, '#d6a46e', '#b07a46', '#7a5028'), '#5a3a1c', ow);
      ctx.strokeStyle = 'rgba(90,58,28,0.6)'; ctx.lineWidth = ow;
      ctx.beginPath(); ctx.moveTo(x - r * 0.55, y - r * 0.31); ctx.lineTo(x + r * 0.55, y - r * 0.31); ctx.stroke();
      // tin mug by the crate
      rrect(ctx, x - r * 0.86, y - r * 0.26, r * 0.2, r * 0.26, r * 0.03); paint(ctx, '#dfe6ea', '#6a7a84', ow * 0.8);
      // legs and boots
      for (const k of [-1, 1]) {
        ell(ctx, x + k * r * 0.22 + r * 0.12, y - r * 0.68, r * 0.22, r * 0.13); paint(ctx, '#55606e', '#2e3640', ow);
        rrect(ctx, x + k * r * 0.22 + r * 0.2, y - r * 0.7, r * 0.18, r * 0.66, r * 0.06); paint(ctx, '#3a4450', '#20262e', ow);
        ell(ctx, x + k * r * 0.22 + r * 0.34, y - r * 0.05, r * 0.2, r * 0.09); paint(ctx, '#2c3a2c', '#161e16', ow);
      }
      // rod (held out over the water)
      line(ctx, [x + r * 0.2, y - r * 0.9, x + r * 2.0, y - r * 2.5], '#6e4529', r * 0.07);
      circle(ctx, x + r * 0.42, y - r * 1.06, r * 0.09); paint(ctx, '#9aa4ae', '#4a545e', ow * 0.8);
      // body: navy jumper with ribs
      ell(ctx, x, y - r * 1.12, r * 0.56, r * 0.52); paint(ctx, shade(ctx, x, y - r * 1.12, r * 0.56, '#5a7aa6', '#36507a', '#1f3150'), '#18253c', ow);
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = ow * 0.8;
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x + i * r * 0.15, y - r * 1.5); ctx.lineTo(x + i * r * 0.17, y - r * 0.68); ctx.stroke(); }
      for (const k of [-1, 1]) { ell(ctx, x + k * r * 0.24 + r * 0.14, y - r * 0.98, r * 0.12, r * 0.1); paint(ctx, '#8c8c8c', '#4a4a4a', ow); }
      // head: grey with the white stripe and dark eye bands
      for (const k of [-1, 1]) { circle(ctx, x + k * r * 0.36, y - r * 2.0, r * 0.1); paint(ctx, '#5c5c5c', '#2e2e2e', ow); }
      ell(ctx, x, y - r * 1.75, r * 0.46, r * 0.42); paint(ctx, shade(ctx, x, y - r * 1.75, r * 0.46, '#c9c9c9', '#9a9a9a', '#686868'), '#3a3a3a', ow);
      for (const k of [-1, 1]) { ell(ctx, x + k * r * 0.18, y - r * 1.8, r * 0.13, r * 0.3, k * -0.35); ctx.fillStyle = '#2f2f2f'; ctx.fill(); }
      ell(ctx, x, y - r * 1.78, r * 0.1, r * 0.36); ctx.fillStyle = '#f5f2ec'; ctx.fill();
      ell(ctx, x, y - r * 1.55, r * 0.22, r * 0.14); ctx.fillStyle = '#f5f2ec'; ctx.fill();
      // white whiskery beard
      ctx.beginPath(); ctx.moveTo(x - r * 0.24, y - r * 1.5); ctx.quadraticCurveTo(x, y - r * 1.28, x + r * 0.24, y - r * 1.5); ctx.quadraticCurveTo(x, y - r * 1.42, x - r * 0.24, y - r * 1.5);
      ctx.fillStyle = '#ffffff'; ctx.fill();
      face(ctx, x, y - r * 1.82, r * 0.42, { eyes: 'happy', nose: '#2a1a10', ink: '#f8f4ee', cheek: 'rgba(240,120,110,0.35)', mouth: 'none' });
      // sou'wester hat
      ctx.beginPath(); ctx.moveTo(x - r * 0.62, y - r * 1.98); ctx.quadraticCurveTo(x, y - r * 1.78, x + r * 0.62, y - r * 1.98);
      ctx.quadraticCurveTo(x + r * 0.42, y - r * 2.08, x + r * 0.34, y - r * 2.1);
      ctx.quadraticCurveTo(x + r * 0.3, y - r * 2.5, x, y - r * 2.5); ctx.quadraticCurveTo(x - r * 0.3, y - r * 2.5, x - r * 0.34, y - r * 2.1);
      ctx.quadraticCurveTo(x - r * 0.42, y - r * 2.08, x - r * 0.62, y - r * 1.98); ctx.closePath();
      paint(ctx, shade(ctx, x, y - r * 2.2, r * 0.5, '#ffe9a0', '#f2c440', '#c6941c'), '#8a6410', ow);
      ctx.restore();
    },
  },

  // Juniper: a tall hare in a teal running top and a pink headband, stretching one arm up, a water bottle in hand.
  juniper: {
    box: [-0.75, -3.25, 0.95, 0.12],
    paint(ctx, x, y, r) {
      const ow = OW(r), ln = '#6a4a2c';
      const fur = (cx, cy, rr) => shade(ctx, cx, cy, rr, '#ead0a8', '#c99b68', '#94683c');
      ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      // legs and trainers
      for (const k of [-1, 1]) {
        rrect(ctx, x + k * r * 0.2 - r * 0.09, y - r * 0.9, r * 0.18, r * 0.86, r * 0.08); paint(ctx, fur(x + k * r * 0.2, y - r * 0.5, r * 0.3), ln, ow);
        ell(ctx, x + k * r * 0.24, y - r * 0.06, r * 0.18, r * 0.09); paint(ctx, '#ffffff', '#5a6a7a', ow);
        line(ctx, [x + k * r * 0.24 - r * 0.12, y - r * 0.04, x + k * r * 0.24 + r * 0.12, y - r * 0.04], '#ef7f6a', r * 0.04);
      }
      // shorts
      rrect(ctx, x - r * 0.36, y - r * 1.06, r * 0.72, r * 0.3, r * 0.08); paint(ctx, '#2f4a6a', '#1c2e44', ow);
      // body: running top
      ell(ctx, x, y - r * 1.38, r * 0.38, r * 0.42); paint(ctx, shade(ctx, x, y - r * 1.38, r * 0.42, '#9ff0e0', '#3fbfa8', '#22806e'), '#1b6456', ow);
      line(ctx, [x - r * 0.3, y - r * 1.38, x + r * 0.3, y - r * 1.38], 'rgba(255,255,255,0.6)', r * 0.05);
      // arm stretching up, and the other holding a water bottle
      line(ctx, [x + r * 0.28, y - r * 1.62, x + r * 0.62, y - r * 2.3], ln, r * 0.16);
      line(ctx, [x + r * 0.28, y - r * 1.62, x + r * 0.62, y - r * 2.3], '#c99b68', r * 0.1);
      circle(ctx, x + r * 0.64, y - r * 2.36, r * 0.08); paint(ctx, '#c99b68', ln, ow);
      line(ctx, [x - r * 0.3, y - r * 1.6, x - r * 0.48, y - r * 1.12], ln, r * 0.16);
      line(ctx, [x - r * 0.3, y - r * 1.6, x - r * 0.48, y - r * 1.12], '#c99b68', r * 0.1);
      rrect(ctx, x - r * 0.6, y - r * 1.3, r * 0.2, r * 0.38, r * 0.06); paint(ctx, '#bfe6ff', '#4a7a9a', ow * 0.8);
      rrect(ctx, x - r * 0.56, y - r * 1.38, r * 0.12, r * 0.09, r * 0.03); paint(ctx, '#ef7f6a', '#9a3f30', ow * 0.6);
      // ears: tall, black tipped
      for (const k of [-1, 1]) {
        ell(ctx, x + k * r * 0.17, y - r * 2.62, r * 0.12, r * 0.5, k * 0.12); paint(ctx, fur(x + k * r * 0.17, y - r * 2.62, r * 0.45), ln, ow);
        ell(ctx, x + k * r * 0.17, y - r * 2.6, r * 0.055, r * 0.36, k * 0.12); ctx.fillStyle = '#f0b8a8'; ctx.fill();
        ctx.save(); ell(ctx, x + k * r * 0.17, y - r * 2.62, r * 0.12, r * 0.5, k * 0.12); ctx.clip();
        ctx.fillStyle = '#4a3020'; ctx.fillRect(x + k * r * 0.17 - r * 0.2, y - r * 3.2, r * 0.4, r * 0.24); ctx.restore();
      }
      // head + headband
      ell(ctx, x, y - r * 2.02, r * 0.36, r * 0.34); paint(ctx, fur(x, y - r * 2.02, r * 0.36), ln, ow);
      ell(ctx, x, y - r * 1.9, r * 0.18, r * 0.12); ctx.fillStyle = '#f6e6cc'; ctx.fill();
      ctx.save(); ell(ctx, x, y - r * 2.02, r * 0.36, r * 0.34); ctx.clip();
      ctx.fillStyle = '#ef6f9a'; ctx.fillRect(x - r * 0.4, y - r * 2.3, r * 0.8, r * 0.1); ctx.restore();
      face(ctx, x, y - r * 2.05, r * 0.34, { eyes: 'happy', nose: '#7a4030', ink: '#2a1a10', mouth: 'open' });
      ctx.restore();
    },
  },

  // Wren: a small fox cub in green dungarees, holding her kite string (the kite flies above, drawn live).
  wren: {
    box: [-0.9, -2.0, 0.85, 0.12],
    hand: [0.42, -1.2], // where the kite string starts
    paint(ctx, x, y, r) {
      const ow = OW(r), ln = '#7a3a18';
      const fur = (cx, cy, rr) => shade(ctx, cx, cy, rr, '#ffc890', '#ee8a3e', '#b85a1c');
      ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      // bushy tail
      ctx.beginPath(); ctx.moveTo(x - r * 0.2, y - r * 0.4);
      ctx.quadraticCurveTo(x - r * 0.95, y - r * 0.3, x - r * 0.82, y - r * 1.05);
      ctx.quadraticCurveTo(x - r * 0.6, y - r * 0.7, x - r * 0.12, y - r * 0.62); ctx.closePath();
      paint(ctx, fur(x - r * 0.6, y - r * 0.6, r * 0.5), ln, ow);
      ell(ctx, x - r * 0.82, y - r * 0.98, r * 0.12, r * 0.1, -0.6); ctx.fillStyle = '#fff8ee'; ctx.fill();
      // feet
      for (const k of [-1, 1]) { ell(ctx, x + k * r * 0.17, y - r * 0.06, r * 0.13, r * 0.08); paint(ctx, '#5a3020', '#2e180c', ow); }
      // dungarees body
      ell(ctx, x, y - r * 0.52, r * 0.4, r * 0.46); paint(ctx, shade(ctx, x, y - r * 0.52, r * 0.42, '#a6dc8a', '#5fae4a', '#3a7a2c'), '#2c5e20', ow);
      ell(ctx, x, y - r * 0.82, r * 0.2, r * 0.13); ctx.fillStyle = '#fff8ee'; ctx.fill();
      ctx.fillStyle = '#f2d04a'; for (const k of [-1, 1]) { circle(ctx, x + k * r * 0.16, y - r * 0.72, r * 0.035); ctx.fill(); }
      // arms: one up holding the string spool
      line(ctx, [x + r * 0.26, y - r * 0.78, x + r * 0.42, y - r * 1.16], ln, r * 0.14);
      line(ctx, [x + r * 0.26, y - r * 0.78, x + r * 0.42, y - r * 1.16], '#ee8a3e', r * 0.08);
      ell(ctx, x + r * 0.43, y - r * 1.2, r * 0.1, r * 0.06, 0.5); paint(ctx, '#d6a46e', '#6e4529', ow * 0.8);
      ell(ctx, x - r * 0.36, y - r * 0.6, r * 0.09, r * 0.12); paint(ctx, '#ee8a3e', ln, ow);
      // ears
      for (const k of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(x + k * r * 0.12, y - r * 1.4); ctx.lineTo(x + k * r * 0.36, y - r * 1.82); ctx.lineTo(x + k * r * 0.42, y - r * 1.3); ctx.closePath();
        paint(ctx, fur(x + k * r * 0.3, y - r * 1.5, r * 0.3), ln, ow);
        ctx.beginPath(); ctx.moveTo(x + k * r * 0.2, y - r * 1.42); ctx.lineTo(x + k * r * 0.34, y - r * 1.68); ctx.lineTo(x + k * r * 0.37, y - r * 1.38); ctx.closePath(); ctx.fillStyle = '#4a2a18'; ctx.fill();
      }
      // head with the white cheeks
      ell(ctx, x, y - r * 1.2, r * 0.38, r * 0.33); paint(ctx, fur(x, y - r * 1.2, r * 0.38), ln, ow);
      ctx.beginPath(); ctx.moveTo(x - r * 0.36, y - r * 1.16); ctx.quadraticCurveTo(x, y - r * 0.82, x + r * 0.36, y - r * 1.16); ctx.quadraticCurveTo(x, y - r * 1.04, x - r * 0.36, y - r * 1.16); ctx.fillStyle = '#fff8ee'; ctx.fill();
      face(ctx, x, y - r * 1.24, r * 0.34, { nose: '#2a1a10', ink: '#2a1a10', mouth: 'open' });
      ctx.restore();
    },
  },

  // Marguerite: a tabby cat in a red beret and a paint-dabbed smock at her easel (a little lighthouse on the canvas).
  marguerite: {
    box: [-1.45, -2.55, 0.95, 0.12],
    paint(ctx, x, y, r) {
      const ow = OW(r), ln = '#6a4428';
      const fur = (cx, cy, rr) => shade(ctx, cx, cy, rr, '#f2c890', '#d69a58', '#9a6430');
      ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      // easel (left)
      const ex = x - r * 0.88;
      line(ctx, [ex, y - r * 2.1, ex - r * 0.42, y], '#8a5a3a', r * 0.07);
      line(ctx, [ex, y - r * 2.1, ex + r * 0.4, y], '#8a5a3a', r * 0.07);
      line(ctx, [ex, y - r * 2.0, ex + r * 0.05, y - r * 0.2], '#6e4529', r * 0.06);
      rrect(ctx, ex - r * 0.5, y - r * 1.96, r * 1.0, r * 0.82, r * 0.03); paint(ctx, '#fffaf0', '#6e4529', ow);
      // the painting: dusk sky, sea, the lighthouse
      const g = ctx.createLinearGradient(0, y - r * 1.9, 0, y - r * 1.2);
      g.addColorStop(0, '#f6b98c'); g.addColorStop(1, '#f9e0b0');
      ctx.fillStyle = g; ctx.fillRect(ex - r * 0.44, y - r * 1.9, r * 0.88, r * 0.5);
      ctx.fillStyle = '#5f9ec4'; ctx.fillRect(ex - r * 0.44, y - r * 1.42, r * 0.88, r * 0.22);
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(ex + r * 0.04, y - r * 1.36); ctx.lineTo(ex + r * 0.1, y - r * 1.76); ctx.lineTo(ex + r * 0.2, y - r * 1.76); ctx.lineTo(ex + r * 0.26, y - r * 1.36); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#d9534a'; ctx.fillRect(ex + r * 0.08, y - r * 1.62, r * 0.16, r * 0.07); ctx.fillRect(ex + r * 0.09, y - r * 1.84, r * 0.14, r * 0.08);
      ctx.fillStyle = '#ffe58a'; circle(ctx, ex + r * 0.16, y - r * 1.8, r * 0.04); ctx.fill();
      // tail
      ctx.beginPath(); ctx.moveTo(x + r * 0.3, y - r * 0.3); ctx.quadraticCurveTo(x + r * 0.95, y - r * 0.3, x + r * 0.78, y - r * 1.0);
      ctx.strokeStyle = ln; ctx.lineWidth = r * 0.16; ctx.stroke(); ctx.strokeStyle = '#d69a58'; ctx.lineWidth = r * 0.1; ctx.stroke();
      // feet
      for (const k of [-1, 1]) { ell(ctx, x + k * r * 0.18, y - r * 0.06, r * 0.14, r * 0.08); paint(ctx, '#f2e4d0', ln, ow); }
      // smock
      ctx.beginPath(); ctx.moveTo(x - r * 0.3, y - r * 1.5); ctx.lineTo(x + r * 0.3, y - r * 1.5); ctx.lineTo(x + r * 0.5, y - r * 0.1); ctx.lineTo(x - r * 0.5, y - r * 0.1); ctx.closePath();
      paint(ctx, shade(ctx, x, y - r * 0.8, r * 0.6, '#ffffff', '#dfe8f2', '#a8b8cc'), '#5a6a80', ow);
      for (const [a, b, c] of [[-0.2, 0.6, '#e8706a'], [0.18, 0.9, '#5f9ec4'], [-0.05, 0.35, '#f2c84b'], [0.25, 0.42, '#6fb36a']]) { ctx.fillStyle = c; circle(ctx, x + a * r, y - b * r, r * 0.05); ctx.fill(); }
      // arm reaching to the canvas with a brush, palette in the other paw
      line(ctx, [x - r * 0.22, y - r * 1.3, x - r * 0.55, y - r * 1.42], '#5a6a80', r * 0.17);
      line(ctx, [x - r * 0.22, y - r * 1.3, x - r * 0.55, y - r * 1.42], '#dfe8f2', r * 0.11);
      line(ctx, [x - r * 0.56, y - r * 1.44, x - r * 0.78, y - r * 1.58], '#8a5a3a', r * 0.04);
      ctx.fillStyle = '#5f9ec4'; circle(ctx, x - r * 0.8, y - r * 1.6, r * 0.035); ctx.fill();
      ell(ctx, x + r * 0.42, y - r * 0.92, r * 0.24, r * 0.15, -0.3); paint(ctx, '#e8c08a', '#8a5a3a', ow);
      for (const [a, b, c] of [[0.34, 0.95, '#e8706a'], [0.46, 1.0, '#5f9ec4'], [0.52, 0.88, '#f2c84b']]) { ctx.fillStyle = c; circle(ctx, x + a * r, y - b * r, r * 0.04); ctx.fill(); }
      // head: tabby
      for (const k of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(x + k * r * 0.12, y - r * 2.04); ctx.lineTo(x + k * r * 0.36, y - r * 2.34); ctx.lineTo(x + k * r * 0.4, y - r * 1.9); ctx.closePath();
        paint(ctx, fur(x + k * r * 0.3, y - r * 2.1, r * 0.3), ln, ow);
      }
      ell(ctx, x, y - r * 1.8, r * 0.4, r * 0.35); paint(ctx, fur(x, y - r * 1.8, r * 0.4), ln, ow);
      ctx.strokeStyle = 'rgba(122,74,34,0.75)'; ctx.lineWidth = r * 0.04;
      for (const d of [-0.1, 0, 0.1]) { ctx.beginPath(); ctx.moveTo(x + d * r, y - r * 2.12); ctx.lineTo(x + d * r * 0.8, y - r * 1.98); ctx.stroke(); }
      ell(ctx, x, y - r * 1.68, r * 0.2, r * 0.13); ctx.fillStyle = '#fbefdc'; ctx.fill();
      face(ctx, x, y - r * 1.82, r * 0.36, { nose: '#d9748a', ink: '#2a1a10' });
      // beret
      ell(ctx, x - r * 0.05, y - r * 2.12, r * 0.36, r * 0.14, -0.15); paint(ctx, shade(ctx, x, y - r * 2.15, r * 0.4, '#f08070', '#c8463c', '#8e2a24'), '#6e1e1a', ow);
      line(ctx, [x - r * 0.05, y - r * 2.26, x - r * 0.02, y - r * 2.34], '#6e1e1a', r * 0.05);
      ctx.restore();
    },
  },
};

export const VISITOR_ART_IDS = Object.keys(ART);

/** Paint visitor `id` with its feet at (x, y), size r (no cache: postcards, tests). Unknown ids paint nothing. */
export function paintVisitor(ctx, id, x, y, r) { const a = ART[id]; if (a) a.paint(ctx, x, y, r); }

/** The visitor's bounds around its feet, in world units at size r: [x0, y0, x1, y1] (for taps and culling). */
export function visitorBox(id, x, y, r = VISITOR_R) {
  const a = ART[id];
  if (!a) return null;
  const [x0, y0, x1, y1] = a.box;
  return [x + x0 * r, y + y0 * r, x + x1 * r, y + y1 * r];
}

// ------------------------------------------------------------------ cached sprites + the live idle
const CACHE = new Map();
const CACHE_MAX = 24;

function sprite(ctx, id, r) {
  if (typeof document === 'undefined' || typeof ctx.getTransform !== 'function') return null;
  const m = ctx.getTransform();
  const px = r * Math.hypot(m.a, m.b);
  if (!(px >= 3) || px > 300) return null;
  const q = Math.pow(2, Math.ceil(Math.log2(px) * 4) / 4); // ~19% size buckets, rounded up (only ever scaled down)
  const key = id + '|' + q;
  let e = CACHE.get(key);
  if (e) { CACHE.delete(key); CACHE.set(key, e); return e; }
  const [x0, y0, x1, y1] = ART[id].box;
  const pad = 0.1;
  const w = Math.ceil((x1 - x0 + pad * 2) * q), h = Math.ceil((y1 - y0 + pad * 2) * q);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  ART[id].paint(c.getContext('2d'), (-x0 + pad) * q, (-y0 + pad) * q, q);
  e = { canvas: c, q, ox: x0 - pad, oy: y0 - pad, w: w / q, h: h / q };
  CACHE.set(key, e);
  if (CACHE.size > CACHE_MAX) CACHE.delete(CACHE.keys().next().value);
  return e;
}

// Per-visitor idle: a slow breath (squash from the feet), a small sway, and a phase so they don't move in step.
const IDLE = {
  hazel: { breathe: 0.014, sway: 0.0, speed: 1.1, ph: 0.0 },
  bookclub: { breathe: 0.012, sway: 0.012, speed: 0.9, ph: 1.3 },
  ducks: { breathe: 0.01, sway: 0.02, speed: 1.4, ph: 2.1 },
  barnaby: { breathe: 0.012, sway: 0.0, speed: 0.8, ph: 0.7 },
  juniper: { breathe: 0.0, sway: 0.0, bounce: 0.045, speed: 2.2, ph: 0.4 },
  wren: { breathe: 0.01, sway: 0.025, speed: 1.6, ph: 2.8 },
  marguerite: { breathe: 0.012, sway: 0.015, speed: 1.0, ph: 1.9 },
};

/** The live bits a visitor needs in world units: where the kite / float is now (for the string and line). */
function kitePos(x, y, r, t) {
  return { kx: x + r * (1.15 + 0.22 * Math.sin(t * 0.9)), ky: y - r * (3.55 + 0.18 * Math.cos(t * 1.3)), rot: 0.18 * Math.sin(t * 1.1) };
}

function paintKite(ctx, x, y, s, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * 0.72, 0); ctx.lineTo(0, s * 1.15); ctx.lineTo(-s * 0.72, 0); ctx.closePath();
  paint(ctx, shade(ctx, 0, 0, s, '#fff2a8', '#f6c445', '#d08a1c'), '#8a5a10', Math.max(1, s * 0.07));
  ctx.strokeStyle = 'rgba(138,90,16,0.55)'; ctx.lineWidth = Math.max(1, s * 0.05);
  ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(0, s * 1.15); ctx.moveTo(-s * 0.72, 0); ctx.lineTo(s * 0.72, 0); ctx.stroke();
  // the fish
  ctx.fillStyle = '#4f8fc4';
  ctx.beginPath(); ctx.ellipse(0, s * 0.18, s * 0.28, s * 0.15, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(s * 0.24, s * 0.18); ctx.lineTo(s * 0.44, s * 0.04); ctx.lineTo(s * 0.44, s * 0.32); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffffff'; circle(ctx, -s * 0.13, s * 0.15, s * 0.04); ctx.fill();
  // tail ribbons
  ctx.strokeStyle = '#e8706a'; ctx.lineWidth = Math.max(1, s * 0.08); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, s * 1.15); ctx.quadraticCurveTo(-s * 0.3, s * 1.5, 0, s * 1.8); ctx.quadraticCurveTo(s * 0.3, s * 2.1, 0, s * 2.4); ctx.stroke();
  ctx.restore();
}

/**
 * Draw visitor `id` at its feet (x, y), world units, at time t (seconds). opts: { r, reduced, hop (0..1 tap hop),
 * waiting (a story beat is ready: three soft dots above), waterY (where Barnaby's line meets the sea) }.
 * Returns nothing; everything is a blit or a few strokes.
 */
export function drawVisitor(ctx, id, x, y, t, opts = {}) {
  const a = ART[id];
  if (!a) return;
  const r = opts.r || VISITOR_R;
  const I = IDLE[id] || IDLE.hazel;
  const tt = opts.reduced ? 0 : t * I.speed + I.ph;
  const breathe = 1 + I.breathe * Math.sin(tt * 1.6);
  const sway = I.sway * Math.sin(tt * 0.8);
  const bounce = I.bounce ? -Math.abs(Math.sin(tt)) * I.bounce * r : 0;
  const hop = opts.hop ? -Math.sin(Math.min(1, opts.hop) * PI) * r * 0.22 : 0;
  // shadow
  const [x0, , x1] = a.box;
  ctx.save(); ctx.globalAlpha = 0.2; ctx.fillStyle = '#4a2c1c';
  ell(ctx, x + (x0 + x1) * 0.5 * r * 0.6, y + 2, (x1 - x0) * r * 0.42, r * 0.16); ctx.fill(); ctx.restore();
  // live bits behind the body: kite string and the fishing line
  if (id === 'wren') {
    const k = kitePos(x, y, r, tt);
    const hx = x + a.hand[0] * r, hy = y + a.hand[1] * r + hop + bounce;
    ctx.save(); ctx.strokeStyle = 'rgba(90,70,60,0.75)'; ctx.lineWidth = Math.max(0.8, r * 0.025);
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.quadraticCurveTo(hx + r * 0.9, hy - r * 0.6, k.kx, k.ky + r * 0.3); ctx.stroke(); ctx.restore();
    paintKite(ctx, k.kx, k.ky, r * 0.3, k.rot);
  }
  if (id === 'barnaby') {
    const tx = x + a.tip[0] * r, ty = y + a.tip[1] * r;
    const wy = (opts.waterY != null ? opts.waterY : y + r * 3) + (opts.reduced ? 0 : Math.sin(tt * 2.2) * r * 0.04);
    const fx = tx + r * 0.25;
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = Math.max(0.8, r * 0.02);
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo(tx + r * 0.35, ty + (wy - ty) * 0.4, fx, wy - r * 0.08); ctx.stroke();
    // the float, with a soft ring on the water
    ctx.globalAlpha = 0.5; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(0.8, r * 0.025);
    const ring = opts.reduced ? 0.5 : (tt * 0.5) % 1;
    ell(ctx, fx, wy + r * 0.02, r * (0.12 + ring * 0.25), r * (0.03 + ring * 0.06)); ctx.stroke();
    ctx.globalAlpha = 1;
    circle(ctx, fx, wy - r * 0.06, r * 0.07); paint(ctx, '#e8504a', '#7a1e1a', Math.max(0.8, r * 0.02));
    ctx.fillStyle = '#ffffff'; ctx.fillRect(fx - r * 0.07, wy - r * 0.07, r * 0.14, r * 0.035);
    ctx.restore();
  }
  // the body: a cached bitmap (or painted directly where there is no DOM)
  ctx.save();
  ctx.translate(x, y + hop + bounce);
  if (sway) ctx.rotate(sway);
  ctx.scale(1, breathe);
  const sp = sprite(ctx, id, r);
  if (sp) ctx.drawImage(sp.canvas, sp.ox * r, sp.oy * r, sp.w * r, sp.h * r);
  else a.paint(ctx, 0, 0, r);
  ctx.restore();
  // "story waiting": three soft dots in a little bubble above the head
  if (opts.waiting) {
    const top = y + a.box[1] * r;
    const bx = x + (a.box[0] + a.box[2]) * 0.5 * r + r * 0.2, by = top - r * 0.32 + (opts.reduced ? 0 : Math.sin(t * 2.2) * r * 0.06);
    ctx.save();
    rrect(ctx, bx - r * 0.42, by - r * 0.24, r * 0.84, r * 0.48, r * 0.24);
    paint(ctx, '#fffaf2', '#a8785a', Math.max(1, r * 0.04));
    ctx.beginPath(); ctx.moveTo(bx - r * 0.12, by + r * 0.22); ctx.lineTo(bx - r * 0.22, by + r * 0.42); ctx.lineTo(bx + r * 0.04, by + r * 0.23); ctx.closePath();
    ctx.fillStyle = '#fffaf2'; ctx.fill();
    ctx.fillStyle = '#b5546a';
    for (let i = -1; i <= 1; i++) {
      const s = opts.reduced ? 1 : 0.75 + 0.25 * Math.max(0, Math.sin(t * 4 - i * 0.9));
      circle(ctx, bx + i * r * 0.22, by, r * 0.065 * s); ctx.fill();
    }
    ctx.restore();
  }
}

// ------------------------------------------------------------------ postcard illustrations
// The painted picture on each visitor's postcard: a little scene in the box (x, y, w, h), the visitor in it.
const SCENES = {
  hazel: { sky: ['#cfe8f6', '#fdf1dc'], sea: '#7fb8d6', sun: '#ffe8a8', motif: 'scarf' },
  bookclub: { sky: ['#f6e3c8', '#fbf1e2'], sea: null, sun: null, motif: 'guestbook' },
  ducks: { sky: ['#d6ecd0', '#fbf3e0'], sea: null, sun: '#fff1b8', motif: 'gate' },
  barnaby: { sky: ['#2d3f6e', '#7c79a8'], sea: '#2c4e74', sun: null, motif: 'lantern' },
  juniper: { sky: ['#bfe3f2', '#fdf1dc'], sea: '#78b4d0', sun: '#ffe8a8', motif: 'bunting' },
  wren: { sky: ['#a8d8f0', '#f2f9fd'], sea: '#78b4d0', sun: '#fff1b8', motif: 'clouds' },
  marguerite: { sky: ['#f4a27a', '#fbe0b0'], sea: '#5f8fb4', sun: '#ffd27a', motif: 'lighthouse' },
};

function lighthouse(ctx, x, y, h, lit) {
  const w = h * 0.22;
  ctx.save(); ctx.lineJoin = 'round';
  if (lit) {
    ctx.globalAlpha = 0.35; ctx.fillStyle = '#fff3b0';
    ctx.beginPath(); ctx.moveTo(x, y - h * 0.9); ctx.lineTo(x - h * 1.4, y - h * 1.15); ctx.lineTo(x - h * 1.4, y - h * 0.68); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x, y - h * 0.9); ctx.lineTo(x + h * 1.4, y - h * 1.15); ctx.lineTo(x + h * 1.4, y - h * 0.68); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.beginPath(); ctx.moveTo(x - w * 0.6, y); ctx.lineTo(x - w * 0.4, y - h * 0.8); ctx.lineTo(x + w * 0.4, y - h * 0.8); ctx.lineTo(x + w * 0.6, y); ctx.closePath();
  paint(ctx, '#fbf7ee', '#6b4a3a', Math.max(1, h * 0.012));
  ctx.fillStyle = '#d9534a';
  ctx.fillRect(x - w * 0.52, y - h * 0.3, w * 1.04, h * 0.1); ctx.fillRect(x - w * 0.46, y - h * 0.58, w * 0.92, h * 0.1);
  rrect(ctx, x - w * 0.42, y - h * 0.98, w * 0.84, h * 0.18, h * 0.02); paint(ctx, lit ? '#ffe58a' : '#cfe0ea', '#6b4a3a', Math.max(1, h * 0.012));
  ctx.beginPath(); ctx.moveTo(x - w * 0.5, y - h * 0.98); ctx.lineTo(x, y - h * 1.1); ctx.lineTo(x + w * 0.5, y - h * 0.98); ctx.closePath(); paint(ctx, '#d9534a', '#6b4a3a', Math.max(1, h * 0.012));
  ctx.restore();
}

function motif(ctx, kind, X, Y, W, H) {
  const u = H / 100;
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (kind === 'scarf') { // a long blue scarf on a line, pegged
    line(ctx, [X + W * 0.05, Y + 18 * u, X + W * 0.95, Y + 24 * u], '#8a6a50', 0.6 * u);
    ctx.beginPath(); ctx.moveTo(X + W * 0.55, Y + 21 * u); ctx.quadraticCurveTo(X + W * 0.7, Y + 30 * u, X + W * 0.88, Y + 23 * u);
    ctx.lineTo(X + W * 0.87, Y + 52 * u); ctx.lineTo(X + W * 0.82, Y + 50 * u); ctx.lineTo(X + W * 0.83, Y + 31 * u); ctx.quadraticCurveTo(X + W * 0.7, Y + 37 * u, X + W * 0.6, Y + 30 * u);
    ctx.lineTo(X + W * 0.6, Y + 55 * u); ctx.lineTo(X + W * 0.55, Y + 54 * u); ctx.closePath();
    paint(ctx, '#4f8fc4', '#2c5578', 0.6 * u);
    ctx.fillStyle = '#ffffff'; for (const fx of [0.575, 0.845]) for (let i = 0; i < 3; i++) { circle(ctx, X + W * fx, Y + (40 + i * 4) * u, 0.7 * u); ctx.fill(); }
  } else if (kind === 'guestbook') { // window and a guestbook on a shelf
    rrect(ctx, X + W * 0.6, Y + 8 * u, W * 0.32, 44 * u, 2 * u); paint(ctx, '#bfe0f0', '#8a6a50', 0.8 * u);
    line(ctx, [X + W * 0.76, Y + 8 * u, X + W * 0.76, Y + 52 * u], '#8a6a50', 0.8 * u);
    line(ctx, [X + W * 0.6, Y + 30 * u, X + W * 0.92, Y + 30 * u], '#8a6a50', 0.8 * u);
    ctx.fillStyle = '#7fb8d6'; ctx.fillRect(X + W * 0.605, Y + 40 * u, W * 0.31, 11 * u);
    rrect(ctx, X + W * 0.06, Y + 50 * u, W * 0.36, 3 * u, 1 * u); paint(ctx, '#b07a46', '#6e4529', 0.6 * u);
    ctx.beginPath(); ctx.moveTo(X + W * 0.24, Y + 50 * u); ctx.lineTo(X + W * 0.1, Y + 47 * u); ctx.lineTo(X + W * 0.1, Y + 36 * u); ctx.lineTo(X + W * 0.24, Y + 39 * u); ctx.closePath(); paint(ctx, '#fffaf0', '#8a6a50', 0.6 * u);
    ctx.beginPath(); ctx.moveTo(X + W * 0.24, Y + 50 * u); ctx.lineTo(X + W * 0.38, Y + 47 * u); ctx.lineTo(X + W * 0.38, Y + 36 * u); ctx.lineTo(X + W * 0.24, Y + 39 * u); ctx.closePath(); paint(ctx, '#fffaf0', '#8a6a50', 0.6 * u);
    ctx.font = `italic 600 ${3.2 * u}px ${SERIF}`; ctx.fillStyle = '#5a3a2a'; ctx.textAlign = 'center';
    ctx.fillText('R. Two scones.', X + W * 0.31, Y + 43 * u);
  } else if (kind === 'gate') { // the garden gate with a glove on the post, roses along it
    ctx.fillStyle = '#e8706a'; for (let i = 0; i < 9; i++) { circle(ctx, X + W * (0.52 + i * 0.05), Y + (60 + Math.sin(i) * 3) * u, 2.2 * u); ctx.fill(); }
    ctx.fillStyle = '#5f9a4a'; for (let i = 0; i < 9; i++) { circle(ctx, X + W * (0.54 + i * 0.05), Y + (65 + Math.cos(i) * 2) * u, 2.6 * u); ctx.fill(); }
    for (let i = 0; i < 6; i++) { rrect(ctx, X + W * (0.6 + i * 0.055), Y + 38 * u, W * 0.025, 34 * u, 1 * u); paint(ctx, '#fbf7ee', '#8a6a50', 0.5 * u); }
    line(ctx, [X + W * 0.59, Y + 46 * u, X + W * 0.92, Y + 46 * u], '#8a6a50', 1.2 * u);
    line(ctx, [X + W * 0.59, Y + 62 * u, X + W * 0.92, Y + 62 * u], '#8a6a50', 1.2 * u);
    ctx.beginPath(); ctx.moveTo(X + W * 0.6, Y + 32 * u); ctx.lineTo(X + W * 0.66, Y + 30 * u); ctx.lineTo(X + W * 0.67, Y + 38 * u); ctx.lineTo(X + W * 0.6, Y + 40 * u); ctx.closePath(); paint(ctx, '#e07d93', '#8e3f53', 0.6 * u);
  } else if (kind === 'lantern') { // night: stars, the lighthouse lamp, a boat coming home
    const rnd = (i) => ((Math.sin(i * 91.7) + 1) * 43758.5) % 1;
    ctx.fillStyle = '#fff6d0'; for (let i = 0; i < 28; i++) { circle(ctx, X + rnd(i) * W, Y + rnd(i + 50) * 34 * u, (0.3 + rnd(i + 90) * 0.5) * u); ctx.fill(); }
    lighthouse(ctx, X + W * 0.78, Y + 60 * u, 40 * u, true);
    ctx.beginPath(); ctx.moveTo(X + W * 0.28, Y + 66 * u); ctx.lineTo(X + W * 0.42, Y + 66 * u); ctx.lineTo(X + W * 0.39, Y + 70 * u); ctx.lineTo(X + W * 0.3, Y + 70 * u); ctx.closePath(); paint(ctx, '#d6a46e', '#3a2a1a', 0.5 * u);
    line(ctx, [X + W * 0.35, Y + 66 * u, X + W * 0.35, Y + 54 * u], '#3a2a1a', 0.6 * u);
    ctx.beginPath(); ctx.moveTo(X + W * 0.355, Y + 55 * u); ctx.lineTo(X + W * 0.41, Y + 64 * u); ctx.lineTo(X + W * 0.355, Y + 64 * u); ctx.closePath(); paint(ctx, '#fbf7ee', '#3a2a1a', 0.4 * u);
  } else if (kind === 'bunting') { // finish line bunting
    ctx.strokeStyle = '#8a6a50'; ctx.lineWidth = 0.5 * u;
    ctx.beginPath(); ctx.moveTo(X, Y + 14 * u); ctx.quadraticCurveTo(X + W * 0.5, Y + 26 * u, X + W, Y + 14 * u); ctx.stroke();
    const cols = ['#e8706a', '#f2c84b', '#5f9ec4', '#6fb36a', '#e07d93'];
    for (let i = 0; i < 11; i++) {
      const fx = (i + 0.5) / 11, px = X + W * fx, py = Y + (14 + 12 * (1 - Math.pow(2 * fx - 1, 2))) * u;
      ctx.beginPath(); ctx.moveTo(px - 2.6 * u, py); ctx.lineTo(px + 2.6 * u, py); ctx.lineTo(px, py + 6 * u); ctx.closePath(); ctx.fillStyle = cols[i % 5]; ctx.fill();
    }
    ctx.font = `700 ${4.6 * u}px ${ROUND}`; ctx.fillStyle = '#3b2a20'; ctx.textAlign = 'center';
    rrect(ctx, X + W * 0.6, Y + 36 * u, W * 0.3, 9 * u, 1.5 * u); paint(ctx, '#fffaf0', '#8a6a50', 0.5 * u);
    ctx.fillStyle = '#3b2a20'; ctx.fillText('FINISH', X + W * 0.75, Y + 42.4 * u);
    line(ctx, [X + W * 0.62, Y + 45 * u, X + W * 0.62, Y + 70 * u], '#8a6a50', 0.8 * u);
    line(ctx, [X + W * 0.88, Y + 45 * u, X + W * 0.88, Y + 70 * u], '#8a6a50', 0.8 * u);
  } else if (kind === 'clouds') { // fluffy clouds and the kite touching one
    ctx.fillStyle = '#ffffff';
    for (const [cx, cy, s] of [[0.2, 16, 1], [0.72, 12, 1.3], [0.45, 30, 0.8]]) {
      for (const [dx, dy, rr] of [[-6, 2, 5], [0, -2, 7], [7, 1, 5.5], [13, 3, 4]]) { circle(ctx, X + W * cx + dx * s * u, Y + (cy + dy * s) * u, rr * s * u); ctx.fill(); }
    }
    paintKite(ctx, X + W * 0.78, Y + 22 * u, 7 * u, 0.25);
    ctx.strokeStyle = 'rgba(90,70,60,0.7)'; ctx.lineWidth = 0.4 * u;
    ctx.beginPath(); ctx.moveTo(X + W * 0.78, Y + 30 * u); ctx.quadraticCurveTo(X + W * 0.6, Y + 55 * u, X + W * 0.42, Y + 62 * u); ctx.stroke();
  } else if (kind === 'lighthouse') { // dusk lighthouse with its lamp lit
    lighthouse(ctx, X + W * 0.8, Y + 62 * u, 44 * u, true);
  }
  ctx.restore();
}

/** The painted picture on a visitor's postcard, in the box (X, Y, W, H) (canvas px). */
export function paintVisitorScene(ctx, id, X, Y, W, H) {
  const sc = SCENES[id] || SCENES.hazel;
  ctx.save();
  ctx.beginPath(); ctx.rect(X, Y, W, H); ctx.clip();
  const g = ctx.createLinearGradient(0, Y, 0, Y + H);
  g.addColorStop(0, sc.sky[0]); g.addColorStop(1, sc.sky[1]);
  ctx.fillStyle = g; ctx.fillRect(X, Y, W, H);
  if (sc.sun) { ctx.fillStyle = sc.sun; ctx.globalAlpha = 0.9; circle(ctx, X + W * 0.2, Y + H * 0.2, H * 0.09); ctx.fill(); ctx.globalAlpha = 1; }
  const horizon = Y + H * 0.66;
  if (sc.sea) {
    ctx.fillStyle = sc.sea; ctx.fillRect(X, horizon, W, H - (horizon - Y));
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = H * 0.006;
    for (let i = 0; i < 6; i++) { const yy = horizon + H * (0.04 + i * 0.05), xx = X + W * ((i * 0.37) % 1); ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx + W * 0.12, yy); ctx.stroke(); }
  } else {
    ctx.fillStyle = id === 'bookclub' ? '#d9b48a' : '#a8cf8a'; ctx.fillRect(X, horizon, W, H - (horizon - Y));
  }
  motif(ctx, sc.motif, X, Y, W, H);
  // the visitor, standing on the near ground
  const r = H * 0.2;
  const a = ART[id];
  const ground = Y + H * 0.94;
  ctx.fillStyle = id === 'barnaby' ? '#6e5a48' : id === 'bookclub' ? '#c49a6c' : sc.sea ? '#ecd9b0' : '#8fbf72';
  ctx.beginPath(); ctx.ellipse(X + W * 0.3, ground + H * 0.04, W * 0.42, H * 0.1, 0, 0, TAU); ctx.fill();
  if (a) a.paint(ctx, X + W * 0.3 - (a.box[0] + a.box[2]) * 0.5 * r, ground, r);
  if (id === 'barnaby') { // his line into the sea
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = H * 0.004;
    const tx = X + W * 0.3 - (a.box[0] + a.box[2]) * 0.5 * r + a.tip[0] * r, ty = ground + a.tip[1] * r;
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo(tx + r * 0.4, ty + r, tx + r * 0.35, horizon + H * 0.06); ctx.stroke();
  }
  ctx.restore();
}
