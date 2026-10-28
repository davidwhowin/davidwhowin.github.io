// The first-time café tour on Home (docs/UX_RESTORE_TUTORIAL.md Part 1, steps C1–C6) and its replay from
// More › How to play › "How the café works". Rules and save flags live in src/meta/cafeTour.js; this file only draws.
//
// One idea and one action per step, told by Pip, on the real screens. Nothing auto-advances:
//   C1 story   (Next)          the weathered terrace, everything else dimmed
//   C2 stars   (Next)          the ★ chip in the café's top bar
//   C3 restore (tap Restore)   a gold ring on Home's Restore button; Play stays usable (the dim never blocks a tap)
//   C4 pick    (tap the row)   Pip's strip inside the build sheet; ring + hand on the first fix she can afford
//   C5 style   (Restore it)    the strip changes; the build plays out (wipe, brighten), then
//   C6 next    (Done or Play)  a ring on the area card's "Next:" line and on Play. Ends the tour: tut = 'done'.
// "Skip tour" on C1–C4 sets tut = 'skipped'. Leaving mid-tour just stops: the next Home visit picks up at C3 (or C6).
// The replay shows C1–C3 with Next on each, then opens the sheet (ringed when a fix is affordable); it never writes tut.
//
// The dim is one element with a huge box-shadow around a cut-out (aria-hidden, pointer-events: none), so whatever is
// under it still works. Reduced motion: no transitions (the camera cut and the still hand are cafeView's).
import { markTourStarted, endTour } from '../meta/cafeTour.js';
import { starsAvailable } from '../meta/cafe.js';
import { t as tr, tp as trp } from './i18n.js';

const fmt = (n) => Number(n || 0).toLocaleString('en-US');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/**
 * Start the tour (or its replay) over Home.
 * opts: { host (the Home screen node), cafe (mountCafe api), save, step: 'c1'|'c3'|'c6', replay, persist(), onEnd() }
 * Returns { onCafe(evt), place(), leave(), get active, get step, replay } or null without a DOM.
 */
