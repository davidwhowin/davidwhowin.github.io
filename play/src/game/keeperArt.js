// Procedural portraits of the Regulars (the Keepers): seaside café animal friends, led by Pip the sea otter.
// No images. Presentation only. Each Keeper is three layers: the body (`back`), an optional `front` overlay (the
// outfit) and a parametric face drawn from an expression (EXPRESSIONS in keeperAnim.js), so the same Keeper can blink,
// grin, cheer, look around and talk. Live motion lives in src/ui/keeperLive.js (Calm / reduce motion aware).
import { mulberry32 } from './rng.js';

const PI = Math.PI;
const TAU = PI * 2;

function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); }

function starPath(ctx, x, y, n, rOut, rIn, rot = -PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i * PI) / n;
    const rr = i % 2 ? rIn : rOut;
    if (i === 0) ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

function drop(ctx, x, y, s) { // a small water drop (sweat / tear)
  ctx.beginPath();
  ctx.moveTo(x, y - s * 1.3);
  ctx.quadraticCurveTo(x + s, y - s * 0.1, x + s * 0.75, y + s * 0.45);
  ctx.arc(x, y + s * 0.3, s * 0.78, 0.2, PI - 0.2);
  ctx.quadraticCurveTo(x - s, y - s * 0.1, x, y - s * 1.3);
  ctx.fill();
}

// ------------------------------------------------------------------ faces
// Expression -> face parts. 'base' = the Keeper's own neutral part (its personality).
//  eyes: dot (open, looks around, blinks) | arc (happy ^ ^) | closed (asleep) | star | wide | wink
//  mouth: smile | grin | cheer (open D) | o | oBig | wobble | frown | smirk | soft
//  brows: worried | up | proud | kind ; extra: sweat | tear
export const FACE_PARTS = {
  neutral:   { eyes: 'base', mouth: 'base' },
  blink:     { eyes: 'base', mouth: 'base', shut: true },
  happy:     { eyes: 'arc', mouth: 'smile' },
  grin:      { eyes: 'arc', mouth: 'grin' },
  cheer:     { eyes: 'arc', mouth: 'cheer' },
  starry:    { eyes: 'star', mouth: 'cheer' },
  surprised: { eyes: 'wide', mouth: 'oBig', brows: 'up' },
  worried:   { eyes: 'dot', mouth: 'wobble', brows: 'worried', extra: 'sweat' },
  sleepy:    { eyes: 'closed', mouth: 'o' },
  sad:       { eyes: 'dot', lid: 0.35, mouth: 'frown', brows: 'worried', extra: 'tear' },
  encourage: { eyes: 'dot', mouth: 'soft', brows: 'kind' },
  proud:     { eyes: 'dot', lid: 0.45, mouth: 'smirk', brows: 'proud', blush: 0.5 },
};

// how far a beak opens for each mouth shape (talking opens it further)
const BEAK_OPEN = { cheer: 0.75, oBig: 0.85, o: 0.5, grin: 0.35, smile: 0.12, soft: 0.08, smirk: 0.1, wobble: 0.04, frown: 0 };

/** A front-view beak at face (x, y), face radius r. b: { kind: 'gull' | 'hook', c1, c2, spot?, line, w, l, dy }. */
function drawBeak(ctx, x, y, r, b, open) {
  const bw = r * b.w, bl = r * b.l, by = y + r * b.dy, drop = open * bl * 0.35;
  ctx.lineWidth = Math.max(0.8, r * 0.035); ctx.strokeStyle = b.line;
  if (open > 0.05) { // the inside of the open beak
    ctx.fillStyle = '#7a2630';
    ctx.beginPath(); ctx.ellipse(x, by + bl * 0.5 + drop * 0.5, bw * 0.3, bl * 0.12 + drop * 0.6, 0, 0, TAU); ctx.fill();
  }
  // lower half
  ctx.fillStyle = b.c2;
  ctx.beginPath();
  ctx.moveTo(x - bw * 0.36, by + bl * 0.4 + drop);
  ctx.quadraticCurveTo(x, by + bl * 0.34 + drop, x + bw * 0.36, by + bl * 0.4 + drop);
  ctx.quadraticCurveTo(x + bw * 0.14, by + bl * 0.84 + drop, x, by + bl * 0.9 + drop);
  ctx.quadraticCurveTo(x - bw * 0.14, by + bl * 0.84 + drop, x - bw * 0.36, by + bl * 0.4 + drop);
  ctx.fill(); ctx.stroke();
  if (b.spot) { ctx.fillStyle = b.spot; ctx.beginPath(); ctx.ellipse(x, by + bl * 0.72 + drop, bw * 0.09, bl * 0.07, 0, 0, TAU); ctx.fill(); }
  // upper half
  ctx.fillStyle = b.c1;
  ctx.beginPath();
  ctx.moveTo(x - bw / 2, by);
  ctx.quadraticCurveTo(x, by - bl * 0.16, x + bw / 2, by);
  if (b.kind === 'hook') {
    ctx.quadraticCurveTo(x + bw * 0.42, by + bl * 0.55, x, by + bl * 0.8);
    ctx.quadraticCurveTo(x - bw * 0.42, by + bl * 0.55, x - bw / 2, by);
  } else {
    ctx.quadraticCurveTo(x + bw * 0.2, by + bl * 0.4, x, by + bl * 0.62);
    ctx.quadraticCurveTo(x - bw * 0.2, by + bl * 0.4, x - bw / 2, by);
  }
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath(); ctx.ellipse(x - bw * 0.16, by + bl * 0.1, bw * 0.1, bl * 0.06, -0.4, 0, TAU); ctx.fill();
}

const STILL = { eyeOpen: 1, lookX: 0, lookY: 0, mouthOpen: 0, blush: 0, t: 0 };

/**
 * A face centred at (x, y) for a face radius r. st: the Keeper's face style (ink, cheek, glasses and its
 * neutral eyes / lid / mouth). expr: expression id. pose: eyeOpen, lookX/Y, mouthOpen, blush, t (or STILL).
 */
