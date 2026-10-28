// Nova Drop: sound backdrops (DESIGN.md "Sound backdrop"). Seaside café, Rain, Ocean, Night garden and Soft piano,
// all synthesized in Web Audio from filtered noise, envelopes and LFOs (no audio files).
//
// CPU budget (phones):
//   * Every texture comes from a few looping buffers made ONCE per AudioContext and reused: a 4 s stereo
//     white-noise loop, two pre-baked rain-droplet loops and three cricket loops. Buffers are 22.05 kHz
//     (the browser resamples), which halves their memory and keeps the top end soft instead of hissy.
//     Droplet and cricket loops are written circularly (events that run past the end wrap to the start),
//     and loops of different lengths (5.3 s / 7.9 s, 7.1 s / 9.7 s / 13.3 s) play together so the
//     pattern never audibly repeats.
//   * A backdrop builds a fixed graph of about 10-25 nodes when it starts. Nothing is created per frame:
//     tick() (called every 250 ms by the music timer) only schedules sparse events ahead of time: an ocean
//     wave every 8-12 s (automation on existing params, no new nodes), a piano note every 1.4-3.6 s
//     (4 nodes), a distant thunder roll every 50-140 s (4 nodes); in the café a far gull call every
//     18-40 s (2-3 calls, 4 nodes each) and a cup clink every 12-30 s (3-5 nodes).
//   * end() fades out and hard-stops every source, then disconnects the graph, so nothing runs while a
//     backdrop is off.
// Nothing here touches the DOM or reads the save; audio.js owns routing, fades on the bus and lifecycle.

const BUF_SR = 22050;
const cache = new WeakMap(); // AudioContext -> { white, drops: [], crickets: [] }

const rnd = (a, b) => a + Math.random() * (b - a);
const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

function bufferSet(ac) {
  let c = cache.get(ac);
  if (!c) { c = {}; cache.set(ac, c); }
  return c;
}

/** 4 s of stereo white noise (two independent channels), shared by every noise layer. */
function whiteNoise(ac) {
  const c = bufferSet(ac);
  if (c.white) return c.white;
  const len = BUF_SR * 4;
  const b = ac.createBuffer(2, len, BUF_SR);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  return (c.white = b);
}

/**
 * Rain droplets, baked into a circular stereo loop: mostly soft ticks (short decaying noise, like drops
 * on leaves and stone) plus a few pitched "plinks" (a bubble resonance that glides up, like drops in a
 * puddle). Each drop gets its own pan and level, with many quiet drops and few loud ones.
 */
function dropBuffer(ac, idx, seconds, perSec) {
  const c = bufferSet(ac);
  c.drops = c.drops || [];
  if (c.drops[idx]) return c.drops[idx];
  const len = Math.floor(BUF_SR * seconds);
  const b = ac.createBuffer(2, len, BUF_SR);
  const L = b.getChannelData(0), R = b.getChannelData(1);
  const n = Math.floor(seconds * perSec);
  for (let k = 0; k < n; k++) {
    const start = Math.floor(Math.random() * len);
    const pan = rnd(-0.9, 0.9);
    const gl = Math.cos((pan + 1) * Math.PI / 4), gr = Math.sin((pan + 1) * Math.PI / 4);
    const a = 0.04 + 0.5 * Math.pow(Math.random(), 3); // mostly quiet
    if (Math.random() < 0.12) {
      // plink: sine with an upward glide, ~10-25 ms
      const f0 = rnd(1500, 3800), tau = rnd(0.008, 0.02) * BUF_SR, m = Math.floor(tau * 5);
      let ph = 0;
      for (let i = 0; i < m; i++) {
        const f = f0 * (1 + 0.6 * (i / m));
        ph += 2 * Math.PI * f / BUF_SR;
        const atk = Math.min(1, i / 12);
        const v = a * 0.55 * atk * Math.exp(-i / tau) * Math.sin(ph);
        const j = (start + i) % len;
        L[j] += v * gl; R[j] += v * gr;
      }
    } else {
      // tick: band-limited noise burst (two-pole smoothing so it is a soft tap, not a click)
      const tau = rnd(0.0015, 0.006) * BUF_SR, m = Math.floor(tau * 6);
      let y1 = 0, y2 = 0;
      const sm = rnd(0.35, 0.7);
      for (let i = 0; i < m; i++) {
        const x = Math.random() * 2 - 1;
        y1 += sm * (x - y1); y2 += sm * (y1 - y2);
        const atk = Math.min(1, i / 6);
        const v = a * atk * Math.exp(-i / tau) * (y1 - y2) * 2.2;
        const j = (start + i) % len;
        L[j] += v * gl; R[j] += v * gr;
      }
    }
  }
  return (c.drops[idx] = b);
}

