// The café restore tutorial (docs/UX_RESTORE_TUTORIAL.md): the first-time café tour (C1–C6), the three one-time tips
// and the new-area intro queue (A1–A2). Pure logic over the save (no DOM), so tests can drive it; the screens live in
// src/ui/cafeTour.js (the tour) and src/ui/cafeView.js (the area intro and tips).
//
// Presentation only: nothing here changes a rule, a cost, a reward, a score or an ad decision, and nothing reads ad
// state. Taking or skipping the tour changes nothing about difficulty or rewards.
//
// Save fields (all inside save.cafe; same JSON shape for the Unity save, which should read/write them next to
// `brightened` in Core/Meta/Cafe.cs CafeState — not ported yet):
//   tut:  absent | 'done' | 'skipped'   the tour's outcome (never the current step: the tour restarts at the step
//                                        that matches the screen — C3 with nothing built, C6 once something is built)
//   met:  string[]                      area ids whose intro was shown (a set; ids are only ever added). The Terrace is
//                                        added when the tour starts or is skipped (the tour is its intro). Left out
//                                        while empty, so a brand-new save keeps exactly the old shape.
//   tips: string[]                      one-time tips shown, from TIP_KEYS
// A save without `met` (any save from before this feature) is migrated once on load (sanitizeCafeTour): if anything
// is built, tut = 'done', met = every area up to and including the current one, and tips = ['restyle'] with 3+ fixes.
import { CAFE_AREAS, CAFE_AREA_BY_ID } from './cafeData.js';
import { areaReward, areaState, currentArea, pendingCelebration, starsAvailable } from './cafe.js';

export const TOUR_OUTCOMES = Object.freeze(['done', 'skipped']);
export const TIP_KEYS = Object.freeze(['look', 'restyle', 'later']);
/** Fixes done before the "tap anything we've fixed to change its look" tip. */
export const RESTYLE_TIP_AT = 3;

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const builtCount = (save) => Object.keys((save && isObj(save.cafe) && isObj(save.cafe.done)) ? save.cafe.done : {}).length;
const cafeOf = (save) => (save && isObj(save.cafe) ? save.cafe : null);
const metOf = (save) => { const c = cafeOf(save); return c && Array.isArray(c.met) ? c.met : []; };
const tipsOf = (save) => { const c = cafeOf(save); return c && Array.isArray(c.tips) ? c.tips : []; };
const uniq = (list, ok) => { const out = []; for (const x of list) if (ok(x) && !out.includes(x)) out.push(x); return out; };

/**
 * Repair (and, for an older save, migrate) the tour fields on save.cafe. Call after sanitizeCafe, with the raw café
 * as it was before sanitizeCafe rebuilt it (sanitizeCafe keeps only the fields it knows). Idempotent.
 */
export function sanitizeCafeTour(save, raw = null) {
  const c = cafeOf(save);
  if (!c) return;
  const src = isObj(raw) ? raw : c;
  if (TOUR_OUTCOMES.includes(src.tut)) c.tut = src.tut; else delete c.tut;
  if (Array.isArray(src.tips)) c.tips = uniq(src.tips, (k) => TIP_KEYS.includes(k)); else delete c.tips;
  if (c.tips && !c.tips.length) delete c.tips;
  if (Array.isArray(src.met)) {
    c.met = uniq(src.met, (id) => typeof id === 'string' && Object.prototype.hasOwnProperty.call(CAFE_AREA_BY_ID, id));
    if (!c.met.length) delete c.met;
    return;
  }
  // a save with nothing built and nothing met has nothing to migrate (a new player: the tour is still ahead)
  if (builtCount(save) === 0) { delete c.met; return; }
  // migration (runs once: `met` exists afterwards)
  const n = builtCount(save);
  c.met = []; // an older save with café progress: from here on it has `met`, so this runs once
  if (n > 0) {
    if (!c.tut) c.tut = 'done';
    const cur = currentArea(save);
    const upto = cur ? CAFE_AREAS.indexOf(cur) : CAFE_AREAS.length - 1;
    for (let i = 0; i <= upto; i++) c.met.push(CAFE_AREAS[i].id);
    if (n >= RESTYLE_TIP_AT) c.tips = uniq([...(Array.isArray(c.tips) ? c.tips : []), 'restyle'], () => true);
  }
}

