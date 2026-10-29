// Skin-aware tier names for display (merge popup, discovery card, goals, Orbits, bounties, tips).
// DISPLAY ONLY: rules, saves and the C# Core keep using tier numbers (and TIER_NAMES in board.js stays the
// cosmic ladder). With a premium pack skin on (Sushi Bar, Koi Pond, Cat Café, Patisserie, Deep Sea, Cottage Garden, and the v3 default Seaside Café) the player sees that pack's own
// piece names, e.g. "Tuna nigiri" instead of "Ringed Planet".
import { TIER_NAMES } from './board.js';
import { SUSHI_NAMES } from './sushiArt.js';
import { KOI_NAMES } from './koiArt.js';
import { CAT_NAMES } from './catArt.js';
import { PASTRY_NAMES } from './patisserieArt.js';
import { SEA_NAMES } from './deepseaArt.js';
import { GARDEN_NAMES } from './gardenArt.js';
import { SEASIDE_NAMES } from './seasideArt.js';
import { CAFE_CLASSICS_NAMES } from './cafeClassicsArt.js';
import { ct, t, ownText, pluralCategory } from '../i18n/index.js';

/**
 * Pack skins with their own tier names (index = tier, 1..10). Café Classics (the default look) names its café treats;
 * Simple Circles ('basic') borrows the Seaside Café names so players never see space words; only the cosmic skins
 * keep the cosmic ladder.
 */
export const PACK_TIER_NAMES = Object.freeze({ sushi: SUSHI_NAMES, koi: KOI_NAMES, cat: CAT_NAMES, patisserie: PASTRY_NAMES, deepsea: SEA_NAMES, garden: GARDEN_NAMES, seaside: SEASIDE_NAMES, basic: SEASIDE_NAMES, cafeclassics: CAFE_CLASSICS_NAMES });

// The skin used when a caller does not pass one: main.js points this at the equipped orb skin, so every
// text helper follows what the player is wearing without each screen passing it along. Tests pass a skin.
let skinSource = () => 'classic';
export function setNameSkinSource(fn) { skinSource = typeof fn === 'function' ? fn : () => 'classic'; }
export const currentSkin = () => { try { return skinSource() || 'classic'; } catch { return 'classic'; } };

/** True when the skin shows its own piece names (a premium pack skin). */
export const hasPackNames = (skin = currentSkin()) => !!PACK_TIER_NAMES[skin];

/** The content name set a pack skin's names come from (content keys tier.<set>.<n>); Simple Circles borrows seaside. */
const NAME_SET = Object.freeze({ basic: 'seaside' });

/**
 * Display name of a tier under a skin; falls back to the cosmic TIER_NAMES. The text comes from the content table
 * (tier.<set>.<tier>, docs/LOCALISATION.md phase 4); the arrays above stay the English reference and decide which
 * tiers have a name.
 */
export function tierName(tier, skin = currentSkin()) {
  const k = nameKey(tier, skin);
  return k ? ct(k) : '';
}

/** The content key of a tier's name under a skin (tier.<set>.<n>), or null when the tier has no name. */
function nameKey(tier, skin) {
  const names = PACK_TIER_NAMES[skin];
  const set = names && names[tier] ? NAME_SET[skin] || skin : TIER_NAMES[tier] ? 'cosmic' : null;
  return set ? `tier.${set}.${tier}` : null;
}

// ---------------------------------------------------------------- grammar (docs/LOCALISATION.md, "Grammar helpers")
// English keeps the code grammar below (pluralName, withArticle), so its text is byte-identical. A translation that
// defines grammar.a.<gender> ("ein {name}") instead reads its grammar from its own content table:
//   tier.<set>.<n>.other  the plural name          tier.<set>.<n>.g  its gender: 'm' | 'f' | 'n'
//   tier.<set>.<n>.a      the name with its indefinite article, when grammar.a.<g> does not fit (German weak nouns)
//   word.piece.<0|1>.g    the gender of the look's piece word (0 = café pieces, 1 = cosmic orbs)
// and picks gendered sentence variants (key.m / key.f / key.n) through the `gender` param of t() / ct().

/** True when the current locale reads its grammar from its table (it defines grammar.a.m); false for English. */
export const tableGrammar = () => ownText('grammar.a.m') != null;

/** Upper-cases the first letter ("a Lighthouse" → "A Lighthouse", "einen Leuchtturm" → "Einen Leuchtturm"). */
export const capFirst = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** Grammatical gender of a tier name in the current locale ('m' | 'f' | 'n'; 'm' when the table has none). */
export function tierGender(tier, skin = currentSkin()) {
  const k = nameKey(tier, skin);
  return (k && ownText(`${k}.g`)) || 'm';
}

/** Grammatical gender of the look's piece word ("piece" / "orb") in the current locale. */
export const pieceGender = (skin = currentSkin()) => ownText(`word.piece.${hasPackNames(skin) ? 0 : 1}.g`) || 'm';

// Words that stay the same in the plural (Japanese loanwords, koi, fry, dust, plankton, shrimp; any "...fish").
const SAME_PLURAL = new Set(['dust', 'edamame', 'tamago', 'maki', 'nigiri', 'gunkan', 'koi', 'fry', 'plankton', 'shrimp']);

