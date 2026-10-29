// Journey mode: level definitions, goal tracking, seeded generator and a greedy bot
// used to guarantee every level is solvable. Pure logic, no DOM.
import {
  createBoard, cloneBoard, boardFromRows, dropOrb, pushRow, resolve, spawnOrb, landingRow, isBoardFull,
  columnHeight, getCell, setCell, makeOrb, findGroups, ROWS, COLS, MAX_TIER,
} from './board.js';
import { mulberry32, deriveSeed, hashString } from './rng.js';
import { tierName, tierNameN, novaGoalText } from './tierNames.js'; // display names only (skin-aware)
import { CHAPTER_SIZE, chapterOf, chapterInfo, withText, TEXT, t, tp } from './chapters.js'; // withText / TEXT: content text (hand-made tips); t / tp: goal text
import { LEVEL_PLAN, PLAN_HASH } from './levelPlan.js';

// 1,000 levels. 1-15 are hand-made; 16-150 come from genCandidate (sawtooth: every 5th Hard, every 10th Super Hard),
// 151-1000 from genCandidateV3 (chapter beats below). Every generated level passed the casual acceptance (acceptCandidate).
export const LEVEL_COUNT = 1000;
export const LEGACY_LEVEL_COUNT = 150;
/** levelsHash(1, 150), pinned: tests/levels.test.mjs and the C# port check it (re-pin only on a deliberate level change). */
export const LEGACY_HASH = 3748256795;
export { PLAN_HASH };
export const BOOSTER_UNLOCKS = { comet: 6, wild: 11, shuffle: 16 };

const E = 0;

// ---------------------------------------------------------------- hand-tuned tutorial ramp (1–15)
// prefill rows are top->bottom; only the bottom rows need listing (padded automatically).
const HAND = [
  { // 1: a small prefill so the very first tap merges (the first orb is a Pebble; every column merges)
    goals: [{ type: 'tier', tier: 2, count: 3 }], drops: 14,
    prefill: [[2, E, 2, E, 2]],
    tip: TEXT,
  },
  { // 2
    goals: [{ type: 'tier', tier: 3, count: 2 }], drops: 16,
    tip: TEXT,
  },
  { // 3
    goals: [{ type: 'score', count: 200 }], drops: 24,
    prefill: [[1, 2, E, 2, 1]],
    tip: TEXT,
  },
  { // 4
    goals: [{ type: 'combo', count: 2 }], drops: 14,
    prefill: [[E, E, E, E, E], [2, 3, E, 3, 2]],
    tip: TEXT,
  },
  { // 5 (a normal tutorial level: random tapping wins it ~95% of the time, so it is not labelled Hard)
    goals: [{ type: 'tier', tier: 4, count: 2 }], drops: 26,
    tip: TEXT,
  },
  { // 6 asteroids + comet booster
    goals: [{ type: 'asteroids', count: 2 }], drops: 18,
    prefill: [[E, E, E, E, E], ['A', 1, E, 2, 'A']],
    tip: TEXT,
  },
  { // 7
    goals: [{ type: 'tier', tier: 5, count: 1 }], drops: 26,
    tip: TEXT,
  },
  { // 8
    goals: [{ type: 'combo', count: 3 }, { type: 'score', count: 400 }], drops: 36,
    prefill: [[E, E, E, E, E], [1, 2, 3, 2, 1]],
    tip: TEXT,
  },
  { // 9
    goals: [{ type: 'asteroids', count: 4 }],
    prefill: [[E, 'A', E, 'A', E], ['A', 2, 1, 2, 'A']], drops: 16,
  },
  { // 10 SUPER HARD
    goals: [{ type: 'tier', tier: 6, count: 1 }, { type: 'asteroids', count: 2 }], drops: 40,
    prefill: [[E, E, E, E, E], ['A', 1, 3, 1, 'A']],
    tip: TEXT,
  },
  { // 11 tide + wild booster
    goals: [{ type: 'tier', tier: 5, count: 2 }], drops: 34, tide: 9,
    tip: TEXT,
  },
  { // 12
    goals: [{ type: 'score', count: 800 }], drops: 52,
    prefill: [[E, E, E, E, E], [3, 1, 2, 1, 3]],
  },
  { // 13
    goals: [{ type: 'tier', tier: 6, count: 1 }, { type: 'tier', tier: 5, count: 2 }], drops: 44,
  },
  { // 14
    goals: [{ type: 'asteroids', count: 5 }, { type: 'tier', tier: 5, count: 1 }], drops: 34,
    prefill: [['A', E, 'A', E, 'A'], [1, 'A', 2, 'A', 1]],
  },
  { // 15 HARD
    goals: [{ type: 'tier', tier: 7, count: 1 }, { type: 'combo', count: 3 }], drops: 62,
    tip: TEXT,
  },
];
// tip: TEXT is the intro tip, content text level.<n>.tip (src/i18n/content/en.js; display only, never a rule)
HAND.forEach((h, i) => withText(h, `level.${i + 1}`));

// Sawtooth from level 10: every 5th level Hard, every 10th Super Hard. Level 5 sits in the gentle
// tutorial ramp (random tapping wins it ~95% of the time), so it stays a normal level.
export const FIRST_HARD_LEVEL = 10;

export function levelKind(n) {
  if (n > LEGACY_LEVEL_COUNT) return BEATS[levelBeat(n)].kind;
  if (n % 10 === 0) return 'superhard';
  if (n % 5 === 0 && n >= FIRST_HARD_LEVEL) return 'hard';
  return 'normal';
}

function padPrefill(rows) {
  if (!rows) return null;
  const out = [];
  for (let i = 0; i < ROWS - rows.length; i++) out.push([E, E, E, E, E]);
  return out.concat(rows.map((r) => r.slice()));
}

// ---------------------------------------------------------------- goals

/** Player-facing goal text. skin (optional): names tiers the way that orb skin does (display only, src/game/tierNames.js). */
export function goalText(g, short = false, skin) {
  switch (g.type) {
    case 'tier': return short ? tierName(g.tier, skin) : t('goal.tier', { n: g.count, name: tierNameN(g.tier, g.count, skin) });
    case 'asteroids': return short ? t('goal.short.asteroids') : tp('goal.asteroids', g.count);
    case 'score': return short ? t('goal.short.score') : t('goal.score', { n: g.count.toLocaleString('en-US') });
    case 'supernova': return short ? tierName(10, skin) : novaGoalText(g.count, skin); // a pack skin names its own top piece
    case 'combo': return short ? t('goal.short.combo') : t('goal.combo', { n: g.count });
    case 'order': return short ? tierName(g.tier, skin) : t('goal.order', { n: g.count, name: tierNameN(g.tier, g.count, skin) });
    case 'teapot': return short ? t('goal.short.teapots') : tp('goal.teapot', g.count);
    default: return g.type;
  }
}

export function newProgress(level) {
  return level.goals.map(() => 0);
}

/** Feed a resolution result (from dropOrb/resolve/removeAt) into goal progress. Mutates prog. */
export function applyProgress(level, prog, res, totalScore) {
  level.goals.forEach((g, i) => {
    switch (g.type) {
      case 'tier':
        for (const s of res.steps || []) for (const m of s.merges) if (m.tier >= g.tier) prog[i]++;
        break;
      case 'asteroids': prog[i] += res.asteroidsBroken || 0; break;
      case 'supernova': prog[i] += res.supernovas || 0; break;
      case 'combo': prog[i] = Math.max(prog[i], res.maxCombo || 0); break;
      case 'score': prog[i] = totalScore; break;
      case 'order':
        for (const s of res.steps || []) for (const sv of s.served || []) if (sv.tier === g.tier) prog[i]++;
        break;
      case 'teapot':
        prog[i] += (res.preDelivered || []).length;
        for (const s of res.steps || []) prog[i] += (s.delivered || []).length;
        break;
    }
    prog[i] = Math.min(prog[i], g.count);
  });
  return prog;
}

/**
 * Café Orders (DESIGN.md "Café Orders"): board options with the level's open order tickets ({ tier, left } from its
 * 'order' goals minus progress), so a merge that makes an ordered piece serves it. base: the run's board options
 * (perks), or null. A level without open tickets gets `base` back unchanged. Used by game.js, the bot and the C# port.
 */
export function orderOpts(level, prog, base) {
  let orders = null;
  level.goals.forEach((g, i) => {
    if (g.type === 'order' && prog[i] < g.count) (orders || (orders = [])).push({ tier: g.tier, left: g.count - prog[i] });
  });
  return orders ? { ...(base || {}), orders } : base;
}

export function goalsMet(level, prog) {
  return level.goals.every((g, i) => prog[i] >= g.count);
}

/**
 * Honest near-miss rule (DESIGN.md "Fail offer"): an unmet goal is close when at most 2 are left (pieces, stones,
 * teapots, combo steps; never points) or at least 80% of it is done (left * 5 <= count, integer maths).
 */
export function goalClose(g, prog) {
  const left = g.count - prog;
  if (left <= 0) return true;
  return left * 5 <= g.count || (g.type !== 'score' && left <= 2);
}

/**
 * Honest "what's left" copy for the fail offer: "Only … left!" only when every unmet goal is close (goalClose),
 * otherwise a neutral "Still to go: …." ('' when nothing is left).
 */
export function remainingText(level, prog, skin) {
  const parts = [];
  let close = true;
  level.goals.forEach((g, i) => {
    const left = g.count - prog[i];
    if (left <= 0) return;
    if (!goalClose(g, prog[i])) close = false;
    // UI keys goal.left.* (English text unchanged; the counts are plain digits as before, score en-US grouped)
    if (g.type === 'tier') parts.push(t('goal.left.tier', { n: left, name: tierNameN(g.tier, left, skin) }));
    else if (g.type === 'asteroids') parts.push(tp('goal.left.asteroids', left));
    else if (g.type === 'score') parts.push(tp('goal.left.score', left, { n: left.toLocaleString('en-US') }));
    else if (g.type === 'supernova') parts.push(t('goal.left.tier', { n: left, name: tierNameN(10, left, skin) }));
    else if (g.type === 'combo') parts.push(t('goal.left.combo', { n: g.count }));
    else if (g.type === 'order') parts.push(t('goal.left.order', { n: left, name: tierNameN(g.tier, left, skin) }));
    else if (g.type === 'teapot') parts.push(tp('goal.left.teapot', left));
  });
  if (!parts.length) return '';
  const list = parts.join(t('goal.left.and'));
  return close ? t('goal.left.close', { list }) : t('goal.left.open', { list });
}

