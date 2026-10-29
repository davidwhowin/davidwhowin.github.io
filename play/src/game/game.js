// Game controller: run state, input, animation sequencing, perks, tide, revive, game over.
import { GullSwoop, GULL_DIVE, GULL_PUFF } from './gullFx.js';
import {
  createBoard, dropOrb, removeAt, pushRow, resolve, clearTopRows, spawnOrb, landingRow, sweepTier,
  maxSpawnTier, tideInterval, sectorThreshold, isBoardFull, getCell, SUPERNOVA_TIER,
  shuffleColumn, previewDrop, cloneBoard,
} from './board.js';
import {
  getLevel, buildBoard, levelRngs, newProgress, applyProgress, goalsMet, starsFor, levelReward,
  remainingText, BOOSTER_UNLOCKS, getDailyLevel, undoAllowed, takeUndo, restoreUndo, STREAK_MAX, orderOpts,
  secondCupOn, secondCupGain,
} from './levels.js';
import { mulberry32, deriveSeed, randomSeed } from './rng.js';
import { offerPerks, buildRunMods, PERK_BY_ID, eclipseGain, normPath, PATH_BY_ID, resonanceActive, resonancePulse, ovenGain, TIDY_TIER, perkName } from './perks.js';
import { Tweener, Ease } from './tween.js';
import { nextFitCells } from './nextHint.js';
import { testOptions, testPerkSet, FAST_SECTOR_DIV } from './autoplay.js';
import { tierColor, orbRadiusFactor, skinFx } from './orbArt.js';
import { mergeJuice, winJuice } from './juice.js';
import { emitMerge, chainBannerStyle, DEFAULT_FX_SKIN } from './fxSkins.js';
import { DEFAULT_BOARD_SKIN } from './boardArt.js';
import { Svc } from '../meta/services.js';
import { trackOrbit } from '../meta/orbits.js';
import { validRunSnap, SNAP_VERSION } from '../meta/runSnap.js';
import { challengeBest, normChallenge } from '../meta/challenge.js';
import { zenBest } from '../meta/zen.js';
import { streakTag } from '../meta/winStreak.js';
import { newCurve, curveTick, ghostAt, raceFor } from '../meta/raceBest.js';
import { AD_REWARDS } from '../ads/adRules.js';
import { bountyFor, trackBounty, openSectorBounty, sanitizeRunBounty, bountyText, BOUNTY_COINS } from './bounties.js';
import { tierName } from './tierNames.js';
import { newMoments, momentOpts, serveMoment, tickMoment, sanitizeRunMoments, momentResult, momentDropsLeft, momentWindow, MOMENT_COINS } from './moments.js';
import { closingBonus, closingPace, CLOSING_POINTS } from './closing.js';
import { teapotRefusal, CLOSING_SUB, tinTreatText } from '../meta/mechanicIntro.js';
import { t as tr, tp as trp } from '../i18n/index.js'; // board text keys (closing.subFirst) and the banners (banner.*); toasts stay English
import { hudTextFactor } from './effects.js';
import { pageLook, finishWord } from '../ui/copy.js';
import { normKit, normFriend, whose, whoName, whoGender } from '../meta/friendChallenge.js';
import { puzzleReplay } from './puzzles.js';

/** "LEVEL COMPLETE!" stays this long; Closing time starts after it (docs/UX_MECHANICS.md P5). */
const WIN_BANNER_DUR = 1.8;
const TUTORIAL_TOP_UP = 5; // the first-run lesson's quiet safety net (docs/UX_FIRST_RUN.md)
const RNG_KEYS = ['rng', 'tideRng', 'perkRng', 'shuffleRng'];
const localDayKey = (now = new Date()) => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

/** Chain banner name for combo ×2..×6+ (NICE, STELLAR, COSMIC, GALACTIC, LEGENDARY); literal keys so the key check sees them. */
const comboName = (c) => (c <= 2 ? tr('banner.combo.2') : c === 3 ? tr('banner.combo.3') : c === 4 ? tr('banner.combo.4') : c === 5 ? tr('banner.combo.5') : tr('banner.combo.6'));

export class Game {
  /**
   * @param {object} o
   *  renderer, fx, hud, ui (showPerkPick, showRevive, toast), save, onRunOver(result), onOrbitComplete(o), persist(),
   *  onSnapshot(snap) (resume-after-reload: called with a serialisable run snapshot)
   */
  constructor(o) {
    Object.assign(this, o);
    this.tw = new Tweener();
    this.visuals = new Map();
    this.mode = 'menu';           // 'menu' | 'game'
    this.state = 'idle';          // 'idle' | 'playing' | 'paused' | 'over'
    this.busy = false;
    this.run = null;
    this.token = 0;
    this.aim = { x: 2, col: 2, visible: false, landRow: -1, dy: 0, s: 1, hidden: false };
    this.cometMode = false;
    this.queuedCol = null;
    this.pointer = null;
    this.pauseLayers = 0;
    // Chain tally (presentation only): running total of the points a cascade has ALREADY
    // awarded via addScore. It never changes what is scored.
    this.tally = null;
    // Autoplay (test mode): set by the Autoplay controller. Runs it plays are flagged
    // run.autoplay and never count toward best, stats, orbits, daily or coins.
    this.autoplayEnabled = false;
    this.orbitSnap = null;
    // Comfort "Animation speed" (1 or 2): scales tween/sequence time only, never rules,
    // particles or flashes (so Calm stays calm at 2x)
    this.animSpeed = 1;
    this.closing = null; // closing-time celebration in progress ({ skip }): a tap skips it
  }

  // skinTrial / boardTrial / fxTrial: Shop "Try for a level" (src/meta/shopMenu.js), display only, never saved
  get skin() { return this.skinTrial || (this.save.skins && this.save.skins.equipped) || 'classic'; }
  get boardSkin() { return this.boardTrial || (this.save.boardSkins && this.save.boardSkins.equipped) || DEFAULT_BOARD_SKIN; }
  get fxSkin() { return this.fxTrial || (this.save.comboSkins && this.save.comboSkins.equipped) || DEFAULT_FX_SKIN; }

  // ================================================================ run lifecycle

  startRun(opts = {}) {
    // Daily Nebula (never Steady Start). opts.practice: a replay after its scored attempt (free undo allowed)
    // opts.friend: Challenge a friend (src/meta/friendChallenge.js), the same puzzle and starting kit as the sender
    if (opts.levelDef) return this.startLevel(opts.levelDef.n, opts.levelDef, { practice: !!opts.practice, friend: opts.friend || null });
    // opts.tutorial: the guided first Level 1 ('first') or its "How to play" replay ('practice'), docs/UX_FIRST_RUN.md
    if (opts.level) return this.startLevel(opts.level, null, { steady: !!opts.steady, streak: opts.streak || 0, bake: opts.bake || 0, quietStart: !!opts.quietStart, tutorial: opts.tutorial });
    return this.startEndless(opts);
  }

  resetCommon() {
    this.race = null; // "Race your best" curve for this Endless run (presentation only)
    this.tw.clear();
    this.fx.clear();
    this.visuals.clear();
    this.token++;
    this.mode = 'game';
    this.state = 'playing';
    this.busy = true;
    this.cometMode = false;
    this.targetMode = null;
    this.queuedCol = null;
    this.tally = null;
    this.aim.col = 2; this.aim.x = 2; this.aim.visible = false; this.aim.s = 0;
    // Daily Orbits state at run start, restored if autoplay takes part in this run
    try { this.orbitSnap = JSON.stringify(this.save.orbits || null); } catch (_) { this.orbitSnap = null; }
  }

  /** Flag the current run as an autoplay run (sticky). Presentation/meta only, never rules. */
  markAutoplay() {
    const r = this.run;
    if (!r || r.autoplay) return;
    r.autoplay = true;
    r.passedBest = true; // no NEW BEST fanfare: autoplay scores are never saved
    if (this.orbitSnap) { try { this.save.orbits = JSON.parse(this.orbitSnap); } catch (_) { /* ignore */ } }
    this.saveRest(); // an autoplay run is never resumable: drops any saved snapshot of it
    this.applyTestPerks();
    this.updateHud();
  }

  /** Autoplay test options for THIS run (defaults unless the run is an autoplay run). */
  testOpts() {
    const r = this.run;
    return r && r.autoplay && r.mode === 'endless' ? testOptions(this.save.settings) : testOptions(null);
  }

  /** Score needed to leave sector n. Autoplay "Fast sectors" divides it (autoplay runs only). */
  sectorGoal(n) {
    const t = sectorThreshold(n);
    return this.testOpts().fastSectors ? Math.max(1, Math.round(t / FAST_SECTOR_DIV)) : t;
  }

  /**
   * Autoplay test option "Perks: All / Constellation setups": grant the perk set to an
   * autoplay Endless run (at start or when autoplay is switched on mid-run). Only adds
   * perks not owned yet, with their pick effects (comet charges, wild orbs, slower tide).
   */
  applyTestPerks() {
    const r = this.run;
    if (!r || !r.autoplay || r.mode !== 'endless' || r.ended) return;
    const set = testPerkSet(this.testOpts().perks);
    const added = [];
    for (const id of Object.keys(set)) {
      if ((r.owned[id] || 0) > 0 || !PERK_BY_ID[id]) continue;
      r.owned[id] = set[id];
      added.push(id);
    }
    if (!added.length) return;
    const midRun = !!r.mods;
    this.refreshMods();
    for (const id of added) {
      if (id === 'comet' || id === 'meteorShower') r.comets += 2;
      if (id === 'wild') r.wildPending += 2;
    }
    if (midRun && added.includes('slowTide')) {
      r.tideK = tideInterval(r.sector, r.mods.slowTide, r.challenge);
      r.dropsUntilTide += 3;
    }
    if (this.ui.toast) this.ui.toast(`Test perks: +${added.length} (autoplay run, not saved)`);
  }

  introAnimation() {
    let i = 0;
    for (const v of this.visuals.values()) {
      v.s = 0;
      this.tw.to(v, { s: 1 }, 0.35, Ease.outBack, 0.03 * i++);
    }
    this.tw.to(this.aim, { s: 1 }, 0.4, Ease.outBack, 0.25);
  }

  // ---------------------------------------------------------------- journey level
  /**
   * `levelDef` (optional) plays a ready-made level object instead of Journey level n (Daily Nebula).
   * opts.steady: Steady Start, one Wild Orb pre-placed on the start board (ignored for the Daily Nebula).
   * opts.streak: Nova Streak charges (0..3), one more Wild Orb each (ignored for the Daily Nebula).
   * opts.bake: Tonight's bake, the tier of one plain warm piece on the start board (0 = none; ignored for the Daily Nebula).
   * opts.practice: Daily Nebula replay after its scored attempt (the free undo is allowed there).
   */
  startLevel(n, levelDef = null, opts = {}) {
    this.resetCommon();
    const level = levelDef || getLevel(n);
    const rngs = levelRngs(level);
    const steady = !!(opts && opts.steady) && !level.daily;
    const streak = level.daily ? 0 : Math.max(0, Math.min(STREAK_MAX, Math.floor(Number(opts && opts.streak) || 0)));
    const bake = level.daily ? 0 : Math.max(0, Math.min(9, Math.floor(Number(opts && opts.bake) || 0)));
    const board = buildBoard(level, { steady, streak, bake });
    // the bake piece is the last cell buildBoard made (render-only warm ring until its first merge)
    const bakeCell = bake ? board.cells.find((x) => x && x.id === board.nextId - 1 && x.kind === 'orb' && x.tier === bake && !x.wild) : null;
    const run = {
      mode: 'journey', level, daily: false, seed: level.seed, steady, streak, bake, bakeId: bakeCell ? bakeCell.id : null,
      board,
      rng: rngs.spawn, tideRng: rngs.tide, shuffleRng: rngs.shuffle, perkRng: null,
      score: 0, displayScore: 0, sector: 1, owned: {}, silentGentle: 0, lucky: false, mods: null,
      current: null, next: null, hold: null, holdUsed: false, comets: 0, wildPending: 0,
      tideK: level.tide || 0, dropsUntilTide: level.tide || Infinity,
      dropsLeft: level.drops, prog: newProgress(level), secondCups: 0,
      drops: 0, revivesUsed: 0, secondWindUsed: false, adUsed: false, coinContinues: 0,
      continuesGranted: 0, // anonymous level stats: continues that really added drops (coins or an ad that paid out)
      activeTime: 0, maxCombo: 0, maxTier: 0, merges: 0, supernovas: 0, asteroids: 0,
      bestChain: { points: 0, combo: 0 },
      bestAtStart: 0, passedBest: true, ended: false, autoplay: false,
      // Daily Nebula: its date key (null for Journey). Boosters, continues and ads are off there.
      nebula: level.daily || null, dropLog: [],
      // Undo last drop (Fun Wave D): one free undo per attempt, never sold or ad-gated
      undoOk: undoAllowed(level, { practice: !!(opts && opts.practice) }), undoUsed: false, undo: null,
      boosterUsed: false, // anonymous level stats (src/meta/levelStats.js): a Journey booster was used this attempt
      // the first-run lesson (docs/UX_FIRST_RUN.md): 'first' (recorded like a normal Level 1, never resumable) or
      // 'practice' (the "How to play" replay: records nothing). Presentation and meta only; the rules are untouched.
      tutorial: opts && (opts.tutorial === 'first' || opts.tutorial === 'practice') && !level.daily ? opts.tutorial : null,
    };
    // Challenge a friend: the Daily Nebula exactly as the sender had it (the free undo only if theirs had it)
    const fr = level.daily && opts && opts.friend;
    if (fr) { run.undoOk = !!normKit(fr.kit, 'nebula').undo; run.friend = friendInfo(fr); }
    if (level.daily) run.kit = normKit({ undo: !!run.undoOk, twist: level.twist }, 'nebula'); // twist only when not plain
    // weekly café twist of the Daily (absent = plain, so plain runs snapshot exactly as before)
    if (level.daily && level.twist && level.twist !== 'plain') run.nebulaTwist = level.twist;
    this.run = run;
    if (this.autoplayEnabled) this.markAutoplay();
    this.refreshMods();
    run.current = this.spawn();
    run.next = this.spawn();
    this.hud.setMode('journey');
    this.updateHud(true);
    Svc.onRunStart();
    const tok = this.token;
    (async () => {
      this.syncVisuals(true);
      this.introAnimation();
      const label = run.friend ? tr('banner.challenge') : run.nebula ? tr('banner.dailyNebula') : level.kind === 'superhard' ? tr('banner.superHard') : level.kind === 'hard' ? tr('banner.hard') : tr('banner.level', { n: level.n });
      const color = run.nebula ? '#ff8ae0' : level.kind === 'superhard' ? '#ff4fd8' : level.kind === 'hard' ? '#ff8a5c' : '#9fd8ff';
      // a level that introduces a new rule starts quietly: the rule box is the one message (docs/UX_MECHANICS.md P1)
      if (!opts.quietStart) this.fx.banner(label, color, [trp('banner.drops', level.drops), steady ? tr('banner.steady') : '', streakTag(streak)].filter(Boolean).join(' · '), { dur: 1.3, size: 0.85 });
      await this.tw.wait(0.5);
      if (tok !== this.token) return;
      await this.boosterUnlockIntro();
      if (tok !== this.token) return;
      this.busy = false;
      this.saveRest();
      this.flushQueue();
    })();
  }

  /**
   * Puzzle Books (DESIGN.md "Puzzle Books"): play book puzzle p from the position after `cols` (its drops so far, replayed
   * exactly; src/game/puzzles.js). A fixed board and piece order, one goal, unlimited free undo, no boosters, no tide,
   * no score shown. It is never a run: no onRunStart/onRunEnd (so never an ad), no Today credit, no discovery coins, no
   * Journal, no snapshot (the position lives in save.books.cur through onBookProgress). book: { id, tries }.
   * quiet: no intro banner (undo and "Try again" restart in place).
   */
  startBook(p, { id, cols = [], tries = 0, quiet = false } = {}) {
    this.resetCommon();
    const rep = puzzleReplay(p, cols);
    const run = {
      mode: 'journey', book: { id, n: p.n, tries: Math.max(0, tries | 0) }, bookP: p, bookCols: rep.cols.slice(), bookDeal: rep.used,
      level: rep.level, daily: false, seed: 0, steady: false, streak: 0, board: rep.board,
      rng: null, tideRng: null, shuffleRng: null, perkRng: null,
      score: 0, displayScore: 0, sector: 1, owned: {}, silentGentle: 0, lucky: false, mods: null,
      current: null, next: null, hold: null, holdUsed: false, comets: 0, wildPending: 0,
      tideK: 0, dropsUntilTide: Infinity, dropsLeft: p.queue.length - rep.used, prog: rep.prog, secondCups: 0,
      drops: rep.used, revivesUsed: 0, secondWindUsed: false, adUsed: false, coinContinues: 0, continuesGranted: 0,
      activeTime: 0, maxCombo: 0, maxTier: 0, merges: 0, supernovas: 0, asteroids: 0, bestChain: { points: 0, combo: 0 },
      bestAtStart: 0, passedBest: true, ended: false, autoplay: false, nebula: null, dropLog: [],
      undoOk: true, undoUsed: false, undo: null, boosterUsed: false, tutorial: null,
    };
    this.run = run;
    this.refreshMods();
    run.current = this.spawn();
    run.next = this.spawn();
    this.hud.setMode('journey');
    this.updateHud(true);
    const tok = this.token;
    (async () => {
      this.syncVisuals(true);
      if (!quiet) {
        this.introAnimation();
        this.fx.banner(tr('banner.puzzle', { n: p.n }), '#9fd8ff', tr('banner.puzzleSub'), { dur: 1.3, size: 0.85 });
        await this.tw.wait(0.5);
      }
      if (tok !== this.token) return;
      if (rep.won || rep.out) { await this.bookEnd(rep.won); return; }
      this.busy = false;
      this.flushQueue();
    })();
  }

