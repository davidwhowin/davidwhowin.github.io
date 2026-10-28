// Sector bounties (DESIGN.md "Sector bounties"): one optional side goal per Endless sector.
// Pure, no DOM. Mirrored bit-exactly by C# NovaDrop.Core.Bounties (Scripts/Core/Bounties.cs).
//
// The goal is picked from its own derived seed per sector (deriveSeed(run seed, 'bounty:' + sector)), so the
// spawn, tide and perk streams are never touched and every board transcript stays identical. A bounty never
// changes the board, the score, the tide or a perk; it only adds a few coins to the run payout.
import { mulberry32, deriveSeed } from './rng.js';
import { aTierName } from './tierNames.js';

/** Goal kinds, in pick order (index = the seeded pick). Each reads a signal the game already emits. */
export const BOUNTY_KINDS = Object.freeze(['tier', 'combo', 'asteroids', 'chain']);
/** Coins per completed bounty (flat: no perk / upgrade multiplier). Added to the run's coins at game over. */
export const BOUNTY_COINS = 15;

// Targets per sector (index sector - 1; later sectors use the last entry). Tuned with seeded bot and random-column
// runs so most goals land at roughly 40-70% (sectors 2-3 are short, so they ask a little less). Integers only.
export const BOUNTY_TARGETS = Object.freeze({
  tier: Object.freeze([6, 5, 5, 6, 6, 7, 7, 8]), // Ringed Planet, Planet, ..., Gas Giant, Star
  combo: Object.freeze([4, 3, 3, 4, 4, 4, 4, 5]), // reach chain ×N in one drop
  asteroids: Object.freeze([1, 1, 1, 1, 1, 2, 2, 3]), // asteroids broken this sector
  chain: Object.freeze([100, 60, 120, 200, 250, 400, 600, 1000, 1500, 2000]), // points from one chain
});

/** The goal's target for a kind in a sector. */
export function bountyTarget(kind, sector) {
  const t = BOUNTY_TARGETS[kind];
  if (!t) return 1;
  const s = Math.max(1, Math.floor(sector) || 1);
  return t[Math.min(s, t.length) - 1];
}

/** Asteroid goals start here: asteroids only arrive with tide rows, so sectors 1-2 often have none to break. */
export const BOUNTY_ASTEROIDS_FROM = 3;

/**
 * Kind index for each sector 1..sector: one r.int(pool size) per sector from that sector's derived seed, over the
 * kinds (in BOUNTY_KINDS order) that are allowed there and differ from the previous sector's kind.
 */
function kindIndex(seed, sector) {
  let k = -1;
  for (let s = 1; s <= sector; s++) {
    const r = mulberry32(deriveSeed(seed >>> 0, 'bounty:' + s));
    const pool = [];
    for (let i = 0; i < BOUNTY_KINDS.length; i++) {
      if (i === k || (BOUNTY_KINDS[i] === 'asteroids' && s < BOUNTY_ASTEROIDS_FROM)) continue;
      pool.push(i);
    }
    k = pool[r.int(pool.length)];
  }
  return k;
}

/** The fresh bounty for a sector of a run: { s, kind, target, prog: 0, done: false }. */
export function bountyFor(seed, sector) {
  const s = Math.max(1, Math.floor(sector) || 1);
  const kind = BOUNTY_KINDS[kindIndex(seed, s)];
  return { s, kind, target: bountyTarget(kind, s), prog: 0, done: false };
}

/**
 * Feed one game signal to the bounty. Signals: 'tier' (a merge made this tier), 'combo' (a cascade step's combo),
 * 'asteroids' (asteroids gone: cracked open, or caught in a Supernova or a comet), 'chain' (points one resolution awarded). Returns true when this signal completed it.
 */
export function trackBounty(b, type, value) {
  if (!b || b.done || type !== b.kind) return false;
  const v = Math.floor(Number(value) || 0);
  if (type === 'asteroids') b.prog = Math.min(b.target, b.prog + Math.max(0, v));
  else b.prog = Math.max(b.prog, Math.min(b.target, Math.max(0, v)));
  if (b.prog >= b.target) { b.prog = b.target; b.done = true; return true; }
  return false;
}

/** Player-facing goal text, e.g. "Make a Gas Giant", "Chain ×3", "Break 2 asteroids", "300 in one chain". */
export function bountyText(b, skin) {
  if (!b) return '';
  switch (b.kind) {
    case 'tier': return `Make ${aTierName(b.target >= 1 && b.target <= 10 ? b.target : 8, skin)}`;
    case 'combo': return `Chain ×${b.target}`;
    case 'asteroids': return b.target === 1 ? 'Break an asteroid' : `Break ${b.target} asteroids`;
    case 'chain': return `${b.target.toLocaleString('en-US')} in one chain`;
    default: return '';
  }
}

/** Short HUD progress, e.g. "1/2" for counters; '' for one-shot goals. Done shows "✓". */
export function bountyProgress(b) {
  if (!b) return '';
  if (b.done) return '✓';
  return b.kind === 'asteroids' && b.target > 1 ? `${b.prog}/${b.target}` : '';
}

/** Coins for n completed bounties. */
export function bountyCoins(done) {
  return Math.max(0, Math.floor(Number(done) || 0)) * BOUNTY_COINS;
}

/** Game-over line, e.g. "Bounties 2/3 · +30 coins" (or "Bounties 0/2"); '' when the run had none. */
export function bountyLine(done, seen) {
  const d = Math.max(0, Math.floor(Number(done) || 0));
  const n = Math.max(0, Math.floor(Number(seen) || 0));
  if (n <= 0) return '';
  const c = bountyCoins(d);
  return c > 0 ? `Bounties ${d}/${n} · +${c.toLocaleString('en-US')} coins` : `Bounties ${d}/${n}`;
}

/**
 * Run bookkeeping (game.js, the fixture sim and C# GameSession do exactly this):
 *   start: run.bounty = bountyFor(seed, 1); run.bountiesDone = 0; run.bountiesSeen = 1
 *   each new sector: openSectorBounty(run)  (the old one is simply closed, done or not)
 * Never in Zen Drift (run.bounty stays null) or Journey.
 */
export function openSectorBounty(run) {
  run.bounty = bountyFor(run.seed, run.sector);
  run.bountiesSeen = (run.bountiesSeen || 0) + 1;
  return run.bounty;
}

/** Repair a resumed run's bounty fields (an older snapshot has none: fresh bounty for the current sector). */
export function sanitizeRunBounty(run) {
  if (!run || run.mode !== 'endless' || run.zen) { if (run) { delete run.bounty; delete run.bountiesDone; delete run.bountiesSeen; } return; }
  const fresh = bountyFor(run.seed, run.sector);
  const b = run.bounty;
  const ok = b && typeof b === 'object' && b.s === fresh.s && b.kind === fresh.kind && b.target === fresh.target
    && Number.isInteger(b.prog) && b.prog >= 0 && b.prog <= b.target && typeof b.done === 'boolean' && b.done === (b.prog >= b.target);
  run.bounty = ok ? { s: b.s, kind: b.kind, target: b.target, prog: b.prog, done: b.done } : fresh;
  const seen = Number.isInteger(run.bountiesSeen) ? run.bountiesSeen : 0;
  run.bountiesSeen = Math.max(1, Math.min(run.sector, seen));
  const done = Number.isInteger(run.bountiesDone) ? run.bountiesDone : 0;
  run.bountiesDone = Math.max(0, Math.min(run.bountiesSeen, done));
}
