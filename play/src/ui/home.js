// v3 Home (DESIGN.md "v3 home and flow"): Nova's Seaside Café is the home screen. The living café scene fills it
// (src/ui/cafeView.js); on top sit one big Play button, a Restore button when there is something to fix, and a row
// of calm labelled buttons that grows in a fixed order: Today · Shop · Wardrobe · More. Pip talks through the café's
// own bubble. Everything else lives one tap away in the Today and More sheets, and each part appears only once its
// level is cleared (onboarding.UNLOCKS): locked things are hidden, never teased. When something unlocks, Home shows
// one unlock moment (src/meta/homeNav.js): a short card saying what it is and where, and a gentle highlight on its
// button. No timers, no countdowns, no ad state anywhere on Home.
//
// screens.js showMenu() calls renderHome(); the node keeps the class "screen menu" because main.js waits for a
// quiet menu (only that screen open) before it shows its one-at-a-time cards.
import { el, fmt, esc, tap, ICONS } from './dom.js';
import { t as tr, tp as trp } from './i18n.js'; // `tr`: `t` is a local name in this file
import { mountCafe } from './cafeView.js';
import { cafeSummary, areaState } from '../meta/cafe.js';
import { CAFE_AREA_BY_ID } from '../meta/cafeData.js';
import { paintAreaPostcard } from '../game/cafeArt.js';
import { sharePostcard, renderPostcard } from './postcardArt.js';
import { visitorPostcard, postcardCaption } from '../meta/postcard.js';
import { VISITORS, VISITOR_BY_ID, visitorsHere, visitorCards, visitorStatus, albumOpen } from '../meta/visitors.js';
import { paintVisitorScene, paintVisitor, visitorBox } from '../game/visitorArt.js';
import { Svc } from '../meta/services.js';
import { getLevel, goalText, LEVEL_COUNT } from '../game/levels.js';
import { homeIcons, unlocked, skipIntroOnPlay, v3CardDue, markV3CardSeen } from '../meta/onboarding.js';
import { shopDotOn } from '../meta/shopTour.js';
import { nextUnlockMoment, markUnlockSeen, momentCopy } from '../meta/homeNav.js';
import { unlockCardHtml } from './shopTourUI.js';
import { wearSeasideLook, uiLook } from '../meta/looks.js';
import { word, cozyText, tierGoalText } from './copy.js';
import { COPY as LESSON_COPY, cafeRevealDue } from '../meta/firstRun.js';
import { dailyRewardState, dayKey } from '../meta/daily.js';
import { keepsakeFrame } from '../meta/seasonal.js'; // Season Keepsakes postcard frame
import { passState } from '../meta/pass.js';
import { ensureOrbits, claimableOrbits, orbitsSummary } from '../meta/orbits.js';
import { todayCount } from '../meta/shopMenu.js';
import { quietCopy, quietActiveLine, quietUntilLabel, leftLabel } from '../meta/quietEvening.js';
import { showFriendEnter } from './challengeView.js';
import { seasonRow, seasonMoment, markSeasonMet, showSeasonCard, SEASON_ICON } from './seasonalView.js'; // seasonal events
import { bakeStripNode, showBakeBook, bakeBookSub } from './bakeView.js'; // Tonight's bake (docs/UX_TONIGHTS_BAKE.md)
import { bookCount } from '../meta/bakes.js';
import * as S from './screens.js'; // circular on purpose: only used inside functions, never at load time

const click = () => Svc.sfx('ui');
const newTag = () => ` <span class="nav-tag">${esc(tr('home.newTag'))}</span>`; // a word, never a "!" or a number
const FRIEND_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 19.5c.6-3.4 2.8-5.2 5.5-5.2s4.9 1.8 5.5 5.2"/><circle cx="17" cy="9" r="2.4"/><path d="M15.6 14.4c2.4-.4 4.3 1 4.9 4.1"/></svg>';
const POSTCARD_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M13 9.5v6"/><path d="M5.5 10h5M5.5 13h5"/><rect x="15.5" y="8.5" width="3" height="3.5" rx=".5"/></svg>';
const HOWTO_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.2-2.4 3.6"/><path d="M12 17h.01"/></svg>';
const CUP_ICON ='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M8 3.5c-.6.8-.6 1.7 0 2.5M12 3.5c-.6.8-.6 1.7 0 2.5"/></svg>';

/**
 * Home before Level 1 is won (a lesson left early, or a new player who skipped it and quit): one line, no
 * auto-advance (docs/UX_FIRST_RUN.md). A brand-new player starts in the guided Level 1 instead of here.
 */
