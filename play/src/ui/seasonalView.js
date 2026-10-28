// The season card (DESIGN.md "Seasonal events"): this season's basket, its path of free rewards and the café
// decorations toggle. Opened from Home's Today sheet. Calm by design: no countdown, no timer, no paid boost;
// one soft line says when the free path ends. Rules: src/meta/seasonal.js.
// Season Keepsakes (paid, cosmetic only): one quiet row per set under the free path, a calm line and the price. No end
// date, no badge, no pulsing lock. This card is the only place they are offered.
import { el, fmt, esc, tap } from './dom.js';
import { t as tr } from './i18n.js'; // `tr`: `t` is a local name in this file
import { Svc } from '../meta/services.js';
import { dayKey } from '../meta/daily.js';
import { seasonOpen } from '../meta/onboarding.js';
import { uiLook } from '../meta/looks.js';
import { word } from './copy.js';
import { seasonView, markSeasonSeen, seasonAt, tokenWord, decorName, decorAll, keepsakesOffered, keepsakesOwned, KEEPSAKE_BY_ID } from '../meta/seasonal.js';
import { IAP } from '../meta/economy.js';
import * as S from './screens.js'; // circular on purpose: only used inside functions, never at load time

const click = () => Svc.sfx('ui');
/** A table line with markup in some placeholders: the line is escaped, then each {name} in `parts` gets its ready HTML. */
const trHtml = (line, parts) => esc(line).replace(/\{(\w+)\}/g, (m, k) => (Object.prototype.hasOwnProperty.call(parts, k) ? String(parts[k]) : m));
const bold = (s) => `<b>${esc(s)}</b>`;