  /** Puzzle Books: after a drop. Solved, out of pieces (or no room), or carry on. */
  async afterBookDrop(res) {
    const r = this.run;
    const before = r.prog.slice();
    applyProgress(r.level, r.prog, res, 0);
    r.prog.forEach((v, i) => { if (v > before[i]) this.hud.pulseGoal(i, v >= r.level.goals[i].count); });
    r.dropsLeft = r.bookP.queue.length - r.bookCols.length;
    this.updateHud();
    const won = goalsMet(r.level, r.prog);
    if (won || r.dropsLeft <= 0 || isBoardFull(r.board)) { await this.bookEnd(won); return; }
    this.syncVisuals();
    this.busy = false;
    this.bookProgress();
    this.flushQueue();
  }

  /** Puzzle Books "Show me a first drop" (after 2 tries): glow the hint column until the first drop. Free, always. */
  showBookHint() {
    const r = this.run;
    if (!r || !r.book || r.bookCols.length) return false;
    r.bookHint = true;
    return true;
  }

  /** Puzzle Books: tell main.js the position (save.books.cur). */
  bookProgress() {
    const r = this.run;
    if (!r || !r.book) return;
    try { this.onBookProgress && this.onBookProgress({ id: r.book.id, n: r.book.n, cols: r.bookCols.slice(), tries: r.book.tries }); } catch (_) { /* ignore */ }
  }

  /** Puzzle Books: solved, or out of pieces. The result card offers Try again / Undo / Back (main.js). */
  async bookEnd(won) {
    const r = this.run;
    const tok = this.token;
    this.busy = true;
    if (won) {
      r.ended = true;
      this.state = 'over';
      this.fx.banner(tr('banner.solved'), '#7cffb2', '', { dur: 1.2, size: 0.8 });
      Svc.sfx('win');
      Svc.haptic('success');
    } else {
      this.state = 'over'; // no Pause under the "out" card; bookRestart (Try again / Undo) starts playing again
      this.bookProgress();
      this.fx.banner(tr('banner.notThisTime'), '#a9bfe0', '', { dur: 1.0, size: 0.7 });
    }
    await this.tw.wait(won ? 1.0 : 0.8);
    if (tok !== this.token) return;
    const result = { mode: 'book', won, id: r.book.id, n: r.book.n, tries: r.book.tries, cols: r.bookCols.slice(), autoplay: false };
    try { this.onRunOver && this.onRunOver(result); } catch (e) { console.error(e); }
  }

  /** Puzzle Books: start the same puzzle again (Try again) or one drop back (Undo), in place. */
  bookRestart(cols, tries) {
    const r = this.run;
    if (!r || !r.book) return false;
    this.token++;
    this.tw.clear();
    this.startBook(r.bookP, { id: r.book.id, cols, tries: tries == null ? r.book.tries : tries, quiet: true });
    this.bookProgress();
    return true;
  }

  boosterUnlocked(id) {
    const r = this.run;
    if (r && r.book) return false; // Puzzle Books: no boosters
    if (r && r.nebula) return false; // the Daily Nebula is the same puzzle for everyone: no boosters
    const n = r && r.level ? r.level.n : 0;
    return n >= BOOSTER_UNLOCKS[id] || !!(this.save.journey && this.save.journey.level > BOOSTER_UNLOCKS[id]);
  }

  /**
   * The free booster gift on its unlock level, plus its "New booster" card. save.boosterIntro[id]: missing = not
   * granted yet; false = granted, card not shown yet; true = card shown. The gift is granted once; the card is
   * queued until it's actually shown (main.js marks it true then), so a reload before the first drop can't lose it.
   */
  async boosterUnlockIntro() {
    const r = this.run;
    const save = this.save;
    if (r.autoplay || r.nebula || r.tutorial) return; // the free booster gift is for the player's own first visit
    save.boosterIntro = save.boosterIntro || {};
    for (const id of ['comet', 'wild', 'shuffle']) {
      if (r.level.n !== BOOSTER_UNLOCKS[id] || save.boosterIntro[id] === true) continue;
      if (!(id in save.boosterIntro)) {
        save.boosterIntro[id] = false; // granted; the card isn't shown yet
        save.boosters[id] = (save.boosters[id] || 0) + 1;
        this.persist && this.persist();
        this.updateHud();
      }
      try { await (this.ui.showBoosterIntro && this.ui.showBoosterIntro(id)); } catch (_) { /* ignore */ }
    }
  }

  /**
   * challenge: 'gentle' | 'standard' | 'bold' tide speed (DESIGN.md). The daily challenge is always Standard.
   * path: 'gravity' | 'fusion' | 'tide' (Paths + Resonance) or null; never on the daily challenge.
   */
  startEndless({ daily = false, seed = null, challenge = 'standard', path = null, zen = false, friend = null } = {}) {
    this.resetCommon();
    const save = this.save;
    // Challenge a friend (DESIGN.md): the sender's seed, tide and whole starting kit, never the player's own
    // upgrades, so both play the identical orb sequence with the same tools. Never daily or Zen; no best of its own.
    const fk = friend ? normKit(friend.kit) : null;
    if (fk) { daily = false; zen = false; }
    // Zen Drift (DESIGN.md "Zen Drift"): Endless with the tide switched off. Never daily, Standard
    // spawns, no Path, no Lucky Start (it only exists to soften the tide). Its own best.
    zen = !!zen && !daily;
    const tier = fk ? normChallenge(friend.tier) : daily || zen ? 'standard' : normChallenge(challenge);
    const pathId = fk ? normPath(fk.path) : daily || zen ? null : normPath(path);
    const s = fk ? friend.seed >>> 0 : seed != null ? seed >>> 0 : randomSeed();
    const firstRuns = (save.runs || 0) < 3;
    const recent = (save.recentSectors || []).slice(-3);
    const lucky = fk ? fk.lucky : !daily && !zen && !firstRuns && recent.length >= 3 && recent.every((x) => x < 2);

    const owned = {};
    if (fk ? fk.hold : save.upgrades.startHold) owned.hold = 1;
    const extraComet = fk ? fk.comet : !!save.upgrades.extraComet;
    const startPerk = fk ? fk.perk : !!save.upgrades.startPerk;
    const silentGentle = fk ? (fk.gentle ? 1 : 0) : !daily && firstRuns ? 1 : 0;

    const run = {
      mode: 'endless', level: null, seed: s, daily, dailyKey: daily ? localDayKey() : null, challenge: tier,
      board: createBoard(),
      rng: mulberry32(deriveSeed(s, 'spawn')),
      tideRng: mulberry32(deriveSeed(s, 'tide')),
      perkRng: mulberry32(deriveSeed(s, 'perks')),
      score: 0, displayScore: 0,
      sector: 1,
      owned,
      silentGentle,
      lucky,
      mods: null,
      current: null, next: null, hold: null, holdUsed: false,
      comets: (extraComet ? 1 : 0) + (lucky ? 2 : 0),
      wildPending: 0,
      tideK: 9, dropsUntilTide: 9,
      drops: 0,
      curve: daily || zen || fk ? null : newCurve(), // "Race your best": score every few drops (src/meta/raceBest.js)
      revivesUsed: 0, secondWindUsed: false,
      activeTime: 0,
      maxCombo: 0, maxTier: 0, merges: 0, supernovas: 0, asteroids: 0,
      bestChain: { points: 0, combo: 0 }, // largest single-resolution tally this run (run stats)
      // each tier has its own best; a friend's challenge races the friend's score instead (the bar says so)
      bestAtStart: fk ? friend.score | 0 : zen ? zenBest(save) : daily ? this.dailyBest() : challengeBest(save, tier),
      passedBest: false,
      ended: false,
      autoplay: false,
    };
    if (pathId) run.path = pathId; // absent = no path (classic offers; older snapshots stay identical)
    if (zen) run.zen = true; // absent = a normal Endless run (older snapshots stay identical)
    // the starting kit (Challenge a friend: the result card can send this exact puzzle on)
    if (!zen) run.kit = { hold: !!owned.hold, comet: extraComet, perk: startPerk, lucky, gentle: !!silentGentle, path: pathId || null };
    if (fk) run.friend = friendInfo(friend);
    // Sector bounties (DESIGN.md): one optional side goal per sector, from its own derived seed (never Zen Drift)
    if (!zen) { run.bounty = bountyFor(s, 1); run.bountiesDone = 0; run.bountiesSeen = 1; }
    // Café moments (DESIGN.md): now and then an optional Order ticket (never in the Daily Challenge or Zen Drift)
    if (!zen && !daily) run.moments = newMoments();
    this.run = run;
    this.race = daily || zen || fk ? null : raceFor(save, tier, run.bestAtStart);
    this.hud.friendLabel = fk ? whoName(run.friend).toUpperCase() : '';
    if (this.autoplayEnabled) this.markAutoplay();
    this.refreshMods();
    if (zen) { run.tideK = 0; run.dropsUntilTide = Infinity; } // no tide, ever
    else {
      run.tideK = tideInterval(1, run.mods.slowTide, tier);
      run.dropsUntilTide = run.tideK + (lucky ? 3 : 0);
    }

    // opening board: two tide rows so there's something to play with
    for (let i = 0; i < 2; i++) pushRow(run.board, run.tideRng, { sector: 1, maxSpawn: 3 });
    run.current = this.spawn();
    run.next = this.spawn();

    this.hud.setMode('endless');
    this.updateHud(true);
    if (!zen) Svc.onRunStart(); // Zen Drift is invisible to the ad pacing (no ads, not a run for interstitials)

    const tok = this.token;
    (async () => {
      this.syncVisuals(true);
      this.introAnimation();
      if (fk) {
        this.fx.banner(tr('banner.challenge'), '#ff9ae8', tr('friend.banner.score', { who: whoName(run.friend), n: run.friend.score.toLocaleString('en-US'), gender: whoGender(run.friend) }), { dur: 2, size: 0.85 });
      } else if (lucky) {
        this.fx.banner(tr('banner.lucky'), '#7cffb2', tr('banner.luckySub'), { dur: 2.2, size: 0.8 });
        this.ui.toast && this.ui.toast('Lucky Start: +2 comets and a calmer first tide. Good luck!');
      } else if (daily) {
        this.fx.banner(tr('banner.daily'), '#ffd54a', tr('banner.dailySub'), { dur: 1.6, size: 0.9 });
      } else if (zen) {
        this.fx.banner(tr('banner.zen'), '#b8c8ff', tr('banner.zenSub'), { dur: 1.6, size: 0.85 });
      } else {
        const sub = [tier === 'standard' ? '' : (tier === 'gentle' ? tr('banner.gentleTide') : tr('banner.boldTide')), pathId ? tr('banner.path', { name: PATH_BY_ID[pathId].name }) : ''].filter(Boolean).join(' · ');
        this.fx.banner(tr('banner.sector', { n: 1 }), '#9fd8ff', sub, { dur: 1.2, size: 0.85 });
      }
      await this.tw.wait(0.5);
      if (tok !== this.token) return;
      if (startPerk) await this.offerPerk('Opening Perk');
      if (tok !== this.token) return;
      this.busy = false;
      this.saveRest();
      this.flushQueue();
    })();
  }

  dailyBest() {
    try {
      const d = this.save.dailyChallenge;
      return d && d.date === localDayKey() ? d.best : 0;
    } catch (_) { return 0; }
  }

  refreshMods() {
    const r = this.run;
    r.mods = buildRunMods(r.owned, { silentGentle: r.silentGentle });
  }

  spawn() {
    const r = this.run;
    if (r.bookP) { // Puzzle Books: the fixed piece order (null once every piece is dealt)
      const t = r.bookP.queue[r.bookDeal++];
      return t ? { tier: Number(t), golden: false, wild: false } : null;
    }
    let wild = false;
    if (r.wildPending > 0) { r.wildPending--; wild = true; }
    return spawnOrb(r.board, r.rng, { gentle: r.mods.gentle, goldenChance: r.mods.goldenChance, wild });
  }

  // ================================================================ resume after reload
  // Save only, never rules: the run is copied as plain data (board, queue, perks, counters and
  // the exact positions of its seeded RNG streams), so a restored run continues bit-for-bit.

  /** Serialisable copy of the current run, or null (no run, ended, autoplay). */
  snapshotRun(pending = null) {
    const r = this.run;
    if (!r || r.ended || r.autoplay || r.tutorial) return null; // the lesson restarts from its first step instead
    const run = {};
    for (const k of Object.keys(r)) if (k !== 'mods' && k !== 'level' && !RNG_KEYS.includes(k)) run[k] = r[k];
    let data;
    try { data = JSON.parse(JSON.stringify(run)); } catch (_) { return null; }
    if (!Number.isFinite(r.dropsUntilTide)) data.dropsUntilTide = null;
    const rngs = {};
    for (const k of RNG_KEYS) if (r[k] && r[k].getState) rngs[k] = r[k].getState();
    let orbits = null;
    try { orbits = this.save.orbits ? JSON.parse(JSON.stringify(this.save.orbits)) : null; } catch (_) { orbits = null; }
    return {
      v: SNAP_VERSION, build: this.snapBuild || null, at: Date.now(), mode: r.mode, levelN: r.level ? r.level.n : null, nebula: r.nebula || null,
      rngs, run: data, orbits, pending: pending || null,
    };
  }

  /** Write the resting run (or the run plus a move in flight) through onSnapshot. */
  saveRest(pending = null) {
    const r = this.run;
    if (r && r.book) return; // Puzzle Books keep their position in save.books.cur, never a run snapshot
    if (!r || !this.onSnapshot) return;
    try {
      if (r.autoplay) { this.onSnapshot(null); return; }
      if (r.tutorial) return; // never saved, and a practice run leaves any saved run alone
      if (r.ended) return;
      const snap = this.snapshotRun(pending);
      if (snap) this.onSnapshot(snap);
    } catch (_) { /* ignore */ }
  }

  /** Patch the saved snapshot in place (e.g. "the ad offer was used") while a move is still in flight. */
  markSavedRun(fields) {
    const sn = this.save.runSnap;
    const r = this.run;
    if (!sn || !sn.run || !r || r.autoplay) return;
    Object.assign(sn.run, fields);
    this.persist && this.persist();
  }

  /**
   * The run-over result for a saved run the player chose to end from the menu, built from the
   * snapshot alone (same shape as forfeit()/endRun()). Nothing on screen changes.
   */
  resultFromSnapshot(snap, build = null) {
    if (!validRunSnap(snap, build)) return null;
    const r = snap.run;
    if (snap.mode === 'journey') {
      const level = snap.nebula ? getDailyLevel(snap.nebula, snap.run.nebulaTwist || 'plain') : getLevel(snap.levelN);
      return {
        mode: 'journey', won: false, level: level.n, kind: level.kind, stars: 0, coins: 0, score: r.score,
        durationSec: Math.round(r.activeTime), remaining: remainingText(level, r.prog), forfeit: true, goals: level.goals,
        prog: r.prog.slice(), autoplay: false, nebula: snap.nebula || null, dropsUsed: r.drops, dropLog: (r.dropLog || []).slice(),
        merges: r.merges || 0,
        undoUsed: !!r.undoUsed, boosterUsed: !!r.boosterUsed, continuesGranted: r.continuesGranted || 0, // anonymous level stats only
        ...friendResult(r),
      };
    }
    const mods = buildRunMods(r.owned, { silentGentle: r.silentGentle });
    return {
      mode: 'endless', score: r.score, bestBefore: r.friend ? 0 : r.bestAtStart, isNewBest: !r.friend && r.score > r.bestAtStart, autoplay: false,
      sector: r.sector, daily: !!r.daily, challenge: normChallenge(r.challenge), path: r.daily ? null : normPath(r.path), durationSec: Math.round(r.activeTime), maxCombo: r.maxCombo || 0, maxTier: r.maxTier || 0,
      bestChain: { ...(r.bestChain || { points: 0, combo: 0 }) }, merges: r.merges || 0, supernovas: r.supernovas || 0,
      coinBonus: mods.coinBonus, owned: { ...r.owned }, drops: r.drops, reason: null, forfeit: true, board: null,
      curve: r.zen || r.friend ? null : curveOut(r), zen: !!r.zen, ...bountyResult(repairedBounty(r)), ...momentResult(repairedMoments(r)), ...friendResult(r),
    };
  }

