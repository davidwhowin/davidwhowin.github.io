// Café restoration logic (v3, "Nova's Seaside Café"). Pure: no DOM, no randomness, no clock.
// Data and the save shape live in src/meta/cafeData.js; DESIGN.md "v3 PIVOT" › Café rules.
//
// - Café stars are DERIVED from Journey progress, never stored: one per level cleared at least once.
//   Nothing in this module adds stars, and nothing here reads the coin balance or the store, so
//   spending money can never change what the café shows or allows.
// - Areas open in order: an area is open once the one before it is complete. Stars bank freely.
// - buildTask spends stars on a task (one style of three); restyle changes the style for free.
// - claimArea pays a finished area's reward exactly once (save.cafe.celebrated): +300 coins, and its
//   Regular moves in (added to save.keepers.owned). An already-owned Regular, or an area without one,
//   pays +300 more coins instead.
// - A missing or broken save.cafe reads as defaultCafe(); writes repair it first (sanitizeCafe).
// - Café v2 (docs/UX_RETENTION.md item 8) moved the awning to the front at 1 ★ and the steps to 2 ★. A v1 save that
//   built exactly one of the two paid the old price, so it keeps the old prices (save.cafe.oldPrices): nothing is
//   charged twice, no star goes missing, and the terrace still totals the same.
// - save.cafe.brightened (only written when true): the one-time first-restore brighten has played (item 8b). The look
//   itself follows the build count (cafeArt: terrace built >= 1); this flag only stops the moment playing twice.
import {
  CAFE_AREAS, CAFE_AREA_BY_ID, CAFE_TASK_BY_ID, CAFE_VERSION, CAFE_LINES, OUT_OF_CONTENT_LINE,
  REGULAR_FALLBACK_COINS, defaultCafe,
} from './cafeData.js';
import { addCoins } from './economy.js';

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const STYLE_COUNT = 3;
const validStyle = (i) => Number.isInteger(i) && i >= 0 && i < STYLE_COUNT;

/** Café v1 terrace prices, kept by saves flagged oldPrices (see the header). */
export const OLD_TERRACE_COSTS = Object.freeze({ terrace_steps: 1, terrace_awning: 2 });

const costIn = (cafe, t) => (cafe.oldPrices === true && own(OLD_TERRACE_COSTS, t.id) ? OLD_TERRACE_COSTS[t.id] : t.cost);

/** A task's star cost for this save (the table price, or the v1 price on an oldPrices save); 0 for an unknown id. */
export function taskCost(save, taskId) {
  const e = typeof taskId === 'string' && own(CAFE_TASK_BY_ID, taskId) ? CAFE_TASK_BY_ID[taskId] : null;
  return e ? costIn(cafeOf(save), e.task) : 0;
}

/** The café part of a save, read-only (a fresh default when missing). */
function cafeOf(save) {
  const c = save && save.cafe;
  return isObj(c) && isObj(c.done) && Array.isArray(c.celebrated) ? c : defaultCafe();
}

/** The café part of a save, repaired in place so it can be written. */
function cafeForWrite(save) {
  if (!isObj(save.cafe) || !isObj(save.cafe.done) || !Array.isArray(save.cafe.celebrated)) sanitizeCafe(save);
  return save.cafe;
}

// ------------------------------------------------------------------ stars

/** Café stars earned: Journey levels with at least one star (1 per level, ever). */
export function starsEarned(save) {
  const stars = save && save.journey && save.journey.stars;
  if (!isObj(stars)) return 0;
  let n = 0;
  for (const k of Object.keys(stars)) {
    if (!/^[1-9]\d*$/.test(k)) continue; // level numbers only
    if (Number(stars[k]) >= 1) n++;
  }
  return n;
}

/** Café stars spent: the costs of every built task. */
export function starsSpent(save) {
  const c = cafeOf(save);
  const done = c.done;
  let n = 0;
  for (const id of Object.keys(done)) {
    const e = own(CAFE_TASK_BY_ID, id) ? CAFE_TASK_BY_ID[id] : null;
    if (e && validStyle(done[id])) n += costIn(c, e.task);
  }
  return n;
}

