// Koi Pond piece effects (visual only: no rules, scores or timings change).
// MERGE: water bubbles coalesce like droplets. Members stretch toward the anchor while a liquid neck (a
// metaball bridge) joins them, the merged bubble lands wide and jelly-settles, then the new fish swims in.
// POP: only when a piece is destroyed without merging (comet, Meteor Shower, supernova blast, revive clear).
// The glass overstretches, the rim breaks into a ring of droplets, a few drops fling out and fall, and a
// splash ring spreads. Calm: shorter and softer, no flung drops.
// Both are per-skin hooks on the koi FREEFORM entry in orbArt.js; game.js calls them through skinFx(skin).
// Effects draw through Effects.custom(), under the generic particles, so any combo skin layers on top.
// Deterministic: pseudo-random spread comes from a generator seeded by the piece id, never the global RNG.

import { BUBBLE, koiColor } from './koiArt.js';
import { Ease } from './tween.js';

const TAU = Math.PI * 2;
export const POP_RING_DROPS = 12;
export const POP_FLUNG_DROPS = 6;
export const POP_RING_DROPS_CALM = 8;
/** Most droplets one pop can ever draw (ring + flung). */
export const POP_MAX_DROPS = POP_RING_DROPS + POP_FLUNG_DROPS;

const hexRgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgba = ([r, g, b], a) => `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
const RIM = [200, 248, 255];
const DEEP = [16, 84, 124];

/** Tiny deterministic generator from an integer seed (mulberry32). */
function seeded(seed) {
  let a = (seed | 0) ^ 0x9e3779b9;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ------------------------------------------------------------------ metaball neck
/**
 * Liquid bridge between circle 1 (x1, y1, r1) and circle 2: the classic metaball connector. Returns the four
 * contact points and bezier handles, or null when the circles are too far apart or one swallows the other.
 * v = spread (0..1), how wide the neck meets each circle.
 */
export function metaballNeck(x1, y1, r1, x2, y2, r2, v = 0.5, handle = 2.4) {
  const d = Math.hypot(x2 - x1, y2 - y1);
  const maxDist = r1 + r2 * 2.5;
  if (!(d > Math.abs(r1 - r2)) || d > maxDist || r1 <= 0 || r2 <= 0) return null;
  const clampAcos = (x) => Math.acos(Math.max(-1, Math.min(1, x)));
  const u1 = d < r1 + r2 ? clampAcos((r1 * r1 + d * d - r2 * r2) / (2 * r1 * d)) : 0;
  const u2 = d < r1 + r2 ? clampAcos((r2 * r2 + d * d - r1 * r1) / (2 * r2 * d)) : 0;
  const ac = Math.atan2(y2 - y1, x2 - x1);
  const spread = clampAcos((r1 - r2) / d);
  const a1 = ac + u1 + (spread - u1) * v, a2 = ac - u1 - (spread - u1) * v;
  const a3 = ac + Math.PI - u2 - (Math.PI - u2 - spread) * v, a4 = ac - Math.PI + u2 + (Math.PI - u2 - spread) * v;
  const pt = (cx, cy, a, rr) => [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
  const p1 = pt(x1, y1, a1, r1), p2 = pt(x1, y1, a2, r1), p3 = pt(x2, y2, a3, r2), p4 = pt(x2, y2, a4, r2);
  const total = r1 + r2;
  const d2 = Math.min(v * handle, Math.hypot(p3[0] - p1[0], p3[1] - p1[1]) / total) * Math.min(1, (d * 2) / total);
  const h1 = pt(p1[0], p1[1], a1 - Math.PI / 2, r1 * d2), h2 = pt(p2[0], p2[1], a2 + Math.PI / 2, r1 * d2);
  const h3 = pt(p3[0], p3[1], a3 + Math.PI / 2, r2 * d2), h4 = pt(p4[0], p4[1], a4 - Math.PI / 2, r2 * d2);
  return { p1, p2, p3, p4, h1, h2, h3, h4, d };
}

/** The liquid neck(s) between merging bubbles, tracked live from their visuals for the slide. */
class Neck {
  constructor(pairs, geo, dur, soft, tint) {
    this.pairs = pairs; this.geo = geo; this.dur = dur; this.soft = soft; this.tint = tint; this.t = 0;
  }
  update(dt) { this.t += dt; return this.t < this.dur + 0.04; }
  draw(ctx) {
    const p = Math.min(1, this.t / this.dur);
    const fade = (this.soft ? 0.55 : 1) * Math.min(1, p * 6) * (1 - Math.max(0, p - 0.8) / 0.25);
    if (fade <= 0.01) return;
    for (const [m, a] of this.pairs) {
      const [x1, y1] = this.geo.pos(m), [x2, y2] = this.geo.pos(a);
      const r1 = this.geo.rad(m) * BUBBLE, r2 = this.geo.rad(a) * BUBBLE;
      // the bridge thickens as the drops close in (surface tension pulling them together)
      const n = metaballNeck(x1, y1, r1, x2, y2, r2, 0.42 + 0.3 * p);
      if (!n) continue;
      ctx.beginPath();
      ctx.moveTo(n.p1[0], n.p1[1]);
      ctx.bezierCurveTo(n.h1[0], n.h1[1], n.h3[0], n.h3[1], n.p3[0], n.p3[1]);
      ctx.lineTo(n.p4[0], n.p4[1]);
      ctx.bezierCurveTo(n.h4[0], n.h4[1], n.h2[0], n.h2[1], n.p2[0], n.p2[1]);
      ctx.closePath();
      ctx.globalAlpha = fade * 0.9;
      ctx.fillStyle = rgba([120, 214, 240], 0.32);
      ctx.fill();
      ctx.globalAlpha = fade * 0.6;
      ctx.fillStyle = rgba(this.tint, 0.14);
      ctx.fill();
      // the two concave surfaces: dark hairline outside, bright aqua inside, like the bubble rim
      ctx.lineCap = 'round';
      for (const [w, col] of [[Math.max(1, r1 * 0.055), rgba([4, 24, 44], 0.3)], [Math.max(1, r1 * 0.032), rgba(RIM, 0.9)]]) {
        ctx.globalAlpha = fade;
        ctx.lineWidth = w; ctx.strokeStyle = col;
        ctx.beginPath(); ctx.moveTo(n.p1[0], n.p1[1]); ctx.bezierCurveTo(n.h1[0], n.h1[1], n.h3[0], n.h3[1], n.p3[0], n.p3[1]); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(n.p4[0], n.p4[1]); ctx.bezierCurveTo(n.h4[0], n.h4[1], n.h2[0], n.h2[1], n.p2[0], n.p2[1]); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }
}

/** A faint water ripple spreading from a settled merge (no droplets: nothing popped). */
class Ripple {
  constructor(x, y, r, soft, tint) { this.x = x; this.y = y; this.r = r; this.soft = soft; this.tint = tint; this.t = 0; this.dur = soft ? 0.32 : 0.42; }
  update(dt) { this.t += dt; return this.t < this.dur; }
  draw(ctx) {
    const p = this.t / this.dur, e = 1 - Math.pow(1 - p, 3);
    const a = (this.soft ? 0.22 : 0.4) * (1 - p);
    ctx.lineWidth = Math.max(1, this.r * 0.07 * (1 - p));
    ctx.strokeStyle = rgba(RIM, a);
    ctx.beginPath(); ctx.arc(this.x, this.y, this.r * (0.95 + 0.45 * e), 0, TAU); ctx.stroke();
    ctx.strokeStyle = rgba(this.tint, a * 0.6);
    ctx.lineWidth = Math.max(0.8, this.r * 0.035 * (1 - p));
    ctx.beginPath(); ctx.arc(this.x, this.y, this.r * (0.85 + 0.3 * e), 0, TAU); ctx.stroke();
  }
}

export const koiMergeFx = {
  /** Slide targets for the members: drops keep their volume (no shrink-and-fade like the orb skins). */
  target(isAnchor, reduced) {
    if (isAnchor) return { s: reduced ? 1.02 : 1.06, a: 1 };
    return { s: reduced ? 0.86 : 0.8, a: 1 };
  },
  /**
   * The slide has started. members: [{ v, anchor }], geo: { pos(v) → [x, y], rad(v) → piece radius },
   * dur: the slide time (unchanged). Members stretch toward the anchor; a neck joins each to it.
   */
  slide({ fx, tw, members, geo, dur, reduced, tier }) {
    const anchorEnt = members.find((m) => m.anchor);
    if (!anchorEnt) return;
    const a = anchorEnt.v;
    const pairs = [];
    let ax = 0, ay = 0;
    for (const m of members) {
      if (m.anchor || !m.v) continue;
      pairs.push([m.v, a]);
      const dx = a.c - m.v.c, dy = a.r - m.v.r;
      ax += Math.abs(dx); ay += Math.abs(dy);
      if (!reduced) {
        const horiz = Math.abs(dx) >= Math.abs(dy);
        tw.to(m.v, horiz ? { sx: 1.2, sy: 0.86 } : { sx: 0.86, sy: 1.2 }, dur, Ease.outQuad);
      }
    }
    // the anchor leans toward its partners a little (only when they all come from one axis)
    if (!reduced && pairs.length && (ax === 0 || ay === 0)) {
      tw.to(a, ax > 0 ? { sx: 1.08, sy: 0.95 } : { sx: 0.95, sy: 1.08 }, dur, Ease.outQuad);
    }
    // members' fish fade back as their water joins the anchor's
    for (const [m] of pairs) { m.fishS = 1; tw.to(m, { fishS: 0.55 }, dur, Ease.inQuad); }
    if (pairs.length && fx && fx.custom) fx.custom(new Neck(pairs, geo, dur, !!reduced, hexRgb(koiColor(tier || 1))));
  },
  /**
   * The merged piece nv appears at (x, y), piece radius r: it lands wide, jelly-settles (outElastic) and the
   * new fish swims in just after the water. Replaces the default scale-up pop and white flash.
   */
  form(nv, { fx, tw, x, y, r, reduced }) {
    nv.fishS = 0;
    if (reduced) {
      nv.s = 0.94; nv.flash = 0.12;
      tw.to(nv, { s: 1 }, 0.22, Ease.outQuad);
      tw.to(nv, { flash: 0 }, 0.2, Ease.outQuad);
      tw.to(nv, { fishS: 1 }, 0.24, Ease.outQuad, 0.04);
    } else {
      nv.s = 1.03; nv.sx = 1.17; nv.sy = 0.85; nv.flash = 0.3;
      tw.to(nv, { s: 1 }, 0.22, Ease.outQuad);
      tw.to(nv, { sx: 1, sy: 1 }, 0.6, Ease.outElastic);
      tw.to(nv, { flash: 0 }, 0.24, Ease.outQuad);
      tw.to(nv, { fishS: 1 }, 0.3, Ease.outBack, 0.08);
    }
    if (fx && fx.custom) fx.custom(new Ripple(x, y, r * BUBBLE, !!reduced, hexRgb(koiColor(nv.tier || 1))));
  },
};

// ------------------------------------------------------------------ pop
/**
 * Droplet-burst pop, centred (x, y) with bubble radius R. Everything is in R units so it reads the same at
 * any board size. Normal compositing (water is not light).
 */
export class BubblePop {
  constructor(x, y, R, tier, seed, reduced) {
    this.x = x; this.y = y; this.R = R; this.reduced = !!reduced; this.t = 0;
    this.tint = hexRgb(koiColor(tier || 1));
    this.dur = reduced ? 0.3 : 0.62;
    const rnd = seeded(seed * 7919 + tier);
    const n = reduced ? POP_RING_DROPS_CALM : POP_RING_DROPS;
    const off = rnd() * TAU;
    // the rim breaks into a ring of beads that fly outward and slow down
    this.ring = [];
    for (let i = 0; i < n; i++) {
      const a = off + (i / n) * TAU + (rnd() - 0.5) * 0.25;
      this.ring.push({ a, sp: (reduced ? 0.4 : 0.75) + rnd() * 0.35, s: 0.065 + rnd() * 0.045 });
    }
    // a few drops flung up and out that fall back with gravity
    this.drops = [];
    if (!reduced) {
      for (let i = 0; i < POP_FLUNG_DROPS; i++) {
        const a = -Math.PI / 2 + (rnd() - 0.5) * 2.6;
        const sp = 4.6 + rnd() * 2.4;
        this.drops.push({ x: Math.cos(a), y: Math.sin(a), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1.2, s: 0.09 + rnd() * 0.06, life: 0.5 + rnd() * 0.12 });
      }
    }
  }
  /** Droplets this pop can draw (ring + flung). */
  get count() { return this.ring.length + this.drops.length; }
  update(dt) {
    this.t += dt;
    const G = 24; // gravity in R/s²: the flung drops crest and visibly fall back within their half-second life
    for (const d of this.drops) { d.vy += G * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.vx *= Math.exp(-1.5 * dt); }
    return this.t < this.dur;
  }
  draw(ctx) {
    const { x, y, R, t } = this;
    const k = this.reduced ? 0.6 : 1;
    // 1) the film itself: a bright overstretched ghost of the glass for the first instant
    const flashT = this.reduced ? 0.06 : 0.08;
    if (t < flashT) {
      const p = t / flashT;
      ctx.lineWidth = Math.max(1, R * 0.06 * (1 - p));
      ctx.strokeStyle = rgba(RIM, 0.85 * (1 - p) * k);
      ctx.beginPath(); ctx.ellipse(x, y, R * (1.04 + 0.1 * p), R * (0.98 + 0.06 * p), 0, 0, TAU); ctx.stroke();
      ctx.fillStyle = rgba([180, 240, 255], 0.16 * (1 - p) * k);
      ctx.fill();
    }
    // 2) splash ring: a thin wave that runs out to ~1.7R and thins away
    const sp = Math.min(1, t / (this.reduced ? 0.26 : 0.4));
    if (sp < 1) {
      const e = 1 - Math.pow(1 - sp, 3);
      ctx.lineWidth = Math.max(0.8, R * 0.1 * (1 - sp));
      ctx.strokeStyle = rgba(RIM, 0.7 * (1 - sp) * k);
      ctx.beginPath(); ctx.arc(x, y, R * (1 + 0.7 * e * k), 0, TAU); ctx.stroke();
      ctx.strokeStyle = rgba(this.tint, 0.35 * (1 - sp) * k);
      ctx.lineWidth = Math.max(0.6, R * 0.03 * (1 - sp));
      ctx.beginPath(); ctx.arc(x, y, R * (0.9 + 0.5 * e * k), 0, TAU); ctx.stroke();
    }
    // 3) the rim tears: short arcs retract into beads that fly out
    const rt = t / (this.reduced ? 0.28 : 0.42);
    if (rt < 1) {
      const n = this.ring.length;
      const tear = Math.max(0, 1 - rt * 5); // arcs for the first fifth, beads after
      for (const b of this.ring) {
        const dist = R * (1 + b.sp * (1 - Math.pow(1 - rt, 2)));
        const fade = 1 - Math.pow(rt, 1.6);
        const s = R * b.s * (1 - 0.4 * rt);
        const bx = x + Math.cos(b.a) * dist, by = y + Math.sin(b.a) * dist;
        if (tear > 0) {
          const span = (TAU / n) * 0.45 * tear;
          ctx.lineCap = 'round';
          ctx.lineWidth = Math.max(1, R * 0.05);
          ctx.strokeStyle = rgba(RIM, 0.9 * fade * k);
          ctx.beginPath(); ctx.arc(x, y, dist, b.a - span, b.a + span); ctx.stroke();
        }
        drop(ctx, bx, by, s, b.a, 1 + 0.6 * tear, fade * k, this.tint);
      }
    }
    // 4) flung drops: teardrops stretched along their velocity, falling and fading
    for (const d of this.drops) {
      if (t > d.life) continue;
      const f = 1 - t / d.life;
      const v = Math.hypot(d.vx, d.vy);
      drop(ctx, x + d.x * R, y + d.y * R, R * d.s * (0.6 + 0.4 * f), Math.atan2(d.vy, d.vx), 1 + Math.min(1.2, v * 0.14), Math.min(1, f * 1.6), this.tint);
    }
    ctx.globalAlpha = 1;
  }
}

/** One water droplet: body, dark edge (readable on bright scenery) and a specular dot. */
function drop(ctx, x, y, s, ang, stretch, a, tint) {
  if (a <= 0.01 || s <= 0.2) return;
  ctx.save();
  ctx.translate(x, y); ctx.rotate(ang);
  ctx.globalAlpha = a;
  ctx.beginPath(); ctx.ellipse(0, 0, s * stretch, s, 0, 0, TAU);
  ctx.fillStyle = rgba([186, 238, 252], 0.75); ctx.fill();
  ctx.lineWidth = Math.max(0.6, s * 0.28); ctx.strokeStyle = rgba(DEEP, 0.45); ctx.stroke();
  ctx.fillStyle = rgba(tint, 0.18); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath(); ctx.arc(-s * 0.3 * stretch, -s * 0.3, s * 0.32, 0, TAU); ctx.fill();
  ctx.restore();
}

/**
 * A piece destroyed without merging. v is its visual; dur the removal time the caller already uses (kept, so
 * timings don't change). Returns a promise that settles when the visual can be deleted.
 */
export function koiPopFx({ fx, tw, v, x, y, r, dur, reduced, sfx }) {
  const R = r * BUBBLE;
  const burst = () => {
    v.bare = true; // the glass is gone: only the fish is left, and it fades
    if (fx && fx.custom) fx.custom(new BubblePop(x, y, R * (v.s || 1), v.tier, v.id | 0, reduced));
    if (sfx) sfx('bubble', { tier: v.tier });
  };
  const pre = reduced ? 0 : Math.min(0.05, dur * 0.3); // a quick overstretch before the film snaps
  v.flash = 0;
  if (pre > 0) {
    return tw.to(v, { sx: 1.12, sy: 0.92 }, pre, Ease.outQuad).then(() => {
      burst();
      // the fish fades early (outQuad) while it shrinks late: the pop reads at once, total time unchanged
      const rest = Math.max(0.05, dur - pre);
      tw.to(v, { s: (v.s || 1) * 0.85, sx: 1, sy: 1 }, rest, Ease.inQuad);
      return tw.to(v, { a: 0 }, rest, Ease.outQuad);
    });
  }
  burst();
  tw.to(v, { s: (v.s || 1) * 0.9 }, dur, Ease.inQuad);
  return tw.to(v, { a: 0 }, dur, Ease.outQuad);
}
