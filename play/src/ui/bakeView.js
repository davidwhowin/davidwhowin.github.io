// Tonight's bake (src/meta/bakes.js, docs/UX_TONIGHTS_BAKE.md): the oven card on the way out, the Goodnight oven row,
// the Home strip, the reveal sheet and the Bake Book. Presentation only: no coins, no ads, nothing beside an ad (the
// banner is hidden while a card shows). Calm and reduced motion: everything still.
import { el, esc, tap, $ } from './dom.js';
import { t as tr } from './i18n.js';
import { Svc } from '../meta/services.js';
import { tierName } from '../game/tierNames.js';
import { drawCafeClassics, drawBakeArt } from '../game/cafeClassicsArt.js';
import { EVENING_AD_GAP_S } from '../meta/evening.js';
import { calmOfferHtml, bindCalmOffer } from './goodnight.js'; // circular on purpose: used inside functions only
import {
  BAKES, BAKE_TIER, BAKE_COPY, bakeById, bakeArtTier, bakeOffers, bakeIntro, markOffered, pickBake, declineBake,
  revealBake, bakeReady, ovenBake, ovenOfferOpen, bookCount, bakedCount, bakeTileLine, bakeTileAria, bakedTimesLine,
  bakeFineLine, bakePickedLine, bakeStillWarmLine, bakeStripAria, bakePipLine, bakeRevealTitle, bakeBookLine,
  bakeBoardLine, bakeBookRowSub,
} from '../meta/bakes.js';

const click = () => Svc.sfx('ui');
const big = (save) => Number(save && save.settings && save.settings.textSize) >= 1.25;
const warmTier = () => tierName(BAKE_TIER);
const screens = () => $('#screens');

/** A small canvas with the bake's stand-in art (its Café Classics tier) centred, crisp on the device. */
export function bakeArtCanvas(def, size, cls = 'bake-art') {
  const cv = document.createElement('canvas');
  const dpr = Math.min(2, (typeof devicePixelRatio === 'number' && devicePixelRatio) || 1);
  cv.width = Math.round(size * dpr); cv.height = Math.round(size * dpr);
  cv.className = cls;
  cv.style.width = `${size}px`; cv.style.height = `${size}px`;
  cv.setAttribute('aria-hidden', 'true');
  const g = cv.getContext && cv.getContext('2d');
  if (g) {
    try {
      g.scale(dpr, dpr); g.translate(size / 2, size / 2);
      // a bake with a picture of its own (def.pic), else its Café Classics tier stand-in
      if (!(def && def.pic && drawBakeArt(g, size * 0.38, def.pic, dpr))) drawCafeClassics(g, size * 0.38, bakeArtTier(def), 0, dpr);
    } catch (e) { console.error(e); }
  }
  return cv;
}

function mount(node) {
  const host = screens();
  if (host) host.appendChild(node);
  return node;
}
function unmount(node, then) {
  if (!node || node.dataset.leaving) return;
  node.dataset.leaving = '1';
  node.classList.add('leaving');
  setTimeout(() => { node.remove(); if (then) then(); }, 180);
}

/** The three tiles (buttons) for this evening's offer. */
function tilesNode(save, ids, rows) {
  const box = el(`<div class="bake-tiles${rows ? ' rows' : ''}" role="group" aria-label="${esc(BAKE_COPY.title)}"></div>`);
  for (const id of ids) {
    const def = bakeById(id);
    const b = el(`<button class="bake-tile" data-bake="${esc(id)}" aria-label="${esc(bakeTileAria(save, id))}">
      <span class="bake-tile-text"><b>${esc(def.name)}</b><small>${esc(bakeTileLine(save, id))}</small></span></button>`);
    b.insertBefore(bakeArtCanvas(def, rows ? 56 : 64), b.firstChild);
    box.appendChild(b);
  }
  return box;
}

/**
 * The oven card (on the way out after "Done for now", or from the Bake Book fallback). Shown counts as answered for
 * the evening. A pick shows "In the oven: …" for about 1.2 s (or until tapped), then onDone.
 */