function drawFace(ctx, x, y, r, st, expr, pose) {
  const parts = FACE_PARTS[expr] || FACE_PARTS.neutral;
  const eyes = parts.eyes === 'base' ? st.eyes : parts.eyes;
  const lid = parts.eyes === 'base' ? st.lid : (parts.lid || 0);
  const mouth = parts.mouth === 'base' ? st.mouth : parts.mouth;
  const open = parts.shut ? 0 : pose.eyeOpen;
  // the whole face turns a little toward where the Keeper looks; the eyes go further
  x += pose.lookX * r * 0.07; y += pose.lookY * r * 0.05;
  const ex = r * 0.3, ey = y - r * 0.02, er = r * 0.12;
  const lx = pose.lookX * er * 0.5, ly = pose.lookY * er * 0.4;
  const lw = Math.max(1.2, r * 0.07);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = st.ink; ctx.fillStyle = st.ink;
  ctx.lineWidth = lw;

  for (let s = -1; s <= 1; s += 2) {
    const cx = x + s * ex;
    let kind = eyes;
    if (kind === 'wink') kind = s < 0 ? 'dot' : 'arc';
    if (kind === 'arc') { ctx.beginPath(); ctx.arc(cx, ey + er * 0.5, er, 1.15 * PI, 1.85 * PI); ctx.stroke(); continue; }
    if (kind === 'closed') { ctx.beginPath(); ctx.arc(cx, ey - er * 0.2, er, 0.15 * PI, 0.85 * PI); ctx.stroke(); continue; }
    if (kind === 'star') {
      const tw = 1 + Math.sin(pose.t * 0.012 + s) * 0.1;
      ctx.fillStyle = '#fff2a0';
      starPath(ctx, cx + lx * 0.5, ey, 5, er * 1.45 * tw, er * 0.62 * tw, -PI / 2 + s * 0.15);
      ctx.fill();
      ctx.lineWidth = Math.max(1, r * 0.035); ctx.stroke(); ctx.lineWidth = lw;
      ctx.fillStyle = st.ink;
      continue;
    }
    const wide = kind === 'wide';
    const rx = er * (wide ? 1.0 : 0.85), ryFull = er * (wide ? 1.3 : 1.1);
    const o = open * (1 - lid);
    if (o < 0.16) { // blink: a soft closed line
      ctx.beginPath(); ctx.arc(cx + lx * 0.4, ey - er * 0.35, er * 0.9, 0.2 * PI, 0.8 * PI); ctx.stroke();
      continue;
    }
    const ry = ryFull * o;
    const ecx = cx + lx, ecy = ey + ly + (ryFull - ry) * 0.6; // lids come down from the top
    ctx.beginPath(); ctx.ellipse(ecx, ecy, rx, ry, 0, 0, TAU); ctx.fill();
    if (lid > 0.2) { // a heavy lid line (sleepy / proud)
      ctx.lineWidth = lw * 0.8;
      ctx.beginPath(); ctx.moveTo(ecx - rx * 1.25, ecy - ry * 0.85); ctx.lineTo(ecx + rx * 1.25, ecy - ry * 0.85); ctx.stroke();
      ctx.lineWidth = lw;
    }
    if (o > 0.45) {
      ctx.fillStyle = '#ffffff';
      circle(ctx, ecx - rx * 0.35, ecy - ry * 0.38, er * (wide ? 0.42 : 0.36)); ctx.fill();
      if (wide) { circle(ctx, ecx + rx * 0.35, ecy + ry * 0.35, er * 0.16); ctx.fill(); }
      ctx.fillStyle = st.ink;
    }
  }

  if (st.glasses) {
    ctx.lineWidth = Math.max(1, r * 0.045);
    ctx.strokeStyle = 'rgba(40,20,10,0.85)';
    circle(ctx, x - ex, ey, er * 1.9); ctx.stroke();
    circle(ctx, x + ex, ey, er * 1.9); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - ex + er * 1.9, ey); ctx.lineTo(x + ex - er * 1.9, ey); ctx.stroke();
    ctx.strokeStyle = st.ink; ctx.lineWidth = lw;
  }

  // brows
  const brows = parts.brows;
  if (brows) {
    ctx.lineWidth = lw * 0.8;
    const by = ey - er * (st.glasses ? 2.25 : 1.85);
    for (let s = -1; s <= 1; s += 2) {
      const cx = x + s * ex;
      ctx.beginPath();
      if (brows === 'worried') { ctx.moveTo(cx + s * er * 1.0, by + er * 0.25); ctx.lineTo(cx - s * er * 0.85, by - er * 0.45); }
      else if (brows === 'kind') { ctx.moveTo(cx + s * er * 1.0, by + er * 0.15); ctx.quadraticCurveTo(cx, by - er * 0.45, cx - s * er * 0.9, by - er * 0.2); }
      else if (brows === 'up') ctx.arc(cx, by + er * 0.2, er * 1.0, 1.2 * PI, 1.8 * PI);
      else ctx.arc(cx, by + er * 0.55, er * 0.95, 1.25 * PI, 1.75 * PI); // proud
      ctx.stroke();
    }
    ctx.lineWidth = lw;
  }

  // cheeks (brighter when proud / celebrating)
  const blush = Math.min(1, (parts.blush || 0) + pose.blush);
  ctx.fillStyle = st.cheek;
  const crx = r * 0.13 * (1 + blush * 0.25), cry = r * 0.08 * (1 + blush * 0.25);
  ctx.beginPath(); ctx.ellipse(x - r * 0.5, y + r * 0.2, crx, cry, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + r * 0.5, y + r * 0.2, crx, cry, 0, 0, TAU); ctx.fill();
  if (blush > 0.05) {
    ctx.globalAlpha *= blush * 0.7;
    ctx.beginPath(); ctx.ellipse(x - r * 0.5, y + r * 0.2, crx * 0.7, cry * 0.7, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + r * 0.5, y + r * 0.2, crx * 0.7, cry * 0.7, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha /= blush * 0.7;
  }

  // whiskers and nose (otter, seal, hedgehog, pup): flat shapes, part of the face so they follow its turn
  if (st.whiskers) {
    ctx.strokeStyle = st.whiskers; ctx.lineWidth = Math.max(0.75, r * 0.022);
    for (let s = -1; s <= 1; s += 2) {
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.moveTo(x + s * r * 0.26, y + r * (0.15 + k * 0.05));
        ctx.lineTo(x + s * r * 0.64, y + r * (0.06 + k * 0.1));
        ctx.stroke();
      }
    }
    ctx.lineWidth = lw;
  }
  if (st.nose) {
    const n = st.nose, nw = r * n.w, nh = r * n.h, ny = y + r * n.dy;
    ctx.fillStyle = n.c;
    ctx.beginPath();
    ctx.moveTo(x - nw / 2, ny);
    ctx.quadraticCurveTo(x, ny - nh * 0.45, x + nw / 2, ny);
    ctx.quadraticCurveTo(x + nw * 0.3, ny + nh, x, ny + nh);
    ctx.quadraticCurveTo(x - nw * 0.3, ny + nh, x - nw / 2, ny);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath(); ctx.ellipse(x - nw * 0.15, ny + nh * 0.1, nw * 0.14, nh * 0.16, 0, 0, TAU); ctx.fill();
  }

  // mouth (talking overrides it with a simple open/close flap); birds open and close their beak instead
  ctx.fillStyle = st.ink; ctx.strokeStyle = st.ink;
  const m = pose.mouthOpen;
  if (st.beak) drawBeak(ctx, x, y, r, st.beak, Math.max(m > 0.08 ? m : 0, BEAK_OPEN[mouth] || 0));
  const mdy = st.nose ? r * 0.06 : 0; // a nose pushes the mouth down a little
  if (mdy) ctx.translate(0, mdy);
  ctx.beginPath();
  if (st.beak) { /* the beak is the mouth */ }
  else if (m > 0.08) {
    ctx.ellipse(x, y + r * 0.22, r * 0.09, r * (0.03 + 0.08 * m), 0, 0, TAU); ctx.fill();
    if (m > 0.5) { ctx.fillStyle = '#ff7a9a'; ctx.beginPath(); ctx.ellipse(x, y + r * (0.22 + 0.06 * m), r * 0.05, r * 0.025, 0, 0, TAU); ctx.fill(); }
  } else if (mouth === 'o') { ctx.ellipse(x, y + r * 0.26, r * 0.07, r * 0.09, 0, 0, TAU); ctx.fill(); }
  else if (mouth === 'oBig') { ctx.ellipse(x, y + r * 0.27, r * 0.09, r * 0.12, 0, 0, TAU); ctx.fill(); }
  else if (mouth === 'grin') { ctx.arc(x, y + r * 0.14, r * 0.16, 0.1 * PI, 0.9 * PI); ctx.stroke(); }
  else if (mouth === 'cheer') {
    ctx.moveTo(x + r * 0.17, y + r * 0.15); ctx.arc(x, y + r * 0.15, r * 0.17, 0, PI); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff7a9a'; ctx.beginPath(); ctx.ellipse(x, y + r * 0.26, r * 0.08, r * 0.04, 0, 0, TAU); ctx.fill();
  } else if (mouth === 'wobble') {
    ctx.moveTo(x - r * 0.14, y + r * 0.27);
    ctx.quadraticCurveTo(x - r * 0.07, y + r * 0.2, x, y + r * 0.26);
    ctx.quadraticCurveTo(x + r * 0.07, y + r * 0.32, x + r * 0.14, y + r * 0.25);
    ctx.stroke();
  } else if (mouth === 'frown') { ctx.arc(x, y + r * 0.36, r * 0.12, 1.2 * PI, 1.8 * PI); ctx.stroke(); }
  else if (mouth === 'smirk') {
    ctx.moveTo(x - r * 0.12, y + r * 0.21); ctx.quadraticCurveTo(x + r * 0.02, y + r * 0.3, x + r * 0.15, y + r * 0.13); ctx.stroke();
  } else if (mouth === 'soft') { ctx.arc(x, y + r * 0.15, r * 0.1, 0.2 * PI, 0.8 * PI); ctx.stroke(); }
  else { ctx.arc(x, y + r * 0.16, r * 0.11, 0.15 * PI, 0.85 * PI); ctx.stroke(); } // smile
  if (mdy) ctx.translate(0, -mdy);

  // little extras
  if (parts.extra === 'sweat') { ctx.fillStyle = 'rgba(160,225,255,0.95)'; drop(ctx, x + r * 0.66, y - r * 0.3, r * 0.08); }
  else if (parts.extra === 'tear') { ctx.fillStyle = 'rgba(160,225,255,0.95)'; drop(ctx, x - ex - er * 0.2, ey + er * 1.9, r * 0.06); }
}

// ------------------------------------------------------------------ keepers
// The Regulars are seaside café animal friends (v3; they used to be little stars). Flat painted shapes with a soft
// outline and one radial gradient per part, no shadowBlur, so a body is cheap to paint and is cached anyway
// (keeperLive.js layers, or the bitmap cache in drawKeeperPose below).
// back(ctx, x, y, r): the body; front: drawn over the face; face: where it sits (dx, dy, scale of r) and its style
// (ink, cheek, neutral eyes / lid / mouth, plus optional nose, whiskers, beak and glasses).

const OW = (r) => Math.max(1, r * 0.045); // outline width

