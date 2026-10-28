// Café moments (DESIGN.md "Café moments"): light, optional Order tickets in the middle of an Endless run.
// Pure, no DOM. Mirrored bit-exactly by C# NovaDrop.Core.Moments (Scripts/Core/Moments.cs).
//
// Every so often a single café Order ticket opens ("Cupcake · 10 drops"). Unlike Journey Café Orders, nothing leaves
// the board: a merge that MAKES that piece fills the ticket and the piece stays where it is, so a ticket never cuts a
// chain short and never changes the board, the score or the run's length (the resolution runs on the run's own options).
// Serving it adds a few flat coins to the run payout; missing it costs nothing, the ticket simply goes away.
// At most one ticket at a time. Never in the Daily Challenge, Zen Drift or Journey; nothing reads ads.
//
// run.moments = { next, seen, done, open } (absent = no café moments in this run: daily, Zen, older snapshots)
//   next  drop count at which the next ticket opens (when none is open)
//   seen  tickets opened so far (the k-th ticket draws from deriveSeed(seed, 'moment:' + k))
//   done  tickets served
//   open  null, or { tier, left, until }: the piece wanted, how many still (always 1) and the drop count it lasts to
import { mulberry32, deriveSeed } from './rng.js';
import { maxSpawnTier, highestTier } from './board.js';

/** The first ticket opens after this many drops (the run has settled in by then). */
export const MOMENT_FIRST = 24;
/** Quiet drops between one ticket closing (served or not) and the next opening. */
export const MOMENT_GAP = 28;
/** Coins per served ticket (flat: no perk or upgrade multiplier). Added to the run's coins at game over. */
export const MOMENT_COINS = 10;
/** Tickets ask for a piece in this tier range. */
export const MOMENT_TIER_MIN = 4, MOMENT_TIER_MAX = 7;

/** Fresh bookkeeping for a run that has café moments. */
export function newMoments() {
  return { next: MOMENT_FIRST, seen: 0, done: 0, open: null };
}

/** Drops a ticket for this tier stays open: 8 / 10 / 12 / 14 for tiers 4 / 5 / 6 / 7. */
export function momentWindow(tier) {
  return 8 + 2 * (tier - MOMENT_TIER_MIN);
}

/**
 * The piece the k-th ticket (k = 1, 2, ...) asks for: one or two tiers above what the tide and the queue currently
 * spawn (maxSpawnTier + 1 + a coin flip), so it always takes a merge or two. Fair cap: never above the highest piece
 * already on the board (the player has made one before, so it is always within reach), and always within 4..7.
 * Its own derived stream; the spawn, tide and perk streams are never touched.
 */
export function momentTier(seed, k, board, gentle = 0) {
  const r = mulberry32(deriveSeed(seed >>> 0, 'moment:' + k));
  const lo = Math.max(MOMENT_TIER_MIN, maxSpawnTier(board, gentle) + 1);
  const cap = Math.max(MOMENT_TIER_MIN, Math.min(MOMENT_TIER_MAX, highestTier(board)));
  return Math.min(cap, lo + r.int(2));
}

/**
 * Board options for the next resolution. A café moment never changes them (no Orders rule in Endless: the piece
 * stays on the board), so this is always the run's own options; kept so callers read one place.
 */
export function momentOpts(m, base) {
  return base;
}

/** Drops the open ticket has left (0 when none is open). */
export function momentDropsLeft(m, drops) {
  return m && m.open ? Math.max(0, m.open.until - drops) : 0;
}

/**
 * After a resolution (drop, tide cascade or comet): count the merges that MADE the open ticket's piece (any step of the
 * chain; the piece stays on the board). Returns true when that served the ticket (it closes; the next one opens
 * MOMENT_GAP drops later).
 */
export function serveMoment(m, steps, drops) {
  if (!m || !m.open || !steps) return false;
  let n = 0;
  for (const st of steps) for (const mg of st.merges || []) if (mg.tier === m.open.tier) n++;
  if (!n) return false;
  m.open.left = Math.max(0, m.open.left - n);
  if (m.open.left > 0) return false;
  m.open = null;
  m.done++;
  m.next = drops + MOMENT_GAP;
  return true;
}

/**
 * Once per drop, after its cascade and the tide (before any new sector): an open ticket whose window ran out goes
 * away ('expired'); otherwise, when none is open and the gap is over, the next ticket opens ('opened'). Else null.
 */
export function tickMoment(m, seed, drops, board, gentle = 0) {
  if (!m) return null;
  if (m.open) {
    if (drops < m.open.until) return null;
    m.open = null;
    m.next = drops + MOMENT_GAP;
    return 'expired';
  }
  if (drops < m.next) return null;
  m.seen++;
  const tier = momentTier(seed, m.seen, board, gentle);
  m.open = { tier, left: 1, until: drops + momentWindow(tier) };
  return 'opened';
}

const isInt = (v) => Number.isInteger(v);

/**
 * Repair a resumed run's café moments (game.js restoreRun, C# FromSnapshot). Daily, Zen and Journey runs never have
 * them; a snapshot without the field (older builds) keeps playing without them, exactly as it was. A malformed ticket
 * is dropped (the next one opens after the gap).
 */
export function sanitizeRunMoments(run) {
  if (!run) return;
  const m = run.moments;
  if (run.mode !== 'endless' || run.daily || run.zen || !m || typeof m !== 'object' || Array.isArray(m)) { delete run.moments; return; }
  const drops = isInt(run.drops) && run.drops >= 0 ? run.drops : 0;
  const seen = isInt(m.seen) && m.seen >= 0 ? m.seen : 0;
  const done = isInt(m.done) && m.done >= 0 ? Math.min(seen, m.done) : 0;
  const o = m.open;
  const openOk = seen > 0 && o && typeof o === 'object' && isInt(o.tier) && o.tier >= MOMENT_TIER_MIN && o.tier <= MOMENT_TIER_MAX
    && o.left === 1 && isInt(o.until) && o.until >= drops && o.until <= drops + momentWindow(o.tier);
  const cap = Math.max(MOMENT_FIRST, drops + MOMENT_GAP);
  const next = isInt(m.next) && m.next >= 0 && m.next <= cap ? m.next : cap;
  run.moments = { next, seen, done, open: openOk ? { tier: o.tier, left: 1, until: o.until } : null };
}

/** Run result fields: { momentsDone, momentsSeen } (0 / 0 when the run had none). */
export function momentResult(run) {
  const m = run && run.moments;
  return m ? { momentsDone: m.done || 0, momentsSeen: m.seen || 0 } : { momentsDone: 0, momentsSeen: 0 };
}

/** Coins for n served tickets. */
export function momentCoins(done) {
  return Math.max(0, Math.floor(Number(done) || 0)) * MOMENT_COINS;
}

/** Game-over line, e.g. "Café orders 2/3 · +20 coins" (or "Café orders 0/1"); '' when the run had none. */
export function momentLine(done, seen) {
  const d = Math.max(0, Math.floor(Number(done) || 0));
  const n = Math.max(0, Math.floor(Number(seen) || 0));
  if (n <= 0) return '';
  const c = momentCoins(d);
  return c > 0 ? `Café orders ${d}/${n} · +${c.toLocaleString('en-US')} coins` : `Café orders ${d}/${n}`;
}
