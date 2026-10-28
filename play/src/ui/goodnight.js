// Wind-down evening (src/meta/windDown.js): the quiet goodnight line on a result card and the Goodnight still.
// The line shows once per night after about 30 minutes of play with Evening calm on. It never blocks play (the card's own
// buttons stay where they are), it can be hidden, and it has nothing to do with ads: "Goodnight" goes Home with no
// interstitial, and the line sits beside whatever the card already shows. Presentation only.
import { el, esc, tap, $ } from './dom.js';
import { Svc } from '../meta/services.js';
import { equippedKeeper } from '../meta/keepers.js';
import { areaState, currentArea } from '../meta/cafe.js';
import { CAFE_AREAS, CAFE_AREA_BY_ID } from '../meta/cafeData.js';
import { paintBackdrop, paintWater, renderArea, cacheBounds, PAINT_ORDER, setCafeNight, cafeNight } from '../game/cafeArt.js';
import { paintNightSky } from '../game/cafeNight.js';
import { tallyLines, storeCalmAsked } from '../meta/windDown.js';
import { pieceWord } from '../game/tierNames.js';
import { ovenRowHtml, bindOvenRow } from './bakeView.js'; // Tonight's bake: the oven row (docs/UX_TONIGHTS_BAKE.md)
import { t as tr } from './i18n.js';

/** The line for a result card (empty unless main.js marked this result res.goodnight). */
export function goodnightLineHtml(res, save) {
  if (!res || !res.goodnight || res.autoplay) return '';
  const k = save ? equippedKeeper(save) : null;
  const who = k && k.name ? k.name : 'Pip';
  return `<div class="goodnight-line" data-goodnight-line><span>${tr('goodnight.says', { who: `<b>${esc(who)}:</b>`, line: esc(tr('goodnight.line')) })}</span>`
    + `<span class="gn-btns"><button class="btn small gn-go" data-goodnight>${esc(tr('goodnight.title'))}</button>`
    + `<button class="linkish gn-x" data-gn-hide aria-label="${esc(tr('goodnight.hideLabel'))}">${esc(tr('goodnight.hide'))}</button></span></div>`;
}

/**
 * The same line as the note slot of a result card (docs/UX_RESULT_CARDS.md §1): no buttons of its own. The card's
 * outlined way out becomes "Goodnight" ([data-goodnight]); ignoring it is enough, so there is no Hide.
 */
export function goodnightNoteHtml(res, save) {
  if (!res || !res.goodnight || res.autoplay) return '';
  const k = save ? equippedKeeper(save) : null;
  const who = k && k.name ? k.name : 'Pip';
  return `<p class="result-note-slot goodnight-note" data-goodnight-line>${tr('goodnight.says', { who: `<b>${esc(who)}:</b>`, line: esc(tr('goodnight.line')) })}</p>`;
}

/**
 * Wire a result card's line (screens.js open() calls this for every screen). The line counts as shown the moment it
 * is on screen, so it never comes back tonight, tapped or not. The Goodnight button sits in the line, or (note slot)
 * is the card's own secondary button.
 */
export function bindGoodnight(node, app) {
  const line = node && node.querySelector('[data-goodnight-line]');
  if (!line || !app) return;
  try { if (app.goodnightShown) app.goodnightShown(); } catch (e) { console.error(e); }
  const click = () => Svc.sfx('ui');
  tap(line.querySelector('[data-gn-hide]'), () => line.remove(), click);
  tap(line.querySelector('[data-goodnight]') || node.querySelector('[data-goodnight]'), () => {
    if (node.parentNode) node.remove(); // leave the result card quietly: no interstitial, nothing else opens
    showGoodnight(app);
  }, click);
}

/** The Goodnight screen: the café at night with tonight's tally, and one button back Home. */
export function showGoodnight(app) {
  const save = app.save;
  const st = app.goodnightTally ? app.goodnightTally() : { stars: 0, merges: 0 };
  const lines = tallyLines(st, pieceWord(true));
  let oven = '';
  try { oven = ovenRowHtml(save); } catch (e) { console.error(e); }
  const big = Number(save && save.settings && save.settings.textSize) >= 1.25;
  const node = el(`<div class="screen modal goodnight-screen"><div class="card goodnight-card${oven ? ' has-oven' : ''}${big ? ' big-text' : ''}" role="dialog" aria-label="${esc(tr('goodnight.title'))}">
    ${oven && big ? '' : `<canvas class="gn-still" aria-label="${esc(tr('goodnight.stillLabel'))}" role="img"></canvas>`}
    <h2>${esc(tr('goodnight.title'))}</h2>
    <p class="gn-sub">${esc(tr('goodnight.sub'))}</p>
    <ul class="gn-tally">${lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
    <p class="gn-sub">${esc(tr('goodnight.tally'))}</p>
    ${oven}
    <div class="gn-foot"><button class="btn primary" data-gn-home>${esc(tr('goodnight.home'))}</button></div>
  </div></div>`);
  const host = $('#screens');
  host.appendChild(node);
  if (oven) { try { bindOvenRow(node, app); } catch (e) { console.error(e); } }
  const done = () => {
    node.classList.add('leaving');
    setTimeout(() => { node.remove(); if (app.goodnightHome) app.goodnightHome(); }, 180);
  };
  tap(node.querySelector('[data-gn-home]'), done, () => Svc.sfx('ui'));
  requestAnimationFrame(() => paintGoodnightStill(node.querySelector('canvas.gn-still'), save));
  return node;
}

