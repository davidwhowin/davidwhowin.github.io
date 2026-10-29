// Star Atlas curiosity (Wave E, research feature H): the next orb you have NOT made yet shows
// as a dark silhouette with "?", and making it for the first time reveals its name plus one
// real astronomy fact. Discovery comes only from play: no random rewards.
import { TIER_NAMES } from '../game/board.js';
import { tierNameN, aTierName, hasPackNames, pieceWord, pieceGender, tierGender, currentSkin } from '../game/tierNames.js';
import { t, withText, TEXT } from '../i18n/index.js'; // cheers and notes: content blurb.<set>.<tier> / fact.<set>.<tier>; lines: UI discover.*
import { DISCOVERY_MIN_TIER } from './firstSession.js';

/** One short, accurate fact per tier name (index = tier, 1..10). */
export const TIER_FACTS = withText(['', TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT], 'fact.cosmic');

/** The lowest tier the player has never made (2..10), or null when all are found. */
export function nextUndiscovered(save) {
  const found = new Set(Array.isArray(save && save.discovered) ? save.discovered : []);
  for (let t = DISCOVERY_MIN_TIER; t <= 10; t++) if (!found.has(t)) return t;
  return null;
}

/** "Merge 2 Planets to find it" (names the known ingredient, never the mystery orb). */
export function silhouetteHint(tier, skin) {
  if (!TIER_NAMES[tier - 1]) return t('discover.hintNone');
  return t('discover.hint', { names: tierNameN(tier - 1, 2, skin), gender: tierGender(tier - 1, skin) }); // the orb skin's own names (display only)
}

const DISCOVERY_BLURB = withText({ 2: TEXT, 3: TEXT, 4: TEXT, 5: TEXT, 6: TEXT, 7: TEXT, 8: TEXT, 9: TEXT, 10: TEXT }, 'blurb.cosmic');
// Pack skins (sushi, koi, cats): cheerful lines that never mention moons, worlds or stars.
const PACK_BLURB = withText({ 2: TEXT, 3: TEXT, 4: TEXT, 5: TEXT, 6: TEXT, 7: TEXT, 8: TEXT, 9: TEXT, 10: TEXT }, 'blurb.pack');

// Seaside Café (v3 default skin): a short cheer and a warm one-line note per piece, café and harbour only.
export const SEASIDE_BLURB = withText({ 2: TEXT, 3: TEXT, 4: TEXT, 5: TEXT, 6: TEXT, 7: TEXT, 8: TEXT, 9: TEXT, 10: TEXT }, 'blurb.seaside');
export const SEASIDE_FACTS = withText(['', TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT], 'fact.seaside');

// Café Classics (the default look): a cheer and a warm note per treat, café words only.
export const CAFE_CLASSICS_BLURB = withText({ 2: TEXT, 3: TEXT, 4: TEXT, 5: TEXT, 6: TEXT, 7: TEXT, 8: TEXT, 9: TEXT, 10: TEXT }, 'blurb.cafeclassics');
export const CAFE_CLASSICS_FACTS = withText(['', TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT], 'fact.cafeclassics');

// Seaside Café and Simple Circles ('basic', which shows the café names) share the café blurbs and notes.
const isCafe = (skin = currentSkin()) => skin === 'seaside' || skin === 'basic';

/** The discovery card's short cheer under the name. */
export const discoveryBlurb = (tier, skin = currentSkin()) =>
  (skin === 'cafeclassics' ? CAFE_CLASSICS_BLURB : isCafe(skin) ? SEASIDE_BLURB : hasPackNames(skin) ? PACK_BLURB : DISCOVERY_BLURB)[tier] || '';

/**
 * The discovery card's one-liner under the name. The astronomy facts belong to the cosmic orbs; a pack skin
 * (sushi, koi, cats) gets a plain line about its own pieces instead of a fact about planets.
 */
export function discoveryFact(tier, skin = currentSkin()) {
  if (skin === 'cafeclassics') return CAFE_CLASSICS_FACTS[tier] || '';
  if (isCafe(skin)) return SEASIDE_FACTS[tier] || '';
  if (!hasPackNames(skin)) return TIER_FACTS[tier] || '';
  if (tier >= 10) return t('discover.packTop', { piece: pieceWord(false, skin), aName: aTierName(10, skin), gender: pieceGender(skin) });
  return t('discover.packStep', { n: tier, names: tierNameN(tier, 2, skin), aName: aTierName(tier + 1, skin), gender: tierGender(tier, skin) });
}
