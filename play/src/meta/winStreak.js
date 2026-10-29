// Nova Streak (Fun Wave C, DESIGN.md v0.5.6): a forgiving Journey win streak. Pure, no DOM.
//
// Each Journey win adds one charge (cap STREAK_MAX = 3). Charges are not spent: every Journey level started
// while you hold N charges begins with N tier-1 Wild Orbs on the board (levels.js streakPlacements). In-board
// power only, never extra drops. Forgiving: the first loss after a win only takes one charge away (the
// shield); a second loss in a row starts the streak again. The next win brings the shield back.
// Fairness: never tied to ads, coins or purchases. A win after a paid or ad continue counts like the fail it
// came from, so there is never a reason to pay to keep the streak. Ignored: Daily Nebula, autoplay, and a
// quit before the first drop. Undo changes nothing here (the result decides).

import { STREAK_MAX } from '../game/levels.js';
import { tp } from '../i18n/index.js'; // the level-start banner tag (banner.streak)

export { STREAK_MAX };

const clampCharges = (v) => Math.max(0, Math.min(STREAK_MAX, Math.floor(Number(v) || 0)));

function state(save) {
  const w = save.winStreak;
  if (!w || typeof w !== 'object' || Array.isArray(w)) save.winStreak = { charges: 0, shield: true };
  return save.winStreak;
}

/** Charges held now (0..3): the number of Wild Orbs the next Journey level starts with. */
export function streakCharges(save) {
  const w = save && save.winStreak;
  return w && typeof w === 'object' ? clampCharges(w.charges) : 0;
}

/** True while the next loss would only cost one charge. */
export function streakShield(save) {
  const w = save && save.winStreak;
  return !(w && typeof w === 'object' && w.shield === false);
}

/**
 * Count a finished Journey attempt. res: { mode, won, nebula, autoplay, forfeit, dropsUsed, continued }.
 * Returns null when it doesn't count, else { before, charges, shield, outcome, continued } where outcome is
 * 'up' (one more charge), 'full' (won at the cap), 'saved' (loss, shield used, charges left),
 * 'reset' (loss, back to 0 from > 0) or 'none' (loss with no charges).
 */
export function recordStreakResult(save, res) {
  if (!res || res.mode !== 'journey' || res.nebula || res.autoplay) return null;
  if (res.forfeit && !res.dropsUsed) return null; // quitting before any drop is not an attempt
  const w = state(save);
  const before = clampCharges(w.charges);
  let shield = w.shield !== false;
  const continued = !!res.continued;
  let charges, outcome;
  if (res.won && !continued) {
    charges = Math.min(STREAK_MAX, before + 1);
    outcome = charges > before ? 'up' : 'full';
    shield = true;
  } else if (before === 0) {
    charges = 0; outcome = 'none';
  } else if (shield) {
    charges = before - 1; shield = false;
    outcome = charges > 0 ? 'saved' : 'reset';
  } else {
    charges = 0; outcome = 'reset';
  }
  w.charges = charges;
  w.shield = shield;
  return { before, charges, shield, outcome, continued };
}

const orbs = (n) => `${n} Wild Orb${n === 1 ? '' : 's'}`;

/** One honest, calm line for the result screen (null when there is nothing to say). */
export function streakLine(info) {
  if (!info) return null;
  const pre = info.continued && info.outcome !== 'none' ? 'Wins after a continue don\'t build the streak. ' : '';
  switch (info.outcome) {
    case 'up': return `Nova Streak ${info.charges}/${STREAK_MAX}: your next level starts with ${orbs(info.charges)}.`;
    case 'full': return `Nova Streak ${STREAK_MAX}/${STREAK_MAX}: your next level starts with ${orbs(info.charges)}.`;
    case 'saved': return `${pre}Streak saved! Your next level still starts with ${orbs(info.charges)}.`;
    case 'reset': return `${pre}Your streak starts again with your next win.`;
    default: return null;
  }
}

/** Short tag for the level-start banner ("" when no charges). */
export function streakTag(charges) {
  const n = clampCharges(charges);
  return n ? tp('banner.streak', n) : '';
}

/** Save sanitiser: { charges: 0..3, shield: boolean }. */
export function sanitizeWinStreak(save) {
  const w = state(save);
  for (const k of Object.keys(w)) if (k !== 'charges' && k !== 'shield') delete w[k];
  w.charges = clampCharges(w.charges);
  w.shield = w.shield !== false;
}
