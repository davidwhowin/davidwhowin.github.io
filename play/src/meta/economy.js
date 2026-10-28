// Coin economy + shop catalogue.
import { PASS, PASS_YEAR, PASS_TOTAL_COINS, grantPass, grantPassYear } from './pass.js';
import { seasonOfProduct } from './legacyCatalog.js';
import { grantSeasonTrack } from './migrateV3.js';
import {
  PACKS, packAllPacks, packProduct, grantPackProduct, ownsAnyOfPack, packPieces, ownsPiece,
  PACK_FINISH_CENTS, SHELF_FINISH_CENTS, packFinishProduct, shelfFinishProduct, packBuysOf, recordPackBuy,
} from './packs.js';
import { keepsakesOfProduct, grantKeepsakes } from './seasonal.js';
import { isTip, grantTip } from './tips.js';
import { withText, TEXT } from '../i18n/index.js';

export const UPGRADES = [
  { id: 'startHold', name: 'Start with Hold Slot', desc: 'Every run begins with the Hold Slot perk.', costs: [500] },
  { id: 'startPerk', name: 'Opening Perk Pick', desc: 'Pick a free perk at the start of every run.', costs: [1200] },
  { id: 'coinLevel', name: 'Coin Bonus', desc: '+10% coins per level.', costs: [300, 800, 2000] },
  { id: 'extraComet', name: 'Extra Comet', desc: 'Start each run with 1 comet charge.', costs: [700] },
];

export const SKINS = [
  // Default look: free, owned by everyone, equipped on brand-new saves. Each tier is a café treat or prop (mint drop
  // up to the cake stand) with a big number in the middle (art: src/game/cafeClassicsArt.js). It always shows the
  // number, whatever the Numbers setting. Saves still on Simple Circles from when that was the default move to it
  // once (src/meta/save.js normalizeSave).
  { id: 'cafeclassics', name: TEXT, cost: 0, desc: TEXT },
  // Free, owned by everyone: one clear colour per tier with a big number in the middle (art: src/game/orbArt.js
  // drawBasic), for players who want the plainest, clearest look. Always shows the number.
  { id: 'basic', name: TEXT, cost: 0, desc: TEXT },
  // The v3 café treasures (art: src/game/seasideArt.js). Sold for coins since Simple Circles became the default;
  // every save from before that change owns it (src/meta/save.js normalizeSave), so nobody loses it.
  { id: 'seaside', name: TEXT, cost: 2500, desc: TEXT },
  // The original space orbs: part of the free Cosmic pack (src/game/backdrops.js COSMIC_PACK), shown as "Cosmic".
  { id: 'classic', name: TEXT, cost: 0, desc: TEXT },
  { id: 'neon', name: TEXT, cost: 1500, desc: TEXT },
  { id: 'candy', name: TEXT, cost: 2500, desc: TEXT },
  { id: 'gold', name: TEXT, cost: 5000, desc: TEXT },
  // The old Café Club exclusive. Café Club 2.0 gives café keepsakes instead (src/meta/pass.js); whoever has Aurora keeps
  // it, and it stays in the Cosmic piece styles for coins.
  { id: 'aurora', name: TEXT, cost: 4000, desc: TEXT },
  // Former Star Capsule skins (capsules were cut in v3): now sold directly for coins in the Cosmic pack.
  { id: 'pearl', name: TEXT, cost: 3000, desc: TEXT },
  { id: 'prism', name: TEXT, cost: 6000, desc: TEXT },
  // Former Starlight Season premium track skins (the season was cut in v3): never sold (cost null), kept forever by
  // whoever earned or bought them. Listed only once owned.
  { id: 'blossom', name: TEXT, cost: null, season: true, desc: TEXT },
  { id: 'moonstone', name: TEXT, cost: null, season: true, desc: TEXT },
  { id: 'cinder', name: TEXT, cost: null, season: true, desc: TEXT },
  { id: 'frost', name: TEXT, cost: null, season: true, desc: TEXT },
  // Premium themed pack (src/meta/packs.js): never sold for coins (cost null). Real money, bundle or single, kept forever.
  { id: 'sushi', name: TEXT, cost: null, pack: 'sushi', desc: TEXT },
  { id: 'koi', name: TEXT, cost: null, pack: 'koi', desc: TEXT },
  { id: 'cat', name: TEXT, cost: null, pack: 'cat', desc: TEXT },
  { id: 'patisserie', name: TEXT, cost: null, pack: 'patisserie', desc: TEXT },
  { id: 'deepsea', name: TEXT, cost: null, pack: 'deepsea', desc: TEXT },
  { id: 'garden', name: TEXT, cost: null, pack: 'garden', desc: TEXT },
].map((s) => withText(s, `skin.${s.id}`)); // name and desc: content text skin.<id>.* (docs/LOCALISATION.md phase 4c)

