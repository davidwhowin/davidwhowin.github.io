// Translation safety net (docs/LOCALISATION_LAYOUT.md, "Safety net"): German, French, Spanish and Portuguese text runs
// 20-40% longer than English, and the drafts have hundreds of strings longer than the English box was built for.
// Instead of hand-shortening them, this pass shrinks the type of any label that would break its box:
//   - text that runs out of its box sideways (a one-line button or chip label), or
//   - a short label (up to 4 words) whose word got split across two lines ("Garderob|e" on a narrow tab).
// It steps the font size down to at most 72% of the styled size and stops at the first size that fits. Paragraphs
// still wrap between words as before. English is never touched (the pass is off while the locale is 'en'), so the
// English layout stays byte-for-byte what it was. Runs inside a MutationObserver, so a new card is fitted before it
// paints. A label that was hidden when it arrived (the HUD before play) is fitted on the frame it is shown (class /
// style / hidden changes), and a label whose text is replaced is checked again. Opt out with data-nofit.
import { getLocale } from './i18n.js';

const MIN_SCALE = 0.72;
const STEPS = [0.94, 0.88, 0.82, 0.77, MIN_SCALE];
const MAX_PER_BATCH = 600;
const SKIP = new Set(['SCRIPT', 'STYLE', 'CANVAS', 'SVG', 'INPUT', 'TEXTAREA', 'SELECT', 'OPTION']);

const ownText = (el) => {
  let s = '';
  for (const c of el.childNodes) if (c.nodeType === 3) s += c.textContent;
  return s.trim();
};

/** The box that holds the text: the element itself, or its parent when the element is inline (no box width). */
function boxOf(el) {
  if (el.clientWidth > 0) return el;
  const p = el.parentElement;
  return p && p.clientWidth > 0 ? p : null;
}

function overflowsSideways(box) {
  if (box.scrollWidth <= box.clientWidth + 1) return false;
  const ox = getComputedStyle(box).overflowX;
  return ox !== 'auto' && ox !== 'scroll'; // a scroller overflows on purpose
}

/** True when one word of a short label is broken over two lines. */
function splitsWord(el) {
  const doc = el.ownerDocument;
  if (!doc || !doc.createRange) return false;
  const range = doc.createRange();
  for (const node of el.childNodes) {
    if (node.nodeType !== 3) continue;
    const text = node.textContent;
    const re = /\S+/g;
    let m;
    while ((m = re.exec(text))) {
      range.setStart(node, m.index);
      range.setEnd(node, m.index + m[0].length);
      const rects = [...range.getClientRects()].filter((r) => r.width > 0);
      if (rects.length > 1 && Math.abs(rects[rects.length - 1].top - rects[0].top) > 2) return true;
    }
  }
  return false;
}

const broken = (el, box, short) => overflowsSideways(box) || (short && splitsWord(el));

// labels already measured while visible (skipped on later reveal checks until their text changes)
const done = new WeakSet();

/** Shrink one label until it fits (or reaches MIN_SCALE). Returns true when it changed anything. */
export function fitLabel(el, force = false) {
  if (done.has(el) && !force) return false;
  const text = ownText(el);
  if (!text || el.closest('[data-nofit]')) return false;
  const box = boxOf(el);
  if (!box) return false; // hidden for now: checked again when shown
  done.add(el);
  const short = text.split(/\s+/).length <= 4;
  if (!broken(el, box, short)) return false;
  const target = box;
  const base = parseFloat(target.dataset.fitBase || getComputedStyle(target).fontSize);
  if (!(base > 0)) return false;
  target.dataset.fitBase = String(base);
  for (const s of STEPS) {
    target.style.fontSize = `${(base * s).toFixed(2)}px`;
    if (!broken(el, box, short)) break;
  }
  return true;
}

/** Fit every label under (and including) `root`; `force` re-checks labels measured before (fonts, resize). */
export function fitTree(root, force = false) {
  if (!root || root.nodeType !== 1 || getLocale() === 'en') return 0;
  let n = 0, seen = 0;
  const visit = (el) => {
    if (SKIP.has(el.tagName.toUpperCase()) || seen++ > MAX_PER_BATCH) return;
    if (fitLabel(el, force)) n++;
    for (const c of el.children) visit(c);
  };
  visit(root);
  return n;
}

/** Watch `target` for new screens, cards and toasts and fit them before they paint. Returns the observer (or null). */
export function watchTextFit(target) {
  if (!target || typeof MutationObserver === 'undefined') return null;
  const revealed = new Set();
  let raf = 0;
  // shown after a class / style / hidden change: fit what was hidden before, once the new styles apply
  const checkRevealed = () => {
    raf = 0;
    const list = [...revealed];
    revealed.clear();
    for (const el of list) if (el.isConnected && el.getClientRects().length) fitTree(el);
  };
  const mo = new MutationObserver((recs) => {
    if (getLocale() === 'en') return;
    const roots = new Set();
    for (const r of recs) {
      for (const n of r.addedNodes) {
        if (n.nodeType === 1 && n.isConnected) roots.add(n);
        // a label whose text was replaced (el.textContent = ...): check just that label
        else if (n.nodeType === 3 && r.target.nodeType === 1 && r.target.isConnected) { done.delete(r.target); roots.add(r.target); }
      }
      if (r.type === 'attributes' && r.target.isConnected) revealed.add(r.target);
    }
    if (revealed.size && !raf) raf = requestAnimationFrame(checkRevealed);
    for (const el of roots) {
      // a node inside another added node is covered by its ancestor
      let covered = false;
      for (let p = el.parentElement; p; p = p.parentElement) if (roots.has(p)) { covered = true; break; }
      if (!covered) fitTree(el);
    }
  });
  mo.observe(target, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'style', 'hidden'] });
  // web fonts change widths once they arrive, and a rotation changes the boxes
  try { if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => fitTree(target, true)); } catch (_) { /* old browser */ }
  try { window.addEventListener('resize', () => fitTree(target, true)); } catch (_) { /* no window */ }
  fitTree(target);
  return mo;
}
