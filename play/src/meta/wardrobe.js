// Wardrobe (DESIGN.md "Wardrobe"): one place to see every cosmetic the player owns and change their look.
// Pure data model over the existing catalogs and save fields. It adds no save keys and no rules of its own:
// ownership comes from the existing helpers and equipping goes through the existing equip functions.
// Cosmetic only. No timers, no "limited" copy, nothing tied to adverts.
import { SKINS, equipSkin, IAP } from './economy.js';
import { PACKS, PACK_BY_ID, packPieces, ownsPiece, ownsPack } from './packs.js';
import { equipLook, ownsLook } from './looks.js';
import { KEEPERS, ownsKeeper, equipKeeper, equippedKeeper } from './keepers.js';
import { OUTFITS, equipOutfit, equippedOutfit } from './outfits.js';
import { SCENE_PRICE, COSMIC_NEBULAS, COSMIC_NEBULA_PRICE } from './scenes.js';
import { SEASIDE_BACKDROPS, COSMIC_PACK } from '../game/backdrops.js';
import { t as tr } from '../i18n/index.js'; // pure lookup; `tr` because `t` is a backdrop loop variable here
import {
  BACKDROPS, SEASON_BACKDROPS, SCENE_BACKDROPS, PACK_BACKDROPS,
  unlockedBackdrops, chapterStartLevel, sectorStart, ENDLESS_UNLOCK_MAX, BACKDROP_BY_ID,
} from '../game/backdrops.js';

const fmtN = (n) => Number(n).toLocaleString('en-US');
const iapPrice = (id) => (IAP.find((x) => x.id === id) || {}).price || '';

/**
 * How a locked item is earned. `go` tells the screen where a tap leads: 'packs' (Shop › Packs, pack card),
 * 'skins' (Shop › Looks), 'pass' (Shop › Packs, Café Club card), or null (just keep playing).
 * v3: Star Capsules and the Starlight Season are gone; former season items are listed only once owned.
 */
function skinSource(sk) {
  if (sk.pack) {
    const pack = PACK_BY_ID[sk.pack];
    return { label: tr('wardrobe.src.pack', { name: pack.name, price: iapPrice(pack.product) }), go: 'packs', packId: pack.id };
  }
  if (sk.pass) return { label: tr('wardrobe.src.club'), go: 'pass' };
  return { label: tr('wardrobe.src.shopLooks', { coins: fmtN(sk.cost) }), go: 'skins' };
}

const RANK = { equipped: 0, owned: 1, locked: 2 };
function sortOwnedFirst(items) {
  // the look in use, then owned, then locked; stable (catalog order) inside each group
  return items.map((it, i) => [it, i]).sort((a, b) => (RANK[a[0].state] - RANK[b[0].state]) || (a[1] - b[1])).map((x) => x[0]);
}

function stateOf(owned, equipped) { return equipped ? 'equipped' : owned ? 'owned' : 'locked'; }

/** Orb skins. Former season skins are listed only once owned. (Cosmic is one optional style, not tagged separately.) */
export function pieceItems(save) {
  const owned = (save.skins && save.skins.owned) || ['cafeclassics', 'basic', 'classic'];
  const eq = (save.skins && save.skins.equipped) || 'cafeclassics';
  const out = [];
  for (const sk of SKINS) {
    const has = owned.includes(sk.id);
    if (sk.season && !has) continue;
    const src = has ? null : skinSource(sk);
    out.push({
      kind: 'skin', id: sk.id, name: sk.name, owned: has, state: stateOf(has, eq === sk.id),
      tag: sk.pack ? tr('wardrobe.tag.premium') : sk.season ? tr('wardrobe.tag.season') : sk.pass ? tr('wardrobe.tag.club') : sk.cost ? tr('wardrobe.tag.shop') : tr('wardrobe.tag.free'),
      source: src ? src.label : '', go: src ? src.go : null, packId: sk.pack || null,
    });
  }
  return sortOwnedFirst(out);
}

