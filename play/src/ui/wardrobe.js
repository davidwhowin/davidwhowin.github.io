// Wardrobe screen (DESIGN.md "Wardrobe"): one tab per customizable thing, every look for it with its state.
// Data and equip routing live in src/meta/wardrobe.js (a category registry); this file only draws.
import { $, el, esc, tap, ICONS } from './dom.js';
import { drawOrb } from '../game/orbArt.js';
import { animateKeeperCanvas } from './keeperLive.js'; // living Keepers (idle + a hop on tap)
import { paintScenePreview } from '../game/sceneArt.js';
import { BACKDROP_BY_ID, backdropSwatchCss, resolveBackdrop } from '../game/backdrops.js';
import { SKINS } from '../meta/economy.js';
import { KEEPER_BY_ID } from '../meta/keepers.js';
import { OUTFIT_BY_ID } from '../meta/outfits.js';
import { Svc } from '../meta/services.js';
import { unlocked } from '../meta/onboarding.js';
import {
  wardrobeCategories, wardrobeCategory, wardrobeItems, wardrobeCounts, equipWardrobe, ownedPacks, currentLook, wardrobeSections,
} from '../meta/wardrobe.js';
import { pageLook } from './copy.js';
import { t as tr, tp as trp } from './i18n.js';
import { showShop, toast } from './screens.js';
import './looksWardrobe.js'; // registers the Board and Combo tabs

const click = () => Svc.sfx('ui');
const LOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
/** The "go" link on a locked card: where the look can be got. */
function goLabel(go) {
  if (go === 'packs') return tr('wardrobe.go.pack');
  if (go === 'pass') return tr('wardrobe.go.pass');
  if (go === 'skins' || go === 'looks' || go === 'backgrounds' || go === 'scenes') return tr('wardrobe.go.shop');
  return tr('wardrobe.go.open');
}
const TAB_KEY = 'novadrop.wardrobeTab';
/** The state line on the card in use. */
function onLabel(preview) {
  if (preview === 'keeper') return tr('wardrobe.on.withYou');
  if (preview === 'outfit') return tr('wardrobe.on.wearing');
  return tr('wardrobe.on.inUse');
}

function openNode(node) { $('#screens').appendChild(node); return node; }
/** True when the Shop sits under this Wardrobe (the Shop opened it). */
function shopBelow() {
  try { return !!(typeof document !== 'undefined' && document.querySelector && document.querySelector('#screens .shop-screen:not(.leaving)')); } catch (_) { return false; }
}
function closeNode(node) {
  if (!node || !node.parentNode) return;
  node.classList.add('leaving');
  setTimeout(() => node.remove(), 180);
}
const skinName = (id) => (SKINS.find((s) => s.id === id) || {}).name || id;
const lastTab = () => { try { return localStorage.getItem(TAB_KEY); } catch (_) { return null; } };
const rememberTab = (t) => { try { localStorage.setItem(TAB_KEY, t); } catch (_) { /* ignore */ } };

/** Fit a canvas to its CSS box; returns the 2D context in CSS pixels, or null. */
function fitCanvas(cv) {
  if (!cv) return null;
  const w = cv.clientWidth || 80, h = cv.clientHeight || 80;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const g = cv.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  return { g, w, h, dpr };
}

/** Three orbs of a skin, small to big, in a little rising row (a piece "family" at a glance). */
function paintOrbTrio(cv, skin, tiers = [2, 5, 8]) {
  const c = fitCanvas(cv);
  if (!c) return;
  const { g, w, h, dpr } = c;
  const r = Math.min(w / 7.2, h / 2.9);
  const xs = [w * 0.2, w * 0.5, w * 0.8];
  const sizes = [0.78, 0.95, 1.12];
  tiers.forEach((t, i) => drawOrb(g, xs[i], h * 0.55 - (i - 1) * r * 0.12, r * sizes[i], t, skin, dpr, {}));
}

// Built-in previews by name (a category may also pass its own function).
const PAINTERS = {
  orbs: (cv, item) => paintOrbTrio(cv, item.id),
  backdrop: (cv, item, save) => {
    const t = item.id === 'auto' ? resolveBackdrop('auto', { mode: 'menu' }, save) : BACKDROP_BY_ID[item.id];
    if (t && t.scene) paintScenePreview(cv, t);
  },
  keeper: (cv, item) => animateKeeperCanvas(cv, item.id, null),
  outfit: (cv, item, save) => animateKeeperCanvas(cv, currentLook(save).keeper, item.id || null),
};

