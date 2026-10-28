// v3 save migration ("Nova's Seaside Café"): a one-time, fair conversion of the systems cut in v3.
// Pure function, no DOM, no Math.random. Unity mirrors it exactly in Scripts/Meta/MigrateV3.cs (fixtures:
// tools/export-fixtures.mjs migrateV3Fixtures -> unity/NovaDrop/Assets/NovaDrop/Tests/EditMode/Fixtures/migrate_v3.json,
// compared through migrationFixtureView below).
//
// DESIGN.md v3 "Ethics": a player never loses a paid or earned item when a system is cut. Owned items stay owned,
// owed rewards are paid, and leftover currency converts rounded UP to a multiple of 5. Scores and high scores are
// never touched.
//
// migrateV3(save, raw, now) runs at the end of normalizeSave, after every sanitizer:
//  - save: the merged, sanitised save. The cut systems' old keys (legacyCatalog LEGACY_KEYS) are still in it,
//    exactly as stored (unsanitised), because merge keeps every key.
//  - raw: the parsed stored data (null or {} for a brand-new save). Used to tell a new player from an existing one and
//    to read what the player had equipped before the new defaults applied.
// Idempotent: guarded by save.mig containing 'v3'. The cut keys are deleted on every run, so an old field never
// survives in a migrated save.
//
// Rules (docs/V3_PLAN.md §2):
//  stardust     coins += ceil5(stardust × 20/3); stardust and stardustEarned deleted.
//  capsules     deleted. Everything found in them stays owned.
//  season       free track: every reached, uncollected tier is paid (Stardust tiers as ceil5 coins, a nebula you
//               already own as 300 coins). Premium buyers (season.premium or season.bought) get the WHOLE premium
//               track of each season they bought, recorded in purchases.seasons. Deleted.
//  cometWeek    if this week's event is on, with points and the prize unclaimed: the prize nebula (300 coins when
//               all three are owned). Deleted.
//  atlas        complete but unpaid pages are paid. Deleted.
//  missions     finished but uncollected missions are paid. Deleted.
//  orbits       kept; today's stored rewards get the +65 coins that replace the cut Stardust.
//  evening      settings.eveningLook becomes 'auto' | 'off' (on before -> 'auto'); eveningOffer / eveningAsked deleted.
//  looks        everyone owns seaside / driftwood / seafoam (and the harbour backdrops, backdrops.js SEASIDE_BACKDROPS,
//               always unlocked). Existing players keep what they had equipped and their sound backdrop ('music'
//               if unset); brand-new saves start on the seaside board/combo, Simple Circles orbs ('basic'; Seaside Café
//               orbs are sold in the shop for new players, every older save keeps them: save.js predatesBasic) and the
//               'music' sound, the café songs (defaultSave).
//  keepers      kept; story beats up to and including the current chapter are marked seen.
//  cafe         created (defaultCafe) when missing.
// The result is a short, warm card: save.v3card = { lines: [...], seen: false, tryLook } (null for new players).
import { daysBetween, dayKey } from './daily.js';
import { STORY, storyChapterOf } from './keepers.js';
import { defaultCafe } from './cafeData.js';
import { BACKDROP_BY_ID } from '../game/backdrops.js';
import { normSoundBackdrop } from './soundBackdrop.js';
import {
  stardustToCoins, ceil5, LEGACY_SEASON, FREE_TRACK, FREE_DUPLICATE_COINS, seasonTierOf, themeOf, premiumTrack,
  LEGACY_COMET, COMET_PRIZES, ATLAS_PAGES, ATLAS_SEASON_PAGE, LEGACY_KEYS, OUTFIT_BY_ID,
} from './legacyCatalog.js';

