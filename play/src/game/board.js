// NOVA DROP — pure board logic. No DOM, no globals, deterministic given an RNG.
//
// Coordinates: r = 0 is the TOP row, r = rows-1 the bottom row. c = 0 is the left column.
// Cells hold null | orb | asteroid:
//   orb      = { id, kind:'orb', tier, golden, wild }
//   asteroid = { id, kind:'asteroid', hp }
//   teapot   = { id, kind:'teapot' }  (Journey "Teapot deliveries": never merges, delivered on the bottom row)
//   tin      = { id, kind:'tin', hp }  (Journey "Cookie tins": hp = taps left; opens into a treat orb)
// Every mutating function returns a list of plain "events" the renderer can animate.

import { pickWeighted } from './rng.js';

export const COLS = 5;
export const ROWS = 7;
export const MAX_TIER = 10;
export const SUPERNOVA_TIER = 10;
export const ASTEROID_HP = 2;
/** Cookie tins (DESIGN.md): merges right next to a tin it takes to open it. */
export const TIN_TAPS = 3;
/** Treat inside a tin that opens with no plain piece beside it (tier 2). */
export const TIN_TREAT = 2;

export const TIER_NAMES = [
  '', 'Dust', 'Pebble', 'Rock', 'Moon', 'Planet', 'Ringed Planet',
  'Gas Giant', 'Star', 'Blue Giant', 'Supernova',
];

// ---------------------------------------------------------------- basics

export function createBoard({ cols = COLS, rows = ROWS } = {}) {
  return { cols, rows, cells: new Array(cols * rows).fill(null), nextId: 1 };
}

export function cloneBoard(b) {
  return {
    cols: b.cols,
    rows: b.rows,
    nextId: b.nextId,
    cells: b.cells.map((x) => (x ? { ...x } : null)),
  };
}

export const inBounds = (b, r, c) => r >= 0 && r < b.rows && c >= 0 && c < b.cols;
export const getCell = (b, r, c) => (inBounds(b, r, c) ? b.cells[r * b.cols + c] : null);
export function setCell(b, r, c, v) { b.cells[r * b.cols + c] = v; }

export function makeOrb(b, tier, extra = {}) {
  return {
    id: b.nextId++,
    kind: 'orb',
    tier: Math.max(1, Math.min(MAX_TIER, tier | 0)),
    golden: !!extra.golden,
    wild: !!extra.wild,
    ...(extra.glazed ? { glazed: true } : {}),
  };
}

export function makeAsteroid(b, hp = ASTEROID_HP) {
  return { id: b.nextId++, kind: 'asteroid', hp };
}

/** Teapot (DESIGN.md "Teapot deliveries"): a prefilled token that never merges and is delivered on the bottom row. */
export function makeTeapot(b) {
  return { id: b.nextId++, kind: 'teapot' };
}

/** Cookie tin (DESIGN.md "Cookie tins"): each merge right next to it taps it once; after TIN_TAPS taps it opens. */
export function makeTin(b, hp = TIN_TAPS) {
  return { id: b.nextId++, kind: 'tin', hp };
}

/** Build a board from a compact text/array description (handy for tests).
 * rowsSpec: array of rows (top->bottom), each an array of tokens:
 *   0/'.'/null = empty, number = orb tier, 'A' = asteroid (2hp), 'a' = asteroid (1hp), 'G3' golden tier 3,
 *   'Z3' sugar-glazed tier 3, 'T' teapot, 'K' cookie tin (3 taps left; 'K2' / 'K1' with fewer) */
export function boardFromRows(rowsSpec, opts = {}) {
  const rows = rowsSpec.length;
  const cols = rowsSpec[0].length;
  const b = createBoard({ cols, rows, ...opts });
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const t = rowsSpec[r][c];
      if (t === 0 || t === '.' || t == null) continue;
      if (t === 'A') setCell(b, r, c, makeAsteroid(b, 2));
      else if (t === 'a') setCell(b, r, c, makeAsteroid(b, 1));
      else if (t === 'T') setCell(b, r, c, makeTeapot(b));
      else if (t === 'K') setCell(b, r, c, makeTin(b));
      else if (typeof t === 'string' && t[0] === 'K') setCell(b, r, c, makeTin(b, Number(t.slice(1))));
      else if (typeof t === 'string' && t[0] === 'G') setCell(b, r, c, makeOrb(b, Number(t.slice(1)), { golden: true }));
      else if (typeof t === 'string' && t[0] === 'Z') setCell(b, r, c, makeOrb(b, Number(t.slice(1)), { glazed: true }));
      else setCell(b, r, c, makeOrb(b, Number(t)));
    }
  }
  return b;
}