/**
 * One cricket, baked into a circular mono loop: chirps of 3-4 smooth pulses on a ~4-5 kHz carrier, in
 * irregular groups of 3-9 chirps with pauses between groups. Each cricket has its own pitch and pace.
 */
function cricketBuffer(ac, idx, seconds, f0, pulseHz, chirpGap) {
  const c = bufferSet(ac);
  c.crickets = c.crickets || [];
  if (c.crickets[idx]) return c.crickets[idx];
  const len = Math.floor(BUF_SR * seconds);
  const b = ac.createBuffer(1, len, BUF_SR);
  const d = b.getChannelData(0);
  const pulseLen = 0.5 / pulseHz; // pulse on for half the pulse period
  let t = rnd(0, 0.8);
  while (t < seconds) {
    const chirps = 3 + Math.floor(Math.random() * 7);
    for (let ch = 0; ch < chirps && t < seconds; ch++) {
      const pulses = Math.random() < 0.6 ? 3 : 4;
      const amp = rnd(0.55, 1);
      const f = f0 * rnd(0.985, 1.015);
      for (let p = 0; p < pulses; p++) {
        const ps = Math.floor((t + p / pulseHz) * BUF_SR), pl = Math.floor(pulseLen * BUF_SR);
        const pa = amp * (p === 0 ? 0.75 : 1) * (p === pulses - 1 ? 0.8 : 1);
        for (let i = 0; i < pl; i++) {
          const w = Math.sin(Math.PI * i / pl);
          const fi = f * (1 - 0.02 * (i / pl)); // tiny droop inside each pulse
          const v = pa * w * w * Math.sin(2 * Math.PI * fi * (i / BUF_SR));
          d[(ps + i) % len] += v;
        }
      }
      t += pulses / pulseHz + chirpGap * rnd(0.85, 1.25);
    }
    t += rnd(0.5, 2.6); // pause between groups
  }
  return (c.crickets[idx] = b);
}

/** Soft piano partials (fundamental strong, upper partials falling away quickly). */
function pianoWave(ac) {
  const c = bufferSet(ac);
  if (c.piano !== undefined) return c.piano;
  if (!ac.createPeriodicWave) return (c.piano = null);
  const amps = [0, 1, 0.42, 0.2, 0.11, 0.06, 0.035, 0.02];
  const real = new Float32Array(amps.length), imag = new Float32Array(amps);
  try { c.piano = ac.createPeriodicWave(real, imag); } catch (_) { c.piano = null; }
  return c.piano;
}

// ---------------------------------------------------------------------------
// Session: one live backdrop

class Ambience {
  constructor(ac, id, dest, wetDest, fadeIn, t0) {
    this.ac = ac; this.id = id; this.dead = false;
    this.sources = new Set();
    this.nodes = [];
    this.t0 = t0;
    this.out = this.node(ac.createGain());
    const g = this.out.gain;
    if (fadeIn > 0) { g.setValueAtTime(0.0001, t0); g.linearRampToValueAtTime(1, t0 + fadeIn); } else g.value = 1;
    this.out.connect(dest);
    this.wet = null;
    this.wetDest = wetDest;
  }
  node(n) { this.nodes.push(n); return n; }
  /** A send into the reverb (created on first use). */
  send(level) {
    if (!this.wetDest) return null;
    const s = this.node(this.ac.createGain()); s.gain.value = level;
    s.connect(this.wetDest);
    return s;
  }
  /** Start a looping buffer source at a random offset; returns it. */
  loop(buffer, t, rate = 1) {
    const src = this.ac.createBufferSource();
    src.buffer = buffer; src.loop = true;
    if (rate !== 1) src.playbackRate.value = rate;
    this.track(src, Infinity);
    src.start(t, Math.random() * 2);
    return src;
  }
  track(src, end) {
    src.__end = end;
    this.sources.add(src);
    if (!src.onended) src.onended = () => this.sources.delete(src);
  }
  filter(type, f, q = 0.7) {
    const n = this.node(this.ac.createBiquadFilter());
    n.type = type; n.frequency.value = f; n.Q.value = q;
    return n;
  }
  gain(v) { const n = this.node(this.ac.createGain()); n.gain.value = v; return n; }
  pan(p) {
    if (!this.ac.createStereoPanner) return this.gain(1);
    const n = this.node(this.ac.createStereoPanner()); n.pan.value = p; return n;
  }
  /** A slow sine LFO added onto `param` (centre value stays the param's own value). */
  lfo(param, hz, depth, t) {
    const o = this.ac.createOscillator();
    o.frequency.value = hz;
    const g = this.gain(depth);
    o.connect(g); g.connect(param);
    this.track(o, Infinity);
    o.start(t);
    return o;
  }
  /** Chain nodes left to right and return the last one. */
  chain(...ns) { for (let i = 0; i < ns.length - 1; i++) ns[i].connect(ns[i + 1]); return ns[ns.length - 1]; }
  /** Chain nodes left to right and return the FIRST one (a mix input that feeds the rest). */
  head(...ns) { this.chain(...ns); return ns[0]; }

