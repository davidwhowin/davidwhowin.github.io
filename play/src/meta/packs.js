// Premium themed packs (DESIGN.md "Premium themed packs"). Pure functions, no DOM.
//
// A pack is one orb skin plus two animated scenes around a theme, sold for real money as a bundle or
// piece by piece. Fairness rules (same as the rest of the store):
//  - Cosmetic only: a skin or a background never changes a rule, a score, a seed or ad behaviour.
//  - You see exactly what you get (animated previews) before buying. No timers, no "limited" copy, no draws.
//  - A paid order is never lost: buying grants whatever pieces are still missing and returns true.
//  - The bundle is offered only while none of its pieces are owned (so nobody pays twice for a piece);
//    after that only the missing singles are listed.
//  - Owned forever. Save shape reuses existing keys: the skin id lands in save.skins.owned, the scene ids
//    in save.scenesOwned. No new top-level keys (port-friendly).
//  - Paid items: Transfer progress keeps them local (src/meta/transfer.js, PAID_SKINS / PAID_SCENES).
//  - The orb skin piece also brings the pack's board skin and combo skin (`board`, `combo`; src/meta/looks.js), so
//    there is no extra product to buy: save.boardSkins.owned / save.comboSkins.owned get them with the skin.

export const PACKS = [
  {
    id: 'sushi',
    name: 'Sushi Bar',
    blurb: 'A kawaii sushi orb set with a warm sushi counter and a moonlit sakura garden. The skin brings a hinoki wood board and sakura petal merges. Fully animated.',
    product: 'pack_sushi',
    skin: { id: 'sushi', product: 'skin_sushi' },
    board: 'hinoki', combo: 'sakura', // board + combo skin that come with the orb skin (src/meta/looks.js)
    scenes: [
      { id: 'pk_sushi_counter', product: 'bg_sushi_counter' },
      { id: 'pk_sakura', product: 'bg_sakura_garden' },
    ],
  },
  {
    id: 'koi',
    name: 'Koi Pond',
    blurb: 'Kawaii koi from a tiny fry to a dragon koi, with a twilight lily pond and a rainy temple night. The skin brings a stone pond board and ripple merges. Fully animated.',
    product: 'pack_koi',
    skin: { id: 'koi', product: 'skin_koi' },
    board: 'stone_pond', combo: 'koi_ripple', // board + combo skin that come with the orb skin (src/meta/looks.js)
    scenes: [
      { id: 'pk_lily_pond', product: 'bg_lily_pond' },
      { id: 'pk_rain_temple', product: 'bg_rain_temple' },
    ],
  },
  {
    id: 'cat',
    name: 'Cat Café',
    blurb: 'Ten free-standing kawaii cats, from a curled kitten to the lion king, with a rainy café and a moonlit rooftop. The skin brings a café cushion board and paw-and-heart merges. Fully animated.',
    product: 'pack_cat',
    skin: { id: 'cat', product: 'skin_cat' },
    board: 'cafe_cushion', combo: 'paw_heart', // board + combo skin that come with the orb skin (src/meta/looks.js)
    scenes: [
      { id: 'pk_cat_cafe', product: 'bg_rainy_cafe' },
      { id: 'pk_cat_rooftop', product: 'bg_rooftop_night' },
    ],
  },
  {
    id: 'patisserie',
    name: 'Patisserie',
    blurb: 'Ten free-standing kawaii pastries, from a single sprinkle to a tiered wedding cake, with a glowing pâtisserie counter and a pastel rooftop under string lights. The skin brings a marble tray board and sprinkle merges. Fully animated.',
    product: 'pack_patisserie',
    skin: { id: 'patisserie', product: 'skin_patisserie' },
    board: 'marble_tray', combo: 'sprinkles', // board + combo skin that come with the orb skin (src/meta/looks.js)
    scenes: [
      { id: 'pk_patisserie_counter', product: 'bg_patisserie_counter' },
      { id: 'pk_patisserie_rooftop', product: 'bg_pastel_rooftop' },
    ],
  },
  {
    id: 'deepsea',
    name: 'Deep Sea',
    blurb: 'Ten free-standing kawaii sea creatures, from a glowing plankton speck to a big blue whale, with a sunlit coral reef and the deep abyss where an anglerfish glows. The skin brings an abyss glass board and bubble merges. Fully animated.',
    product: 'pack_deepsea',
    skin: { id: 'deepsea', product: 'skin_deepsea' },
    board: 'abyss_glass', combo: 'bubbles', // board + combo skin that come with the orb skin (src/meta/looks.js)
    scenes: [
      { id: 'pk_coral_reef', product: 'bg_coral_reef' },
      { id: 'pk_abyss', product: 'bg_abyss' },
    ],
  },
  {
    id: 'garden',
    name: 'Cottage Garden',
    blurb: 'Ten free-standing kawaii garden friends, from a little seed packet to a garden gnome, with a sunny potting shed and a summer flower border at golden hour. The skin brings a potting bench board and petal merges. Fully animated.',
    product: 'pack_garden',
    skin: { id: 'garden', product: 'skin_garden' },
    board: 'potting_bench', combo: 'garden_petals', // board + combo skin that come with the orb skin (src/meta/looks.js)
    scenes: [
      { id: 'pk_garden_shed', product: 'bg_garden_shed' },
      { id: 'pk_garden_border', product: 'bg_garden_border' },
    ],
  },
];

