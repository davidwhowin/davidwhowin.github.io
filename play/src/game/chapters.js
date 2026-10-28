// Chapters (v3, "Nova's Seaside Café"): Journey levels grouped 20 to a chapter, one café area
// per chapter. Pure data + helpers (no DOM); presentation only, never rules, and nothing here
// touches the game RNG. levels.js may read focusGoal by chapter number, so getLevel(n) stays a
// pure function of n.
//
// - CHAPTER_SIZE = 20; chapters are 1-based: levels 1–20 are chapter 1, 21–40 chapter 2, ...
// - CHAPTERS[c - 1] = { name, areaId, theme: { backdropVariant, focusGoal }, packTie } for
//   c = 1..CHAPTER_COUNT (levels 1–1000).
//   - areaId: the café area that chapter's stars restore (src/meta/cafeData.js). Book 1 "The
//     Café" = chapters 1–6, Book 2 "The Harbour" = 7–12. Chapters 13+ use Book 3+ ids that the
//     café may leave unbuilt for now ("the harbour crew is still building").
//   - backdropVariant: the tint/prop variant of the `harbour` backdrop, rotating by chapter.
//   - focusGoal: the goal type a generated chapter leans on, rotating through the goal types
//     the level generator already uses (levels.js). Levels 1–150 are unchanged by it.
//   - packTie: an optional look pack id shown once as a chip on the map header, or null.
//
// This replaces backdrops.js CHAPTER_LEVELS (10) once W5 rewires its users.
import { withText, TEXT, t, tp } from '../i18n/index.js'; // chapter names are content text (docs/LOCALISATION.md, phase 3)
// Re-exported for levels.js (hand-made tips), whose imports stay within src/game (tests/levels.test.mjs static scan).
export { withText, TEXT, t, tp }; // for levels.js (hand-made tips, goal text), so its imports stay in src/game

export const CHAPTER_SIZE = 20;
export const MAX_LEVEL = 1000;
export const CHAPTER_COUNT = MAX_LEVEL / CHAPTER_SIZE; // 50

export const BACKDROP_VARIANTS = ['sunrise', 'noon', 'rain', 'golden', 'dusk', 'starry'];
// The goal types genCandidate (levels.js) draws from. 'supernova' also exists as a goal type
// but the generator never picks it, so it is not a chapter focus.
export const FOCUS_GOALS = ['tier', 'asteroids', 'score', 'combo'];

// Café area ids, in chapter order. The display name is content text: chapter.<areaId>.name (src/i18n/content/en.js).
const AREAS = [
  // Book 1 "The Café"
  'terrace',
  'counter',
  'kitchen',
  'garden',
  'pier',
  'rooftop',
  // Book 2 "The Harbour"
  'boathouse',
  'flowerStall',
  'beachHuts',
  'lighthouse',
  'bandstand',
  'ferryDock',
  // Book 3+ "The Village" and beyond (café content for these may not exist yet)
  'bakery',
  'bookshop',
  'villageGreen',
  'chapel',
  'market',
  'postOffice',
  'orchard',
  'mill',
  'bridge',
  'pond',
  'schoolhouse',
  'tearoom',
  'clifftop',
  'cove',
  'rockPools',
  'boatyard',
  'fishmonger',
  'icecream',
  'promenade',
  'pavilion',
  'carousel',
  'arcade',
  'harbourInn',
  'quay',
  'lifeboat',
  'windmill',
  'dairy',
  'vineyard',
  'meadow',
  'woodland',
  'observatoryHill',
  'island',
  'ferry',
  'islandCafe',
  'festival',
  'station',
  'seaWall',
  'homecoming',
];

// Optional "matching look" pack chips (map only). The Stargazing Deck ties to the Cosmic pack.
const PACK_TIES = { 6: 'cosmic' };

export const CHAPTERS = AREAS.map((areaId, i) => Object.freeze(withText({
  name: TEXT,
  areaId,
  theme: Object.freeze({
    backdropVariant: BACKDROP_VARIANTS[i % BACKDROP_VARIANTS.length],
    focusGoal: FOCUS_GOALS[i % FOCUS_GOALS.length],
  }),
  packTie: PACK_TIES[i + 1] || null,
}, `chapter.${areaId}`)));
Object.freeze(CHAPTERS);

/** 1-based chapter of Journey level n (n < 1 counts as level 1). */
export function chapterOf(n) {
  return Math.floor((Math.max(1, Math.floor(n)) - 1) / CHAPTER_SIZE) + 1;
}

/** Inclusive level range of 1-based chapter c. */
export function chapterRange(c) {
  const from = (Math.max(1, Math.floor(c)) - 1) * CHAPTER_SIZE + 1;
  return { from, to: from + CHAPTER_SIZE - 1 };
}

/** CHAPTERS entry for 1-based chapter c, or null past the last chapter. */
export function chapterInfo(c) {
  return CHAPTERS[Math.floor(c) - 1] || null;
}
