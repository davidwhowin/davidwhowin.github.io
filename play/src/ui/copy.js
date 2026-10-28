// Display words (v3, "Nova's Seaside Café"). Pure data + one function (no DOM).
//
// The cozy seaside words are the default. When the Cosmic look is equipped (look === 'cosmic')
// the old space words come back, so veterans keep their identity. Display only: save keys,
// goal type ids, perk ids and analytics names never change with the look.
//
// Each entry: key -> [cozy, cosmic]. Keys are stable ids; add new words here, not inline. The words are content text
// word.<key>.0 (cozy) and word.<key>.1 (cosmic) in src/i18n/content (docs/LOCALISATION.md phase 4c).
import { withText, LINES, t, getLocale } from './i18n.js';
import { tierNameN } from '../game/tierNames.js';

export const WORDS = withText({
  pieces:      LINES,
  piece:       LINES,
  Pieces:      LINES,
  topTier:     LINES,
  blockers:    LINES,
  blocker:     LINES,
  removeBoost: LINES,
  wildBoost:   LINES,
  shuffleBoost: LINES,
  dailyPuzzle: LINES,
  companions:  LINES,
  streak:      LINES,
  sector:      LINES,
  freePlay:    LINES,
  relaxed:     LINES,
  deck:        LINES,
  map:         LINES,
}, 'word');

export const WORD_KEYS = Object.keys(WORDS);

/**
 * Display word for `key` in the given look ('cosmic' → old space words, anything else → cozy).
 * Unknown keys return the key itself so a typo shows up on screen instead of crashing.
 */
export function word(key, look) {
  const w = Object.prototype.hasOwnProperty.call(WORDS, key) ? WORDS[key] : null;
  if (!w) return key;
  return look === 'cosmic' ? w[1] : w[0];
}

// The 1–3 level rating as a word (docs/UX_STARS.md): honest about what it measures (spare drops, levels.js starsFor), and
// never negative: the lowest rating still means she won. Shown with blossoms in the café look. C#: Copy.FinishWords.
// Text: UI keys finish.1 .. finish.3 (docs/LOCALISATION.md phase 4c); FINISH_WORDS is read once at start-up.
const finishText = (k) => (k === 1 ? t('finish.1') : k === 2 ? t('finish.2') : k === 3 ? t('finish.3') : '');
export const FINISH_WORDS = Object.freeze([0, 1, 2, 3].map(finishText));

/** The word for a 1–3 rating ('' for 0 or less, "Perfect finish" for 3 or more). Display only. C#: Copy.FinishWord. */
export function finishWord(n) {
  const k = Math.max(0, Math.min(3, Math.floor(Number(n) || 0)));
  return finishText(k);
}