/**
 * Backgrounds: the Seaside Café harbour window and its 6 moods (free, always unlocked), chapter nebulas (earned by progress), starry backgrounds (coins), former season nebulas (listed once
 * owned), moving backgrounds (Sky scenes) and premium pack scenes. "Follow progress" is listed first and is not counted as an item.
 */
export function backgroundItems(save) {
  const unlocked = unlockedBackdrops(save);
  const sel = (save.settings && save.settings.backdrop) || 'auto';
  const selValid = sel === 'auto' || unlocked.includes(sel);
  const isOn = (id) => (selValid ? sel === id : id === 'auto');
  const out = [];
  const add = (t, group, owned, src, extra = {}) => out.push({
    kind: 'backdrop', id: t.id, name: t.name, group, owned, state: stateOf(owned, owned && isOn(t.id)),
    scene: !!t.scene, source: owned ? '' : src.label, go: owned ? null : src.go, packId: t.pack || null, ...extra,
  });
  for (const t of SEASIDE_BACKDROPS) add(t, tr('wardrobe.group.seaside'), true, { label: '', go: null });
  BACKDROPS.forEach((t, i) => {
    const how = i <= ENDLESS_UNLOCK_MAX ? tr('wardrobe.how.levelOrSector', { level: chapterStartLevel(i), sector: sectorStart(i) }) : tr('wardrobe.how.level', { level: chapterStartLevel(i) });
    add(t, tr('wardrobe.group.chapter'), unlocked.includes(t.id), { label: how, go: null }, { chapter: i + 1 });
  });
  for (const id of COSMIC_NEBULAS) {
    const t = BACKDROP_BY_ID[id];
    if (t) add(t, tr('wardrobe.group.starry'), unlocked.includes(t.id), { label: tr('wardrobe.src.shopLooks', { coins: fmtN(COSMIC_NEBULA_PRICE) }), go: 'backgrounds' });
  }
  for (const t of SEASON_BACKDROPS) if (unlocked.includes(t.id)) add(t, tr('wardrobe.group.season'), true, { label: '', go: null });
  for (const t of SCENE_BACKDROPS) {
    add(t, tr('wardrobe.group.moving'), unlocked.includes(t.id), { label: tr('wardrobe.src.shopLooks', { coins: fmtN(SCENE_PRICE.coins) }), go: 'scenes' });
  }
  for (const t of PACK_BACKDROPS) {
    const pack = PACK_BY_ID[t.pack];
    add(t, tr('wardrobe.group.premium'), unlocked.includes(t.id), { label: tr('wardrobe.src.pack', { name: pack.name, price: iapPrice(pack.product) }), go: 'packs' });
  }
  const auto = { kind: 'backdrop', id: 'auto', name: tr('wardrobe.auto.name'), group: tr('wardrobe.group.auto'), owned: true, state: isOn('auto') ? 'equipped' : 'owned', scene: false, source: '', go: null, packId: null, auto: true };
  return sortOwnedFirst([auto, ...out]); // the background in use first, then "Follow progress"
}

/** Keepers (companions). v3: never sold; they are earned in the café. */
export function keeperItems(save) {
  const eq = equippedKeeper(save).id;
  return sortOwnedFirst(KEEPERS.map((k) => {
    const owned = ownsKeeper(save, k.id) || !!k.free;
    return {
      kind: 'keeper', id: k.id, name: k.name, title: k.title, owned, state: stateOf(owned, eq === k.id),
      source: owned ? '' : tr('wardrobe.src.cafe'), go: null, packId: null,
    };
  }));
}

/** Keeper outfits (former season premium track): listed once owned. "None" is first. */
export function outfitItems(save) {
  const owned = (save.outfits && save.outfits.owned) || [];
  const cur = equippedOutfit(save);
  const out = OUTFITS.filter((o) => owned.includes(o.id)).map((o) => ({
    kind: 'outfit', id: o.id, name: o.name, owned: true, state: stateOf(true, cur === o.id), source: '', go: null, packId: null,
  }));
  return [{ kind: 'outfit', id: null, name: tr('wardrobe.outfit.none'), owned: true, state: cur ? 'owned' : 'equipped', source: '', go: null, packId: null }, ...sortOwnedFirst(out)];
}