export function upgradeLevel(save, id) {
  const v = save.upgrades[id];
  return typeof v === 'number' ? v : v ? 1 : 0;
}

export function upgradeCost(save, id) {
  const u = UPGRADES.find((x) => x.id === id);
  if (!u) return null;
  const lvl = upgradeLevel(save, id);
  return lvl < u.costs.length ? u.costs[lvl] : null; // null = maxed
}

export function buyUpgrade(save, id) {
  const cost = upgradeCost(save, id);
  if (cost == null || save.coins < cost) return false;
  save.coins -= cost;
  if (id === 'coinLevel') save.upgrades.coinLevel = upgradeLevel(save, id) + 1;
  else save.upgrades[id] = true;
  return true;
}

export function buySkin(save, id) {
  const s = SKINS.find((x) => x.id === id);
  if (!s || s.cost == null || save.skins.owned.includes(id) || save.coins < s.cost) return false;
  save.coins -= s.cost;
  save.skins.owned.push(id);
  save.skins.equipped = id;
  return true;
}

export function equipSkin(save, id) {
  if (!save.skins.owned.includes(id)) return false;
  save.skins.equipped = id;
  return true;
}

/** Coins earned per run = floor(score/50) + sector×10, × perk/upgrade bonus. */
export function runCoins(score, sector, { perkBonus = 0, coinLevel = 0 } = {}) {
  const base = Math.floor(score / 50) + sector * 10;
  return Math.floor(base * (1 + perkBonus + 0.1 * coinLevel));
}

export function addCoins(save, n) {
  save.coins = Math.max(0, Math.floor(save.coins + n));
}

// ---------------------------------------------------------------- Journey boosters + IAP stubs

export const BOOSTERS = {
  comet: { id: 'comet', name: 'Comet', price: 300, desc: 'Vaporise any orb or asteroid.' },
  wild: { id: 'wild', name: 'Wild Orb', price: 250, desc: 'Your current orb matches its biggest neighbour.' },
  shuffle: { id: 'shuffle', name: 'Shuffle Column', price: 200, desc: 'Reorder one column to find new merges.' },
};

export function buyBooster(save, id, qty = 1) {
  const b = BOOSTERS[id];
  if (!b) return false;
  const cost = b.price * qty;
  if (save.coins < cost) return false;
  save.coins -= cost;
  save.boosters[id] = (save.boosters[id] || 0) + qty;
  return true;
}

