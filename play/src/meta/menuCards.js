// Calm card pacing on Home and the evening's gift (docs/UX_RETENTION.md items 1, 2, 4 and 5). Pure rules and copy.
// Unity: Scripts/Meta/MenuCards.cs (same JSON shape, same copy; parity checked by MenuCardsTests.cs).
//
// - Evening 1 ends on today's gift: "Done for now" opens a "Before you go" gift card while the gift is still unclaimed on
//   her first play day, then names tomorrow's real gift ("Tomorrow evening's gift: 80 coins. No rush, it waits for you.").
// - A return day opens with the gift (welcome-back merges into it), at most ONE feature card a calendar day (unlock
//   moments, season intro, constellation, weekly recap), and no card at all on the Home visit right after "Done for now".
// - The gift row says honestly why it stepped back (grace / eased). The step-back rule itself lives in daily.js, unchanged.
// - The win card and Pip name the next café fix (nextTask).
// Presentation pacing only: nothing here reads or changes ad state, difficulty, scores or coins.
//
// Save field: menuCardDay = 'YYYY-MM-DD' | null (the local day a feature card last showed). Old saves load as null.

import { dailyRewardState, dayKey } from './daily.js';
import { playDayCount } from './playDays.js';
import { nextTask } from './cafe.js';
import { t } from '../i18n/index.js'; // pure lookup, no UI imports (docs/LOCALISATION.md phase 4)

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const isDay = (v) => typeof v === 'string' && DAY_RE.test(v);

/** Save sanitiser: a valid day key or null. */
export function sanitizeMenuCardDay(s) {
  if (!s) return;
  s.menuCardDay = isDay(s.menuCardDay) ? s.menuCardDay : null;
}

/** May a feature card show today? (none has shown yet on this local day) */
export function menuCardFree(save, now = new Date()) {
  return !save || save.menuCardDay !== dayKey(now);
}

/** A feature card showed today (the caller persists). */
export function markMenuCard(save, now = new Date()) {
  if (save) save.menuCardDay = dayKey(now);
}

/**
 * Tomorrow's gift, as the row will really offer it if she comes back tomorrow: today's claim is counted first when it
 * is still waiting (claiming tonight is what moves the row on). Returns { day: 1..7, amount }.
 */
export function tomorrowGift(save, now = new Date()) {
  const st = dailyRewardState(save || {}, now);
  const today = dayKey(now);
  const d = (save && save.daily) || { lastClaim: null, streak: 0, graceUsed: null };
  const daily = st.available
    ? { lastClaim: today, streak: st.streak, graceUsed: st.graceUsed ? today : (d.graceUsed || null) }
    : { lastClaim: d.lastClaim, streak: d.streak, graceUsed: d.graceUsed || null };
  const t = dailyRewardState({ daily }, new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 12));
  return { day: t.day, amount: t.amount };
}

/** One warm, factual line on why the gift row is where it is today ('' when there is nothing to explain). */
export function giftOutcomeLine(st) {
  if (!st || !st.available) return '';
  if (st.outcome === 'grace') return 'You missed one evening. Your free grace day covered it, so the row carries on.';
  if (st.outcome === 'eased') {
    const away = st.missed === 1 ? 'You missed one evening' : 'You were away a few evenings';
    return `${away}, so the row eased back to Day ${st.day}. It climbs again each evening you visit.`;
  }
  return '';
}

/** "Tomorrow evening's gift: N coins. No rush, it waits for you." (after tonight's claim) */
export function tomorrowLine(save, now = new Date()) {
  const t = tomorrowGift(save, now);
  return `Tomorrow evening's gift: ${t.amount.toLocaleString('en-US')} coins. No rush, it waits for you.`;
}

/** The collected state: "Come back tomorrow for N coins." */
export function collectedLine(save, now = new Date()) {
  return `Come back tomorrow for ${tomorrowGift(save, now).amount.toLocaleString('en-US')} coins.`;
}

/** Evening 1: "Done for now" opens the "Before you go" gift card (gift still waiting, first play day). */
export function eveningOneGiftDue(save, now = new Date()) {
  return !!save && dailyRewardState(save, now).available && playDayCount(save) <= 1;
}

/**
 * A return day: the gift is waiting and this is not her first play day (she has played on an earlier day, or on two
 * days already). The first Home visit of such a day opens the gift card before anything else.
 */
export function returnGiftDue(save, now = new Date()) {
  if (!save || !dailyRewardState(save, now).available) return false;
  const n = playDayCount(save);
  if (n <= 0) return false;
  const last = save.playDays && save.playDays.last;
  return n >= 2 || last !== dayKey(now);
}

/** "Good morning" / "Good afternoon" / "Good evening" for the local hour. */
export function greeting(now = new Date()) {
  const h = now.getHours();
  return h >= 5 && h < 12 ? 'Good morning' : h >= 12 && h < 17 ? 'Good afternoon' : 'Good evening';
}

const lc = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);

/**
 * The next café fix, for the win card and Pip (null when the café has nothing left):
 * { id, name, cost, affordable, need, line, pip }.
 */
export function nextFix(save) {
  const n = save ? nextTask(save) : null;
  if (!n || !n.task) return null;
  const { id, name } = n.task;
  const cost = n.cost; // this save's price (cafe.js taskCost: v1 saves may keep the old terrace prices)
  const line = n.affordable
    ? t('nextFix.ready', { name, cost: cost.toLocaleString('en-US') })
    : t('nextFix.need', { name, n: n.need.toLocaleString('en-US') });
  // {task} is the name lower-cased for mid-sentence English; {name} keeps its case (German nouns)
  const pip = n.affordable ? t('nextFix.pip', { task: lc(name), name }) : null;
  return { id, name, cost, affordable: n.affordable, need: n.need, line, pip };
}

/** Warm Streak: say the line only when the charge count changed (a steady 3/3 shows the pips alone). */
export function streakLineShown(info) {
  return !!(info && info.line && info.before !== info.charges);
}

/**
 * Before Wild Sugar is introduced (Level 11), name what the streak gives in plain words:
 * "Warm Streak 2/3: your next level starts with 2 sugar cubes that match anything."
 */
export function plainStreakLine(line, level) {
  if (!line || !(level < 11)) return line;
  return line.replace(/(\d+) (?:Wild Orbs?|Wild Sugar)/, (m, n) => (n === '1' ? '1 sugar cube that matches anything' : `${n} sugar cubes that match anything`));
}