/** Inverse of boardFromRows (tiers only; asteroids as 'A'/'a', glazed orbs as 'Z3', teapots as 'T', tins as 'K'/'K2'/'K1'). */
export function boardToRows(b) {
  const out = [];
  for (let r = 0; r < b.rows; r++) {
    const row = [];
    for (let c = 0; c < b.cols; c++) {
      const x = getCell(b, r, c);
      row.push(!x ? 0 : x.kind === 'asteroid' ? (x.hp >= 2 ? 'A' : 'a') : x.kind === 'teapot' ? 'T' : x.kind === 'tin' ? (x.hp >= TIN_TAPS ? 'K' : 'K' + x.hp) : x.glazed ? 'Z' + x.tier : x.tier);
    }
    out.push(row);
  }
  return out;
}

/** Lowest empty row in a column, or -1 when the column is full. */
export function landingRow(b, c) {
  for (let r = b.rows - 1; r >= 0; r--) if (!getCell(b, r, c)) return r;
  return -1;
}

export const columnFull = (b, c) => landingRow(b, c) < 0;

export function isBoardFull(b) {
  for (let c = 0; c < b.cols; c++) if (!columnFull(b, c)) return false;
  return true;
}

export function columnHeight(b, c) {
  let h = 0;
  for (let r = 0; r < b.rows; r++) if (getCell(b, r, c)) h++;
  return h;
}

export function highestTier(b) {
  let m = 0;
  for (const x of b.cells) if (x && x.kind === 'orb' && x.tier > m) m = x.tier;
  return m;
}

export function countKind(b, kind) {
  let n = 0;
  for (const x of b.cells) if (x && x.kind === kind) n++;
  return n;
}

// ---------------------------------------------------------------- rules / tuning

/** maxSpawn = clamp(highestTierOnBoard − 2, 3, 6), minus Gentle Spawns stacks (floor 2). */
export function maxSpawnTier(b, gentle = 0) {
  const base = Math.max(3, Math.min(6, highestTier(b) - 2));
  return Math.max(2, base - gentle);
}

/**
 * Endless "chosen challenge" tiers (DESIGN.md). Only the tide speed differs; scoring, spawns,
 * perks, ads and interstitial caps are identical. Standard is the default.
 * curve[s - 1] = drops between tides in sector s (the last entry holds for every later sector):
 * a generous start that holds for a few sectors, then a squeeze to the floor, so runs build to a natural end.
 * start = curve[0], min = the fastest it ever gets. Bold is the classic hard curve (−1 per sector, 3 from sector 6).
 * slowFull = last sector where a Slow Tide stack gives its full +3 (slowTidePerStack); Bold tapers sooner.
 * Gentle and Bold were tightened late (rules-6) so that at most ~1% of runs last past 3× the median.
 */

/** Slow Tide stacks give their full +3 drops each up to this sector, +2 for the next SLOW_TIDE_STEP sectors, then +1. */
export const SLOW_TIDE_FULL = 6, SLOW_TIDE_STEP = 4;

export const CHALLENGES = [
  { id: 'gentle', name: 'Gentle', start: 16, min: 5, curve: [16, 15, 15, 14, 14, 13, 12, 10, 7, 5], slowFull: SLOW_TIDE_FULL },
  { id: 'standard', name: 'Standard', start: 15, min: 4, curve: [15, 14, 14, 13, 13, 12, 11, 9, 7, 5, 4], slowFull: SLOW_TIDE_FULL },
  { id: 'bold', name: 'Bold', start: 7, min: 3, curve: [7, 6, 5, 4, 4, 3], slowFull: 2 },
];
const CHALLENGE_BY_ID = Object.fromEntries(CHALLENGES.map((c) => [c.id, c]));

/** Unknown / missing ids are Standard (old saves, old snapshots, the daily challenge). */
export function normChallenge(id) {
  return Object.prototype.hasOwnProperty.call(CHALLENGE_BY_ID, id) ? id : 'standard';
}

/** One-line feedforward shown under each option, generated from the tuning table. */
export function challengeLine(id) {
  const t = CHALLENGE_BY_ID[normChallenge(id)];
  if (t.id === 'standard') return `A calm start: a new row every ${t.start} drops, slowly speeding up to every ${t.min}.`;
  if (t.id === 'gentle') return `Slower tide: a new row every ${t.start} drops, never faster than every ${t.min}.`;
  return `Fast tide: a new row every ${t.start} drops, speeding up to every ${t.min}.`;
}


