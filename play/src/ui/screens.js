// DOM overlay screens: menu, level map, shop, Daily Orbits, daily reward, pause, and all
// in-run modals (perk pick, revive, fail offer, results).
import { $, el, fmt, esc, tap, countUp, ICONS, playStackTop } from './dom.js';
import { t as tr, tp as trp, LOCALES, getLocale, setLocale } from './i18n.js'; // `tr`: `t` is a common local name in this file
import { paintOrbCanvas, TIER_SHAPES, drawOrb } from '../game/orbArt.js';
import { PERK_BY_ID, perkHint, PATH_BY_ID, perkPath, perkName, perkDesc, pathLine } from '../game/perks.js';
import { testOptions } from '../game/autoplay.js';
import { tierName, pieceWord, pieceGender, skinTierText } from '../game/tierNames.js'; // display names follow the orb skin
import { CHALLENGES, challengeLine, challengeBest, normChallenge } from '../meta/challenge.js';
import { pathRows, lastPath } from '../meta/paths.js';
import { zenBest, ZEN_COIN_CAP } from '../meta/zen.js';
import { SOUND_BACKDROPS, normSoundBackdrop } from '../meta/soundBackdrop.js';
import { SOUND_COLLECTIONS, COLLECTION_BACKDROPS, SOUND_PREVIEW_SECONDS, canUseBackdrop, chipPrice, playableBackdrop, startSoundPreview } from '../meta/soundCollections.js';
import { STEADY_FAILS } from '../meta/steadyStart.js';
import { STREAK_MAX } from '../meta/winStreak.js';
import { levelTipText, levelTipLabel } from '../meta/levelTips.js';
import { mechanicIntro, SECOND_CUP_NOTE, SECOND_CUP_FIRST } from '../meta/mechanicIntro.js';
import { winNote, runHighlight } from '../meta/resultNote.js'; // the one note slot on result cards (docs/UX_RESULT_CARDS.md)
import { drawGlaze } from '../game/glazeArt.js';
import { drawTeapot, drawTeapotHint } from '../game/teapotArt.js';
import { drawTin } from '../game/tinArt.js';
import { getLevel, getDailyLevel, goalText as rawGoalText, LEVEL_COUNT, BOOSTER_UNLOCKS } from '../game/levels.js';
import { buildLevelMap } from './levelMap.js';
import {
  UPGRADES, SKINS, upgradeCost, upgradeLevel, buyUpgrade, buySkin, equipSkin, BOOSTERS, buyBooster, IAP, grantIap,
  packCoins, firstPackBonusAvailable, isCoinPack, passValue, packAllOffered, noAdsOffered, packFinish, shelfFinish,
} from '../meta/economy.js';
import { PASS, PASS_YEAR, PASS_YEAR_ENABLED, passState, claimPass, nextKeepsake, keepsakesLeft, keepsakeLine, auroraThanks } from '../meta/pass.js';
import { dailyRewardState, claimDailyReward, DAILY_REWARDS, dailyChallengeBest, dayKey } from '../meta/daily.js';
import {
  nebulaState, recentDays, monthKeyOf, monthName, monthSolved, hasBadge, NEBULA_BADGE_TARGET, starText, shareText, shareCard,
  dailyTwistFor, twistLabel,
} from '../meta/dailyNebula.js';
import { ensureOrbits, orbitText, claimOrbit, claimOrbitBonus, claimableOrbits, bonusReady, orbitsSummary, ORBIT_BONUS } from '../meta/orbits.js';
import { Svc } from '../meta/services.js';
import { chainText } from '../meta/highlights.js';
import { skyMonth, nightsLine } from '../meta/skyCalendar.js';
import { discoveryFact, discoveryBlurb, silhouetteHint } from '../meta/starFacts.js';
import { journeyStopCard, nebulaStopCard, stopCueDue } from '../meta/stopCard.js';
import {
  BACKDROPS, backdropSwatchCss, resolveBackdrop, unlockedBackdrops, chapterStartLevel, sectorStart, chapterOf, CHAPTER_LEVELS,
} from '../game/backdrops.js';
import { BACKDROP_BY_ID } from '../game/backdrops.js';
import { animateKeeperCanvas, animateKeepersIn } from './keeperLive.js';
import { paintKeeperCanvas } from '../game/keeperArt.js'; // living Keepers (breathe, blink, hop on tap)
import {
  KEEPERS, ownsKeeper, equipKeeper, equippedKeeper, keeperLine, STORY, chapterTitle, replayableChapters, markStorySeen,
} from '../meta/keepers.js';
import { SAVE_KEY, loadSave, persistNow } from '../meta/save.js';
import { OUTFITS, OUTFIT_BY_ID, CLUB_KEEPSAKES, equipOutfit, equippedOutfit } from '../meta/outfits.js';
import { menuExtrasOpen, menuKeeperLineOn, skipIntroOnPlay, fullResultCard } from '../meta/onboarding.js';
import { SEASON_BACKDROPS, SCENE_BACKDROPS, PACK_BACKDROPS, SEASIDE_BACKDROPS } from '../game/backdrops.js';
import { SCENE_PRICE, buyScene, ownsScene, scenesDiffer, COSMIC_NEBULAS, COSMIC_NEBULA_PRICE, buyNebula, ownsNebula } from '../meta/scenes.js';
import { paintScenePreview, buildScene, paintBase } from '../game/sceneArt.js';
import { PACKS, PACK_BY_ID, packAllPacks, packOffers, packPieces, ownsPiece, ownsPack, ownsAnyOfPack, packProduct } from '../meta/packs.js';
import { keepsakeFrame, KEEPSAKE_BY_ID } from '../meta/seasonal.js'; // Season Keepsakes (postcard frame, confirm box)
import { lookList, buyLook, equipLook } from '../meta/looks.js';
import { drawBoardPreview } from '../game/boardArt.js';
import { drawFxPreview } from '../game/fxSkins.js';
import { unlockBannerDue, markBannerSeen, shopDotOn, markShopOpened, tourDue, giftItem } from '../meta/shopTour.js';
import { unlockCardHtml, runShopTour } from './shopTourUI.js';
import { AD_REWARDS } from '../ads/adRules.js';
import { adsInfo } from '../meta/adsInfo.js';
import { exportCode, readCode, transferErrorText, transferSummary, importedSave } from '../meta/transfer.js';
import { APP_LINKS, isPlaceholderLink, reportAdMailto, feedbackMailto, openLink } from '../meta/appLinks.js';
import { weeklyJournalHtml, bindWeeklyJournal } from './weeklyView.js';
import { journalSummary, featDateText, TREND_RECENT, TREND_MIN_EARLIER } from '../meta/journal.js';
import { CONSTELLATIONS, observatoryState, completedCount, chapterView, progressLine, STARS_TO_FINISH } from '../meta/observatory.js';
import { paintConstellation, animateConstellation } from './observatoryArt.js';
import { runPostcard, constellationPostcard, nebulaPostcard, postcardCaption } from '../meta/postcard.js';
import { renderPostcard, sharePostcard, fontsReady } from './postcardArt.js';
import { showWardrobe } from './wardrobe.js';
import { challengeLinkHtml, bindChallengeLink, showFriendEnter, canChallenge, showFriendSend } from './challengeView.js'; // Challenge a friend
import { shopTabFor, coinBonusPct, starterValueLine, noAdsBundleLine, packAllLine, passYearLine, packCarouselOrder, collectionLine, todayCount, lookCardAction, coinsNeededLine,
  SHOP_TABS, SHOP_TAB_LABELS, SHOP_TAB_CURRENCY, COIN_CONFIRM_MIN, coinBuyNeedsConfirm, isCozyLook, BACKGROUND_LINES, PASS_NAME, SHOP_PREVIEW_COUNT, sectionPreview, bundleSaveLine, EARN_COINS_LINE,
  packFinishLine, shelfFinishLine, FINISH_PRICES_LINE } from '../meta/shopMenu.js';
export { showWardrobe };
import { renderHome, showTodaySheet, openCafeRestore } from './home.js';
export { openCafeRestore };
import { word, cozyText, goalCopy, pageLook, tierGoalText, finishWord } from './copy.js';
import { COPY as LESSON_COPY } from '../meta/firstRun.js';
import { uiLook } from '../meta/looks.js';
import { unlocked } from '../meta/onboarding.js';
import { cafeSummary, taskStyle } from '../meta/cafe.js';
import { tomorrowGift, tomorrowLine, collectedLine, giftOutcomeLine, eveningOneGiftDue, nextFix, streakLineShown, plainStreakLine } from '../meta/menuCards.js';
import { bakeOfferDue } from '../meta/bakes.js'; // Tonight's bake: the oven card on the way out (docs/UX_TONIGHTS_BAKE.md)
import { showOvenCard } from './bakeView.js';
import { TIP_IDS, TIP_LEAD, TIP_FINE, tipThanks, hasTipJar } from '../meta/tips.js'; // thank-you tip (About only)
import { paintDecorIcon } from '../game/seasonalArt.js';
import { goodnightLineHtml, goodnightNoteHtml, bindGoodnight, showCalmOffer } from './goodnight.js';
import { calmOfferDue, loadCalmAsked } from '../meta/windDown.js'; // wind-down Evening calm (src/meta/windDown.js)
import { showBooks, showBook, showBookSolved, showBookOut, renderBookShop } from './books.js'; // Puzzle Books
export { showBooks, showBook, showBookSolved, showBookOut };
/** Goal text in the player's words, café "stones" in every look (the rule module's text stays as-is for the fixtures and the C# port). */
const goalText = (g, short) => goalCopy(rawGoalText(g, short), pageLook());
// Wardrobe: a coat hanger
export const WARDROBE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 7.2a2.2 2.2 0 1 1 2.2-2.2c0 1.1-.8 1.6-1.4 2-.5.3-.8.7-.8 1.3v.4"/><path d="M12 8.7 3.4 15.2c-.9.7-.4 2.1.7 2.1h15.8c1.1 0 1.6-1.4.7-2.1L12 8.7z"/></svg>';

export const BUILD = 'v0.6.45';

const root = () => $('#screens');
const click = () => Svc.sfx('ui');

/**
 * A table line with markup in some placeholders: the line is escaped, then each {name} in `parts` gets its ready HTML
 * (build it with bold() or esc()). Fill the plain placeholders in the tr() call itself, then pass the marked-up ones here.
 */
function trHtml(line, parts) {
  return esc(line).replace(/\{(\w+)\}/g, (m, k) => (Object.prototype.hasOwnProperty.call(parts, k) ? String(parts[k]) : m));
}
const bold = (s, cls = '') => `<b${cls ? ` class="${cls}"` : ''}>${esc(s)}</b>`;

function open(node) {
  root().appendChild(node);
  // the ad-break line on result screens opens "How ads work here"
  const info = node.querySelector('[data-adinfo]');
  if (info) tap(info, () => showAdsInfo(), click);
  bindGoodnight(node, shopApp); // the once-a-night goodnight line on a result card (never tied to ads)
  // a top-bar coin counter opens Shop › Buy coins over this screen (the Shop wires its own to its Buy coins tab)
  const pill = node.querySelector('.topbar [data-coinshop]');
  if (pill && shopApp && !node.classList.contains('shop-screen')) tap(pill, () => showShop(shopApp, 'coins', () => refreshCoins(shopApp.save)), click);
  return node;
}

function close(node) {
  if (!node || !node.parentNode) return Promise.resolve();
  return new Promise((res) => {
    node.classList.add('leaving');
    setTimeout(() => { node.remove(); res(); }, 180);
  });
}

/** The app object, kept for the coin counter's Shop link (set by showMenu, which runs first at boot). */
let shopApp = null;

export function closeAll() {
  for (const n of Array.from(root().children)) n.remove();
}

/** Toasts never cover the title or the tab row of the screen on top (Settings, Observatory, Shop,
 *  Star Keepers): with tabs showing, the stack starts just below them (same rule as Unity's ScreenNode.ToastBelow). */
function placeToasts() {
  const box = $('#toasts');
  const hud = inPlayHud();
  if (hud) {
    // in play (HUD showing, no screen over it) toasts sit inside the top of the board, below the drop preview, so
    // they never cover the score / level / goal chips or the piece about to drop; under the rule box / tip and the
    // keeper's bubble when those show (stack: hint, keeper bubble, toasts)
    box.style.top = playStackTop(hud, ['#hint', '#keeper-say']) + 'px';
    return;
  }
  const screens = [...root().children].filter((n) => !n.classList.contains('leaving'));
  const top = screens[screens.length - 1];
  const tabs = top && top.querySelector('.tabs, .more-tabs');
  const r = tabs && tabs.getClientRects().length ? tabs.getBoundingClientRect() : null;
  box.style.top = r && r.bottom > 0 ? `max(calc(var(--sat) + 70px), ${Math.round(r.bottom + 8)}px)` : '';
}

/** The HUD element while a run is in play with no screen over it, else null. */
function inPlayHud() {
  const top = [...root().children].some((n) => !n.classList.contains('leaving'));
  return top ? null : document.querySelector('#hud:not(.hidden)');
}

/** Seconds a board banner (LEVEL / EXTRA TRICKY, chain...) still shows; main.js sets it (game fx.bannerLeft). */
let bannerLeft = () => 0;
export function setToastHold(fn) { bannerLeft = typeof fn === 'function' ? fn : () => 0; }

/**
 * Toast clock and placement. In play, toasts step aside (hidden, their time not running) while a board banner shows
 * (LEVEL / EXTRA TRICKY at the start, a chain banner), so they never sit on it, and come back for the rest of their
 * time once it has faded. Calm / reduced motion: banners still show, so the same hold applies. While
 * toasts show they stay placed: one made before play starts (e.g. "Saved run ended") follows the HUD once the level
 * begins, and moves under a rule box or keeper bubble that appears later.
 */
let toastTick = 0;
let toastLast = 0;
function toastStep() {
  const box = $('#toasts');
  const now = Date.now();
  const dt = now - toastLast;
  toastLast = now;
  if (playQueue.length && !box.querySelector('.toast:not(.out)')) { const [qt, qms] = playQueue.shift(); addToast(qt, qms); return; }
  if (!box.children.length) { clearInterval(toastTick); toastTick = 0; return; }
  let hold = false;
  if (inPlayHud()) { try { hold = (Number(bannerLeft()) || 0) > 0.02; } catch (_) { hold = false; } }
  for (const t of box.children) {
    if (t.classList.contains('out') || t._left == null) continue;
    if (hold) { t.classList.add('held'); continue; } // clock paused while a banner shows
    if (t.classList.contains('held')) t.classList.remove('held'); // display returns, so its pop-in plays now
    t._left -= dt;
    if (t._left <= 0) { t.classList.add('out'); setTimeout(() => t.remove(), 320); }
  }
  placeToasts();
}
function keepToastsPlaced() {
  if (toastTick) return;
  toastLast = Date.now();
  toastTick = setInterval(toastStep, 100);
}

/** At most this many toasts show at once (Unity: ScreenHost.MaxToasts). A newer one retires the oldest at once, so
 *  several toasts stack (gap in styles.css #toasts) and never pile up over each other or past the screen. */
const MAX_TOASTS = 3;

/**
 * Toasts wait while the Endless perk pick sheet is open (docs/UX_OPPORTUNITIES.md item 5): a bounty or "A new view"
 * toast never lands on top of a choice. They play, a little apart, once the sheet closes. A toast about the sheet
 * itself (e.g. no reroll reward) passes now = true. Unity mirrors this in ScreenHost.
 */
let heldToasts = null;
const perkSheetOpen = () => !!document.querySelector('#screens [data-perkpick]:not(.leaving)');
function holdToasts() { if (!heldToasts) heldToasts = []; }
function releaseToasts() {
  if (perkSheetOpen()) return; // another pick sheet opened straight away: keep holding until that one closes
  const q = heldToasts;
  heldToasts = null;
  if (q) q.forEach(([t, ms], i) => setTimeout(() => addToast(t, ms), 250 + i * 600));
}

/**
 * In play, one toast at a time (docs/UX_FEATURE_GATES.md finding 5): a toast that arrives while another shows waits
 * its turn instead of stacking over the board (e.g. Pip's level-start line and "A new view"). Menus still stack.
 */
const playQueue = [];
function addToast(t, ms, now = false) {
  if (!now && inPlayHud() && $('#toasts').querySelector('.toast:not(.out)')) {
    if (playQueue.length >= MAX_TOASTS) playQueue.shift(); // never a long backlog: the oldest waiting one goes
    playQueue.push([t, ms]);
    keepToastsPlaced();
    return;
  }
  if (heldToasts && !now) {
    // the sheet went away some other way (e.g. the run was closed): stop holding
    if (perkSheetOpen()) { heldToasts.push([t, ms]); return; }
    releaseToasts();
  }
  const box = $('#toasts');
  const live = [...box.children].filter((n) => !n.classList.contains('out'));
  for (let i = 0; i <= live.length - MAX_TOASTS; i++) live[i].remove();
  // joining a stack: scale in only (sliding down from above would cross the toast over it); a class set once, so
  // the toast doesn't replay its pop when the ones above it leave
  if (box.querySelector('.toast:not(.out)')) t.classList.add('stacked');
  t._left = ms;
  box.appendChild(t);
  keepToastsPlaced();
  toastStep(); // places it now (and holds it at once if a banner is showing)
}

export function toast(text, good = false, ms = 2400, now = false) {
  addToast(el(`<div class="toast ${good ? 'good' : ''}">${esc(text)}</div>`), ms, now);
}

// Second cup: a café cup with two wisps of steam (steam animates unless Calm / reduced motion)
const CUP_SVG = '<svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true" style="flex:none;overflow:visible">'
  + '<path class="cup-steam" d="M12 10c-2-2 2-3.5 0-6" stroke="#c9a68c" stroke-width="2" fill="none" stroke-linecap="round"/>'
  + '<path class="cup-steam" d="M18 10c-2-2 2-3.5 0-6" stroke="#c9a68c" stroke-width="2" fill="none" stroke-linecap="round"/>'
  + '<path d="M6 13h18v6a8 8 0 0 1-8 8h-2a8 8 0 0 1-8-8z" fill="#e9876a" stroke="#9c4a33" stroke-width="1.5" stroke-linejoin="round"/>'
  + '<path d="M24 15h1.5a3 3 0 0 1 0 6H23" fill="none" stroke="#9c4a33" stroke-width="2"/>'
  + '<path d="M9 16.5h12" stroke="#fff3e6" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>'
  + '<ellipse cx="15" cy="28.5" rx="11" ry="1.8" fill="#9c4a33" opacity=".35"/></svg>';

/**
 * Second cup note (docs/UX_MECHANICS.md P4): a toast in the usual toast zone (under the HUD, above the aim line), so
 * it never covers the LEVEL chip or the order ticket at any text size; held 3 s. first: the one-time extra line.
 */
export function secondCupToast({ first = false } = {}) {
  const [lead, gain] = SECOND_CUP_NOTE.split(': ');
  const t = el(`<div class="toast cup-note" role="status" aria-live="polite">${CUP_SVG}<span class="cup-text"><span>${esc(lead)}: <b>${esc(gain)}</b></span>${first ? `<span class="cup-first">${esc(SECOND_CUP_FIRST)}</span>` : ''}</span></div>`);
  addToast(t, first ? 4200 : 3000);
}

/** Small '♪ Now playing' toast; a newer one replaces the old one so rapid previews don't stack. */
export function nowPlayingToast(name) {
  if (!name) return;
  for (const n of document.querySelectorAll('.toast[data-np]')) n.remove();
  addToast(el(`<div class="toast np" data-np>♪ Now playing: ${esc(name)}</div>`), 1600);
}

/** The coin counter. In a screen's top bar it is a button that opens Shop › Buy coins (wired in open()). */
function coinPill(save) {
  return `<button class="pill coin-pill" data-coinshop aria-label="${fmt(save.coins)} coins. Open Shop, Buy coins"><span class="coin"></span><span data-coins>${fmt(save.coins)}</span></button>`;
}

export function refreshCoins(save) {
  for (const n of document.querySelectorAll('[data-coins]')) n.textContent = fmt(save.coins);
}

export function confirmBox({ title, text, ok = 'OK', cancel = 'Cancel', okClass = 'primary' }) {
  return new Promise((resolve) => {
    const s = open(el(`<div class="screen modal"><div class="card">
      <h2>${esc(title)}</h2><p>${text}</p>
      <button class="btn ${okClass}" data-ok>${ok}</button>
      ${cancel ? `<button class="btn ghost" data-cancel>${esc(cancel)}</button>` : ''}
    </div></div>`));
    tap(s.querySelector('[data-ok]'), () => { close(s); resolve(true); }, click);
    tap(s.querySelector('[data-cancel]'), () => { close(s); resolve(false); }, click);
  });
}

function goalIcon(g) {
  if (g.type === 'tier' || g.type === 'order') return `<canvas data-tier="${g.tier}"></canvas>`;
  return `<span class="goal-ico">${ICONS[g.type === 'asteroids' ? 'asteroid' : g.type] || ''}</span>`;
}

let shapesOn = false; // mirrors save.settings.shapes (kept in sync by main.js setSetting)
export function setShapesFlag(v) { shapesOn = !!v; }
let statsModeNow = 'local'; // anonymous level stats mode (meta/levelStats.js statsMode), kept in sync by main.js
/** 'local' (no endpoint: toggle hidden), 'on' or 'off'. */
export function setStatsMode(m) { statsModeNow = m === 'on' || m === 'off' ? m : 'local'; }

function paintGoalCanvases(node, skin, numbers) {
  requestAnimationFrame(() => {
    for (const c of node.querySelectorAll('canvas[data-tier]')) paintOrbCanvas(c, { tier: Number(c.dataset.tier), number: numbers, shape: shapesOn }, skin);
  });
}