// Real-money items. In the web build these are STUBS (no charge); Unity/native wires real IAP.
// `usd` is the numeric price (US tier) used for honest value math; `price` is the display string.
export const IAP = [
  { id: 'nova_pass', name: 'Café Club', price: '$4.99', usd: 4.99, pass: true, desc: '30 days. Does not renew.' },
  { id: 'nova_pass_year', name: 'Café Club · 12 months', price: '$19.99', usd: 19.99, pass: true, blocks: PASS_YEAR.blocks, desc: '12 months, paid once. Does not renew.' },
  { id: 'coins_s', name: 'Pouch of Coins', coins: 1200, price: '$0.99', usd: 0.99 },
  { id: 'coins_m', name: 'Chest of Coins', coins: 6500, price: '$4.99', usd: 4.99 }, // the shop shows its real bonus (+7% more, src/meta/shopMenu.js), never a popularity claim
  { id: 'coins_l', name: 'Vault of Coins', coins: 14000, price: '$9.99', usd: 9.99 }, // +16% more
  { id: 'starter', name: 'Starter Pack', coins: 2500, boosters: { comet: 3, wild: 3, shuffle: 3 }, price: '$1.99', usd: 1.99, oneTime: true },
  { id: 'remove_ads', name: 'Remove Ads', price: '$4.99', usd: 4.99, oneTime: true, removeAds: true, desc: 'No ad breaks between levels. Optional reward ads stay.' },
  // Remove Ads plus coins and boosters (DESIGN.md "Remove Ads and the No Ads Bundle"). Offered only while Remove Ads is
  // not owned; never at a fail or after an ad. The coins and boosters come once per save (purchases.noAdsBundle).
  { id: 'no_ads_bundle', name: 'No Ads Bundle', coins: 6500, boosters: { comet: 3, wild: 3, shuffle: 3 }, price: '$7.99', usd: 7.99, oneTime: true, removeAds: true, desc: 'Remove Ads, 6,500 coins and 3 of each booster.' },
  // Collector's Shelf: every premium pack at once (src/meta/packs.js PACK_ALL). Offered only while no piece of any pack is owned.
  // Thank-you tips (src/meta/tips.js): consumables, sold only in Settings › Extras › About Nova Drop. A warm thank-you
  // and, on the first tip of any size, a tip jar on the café counter. No coins, no boosters, no gameplay, no tiers.
  { id: 'tip_small', name: 'Small tip', tip: true, price: '$0.99', usd: 0.99, desc: 'A thank-you to the team. It doesn’t unlock anything else.' },
  { id: 'tip_medium', name: 'Medium tip', tip: true, price: '$2.99', usd: 2.99, desc: 'A thank-you to the team. It doesn’t unlock anything else.' },
  { id: 'tip_large', name: 'Large tip', tip: true, price: '$4.99', usd: 4.99, desc: 'A thank-you to the team. It doesn’t unlock anything else.' },
  { id: 'pack_all', name: 'Collector’s Shelf', packAll: true, oneTime: true, price: '$9.99', usd: 9.99, desc: 'All six premium packs: every skin, look and background in them. Packs added later are not included. Cosmetic only, yours to keep.' },
  // Premium themed pack (src/meta/packs.js): one-time, cosmetics only. The bundle, then each piece singly.
  // Shown in Shop › Packs (not the Buy coins tab). Product ids avoid the word "scene" (Sky scenes are never sold for money).
  { id: 'pack_sushi', name: 'Sushi Bar Pack', pack: 'sushi', oneTime: true, price: '$2.99', usd: 2.99, desc: 'Sushi Bar orb skin (with its Hinoki Board and Sakura Sign combo look) + Sushi Counter + Sakura Garden backgrounds. Cosmetic only, yours to keep.' },
  { id: 'skin_sushi', name: 'Sushi Bar Skin', pack: 'sushi', oneTime: true, price: '$1.99', usd: 1.99, desc: 'The animated Sushi Bar orb skin, with its Hinoki Board and Sakura Sign combo look. Cosmetic only, yours to keep.' },
  { id: 'bg_sushi_counter', name: 'Sushi Counter', pack: 'sushi', oneTime: true, price: '$0.99', usd: 0.99, desc: 'Animated sushi bar background. Cosmetic only, yours to keep.' },
  { id: 'bg_sakura_garden', name: 'Sakura Garden', pack: 'sushi', oneTime: true, price: '$0.99', usd: 0.99, desc: 'Animated cherry blossom background. Cosmetic only, yours to keep.' },
  { id: 'pack_koi', name: 'Koi Pond Pack', pack: 'koi', oneTime: true, price: '$2.99', usd: 2.99, desc: 'Koi Pond orb skin (with its Stone Pond board and Pond Ripples combo look) + Lily Pond + Rainy Temple backgrounds. Cosmetic only, yours to keep.' },
  { id: 'skin_koi', name: 'Koi Pond Skin', pack: 'koi', oneTime: true, price: '$1.99', usd: 1.99, desc: 'The animated Koi Pond orb skin, with its Stone Pond board and Pond Ripples combo look. Cosmetic only, yours to keep.' },
  { id: 'bg_lily_pond', name: 'Lily Pond', pack: 'koi', oneTime: true, price: '$0.99', usd: 0.99, desc: 'Animated twilight pond background. Cosmetic only, yours to keep.' },
  { id: 'bg_rain_temple', name: 'Rainy Temple', pack: 'koi', oneTime: true, price: '$0.99', usd: 0.99, desc: 'Animated rainy temple background. Cosmetic only, yours to keep.' },
  { id: 'pack_cat', name: 'Cat Café Pack', pack: 'cat', oneTime: true, price: '$2.99', usd: 2.99, desc: 'Cat Café skin (with its Café Cushion board and Paws & Hearts combo look) + Rainy Café + Rooftop Night backgrounds. Cosmetic only, yours to keep.' },
  { id: 'skin_cat', name: 'Cat Café Skin', pack: 'cat', oneTime: true, price: '$1.99', usd: 1.99, desc: 'The animated Cat Café skin, with its Café Cushion board and Paws & Hearts combo look. Cosmetic only, yours to keep.' },
  { id: 'bg_rainy_cafe', name: 'Rainy Café', pack: 'cat', oneTime: true, price: '$0.99', usd: 0.99, desc: 'Animated rainy café background. Cosmetic only, yours to keep.' },
  { id: 'bg_rooftop_night', name: 'Rooftop Night', pack: 'cat', oneTime: true, price: '$0.99', usd: 0.99, desc: 'Animated moonlit rooftop background. Cosmetic only, yours to keep.' },
  { id: 'pack_patisserie', name: 'Patisserie Pack', pack: 'patisserie', oneTime: true, price: '$2.99', usd: 2.99, desc: 'Patisserie skin (with its Marble Tray board and Sprinkles combo look) + Pâtisserie Counter + Pastel Rooftop backgrounds. Cosmetic only, yours to keep.' },
  { id: 'skin_patisserie', name: 'Patisserie Skin', pack: 'patisserie', oneTime: true, price: '$1.99', usd: 1.99, desc: 'The animated Patisserie skin, with its Marble Tray board and Sprinkles combo look. Cosmetic only, yours to keep.' },
  { id: 'bg_patisserie_counter', name: 'Pâtisserie Counter', pack: 'patisserie', oneTime: true, price: '$0.99', usd: 0.99, desc: 'Animated pâtisserie counter background. Cosmetic only, yours to keep.' },
  { id: 'bg_pastel_rooftop', name: 'Pastel Rooftop', pack: 'patisserie', oneTime: true, price: '$0.99', usd: 0.99, desc: 'Animated pastel rooftop background with string lights. Cosmetic only, yours to keep.' },
  { id: 'pack_deepsea', name: 'Deep Sea Pack', pack: 'deepsea', oneTime: true, price: '$2.99', usd: 2.99, desc: 'Deep Sea skin (with its Abyss Glass board and Bubbles combo look) + Coral Reef + The Abyss backgrounds. Cosmetic only, yours to keep.' },
  { id: 'skin_deepsea', name: 'Deep Sea Skin', pack: 'deepsea', oneTime: true, price: '$1.99', usd: 1.99, desc: 'The animated Deep Sea skin, with its Abyss Glass board and Bubbles combo look. Cosmetic only, yours to keep.' },
  { id: 'bg_coral_reef', name: 'Coral Reef', pack: 'deepsea', oneTime: true, price: '$0.99', usd: 0.99, desc: 'Animated sunlit coral reef background. Cosmetic only, yours to keep.' },
  { id: 'bg_abyss', name: 'The Abyss', pack: 'deepsea', oneTime: true, price: '$0.99', usd: 0.99, desc: 'Animated deep-sea background with a glowing anglerfish. Cosmetic only, yours to keep.' },
  { id: 'pack_garden', name: 'Cottage Garden Pack', pack: 'garden', oneTime: true, price: '$2.99', usd: 2.99, desc: 'Cottage Garden skin (with its Potting Bench board and Garden Petals combo look) + Potting Shed + Summer Border backgrounds. Cosmetic only, yours to keep.' },
  { id: 'skin_garden', name: 'Cottage Garden Skin', pack: 'garden', oneTime: true, price: '$1.99', usd: 1.99, desc: 'The animated Cottage Garden skin, with its Potting Bench board and Garden Petals combo look. Cosmetic only, yours to keep.' },
  { id: 'bg_garden_shed', name: 'Potting Shed', pack: 'garden', oneTime: true, price: '$0.99', usd: 0.99, desc: 'Animated sunny potting shed background with a sleepy cat. Cosmetic only, yours to keep.' },
  { id: 'bg_garden_border', name: 'Summer Border', pack: 'garden', oneTime: true, price: '$0.99', usd: 0.99, desc: 'Animated cottage flower border at golden hour, with butterflies. Cosmetic only, yours to keep.' },
  // Season Keepsakes (src/meta/seasonal.js KEEPSAKES): non-consumable, one per season theme, never expires. Three café
  // decorations and a postcard frame; cosmetic only. Sold only on the season card (never in the shop lists, at a fail,
  // after an ad or on the result card).
  { id: 'season_harvest_keepsakes', name: 'Autumn Harvest Keepsakes', keepsakes: 'harvest', oneTime: true, price: '$2.99', usd: 2.99, desc: 'A pumpkin lantern, a bucket of sunflowers and a leaf wreath for the café, plus a harvest postcard frame. Cosmetic only, yours to keep.' },
  { id: 'season_winter_keepsakes', name: 'Frost & Lanterns Keepsakes', keepsakes: 'winter', oneTime: true, price: '$2.99', usd: 2.99, desc: 'A potted fir with lights, a wooden sled and a paper star for the café, plus a frosty postcard frame. Cosmetic only, yours to keep.' },
  // "Pay the difference" (DESIGN.md): fixed-price non-consumables that finish a part-owned pack or the shelf. Each one
  // grants only the pieces still missing. Shown only on the pack's own card (packFinish / shelfFinish below).
  ...finishItems(),
];