export const APPLE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7.2c-1.4-1.2-4.6-1.5-6.2.6-1.9 2.5-.9 7.3 1.5 9.8 1.4 1.4 2.8 1.6 4.7.9 1.9.7 3.3.5 4.7-.9 2.4-2.5 3.4-7.3 1.5-9.8-1.6-2.1-4.8-1.8-6.2-.6z" fill="#d8453a" stroke="#6b4a3a" stroke-width="1.4" stroke-linejoin="round"/><path d="M12 7.2c0-1.6.5-3 1.6-4" fill="none" stroke="#6b4a3a" stroke-width="1.6" stroke-linecap="round"/><path d="M13 4.6c1.6-.9 3.3-.6 4.1.2-1.2 1-2.8 1.1-4.1-.2z" fill="#7fa043" stroke="#6b4a3a" stroke-width="1" stroke-linejoin="round"/></svg>';
export const PUMPKIN_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="7.6" cy="14" rx="5" ry="6.2" fill="#d0802e" stroke="#6b4a3a" stroke-width="1.3"/><ellipse cx="16.4" cy="14" rx="5" ry="6.2" fill="#d0802e" stroke="#6b4a3a" stroke-width="1.3"/><ellipse cx="12" cy="14" rx="5" ry="6.6" fill="#e8873a" stroke="#6b4a3a" stroke-width="1.3"/><path d="M11.2 7.6c0-1.6.3-2.8 1.4-3.8" fill="none" stroke="#5f7a34" stroke-width="2" stroke-linecap="round"/></svg>';
export const LEAF_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21.5v-5.2M12 16.3l-1.4-2.6-4.7 1.6 1.3-3.3-3.5-2.8 3.6-.7-.9-3.9 3 2 2.6-4.3 2.6 4.3 3-2-.9 3.9 3.6.7-3.5 2.8 1.3 3.3-4.7-1.6z" fill="#e0922e" stroke="#6b4a3a" stroke-width="1.3" stroke-linejoin="round"/></svg>';
const HAT_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 16.5C4.6 9.8 19.4 9.8 19.5 16.5z" fill="#c8643c" stroke="#6b4a3a" stroke-width="1.4" stroke-linejoin="round"/><path d="M4 16.2h16v3H4z" fill="#f6e6c8" stroke="#6b4a3a" stroke-width="1.4" stroke-linejoin="round"/><circle cx="12" cy="8.2" r="2.4" fill="#fbf3e4" stroke="#6b4a3a" stroke-width="1.4"/></svg>';
const DECOR_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5c3 3.5 15 3.5 18 0" fill="none" stroke="#8a6a4a" stroke-width="1.5"/><path d="M6.5 6.8l-1.6 4 3.4-1.4z" fill="#d8573a" stroke="#6b4a3a" stroke-width="1"/><path d="M12 7.6l-1.6 4.2h3.2z" fill="#e8913a" stroke="#6b4a3a" stroke-width="1"/><path d="M17.5 6.8l1.6 4-3.4-1.4z" fill="#c9a23a" stroke="#6b4a3a" stroke-width="1"/><ellipse cx="9" cy="18" rx="4" ry="3.4" fill="#e8873a" stroke="#6b4a3a" stroke-width="1.2"/><ellipse cx="16" cy="18.6" rx="3" ry="2.6" fill="#f0a24a" stroke="#6b4a3a" stroke-width="1.2"/></svg>';
const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// Frost & Lanterns (winter)
const SNOWFLAKE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><g stroke="#5f86b0" stroke-width="2" stroke-linecap="round" fill="none"><path d="M12 2.8v18.4M4 7.4l16 9.2M4 16.6l16-9.2"/><path d="M9.6 4.2L12 6.4l2.4-2.2M9.6 19.8L12 17.6l2.4 2.2M4.6 10.4l3.1-1-.7-3.2M19.4 13.6l-3.1 1 .7 3.2M4.6 13.6l3.1 1-.7 3.2M19.4 10.4l-3.1-1 .7-3.2"/></g><circle cx="12" cy="12" r="1.8" fill="#dcecff" stroke="#5f86b0" stroke-width="1.2"/></svg>';
const COCOA_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.6 7.4c-.8-1.4.8-2.2 0-3.6M12.4 7.4c-.8-1.4.8-2.2 0-3.6" fill="none" stroke="#b9a48e" stroke-width="1.4" stroke-linecap="round"/><path d="M17.6 11.4h1.2a2.6 2.6 0 0 1 0 5.2h-1.6" fill="none" stroke="#6b4a3a" stroke-width="1.6"/><path d="M4.4 9h13.4v7.6a4 4 0 0 1-4 4H8.4a4 4 0 0 1-4-4z" fill="#c8545a" stroke="#6b4a3a" stroke-width="1.4" stroke-linejoin="round"/><path d="M4.4 12.6h13.4" stroke="#f6e6c8" stroke-width="1.6"/><ellipse cx="11.1" cy="9" rx="6.7" ry="1.6" fill="#7a4a32" stroke="#6b4a3a" stroke-width="1.2"/><circle cx="9.4" cy="8.6" r="1.3" fill="#fbf3e4"/><circle cx="12.6" cy="8.8" r="1.1" fill="#fbf3e4"/></svg>';
const PINECONE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6c-1.2 1-1.6 2-1.4 2.6" fill="none" stroke="#5f7a34" stroke-width="1.6" stroke-linecap="round"/><path d="M12 4.6c4.6 0 7 5.6 5.4 10.6-1 3.2-3.2 5.4-5.4 6.4-2.2-1-4.4-3.2-5.4-6.4C5 10.2 7.4 4.6 12 4.6z" fill="#a8703f" stroke="#6b4a3a" stroke-width="1.4" stroke-linejoin="round"/><path d="M7.2 9.4l4.8 3 4.8-3M6.4 13.4l5.6 3.4 5.6-3.4M8.2 17.4l3.8 2.4 3.8-2.4M9 6.6l3 2 3-2" fill="none" stroke="#6b4a3a" stroke-width="1.2" stroke-linejoin="round"/></svg>';
const EARMUFFS_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.4 13.4C5 6.4 19 6.4 18.6 13.4" fill="none" stroke="#6b4a3a" stroke-width="3.4" stroke-linecap="round"/><path d="M5.4 13.4C5 6.4 19 6.4 18.6 13.4" fill="none" stroke="#9fb6d4" stroke-width="1.8" stroke-linecap="round"/><circle cx="5.4" cy="15" r="3.8" fill="#f6dfe6" stroke="#6b4a3a" stroke-width="1.4"/><circle cx="18.6" cy="15" r="3.8" fill="#f6dfe6" stroke="#6b4a3a" stroke-width="1.4"/><circle cx="4.4" cy="14" r="1.1" fill="#fff"/><circle cx="17.6" cy="14" r="1.1" fill="#fff"/></svg>';
const WINTER_DECOR_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 4.6c3 3.4 17 3.4 20 0" fill="none" stroke="#6b5a4a" stroke-width="1.3"/><circle cx="6.4" cy="9" r="2.6" fill="#f6c45a" stroke="#6b4a3a" stroke-width="1"/><circle cx="12" cy="10" r="2.6" fill="#f39a6a" stroke="#6b4a3a" stroke-width="1"/><circle cx="17.6" cy="9" r="2.6" fill="#f6c45a" stroke="#6b4a3a" stroke-width="1"/><circle cx="12" cy="20" r="3.4" fill="#fbfdff" stroke="#6b4a3a" stroke-width="1.2"/><circle cx="12" cy="15.2" r="2.4" fill="#fbfdff" stroke="#6b4a3a" stroke-width="1.2"/><path d="M12 15.4l2.2.4-2.2.5z" fill="#e8873a"/></svg>';

