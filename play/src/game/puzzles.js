// Nova Drop: Puzzle Books engine (DESIGN.md "Puzzle Books"). Pure rules, no DOM, no RNG in play.
// A book puzzle is a fixed starting board, a fixed piece order and one goal. Every drop is a normal board.js drop;
// progress uses the Journey goal rules (levels.js applyProgress / goalsMet). Nothing here reads ad state, scores,
// stars, coins or boosters. Bit-exact C# port: Scripts/Core/Puzzles.cs.
import { ROWS, COLS, boardFromRows, dropOrb, isBoardFull, boardSignature, landingRow } from './board.js';
import { newProgress, applyProgress, goalsMet } from './levels.js';
import { mulberry32 } from './rng.js';

/** Board tokens of a puzzle: p.rows are the bottom rows (top->bottom strings, '.' empty, '1'-'9' tier, 'A' stone
 * with 2 knocks left, 'a' with 1), padded on top to the full 7 rows. */
export function puzzleRows(p) {
  const rows = [];
  const given = (p.rows || []).map((s) => s.split(''));
  for (let i = 0; i < ROWS - given.length; i++) rows.push(Array(COLS).fill('.'));
  for (const r of given) rows.push(r.map((t) => (t === '.' || t === 'A' || t === 'a' ? t : Number(t))));
  return rows;
}

/** The piece order as tiers. */
export const puzzleQueue = (p) => p.queue.split('').map(Number);

/** A level-shaped object for the goal helpers (goalText, applyProgress, goalsMet). */
export function puzzleLevel(p) {
  return { n: p.n, kind: 'normal', goals: [{ ...p.goal }], drops: p.queue.length, tide: null, seed: 0, book: true };
}

export function newPuzzleRun(p) {
  const level = puzzleLevel(p);
  return { level, board: boardFromRows(puzzleRows(p)), prog: newProgress(level), used: 0, cols: [], won: false, out: false };
}

/** Pieces left to drop. */
export const puzzleLeft = (p, run) => Math.max(0, p.queue.length - run.used);

/** The next k pieces (the current one first). */
export function puzzleNext(p, run, k = 3) {
  return puzzleQueue(p).slice(run.used, run.used + k);
}

/** Drop the current piece into col. Returns the board.js result (ok:false when the drop can't happen). */
export function puzzleDrop(p, run, col) {
  if (run.won || run.out || run.used >= p.queue.length) return { ok: false };
  const tier = Number(p.queue[run.used]);
  const res = dropOrb(run.board, col, { tier, golden: false, wild: false }, null);
  if (!res.ok) return res;
  run.used++;
  run.cols.push(col);
  applyProgress(run.level, run.prog, res, 0);
  run.won = goalsMet(run.level, run.prog);
  run.out = !run.won && (run.used >= p.queue.length || isBoardFull(run.board));
  return res;
}

/** Replay a list of columns from the start (undo, carry on, saved position). Stops at the first drop that can't happen. */
export function puzzleReplay(p, cols) {
  const run = newPuzzleRun(p);
  for (const c of cols || []) {
    if (!Number.isInteger(c) || !puzzleDrop(p, run, c).ok) break;
  }
  return run;
}

/** Undo the last drop: the same position replayed without it. */
export const puzzleUndo = (p, run) => puzzleReplay(p, run.cols.slice(0, -1));

/** Columns a drop can go into right now. */
export function openCols(b) {
  const out = [];
  for (let c = 0; c < b.cols; c++) if (landingRow(b, c) >= 0) out.push(c);
  return out;
}

/**
 * Depth-first solver (tests and tools): the first winning column list in column order 0..4, or null. `from`: columns
 * already played (the answer starts with them).
 * Positions already shown to fail are remembered by board + pieces used + progress.
 */
export function solvePuzzle(p, { maxNodes = 2000000, from = [] } = {}) {
  const dead = new Set();
  let nodes = 0;
  const walk = (cols) => {
    if (++nodes > maxNodes) return null;
    const run = puzzleReplay(p, cols);
    if (run.won) return cols;
    if (run.out) return null;
    const k = boardSignature(run.board) + '|' + run.used + '|' + run.prog.join(',');
    if (dead.has(k)) return null;
    for (const c of openCols(run.board)) {
      const r = walk([...cols, c]);
      if (r) return r;
    }
    dead.add(k);
    return null;
  };
  return walk(from.slice());
}

/** How many of `trials` games with seeded random columns win (tests: how gentle a puzzle is). */
export function randomWins(p, trials = 500, seed = 1) {
  const rng = mulberry32(seed);
  let wins = 0;
  for (let t = 0; t < trials; t++) {
    const run = newPuzzleRun(p);
    while (!run.won && !run.out) {
      const open = openCols(run.board);
      puzzleDrop(p, run, open[Math.floor(rng() * open.length)]);
    }
    if (run.won) wins++;
  }
  return wins;
}
