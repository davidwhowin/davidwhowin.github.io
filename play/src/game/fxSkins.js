// Combo skins (DESIGN.md "Combo skins"): how a merge and a chain look. The merge burst (particles, ring, glow),
// the merge-flash tint, the "Chain ×N" banner and the chain tally pill. Presentation only: a combo skin never
// changes a rule, a score, the juice level (mergeJuice decides how big an effect is; the skin only decides its
// look) or anything about ads.
//
// Phone budget: every skin emits about the same number of particles as Stardust (never more than the juice
// level's count plus a few rings), and Calm / reduced motion cuts them the same way (Effects.burst halves counts,
// extra ripples and second rings are skipped).
import { Effects, registerParticleType } from './effects.js';
import { mulberry32, hashString } from './rng.js';
import { drawOrb, tierColor } from './orbArt.js';
import { COMBO_LOOKS, DEFAULT_COMBO } from '../meta/looks.js';

export const DEFAULT_FX_SKIN = DEFAULT_COMBO;
const TAU = Math.PI * 2;

// ------------------------------------------------------------------ particle shapes

// a short glowing streak along the particle's flight
registerParticleType('streak', (ctx, p, s) => {
  ctx.rotate(Math.atan2(p.vy, p.vx) - p.rot);
  const len = Math.min(s * 7, 3 + Math.hypot(p.vx, p.vy) * 0.05);
  const g = ctx.createLinearGradient(-len, 0, s, 0);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(1, p.color);
  ctx.strokeStyle = g;
  ctx.lineWidth = Math.max(1.2, s * 0.8);
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-len, 0); ctx.lineTo(s * 0.5, 0); ctx.stroke();
});

// a soft rising aurora wisp
registerParticleType('wisp', (ctx, p, s) => {
  ctx.globalAlpha *= 0.55;
  ctx.beginPath(); ctx.ellipse(0, 0, s * 0.7, s * 2.2, 0, 0, TAU); ctx.fill();
  ctx.globalAlpha *= 0.6;
  ctx.beginPath(); ctx.ellipse(0, 0, s * 1.3, s * 3.4, 0, 0, TAU); ctx.fill();
});

// a little constellation star (lines between stars are drawn by Effects from p.prev)
registerParticleType('cstar', (ctx, p, s) => {
  ctx.beginPath();
  ctx.moveTo(0, -s * 1.5); ctx.lineTo(s * 0.3, -s * 0.3); ctx.lineTo(s * 1.5, 0); ctx.lineTo(s * 0.3, s * 0.3);
  ctx.lineTo(0, s * 1.5); ctx.lineTo(-s * 0.3, s * 0.3); ctx.lineTo(-s * 1.5, 0); ctx.lineTo(-s * 0.3, -s * 0.3);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(0, 0, s * 0.35, 0, TAU); ctx.fill();
});

// a sakura petal (solid, with a notch at the tip)
registerParticleType('petal', (ctx, p, s) => {
  const r = s * 1.5;
  ctx.beginPath();
  ctx.moveTo(0, r);
  ctx.bezierCurveTo(-r * 0.95, r * 0.35, -r * 0.7, -r * 0.85, -r * 0.12, -r);
  ctx.lineTo(0, -r * 0.78);
  ctx.lineTo(r * 0.12, -r);
  ctx.bezierCurveTo(r * 0.7, -r * 0.85, r * 0.95, r * 0.35, 0, r);
  ctx.fill();
  ctx.strokeStyle = 'rgba(200,70,120,0.45)';
  ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(0, r * 0.75); ctx.lineTo(0, -r * 0.35); ctx.stroke();
});

// a garden leaf (solid, with a centre vein)
registerParticleType('leaf', (ctx, p, s) => {
  const r = s * 1.5;
  ctx.beginPath();
  ctx.moveTo(0, r);
  ctx.quadraticCurveTo(-r * 0.8, 0, 0, -r);
  ctx.quadraticCurveTo(r * 0.8, 0, 0, r);
  ctx.fill();
  ctx.strokeStyle = 'rgba(30,70,20,0.5)';
  ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(0, r * 0.85); ctx.lineTo(0, -r * 0.6); ctx.stroke();
});

// a water droplet pointing along its flight
registerParticleType('drop', (ctx, p, s) => {
  ctx.rotate(Math.atan2(p.vy, p.vx) - p.rot + Math.PI / 2);
  ctx.beginPath();
  ctx.moveTo(0, s * 1.8);
  ctx.bezierCurveTo(s * 1.1, s * 0.2, s * 0.8, -s, 0, -s);
  ctx.bezierCurveTo(-s * 0.8, -s, -s * 1.1, s * 0.2, 0, s * 1.8);
  ctx.fill();
});

