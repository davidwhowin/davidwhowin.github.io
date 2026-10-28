// Wind-down evening (v0.6.26). An opt-in Comfort setting for players who unwind with the game at night:
//   settings.eveningCalm  'off' | 'night' | 'always'  (default 'off'; 'night' = from 9 pm to 6 am on the device clock)
//   settings.eveningWaves  bool (default false): the "Slow waves" backdrop plays instead of the songs while calm is on
// While calm is on: the warm evening look (and the café at night), music and sound effects about 30% quieter, the calmest
// song. After about 30 minutes of play in one night, one quiet line on a result card: "Lovely session. The café will be here
// tomorrow." with a Goodnight button (a café-at-night still with tonight's tally). Once per night, dismissable, never blocks
// play, and never shown when the setting is off.
//
// Presentation only: rules, scores, rewards and ads are untouched, and the line is never tied to ads or interstitial timing
// (it sits beside whatever the card already shows; "Goodnight" leaves without an interstitial). The nightly tally lives in
// its own device-local key, not in the save, so it never travels in a transfer code and the save shape stays shared with C#.
import { isEvening, eveningKey } from './evening.js';
import { tp } from '../i18n/index.js'; // pure lookup, no UI imports (docs/LOCALISATION.md phase 4)

export const CALM_MODES = ['off', 'night', 'always'];
/** Minutes of play in one night (calm on) before the goodnight line may show. */
export const GOODNIGHT_AFTER_S = 30 * 60;
/** A single run never adds more than this to the night's play time (a phone left on a paused board). */
export const MAX_RUN_S = 45 * 60;
export const WIND_DOWN_KEY = 'novadrop.winddown.v1';

/** settings.eveningCalm: 'off' | 'night' | 'always'; settings.eveningWaves: bool. Unknown values fall back to the defaults. */
export function sanitizeEveningCalm(s) {
  const st = s.settings;
  st.eveningCalm = CALM_MODES.includes(st.eveningCalm) ? st.eveningCalm : 'off';
  st.eveningWaves = st.eveningWaves === true;
}

/** Is evening calm on right now? */
export function calmActive(save, date = new Date()) {
  const m = save && save.settings && save.settings.eveningCalm;
  return m === 'always' || (m === 'night' && isEvening(date));
}

/** Tonight's record ({ key, playS, shown, stars, merges }); a record from an earlier night starts fresh. */
export function nightState(raw, date = new Date()) {
  const key = eveningKey(date);
  const ok = raw && typeof raw === 'object' && raw.key === key;
  const n = (v) => (Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
  return {
    key,
    playS: ok ? n(raw.playS) : 0,
    shown: ok ? raw.shown === true : false,
    stars: ok ? n(raw.stars) : 0,
    merges: ok ? n(raw.merges) : 0,
  };
}

/**
 * A finished (non-autoplay) round while calm is on: count its play time and tally. Returns tonight's new record.
 * Calm off: nothing is counted (the record is returned unchanged apart from rolling over to tonight).
 */
export function recordRound(save, raw, res, date = new Date()) {
  const st = nightState(raw, date);
  if (!calmActive(save, date) || !res || res.autoplay) return st;
  const secs = Number(res.durationSec);
  st.playS += Math.min(MAX_RUN_S, Number.isFinite(secs) && secs > 0 ? Math.round(secs) : 0);
  st.merges += Number.isFinite(res.merges) && res.merges > 0 ? Math.floor(res.merges) : 0;
  if (res.won && Number.isFinite(res.stars) && res.stars > 0) st.stars += Math.floor(res.stars);
  return st;
}

/** Show the goodnight line on this result card? Once per night, after ~30 minutes of calm play, never with calm off. */
export function goodnightDue(save, raw, date = new Date()) {
  if (!calmActive(save, date)) return false;
  const st = nightState(raw, date);
  return !st.shown && st.playS >= GOODNIGHT_AFTER_S;
}

/** The line was shown (whether or not the player tapped it): not again tonight. */
export function markGoodnightShown(raw, date = new Date()) {
  const st = nightState(raw, date);
  st.shown = true;
  return st;
}

/** Device-local storage for tonight's record (never part of the save or a transfer code). */
export function loadNight(storage = globalThis.localStorage) {
  try { return JSON.parse(storage.getItem(WIND_DOWN_KEY) || 'null'); } catch { return null; }
}
export function storeNight(st, storage = globalThis.localStorage) {
  try { storage.setItem(WIND_DOWN_KEY, JSON.stringify(st)); } catch { /* private mode: the line simply may show again */ }
}

/** Plain-language tally for the Goodnight still ("3 stars earned · 412 pieces merged"). */
export function tallyLines(st, pieceWord = 'pieces') {
  const f = (v) => v.toLocaleString('en-US');
  const out = [];
  if (st.stars > 0) out.push(tp('tally.stars', st.stars, { n: f(st.stars) }));
  out.push(tp('tally.merged', st.merges, { n: f(st.merges), piece: st.merges === 1 ? pieceWord.replace(/s$/, '') : pieceWord }));
  return out;
}

// ---- The one-time Evening calm offer (docs/UX_FIRST_WEEK.md F5). Evening calm is off by default and lives in
// Settings › Comfort, so a new player almost never finds it (and the Goodnight line needs it). Once only: on her second
// or later play day, in the evening (9 pm to 6 am), on the "Done for now" path, while calm is still off. A plain
// choice, never pre-selected; asked once whatever the answer. The "asked" mark is device-local, like the nightly
// tally, so the save shape stays shared with C#. Presentation only: no ads, rewards, rules or scores.
export const CALM_OFFER_KEY = 'novadrop.calmoffer.v1';

/** Offer Evening calm now? `asked`: the device-local mark (loadCalmAsked). */
export function calmOfferDue(save, asked, date = new Date()) {
  if (asked) return false;
  const st = save && save.settings;
  if (!st || (st.eveningCalm || 'off') !== 'off') return false;
  const days = save.playDays && Number(save.playDays.n);
  if (!(days >= 2)) return false;
  return isEvening(date);
}
export function loadCalmAsked(storage = globalThis.localStorage) {
  try { return !!(storage && storage.getItem(CALM_OFFER_KEY)); } catch { return false; }
}
export function storeCalmAsked(storage = globalThis.localStorage) {
  try { storage.setItem(CALM_OFFER_KEY, '1'); } catch { /* private mode: it may be offered once more */ }
}