function finishItems() {
  const price = (c) => `$${(c / 100).toFixed(2)}`;
  const out = [];
  for (const pack of PACKS) {
    for (const c of PACK_FINISH_CENTS) {
      out.push({ id: packFinishProduct(pack, c), name: `The rest of the ${pack.name} Pack`, pack: pack.id, finish: true, oneTime: true, price: price(c), usd: c / 100,
        desc: `The pieces of the ${pack.name} pack you don’t have yet. Cosmetic only, yours to keep.` });
    }
  }
  for (const c of SHELF_FINISH_CENTS) {
    out.push({ id: shelfFinishProduct(c), name: 'The rest of the Collector’s Shelf', packAll: true, finish: true, oneTime: true, price: price(c), usd: c / 100,
      desc: 'The pieces of the six shelf packs you don’t have yet. Packs added later are not included. Cosmetic only, yours to keep.' });
  }
  return out;
}

/** Plain coin packs (the first-purchase bonus and the money rates apply to these only). */
export const COIN_PACK_IDS = ['coins_s', 'coins_m', 'coins_l'];
export const isCoinPack = (id) => COIN_PACK_IDS.includes(id);

// Real-money equivalent of a coin price (DESIGN.md "Store fairness rules").
// We use the BASE coin pack rate (Pouch of Coins: 1,200 coins for $0.99), not the best-value rate.
// It is the rate a player pays when topping up a small amount, so it never understates what coins cost.
export const BASE_PACK_ID = 'coins_s';
const BASE = { coins: 1200, usd: 0.99 };
export const USD_PER_COIN = BASE.usd / BASE.coins;

