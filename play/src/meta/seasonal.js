// Seasonal events (DESIGN.md "Seasonal events"). Pure rules, no DOM. Mirror: Scripts/Core/Meta/Seasonal.cs.
//
// A season is a few gentle weeks with its own little path of free rewards. Every finished round (Journey,
// Daily Puzzle, Endless or Zen) gathers a few seasonal tokens; the count comes from the round's own outcome
// only (stars for a level, merges for a free-play run). Never from ad state, never from a continue, and it
// never changes a score, a reward or how hard anything is. No paid boosts, no countdowns.
//
// Save shape: save.seasonal = {
//   id:    season id the progress below belongs to ('' = none yet),
//   n:     tokens gathered this season,
//   bag:   { level, daily, free }  tokens by where they came from (shown as apples / pumpkins / leaves),
//   got:   path steps granted this season (0..steps.length),
//   seen:  path steps the player has looked at (got - seen = "new" on the Today row),
//   met:   id of the season whose Home "New" card has been shown,
//   decor: [decorId...]  café decorations earned in any season, kept forever,
//   decorOff: true when the player has tucked the seasonal decorations away,
//   frameOff: true when the player turned the Season Keepsakes postcard frame off (written only when true),
// }
// Season Keepsakes (paid, cosmetic only) are owned in save.purchases.keepsakes = [setId...] (local to the device, like
// every purchase; written only when not empty). See KEEPSAKES below.
// Steps not reached when a season ends simply end with it; everything granted stays.
// Keepsake set names, lines, decoration names and frames are content text keepsake.* (src/i18n/content/en.js); season
// names, token names and path step names are season.<id>.* (docs/LOCALISATION.md phase 4b).
import { withText, ct, ctp, t, tp, TEXT, listJoin, ownText, pluralCategory } from '../i18n/index.js';

/**
 * Seasons open once this Journey level is cleared AND she has played on SEASON_DAYS distinct days (a time-limited theme
 * is not a first-evening idea; docs/UX_FEATURE_GATES.md finding 4). App layer gate: onboarding.seasonOpen.
 */
export const SEASON_LEVEL = 15;
export const SEASON_DAYS = 3;

/** Where a round's tokens come from: a Journey level, a daily puzzle (Daily Puzzle or Endless daily), free play. */
export const SLOTS = Object.freeze(['level', 'daily', 'free']);

const step = (at, kind, id, amount) => ({ at, kind, id, amount, name: TEXT });

/**
 * Freezes a season row and turns its text into content getters: season.<id>.name / .short / .endText, the path step
 * names season.<id>.step.<at>.name, and the token names season.<id>.token.<slot>.one / .other (read through ctp by
 * tokenWord; `tokens.<slot>` stays the [one, many] pair it always was). Field order is unchanged.
 */
function season(s) {
  const tokens = {};
  for (const slot of SLOTS) {
    Object.defineProperty(tokens, slot, {
      get: () => Object.freeze([ct(`season.${s.id}.token.${slot}.one`), ct(`season.${s.id}.token.${slot}.other`)]),
      enumerable: true,
    });
  }
  const steps = Object.freeze(s.steps.map((st) => Object.freeze(withText(st, `season.${s.id}.step.${st.at}`))));
  const { keepsakes, ...head } = s;
  delete head.steps;
  return Object.freeze(withText({ ...head, tokens: Object.freeze(tokens), steps, keepsakes }, `season.${s.id}`));
}

/**
 * The season table (device date only, inclusive 'YYYY-MM-DD' ranges, never overlapping). Add the next season here.
 * Switchover: the first visit on a new season's first day starts its path from zero (ensureSeason). Decorations,
 * outfits and coins from earlier seasons are kept and stay out in the café; one switch tucks them all away. Days
 * between seasons have no path, only the "Seasonal keepsakes" row. Each season gets its own Home "New" card (met).
 */
