// Tonight's bake (DESIGN.md "Tonight's bake", docs/UX_TONIGHTS_BAKE.md). Pure rules, data and copy.
// Unity: Scripts/Core/Meta/Bakes.cs (same JSON shape, same copy; parity checked by BakesTests.cs against bakes.json).
//
// On her way out (the first "Done for now" of an evening after a win, or the Goodnight card) she may pick one of three
// of Nova's bakes to leave in the oven. From the next evening key it is ready: Home shows one quiet strip, the reveal
// adds its card to the Bake Book, and her first Journey level starts with one plain warm piece (BAKE_TIER) on the board.
// - Never burns, spoils or expires; no timer, no streak, no notifications. The oven holds one bake (no stockpiling).
// - No coins, ads or purchases anywhere in the flow. Offers are seeded by the evening only; placement by the level only.
// - Every bake places the SAME piece, so the choice is taste, never strength.
// Nothing here reads or changes ad state, scores or coins. The one ad-related input (ctx.sinceAdS) only keeps the card
// from showing right after an ad, like the other evening cards (EVENING_AD_GAP_S).
//
// Save field (travels in transfer codes; not local-only):
//   bake = { oven: null|{id, day}, offerDay: null|day, book: {id: times}, revealed: null|id, pending: null|{id, level},
//            introDay: null|day, offers: n, picks: n }
// day = 'YYYY-MM-DD'. oven.day and offerDay are evening keys (00:30 belongs to the evening before); introDay is the
// calendar day (menu-card accounting). Old saves load as the default.

import { eveningKey, EVENING_AD_GAP_S } from './evening.js';
import { dayKey } from './daily.js';
import { menuCardFree, markMenuCard } from './menuCards.js';
import { playDayCount } from './playDays.js';
import { mulberry32, deriveSeed, hashString } from '../game/rng.js';
import { withText, TEXT, t } from '../i18n/index.js';

/**
 * The board piece every bake comes with. Sized with the casual stand-ins (levels 6-1000, 60 seeds each, with and
 * without the piece): tier 3 helps a little everywhere (+2.2 points on levels 6-100, +1.8 on a 1-in-3 sample of
 * 6-1000) while tier 5 cost chapter 1 about 8 points and tier 4 about 5, because a lone big piece blocks a column on
 * the 5-wide board. One tier for every chapter keeps the copy and the choice simple.
 */
export const BAKE_TIER = 3;
/** First Journey level the oven card can show at. */
export const BAKE_MIN_LEVEL = 6;
/** Play days before the first offer (never on her first evening). */
export const BAKE_MIN_DAYS = 2;
const NAT_MAX = 1000000;

/**
 * The 30 bakes. art: the Café Classics tier drawn as a stand-in, or 'loaf'. one: the name is singular. name / line are
 * content text bake.<id>.name / .line (src/i18n/content/en.js, docs/LOCALISATION.md phase 3).
 */
export const BAKES = Object.freeze([
  { id: 'cinnamon_swirls', name: TEXT, art: 6, line: TEXT },
  { id: 'strawberry_shortcake', name: TEXT, art: 3, one: true, line: TEXT },
  { id: 'jam_doughnuts', name: TEXT, art: 4, line: TEXT },
  { id: 'lemon_drizzle_loaf', name: TEXT, art: 'loaf', one: true, line: TEXT },
  { id: 'apple_turnovers', name: TEXT, art: 7, line: TEXT },
  { id: 'blueberry_muffins', name: TEXT, art: 'loaf', line: TEXT },
  { id: 'oat_honey_cookies', name: TEXT, art: 2, line: TEXT },
  { id: 'scones_jam', name: TEXT, art: 2, line: TEXT },
  { id: 'banana_bread', name: TEXT, art: 'loaf', one: true, line: TEXT },
  { id: 'pumpkin_pie', name: TEXT, art: 7, one: true, line: TEXT },
  { id: 'shortbread_fingers', name: TEXT, art: 2, line: TEXT },
  { id: 'cherry_bakewell', name: TEXT, art: 7, one: true, line: TEXT },
  { id: 'carrot_cake', name: TEXT, art: 'loaf', one: true, line: TEXT },
  { id: 'raspberry_tarts', name: TEXT, art: 3, line: TEXT },
  { id: 'ginger_biscuits', name: TEXT, art: 2, line: TEXT },
  { id: 'chocolate_brownies', name: TEXT, art: 'loaf', line: TEXT },
  { id: 'peach_cobbler', name: TEXT, art: 7, one: true, line: TEXT },
  { id: 'victoria_sponge', name: TEXT, art: 'loaf', one: true, line: TEXT },
  { id: 'almond_croissants', name: TEXT, art: 6, line: TEXT },
  { id: 'cheese_scones', name: TEXT, art: 2, line: TEXT },
  { id: 'pear_ginger_cake', name: TEXT, art: 'loaf', one: true, line: TEXT },
  { id: 'coconut_macaroons', name: TEXT, art: 2, line: TEXT },
  { id: 'maple_pecan_buns', name: TEXT, art: 6, line: TEXT },
  { id: 'plum_crumble', name: TEXT, art: 7, one: true, line: TEXT },
  { id: 'honey_madeleines', name: TEXT, art: 2, line: TEXT },
  { id: 'cranberry_oat_bars', name: TEXT, art: 'loaf', line: TEXT },
  { id: 'tea_loaf', name: TEXT, art: 'loaf', pic: 'tealoaf', one: true, line: TEXT }, // pic: its own picture (UI only, docs/UX_FIRST_WEEK.md F4)
  { id: 'sticky_toffee_pudding', name: TEXT, art: 'loaf', one: true, line: TEXT },
  { id: 'butter_biscuits', name: TEXT, art: 2, line: TEXT },
  { id: 'harbour_rock_cakes', name: TEXT, art: 2, line: TEXT },
].map((b) => Object.freeze(withText(b, `bake.${b.id}`))));