  tick() { /* per-backdrop */ }

  /** Fade out over `fade` s, hard-stop every source at the end of the fade, then disconnect. Safe twice. */
  end(fade = 1.5) {
    if (this.dead) return;
    this.dead = true;
    const ac = this.ac, t = ac.currentTime, tEnd = t + fade;
    this.endAt = tEnd;
    try {
      const g = this.out.gain;
      g.cancelScheduledValues(0);
      g.setValueAtTime(this.levelAt(t), t);
      g.linearRampToValueAtTime(0.0001, tEnd);
      g.setValueAtTime(0, tEnd + 0.02);
    } catch (_) { /* ignore */ }
    for (const s of this.sources) { try { s.stop(Math.min(s.__end ?? Infinity, tEnd + 0.05)); } catch (_) { /* stopped */ } }
  }
  /** After the fade: drop every node (called by the owner on a timer). */
  finish() {
    for (const s of this.sources) { try { s.stop(); } catch (_) { /* ignore */ } }
    this.sources.clear();
    for (const n of this.nodes) { try { n.disconnect(); } catch (_) { /* ignore */ } }
    this.nodes.length = 0;
  }
  /** Output level from the session's own fade-in (never read AudioParam.value mid-automation). */
  levelAt(t) { return this.fadeIn ? Math.max(0.0001, Math.min(1, (t - this.t0) / this.fadeIn)) : 1; }
}

// --- Rain ---------------------------------------------------------------------------------------

class Rain extends Ambience {
  build(t, opts) {
    const ac = this.ac, white = whiteNoise(ac);
    const mix = this.head(this.gain(1.25), this.filter('lowpass', 6500, 0.5), this.out);
    // steady wash: band-passed noise with a slow swell in intensity
    const wash = this.gain(0.33);
    this.chain(this.loop(white, t), this.filter('highpass', 500, 0.5), this.filter('bandpass', 1900, 0.45), wash, mix);
    this.lfo(wash.gain, 0.045, 0.07, t);
    // patter on near surfaces: a brighter, quieter band that breathes on its own clock
    const hi = this.gain(0.09);
    this.chain(this.loop(white, t, 0.97), this.filter('bandpass', 4200, 0.8), hi, mix);
    this.lfo(hi.gain, 0.071, 0.03, t);
    // low body: rain on far roofs and ground
    this.chain(this.loop(white, t, 1.03), this.filter('lowpass', 380, 0.4), this.gain(0.42), mix);
    // droplets: two baked loops of different lengths
    this.chain(this.loop(dropBuffer(ac, 0, 5.3, 34), t), this.filter('lowpass', 5200, 0.4), this.gain(0.85), mix);
    this.chain(this.loop(dropBuffer(ac, 1, 7.9, 22), t, 0.92), this.filter('lowpass', 3600, 0.4), this.gain(0.7), mix);
    this.mix = mix;
    // distant thunder, very rarely (never a crack: everything sits below ~200 Hz)
    this.nextThunder = opts.thunderAt != null ? t + opts.thunderAt : t + rnd(35, 95);
  }
  tick(tEnd) {
    while (!this.dead && this.nextThunder < tEnd) {
      this.thunder(this.nextThunder);
      this.nextThunder += rnd(50, 140);
    }
  }
  thunder(t) {
    const ac = this.ac, amp = rnd(0.28, 0.45), dur = rnd(7, 10);
    const src = ac.createBufferSource(); src.buffer = whiteNoise(ac); src.loop = true;
    const lp1 = ac.createBiquadFilter(); lp1.type = 'lowpass'; lp1.Q.value = 0.6;
    lp1.frequency.setValueAtTime(190, t); lp1.frequency.exponentialRampToValueAtTime(70, t + dur);
    const lp2 = ac.createBiquadFilter(); lp2.type = 'lowpass'; lp2.frequency.value = 260; lp2.Q.value = 0.5;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.setTargetAtTime(amp, t, 0.7);                // slow swell in: a far-off roll, no strike
    g.gain.setTargetAtTime(amp * 0.55, t + 1.8, 0.6);   // the roll wobbles once
    g.gain.setTargetAtTime(amp * 0.8, t + 2.9, 0.5);
    g.gain.setTargetAtTime(0.0001, t + 3.8, (dur - 3.8) / 4);
    src.connect(lp1); lp1.connect(lp2); lp2.connect(g); g.connect(this.out);
    src.onended = () => { this.sources.delete(src); try { g.disconnect(); lp2.disconnect(); lp1.disconnect(); } catch (_) { /* ignore */ } };
    this.track(src, t + dur);
    src.start(t, Math.random() * 2); src.stop(t + dur);
  }
}