function previewHtml(cat, item, save) {
  if (cat.preview === 'backdrop') {
    const t = item.id === 'auto' ? resolveBackdrop('auto', { mode: 'menu' }, save) : BACKDROP_BY_ID[item.id];
    const bg = t ? backdropSwatchCss(t) : '';
    return `<div class="wd-prev wd-prev-bd" style="background:${bg}">${t && t.scene ? '<canvas data-paint></canvas>' : ''}${item.auto ? `<span class="wd-auto">${esc(tr('wardrobe.auto'))}</span>` : ''}</div>`;
  }
  return `<div class="wd-prev wd-prev-${esc(typeof cat.preview === 'string' ? cat.preview : 'custom')}"><canvas data-paint></canvas></div>`;
}

/** The look card at the top: the background in use, three orbs of the piece set and the companion. */
function heroHtml(save) {
  const look = currentLook(save);
  const t = look.backdrop === 'auto' ? resolveBackdrop('auto', { mode: 'menu' }, save) : BACKDROP_BY_ID[look.backdrop];
  const k = KEEPER_BY_ID[look.keeper];
  const bgName = t.name; // 'auto' shows the chapter scene it currently resolves to
  return `<div class="wd-hero" style="background:${backdropSwatchCss(t)}">
    ${t.scene ? '<canvas class="wd-hero-scene" data-hero-scene></canvas>' : ''}
    <div class="wd-hero-stage">
      <canvas class="wd-hero-orbs" data-hero-orbs aria-hidden="true"></canvas>
      <canvas class="wd-hero-keeper" data-hero-keeper aria-hidden="true"></canvas>
    </div>
    <div class="wd-hero-cap"><b>${esc(tr('wardrobe.yourLook'))}</b><span>${esc(look.outfit
    ? tr('wardrobe.lookLineOutfit', { skin: skinName(look.skin), bg: bgName, keeper: k ? k.name : '', outfit: (OUTFIT_BY_ID[look.outfit] || {}).name || '' })
    : tr('wardrobe.lookLine', { skin: skinName(look.skin), bg: bgName, keeper: k ? k.name : '' }))}</span></div>
  </div>`;
}

function purchasesHtml(save) {
  const packs = ownedPacks(save);
  if (!packs.length) return `<p class="wd-buys none">${esc(tr('wardrobe.buysNone'))}</p>`;
  return `<div class="wd-buys"><b>${esc(tr('wardrobe.myPurchases'))}</b>${packs.map((p) => `<span class="wd-pack-chip${p.complete ? ' full' : ''}">${esc(tr('wardrobe.packChip', { name: p.name }))} <small>${esc(p.complete ? tr('wardrobe.allPieces') : tr('wardrobe.somePieces', { owned: p.owned, total: p.total }))}</small></span>`).join('')}</div>`;
}

/**
 * Wardrobe screen. tab: a category id (remembered on this device). onClose runs after Back; without it the menu
 * refreshes (the companion beside the logo may have changed).
 */
