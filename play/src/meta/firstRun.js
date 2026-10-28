// First-run onboarding (docs/UX_FIRST_RUN.md): who gets the guided Level 1, its steps and their exact copy, and the
// small step machine the coach overlay follows. Pure logic (no DOM), so tests can drive it.
//
// Presentation and meta only. Nothing here changes a rule, a score, the RNG, a reward or an ad decision, and nothing
// reads ad state (CLAUDE.md "ad ethics"). The one gameplay-adjacent piece, the lesson's "can't lose" top-up of
// 5 drops, lives in game.js tutorialTopUp and applies only to the lesson's own run (run.tutorial).
// Unity mirror: docs/UX_FIRST_RUN.md "Unity port notes".
import { markStorySeen } from './keepers.js';
import { cafeSummary } from './cafe.js';
import { withText, TEXT } from '../i18n/index.js'; // the captions are content text: lesson.<step> (src/i18n/content/en.js)

/** The lesson's steps, in order. 'play' is the slim "Your turn!" strip; 'done' means no guidance is showing. */
export const STEPS = Object.freeze(['drop', 'merge', 'goal', 'next', 'play', 'done']);

/** Exact captions (cozy words; copy.js swaps nouns when the Cosmic look is worn). One idea each, 15 words or fewer. */
export const COPY = Object.freeze(withText({
  drop: TEXT,
  merge: TEXT,
  goal: TEXT,
  next: TEXT,
  play: TEXT,
  topUp: TEXT,
  practiceEnd: TEXT,
  // one meaning for ★ (docs/UX_STARS.md): the café star is always named in full; the card's "+1 ★ for the café" shows the glyph
  winBody: TEXT,
  winButton: TEXT,
  reveal: TEXT,
  // docs/UX_RETENTION.md item 8: the first restore is the awning (1 ★), a change she can see across the whole front
  firstBuild: TEXT,
  // a player who left the lesson before winning (Pause › Quit) lands on Home with Level 1 still to play
  homeNew: TEXT,
}, 'lesson'));

/** Steps that wait for an "OK" tap (the game is paused while they show, so no drop slips through). */
export const OK_STEPS = Object.freeze(['merge', 'goal', 'next']);

/** Drops in a row without a merge, in the "Your turn" step, before the pointing hand comes back once. */
export const NUDGE_AFTER_DRY_DROPS = 2;

/**
 * Is the guided first Level 1 due? Only for a brand-new player: the lesson not yet done or skipped, no finished run
 * and still on Level 1. Existing players are never put through it (save.js sanitizeTutorial marks them done).
 */
export function tutorialDue(save) {
  if (!save || save.tutorialDone === true) return false;
  const level = (save.journey && save.journey.level) || 1;
  return (save.runs || 0) === 0 && level === 1;
}

/**
 * The lesson is over (finished, skipped, or left). The caller persists. Pip's chapter-0 story ("Oh! Hello. I'm Pip.")
 * is marked seen too: the café reveal on Home introduces her, so she never introduces herself twice at Level 2.
 */
export function markTutorialDone(save) {
  if (!save) return;
  save.tutorialDone = true;
  markStorySeen(save, 0);
}

/**
 * The first café reveal on Home (T7/T8): the lesson is behind her, Level 1 is cleared, a star is waiting and nothing
 * has been restored yet. Ends by itself with the first restore. Only early on (Level 2 is next), so a returning
 * player who simply never restored anything is not treated as new.
 */
export function cafeRevealDue(save, sum = null) {
  if (!save || save.tutorialDone !== true) return false;
  if (((save.journey && save.journey.level) || 1) !== 2) return false;
  const done = save.cafe && save.cafe.done;
  if (done && Object.keys(done).length) return false;
  const s = sum || cafeSummary(save);
  return !!s.canBuild && !s.pending && !s.outOfContent;
}

/**
 * The step machine. `practice`: the "How to play" replay (same steps, ends on the practice card).
 * Events: drop() after a drop is made; resolved(merges) once it settled (merges = cascade steps, 0 = no merge);
 * ok() on an OK tap; skip(); end() when the level is over. Each returns what the overlay should do now:
 * { step, show, pause, nudge } — show: the step to draw (null = draw nothing), pause: hold the game while it shows,
 * nudge: point the hand at a merging column once.
 */
export function createLesson({ practice = false } = {}) {
  const st = { step: 'drop', practice: !!practice, dry: 0, nudged: false, skipped: false };
  const out = (extra = {}) => ({
    step: st.step,
    show: st.step === 'done' ? null : st.step,
    pause: OK_STEPS.includes(st.step),
    nudge: false,
    ...extra,
  });
  return {
    get step() { return st.step; },
    get skipped() { return st.skipped; },
    get practice() { return st.practice; },
    get active() { return st.step !== 'done'; },
    start() { return out(); },
    /** A drop was made (T1 ends here: the caption goes while the piece falls). */
    drop() {
      if (st.step === 'drop') { st.step = 'dropping'; return { step: 'dropping', show: null, pause: false, nudge: false }; }
      return out();
    },
    /** The drop settled with `merges` merge steps. */
    resolved(merges) {
      const m = Math.max(0, Number(merges) || 0);
      if (st.step === 'dropping') {
        // Level 1 is built so every first drop merges; if a queue change ever breaks that, the merge step waits
        if (m > 0) { st.step = 'merge'; return out(); }
        st.step = 'drop';
        return out();
      }
      if (st.step === 'play') {
        if (m > 0) { st.dry = 0; return out(); }
        st.dry++;
        if (st.dry >= NUDGE_AFTER_DRY_DROPS && !st.nudged) { st.nudged = true; return out({ nudge: true }); }
      }
      return out();
    },
    ok() {
      if (st.step === 'merge') st.step = 'goal';
      else if (st.step === 'goal') st.step = 'next';
      else if (st.step === 'next') st.step = 'play';
      else if (st.step === 'play') st.step = 'done'; // the strip tapped away
      return out();
    },
    skip() { if (st.step !== 'done') { st.skipped = true; st.step = 'done'; } return out(); },
    end() { st.step = 'done'; return out(); },
  };
}
