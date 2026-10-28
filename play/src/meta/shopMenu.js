// Shop + main menu redesign (docs/SHOP_MENU_RESEARCH.md, DESIGN.md "Shop and menu layout"): the pure rules.
// Display only. Nothing here changes a price, a rule, a score, ownership or anything about ads.
import { IAP, BOOSTERS, BASE_PACK_ID, COIN_PACK_IDS, USD_PER_COIN, noAdsBundleValue, packAllValue, passYearValue } from './economy.js';
import { PACKS, PACK_BY_ID, ownsPack, packPieces, ownsPiece } from './packs.js';
import { daysBetween, dayKey } from './daily.js';
import { t } from '../i18n/index.js'; // pure lookup (docs/LOCALISATION.md phase 4)

/** Week number (local Monday-to-Sunday weeks from 2026-10-19, a Monday; negative before it). Was in rotation.js. */
export function weekIndex(now = new Date()) {
  return Math.floor((daysBetween('2026-10-19', dayKey(now)) || 0) / 7);
}

/**
 * The four Shop tabs, in order (shop audit, DESIGN.md "Shop and menu layout"). Each page shows ONE currency:
 * Packs (real money: themed packs, Café Club, Remove Ads), Looks (looks bought with coins), Buy coins (real money:
 * Starter Pack and coin packs) and Power-ups (coins). Packs is the default, except a newcomer's first visit (Looks).
 * The ids are internal (save and deep-link ids never change); only the labels are shown.
 */
export const SHOP_TABS = Object.freeze(['packs', 'treats', 'coins', 'powerups']);

/** The tab labels, as shown (UX re-check: the names say which tabs cost real money). */
export const SHOP_TAB_LABELS = Object.freeze({
  get packs() { return t('shop.tab.packs'); },
  get treats() { return t('shop.tab.treats'); },
  get coins() { return t('shop.tab.coins'); },
  get powerups() { return t('shop.tab.powerups'); },
});

/** Which currency each tab uses: 'money' tabs carry a small "$" mark, 'coins' tabs the coin icon. */
export const SHOP_TAB_CURRENCY = Object.freeze({ packs: 'money', treats: 'coins', coins: 'money', powerups: 'coins' });

/** Where a Shop place is named in other screens ("Shop › Looks"). */
export const shopPlace = (tab) => t('shop.place', { tab: SHOP_TAB_LABELS[shopTabFor(tab)] });

/** Coin purchases at or above this price always ask first (one confirm sheet everywhere; cheaper boosters stay one tap). */
export const COIN_CONFIRM_MIN = 1000;
export const coinBuyNeedsConfirm = (cost) => Number(cost) >= COIN_CONFIRM_MIN;

/**
 * Café-first order on the Looks tab (DESIGN.md v3: cosmic is a skin, not the default): these coin items read as
 * café, seaside or soft and lead their section; space-themed ones follow. Display order only.
 */
export const COZY_LOOK_IDS = Object.freeze(new Set([
  'seaside', 'pearl', 'candy',                  // piece styles
  'mint', 'peach', 'lilac', 'ocean', 'opal',    // still backgrounds (soft colours)
]));
export const isCozyLook = (x) => !!x && COZY_LOOK_IDS.has(x.id);

/** One honest line for each still background (they used to share "A starry still background"). */
export const BACKGROUND_LINES = Object.freeze({
  mint: 'A quiet night with a soft sea-glass glow.',
  peach: 'A late evening sky with a warm peach glow.',
  lilac: 'A calm night washed in lavender light.',
  ocean: 'Deep harbour blue, hushed like the bay at night.',
  opal: 'A dark sky with a milky opal shimmer.',
  cw_tail: 'A pale comet trail across a starry night.',
  cw_ion: 'A teal ribbon of light across the stars.',
  cw_coma: 'Starlight with a soft green halo.',
});

/**
 * Old Shop tab ids and other deep links map onto the tabs, so every existing caller (Wardrobe "go" ids, the fail
 * offer, Café Club links) still lands in the right place.
 */
export function shopTabFor(id) {
  switch (id) {
    case 'coins': case 'starter': return 'coins';
    case 'boosters': case 'upgrades': case 'powerups': return 'powerups';
    case 'treats': case 'skins': case 'looks': case 'scenes': case 'nebulas': case 'backgrounds': case 'pieces': return 'treats';
    default: return 'packs'; // 'packs', 'pass', 'remove_ads', undefined
  }
}

/** The display name of the 30-day pass (product id and save keys stay `nova_pass` / `pass`). */
export const PASS_NAME = 'Café Club';