// Each season's icons and colour theme (a season without an entry uses the autumn set).
const SEASON_ART = {
  'harvest-2026': { theme: 'sn-autumn', slot: { level: APPLE_ICON, daily: PUMPKIN_ICON, free: LEAF_ICON }, outfit: HAT_ICON, decor: DECOR_ICON, row: LEAF_ICON },
  'winter-2026': { theme: 'sn-winter', slot: { level: SNOWFLAKE_ICON, daily: COCOA_ICON, free: PINECONE_ICON }, outfit: EARMUFFS_ICON, decor: WINTER_DECOR_ICON, row: SNOWFLAKE_ICON },
};
const artOf = (season) => (season && SEASON_ART[season.id]) || SEASON_ART['harvest-2026'];

/** The Today sheet's season row icon when a row has none of its own (seasonRow gives each season's). */
export const SEASON_ICON = LEAF_ICON;

const stepIcon = (st, art) => (st.kind === 'coins' ? '<span class="coin"></span>' : st.kind === 'outfit' ? art.outfit : art.decor);

/** Today row data for this save and day, or null (no season, or not open yet). Keepsakes show after a season. */
export function seasonRow(save, day = dayKey()) {
  if (!seasonOpen(save)) return null;
  const v = seasonView(save, day);
  if (v) {
    // UX_OPPORTUNITIES 8: say what it is and how far the next gift is, plus a thin bar (goal-gradient)
    const base = v.done ? tr('season.row.done') : tr('season.row.progress', { n: fmt(v.n), at: fmt(v.next.at) });
    // gifts already given but not looked at are a quiet line, never a red dot: there is nothing to collect
    // (docs/UX_FIRST_WEEK.md F2; a badge is only a count of things she can collect now)
    const sub = v.newCount > 0 ? tr('season.row.new', { sub: base }) : base;
    const bar = v.done ? 1 : Math.max(0, Math.min(1, v.n / v.next.at));
    return { name: v.season.name, sub, bar, n: 0, icon: artOf(v.season).row };
  }
  // between seasons: the decorations earned before stay; this row lets the player tuck them away or bring them back
  // (and, for someone who took part in a season, still buy that season's keepsake set)
  if (decorAll(save).length) return { name: tr('season.keepsakes'), sub: save.seasonal && save.seasonal.decorOff ? tr('season.row.tucked') : tr('season.row.out'), n: 0 };
  if (keepsakesShown(save, day).length) return { name: tr('season.keepsakes'), sub: tr('season.row.earlier'), n: 0 };
  return null;
}

/** Between seasons, keepsake sets are offered only to a player who took part in a season (no sale-only row otherwise). */
function tookPart(save) {
  const s = save.seasonal;
  return !!(s && (s.id || s.met || (Array.isArray(s.decor) && s.decor.length))) || keepsakesOwned(save).length > 0;
}

/** Keepsake sets the card offers on `day` (none between seasons for someone who never took part). */
function keepsakesShown(save, day) {
  if (!seasonAt(day) && !tookPart(save)) return [];
  return keepsakesOffered(save, day);
}

const priceOf = (k) => (IAP.find((x) => x.id === k.product) || {}).price || '';

