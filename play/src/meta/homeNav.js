// Home navigation and unlock moments (DESIGN.md "v3 home and flow", "Unlock moments"). UI pacing only: nothing here
// changes a rule, a reward, a price or an ad decision, and it never reads ad state.
//
// - The Home icon row grows as things unlock, in a fixed order so nothing ever jumps around:
//     Today · Shop · Wardrobe · More   (Wardrobe at Level 5, Shop at Level 12 or once a coin look is affordable)
//   Locked buttons are hidden, never teased. Nothing a new player needs lives behind More.
// - Each unlock gets one "unlock moment" on Home, once: a short card saying what it is and where it lives, and a
//   gentle highlight on the button it lives under (still with Calm or reduced motion).
// - save.navSeen: the unlock keys whose moment has been shown. Older saves are seeded with what they already had,
//   so a returning player never gets a pile of cards.
// Mirror in Unity (U4): Scripts/UI/Onboarding.cs + Scripts/Meta save field `navSeen`.
import { unlocked, levelCleared } from './onboarding.js';
import { t } from '../i18n/index.js'; // pure lookup (docs/LOCALISATION.md phase 4)

/**
 * Unlock moments, in the order they can come. `at`: the Home button(s) to highlight. `open`: what "Show me" opens
 * ('shop' | 'looks' | 'today' | 'more'). `row`: the row to highlight inside the Today or More sheet.
 * `title` / `text` may be functions of the cozy word lookup (copy.js word) so names follow the player's look.
 */
export const NAV_MOMENTS = Object.freeze([
  // Level 5: the Wardrobe arrives holding the free Seaside Café look (docs/UX_FEATURE_GATES.md finding 2)
  { key: 'looks', at: ['looks'], open: 'looks',
    title: () => t('nav.looks.title'), text: () => t('nav.looks.text'), go: () => t('nav.go.show') },
  // Level 8 and her second play day
  { key: 'special', at: ['today'], open: 'today', row: 'special',
    title: (w) => t('nav.new', { name: w('dailyPuzzle') }), text: () => t('nav.special.text'), go: () => t('nav.go.show') },
  // Level 12, or earlier once a coin look is affordable; its own card on its own day (one feature card per day)
  { key: 'shop', at: ['shop'], open: 'shop',
    title: () => t('nav.shop.title'), text: () => t('nav.shop.text'), go: () => t('nav.go.look') },
  { key: 'today', at: ['today'], open: 'today', row: 'orbits',
    title: () => t('nav.today.title'), text: () => t('nav.today.text'), go: () => t('nav.go.show') },
  { key: 'freePlay', at: ['more'], open: 'more', row: 'freeplay',
    title: (w) => t('nav.new', { name: w('freePlay') }), text: () => t('nav.freePlay.text'), go: () => t('nav.go.show') },
  { key: 'journal', at: ['more'], open: 'more', row: 'journal',
    title: () => t('nav.journal.title'), text: () => t('nav.journal.text'), go: () => t('nav.go.show') },
  { key: 'challenge', at: ['more'], open: 'more', row: 'friend',
    title: () => t('nav.challenge.title'), text: () => t('nav.challenge.text'), go: () => t('nav.go.show') },
  { key: 'books', at: ['more'], open: 'more', row: 'books',
    title: () => t('nav.books.title'), text: () => t('nav.books.text'), go: () => t('nav.go.show') },
]);

export const NAV_KEYS = Object.freeze(NAV_MOMENTS.map((m) => m.key));

/** Save repair + migration. `raw` is the stored data: a save without the field is seeded with what it already had. */
export function sanitizeNavSeen(save, raw) {
  const had = raw && typeof raw === 'object' && Array.isArray(raw.navSeen);
  if (had) {
    save.navSeen = [...new Set(raw.navSeen.filter((k) => NAV_KEYS.includes(k)))];
    return save.navSeen;
  }
  const seen = [];
  const t = save.shopTour || {};
  for (const k of NAV_KEYS) {
    if (!unlocked(save, k)) continue;
    if (k === 'shop' && t.banner !== true) continue; // the Shop card is still to come
    if (k === 'looks' && (t.banner !== true || !levelCleared(save, 3))) continue; // the Wardrobe button is new to them
    seen.push(k);
  }
  save.navSeen = seen;
  return seen;
}

const seenList = (save) => (Array.isArray(save.navSeen) ? save.navSeen : (save.navSeen = []));

/** The next unlock moment to show on Home, or null. One at a time, oldest first. */
export function nextUnlockMoment(save) {
  const seen = seenList(save);
  for (const m of NAV_MOMENTS) {
    if (seen.includes(m.key) || !unlocked(save, m.key)) continue;
    if (m.key === 'shop' && save.shopTour && save.shopTour.banner === true) continue; // already had the Shop card
    return m;
  }
  return null;
}

/** Mark a moment shown (and anything it covers). The caller persists. Idempotent. */
export function markUnlockSeen(save, key) {
  const seen = seenList(save);
  const m = NAV_MOMENTS.find((x) => x.key === key);
  for (const k of [key, ...((m && m.covers) || [])]) if (NAV_KEYS.includes(k) && !seen.includes(k)) seen.push(k);
  if (key === 'shop' && save.shopTour && typeof save.shopTour === 'object') save.shopTour.banner = true;
}

/** Resolve a moment's title / text with the cozy word lookup. */
export function momentCopy(m, word) {
  const w = typeof word === 'function' ? word : (k) => k;
  return {
    title: typeof m.title === 'function' ? m.title(w) : m.title,
    text: typeof m.text === 'function' ? m.text(w) : m.text,
    go: typeof m.go === 'function' ? m.go(w) : m.go,
  };
}
