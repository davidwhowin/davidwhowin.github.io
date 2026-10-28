// Shop unlock tour (DESIGN.md "Shop unlock tour"; Unity Scripts/Meta to mirror the save fields).
// When Level 1 is cleared the Shop opens up (onboarding UNLOCKS.shop, v3). Home shows a one-time "Shop unlocked!" card and a dot on
// the Shop tab until the Shop is first opened. The first time the Shop opens (on its Looks tab, a newcomer's first stop), a short coach-mark tour
// runs, and its last step hands over one free *basic* item: the cheapest coin-priced look (never a paid pack piece).
// Skipping still gives the gift. The gift is granted once, recorded in one save field, so a reload or an interrupted
// tour can never grant it twice. No purchase prompts, no countdowns, and the tour never switches tabs.
import { unlocked } from './onboarding.js';
import { BOARD_LOOKS, COMBO_LOOKS, ownsLook } from './looks.js';
import { SKINS } from './economy.js';
import { withText, TEXT, t as tr } from '../i18n/index.js'; // tr: this file uses t for the tour state

/**
 * Save field `shopTour`:
 *   banner: bool  the one-time "Shop unlocked!" card on Home has been shown
 *   opened: bool  the Shop has been opened since it unlocked (clears the dot on the Shop tab)
 *   done:   bool  the tour was finished or skipped
 *   gift:   ''    | 'board:<id>' | 'combo:<id>' | 'skin:<id>' | 'none'  ('' = not granted yet; 'none' = nothing was left)
 */
export const defaultShopTour = () => ({ banner: false, opened: false, done: false, gift: '' });

const GIFT_RE = /^(board|combo|skin):[a-z0-9_]+$/;

/** Save repair + migration: older saves get the defaults, so players already past Level 3 still get the dot, tour and gift. */
export function sanitizeShopTour(save) {
  const d = defaultShopTour();
  let t = save.shopTour;
  if (!t || typeof t !== 'object' || Array.isArray(t)) t = {};
  const out = {
    banner: t.banner === true,
    opened: t.opened === true,
    done: t.done === true,
    gift: typeof t.gift === 'string' && (t.gift === 'none' || GIFT_RE.test(t.gift)) ? t.gift : d.gift,
  };
  save.shopTour = out;
  return out;
}

const st = (save) => (save.shopTour && typeof save.shopTour === 'object' ? save.shopTour : sanitizeShopTour(save));

export const shopUnlocked = (save) => unlocked(save, 'shop');
/** Show the "Shop unlocked!" card on Home (once). */
export const unlockBannerDue = (save) => shopUnlocked(save) && !st(save).banner;
export function markBannerSeen(save) { st(save).banner = true; }
/** The dot on the Shop tab: only between the unlock and the first Shop visit. */
export const shopDotOn = (save) => shopUnlocked(save) && !st(save).opened;
export function markShopOpened(save) { if (shopUnlocked(save)) st(save).opened = true; }
/** The tour runs (on the Looks tab) until it is finished or skipped. */
export const tourDue = (save) => shopUnlocked(save) && !st(save).done;
export const giftGiven = (save) => st(save).gift !== '';

/** Gift candidates, cheapest first: coin board/combo looks (never pack looks), then coin orb skins (never premium). */
export function giftCandidates() {
  const looks = [
    ...COMBO_LOOKS.map((l) => ({ ...l, kind: 'combo' })),
    ...BOARD_LOOKS.map((l) => ({ ...l, kind: 'board' })),
  ].filter((l) => typeof l.cost === 'number' && l.cost > 0 && !l.pack);
  looks.sort((a, b) => a.cost - b.cost);
  const skins = SKINS.filter((s) => typeof s.cost === 'number' && s.cost > 0 && !s.pack && !s.pass && !s.capsule && !s.season)
    .map((s) => ({ ...s, kind: 'skin' }))
    .sort((a, b) => a.cost - b.cost);
  return [...looks, ...skins];
}

export function ownsGiftItem(save, it) {
  if (it.kind === 'skin') return !!(save.skins && Array.isArray(save.skins.owned) && save.skins.owned.includes(it.id));
  return ownsLook(save, it.kind, it.id);
}

/** The item the gift would be right now: the cheapest basic item this save does not own yet (null if it owns them all). */
export function pickShopGift(save) {
  return giftCandidates().find((it) => !ownsGiftItem(save, it)) || null;
}

/** The catalogue entry a stored gift id names ({ kind, id, name, desc, cost }), or null. */
export function giftItem(code) {
  if (typeof code !== 'string' || !GIFT_RE.test(code)) return null;
  const [kind, id] = code.split(':');
  return giftCandidates().find((it) => it.kind === kind && it.id === id) || null;
}

function addOwned(save, it) {
  if (it.kind === 'skin') {
    if (!save.skins || typeof save.skins !== 'object') save.skins = { owned: ['classic'], equipped: 'classic' };
    if (!Array.isArray(save.skins.owned)) save.skins.owned = ['classic'];
    if (!save.skins.owned.includes(it.id)) save.skins.owned.push(it.id);
    return;
  }
  const key = it.kind === 'board' ? 'boardSkins' : 'comboSkins';
  const def = it.kind === 'board' ? 'nova' : 'stardust';
  let v = save[key];
  if (!v || typeof v !== 'object' || Array.isArray(v)) v = save[key] = { owned: [def], equipped: def };
  if (!Array.isArray(v.owned)) v.owned = [def];
  if (!v.owned.includes(it.id)) v.owned.push(it.id);
}