// ---------------------------------------------------------------- category registry
// One descriptor per customizable thing. The Wardrobe screen draws one tab per category whose list is non-empty,
// so a new cosmetic system (e.g. Board frames, Combo effects) plugs in with one entry here or one
// registerWardrobeCategory() call from its own module. Descriptor:
//   id, label, icon (inline SVG string), order (tab position), noun (for counts: "Pieces 3/11"),
//   list(save)           -> items [{ id, name, owned, state: 'equipped'|'owned'|'locked', source, go, packId, ... }],
//                           owned first; an item with `auto: true` or id null is a setting, not counted
//   equip(save, id, ctx) -> true if the look changed (ctx.setSetting is the app setter); never unlocks anything
//   isOwned(save, id)    -> bool
//   preview              -> 'orbs' | 'backdrop' | 'keeper' | 'outfit' (built-in painters in src/ui/wardrobe.js) or a
//                           function (canvas, item, save) that paints the item's thumbnail
//   source(save, id)     -> { label, go } for a locked item (how to get it), or null
const ICON = {
  pieces: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="15" r="4.5" fill="currentColor" fill-opacity=".25"/><circle cx="16.5" cy="9" r="5.5" fill="currentColor" fill-opacity=".25"/></svg>',
  backgrounds: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2" fill="currentColor"/><path d="M3 17c4-4 7-5 10-3s5 1 8-2"/></svg>',
  companion: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3l2.3 5.6 6 .5-4.6 3.9 1.4 5.9L12 15.8 6.9 18.9l1.4-5.9L3.7 9.1l6-.5z" fill="currentColor" fill-opacity=".25"/></svg>',
  outfits: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 15l2-8 4 4 2-6 2 6 4-4 2 8z" fill="currentColor" fill-opacity=".25"/><path d="M4 19h16"/></svg>',
};
const findIn = (list, id) => list.find((x) => x.id === id) || null;
const srcOf = (list, id) => { const it = findIn(list, id); return it && !it.owned ? { label: it.source, go: it.go } : null; };

const CATEGORIES = [
  {
    id: 'pieces', get label() { return tr('wardrobe.cat.pieces'); }, icon: ICON.pieces, order: 10, get noun() { return tr('wardrobe.cat.pieces'); }, preview: 'orbs',
    list: pieceItems,
    equip: (save, id) => equipSkin(save, id),
    isOwned: (save, id) => !!(save.skins && save.skins.owned.includes(id)),
    source: (save, id) => srcOf(pieceItems(save), id),
  },
  {
    id: 'backgrounds', get label() { return tr('wardrobe.cat.backgrounds'); }, icon: ICON.backgrounds, order: 20, get noun() { return tr('wardrobe.cat.backgrounds'); }, preview: 'backdrop',
    list: backgroundItems,
    equip: (save, id, ctx = {}) => {
      if (id !== 'auto' && !(BACKDROP_BY_ID[id] && unlockedBackdrops(save).includes(id))) return false;
      if (typeof ctx.setSetting === 'function') ctx.setSetting('backdrop', id);
      else save.settings.backdrop = id;
      return true;
    },
    isOwned: (save, id) => id === 'auto' || unlockedBackdrops(save).includes(id),
    source: (save, id) => srcOf(backgroundItems(save), id),
  },
  {
    id: 'companion', get label() { return tr('wardrobe.cat.companion'); }, icon: ICON.companion, order: 30, get noun() { return tr('wardrobe.cat.companions'); }, preview: 'keeper',
    list: keeperItems,
    equip: (save, id) => equipKeeper(save, id),
    isOwned: (save, id) => ownsKeeper(save, id),
    source: (save, id) => srcOf(keeperItems(save), id),
  },
  {
    id: 'outfits', get label() { return tr('wardrobe.cat.outfits'); }, icon: ICON.outfits, order: 40, get noun() { return tr('wardrobe.cat.outfits'); }, preview: 'outfit',
    // a tab only once there is an outfit to wear (not just "None")
    list: (save) => { const l = outfitItems(save); return l.length > 1 ? l : []; },
    equip: (save, id) => equipOutfit(save, id || null),
    isOwned: (save, id) => !id || !!(save.outfits && Array.isArray(save.outfits.owned) && save.outfits.owned.includes(id)),
    source: (save, id) => srcOf(outfitItems(save), id),
  },
];