export function starsFor(level, dropsLeft) {
  const t3 = Math.max(2, Math.round(level.drops * 0.25));
  const t2 = Math.max(1, Math.round(level.drops * 0.1));
  return dropsLeft >= t3 ? 3 : dropsLeft >= t2 ? 2 : 1;
}

export function levelReward(level, stars, firstTime) {
  const mult = level.kind === 'superhard' ? 3 : level.kind === 'hard' ? 2 : 1;
  return firstTime ? (20 + stars * 10) * mult : 5 * stars * mult;
}

// ---------------------------------------------------------------- Undo last drop (Fun Wave D, DESIGN.md)
// One free undo per Journey attempt. Never sold, never ad-gated, never in Endless or the Daily
// Challenge. The Daily Nebula allows it only in practice replays (its scored first attempt stays
// comparable for everyone). Undo restores the exact pre-drop state, score included.
export const UNDO_PER_ATTEMPT = 1;

/** May this Journey attempt use the free undo? `practice`: a Daily Nebula replay after its scored attempt. */
export function undoAllowed(level, { practice = false } = {}) {
  if (!level) return false;
  return !level.daily || !!practice;
}

// run fields an undo puts back (plain numbers / booleans). Missing fields are skipped.
const UNDO_FIELDS = ['score', 'dropsLeft', 'dropsUntilTide', 'tideK', 'drops', 'holdUsed', 'wildPending',
  'maxCombo', 'maxTier', 'merges', 'supernovas', 'asteroids', 'passedBest', 'secondCups'];
const UNDO_RNGS = ['rng', 'tideRng', 'shuffleRng'];

/** Plain-data snapshot of a Journey run right before a drop (JSON-safe: Infinity tide stored as -1). */
export function takeUndo(run) {
  const u = {
    board: cloneBoard(run.board),
    current: run.current ? { ...run.current } : null,
    next: run.next ? { ...run.next } : null,
    hold: run.hold ? { ...run.hold } : null,
    prog: run.prog.slice(),
    rngs: {},
  };
  for (const k of UNDO_FIELDS) if (k in run) u[k] = run[k];
  if (u.dropsUntilTide === Infinity) u.dropsUntilTide = -1;
  for (const k of UNDO_RNGS) if (run[k] && run[k].getState) u.rngs[k] = run[k].getState();
  if (run.bestChain) u.bestChain = { ...run.bestChain };
  if (Array.isArray(run.dropLog)) u.dropLogLen = run.dropLog.length;
  return u;
}

/** Put a run back to a takeUndo() snapshot (same objects; RNG streams rewound in place). */
export function restoreUndo(run, u) {
  run.board = cloneBoard(u.board);
  run.current = u.current ? { ...u.current } : null;
  run.next = u.next ? { ...u.next } : null;
  run.hold = u.hold ? { ...u.hold } : null;
  run.prog = u.prog.slice();
  for (const k of UNDO_FIELDS) if (k in u) run[k] = u[k];
  if (run.dropsUntilTide === -1 || run.dropsUntilTide == null) run.dropsUntilTide = Infinity;
  for (const k of UNDO_RNGS) if (u.rngs[k] != null && run[k] && run[k].setState) run[k].setState(u.rngs[k]);
  if (u.bestChain) run.bestChain = { ...u.bestChain };
  if (Array.isArray(run.dropLog) && u.dropLogLen != null) run.dropLog.length = u.dropLogLen;
  return run;
}

// ---------------------------------------------------------------- Second cup (DESIGN.md "Second cup")
// A Journey drop whose own cascade has SECOND_CUP.chain or more merge steps (a ×4 chain) gives +1 drop, at most
// SECOND_CUP.max times per level attempt. Only the drop's own resolution counts (not a tide row's cascade, not a
// Comet or Shuffle); a Wild Orb drop is a drop. Same for every player, never tied to ads, spending or the device.
// Not in the Daily Nebula (a shared scored puzzle) and not in Endless / Free Play (no drop limit there).
export const SECOND_CUP = Object.freeze({ chain: 4, max: 2 });
const NO_CUP = Object.freeze({ secondCup: false }); // Daily Nebula generation (its bot plays without the rule)

/** Is Second cup on for this level? opts.secondCup (true / false) overrides; else every non-Daily level. */
export function secondCupOn(level, opts) {
  if (opts && opts.secondCup != null) return !!opts.secondCup;
  return !!level && !level.daily;
}

/** Drops a resolved drop with `steps` cascade steps grants, given `granted` Second cups so far this attempt (0 or 1). */
export function secondCupGain(steps, granted) {
  return steps >= SECOND_CUP.chain && granted < SECOND_CUP.max ? 1 : 0;
}

// ---------------------------------------------------------------- level construction

export function levelRngs(level) {
  return {
    spawn: mulberry32(deriveSeed(level.seed, 'spawn')),
    tide: mulberry32(deriveSeed(level.seed, 'tide')),
    shuffle: mulberry32(deriveSeed(level.seed, 'shuffle')),
  };
}

/**
 * Steady Start (DESIGN.md): after 3 fails in a row on a Journey level the player may start with
 * one Wild Orb pre-placed on the board. Deterministic: its own seeded stream ('steady'), so the
 * spawn / tide / shuffle streams and the level itself are untouched. Never for the Daily Nebula
 * (a shared daily puzzle must be the same board for everyone) -> null.
 * Column: seeded pick among columns whose landing row is >= 2; row: that landing row.
 */
export function steadyPlacement(level, board = null) {
  if (!level || level.daily) return null;
  const b = board || buildBoard(level);
  const cands = [];
  for (let c = 0; c < b.cols; c++) if (landingRow(b, c) >= 2) cands.push(c);
  if (!cands.length) return null;
  const rng = mulberry32(deriveSeed(level.seed, 'steady'));
  const c = cands[rng.int(cands.length)];
  return { r: landingRow(b, c), c };
}

// Nova Streak (Fun Wave C, DESIGN.md v0.5.6): each streak charge puts one tier-1 Wild Orb on the start board.
// In-board power only, never extra drops. Cap STREAK_MAX (the top tier is deliberately small).
export const STREAK_MAX = 3;

/**
 * Nova Streak head start: where `charges` (0..STREAK_MAX) Wild Orbs go on the start board. Own seeded stream
 * ("streak"), so the spawn / tide / shuffle streams and the level itself are untouched. Each pick is a distinct
 * column (never one in `avoid`, e.g. the Steady Start column) whose landing row is >= 2; the orb sits on top
 * of that column. Fewer orbs when the board has no room. Never for the Daily Nebula -> [].
 */
export function streakPlacements(level, charges, board = null, avoid = []) {
  if (!level || level.daily) return [];
  const k = Math.max(0, Math.min(STREAK_MAX, Math.floor(Number(charges) || 0)));
  if (!k) return [];
  const b = board || buildBoard(level);
  const used = new Set(avoid);
  const rng = mulberry32(deriveSeed(level.seed, 'streak'));
  const out = [];
  for (let i = 0; i < k; i++) {
    const cands = [];
    for (let c = 0; c < b.cols; c++) if (!used.has(c) && landingRow(b, c) >= 2) cands.push(c);
    if (!cands.length) break;
    const c = cands[rng.int(cands.length)];
    used.add(c);
    out.push({ r: landingRow(b, c), c });
  }
  return out;
}

/**
 * Tonight's bake (DESIGN.md "Tonight's bake", docs/UX_TONIGHTS_BAKE.md): where the one warm piece of tier `tier` goes
 * on the start board of the first Journey level after a bake is ready. Own seeded stream ("bake", from the level seed
 * only: never ads, spend or past fails), so the spawn / tide / shuffle streams and the level itself are untouched.
 * A column qualifies when it is not in `avoid` (the Steady Start and Nova Streak columns), its landing row is >= 2, and
 * the piece would not touch a plain piece of the same tier there (the start board stays still: nothing merges on its
 * own). Columns holding a goal piece (a stone, teapot or tin) are left alone; only when every qualifying column holds
 * one is any qualifying column used. The piece sits on top of the chosen column. Never for the Daily Nebula -> null.
 */
export function bakePlacement(level, tier, board = null, avoid = []) {
  if (!level || level.daily) return null;
  const t = Math.floor(Number(tier) || 0);
  if (t < 1 || t >= MAX_TIER) return null;
  const b = board || buildBoard(level);
  const used = new Set(avoid);
  const clear = [], any = [];
  for (let c = 0; c < b.cols; c++) {
    if (used.has(c)) continue;
    const r = landingRow(b, c);
    if (r < 2) continue;
    let still = true;
    for (const [dr, dc] of [[1, 0], [0, -1], [0, 1]]) {
      const x = getCell(b, r + dr, c + dc);
      if (x && x.kind === 'orb' && !x.wild && !x.glazed && x.tier === t) still = false;
    }
    if (!still) continue;
    any.push(c);
    let goal = false;
    for (let cc = c - 1; cc <= c + 1; cc++) {
      for (let rr = 0; rr < b.rows; rr++) { const x = getCell(b, rr, cc); if (x && (x.kind === 'teapot' || x.kind === 'tin')) goal = true; }
    }
    if (!goal) clear.push(c);
  }
  const cands = clear.length ? clear : any;
  if (!cands.length) return null;
  const rng = mulberry32(deriveSeed(level.seed, 'bake'));
  const c = cands[rng.int(cands.length)];
  return { r: landingRow(b, c), c };
}

/**
 * Start board. opts.steady places the Steady Start Wild Orb; opts.streak (0..3) adds the Nova Streak Wild Orbs
 * in other columns; opts.bake (a tier, 0 = none) adds Tonight's bake piece in yet another column. All are ignored for
 * the Daily Nebula.
 */
export function buildBoard(level, opts = {}) {
  const b = level.prefill ? boardFromRows(level.prefill) : createBoard({ cols: COLS, rows: ROWS });
  const avoid = [];
  if (opts && opts.steady) {
    const p = steadyPlacement(level, b);
    if (p) { setCell(b, p.r, p.c, makeOrb(b, 1, { wild: true })); avoid.push(p.c); }
  }
  if (opts && opts.streak) {
    for (const p of streakPlacements(level, opts.streak, b, avoid)) { setCell(b, p.r, p.c, makeOrb(b, 1, { wild: true })); avoid.push(p.c); }
  }
  if (opts && opts.bake) {
    const p = bakePlacement(level, opts.bake, b, avoid);
    if (p) setCell(b, p.r, p.c, makeOrb(b, Math.floor(opts.bake)));
  }
  return b;
}