// Sentence-level renames for text that comes from shared rule modules (goal text, tips, reflections, Today tasks,
// booster blurbs). Those modules stay word-for-word the same (the JSON fixtures and the C# port read them), so the
// UI passes their strings through cozyText at display time. Order matters: phrases first, single words last.
// English only (docs/LOCALISATION.md phase 4c): these are English phrase swaps, so under any other locale cozyText,
// goalCopy and fixArticles return the text untouched and the translation says it in the café words itself.
const COZY_PHRASES = [
  // the blocker is drawn as a gray stone (orbArt.js drawAsteroidShape, every skin): "Break 2 asteroids" → "Clear 2
  // stones". Counts and plurals carry through to the single-word rules below.
  [/\bBreak an asteroid\b/g, 'Clear a stone'],
  [/\bBreak (\S+) (asteroids?)\b/g, 'Clear $1 $2'],
  [/\basteroids to break\b/g, 'stones to clear'],
  [/\ban asteroid\b/g, 'a stone'],
  [/\bVaporise any orb or asteroid\b/g, 'Lift away any piece or stone'],
  [/\bWild Orbs?\b/g, 'Wild Sugar'],
  [/\bZen Drift\b/g, 'Relaxed'],
  [/\bDaily Nebulas?\b/g, "Today's Special"],
  [/\bDaily Orbits\b/g, 'Today tasks'],
  [/\bStar Keepers\b/g, 'The Regulars'],
  [/\bNova Streak\b/g, 'Warm Streak'],
  [/\bJourney map\b/g, 'Coast Path'],
  [/(?<!Brass )\bObservatory\b/g, 'Stargazing Deck'],
  [/\bComet\b(?! Week| Sparks| Bloom| Rain)/g, 'Seagull'],
  [/\bAsteroids\b/g, 'Stones'],
  [/\bAsteroid\b(?! Miner)/g, 'Stone'],
  [/\basteroids\b/g, 'stones'],
  [/\basteroid\b/g, 'stone'],
  [/\bEndless\b/g, 'Free Play'],
  [/\bSECTOR\b/g, 'ROUND'],
  [/\bis Super Hard\b/g, 'is extra tricky'],
  [/\bSuper Hard\b/g, 'Extra tricky'],
  [/\b([Aa]) Hard level\b/g, '$1 tricky level'],
  [/\bopens a new nebula\b/g, 'opens a new view'],
  // v3 copy sweep: the last space words in rule-module copy (perks, tips, journal, banners, postcards, toasts)
  [/\bDAILY NEBULA\b/g, "TODAY'S SPECIAL"],
  [/\bNebula (solved|tried)\b/g, 'Special $1'],
  [/\bZEN DRIFT\b/g, 'RELAXED'],
  [/\bOrbit complete\b/g, 'Task done'],
  [/\btoday's orbits\b/g, "today's tasks"],
  [/\b(New|new|Chapter|Season|Cosmic) nebula(s?)\b/g, '$1 view$2'],
  [/\bthe ([A-Z][\w ]*?) nebula\b/g, 'the $1 view'],
  // perk names: the café names (perks.js cozy.name; screens show those directly, this catches any other line)
  [/\bAsteroid Miner\b/g, 'Beachcomber'],
  [/\bConstellation Bonds\b/g, 'Corner Table'],
  [/\bEarly Nova\b/g, 'Early Bird'],
  [/\bMeteor Shower\b/g, 'Seagull Flock'],
  [/\bHold Slot\b/g, 'Side Plate'],
  [/\bWildcards?\b/g, 'Sugar Bowl'],
  [/\bCombo Engine\b/g, 'Busy Kitchen'],
  [/\bCoin Magnet\b/g, 'Tip Jar'],
  [/\bBigger Bang\b/g, 'Spring Clean'],
  [/\bGentle Spawns\b/g, 'Small Batches'],
  [/\bSecond Wind\b/g, 'Fresh Pot'],
  [/\bSECOND WIND\b/g, 'FRESH POT'],
  [/\bGravity Well\b/g, 'Big Batch'],
  [/\bMidas Touch\b/g, 'Honey Harvest'],
  [/\bStar Forge\b/g, 'Warm Oven'],
  [/\bSTAR FORGE\b/g, 'WARM OVEN'],
  [/\bSolar Wind\b/g, 'Morning Tidy'],
  [/\bSOLAR WIND\b/g, 'MORNING TIDY'],
  [/^Eclipse$/, 'Calm Tide'],
  [/\bECLIPSE · TIDE\b/g, 'CALM TIDE'],
  [/\bECLIPSE\b/g, 'CALM TIDE'],
  [/\bCONSTELLATION!/g, 'PERFECT PAIR!'],
  // one meaning for ★ (docs/UX_STARS.md): ★ is only the café star, so decorative ★ bullets lose the glyph
  [/★ Constellation\b/g, 'Perfect pair'],
  [/\bConstellation setups\b/g, 'Perfect pair setups'],
  [/^★ (Completes|Pairs with)\b/, '$1'],
  // the 1–3 level rating is counted in blossoms (✿ earned, ❀ not yet). Exact triples only, so a café "★ 5" is never touched
  [/★★★/g, '✿✿✿'],
  [/★★☆/g, '✿✿❀'],
  [/★☆☆/g, '✿❀❀'],
  [/☆☆☆/g, '❀❀❀'],
  [/\bFirst 3-star level\b/g, 'First Perfect finish'],
  [/^New stars$/, 'New blossoms'],
  [/\b(\d[\d,]*) star(s?) earned\b/g, '$1 blossom$2 earned'],
  [/\b(\d[\d,]*) more Journey star(s?) light(s?) the next one\b/g, '$1 more blossom$2 light$3 the next one'],
  // the sky calendar is a row of candles, counted in evenings (skyCalendar.js keeps its words for the Cosmic look)
  [/^(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER) SKY$/, (m, g) => `${g[0]}${g.slice(1).toLowerCase()} evenings`],
  [/^A fresh sky this month\. Play a game to light your first star\.$/, 'A fresh month of evenings. Play a game to light your first candle.'],
  [/\b(\d[\d,]*) night(s?) this month\b/g, '$1 evening$2 this month'],
  [/^Each night you play lights a star\. A fresh sky starts on the 1st\.$/, 'Each evening you play, a candle is lit. A fresh month starts on the 1st.'],
  [/^(STELLAR|COSMIC|GALACTIC)(?= ×)/, (m) => ({ STELLAR: 'LOVELY', COSMIC: 'WONDERFUL', GALACTIC: 'MARVELLOUS' })[m]],
  [/\bSUPERNOVA\b/g, 'LIGHTHOUSE'],
  [/\bSupernovas\b/g, 'Lighthouses'],
  [/\bSupernova\b/g, 'Lighthouse'],
  [/\ba supernova\b/g, 'a Lighthouse glow'],
  [/\bBlue Giants\b/g, 'Harbour Lanterns'],
  [/\bBlue Giant\b/g, 'Harbour Lantern'],
  [/\bGas Giants\b/g, 'Teapots'],
  [/\bGas Giant\b/g, 'Teapot'],
  [/\bRinged Planets\b/g, 'Honey Jars'],
  [/\bRinged Planet\b/g, 'Honey Jar'],
  [/\bcomet charges\b/g, 'seagull charges'],
  [/\bcomet charge\b/g, 'seagull charge'],
  [/(\+?\d+) comets\b/g, '$1 seagulls'],
  [/(\+?\d+) comet\b/g, '$1 seagull'],
  [/\ban extra comet\b/g, 'an extra seagull'],
  [/\bComets(?= now|,)/g, 'Seagulls'],
  [/\bvaporise it\b/g, 'lift it away'],
  [/\b[Ww]ild orbs?\b/g, 'Wild Sugar'],
  // Pip's few starry lines, said the café way
  [/\bReady to make some light\?/g, 'Ready for a cozy round?'],
  [/\bI saved you a spot by the stars\./g, 'I saved you a seat by the window.'],
  [/\bLet's make some light\./g, "Let's brew something lovely."],
  [/\bThat's a little more light in the sky\./g, 'The café feels a little brighter.'],
  // HUD captions (uppercase)
  [/^COMET$/, 'SEAGULL'],
  [/^WILD$/, 'SUGAR'],
  [/^SHUFFLE$/, 'STIR'],
  [/^ZEN BEST$/, 'RELAXED BEST'],
  [/^SUPER HARD$/, 'EXTRA TRICKY'],
  [/^HARD$/, 'TRICKY'],
  [/^comet$/, 'seagull'],
  [/^wild$/, 'wild sugar'],
  [/^shuffle$/, 'stir'],
  [/\bSectors?\b/g, (m) => (m.endsWith('s') ? 'Rounds' : 'Round')],
  [/\bsectors?\b/g, (m) => (m.endsWith('s') ? 'rounds' : 'round')],
  [/(?<!Golden )\bOrbs\b/g, 'Pieces'],
  [/\borbs\b/g, 'pieces'],
  [/\bOrb\b/g, 'Piece'],
  [/\borb\b/g, 'piece'],
];
// Proper names kept as they are: Comet Sparks / Comet Bloom (looks), Brass Observatory (a board), Golden Orbs (a skin),
// Comet Week. Tier names map to the Seaside Café ladder (the default look); a screen that knows the skin runs
// skinTierText first, so pack skins still see their own names. Text inside [data-keep-words] is never touched (e.g. a friend's puzzle code).

/**
 * A rule module's sentence in the player's look: cozy words by default, untouched for the Cosmic look.
 * Display only (never feed the result back into a rule or a save).
 */
export function cozyText(text, look) {
  if (look === 'cosmic' || typeof text !== 'string' || !text || getLocale() !== 'en') return text;
  let out = text;
  for (const [re, to] of COZY_PHRASES) out = out.replace(re, to);
  return fixArticles(out);
}

/**
 * "an" before a word that now starts with a consonant sound (a swapped noun: "an orb" became "an piece") goes back to
 * "a" (docs/UX_FIRST_RUN.md Q1), and "a" before a vowel word becomes "an" ("a orange" -> "an orange"). Words that
 * break the letter rule keep theirs: "an hour" (h is left alone), "a one-minute", "a once", "a European", "a unit".
 */
export function fixArticles(text) {
  if (typeof text !== 'string' || !text || getLocale() !== 'en') return text;
  return text
    .replace(/\b([Aa])n (?=[bcdfgjklmnpqrstvwxyzBCDFGJKLMNPQRSTVWXYZ][a-z])/g, '$1 ')
    .replace(/\b([Aa]) (?=[aeioAEIO][a-z])(?!(?:[Oo]ne|[Oo]nce)\b|[Ee]u)/g, '$1n ');
}

/**
 * Tier goals count that piece *or any bigger one* (levels.js applyProgress: m.tier >= g.tier), so the words say so
 * (docs/UX_FIRST_RUN.md Q3): the short chip label gets a "+" ("Cookie+"), the long line "or bigger"
 * ("Make 3 Cookies or bigger"). Display only. C#: Copy.TierGoalText.
 */
export function tierGoalText(g, text, short = false) {
  if (!g || g.type !== 'tier' || !(g.tier < 10) || typeof text !== 'string' || !text) return text;
  if (short) return t('goal.orBiggerChip', { goal: text });
  // the usual "Make 3 Cookies" line becomes one whole sentence, so a translation can place "or bigger" freely
  const name = tierNameN(g.tier, g.count);
  if (text === t('goal.tier', { n: g.count, name })) return t('goal.tierOrBigger', { n: g.count, name });
  return t('goal.orBiggerLine', { goal: text });
}

// QA1: the blocker is a gray stone in every skin, so goal text says "stones" in every look (the Cosmic look keeps its
// other words, e.g. tier names: "Make 1 Supernova"). Same rules as the stone lines of COZY_PHRASES.
const STONE_WORDS = [
  [/\bBreak an asteroid\b/g, 'Clear a stone'],
  [/\bBreak (\S+) (asteroids?)\b/g, 'Clear $1 $2'],
  [/\basteroids to break\b/g, 'stones to clear'],
  [/\ban asteroid\b/g, 'a stone'],
  [/\bAsteroids\b/g, 'Stones'],
  [/\bAsteroid\b(?! Miner)/g, 'Stone'],
  [/\basteroids\b/g, 'stones'],
  [/\basteroid\b/g, 'stone'],
];

/**
 * A level goal's text (levels.js goalText) for display: the look's words (cozyText), and café words for the blocker
 * ("Clear 2 stones") even under the Cosmic look. Display only. C#: Copy.GoalCopy.
 */
export function goalCopy(text, look) {
  if (look !== 'cosmic') return cozyText(text, look);
  if (typeof text !== 'string' || !text || getLocale() !== 'en') return text;
  let out = text;
  for (const [re, to] of STONE_WORDS) out = out.replace(re, to);
  return fixArticles(out);
}

const COZY_ATTRS = ['aria-label', 'title', 'alt'];
const skipText = (n) => {
  const p = n.parentElement;
  return !p || /^(SCRIPT|STYLE|TEXTAREA|INPUT)$/.test(p.tagName) || !!(p.closest && p.closest('[data-keep-words]'));
};
function fixText(n) {
  if (skipText(n)) return;
  const v = n.nodeValue, w = cozyText(v, 'seaside');
  if (w !== v) n.nodeValue = w;
}
function fixAttrs(e) {
  if (!e.getAttribute || (e.closest && e.closest('[data-keep-words]'))) return;
  for (const a of COZY_ATTRS) {
    const v = e.getAttribute(a);
    if (v) { const w = cozyText(v, 'seaside'); if (w !== v) e.setAttribute(a, w); }
  }
}

/** Put every word under `root` (text and labels) into the cozy words, unless the look is Cosmic. Display only. */
export function cozyNode(root, look) {
  if (look === 'cosmic' || !root || typeof document === 'undefined' || !document.createTreeWalker) return;
  if (root.nodeType === 3) { fixText(root); return; }
  if (root.nodeType !== 1) return;
  fixAttrs(root);
  for (const e of root.querySelectorAll('[aria-label], [title], [alt]')) fixAttrs(e);
  const w = document.createTreeWalker(root, 4 /* NodeFilter.SHOW_TEXT */);
  for (let n = w.nextNode(); n; n = w.nextNode()) fixText(n);
}

/**
 * Keep `target` in the cozy words from now on: every screen, card, toast and HUD label added or changed under it is
 * converted before it paints (MutationObserver callbacks run before the next frame). The rule modules keep their
 * original words (fixtures, C# port); this is the one display-time pass. Returns the observer (or null).
 */
export function watchCozyWords(target, getLook) {
  if (!target || typeof MutationObserver === 'undefined') return null;
  const mo = new MutationObserver((recs) => {
    if (getLook() === 'cosmic') return;
    for (const r of recs) {
      if (r.type === 'characterData') fixText(r.target);
      else if (r.type === 'attributes') fixAttrs(r.target);
      else for (const n of r.addedNodes) cozyNode(n, 'seaside');
    }
  });
  mo.observe(target, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: COZY_ATTRS });
  cozyNode(target, getLook());
  return mo;
}

/** The look the page shows right now (<html data-look>, set by main.js), for modules that don't hold the save. */
export function pageLook() {
  try { return document.documentElement.dataset.look === 'cosmic' ? 'cosmic' : 'seaside'; } catch (_) { return 'seaside'; }
}
