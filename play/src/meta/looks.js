// Board skins and combo skins (DESIGN.md "Board skins", "Combo skins"): the catalogue, ownership and equip state.
// Pure functions, no DOM. The art lives in src/game/boardArt.js and src/game/fxSkins.js (keyed by these ids).
//
// Save shape (both keys new in v0.7; old saves get the defaults):
//   save.boardSkins = { owned: ['nova', ...], equipped: 'nova' }
//   save.comboSkins = { owned: ['stardust', ...], equipped: 'stardust' }
// Fairness: cosmetic only. A board or combo skin never changes a rule, a score, the juice level or ads.
// Coin skins are bought with coins once and kept. Pack skins come with a premium pack's orb skin (the bundle or the
// single skin): whoever owns the pack's orb skin owns its board and combo skin too, including saves from before
// they existed (sanitizeLooks re-derives them). No new store products, no timers, no pressure copy.
import { PACKS } from './packs.js';

export const DEFAULT_BOARD = 'nova';
export const DEFAULT_COMBO = 'stardust';
// v3 seaside defaults: free and owned by everyone; brand-new saves start with them equipped (existing players keep
// their look). The art is keyed by these ids in src/game/boardArt.js / fxSkins.js (until it lands, the classic
// art is drawn as the fallback).
export const SEASIDE_BOARD = 'driftwood';
export const SEASIDE_COMBO = 'seafoam';

/** Board skins. cost: coins (0 = free); null = comes with a premium pack (pack id). */
export const BOARD_LOOKS = [
  { id: 'nova', name: 'Nova', cost: 0, desc: 'The classic violet star panel.' },
  { id: 'starglass', name: 'Starglass', cost: 1500, desc: 'Frosted glass with stars set in it and a soft passing glint.' },
  { id: 'nebula_velvet', name: 'Nebula Velvet', cost: 2500, desc: 'Deep plum velvet with nebula clouds and gold piping.' },
  { id: 'brass_observatory', name: 'Brass Observatory', cost: 4000, desc: 'A star chart in a riveted brass frame with a slowly turning astrolabe.' },
  { id: 'hinoki', name: 'Hinoki Board', cost: null, pack: 'sushi', desc: 'A warm wooden sushi board: five hinoki planks on little feet. Comes with the Sushi Bar skin.' },
  { id: 'stone_pond', name: 'Stone Pond', cost: null, pack: 'koi', desc: 'A pond basin edged with river stones, with light dancing on the water. Comes with the Koi Pond skin.' },
  { id: 'cafe_cushion', name: 'Café Cushion', cost: null, pack: 'cat', desc: 'A tufted velvet cushion with cream piping and tiny embroidered paws. Comes with the Cat Café skin.' },
  { id: 'marble_tray', name: 'Marble Tray', cost: null, pack: 'patisserie', desc: 'A rose marble pastry tray in a gilded rim, with piped-cream lanes and lace doilies. Comes with the Patisserie skin.' },
  { id: 'driftwood', name: 'Driftwood Tray', cost: 0, desc: 'A pale driftwood tray in a twisted rope rim: the Seaside Café look.' },
  { id: 'abyss_glass', name: 'Abyss Glass', cost: null, pack: 'deepsea', desc: 'A deep blue glass basin with soft light rippling across it. Comes with the Deep Sea skin.' },
  { id: 'potting_bench', name: 'Potting Bench', cost: null, pack: 'garden', desc: 'A weathered wooden potting bench with twine-tied lanes and little sprigs of green. Comes with the Cottage Garden skin.' },
];

