// Juice: particles, shockwave rings, floating score text, banners, screen shake, flashes.
// All coordinates are CSS pixels.
import { cozyText, pageLook } from '../ui/copy.js'; // canvas text skips the DOM word pass, so banners convert here

const MAX_PARTICLES = 520;
// soft budget: once this many particles are alive, new bursts are halved so big chains
// stay readable instead of piling up (success-graded juice, Wave E)
const SOFT_PARTICLES = 320;
// skin effect objects alive at once (each Koi pop is one, at most 18 droplets)
export const MAX_CUSTOM = 32;
const FONT = 'Fredoka, "Baloo 2", system-ui, -apple-system, "Segoe UI", sans-serif';
/** Worded floating texts stay at least this long (docs/UX_MECHANICS.md P6). */
export const WORD_MIN_DUR = 1.6;
/** The HUD text-size factor (CSS --tsh): 1 at 100%, 1.3 at 150% text size. */
export function hudTextFactor() {
  try {
    const ts = parseFloat(globalThis.document && document.documentElement.style.getPropertyValue('--ts'));
    return ts > 1 ? 1 + (ts - 1) * 0.6 : 1;
  } catch { return 1; }
}

/**
 * Extra particle shapes (combo skins, src/game/fxSkins.js): type -> draw(ctx, p, s), drawn at the particle's
 * position (already translated and rotated). 'star' and 'dot' are built in.
 */
export const PARTICLE_TYPES = {};
export function registerParticleType(type, draw) { PARTICLE_TYPES[type] = draw; }

export class Effects {
  constructor() {
    this.particles = [];
    this.rings = [];
    this.texts = [];
    this.banners = [];
    this.shakeAmt = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.flashA = 0;
    this.flashColor = '#fff';
    this.time = 0;
    this.reduced = false;
    this.glows = [];
    this.flyers = [];
    this.customs = [];
    this.stopT = 0;
  }

  /**
   * A self-drawing effect from a skin hook (e.g. a Koi bubble pop): obj.update(dt) returns false when done,
   * obj.draw(ctx) paints in world space. Drawn before the generic particles, so combo skins layer on top.
   * Capped: past MAX_CUSTOM the oldest is dropped.
   */
  custom(obj) {
    if (!obj || typeof obj.update !== 'function' || typeof obj.draw !== 'function') return null;
    if (this.customs.length >= MAX_CUSTOM) this.customs.shift();
    this.customs.push(obj);
    return obj;
  }

  clear() {
    this.particles.length = 0;
    this.rings.length = 0;
    this.texts.length = 0;
    this.banners.length = 0;
    this.glows.length = 0;
    this.flyers.length = 0;
    this.customs.length = 0;
    this.shakeAmt = 0;
    this.flashA = 0;
    this.stopT = 0;
  }

  /** Soft additive bloom at an impact point (one-shot, never strobes). */
  glow(x, y, color, r = 60, dur = 0.35, alpha = 0.55) {
    if (this.reduced) alpha *= 0.45;
    this.glows.push({ x, y, color, r, t: 0, dur, alpha });
  }