/** Drops one Slow Tide stack adds between tides in a sector: 3 (sectors 1–full), 2 (the next SLOW_TIDE_STEP), then 1. Default full 6. */
export function slowTidePerStack(sector, full = SLOW_TIDE_FULL) {
  const s = Math.max(1, sector);
  return s <= full ? 3 : s <= full + SLOW_TIDE_STEP ? 2 : 1;
}

/**
 * Drops between tides in a sector: the challenge's curve (Standard 15 → 4) plus the Slow Tide stacks
 * (slowTidePerStack each, tapering in later sectors).
 */
export function tideInterval(sector, slowTideStacks = 0, challenge = 'standard') {
  const t = CHALLENGE_BY_ID[normChallenge(challenge)];
  const s = Math.max(1, sector);
  return t.curve[Math.min(s, t.curve.length) - 1] + slowTidePerStack(s, t.slowFull) * slowTideStacks;
}

/** Score needed to leave sector n (1st 400, then ×1.7 each). */
export function sectorThreshold(n) {
  return Math.round(400 * Math.pow(1.7, Math.max(0, n - 1)));
}

/** Sector number for a given score (starts at 1). */
export function sectorForScore(score) {
  let s = 1;
  while (score >= sectorThreshold(s) && s < 999) s++;
  return s;
}

export function mergeScore(newTier, combo, mult = 1) {
  return Math.pow(2, newTier) * combo * mult;
}

/** Spawn a pending orb spec (no id yet). */
export function spawnOrb(b, rng, { gentle = 0, goldenChance = 0, wild = false } = {}) {
  const max = maxSpawnTier(b, gentle);
  const weights = [];
  for (let t = 1; t <= max; t++) weights.push(Math.pow(max - t + 1, 1.6));
  const tier = 1 + pickWeighted(rng, weights);
  const golden = goldenChance > 0 && rng() < goldenChance;
  return { tier, golden, wild: !!wild };
}

// ---------------------------------------------------------------- resolution

const DEFAULT_OPTS = {
  comboStart: 1,     // Combo Engine raises this
  bangRadius: 1,     // 1 => 3x3, 2 => 5x5 (Bigger Bang)
  crackDamage: 1,    // Asteroid Miner => 2 (one-hit break)
  minerBonus: 0,     // Asteroid Miner => +50 per asteroid broken
  goldenMult: 3,     // golden orb in a merge => ×3
  scoreMult: 1,      // generic perk multiplier
  diagonal: false,   // Constellation Bonds => the DROPPED orb also links diagonally (landing step only)
  gravityWell: false, // Gravity Well => groups of 4+ jump one extra tier
  earlyNova: false,  // Early Nova => a Blue Giant (tier 9) also explodes like a supernova
  cometRadius: 0,    // Meteor Shower => 1 (comet clears a 3x3 area)
  orders: null,      // Café Orders: open tickets [{ tier, left }] (Journey, built by levels.js orderOpts); never mutated
};

function normOpts(o) { return { ...DEFAULT_OPTS, ...(o || {}) }; }

const key = (r, c) => r * 64 + c;
const NEI = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const NEI8 = [...NEI, [-1, -1], [-1, 1], [1, -1], [1, 1]];

/**
 * All connected same-tier orb groups with size >= 2 (orthogonal). Wild and sugar-glazed orbs never group.
 * Constellation Bonds: with opts.diagonal AND a `bond` set of cell keys, a diagonal link also
 * counts when one of its two ends is in `bond` (the just-dropped orb). No bond set => orthogonal.
 */
export function findGroups(b, opts, bond = null) {
  const nei = opts && opts.diagonal && bond && bond.size ? NEI8 : NEI;
  const seen = new Uint8Array(b.rows * b.cols);
  const groups = [];
  for (let r = 0; r < b.rows; r++) {
    for (let c = 0; c < b.cols; c++) {
      const i = r * b.cols + c;
      const x = b.cells[i];
      if (seen[i] || !x || x.kind !== 'orb' || x.wild || x.glazed) continue;
      const group = [];
      const stack = [[r, c]];
      seen[i] = 1;
      while (stack.length) {
        const [cr, cc] = stack.pop();
        group.push({ r: cr, c: cc });
        for (const [dr, dc] of nei) {
          const nr = cr + dr, nc = cc + dc;
          if (!inBounds(b, nr, nc)) continue;
          const j = nr * b.cols + nc;
          const y = b.cells[j];
          if (seen[j] || !y || y.kind !== 'orb' || y.wild || y.glazed || y.tier !== x.tier) continue;
          if (dr && dc && !bond.has(key(cr, cc)) && !bond.has(key(nr, nc))) continue;
          seen[j] = 1;
          stack.push([nr, nc]);
        }
      }
      if (group.length >= 2) groups.push(group);
    }
  }
  return groups;
}