function shade(ctx, x, y, rr, light, base, dark) { // soft light from the top left
  const g = ctx.createRadialGradient(x - rr * 0.35, y - rr * 0.45, rr * 0.05, x, y, rr * 1.15);
  g.addColorStop(0, light); g.addColorStop(0.55, base); g.addColorStop(1, dark);
  return g;
}

function ell(ctx, x, y, rx, ry, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); }

function paint(ctx, fill, line, lw) {
  ctx.fillStyle = fill; ctx.fill();
  if (line) { ctx.strokeStyle = line; ctx.lineWidth = lw; ctx.stroke(); }
}

const KEEPERS_ART = {
  // Pip: a small, round sea otter in a sea-blue café apron, holding a cup of tea.
  pip: {
    back(ctx, x, y, r) {
      const ow = OW(r), line = '#5a3420';
      const fur = (cx, cy, rr) => shade(ctx, cx, cy, rr, '#b98058', '#8d5a37', '#5c361f');
      ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      // tail curling out to the side
      ctx.beginPath();
      ctx.moveTo(x + r * 0.3, y + r * 0.72);
      ctx.quadraticCurveTo(x + r * 0.98, y + r * 0.9, x + r * 0.96, y + r * 0.42);
      ctx.quadraticCurveTo(x + r * 0.78, y + r * 0.6, x + r * 0.36, y + r * 0.5);
      ctx.closePath(); paint(ctx, fur(x + r * 0.7, y + r * 0.6, r * 0.4), line, ow);
      // feet
      for (const s of [-1, 1]) { ell(ctx, x + s * r * 0.27, y + r * 0.84, r * 0.17, r * 0.08); paint(ctx, '#6b4027', line, ow); }
      // body
      ell(ctx, x, y + r * 0.42, r * 0.6, r * 0.45); paint(ctx, fur(x, y + r * 0.42, r * 0.6), line, ow);
      // apron: a bib with straps and a rounded skirt, white trim and a pocket
      ctx.beginPath();
      ctx.moveTo(x - r * 0.24, y + r * 0.12);
      ctx.lineTo(x + r * 0.24, y + r * 0.12);
      ctx.lineTo(x + r * 0.27, y + r * 0.42);
      ctx.quadraticCurveTo(x + r * 0.5, y + r * 0.46, x + r * 0.46, y + r * 0.7);
      ctx.quadraticCurveTo(x, y + r * 0.9, x - r * 0.46, y + r * 0.7);
      ctx.quadraticCurveTo(x - r * 0.5, y + r * 0.46, x - r * 0.27, y + r * 0.42);
      ctx.closePath();
      paint(ctx, shade(ctx, x, y + r * 0.45, r * 0.5, '#bfe4f0', '#6fb3cf', '#3f7f9e'), '#fdf8ee', ow * 1.1);
      ctx.strokeStyle = 'rgba(40,90,120,0.55)'; ctx.lineWidth = ow * 0.8;
      ctx.beginPath(); ctx.moveTo(x - r * 0.16, y + r * 0.6); ctx.quadraticCurveTo(x, y + r * 0.66, x + r * 0.16, y + r * 0.6); ctx.stroke();
      // paws holding a little cup of tea
      ctx.beginPath();
      ctx.moveTo(x - r * 0.15, y + r * 0.26); ctx.lineTo(x + r * 0.15, y + r * 0.26);
      ctx.lineTo(x + r * 0.11, y + r * 0.46); ctx.quadraticCurveTo(x, y + r * 0.5, x - r * 0.11, y + r * 0.46);
      ctx.closePath(); paint(ctx, '#fffaf0', '#8a7660', ow * 0.8);
      ctx.strokeStyle = '#d9a94a'; ctx.lineWidth = ow * 0.8;
      ctx.beginPath(); ctx.moveTo(x - r * 0.14, y + r * 0.3); ctx.lineTo(x + r * 0.14, y + r * 0.3); ctx.stroke();
      ctx.fillStyle = '#e66b6b'; circle(ctx, x, y + r * 0.38, r * 0.04); ctx.fill();
      for (const s of [-1, 1]) { ell(ctx, x + s * r * 0.17, y + r * 0.37, r * 0.09, r * 0.08); paint(ctx, '#7a4a2c', line, ow * 0.8); }
      // ears
      for (const s of [-1, 1]) {
        circle(ctx, x + s * r * 0.44, y - r * 0.64, r * 0.13); paint(ctx, fur(x + s * r * 0.44, y - r * 0.64, r * 0.13), line, ow);
        circle(ctx, x + s * r * 0.44, y - r * 0.62, r * 0.06); ctx.fillStyle = '#5c361f'; ctx.fill();
      }
      // head, with the pale otter face and puffy whisker pads
      ell(ctx, x, y - r * 0.24, r * 0.6, r * 0.5); paint(ctx, fur(x, y - r * 0.24, r * 0.6), line, ow);
      ell(ctx, x, y - r * 0.17, r * 0.44, r * 0.3); ctx.fillStyle = '#f1dcc0'; ctx.fill();
      ell(ctx, x, y - r * 0.38, r * 0.3, r * 0.16); ctx.fillStyle = 'rgba(241,220,192,0.75)'; ctx.fill();
      for (const s of [-1, 1]) { circle(ctx, x + s * r * 0.08, y - r * 0.08, r * 0.1); ctx.fillStyle = '#fbefdf'; ctx.fill(); }
      ctx.restore();
    },
    face: { dx: 0, dy: -0.22, s: 0.58, cheek: 'rgba(240,110,100,0.55)', ink: '#3a2216', eyes: 'dot', lid: 0, mouth: 'smile',
      nose: { c: '#3a2216', w: 0.2, h: 0.12, dy: 0.06 }, whiskers: 'rgba(90,52,32,0.6)' },
  },
  // Luna: a drowsy seal pup in a lavender nightcap.
  luna: {
    back(ctx, x, y, r) {
      const ow = OW(r), line = '#7d879c';
      ctx.save(); ctx.lineJoin = 'round';
      for (const s of [-1, 1]) { // front flippers
        ell(ctx, x + s * r * 0.62, y + r * 0.6, r * 0.24, r * 0.11, s * 0.6);
        paint(ctx, '#a9b2c3', line, ow);
      }
      ell(ctx, x, y + r * 0.12, r * 0.8, r * 0.72); paint(ctx, shade(ctx, x, y + r * 0.12, r * 0.8, '#ffffff', '#d9dee7', '#9aa4b8'), line, ow);
      ell(ctx, x, y + r * 0.5, r * 0.48, r * 0.3); ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fill();
      const rng = mulberry32(11);
      ctx.fillStyle = 'rgba(110,120,140,0.3)';
      for (let i = 0; i < 6; i++) {
        const a = PI * (1.1 + rng() * 0.8), d = r * (0.55 + rng() * 0.15);
        circle(ctx, x + Math.cos(a) * d * 1.05, y + r * 0.12 + Math.sin(a) * d * 0.9, r * (0.03 + rng() * 0.03)); ctx.fill();
      }
      for (const s of [-1, 1]) { circle(ctx, x + s * r * 0.1, y + r * 0.15, r * 0.12); paint(ctx, '#f7f9fc', 'rgba(125,135,156,0.45)', ow * 0.7); }
      // nightcap
      ctx.beginPath();
      ctx.moveTo(x - r * 0.58, y - r * 0.38); ctx.quadraticCurveTo(x - r * 0.05, y - r * 1.0, x + r * 0.55, y - r * 0.55);
      ctx.quadraticCurveTo(x + r * 0.95, y - r * 0.32, x + r * 0.92, y - r * 0.02);
      ctx.quadraticCurveTo(x + r * 0.42, y - r * 0.42, x - r * 0.58, y - r * 0.38);
      ctx.closePath(); paint(ctx, shade(ctx, x, y - r * 0.6, r * 0.6, '#c7bdff', '#8f7ff0', '#5d4fc0'), '#4d40a8', ow);
      ctx.strokeStyle = '#efeaff'; ctx.lineWidth = r * 0.08; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - r * 0.56, y - r * 0.4); ctx.quadraticCurveTo(x, y - r * 0.5, x + r * 0.3, y - r * 0.47); ctx.stroke();
      circle(ctx, x + r * 0.92, y + r * 0.02, r * 0.12); paint(ctx, '#ffffff', '#b9b2e6', ow * 0.8);
      ctx.restore();
    },
    // the sleepy one: heavy lids and a little "o" even when neutral
    face: { dx: 0, dy: 0.02, s: 0.7, cheek: 'rgba(255,120,150,0.5)', ink: '#2e3446', eyes: 'dot', lid: 0.55, mouth: 'o',
      nose: { c: '#3b3f50', w: 0.2, h: 0.12, dy: 0.06 }, whiskers: 'rgba(80,90,110,0.5)' },
  },
  // Bloop: a curious hermit crab living in a blue-and-white teacup.
  bloop: {
    back(ctx, x, y, r) {
      const ow = OW(r), line = '#8e2a1e', cupLine = '#8a7660';
      const shell = (cx, cy, rr) => shade(ctx, cx, cy, rr, '#ffb39a', '#f2674a', '#b8382a');
      ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      // feelers
      ctx.strokeStyle = line; ctx.lineWidth = ow;
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(x + s * r * 0.12, y - r * 0.52); ctx.quadraticCurveTo(x + s * r * 0.18, y - r * 0.85, x + s * r * 0.42, y - r * 0.9); ctx.stroke();
      }
      // saucer, the inside of the cup, then the crab
      ell(ctx, x, y + r * 0.83, r * 0.8, r * 0.1); paint(ctx, '#f4ede2', cupLine, ow);
      ell(ctx, x, y + r * 0.2, r * 0.72, r * 0.14); paint(ctx, '#8a5a3a', cupLine, ow);
      circle(ctx, x, y - r * 0.08, r * 0.5); paint(ctx, shell(x, y - r * 0.08, r * 0.5), line, ow);
      ell(ctx, x, y - r * 0.06, r * 0.36, r * 0.28); ctx.fillStyle = 'rgba(255,175,150,0.6)'; ctx.fill();
      // little legs over the rim
      ctx.strokeStyle = '#d4503a'; ctx.lineWidth = r * 0.07;
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + s * r * 0.3, y + r * 0.18); ctx.quadraticCurveTo(x + s * r * 0.44, y + r * 0.2, x + s * r * 0.46, y + r * 0.34); ctx.stroke(); }
      // the cup
      ctx.beginPath();
      ctx.moveTo(x - r * 0.72, y + r * 0.2);
      ctx.quadraticCurveTo(x - r * 0.7, y + r * 0.76, x - r * 0.3, y + r * 0.8);
      ctx.lineTo(x + r * 0.3, y + r * 0.8);
      ctx.quadraticCurveTo(x + r * 0.7, y + r * 0.76, x + r * 0.72, y + r * 0.2);
      ctx.ellipse(x, y + r * 0.2, r * 0.72, r * 0.14, 0, 0, PI, false);
      ctx.closePath(); paint(ctx, shade(ctx, x, y + r * 0.45, r * 0.7, '#ffffff', '#f6efe4', '#cbbba5'), cupLine, ow);
      // handle
      ctx.strokeStyle = cupLine; ctx.lineWidth = r * 0.13;
      ctx.beginPath(); ctx.arc(x + r * 0.74, y + r * 0.44, r * 0.16, -PI * 0.45, PI * 0.45); ctx.stroke();
      ctx.strokeStyle = '#f6efe4'; ctx.lineWidth = r * 0.07; ctx.stroke();
      // blue band of little flowers and the gold rim
      ctx.fillStyle = '#4b86c4';
      for (let i = -2; i <= 2; i++) {
        const fx = x + i * r * 0.24, fy = y + r * (0.5 + Math.abs(i) * -0.015);
        for (let k = 0; k < 4; k++) { const a = (k / 4) * TAU + 0.4; circle(ctx, fx + Math.cos(a) * r * 0.045, fy + Math.sin(a) * r * 0.045, r * 0.035); ctx.fill(); }
      }
      ctx.strokeStyle = '#d9a94a'; ctx.lineWidth = ow * 1.2;
      ctx.beginPath(); ctx.ellipse(x, y + r * 0.2, r * 0.72, r * 0.14, 0, 0, PI); ctx.stroke();
      // claws held up, one each side
      for (const s of [-1, 1]) {
        ctx.strokeStyle = '#e25a40'; ctx.lineWidth = r * 0.1;
        ctx.beginPath(); ctx.moveTo(x + s * r * 0.38, y + r * 0.08); ctx.quadraticCurveTo(x + s * r * 0.6, y + r * 0.05, x + s * r * 0.66, y - r * 0.12); ctx.stroke();
        const cx = x + s * r * 0.7, cy = y - r * 0.26;
        ell(ctx, cx, cy, r * 0.2, r * 0.16, s * -0.5); paint(ctx, shell(cx, cy, r * 0.2), line, ow);
        ell(ctx, cx + s * r * 0.13, cy - r * 0.15, r * 0.1, r * 0.07, s * -1.0); paint(ctx, shell(cx, cy, r * 0.2), line, ow);
      }
      // a bubble or two from the rock pools
      ctx.strokeStyle = 'rgba(120,180,220,0.9)'; ctx.lineWidth = Math.max(1, r * 0.035);
      circle(ctx, x - r * 0.62, y - r * 0.72, r * 0.09); ctx.stroke();
      circle(ctx, x - r * 0.78, y - r * 0.92, r * 0.05); ctx.stroke();
      ctx.restore();
    },
    face: { dx: 0, dy: -0.12, s: 0.6, cheek: 'rgba(255,215,200,0.75)', ink: '#3a0e08', eyes: 'dot', lid: 0, mouth: 'grin' },
  },
  // Ember: a shy hedgehog baker in a little white baker's hat.
  ember: {
    back(ctx, x, y, r) {
      const ow = OW(r), line = '#5a3016';
      ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      // spiky coat over the top and sides
      const cy = y + r * 0.18, N = 15;
      ctx.beginPath();
      for (let i = 0; i <= N * 2; i++) {
        const a = PI * 0.82 + (i / (N * 2)) * PI * 1.36;
        const rr = r * (i % 2 ? 0.66 : 0.88);
        const px = x + Math.cos(a) * rr * 1.02, py = cy + Math.sin(a) * rr * 0.92;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.quadraticCurveTo(x, y + r * 1.0, x + Math.cos(PI * 0.82) * r * 0.9, cy + Math.sin(PI * 0.82) * r * 0.81);
      ctx.closePath(); paint(ctx, shade(ctx, x, cy, r * 0.85, '#e8b07a', '#b8743c', '#6e3d1c'), line, ow);
      ctx.strokeStyle = 'rgba(255,220,180,0.45)'; ctx.lineWidth = ow;
      for (let i = 0; i < 7; i++) {
        const a = PI * 1.12 + i * PI * 0.13;
        ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * 0.42, cy + Math.sin(a) * r * 0.38); ctx.lineTo(x + Math.cos(a) * r * 0.62, cy + Math.sin(a) * r * 0.56); ctx.stroke();
      }
      // feet
      for (const s of [-1, 1]) { ell(ctx, x + s * r * 0.26, y + r * 0.86, r * 0.14, r * 0.07); paint(ctx, '#e9b99a', '#9a6a4a', ow); }
      // ears and the soft face
      for (const s of [-1, 1]) {
        circle(ctx, x + s * r * 0.4, y - r * 0.02, r * 0.11); paint(ctx, '#f6d6b8', '#9a6a4a', ow);
        circle(ctx, x + s * r * 0.4, y - r * 0.01, r * 0.05); ctx.fillStyle = '#e9a58c'; ctx.fill();
      }
      ell(ctx, x, y + r * 0.34, r * 0.52, r * 0.46); paint(ctx, shade(ctx, x, y + r * 0.34, r * 0.52, '#fff2e2', '#f7dcc0', '#dcb08a'), '#9a6a4a', ow);
      ell(ctx, x, y + r * 0.37, r * 0.17, r * 0.11); ctx.fillStyle = '#fff4e8'; ctx.fill();
      // baker's hat
      ctx.save(); ctx.translate(x + r * 0.06, y - r * 0.62); ctx.rotate(0.12);
      ctx.beginPath(); ctx.rect(-r * 0.27, -r * 0.02, r * 0.54, r * 0.15); paint(ctx, '#ffffff', '#b7aa9a', ow);
      for (const [dx, dy, pr] of [[-0.17, -0.12, 0.16], [0.17, -0.12, 0.16], [0, -0.2, 0.19]]) { circle(ctx, dx * r, dy * r, pr * r); paint(ctx, '#ffffff', '#b7aa9a', ow); }
      ctx.beginPath(); ctx.rect(-r * 0.25, -r * 0.06, r * 0.5, r * 0.1); ctx.fillStyle = '#ffffff'; ctx.fill();
      ctx.restore();
      ctx.restore();
    },
    face: { dx: 0, dy: 0.26, s: 0.58, cheek: 'rgba(255,90,100,0.6)', ink: '#4a2410', eyes: 'arc', lid: 0, mouth: 'smile',
      nose: { c: '#3a1c0c', w: 0.17, h: 0.11, dy: 0.06 } },
  },
  // Zip: a speedy little terrier pup with a tan eye patch and a red neckerchief.
  zip: {
    back(ctx, x, y, r) {
      const ow = OW(r), line = '#8a7d6c';
      const coat = (cx, cy, rr) => shade(ctx, cx, cy, rr, '#ffffff', '#f4efe6', '#c9bfae');
      const tan = '#c98a4a';
      ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      // tail up, wagging
      ctx.strokeStyle = line; ctx.lineWidth = r * 0.15;
      ctx.beginPath(); ctx.moveTo(x + r * 0.35, y + r * 0.55); ctx.quadraticCurveTo(x + r * 0.75, y + r * 0.45, x + r * 0.72, y + r * 0.12); ctx.stroke();
      ctx.strokeStyle = tan; ctx.lineWidth = r * 0.1; ctx.stroke();
      // body and front legs
      ell(ctx, x, y + r * 0.5, r * 0.5, r * 0.38); paint(ctx, coat(x, y + r * 0.5, r * 0.5), line, ow);
      ell(ctx, x + r * 0.22, y + r * 0.42, r * 0.2, r * 0.16); ctx.fillStyle = 'rgba(201,138,74,0.8)'; ctx.fill();
      for (const s of [-1, 1]) { ell(ctx, x + s * r * 0.18, y + r * 0.8, r * 0.13, r * 0.09); paint(ctx, '#ffffff', line, ow); }
      // red neckerchief with white dots
      ctx.beginPath(); ctx.moveTo(x - r * 0.34, y + r * 0.2); ctx.lineTo(x + r * 0.34, y + r * 0.2); ctx.lineTo(x, y + r * 0.52); ctx.closePath();
      paint(ctx, '#e0574a', '#a8352c', ow);
      ctx.fillStyle = '#ffffff';
      for (const [dx, dy] of [[-0.14, 0.27], [0.12, 0.26], [0, 0.38]]) { circle(ctx, x + dx * r, y + dy * r, r * 0.03); ctx.fill(); }
      // head with a tan patch over one eye
      ell(ctx, x, y - r * 0.2, r * 0.58, r * 0.5); paint(ctx, coat(x, y - r * 0.2, r * 0.58), line, ow);
      ctx.save(); ell(ctx, x, y - r * 0.2, r * 0.58, r * 0.5); ctx.clip();
      ell(ctx, x - r * 0.2, y - r * 0.36, r * 0.24, r * 0.21, -0.3); ctx.fillStyle = tan; ctx.fill();
      ctx.restore();
      ell(ctx, x, y - r * 0.07, r * 0.26, r * 0.16); ctx.fillStyle = '#ffffff'; ctx.fill();
      // floppy folded ears
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(x + s * r * 0.24, y - r * 0.64);
        ctx.quadraticCurveTo(x + s * r * 0.72, y - r * 0.8, x + s * r * 0.74, y - r * 0.38);
        ctx.quadraticCurveTo(x + s * r * 0.6, y - r * 0.4, x + s * r * 0.46, y - r * 0.48);
        ctx.closePath(); paint(ctx, s < 0 ? '#c98a4a' : '#d49a5c', '#8a5a2a', ow);
      }
      ctx.restore();
    },
    face: { dx: 0, dy: -0.2, s: 0.58, cheek: 'rgba(255,120,130,0.5)', ink: '#2a1a14', eyes: 'wink', lid: 0, mouth: 'grin',
      nose: { c: '#2a1a14', w: 0.26, h: 0.16, dy: 0.04 } },
  },
  // Nimbus: a dreamy seagull with a soft lilac scarf.
  nimbus: {
    back(ctx, x, y, r) {
      const ow = OW(r), line = '#7f8da0';
      ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      for (const s of [-1, 1]) { // webbed feet
        ctx.beginPath(); ctx.moveTo(x + s * r * 0.2, y + r * 0.74); ctx.lineTo(x + s * r * 0.36, y + r * 0.9); ctx.lineTo(x + s * r * 0.06, y + r * 0.9); ctx.closePath();
        paint(ctx, '#f2b544', '#b07a1a', ow);
      }
      ell(ctx, x, y + r * 0.08, r * 0.6, r * 0.74); paint(ctx, shade(ctx, x, y + r * 0.08, r * 0.7, '#ffffff', '#f2f5f8', '#b9c4d0'), line, ow);
      // folded grey wings with dark tips
      for (const s of [-1, 1]) {
        ctx.save(); ctx.translate(x + s * r * 0.5, y + r * 0.3); ctx.rotate(s * -0.22);
        ell(ctx, 0, 0, r * 0.2, r * 0.42); paint(ctx, shade(ctx, 0, 0, r * 0.4, '#d6dee8', '#a7b4c4', '#74839a'), '#62708a', ow);
        ctx.beginPath(); ctx.ellipse(0, r * 0.2, r * 0.17, r * 0.2, 0, 0.1 * PI, 0.9 * PI); ctx.closePath();
        ctx.fillStyle = '#3e4652'; ctx.fill();
        ctx.fillStyle = '#ffffff'; circle(ctx, 0, r * 0.3, r * 0.035); ctx.fill();
        ctx.restore();
      }
      // lilac scarf
      ctx.beginPath(); ctx.ellipse(x, y + r * 0.08, r * 0.46, r * 0.11, 0, 0, TAU); paint(ctx, '#c9a2f0', '#8f68c4', ow);
      ctx.beginPath(); ctx.moveTo(x - r * 0.24, y + r * 0.14); ctx.lineTo(x - r * 0.32, y + r * 0.48); ctx.lineTo(x - r * 0.14, y + r * 0.44); ctx.lineTo(x - r * 0.08, y + r * 0.16); ctx.closePath();
      paint(ctx, '#b88ce8', '#8f68c4', ow);
      ctx.restore();
    },
    // the daydreamer: soft half-closed eyes
    face: { dx: 0, dy: -0.32, s: 0.56, cheek: 'rgba(255,130,170,0.55)', ink: '#2f3442', eyes: 'dot', lid: 0.6, mouth: 'smile',
      beak: { kind: 'gull', c1: '#ffd04a', c2: '#f2b030', spot: '#e2483a', line: '#a77a12', w: 0.5, l: 0.55, dy: 0.08 } },
  },
  // Gus: a wise old sea turtle with tiny glasses and a fisherman's cap.
  gus: {
    back(ctx, x, y, r) {
      const ow = OW(r), line = '#3e6448';
      const skin = (cx, cy, rr) => shade(ctx, cx, cy, rr, '#c9e4b8', '#93c391', '#5a8a5e');
      ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      for (const s of [-1, 1]) { // flippers and back feet
        ell(ctx, x + s * r * 0.76, y + r * 0.5, r * 0.28, r * 0.12, s * 0.5); paint(ctx, skin(x + s * r * 0.76, y + r * 0.5, r * 0.28), line, ow);
        ell(ctx, x + s * r * 0.38, y + r * 0.84, r * 0.15, r * 0.08); paint(ctx, '#86b886', line, ow);
      }
      // the shell dome behind
      ctx.beginPath();
      ctx.moveTo(x - r * 0.88, y + r * 0.62);
      ctx.bezierCurveTo(x - r * 0.9, y - r * 0.18, x + r * 0.9, y - r * 0.18, x + r * 0.88, y + r * 0.62);
      ctx.quadraticCurveTo(x, y + r * 0.74, x - r * 0.88, y + r * 0.62);
      ctx.closePath();
      paint(ctx, shade(ctx, x, y + r * 0.25, r * 0.85, '#a6d39a', '#5f9f62', '#2f6038'), '#2a4e30', ow);
      ctx.save(); ctx.clip();
      ctx.strokeStyle = 'rgba(30,70,40,0.55)'; ctx.lineWidth = ow;
      for (const [hx, hy] of [[-0.55, 0.38], [0.55, 0.38], [-0.28, 0.1], [0.28, 0.1], [0, 0.42]]) {
        ctx.beginPath();
        for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU + PI / 6; const px = x + hx * r + Math.cos(a) * r * 0.2, py = y + hy * r + Math.sin(a) * r * 0.17; if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
        ctx.closePath(); ctx.stroke();
      }
      ctx.restore();
      ctx.strokeStyle = '#d9c88e'; ctx.lineWidth = r * 0.08;
      ctx.beginPath(); ctx.moveTo(x - r * 0.84, y + r * 0.6); ctx.quadraticCurveTo(x, y + r * 0.72, x + r * 0.84, y + r * 0.6); ctx.stroke();
      // neck and head
      ell(ctx, x, y + r * 0.06, r * 0.24, r * 0.2); paint(ctx, skin(x, y + r * 0.06, r * 0.24), line, ow);
      ell(ctx, x, y - r * 0.3, r * 0.46, r * 0.42); paint(ctx, skin(x, y - r * 0.3, r * 0.46), line, ow);
      ctx.fillStyle = 'rgba(70,120,80,0.35)';
      for (const [dx, dy, pr] of [[-0.32, -0.5, 0.05], [0.34, -0.46, 0.04], [0.26, -0.58, 0.03]]) { circle(ctx, x + dx * r, y + dy * r, pr * r); ctx.fill(); }
      // navy fisherman's cap
      ctx.beginPath();
      ctx.moveTo(x - r * 0.36, y - r * 0.6);
      ctx.quadraticCurveTo(x - r * 0.32, y - r * 0.92, x, y - r * 0.92);
      ctx.quadraticCurveTo(x + r * 0.32, y - r * 0.92, x + r * 0.36, y - r * 0.6);
      ctx.closePath(); paint(ctx, shade(ctx, x, y - r * 0.8, r * 0.36, '#6b8cc0', '#3a5a8a', '#22385e'), '#1c2e4e', ow);
      ctx.beginPath(); ctx.ellipse(x, y - r * 0.6, r * 0.4, r * 0.07, 0, 0, TAU); paint(ctx, '#2c4672', '#1c2e4e', ow);
      ctx.restore();
    },
    face: { dx: 0, dy: -0.3, s: 0.6, cheek: 'rgba(255,130,140,0.5)', ink: '#22301e', eyes: 'dot', lid: 0, mouth: 'smile', glasses: true },
  },
  // Nova: a joyful rainbow lorikeet with a crest in every colour.
  nova: {
    back(ctx, x, y, r) {
      const ow = OW(r), line = '#2a4a6a';
      ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      // tail feathers
      for (const [dx, col] of [[-0.14, '#3ea85a'], [0.14, '#ffd04a'], [0, '#5ab8ff']]) {
        ctx.beginPath(); ctx.moveTo(x + dx * r - r * 0.1, y + r * 0.6); ctx.lineTo(x + dx * r * 2.2, y + r * 0.98); ctx.lineTo(x + dx * r + r * 0.1, y + r * 0.6); ctx.closePath();
        paint(ctx, col, line, ow);
      }
      ell(ctx, x, y + r * 0.2, r * 0.56, r * 0.62); paint(ctx, shade(ctx, x, y + r * 0.2, r * 0.6, '#9fe69a', '#4cb860', '#1e6e3a'), line, ow);
      // warm sunset chest
      ell(ctx, x, y + r * 0.32, r * 0.36, r * 0.38); ctx.fillStyle = shade(ctx, x, y + r * 0.32, r * 0.38, '#ffe066', '#ff9a3a', '#e8452f'); ctx.fill();
      for (const s of [-1, 1]) { // wings
        ell(ctx, x + s * r * 0.5, y + r * 0.32, r * 0.17, r * 0.36, s * -0.25);
        paint(ctx, shade(ctx, x + s * r * 0.5, y + r * 0.32, r * 0.36, '#9fe69a', '#3ea85a', '#1e6e3a'), line, ow);
      }
      for (const s of [-1, 1]) { ell(ctx, x + s * r * 0.16, y + r * 0.86, r * 0.12, r * 0.06); paint(ctx, '#8a8f9a', '#4a4f5a', ow); }
      // rainbow crest
      const crest = ['#ff5a6e', '#ffa23a', '#ffe04a', '#6fd46a', '#5ab8ff'];
      for (let i = 0; i < crest.length; i++) {
        const a = -PI / 2 + (i - 2) * 0.32;
        ctx.save(); ctx.translate(x + Math.cos(a) * r * 0.42, y - r * 0.32 + Math.sin(a) * r * 0.42); ctx.rotate(a + PI / 2);
        ell(ctx, 0, -r * 0.1, r * 0.08, r * 0.2); paint(ctx, crest[i], line, ow * 0.8);
        ctx.restore();
      }
      // blue head with a pale face
      ell(ctx, x, y - r * 0.28, r * 0.5, r * 0.44); paint(ctx, shade(ctx, x, y - r * 0.28, r * 0.5, '#9aa8ff', '#5868e6', '#2e3a9a'), line, ow);
      ell(ctx, x, y - r * 0.24, r * 0.38, r * 0.27); ctx.fillStyle = '#e8eaff'; ctx.fill();
      ctx.restore();
    },
    face: { dx: 0, dy: -0.3, s: 0.56, cheek: 'rgba(255,90,140,0.6)', ink: '#1e2050', eyes: 'arc', lid: 0, mouth: 'grin',
      beak: { kind: 'hook', c1: '#ff6a3a', c2: '#e2482a', line: '#9a2a14', w: 0.48, l: 0.6, dy: 0.08 } },
  },
};