export function startCafeTour(opts) {
  const { host, cafe, save } = opts;
  if (typeof document === 'undefined' || !host || !cafe) return null;
  const replay = !!opts.replay;
  const persist = () => { try { if (opts.persist) opts.persist(); } catch (e) { console.error(e); } };
  const root = document.createElement('div');
  root.className = 'ctour';
  const hole = document.createElement('div');
  hole.className = 'ctour-hole';
  hole.setAttribute('aria-hidden', 'true');
  const card = document.createElement('div');
  card.className = 'ctour-bubble';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', tr('cafeTour.label'));
  root.append(hole, card);
  host.appendChild(root);

  let step = null;
  let alive = true;
  let ringed = [];
  const q = (sel) => host.querySelector(sel);
  const setRings = (sels) => {
    for (const e of ringed) e.classList.remove('ctour-ring');
    ringed = [];
    for (const s of sels || []) { const e = q(s); if (e) { e.classList.add('ctour-ring'); ringed.push(e); } }
  };

  // ------------------------------------------------------------ steps
  const n = () => starsAvailable(save);
  const STEPS = {
    c1: { text: () => tr('cafeTour.c1'), at: 'scene', btn: 'next', skip: true },
    c2: { text: () => (replay && n() < 1 ? tr('cafeTour.c2replay') : trp('cafeTour.c2', n(), { n: fmt(n()) })), at: '.cafe-stars', btn: 'next', skip: true },
    c3: { text: () => tr('cafeTour.c3'), at: '.home-restore', rings: ['.home-restore'], btn: replay ? 'next' : null, skip: !replay },
    c4: { sheet: () => tr('cafeTour.c4'), skip: true },
    c5: { sheet: () => tr('cafeTour.c5') },
    building: {},
    c6: { text: () => tr('cafeTour.c6'), at: '.cafe-title-next', alt: '.cafe-title', rings: ['.home-play'], btn: 'done' },
  };

  function go(next) {
    if (!alive) return;
    step = next;
    const s = STEPS[next];
    if (next === 'c1' && !replay) { markTourStarted(save); persist(); }
    if (next === 'c1') { try { cafe.panTo('terrace'); } catch (_) { /* gone */ } }
    // the sheet steps speak from inside the sheet; the overlay steps from the tour's own bubble
    if (s.sheet) {
      root.hidden = true; setRings([]);
      cafe.setSheetTip(s.sheet(), s.skip && !replay ? skip : null);
      if (next === 'c4') cafe.guideRow();
      return;
    }
    cafe.setSheetTip(null);
    if (!s.text) { root.hidden = true; setRings([]); return; }
    cafe.hush();
    root.hidden = false;
    card.innerHTML = `<span class="ctour-who">Pip</span><p class="ctour-text" aria-live="polite">${esc(s.text())}</p>`;
    const row = document.createElement('div');
    row.className = 'ctour-row';
    if (s.skip) {
      const k = document.createElement('button');
      k.className = 'ctour-skip'; k.type = 'button'; k.textContent = tr('cafeTour.skip');
      k.addEventListener('click', skip);
      row.appendChild(k);
    }
    let main = null;
    if (s.btn) {
      main = document.createElement('button');
      main.className = 'btn primary ctour-next'; main.type = 'button';
      main.textContent = s.btn === 'done' ? tr('cafeTour.done') : tr('cafeTour.next');
      main.addEventListener('click', () => advance());
      row.appendChild(main);
    }
    if (row.children.length) card.appendChild(row);
    setRings(s.rings);
    place();
    const focusTo = main || (s.rings && q(s.rings[0]));
    if (focusTo && focusTo.focus) requestAnimationFrame(() => { try { focusTo.focus({ preventScroll: true }); } catch (_) { /* old browser */ } });
  }

  function advance() {
    if (step === 'c1') go('c2');
    else if (step === 'c2') go('c3');
    else if (step === 'c3') {
      // the replay ends by opening the sheet (with the ring when there is something she can afford)
      end();
      cafe.guideRow();
      cafe.openBuildSheet();
    } else if (step === 'c6') finish();
  }
  function skip() {
    if (!replay) { endTour(save, 'skipped'); persist(); }
    end();
  }
  /** C6 closed (Done or Play): the tour is over. */
  function finish() {
    if (!replay) { endTour(save, 'done'); persist(); }
    end();
  }
  function end() {
    if (!alive) return;
    alive = false;
    setRings([]);
    try { cafe.setSheetTip(null); } catch (_) { /* gone */ }
    root.remove();
    try { if (opts.onEnd) opts.onEnd(); } catch (e) { console.error(e); }
  }

  // ------------------------------------------------------------ placement
  const rel = (e, hr) => { const r = e.getBoundingClientRect(); return { l: r.left - hr.left, t: r.top - hr.top, r: r.right - hr.left, b: r.bottom - hr.top }; };
  function place() {
    if (!alive || root.hidden || !step) return;
    const s = STEPS[step];
    const hr = host.getBoundingClientRect();
    const W = hr.width, H = hr.height;
    if (!W || !H) return;
    const cw = Math.min(W - 32, 420);
    card.style.width = `${cw}px`;
    card.style.left = `${Math.round((W - cw) / 2)}px`;
    const ch = card.offsetHeight || 140;
    let box = null;
    if (s.at === 'scene') {
      // C1: the terrace itself; Pip speaks just under the area card, above the cut-out
      const topEl = q('.cafe-top'), barEl = q('.home-bottom');
      const top0 = topEl ? rel(topEl, hr).b : 80;
      const bot0 = barEl && barEl.getBoundingClientRect().height ? rel(barEl, hr).t : H - 200;
      box = { l: 16, r: W - 16, t: Math.min(top0 + ch + 24, bot0 - 120), b: bot0 - 10 };
    } else {
      const e = q(s.at) || (s.alt ? q(s.alt) : null);
      if (e && e.getBoundingClientRect().height) { const r = rel(e, hr); box = { l: r.l - 6, r: r.r + 6, t: r.t - 6, b: r.b + 6 }; }
    }
    if (box) {
      Object.assign(hole.style, { display: 'block', left: `${box.l}px`, top: `${box.t}px`, width: `${box.r - box.l}px`, height: `${box.b - box.t}px` });
      const below = (box.t + box.b) / 2 < H / 2;
      if (below) { card.style.top = `${Math.round(Math.min(box.b + 12, H - ch - 8))}px`; card.style.bottom = ''; }
      else { card.style.top = `${Math.round(Math.max(8, box.t - 12 - ch))}px`; card.style.bottom = ''; }
    } else {
      hole.style.display = 'none';
      card.style.top = `${Math.round((H - ch) / 2)}px`;
    }
  }
  const onResize = () => place();
  if (typeof window !== 'undefined') window.addEventListener('resize', onResize);

  // ------------------------------------------------------------ the café's events drive the doing steps
  function onCafe(evt) {
    if (!alive || !evt) return;
    if (evt.type === 'sheet') {
      if (evt.mode === 'list') {
        if (replay) { end(); return; } // she opened the sheet herself: the replay has shown enough
        if (step === 'c1' || step === 'c2' || step === 'c3' || step === 'c5') go('c4');
      } else if (evt.mode === 'styles') {
        if (step === 'c4' || step === 'c3' || step === 'c1' || step === 'c2') go('c5');
      } else if (evt.mode == null) {
        if (step === 'c4' || step === 'c5') go('c3'); // she closed the sheet: back to "Tap Restore"
      }
    } else if (evt.type === 'build') {
      if (!replay) go('building');
    } else if (evt.type === 'settled') {
      if (step === 'building') go('c6');
    }
  }

  go(STEPS[opts.step] ? opts.step : 'c1');
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => place());
  return {
    onCafe,
    place() { place(); if (alive && step && STEPS[step].rings) setRings(STEPS[step].rings); },
    /** Home's Play was tapped: C6 counts as done; any earlier step just stops (it resumes next visit). */
    leave() { if (step === 'c6') finish(); else end(); if (typeof window !== 'undefined') window.removeEventListener('resize', onResize); },
    /** Home is re-rendering or closing: drop the overlay without changing anything. */
    destroy() { if (alive) { alive = false; setRings([]); root.remove(); } if (typeof window !== 'undefined') window.removeEventListener('resize', onResize); },
    /** True while a build plays out or the tour is on screen (the café keeps its own after-build lines quiet). */
    get active() { return alive; },
    get step() { return step; },
    replay,
  };
}