// a rising bubble (ring + highlight)
registerParticleType('bubble', (ctx, p, s) => {
  ctx.strokeStyle = p.color;
  ctx.lineWidth = Math.max(1, s * 0.3);
  ctx.beginPath(); ctx.arc(0, 0, s * 1.2, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.arc(-s * 0.45, -s * 0.45, s * 0.3, 0, TAU); ctx.fill();
});

function heartPath(ctx, s) {
  ctx.beginPath();
  ctx.moveTo(0, s * 1.1);
  ctx.bezierCurveTo(-s * 1.7, 0, -s * 1.1, -s * 1.5, 0, -s * 0.55);
  ctx.bezierCurveTo(s * 1.1, -s * 1.5, s * 1.7, 0, 0, s * 1.1);
  ctx.closePath();
}

registerParticleType('heart', (ctx, p, s) => {
  heartPath(ctx, s);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath(); ctx.arc(-s * 0.55, -s * 0.5, s * 0.22, 0, TAU); ctx.fill();
});

function pawPath(ctx, x, y, s) {
  ctx.beginPath(); ctx.ellipse(x, y + s * 0.35, s * 0.6, s * 0.48, 0, 0, TAU); ctx.fill();
  for (const [dx, dy] of [[-0.68, -0.3], [-0.24, -0.75], [0.24, -0.75], [0.68, -0.3]]) {
    ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s, s * 0.22, 0, TAU); ctx.fill();
  }
}

registerParticleType('paw', (ctx, p, s) => {
  ctx.rotate(-p.rot * 0.8); // paws stay mostly upright
  pawPath(ctx, 0, 0, s * 1.3);
});

// a candy sprinkle: a little rounded rod that tumbles as it flies
registerParticleType('sprinkle', (ctx, p, s) => {
  const l = s * 1.5, r = Math.max(0.9, s * 0.38);
  ctx.beginPath(); ctx.moveTo(-l, -r); ctx.lineTo(l, -r); ctx.arc(l, 0, r, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(-l, r); ctx.arc(-l, 0, r, Math.PI / 2, Math.PI * 1.5); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(-l * 0.7, -r * 0.65, l * 1.2, r * 0.45);
});

// a sea bubble (Deep Sea): a soft filled sphere with a bright rim and a highlight; stays upright
registerParticleType('seabubble', (ctx, p, s) => {
  ctx.rotate(-p.rot);
  const r = s * 1.25;
  ctx.globalAlpha *= 0.35; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.globalAlpha /= 0.35;
  ctx.strokeStyle = p.color; ctx.lineWidth = Math.max(1, s * 0.28);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.ellipse(-r * 0.38, -r * 0.4, r * 0.3, r * 0.2, -0.6, 0, TAU); ctx.fill();
});

// a pearl (Deep Sea): a creamy sphere with a pink sheen and a hard highlight
registerParticleType('pearl', (ctx, p, s) => {
  ctx.rotate(-p.rot);
  const r = s * 0.95;
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.55, p.color); g.addColorStop(1, '#b89ab0');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(-r * 0.35, -r * 0.38, r * 0.2, 0, TAU); ctx.fill();
});

// sea foam (Seaside Café): a small soft cloud of three puffs with a sea-glass edge, so it reads on a pale tray
registerParticleType('foam', (ctx, p, s) => {
  ctx.rotate(-p.rot);
  const puffs = [[-s * 0.55, s * 0.1, s * 0.75], [s * 0.45, s * 0.15, s * 0.7], [0, -s * 0.3, s * 0.85]];
  ctx.strokeStyle = p.color; ctx.lineWidth = Math.max(1, s * 0.3);
  for (const [x, y, r] of puffs) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); }
  ctx.fillStyle = '#fffdf6';
  for (const [x, y, r] of puffs) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
});

// ------------------------------------------------------------------ banner plates

function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Sushi: a hanging wooden shop sign behind the chain name
function woodSign(ctx, tw, size, b) {
  const w = tw + size * 0.9, h = size * (b.sub ? 1.95 : 1.3), y = -size * 0.62;
  ctx.strokeStyle = 'rgba(60,30,10,0.9)'; ctx.lineWidth = Math.max(1.5, size * 0.05);
  ctx.beginPath(); ctx.moveTo(-w * 0.3, y); ctx.lineTo(0, y - size * 0.55); ctx.lineTo(w * 0.3, y); ctx.stroke();
  roundRect(ctx, -w / 2, y, w, h, size * 0.18);
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#b97a45'); g.addColorStop(1, '#7c4a24');
  ctx.fillStyle = g;
  ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = size * 0.25; ctx.shadowOffsetY = size * 0.06;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#4a2a12'; ctx.lineWidth = Math.max(1.5, size * 0.05); ctx.stroke();
  // grain
  ctx.strokeStyle = 'rgba(60,28,8,0.25)'; ctx.lineWidth = 1;
  for (let i = 1; i < 5; i++) {
    const gy = y + (h * i) / 5;
    ctx.beginPath(); ctx.moveTo(-w / 2 + 4, gy); ctx.bezierCurveTo(-w * 0.2, gy - 2, w * 0.2, gy + 2, w / 2 - 4, gy); ctx.stroke();
  }
  ctx.fillStyle = '#e9c08a';
  for (const sx of [-w * 0.3, w * 0.3]) { ctx.beginPath(); ctx.arc(sx, y + size * 0.12, size * 0.06, 0, TAU); ctx.fill(); }
}