/** Combo skins (merge burst, merge flash, chain banner and chain tally). */
export const COMBO_LOOKS = [
  { id: 'stardust', name: 'Stardust', cost: 0, desc: 'Bright stars and sparks: the classic merge burst.' },
  { id: 'comet_sparks', name: 'Comet Sparks', cost: 1200, desc: 'Fast golden streaks fly out of every merge.' },
  { id: 'aurora_veil', name: 'Aurora Veil', cost: 2000, desc: 'Soft ribbons of green and violet light drift up.' },
  { id: 'constellation', name: 'Constellation', cost: 3000, desc: 'Each merge scatters stars joined by fine lines.' },
  { id: 'sakura', name: 'Sakura Sign', cost: null, pack: 'sushi', desc: 'Cherry petals drift from each merge; chains hang on a wooden shop sign. Comes with the Sushi Bar skin.' },
  { id: 'koi_ripple', name: 'Pond Ripples', cost: null, pack: 'koi', desc: 'Merges ripple out like a stone dropped in a pond, with droplets and bubbles. Comes with the Koi Pond skin.' },
  { id: 'paw_heart', name: 'Paws & Hearts', cost: null, pack: 'cat', desc: 'Little hearts and paw prints float up from every merge. Comes with the Cat Café skin.' },
  { id: 'sprinkles', name: 'Sprinkles', cost: null, pack: 'patisserie', desc: 'Every merge throws a shower of candy sprinkles; chains sit on a cake-box tag. Comes with the Patisserie skin.' },
  { id: 'seafoam', name: 'Sea Foam', cost: 0, desc: 'Gentle bubbles and a puff of sea spray: the Seaside Café look.' },
  { id: 'bubbles', name: 'Bubbles', cost: null, pack: 'deepsea', desc: 'Every merge bursts into sea bubbles with a pearl or two; chains sit on a seashell tag. Comes with the Deep Sea skin.' },
  { id: 'garden_petals', name: 'Garden Petals', cost: null, pack: 'garden', desc: 'Every merge scatters soft petals and a leaf or two; chains sit on a seed-packet tag. Comes with the Cottage Garden skin.' },
];

const KINDS = {
  board: { list: BOARD_LOOKS, key: 'boardSkins', def: DEFAULT_BOARD, packField: 'board' },
  combo: { list: COMBO_LOOKS, key: 'comboSkins', def: DEFAULT_COMBO, packField: 'combo' },
};
const kindOf = (kind) => {
  const k = KINDS[kind];
  if (!k) throw new Error('unknown look kind ' + kind);
  return k;
};

/** Paid-only looks (pack items): Transfer progress keeps them local (src/meta/transfer.js). */
export const PAID_BOARDS = BOARD_LOOKS.filter((l) => l.pack).map((l) => l.id);
export const PAID_COMBOS = COMBO_LOOKS.filter((l) => l.pack).map((l) => l.id);

/** Free looks (cost 0): owned by everyone. */
const FREE = (list) => list.filter((l) => l.cost === 0).map((l) => l.id);
export const defaultBoardSkins = () => ({ owned: FREE(BOARD_LOOKS), equipped: SEASIDE_BOARD });
export const defaultComboSkins = () => ({ owned: FREE(COMBO_LOOKS), equipped: SEASIDE_COMBO });

/** The Cosmic pack grouping (v3) lives with the art: src/game/backdrops.js COSMIC_PACK. Presentation only. */
export { COSMIC_PACK } from '../game/backdrops.js';
import { COSMIC_PACK as COSMIC } from '../game/backdrops.js';

/**
 * Which UI palette the equipped orb skin asks for (v3): 'cosmic' for the Cosmic pack's skins (the night sky look),
 * 'seaside' (the cozy café palette) for everything else, including the default Café Classics ('cafeclassics') and Simple Circles ('basic').
 * main.js turns it into <html data-look>. Presentation only.
 */
export function uiLook(save) {
  const id = save && save.skins && save.skins.equipped;
  return COSMIC.skins.includes(id) ? 'cosmic' : 'seaside';
}

/**
 * "Try the new look" (v3 migration card): wear the Seaside orbs, Driftwood board and Seafoam combo. Only players who
 * had a save before v3 see the card, and they all own the Seaside orbs (src/meta/save.js keeps them for every save
 * from before Simple Circles), so this never hands out the coin skin: unowned, the orbs stay as they are.
 */
export function wearSeasideLook(save) {
  if (save.skins && typeof save.skins === 'object' && Array.isArray(save.skins.owned) && save.skins.owned.includes('seaside')) {
    save.skins.equipped = 'seaside';
  }
  equipLook(save, 'board', SEASIDE_BOARD);
  equipLook(save, 'combo', SEASIDE_COMBO);
}

function slot(save, kind) {
  const k = kindOf(kind);
  let v = save[k.key];
  if (!v || typeof v !== 'object' || Array.isArray(v)) v = save[k.key] = { owned: [k.def], equipped: k.def };
  if (!Array.isArray(v.owned)) v.owned = [k.def];
  return v;
}