export const FIRST_RUN_LINES = [LESSON_COPY.homeNew];
/** After the first win: the café is waiting for its first star. */
/** The same moment for a player who arrives with several stars (a returning player, or one who played on first). */
export const firstStarLine = (n) => (n > 1 ? tr('home.firstStars', { n: fmt(n) }) : tr('home.firstStar'));

let cafe = null;      // the live café on Home (destroyed on every re-render)
let cafeHost = null;

const reducedNow = (save) => () => !!(save.settings && save.settings.calm)
  || (typeof document !== 'undefined' && document.body && document.body.classList && document.body.classList.contains('calm'));

/** True when the café has something to show (it has areas left or something already built). */
function anyBuilt(save) { return !!(save.cafe && save.cafe.done && Object.keys(save.cafe.done).length); }

/**
 * Home's Restore button: only when the next piece can be built now. Otherwise the café's area card shows one quiet
 * "Next: … · ★n" line instead (mountCafe nextLine), so Home never holds a button that does nothing
 * (docs/UX_FEATURE_GATES.md finding 3). It comes back as soon as she has the stars.
 */
export function restoreButton(sum, save) {
  if (!sum || !sum.canBuild || sum.outOfContent) return null;
  return { primary: true, stars: sum.available };
}

/** What Today holds right now. Today's Special from Level 8, Today tasks (Daily Orbits) from Level 15. */
export function todayItems(save) {
  const daily = dailyRewardState(save);
  const pass = passState(save);
  const tasks = unlocked(save, 'today');
  return {
    daily, pass,
    special: unlocked(save, 'special'),
    orbits: tasks ? orbitsSummary(save) : null,
    counts: { dailyAvailable: daily.available, orbitsReady: tasks ? claimableOrbits(save) : 0, passClaimable: pass.claimable },
  };
}

/** The More sheet rows for this save, in order (locked ones are left out). */
export function moreRows(save) {
  const look = uiLook(save);
  const rows = [{ key: 'map', name: word('map', look), sub: tr('more.mapSub') }];
  if (unlocked(save, 'freePlay')) rows.push({ key: 'freeplay', name: word('freePlay', look), sub: tr('more.freePlaySub', { relaxed: word('relaxed', look) }) });
  if (unlocked(save, 'books')) rows.push({ key: 'books', name: tr('more.books'), sub: tr('more.booksSub') });
  if (unlocked(save, 'journal')) rows.push({ key: 'journal', name: tr('more.journal'), sub: tr('more.journalSub') });
  if (albumOpen(save)) rows.push({ key: 'postcards', name: tr('more.postcards'), sub: tr('more.postcardsSub') });
  if (bookCount(save) > 0) rows.push({ key: 'bakebook', name: tr('more.bakeBook'), sub: bakeBookSub(save) });
  if (unlocked(save, 'challenge')) rows.push({ key: 'friend', name: tr('more.friend'), sub: tr('more.friendSub') });
  rows.push({ key: 'howto', name: tr('more.howto'), sub: tr('more.howtoSub') });
  rows.push({ key: 'settings', name: tr('more.settings'), sub: tr('more.settingsSub') });
  return rows;
}

// ==================================================================== HOME