function chooseAnchor(group, touched) {
  let cands = group.filter((p) => touched.has(key(p.r, p.c)));
  if (!cands.length) cands = group;
  let best = cands[0];
  for (const p of cands) if (p.r > best.r || (p.r === best.r && p.c < best.c)) best = p;
  return best;
}

/** Compact every column downward. Returns moves [{id,c,fromR,toR}]. */
export function applyGravity(b) {
  const moves = [];
  for (let c = 0; c < b.cols; c++) {
    let write = b.rows - 1;
    for (let r = b.rows - 1; r >= 0; r--) {
      const x = getCell(b, r, c);
      if (!x) continue;
      if (r !== write) {
        setCell(b, write, c, x);
        setCell(b, r, c, null);
        moves.push({ id: x.id, c, fromR: r, toR: write });
      }
      write--;
    }
  }
  return moves;
}

/**
 * Teapot deliveries (DESIGN.md): every teapot resting on the bottom row is delivered (leaves the board), then
 * gravity; repeated while a teapot lands on the bottom row. Returns { delivered:[{ id, r, c }], gravity:[moves] }
 * (gravity: every pass's moves in order). No points.
 */
export function deliverTeapots(b) {
  const delivered = [], gravity = [];
  for (let guard = 0; guard < b.rows; guard++) {
    const r = b.rows - 1;
    let any = false;
    for (let c = 0; c < b.cols; c++) {
      const x = getCell(b, r, c);
      if (x && x.kind === 'teapot') { delivered.push({ id: x.id, r, c }); setCell(b, r, c, null); any = true; }
    }
    if (!any) break;
    for (const mv of applyGravity(b)) gravity.push(mv);
  }
  return { delivered, gravity };
}

/** Treat tier for a tin opening at (r, c): the highest plain orb orthogonally next to it (not wild / glazed,
 * at most a Blue Giant), else TIN_TREAT. */
function tinTreat(b, r, c) {
  let best = 0;
  for (const [dr, dc] of NEI) {
    const n = getCell(b, r + dr, c + dc);
    if (n && n.kind === 'orb' && !n.wild && !n.glazed && n.tier > best) best = n.tier;
  }
  return best > 0 ? Math.min(SUPERNOVA_TIER - 1, best) : TIN_TREAT;
}

/** True when any teapot is on the board (resolve skips the delivery passes otherwise). */
function hasTeapot(b) {
  for (const x of b.cells) if (x && x.kind === 'teapot') return true;
  return false;
}

/**
 * Resolve all merges / cascades until the board is stable.
 * touched: cells that just changed (anchor preference for merges).
 * bond: true only from dropOrb => Constellation Bonds lets the touched cells (landed orb + jokers)
 * link diagonally in the FIRST step; cascades, tides and comets stay orthogonal.
 * Returns { steps, points, maxCombo, maxTier, supernovas, asteroidsBroken, merges }.
 * Each step: { combo, merges:[], cracks:[], glazes:[], supernovas:[], served:[], gravity:[], points }.
 * glazes: sugar glaze cracked off orbs next to a merge [{ id, r, c, tier }] (the orb stays, now free to merge).
 * tins: cookie tins tapped by a merge next to them [{ id, r, c, hp, opened, tier }] (hp = taps left; an opened tin
 * turns into an orb of `tier` in place, keeping its id, and may merge next step; tier 0 while still closed).
 * served: Café Orders tickets filled this step [{ id, r, c, tier }] (the merged piece leaves the board before gravity).
 * delivered / deliverGravity: teapots that reached the bottom row after this step's gravity [{ id, r, c }] and the
 * gravity that followed (no extra step, so the chain length is unchanged).
 * preDelivered / preGravity (only when a teapot already sat on the bottom row, e.g. after a comet or a shuffle):
 * delivered before the first step.
 */