/** The next undiscovered orb as a dark silhouette with "?" (curiosity, Wave E). */
function paintSilhouette(canvas, tier, skin) {
  if (!canvas) return;
  paintOrbCanvas(canvas, { tier }, skin);
  const ctx = canvas.getContext('2d');
  const w = canvas.clientWidth || canvas.width, h = canvas.clientHeight || canvas.height;
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = '#3b3080';
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#eae6ff';
  ctx.font = `800 ${Math.round(Math.min(w, h) * 0.42)}px Fredoka, system-ui, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('?', w / 2, h / 2 + Math.min(w, h) * 0.03);
  ctx.restore();
}

/** The café looks' calendar (docs/UX_STARS.md table E): one candle per day of this month in a tidy week grid, lit
 * (cream pillar, amber flame, soft halo) for evenings you played; days not played have no flame. Same data as the sky. */
function candleSvg(sky, cols, cw, ch, rows) {
  const lit = new Set(sky.lit);
  let body = '';
  for (let d = 1; d <= sky.days; d++) {
    const i = sky.firstWeekday + d - 1;
    const x = 20 + (i % cols) * cw, base = 26 + Math.floor(i / cols) * ch;
    if (lit.has(d)) {
      body += `<circle cx="${x}" cy="${base - 15}" r="9" fill="url(#candleglow)"/>`
        + `<rect x="${x - 4}" y="${base - 11}" width="8" height="11" rx="1.5" fill="#fff3dc" stroke="#c9a77a" stroke-width=".8"/>`
        + `<path d="M${x} ${base - 21}C${x + 3.4} ${base - 16.5} ${x + 2.6} ${base - 12.5} ${x} ${base - 12.5}C${x - 2.6} ${base - 12.5} ${x - 3.4} ${base - 16.5} ${x} ${base - 21}Z" fill="#e8a33a"/>`;
    } else {
      const future = d > sky.today;
      body += `<rect x="${x - 4}" y="${base - 11}" width="8" height="11" rx="1.5" fill="${future ? 'none' : '#f4e6cf'}" stroke="#b8976c" stroke-width=".8" opacity="${future ? 0.4 : 0.75}"/>`;
    }
    if (d === sky.today) body += `<rect x="${x - 13}" y="${base - 25}" width="26" height="29" rx="7" fill="none" stroke="#a0703a" stroke-width="1.3" stroke-dasharray="3 3"/>`;
  }
  return `<svg class="sky candles" viewBox="0 0 ${cols * cw} ${rows * ch}" role="img" aria-label="${esc(nightsLine(sky.count))} (${esc(sky.name)})">
    <defs><radialGradient id="candleglow"><stop offset="0" stop-color="#ffc861" stop-opacity=".6"/><stop offset="1" stop-color="#ffc861" stop-opacity="0"/></radialGradient></defs>${body}</svg>`;
}

/** Sky calendar: one star per day of this month, lit for nights you played (Wave E). Café looks: candles. */
function skySvg(sky) {
  const cols = 7, cw = 40, ch = 32;
  const rows = Math.ceil((sky.firstWeekday + sky.days) / cols);
  const lit = new Set(sky.lit);
  // stable per-month jitter so the sky looks hand-drawn, not like a grid (no Math.random)
  const jit = (d, k) => {
    let h = 2166136261 ^ (d * 31 + k);
    for (const c of sky.monthKey) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    h = Math.imul(h ^ (h >>> 13), 2654435761);
    return ((h >>> 0) % 1000) / 1000 - 0.5;
  };
  const pts = [];
  for (let d = 1; d <= sky.days; d++) {
    const i = sky.firstWeekday + d - 1;
    pts.push({ d, x: 20 + (i % cols) * cw + jit(d, 1) * 12, y: 16 + Math.floor(i / cols) * ch + jit(d, 2) * 10 });
  }
  const star = (x, y, r) => {
    let p = '';
    for (let k = 0; k < 10; k++) {
      const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.45 : r;
      p += `${k ? 'L' : 'M'}${(x + Math.cos(a) * rr).toFixed(1)} ${(y + Math.sin(a) * rr).toFixed(1)}`;
    }
    return p + 'Z';
  };
  const f = (v) => v.toFixed(1);
  const litPts = pts.filter((p) => lit.has(p.d));
  // constellation lines join lit nights within the same week (no long zigzags across the sky)
  const week = (p) => Math.floor((sky.firstWeekday + p.d - 1) / cols);
  const lines = litPts.slice(1).map((p, i) => (week(p) === week(litPts[i])
    ? `<line x1="${f(litPts[i].x)}" y1="${f(litPts[i].y)}" x2="${f(p.x)}" y2="${f(p.y)}"/>` : '')).join('');
  const dots = pts.map((p) => {
    if (lit.has(p.d)) return `<circle cx="${f(p.x)}" cy="${f(p.y)}" r="10" fill="url(#skyglow)"/><path d="${star(p.x, p.y, 7)}" fill="#ffe17a"/>`;
    const future = p.d > sky.today;
    return `<circle cx="${f(p.x)}" cy="${f(p.y)}" r="${future ? 1.6 : 2.2}" fill="#cfd6ff" opacity="${future ? 0.22 : 0.45}"/>`;
  }).join('');
  const t = pts[sky.today - 1];
  if (pageLook() !== 'cosmic') return candleSvg(sky, cols, cw, ch, rows);
  const ring = t ? `<circle cx="${f(t.x)}" cy="${f(t.y)}" r="12" fill="none" stroke="#9fd8ff" stroke-width="1.5" stroke-dasharray="3 3"/>` : '';
  return `<svg class="sky" viewBox="0 0 ${cols * cw} ${rows * ch}" role="img" aria-label="${esc(nightsLine(sky.count))} (${esc(sky.name)})">
    <defs><radialGradient id="skyglow"><stop offset="0" stop-color="#ffd54a" stop-opacity=".55"/><stop offset="1" stop-color="#ffd54a" stop-opacity="0"/></radialGradient></defs>
    <g stroke="rgba(255,225,122,.35)" stroke-width="1.2">${lines}</g>${dots}${ring}</svg>`;
}

/** Calm "good place to stop" block (Wave E). The pause cue shows at most every ~20 min of play. */
let lastStopCue = Date.now();
function stopCardHtml(card) {
  if (!stopCueDue(Date.now() - lastStopCue)) {
    return card.teaser ? `<div class="stop-card teaser-only"><span class="sc-teaser">${esc(goalCopy(card.teaser.replace(/^Next time: /, 'Next: '), pageLook()))}</span></div>` : '';
  }
  lastStopCue = Date.now();
  return `<div class="stop-card"><b>${esc(card.title)}</b><span>${esc(card.line)}</span>${card.teaser ? `<span class="sc-teaser">${esc(goalCopy(card.teaser, pageLook()))}</span>` : ''}</div>`;
}

/** Fail reflection block: one kind, true line + one tip (Wave E). */
function reflectionHtml(rf) {
  if (!rf) return '';
  return `<div class="reflect"><b>${esc(rf.line)}</b><span>Tip: ${esc(rf.tip)}</span></div>`;
}


/** What the confirm box says the purchase contains (plain facts, no pressure). */
function purchaseDetail(app, item) {
  if (item.id === PASS.id || item.id === PASS_YEAR.id) {
    const v = passValue(), year = item.id === PASS_YEAR.id;
    const ks = nextKeepsake(app.save), left = keepsakesLeft(app.save);
    const more = year ? Math.min(left, PASS_YEAR.blocks) : 1;
    const keep = ks
      ? `<span>• ${trHtml(more > 1
        ? tr('buy.pass.keepsakes', { n: more, left, total: CLUB_KEEPSAKES.length })
        : tr('buy.pass.keepsake', { left, total: CLUB_KEEPSAKES.length }), { name: bold(OUTFIT_BY_ID[ks].name) })}</span>`
      : `<span>• ${esc(tr('buy.pass.allKeepsakes'))}</span>`;
    const coins = year
      ? `<span>• ${trHtml(tr('buy.pass.yearCoins', { upfront: fmt(v.upfront), days: v.days }), { months: bold(tr('buy.pass.months', { n: PASS_YEAR.blocks })), daily: bold(tr('buy.coinsADay', { n: fmt(v.daily) })) })}</span><span>${esc(passYearLine())}.</span>`
      : `<span>• ${trHtml(tr('buy.pass.upfront'), { coins: bold(tr('buy.nCoins', { n: fmt(v.upfront) })) })}</span><span>• ${trHtml(tr('buy.pass.daily', { days: v.days }), { daily: bold(tr('buy.coinsADay', { n: fmt(v.daily) })) })}</span>`;
    return `<span class="pass-list">${coins}<span>• ${trHtml(tr('buy.pass.noAds'), { b: bold(tr('buy.noAdBreaks')) })}</span>${keep}<span>${esc(tr('buy.pass.value', { total: fmt(v.total), pack: fmt(v.bestPackCoinsAtPassPrice), price: v.price }))}</span></span>`
      + `<span class="pass-fine">${trHtml(tr('buy.pass.fine'), { not: bold(tr('buy.pass.not')) })}</span>`;
  }
  if (item.packAll && item.finish) { // "Pay the difference": the shelf's missing pieces only
    const rest = packAllPacks().filter((p) => !ownsPack(app.save, p));
    return `<span class="pass-list">${rest.map((p) => `<span>• ${trHtml(tr('buy.packRow', { what: ownsAnyOfPack(app.save, p) ? tr('buy.packRest') : tr('buy.packAll') }), { name: bold(p.name) })}</span>`).join('')}</span>`
      + `<span class="pass-fine">${esc(FINISH_PRICES_LINE)} ${esc(tr('buy.fine.shelf'))}</span>`;
  }
  if (item.packAll) {
    return `<span class="pass-list">${packAllPacks().map((p) => `<span>• ${trHtml(tr('buy.packRow', { what: tr('buy.packAll') }), { name: bold(p.name) })}</span>`).join('')}<span>${esc(packAllLine())}.</span></span>`
      + `<span class="pass-fine">${esc(tr('buy.fine.shelf'))}</span>`;
  }
  if (item.id === 'no_ads_bundle') {
    return `<span class="pass-list"><span>• ${trHtml(tr('buy.bundle.removeAds'), { b: bold(tr('buy.removeAds')) })}</span><span>• ${bold(tr('buy.nCoins', { n: fmt(item.coins) }))}</span><span>• ${bold(tr('buy.eachBooster', { n: fmt(item.boosters.comet) }))}</span><span>${esc(noAdsBundleLine())}.</span></span>`
      + `<span class="pass-fine">${esc(tr('buy.fine.bundle'))}</span>`;
  }
  if (item.keepsakes && KEEPSAKE_BY_ID[item.keepsakes]) {
    const k = KEEPSAKE_BY_ID[item.keepsakes];
    return `<span class="pass-list">${k.decor.map((d) => `<span>• ${esc(tr('buy.forCafe', { name: d.name }))}</span>`).join('')}<span>• ${esc(k.frame)}</span></span>`
      + `<span class="pass-fine">${esc(tr('buy.fine.keepsakes'))}</span>`;
  }
  if (item.id === 'remove_ads') {
    return `<span class="pass-list"><span>• ${esc(tr('buy.removeAds.line'))}</span><span>• ${esc(tr('buy.removeAds.rewarded'))}</span></span>`
      + `<span class="pass-fine">${esc(tr('buy.fine.removeAds'))}</span>`;
  }
  if (item.pack) {
    const hit = packProduct(item.id);
    const pieces = item.finish ? hit.pieces.filter((p) => !ownsPiece(app.save, p)) : hit.pieces; // finish: the missing pieces only
    return `<span class="pass-list">${pieces.map((p) => `<span>• ${trHtml(tr('buy.pieceRow', { kind: pieceLabel(p.kind) }), { name: bold(pieceName(p)) })}</span>`).join('')}</span>`
      + `<span class="pass-fine">${item.finish ? `${esc(FINISH_PRICES_LINE)} ` : ''}${esc(tr('buy.fine.pack'))}</span>`;
  }
  if (isCoinPack(item.id)) {
    const n = packCoins(app.save, item.id);
    return firstPackBonusAvailable(app.save)
      ? trHtml(tr('buy.youGetBonus', { base: fmt(item.coins), bonus: fmt(item.coins) }), { coins: bold(tr('buy.nCoins', { n: fmt(n) })) })
      : trHtml(tr('buy.youGet'), { coins: bold(tr('buy.nCoins', { n: fmt(n) })) });
  }
  return '';
}

/** The labelled purchase stub, for other views (the season card's Season Keepsakes rows). */
export function buyIap(app, item) { return stubPurchase(app, item); }

async function stubPurchase(app, item) {
  // A stale Shop screen never sells what is already owned or a price that no longer fits (Unity Screens.Purchase):
  // the Collector's Shelf once any pack piece is owned, and a finish product only at the price its card shows now.
  if (item.id === 'pack_all' && !packAllOffered(app.save)) {
    toast(tr('buy.shelfOwned'));
    return false;
  }
  if (item.finish) {
    const fin = item.packAll ? shelfFinish(app.save) : packFinish(app.save, PACK_BY_ID[item.pack]);
    if (!fin || fin.product !== item.id) {
      toast('What you own has changed, so the Shop shows a new price for the rest.');
      return false;
    }
  }
  const detail = purchaseDetail(app, item);
  const ok = await confirmBox({
    title: item.name,
    text: `${detail ? detail + '<br>' : ''}<span class="sim-note">Test build: purchases are simulated and nothing is charged.</span><br><br>${trHtml(tr('buy.confirm'), { name: bold(item.name), price: bold(item.price) })}`,
    ok: esc(tr('buy.ok', { price: item.price })),
  });
  if (!ok) return false;
  const before = (app.save.outfits && app.save.outfits.owned || []).slice();
  if (grantIap(app.save, item.id)) {
    if (app.purchaseGranted) app.purchaseGranted(); // paid coins / packs are in this save now: no Undo transfer past them
    // Remove Ads and the No Ads Bundle: the (simulated) purchase is confirmed, so ads go off for good.
    if (item.removeAds) { Svc.setRemoveAds(true); Svc.hideBanner(); }
    app.persist();
    Svc.sfx('coin');
    Svc.haptic('success');
    const newKs = (app.save.outfits && app.save.outfits.owned || []).filter((id) => !before.includes(id));
    const ksLine = newKs.length ? tr('buy.ksLine', { name: OUTFIT_BY_ID[newKs[0]].name }) : '';
    toast(item.pass ? tr('buy.passOn', { name: PASS_NAME, coins: fmt(PASS.upfront * (item.blocks || 1)) }) + ksLine : item.id === 'remove_ads' ? tr('buy.adsRemoved') : tr('buy.added', { name: item.name }), true);
    refreshCoins(app.save);
    return true;
  }
  return false;
}

// ==================================================================== MENU (v3 Home: src/ui/home.js)

/** Home: the café scene, Play, Restore and four calm icons (src/ui/home.js, DESIGN.md "v3 home and flow"). */
export function showMenu(app) {
  shopApp = app;
  closeAll();
  return renderHome(app, { open, close, coinPill, toast });
}

/** Today sheet (kept as an export: main.js and older callers open it by this name). */
export function showToday(app) { return showTodaySheet(app); }

/** For src/ui/home.js: put a screen on top / close one with the shared slide-out. */
export function openScreen(node) { return open(node); }
export function closeScreen(node) { return close(node); }

// ==================================================================== DAILY (Nebula + Challenge)

const BADGE_ICON = '<svg viewBox="0 0 24 24"><path d="M7 2h4l1 5-3 1zM17 2h-4l-1 5 3 1z" fill="#ff8ae0"/><circle cx="12" cy="15" r="7" fill="#ffd54a" stroke="#b86a00" stroke-width="1"/><path d="M12 10.6l1.3 2.7 3 .4-2.2 2 .6 3-2.7-1.5-2.7 1.5.6-3-2.2-2 3-.4z" fill="#fff6cf"/></svg>';
const WEEKDAYS = [() => tr('day.sun'), () => tr('day.mon'), () => tr('day.tue'), () => tr('day.wed'), () => tr('day.thu'), () => tr('day.fri'), () => tr('day.sat')];
const weekday = (d) => WEEKDAYS[d.getDay()]();

function keyDate(k) { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); }

function nebulaStatus(rec) {
  if (!rec) return tr('daily.notPlayed');
  const scored = rec.won ? tr('daily.scored', { stars: starText(rec.stars), n: fmt(rec.drops) }) : tr('daily.scoredNotSolved', { n: fmt(rec.drops) });
  return rec.solved && !rec.won ? tr('daily.solvedReplay', { scored }) : scored;
}

async function doShare(text) {
  const r = await shareCard(text);
  if (r === 'copied') toast(tr('share.copied'), true);
  else if (r === 'shared') toast(tr('share.shared'), true);
  else if (r === 'failed') toast(tr('share.failed'));
}

/**
 * Postcard share (src/meta/postcard.js): a preview of the picture, then the share sheet with the picture and
 * its caption. No link, no reward, no ad, no personal data. Falls back to the text share / a saved PNG.
 */
export async function showPostcard(app, m, caption) {
  if (!m) return null;
  // the picture is drawn on a canvas and the caption goes to the share sheet, so neither passes the DOM word pass
  const look = uiLook(app.save);
  m = { ...m, kicker: cozyText(m.kicker, look), title: cozyText(m.title, look), sub: cozyText(m.sub, look) };
  caption = cozyText(caption, look);
  await fontsReady();
  const skin = (app.save.skins && app.save.skins.equipped) || 'classic';
  const cv = renderPostcard(m, { skin, frame: keepsakeFrame(app.save, dayKey()) }); // Season Keepsakes frame, when owned and on
  let src = '';
  try { src = cv.toDataURL('image/png'); } catch (_) { src = ''; }
  const node = open(el(`<div class="screen modal"><div class="card postcard-card">
    <h2>${esc(tr('result.postcard'))}</h2>
    ${src ? `<img class="postcard-img" alt="${esc(tr('postcard.alt', { title: m.title }))}" src="${src}">` : ''}
    <p class="sub">${esc(caption)}</p>
    <p class="postcard-note">${esc(tr('postcard.note'))}</p>
    <button class="btn primary" data-go>${esc(tr('common.share'))}</button>
    <button class="btn ghost" data-x>${esc(tr('common.close'))}</button>
  </div></div>`));
  let busy = false;
  tap(node.querySelector('[data-go]'), async () => {
    if (busy) return;
    busy = true;
    const r = await sharePostcard(cv, m, caption);
    busy = false;
    if (r === 'shared') { toast(tr('share.shared'), true); close(node); }
    else if (r === 'saved') toast(tr('postcard.saved'), true);
    else if (r === 'copied') toast(tr('postcard.copied'), true);
    else if (r === 'failed') toast(tr('postcard.failed'));
  }, click);
  tap(node.querySelector('[data-x]'), () => close(node), click);
  return node;
}

/**
 * Daily sheet (menu "Daily"): today's Daily Nebula, the last 7 days (replayable), this month's
 * badge progress, plus the Endless Daily Challenge. No streaks, no timers, nothing to buy.
 */
export function showDailySheet(app, selected = null) {
  const save = app.save;
  const st = nebulaState(save);
  const today = dayKey();
  const days = recentDays();
  let sel = selected && days.includes(selected) ? selected : today;
  const node = open(el(`<div class="screen modal"><div class="card daily-card">
    <h2>${esc(word('dailyPuzzle', uiLook(save)))}</h2>
    <div data-hero></div>
    <div class="week" data-week></div>
    <div data-month></div>
    ${unlocked(save, 'freePlay') ? `<button class="track-row challenge-row" data-challenge>
      <span class="bd-swatch big" style="display:grid;place-items:center;color:var(--ink-pink, #ff8ae0);background:var(--well, rgba(0,0,0,.25))">${ICONS.infinity.replace('<svg', '<svg width="26" height="26"')}</span>
      <span class="track-text"><span class="track-name" style="display:block">${esc(tr('daily.challenge'))}</span><span class="track-blurb" style="display:block">${esc(tr('daily.challengeSub', { mode: word('freePlay', uiLook(save)), pieces: word('pieces', uiLook(save)), n: fmt(dailyChallengeBest(save)) }))}</span></span>
    </button>` : ''}
    <button class="btn ghost" data-x>${esc(tr('common.close'))}</button>
  </div></div>`));
  const hero = node.querySelector('[data-hero]');
  const week = node.querySelector('[data-week]');
  const month = node.querySelector('[data-month]');
  const render = () => {
    const lv = getDailyLevel(sel, dailyTwistFor(save, sel)); // the weekly café twist this player gets
    const rec = st.days[sel];
    const isToday = sel === today;
    const d = keyDate(sel);
    hero.innerHTML = `<div class="nebula-hero">
      <div class="nh-kicker">${esc(word('dailyPuzzle', uiLook(save)).toUpperCase())} · ${esc(isToday ? tr('daily.todayCaps') : `${weekday(d).toUpperCase()} ${d.getDate()}`)}</div>
      <div class="nh-title">${esc(sel)}</div>
      <div class="nh-twist">${esc(isToday ? tr('daily.today') : weekday(d))}: ${esc(twistLabel(lv.twist))}</div>
      <div class="nh-goals">${lv.goals.map((g) => esc(tierGoalText(g, goalText(g)))).join(' · ')} · ${esc(tr('intro.drops', { n: fmt(lv.drops) }))}${lv.tide ? esc(tr('daily.tide', { n: lv.tide })) : ''}</div>
      <div class="nh-status">${esc(nebulaStatus(rec))}</div>
      <div class="btn-row">
        <button class="btn pink" data-go>${ICONS.play.replace('<svg', '<svg width="20" height="20"')} ${esc(rec ? tr('result.replay') : tr('common.play'))}</button>
        ${rec ? `<button class="btn" data-share>${esc(tr('common.share'))}</button>` : ''}
      </div>
    </div>`;
    tap(hero.querySelector('[data-go]'), () => { close(node); app.startNebula(sel); }, click);
    tap(hero.querySelector('[data-share]'), () => { const t = shareText(sel, rec); showPostcard(app, nebulaPostcard(sel, rec), postcardCaption(nebulaPostcard(sel, rec), t)); }, click);
    week.innerHTML = '';
    for (const k of days) {
      const r = st.days[k];
      const dd = keyDate(k);
      const mark = r && r.solved ? starText(r.best || r.stars) : r ? '·' : '';
      const b = el(`<button class="wday ${r && r.solved ? 'solved' : ''} ${k === today ? 'today' : ''} ${k === sel ? 'sel' : ''}" aria-label="${esc(word('dailyPuzzle', uiLook(save)))} ${k}">
        <span class="wd-name">${esc(weekday(dd))}</span><span class="wd-num">${dd.getDate()}</span><span class="wd-mark">${mark || '&nbsp;'}</span></button>`);
      tap(b, () => { sel = k; render(); }, click);
      week.appendChild(b);
    }
    const mk = monthKeyOf(today);
    const count = monthSolved(save, mk);
    const earned = hasBadge(save, mk);
    const shelf = st.badges.length
      ? `<div class="badge-shelf">${st.badges.slice(-6).map((b) => `<span class="badge-chip">${BADGE_ICON}${esc(monthName(b))}</span>`).join('')}</div>` : '';
    month.innerHTML = `<div class="month-badge ${earned ? 'earned' : ''}">
      <span class="mb-ico">${BADGE_ICON}</span>
      <div class="grow"><div class="mb-name">${esc(tr('daily.badge', { month: monthName(mk) }))}</div>
        <div class="mb-sub">${esc(earned ? tr('daily.badgeEarned') : uiLook(save) === 'cosmic' ? tr('daily.badgeGoalCosmic', { target: NEBULA_BADGE_TARGET, n: count }) : tr('daily.badgeGoal', { target: NEBULA_BADGE_TARGET, n: count }))}</div>
        <div class="progress"><i style="width:${Math.min(100, (count / NEBULA_BADGE_TARGET) * 100).toFixed(0)}%"></i></div></div>
    </div>${shelf}`;
  };
  render();
  const ch = node.querySelector('[data-challenge]');
  if (ch) tap(ch, () => { close(node); app.startEndless(true); }, click);
  tap(node.querySelector('[data-x]'), () => close(node), click);
  return node;
}

/** "2026-10-28" -> "28 October" (the Special's date in words, shown once). Other keys (a friend's puzzle) stay as they are. */
function specialDate(key) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || ''));
  if (!m) return String(key || '');
  return tr('nebula.dateWords', { d: Number(m[3]), month: monthName(`${m[1]}-${m[2]}`).replace(/ \d{4}$/, '') });
}

/**
 * Today's Special result (docs/UX_RESULT_CARDS.md §7). Won: title + date, the finish hero, "Solved in N drops" with
 * the coins chip, the badge line, one note; Play on (filled) and Done for now (outlined), Share and Replay as quiet
 * links. Not solved: the honest remaining line and "Replays are just for fun."; Replay (filled) and Done for now.
 */
export function showNebulaResult(app, res, info, { onReplay, onDone, onPlayOn }) {
  const save = app.save;
  const key = res.nebula;
  const rec = info.record;
  const text = rec ? cozyText(shareText(key, rec), pageLook()) : ''; // shared as-is, so convert here too
  const mk = info.monthKey;
  const real = !res.autoplay && rec;
  const big = Number(save.settings && save.settings.textSize) >= 1.25;
  const sub = tr('nebula.subtitle', { name: word('dailyPuzzle', pageLook()), date: specialDate(key) });
  // the one note: the scored-try explainer the first time only, a replay's honest reminder of the scored try
  let noteHtml = '';
  if (real && res.won) {
    if (!info.scored) noteHtml = `<p class="result-note-slot">${rec.won ? tr('nebula.replayScored', { word: esc(finishWord(rec.stars)), n: fmt(rec.drops) }) : esc(tr('nebula.replayNotSolved'))}</p>`;
    else if (!(save.mechSeen && save.mechSeen.specialScored)) {
      noteHtml = `<p class="result-note-slot">${esc(tr('nebula.scoredNow'))}</p>`;
      save.mechSeen = save.mechSeen || {}; save.mechSeen.specialScored = true; app.persist();
    }
  } else if (!res.won) noteHtml = `<p class="result-note-slot">${esc(tr('nebula.justForFun'))}</p>`;
  const shares = [
    real ? { label: tr('result.postcard'), run: () => { const pm = nebulaPostcard(key, rec); if (pm) showPostcard(app, pm, postcardCaption(pm, text)); else doShare(text); } } : null,
    canChallenge(res) ? { label: tr('friend.linkPuzzle'), run: () => showFriendSend(app, res) } : null,
  ].filter(Boolean);
  const shareLink = shares.length ? `<button class="linkish" data-share>${esc(tr('common.share'))}</button>` : '';
  const quiet = res.won ? [shareLink, `<button class="linkish" data-replay>${esc(tr('result.replay'))}</button>`].filter(Boolean) : [shareLink].filter(Boolean);
  const actions = res.won
    ? `<button class="btn primary" data-playon>${esc(tr('result.playOn'))}</button><button class="btn ghost" data-done>${esc(tr('result.doneForNow'))}</button>`
    : `<button class="btn primary" data-replay>${esc(tr('result.replay'))}</button><button class="btn ghost" data-done>${esc(tr('result.doneForNow'))}</button>`;
  const node = open(el(`<div class="screen modal"><div class="card result-card special-card${big ? ' big-text' : ''}">
    <h2>${esc(res.won ? (pageLook() === 'cosmic' ? tr('nebula.solvedCosmic') : tr('nebula.solved')) : tr('nebula.notThisTime'))}</h2><p class="rc-sub">${esc(sub)}</p>
    ${res.autoplay ? autoplayNote() : ''}
    ${res.won ? `<div class="rc-hero">${finishLineHtml(res.stars, 'hero')}</div>
    <div class="reward-row"><span class="reward-chip">${esc(tr('nebula.solvedIn', { n: fmt(res.dropsUsed) }))}</span>${info.coins ? coinChipHtml(info.coins) : ''}</div>
    ${real ? `<p class="badge-line">${esc(info.badgeEarned ? tr('nebula.badgeEarned', { month: monthName(mk) }) : tr('nebula.badgeProgress', { month: monthName(mk), n: info.monthCount, target: NEBULA_BADGE_TARGET }))}</p>` : ''}`
    : `${res.reflection ? reflectionHtml(res.reflection) : `<p>${res.remaining ? esc(res.remaining) : esc(tr('nebula.dropsUsed', { n: fmt(res.dropsUsed) }))}</p>`}
    ${info.coins ? `<div class="reward-row">${coinChipHtml(info.coins)}</div>` : ''}`}
    ${noteHtml}
    <div class="rc-actions">${actions}</div>
    ${quiet.length ? `<div class="quiet-row">${quiet.join('')}</div>` : ''}
    ${adNoteHtml(res)}
  </div></div>`));
  if (res.won) playRewardReveal(node, res.stars);
  if (info.badgeEarned) setTimeout(() => { Svc.sfx('discover', { tier: 8 }); Svc.haptic('success'); }, 1300);
  tap(node.querySelector('[data-share]'), () => showShareSheet(app, shares), click);
  let leaving = false;
  const go = (fn) => { if (leaving) return; leaving = true; close(node); fn(); };
  tap(node.querySelector('[data-replay]'), () => go(onReplay), click);
  tap(node.querySelector('[data-playon]'), () => go(onPlayOn || onDone), click);
  // "Done for now" after a Special win: the oven card on the way out when it is due (never for a friend's puzzle)
  tap(node.querySelector('[data-done]'), () => go(() => {
    onDone();
    if (res.won && !res.autoplay && !res.friend && bakeOfferDue(app.save, { doneForNow: true, won: true, mode: 'special', sinceAdS: Svc.secondsSinceAd() })) {
      showOvenCard(app, { onDone: () => { if (app.onMetaChanged) app.onMetaChanged(); Svc.showMenuBanner(); } });
    }
  }), click);
}

// ==================================================================== LEVEL MAP

export function showMap(app) {
  // The Coast Path (v3; the Journey map under the Cosmic look): zone scenery, the path, chapter ribbons (src/ui/levelMap.js)
  const save = app.save;
  const look = uiLook(save);
  // the Stargazing Deck (Observatory) sits at the top of the map from Level 3 (it used to be a menu tile)
  const extras = menuExtrasOpen(save);
  const sky = extras ? completedCount(save) : 0;
  const node = open(el(`<div class="screen solid lm-screen">
    <div class="topbar sticky"><button class="icon-btn" data-back aria-label="Back">${ICONS.back}</button><h1 style="margin:0;font-size:22px;line-height:1.1;flex:1 1 auto;min-width:0">${esc(word('map', look))}</h1><span class="map-top-r">${extras ? `<button class="map-obs" data-observatory aria-label="${esc(word('deck', look))}, ${sky} of ${CONSTELLATIONS.length} constellations finished">${OBSERVATORY_ICON}<span>${sky}/${CONSTELLATIONS.length}</span></button>` : ''}${coinPill(save)}</span></div>
    <div class="map lm-map"></div>
  </div>`));
  const ts = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ts')) || 1;
  const map = buildLevelMap(node.querySelector('.lm-map'), {
    levelCount: LEVEL_COUNT, cur: save.journey.level, stars: save.journey.stars, ts,
    kindOf: (n) => getLevel(n).kind, onPick: (n) => showLevelIntro(app, n), bindTap: (b, fn) => tap(b, fn, click),
    keeper: { id: equippedKeeper(save).id, outfit: equippedOutfit(save) },
  });
  tap(node.querySelector('[data-back]'), () => { map.destroy(); close(node); }, click);
  const obs = node.querySelector('[data-observatory]');
  if (obs) tap(obs, () => showObservatory(app), click);
  map.scrollToCurrent();
  requestAnimationFrame(() => map.scrollToCurrent());
  return node;
}

export function showLevelIntro(app, n) {
  const lv = getLevel(n);
  const save = app.save;
  const stars = save.journey.stars[n] || 0;
  const tag = lv.kind === 'normal' ? '' : `<span class="kind-tag ${lv.kind}">${esc(lv.kind === 'superhard' ? tr('intro.superhard') : tr('intro.hard'))}</span>`;
  const s = open(el(`<div class="screen modal"><div class="card">
    <h2>${esc(tr('intro.title', { n }))}</h2>${tag}
    <ul class="goal-list">${lv.goals.map((g) => `<li>${goalIcon(g)}<span>${esc(tierGoalText(g, goalText(g)))}</span></li>`).join('')}</ul>
    <p>${esc(tr('intro.drops', { n: lv.drops }))}${lv.tide ? esc(tr('intro.tide', { n: lv.tide })) : ''}${stars ? esc(tr('intro.best', { word: finishWord(stars) })) : ''}</p>
    ${mechanicIntro(lv, save.journey.stars) ? `<p class="tip-line">${esc(mechanicIntro(lv, save.journey.stars))}</p>` : ''}
    ${lv.tip ? `<p class="tip-line">💡 ${esc(skinTierText(lv.tip))}</p>` : ''}
    <button class="btn primary" data-go>${ICONS.play.replace('<svg', '<svg width="22" height="22"')} ${esc(tr('common.play'))}</button>
    <button class="btn ghost" data-x>${esc(tr('common.back'))}</button>
  </div></div>`));
  paintGoalCanvases(s, app.save.skins.equipped, save.settings.numbers);
  tap(s.querySelector('[data-go]'), () => { close(s); app.startLevel(n); }, click);
  tap(s.querySelector('[data-x]'), () => close(s), click);
}

// ==================================================================== ENDLESS CHALLENGE + STEADY START

/**
 * Free Play start sheet (UX_OPPORTUNITIES 4): one big Start button first, with the remembered tide and Path in one
 * plain line and a "Change" link that opens the full options (tide rows, Path cards, Zen Drift). Only the tide speed
 * differs between tides; ads are the same on every tier. The last tide is remembered (save.settings.challenge,
 * Standard by default) and "last played" shows only when one was really picked before.
 * Paths: optional, and only the Paths already opened are shown (locked things are hidden, never teased; DESIGN.md).
 * A Path only changes which perks are offered more often. The last Path is remembered (save.paths.last).
 * Bests stay per tide speed, shared by every Path.
 */
export function showChallengePick(app) {
  const save = app.save;
  const picked = save.settings.challenge != null; // "last played" only when a tide was really chosen before
  let tide = normChallenge(save.settings.challenge);
  let path = lastPath(save);
  const rows = pathRows(save).filter((p) => p.unlocked);
  const tideName = (id) => CHALLENGES.find((t) => t.id === id).name;
  const plainTide = { gentle: 'slow', standard: 'steady', bold: 'fast' };
  const pathName = (id) => (id && PATH_BY_ID[id] ? PATH_BY_ID[id].name : null);
  const summary = () => `${esc(tr('freePlay.tide', { name: tideName(tide), speed: plainTide[tide] }))}${rows.length ? ` · ${pathName(path) ? esc(tr('freePlay.pathName', { name: pathName(path) })) : esc(tr('freePlay.noPath'))}` : ''} · ${esc(tr('result.bestIs', { n: fmt(challengeBest(save, tide)) }))}`;
  const info = (id) => {
    const P = id && PATH_BY_ID[id];
    return P ? `<b style="color:${P.color}">${esc(P.name)}:</b> ${esc(pathLine(P.id, uiLook(save)))} ${esc(tr('freePlay.hold3', { bonus: P.resonance.toLowerCase() }))}`
      : esc(tr('freePlay.noPathInfo'));
  };
  const s = open(el(`<div class="screen modal"><div class="card comfort-card challenge-card">
    <h2>${esc(word('freePlay', uiLook(save)))}</h2>
    <p class="fp-lead">${esc(tr('freePlay.lead'))}</p>
    <button class="btn primary hero fp-start" data-start>${esc(tr('freePlay.start', { name: word('freePlay', uiLook(save)) }))}</button>
    <p class="fp-sum"><span data-sum>${summary()}</span> <button class="linkish fp-change" data-change aria-expanded="false" aria-controls="fp-opts">${esc(tr('freePlay.change'))}</button></p>
    <div class="fp-opts" id="fp-opts" data-opts hidden>
      <p class="path-head">${esc(tr('freePlay.howFast'))}</p>
      <div class="fp-tides" role="radiogroup" aria-label="${esc(tr('freePlay.howFast'))}">
      ${CHALLENGES.map((t) => `<button class="c-row c-pick${t.id === tide ? ' on' : ''}" data-ch="${t.id}" role="radio" aria-checked="${t.id === tide}" aria-label="${esc(t.name)}. ${esc(challengeLine(t.id))} ${esc(tr('result.bestIs', { n: fmt(challengeBest(save, t.id)) }))}">
        <div class="c-text"><div class="c-name">${esc(t.name)}${picked && t.id === tide ? ` <small>${esc(tr('freePlay.lastPlayed'))}</small>` : ''}</div><div class="c-sub">${esc(challengeLine(t.id))}</div></div>
        <div class="c-best"><small>${esc(tr('common.best'))}</small><b>${fmt(challengeBest(save, t.id))}</b></div></button>`).join('')}
      </div>
      ${rows.length ? `<p class="path-head">${esc(tr('freePlay.path'))} <small>${esc(tr('freePlay.optional'))}</small></p>
      <div class="path-pick" role="radiogroup" aria-label="${esc(tr('freePlay.path'))}">
        <button class="p-opt${!path ? ' on' : ''}" data-path="" role="radio" aria-checked="${!path}"><b>${esc(tr('freePlay.noPath'))}</b><small>${esc(tr('freePlay.noPathSub'))}</small></button>
        ${rows.map((p) => `<button class="p-opt${path === p.id ? ' on' : ''}" data-path="${p.id}" role="radio" aria-checked="${path === p.id}" style="--pc:${p.color}"><b>${esc(p.name)}</b><small>${esc(p.resonance)}</small></button>`).join('')}
      </div>
      <p class="path-info" data-pinfo>${info(path)}</p>` : ''}
      ${menuExtrasOpen(save) ? `<p class="path-head">Or play without a tide</p>
      <button class="c-row c-pick zen-pick" data-zenpick aria-label="${esc(tr('freePlay.zenLabel'))}${zenBest(save) ? `. ${esc(tr('result.bestIs', { n: fmt(zenBest(save)) }))}` : ''}">
        <div class="c-text"><div class="c-name">${ICONS.moon.replace('<svg', '<svg width="20" height="20"')} ${esc(tr('zenOver.title'))}</div><div class="c-sub">${esc(tr('freePlay.zenSub'))}</div></div>
        <div class="c-best"><small>${esc(tr('common.best'))}</small><b>${fmt(zenBest(save))}</b></div></button>` : ''}
    </div>
    <button class="btn ghost" data-x>${esc(tr('common.back'))}</button>
    <div class="link-row"><button class="linkish fp-code" data-friendcode>${esc(tr('freePlay.friendCode'))}</button></div>
  </div></div>`));
  const opts = s.querySelector('[data-opts]');
  const change = s.querySelector('[data-change]');
  const refresh = () => {
    s.querySelector('[data-sum]').innerHTML = summary();
    for (const o of s.querySelectorAll('[data-ch]')) {
      const on = o.dataset.ch === tide;
      o.classList.toggle('on', on);
      o.setAttribute('aria-checked', String(on));
    }
    for (const o of s.querySelectorAll('[data-path]')) {
      const on = (o.dataset.path || null) === path;
      o.classList.toggle('on', on);
      o.setAttribute('aria-checked', String(on));
    }
    const pi = s.querySelector('[data-pinfo]');
    if (pi) pi.innerHTML = info(path);
  };
  tap(change, () => {
    const show = opts.hidden;
    opts.hidden = !show;
    change.setAttribute('aria-expanded', String(show));
    change.textContent = show ? tr('common.done') : tr('freePlay.change');
  }, click);
  const zen = s.querySelector('[data-zenpick]');
  if (zen) tap(zen, () => { close(s); showZenIntro(app); }, click);
  tap(s.querySelector('[data-friendcode]'), () => { close(s); showFriendEnter(app); }, click);
  for (const b of s.querySelectorAll('[data-path]')) tap(b, () => { path = b.dataset.path || null; refresh(); }, click);
  for (const b of s.querySelectorAll('[data-ch]')) tap(b, () => { tide = b.dataset.ch; refresh(); }, click);
  tap(s.querySelector('[data-start]'), () => { close(s); app.startEndless(false, tide, path); }, click);
  tap(s.querySelector('[data-x]'), () => close(s), click);
  return s;
}

/**
 * Zen Drift intro sheet (menu "Zen"): what it is, the Zen best, Start / Back. No ads, no timers.
 * See src/meta/zen.js and DESIGN.md "Zen Drift".
 */
export function showZenIntro(app) {
  const save = app.save;
  const best = zenBest(save);
  const s = open(el(`<div class="screen modal"><div class="card zen-card">
    <h2>${esc(tr('zenOver.title'))}</h2>
    <p>${esc(tr('zenIntro.lead'))}</p>
    <p class="sub">${esc(tr('zenIntro.sub', { n: fmt(ZEN_COIN_CAP) }))}</p>
    <p>${esc(best ? tr('zenOver.best', { n: fmt(best) }) : tr('zenIntro.noBest'))}</p>
    <button class="btn zen" data-go>${esc(tr('zenIntro.start'))}</button>
    <button class="btn ghost" data-x>${esc(tr('common.back'))}</button>
  </div></div>`));
  tap(s.querySelector('[data-go]'), () => { close(s); app.startZen(); }, click);
  tap(s.querySelector('[data-x]'), () => close(s), click);
  return s;
}

/**
 * Steady Start offer before the next attempt, after STEADY_FAILS fails in a row on level n.
 * Free and optional: no ad, no price, no timer, never shown next to an ad. Stars still count.
 * onChoice(true) = start with the Wild Orb, onChoice(false) = play normally, onChoice(null) = back.
 */
export function showSteadyOffer(app, n, onChoice) {
  const s = open(el(`<div class="screen modal"><div class="card steady-card">
    <h2>${esc(tr('steady.title'))}</h2>
    <p>${esc(tr('steady.lead1'))}<b>${esc(tr('steady.wild'))}</b>${esc(tr('steady.lead2'))}</p>
    <p class="sub">${esc(tr('steady.sub'))}</p>
    <button class="btn primary" data-yes>${esc(tr('steady.yes'))}</button>
    <button class="btn" data-no>${esc(tr('steady.no'))}</button>
    <button class="btn ghost" data-x>${esc(tr('common.back'))}</button>
  </div></div>`));
  let done = false;
  const pick = (v) => { if (done) return; done = true; close(s); onChoice(v); };
  tap(s.querySelector('[data-yes]'), () => pick(true), click);
  tap(s.querySelector('[data-no]'), () => pick(false), click);
  tap(s.querySelector('[data-x]'), () => pick(null), click);
  return s;
}

/**
 * Hard-level tip card before an attempt (src/meta/levelTips.js): one short strategy tip for this
 * level's goals and obstacles plus the honest label. No ad, no price, never with the Steady Start
 * offer. onChoice(true) = play, onChoice(false) = back.
 */
export function showTipCard(app, n, onChoice) {
  const lv = getLevel(n);
  const s = open(el(`<div class="screen modal"><div class="card tip-card">
    <h2>${esc(tr('tipCard.title', { n }))}</h2>
    <p class="tip-label">${esc(levelTipLabel(lv))}</p>
    <ul class="goal-list">${lv.goals.map((g) => `<li>${goalIcon(g)}<span>${esc(tierGoalText(g, goalText(g)))}</span></li>`).join('')}</ul>
    <p class="tip-text">💡 ${esc(levelTipText(lv))}</p>
    <p class="sub">${esc(tr('tipCard.off'))}</p>
    <button class="btn primary" data-go>${ICONS.play.replace('<svg', '<svg width="22" height="22"')} ${esc(tr('common.play'))}</button>
    <button class="btn ghost" data-x>${esc(tr('common.back'))}</button>
  </div></div>`));
  paintGoalCanvases(s, app.save.skins.equipped, app.save.settings.numbers);
  let done = false;
  const pick = (v) => { if (done) return; done = true; close(s); onChoice(v); };
  tap(s.querySelector('[data-go]'), () => pick(true), click);
  tap(s.querySelector('[data-x]'), () => pick(false), click);
  return s;
}

// ==================================================================== SHOP

/**
 * Shop: four tabs, each showing ONE currency (shop audit, DESIGN.md "Shop and menu layout"):
 * Packs (real money: themed packs, Café Club, Remove Ads) · Looks (default; looks bought with coins) ·
 * Buy coins (real money: Starter Pack, coin packs) · Power-ups (coins). Old tab ids still work (shopTabFor).
 * Each tab carries its currency mark: a small "$" on the real-money tabs, the coin on the coin tabs.
 * Simple vertical cards, no sideways carousels; long sections show a few cards and a "Show all" button.
 * Honest numbers only; how prices work sits behind one "About prices" link.
 * A newcomer's first visit (the tour is due) opens on Looks, where the free gift lives, unless a caller asked for a
 * specific tab (an explicit Packs request from a non-tour path still opens Packs).
 */
export function showShop(app, tab = 'treats', onClose = null, opts = {}) {
  const save = app.save;
  if (tourDue(save) && tab === 'packs' && !(opts && (opts.expand || opts.exact))) tab = 'treats';
  shopOpenSections = new Set(opts && opts.expand ? [opts.expand] : []); // "Show all" choices last while this Shop is open
  const mark = (t) => (SHOP_TAB_CURRENCY[t] === 'money'
    ? '<span class="tab-cur money" aria-hidden="true">$</span>'
    : '<span class="tab-cur"><span class="coin" aria-hidden="true"></span></span>');
  const tabs = SHOP_TABS.map((t) => `<button class="tab" role="tab" data-tab="${t}" aria-label="${esc(SHOP_TAB_CURRENCY[t] === 'money' ? tr('shop.tabAria.money', { label: SHOP_TAB_LABELS[t] }) : tr('shop.tabAria.coins', { label: SHOP_TAB_LABELS[t] }))}"><span class="tab-name">${esc(SHOP_TAB_LABELS[t])}</span>${mark(t)}</button>`).join('');
  const node = open(el(`<div class="screen solid shop-screen">
    <div class="page">
      <div class="topbar sticky" style="width:100%"><button class="icon-btn" data-back aria-label="${esc(tr('common.back'))}">${ICONS.back}</button><h1>${esc(tr('shop.title'))}</h1>${coinPill(save)}</div>
      <div class="tabs shop-tabs" role="tablist" aria-label="${esc(tr('shop.title'))}">${tabs}</div>
      <div class="list shop-list"></div>
    </div>
  </div>`));
  const list = node.querySelector('.list');
  const render = (t) => {
    tab = shopTabFor(t);
    for (const b of node.querySelectorAll('.tab')) {
      b.classList.toggle('on', b.dataset.tab === tab);
      b.setAttribute('aria-selected', String(b.dataset.tab === tab));
    }
    list.innerHTML = '';
    refreshCoins(save);
    const rerender = () => render(tab);
    if (tab === 'coins') renderCoinsTab(app, list, rerender);
    else if (tab === 'powerups') renderPowerups(app, list, rerender);
    else if (tab === 'treats') renderTreatsTab(app, list, rerender);
    else renderPacksTab(app, list, rerender);
    list.appendChild(aboutPricesLink(app));
  };
  for (const b of node.querySelectorAll('.tab')) tap(b, () => { render(b.dataset.tab); node.scrollTop = 0; }, click);
  const pill = node.querySelector('[data-coinshop]');
  if (pill) tap(pill, () => { render('coins'); node.scrollTop = 0; }, click);
  const goBack = () => { if (shopNow && shopNow.node === node) shopNow = null; close(node); if (onClose) onClose(); else if (app.onMetaChanged) app.onMetaChanged(); };
  tap(node.querySelector('[data-back]'), goBack, click);
  shopNow = { node, goBack, app };
  render(tab);
  // Shop unlock tour (src/meta/shopTour.js): the first visit clears the Shop dot; the tour runs on the Looks tab only
  markShopOpened(save); app.persist();
  for (const d of document.querySelectorAll('.tabbar .tab-dot')) d.remove();
  if (tab === 'treats' && tourDue(save)) {
    setTimeout(() => { if (node.isConnected && tab === 'treats' && tourDue(save)) runShopTour(node, { app, toast, sound: click, onWardrobe: () => giftNote(save) }); }, 500);
  }
  return node;
}

let shopOpenSections = new Set(); // sections whose "Show all" was tapped in the open Shop

/** "Your Wardrobe" row (skipped when the Wardrobe opened this Shop: Back goes there). */
function wardrobeLink(app, list, rerender) {
  if (wardrobeBelow()) return;
  const w = el(`<button class="wd-link" data-to-wardrobe>${WARDROBE_ICON}<span><b>${esc(tr('shop.wardrobe'))}</b><small>${esc(tr('shop.wardrobeSub'))}</small></span><i>›</i></button>`);
  tap(w, () => showWardrobe(app, 'pieces', rerender), click);
  list.appendChild(w);
}

/** The one "About prices" link at the bottom of every tab (opens a small sheet; no fine print on the page). */
function aboutPricesLink(app) {
  const b = el(`<button class="btn ghost about-prices" data-about-prices>${esc(tr('prices.title'))}</button>`);
  tap(b, () => showAboutPrices(app), click);
  return b;
}

/** How prices work, in plain words, on one small sheet. Facts only: no timers, no "deal" talk. */
export function showAboutPrices(app) {
  const v = passValue();
  const pouch = IAP.find((x) => x.id === 'coins_s');
  const pct = (id) => coinBonusPct(id);
  const chest = IAP.find((x) => x.id === 'coins_m'), vault = IAP.find((x) => x.id === 'coins_l');
  const node = open(el(`<div class="screen modal"><div class="card about-prices-sheet" role="dialog" aria-label="${esc(tr('prices.title'))}">
    <h2>${esc(tr('prices.title'))}</h2>
    <ul class="about-list">
      <li>${esc(tr('prices.never'))}</li>
      <li>${esc(tr('prices.earn'))}</li>
      <li>${esc(tr('prices.guide', { name: pouch.name, coins: fmt(pouch.coins), price: pouch.price }))}</li>
      <li>${esc(tr('prices.confirm', { n: fmt(COIN_CONFIRM_MIN) }))}</li>
      <li>${esc(tr('prices.bonus', { chest: chest.name, chestPct: pct('coins_m'), vault: vault.name, vaultPct: pct('coins_l') }))}</li>
      <li>${esc(tr('prices.firstPack'))}</li>
      <li>${esc(tr('prices.starter', { value: starterValueLine(), name: pouch.name }))}</li>
      <li>${esc(tr('prices.pass', { name: PASS_NAME, total: fmt(v.total), days: v.days, pack: fmt(v.bestPackCoinsAtPassPrice), packName: v.bestPack.name, n: CLUB_KEEPSAKES.length }))}${PASS_YEAR_ENABLED ? ` The 12-month plan: ${esc(passYearLine())}.` : ''}</li>
      <li>${esc(tr('prices.bundles', { bundle: noAdsBundleLine(), shelf: packAllLine() }))}</li>
      <li>${esc(tr('prices.finish'))} ${esc(FINISH_PRICES_LINE)}</li>
      <li>${esc(tr('prices.looks'))}</li>
    </ul>
    <p class="pass-fine">Test build: purchases are simulated and nothing is charged.</p>
    <button class="btn ghost" data-x>${esc(tr('common.close'))}</button>
  </div></div>`));
  tap(node.querySelector('[data-x]'), () => close(node), click);
  return node;
}

// ==================================================================== ABOUT NOVA DROP: THANK-YOU TIP
/**
 * The only place a tip is offered (DESIGN.md "Thank-you tip"): Settings › Extras › About Nova's Café. Never a pop-up,
 * a badge, a reminder or a line after a level or an ad. Three consumable tips; each gives the same thank-you, and the
 * first one also puts a tip jar on the café counter. No coins, boosters or gameplay. `onDone` runs when it closes.
 */
export function showAboutTips(app, onDone = null) {
  const tips = TIP_IDS.map((id) => IAP.find((x) => x.id === id));
  const jarNote = () => {
    if (!hasTipJar(app.save)) return '';
    return taskStyle(app.save, 'counter_bar') >= 0
      ? tr('tip.jarHere')
      : tr('tip.jarLater');
  };
  const node = open(el(`<div class="screen modal"><div class="card about-prices-sheet tip-sheet" role="dialog" aria-labelledby="tip-title">
    <h2 id="tip-title">${esc(tr('tip.title'))}</h2>
    <div class="tip-head"><canvas class="tip-jar-ico" width="72" height="72" aria-hidden="true"></canvas><p class="tip-lead">${esc(TIP_LEAD)}</p></div>
    <div class="tip-row">${tips.map((t) => `<button class="btn tip-btn" data-tip="${esc(t.id)}" aria-label="${esc(tr('tip.aria', { name: t.name.toLowerCase(), price: t.price }))}">${esc(t.price)}</button>`).join('')}</div>
    <p class="pass-fine">${esc(TIP_FINE)}</p>
    <p class="pass-fine tip-jar-note" data-jar>${esc(jarNote())}</p>
    <p class="pass-fine sim-note">Test build: tips are simulated and nothing is charged.</p>
    <button class="btn primary" data-done>${esc(tr('common.done'))}</button>
  </div></div>`));
  const ico = node.querySelector('.tip-jar-ico');
  try {
    const dpr = Math.min(3, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
    ico.width = 72 * dpr; ico.height = 72 * dpr; ico.style.width = '72px'; ico.style.height = '72px';
    const g = ico.getContext('2d');
    if (g) { g.scale(dpr, dpr); paintDecorIcon(g, 'tip_jar', 72); }
  } catch (_) { /* no canvas: the words say it all */ }
  for (const b of node.querySelectorAll('[data-tip]')) {
    tap(b, async () => {
      const item = IAP.find((x) => x.id === b.dataset.tip);
      if (!item) return;
      const ok = await confirmBox({
        title: esc(tr('tip.confirmTitle')),
        text: `${esc(tr('tip.confirm', { price: item.price }))}<br><span class="sim-note">Test build: tips are simulated and nothing is charged.</span>`,
        ok: esc(tr('tip.ok', { price: item.price })),
        cancel: esc(tr('common.notNow')),
      });
      if (!ok || !node.isConnected) return;
      const jarNew = !hasTipJar(app.save);
      if (!grantIap(app.save, item.id)) return;
      if (app.purchaseGranted) app.purchaseGranted();
      app.persist();
      Svc.sfx('coin');
      Svc.haptic('success');
      const jar = node.querySelector('[data-jar]');
      if (jar) jar.textContent = jarNote();
      await confirmBox({ title: esc(tr('tip.thanksTitle')), text: esc(tipThanks(jarNew)), ok: esc(tr('tip.welcome')), cancel: null });
    }, click);
  }
  tap(node.querySelector('[data-done]'), () => { close(node); if (onDone) onDone(); }, click);
  return node;
}

/** A coin price: buy button with the coin icon, or, when short, the price and how many more coins. */
function coinBuyHtml(save, cost, name, attr = 'data-buy') {
  const need = Math.max(0, cost - (save.coins || 0));
  if (!need) return `<div class="buy-col"><button class="btn small gold coin-btn" ${attr} aria-label="${esc(tr('shop.buyAria', { name, coins: fmt(cost) }))}"><span class="coin"></span>${fmt(cost)}</button></div>`;
  return `<div class="buy-col short"><button class="btn small gold coin-btn" ${attr} disabled aria-label="${esc(tr('shop.shortAria', { name, coins: fmt(cost), need: coinsNeededLine(need) }))}"><span class="coin"></span>${fmt(cost)}</button><span class="need-more">${esc(coinsNeededLine(need))}</span></div>`;
}

/** A real-money button: one clear style, the price on its own white chip. */
function moneyBtnHtml(label, price, attrs = '', small = false) {
  return `<button class="btn money${small ? ' small' : ''}" ${attrs}><span>${esc(label)}</span><span class="price">${esc(price)}</span></button>`;
}

/** The gentle "earn coins by playing" line, shown once on a coin tab when something costs more than you have. */
function earnHint(list) {
  list.appendChild(el(`<p class="earn-hint">${esc(EARN_COINS_LINE)}</p>`));
}

/**
 * "Show all N" under a section that shows only its first few cards; once opened, "Show fewer" folds it back (and
 * brings the section's heading back into view). `canFold`: the section has more cards than its preview.
 */
function showAllButton(list, key, rest, label, rerender, canFold = false) {
  if (shopOpenSections.has(key)) {
    if (!canFold) return;
    const f = el(`<button class="btn ghost show-all" data-show-fewer="${esc(key)}">Show fewer</button>`);
    tap(f, () => {
      shopOpenSections.delete(key); rerender();
      const sec = list.querySelector(`[data-section="${key}"]`);
      if (sec && sec.scrollIntoView) sec.scrollIntoView({ block: 'start' });
    }, click);
    list.appendChild(f);
    return;
  }
  if (!rest) return;
  const b = el(`<button class="btn ghost show-all" data-show-all="${esc(key)}">${esc(label)}</button>`);
  tap(b, () => { shopOpenSections.add(key); rerender(); }, click);
  list.appendChild(b);
}

// ==================================================================== SHOP ↔ WARDROBE (DESIGN.md "Unlock moments")
let shopNow = null; // the open Shop: { node, goBack, app }
/** True when a Wardrobe screen sits under the Shop (the Wardrobe opened it): links then just go back. */
function wardrobeBelow() {
  try { return !!(typeof document !== 'undefined' && document.querySelector && document.querySelector('#screens .wardrobe-screen:not(.leaving)')); } catch (_) { return false; }
}

/** The tour's "Wear it now": the same note, so the gift's new home (the Wardrobe) is one tap away. */
function giftNote(save) {
  const code = save.shopTour && save.shopTour.gift;
  const it = giftItem(code);
  if (it) boughtNote(it.name, it.kind === 'skin' ? 'pieces' : it.kind);
}

/**
 * After a coin buy in the Shop (already put on by the buy itself): a small note at the bottom of the Shop saying so,
 * with a way into the Wardrobe where it now lives. Stays until tapped; a second buy replaces it. No timers.
 */
function boughtNote(name, cat, line = 'You’re wearing it now. Change it any time in your Wardrobe.') {
  const cur = shopNow;
  if (!cur || !cur.node.isConnected) return null;
  const old = cur.node.querySelector('.bought-note');
  if (old) old.remove();
  const fromWardrobe = wardrobeBelow();
  const n = el(`<div class="bought-note" role="status">
    <div class="bought-txt"><b>${esc(tr('shop.isYours', { name }))}</b><small>${esc(line)}</small></div>
    <div class="bought-acts"><button class="btn small primary" data-wd>${fromWardrobe ? esc(tr('shop.backToWardrobe')) : 'Open Wardrobe'}</button><button class="btn small ghost" data-keep>Keep looking</button></div>
  </div>`);
  cur.node.appendChild(n);
  tap(n.querySelector('[data-keep]'), () => n.remove(), click);
  tap(n.querySelector('[data-wd]'), () => {
    n.remove();
    if (fromWardrobe) cur.goBack(); // the Wardrobe opened this Shop: just go back to it (it repaints)
    else showWardrobe(cur.app, cat, () => { if (cur.node.isConnected) refreshCoins(cur.app.save); });
  }, click);
  return n;
}

/** Restore purchases (on both real-money tabs). */
function restoreButton(rerender) {
  const restore = el(`<button class="btn ghost restore-btn" data-restore>${esc(tr('shop.restore'))}</button>`);
  tap(restore, async () => {
    if (Svc.restorePurchases) { await Svc.restorePurchases(); rerender(); return; }
    toast(tr('shop.restoreNone'), false, 3200);
  }, click);
  return restore;
}

/** Coins tab (real money): the Starter Pack (with its computed value) and the coin packs (real bonus percents). */
function renderCoinsTab(app, list, rerender) {
  const save = app.save;
  const bonus = firstPackBonusAvailable(save);
  list.appendChild(el(`<p class="earn-hint">${esc(tr('shop.coins.earn'))}</p>`));
  const starter = IAP.find((x) => x.id === 'starter');
  if (starter && !save.purchases.starterPack) {
    const r = el(`<div class="row-item money-row"><div class="thumb">${ICONS.gift}</div><div class="grow"><div class="name">${esc(starter.name)}</div>
      <div class="desc">${esc(tr('shop.starter.desc', { coins: fmt(starter.coins) }))}</div><div class="pass-math">${esc(starterValueLine())}</div>
      ${moneyBtnHtml(tr('shop.buy'), starter.price, `data-iap="starter" aria-label="${esc(tr('shop.buyTheAria', { name: starter.name, price: starter.price }))}"`, true)}</div></div>`);
    tap(r.querySelector('[data-iap]'), async () => { if (await stubPurchase(app, starter)) rerender(); }, click);
    list.appendChild(r);
  }
  // Coin packs. (Before the shop audit this ladder never showed: el() nodes sit in a template fragment, so a
  // `parentNode` check was always truthy. The heading and ladder are now added once, up front.)
  const packs = IAP.filter((item) => isCoinPack(item.id));
  if (packs.length) {
    list.appendChild(el(`<h3 class="shop-sub">${esc(tr('shop.coinPacks'))} <small>${esc(bonus ? tr('shop.coinPacks.doubled') : tr('shop.coinPacks.bigger'))}</small></h3>`));
    const ladder = el('<div class="coin-ladder"></div>');
    list.appendChild(ladder);
    for (const item of packs) {
      const pct = coinBonusPct(item.id);
      const tag = bonus ? tr('shop.coinTag.first') : pct ? tr('shop.coinTag.pct', { pct }) : '';
      const c = el(`<div class="coin-tier"><span class="coin"></span><b>${fmt(bonus ? item.coins * 2 : item.coins)}</b><small>${esc(item.name)}</small>
        ${tag ? `<span class="lvl-tag">${esc(tag)}</span>` : '<span></span>'}${moneyBtnHtml('', item.price, `data-iap="${esc(item.id)}" aria-label="${esc(bonus ? tr('shop.coinAria.first', { name: item.name, coins: fmt(item.coins), doubled: fmt(item.coins * 2), price: item.price }) : tr('shop.coinAria', { name: item.name, coins: fmt(item.coins), price: item.price }))}"`, true)}</div>`);
      tap(c.querySelector('button'), async () => { if (await stubPurchase(app, item)) rerender(); }, click);
      ladder.appendChild(c);
    }
  }
  list.appendChild(restoreButton(rerender));
}

/** Power-ups tab (coins): boosters, then the permanent Endless upgrades. Short of coins: how many more, never a buy link. */
function renderPowerups(app, list, rerender) {
  const save = app.save;
  const costs = [
    ...Object.keys(BOOSTERS).filter((id) => save.journey.level >= BOOSTER_UNLOCKS[id]).map((id) => BOOSTERS[id].price),
    ...UPGRADES.map((u) => upgradeCost(save, u.id)).filter((c) => c != null),
  ];
  if (costs.some((c) => c > save.coins)) earnHint(list);
  list.appendChild(el(`<h3 class="shop-sub">${esc(tr('shop.boosters'))} <small>${esc(tr('shop.boosters.sub'))}</small></h3>`));
  for (const id of Object.keys(BOOSTERS)) {
    const b = BOOSTERS[id];
    const unlocked = save.journey.level >= BOOSTER_UNLOCKS[id];
    const act = unlocked ? coinBuyHtml(save, b.price, b.name) : `<div class="buy-col"><button class="btn small" disabled>${esc(tr('shop.levelN', { n: BOOSTER_UNLOCKS[id] }))}</button></div>`;
    const r = el(`<div class="row-item"><div class="thumb" style="color:var(--ink-orange, #ff8a5c)">${ICONS[id]}</div><div class="grow"><div class="name">${b.name} <span class="lvl-tag">${esc(tr('shop.youHave', { n: save.boosters[id] || 0 }))}</span></div><div class="desc">${unlocked ? b.desc : esc(tr('shop.unlocksAt', { n: BOOSTER_UNLOCKS[id] }))}</div></div>
      ${act}</div>`);
    const btn = r.querySelector('[data-buy]:not([disabled])');
    if (btn) tap(btn, () => {
      if (buyBooster(save, id)) { Svc.sfx('coin'); app.persist(); toast(tr('shop.plusOne', { name: b.name }), true); rerender(); }
    }, click);
    list.appendChild(r);
  }
  list.appendChild(el(`<h3 class="shop-sub">${esc(tr('shop.upgrades'))} <small>${esc(tr('shop.upgrades.sub'))}</small></h3>`));
  for (const u of UPGRADES) {
    const cost = upgradeCost(save, u.id);
    const lvl = upgradeLevel(save, u.id);
    const lvTxt = u.costs.length > 1 ? `<span class="lvl-tag">${esc(tr('shop.levelOf', { n: lvl, total: u.costs.length }))}</span>` : '';
    const r = el(`<div class="row-item"><div class="grow"><div class="name">${u.name} ${lvTxt}</div><div class="desc">${u.desc}</div></div>
      ${cost == null ? `<button class="btn small" disabled>${esc(tr('shop.owned'))}</button>` : coinBuyHtml(save, cost, u.name)}</div>`);
    const b = r.querySelector('[data-buy]:not([disabled])');
    if (b) tap(b, async () => {
      if (!(await confirmCoinBuy(save, u.name, cost, esc(tr('shop.upgradeAfter'))))) return;
      if (buyUpgrade(save, u.id)) { Svc.sfx('coin'); Svc.haptic('success'); app.persist(); rerender(); }
    }, click);
    list.appendChild(r);
  }
}

/**
 * Packs tab (real money): themed packs as simple stacked cards, then Café Club and Remove Ads.
 * Every money button has the same blue style with the price on a white chip, so it can't be mistaken for coins.
 */
function renderPacksTab(app, list, rerender) {
  wardrobeLink(app, list, rerender);
  renderPacks(app, list, rerender);
  if (unlocked(app.save, 'books')) renderBookShop(app, list, rerender); // Puzzle Books: one card per book, after the themed packs
  // Collector's Shelf: the whole shelf only while no piece of any pack is owned, so nobody ever pays twice for a piece.
  // Once part of it is owned, the same card offers the rest for the difference ("Pay the difference", shelfFinish).
  const shelf = IAP.find((x) => x.id === 'pack_all');
  const shelfFin = shelf && !packAllOffered(app.save) ? shelfFinish(app.save) : null;
  if (shelf && packAllOffered(app.save)) {
    const r = el(`<div class="row-item money-row shelf-card"><div class="grow"><div class="name">${esc(shelf.name)}</div><div class="desc">${esc(tr('shop.shelf.desc', { n: packAllPacks().length }))}</div>
      ${moneyBtnHtml(tr('shop.getAll'), shelf.price, `data-iap="pack_all" aria-label="${esc(tr('shop.getAria', { name: shelf.name, price: shelf.price }))}"`, true)}<span class="usd">${esc(packAllLine())}</span></div></div>`);
    tap(r.querySelector('[data-iap]'), async () => { if (await stubPurchase(app, shelf)) rerender(); }, click);
    list.appendChild(r);
  } else if (shelfFin) {
    const it = IAP.find((x) => x.id === shelfFin.product);
    const r = el(`<div class="row-item money-row shelf-card shelf-finish"><div class="grow"><div class="name">${esc(shelf.name)}</div><div class="desc">${esc(shelfFinishLine(shelfFin))}</div>
      ${moneyBtnHtml(tr('shop.getRest'), it.price, `data-iap="${esc(it.id)}" aria-label="${esc(tr('shop.getRestAria', { name: shelf.name, price: it.price }))}"`, true)}<span class="usd">${esc(tr('shop.shelf.later'))}</span></div></div>`);
    tap(r.querySelector('[data-iap]'), async () => { if (await stubPurchase(app, it)) rerender(); }, click);
    list.appendChild(r);
  }
  const item = IAP.find((x) => x.id === PASS.id);
  if (item) {
    list.appendChild(el(`<h3 class="shop-sub" data-section="pass">${esc(PASS_NAME)} <small>${esc(keepsakesLeft(app.save) > 0 ? tr('shop.pass.subKeepsake') : tr('shop.pass.sub'))}</small></h3>`));
    list.appendChild(passCard(app, rerender));
  }
  if (!Svc.removeAdsOwned() && noAdsOffered(app.save)) {
    const ra = IAP.find((x) => x.id === 'remove_ads'), nb = IAP.find((x) => x.id === 'no_ads_bundle');
    list.appendChild(el(`<h3 class="shop-sub">${esc(tr('buy.removeAds'))} <small>${esc(tr('shop.removeAds.sub'))}</small></h3>`));
    for (const it of [ra, nb]) {
      if (!it) continue;
      const line = it.id === 'no_ads_bundle' ? `<span class="usd">${esc(noAdsBundleLine())}</span>` : '';
      const r = el(`<div class="row-item money-row"><div class="thumb">${ICONS.noads}</div><div class="grow"><div class="name">${esc(it.name)}</div><div class="desc">${esc(it.desc)}</div>
        ${moneyBtnHtml(tr('shop.buy'), it.price, `data-iap="${esc(it.id)}" aria-label="${esc(tr('shop.buyForAria', { name: it.name, price: it.price }))}"`, true)}${line}</div></div>`);
      tap(r.querySelector('[data-iap]'), async () => { if (await stubPurchase(app, it)) rerender(); }, click);
      list.appendChild(r);
    }
  }
  list.appendChild(restoreButton(rerender));
}

/**
 * Coin treats tab: every look bought with coins, one section per kind (pieces, board and merge looks, backgrounds,
 * moving backgrounds). Each section shows its first cards (unowned first) and a "Show all" button.
 */
function renderTreatsTab(app, list, rerender) {
  const save = app.save;
  wardrobeLink(app, list, rerender);
  const prices = [
    ...SKINS.filter((sk) => sk.cost > 0 && !save.skins.owned.includes(sk.id)).map((sk) => sk.cost),
    ...['board', 'combo'].flatMap((k) => lookList(save, k).filter((l) => l.cost > 0 && !l.owned).map((l) => l.cost)),
    ...COSMIC_NEBULAS.filter((id) => !ownsNebula(save, id)).map(() => COSMIC_NEBULA_PRICE),
    ...SCENE_BACKDROPS.filter((t) => !t.pack && !ownsScene(save, t.id)).map(() => SCENE_PRICE.coins),
  ];
  if (prices.some((c) => c > save.coins)) earnHint(list);
  renderSkins(app, list, rerender);
  renderLooks(app, list, rerender);
  renderCosmicNebulas(app, list, rerender);
  renderScenes(app, list, rerender);
}

/**
 * The one confirm sheet for coin buys (UX re-check): anything at or above COIN_CONFIRM_MIN asks first, worded like the
 * backgrounds always were. Cheaper buys (boosters) stay one tap. Resolves true to go ahead.
 */
function confirmCoinBuy(save, name, cost, after = esc(tr('shop.yoursToKeep'))) {
  if (!coinBuyNeedsConfirm(cost)) return Promise.resolve(true);
  return confirmBox({
    title: tr('shop.getQ', { name }),
    text: `${esc(tr('shop.usesCoins', { cost: fmt(cost), coins: fmt(save.coins) }))}<br>${after}`,
    ok: esc(tr('shop.getIt', { cost: fmt(cost) })), cancel: esc(tr('common.notNow')), okClass: 'gold',
  });
}

/** One coin-treat card: a big preview, the name, one line, one action row. */
function treatCardHtml({ preview, name, tag = '', line, actions, cls = '' }) {
  return `<div class="row-item treat-card${cls ? ' ' + cls : ''}"><div class="treat-prev">${preview}</div>
    <div class="treat-txt"><div class="name">${esc(name)}${tag ? ` <span class="lvl-tag">${esc(tag)}</span>` : ''}</div><div class="desc">${esc(line)}</div><div class="treat-act">${actions}</div></div></div>`;
}

/** Piece styles sold for coins (free, Café Club, pack and season styles live elsewhere). */
function renderSkins(app, list, rerender) {
  const save = app.save;
  const all = SKINS.filter((sk) => sk.cost > 0 && !sk.pack); // pack styles live on the Packs tab, never in the coin list
  if (!all.length) return;
  list.appendChild(el(`<h3 class="shop-sub" data-section="pieces">${esc(tr('shop.pieces'))} <small>${esc(tr('shop.pieces.sub'))}</small></h3>`));
  const owned = (sk) => save.skins.owned.includes(sk.id);
  const n = shopOpenSections.has('pieces') ? all.length : SHOP_PREVIEW_COUNT.treats;
  const { shown, rest } = sectionPreview(all, owned, n, isCozyLook);
  for (const sk of shown) {
    const has = owned(sk), equipped = save.skins.equipped === sk.id;
    const actions = equipped ? `<button class="btn small" disabled>${esc(tr('shop.wearing'))}</button>` : has ? `<button class="btn small primary" data-equip>${esc(tr('shop.wear'))}</button>` : coinBuyHtml(save, sk.cost, sk.name);
    const r = el(treatCardHtml({
      preview: `<div class="skin-preview">${[1, 3, 5, 8].map((t) => `<canvas data-t="${t}"></canvas>`).join('')}</div>`,
      name: sk.name, tag: has ? tr('shop.owned') : '', line: sk.desc, actions, cls: equipped ? 'on' : '',
    }));
    const b = r.querySelector('[data-equip], [data-buy]:not([disabled])');
    if (b) tap(b, async () => {
      if (!has && !(await confirmCoinBuy(save, sk.name, sk.cost, esc(tr('shop.pieceAfter'))))) return;
      const ok = has ? equipSkin(save, sk.id) : buySkin(save, sk.id);
      if (ok) { Svc.sfx(has ? 'ui' : 'coin'); app.persist(); rerender(); if (!has) boughtNote(sk.name, 'pieces'); }
    }, click);
    list.appendChild(r);
    requestAnimationFrame(() => { for (const c of r.querySelectorAll('canvas')) paintOrbCanvas(c, { tier: Number(c.dataset.t) }, sk.id); });
  }
  showAllButton(list, 'pieces', rest.length, tr('shop.showAll.pieces', { n: all.length }), rerender, all.length > SHOP_PREVIEW_COUNT.treats);
}

// ==================================================================== BOARD & COMBO LOOKS
// Coin board skins and combo skins (src/meta/looks.js). Cosmetic only: never a rule, score, juice or advert change.
// Pack looks are not sold here: they come with their premium pack's orb skin.

const lookKindLabel = (kind) => (kind === 'board' ? tr('shop.look.board') : tr('shop.look.combo'));

/** Paint a look thumbnail (board: the board with sample pieces; combo: a frozen merge burst). */
function paintLookThumb(cv, kind, id, orbSkin) {
  const w = cv.clientWidth || 64, h = cv.clientHeight || 88;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  const g = cv.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  if (kind === 'board') drawBoardPreview(g, w, h, id, { dpr, skin: orbSkin, reduced: true });
  else drawFxPreview(g, w, h, id, { dpr, skin: orbSkin });
}

function renderLooks(app, list, rerender) {
  const save = app.save;
  const orbSkin = (save.skins && save.skins.equipped) || 'classic';
  // the free default is always yours; pack looks come with their pack
  const all = ['board', 'combo'].flatMap((kind) => lookList(save, kind).filter((l) => l.cost > 0).map((l) => ({ ...l, kind })));
  if (!all.length) return;
  list.appendChild(el(`<h3 class="shop-sub" data-section="looks">${esc(tr('shop.looks'))} <small>${esc(tr('shop.looks.sub'))}</small></h3>`));
  const n = shopOpenSections.has('looks') ? all.length : SHOP_PREVIEW_COUNT.treats;
  const { shown, rest } = sectionPreview(all, (l) => l.owned, n, isCozyLook);
  const cards = [];
  for (const l of shown) {
    const kind = l.kind;
    const st = lookCardAction(l, save.coins); // short of coins: say how many more, never open a purchase
    const actions = st.action === 'equipped' ? `<button class="btn small" disabled>${esc(tr('shop.wearing'))}</button>`
      : st.action === 'equip' ? `<button class="btn small primary" data-equip>${esc(tr('shop.wear'))}</button>`
      : st.action === 'buy' ? `<div class="buy-col"><button class="btn small gold coin-btn" data-buy aria-label="${esc(tr('shop.buyAria', { name: l.name, coins: fmt(l.cost) }))}"><span class="coin"></span>${fmt(l.cost)}</button></div>`
      : `<div class="buy-col short"><button class="btn small gold coin-btn" disabled aria-label="${esc(tr('shop.shortAria', { name: l.name, coins: fmt(l.cost), need: coinsNeededLine(st.need) }))}"><span class="coin"></span>${fmt(l.cost)}</button><span class="need-more">${esc(coinsNeededLine(st.need))}</span></div>`;
    const r = el(treatCardHtml({
      preview: `<canvas class="look-thumb ${kind}" data-look="${esc(l.id)}" data-kind="${kind}" aria-hidden="true"></canvas>`,
      name: l.name, tag: l.owned ? tr('shop.owned') : lookKindLabel(kind), line: l.desc, actions, cls: 'look-item',
    }));
    const b = r.querySelector('[data-equip], [data-buy]:not([disabled])');
    if (b) tap(b, async () => {
      if (!l.owned && !(await confirmCoinBuy(save, l.name, l.cost, esc(kind === 'board' ? tr('shop.boardAfter') : tr('shop.mergeAfter'))))) return;
      const ok = l.owned ? equipLook(save, kind, l.id) : buyLook(save, kind, l.id);
      if (!ok) return;
      Svc.sfx(l.owned ? 'ui' : 'coin');
      if (!l.owned) Svc.haptic('success');
      app.persist();
      rerender();
      if (!l.owned) boughtNote(l.name, kind);
    }, click);
    list.appendChild(r);
    cards.push(r);
  }
  showAllButton(list, 'looks', rest.length, tr('shop.showAll.looks', { n: all.length }), rerender, all.length > SHOP_PREVIEW_COUNT.treats);
  requestAnimationFrame(() => { for (const r of cards) for (const c of r.querySelectorAll('canvas[data-look]')) paintLookThumb(c, c.dataset.kind, c.dataset.look, orbSkin); });
}

// ==================================================================== BACKGROUNDS (v3)
// The still backgrounds that used to come only from Star Capsules or Comet Week, now sold plainly for coins
// (src/meta/scenes.js buyNebula): one fixed price, no draws, no timers, owned forever.

function renderCosmicNebulas(app, list, rerender) {
  const save = app.save;
  const all = COSMIC_NEBULAS.map((id) => BACKDROP_BY_ID[id]).filter(Boolean);
  if (!all.length) return;
  list.appendChild(el(`<h3 class="shop-sub" data-section="backgrounds">${esc(tr('shop.backgrounds'))} <small>${esc(tr('shop.backgrounds.sub'))}</small></h3>`));
  const n = shopOpenSections.has('backgrounds') ? all.length : SHOP_PREVIEW_COUNT.treats;
  const { shown, rest } = sectionPreview(all, (t) => ownsNebula(save, t.id), n, isCozyLook);
  for (const t of shown) {
    const id = t.id;
    const owned = ownsNebula(save, id);
    const actions = owned
      ? (save.settings.backdrop === id ? `<button class="btn small" disabled>${esc(tr('shop.inUse'))}</button>` : `<button class="btn small primary" data-use>${esc(tr('shop.use'))}</button>`)
      : coinBuyHtml(save, COSMIC_NEBULA_PRICE, t.name);
    const r = el(treatCardHtml({
      preview: `<span class="bd-swatch big" style="background:${backdropSwatchCss(t)}"></span>`,
      name: t.name, tag: owned ? tr('shop.owned') : '', line: BACKGROUND_LINES[t.id] || tr('shop.background.line'), actions,
    }));
    const use = r.querySelector('[data-use]');
    if (use) tap(use, () => { app.setSetting('backdrop', id); toast(tr('shop.background.toast', { name: t.name }), true, 1600); rerender(); }, click);
    const b = r.querySelector('[data-buy]:not([disabled])');
    if (b) tap(b, async () => {
      const ok = await confirmBox({
        title: tr('shop.getQ', { name: t.name }),
        text: `${esc(tr('shop.usesCoins', { cost: fmt(COSMIC_NEBULA_PRICE), coins: fmt(save.coins) }))}<br>${esc(tr('shop.background.after'))}`,
        ok: esc(tr('shop.getIt', { cost: fmt(COSMIC_NEBULA_PRICE) })), cancel: esc(tr('common.notNow')), okClass: 'gold',
      });
      if (!ok) return;
      if (!storedStateFresh(app, scenesDiffer)) { rerender(); return; }
      if (!buyNebula(save, id)) { toast(ownsNebula(save, id) ? tr('shop.alreadyOwn', { name: t.name }) : tr('shop.notEnough')); rerender(); return; }
      app.setSetting('backdrop', id);
      persistNow(save);
      Svc.sfx('coin'); Svc.haptic('success');
      refreshCoins(save);
      rerender();
      boughtNote(t.name, 'backgrounds', tr('shop.background.note'));
    }, click);
    list.appendChild(r);
  }
  showAllButton(list, 'backgrounds', rest.length, tr('shop.showAll.backgrounds', { n: all.length }), rerender, all.length > SHOP_PREVIEW_COUNT.treats);
}

// ==================================================================== PREMIUM PACKS (Sushi Bar)
// Themed cosmetic packs for real money (src/meta/packs.js): an orb skin plus two animated scenes,
// as a bundle or piece by piece. A live animated preview first, plain prices, nothing that counts down.
// Cosmetic only: never a rule, score, seed or advert change.

const packItem = (id) => IAP.find((x) => x.id === id);
const pieceLabel = (kind) => (kind === 'skin' ? tr('shop.piece.skin') : tr('shop.piece.scene'));

function pieceName(piece) {
  return piece.kind === 'skin' ? (SKINS.find((k) => k.id === piece.id) || {}).name || piece.id : (BACKDROP_BY_ID[piece.id] || {}).name || piece.id;
}

/** After a paid pack order: wear the pieces it just added (the player can change it any time). A finish order only
 *  adds what was missing, so a skin or background she already had and chose not to wear stays as she left it. */
function wearPackPurchase(app, added) {
  const skin = added.find((p) => p.kind === 'skin');
  const scene = added.find((p) => p.kind === 'scene');
  if (skin && equipSkin(app.save, skin.id)) app.persist();
  if (scene && ownsScene(app.save, scene.id)) app.setSetting('backdrop', scene.id);
}

async function buyPackProduct(app, productId) {
  const item = packItem(productId);
  const hit = packProduct(productId);
  const missing = hit ? hit.pieces.filter((p) => !ownsPiece(app.save, p)) : []; // noted before the order
  if (!item || !(await stubPurchase(app, item))) return false;
  wearPackPurchase(app, missing.filter((p) => ownsPiece(app.save, p)));
  return true;
}

/**
 * Animated hero for a pack card: the pack's scenes (cross-fading every few seconds) with its orbs idling
 * in front. Built once at the card's size; stops when the card leaves the page. Under Calm or reduced
 * motion it paints a single still frame. Returns { play, pause }: the carousel animates only the card in view.
 */
function animatePackHero(cv, pack, paused = false) {
  const r = cv.getBoundingClientRect();
  const w = Math.max(40, Math.round(r.width || 320)), h = Math.max(40, Math.round(r.height || 170));
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  const g = cv.getContext('2d');
  const PW = 390, PH = 844, k = w / PW;
  const themes = pack.scenes.map((s) => BACKDROP_BY_ID[s.id]).filter(Boolean);
  const scenes = themes.map((t) => buildScene(t, PW, PH));
  const L = themes.length;
  const tiers = [2, 5, 7, 9, 10];
  const still = document.body.classList.contains('calm') || deviceReducedMotion();
  const frame = (t) => {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.globalAlpha = 1; g.fillStyle = '#0c0710'; g.fillRect(0, 0, w, h);
    // which scene shows: 5 s each, 1 s cross-fade
    // (index wrapped, missing scenes skipped: a frame can never throw and leave the card blank)
    const per = 6, i = L ? ((Math.floor(t / per) % L) + L) % L : 0, f = (t % per) - (per - 1);
    const show = (n, a) => {
      if (a <= 0 || !L) return;
      g.save(); g.scale(k, k);
      g.globalAlpha = a; paintBase(g, themes[n], PW, PH);
      if (scenes[n]) scenes[n].draw(g, 12 + t, a);
      g.restore();
    };
    show(i, 1);
    if (f > 0 && !still && L > 1) show((i + 1) % L, f);
    g.globalAlpha = 1;
    // bottom shade so the orbs and the label read
    const sh = g.createLinearGradient(0, h * 0.45, 0, h);
    sh.addColorStop(0, 'rgba(8,4,10,0)'); sh.addColorStop(1, 'rgba(8,4,10,0.78)');
    g.fillStyle = sh; g.fillRect(0, 0, w, h);
    const rr = Math.min(h * 0.17, w / (tiers.length * 2.6));
    tiers.forEach((tier, n) => {
      const x = w * (0.5 + (n - (tiers.length - 1) / 2) * 0.19), y = h - rr * 1.35 + (n % 2 ? -rr * 0.25 : 0);
      drawOrb(g, x, y, rr * (0.86 + tier * 0.025), tier, pack.skin.id, dpr, { anim: !still, time: t + n * 0.7 });
    });
  };
  const idle = { play() {}, pause() {} };
  if (still) { frame(0); return idle; }
  let t = 0, last = 0, running = false, gen = 0;
  const loop = (my) => (now) => {
    if (my !== gen) return; // paused (a later play() runs its own loop, so two never stack)
    if (!cv.isConnected) { running = false; return; } // card closed or re-rendered: stop
    t += Math.max(0, Math.min(0.1, (now - last) / 1000)); last = now; // rAF time can be a little older than play()
    frame(t);
    requestAnimationFrame(loop(my));
  };
  const play = () => { if (running) return; running = true; last = performance.now(); requestAnimationFrame(loop(++gen)); };
  frame(0); // painted now, not on the first animation frame
  if (!paused) play();
  return { play, pause: () => { running = false; gen++; } };
}

/** The whole tier ladder of a pack skin, idling live (still under Calm / reduced motion). Look, then decide. */
function showPackSkinPreview(app, pack, onClose) {
  const save = app.save;
  const piece = packPieces(pack).find((p) => p.kind === 'skin');
  const owned = ownsPiece(save, piece);
  const item = packItem(piece.product);

  const cells = Array.from({ length: 10 }, (_, i) => `<div class="pack-tier"><canvas data-tier="${i + 1}" aria-hidden="true"></canvas><small>${i + 1}. ${esc(tierName(i + 1, pack.skin.id))}</small></div>`).join('');
  const node = open(el(`<div class="screen modal"><div class="card pack-sheet">
    <h2>${esc(pieceName(piece))}</h2>
    <p>${esc(tr('shop.packSkin.lead'))}</p>
    <div class="pack-tiers">${cells}</div>
    ${owned ? '' : `<button class="btn gold" data-iap="${esc(item.id)}">${esc(tr('shop.packSkin.get', { price: item.price }))}</button>`}
    <p class="pass-fine">${esc(tr('shop.packSkin.fine'))}</p>
    <button class="btn ghost" data-x>${esc(tr('common.close'))}</button>
  </div></div>`));
  const cvs = Array.from(node.querySelectorAll('canvas[data-tier]'));
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const still = document.body.classList.contains('calm') || deviceReducedMotion();
  const paint = (t) => {
    for (const cv of cvs) {
      const size = cv.clientWidth || 56;
      if (cv.width !== Math.round(size * dpr)) { cv.width = Math.round(size * dpr); cv.height = Math.round(size * dpr); }
      const g = cv.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, size, size);
      const tier = Number(cv.dataset.tier);
      drawOrb(g, size / 2, size / 2, size * 0.42, tier, pack.skin.id, dpr, { anim: !still, time: t + tier * 0.9 });
    }
  };
  requestAnimationFrame(() => {
    if (still) { paint(0); return; }
    const t0 = performance.now();
    const loop = (now) => { if (!node.isConnected) return; paint((now - t0) / 1000); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  });
  const finish = () => { close(node); if (onClose) onClose(); };
  const buy = node.querySelector('[data-iap]');
  if (buy) tap(buy, async () => { if (await buyPackProduct(app, buy.dataset.iap)) finish(); }, click);
  tap(node.querySelector('[data-x]'), finish, click);
  return node;
}

/** One pack's pieces with Preview / Equip / Buy, inside `host`. */
function packPiecesHtml(save, pack) {
  const offers = packOffers(save, pack);
  return packPieces(pack).map((p) => {
    const owned = ownsPiece(save, p);
    const item = packItem(p.product);
    const inUse = p.kind === 'skin' ? save.skins.equipped === p.id : save.settings.backdrop === p.id;
    const act = owned
      ? (inUse ? `<button class="btn small" disabled>${esc(p.kind === 'skin' ? tr('shop.equipped') : tr('shop.inUse'))}</button>` : `<button class="btn small primary" data-wear="${esc(p.id)}">${esc(p.kind === 'skin' ? tr('shop.equip') : tr('shop.use'))}</button>`)
      : offers.includes(p.product) ? `<button class="btn small gold" data-iap="${esc(p.product)}" aria-label="${esc(tr('shop.buyForAria', { name: pieceName(p), price: item.price }))}">${esc(item.price)}</button>` : '';
    return `<div class="pack-piece"><span class="pack-dot ${p.kind}"></span><span class="grow"><b>${esc(pieceName(p))}</b>${owned ? ` <span class="lvl-tag">${esc(tr('shop.ownedTag'))}</span>` : ''}<br><small>${esc(pieceLabel(p.kind))}</small></span>
      <button class="btn small ghost" data-preview="${esc(p.id)}" data-kind="${p.kind}">${esc(tr('shop.preview'))}</button>${act}</div>`;
  }).join('');
}

function wirePackButtons(app, host, pack, rerender) {
  const save = app.save;
  for (const b of host.querySelectorAll('[data-iap]')) tap(b, async () => { if (await buyPackProduct(app, b.dataset.iap)) rerender(); }, click);
  for (const b of host.querySelectorAll('[data-preview]')) {
    tap(b, () => (b.dataset.kind === 'skin' ? showPackSkinPreview(app, pack, rerender) : showScenePreview(app, BACKDROP_BY_ID[b.dataset.preview], rerender)), click);
  }
  for (const b of host.querySelectorAll('[data-wear]')) tap(b, () => {
    const p = packPieces(pack).find((x) => x.id === b.dataset.wear);
    if (p.kind === 'skin') { if (equipSkin(save, p.id)) { Svc.sfx('ui'); app.persist(); } }
    else { app.setSetting('backdrop', p.id); toast(tr('shop.background.toast', { name: pieceName(p) }), true, 1600); }
    rerender();
  }, click);
}

/** "What's inside": the full piece list, piece prices and the fine print, out of the carousel card. */
function showPackInside(app, pack, rerender) {
  const save = app.save;
  const coll = collectionLine(save, pack);
  const node = open(el(`<div class="screen modal"><div class="card pack-sheet pack-inside">
    <h2>${esc(pack.name)}</h2>
    <p>${esc(pack.blurb)}</p>
    ${coll ? `<p class="pack-coll">${esc(coll)}</p>` : ''}
    <div class="pack-pieces">${packPiecesHtml(save, pack)}</div>
    <p class="pass-fine">Cosmetic only: it changes how the game looks, never your scores, levels or adverts. One-time purchase, yours to keep. The board and combo looks come with the orb skin. The motion stops with Calm or reduced motion.</p>
    <button class="btn ghost" data-x>${esc(tr('common.close'))}</button>
  </div></div>`));
  const again = () => { node.remove(); rerender(); };
  wirePackButtons(app, node, pack, again);
  tap(node.querySelector('[data-x]'), () => close(node), click);
  return node;
}

/** "Piece style and 2 moving backgrounds": what a pack holds, in one plain line. */
function packContentsLine(pack) {
  const scenes = pack.scenes.length;
  return scenes ? trp('shop.contents', scenes, { n: scenes }) : tr('shop.contents.none');
}

/**
 * Themed packs as simple stacked compact cards (no sideways swiping): a short live preview strip, the name, one line of
 * what's in it, one money button with its save line, and "See more" for Preview / Try for a level / What's inside
 * (UX_PUZZLE_BOOKS "Fix first" 2: the tab was 3.4 screens long). The first card is this week's calendar pick
 * ("Featured"; packCarouselOrder: the same for everyone, skipping packs you own; never based on spending, adverts or
 * the device). The first three show, the rest behind "Show more packs". Only cards on screen animate
 * (IntersectionObserver), and every card holds still under Calm or reduced motion. Nothing moves by itself.
 */
function renderPacks(app, list, rerender) {
  const save = app.save;
  const order = packCarouselOrder(save, new Date());
  const n = order.length;
  if (!n) return;
  list.appendChild(el(`<h3 class="shop-sub">${esc(tr('shop.packs'))} <small>${esc(tr('shop.packs.sub'))}</small></h3>`));
  const limit = shopOpenSections.has('packs') ? n : SHOP_PREVIEW_COUNT.packs;
  const heroes = [];
  order.slice(0, limit).forEach((pack, i) => {
    const offers = packOffers(save, pack);
    const bundle = packItem(pack.product);
    const fin = packFinish(save, pack); // "Pay the difference": the rest of a part-owned pack, on its own card only
    const ownedAll = ownsPack(save, pack);
    const skinOwned = save.skins.owned.includes(pack.skin.id);
    const pieces = packPieces(pack);
    const separate = pieces.reduce((s, p) => s + (packItem(p.product).usd || 0), 0);
    const coll = collectionLine(save, pack);
    const canTry = !skinOwned && !!app.tryForLevel;
    const tag = ownedAll ? tr('shop.owned') : i === 0 ? 'Featured' : '';
    const openKey = 'pack:' + pack.id;
    const isOpen = shopOpenSections.has(openKey);
    const hasBuy = offers.includes(pack.product);
    // compact by default (UX_PUZZLE_BOOKS "Fix first" 2): a short live strip, the name, what's in it, the price button
    // and its plain "save" line always show; "See more" opens Preview / Try for a level / What's inside in place.
    const card = el(`<div class="pack-card compact${isOpen ? ' open' : ''}" role="group" aria-label="${esc(pack.name)}">
        <canvas class="pack-hero" aria-hidden="true"></canvas>
        <div class="pack-body">
          <div class="pack-head">
            <div class="pack-title">${esc(pack.name)}${tag ? ` <span class="lvl-tag">${tag}</span>` : ''}</div>
            <button class="btn small ghost pack-more" data-pack-more aria-expanded="${isOpen}" aria-controls="pack-more-${esc(pack.id)}" aria-label="${esc(isOpen ? tr('shop.seeLessAbout', { name: pack.name }) : tr('shop.seeMoreAbout', { name: pack.name }))}">${esc(isOpen ? tr('shop.seeLess') : tr('shop.seeMore'))}</button>
          </div>
          ${hasBuy ? `<div class="pack-buy">${moneyBtnHtml('Get the pack', bundle.price, `data-iap="${esc(pack.product)}" aria-label="${esc(tr('shop.getPackAria', { name: pack.name, price: bundle.price }))}"`)}
            <span class="usd">${esc(bundleSaveLine(bundle.usd, separate, pieces.length, bundle.price))}</span></div>` : ''}
          ${fin ? `<div class="pack-buy pack-finish"><div class="pack-finish-line">${esc(packFinishLine(fin, pack))}</div>${moneyBtnHtml(tr('shop.getRest'), fin.price, `data-iap="${esc(fin.product)}" aria-label="${esc(tr('shop.getRestPackAria', { name: pack.name, price: fin.price }))}"`)}
            <span class="usd">${esc(tr('shop.finish.pieces'))}</span></div>` : ''}
          <div class="pack-extra" id="pack-more-${esc(pack.id)}"${isOpen ? '' : ' hidden'}>
            <div class="desc">${esc(packContentsLine(pack))}</div>
            ${coll ? `<div class="pack-coll">${esc(coll)}</div>` : ''}
            <div class="pack-acts">
              <button class="btn small ghost" data-preview="${esc(pack.skin.id)}" data-kind="skin">${esc(tr('shop.preview'))}</button>
              ${canTry ? `<button class="btn small ghost" data-try aria-label="${esc(tr('shop.tryAria', { name: pack.name }))}">${esc(tr('shop.try'))}</button>` : ''}
              <button class="btn small ghost" data-inside>${esc(tr('shop.inside'))}</button>
            </div>
          </div>
        </div>
      </div>`);
    wirePackButtons(app, card, pack, rerender);
    const tryBtn = card.querySelector('[data-try]');
    if (tryBtn) tap(tryBtn, () => app.tryForLevel(pack.id), click);
    tap(card.querySelector('[data-inside]'), () => showPackInside(app, pack, rerender), click);
    const moreBtn = card.querySelector('[data-pack-more]');
    tap(moreBtn, () => {
      const open = !shopOpenSections.has(openKey);
      if (open) shopOpenSections.add(openKey); else shopOpenSections.delete(openKey);
      card.classList.toggle('open', open);
      card.querySelector('.pack-extra').hidden = !open;
      moreBtn.setAttribute('aria-expanded', String(open));
      moreBtn.textContent = open ? tr('shop.seeLess') : tr('shop.seeMore');
      moreBtn.setAttribute('aria-label', open ? tr('shop.seeLessAbout', { name: pack.name }) : tr('shop.seeMoreAbout', { name: pack.name }));
    }, click);
    list.appendChild(card);
    heroes.push({ card, pack, hero: null, seen: false });
  });
  showAllButton(list, 'packs', n - limit, trp('shop.showMorePacks', n - limit, { n: n - limit }), rerender, n > SHOP_PREVIEW_COUNT.packs);

  // Paint every hero right away as a still frame (no blank card while a throttled tab holds back animation frames),
  // then animate only the cards on screen.
  const startHeroes = () => {
    if (!heroes.length || !heroes[0].card.isConnected) return;
    for (const h of heroes) if (!h.hero) h.hero = animatePackHero(h.card.querySelector('.pack-hero'), h.pack, true);
    if (typeof IntersectionObserver === 'function') {
      const io = new IntersectionObserver((entries) => {
        for (const e of entries) {
          const h = heroes.find((x) => x.card === e.target);
          if (!h || !h.hero) continue;
          if (!h.card.isConnected) { io.disconnect(); return; }
          if (e.isIntersecting) h.hero.play(); else h.hero.pause();
        }
      }, { threshold: [0, 0.25] });
      for (const h of heroes) io.observe(h.card);
    } else heroes[0].hero.play();
  };
  if (heroes[0] && heroes[0].card.isConnected && heroes[0].card.offsetWidth > 0) startHeroes(); else requestAnimationFrame(startHeroes);
}

// ==================================================================== SKY SCENES (v0.5.8)
// Premium animated backgrounds (src/meta/scenes.js): coins only (v3), live preview first,
// plain confirm. Never sold through adverts, clocks or random draws.

function sceneActionsHtml(save, t) {
  if (ownsScene(save, t.id)) {
    return save.settings.backdrop === t.id ? '<button class="btn small" disabled>In use</button>' : '<button class="btn small primary" data-use>Use</button>';
  }
  if (t.pack) { // premium pack scene: sold for money on its pack card, never for coins
    const pk = PACKS.find((p) => p.id === t.pack);
    const item = IAP.find((x) => x.id === pk.scenes.find((x) => x.id === t.id).product);
    return moneyBtnHtml('', item.price, `data-iap="${esc(item.id)}" aria-label="Buy ${esc(t.name)} for ${esc(item.price)}"`, true);
  }
  return coinBuyHtml(save, SCENE_PRICE.coins, t.name, 'data-buy="coins"');
}

/** Wire the Use / Buy buttons inside `host` for scene `t`; done() re-renders after a change. */
function wireSceneActions(app, host, t, done) {
  const use = host.querySelector('[data-use]');
  if (use) tap(use, () => { app.setSetting('backdrop', t.id); toast(`Background: ${t.name}`, true, 1600); done(); }, click);
  for (const b of host.querySelectorAll('[data-buy]:not([disabled])')) {
    tap(b, async () => { if (await buySceneFlow(app, t)) done(); }, click);
  }
  const iap = host.querySelector('[data-iap]');
  if (iap) tap(iap, async () => { if (await buyPackProduct(app, iap.dataset.iap)) done(); }, click);
}

async function buySceneFlow(app, t) {
  const save = app.save;
  const price = SCENE_PRICE.coins;
  const ok = await confirmBox({
    title: `Get ${t.name}?`,
    text: `This uses ${fmt(price)} of your ${fmt(save.coins)} coins.<br>It becomes your background now and is yours to keep. Change it any time in your Wardrobe.`,
    ok: `Get it · ${fmt(price)}`, cancel: 'Not now', okClass: 'gold',
  });
  if (!ok) return false;
  if (!storedStateFresh(app, scenesDiffer)) return true;
  if (!buyScene(save, t.id)) { toast(ownsScene(save, t.id) ? `You already own ${t.name}.` : 'Not enough coins yet.'); return true; }
  app.setSetting('backdrop', t.id);
  persistNow(save);
  Svc.sfx('coin'); Svc.haptic('success');
  refreshCoins(save);
  if (!boughtNote(t.name, 'backgrounds', 'It’s your background now. Change it any time in your Wardrobe.')) toast(`${t.name} is yours!`, true);
  return true;
}

function renderScenes(app, list, rerender) {
  const save = app.save;
  const all = SCENE_BACKDROPS.filter((t) => !t.pack);
  if (!all.length) return;
  list.appendChild(el('<h3 class="shop-sub" data-section="scenes">Moving backgrounds <small>gently animated, behind the board</small></h3>'));
  const n = shopOpenSections.has('scenes') ? all.length : SHOP_PREVIEW_COUNT.treats;
  const { shown, rest } = sectionPreview(all, (t) => ownsScene(save, t.id), n);
  const cards = [];
  for (const t of shown) {
    const owned = ownsScene(save, t.id);
    const actions = owned ? sceneActionsHtml(save, t) : coinBuyHtml(save, SCENE_PRICE.coins, t.name, 'data-buy="coins"');
    const r = el(treatCardHtml({
      preview: `<canvas class="scene-thumb" data-scene="${esc(t.id)}" aria-hidden="true"></canvas>`,
      name: t.name, tag: owned ? 'Owned' : '', line: t.blurb, cls: 'scene-item',
      actions: `<button class="btn small ghost" data-preview>Preview</button>${actions}`,
    }));
    tap(r.querySelector('[data-preview]'), () => showScenePreview(app, t, rerender), click);
    wireSceneActions(app, r, t, rerender);
    list.appendChild(r);
    cards.push(r);
  }
  showAllButton(list, 'scenes', rest.length, `Show all ${all.length} moving backgrounds`, rerender, all.length > SHOP_PREVIEW_COUNT.treats);
  requestAnimationFrame(() => { for (const r of cards) for (const c of r.querySelectorAll('canvas[data-scene]')) paintScenePreview(c, BACKDROP_BY_ID[c.dataset.scene]); });
}

/** Full-screen live preview: the real animated scene behind a small card (other screens hidden). */
export function showScenePreview(app, t, onClose) {
  const host = root();
  // hide only what is open now: a confirm opened from the preview must stay visible
  const hidden = [...host.querySelectorAll(':scope > .screen')];
  for (const n of hidden) n.classList.add('preview-hidden');
  host.classList.add('previewing');
  if (app.previewBackdrop) app.previewBackdrop(t.id);
  const calm = document.body.classList.contains('calm');
  const node = open(el(`<div class="screen scene-preview"><div class="card scene-preview-card">
    <h2>${esc(t.name)}</h2>
    <p>${esc(t.blurb)}${calm ? '<br><span class="pass-fine">Calm or reduced motion is on, so the scene holds still.</span>' : ''}</p>
    <div class="scene-actions center"><span class="scene-buy" data-actions></span><button class="btn small ghost" data-close aria-label="Close preview">Close</button></div>
  </div></div>`));
  const actions = node.querySelector('[data-actions]');
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    window.removeEventListener('keydown', onKey);
    host.classList.remove('previewing');
    for (const n of hidden) n.classList.remove('preview-hidden');
    if (app.previewBackdrop) app.previewBackdrop(null);
    close(node);
    if (onClose) onClose();
  };
  const paint = () => {
    actions.innerHTML = sceneActionsHtml(app.save, t);
    // after buying or choosing "Use", the scene is the background: close the preview
    wireSceneActions(app, actions, t, () => { if (ownsScene(app.save, t.id) && app.save.settings.backdrop === t.id) finish(); else paint(); });
  };
  const onKey = (e) => { if (e.key === 'Escape') finish(); };
  window.addEventListener('keydown', onKey);
  tap(node.querySelector('[data-close]'), finish, click);
  paint();
  return node;
}

// ==================================================================== CAFÉ CLUB (product id nova_pass)

/** The six café keepsakes in their fixed order, each worn by your equipped keeper (no "last chance", ever). */
function passPreview(save, n = 6) {
  return `<div class="skin-preview pass-preview" aria-hidden="true">${CLUB_KEEPSAKES.slice(0, n).map((o) => `<canvas data-ks="${esc(o.id)}"></canvas>`).join('')}</div>`;
}
function paintPassPreview(node, save) {
  const k = equippedKeeper(save).id;
  requestAnimationFrame(() => { for (const c of node.querySelectorAll('.pass-preview canvas')) paintKeeperCanvas(c, k, c.dataset.ks); });
}

const auroraThanksHtml = (save) => { const t = auroraThanks(save); return t ? `<div class="pass-fine">${esc(t)}</div>` : ''; };

// A pass the store delivered while one was running waits its turn (pass.js grantPass). Plain facts, no pressure.
const passQueuedShort = (n) => trp('club.queuedShort', n, { n });
const passQueuedLine = (n) => trp('club.queuedLine', n, { n });

/** Shop card: what you get in plain words, a plain "Days left" fact when active. No timers, no urgency copy. */
function passCard(app, rerender) {
  const save = app.save;
  const item = IAP.find((x) => x.id === PASS.id), year = PASS_YEAR_ENABLED ? IAP.find((x) => x.id === PASS_YEAR.id) : null; // year plan held back
  const st = passState(save);
  const v = passValue();
  let body, btn;
  if (st.active || st.claimable > 0) {
    body = `<div class="desc">${st.active ? trHtml(tr('club.daysLeft'), { n: bold(String(st.daysLeft)) }) : esc(tr('club.over'))}${st.claimable > 0 ? ` · ${esc(trp('club.daysReady', st.claimable, { n: st.claimable, coins: fmt(st.claimableCoins) }))}` : ` · ${esc(tr('club.todayCollected'))}`}${st.queued > 0 ? ` · ${esc(passQueuedShort(st.queued))}` : ''}</div>
      <div class="pass-fine">${esc(keepsakeLine(save))}</div>${auroraThanksHtml(save)}`;
    btn = `<button class="btn small ${st.claimable > 0 ? 'gold' : ''}" data-passopen>${esc(st.claimable > 0 ? tr('club.collect') : tr('club.view'))}</button>`;
  } else {
    body = `<div class="desc">${esc(tr('club.offer', { upfront: fmt(v.upfront), daily: fmt(v.daily) }))}</div>
      <div class="pass-fine">${esc(keepsakeLine(save))}</div>${auroraThanksHtml(save)}
      <div class="pass-fine">${esc(tr('club.noRenew'))}</div>`;
    btn = `<div class="pass-buy">${moneyBtnHtml(tr('club.30days'), item.price, `data-passbuy aria-label="${esc(tr('club.joinAria', { name: PASS_NAME, price: item.price }))}"`, true)}
      ${year ? `${moneyBtnHtml(tr('club.12months'), year.price, `data-passyear aria-label="${esc(tr('club.joinYearAria', { name: PASS_NAME, price: year.price }))}"`, true)}<span class="usd">${esc(passYearLine())}</span>` : ''}</div>`;
  }
  const r = el(`<div class="row-item pass-card"><div class="grow"><div class="name">${esc(PASS_NAME)}</div>${passPreview(save)}${body}${btn}</div></div>`);
  tap(r.querySelector('[data-passbuy]'), async () => { if (await stubPurchase(app, item)) rerender(); }, click);
  if (year) tap(r.querySelector('[data-passyear]'), async () => { if (await stubPurchase(app, year)) rerender(); }, click);
  tap(r.querySelector('[data-passopen]'), () => showPassSheet(app, rerender), click);
  paintPassPreview(r, save);
  return r;
}

/** Claim sheet: collect every ready day at once. Missed days are kept; nothing counts down. */
export function showPassSheet(app, onClose) {
  const save = app.save;
  const st = passState(save);
  const removeAds = Svc.removeAdsOwned();
  const ready = st.claimable > 0
    ? trHtml(tr('club.ready'), { b: bold(trp('club.readyDays', st.claimable, { n: st.claimable, coins: fmt(st.claimableCoins) }), 'hl') })
    : esc(st.active ? tr('club.collectedToday') : tr('club.allCollected'));
  const node = open(el(`<div class="screen modal"><div class="card pass-sheet">
    <h2>${esc(PASS_NAME)}</h2>
    ${passPreview(save)}
    <p>${st.active ? trHtml(tr('club.sheetDays', { total: PASS.days }), { n: bold(String(st.daysLeft), 'hl') }) : esc(tr('club.sheetOver'))}</p>
    <p>${ready}</p>
    <p>${esc(keepsakeLine(save))} ${esc(tr('club.findThem'))}</p>
    ${auroraThanks(save) ? `<p class="pass-fine">${esc(auroraThanks(save))}</p>` : ''}
    ${st.queued > 0 ? `<p>${passQueuedLine(st.queued)}</p>` : ''}
    ${st.claimable > 0 ? `<button class="btn gold" data-collect>${esc(tr('club.collectN', { coins: fmt(st.claimableCoins) }))}</button>` : ''}
    <p class="pass-fine">${esc(tr('club.fine'))}${removeAds ? '' : ` ${esc(tr('club.fineAds'))}`}</p>
    <button class="btn ghost" data-x>${esc(tr('common.close'))}</button>
  </div></div>`));
  paintPassPreview(node, save);
  const finish = () => { close(node); if (onClose) onClose(); };
  tap(node.querySelector('[data-collect]'), () => {
    const got = claimPass(save);
    if (got) { Svc.sfx('coin'); Svc.haptic('success'); toast(tr('club.plusCoins', { n: fmt(got) }), true); app.persist(); refreshCoins(save); }
    finish();
  }, click);
  tap(node.querySelector('[data-x]'), finish, click);
  return node;
}

// ==================================================================== DAILY ORBITS

export const ORBIT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3.2" fill="currentColor"/><ellipse cx="12" cy="12" rx="9.5" ry="4.2" transform="rotate(-24 12 12)"/><circle cx="19.6" cy="8.4" r="1.6" fill="currentColor" stroke="none"/></svg>';

/**
 * Daily Orbits: today's 3 small tasks, a coin reward each and a small bonus for all three.
 * No streak and no timer: unfinished tasks simply change tomorrow, and finished ones are
 * never lost (anything left uncollected is paid out the next day).
 */
export function showOrbits(app) {
  const save = app.save;
  const { carried } = ensureOrbits(save);
  if (carried) { app.persist(); toast(tr('orbits.carried', { coins: fmt(carried) }), true); }
  const node = open(el(`<div class="screen solid"><div class="page">
    <div class="topbar sticky" style="width:100%"><button class="icon-btn" data-back aria-label="${esc(tr('common.back'))}">${ICONS.back}</button><h1>${esc(tr('orbits.title'))}</h1>${coinPill(save)}</div>
    <p class="orbits-lead">${esc(tr('orbits.lead'))}</p>
    <div class="list" style="display:flex;flex-direction:column;gap:10px"></div>
    <div data-bonus></div>
    <p class="orbits-note">${esc(tr('orbits.note'))}</p>
  </div></div>`));
  const list = node.querySelector('.list');
  const bonus = node.querySelector('[data-bonus]');
  const render = () => {
    list.innerHTML = '';
    refreshCoins(save);
    save.orbits.list.forEach((m, i) => {
      const p = Math.min(1, m.progress / m.target);
      const where = esc(m.scope === 'best' ? (m.type === 'tier' ? tr('orbits.anyMode') : tr('orbits.singleGame')) : tr('orbits.today'));
      const r = el(`<div class="row-item orbit ${m.claimed ? 'claimed' : ''}"><div class="grow"><div class="name">${esc(orbitText(m))}</div>
        <div class="desc">${where} · ${m.type === 'tier' ? esc(m.done ? tr('orbits.made') : m.progress > 0 ? tr('orbits.bestToday', { name: tierName(m.progress) }) : tr('orbits.notYet')) : `${fmt(m.progress)}/${fmt(m.target)}`}</div>
        <div class="progress"><i style="width:${(p * 100).toFixed(0)}%"></i></div></div>
        ${m.claimed ? `<button class="btn small" disabled>${esc(tr('orbits.doneTick'))}</button>` : `<button class="btn small ${m.done ? 'gold pulse' : ''}" ${m.done ? '' : 'disabled'}><span class="coin"></span>${fmt(m.reward)}</button>`}</div>`);
      const b = r.querySelector('button');
      if (m.done && !m.claimed) tap(b, () => {
        const got = claimOrbit(save, i);
        if (got) { Svc.sfx('coin'); Svc.haptic('success'); toast(tr('club.plusCoins', { n: fmt(got) }), true); app.persist(); render(); }
      });
      list.appendChild(r);
    });
    const claimedN = save.orbits.list.filter((m) => m.claimed).length;
    const total = save.orbits.list.length;
    if (save.orbits.bonusClaimed) {
      bonus.innerHTML = `<div class="orbit-bonus done"><div class="grow"><div class="name">${esc(tr('orbits.allDone'))}</div><div class="desc">${esc(tr('orbits.seeYou'))}</div></div><button class="btn small" disabled>${esc(tr('orbits.doneTick'))}</button></div>`;
    } else {
      const ready = bonusReady(save);
      bonus.innerHTML = `<div class="orbit-bonus"><div class="grow"><div class="name">${esc(tr('orbits.bonus'))}</div><div class="desc">${esc(ready ? tr('orbits.bonusReady') : tr('orbits.bonusProgress', { n: claimedN, total }))}</div></div>
        <button class="btn small ${ready ? 'gold pulse' : ''}" ${ready ? '' : 'disabled'} data-bonusbtn><span class="coin"></span>${fmt(ORBIT_BONUS)}</button></div>`;
      if (ready) tap(bonus.querySelector('[data-bonusbtn]'), () => {
        const got = claimOrbitBonus(save);
        if (got) { Svc.sfx('coin'); Svc.haptic('success'); toast(tr('orbits.bonusToast', { n: fmt(got) }), true); app.persist(); render(); }
      });
    }
  };
  tap(node.querySelector('[data-back]'), () => { close(node); app.onMetaChanged && app.onMetaChanged(); }, click);
  render();
  return node;
}

// ==================================================================== OBSERVATORY
// Light area meta (src/meta/observatory.js): each Journey chapter lights one real constellation from the
// stars already earned there. Nothing to buy, no new currency, no timers.

const OBSERVATORY_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 18l5-7 5 3 6-9" stroke-opacity=".55"/><circle cx="4" cy="18" r="2" fill="currentColor"/><circle cx="9" cy="11" r="2" fill="currentColor"/><circle cx="14" cy="14" r="2" fill="currentColor"/><circle cx="20" cy="5" r="2.4" fill="currentColor"/></svg>';

function observatoryCard(v) {
  const c = v.c;
  const title = v.complete ? `${esc(c.name)} <small>${esc(c.nick)}</small>` : esc(v.reached ? tr('obs.forming') : tr('obs.notReached'));
  return `<div class="row-item obs-card${v.complete ? ' done' : ''}${v.reached ? '' : ' locked'}" data-ch="${v.index}">
    <canvas class="obs-sky" width="112" height="112" aria-hidden="true"></canvas>
    <div class="grow">
      <div class="obs-ch">${esc(deckLevelsLabel(v))}</div>
      <div class="name">${title}</div>
      <div class="desc">${esc(progressLine(v))}</div>
      ${v.reached && !v.complete ? `<div class="progress"><i style="width:${Math.round((Math.min(v.stars, STARS_TO_FINISH) / STARS_TO_FINISH) * 100)}%"></i></div>` : ''}
      ${v.complete ? `<div class="obs-fact">${esc(c.fact)}</div><button class="linkish obs-share" data-postcard="${v.index}">${esc(tr('obs.sharePostcard'))}</button>` : ''}
    </div>
  </div>`;
}

/** "Levels 11–20": the Deck names its 10-level groups by their levels only, because "Chapter" means a 20-level
 * stretch of the Coast Path (docs/UX_STARS.md §7). Unity: ScreensObservatory. */
function deckLevelsLabel(v) {
  return tr('obs.levels', { first: fmt(v.levels.first), last: fmt(v.levels.last) });
}

/** The Observatory sheet: one card per 10 levels, the shape filling in as finishes are earned. */
export function showObservatory(app) {
  const save = app.save;
  const views = observatoryState(save);
  const done = views.filter((v) => v.complete).length;
  const node = open(el(`<div class="screen solid"><div class="page">
    <div class="topbar sticky" style="width:100%"><button class="icon-btn" data-back aria-label="${esc(tr('common.back'))}">${ICONS.back}</button><h1>${esc(tr('obs.title'))}</h1>${coinPill(save)}</div>
    <div class="obs-pane" data-pane="sky">
    <p class="orbits-lead">${esc(tr('obs.lead'))}</p>
    <p class="orbits-note">${esc(pageLook() === 'cosmic' ? tr('obs.countCosmic', { done, total: views.length, need: STARS_TO_FINISH }) : tr('obs.count', { done, total: views.length, need: STARS_TO_FINISH }))}</p>
    <div class="list obs-list">${views.map(observatoryCard).join('')}</div>
    <p class="orbits-note">${esc(pageLook() === 'cosmic' ? tr('obs.footCosmic') : tr('obs.foot'))}</p>
    </div>
  </div></div>`));
  requestAnimationFrame(() => {
    for (const v of views) {
      const cv = node.querySelector(`[data-ch="${v.index}"] canvas`);
      paintConstellation(cv, v.c, { lit: v.lit, complete: v.complete, locked: !v.reached });
    }
  });
  node.querySelectorAll('[data-postcard]').forEach((b) => tap(b, () => {
    const pm = constellationPostcard(chapterView(save, Number(b.dataset.postcard)));
    if (pm) showPostcard(app, pm, postcardCaption(pm));
  }, click));
  tap(node.querySelector('[data-back]'), () => { close(node); app.onMetaChanged && app.onMetaChanged(); }, click);
  return node;
}

/** Small celebration when a Journey win finishes a constellation. Shown alone on the menu (main.js queues it). */
export function showConstellationDone(app, ch, onClose) {
  const v = chapterView(app.save, ch);
  const c = v.c;
  // docs/UX_RETENTION.md item 3: a light café-look variant ("Chapter 1 finished"); the Cosmic look keeps the navy card
  const cafeLook = pageLook() !== 'cosmic';
  const head = cafeLook
    ? `<span class="obs-kicker">${esc(c.name)}</span>
    <canvas class="obs-big" width="200" height="200" aria-hidden="true"></canvas>
    <h2>${esc(tr('obs.chapterDone', { n: fmt(ch + 1) }))}</h2>
    <p class="sub">${esc(deckLevelsLabel(v))} · ${esc(trp('obs.blossoms', v.stars, { n: fmt(v.stars) }))}</p>`
    : `<span class="obs-kicker">${esc(tr('obs.complete'))}</span>
    <canvas class="obs-big" width="200" height="200" aria-hidden="true"></canvas>
    <h2>${esc(c.name)}</h2>
    <p class="sub">${esc(c.nick)} · ${esc(deckLevelsLabel(v))}</p>`;
  const node = open(el(`<div class="screen modal"><div class="card obs-done${cafeLook ? ' cafe-look' : ''}">
    ${head}
    <p class="obs-fact">${esc(c.fact)}</p>
    <button class="btn primary" data-ok>${esc(tr('obs.lovely'))}</button>
    <div class="link-row"><button class="linkish" data-see>${esc(tr('obs.open'))}</button><button class="linkish" data-postcard>${esc(tr('obs.sharePostcard'))}</button></div>
  </div></div>`));
  tap(node.querySelector('[data-postcard]'), () => { const pm = constellationPostcard(v); if (pm) showPostcard(app, pm, postcardCaption(pm)); }, click);
  Svc.sfx('discover');
  Svc.haptic('success');
  const reduced = document.body.classList.contains('calm') || deviceReducedMotion();
  requestAnimationFrame(() => animateConstellation(node.querySelector('canvas'), c, { lit: v.total, complete: true }, reduced));
  let finished = false;
  const finish = (see) => {
    if (finished) return;
    finished = true;
    close(node);
    if (onClose) onClose();
    if (see) showObservatory(app);
  };
  tap(node.querySelector('[data-ok]'), () => finish(false), click);
  tap(node.querySelector('[data-see]'), () => finish(true), click);
  return node;
}

// ==================================================================== DAILY GIFT

/**
 * Daily gift (docs/UX_OPPORTUNITIES.md item 2): the free claim is the big first button, so it is above the fold even at
 * text size 1.5; doubling it with a short video is a smaller quiet option under it. Below the days, the month calendar
 * (docs/UX_STARS.md table E: candles on a warm café panel, the star sky under Cosmic) counts the evenings played this
 * month (skyCalendar.js; it never "breaks"). One name: "Daily gift".
 */
export function showDailyReward(app, opts = {}) {
  const save = app.save;
  const st = dailyRewardState(save);
  const mode = opts.mode === 'beforeYouGo' || opts.mode === 'return' ? opts.mode : 'full';
  const sky = mode === 'full' ? skyMonth(save) : null;
  // docs/UX_RETENTION.md items 1, 2 and 5: "Before you go" ends evening 1 on today's gift and names tomorrow's real one;
  // a return day opens with "Good evening" (the welcome-back lines merged in); the row says honestly why it stepped back.
  const title = mode === 'beforeYouGo' ? 'Before you go' : mode === 'return' ? (opts.greeting || tr('gift.goodEvening')) : tr('today.gift');
  const why = giftOutcomeLine(st);
  const wb = mode === 'return' && opts.welcome ? opts.welcome : null;
  const wbHtml = wb ? `<p class="wb-line">${esc([wb.title, ...(wb.lines || [])].filter(Boolean).join(' '))}</p>${wb.gift ? `<p class="wb-gift"><span class="coin"></span>${esc(wb.gift)}</p>` : ''}` : '';
  const lead = !st.available ? esc(collectedLine(save))
    : mode === 'return' ? trHtml(tr('gift.leadReturn', { day: st.day }), { coins: bold(tr('buy.nCoins', { n: fmt(st.amount) }), 'hl') })
    : trHtml(tr('gift.leadToday'), { coins: bold(tr('buy.nCoins', { n: fmt(st.amount) }), 'hl') });
  const daysHtml = (claimedTo, today, ring) => DAILY_REWARDS.map((a, i) => {
    const d = i + 1;
    const cls = d <= claimedTo ? 'claimed' : d === today ? 'today' : '';
    return `<div class="day ${cls} ${d === 7 ? 'big' : ''}${ring === d ? ' next' : ''}"><span>${esc(tr('gift.day', { n: d }))}</span><span class="amt"><span class="coin"></span>${a}</span></div>`;
  }).join('');
  const node = open(el(`<div class="screen modal"><div class="card daily-gift${mode === 'full' ? '' : mode === 'beforeYouGo' ? ' gift-byg' : ' gift-return'}">
    <h2>${esc(title)}</h2>
    ${wbHtml}
    <p class="gift-lead">${lead}</p>
    ${why ? `<p class="gift-why">${esc(why)}</p>` : ''}
    ${st.available ? `<button class="btn gold" data-claim>${esc(tr('gift.claim', { coins: fmt(st.amount) }))}</button>${mode === 'beforeYouGo' ? '' /* a calm stop: no ad offer on the way out */ : `
    <button class="btn ghost gift-x2" data-x2>${esc(tr('gift.double'))} <span class="ad-tag">${esc(tr('common.adTag'))}</span></button>`}` : ''}
    <div class="days">${daysHtml(st.available ? st.day - 1 : st.day, st.available ? st.day : 0, 0)}</div>
    ${sky ? `<div class="sky-wrap"><div class="sky-head"><span>${esc(tr('gift.skyHead', { name: sky.name.toUpperCase() }))}</span><b>${esc(nightsLine(sky.count))}</b></div>${skySvg(sky)}
      <div class="sky-note">${esc(tr('gift.skyNote'))}</div></div>` : ''}
    <button class="btn ghost" data-x>${esc(st.available ? tr('gift.later') : tr('common.close'))}</button>
  </div></div>`));
  if (mode !== 'full') Svc.hideBanner(); // a calm card on its own (Home shows the banner again when it closes)
  let closed = false;
  const finish = () => {
    if (closed) return;
    closed = true;
    close(node);
    if (opts.onClose) opts.onClose();
    else if (app.onMetaChanged) app.onMetaChanged();
  };
  const done = (amt) => {
    Svc.sfx('coin'); Svc.haptic('success');
    toast(tr('club.plusCoins', { n: amt }), true);
    app.persist();
    if (mode !== 'beforeYouGo') { finish(); return; }
    // evening 1: the card stays open on tomorrow's tile (ringed) and line, then Goodnight
    const t = tomorrowGift(save);
    const card = node.querySelector('.card');
    card.querySelector('.days').innerHTML = daysHtml(st.day, 0, t.day > st.day ? t.day : 0);
    for (const b of card.querySelectorAll('[data-claim], [data-x2], .gift-why')) b.remove();
    card.querySelector('.gift-lead').innerHTML = trHtml(tr('gift.collected'), { coins: bold(tr('buy.nCoins', { n: fmt(amt) }), 'hl') });
    card.querySelector('.days').after(el(`<p class="gift-tomorrow">${esc(tomorrowLine(save))}</p>`));
    const x = card.querySelector('[data-x]');
    x.textContent = tr('goodnight.title');
    x.classList.remove('ghost'); x.classList.add('primary');
  };
  tap(node.querySelector('[data-claim]'), () => done(claimDailyReward(save, 1)), click);
  tap(node.querySelector('[data-x2]'), async (e) => {
    const btn = e.currentTarget; btn.disabled = true;
    const ok = await Svc.showRewarded('daily_x2');
    if (ok) done(claimDailyReward(save, 2));
    else { btn.disabled = false; toast(tr('result.adUnavailable')); }
  }, click);
  // the full card just closes; the paced cards hand back to Home (which refreshes the coins)
  tap(node.querySelector('[data-x]'), () => { if (mode === 'full') close(node); else finish(); }, click);
  return node;
}

// ==================================================================== PAUSE

export function showPause(app, { onResume, onQuit, journey, zen = false, book = false, onSkip = null }) {
  const s = app.save.settings;
  const node = open(el(`<div class="screen modal"><div class="card">
    <h2>${esc(tr('pause.title'))}</h2>
    <button class="btn primary" data-resume>${ICONS.play.replace('<svg', '<svg width="22" height="22"')} ${esc(tr('pause.resume'))}</button>
    <div class="settings-row">
      <button class="toggle ${s.sound ? '' : 'off'}" data-set="sound">${s.sound ? ICONS.sound : ICONS.soundOff}<span>${esc(tr('settings.sound.name'))}</span></button>
      <button class="toggle ${s.music !== false ? '' : 'off'}" data-set="music">${ICONS.music}<span>${esc(tr('pause.music'))}</span></button>
      ${tracksButton(app)}
      <button class="toggle ${s.haptics ? '' : 'off'}" data-set="haptics">${ICONS.haptics}<span>${esc(tr('settings.haptics.name'))}</span></button>
      ${backdropButton()}
      ${comfortButton()}
    </div>
    <div class="settings-row">
      <button class="toggle wide ${s.autoplay ? '' : 'off'}" data-set="autoplay">${ICONS.auto}<span>${esc(tr('extras.autoplay.name'))}</span><span class="tag">${esc(s.autoplay ? tr('pause.tagOn') : tr('pause.tagOff'))}</span></button>
    </div>
    <div data-testopts></div>
    <p style="font-size:calc(15px * var(--ts));margin-top:14px">${esc(tr('pause.howto'))} ${esc(book ? tr('pause.howto.book') : journey ? tr('pause.howto.journey') : zen ? tr('pause.howto.zen') : tr('pause.howto.endless'))}</p>
    <button class="btn ghost" data-quit>${esc(book ? tr('pause.quit.book') : journey ? tr('pause.quit.journey') : tr('pause.quit.endless'))}</button>
    ${testerSkipHtml(onSkip)}
  </div></div>`));
  tap(node.querySelector('[data-resume]'), () => { close(node); onResume(); }, click);
  tap(node.querySelector('[data-quit]'), () => { close(node); onQuit(); }, click);
  tap(node.querySelector('[data-tester-skip]'), () => { close(node); onSkip(); }, click);
  for (const b of node.querySelectorAll('[data-set]')) {
    tap(b, () => {
      const k = b.dataset.set;
      app.setSetting(k, !app.save.settings[k]);
      const on = app.save.settings[k];
      b.classList.toggle('off', !on);
      if (k === 'sound') b.innerHTML = `${on ? ICONS.sound : ICONS.soundOff}<span>${esc(tr('settings.sound.name'))}</span>`;
      if (k === 'sound' || k === 'music') { const tb = node.querySelector('[data-tracks]'); if (tb) tb.classList.toggle('off', !musicAudible(app)); }
      if (k === 'autoplay') { b.querySelector('.tag').textContent = on ? tr('pause.tagOn') : tr('pause.tagOff'); renderTestOptions(app, node.querySelector('[data-testopts]')); }
    }, click);
  }
  renderTestOptions(app, node.querySelector('[data-testopts]'));
  tap(node.querySelector('[data-backdrop]'), () => showBackdrops(app), click);
  tap(node.querySelector('[data-comfort]'), () => showComfort(app), click);
  tap(node.querySelector('[data-tracks]'), () => showMusicTracks(app, () => {
    const tb = node.querySelector('[data-tracks]'); if (tb) tb.classList.toggle('off', !musicAudible(app));
    for (const b of node.querySelectorAll('[data-set="sound"],[data-set="music"]')) {
      const on = b.dataset.set === 'sound' ? !!app.save.settings.sound : app.save.settings.music !== false;
      b.classList.toggle('off', !on);
      if (b.dataset.set === 'sound') b.innerHTML = `${on ? ICONS.sound : ICONS.soundOff}<span>${esc(tr('settings.sound.name'))}</span>`;
    }
  }), click);
  return node;
}

/** Tester tools only (main.js passes onSkip only while ?tester=1 is stored on this device): a quiet secondary row. */
function testerSkipHtml(onSkip) {
  return typeof onSkip === 'function' ? `<div class="quiet-row"><button class="linkish" data-tester-skip>${esc(tr('tester.skip'))}</button></div>` : '';
}

/** Autoplay test options (only while Autoplay is ON). They affect autoplay runs only, which are never saved. */
function renderTestOptions(app, host) {
  if (!host) return;
  host.innerHTML = '';
  if (!app.save.settings.autoplay) return;
  const t = testOptions(app.save.settings);
  const seg = (key, opts) => `<div class="topt-row"><span class="topt-label">${esc(opts.label)}</span><div class="topt-seg">${
    opts.items.map(([v, txt]) => `<button class="topt-btn ${t[key] === v ? 'on' : ''}" data-tk="${key}" data-tv="${esc(JSON.stringify(v))}">${esc(txt)}</button>`).join('')}</div></div>`;
  const box = el(`<div class="test-opts"><div class="topt-title">Test options · autoplay runs only</div>
    ${seg('perks', { label: 'Perks', items: [['normal', 'Normal'], ['all', 'All'], ['setups', 'Constellation setups']] })}
    ${seg('fastSectors', { label: 'Fast sectors', items: [[false, 'Off'], [true, 'On']] })}
    ${seg('speed', { label: 'Speed', items: [[1, '1×'], [2, '2×'], [4, '4×']] })}
    ${seg('showcase', { label: 'Showcase', items: [[false, 'Off'], [true, 'On']] })}
  </div>`);
  for (const b of box.querySelectorAll('[data-tk]')) {
    tap(b, () => {
      const next = { ...testOptions(app.save.settings), [b.dataset.tk]: JSON.parse(b.dataset.tv) };
      app.setSetting('test', next);
      renderTestOptions(app, host);
    }, click);
  }
  host.appendChild(box);
}

// ==================================================================== SETTINGS SHEET (menu "Settings")
// One sheet with big tabs for everything that isn't play or a daily item: sound and music, Comfort,
// Style (backgrounds), Skill Journal and Extras (Star Keepers, Remove Ads, test options, version).
// Escape / the phone's Back closes it; the last tab is remembered on this device.

export const GEAR_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v2.6M12 18.9v2.6M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M2.5 12h2.6M18.9 12h2.6M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8"/><circle cx="12" cy="12" r="6.6"/></svg>';
const STYLE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-1 1.6-2.1-.5-1.3.4-2.4 1.7-2.4H18a3 3 0 0 0 3-3c0-5-4-8.5-9-8.5z"/><circle cx="7.5" cy="11" r="1.3" fill="currentColor"/><circle cx="10.5" cy="7" r="1.3" fill="currentColor"/><circle cx="15.5" cy="7.5" r="1.3" fill="currentColor"/></svg>';
export const EXTRAS_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="5" cy="12" r="1.8" fill="currentColor"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/><circle cx="19" cy="12" r="1.8" fill="currentColor"/></svg>';
const MORE_TAB_KEY = 'novadrop.settingsTab';
export const MORE_TABS = [
  { id: 'sound', label: () => tr('settings.tab.sound'), icon: () => ICONS.music },
  { id: 'comfort', label: () => tr('settings.tab.comfort'), icon: () => COMFORT_ICON },
  { id: 'style', label: () => tr('settings.tab.style'), icon: () => STYLE_ICON },
  { id: 'extras', label: () => tr('settings.tab.extras'), icon: () => EXTRAS_ICON },
];
const moreTabOk = (t) => MORE_TABS.some((x) => x.id === t);
function lastMoreTab() {
  try { const t = localStorage.getItem(MORE_TAB_KEY); return moreTabOk(t) ? t : 'sound'; } catch (_) { return 'sound'; }
}
function rememberMoreTab(t) {
  try { localStorage.setItem(MORE_TAB_KEY, t); } catch (_) { /* private mode: just don't remember */ }
}

/** Settings sheet (opened from the menu). `tab` overrides the remembered tab. */
export function showMore(app, tab = null) {
  const save = app.save;
  let cur = moreTabOk(tab) ? tab : lastMoreTab();
  let dirty = false; // something the menu shows changed (text size, Remove Ads): re-render it on close
  const node = open(el(`<div class="screen modal more-screen"><div class="card more-sheet" role="dialog" aria-modal="true" aria-labelledby="more-title">
    <div class="more-head"><h2 id="more-title">${esc(tr('settings.title'))}</h2><button class="icon-btn more-close" data-close aria-label="${esc(tr('settings.close'))}">${ICONS.close}</button></div>
    <div class="more-tabs" role="tablist" aria-label="${esc(tr('settings.sections'))}">${MORE_TABS.map((t) => `<button class="more-tab" role="tab" id="mtab-${t.id}" data-mtab="${t.id}" aria-controls="more-body">${t.icon()}<span>${esc(t.label())}</span></button>`).join('')}</div>
    <div class="more-body" id="more-body" role="tabpanel" data-body></div>
    <button class="btn primary more-done" data-done>${esc(tr('common.done'))}</button>
  </div></div>`));
  const body = node.querySelector('[data-body]');
  const tabsEl = node.querySelector('.more-tabs');
  const fitTabs = () => tabsEl.classList.toggle('wrap', (save.settings.textSize || 1) > 1);

  // ---- closing: Done, the X, Escape, or the browser / phone Back button
  let closed = false, pushed = false;
  const liveScreens = () => Array.from(root().children).filter((n) => !n.classList.contains('leaving'));
  const isTop = () => { const l = liveScreens(); return l[l.length - 1] === node; };
  /** Back or Escape while a sheet opened from here is on top: close that one first (its own Done/Back). */
  const closeTopChild = () => {
    const l = liveScreens();
    const top = l[l.length - 1];
    const b = top && top.querySelector('[data-done],[data-back],[data-cancel],[data-x]');
    if (b) b.click();
  };
  const onKey = (e) => {
    if (e.key !== 'Escape' || !node.isConnected) return;
    e.preventDefault();
    if (isTop()) finish(); else closeTopChild();
  };
  const onPop = () => {
    if (!node.isConnected) return;
    pushed = false;
    if (isTop()) { finish(); return; }
    closeTopChild();
    try { history.pushState({ novaSheet: 'settings' }, ''); pushed = true; } catch (_) { /* ignore */ }
  };
  function finish() {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('popstate', onPop);
    if (pushed) { pushed = false; try { history.back(); } catch (_) { /* ignore */ } }
    if (dirty && node.isConnected) showMenu(app); else close(node);
  }
  document.addEventListener('keydown', onKey);
  window.addEventListener('popstate', onPop);
  try { history.pushState({ novaSheet: 'settings' }, ''); pushed = true; } catch (_) { pushed = false; }

  const row = (name, sub, right) => `<div class="c-row"><div class="c-text"><div class="c-name">${name}</div>${sub ? `<div class="c-sub">${sub}</div>` : ''}</div>${right}</div>`;
  const sw = (key, on, label) => `<button class="toggle c-switch ${on ? '' : 'off'}" data-set="${key}" role="switch" aria-checked="${on}" aria-label="${esc(label)}">${switchInner(on)}</button>`;
  const go = (label, attr) => `<button class="toggle c-go" ${attr}><span>${label}</span></button>`;

  const panes = {
    sound() {
      const s = save.settings;
      // UX_OPPORTUNITIES 11: one control per idea. The old Music switch is the "Off" choice of Background sound.
      body.innerHTML = `<div class="comfort-card">
        ${row(esc(tr('settings.sound.name')), esc(tr('settings.sound.sub')), sw('sound', !!s.sound, tr('settings.sound.name')))}
        ${soundBackdropRow(s, save)}
        ${row(esc(tr('settings.tracks.name')), esc(s.music !== false && normSoundBackdrop(s.soundBackdrop) === 'music' ? tr('settings.tracks.subOn') : tr('settings.tracks.subOff')), go(esc(tr('common.choose')), 'data-tracks'))}
        ${row(esc(tr('settings.haptics.name')), esc(tr('settings.haptics.sub')), sw('haptics', !!s.haptics, tr('settings.haptics.name')))}
      </div>`;
      for (const b of body.querySelectorAll('[data-set]')) {
        tap(b, () => { app.setSetting(b.dataset.set, !save.settings[b.dataset.set]); render(); }, click);
      }
      tap(body.querySelector('[data-tracks]'), () => showMusicTracks(app, () => render()), click);
      for (const b of body.querySelectorAll('[data-sb]')) {
        tap(b, () => {
          const id = b.dataset.sb;
          if (soundPreview) { const P = soundPreview; soundPreview = null; P.cancel(); }
          if (!canUseBackdrop(id, save)) {
            // a collection for sale and not owned (SOUND_COLLECTIONS_FOR_SALE): a 20 s free preview, then the saved sound
            // comes back. Nothing is saved or bought here, and nothing pops up.
            soundPreview = startSoundPreview({
              id,
              play: () => { Svc.setSoundBackdrop(id); Svc.previewSoundBackdrop(id, SOUND_PREVIEW_SECONDS); },
              restore: () => { if (soundPreview && soundPreview.id === id) soundPreview = null; Svc.setSoundBackdrop(playableBackdrop(save.settings.soundBackdrop, save)); },
            });
            render();
            return;
          }
          if (id === 'off') { app.setSetting('music', false); render(); return; }
          if (save.settings.music === false) app.setSetting('music', true);
          app.setSetting('soundBackdrop', id);
          Svc.previewSoundBackdrop(id);
          render();
        }, click);
      }
    },
    comfort() {
      body.innerHTML = `<div class="comfort-card"><p class="more-lead">${esc(tr('settings.comfort.lead'))}</p>${languageRow()}<div data-list></div></div>`;
      wireLanguageRow(body, () => { dirty = true; render(); });
      renderComfort(app, body.querySelector('[data-list]'), () => { dirty = true; fitTabs(); });
    },
    style() {
      body.innerHTML = `<button class="wd-link" data-to-wardrobe>${WARDROBE_ICON}<span><b>${esc(tr('style.wardrobe.name'))}</b><small>${esc(tr('style.wardrobe.sub'))}</small></span><i>›</i></button>
        <div class="tracks-card"><h3 class="more-h3">${esc(tr('style.background.title'))}</h3><p class="more-lead">${esc(uiLook(save) === 'cosmic' ? tr('style.background.leadCosmic') : tr('style.background.lead'))}</p><div class="track-list" data-list></div></div>`;
      tap(body.querySelector('[data-to-wardrobe]'), () => showWardrobe(app, 'pieces', () => render()), click);
      renderBackdrops(app, body.querySelector('[data-list]'));
    },
    extras() {
      const k = equippedKeeper(save);
      const removeAds = Svc.removeAdsOwned();
      body.innerHTML = `<div class="comfort-card">
        <h3 class="more-h3">${esc(word('companions', uiLook(save)))}</h3>
        ${row(esc(tr('extras.keepers.name', { name: k.name })), esc(tr('extras.keepers.sub')), go(esc(tr('extras.open')), 'data-kp="keepers"'))}
        ${row(esc(tr('extras.story.name')), esc(tr('extras.story.sub')), go(esc(tr('extras.open')), 'data-kp="story"'))}
        <h3 class="more-h3">${esc(tr('extras.progress'))}</h3>
        ${row(esc(tr('extras.transfer.name')), esc(tr('extras.transfer.sub')), go(esc(tr('extras.open')), 'data-transfer'))}
        ${app.canUndoTransfer && app.canUndoTransfer() ? row(esc(tr('extras.undo.name')), esc(tr('extras.undo.sub')), go(esc(tr('extras.undo.go')), 'data-untransfer')) : ''}
        <h3 class="more-h3">${esc(tr('extras.ads'))}</h3>
        ${row(esc(tr('extras.adsInfo.name')), esc(tr('extras.adsInfo.sub')), go(esc(tr('extras.read')), 'data-adsinfo'))}
        ${removeAds ? row(esc(tr('extras.removeAds.name')), esc(tr('extras.removeAds.owned')), '') : row(esc(tr('extras.removeAds.name')), esc(tr('extras.removeAds.sub')), go(esc(tr('extras.see')), 'data-noads'))}
        ${row(esc(tr('extras.privacy.name')), esc(tr('extras.privacy.sub')), go(esc(tr('extras.read')), 'data-privacy'))}
        ${row(esc(tr('extras.reportAd.name')), esc(tr('extras.reportAd.sub')), go(esc(tr('extras.email')), 'data-reportad'))}
        <h3 class="more-h3">${esc(tr('extras.tellUs'))}</h3>
        ${row(esc(tr('extras.rate.name')), esc(tr('extras.rate.sub')), go(esc(tr('extras.rate.go')), 'data-rate'))}
        ${row(esc(tr('extras.feedback.name')), esc(tr('extras.feedback.sub')), go(esc(tr('extras.email')), 'data-feedback'))}
        ${statsModeNow === 'local' ? '' : `<h3 class="more-h3">${esc(tr('extras.stats'))}</h3>
        ${row(esc(tr('extras.stats.name')), esc(tr('extras.stats.sub')), sw('levelstats', statsModeNow === 'on', tr('extras.stats.label')))}
        ${statsModeNow === 'on' ? row(esc(tr('extras.statsId.name')), esc(tr('extras.statsId.sub')), go(esc(tr('extras.statsId.go')), 'data-statsid')) : ''}`}
        <h3 class="more-h3">${esc(tr('extras.about'))}</h3>
        ${row(esc(tr('extras.tips.name')), esc(tr('extras.tips.sub')), go(esc(tr('extras.open')), 'data-tips'))}
        <h3 class="more-h3">${esc(tr('extras.testing'))}</h3>
        ${row(esc(tr('extras.autoplay.name')), esc(tr('extras.autoplay.sub')), sw('autoplay', !!save.settings.autoplay, tr('extras.autoplay.label')))}
        <div data-testopts></div>
        ${app.tester && app.tester() ? row(esc(tr('tester.settings.name')), esc(tr('tester.settings.sub')), go(esc(tr('tester.settings.off')), 'data-tester-off')) : ''}
        <p class="more-build">${esc(tr('extras.build', { build: BUILD }))}</p>
      </div>`;
      for (const b of body.querySelectorAll('[data-kp]')) tap(b, () => showKeepers(app, b.dataset.kp, () => render()), click);
      tap(body.querySelector('[data-adsinfo]'), () => showAdsInfo(), click);
      // the only tip entry point, in the "About Nova's Café" group (extras.about; tests/tips.test.mjs)
      tap(body.querySelector('[data-tips]'), () => showAboutTips(app, () => render()), click);
      tap(body.querySelector('[data-transfer]'), () => showTransfer(app), click);
      tap(body.querySelector('[data-untransfer]'), async () => {
        const ok = await confirmBox({
          title: tr('extras.undo.confirmTitle'),
          text: tr('extras.undo.confirmText'),
          ok: tr('extras.undo.name'), cancel: tr('extras.undo.keep'),
        });
        if (!ok || !app.canUndoTransfer()) return;
        app.undoTransfer();
        toast(tr('extras.undo.done'), true, 3000);
      }, click);
      // Apple 5.1.1(i) privacy link and 2.5.18 report-an-ad path (placeholders until the store accounts exist)
      tap(body.querySelector('[data-privacy]'), () => {
        if (!openLink(APP_LINKS.privacyPolicyUrl)) toast(tr('extras.privacy.notSet'));
      }, click);
      tap(body.querySelector('[data-reportad]'), () => {
        if (isPlaceholderLink(APP_LINKS.contactEmail)) toast(tr('extras.reportAd.notSet'));
        else if (!openLink(reportAdMailto(BUILD))) toast(tr('extras.reportAd.noEmail'));
      }, click);
      // two separate, always-available rows: never a "Do you like the game?" gate in front of the store
      tap(body.querySelector('[data-rate]'), () => toast(tr('extras.rate.notSet'), false, 3000), click);
      tap(body.querySelector('[data-feedback]'), () => {
        if (isPlaceholderLink(APP_LINKS.contactEmail) || !openLink(feedbackMailto(BUILD))) toast(tr('extras.feedback.noEmail', { email: APP_LINKS.contactEmail }), false, 3600);
      }, click);
      tap(body.querySelector('[data-noads]'), async () => {
        if (await stubPurchase(app, IAP.find((x) => x.id === 'remove_ads'))) { dirty = true; render(); }
      }, click);
      const ls = body.querySelector('[data-set="levelstats"]');
      if (ls) tap(ls, () => { app.setStatsSharing(statsModeNow !== 'on'); render(); }, click);
      const sid = body.querySelector('[data-statsid]');
      if (sid) tap(sid, () => { app.resetStatsId(); toast(tr('extras.statsId.done')); }, click);
      tap(body.querySelector('[data-set="autoplay"]'), () => { app.setSetting('autoplay', !save.settings.autoplay); render(); }, click);
      renderTestOptions(app, body.querySelector('[data-testopts]'));
      tap(body.querySelector('[data-tester-off]'), () => { app.clearTester(); render(); }, click);
    },
  };
  function render() {
    if (closed || !node.isConnected) return;
    fitTabs();
    for (const b of tabsEl.querySelectorAll('[data-mtab]')) {
      const on = b.dataset.mtab === cur;
      b.classList.toggle('on', on);
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
    }
    body.setAttribute('aria-labelledby', `mtab-${cur}`);
    const keep = body.dataset.tab === cur ? body.scrollTop : 0;
    body.dataset.tab = cur;
    panes[cur]();
    body.scrollTop = keep;
  }
  for (const b of tabsEl.querySelectorAll('[data-mtab]')) {
    tap(b, () => { cur = b.dataset.mtab; rememberMoreTab(cur); render(); }, click);
  }
  // arrow keys move between tabs (standard tablist behaviour)
  tabsEl.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = MORE_TABS.findIndex((t) => t.id === cur);
    cur = MORE_TABS[(i + (e.key === 'ArrowRight' ? 1 : MORE_TABS.length - 1)) % MORE_TABS.length].id;
    rememberMoreTab(cur);
    render();
    tabsEl.querySelector(`[data-mtab="${cur}"]`).focus();
    e.preventDefault();
  });
  tap(node.querySelector('[data-close]'), finish, click);
  tap(node.querySelector('[data-done]'), finish, click);
  render();
  return node;
}

// ==================================================================== HOW ADS WORK HERE (v0.6.0)

/**
 * "How ads work here": plain rules for every ad, written from AdDirector's real caps (meta/adsInfo.js).
 * Opened from Settings > Extras and from the ad-break line on result screens. Done / X close it.
 */
export function showAdsInfo(onClose) {
  const p = adsInfo({ removeAds: Svc.removeAdsOwned(), regular: Svc.adsRegular(), club: Svc.adsClubActive(), stats: statsModeNow });
  const node = open(el(`<div class="screen modal ads-info-screen"><div class="card ads-info" role="dialog" aria-modal="true" aria-labelledby="ads-info-title">
    <div class="more-head"><h2 id="ads-info-title">${esc(p.title)}</h2><button class="icon-btn more-close" data-x aria-label="${esc(tr('common.close'))}">${ICONS.close}</button></div>
    <p class="ads-intro">${esc(p.intro)}</p>
    ${p.sections.map((sec) => `<section class="ads-sec ads-${sec.id}"><h3 class="more-h3">${esc(sec.title)}</h3>${sec.lead ? `<p class="ads-lead">${esc(sec.lead)}</p>` : ''}<ul class="ads-list">${sec.items.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></section>`).join('')}
    <button class="btn primary" data-done>${esc(tr('common.done'))}</button>
  </div></div>`));
  let closed = false;
  const finish = () => { if (closed) return; closed = true; close(node); if (typeof onClose === 'function') onClose(); };
  tap(node.querySelector('[data-done]'), finish, click);
  tap(node.querySelector('[data-x]'), finish, click);
  return node;
}

// ==================================================================== TRANSFER PROGRESS

/**
 * Settings > Extras > Transfer progress: a free, offline stand-in for cloud save (src/meta/transfer.js).
 * "Copy my code" puts a code on the clipboard and shows it (selectable); pasting a code checks it and asks before
 * anything changes. A bad code only shows a plain message. Remove Ads, purchases, ad caps and the reminder stay
 * this device's (keepLocal). The Unity app has the same sheet (Scripts/UI/ScreensTransfer.cs) and reads the same codes.
 */
export function showTransfer(app) {
  const save = app.save;
  const node = open(el(`<div class="screen modal transfer-screen"><div class="card transfer-card" role="dialog" aria-modal="true" aria-labelledby="transfer-title">
    <div class="more-head"><h2 id="transfer-title">Transfer progress</h2><button class="icon-btn more-close" data-x aria-label="Close">${ICONS.close}</button></div>
    <p class="tr-lead">Move your progress to another phone or to the app. No account needed.</p>
    <h3 class="more-h3">Send from this device</h3>
    <p class="tr-help" data-outhelp>Tap "Copy my code". Then paste it into a message or note to yourself.</p>
    <textarea class="tr-code" data-out readonly rows="3" aria-label="Your transfer code" hidden></textarea>
    <button class="btn primary" data-copy>Copy my code</button>
    <h3 class="more-h3">Get progress from another device</h3>
    <p class="tr-help">Copy the code on your other device. Paste it in the box below, then tap "Check code". You'll see what it holds before anything changes.</p>
    <textarea class="tr-code" data-in rows="3" placeholder="Paste your code here" aria-label="Paste a transfer code" autocapitalize="off" autocomplete="off" autocorrect="off" spellcheck="false"></textarea>
    <p class="tr-error" data-err role="alert" hidden></p>
    <button class="btn" data-check>Check code</button>
    <p class="tr-note">Remove Ads and other purchases do not move with a code. In the phone app, use &quot;Restore purchases&quot; in the Shop.</p>
  </div></div>`));
  let closed = false;
  const finish = () => { if (closed) return; closed = true; close(node); };
  const out = node.querySelector('[data-out]');
  const outHelp = node.querySelector('[data-outhelp]');
  const input = node.querySelector('[data-in]');
  const err = node.querySelector('[data-err]');
  const showErr = (text) => { err.textContent = text; err.hidden = !text; };

  tap(node.querySelector('[data-copy]'), async () => {
    let code;
    try { code = exportCode(save); } catch (e) { console.warn('[nova] transfer export failed', e); toast("Couldn't make a code right now. Please try again."); return; }
    out.value = code;
    out.hidden = false;
    let copied = false;
    try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(code); copied = true; } } catch (_) { /* shown below */ }
    if (!copied) {
      // older browsers: select the code so the system Copy works
      try { out.focus(); out.select(); copied = document.execCommand && document.execCommand('copy'); } catch (_) { copied = false; }
    }
    outHelp.textContent = copied
      ? `Copied (${fmt(code.length)} letters). Paste it into a message or note to yourself. On the other device open Settings, then Extras, then Transfer progress.`
      : 'Press and hold the code below, choose Select All, then Copy.';
    toast(copied ? 'Code copied' : "Couldn't copy by itself. Copy the code from the box.", copied);
  }, click);
  out.addEventListener('focus', () => { try { out.select(); } catch (_) { /* ignore */ } });
  input.addEventListener('input', () => showErr(''));

  tap(node.querySelector('[data-check]'), async () => {
    const r = readCode(input.value);
    if (!r.ok) { showErr(`${transferErrorText(r.error)} Nothing on this device was changed.`); return; }
    showErr('');
    const now = transferSummary(save);
    const next = transferSummary(importedSave(r.data, save));
    const line = (s) => `Level ${fmt(s.level)}, best ${fmt(s.best)}, coins ${fmt(s.coins)}`;
    const ok = await confirmBox({
      title: 'Replace progress?',
      text: `This replaces the progress on this device: <b>${esc(line(next))}</b>.<br><br>This device now has ${esc(line(now))}. Remove Ads, purchases and ad settings on this device stay as they are.<br><br>Tip: copy your own code first if you might want this progress back.`,
      ok: 'Replace', cancel: 'Keep mine',
    });
    if (!ok || closed) return;
    finish();
    app.importProgress(r.data);
    toast('Done. Your progress is here.', true, 3000);
  }, click);
  tap(node.querySelector('[data-x]'), finish, click);
  return node;
}

// ==================================================================== SOUND BACKDROP

/** Settings > Sound: the "Sound backdrop" chips (src/meta/soundBackdrop.js). A tap plays it (3 s when Music is off). */
/**
 * Settings > Sound: one "Background sound" picker (UX_OPPORTUNITIES 11). Music, the soundscapes, and "Off".
 * "Off" is settings.music = false (the same switch the pause sheet's Music button flips); "Silence" folds into it.
 * Picking any other choice turns music back on with that backdrop. Saved fields are unchanged.
 */
function soundBackdropRow(s, save) {
  const raw = playableBackdrop(normSoundBackdrop(s.soundBackdrop), save);
  const curId = s.music === false || raw === 'silence' ? 'off' : raw;
  const opts = [...SOUND_BACKDROPS.filter((x) => x.id !== 'silence'), { id: 'off', name: tr('settings.bgsound.off'), blurb: tr('settings.bgsound.offBlurb') }];
  const b = opts.find((x) => x.id === curId) || COLLECTION_BACKDROPS.find((x) => x.id === curId) || opts[0];
  const chip = (x) => {
    const price = chipPrice(x.id, save);
    return `<button class="${x.id === curId ? 'on' : ''}" data-sb="${x.id}" role="radio" aria-checked="${x.id === curId}"${price ? ` aria-label="${esc(tr('settings.bgsound.preview', { name: x.name, price, seconds: SOUND_PREVIEW_SECONDS }))}"` : ''}>${x.id === curId ? SWITCH_CHECK : ''}${esc(x.name)}${price ? `<span class="sb-price">${price}</span>` : ''}</button>`;
  };
  // sound collections (src/meta/soundCollections.js): one labelled chip group each, inside the same radiogroup
  const groups = SOUND_COLLECTIONS.map((c) => `<div class="sb-group">${esc(c.name)}</div>${c.backdrops.map(chip).join('')}`).join('');
  return `<div class="c-row sb-row"><div class="c-text"><div class="c-name">${esc(tr('settings.bgsound.title', { name: b.name }))}</div><div class="c-sub">${esc(b.blurb)}</div></div>
    <div class="sb-chips" role="radiogroup" aria-label="${esc(tr('settings.bgsound.label'))}">${opts.map(chip).join('')}${groups}</div></div>`;
}
/**
 * Settings > Comfort > Language (docs/LOCALISATION.md). English plus the four launch-wave languages; a language stays
 * greyed out ("coming soon") until its human translation is ready, so nothing machine-translated is ever offered.
 * The choice is kept on this device (src/ui/i18n.js).
 */
function languageRow() {
  const cur = getLocale();
  const soon = (l) => esc(tr('settings.language.soon', { name: l.name }));
  const chip = (l) => l.ready
    ? `<button class="${l.id === cur ? 'on' : ''}" data-lang="${l.id}" role="radio" aria-checked="${l.id === cur}" lang="${l.id}">${l.id === cur ? SWITCH_CHECK : ''}${esc(l.name)}</button>`
    : `<button class="lang-soon" disabled aria-disabled="true" role="radio" aria-checked="false" lang="${l.id}" aria-label="${soon(l)}" title="${soon(l)}">${esc(l.name)}</button>`;
  return `<div class="c-row sb-row lang-row"><div class="c-text"><div class="c-name">${esc(tr('settings.language.name'))}</div><div class="c-sub">${esc(tr('settings.language.sub'))}</div></div>
    <div class="sb-chips" role="radiogroup" aria-label="${esc(tr('settings.language.name'))}">${LOCALES.map(chip).join('')}</div></div>`;
}
function wireLanguageRow(body, onChange) {
  for (const b of body.querySelectorAll('[data-lang]')) {
    tap(b, () => { if (b.dataset.lang === getLocale()) return; setLocale(b.dataset.lang); onChange(); }, click);
  }
}
/** A running 20 s collection preview (only while SOUND_COLLECTIONS_FOR_SALE and not owned). */
let soundPreview = null;

const SWITCH_CHECK = '<svg class="sb-check" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/** Inside of every on/off switch in Settings: a sliding track with a knob plus the word, so the state never rests on colour alone. */
function switchInner(on) {
  return `<span class="sw-track" aria-hidden="true"><i></i></span><span class="tag">${esc(on ? tr('common.on') : tr('common.off'))}</span>`;
}

// ==================================================================== MUSIC TRACKS

const TRACKS_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h10M4 12h10M4 18h6"/><path d="M18 17V7l3-1" /><circle cx="16.5" cy="17.5" r="2" fill="currentColor"/></svg>';
const musicAudible = (app) => !!app.save.settings.sound && app.save.settings.music !== false;

function tracksButton(app) {
  return `<button class="toggle ${musicAudible(app) ? '' : 'off'}" data-tracks>${TRACKS_ICON}<span>${esc(tr('pause.tracks'))}</span></button>`;
}

/** Music tracks sheet: per-song on/off (at least one stays on) and a ▶ preview that switches songs now. */
export function showMusicTracks(app, onClose) {
  const settings = app.save.settings;
  if (!settings.musicTracks || typeof settings.musicTracks !== 'object') settings.musicTracks = {};
  const map = settings.musicTracks;
  const tracks = Svc.musicTracks();
  if (!tracks.length) { toast(tr('tracks.loading')); return null; }
  const isOn = (id) => map[id] !== false;
  const node = open(el(`<div class="screen modal"><div class="card tracks-card">
    <h2>${esc(tr('settings.tracks.name'))}</h2>
    <p>${esc(tr('tracks.lead'))}</p>
    <div class="tracks-note" data-note></div>
    <div class="track-list" data-list></div>
    <button class="btn primary" data-done>${esc(tr('common.done'))}</button>
    <div class="track-debug" data-debug></div>
  </div></div>`));
  // tiny status line so a phone screenshot shows which build runs and what the music engine is doing
  const dbg = node.querySelector('[data-debug]');
  const showDebug = () => {
    if (!node.isConnected) { clearInterval(dbgTimer); return; }
    const d = Svc.musicDebug();
    dbg.textContent = `build ${BUILD} · ` + (d ? `audio ${d.context} · selected ${d.selected} · playing ${d.current || '-'} · live ${d.live.join('+') || '-'} · fading ${d.fading.join('+') || '-'}${d.yielded ? ' · yielded' : ''}${d.offscreen ? ' · offscreen' : ''}` : 'audio not loaded');
  };
  const dbgTimer = setInterval(showDebug, 500);
  showDebug();
  const list = node.querySelector('[data-list]');
  const note = node.querySelector('[data-note]');
  const render = () => {
    const audible = musicAudible(app);
    const playing = Svc.currentTrack();
    note.innerHTML = '';
    if (!audible) {
      const offLine = settings.sound ? tr('tracks.musicOff') : tr('tracks.soundOff');
      const b = el(`<button class="toggle wide off" data-turnon>${settings.sound ? ICONS.music : ICONS.soundOff}<span>${esc(offLine)}</span></button>`);
      tap(b, () => {
        if (!settings.sound) app.setSetting('sound', true);
        if (settings.music === false) app.setSetting('music', true);
        render();
      }, click);
      note.appendChild(b);
    }
    list.classList.toggle('disabled', !audible);
    list.innerHTML = '';
    for (const t of tracks) {
      const on = isOn(t.id);
      const row = el(`<div class="track-row ${on ? '' : 'off'} ${audible && t.id === playing ? 'playing' : ''}">
        <button class="track-play" data-play aria-label="${esc(tr('tracks.play', { name: t.name }))}">${ICONS.play}</button>
        <div class="track-text"><div class="track-name">${esc(t.name)}${audible && t.id === playing ? ` <span class="track-now">${esc(tr('tracks.playing'))}</span>` : ''}</div><div class="track-blurb">${esc(t.blurb)}</div></div>
        <button class="toggle track-toggle ${on ? '' : 'off'}" data-onoff role="switch" aria-checked="${on}" aria-label="${esc(t.name)}">${switchInner(on)}</button>
      </div>`);
      tap(row.querySelector('[data-play]'), () => {
        Svc.previewTrack(t.id);
        if (musicAudible(app)) nowPlayingToast(t.name);
        setTimeout(render, 30);
      });
      tap(row.querySelector('[data-onoff]'), () => {
        if (on && tracks.filter((x) => isOn(x.id)).length <= 1) { toast(tr('tracks.keepOne')); return; }
        map[t.id] = !on;
        Svc.setMusicTracks(map);
        app.persist();
        render();
      }, click);
      list.appendChild(row);
    }
  };
  render();
  tap(node.querySelector('[data-done]'), () => { close(node); if (onClose) onClose(); }, click);
  return node;
}

// ==================================================================== COMFORT (accessibility)

const COMFORT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="4.5" r="2" fill="currentColor"/><path d="M4 8.5l8 1.5 8-1.5M12 10v5M12 15l-3.5 6M12 15l3.5 6"/></svg>';

function comfortButton() {
  return `<button class="toggle" data-comfort>${COMFORT_ICON}<span>${esc(tr('settings.tab.comfort'))}</span></button>`;
}

function deviceReducedMotion() {
  try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (_) { return false; }
}

/**
 * Comfort sheet: text size, numbers, tier shapes, animation speed, calm / reduced motion, left-hand HUD.
 * (Numbers and Calm moved here from the settings row; same save keys as before.)
 */
export function showComfort(app, onClose) {
  const node = open(el(`<div class="screen modal"><div class="card tracks-card comfort-card">
    <h2>${esc(tr('settings.tab.comfort'))}</h2>
    <p>${esc(tr('settings.comfort.lead'))}</p>
    <div data-list></div>
    <button class="btn primary" data-done>${esc(tr('common.done'))}</button>
  </div></div>`));
  renderComfort(app, node.querySelector('[data-list]'));
  tap(node.querySelector('[data-done]'), () => { close(node); if (onClose) onClose(); }, click);
  return node;
}

/** Comfort rows, rendered into `list` (the Comfort sheet and the Settings sheet's Comfort tab). */
function renderComfort(app, list, onChange) {
  const settings = app.save.settings;
  const changed = () => { if (onChange) onChange(); };
  const sw = (key, on) => `<button class="toggle c-switch ${on ? '' : 'off'}" data-sw="${key}" role="switch" aria-checked="${on}">${switchInner(on)}</button>`;
  const text = (name, sub, extra = '') => `<div class="c-text"><div class="c-name">${esc(name)}</div><div class="c-sub">${esc(sub)}</div>${extra}</div>`;
  const render = () => {
    const ts = settings.textSize || 1;
    const dev = deviceReducedMotion();
    list.innerHTML = `
      ${app.startTutorial ? `<div class="c-row">${text(tr('comfort.howto.name'), tr('comfort.howto.sub'))}<button class="btn small" data-howto aria-label="${esc(tr('comfort.howto.label'))}">${esc(tr('comfort.howto.start'))}</button></div>` : ''}
      <div class="c-row">${text(tr('comfort.textSize.name'), tr('comfort.textSize.sub'))}
        <div class="seg">${[[1, '100%'], [1.25, '125%'], [1.5, '150%']].map(([v, t]) => `<button class="${ts === v ? 'on' : ''}" data-ts="${v}">${t}</button>`).join('')}</div></div>
      <div class="c-row">${text(tr('comfort.numbers.name'), tr('comfort.numbers.sub'))}${sw('numbers', !!settings.numbers)}</div>
      <div class="c-row">${text(tr('comfort.shapes.name'), tr('comfort.shapes.sub'), `
        <div class="shape-legend" data-legend></div>`)}${sw('shapes', !!settings.shapes)}</div>
      <div class="c-row">${text(tr('comfort.speed.name'), settings.calm || dev ? tr('comfort.speed.subCalm') : tr('comfort.speed.sub'))}
        <div class="seg">${[[1, '1×'], [2, '2×']].map(([v, t]) => `<button class="${(settings.animSpeed === 2 ? 2 : 1) === v ? 'on' : ''}" data-speed="${v}" aria-label="${esc(tr('comfort.speed.label', { value: t }))}">${t}</button>`).join('')}</div></div>
      <div class="c-row">${text(tr('comfort.calm.name'), dev ? tr('comfort.calm.subDevice') : tr('comfort.calm.sub'))}${sw('calm', !!settings.calm || dev)}</div>
      <div class="c-row">${text(tr('comfort.hand.name'), tr('comfort.hand.sub'))}
        <div class="seg"><button class="${settings.leftHand ? 'on' : ''}" data-hand="left">${esc(tr('comfort.hand.left'))}</button><button class="${settings.leftHand ? '' : 'on'}" data-hand="right">${esc(tr('comfort.hand.right'))}</button></div></div>
      <div class="c-row">${text(tr('comfort.steady.name'), trp('comfort.steady.sub', STEADY_FAILS))}${sw('steadyStart', settings.steadyStart !== false)}</div>
      <div class="c-row">${text(tr('comfort.levelTips.name'), tr('comfort.levelTips.sub'))}${sw('levelTips', settings.levelTips !== false)}</div>
      <div class="c-row">${text(tr('comfort.raceBest.name'), tr('comfort.raceBest.sub'))}${sw('raceBest', settings.raceBest !== false)}</div>
      <div class="c-row">${text(tr('comfort.nextHint.name'), tr('comfort.nextHint.sub'))}${sw('nextHint', settings.nextHint === true)}</div>
      <div class="c-row">${text(tr('comfort.eveningLook.name'), tr('comfort.eveningLook.sub'))}${sw('eveningLook', settings.eveningLook !== 'off')}</div>
      <div class="c-row c-calm">${text(tr('comfort.eveningCalm.name'), tr('comfort.eveningCalm.sub'))}
        <div class="seg">${[['off', tr('common.off')], ['night', tr('comfort.eveningCalm.night')], ['always', tr('comfort.eveningCalm.always')]].map(([v, t]) => `<button class="${(settings.eveningCalm || 'off') === v ? 'on' : ''}" data-calm="${v}">${esc(t)}</button>`).join('')}</div></div>
      ${settings.eveningCalm === 'night' || settings.eveningCalm === 'always' ? `<div class="c-row">${text(tr('comfort.waves.name'), tr('comfort.waves.sub'))}${sw('eveningWaves', !!settings.eveningWaves)}</div>` : ''}`;
    tap(list.querySelector('[data-howto]'), () => app.startTutorial({ from: 'settings' }), click);
    for (const b of list.querySelectorAll('[data-ts]')) tap(b, () => { app.setSetting('textSize', Number(b.dataset.ts)); render(); changed(); }, click);
    for (const b of list.querySelectorAll('[data-speed]')) tap(b, () => { app.setSetting('animSpeed', Number(b.dataset.speed)); render(); changed(); }, click);
    for (const b of list.querySelectorAll('[data-hand]')) tap(b, () => { app.setSetting('leftHand', b.dataset.hand === 'left'); render(); changed(); }, click);
    for (const b of list.querySelectorAll('[data-calm]')) tap(b, () => { app.setSetting('eveningCalm', b.dataset.calm); render(); changed(); }, click);
    for (const b of list.querySelectorAll('[data-sw]')) {
      tap(b, () => {
        const k = b.dataset.sw;
        if (k === 'calm' && dev) { toast(tr('comfort.calm.deviceToast')); return; }
        if (k === 'eveningLook') app.setSetting(k, settings.eveningLook === 'off' ? 'auto' : 'off'); // 'auto' | 'off'
        else app.setSetting(k, (k === 'steadyStart' || k === 'levelTips' || k === 'raceBest') ? settings[k] === false : !settings[k]);
        render();
        changed();
      }, click);
    }
    const legend = list.querySelector('[data-legend]');
    if (legend && settings.shapes) {
      for (let t = 1; t < TIER_SHAPES.length; t++) legend.appendChild(el(`<canvas data-t="${t}" title="${esc(tierName(t))}"></canvas>`));
      requestAnimationFrame(() => {
        for (const c of legend.querySelectorAll('canvas')) paintOrbCanvas(c, { tier: Number(c.dataset.t), number: !!settings.numbers, shape: true }, app.save.skins.equipped);
      });
    }
  };
  render();
}

// ==================================================================== BACKGROUNDS

const BACKDROP_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2" fill="currentColor"/><path d="M3 17c4-4 7-5 10-3s5 1 8-2"/></svg>';

function backdropButton() {
  return `<button class="toggle" data-backdrop>${BACKDROP_ICON}<span>${esc(tr('pause.background'))}</span></button>`;
}

/** Background sheet: "Follow progress" or any unlocked nebula; locked ones say how to reach them. */
export function showBackdrops(app, onClose) {
  const node = open(el(`<div class="screen modal"><div class="card tracks-card">
    <h2>${esc(tr('style.background.title'))}</h2>
    <p>${esc(tr('style.background.leadCosmic'))}</p>
    <div class="track-list" data-list></div>
    <button class="btn primary" data-done>${esc(tr('common.done'))}</button>
  </div></div>`));
  renderBackdrops(app, node.querySelector('[data-list]'));
  tap(node.querySelector('[data-done]'), () => { close(node); if (onClose) onClose(); }, click);
  return node;
}

/** Background rows, rendered into `list` (the Background sheet and the Settings sheet's Style tab). */
function renderBackdrops(app, list) {
  const settings = app.save.settings;
  const render = () => {
    const sel = settings.backdrop || 'auto';
    const unlocked = unlockedBackdrops(app.save);
    const autoTheme = resolveBackdrop('auto', { mode: 'menu' }, app.save);
    list.innerHTML = '';
    const row = (id, swatch, name, blurb, locked, scene = false) => {
      const on = !locked && (sel === id || (id === 'auto' && !unlocked.includes(sel)));
      const r = el(`<button class="track-row bd-row ${on ? 'playing' : ''} ${locked ? 'off locked' : ''}" ${locked ? 'aria-disabled="true"' : ''}>
        ${scene ? `<canvas class="bd-swatch big" data-scene="${esc(id)}" aria-hidden="true"></canvas>` : `<span class="bd-swatch big" style="background:${swatch}"></span>`}
        <span class="track-text"><span class="track-name">${esc(name)}${on ? ` <span class="track-now">${esc(tr('backdrop.on'))}</span>` : ''}</span><span class="track-blurb">${blurb}</span></span>
        ${locked ? '<span class="bd-lock">🔒</span>' : ''}
      </button>`);
      tap(r, () => {
        if (locked) { toast(blurb.replace(/<[^>]+>/g, '')); return; }
        app.setSetting('backdrop', id);
        render();
      }, click);
      list.appendChild(r);
    };
    row('auto', backdropSwatchCss(autoTheme), tr('wardrobe.auto.name'), esc(tr('backdrop.autoSub')), false);
    // Seaside Café (v3): the harbour window and its six moods, free and always there
    for (const t of SEASIDE_BACKDROPS) row(t.id, backdropSwatchCss(t), t.name, esc(tr('backdrop.seasideSub')), false);
    BACKDROPS.forEach((t, i) => {
      const locked = !unlocked.includes(t.id);
      const blurb = locked
        ? tr('wardrobe.how.levelOrSector', { level: chapterStartLevel(i), sector: sectorStart(i) })
        : tr('backdrop.chapterSub', { n: i + 1, from: chapterStartLevel(i), to: chapterStartLevel(i) + CHAPTER_LEVELS - 1 });
      row(t.id, backdropSwatchCss(t), t.name, esc(blurb), locked);
    });
    // Cosmic pack nebulas (former capsule and Comet Week nebulas): listed once owned (Shop › Looks, coins)
    const ownedCosmic = COSMIC_NEBULAS.filter((id) => unlocked.includes(id) && BACKDROP_BY_ID[id]).map((id) => BACKDROP_BY_ID[id]);
    for (const t of ownedCosmic) row(t.id, backdropSwatchCss(t), t.name, esc(tr('backdrop.starrySub')), false);
    // former Starlight Season nebulas: listed once owned, kept forever
    for (const t of SEASON_BACKDROPS.filter((b) => unlocked.includes(b.id))) row(t.id, backdropSwatchCss(t), t.name, esc(tr('backdrop.seasonSub')), false);
    // Sky scenes (v0.5.8): animated, listed once owned (Shop › Looks)
    const ownedScenes = SCENE_BACKDROPS.filter((b) => unlocked.includes(b.id));
    for (const t of ownedScenes) row(t.id, '', t.name, esc(tr('backdrop.movingSub')), false, true);
    // premium pack scenes: listed once owned
    for (const t of PACK_BACKDROPS.filter((b) => unlocked.includes(b.id))) row(t.id, '', t.name, esc(tr('backdrop.premiumSub')), false, true);
    if (ownedCosmic.length < COSMIC_NEBULAS.length) list.appendChild(el(`<p class="pass-fine" style="text-align:center">${esc(tr('backdrop.moreStarry', { n: COSMIC_NEBULAS.length - ownedCosmic.length, coins: fmt(COSMIC_NEBULA_PRICE) }))}</p>`));
    if (ownedScenes.length < SCENE_BACKDROPS.length) list.appendChild(el(`<p class="pass-fine" style="text-align:center">${esc(tr('backdrop.moreMoving', { n: SCENE_BACKDROPS.length - ownedScenes.length }))}</p>`));
    requestAnimationFrame(() => { for (const c of list.querySelectorAll('canvas[data-scene]')) paintScenePreview(c, BACKDROP_BY_ID[c.dataset.scene]); });
  };
  render();
}

const autoplayNote = () => `<div class="autoplay-note">${esc(tr('result.autoplay'))}</div>`;
// the optional ×2 offer: an outlined chip in the quiet row, never filled, never louder than the way out (F8, rule 3)
const doubleBtnHtml = () => `<button class="btn ad-chip" data-double>${esc(tr('result.double'))} <span class="ad-tag">${esc(tr('common.adTag'))}</span></button>`;

// ==================================================================== IN-RUN MODALS

/**
 * Endless perk pick. Plain words only (docs/UX_OPPORTUNITIES.md item 5): "Works well with …" instead of system hints,
 * and the ad-paid "Different choices" is a quiet secondary button under the cards, never the loudest thing on the card.
 * Toasts wait until the sheet closes (holdToasts).
 */
export function showPerkPick(app, { title, offer, owned, reroll, path = null, zen = false }) {
  return new Promise((resolve) => {
    let rerolled = false;
    holdToasts();
    // no reroll (it is paid with an ad) when there is none, e.g. in Zen Drift
    const node = open(el(`<div class="screen modal" data-perkpick><div class="card">
      <h2>${esc(title)}</h2><p>${esc(tr('perk.choose'))}</p>
      <div class="perk-cards"></div>
      ${reroll ? `<button class="btn ghost perk-reroll" data-reroll>${esc(tr('perk.reroll'))} <span class="ad-tag">${esc(tr('common.adTag'))}</span></button>` : ''}
    </div></div>`));
    const cards = node.querySelector('.perk-cards');
    // café names and copy by default, the space names for the Cosmic look; tier names follow the skin
    const look = uiLook(app.save);
    const nm = (x) => perkName(x, look);
    const ds = (x) => skinTierText(perkDesc(x, look));
    const render = (ids) => {
      cards.innerHTML = '';
      for (const id of ids) {
        const p = PERK_BY_ID[id];
        const lv = (owned[id] || 0);
        let c;
        if (p.evolution) {
          const recipe = p.requires.map(nm).join(' + ');
          c = el(`<button class="perk-card evo" data-perk="${id}" style="--pc:${p.color}"><div class="pico" style="color:${p.color}">${p.icon}</div>
            <div><div class="evo-tag">${esc(tr('perk.combo'))}</div><div class="pname">${esc(nm(id))}</div><div class="precipe">${esc(tr('perk.from', { recipe }))}</div><div class="pdesc">${esc(ds(id))}</div></div></button>`);
        } else {
          const h = perkHint(id, owned, zen);
          const hint = !h ? '' : h.complete
            ? `<div class="phint strong">${esc(tr('perk.unlocks', { partner: nm(h.partner), evo: nm(h.evo) }))}</div>`
            : `<div class="phint">${esc(tr('perk.worksWith', { partner: nm(h.partner) }))}</div>`;
          c = el(`<button class="perk-card" data-perk="${id}" style="border-color:${p.color}55"><div class="pico" style="color:${p.color}">${p.icon}</div>
            <div><div class="pname">${esc(nm(id))} ${lv ? `<span class="plv">${esc(tr('perk.level', { n: lv + 1 }))}</span>` : ''}</div><div class="pdesc">${esc(ds(id))}</div>${hint}${path && perkPath(id) === path ? `<div class="ppath" style="color:${PATH_BY_ID[path].color}">${esc(tr('perk.fitsPath', { name: PATH_BY_ID[path].name }))}</div>` : ''}</div></button>`);
        }
        tap(c, () => { close(node).then(releaseToasts); resolve(id); }, click);
        cards.appendChild(c);
      }
    };
    render(offer);
    const rb = node.querySelector('[data-reroll]');
    if (rb) tap(rb, async () => {
      if (rerolled) return;
      rb.disabled = true;
      const next = await reroll();
      if (next && next.length) { rerolled = true; render(next); rb.textContent = tr('perk.rerolled'); }
      else { rb.disabled = false; toast(tr('perk.noReroll'), false, 2400, true); }
    }, click);
  });
}

/** Endless revive offer: honest emphasis copy, waits for the player's choice (no timer). */
export function showRevive(app, { emphasis, score, best }) {
  return new Promise((resolve) => {
    const node = open(el(`<div class="screen modal"><div class="card">
      <h2>${esc(tr('revive.title'))}</h2>
      <p class="${emphasis.emphasise ? 'emph' : ''}">${esc(emphasis.message)}</p>
      <p>${esc(best ? tr('revive.scoreBest', { score: fmt(score), best: fmt(best) }) : tr('revive.score', { score: fmt(score) }))}</p>
      <p class="revive-note">${esc(tr('revive.note', { rows: AD_REWARDS.REVIVE_ROWS }))}</p>
      <button class="btn pink" data-yes>${esc(tr('revive.yes'))} <span class="ad-tag">${esc(tr('common.adTag'))}</span></button>
      <button class="btn ghost" data-no>${esc(tr('common.noThanks'))}</button>
    </div></div>`));
    let done = false;
    const finish = (v) => { if (done) return; done = true; close(node); resolve(v); };
    tap(node.querySelector('[data-yes]'), () => finish(true), click);
    tap(node.querySelector('[data-no]'), () => finish(false), click);
  });
}

/**
 * Journey fail offer (docs/UX_OPPORTUNITIES.md item 1): one primary "Try again" (restarts the level for free), then a
 * quiet secondary row with +5 drops for coins and +3 drops for an ad (once), then "End level". No timer and no shop link
 * at the moment of loss: when coins are short it only says "You have X of Y coins". Finished goals come first with
 * "Done ✓". The copy above the goals is levels.js remainingText (honest near-miss rule). The layout is the same on
 * every level and never depends on ad state.
 */
export function showFailOffer(app, { level, reason, remaining, prog, price, canAd }) {
  return new Promise((resolve) => {
    const save = app.save;
    const title = esc(reason === 'drops' ? tr('fail.title.drops') : reason === 'tide' ? tr('fail.title.tide') : tr('fail.title.room'));
    const extraNote = reason === 'drops' ? '' : `<p class="pass-fine" style="margin:8px 0 0">${esc(tr('fail.clearsRows', { rows: AD_REWARDS.REVIVE_ROWS }))}</p>`;
    const coinsHtml = `<button class="btn gold" data-buydrops>${esc(tr('fail.drops', { n: 5 }))} · <span class="coin"></span>${fmt(price)}</button>`;
    const adHtml = canAd ? `<button class="btn pink" data-ad>${esc(tr('fail.drops', { n: AD_REWARDS.FAIL_AD_DROPS }))} <span class="ad-tag">${esc(tr('common.adTag'))}</span></button>` : '';
    const isDone = (i) => prog[i] >= level.goals[i].count;
    const order = level.goals.map((g, i) => i).sort((a, b) => (isDone(b) - isDone(a)) || a - b); // finished goals first
    const doneIdx = order.filter(isDone);
    const doneLine = !doneIdx.length ? ''
      : doneIdx.length === 1 ? esc(tr('fail.doneOne', { goal: goalText(level.goals[doneIdx[0]], true) }))
        : esc(tr('fail.doneSome', { n: doneIdx.length, total: level.goals.length }));
    const goalRow = (i) => {
      const g = level.goals[i];
      const count = isDone(i) ? `<b class="goal-done">${esc(tr('fail.goalDone'))}</b>` : `<b>${g.type === 'score' ? fmt(prog[i]) : prog[i]}/${fmt(g.count)}</b>`;
      return `<li${isDone(i) ? ' class="done"' : ''}>${goalIcon(g)}<span style="flex:1">${esc(tierGoalText(g, goalText(g)))}</span>${count}</li>`;
    };
    const node = open(el(`<div class="screen modal"><div class="card fail-card">
      <h2>${title}</h2>
      ${remaining ? `<p class="emph">${esc(remaining)}</p>` : ''}
      ${doneLine ? `<p class="fail-done">${doneLine}</p>` : ''}
      <ul class="goal-list">${order.map(goalRow).join('')}</ul>
      <button class="btn primary" data-retry>${esc(tr('fail.retry'))}</button>
      <p class="pass-fine" style="margin:12px 0 0">${esc(tr('fail.keepGoing'))}</p>
      <div class="secondary-row fail-continue">${coinsHtml}${adHtml}</div>
      <p class="pass-fine" data-short style="margin:6px 0 0"></p>
      ${extraNote}
      <button class="btn ghost" data-quit>${esc(tr('fail.quit'))}</button>
    </div></div>`));
    paintGoalCanvases(node, save.skins.equipped, save.settings.numbers);
    const coinsBtn = node.querySelector('[data-buydrops]');
    const shortEl = node.querySelector('[data-short]');
    const enough = save.coins >= price;
    coinsBtn.disabled = !enough;
    shortEl.textContent = enough ? '' : tr('fail.short', { have: fmt(save.coins), price: fmt(price) });
    if (enough) shortEl.remove();
    let done = false;
    const finish = (v) => { if (done) return; done = true; close(node); resolve(v); };
    tap(coinsBtn, () => { if (save.coins >= price) finish('coins'); }, click);
    tap(node.querySelector('[data-ad]'), () => finish('ad'), click);
    // free restart: the game ends this attempt as a normal fail and main.js starts the level again
    tap(node.querySelector('[data-retry]'), () => finish('retry'), click);
    tap(node.querySelector('[data-quit]'), () => finish('quit'), click);
  });
}

export function showBoosterIntro(app, id) {
  return new Promise((resolve) => {
    const b = BOOSTERS[id];
    const node = open(el(`<div class="screen modal"><div class="card">
      <div style="color:var(--ink-orange, #ff8a5c);width:72px;height:72px;margin:0 auto">${ICONS[id].replaceAll('<svg', '<svg width="72" height="72"')}</div>
      <h2>${tr('booster.new', { name: b.name })}</h2>
      <p>${esc(b.desc)}</p>
      <p class="hl">${esc(tr('booster.free'))}</p>
      <button class="btn primary" data-ok>${esc(tr('common.gotIt'))}</button>
    </div></div>`));
    tap(node.querySelector('[data-ok]'), () => { close(node); resolve(); }, click);
  });
}

export function offerBoosterPurchase(app, id) {
  return new Promise((resolve) => {
    const save = app.save;
    const b = BOOSTERS[id];
    const node = open(el(`<div class="screen modal"><div class="card">
      <div style="color:var(--ink-orange, #ff8a5c);width:64px;height:64px;margin:0 auto">${ICONS[id].replaceAll('<svg', '<svg width="64" height="64"')}</div>
      <h2>${b.name}</h2><p>${esc(b.desc)}</p>
      <button class="btn gold" data-buy ${save.coins >= b.price ? '' : 'disabled'}>${esc(tr('booster.buy1'))} <span class="coin"></span>${fmt(b.price)}</button>
      ${save.coins >= b.price ? '' : `<p style="font-size:calc(15px * var(--ts))">${esc(tr('booster.youHave', { n: fmt(save.coins) }))}</p><button class="btn" data-shop>${esc(tr('booster.getCoins'))}</button>`}
      <button class="btn ghost" data-x>${esc(tr('common.cancel'))}</button>
    </div></div>`));
    let done = false;
    const finish = (v) => { if (done) return; done = true; close(node); resolve(v); };
    tap(node.querySelector('[data-buy]'), () => {
      if (buyBooster(save, id)) { Svc.sfx('coin'); app.persist(); finish(true); }
    }, click);
    tap(node.querySelector('[data-shop]'), () => { finish(false); showShop(app, 'coins'); }, click);
    tap(node.querySelector('[data-x]'), () => finish(false), click);
  });
}

// ==================================================================== FIRST-TIME MOMENTS

/** Paint the "New in the café" picture: an order ticket, a glazed piece or a teapot heading down. */
function paintMechanicPic(canvas, kind, tier, skin, numbers, count = 1) {
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const w = canvas.clientWidth || 168, h = canvas.clientHeight || 112;
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const half = Math.min(w, h) * 0.36;
  if (kind === 'orders') {
    // a cream order ticket with a torn top edge, the wanted piece and how many the level wants ("×2")
    const tw = w * 0.7, th = h * 0.78, x0 = (w - tw) / 2, y0 = (h - th) / 2;
    ctx.fillStyle = '#fff8ec'; ctx.strokeStyle = 'rgba(78,52,40,0.8)'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x0, y0 + 6);
    for (let i = 0; i <= 8; i++) ctx.lineTo(x0 + (tw * i) / 8, y0 + (i % 2 ? 0 : 6));
    ctx.lineTo(x0 + tw, y0 + th - 10); ctx.quadraticCurveTo(x0 + tw, y0 + th, x0 + tw - 10, y0 + th);
    ctx.lineTo(x0 + 10, y0 + th); ctx.quadraticCurveTo(x0, y0 + th, x0, y0 + th - 10);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    drawOrb(ctx, x0 + tw * 0.36, y0 + th * 0.55, th * 0.3, tier || 3, skin, dpr, { number: numbers, shape: shapesOn });
    ctx.fillStyle = '#4a2f22'; ctx.font = `800 ${Math.round(th * 0.3)}px Fredoka, system-ui, sans-serif`;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(`×${Math.max(1, Math.floor(Number(count) || 1)).toLocaleString('en-US')}`, x0 + tw * 0.62, y0 + th * 0.56);
  } else if (kind === 'glaze') {
    ctx.save(); ctx.translate(w / 2, h / 2 + 4);
    drawOrb(ctx, 0, 0, half * 0.86, tier || 3, skin, dpr, { number: numbers, shape: shapesOn });
    drawGlaze(ctx, half);
    ctx.restore();
  } else if (kind === 'tin') {
    // before -> after (docs/UX_TINS.md T2): a closed tin with all 3 dots, a soft arrow, the free piece it opens into
    const th = Math.min(h * 0.3, w * 0.19);
    ctx.save(); ctx.translate(w * 0.22, h / 2 + th * 0.05);
    drawTin(ctx, th);
    ctx.restore();
    const ax0 = w * 0.44, ax1 = w * 0.58, ay = h / 2;
    const arrow = () => { ctx.beginPath(); ctx.moveTo(ax0, ay); ctx.lineTo(ax1, ay); ctx.moveTo(ax1 - 7, ay - 7); ctx.lineTo(ax1, ay); ctx.lineTo(ax1 - 7, ay + 7); };
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    arrow(); ctx.strokeStyle = 'rgba(60,36,26,0.95)'; ctx.lineWidth = 6; ctx.stroke();
    arrow(); ctx.strokeStyle = '#fff3dc'; ctx.lineWidth = 3; ctx.stroke();
    ctx.restore();
    drawOrb(ctx, w * 0.8, h / 2, th * 0.8, 3, skin, dpr, { number: numbers, shape: shapesOn });
  } else {
    ctx.save(); ctx.translate(w / 2, h / 2 - 4);
    drawTeapot(ctx, half * 1.25);
    drawTeapotHint(ctx, half * 1.25, 1);
    ctx.restore();
  }
}

/**
 * "New in the café" (docs/UX_MECHANICS.md P2): once per mechanic, the first level that uses it opens with this card
 * over the dimmed, paused board: a picture, the one rule sentence and one "Got it". Shown in Calm too (it's the only
 * extra pause). Resolves on "Got it".
 */
export function showMechanicCard(app, { kind, text, tier, count = 1 }) {
  return new Promise((resolve) => {
    const m = /^New:\s*([^!]+)!\s*(.*)$/.exec(text || '');
    const head = m ? m[1].charAt(0).toUpperCase() + m[1].slice(1) : '';
    const body = m ? m[2] : text;
    const node = open(el(`<div class="screen modal"><div class="card mech-card" role="dialog" aria-modal="true" aria-labelledby="mech-h">
      <span class="dkicker">${esc(tr('mech.kicker'))}</span>
      <canvas class="mech-pic" aria-hidden="true"></canvas>
      <h2 id="mech-h">${esc(head)}</h2>
      <p>${esc(body)}</p>
      <button class="btn primary" data-ok>${esc(tr('common.gotIt'))}</button>
    </div></div>`));
    const skin = (app.save.skins && app.save.skins.equipped) || 'classic';
    requestAnimationFrame(() => paintMechanicPic(node.querySelector('canvas'), kind, tier, skin, !!app.save.settings.numbers, count));
    const ok = node.querySelector('[data-ok]');
    tap(ok, () => { close(node); resolve(); }, click);
    try { ok.focus({ preventScroll: true }); } catch (_) { /* older browsers */ }
  });
}

/** Non-blocking "New discovery" card over the top of the board. Resolves when gone. */
export function showDiscovery(app, { tier, coins, top, autoplay = false }) {
  return new Promise((resolve) => {
    const skin = (app.save.skins && app.save.skins.equipped) || 'classic';
    const fact = discoveryFact(tier, skin); // pack skins: a line about their own pieces, not planets
    const n = el(`<div class="discovery" role="status">
      <canvas width="64" height="64"></canvas>
      <div class="dtext">
        <span class="dkicker">${esc(tr('discovery.kicker'))}</span>
        <b>${esc(tierName(tier, skin))}</b>
        <span class="dsub">${esc(discoveryBlurb(tier, skin))} ${autoplay ? `<span class="dauto">${esc(tr('discovery.autoplay'))}</span>` : `<span class="dcoins"><span class="coin"></span>+${fmt(coins)}</span>`}</span>
        ${fact ? `<span class="dfact">${esc(fact)}</span>` : ''}
      </div>
    </div>`);
    if (Number.isFinite(top)) n.style.top = Math.max(8, top) + 'px';
    document.body.appendChild(n);
    requestAnimationFrame(() => paintOrbCanvas(n.querySelector('canvas'), { tier, number: !!app.save.settings.numbers, shape: shapesOn }, skin));
    // a little longer than before so the one-line fact can be read (it never blocks play)
    setTimeout(() => n.classList.add('out'), 3600);
    setTimeout(() => { n.remove(); resolve(); }, 3950);
  });
}

// ==================================================================== RESULTS

/** "+55 coins": a labelled number, never a bare total (docs/UX_RESULT_CARDS.md finding 6). */
const coinsText = (n) => trp('result.coinsChip', n, { n: fmt(n) });
/** The coins reward chip; [data-earn] counts up from 0 with countCoins. */
function coinChipHtml(n = 0) {
  return `<span class="reward-chip coin-chip"><span class="coin"></span><span data-earn>${esc(coinsText(n))}</span></span>`;
}
/** countUp, but every frame reads "+N coins". */
function countCoins(node, from, to, dur, onTick) {
  if (!node) return Promise.resolve();
  return countUp(node, from, to, dur, (v, p) => { node.textContent = coinsText(v); if (onTick) onTick(v, p); });
}

/** The fine print on a result card: the honest ad-break line only (DESIGN "ad-break line"; null for autoplay or no ads). */
function adNoteHtml(res) {
  if (!res || !res.adLine || res.autoplay) return '';
  return `<button class="result-note ad-note" data-adinfo aria-label="${esc(tr('result.adLineLabel', { line: res.adLine }))}">${esc(res.adLine)} <span class="ad-why">${esc(tr('result.adWhy'))}</span></button>`;
}

/**
 * Share from a result card: one quiet "Share" link opens a small sheet with the ways to share (a postcard, Challenge a
 * friend). With only one way available the link goes straight to it.
 */
function showShareSheet(app, items) {
  const list = items.filter(Boolean);
  if (!list.length) return null;
  if (list.length === 1) { list[0].run(); return null; }
  const node = open(el(`<div class="screen modal"><div class="card share-sheet" role="dialog" aria-label="${esc(tr('common.share'))}">
    <h2>${esc(tr('common.share'))}</h2>
    ${list.map((it, i) => `<button class="btn ghost" data-share-i="${i}">${esc(it.label)}</button>`).join('')}
    <button class="linkish" data-x>${esc(tr('common.close'))}</button>
  </div></div>`));
  list.forEach((it, i) => tap(node.querySelector(`[data-share-i="${i}"]`), () => { close(node); it.run(); }, click));
  tap(node.querySelector('[data-x]'), () => close(node), click);
  return node;
}


/**
 * Endless and Daily run results (docs/UX_RESULT_CARDS.md §5, §6): title, the big score, one best block, one highlight,
 * the "+N coins" chip; then Play again (filled) and Home (outlined, same size), a quiet row (×2 chip, Share) and the
 * ad fine print. Real numbers only: the score and the best are never altered. Daily replays are scored (each run can
 * raise today's best and pays coins: src/meta/daily.js recordDailyChallenge), so Play again stays the main button.
 */
export function showGameOver(app, res, { onAgain, onHome }) {
  const save = app.save;
  const newBest = !!(res.isNewBest && res.bestBefore > 0 && !res.autoplay);
  // each Endless tide tier has its own best (the daily challenge is always Standard)
  const tn = !res.daily && res.challenge === 'gentle' ? tr('result.best.gentle') : !res.daily && res.challenge === 'bold' ? tr('result.best.bold') : tr('result.best.plain');
  const shownBest = fmt(res.autoplay ? res.bestBefore : Math.max(res.bestBefore, res.score));
  let bestHtml;
  if (res.daily) bestHtml = `<p class="best-line">${esc(tr('result.todayBest', { n: shownBest }))}</p>`;
  else if (res.autoplay) bestHtml = `<p class="best-line">${esc(tr('result.bestIs', { n: shownBest }))}</p>`;
  else {
    // honest progress toward the real best, in one line: "2,930 short of your best (18,250)" / "+1,210 past your best!"
    const line = res.isNewBest && res.bestBefore > 0 ? tr('result.pastBest', { best: tn, n: fmt(res.score - res.bestBefore) })
      : res.bestBefore > 0 ? tr('result.shortOfBestTotal', { best: tn, n: fmt(res.bestBefore - res.score), total: fmt(res.bestBefore) })
        : tr('result.firstScore');
    const pct = res.bestBefore > 0 ? Math.min(100, (res.score / res.bestBefore) * 100) : 100;
    bestHtml = `<div class="best-progress"><div class="progress"><i style="width:${pct.toFixed(1)}%"></i></div><span>${esc(line)}</span></div>`;
  }
  // one highlight (src/meta/resultNote.js runHighlight): records > Path > café orders > bounty > best moment > next goal
  const chain = res.bestChain && res.bestChain.points ? res.bestChain : null;
  const records = Array.isArray(res.records) ? res.records : [];
  const goal = res.nextGoal;
  const pick = runHighlight({
    goodnight: !!goodnightNoteHtml(res, save),
    records: records.length > 0,
    path: !!res.pathLine,
    moment: !!res.momentLine,
    bounty: !!res.bountyLine,
    chain: !!chain,
    goal: !!goal,
  });
  let hiHtml = '';
  if (pick === 'goodnight') hiHtml = goodnightNoteHtml(res, save);
  else if (pick === 'records') hiHtml = `<div class="records">${esc(trp('result.records', records.length, { list: records.join(' · ') }))}</div>`;
  else if (pick === 'path') hiHtml = `<div class="records path-unlock">${esc(res.pathLine)}</div>`;
  else if (pick === 'moment') hiHtml = `<div class="records bounty-line">☕ ${esc(res.momentLine)}</div>`;
  else if (pick === 'bounty') hiHtml = `<div class="records bounty-line">${esc(res.bountyLine)}</div>`;
  else if (pick === 'chain') hiHtml = `<div class="highlight"><span>${esc(tr('result.bestMoment'))}</span><b>${esc(chainText(chain))}</b></div>`;
  else if (pick === 'goal') {
    // an undiscovered orb stays a mystery: dark silhouette + "?", named only once you make it
    hiHtml = goal.kind === 'tier'
      ? `<div class="next-goal mystery"><canvas class="ng-orb" data-tier="${goal.tier}"></canvas><div><span>${esc(tr('result.nextDiscovery'))}</span><b>??? · ${esc(silhouetteHint(goal.tier))}</b></div></div>`
      : `<div class="next-goal"><div><span>${esc(tr('result.nextGoal'))}</span><b>${esc(goal.text)}</b></div></div>`;
  }
  // Share: one quiet link for the postcard and Challenge a friend
  const postcard = runPostcard(res);
  const shares = [
    postcard ? { label: tr('result.postcard'), run: () => showPostcard(app, postcard, postcardCaption(postcard)) } : null,
    canChallenge(res) ? { label: tr('friend.linkBeat', { n: fmt(res.score) }), run: () => showFriendSend(app, res) } : null,
  ].filter(Boolean);
  const outHtml = pick === 'goodnight'
    ? `<button class="btn ghost" data-goodnight>${esc(tr('goodnight.title'))}</button>`
    : `<button class="btn ghost" data-home>${esc(tr('result.home'))}</button>`;
  const quiet = [res.coins > 0 ? doubleBtnHtml() : '', shares.length ? `<button class="linkish" data-share>${esc(tr('common.share'))}</button>` : ''].filter(Boolean);
  const big = Number(save.settings && save.settings.textSize) >= 1.25;
  const node = open(el(`<div class="screen modal"><div class="card result-card run-card${big ? ' big-text' : ''}">
    <h2>${esc(res.daily ? tr('result.dailyTitle') : newBest ? tr('result.newBestTitle') : tr('result.runOver'))}</h2>
    ${res.autoplay ? autoplayNote() : ''}
    <div class="big-score" data-score>0</div>
    ${bestHtml}
    ${hiHtml}
    <div class="reward-row">${coinChipHtml()}</div>
    <div class="rc-actions"><button class="btn primary" data-again>${esc(tr('result.playAgain'))}</button>${outHtml}</div>
    ${quiet.length ? `<div class="quiet-row">${quiet.join('')}</div>` : ''}
    ${adNoteHtml(res)}
  </div></div>`));
  tap(node.querySelector('[data-share]'), () => showShareSheet(app, shares), click);
  const scoreEl = node.querySelector('[data-score]');
  const earnEl = node.querySelector('[data-earn]');
  const ngOrb = node.querySelector('canvas.ng-orb');
  if (ngOrb) requestAnimationFrame(() => paintSilhouette(ngOrb, Number(ngOrb.dataset.tier), (save.skins && save.skins.equipped) || 'classic'));
  let shown = res.coins;
  (async () => {
    await countUp(scoreEl, 0, res.score, Math.min(1400, 400 + res.score / 8));
    if (newBest) { Svc.sfx('newbest'); Svc.haptic('success'); }
    let lastTick = 0;
    await countCoins(earnEl, 0, res.coins, 800, (v) => { if (v - lastTick >= Math.max(1, res.coins / 12)) { lastTick = v; Svc.sfx('coin'); } });
  })();
  const dbl = node.querySelector('[data-double]');
  tap(dbl, async () => {
    dbl.disabled = true;
    const ok = await Svc.showRewarded('double_coins');
    if (ok) {
      save.coins += res.coins;
      app.persist();
      const from = shown; shown += res.coins;
      countCoins(earnEl, from, shown, 600);
      Svc.sfx('coin'); Svc.haptic('success');
      dbl.textContent = tr('result.doubled');
    } else {
      dbl.disabled = false;
      toast(tr('result.adUnavailable'));
    }
  }, click);
  let leaving = false;
  tap(node.querySelector('[data-again]'), () => { if (leaving) return; leaving = true; close(node); onAgain(); }, click);
  tap(node.querySelector('[data-home]'), () => { if (leaving) return; leaving = true; close(node); onHome(); }, click);
}

/**
 * Zen Drift results: score, the Zen best (real numbers, never altered), run stats, the modest coins.
 * No ads anywhere: no ×2 Coins, no ad-break line, no interstitial on leaving.
 */
export function showZenOver(app, res, { onAgain, onHome }) {
  const newBest = !res.autoplay && res.isNewBest && res.bestBefore > 0;
  const bestNow = res.autoplay ? res.bestBefore : Math.max(res.bestBefore, res.score);
  const line = res.autoplay ? '' : newBest ? tr('zenOver.beat', { n: fmt(res.score - res.bestBefore) })
    : res.bestBefore > 0 ? tr('zenOver.best', { n: fmt(res.bestBefore) }) : tr('zenOver.first');
  const chain = res.bestChain && res.bestChain.points ? res.bestChain : null;
  const node = open(el(`<div class="screen modal"><div class="card result-card zen-result">
    ${newBest ? `<div class="new-best">${esc(tr('zenOver.newBest'))}</div>` : ''}
    <h2>${esc(tr('zenOver.title'))}</h2>
    <div class="big-score" data-score>0</div>
    ${res.autoplay ? autoplayNote() : ''}
    <p>${esc(line || tr('zenOver.best', { n: fmt(bestNow) }))}</p>
    ${chain ? `<div class="highlight"><span>${esc(tr('result.bestMoment'))}</span><b>${esc(chainText(chain))}</b></div>` : ''}
    <div class="stats">
      <div class="stat"><b>${res.sector}</b><span>${esc(tr('result.stat.sector'))}</span></div>
      <div class="stat"><b>×${Math.max(1, res.maxCombo)}</b><span>${esc(tr('result.stat.combo'))}</span></div>
      <div class="stat"><b style="font-size:15px;line-height:24px">${res.maxTier ? esc(tierName(res.maxTier)) : '—'}</b><span>${esc(tr('result.stat.biggest', { piece: pieceWord().toUpperCase(), gender: pieceGender() }))}</span></div>
    </div>
    <div class="earn-row"><div class="earn"><span class="coin"></span><span data-earn>0</span></div></div>
    <p class="zen-note">${esc(tr('zenOver.note'))}</p>
    <button class="btn zen hero" data-again>${esc(tr('zenOver.again'))}</button>
    <button class="btn ghost" data-home>${esc(tr('result.home'))}</button>
  </div></div>`));
  const scoreEl = node.querySelector('[data-score]');
  const earnEl = node.querySelector('[data-earn]');
  (async () => {
    await countUp(scoreEl, 0, res.score, Math.min(1400, 400 + res.score / 8));
    if (newBest) Svc.sfx('newbest');
    await countUp(earnEl, 0, res.coins || 0, 600);
  })();
  let leaving = false;
  tap(node.querySelector('[data-again]'), () => { if (leaving) return; leaving = true; close(node); onAgain(); }, click);
  tap(node.querySelector('[data-home]'), () => { if (leaving) return; leaving = true; close(node); onHome(); }, click);
  return node;
}

/** Journey results (win or fail). */
/**
 * Nova Streak note on a Journey result (src/meta/winStreak.js): charge pips + one honest, calm line.
 * Information only: no button, no price, no ad, no countdown, never "don't lose it".
 */
function streakNoteHtml(st, level = 99) {
  if (!st || !st.line) return '';
  let pips = '';
  for (let i = 0; i < STREAK_MAX; i++) pips += `<i class="${i < st.charges ? 'on' : ''}"></i>`;
  // docs/UX_RETENTION.md item 6: the line only when the charge count changed; a steady 3/3 shows the pips alone
  // (labelled). Before Level 11 (where Wild Sugar is introduced) it names the gift in plain words (café look only).
  const line = pageLook() === 'cosmic' ? st.line : plainStreakLine(st.line, level);
  if (!streakLineShown(st)) return `<div class="streak-note quiet"><span class="streak-pips" role="img" aria-label="${esc(line)}">${pips}</span></div>`;
  return `<div class="streak-note"><span class="streak-pips" aria-hidden="true">${pips}</span><span>${esc(line)}</span></div>`;
}

/** "Closing time" bonus line on a Journey win card (src/game/closing.js): the spare drops and the points they added. */
function closingLineHtml(c, short = false) {
  if (!c || !(c.drops > 0)) return '';
  // large text (docs/UX_RETENTION.md item 7b): "Closing time: +3,750 · +5 coins"
  // docs/UX_RESULT_CARDS.md §1 block 4: "Closing time: 10 spare drops → +2,500 points" (large text: "Closing time:
  // +2,500 points"). Its coins are already inside the card's "+N coins" chip, so they are not repeated here.
  const pts = `<span class="closing-coins">${esc(tr('result.closing.points', { n: c.score.toLocaleString('en-US') }))}</span>`;
  if (short) return `<p class="closing-line"><b>${esc(tr('result.closing.label'))}</b> ${pts}</p>`;
  return `<p class="closing-line"><b>${esc(tr('result.closing.label'))}</b> <span class="closing-coins">${esc(trp('result.closing.drops', c.drops, { n: c.drops.toLocaleString('en-US') }))}</span> <span class="closing-coins">→ ${esc(tr('result.closing.points', { n: c.score.toLocaleString('en-US') }))}</span></p>`;
}

// ---- one meaning for ★ (docs/UX_STARS.md): the café star vs. the 1–3 finish rating

/** The 1–3 rating marks: blossoms (filled = earned, outline = not yet) or, in the Cosmic look, four-point sparkles.
 * Each mark holds both shapes so a reveal can fill it in place (live: start all empty). */
export function ratingMarksHtml(n, { live = false } = {}) {
  const cosmic = pageLook() === 'cosmic';
  const on = cosmic ? ICONS.sparkle : ICONS.blossom;
  const off = cosmic ? ICONS.sparkleEmpty : ICONS.blossomEmpty;
  const got = Math.max(0, Math.min(3, Math.floor(Number(n) || 0)));
  let h = '';
  for (let i = 0; i < 3; i++) h += `<span class="bl${!live && i < got ? ' on' : ''}">${off}${on}</span>`;
  return h;
}

/** "Great finish" plus its blossoms, as one labelled line. variant 'hero' = the replay card's big finish. */
function finishLineHtml(n, variant = '') {
  const got = Math.max(1, Math.min(3, Math.floor(Number(n) || 0)));
  const fw = finishWord(got);
  const label = pageLook() === 'cosmic' ? tr('result.finish.sparkles', { word: fw, n: got }) : tr('result.finish.blossoms', { word: fw, n: got });
  return `<div class="finish-line${variant ? ` ${variant}` : ''}" role="img" aria-label="${esc(label)}"><b class="finish-word">${esc(fw)}</b><span class="finish-marks">${ratingMarksHtml(got, { live: true })}</span></div>`;
}

/** The first clear's one café ★ (72 px) and its line (the win card shows the line as a reward chip instead). */
function cafeStarPopHtml({ line = true } = {}) {
  const pop = `<div class="cafe-star-pop" role="img" aria-label="${esc(tr('result.starLabel'))}">${ICONS.star}</div>`;
  return line ? `${pop}<p class="cafe-star-line" aria-hidden="true">${tr('result.starLine', { star: '<span class="ink-star">★</span>' })}</p>` : pop;
}

/** The reveal: the café ★ pops at 350 ms (merge sfx), then the blossoms fill one by one. Calm / reduced motion: all at
 * once, no stagger. The same for every ad state. Returns when it is over (ms), for the coin count. */
function playRewardReveal(node, got) {
  const still = document.body.classList.contains('calm') || deviceReducedMotion();
  const star = node.querySelector('.cafe-star-pop .star');
  const marks = [...node.querySelectorAll('.finish-line .bl')];
  const n = Math.max(0, Math.min(marks.length, got));
  if (still) {
    if (star) star.classList.add('on');
    for (let i = 0; i < n; i++) marks[i].classList.add('on');
    if (star || n) setTimeout(() => { Svc.sfx('merge', { tier: 6, combo: 1 }); Svc.haptic('light'); }, 200);
    return 350;
  }
  let t = 350;
  if (star) { setTimeout(() => { star.classList.add('on'); Svc.sfx('merge', { tier: 8, combo: 1 }); Svc.haptic('light'); }, t); t += 450; }
  for (let i = 0; i < n; i++) {
    setTimeout(() => { marks[i].classList.add('on'); Svc.sfx('merge', { tier: 4 + i * 2, combo: 1 }); Svc.haptic('light'); }, t + i * 320);
  }
  return t + n * 320;
}

export function showLevelResult(app, res, { onNext, onRetry, onMap, onDone, onSkip = null }) {
  const save = app.save;
  if (res.won && res.tutorial === 'first' && !res.tutorialSkipped && !res.autoplay) { showLessonWin(app, res, onDone || onMap); return; }
  // first session (src/meta/onboarding.js): through Level 4 the card is light.
  // the journal and ad-break lines, the keeper line, the stop card and "Done for now" appear from
  // Level 5 (they still accumulate silently before that). The same for every ad state.
  const full = fullResultCard(res.level);
  if (!res.won) {
    const node = open(el(`<div class="screen modal"><div class="card result-card">
      <h2>${esc(tr('result.levelFailed', { n: res.level }))}</h2>
      ${res.autoplay ? autoplayNote() : ''}
      ${res.reflection ? reflectionHtml(res.reflection) : `${res.remaining ? `<p>${esc(res.remaining)}</p>` : ''}<p>${esc(tr('result.everyAttempt'))}</p>`}
      ${streakNoteHtml(res.streak, res.level)}
      ${keeperLineHtml(app, 'fail')}
      <button class="btn primary" data-retry>${esc(tr('result.tryAgain'))}</button>
      <button class="btn ghost" data-map>${esc(tr('result.levels'))}</button>
      ${full ? resultNotesHtml(res) : ''}
      ${testerSkipHtml(onSkip)}
    </div></div>`));
    paintKeeperLine(node);
    tap(node.querySelector('[data-retry]'), () => { close(node); onRetry(); }, click);
    tap(node.querySelector('[data-map]'), () => { close(node); onMap(); }, click);
    tap(node.querySelector('[data-tester-skip]'), () => { close(node); onSkip(); }, click);
    return;
  }
  // docs/UX_RESULT_CARDS.md §1: one job per card. Title, one hero, one rewards row, the closing line, one note; then
  // Play on (the only filled button), one outlined way out of the same height, a quiet row and the ad fine print.
  // The café task lives on Home now (Pip names it there), the closing-time rule is taught on the board, and the
  // Journal / season lines, stop teaser, keeper line and Levels link moved to their own screens. Same for every ad state.
  // One meaning for ★ (docs/UX_STARS.md §3): a first clear earns ONE café star; the 1–3 rating is a word plus blossoms.
  const firstClear = !!res.firstTime;
  const prev = Math.max(0, Math.min(3, res.prevStars || 0));
  const big = Number(save.settings && save.settings.textSize) >= 1.25;
  const heroHtml = firstClear
    ? `${cafeStarPopHtml({ line: false })}${finishLineHtml(res.stars)}`
    : `${finishLineHtml(res.stars, 'hero')}${prev > 0 ? `<p class="best-line">${esc(res.stars > prev ? tr('result.newBestFinish') : tr('result.bestHere', { word: finishWord(prev) }))}</p>` : ''}`;
  // rewards: "★ +1 for the café" (first clear) and "+55 coins" (everything this card paid, closing coins included)
  const rewardsHtml = `<div class="reward-row">${firstClear ? `<span class="reward-chip star-chip" aria-hidden="true">${tr('result.starLine', { star: '<span class="ink-star">★</span>' })}</span>` : ''}${coinChipHtml()}</div>`;
  // the note slot (src/meta/resultNote.js): goodnight > gift > streak changed > tricky > the one-time replay explainer
  const giftSkin = res.gift && res.gift.skin ? (SKINS.find((k) => k.id === res.gift.skin) || {}) : null;
  const note = winNote({
    goodnight: full && !!goodnightNoteHtml(res, save),
    gift: !!giftSkin,
    streak: res.level >= 3 && !!(res.streak && res.streak.line && streakLineShown(res.streak)),
    tricky: full && res.kind !== 'normal',
    replay: !firstClear && !res.autoplay && !(save.mechSeen && save.mechSeen.replayStar),
  });
  let noteHtml = '';
  if (note === 'goodnight') noteHtml = goodnightNoteHtml(res, save);
  else if (note === 'gift') noteHtml = `<p class="result-note-slot gift-note">${esc(tr('result.giftNote', { name: giftSkin.name || res.gift.skin }))}</p>`;
  else if (note === 'streak') noteHtml = streakNoteHtml(res.streak, res.level);
  else if (note === 'tricky') noteHtml = `<p class="result-note-slot">${esc(res.kind === 'superhard' ? tr('result.trickySuper') : tr('result.tricky'))}</p>`;
  else if (note === 'replay') {
    noteHtml = `<p class="result-note-slot replay-note">${esc(res.coins > 0 ? tr('result.replayNoteCoins') : tr('result.replayNote'))}</p>`;
    save.mechSeen = save.mechSeen || {}; save.mechSeen.replayStar = true; app.persist(); // counts as seen only when shown
  }
  // the one calm way out: Goodnight (when that note shows), Done for now (Level 5+) or Home (Levels 2–4)
  const outHtml = note === 'goodnight'
    ? `<button class="btn ghost" data-goodnight>${esc(tr('goodnight.title'))}</button>`
    : full ? `<button class="btn ghost" data-done>${esc(tr('result.doneForNow'))}</button>`
      : `<button class="btn ghost" data-home>${esc(tr('result.home'))}</button>`;
  const quiet = [full && res.coins > 0 ? doubleBtnHtml() : '', res.stars < 3 ? `<button class="linkish" data-retry>${esc(tr('result.replay'))}</button>` : ''].filter(Boolean);
  const node = open(el(`<div class="screen modal"><div class="card result-card win-card${full ? '' : ' light'}${big ? ' big-text' : ''}">
    <h2>${esc(tr('result.levelComplete', { n: res.level }))}</h2>
    ${res.autoplay ? autoplayNote() : ''}
    <div class="rc-hero">${heroHtml}</div>
    ${rewardsHtml}
    ${closingLineHtml(res.closing, big)}
    ${noteHtml}
    <div class="rc-actions"><button class="btn primary" data-next>${esc(tr('result.playOn'))}</button>${outHtml}</div>
    ${quiet.length ? `<div class="quiet-row">${quiet.join('')}</div>` : ''}
    ${full ? adNoteHtml(res) : ''}
  </div></div>`));
  const revealEnd = playRewardReveal(node, res.stars);
  const earnEl = node.querySelector('[data-earn]');
  let shown = res.coins;
  setTimeout(() => countCoins(earnEl, 0, res.coins, 700), revealEnd);
  if (giftSkin) setTimeout(() => { Svc.sfx('discover', { tier: 5 }); Svc.haptic('success'); }, revealEnd + 100);
  const dbl = node.querySelector('[data-double]');
  tap(dbl, async () => {
    dbl.disabled = true;
    const ok = await Svc.showRewarded('double_coins');
    if (ok) {
      save.coins += res.coins; app.persist();
      const from = shown; shown += res.coins;
      countCoins(earnEl, from, shown, 600);
      Svc.sfx('coin'); dbl.textContent = tr('result.doubled');
    } else { dbl.disabled = false; toast(tr('result.adUnavailable')); }
  }, click);
  let leaving = false;
  const go = (fn) => { if (leaving) return; leaving = true; close(node); fn(); };
  tap(node.querySelector('[data-next]'), () => go(onNext), click);
  // "Done for now": a quiet Home visit (no cards). On her first play day, with tonight's gift still waiting, the evening
  // ends on it: the "Before you go" card (docs/UX_RETENTION.md item 1).
  tap(node.querySelector('[data-done]'), () => go(() => {
    if (!onDone) { onMap(); return; }
    onDone({ quiet: true });
    const back = () => { if (app.onMetaChanged) app.onMetaChanged(); Svc.showMenuBanner(); };
    // the one-time Evening calm offer (docs/UX_FIRST_WEEK.md F5) rides on the oven card, or has a small card of its own
    const calmAsk = !res.autoplay && calmOfferDue(save, loadCalmAsked());
    if (eveningOneGiftDue(save)) showDailyReward(app, { mode: 'beforeYouGo', onClose: back });
    else if (!res.autoplay && bakeOfferDue(save, { doneForNow: true, won: true, mode: 'journey', sinceAdS: Svc.secondsSinceAd() })) showOvenCard(app, { onDone: back, calmOffer: calmAsk });
    else if (calmAsk) showCalmOffer(app, { onDone: back });
  }), click);
  tap(node.querySelector('[data-home]'), () => go(onDone || onMap), click); // the light card's way Home (Q9)
  tap(node.querySelector('[data-retry]'), () => go(onRetry), click);
}

/** "How to play" is over (docs/UX_FIRST_RUN.md): one line and Back. Nothing was saved. */
export function showPracticeEnd(app, onBack) {
  const node = open(el(`<div class="screen modal"><div class="card result-card light practice-end" role="dialog" aria-labelledby="practice-end-t">
    <h2 id="practice-end-t">${esc(LESSON_COPY.practiceEnd)}</h2>
    <button class="btn primary" data-back>${esc(tr('result.back'))}</button>
  </div></div>`));
  tap(node.querySelector('[data-back]'), () => { close(node); if (onBack) onBack(); }, click);
  return node;
}

/** The guided Level 1's win card (T6): one café ★, one line, one button (no blossoms: one new idea at a time,
 * docs/UX_STARS.md §3). Coins and the bonus are still paid quietly. */
function showLessonWin(app, res, onDone) {
  const node = open(el(`<div class="screen modal"><div class="card result-card light lesson-win" role="dialog" aria-labelledby="lesson-win-t">
    <h2 id="lesson-win-t">${esc(tr('result.levelComplete', { n: fmt(res.level) }))}</h2>
    ${cafeStarPopHtml()}
    <p class="lesson-win-body">${esc(LESSON_COPY.winBody)}</p>
    <button class="btn primary" data-done>${esc(LESSON_COPY.winButton)}</button>
  </div></div>`));
  playRewardReveal(node, 0);
  let leaving = false;
  tap(node.querySelector('[data-done]'), () => { if (leaving) return; leaving = true; close(node); onDone(); }, click);
  return node;
}

// ==================================================================== v0.5.3: RESULT NOTES, SKILL JOURNAL, EVENING

/**
 * Fine print at the bottom of result screens: first-time Skill Journal feats, and the honest ad-break
 * line (main.js reads it from AdDirector's caps; null when ads are unavailable or for autoplay).
 */
function resultNotesHtml(res, { goodnight = true } = {}) {
  const lines = [goodnight ? goodnightLineHtml(res, shopApp && shopApp.save) : ''];
  if (res && res.journalLine && !res.autoplay) lines.push(`<p class="result-note journal-note">${esc(res.journalLine)}</p>`);
  if (res && res.seasonLine && !res.autoplay) lines.push(`<p class="result-note season-note">${esc(res.seasonLine)}</p>`);
  if (res && res.adLine && !res.autoplay) lines.push(`<button class="result-note ad-note" data-adinfo aria-label="${esc(tr('result.adLineLabel', { line: res.adLine }))}">${esc(res.adLine)} <span class="ad-why">${esc(tr('result.adWhy'))}</span></button>`);
  return lines.join('');
}

export const JOURNAL_ICON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/><path d="M9 8h6"/></svg>';

/** Tiny line chart (inline SVG) of values 0..100, oldest to newest. */
function sparkSvg(values) {
  const n = values.length;
  if (n < 2) return '';
  const W = 280, H = 56, pad = 4;
  const pts = values.map((v, i) => `${(pad + (i * (W - 2 * pad)) / (n - 1)).toFixed(1)},${(H - pad - (Math.max(0, Math.min(100, v)) / 100) * (H - 2 * pad)).toFixed(1)}`).join(' ');
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Drops that merged, game by game, last ${n} games"><line x1="${pad}" y1="${H / 2}" x2="${W - pad}" y2="${H / 2}" class="spark-mid"/><polyline points="${pts}" fill="none"/></svg>`;
}