// --- Ocean --------------------------------------------------------------------------------------

class Ocean extends Ambience {
  build(t) {
    const ac = this.ac, white = whiteNoise(ac);
    const mix = this.head(this.gain(1.8), this.out);
    // the wave body: low-passed noise whose level AND brightness swell together
    this.bodyF = this.filter('lowpass', 320, 0.3);
    this.bodyG = this.gain(0.12);
    this.chain(this.loop(white, t), this.bodyF, this.filter('lowpass', 1800, 0.3), this.bodyG, mix);
    // the wash: foam hiss that peaks just after the crest and drains away slowly
    this.washG = this.gain(0.0001);
    this.chain(this.loop(white, t, 0.94), this.filter('bandpass', 1500, 0.5), this.filter('lowpass', 3200, 0.4), this.washG, mix);
    // constant far surf rumble so the gaps between waves are never empty
    this.chain(this.loop(white, t, 1.06), this.filter('lowpass', 170, 0.4), this.gain(0.32), mix);
    this.nextWave = t + 0.05;
    this.waveN = 0;
  }
  tick(tEnd) {
    while (!this.dead && this.nextWave < tEnd + 2) {
      const P = rnd(8, 12);
      this.wave(this.nextWave, P);
      this.nextWave += P;
    }
  }
  /** One wave: rise over ~55% of its period, crest, then recede; automation only (no new nodes). */
  wave(t, P) {
    this.waveN++;
    const big = this.waveN % 3 === 0 || Math.random() < 0.2;
    const k = big ? rnd(0.9, 1) : rnd(0.6, 0.85);
    const crest = t + P * rnd(0.5, 0.6);
    const low = 0.1 + rnd(0, 0.04);
    const bg = this.bodyG.gain, bf = this.bodyF.frequency, wg = this.washG.gain;
    bg.setTargetAtTime(0.55 * k, t, (crest - t) / 2.6);
    bf.setTargetAtTime(500 + 900 * k, t, (crest - t) / 2.2);
    bg.setTargetAtTime(low, crest, (t + P - crest) / 2.4);
    bf.setTargetAtTime(300, crest, (t + P - crest) / 2.2);
    wg.setTargetAtTime(0.05 * k, t + (crest - t) * 0.6, (crest - t) / 3);
    wg.setTargetAtTime(0.16 * k, crest, 0.35);
    wg.setTargetAtTime(0.0001, crest + 0.8, (t + P - crest) / 2.6);
  }
}

// --- Night garden -------------------------------------------------------------------------------

class Garden extends Ambience {
  build(t) {
    const ac = this.ac, white = whiteNoise(ac);
    const mix = this.head(this.gain(2.4), this.out);
    // soft wind: band-passed noise; its centre and level drift on slow, unrelated LFOs
    const wf = this.filter('bandpass', 520, 0.55);
    const wg = this.gain(0.26);
    this.chain(this.loop(white, t), wf, this.filter('lowpass', 1300, 0.4), wg, mix);
    this.lfo(wf.frequency, 0.057, 220, t);
    this.lfo(wg.gain, 0.041, 0.12, t);
    this.lfo(wg.gain, 0.113, 0.05, t);
    // leaves: a faint high rustle that follows a different gust clock
    const lg = this.gain(0.025);
    this.chain(this.loop(white, t, 0.95), this.filter('bandpass', 3000, 0.7), lg, mix);
    this.lfo(lg.gain, 0.067, 0.02, t);
    // three crickets at different distances, pitches and paces
    const verb = this.send(0.6);
    const crickets = [
      [cricketBuffer(ac, 0, 7.1, 4450, 32, 0.32), -0.55, 0.075, 4800],
      [cricketBuffer(ac, 1, 9.7, 4780, 36, 0.41), 0.5, 0.05, 4800],
      [cricketBuffer(ac, 2, 13.3, 4150, 28, 0.55), 0.1, 0.022, 3200],
    ];
    for (const [buf, p, lvl, lp] of crickets) {
      const g = this.gain(lvl);
      this.chain(this.loop(buf, t), this.filter('lowpass', lp, 0.5), g, this.pan(p), mix);
      if (verb) g.connect(verb);
    }
  }
}

// --- Soft piano ---------------------------------------------------------------------------------

// Diatonic chords in C major (pitch classes); the bass plays the root.
const PIANO_CHORDS = [
  { root: 0, pcs: [0, 4, 7], w: 3 },   // C
  { root: 9, pcs: [9, 0, 4], w: 2 },   // Am
  { root: 5, pcs: [5, 9, 0], w: 2.5 }, // F
  { root: 7, pcs: [7, 11, 2], w: 1.5 },// G
  { root: 4, pcs: [4, 7, 11], w: 1 },  // Em
  { root: 2, pcs: [2, 5, 9], w: 1 },   // Dm
];
const C_MAJOR = [0, 2, 4, 5, 7, 9, 11];
const pc = (m) => ((m % 12) + 12) % 12;