export const PACK_BY_ID = Object.fromEntries(PACKS.map((p) => [p.id, p]));
/** The Collector's Shelf contents, FROZEN: the six packs it was sold with. Packs added later are not included. */
export const PACK_ALL_IDS = Object.freeze(['sushi', 'koi', 'cat', 'patisserie', 'deepsea', 'garden']);
export const packAllPacks = () => PACK_ALL_IDS.map((id) => PACK_BY_ID[id]);
export const PACK_SKIN_IDS = PACKS.map((p) => p.skin.id);
export const PACK_SCENE_IDS = PACKS.flatMap((p) => p.scenes.map((s) => s.id));

/** Every piece of a pack: [{ kind: 'skin' | 'scene', id, product }]. */
export function packPieces(pack) {
  return [{ kind: 'skin', id: pack.skin.id, product: pack.skin.product }, ...pack.scenes.map((s) => ({ kind: 'scene', id: s.id, product: s.product }))];
}

export function ownsPiece(save, piece) {
  if (!save) return false;
  if (piece.kind === 'skin') return !!(save.skins && Array.isArray(save.skins.owned) && save.skins.owned.includes(piece.id));
  return Array.isArray(save.scenesOwned) && save.scenesOwned.includes(piece.id);
}

export const ownsPack = (save, pack) => packPieces(pack).every((p) => ownsPiece(save, p));
export const ownsAnyOfPack = (save, pack) => packPieces(pack).some((p) => ownsPiece(save, p));

// "Pay the difference" (DESIGN.md "Pay the difference"; prices in src/meta/economy.js packFinish / shelfFinish).
// Fixed store tiers in US cents, highest first: one non-consumable product per pack per tier, and two for the shelf.
// A finish product grants every piece still missing (so never twice), exactly like the bundle.
export const PACK_FINISH_CENTS = Object.freeze([199, 99]);
export const SHELF_FINISH_CENTS = Object.freeze([699, 399]);
const tierTag = (cents) => String(cents).padStart(3, '0');
/** 'pack_koi_finish_099' */
export const packFinishProduct = (pack, cents) => `${pack.product}_finish_${tierTag(cents)}`;
/** 'pack_all_finish_699' */
export const shelfFinishProduct = (cents) => `pack_all_finish_${tierTag(cents)}`;
export const SHELF_FINISH_PRODUCTS = Object.freeze(SHELF_FINISH_CENTS.map(shelfFinishProduct));