export function resolve(b, touched = [], opts, bond = false) {
  const o = normOpts(opts);
  const steps = [];
  let touchedSet = new Set(touched.map((p) => key(p.r, p.c)));
  let combo = o.comboStart;
  const summary = { points: 0, maxCombo: 0, maxTier: 0, supernovas: 0, asteroidsBroken: 0, merges: 0 };
  const orders = o.orders && o.orders.length ? o.orders.map((t) => ({ tier: t.tier, left: t.left })) : null;
  const teapots = hasTeapot(b);
  let pre = null;
  if (teapots) {
    const d = deliverTeapots(b);
    if (d.delivered.length) {
      pre = d;
      for (const p of d.delivered) touchedSet.delete(key(p.r, p.c));
      for (const mv of d.gravity) { touchedSet.delete(key(mv.fromR, mv.c)); touchedSet.add(key(mv.toR, mv.c)); }
    }
  }

  for (let guard = 0; guard < 200; guard++) {
    const groups = findGroups(b, o, bond && guard === 0 ? touchedSet : null);
    if (!groups.length) break;
    const step = { combo, merges: [], cracks: [], glazes: [], tins: [], supernovas: [], served: [], gravity: [], delivered: [], deliverGravity: [], points: 0 };
    const nextTouched = new Set();
    const groupCellKeys = new Set();

    // 1) collapse each group into one orb at its anchor
    for (const g of groups) {
      const anchor = chooseAnchor(g, touchedSet);
      const first = getCell(b, g[0].r, g[0].c);
      const fromTier = first.tier;
      const well = o.gravityWell && g.length >= 4 ? 1 : 0;
      const newTier = Math.min(MAX_TIER, fromTier + (g.length - 1) + well);
      const cells = g.map((p) => {
        const x = getCell(b, p.r, p.c);
        groupCellKeys.add(key(p.r, p.c));
        return { r: p.r, c: p.c, id: x.id, tier: x.tier, golden: !!x.golden };
      });
      const golden = cells.some((x) => x.golden);
      const pts = mergeScore(newTier, combo, (golden ? o.goldenMult : 1) * o.scoreMult);
      for (const p of g) setCell(b, p.r, p.c, null);
      const orb = makeOrb(b, newTier);
      setCell(b, anchor.r, anchor.c, orb);
      step.merges.push({ cells, anchor: { r: anchor.r, c: anchor.c }, id: orb.id, fromTier, tier: newTier, size: g.length, golden, points: pts });
      step.points += pts;
      summary.merges++;
      summary.maxTier = Math.max(summary.maxTier, newTier);
      nextTouched.add(key(anchor.r, anchor.c));
    }

    // 2) crack asteroids orthogonally adjacent to any merged cell (once per step each); the same merge also
    //    cracks the sugar glaze off an adjacent glazed orb (one hit, no points), which may then merge next step
    //    A cookie tin next to a merged cell is tapped once per step; one with no taps left opens in 2b.
    const cracked = new Set();
    for (const k of groupCellKeys) {
      const r = Math.floor(k / 64), c = k % 64;
      for (const [dr, dc] of NEI) {
        const nr = r + dr, nc = c + dc;
        const a = getCell(b, nr, nc);
        if (a && a.kind === 'orb' && a.glazed) {
          delete a.glazed;
          step.glazes.push({ id: a.id, r: nr, c: nc, tier: a.tier });
          nextTouched.add(key(nr, nc));
          continue;
        }
        if (a && a.kind === 'tin') {
          if (cracked.has(a.id)) continue;
          cracked.add(a.id);
          a.hp = Math.max(0, a.hp - 1);
          step.tins.push({ id: a.id, r: nr, c: nc, hp: a.hp, opened: a.hp === 0, tier: 0 });
          continue;
        }
        if (!a || a.kind !== 'asteroid' || cracked.has(a.id)) continue;
        cracked.add(a.id);
        a.hp -= o.crackDamage;
        const broken = a.hp <= 0;
        if (broken) {
          // asteroid turns into a Dust orb (keeps its id so visuals can morph it)
          setCell(b, nr, nc, { id: a.id, kind: 'orb', tier: 1, golden: false, wild: false });
          summary.asteroidsBroken++;
          step.points += o.minerBonus;
          nextTouched.add(key(nr, nc));
        }
        step.cracks.push({ id: a.id, r: nr, c: nc, hp: Math.max(0, a.hp), broken, bonus: broken ? o.minerBonus : 0 });
      }
    }

    // 2b) opened tins: each turns into a treat orb in place (keeps its id; no points). All treat tiers are read
    //     before any tin turns, so two tins opening side by side don't depend on each other.
    if (step.tins.length) {
      for (const t of step.tins) if (t.opened) t.tier = tinTreat(b, t.r, t.c);
      for (const t of step.tins) {
        if (!t.opened) continue;
        setCell(b, t.r, t.c, { id: t.id, kind: 'orb', tier: t.tier, golden: false, wild: false });
        nextTouched.add(key(t.r, t.c));
      }
    }

    // 3) supernovas explode: clear self + neighbourhood (Early Nova: Blue Giants too)
    const novaTier = o.earlyNova ? SUPERNOVA_TIER - 1 : SUPERNOVA_TIER;
    for (const m of step.merges) {
      if (m.tier < novaTier) continue;
      const { r, c } = m.anchor;
      const cleared = [];
      let bonus = 1000 * combo;
      for (let dr = -o.bangRadius; dr <= o.bangRadius; dr++) {
        for (let dc = -o.bangRadius; dc <= o.bangRadius; dc++) {
          const nr = r + dr, nc = c + dc;
          const x = getCell(b, nr, nc);
          if (!x || x.kind === 'teapot') continue; // a teapot rides out the blast
          cleared.push({ id: x.id, r: nr, c: nc, kind: x.kind, tier: x.tier || 0 });
          if (x.kind === 'orb' && x.id !== m.id) bonus += Math.pow(2, x.tier) * combo;
          if (x.kind === 'asteroid') bonus += 50 * combo;
          setCell(b, nr, nc, null);
          nextTouched.delete(key(nr, nc));
        }
      }
      bonus = Math.round(bonus * o.scoreMult);
      step.supernovas.push({ r, c, id: m.id, radius: o.bangRadius, cleared, points: bonus });
      step.points += bonus;
      summary.supernovas++;
    }

    // 3b) Café Orders: a merged piece that exactly matches an open ticket is served (leaves the board; its points
    //     still count). Tickets in order; the piece must still be there (a supernova may have cleared it).
    if (orders) {
      for (const m of step.merges) {
        const { r, c } = m.anchor;
        const x = getCell(b, r, c);
        if (!x || x.id !== m.id) continue;
        const t = orders.find((q) => q.left > 0 && q.tier === m.tier);
        if (!t) continue;
        t.left--;
        setCell(b, r, c, null);
        nextTouched.delete(key(r, c));
        step.served.push({ id: m.id, r, c, tier: m.tier });
      }
    }

    // 4) gravity
    step.gravity = applyGravity(b);
    for (const mv of step.gravity) {
      nextTouched.delete(key(mv.fromR, mv.c));
      nextTouched.add(key(mv.toR, mv.c));
    }

    // 5) teapots that reached the bottom row are delivered (then gravity again)
    if (teapots) {
      const d = deliverTeapots(b);
      step.delivered = d.delivered;
      step.deliverGravity = d.gravity;
      for (const p of d.delivered) nextTouched.delete(key(p.r, p.c));
      for (const mv of d.gravity) { nextTouched.delete(key(mv.fromR, mv.c)); nextTouched.add(key(mv.toR, mv.c)); }
    }

    summary.points += step.points;
    summary.maxCombo = Math.max(summary.maxCombo, combo);
    steps.push(step);
    touchedSet = nextTouched;
    combo++;
  }
  return pre ? { steps, ...summary, preDelivered: pre.delivered, preGravity: pre.gravity } : { steps, ...summary };
}