/** How many cards a Shop section shows before its "Show all" button (keeps each tab to about three screens). */
export const SHOP_PREVIEW_COUNT = Object.freeze({ packs: 3, treats: 2 });

/**
 * The first `n` items of a section, unowned first (so what you see can be bought), then café-first inside each group
 * (`cozy(x)`, optional), catalogue order otherwise. `owned(x)` says whether the player has x. Returns { shown, rest }.
 */
export function sectionPreview(items, owned, n, cozy = null) {
  const c = typeof cozy === 'function' ? cozy : () => false;
  const group = (list) => [...list.filter((x) => c(x)), ...list.filter((x) => !c(x))];
  const sorted = [...group(items.filter((x) => !owned(x))), ...group(items.filter((x) => owned(x)))];
  return { shown: sorted.slice(0, n), rest: sorted.slice(n) };
}

/** "All 3 for $2.99, save $0.98": the bundle line, only when the bundle really is cheaper than the pieces. */
export function bundleSaveLine(bundleUsd, piecesUsd, count, price) {
  const save = Math.round((piecesUsd - bundleUsd) * 100) / 100;
  return save > 0 ? `All ${count} for ${price}, save $${save.toFixed(2)}` : `All ${count} for ${price}`;
}

const item = (id) => IAP.find((x) => x.id === id);

/**
 * How many more coins per dollar a coin pack gives than the base pack (Pouch: 1,200 for $0.99), as a whole percent.
 * Chest 6,500 for $4.99 is +7%, Vault 14,000 for $9.99 is +16%. 0 for the base pack or a non-coin item.
 */
export function coinBonusPct(id) {
  const it = item(id), base = item(BASE_PACK_ID);
  if (!it || !it.coins || !COIN_PACK_IDS.includes(id) || id === BASE_PACK_ID) return 0;
  const pct = Math.round(((it.coins / it.usd) / (base.coins / base.usd) - 1) * 100);
  return Math.max(0, pct);
}

/**
 * The starter pack's honest value in US dollars: its coins plus its boosters at their coin prices, both turned into
 * money at the base pack rate (the same rate every "≈ $" label uses). About $3.92 today.
 */
export function starterValueUsd() {
  const st = item('starter');
  if (!st) return 0;
  let coins = st.coins || 0;
  for (const [id, n] of Object.entries(st.boosters || {})) coins += (BOOSTERS[id] ? BOOSTERS[id].price : 0) * n;
  return coins * USD_PER_COIN;
}

/** "About $3.90 of value for $1.99": rounded DOWN to 10 cents so the line never overstates. */
export function starterValueLine() {
  const st = item('starter');
  const v = Math.floor(starterValueUsd() * 10) / 10;
  return `About $${v.toFixed(2)} of value for ${st.price}`;
}

/**
 * No Ads Bundle value line: Remove Ads at its own price plus the coins and boosters turned into money at the base pack
 * rate, rounded DOWN to 10 cents. "Remove Ads ($4.99) plus about $7.20 of coins and boosters, for $7.99".
 */
export function noAdsBundleLine() {
  const v = noAdsBundleValue();
  const extra = Math.floor(v.coinsUsd * 10) / 10;
  return `Remove Ads (${v.removeAds}) plus about $${extra.toFixed(2)} of coins and boosters, for ${v.price}`;
}

/** Collector's Shelf line, computed from the pack prices: "One by one the 6 packs cost $17.94: you save $7.95". */
export function packAllLine() {
  const v = packAllValue();
  return v.saves > 0 ? `One by one the ${v.packs} packs cost $${v.separately.toFixed(2)}: you save $${v.saves.toFixed(2)}` : `All ${v.packs} packs for ${v.price}`;
}

/**
 * "Pay the difference" card line (economy.js packFinish): plain facts, no "only", no urgency, no timer.
 * "You already have the Koi Pond skin, so the rest is $0.99."
 */
export function packFinishLine(fin, pack) {
  if (!fin || !pack) return null;
  const have = fin.skin ? `the ${pack.name} skin` : fin.scenes >= 2 ? 'both backgrounds' : 'one of its backgrounds';
  return `You already have ${have}, so the rest is ${fin.price}.`;
}

/** Shelf version (economy.js shelfFinish): "You already have the Koi Pond pack, so the rest of the shelf is $6.99." */
export function shelfFinishLine(fin) {
  if (!fin) return null;
  const have = fin.pack ? `the ${PACK_BY_ID[fin.pack].name} pack`
    : !fin.loose ? `${fin.packs} packs`
      : `${fin.pieces} ${fin.pieces === 1 ? 'piece' : 'pieces'} from these packs`;
  return `You already have ${have}, so the rest of the shelf is ${fin.price}.`;
}