/**
 * Tonight's bake: does the warm piece of this tier find room on the start board built with these Steady Start /
 * Nova Streak options? Checked before the bake is used, so a board without room never eats it.
 */
export function bakeFits(level, opts = {}, tier = 0) {
  if (!level || level.daily || !(tier > 0)) return false;
  const steady = !!(opts && opts.steady), streak = (opts && opts.streak) || 0;
  return buildBoard(level, { steady, streak, bake: tier }).nextId > buildBoard(level, { steady, streak }).nextId;
}

// ---------------------------------------------------------------- greedy bot

export function evalBoard(b) {
  let maxH = 0, sumH = 0, stairs = 0;
  for (let c = 0; c < b.cols; c++) {
    const h = columnHeight(b, c);
    maxH = Math.max(maxH, h); sumH += h;
  }
  for (let r = 0; r < b.rows; r++) {
    for (let c = 0; c < b.cols; c++) {
      const x = getCell(b, r, c);
      if (!x || x.kind !== 'orb') continue;
      const rt = getCell(b, r, c + 1), dn = getCell(b, r + 1, c);
      for (const y of [rt, dn]) if (y && y.kind === 'orb' && Math.abs(y.tier - x.tier) === 1) stairs++;
    }
  }
  return -maxH * maxH * 1.6 - sumH * 0.6 + stairs * 1.5;
}

/**
 * The bot's goal score: 1000 per goal times the fraction done. Teapot goals (with the board b) also get partial
 * credit for each teapot still on the board, more the lower it sits (0.5 / (rows - r)), so the bot clears the
 * pieces under a teapot. Without a teapot goal the board is never read.
 */
export function goalValue(level, prog, b = null) {
  let v = 0;
  level.goals.forEach((g, i) => {
    if (g.type === 'teapot' && b) {
      let part = 0;
      for (let r = 0; r < b.rows; r++) {
        for (let c = 0; c < b.cols; c++) {
          const x = getCell(b, r, c);
          if (x && x.kind === 'teapot') part += 0.5 / (b.rows - r);
        }
      }
      v += Math.min(1, (Math.min(prog[i], g.count) + part) / g.count) * 1000;
    } else v += (Math.min(prog[i], g.count) / g.count) * 1000;
  });
  return v;
}

/**
 * Play a level the way game.js runs it (startLevel + afterJourneyAction, no boosters):
 * a two-orb queue (current + next, the next one spawned right after each drop), goal progress,
 * then the rising tide when goals are not met yet, including the cascade the tide row can set off
 * (its points and goal progress count, and it can finish the level), then the full-board check.
 * pol null = the greedy bot (always the best column). pol { eps, top2, rng } = a seeded "casual" stand-in:
 * with chance eps a random legal column, else with chance top2 the second-best column, else the best.
 * Second cup (DESIGN.md): a drop whose own cascade has SECOND_CUP.chain+ merge steps grants +1 drop (at most
 * SECOND_CUP.max per level), so the loop runs up to maxDrops + cups; opts.secondCup overrides the default
 * (on for Journey levels, off for the Daily Nebula, see secondCupOn); opts.bake (a tier) starts from the board with
 * Tonight's bake piece on it (bakePlacement), for sizing the bake with the casual stand-ins.
 * Returns { won, dropsUsed, score, cups, need }: dropsUsed = drops actually played, cups = Second cup drops granted,
 * need = the smallest drop limit that reaches the same end (dropsUsed minus the cups granted before the last drop),
 * so one long game still gives the result for every shorter limit.
 */
export function playLevel(level, maxDrops = level.drops, pol = null, opts = null) {
  const cupOn = secondCupOn(level, opts);
  let cups = 0, need = 0;
  const b = buildBoard(level, opts && opts.bake ? { bake: opts.bake } : {});
  const rng = levelRngs(level);
  const prog = newProgress(level);
  let score = 0;
  let cur = spawnOrb(b, rng.spawn, {});
  let next = spawnOrb(b, rng.spawn, {});
  let tideLeft = level.tide || Infinity;
  const legal = [];
  for (let d = 1; d <= maxDrops + cups; d++) {
    let bestCol = -1, bestVal = -Infinity, secondCol = -1, secondVal = -Infinity;
    const baseGoal = goalValue(level, prog, b);
    const oo = orderOpts(level, prog); // undefined unless the level has open order tickets
    const left = { won: false, dropsUsed: d - 1, score, cups, need: d - 1 - cups };
    need = d - cups; // the drop limit that allows drop d
    legal.length = 0;
    for (let c = 0; c < b.cols; c++) {
      if (landingRow(b, c) < 0) continue;
      legal.push(c);
      const tb = cloneBoard(b);
      const res = dropOrb(tb, c, cur, oo);
      const tp = applyProgress(level, prog.slice(), res, score + res.points);
      const val = (goalValue(level, tp, tb) - baseGoal) * 3 + res.points * 0.25 + res.maxTier * 4 + evalBoard(tb);
      if (val > bestVal) { secondCol = bestCol; secondVal = bestVal; bestVal = val; bestCol = c; }
      else if (val > secondVal) { secondVal = val; secondCol = c; }
    }
    if (bestCol < 0) return left;
    let col = bestCol;
    if (pol) {
      const x = pol.rng();
      if (x < pol.eps) col = legal[Math.floor(pol.rng() * legal.length)];
      else if (x < pol.eps + pol.top2 && secondCol >= 0) col = secondCol;
    }
    const res = dropOrb(b, col, cur, oo);
    score += res.points;
    applyProgress(level, prog, res, score);
    if (cupOn) cups += secondCupGain(res.steps.length, cups);
    cur = next;
    next = spawnOrb(b, rng.spawn, {});
    if (goalsMet(level, prog)) return { won: true, dropsUsed: d, score, cups, need };
    if (--tideLeft <= 0) {
      const t = pushRow(b, rng.tide, { sector: 1 + Math.floor(level.n / 10), maxSpawn: 3 });
      if (t.overflow) return { won: false, dropsUsed: d, score, cups, need };
      tideLeft = level.tide;
      const rr = resolve(b, [], orderOpts(level, prog));
      if (rr.steps.length) { score += rr.points; applyProgress(level, prog, rr, score); }
      if (goalsMet(level, prog)) return { won: true, dropsUsed: d, score, cups, need };
    }
    if (isBoardFull(b)) return { won: false, dropsUsed: d, score, cups, need };
  }
  return { won: false, dropsUsed: maxDrops + cups, score, cups, need: maxDrops };
}

/**
 * Play a level greedily (playLevel without noise). Returns { won, dropsUsed, score, cups, need }.
 * maxDrops overrides the level's drop limit (used to measure how many drops a level needs).
 */
export function botPlay(level, maxDrops = level.drops, opts = null) {
  return playLevel(level, maxDrops, null, opts);
}

// ---------------------------------------------------------------- generator (16+)
// Every level from 16 is a seeded candidate (genCandidate for 16-150, genCandidateV3 for 151+) that passed
// acceptCandidate():
//   1. the prefill starts stable and the greedy bot wins inside the level's need band [minNeed, maxNeed]
//      (session length: not trivial, not endless);
//   2. CASUAL.seeds seeded "casual" stand-in bots (15% random column, 25% second-best, the rest greedy) reach
//      the band's target first-try win rate casualPct(n) within the drop limit, and with the tightest limit
//      (greedy need + DROP_SPARE) the candidate is not far easier than that target; a fresh holdout set of
//      stand-ins must also come close to the target at the chosen limit (no level that only suits lucky seeds);
//   3. the drop limit is the smallest one (>= greedy need + DROP_SPARE, <= DROP_CAP) at which the stand-ins hit
//      the target.
// The target is a pure function of n (chapter + beat): never the save, fails, ads, purchases or the device.
// The checked-in plan (levelPlan.js, written by tools/level-sweep.mjs) names the accepted attempt and drop limit,
// so getLevel never searches. Adding a goal type or a blocker only touches the candidate generators (plus
// applyProgress / goalText); acceptance just plays levels, so it needs no change.

// Levels 101-150 (the Outer Reaches): a second, gentle ramp u = 0..1 over 101-150 nudges goal sizes, two-goal odds
// and the drops the bot must need. u is 0 up to level 100 and for the Daily Nebula.
export const REACH_FROM = 100, REACH_SPAN = 50;
export function reachRamp(n) { return n > REACH_FROM ? Math.min(1, (n - REACH_FROM) / REACH_SPAN) : 0; }
// Session length: a normal (non-Hard) level after 100 never asks the greedy bot for more than 47 drops.
export const REACH_NORMAL_MAX_NEED = 47;

// prefill: a couple of rows, with asteroids if needed. Shared by genCandidate (16-150 + Daily) and genCandidateV3.
function genPrefill(rng, asteroidGoal) {
  const prefillRows = rng() < 0.6 ? 1 + Math.floor(rng() * 2 + (asteroidGoal > 5 ? 1 : 0)) : 0;
  if (prefillRows || asteroidGoal) {
    const rows = [];
    let asteroidsPlaced = 0;
    const needA = asteroidGoal ? asteroidGoal + 1 : rng() < 0.4 ? 1 + Math.floor(rng() * 2) : 0;
    const totalRows = Math.max(prefillRows, Math.ceil(needA / 3), 1);
    for (let r = 0; r < totalRows; r++) {
      const row = [];
      for (let c = 0; c < COLS; c++) {
        const wantA = asteroidsPlaced < needA && rng() < (needA - asteroidsPlaced) / ((totalRows - r) * COLS - c);
        if (wantA) { row.push('A'); asteroidsPlaced++; continue; }
        // avoid immediate matches with left / below neighbours
        let tier;
        for (let k = 0; k < 8; k++) {
          tier = 1 + Math.floor(rng() * 3);
          const left = row[c - 1];
          if (left !== tier) break;
        }
        row.push(tier);
      }
      rows.push(row);
    }
    // vertical match fix: nudge equal tiers stacked on each other
    for (let r = 0; r < rows.length - 1; r++) {
      for (let c = 0; c < COLS; c++) {
        if (typeof rows[r][c] === 'number' && rows[r][c] === rows[r + 1][c]) {
          let t2 = (rows[r][c] % 3) + 1;
          if (t2 === rows[r][c - 1] || t2 === rows[r][c + 1]) t2 = (t2 % 3) + 1;
          rows[r][c] = t2;
        }
      }
    }
    return rows;
  }
  return null;
}