  /** Continue a run from snapshotRun(). Replays the move that was in flight, if any. */
  restoreRun(snap, build = null) {
    if (!validRunSnap(snap, build)) return false;
    let level = null;
    try {
      if (snap.mode === 'journey') level = snap.nebula ? getDailyLevel(snap.nebula, snap.run.nebulaTwist || 'plain') : getLevel(snap.levelN); // twist absent = plain
    } catch (_) { return false; }
    let run;
    try { run = JSON.parse(JSON.stringify(snap.run)); } catch (_) { return false; }
    if (!run.board || !Array.isArray(run.board.cells)) return false;
    this.resetCommon();
    run.level = level;
    if (run.mode === 'endless') run.challenge = run.daily ? 'standard' : normChallenge(run.challenge); // pre-v0.5.2 snapshots: Standard
    if (run.mode === 'endless' && !run.daily && normPath(run.path)) run.path = normPath(run.path); else delete run.path; // Paths (rules-3)
    if (run.mode === 'endless' && !run.daily && run.zen === true) { run.challenge = 'standard'; delete run.path; run.tideK = 0; run.dropsUntilTide = Infinity; } else delete run.zen; // Zen Drift (rules-4)
    if (run.dropsUntilTide == null) run.dropsUntilTide = Infinity;
    if (run.mode === 'journey') run.secondCups = run.nebula ? 0 : Math.max(0, Math.min(2, Math.floor(Number(run.secondCups) || 0))); // Second cup (absent = 0)
    if (run.mode === 'endless') sanitizeRunBounty(run); // Sector bounties: an older snapshot gets the current sector's goal
    sanitizeRunMoments(run); // Café moments: absent on older snapshots (they keep playing without), repaired if malformed
    // Challenge a friend: the challenge and starting kit travel in the snapshot as plain data (absent on older ones)
    const fi = run.friend && typeof run.friend === 'object' && !run.zen && !run.daily ? friendInfo(run.friend) : null;
    if (fi && fi.mode === (run.mode === 'journey' ? 'nebula' : 'endless') && (fi.mode === 'endless' || fi.date === run.nebula)) run.friend = fi; else delete run.friend;
    if (run.kit && typeof run.kit === 'object') run.kit = normKit(run.kit, run.mode === 'journey' ? 'nebula' : 'endless'); else delete run.kit;
    this.hud.friendLabel = run.friend && run.mode === 'endless' ? whoName(run.friend).toUpperCase() : '';
    for (const k of RNG_KEYS) {
      const st = snap.rngs && snap.rngs[k];
      if (st == null) { run[k] = null; continue; }
      const g = mulberry32(1);
      g.setState(st);
      run[k] = g;
    }
    run.ended = false;
    run.autoplay = false;
    this.run = run;
    if (run.mode === 'endless' && !run.daily && !run.zen && !run.friend) this.race = raceFor(this.save, run.challenge, run.bestAtStart);
    this.refreshMods();
    // a move was in flight: put back the Daily Orbits progress from before it (never un-collects)
    const so = snap.orbits, cur = this.save.orbits;
    if (snap.pending && so && cur && so.date === cur.date && Array.isArray(so.list)) {
      cur.list.forEach((m, i) => {
        const c = so.list[i];
        if (!c || c.type !== m.type || m.claimed) return;
        m.progress = c.progress; m.done = c.done;
      });
    }
    this.hud.setMode(run.mode);
    this.updateHud(true);
    // a booster card granted on this level but not shown before the app closed is queued again (no second gift)
    if (run.level && !run.nebula) {
      for (const id of ['comet', 'wild', 'shuffle']) {
        if (run.level.n === BOOSTER_UNLOCKS[id] && this.save.boosterIntro && this.save.boosterIntro[id] === false) {
          try { this.ui.showBoosterIntro && this.ui.showBoosterIntro(id); } catch (_) { /* ignore */ }
        }
      }
    }
    run.displayScore = run.score;
    this.hud.setScore(run.score);
    if (!run.zen) Svc.onRunStart();
    const tok = this.token;
    (async () => {
      this.syncVisuals(true);
      this.introAnimation();
      this.fx.banner(tr('banner.welcomeBack'), '#9fd8ff', tr('banner.welcomeBackSub'), { dur: 1.3, size: 0.75 });
      await this.tw.wait(0.5);
      if (tok !== this.token) return;
      this.busy = false;
      const p = snap.pending;
      if (p && p.type === 'drop' && Number.isInteger(p.col)) this.doDrop(p.col);
      else if (p && p.type === 'comet') this.useComet(p.r, p.c, true);
      else if (p && p.type === 'shuffle') this.useShuffle(p.col, true);
      else if (p && p.type === 'revive') { this.busy = true; this.doRevive(typeof p.reason === 'string' ? p.reason : null); }
      else if (p && p.type === 'continue' && run.mode === 'journey') { this.busy = true; this.finishContinue(p.reason, p.extra); }
      else { this.saveRest(); this.flushQueue(); }
    })();
    return true;
  }

  quitToMenu() {
    this.token++;
    this.tw.clear();
    this.fx.clear();
    this.visuals.clear();
    this.run = null;
    this.mode = 'menu';
    this.state = 'idle';
    this.busy = false;
    this.cometMode = false;
    this.tally = null;
  }

  pause() {
    if (this.state === 'playing') this.state = 'paused';
  }
  resume() {
    if (this.state === 'paused') this.state = 'playing';
  }

  // ================================================================ per-frame

  update(dt) {
    if (this.state === 'paused') return;
    // hit-stop: a few frames of slow motion on big impacts (presentation only)
    const gdt = this.fx.scaleDt ? this.fx.scaleDt(dt) : dt;
    this.tw.update(gdt * (this.animSpeed === 2 ? 2 : 1));
    this.fx.update(gdt);
    const r = this.run;
    if (!r || this.mode !== 'game') return;
    if (this.state === 'playing') r.activeTime += dt;
    if (r.mode === 'journey' && this.hud.setUndo) this.hud.setUndo(this.undoState()); // ready only at rest
    // aim smoothing
    const a = this.aim;
    a.x += (a.col - a.x) * Math.min(1, dt * 22);
    a.landRow = landingRow(r.board, a.col);
    // chain tally: rolling digits + step bump (presentation only)
    const t = this.tally;
    if (t) {
      if (t.shown !== t.target) {
        const d = t.target - t.shown;
        t.shown += Math.sign(d) * Math.max(1, Math.ceil(Math.abs(d) * Math.min(1, dt * 14)));
        if ((d > 0 && t.shown > t.target) || (d < 0 && t.shown < t.target)) t.shown = t.target;
      }
      t.bump *= Math.exp(-10 * dt);
    }
    // score count-up (held while a chain tally is on screen; it lands when the tally flies in)
    if (!t && r.displayScore !== r.score) {
      const diff = r.score - r.displayScore;
      r.displayScore += Math.sign(diff) * Math.max(1, Math.ceil(Math.abs(diff) * Math.min(1, dt * 12)));
      if ((diff > 0 && r.displayScore > r.score) || (diff < 0 && r.displayScore < r.score)) r.displayScore = r.score;
      this.hud.setScore(r.displayScore);
    }
  }

  view() {
    const r = this.run;
    if (this.mode !== 'game' || !r) return { mode: 'menu', fx: this.fx, skin: this.skin };
    const danger = [];
    for (let c = 0; c < r.board.cols; c++) {
      danger.push(getCell(r.board, 0, c) ? 2 : getCell(r.board, 1, c) ? 1 : 0);
    }
    // landing ghost: read-only preview (no mutation, no RNG); hidden while a move resolves
    const ghost = this.aim.visible && !this.busy && !this.targetMode && r.current
      ? previewDrop(r.board, this.aim.col, r.current, r.mods && r.mods.boardOpts) : null;
    // Comfort "Next fits here" (default off): soft glow where the NEXT piece would merge; read-only, same visibility as the ghost
    let nextHint = this.save.settings && this.save.settings.nextHint === true && !this.busy && !this.targetMode
      && this.state === 'playing' && r.next ? nextFitCells(r.board, r.next, r.mods && r.mods.boardOpts) : null;
    // Puzzle Books "Show me a first drop": a soft glow where the first piece lands in the puzzle's hint column
    if (r.book && r.bookHint && !r.bookCols.length && r.current && !this.busy && this.state === 'playing') {
      const row = landingRow(r.board, r.bookP.hint.col);
      if (row >= 0) nextHint = [{ row, col: r.bookP.hint.col, tier: r.current.tier }];
    }
    return {
      mode: 'game',
      fx: this.fx,
      skin: this.skin,
      boardSkin: this.boardSkin,
      fxSkin: this.fxSkin,
      visuals: this.visuals,
      aim: this.aim,
      ghost,
      nextHint,
      tally: this.tally,
      reduced: !!this.fx.reduced,
      current: r.closingShow ? null : r.current,
      tideK: r.tideK,
      tideLeft: r.dropsUntilTide,
      danger,
      cometMode: !!this.targetMode,
      warmId: r.bakeId != null && !r.ended ? r.bakeId : null, // Tonight's bake: a soft warm ring until its first merge
      showNumbers: !!(this.save.settings && this.save.settings.numbers),
      showShapes: !!(this.save.settings && this.save.settings.shapes),
      targetHint: this.targetMode === 'shuffle' ? 'Tap a column to shuffle it' : 'Tap an orb to vaporise it',
    };
  }

  // ================================================================ input

  canAct() { return this.mode === 'game' && this.state === 'playing' && this.run && !this.run.ended; }

  pointerDown(x, y) {
    if (this.closing) { this.closing.skip = true; return; } // tap anywhere skips the closing-time celebration
    if (!this.canAct()) return;
    const R = this.renderer;
    if (this.targetMode) { this.pointer = { x, y, comet: true }; return; }
    if (!R.inPlayArea(y)) { this.pointer = null; return; }
    this.pointer = { x, y };
    this.aim.col = R.colAt(x);
    this.aim.visible = true;
  }

  pointerMove(x, y, isDown) {
    if (!this.canAct() || this.targetMode) return;
    const R = this.renderer;
    if (isDown && this.pointer) {
      this.aim.col = R.colAt(x);
      this.aim.visible = true;
    } else if (!isDown && R.inPlayArea(y) && R.colAt(x, false) >= 0) {
      // mouse hover aim (desktop only nicety; never required)
      this.aim.col = R.colAt(x);
      this.aim.visible = true;
    }
  }

  pointerUp(x, y) {
    const p = this.pointer;
    this.pointer = null;
    if (!this.canAct() || !p) return;
    const R = this.renderer;
    if (p.comet) {
      const cell = R.cellAt(x, y);
      if (this.targetMode === 'shuffle') {
        const c = R.colAt(x, false);
        if (c >= 0 && R.inPlayArea(y)) this.useShuffle(c);
        else this.setTargetMode(null);
      } else if (cell && getCell(this.run.board, cell.r, cell.c)) this.useComet(cell.r, cell.c);
      else this.setTargetMode(null);
      return;
    }
    const col = R.colAt(x);
    this.aim.col = col;
    this.requestDrop(col);
  }

  key(k) {
    if (!this.canAct()) return false;
    const a = this.aim;
    if (k === 'ArrowLeft' || k === 'a') { a.col = Math.max(0, a.col - 1); a.visible = true; return true; }
    if (k === 'ArrowRight' || k === 'd') { a.col = Math.min(4, a.col + 1); a.visible = true; return true; }
    if (k === ' ' || k === 'Enter' || k === 'ArrowDown' || k === 's') { this.requestDrop(a.col); return true; }
    if (k >= '1' && k <= '5') { a.col = Number(k) - 1; a.visible = true; this.requestDrop(a.col); return true; }
    if (k === 'h') { this.useHold(); return true; }
    if (k === 'c') { this.setCometMode(!this.cometMode); return true; }
    if (k === 'Escape') { this.setTargetMode(null); return true; }
    return false;
  }

  requestDrop(col) {
    if (this.busy) { this.queuedCol = col; return; }
    this.doDrop(col);
  }

  flushQueue() {
    if (this.queuedCol != null && !this.busy && this.canAct()) {
      const c = this.queuedCol;
      this.queuedCol = null;
      this.doDrop(c);
    } else {
      this.queuedCol = null;
    }
  }

  // ================================================================ actions

  async doDrop(col) {
    const r = this.run;
    if (!r || this.busy) return;
    if (landingRow(r.board, col) < 0) {
      // full column: nudge feedback
      Svc.haptic('light');
      Svc.sfx('ui');
      this.aim.dy = 0;
      this.tw.run(0.25, (p) => { this.aim.dy = Math.sin(p * Math.PI * 4) * 5 * (1 - p); });
      this.fx.text(this.renderer.cellX(col), this.renderer.cellY(0), 'FULL', '#ff7a9a', 18, { dur: 0.7, flair: true });
      return;
    }
    // resume-after-reload: the run as it stands plus the move in flight (replayed exactly on restore)
    this.saveRest({ type: 'drop', col });
    this.busy = true;
    const tok = this.token;
    // Undo last drop: exact pre-drop state (rules) + Daily Orbits progress (meta, put back on undo)
    if (r.mode === 'journey' && !r.book) {
      r.undo = r.undoOk && !r.undoUsed ? takeUndo(r) : null;
      if (r.undo) { try { r.undo.orbits = this.save.orbits ? JSON.parse(JSON.stringify(this.save.orbits)) : null; } catch (_) { r.undo.orbits = null; } }
    }
    const spec = r.current;
    const res = dropOrb(r.board, col, spec, this.boardOpts());
    if (!res.ok) { this.busy = false; return; }
    if (r.book) r.bookCols.push(col);

    // advance the orb queue
    r.current = r.next;
    r.next = this.spawn();
    r.holdUsed = false;
    if (r.mode === 'endless' && r.curve) curveTick(r.curve, r.drops, r.score); // score after r.drops drops
    r.drops++;
    if (!r.book) try { this.onDrop && this.onDrop(r.drops); } catch (_) { /* ignore */ }

    // falling visual
    const R = this.renderer;
    const v = this.addVisual({ id: res.id, kind: 'orb', tier: spec.tier, golden: spec.golden, wild: spec.wild, c: col, r: R.aimRow() });
    this.fallingVis = v; // presentation: the Star Keeper's eyes follow the falling piece
    this.aim.s = 0;
    this.tw.to(this.aim, { s: 1 }, 0.28, Ease.outBack, 0.12);
    this.updateHud();

    const dist = res.row - v.r;
    await this.tw.to(v, { r: res.row }, 0.07 + Math.sqrt(Math.max(0.1, dist)) * 0.075, Ease.inQuad);
    if (this.fallingVis === v) this.fallingVis = null;
    if (tok !== this.token) return;
    Svc.sfx('drop');
    Svc.haptic('light');
    this.squash(v);
    if (spec.wild) {
      v.wild = false;
      if (res.wildFrom != null) {
        v.tier = res.tier;
        v.flash = 1;
        this.tw.to(v, { flash: 0 }, 0.3);
        this.fx.burst(R.cellX(col), R.cellY(res.row), ['#ff6ad5', '#7ad7ff', '#ffd54a', '#7cffb2'], 18, 160, 3);
      }
    }
    if (res.jokers) {
      // Steady Start: the Wild Orb next to the landing takes the landed orb's tier
      for (const j of res.jokers) {
        const jv = this.visuals.get(j.id);
        if (!jv) continue;
        jv.wild = false; jv.tier = j.tier; jv.flash = 1;
        this.tw.to(jv, { flash: 0 }, 0.3);
        this.fx.burst(R.cellX(j.c), R.cellY(j.r), ['#ff6ad5', '#7ad7ff', '#ffd54a', '#7cffb2'], 18, 160, 3);
      }
    }
    if (res.steps.length) await this.tw.wait(0.04);
    await this.playSteps(res.steps, res);
    if (tok !== this.token) return;
    // meta hook (Skill Journal), never rules: cascade steps this drop caused + the run's drop number
    if (!r.book) try { this.onDropResolved && this.onDropResolved(res.steps.length, r.drops); } catch (_) { /* ignore */ }

    if (r.book) { await this.afterBookDrop(res); return; }
    if (r.mode === 'journey') { await this.afterJourneyAction(res, true); return; }

    // Zen Drift: no tide at all (no Eclipse, no countdown, no tide rows)
    if (r.zen) this.updateHud();
    else {
    // Eclipse (Constellation): a drop whose cascade has 3+ merge steps pushes the tide back 2 drops (1 from sector 7),
    // never past the full interval. Shown honestly with the real amount gained.
    if (r.mods.eclipse) {
      const gain = eclipseGain(res.steps.length, r.tideK, r.dropsUntilTide, r.sector);
      if (gain > 0) {
        r.dropsUntilTide += gain;
        this.fx.text(this.renderer.w / 2, this.renderer.L.tideY - 18, `ECLIPSE · TIDE +${gain}`, '#e0b3ff', 16, { dur: 1.2, vy: -22 });
        Svc.sfx('discover', { tier: 6 });
      }
    }
    // Warm Oven (Star Forge): a drop whose cascade made a tier-5+ piece makes the tide wait 2 more drops, once per
    // sector, never past the full interval (DESIGN.md "Warm Oven and Morning Tidy"; C# Drop).
    if (r.mods.warmOven) {
      const gain = ovenGain(res.maxTier, r.tideK, r.dropsUntilTide, r.sector, r.ovenSector | 0);
      if (gain > 0) {
        r.dropsUntilTide += gain;
        r.ovenSector = r.sector;
        this.fx.text(this.renderer.w / 2, this.renderer.L.tideY - 36, `${perkName('warmOven', pageLook()).toUpperCase()} · TIDE +${gain}`, '#f4a259', 18, { dur: 2.0, vy: -22 });
        Svc.sfx('discover', { tier: 5 });
      }
    }

    // rising tide
    r.dropsUntilTide--;
    this.updateHud();
    if (r.dropsUntilTide <= 0) {
      const t = await this.doTide();
      if (tok !== this.token) return;
      if (t === 'overflow') { await this.handleLoss('tide'); return; }
    } else if (r.dropsUntilTide === 1) {
      this.fx.text(this.renderer.w / 2, this.renderer.L.tideY - 18, 'TIDE INCOMING', '#ff8aa0', 15, { dur: 1.1, vy: -20 });
    }
    }

    this.momentTick(); // Café moments: after the tide, before any new sector (C# Drop)

    if (await this.checkSectors(tok) === false) return;
    if (tok !== this.token) return;

    if (isBoardFull(r.board) && r.comets <= 0) { await this.handleLoss('full'); return; }
    this.flushMomentNote(); // a new ticket's toast waits until any sector perk card has closed
    this.syncVisuals();
    this.busy = false;
    this.saveRest();
    this.flushQueue();
  }