/** The Season Keepsakes rows: one calm line and the price for each set on offer, then the postcard-frame switch. */
function keepsakesHtml(save, day) {
  const rows = keepsakesShown(save, day).map((k) => `<div class="c-row sn-ks">
      <div class="c-text"><div class="c-name">${esc(k.name)}</div><div class="c-sub">${esc(k.line)}</div></div>
      <button class="btn sn-ks-buy" data-season-ks="${esc(k.id)}" aria-label="${esc(tr('season.ks.buyAria', { name: k.name, price: priceOf(k) }))}">${esc(priceOf(k))}</button></div>`).join('');
  const owned = keepsakesOwned(save);
  const on = !(save.seasonal && save.seasonal.frameOff === true);
  const frame = owned.length ? `<button class="c-row sn-decor" data-frame role="switch" aria-checked="${on ? 'true' : 'false'}">
      <div class="c-text"><div class="c-name">${esc(tr('season.ks.frame'))}</div><div class="c-sub">${esc(owned.map((k) => k.frame).join(', '))}</div></div>
      <span class="sn-switch${on ? ' on' : ''}" aria-hidden="true"><i></i></span></button>` : '';
  return rows + frame;
}

/**
 * The Home "New" moment for a season (once per season), shaped like a homeNav moment. Null when not due.
 * `markSeasonMet` records it as shown.
 */
export function seasonMoment(save, day = dayKey()) {
  if (!seasonOpen(save)) return null;
  const season = seasonAt(day);
  if (!season || (save.seasonal && save.seasonal.met === season.id)) return null;
  return {
    key: 'season', at: ['today'], open: 'today', row: 'season',
    title: tr('season.moment.title', { name: season.name }),
    // short on purpose (UX_OPPORTUNITIES 8): the card sits in the button area, and a long text pushed the café up
    text: tr('season.moment.text', { tokens: tokenWord(season, 'level', 2) }),
    go: tr('season.moment.go'),
  };
}

export function markSeasonMet(save, day = dayKey()) {
  const season = seasonAt(day);
  if (season && save.seasonal) save.seasonal.met = season.id;
}

/** HTML of the season card (pure: tests render it without a DOM). */
export function seasonCardHtml(save, day = dayKey()) {
  const v = seasonView(save, day);
  if (!v) return betweenHtml(save, day);
  const look = uiLook(save);
  const { season } = v;
  const art = artOf(season);
  const tok = (slot, n) => `${fmt(n)} ${esc(tokenWord(season, slot, n))}`;
  const basket = ['level', 'daily', 'free'].map((slot) => `<div class="sn-tok">${art.slot[slot]}<b>${fmt(v.bag[slot] || 0)}</b><span>${esc(tokenWord(season, slot, 2))}</span></div>`).join('');
  const steps = v.steps.map((st) => {
    const state = st.got ? 'got' : (v.next && v.next.index === st.index ? 'next' : 'later');
    const right = st.got ? `<span class="sn-yours">${CHECK}${esc(tr('season.yours'))}</span>` : `<span class="sn-left">${esc(tr('season.left', { n: fmt(st.left) }))}</span>`;
    return `<li class="sn-step ${state}${st.isNew ? ' fresh' : ''}"><span class="sn-at">${fmt(st.at)}</span><span class="sn-ico">${stepIcon(st, art)}</span>
      <span class="sn-name">${esc(st.name)}${st.isNew ? ` <span class="nav-tag">${esc(tr('season.newTag'))}</span>` : ''}</span>${right}</li>`;
  }).join('');
  const pct = Math.min(100, Math.round((v.n / season.steps[season.steps.length - 1].at) * 100));
  return `<div class="screen modal"><div class="card comfort-card sn-card ${art.theme}" role="dialog" aria-label="${esc(season.name)}">
    <h2>${esc(season.name)}</h2>
    <p class="sn-when">${esc(tr('season.when', { name: season.short || season.name, end: season.endText }))}</p>
    <div class="sn-basket" aria-label="${trHtml(tr('season.basketAria'), { level: tok('level', v.bag.level), daily: tok('daily', v.bag.daily), free: tok('free', v.bag.free) })}">${basket}</div>
    <div class="sn-bar" aria-hidden="true"><i style="width:${pct}%"></i></div>
    <p class="sn-how">${trHtml(tr('season.how', { dailyName: word('dailyPuzzle', look), freeName: word('freePlay', look) }), { level: bold(tokenWord(season, 'level', 2)), daily: bold(tokenWord(season, 'daily', 2)), free: bold(tokenWord(season, 'free', 2)) })}</p>
    <ol class="sn-path">${steps}</ol>
    <p class="sn-keep">${esc(tr('season.keep'))}</p>
    ${keepsakesHtml(save, day)}
    ${decorToggleHtml(save, tr('season.touches'))}
    <button class="btn primary" data-x>${esc(tr('season.back'))}</button>
  </div></div>`;
}

