// Canvas renderer: starfield, board, orbs, aim guide, tide counter, effects.
import { drawOrb, drawAsteroid, orbRadiusFactor, tierColor, isFreeform } from './orbArt.js';
import { drawGlaze } from './glazeArt.js';
import { drawTeapot, drawTeapotHint } from './teapotArt.js';
import { drawTin } from './tinArt.js';
import { BACKDROPS, BACKDROP_BY_ID } from './backdrops.js';
import { buildScene } from './sceneArt.js';
import { drawBoardSkin, boardOpaqueRect } from './boardArt.js';
import { flashTint, tallyStyle } from './fxSkins.js';
import { hudTextFactor } from './effects.js';
import { cozyText, pageLook } from '../ui/copy.js';

const BACKDROP_FADE = 1.6; // seconds for a nebula crossfade
// Menu orbs stay out of the bottom footer band (CSS px from the bottom edge, incl. a safe-area allowance) and fade
// over MENU_FOOTER_FADE px before it, so they never sit on the footer text.
const MENU_FOOTER_CLEAR = 90;
const MENU_FOOTER_FADE = 40;

const FONT = 'Fredoka, "Baloo 2", system-ui, -apple-system, "Segoe UI", sans-serif';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.dpr = 1;
    this.w = 0; this.h = 0;
    this.L = null;
    this.stars = [];
    this.nebulaCache = new Map(); // backdrop id -> 1/4-scale canvas (cleared on resize)
    this.sceneCache = new Map();  // sky scene id -> pre-rendered layers (cleared on resize)
    this.sceneT = 12;             // sky scene clock (12 s = the shop preview pose): stops under Calm / reduced motion
    // current nebula + the one fading out (presentation only; Math.random stars, never the game RNG)
    this.backdrop = { id: BACKDROPS[0].id, prev: null, t: 0 };
    this.reduced = false; // Calm / reduced motion: nebula swaps instantly
    this.evening = false; // Evening look: one warm multiply fill per frame (replaces a CSS filter on the canvas)
    this.eveningCalm = false; // wind-down Evening calm: the same fill, a little warmer and dimmer (less blue)
    this.menuOrbs = [];
    this.hideMenuOrbs = false; // true while a Shop scene preview is up
    this.time = 0;
    this.insets = { top: 0, bottom: 0 };
    this.resize();
  }

  resize() {
    // perf: cap at 2x. A 3x iPhone canvas is 2.25x the pixels for the same picture (the scene layers are 1x art)
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, window.innerWidth);
    const h = Math.max(1, window.innerHeight);
    this.dpr = dpr; this.w = w; this.h = h;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.makeStars();
    this.nebulaCache.clear(); // rebuilt lazily at the new size
    this.sceneCache.clear();
    this.makeMenuOrbs();
    this.layout(this.insets.top, this.insets.bottom);
  }

  /** Compute board geometry given the space taken by the DOM HUD (top/bottom, CSS px). */
  layout(top, bottom, cols = 5, rows = 7) {
    this.insets = { top, bottom };
    const W = this.w, H = this.h;
    const avail = Math.max(100, H - top - bottom);
    const aimH = 1.1, tideH = 0.62;
    // 96 px cells max on phones (they never reach it); tablets (both sides >= 700 CSS px) may grow to
    // 124 so the board isn't tiny on an iPad. The canvas is already at device pixels, so it stays crisp.
    const maxCell = W >= 700 && H >= 700 ? 124 : 96;
    const cell = Math.floor(Math.min((W - 20) / cols, avail / (rows + aimH + tideH), maxCell));
    const bw = cell * cols, bh = cell * rows;
    const total = cell * (rows + aimH + tideH);
    const y0 = top + Math.max(0, (avail - total) / 2);
    const bx = Math.round((W - bw) / 2);
    const by = Math.round(y0 + cell * aimH);
    this.L = {
      cols, rows, cell, bx, by, bw, bh,
      aimY: y0 + cell * 0.52,
      tideY: by + bh + cell * 0.36,
    };
    return this.L;
  }

  cellX(c) { return this.L.bx + (c + 0.5) * this.L.cell; }
  cellY(r) { return this.L.by + (r + 0.5) * this.L.cell; }
  /** row value (float) of the aim line in board coordinates */
  aimRow() { return (this.L.aimY - this.L.by) / this.L.cell - 0.5; }

  /** Column under a CSS-px x coordinate (clamped), or -1 if outside the board horizontally. */
  colAt(x, clamp = true) {
    const c = Math.floor((x - this.L.bx) / this.L.cell);
    if (clamp) return Math.max(0, Math.min(this.L.cols - 1, c));
    return c >= 0 && c < this.L.cols ? c : -1;
  }
  cellAt(x, y) {
    const c = Math.floor((x - this.L.bx) / this.L.cell);
    const r = Math.floor((y - this.L.by) / this.L.cell);
    if (c < 0 || c >= this.L.cols || r < 0 || r >= this.L.rows) return null;
    return { r, c };
  }
  inPlayArea(y) {
    return y >= this.L.aimY - this.L.cell * 0.9 && y <= this.L.by + this.L.bh + this.L.cell * 0.4;
  }

  // ------------------------------------------------------------ background

  makeStars() {
    const n = Math.round(Math.min(220, (this.w * this.h) / 3200));
    this.stars = [];
    for (let i = 0; i < n; i++) {
      const z = Math.random();
      this.stars.push({
        x: Math.random() * this.w,
        y: Math.random() * this.h,
        z,
        s: 0.4 + z * 1.6,
        tw: Math.random() * Math.PI * 2,
        // tinted stars: offset from the theme's star hue (theme 0 keeps the old 200–320 range)
        hue: Math.random() < 0.15 ? 1 : 0,
        ho: Math.random() * 120 - 60,
      });
    }
  }

  /** Nebula canvas for a theme, built once per size at 1/4 scale (gradients never run per frame). */
  nebulaFor(id) {
    let c = this.nebulaCache.get(id);
    if (c) return c;
    const theme = BACKDROP_BY_ID[id] || BACKDROPS[0];
    const s = 0.25;
    const w = Math.max(2, Math.round(this.w * s)), h = Math.max(2, Math.round(this.h * s));
    c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    const bg = g.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, theme.grad[0]); bg.addColorStop(0.55, theme.grad[1]); bg.addColorStop(1, theme.grad[2]);
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    for (const [x, y, r, col] of theme.blobs) {
      const rg = g.createRadialGradient(x * w, y * h, 0, x * w, y * h, r * Math.max(w, h));
      rg.addColorStop(0, col); rg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = rg; g.fillRect(0, 0, w, h);
    }
    this.nebulaCache.set(id, c);
    return c;
  }

  /** Switch the background theme: ~1.6 s crossfade, or instant (Calm / reduced motion / boot). */
  setBackdrop(id, { instant = false } = {}) {
    if (!BACKDROP_BY_ID[id]) id = BACKDROPS[0].id;
    const b = this.backdrop;
    if (id === b.id) return;
    if (instant || this.reduced) { b.id = id; b.prev = null; b.t = 0; return; }
    // mid-fade: keep whichever of the two is showing more as the outgoing image
    if (b.prev && b.t / BACKDROP_FADE < 0.5) b.id = b.prev;
    b.prev = id === b.id ? null : b.id;
    b.id = id; b.t = 0;
    this.nebulaFor(id); // build now so the fade starts smoothly
    this.sceneFor(id);
  }

  /** Sky scene layers for a theme (null for plain nebulas), built once per size. */
  sceneFor(id) {
    const theme = BACKDROP_BY_ID[id];
    if (!theme || !theme.scene) return null;
    let s = this.sceneCache.get(id);
    if (!s) {
      s = buildScene(theme, this.w, this.h);
      if (s) s.opaque = sceneCoversScreen(s, this.w, this.h);
      this.sceneCache.set(id, s);
    }
    return s;
  }

  /** One theme: the cached base nebula, plus its scene layers for a sky scene. */
  drawTheme(ctx, id, alpha) {
    if (alpha <= 0) return;
    ctx.globalAlpha = alpha;
    const sc = this.sceneFor(id);
    // perf: a scene that paints every pixel (the harbour) hides the nebula, so skip that full-screen blit
    if (!(sc && sc.opaque && alpha >= 1)) ctx.drawImage(this.nebulaFor(id), 0, 0, this.w, this.h);
    if (sc) sc.draw(ctx, this.sceneT, alpha);
    ctx.globalAlpha = 1;
  }

  makeMenuOrbs() {
    this.menuOrbs = [];
    const n = 9;
    for (let i = 0; i < n; i++) {
      this.menuOrbs.push({
        x: Math.random() * this.w,
        y: Math.random() * this.h,
        r: 14 + Math.random() * 26,
        tier: 1 + ((i * 3) % 10),
        vx: (Math.random() - 0.5) * 14,
        vy: -6 - Math.random() * 14,
        ph: Math.random() * 6,
      });
    }
  }

  drawBackground(ctx, dt, speed = 1) {
    const bd = this.backdrop;
    const theme = BACKDROP_BY_ID[bd.id] || BACKDROPS[0];
    let starHue = theme.starHue;
    let starK = theme.light ? 0 : 1; // light scenes (Seaside harbour) have no drifting space stars
    if (!this.reduced) this.sceneT += dt; // Calm / reduced motion: the scene holds still
    if (bd.prev) {
      bd.t += dt;
      const k = Math.min(1, bd.t / BACKDROP_FADE);
      const e = k * k * (3 - 2 * k); // smoothstep
      const old = BACKDROP_BY_ID[bd.prev] || BACKDROPS[0];
      this.drawTheme(ctx, old.id, 1);
      this.drawTheme(ctx, theme.id, e);
      // shortest way round the hue circle
      const d = ((theme.starHue - old.starHue + 540) % 360) - 180;
      starHue = old.starHue + d * e;
      starK = (old.light ? 0 : 1) * (1 - e) + starK * e;
      if (k >= 1) bd.prev = null;
    } else {
      this.drawTheme(ctx, theme.id, 1);
    }
    const t = this.time;
    if (starK > 0.01) for (const s of this.stars) {
      s.y += (4 + s.z * 22) * dt * speed;
      if (s.y > this.h + 2) { s.y = -2; s.x = Math.random() * this.w; }
      const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * (1 + s.z * 2) + s.tw)) * (0.4 + s.z * 0.6);
      ctx.globalAlpha = a * starK;
      ctx.fillStyle = s.hue ? `hsl(${Math.round(starHue + s.ho)},80%,80%)` : '#fff';
      ctx.fillRect(s.x, s.y, s.s, s.s);
    }
    ctx.globalAlpha = 1;
  }

  // ------------------------------------------------------------ main draw

  draw(dt, view) {
    this.time += dt;
    const ctx = this.ctx;
    const { dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // perf: an opaque board tray (e.g. Driftwood) hides the backdrop behind it, so the backdrop skips that rect
    const hole = view && view.mode === 'game' ? this.boardHole(view) : null;
    if (hole) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, this.w, this.h);
      ctx.rect(hole.x, hole.y, hole.w, hole.h);
      ctx.clip('evenodd');
    }
    this.drawBackground(ctx, dt, view && view.mode === 'game' ? 1 : 0.6);
    if (hole) ctx.restore();

    if (!view || view.mode !== 'game') {
      if (!this.hideMenuOrbs) this.drawMenuOrbs(ctx, dt, view ? view.skin : 'classic');
      if (view && view.fx) {
        view.fx.drawWorld(ctx);
        view.fx.drawScreen(ctx, this.w, this.h);
      }
      this.drawEveningTint(ctx);
      return;
    }

    const fx = view.fx;
    fx.flashScale = (BACKDROP_BY_ID[this.backdrop.id] || {}).light ? 0.45 : 1; // a full-screen flash would wash out a light scene
    ctx.save();
    ctx.translate(fx.shakeX, fx.shakeY);
    this.drawBoard(ctx, view);
    if (view.nextHint && view.nextHint.length) this.drawNextHint(ctx, view);
    this.drawOrbs(ctx, view);
    this.drawAim(ctx, view);
    fx.drawWorld(ctx);
    ctx.restore();
    this.drawTide(ctx, view);
    if (view.cometMode) this.drawCometHint(ctx, view.targetHint);
    if (view.tally) this.drawTally(ctx, view.tally, view.reduced, tallyStyle(view.fxSkin));
    fx.drawScreen(ctx, this.w, this.h);
    this.drawEveningTint(ctx);
  }

  /**
   * The screen rect (CSS px) the board tray paints fully opaque this frame, shrunk by the shake offset and snapped
   * inward to device pixels, or null when the skin is see-through.
   */
  boardHole(view) {
    const r = boardOpaqueRect(view.boardSkin, this.L, this.dpr);
    if (!r) return null;
    const fx = view.fx;
    const m = 1 + Math.ceil(Math.abs(fx ? fx.shakeX : 0)) + Math.ceil(Math.abs(fx ? fx.shakeY : 0));
    const d = this.dpr;
    const x0 = Math.ceil((r.x + m) * d) / d, y0 = Math.ceil((r.y + m) * d) / d;
    const x1 = Math.floor((r.x + r.w - m) * d) / d, y1 = Math.floor((r.y + r.h - m) * d) / d;
    if (x1 - x0 < 40 || y1 - y0 < 40) return null;
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }

  /** Evening look (presentation only): warmer, slightly dimmer picture, drawn as one multiply fill. */
  drawEveningTint(ctx) {
    if (!this.evening) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = this.eveningCalm ? 'rgb(244, 210, 174)' : 'rgb(255, 222, 190)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.restore();
  }

  drawMenuOrbs(ctx, dt, skin) {
    // keep the footer line ("★ 0 stars · Endless best 0", pinned to the bottom of the menu) clear: an orb fades
    // out as its lower edge nears the footer band, so it rises in from below already faded in above it.
    // The canvas doesn't know the safe-area inset, so the band allows for a home-indicator inset (~34 px).
    const footTop = this.h - MENU_FOOTER_CLEAR;
    for (const o of this.menuOrbs) {
      o.x += o.vx * dt; o.y += o.vy * dt;
      if (o.y < -60) { o.y = this.h + 60; o.x = Math.random() * this.w; }
      if (o.x < -60) o.x = this.w + 60; if (o.x > this.w + 60) o.x = -60;
      const y = o.y + Math.sin(this.time + o.ph) * 6;
      const clear = Math.max(0, Math.min(1, (footTop - (y + o.r)) / MENU_FOOTER_FADE));
      if (clear <= 0) continue;
      ctx.globalAlpha = 0.55 * clear;
      drawOrb(ctx, o.x, y, o.r, o.tier, skin, this.dpr);
    }
    ctx.globalAlpha = 1;
  }

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  drawBoard(ctx, view) {
    // board skins (src/game/boardArt.js): frame, fill, lanes, slot markers, danger line, idle motion
    drawBoardSkin(ctx, view.boardSkin, this.L, view, { time: this.time, reduced: this.reduced, dpr: this.dpr });
  }

  drawOrbs(ctx, view) {
    const L = this.L;
    const half = L.cell / 2;
    const t = this.time;
    const skin = view.skin;
    const look = pageLook();
    ctx.save();
    // clip so tide-row orbs sliding in from below don't draw outside the board
    ctx.beginPath();
    ctx.rect(L.bx - L.cell, L.aimY - L.cell, L.bw + L.cell * 2, L.by + L.bh + L.cell * 0.12 - (L.aimY - L.cell));
    ctx.clip();
    for (const v of view.visuals.values()) {
      if (v.a <= 0.01) continue;
      const x = this.cellX(v.c) + (v.ox || 0);
      const y = this.cellY(v.r) + (v.oy || 0);
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, v.a));
      ctx.translate(x, y);
      const sx = v.s * (v.sx ?? 1), sy = v.s * (v.sy ?? 1);
      if (v.rot) ctx.rotate(v.rot);
      ctx.scale(sx, sy);
      if (v.kind === 'asteroid') {
        drawAsteroid(ctx, 0, 0, half * 0.86, v.hp, v.id, this.dpr, look); // café: a gray pebble; Cosmic: an asteroid
      } else if (v.kind === 'teapot') {
        drawTeapot(ctx, half * 0.92, { time: t + v.id, anim: !this.reduced }); // Teapot deliveries (Journey ch13+)
        if (v.a > 0.5) drawTeapotHint(ctx, half * 0.92, 0.6);
      } else if (v.kind === 'tin') {
        drawTin(ctx, half, v.hp); // Cookie tins (Journey ch15+), at full piece size (docs/UX_TINS.md T1)
      } else {
        let r = half * orbRadiusFactor(v.tier);
        if (view.cometMode) r *= 1 + 0.05 * Math.sin(t * 8 + v.c + v.r);
        if (view.warmId != null && v.id === view.warmId && !this.reduced) {
          // Tonight's bake: a soft warm ring under the piece (render-only; none under Calm / reduced motion)
          ctx.save();
          ctx.globalAlpha *= 0.55;
          ctx.strokeStyle = '#ffc27a';
          ctx.lineWidth = Math.max(2, half * 0.12);
          ctx.beginPath(); ctx.arc(0, 0, r * 1.08, 0, Math.PI * 2); ctx.stroke();
          ctx.restore();
        }
        drawOrb(ctx, 0, 0, r, v.tier, skin, this.dpr, { golden: v.golden, wild: v.wild, time: t + v.id, number: view.showNumbers, shape: view.showShapes, anim: !this.reduced, bare: v.bare, fishS: v.fishS });
        if (v.glaze > 0.01) drawGlaze(ctx, half, v.glaze, v.crack || 0); // sugar glaze (Journey blocker)
      }
      if (v.flash > 0.01) {
        // On a light scene (Seaside harbour) an additive white disc washes the piece out completely, so the
        // flash there is a gentle warm glow painted over the piece instead.
        const lightScene = !!(BACKDROP_BY_ID[this.backdrop.id] || {}).light;
        ctx.globalCompositeOperation = lightScene ? 'source-over' : 'lighter';
        ctx.globalAlpha = Math.min(1, v.flash) * ctx.globalAlpha * (lightScene ? 0.55 : 1);
        const soft = lightScene || isFreeform(skin); // free-standing pack pieces: a soft glow, not a hard white disc
        const tint = lightScene ? '255,244,214' : flashTint(view.fxSkin); // combo skin flash tint ('255,255,255' for Stardust)
        if (soft) {
          const gl = ctx.createRadialGradient(0, 0, 0, 0, 0, half * 0.95);
          gl.addColorStop(0, `rgba(${tint},0.9)`); gl.addColorStop(0.5, `rgba(${tint},0.45)`); gl.addColorStop(1, `rgba(${tint},0)`);
          ctx.fillStyle = gl;
        } else ctx.fillStyle = `rgb(${tint})`;
        ctx.beginPath(); ctx.arc(0, 0, half * (soft ? 0.95 : 0.8), 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  drawAim(ctx, view) {
    const L = this.L;
    const aim = view.aim;
    if (!aim || !view.current || view.cometMode) return;
    const x = L.bx + (aim.x + 0.5) * L.cell;
    const y = L.aimY + (aim.dy || 0);
    const col = Math.round(aim.x);
    // guide beam + landing ghost
    const g = view.ghost;
    if (aim.visible && aim.landRow >= 0) {
      const gc = g ? g.col : col;
      const ly = this.cellY(g ? g.row : aim.landRow);
      const gr = ctx.createLinearGradient(0, y, 0, ly);
      gr.addColorStop(0, 'rgba(255,255,255,0.18)');
      gr.addColorStop(1, 'rgba(255,255,255,0.02)');
      ctx.fillStyle = gr;
      ctx.fillRect(this.cellX(gc) - 2, y, 4, ly - y);
      if (g) this.drawGhost(ctx, view, g);
      else {
        ctx.save();
        ctx.globalAlpha = 0.5 + 0.2 * Math.sin(this.time * 6);
        ctx.setLineDash([4, 5]);
        ctx.strokeStyle = tierColor(view.current.tier, view.skin);
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(this.cellX(col), ly, L.cell * 0.36, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
    }
    if (aim.hidden) return;
    const r = (L.cell / 2) * orbRadiusFactor(view.current.tier) * (aim.s ?? 1);
    const bob = Math.sin(this.time * 3) * L.cell * 0.03;
    // the chain tally sits in this band; fade the waiting orb so the numbers stay readable
    if (view.tally) ctx.globalAlpha = 0.3;
    drawOrb(ctx, x, y + bob, r, view.current.tier, view.skin, this.dpr, {
      golden: view.current.golden, wild: view.current.wild, time: this.time, number: view.showNumbers, shape: view.showShapes, anim: !this.reduced,
    });
    ctx.globalAlpha = 1;
  }

  /**
   * Comfort "Next fits here": a soft glow in the NEXT piece's colour on each empty landing cell where it would
   * merge (view.nextHint from nextHint.js). Drawn under the pieces; a slow gentle breath, held still under
   * Calm / reduced motion. Presentation only.
   */
  drawNextHint(ctx, view) {
    const L = this.L;
    const color = tierColor(view.nextHint[0].tier, view.skin);
    const breath = view.reduced ? 0 : Math.sin(this.time * 1.6);
    const rad = L.cell * 0.5;
    ctx.save();
    for (const h of view.nextHint) {
      const x = this.cellX(h.col), y = this.cellY(h.row);
      const gr = ctx.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, color);
      gr.addColorStop(0.55, color);
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gr;
      ctx.globalAlpha = (0.5 + 0.12 * breath) * 0.7;
      ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.45 + 0.08 * breath;
      ctx.lineWidth = Math.max(1.5, L.cell * 0.03);
      ctx.strokeStyle = color;
      ctx.beginPath(); ctx.arc(x, y, L.cell * 0.3, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }

  /** Faint ghost of the orb where it will land + soft outline on the orbs it would merge with (first merge only). */
  drawGhost(ctx, view, g) {
    const L = this.L;
    const gx = this.cellX(g.col), gy = this.cellY(g.row);
    const color = tierColor(g.tier, view.skin);
    const pulse = view.reduced ? 0.5 : 0.5 + 0.5 * Math.sin(this.time * 4);
    ctx.save();
    ctx.globalAlpha = 0.3;
    drawOrb(ctx, gx, gy, (L.cell / 2) * orbRadiusFactor(g.tier), g.tier, view.skin, this.dpr, {
      golden: view.current.golden, time: this.time, number: false,
    });
    ctx.globalAlpha = 0.55 + 0.2 * pulse;
    ctx.setLineDash([4, 5]);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(gx, gy, L.cell * 0.42, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    if (g.merge.length) {
      // soft halo on each partner orb: "these will merge"
      ctx.lineWidth = Math.max(2.5, L.cell * 0.05);
      ctx.strokeStyle = '#ffffff';
      ctx.shadowColor = color;
      ctx.shadowBlur = L.cell * 0.18;
      for (const m of g.merge) {
        ctx.globalAlpha = 0.45 + 0.3 * pulse;
        ctx.beginPath(); ctx.arc(this.cellX(m.c), this.cellY(m.r), L.cell * 0.46, 0, Math.PI * 2); ctx.stroke();
      }
    }
    ctx.restore();
  }

  /** Running chain tally above the board: big rolling points + combo badge, then a flight into the score. */
  drawTally(ctx, t, reduced, style = null) {
    const L = this.L;
    if (!L) return;
    const hx = this.w / 2, hy = L.aimY;
    const p = Math.max(0, Math.min(1, t.fp || 0));
    const x = hx + (t.tx - hx) * p;
    const y = hy + (t.ty - hy) * p;
    const scale = (1 - 0.55 * p) * (1 + (reduced ? 0 : 0.14 * (t.bump || 0)));
    const size = Math.round(Math.max(26, Math.min(40, L.cell * 0.5)));
    const num = Math.max(0, Math.floor(t.shown || 0)).toLocaleString('en-US');
    const combo = t.combo >= 2 ? `\u00d7${t.combo}` : '';
    const comboColors = ['#9fd8ff', '#9fd8ff', '#7cffb2', '#ffd54a', '#ff6ad5', '#ff8a5c', '#ff4fd8'];
    const cc = comboColors[Math.min(6, t.combo || 1)];
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.globalAlpha = 1 - 0.5 * p;
    ctx.textBaseline = 'middle';
    ctx.font = `800 ${size}px ${FONT}`;
    const nw = ctx.measureText('+' + num).width;
    ctx.font = `900 ${Math.round(size * 0.8)}px ${FONT}`;
    const cw = combo ? ctx.measureText(combo).width + size * 0.5 : 0;
    const w = nw + cw + size * 0.9, h = size * 1.45;
    // high-contrast pill
    this.roundRect(ctx, -w / 2, -h / 2, w, h, h / 2);
    ctx.fillStyle = (style && style.fill) || 'rgba(10,6,30,0.86)';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = cc;
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.font = `800 ${size}px ${FONT}`;
    ctx.fillStyle = '#ffffff';
    const x0 = -w / 2 + size * 0.45;
    ctx.fillText('+' + num, x0, size * 0.04);
    if (combo) {
      // combo badge
      const bx = x0 + nw + size * 0.25, bw = cw - size * 0.1, bh = size * 1.0;
      this.roundRect(ctx, bx, -bh / 2, bw, bh, bh * 0.3);
      ctx.fillStyle = cc;
      ctx.fill();
      ctx.font = `900 ${Math.round(size * 0.8)}px ${FONT}`;
      ctx.fillStyle = '#120a30';
      ctx.textAlign = 'center';
      ctx.fillText(combo, bx + bw / 2, size * 0.04);
    }
    ctx.restore();
  }

  drawTide(ctx, view) {
    const L = this.L;
    const K = view.tideK, left = view.tideLeft;
    if (!K) return;
    const y = L.tideY;
    let dot = Math.min(L.cell * 0.17, 9);
    let gap = dot * 2.9;
    const label = 'TIDE';
    ctx.save();
    // legible caption: at least 16 px at text size 1, grown with the HUD text factor (--tsh), like the HUD captions
    ctx.font = `800 ${Math.round(Math.max(16, dot * 1.75) * hudTextFactor())}px ${FONT}`;
    ctx.textBaseline = 'middle';
    const lw = ctx.measureText(label).width;
    // a long tide (calm early sectors, Slow Tide stacks) packs its dots closer so the row always fits the screen
    const room = this.w - 24 - lw - dot * 3.2;
    if (K > 1 && (K - 1) * gap > room) { gap = Math.max(1, room) / (K - 1); dot = Math.min(dot, gap / 2.4); }
    const total = (K - 1) * gap;
    const startX = this.w / 2 - total / 2 + lw / 2 + dot;
    ctx.textAlign = 'right';
    const urgent = left <= 1;
    const pulse = 0.5 + 0.5 * Math.sin(this.time * 9);
    // light scenes (Seaside harbour, café): dark ink, since lavender on cream was about 1.6:1; dark scenes keep the glow colours
    const lightScene = !!(BACKDROP_BY_ID[this.backdrop.id] || {}).light;
    if (lightScene) ctx.fillStyle = urgent ? '#a8321f' : '#5a4434';
    else ctx.fillStyle = urgent ? `rgba(255,${120 + 80 * pulse},140,1)` : 'rgba(200,190,255,0.75)';
    ctx.fillText(label, startX - dot * 2.2, y + 1);
    for (let i = 0; i < K; i++) {
      const x = startX + i * gap;
      const filled = i < left;
      ctx.beginPath();
      ctx.arc(x, y, filled ? dot * (urgent ? 1 + 0.25 * pulse : 1) : dot * 0.55, 0, Math.PI * 2);
      if (filled) {
        ctx.fillStyle = urgent ? '#ff5577' : left <= 2 ? '#ffb347' : '#7fe3ff';
        ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = dot * 1.4;
      } else {
        ctx.fillStyle = lightScene ? 'rgba(90,60,30,0.3)' : 'rgba(160,150,220,0.25)';
        ctx.shadowBlur = 0;
      }
      ctx.fill();
    }
    ctx.restore();
  }

  drawCometHint(ctx, hint) {
    const L = this.L;
    ctx.save();
    ctx.font = `800 ${Math.round(Math.min(20, L.cell * 0.3))}px ${FONT}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.globalAlpha = 0.75 + 0.25 * Math.sin(this.time * 6);
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(10,6,30,0.9)'; ctx.lineJoin = 'round';
    const txt = cozyText(hint || 'Tap an orb to vaporise it', pageLook());
    ctx.strokeText(txt, this.w / 2, L.aimY);
    ctx.fillStyle = '#ffb38a';
    ctx.fillText(txt, this.w / 2, L.aimY);
    ctx.restore();
  }
}

/**
 * Does a scene paint every pixel of the screen? Checked once per build: the scene is drawn at a small scale into a
 * transparent canvas and every pixel must come out (near) opaque. Then the nebula under it can be skipped.
 */
function sceneCoversScreen(sc, w, h) {
  try {
    const k = 0.25;
    const c = document.createElement('canvas');
    c.width = Math.max(2, Math.round(w * k)); c.height = Math.max(2, Math.round(h * k));
    const g = c.getContext('2d', { willReadFrequently: true });
    g.setTransform(c.width / w, 0, 0, c.height / h, 0, 0);
    sc.draw(g, 12, 1);
    const px = g.getImageData(0, 0, c.width, c.height).data;
    for (let i = 3; i < px.length; i += 4) if (px[i] < 250) return false;
    return true;
  } catch (_) {
    return false;
  }
}