/** The catalogue of a kind ('board' | 'combo'), each entry plus { owned, equipped } for this save. */
export function lookList(save, kind) {
  const k = kindOf(kind);
  const eqId = equippedLook(save, kind);
  return k.list.map((l) => ({ ...l, owned: ownsLook(save, kind, l.id), equipped: l.id === eqId }));
}

export function ownsLook(save, kind, id) {
  const k = kindOf(kind);
  if (id === k.def || k.list.some((l) => l.id === id && l.cost === 0)) return true; // free looks: everyone owns them
  const v = save && save[k.key];
  return !!(v && Array.isArray(v.owned) && v.owned.includes(id));
}

export function equippedLook(save, kind) {
  const k = kindOf(kind);
  const v = save && save[k.key];
  const id = v && v.equipped;
  return id && k.list.some((l) => l.id === id) && ownsLook(save, kind, id) ? id : k.def;
}

/** Equip an owned look. Returns false (no change) if it is not owned or unknown. */
export function equipLook(save, kind, id) {
  const k = kindOf(kind);
  if (!k.list.some((l) => l.id === id) || !ownsLook(save, kind, id)) return false;
  slot(save, kind).equipped = id;
  return true;
}

/** Buy a coin look and equip it. False if it is not for sale, already owned or the coins are short. */
export function buyLook(save, kind, id) {
  const k = kindOf(kind);
  const l = k.list.find((x) => x.id === id);
  if (!l || l.cost == null || l.cost <= 0 || ownsLook(save, kind, id) || !(save.coins >= l.cost)) return false;
  save.coins -= l.cost;
  const v = slot(save, kind);
  v.owned.push(id);
  v.equipped = id;
  return true;
}

/** The board + combo look ids that come with a pack ({ board, combo }), or null. */
export function packLooks(packId) {
  const p = PACKS.find((x) => x.id === packId);
  return p ? { board: p.board, combo: p.combo } : null;
}

/** Grant a pack's board and combo skins (called when its orb skin is granted). Idempotent. */
export function grantPackLooks(save, packId) {
  const p = PACKS.find((x) => x.id === packId);
  if (!p) return false;
  for (const kind of ['board', 'combo']) {
    const id = p[kindOf(kind).packField];
    if (id && !ownsLook(save, kind, id)) slot(save, kind).owned.push(id);
  }
  return true;
}

/**
 * Save repair + migration: unknown ids dropped, the free default always owned, a pack's looks owned whenever its
 * orb skin is (older saves, the single-skin purchase), and an equipped look that is not owned falls back.
 */
export function sanitizeLooks(save) {
  const skinsOwned = (save.skins && Array.isArray(save.skins.owned)) ? save.skins.owned : [];
  for (const kind of ['board', 'combo']) {
    const k = kindOf(kind);
    const v = slot(save, kind);
    const known = new Set(k.list.map((l) => l.id));
    const owned = FREE(k.list);
    for (const id of v.owned) if (typeof id === 'string' && known.has(id) && !owned.includes(id)) owned.push(id);
    for (const p of PACKS) {
      const id = p[k.packField];
      if (id && skinsOwned.includes(p.skin.id) && !owned.includes(id)) owned.push(id);
    }
    v.owned = owned;
    if (typeof v.equipped !== 'string' || !owned.includes(v.equipped)) v.equipped = k.def;
  }
  return save;
}

// ------------------------------------------------------------------ named helpers (for the Wardrobe screen)

export const listBoardSkins = (save) => lookList(save, 'board');
export const ownsBoardSkin = (save, id) => ownsLook(save, 'board', id);
export const equippedBoardSkin = (save) => equippedLook(save, 'board');
export const equipBoardSkin = (save, id) => equipLook(save, 'board', id);
export const buyBoardSkin = (save, id) => buyLook(save, 'board', id);

export const listComboSkins = (save) => lookList(save, 'combo');
export const ownsComboSkin = (save, id) => ownsLook(save, 'combo', id);
export const equippedComboSkin = (save) => equippedLook(save, 'combo');
export const equipComboSkin = (save, id) => equipLook(save, 'combo', id);
export const buyComboSkin = (save, id) => buyLook(save, 'combo', id);