export function renderHome(app, kit) {
  const save = app.save;
  const look = uiLook(save);
  if (cafe) { try { cafe.destroy(); } catch (_) { /* already gone */ } cafe = null; }
  const lvl = Math.min(save.journey.level, LEVEL_COUNT);
  const level = getLevel(lvl);
  const { carried } = ensureOrbits(save);
  if (carried) { app.persist(); setTimeout(() => kit.toast(tr('today.carried', { coins: fmt(carried) }), true, 2800), 300); }
  const saved = app.savedRun ? app.savedRun() : null;
  const firstRun = ((save.runs || 0) === 0) && !(save.cafe && save.cafe.intro);
  const sum = cafeSummary(save);
  // the first café reveal (docs/UX_FIRST_RUN.md T7): the café, Play and Restore only, a gold ring on Restore and one
  // line from Pip that stays until tapped. It lasts until the first thing is restored.
  const reveal = !firstRun && cafeRevealDue(save, sum);
  const node = kit.open(el(`<div class="screen menu home${saved ? ' has-resume' : ''}">
    <div class="home-cafe" data-cafe-host></div>
    <div class="home-bottom" data-bottom><div class="home-note" data-note></div><div class="home-bar" data-bar></div></div>
  </div>`));
  cafeHost = node.querySelector('[data-cafe-host]');
  const bar = node.querySelector('[data-bar]');
  const bottom = node.querySelector('[data-bottom]');
  const note = node.querySelector('[data-note]');

  const drawBar = () => {
    const s = cafeSummary(save);
    const rb = restoreButton(s, save);
    const icons = reveal ? [] : homeIcons(save); // the reveal shows the café and Restore only
    const t = todayItems(save);
    // only things she can collect now, one per Today row (docs/UX_FIRST_WEEK.md F2): the seasonal path's
    // already-given gifts are a quiet line in its row, never part of this number
    const todayN = todayCount(t.counts);
    const kindTag = level.kind === 'superhard' ? ` · ${esc(tr('home.extraTricky'))}` : level.kind === 'hard' ? ` · ${esc(tr('home.tricky'))}` : '';
    // the Play button sits on the café painting, so its goal line always uses café words (the blocker is a stone),
    // even when Cosmic orbs are worn; in-game screens keep following the worn look
    const goals = level.goals.map((g) => esc(cozyText(tierGoalText(g, goalText(g)), 'seaside'))).join(' · ');
    const lit = (k) => (glow.includes(k) ? ' nav-new' : '');
    const ico = {
      today: () => `<button class="home-ico${lit('today')}" data-today data-nav="today" aria-label="${esc(todayN ? tr('home.todayLabel', { n: fmt(todayN) }) : tr('home.today'))}">${ICONS.gift}<span>${esc(tr('home.today'))}</span>${todayN ? `<b class="dot">${todayN}</b>` : ''}</button>`,
      shop: () => `<button class="home-ico${lit('shop')}" data-shop data-nav="shop" aria-label="${esc(shopDotOn(save) ? tr('home.shopLabelNew') : tr('home.shopLabel'))}">${ICONS.shop}<span>${esc(tr('home.shop'))}</span>${shopDotOn(save) ? '<i class="home-dot" aria-hidden="true"></i>' : ''}</button>`,
      looks: () => `<button class="home-ico${lit('looks')}" data-looks data-nav="looks" aria-label="${esc(tr('home.wardrobeLabel'))}">${S.WARDROBE_ICON}<span>${esc(tr('home.wardrobe'))}</span></button>`,
      more: () => `<button class="home-ico${lit('more')}" data-more data-nav="more" aria-label="${esc(tr('home.moreLabel', { list: moreRows(save).map((r) => r.name).join(', ') }))}">${S.EXTRAS_ICON}<span>${esc(tr('home.more'))}</span></button>`,
    };
    bar.innerHTML = `
      ${saved || rb ? `<div class="home-row">
        ${saved ? `<button class="btn ghost home-resume" data-resume aria-label="${esc(tr('home.resumeLabel', { label: saved.label, detail: saved.detail }))}">${ICONS.play || '▶'}<span><b>${esc(tr('home.resume'))}</b><small>${esc(saved.label)}</small></span></button>` : ''}
        ${rb ? `<button class="btn ${rb.primary ? 'gold' : 'ghost'} home-restore${reveal ? ' nav-new' : ''}" data-restore aria-label="${esc(trp('home.restoreLabel', rb.stars, { n: fmt(rb.stars) }))}">${CUP_ICON}<span>${esc(tr('home.restore'))}</span><b class="home-stars">★ ${fmt(rb.stars)}</b></button>` : ''}
      </div>` : ''}
      <button class="btn primary hero home-play" data-play>
        <span>${esc(tr('home.play', { n: fmt(lvl) }))}</span><small>${goals}${kindTag}</small>
      </button>
      <nav class="home-icons" aria-label="${esc(tr('home.nav'))}">${icons.map((k) => ico[k]()).join('')}</nav>`;
    tap(bar.querySelector('[data-play]'), () => {
      if (skipIntroOnPlay(save)) { S.closeAll(); app.startLevel(lvl); } else S.showLevelIntro(app, lvl);
    }, click);
    tap(bar.querySelector('[data-resume]'), () => app.resumeRun(), click);
    tap(bar.querySelector('[data-restore]'), () => openCafeRestore({ guide: reveal }), click);
    tap(bar.querySelector('[data-shop]'), () => { settle(); S.showShop(app, 'treats', () => S.showMenu(app)); }, click);
    tap(bar.querySelector('[data-looks]'), () => { settle(); S.showWardrobe(app); }, click);
    tap(bar.querySelector('[data-today]'), () => { const row = settle('today'); showTodaySheet(app, row); }, click);
    tap(bar.querySelector('[data-more]'), () => { const row = settle('more'); showMoreSheet(app, row); }, click);
  };
  // the unlock moment's highlight (one visit only): `glow` = Home buttons to light, `glowRow` = the new row inside them
  let glow = [];
  let glowRow = null;
  let momentCard = null;
  /** Tapping any Home button ends the moment: the card and highlight go; returns the row to light if `k` is lit. */
  const settle = (k) => {
    const row = k && glow.includes(k) ? glowRow : null;
    if (momentCard) { momentCard.remove(); momentCard = null; }
    if (glow.length) { glow = []; glowRow = null; for (const b of bar.querySelectorAll('.nav-new')) b.classList.remove('nav-new'); }
    return row;
  };
  // one card at a time on Home: the v3 welcome for returning players first, then one unlock moment (oldest first).
  // Not during the first-star moment, so Pip's "Tap Restore" line has the stage to itself.
  // calm pacing (docs/UX_RETENTION.md item 2; main.js): at most one feature card a day, none on the visit after
  // "Done for now" or when this visit already has its card (the return-day gift). Moments not shown simply wait.
  const cardOk = !app.menuCardOk || app.menuCardOk();
  const moment = cardOk && !firstRun && !reveal && !v3CardDue(save) && (anyBuilt(save) || !sum.canBuild) ? (nextUnlockMoment(save) || seasonMoment(save)) : null;
  if (moment) { glow = moment.at.filter((k) => homeIcons(save).includes(k)); glowRow = moment.row || null; }
  drawBar();

  // the café scene (needs a real browser: Node tests render the template only)
  try {
    cafe = mountCafe(cafeHost, {
      save,
      controls: false,
      nextLine: true, // a quiet "Next: … · ★n" line while nothing can be built (no dead Restore button)
      bubble: true,
      bottomInset: () => (bottom.getBoundingClientRect ? bottom.getBoundingClientRect().height : 0),
      reducedMotion: reducedNow(save),
      onChange: (evt) => {
        app.persist();
        if (evt && evt.type === 'claim') S.refreshCoins(save);
        drawBar();
      },
      onOverlay: (on) => { bottom.hidden = on; },
      onPlay: () => { S.closeAll(); app.startLevel(lvl); },
      onShare: (areaId) => showCafePostcard(app, areaId, kit),
      onVisitorCard: (id) => showVisitorPostcard(app, id),
      sfx: (n) => Svc.sfx(n === 'build' ? 'coin' : n === 'celebrate' ? 'discover' : 'ui'),
      haptic: (k) => Svc.haptic(k === 'build' || k === 'celebrate' ? 'success' : 'light'),
    });
  } catch (e) {
    cafe = null;
    if (typeof window !== 'undefined' && window.requestAnimationFrame) console.error(e);
  }
  if (cafe) {
    if (firstRun) cafe.say(FIRST_RUN_LINES.slice(), 0); // stays until tapped
    else if (reveal) cafe.say(LESSON_COPY.reveal, 0);
    else if (sum.canBuild && !anyBuilt(save) && !sum.pending) cafe.say(firstStarLine(sum.available), 7000);
  }

  // Tonight's bake: one quiet strip in the note slot when a bake is ready (never during the first-run reveal)
  function addBakeStrip() {
    if (firstRun || reveal || momentCard || note.querySelector('[data-bake-strip]')) return;
    let strip = null;
    try { strip = bakeStripNode(app, cafe ? (line, ms) => cafe && cafe.say(line, ms) : null); } catch (e) { console.error(e); }
    if (!strip) return;
    note.appendChild(strip);
    if (cafe) requestAnimationFrame(() => cafe && cafe.resize());
  }
  if (!firstRun && !reveal && v3CardDue(save)) showV3Card(app);
  else if (moment) {
    // seen the moment it shows (and saved), so leaving Home any other way never shows it twice
    if (moment.key === 'season') markSeasonMet(save); else markUnlockSeen(save, moment.key);
    if (app.menuCardShown) app.menuCardShown();
    app.persist();
    const uc = el(unlockCardHtml(momentCopy(moment, (k) => word(k, look)), moment.key));
    momentCard = uc;
    note.appendChild(uc);
    if (cafe) requestAnimationFrame(() => cafe && cafe.resize());
    const open = {
      shop: () => S.showShop(app, 'treats', () => S.showMenu(app)),
      looks: () => S.showWardrobe(app),
      today: () => showTodaySheet(app, moment.row),
      more: () => showMoreSheet(app, moment.row),
    };
    tap(uc.querySelector('[data-unlock-open]'), () => { settle(); open[moment.open](); }, click);
    tap(uc.querySelector('[data-unlock-close]'), () => { settle(); addBakeStrip(); if (cafe) cafe.resize(); }, click);
  } else addBakeStrip();
  return node;
}