/** The top tier a Journey tier goal may ask for: a Star (tier 8) only on a chapter finale (position 20). */
export const STAR_TIER = 8;
function topGoalTier(n) { return n % CHAPTER_SIZE === 0 ? STAR_TIER : STAR_TIER - 1; }
/** A Star goal never comes with the rising tide (the audit's worst levels were exactly that pairing). */
function starTideRule(goals, tide) { return goals.some((g) => g.type === 'tier' && g.tier >= STAR_TIER) ? null : tide; }

function genCandidate(n, attempt, tag = null) {
  // `tag` (Daily Nebula) re-seeds the same generator.
  const rng = mulberry32(hashString(tag ? `nova-daily:${tag}:${attempt}` : `nova-level:${n}:${attempt}`));
  const kind = levelKind(n);
  const t = Math.min(1, (n - 15) / 45); // 0..1 progression
  const u = tag ? 0 : reachRamp(n); // 0..1 over levels 101-150, 0 before
  const hard = kind !== 'normal';
  const top = tag ? STAR_TIER : topGoalTier(n);
  const goals = [];
  const pool = ['tier', 'tier', 'asteroids', 'score', 'combo'];
  const nGoals = kind === 'superhard' ? 2 + (rng() < 0.4 ? 1 : 0) : kind === 'hard' ? 2 : rng() < 0.45 + t * 0.2 + u * 0.1 ? 2 : 1;
  const used = new Set();
  let asteroidGoal = 0;
  while (goals.length < nGoals && goals.length < 3) {
    const type = pool[Math.floor(rng() * pool.length)];
    if (used.has(type)) continue;
    used.add(type);
    if (type === 'tier') {
      const tier = Math.min(top, 5 + Math.floor(t * 2.5 + rng() * 1.6 + (hard ? 0.6 : 0)));
      const count = tier >= 7 ? 1 : 1 + (rng() < 0.4 + t * 0.3 ? 1 : 0) + (hard && tier <= 5 ? 1 : 0);
      goals.push({ type, tier, count });
    } else if (type === 'asteroids') {
      asteroidGoal = 3 + Math.floor(rng() * 3 + t * 4 + (hard ? 2 : 0));
      goals.push({ type, count: asteroidGoal });
    } else if (type === 'score') {
      const base = 1200 + t * 5000 + rng() * 1200 + u * 1500;
      goals.push({ type, count: Math.round(base * (hard ? 1.4 : 1) / 100) * 100 });
    } else if (type === 'combo') {
      goals.push({ type, count: 3 + (rng() < 0.25 + t * 0.4 + u * 0.15 ? 1 : 0) });
    }
  }
  const prefill = genPrefill(rng, asteroidGoal);
  const tide = n >= 21 && rng() < 0.25 + t * 0.35 + u * 0.1 ? Math.max(7, 10 - Math.floor(t * 3)) : null;
  return { goals, prefill, tide: starTideRule(goals, tide), seed: hashString(tag ? `nova-daily-seed:${tag}:${attempt}` : `nova-seed:${n}:${attempt}`) };
}

const DAILY_SLACK = 1.45;
const cacheLv = new Map();

function finalise(n, raw) {
  return {
    n,
    kind: levelKind(n),
    goals: raw.goals,
    prefill: padPrefill(raw.prefill),
    tide: raw.tide || null,
    seed: raw.seed >>> 0,
    tip: raw.tip || null,
    drops: raw.drops || 0,
  };
}

/** Get level n (1-based). Deterministic and cached. 1-15 are hand-made; 16+ come from the checked-in plan. */
export function getLevel(n) {
  n = Math.max(1, Math.floor(n));
  if (cacheLv.has(n)) return cacheLv.get(n);
  let level;
  if (n <= HAND.length) {
    level = finalise(n, { ...HAND[n - 1], seed: hashString(`nova-seed:${n}`) });
  } else {
    // the plan names the accepted attempt and its drop limit, so no bot search runs here. A level missing from
    // the plan (or past it) falls back to the same search the sweep ran.
    const e = planEntry(n);
    level = e ? buildPlanned(n, e) : searchLevel(n).level;
  }
  cacheLv.set(n, level);
  return level;
}

// ---------------------------------------------------------------- v3 levels 151-1000 (DESIGN.md "v3 PIVOT")
// Honest sawtooth by position p (1..20) in the 20-level chapter, the same on every attempt and for every
// player. getLevel(n) is a pure function of n: it never reads the save, fails, ads or purchases.
//   p 1-3 breather (single goal)   p 4-9, 11-14, 16-18 normal   p 10, 15 Hard   p 19 easy-ish   p 20 Super Hard finale
// Each beat: its kind (rewards / map frame), its casual target offset (percentage points from the chapter's normal
// target, see casualPct), goal strength x, and the greedy-need band [min, max] at full pressure (scaled by g(c)).
export const BEATS = Object.freeze({
  breather: Object.freeze({ kind: 'normal', casual: 12, x: 0.72, need: [12, 26] }),
  normal: Object.freeze({ kind: 'normal', casual: 0, x: 0.92, need: [24, 42] }),
  hard: Object.freeze({ kind: 'hard', casual: -12, x: 1.0, need: [36, 52] }),
  easy: Object.freeze({ kind: 'normal', casual: 6, x: 0.84, need: [18, 32] }),
  finale: Object.freeze({ kind: 'superhard', casual: -16, x: 1.06, need: [42, 60] }),
});
/** Casual target offsets of the 1-150 sawtooth beats (every 5th Hard, every 10th Super Hard). */
export const LEGACY_CASUAL = Object.freeze({ normal: 0, hard: -12, superhard: -16 });
export const V3_FOCUS_BIAS = 0.6; // chance the first goal is the chapter's focus goal

/** 1-based position of level n in its chapter (1..CHAPTER_SIZE). */
export function levelPos(n) { return ((Math.max(1, Math.floor(n)) - 1) % CHAPTER_SIZE) + 1; }

/** The beat of level n: 'breather' | 'normal' | 'hard' | 'easy' | 'finale' (151+), else its legacy kind. */
export function levelBeat(n) {
  n = Math.max(1, Math.floor(n));
  if (n <= LEGACY_LEVEL_COUNT) {
    if (n % 10 === 0) return 'superhard';
    if (n % 5 === 0 && n >= FIRST_HARD_LEVEL) return 'hard';
    return 'normal';
  }
  const p = levelPos(n);
  if (p <= 3) return 'breather';
  if (p === 10 || p === 15) return 'hard';
  if (p === 19) return 'easy';
  if (p === 20) return 'finale';
  return 'normal';
}

/**
 * Global pressure g(c) = 0.75 + 0.25 * (1 - e^(-(c - 8) / 14)), in thousandths (an integer, so the C# port
 * reads the same table: no last-bit exp() differences). Chapter 8 (levels 141-160) = 750, chapter 50 = 988.
 */
export function pressureMilli(c) {
  const k = Math.max(8, Math.floor(c));
  return Math.round(1000 * (0.75 + 0.25 * (1 - Math.exp(-(k - 8) / 14))));
}

/** Greedy-need band for level n (151+): { beat, g, minNeed, maxNeed }. */
export function needBandV3(n) {
  const beat = levelBeat(n);
  const B = BEATS[beat];
  const g = pressureMilli(chapterOf(n)) / 1000;
  return { beat, g, minNeed: Math.round(B.need[0] * g), maxNeed: Math.round(B.need[1] * g) };
}

// ---- casual first-try targets (DESIGN.md "Journey difficulty curve")
/** Target casual first-try win % of a normal level in chapter 1, 2, 3 and 4+ (the last one holds). */
export const CASUAL_BASE = Object.freeze([90, 80, 71, 64]);
export const CASUAL_FLOOR = 40, CASUAL_CEIL = 95;

/** The casual stand-ins' target first-try win % for level n (16+): the chapter base plus the beat offset. */
export function casualPct(n) {
  n = Math.max(1, Math.floor(n));
  const c = Math.max(1, chapterOf(n));
  const base = CASUAL_BASE[Math.min(CASUAL_BASE.length, c) - 1];
  const beat = levelBeat(n);
  const off = n <= LEGACY_LEVEL_COUNT ? LEGACY_CASUAL[beat] : c >= CURVE_CHAPTER ? CURVE_CASUAL[beat] : BEATS[beat].casual;
  return Math.max(CASUAL_FLOOR, Math.min(CASUAL_CEIL, base + off));
}

// ---- wind-down curve (DESIGN.md "Journey difficulty curve", chapter 9+ = levels 161+ since the pacing pass; 1-160 are unchanged)
// The 2026-10-23 audit found late finales at 42-45% casual first-try, Hard levels up to 72% and normal levels as low
// as 51%. From CURVE_CHAPTER every beat takes CURVE_CASUAL instead of BEATS[beat].casual, the 100-seed holdout must
// reach the target itself (CURVE_HOLDOUT, no slack), and a Hard or finale level must not be far easier than its target
// either (CURVE_HOLDOUT_CEIL), so the special levels sit in one band instead of swinging from 42% to 72%.
export const CURVE_CHAPTER = 9;
export const CURVE_CASUAL = Object.freeze({ breather: 12, normal: 2, hard: -9, easy: 6, finale: -11 });
/** The holdout from CURVE_CHAPTER: 100 fresh stand-ins (seeds 60-159) that must reach the target itself. */
export const CURVE_HOLDOUT = Object.freeze({ holdout: 100, holdoutSlack: 0 });
/** Hard / finale levels from CURVE_CHAPTER: the holdout played with Second cup on (as the game plays) may beat the
 * target by at most this many points (Hard 55% -> 62%, finale 53% -> 63%). */
export const CURVE_HOLDOUT_CEIL = Object.freeze({ hard: 7, finale: 10 });
/** Pacing pass (DESIGN.md "Pacing pass"): from CURVE_CHAPTER a second fresh look (stand-ins 160-259, played as the game
 * plays, Second cup on) must land within `below` points under the target and, on a normal level, at most `above` over
 * it. One holdout alone let a candidate that suited its 100 seeds through (a Hard level at 41% in play, a normal at 88%). */
export const CURVE_SECOND = Object.freeze({ first: 160, seeds: 100, below: 6, above: 18 });

/** The acceptance band of level n (16+): { beat, minNeed, maxNeed, pct }. */
export function levelBand(n) {
  n = Math.max(1, Math.floor(n));
  const beat = levelBeat(n);
  let minNeed, maxNeed;
  if (n <= LEGACY_LEVEL_COUNT) {
    const t = Math.min(1, (n - 15) / 45);
    const kind = levelKind(n);
    const u = reachRamp(n);
    minNeed = Math.round(9 + t * 10 + (kind === 'hard' ? 6 : kind === 'superhard' ? 12 : 0) + u * 3);
    maxNeed = Math.round(30 + t * 18 + (kind === 'hard' ? 8 : kind === 'superhard' ? 14 : 0) + u * 6);
    if (u > 0 && kind === 'normal') maxNeed = Math.min(maxNeed, REACH_NORMAL_MAX_NEED);
  } else {
    ({ minNeed, maxNeed } = needBandV3(n));
  }
  return { beat, minNeed, maxNeed, pct: casualPct(n) };
}