export function showWardrobe(app, tab = null, onClose = null) {
  const save = app.save;
  const extras = unlocked(save, 'shop'); // Shop links (the Wardrobe and the Shop open together, at Level 1)
  const node = openNode(el(`<div class="screen solid wardrobe-screen"><div class="page wd-page">
    <div class="topbar sticky" style="width:100%"><button class="icon-btn" data-back aria-label="${esc(tr('common.back'))}">${ICONS.back}</button><h1>${esc(tr('wardrobe.title'))}</h1><span class="wd-spacer"></span></div>
    <div data-hero></div>
    <div class="wd-tabs" role="tablist" aria-label="${esc(tr('wardrobe.tabsAria'))}"></div>
    <div class="wd-body" data-body></div>
  </div></div>`));
  const tabsEl = node.querySelector('.wd-tabs');
  const body = node.querySelector('[data-body]');
  const heroHost = node.querySelector('[data-hero]');
  let cur = null;
  let paintSeq = 0;
  let heroPainted = false;

  const paintHero = () => {
    heroHost.innerHTML = heroHtml(save) + purchasesHtml(save);
    const look = currentLook(save);
    requestAnimationFrame(() => {
      paintOrbTrio(heroHost.querySelector('[data-hero-orbs]'), look.skin, [3, 6, 9]);
      // a happy hop when the look changes (not on first open)
      animateKeeperCanvas(heroHost.querySelector('[data-hero-keeper]'), look.keeper, look.outfit, heroPainted ? { react: 'tap' } : {});
      heroPainted = true;
      const sc = heroHost.querySelector('[data-hero-scene]');
      if (sc) paintScenePreview(sc, BACKDROP_BY_ID[look.backdrop]);
    });
  };

  const renderTabs = () => {
    const cats = wardrobeCategories(save);
    const counts = wardrobeCounts(save);
    tabsEl.innerHTML = cats.map((c) => {
      const n = counts[c.id];
      return `<button class="wd-tab${c.id === cur ? ' on' : ''}" role="tab" aria-selected="${c.id === cur}" data-cat="${esc(c.id)}"${n ? ` aria-label="${esc(tr('wardrobe.tabAria', { label: c.label, owned: n.owned, total: n.total }))}"` : ''}>
        <span class="wd-tab-icon">${c.icon || ''}</span><span class="wd-tab-label">${esc(c.label)}</span>${n ? `<small>${n.owned}/${n.total}</small>` : ''}</button>`;
    }).join('');
    for (const b of tabsEl.querySelectorAll('[data-cat]')) tap(b, () => { if (b.dataset.cat !== cur) render(b.dataset.cat); }, click);
    const on = tabsEl.querySelector('.wd-tab.on');
    if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };

  const goTo = (item) => {
    const back = () => render(cur);
    // packs and the Café Club: Shop › Packs; coin skins and board / merge looks: their section of Shop › Looks
    const SECTION = { skins: 'pieces', looks: 'looks', backgrounds: 'backgrounds', scenes: 'scenes', pass: 'pass' };
    const section = SECTION[item.go] || null;
    const shop = showShop(app, section && section !== 'pass' ? 'treats' : 'packs', back, { expand: section, exact: true });
    const sec = section && shop && shop.querySelector(`[data-section="${section}"]`);
    if (sec && sec.scrollIntoView) requestAnimationFrame(() => sec.scrollIntoView({ block: 'start' }));
  };

  const cardHtml = (cat, it) => {
    const state = it.state === 'equipped'
      ? `<span class="wd-state on">${CHECK}${esc(onLabel(cat.preview))}</span>`
      : it.owned ? `<span class="wd-state">${esc(cat.preview === 'outfit' ? tr('wardrobe.tapWear') : tr('wardrobe.tapUse'))}</span>`
      : `<span class="wd-state locked">${LOCK}<span>${esc(it.source || tr('wardrobe.notFound'))}</span></span>`;
    const go = !it.owned && it.go && extras ? `<span class="wd-go">${esc(goLabel(it.go))} ›</span>` : '';
    const sub = it.title || (!it.owned ? '' : (it.group && cat.preview === 'backdrop' ? it.group : '') || it.tag || ''); // locked: the how-to line says where it comes from
    return `<button class="wd-card ${it.state}${it.packId ? ' premium' : ''}" data-id="${esc(it.id == null ? '' : it.id)}" aria-label="${esc(it.state === 'equipped' ? tr('wardrobe.aria.inUse', { name: it.name }) : it.owned ? tr('wardrobe.aria.owned', { name: it.name }) : tr('wardrobe.aria.locked', { name: it.name, source: it.source || '' }))}">
      ${previewHtml(cat, it, save)}
      <span class="wd-name">${esc(it.name)}</span>${sub ? `<span class="wd-sub">${esc(sub)}</span>` : ''}
      ${state}${go}
    </button>`;
  };

  const render = (catId) => {
    const cats = wardrobeCategories(save);
    const cat = wardrobeCategory(catId) && cats.some((c) => c.id === catId) ? wardrobeCategory(catId) : cats[0];
    if (!cat) { body.innerHTML = `<p class="wd-empty">${esc(tr('wardrobe.empty'))}</p>`; return; }
    cur = cat.id;
    rememberTab(cur);
    const scrollY = node.scrollTop;
    paintHero();
    renderTabs();
    const items = wardrobeItems(save, cur);
    // docs/UX_OPPORTUNITIES.md item 7: "Yours" first; the Cosmic style folded into its own collection (café look);
    // what can be got now behind "See more looks" in named collections; looks that only come with play aren't listed
    const sec = wardrobeSections(items, pageLook());
    const countable = (l) => l.filter((x) => !x.auto && x.id != null).length;
    const grid = (list) => `<div class="wd-grid${cat.preview === 'backdrop' ? ' tall' : ''}">${list.map((it) => cardHtml(cat, it)).join('')}</div>`;
    const fold = (key, label, n, inner) => `<details class="wd-fold" data-fold="${esc(key)}">
      <summary class="wd-fold-h"><span>${esc(label)}</span><small>${n}</small><i aria-hidden="true">›</i></summary>${inner}</details>`;
    const laterLine = sec.later ? `<p class="wd-note wd-later">${esc(trp('wardrobe.later', sec.later, { n: sec.later.toLocaleString('en-US') }))}</p>` : '';
    body.innerHTML = `
      <h3 class="wd-h">${esc(tr('wardrobe.yours'))} <small>${countable(sec.yours) + countable(sec.starry)}</small></h3>
      ${grid(sec.yours)}
      ${sec.starry.length ? fold('starry-own', tr('wardrobe.starry'), sec.starry.length, grid(sec.starry)) : ''}
      ${sec.moreCount ? fold('more', tr('wardrobe.seeMore'), sec.moreCount, sec.more.map((g) => `<h4 class="wd-h wd-sub-h">${esc(g.label)} <small>${g.items.length}</small></h4>${grid(g.items)}`).join('')) : ''}
      ${laterLine}
      ${!sec.moreCount && !sec.later ? `<p class="wd-note">${esc(tr('wardrobe.haveAll'))}</p>` : ''}
      ${extras ? `<button class="wd-link wd-shop-link" data-to-shop>${ICONS.shop}<span><b>Find more looks in the Shop</b><small>${esc(tr('wardrobe.shopLinkSub'))}</small></span><i>›</i></button>` : ''}
      <p class="wd-note">${esc(tr('wardrobe.cosmetic'))}</p>`;
    node.scrollTop = scrollY;
    // the Shop link: back to the Shop when the Shop opened this Wardrobe, otherwise the Shop over it
    tap(body.querySelector('[data-to-shop]'), () => (shopBelow() ? goBack() : showShop(app, 'treats', () => render(cur))), click);
    for (const b of body.querySelectorAll('.wd-card')) {
      const it = items.find((x) => String(x.id == null ? '' : x.id) === b.dataset.id);
      tap(b, () => {
        if (!it) return;
        if (it.state === 'equipped') return;
        if (!it.owned) {
          if (it.go && extras) goTo(it); else toast(it.source || tr('wardrobe.notFound'));
          return;
        }
        if (equipWardrobe(save, cur, it.id, { setSetting: app.setSetting })) {
          app.persist();
          Svc.haptic && Svc.haptic('light');
          toast(cat.preview === 'keeper' ? tr('wardrobe.toast.withYou', { name: it.name }) : cat.preview === 'outfit' ? (it.id ? tr('wardrobe.toast.wearing', { name: it.name }) : tr('wardrobe.toast.noOutfit')) : tr('wardrobe.toast.on', { name: it.name }), true, 1500);
          render(cur);
        }
      }, click);
    }
    // paint previews a few per frame (scenes are pre-rendered layers, so spread the cost)
    // folded collections paint when first opened (their canvases have no size while closed)
    const seq = ++paintSeq;
    const painter = typeof cat.preview === 'function' ? cat.preview : PAINTERS[cat.preview];
    const paintCards = (root) => {
      const jobs = [...root.querySelectorAll('.wd-card')]
        .filter((b) => { const d = b.closest ? b.closest('details') : null; return (!d || d.open) && !(b.dataset && b.dataset.painted); })
        .map((b) => ({ b, it: items.find((x) => String(x.id == null ? '' : x.id) === b.dataset.id) }));
      const step = () => {
        if (seq !== paintSeq || !node.isConnected) return;
        for (let n = 0; n < 3 && jobs.length; n++) {
          const { b, it } = jobs.shift();
          b.dataset.painted = '1';
          const cv = b.querySelector('canvas[data-paint]');
          if (cv && it && painter) { try { painter(cv, it, save); } catch (_) { /* a broken preview never breaks the screen */ } }
        }
        if (jobs.length) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    paintCards(body);
    for (const d of body.querySelectorAll('details.wd-fold')) d.addEventListener('toggle', () => { if (d.open) paintCards(d); });
  };

  function goBack() {
    paintSeq++;
    closeNode(node);
    if (onClose) onClose(); else if (app.onMetaChanged) app.onMetaChanged();
  }
  tap(node.querySelector('[data-back]'), goBack, click);
  render(tab || lastTab() || 'pieces');
  return node;
}
