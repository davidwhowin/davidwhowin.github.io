// Evening wind-down (v0.5.3, docs/PSYCH_RESEARCH.md §5 I). After 21:00 on the DEVICE clock the menu
// offers, at most once per evening, a softer evening look: warmer colours, softer music and lighter
// haptics. Presentation only: rules, scores and ads are untouched. Only the local save remembers
// the answer; nothing is sent anywhere. The offer is never shown during a run or beside an ad, and it
// never invites the player to keep playing.
//
// v3: the evening offer is gone. The look is a Comfort setting, "Auto evening look":
//   settings.eveningLook  'auto' | 'off' (default 'auto'; older saves: on -> 'auto', off -> 'off', src/meta/migrateV3.js)
// The old eveningOffer / eveningAsked fields were removed by the v3 migration. shouldOfferEvening always answers no
// (kept so callers keep working until the new home screen lands); answerEvening still maps an answer onto the setting.
import { dayKey } from './daily.js';

export const EVENING_START_HOUR = 21; // 9 pm
export const EVENING_END_HOUR = 6;    // the evening look ends at 6 am

/** True from 21:00 to 05:59 local time. */
export function isEvening(date = new Date()) {
  const h = date.getHours();
  return h >= EVENING_START_HOUR || h < EVENING_END_HOUR;
}

/** The evening a moment belongs to, keyed by the date it started (00:30 belongs to the day before). */
export function eveningKey(date = new Date()) {
  if (date.getHours() >= EVENING_END_HOUR) return dayKey(date);
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1, 12);
  return dayKey(d);
}

/** Is the evening look on right now? */
export function eveningActive(save, date = new Date()) {
  return !!(save && save.settings && save.settings.eveningLook === 'auto') && isEvening(date);
}

/** No evening offer within this many seconds after a full-screen ad, so it never feels tied to one. */
export const EVENING_AD_GAP_S = 60;

/** v3: the menu no longer offers the evening look (it is the Comfort setting "Auto evening look"). Always false. */
export function shouldOfferEvening() {
  return false;
}

/** Map an old offer answer onto the setting: 'yes' -> 'auto', 'never' -> 'off'; anything else changes nothing. */
export function answerEvening(save, answer) {
  if (answer === 'yes') save.settings.eveningLook = 'auto';
  if (answer === 'never') save.settings.eveningLook = 'off';
}

/** settings.eveningLook: 'auto' | 'off' (a boolean from an older save maps on -> 'auto', off -> 'off'). */
export function sanitizeEvening(s) {
  const v = s.settings.eveningLook;
  s.settings.eveningLook = v === 'off' || v === false ? 'off' : 'auto';
}