/** Café Orders goals appear from this chapter (levels 161+), sugar-glazed pieces from GLAZE_CHAPTER (201+),
 * teapot deliveries from TEAPOT_CHAPTER (241+). */
export const ORDERS_CHAPTER = 9, GLAZE_CHAPTER = 11, TEAPOT_CHAPTER = 13;
/** A level never has more than this many goals (an order pick's tickets count one each). */
export const MAX_GOALS = 3;

/** A teapot level never has the rising tide (and a Star goal never does either, starTideRule). */
function v3TideRule(goals, tide) { return goals.some((g) => g.type === 'teapot') ? null : starTideRule(goals, tide); }

/** One plain prefill row (tiers 1-3) with no match to its left or to the row below it (`below`, or null). */
function plainRow(rng, below) {
  const row = [];
  for (let cc = 0; cc < COLS; cc++) {
    let tier;
    for (let k = 0; k < 8; k++) { tier = 1 + Math.floor(rng() * 3); if (row[cc - 1] !== tier && (!below || below[cc] !== tier)) break; }
    row.push(tier);
  }
  return row;
}

// ---- Chapter rhythm (DESIGN.md "Chapter rhythm", chapter 14+ = levels 261+; 1-260 are generated as before)
// Every chapter from RHYTHM_CHAPTER gets a fixed shape, a pure function of the chapter number:
//   lead goals  each non-twist level's first goal comes from the chapter's lead cycle: the six goal types in a seeded
//               order (seed `nova-rhythm:${c}`, Fisher-Yates) with the chapter's focus goal moved to the front, cycled
//               by position ((p - 1) % 6), so the same first goal never runs more than twice in a row;
//   twists      positions TWIST_POS (7 and 13) show one fair pair from DUOS, alone (the pair's goals first; glaze and
//               the tide only when the pair names them);
//   finale      p 20: even chapters a Star finale (a Star goal plus one more goal, never the tide), odd chapters a third
//               pair from DUOS with 2-3 goals (DUOS[(c - 13) % 8], an even slot: never the stones + teapot pair).
// The casual acceptance is unchanged, so every beat keeps its target; only which goals and mechanics appear changes.
export const RHYTHM_CHAPTER = 14;
/** Lead-only rhythm from this chapter (levels 161-260, DESIGN.md "Pacing pass"): the lead cycle without twists or
 * forced finales, so chapters 9-13 no longer run 5-11 levels on one goal type. */
export const LEAD_CHAPTER = 9;
export const RHYTHM_LEADS = Object.freeze(['tier', 'score', 'combo', 'order', 'asteroids', 'teapot']);
export const TWIST_POS = Object.freeze([7, 13]);
/** Fair pairs: goal types ('asteroids' = stones to break) and board mechanics ('glaze', 'tide'). Never teapot + tide. */
export const DUOS = Object.freeze([
  Object.freeze(['order', 'glaze']), Object.freeze(['teapot', 'asteroids']), Object.freeze(['combo', 'tide']),
  Object.freeze(['teapot', 'glaze']), Object.freeze(['order', 'combo']), Object.freeze(['asteroids', 'order']),
  Object.freeze(['teapot', 'order']), Object.freeze(['teapot', 'combo']),
]);
const DUO_MECH = new Set(['glaze', 'tide']);
/** The most stones a pair level asks the player to break. */
export const PAIR_MAX_STONES = 5;

/** The lead-goal cycle of chapter c (RHYTHM_CHAPTER+): RHYTHM_LEADS shuffled by its own seed, focus goal first. */
export function rhythmLeads(c) {
  const rng = mulberry32(hashString(`nova-rhythm:${c}`));
  // before TEAPOT_CHAPTER (lead-only chapters 9-12) the cycle has the five goal types met so far
  const a = c >= TEAPOT_CHAPTER ? RHYTHM_LEADS.slice() : RHYTHM_LEADS.filter((t) => t !== 'teapot');
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  // a chapter that introduces a goal (orders in chapter 9, teapots in 13) leads with it, otherwise the focus goal
  const info = chapterInfo(c);
  const front = c === ORDERS_CHAPTER ? 'order' : c === TEAPOT_CHAPTER ? 'teapot' : info ? info.theme.focusGoal : null;
  const f = front ? a.indexOf(front) : -1;
  if (f > 0) { const t = a[0]; a[0] = a[f]; a[f] = t; }
  // the breathers (p 1-3) never lead with teapots (except the teapot intro): a teapot in slot 1 or 2 trades places with
  // the last slot
  const tp = a.indexOf('teapot');
  if (tp === 1 || tp === 2) { const t = a[a.length - 1]; a[a.length - 1] = a[tp]; a[tp] = t; }
  return a;
}

/**
 * The rhythm slot of level n, or null before LEAD_CHAPTER (chapters 9-13: lead-only slots):
 * { role: 'lead' | 'twist' | 'star' | 'duo', goals: forced goal types in order, glaze, tide, star, pair }.
 * pair: a twist or pair finale (its glaze / tide are exactly the pair's). star: the first goal is a Star (tier 8).
 */
export function chapterRhythm(n) {
  n = Math.max(1, Math.floor(n));
  const c = chapterOf(n);
  if (c < LEAD_CHAPTER) return null;
  const p = levelPos(n), k = c - RHYTHM_CHAPTER;
  if (c < RHYTHM_CHAPTER) {
    // lead-only chapters (9-13): every level's first goal from the cycle; the intro chapters' breathers teach their goal
    const intro = p <= 3 ? (c === ORDERS_CHAPTER ? 'order' : c === TEAPOT_CHAPTER ? 'teapot' : null) : null;
    // a five-type cycle steps one extra slot every five levels, so the Hard levels (p 10, 15) and the finale differ
    const leads = rhythmLeads(c), skip = leads.length === 5 ? Math.floor((p - 1) / 5) : 0;
    return { role: 'lead', goals: [intro || leads[(p - 1 + skip) % leads.length]], glaze: false, tide: false, star: false, pair: false };
  }
  const duo = (d) => ({
    goals: d.filter((t) => !DUO_MECH.has(t)), glaze: d.includes('glaze'), tide: d.includes('tide'), star: false, pair: true,
  });
  if (p === CHAPTER_SIZE) {
    if (c % 2 === 0) return { role: 'star', goals: ['tier'], glaze: false, tide: false, star: true, pair: false };
    return { role: 'duo', ...duo(DUOS[(k + 1) % DUOS.length]) };
  }
  const t = TWIST_POS.indexOf(p);
  if (t >= 0) return { role: 'twist', ...duo(DUOS[(k + 4 * t) % DUOS.length]) };
  const leads = rhythmLeads(c);
  return { role: 'lead', goals: [leads[(p - 1) % leads.length]], glaze: false, tide: false, star: false, pair: false };
}

// ---- Cookie tins (DESIGN.md "Cookie tins", chapter 15+ = levels 281+; never in Endless or the Daily Nebula)
/** Cookie tins appear from this chapter (levels 281+); no other mechanic is introduced there. */
export const TIN_CHAPTER = 15;
/** Lead positions in each chapter from TIN_CHAPTER that carry 1-2 tins (all normal beats). */
export const TIN_POS = Object.freeze([5, 12, 17]);

/**
 * The cookie-tin slot of level n: 0 none, 1 = the intro (TIN_CHAPTER's first three levels: exactly one tin, no
 * glaze), 2 = 1-2 tins. From TIN_CHAPTER: the lead levels at TIN_POS, and the second twist (p 13) when its pair
 * has no glaze, tide, stones or teapot (order + combo), so a twist shows one special piece at most. A pure function of n.
 */
export function tinSlot(n) {
  n = Math.max(1, Math.floor(n));
  const c = chapterOf(n);
  if (c < TIN_CHAPTER) return 0;
  const p = levelPos(n);
  if (c === TIN_CHAPTER && p <= 3) return 1;
  if (TIN_POS.includes(p)) return 2;
  if (p === TWIST_POS[1]) {
    const rh = chapterRhythm(n);
    if (rh && rh.pair && !rh.glaze && !rh.tide && !rh.goals.includes('asteroids') && !rh.goals.includes('teapot')) return 2;
  }
  return 0;
}

/** Puts the tins of a tinSlot into a candidate prefill (genCandidateV3). rng is the tin seed only. */
function placeTins(prefill, slot, x, rng) {
  if (slot === 1 && prefill) prefill = prefill.map((row) => row.map((t) => (typeof t === 'string' && t[0] === 'Z' ? Number(t.slice(1)) : t)));
  if (!prefill) prefill = [plainRow(rng, null)];
  const want = slot === 1 ? 1 : 1 + (rng() < 0.35 + 0.3 * x ? 1 : 0);
  const pot = (cc) => prefill.some((row) => row[cc] === 'T');
  const tops = [];
  for (let cc = 0; cc < COLS; cc++) {
    if (pot(cc)) continue;
    let r = 0;
    while (r < prefill.length && prefill[r][cc] === E) r++;
    if (r < prefill.length && typeof prefill[r][cc] === 'number' && prefill[r][cc] > 0) tops.push([r, cc]);
  }
  let src = tops;
  if (!src.length) {
    src = [];
    prefill.forEach((row, r) => row.forEach((t, cc) => { if (!pot(cc) && typeof t === 'number' && t > 0) src.push([r, cc]); }));
  }
  for (let i = 0; i < want && src.length; i++) {
    const [r, cc] = src.splice(Math.floor(rng() * src.length), 1)[0];
    prefill[r][cc] = 'K';
  }
  return prefill;
}

/** One seeded candidate for level n (151+). Same generator pieces as 16-150, plus Café Orders (ch 9+), glaze (ch 11+)
 * and teapot deliveries (ch 13+), and the chapter rhythm (ch 14+, chapterRhythm). */