  squash(v) {
    v.sx = 1.22; v.sy = 0.8;
    this.tw.to(v, { sx: 1, sy: 1 }, 0.35, Ease.outElastic);
  }

  /** Screen geometry of a visual for per-skin piece effects: centre and piece radius (scale included). */
  pieceGeo() {
    const R = this.renderer;
    return {
      pos: (v) => [R.cellX(v.c) + (v.ox || 0), R.cellY(v.r) + (v.oy || 0)],
      rad: (v) => (R.L.cell / 2) * orbRadiusFactor(v.tier) * (v.s ?? 1),
    };
  }

  /**
   * A piece destroyed without merging (comet, Meteor Shower, supernova blast, revive clear). Skins with a popFx
   * hook (Koi: the water bubble bursts) take over the look and return the removal promise; null = default look.
   * dur is the caller's existing removal time, so timings never change.
   */
  skinPop(v, dur) {
    const pop = (skinFx(this.skin) || {}).popFx;
    if (!pop || !v || v.kind !== 'orb' || v.wild) return null;
    const g = this.pieceGeo();
    const [x, y] = g.pos(v);
    return pop({ fx: this.fx, tw: this.tw, v, x, y, r: (this.renderer.L.cell / 2) * orbRadiusFactor(v.tier), dur, reduced: !!this.fx.reduced, sfx: (n, p) => Svc.sfx(n, p) });
  }

  addVisual(o) {
    const v = { s: 1, sx: 1, sy: 1, a: 1, flash: 0, ox: 0, oy: 0, rot: 0, hp: 2, golden: false, wild: false, glaze: 0, crack: 0, ...o };
    this.visuals.set(v.id, v);
    return v;
  }

  /** Make visuals exactly match the board (snap). */
  syncVisuals(fresh = false) {
    const r = this.run;
    if (!r) return;
    const seen = new Set();
    const b = r.board;
    for (let row = 0; row < b.rows; row++) {
      for (let c = 0; c < b.cols; c++) {
        const x = getCell(b, row, c);
        if (!x) continue;
        seen.add(x.id);
        let v = this.visuals.get(x.id);
        if (!v) {
          v = this.addVisual({ id: x.id, kind: x.kind, tier: x.tier, hp: x.hp, golden: x.golden, c, r: row, s: fresh ? 1 : 0 });
          if (!fresh) this.tw.to(v, { s: 1 }, 0.2, Ease.outBack);
        }
        v.kind = x.kind; v.tier = x.tier; v.hp = x.hp; v.golden = !!x.golden; v.wild = !!x.wild; // wild = Steady Start joker
        if (x.glazed) { v.glaze = 1; v.crack = 0; } else if (!v.crack) v.glaze = 0; // sugar glaze (a crack anim finishes itself)
        if (Math.abs(v.c - c) > 0.001 || Math.abs(v.r - row) > 0.001) { v.c = c; v.r = row; }
        if (v.a < 1 && !this.tw.busy) v.a = 1;
      }
    }
    for (const id of [...this.visuals.keys()]) if (!seen.has(id)) this.visuals.delete(id);
  }

  addScore(pts, x, y) {
    const r = this.run;
    if (!pts) return;
    r.score += pts;
    const t = this.tally;
    if (t && !t.flying) { t.target += pts; t.bump = 1; }
    if (!r.passedBest && r.bestAtStart > 0 && r.score > r.bestAtStart) {
      r.passedBest = true;
      // during a chain the fanfare waits for the tally to land in the score
      if (t && !t.flying) t.newBest = true; else this.celebrateBest();
    }
    this.track('score', r.score);
    if (!t) this.hud.setBestProgress(r.score, r.bestAtStart, bestMode(r), this.ghostNow());
    void x; void y;
  }

  /** Where this tier's best run was after the same number of drops, or null (no curve, daily, autoplay). */
  ghostNow() {
    const r = this.run;
    if (!this.race || !r || r.mode !== 'endless' || r.daily || r.autoplay) return null;
    return ghostAt(this.race, r.drops);
  }

  celebrateBest() {
    this.fx.banner(this.run && this.run.friend ? tr('banner.ahead') : tr('banner.newBest'), '#ffd54a', '', { dur: 1.6, y: 0.22 });
    this.fx.burst(this.renderer.w / 2, 60, ['#ffd54a', '#fff2a8', '#ff9a3c'], 50, 360, 4, { gravity: 300 });
    Svc.sfx('newbest');
    Svc.haptic('success');
    this.hud.newBest();
  }

  // ---------------------------------------------------------------- chain tally (presentation)

  beginTally() {
    if (this.tally) this.finishTally(this.tally);
    this.tally = { target: 0, shown: 0, combo: 1, steps: 0, bump: 0, fp: 0, flying: false, newBest: false, crossSector: false, done: false, tx: 0, ty: 0 };
    return this.tally;
  }

  /**
   * Cascade over: the tally flies into the score. Resolves when it lands if the landing
   * crosses the best or a sector threshold (so the bass hit comes before the sector banner),
   * otherwise right away (play continues while it flies).
   */
  async landTally(t) {
    const r = this.run;
    if (!t || t !== this.tally || !r) return;
    const tok = this.token;
    const reduced = !!this.fx.reduced;
    t.shown = t.target;
    t.crossSector = r.mode === 'endless' && r.score >= this.sectorGoal(r.sector);
    const a = this.hud && this.hud.scoreAnchor ? this.hud.scoreAnchor() : null;
    t.tx = a ? a.x : this.renderer.w / 2;
    t.ty = a ? a.y : 30;
    const fly = (async () => {
      await this.tw.wait(reduced ? 0.12 : 0.22);
      if (tok !== this.token || t.done) return;
      t.flying = true;
      await this.tw.to(t, { fp: 1 }, reduced ? 0.2 : 0.34, Ease.inQuad);
      if (tok !== this.token) return;
      this.finishTally(t);
    })();
    if (t.newBest || t.crossSector) await fly;
  }

  finishTally(t) {
    if (!t || t.done) return;
    t.done = true;
    if (this.tally === t) this.tally = null;
    const r = this.run;
    if (!r) return;
    this.hud.setBestProgress(r.score, r.bestAtStart, bestMode(r), this.ghostNow());
    Svc.sfx('collect', { combo: t.combo });
    if (t.newBest) this.celebrateBest();
    if (t.newBest || t.crossSector) {
      // deeper "bass hit" + short flash when the chain pushes past your best or into a new sector
      Svc.sfx('bass', { soft: !!this.fx.reduced });
      this.fx.flash(t.newBest ? '#fff2a8' : '#bfe6ff', 0.32);
      this.fx.shake(6);
      Svc.haptic('heavy');
    }
  }

  track(type, value) {
    if (this.run && this.run.book) return; // Puzzle Books: no Today credit, no bounties
    this.bountySignal(type, value);
    if (this.run && (this.run.autoplay || this.run.zen || this.run.tutorial === 'practice')) return; // autoplay, Zen Drift and practice runs never count toward Daily Orbits
    try {
      const done = trackOrbit(this.save, type, value);
      for (const m of done) this.onOrbitComplete && this.onOrbitComplete(m);
    } catch (_) { /* ignore */ }
  }

  /** Redraw just the perk row (bounty chip). */
  refreshBountyChip() {
    const r = this.run;
    if (r && this.hud && this.hud.setPerks) this.hud.setPerks(r.owned, r.path || null, r.bounty || null, this.momentChip());
  }

  /** Sector bounties: feed a game signal to this sector's goal; a short toast when it completes. Rules only, no score. */
  bountySignal(type, value) {
    const r = this.run;
    if (!r || r.mode !== 'endless' || !r.bounty || r.ended) return;
    const prog = r.bounty.prog;
    const hit = trackBounty(r.bounty, type, value);
    // chip only: a full updateHud() mid-chain would jump the score / sector bars ahead of the chain tally
    if (hit || r.bounty.prog !== prog) this.refreshBountyChip();
    if (!hit) return;
    r.bountiesDone = (r.bountiesDone || 0) + 1;
    try {
      Svc.sfx('coin');
      Svc.haptic('light');
      if (this.ui.toast) this.ui.toast(`Bounty done: ${bountyText(r.bounty)} · +${BOUNTY_COINS} coins`);
    } catch (_) { /* ignore */ }
  }

  /**
   * Café moments: tick once per drop; rules live in moments.js. A new ticket's toast and chime are held
   * (momentNote) until the drop has finished, so they never sit behind a sector perk card (flushMomentNote).
   */
  momentTick() {
    const r = this.run;
    if (!r || !r.moments || r.ended) return;
    const what = tickMoment(r.moments, r.seed, r.drops, r.board, r.mods.gentle);
    if (!what) return;
    this.refreshBountyChip(); // a ticket that ran out simply goes away, with no message
    if (what === 'opened') this.momentNote = { seen: r.moments.seen };
    else this.momentNote = null;
  }

  /** The open ticket in words (its toast; tapping the HUD ticket says it again). '' when none is open. */
  momentText() {
    const r = this.run;
    const t = r && r.moments && r.moments.open;
    if (!t) return '';
    const left = momentDropsLeft(r.moments, r.drops);
    const w = left === momentWindow(t.tier) ? `within ${left} drops` : `in the next ${left} drop${left === 1 ? '' : 's'}`;
    return `A café order: make a ${tierName(t.tier, this.skin)} ${w} for ${MOMENT_COINS} coins. No rush.`;
  }

  /** Show a held "new café order" toast (4.5 s, like re-reading a rule), if that ticket is still open. */
  flushMomentNote() {
    const n = this.momentNote;
    this.momentNote = null;
    const r = this.run;
    if (!n || !r || r.ended || !r.moments || !r.moments.open || r.moments.seen !== n.seen) return;
    try {
      Svc.sfx('discover', { tier: 3 });
      if (this.ui.toast) this.ui.toast(this.momentText(), false, 4500);
    } catch (_) { /* ignore */ }
  }

  /** Tap on the HUD café ticket: say it again (4.5 s toast). */
  momentReread() {
    const text = this.momentText();
    if (text && this.ui.toast) this.ui.toast(text, false, 4500);
  }

  /** Café moments: after a resolution, the open ticket may have been filled (its piece was made; it stays on the board). */
  momentServe(steps) {
    const r = this.run;
    if (!r || !r.moments || r.ended || !serveMoment(r.moments, steps, r.drops)) return;
    this.refreshBountyChip();
    try {
      Svc.sfx('coin');
      Svc.haptic('light');
      if (this.ui.toast) this.ui.toast(`Café order served · +${MOMENT_COINS} coins`);
    } catch (_) { /* ignore */ }
  }

  /** HUD ticket for the open café moment: { tier, left } (drops left), or null. */
  momentChip() {
    const r = this.run;
    const m = r && r.moments;
    return m && m.open ? { tier: m.open.tier, left: momentDropsLeft(m, r.drops) } : null;
  }

  /** Board options for the next resolution: the run's perks plus the open Café Orders tickets (Journey) or café moment (Endless). */
  boardOpts() {
    const r = this.run;
    if (r.book) return null; // Puzzle Books: plain board rules, exactly as src/game/puzzles.js plays them
    if (r.mode === 'journey') return r.level && r.prog ? orderOpts(r.level, r.prog, r.mods.boardOpts) : r.mods.boardOpts;
    return momentOpts(r.moments, r.mods.boardOpts);
  }

  /** Motes from a merge to the HUD: the matching Journey goal chip, else the score. */
  flyToHud(x, y, m, col, combo) {
    const r = this.run;
    const h = this.hud;
    if (!h || !h.scoreAnchor) return;
    let target = null, goalIdx = -1;
    if (r.mode === 'journey') {
      r.level.goals.forEach((g, i) => {
        if (goalIdx < 0 && g.type === 'tier' && m.tier >= g.tier && r.prog[i] < g.count) goalIdx = i;
      });
      if (goalIdx >= 0) target = h.goalAnchor(goalIdx);
    }
    if (!target) target = h.scoreAnchor();
    if (!target) return;
    const n = 3 + Math.min(5, m.tier - 1) + (goalIdx >= 0 ? 2 : 0);
    this.fx.fly(x, y, target.x, target.y, [col, '#ffffff'], n, () => {
      Svc.sfx('collect', { combo });
      if (goalIdx >= 0) h.pulseGoal(goalIdx);
    });
  }

  /** Animate resolution steps from board.js. */
  /** Teapot deliveries: each teapot on the bottom row lifts away to its goal chip ("Delivered!"), then the pieces above
   *  settle. Presentation of res.preDelivered / step.delivered; instant under Calm / reduced motion. */
  async playDeliveries(list, gravity) {
    if (!list || !list.length) return;
    const tok = this.token;
    const r = this.run;
    const R = this.renderer;
    const gi = r.level ? r.level.goals.findIndex((g) => g.type === 'teapot') : -1;
    const target = gi >= 0 && this.hud && this.hud.goalAnchor ? this.hud.goalAnchor(gi) : null;
    for (const d of list) {
      const v = this.visuals.get(d.id);
      const x = R.cellX(d.c), y = R.cellY(d.r);
      if (v) {
        this.visuals.delete(d.id);
        this.visuals.set('delivered' + d.id, v);
        const done = () => this.visuals.delete('delivered' + d.id);
        if (this.fx.reduced) { v.a = 0; done(); } else this.tw.to(v, { r: d.r + 0.6, s: 0.75, a: 0 }, 0.38, Ease.inQuad).then(done);
      }
      this.fx.text(x, y - R.L.cell * 0.3, 'Teapot delivered!', '#ffffff', 17, { dur: 1.6, vy: -24 });
      if (target) this.fx.fly(x, y, target.x, target.y, ['#fff4e6', '#e59a9a'], 6, () => this.hud.pulseGoal(gi));
      Svc.sfx('collect', { combo: 1 });
      Svc.haptic('medium');
    }
    this.mechanicUsed('teapot');
    if (!this.fx.reduced) await this.tw.wait(0.3);
    if (tok !== this.token) return;
    const falls = [];
    for (const mv of gravity || []) {
      const v = this.visuals.get(mv.id);
      if (!v) continue;
      v.c = mv.c;
      if (this.fx.reduced) { v.r = mv.toR; continue; }
      falls.push(this.tw.to(v, { r: mv.toR }, 0.07 + Math.sqrt(mv.toR - mv.fromR) * 0.07, Ease.inQuad).then(() => this.squash(v)));
    }
    await Promise.all(falls);
  }