/** Café stars ready to spend (never below 0). */
export function starsAvailable(save) {
  return Math.max(0, starsEarned(save) - starsSpent(save));
}

// ------------------------------------------------------------------ areas and tasks

const isBuilt = (cafe, taskId) => own(cafe.done, taskId) && validStyle(cafe.done[taskId]);
const areaComplete = (cafe, area) => area.tasks.length > 0 && area.tasks.every((t) => isBuilt(cafe, t.id));

function areaOpen(cafe, idx) {
  return idx === 0 || areaComplete(cafe, CAFE_AREAS[idx - 1]);
}

/** Style index of a built task, or -1. */
export function taskStyle(save, taskId) {
  const c = cafeOf(save);
  return isBuilt(c, taskId) ? c.done[taskId] : -1;
}

/**
 * State of one area for the build sheet and the art:
 * { id, name, book, status: 'locked' | 'open' | 'complete', celebrated, built, total, cost, spent, keeper,
 *   tasks: [{ id, name, cost, prop, style (-1 = not built), state: 'done' | 'affordable' | 'locked', need }] }
 * Task state 'locked' means not affordable yet (need = stars still missing) or the area isn't open.
 */
export function areaState(save, areaId) {
  const area = CAFE_AREA_BY_ID[areaId];
  if (!area) return null;
  const c = cafeOf(save);
  const idx = CAFE_AREAS.indexOf(area);
  const open = areaOpen(c, idx);
  const complete = areaComplete(c, area);
  const avail = starsAvailable(save);
  let built = 0, spent = 0, cost = 0;
  const tasks = area.tasks.map((t) => {
    const tc = costIn(c, t);
    cost += tc;
    const style = isBuilt(c, t.id) ? c.done[t.id] : -1;
    if (style >= 0) { built++; spent += tc; }
    const state = style >= 0 ? 'done' : open && avail >= tc ? 'affordable' : 'locked';
    return { id: t.id, name: t.name, cost: tc, prop: t.prop, style, state, need: state === 'locked' && open ? tc - avail : 0 };
  });
  return {
    id: area.id, name: area.name, book: area.book, chapter: area.chapter,
    status: complete ? 'complete' : open ? 'open' : 'locked',
    celebrated: c.celebrated.includes(area.id),
    built, total: area.tasks.length, cost, spent, keeper: area.keeper, tasks,
  };
}

/** The area being restored now (first one not complete), or null when all written content is done. */
export function currentArea(save) {
  const c = cafeOf(save);
  return CAFE_AREAS.find((a) => !areaComplete(c, a)) || null;
}

/** A finished area whose reward hasn't been paid yet (the celebration to play), or null. */
export function pendingCelebration(save) {
  const c = cafeOf(save);
  const a = CAFE_AREAS.find((x) => areaComplete(c, x) && !c.celebrated.includes(x.id));
  return a ? a.id : null;
}

/**
 * The next task to suggest: the first unbuilt task (sheet order) in the current area.
 * { task, areaId, affordable, need } or null when out of content.
 */
export function nextTask(save) {
  const area = currentArea(save);
  if (!area) return null;
  const c = cafeOf(save);
  const avail = starsAvailable(save);
  const open = area.tasks.filter((t) => !isBuilt(c, t.id));
  // prefer the first one we can afford, else the first one in order
  const t = open.find((x) => costIn(c, x) <= avail) || open[0];
  const cost = costIn(c, t);
  return { task: t, cost, areaId: area.id, affordable: cost <= avail, need: Math.max(0, cost - avail) };
}

/** What finishing `areaId` pays, without paying it: { coins, keeper, keeperNew, extraCoins }. */
export function areaReward(save, areaId) {
  const area = CAFE_AREA_BY_ID[areaId];
  if (!area) return null;
  const owned = !!(save && save.keepers && Array.isArray(save.keepers.owned) && area.keeper && save.keepers.owned.includes(area.keeper));
  const keeperNew = !!area.keeper && !owned;
  return { coins: area.reward.coins, keeper: area.keeper, keeperNew, extraCoins: keeperNew ? 0 : REGULAR_FALLBACK_COINS };
}