/**
 * Skill Journal: the player's own numbers, as information only. No ranks, no comparisons with other
 * players, no rewards, and no claims about brain or health benefits.
 */
export function showJournal(app, onClose) {
  // v3: the Journal is its own sheet (Home › More, from Level 30): the puzzle week, then the Skill Journal
  const node = open(el(`<div class="screen modal"><div class="card journal-card">
    <h2>Journal</h2>
    ${weeklyJournalHtml(app.save)}
    <h3 class="more-h3">Skill Journal</h3>
    ${journalBodyHtml(app)}
    <button class="btn primary" data-done>${esc(tr('common.done'))}</button>
  </div></div>`));
  bindWeeklyJournal(node, app.save);
  tap(node.querySelector('[data-done]'), () => { close(node); if (onClose) onClose(); }, click);
  return node;
}

/** Skill Journal contents (no title, no buttons). */
function journalBodyHtml(app) {
  const j = journalSummary(app.save);
  const pct = (v) => `${Math.round(v)}%`;
  const empty = j.games === 0;
  const topName = j.top ? tierName(j.top) : '—';
  const trendHtml = j.trend
    ? j.trend.lines.map((l) => `<p class="j-trend">${esc(l)}</p>`).join('')
    : `<p class="j-trend muted">After ${TREND_RECENT + TREND_MIN_EARLIER} games, your last ${TREND_RECENT} are compared with the ones before (${fmt(Math.min(j.spark.length, TREND_RECENT + TREND_MIN_EARLIER))} so far).</p>`;
  const featsHtml = j.feats.map((f) => `<li class="${f.done ? 'done' : ''}"><span class="j-feat">${f.done ? '✦' : '·'} ${esc(skinTierText(f.name))}</span><span class="j-date">${f.done ? esc(featDateText(f.date)) : 'Not yet'}</span></li>`).join('');
  return `<p class="j-intro">Your own numbers, for you only. No ranks and no comparing with other players. Games played with Autoplay don't count.</p>
    ${empty ? '<p class="j-trend muted">Play a game and your numbers will show up here.</p>' : `
    <div class="j-grid">
      <div class="j-stat"><b>${j.avgChain.toFixed(1)}</b><span>Average chain (steps)</span></div>
      <div class="j-stat"><b>${pct(j.mergePct)}</b><span>Drops that merged</span></div>
      <div class="j-stat"><b>${fmt(j.longest)}</b><span>Longest chain (steps)</span></div>
      <div class="j-stat"><b class="j-tier">${esc(topName)}</b><span>Biggest ${pieceWord()} made</span></div>
    </div>
    <p class="j-fine">${fmt(j.games)} game${j.games === 1 ? '' : 's'} · ${fmt(j.drops)} drops${j.since ? ` since ${esc(featDateText(j.since))}` : ''}</p>
    <h3>Trends</h3>
    ${trendHtml}
    ${j.spark.length >= 2 ? `<div class="j-spark">${sparkSvg(j.spark)}<div class="j-spark-cap"><span>Drops that merged, game by game (last ${j.spark.length})</span></div></div>` : ''}`}
    <h3>First times</h3>
    <ul class="j-feats">${featsHtml}</ul>`;
}

