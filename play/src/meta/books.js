// Nova Drop: Puzzle Books, the meta side (DESIGN.md "Puzzle Books", docs/UX_PUZZLE_BOOKS.md). C# port:
// Scripts/Core/Meta/Books.cs (fixtures: Tests/EditMode/Fixtures/books.json).
//
// - A book is 24 hand-made puzzles. The first `free` are free; the rest come with a one-time purchase of the book.
// - Books add puzzles only: solving one never gives café stars, coins, power-ups or Today credit, and never touches
//   Journey progress, scores or the ad director. There are no ads inside a book.
// - Purchase: `product` is a stub id for now (no store yet). grantBook() is what a real purchase or restore will call.
//
// Save shape (web): save.books = {
//   opened: bool,                       // the Puzzle Books screen has been opened once
//   owned: [bookId, ...],               // books bought (or restored)
//   solved: { bookId: [n, ...] },       // solved puzzle numbers, ascending
//   cur: { bookId: { n, cols, tries } },// the puzzle in progress: its drops so far (replayed on open) and tries
//   plate: [bookId, ...],               // bookplates: books with every puzzle solved, in the order finished
//   noted: [bookId, ...],               // "that's the 3 free puzzles" has been said for this book (once per book)
// }
import { TIDE_POOLS } from '../game/bookPuzzles.js';
import { withText, TEXT } from '../i18n/index.js';

export const BOOKS = [
  { id: 'tidepools', name: TEXT, product: 'book_tidepools', price: '$2.99', free: 3, puzzles: TIDE_POOLS },
].map((b) => withText(b, `book.${b.id}`)); // name: content text book.<id>.name

export const bookById = (id) => BOOKS.find((b) => b.id === id) || null;
export const puzzleOf = (id, n) => { const b = bookById(id); return (b && b.puzzles[n - 1]) || null; };

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const NAT_MAX = 1e9;
const nat = (v) => (Number.isInteger(v) && v > 0 ? Math.min(v, NAT_MAX) : 0);

export function defaultBooks() {
  return { opened: false, owned: [], solved: {}, cur: {}, plate: [], noted: [] };
}

/** Known book ids from a raw list, unique, in list order. */
function idList(raw, keep = () => true) {
  const out = [];
  for (const id of Array.isArray(raw) ? raw : []) {
    if (typeof id === 'string' && bookById(id) && keep(id) && !out.includes(id)) out.push(id);
  }
  return out;
}

/** Repair save.books in place (known books only, whole numbers in range, a bookplate only for a finished book). */
export function sanitizeBooks(s) {
  const raw = isObj(s.books) ? s.books : {};
  const owned = idList(raw.owned);
  const rs = isObj(raw.solved) ? raw.solved : {};
  const solved = {};
  for (const b of BOOKS) {
    if (!has(rs, b.id) || !Array.isArray(rs[b.id])) continue;
    const ns = [];
    for (const n of rs[b.id]) if (Number.isInteger(n) && n >= 1 && n <= b.puzzles.length && !ns.includes(n)) ns.push(n);
    ns.sort((x, y) => x - y);
    solved[b.id] = ns;
  }
  const rc = isObj(raw.cur) ? raw.cur : {};
  const cur = {};
  for (const b of BOOKS) {
    if (!has(rc, b.id) || !isObj(rc[b.id])) continue;
    const e = rc[b.id];
    if (!Number.isInteger(e.n) || e.n < 1 || e.n > b.puzzles.length) continue;
    const max = b.puzzles[e.n - 1].queue.length;
    const cols = [];
    for (const c of Array.isArray(e.cols) ? e.cols : []) {
      if (!Number.isInteger(c) || c < 0 || c > 4 || cols.length >= max) break;
      cols.push(c);
    }
    cur[b.id] = { n: e.n, cols, tries: nat(e.tries) };
  }
  const done = (id) => (solved[id] || []).length >= bookById(id).puzzles.length;
  const plate = idList(raw.plate, done);
  for (const b of BOOKS) if (done(b.id) && !plate.includes(b.id)) plate.push(b.id);
  s.books = { opened: raw.opened === true, owned, solved, cur, plate, noted: idList(raw.noted) };
  return s.books;
}

const books = (save) => (save && isObj(save.books) ? save.books : defaultBooks());

export const ownsBook = (save, id) => books(save).owned.includes(id);
export const solvedList = (save, id) => (books(save).solved && books(save).solved[id]) || [];
export const isSolved = (save, id, n) => solvedList(save, id).includes(n);
export const solvedCount = (save, id) => solvedList(save, id).length;

/** May puzzle n be played? The first `free` always; the rest once the book is owned. Never depends on ads. */
export function canPlay(save, id, n) {
  const b = bookById(id);
  if (!b || !Number.isInteger(n) || n < 1 || n > b.puzzles.length) return false;
  return n <= b.free || ownsBook(save, id);
}

