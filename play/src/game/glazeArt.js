// Sugar glaze overlay (Journey blocker from chapter 11, DESIGN.md "Sugar-glazed pieces"). Presentation only.
// A glossy white icing cap with three soft drips over the top of the piece, drawn on top of any skin (round orbs,
// free-standing pack pieces, Calm). It stays above the tier number (drips run down the sides) so the piece can
// still be read at a glance. The outline keeps it readable on light pieces and light scenes.
// crack 0..1: the cap splits in two and the halves drift apart and fade (Calm / reduced motion: no crack anim,
// the game just stops drawing the glaze).

/** Icing cap path centred on (0,0) for a piece of half-size h. */
function capPath(ctx, h) {
  // the cap sits on the piece's top third so the tier number stays readable (UX_MECHANICS P7)
  const w = h * 0.84, top = -h * 0.98, base = -h * 0.58;
  ctx.beginPath();
  ctx.moveTo(-w, base);
  ctx.bezierCurveTo(-w, top + h * 0.1, -w * 0.55, top, 0, top);
  ctx.bezierCurveTo(w * 0.55, top, w, top + h * 0.1, w, base);
  // wavy lower edge with three drips (right to left)
  const drips = [[0.62, 0.5], [0.02, 0.1], [-0.6, 0.6]]; // side drips run down the sides, the middle one stops above the number
  let x = w;
  for (const [dx, len] of drips) {
    const cx = dx * h, dw = h * 0.12;
    ctx.quadraticCurveTo((x + cx + dw) / 2, base + h * 0.12, cx + dw, base + h * 0.04);
    ctx.lineTo(cx + dw, base + len * h - dw);
    ctx.arc(cx, base + len * h - dw, dw, 0, Math.PI);
    ctx.lineTo(cx - dw, base + h * 0.04);
    x = cx - dw;
  }
  ctx.quadraticCurveTo((x - w) / 2, base + h * 0.12, -w, base);
  ctx.closePath();
}

function drawCap(ctx, h) {
  capPath(ctx, h);
  const g = ctx.createLinearGradient(0, -h * 0.98, 0, h * 0.4);
  g.addColorStop(0, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.6, 'rgba(250,250,255,0.86)');
  g.addColorStop(1, 'rgba(228,236,250,0.8)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = Math.max(1, h * 0.05);
  ctx.strokeStyle = 'rgba(84,100,134,0.75)'; // a firmer edge so the cap reads on light wood
  ctx.stroke();
  // glossy highlight
  ctx.fillStyle = 'rgba(255,255,255,1)';
  ctx.beginPath();
  ctx.ellipse(-h * 0.36, -h * 0.76, h * 0.2, h * 0.07, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // sugar sparkles
  ctx.fillStyle = 'rgba(150,190,235,0.95)';
  for (const [sx, sy, sr] of [[0.3, -0.78, 0.05], [0.5, -0.58, 0.04], [-0.12, -0.6, 0.04]]) {
    ctx.beginPath(); ctx.arc(sx * h, sy * h, sr * h, 0, Math.PI * 2); ctx.fill();
  }
}

/**
 * Draw the glaze over a piece at the current origin. h: half the cell size (CSS px). alpha: 0..1 (fade).
 * crack: 0 = whole cap, >0 = the cracking animation's progress.
 */
export function drawGlaze(ctx, h, alpha = 1, crack = 0) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha *= Math.min(1, alpha);
  if (crack <= 0) {
    // a faint frosted wash over the whole piece so a glazed piece reads as "set" at a glance
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; // light, so the number underneath keeps its contrast
    ctx.beginPath(); ctx.arc(0, 0, h * 0.8, 0, Math.PI * 2); ctx.fill();
    // a glossy sheen along the lower edge: the whole piece is coated
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = Math.max(1, h * 0.07);
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, 0, h * 0.78, Math.PI * 0.2, Math.PI * 0.8); ctx.stroke();
    drawCap(ctx, h);
  } else {
    const p = Math.min(1, crack);
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.globalAlpha *= 1 - p;
      ctx.translate(side * p * h * 0.45, p * p * h * 0.5);
      ctx.rotate(side * p * 0.5);
      ctx.beginPath();
      // jagged split down the middle
      ctx.moveTo(0, -h * 1.2);
      ctx.lineTo(side * h * 0.08, -h * 0.6); ctx.lineTo(-side * h * 0.06, -h * 0.25); ctx.lineTo(side * h * 0.05, h * 0.7);
      ctx.lineTo(side * h * 1.2, h * 0.7); ctx.lineTo(side * h * 1.2, -h * 1.2);
      ctx.closePath();
      ctx.clip();
      drawCap(ctx, h);
      ctx.restore();
    }
  }
  ctx.restore();
}