/**
 * Open the café's build sheet on Home (the result card's "Restore the café" lands here). opts.guide: the first
 * restore (T8): a ring and the hand on the first task she can afford, then Pip's one line after it is built.
 */
export function openCafeRestore(opts = {}) {
  if (!cafe) return;
  if (opts.guide && cafe.guideFirstBuild) cafe.guideFirstBuild(LESSON_COPY.firstBuild);
  cafe.openBuildSheet();
}

/** The live café on Home (tests and main.js use it to replay a pending celebration). */
export function homeCafe() { return cafe; }

// ==================================================================== TODAY

/** Today: the things that refresh daily. Each row opens its own sheet. */
export function showTodaySheet(app, newRow = null) {
  const save = app.save;
  const look = uiLook(save);
  const t = todayItems(save);
  const sr = seasonRow(save);
  const row = (key, icon, name, sub, n, bar = null) => `<button class="c-row today-row${key === newRow ? ' nav-new' : ''}" data-go="${key}"><span class="today-icon">${icon}</span>
    <div class="c-text"><div class="c-name">${name}${key === newRow ? newTag() : ''}</div><div class="c-sub">${sub}</div>${bar != null ? `<div class="today-bar" aria-hidden="true"><i style="width:${Math.round(bar * 100)}%"></i></div>` : ''}</div>${n ? `<b class="dot">${n}</b>` : '<i class="today-go">›</i>'}</button>`;
  const s = S.openScreen(el(`<div class="screen modal"><div class="card comfort-card today-card">
    <h2>${esc(tr('today.title'))}</h2>
    ${row('daily', ICONS.gift, esc(tr('today.gift')), esc(t.daily.available ? tr('today.giftReady') : tr('today.giftOpened')), t.daily.available ? 1 : 0)}
    ${t.special ? row('special', ICONS.calendar, esc(word('dailyPuzzle', look)), esc(tr('today.puzzleSub')), 0) : ''}
    ${t.orbits ? row('orbits', S.ORBIT_ICON, esc(tr('today.tasks')), esc(t.orbits.allDone ? tr('today.tasksAllDone') : tr('today.tasksDone', { done: fmt(t.orbits.done), total: fmt(t.orbits.total) })), t.counts.orbitsReady) : ''}
    ${t.pass.claimable > 0 || t.pass.active ? row('pass', '<span class="coin"></span>', esc(tr('today.club')), esc(t.pass.claimable > 0 ? trp('today.clubReady', t.pass.claimable, { n: fmt(t.pass.claimable), coins: fmt(t.pass.claimableCoins) }) : tr('today.clubCollected')), t.pass.claimable > 0 ? 1 : 0) : ''}
    ${sr ? row('season', sr.icon || SEASON_ICON, esc(sr.name), esc(sr.sub), sr.n, sr.bar != null ? sr.bar : null) : ''}
    ${quietRow(row)}
    <button class="btn ghost" data-x>${esc(tr('common.close'))}</button>
  </div></div>`));
  const go = {
    season: () => showSeasonCard(app),
    daily: () => S.showDailyReward(app),
    special: () => S.showDailySheet(app),
    orbits: () => S.showOrbits(app),
    pass: () => S.showPassSheet(app, () => S.showMenu(app)),
    quiet: () => showQuietEvening(app),
  };
  for (const b of s.querySelectorAll('[data-go]')) tap(b, () => { s.remove(); go[b.dataset.go](); }, click);
  tap(s.querySelector('[data-x]'), () => S.closeScreen(s), click);
  return s;
}