  /** res (optional): the whole resolve result, for teapots delivered before the first step. */
  async playSteps(steps, res = null) {
    const tok = this.token;
    const r = this.run;
    const R = this.renderer;
    if (res && res.preDelivered && res.preDelivered.length) {
      await this.playDeliveries(res.preDelivered, res.preGravity);
      if (tok !== this.token) return;
    }
    if (!steps || !steps.length) return;
    const scoreBefore = r.score;
    // a real cascade (2+ steps) gets the running tally; single merges keep the classic pop
    const tally = steps.length >= 2 ? this.beginTally() : null;
    // musical scoring: each cascade step plays the next note of a major scale, starting a
    // little higher for bigger first merges so the tier still has a voice
    const firstTier = Math.max(1, ...steps[0].merges.map((m) => m.tier));
    const noteBase = Math.max(0, Math.min(4, Math.floor((firstTier - 1) / 2)));
    let chainCombo = 1;
    for (let si = 0; si < steps.length; si++) {
      const step = steps[si];
      const combo = step.combo;
      chainCombo = Math.max(chainCombo, combo);
      const maxTierBefore = r.maxTier; // for the Keeper's "new highest orb" surprise (presentation only)
      if (tally) { tally.combo = combo; tally.steps = si + 1; }
      // --- merges: members slide into the anchor
      const slides = [];
      const mfx = (skinFx(this.skin) || {}).mergeFx; // per-skin look (Koi: water drops coalesce); timing unchanged
      for (const m of step.merges) {
        const members = [];
        for (const cell of m.cells) {
          const v = this.visuals.get(cell.id);
          if (!v) continue;
          const isAnchor = cell.r === m.anchor.r && cell.c === m.anchor.c;
          const to = mfx ? mfx.target(isAnchor, !!this.fx.reduced) : { s: isAnchor ? 1.08 : 0.55, a: isAnchor ? 1 : 0.6 };
          slides.push(this.tw.to(v, { c: m.anchor.c, r: m.anchor.r, s: to.s, a: to.a }, 0.13, Ease.inQuad));
          members.push({ v, anchor: isAnchor });
        }
        if (mfx) mfx.slide({ fx: this.fx, tw: this.tw, members, geo: this.pieceGeo(), dur: 0.13, reduced: !!this.fx.reduced, tier: m.tier - 1 });
      }
      await Promise.all(slides);
      if (tok !== this.token) return;

      for (const m of step.merges) {
        for (const cell of m.cells) this.visuals.delete(cell.id);
        const nv = this.addVisual({ id: m.id, kind: 'orb', tier: m.tier, c: m.anchor.c, r: m.anchor.r, s: 0.5, flash: 1 });
        const x = R.cellX(m.anchor.c), y = R.cellY(m.anchor.r);
        if (mfx) mfx.form(nv, { fx: this.fx, tw: this.tw, x, y, r: (R.L.cell / 2) * orbRadiusFactor(m.tier), reduced: !!this.fx.reduced });
        else {
          this.tw.to(nv, { s: 1 }, 0.3, Ease.outBack);
          this.tw.to(nv, { flash: 0 }, 0.28, Ease.outQuad);
        }
        const col = tierColor(m.tier, this.skin);
        // success-graded juice: an ordinary merge stays light; big tiers, chains and groups earn more
        const j = mergeJuice({ tier: m.tier, combo, size: m.size });
        emitMerge(this.fx, this.fxSkin, { x, y, col, j, tier: m.tier, cell: R.L.cell }); // combo skin (src/game/fxSkins.js)
        const label = '+' + m.points.toLocaleString('en-US'); // no ★ on a golden merge: ★ is only the café star (UX_STARS.md)
        this.fx.text(x, y - R.L.cell * 0.2, label, m.golden ? '#ffd54a' : '#ffffff', Math.min(32, 17 + m.tier + combo * 2));
        // friendly call-outs: big multi-orb merges, otherwise the new orb's name from Moon up
        const big = m.size >= 5 ? 'MEGA MERGE!' : m.size === 4 ? 'QUAD MERGE!' : m.size === 3 ? 'TRIPLE!' : '';
        if (big) {
          this.fx.text(x, y + R.L.cell * 0.45, big, '#ffd54a', 17, { dur: 1.0, vy: -30, flair: true });
        } else if (m.tier >= 4 && m.tier < SUPERNOVA_TIER) {
          this.fx.text(x, y + R.L.cell * 0.45, tierName(m.tier, this.skin).toUpperCase(), col, 15, { dur: 0.9, vy: -30, flair: true });
        }
        this.flyToHud(x, y, m, col, combo);
        this.addScore(m.points);
        Svc.sfx('merge', { tier: m.tier, combo, note: noteBase + si });
        const heavy = m.tier >= 5 || m.size >= 3;
        if (heavy) Svc.sfx('impact', { tier: Math.max(m.tier, 4 + m.size) });
        Svc.haptic(j.haptic);
        if (j.shake) this.fx.shake(j.shake);
        if (j.hitStop) this.fx.hitStop(j.hitStop);
        if (m.tier >= 2 && !r.book) { try { this.onTierMade && this.onTierMade(m.tier); } catch (_) { /* ignore */ } } // books: no discovery coins
        r.merges++;
        r.maxTier = Math.max(r.maxTier, m.tier);
        this.track('tier', m.tier);
      }
      this.track('merges', step.merges.length);
      // presentation hook (living Star Keeper reacts to each cascade step), never rules
      if (this.onMergeStep) {
        let top = null;
        for (const m of step.merges) if (!top || m.tier > top.tier || (m.tier === top.tier && m.size > top.size)) top = m;
        const supernova = step.supernovas.length > 0;
        const ax = top ? R.cellX(top.anchor.c) : supernova ? R.cellX(step.supernovas[0].c) : 0;
        const ay = top ? R.cellY(top.anchor.r) : supernova ? R.cellY(step.supernovas[0].r) : 0;
        const tier = top ? top.tier : 0;
        try {
          this.onMergeStep({ step: si + 1, combo, tier, size: top ? top.size : 0, newHigh: tier > maxTierBefore && maxTierBefore > 0, supernova, x: ax, y: ay });
        } catch (_) { /* ignore */ }
      }
      r.maxCombo = Math.max(r.maxCombo, combo);
      this.track('combo', combo);
      if (combo >= 2 && !step.supernovas.length) {
        const name = comboName(combo);
        const colors = ['#9fd8ff', '#9fd8ff', '#7cffb2', '#ffd54a', '#ff6ad5', '#ff8a5c', '#ff4fd8'];
        this.fx.banner(tr('banner.comboLine', { name, n: combo }), colors[Math.min(6, combo)], combo === 2 ? tr('banner.chainReaction') : '', { dur: 0.95, size: 0.72 + Math.min(0.45, combo * 0.07), style: chainBannerStyle(this.fxSkin) });
        Svc.sfx('combo', { combo });
        if (combo >= 4) Svc.haptic('heavy');
      }

      // --- asteroid cracks
      for (const ck of step.cracks) {
        const v = this.visuals.get(ck.id);
        const x = R.cellX(ck.c), y = R.cellY(ck.r);
        this.fx.burst(x, y, ['#9aa0b4', '#c9cfdf', '#6d7282'], ck.broken ? 26 : 10, ck.broken ? 200 : 120, 3, { type: 'dot' });
        if (v) {
          v.hp = ck.hp;
          this.tw.run(0.25, (p) => { v.ox = Math.sin(p * Math.PI * 6) * 4 * (1 - p); });
          if (ck.broken) {
            v.kind = 'orb'; v.tier = 1; v.s = 0.4; v.flash = 1;
            this.tw.to(v, { s: 1, flash: 0 }, 0.3, Ease.outBack);
          }
        }
        if (ck.broken) {
          r.asteroids++;
          this.track('asteroids', 1);
          if (ck.bonus) { this.fx.text(x, y, '+' + ck.bonus, '#d6dcff', 16); this.addScore(ck.bonus); }
          Svc.haptic('medium');
        }
      }

      // --- supernovas
      for (const sn of step.supernovas) {
        const x = R.cellX(sn.c), y = R.cellY(sn.r);
        this.fx.flash('#ffe6ff', 0.75);
        this.fx.shake(22);
        this.fx.hitStop(0.12);
        this.fx.glow(x, y, '#ff9cf0', R.L.cell * (sn.radius + 2), 0.7, 0.7);
        this.fx.banner(tr('banner.supernova'), '#ff4fd8', `+${sn.points.toLocaleString('en-US')}`, { dur: 1.6, size: 1 });
        this.fx.burst(x, y, ['#ffffff', '#ff4fd8', '#7ad7ff', '#ffd54a'], 120, 520, 5, { life: 1.1, gravity: 120 });
        this.fx.ring(x, y, '#ffffff', R.L.cell * (sn.radius + 1.5) * 1.4, 0.6, 10);
        this.fx.ring(x, y, '#ff4fd8', R.L.cell * (sn.radius + 1.5) * 2.2, 0.9, 6);
        Svc.sfx('supernova');
        Svc.haptic('heavy');
        for (const cl of sn.cleared) {
          const v = this.visuals.get(cl.id);
          if (!v) continue;
          (this.skinPop(v, 0.3) || this.tw.to(v, { s: 1.5, a: 0, flash: 1 }, 0.3, Ease.outQuad)).then(() => this.visuals.delete(cl.id));
          this.fx.burst(R.cellX(cl.c), R.cellY(cl.r), tierColor(cl.tier || 1, this.skin), 10, 260, 3);
        }
        this.addScore(sn.points);
        r.supernovas++;
        this.track('supernova', 1);
        const rocks = sn.cleared.filter((cl) => cl.kind === 'asteroid').length;
        if (rocks) this.bountySignal('asteroids', rocks); // Sector bounties: a Supernova clears asteroids too
      }
      // --- sugar glaze cracked by a merge next to it (instant under Calm / reduced motion)
      for (const gz of step.glazes || []) {
        const v = this.visuals.get(gz.id);
        const x = R.cellX(gz.c), y = R.cellY(gz.r);
        if (v) {
          if (this.fx.reduced) { v.glaze = 0; v.crack = 0; } else {
            v.crack = 0.001;
            this.tw.to(v, { crack: 1 }, 0.42, Ease.outQuad).then(() => { v.glaze = 0; v.crack = 0; });
          }
        }
        if (!this.fx.reduced) this.fx.burst(x, y - R.L.cell * 0.2, ['#ffffff', '#e6eefc', '#bcd4f2'], 12, 150, 3, { type: 'dot' });
        Svc.sfx('bubble', { tier: gz.tier }); // a soft sugary tick
        Svc.haptic('light');
      }
      if (step.glazes && step.glazes.length) this.mechanicUsed('glaze');
      // --- cookie tins tapped by a merge next to them (one dot each); an opened tin pops into its treat
      for (const tn of step.tins || []) {
        const v = this.visuals.get(tn.id);
        const x = R.cellX(tn.c), y = R.cellY(tn.r);
        if (v) {
          v.hp = tn.hp;
          if (!this.fx.reduced) this.tw.run(0.22, (p) => { v.ox = Math.sin(p * Math.PI * 5) * 3 * (1 - p); });
          if (tn.opened) {
            v.kind = 'orb'; v.tier = tn.tier;
            if (this.fx.reduced) { v.s = 1; v.flash = 0; } else {
              v.s = 0.5; v.flash = 1;
              this.tw.to(v, { s: 1, flash: 0 }, 0.3, Ease.outBack);
            }
          }
        }
        if (tn.opened) {
          if (!this.fx.reduced) this.fx.burst(x, y, ['#e8b878', '#fbefdc', '#a9c6e6'], 16, 170, 3, { type: 'dot' });
          // Calm: no burst or pop, just a still cream ring around the cell that fades (opacity only, docs/UX_TINS.md T5)
          else this.fx.ring(x, y, 'rgba(255,236,200,0.95)', R.L.cell * 0.5, 0.8, 3, { still: true });
          // says what came out, same size and time as "Order served!" / "Teapot delivered!" (docs/UX_TINS.md T4)
          this.fx.text(x, y - R.L.cell * 0.3, tinTreatText(tn.tier, this.skin), '#ffffff', 17, { dur: 1.6, vy: -24 });
          Svc.sfx('collect', { combo });
          Svc.haptic('medium');
        } else {
          Svc.sfx('bubble', { tier: 2 }); // a soft tin tap
          Svc.haptic('light');
        }
      }
      // the rule box stays until a tin actually opens (a single tap hasn't shown the player what tins do yet)
      if (step.tins && step.tins.some((tn) => tn.opened)) this.mechanicUsed('tin');
      // --- Café Orders served: the piece lifts off the board towards its ticket
      for (const sv of step.served || []) {
        const v = this.visuals.get(sv.id);
        const x = R.cellX(sv.c), y = R.cellY(sv.r);
        const gi = r.level ? r.level.goals.findIndex((g, i) => g.type === 'order' && g.tier === sv.tier && r.prog[i] < g.count) : -1;
        const target = gi >= 0 && this.hud && this.hud.goalAnchor ? this.hud.goalAnchor(gi) : null;
        if (v) {
          this.visuals.delete(sv.id);
          this.visuals.set('served' + sv.id, v);
          const done = () => this.visuals.delete('served' + sv.id);
          if (this.fx.reduced) this.tw.to(v, { a: 0 }, 0.2, Ease.outQuad).then(done);
          else this.tw.to(v, { r: sv.r - 0.9, s: 0.7, a: 0 }, 0.4, Ease.inQuad).then(done);
        }
        this.fx.text(x, y - R.L.cell * 0.3, 'Order served!', '#ffffff', 17, { dur: 1.6, vy: -24 });
        this.mechanicUsed('orders');
        if (target) this.fx.fly(x, y, target.x, target.y, [tierColor(sv.tier, this.skin), '#ffffff'], 6, () => this.hud.pulseGoal(gi));
        Svc.sfx('collect', { combo });
        Svc.haptic('medium');
      }
      if (step.supernovas.length) await this.tw.wait(0.38);
      else await this.tw.wait((step.served && step.served.length) || ((step.glazes && step.glazes.length) || (step.tins && step.tins.some((tn) => tn.opened))) && !this.fx.reduced ? 0.3 : 0.13);
      if (tok !== this.token) return;

      // --- gravity
      if (step.gravity.length) {
        const falls = [];
        for (const mv of step.gravity) {
          const v = this.visuals.get(mv.id);
          if (!v) continue;
          v.c = mv.c;
          const d = mv.toR - mv.fromR;
          if (v.kind === 'teapot' && d > 0) this.mechanicUsed('teapot');
          falls.push(this.tw.to(v, { r: mv.toR }, 0.07 + Math.sqrt(d) * 0.07, Ease.inQuad).then(() => this.squash(v)));
        }
        await Promise.all(falls);
        if (tok !== this.token) return;
      }
      // --- teapots that reached the bottom row this step (Teapot deliveries)
      if (step.delivered && step.delivered.length) {
        await this.playDeliveries(step.delivered, step.deliverGravity);
        if (tok !== this.token) return;
      }
      // small beat between cascade steps so chains read clearly
      if (si < steps.length - 1) await this.tw.wait(0.07);
      if (tok !== this.token) return;
    }
    // run stat: best chain = the largest tally (points this resolution actually awarded)
    const gained = r.score - scoreBefore;
    if (gained > r.bestChain.points) r.bestChain = { points: gained, combo: chainCombo };
    this.bountySignal('chain', gained); // Sector bounties: points one resolution awarded
    this.momentServe(steps); // Café moments: the ticket's piece was served (C# PlaySteps)
    // presentation hook (Star Keeper cheer), never rules
    try { this.onChain && this.onChain(steps.length, gained); } catch (_) { /* ignore */ }
    if (tally) await this.landTally(tally);
  }

  async doTide() {
    const r = this.run;
    const tok = this.token;
    const res = r.mode === 'journey'
      ? pushRow(r.board, r.tideRng, { sector: 1 + Math.floor(r.level.n / 10), maxSpawn: 3 })
      : pushRow(r.board, r.tideRng, { sector: r.sector, maxSpawn: maxSpawnTier(r.board, r.mods.gentle) });
    if (res.overflow) return 'overflow';
    Svc.sfx('tide');
    Svc.haptic('medium');
    this.fx.shake(5);
    const moves = [];
    for (const mv of res.moves) {
      const v = this.visuals.get(mv.id);
      if (v) moves.push(this.tw.to(v, { r: mv.toR }, 0.34, Ease.outCubic));
    }
    for (const cell of res.inserted) {
      const v = this.addVisual({ id: cell.id, kind: cell.kind, tier: cell.tier, hp: cell.hp, c: cell.c, r: cell.r + 1 });
      moves.push(this.tw.to(v, { r: cell.r }, 0.34, Ease.outCubic));
    }
    const R = this.renderer;
    for (let c = 0; c < 5; c++) this.fx.burst(R.cellX(c), R.L.by + R.L.bh, ['#5ce1e6', '#7fa8ff'], 5, 90, 2.5, { gravity: -60 });
    await Promise.all(moves);
    if (tok !== this.token) return 'cancel';
    r.tideK = r.mode === 'journey' ? r.level.tide : tideInterval(r.sector, r.mods.slowTide, r.challenge);
    r.dropsUntilTide = r.tideK;
    this.updateHud();
    const rr = resolve(r.board, [], this.boardOpts());
    if (rr.steps.length || (rr.preDelivered && rr.preDelivered.length)) { await this.playSteps(rr.steps, rr); this.trackJourney(rr); }
    return 'ok';
  }