/**
 * Drop a pending orb spec into a column. Returns
 * { ok, row, col, id, tier, wildFrom, steps, points, ... } or { ok:false } if the column is full.
 */
export function dropOrb(b, col, spec, opts) {
  if (col < 0 || col >= b.cols) return { ok: false };
  const row = landingRow(b, col);
  if (row < 0) return { ok: false };
  const orb = makeOrb(b, spec.tier, { golden: spec.golden });
  let wildFrom = null;
  if (spec.wild) {
    let best = 0;
    for (const [dr, dc] of NEI) {
      const n = getCell(b, row + dr, col + dc);
      if (n && n.kind === 'orb' && !n.wild && !n.glazed && n.tier > best) best = n.tier;
    }
    if (best > 0) { wildFrom = orb.tier; orb.tier = best; }
  }
  setCell(b, row, col, orb);
  // Steady Start joker: a Wild Orb resting on the board takes the tier of the first orb that lands
  // orthogonally next to it (and stops being wild), so that drop always merges.
  const jokers = [];
  const touched = [{ r: row, c: col }];
  for (const [dr, dc] of NEI) {
    const n = getCell(b, row + dr, col + dc);
    if (n && n.kind === 'orb' && n.wild) {
      n.wild = false; n.tier = orb.tier;
      jokers.push({ id: n.id, r: row + dr, c: col + dc, tier: orb.tier });
      touched.push({ r: row + dr, c: col + dc });
    }
  }
  const res = resolve(b, touched, opts, true);
  const out = { ok: true, row, col, id: orb.id, tier: orb.tier, golden: orb.golden, wild: !!spec.wild, wildFrom, ...res };
  if (jokers.length) out.jokers = jokers;
  return out;
}