function decorToggleHtml(save, title) {
  const decor = decorAll(save);
  if (!decor.length) return '';
  const on = !(save.seasonal && save.seasonal.decorOff);
  return `<button class="c-row sn-decor" data-decor role="switch" aria-checked="${on ? 'true' : 'false'}">
      <div class="c-text"><div class="c-name">${esc(title)}</div><div class="c-sub">${esc(decor.map(decorName).join(', '))}</div></div>
      <span class="sn-switch${on ? ' on' : ''}" aria-hidden="true"><i></i></span></button>`;
}

/** Between seasons: the decorations kept from earlier seasons, the same show/hide switch, and the keepsake sets. */
function betweenHtml(save, day) {
  const t = decorToggleHtml(save, tr('season.showThem'));
  const ks = keepsakesHtml(save, day);
  if (!t && !ks) return '';
  return `<div class="screen modal"><div class="card comfort-card sn-card" role="dialog" aria-label="${esc(tr('season.keepsakes'))}">
    <h2>${esc(tr('season.keepsakes'))}</h2>
    <p class="sn-keep">${esc(tr('season.keepEarlier'))}</p>
    ${ks}
    ${t}
    <button class="btn primary" data-x>${esc(tr('season.back'))}</button>
  </div></div>`;
}

/** Open the season card. Marks the path seen (nothing is "new" afterwards). */
export function showSeasonCard(app, day = dayKey()) {
  const save = app.save;
  const html = seasonCardHtml(save, day);
  if (!html) return null;
  const s = S.openScreen(el(html));
  markSeasonSeen(save, day);
  app.persist();
  wireCard(app, s, day);
  return s;
}

function switchRow(s, sel, on) {
  const b = s.querySelector(sel);
  if (!b) return;
  b.setAttribute('aria-checked', on ? 'true' : 'false');
  const sw = b.querySelector('.sn-switch');
  if (sw) sw.classList.toggle('on', on);
}

function wireCard(app, s, day) {
  const save = app.save;
  const seasonal = () => { if (!save.seasonal || typeof save.seasonal !== 'object') save.seasonal = { id: '', n: 0, bag: { level: 0, daily: 0, free: 0 }, got: 0, seen: 0, met: '', decor: [], decorOff: false }; return save.seasonal; };
  tap(s.querySelector('[data-decor]'), () => {
    const sn = seasonal();
    sn.decorOff = !sn.decorOff;
    app.persist();
    switchRow(s, '[data-decor]', !sn.decorOff);
  }, click);
  tap(s.querySelector('[data-frame]'), () => {
    const sn = seasonal();
    if (sn.frameOff === true) delete sn.frameOff; else sn.frameOff = true; // written only when true (sanitizeSeasonal)
    app.persist();
    switchRow(s, '[data-frame]', sn.frameOff !== true);
  }, click);
  for (const b of s.querySelectorAll('[data-season-ks]')) {
    tap(b, async () => {
      const k = KEEPSAKE_BY_ID[b.dataset.seasonKs];
      const item = k && IAP.find((x) => x.id === k.product);
      // the labelled purchase stub (screens.js): the set is granted only after the (simulated) purchase is confirmed
      if (!item || !(await S.buyIap(app, item))) return;
      const html = seasonCardHtml(save, day);
      if (!html) return;
      const fresh = el(html);
      const card = s.querySelector('.sn-card'), next = fresh.querySelector ? fresh.querySelector('.sn-card') : null;
      if (card && next && card.replaceWith) { card.replaceWith(next); wireCard(app, s, day); }
    }, click);
  }
  tap(s.querySelector('[data-x]'), () => S.closeScreen(s), click);
}