  // ================================================================ sectors & perks

  async checkSectors(tok) {
    const r = this.run;
    while (r.score >= this.sectorGoal(r.sector)) {
      r.sector++;
      if (r.bounty) openSectorBounty(r); // Sector bounties: the old goal closes (done or not), a new one opens
      this.track('sector', r.sector);
      if (this.onSector) this.onSector(r.sector); // presentation hook (nebula shift), never rules
      this.updateHud();
      this.fx.banner(tr('banner.sector', { n: r.sector }), '#9fd8ff', tr('banner.choosePerk'), { dur: 1.1, size: 0.9 });
      Svc.sfx('perk');
      // Resonance (Paths): once it is on, every new sector pulses once, before the perk offer
      if (resonanceActive(r.path, r.owned)) this.resonate(false);
      await this.tw.wait(0.6);
      if (tok !== this.token) return false;
      // Morning Tidy (Solar Wind): every tier-1 piece lifts away, then gravity and the normal cascade (C# ContinueSectors)
      if (r.mods.morningTidy && !r.ended) {
        await this.morningTidy();
        if (tok !== this.token) return false;
      }
      await this.offerPerk(`Sector ${r.sector} reached`);
      if (tok !== this.token) return false;
    }
    return true;
  }

  /** Morning Tidy: lift every tier-1 piece (sweepTier), animate it like a gentle comet, then play the cascade. */
  async morningTidy() {
    const r = this.run;
    const tok = this.token;
    const res = sweepTier(r.board, TIDY_TIER, this.boardOpts());
    if (!res.ok) return;
    const R = this.renderer;
    this.fx.text(R.w / 2, R.L.tideY - 36, perkName('morningTidy', pageLook()).toUpperCase(), '#8fd3c1', 18, { dur: 2.0, vy: -22 });
    Svc.sfx('perk');
    for (const cl of res.cleared) {
      const cv = this.visuals.get(cl.id);
      this.fx.burst(R.cellX(cl.c), R.cellY(cl.r), ['#8fd3c1', '#ffffff'], 8, 120, 3, { gravity: -40, life: 0.5 });
      if (cv) this.skinPop(cv, 0.18) || this.tw.to(cv, { s: 0.2, a: 0 }, 0.18, Ease.outQuad);
    }
    await this.tw.wait(0.2);
    if (tok !== this.token) return;
    for (const cl of res.cleared) this.visuals.delete(cl.id);
    const falls = [];
    for (const mv of res.gravity) {
      const fv = this.visuals.get(mv.id);
      if (fv) falls.push(this.tw.to(fv, { r: mv.toR }, 0.07 + Math.sqrt(mv.toR - mv.fromR) * 0.07, Ease.inQuad).then(() => this.squash(fv)));
    }
    await Promise.all(falls);
    if (tok !== this.token) return;
    await this.playSteps(res.steps, res);
    if (tok !== this.token) return;
    this.updateHud();
  }

  async offerPerk(title) {
    const r = this.run;
    const zen = !!r.zen;
    let offer = offerPerks(r.perkRng, r.owned, 3, [], r.path, zen);
    if (!offer.length) return;
    let choice = null;
    try {
      choice = await this.ui.showPerkPick({
        title,
        sector: r.sector,
        offer,
        owned: r.owned,
        path: r.path || null,
        zen,
        // Zen Drift shows no ads at all, so there is no ad-paid reroll there
        reroll: zen ? null : async () => {
          const ok = await Svc.showRewarded('reroll');
          if (!ok) return null;
          offer = offerPerks(r.perkRng, r.owned, 3, offer, r.path);
          return offer;
        },
      });
    } catch (_) { choice = null; }
    if (!choice || !this.run || r !== this.run) return;
    this.applyPerk(choice);
  }

  applyPerk(id) {
    const r = this.run;
    const p = PERK_BY_ID[id];
    if (!p) return;
    const wasResonant = resonanceActive(r.path, r.owned);
    r.owned[id] = (r.owned[id] || 0) + 1;
    this.refreshMods();
    if (id === 'comet' || id === 'meteorShower') r.comets += 2;
    if (id === 'wild') {
      let n = 2;
      for (const o of [r.current, r.next]) if (o && !o.wild && n > 0) { o.wild = true; n--; }
      r.wildPending += n;
    }
    if (id === 'slowTide') {
      r.tideK = tideInterval(r.sector, r.mods.slowTide, r.challenge);
      r.dropsUntilTide += 3;
    }
    Svc.sfx('perk');
    Svc.haptic('success');
    this.fx.burst(this.renderer.w / 2, this.renderer.L.aimY, [p.color, '#ffffff'], 40, 280, 4);
    if (p.evolution) {
      // Constellation formed: bigger celebration
      const R = this.renderer;
      this.fx.banner(tr('banner.constellation'), '#ffd54a', perkName(p.id, pageLook()), { dur: 2.0, size: 0.95 });
      this.fx.flash('#fff2c4', 0.4);
      this.fx.shake(6);
      this.fx.burst(R.w / 2, R.h * 0.4, ['#ffd54a', '#ffffff', p.color, '#fff2a8'], 90, 420, 4, { life: 1.1, gravity: 80 });
      this.fx.ring(R.w / 2, R.h * 0.4, '#ffd54a', R.w * 0.45, 0.8, 6);
      Svc.sfx('newbest');
      Svc.haptic('heavy');
    }
    // Resonance (Paths): the pick that brings your Path to 3 stacks pulses once right away
    if (!wasResonant && resonanceActive(r.path, r.owned)) this.resonate(true);
    this.updateHud();
  }

  /**
   * One Resonance pulse (rules: perks.js resonancePulse; C# GameSession.Resonate). Gravity +1 comet,
   * Fusion one wild orb (current, else next, else the next spawn), Tide pushes the tide back 2 drops
   * (never past the full interval). No rng, score or board change. first = Resonance just lit up.
   */
  resonate(first) {
    const r = this.run;
    if (!r || r.mode !== 'endless' || !r.path) return;
    const g = resonancePulse(r.path, r.tideK, r.dropsUntilTide);
    r.comets += g.comets;
    if (g.wild) {
      let n = g.wild;
      for (const o of [r.current, r.next]) if (o && !o.wild && n > 0) { o.wild = true; n--; }
      r.wildPending += n;
    }
    r.dropsUntilTide += g.tide;
    const P = PATH_BY_ID[r.path];
    const what = g.comets ? tr('banner.res.comet') : g.wild ? tr('banner.res.wild') : g.tide ? tr('banner.res.tide', { n: g.tide }) : tr('banner.res.full');
    if (this.renderer && this.renderer.L) {
      this.fx.banner(first ? tr('banner.resonanceFirst') : tr('banner.resonance'), P.color, `${P.name} · ${what}`, { dur: first ? 1.8 : 1.1, size: first ? 0.85 : 0.7 });
      this.fx.burst(this.renderer.w / 2, this.renderer.L.aimY, [P.color, '#ffffff'], first ? 50 : 24, 260, 3);
    }
    Svc.haptic(first ? 'medium' : 'light');
    this.updateHud();
  }

  // ================================================================ hold & comet

  useHold() {
    const r = this.run;
    if (!this.canAct() || !r.owned.hold || r.holdUsed) return;
    if (!r.hold) {
      r.hold = r.current;
      r.current = r.next;
      r.next = this.spawn();
    } else {
      const t = r.hold; r.hold = r.current; r.current = t;
    }
    r.holdUsed = true;
    this.aim.s = 0.4;
    this.tw.to(this.aim, { s: 1 }, 0.3, Ease.outBack);
    Svc.sfx('ui');
    Svc.haptic('light');
    this.updateHud();
    // mid-drop (hold works while a drop resolves) the pre-move snapshot with its pending move must stand
    if (!this.busy) this.saveRest();
  }

  setCometMode(on) {
    const r = this.run;
    if (!this.canAct()) return;
    if (r.mode === 'journey') { this.useBooster('comet'); return; }
    if (on && (r.comets <= 0 || this.busy)) return;
    this.cometMode = !!on;
    this.targetMode = on ? 'comet' : null;
    Svc.sfx('ui');
    this.updateHud();
  }

  setTargetMode(m) {
    this.targetMode = m;
    this.cometMode = m === 'comet';
    this.updateHud();
  }

  // ---------------------------------------------------------------- journey boosters
  /** Tap on a booster button (journey). Offers to buy one first if the player has none. */
  async useBooster(id) {
    const r = this.run;
    if (!this.canAct() || r.mode !== 'journey') return;
    if (r.nebula) { this.ui.toast && this.ui.toast('No boosters in the Daily Nebula: same puzzle for everyone'); return; }
    if (!this.boosterUnlocked(id)) {
      this.ui.toast && this.ui.toast(`Unlocks at level ${BOOSTER_UNLOCKS[id]}`);
      return;
    }
    if (this.targetMode === id) { this.setTargetMode(null); Svc.sfx('ui'); return; }
    if (this.busy) return;
    const b = this.save.boosters;
    if ((b[id] || 0) <= 0) {
      let bought = false;
      try { bought = await (this.ui.offerBoosterPurchase && this.ui.offerBoosterPurchase(id)); } catch (_) { bought = false; }
      if (!bought || !this.canAct()) return;
      this.updateHud();
    }
    Svc.sfx('ui');
    Svc.haptic('light');
    if (id === 'wild') {
      if (r.current.wild) { this.ui.toast && this.ui.toast('Your orb is already wild!'); return; }
      b.wild--;
      r.boosterUsed = true;
      r.undo = null; // undo only ever takes back a drop
      r.current = { ...r.current, wild: true };
      this.aim.s = 0.4;
      this.tw.to(this.aim, { s: 1 }, 0.35, Ease.outBack);
      this.fx.burst(this.renderer.w / 2, this.renderer.L.aimY, ['#ff6ad5', '#7ad7ff', '#ffd54a'], 30, 220, 3);
      this.persist && this.persist();
      this.updateHud();
      if (!this.busy) this.saveRest();
      return;
    }
    this.setTargetMode(id);
  }

  /** `replay`: re-running a shuffle that was already paid for before a reload (no second charge). */
  async useShuffle(col, replay = false) {
    const r = this.run;
    if (this.busy || (!replay && (this.save.boosters.shuffle || 0) <= 0)) return;
    if (!replay) this.saveRest({ type: 'shuffle', col });
    this.busy = true;
    this.targetMode = null;
    const tok = this.token;
    const res = shuffleColumn(r.board, col, r.shuffleRng, this.boardOpts());
    if (!res.ok) {
      this.busy = false;
      this.updateHud();
      this.saveRest();
      this.ui.toast && this.ui.toast('Pick a column with at least 2 orbs');
      return;
    }
    if (!replay) { this.save.boosters.shuffle--; this.persist && this.persist(); }
    r.boosterUsed = true;
    r.undo = null; // undo only ever takes back a drop
    this.updateHud();
    Svc.sfx('tide');
    Svc.haptic('medium');
    const R = this.renderer;
    this.fx.burst(R.cellX(col), R.L.by + R.L.bh / 2, ['#5ce1e6', '#ffffff'], 30, 200, 3);
    const moves = [];
    for (const mv of res.moves) {
      const v = this.visuals.get(mv.id);
      if (!v) continue;
      const side = (mv.fromR % 2 ? 1 : -1) * 0.45;
      moves.push(this.tw.run(0.32, (p) => {
        v.r = mv.fromR + (mv.toR - mv.fromR) * Ease.inOutQuad(p);
        v.c = col + Math.sin(p * Math.PI) * side;
      }).then(() => { v.c = col; v.r = mv.toR; }));
    }
    await Promise.all(moves);
    if (tok !== this.token) return;
    await this.playSteps(res.steps, res);
    if (tok !== this.token) return;
    await this.afterJourneyAction(res, false);
  }

  // ---------------------------------------------------------------- journey flow
  /** After any resolved action in a level: progress, drop count, tide, win/fail. */
  async afterJourneyAction(res, consumedDrop) {
    const r = this.run;
    const tok = this.token;
    const lv = r.level;
    this.trackJourney(res);
    if (consumedDrop) {
      r.dropsLeft--;
      if (r.dropLog) r.dropLog.push(res.maxTier || 0); // presentation only (Daily Nebula share grid)
      // Second cup (DESIGN): this drop's own cascade reached x4 -> +1 drop, at most 2 per level, Journey only
      if (secondCupOn(lv) && secondCupGain(res.steps.length, r.secondCups || 0)) {
        r.secondCups = (r.secondCups || 0) + 1;
        r.dropsLeft++;
        this.showSecondCup();
      }
      if (lv.tide) {
        r.dropsUntilTide--;
        if (r.dropsUntilTide <= 0 && !goalsMet(lv, r.prog)) {
          const t = await this.doTide();
          if (tok !== this.token) return;
          if (t === 'overflow') { this.updateHud(); await this.journeyFail('tide'); return; }
        }
      }
    }
    this.updateHud();
    if (goalsMet(lv, r.prog)) { await this.journeyWin(); return; }
    if (r.tutorial && (r.dropsLeft <= 0 || isBoardFull(r.board))) { await this.tutorialTopUp(); return; }
    if (r.dropsLeft <= 0) { await this.journeyFail('drops'); return; }
    if (isBoardFull(r.board) && (r.nebula || (this.save.boosters.comet || 0) <= 0)) { await this.journeyFail('full'); return; }
    if (consumedDrop && r.dropsLeft === 3) this.fx.text(this.renderer.w / 2, this.renderer.L.aimY, '3 DROPS LEFT', '#ffb347', 18, { dur: 1.2, vy: -20 });
    this.syncVisuals();
    this.busy = false;
    this.saveRest();
    this.flushQueue();
  }

  /** Second cup presentation (the rule itself is in afterJourneyAction): cup note by the drops counter, soft chime, light haptic. */
  showSecondCup() {
    const r = this.run;
    if (!r) return;
    this.hud.setDrops(r.dropsLeft, r.level.drops); // ticks +1 now (updateHud follows)
    try { this.hud.secondCup(!!this.fx.reduced); } catch (_) { /* presentation only */ }
    Svc.sfx('cup');
    Svc.haptic('light');
    try { this.onSecondCup && this.onSecondCup(r.secondCups); } catch (_) { /* ignore */ }
    // the note waits for the chain banner to finish, so the two never compete (docs/UX_MECHANICS.md P4)
    const s = this.save;
    const first = !!s && !r.autoplay && !(s.mechSeen && s.mechSeen.secondCup);
    if (first) { s.mechSeen = s.mechSeen || {}; s.mechSeen.secondCup = true; this.persist && this.persist(); }
    const tok = this.token;
    const left = this.fx.reduced ? 0 : Number(this.fx.bannerLeft && this.fx.bannerLeft()) || 0;
    const show = () => {
      if (tok !== this.token || !this.run || this.run.ended) return; // never over the win / fail banner
      try { this.ui && this.ui.secondCupNote && this.ui.secondCupNote({ first }); } catch (_) { /* presentation only */ }
    };
    if (left > 0.02) this.tw.wait(left).then(show); else show();
  }

  /** Presentation hook: the player just used this level's new mechanic ('orders' | 'glaze' | 'teapot'). */
  mechanicUsed(kind) {
    try { this.onMechanic && this.onMechanic(kind); } catch (_) { /* ignore */ }
  }

  trackJourney(res) {
    const r = this.run;
    if (!r || r.mode !== 'journey' || !res) return;
    const before = r.prog.slice();
    applyProgress(r.level, r.prog, res, r.score);
    r.prog.forEach((v, i) => {
      if (v > before[i]) {
        this.hud.pulseGoal(i, v >= r.level.goals[i].count);
        if (v >= r.level.goals[i].count && before[i] < r.level.goals[i].count) {
          Svc.sfx('coin');
          Svc.haptic('success');
        }
      }
    });
  }