// Keeper outfits (former Season rewards, kept by the players who earned them): a small accessory drawn on
// top of any Keeper. Cosmetic only. Ids match OUTFITS in src/meta/outfits.js.
const OUTFIT_PAINTERS = {
  flower(ctx, x, y, r) { // flower crown
    for (let i = 0; i < 5; i++) {
      const a = -PI * (0.8 - i * 0.15);
      const fx = x + Math.cos(a) * r * 0.86, fy = y + Math.sin(a) * r * 0.86, pr = r * 0.11;
      ctx.fillStyle = i % 2 ? '#ffd1ec' : '#ff8ac8';
      for (let k = 0; k < 5; k++) { const b = (k / 5) * TAU; circle(ctx, fx + Math.cos(b) * pr, fy + Math.sin(b) * pr, pr * 0.75); ctx.fill(); }
      ctx.fillStyle = '#fff3a0'; circle(ctx, fx, fy, pr * 0.6); ctx.fill();
    }
  },
  moonpin(ctx, x, y, r) { // crescent hair clip
    const cx = x + r * 0.58, cy = y - r * 0.72, cr = r * 0.26;
    ctx.save();
    ctx.shadowColor = '#fff6d0'; ctx.shadowBlur = r * 0.2;
    ctx.fillStyle = '#f4f0ff';
    ctx.beginPath(); ctx.arc(cx, cy, cr, 0, TAU); ctx.arc(cx + cr * 0.45, cy - cr * 0.25, cr * 0.85, 0, TAU, true); ctx.fill('evenodd');
    ctx.restore();
    ctx.fillStyle = '#ffffff';
    starPath(ctx, cx - cr * 1.1, cy + cr * 0.9, 4, cr * 0.4, cr * 0.13); ctx.fill();
  },
  scarf(ctx, x, y, r) { // warm scarf
    ctx.save();
    ctx.fillStyle = '#ff7a4a'; ctx.strokeStyle = '#ffd08a'; ctx.lineWidth = Math.max(1, r * 0.05);
    ctx.beginPath(); ctx.ellipse(x, y + r * 0.62, r * 0.62, r * 0.17, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + r * 0.22, y + r * 0.66); ctx.lineTo(x + r * 0.5, y + r * 1.08); ctx.lineTo(x + r * 0.26, y + r * 1.12); ctx.lineTo(x + r * 0.06, y + r * 0.72); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  },
  halo(ctx, x, y, r) { // frosty halo
    ctx.save();
    ctx.shadowColor = '#bff0ff'; ctx.shadowBlur = r * 0.25;
    ctx.strokeStyle = '#dff8ff'; ctx.lineWidth = Math.max(1.4, r * 0.09);
    ctx.beginPath(); ctx.ellipse(x, y - r * 1.02, r * 0.5, r * 0.15, 0, 0, TAU); ctx.stroke();
    ctx.restore();
  },
  knithat(ctx, x, y, r) { // knitted bobble hat (Autumn Harvest path): rust knit, cream band, a fluffy bobble
    ctx.save();
    const ink = '#6b4a3a', lw = Math.max(1, r * 0.05);
    ctx.lineWidth = lw; ctx.strokeStyle = ink; ctx.lineJoin = 'round';
    // crown
    ctx.beginPath();
    ctx.moveTo(x - r * 0.66, y - r * 0.6);
    ctx.bezierCurveTo(x - r * 0.62, y - r * 1.22, x + r * 0.62, y - r * 1.22, x + r * 0.66, y - r * 0.6);
    ctx.closePath();
    ctx.fillStyle = '#c8643c'; ctx.fill(); ctx.stroke();
    // knit ribs
    ctx.save(); ctx.clip();
    ctx.strokeStyle = 'rgba(120,50,30,.45)'; ctx.lineWidth = Math.max(1, r * 0.035);
    for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(x + i * r * 0.17, y - r * 0.6); ctx.quadraticCurveTo(x + i * r * 0.12, y - r * 0.9, x + i * r * 0.05, y - r * 1.12); ctx.stroke(); }
    ctx.restore();
    // band
    ctx.beginPath();
    ctx.moveTo(x - r * 0.72, y - r * 0.5); ctx.quadraticCurveTo(x, y - r * 0.38, x + r * 0.72, y - r * 0.5);
    ctx.lineTo(x + r * 0.7, y - r * 0.68); ctx.quadraticCurveTo(x, y - r * 0.58, x - r * 0.7, y - r * 0.68); ctx.closePath();
    ctx.fillStyle = '#f6e6c8'; ctx.fill(); ctx.stroke();
    // a little maple leaf on the band
    ctx.fillStyle = '#e0922e';
    ctx.beginPath(); ctx.arc(x + r * 0.36, y - r * 0.55, r * 0.08, 0, TAU); ctx.fill();
    // bobble
    ctx.beginPath(); ctx.arc(x, y - r * 1.13, r * 0.18, 0, TAU); ctx.fillStyle = '#fbf3e4'; ctx.fill(); ctx.stroke();
    ctx.restore();
  },
  earmuffs(ctx, x, y, r) { // fluffy earmuffs (Frost & Lanterns path): a soft band over the top, two rosy fluffy muffs
    ctx.save();
    const ink = '#6b4a3a', lw = Math.max(1, r * 0.05);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // band
    ctx.beginPath(); ctx.moveTo(x - r * 0.84, y - r * 0.18); ctx.bezierCurveTo(x - r * 0.84, y - r * 1.3, x + r * 0.84, y - r * 1.3, x + r * 0.84, y - r * 0.18);
    ctx.lineWidth = r * 0.16; ctx.strokeStyle = ink; ctx.stroke();
    ctx.lineWidth = r * 0.09; ctx.strokeStyle = '#9fb6d4'; ctx.stroke();
    // muffs: a ring of soft puffs around a round centre
    for (const sx of [-1, 1]) {
      const mx = x + sx * r * 0.8, my = y - r * 0.1, mr = r * 0.22;
      ctx.fillStyle = '#f6dfe6'; ctx.strokeStyle = ink; ctx.lineWidth = lw;
      ctx.beginPath();
      for (let i = 0; i < 9; i++) { const a = (i / 9) * TAU; ctx.moveTo(mx + Math.cos(a) * mr + mr * 0.34, my + Math.sin(a) * mr); ctx.arc(mx + Math.cos(a) * mr, my + Math.sin(a) * mr, mr * 0.34, 0, TAU); }
      ctx.stroke(); ctx.fill();
      ctx.beginPath(); ctx.arc(mx, my, mr * 1.02, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(mx - mr * 0.35, my - mr * 0.35, mr * 0.3, 0, TAU); ctx.fill();
    }
    ctx.restore();
  },
  // Café Club keepsakes (src/meta/outfits.js CLUB_KEEPSAKES): warm café colours, the same soft brown ink as above.
  cafe_beret(ctx, x, y, r) { // a tilted wine-red beret with a little stalk
    ctx.save();
    ctx.lineWidth = Math.max(1, r * 0.05); ctx.strokeStyle = '#6b4a3a'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.ellipse(x + r * 0.08, y - r * 0.78, r * 0.7, r * 0.3, -0.18, 0, TAU);
    ctx.fillStyle = '#b8434f'; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x - r * 0.05, y - r * 0.86, r * 0.36, r * 0.11, -0.18, PI, TAU); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + r * 0.12, y - r * 1.06); ctx.lineTo(x + r * 0.16, y - r * 1.2);
    ctx.lineWidth = Math.max(1.2, r * 0.08); ctx.strokeStyle = '#6b4a3a'; ctx.lineCap = 'round'; ctx.stroke();
    ctx.restore();
  },
  teacup_hat(ctx, x, y, r) { // a tiny teacup worn as a hat, with a saucer brim and a curl of steam
    ctx.save();
    const ink = '#6b4a3a'; ctx.lineWidth = Math.max(1, r * 0.05); ctx.strokeStyle = ink; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.ellipse(x, y - r * 0.74, r * 0.62, r * 0.13, 0, 0, TAU); ctx.fillStyle = '#f7efe2'; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - r * 0.36, y - r * 1.12); ctx.lineTo(x + r * 0.36, y - r * 1.12);
    ctx.quadraticCurveTo(x + r * 0.34, y - r * 0.78, x, y - r * 0.78); ctx.quadraticCurveTo(x - r * 0.34, y - r * 0.78, x - r * 0.36, y - r * 1.12); ctx.closePath();
    ctx.fillStyle = '#9fd0c4'; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + r * 0.42, y - r * 0.98, r * 0.11, -PI / 2, PI / 2); ctx.stroke();
    ctx.fillStyle = '#f2b8c6'; circle(ctx, x, y - r * 0.96, r * 0.07); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - r * 0.06, y - r * 1.18); ctx.bezierCurveTo(x - r * 0.16, y - r * 1.22, x + r * 0.08, y - r * 1.24, x - r * 0.02, y - r * 1.3);
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineCap = 'round'; ctx.stroke();
    ctx.restore();
  },
  baker_toque(ctx, x, y, r) { // a puffy white baker's hat
    ctx.save();
    const ink = '#6b4a3a'; ctx.lineWidth = Math.max(1, r * 0.05); ctx.strokeStyle = ink; ctx.lineJoin = 'round';
    ctx.fillStyle = '#fffaf2';
    ctx.beginPath();
    ctx.moveTo(x - r * 0.46, y - r * 0.72);
    ctx.bezierCurveTo(x - r * 0.9, y - r * 1.0, x - r * 0.6, y - r * 1.3, x - r * 0.24, y - r * 1.18);
    ctx.bezierCurveTo(x - r * 0.14, y - r * 1.34, x + r * 0.3, y - r * 1.34, x + r * 0.3, y - r * 1.18);
    ctx.bezierCurveTo(x + r * 0.66, y - r * 1.28, x + r * 0.9, y - r * 1.0, x + r * 0.46, y - r * 0.72);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.rect(x - r * 0.48, y - r * 0.8, r * 0.96, r * 0.2); ctx.fillStyle = '#f3e6d2'; ctx.fill(); ctx.stroke();
    ctx.restore();
  },
  gingham_bow(ctx, x, y, r) { // a red gingham bow on one side of the head
    ctx.save();
    const ink = '#6b4a3a', bx = x + r * 0.5, by = y - r * 0.8, w = r * 0.3;
    ctx.lineWidth = Math.max(1, r * 0.05); ctx.strokeStyle = ink; ctx.lineJoin = 'round';
    for (const sx of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + sx * w * 1.2, by - w * 0.9, bx + sx * w * 1.15, by); ctx.quadraticCurveTo(bx + sx * w * 1.2, by + w * 0.9, bx, by); ctx.closePath();
      ctx.fillStyle = '#e2585f'; ctx.fill();
      ctx.save(); ctx.clip(); ctx.fillStyle = 'rgba(255,255,255,.55)';
      for (let i = -3; i <= 3; i++) { ctx.fillRect(bx + i * w * 0.32, by - w, w * 0.14, w * 2); ctx.fillRect(bx - w * 1.3, by + i * w * 0.32, w * 2.6, w * 0.14); }
      ctx.restore(); ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(bx, by, w * 0.3, 0, TAU); ctx.fillStyle = '#c8414a'; ctx.fill(); ctx.stroke();
    ctx.restore();
  },
  seaside_sunhat(ctx, x, y, r) { // a wide straw sun hat with a sea-blue ribbon
    ctx.save();
    const ink = '#6b4a3a'; ctx.lineWidth = Math.max(1, r * 0.05); ctx.strokeStyle = ink; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.ellipse(x, y - r * 0.7, r * 1.02, r * 0.22, 0, 0, TAU); ctx.fillStyle = '#ecd29a'; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - r * 0.5, y - r * 0.74); ctx.bezierCurveTo(x - r * 0.5, y - r * 1.28, x + r * 0.5, y - r * 1.28, x + r * 0.5, y - r * 0.74); ctx.closePath();
    ctx.fillStyle = '#f1dca8'; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - r * 0.5, y - r * 0.8); ctx.quadraticCurveTo(x, y - r * 0.7, x + r * 0.5, y - r * 0.8);
    ctx.lineWidth = r * 0.12; ctx.strokeStyle = '#5aa6c8'; ctx.stroke();
    ctx.fillStyle = '#5aa6c8'; ctx.beginPath(); ctx.moveTo(x + r * 0.46, y - r * 0.8); ctx.lineTo(x + r * 0.74, y - r * 0.5); ctx.lineTo(x + r * 0.56, y - r * 0.48); ctx.closePath(); ctx.fill();
    ctx.restore();
  },
  croissant_clip(ctx, x, y, r) { // a little golden croissant hair clip
    ctx.save();
    const ink = '#6b4a3a', cx = x - r * 0.5, cy = y - r * 0.82, cr = r * 0.3;
    ctx.lineWidth = Math.max(1, r * 0.05); ctx.strokeStyle = ink; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.arc(cx, cy + cr * 0.4, cr, PI * 1.08, PI * 1.92); ctx.arc(cx, cy + cr * 0.62, cr * 0.42, PI * 1.85, PI * 1.15, true); ctx.closePath();
    ctx.fillStyle = '#e8a64a'; ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(120,60,20,.55)';
    for (const a of [-0.32, 0, 0.32]) { ctx.beginPath(); ctx.moveTo(cx + Math.sin(a) * cr * 0.5, cy + cr * 0.2); ctx.lineTo(cx + Math.sin(a) * cr * 0.95, cy - cr * 0.5); ctx.stroke(); }
    ctx.restore();
  },
};
export const OUTFIT_IDS = Object.keys(OUTFIT_PAINTERS);