export const SEASONS = Object.freeze([
  season({
    id: 'harvest-2026',
    name: TEXT,
    short: TEXT,
    start: '2026-10-01',
    end: '2026-11-30',
    endText: TEXT,
    steps: [
      step(8, 'decor', 'h_pumpkin', 0),
      step(20, 'coins', '', 100),
      step(35, 'decor', 'h_bunting', 0),
      step(55, 'coins', '', 150),
      step(75, 'decor', 'h_crates', 0),
      step(100, 'coins', '', 200),
      step(125, 'decor', 'h_blanket', 0),
      step(150, 'outfit', 'knithat', 0),
      step(175, 'coins', '', 250),
      step(200, 'decor', 'h_latte', 0),
    ],
    keepsakes: 'harvest', // the Season Keepsakes set sold for this season (KEEPSAKES)
  }),
  season({
    id: 'winter-2026',
    name: TEXT,
    short: TEXT,
    start: '2026-12-01',
    end: '2027-01-31',
    endText: TEXT,
    steps: [
      step(8, 'decor', 'w_snow', 0),
      step(20, 'coins', '', 100),
      step(35, 'decor', 'w_wreath', 0),
      step(55, 'coins', '', 150),
      step(75, 'decor', 'w_lanterns', 0),
      step(100, 'coins', '', 200),
      step(125, 'decor', 'w_cocoa', 0),
      step(150, 'outfit', 'earmuffs', 0),
      step(175, 'coins', '', 250),
      step(200, 'decor', 'w_snowman', 0),
    ],
    keepsakes: 'winter',
  }),
]);

export const SEASON_BY_ID = Object.freeze(Object.fromEntries(SEASONS.map((s) => [s.id, s])));
const isSeasonId = (id) => typeof id === 'string' && Object.prototype.hasOwnProperty.call(SEASON_BY_ID, id);

/** Every decoration any season's free path can give (sanitize keeps only these). */
export const DECOR_IDS = Object.freeze([...new Set(SEASONS.flatMap((s) => s.steps.filter((x) => x.kind === 'decor').map((x) => x.id)))]);

// ---------------------------------------------------------------- Season Keepsakes (docs/MARKET_MONETIZATION_3.md §1)
// One non-consumable per season theme ($2.99, src/meta/economy.js IAP): three café decorations and a postcard frame.
// Cosmetic only: no coins, no boosters, no café stars, and it never touches a score, a level, difficulty or an ad. It
// never expires: buyable during its season, after it and between seasons. It is keyed by theme ('harvest'), so a season
// that comes back next year keeps what was bought. Offered only on the season card (one calm line and a price), never
// at a fail, after an ad, on the result card or on the Home "New" card. The free path is unchanged.
const kdecor = (id) => Object.freeze(withText({ id, name: TEXT }, `keepsake.decor.${id}`));
export const KEEPSAKES = Object.freeze([
  Object.freeze(withText({
    id: 'harvest',
    product: 'season_harvest_keepsakes',
    name: TEXT,
    line: TEXT,
    decor: Object.freeze([
      kdecor('hk_lantern'),
      kdecor('hk_sunflowers'),
      kdecor('hk_wreath'),
    ]),
    frame: TEXT,
  }, 'keepsake.harvest')),
  Object.freeze(withText({
    id: 'winter',
    product: 'season_winter_keepsakes',
    name: TEXT,
    line: TEXT,
    decor: Object.freeze([
      kdecor('wk_tree'),
      kdecor('wk_sled'),
      kdecor('wk_star'),
    ]),
    frame: TEXT,
  }, 'keepsake.winter')),
]);
export const KEEPSAKE_BY_ID = Object.freeze(Object.fromEntries(KEEPSAKES.map((k) => [k.id, k])));
const isKeepsakeId = (id) => typeof id === 'string' && Object.prototype.hasOwnProperty.call(KEEPSAKE_BY_ID, id);