// What was actually paid ("Pay the difference" credits it): save.purchases.packBuys lists each paid pack product once
// (bundle, single, finish, Collector's Shelf), in order. Written only when not empty. It stays on this device like the
// rest of purchases (transfer LOCAL_ONLY_KEYS), and a store restore rebuilds it on a new install.
export const PACK_BUYS_MAX = 64;
const isPackBuyId = (id) => typeof id === 'string' && (id === 'pack_all' || SHELF_FINISH_PRODUCTS.includes(id) || !!packProduct(id));
/** The paid pack products recorded on this save (never null). */
export const packBuysOf = (save) => (save && save.purchases && Array.isArray(save.purchases.packBuys) ? save.purchases.packBuys : []);
/** Record a paid pack product once. Returns true when the record changed. */
export function recordPackBuy(save, productId) {
  if (!save || !isPackBuyId(productId)) return false;
  if (!save.purchases || typeof save.purchases !== 'object' || Array.isArray(save.purchases)) save.purchases = { starterPack: false, firstPackBonus: false };
  if (!Array.isArray(save.purchases.packBuys)) save.purchases.packBuys = [];
  const l = save.purchases.packBuys;
  if (l.includes(productId) || l.length >= PACK_BUYS_MAX) return false;
  // a finish covers the whole pack: first note the pieces owned before the record existed (sold only for money) at
  // their single prices, so the credit for them is kept
  const hit = packProduct(productId);
  if (hit && PACK_FINISH_CENTS.some((c) => packFinishProduct(hit.pack, c) === productId)) {
    const covered = new Set();
    for (const id of l) { const h = packProduct(id); if (h && h.pack === hit.pack) for (const p of h.pieces) covered.add(p.id); }
    for (const p of hit.pieces) if (!covered.has(p.id) && ownsPiece(save, p) && l.length < PACK_BUYS_MAX - 1) l.push(p.product);
  }
  l.push(productId);
  return true;
}
/** Save cleaning: known pack product ids only, once each, at most PACK_BUYS_MAX; dropped when empty. */
export function sanitizePackBuys(purchases) {
  if (!purchases || typeof purchases !== 'object') return;
  const l = Array.isArray(purchases.packBuys) ? [...new Set(purchases.packBuys.filter(isPackBuyId))].slice(0, PACK_BUYS_MAX) : [];
  if (l.length) purchases.packBuys = l; else delete purchases.packBuys;
}

/** The pack (or single piece) a store product id belongs to: { pack, pieces } or null. A finish product is the whole pack. */
export function packProduct(productId) {
  for (const pack of PACKS) {
    if (pack.product === productId) return { pack, pieces: packPieces(pack) };
    if (PACK_FINISH_CENTS.some((c) => packFinishProduct(pack, c) === productId)) return { pack, pieces: packPieces(pack) };
    const one = packPieces(pack).find((p) => p.product === productId);
    if (one) return { pack, pieces: [one] };
  }
  return null;
}

/**
 * What the shop lists for a pack right now: the bundle while none of it is owned, otherwise the
 * singles still missing. Returns product ids.
 */
export function packOffers(save, pack) {
  const missing = packPieces(pack).filter((p) => !ownsPiece(save, p));
  if (!missing.length) return [];
  if (missing.length === packPieces(pack).length) return [pack.product, ...missing.map((p) => p.product)];
  return missing.map((p) => p.product);
}

/** Grant a paid pack product: adds the missing pieces. Returns true for any pack product id (a paid order is never lost). */
export function grantPackProduct(save, productId) {
  const hit = packProduct(productId);
  if (!hit) return false;
  for (const p of hit.pieces) {
    if (ownsPiece(save, p)) continue;
    if (p.kind === 'skin') {
      if (!save.skins || typeof save.skins !== 'object') save.skins = { owned: ['classic'], equipped: 'classic' };
      if (!Array.isArray(save.skins.owned)) save.skins.owned = ['classic'];
      save.skins.owned.push(p.id);
    } else {
      if (!Array.isArray(save.scenesOwned)) save.scenesOwned = [];
      save.scenesOwned.push(p.id);
    }
  }
  // the orb skin brings the pack's board + combo skin (also re-derived by sanitizeLooks for older saves)
  if (hit.pieces.some((p) => p.kind === 'skin')) grantLooksOf(save, hit.pack);
  return true;
}

function grantLooksOf(save, pack) {
  for (const [key, id, def] of [['boardSkins', pack.board, 'nova'], ['comboSkins', pack.combo, 'stardust']]) {
    if (!id) continue;
    if (!save[key] || typeof save[key] !== 'object' || Array.isArray(save[key])) save[key] = { owned: [def], equipped: def };
    if (!Array.isArray(save[key].owned)) save[key].owned = [def];
    if (!save[key].owned.includes(id)) save[key].owned.push(id);
  }
}