// ==================================================================== QUIET EVENING

/**
 * The Today sheet's quiet-evening row (src/meta/quietEvening.js): while one runs, the plain end time and what is left;
 * otherwise the offer, only when the ad rules allow it (past level 12, not used today, no Remove Ads or Club). Never a
 * dot or a badge, and never counted in the Today number on Home: it is there for whoever looks, nothing more.
 */
function quietRow(row) {
  const q = Svc.quietState();
  const c = quietCopy();
  if (q.active) return row('quiet', ICONS.moon, c.row, esc(quietActiveLine(quietUntilLabel(q.until), leftLabel(q.leftMs))), 0);
  if (Svc.quietOfferBlock() !== null) return '';
  return row('quiet', ICONS.moon, c.row, esc(c.rowSub), 0);
}

/** The quiet-evening card: what it does, one "Watch video" button and "No thanks". Opened only from Today. */
export function showQuietEvening(app) {
  const c = quietCopy();
  const q = Svc.quietState();
  const s = S.openScreen(el(`<div class="screen modal"><div class="card comfort-card quiet-card">
    <h2>${ICONS.moon.replace('<svg', '<svg width="22" height="22" aria-hidden="true"')} ${esc(c.title)}</h2>
    ${q.active
      ? `<p>${esc(quietActiveLine(quietUntilLabel(q.until), leftLabel(q.leftMs)))}.</p><p class="c-sub">${esc(c.note)}</p>
    <button class="btn ghost" data-x>${esc(tr('common.close'))}</button>`
      : `<p>${esc(c.body)}</p><p class="c-sub">${esc(c.note)}</p>
    <button class="btn primary" data-watch>${esc(c.watch)} <span class="ad-tag">${esc(tr('common.adTag'))}</span></button>
    <button class="btn ghost" data-x>${esc(c.no)}</button>`}
  </div></div>`));
  const w = s.querySelector('[data-watch]');
  if (w) tap(w, async () => {
    w.disabled = true;
    const ok = await Svc.startQuietEvening();
    if (ok) { app.persist && app.persist(); S.closeScreen(s); S.toast(c.done, true, 3200); }
    else { w.disabled = false; S.toast(c.noAd); }
  }, click);
  tap(s.querySelector('[data-x]'), () => S.closeScreen(s), click);
  return s;
}

