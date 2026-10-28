// Living Star Keepers: a small, pure animation state machine (no DOM, testable in node).
//
// PURE COSMETICS. A Keeper's mood never reads or changes rules, scores, rewards or ad state. Events come
// from presentation hooks (a merge, a chain, a full-ish board, a win or loss) and only change how the
// Keeper looks. Nothing here nags: after a loss the Keeper is sad for a moment, then encouraging.
//
// Output: `anim.pose`, one reused object read by the renderer (src/game/keeperArt.js drawKeeperPose).
//   expr        expression id (EXPRESSIONS) for the face
//   eyeOpen     0..1 (blinks close the eyes on top of any expression)
//   lookX/Y     -1..1 where the eyes look (+x right, +y down)
//   mouthOpen   0..1 talking flap (0 = the expression's own mouth)
//   dx, dy      body offset in units of the Keeper's radius (+y down)
//   sx, sy      body scale (squash and stretch), rot body rotation (radians)
//   sparkle     0..1 sparkles around the body, burst 0..1 progress of a star burst (-1 = none)
//   zzz         sleep "z" phase 0..1 (-1 = awake), blush 0..1 extra cheek colour, t time in ms
//
// Reactions have a priority. A higher one takes over (the motion blends, so nothing snaps); an equal one
// restarts only if the current one is past its minimum gap (merge spam never jitters); a lower one waits in
// a short queue and is dropped when it goes stale. A "locked" reaction (the big chain spin) finishes before
// anything but a win or loss can take over. Calm / reduced motion keeps blinks and faces but drops hops,
// bounces, spins, sparkles and bursts.

export const EXPRESSIONS = ['neutral', 'blink', 'happy', 'grin', 'cheer', 'starry', 'surprised', 'worried', 'sleepy', 'sad', 'encourage', 'proud'];

/** Reaction table. prio: higher wins. dur ms. motion: body move. ttl: how long it may wait in the queue. */
export const REACTIONS = {
  tap:       { prio: 1, dur: 650,  expr: 'happy',     motion: 'hop',    amp: 0.8, ttl: 300 },
  merge:     { prio: 1, dur: 520,  expr: 'happy',     motion: 'hop',    amp: 0.55, ttl: 350 },
  wake:      { prio: 1, dur: 560,  expr: 'surprised', motion: 'pop',    amp: 0.5, ttl: 300 },
  danger:    { prio: 2, dur: 1500, expr: 'worried',   motion: 'shiver', amp: 0.5, ttl: 2500, lookX: 0.15, lookY: 1 },
  chain2:    { prio: 3, dur: 800,  expr: 'grin',      motion: 'hop',    amp: 0.9, ttl: 700 },
  chain3:    { prio: 4, dur: 1050, expr: 'cheer',     motion: 'bounce', amp: 1, sparkle: 1, ttl: 800 },
  chain4:    { prio: 5, dur: 1400, expr: 'starry',    motion: 'spin',   amp: 1, sparkle: 1, burst: true, lock: true, ttl: 900 },
  surprise:  { prio: 6, dur: 620,  expr: 'surprised', motion: 'pop',    amp: 1, next: 'proud', ttl: 1800 },
  proud:     { prio: 6, dur: 1400, expr: 'proud',     motion: 'puff',   amp: 1, sparkle: 0.6, blush: 0.6, ttl: 1800 },
  win:       { prio: 7, dur: 2200, expr: 'cheer',     motion: 'bounce', amp: 1, sparkle: 1, burst: true, next: 'winProud', blush: 0.5, ttl: 3000 },
  winProud:  { prio: 7, dur: 1800, expr: 'proud',     motion: 'puff',   amp: 0.7, sparkle: 0.5, blush: 0.6, ttl: 3000 },
  lose:      { prio: 7, dur: 1700, expr: 'sad',       motion: 'droop',  amp: 1, next: 'encourage', ttl: 3000 },
  encourage: { prio: 7, dur: 2200, expr: 'encourage', motion: 'nod',    amp: 1, ttl: 3000 },
};