/**
 * Evening wind-down offer (menu only, at most once per evening, never with an ad on screen).
 * onAnswer('yes' | 'no' | 'never'). No "keep playing" button: the choices only change comfort.
 */
export function showEveningOffer(app, onAnswer, { zen = false } = {}) {
  const node = open(el(`<div class="screen modal"><div class="card evening-card">
    <h2>${esc(tr('evening.title'))}</h2>
    <p>${esc(tr('evening.lead'))}</p>
    <p class="sub">${esc(tr('evening.sub'))}</p>
    ${app.save.settings.soundBackdrop === 'rain' ? '' : `<button class="linkish" data-rain>${esc(tr('evening.rain'))}</button>`}
    <button class="btn primary" data-yes>${esc(tr('evening.yes'))}</button>
    ${zen ? `<button class="btn zen" data-zen>${esc(tr('evening.zen'))} <small>${esc(tr('evening.zenSub'))}</small></button>` : ''}
    <button class="btn" data-no>${esc(tr('common.noThanks'))}</button>
    <button class="linkish" data-never>${esc(tr('evening.never'))}</button>
  </div></div>`));
  let done = false;
  const pick = (v) => { if (done) return; done = true; close(node); onAnswer(v); };
  tap(node.querySelector('[data-yes]'), () => pick('yes'), click);
  tap(node.querySelector('[data-zen]'), () => pick('zen'), click);
  tap(node.querySelector('[data-no]'), () => pick('no'), click);
  tap(node.querySelector('[data-never]'), () => pick('never'), click);
  const rain = node.querySelector('[data-rain]');
  if (rain) tap(rain, () => { app.setSetting('soundBackdrop', 'rain'); Svc.previewSoundBackdrop('rain'); rain.textContent = tr('evening.rainOn'); rain.disabled = true; }, click);
  return node;
}

