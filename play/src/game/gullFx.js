// Café look Seagull booster (docs/UX_OPPORTUNITIES.md item 6): instead of the Cosmic comet streak, a gull swoops
// down onto the picked cell, snatches it and flies off over the harbour. Presentation only: the same removeAt and
// the same 0.16 s lead-in as the comet, so timing and rules are identical. Unity mirror: Scripts/Game (UseComet FX).

const DIVE = 0.16; // matches game.js useComet's comet-streak tween, so the hit lands on the same frame
const AWAY = 0.5;

/** Paint a gull centred at the origin facing right, wingspan about 2*s; flap in -1..1 (wings up .. down). */
export function drawGull(ctx, s, flap = 0) {
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.strokeStyle = '#4e3428';
  ctx.lineWidth = Math.max(1, s * 0.07);
  const tipY = -s * 0.55 * (1 - flap); // wing tips rise and fall
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.05);
    ctx.quadraticCurveTo(side * s * 0.45, tipY - s * 0.2, side * s, tipY);
    ctx.quadraticCurveTo(side * s * 0.55, tipY * 0.35 + s * 0.12, 0, s * 0.12);
    ctx.closePath();
    ctx.fillStyle = '#c7d0d8';
    ctx.fill(); ctx.stroke();
    // dark wing tip
    ctx.beginPath();
    ctx.moveTo(side * s, tipY);
    ctx.quadraticCurveTo(side * s * 0.82, tipY + s * 0.02, side * s * 0.72, tipY + s * 0.16);
    ctx.lineTo(side * s * 0.84, tipY - s * 0.06);
    ctx.closePath();
    ctx.fillStyle = '#4e5a66';
    ctx.fill();
  }
  // body and head
  ctx.fillStyle = '#fffaf2';
  ctx.beginPath(); ctx.ellipse(0, s * 0.05, s * 0.42, s * 0.18, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(s * 0.36, -s * 0.06, s * 0.17, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // tail
  ctx.beginPath(); ctx.moveTo(-s * 0.38, 0); ctx.lineTo(-s * 0.62, -s * 0.06); ctx.lineTo(-s * 0.6, s * 0.12); ctx.closePath(); ctx.fill(); ctx.stroke();
  // beak and eye
  ctx.fillStyle = '#f2b84b';
  ctx.beginPath(); ctx.moveTo(s * 0.5, -s * 0.08); ctx.lineTo(s * 0.72, -s * 0.03); ctx.lineTo(s * 0.5, s * 0.02); ctx.closePath(); ctx.fill();
  ctx.lineWidth = Math.max(0.8, s * 0.04); ctx.stroke();
  ctx.fillStyle = '#2b211c';
  ctx.beginPath(); ctx.arc(s * 0.4, -s * 0.1, Math.max(0.8, s * 0.035), 0, Math.PI * 2); ctx.fill();
}

/** fx.custom effect: dive from (sx, sy) to the target (tx, ty) in DIVE seconds, then climb away off the side. */
export class GullSwoop {
  constructor(sx, sy, tx, ty, size, reduced = false) {
    this.sx = sx; this.sy = sy; this.tx = tx; this.ty = ty; this.s = size;
    this.dir = tx < sx ? -1 : 1; // fly toward the open side
    this.t = 0;
    this.reduced = reduced;
  }
  update(dt) { this.t += dt; return this.t < DIVE + AWAY; }
  draw(ctx) {
    if (this.reduced) return;
    const t = this.t;
    let x, y, ang, flap, a = 1;
    if (t < DIVE) { // dive: wings tucked, nose down
      const p = t / DIVE, e = p * p;
      x = this.sx + (this.tx - this.sx) * e;
      y = this.sy + (this.ty - this.s * 0.3 - this.sy) * e;
      ang = Math.atan2(this.ty - this.sy, (this.tx - this.sx) || this.dir * 1e-3);
      flap = 0.7;
    } else { // climb away: wings beating, out over the side of the board
      const p = (t - DIVE) / AWAY, e = 1 - (1 - p) * (1 - p);
      x = this.tx + this.dir * this.s * 4 * e;
      y = this.ty - this.s * 0.3 - this.s * 9 * e + Math.sin(p * Math.PI) * this.s * 0.4;
      ang = this.dir > 0 ? -0.55 * (1 - p * 0.5) : Math.PI + 0.55 * (1 - p * 0.5);
      flap = Math.sin(t * 34);
      a = p > 0.7 ? (1 - p) / 0.3 : 1;
    }
    ctx.globalAlpha = Math.max(0, a);
    ctx.translate(x, y);
    // keep the gull upright: mirror instead of rotating past vertical
    const flip = Math.cos(ang) < 0;
    if (flip) { ctx.scale(-1, 1); ang = Math.PI - ang; }
    ctx.rotate(Math.max(-1.1, Math.min(1.1, ang)));
    drawGull(ctx, this.s, flap);
  }
}

export const GULL_DIVE = DIVE;
// Café colours for the snatch puff: white feathers, cream and a little seafoam, no fire
export const GULL_PUFF = ['#ffffff', '#fff3df', '#cfe8e2'];
