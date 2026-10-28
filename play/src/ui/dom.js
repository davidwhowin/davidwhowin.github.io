// Small DOM helpers + shared icons.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export function fmt(n) {
  return Math.floor(n || 0).toLocaleString('en-US');
}

export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** Bind a click/tap that fires once per press and plays the UI sound. */
export function tap(node, fn, sound) {
  if (!node) return;
  node.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    try { sound && sound(); } catch (_) { /* ignore */ }
    fn(e);
  });
}

/** Count a number up inside a node. Returns a promise. */
export function countUp(node, from, to, dur = 900, onTick) {
  return new Promise((resolve) => {
    const t0 = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      const v = Math.round(from + (to - from) * e);
      node.textContent = fmt(v);
      if (onTick) onTick(v, p);
      if (p < 1) requestAnimationFrame(step); else resolve();
    };
    requestAnimationFrame(step);
  });
}

const S = (b) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${b}</svg>`;

/**
 * One icon per look (docs/UX_OPPORTUNITIES.md item 6): both are in the markup and styles.css shows the café one
 * unless <html data-look="cosmic">, so a live look switch needs no re-render. The wrappers are display: contents,
 * so the visible SVG sizes exactly like a plain icon would.
 */
export const byLook = (cafe, cosmic) => `<span class="lk lk-cafe">${cafe}</span><span class="lk lk-cosmic">${cosmic}</span>`;

// Café-look booster and goal icons (fixed colours, cocoa outline, like the teapot)
const GULL_ICON = '<svg viewBox="0 0 24 24"><g stroke="#4e3428" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round"><path d="M12 12.5C10 8.5 6.5 6.2 1.8 6.6c2.6 1.4 4.4 3.6 5.2 6.4z" fill="#c7d0d8"/><path d="M12 12.5c2-4 5.5-6.3 10.2-5.9-2.6 1.4-4.4 3.6-5.2 6.4z" fill="#c7d0d8"/><path d="M1.8 6.6c1.2.6 2.2 1.3 3 2.1l-.2-2.2z" fill="#4e5a66"/><path d="M22.2 6.6c-1.2.6-2.2 1.3-3 2.1l.2-2.2z" fill="#4e5a66"/><ellipse cx="12" cy="14.6" rx="2.6" ry="4.4" fill="#fffaf2"/><circle cx="12" cy="10.4" r="2.2" fill="#fffaf2"/><path d="M11.1 12.1l.9 2 .9-2z" fill="#f2b84b"/></g><circle cx="11.2" cy="10" r=".45" fill="#2b211c"/><circle cx="12.8" cy="10" r=".45" fill="#2b211c"/></svg>';
const SUGAR_ICON = '<svg viewBox="0 0 24 24"><g stroke="#4e3428" stroke-width="1.3" stroke-linejoin="round"><path d="M11.5 4.5l7.5 3.4-7.5 3.4L4 7.9z" fill="#ffffff"/><path d="M4 7.9v8.4l7.5 3.6v-8.6z" fill="#f2ebe0"/><path d="M19 7.9v8.4l-7.5 3.6v-8.6z" fill="#dfd3c2"/></g><g fill="#c9b9a3"><circle cx="7" cy="12" r=".6"/><circle cx="8.8" cy="15.4" r=".6"/><circle cx="15" cy="12.8" r=".6"/><circle cx="16.4" cy="15.9" r=".6"/><circle cx="10.6" cy="7.4" r=".55"/><circle cx="13.2" cy="8.4" r=".55"/></g><path d="M20 1.8l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6z" fill="#f0b85a" stroke="#b86a00" stroke-width=".5"/></svg>';
const PEBBLE_ICON = '<svg viewBox="0 0 24 24"><ellipse cx="12" cy="19" rx="8" ry="1.6" fill="#5a4030" opacity=".2"/><path d="M3.2 13.4c0-4 3.9-7 8.9-7s8.7 2.7 8.7 6.4-3.8 5.9-8.9 5.9-8.7-1.4-8.7-5.3z" fill="#a39d94" stroke="#4e4038" stroke-width="1.4"/><path d="M3.6 14.6c2.5 1.1 5.5-.3 8.6.1s5.4 1.3 8.3-.4" fill="none" stroke="#f4efe6" stroke-width="1.2" opacity=".6"/><ellipse cx="8.6" cy="9.8" rx="3" ry="1.4" fill="#fff" opacity=".55" transform="rotate(-18 8.6 9.8)"/><circle cx="14.5" cy="11.2" r=".7" fill="#6a635b"/><circle cx="16.8" cy="13.6" r=".55" fill="#6a635b"/><circle cx="10.6" cy="15.9" r=".55" fill="#6a635b"/></svg>';
// blossom petals: five circles 5.6 from the centre, the first straight up (ICONS.blossom / blossomEmpty)
const PETALS = [0, 1, 2, 3, 4].map((k) => {
  const a = -Math.PI / 2 + k * (2 * Math.PI / 5);
  return [(12 + Math.cos(a) * 5.6).toFixed(2), (12 + Math.sin(a) * 5.6).toFixed(2)];
});

export const ICONS = {
  // comet (Seagull), wild (Sugar) and asteroid (stone) are look pairs: café art first, the Cosmic art second
  sound: S('<path d="M11 5L6 9H3v6h3l5 4z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13"/>'),
  music: S('<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3" fill="currentColor"/><circle cx="17" cy="16" r="3" fill="currentColor"/>'),
  soundOff: S('<path d="M11 5L6 9H3v6h3l5 4z" fill="currentColor"/><path d="M16 9l6 6M22 9l-6 6"/>'),
  haptics: S('<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M3 8v8M21 8v8"/>'),
  shop: S('<path d="M4 7h16l-1.5 12a2 2 0 01-2 1.8h-9a2 2 0 01-2-1.8z"/><path d="M9 10V6a3 3 0 016 0v4"/>'),
  missions: S('<path d="M9 11l2 2 4-4"/><rect x="4" y="3" width="16" height="18" rx="3"/>'),
  gift: S('<rect x="3" y="8" width="18" height="13" rx="2"/><path d="M12 8v13M3 12h18M12 8c-2-4-6-4-6-1s6 1 6 1 6 2 6-1-4-3-6 1z"/>'),
  calendar: S('<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/><circle cx="12" cy="15" r="2" fill="currentColor"/>'),
  back: S('<path d="M15 5l-7 7 7 7"/>'),
  close: S('<path d="M6 6l12 12M18 6L6 18"/>'),
  play: '<svg viewBox="0 0 24 24"><path d="M7 4l13 8-13 8z" fill="currentColor"/></svg>',
  moon: S('<path d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z" fill="currentColor" fill-opacity=".25"/>'),
  infinity: S('<path d="M7 8c-3 0-5 2-5 4s2 4 5 4c4 0 6-8 10-8 3 0 5 2 5 4s-2 4-5 4c-4 0-6-8-10-8z"/>'),
  map: S('<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>'),
  noads: S('<circle cx="12" cy="12" r="9"/><path d="M5.5 5.5l13 13"/><path d="M8 15l2-6 2 6M9 13h2M14 9v6h1.5a3 3 0 000-6z"/>'),
  numbers: S('<circle cx="12" cy="12" r="9"/><path d="M10 9l2-1v8"/>'),
  auto: S('<rect x="5" y="8" width="14" height="11" rx="3"/><path d="M12 4v4M9 13h.01M15 13h.01M9.5 16.5h5"/>'),
  calm: S('<path d="M12 21c-5-3-8-7-8-11a8 8 0 0116 0c0 4-3 8-8 11z"/><path d="M9 11c1 1 5 1 6 0"/>'),
  undo: S('<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 010 11H11"/>'),
  comet: byLook(GULL_ICON, S('<circle cx="15" cy="9" r="4" fill="currentColor"/><path d="M12 12L4 20M10 9L5 14M15 14l-4 5"/>')),
  wild: byLook(SUGAR_ICON, S('<path d="M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z" fill="currentColor"/>')),
  shuffle: S('<path d="M12 3v18"/><path d="M8 7l4-4 4 4M8 17l4 4 4-4"/>'),
  asteroid: byLook(PEBBLE_ICON, '<svg viewBox="0 0 24 24"><path d="M5 9l3-5 7 1 5 5-1 7-6 4-7-2-2-5z" fill="#8a8f9c" stroke="#3a3d48" stroke-width="1.5"/><circle cx="10" cy="10" r="2" fill="#5b5f6c"/><circle cx="15" cy="15" r="1.5" fill="#5b5f6c"/></svg>'),
  // light halo strokes first so the handle and spout still read on the dark goal chip (UX_MECHANICS P7)
  teapot: '<svg viewBox="0 0 24 24"><g stroke="#fff8ee" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity=".9"><path d="M5 11a4 4 0 00-1 7" stroke-width="4.6"/><path d="M18 14l3.5-5" stroke-width="4.6"/><path d="M6 10h12c2 4 1 9-3 10H9c-4-1-5-6-3-10z" stroke-width="3.6"/><circle cx="12" cy="7.6" r="1.3" stroke-width="2.4"/></g><path d="M5 11a4 4 0 00-1 7" fill="none" stroke="#4e3428" stroke-width="2.4" stroke-linecap="round"/><path d="M18 14l3.5-5" stroke="#4e3428" stroke-width="2.4" stroke-linecap="round"/><path d="M6 10h12c2 4 1 9-3 10H9c-4-1-5-6-3-10z" fill="#fff4e6" stroke="#4e3428" stroke-width="1.5"/><path d="M6.3 14.5h11.4" stroke="#e59a9a" stroke-width="2"/><ellipse cx="12" cy="10" rx="5" ry="1.4" fill="#e8cfb2" stroke="#4e3428" stroke-width="1.2"/><circle cx="12" cy="7.6" r="1.3" fill="#c95b6a"/></svg>',
  score: S('<path d="M12 2l3 6.5 7 .9-5 4.9 1.2 7L12 18l-6.2 3.3L7 14.3 2 9.4l7-.9z" fill="#ffd54a" stroke="#ffd54a"/>'),
  combo: S('<path d="M13 2L4 14h7l-1 8 9-12h-7z" fill="#ff8a5c" stroke="#ff8a5c"/>'),
  supernova: S('<circle cx="12" cy="12" r="4" fill="#ff4fd8" stroke="#ff4fd8"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4M4 4l3 3M17 17l3 3M4 20l3-3M17 7l3-3" stroke="#ff9ae8"/>'),
  lock: '🔒',
  star: '<svg class="star" viewBox="0 0 24 24"><path d="M12 2l3 6.5 7 .9-5 4.9 1.2 7L12 18l-6.2 3.3L7 14.3 2 9.4l7-.9z" fill="#ffd54a" stroke="#b86a00" stroke-width="1"/></svg>',
  // the 1–3 finish rating (docs/UX_STARS.md): a round five-petal blossom, never gold, so it can't be mistaken for the
  // café ★. Earned = filled rose #b5475a; not yet = the same shape in outline only (shape AND fill differ, WCAG 1.4.1).
  blossom: `<svg class="blossom" viewBox="0 0 24 24" aria-hidden="true"><g fill="#b5475a">${PETALS.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.4"/>`).join('')}</g><circle cx="12" cy="12" r="2.3" fill="#fff3e6"/></svg>`,
  // outline: stroke every petal, then fill them all with cream on top so only the flower's outer edge stays (1.5 px)
  blossomEmpty: `<svg class="blossom empty" viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="#a08060" stroke-width="3">${PETALS.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.4"/>`).join('')}</g><g fill="#fff8ec">${PETALS.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.4"/>`).join('')}</g><circle cx="12" cy="12" r="2.3" fill="none" stroke="#a08060" stroke-width="1.2"/></svg>`,
  // the Cosmic look's rating mark: a four-point sparkle (never the five-point café ★)
  sparkle: '<svg class="blossom sparkle" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2Q13.2 10.8 22 12 13.2 13.2 12 22 10.8 13.2 2 12 10.8 10.8 12 2z" fill="#ffd54a" stroke="#b86a00" stroke-width=".8"/></svg>',
  sparkleEmpty: '<svg class="blossom sparkle empty" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2Q13.2 10.8 22 12 13.2 13.2 12 22 10.8 13.2 2 12 10.8 10.8 12 2z" fill="none" stroke="#a08060" stroke-width="1.5"/></svg>',
};

/**
 * In play: the first free y (CSS px) for a message over the board. Starts at the board's top inside the frame
 * (#hud data-play-top, set by main.js relayout; the rule box's spot), never above the HUD's top block, and goes
 * below each visible element in `below`.
 */
export function playStackTop(hud, below = []) {
  const ht = hud.querySelector('#hud-top');
  const hb = ht && ht.getClientRects().length ? ht.getBoundingClientRect().bottom : 0;
  let y = Math.max(+hud.dataset.playTop || 0, hb + 8);
  for (const sel of below) {
    const n = hud.querySelector(sel);
    if (!n || n.classList.contains('hidden') || n.classList.contains('out') || !n.getClientRects().length) continue;
    y = Math.max(y, n.getBoundingClientRect().bottom + 8);
  }
  return Math.round(y);
}
