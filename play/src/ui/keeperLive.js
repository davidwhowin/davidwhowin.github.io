// Living Keepers (the café Regulars) in the DOM: one small canvas per visible Keeper, driven by one shared
// requestAnimationFrame loop. A Keeper only animates while its canvas is on screen (IntersectionObserver),
// the tab is visible and the canvas is still in the document; otherwise the loop stops completely.
// Rendering: the body (and the front layer: outfits) is cached in two offscreen canvases, so a
// frame is two image blits plus a few face strokes. Canvas size = CSS box x devicePixelRatio (capped at 2).
// Purely cosmetic: nothing here reads or touches rules, scores, rewards or ads.
import { KeeperAnim } from '../game/keeperAnim.js';
import { drawKeeperBack, drawKeeperFront, drawKeeperPose, fitKeeperCanvas, paintKeeperCanvas } from '../game/keeperArt.js';

const HAS_DOM = typeof window !== 'undefined' && typeof document !== 'undefined' && typeof requestAnimationFrame === 'function';
const actors = new Set();
let raf = 0;
let last = 0;
let reducedAll = false;
let io = null;
let listening = false;

function deviceReduced() {
  try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch { return false; }
}

/** Calm / reduced motion for every live Keeper (main.js applyMotion). Blinks and faces stay. */
export function setKeepersReduced(v) {
  reducedAll = !!v;
  for (const a of actors) a.anim.setReduced(reducedAll);
}

function makeLayer(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

class Actor {
  constructor(canvas, id, outfit, opts) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.anim = new KeeperAnim({ sleepAfter: opts.sleepAfter ?? Infinity, reduced: reducedAll, fidgets: opts.fidgets !== false });
    this.onFrame = opts.onFrame || null; // (anim) => void, e.g. the HUD's eye target
    this.pad = opts.pad || 0;            // extra CSS px around the portrait for hops and sparkles
    this.visible = !io;                  // without IntersectionObserver: assume visible
    this.active = true;                  // owner switch (e.g. the HUD is hidden)
    this.layers = { back: null, front: null, w: 0, h: 0 };
    this.dirty = true;
    this.w = 0; this.h = 0; this.dpr = 1; this.r = 0;
    this.set(id, outfit);
    if (opts.tap !== false) {
      this.onTap = () => this.react('tap');
      (opts.tapTarget || canvas).addEventListener('pointerdown', this.onTap, { passive: true });
    }
  }

  set(id, outfit) {
    if (id === this.id && (outfit || null) === this.outfit) return;
    this.id = id; this.outfit = outfit || null; this.dirty = true;
  }

  react(name, n) { this.anim.event(name, n); wakeLoop(); }

  fit() {
    const c = this.canvas;
    if (this.pad && !c.dataset.kpad) { // grow the drawing box without moving the layout
      const p = this.pad;
      c.dataset.kpad = String(p);
      c.style.margin = `-${p}px`;
      const cs = getComputedStyle(c);
      c.style.width = `${parseFloat(cs.width) + 2 * p}px`;
      c.style.height = `${parseFloat(cs.height) + 2 * p}px`;
    }
    const { w, h, dpr } = fitKeeperCanvas(c, 2);
    if (!w || !h) return false;
    const r = (Math.min(w, h) - 2 * this.pad) / 2 / 1.3;
    if (w !== this.w || h !== this.h || dpr !== this.dpr || this.dirty) {
      this.w = w; this.h = h; this.dpr = dpr; this.r = r;
      const L = this.layers;
      const pw = Math.round(w * dpr), ph = Math.round(h * dpr);
      if (!L.back || L.back.width !== pw || L.back.height !== ph) { L.back = makeLayer(pw, ph); L.front = makeLayer(pw, ph); }
      L.w = w; L.h = h;
      for (const [cv, fn] of [[L.back, 0], [L.front, 1]]) {
        const g = cv.getContext('2d');
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, pw, ph);
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (fn === 0) drawKeeperBack(g, w / 2, h / 2, r, this.id);
        else drawKeeperFront(g, w / 2, h / 2, r, this.id, this.outfit);
      }
      this.dirty = false;
    }
    return true;
  }

  frame(dt) {
    if (this.dirty || !this.w) { if (!this.fit()) return; }
    if (this.onFrame) this.onFrame(this.anim, this);
    const pose = this.anim.update(dt);
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    drawKeeperPose(ctx, this.w / 2, this.h / 2, this.r, this.id, this.outfit, pose, this.layers);
  }

  destroy() {
    actors.delete(this);
    if (io) io.unobserve(this.canvas);
    if (this.onTap) this.canvas.removeEventListener('pointerdown', this.onTap);
    if (this.canvas.__keeper === this) this.canvas.__keeper = null;
  }
}

function tick(now) {
  raf = 0;
  if (document.hidden) return; // visibilitychange restarts the loop
  const dt = last ? now - last : 16;
  last = now;
  let any = false;
  for (const a of actors) {
    if (!a.canvas.isConnected) { a.destroy(); continue; }
    if (!a.visible || !a.active) continue;
    any = true;
    a.frame(dt);
  }
  if (any) raf = requestAnimationFrame(tick);
  else last = 0;
}

function wakeLoop() {
  if (!HAS_DOM || raf || document.hidden) return;
  last = 0;
  raf = requestAnimationFrame(tick);
}

function listen() {
  if (listening) return;
  listening = true;
  reducedAll = reducedAll || (document.body && document.body.classList.contains('calm')) || deviceReduced();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) wakeLoop(); });
  window.addEventListener('resize', () => { for (const a of actors) a.dirty = true; });
  if (typeof IntersectionObserver === 'function') {
    io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const a = e.target.__keeper;
        if (!a) continue;
        a.visible = e.isIntersecting;
        if (a.visible) a.dirty = true; // the box may have changed while hidden
      }
      wakeLoop();
    });
  }
}

/**
 * Bring a Keeper canvas to life (idempotent: calling again just swaps the Keeper / outfit).
 * opts: sleepAfter (ms, default never), pad (CSS px), tap (default true), tapTarget (element), onFrame(anim),
 * react (a reaction name to play right away, e.g. 'win'), fidgets (default true).
 * Returns the actor ({ anim, react(name, n), set(id, outfit), active }) or null without a DOM.
 */
export function animateKeeperCanvas(canvas, id, outfit = null, opts = {}) {
  if (!canvas) return null;
  if (!HAS_DOM) { paintKeeperCanvas(canvas, id, outfit); return null; }
  listen();
  let a = canvas.__keeper;
  if (a && actors.has(a)) a.set(id, outfit);
  else {
    a = new Actor(canvas, id, outfit, opts);
    canvas.__keeper = a;
    canvas.classList.add('keeper-live');
    actors.add(a);
    if (io) io.observe(canvas);
  }
  if (opts.react) a.anim.event(opts.react);
  wakeLoop();
  return a;
}

/** Animate every `canvas[data-keeper]` inside `root` (data-outfit optional, data-react plays once). */
export function animateKeepersIn(root, opts = {}) {
  if (!root || !root.querySelectorAll) return;
  for (const c of root.querySelectorAll('canvas[data-keeper]')) {
    animateKeeperCanvas(c, c.dataset.keeper, c.dataset.outfit || null, { ...opts, react: c.dataset.react || opts.react });
  }
}

/** For tests and debugging: how many live Keepers exist and whether the loop is running. */
export function keeperLiveStats() { return { actors: actors.size, running: !!raf }; }
