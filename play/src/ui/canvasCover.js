// Perf: tells the main loop when the game canvas is hidden behind the DOM screens, so it can skip work nobody sees.
// - 'covered': an opaque screen (Home, or a .solid page such as the Shop) is fully faded in on top. The canvas is
//   not drawn at all (game.update still runs). Home has its own café canvas; drawing the harbour scene under it
//   cost about as much as the whole game frame.
// - 'modal': a blurred-scrim sheet (.screen.modal) is open. The canvas keeps moving but redraws at a low rate,
//   which also spares the backdrop-filter blur from re-rendering every frame.
// - 'open': nothing in the way; draw every frame.
// Tracked with one MutationObserver on #screens (no per-frame DOM queries). Purely cosmetic: no rules, scores or ads.

const FADE_MS = 300; // .screen fadein is 0.25 s: an opaque screen only hides the canvas once it is fully in

export function watchCanvasCover(root) {
  let coverAt = Infinity; // time (performance.now) after which an opaque screen fully hides the canvas
  let modal = false;
  const added = new WeakMap();
  if (!root || typeof MutationObserver !== 'function') return { state: () => 'open' };

  const recompute = () => {
    const now = performance.now();
    let at = Infinity, m = false;
    for (const n of root.children) {
      if (!added.has(n)) added.set(n, now);
      const cl = n.classList;
      if (!cl || !cl.contains('screen') || cl.contains('leaving') || cl.contains('preview-hidden')) continue;
      if (cl.contains('home') || cl.contains('solid')) at = Math.min(at, added.get(n) + FADE_MS);
      else if (cl.contains('modal')) m = true;
    }
    coverAt = at; modal = m;
  };
  new MutationObserver(recompute).observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  recompute();

  return {
    /** 'covered' | 'modal' | 'open' at time `now` (performance.now / rAF time). */
    state(now) {
      if (now >= coverAt) return 'covered';
      return modal ? 'modal' : 'open';
    },
  };
}