class Piano extends Ambience {
  build(t) {
    this.verb = this.send(2);
    this.mix = this.head(this.gain(2.8), this.out);
    this.nextNote = t + 0.3;
    this.nextChord = t;
    this.chord = PIANO_CHORDS[0];
    this.last = 67;
  }
  pickChord() {
    const pool = PIANO_CHORDS.filter((c) => c !== this.chord);
    let r = Math.random() * pool.reduce((s, c) => s + c.w, 0);
    for (const c of pool) { r -= c.w; if (r <= 0) return c; }
    return pool[0];
  }
  tick(tEnd) {
    while (!this.dead && this.nextNote < tEnd) {
      const t = this.nextNote;
      if (t >= this.nextChord) {
        if (t > this.t0 + 0.5) this.chord = this.pickChord();
        this.nextChord = t + rnd(8, 12);
        const bass = 36 + this.chord.root + (this.chord.root > 5 ? 0 : 12); // C2..B2 / C3..F3
        this.note(t, bass, 0.5);
        if (Math.random() < 0.5) this.note(t + 0.02, bass + 7, 0.28); // open fifth
      }
      // melody: chord tones mostly, stepwise-ish, inside C4..G5
      const cands = [];
      for (let m = 60; m <= 79; m++) {
        if (!C_MAJOR.includes(pc(m))) continue;
        const d = Math.abs(m - this.last);
        if (d === 0 || d > 7) continue;
        cands.push({ m, w: (this.chord.pcs.includes(pc(m)) ? 3 : 1) * (d <= 4 ? 2 : 1) });
      }
      let r = Math.random() * cands.reduce((s, c) => s + c.w, 0), m = this.last;
      for (const c of cands) { r -= c.w; if (r <= 0) { m = c.m; break; } }
      this.last = m;
      const v = rnd(0.42, 0.7);
      this.note(t + 0.35, m, v);
      if (Math.random() < 0.22) {
        // a soft dyad: the chord tone just below
        const below = [...this.chord.pcs].map((p) => { let x = m - 1; while (pc(x) !== p) x--; return x; }).sort((a, b) => b - a)[0];
        if (below >= 55) this.note(t + 0.38, below, v * 0.6);
      }
      this.nextNote = t + rnd(1.4, 3.6);
    }
  }
  /** One piano note: two slightly detuned partial-rich oscillators, a darkening low-pass, a long decay. */
  note(t, m, vel) {
    const ac = this.ac, f = midiHz(m);
    const wave = pianoWave(ac);
    const tau = m < 50 ? 2.6 : m < 66 ? 1.9 : 1.4; // lower notes ring longer
    const end = t + tau * 5;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.4;
    lp.frequency.setValueAtTime(Math.min(7000, f * 9), t);
    lp.frequency.setTargetAtTime(Math.max(300, f * 2.2), t + 0.02, 0.6);
    const g = ac.createGain();
    const peak = 0.11 * vel;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.008);
    g.gain.setTargetAtTime(peak * 0.45, t + 0.01, 0.25); // quick initial drop (hammer strike)
    g.gain.setTargetAtTime(0.0001, t + 0.3, tau);         // long ringing tail
    const oscs = [];
    for (const det of [-2.5, 2.5]) {
      const o = ac.createOscillator();
      if (wave) o.setPeriodicWave(wave); else o.type = 'sine';
      o.frequency.setValueAtTime(f, t);
      o.detune.setValueAtTime(det, t);
      o.connect(lp);
      oscs.push(o);
    }
    lp.connect(g); g.connect(this.mix);
    if (this.verb) g.connect(this.verb);
    const last = oscs[oscs.length - 1];
    for (const o of oscs) {
      o.onended = o === last
        ? () => { this.sources.delete(o); try { g.disconnect(); lp.disconnect(); } catch (_) { /* ignore */ } }
        : () => this.sources.delete(o);
      this.track(o, end);
      o.start(t); o.stop(end);
    }
  }
}

// --- Seaside café (a choice in Settings; new players start on the songs) -----------------------------------------------------
// Soft waves on the shore below the window, a quiet room tone, a gull far off now and then, and the odd
// faint clink of a cup on a saucer. Everything is low and rounded: no event is louder than the waves.