export function showOvenCard(app, { onDone, calmOffer = false } = {}) {
  const save = app.save;
  const intro = bakeIntro(save);
  const ids = bakeOffers(save);
  markOffered(save);
  app.persist();
  Svc.hideBanner(); // never beside an ad
  const rows = big(save);
  const node = mount(el(`<div class="screen modal bake-screen"><div class="card bake-card${rows ? ' big-text' : ''}" role="dialog" aria-labelledby="bake-t">
    <h2 id="bake-t">${esc(BAKE_COPY.title)}</h2>
    <p class="bake-sub">${esc(BAKE_COPY.sub)}</p>
    ${intro ? `<p class="bake-pip">${tr('bake.says', { who: `<b>${esc(tr('bake.pip'))}</b>`, line: esc(BAKE_COPY.intro) })}</p>` : ''}
    <div data-tiles></div>
    <div class="bake-foot"><button class="btn ghost bake-decline" data-decline>${esc(BAKE_COPY.decline)}</button></div>
    <p class="bake-fine">${esc(bakeFineLine(warmTier()))}</p>
    ${calmOffer ? calmOfferHtml() : ''}
  </div></div>`));
  node.querySelector('[data-tiles]').replaceWith(tilesNode(save, ids, rows));
  if (calmOffer) bindCalmOffer(node, app); // the one-time Evening calm offer rides on this card (docs/UX_FIRST_WEEK.md F5)
  let done = false;
  const finish = () => { if (done) return; done = true; unmount(node, () => { if (onDone) onDone(); }); };
  tap(node.querySelector('[data-decline]'), () => { declineBake(save); app.persist(); finish(); }, click);
  for (const b of node.querySelectorAll('[data-bake]')) {
    tap(b, () => {
      const def = pickBake(save, b.dataset.bake);
      if (!def) return;
      app.persist();
      Svc.haptic('light');
      const card = node.querySelector('.bake-card');
      card.innerHTML = `<p class="bake-picked" role="status">${esc(bakePickedLine(def))}</p>
        <button class="btn primary bake-gn" data-gn>${esc(BAKE_COPY.goodnightBtn)}</button>`;
      card.insertBefore(bakeArtCanvas(def, 72, 'bake-art big'), card.firstChild);
      tap(card.querySelector('[data-gn]'), finish, click);
      tap(card, finish);
      setTimeout(finish, 1200);
    }, click);
  }
  return node;
}

/** The Goodnight card's oven row: the offer when it is open, "Still warm in the oven: …" when full, else ''. */
export function ovenRowHtml(save) {
  const ov = ovenBake(save);
  if (ov) return `<p class="gn-oven-full">${esc(bakeStillWarmLine(ov))}</p>`;
  if (!ovenOfferOpen(save) || !(Svc.secondsSinceAd() >= EVENING_AD_GAP_S)) return '';
  return `<div class="gn-oven" data-gn-oven><p class="gn-oven-h">${esc(BAKE_COPY.gnHeading)}</p><div data-gn-tiles></div>
    <p class="bake-fine">${esc(bakeFineLine(warmTier()))}</p></div>`;
}

/** Wire the Goodnight oven row (the offer counts as shown now). "Sleep well" needs no pick. */
export function bindOvenRow(node, app) {
  const row = node && node.querySelector('[data-gn-oven]');
  if (!row) return;
  const save = app.save;
  const ids = bakeOffers(save);
  markOffered(save);
  app.persist();
  row.querySelector('[data-gn-tiles]').replaceWith(tilesNode(save, ids, true));
  for (const b of row.querySelectorAll('[data-bake]')) {
    tap(b, () => {
      const def = pickBake(save, b.dataset.bake);
      if (!def) return;
      app.persist();
      Svc.haptic('light');
      row.innerHTML = `<p class="gn-oven-full" role="status">${esc(bakePickedLine(def))}</p>`;
    }, click);
  }
}

// Pip's Home line: once per evening per session (module memory only).
let pipSaidFor = null;

/**
 * The Home strip for a ready bake (one cream button, 64 px or taller), or null. Pip says the line once per evening.
 * `say(line, ms)` is the café's speech bubble (may be null).
 */
export function bakeStripNode(app, say) {
  const save = app.save;
  if (!bakeReady(save)) return null;
  const def = ovenBake(save);
  const b = el(`<button class="bake-strip" data-bake-strip aria-label="${esc(bakeStripAria(def))}">
    <span class="bake-strip-text"><small>${esc(BAKE_COPY.stripTop)}</small><b>${esc(tr('bake.yours', { name: def.name }))}</b></span><i class="today-go" aria-hidden="true">›</i></button>`);
  b.insertBefore(bakeArtCanvas(def, 48), b.firstChild);
  tap(b, () => showBakeReveal(app), click);
  const key = `${save.bake.oven.id}:${save.bake.oven.day}`;
  if (say && pipSaidFor !== key) { pipSaidFor = key; try { say(bakePipLine(def), 6000); } catch (e) { console.error(e); } }
  return b;
}