/**
 * Build a task with style `styleIdx` (0..2), spending its star cost.
 * Returns { ok, reason, areaComplete, reward }:
 *   reason: null | 'unknown' | 'built' | 'style' | 'locked' | 'stars'
 *   areaComplete: this build finished its area; reward: areaReward() preview when it did and the
 *   reward is still unpaid (pay it with claimArea), else null.
 */
export function buildTask(save, taskId, styleIdx = 0) {
  const fail = (reason) => ({ ok: false, reason, areaComplete: false, reward: null });
  const e = typeof taskId === 'string' && own(CAFE_TASK_BY_ID, taskId) ? CAFE_TASK_BY_ID[taskId] : null;
  if (!e) return fail('unknown');
  if (!validStyle(styleIdx)) return fail('style');
  const c = cafeOf(save);
  if (isBuilt(c, taskId)) return fail('built');
  if (!areaOpen(c, e.areaIndex)) return fail('locked');
  if (starsAvailable(save) < costIn(c, e.task)) return fail('stars');
  const w = cafeForWrite(save);
  w.done[taskId] = styleIdx;
  w.cam = e.areaId;
  const area = CAFE_AREAS[e.areaIndex];
  const complete = areaComplete(w, area);
  const reward = complete && !w.celebrated.includes(area.id) ? areaReward(save, area.id) : null;
  return { ok: true, reason: null, areaComplete: complete, reward };
}

/** Change a built task's style. Always free. { ok, reason: null | 'unknown' | 'notBuilt' | 'style' }. */
export function restyle(save, taskId, styleIdx) {
  const e = typeof taskId === 'string' && own(CAFE_TASK_BY_ID, taskId) ? CAFE_TASK_BY_ID[taskId] : null;
  if (!e) return { ok: false, reason: 'unknown' };
  if (!validStyle(styleIdx)) return { ok: false, reason: 'style' };
  if (!isBuilt(cafeOf(save), taskId)) return { ok: false, reason: 'notBuilt' };
  cafeForWrite(save).done[taskId] = styleIdx;
  return { ok: true, reason: null };
}

/**
 * Pay a finished area's reward, exactly once. Coins go through economy.addCoins; the Regular is added
 * to save.keepers.owned (an owned Regular, or an area without one, pays REGULAR_FALLBACK_COINS instead).
 * Returns { ok, reason: null | 'unknown' | 'incomplete' | 'claimed', coins, keeper, keeperNew, extraCoins }.
 */
export function claimArea(save, areaId) {
  const area = typeof areaId === 'string' && own(CAFE_AREA_BY_ID, areaId) ? CAFE_AREA_BY_ID[areaId] : null;
  const none = (reason) => ({ ok: false, reason, coins: 0, keeper: null, keeperNew: false, extraCoins: 0 });
  if (!area) return none('unknown');
  const c = cafeOf(save);
  if (!areaComplete(c, area)) return none('incomplete');
  if (c.celebrated.includes(area.id)) return none('claimed');
  const r = areaReward(save, area.id);
  cafeForWrite(save).celebrated.push(area.id); // mark first: the reward can never be paid twice
  addCoins(save, r.coins + r.extraCoins);
  if (r.keeperNew) {
    if (!isObj(save.keepers)) save.keepers = { owned: ['pip'], equipped: 'pip', story: [] };
    if (!Array.isArray(save.keepers.owned)) save.keepers.owned = ['pip'];
    if (!save.keepers.owned.includes(r.keeper)) save.keepers.owned.push(r.keeper);
  }
  return { ok: true, reason: null, ...r };
}

/** The opening "shall we bring it back?" moment has been shown. */
export function markIntroSeen(save) {
  cafeForWrite(save).intro = true;
}

/** Has the first-restore brighten (docs/UX_RETENTION.md item 8b) played? It plays once per save. */
export function brightenPlayed(save) {
  return cafeOf(save).brightened === true;
}

/** Remember that the first-restore brighten has played (save.cafe.brightened, written only when true). */
export function markBrightened(save) {
  cafeForWrite(save).brightened = true;
}

/** Remember where the camera rested (a known area id). */
export function setCafeCam(save, areaId) {
  if (!own(CAFE_AREA_BY_ID, areaId)) return false;
  cafeForWrite(save).cam = areaId;
  return true;
}

// ------------------------------------------------------------------ sanitizer and summary