// ==================================================================== MORE

// Bake Book: a little recipe tin
const BAKE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="8" width="17" height="12" rx="2"/><path d="M3.5 12h17"/><path d="M8 8V5.5h8V8"/></svg>';
// Puzzle Books: an open book
const BOOK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5z"/><path d="M12 6.5v13"/></svg>';

export function showMoreSheet(app, newRow = null) {
  const save = app.save;
  const icon = {
    map: ICONS.map, freeplay: ICONS.infinity, journal: S.JOURNAL_ICON, friend: FRIEND_ICON, settings: S.GEAR_ICON,
    postcards: POSTCARD_ICON, howto: HOWTO_ICON, books: BOOK_ICON, bakebook: BAKE_ICON,
  };
  // The sheet never runs past the screen (UX_PUZZLE_BOOKS "Fix first" 1): the rows scroll inside the card and Close
  // stays pinned in its footer, so it is always on screen at any text size. Large text caps the sub-lines (CSS).
  const s = S.openScreen(el(`<div class="screen modal"><div class="card comfort-card today-card more-home">
    <h2>${esc(tr('more.title'))}</h2>
    <div class="more-rows">
    ${moreRows(save).map((r) => `<button class="c-row today-row${r.key === newRow ? ' nav-new' : ''}" data-go="${r.key}"><span class="today-icon">${icon[r.key]}</span>
      <div class="c-text"><div class="c-name">${esc(r.name)}${r.key === newRow ? newTag() : ''}</div><div class="c-sub">${esc(r.sub)}</div></div><i class="today-go">›</i></button>`).join('')}
    </div>
    <div class="more-foot"><button class="btn ghost" data-x>${esc(tr('common.close'))}</button></div>
  </div></div>`));
  // a soft edge above Close only when there is more to scroll to
  const rowsBox = s.querySelector('.more-rows');
  const edge = () => { if (rowsBox) rowsBox.classList.toggle('more-below', rowsBox.scrollHeight - rowsBox.scrollTop - rowsBox.clientHeight > 4); };
  if (rowsBox && rowsBox.addEventListener) {
    rowsBox.addEventListener('scroll', edge, { passive: true });
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(edge);
  }
  const go = {
    map: () => S.showMap(app),
    freeplay: () => S.showChallengePick(app),
    books: () => S.showBooks(app),
    journal: () => S.showJournal(app),
    friend: () => showFriendEnter(app),
    settings: () => S.showMore(app),
    postcards: () => showPostcardAlbum(app),
    bakebook: () => showBakeBook(app),
    howto: () => app.startTutorial && app.startTutorial({ from: 'more' }),
  };
  for (const b of s.querySelectorAll('[data-go]')) tap(b, () => { s.remove(); go[b.dataset.go](); }, click);
  tap(s.querySelector('[data-x]'), () => S.closeScreen(s), click);
  return s;
}

// ==================================================================== THE CAFÉ HAS OPENED (v3 card, once)