/** English plural of a display name: "Moons", "Tuna nigiri", "Sleepy loaves", "Stretchy tabbies", "Dust". */
export function pluralName(name) {
  if (!name) return name;
  const last = name.split(' ').pop().toLowerCase();
  if (SAME_PLURAL.has(last) || last.endsWith('fish')) return name;
  if (/(s|x|ch|sh)$/.test(last)) return name + 'es'; // Octopuses
  if (last === 'loaf') return name.slice(0, -1) + 'ves';
  if (/[^aeiou]y$/.test(last)) return name.slice(0, -1) + 'ies';
  return name + 's';
}

/** "a Moon", "an Ogon koi", "an Edamame", "an Éclair". */
export const withArticle = (name) => (name ? `${/^[aeiouéÉ]/i.test(name) ? 'an' : 'a'} ${name}` : name);

/** Tier name with its indefinite article: "a Moon" / "an Ogon koi"; German "einen Leuchtturm" (grammar.a.<gender>). */
export function aTierName(tier, skin = currentSkin()) {
  const name = tierName(tier, skin);
  if (!tableGrammar() || !name) return withArticle(name);
  return ownText(`${nameKey(tier, skin)}.a`) || ct(`grammar.a.${tierGender(tier, skin)}`, { name });
}

/** Tier name for a count of n: singular for n === 1 (the locale's 'one' category), else the plural. */
export function tierNameN(tier, n, skin = currentSkin()) {
  const name = tierName(tier, skin);
  if (!tableGrammar()) return n === 1 ? name : pluralName(name);
  if (pluralCategory(n) === 'one' || !name) return name;
  return ownText(`${nameKey(tier, skin)}.other`) || name;
}

/** "3 Moons", "1 Tuna nigiri", "2 Sleepy loaves" (number formatted en-US). */
export const tierCountText = (n, tier, skin = currentSkin()) => `${Number(n).toLocaleString('en-US')} ${tierNameN(tier, n, skin)}`;

/**
 * The tier-10 goal line: "Create a Supernova" / "Create 2 Supernovas" on cosmic skins; a pack skin names its own
 * top piece instead ("Make a Lucky cat chef"), since its board has no Supernova in sight.
 */
export function novaGoalText(n = 1, skin = currentSkin()) {
  if (!hasPackNames(skin)) return n > 1 ? t('goal.novaMany', { n }) : t('goal.novaOne');
  if (n > 1) return t('goal.tier', { n, name: tierNameN(10, n, skin) });
  const aName = aTierName(10, skin);
  return t('goal.makeOne', { aName, AName: capFirst(aName) });
}

// cosmic names, longest first so "Blue Giant" wins over a shorter match; plural forms too
const COSMIC_FORMS = TIER_NAMES.flatMap((n, t) => (t && n ? [[n, t, false], [pluralName(n), t, true]] : []))
  .filter((x, i, a) => a.findIndex((y) => y[0] === x[0]) === i)
  .sort((a, b) => b[0].length - a[0].length);
const COSMIC_RE = new RegExp(`\\b(a |A )?(${COSMIC_FORMS.map((x) => x[0]).join('|')})\\b`, 'g');

/**
 * Swap cosmic tier names inside a fixed line of copy (e.g. a level's intro tip "Make a Gas Giant!") for the
 * skin's own names, fixing "a" / "an". Text is unchanged on cosmic skins.
 */
export function skinTierText(text, skin = currentSkin()) {
  if (!text || !hasPackNames(skin)) return text;
  if (tableGrammar()) return tableSkinTierText(text, skin);
  return text.replace(COSMIC_RE, (all, art, name) => {
    const [, t, plural] = COSMIC_FORMS.find((x) => x[0] === name);
    const n = plural ? pluralName(tierName(t, skin)) : tierName(t, skin);
    if (!art) return n;
    const a = withArticle(n);
    return art[0] === 'A' ? a[0].toUpperCase() + a.slice(1) : a;
  });
}

/**
 * skinTierText for a locale with table grammar: the text holds the locale's own cosmic forms (singular, plural, the
 * article form and its capitalised start, e.g. "Mond", "Monde", "einen Mond", "Einen Mond"), each swapped for the same
 * form of the skin's name ("eine Tasse"). Longest form first; whole words only. C#: ContentText.SkinTierText.
 */
function tableSkinTierText(text, skin) {
  const forms = [];
  for (let t = 1; t < TIER_NAMES.length; t++) {
    if (!TIER_NAMES[t]) continue;
    const a = aTierName(t, 'classic');
    forms.push([tierName(t, 'classic'), t, 's'], [tierNameN(t, 2, 'classic'), t, 'p'], [a, t, 'a'], [capFirst(a), t, 'A']);
  }
  const list = forms.filter((x, i) => x[0] && forms.findIndex((y) => y[0] === x[0]) === i).sort((a, b) => b[0].length - a[0].length);
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(?<!\\p{L})(${list.map((x) => esc(x[0])).join('|')})(?!\\p{L})`, 'gu');
  return text.replace(re, (m) => {
    const [, t, kind] = list.find((x) => x[0] === m);
    if (kind === 'a') return aTierName(t, skin);
    if (kind === 'A') return capFirst(aTierName(t, skin));
    return kind === 'p' ? tierNameN(t, 2, skin) : tierName(t, skin);
  });
}

/** "orb" / "orbs" for the cosmic skins, "piece" / "pieces" for pack skins (their pieces are not orbs); content word.piece(s).<0|1>. */
export const pieceWord = (plural = false, skin = currentSkin()) => ct(`word.${plural ? 'pieces' : 'piece'}.${hasPackNames(skin) ? 0 : 1}`);