/** Real-money value of `coins` in US dollars at the base pack rate (number). */
export function coinsToUsd(coins) {
  return Math.max(0, Number(coins) || 0) * USD_PER_COIN;
}

/** Display label for a coin price, e.g. 900 -> "≈ $0.74". Tiny amounts read "< $0.01". */
export function usdLabel(coins) {
  const v = coinsToUsd(coins);
  if (v > 0 && v < 0.005) return '< $0.01';
  return `≈ $${v.toFixed(2)}`;
}

/** First-purchase bonus: the first coin pack ever bought gives double coins. No expiry. */
export function firstPackBonusAvailable(save) {
  return !(save.purchases && save.purchases.firstPackBonus);
}

/** Coins a coin pack would give right now (doubled while the first-purchase bonus is unused). */
export function packCoins(save, id) {
  const item = IAP.find((x) => x.id === id);
  if (!item || !item.coins) return 0;
  return isCoinPack(id) && firstPackBonusAvailable(save) ? item.coins * 2 : item.coins;
}

/**
 * Honest Nova Pass value math, shown on the shop card:
 * total coins one pass gives vs. what the same money buys at the BEST coin pack rate (the toughest comparison).
 */
export function passValue() {
  const pass = IAP.find((x) => x.id === PASS.id);
  let best = null;
  for (const id of COIN_PACK_IDS) {
    const it = IAP.find((x) => x.id === id);
    if (!best || it.coins / it.usd > best.coins / best.usd) best = it;
  }
  const atBest = Math.round(((best.coins / best.usd) * pass.usd) / 10) * 10;
  return { total: PASS_TOTAL_COINS, upfront: PASS.upfront, daily: PASS.daily, days: PASS.days, bestPack: best, bestPackCoinsAtPassPrice: atBest, price: pass.price };
}

