// Persistent save in localStorage under `novadrop.save.v1`. try/catch everywhere.
import { seedDiscoveries } from './firstSession.js';
import { seedNights } from './skyCalendar.js';
import { defaultPlayDays, sanitizePlayDays } from './playDays.js';
import { defaultPass, sanitizePass } from './pass.js';
import { validRunSnap } from './runSnap.js';
import { defaultKeepers, sanitizeKeepers } from './keepers.js';
import { defaultOutfits, sanitizeOutfits } from './outfits.js';
import { sanitizeChallenge } from './challenge.js';
import { sanitizePaths } from './paths.js';
import { sanitizeZen } from './zen.js';
import { sanitizeSteady } from './steadyStart.js';
import { defaultJournal, sanitizeJournal } from './journal.js';
import { sanitizeEvening } from './evening.js';
import { sanitizeEveningCalm } from './windDown.js';
import { sanitizeSoundBackdrop, NEW_PLAYER_SOUND_BACKDROP } from './soundBackdrop.js';
import { sanitizeTips } from './levelTips.js';
import { sanitizeRace } from './raceBest.js';
import { sanitizeWinStreak } from './winStreak.js';
import { sanitizeScenes, sanitizeBackdropsOwned } from './scenes.js';
import { defaultLevelStats, sanitizeLevelStats } from './levelStats.js';
import { dailyStage, DAILY_MECHS } from '../game/levels.js';
import { defaultWelcome, sanitizeWelcome } from './welcomeBack.js';
import { defaultReview, sanitizeReview } from './reviewAsk.js';
import { defaultWeekly, sanitizeWeekly } from './weekly.js';
import { defaultSeasonal, sanitizeSeasonal, cleanKeepsakes } from './seasonal.js';
import { defaultBoardSkins, defaultComboSkins, sanitizeLooks } from './looks.js';
import { defaultShopTour, sanitizeShopTour } from './shopTour.js';
import { sanitizeNavSeen } from './homeNav.js';
import { sanitizeMenuCardDay } from './menuCards.js';
import { defaultFriends, sanitizeFriends } from './friendChallenge.js';
import { defaultCafe } from './cafeData.js';
import { migrateV3 } from './migrateV3.js';
import { sanitizeCafe } from './cafe.js';
import { sanitizeCafeTour } from './cafeTour.js';
import { defaultVisitors, sanitizeVisitors } from './visitors.js';
import { defaultBooks, sanitizeBooks } from './books.js';
import { defaultBake, sanitizeBake } from './bakes.js';
import { sanitizePackBuys } from './packs.js';

// NOTE: AdDirector owns `save.ads` and `save.removeAds` — we never overwrite them.

export const SAVE_KEY = 'novadrop.save.v1';