/**
 * READ-ONLY landing preview for the aim ghost (presentation helper, not a rule).
 * Mirrors dropOrb's landing + wild-tier logic and the FIRST merge group only, so cascades
 * still surprise. Never mutates the board, never allocates ids, never touches an RNG.
 * Returns null when the column is full, else { row, col, tier, merge:[{r,c}] } where
 * `merge` lists the existing orbs that would merge with the landed orb (empty if none).
 */
export function previewDrop(b, col, spec, opts) {
  const nei = opts && opts.diagonal ? NEI8 : NEI;
  if (!spec || col < 0 || col >= b.cols) return null;
  const row = landingRow(b, col);
  if (row < 0) return null;
  let tier = Math.max(1, Math.min(MAX_TIER, spec.tier | 0));
  if (spec.wild) {
    let best = 0;
    for (const [dr, dc] of NEI) {
      const n = getCell(b, row + dr, col + dc);
      if (n && n.kind === 'orb' && !n.wild && !n.glazed && n.tier > best) best = n.tier;
    }
    if (best > 0) tier = best;
  }
  // Steady Start jokers orthogonally next to the landing cell take the landed tier
  const jok = new Set();
  for (const [dr, dc] of NEI) {
    const n = getCell(b, row + dr, col + dc);
    if (n && n.kind === 'orb' && n.wild) jok.add(key(row + dr, col + dc));
  }
  // flood fill from the landing cell through same-tier orbs (the landing cell itself is empty).
  // Bonds: like resolve's first step, a diagonal link needs the landing cell or a joker at one end.
  const bond = new Set([key(row, col), ...jok]);
  const seen = new Set([key(row, col)]);
  const stack = [[row, col]];
  const merge = [];
  while (stack.length) {
    const [cr, cc] = stack.pop();
    for (const [dr, dc] of nei) {
      const nr = cr + dr, nc = cc + dc;
      if (!inBounds(b, nr, nc) || seen.has(key(nr, nc))) continue;
      if (dr && dc && !bond.has(key(cr, cc)) && !bond.has(key(nr, nc))) continue;
      const y = getCell(b, nr, nc);
      if (!y || y.kind !== 'orb' || y.glazed || (y.wild ? !jok.has(key(nr, nc)) : y.tier !== tier)) continue;
      seen.add(key(nr, nc));
      merge.push({ r: nr, c: nc });
      stack.push([nr, nc]);
    }
  }
  return { row, col, tier, merge };
}

/**
 * Comet: vaporise one cell, then gravity + cascade. With opts.cometRadius (Meteor Shower)
 * the whole (2R+1)x(2R+1) area around the target is cleared (orbs and asteroids).
 * Cleared cells score nothing; only the cascade that follows does.
 * `removed` is the target cell, `cleared` every vaporised cell (target first).
 * Teapots can't be vaporised: aiming at one does nothing ({ ok:false }) and an area clear skips them.
 */
export function removeAt(b, r, c, opts) {
  const x = getCell(b, r, c);
  if (!x || x.kind === 'teapot') return { ok: false };
  const rad = Math.max(0, (opts && opts.cometRadius) | 0);
  const cleared = [{ ...x, r, c }];
  setCell(b, r, c, null);
  for (let dr = -rad; dr <= rad; dr++) {
    for (let dc = -rad; dc <= rad; dc++) {
      const y = getCell(b, r + dr, c + dc);
      if (!y || y.kind === 'teapot') continue;
      cleared.push({ ...y, r: r + dr, c: c + dc });
      setCell(b, r + dr, c + dc, null);
    }
  }
  const moves = applyGravity(b);
  const touched = moves.map((m) => ({ r: m.toR, c: m.c }));
  const res = resolve(b, touched, opts);
  return { ok: true, removed: cleared[0], cleared, gravity: moves, ...res };
}

/**
 * Morning Tidy (perk): lift every plain orb of `tier` off the board (golden ones too; never asteroids, teapots,
 * glazed or wild pieces), row by row from the top, then gravity and the normal cascade. The lifted pieces score
 * nothing. { ok:false, cleared:[] } when there is none (the board is untouched). No rng.
 */
export function sweepTier(b, tier, opts) {
  const cleared = [];
  for (let r = 0; r < b.rows; r++) {
    for (let c = 0; c < b.cols; c++) {
      const x = getCell(b, r, c);
      if (!x || x.kind !== 'orb' || x.tier !== tier || x.glazed || x.wild) continue;
      cleared.push({ ...x, r, c });
      setCell(b, r, c, null);
    }
  }
  if (!cleared.length) return { ok: false, cleared, gravity: [], steps: [], points: 0, maxTier: 0 };
  const moves = applyGravity(b);
  const touched = moves.map((m) => ({ r: m.toR, c: m.c }));
  const res = resolve(b, touched, opts);
  return { ok: true, removed: cleared[0], cleared, gravity: moves, ...res };
}