const artFor = (id) => KEEPERS_ART[id] || KEEPERS_ART.pip;

/** Body layer (no face): the Keeper, without its front overlay or outfit. */
export function drawKeeperBack(ctx, x, y, r, id) { artFor(id).back(ctx, x, y, r); }

/** Front layer: the Keeper's own overlay (if any) and the outfit (drawn over the face). */
export function drawKeeperFront(ctx, x, y, r, id, outfit = null) {
  const a = artFor(id);
  if (a.front) a.front(ctx, x, y, r);
  if (outfit && OUTFIT_PAINTERS[outfit]) OUTFIT_PAINTERS[outfit](ctx, x, y, r);
}

/** Only the face, for an expression and a pose (eyeOpen, lookX/Y, mouthOpen, blush, t). */
export function drawKeeperFace(ctx, x, y, r, id, expr = 'neutral', pose = STILL) {
  const f = artFor(id).face;
  ctx.save();
  drawFace(ctx, x + f.dx * r, y + f.dy * r, r * f.s, f, expr, pose || STILL);
  ctx.restore();
}

/** Draw Keeper `id` centred at (x, y) with overall radius r (CSS px). Unknown ids draw Pip. */
export function drawKeeper(ctx, x, y, r, id, outfit = null, expr = 'neutral', pose = STILL) {
  drawKeeperBack(ctx, x, y, r, id);
  drawKeeperFace(ctx, x, y, r, id, expr, pose);
  drawKeeperFront(ctx, x, y, r, id, outfit);
}