export function defaultSave() {
  return {
    v: 1,
    coins: 0,
    best: 0,                 // Endless best on the Standard tide (the classic best)
    challengeBest: { gentle: 0, bold: 0 }, // Endless bests on the Gentle / Bold tide (src/meta/challenge.js)
    zen: { best: 0, runs: 0 }, // Zen Drift (src/meta/zen.js): its own best + runs played (never counted in `runs`)
    runs: 0,                 // completed runs (lifetime)
    recentSectors: [],       // sector reached in the last few runs (for Lucky Start)
    luckyPending: false,
    settings: { sound: true, haptics: true, numbers: true, calm: false, autoplay: false, music: true, musicTracks: {}, soundBackdrop: NEW_PLAYER_SOUND_BACKDROP, backdrop: 'harbour', textSize: 1, shapes: false, leftHand: false, animSpeed: 1, challenge: 'standard', steadyStart: true, eveningLook: 'auto', eveningCalm: 'off', eveningWaves: false, levelTips: true, raceBest: true, nextHint: false, reminder: { on: false, anchor: 'coffee', hour: 8, minute: 0 } }, // nextHint: Comfort "Next piece hint" (src/game/nextHint.js, presentation only, default off). reminder: Habit anchor daily reminder (Unity only, local notification; the web keeps the field so the save shape stays shared). levelTips / raceBest: v0.5.4 Comfort toggles (src/meta/levelTips.js, raceBest.js). eveningLook 'auto' | 'off': automatic evening look (src/meta/evening.js, Comfort). eveningCalm 'off' | 'night' | 'always' + eveningWaves: wind-down evening (src/meta/windDown.js, Comfort). challenge: last Endless tide tier picked. steadyStart: offer Steady Start after 3 fails (Comfort). animSpeed 1|2: Comfort "Animation speed" (presentation only). textSize 1|1.25|1.5, shapes: tier symbols on orbs, leftHand: mirrored bottom HUD (Comfort sheet). musicTracks: { trackId: false } turns a song off; missing = on. backdrop: 'auto' (follow progress) or a theme id; brand-new saves start on 'harbour' (v3)
    journey: { level: 1, stars: {}, fails: {} }, // fails: { levelN: fails in a row } for Steady Start (reset on a win)
    winStreak: { charges: 0, shield: true }, // Nova Streak (src/meta/winStreak.js): Journey win charges 0..3 + the one-loss shield
    boosters: { comet: 0, wild: 0, shuffle: 0 },
    boosterIntro: {},
    purchases: { starterPack: false, firstPackBonus: false, seasons: [] }, // firstPackBonus: true once the first coin pack's double coins were used; seasons: Starlight Season premium tracks bought (v3: restore info, src/meta/migrateV3.js)
    pass: defaultPass(),     // Nova Pass (src/meta/pass.js): { start, claimed, banked, bought }
    upgrades: { startHold: false, startPerk: false, coinLevel: 0, extraComet: false },
    skins: { owned: ['cafeclassics', 'basic', 'classic'], equipped: 'cafeclassics' }, // Café Classics (numbered café treats) is the default look; Simple Circles is the free plain option; classic is the Cosmic pack's orbs; seaside is sold in the shop
    boardSkins: defaultBoardSkins(), // board skins (src/meta/looks.js): look of the play grid
    comboSkins: defaultComboSkins(), // combo skins: merge burst, chain banner and tally look
    daily: { lastClaim: null, streak: 0, graceUsed: null }, // graceUsed: day key of the last free grace day
    dailyChallenge: { date: null, best: 0, plays: 0 },
    nights: [],              // sky calendar: local dates ('YYYY-MM-DD') a run was played (recent ~70 days)
    playDays: defaultPlayDays(), // lifetime distinct play days (src/meta/playDays.js): { n, last: 'YYYY-MM-DD' | null }; only ever makes ad breaks rarer
    nebula: { days: {}, badges: [] }, // Daily Nebula: per-date scored attempt + solved flag, monthly badges ('YYYY-MM')
    orbits: { date: null, list: [], bonusClaimed: false }, // Daily Orbits (src/meta/orbits.js)
    snapSeq: 0,              // bumps on every run-snapshot write/clear (stale second tab detection)
    // runSnap (optional): in-progress run snapshot for resume-after-reload (Game.snapshotRun, src/meta/runSnap.js)
    stats: { bestSector: 1, bestCombo: 0, highestTier: 0, supernovas: 0, totalScore: 0, bestChain: 0, bestChainCombo: 0 },
    discovered: [],          // orb tiers made at least once (first-time "New discovery" cards)
    backdropsSeen: ['violet'], // nebula themes shown in play at least once (first-time "New nebula" toast)
    // ---- Star Keepers (v0.5.0)
    keepers: defaultKeepers(), // { owned: ['pip', ...], equipped, story: [chapter, ...] } (src/meta/keepers.js)
    backdropsOwned: [],      // owned nebulas: Cosmic pack (former capsule / Comet Week) and former season nebulas
    outfits: defaultOutfits(), // Keeper outfits (former season premium track): { owned: [id...], equipped: id|null }
    // ---- v0.5.3: Skill Journal (src/meta/journal.js) and Evening wind-down (src/meta/evening.js)
    journal: defaultJournal(), // { since, games, drops, merged, steps, longest, top, recent: [[d, m, s]...], cur, feats: {id: date} }
    // ---- v0.5.4: hard-level tip card (src/meta/levelTips.js) and Race your best (src/meta/raceBest.js)
    tips: { shown: {} },     // { levelN: fail streak when the tip card was last shown }
    raceBest: {},            // { gentle|standard|bold: { score, drops, step, pts } } curve of that tier's best run
    // ---- v0.5.8: Sky scenes (src/meta/scenes.js): premium animated backgrounds bought with coins
    scenesOwned: [],         // scene ids from SCENE_BACKDROPS (settings.backdrop may name one once owned)
    // ---- v0.6.2: anonymous level stats for the soft launch (src/meta/levelStats.js; Unity Scripts/Meta/LevelStats.cs)
    levelStats: defaultLevelStats(), // { share: null|bool, id: '' | 32 hex (changes monthly), month: '' | 'YYYY-MM' (UTC), queue: [event + id stamp...] (max 200), dropped }
    // ---- Welcome-back card (src/meta/welcomeBack.js; Unity Scripts/Meta/WelcomeBack.cs)
    welcomeBack: defaultWelcome(), // { lastSeen: 'YYYY-MM-DD' | null (last launch), shown: 'YYYY-MM-DD' | null (card last shown) }
    // ---- Shop unlock tour (src/meta/shopTour.js; Unity Scripts/Meta to mirror)
    shopTour: defaultShopTour(), // { banner, opened, done: bool, gift: '' | 'board:id' | 'combo:id' | 'skin:id' | 'none' }
    menuCardDay: null,       // local day a Home feature card last showed (src/meta/menuCards.js; Unity Scripts/Meta/MenuCards.cs): one a day
    navSeen: [],             // Home unlock moments already shown (src/meta/homeNav.js NAV_KEYS); Unity Scripts/Meta to mirror
    // ---- First-time mechanic lines (src/meta/mechanicIntro.js; Unity SaveData.mechSeen): presentation flags only
    mechSeen: {},            // { orders, glaze, teapot, secondCup, closing, tin, replayStar: true } once shown; see sanitizeMechSeen
    // ---- Honest review prompt (src/meta/reviewAsk.js): OS prompt asks so far (max 3) and the last ask date
    review: defaultReview(), // { n: 0..3, last: 'YYYY-MM-DD' | null }
    // ---- "Your puzzle week" recap (src/meta/weekly.js): this week and last week only, local Monday-based weeks
    weekly: defaultWeekly(), // { cur: Week | null, last: Week | null, seen: 'YYYY-MM-DD' | null }; Week = { wk, m, top, lv, st, days (bitmask), end, neb }
    // ---- Challenge a friend (src/meta/friendChallenge.js): the player's own typed name ('' = none; never auto-filled)
    // and the last 5 challenge codes: [{ code: 'NC1-…', mine: sent by this player, best: own best on it | null, at: ms }]
    friends: defaultFriends(),
    // ---- Seasonal events (src/meta/seasonal.js; Unity Core/Meta/Seasonal.cs): this season's path + decorations kept forever
    seasonal: defaultSeasonal(), // { id, n, bag: { level, daily, free }, got, seen, met, decor: [id...], decorOff }
    // ---- v3 "Nova's Seaside Café" (src/meta/cafeData.js, src/meta/migrateV3.js)
    cafe: defaultCafe(),     // { v: 1, done: {}, celebrated: [], cam: 'terrace', intro: false }
    books: defaultBooks(), // Puzzle Books (src/meta/books.js): { opened, owned, solved:{id:[n]}, cur:{id:{n,cols,tries}}, plate, noted }
    visitors: defaultVisitors(), // café visitors (src/meta/visitors.js): { by: { id: { heard, at, talks } }, cards: [id...] }
    bake: defaultBake(), // Tonight's bake (src/meta/bakes.js): { oven, offerDay, book:{id:n}, revealed, pending, introDay, offers, picks }
    mig: [],                 // one-time migrations already run ('v3')
    v3card: null,            // { lines: [...], seen, tryLook }: the one-time "thank you" card for existing players
    tutorialDone: false,
  };
}

