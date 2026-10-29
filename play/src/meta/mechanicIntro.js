// One plain sentence that introduces a new Journey mechanic the first time it appears (DESIGN.md "Café Orders",
// "Sugar-glazed pieces", "Teapot deliveries", "Cookie tins"). Shown on the level intro card, on the one-time "New in the café" card
// (first level with the mechanic, paused, one "Got it") and as the in-game hint until the player has won a level with
// it, so "Next level" (which skips the intro card) still explains it. Copy from docs/UX_MECHANICS.md P7; keep it
// identical in Unity. The one-time card and first-occurrence lines use save.mechSeen (presentation flags only).
import { ORDERS_CHAPTER, GLAZE_CHAPTER, TEAPOT_CHAPTER, TIN_CHAPTER, getLevel } from '../game/levels.js';
import { CHAPTER_SIZE } from '../game/chapters.js';
import { tierName } from '../game/tierNames.js';

export const ORDERS_INTRO = "New: café orders! The ticket at the top shows a piece. Make that piece and it's served straight off the board.";
export const GLAZE_INTRO = "New: sugar glaze! A piece under white icing can't merge yet. Make any merge right next to it and the icing cracks off.";
// docs/UX_TINS.md T2: names the dots the player can see and says exactly which piece comes out (board.js tinTreat)
export const TIN_INTRO = 'New: cookie tins! Each merge right next to a tin takes off one dot. When the dots are gone, it opens into a free piece like the biggest one beside it.';
export const TEAPOT_INTRO ="New: teapot deliveries! Merge away the pieces below a teapot so it slides down. When it reaches the bottom row, it's delivered.";

/** The sentence for each mechanic (goal-chip "re-read the rule" toasts use the same words). */
export const MECHANIC_TEXT = Object.freeze({ orders: ORDERS_INTRO, glaze: GLAZE_INTRO, teapot: TEAPOT_INTRO, tin: TIN_INTRO });

/** Second cup note (docs/UX_MECHANICS.md P4); the extra line shows only the first time ever. */
export const SECOND_CUP_NOTE = 'Lovely chain! Second cup: +1 drop';
export const SECOND_CUP_FIRST = 'Chains of 4 or more give you a free drop.';

/** The Seagull (Comet under the Cosmic look) can't take a teapot: a reassuring toast, nothing is spent (P3). */
export function teapotRefusal(look) {
  const b = look === 'cosmic' ? 'comet' : 'seagull';
  return `The ${b} can't lift a teapot. Your ${b} wasn't used. Clear the pieces under the teapot instead.`;
}

const ORDERS_FROM = (ORDERS_CHAPTER - 1) * CHAPTER_SIZE + 1;
const GLAZE_FROM = (GLAZE_CHAPTER - 1) * CHAPTER_SIZE + 1;
const TEAPOT_FROM = (TEAPOT_CHAPTER - 1) * CHAPTER_SIZE + 1;
const TIN_FROM = (TIN_CHAPTER - 1) * CHAPTER_SIZE + 1;

const isGlazed = (lv) => !!(lv.prefill && lv.prefill.some((row) => row.some((x) => typeof x === 'string' && x[0] === 'Z')));
/** True when Journey level lv starts with a cookie tin (prefill token 'K'). */
export const hasTins = (lv) => !!(lv && lv.prefill && lv.prefill.some((row) => row.some((x) => x === 'K')));
const wonSince = (stars, from, n) => {
  for (const k of Object.keys(stars || {})) { const i = Number(k); if (i >= from && i <= n && stars[k] > 0) return true; }
  return false;
};

/** Which mechanic Journey level lv still introduces: 'tin' | 'teapot' | 'glaze' | 'orders' | '' (stars: save.journey.stars).
 * Newest mechanic first: cookie tins, then teapots, then glaze, then orders. */
export function mechanicKind(lv, stars) {
  if (!lv || lv.daily) return '';
  if (lv.n >= TIN_FROM && hasTins(lv) && !wonSince(stars, TIN_FROM, lv.n)) return 'tin';
  if (lv.n >= TEAPOT_FROM && lv.goals.some((g) => g.type === 'teapot') && !wonSince(stars, TEAPOT_FROM, lv.n)) return 'teapot';
  if (lv.n >= GLAZE_FROM && isGlazed(lv) && !wonSince(stars, GLAZE_FROM, lv.n)) return 'glaze';
  if (lv.n >= ORDERS_FROM && lv.goals.some((g) => g.type === 'order') && !wonSince(stars, ORDERS_FROM, lv.n)) return 'orders';
  return '';
}

/** The intro sentence for Journey level lv, or ''. */
export function mechanicIntro(lv, stars) {
  const k = mechanicKind(lv, stars);
  return k ? MECHANIC_TEXT[k] : '';
}

/** Glaze levels have no goal chip of their own: the first GLAZE_CHIP_LEVELS glazed levels get a small "Glaze ?" info
 * chip on the goals row (tap to re-read the rule). */
export const GLAZE_CHIP_LEVELS = 3;
export function glazeInfoChip(lv) {
  if (!lv || lv.daily || !isGlazed(lv) || lv.n < GLAZE_FROM) return false;
  let count = 0;
  for (let n = GLAZE_FROM; n <= lv.n; n++) {
    if (isGlazed(n === lv.n ? lv : getLevel(n))) count++;
    if (count > GLAZE_CHIP_LEVELS) return false;
  }
  return true;
}

/** Tins are never a goal either: the first TIN_CHIP_LEVELS tin levels get a small "Tin ?" info chip on the goals row
 * (tap to re-read the rule; docs/UX_TINS.md T3). */
export const TIN_CHIP_LEVELS = 3;
export function tinInfoChip(lv) {
  if (!lv || lv.daily || !hasTins(lv) || lv.n < TIN_FROM) return false;
  let count = 0;
  for (let n = TIN_FROM; n <= lv.n; n++) {
    if (hasTins(n === lv.n ? lv : getLevel(n))) count++;
    if (count > TIN_CHIP_LEVELS) return false;
  }
  return true;
}

/** The floating line when a tin opens: says which piece came out, in the player's skin (docs/UX_TINS.md T4). */
export const tinTreatText = (tier, skin) => `A treat: ${tierName(tier, skin)}!`;
