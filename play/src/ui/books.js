// Nova Drop: the Puzzle Books screens (docs/UX_PUZZLE_BOOKS.md items 2 and 4, DESIGN.md "Puzzle Books").
// Rules and save: src/meta/books.js; the puzzle engine: src/game/puzzles.js; book mode: src/game/game.js startBook.
//
// - Opened from More (row "Puzzle Books", from Level 50) and from one card in Shop > Packs. Never mentioned elsewhere.
// - No ads anywhere in here: main.js keeps the ad director in "book" state (Svc.setInBook) while these screens and a
//   book puzzle are open, so no banner, interstitial or reward offer can show. Prices are shown, never pushed: the calm
//   choice is the primary button on every card, and nothing is pre-selected.
// - The purchase is a labelled stub (no store yet): grantBook() is what the real store and Restore will call.
import { el, esc, tap, ICONS } from './dom.js';
import { t as tr } from './i18n.js';
import { Svc } from '../meta/services.js';
import { goalText } from '../game/levels.js';
import { goalCopy, pageLook } from './copy.js';
import {
  BOOKS, bookById, canPlay, ownsBook, isSolved, solvedCount, nextPuzzle, bookPrimary,
  grantBook, bookProgressText,
} from '../meta/books.js';
import * as S from './screens.js'; // circular on purpose: only used inside functions, never at load time

const click = () => Svc.sfx('ui');
const LOCK_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
// a round café stamp: a wave under a sun, inked
const STAMP_SVG = '<svg viewBox="0 0 40 40" width="34" height="34" aria-hidden="true"><circle cx="20" cy="20" r="17" fill="none" stroke="currentColor" stroke-width="2.4" stroke-dasharray="3 2.2"/><circle cx="20" cy="15" r="4.5" fill="currentColor"/><path d="M8 25c3-3 5-3 8 0s5 3 8 0 5-3 8 0" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';

const otherCount = (b) => b.puzzles.length - b.free;

/** "Make a Cake Stand", in the player's words (café "stones" in every look). */
export function puzzleGoalLine(p) { return goalCopy(goalText(p.goal), pageLook()); }

/** Puzzle Books from More: with one book the shelf is skipped and the book opens directly. */
export function showBooks(app, opts = {}) {
  if (BOOKS.length === 1) return showBook(app, BOOKS[0].id, opts);
  Svc.setInBook(true);
  const s = S.openScreen(el(`<div class="screen solid books-screen"><div class="page">
    <div class="topbar sticky" style="width:100%"><button class="icon-btn" data-back aria-label="${esc(tr('books.backMore'))}">${ICONS.back}</button><h1 class="book-title">${esc(tr('books.title'))}</h1></div>
    <div class="list" style="display:flex;flex-direction:column;gap:12px"></div></div></div>`));
  const list = s.querySelector('.list');
  for (const b of BOOKS) {
    const sub = solvedCount(app.save, b.id) || ownsBook(app.save, b.id) ? bookProgressText(app.save, b.id) : tr('books.freeCount', { n: b.free });
    const r = el(`<button class="row-item book-row"><div class="grow"><div class="name">${esc(b.name)}</div><div class="desc">${esc(sub)}</div></div><i class="today-go">›</i></button>`);
    tap(r, () => showBook(app, b.id, { from: 'books' }), click);
    list.appendChild(r);
  }
  tap(s.querySelector('[data-back]'), () => { S.closeScreen(s); if (app.booksClosed) app.booksClosed(); }, click);
  return s;
}