const BY_ID = new Map(BAKES.map((b) => [b.id, b]));
/** The bake with this id, or null. */
export const bakeById = (id) => (typeof id === 'string' && BY_ID.get(id)) || null;
/** The Café Classics tier drawn as the stand-in art ('loaf' -> 6). */
export const bakeArtTier = (b) => (b && typeof b.art === 'number' ? b.art : 6);
/** The board tier for a Journey level (one tier for every chapter, see BAKE_TIER). */
export const bakeTier = (/* n */) => BAKE_TIER;

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const isDay = (v) => typeof v === 'string' && DAY_RE.test(v);
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
/** Whole numbers only (a number that is an integer >= 0), capped; anything else 0. */
const nat = (v) => (typeof v === 'number' && Number.isInteger(v) && v > 0 ? Math.min(v, NAT_MAX) : 0);

export function defaultBake() {
  return { oven: null, offerDay: null, book: {}, revealed: null, pending: null, introDay: null, offers: 0, picks: 0 };
}

/** Save sanitiser: unknown ids drop to null, book entries kept in table order with whole counts >= 1. */
export function sanitizeBake(s) {
  if (!s) return;
  const o = isObj(s.bake) ? s.bake : {};
  const ov = isObj(o.oven) && bakeById(o.oven.id) && isDay(o.oven.day) ? { id: o.oven.id, day: o.oven.day } : null;
  const book = {};
  const rb = isObj(o.book) ? o.book : {};
  for (const b of BAKES) { const n = Object.prototype.hasOwnProperty.call(rb, b.id) ? nat(rb[b.id]) : 0; if (n > 0) book[b.id] = n; }
  const pd = isObj(o.pending) && bakeById(o.pending.id) && nat(o.pending.level) >= 1 ? { id: o.pending.id, level: nat(o.pending.level) } : null;
  s.bake = {
    oven: ov,
    offerDay: isDay(o.offerDay) ? o.offerDay : null,
    book,
    revealed: bakeById(o.revealed) ? o.revealed : null,
    pending: pd,
    introDay: isDay(o.introDay) ? o.introDay : null,
    offers: nat(o.offers),
    picks: nat(o.picks),
  };
}

const bk = (save) => {
  if (!save) return defaultBake();
  if (!isObj(save.bake)) save.bake = defaultBake();
  const b = save.bake;
  if (!isObj(b.book)) b.book = {};
  return b;
};

/** Is a bake waiting in the oven and ready (from the evening after it was picked; never expires)? */
export function bakeReady(save, date = new Date()) {
  const ov = save && save.bake && save.bake.oven;
  return !!(ov && bakeById(ov.id) && isDay(ov.day) && eveningKey(date) > ov.day);
}

/** The bake in the oven (ready or not), or null. */
export function ovenBake(save) {
  const ov = save && save.bake && save.bake.oven;
  return (ov && bakeById(ov.id)) || null;
}

/** Times this bake is in the book. */
export const bakedCount = (save, id) => nat(save && save.bake && isObj(save.bake.book) ? save.bake.book[id] : 0);
/** Distinct bakes in the book (0..30). */
export function bookCount(save) {
  let n = 0;
  for (const b of BAKES) if (bakedCount(save, b.id) > 0) n++;
  return n;
}

