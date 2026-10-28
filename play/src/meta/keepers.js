// The Regulars (Keepers): cute seaside café animal companion characters (research §3 #6 and #7). Pure data + helpers, no DOM.
//
// - PURE COSMETICS: a Keeper never changes a rule, score, spawn, reward or ad. It only shows on the
//   menu, as a small buddy in the HUD, and says a short friendly line at a few moments.
// - Pip (the narrator) is free from the start. Players who already own other Keepers keep them
//   (v3 cut Star Capsules and Stardust; see src/meta/migrateV3.js). No Keeper is ever "limited".
// - Story: Pip tells 2–3 short lines when a Journey chapter (10 levels) is first reached. Always
//   skippable, and every chapter already reached can be replayed from the Keepers sheet.
// - Lines are picked by a simple rotating counter (no Math.random, no game RNG).
//
// Save shape: save.keepers = { owned: ['pip', ...], equipped: 'pip', story: [chapterIndex, ...] }
//  story = chapters whose story has been shown once (0-based; chapter 0 = levels 1–20).
import { CHAPTERS, chapterOf } from '../game/chapters.js';
import { withText, TEXT, LINES } from '../i18n/index.js';

// Names, titles, blurbs and moment lines are content text: keeper.<id>.name / .title / .blurb / .lines.<moment>.<i>
// (src/i18n/content/en.js, docs/LOCALISATION.md phase 3).
const momentLines = () => ({ menu: LINES, start: LINES, chain: LINES, win: LINES, fail: LINES });
export const KEEPERS = [
  { id: 'pip', name: TEXT, title: TEXT, free: true, blurb: TEXT, lines: momentLines() },
  { id: 'luna', name: TEXT, title: TEXT, blurb: TEXT, lines: momentLines() },
  { id: 'bloop', name: TEXT, title: TEXT, blurb: TEXT, lines: momentLines() },
  { id: 'ember', name: TEXT, title: TEXT, blurb: TEXT, lines: momentLines() },
  { id: 'zip', name: TEXT, title: TEXT, blurb: TEXT, lines: momentLines() },
  { id: 'nimbus', name: TEXT, title: TEXT, blurb: TEXT, lines: momentLines() },
  { id: 'gus', name: TEXT, title: TEXT, blurb: TEXT, lines: momentLines() },
  { id: 'nova', name: TEXT, title: TEXT, blurb: TEXT, lines: momentLines() },
].map((k) => withText(k, `keeper.${k.id}`));

export const KEEPER_BY_ID = Object.fromEntries(KEEPERS.map((k) => [k.id, k]));
export const FREE_KEEPER = 'pip';
export const MOMENTS = ['menu', 'start', 'chain', 'win', 'fail'];

/**
 * Pip's story: 2–3 lines per Journey chapter (restoring Grandma Nova's café, one area per chapter). One entry per
 * chapter; the lines are content text story.<chapter>.<i> (0-based chapter, src/i18n/content/en.js).
 */
const STORY_CHAPTERS = 15;
export const STORY = withText(Array.from({ length: STORY_CHAPTERS }, () => LINES), 'story');

export function defaultKeepers() {
  return { owned: [FREE_KEEPER], equipped: FREE_KEEPER, story: [] };
}

/** 0-based chapter for a Journey level (story chapters = the 20-level chapters of chapters.js). */
export function storyChapterOf(level) {
  const n = Math.max(1, Math.floor(Number(level) || 1));
  return Math.min(STORY.length - 1, chapterOf(n) - 1);
}

export function chapterTitle(i) {
  const b = CHAPTERS[i];
  return `Chapter ${i + 1}${b ? `: ${b.name}` : ''}`;
}

/**
 * Repair a loaded save.keepers in place. `raw` is the stored save (null for a new player).
 * Existing players get the chapters before their current one marked as seen (replayable, never forced).
 */
export function sanitizeKeepers(save, raw) {
  const k = save.keepers && typeof save.keepers === 'object' && !Array.isArray(save.keepers) ? save.keepers : defaultKeepers();
  const owned = [FREE_KEEPER];
  for (const id of Array.isArray(k.owned) ? k.owned : []) if (KEEPER_BY_ID[id] && !owned.includes(id)) owned.push(id);
  const equipped = owned.includes(k.equipped) ? k.equipped : FREE_KEEPER;
  const story = [];
  for (const c of Array.isArray(k.story) ? k.story : []) if (Number.isInteger(c) && c >= 0 && c < STORY.length && !story.includes(c)) story.push(c);
  if (raw && typeof raw === 'object' && !raw.keepers) {
    const cur = storyChapterOf(save.journey && save.journey.level);
    for (let c = 0; c < cur; c++) if (!story.includes(c)) story.push(c);
  }
  story.sort((a, b) => a - b);
  save.keepers = { owned, equipped, story };
  return save.keepers;
}

export function ownsKeeper(save, id) {
  return !!(save.keepers && Array.isArray(save.keepers.owned) && save.keepers.owned.includes(id));
}

export function equipKeeper(save, id) {
  if (!ownsKeeper(save, id)) return false;
  save.keepers.equipped = id;
  return true;
}

export function equippedKeeper(save) {
  const id = save && save.keepers && save.keepers.equipped;
  return KEEPER_BY_ID[id] || KEEPER_BY_ID[FREE_KEEPER];
}

let lineTick = 0;
/** A short line for a moment ('menu' | 'start' | 'chain' | 'win' | 'fail'). Rotates, no randomness. */
export function keeperLine(keeper, moment) {
  const k = typeof keeper === 'string' ? KEEPER_BY_ID[keeper] : keeper;
  const list = (k && k.lines[moment]) || KEEPER_BY_ID[FREE_KEEPER].lines[moment] || [''];
  lineTick = (lineTick + 1) >>> 0;
  return list[lineTick % list.length];
}

/** The chapter story to tell before starting level n, or -1. Only the player's frontier chapter, once. */
export function storyDue(save, n) {
  const k = save.keepers;
  if (!k) return -1;
  const ch = storyChapterOf(n);
  const frontier = storyChapterOf(save.journey && save.journey.level);
  if (ch !== frontier || k.story.includes(ch)) return -1;
  return ch;
}

export function markStorySeen(save, ch) {
  if (!save.keepers || !Number.isInteger(ch) || ch < 0 || ch >= STORY.length) return;
  if (!save.keepers.story.includes(ch)) { save.keepers.story.push(ch); save.keepers.story.sort((a, b) => a - b); }
}

/** Chapters whose story can be replayed (seen, or already reached). */
export function replayableChapters(save) {
  const frontier = storyChapterOf(save.journey && save.journey.level);
  const out = [];
  for (let c = 0; c < STORY.length; c++) if (c <= frontier || (save.keepers && save.keepers.story.includes(c))) out.push(c);
  return out;
}