/**
 * Grant the free gift exactly once. Owned, not equipped (the gift step offers "Wear it now"). Costs nothing.
 * Returns the gift item (also on later calls, without granting again), or null when nothing basic was left to give.
 */
export function grantShopGift(save) {
  const t = st(save);
  if (t.gift) return giftItem(t.gift);
  const it = pickShopGift(save);
  if (!it) { t.gift = 'none'; return null; }
  addOwned(save, it);
  t.gift = `${it.kind}:${it.id}`;
  return it;
}

/** Wear the gift now. False if it is not owned. */
export function wearShopGift(save, it) {
  if (!it || !ownsGiftItem(save, it)) return false;
  if (it.kind === 'skin') { save.skins.equipped = it.id; return true; }
  const key = it.kind === 'board' ? 'boardSkins' : 'comboSkins';
  save[key].equipped = it.id;
  return true;
}

/** Finish (or skip) the tour: the gift is granted either way. Returns the gift item or null. */
export function finishShopTour(save) {
  const it = grantShopGift(save);
  st(save).done = true;
  st(save).opened = true;
  return it;
}

// Text (docs/LOCALISATION.md phase 4c): content text shopTour.* (src/i18n/content/en.js). TOUR_COPY reads it live; the
// SKIP_LINE / SKIP_NOTE / GIFT_TITLE exports are the same words read once at start-up, kept for tests.
export const TOUR_COPY = withText({
  skipLine: TEXT,
  skipNote: TEXT,
  giftTitle: TEXT,
  kind: {
    board: { label: TEXT, hint: TEXT },
    combo: { label: TEXT, hint: TEXT },
    skin: { label: TEXT, hint: TEXT },
  },
}, 'shopTour');
export const SKIP_LINE = TOUR_COPY.skipLine;
export const SKIP_NOTE = TOUR_COPY.skipNote;
/** What the gift is, in the Shop's own words (Piece style, Board look, Merge look). */
export const GIFT_KIND_LABEL = Object.freeze({
  get board() { return TOUR_COPY.kind.board.label; }, get combo() { return TOUR_COPY.kind.combo.label; }, get skin() { return TOUR_COPY.kind.skin.label; },
});
/** One plain line on what that kind of look changes. */
export const GIFT_KIND_HINT = Object.freeze({
  get board() { return TOUR_COPY.kind.board.hint; }, get combo() { return TOUR_COPY.kind.combo.hint; }, get skin() { return TOUR_COPY.kind.skin.hint; },
});
/** The gift card's heading: café-flavoured, and it says it is a gift. */
export const GIFT_TITLE = TOUR_COPY.giftTitle;
/** "Merge look: the sparkle when two pieces join. Free, yours to keep." */
export const giftKindLine = (kind) => {
  const label = GIFT_KIND_LABEL[kind] || tr('shopTour.look'), hint = GIFT_KIND_HINT[kind];
  return hint ? tr('shopTour.giftLine', { label, hint }) : tr('shopTour.giftLineBare', { label });
};

/**
 * The coach-mark steps. The tour runs on the Looks tab, where a newcomer's first Shop visit opens. `targets` are CSS
 * selectors tried in order on the Shop screen (then the whole page); `union` spotlights all of them together. A step
 * whose targets are all missing is left out. The last step is the gift card (no spotlight).
 * Step 1 says plainly which buttons cost real money and that coins are earned by playing; step 2 says what Buy coins
 * is. Captions never ask for a purchase and never mention a deadline. `freePlay` text is used only once Free Play is
 * unlocked (tourSteps).
 */
export const TOUR_STEPS = [
  withText({ id: 'money', targets: ['.shop-tabs [data-tab="packs"]', '.shop-tabs [data-tab="coins"]'], union: true,
    title: TEXT, text: TEXT }, 'shopTour.step.money'),
  withText({ id: 'coins', targets: ['.shop-tabs [data-tab="coins"]'],
    title: TEXT, text: TEXT }, 'shopTour.step.coins'),
  withText({ id: 'looks', targets: ['.shop-tabs [data-tab="treats"]', '.shop-tabs [data-tab="powerups"]'], union: true,
    title: TEXT, text: TEXT,
    freePlay: TEXT }, 'shopTour.step.looks'),
  withText({ id: 'wardrobe', targets: ['.wd-link[data-to-wardrobe]'],
    title: TEXT, text: TEXT }, 'shopTour.step.wardrobe'),
  withText({ id: 'gift', targets: [], title: TEXT, text: TEXT }, 'shopTour.step.gift'),
];

/** The steps as this save should read them (Free Play is only named once it is unlocked). */
export function tourSteps(save) {
  const fp = !!save && unlocked(save, 'freePlay');
  return TOUR_STEPS.map((s) => (s.freePlay ? { ...s, text: fp ? s.freePlay : s.text } : s));
}