/** The book: cover, progress, one primary button, the stamp grid (buy card after the free pages), Restore and About. */
export function showBook(app, id, { from = 'more', onClose = null } = {}) {
  const b = bookById(id);
  if (!b) return null;
  Svc.setInBook(true);
  if (!app.save.books.opened) { app.save.books.opened = true; app.persist(); }
  const backLabel = from === 'shop' ? tr('books.backShop') : from === 'books' ? tr('books.backBooks') : tr('books.backMore');
  const s = S.openScreen(el(`<div class="screen solid book-screen"><div class="page">
    <div class="topbar sticky" style="width:100%"><button class="icon-btn" data-back aria-label="${esc(backLabel)}">${ICONS.back}</button><h1 class="book-title">${esc(b.name)}</h1></div>
    <div class="book-body"></div></div></div>`));
  const body = s.querySelector('.book-body');
  const render = () => {
    const save = app.save;
    const prim = bookPrimary(save, id);
    const solved = solvedCount(save, id), total = b.puzzles.length;
    const owned = ownsBook(save, id);
    // text size 1.25 and 1.5: 3 pages a row and a shorter cover (UX_PUZZLE_BOOKS item 6)
    const ts = typeof getComputedStyle === 'function' ? parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ts')) || 1 : 1;
    body.classList.toggle('big', ts >= 1.25);
    const primHtml = prim.kind === 'start' ? tr('books.primStart', { n: prim.n })
      : prim.kind === 'carry' ? tr('books.primCarry', { n: prim.n })
        : prim.kind === 'play' ? tr('books.primPlay', { n: prim.n })
          : prim.kind === 'look' ? tr('books.primLook') : '';
    const pages = b.puzzles.map((p) => {
      const done = isSolved(save, id, p.n), open = canPlay(save, id, p.n);
      const label = done ? tr('books.page.solved', { n: p.n, stamp: p.stamp }) : open ? tr('books.page.open', { n: p.n }) : tr('books.page.locked', { n: p.n });
      const cls = done ? 'solved' : open ? 'open' : 'locked';
      return `<button class="book-page ${cls}" data-page="${p.n}" aria-label="${esc(label)}">${done ? `<span class="stamp">${STAMP_SVG}</span><span class="pg-n">${p.n} ✓</span>` : `<span class="pg-n">${p.n}</span>${open ? '' : `<span class="pg-lock">${LOCK_SVG}</span>`}`}</button>`;
    });
    const buyCard = owned ? '' : `<div class="book-buy">
      <p>${esc(tr('books.buy.others', { n: otherCount(b) }))}</p>
      <button class="btn money" data-buy aria-label="${esc(tr('books.buy.aria', { price: b.price }))}"><span>${esc(tr('books.buy.get'))}</span><span class="price">${esc(b.price)}</span></button>
      <p class="sub">${esc(tr('books.buy.sub'))}</p></div>`;
    body.innerHTML = `
      <div class="book-cover" aria-hidden="true"><canvas></canvas></div>
      <p class="book-kicker">${esc(tr('books.kicker', { n: total }))}</p>
      <div class="book-progress"><span>${esc(bookProgressText(save, id))}</span><div class="progress"><i style="width:${Math.round((solved / total) * 100)}%"></i></div></div>
      ${prim.kind === 'buy' ? '' : `<button class="btn primary book-primary" data-primary>${esc(primHtml)}</button>`}
      ${prim.kind === 'buy' ? buyCard : ''}
      <div class="book-grid">${pages.slice(0, b.free).join('')}</div>
      ${prim.kind === 'buy' ? '' : buyCard}
      <div class="book-grid">${pages.slice(b.free).join('')}</div>
      <div class="book-foot"><button class="btn ghost" data-restore>${esc(tr('books.restore'))}</button><button class="btn ghost link" data-about>${esc(tr('books.about.title'))}</button></div>`;
    paintCover(body.querySelector('.book-cover canvas'));
    const pb = body.querySelector('[data-primary]');
    if (pb) {
      tap(pb, () => {
        if (prim.kind === 'look') { body.querySelector('.book-grid .book-page')?.focus(); return; }
        app.startBook(id, prim.n);
      }, click);
    }
    const buy = body.querySelector('[data-buy]');
    if (buy) tap(buy, () => showBookBuy(app, id, render), click);
    for (const pg of body.querySelectorAll('[data-page]')) {
      const n = Number(pg.dataset.page);
      tap(pg, () => {
        if (canPlay(app.save, id, n)) app.startBook(id, n);
        else showBookBuy(app, id, render); // a locked page opens our confirm, never a store sheet
      }, click);
    }
    tap(body.querySelector('[data-restore]'), async () => {
      if (Svc.restorePurchases) { await Svc.restorePurchases(); render(); return; }
      S.toast(tr('books.restoreStub'), false, 3200);
    }, click);
    tap(body.querySelector('[data-about]'), () => showAboutBooks(), click);
  };
  render();
  s.render = render; // callers that open a confirm over this page (showBookSolved's "Get the book") re-render it after
  tap(s.querySelector('[data-back]'), () => {
    S.closeScreen(s);
    if (onClose) onClose();
    else if (from === 'more' && app.booksClosed) app.booksClosed();
  }, click);
  return s;
}

