// NOVA DROP — boot, screen router, wiring.
import { loadSave, persist as persistSave, flush as flushSave, SAVE_KEY } from './meta/save.js';
import { validRunSnap, RULES_VERSION, sameRules } from './meta/runSnap.js';
import { applyImport } from './meta/transfer.js';
import { playableBackdrop } from './meta/soundCollections.js';
import { registerServices, Svc } from './meta/services.js';
import { runCoins, SKINS } from './meta/economy.js';
import { bountyCoins, bountyLine } from './game/bounties.js';
import { momentCoins, momentLine } from './game/moments.js';
import { recordDailyChallenge, dailyChallengeSeed, dayKey, daysBetween } from './meta/daily.js';
import { recordNebulaAttempt, isPlayableDay, monthSolved, dailyTwistFor, twistLabel } from './meta/dailyNebula.js';
import { orbitText } from './meta/orbits.js';
import { discoverTier, claimLevelGift } from './meta/firstSession.js';
import { runRecords, nextGoal } from './meta/highlights.js';
import { failReflection } from './meta/reflection.js';
import { recordNight } from './meta/skyCalendar.js';
import { equippedKeeper, keeperLine } from './meta/keepers.js';
import { storyDueNow, v3CardDue, seasonOpen } from './meta/onboarding.js';
import { awardRound, seasonLine } from './meta/seasonal.js';
import { newlyCompleted } from './meta/observatory.js';
import { equippedOutfit } from './meta/outfits.js';
import { recordJourneyResult, shouldOfferSteady } from './meta/steadyStart.js';
import { recordStreakResult, streakCharges, streakLine } from './meta/winStreak.js';
import { challengeBest, recordChallengeBest, normChallenge, standardTide } from './meta/challenge.js';
import { lastPath, setLastPath, recordPathsRun, pathUnlockLine } from './meta/paths.js';
import { zenCoins, recordZen, zenOpen } from './meta/zen.js';
import { PATH_BY_ID } from './game/perks.js';
import { tipDue, markTipShown } from './meta/levelTips.js';
import { mechanicKind, MECHANIC_TEXT, glazeInfoChip, tinInfoChip } from './meta/mechanicIntro.js';
import { recordRaceBest } from './meta/raceBest.js';
import { journalStart, journalDrop, journalTier, journalRunEnd, journalDiscard, FEATS } from './meta/journal.js';
import { eveningActive, shouldOfferEvening, answerEvening, eveningKey } from './meta/evening.js';
import { calmActive, recordRound as windDownRound, goodnightDue, markGoodnightShown, nightState, loadNight, storeNight } from './meta/windDown.js';
import { setCafeNight } from './game/cafeArt.js';
import { adBreakLine } from './meta/adBreaks.js';
import { welcomeBackDue, markSeen, claimWelcomeBack, welcomeSummary } from './meta/welcomeBack.js';
import { consumeBakeForLevel, bakeLevelWon, bakeReady, ovenBake, bakeById, bakeToastLine, bakeWelcomeLine, BAKE_TIER } from './meta/bakes.js'; // Tonight's bake
import { shouldAskReview, markAsked } from './meta/reviewAsk.js';
import { weekDrop, weekTier, weekLevel, weekEndless, weekNebula, weeklyCardDue, markWeeklySeen } from './meta/weekly.js';
import { showWeeklyCard } from './ui/weeklyView.js';
import { AD_RULES } from './ads/adRules.js';
import { t } from './i18n/index.js';
import { watchTextFit } from './ui/textFit.js';
import { testerFromUrl, clearTester, canSkipRun, skipLevel } from './meta/tester.js'; // tester-only Skip level
import { Renderer } from './game/renderer.js';
import { Effects } from './game/effects.js';
import { Game } from './game/game.js';
import { Autoplay, choosePerk, testOptions } from './game/autoplay.js';
import { clearArtCache, drawOrb } from './game/orbArt.js';
import { getLevel, getDailyLevel, LEVEL_COUNT, twistMechs, dailyStage, DAILY_MECHS, bakeFits } from './game/levels.js';
import { resolveBackdrop } from './game/backdrops.js';
import { uiLook } from './meta/looks.js';
import { watchCozyWords } from './ui/copy.js';
import { setNameSkinSource, skinTierText } from './game/tierNames.js';
import { createTrial } from './meta/shopMenu.js';
import { PACKS } from './meta/packs.js';
import { Hud } from './ui/hud.js';
import { Coach } from './ui/coach.js';
import { tutorialDue, markTutorialDone, createLesson, COPY as LESSON_COPY, cafeRevealDue } from './meta/firstRun.js';
import { cafeStageHeld } from './meta/cafeTour.js';
import { menuCardFree, markMenuCard, returnGiftDue, greeting } from './meta/menuCards.js';
import { nextUnlockMoment } from './meta/homeNav.js';
import { nextFitCells } from './game/nextHint.js';
import { tierName } from './game/tierNames.js';
import { setKeepersReduced } from './ui/keeperLive.js';
import { watchCanvasCover } from './ui/canvasCover.js';
import { getCell } from './game/board.js';
import * as UI from './ui/screens.js';
import { syncKeepsakes } from './meta/pass.js';
import { puzzleOf, canPlay, bookCur, setBookCur, markSolved } from './meta/books.js'; // Puzzle Books
import { showFriendResult } from './ui/challengeView.js';
import { recordFriendResult, encodeFriend, goalLine } from './meta/friendChallenge.js';
import { recordRunStats, flushLevelStats, setSharing, resetStatsId, statsMode } from './meta/levelStats.js';

const save = loadSave();
const persist = () => persistSave(save);
// Café Club keepsakes: a queued Club month that started while the app was closed brings its keepsake now (src/meta/pass.js)
if (syncKeepsakes(save).length) persist();
// tier names on every card and popup follow the equipped orb skin (display only: rules and saves use tier numbers)
// Shop "Try for a level" (src/meta/shopMenu.js): a pack look worn for one Journey level. Memory only, never saved;
// rules, score and ownership are untouched. trialSkinNow mirrors game.skinTrial so tier names follow it too.
const trial = createTrial();
let trialSkinNow = null;
setNameSkinSource(() => trialSkinNow || (save.skins && save.skins.equipped) || 'classic');
let retryLevelAfterFail = 0; // level the fail offer's "Try again" asked to restart (0 = none)
const pendingBoosterIntros = []; // free-booster cards queued until the first drop of the run
let lastAnnouncedSong = null; // "♪ Now playing" shows on the menu only when the song changed
let currentSong = null;

// ------------------------------------------------------------------ services (fail-safe)
async function loadServices() {
  const withTimeout = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(() => r(null), ms))]);
  const [plat, dir] = await Promise.all([
    withTimeout(import('./platform/platform.js').catch((e) => { console.warn('[nova] platform unavailable', e); return null; }), 4000),
    withTimeout(import('./ads/adDirector.js').catch((e) => { console.warn('[nova] ads unavailable', e); return null; }), 4000),
  ]);
  registerServices({ Platform: plat && plat.Platform, AdDirector: dir && dir.AdDirector });
  try { plat && plat.Platform && plat.Platform.init(); } catch (e) { console.warn(e); }
  Svc.setMuted(!save.settings.sound);
  Svc.setMusic(save.settings.music !== false);
  Svc.setMusicTracks(save.settings.musicTracks);
  Svc.setSoundBackdrop(playableBackdrop(save.settings.soundBackdrop, save));
  Svc.setHaptics(save.settings.haptics);
  applyEvening();
  try { dir && dir.AdDirector && dir.AdDirector.init(save, persist); } catch (e) { console.warn(e); }
}

// ------------------------------------------------------------------ core objects
const canvas = document.getElementById('game');
const renderer = new Renderer(canvas);
const fx = new Effects();
// in-play toasts wait for a board banner (LEVEL / EXTRA TRICKY, chain) to fade before they first show
UI.setToastHold(() => fx.bannerLeft());
// Calm setting OR the OS "reduce motion" preference tones down shake, flashes and flourishes
// (canvas effects, nebula crossfades and CSS animations via body.calm). Live: follows OS changes.
let prefersReducedMotion = false;
try {
  const mq = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  if (mq) {
    prefersReducedMotion = !!mq.matches;
    const onChange = (e) => { prefersReducedMotion = !!e.matches; applyMotion(); };
    if (mq.addEventListener) mq.addEventListener('change', onChange); else if (mq.addListener) mq.addListener(onChange);
  }
} catch (_) { /* ignore */ }
function applyMotion() {
  renderer.reduced = fx.reduced = !!save.settings.calm || prefersReducedMotion;
  document.body.classList.toggle('calm', fx.reduced);
  setKeepersReduced(fx.reduced); // living Keepers: faces and blinks stay, hops / spins / sparkles go
}
applyMotion();

let game = null;
const hud = new Hud({
  onPause: () => pauseGame(),
  onHold: () => game && game.useHold(),
  onComet: () => game && game.setCometMode(!game.cometMode),
  onBooster: (id) => game && game.useBooster(id),
  onUndo: () => game && game.undo(), // Journey: one free undo per attempt (Fun Wave D)
  onAuto: () => setSetting('autoplay', !save.settings.autoplay),
});
hud.bannerLeft = () => fx.bannerLeft(); // the keeper bubble steps aside while a board banner shows
hud.numbers = !!save.settings.numbers;

/** Comfort pack presentation: text size, tier shapes, left-hand HUD (no rule changes). */
function applyComfort() {
  const st = save.settings;
  const ts = [1, 1.25, 1.5].includes(st.textSize) ? st.textSize : 1;
  document.documentElement.style.setProperty('--ts', String(ts));
  document.body.classList.toggle('left-hand', !!st.leftHand);
  hud.shapes = !!st.shapes;
  UI.setShapesFlag(!!st.shapes);
}
applyComfort();

// ---- Anonymous level stats (src/meta/levelStats.js). Opt-in: nothing is recorded or sent until the player turns
// it on in Settings. STATS_ENDPOINT is empty for now, so the toggle stays hidden and nothing is recorded.
UI.setStatsMode(statsMode(save));
function uploadStats() {
  flushLevelStats(save, { build: UI.BUILD }).then(() => persist()) /* sent or rejected batches left the queue */.catch(() => { /* try again later */ });
}
function setStatsSharing(on) {
  setSharing(save, on);
  UI.setStatsMode(statsMode(save));
  persist();
  if (on) uploadStats();
}
setTimeout(uploadStats, 4000); // anything left from last time (never blocks the start)

// ---- Evening wind-down (src/meta/evening.js): warmer colours, softer music, light haptics after
// 21:00 on the device clock, if the player turned it on. Presentation only; nothing leaves the save.
// Wind-down "Evening calm" (src/meta/windDown.js) brings the evening look with it, plus the café at night (baked once per
// switch), quieter music and sound effects, the calmest song and optionally the waves backdrop.
let eveningWas = false, calmWas = false;
function applyEvening() {
  const calm = calmActive(save);
  const on = eveningActive(save) || calm;
  eveningWas = on; calmWas = calm;
  document.body.classList.toggle('evening', on);
  document.body.classList.toggle('evening-calm', calm);
  // v3 UI palette (styles.css :root[data-look]): the Cosmic pack's orbs bring back the night-sky look; otherwise the
  // warm seaside palette, dimmed to its evening tones after 21:00 when the evening look is on. Presentation only.
  const look = uiLook(save) === 'cosmic' ? 'cosmic' : on ? 'evening' : '';
  if (look) document.documentElement.dataset.look = look; else delete document.documentElement.dataset.look;
  renderer.evening = on; // canvas tint is drawn per frame by the renderer (no CSS filter on the canvas)
  renderer.eveningCalm = calm;
  setCafeNight(calm);
  Svc.setEvening(on);
  Svc.setNightCalm(calm, !!save.settings.eveningWaves);
}
applyEvening();
// v3 words (src/ui/copy.js): every screen, card, toast and HUD label shows the cozy seaside words, unless the Cosmic
// look is on. Display only: the rule modules, saves and fixtures keep their original words.
watchCozyWords(document.body, () => uiLook(save));
// Translations: the long-text safety net (src/ui/textFit.js; off in English). hud.js sets <html lang>.
watchTextFit(document.body);
// re-check each minute so the look turns itself off at 06:00 (and on at 21:00) without a restart
setInterval(() => { if (calmActive(save) !== calmWas || (eveningActive(save) || calmActive(save)) !== eveningWas) applyEvening(); }, 60000);
/** A no-ad moment offer (evening, Steady Start) is on screen: the menu banner must stay hidden. */
const quietOfferOpen = () => !!document.querySelector('#screens .welcome-card, #screens .evening-card, #screens .steady-card, #screens .obs-done, #screens .comet-done, #screens .week-card, #screens .gift-byg, #screens .gift-return, #screens .tip-card');

