// Shop unlock tour UI (DESIGN.md "Shop unlock tour"; rules in src/meta/shopTour.js).
// - unlockCardHtml(): the one-time "Shop unlocked!" card on Home.
// - runShopTour(): a coach-mark tour over the Shop's Looks tab (where a newcomer's first visit opens). Each step
//   spotlights one element with a caption, Next and Skip; the last step hands over the free basic gift (a welcome
//   treat from the café) with "Wear it now" / "Later". Skip still gives the gift. No purchase prompts, no timers, and
//   it never switches the Shop to another tab.
import { el, esc, tap as tapDom } from './dom.js';
import { t as tr } from './i18n.js';
import { tourSteps, TOUR_COPY, giftKindLine, finishShopTour, wearShopGift, giftItem } from '../meta/shopTour.js';
import { paintOrbCanvas } from '../game/orbArt.js';
import { drawBoardPreview } from '../game/boardArt.js';
import { drawFxPreview } from '../game/fxSkins.js';

const GIFT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="9" width="17" height="11.5" rx="2"/><path d="M2.5 9h19v-3h-19zM12 6v14.5M12 6c-1.5-3-5.5-3.5-5.5-1S10 6 12 6zm0 0c1.5-3 5.5-3.5 5.5-1S14 6 12 6z"/></svg>';

const NEW_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.5l2.3 5 5.2.6-3.9 3.6 1.1 5.2L12 15.3l-4.7 2.6 1.1-5.2-3.9-3.6 5.2-.6z"/></svg>';

/**
 * The Home unlock-moment card (src/meta/homeNav.js), wired by the caller: [data-unlock-open], [data-unlock-close].
 * copy: { title, text, go } (homeNav.momentCopy). Without copy it is the Shop + Wardrobe card.
 */
export function unlockCardHtml(copy = null, key = 'shop') {
  const c = copy || {
    title: tr('tour.unlock.title'),
    text: tr('tour.unlock.text'),
    go: tr('tour.unlock.go'),
  };
  return `<div class="unlock-card nav-card" role="status" data-moment="${esc(key)}">
    <div class="unlock-ico">${key === 'shop' ? GIFT_ICON : NEW_ICON}</div>
    <div class="unlock-txt"><b>${esc(c.title)}</b><small>${esc(c.text)}</small></div>
    <div class="unlock-acts"><button class="btn small primary" data-unlock-open>${esc(c.go || tr('tour.unlock.showMe'))}</button><button class="btn small ghost" data-unlock-close>${esc(key === 'shop' ? tr('tour.later') : tr('common.gotIt'))}</button></div>
  </div>`;
}

const still = () => document.body.classList.contains('calm')
  || (() => { try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (_) { return false; } })();

/** Steps whose targets exist on this Shop screen (the gift step always stays). */
export function liveSteps(root, save = null) {
  return tourSteps(save).filter((s) => !s.targets.length || findTargets(root, s).length);
}

function visible(n) {
  const r = n.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && r.right > 0 && r.left < window.innerWidth;
}

function findTargets(root, step) {
  const pick = (sel) => [...root.querySelectorAll(sel), ...document.querySelectorAll(sel)].filter((n, i, a) => a.indexOf(n) === i);
  if (step.union) return step.targets.map((s) => pick(s)[0]).filter(Boolean);
  for (const sel of step.targets) {
    const hit = pick(sel).find(visible) || null;
    if (hit) return [hit];
  }
  return [];
}

function paintGift(cv, it, save) {
  const w = cv.clientWidth || 88, h = cv.clientHeight || 88;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (it.kind === 'skin') { paintOrbCanvas(cv, { tier: 5 }, it.id); return; }
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  const g = cv.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const orbSkin = save.skins && save.skins.equipped;
  if (it.kind === 'board') drawBoardPreview(g, w, h, it.id, { dpr, skin: orbSkin, reduced: true });
  else drawFxPreview(g, w, h, it.id, { dpr, skin: orbSkin });
}

/**
 * Run the tour over `shop` (the Shop screen). opts: { app, toast, onWardrobe, sound }. Returns a stop function.
 * The gift is granted (and saved) on the gift step or on Skip, through finishShopTour (once per save).
 */