// Habit anchor reminder ids (same list as Unity Scripts/Meta/Reminder.cs Anchors).
export const REMINDER_ANCHORS = ['coffee', 'lunch', 'commute', 'dinner', 'bed'];

/** settings.reminder { on, anchor, hour, minute }: on only when exactly true, known anchor, whole hour 0..23 / minute 0..59. */
export function sanitizeReminder(settings) {
  const r = settings.reminder && typeof settings.reminder === 'object' && !Array.isArray(settings.reminder) ? settings.reminder : {};
  const int = (v, max, d) => (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= max ? v : d);
  settings.reminder = {
    on: r.on === true,
    anchor: REMINDER_ANCHORS.includes(r.anchor) ? r.anchor : 'coffee',
    hour: int(r.hour, 23, 8),
    minute: int(r.minute, 59, 0),
  };
}

function merge(base, data) {
  if (!data || typeof data !== 'object') return base;
  const out = Array.isArray(base) ? base : { ...base };
  for (const k of Object.keys(data)) {
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue; // pasted transfer codes are untrusted
    const bv = base[k], dv = data[k];
    if (bv && typeof bv === 'object' && !Array.isArray(bv) && dv && typeof dv === 'object' && !Array.isArray(dv)) {
      out[k] = merge(bv, dv);
    } else if (dv !== undefined) {
      out[k] = dv;
    }
  }
  return out;
}