export const MIG_V3 = 'v3';
/** Old orbit rewards [50, 70, 90] and bonus 75 each gained this many coins when their Stardust was cut. */
export const ORBIT_REWARD_RAISE = 65;
const OLD_ORBIT_REWARDS = [50, 70, 90];

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const int = (v, lo, hi) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : lo;
};
const fmt = (n) => Number(n).toLocaleString('en-US');
const nebulaName = (id) => (BACKDROP_BY_ID[id] && BACKDROP_BY_ID[id].name) || id;
const andList = (parts) => (parts.length <= 1 ? parts.join('') : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`);

function ownList(obj, key) {
  if (!isObj(obj[key])) obj[key] = {};
  if (!Array.isArray(obj[key].owned)) obj[key].owned = [];
  return obj[key].owned;
}
function addBackdrop(save, id) {
  if (!Array.isArray(save.backdropsOwned)) save.backdropsOwned = [];
  if (save.backdropsOwned.includes(id)) return false;
  save.backdropsOwned.push(id);
  return true;
}

/** Record a season premium purchase in purchases.seasons (sorted, unique). */
function recordSeason(save, n) {
  if (!isObj(save.purchases)) save.purchases = { starterPack: false, firstPackBonus: false, seasons: [] };
  const list = Array.isArray(save.purchases.seasons) ? save.purchases.seasons.filter((x) => Number.isInteger(x) && x >= 1) : [];
  if (!list.includes(n)) list.push(n);
  save.purchases.seasons = [...new Set(list)].sort((a, b) => a - b);
}

/**
 * Grant the WHOLE premium track of season n (its orb skin, Keeper outfit and two nebulas) and record the purchase.
 * Used by the migration and by economy.grantIap for a restored or late 'starlight_season_s<n>' purchase.
 * Idempotent; returns true for any valid season number.
 */
export function grantSeasonTrack(save, n) {
  if (!Number.isInteger(n) || n < 1) return false;
  const p = premiumTrack(n);
  const skins = ownList(save, 'skins');
  if (!skins.includes(p.skin)) skins.push(p.skin);
  const outfits = ownList(save, 'outfits');
  if (OUTFIT_BY_ID[p.outfit] && !outfits.includes(p.outfit)) outfits.push(p.outfit);
  if (!('equipped' in save.outfits)) save.outfits.equipped = null;
  for (const id of p.nebulas) addBackdrop(save, id);
  recordSeason(save, n);
  return true;
}

/** Comet Week event number running on `now`, or null (the cut calendar: every 21 days, 7 days long). */
export function legacyCometEvent(now) {
  const d = daysBetween(LEGACY_COMET.epoch, dayKey(now));
  if (d == null || d < 0) return null;
  const ev = Math.floor(d / LEGACY_COMET.period);
  return d - ev * LEGACY_COMET.period < LEGACY_COMET.days ? ev : null;
}

/** Repair save.v3card in place: { lines: string[], seen: bool, tryLook: bool } or null. */
export function sanitizeV3Card(save) {
  const c = save.v3card;
  if (!isObj(c) || !Array.isArray(c.lines)) { save.v3card = null; return null; }
  save.v3card = { lines: c.lines.filter((l) => typeof l === 'string').slice(0, 12), seen: c.seen === true, tryLook: c.tryLook === true };
  return save.v3card;
}

function payStardust(save, out) {
  const d = int(save.stardust, 0, 1e9);
  if (d <= 0) return;
  const coins = stardustToCoins(d);
  out.coins += coins;
  out.lines.push(`Your ${fmt(d)} Stardust became ${fmt(coins)} coins.`);
}

function paySeason(save, out) {
  const s = save.season;
  if (!isObj(s)) return;
  const n = Number.isInteger(s.n) && s.n >= 1 ? s.n : null;
  if (n) {
    const tier = seasonTierOf(int(s.xp, 0, LEGACY_SEASON.tiers * LEGACY_SEASON.tierXp));
    let coins = 0, boosters = 0;
    let nebula = null;
    for (let t = int(s.free, 0, LEGACY_SEASON.tiers) + 1; t <= tier; t++) {
      const r = FREE_TRACK[t - 1];
      if (r.kind === 'coins') coins += r.amount;
      else if (r.kind === 'stardust') coins += stardustToCoins(r.amount);
      else if (r.kind === 'booster') {
        if (!isObj(save.boosters)) save.boosters = { comet: 0, wild: 0, shuffle: 0 };
        save.boosters[r.ref] = int(save.boosters[r.ref], 0, 1e6) + r.amount;
        boosters += r.amount;
      } else if (r.kind === 'nebula') {
        const id = themeOf(n).nebulas[r.slot];
        if (addBackdrop(save, id)) nebula = id; else coins += FREE_DUPLICATE_COINS;
      }
    }
    if (coins || boosters || nebula) {
      out.coins += coins;
      const parts = [];
      if (coins) parts.push(`${fmt(coins)} coins`);
      if (boosters) parts.push(`${boosters} booster${boosters > 1 ? 's' : ''}`);
      if (nebula) parts.push(`the ${nebulaName(nebula)} nebula`);
      out.lines.push(`Your Starlight Season rewards were added: ${andList(parts)}.`);
    }
  }
  const bought = new Set(Array.isArray(s.bought) ? s.bought.filter((x) => Number.isInteger(x) && x >= 1) : []);
  if (n && s.premium === true) bought.add(n);
  const list = [...bought].sort((a, b) => a - b);
  for (const b of list) grantSeasonTrack(save, b);
  if (list.length) {
    out.lines.push(`Thank you for buying Starlight Season ${andList(list.map(String))}. ${list.length > 1 ? 'Their whole premium tracks are' : 'Its whole premium track is'} yours to keep.`);
  }
}

function payComet(save, out, now) {
  const c = save.cometWeek;
  if (!isObj(c)) return;
  const ev = legacyCometEvent(now);
  if (ev == null || c.ev !== ev || int(c.pts, 0, 1e6) <= 0 || c.got) return;
  const owned = Array.isArray(save.backdropsOwned) ? save.backdropsOwned : [];
  const prize = COMET_PRIZES.find((id) => !owned.includes(id));
  if (prize) {
    addBackdrop(save, prize);
    out.lines.push(`Your Comet Week points earned the ${nebulaName(prize)} nebula.`);
  } else {
    out.coins += LEGACY_COMET.dupCoins;
    out.lines.push(`Your Comet Week points earned ${fmt(LEGACY_COMET.dupCoins)} coins.`);
  }
}

function payAtlas(save, out) {
  const a = save.atlas;
  if (!isObj(a)) return;
  const got = isObj(a.got) ? a.got : {};
  const sgot = isObj(a.sgot) ? a.sgot : {};
  const paid = Array.isArray(a.pages) ? a.pages : [];
  let coins = 0;
  for (const p of ATLAS_PAGES) if (!paid.includes(p.id) && p.stickers.every((id) => id in got)) coins += p.reward;
  if (a.spaid !== true && ATLAS_SEASON_PAGE.stickers.every((id) => id in sgot)) coins += ATLAS_SEASON_PAGE.reward;
  if (coins) {
    out.coins += coins;
    out.lines.push(`Your finished Star Atlas pages paid ${fmt(coins)} coins.`);
  }
}

function payMissions(save, out) {
  const m = save.missions;
  if (!isObj(m) || !Array.isArray(m.list)) return;
  let coins = 0;
  for (const x of m.list) if (isObj(x) && x.done === true && x.claimed !== true) coins += int(x.reward, 0, 10000);
  if (coins) {
    out.coins += coins;
    out.lines.push(`Daily Missions you had finished paid ${fmt(coins)} coins.`);
  }
}

function raiseOrbits(save) {
  const o = save.orbits;
  if (!isObj(o) || !Array.isArray(o.list)) return;
  for (const m of o.list) if (isObj(m) && OLD_ORBIT_REWARDS.includes(m.reward)) m.reward += ORBIT_REWARD_RAISE;
}

/** Existing players keep the look they had equipped (the new seaside defaults are for brand-new saves). */
function keepLook(save, raw) {
  const rs = isObj(raw.skins) ? raw.skins : {};
  save.skins.equipped = typeof rs.equipped === 'string' && save.skins.owned.includes(rs.equipped) ? rs.equipped : 'classic';
  for (const [key, def] of [['boardSkins', 'nova'], ['comboSkins', 'stardust']]) {
    const r = isObj(raw[key]) ? raw[key] : {};
    const v = save[key];
    if (!isObj(v) || !Array.isArray(v.owned)) continue;
    v.equipped = typeof r.equipped === 'string' && v.owned.includes(r.equipped) ? r.equipped : def;
  }
  const rset = isObj(raw.settings) ? raw.settings : {};
  if (typeof rset.backdrop !== 'string' || !rset.backdrop) save.settings.backdrop = 'auto';
  // Sound: what they had (old saves without the field always heard the songs); new players start on 'music' too
  save.settings.soundBackdrop = normSoundBackdrop(rset.soundBackdrop);
  // Evening wind-down: only a player who had turned the evening look on gets the automatic one
  save.settings.eveningLook = rset.eveningLook === true || rset.eveningLook === 'auto' ? 'auto' : 'off';
}

function seeStory(save) {
  const k = save.keepers;
  if (!isObj(k) || !Array.isArray(k.story)) return;
  const cur = Math.min(STORY.length - 1, storyChapterOf(save.journey && save.journey.level));
  for (let c = 0; c <= cur; c++) if (!k.story.includes(c)) k.story.push(c);
  k.story.sort((a, b) => a - b);
}

function dropLegacy(save) {
  for (const k of LEGACY_KEYS) delete save[k];
  if (isObj(save.settings)) delete save.settings.eveningOffer;
}

/**
 * Run the one-time v3 migration on a normalised save. Returns the save. See the header for the rules.
 */
export function migrateV3(save, raw, now = new Date()) {
  if (!Array.isArray(save.mig)) save.mig = [];
  save.mig = save.mig.filter((x, i, a) => typeof x === 'string' && a.indexOf(x) === i);
  if (!isObj(save.cafe)) save.cafe = defaultCafe();
  sanitizeV3Card(save);
  if (save.mig.includes(MIG_V3)) { dropLegacy(save); return save; }

  const existing = isObj(raw) && Object.keys(raw).length > 0; // {} or nothing stored: a brand-new player
  const out = { coins: 0, lines: [] };
  if (existing) {
    payStardust(save, out);
    paySeason(save, out);
    payComet(save, out, now);
    payAtlas(save, out);
    payMissions(save, out);
    raiseOrbits(save);
    keepLook(save, raw);
    seeStory(save);
  }
  if (out.coins) save.coins = int(save.coins, 0, Number.MAX_SAFE_INTEGER) + out.coins;
  dropLegacy(save);
  save.mig.push(MIG_V3);
  if (existing) {
    const tryLook = save.skins.equipped !== 'seaside';
    const lines = ["Welcome to Nova's Seaside Café. Everything you owned is still yours.", ...out.lines];
    if (tryLook) lines.push('Try the Seaside look any time in the Wardrobe.');
    save.v3card = { lines, seen: false, tryLook };
  } else {
    save.v3card = null;
  }
  return save;
}

export { ceil5, stardustToCoins };

/** Recursively key-sorted copy (canonical JSON: the C# side compares the same text). */
function canon(v) {
  if (Array.isArray(v)) return v.map(canon);
  if (isObj(v)) { const o = {}; for (const k of Object.keys(v).sort()) o[k] = canon(v[k]); return o; }
  return v === undefined ? null : v;
}

/**
 * The parts of a loaded save the v3 migration decides, in canonical key order: what the parity fixtures
 * (migrate_v3.json) record per case, and what MigrateV3.cs must reproduce. `legacy` lists any cut key still present
 * (always [] after a migration).
 */
export function migrationFixtureView(s) {
  const pick = (o, keys) => (isObj(o) ? Object.fromEntries(keys.map((k) => [k, o[k] === undefined ? null : o[k]])) : null);
  return canon({
    coins: s.coins, best: s.best, boosters: s.boosters,
    skins: pick(s.skins, ['owned', 'equipped']), boardSkins: pick(s.boardSkins, ['owned', 'equipped']),
    comboSkins: pick(s.comboSkins, ['owned', 'equipped']), outfits: pick(s.outfits, ['owned', 'equipped']),
    keepers: pick(s.keepers, ['owned', 'equipped', 'story']),
    backdropsOwned: s.backdropsOwned, scenesOwned: s.scenesOwned,
    backdrop: s.settings.backdrop, eveningLook: s.settings.eveningLook, soundBackdrop: s.settings.soundBackdrop,
    seasons: s.purchases.seasons, orbitRewards: isObj(s.orbits) && Array.isArray(s.orbits.list) ? s.orbits.list.map((m) => m.reward) : [],
    v3card: s.v3card, mig: s.mig, hasCafe: isObj(s.cafe),
    legacy: LEGACY_KEYS.filter((k) => k in s).concat('eveningOffer' in s.settings ? ['eveningOffer'] : []),
  });
}