/**
 * Welcome-back card (src/meta/welcomeBack.js): a calm summary from the real save and one modest gift
 * that is already added. No ad, no timer, no guilt copy. onDone(true) = play the current level.
 */
export function showWelcomeBack(app, summary, onDone) {
  const node = open(el(`<div class="screen modal"><div class="card welcome-card">
    <h2>${esc(summary.title)}</h2>
    ${summary.lines.map((l) => `<p class="wb-line">${esc(l)}</p>`).join('')}
    <p class="wb-gift"><span class="coin"></span>${esc(summary.gift)}</p>
    <button class="btn primary" data-play>${ICONS.play.replace('<svg', '<svg width="22" height="22"')} ${esc(tr('home.play', { n: summary.level }))}</button>
    <button class="btn ghost" data-x>${esc(tr('common.close'))}</button>
  </div></div>`));
  let done = false;
  const pick = (v) => { if (done) return; done = true; close(node); onDone(v); };
  tap(node.querySelector('[data-play]'), () => pick(true), click);
  tap(node.querySelector('[data-x]'), () => pick(false), click);
  return node;
}

// ==================================================================== STAR KEEPERS
// Keepers are pure cosmetics (no gameplay effect). v3: they are earned in the café, never sold or drawn.

/** Small "Keeper says" row for result screens. */
function keeperLineHtml(app, moment) {
  const k = equippedKeeper(app.save);
  const o = equippedOutfit(app.save);
  // win: a happy bounce, then proud; fail: a short sad moment, then encouraging (never a nudge toward ads)
  const react = moment === 'win' ? 'win' : moment === 'fail' ? 'lose' : '';
  return `<div class="keeper-line"><canvas class="keeper-canvas" data-keeper="${esc(k.id)}"${o ? ` data-outfit="${esc(o)}"` : ''}${react ? ` data-react="${react}"` : ''}></canvas><span><b>${esc(k.name)}:</b> “${esc(keeperLine(k, moment))}”</span></div>`;
}