/** Every Season Keepsakes decoration, in table order. */
export const KEEPSAKE_DECOR_IDS = Object.freeze(KEEPSAKES.flatMap((k) => k.decor.map((d) => d.id)));

/** The keepsake set a store product id unlocks, or null. */
export function keepsakesOfProduct(productId) {
  return KEEPSAKES.find((k) => k.product === productId) || null;
}

/** Valid owned set ids, unique, in table order (save.js normalizeSave). Always a new array. */
export function cleanKeepsakes(list) {
  const raw = Array.isArray(list) ? list : [];
  return KEEPSAKES.map((k) => k.id).filter((id) => raw.includes(id));
}

/** True when this save owns the keepsake set (a verified, or in the web test build simulated, purchase). */
export function ownsKeepsakes(save, setId) {
  const p = save && save.purchases;
  return !!(p && Array.isArray(p.keepsakes) && isKeepsakeId(setId) && p.keepsakes.includes(setId));
}

/**
 * Grant a keepsake set. Call ONLY after a verified (or, in the web test build, simulated) purchase (economy.js grantIap).
 * A restore or a second delivery still confirms the order (true). False for a product that is not a keepsake set.
 */
export function grantKeepsakes(save, productId) {
  const k = keepsakesOfProduct(productId);
  if (!k) return false;
  if (!save.purchases || typeof save.purchases !== 'object' || Array.isArray(save.purchases)) save.purchases = { starterPack: false, firstPackBonus: false, seasons: [] };
  save.purchases.keepsakes = cleanKeepsakes([...(Array.isArray(save.purchases.keepsakes) ? save.purchases.keepsakes : []), k.id]);
  return true;
}

/** The first season (table order) that sells this keepsake set. */
function seasonOfKeepsakes(setId) {
  return SEASONS.find((s) => s.keepsakes === setId) || null;
}

/**
 * Keepsake sets that can be bought on `day`, in table order: this season's set and the sets of every season that has
 * already started (ended ones stay buyable for good). Owned sets are left out; sets of seasons still to come are never
 * shown. Nothing here reads ads, scores, spending or the device.
 */
export function keepsakesOffered(save, day) {
  if (typeof day !== 'string') return [];
  return KEEPSAKES.filter((k) => {
    const s = seasonOfKeepsakes(k.id);
    return !!s && day >= s.start && !ownsKeepsakes(save, k.id);
  });
}

/** Owned keepsake sets, in table order. */
export function keepsakesOwned(save) {
  return KEEPSAKES.filter((k) => ownsKeepsakes(save, k.id));
}

/**
 * The postcard frame to draw (a keepsake set id), or null when none is owned or the player turned it off. This season's
 * frame when it is owned, otherwise the last owned set in table order.
 */
export function keepsakeFrame(save, day) {
  if (save && save.seasonal && save.seasonal.frameOff === true) return null;
  const owned = keepsakesOwned(save);
  if (!owned.length) return null;
  const cur = seasonAt(day);
  const mine = cur && owned.find((k) => k.id === cur.keepsakes);
  return (mine || owned[owned.length - 1]).id;
}

/** The season running on this local day ('YYYY-MM-DD'), or null. */
export function seasonAt(day) {
  if (typeof day !== 'string') return null;
  for (const s of SEASONS) if (day >= s.start && day <= s.end) return s;
  return null;
}

/** Tokens a finished round gathers: decided by the round's outcome only (never ad state). */
export function roundTokens(res) {
  if (!res || typeof res !== 'object' || res.autoplay) return 0;
  if (res.mode === 'journey') {
    const drops = Number(res.dropsUsed) || 0;
    if (res.won) return 2 + Math.max(1, Math.min(3, Math.floor(Number(res.stars) || 0))); // 3..5
    return drops > 0 ? 1 : 0; // a played try still counts a little; quitting before any drop does not
  }
  if (res.mode === 'endless') {
    if (!((Number(res.drops) || 0) > 0)) return 0;
    return 1 + Math.min(4, Math.floor((Math.max(0, Number(res.merges) || 0)) / 15)); // 1..5
  }
  return 0;
}