  async journeyWin() {
    const r = this.run;
    const tok = this.token;
    r.ended = true;
    this.state = 'over';
    this.busy = true;
    const lv = r.level;
    const stars = starsFor(lv, r.dropsLeft);
    try { this.hud.hideHint && this.hud.hideHint(); } catch (_) { /* presentation only */ }
    // café looks: the finish word under the banner (★ is only the café star, UX_STARS.md); Cosmic keeps its stars
    this.fx.banner(tr('banner.levelComplete'), '#7cffb2', pageLook() === 'cosmic' ? '★'.repeat(stars) : finishWord(stars).toUpperCase(), { dur: WIN_BANNER_DUR, size: 0.8 });
    // fanfare scales with the stars actually earned (1 star = one modest burst, 3 = the full show)
    const wj = winJuice(stars);
    if (wj.flash) this.fx.flash('#d8ffe8', wj.flash);
    Svc.sfx(wj.sfx);
    Svc.haptic('success');
    const R = this.renderer;
    for (let i = 0; i < wj.bursts; i++) {
      const x = wj.bursts === 1 ? 0.5 : 0.15 + i * (0.7 / (wj.bursts - 1));
      this.fx.burst(R.w * x, R.h * 0.35, ['#7cffb2', '#ffd54a', '#ff6ad5', '#7ad7ff'], wj.perBurst, 320, 4, { up: 120 });
    }
    let i = 0;
    for (const v of this.visuals.values()) {
      this.tw.to(v, { flash: 0.8 }, 0.12, Ease.outQuad, 0.02 * i).then(() => this.tw.to(v, { flash: 0 }, 0.3));
      i++;
    }
    // "Closing time" (src/game/closing.js): stars are already decided above from the drops left; the spare drops
    // now pop one by one for an openly shown bonus. The rule result is fixed here; the show can be skipped.
    const closing = closingBonus(lv, r.dropsLeft);
    // the show starts once "LEVEL COMPLETE!" has gone (docs/UX_MECHANICS.md P5); a tap already skips while waiting.
    // Calm / reduced motion: no added time.
    const pre = closing.drops && !this.fx.reduced ? { skip: false } : null;
    if (pre) {
      this.closing = pre;
      for (let t = 0; t < WIN_BANNER_DUR - 1e-6 && !pre.skip; t += 0.1) {
        await this.tw.wait(Math.min(0.1, WIN_BANNER_DUR - t));
        if (tok !== this.token) return;
      }
    } else await this.tw.wait(closing.drops ? 1.0 : 1.4);
    if (tok !== this.token) return;
    if (closing.drops) {
      const base = r.score;
      await this.playClosing(closing, tok, pre);
      if (tok !== this.token) return;
      r.score = base + closing.score; // exactly the announced bonus, whether the show played, was skipped or was instant
    }
    const save = this.save;
    save.journey = save.journey || { level: 1, stars: {} };
    const prevStars = save.journey.stars[lv.n] || 0;
    const practice = r.tutorial === 'practice'; // "How to play": a practice board that saves nothing
    const firstTime = prevStars === 0 && !r.autoplay && !practice;
    // autoplay wins are shown but never saved: no stars, unlocks or coins
    const coins = r.autoplay || r.nebula || practice ? 0 : levelReward(lv, stars, firstTime) + closing.coins;
    if (!r.autoplay && !r.nebula && !practice) {
      save.journey.stars[lv.n] = Math.max(prevStars, stars);
      if (save.journey.level <= lv.n) save.journey.level = lv.n + 1;
    }
    this.track('runs', 1);
    if (!r.nebula) this.track('level', 1);
    const result = {
      mode: 'journey', won: true, level: lv.n, kind: lv.kind, stars, prevStars, coins, firstTime,
      score: r.score, durationSec: Math.round(r.activeTime), dropsLeft: r.dropsLeft, autoplay: !!r.autoplay,
      nebula: r.nebula, dropsUsed: r.drops, dropLog: r.dropLog.slice(), undoUsed: !!r.undoUsed,
      merges: r.merges || 0, // the Goodnight tally counts Journey merges too (never "0 pieces merged" after a level night)
      continued: (r.continuesGranted || 0) > 0, // Nova Streak: only a continue that really added drops (coins, or an ad that paid out)
      boosterUsed: !!r.boosterUsed, continuesGranted: r.continuesGranted || 0, // anonymous level stats only
      closing: { drops: closing.drops, score: closing.score, coins: r.autoplay || r.nebula || practice ? 0 : closing.coins },
      closingFirst: false, // first Closing time ever (the board show explained it; presentation only)
      tutorial: r.tutorial || null, // the first-run lesson's win card (docs/UX_FIRST_RUN.md T6) / the practice end card
      ...friendResult(r),
    };
    // the lesson's own win card has no Closing time line: the first explanation waits for the next win (Q5)
    if (closing.drops && !r.autoplay && !r.nebula && !r.tutorial && !(save.mechSeen && save.mechSeen.closing)) {
      save.mechSeen = save.mechSeen || {};
      save.mechSeen.closing = true;
      result.closingFirst = true;
    }
    try { this.onRunOver && this.onRunOver(result); } catch (e) { console.error(e); }
  }

  /**
   * Closing time (presentation only): each spare drop appears as a small piece on the aim line and pops with a
   * sparkle, a soft chime and "+250", while the drops counter ticks down and the score counts up. At most ~2.4 s
   * whatever the number of drops; a tap skips to the end; Calm / reduced motion shows it at once.
   */
  async playClosing(closing, tok, pre = null) {
    const r = this.run;
    const R = this.renderer;
    const n = closing.drops;
    const total = r.dropsLeft;
    this.aim.visible = false;
    r.closingShow = true; // hides the waiting piece on the aim line (presentation only)
    // the first Closing time ever teaches the rule here, where it happens (docs/UX_RESULT_CARDS.md §1, rule 6), not on
    // the win card: "Each spare drop becomes 250 points", shown 1.2 s longer. journeyWin sets mechSeen.closing after this.
    const first = !(this.save && this.save.mechSeen && this.save.mechSeen.closing) && !r.autoplay && !r.nebula && !r.tutorial;
    const sub = first ? tr('closing.subFirst', { n: CLOSING_POINTS.toLocaleString('en-US') }) : CLOSING_SUB;
    if (this.fx.reduced || !R.L) {
      if (pre && this.closing === pre) this.closing = null;
      r.score += closing.score;
      this.hud.setDrops(0, r.level.drops, true);
      if (R.L) this.fx.text(R.w / 2, R.L.aimY, `Closing time +${closing.score.toLocaleString('en-US')}`, '#ffe08a', 20, { dur: 1.4, vy: -16 });
      if (R.L && first) this.fx.text(R.w / 2, R.L.aimY + 28 * hudTextFactor(), sub, '#fff4dc', 16, { dur: 2.6, vy: -16 });
      Svc.haptic('light');
      return;
    }
    const st = pre || { skip: false };
    this.closing = st;
    const pace = closingPace(n);
    const chimeEvery = Math.max(1, Math.ceil(0.09 / pace)); // never more than ~11 chimes a second
    const row = R.aimRow();
    const made = [];
    if (!st.skip) {
      const ty = R.L.by + R.L.cell * 0.9;
      this.fx.text(R.w / 2, ty, 'Closing time!', '#ffe08a', 24, { dur: 2.6, vy: -6 });
      this.fx.text(R.w / 2, ty + 30 * hudTextFactor(), sub, '#fff4dc', 16, { dur: first ? 3.8 : 2.6, vy: -6 });
    }
    try {
      for (let i = 0; i < n && !st.skip; i++) {
        const col = i % 5;
        const v = this.addVisual({ id: `closing-${i}`, kind: 'orb', tier: 1 + (i % 3), c: col, r: row, s: 0 });
        made.push(v.id);
        // grow in, rest a beat on the aim line, then pop (a skin's own pop look when it has one, e.g. Koi bubbles)
        this.tw.to(v, { s: 1 }, 0.12, Ease.outBack).then(() => this.tw.wait(0.08)).then(() => {
          if (tok !== this.token || !this.visuals.has(v.id)) return;
          const x = R.cellX(col), y = R.L.aimY;
          const skinned = this.skinPop(v, 0.14);
          if (!skinned) this.tw.to(v, { s: 1.3, a: 0 }, 0.14, Ease.outQuad);
          this.fx.ring(x, y, '#ffe08a', R.L.cell * 0.55, 0.32, 3);
          this.fx.sparkle(x, y, ['#ffe08a', '#ffffff', '#ffc2d6'], 7);
          this.fx.text(x, y - R.L.cell * 0.35, '+' + CLOSING_POINTS.toLocaleString('en-US'), '#ffe08a', 15, { dur: 1.0, vy: -24 });
          if (i % chimeEvery === 0) { Svc.sfx('merge', { tier: 3 + (i % 5), combo: 1 }); Svc.haptic('light'); }
          if (!st.skip) { r.score += CLOSING_POINTS; this.hud.setDrops(total - i - 1, r.level.drops, true); }
        });
        await this.tw.wait(pace);
        if (tok !== this.token) return;
      }
      if (st.skip) this.hud.setDrops(0, r.level.drops, true);
      else await this.tw.wait(0.35);
    } finally {
      if (this.closing === st) this.closing = null;
      for (const id of made) this.visuals.delete(id);
    }
  }

  async journeyFail(reason) {
    const r = this.run;
    const tok = this.token;
    this.busy = true;
    try { this.hud.hideHint && this.hud.hideHint(); } catch (_) { /* presentation only */ }
    r.undo = null; // a fail (and any paid continue after it) ends the undo window
    Svc.haptic('heavy');
    this.fx.shake(6);
    const title = reason === 'drops' ? tr('banner.outOfDrops') : reason === 'tide' ? tr('banner.overflow') : tr('banner.noRoom');
    this.fx.banner(title, '#ff8aa0', '', { dur: 1.0, size: 0.75 });
    await this.tw.wait(0.8);
    if (tok !== this.token) return;
    let choice = 'quit';
    // Daily Nebula: no continues (no coins, no ads). Replays are free instead.
    if (!r.nebula) try {
      choice = await this.ui.showFailOffer({
        level: r.level,
        reason,
        remaining: remainingText(r.level, r.prog),
        prog: r.prog.slice(),
        coins: this.save.coins,
        price: 900,
        canAd: !r.adUsed && Svc.canOfferRevive({ revivesUsed: r.adUsed ? 1 : 0 }),
      });
    } catch (_) { choice = 'quit'; }
    if (tok !== this.token) return;
    let extra = 0;
    if (choice === 'coins' && this.save.coins >= 900) {
      this.save.coins -= 900;
      r.coinContinues++;
      extra = 5;
      this.persist && this.persist();
    } else if (choice === 'ad') {
      r.adUsed = true;
      this.markSavedRun({ adUsed: true }); // one ad continue per level, even across a reload
      const ok = await Svc.showRewarded('revive');
      if (tok !== this.token) return;
      if (ok) extra = AD_REWARDS.FAIL_AD_DROPS;
    }
    if (extra > 0) {
      r.dropsLeft += extra;
      r.continuesGranted = (r.continuesGranted || 0) + 1; // only now: drops were really added
      // saved before any animation: a reload now keeps the paid continue (replayed on restore)
      this.saveRest({ type: 'continue', reason, extra });
      await this.finishContinue(reason, extra);
      return;
    }
    if (choice === 'ad' || choice === 'coins') {
      // ad failed / not enough coins: offer again rather than ending abruptly
      return this.journeyFail(reason);
    }
    this.journeyLost(reason);
  }

  /**
   * The lesson can't be lost (docs/UX_FIRST_RUN.md "Forgiving by construction"): out of drops (or out of room), it
   * quietly gives 5 more drops and makes room, with one honest line. No ad, no coins, no fail card, no continue
   * counted; the score is untouched. Only for run.tutorial; never reads ad state.
   */
  async tutorialTopUp() {
    const r = this.run;
    const tok = this.token;
    if (isBoardFull(r.board)) {
      await this.doRevive();
      if (tok !== this.token) return;
    }
    if (r.dropsLeft <= 0) r.dropsLeft += TUTORIAL_TOP_UP;
    if (this.ui.toast) this.ui.toast('No rush. Here are a few more drops.', true, 2600);
    this.updateHud();
    this.syncVisuals();
    this.state = 'playing';
    this.busy = false;
    this.flushQueue();
  }

  /** The rest of a paid Journey continue (drops already added): make room, reset the tide, play on. */
  async finishContinue(reason, extra) {
    const r = this.run;
    const tok = this.token;
    if (reason !== 'drops' || isBoardFull(r.board)) {
      await this.doRevive();
      if (tok !== this.token) return;
    }
    if (r.level.tide) { r.tideK = r.level.tide; r.dropsUntilTide = r.level.tide; }
    // a continue is not a win: plain info, no fanfare
    this.fx.banner(trp('banner.moreDrops', extra), '#a9bfe0', '', { dur: 1.0, size: 0.7 });
    Svc.sfx('ui');
    this.updateHud();
    this.syncVisuals();
    this.state = 'playing';
    this.busy = false;
    this.saveRest();
  }

  journeyLost(reason) {
    const r = this.run;
    r.ended = true;
    this.state = 'over';
    Svc.sfx('gameover');
    this.track('runs', 1);
    const result = {
      mode: 'journey', won: false, level: r.level.n, kind: r.level.kind, stars: 0, coins: 0,
      score: r.score, durationSec: Math.round(r.activeTime), remaining: remainingText(r.level, r.prog),
      autoplay: !!r.autoplay, nebula: r.nebula, dropsUsed: r.drops, dropLog: r.dropLog.slice(),
      reason, goals: r.level.goals, prog: r.prog.slice(), board: cloneBoard(r.board), // read-only, for the fail reflection
      merges: r.merges || 0,
      undoUsed: !!r.undoUsed, boosterUsed: !!r.boosterUsed, continuesGranted: r.continuesGranted || 0, // anonymous level stats only

      ...friendResult(r),
    };
    let i = 0;
    for (const v of this.visuals.values()) this.tw.to(v, { a: 0.25, s: 0.85 }, 0.5, Ease.outQuad, 0.02 * i++);
    try { this.onRunOver && this.onRunOver(result); } catch (e) { console.error(e); }
  }

  /** `replay`: re-running a comet from a resume snapshot; a Journey booster was already paid for. */
  async useComet(row, col, replay = false) {
    const r = this.run;
    const journey = r.mode === 'journey';
    const paid = replay && journey;
    if (this.busy || (!paid && (journey ? (this.save.boosters.comet || 0) <= 0 : r.comets <= 0))) return;
    const target = getCell(r.board, row, col);
    if (!target) return; // never spend a charge on an empty cell
    if (target.kind === 'teapot') { // a comet can't take a teapot: say so gently, spend nothing (docs/UX_MECHANICS.md P3)
      if (!replay) {
        try { this.ui && this.ui.toast && this.ui.toast(teapotRefusal(pageLook()), false, 3600); } catch (_) { /* presentation only */ }
        const tv = this.visuals.get(target.id);
        if (tv && !this.fx.reduced) this.tw.run(0.45, (p) => { tv.rot = Math.sin(p * Math.PI * 4) * 0.14 * (1 - p); }).then(() => { tv.rot = 0; });
        Svc.haptic('light');
      }
      return;
    }
    if (!replay) this.saveRest({ type: 'comet', r: row, c: col });
    this.busy = true;
    const tok = this.token;
    this.cometMode = false;
    this.targetMode = null;
    if (journey) { if (!paid) { this.save.boosters.comet--; this.persist && this.persist(); } r.undo = null; r.boosterUsed = true; } else r.comets--;
    const res = removeAt(r.board, row, col, this.boardOpts());
    this.updateHud();
    if (!res.ok) { this.busy = false; return; }
    const rocks = res.cleared.filter((cl) => cl.kind === 'asteroid').length;
    if (rocks) this.bountySignal('asteroids', rocks); // Sector bounties: a comet that hits asteroids counts (C# UseComet)
    const R = this.renderer;
    const x = R.cellX(col), y = R.cellY(row);
    const v = this.visuals.get(res.removed.id);
    // Café look: a seagull swoops in and snatches it (src/game/gullFx.js); Cosmic: the comet streak from the top.
    // Same 0.16 s lead-in either way, so the timing is identical (presentation only).
    const cafe = pageLook() !== 'cosmic';
    const streak = { y: R.L.aimY - R.L.cell };
    if (cafe) {
      const side = x < (R.cellX(0) + R.cellX(r.board.cols - 1)) / 2 ? 1 : -1; // come in from the far side
      this.fx.custom(new GullSwoop(x + side * R.L.cell * 2.2, streak.y - R.L.cell * 0.5, x, y, R.L.cell * 0.55, this.fx.reduced));
      await this.tw.run(GULL_DIVE, () => {});
    } else {
      await this.tw.run(0.16, (p) => {
        this.fx.burst(x + (Math.random() - 0.5) * 6, streak.y + (y - streak.y) * p, ['#ff8a5c', '#ffd54a'], 3, 40, 3, { gravity: 0, life: 0.35 });
      });
    }
    if (tok !== this.token) return;
    const hitCols = cafe ? GULL_PUFF : ['#ff8a5c', '#ffd54a', '#ffffff'];
    this.fx.burst(x, y, hitCols, cafe ? 18 : 24, cafe ? 200 : 260, 4);
    this.fx.ring(x, y, cafe ? 'rgba(255,255,255,0.85)' : '#ff8a5c', R.L.cell * 1.2, 0.4, cafe ? 4 : 6);
    this.fx.shake(cafe ? 2 : 4);
    Svc.sfx('impact', { tier: 6 });
    Svc.haptic('medium');
    if (res.cleared.length > 1) {
      // Meteor Shower: the whole 3x3 area goes
      this.fx.ring(x, y, cafe ? 'rgba(207,232,226,0.9)' : '#ffd54a', R.L.cell * 2.2, 0.5, cafe ? 6 : 8);
      this.fx.shake(cafe ? 4 : 6);
      for (const cl of res.cleared.slice(1)) {
        const cv = this.visuals.get(cl.id);
        this.fx.burst(R.cellX(cl.c), R.cellY(cl.r), hitCols, 14, cafe ? 200 : 240, 3);
        if (cv) this.skinPop(cv, 0.16) || this.tw.to(cv, { s: 1.4, a: 0, flash: 1 }, 0.16, Ease.outQuad);
      }
    }
    if (v) await (this.skinPop(v, 0.16) || this.tw.to(v, { s: 1.4, a: 0, flash: 1 }, 0.16, Ease.outQuad));
    for (const cl of res.cleared) this.visuals.delete(cl.id);
    const falls = [];
    for (const mv of res.gravity) {
      const fv = this.visuals.get(mv.id);
      if (fv) falls.push(this.tw.to(fv, { r: mv.toR }, 0.07 + Math.sqrt(mv.toR - mv.fromR) * 0.07, Ease.inQuad).then(() => this.squash(fv)));
    }
    await Promise.all(falls);
    if (tok !== this.token) return;
    await this.playSteps(res.steps, res);
    if (tok !== this.token) return;
    if (journey) { await this.afterJourneyAction(res, false); return; }
    if (await this.checkSectors(tok) === false) return;
    if (isBoardFull(r.board) && r.comets <= 0) { await this.handleLoss('full'); return; }
    this.flushMomentNote(); // a new ticket's toast waits until any sector perk card has closed
    this.syncVisuals();
    this.busy = false;
    this.saveRest();
    this.flushQueue();
  }