/**
 * Repair save.cafe in place (any garbage in, a valid café out) and return it.
 * - done: known task ids with a style 0..2 only; tasks in an area that isn't open yet are dropped
 *   (an area opens when the one before it is complete).
 * - celebrated: known area ids, unique, kept even if the area now reads incomplete, so a paid
 *   reward can never be paid twice.
 */
export function sanitizeCafe(save) {
  const raw = isObj(save.cafe) ? save.cafe : {};
  const d = defaultCafe();
  const rawDone = isObj(raw.done) ? raw.done : {};
  const done = {};
  let prevComplete = true;
  for (const area of CAFE_AREAS) {
    if (!prevComplete) break;
    for (const t of area.tasks) {
      if (own(rawDone, t.id) && validStyle(rawDone[t.id])) done[t.id] = rawDone[t.id];
    }
    prevComplete = area.tasks.every((t) => own(done, t.id));
  }
  const celebrated = [];
  for (const id of Array.isArray(raw.celebrated) ? raw.celebrated : []) {
    if (typeof id === 'string' && own(CAFE_AREA_BY_ID, id) && !celebrated.includes(id)) celebrated.push(id);
  }
  celebrated.sort((a, b) => CAFE_AREAS.indexOf(CAFE_AREA_BY_ID[a]) - CAFE_AREAS.indexOf(CAFE_AREA_BY_ID[b]));
  const camId = typeof raw.cam === 'string' && own(CAFE_AREA_BY_ID, raw.cam) ? raw.cam : d.cam;
  // a v1 save (any v below 2, or none) that built exactly one of steps/awning paid the old price for it: keep the old prices
  const v1 = !(typeof raw.v === 'number' && raw.v >= 2);
  // Accepted gap: a v2 save opened by a v1 build is written back as v1 without oldPrices, and a later v2 build may then
  // misread it. No v1 build is public, so nobody can hit this.
  const oldPrices = raw.oldPrices === true || (v1 && own(done, 'terrace_steps') !== own(done, 'terrace_awning'));
  save.cafe = { v: CAFE_VERSION, done, celebrated, cam: camId, intro: raw.intro === true };
  if (oldPrices) save.cafe.oldPrices = true;
  if (raw.brightened === true) save.cafe.brightened = true;
  return save.cafe;
}

/** A Pip line for a café moment ('cafe' | 'rest' | 'task' | 'restyle'), picked by counter n. */
export function cafeLine(moment, n = 0) {
  const list = CAFE_LINES[moment] || CAFE_LINES.cafe;
  const i = Math.abs(Math.floor(Number(n) || 0)) % list.length;
  return list[i];
}

/**
 * Everything the home screen needs in one call:
 * { earned, spent, available, areaId, areaName, built, total, next: { id, name, cost, affordable } | null,
 *   canBuild, pending (areaId to celebrate) | null, outOfContent, outLine, areasDone, line }
 */
export function cafeSummary(save) {
  const earned = starsEarned(save), spent = starsSpent(save);
  const available = Math.max(0, earned - spent);
  const area = currentArea(save);
  const st = area ? areaState(save, area.id) : null;
  const nt = nextTask(save);
  const c = cafeOf(save);
  const areasDone = CAFE_AREAS.filter((a) => areaComplete(c, a)).length;
  const canBuild = !!(nt && nt.affordable);
  const builtTotal = Object.keys(c.done).filter((id) => own(CAFE_TASK_BY_ID, id)).length;
  let line;
  if (!area) line = OUT_OF_CONTENT_LINE;
  else if (!c.intro && area.id === CAFE_AREAS[0].id && builtTotal === 0) line = area.lines.intro[0];
  else line = cafeLine(canBuild ? 'cafe' : 'rest', builtTotal);
  return {
    earned, spent, available,
    areaId: area ? area.id : null, areaName: area ? area.name : null,
    built: st ? st.built : 0, total: st ? st.total : 0,
    next: nt ? { id: nt.task.id, name: nt.task.name, cost: nt.cost, affordable: nt.affordable } : null,
    canBuild, pending: pendingCelebration(save), outOfContent: !area, outLine: OUT_OF_CONTENT_LINE, areasDone, line,
  };
}