class Cafe extends Ambience {
  build(t, opts) {
    const ac = this.ac, white = whiteNoise(ac);
    const mix = this.head(this.gain(1.6), this.filter('lowpass', 7000, 0.5), this.out);
    this.mix = mix;
    this.verb = this.send(0.9);
    // waves: like Ocean but further away (darker, smaller swell)
    this.bodyF = this.filter('lowpass', 280, 0.3);
    this.bodyG = this.gain(0.1);
    this.chain(this.loop(white, t), this.bodyF, this.filter('lowpass', 1400, 0.3), this.bodyG, mix);
    this.washG = this.gain(0.0001);
    this.chain(this.loop(white, t, 0.94), this.filter('bandpass', 1300, 0.5), this.filter('lowpass', 2600, 0.4), this.washG, mix);
    // room tone: a faint, warm murmur of the cafe (low band of noise that breathes slowly)
    const room = this.gain(0.07);
    this.chain(this.loop(white, t, 1.04), this.filter('bandpass', 420, 0.6), this.filter('lowpass', 900, 0.4), room, mix);
    this.lfo(room.gain, 0.037, 0.025, t);
    this.nextWave = t + 0.05;
    this.nextGull = opts.gullAt != null ? t + opts.gullAt : t + rnd(6, 16);
    this.nextClink = opts.clinkAt != null ? t + opts.clinkAt : t + rnd(9, 20);
  }
  tick(tEnd) {
    while (!this.dead && this.nextWave < tEnd + 2) {
      const P = rnd(9, 13);
      this.wave(this.nextWave, P);
      this.nextWave += P;
    }
    while (!this.dead && this.nextGull < tEnd) {
      this.gulls(this.nextGull);
      this.nextGull += rnd(18, 40);
    }
    while (!this.dead && this.nextClink < tEnd) {
      this.clink(this.nextClink);
      this.nextClink += rnd(12, 30);
    }
  }
  /** One wave: automation only (no new nodes). */
  wave(t, P) {
    const k = rnd(0.55, 0.95);
    const crest = t + P * rnd(0.5, 0.6);
    const bg = this.bodyG.gain, bf = this.bodyF.frequency, wg = this.washG.gain;
    bg.setTargetAtTime(0.36 * k, t, (crest - t) / 2.6);
    bf.setTargetAtTime(420 + 600 * k, t, (crest - t) / 2.2);
    bg.setTargetAtTime(0.08, crest, (t + P - crest) / 2.4);
    bf.setTargetAtTime(260, crest, (t + P - crest) / 2.2);
    wg.setTargetAtTime(0.04 * k, t + (crest - t) * 0.6, (crest - t) / 3);
    wg.setTargetAtTime(0.1 * k, crest, 0.4);
    wg.setTargetAtTime(0.0001, crest + 0.8, (t + P - crest) / 2.6);
  }
  /** A distant gull: 2-3 soft falling "kee-ow" calls, mostly reverb (4 nodes per call). */
  gulls(t) {
    const calls = 2 + (Math.random() < 0.4 ? 1 : 0);
    const pan = rnd(-0.7, 0.7);
    let at = t;
    for (let i = 0; i < calls; i++) {
      this.gullCall(at, pan, rnd(0.014, 0.022) * (i === 0 ? 1 : 0.8));
      at += rnd(0.38, 0.6);
    }
  }
  gullCall(t, pan, amp) {
    const ac = this.ac, dur = rnd(0.32, 0.45), f0 = rnd(1250, 1500);
    const o = ac.createOscillator(); o.type = 'triangle';
    o.frequency.setValueAtTime(f0 * 0.82, t);
    o.frequency.linearRampToValueAtTime(f0, t + dur * 0.18);
    o.frequency.exponentialRampToValueAtTime(f0 * 0.6, t + dur);
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 1.1;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(amp, t + 0.05);
    g.gain.setTargetAtTime(0.0001, t + dur * 0.55, dur / 5);
    const p = ac.createStereoPanner ? ac.createStereoPanner() : ac.createGain();
    if (p.pan) p.pan.value = pan;
    o.connect(bp); bp.connect(g); g.connect(p); p.connect(this.mix);
    if (this.verb) g.connect(this.verb);
    const end = t + dur + 0.6;
    o.onended = () => { this.sources.delete(o); try { g.disconnect(); bp.disconnect(); p.disconnect(); } catch (_) { /* ignore */ } };
    this.track(o, end);
    o.start(t); o.stop(end);
  }
  /** A faint china clink: two inharmonic sine partials with a quick ring (3 nodes). */
  clink(t) {
    const ac = this.ac, f = rnd(2300, 2900), amp = rnd(0.008, 0.014);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(amp, t + 0.004);
    g.gain.setTargetAtTime(0.0001, t + 0.01, 0.09);
    g.connect(this.mix);
    if (this.verb) g.connect(this.verb);
    const end = t + 0.7;
    const oscs = [f, f * 2.71].map((hz) => { const o = ac.createOscillator(); o.frequency.value = hz; o.connect(g); return o; });
    const last = oscs[1];
    for (const o of oscs) {
      o.onended = o === last ? () => { this.sources.delete(o); try { g.disconnect(); } catch (_) { /* ignore */ } } : () => this.sources.delete(o);
      this.track(o, end);
      o.start(t); o.stop(end);
    }
    // a second, softer touch sometimes (cup set back down)
    if (Math.random() < 0.35 && !this.dead) {
      const t2 = t + rnd(0.18, 0.3);
      const g2 = ac.createGain();
      g2.gain.setValueAtTime(0.0001, t2);
      g2.gain.exponentialRampToValueAtTime(amp * 0.5, t2 + 0.004);
      g2.gain.setTargetAtTime(0.0001, t2 + 0.01, 0.06);
      g2.connect(this.mix);
      const o2 = ac.createOscillator(); o2.frequency.value = f * 1.06; o2.connect(g2);
      o2.onended = () => { this.sources.delete(o2); try { g2.disconnect(); } catch (_) { /* ignore */ } };
      this.track(o2, t2 + 0.5);
      o2.start(t2); o2.stop(t2 + 0.5);
    }
  }
}