/**
 * May the oven card show now? ctx = { doneForNow, won, mode: 'journey'|'special'|..., sinceAdS }.
 * Gates (all): she tapped Done for now after a win, in Journey or Today's Special; Journey level >= 6; at least her
 * second play day; not already offered this evening; the oven is empty and no bake is waiting on a level; no ad in the
 * last EVENING_AD_GAP_S seconds; and the very first time, today's single feature-card slot is still free.
 */
export function bakeOfferDue(save, ctx = {}, date = new Date()) {
  if (!save || !ctx || !ctx.doneForNow || !ctx.won) return false;
  if (ctx.mode !== 'journey' && ctx.mode !== 'special') return false;
  return ovenOfferOpen(save, date) && Number(ctx.sinceAdS) >= EVENING_AD_GAP_S;
}

/**
 * The offer part of the gates (no result-card context): Journey level, play days, once an evening, empty oven, no
 * pending bake, first-time card slot. The Goodnight row and the Bake Book fallback button use this.
 */
export function ovenOfferOpen(save, date = new Date()) {
  if (!save) return false;
  const lvl = save.journey && typeof save.journey.level === 'number' ? save.journey.level : 1;
  if (lvl < BAKE_MIN_LEVEL || playDayCount(save) < BAKE_MIN_DAYS) return false;
  const b = save.bake || {};
  if (b.offerDay === eveningKey(date) || b.oven || b.pending) return false;
  if (!b.introDay && !menuCardFree(save, date)) return false;
  return true;
}

/** Is this the first oven card ever (Pip's intro line)? */
export const bakeIntro = (save) => !(save && save.bake && save.bake.introDay);

/**
 * The three bakes offered this evening, seeded by the evening key only. Normally two she hasn't baked plus one she
 * has (her first offer: three new ones); once all 30 are baked, three from the whole book. New ones first.
 */
export function bakeOffers(save, date = new Date()) {
  const rng = mulberry32(deriveSeed(hashString(eveningKey(date)), 'bakeOffer'));
  const fresh = BAKES.filter((b) => bakedCount(save, b.id) === 0).map((b) => b.id);
  const baked = BAKES.filter((b) => bakedCount(save, b.id) > 0).map((b) => b.id);
  const take = (arr, k) => {
    const out = [];
    for (let i = 0; i < k && arr.length; i++) out.push(arr.splice(rng.int(arr.length), 1)[0]);
    return out;
  };
  if (!fresh.length) return take(baked, 3);
  const nNew = baked.length ? Math.min(2, fresh.length) : Math.min(3, fresh.length);
  const a = take(fresh, nNew);
  return a.concat(take(baked, 3 - a.length));
}

/** The oven card showed (shown counts as answered for the evening). The first one ever also takes today's card slot. */
export function markOffered(save, date = new Date()) {
  const b = bk(save);
  b.offers = nat(b.offers) + 1;
  b.offerDay = eveningKey(date);
  if (!b.introDay) { b.introDay = dayKey(date); markMenuCard(save, date); }
}

/** She picked a bake: into the oven (ready from the next evening). Returns the bake, or null for an unknown id. */
export function pickBake(save, id, date = new Date()) {
  const def = bakeById(id);
  if (!def) return null;
  const b = bk(save);
  b.oven = { id, day: eveningKey(date) };
  b.offerDay = eveningKey(date);
  b.revealed = null;
  b.picks = nat(b.picks) + 1;
  return def;
}

/** "Not tonight": no card again this evening, nothing else. */
export function declineBake(save, date = new Date()) {
  bk(save).offerDay = eveningKey(date);
}

/** The reveal (Home strip / sheet) was seen: adds the card to the book once. Returns the bake or null. */
export function revealBake(save, date = new Date()) {
  if (!bakeReady(save, date)) return null;
  const b = bk(save);
  const id = b.oven.id;
  if (b.revealed !== id) { b.revealed = id; b.book[id] = bakedCount(save, id) + 1; }
  return bakeById(id);
}

/** Her next new Journey level (save.journey.level; 1 when missing). */
const reachedLevel = (save) => Math.max(1, nat(save && save.journey && save.journey.level));

/**
 * A Journey level is starting: the warm piece it gets. Returns { tier, id, fresh } or null.
 * - Only her next new level (n >= save.journey.level) uses the bake; replaying a cleared level leaves it alone.
 * - fits: the piece has room on this start board (levels.js bakeFits, with the Steady Start / Nova Streak columns
 *   taken). When it doesn't, nothing changes: the bake stays in the oven (or on its level) for a board with room.
 * - A retry of the level holding the pending bake keeps the piece (fresh false).
 * - Any other level drops a pending bake (it was "eaten"), then a ready bake is used: the oven empties, the book
 *   counts it unless the reveal already did (fresh = not revealed yet, for the level-start toast).
 */