  // ================================================================ loss / revive / end

  async handleLoss(reason) {
    const r = this.run;
    const tok = this.token;
    this.busy = true;
    r.lossReason = reason;
    Svc.haptic('heavy');
    this.fx.shake(10);
    this.fx.flash('#ff2255', 0.25);
    this.fx.banner(reason === 'tide' ? tr('banner.overflow') : tr('banner.noRoom'), '#ff6a8a', '', { dur: 1.1, size: 0.9 });
    await this.tw.wait(0.9);
    if (tok !== this.token) return;

    // Zen Drift: a locked board simply ends the run (no revive offer, no ad; Second Wind is never offered)
    if (r.zen) { this.endRun(); return; }

    // Second Wind: free revive (perk)
    if (r.owned.secondWind && !r.secondWindUsed) {
      r.secondWindUsed = true;
      this.fx.banner(tr('banner.secondWind'), '#a9bfe0', tr('banner.secondWindSub'), { dur: 1.4, size: 0.7 });
      await this.doRevive(reason);
      return;
    }

    let revived = false;
    if (Svc.canOfferRevive({ revivesUsed: r.revivesUsed, reviveUsed: r.revivesUsed > 0, secondWindUsed: r.secondWindUsed })) {
      // a friend's challenge: no "your best" wording (bestAtStart is the friend's score there), just the plain offer
      const realBest = r.friend ? 0 : r.bestAtStart;
      const emphasis = Svc.reviveEmphasis({ score: r.score, best: realBest });
      let wants = false;
      try { wants = await this.ui.showRevive({ emphasis, score: r.score, best: realBest }); } catch (_) { wants = false; }
      if (tok !== this.token) return;
      if (wants) {
        this.markSavedRun({ revivesUsed: Math.max(1, r.revivesUsed) }); // one revive offer per run, even across a reload
        const ok = await Svc.showRewarded('revive');
        if (tok !== this.token) return;
        if (ok) { r.revivesUsed++; revived = true; }
      }
    }
    if (revived) { this.saveRest({ type: 'revive', reason }); await this.doRevive(reason); return; }
    this.endRun();
  }

  /**
   * reason: the Endless loss being revived. After a tide overflow the drop's café moment tick (skipped by the loss) runs
   * once the rows are cleared, so the ticket window stays strict (C# DoRevive). A replayed older snapshot has none.
   */
  async doRevive(reason = null) {
    const r = this.run;
    const tok = this.token;
    const res = clearTopRows(r.board, AD_REWARDS.REVIVE_ROWS);
    const R = this.renderer;
    // a revive is a second chance, not a win: a quiet puff where rows clear, no flash or fanfare
    Svc.sfx('tide');
    Svc.haptic('light');
    for (const cl of res.cleared) {
      const v = this.visuals.get(cl.id);
      this.fx.burst(R.cellX(cl.c), R.cellY(cl.r), ['#8fa6c8', '#c9d6ea'], 5, 110, 2.5, { type: 'dot' });
      if (v) (this.skinPop(v, 0.3) || this.tw.to(v, { s: 0, a: 0 }, 0.3, Ease.inQuad)).then(() => this.visuals.delete(cl.id));
    }
    await this.tw.wait(0.35);
    if (tok !== this.token) return;
    if (r.mode !== 'journey') {
      r.tideK = tideInterval(r.sector, r.mods.slowTide, r.challenge);
      r.dropsUntilTide = r.tideK;
      this.fx.banner(tr('banner.continue'), '#a9bfe0', tr('banner.continueSub'), { dur: 1.1, size: 0.7 });
      if (reason === 'tide') { this.momentTick(); this.flushMomentNote(); }
    }
    this.syncVisuals();
    this.updateHud();
    this.state = 'playing';
    this.busy = false;
    this.saveRest();
  }

  endRun() {
    const r = this.run;
    if (!r || r.ended) return;
    r.ended = true;
    this.state = 'over';
    this.busy = true;
    if (this.tally) this.finishTally(this.tally);
    Svc.sfx('gameover');
    this.track('runs', 1);
    const result = {
      mode: 'endless',
      score: r.score,
      bestBefore: r.friend ? 0 : r.bestAtStart, // a friend's challenge never touches the player's own bests
      isNewBest: !r.autoplay && !r.friend && r.score > r.bestAtStart,
      autoplay: !!r.autoplay,
      sector: r.sector,
      daily: r.daily,
      challenge: normChallenge(r.challenge),
      path: r.daily ? null : normPath(r.path), // Paths + Resonance (one shared best per tide tier)
      durationSec: Math.round(r.activeTime),
      maxCombo: r.maxCombo,
      maxTier: r.maxTier,
      bestChain: { ...r.bestChain },
      merges: r.merges,
      supernovas: r.supernovas,
      coinBonus: r.mods.coinBonus,
      owned: { ...r.owned },
      drops: r.drops,
      reason: r.lossReason || null,
      forfeit: !!r.forfeit,
      zen: !!r.zen, // Zen Drift: its own best, no ads, modest rewards (main.js settleZen)
      ...bountyResult(r), // Sector bounties: done / seen (coins are added in main.js settleEndless)
      ...momentResult(r), // Café moments: served / opened (coins are added in main.js settleEndless)
      board: cloneBoard(r.board), // read-only, for the fail reflection
      curve: r.autoplay || r.zen || r.friend ? null : curveOut(r), // "Race your best" (kept only if this run sets the tier's best)
      ...friendResult(r), // Challenge a friend: seed, kit and the friend's result
    };
    // pieces fade out dramatically
    let i = 0;
    for (const v of this.visuals.values()) {
      this.tw.to(v, { a: 0.25, s: 0.85 }, 0.5, Ease.outQuad, 0.02 * i++);
    }
    try { this.onRunOver && this.onRunOver(result); } catch (e) { console.error(e); }
  }

  /** Player-initiated end (pause menu). */
  forfeit() {
    if (!this.run || this.run.ended) return;
    this.token++;
    this.tw.clear();
    if (this.run.book) { // Pause > Back to the book: the position is kept (save.books.cur)
      const r = this.run;
      r.ended = true;
      this.state = 'over';
      this.busy = true;
      this.bookProgress();
      try { this.onRunOver && this.onRunOver({ mode: 'book', won: false, left: true, id: r.book.id, n: r.book.n, tries: r.book.tries, cols: r.bookCols.slice(), autoplay: false }); } catch (e) { console.error(e); }
      return;
    }
    if (this.run.mode === 'journey') {
      const r = this.run;
      r.ended = true;
      this.state = 'over';
      this.busy = true;
      const result = { mode: 'journey', won: false, level: r.level.n, kind: r.level.kind, stars: 0, coins: 0, score: r.score, durationSec: Math.round(r.activeTime), merges: r.merges || 0, remaining: remainingText(r.level, r.prog), forfeit: true, goals: r.level.goals, prog: r.prog.slice(), autoplay: !!r.autoplay, nebula: r.nebula, dropsUsed: r.drops, dropLog: r.dropLog.slice(), undoUsed: !!r.undoUsed, boosterUsed: !!r.boosterUsed, continuesGranted: r.continuesGranted || 0, tutorial: r.tutorial || null, ...friendResult(r) };
      try { this.onRunOver && this.onRunOver(result); } catch (e) { console.error(e); }
      return;
    }
    this.run.forfeit = true;
    this.endRun();
  }

  // ================================================================ HUD

  // ---------------------------------------------------------------- undo last drop (Fun Wave D)
  /** HUD state of the Undo button: shown in Journey (Nebula only in practice), 1 then 0. */
  undoState() {
    const r = this.run;
    if (!r || r.mode !== 'journey' || !r.undoOk) return { show: false, left: 0, ready: false };
    if (r.book) return { show: true, left: 1, ready: this.canUndo(), free: true }; // Puzzle Books: undo as often as you like
    return { show: true, left: r.undoUsed ? 0 : 1, ready: this.canUndo() };
  }

  /** At rest between moves, after a drop, with the free undo unused (never after a win or loss). */
  canUndo() {
    const r = this.run;
    if (r && r.book) return !!(this.canAct() && !this.busy && r.bookCols.length > 0);
    return !!(this.canAct() && !this.busy && r.mode === 'journey' && r.undoOk && !r.undoUsed && r.undo && !r.ended);
  }

  /** Put the level back exactly as it was before the last drop: board, queue, RNG, drops, goals, score. */
  undo() {
    if (!this.canUndo()) return false;
    const r = this.run;
    if (r.book) { // Puzzle Books: replay the puzzle without its last drop (exact, no RNG)
      this.bookRestart(r.bookCols.slice(0, -1));
      Svc.sfx('ui');
      Svc.haptic('light');
      this.fx.text(this.renderer.w / 2, this.renderer.L.aimY, 'UNDONE', '#a9bfe0', 18, { dur: 0.9, vy: -20 });
      return true;
    }
    const u = r.undo;
    restoreUndo(r, u);
    r.undo = null;
    r.undoUsed = true;
    // Daily Orbits: take back progress the undone drop made (never un-collects a claimed one)
    const so = u.orbits, cur = this.save.orbits;
    if (so && cur && so.date === cur.date && Array.isArray(so.list) && Array.isArray(cur.list)) {
      cur.list.forEach((m, i) => {
        const c = so.list[i];
        if (!c || c.type !== m.type || m.claimed) return;
        m.progress = c.progress; m.done = c.done;
      });
      this.persist && this.persist();
    }
    this.queuedCol = null;
    this.tally = null;
    this.targetMode = null;
    this.cometMode = false;
    this.tw.clear();
    this.visuals.clear();
    this.syncVisuals(true);
    this.aim.s = 1;
    r.displayScore = r.score;
    this.hud.setScore(r.score);
    this.updateHud();
    Svc.sfx('ui');
    Svc.haptic('light');
    this.fx.text(this.renderer.w / 2, this.renderer.L.aimY, 'UNDONE', '#a9bfe0', 18, { dur: 0.9, vy: -20 });
    this.saveRest();
    return true;
  }

  updateHud(full = false) {
    const r = this.run;
    if (!r) return;
    const h = this.hud;
    h.autoRun = !!r.autoplay;
    if (full) { h.setScore(0); r.displayScore = 0; }
    if (r.mode === 'journey') {
      h.setLevel(r.level);
      h.setDrops(r.dropsLeft, r.level.drops);
      h.setGoals(r.level, r.prog, this.skin);
      h.setNext(r.next, this.skin);
      if (h.setBookTray) h.setBookTray(r.book ? r.bookP.queue.slice(r.bookDeal, r.bookDeal + 2).split('').map((t) => ({ tier: Number(t) })) : null, this.skin);
      if (h.setBookHint) h.setBookHint(!!(r.book && r.book.tries >= 2 && !r.bookCols.length && !r.bookHint), () => { if (this.showBookHint()) { Svc.sfx('ui'); this.updateHud(); } });
      const b = this.save.boosters;
      h.setBoosters({
        comet: { count: b.comet || 0, unlocked: this.boosterUnlocked('comet'), active: this.targetMode === 'comet' },
        wild: { count: b.wild || 0, unlocked: this.boosterUnlocked('wild'), active: !!(r.current && r.current.wild) },
        shuffle: { count: b.shuffle || 0, unlocked: this.boosterUnlocked('shuffle'), active: this.targetMode === 'shuffle' },
      });
      if (h.setUndo) h.setUndo(this.undoState());
      return;
    }
    h.setBestProgress(r.score, r.bestAtStart, bestMode(r), this.ghostNow());
    const lo = r.sector > 1 ? this.sectorGoal(r.sector - 1) : 0;
    const hi = this.sectorGoal(r.sector);
    h.setSector(r.sector, Math.max(0, Math.min(1, (r.score - lo) / (hi - lo))));
    h.setPerks(r.owned, r.path || null, r.bounty || null, this.momentChip());
    h.setNext(r.next, this.skin);
    h.setHold(r.owned.hold ? r.hold : undefined, !!r.owned.hold, !r.holdUsed, this.skin);
    h.setComets(r.comets, this.cometMode);
  }
}

/** Sector bounties for the run result: { bountiesDone, bountiesSeen } (0 / 0 for Zen Drift and old snapshots). */
/** A saved run's bounty fields as a resume would repair them (C# FromSnapshot), without touching the snapshot. */
function repairedBounty(r) {
  const c = { mode: 'endless', zen: !!r.zen, seed: r.seed, sector: r.sector, bounty: r.bounty, bountiesDone: r.bountiesDone, bountiesSeen: r.bountiesSeen };
  sanitizeRunBounty(c);
  return c;
}

/** A saved run's café moments as a resume would repair them, without touching the snapshot. */
function repairedMoments(r) {
  const c = { mode: 'endless', daily: !!r.daily, zen: !!r.zen, drops: r.drops, moments: r.moments };
  sanitizeRunMoments(c);
  return c;
}

/**
 * Challenge a friend (src/meta/friendChallenge.js): the run's seed and starting kit, so the result card can send
 * this exact puzzle on, and the friend's result when this run was a challenge. Plain data only.
 */
function friendResult(r) {
  return { seed: r.seed >>> 0, kit: r.kit ? { ...r.kit } : null, friend: r.friend ? { ...r.friend, kit: { ...r.friend.kit } } : null };
}

/** The challenge as kept on the run (and in its snapshot): the sender's result, name and code. */
function friendInfo(f) {
  const n = normFriend(f); // every field bounds-checked again (a snapshot can be hand-edited); null = drop it
  if (!n) return null;
  return {
    mode: n.mode, seed: n.seed, tier: n.tier, kit: n.kit, score: n.score, stars: n.stars | 0, drops: n.drops | 0, name: n.name,
    code: typeof f.code === 'string' && f.code.length <= 200 ? f.code : '', ...(n.mode === 'nebula' ? { date: n.date } : {}),
  };
}

/** setBestProgress mode: 'friend' (racing a friend's score), 'zen', or the daily flag. */
function bestMode(r) {
  return r.friend ? 'friend' : r.zen ? 'zen' : r.daily;
}

function bountyResult(r) {
  if (!r || !r.bounty) return { bountiesDone: 0, bountiesSeen: 0 };
  return { bountiesDone: r.bountiesDone || 0, bountiesSeen: r.bountiesSeen || 0 };
}

/** Copy of a run's race curve for the result (null if the run has none, e.g. resumed from an older snapshot). */
function curveOut(r) {
  const c = r && r.curve;
  return c && Array.isArray(c.pts) && c.step >= 1 ? { step: c.step, pts: c.pts.slice() } : null;
}