function paintKeeperLine(node) {
  requestAnimationFrame(() => animateKeepersIn(node));
}

/**
 * Second-tab safety for coin spending on owned-forever items: if another tab or window changed the stored save
 * (`differs(mem, stored)`), refuse, reload this tab's copy and say so. Returns true if safe.
 */
function storedStateFresh(app, differs) {
  let stored = null;
  try { const raw = localStorage.getItem(SAVE_KEY); stored = raw ? JSON.parse(raw) : null; } catch (_) { stored = null; }
  if (!differs(app.save, stored)) return true;
  const fresh = loadSave();
  for (const k of Object.keys(app.save)) if (!(k in fresh)) delete app.save[k];
  Object.assign(app.save, fresh);
  refreshCoins(app.save);
  toast('Updated in another tab. Reopen the sheet to see the latest.', false, 3200);
  return false;
}

/** Keepers sheet: tabs Keepers (equip) · Story (replay). v3: Keepers are earned in the café, never sold. */
export function showKeepers(app, tab = 'keepers', onClose) {
  const save = app.save;
  const node = open(el(`<div class="screen solid"><div class="page keepers-page">
    <div class="topbar sticky" style="width:100%"><button class="icon-btn" data-back aria-label="Back">${ICONS.back}</button><h1>Star Keepers</h1>${coinPill(save)}</div>
    <div class="tabs">
      <button class="tab" data-tab="keepers">Keepers</button>
      <button class="tab" data-tab="story">Story</button>
    </div>
    <div class="kp-body"></div>
  </div></div>`));
  const body = node.querySelector('.kp-body');

  const render = (t) => {
    tab = t;
    for (const b of node.querySelectorAll('.tab')) b.classList.toggle('on', b.dataset.tab === t);
    refreshCoins(save);
    body.innerHTML = '';
    if (t === 'story') renderStory();
    else renderKeepers();
    requestAnimationFrame(() => animateKeepersIn(body));
  };

  const renderKeepers = () => {
    const eq = equippedKeeper(save).id;
    body.appendChild(el('<p class="kp-lead">Keepers keep you company on the menu and in your games. They are just for fun and never change the game.</p>'));
    const grid = el('<div class="kp-grid"></div>');
    for (const k of KEEPERS) {
      const owned = ownsKeeper(save, k.id);
      const state = k.id === eq ? '<span class="kp-state on">With you ✓</span>'
        : owned ? '<span class="kp-state">Tap to choose</span>'
        : '<span class="kp-state">Not found yet</span>';
      const b = el(`<button class="kp-card ${owned ? '' : 'missing'} ${k.id === eq ? 'on' : ''}" aria-label="${esc(owned ? `${k.name}, ${k.title}` : tr('keepers.notFoundLabel', { name: k.name, title: k.title }))}">
        <canvas class="keeper-canvas" data-keeper="${esc(k.id)}"${k.id === eq && equippedOutfit(save) ? ` data-outfit="${esc(equippedOutfit(save))}"` : ''}></canvas>
        <span class="kp-name">${esc(k.name)}</span><span class="kp-title">${esc(k.title)}</span>${state}</button>`);
      tap(b, () => {
        if (!owned) { toast(tr('keepers.metInCafe', { name: k.name }), false, 2200); return; }
        if (k.id !== eq && equipKeeper(save, k.id)) { app.persist(); toast(tr('keepers.withYouNow', { name: k.name }), true, 1800); render('keepers'); }
      }, click);
      grid.appendChild(b);
    }
    body.appendChild(grid);
    // Keeper outfits (former Starlight Season premium track): only shown once at least one is owned
    const outfits = (save.outfits && save.outfits.owned) || [];
    if (outfits.length) {
      const cur = equippedOutfit(save);
      const row = el(`<div class="kp-outfits"><b>Outfits</b><div class="kp-outfit-row">
        <button class="kp-outfit ${cur ? '' : 'on'}" data-outfit="">None</button>
        ${OUTFITS.filter((o) => outfits.includes(o.id)).map((o) => `<button class="kp-outfit ${cur === o.id ? 'on' : ''}" data-outfit="${esc(o.id)}">${esc(o.name)}</button>`).join('')}
      </div></div>`);
      for (const b of row.querySelectorAll('[data-outfit]')) tap(b, () => { if (equipOutfit(save, b.dataset.outfit || null)) { app.persist(); render('keepers'); } }, click);
      body.appendChild(row);
    }
    body.appendChild(el('<p class="kp-note">Keepers you haven\'t met yet are earned in the café, never sold.</p>'));
  };

  const renderStory = () => {
    body.appendChild(el('<p class="kp-lead">Pip tells a little of the story each time you reach a new chapter of the Journey. Replay any part here.</p>'));
    const can = replayableChapters(save);
    const list = el('<div class="track-list"></div>');
    STORY.forEach((lines, ch) => {
      const avail = can.includes(ch);
      const r = el(`<button class="track-row bd-row ${avail ? '' : 'off locked'}" ${avail ? '' : 'aria-disabled="true"'}>
        <span class="bd-swatch big" style="background:${backdropSwatchCss(BACKDROPS[ch])}"></span>
        <span class="track-text"><span class="track-name">${esc(chapterTitle(ch))}</span><span class="track-blurb">${avail ? `${lines.length} lines · tap to read` : `Reach level ${chapterStartLevel(ch)}`}</span></span>
        ${avail ? '' : '<span class="bd-lock">🔒</span>'}</button>`);
      tap(r, () => { if (avail) showStory(app, ch); else toast(`Reach level ${chapterStartLevel(ch)} to read this chapter`); }, click);
      list.appendChild(r);
    });
    body.appendChild(list);
  };

  for (const b of node.querySelectorAll('.tab')) tap(b, () => render(b.dataset.tab), click);
  tap(node.querySelector('[data-back]'), () => { close(node); if (onClose) onClose(); else if (app.onMetaChanged) app.onMetaChanged(); }, click);
  render(tab);
  return node;
}

