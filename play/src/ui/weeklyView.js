// "Your puzzle week" UI (src/meta/weekly.js): the once-a-week recap card on the menu and the
// "This week" / "Last week" section at the top of Settings › Journal. No rewards and no buttons that push play.
// Styles live here (injected once) so this feature stays out of the shared stylesheet.
import { $, el, esc, tap } from './dom.js';
import { t as tr } from './i18n.js';
import { Svc } from '../meta/services.js';
import { weekSummary } from '../meta/weekly.js';

const click = () => Svc.sfx('ui');
const dayLetters = () => [tr('week.letter.mon'), tr('week.letter.tue'), tr('week.letter.wed'), tr('week.letter.thu'), tr('week.letter.fri'), tr('week.letter.sat'), tr('week.letter.sun')];
const dayNames = () => [tr('week.day.mon'), tr('week.day.tue'), tr('week.day.wed'), tr('week.day.thu'), tr('week.day.fri'), tr('week.day.sat'), tr('week.day.sun')];

const CSS = `
/* above the menu rail (z-index 2 inside the menu screen) */
.screen.modal.week-modal { z-index: 3; }
.week-card { text-align: center; }
.week-card h2 { margin-bottom: 2px; }
.week-range { color: var(--muted); font-size: calc(14px * var(--ts)); margin: 0 0 10px; }
.week-head { color: #fff; font-size: calc(17px * var(--ts)); line-height: 1.4; margin: 6px 0 10px; }
.week-card.quiet .week-head { color: #cfe0ff; font-style: italic; }
.week-days { display: flex; justify-content: center; gap: 6px; margin: 4px 0 12px; }
.week-days span { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; font-size: calc(13px * var(--ts)); font-weight: 700;
  color: var(--muted); border: 1px solid var(--stroke); background: var(--well, rgba(0,0,0,.18)); }
.week-days span.on { color: #1a0f3a; background: radial-gradient(circle at 40% 35%, #fff6c8, #ffd54a 60%, #e0a21c); border-color: #ffe48a; box-shadow: 0 0 10px rgba(255,213,74,.45); }
.week-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; text-align: left; }
.week-grid .j-stat.wide { grid-column: 1 / -1; }
.week-fine { color: var(--muted); font-size: calc(15px * var(--ts)); margin: 10px 0 12px; }
.week-seg { display: flex; gap: 6px; margin: 2px 0 8px; }
.week-seg button { flex: 1; min-height: 44px; border-radius: 12px; border: 1px solid var(--stroke); background: var(--well, rgba(0,0,0,.2)); color: var(--muted);
  font: inherit; font-weight: 700; font-size: calc(15px * var(--ts)); cursor: pointer; min-height: 48px; }
.week-seg button.on { background: var(--panel, rgba(255,255,255,.12)); color: var(--ink-strong, #fff); border-color: var(--ink-soft, rgba(255,255,255,.35)); }
.week-pane .week-head { text-align: center; font-size: calc(15px * var(--ts)); margin: 4px 0 8px; }
.week-pane .week-range { text-align: center; margin: 0; }
`;

let cssDone = false;
function ensureCss() {
  if (cssDone) return;
  try {
    const s = document.createElement('style');
    s.id = 'weekly-css';
    s.textContent = CSS;
    document.head.appendChild(s);
    cssDone = true;
  } catch (_) { /* no full DOM (tests) */ }
}

function daysHtml(bits) {
  return `<div class="week-days" role="img" aria-label="${esc(tr('week.daysPlayed', { days: dayNames().filter((_, i) => bits & (1 << i)).join(', ') || tr('week.daysNone') }))}">${
    dayLetters().map((l, i) => `<span class="${bits & (1 << i) ? 'on' : ''}">${esc(l)}</span>`).join('')}</div>`;
}

function statsHtml(sum) {
  return `<div class="week-grid">${sum.stats.map((s, i) => `<div class="j-stat${i === sum.stats.length - 1 && sum.stats.length % 2 ? ' wide' : ''}"><b class="${s.tier ? 'j-tier' : ''}">${esc(s.value)}</b><span>${esc(s.label)}</span></div>`).join('')}</div>`;
}

/** The weekly recap card (menu, once a week). onClose() when it is dismissed. */
export function showWeeklyCard(app, onClose, now = new Date()) {
  ensureCss();
  const sum = weekSummary(app.save, 'last', now);
  const node = el(`<div class="screen modal week-modal"><div class="card week-card${sum.quiet ? ' quiet' : ''}" role="dialog" aria-modal="true" aria-labelledby="week-title">
    <h2 id="week-title">${esc(sum.title)}</h2>
    <p class="week-range">${esc(tr('week.lastRange', { range: sum.range }))}</p>
    <p class="week-head">${esc(sum.headline)}</p>
    ${daysHtml(sum.dayBits)}
    ${sum.quiet ? '' : statsHtml(sum)}
    <p class="week-fine">${esc(tr('week.fine'))}</p>
    <button class="btn primary" data-x>${esc(tr('common.close'))}</button>
  </div></div>`);
  $('#screens').appendChild(node);
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    node.classList.add('leaving');
    setTimeout(() => { node.remove(); if (onClose) onClose(); }, 180);
  };
  tap(node.querySelector('[data-x]'), finish, click);
  return node;
}

/** "This week" / "Last week" section for the top of Settings › Journal. Call bindWeeklyJournal after inserting it. */
export function weeklyJournalHtml(save, which = 'this', now = new Date()) {
  ensureCss();
  return `<h3 class="more-h3">${esc(tr('week.journalTitle'))}</h3>
    <div class="week-seg" role="group" aria-label="${esc(tr('week.which'))}">
      <button data-week="this" aria-pressed="${which === 'this'}" class="${which === 'this' ? 'on' : ''}">${esc(tr('week.this'))}</button>
      <button data-week="last" aria-pressed="${which === 'last'}" class="${which === 'last' ? 'on' : ''}">${esc(tr('week.last'))}</button>
    </div>
    <div class="week-pane" data-weekpane>${paneHtml(save, which, now)}</div>`;
}

function paneHtml(save, which, now) {
  const sum = weekSummary(save, which, now);
  return `<p class="week-range">${esc(sum.range)}</p><p class="week-head">${esc(sum.headline)}</p>${daysHtml(sum.dayBits)}${statsHtml(sum)}`;
}

export function bindWeeklyJournal(container, save, now = new Date()) {
  const pane = container.querySelector('[data-weekpane]');
  for (const b of container.querySelectorAll('[data-week]')) {
    tap(b, () => {
      for (const o of container.querySelectorAll('[data-week]')) { const on = o === b; o.classList.toggle('on', on); o.setAttribute('aria-pressed', String(on)); }
      pane.innerHTML = paneHtml(save, b.dataset.week, now);
    }, click);
  }
}
