// First-session pacing (UI only): what the first ten minutes show and when. Nothing here changes a
// rule, a reward, a price or an ad decision; it only decides which screens and lines a new player
// sees. Never reads ad state (DESIGN.md). Mirrored by Scripts/UI/Onboarding.cs.
import { storyDue } from './keepers.js';
import { COMBO_LOOKS, BOARD_LOOKS } from './looks.js';
import { playDayCount } from './playDays.js';
import { SEASON_LEVEL, SEASON_DAYS } from './seasonal.js';

/** Shop, Orbits and Keepers stay off the menu until Level 3 is cleared. */
export const MENU_EXTRAS_AFTER_LEVEL = 3;
/** Win cards stay light (stars, coins, streak, Play on) through this level. */
export const LIGHT_RESULT_THROUGH = 4;
/** Fail offers keep the coin and ad continues small, and hide "Get coins", through this level. */
export const GENTLE_FAIL_THROUGH = 10;

/** True once Level 3 is cleared (the next level is past it, or it has a star). */
export function menuExtrasOpen(save) {
  const j = (save && save.journey) || {};
  return (j.level || 1) > MENU_EXTRAS_AFTER_LEVEL || ((j.stars && j.stars[MENU_EXTRAS_AFTER_LEVEL]) || 0) > 0;
}

/** The menu keeper line ("Pip: ...") waits until a game is finished and Pip's chapter-0 story has been seen. */
export function menuKeeperLineOn(save) {
  const story = (save && save.keepers && save.keepers.story) || [];
  return ((save && save.runs) || 0) > 0 && story.includes(0);
}

/** The very first Play skips the level intro card and goes straight into Level 1. */
export function skipIntroOnPlay(save) {
  return ((save && save.runs) || 0) === 0;
}

/** Level n's win/fail card shows the full extras (journal, ad-break line, ×2 Coins row). */
export function fullResultCard(n) {
  return (Number(n) || 0) > LIGHT_RESULT_THROUGH;
}

/** Level n is in the gentle first stretch (no longer changes the fail offer: since UX_OPPORTUNITIES item 1 every level uses the quiet secondary row and no "Get coins" link). */
export function gentleFailOffer(n) {
  return (Number(n) || 0) <= GENTLE_FAIL_THROUGH;
}

/**
 * The chapter story to tell before starting level n, or -1. Same as keepers.storyDue, except Pip's
 * chapter-0 story waits for the first win (journey.level >= 2) instead of playing before Level 1.
 */
export function storyDueNow(save, n) {
  const ch = storyDue(save, n);
  if (ch === 0 && ((save.journey && save.journey.level) || 1) < 2) return -1;
  return ch;
}

/**
 * v3 unlock schedule (DESIGN.md "v3 home and flow"): the level that must be cleared before each part of Home
 * appears. Locked parts are hidden, never teased. Mirror in Scripts/UI/Onboarding.cs (Unity U3/U4).
 *   looks: Wardrobe icon at Level 5, landing together with the free Seaside Café look (firstSession LEVEL_GIFTS[5]),
 *          so it opens holding a gift, not empty (docs/UX_FEATURE_GATES.md finding 2)
 *   shop: Shop icon at Level 12, or earlier on the first visit where her coins reach the cheapest coin look
 *         (cheapestLookCost) once the Wardrobe is open, so it opens on something she can actually buy
 *   special: Today's Special (daily puzzle), also waits for her second play day (UNLOCK_DAYS)
 *   today: Today tasks (Daily Orbits)   freePlay: Free Play (Endless, Relaxed)
 *   journal: Journal   challenge: Challenge a friend   books: Puzzle Books
 * Nothing is ever taken away: a feature whose unlock moment she has already had (save.navSeen), and a Shop/Wardrobe
 * she met under the old Level 1 schedule (shopTour.banner / opened), stay open. C#: Scripts/Meta/HomeNav.cs.
 */
export const UNLOCKS = Object.freeze({ shop: 12, looks: 5, special: 8, today: 15, freePlay: 25, journal: 30, challenge: 40, books: 50 });

/** Extra gate: the feature also waits for this many distinct play days (playDays.n). */
export const UNLOCK_DAYS = Object.freeze({ special: 2 });

/** The cheapest coin-priced Looks item (board or combo look, never a pack look). Opens the Shop early once affordable. */
export function cheapestLookCost() {
  let min = Infinity;
  for (const l of [...COMBO_LOOKS, ...BOARD_LOOKS]) if (typeof l.cost === 'number' && l.cost > 0 && !l.pack && l.cost < min) min = l.cost;
  return min;
}

/** True once Level n is cleared (the next level is past it, or it has a star). */
export function levelCleared(save, n) {
  const j = (save && save.journey) || {};
  return (j.level || 1) > n || ((j.stars && j.stars[n]) || 0) > 0;
}

/** Is the Home feature `key` (a key of UNLOCKS) open for this save? Unknown keys stay closed. */
export function unlocked(save, key) {
  const n = UNLOCKS[key];
  if (typeof n !== 'number' || !save) return false;
  const seen = Array.isArray(save.navSeen) ? save.navSeen : [];
  if (seen.includes(key)) return true; // her unlock moment already came: never taken away
  const tour = save.shopTour && typeof save.shopTour === 'object' ? save.shopTour : {};
  const metShop = tour.banner === true || tour.opened === true; // met the Shop under the old Level 1 schedule
  if (key === 'shop' && metShop) return true;
  if (key === 'looks' && (metShop || seen.includes('shop'))) return true; // the old Shop card opened the Wardrobe too
  if (key === 'shop' && unlocked(save, 'looks') && typeof save.coins === 'number' && save.coins >= cheapestLookCost()) return true;
  if (!levelCleared(save, n)) return false;
  const days = UNLOCK_DAYS[key];
  return !(typeof days === 'number' && playDayCount(save) < days);
}

/**
 * Seasonal events are open for this save: Level SEASON_LEVEL cleared and SEASON_DAYS play days. A player who has
 * already taken part (tokens this season, a season card met, decorations earned) keeps it. C#: SeasonalView.Open.
 */
export function seasonOpen(save) {
  if (!save) return false;
  const s = save.seasonal && typeof save.seasonal === 'object' ? save.seasonal : {};
  if ((typeof s.n === 'number' && s.n > 0) || (typeof s.met === 'string' && s.met) || (Array.isArray(s.decor) && s.decor.length)) return true;
  return levelCleared(save, SEASON_LEVEL) && playDayCount(save) >= SEASON_DAYS;
}

/**
 * The Home icon row, in a fixed order so nothing jumps around as it grows: Today · Shop · Wardrobe · More.
 * Today and More are always there; Shop and Wardrobe arrive together (Level 1). Unlock moments: src/meta/homeNav.js.
 */
export function homeIcons(save) {
  const out = ['today'];
  if (unlocked(save, 'shop')) out.push('shop');
  if (unlocked(save, 'looks')) out.push('looks');
  out.push('more');
  return out;
}

/**
 * The one-time "The café has opened!" card for players who had a save before v3 (save.v3card, written once by
 * migrateV3). Due until it has been seen; brand-new players (v3card null) never get it.
 */
export function v3CardDue(save) {
  const c = save && save.v3card;
  return !!(c && typeof c === 'object' && c.seen !== true);
}
/** Mark the v3 card seen (the caller persists). Idempotent; a no-op without a card. */
export function markV3CardSeen(save) {
  if (save && save.v3card && typeof save.v3card === 'object') save.v3card.seen = true;
}