/** Pip's chapter story: 2–3 short lines, always skippable. Calls onDone when closed. */
export function showStory(app, ch, onDone) {
  const lines = STORY[ch] || [];
  markStorySeen(app.save, ch);
  app.persist();
  let i = 0;
  const node = open(el(`<div class="screen modal"><div class="card story-card">
    <canvas class="keeper-canvas story-keeper" data-keeper="pip"></canvas>
    <span class="dkicker">${esc(chapterTitle(ch))}</span>
    <p class="story-line" aria-live="polite"></p>
    <div class="story-dots" aria-hidden="true">${lines.map(() => '<i></i>').join('')}</div>
    <button class="btn primary" data-next>Next</button>
    <button class="btn ghost" data-skip>Skip</button>
  </div></div>`));
  paintKeeperLine(node);
  const lineEl = node.querySelector('.story-line');
  const nextBtn = node.querySelector('[data-next]');
  const skipBtn = node.querySelector('[data-skip]');
  const show = () => {
    lineEl.textContent = lines[i] || '';
    node.querySelectorAll('.story-dots i').forEach((d, k) => d.classList.toggle('on', k <= i));
    const last = i >= lines.length - 1;
    nextBtn.textContent = last ? 'Let’s go' : 'Next';
    skipBtn.classList.toggle('hidden', last);
  };
  let done = false;
  const finish = () => { if (done) return; done = true; close(node); if (onDone) onDone(); };
  tap(nextBtn, () => { if (i >= lines.length - 1) finish(); else { i++; show(); } }, click);
  tap(skipBtn, finish, click);
  show();
  return node;
}