/** Which slot a round fills: daily puzzles give pumpkins, levels apples, free play maple leaves. */
export function roundSlot(res) {
  if (!res || typeof res !== 'object') return 'free';
  if (res.mode === 'journey') return res.nebula ? 'daily' : 'level';
  return res.daily ? 'daily' : 'free';
}

export function defaultSeasonal() {
  return { id: '', n: 0, bag: { level: 0, daily: 0, free: 0 }, got: 0, seen: 0, met: '', decor: [], decorOff: false };
}

const nat = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Math.floor(Number(v)) : 0);

/** Repair save.seasonal in place (missing or malformed fields take their defaults). */
export function sanitizeSeasonal(save) {
  const raw = save.seasonal && typeof save.seasonal === 'object' && !Array.isArray(save.seasonal) ? save.seasonal : {};
  const id = isSeasonId(raw.id) ? raw.id : '';
  const steps = id ? SEASON_BY_ID[id].steps.length : 0;
  const b = raw.bag && typeof raw.bag === 'object' && !Array.isArray(raw.bag) ? raw.bag : {};
  const bag = { level: nat(b.level), daily: nat(b.daily), free: nat(b.free) };
  const got = Math.min(steps, nat(raw.got));
  const decorRaw = Array.isArray(raw.decor) ? raw.decor : [];
  save.seasonal = {
    id,
    n: id ? nat(raw.n) : 0,
    bag: id ? bag : { level: 0, daily: 0, free: 0 },
    got,
    seen: Math.min(got, nat(raw.seen)),
    met: isSeasonId(raw.met) ? raw.met : '',
    decor: DECOR_IDS.filter((d) => decorRaw.includes(d)),
    decorOff: raw.decorOff === true,
  };
  if (raw.frameOff === true) save.seasonal.frameOff = true; // Season Keepsakes postcard frame turned off (kept only when true)
  return save.seasonal;
}

function stateOf(save) {
  if (!save.seasonal || typeof save.seasonal !== 'object') save.seasonal = defaultSeasonal();
  return save.seasonal;
}

/** The season for `day`, with save.seasonal switched over to it (a new season starts its path from zero). */
export function ensureSeason(save, day) {
  const season = seasonAt(day);
  if (!season) return null;
  const s = stateOf(save);
  if (s.id !== season.id) {
    s.id = season.id; s.n = 0; s.bag = { level: 0, daily: 0, free: 0 }; s.got = 0; s.seen = 0;
  }
  return season;
}

function grant(save, st) {
  const s = stateOf(save);
  if (st.kind === 'coins') save.coins = (save.coins || 0) + st.amount;
  else if (st.kind === 'decor') { if (!s.decor.includes(st.id)) s.decor.push(st.id); }
  else if (st.kind === 'outfit') {
    if (!save.outfits || typeof save.outfits !== 'object') save.outfits = { owned: [], equipped: null };
    if (!Array.isArray(save.outfits.owned)) save.outfits.owned = [];
    if (!save.outfits.owned.includes(st.id)) save.outfits.owned.push(st.id);
  }
}

/**
 * Add `n` tokens of `slot` on `day`. Steps reached are granted at once (coins, decorations, outfits).
 * Returns { season, added, slot, granted: [step...] } or null when no season runs that day.
 */
export function addTokens(save, n, slot, day) {
  const season = ensureSeason(save, day);
  if (!season) return null;
  const s = stateOf(save);
  const add = nat(n);
  const k = SLOTS.includes(slot) ? slot : 'free';
  s.n += add;
  s.bag[k] = (s.bag[k] || 0) + add;
  const granted = [];
  while (s.got < season.steps.length && s.n >= season.steps[s.got].at) {
    const st = season.steps[s.got];
    grant(save, st);
    granted.push(st);
    s.got++;
  }
  return { season, added: add, slot: k, granted };
}