const app = {
  save,
  persist,
  startLevel: (n) => guardSaved(() => startLevel(n)),
  // "How to play" (Settings › Comfort, More): the lesson on a practice board that saves nothing (no saved-run prompt:
  // a saved run is left exactly as it is)
  startTutorial: (o = {}) => { UI.closeAll(); startLevel(1, { tutorial: 'practice', from: o.from || null }); },
  // Shop "Try for a level": wear a pack's look for the next Journey level (display only, never saved)
  tryForLevel: (packId) => {
    const pack = PACKS.find((p) => p.id === packId);
    if (!pack) return;
    const n = Math.min(save.journey.level, LEVEL_COUNT);
    trial.start(pack.skin.id, pack.name, n);
    guardSaved(() => startLevel(n));
  },
  startEndless: (daily, challenge, path) => guardSaved(() => startEndless(daily, challenge, path)),
  startZen: () => guardSaved(() => startZen()),
  // Puzzle Books (src/ui/books.js): play puzzle n of a book. Not a run: a saved run is left exactly as it is.
  startBook: (id, n) => startBookPuzzle(id, n),
  // the Puzzle Books screens closed: ads may show again (the menu banner comes back on Home)
  booksClosed: () => { Svc.setInBook(false); if (screen === 'menu' && !document.querySelector('#screens .screen:not(.menu):not(.leaving)')) Svc.showMenuBanner(); },
  startNebula: (key) => guardSaved(() => startNebula(key)),
  // Challenge a friend (src/meta/friendChallenge.js): play the exact puzzle from a decoded code
  startFriend: (c) => guardSaved(() => startFriend(c)),
  resumeRun: () => resumeRun(),
  savedRun: () => savedRunInfo(),
  // tester tools (?tester=1 on this device only; src/meta/tester.js): never shown to anyone else
  tester: () => TESTER,
  clearTester: () => { clearTester(localStorage); TESTER = false; },
  setSetting,
  setStatsSharing: (on) => setStatsSharing(on),
  resetStatsId: () => { resetStatsId(save); persist(); },
  importProgress: (data) => importProgress(data),
  canUndoTransfer: () => !!undoTransferData,
  undoTransfer: () => { if (undoTransferData) importProgress(undoTransferData, true); },
  // a real-money purchase landed in the current save: an Undo transfer would throw its coins / packs away, so it ends
  purchaseGranted: () => { undoTransferData = null; purchaseThisSession = true; },
  onMetaChanged: () => { if (screen === 'menu') goMenu(); },
  // the equipped look changed (v3 card "Try the new look", Wardrobe): palette, words and background follow at once
  onLookChanged: () => { applyEvening(); applyBackdrop(backdropCtx, { instant: true }); },
  // wind-down goodnight line (src/ui/goodnight.js): shown once per night; "Sleep well" goes Home with no interstitial
  goodnightShown: () => storeNight(markGoodnightShown(loadNight())),
  goodnightTally: () => nightState(loadNight()),
  goodnightHome: () => goMenu({ quiet: true }),
  // Home's unlock / season moments ask first (docs/UX_RETENTION.md item 2): one feature card a day, none on a quiet visit
  menuCardOk: () => homeCardOk(),
  menuCardShown: () => { menuVisit.card = true; markMenuCard(save); },
  // the result card's "Restore the café": Home, with the café's build sheet open
  openCafe: () => { goMenu({ quiet: true }); UI.openCafeRestore(); }, // no Home card over the build sheet
  // Shop "Preview" of a sky scene: show it live behind the preview card; null puts the player's background back
  // (the menu's floating planets step aside so the scene's own art is what you see)
  previewBackdrop: (id) => {
    if (id) renderer.setBackdrop(id, { instant: true }); else applyBackdrop(backdropCtx, { instant: true });
  },
};

game = new Game({
  renderer, fx, hud, save, persist,
  ui: {
    showPerkPick: (o) => UI.showPerkPick(app, o),
    showRevive: (o) => UI.showRevive(app, o),
    // "Try again" on the fail offer: the game ends this attempt as a normal fail ('quit'), then
    // onRunOver starts the level again instead of showing the fail card
    showFailOffer: async (o) => {
      failOfferThisSession = true; // the honest review prompt never follows a fail offer in the same session
      const v = await UI.showFailOffer(app, o);
      if (v === 'retry') { retryLevelAfterFail = o.level && o.level.n; return 'quit'; }
      return v;
    },
    // the free-booster card waits for the player's first drop, so it never stacks with a story or the
    // level hint at level start (the booster is already granted; this is presentation only)
    // (the "seen" flag is set when the card is actually shown, so a reload before the first drop keeps it)
    showBoosterIntro: (id) => { if (!pendingBoosterIntros.includes(id)) pendingBoosterIntros.push(id); return Promise.resolve(); },
    offerBoosterPurchase: (id) => UI.offerBoosterPurchase(app, id),
    toast: (t, good, ms) => UI.toast(t, good, ms),
    secondCupNote: (o) => UI.secondCupToast(o), // Second cup note in the toast zone (docs/UX_MECHANICS.md P4)
  },
  onRunOver: (res) => onRunOver(res),
  onOrbitComplete: (m) => {
    const all = save.orbits && save.orbits.list.every((x) => x.done);
    UI.toast(`Orbit complete: ${orbitText(m)} (+${m.reward})${all ? ' · all 3 done today!' : ''}`, true, 2800);
    Svc.sfx('coin');
    persist();
  },
  // resume after reload: the run's snapshot lives in the save (null clears it)
  onSnapshot: (snap) => writeSnapshot(snap),
});
game.snapBuild = RULES_VERSION; // rules version, not the display build: a UI-only bump keeps saved runs
game.animSpeed = save.settings.animSpeed === 2 ? 2 : 1;
// ---- first-time "New discovery" cards (one at a time, never blocking play)
const discoveryQueue = [];
let discoveryBusy = false;
function nextDiscovery() {
  if (discoveryBusy || !discoveryQueue.length) return;
  if (introHintShowing()) return; // one message at a time: it shows once the new rule's box has gone (P8)
  if (coach.active || (lesson && lesson.active && lesson.step !== 'play')) return; // never over a lesson step (docs/UX_FIRST_RUN.md Q8): it shows once the step has gone
  if (screen !== 'game') { discoveryQueue.length = 0; return; }
  // never over "Closing time!" or the win / game-over banners: once the run is ending the cards are dropped (the tier
  // and its coins are already recorded; the card is only the announcement)
  if (game.closing || !game.run || game.run.ended) { discoveryQueue.length = 0; return; }
  discoveryBusy = true;
  const d = discoveryQueue.shift();
  const L = renderer.L;
  Svc.sfx('discover', { tier: d.tier });
  Svc.haptic('success');
  UI.showDiscovery(app, { tier: d.tier, coins: d.coins, autoplay: !!d.autoplay, top: Math.round(L.by + L.cell * 0.12) }).then(() => {
    discoveryBusy = false;
    nextDiscovery();
  });
}
const autoSeen = new Set(); // tiers previewed this autoplay run (not recorded, no coins)
// Puzzle Books: the position after every drop (and Undo / Try again), so leaving and coming back carries on
game.onBookProgress = ({ id, n, cols, tries }) => { setBookCur(save, id, n, cols, tries); persist(); };

game.onTierMade = (tier) => {
  if (game.run && game.run.tutorial === 'practice') return; // the "How to play" board records nothing
  if (game.run && game.run.autoplay) {
    // show the card so the feature can be watched, but don't record it or pay coins
    if (tier < 2 || autoSeen.has(tier) || (save.discovered || []).includes(tier)) return;
    autoSeen.add(tier);
    discoveryQueue.push({ tier, coins: 0, autoplay: true });
    setTimeout(nextDiscovery, 250);
    return;
  }
  noteFeats(journalTier(save, tier));
  weekTier(save, tier); // "Your puzzle week" (src/meta/weekly.js)
  const coins = discoverTier(save, tier);
  if (!coins) return;
  hud.keeperReact('bigMerge');
  persist();
  discoveryQueue.push({ tier, coins });
  setTimeout(nextDiscovery, 250);
};

// ---- a new mechanic's rule box (docs/UX_MECHANICS.md P2): it stays until the player first uses the mechanic
// (an order served, a glaze cracked, a teapot moving down), or else until the 3rd drop and 12 s, whichever is later.
// Discovery cards and booster cards wait while it shows. Other hints still go at the 2nd drop.
const INTRO_HINT_MIN_MS = 12000;
const INTRO_HINT_MIN_DROPS = 3;
let introHint = null; // { kind, since, drops, timer }
function introHintShowing() { return !!introHint && !hud.hintEl.classList.contains('hidden'); }
function showIntroHint(kind) {
  clearIntroHint();
  introHint = { kind, since: Date.now(), drops: 0, timer: 0 };
  hud.showHint(MECHANIC_TEXT[kind]);
  introHint.timer = setTimeout(checkIntroHint, INTRO_HINT_MIN_MS + 50);
}
function checkIntroHint() {
  if (introHint && introHint.drops >= INTRO_HINT_MIN_DROPS && Date.now() - introHint.since >= INTRO_HINT_MIN_MS) hud.hideHint();
}
function clearIntroHint() {
  if (introHint) clearTimeout(introHint.timer);
  introHint = null;
}
{
  const hide = hud.hideHint.bind(hud);
  hud.hideHint = () => { // any hide (the game hides it before a win / fail banner) lets queued cards through
    const was = !!introHint;
    hide();
    clearIntroHint();
    if (was) {
      setTimeout(nextDiscovery, 250);
      if (pendingBoosterIntros.length) setTimeout(showQueuedBoosterIntro, 350);
    }
  };
}
/** Tap on a goal chip: say its rule again (a 4.5 s toast), or nudge the rule box if it is already showing. */
function rereadRule(text) {
  const el = hud.hintEl;
  if (!el.classList.contains('hidden') && el.textContent === text) {
    if (!fx.reduced && el.animate) el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.04)' }, { transform: 'scale(1)' }], { duration: 360 });
    return;
  }
  const m = /^New:\s*([^!]+)!\s*(.*)$/.exec(text);
  UI.toast(m ? `${m[1].charAt(0).toUpperCase() + m[1].slice(1)}: ${m[2]}` : text, false, 4500);
}
hud.onMomentTap = () => game.momentReread(); // Café moments: tap the ticket to read the order again
game.onMechanic = (kind) => { if (introHint && introHint.kind === kind) hud.hideHint(); };
game.onDrop = (n) => {
  if (lesson && inLesson()) applyLesson(lesson.drop());
  if (introHint) { introHint.drops = n; checkIntroHint(); return; }
  if (tipUntilMerge) return; // Level 1's tip waits for the first merge (onDropResolved)
  if (n >= 2) hud.hideHint();
};

// ---- Skill Journal (src/meta/journal.js): real play only, never autoplay. Informational, no rewards.
let runFeats = []; // first-time feats earned this game (one quiet line on the result screen)
function noteFeats(ids) { for (const id of ids || []) if (!runFeats.includes(id)) runFeats.push(id); }
game.onDropResolved = (steps, dropNo) => {
  // the buddy glances worriedly when a column reaches the second row (cooldown inside; cosmetic only)
  if (game.run && screen === 'game') {
    const b = game.run.board;
    for (let c = 0; c < b.cols; c++) if (getCell(b, 1, c)) { hud.keeperReact('danger'); break; }
  }
  if (tipUntilMerge && steps > 0) { tipUntilMerge = false; hud.hideHint(); }
  if (lesson && inLesson()) applyLesson(lesson.resolved(steps));
  if (!game.run || game.run.autoplay || game.run.tutorial === 'practice') return;
  const counted = (save.journal && save.journal.cur && save.journal.cur.d) || 0;
  noteFeats(journalDrop(save, steps, dropNo));
  // "Your puzzle week": the same drops the journal counts (a drop replayed after a reload is not counted twice)
  if (((save.journal && save.journal.cur && save.journal.cur.d) || 0) > counted) weekDrop(save, steps);
  if (pendingBoosterIntros.length) setTimeout(showQueuedBoosterIntro, 350);
};
/** One queued "New booster" card after a drop has settled (kept for a later drop if the run ended). */
async function showQueuedBoosterIntro() {
  if (!pendingBoosterIntros.length || screen !== 'game' || !game.run || game.run.ended || game.run.autoplay) return;
  if (introHintShowing()) return; // waits for the new rule's box to go (it calls back here)
  const id = pendingBoosterIntros.shift();
  if (save.boosterIntro && save.boosterIntro[id] === true) { showQueuedBoosterIntro(); return; }
  const shown = UI.showBoosterIntro(app, id);
  save.boosterIntro = save.boosterIntro || {};
  save.boosterIntro[id] = true; // the card is on screen now
  persist();
  await shown;
  if (pendingBoosterIntros.length) showQueuedBoosterIntro();
}
/** A new game (not a resume) starts: the journal opens a fresh game record. */
function journalNewGame() { runFeats = []; journalStart(save); runStartedAt = Date.now(); }