/** The one-time card for players who had a save before v3. Marked seen (and persisted) the moment it shows. */
export function showV3Card(app) {
  const save = app.save;
  const c = save.v3card;
  if (!c) return null;
  // the migration's own "Try the Seaside look…" line is said by the note and buttons below, so it isn't repeated
  const lines = (c.lines || []).filter((l) => !(c.tryLook && /^Try the Seaside look/.test(l))).map((l) => `<li>${esc(l)}</li>`).join('');
  const s = S.openScreen(el(`<div class="screen modal"><div class="card v3-card" role="dialog" aria-labelledby="v3-title">
    <div class="v3-cup" aria-hidden="true">${CUP_ICON}</div>
    <h2 id="v3-title">${esc(tr('v3.title'))}</h2>
    <ul class="v3-lines">${lines}</ul>
    ${c.tryLook ? `<p class="v3-note">${esc(tr('v3.note'))}</p>
      <button class="btn primary" data-try>${esc(tr('v3.try'))}</button>
      <button class="btn ghost" data-keep>${esc(tr('v3.keep'))}</button>`
    : `<button class="btn primary" data-keep>${esc(tr('v3.lovely'))}</button>`}
  </div></div>`));
  // seen as soon as it is shown (and saved), so closing the app or leaving Home another way never shows it twice
  markV3CardSeen(save);
  app.persist();
  const done = (tryIt) => {
    if (tryIt) wearSeasideLook(save);
    markV3CardSeen(save);
    app.persist();
    S.closeScreen(s);
    if (tryIt) {
      if (app.onLookChanged) app.onLookChanged();
      S.showMenu(app);
      S.toast(tr('v3.welcome'), true);
    }
  };
  tap(s.querySelector('[data-try]'), () => done(true), click);
  tap(s.querySelector('[data-keep]'), () => done(false), click);
  return s;
}

// ==================================================================== CAFÉ POSTCARD

/** The café area's postcard: a picture and a caption, no link, no reward. */
export function showCafePostcard(app, areaId) {
  const area = CAFE_AREA_BY_ID[areaId];
  if (!area || typeof document === 'undefined') return null;
  const st = areaState(app.save, areaId);
  const done = {};
  for (const t of st.tasks) if (t.style >= 0) done[t.id] = t.style;
  const cv = document.createElement('canvas');
  cv.width = 1080; cv.height = 1350;
  paintAreaPostcard(cv, areaId, { done, built: st.built, total: st.total });
  const caption = tr('postcard.cafeCaption', { area: area.name });
  let src = '';
  try { src = cv.toDataURL('image/png'); } catch (_) { src = ''; }
  const node = S.openScreen(el(`<div class="screen modal"><div class="card postcard-card">
    <h2>${esc(tr('cafe.sendPostcard'))}</h2>
    ${src ? `<img class="postcard-img" alt="${esc(tr('postcard.alt', { title: area.name }))}" src="${src}">` : ''}
    <p class="sub">${esc(caption)}</p>
    <p class="postcard-note">${esc(tr('postcard.note'))}</p>
    <button class="btn primary" data-go>${esc(tr('common.share'))}</button>
    <button class="btn ghost" data-x>${esc(tr('common.close'))}</button>
  </div></div>`));
  let busy = false;
  tap(node.querySelector('[data-go]'), async () => {
    if (busy) return;
    busy = true;
    const r = await sharePostcard(cv, { kind: 'cafe', title: area.name }, caption);
    busy = false;
    if (r === 'shared') { S.toast(tr('share.shared'), true); S.closeScreen(node); }
    else if (r === 'saved') S.toast(tr('postcard.saved'), true);
    else if (r === 'copied') S.toast(tr('postcard.copied'), true);
    else if (r === 'failed') S.toast(tr('postcard.failed'));
  }, click);
  tap(node.querySelector('[data-x]'), () => S.closeScreen(node), click);
  return node;
}

// ==================================================================== POSTCARDS (café visitors' keepsakes)

/** Paint into a small canvas sized for CSS px (w x h), crisp on the device. */
function smallCanvas(cls, w, h, paintFn) {
  const cv = document.createElement('canvas');
  const dpr = Math.min(2, (typeof devicePixelRatio === 'number' && devicePixelRatio) || 1);
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  cv.className = cls;
  const ctx = cv.getContext('2d');
  if (ctx) { ctx.scale(dpr, dpr); try { paintFn(ctx); } catch (e) { console.error(e); } }
  return cv;
}