/** Size a DOM canvas to its CSS box at devicePixelRatio (capped). Returns { w, h, dpr } in CSS px. */
export function fitKeeperCanvas(canvas, cap = 2) {
  const dpr = Math.min(cap, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
  const w = canvas.clientWidth || canvas.width || 56;
  const h = canvas.clientHeight || canvas.height || 56;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  return { w, h, dpr };
}

/** Paint a still Keeper portrait (with an optional outfit and expression) into a DOM canvas sized by CSS. */
export function paintKeeperCanvas(canvas, id, outfit = null, expr = 'neutral') {
  if (!canvas) return;
  const { w, h, dpr } = fitKeeperCanvas(canvas, 3);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  drawKeeper(ctx, w / 2, h / 2, Math.min(w, h) / 2 / 1.3, id, outfit, expr);
}

// ------------------------------------------------------------------ live pose (keeperAnim.js)
const SPARKS = 6;

function zGlyph(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x - s, y - s); ctx.lineTo(x + s, y - s); ctx.lineTo(x - s, y + s); ctx.lineTo(x + s, y + s);
  ctx.stroke();
}

// Bitmap cache for posed Keepers drawn without `layers` (the café scene): body and front painted once per
// Keeper, outfit and on-screen size bucket (~19% steps, rounded up so it is only ever scaled down), then blitted.
const BODY_CACHE = new Map();
const BODY_CACHE_MAX = 32;
const BODY_SPAN = 1.45; // the bitmap covers ±1.45 r around the centre (ears, hats, crests, tails)