/**
 * Which tour step Home should show now: 'c1' (start), 'c3' (left mid-tour, nothing built yet), 'c6' (left after the
 * first restore, before "Lovely!"), or null. Never before the Level 1 lesson is behind her, never once tut is set.
 */
export function tourStep(save) {
  const c = cafeOf(save);
  if (!c || save.tutorialDone !== true || c.tut) return null;
  const started = metOf(save).includes('terrace');
  if (builtCount(save) > 0) return started ? 'c6' : null;
  if (starsAvailable(save) < 1) return null;
  return started ? 'c3' : 'c1';
}

/** The tour began (C1 shown, or the result card routed into it): the Terrace counts as met. The caller persists. */
export function markTourStarted(save) { markAreaMet(save, 'terrace'); }

/** The tour ended: 'done' (C6 closed) or 'skipped'. The Terrace counts as met either way. The caller persists. */
export function endTour(save, how = 'done') {
  const c = cafeOf(save);
  if (!c) return;
  if (!c.tut) c.tut = how === 'skipped' ? 'skipped' : 'done';
  markAreaMet(save, 'terrace');
}

/** Add an area id to save.cafe.met (a set). The caller persists. */
export function markAreaMet(save, id) {
  const c = cafeOf(save);
  if (!c || !CAFE_AREA_BY_ID[id]) return;
  if (!Array.isArray(c.met)) c.met = [];
  if (!c.met.includes(id)) c.met.push(id);
}

/**
 * The new-area intro waiting to show (an area id), or null. Due when the current area hasn't been met and no
 * celebration is waiting to play first (the intro always comes after "Lovely!"). The Terrace never has one: the tour
 * is its intro.
 */
export function areaIntroDue(save) {
  if (!cafeOf(save) || pendingCelebration(save)) return null;
  const cur = currentArea(save);
  if (!cur || cur.id === 'terrace') return null;
  return metOf(save).includes(cur.id) ? null : cur.id;
}

/**
 * One card at a time (fix F7): while the tour or an area intro (or its celebration) is waiting, Home holds its unlock
 * moments, gift and wardrobe cards and Pip's "next fix" line.
 */
export function cafeStageHeld(save) {
  return !!(tourStep(save) || areaIntroDue(save) || (cafeOf(save) && pendingCelebration(save)));
}

/** Has one-time tip `key` been shown? */
export function tipSeen(save, key) { return tipsOf(save).includes(key); }

/** Mark tip `key` shown. The caller persists. */
export function markTip(save, key) {
  const c = cafeOf(save);
  if (!c || !TIP_KEYS.includes(key)) return;
  if (!Array.isArray(c.tips)) c.tips = [];
  if (!c.tips.includes(key)) c.tips.push(key);
}

/**
 * The one tip for this Home visit ('look' | 'restyle'), or null. Never during the tour or an area intro.
 * look: the Terrace is finished (there is somewhere else to look). restyle: 3+ fixes and the tour is over.
 * ('later' is shown on the first tap on a locked area, not on a visit.)
 */
export function homeTipDue(save) {
  const c = cafeOf(save);
  if (!c || cafeStageHeld(save)) return null;
  if (!tipSeen(save, 'look') && Array.isArray(c.celebrated) && c.celebrated.includes('terrace')) return 'look';
  if (!tipSeen(save, 'restyle') && c.tut && builtCount(save) >= RESTYLE_TIP_AT) return 'restyle';
  return null;
}

/**
 * What the new-area goal card (A2) shows, straight from the rules (never hard-coded): the area's name, how many fixes,
 * the first open fix (name, cost, affordable), the reward from areaReward (coins + extraCoins; keeper only when she
 * moves in new) and the stars on hand. Null for an unknown area.
 */
export function areaMeetInfo(save, id) {
  if (!CAFE_AREA_BY_ID[id]) return null;
  const st = areaState(save, id);
  const first = st.tasks.find((t) => t.state !== 'done') || null;
  const rw = areaReward(save, id);
  return {
    id, name: st.name, total: st.total,
    first: first ? { id: first.id, name: first.name, cost: first.cost, affordable: first.state === 'affordable' } : null,
    coins: rw.coins + rw.extraCoins, keeper: rw.keeperNew ? rw.keeper : null, available: starsAvailable(save),
  };
}