// Koi: a dark water lozenge with ripple rings at both ends
function waterPlate(ctx, tw, size, b) {
  const w = tw + size * 0.8, h = size * (b.sub ? 1.85 : 1.2), y = -size * 0.6;
  roundRect(ctx, -w / 2, y, w, h, h / 2);
  ctx.fillStyle = 'rgba(4,40,56,0.72)'; ctx.fill();
  ctx.strokeStyle = 'rgba(170,240,255,0.55)'; ctx.lineWidth = Math.max(1.2, size * 0.04); ctx.stroke();
  ctx.lineWidth = 1.2;
  for (const sx of [-1, 1]) for (let i = 1; i <= 2; i++) {
    ctx.strokeStyle = `rgba(170,240,255,${0.5 / i})`;
    ctx.beginPath(); ctx.ellipse(sx * (w / 2 + size * 0.25 * i), y + h / 2, size * 0.18 * i, size * 0.08 * i, 0, 0, TAU); ctx.stroke();
  }
}

// Cat: a cream café card with a paw print on each end
function catCard(ctx, tw, size, b) {
  const w = tw + size * 1.3, h = size * (b.sub ? 1.9 : 1.25), y = -size * 0.6;
  roundRect(ctx, -w / 2, y, w, h, size * 0.35);
  ctx.fillStyle = 'rgba(70,32,52,0.82)';
  ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = size * 0.2;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#f3dcc4'; ctx.lineWidth = Math.max(1.5, size * 0.06); ctx.stroke();
  ctx.fillStyle = '#ffb3c9';
  for (const sx of [-1, 1]) pawPath(ctx, sx * (w / 2 - size * 0.32), y + h / 2 - size * 0.03, size * 0.2);
}

