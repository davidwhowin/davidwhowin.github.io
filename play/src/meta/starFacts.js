// Star Atlas curiosity (Wave E, research feature H): the next orb you have NOT made yet shows
// as a dark silhouette with "?", and making it for the first time reveals its name plus one
// real astronomy fact. Discovery comes only from play: no random rewards.
import { TIER_NAMES } from '../game/board.js';
import { tierNameN, aTierName, hasPackNames, pieceWord, currentSkin } from '../game/tierNames.js';
import { DISCOVERY_MIN_TIER } from './firstSession.js';

/** One short, accurate fact per tier name (index = tier, 1..10). */
export const TIER_FACTS = [
  '',
  'Space dust grains are about the size of smoke particles, yet planets grow from them.', // 1 Dust
  'Young planets may start as pebbles clumping together around a new star.',        // 2 Pebble
  'Most meteorites that reach Earth are rocks from the asteroid belt.',              // 3 Rock
  'Our Moon drifts about 3.8 cm farther from Earth every year.',                     // 4 Moon
  'Mercury is the fastest planet: it circles the Sun every 88 days.',                // 5 Planet
  "Saturn's rings are mostly water ice, and all four giant planets have rings.",     // 6 Ringed Planet
  "Jupiter's Great Red Spot is a storm wider than the whole Earth.",                 // 7 Gas Giant
  'The Sun holds about 99.8% of all the mass in the Solar System.',                  // 8 Star
  'Blue giants shine thousands of times brighter than the Sun.',                     // 9 Blue Giant
  'A single supernova can briefly outshine its entire galaxy.',                      // 10 Supernova
];

/** The lowest tier the player has never made (2..10), or null when all are found. */
export function nextUndiscovered(save) {
  const found = new Set(Array.isArray(save && save.discovered) ? save.discovered : []);
  for (let t = DISCOVERY_MIN_TIER; t <= 10; t++) if (!found.has(t)) return t;
  return null;
}

/** "Merge 2 Planets to find it" (names the known ingredient, never the mystery orb). */
export function silhouetteHint(tier, skin) {
  if (!TIER_NAMES[tier - 1]) return 'Keep merging to find it';
  return `Merge 2 ${tierNameN(tier - 1, 2, skin)} to find it`; // the orb skin's own names (display only)
}

const DISCOVERY_BLURB = {
  2: 'Your first merge!', 3: 'Getting solid.', 4: 'A whole moon!', 5: 'You built a world!',
  6: 'Look at those rings!', 7: 'A giant of gas.', 8: 'You lit a star!', 9: 'Blazing hot.',
  10: 'The biggest bang there is!',
};
// Pack skins (sushi, koi, cats): cheerful lines that never mention moons, worlds or stars.
const PACK_BLURB = {
  2: 'Your first merge!', 3: 'Getting bigger.', 4: 'A lovely find!', 5: 'Halfway up!',
  6: 'Look at that!', 7: 'A big one!', 8: 'A rare find!', 9: 'Almost the top!',
  10: 'The very top piece!',
};

// Seaside Café (v3 default skin): a short cheer and a warm one-line note per piece, café and harbour only.
export const SEASIDE_BLURB = {
  2: 'Fresh from the roaster!', 3: 'A bright little slice.', 4: 'A treasure from the tide.', 5: 'Time for a cuppa.',
  6: 'Sweet and golden.', 7: 'The pot is on!', 8: 'Blooming on the sill.', 9: 'A warm light by the water.',
  10: 'The harbour lighthouse!',
};
export const SEASIDE_FACTS = [
  '',
  'One sugar cube for the tea, and one for luck.',                      // 1 Sugar Cube
  'Roasted this morning, and the whole café smells of it.',            // 2 Coffee Bean
  'A slice of lemon brightens any cup.',                               // 3 Lemon Slice
  'Found on the morning walk, still shining from the tide.',           // 4 Seashell
  'The good china, saved for a quiet moment.',                         // 5 Teacup
  'Local honey, golden as the evening light.',                         // 6 Honey Jar
  'A full pot means there is time to sit and chat.',                   // 7 Teapot
  'Red geraniums: the brightest thing on the windowsill.',             // 8 Geranium Pot
  'The harbour lantern keeps the path home lit.',                      // 9 Harbour Lantern
  'The lighthouse has watched over the cove for a hundred years.',     // 10 Lighthouse
];

// Café Classics (the default look): a cheer and a warm note per treat, café words only.
export const CAFE_CLASSICS_BLURB = {
  2: 'Fresh from the oven!', 3: 'Sweet and juicy.', 4: 'A sprinkle of joy.', 5: 'Warm hands, happy heart.',
  6: 'Swirled with cinnamon.', 7: 'A slice for everyone.', 8: 'Cool, creamy, berry-bright.', 9: 'The kettle is singing!',
  10: 'Afternoon tea is served!',
};
export const CAFE_CLASSICS_FACTS = [
  '',
  'A little mint drop waits in a bowl by the till.',                   // 1 Mint Drop
  'Still warm, with chocolate chips in every bite.',                   // 2 Cookie
  'Picked this morning, sweet as summer.',                             // 3 Strawberry
  'Pink icing and rainbow sprinkles: a small celebration.',            // 4 Donut
  'Cocoa with marshmallows, the cosiest cup on the menu.',             // 5 Cocoa Mug
  'The whole café smells of cinnamon when these come out.',            // 6 Cinnamon Roll
  'A crimped crust and a dollop of cream on top.',                     // 7 Pumpkin Pie
  'Blended berries with a striped straw and a cloud of cream.',        // 8 Berry Smoothie
  'The old teal kettle has made a thousand pots of tea.',              // 9 Kettle
  'Three tiers of treats: the grandest thing in the café.',            // 10 Cake Stand
];

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
  if (tier >= 10) return `The top ${pieceWord(false, skin)}: nothing is bigger than ${aTierName(10, skin)}.`;
  return `Piece ${tier} of 10. Two ${tierNameN(tier, 2, skin)} together make ${aTierName(tier + 1, skin)}.`;
}