/** About prices: how the finish prices are set. */
export const FINISH_PRICES_LINE = 'Finish prices are the full price minus what you’ve paid, rounded down to a store price.';

/** 12-month Café Club line, computed: "Twelve single months cost $59.88: you save $39.89". */
export function passYearLine() {
  const v = passYearValue();
  return v.saves > 0 ? `Twelve single months cost $${v.separately.toFixed(2)}: you save $${v.saves.toFixed(2)}` : `${v.months} months for ${v.price}`;
}

/** "Earn coins by playing": the gentle hint shown with a coin item you can't afford yet (never a link to buy coins). */
export const EARN_COINS_LINE = 'Earn coins by playing: stars, Daily Orbits and daily gifts.';

/**
 * Premium pack order (Shop › Packs list). The first card is this week's calendar pick ("Featured") (week number mod pack count, the same
 * for every player), skipping packs the player owns in full; owned packs go to the end. Ownership is the only
 * input: never spend, ads or device.
 */
export function packCarouselOrder(save, now = new Date()) {
  const n = PACKS.length;
  if (!n) return [];
  const start = ((weekIndex(now) % n) + n) % n;
  const rotated = Array.from({ length: n }, (_, i) => PACKS[(start + i) % n]);
  return [...rotated.filter((p) => !ownsPack(save, p)), ...rotated.filter((p) => ownsPack(save, p))];
}

/** "2 of 3 pieces yours": only once at least one piece is owned, and not once the whole pack is. */
export function collectionLine(save, pack) {
  const pieces = packPieces(pack);
  const have = pieces.filter((p) => ownsPiece(save, p)).length;
  if (!have || have === pieces.length) return null;
  return `${have} of ${pieces.length} pieces yours`;
}

/**
 * The Today badge on the menu rail: how many Today rows hold something she can collect right now (no "!" badges),
 * so it is never more than 3 (docs/UX_FIRST_WEEK.md F2). Daily gift ready = 1, any Today tasks (or their bonus)
 * ready = 1, Café Club days ready = 1 (one tap collects them).
 */
export function todayCount({ dailyAvailable = false, orbitsReady = 0, passClaimable = 0 } = {}) {
  return (dailyAvailable ? 1 : 0) + ((orbitsReady | 0) > 0 ? 1 : 0) + (passClaimable > 0 ? 1 : 0);
}

/**
 * "Try for a level" (pack skins): the look is worn for one Journey level, then the player's own skin is back with
 * one quiet message. Held in memory only: never written to the save, never changes ownership, rules or score.
 */
export function createTrial() {
  let pending = null; // { skin, name, level } waiting for its level to start
  let active = null;  // the trial being worn right now
  return {
    /** Book a trial of `skin` for Journey level `level`. */
    start(skin, name, level) { pending = { skin, name, level }; active = null; },
    /**
     * A Journey level is starting: returns the skin to wear for it, or null. A booked trial is used once, and only by
     * its level; any other start cancels it.
     */
    begin(level) {
      active = null;
      if (pending && pending.level === level) active = pending;
      pending = null;
      return active ? active.skin : null;
    },
    /** Any other mode starts: no trial. */
    cancel() { pending = null; active = null; },
    /** The skin being tried right now, or null. */
    skin() { return active ? active.skin : null; },
    /** The level ended (or the player left it): the trial is over. Returns the one message to show, once, or null. */
    end(ownName, shopPlace = 'Shop › Packs') {
      if (!active) return null;
      const t = active;
      active = null;
      return `Back to ${ownName}. ${t.name} is in ${shopPlace}.`;
    },
  };
}

/**
 * What a coin look card (board or combo skin, Shop › Looks) offers: 'equipped', 'equip' (owned), 'buy' (enough coins)
 * or 'short' with `need` = how many more coins it takes. Display only: buying still goes through buyLook, and a short
 * card never opens a purchase by itself. `look` is a lookList entry ({ cost, owned, equipped }).
 */
export function lookCardAction(look, coins) {
  if (look.equipped) return { action: 'equipped', need: 0 };
  if (look.owned) return { action: 'equip', need: 0 };
  const have = Math.max(0, Math.floor(Number(coins) || 0));
  const need = Math.max(0, (look.cost || 0) - have);
  return need > 0 ? { action: 'short', need } : { action: 'buy', need: 0 };
}

/** "Need 700 more coins": the plain line under a look the player can't afford yet. */
export function coinsNeededLine(need) {
  return `Need ${Number(need).toLocaleString('en-US')} more coin${need === 1 ? '' : 's'}`;
}