/**
 * True for a stored save from before Simple Circles ('basic') became the default look: any non-empty save whose
 * owned orb skins do not list 'basic'. Those players had the Seaside Café orbs for free, so they keep them.
 */
export function predatesBasic(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).length === 0) return false;
  const sk = data.skins;
  return !(sk && typeof sk === 'object' && Array.isArray(sk.owned) && sk.owned.includes('basic'));
}

/**
 * True for a stored save from before Café Classics ('cafeclassics') became the default look: any non-empty save whose
 * owned orb skins do not list it. Such a save wearing Simple Circles ('basic') was on it as the old default: a save
 * keeps no record of whether a skin was picked or just given, so all of them move to Café Classics once. Owning
 * 'cafeclassics' afterwards marks the save as moved, so a later choice of Simple Circles sticks.
 */
export function predatesCafeClassics(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).length === 0) return false;
  const sk = data.skins;
  return !(sk && typeof sk === 'object' && Array.isArray(sk.owned) && sk.owned.includes('cafeclassics'));
}

export function loadSave() {
  let data = null;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) data = JSON.parse(raw);
  } catch (_) { data = null; }
  return normalizeSave(data);
}

/**
 * Parsed save data (or null) -> a full, sanitised save (`now`: the clock the one-time v3 migration reads): defaults merged in, old saves migrated, bad values repaired.
 * loadSave uses it for localStorage; Transfer progress (src/meta/transfer.js) runs pasted codes through it too.
 */
