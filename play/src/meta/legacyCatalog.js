// Frozen catalogue of the systems cut in v3 (Star Capsules, Stardust, Starlight Season, Comet Week, Star Atlas,
// Daily Missions). Nothing here is live any more: it is the data the one-time save migration (src/meta/migrateV3.js)
// and Transfer progress (src/meta/transfer.js) still need, so an old save or an old ND1- code always converts the
// same way and no owned or paid item is ever lost. Never edit these values: the C# port (MigrateV3.cs) and the
// migration fixtures (tools/export-fixtures.mjs, migrateV3Fixtures) mirror them exactly.

/** 1 Stardust = 20/3 coins: the old Sky scene price was 3,000 coins or 450 Stardust. */
export const STARDUST_COINS_NUM = 20;
export const STARDUST_COINS_DEN = 3;

/** Round a coin amount UP to a multiple of 5 (every conversion is generous, never short). */
export const ceil5 = (n) => Math.ceil(Math.max(0, Number(n) || 0) / 5) * 5;

/** Coins for an amount of Stardust: ceil5(stardust × 20 / 3). Integer math, so JS and C# agree exactly. */
export function stardustToCoins(dust) {
  const d = Math.max(0, Math.floor(Number(dust) || 0));
  return ceil5(Math.ceil((d * STARDUST_COINS_NUM) / STARDUST_COINS_DEN));
}

// ---------------------------------------------------------------- Starlight Season (cut)

export const LEGACY_SEASON = Object.freeze({ id: 'starlight_season', epoch: '2026-10-19', days: 56, tiers: 30, tierXp: 140 });

/** Keeper outfits (season premium track). Still owned and worn; no longer earnable. */
export const OUTFITS = Object.freeze([
  Object.freeze({ id: 'flower', name: 'Flower Crown' }),
  Object.freeze({ id: 'moonpin', name: 'Moon Clip' }),
  Object.freeze({ id: 'scarf', name: 'Warm Scarf' }),
  Object.freeze({ id: 'halo', name: 'Frost Halo' }),
]);
export const OUTFIT_BY_ID = Object.freeze(Object.fromEntries(OUTFITS.map((o) => [o.id, o])));

/** Season themes, cycling every 4 seasons. nebulas: [free tier 15, premium tier 20, premium tier 30]. */
export const THEMES = Object.freeze([
  Object.freeze({ name: 'Comet Bloom', skin: 'blossom', outfit: 'flower', nebulas: Object.freeze(['sn_sprout', 'sn_petal', 'sn_bloom']) }),
  Object.freeze({ name: 'Silver Moon', skin: 'moonstone', outfit: 'moonpin', nebulas: Object.freeze(['sn_silver', 'sn_lunar', 'sn_moonrise']) }),
  Object.freeze({ name: 'Ember Dawn', skin: 'cinder', outfit: 'scarf', nebulas: Object.freeze(['sn_dawn', 'sn_hearth', 'sn_sunrise']) }),
  Object.freeze({ name: 'Frost Halo', skin: 'frost', outfit: 'halo', nebulas: Object.freeze(['sn_snow', 'sn_glacier', 'sn_halo']) }),
]);

export function themeOf(n) {
  const i = (((Math.floor(Number(n) || 1) - 1) % THEMES.length) + THEMES.length) % THEMES.length;
  return THEMES[i];
}

const c = (amount) => Object.freeze({ kind: 'coins', amount });
const dust = (amount) => Object.freeze({ kind: 'stardust', amount });
const boost = (ref) => Object.freeze({ kind: 'booster', ref, amount: 1 });
/** The free track, index 0 = tier 1. A 'nebula' entry is THEMES[].nebulas[0]. */
export const FREE_TRACK = Object.freeze([
  c(100), c(100), c(150), c(150), dust(50),
  c(200), c(200), boost('comet'), c(200), c(250),
  c(250), boost('wild'), c(250), c(300), Object.freeze({ kind: 'nebula', slot: 0 }),
  c(300), c(300), boost('shuffle'), c(300), dust(75),
  c(350), c(350), boost('comet'), c(350), dust(100),
  c(400), boost('wild'), c(400), c(450), c(750),
]);
/** A free-track cosmetic the player already owned turned into this many coins. */
export const FREE_DUPLICATE_COINS = 300;

export const seasonTierOf = (xp) => Math.min(LEGACY_SEASON.tiers, Math.floor(Math.max(0, Number(xp) || 0) / LEGACY_SEASON.tierXp));

/** The whole premium track of season n (cosmetics only): its orb skin, its Keeper outfit and two nebulas. */
export function premiumTrack(n) {
  const t = themeOf(n);
  return { skin: t.skin, outfit: t.outfit, nebulas: [t.nebulas[1], t.nebulas[2]] };
}

/** Store product id of season n ('starlight_season_s3'); restore-purchase still grants these. */
export const seasonProductId = (n) => `${LEGACY_SEASON.id}_s${n}`;
/** Season number of a per-season product id, or null ('starlight_season_s3' -> 3). */
export function seasonOfProduct(id) {
  const m = typeof id === 'string' ? /^starlight_season_s(\d+)$/.exec(id) : null;
  const n = m ? Number(m[1]) : 0;
  return n >= 1 ? n : null;
}

export const SEASON_SKINS = Object.freeze(THEMES.map((t) => t.skin));
/** Paid-only (premium track) items, kept on the local device by Transfer progress. */
export const PAID_OUTFITS = Object.freeze(OUTFITS.map((o) => o.id));
export const PAID_NEBULAS = Object.freeze(THEMES.flatMap((t) => t.nebulas.slice(1)));

// ---------------------------------------------------------------- Comet Week (cut)

export const LEGACY_COMET = Object.freeze({ epoch: '2026-10-19', period: 21, days: 7, dupCoins: 300 });
export const COMET_PRIZES = Object.freeze(['cw_tail', 'cw_ion', 'cw_coma']);

// ---------------------------------------------------------------- Star Capsules (cut)

/** Nebulas that came only from Star Capsules; now sold for coins in the Cosmic pack (src/meta/scenes.js buyNebula). */
export const CAPSULE_NEBULAS = Object.freeze(['mint', 'peach', 'lilac', 'ocean', 'opal']);

// ---------------------------------------------------------------- Star Atlas (cut)

/** Pages and the stickers that complete them. A complete page that was never paid is paid by the migration. */
export const ATLAS_PAGES = Object.freeze([
  Object.freeze({ id: 'first', reward: 100, stickers: Object.freeze(['first_level', 'planet', 'three_star', 'chain3', 'gas_giant', 'nebula']) }),
  Object.freeze({ id: 'bright', reward: 150, stickers: Object.freeze(['supernova', 'chain5', 'sector5', 'super_hard', 'constellation', 'streak3']) }),
  Object.freeze({ id: 'voyage', reward: 200, stickers: Object.freeze(['level30', 'stars100', 'zen', 'daily7', 'comet', 'games100']) }),
]);
export const ATLAS_SEASON_PAGE = Object.freeze({ id: 'season', reward: 150, stickers: Object.freeze(['s_days5', 's_tier5', 's_nebula3', 's_days15', 's_comet', 's_tier15']) });

// ---------------------------------------------------------------- old save keys

/**
 * Top-level save keys of the cut systems. normalizeSave lets them through (merge keeps every key) so migrateV3 can
 * convert them, and Transfer progress keeps them in an imported old code for the same reason. migrateV3 deletes them.
 */
export const LEGACY_KEYS = Object.freeze(['stardust', 'stardustEarned', 'capsules', 'season', 'cometWeek', 'atlas', 'missions', 'eveningAsked']);