// Patisserie: a cream scalloped cake-box ribbon tag with a macaron on each end
function cakeTag(ctx, tw, size, b) {
  const w = tw + size * 1.4, h = size * (b.sub ? 1.9 : 1.25), y = -size * 0.6;
  roundRect(ctx, -w / 2, y, w, h, size * 0.4);
  ctx.fillStyle = 'rgba(92,34,58,0.85)';
  ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = size * 0.2;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#ffd6e4'; ctx.lineWidth = Math.max(1.5, size * 0.06); ctx.stroke();
  ctx.setLineDash([size * 0.12, size * 0.1]); ctx.strokeStyle = 'rgba(255,240,246,0.45)'; ctx.lineWidth = 1;
  roundRect(ctx, -w / 2 + size * 0.12, y + size * 0.12, w - size * 0.24, h - size * 0.24, size * 0.3); ctx.stroke();
  ctx.setLineDash([]);
  const cols = [['#ff9ec4', '#b8e888'], ['#c8b0ff', '#ffe08a']];
  [-1, 1].forEach((sx, i) => {
    const mx = sx * (w / 2 - size * 0.34), my = y + h / 2;
    for (const [dy, c] of [[-size * 0.1, cols[i][0]], [size * 0.1, cols[i][0]]]) {
      ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(mx, my + dy, size * 0.2, size * 0.09, 0, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = '#fff6ee'; ctx.fillRect(mx - size * 0.17, my - size * 0.03, size * 0.34, size * 0.06);
  });
}

// Deep Sea: a deep-water tag with a scallop seashell on each end and a pearl string along the bottom edge
function shellTag(ctx, tw, size, b) {
  const w = tw + size * 1.5, h = size * (b.sub ? 1.9 : 1.25), y = -size * 0.6;
  roundRect(ctx, -w / 2, y, w, h, size * 0.4);
  ctx.fillStyle = 'rgba(6,30,62,0.88)';
  ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = size * 0.2;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#9fe0ff'; ctx.lineWidth = Math.max(1.5, size * 0.06); ctx.stroke();
  [-1, 1].forEach((sx) => {
    const cx = sx * (w / 2 - size * 0.36), cy = y + h / 2 + size * 0.02, R = size * 0.27;
    // fan of the scallop shell
    ctx.fillStyle = '#ffc6b0';
    ctx.beginPath(); ctx.moveTo(cx, cy + R * 0.75);
    ctx.arc(cx, cy + R * 0.75, R * 1.15, Math.PI * 1.2, Math.PI * 1.8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(170,80,70,0.7)'; ctx.lineWidth = 1;
    for (let i = 1; i < 5; i++) {
      const a = Math.PI * (1.2 + i * 0.12);
      ctx.beginPath(); ctx.moveTo(cx, cy + R * 0.75); ctx.lineTo(cx + Math.cos(a) * R * 1.1, cy + R * 0.75 + Math.sin(a) * R * 1.1); ctx.stroke();
    }
    ctx.fillStyle = '#f29a86';
    ctx.fillRect(cx - R * 0.28, cy + R * 0.6, R * 0.56, R * 0.25);
  });
  ctx.fillStyle = 'rgba(240,236,255,0.75)';
  const n = Math.max(3, Math.floor((w - size * 1.6) / (size * 0.2)));
  for (let i = 0; i < n; i++) {
    const px = -w / 2 + size * 0.8 + (i + 0.5) * ((w - size * 1.6) / n);
    ctx.beginPath(); ctx.arc(px, y + h - size * 0.13, size * 0.045, 0, TAU); ctx.fill();
  }
}

// Cottage Garden: a kraft-paper seed-packet tag with a twine loop and a little daisy on each end
function seedTag(ctx, tw, size, b) {
  const w = tw + size * 1.5, h = size * (b.sub ? 1.9 : 1.25), y = -size * 0.6;
  roundRect(ctx, -w / 2, y, w, h, size * 0.18);
  ctx.fillStyle = 'rgba(88,58,30,0.92)';
  ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = size * 0.2;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#e8cf98'; ctx.lineWidth = Math.max(1.5, size * 0.06); ctx.stroke();
  // twine loop up top
  ctx.strokeStyle = '#d8b878'; ctx.lineWidth = Math.max(1, size * 0.05);
  ctx.beginPath(); ctx.ellipse(0, y - size * 0.06, size * 0.16, size * 0.12, 0, Math.PI, TAU); ctx.stroke();
  [-1, 1].forEach((sx) => {
    const cx = sx * (w / 2 - size * 0.36), cy = y + h / 2, R = size * 0.13;
    ctx.fillStyle = '#fff8ea';
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * R, cy + Math.sin(a) * R, R * 0.7, R * 0.42, a, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#ffc824'; ctx.beginPath(); ctx.arc(cx, cy, R * 0.55, 0, TAU); ctx.fill();
  });
  // a dashed stitch along the bottom, like a packet's fold
  ctx.strokeStyle = 'rgba(232,207,152,0.55)'; ctx.lineWidth = 1; ctx.setLineDash([size * 0.12, size * 0.08]);
  ctx.beginPath(); ctx.moveTo(-w / 2 + size * 0.7, y + h - size * 0.14); ctx.lineTo(w / 2 - size * 0.7, y + h - size * 0.14); ctx.stroke();
  ctx.setLineDash([]);
}

// Seaside Café: a painted harbour-blue plaque in a cream rope border, with a little starfish on each end
function starfish(ctx, x, y, R, rot) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot + (i / 10) * TAU - Math.PI / 2, r = i % 2 ? R * 0.45 : R;
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
}
function ropePlaque(ctx, tw, size, b) {
  const w = tw + size * 1.5, h = size * (b.sub ? 1.9 : 1.25), y = -size * 0.6;
  roundRect(ctx, -w / 2, y, w, h, size * 0.32);
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#2f6d86'); g.addColorStop(1, '#1d4a62');
  ctx.fillStyle = g;
  ctx.shadowColor = 'rgba(40,24,10,0.35)'; ctx.shadowBlur = size * 0.2; ctx.shadowOffsetY = size * 0.05;
  ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.shadowOffsetY = 0;
  // rope border: a cream cord with darker twists
  ctx.strokeStyle = '#ecd9b2'; ctx.lineWidth = Math.max(2, size * 0.1); ctx.stroke();
  ctx.setLineDash([size * 0.06, size * 0.1]); ctx.strokeStyle = 'rgba(140,104,62,0.8)'; ctx.lineWidth = Math.max(1, size * 0.05); ctx.stroke();
  ctx.setLineDash([]);
  [-1, 1].forEach((sx, i) => {
    const cx = sx * (w / 2 - size * 0.38), cy = y + h / 2;
    starfish(ctx, cx, cy, size * 0.22, i * 0.4);
    ctx.fillStyle = '#f4a07e'; ctx.fill();
    ctx.strokeStyle = 'rgba(120,52,30,0.75)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = 'rgba(255,236,214,0.9)';
    ctx.beginPath(); ctx.arc(cx, cy, size * 0.035, 0, TAU); ctx.fill();
  });
}

// Comet: speed lines trailing behind the name
function cometLines(ctx, tw, size, b) {
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const y = (i - 1) * size * 0.3, x0 = -tw / 2 - size * (0.25 + (i === 1 ? 0 : 0.2));
    const g = ctx.createLinearGradient(x0 - size * 1.4, 0, x0, 0);
    g.addColorStop(0, 'rgba(255,220,150,0)'); g.addColorStop(1, b.color);
    ctx.strokeStyle = g; ctx.lineWidth = size * 0.09;
    ctx.beginPath(); ctx.moveTo(x0 - size * (1.4 - i * 0.2), y); ctx.lineTo(x0, y); ctx.stroke();
  }
}

// Constellation: a dotted star line under the name
function starLine(ctx, tw, size, b) {
  const y = size * (b.sub ? 1.15 : 0.62), w = tw * 0.9;
  ctx.strokeStyle = 'rgba(255,240,200,0.6)'; ctx.lineWidth = 1.2; ctx.setLineDash([2, 5]);
  ctx.beginPath(); ctx.moveTo(-w / 2, y); ctx.lineTo(w / 2, y); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#fff6d0';
  for (const sx of [-w / 2, 0, w / 2]) {
    const s = size * (sx ? 0.09 : 0.12);
    ctx.beginPath();
    ctx.moveTo(sx, y - s * 1.6); ctx.lineTo(sx + s * 0.35, y); ctx.lineTo(sx, y + s * 1.6); ctx.lineTo(sx - s * 0.35, y); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(sx - s * 1.6, y); ctx.lineTo(sx, y - s * 0.35); ctx.lineTo(sx + s * 1.6, y); ctx.lineTo(sx, y + s * 0.35); ctx.closePath(); ctx.fill();
  }
}

// ------------------------------------------------------------------ merge bursts
// m: { x, y, col (tier colour), j (mergeJuice result), tier, cell }; fx: Effects

function stardustMerge(fx, m) {
  const { x, y, col, j, tier, cell } = m;
  fx.burst(x, y, [col, '#ffffff', col], j.particles, 150 + j.level * 45 + tier * 6, 3 + tier * 0.25);
  if (j.ring) fx.ring(x, y, col, cell * (0.8 + j.level * 0.3), 0.4, 5);
  fx.glow(x, y, col, cell * (0.8 + j.level * 0.2), 0.4, j.glow);
}

const speedOf = (m) => 150 + m.j.level * 45 + m.tier * 6;
const sizeOf = (m) => 3 + m.tier * 0.25;

function cometMerge(fx, m) {
  const { x, y, col, j, cell } = m;
  fx.burst(x, y, [col, '#ffffff', '#ffd27a'], j.particles, speedOf(m) * 1.3, sizeOf(m) * 0.8, { type: 'streak', gravity: 140, drag: 3.2, life: 0.55, spin: 0 });
  if (j.ring) fx.ring(x, y, '#ffd27a', cell * (0.8 + j.level * 0.3), 0.35, 4);
  fx.glow(x, y, col, cell * (0.8 + j.level * 0.2), 0.4, j.glow);
}

function auroraMerge(fx, m) {
  const { x, y, col, j, cell } = m;
  fx.burst(x, y, [col, '#7cffb2', '#8fd0ff', '#c69bff'], Math.ceil(j.particles * 0.8), speedOf(m) * 0.55, sizeOf(m) * 1.5, { type: 'wisp', gravity: -110, drag: 2.6, life: 0.95, spin: 1.5 });
  if (j.ring) fx.ring(x, y, '#9dffd0', cell * (0.8 + j.level * 0.3), 0.5, 4, { squash: 0.7 });
  fx.glow(x, y, '#7cffb2', cell * (0.8 + j.level * 0.2), 0.45, j.glow);
}

function constellationMerge(fx, m) {
  const { x, y, col, j, cell } = m;
  fx.burst(x, y, [col, '#fff6d0'], Math.max(4, Math.ceil(j.particles * 0.4)), speedOf(m) * 0.75, sizeOf(m) * 0.95, { type: 'cstar', link: true, gravity: 0, drag: 3.6, life: 0.95, spin: 2 });
  fx.burst(x, y, ['#ffffff', col], Math.ceil(j.particles * 0.35), speedOf(m) * 0.6, 1.8, { type: 'dot', gravity: 0, drag: 3, life: 0.6 });
  if (j.ring) fx.ring(x, y, '#fff2c4', cell * (0.8 + j.level * 0.3), 0.45, 2.5);
  fx.glow(x, y, col, cell * (0.8 + j.level * 0.2), 0.4, j.glow);
}

function sakuraMerge(fx, m) {
  const { x, y, col, j, cell } = m;
  fx.burst(x, y, ['#ffc1d6', '#ff9ec0', '#ffe4ee', '#ffb0cc'], Math.ceil(j.particles * 0.7), speedOf(m) * 0.7, sizeOf(m) * 1.9, { type: 'petal', blend: 'source-over', gravity: 70, drag: 2.8, sway: 45, life: 1.05, spin: 5 });
  fx.burst(x, y, [col, '#ffffff'], Math.ceil(j.particles * 0.3), speedOf(m) * 0.8, sizeOf(m) * 0.7, { type: 'dot' });
  if (j.ring) fx.ring(x, y, '#ffb3cf', cell * (0.8 + j.level * 0.3), 0.45, 4);
  fx.glow(x, y, col, cell * (0.8 + j.level * 0.2), 0.4, j.glow);
}

function rippleMerge(fx, m) {
  const { x, y, col, j, cell } = m;
  fx.ring(x, y, '#bff3ff', cell * (0.75 + j.level * 0.2), 0.55, 3, { squash: 0.6 });
  if (!fx.reduced) fx.ring(x, y, '#8fe3ff', cell * (0.95 + j.level * 0.3), 0.6, 2, { squash: 0.6, delay: 0.12 });
  if (j.ring && !fx.reduced) fx.ring(x, y, '#e8fbff', cell * (1.2 + j.level * 0.35), 0.65, 2, { squash: 0.6, delay: 0.24 });
  fx.burst(x, y, ['#bff3ff', '#8fe3ff', '#ffffff', col], Math.ceil(j.particles * 0.6), speedOf(m) * 0.85, sizeOf(m) * 0.9, { type: 'drop', gravity: 520, up: 170, drag: 1.2, life: 0.7, spin: 0 });
  fx.burst(x, y, ['#d8fbff'], Math.ceil(j.particles * 0.25), speedOf(m) * 0.3, sizeOf(m), { type: 'bubble', gravity: -130, drag: 2, life: 1.0, sway: 22 });
  fx.glow(x, y, col, cell * (0.8 + j.level * 0.2), 0.4, j.glow);
}

function pawMerge(fx, m) {
  const { x, y, col, j, cell } = m;
  fx.burst(x, y, ['#ff8fb1', '#ff6f9f', '#ffc2d4'], Math.ceil(j.particles * 0.45), speedOf(m) * 0.6, sizeOf(m) * 2.0, { type: 'heart', blend: 'source-over', gravity: -80, drag: 2.6, life: 1.0, spin: 1.2, sway: 26 });
  fx.burst(x, y, ['#fff1e2', '#ffd9c2'], Math.ceil(j.particles * 0.25), speedOf(m) * 0.55, sizeOf(m) * 1.7, { type: 'paw', blend: 'source-over', gravity: -40, drag: 2.8, life: 0.95, spin: 1.5 });
  fx.burst(x, y, [col, '#ffffff'], Math.ceil(j.particles * 0.3), speedOf(m) * 0.8, sizeOf(m) * 0.7, { type: 'dot' });
  if (j.ring) fx.ring(x, y, '#ffc2d4', cell * (0.8 + j.level * 0.3), 0.4, 4);
  fx.glow(x, y, col, cell * (0.8 + j.level * 0.2), 0.4, j.glow);
}

function sprinkleMerge(fx, m) {
  const { x, y, col, j, cell } = m;
  fx.burst(x, y, ['#ff6fa8', '#ffd84a', '#6fd8ff', '#9be86a', '#c49bff', '#ffffff'], Math.ceil(j.particles * 0.7), speedOf(m) * 0.85, sizeOf(m) * 1.1, { type: 'sprinkle', blend: 'source-over', gravity: 260, up: 90, drag: 2.2, life: 0.95, spin: 9 });
  fx.burst(x, y, [col, '#fff4e8'], Math.ceil(j.particles * 0.3), speedOf(m) * 0.6, sizeOf(m) * 0.8, { type: 'dot', gravity: -40, drag: 2.6, life: 0.7 });
  if (j.ring) fx.ring(x, y, '#ffd6e4', cell * (0.8 + j.level * 0.3), 0.4, 4);
  fx.glow(x, y, col, cell * (0.8 + j.level * 0.2), 0.4, j.glow);
}

function bubbleMerge(fx, m) {
  const { x, y, col, j, cell } = m;
  fx.burst(x, y, ['#bfefff', '#8fdcff', '#e6fbff', '#9ff0e6'], Math.ceil(j.particles * 0.6), speedOf(m) * 0.7, sizeOf(m) * 1.25, { type: 'seabubble', blend: 'source-over', gravity: -150, up: 40, drag: 2.4, life: 1.05, sway: 24, spin: 2.5 });
  fx.burst(x, y, ['#fff4fa', '#ffe6f0', '#f4ecff'], Math.max(1, Math.ceil(j.particles * 0.12)), speedOf(m) * 0.55, sizeOf(m) * 1.2, { type: 'pearl', blend: 'source-over', gravity: 300, up: 110, drag: 2, life: 0.85, spin: 0 });
  fx.burst(x, y, [col, '#ffffff'], Math.ceil(j.particles * 0.25), speedOf(m) * 0.7, sizeOf(m) * 0.7, { type: 'dot' });
  if (j.ring) fx.ring(x, y, '#9fe0ff', cell * (0.8 + j.level * 0.3), 0.45, 3.5);
  fx.glow(x, y, col, cell * (0.8 + j.level * 0.2), 0.4, j.glow);
}

function gardenMerge(fx, m) {
  const { x, y, col, j, cell } = m;
  fx.burst(x, y, ['#ffc1d6', '#fff4e4', '#c8b0ff', '#ffd86a'], Math.ceil(j.particles * 0.5), speedOf(m) * 0.65, sizeOf(m) * 1.8, { type: 'petal', blend: 'source-over', gravity: 60, drag: 2.8, sway: 40, life: 1.05, spin: 4 });
  fx.burst(x, y, ['#7cc85a', '#a4dc7a', '#5aa040'], Math.ceil(j.particles * 0.25), speedOf(m) * 0.6, sizeOf(m) * 1.6, { type: 'leaf', blend: 'source-over', gravity: 80, drag: 2.6, sway: 30, life: 1.0, spin: 3 });
  fx.burst(x, y, [col, '#fff8e0'], Math.ceil(j.particles * 0.25), speedOf(m) * 0.75, sizeOf(m) * 0.7, { type: 'dot' });
  if (j.ring) fx.ring(x, y, '#d8f0b0', cell * (0.8 + j.level * 0.3), 0.45, 3.5);
  fx.glow(x, y, col, cell * (0.8 + j.level * 0.2), 0.4, j.glow);
}

function seafoamMerge(fx, m) {
  const { x, y, col, j, cell } = m;
  // gentle: slower and softer than the cosmic bursts, solid shapes (source-over) so they read on a light tray
  fx.burst(x, y, ['#5fb3bd', '#7cc6c4', '#9fd4dc'], Math.ceil(j.particles * 0.45), speedOf(m) * 0.6, sizeOf(m) * 1.2, { type: 'seabubble', blend: 'source-over', gravity: -120, up: 30, drag: 2.6, life: 1.1, sway: 20, spin: 2 });
  fx.burst(x, y, ['#8fcfd2', '#a9d8d8'], Math.ceil(j.particles * 0.25), speedOf(m) * 0.5, sizeOf(m) * 1.1, { type: 'foam', blend: 'source-over', gravity: -30, up: 20, drag: 3, life: 0.9, spin: 1 });
  fx.burst(x, y, ['#4f9fb0', '#6bb6c2', col], Math.ceil(j.particles * 0.25), speedOf(m) * 0.75, sizeOf(m) * 0.7, { type: 'drop', blend: 'source-over', gravity: 340, up: 120, drag: 1.8, life: 0.75 });
  if (j.ring) fx.ring(x, y, '#7cc6c4', cell * (0.75 + j.level * 0.25), 0.5, 3);
  fx.glow(x, y, col, cell * (0.7 + j.level * 0.15), 0.35, j.glow * 0.6);
}

// ------------------------------------------------------------------ registry

// Per-skin look. flash: merge-flash tint (r,g,b). banner: Effects banner style (null = default). tally: chain pill fill.
const ART = {
  stardust: { merge: stardustMerge, flash: '255,255,255', banner: null, tally: null },
  comet_sparks: { merge: cometMerge, flash: '255,240,210',
    banner: { stroke: 'rgba(10,12,40,0.92)', top: '#fff6dc', glow: '#ffb347', plate: cometLines }, tally: { fill: 'rgba(14,12,40,0.88)' } },
  aurora_veil: { merge: auroraMerge, flash: '220,255,236',
    banner: { stroke: 'rgba(6,24,30,0.92)', top: '#d8ffe9', bottom: '#c69bff', glow: '#7cffb2' }, tally: { fill: 'rgba(6,24,34,0.88)' } },
  constellation: { merge: constellationMerge, flash: '255,248,220',
    banner: { stroke: 'rgba(8,10,34,0.92)', top: '#fffbe8', glow: '#fff2c4', plate: starLine }, tally: { fill: 'rgba(8,12,36,0.88)' } },
  sakura: { merge: sakuraMerge, flash: '255,220,234',
    banner: { stroke: 'rgba(48,20,6,0.95)', top: '#fff6e6', glow: 'rgba(0,0,0,0)', plate: woodSign }, tally: { fill: 'rgba(66,36,16,0.92)' } },
  koi_ripple: { merge: rippleMerge, flash: '210,248,255',
    banner: { stroke: 'rgba(2,26,38,0.95)', top: '#ecfcff', glow: '#5fd6ff', plate: waterPlate }, tally: { fill: 'rgba(4,34,46,0.9)' } },
  paw_heart: { merge: pawMerge, flash: '255,228,238',
    banner: { stroke: 'rgba(52,18,36,0.95)', top: '#fff4f8', glow: '#ff8fb1', plate: catCard }, tally: { fill: 'rgba(58,26,46,0.9)' } },
  sprinkles: { merge: sprinkleMerge, flash: '255,236,244',
    banner: { stroke: 'rgba(70,22,44,0.95)', top: '#fff6fa', glow: '#ff9ec4', plate: cakeTag }, tally: { fill: 'rgba(72,26,50,0.9)' } },
  bubbles: { merge: bubbleMerge, flash: '214,244,255',
    banner: { stroke: 'rgba(4,22,48,0.95)', top: '#effbff', glow: '#5fc8ff', plate: shellTag }, tally: { fill: 'rgba(6,30,60,0.9)' } },
  seafoam: { merge: seafoamMerge, flash: '226,246,242',
    banner: { stroke: 'rgba(14,40,56,0.95)', top: '#fffaf0', glow: 'rgba(0,0,0,0)', plate: ropePlaque }, tally: { fill: 'rgba(22,62,78,0.92)' } },
  garden_petals: { merge: gardenMerge, flash: '246,255,226',
    banner: { stroke: 'rgba(52,30,10,0.95)', top: '#fffbea', glow: 'rgba(0,0,0,0)', plate: seedTag }, tally: { fill: 'rgba(70,46,22,0.92)' } },
};

/** The combo skin registry: the catalogue (src/meta/looks.js: id, name, cost, pack, desc) plus each skin's look. */
export const FX_SKINS = COMBO_LOOKS.map((l) => ({ ...l, ...(ART[l.id] || ART.stardust) }));
export const FX_SKIN_BY_ID = Object.fromEntries(FX_SKINS.map((s) => [s.id, s]));
export const FX_SKIN_IDS = FX_SKINS.map((s) => s.id);
export const fxSkin = (id) => FX_SKIN_BY_ID[id] || FX_SKIN_BY_ID[DEFAULT_FX_SKIN];

/** Emit one merge's burst in a combo skin. m: { x, y, col, j (mergeJuice), tier, cell }. */
export function emitMerge(fx, id, m) { fxSkin(id).merge(fx, m); }

/** Style for Effects.banner opts.style (the chain banner), or null for the default look. */
export const chainBannerStyle = (id) => fxSkin(id).banner;

/** Chain tally pill style ({ fill }) or null for the default. */
export const tallyStyle = (id) => fxSkin(id).tally;

/** Merge-flash tint as 'r,g,b'. */
export const flashTint = (id) => fxSkin(id).flash;

const COMBO_COLORS = ['#9fd8ff', '#9fd8ff', '#7cffb2', '#ffd54a', '#ff6ad5', '#ff8a5c', '#ff4fd8'];

/**
 * Preview of a combo skin for a Wardrobe / shop card: a merge burst around a sample orb plus the chain banner,
 * frozen at time t (seconds after the merge; deterministic, the same picture every time).
 * Draws into (0, 0, w, h) in CSS px; opts: { t = 0.22, dpr = 1, tier = 6, combo = 3, skin = 'classic', banner = true, reduced = false }.
 */
export function drawFxPreview(ctx, w, h, id, opts = {}) {
  const { t = 0.22, dpr = 1, tier = 6, combo = 3, skin = 'classic', banner = true, reduced = false } = opts;
  const fx = new Effects();
  fx.reduced = reduced;
  const cell = Math.min(w, h) * 0.32;
  const x = w / 2, y = h * (banner ? 0.62 : 0.5);
  const col = tierColor(tier, skin);
  const rand = Math.random;
  Math.random = mulberry32(hashString('fx:' + id));
  try {
    emitMerge(fx, id, { x, y, col, j: { level: 3, particles: 32, ring: true, glow: 0.6 }, tier, cell });
    if (banner) fx.banner(`COMBO ×${combo}`, COMBO_COLORS[Math.min(6, combo)], '', { dur: 10, size: 0.9, y: 0.24, style: chainBannerStyle(id) });
    const steps = Math.max(1, Math.round(t / (1 / 60)));
    for (let i = 0; i < steps; i++) fx.update(t / steps);
    if (banner) fx.banners.forEach((b) => { b.t = b.dur * 0.32; });
  } finally { Math.random = rand; }
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip();
  drawOrb(ctx, x, y, cell * 0.42, tier, skin, dpr, { time: 12 });
  // merge flash
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.35;
  const gl = ctx.createRadialGradient(x, y, 0, x, y, cell * 0.5);
  gl.addColorStop(0, `rgba(${flashTint(id)},0.9)`); gl.addColorStop(1, `rgba(${flashTint(id)},0)`);
  ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, y, cell * 0.5, 0, TAU); ctx.fill();
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  fx.drawWorld(ctx);
  // banners only (no flash overlay)
  fx.flashA = 0;
  fx.drawScreen(ctx, w, h);
  ctx.restore();
}