/** A still cover in the café palette: sea, sand and three little shells. Presentation only. */
function paintCover(cv) {
  if (!cv || !cv.getContext) return;
  const w = cv.clientWidth || 320, h = cv.clientHeight || 120, dpr = Math.min(2, (typeof devicePixelRatio === 'number' && devicePixelRatio) || 1);
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  const g = cv.getContext('2d');
  if (!g) return;
  g.scale(dpr, dpr);
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#f6e7cf'); sky.addColorStop(0.5, '#cfe6e4'); sky.addColorStop(1, '#8fc3c4');
  g.fillStyle = sky; g.fillRect(0, 0, w, h);
  g.fillStyle = '#e9d3a8';
  g.beginPath(); g.moveTo(0, h * 0.78);
  for (let x = 0; x <= w; x += 8) g.lineTo(x, h * 0.78 + Math.sin(x / 26) * 4);
  g.lineTo(w, h); g.lineTo(0, h); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 2;
  for (let k = 0; k < 3; k++) {
    g.beginPath();
    for (let x = 0; x <= w; x += 6) g.lineTo(x, h * (0.45 + k * 0.09) + Math.sin(x / 18 + k) * 2.5);
    g.stroke();
  }
  const shells = [[0.2, '#e8a798'], [0.5, '#f2c58a'], [0.78, '#d9a3c1']];
  for (const [fx, col] of shells) {
    const x = w * fx, y = h * 0.86, r = Math.min(14, h * 0.11);
    g.fillStyle = col;
    g.beginPath(); g.moveTo(x - r, y); g.quadraticCurveTo(x, y - r * 1.8, x + r, y); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(120,80,60,.45)'; g.lineWidth = 1;
    for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(x, y - r * 0.2); g.lineTo(x + i * r * 0.42, y - r * 0.05 - Math.abs(i) * 0.5); g.stroke(); }
  }
}

/** About Puzzle Books: the honest lines. */
export function showAboutBooks() {
  return S.confirmBox({
    title: esc(tr('books.about.title')),
    text: [tr('books.about.p1'), tr('books.about.p2'), tr('books.about.p3'), tr('books.about.p4')].map(esc).join('<br><br>'),
    ok: esc(tr('books.ok')), cancel: null,
  });
}

/** Our confirm before any store sheet. Test build: the purchase is simulated (grantBook), nothing is charged. */
export async function showBookBuy(app, id, after = null) {
  const b = bookById(id);
  if (!b || ownsBook(app.save, id)) { if (after) after(); return false; }
  const solved = solvedCount(app.save, id);
  const ok = await S.confirmBox({
    title: esc(tr('books.confirm.title', { name: b.name })),
    text: `${esc(tr('books.confirm.all', { n: b.puzzles.length }))}${solved ? esc(tr('books.confirm.solved', { n: solved })) : ''}<br>${esc(tr('books.confirm.once', { price: b.price }))}<br>${esc(tr('books.confirm.only'))}<br><br><span class="sim-note">${esc(tr('books.confirm.sim'))}</span>`,
    ok: esc(tr('books.confirm.ok', { price: b.price })), okClass: 'money', cancel: esc(tr('common.notNow')),
  });
  if (!ok) return false;
  if (!grantBook(app.save, id)) {
    await S.confirmBox({ title: esc(tr('books.noPayment')), text: '', ok: esc(tr('books.ok')), cancel: null });
    return false;
  }
  if (app.purchaseGranted) app.purchaseGranted();
  app.persist();
  Svc.sfx('coin');
  Svc.haptic('success');
  if (after) after();
  const n = nextPuzzle(app.save, id);
  if (!n) return true;
  const play = await S.confirmBox({
    title: esc(tr('books.yours.title', { name: b.name })),
    text: esc(tr('books.yours.text', { n })),
    ok: esc(tr('books.primPlay', { n })), cancel: esc(tr('books.later')),
  });
  if (play) app.startBook(id, n);
  return true;
}

/** Out of pieces: no record of a loss, no ads. Try again / Undo last drop / Back to the book. */
export function showBookOut(app, res, { onRetry, onUndo, onBack }) {
  const s = S.openScreen(el(`<div class="screen modal"><div class="card book-card">
    <h2>${esc(tr('books.out.title'))}</h2>
    <p>${esc(tr('books.out.text'))}</p>
    <button class="btn primary" data-retry>${esc(tr('books.out.retry'))}</button>
    ${res.cols && res.cols.length ? `<button class="btn" data-undo>${esc(tr('books.out.undo'))}</button>` : ''}
    <button class="btn ghost" data-back>${esc(tr('books.backBook'))}</button>
  </div></div>`));
  const go = (fn) => () => { S.closeScreen(s); fn(); };
  tap(s.querySelector('[data-retry]'), go(onRetry), click);
  const u = s.querySelector('[data-undo]');
  if (u) tap(u, go(onUndo), click);
  tap(s.querySelector('[data-back]'), go(onBack), click);
  return s;
}

/**
 * Solved: a stamp, never a star or a score. After the last free puzzle of a book she doesn't own, one calm line
 * (once per book, got.freeDone) with "Back to the book" as the primary. The last puzzle opens the book-complete card.
 */