/**
 * Add (or replace, by id) a category. For other cosmetic modules, e.g. Board frames (order 15) or Combo effects
 * (order 25): registerWardrobeCategory({ id: 'board', label: 'Board', icon, order: 15, noun: 'Boards', list, equip,
 * isOwned, preview, source }). A category whose list is missing or empty shows no tab.
 */
export function registerWardrobeCategory(desc) {
  if (!desc || !desc.id) return false;
  const i = CATEGORIES.findIndex((c) => c.id === desc.id);
  if (i >= 0) CATEGORIES[i] = desc; else CATEGORIES.push(desc);
  return true;
}

export function wardrobeCategory(id) { return CATEGORIES.find((c) => c.id === id) || null; }

function safeList(cat, save) {
  if (!cat || typeof cat.list !== 'function') return [];
  try { const l = cat.list(save); return Array.isArray(l) ? l : []; } catch (_) { return []; }
}

/** Categories with something to show, in tab order. */
export function wardrobeCategories(save) {
  return CATEGORIES.slice().sort((a, b) => (a.order || 0) - (b.order || 0)).filter((c) => safeList(c, save).length > 0);
}

/** Items of one category (an unknown, missing or empty category gives []). */
export function wardrobeItems(save, id) { return safeList(wardrobeCategory(id), save); }

const countable = (it) => !it.auto && it.id != null;

/** Owned of total per category: { pieces: { owned, total, noun }, ... }. Totals are what the Wardrobe lists right
 *  now; settings like "Follow progress" or "None" are not counted. */
export function wardrobeCounts(save) {
  const out = {};
  for (const c of wardrobeCategories(save)) {
    const l = safeList(c, save).filter(countable);
    if (!l.length) continue;
    out[c.id] = { owned: l.filter((x) => x.owned).length, total: l.length, noun: c.noun || c.label };
  }
  return out;
}

/** Premium packs the player owns some of: [{ id, name, owned, total, complete }]. */
export function ownedPacks(save) {
  return PACKS.map((p) => {
    const pieces = packPieces(p);
    const owned = pieces.filter((x) => ownsPiece(save, x)).length;
    return { id: p.id, name: p.name, owned, total: pieces.length, complete: ownsPack(save, p), skin: p.skin.id, wearing: wearingPack(save, p.id) };
  }).filter((p) => p.owned > 0);
}

/** True when this pack's look is on: its piece style is in use, or (a pack owned without its piece style) one of its
 *  backgrounds is the chosen background. */
export function wearingPack(save, packId) {
  const pack = PACK_BY_ID[packId];
  if (!pack || !save) return false;
  const skinOwned = ownsPiece(save, packPieces(pack)[0]);
  if (skinOwned) return !!(save.skins && save.skins.equipped === pack.skin.id);
  const bd = save.settings && save.settings.backdrop;
  return pack.scenes.some((sc) => sc.id === bd && ownsPiece(save, { kind: 'scene', id: sc.id }));
}

/**
 * "Wear it" in the Your packs sheet (docs/UX_PURCHASES_TAB.md 3c): puts on what is owned of one pack through the
 * existing equip functions: its piece style, the board and merge looks that come with it, and its first owned
 * background. Owns nothing new, changes nothing else. ctx.setSetting is the app setter (applies the background).
 * Returns true when the pack's look is on afterwards.
 */
export function wearPack(save, packId, ctx = {}) {
  const pack = PACK_BY_ID[packId];
  if (!pack || !save) return false;
  const pieces = packPieces(pack);
  if (!pieces.some((p) => ownsPiece(save, p))) return false;
  if (ownsPiece(save, pieces[0])) {
    equipSkin(save, pack.skin.id);
    if (pack.board && ownsLook(save, 'board', pack.board)) equipLook(save, 'board', pack.board);
    if (pack.combo && ownsLook(save, 'combo', pack.combo)) equipLook(save, 'combo', pack.combo);
  }
  const bg = pieces.find((p) => p.kind === 'scene' && ownsPiece(save, p) && unlockedBackdrops(save).includes(p.id));
  if (bg) {
    if (typeof ctx.setSetting === 'function') ctx.setSetting('backdrop', bg.id);
    else { save.settings = save.settings || {}; save.settings.backdrop = bg.id; }
  }
  return true;
}