/**
 * Rising tide: push every column up one row and insert a new bottom row of low-tier
 * orbs plus 0–2 asteroids. If any cell already sits in the top row the push would
 * shove it off the board => { overflow:true } and the board is left untouched.
 */
export function pushRow(b, rng, { sector = 1, maxSpawn = 3 } = {}) {
  for (let c = 0; c < b.cols; c++) {
    if (getCell(b, 0, c)) return { overflow: true, inserted: [], moves: [] };
  }
  const moves = [];
  for (let r = 0; r < b.rows - 1; r++) {
    for (let c = 0; c < b.cols; c++) {
      const x = getCell(b, r + 1, c);
      setCell(b, r, c, x);
      if (x) moves.push({ id: x.id, c, fromR: r + 1, toR: r });
    }
  }
  const bottom = b.rows - 1;
  for (let c = 0; c < b.cols; c++) setCell(b, bottom, c, null);

  const aMax = Math.min(2, Math.floor((sector + 1) / 2)); // s1-2: up to 1, s3+: up to 2
  let aCount = rng.int(aMax + 1);
  if (sector >= 6 && aCount === 0 && rng() < 0.5) aCount = 1;
  const aCols = new Set();
  while (aCols.size < aCount) aCols.add(rng.int(b.cols));

  const lowMax = Math.max(1, Math.min(3, maxSpawn));
  const inserted = [];
  for (let c = 0; c < b.cols; c++) {
    let cell;
    if (aCols.has(c)) {
      cell = makeAsteroid(b, ASTEROID_HP);
    } else {
      const left = getCell(b, bottom, c - 1);
      const above = getCell(b, bottom - 1, c);
      const bad = new Set();
      if (left && left.kind === 'orb') bad.add(left.tier);
      if (above && above.kind === 'orb') bad.add(above.tier);
      const options = [];
      for (let t = 1; t <= Math.max(lowMax, 3); t++) if (!bad.has(t)) options.push(t);
      // weight toward the lowest tiers
      const weights = options.map((t) => (t <= lowMax ? Math.pow(lowMax - t + 2, 1.4) : 0.35));
      const tier = options[pickWeighted(rng, weights)];
      cell = makeOrb(b, tier);
    }
    setCell(b, bottom, c, cell);
    inserted.push({ ...cell, r: bottom, c });
  }
  return { overflow: false, inserted, moves };
}

/** Revive: clear every cell in the top `n` rows (teapots stay; a teapot that falls to the bottom row is delivered
 * by the next resolve). Returns cleared cells. */
export function clearTopRows(b, n = 3) {
  const cleared = [];
  for (let r = 0; r < Math.min(n, b.rows); r++) {
    for (let c = 0; c < b.cols; c++) {
      const x = getCell(b, r, c);
      if (x && x.kind !== 'teapot') { cleared.push({ ...x, r, c }); setCell(b, r, c, null); }
    }
  }
  const gravity = applyGravity(b);
  return { cleared, gravity };
}

/** Stable JSON-ish signature of the board (for determinism checks / debugging). */
export function boardSignature(b) {
  return b.cells.map((x) => (!x ? '.' : x.kind === 'asteroid' ? 'A' + x.hp : x.kind === 'teapot' ? 'T' : x.kind === 'tin' ? 'K' + x.hp : (x.glazed ? 'z' : '') + (x.golden ? 'g' : '') + x.tier)).join(',');
}

/**
 * Shuffle Column booster: randomly reorder the cells of one column (guaranteed to change
 * when possible), then cascade. Returns { ok, moves, ...resolveSummary }.
 */
export function shuffleColumn(b, c, rng, opts) {
  const cells = [];
  for (let r = 0; r < b.rows; r++) { const x = getCell(b, r, c); if (x) cells.push({ x, r }); }
  if (cells.length < 2) return { ok: false };
  const order = cells.map((_, i) => i);
  const same = (o) => o.every((v, i) => cells[v].x.kind === cells[i].x.kind && cells[v].x.tier === cells[i].x.tier && cells[v].x.hp === cells[i].x.hp);
  for (let tries = 0; tries < 12; tries++) {
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    if (!same(order)) break;
  }
  const moves = [];
  order.forEach((src, i) => {
    const toR = cells[i].r;
    setCell(b, toR, c, cells[src].x);
    if (cells[src].r !== toR) moves.push({ id: cells[src].x.id, c, fromR: cells[src].r, toR });
  });
  const res = resolve(b, cells.map((p) => ({ r: p.r, c })), opts);
  return { ok: true, moves, ...res };
}