/** Chain size (cascade step count) to a reaction name: 1 = an ordinary merge. */
export function chainReaction(n) {
  if (n >= 4) return 'chain4';
  if (n === 3) return 'chain3';
  if (n === 2) return 'chain2';
  return 'merge';
}

const DEFAULTS = {
  sleepAfter: 8000,   // ms without input before dozing (Infinity = never)
  reduced: false,     // Calm / prefers-reduced-motion
  fidgets: true,      // small idle fidgets (look-around, wiggle, tiny hop)
  dangerCooldown: 7000,
  rng: null,          // () => [0, 1); defaults to a tiny LCG (cosmetic only)
};

const BLEND_MS = 140;
const QUEUE_MAX = 3;
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

function lcg(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

export class KeeperAnim {
  constructor(opts = {}) {
    const o = { ...DEFAULTS, ...opts };
    this.sleepAfter = o.sleepAfter;
    this.reduced = !!o.reduced;
    this.fidgets = o.fidgets !== false;
    this.dangerCooldown = o.dangerCooldown;
    this.rng = o.rng || lcg(Date.now ? Date.now() : 1);
    this.t = 0;
    this.pose = { expr: 'neutral', eyeOpen: 1, lookX: 0, lookY: 0, mouthOpen: 0, dx: 0, dy: 0, sx: 1, sy: 1, rot: 0, sparkle: 0, burst: -1, zzz: -1, blush: 0, t: 0 };
    // reaction state
    this.cur = null;        // name of the current reaction
    this.curStart = 0;
    this.queue = [];        // [{ name, at }] (max QUEUE_MAX, reused objects)
    for (let i = 0; i < QUEUE_MAX; i++) this.queue.push({ name: null, at: 0 });
    this.qLen = 0;
    this.lastDanger = -1e9;
    // motion blend (values at the moment a reaction switched)
    this.blendAt = -1e9;
    this.bDx = 0; this.bDy = 0; this.bSx = 1; this.bSy = 1; this.bRot = 0;
    // idle
    this.idleMs = 0;
    this.asleep = false;
    this.nextBlink = 1500 + this.rng() * 2500;
    this.blinkStart = -1e9;
    this.doubleBlink = false;
    this.nextFidget = 5000 + this.rng() * 5000;
    this.fidget = null; this.fidgetStart = 0; this.fidgetX = 0; this.fidgetY = 0;
    // look: target set from outside (aim / falling piece) or a glance
    this.lookTX = 0; this.lookTY = 0; this.lookActive = false;
    this.glanceUntil = -1e9; this.glanceX = 0; this.glanceY = 0;
    // talking
    this.talkUntil = -1e9;
  }

  setReduced(v) { this.reduced = !!v; }

  /** Where the eyes should look (-1..1). active=false hands the eyes back to idle wandering. */
  setLook(x, y, active = true) { this.lookTX = clamp(x, -1, 1); this.lookTY = clamp(y, -1, 1); this.lookActive = !!active; }

  /** A short glance at a point (e.g. where a merge just happened). */
  glance(x, y, ms = 600) { this.glanceX = clamp(x, -1, 1); this.glanceY = clamp(y, -1, 1); this.glanceUntil = this.t + ms; }

  /** Mouth flaps for `ms` (speech bubble). */
  talk(ms) { this.talkUntil = this.t + Math.max(0, ms); if (this.asleep) this.wake(false); this.idleMs = 0; }

  /** Player input: resets the doze timer and wakes a sleeping Keeper. */
  input() {
    this.idleMs = 0;
    if (this.asleep) this.wake(true);
  }

  wake(react) {
    this.asleep = false;
    this.idleMs = 0;
    if (react) this.trigger('wake');
  }

  /**
   * A game or UI event. Names: 'tap', 'merge', 'chain' (n = cascade steps), 'danger', 'bigMerge' / 'surprise',
   * 'win', 'lose', 'input'. Returns the reaction name that started or queued (null = ignored).
   */
  event(name, n = 0) {
    if (name === 'input') { this.input(); return null; }
    if (name === 'chain') name = chainReaction(n);
    else if (name === 'bigMerge') name = 'surprise';
    if (name === 'danger') {
      if (this.t - this.lastDanger < this.dangerCooldown) return null;
      this.lastDanger = this.t;
    }
    if (name === 'tap') this.input();
    return this.trigger(name);
  }

  trigger(name) {
    const def = REACTIONS[name];
    if (!def) return null;
    this.idleMs = 0;
    if (this.asleep && name !== 'wake') this.asleep = false;
    const cur = this.cur ? REACTIONS[this.cur] : null;
    if (!cur) { this.start(name); return name; }
    const elapsed = this.t - this.curStart;
    if (cur.lock && def.prio < 7 && elapsed < cur.dur) { this.enqueue(name); return name; }
    if (def.prio > cur.prio) { this.start(name); return name; }
    if (def.prio === cur.prio) {
      if (name === this.cur && elapsed < def.dur * 0.5) return null; // spam: let the current one play
      this.start(name);
      return name;
    }
    this.enqueue(name);
    return name;
  }

  enqueue(name) {
    const q = this.queue;
    for (let i = 0; i < this.qLen; i++) if (q[i].name === name) { q[i].at = this.t; return; }
    if (this.qLen < QUEUE_MAX) { q[this.qLen].name = name; q[this.qLen].at = this.t; this.qLen++; return; }
    // full: replace the lowest priority (oldest on ties) if the new one is at least as important
    let lo = 0;
    for (let i = 1; i < this.qLen; i++) {
      const a = REACTIONS[q[i].name].prio, b = REACTIONS[q[lo].name].prio;
      if (a < b || (a === b && q[i].at < q[lo].at)) lo = i;
    }
    if (REACTIONS[name].prio >= REACTIONS[q[lo].name].prio) { q[lo].name = name; q[lo].at = this.t; }
  }

  /** Remove and return the most important queued reaction that has not gone stale (null if none). */
  dequeue() {
    const q = this.queue;
    let best = -1;
    for (let i = 0; i < this.qLen; i++) {
      const def = REACTIONS[q[i].name];
      if (this.t - q[i].at > def.ttl) continue;
      if (best < 0 || def.prio > REACTIONS[q[best].name].prio || (def.prio === REACTIONS[q[best].name].prio && q[i].at < q[best].at)) best = i;
    }
    const name = best >= 0 ? q[best].name : null;
    // compact: drop the taken one and every stale one
    let w = 0;
    for (let i = 0; i < this.qLen; i++) {
      if (i === best || this.t - q[i].at > REACTIONS[q[i].name].ttl) continue;
      if (w !== i) { const tmp = q[w]; q[w] = q[i]; q[i] = tmp; }
      w++;
    }
    for (let i = w; i < this.qLen; i++) q[i].name = null;
    this.qLen = w;
    return name;
  }

  queued() { const out = []; for (let i = 0; i < this.qLen; i++) out.push(this.queue[i].name); return out; } // tests only

  start(name) {
    const p = this.pose;
    this.bDx = p.dx; this.bDy = p.dy; this.bSx = p.sx; this.bSy = p.sy;
    let r = p.rot % TAU; if (r > Math.PI) r -= TAU; if (r < -Math.PI) r += TAU;
    this.bRot = r;
    this.blendAt = this.t;
    this.cur = name;
    this.curStart = this.t;
    this.fidget = null;
  }

  /** Advance by dt milliseconds and refresh `pose`. No allocations. */
  update(dt) {
    dt = clamp(dt || 0, 0, 100); // a long frame gap (tab switch) never skips a whole reaction at once
    this.t += dt;
    const t = this.t;
    const p = this.pose;
    const red = this.reduced;

    // --- reaction lifecycle
    if (this.cur) {
      const def = REACTIONS[this.cur];
      if (t - this.curStart >= def.dur) {
        const next = def.next || this.dequeue();
        if (next) this.start(next);
        else { this.start(null); this.cur = null; }
      }
    } else if (this.qLen) {
      const next = this.dequeue();
      if (next) this.start(next);
    }

    // --- sleep (only when nothing is going on)
    if (!this.cur && t >= this.talkUntil) {
      this.idleMs += dt;
      if (!this.asleep && this.idleMs >= this.sleepAfter) { this.asleep = true; this.fidget = null; }
    }

    // --- blinks (random, sometimes double); none while asleep
    if (!this.asleep && t >= this.nextBlink) {
      this.blinkStart = t;
      this.doubleBlink = this.rng() < 0.2;
      this.nextBlink = t + 2200 + this.rng() * 3300;
    }
    let eyeOpen = 1;
    const bt = t - this.blinkStart;
    if (bt < 150) eyeOpen = Math.abs(bt / 75 - 1);
    else if (this.doubleBlink && bt >= 230 && bt < 380) eyeOpen = Math.abs((bt - 230) / 75 - 1);

    // --- fidgets (idle only)
    if (!this.cur && !this.asleep && this.fidgets) {
      if (!this.fidget && t >= this.nextFidget) {
        const k = this.rng();
        this.fidget = red || k < 0.5 ? 'glance' : k < 0.78 ? 'wiggle' : 'hum';
        this.fidgetStart = t;
        this.fidgetX = (this.rng() < 0.5 ? -1 : 1) * (0.5 + this.rng() * 0.5);
        this.fidgetY = -0.3 + this.rng() * 0.6;
        this.nextFidget = t + 5000 + this.rng() * 6000;
      }
      if (this.fidget && t - this.fidgetStart > 1100) this.fidget = null;
    } else if (this.cur || this.asleep) {
      this.nextFidget = Math.max(this.nextFidget, t + 3000);
    }

    // --- idle body: breathing + float
    const breathPeriod = this.asleep ? 4200 : 3200;
    const br = Math.sin((t / breathPeriod) * TAU);
    const breathAmp = (this.asleep ? 0.04 : 0.025) * (red ? 0.4 : 1);
    let dx = 0, dy = red ? 0 : Math.sin((t / 2600) * TAU) * 0.04 + (this.asleep ? 0.04 : 0);
    let sx = 1 - br * breathAmp * 0.6, sy = 1 + br * breathAmp, rot = this.asleep && !red ? -0.12 : 0;
    let sparkle = 0, burst = -1, blush = 0;
    let expr = this.asleep ? 'sleepy' : 'neutral';

    if (this.fidget && !red) {
      const fp = (t - this.fidgetStart) / 1100;
      if (this.fidget === 'wiggle') rot += Math.sin(fp * TAU * 2) * 0.1 * (1 - fp);
      else if (this.fidget === 'hum') dy -= Math.sin(Math.min(1, fp * 2) * Math.PI) * 0.06;
    }

    // --- reaction motion
    if (this.cur) {
      const def = REACTIONS[this.cur];
      const q = clamp((t - this.curStart) / def.dur, 0, 1);
      const a = red ? 0 : def.amp;
      expr = def.expr;
      blush = def.blush || 0;
      switch (def.motion) {
        case 'hop': {
          const h = Math.sin(q * Math.PI);
          dy -= h * 0.22 * a;
          const land = q < 0.12 ? 1 - q / 0.12 : q > 0.88 ? (q - 0.88) / 0.12 : 0;
          sy *= 1 + (h * 0.08 - land * 0.1) * a; sx *= 1 - (h * 0.05 - land * 0.08) * a;
          break;
        }
        case 'bounce': {
          const b = Math.abs(Math.sin(q * Math.PI * 3)) * (1 - q * 0.45);
          dy -= b * 0.26 * a;
          sy *= 1 + (b - 0.3) * 0.1 * a; sx *= 1 - (b - 0.3) * 0.07 * a;
          break;
        }
        case 'spin': {
          const e = q < 0.5 ? 2 * q * q : 1 - 2 * (1 - q) * (1 - q); // ease in-out
          rot += e * TAU * (a > 0 ? 1 : 0);
          dy -= Math.sin(q * Math.PI) * 0.3 * a;
          const s = Math.sin(q * Math.PI) * 0.08 * a;
          sx *= 1 + s; sy *= 1 + s;
          break;
        }
        case 'pop': {
          const s = Math.sin(Math.min(1, q * 1.6) * Math.PI) * 0.16 * a;
          sx *= 1 + s; sy *= 1 + s * 1.2; dy -= s * 0.4;
          break;
        }
        case 'puff': {
          const s = Math.sin(Math.min(1, q * 1.3) * Math.PI * 0.5) * (q > 0.8 ? (1 - q) / 0.2 : 1);
          sx *= 1 + s * 0.08 * a; sy *= 1 + s * 0.1 * a; dy -= s * 0.06 * a;
          rot += Math.sin(q * Math.PI * 2) * 0.05 * a;
          break;
        }
        case 'droop': {
          const s = Math.min(1, q * 3);
          dy += s * 0.08 * a; sy *= 1 - s * 0.06 * a; sx *= 1 + s * 0.04 * a; rot -= s * 0.1 * a;
          break;
        }
        case 'nod': {
          dy += Math.max(0, Math.sin(q * Math.PI * 4)) * 0.05 * a;
          break;
        }
        case 'shiver': {
          dx += Math.sin(t * 0.09) * 0.025 * a * (1 - q);
          break;
        }
        default: break;
      }
      if (!red) {
        if (def.sparkle) sparkle = def.sparkle * Math.min(1, (1 - q) * 3) * Math.min(1, q * 6);
        if (def.burst) burst = q < 0.55 ? q / 0.55 : -1;
      }
    }

    // --- blend from the previous pose after a switch (no snapping)
    const bq = (t - this.blendAt) / BLEND_MS;
    if (bq < 1) {
      const k = 1 - bq * bq * (3 - 2 * bq); // smoothstep weight of the old pose
      dx += (this.bDx - dx) * k; dy += (this.bDy - dy) * k;
      sx += (this.bSx - sx) * k; sy += (this.bSy - sy) * k;
      rot += (this.bRot - rot) * k;
    }

    // --- eyes: reaction target > glance > aim/drop target > fidget glance > centre
    let tx = 0, ty = 0;
    const def = this.cur ? REACTIONS[this.cur] : null;
    if (def && def.lookX != null) { tx = def.lookX; ty = def.lookY; }
    else if (t < this.glanceUntil) { tx = this.glanceX; ty = this.glanceY; }
    else if (this.lookActive && !this.asleep) { tx = this.lookTX; ty = this.lookTY; }
    else if (this.fidget === 'glance') { tx = this.fidgetX; ty = this.fidgetY; }
    const lk = Math.min(1, dt * 0.012);
    p.lookX += (tx - p.lookX) * lk;
    p.lookY += (ty - p.lookY) * lk;

    // --- talking: a simple open/close flap with tiny pauses between "words"
    let mouth = 0;
    if (t < this.talkUntil) {
      const f = Math.abs(Math.sin(t * 0.026));
      mouth = Math.sin(t * 0.0047) > -0.55 ? f : 0;
    }

    p.expr = expr;
    p.eyeOpen = expr === 'sleepy' ? 0 : eyeOpen;
    p.mouthOpen = mouth;
    p.dx = dx; p.dy = dy; p.sx = sx; p.sy = sy; p.rot = rot;
    p.sparkle = sparkle; p.burst = burst; p.blush = blush;
    p.zzz = this.asleep ? (t % 2400) / 2400 : -1;
    p.t = t;
    return p;
  }
}