// --- Rainy café collection (src/meta/soundCollections.js; prototype, web only) ------------------------
// Three backdrops sharing one light rain bed built from the same cached noise and droplet loops (no new
// buffers). Inside the café the rain is heard through the window and on the awning, so the beds are darker
// than Rain. Every extra event is sparse and quieter than the bed; nothing is sharp or high-pitched.

class RainyCafe extends Ambience {
  /** The shared bed: a soft wash, a low body and one or two droplet loops; k scales the whole bed. */
  rainBed(t, mix, k = 1, drops = 2) {
    const ac = this.ac, white = whiteNoise(ac);
    const wash = this.gain(0.3 * k);
    this.chain(this.loop(white, t), this.filter('highpass', 420, 0.5), this.filter('bandpass', 1600, 0.45), wash, mix);
    this.lfo(wash.gain, 0.043, 0.06 * k, t);
    this.chain(this.loop(white, t, 1.03), this.filter('lowpass', 360, 0.4), this.gain(0.42 * k), mix);
    this.chain(this.loop(dropBuffer(ac, 0, 5.3, 34), t), this.filter('lowpass', 4200, 0.4), this.gain(0.75 * k), mix);
    if (drops > 1) this.chain(this.loop(dropBuffer(ac, 1, 7.9, 22), t, 0.92), this.filter('lowpass', 3200, 0.4), this.gain(0.6 * k), mix);
  }
  /** One short tonal touch (a spoon on a rim): a sine with a quick ring, 2 nodes, cleaned up when it ends. */
  ting(t, hz, amp, tau) {
    const ac = this.ac, end = t + tau * 7 + 0.02;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(amp, t + 0.004);
    g.gain.setTargetAtTime(0.0001, t + 0.01, tau);
    g.connect(this.mix);
    if (this.verb) g.connect(this.verb);
    const o = ac.createOscillator(); o.frequency.value = hz; o.connect(g);
    o.onended = () => { this.sources.delete(o); try { g.disconnect(); } catch (_) { /* ignore */ } };
    this.track(o, end);
    o.start(t); o.stop(end);
  }
}

/** Rain on the awning: rain drumming softly on taut canvas overhead, with a heavier drip off the edge now and then. */
class Awning extends RainyCafe {
  build(t, opts) {
    const ac = this.ac, white = whiteNoise(ac);
    const mix = this.head(this.gain(1.25), this.filter('lowpass', 5000, 0.5), this.out);
    this.mix = mix;
    this.rainBed(t, mix, 0.85, 1);
    // the canvas: the droplet loop slowed down and band-passed low, so each drop is a soft "tup" on fabric
    const canvas = this.gain(1.15);
    this.chain(this.loop(dropBuffer(ac, 1, 7.9, 22), t, 0.58), this.filter('bandpass', 850, 0.55), canvas, mix);
    this.lfo(canvas.gain, 0.061, 0.2, t);
    // a faint low resonance of the stretched cloth
    this.chain(this.loop(white, t, 0.97), this.filter('bandpass', 240, 1.2), this.gain(0.12), mix);
    this.nextDrip = opts.dripAt != null ? t + opts.dripAt : t + rnd(1.5, 4);
  }
  tick(tEnd) {
    while (!this.dead && this.nextDrip < tEnd) {
      this.drip(this.nextDrip, rnd(0.04, 0.07));
      if (Math.random() < 0.3) this.drip(this.nextDrip + rnd(0.35, 0.7), rnd(0.025, 0.045));
      this.nextDrip += rnd(2.5, 7);
    }
  }
  /** A heavier drop landing on the canvas: a short low-passed noise thump (3 nodes). */
  drip(t, amp) {
    const ac = this.ac, end = t + 0.3;
    const src = ac.createBufferSource(); src.buffer = whiteNoise(ac); src.loop = true;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.9;
    lp.frequency.setValueAtTime(rnd(650, 900), t); lp.frequency.exponentialRampToValueAtTime(220, t + 0.12);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(amp, t + 0.006);
    g.gain.setTargetAtTime(0.0001, t + 0.01, 0.035);
    src.connect(lp); lp.connect(g); g.connect(this.mix);
    src.onended = () => { this.sources.delete(src); try { g.disconnect(); lp.disconnect(); } catch (_) { /* ignore */ } };
    this.track(src, end);
    src.start(t, Math.random() * 3); src.stop(end);
  }
}