export function normalizeSave(data, now = new Date()) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) data = null;
  const s = merge(defaultSave(), data);
  // sanitise
  if (!Array.isArray(s.skins.owned)) s.skins.owned = [];
  // Seaside Café was free (and the default) until Simple Circles took over: every save from before then keeps it.
  if (predatesBasic(data) && !s.skins.owned.includes('seaside')) s.skins.owned.unshift('seaside');
  // Café Classics replaced Simple Circles as the default look: a save from before then that wears Simple Circles
  // (or nothing valid) moves to it once; any other skin the player wears stays on.
  const movedToCafe = predatesCafeClassics(data) && s.skins.equipped === 'basic';
  for (const id of ['classic', 'basic', 'cafeclassics']) if (!s.skins.owned.includes(id)) s.skins.owned.unshift(id); // free looks everyone owns
  if (movedToCafe || !s.skins.owned.includes(s.skins.equipped)) s.skins.equipped = 'cafeclassics';
  if (!s.purchases || typeof s.purchases !== 'object' || Array.isArray(s.purchases)) s.purchases = { starterPack: false, firstPackBonus: false, seasons: [] };
  s.purchases.seasons = Array.isArray(s.purchases.seasons) ? [...new Set(s.purchases.seasons.filter((x) => Number.isInteger(x) && x >= 1))].sort((a, b) => a - b) : [];
  // noAdsBundle: true once the No Ads Bundle's coins and boosters were given (once per save). Kept only when true.
  if (s.purchases.noAdsBundle !== true) delete s.purchases.noAdsBundle;
  // keepsakes: Season Keepsakes sets bought (src/meta/seasonal.js KEEPSAKES), known ids in table order. Kept only when not empty.
  if (Array.isArray(s.purchases.keepsakes) && cleanKeepsakes(s.purchases.keepsakes).length) s.purchases.keepsakes = cleanKeepsakes(s.purchases.keepsakes);
  else delete s.purchases.keepsakes;
  // tipJar: true once the first thank-you tip put the tip jar on the café counter (src/meta/tips.js). Kept only when true.
  if (s.purchases.tipJar !== true) delete s.purchases.tipJar;
  sanitizePackBuys(s.purchases); // paid pack products ("Pay the difference" credit); kept only when not empty
  if (!Array.isArray(s.recentSectors)) s.recentSectors = [];
  s.coins = Math.max(0, Math.floor(Number(s.coins) || 0));
  s.best = Math.max(0, Math.floor(Number(s.best) || 0));
  seedDiscoveries(s, data);
  if (!Array.isArray(s.discovered)) s.discovered = [];
  if (typeof s.settings.backdrop !== 'string' || !s.settings.backdrop) s.settings.backdrop = 'auto';
  if (!Array.isArray(s.backdropsSeen)) s.backdropsSeen = ['violet'];
  if (![1, 1.25, 1.5].includes(s.settings.textSize)) s.settings.textSize = 1;
  if (s.settings.animSpeed !== 2) s.settings.animSpeed = 1;
  s.settings.nextHint = s.settings.nextHint === true; // Comfort "Next piece hint": only true is on
  sanitizeReminder(s.settings);
  if (!s.orbits || typeof s.orbits !== 'object' || !Array.isArray(s.orbits.list)) s.orbits = { date: null, list: [], bonusClaimed: false };
  if ('runSnap' in s && !validRunSnap(s.runSnap)) delete s.runSnap; // malformed / old format: never half-restored
  s.snapSeq = Number.isInteger(s.snapSeq) && s.snapSeq >= 0 ? s.snapSeq : 0;
  if (!s.nebula || typeof s.nebula !== 'object') s.nebula = { days: {}, badges: [] };
  if (!s.nebula.days || typeof s.nebula.days !== 'object' || Array.isArray(s.nebula.days)) s.nebula.days = {};
  if (!Array.isArray(s.nebula.badges)) s.nebula.badges = [];
  seedNights(s, data);
  sanitizePlayDays(s); // after the nights: an older save (no playDays) is seeded from its sky calendar
  sanitizeWelcome(s, data); // after the nights: an older save seeds lastSeen from its newest played night
  sanitizePass(s);
  sanitizeKeepers(s, data);
  sanitizeBackdropsOwned(s); // owned nebulas: known (or legacy) ids only, no duplicates
  sanitizeOutfits(s);
  sanitizeChallenge(s);
  sanitizeSteady(s);
  sanitizeJournal(s);  // after discovered / stats / journey / nebula: old saves get feats they already proved
  sanitizeEvening(s);
  sanitizeEveningCalm(s);
  sanitizeSoundBackdrop(s); // bad values: 'music'. New saves start on 'music' (the café songs); migrateV3 keeps an existing player's choice ('music' if unset)
  sanitizeTips(s);
  sanitizeRace(s);
  sanitizeWinStreak(s);
  sanitizeScenes(s);
  sanitizeLevelStats(s);
  sanitizePaths(s); // Paths + Resonance: unlock progress (after stats) and the last Path
  sanitizeZen(s);   // Zen Drift: older saves get { best: 0, runs: 0 }
  sanitizeReview(s); // review prompt caps: missing or malformed -> { n: 0, last: null }
  sanitizeWeekly(s); // weekly recap: missing or malformed weeks start empty
  sanitizeSeasonal(s); // seasonal events: unknown seasons and decorations dropped, counts made whole
  sanitizeFriends(s); // Challenge a friend: older saves get { name: '', list: [] }; bad codes dropped
  sanitizeLooks(s); // board + combo skins: defaults, pack looks for pack-skin owners, equipped falls back
  sanitizeShopTour(s); // Shop unlock tour: older saves start unseen (dot, tour and gift still to come)
  sanitizeMechSeen(s, data); // first-time mechanic lines: known keys, true only; an older save seeds the rules it has met
  sanitizeTutorial(s); // first-run lesson (docs/UX_FIRST_RUN.md): true only; anyone who has played is marked done
  sanitizeMenuCardDay(s); // one feature card a day: a valid day key or null (older saves: null)
  sanitizeNavSeen(s, data); // Home unlock moments: older saves are seeded with what they already had (no pile of cards)
  const rawCafe = s.cafe && typeof s.cafe === 'object' && !Array.isArray(s.cafe) ? s.cafe : null;
  sanitizeCafe(s); // v3 café restoration: repair a missing or broken save.cafe (src/meta/cafe.js)
  sanitizeCafeTour(s, rawCafe); // café tutorial flags tut/met/tips (src/meta/cafeTour.js); older saves mid-café skip the tour
  sanitizeVisitors(s); // café visitors: known ids, whole numbers, postcards only for finished stories
  sanitizeBooks(s); // Puzzle Books: known books, puzzle numbers in range, a bookplate only for a finished book
  sanitizeBake(s); // Tonight's bake: known bake ids, evening-key days, whole counts
  migrateV3(s, data, now); // v3, one time: cut systems converted fairly (Stardust, Season, Comet Week, Atlas, ...), then removed
  return s;
}

