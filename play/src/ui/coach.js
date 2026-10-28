// The first-run lesson's coach overlay (docs/UX_FIRST_RUN.md): a warm dim veil with holes over what is being taught,
// a cream ring round each hole, a pointing hand, and a cream caption card with Pip's head, an optional OK and a Skip.
// DOM over the canvas (above the HUD, below the screens and toasts). Presentation only: it never touches the game,
// the save or ads; main.js decides what to show (src/meta/firstRun.js holds the steps and copy).
import { drawKeeper } from '../game/keeperArt.js';
import { t as tr } from './i18n.js';

const NS = 'http://www.w3.org/2000/svg';
// fingertip at (20, 4) of a 48 × 60 box
const HAND = `<svg viewBox="0 0 48 60" width="48" height="60" aria-hidden="true"><path d="M20 4c-2.8 0-5 2.2-5 5v22l-3.2-3.2c-2-2-5.2-2-7 0-1.8 1.8-1.8 4.6 0 6.5l12 13.5C19.6 51.9 23.5 54 28 54h4c7.7 0 14-6.3 14-14V27c0-2.8-2.2-5-5-5-1 0-2 .3-2.8.8C37.5 20.6 35.5 19 33 19c-1.2 0-2.4.4-3.3 1.1C28.9 18.3 27.1 17 25 17V9c0-2.8-2.2-5-5-5z" fill="#fffaf2" stroke="#2b211c" stroke-width="2.5" stroke-linejoin="round"/></svg>`;

function pipHead(canvas) {
  try {
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const s = 44;
    canvas.width = s * dpr; canvas.height = s * dpr;
    const g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawKeeper(g, s / 2, s / 2 + 3, 17, 'pip', null, 'happy');
  } catch (_) { /* the card still reads fine without the face */ }
}

/** A rounded-rect sub-path (for the veil's even-odd holes). */
function rr(x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  return `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
}

export class Coach {
  constructor(parent = document.body) {
    this.parent = parent;
    this.root = null;
    this.active = false;
    this.reduced = false;
  }

  /**
   * o.text: the caption. o.holes: [{ x, y, w, h, r }] lit areas (CSS px). o.dim: draw the veil (default true).
   * o.hand: { x, y, dir: 'up' | 'down', travel: px it slides in from (T1), tapAt? } or null.
   * o.ok: show an OK button (o.onOk). o.tapAnywhere: a tap on the veil counts as OK.
   * o.place: { below: y } or { above: y } for the card (clamped on screen). o.strip: the slim "Your turn" strip at o.place.
   * o.onSkip: the Skip button. o.passThrough: the veil lets taps through to the board (T1).
   */
  show(o) {
    this.hide();
    this.active = true;
    const W = window.innerWidth, H = window.innerHeight;
    const root = document.createElement('div');
    root.className = 'coach' + (o.strip ? ' coach-strip-mode' : '') + (this.reduced ? ' still' : '');
    root.setAttribute('data-coach', o.step || '');
    this.root = root;

    if (o.dim !== false && !o.strip) {
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('class', 'coach-veil' + (o.passThrough ? ' pass' : ''));
      svg.setAttribute('width', W); svg.setAttribute('height', H);
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      const holes = (o.holes || []).map((h) => rr(h.x, h.y, h.w, h.h, h.r ?? 14)).join('');
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', `M0 0H${W}V${H}H0Z${holes}`);
      p.setAttribute('fill-rule', 'evenodd');
      p.setAttribute('class', 'coach-dim');
      svg.appendChild(p);
      for (const h of o.holes || []) {
        const ring = document.createElementNS(NS, 'path');
        ring.setAttribute('d', rr(h.x - 3, h.y - 3, h.w + 6, h.h + 6, (h.r ?? 14) + 3));
        ring.setAttribute('class', 'coach-ring');
        svg.appendChild(ring);
      }
      if (o.tapAnywhere && o.onOk) svg.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); o.onOk(); });
      else if (!o.passThrough) svg.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); });
      root.appendChild(svg);
    }

    if (o.hand) this.addHand(o.hand);

    const card = document.createElement('div');
    card.className = o.strip ? 'coach-strip' : 'coach-card';
    card.setAttribute('role', 'status');
    card.innerHTML = `<canvas class="coach-pip" aria-hidden="true"></canvas><p class="coach-text"></p>`;
    card.querySelector('.coach-text').textContent = o.text || '';
    pipHead(card.querySelector('canvas'));
    if (!o.strip) {
      const row = document.createElement('div');
      row.className = 'coach-row';
      const skip = document.createElement('button');
      skip.className = 'coach-skip';
      skip.type = 'button';
      skip.textContent = tr('coach.skip');
      skip.setAttribute('aria-label', tr('coach.skipAria'));
      skip.addEventListener('pointerdown', (e) => e.stopPropagation());
      skip.addEventListener('click', (e) => { e.stopPropagation(); if (o.onSkip) o.onSkip(); }); // click: keyboard and switch access too
      row.appendChild(skip);
      if (o.ok) {
        const ok = document.createElement('button');
        ok.className = 'coach-ok';
        ok.type = 'button';
        ok.textContent = tr('coach.ok');
        ok.addEventListener('pointerdown', (e) => e.stopPropagation());
        ok.addEventListener('click', (e) => { e.stopPropagation(); if (o.onOk) o.onOk(); });
        row.appendChild(ok);
      }
      card.appendChild(row);
    } else {
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', tr('coach.stripAria', { text: String(o.text) }));
      card.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); if (o.onOk) o.onOk(); });
    }
    root.appendChild(card);
    this.parent.appendChild(root);

    // place the card away from the target, kept on screen
    const ch = card.offsetHeight, pad = 12;
    const place = o.place || {};
    let top;
    if (place.below != null) {
      top = place.below + pad;
      if (top + ch > H - pad && place.above != null) top = place.above - pad - ch;
    } else if (place.above != null) {
      top = place.above - pad - ch;
      if (top < pad && place.below != null) top = place.below + pad;
    } else top = (H - ch) / 2;
    card.style.top = Math.round(Math.max(pad, Math.min(H - ch - pad, top))) + 'px';
    const ok = card.querySelector('.coach-ok');
    if (ok) try { ok.focus({ preventScroll: true }); } catch (_) { /* ignore */ }
  }

  /** The pointing hand: fingertip at (x, y). dir 'down' points down at the spot; travel slides it in from above. */
  addHand(h) {
    if (!this.root) return;
    const n = document.createElement('div');
    n.className = 'coach-hand ' + (h.dir === 'up' ? 'up' : 'down') + (h.travel ? ' travel' : '');
    n.innerHTML = HAND;
    // fingertip (20, 4); rotated 180° it sits at (28, 56)
    const fx = h.dir === 'up' ? 20 : 28, fy = h.dir === 'up' ? 4 : 56;
    n.style.left = Math.round(h.x - fx) + 'px';
    n.style.top = Math.round(h.y - fy) + 'px';
    if (h.travel) n.style.setProperty('--travel', `${-Math.round(h.travel)}px`);
    this.root.appendChild(n);
    this.hand = n;
  }

  removeHand() { if (this.hand) { this.hand.remove(); this.hand = null; } }

  hide() {
    if (this.root) this.root.remove();
    this.root = null;
    this.hand = null;
    this.active = false;
  }
}