function cachedBody(ctx, id, outfit, r) {
  if (typeof document === 'undefined' || typeof ctx.getTransform !== 'function') return null;
  const m = ctx.getTransform();
  if (!m) return null;
  const px = r * Math.hypot(m.a, m.b);
  if (!(px >= 4) || px > 360) return null;
  const q = Math.pow(2, Math.ceil(Math.log2(px) * 4) / 4);
  const key = `${id}|${outfit || ''}|${q}`;
  let e = BODY_CACHE.get(key);
  if (e) { BODY_CACHE.delete(key); BODY_CACHE.set(key, e); return e; } // keep recently used entries
  const size = Math.ceil(2 * BODY_SPAN * q);
  const mk = () => { const c = document.createElement('canvas'); c.width = size; c.height = size; return c; };
  const back = mk();
  drawKeeperBack(back.getContext('2d'), size / 2, size / 2, q, id);
  let front = null;
  if (artFor(id).front || (outfit && OUTFIT_PAINTERS[outfit])) { front = mk(); drawKeeperFront(front.getContext('2d'), size / 2, size / 2, q, id, outfit); }
  e = { back, front, k: size / q };
  BODY_CACHE.set(key, e);
  if (BODY_CACHE.size > BODY_CACHE_MAX) BODY_CACHE.delete(BODY_CACHE.keys().next().value);
  return e;
}