export function showBookSolved(app, res, got, { onNext, onBack, onHome }) {
  const b = bookById(res.id);
  if (got && got.complete) return showBookComplete(app, res.id, { onLook: onBack, onHome });
  const next = nextPuzzle(app.save, res.id);
  const free = got && got.freeDone;
  const buttons = free
    ? `<button class="btn primary" data-back>${esc(tr('books.backBook'))}</button>
       <button class="btn money" data-buy aria-label="${esc(tr('books.buy.aria', { price: b.price }))}"><span>${esc(tr('books.buy.get'))}</span><span class="price">${esc(b.price)}</span></button>`
    : `${next ? `<button class="btn primary" data-next>${esc(tr('books.solved.next'))}</button>` : ''}
       <button class="btn ${next ? 'ghost' : 'primary'}" data-back>${esc(tr('books.backBook'))}</button>`;
  const s = S.openScreen(el(`<div class="screen modal"><div class="card book-card solved">
    <div class="book-stamp" aria-hidden="true">${STAMP_SVG}</div>
    <h2>${esc(tr('books.solved.title'))}</h2>
    <p>${esc(tr('books.solved.text', { n: res.n, total: b.puzzles.length }))}</p>
    ${free ? `<p class="sub">${esc(tr('books.solved.free', { free: b.free, name: b.name, n: otherCount(b) }))}</p>` : ''}
    ${buttons}
  </div></div>`));
  const nb = s.querySelector('[data-next]');
  if (nb) tap(nb, () => { S.closeScreen(s); onNext(next); }, click);
  tap(s.querySelector('[data-back]'), () => { S.closeScreen(s); onBack(); }, click);
  const buy = s.querySelector('[data-buy]');
  // "Get the book": back to the book page (onBack returns it), then our confirm; the page re-renders after a purchase
  // so it shows the book as hers (no stale buy card), whether she then plays or picks "Later"
  if (buy) tap(buy, async () => {
    S.closeScreen(s);
    const page = onBack();
    await showBookBuy(app, res.id, () => { if (page && typeof page.render === 'function') page.render(); });
  }, click);
  return s;
}

/** The whole book solved: a bookplate on the shelf. No "next book" offer here. */
export function showBookComplete(app, id, { onLook, onHome }) {
  const b = bookById(id);
  const s = S.openScreen(el(`<div class="screen modal"><div class="card book-card complete">
    <div class="book-stamp" aria-hidden="true">${STAMP_SVG}</div>
    <h2 class="book-title">${esc(tr('books.done.title', { name: b.name }))}</h2>
    <p>${esc(tr('books.done.all', { n: b.puzzles.length }))}</p>
    <p class="sub">${esc(tr('books.done.nova'))}</p>
    <p class="sub">${esc(tr('books.done.plate', { name: b.name }))}</p>
    <button class="btn primary" data-look>${esc(tr('books.primLook'))}</button>
    <button class="btn ghost" data-home>${esc(tr('books.backCafe'))}</button>
  </div></div>`));
  tap(s.querySelector('[data-look]'), () => { S.closeScreen(s); onLook(); }, click);
  tap(s.querySelector('[data-home]'), () => { S.closeScreen(s); onHome(); }, click);
  return s;
}

/** Shop > Packs: the section header and one card per book (shown once Puzzle Books are unlocked). */
export function renderBookShop(app, list, rerender, onShopClose) {
  list.appendChild(el(`<h3 class="shop-sub" data-section="books">${esc(tr('books.title'))} <small>${esc(tr('books.shop.small'))}</small></h3>`));
  for (const b of BOOKS) {
    const owned = ownsBook(app.save, b.id);
    const freeDone = Array.from({ length: b.free }, (_, i) => i + 1).every((n) => isSolved(app.save, b.id, n));
    const r = el(`<div class="row-item money-row book-shop-card"><div class="grow">
      <div class="kicker">${esc(tr('books.shop.kicker'))}</div>
      <div class="name">${esc(b.name)}${owned ? ` <span class="tag">${esc(tr('books.shop.yours'))}</span>` : ''}</div>
      <div class="desc">${esc(tr('books.shop.desc', { n: b.puzzles.length }))}</div>
      <div class="desc">${esc(tr('books.shop.only'))}</div>
      <div class="book-shop-btns">
        ${owned ? '' : `<button class="btn money small" data-buy aria-label="${esc(tr('books.buy.aria', { price: b.price }))}"><span>${esc(tr('books.buy.get'))}</span><span class="price">${esc(b.price)}</span></button>`}
        <button class="btn ghost small" data-open>${esc(owned || freeDone ? tr('books.shop.open') : tr('books.shop.playFree', { n: b.free }))}</button>
      </div></div></div>`);
    const buy = r.querySelector('[data-buy]');
    if (buy) tap(buy, () => showBookBuy(app, b.id, rerender), click);
    tap(r.querySelector('[data-open]'), () => showBook(app, b.id, { from: 'shop', onClose: () => { Svc.setInBook(false); rerender(); } }), click);
    list.appendChild(r);
  }
}

