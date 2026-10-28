// "Next fits here" (Comfort setting `settings.nextHint`, default off): PRESENTATION ONLY.
// For the NEXT piece, the landing cells (on the board as it is right now) where it would join a merge.
// Read-only: built on previewDrop, so it never mutates the board, allocates ids or touches an RNG,
// and it follows the same rules as the aim ghost (Wild tier, Steady Start jokers, Constellation Bonds).
import { previewDrop } from './board.js';

/** [{ row, col, tier }] for every column where `spec` would merge on landing (left to right). */
export function nextFitCells(board, spec, opts) {
  if (!board || !spec) return [];
  const out = [];
  for (let c = 0; c < board.cols; c++) {
    const p = previewDrop(board, c, spec, opts);
    if (p && p.merge.length) out.push({ row: p.row, col: c, tier: p.tier });
  }
  return out;
}