/**
 * Draw a posed Keeper. `layers` (optional) = { back, front, w, h } pre-rendered canvases the size of the
 * target in CSS px (keeperLive.js caches them so a frame only blits two images and strokes the face).
 * Without layers the body comes from a small bitmap cache keyed by on-screen size (the café scene), or is
 * painted directly where there is no DOM (tests).
 */
export function drawKeeperPose(ctx, x, y, r, id, outfit, pose, layers = null) {
  const foot = r * 0.85; // squash and stretch from the feet
  const body = layers ? null : cachedBody(ctx, id, outfit, r); // sized before the squash, so the bucket stays put
  ctx.save();
  ctx.translate(x + pose.dx * r, y + pose.dy * r);
  if (pose.rot) ctx.rotate(pose.rot);
  ctx.translate(0, foot);
  ctx.scale(pose.sx, pose.sy);
  ctx.translate(0, -foot);
  if (layers) ctx.drawImage(layers.back, -layers.w / 2, -layers.h / 2, layers.w, layers.h);
  else if (body) ctx.drawImage(body.back, -body.k * r / 2, -body.k * r / 2, body.k * r, body.k * r);
  else drawKeeperBack(ctx, 0, 0, r, id);
  drawKeeperFace(ctx, 0, 0, r, id, pose.expr, pose);
  if (layers) { if (layers.front) ctx.drawImage(layers.front, -layers.w / 2, -layers.h / 2, layers.w, layers.h); }
  else if (body) { if (body.front) ctx.drawImage(body.front, -body.k * r / 2, -body.k * r / 2, body.k * r, body.k * r); }
  else drawKeeperFront(ctx, 0, 0, r, id, outfit);
  ctx.restore();

  // sparkles, star burst and sleepy z's sit around the Keeper (they don't spin with it)
  const cx = x + pose.dx * r, cy = y + pose.dy * r;
  if (pose.sparkle > 0.02) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, pose.sparkle);
    ctx.fillStyle = '#fff6c0';
    for (let i = 0; i < SPARKS; i++) {
      const a = (i / SPARKS) * TAU + pose.t * 0.0016;
      const d = r * (1.0 + 0.12 * Math.sin(pose.t * 0.01 + i * 1.7));
      const s = r * (0.09 + 0.05 * Math.sin(pose.t * 0.015 + i * 2.3)) * pose.sparkle;
      starPath(ctx, cx + Math.cos(a) * d, cy + Math.sin(a) * d, 4, s * 1.6, s * 0.45, 0);
      ctx.fill();
    }
    ctx.restore();
  }
  if (pose.burst >= 0) {
    const b = pose.burst;
    ctx.save();
    ctx.globalAlpha = 1 - b;
    ctx.strokeStyle = '#ffe58a'; ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1, r * 0.07 * (1 - b * 0.6));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + 0.2;
      const r0 = r * (0.85 + 0.45 * b), r1 = r * (1.0 + 0.6 * b);
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.stroke();
    }
    ctx.restore();
  }
  if (pose.zzz >= 0) {
    ctx.save();
    ctx.strokeStyle = '#dfe6ff'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(1, r * 0.06);
    for (let k = 0; k < 2; k++) {
      const ph = (pose.zzz + k * 0.5) % 1;
      ctx.globalAlpha = Math.sin(ph * PI);
      zGlyph(ctx, x + r * (0.55 + ph * 0.35), y - r * (0.55 + ph * 0.55), r * (0.08 + ph * 0.07));
    }
    ctx.restore();
  }
}

export const KEEPER_IDS = Object.keys(KEEPERS_ART);