/** Cups and saucers: light rain at the window and the odd soft clink of china, sometimes a spoon in a cup. */
class Cups extends RainyCafe {
  build(t, opts) {
    const mix = this.head(this.gain(1.25), this.filter('lowpass', 6000, 0.5), this.out);
    this.mix = mix;
    this.verb = this.send(0.9);
    this.rainBed(t, mix, 0.75, 2);
    // faint room tone so the gaps feel like a room, not a field
    const room = this.gain(0.05);
    this.chain(this.loop(whiteNoise(this.ac), t, 1.05), this.filter('bandpass', 400, 0.6), room, mix);
    this.lfo(room.gain, 0.033, 0.018, t);
    this.nextClink = opts.clinkAt != null ? t + opts.clinkAt : t + rnd(3, 8);
    this.nextSpoon = opts.spoonAt != null ? t + opts.spoonAt : t + rnd(20, 40);
  }
  tick(tEnd) {
    while (!this.dead && this.nextClink < tEnd) {
      this.clink(this.nextClink);
      this.nextClink += rnd(7, 18);
    }
    while (!this.dead && this.nextSpoon < tEnd) {
      this.spoon(this.nextSpoon);
      this.nextSpoon += rnd(30, 70);
    }
  }
  /** A cup on a saucer: the Seaside café clink (two inharmonic partials, sometimes a second softer touch). */
  clink(t) { Cafe.prototype.clink.call(this, t); }
  /** A spoon stirring: 3-4 tiny, quiet touches on the rim. */
  spoon(t) {
    const n = 3 + (Math.random() < 0.5 ? 1 : 0), f = rnd(3100, 3600);
    for (let i = 0; i < n; i++) this.ting(t + i * rnd(0.16, 0.24), f * rnd(0.98, 1.02), rnd(0.003, 0.005), 0.05);
  }
}

/** Quiet murmur: light rain and a very low, unintelligible hum of a few people talking softly far across the room. */
class Murmur extends RainyCafe {
  build(t) {
    const ac = this.ac, white = whiteNoise(ac);
    const mix = this.head(this.gain(1.25), this.filter('lowpass', 5000, 0.5), this.out);
    this.mix = mix;
    this.rainBed(t, mix, 0.7, 1);
    // the voices: a few soft buzzes at speaking pitch, each coming and going on its own slow "phrase" clock
    // with a gentle syllable flutter, all through one low formant band, so no word can ever be heard
    const formant = this.filter('bandpass', 480, 0.7);
    const talk = this.gain(0.06);
    this.chain(formant, this.filter('lowpass', 650, 0.5), talk, mix);
    const voices = [[118, 3.1, 0.071], [172, 4.3, 0.053], [205, 3.7, 0.089]];
    for (const [hz, syl, phrase] of voices) {
      const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz;
      this.track(o, Infinity);
      const v = this.gain(0.5);
      this.chain(o, v, formant);
      this.lfo(v.gain, phrase, 0.5, t);   // the voice fades in and out over ~11-19 s
      this.lfo(v.gain, syl, 0.14, t);     // a soft syllable flutter, never a word
      o.start(t);
    }
    // breath of the room: noise through the same formant band, very low
    this.chain(this.loop(white, t, 0.96), this.gain(0.8), formant);
  }
}

const KINDS = { rain: Rain, ocean: Ocean, garden: Garden, piano: Piano, cafe: Cafe, awning: Awning, cups: Cups, murmur: Murmur };

/** Backdrops that make sound (music and silence are handled by audio.js). */
export const AMBIENCE_IDS = Object.keys(KINDS);

/**
 * Start a backdrop. dest: the music bus (volume, ducking and Calm already apply there); wetDest: the
 * music reverb input (optional). opts.fadeIn (s, default 1.5); opts.thunderAt (QA: first thunder at
 * this many seconds); opts.gullAt / opts.clinkAt (QA: first café gull / clink). Returns the session, or null for an unknown id.
 */
export function createAmbience(ac, id, dest, wetDest = null, opts = {}) {
  const K = KINDS[id];
  if (!K || !ac) return null;
  const t0 = ac.currentTime;
  const fadeIn = opts.fadeIn ?? 1.5;
  const A = new K(ac, id, dest, wetDest, fadeIn, t0);
  A.fadeIn = fadeIn;
  A.build(t0 + 0.02, opts);
  return A;
}

/** QA/tests: drop the cached buffers for a context. */
export function _ambienceCache(ac) { return cache.get(ac) || null; }