/** Book a finished round (main.js, after the run is settled). Null when no season runs or nothing was gathered. */
export function awardRound(save, res, day) {
  const n = roundTokens(res);
  if (n <= 0 || !seasonAt(day)) return null;
  return addTokens(save, n, roundSlot(res), day);
}

/** The token name for a count ("1 apple", "3 apples"). */
export function tokenWord(season, slot, n) {
  if (season && SEASON_BY_ID[season.id] === season && SLOTS.includes(slot)) return ctp(`season.${season.id}.token.${slot}`, n);
  const w = season && season.tokens[slot];
  if (!w) return tp('season.token', n);
  return pluralCategory(n) === 'one' ? w[0] : w[1]; // the locale's plural category (French "1,5", pt-BR 0 read "one")
}

/**
 * The shared grammatical gender of a season's token words, for lines that say "a few" about them (French
 * quelques-unes, Spanish unas cuantas): 'f' when every slot's word is feminine in the current locale's content table
 * (season.<id>.token.<slot>.g), else 'm'. Undefined in English or for an unregistered season (no variant is picked).
 */
export function tokenGender(season, slots = SLOTS) {
  if (!season || SEASON_BY_ID[season.id] !== season) return undefined;
  const g = slots.map((s) => ownText(`season.${season.id}.token.${s}.g`));
  if (!g[0]) return undefined;
  return g.every((x) => x === 'f') ? 'f' : 'm';
}

/** One quiet line for the result card, e.g. "Autumn Harvest: +4 apples · New: Pumpkins by the café door". */
export function seasonLine(award) {
  if (!award || !award.added) return null;
  const { season, added, slot, granted } = award;
  const line = t('season.line', { name: season.name, n: added.toLocaleString('en-US'), tokens: tokenWord(season, slot, added) });
  return granted.length ? t('season.lineNew', { line, names: listJoin(granted.map((g) => g.name)) }) : line;
}

/** Everything the season card shows, for `day`. Null outside a season. Read-only (does not switch seasons). */
export function seasonView(save, day) {
  const season = seasonAt(day);
  if (!season) return null;
  const s = save.seasonal && save.seasonal.id === season.id ? save.seasonal : null;
  const n = s ? s.n : 0;
  const got = s ? s.got : 0;
  const seen = s ? s.seen : 0;
  const bag = s ? { ...s.bag } : { level: 0, daily: 0, free: 0 };
  const steps = season.steps.map((st, i) => ({ ...st, index: i, got: i < got, left: Math.max(0, st.at - n), isNew: i < got && i >= seen }));
  const next = steps.find((x) => !x.got) || null;
  return { season, n, bag, got, newCount: Math.max(0, got - seen), steps, next, done: got >= season.steps.length };
}

/** The player looked at the path: nothing is "new" any more. */
export function markSeasonSeen(save, day) {
  const season = ensureSeason(save, day);
  if (!season) return;
  const s = stateOf(save);
  s.seen = s.got;
}

/** Every decoration this save has, shown or tucked away: earned ones, then owned Season Keepsakes ones. */
export function decorAll(save) {
  const s = save && save.seasonal;
  const earned = s && Array.isArray(s.decor) ? s.decor : [];
  const kept = keepsakesOwned(save).flatMap((k) => k.decor.map((d) => d.id));
  return kept.length ? earned.concat(kept) : earned;
}

/** Decorations to draw in the café (decorAll), unless the player tucked them away. */
export function decorShown(save) {
  const s = save && save.seasonal;
  if (s && s.decorOff) return [];
  return decorAll(save);
}

/** The decoration's display name (from whichever season or keepsake set gives it). */
export function decorName(id) {
  for (const s of SEASONS) for (const st of s.steps) if (st.kind === 'decor' && st.id === id) return st.name;
  for (const k of KEEPSAKES) for (const d of k.decor) if (d.id === id) return d.name;
  return id;
}
