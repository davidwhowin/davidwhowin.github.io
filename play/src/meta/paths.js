// Paths + Resonance (Endless, DESIGN.md "Paths and Resonance"): which Paths are open and the last choice.
// Paths unlock through play only (the furthest sector reached in any Endless run), never with coins,
// purchases or ads. Pure: no DOM. C# port: NovaDrop.Core.Meta.PathsMeta.
import { PATHS, PATH_BY_ID, normPath } from '../game/perks.js';
import { t } from '../i18n/index.js';

/** Furthest Endless sector needed to open each Path (Gravity is open from the start). */
export const PATH_UNLOCK = Object.freeze({ gravity: 1, fusion: 3, tide: 5 });

/** save.paths, created / repaired in place. best = furthest sector in any Endless run (any tide, daily too). */
export function pathsState(save) {
  if (!save.paths || typeof save.paths !== 'object' || Array.isArray(save.paths)) save.paths = { best: 1, last: null };
  return save.paths;
}

/** Save sanitiser. Old saves start from their Standard-tide furthest sector (stats.bestSector). */
export function sanitizePaths(save) {
  const p = save.paths && typeof save.paths === 'object' && !Array.isArray(save.paths) ? save.paths : {};
  const fromStats = Math.floor(Number(save.stats && save.stats.bestSector) || 1);
  const best = Math.max(1, Math.floor(Number(p.best) || 1), fromStats);
  save.paths = { best: Math.min(best, 999), last: normPath(p.last) };
  if (save.paths.last && !pathUnlocked(save, save.paths.last)) save.paths.last = null;
}

export function pathUnlocked(save, id) {
  const p = normPath(id);
  if (!p) return false;
  return (pathsState(save).best || 1) >= PATH_UNLOCK[p];
}

/** Picker rows: every Path with its unlock state and the plain unlock line. */
export function pathRows(save) {
  return PATHS.map((p) => ({
    id: p.id, name: p.name, color: p.color, line: p.line, resonance: p.resonance,
    unlocked: pathUnlocked(save, p.id),
    need: PATH_UNLOCK[p.id] > 1 ? t('paths.need', { n: PATH_UNLOCK[p.id] }) : '',
  }));
}

/** The last Path picked, if still open (null = no Path). */
export function lastPath(save) {
  const l = normPath(pathsState(save).last);
  return l && pathUnlocked(save, l) ? l : null;
}

/** Remember the choice (null = no Path). Locked ids are refused. */
export function setLastPath(save, id) {
  const p = normPath(id);
  pathsState(save).last = p && pathUnlocked(save, p) ? p : null;
  return pathsState(save).last;
}

/**
 * Fold a finished Endless run (not autoplay) into the unlock progress. Any tide, daily included.
 * Returns the Path ids this run opened (for one calm line on the result screen).
 */
export function recordPathsRun(save, sector) {
  const st = pathsState(save);
  const before = PATHS.filter((p) => pathUnlocked(save, p.id)).map((p) => p.id);
  st.best = Math.max(st.best || 1, Math.floor(Number(sector) || 1));
  return PATHS.filter((p) => pathUnlocked(save, p.id) && !before.includes(p.id)).map((p) => p.id);
}

/** "New Path open: Fusion. Pick it before your next Endless run." (null when nothing opened). */
export function pathUnlockLine(ids) {
  if (!ids || !ids.length) return null;
  const names = ids.map((id) => PATH_BY_ID[id].name);
  return names.length > 1
    ? t('paths.newMany', { names: names.join(t('paths.and')) })
    : t('paths.newOne', { name: names[0] });
}