export function consumeBakeForLevel(save, levelN, date = new Date(), fits = true) {
  if (!save) return null;
  const b = bk(save);
  const n = nat(levelN);
  if (n < reachedLevel(save) || !fits) return null;
  if (b.pending && bakeById(b.pending.id)) {
    if (b.pending.level === n) return { tier: bakeTier(n), id: b.pending.id, fresh: false };
    b.pending = null;
  }
  if (n < 1 || !bakeReady(save, date)) return null;
  const id = b.oven.id;
  const fresh = b.revealed !== id;
  if (fresh) b.book[id] = bakedCount(save, id) + 1;
  b.pending = { id, level: n };
  b.oven = null;
  b.revealed = null;
  return { tier: bakeTier(n), id, fresh };
}

/** The level holding the bake was won: the bake is done. */
export function bakeLevelWon(save, levelN) {
  const b = save && save.bake;
  if (b && b.pending && b.pending.level === nat(levelN)) b.pending = null;
}

// ---- Copy (exact strings, docs/UX_TONIGHTS_BAKE.md section 6). `tier` is tierName(BAKE_TIER, skin). ----
// Text: UI keys bake.* (docs/LOCALISATION.md phase 4c). A bake that is one thing (def.one) uses the .one line ("is ready").
const one = (def) => !!(def && def.one);
const nm = (def) => (def ? def.name : '');

export const BAKE_COPY = Object.freeze({
  get title() { return t('bake.copy.title'); },
  get sub() { return t('bake.copy.sub'); },
  get intro() { return t('bake.copy.intro'); },
  get decline() { return t('bake.copy.decline'); },
  get goodnightBtn() { return t('bake.copy.goodnightBtn'); },
  get gnHeading() { return t('bake.copy.gnHeading'); },
  get stripTop() { return t('bake.copy.stripTop'); },
  get recipeFrom() { return t('bake.copy.recipeFrom'); },
  get lovely() { return t('bake.copy.lovely'); },
  get seeBook() { return t('bake.copy.seeBook'); },
  get bookTitle() { return t('bake.copy.bookTitle'); },
  get bookIntro() { return t('bake.copy.bookIntro'); },
  get notYet() { return t('bake.copy.notYet'); },
  get complete() { return t('bake.copy.complete'); },
  get chooseBtn() { return t('bake.copy.chooseBtn'); },
});

/** The small line under an offered tile. */
export function bakeTileLine(save, id) {
  const n = bakedCount(save, id);
  if (n === 0) return id === 'cinnamon_swirls' ? t('bake.tile.favourite') : t('bake.tile.new');
  return one(bakeById(id)) ? t('bake.tile.baked.one', { times: timesWord(n) }) : t('bake.tile.baked.other', { times: timesWord(n) });
}
const timesWord = (n) => (n === 1 ? t('bake.once') : n === 2 ? t('bake.twice') : t('bake.times', { n: n.toLocaleString('en-US') }));
/** Times on a Bake Book card. */
export const bakedTimesLine = (n) => t('bake.bakedTimes', { times: timesWord(n) });
export const bakeFineLine = (tier) => t('bake.fine', { tier });
export const bakePickedLine = (def) => t('bake.picked', { name: nm(def) });
export const bakeStillWarmLine = (def) => t('bake.stillWarm', { name: nm(def) });
export const bakeStripText = (def) => t('bake.strip', { top: BAKE_COPY.stripTop, name: nm(def) });
export const bakeStripAria = (def) => t('bake.stripAria', { name: nm(def) });
export const bakePipLine = (def) => (one(def) ? t('bake.pipReady.one', { name: nm(def) }) : t('bake.pipReady.other', { name: nm(def) }));
export const bakeRevealTitle = (def) => (one(def) ? t('bake.reveal.one', { name: nm(def) }) : t('bake.reveal.other', { name: nm(def) }));
export const bakeBookLine = (n) => t('bake.bookLine', { n: n.toLocaleString('en-US'), total: BAKES.length });
export const bakeBoardLine = (tier) => t('bake.board', { tier });
export const bakeToastLine = (def, tier) => t('bake.toast', { name: nm(def), tier });
export const bakeWelcomeLine = (def) => (one(def) ? t('bake.welcome.one', { name: nm(def) }) : t('bake.welcome.other', { name: nm(def) }));
export const bakeBookRowSub = (n) => t('bake.bookRow', { n: n.toLocaleString('en-US'), total: BAKES.length });
export const bakeTileAria = (save, id) => t('bake.tileAria', { name: nm(bakeById(id)), line: bakeTileLine(save, id) });
