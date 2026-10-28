// Board and Combo tabs for the Wardrobe (DESIGN.md "Wardrobe", "Board skins", "Combo skins").
// Data + thumbnails only: the Wardrobe screen draws the tabs. Equipping goes through looks.js; nothing is granted
// or unlocked here. Cosmetic only.
import { registerWardrobeCategory } from '../meta/wardrobe.js';
import { lookList, equipLook, ownsLook } from '../meta/looks.js';
import { PACK_BY_ID } from '../meta/packs.js';
import { IAP } from '../meta/economy.js';
import { drawBoardPreview } from '../game/boardArt.js';
import { drawFxPreview } from '../game/fxSkins.js';
import { t as tr } from './i18n.js';

const fmtN = (n) => Number(n).toLocaleString('en-US');
const RANK = { equipped: 0, owned: 1, locked: 2 };

/** How a locked look is earned: its premium pack, or the Shop's "Board & combo looks" rows (Shop › Looks). */
export function lookSource(l) {
  if (l.pack) {
    const pack = PACK_BY_ID[l.pack];
    const price = (IAP.find((x) => x.id === (pack && pack.product)) || {}).price || '';
    const name = pack ? pack.name : l.pack;
    return { label: price ? tr('wardrobe.src.packPrice', { name, price }) : tr('wardrobe.packChip', { name }), go: 'packs', packId: l.pack };
  }
  return { label: tr('wardrobe.src.coins', { coins: fmtN(l.cost) }), go: 'looks', packId: null };
}

function items(save, kind) {
  return lookList(save, kind)
    .map((l, i) => {
      const state = l.equipped ? 'equipped' : l.owned ? 'owned' : 'locked';
      const src = l.owned ? null : lookSource(l);
      return [{ kind, id: l.id, name: l.name, owned: l.owned, state, tag: l.desc, source: src ? src.label : '', go: src ? src.go : null, packId: src ? src.packId : null }, i];
    })
    .sort((a, b) => (RANK[a[0].state] - RANK[b[0].state]) || (a[1] - b[1]))
    .map((x) => x[0]);
}

function fit(cv) {
  const w = cv.clientWidth || 120, h = cv.clientHeight || 74;
  const dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  const g = cv.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  return { g, w, h, dpr };
}
const orbSkin = (save) => (save.skins && save.skins.equipped) || 'classic';

const ICON = {
  board: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="4" y="3" width="16" height="18" rx="3" fill="currentColor" fill-opacity=".2"/><path d="M9.3 6v12M14.7 6v12"/></svg>',
  combo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" fill="currentColor" fill-opacity=".25"/><path d="M18.5 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/></svg>',
};

/** The two descriptors (exported for tests). */
export const LOOK_CATEGORIES = [
  {
    id: 'board', get label() { return tr('wardrobe.cat.board'); }, icon: ICON.board, order: 15, get noun() { return tr('wardrobe.cat.boards'); },
    list: (save) => items(save, 'board'),
    equip: (save, id) => equipLook(save, 'board', id),
    isOwned: (save, id) => ownsLook(save, 'board', id),
    source: (save, id) => { const it = items(save, 'board').find((x) => x.id === id); return it && !it.owned ? { label: it.source, go: it.go } : null; },
    preview: (cv, item, save) => { const { g, w, h, dpr } = fit(cv); drawBoardPreview(g, w, h, item.id, { dpr, skin: orbSkin(save), reduced: true }); },
  },
  {
    id: 'combo', get label() { return tr('wardrobe.cat.combo'); }, icon: ICON.combo, order: 25, get noun() { return tr('wardrobe.cat.combos'); },
    list: (save) => items(save, 'combo'),
    equip: (save, id) => equipLook(save, 'combo', id),
    isOwned: (save, id) => ownsLook(save, 'combo', id),
    source: (save, id) => { const it = items(save, 'combo').find((x) => x.id === id); return it && !it.owned ? { label: it.source, go: it.go } : null; },
    preview: (cv, item, save) => { const { g, w, h, dpr } = fit(cv); drawFxPreview(g, w, h, item.id, { dpr, skin: orbSkin(save) }); },
  },
];

for (const c of LOOK_CATEGORIES) registerWardrobeCategory(c);
