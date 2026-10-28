// Autoplay (test mode): the game plays itself so features can be watched.
// The bot only issues the inputs a player could (aim, drop, hold, comet, tap a perk card).
// It looks ahead on CLONED boards with the same greedy scoring as the level-solvability
// bot (levels.js), so it never touches a run RNG, the real board or any rule.
// Runs it touches are flagged `run.autoplay` and are not saved (see game.js / main.js).
import { cloneBoard, dropOrb, removeAt, landingRow, getCell } from './board.js';
import { evalBoard, goalValue, applyProgress } from './levels.js';
import { PERKS, PERK_BY_ID } from './perks.js';

// ---- Autoplay test options (settings.test). They only ever apply to runs flagged
// run.autoplay (never saved), so player runs, saves, scores and ads are untouched.
export const TEST_DEFAULTS = { perks: 'normal', fastSectors: false, speed: 1, showcase: false };
export const FAST_SECTOR_DIV = 5;

/** Normalised test options from save.settings (safe defaults for anything missing/odd). */
export function testOptions(settings) {
  const t = (settings && settings.test) || {};
  return {
    perks: ['normal', 'all', 'setups'].includes(t.perks) ? t.perks : 'normal',
    fastSectors: t.fastSectors === true,
    speed: [1, 2, 4].includes(t.speed) ? t.speed : 1,
    showcase: t.showcase === true,
  };
}

/** Perk stacks a test run starts with: 'all' = every regular perk ×1 + every Constellation;
 * 'setups' = both parts of each Constellation (so they get offered right away). */
export function testPerkSet(mode) {
  if (mode === 'all') return Object.fromEntries(PERKS.map((p) => [p.id, 1]));
  if (mode === 'setups') {
    const out = {};
    for (const p of PERKS) if (p.evolution) for (const id of p.requires) out[id] = 1;
    return out;
  }
  return {};
}

/** Which offered perk the bot taps: a Constellation when one is offered, else the first card. Pure. */
export function choosePerk(offer) {
  if (!offer || !offer.length) return null;
  return offer.find((id) => PERK_BY_ID[id] && PERK_BY_ID[id].evolution) || offer[0];
}

/** Best column for `spec` on the run's board, or null if every column is full. Pure. */
export function bestDrop(run, spec) {
  if (!spec) return null;
  const b = run.board;
  const level = run.mode === 'journey' ? run.level : null;
  const opts = run.mods && run.mods.boardOpts;
  const baseGoal = level ? goalValue(level, run.prog) : 0;
  let best = null;
  for (let c = 0; c < b.cols; c++) {
    if (landingRow(b, c) < 0) continue;
    const tb = cloneBoard(b);
    const res = dropOrb(tb, c, spec, opts);
    if (!res.ok) continue;
    let val = res.points * 0.25 + res.maxTier * 4 + evalBoard(tb);
    if (level) {
      const tp = applyProgress(level, run.prog.slice(), res, run.score + res.points);
      val += (goalValue(level, tp) - baseGoal) * 3;
    }
    if (!best || val > best.val) best = { col: c, val };
  }
  return best;
}

/**
 * Decide the next player input. Pure (reads the run, mutates nothing).
 * Returns { type:'drop', col } | { type:'hold' } | { type:'comet', r, c } | null (no legal move).
 */
export function chooseMove(run, opts = {}) {
  if (!run || !run.board || !run.current) return null;
  const cur = bestDrop(run, run.current);
  // Showcase (test option): now and then use the hold slot / a comet so the perks are seen.
  // Same legal inputs a player has; the cadence is a plain move counter (no RNG).
  if (opts.showcase && run.mode === 'endless') {
    const n = opts.moveIndex || 0;
    if (run.comets > 0 && n % 7 === 6) {
      const tgt = bestComet(run, true);
      if (tgt) return { type: 'comet', r: tgt.r, c: tgt.c };
    }
    if (run.owned && run.owned.hold && !run.holdUsed && n % 5 === 2) return { type: 'hold' };
  }
  // hold slot (Endless perk): swap only when the other orb is clearly better here
  if (run.mode === 'endless' && run.owned && run.owned.hold && !run.holdUsed) {
    const alt = bestDrop(run, run.hold || run.next);
    if (alt && (!cur || alt.val > cur.val + 8)) return { type: 'hold' };
  }
  if (cur) return { type: 'drop', col: cur.col };
  // every column full: an Endless comet charge (run-local, never bought) can clear a cell
  if (run.mode === 'endless' && run.comets > 0) {
    const best = bestComet(run, false);
    if (best) return { type: 'comet', r: best.r, c: best.c };
  }
  return null;
}