/** The reveal sheet: adds the card to the Bake Book (once). */
export function showBakeReveal(app, { onClose } = {}) {
  const save = app.save;
  const def = revealBake(save);
  if (!def) return null;
  app.persist();
  Svc.hideBanner();
  const node = mount(el(`<div class="screen modal bake-screen"><div class="card bake-card bake-reveal" role="dialog" aria-labelledby="bake-rt">
    <h2 id="bake-rt">${esc(bakeRevealTitle(def))}</h2>
    <div data-art></div>
    <p class="bake-line">“${esc(def.line)}”</p>
    <p class="bake-from">${esc(BAKE_COPY.recipeFrom)}</p>
    <p class="bake-count">${esc(bakeBookLine(bookCount(save)))}</p>
    <p class="bake-board">${esc(bakeBoardLine(warmTier()))}</p>
    <button class="btn primary" data-lovely>${esc(BAKE_COPY.lovely)}</button>
    <button class="btn ghost" data-book>${esc(BAKE_COPY.seeBook)}</button>
  </div></div>`));
  node.querySelector('[data-art]').replaceWith(bakeArtCanvas(def, 112, 'bake-art big'));
  const close = (then) => unmount(node, () => { if (then) then(); else if (onClose) onClose(); else Svc.showMenuBanner(); });
  tap(node.querySelector('[data-lovely]'), () => close(), click);
  tap(node.querySelector('[data-book]'), () => close(() => showBakeBook(app, { onClose })), click);
  return node;
}

/** More > Bake Book: every recipe card, named (unbaked ones too, softly), and the fallback oven button. */
export function showBakeBook(app, { onClose } = {}) {
  const save = app.save;
  const n = bookCount(save);
  const fallback = ovenOfferOpen(save) && Svc.secondsSinceAd() >= EVENING_AD_GAP_S;
  const node = mount(el(`<div class="screen modal bake-screen"><div class="card comfort-card bake-book${big(save) ? ' big-text' : ''}" role="dialog" aria-labelledby="bb-t">
    <h2 id="bb-t">${esc(BAKE_COPY.bookTitle)}</h2>
    ${fallback ? `<button class="btn primary bake-choose" data-choose>${esc(BAKE_COPY.chooseBtn)}</button>` : ''}
    <p class="album-intro">${esc(BAKE_COPY.bookIntro)}</p>
    <p class="bake-count">${esc(bakeBookRowSub(n))}</p>
    ${n >= BAKES.length ? `<p class="bake-pip">${tr('bake.says', { who: `<b>${esc(tr('bake.nova'))}</b>`, line: esc(BAKE_COPY.complete) })}</p>` : ''}
    <p class="bake-line" data-quote hidden></p>
    <div class="bake-grid"></div>
    <div class="more-foot"><button class="btn ghost" data-x>${esc(tr('common.close'))}</button></div>
  </div></div>`));
  const grid = node.querySelector('.bake-grid');
  const quote = node.querySelector('[data-quote]');
  for (const def of BAKES) {
    const k = bakedCount(save, def.id);
    if (k > 0) {
      const b = el(`<button class="bake-card-tile" aria-label="${esc(tr('bake.tileAria', { name: def.name, times: bakedTimesLine(k) }))}"><b>${esc(def.name)}</b><small>${esc(bakedTimesLine(k))}</small></button>`);
      b.insertBefore(bakeArtCanvas(def, 56), b.firstChild);
      tap(b, () => { quote.hidden = false; quote.textContent = tr('bake.quote', { name: def.name, line: def.line }); }, click);
      grid.appendChild(b);
    } else {
      grid.appendChild(el(`<div class="bake-card-tile unbaked" role="note"><b>${esc(def.name)}</b><small>${esc(BAKE_COPY.notYet)}</small></div>`));
    }
  }
  const close = (then) => unmount(node, () => { if (then) then(); else if (onClose) onClose(); });
  tap(node.querySelector('[data-x]'), () => close(), click);
  const ch = node.querySelector('[data-choose]');
  if (ch) tap(ch, () => close(() => showOvenCard(app, { onDone: onClose })), click);
  return node;
}

/** More row sub-line. */
export const bakeBookSub = (save) => bakeBookRowSub(bookCount(save));