  /**
   * Motes that fly from a world point to a screen point (e.g. a HUD counter).
   * onArrive fires once, when the first mote lands.
   */
  fly(x, y, tx, ty, color, count = 5, onArrive = null) {
    if (this.reduced) count = Math.max(2, Math.ceil(count * 0.5));
    const group = { done: false, onArrive };
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spread = 30 + Math.random() * 40;
      this.flyers.push({
        x0: x, y0: y, tx, ty,
        cx: x + Math.cos(ang) * spread, cy: y + Math.sin(ang) * spread - 50,
        t: -i * 0.045, dur: 0.5 + Math.random() * 0.15,
        color: Array.isArray(color) ? color[i % color.length] : color,
        size: 3 + Math.random() * 2, group,
      });
    }
  }

  /** Brief slow-motion "hit-stop" that sells a big impact. */
  hitStop(sec) {
    if (this.reduced) sec *= 0.5;
    this.stopT = Math.min(0.14, Math.max(this.stopT, sec));
  }

  /** Real dt -> game dt (slowed during hit-stop). */
  scaleDt(dt) {
    if (this.stopT > 0) { this.stopT -= dt; return dt * 0.12; }
    return dt;
  }

  burst(x, y, color, count = 18, speed = 220, size = 4, opts = {}) {
    if (this.reduced) count = Math.ceil(count * 0.45);
    if (this.particles.length > SOFT_PARTICLES) count = Math.ceil(count * 0.5);
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) this.particles.shift();
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.35 + Math.random() * 0.8);
      const life = (opts.life || 0.7) * (0.6 + Math.random() * 0.6);
      this.particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - (opts.up || 0),
        g: opts.gravity ?? 260,
        drag: opts.drag ?? 2.2,
        life, max: life,
        size: size * (0.5 + Math.random() * 0.9),
        color: Array.isArray(color) ? color[(Math.random() * color.length) | 0] : color,
        type: opts.type ? (Array.isArray(opts.type) ? opts.type[(Math.random() * opts.type.length) | 0] : opts.type) : (Math.random() < 0.3 ? 'star' : 'dot'),
        spin: (Math.random() - 0.5) * (opts.spin ?? 10),
        rot: Math.random() * 6,
        blend: opts.blend || 'lighter', // combo skins: 'source-over' for solid shapes (petals, paws)
        sway: opts.sway ? opts.sway * (0.5 + Math.random()) : 0, // side-to-side drift (petals)
        prev: opts.link ? (i > 0 ? this.particles[this.particles.length - 1] : null) : null, // constellation lines
      });
    }
  }

  /** small upward sparkle trail */
  sparkle(x, y, color, count = 6) {
    this.burst(x, y, color, count, 90, 2.5, { gravity: -40, life: 0.6, type: 'star' });
  }

  /** opts: { squash (ellipse height, 1 = circle), delay (s), still (no growth and no thinning: it only fades; safe
   * under Calm / reduced motion) } */
  ring(x, y, color, maxR = 80, dur = 0.45, width = 6, opts = {}) {
    this.rings.push({ x, y, color, r: 0, maxR, t: -(opts.delay || 0), dur, width, squash: opts.squash || 1, still: !!opts.still });
  }

  /**
   * A floating canvas text. Sizes grow with the player's text size like the HUD (×1.3 at 150%, docs/UX_MECHANICS.md
   * P6), and any text with words (not just numbers) stays at least WORD_MIN_DUR s so it can be read.
   * opts.flair: a celebratory call-out (TRIPLE!, a tier name) that keeps its short time.
   */
  text(x, y, str, color = '#fff', size = 22, opts = {}) {
    str = cozyText(str, pageLook());
    let dur = opts.dur || 1.0;
    if (!opts.flair && /[A-Za-z]{2}/.test(str)) dur = Math.max(dur, WORD_MIN_DUR);
    this.texts.push({ x, y, str, color, size: size * hudTextFactor(), t: 0, dur, vy: opts.vy || -70, stroke: opts.stroke || 'rgba(10,6,30,0.85)' });
  }

  banner(str, color = '#fff', sub = '', opts = {}) {
    // replace older banners so they never stack unreadably
    this.banners.length = 0;
    const look = pageLook();
    str = cozyText(str, look);
    sub = cozyText(sub, look);
    // opts.style (combo skins): { stroke, top, glow, plate(ctx, textWidth, size, banner) } - the dark stroke stays for legibility
    this.banners.push({ str, sub, color, t: 0, dur: opts.dur || 1.1, size: opts.size || 1, y: opts.y ?? 0.36, style: opts.style || null });
  }

  /** Seconds until the banner showing now has gone (0 when none): lets a note wait its turn. */
  bannerLeft() {
    let left = 0;
    for (const b of this.banners) left = Math.max(left, b.dur - b.t);
    return left;
  }

  shake(amount) {
    if (this.reduced) amount *= 0.35;
    this.shakeAmt = Math.min(24, Math.max(this.shakeAmt, amount));
  }

  flash(color = '#fff', alpha = 0.5) {
    if (this.reduced) alpha *= 0.25;
    this.flashColor = color;
    this.flashA = Math.max(this.flashA, alpha);
  }

  update(dt) {
    this.time += dt;
    const ps = this.particles;
    let w = 0;
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      p.life -= dt;
      if (p.life <= 0) continue;
      const d = Math.exp(-p.drag * dt);
      p.vx *= d; p.vy = p.vy * d + p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.rot += p.spin * dt;
      if (p.sway) p.x += Math.cos(p.rot * 0.7) * p.sway * dt;
      ps[w++] = p;
    }
    ps.length = w;

    this.rings = this.rings.filter((r) => (r.t += dt) < r.dur);
    this.texts = this.texts.filter((t) => (t.t += dt) < t.dur);
    this.banners = this.banners.filter((b) => (b.t += dt) < b.dur);
    this.glows = this.glows.filter((g) => (g.t += dt) < g.dur);
    if (this.customs.length) this.customs = this.customs.filter((c) => { try { return c.update(dt) !== false; } catch (_) { return false; } });
    if (this.flyers.length) {
      const keep = [];
      for (const f of this.flyers) {
        f.t += dt;
        if (f.t >= f.dur) {
          if (!f.group.done) { f.group.done = true; try { f.group.onArrive && f.group.onArrive(); } catch (_) { /* ignore */ } }
          continue;
        }
        keep.push(f);
      }
      this.flyers = keep;
    }

    if (this.shakeAmt > 0.1) {
      this.shakeX = (Math.random() * 2 - 1) * this.shakeAmt;
      this.shakeY = (Math.random() * 2 - 1) * this.shakeAmt;
      this.shakeAmt *= Math.exp(-9 * dt);
    } else { this.shakeAmt = 0; this.shakeX = this.shakeY = 0; }
    this.flashA *= Math.exp(-6 * dt);
    if (this.flashA < 0.01) this.flashA = 0;
  }

  /** Draw world-space effects (inside the shaken transform). */
  drawWorld(ctx) {
    // skin effects first (water drops, necks): under the glows, rings and particles
    for (const c of this.customs) { ctx.save(); try { c.draw(ctx); } catch (_) { /* never break the frame */ } ctx.restore(); }
    // impact glows (additive, soft)
    if (this.glows.length) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const g of this.glows) {
        const p = g.t / g.dur;
        const r = g.r * (0.6 + 0.5 * (1 - Math.pow(1 - p, 2)));
        const rg = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, r);
        rg.addColorStop(0, g.color);
        rg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = g.alpha * (1 - p) * (1 - p);
        ctx.fillStyle = rg;
        ctx.beginPath(); ctx.arc(g.x, g.y, r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
    // rings
    for (const r of this.rings) {
      if (r.t < 0) continue;
      const p = r.t / r.dur;
      const e = r.still ? 1 : 1 - Math.pow(1 - p, 3);
      ctx.save();
      ctx.globalAlpha = (1 - p) * 0.9;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = r.still ? r.width : r.width * (1 - p) + 1;
      ctx.beginPath();
      if (r.squash !== 1) ctx.ellipse(r.x, r.y, r.maxR * e, r.maxR * e * r.squash, 0, 0, Math.PI * 2);
      else ctx.arc(r.x, r.y, r.maxR * e, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    // particles (additive)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    let blend = 'lighter';
    for (const p of this.particles) {
      const a = Math.min(1, p.life / p.max * 1.6);
      if (p.blend !== blend) { blend = p.blend; ctx.globalCompositeOperation = blend; }
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      const s = p.size * (0.5 + 0.5 * (p.life / p.max));
      if (p.prev && p.prev.life > 0) { // constellation: a faint line to the previous star of the burst
        ctx.globalAlpha = a * 0.45;
        ctx.strokeStyle = p.color; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(p.prev.x, p.prev.y); ctx.lineTo(p.x, p.y); ctx.stroke();
        ctx.globalAlpha = a;
      }
      const custom = PARTICLE_TYPES[p.type];
      if (custom) {
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        custom(ctx, p, s);
        ctx.restore();
      } else if (p.type === 'star') {
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.beginPath();
        ctx.moveTo(0, -s * 1.6); ctx.lineTo(s * 0.4, -s * 0.4); ctx.lineTo(s * 1.6, 0); ctx.lineTo(s * 0.4, s * 0.4);
        ctx.lineTo(0, s * 1.6); ctx.lineTo(-s * 0.4, s * 0.4); ctx.lineTo(-s * 1.6, 0); ctx.lineTo(-s * 0.4, -s * 0.4);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      } else {
        ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
    // floating texts
    for (const t of this.texts) {
      const p = t.t / t.dur;
      const pop = p < 0.15 ? 0.6 + (p / 0.15) * 0.55 : p < 0.25 ? 1.15 - ((p - 0.15) / 0.1) * 0.15 : 1;
      ctx.save();
      ctx.globalAlpha = p > 0.65 ? 1 - (p - 0.65) / 0.35 : 1;
      ctx.translate(t.x, t.y + t.vy * p);
      ctx.scale(pop, pop);
      ctx.font = `800 ${t.size}px ${FONT}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(3, t.size * 0.22);
      ctx.strokeStyle = t.stroke;
      ctx.strokeText(t.str, 0, 0);
      ctx.fillStyle = t.color;
      ctx.fillText(t.str, 0, 0);
      ctx.restore();
    }
  }

  /** Draw screen-space overlays (banners, flash). */
  drawScreen(ctx, w, h) {
    // flying motes (screen space so they land exactly on DOM HUD targets)
    if (this.flyers.length) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const f of this.flyers) {
        if (f.t < 0) continue;
        const p = f.t / f.dur;
        const e = p * p * (3 - 2 * p);
        const u = 1 - e;
        const x = u * u * f.x0 + 2 * u * e * f.cx + e * e * f.tx;
        const y = u * u * f.y0 + 2 * u * e * f.cy + e * e * f.ty;
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = f.color;
        ctx.beginPath(); ctx.arc(x, y, f.size * (1 - p * 0.4), 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.35;
        ctx.beginPath(); ctx.arc(x, y, f.size * 2.4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
    for (const b of this.banners) {
      const p = b.t / b.dur;
      let s;
      if (p < 0.18) s = 0.3 + (p / 0.18) * 0.95;
      else if (p < 0.3) s = 1.25 - ((p - 0.18) / 0.12) * 0.25;
      else s = 1 + (p - 0.3) * 0.08;
      const a = p > 0.75 ? 1 - (p - 0.75) / 0.25 : 1;
      const size = Math.min(w * 0.13, 64) * b.size;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(w / 2, h * b.y);
      ctx.rotate(-0.06);
      ctx.scale(s, s);
      ctx.font = `900 ${size}px ${FONT}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      const st = b.style;
      if (st && st.plate) { ctx.save(); st.plate(ctx, ctx.measureText(b.str).width, size, b); ctx.restore(); }
      ctx.shadowColor = (st && st.glow) || b.color; ctx.shadowBlur = size * 0.5;
      ctx.lineWidth = size * 0.2;
      ctx.strokeStyle = (st && st.stroke) || 'rgba(12,6,40,0.9)';
      ctx.strokeText(b.str, 0, 0);
      ctx.shadowBlur = 0;
      const g = ctx.createLinearGradient(0, -size / 2, 0, size / 2);
      g.addColorStop(0, (st && st.top) || '#ffffff'); g.addColorStop(0.55, b.color); g.addColorStop(1, (st && st.bottom) || b.color);
      ctx.fillStyle = g;
      ctx.fillText(b.str, 0, 0);
      if (b.sub) {
        ctx.font = `800 ${size * 0.38}px ${FONT}`;
        ctx.lineWidth = size * 0.1;
        ctx.strokeText(b.sub, 0, size * 0.75);
        ctx.fillStyle = '#fff';
        ctx.fillText(b.sub, 0, size * 0.75);
      }
      ctx.restore();
    }
    if (this.flashA > 0) {
      ctx.save();
      ctx.globalAlpha = this.flashA * (this.flashScale == null ? 1 : this.flashScale); // softer on light scenes (set by the renderer)
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  }
}