export function runShopTour(shop, { app, toast, onWardrobe, sound } = {}) {
  const tap = (n, fn) => tapDom(n, fn, sound);
  const save = app.save;
  const steps = liveSteps(shop, save);
  const real = steps.filter((s) => s.targets.length).length;
  let i = 0, ended = false;
  const ov = el(`<div class="tour" role="dialog" aria-modal="true" aria-label="${esc(tr('tour.aria'))}">
    <div class="tour-shade"></div><div class="tour-spot" aria-hidden="true"></div>
    <div class="tour-card" aria-live="polite"></div>
  </div>`);
  if (still()) ov.classList.add('still');
  document.body.appendChild(ov);
  const spot = ov.querySelector('.tour-spot'), card = ov.querySelector('.tour-card'), shade = ov.querySelector('.tour-shade');
  const scroller = shop.classList.contains('shop-screen') ? shop : shop.querySelector('.shop-screen') || shop;
  // the tour owns the screen while it runs: taps outside the card do nothing
  for (const n of [shade, spot]) n.addEventListener('pointerdown', (e) => e.preventDefault());

  const finish = () => {
    const it = finishShopTour(save);
    app.persist();
    return it;
  };
  const stop = () => {
    if (ended) return; ended = true;
    window.removeEventListener('resize', place);
    ov.remove();
  };

  const placeCard = (rect) => {
    card.style.top = card.style.bottom = '';
    if (!rect) { ov.classList.add('center'); return; }
    ov.classList.remove('center');
    const vh = window.innerHeight;
    const below = vh - rect.bottom, above = rect.top;
    if (below >= above) card.style.top = `${Math.round(rect.bottom + 16)}px`;
    else card.style.bottom = `${Math.round(vh - rect.top + 16)}px`;
  };

  function measure(step) {
    const ts = findTargets(shop, step);
    if (!ts.length) return null;
    const rs = ts.map((n) => n.getBoundingClientRect());
    const pad = 8;
    const l = Math.max(4, Math.min(...rs.map((r) => r.left)) - pad), t = Math.min(...rs.map((r) => r.top)) - pad;
    const r = Math.min(window.innerWidth - 4, Math.max(...rs.map((x) => x.right)) + pad), b = Math.max(...rs.map((x) => x.bottom)) + pad;
    return { left: l, top: t, width: r - l, height: b - t, right: r, bottom: b };
  }

  function place() {
    if (ended) return;
    if (!shop.isConnected) { stop(); return; } // the Shop closed under the tour (the tour picks up next visit)
    const step = steps[i];
    const rect = step.targets.length ? measure(step) : null;
    if (rect) {
      Object.assign(spot.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
      spot.hidden = false; shade.hidden = true;
    } else { spot.hidden = true; shade.hidden = false; }
    placeCard(rect);
  }

  function show() {
    const step = steps[i];
    if (step.id === 'gift') return showGift();
    const ts = findTargets(shop, step);
    // bring the target into view inside the Shop's own scroller (no smooth scroll with Calm / reduced motion)
    if (ts[0]) {
      const r = ts[0].getBoundingClientRect(), vh = window.innerHeight;
      if (r.top < 90 || r.bottom > vh - 260) scroller.scrollTop += r.top - Math.max(110, vh * 0.28);
    }
    card.innerHTML = `<div class="tour-step">${esc(tr('tour.step', { n: i + 1, total: real + 1 }))}</div>
      <h2 class="tour-h">${esc(step.title)}</h2><p class="tour-p">${esc(step.text)}</p>
      <div class="tour-acts"><button class="btn small ghost" data-skip>${esc(tr('tour.skip'))}</button><button class="btn small primary" data-next>${esc(tr('tour.next'))}</button></div>
      <p class="tour-note">${esc(TOUR_COPY.skipNote)}</p>`;
    tap(card.querySelector('[data-next]'), () => { i++; show(); });
    tap(card.querySelector('[data-skip]'), () => {
      const it = finish();
      stop();
      if (toast) toast(it ? TOUR_COPY.skipLine : tr('tour.skipped'), !!it, 3200);
    });
    requestAnimationFrame(() => { place(); const n = card.querySelector('[data-next]'); if (n) n.focus({ preventScroll: true }); });
  }

  function showGift() {
    const it = finish();
    spot.hidden = true; shade.hidden = false;
    ov.classList.add('center', 'tour-gift-on');
    card.style.top = card.style.bottom = '';
    if (!it) {
      card.innerHTML = `<h2 class="tour-h">${esc(tr('tour.noGift.title'))}</h2><p class="tour-p">${esc(tr('tour.noGift.text'))}</p>
        <div class="tour-acts"><button class="btn small primary" data-later>${esc(tr('common.done'))}</button></div>`;
      tap(card.querySelector('[data-later]'), stop);
      return;
    }
    card.innerHTML = `<div class="tour-step">${GIFT_ICON}<span>${esc(TOUR_COPY.giftTitle)}</span></div>
      <canvas class="tour-gift-cv gift-${esc(it.kind)}" aria-hidden="true"></canvas>
      <h2 class="tour-h">${esc(it.name)}</h2>
      <div class="tour-kind">${esc(giftKindLine(it.kind))}</div>
      <p class="tour-p">${esc(tr('tour.gift.where', { desc: it.desc || '' }))}</p>
      <div class="tour-acts"><button class="btn small ghost" data-later>${esc(tr('tour.later'))}</button><button class="btn small primary" data-wear>${esc(tr('tour.wear'))}</button></div>`;
    requestAnimationFrame(() => paintGift(card.querySelector('canvas'), it, save));
    tap(card.querySelector('[data-wear]'), () => {
      if (wearShopGift(save, it)) { app.persist(); if (toast) toast(tr('tour.nowWearing', { name: it.name }), true); }
      stop();
      if (onWardrobe) onWardrobe();
    });
    tap(card.querySelector('[data-later]'), () => { stop(); if (toast) toast(tr('tour.giftWhere'), true, 3200); });
    requestAnimationFrame(() => { const n = card.querySelector('[data-wear]'); if (n) n.focus({ preventScroll: true }); });
  }

  window.addEventListener('resize', place);
  show();
  return stop;
}

export { giftItem };