// ---- The one-time Evening calm offer (src/meta/windDown.js calmOfferDue, docs/UX_FIRST_WEEK.md F5): a plain choice on
// the way out, never pre-selected. It counts as asked the moment it is on screen, so it never comes back.

/** The offer's row: one line and two equal buttons. */
export function calmOfferHtml() {
  return `<div class="calm-offer" data-calm-offer role="group" aria-label="${esc(tr('calmOffer.title'))}">
    <p class="calm-offer-t"><b>${esc(tr('calmOffer.title'))}</b> ${esc(tr('calmOffer.body'))}</p>
    <div class="calm-offer-btns"><button class="btn small" data-calm-yes>${esc(tr('calmOffer.yes'))}</button>
    <button class="btn small ghost" data-calm-no>${esc(tr('calmOffer.no'))}</button></div></div>`;
}

/** Wire the row inside `node`. `after(on)` runs once she answers. */
export function bindCalmOffer(node, app, after) {
  const row = node && node.querySelector('[data-calm-offer]');
  if (!row || !app) return;
  storeCalmAsked();
  const click = () => Svc.sfx('ui');
  let answered = false;
  const answer = (on) => {
    if (answered) return;
    answered = true;
    if (on && app.setSetting) app.setSetting('eveningCalm', 'night');
    row.innerHTML = `<p class="calm-offer-t" role="status">${esc(on ? tr('calmOffer.onLine') : tr('calmOffer.offLine'))}</p>`;
    if (after) after(on);
  };
  tap(row.querySelector('[data-calm-yes]'), () => answer(true), click);
  tap(row.querySelector('[data-calm-no]'), () => answer(false), click);
}

/** The offer on its own small card (the way out had no other card). Either answer closes it. */
export function showCalmOffer(app, { onDone } = {}) {
  Svc.hideBanner();
  const node = el(`<div class="screen modal calm-offer-screen"><div class="card calm-offer-card" role="dialog" aria-label="${esc(tr('calmOffer.title'))}">
    ${calmOfferHtml()}
  </div></div>`);
  $('#screens').appendChild(node);
  let done = false;
  const finish = () => {
    if (done) return; done = true;
    node.classList.add('leaving');
    setTimeout(() => { node.remove(); if (onDone) onDone(); }, 180);
  };
  bindCalmOffer(node, app, () => setTimeout(finish, 1100));
  return node;
}

/** The café area the player last looked at (or is restoring), at night. Painted once; nothing animates. */
export function paintGoodnightStill(canvas, save) {
  if (!canvas || !canvas.getContext) return;
  const dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
  const cssW = canvas.clientWidth || 320, cssH = canvas.clientHeight || Math.round(cssW * 0.72);
  canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
  const g = canvas.getContext('2d');
  const c = save && save.cafe;
  const area = (c && CAFE_AREA_BY_ID[c.cam]) || currentArea(save) || CAFE_AREAS[CAFE_AREAS.length - 1];
  const worldW = 1150, s = canvas.width / worldW, worldH = canvas.height / s;
  const cx = area.cam.x, cy = area.cam.y + 40;
  const view = { x0: cx - worldW / 2, x1: cx + worldW / 2, y0: cy - worldH / 2, y1: cy + worldH / 2 };
  const was = cafeNight();
  setCafeNight(true);
  try {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#2b2338'; g.fillRect(0, 0, canvas.width, canvas.height);
    g.setTransform(s, 0, 0, s, -view.x0 * s, -view.y0 * s);
    paintBackdrop(g, view, { reduced: true });
    paintWater(g, view, 0, true);
    paintNightSky(g, view, { reduced: true });
    for (const id of PAINT_ORDER) {
      const b = cacheBounds(id);
      if (b[2] < view.x0 || b[0] > view.x1 || b[3] < view.y0 || b[1] > view.y1) continue;
      const st = areaState(save, id);
      if (!st) continue;
      const done = {};
      for (const t of st.tasks) if (t.style >= 0) done[t.id] = t.style;
      const e = renderArea(id, { done, built: st.built, total: st.total }, s);
      if (e) g.drawImage(e.canvas, e.x0, e.y0, e.w, e.h);
    }
    // a soft vignette, like a photo taken by lamplight
    g.setTransform(1, 0, 0, 1, 0, 0);
    const vg = g.createRadialGradient(canvas.width / 2, canvas.height * 0.55, canvas.width * 0.3, canvas.width / 2, canvas.height * 0.55, canvas.width * 0.8);
    vg.addColorStop(0, 'rgba(30,20,40,0)'); vg.addColorStop(1, 'rgba(30,20,40,0.45)');
    g.fillStyle = vg; g.fillRect(0, 0, canvas.width, canvas.height);
  } catch (e) { console.error(e); } finally { setCafeNight(was); }
}