// ---- Honest review prompt (src/meta/reviewAsk.js): session facts only (never ad value, spending or device data)
let failOfferThisSession = false; // a Journey fail offer was shown this session
let purchaseThisSession = false;  // a real-money purchase landed this session
let runStartedAt = Date.now();    // a rewarded ad finished after this = an ad in this run
/** After a Journey win's result card: maybe hand the OS its standard review sheet (no custom question first). */
function maybeAskReview(res) {
  const r = game.run;
  const ctx = {
    mode: res.mode, won: res.won, nebula: res.nebula, autoplay: res.autoplay, level: res.level,
    adInRun: !!(r && r.adUsed) || Svc.secondsSinceAd() * 1000 < Date.now() - runStartedAt,
    revivedInRun: !!(r && r.revivesUsed > 0), purchaseInRun: false, continued: !!res.continued || (res.continuesGranted || 0) > 0,
    failOfferThisSession, purchaseThisSession, now: new Date(),
  };
  if (!shouldAskReview(save, ctx)) return;
  showResultLater(() => {
    Svc.requestReview().then((asked) => { if (asked) { markAsked(save); persist(); } }); // web: no store, resolves false
  }, 1600);
}
/** Feats line for the result screen, e.g. "New in your Skill Journal: First Supernova". */
function featsLine() {
  if (!runFeats.length) return null;
  const names = runFeats.map((id) => (FEATS.find((f) => f.id === id) || {}).name).filter(Boolean);
  runFeats = [];
  return names.length ? `New in your Skill Journal: ${names.join(' · ')}` : null;
}

// ---- Star Keeper buddy (cosmetic only): a short line at run start and after a big chain
let lastKeeperSay = 0;
function keeperSay(moment, { delay = 0, force = false } = {}) {
  const now = Date.now();
  if (!force && now - lastKeeperSay < 15000) return; // never chatty
  lastKeeperSay = now;
  const k = equippedKeeper(save);
  // the line waits for a board banner (the LEVEL / EXTRA TRICKY start banner, a chain banner) to fade, so the
  // bubble never sits on it (also under Calm: banners still show there)
  const say = () => {
    if (screen !== 'game') return;
    const left = Number(fx.bannerLeft && fx.bannerLeft()) || 0;
    if (left > 0.02) { setTimeout(say, Math.ceil(left * 1000) + 120); return; }
    hud.keeperSay(`${k.name}: ${keeperLine(k, moment)}`);
  };
  setTimeout(say, delay);
}
game.onChain = (steps) => { if (steps >= 4 && screen === 'game') keeperSay('chain'); };

// ---- Living Star Keeper (src/game/keeperAnim.js): cosmetic reactions only. Never reads ad state, never nags.
const keeperEye = { x: 0, y: 0 };  // reused: where the buddy looks (client px)
let keeperGlanceAt = 0;            // a quick look at the last merge
const keeperGlancePt = { x: 0, y: 0 };
hud.setKeeperLookSource(() => {
  if (screen !== 'game' || !game.run) return null;
  const R = renderer;
  if (performance.now() - keeperGlanceAt < 650) return keeperGlancePt;
  const v = game.fallingVis;
  if (v) { keeperEye.x = R.cellX(v.c); keeperEye.y = R.cellY(v.r); return keeperEye; }
  if (!game.aim.visible || !R.L) return null;
  keeperEye.x = R.cellX(game.aim.x); keeperEye.y = R.L.aimY;
  return keeperEye;
});
game.onMergeStep = (m) => {
  if (screen !== 'game') return;
  keeperGlancePt.x = m.x; keeperGlancePt.y = m.y; keeperGlanceAt = performance.now();
  hud.keeperReact('chain', m.step); // 1 = happy hop, 2 = grin, 3 = cheer + sparkles, 4+ = starry spin + burst
  // a new highest orb this run (Sun and up), a group of 4+ or a Supernova: surprised, then proud
  if (m.supernova || m.size >= 4 || (m.newHigh && m.tier >= 5)) hud.keeperReact('bigMerge');
};

let screen = 'menu';