/** What the player is wearing now: { skin, backdrop ('auto' or id), keeper, outfit }. */
export function currentLook(save) {
  const unlocked = unlockedBackdrops(save);
  const sel = (save.settings && save.settings.backdrop) || 'auto';
  return {
    skin: (save.skins && save.skins.equipped) || 'cafeclassics',
    backdrop: sel !== 'auto' && unlocked.includes(sel) ? sel : 'auto',
    keeper: equippedKeeper(save).id,
    outfit: equippedOutfit(save),
  };
}

/**
 * Equip one item through its category's own equip function (the existing equipSkin / equipKeeper / equipOutfit /
 * backdrop setting). ctx.setSetting is the app setter (it applies the background and saves); the other categories
 * change the save and the caller persists. Locked or unknown items return false and change nothing.
 */
export function equipWardrobe(save, categoryId, id, ctx = {}) {
  const cat = wardrobeCategory(categoryId);
  if (!cat || typeof cat.equip !== 'function') return false;
  if (typeof cat.isOwned === 'function' && !cat.isOwned(save, id)) return false;
  return !!cat.equip(save, id, ctx);
}

// ---- Showing fewer things at once (docs/UX_OPPORTUNITIES.md items 6 and 7). Presentation only: no ids change.
// The café is the main style and Cosmic is one optional style, so the space looks sit in their own collection.
const STARRY = {
  skin: new Set([...COSMIC_PACK.skins, ...SKINS.filter((s) => s.season).map((s) => s.id)]),
  board: new Set(COSMIC_PACK.boards),
  combo: new Set(COSMIC_PACK.combos),
  backdrop: new Set([...BACKDROPS, ...SEASON_BACKDROPS, ...SCENE_BACKDROPS].map((b) => b.id).concat(COSMIC_NEBULAS)),
};
export const COLLECTIONS = [
  { id: 'cafe', get label() { return tr('wardrobe.coll.cafe'); } },
  { id: 'packs', get label() { return tr('wardrobe.coll.packs'); } },
  { id: 'starry', get label() { return tr('wardrobe.coll.starry'); } },
];

/** Which named collection an item belongs to: 'starry' (the Cosmic style), 'packs' (premium packs) or 'cafe'. */
export function itemCollection(item) {
  if (!item) return 'cafe';
  if (item.auto) return 'starry'; // "Follow progress" plays the chapter nebulas (resolveBackdrop), a space look
  const set = STARRY[item.kind];
  if (set && set.has(item.id)) return 'starry';
  if (item.packId) return 'packs';
  return 'cafe';
}

/**
 * Split one tab's items for the screen:
 * - yours: the one in use first, then owned café and pack looks (look 'cosmic' also keeps owned starry ones here);
 * - starry: owned starry looks, shown in their own folded "Starry collection" in the café look;
 * - more: locked looks you can get now (a shop or pack link), in named collections with a count each;
 * - later: how many locked looks only come with play (chapter backgrounds, café companions); they are not listed.
 */
export function wardrobeSections(items, look = 'seaside') {
  const cosmic = look === 'cosmic';
  const yours = [], starry = [], buyable = [];
  let later = 0;
  for (const it of items || []) {
    if (it.owned) {
      if (it.state !== 'equipped' && !cosmic && itemCollection(it) === 'starry') starry.push(it); else yours.push(it);
    } else if (it.go) buyable.push(it);
    else later++;
  }
  const order = cosmic ? ['starry', 'cafe', 'packs'] : ['cafe', 'packs', 'starry'];
  const more = order.map((id) => ({ ...COLLECTIONS.find((c) => c.id === id), items: buyable.filter((it) => itemCollection(it) === id) }))
    .filter((g) => g.items.length);
  return { yours, starry, more, moreCount: buyable.length, later };
}