/**
 * save.tutorialDone: the guided first Level 1 (docs/UX_FIRST_RUN.md) has been finished or skipped. Only `true` counts.
 * A save that has already played (a finished run or a Journey level past 1) is marked done, so nobody who already
 * knows the game is ever put through the lesson. Unity: SaveData.Sanitize / FromJson.
 */
export function sanitizeTutorial(s) {
  const level = s.journey && Number(s.journey.level);
  s.tutorialDone = s.tutorialDone === true || (Number(s.runs) || 0) > 0 || (Number.isFinite(level) && level > 1);
}

/** save.mechSeen keys (one-time "New in the café" card per mechanic, the first Second cup note, the first Closing time line). */
export const MECH_SEEN_KEYS = Object.freeze(['orders', 'glaze', 'teapot', 'secondCup', 'closing', 'tin', 'replayStar']);

/**
 * save.mechSeen: an object of known keys set to true, in MECH_SEEN_KEYS order; anything else is dropped. Unity: SaveData.SanitizeMechSeen.
 * `data` (the raw parsed save, optional): when it is a save object with no mechSeen key (a save from before the field),
 * every café rule the player has already met in the Journey (dailyStage: a level cleared at or past the rule's first
 * level, the same test the Daily twist uses) is marked seen, so a long-time player never gets a "New in the café" card
 * for a rule they know. Second cup / Closing time are not seeded. A save that has the key, even empty or broken, is
 * left as it is. Presentation flags only. Unity: SaveData.SeedMechSeen.
 */
export function sanitizeMechSeen(s, data) {
  const raw = s.mechSeen && typeof s.mechSeen === 'object' && !Array.isArray(s.mechSeen) ? s.mechSeen : {};
  const seed = !!data && typeof data === 'object' && !Array.isArray(data) && !('mechSeen' in data);
  const met = seed ? DAILY_MECHS.slice(0, dailyStage(s.journey && s.journey.stars)) : [];
  const out = {};
  for (const k of MECH_SEEN_KEYS) if (raw[k] === true || met.includes(k)) out[k] = true;
  s.mechSeen = out;
  return out;
}

let timer = 0;
let current = null;

export function persistNow(save) {
  const s = save || current;
  if (!s) return false;
  current = s;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
    return true;
  } catch (_) { return false; }
}

/** Debounced persist (coalesces bursts of writes). */
export function persist(save) {
  current = save || current;
  if (timer) return;
  try {
    timer = setTimeout(() => { timer = 0; persistNow(current); }, 120);
  } catch (_) { persistNow(current); }
}

export function flush() {
  if (timer) { clearTimeout(timer); timer = 0; }
  persistNow(current);
}