/**
 * The Postcards album (More > Postcards): each café visitor's keepsake once their story is heard, and a soft
 * "still chatting" tile for visitors who are here but not finished. Visitors who haven't arrived stay a surprise.
 */
export function showPostcardAlbum(app) {
  const save = app.save;
  const cards = visitorCards(save);
  const pending = visitorsHere(save).filter((v) => !cards.includes(v.id));
  const left = VISITORS.length - cards.length - pending.length;
  const s = S.openScreen(el(`<div class="screen modal"><div class="card comfort-card album-card" role="dialog" aria-labelledby="album-title">
    <h2 id="album-title">${esc(tr('album.title'))}</h2>
    <p class="album-intro">${esc(cards.length
    ? tr('album.kept', { n: fmt(cards.length), total: fmt(VISITORS.length) })
    : tr('album.empty'))}</p>
    <div class="album-grid"></div>
    ${left > 0 ? `<p class="album-foot">${esc(tr('album.more'))}</p>` : ''}
    <button class="btn ghost" data-x>${esc(tr('common.close'))}</button>
  </div></div>`));
  const grid = s.querySelector('.album-grid');
  for (const id of cards) {
    const v = VISITOR_BY_ID[id];
    const b = el(`<button class="album-tile" aria-label="${esc(tr('album.tileAria', { title: v.card.title, name: v.name }))}"></button>`);
    b.appendChild(smallCanvas('album-pic', 150, 100, (ctx) => paintVisitorScene(ctx, id, 0, 0, 150, 100)));
    b.appendChild(el(`<span class="album-name">${esc(v.card.title)}</span>`));
    b.appendChild(el(`<span class="album-from">${esc(tr('album.from', { name: v.name }))}</span>`));
    tap(b, () => showVisitorPostcard(app, id), click);
    grid.appendChild(b);
  }
  for (const v of pending) {
    const st = visitorStatus(save, v.id);
    const t = el(`<div class="album-tile album-wait" role="note"></div>`);
    t.appendChild(smallCanvas('album-pic', 150, 100, (ctx) => {
      const b = visitorBox(v.id, 0, 0, 1);
      const r = Math.min(86 / (b[3] - b[1]), 130 / (b[2] - b[0]));
      paintVisitor(ctx, v.id, 75 - ((b[0] + b[2]) / 2) * r, 94, r);
    }));
    t.appendChild(el(`<span class="album-name">${esc(v.name)}</span>`));
    t.appendChild(el(`<span class="album-from">${esc(st.heard ? tr('album.heard', { n: fmt(st.heard), of: fmt(st.of) }) : tr('album.sayHello'))}</span>`));
    grid.appendChild(t);
  }
  tap(s.querySelector('[data-x]'), () => S.closeScreen(s), click);
  return s;
}

/** One visitor's postcard, big, with Share (a picture and a line of words, no link) and Close. */
export function showVisitorPostcard(app, id) {
  const v = VISITOR_BY_ID[id];
  if (!v || typeof document === 'undefined') return null;
  const m = visitorPostcard(v);
  const cv = renderPostcard(m, { frame: keepsakeFrame(app.save, dayKey()) }); // Season Keepsakes frame, when owned and on
  const caption = postcardCaption(m);
  let src = '';
  try { src = cv.toDataURL('image/png'); } catch (_) { src = ''; }
  const node = S.openScreen(el(`<div class="screen modal"><div class="card postcard-card">
    <h2>${esc(tr('album.cardTitle', { name: v.name }))}</h2>
    ${src ? `<img class="postcard-img" alt="${esc(tr('postcard.altNote', { title: v.card.title, note: v.card.note }))}" src="${src}">` : ''}
    <p class="postcard-note">${esc(tr('album.cardNote'))}</p>
    <button class="btn primary" data-go>${esc(tr('common.share'))}</button>
    <button class="btn ghost" data-x>${esc(tr('common.close'))}</button>
  </div></div>`));
  let busy = false;
  tap(node.querySelector('[data-go]'), async () => {
    if (busy) return;
    busy = true;
    const r = await sharePostcard(cv, m, caption);
    busy = false;
    if (r === 'shared') { S.toast(tr('share.shared'), true); S.closeScreen(node); }
    else if (r === 'saved') S.toast(tr('postcard.saved'), true);
    else if (r === 'copied') S.toast(tr('postcard.copied'), true);
    else if (r === 'failed') S.toast(tr('postcard.failed'));
  }, click);
  tap(node.querySelector('[data-x]'), () => S.closeScreen(node), click);
  return node;
}