// ---- Autoplay (test mode): the bot taps like a player; autoplay runs are never saved
const openScreen = () => {
  const list = Array.from(document.querySelectorAll('#screens .screen')).filter((n) => !n.classList.contains('leaving'));
  return list.length ? list[list.length - 1] : null;
};
const autoplay = new Autoplay(game, {
  modal: () => {
    const n = openScreen();
    if (!n) return null;
    if (n.querySelector('.perk-card')) return 'perk';
    if (n.querySelector('[data-next]') && game.run && game.run.autoplay) return 'next';
    return 'other';
  },
  pickPerk: () => {
    const n = openScreen();
    const cards = n ? Array.from(n.querySelectorAll('.perk-card')) : [];
    const id = choosePerk(cards.map((c) => c.dataset.perk));
    const c = cards.find((x) => x.dataset.perk === id) || cards[0];
    if (c) c.click();
  },
  clickNext: () => { const n = openScreen(); const b = n && n.querySelector('[data-next]'); if (b) b.click(); },
  reduced: () => !!fx.reduced,
  onStuck: () => UI.toast('Autoplay: no move left. Your turn!'),
  testOptions: () => testOptions(save.settings),
});
/** Autoplay "Speed" test option: animations run sqrt(speed) faster in autoplay runs only. */
const autoAnimScale = () => (autoplay.enabled && game.run && game.run.autoplay ? Math.sqrt(testOptions(save.settings).speed) : 1);
autoplay.setEnabled(!!save.settings.autoplay);
hud.setAuto(!!save.settings.autoplay);
// the AUTO test pill shows only while Autoplay (test) is on, or with ?dev / #dev in the URL (docs/UX_FIRST_RUN.md Q4)
// tester tools: ?tester=1 turns them on for this device (kept in localStorage), ?tester=0 turns them off
let TESTER = (() => { try { return testerFromUrl(location.search + location.hash, localStorage); } catch (_) { return false; } })();
const DEV_BUILD = (() => { try { return /[?&#]dev\b/.test(location.search + location.hash); } catch (_) { return false; } })();
const autoVisible = () => DEV_BUILD || !!save.settings.autoplay;
hud.setAutoVisible(autoVisible());

function setSetting(k, v) {
  save.settings[k] = v;
  if (k === 'sound') Svc.setMuted(!v);
  if (k === 'music') Svc.setMusic(v);
  if (k === 'soundBackdrop') Svc.setSoundBackdrop(playableBackdrop(v, save));
  if (k === 'haptics') { Svc.setHaptics(v); if (v) Svc.haptic('light'); }
  if (k === 'calm') applyMotion();
  if (k === 'animSpeed') game.animSpeed = v === 2 ? 2 : 1;
  if (k === 'textSize' || k === 'leftHand' || k === 'shapes') {
    applyComfort();
    if (k === 'textSize') requestAnimationFrame(relayout);
    if (game.run) { hud.lastLevel = null; game.updateHud(); }
  }
  if (k === 'backdrop') applyBackdrop(backdropCtx);
  if (k === 'eveningLook' || k === 'eveningCalm' || k === 'eveningWaves') applyEvening();
  if (k === 'numbers') { hud.numbers = !!v; if (game.run) { hud.lastLevel = null; game.updateHud(); } }
  if (k === 'autoplay') {
    autoplay.setEnabled(!!v);
    hud.setAuto(!!v);
    hud.setAutoVisible(autoVisible());
    if (v && game.run && !game.run.ended && screen === 'game') game.markAutoplay();
    UI.toast(v ? 'Autoplay on: this run won\'t be saved' : 'Autoplay off: your turn', !!v, 1800);
  }
  // autoplay test options: perk sets apply to the current autoplay run right away
  if (k === 'test' && game.run && game.run.autoplay && !game.run.ended) { game.applyTestPerks(); game.updateHud(); }
  persist();
}

/**
 * Settings > Extras > Transfer progress: replace this device's progress with a checked code's save
 * (src/meta/transfer.js). The save object is replaced in place, so every module keeps the same reference. Ad caps
 * and counters, Remove Ads, purchases, the Nova Pass, stats sharing and the reminder stay this device's.
 * The progress it replaced is kept for a one-step "Undo transfer" (Settings > Extras) until the next run ends or the
 * page reloads, or until a purchase is granted (app.purchaseGranted: putting the old coins back would lose what was
 * bought); the undo goes through the same path, so this device's ad state and purchases stay as they are now.
 * The daily reminder is Unity-only (local notification), so the web has nothing to reschedule here.
 */
let undoTransferData = null;
function importProgress(data, isUndo = false) {
  game.quitToMenu();
  undoTransferData = isUndo ? null : JSON.parse(JSON.stringify(save));
  applyImport(save, data);
  flushSave();
  // presentation follows the imported settings (same as each setSetting branch)
  Svc.setMuted(!save.settings.sound);
  Svc.setMusic(save.settings.music !== false);
  Svc.setMusicTracks(save.settings.musicTracks);
  Svc.setSoundBackdrop(playableBackdrop(save.settings.soundBackdrop, save));
  Svc.setHaptics(save.settings.haptics);
  game.animSpeed = save.settings.animSpeed === 2 ? 2 : 1;
  hud.numbers = !!save.settings.numbers;
  autoplay.setEnabled(!!save.settings.autoplay);
  hud.setAuto(!!save.settings.autoplay);
  hud.setAutoVisible(autoVisible());
  applyMotion();
  applyComfort();
  applyEvening();
  UI.setStatsMode(statsMode(save));
  welcomePending = false;
  pendingConstellation = -1;
  UI.closeAll();
  requestAnimationFrame(relayout);
  goMenu();
}

function relayout() {
  renderer.resize();
  const m = hud.measure();
  const L = renderer.layout(m.top, m.bottom);
  // tutorial hints sit over the (empty) top of the board, never over the stack
  const hint = document.getElementById('hint');
  // keeper bubble and in-play toasts start at the same spot, below the drop preview (screens.js playStackTop)
  hud.root.dataset.playTop = String(Math.round(L.by + L.cell * 0.35));
  if (hint) { hint.style.top = Math.round(L.by + L.cell * 0.35) + 'px'; hint.style.bottom = 'auto'; }
  if (lessonView && coach.active) { const s = lessonView; requestAnimationFrame(() => { if (lessonView === s) drawLessonStep(s); }); }
}

// ------------------------------------------------------------------ nebula backdrops
// Presentation only: the theme follows the Journey chapter / Endless sector (or the player's pick).
let backdropCtx = { mode: 'menu' };
function applyBackdrop(ctx, { instant = false, announce = false } = {}) {
  backdropCtx = ctx;
  // the background is its own choice: wearing a cosmic orb skin never swaps the player's view
  const theme = resolveBackdrop(save.settings.backdrop, ctx, save);
  renderer.setBackdrop(theme.id, { instant });
  // first time a theme shows up in play: one quiet toast (never for autoplay runs)
  if (announce && !(game.run && game.run.autoplay)) {
    if (!Array.isArray(save.backdropsSeen)) save.backdropsSeen = ['violet'];
    if (!save.backdropsSeen.includes(theme.id)) {
      save.backdropsSeen.push(theme.id);
      persist();
      UI.toast(uiLook(save) === 'cosmic' ? t('toast.newNebula', { name: theme.name }) : t('toast.newView', { name: theme.name }), false, 2000);
    }
  }
  return theme;
}
game.onSector = (sector) => {
  if (game.run && game.run.mode === 'endless') applyBackdrop({ mode: game.run.daily ? 'daily' : 'endless', sector }, { announce: true });
};

// ------------------------------------------------------------------ routing
// bumped when the app moves on (menu or a new run): a result screen still waiting to show is then dropped
let resultSeq = 0;
function showResultLater(fn, ms) {
  const seq = resultSeq;
  setTimeout(() => { if (seq === resultSeq) fn(); }, ms);
}

// ---- Calm card pacing on Home (docs/UX_RETENTION.md item 2; rules in src/meta/menuCards.js). One card per Home visit:
// a return day opens with the daily gift (the welcome-back merges into it); then at most ONE feature card a calendar day
// (weekly recap, constellation, Home's unlock / season moments; save.menuCardDay); none at all on the visit right after
// "Done for now" (quiet). Presentation only: nothing here reads ad state, difficulty or scores.
let menuVisit = null; // { quiet, card, plan } for the current Home visit (null before the first)
/** Home's own onboarding cards (first run, café reveal, v3 welcome) keep the stage to themselves. */
function homeOwnCardDue() {
  const firstRun = (save.runs || 0) === 0 && !(save.cafe && save.cafe.intro);
  return firstRun || cafeRevealDue(save) || v3CardDue(save) || cafeStageHeld(save); // + the café tour and new-area intros
}
function returnGiftFirst() {
  return returnGiftDue(save) && !tutorialDue(save) && !homeOwnCardDue();
}
/** May Home show an unlock / season moment on this visit? */
function homeCardOk() {
  return !!menuVisit && !menuVisit.quiet && !menuVisit.card && !menuVisit.plan && menuCardFree(save);
}

function goMenu(opts = {}) {
  Svc.setInBook(false); // leaving Puzzle Books (a no-op otherwise)
  endLesson();
  endTrial();
  resultSeq++;
  const fresh = screen !== 'menu' || !menuVisit;
  screen = 'menu';
  if (fresh) {
    menuVisit = { quiet: !!(opts && opts.quiet), card: false, plan: null };
    // decided before Home renders, so its own moment card knows this visit is taken
    if (!menuVisit.quiet) {
      if (returnGiftFirst()) menuVisit.plan = 'gift';
      else if (welcomePending) menuVisit.plan = 'welcome';
      else if (weeklyCardDue(save) && menuCardFree(save)) menuVisit.plan = 'weekly';
      else if (pendingConstellation >= 0 && menuCardFree(save)) menuVisit.plan = 'constellation';
    }
  } else if (opts && opts.quiet) menuVisit.quiet = true;
  game.quitToMenu();
  hud.hide();
  applyBackdrop({ mode: 'menu' });
  UI.showMenu(app);
  announceMenuSong();
  applyEvening();
  if (!fresh || menuVisit.quiet) { if (!quietOfferOpen()) Svc.showMenuBanner(); return; } // a refresh of this visit, or a quiet one
  // decide first whether a card is due, so the banner never flashes up just to be hidden
  const plan = menuVisit.plan;
  if (plan) menuVisit.card = true;
  if (plan === 'gift') { welcomeWaiting = true; maybeReturnGift(); }
  else if (plan === 'welcome') { welcomeWaiting = true; maybeWelcomeBack(); }
  // "Your puzzle week" (once, in a new week) goes before a finished constellation (it then waits, in memory)
  else if (plan === 'weekly') { eveningPending = true; maybeShowWeekly(); }
  else if (plan === 'constellation') { eveningPending = true; maybeShowConstellation(); }
  else if (!menuVisit.card && eveningOfferDue()) { menuVisit.card = true; /* never beside Home's own moment card */ eveningPending = true; maybeOfferEvening(); } else Svc.showMenuBanner();
}

/** A return day's gift card ("Good evening"), first on Home; the welcome-back card's lines and gift merge into it. */
function maybeReturnGift() {
  const visit = menuVisit; // the timer belongs to this Home visit: a later (quiet) visit never gets the card
  setTimeout(() => {
    welcomeWaiting = false;
    if (visit !== menuVisit || screen !== 'menu') return;
    const open = Array.from(document.querySelectorAll('#screens .screen')).filter((n) => !n.classList.contains('leaving'));
    if (open.length !== 1 || !open[0].classList.contains('menu') || !returnGiftDue(save)) { if (!quietOfferOpen()) Svc.showMenuBanner(); return; }
    let welcome = null;
    if (welcomePending) {
      welcomePending = false;
      claimWelcomeBack(save);
      welcome = welcomeSummary(save);
      persist();
      UI.refreshCoins(save);
    }
    Svc.hideBanner();
    UI.showDailyReward(app, {
      mode: 'return',
      greeting: greeting(new Date()),
      welcome,
      onClose: () => {
        if (screen !== 'menu') return;
        // the gift is not a feature card: when it closes, the oldest waiting unlock moment ("here is what's new") gets
        // this visit, still one card at a time and at most one feature card a day (docs/UX_FIRST_WEEK.md F1)
        if (visit === menuVisit && nextUnlockMoment(save) && menuCardFree(save)) { visit.plan = null; visit.card = false; }
        UI.showMenu(app);
        Svc.showMenuBanner();
      },
    });
    setTimeout(() => { if (quietOfferOpen()) Svc.hideBanner(); }, 500);
  }, 700);
}

// "Your puzzle week" recap (src/meta/weekly.js): queued behind the welcome-back, constellation and Comet Week cards,
// shown alone on a quiet menu (never stacked) and once per week. No reward, no ad, no play button.
let weeklyTimer = 0;
function maybeShowWeekly() {
  clearTimeout(weeklyTimer);
  weeklyTimer = setTimeout(() => {
    eveningPending = false;
    if (screen !== 'menu') return;
    if (!weeklyCardDue(save)) { Svc.showMenuBanner(); return; }
    const open = Array.from(document.querySelectorAll('#screens .screen')).filter((n) => !n.classList.contains('leaving'));
    if (open.length !== 1 || !open[0].classList.contains('menu')) { if (!quietOfferOpen()) Svc.showMenuBanner(); return; } // next menu visit
    markWeeklySeen(save);
    markMenuCard(save); // the feature card of the day
    persist();
    Svc.hideBanner();
    showWeeklyCard(app, () => { if (screen === 'menu') Svc.showMenuBanner(); });
    setTimeout(() => { if (quietOfferOpen()) Svc.hideBanner(); }, 500);
  }, 700);
}

// ---- Welcome-back card (src/meta/welcomeBack.js): decided once at launch, shown on the menu when nothing else
// is open (never stacked with another modal: it waits for the next clear menu in this session, or is skipped).
// No ad on it and nothing here reads ad state; the gift is added when the card shows.
let welcomePending = false; // due at this launch and not shown yet
let welcomeWaiting = false; // about to show: keep the menu banner hidden
function maybeWelcomeBack() {
  const visit = menuVisit; // only for the visit that planned it
  setTimeout(() => {
    welcomeWaiting = false;
    if (visit !== menuVisit || screen !== 'menu' || !welcomePending) return;
    const open = Array.from(document.querySelectorAll('#screens .screen')).filter((n) => !n.classList.contains('leaving'));
    if (open.length !== 1 || !open[0].classList.contains('menu')) { if (!quietOfferOpen()) Svc.showMenuBanner(); return; }
    welcomePending = false;
    claimWelcomeBack(save);
    persist();
    Svc.hideBanner();
    const wb = welcomeSummary(save);
    if (bakeReady(save)) wb.lines = [...wb.lines, bakeWelcomeLine(ovenBake(save))]; // "Your … are still warm in the oven."
    UI.showWelcomeBack(app, wb, (play) => {
      if (play) { app.startLevel(Math.min(save.journey.level, LEVEL_COUNT)); return; }
      if (screen !== 'menu') return;
      UI.showMenu(app);
      Svc.showMenuBanner(); // one card per Home visit: the evening offer waits for the next one
    });
    setTimeout(() => { if (quietOfferOpen()) Svc.hideBanner(); }, 500); // a banner that was still loading
  }, 700);
}

// Observatory (src/meta/observatory.js): the chapter whose constellation a Journey win just finished.
// Held in memory only (no save field) and shown once, alone on the menu: never stacked on another modal.
let pendingConstellation = -1;
let constellationTimer = 0;
function maybeShowConstellation() {
  clearTimeout(constellationTimer);
  constellationTimer = setTimeout(() => {
    eveningPending = false;
    if (screen !== 'menu') return; // a run (e.g. Zen, which has no onRunStart) began during the delay: no menu banner
    if (pendingConstellation < 0) { Svc.showMenuBanner(); return; }
    const open = Array.from(document.querySelectorAll('#screens .screen')).filter((n) => !n.classList.contains('leaving'));
    if (open.length !== 1 || !open[0].classList.contains('menu')) { Svc.showMenuBanner(); return; } // try again on the next menu visit
    const ch = pendingConstellation;
    markMenuCard(save); // the feature card of the day
    persist();
    pendingConstellation = -1;
    Svc.hideBanner();
    UI.showConstellationDone(app, ch, () => { if (screen === 'menu') { UI.showMenu(app); Svc.showMenuBanner(); } });
    setTimeout(() => { if (quietOfferOpen()) Svc.hideBanner(); }, 500);
  }, 700);
}

let eveningPending = false; // an evening offer is about to show: keep the menu banner hidden
function eveningOfferDue() {
  const adShowing = !!document.querySelector('.nd-ad-mock');
  return shouldOfferEvening(save, new Date(), { inRun: !!(game.run && !game.run.ended), adShowing, secondsSinceAd: Svc.secondsSinceAd() });
}

/**
 * Evening wind-down offer: at most once per evening, only on the menu with nothing else open, never
 * during a run, never within a minute of a full-screen ad and never beside an ad (no menu banner).
 */
function maybeOfferEvening() {
  const visit = menuVisit; // only for the visit that planned it
  setTimeout(() => {
    eveningPending = false;
    if (visit !== menuVisit || screen !== 'menu') return;
    const open = Array.from(document.querySelectorAll('#screens .screen')).filter((n) => !n.classList.contains('leaving'));
    if (open.length !== 1 || !open[0].classList.contains('menu') || !eveningOfferDue()) { Svc.showMenuBanner(); return; }
    save.eveningAsked = eveningKey(); // shown once this evening, whatever the answer
    persist();
    Svc.hideBanner();
    UI.showEveningOffer(app, (answer) => {
      answerEvening(save, answer);
      persist();
      applyEvening();
      if (answer === 'yes') UI.toast('Evening look on. Change it any time in Settings, Comfort', true, 2600);
      // Zen Drift shortcut (only offered once Zen is open): a calm, tide-free run with no ads
      if (answer === 'zen' && zenOpen(save)) { app.startZen(); return; }
      if (screen === 'menu') { UI.showMenu(app); Svc.showMenuBanner(); }
    }, { zen: zenOpen(save) });
    setTimeout(() => { if (quietOfferOpen()) Svc.hideBanner(); }, 500); // a banner that was still loading
  }, 700);
}

/** Wear (or, with null, take off) a trial pack look: its orb skin plus the board and combo looks it comes with. */
function applyTrial(skinId) {
  const pack = skinId ? PACKS.find((p) => p.skin.id === skinId) : null;
  trialSkinNow = pack ? skinId : null;
  if (!game) return;
  game.skinTrial = trialSkinNow;
  game.boardTrial = pack ? pack.board : null;
  game.fxTrial = pack ? pack.combo : null;
}

/** The tried level is over (won, lost or left): the player's own look is back, with one quiet message. */
function endTrial() {
  const own = SKINS.find((s) => s.id === ((save.skins && save.skins.equipped) || 'classic'));
  const msg = trial.end(own ? own.name : 'your own look');
  applyTrial(null);
  if (msg) UI.toast(msg, false, 3200);
}

/** level: the Journey level starting (a booked trial is worn only by its own level); none for every other mode. */
function beginPlay(level = 0) {
  Svc.setInBook(false); // startBookPuzzle turns it back on right after
  endTrial();
  if (level) applyTrial(trial.begin(level)); else trial.cancel();
  resultSeq++;
  retryLevelAfterFail = 0;
  screen = 'game';
  applyEvening();
  UI.closeAll();
  Svc.hideBanner();
  hud.setKeeper(equippedKeeper(save).id, false, equippedOutfit(save));
  hud.hideKeeperSay();
  hud.show();
  requestAnimationFrame(relayout);
  relayout();
}

// ---- Puzzle Books (DESIGN.md "Puzzle Books", src/meta/books.js, src/ui/books.js)
// A book puzzle is not a run: no onRunStart/onRunEnd (so no ad of any kind), no coins, stars, Today credit, Journal,
// stats or run snapshot, and the test bot never plays it. Its position lives in save.books.cur after every drop.

/** Open puzzle n of book id on the board, carrying on from its saved position when it is the puzzle in progress. */
function startBookPuzzle(id, n) {
  const p = puzzleOf(id, n);
  if (!p || !canPlay(save, id, n)) return;
  const c = bookCur(save, id);
  const from = c && c.n === n ? c : { cols: [], tries: 0 };
  setBookCur(save, id, n, from.cols, from.tries);
  persist();
  beginPlay();
  Svc.setInBook(true);
  game.startBook(p, { id, cols: from.cols, tries: from.tries });
  applyBackdrop({ mode: 'journey', level: Math.min(save.journey.level, LEVEL_COUNT) });
  relayout();
  hud.hideHint();
}

/** Home with the book page open (no banner: the books screens are ad-free too). */
function backToBook(id) {
  resultSeq++;
  endTrial();
  screen = 'menu';
  game.quitToMenu();
  hud.hide();
  applyBackdrop({ mode: 'menu' });
  UI.showMenu(app);
  applyEvening();
  Svc.setInBook(true);
  return UI.showBook(app, id); // the book page (showBookSolved re-renders it after "Get the book")
}

/** A book puzzle ended: solved, out of pieces, or Pause > Back to the book. */
function bookOver(res) {
  hud.hideHint();
  hud.hideKeeperSay();
  if (res.left) { backToBook(res.id); return; }
  if (res.won) {
    const got = markSolved(save, res.id, res.n);
    persist();
    hud.keeperReact('win');
    showResultLater(() => UI.showBookSolved(app, res, got, {
      onNext: (n) => startBookPuzzle(res.id, n),
      onBack: () => backToBook(res.id),
      onHome: () => goMenu(),
    }), 250);
    return;
  }
  showResultLater(() => UI.showBookOut(app, res, {
    onRetry: () => game.bookRestart([], res.tries + 1),
    onUndo: () => game.bookRestart(res.cols.slice(0, -1)),
    onBack: () => backToBook(res.id),
  }), 150);
}

/** A run picked its song: remembered quietly (no toast during play, so level starts stay calm). */
function noteSong(id) { if (id) currentSong = id; }

/**
 * '♪ Now playing: <song>' toast, shown on the menu only, once per new song, and only when music is
 * actually audible. (A pick in the Tracks sheet announces itself there.)
 */
function announceMenuSong() {
  const id = currentSong;
  if (!id || id === lastAnnouncedSong || !save.settings.sound || save.settings.music === false) return;
  const t = Svc.musicTracks().find((x) => x.id === id);
  if (!t) return;
  lastAnnouncedSong = id;
  setTimeout(() => { if (screen === 'menu') UI.nowPlayingToast(t.name); }, 400);
}

/**
 * opts.steady: accepted Steady Start; opts.steadyAsked: the offer was already answered for this attempt.
 * opts.tipSeen: the hard-level tip card was already shown for this attempt.
 */
function startLevel(n, opts = {}) {
  // the guided first Level 1 / "How to play" (docs/UX_FIRST_RUN.md): no story, offers, tip card or rule card
  if (opts.tutorial) { startLesson(opts.tutorial === 'practice', opts.from || null); return; }
  tipUntilMerge = false;
  n = Math.max(1, Math.min(n, LEVEL_COUNT));
  // a level that introduces a new rule (orders, glaze, teapots) gets one message at a time (docs/UX_MECHANICS.md P1)
  const mech = mechanicKind(getLevel(n), save.journey.stars);
  // Pip's chapter story, once, when the player's newest Journey chapter is first played (skippable)
  // (chapter 0, Pip's first story, waits for the first win so Level 1 starts at once; src/meta/onboarding.js)
  // On a new rule's first level the story waits for the next level start, so the rule is the one new thing.
  const ch = save.settings.autoplay || mech ? -1 : storyDueNow(save, n);
  if (ch >= 0) { UI.showStory(app, ch, () => startLevel(n, opts)); return; }
  // Steady Start: after 3 fails in a row, a free optional Wild Orb on the start board. Never shown
  // with an ad and never depends on ads (DESIGN.md). Not for autoplay runs.
  if (!opts.steadyAsked && !save.settings.autoplay && shouldOfferSteady(save, n)) {
    Svc.hideBanner(); // the offer is never shown beside an ad
    UI.showSteadyOffer(app, n, (accept) => {
      if (accept === null) { goMenu(); return; } // Back: always somewhere live (never a stale result or dead board)
      startLevel(n, { steadyAsked: true, steady: accept });
    });
    return;
  }
  // Hard-level tip card (src/meta/levelTips.js): one plain strategy tip before a Hard level's first
  // attempt or after 2 fails in a row. Never with the Steady Start offer (tipDue checks) or beside an ad.
  if (!opts.tipSeen && !opts.steadyAsked && tipDue(save, n)) {
    Svc.hideBanner();
    markTipShown(save, n);
    persist();
    UI.showTipCard(app, n, (play) => {
      if (!play) { goMenu(); return; }
      startLevel(n, { ...opts, tipSeen: true });
    });
    return;
  }
  autoSeen.clear();
  journalNewGame();
  noteSong(Svc.musicNewRun()); // one random enabled song per level attempt (Math.random, not the game RNG)
  beginPlay(n); // wears a booked "Try for a level" look: trial.begin(n)
  // Nova Streak: every Journey level starts with one Wild Orb per charge held (never for autoplay runs)
  // a new rule's level starts quietly: no LEVEL banner and no "A new view" toast (it announces on a later level)
  // Tonight's bake (docs/UX_TONIGHTS_BAKE.md): a ready bake puts one plain warm piece on this level's start board; a
  // retry keeps it, another level drops it. Only her next new level, and only when the piece has room next to the
  // Steady Start / Nova Streak orbs (otherwise the bake waits). Seeded by the level only; never for autoplay runs.
  const steadyOn = !!opts.steady && !save.settings.autoplay;
  const streakN = save.settings.autoplay ? 0 : streakCharges(save);
  const bakeBefore = JSON.stringify(save.bake);
  const baked = save.settings.autoplay ? null : consumeBakeForLevel(save, n, new Date(), bakeFits(getLevel(n), { steady: steadyOn, streak: streakN }, BAKE_TIER));
  if (JSON.stringify(save.bake) !== bakeBefore) persist();
  game.startRun({ level: n, steady: steadyOn, streak: streakN, bake: baked ? baked.tier : 0, quietStart: !!mech });
  if (baked && baked.fresh) UI.toast(bakeToastLine(bakeById(baked.id), tierName(BAKE_TIER)), true, 4200);
  applyBackdrop({ mode: 'journey', level: n }, { announce: !mech });
  relayout();
  const lv = getLevel(n);
  hud.hideHint();
  wireGoalHelp(lv, mech);
  if (mech) {
    // first level with this rule ever: "New in the café", one "Got it", the game paused (also under Calm); after
    // that (and on retries) the rule box at the top until the player uses the mechanic
    save.mechSeen = save.mechSeen || {};
    if (!save.mechSeen[mech] && !save.settings.autoplay) {
      save.mechSeen[mech] = true; // the card is on screen now
      persist();
      game.pause();
      const og = lv.goals.find((g) => g.type === 'order') || {};
      UI.showMechanicCard(app, { kind: mech, text: MECHANIC_TEXT[mech], tier: og.tier, count: og.count || 1 }).then(() => {
        game.resume();
        if (screen === 'game' && game.run && game.run.level && game.run.level.n === lv.n && !game.run.ended) showIntroHint(mech);
      });
    } else showIntroHint(mech);
  } else if (lv.tip) { hud.showHint(skinTierText(lv.tip)); tipUntilMerge = n === 1; } else keeperSay('start', { delay: 700, force: true });
}

// ---- First-run lesson (docs/UX_FIRST_RUN.md): the guided Level 1 on first launch and its "How to play" replay.
// Presentation only: the coach overlay (src/ui/coach.js) follows the step machine in src/meta/firstRun.js. Nothing here
// reads ad state or changes a rule; the run's only difference (a quiet +5 drops at 0) lives in game.js tutorialTopUp.
const coach = new Coach(document.body);
let lesson = null;      // createLesson() while a lesson runs
let lessonView = null;  // the step on screen now
let lessonFrom = null;  // practice replay: where Back returns ('settings' | 'more' | null)
const inLesson = () => !!(lesson && game.run && game.run.tutorial && !game.run.ended && screen === 'game');
function nodeRect(node, pad = 6, r = 14) {
  if (!node || !node.getBoundingClientRect) return null;
  const b = node.getBoundingClientRect();
  if (!b.width && !b.height) return null;
  return { x: b.left - pad, y: b.top - pad, w: b.width + pad * 2, h: b.height + pad * 2, r };
}
function drawLessonStep(step) {
  lessonView = step;
  if (!step || !inLesson()) { coach.hide(); return; }
  coach.reduced = fx.reduced;
  const L = renderer.L;
  const r = game.run;
  const b = r.board;
  const base = { step, onSkip: () => skipLesson() };
  if (step === 'drop') {
    const c = Math.floor(b.cols / 2);
    const top = L.aimY - L.cell * 0.62;
    const bottom = L.by + L.bh;
    const name = r.current ? tierName(r.current.tier).toLowerCase() : '';
    const tipY = renderer.cellY(b.rows - 1) - L.cell * 0.55;
    coach.show({
      ...base,
      text: name ? LESSON_COPY.drop.replace('cookie', name) : LESSON_COPY.drop,
      holes: [{ x: L.bx + c * L.cell + 2, y: top, w: L.cell - 4, h: bottom - top, r: 16 }],
      hand: { x: renderer.cellX(c), y: tipY, dir: 'down', travel: Math.max(40, tipY - L.aimY) },
      passThrough: true,
      place: { below: bottom + 4, above: top },
    });
    return;
  }
  if (step === 'merge') {
    let best = null;
    for (let row = 0; row < b.rows; row++) for (let col = 0; col < b.cols; col++) {
      const p = getCell(b, row, col);
      if (p && p.tier != null && !p.kind && (!best || p.tier > best.tier || (p.tier === best.tier && row > best.row))) best = { row, col, tier: p.tier };
    }
    const holes = [];
    let place = {};
    if (best) {
      const x = renderer.cellX(best.col), y = renderer.cellY(best.row), s = L.cell * 1.15;
      holes.push({ x: x - s / 2, y: y - s / 2, w: s, h: s, r: s / 2 });
      place = { above: y - s / 2 - 8, below: y + s / 2 + 8 };
    }
    coach.show({ ...base, text: LESSON_COPY.merge, holes, ok: true, tapAnywhere: true, onOk: () => lessonOk(), place });
    return;
  }
  if (step === 'goal') {
    const g = nodeRect(hud.goalNodes && hud.goalNodes[0]);
    const d = nodeRect(hud.dropsChip);
    const holes = [g, d].filter(Boolean);
    const low = Math.max(...holes.map((h) => h.y + h.h), L.by);
    coach.show({
      ...base, text: LESSON_COPY.goal, holes, ok: true, tapAnywhere: true, onOk: () => lessonOk(),
      hand: g ? { x: g.x + g.w / 2, y: g.y + g.h + 4, dir: 'up' } : null,
      place: { below: low + 62 },
    });
    return;
  }
  if (step === 'next') {
    const c = game.aim ? game.aim.col : Math.floor(b.cols / 2);
    const s = L.cell * 1.1;
    const cur = { x: renderer.cellX(c) - s / 2, y: L.aimY - s / 2, w: s, h: s, r: s / 2 };
    const nx = nodeRect(hud.nextCanvas && (hud.nextCanvas.closest ? hud.nextCanvas.closest('#next-slot') : hud.nextCanvas.parentNode));
    const holes = [cur, nx].filter(Boolean);
    coach.show({
      ...base, text: LESSON_COPY.next, holes, ok: true, tapAnywhere: true, onOk: () => lessonOk(),
      hand: nx ? { x: nx.x + nx.w / 2, y: nx.y - 4, dir: 'down' } : null,
      place: nx ? { above: nx.y - 60, below: cur.y + cur.h + 8 } : { below: cur.y + cur.h + 8 },
    });
    return;
  }
  if (step === 'play') {
    coach.show({ step, text: LESSON_COPY.play, strip: true, onOk: () => lessonOk(), place: { below: L.by + L.cell * 0.2 - 12 } });
  }
}
/** Apply what the step machine says: pause for OK steps, draw (or clear) the step, point once if she is stuck. */
function applyLesson(o) {
  if (!o || !lesson) return;
  if (o.pause) game.pause(); else game.resume();
  if (o.show !== lessonView || (o.show && !coach.active)) {
    if (o.show) drawLessonStep(o.show); else { coach.hide(); lessonView = null; }
    if (!o.show && lesson.step === 'done') setTimeout(nextDiscovery, 250); // cards held during the lesson
  }
  if (o.nudge) nudgeLesson();
}
function lessonOk() { if (lesson) { Svc.sfx('ui'); applyLesson(lesson.ok()); } }
/** T5: two drops in a row without a merge: the hand comes back once over a column that merges. */
function nudgeLesson() {
  const r = game.run;
  if (!inLesson() || !coach.active || !r.current) return;
  const fits = nextFitCells(r.board, r.current, r.mods && r.mods.boardOpts);
  if (!fits.length) return;
  coach.removeHand();
  coach.addHand({ x: renderer.cellX(fits[0].col), y: renderer.cellY(fits[0].row) - renderer.L.cell * 0.45, dir: 'down' });
}
/** Skip: the guidance goes, Level 1 carries on as a normal level (its tip line stays until the first merge). */
function skipLesson() {
  if (!lesson) return;
  Svc.sfx('ui');
  lesson.skip();
  coach.hide();
  lessonView = null;
  hud.setTutorialHud(false);
  if (game.run) game.run.tutorialSkipped = true;
  game.resume();
  if (!lesson.practice) { markTutorialDone(save); persist(); }
  const lv = game.run && game.run.level;
  if (lv && lv.tip) { hud.showHint(skinTierText(lv.tip)); tipUntilMerge = true; }
  setTimeout(nextDiscovery, 250);
}
function endLesson() {
  coach.hide();
  lessonView = null;
  lesson = null;
  hud.setTutorialHud(false);
}
/** Start the lesson on Level 1. practice: the "How to play" replay (records nothing). from: where Back returns. */
function startLesson(practice = false, from = null) {
  const n = 1;
  autoSeen.clear();
  if (practice) runFeats = []; else journalNewGame();
  noteSong(Svc.musicNewRun());
  beginPlay(n);
  game.startRun({ level: n, streak: 0, quietStart: true, tutorial: practice ? 'practice' : 'first' });
  applyBackdrop({ mode: 'journey', level: n });
  relayout();
  hud.hideHint();
  wireGoalHelp(getLevel(n), null);
  hud.setTutorialHud(true);
  lesson = createLesson({ practice });
  lessonFrom = from;
  lessonView = null;
  const go = lesson;
  // wait for the layout and the first piece's entrance before the first step
  setTimeout(() => { if (lesson === go && inLesson()) applyLesson(lesson.start()); }, fx.reduced ? 60 : 650);
}
/** The practice replay is over: back where she came from (nothing was saved). */
function practiceBack() {
  const from = lessonFrom;
  lessonFrom = null;
  goMenu();
  if (from === 'settings') UI.showMore(app, 'comfort'); // back where How to play was tapped
}
let tipUntilMerge = false; // Level 1's tip line (and a skipped lesson's) stays until the first merge (Q2)


/** Tap the order ticket / teapot chip (or the "Glaze" / "Tin" chip on the first glaze / tin levels) to re-read the rule. */
function wireGoalHelp(lv, mech) {
  hud.setGoalHelp(lv, {
    orders: MECHANIC_TEXT.orders, teapot: MECHANIC_TEXT.teapot, glaze: MECHANIC_TEXT.glaze, tin: MECHANIC_TEXT.tin,
    glazeChip: glazeInfoChip(lv), tinChip: tinInfoChip(lv), isNew: { orders: mech === 'orders', teapot: mech === 'teapot' },
  }, rereadRule);
}

/** A resumed Journey run: has it already used this level's new mechanic? (then the rule box stays away) */
function mechanicUsedInRun(r, kind) {
  const lv = r && r.level;
  if (!lv || !Array.isArray(r.prog)) return false;
  const progOf = (type) => lv.goals.some((g, i) => g.type === type && (r.prog[i] || 0) > 0);
  if (kind === 'orders') return progOf('order');
  if (kind === 'teapot') return progOf('teapot');
  if (kind === 'glaze') {
    let start = 0, now = 0;
    for (const row of lv.prefill || []) for (const x of row) if (typeof x === 'string' && x[0] === 'Z') start++;
    for (const x of (r.board && r.board.cells) || []) if (x && x.glazed) now++;
    return now < start;
  }
  if (kind === 'tin') { // used once a tin has opened (fewer tins on the board than the level started with)
    let start = 0, now = 0;
    for (const row of lv.prefill || []) for (const x of row) if (typeof x === 'string' && x[0] === 'K') start++;
    for (const x of (r.board && r.board.cells) || []) if (x && x.kind === 'tin') now++;
    return now < start;
  }
  return false;
}

/** Daily Nebula: today's (or one of the last 6 days') date-seeded puzzle level. */
function startNebula(key) {
  if (!isPlayableDay(key)) key = dayKey();
  // weekly café twist: only mechanics the player has met in the Journey (a played day keeps its first twist)
  const lv = getDailyLevel(key, dailyTwistFor(save, key));
  autoSeen.clear();
  journalNewGame();
  noteSong(Svc.musicNewRun());
  beginPlay();
  // the first finished attempt of a date is its scored attempt (no undo, comparable for everyone);
  // replays after it are practice, where the free undo is allowed
  const practice = !!(save.nebula && save.nebula.days && save.nebula.days[key]);
  game.startRun({ levelDef: lv, practice });
  // a different nebula backdrop each day (presentation only; no "new nebula" toast)
  const dn = daysBetween('2026-01-01', key) || 0;
  applyBackdrop({ mode: 'journey', level: 1 + (((dn % 10) + 10) % 10) * 10 });
  relayout();
  hud.hideHint();
  dailyTwistStart(lv, () => keeperSay('start', { delay: 700, force: true }));
}

/**
 * Today's Special twist at the start: the order / teapot chips re-read their rule, and a twist day names its twist.
 * A mechanic the player has not met yet (a friend's code) shows its rule text instead, so no rule arrives cold.
 */
function dailyTwistStart(lv, otherwise) {
  hud.setGoalHelp(lv, { orders: MECHANIC_TEXT.orders, teapot: MECHANIC_TEXT.teapot, glaze: MECHANIC_TEXT.glaze, isNew: {} }, rereadRule);
  const mechs = twistMechs(lv.twist);
  const met = DAILY_MECHS.slice(0, dailyStage(save.journey && save.journey.stars));
  const unmet = mechs.find((m) => !met.includes(m));
  if (unmet && MECHANIC_TEXT[unmet]) { showIntroHint(unmet); return true; }
  if (lv.twist && lv.twist !== 'plain') { hud.showHint(`Today: ${twistLabel(lv.twist)}`); return true; }
  if (otherwise) otherwise();
  return false;
}

/**
 * Challenge a friend (DESIGN.md): the sender's exact puzzle (seed, tide, starting kit) from a decoded code.
 * Endless or a Daily Nebula date. It never records a best, a daily score or a Daily Nebula attempt.
 */
function startFriend(c) {
  if (!c) return;
  autoSeen.clear();
  journalNewGame();
  noteSong(Svc.musicNewRun());
  beginPlay();
  if (c.mode === 'nebula') {
    // the sender's twist travels in the code, so both play the identical board
    const lv = getDailyLevel(c.date, (c.kit && c.kit.twist) || 'plain');
    game.startRun({ levelDef: lv, friend: c });
    const dn = daysBetween('2026-01-01', c.date) || 0;
    applyBackdrop({ mode: 'journey', level: 1 + (((dn % 10) + 10) % 10) * 10 });
    relayout();
    if (!dailyTwistStart(lv, null)) hud.showHint(goalLine(c));
    return;
  }
  game.startRun({ friend: c });
  applyBackdrop({ mode: 'endless', sector: 1 });
  relayout();
  hud.showHint(goalLine(c));
}

/** challenge: Endless tide tier (remembered as the last choice). The daily challenge is always Standard. */
function startEndless(daily, challenge, path) {
  if (!daily && challenge != null) { save.settings.challenge = normChallenge(challenge); persist(); }
  // Paths + Resonance: undefined = the last Path picked; null = no Path. Never on the daily challenge.
  if (!daily && path !== undefined) { setLastPath(save, path); persist(); }
  const pathId = daily ? null : lastPath(save);
  const tier = daily ? 'standard' : normChallenge(save.settings.challenge);
  autoSeen.clear();
  journalNewGame();
  noteSong(Svc.musicNewRun()); // one random enabled song per run
  beginPlay();
  game.startRun({ daily, seed: daily ? dailyChallengeSeed() : null, challenge: tier, path: pathId });
  applyBackdrop({ mode: daily ? 'daily' : 'endless', sector: 1 });
  relayout();
  if ((save.runs || 0) === 0 && !daily) hud.showHint('Tap a column to drop. Touching orbs of the same kind merge! Keep the stack below the top line.');
  else { hud.hideHint(); keeperSay('start', { delay: 700, force: true }); }
}

/**
 * Zen Drift (src/meta/zen.js, DESIGN.md "Zen Drift"): Endless with no rising tide. Opens with the
 * menu extras (Level 3 cleared). No ads of any kind, and it never counts as a run for ad pacing.
 */
function startZen() {
  if (!zenOpen(save)) return;
  autoSeen.clear();
  journalNewGame();
  noteSong(Svc.musicNewRun());
  beginPlay();
  game.startRun({ zen: true });
  applyBackdrop({ mode: 'endless', sector: 1 });
  relayout();
  hud.hideHint();
  keeperSay('start', { delay: 700, force: true });
}

// ---- resume a run after the app/tab was closed or reloaded
/** snapSeq as last written to storage (by this tab or another one); -1 if unreadable. */
function storedSnapSeq() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    const d = raw ? JSON.parse(raw) : null;
    return d && Number.isInteger(d.snapSeq) ? d.snapSeq : -1;
  } catch (_) { return -1; }
}

/** Another tab moved the saved run on: this tab's copy is stale. Reload the save, back to the menu. */
function staleTab() {
  game.quitToMenu();
  const fresh = loadSave();
  for (const k of Object.keys(save)) if (!(k in fresh)) delete save[k];
  Object.assign(save, fresh);
  goMenu();
  UI.toast('This run continued in another tab or window', false, 3000);
}

/** Save (or clear, with null) the run snapshot. Refuses to overwrite a newer one from another tab. */
function writeSnapshot(snap) {
  if (storedSnapSeq() > (save.snapSeq || 0)) { staleTab(); return; }
  save.snapSeq = (save.snapSeq || 0) + 1;
  if (snap) { snap.seq = save.snapSeq; save.runSnap = snap; } else delete save.runSnap;
  persist();
}

function clearSnapshot() {
  if (!('runSnap' in save)) return;
  delete save.runSnap;
  save.snapSeq = (save.snapSeq || 0) + 1;
}

/** A saved run worth offering on the menu, or null. Broken, stale or past-day Daily runs are dropped. */
function savedRunInfo() {
  const s = save.runSnap;
  if (!s) return null;
  try {
    if (!validRunSnap(s)) throw new Error('invalid run snapshot');
    // saved under other rules (RULES_VERSION), or an older Journey run on a level the pacing pass changed (rules-9): rules or
    // levels may differ, so it is settled like a quit, not resumed
    if (!sameRules(s.build, s)) { discardSaved(); return null; }
    const r = s.run;
    // a Daily Challenge belongs to its own date; a Daily Nebula only while it is replayable
    if (s.mode === 'endless' && r.daily && r.dailyKey !== dayKey()) { discardSaved(); return null; }
    if (s.mode === 'journey' && s.nebula && !isPlayableDay(s.nebula)) { clearSnapshot(); persist(); return null; }
    if (r.friend && r.friend.mode === (s.mode === 'journey' ? 'nebula' : 'endless')) return { mode: s.mode, daily: false, label: `${r.friend.name || 'Friend'}'s challenge`, detail: s.mode === 'journey' ? `${r.dropsLeft} drops left` : `Sector ${r.sector} · ${Math.floor(r.score).toLocaleString('en-US')}` };
    if (s.mode === 'endless' && r.zen) return { mode: 'endless', daily: false, zen: true, label: 'Zen Drift', detail: `Sector ${r.sector} · ${Math.floor(r.score).toLocaleString('en-US')}` };
    if (s.mode === 'endless') return { mode: 'endless', daily: !!r.daily, label: r.daily ? 'Daily Challenge' : (r.challenge === 'gentle' ? 'Endless · Gentle' : r.challenge === 'bold' ? 'Endless · Bold' : 'Endless') + (PATH_BY_ID[r.path] ? ` · ${PATH_BY_ID[r.path].name}` : ''), detail: `Sector ${r.sector} · ${Math.floor(r.score).toLocaleString('en-US')}` };
    if (s.nebula) return { mode: 'journey', label: 'Daily Nebula', detail: `${r.dropsLeft} drops left` };
    return { mode: 'journey', label: `Level ${s.levelN}`, detail: `${r.dropsLeft} drops left` };
  } catch (e) {
    console.warn('[nova] dropping saved run', e);
    clearSnapshot();
    persist();
    return null;
  }
}

/**
 * The player ended the saved run from the menu: it is settled exactly like quitting from the
 * pause menu (coins, best, stats, run count, Daily Nebula attempt), with no results screen.
 */
function discardSaved() {
  const s = save.runSnap;
  clearSnapshot();
  let res = null;
  try { res = game.resultFromSnapshot(s); } catch (_) { res = null; }
  if (res) {
    // a past day's Daily Challenge score can't be recorded on today's board
    if (res.mode === 'endless' && res.daily && s.run.dailyKey !== dayKey()) res.daily = 'stale';
    if ((res.dropsUsed ?? res.drops ?? 1) > 0) recordNight(save);
    try {
      if (res.daily === 'stale') { res.daily = true; recordRunStats(save, res); settleEndless(res, { skipDaily: true }); } else settleRun(res);
    } catch (e) { console.warn(e); }
  }
  persist();
  flushSave();
  if (res && res.coins) UI.toast(`Saved run ended: +${res.coins.toLocaleString('en-US')} coins`, true);
}

/** Starting a different run while one is saved: ask first, never silently throw it away. */
async function guardSaved(start) {
  const info = save.runSnap ? savedRunInfo() : null;
  if (info) {
    const ok = await UI.confirmBox({
      title: 'Start a new run?',
      text: `Your saved ${info.label} run (${info.detail}) will end. It counts like quitting it.`,
      ok: 'Start new run', cancel: 'Keep it',
    });
    if (!ok) return;
    discardSaved();
  }
  start();
}

function resumeRun() {
  const snap = save.runSnap;
  if (!snap || !savedRunInfo()) { goMenu(); return; }
  if (storedSnapSeq() > (save.snapSeq || 0)) { staleTab(); return; }
  // a resumed run is the player's own run: autoplay (test mode) is switched off first
  if (save.settings.autoplay) setSetting('autoplay', false);
  autoSeen.clear();
  noteSong(Svc.musicNewRun());
  beginPlay();
  let ok = false;
  try { ok = game.restoreRun(snap, sameRules(snap.build, snap) ? snap.build : RULES_VERSION); } catch (e) { console.warn('[nova] restore failed', e); ok = false; }
  if (!ok) { game.quitToMenu(); clearSnapshot(); persist(); goMenu(); UI.toast('That run could not be restored'); return; }
  runStartedAt = Date.now();
  const r = game.run;
  if (r.mode === 'endless') applyBackdrop({ mode: r.daily ? 'daily' : 'endless', sector: r.sector });
  else if (r.nebula) { const dn = daysBetween('2026-01-01', r.nebula) || 0; applyBackdrop({ mode: 'journey', level: 1 + (((dn % 10) + 10) % 10) * 10 }); }
  else applyBackdrop({ mode: 'journey', level: r.level.n });
  relayout();
  hud.hideHint();
  // a Journey level that introduces a new rule keeps its "?" goal chips and, until the rule is used, its rule box
  if (r.mode === 'journey' && !r.nebula && r.level) {
    const mech = mechanicKind(r.level, save.journey.stars);
    wireGoalHelp(r.level, mech);
    if (mech && !mechanicUsedInRun(r, mech)) showIntroHint(mech);
  }
}

function pauseGame() {
  if (screen !== 'game' || !game.run || game.state !== 'playing') return;
  if (document.querySelector('#screens .screen')) return; // a modal is already up
  game.pause();
  Svc.sfx('ui');
  const skipN = TESTER && canSkipRun(game.run) ? game.run.level.n : 0;
  UI.showPause(app, {
    journey: game.run.mode === 'journey',
    zen: !!game.run.zen,
    book: !!game.run.book,
    onResume: () => game.resume(),
    onQuit: () => { game.resume(); game.forfeit(); },
    onSkip: skipN ? () => testerSkip(skipN) : null,
  });
}

/**
 * Tester tools: "Skip level (tester)" (src/meta/tester.js). The attempt in progress is dropped without being booked
 * (no forfeit, no onRunEnd, no stats or journal), the level is saved as a 1-star pass with the base coins, and the
 * next level starts like "Play on" after a win, with no result card and no ad of any kind.
 */
function testerSkip(n) {
  if (!TESTER) return;
  tipUntilMerge = false;
  if (game.run) game.quitToMenu();
  journalDiscard(save); // the dropped attempt's drops are not kept
  runFeats = [];
  clearSnapshot();
  endTrial();
  hud.hideHint();
  hud.hideKeeperSay();
  const r = skipLevel(save, n);
  if (r.constellation >= 0) pendingConstellation = r.constellation;
  persist();
  flushSave();
  UI.toast(t('tester.skipped', { n }), true);
  startLevel(Math.min(n + 1, LEVEL_COUNT));
}

/**
 * Predictable ad breaks (src/meta/adBreaks.js): READS AdDirector's caps after onRunEnd and never
 * changes them. screenAllows must match what leaving this screen passes to leaveResults.
 */
function adLineFor(screenAllows, doneButton) {
  return adBreakLine(Svc.adBreakForecast({ screenAllows }), { doneButton });
}

async function leaveResults(next, allowInterstitial) {
  if (allowInterstitial) {
    try { await Svc.maybeShowInterstitial('post_run'); } catch (_) { /* ignore */ }
  }
  next();
}

/**
 * Book a finished (or quit) run into the save: coins, best, stats, run count, Daily Nebula
 * attempt. No UI. Returns the Daily Nebula info for nebula runs. Never for autoplay runs.
 */
function settleRun(res) {
  noteFeats(journalRunEnd(save, res)); // Skill Journal totals + result feats (settleRun never sees autoplay runs)
  if (res.mode === 'endless' && res.zen) { settleZen(res); return null; }
  recordRunStats(save, res); // anonymous level stats, only while sharing is on (src/meta/levelStats.js); read-only for the game
  if (res.mode === 'journey' && res.nebula) {
    // Daily Nebula: the first finished attempt of a date is its scored attempt; replays are free.
    // A forfeit before any drop is not an attempt. No interstitial, no ad offers in this mode.
    const counts = !(res.forfeit && !res.dropsUsed);
    // Challenge a friend on a Daily Nebula: never the scored attempt of that date, no coins, no Daily Orbit;
    // the result is kept on the challenge only
    if (res.friend) {
      if (counts) res.friendEntry = recordFriendResult(save, friendCode(res.friend), { stars: res.won ? res.stars : 0, drops: res.dropsUsed });
    }
    const info = res.friend ? { friend: true, scored: false, coins: 0 } : counts
      ? recordNebulaAttempt(save, res.nebula, { won: res.won, stars: res.stars, drops: res.dropsUsed, log: res.dropLog, twist: (res.kit && res.kit.twist) || 'plain' })
      : { scored: false, firstSolve: false, coins: 0, record: (save.nebula && save.nebula.days[res.nebula]) || null, monthKey: res.nebula.slice(0, 7), monthCount: monthSolved(save, res.nebula.slice(0, 7)), badgeEarned: false };
    if (res.dropsUsed > 0 && !res.friend) game.track('nebula', 1); // Daily Orbit "Play the Daily Nebula"
    if (info.firstSolve) weekNebula(save);
    save.runs = (save.runs || 0) + 1;
    return info;
  }
  if (res.mode === 'journey') {
    recordJourneyResult(save, res); // Steady Start fail streak (a win resets it)
    if (res.won) bakeLevelWon(save, res.level); // Tonight's bake: eaten once its level is won
    const st = recordStreakResult(save, res); // Nova Streak (forgiving win streak; a continue never helps it)
    if (st) res.streak = { ...st, line: streakLine(st) };
    if (res.won) save.coins += res.coins;
    if (res.won) weekLevel(save, Math.max(0, (res.stars || 0) - (res.prevStars || 0))); // "Your puzzle week"
    if (res.won && res.firstTime) res.gift = claimLevelGift(save, res.level);
    // Observatory: did this win's new stars finish the chapter's constellation? (celebrated on the menu)
    if (res.won) { const ch = newlyCompleted(save, res.level, res.prevStars); if (ch >= 0) pendingConstellation = ch; }
    save.runs = (save.runs || 0) + 1;
    return null;
  }
  settleEndless(res);
  return null;
}

function settleEndless(res, { skipDaily = false } = {}) {
  // Sector bounties: a flat coin bonus per goal done, added to the run's coins and shown on the card (never the score)
  res.bountyCoins = bountyCoins(res.bountiesDone);
  res.bountyLine = bountyLine(res.bountiesDone, res.bountiesSeen);
  // Café moments: the same kind of flat bonus per Order ticket served (never the score)
  res.momentCoins = momentCoins(res.momentsDone);
  res.momentLine = momentLine(res.momentsDone, res.momentsSeen);
  const coins = runCoins(res.score, res.sector, { perkBonus: res.coinBonus || 0, coinLevel: save.upgrades.coinLevel || 0 }) + res.bountyCoins + res.momentCoins;
  res.coins = coins;
  // before the run is folded into stats/best; a friend's challenge has no best and no sector record of its own
  res.records = res.friend ? runRecords(save, res).filter((x) => x !== 'Furthest sector') : runRecords(save, res);
  if (!res.friend) weekEndless(save, res.score); // "Your puzzle week": best Endless score this week (read only, never altered)
  save.coins += coins;
  save.runs = (save.runs || 0) + 1;
  // Paths + Resonance: any Endless run (any tide, daily too) opens Paths by its furthest sector
  res.pathLine = res.autoplay ? null : pathUnlockLine(recordPathsRun(save, res.sector));
  if (res.friend) {
    // Challenge a friend: the score is kept on the challenge only. Never the Endless best, a tier best, Race your
    // best, the daily score or Lucky Start's recent sectors (DESIGN.md "Challenge a friend")
    if (!(res.forfeit && !res.drops)) res.friendEntry = recordFriendResult(save, friendCode(res.friend), { score: res.score });
  } else if (res.daily) {
    if (!skipDaily) recordDailyChallenge(save, res.score);
  } else {
    recordRaceBest(save, res, challengeBest(save, res.challenge)); // "Race your best" curve (before the best moves)
    recordChallengeBest(save, res.challenge, res.score); // each tide tier keeps its own best (Standard = save.best)
    if (standardTide(res)) save.recentSectors = [...(save.recentSectors || []), res.sector].slice(-5); // Lucky Start: Standard only
  }
  const st = save.stats;
  if (standardTide(res) && !res.friend) st.bestSector = Math.max(st.bestSector, res.sector); // sector stats: Standard tide only
  st.bestCombo = Math.max(st.bestCombo, res.maxCombo);
  st.highestTier = Math.max(st.highestTier, res.maxTier);
  st.supernovas += res.supernovas;
  st.totalScore += res.score;
  if (res.bestChain && res.bestChain.points > (st.bestChain || 0)) {
    st.bestChain = res.bestChain.points;
    st.bestChainCombo = res.bestChain.combo;
  }
  res.nextGoal = res.friend ? null : nextGoal(save, res);
}

/** The code of a challenge kept on a run (re-encoded if an older snapshot lacks it). */
function friendCode(f) {
  return (f && f.code) || encodeFriend(f) || '';
}

/**
 * Book a finished (or quit) Zen Drift run: modest coins (zenCoins: score / 100, capped) and the Zen
 * best. Nothing else: no save.runs (so ad pacing never sees it), no records,
 * stats, Paths, Race your best, recent sectors or level stats.
 */
function settleZen(res) {
  const coins = zenCoins(res.score, { perkBonus: res.coinBonus || 0, coinLevel: save.upgrades.coinLevel || 0 });
  res.coins = coins;
  save.coins += coins;
  res.records = [];
  res.nextGoal = null;
  recordZen(save, res.score); // the Zen best (scores are never altered)
}

/** True (once) when this lost Journey attempt ended through the fail offer's "Try again". */
function takeRetry(res) {
  const want = retryLevelAfterFail;
  retryLevelAfterFail = 0;
  return !!want && !res.won && !res.forfeit && res.level === want;
}

function onRunOver(res) {
  tipUntilMerge = false;
  if (res.mode === 'book') { bookOver(res); return; } // Puzzle Books: never a run (no stats, coins, ads or snapshot)
  if (res.tutorial) {
    res.tutorialSkipped = !!(lesson && lesson.skipped) || !!(game.run && game.run.tutorialSkipped);
    coach.hide(); lessonView = null; hud.setTutorialHud(false);
    lesson = null;
  }
  if (res.tutorial === 'practice') {
    // "How to play": nothing recorded (no stars, coins, runs, journal, streak or snapshot) and no ad hooks at all
    hud.hideHint();
    hud.hideKeeperSay();
    if (res.won) showResultLater(() => UI.showPracticeEnd(app, () => practiceBack()), 100);
    else practiceBack();
    return;
  }
  if (res.tutorial === 'first') { markTutorialDone(save); } // finished or left: never forced again
  hud.hideHint();
  hud.hideKeeperSay();
  // the buddy celebrates a win or a new best; after a loss it is sad for a moment, then encouraging
  if (!res.forfeit) hud.keeperReact(res.won || res.isNewBest ? 'win' : 'lose');
  clearSnapshot(); // the run is over: nothing left to resume
  // one kind, true line about a lost run (read-only board analysis; null for wins and forfeits)
  res.reflection = failReflection(res);
  if (res.autoplay) { onAutoplayRunOver(res); return; }
  undoTransferData = null; // a real run was played on the new progress: the transfer is settled
  // sky calendar: tonight's star lights up once a run was actually played (not autoplay)
  if ((res.dropsUsed ?? res.drops ?? 1) > 0) recordNight(save);
  const info = settleRun(res);
  // wind-down Evening calm: tonight's calm play time and tally; after ~30 minutes, one goodnight line, once per night.
  // Read from the clock and the setting only: never ad state, never the score.
  const night = windDownRound(save, loadNight(), res);
  storeNight(night);
  res.goodnight = goodnightDue(save, night);
  res.journalLine = featsLine();
  // seasonal event: a few tokens from this round's own outcome (stars or merges); never ad state, never the score
  res.seasonLine = seasonOpen(save) ? seasonLine(awardRound(save, res, dayKey())) : null;
  uploadStats();
  if (res.mode === 'journey' && res.nebula && res.friend) {
    // Challenge a friend on a Daily Nebula: the same no-interstitial rule as the Daily Nebula itself
    persist();
    flushSave();
    Svc.onRunEnd({ durationSec: res.durationSec, score: res.score, best: save.best });
    res.adLine = adLineFor(false, false);
    showResultLater(() => showFriendResult(app, res, { onAgain: () => startFriend(res.friend), onHome: () => goMenu() }), res.won ? 100 : 400);
    return;
  }
  if (res.mode === 'journey' && res.nebula) {
    persist();
    flushSave();
    Svc.onRunEnd({ durationSec: res.durationSec, score: res.score, best: save.best });
    res.adLine = adLineFor(false, false); // the Daily Nebula never shows an interstitial
    if (info.coins) UI.refreshCoins(save);
    const key = res.nebula;
    showResultLater(() => UI.showNebulaResult(app, res, info, {
      onReplay: () => startNebula(key),
      onPlayOn: () => startLevel(Math.min(save.journey.level, LEVEL_COUNT)),
      onDone: () => goMenu({ quiet: true }), // "Done for now": a quiet Home visit
    }), res.won ? 100 : 400);
    return;
  }
  if (res.mode === 'journey') {
    endTrial(); // a tried look lasts one level
    persist();
    Svc.onRunEnd({ durationSec: res.durationSec, score: res.score, best: save.best });
    const n = res.level;
    // the lesson left by Pause › Quit: straight Home (no fail card); Level 1 waits there as a normal level
    if (res.tutorial === 'first' && !res.won) { goMenu(); return; }
    // the fail offer's free "Try again": booked as a normal fail above, then straight back in (no card, no ad)
    if (takeRetry(res)) { showResultLater(() => startLevel(n), 300); return; }
    // interstitials only after a completed level, from AD_RULES.JOURNEY_FROM_LEVEL onward; never after a fail, and never
    // right before a Steady Start offer or a level tip card (neither is ever shown beside an ad)
    const adBefore = (target) => res.won && n >= AD_RULES.JOURNEY_FROM_LEVEL && !shouldOfferSteady(save, target) && !tipDue(save, target);
    // honest ad-break line: the same gate as Levels (onMap) below; "Done for now" never shows one
    // ...but only once one can actually come: before the level just ahead of the first ad break the card says nothing
    // about ads at all (docs/UX_FIRST_WEEK.md F3; reads the same gate, never the caps)
    res.adLine = n >= AD_RULES.JOURNEY_FROM_LEVEL - 1 ? adLineFor(res.won && n >= AD_RULES.JOURNEY_FROM_LEVEL, !!res.won) : null;
    showResultLater(() => UI.showLevelResult(app, res, {
      onNext: () => leaveResults(() => startLevel(Math.min(n + 1, LEVEL_COUNT)), adBefore(Math.min(n + 1, LEVEL_COUNT))),
      onRetry: () => leaveResults(() => startLevel(n), adBefore(n)),
      onMap: () => leaveResults(() => { goMenu(); UI.showMap(app); }, res.won && n >= AD_RULES.JOURNEY_FROM_LEVEL),
      // "Done for now" ends the session on the win: straight to the menu, no interstitial
      onDone: (o) => goMenu(o), // { quiet: true }: no Home card on this visit (docs/UX_RETENTION.md item 2)
      // tester tools only: a lost level can be skipped from its card (the loss above stays booked as a normal fail)
      onSkip: TESTER && !res.won && !res.tutorial && !res.friend ? () => testerSkip(n) : null,
    }), res.won ? 100 : 400);
    if (res.won && !res.tutorial) maybeAskReview(res);
    return;
  }

  // ---- Zen Drift: no ads at all (no onRunEnd, no ad-break line, no interstitial on leaving)
  if (res.zen) {
    persist();
    flushSave();
    showResultLater(() => UI.showZenOver(app, res, { onAgain: () => startZen(), onHome: () => goMenu() }), 700);
    return;
  }

  // ---- Challenge a friend (Endless): ads exactly as after any Endless run (same leaveResults interstitial caps)
  if (res.friend) {
    persist();
    flushSave();
    Svc.onRunEnd({ durationSec: res.durationSec, score: res.score, best: challengeBest(save, res.challenge) });
    res.adLine = adLineFor(true, false);
    showResultLater(() => showFriendResult(app, res, {
      onAgain: () => leaveResults(() => startFriend(res.friend), true),
      onHome: () => leaveResults(() => goMenu(), true),
    }), 700);
    return;
  }

  // ---- endless
  persist();
  flushSave();
  Svc.onRunEnd({ durationSec: res.durationSec, score: res.score, best: res.daily ? save.best : Math.max(challengeBest(save, res.challenge), res.score) });
  res.adLine = adLineFor(true, false); // both buttons leave through leaveResults(..., true)
  showResultLater(() => UI.showGameOver(app, res, {
    onAgain: () => leaveResults(() => startEndless(res.daily, res.challenge, res.path || null), true),
    onHome: () => leaveResults(() => goMenu(), true),
  }), 700);
}

/**
 * An autoplay run ended: show the normal results screen, but save nothing (no coins, best,
 * stats, runs, daily, Daily Orbits, stars or unlocks) and never show an interstitial.
 */
function onAutoplayRunOver(res) {
  res.coins = 0;
  journalDiscard(save); // nothing an autoplay game did is kept
  runFeats = [];
  persist();
  if (res.friend) {
    // an autoplay try at a friend's challenge: shown, never kept, no Send back (src/ui/challengeView.js)
    showResultLater(() => showFriendResult(app, res, { onAgain: () => startFriend(res.friend), onHome: () => goMenu() }), res.mode === 'journey' ? 400 : 700);
    return;
  }
  if (res.mode === 'journey' && res.nebula) {
    const key = res.nebula;
    showResultLater(() => UI.showNebulaResult(app, res, { scored: false, coins: 0, record: null, monthKey: key.slice(0, 7), monthCount: 0, badgeEarned: false }, {
      onReplay: () => startNebula(key),
      onPlayOn: () => startLevel(Math.min(save.journey.level, LEVEL_COUNT)),
      onDone: () => goMenu({ quiet: true }),
    }), res.won ? 100 : 400);
    return;
  }
  if (res.mode === 'journey') {
    endTrial();
    res.gift = null;
    const n = res.level;
    if (takeRetry(res)) { showResultLater(() => startLevel(n), 300); return; }
    showResultLater(() => UI.showLevelResult(app, res, {
      onNext: () => startLevel(Math.min(n + 1, LEVEL_COUNT)),
      onRetry: () => startLevel(n),
      onMap: () => { goMenu(); UI.showMap(app); },
      onDone: (o) => goMenu(o),
    }), res.won ? 100 : 400);
    return;
  }
  res.isNewBest = false;
  res.records = [];
  res.nextGoal = null;
  if (res.zen) { showResultLater(() => UI.showZenOver(app, res, { onAgain: () => startZen(), onHome: () => goMenu() }), 700); return; }
  showResultLater(() => UI.showGameOver(app, res, {
    onAgain: () => startEndless(res.daily, res.challenge, res.path || null),
    onHome: () => goMenu(),
  }), 700);
}

// ------------------------------------------------------------------ input
function pt(e) { return { x: e.clientX, y: e.clientY }; }
let pointerIsDown = false;
canvas.addEventListener('pointerdown', (e) => {
  if (screen !== 'game') return;
  e.preventDefault();
  pointerIsDown = true;
  try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
  const p = pt(e);
  hud.keeperPoke(); // wakes a dozing buddy
  game.pointerDown(p.x, p.y);
}, { passive: false });
canvas.addEventListener('pointermove', (e) => {
  if (screen !== 'game') return;
  const p = pt(e);
  game.pointerMove(p.x, p.y, pointerIsDown && e.pointerType !== 'mouse' ? true : pointerIsDown);
});
const up = (e) => {
  if (!pointerIsDown) return;
  pointerIsDown = false;
  if (screen !== 'game') return;
  const p = pt(e);
  game.pointerUp(p.x, p.y);
};
canvas.addEventListener('pointerup', up);
canvas.addEventListener('pointercancel', () => { pointerIsDown = false; game.pointer = null; });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
// block iOS double-tap zoom / gesture zoom
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });

window.addEventListener('keydown', (e) => {
  if (screen !== 'game') return;
  if (e.key === 'p' || (e.key === 'Escape' && !game.targetMode)) { pauseGame(); return; }
  if (document.querySelector('#screens .screen')) return;
  hud.keeperPoke();
  if (game.key(e.key.length === 1 ? e.key.toLowerCase() : e.key)) e.preventDefault();
});

window.addEventListener('resize', () => relayout());
window.addEventListener('orientationchange', () => setTimeout(relayout, 250));
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    flushSave();
    pauseGame();
  } else if (syncKeepsakes(save).length) persist(); // back after midnight: a queued Club month may have started
});
window.addEventListener('pagehide', () => flushSave());

// ------------------------------------------------------------------ main loop
let last = performance.now();
// perf: skip the canvas under an opaque screen (Home, Shop pages) and redraw it at ~20 fps under a blurred modal
const canvasCover = watchCanvasCover(document.getElementById('screens'));
let drawDt = 0;
function frame(t) {
  const dt = Math.min(0.05, Math.max(0, (t - last) / 1000));
  last = t;
  try {
    game.update(dt * autoAnimScale());
    if (screen === 'game') autoplay.update(dt);
    const cover = canvasCover.state(t);
    drawDt += dt;
    if (cover === 'open' || (cover === 'modal' && drawDt >= 0.045)) {
      renderer.draw(Math.min(0.1, drawDt), game.view());
      drawDt = 0;
    } else if (cover === 'covered') drawDt = 0;
  } catch (e) {
    console.error('[nova] frame error', e);
  }
  requestAnimationFrame(frame);
}