/** The 12-month plan vs twelve single months, computed from the catalogue: { price, monthly, months, separately, saves } (US$). */
export function passYearValue() {
  const year = IAP.find((x) => x.id === PASS_YEAR.id), month = IAP.find((x) => x.id === PASS.id);
  const separately = Math.round(month.usd * PASS_YEAR.blocks * 100) / 100;
  return { price: year.price, monthly: month.price, months: PASS_YEAR.blocks, separately, saves: Math.round((separately - year.usd) * 100) / 100, coins: PASS_TOTAL_COINS * PASS_YEAR.blocks };
}

/** Value of the No Ads Bundle vs buying its parts: Remove Ads + the coins at the base pack rate + boosters at shop coin prices. */
export function noAdsBundleValue() {
  const b = IAP.find((x) => x.id === 'no_ads_bundle'), ra = IAP.find((x) => x.id === 'remove_ads');
  let boosterCoins = 0;
  for (const k in b.boosters) { const bd = BOOSTERS[k]; boosterCoins += (bd ? bd.price : 0) * b.boosters[k]; }
  const coinsUsd = Math.round(coinsToUsd(b.coins + boosterCoins) * 100) / 100;
  const separately = Math.round((ra.usd + coinsUsd) * 100) / 100;
  return { price: b.price, removeAds: ra.price, coins: b.coins, boosters: b.boosters, boosterCoins, coinsUsd, separately };
}

/** Collector's Shelf vs the six pack bundles bought one by one (US$). */
export function packAllValue() {
  const all = IAP.find((x) => x.id === 'pack_all');
  const shelf = packAllPacks();
  const separately = Math.round(shelf.reduce((t, p) => t + IAP.find((x) => x.id === p.product).usd, 0) * 100) / 100;
  return { price: all.price, packs: shelf.length, separately, saves: Math.round((separately - all.usd) * 100) / 100 };
}

/** The Collector's Shelf is offered only while the player owns no piece of any pack (nobody pays twice for a piece). */
export function packAllOffered(save) {
  return !packAllPacks().some((p) => ownsAnyOfPack(save, p));
}

// ------------------------------------------------------------------ Pay the difference (DESIGN.md "Pay the difference")
// The price to finish = the full price minus what the player actually paid, rounded DOWN to a fixed store tier, so
// what they paid in total is never more than a newcomer pays for the whole thing. "Paid" is the recorded pack products
// (save.purchases.packBuys: a bundle at the bundle price, each single at its price, a finish at its tier). An owned
// piece no recorded product covers (a save from before the record) counts at its single price, the most it could have
// cost, so the guess always favours the player. Never coins, runs, ads or the device; never a timer, never at a fail,
// after an ad or on a result card: only on the pack's own card.

const cents = (usd) => Math.round(usd * 100);
const usdOf = (id) => IAP.find((x) => x.id === id).usd;
/** The highest tier at or below `diff` (tiers are listed high to low), or null. */
const tierAtMost = (tiers, diff) => { for (const c of tiers) if (c <= diff) return c; return null; };

/** What the player has paid toward a pack, in US cents: its recorded products, plus owned pieces no record covers at
 *  their single prices. Not capped: a pack bought as three singles counts as $3.97. */
export function packPaidCents(save, pack) {
  let paid = 0;
  const covered = new Set();
  for (const id of packBuysOf(save)) {
    const hit = packProduct(id);
    if (!hit || hit.pack !== pack) continue;
    paid += cents(usdOf(id));
    for (const p of hit.pieces) covered.add(p.id);
  }
  for (const p of packPieces(pack)) if (!covered.has(p.id) && ownsPiece(save, p)) paid += cents(usdOf(p.product));
  return paid;
}

/**
 * "Finish this pack" offer, or null. Offered while part of the pack is owned and the tier is cheaper than buying the
 * missing singles: skin owned $0.99, one background $1.99, both backgrounds $0.99, skin and one background none.
 * { product, cents, price, paid, rest (missing singles, cents), skin (owned), scenes (owned count) }
 */