export function genCandidateV3(n, attempt) {
  const rng = mulberry32(hashString(`nova-level3:${n}:${attempt}`));
  const c = chapterOf(n);
  const beat = levelBeat(n);
  const B = BEATS[beat];
  const x = (pressureMilli(c) / 1000) * B.x; // goal strength, about 0.54 (early breather) .. 1.05 (late finale)
  const hard = B.kind !== 'normal';
  const top = topGoalTier(n);
  const info = chapterInfo(c);
  const focus = info ? info.theme.focusGoal : null;
  let nGoals;
  if (beat === 'breather') nGoals = 1;
  else if (beat === 'finale') nGoals = 2 + (rng() < 0.15 + 0.3 * x ? 1 : 0);
  else if (beat === 'hard') nGoals = 2;
  else if (beat === 'easy') nGoals = rng() < 0.3 ? 2 : 1;
  else nGoals = rng() < 0.1 + 0.4 * x ? 2 : 1;
  // chapter rhythm (ch 14+): the forced goals always fit; a Star finale has exactly two goals
  const rh = chapterRhythm(n);
  if (rh) nGoals = rh.star ? 2 : Math.max(nGoals, rh.goals.length);
  // Café Orders join the goal pool from ORDERS_CHAPTER (chapter 9); its first three levels (breathers) teach them alone.
  // Teapot deliveries join it from TEAPOT_CHAPTER (chapter 13), whose first three levels teach them alone.
  const pool = c >= TEAPOT_CHAPTER ? ['tier', 'tier', 'asteroids', 'score', 'combo', 'order', 'order', 'teapot', 'teapot']
    : c >= ORDERS_CHAPTER ? ['tier', 'tier', 'asteroids', 'score', 'combo', 'order', 'order'] : ['tier', 'tier', 'asteroids', 'score', 'combo'];
  const orderIntro = c === ORDERS_CHAPTER && levelPos(n) <= 3;
  const teapotIntro = c === TEAPOT_CHAPTER && levelPos(n) <= 3;
  const goals = [];
  const used = new Set();
  let asteroidGoal = 0;
  let picks = 0; // goal picks (one order pick can add up to 3 tickets, each its own goal)
  for (let guard = 0; picks < nGoals && guard < 64; guard++) {
    const type = rh ? (picks < rh.goals.length ? rh.goals[picks] : pool[Math.floor(rng() * pool.length)])
      : orderIntro && !goals.length ? 'order' : teapotIntro && !goals.length ? 'teapot'
      : !goals.length && focus && rng() < V3_FOCUS_BIAS ? focus : pool[Math.floor(rng() * pool.length)];
    // a pair with the tide never draws a teapot as its extra goal (a teapot level has no tide)
    if (used.has(type) || (rh && rh.tide && type === 'teapot')) continue;
    used.add(type);
    picks++;
    if (type === 'order') {
      // 1-3 tickets for distinct pieces (tiers 4-6), at most 3 goals in all and room left for the other picks
      // a breather (one goal) keeps a single ticket; otherwise leave room for the other picks
      const room = beat === 'breather' ? 1 : Math.max(1, MAX_GOALS - goals.length - (nGoals - picks));
      const k = Math.min(room, 1 + Math.floor(rng() * (1 + x * 1.6 + (hard ? 0.4 : 0))));
      const tiers = [4, 5, 6];
      for (let i = 0; i < k; i++) {
        const tier = tiers.splice(Math.floor(rng() * tiers.length), 1)[0];
        const count = tier >= 6 ? 1 : 1 + (rng() < 0.2 + 0.4 * x ? 1 : 0);
        goals.push({ type, tier, count });
      }
    } else if (type === 'tier') {
      // a Star finale's first goal is one Star (no rng draw); a pair with the tide never asks for a Star
      const tier = rh && rh.star && picks === 1 ? STAR_TIER : Math.min(rh && rh.tide ? STAR_TIER - 1 : top, 5 + Math.floor(rng() * 1.6 + x * 1.7 + (hard ? 0.3 : 0)));
      const count = tier >= 7 ? 1 : 1 + (rng() < 0.25 + 0.35 * x ? 1 : 0) + (hard && tier <= 5 ? 1 : 0);
      goals.push({ type, tier, count });
    } else if (type === 'asteroids') {
      // a pair level (twist / pair finale) breaks at most PAIR_MAX_STONES stones, so the pair stays fair
      asteroidGoal = Math.min(rh && rh.pair ? PAIR_MAX_STONES : 11, 3 + Math.floor(rng() * 3 + x * 4.5 + (hard ? 1.5 : 0)));
      goals.push({ type, count: asteroidGoal });
    } else if (type === 'score') {
      // sized to what the bot actually scores in the level's drop band (about 400 in 30 drops, 1,400 in 45)
      const base = x * x * 1300 + rng() * 300;
      goals.push({ type, count: Math.max(200, Math.round(base * (hard ? 1.15 : 1) / 50) * 50) });
    } else if (type === 'combo') {
      goals.push({ type, count: 3 + (rng() < 0.15 + 0.45 * x ? 1 : 0) });
    } else if (type === 'teapot') {
      // 1-3 teapots (a breather delivers one)
      goals.push({ type, count: beat === 'breather' ? 1 : Math.min(3, 1 + Math.floor(rng() * (x * 1.8 + (hard ? 0.4 : 0)))) });
    }
  }
  let prefill = genPrefill(rng, asteroidGoal);
  let tide = beat !== 'breather' && rng() < 0.2 + 0.4 * x ? Math.max(7, 10 - Math.floor(x * 3)) : null;
  // a twist / pair finale has the tide exactly when its pair names it
  if (rh && rh.pair) tide = rh.tide ? Math.max(7, 10 - Math.floor(x * 3)) : null;
  // Sugar glaze from GLAZE_CHAPTER (chapter 11): 1-3 starting pieces are glazed ('Z3' = glazed tier 3); its first
  // three levels always show it. A level without a prefill gets one plain row to glaze. The teapot intro levels
  // (chapter 13's first three) are never glazed, so the new goal is met on its own (no rng draw there).
  // A twist / pair finale is glazed exactly when its pair names glaze (no rng draw).
  if (!teapotIntro && c >= GLAZE_CHAPTER
    && ((c === GLAZE_CHAPTER && levelPos(n) <= 3) || (rh && rh.pair ? rh.glaze : rng() < 0.3 + 0.25 * x))) {
    if (!prefill) {
      const row = [];
      for (let cc = 0; cc < COLS; cc++) {
        let tier;
        for (let k = 0; k < 8; k++) { tier = 1 + Math.floor(rng() * 3); if (row[cc - 1] !== tier) break; }
        row.push(tier);
      }
      prefill = [row];
    }
    const cells = [];
    prefill.forEach((row, r) => row.forEach((t, cc) => { if (typeof t === 'number' && t > 0) cells.push([r, cc]); }));
    const k = Math.min(cells.length, 1 + Math.floor(rng() * (1.5 + x * 1.5)));
    for (let i = 0; i < k; i++) {
      const [r, cc] = cells.splice(Math.floor(rng() * cells.length), 1)[0];
      prefill[r][cc] = 'Z' + prefill[r][cc];
    }
  }
  // Teapot deliveries from TEAPOT_CHAPTER: the teapots ('T') sit on top of the prefill, one per column (columns
  // without stones first), never on the bottom row. The prefill is at least `depth` rows deep (1-3; the
  // chapter's first three levels: 1), adding plain rows on top when it is shorter.
  const tp = goals.find((g) => g.type === 'teapot');
  if (tp) {
    const depth = teapotIntro ? 1 : Math.min(3, 1 + Math.floor(rng() * (1 + x * 1.2)));
    if (!prefill) prefill = [];
    while (prefill.length < depth) prefill.unshift(plainRow(rng, prefill.length ? prefill[0] : null));
    // intro levels: no stones either, so the piece under the teapot can always be merged away. Each stone becomes the
    // smallest tier 1-3 that matches none of its left, right and lower neighbours (no rng draw).
    if (teapotIntro) {
      prefill.forEach((row, r) => row.forEach((t, cc) => {
        if (t !== 'A') return;
        const below = r + 1 < prefill.length ? prefill[r + 1][cc] : null;
        let k = 1;
        while (k < 3 && (row[cc - 1] === k || row[cc + 1] === k || below === k)) k++;
        row[cc] = k;
      }));
    }
    const free = [], rocky = [];
    for (let cc = 0; cc < COLS; cc++) (prefill.some((row) => row[cc] === 'A') ? rocky : free).push(cc);
    const top = [E, E, E, E, E];
    for (let i = 0; i < tp.count; i++) {
      const src = free.length ? free : rocky;
      top[src.splice(Math.floor(rng() * src.length), 1)[0]] = 'T';
    }
    prefill.unshift(top);
  }
  // Cookie tins from TIN_CHAPTER (tinSlot): closed tins ('K') replace the top plain piece of distinct columns (never
  // a stone, a glazed piece or a teapot's column; any plain piece when no column top is plain). They draw from their
  // own seed, so everything above is exactly the candidate it was before tins. The chapter's first three levels show
  // one tin and no glaze (each glazed piece turns plain again, no rng draw).
  const slot = tinSlot(n);
  if (slot) prefill = placeTins(prefill, slot, x, mulberry32(hashString(`nova-tin:${n}:${attempt}`)));
  return { goals, prefill, tide: v3TideRule(goals, tide), seed: hashString(`nova-seed3:${n}:${attempt}`) };
}

/** Candidate `attempt` for level n (16+) as a level with drops 0: genCandidate up to 150, genCandidateV3 after. */
export function candidateLevel(n, attempt) {
  return finalise(n, n <= LEGACY_LEVEL_COUNT ? genCandidate(n, attempt) : genCandidateV3(n, attempt));
}

// ---- acceptance (casual stand-ins)
/**
 * The casual stand-in mix and its fixed seeds: stand-ins 0..seeds-1 set the drop limit; stand-ins
 * seeds..seeds+holdout-1 (a fresh set) must then still reach the target minus holdoutSlack at that limit, so a
 * candidate that only suited the first set of seeds is rejected.
 */
export const CASUAL = Object.freeze({ eps: 0.15, top2: 0.25, seeds: 60, holdout: 40, holdoutSlack: 6 });
/** The holdout from RHYTHM_CHAPTER (levels 261+): 100 fresh stand-ins (seeds 60-159) within 3 points of the target. */
export const RHYTHM_HOLDOUT = Object.freeze({ holdout: 100, holdoutSlack: 3 });
/** Seeds: a candidate whose tightest drop limit already beats the target by more than this is too easy. */
export const CASUAL_EASY_MARGIN = 6;
/** Relaxation passes (percentage points off the target) when no candidate meets it (the sweep reports these). */
export const CASUAL_RELAX = Object.freeze([0, 8, 16, 24]);
/** The greedy bot always finishes with at least this many drops to spare; no level asks for more than DROP_CAP. */
export const DROP_SPARE = 3, DROP_CAP = 80;
/** Candidates the search tries per pass (attempt 0..PLAN_ATTEMPTS-1). */
export const PLAN_ATTEMPTS = 300;