/** The lowest unsolved puzzle the player may play, or 0 when there is none. */
export function nextPuzzle(save, id) {
  const b = bookById(id);
  if (!b) return 0;
  for (let n = 1; n <= b.puzzles.length; n++) if (!isSolved(save, id, n) && canPlay(save, id, n)) return n;
  return 0;
}

/** The puzzle in progress for the book, or null. */
export function bookCur(save, id) {
  const c = books(save).cur && books(save).cur[id];
  return c && canPlay(save, id, c.n) ? c : null;
}

/**
 * The book page's one main button:
 *   { kind:'start', n:1 }       nothing solved yet ("Play puzzle 1 · free")
 *   { kind:'carry', n }         a puzzle with drops in it ("Carry on: puzzle n")
 *   { kind:'play', n }          the next unsolved puzzle ("Play puzzle n")
 *   { kind:'buy' }              the free puzzles are solved and the book isn't owned
 *   { kind:'look' }             every puzzle is solved ("Look through the book")
 */
export function bookPrimary(save, id) {
  const b = bookById(id);
  if (!b) return { kind: 'look' };
  const c = bookCur(save, id);
  if (c && c.cols.length && !isSolved(save, id, c.n)) return { kind: 'carry', n: c.n };
  const n = nextPuzzle(save, id);
  if (n) return { kind: solvedCount(save, id) ? 'play' : 'start', n };
  if (!ownsBook(save, id)) return { kind: 'buy' };
  return { kind: 'look' };
}

/** Keep the puzzle in progress (its drops so far and tries) so leaving and coming back carries on. */
export function setBookCur(save, id, n, cols, tries = 0) {
  if (!canPlay(save, id, n)) return null;
  const s = isObj(save.books) ? save.books : (save.books = defaultBooks());
  s.cur = isObj(s.cur) ? s.cur : {};
  const max = bookById(id).puzzles[n - 1].queue.length;
  s.cur[id] = { n, cols: (cols || []).filter((c) => Number.isInteger(c) && c >= 0 && c <= 4).slice(0, max), tries: nat(tries) };
  return s.cur[id];
}

export function clearBookCur(save, id) {
  if (save && isObj(save.books) && isObj(save.books.cur)) delete save.books.cur[id];
}

/**
 * Stamp puzzle n as solved. Returns { first, freeDone, complete }:
 *   first     it wasn't solved before
 *   freeDone  this solve finished the free puzzles of a book the player doesn't own (said once per book)
 *   complete  this solve finished the whole book (its bookplate is added)
 * Changes save.books only: never stars, coins, power-ups, Today, Journey or scores.
 */
export function markSolved(save, id, n) {
  const out = { first: false, freeDone: false, complete: false };
  const b = bookById(id);
  if (!b || !canPlay(save, id, n)) return out;
  const s = isObj(save.books) ? save.books : (save.books = defaultBooks());
  s.solved = isObj(s.solved) ? s.solved : {};
  const list = Array.isArray(s.solved[id]) ? s.solved[id] : (s.solved[id] = []);
  if (!list.includes(n)) {
    out.first = true;
    list.push(n);
    list.sort((x, y) => x - y);
  }
  if (s.cur && s.cur[id] && s.cur[id].n === n) delete s.cur[id];
  let freeAll = true;
  for (let k = 1; k <= b.free; k++) if (!list.includes(k)) freeAll = false;
  s.noted = Array.isArray(s.noted) ? s.noted : [];
  if (out.first && freeAll && n <= b.free && !ownsBook(save, id) && !s.noted.includes(id)) {
    out.freeDone = true;
    s.noted.push(id);
  }
  s.plate = Array.isArray(s.plate) ? s.plate : [];
  if (list.length >= b.puzzles.length && !s.plate.includes(id)) {
    out.complete = true;
    s.plate.push(id);
  }
  return out;
}

/** The book is the player's (a purchase or restore). Stub for now: no store is wired (DESIGN.md "Puzzle Books"). */
export function grantBook(save, id) {
  if (!bookById(id)) return false;
  const s = isObj(save.books) ? save.books : (save.books = defaultBooks());
  if (!s.owned.includes(id)) s.owned.push(id);
  return true;
}

/** The book id a store product unlocks, or null. */
export const bookForProduct = (product) => (BOOKS.find((b) => b.product === product) || {}).id || null;

/** "7 of 24 solved". */
export function bookProgressText(save, id) {
  const b = bookById(id);
  return b ? `${solvedCount(save, id).toLocaleString('en-US')} of ${b.puzzles.length.toLocaleString('en-US')} solved` : '';
}