/** Best comet target on a cloned board. `showy` prefers big Meteor Shower clears. Pure. */
function bestComet(run, showy) {
  const b = run.board;
  const opts = run.mods && run.mods.boardOpts;
  let best = null;
  for (let r = 0; r < b.rows; r++) {
    for (let c = 0; c < b.cols; c++) {
      if (!getCell(b, r, c)) continue;
      const tb = cloneBoard(b);
      const res = removeAt(tb, r, c, opts);
      if (!res.ok) continue;
      const val = res.points * 0.25 + evalBoard(tb) + (showy ? res.cleared.length * 6 : 0);
      if (!best || val > best.val) best = { r, c, val };
    }
  }
  return best;
}

/**
 * Frame-driven controller. `env` (all optional):
 *   modal()      -> 'perk' | 'next' | 'other' | null   (what overlay is up)
 *   pickPerk()   -> taps a perk card, like the player would
 *   clickNext()  -> taps "Next Level" on a won Journey result
 *   reduced()    -> true in Calm mode (slower, no aim sweep)
 *   onStuck()    -> no legal move (e.g. Journey board full); the player takes over
 */
export class Autoplay {
  constructor(game, env = {}) {
    this.game = game;
    this.env = env;
    this.enabled = false;
    this.moves = 0;
    this.reset();
    this.modalT = 0;
  }

  setEnabled(on) {
    this.enabled = !!on;
    this.game.autoplayEnabled = this.enabled;
    this.reset();
    this.modalT = 0;
  }

  reset() { this.phase = 'wait'; this.t = 0; this.target = -1; this.stepT = 0; }

  update(dt) {
    if (!this.enabled) return;
    const g = this.game;
    const env = this.env;
    const calm = !!(env.reduced && env.reduced());
    const m = env.modal ? env.modal() : null;
    const topt = env.testOptions ? env.testOptions() : TEST_DEFAULTS;
    if (m === 'perk' || m === 'next') {
      // let the player read the choice, then tap it (real time: never sped up, so the
      // cards and Constellation hints stay readable at any speed)
      this.modalT += dt;
      if (this.modalT >= (calm ? 1.8 : topt.showcase ? 1.6 : 1.3)) {
        this.modalT = 0;
        if (m === 'perk') { g.markAutoplay && g.markAutoplay(); env.pickPerk && env.pickPerk(); } else if (env.clickNext) env.clickNext();
      }
      this.reset();
      return;
    }
    this.modalT = 0;
    // any other overlay (pause, revive, fail offer, shop...) belongs to the player
    if (m) { this.reset(); return; }
    const r = g.run;
    // Puzzle Books are the player's own: the test bot never plays (or stamps) a book puzzle
    if (g.mode !== 'game' || !r || r.book || r.ended || g.state !== 'playing' || g.busy || g.tally || g.targetMode || g.queuedCol != null) {
      this.reset();
      return;
    }
    dt *= topt.speed || 1; // bot pace (test option)
    this.t += dt;
    const settle = calm ? 0.45 : 0.3;
    if (this.phase === 'wait') {
      if (this.t < settle) return;
      const mv = chooseMove(r, { showcase: topt.showcase, moveIndex: this.moves });
      if (!mv) {
        if (!r.autoplayStuck) { r.autoplayStuck = true; env.onStuck && env.onStuck(); }
        this.t = 0;
        return;
      }
      g.markAutoplay();
      if (mv.type === 'hold') { g.useHold(); this.t = settle * 0.5; if (topt.showcase) this.moves++; return; }
      if (mv.type === 'comet') { g.setCometMode(true); g.useComet(mv.r, mv.c); this.reset(); if (topt.showcase) this.moves++; return; }
      this.target = mv.col;
      this.phase = 'aim';
      this.t = 0;
      this.stepT = 0;
      g.aim.visible = true;
      if (calm) g.aim.col = mv.col;
      return;
    }
    if (this.phase === 'aim') {
      const a = g.aim;
      a.visible = true;
      // sweep one column at a time so the aim and landing ghost are easy to follow
      if (a.col !== this.target) {
        this.stepT += dt;
        if (this.stepT >= 0.11) { this.stepT = 0; a.col += a.col < this.target ? 1 : -1; }
        this.t = 0;
        return;
      }
      if (this.t < (calm ? 0.6 : 0.45)) return;
      const col = this.target;
      this.reset();
      this.moves++;
      g.requestDrop(col);
    }
  }
}