/** Casual stand-in i for a level: the CASUAL mix with its own seeded stream (never the spawn / tide streams). */
export function casualPolicy(level, i) {
  return { eps: CASUAL.eps, top2: CASUAL.top2, rng: mulberry32(deriveSeed(level.seed, `casual:${i}`)) };
}

/**
 * The drop limit each casual stand-in needed to win (ascending; playLevel's need, so Second cup drops count), each
 * playing up to maxDrops (a stand-in never looks at the drops left, so one long game gives the result for every
 * shorter limit). null as soon as fewer than `need` stand-ins can still win. opts: playLevel's (secondCup).
 */
export function casualWinDrops(level, maxDrops, need = 0, first = 0, count = CASUAL.seeds, opts = null) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const r = playLevel(level, maxDrops, casualPolicy(level, first + i), opts);
    if (r.won) out.push(r.need);
    else if (count - (i + 1) + out.length < need) return null;
  }
  return out.sort((a, b) => a - b);
}

/** Casual stand-in first-try win rate of a level at its drop limit, in whole seeds (0..CASUAL.seeds). */
export function casualWins(level, opts = null) {
  const w = casualWinDrops(level, level.drops, 0, 0, CASUAL.seeds, opts);
  return w ? w.length : 0;
}

/**
 * The rules the checked-in plan was accepted under (acceptCandidate / searchLevel / the sweep). Second cup came after
 * the plan, so the plan's acceptance plays without it and every level 1-1000 stays byte-identical; the game, the
 * casual first-try measurement (casualWins with no opts) and the bot's default play include it. Re-tuning the drop
 * limits for the rule = secondCup: true here and in Levels.PlanRules (C#), then re-run tools/level-sweep.mjs
 * (changes levels 16+).
 */
export const PLAN_RULES = Object.freeze({ secondCup: false });

/**
 * Accept or reject one candidate (drops 0) for its band; on accept sets lv.drops and returns { need, wins }.
 * relax: percentage points off the target (0 in the first pass; the too-easy check only runs then).
 * rules: playLevel opts for every bot play (PLAN_RULES).
 */
export function acceptCandidate(lv, band, relax = 0, rules = PLAN_RULES) {
  if (lv.prefill && findGroups(buildBoard(lv)).length) return null;
  const probe = botPlay(lv, band.maxNeed, rules);
  if (!probe.won || probe.need < band.minNeed) return null;
  const need = probe.need;
  const dMin = need + DROP_SPARE;
  if (dMin > DROP_CAP) return null;
  const dMax = Math.min(DROP_CAP, Math.max(dMin, Math.floor((need * 19 + 9) / 10))); // ceil(need * 1.9)
  const req = Math.max(1, Math.floor(((band.pct - relax) * CASUAL.seeds + 99) / 100)); // ceil(pct% of the seeds)
  const wins = casualWinDrops(lv, dMax, req, 0, CASUAL.seeds, rules);
  if (!wins || wins.length < req) return null;
  if (!relax) {
    let easy = 0;
    for (const w of wins) if (w <= dMin) easy++;
    if (easy > req + CASUAL_EASY_MARGIN) return null;
  }
  const drops = Math.max(dMin, wins[req - 1]);
  // chapter rhythm chapters (14+) check a larger, stricter holdout (RHYTHM_HOLDOUT), so no level suits only lucky seeds
  // (from CURVE_CHAPTER, chapter 9+ since the pacing pass, the full target with no slack, plus a ceiling on Hard and finale levels)
  const curve = chapterOf(lv.n) >= CURVE_CHAPTER;
  const H = curve ? CURVE_HOLDOUT : chapterOf(lv.n) >= RHYTHM_CHAPTER ? RHYTHM_HOLDOUT : CASUAL;
  const hReq = Math.max(1, Math.floor(((band.pct - relax - H.holdoutSlack) * H.holdout + 99) / 100));
  const hold = casualWinDrops(lv, drops, hReq, CASUAL.seeds, H.holdout, rules);
  if (!hold || hold.length < hReq) return null;
  if (curve && !relax && CURVE_HOLDOUT_CEIL[band.beat]) {
    // the ceiling is measured as the game plays (Second cup on), so it caps what a player meets
    const cup = casualWinDrops(lv, drops, 0, CASUAL.seeds, H.holdout, { ...rules, secondCup: true });
    if (cup.length * 100 > (band.pct + CURVE_HOLDOUT_CEIL[band.beat]) * H.holdout) return null;
  }
  if (curve && !relax) {
    // the second look (CURVE_SECOND): fresh stand-ins as the game plays, never far under the target, and a normal level
    // never far over it
    const S = CURVE_SECOND;
    const lo = Math.max(1, Math.floor(((band.pct - S.below) * S.seeds + 99) / 100));
    const second = casualWinDrops(lv, drops, lo, S.first, S.seeds, { ...rules, secondCup: true });
    if (!second || second.length < lo) return null;
    if (band.beat === 'normal' && second.length * 100 > (band.pct + S.above) * S.seeds) return null;
  }
  let won = 0;
  for (const w of wins) if (w <= drops) won++;
  lv.drops = drops;
  return { need, wins: won };
}

function fallbackLevel(n) {
  const lv = finalise(n, { goals: [{ type: 'tier', tier: 5, count: 1 }], seed: hashString(`nova-seed:${n}:fb`) });
  const probe = botPlay(lv, 120, PLAN_RULES);
  lv.drops = Math.ceil((probe.won ? probe.dropsUsed : 40) * 1.5) + 3;
  return lv;
}

/**
 * The search for level n (16+), used by tools/level-sweep.mjs to write the plan and by getLevel when the plan has
 * no entry. Returns { level, attempt, need, wins, relax } (attempt PLAN_FALLBACK, relax -1 for the fallback level).
 */
export function searchLevel(n, rules = PLAN_RULES) {
  n = Math.max(HAND.length + 1, Math.floor(n));
  const band = levelBand(n);
  for (const relax of CASUAL_RELAX) {
    for (let attempt = 0; attempt < PLAN_ATTEMPTS; attempt++) {
      const lv = candidateLevel(n, attempt);
      const r = acceptCandidate(lv, band, relax, rules);
      if (r) return { level: lv, attempt, need: r.need, wins: r.wins, relax };
    }
  }
  return { level: fallbackLevel(n), attempt: PLAN_FALLBACK, need: 0, wins: 0, relax: -1 };
}

// ---- the checked-in plan (src/game/levelPlan.js, written by tools/level-sweep.mjs)
// LEVEL_PLAN is a string of 4-character entries, one per level from PLAN_FIRST (16): entry k is level 16 + k.
// Each character is a digit in PLAN_ALPHABET (base 64): [attempt / 64][attempt % 64][drops / 64][drops % 64].
export const PLAN_FIRST = HAND.length + 1;
export const PLAN_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_';
export const PLAN_FALLBACK = 4095; // plan attempt code for the simple fallback level (never used by the shipped plan)

/** The plan entry for level n: { attempt, drops }, or null when the plan does not cover it. */
export function planEntry(n, plan = LEVEL_PLAN) {
  const k = Math.floor(n) - PLAN_FIRST;
  if (k < 0 || typeof plan !== 'string' || (k + 1) * 4 > plan.length) return null;
  const d = (i) => PLAN_ALPHABET.indexOf(plan[k * 4 + i]);
  const a1 = d(0), a0 = d(1), hi = d(2), lo = d(3);
  if (a1 < 0 || a0 < 0 || hi < 0 || lo < 0) return null;
  return { attempt: a1 * 64 + a0, drops: hi * 64 + lo };
}

/** Encode one plan entry (tools/level-sweep.mjs). */
export function encodePlanEntry(attempt, drops) {
  if (attempt < 0 || attempt > 4095 || drops < 0 || drops > 4095) throw new Error(`plan entry out of range ${attempt}/${drops}`);
  return PLAN_ALPHABET[Math.floor(attempt / 64)] + PLAN_ALPHABET[attempt % 64]
    + PLAN_ALPHABET[Math.floor(drops / 64)] + PLAN_ALPHABET[drops % 64];
}

function buildPlanned(n, e) {
  if (e.attempt === PLAN_FALLBACK) return fallbackLevel(n);
  const lv = candidateLevel(n, e.attempt);
  lv.drops = e.drops;
  return lv;
}

// ---- level hashes (parity: the C# port builds the same strings and FNV-1a hashes)
/** Canonical text of a level: n|kind|type.tier.count,...|prefill rows (cells '.', rows '/', '-' if none)|tide|seed|drops|tip */
export function levelCanon(lv) {
  return [
    lv.n, lv.kind, lv.goals.map((g) => `${g.type}.${g.tier || 0}.${g.count}`).join(','),
    lv.prefill ? lv.prefill.map((r) => r.map((x) => String(x)).join('.')).join('/') : '-',
    lv.tide || 0, lv.seed >>> 0, lv.drops, lv.tip || '',
  ].join('|');
}

/** FNV-1a over the canonical texts of levels from..to joined by '\n'. levelsHash(1, 150) === LEGACY_HASH. */
export function levelsHash(from, to) {
  const parts = [];
  for (let n = from; n <= to; n++) parts.push(levelCanon(getLevel(n)));
  return hashString(parts.join('\n'));
}

// ---------------------------------------------------------------- Daily Nebula / Today's Special (one level a day)

// Generator "difficulty position": a normal (non-hard) early-chapter-3 level. Medium-gentle and short.
export const DAILY_LEVEL_N = 24;
const DAILY_MIN_NEED = 10;   // bot needs at least this many drops (not trivial)
const DAILY_MAX_NEED = 26;   // ...and at most this many (about 3 minutes for a person)
const cacheDaily = new Map(); // twist -> Map(key -> level)