export function packFinish(save, pack) {
  const pieces = packPieces(pack);
  const owned = pieces.filter((p) => ownsPiece(save, p));
  if (!owned.length || owned.length === pieces.length) return null;
  const paid = packPaidCents(save, pack);
  let rest = 0;
  for (const p of pieces) if (!ownsPiece(save, p)) rest += cents(usdOf(p.product));
  const tier = tierAtMost(PACK_FINISH_CENTS, cents(usdOf(pack.product)) - paid);
  if (tier == null || tier >= rest) return null;
  const product = packFinishProduct(pack, tier);
  return { product, cents: tier, price: IAP.find((x) => x.id === product).price, paid, rest,
    skin: owned.some((p) => p.kind === 'skin'), scenes: owned.filter((p) => p.kind === 'scene').length };
}

/**
 * "Finish the shelf" offer, or null: while some shelf piece is owned and the difference is at least the lowest tier.
 * 1 pack owned $6.99, 2 packs $3.99, 3 or more none (singles stay). Loose pieces count at their single prices.
 * { product, cents, price, paid, packs (owned whole), pieces (owned), loose (owned outside whole packs),
 *   pack (the one pack owned, when that is all) }
 */
export function shelfFinish(save) {
  let paid = 0, packs = 0, pieces = 0, loose = 0, missing = 0, rest = 0, only = null;
  for (const pk of packAllPacks()) {
    paid += packPaidCents(save, pk);
    const all = packPieces(pk), have = all.filter((p) => ownsPiece(save, p)).length;
    pieces += have;
    missing += all.length - have;
    if (have === all.length) { packs++; only = pk; } else loose += have;
    // what the rest would cost today without the shelf: the bundle while none of a pack is owned, else its singles
    if (!have) rest += cents(usdOf(pk.product));
    else for (const p of all) if (!ownsPiece(save, p)) rest += cents(usdOf(p.product));
  }
  if (!paid || !missing) return null;
  const tier = tierAtMost(SHELF_FINISH_CENTS, cents(usdOf('pack_all')) - paid);
  if (tier == null || tier >= rest) return null;
  const product = shelfFinishProduct(tier);
  return { product, cents: tier, price: IAP.find((x) => x.id === product).price, paid, rest, packs, pieces, loose,
    pack: packs === 1 && !loose ? only.id : null };
}

/** The No Ads Bundle (and Remove Ads) are offered only while Remove Ads is not owned. */
export function noAdsOffered(save) {
  return !(save && save.removeAds);
}

/** Grant the contents of an IAP item. Call ONLY after a verified (or, in the web test build, simulated) purchase. */
export function grantIap(save, id, now = new Date()) {
  // Starlight Season products ('starlight_season_s<n>') are no longer sold (v3), but a restore or a late store
  // delivery still grants that season's whole premium track (cosmetics only) and records it in purchases.seasons.
  const seasonN = seasonOfProduct(id);
  if (seasonN) return grantSeasonTrack(save, seasonN);
  const item = IAP.find((x) => x.id === id);
  if (!item) return false;
  if (!save.purchases) save.purchases = { starterPack: false, firstPackBonus: false };
  if (item.id === PASS.id) return grantPass(save, now);
  if (item.id === PASS_YEAR.id) return grantPassYear(save, now);
  if (isTip(item.id)) return grantTip(save, item.id).ok; // a thank-you and the tip-jar keepsake only, never coins
  if (packProduct(item.id)) { recordPackBuy(save, item.id); return grantPackProduct(save, item.id); } // cosmetics only, never coins/boosters/Stardust
  if (keepsakesOfProduct(item.id)) return grantKeepsakes(save, item.id); // Season Keepsakes: cosmetics only
  if (item.packAll) { recordPackBuy(save, item.id); for (const p of packAllPacks()) grantPackProduct(save, p.product); return true; } // missing pieces only
  // Remove Ads and the No Ads Bundle: the caller turns ads off (Svc.setRemoveAds) for any item with removeAds.
  // The bundle's coins and boosters come once per save; a restore or second delivery still confirms the order.
  if (item.id === 'no_ads_bundle') {
    if (save.purchases.noAdsBundle) return true;
    save.purchases.noAdsBundle = true;
  }
  if (item.id === 'starter') {
    if (save.purchases.starterPack) return false;
    save.purchases.starterPack = true;
  }
  if (item.coins) {
    save.coins += packCoins(save, item.id);
    if (isCoinPack(item.id)) save.purchases.firstPackBonus = true;
  }
  if (item.boosters) for (const k in item.boosters) save.boosters[k] = (save.boosters[k] || 0) + item.boosters[k];
  return true;
}
