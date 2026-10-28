// Nova Drop: Puzzle Books content (DESIGN.md "Puzzle Books"). Hand-made, fixed puzzles: a starting board, a fixed
// piece order and one goal. Every puzzle is proven solvable by tests/books.test.mjs (solvePuzzle), and its hint column
// leads to a position that can still be solved. The C# copy (Scripts/Core/BookPuzzles.cs) is written from this file by
// tools/write-books-cs.mjs; the parity fixture (books.json) checks they match.
//
// Encoding: rows = the bottom rows of the board, top->bottom ('.' empty, '1'-'9' a piece of that tier, 'A' a stone
// that needs two knocks, 'a' one knock); queue = the pieces in order, one digit each; goal = one Journey goal
// ({ type:'tier', tier, count } | { type:'asteroids', count } | { type:'combo', count }); hint.col = a good first drop.
//
// Curve (random-column win rate from tests/books.test.mjs, a rough "how forgiving" measure; a person does better):
// 1-3 about 90-100% (lovely and easy), 4-20 a varied middle, 21-24 the satisfying ones (about 10-20% by chance).

import { withText, TEXT } from '../i18n/index.js'; // stamp names are content text (display only)

const T = (tier, count) => ({ type: 'tier', tier, count });
const S = (count) => ({ type: 'asteroids', count });
const K = (count) => ({ type: 'combo', count });

export const TIDE_POOLS = [
  { n: 1, stamp: TEXT, rows: ['1...1'], queue: '112112112112', goal: T(3, 1), hint: { col: 1 } },
  { n: 2, stamp: TEXT, rows: ['.2.2.'], queue: '121212121212', goal: T(3, 2), hint: { col: 2 } },
  { n: 3, stamp: TEXT, rows: ['a1a2a'], queue: '121212121212', goal: S(3), hint: { col: 2 } },
  { n: 4, stamp: TEXT, rows: ['..4..', '.232.'], queue: '1122113322113', goal: T(4, 1), hint: { col: 4 } },
  { n: 5, stamp: TEXT, rows: ['2...2', '1A.A1'], queue: '1212121212121212', goal: S(2), hint: { col: 2 } },
  { n: 6, stamp: TEXT, rows: ['..2..', '..3..', '.414.'], queue: '21121212121212', goal: K(3), hint: { col: 4 } },
  { n: 7, stamp: TEXT, rows: ['3.4.3'], queue: '112233112233', goal: T(5, 1), hint: { col: 1 } },
  { n: 8, stamp: TEXT, rows: ['A...A', 'AA.AA'], queue: '112211221122112211', goal: S(4), hint: { col: 3 } },
  { n: 9, stamp: TEXT, rows: ['.3.3.', '2121.'], queue: '112233112233', goal: T(4, 3), hint: { col: 4 } },
  { n: 10, stamp: TEXT, rows: ['..1..', '..2..', '.3A3.', '4AAA4'], queue: '1213121312131213', goal: S(3), hint: { col: 4 } },
  { n: 11, stamp: TEXT, rows: ['4...4', '3.5.3', '2.3.2'], queue: '1212121212121', goal: T(6, 1), hint: { col: 1 } },
  { n: 12, stamp: TEXT, rows: ['.2.2.', '.3.3.', '41414'], queue: '12121212121212', goal: K(3), hint: { col: 1 } },
  { n: 13, stamp: TEXT, rows: ['1.2.1', 'A3A3A'], queue: '1122112233112211', goal: S(3), hint: { col: 3 } },
  { n: 14, stamp: TEXT, rows: ['5...5', '4.2.4', '313.3'], queue: '22112211221122', goal: T(6, 1), hint: { col: 2 } },
  { n: 15, stamp: TEXT, rows: ['..A..', '.aAa.', 'a1A2a'], queue: '12121212121212', goal: S(7), hint: { col: 1 } },
  { n: 16, stamp: TEXT, rows: ['.1.2.', '.3.4.', '25352'], queue: '12312312312312312', goal: K(4), hint: { col: 2 } },
  { n: 17, stamp: TEXT, rows: ['3.2.3', '2.1.2', '1.4.1'], queue: '1231231231231', goal: T(5, 2), hint: { col: 3 } },
  { n: 18, stamp: TEXT, rows: ['A...A', '2A.A2', 'AA1AA'], queue: '1212121212121212121212', goal: S(8), hint: { col: 2 } },
  { n: 19, stamp: TEXT, rows: ['.4.4.', '.3.3.', '52525'], queue: '212121212121', goal: T(6, 1), hint: { col: 0 } },
  { n: 20, stamp: TEXT, rows: ['1.2.1', '24342'], queue: '11221133112211', goal: K(4), hint: { col: 2 } },
  { n: 21, stamp: TEXT, rows: ['6...6', '5.A.5', '4AAA4'], queue: '11223344112233', goal: T(7, 1), hint: { col: 4 } },
  { n: 22, stamp: TEXT, rows: ['A2A2A', 'A1A1A', '3A4A3'], queue: '121212121212121', goal: S(7), hint: { col: 2 } },
  { n: 23, stamp: TEXT, rows: ['..5..', '.464.', '53135'], queue: '1212121212121212121212121', goal: K(5), hint: { col: 1 } },
  { n: 24, stamp: TEXT, rows: ['7...7', '6.a.6', '5aAa5'], queue: '1122334455112233', goal: T(8, 1), hint: { col: 3 } },
].map((p) => withText(p, `book.tidepools.puzzle.${p.n}`)); // stamp: content text book.tidepools.puzzle.<n>.stamp