// ---- Weekly café rotation (DESIGN.md "Today's Special: weekly café rotation")
// Each weekday has a twist that uses one of the Journey's café mechanics, but only once the player has met that
// mechanic in the Journey; otherwise the day is plain, so the daily never teaches a rule cold. The twist is a pure
// function of (date, unlock stage); the puzzle is a pure function of (date, twist).
/** Every twist id, in code order (the friend-challenge code stores the index: never reorder, only append). */
export const DAILY_TWISTS = Object.freeze([
  'plain', 'orders', 'glaze', 'teapot', 'tin', 'relaxed',
  'orders+glaze', 'orders+teapot', 'orders+tin', 'glaze+teapot', 'glaze+tin', 'teapot+tin',
]);
/** The café mechanics in the order the Journey introduces them. */
export const DAILY_MECHS = Object.freeze(['orders', 'glaze', 'teapot', 'tin']);
/** First Journey level of each mechanic (the first level of its chapter). */
export const DAILY_MECH_FROM = Object.freeze({
  orders: (ORDERS_CHAPTER - 1) * CHAPTER_SIZE + 1, glaze: (GLAZE_CHAPTER - 1) * CHAPTER_SIZE + 1,
  teapot: (TEAPOT_CHAPTER - 1) * CHAPTER_SIZE + 1, tin: (TIN_CHAPTER - 1) * CHAPTER_SIZE + 1,
});
/** The week, Sunday first: 'mix' = two unlocked mechanics together (Saturday). */
export const DAILY_WEEK = Object.freeze(['relaxed', 'plain', 'orders', 'glaze', 'teapot', 'tin', 'mix']);
/** Relaxed (Sunday): a shorter puzzle with many more spare drops. */
export const DAILY_RELAXED = Object.freeze({ minNeed: 8, maxNeed: 22, slack: 1.9, spare: 8 });
/** Extended solvability check for twist and relaxed days: this many casual stand-ins out of `seeds` must win. */
export const DAILY_CASUAL = Object.freeze({ seeds: 20, wins: 12, relaxedWins: 16 });
const DOW_T = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4]; // dailyWeekday month offsets

/**
 * Unlock stage 0..4 from save.journey.stars: how many café mechanics the player has met, i.e. has cleared a level at
 * or past the mechanic's first level (the Journey is linear and each mechanic's first levels always show it).
 * Mechanics unlock in DAILY_MECHS order, so stage s means DAILY_MECHS.slice(0, s).
 */
export function dailyStage(stars) {
  let top = 0;
  for (const k of Object.keys(stars || {})) {
    const n = Number(k);
    if (Number.isInteger(n) && n > top && Number(stars[k]) > 0) top = n;
  }
  let s = 0;
  for (const m of DAILY_MECHS) if (top >= DAILY_MECH_FROM[m]) s++;
  return s;
}

/** Weekday of a 'YYYY-MM-DD' key (0 = Sunday; Sakamoto's method, integers only), or -1 when the key is not a real date. */
export function dailyWeekday(key) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key));
  if (!m) return -1;
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  const dim = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (y < 1 || mo < 1 || mo > 12 || d < 1 || d > dim[mo - 1]) return -1;
  const yy = mo < 3 ? y - 1 : y;
  return (yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) + DOW_T[mo - 1] + d) % 7;
}

/** The twist of date `key` for a player at unlock stage `stage` (dailyStage). Never a mechanic the player hasn't met. */
export function dailyTwist(key, stage) {
  key = String(key);
  const s = Math.max(0, Math.min(DAILY_MECHS.length, Math.floor(Number(stage) || 0)));
  const dow = dailyWeekday(key);
  if (dow < 0) return 'plain';
  const day = DAILY_WEEK[dow];
  if (day === 'plain' || day === 'relaxed') return day;
  const open = DAILY_MECHS.slice(0, s);
  if (day !== 'mix') return open.includes(day) ? day : 'plain';
  const pairs = DAILY_TWISTS.filter((t) => t.includes('+') && t.split('+').every((m) => open.includes(m)));
  if (pairs.length) return pairs[hashString(`nova-daily-mix:${key}`) % pairs.length];
  return open.length ? open[0] : 'plain';
}

/** A known twist id, else 'plain'. */
export function normTwist(t) { return DAILY_TWISTS.includes(t) ? t : 'plain'; }
/** The café mechanics a twist uses (plain / relaxed: none). */
export function twistMechs(t) { t = normTwist(t); return t === 'plain' || t === 'relaxed' ? [] : t.split('+'); }

/** Puts one twist's café mechanics into a raw daily candidate (goals / prefill / tide). rng: the twist seed only. */
function applyDailyTwist(raw, twist, rng) {
  const mechs = twistMechs(twist);
  let goals = raw.goals.slice(), prefill = raw.prefill ? raw.prefill.map((r) => r.slice()) : null, tide = raw.tide;
  const ticket = (tiers) => {
    const tier = tiers.splice(Math.floor(rng() * tiers.length), 1)[0];
    return { type: 'order', tier, count: tier >= 6 ? 1 : 1 + (rng() < 0.3 ? 1 : 0) };
  };
  // teapots first: they set the goals and a fresh plain prefill (1-2 rows, no stones), then sit on top of it
  if (mechs.includes('teapot')) {
    const tp = { type: 'teapot', count: 1 + (rng() < 0.35 ? 1 : 0) };
    // a teapot alone is over in a few drops: it keeps the day's first tier / score / combo goal when it has one
    const keep = goals.find((g) => g.type === 'tier' || g.type === 'score' || g.type === 'combo');
    goals = mechs.includes('orders') ? [tp, ticket([4, 5])] : keep ? [tp, keep] : [tp];
    const depth = 1 + (rng() < 0.5 ? 1 : 0);
    const rows = [];
    while (rows.length < depth) rows.unshift(plainRow(rng, rows.length ? rows[0] : null));
    const free = [0, 1, 2, 3, 4];
    const top = [E, E, E, E, E];
    for (let i = 0; i < tp.count; i++) top[free.splice(Math.floor(rng() * free.length), 1)[0]] = 'T';
    prefill = [top, ...rows];
    tide = null;
  } else if (mechs.includes('orders')) {
    // 1-2 tickets (tiers 4-6, distinct); one ticket may keep the day's score or combo goal
    const tiers = [4, 5, 6];
    const tickets = [ticket(tiers)];
    if (rng() < 0.45) tickets.push(ticket(tiers));
    const keep = goals.find((g) => g.type === 'score' || g.type === 'combo');
    goals = tickets.length === 1 && keep && rng() < 0.5 ? [tickets[0], keep] : tickets;
  }
  // sugar glaze: 1-2 plain starting pieces (a bare level gets one plain row)
  if (mechs.includes('glaze')) {
    if (!prefill) prefill = [plainRow(rng, null)];
    const cells = [];
    prefill.forEach((row, r) => row.forEach((t, cc) => { if (typeof t === 'number' && t > 0) cells.push([r, cc]); }));
    const k = Math.min(cells.length, 1 + (rng() < 0.5 ? 1 : 0));
    for (let i = 0; i < k; i++) {
      const [r, cc] = cells.splice(Math.floor(rng() * cells.length), 1)[0];
      prefill[r][cc] = 'Z' + prefill[r][cc];
    }
  }
  // cookie tins: 1-2 closed tins on plain column tops (the Journey's own placement)
  if (mechs.includes('tin')) prefill = placeTins(prefill, 2, 0.3, rng);
  return { goals, prefill, tide: v3TideRule(goals, tide), seed: raw.seed };
}

/** One daily candidate for (key, twist). Plain keeps the original seeds, so plain days are unchanged. */
function dailyCandidate(n, attempt, key, twist) {
  if (twist === 'plain' || twist === 'relaxed') return genCandidate(n, attempt, key);
  const raw = genCandidate(n, attempt, `${key}:${twist}`);
  return applyDailyTwist(raw, twist, mulberry32(hashString(`nova-daily-twist:${key}:${twist}:${attempt}`)));
}

/**
 * The daily level for a local date key 'YYYY-MM-DD' and a twist (DAILY_TWISTS; default 'plain', the original daily).
 * Same for everyone with the same twist, deterministic (seeded from the date, never Math.random) and bot-verified
 * solvable: the greedy bot (no Second cup) needs 10-26 drops and wins at the drop limit; twist and relaxed days also
 * need DAILY_CASUAL casual stand-ins to win. A twist that finds no candidate falls back to its first mechanic, then
 * to plain (level.twist always names what the board really holds). Uses the Journey level format.
 */
export function getDailyLevel(key, twist = 'plain') {
  key = String(key);
  twist = normTwist(twist);
  let byKey = cacheDaily.get(twist);
  if (!byKey) cacheDaily.set(twist, byKey = new Map());
  if (byKey.has(key)) return byKey.get(key);
  const n = DAILY_LEVEL_N;
  const relaxed = twist === 'relaxed';
  const minNeed = relaxed ? DAILY_RELAXED.minNeed : DAILY_MIN_NEED, maxNeed = relaxed ? DAILY_RELAXED.maxNeed : DAILY_MAX_NEED;
  const casualReq = twist === 'plain' ? 0 : relaxed ? DAILY_CASUAL.relaxedWins : DAILY_CASUAL.wins;
  let level = null;
  for (let attempt = 0; attempt < 80 && !level; attempt++) {
    const lv = finalise(n, dailyCandidate(n, attempt, key, twist));
    if (lv.prefill && findGroups(buildBoard(lv)).length) continue;
    const probe = botPlay(lv, maxNeed, NO_CUP);
    if (!probe.won || probe.dropsUsed < minNeed) continue;
    lv.drops = relaxed ? Math.max(probe.dropsUsed + DAILY_RELAXED.spare, Math.ceil(probe.dropsUsed * DAILY_RELAXED.slack))
      : Math.max(probe.dropsUsed + 4, Math.ceil(probe.dropsUsed * DAILY_SLACK));
    if (!botPlay(lv, lv.drops, NO_CUP).won) continue;
    if (casualReq) {
      const w = casualWinDrops(lv, lv.drops, casualReq, 0, DAILY_CASUAL.seeds, NO_CUP);
      if (!w || w.length < casualReq) continue;
    }
    level = lv;
  }
  if (!level && twist !== 'plain') {
    const back = twist.includes('+') ? twist.split('+')[0] : 'plain';
    level = getDailyLevel(key, back);
    byKey.set(key, level);
    return level;
  }
  if (!level) {
    const lv = finalise(n, { goals: [{ type: 'tier', tier: 5, count: 1 }], seed: hashString(`nova-daily-seed:${key}:fb`) });
    const probe = botPlay(lv, 120, NO_CUP);
    lv.drops = Math.ceil((probe.won ? probe.dropsUsed : 30) * 1.5) + 3;
    level = lv;
  }
  level.daily = key;
  level.twist = twist;
  byKey.set(key, level);
  return level;
}

export function levelSeedsPreview(count = LEVEL_COUNT) {
  const out = [];
  for (let i = 1; i <= count; i++) out.push(getLevel(i));
  return out;
}