// ------------------------------------------------------------------ apple touch icon (PNG, procedural)
function makeTouchIcon() {
  try {
    const c = document.createElement('canvas');
    c.width = c.height = 180;
    const g = c.getContext('2d');
    const bg = g.createRadialGradient(90, 60, 10, 90, 90, 130);
    bg.addColorStop(0, '#2a1670'); bg.addColorStop(1, '#0b0624');
    g.fillStyle = bg; g.fillRect(0, 0, 180, 180);
    drawOrb(g, 90, 82, 44, 8, 'classic', 1);
    drawOrb(g, 48, 140, 20, 6, 'classic', 1);
    drawOrb(g, 132, 144, 16, 5, 'classic', 1);
    const url = c.toDataURL('image/png');
    let link = document.querySelector('link[rel="apple-touch-icon"]');
    if (!link) { link = document.createElement('link'); link.rel = 'apple-touch-icon'; document.head.appendChild(link); }
    link.href = url;
  } catch (_) { /* ignore */ }
}

// ------------------------------------------------------------------ boot
function boot() {
  savedRunInfo(); // drops a stale saved run (e.g. yesterday's Daily Challenge)
  welcomePending = welcomeBackDue(save); // decided before today is remembered as the last launch
  markSeen(save);
  persist();
  relayout();
  applyBackdrop({ mode: 'menu' }, { instant: true });
  // a brand-new player goes straight into the guided Level 1 (docs/UX_FIRST_RUN.md); everyone else lands on Home
  if (tutorialDue(save) && !save.settings.autoplay) { welcomePending = false; startLevel(1, { tutorial: 'first' }); } else goMenu();
  requestAnimationFrame(frame);
  makeTouchIcon();
  loadServices().then(() => { if (screen === 'menu' && !quietOfferOpen() && !eveningPending && !welcomeWaiting) Svc.showMenuBanner(); });
  // when the web font arrives, re-render cached orb sprites (numbers) and relayout
  try { document.fonts && document.fonts.ready.then(() => { clearArtCache(); relayout(); }); } catch (_) { /* ignore */ }
}

boot();
// debugging handle (read-only use in dev tools)
window.__nova = { game, app, renderer, autoplay };
