// "Good place to stop" card (Wave E, research feature B). Presentation only.
//
// After a Journey win or a solved Daily Nebula, the result screen ends on a calm note: a
// friendly "nice place to pause" line, an HONEST teaser of what comes next (read from the real
// next level), and two equal-size buttons, Play on and Done for now. Nothing auto-starts, there
// is no timer and no guilt copy.
import { getLevel, goalText, LEVEL_COUNT, BOOSTER_UNLOCKS } from '../game/levels.js';
import { BACKDROPS, chapterOf } from '../game/backdrops.js';
import { t } from '../i18n/index.js'; // pure lookup (docs/LOCALISATION.md phase 4)

const BOOSTER_NAMES = Object.freeze({
  get comet() { return t('stop.booster.comet'); },
  get wild() { return t('stop.booster.wild'); },
  get shuffle() { return t('stop.booster.shuffle'); },
});

/** What's genuinely new about level n+1 compared with level n (one short clause). */
export function nextLevelTeaser(n) {
  if (n >= LEVEL_COUNT) return '';
  const next = getLevel(n + 1);
  const cur = getLevel(n);
  for (const id of Object.keys(BOOSTER_UNLOCKS)) {
    if (BOOSTER_UNLOCKS[id] === n + 1) return t('stop.unlocks', { n: n + 1, name: BOOSTER_NAMES[id] || id });
  }
  if (chapterOf(n + 1) !== chapterOf(n)) {
    const theme = BACKDROPS[chapterOf(n + 1)];
    if (theme) return t('stop.nebula', { n: n + 1, name: theme.name });
  }
  if (next.kind === 'superhard') return t('stop.superhard', { n: n + 1 });
  if (next.kind === 'hard') return t('stop.hard', { n: n + 1 });
  if (next.tide && !cur.tide) return t('stop.tide', { n: n + 1 });
  if (next.goals.some((g) => g.type === 'asteroids') && !cur.goals.some((g) => g.type === 'asteroids')) return t('stop.asteroids', { n: n + 1 });
  return t('stop.goals', { n: n + 1, goals: next.goals.map((g) => goalText(g)).join(' · ') });
}

/** Copy for the stop card after a Journey win on level n. */
export function journeyStopCard(n) {
  if (n >= LEVEL_COUNT) {
    return { title: 'Nice place to pause.', line: 'You have finished every level for now.', teaser: 'The Daily Nebula has a fresh puzzle every day.' };
  }
  return { title: 'Nice place to pause.', line: `Level ${n + 1} is ready whenever you are.`, teaser: `Next time: ${nextLevelTeaser(n)}` };
}

/** Copy for the stop card after solving a Daily Nebula. `journeyLevel` = the next Journey level. */
export function nebulaStopCard(journeyLevel) {
  const lv = Math.max(1, Math.min(LEVEL_COUNT, Math.floor(Number(journeyLevel) || 1)));
  return { title: 'Nice place to pause.', line: 'Tomorrow brings a fresh Daily Nebula.', teaser: `Level ${lv} is ready whenever you are.` };
}

// Research suggests a stop cue about every 25 minutes, not after every win: between cues the
// result screen shows only the honest teaser so "one more level" flow isn't interrupted.
export const STOP_CUE_MS = 20 * 60 * 1000;

/** True when the full "Nice place to pause" cue is due, given ms since the last cue (or session start). */
export function stopCueDue(sinceMs) {
  return sinceMs >= STOP_CUE_MS;
}
