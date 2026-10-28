// Café restoration view (v3, "Nova's Seaside Café"): the harbour panorama, the build sheet, restyling
// and the area celebration. Self-contained DOM + one canvas; styles in src/ui/cafe.css (scoped .cafe-*).
// Presentation only: every rule (stars, costs, rewards) lives in src/meta/cafe.js. Nothing here reads or
// changes the store, scores or difficulty, and there is no timer or pressure anywhere in the café.
//
// API
//   const cafe = mountCafe(container, {
//     save,                 // the live save object (cafe.js reads/writes save.cafe; the caller persists)
//     onChange(evt),        // after every write; evt.type: 'build' | 'restyle' | 'claim' | 'cam' | 'intro' | 'visitor'
//                           //   visitor { id, card }  (a café visitor was tapped; card = their postcard just arrived)
//     onVisitorCard(id),    // optional: "See the postcard" in the bubble after a visitor's story ends
//                           //   build   { taskId, style, areaComplete }   restyle { taskId, style }
//                           //   claim   { areaId, coins, extraCoins, keeper, keeperNew }  (coins already added)
//     onPlay(),             // "Play a level" (shown when stars run short); omit to hide the button
//     onShare(areaId),      // "Send a postcard" on the celebration card (see cafeArt.paintAreaPostcard)
//     onClose(),            // optional back button in the top bar; omit to hide it
//     keeperLive,           // optional { animateKeeperCanvas } (defaults to src/ui/keeperLive.js)
//     reducedMotion,        // bool or () => bool (Calm mode); also honours body.calm + prefers-reduced-motion
//     controls = true,      // the Restore / Play buttons along the bottom
//     bubble = true,        // Pip's speech bubble
//     autoCelebrate = true, // play a pending area celebration on mount / update()
//     bottomInset,          // px (or () => px) the host covers along the bottom; the scene centres above it
//     sfx(name), haptic(kind)  // optional feedback hooks: 'build' | 'restyle' | 'celebrate' | 'tap'
//     startLine = true,     // false: say nothing on mount (the host has its own line; the intro is still marked seen)
//     areaIntros = false,   // the new-area intro (docs/UX_RESTORE_TUTORIAL.md A1-A2) on mount and after "Lovely!"
//     quietBuild,           // () => bool: true while the café tour runs (no Pip line after a build; it speaks itself)
//   });
//   onChange also gets: 'sheet' { mode } (the sheet opened or changed page), 'settled' { taskId } (a build finished,
//   brighten included), 'met' { areaId } (an area intro was answered; save.cafe.met changed)
//   cafe.update()                 re-read the save (e.g. after a level was won) and refresh everything
//   cafe.openBuildSheet(taskId?)  open the sheet for the current area (optionally on one task's styles)
//   cafe.closeSheet()
//   cafe.say(lines, ms?)          Pip says a line or a list of lines (no-op when bubble is false)
//   cafe.panTo(areaId, { instant }) ease the camera to an area (instant in Calm mode)
//   cafe.celebrate(areaId?)       play the finish moment for a completed area (pays its reward once)
//   cafe.setReduced(v)  cafe.resize()  cafe.destroy()  cafe.cam (live { x, y, zoom })
//   cafe.setSheetTip(text|null)   Pip's one-line strip at the top of the build sheet (the café tour C4/C5)
//   cafe.guideRow()               ring + hand on the first affordable row the next time the sheet lists tasks
//   cafe.showAreaMeet(areaId)     the new-area intro (A1 reveal, then the A2 goal card)
//   cafe.pulseProp(propId|null)   a dashed ring on one prop (the restyle tip)
import {
  CAFE_AREAS, CAFE_AREA_BY_ID, CAFE_TASK_BY_ID, OUT_OF_CONTENT_LINE,
} from '../meta/cafeData.js';
import {
  areaState, buildTask, restyle, claimArea, currentArea, pendingCelebration, starsAvailable,
  markIntroSeen, setCafeCam, cafeLine, areaReward, taskCost, brightenPlayed, markBrightened,
} from '../meta/cafe.js';
import { nextFix } from '../meta/menuCards.js';
import { areaIntroDue, areaMeetInfo, markAreaMet, tipSeen, markTip } from '../meta/cafeTour.js';
import { KEEPER_BY_ID } from '../meta/keepers.js';
import {
  WORLD, WATER, PAINT_ORDER, KEEPER_SPOTS, PIP_SPOTS, areaBounds, cacheBounds, renderArea, paintBackdrop, paintWater,
  paintAreaLive, drawProp, propBox, propInkBox, propAnchor, propAt, paintPropChip, PROPS, frontLit,
} from '../game/cafeArt.js';
import { KeeperAnim } from '../game/keeperAnim.js';
import { drawKeeperPose } from '../game/keeperArt.js';
import * as keeperLiveDefault from './keeperLive.js';
import { Tweener, Ease } from '../game/tween.js';
import { mulberry32 } from '../game/rng.js';
import { cafeNight } from '../game/cafeArt.js';
import { paintNightSky } from '../game/cafeNight.js'; // wind-down Evening calm: dusk sky (areas bake at night in cafeArt)
import { paintSeasonDecor, paintSnow, isSnowySeason } from '../game/seasonalArt.js'; // seasonal decorations (cached sprites), winter snow
import { decorShown, seasonAt } from '../meta/seasonal.js';
import { hasTipJar } from '../meta/tips.js'; // the thank-you tip keepsake: a tip jar on the counter
import { dayKey } from '../meta/daily.js';
import { visitorsHere, visitorStatus, talkToVisitor, visitorNote } from '../meta/visitors.js';
import { VISITOR_SPOTS, VISITOR_R, drawVisitor, visitorBox } from '../game/visitorArt.js';
import { t as tr, tp as trp } from './i18n.js';

const TAU = Math.PI * 2;
/** Pip's line for the first-restore brighten when the awning was the first restore (docs/UX_RETENTION.md item 8b). */
export const brightenLine = () => tr('pip.brighten');
const BRIGHTEN_SECS = 1.4; // the frontage fades from weathered to brightened (instant under Calm)
const ZOOM_MIN = 0.7, ZOOM_MAX = 2.6;
const KEEPER_R = 58;
const TIP_JAR_DECOR = Object.freeze(['tip_jar']);
const fmt = (n) => Number(n || 0).toLocaleString('en-US');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const STAR = '<span class="cafe-star" aria-hidden="true">★</span>';

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

export function mountCafe(container, opts = {}) {
  if (typeof document === 'undefined' || !container) return null;
  const o = { controls: true, bubble: true, autoCelebrate: true, startLine: true, areaIntros: false, ...opts };
  const quiet = () => { try { return !!(o.quietBuild && o.quietBuild()); } catch { return false; } };
  const lowerThe = (s) => String(s || '').replace(/^The /, 'the ');
  let save = o.save;
  const live = o.keeperLive || keeperLiveDefault;
  const tw = new Tweener();
  const rng = mulberry32(0x7ea);
  const emit = (evt) => { try { if (o.onChange) o.onChange(evt); } catch (e) { console.error(e); } };
  const sfx = (n) => { try { if (o.sfx) o.sfx(n); } catch (_) { /* optional */ } };
  const haptic = (n) => { try { if (o.haptic) o.haptic(n); } catch (_) { /* optional */ } };
  // tells the host when a sheet or the celebration covers the scene (Home hides its own buttons so taps reach ours)
  const overlay = () => { try { if (o.onOverlay) o.onOverlay(sheet.classList.contains('open') || party.classList.contains('open')); } catch (e) { console.error(e); } };
  let reducedFlag = null;
  // prefers-reduced-motion: one MediaQueryList, its answer cached and kept current by its 'change' event
  let mql = null, mqlReduced = false;
  const onMql = (e) => { mqlReduced = !!e.matches; dirty = true; };
  try {
    if (typeof window !== 'undefined' && window.matchMedia) {
      mql = window.matchMedia('(prefers-reduced-motion: reduce)');
      mqlReduced = !!(mql && mql.matches);
      if (mql && mql.addEventListener) mql.addEventListener('change', onMql); else if (mql && mql.addListener) mql.addListener(onMql);
    }
  } catch { mql = null; mqlReduced = false; }
  const reduced = () => {
    if (reducedFlag != null) return reducedFlag;
    if (typeof o.reducedMotion === 'function') { if (o.reducedMotion()) return true; } else if (o.reducedMotion) return true;
    if (document.body && document.body.classList.contains('calm')) return true;
    return mqlReduced;
  };

  // ---------------------------------------------------------------- DOM
  const root = el('div', 'cafe-root');
  const canvas = el('canvas', 'cafe-canvas');
  canvas.setAttribute('aria-label', tr('cafe.canvasLabel'));
  canvas.setAttribute('role', 'img');
  const top = el('div', 'cafe-top');
  const bubble = el('div', 'cafe-bubble');
  bubble.setAttribute('aria-live', 'polite');
  const bottom = el('div', 'cafe-bottom');
  const sheet = el('div', 'cafe-sheet');
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'false');
  const party = el('div', 'cafe-party');
  party.setAttribute('role', 'dialog');
  // the new-area intro (A1 title plate, A2 goal card); both sit over the scene, never over the host's Play button
  const plate = el('div', 'cafe-plate');
  plate.setAttribute('aria-hidden', 'true');
  const meet = el('div', 'cafe-meet');
  meet.setAttribute('role', 'dialog');
  meet.hidden = true;
  root.append(canvas, top, plate, bubble, bottom, meet, sheet, party);
  container.appendChild(root);
  const ctx = canvas.getContext('2d');

  // ---------------------------------------------------------------- camera
  const startArea = () => {
    const c = save && save.cafe;
    const id = c && CAFE_AREA_BY_ID[c.cam] ? c.cam : (currentArea(save) || CAFE_AREAS[CAFE_AREAS.length - 1]).id;
    return CAFE_AREA_BY_ID[id];
  };
  const a0 = startArea();
  const cam = { x: a0.cam.x, y: a0.cam.y, zoom: a0.cam.zoom || 1 };
  const view = { W: 1, H: 1, dpr: 1, focus: 0.5, focusTarget: 0.5 };
  let camMove = null; // active camera tween token
  const baseScale = () => Math.min(view.W / 1000, view.H / 1000);
  const scale = () => baseScale() * cam.zoom;
  function clampCam() {
    cam.zoom = clamp(cam.zoom, ZOOM_MIN, ZOOM_MAX);
    const sc = scale(), hw = view.W / 2 / sc, hh = view.H / 2 / sc;
    cam.x = WORLD.right - WORLD.left < hw * 2 ? (WORLD.left + WORLD.right) / 2 : clamp(cam.x, WORLD.left + hw, WORLD.right - hw);
    const top0 = WORLD.top + view.H * view.focus / sc, bot0 = WORLD.bottom - view.H * (1 - view.focus) / sc;
    cam.y = top0 > bot0 ? (WORLD.top + WORLD.bottom) / 2 : clamp(cam.y, top0, bot0);
  }
  const toScreen = (wx, wy) => { const sc = scale(); return [view.W / 2 + (wx - cam.x) * sc, view.H * view.focus + (wy - cam.y) * sc]; };
  const toWorld = (sx, sy) => { const sc = scale(); return [cam.x + (sx - view.W / 2) / sc, cam.y + (sy - view.H * view.focus) / sc]; };

  function moveCam(target, dur = 1.1, ease = Ease.inOutQuad) {
    const token = {};
    camMove = token;
    if (reduced() || dur <= 0) { Object.assign(cam, target); clampCam(); dirty = true; return Promise.resolve(); }
    const from = { ...cam };
    return tw.run(dur, (p) => {
      if (camMove !== token) return;
      cam.x = from.x + (target.x - from.x) * p; cam.y = from.y + (target.y - from.y) * p; cam.zoom = from.zoom + ((target.zoom ?? from.zoom) - from.zoom) * p;
      clampCam(); dirty = true;
    }, ease);
  }
  function panTo(areaId, { instant = false, remember = true } = {}) {
    const a = CAFE_AREA_BY_ID[areaId];
    if (!a) return Promise.resolve();
    if (remember && save && save.cafe && save.cafe.cam !== areaId) { setCafeCam(save, areaId); residentsMemo = null; emit({ type: 'cam', areaId }); }
    return moveCam({ x: a.cam.x, y: a.cam.y, zoom: a.cam.zoom || 1 }, instant ? 0 : 1.2);
  }

  // ---------------------------------------------------------------- state snapshots
  let version = 0;
  let infoMemo = new Map();
  let holdUnlit = false;  // the first restore is on its way: the frontage keeps its weathered look until brighten()
  let fadeFrom = null;    // brighten(): { canvas, x0, y0, w, h, p } the weathered terrace, fading out over the brightened one
  function infoFor(areaId) {
    let i = infoMemo.get(areaId);
    if (i) return i;
    const st = areaState(save, areaId);
    const done = {};
    for (const t of st.tasks) if (t.style >= 0) done[t.id] = t.style;
    i = { done, built: st.built, total: st.total, state: st };
    if (areaId === 'terrace' && holdUnlit) i.unlit = true; // the first restore: keep the old look until the brighten
    infoMemo.set(areaId, i);
    return i;
  }
  function refresh() { version++; infoMemo = new Map(); residentsMemo = null; visitorsMemo = null; dirty = true; renderHud(); if (sheetMode) renderSheet(); }

  // ---------------------------------------------------------------- keepers on the map
  const actors = new Map(); // id -> KeeperAnim
  function actor(id) {
    let a = actors.get(id);
    if (!a) { a = new KeeperAnim({ reduced: reduced(), sleepAfter: 45000, rng: mulberry32(id.length * 977 + 13) }); actors.set(id, a); }
    return a;
  }
  // who stands on the map; rebuilt only after refresh() or a remembered camera move (both can move Pip or add a Keeper)
  let residentsMemo = null;
  function residents() {
    if (residentsMemo) return residentsMemo;
    const list = [];
    const cur = currentArea(save);
    const pipArea = cur ? cur.id : (save.cafe && save.cafe.cam) || 'terrace';
    const pip = PIP_SPOTS[pipArea] || PIP_SPOTS.terrace;
    list.push({ id: 'pip', x: pip.x, y: pip.y, area: pipArea });
    for (const a of CAFE_AREAS) {
      if (!a.keeper || !KEEPER_SPOTS[a.id]) continue;
      if (!(save.cafe && save.cafe.celebrated && save.cafe.celebrated.includes(a.id))) continue;
      list.push({ id: a.keeper, x: KEEPER_SPOTS[a.id].x, y: KEEPER_SPOTS[a.id].y, area: a.id });
    }
    residentsMemo = list;
    return list;
  }
  // café visitors (src/meta/visitors.js): who has dropped by and whether a story beat is waiting; rebuilt after a
  // refresh or a tap. Each is a cached sprite plus a breath and a sway (src/game/visitorArt.js).
  let visitorsMemo = null;
  const hops = new Map(); // id -> clock at the tap
  function visitorList() {
    if (visitorsMemo) return visitorsMemo;
    visitorsMemo = visitorsHere(save).filter((v) => VISITOR_SPOTS[v.id]).map((v) => {
      const s = VISITOR_SPOTS[v.id];
      return { id: v.id, name: v.name, x: s.x, y: s.y, waiting: visitorStatus(save, v.id).ready };
    });
    return visitorsMemo;
  }

  // ---------------------------------------------------------------- effects
  let wipe = null;       // { propId, taskId, style, p, areaId }
  let pulse = null;      // { propId, t } highlighted prop (selected task)
  let petals = [];
  const PETAL_COLS = ['#f5b8b0', '#f7d6a8', '#ffffff', '#f2a7b8', '#cfe6c0', '#f4d27a'];
  function burstPetals(n = 90) {
    if (reduced()) return;
    for (let i = 0; i < n; i++) {
      petals.push({ x: rng() * view.W, y: -20 - rng() * view.H * 0.5, vx: (rng() - 0.5) * 40, vy: 50 + rng() * 70,
        rot: rng() * TAU, vr: (rng() - 0.5) * 3, s: 6 + rng() * 7, col: PETAL_COLS[i % PETAL_COLS.length], ph: rng() * TAU, life: 0 });
    }
  }
  function sparkleAt(sx, sy, r, a = 1) {
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#fff3c4';
    ctx.beginPath();
    for (let k = 0; k < 8; k++) { const ang = -Math.PI / 2 + (k * Math.PI) / 4, q = k % 2 ? r * 0.3 : r; const px = sx + Math.cos(ang) * q, py = sy + Math.sin(ang) * q; if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
    ctx.closePath(); ctx.fill(); ctx.restore();
  }

  // ---------------------------------------------------------------- drawing
  let dirty = true, raf = 0, last = 0, clock = 0, alive = true;
  let snowAt = -1, snowy = false; // winter snow layer: when the date was last checked, and whether it snows
  function fit() {
    const r = root.getBoundingClientRect();
    view.W = Math.max(1, Math.round(r.width)); view.H = Math.max(1, Math.round(r.height));
    view.dpr = Math.min(2, (typeof devicePixelRatio === 'number' && devicePixelRatio) || 1);
    const w = Math.round(view.W * view.dpr), h = Math.round(view.H * view.dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    clampCam(); dirty = true;
  }
  function draw() {
    const { W, H, dpr } = view, sc = scale();
    const ox = W / 2 - cam.x * sc, oy = H * view.focus - cam.y * sc;
    const red = reduced();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#ffe0aa'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr * sc, 0, 0, dpr * sc, dpr * ox, dpr * oy);
    const v = { x0: -ox / sc, y0: -oy / sc, x1: (W - ox) / sc, y1: (H - oy) / sc };
    const roof = infoFor('rooftop');
    paintBackdrop(ctx, v, { t: clock, starsLit: roof.built === roof.total, reduced: red });
    paintWater(ctx, v, clock, red);
    if (cafeNight()) paintNightSky(ctx, v, { t: clock, reduced: red });
    for (const id of PAINT_ORDER) {
      const b = cacheBounds(id);
      if (b[2] < v.x0 || b[0] > v.x1 || b[3] < v.y0 || b[1] > v.y1) continue;
      const info = infoFor(id);
      const hide = wipe && wipe.areaId === id ? wipe.propId : null;
      const e = renderArea(id, hide ? { ...info, hide } : info, dpr * sc);
      if (e) {
        // land each cache on whole device pixels: crisp, and no faint lines where neighbouring areas overlap
        const dx = Math.round(dpr * (ox + e.x0 * sc)), dy = Math.round(dpr * (oy + e.y0 * sc));
        const dw = Math.round(dpr * (ox + (e.x0 + e.w) * sc)) - dx, dh = Math.round(dpr * (oy + (e.y0 + e.h) * sc)) - dy;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(e.canvas, dx, dy, dw, dh);
        ctx.setTransform(dpr * sc, 0, 0, dpr * sc, dpr * ox, dpr * oy);
      }
      if (fadeFrom && id === 'terrace' && fadeFrom.p < 1) {
        const f = fadeFrom;
        const dx = Math.round(dpr * (ox + f.x0 * sc)), dy = Math.round(dpr * (oy + f.y0 * sc));
        const dw = Math.round(dpr * (ox + (f.x0 + f.w) * sc)) - dx, dh = Math.round(dpr * (oy + (f.y0 + f.h) * sc)) - dy;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1 - f.p; ctx.drawImage(f.canvas, dx, dy, dw, dh); ctx.globalAlpha = 1;
        ctx.setTransform(dpr * sc, 0, 0, dpr * sc, dpr * ox, dpr * oy);
      }
      if (wipe && wipe.areaId === id) drawWipe();
      paintAreaLive(ctx, id, info, clock, red);
    }
    const decor = decorShown(save); // earned seasonal decorations: one cached sprite blit each, only when on screen
    if (decor.length) paintSeasonDecor(ctx, decor, v, dpr * sc, infoFor('terrace'));
    if (hasTipJar(save)) paintSeasonDecor(ctx, TIP_JAR_DECOR, v, dpr * sc, infoFor('counter')); // shown once the counter is restored
    if (pulse && PROPS[pulse.propId]) {
      const [x0, y0, x1, y1] = propBox(pulse.propId);
      const a = red ? 0.9 : 0.55 + 0.35 * Math.sin(clock * 3);
      ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = '#fff6dc'; ctx.lineWidth = 6 / Math.max(0.4, sc * 2.2); ctx.setLineDash([16, 12]);
      ctx.lineDashOffset = red ? 0 : -clock * 30;
      const pad = 14; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x0 - pad, y0 - pad, x1 - x0 + pad * 2, y1 - y0 + pad * 2, 24) : ctx.rect(x0 - pad, y0 - pad, x1 - x0 + pad * 2, y1 - y0 + pad * 2); ctx.stroke(); ctx.restore();
    }
    for (const k of residents()) {
      if (k.x + 80 < v.x0 || k.x - 80 > v.x1 || k.y + 40 < v.y0 || k.y - 140 > v.y1) continue;
      const pose = actor(k.id).pose;
      ctx.save(); ctx.globalAlpha = 0.22; ctx.fillStyle = '#4a2c1c'; ctx.beginPath(); ctx.ellipse(k.x, k.y + 2, KEEPER_R * 0.8, KEEPER_R * 0.18, 0, 0, TAU); ctx.fill(); ctx.restore();
      drawKeeperPose(ctx, k.x, k.y - KEEPER_R * 0.85, KEEPER_R, k.id, null, pose);
    }
    for (const g of visitorList()) {
      if (g.x + 220 < v.x0 || g.x - 220 > v.x1 || g.y + 60 < v.y0 || g.y - 260 > v.y1) continue;
      const h0 = hops.get(g.id);
      const hop = h0 != null && !red && clock - h0 < 0.45 ? (clock - h0) / 0.45 : 0;
      drawVisitor(ctx, g.id, g.x, g.y, clock, { reduced: red, hop, waiting: g.waiting, waterY: WATER + 20 });
    }
    // winter: a light fall of snow (one pre-rendered tile, one drawImage); never under Calm / reduced motion,
    // and tucked away with the seasonal decorations. The date is looked up once a minute, not every frame.
    if (!red && !(save.seasonal && save.seasonal.decorOff)) {
      if (snowAt < 0 || clock - snowAt > 60) { snowAt = clock; snowy = isSnowySeason(seasonAt(dayKey())); }
      if (snowy) paintSnow(ctx, W, H, dpr, clock);
    }
    // petals in screen space
    if (petals.length) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (const p of petals) {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, 0.55 + 0.45 * Math.sin(p.ph));
        ctx.fillStyle = p.col; ctx.beginPath(); ctx.ellipse(0, 0, p.s, p.s * 0.6, 0, 0, TAU); ctx.fill();
        ctx.globalAlpha = 0.25; ctx.fillStyle = '#c96f6f'; ctx.beginPath(); ctx.ellipse(-p.s * 0.2, 0, p.s * 0.4, p.s * 0.18, 0, 0, TAU); ctx.fill();
        ctx.restore();
      }
    }
  }
  let glint = null; // the wipe's travelling glint gradient (made once, see drawWipe)
  function drawWipe() {
    const w = wipe, d = PROPS[w.propId];
    const [bx0, by0, bx1, by1] = propInkBox(w.propId); // the ink box: the whole painted prop, so nothing is cut mid-wipe
    const span = (bx1 - bx0) + (by1 - by0);
    const cut = bx0 - (by1 - by0) * 0.5 + w.p * (span + (by1 - by0) * 0.5); // diagonal sweep left → right
    const slant = (by1 - by0) * 0.5;
    const region = (left) => {
      ctx.beginPath();
      if (left) { ctx.moveTo(bx0 - 40, by0 - 40); ctx.lineTo(cut + slant, by0 - 40); ctx.lineTo(cut - slant, by1 + 40); ctx.lineTo(bx0 - 40, by1 + 40); }
      else { ctx.moveTo(cut + slant, by0 - 40); ctx.lineTo(bx1 + 40, by0 - 40); ctx.lineTo(bx1 + 40, by1 + 40); ctx.lineTo(cut - slant, by1 + 40); }
      ctx.closePath();
    };
    // the broken half matches the frontage around it (brightened once the terrace has its first restore)
    ctx.save(); region(false); ctx.clip(); ctx.translate(d.x, d.y); drawProp(ctx, w.propId, 'broken', 0, clock, frontLit(w.areaId, infoFor(w.areaId))); ctx.restore();
    ctx.save(); region(true); ctx.clip(); ctx.translate(d.x, d.y); drawProp(ctx, w.propId, 'built', w.style, clock); ctx.restore();
    if (w.p > 0 && w.p < 1) {
      const sr = mulberry32(0x5a1e + Math.floor(w.p * 24));
      for (let i = 0; i < 9; i++) {
        const k = sr(), y = by0 + k * (by1 - by0), x = cut + slant - k * slant * 2 + (sr() - 0.5) * 40;
        sparkleAt(x, y, 10 + sr() * 16, 0.9);
      }
      // the glint is drawn around x = 0 and shifted to the cut, so one gradient serves every frame
      if (!glint) { glint = ctx.createLinearGradient(-60, 0, 60, 0); glint.addColorStop(0, 'rgba(255,246,210,0)'); glint.addColorStop(0.5, 'rgba(255,246,210,0.55)'); glint.addColorStop(1, 'rgba(255,246,210,0)'); }
      ctx.save(); ctx.translate(cut, 0); ctx.fillStyle = glint; ctx.beginPath(); ctx.moveTo(slant - 60, by0 - 40); ctx.lineTo(slant + 60, by0 - 40); ctx.lineTo(-slant + 60, by1 + 40); ctx.lineTo(-slant - 60, by1 + 40); ctx.closePath(); ctx.fill(); ctx.restore();
    }
  }
  let nightWas = cafeNight();
  function frame(now) {
    raf = 0;
    if (!alive) return;
    // detached (the player went into a level): stop scheduling frames and let go of the keyboard until wake()
    if (!root.isConnected) { park(); return; }
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0.016;
    last = now;
    const hidden = typeof document !== 'undefined' && document.hidden;
    if (!hidden) {
      clock += dt;
      tw.update(dt);
      view.focus += (view.focusTarget - view.focus) * (reduced() ? 1 : Math.min(1, dt * 8));
      if (Math.abs(view.focus - view.focusTarget) > 0.0005) { clampCam(); dirty = true; }
      for (const a of actors.values()) a.update(dt * 1000);
      if (petals.length) {
        for (const p of petals) { p.life += dt; p.ph += dt * 4; p.x += (p.vx + Math.sin(p.ph * 0.5) * 30) * dt; p.y += p.vy * dt; p.rot += p.vr * dt; }
        let n = 0; // drop finished petals in place (no new array per frame)
        for (let i = 0; i < petals.length; i++) { const p = petals[i]; if (p.y < view.H + 30 && p.life < 9) petals[n++] = p; }
        petals.length = n;
      }
      if (cafeNight() !== nightWas) { nightWas = cafeNight(); dirty = true; } // Evening calm switched: one re-bake
      if (dirty || !reduced() || tw.items.length || petals.length) { draw(); dirty = false; }
      const ov = overArea();
      if (ov !== overWas) { overWas = ov; renderHud(); }
    }
    raf = requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------- HUD
  // the area the camera is over (its id), for the "opens after …" label when it is a locked one
  let overWas = null;
  function overArea() {
    for (const a of CAFE_AREAS) { const b = areaBounds(a.id); if (b && cam.x >= b[0] && cam.x < b[2]) return a.id; }
    return null;
  }
  function renderHud() {
    const avail = starsAvailable(save);
    // while the celebration card is open the card behind it keeps the finished area (fix F8: don't spoil the reveal)
    const cur = celebrating && CAFE_AREA_BY_ID[celebrating] ? CAFE_AREA_BY_ID[celebrating] : currentArea(save);
    const st = cur ? infoFor(cur.id).state : null;
    top.innerHTML = '';
    if (o.onClose) {
      const back = el('button', 'cafe-btn cafe-btn-round cafe-back', '<span aria-hidden="true">‹</span>');
      back.setAttribute('aria-label', tr('common.back')); back.addEventListener('click', () => o.onClose());
      top.appendChild(back);
    }
    // Home (o.nextLine): when nothing can be built yet, one quiet line names the next piece and its price instead of a
    // Restore button that would do nothing (docs/UX_FEATURE_GATES.md finding 3)
    const ntHud = cur && o.nextLine ? st.tasks.find((t) => t.state !== 'done') : null;
    const nextHud = ntHud && ntHud.state !== 'affordable'
      ? `<div class="cafe-title-sub cafe-title-next">${esc(tr('cafe.nextLine', { name: ntHud.name, n: fmt(ntHud.cost) }))}</div>` : '';
    // the camera is over an area that hasn't opened yet: say plainly when it opens (no padlock: it reads as a paywall)
    const ov = cur && !celebrating && overWas && overWas !== cur.id ? infoFor(overWas).state : null;
    const lockHud = ov && ov.status === 'locked'
      ? `<div class="cafe-title-sub cafe-title-lock">${esc(tr('cafe.opensAfter', { area: ov.name, current: lowerThe(cur.name) }))}</div>` : '';
    const title = el('div', 'cafe-title', cur
      ? `<div class="cafe-title-name">${esc(cur.name)}</div><div class="cafe-prog" aria-hidden="true"><span style="width:${Math.round((st.built / st.total) * 100)}%"></span></div><div class="cafe-title-sub">${esc(tr('cafe.builtOf', { built: st.built, total: st.total }))}</div>${nextHud}${lockHud}`
      : `<div class="cafe-title-name">${esc(tr('cafe.name'))}</div><div class="cafe-title-sub">${esc(tr('cafe.allDone'))}</div>`);
    const stars = el('div', 'cafe-stars', `${STAR}<b>${fmt(avail)}</b>`);
    stars.setAttribute('aria-label', trp('cafe.starsToSpend', avail, { n: fmt(avail) }));
    top.append(title, stars);
    bottom.innerHTML = '';
    bottom.hidden = !o.controls || !!sheetMode || !!celebrating;
    if (o.controls) {
      if (cur) {
        const nt = st.tasks.find((t) => t.state !== 'done');
        const btn = el('button', 'cafe-btn cafe-btn-main', nt && nt.state === 'affordable'
          ? `${esc(tr('cafe.restore'))} <span class="cafe-cost">${STAR}${nt.cost}</span>` : esc(tr('cafe.restore')));
        btn.addEventListener('click', () => { haptic('tap'); openBuildSheet(); });
        bottom.appendChild(btn);
      }
      if (o.onPlay) {
        const play = el('button', 'cafe-btn cafe-btn-soft', esc(tr('cafe.playLevel')));
        play.addEventListener('click', () => o.onPlay());
        bottom.appendChild(play);
      }
    }
    placeBubble();
  }

  let bubbleTimer = 0, bubbleQueue = [], bubbleItem = null;
  let guideLine = null; // the first restore (T8): this line once after the build
  let guideRing = false; // ring + hand on the first affordable task the next time the sheet lists tasks
  const calmBody = () => typeof document !== 'undefined' && !!document.body && document.body.classList.contains('calm');
  // fix F1: the bubble sits just under the area card, never over its "Next:" line (the card grows with text size)
  function placeBubble() {
    const tb = top.getBoundingClientRect(), rb = root.getBoundingClientRect();
    if (tb.height > 0 && rb.height > 0) bubble.style.top = `${Math.round(tb.bottom - rb.top + 6)}px`;
  }
  function say(lines, ms = 5200) {
    if (!o.bubble) return;
    bubbleQueue = Array.isArray(lines) ? lines.slice() : [lines];
    nextBubble(ms);
  }
  function nextBubble(ms = 5200) {
    clearTimeout(bubbleTimer);
    const item = bubbleQueue.shift();
    bubbleItem = null;
    if (!item) { bubble.classList.remove('show'); return; }
    // a plain string is Pip; a visitor's line is { who, text, note, card }; a teaching line may carry
    // { btn, onBtn } (a Next button; a tap anywhere on the bubble does the same)
    const v = typeof item === 'string' ? { who: 'Pip', text: item } : { who: 'Pip', ...item };
    bubbleItem = v;
    bubble.innerHTML = `<span class="cafe-bubble-who">${esc(v.who)}</span>${esc(v.text)}`
      + (v.note ? `<span class="cafe-bubble-note">${esc(v.note)}</span>` : '');
    if (v.card && o.onVisitorCard) {
      const b = el('button', 'cafe-bubble-card', esc(tr('cafe.seePostcard')));
      b.addEventListener('click', (e) => { e.stopPropagation(); nextBubble(); try { o.onVisitorCard(v.card); } catch (err) { console.error(err); } });
      bubble.appendChild(b);
    }
    if (v.btn) {
      const b = el('button', 'cafe-btn cafe-btn-main cafe-bubble-next', esc(v.btn));
      b.addEventListener('click', (e) => { e.stopPropagation(); bubbleAct(); });
      bubble.appendChild(b);
    }
    placeBubble();
    bubble.classList.add('show');
    if (v.who === 'Pip') actor('pip').talk(Math.min(2400, v.text.length * 45));
    // ms <= 0, a button, or Calm: the line stays until tapped (fix F3). Chatter reads for at least 1.5 s + 0.35 s a word.
    if (!(ms > 0) || v.btn || calmBody()) return;
    const words = String(v.text).split(/\s+/).filter(Boolean).length;
    const dur = Math.max(ms, 1500 + 350 * words);
    bubbleTimer = setTimeout(() => nextBubble(ms), v.card ? Math.max(dur, 9000) : dur);
  }
  function bubbleAct() {
    const f = bubbleItem && bubbleItem.onBtn;
    nextBubble();
    if (f) { try { f(); } catch (e) { console.error(e); } }
  }
  bubble.addEventListener('click', () => bubbleAct());
  function talkTo(g) {
    const r = talkToVisitor(save, g.id);
    if (!r) return;
    visitorsMemo = null; dirty = true;
    hops.set(g.id, clock);
    emit({ type: 'visitor', id: g.id, card: r.card });
    say([{ who: g.name, text: r.line, note: visitorNote(r), card: r.card ? g.id : null }], 6400);
  }

  // ---------------------------------------------------------------- the build sheet
  let sheetMode = null;   // null | 'list' | 'styles' | 'restyle' | 'done'
  let sheetTask = null, sheetStyle = 0;
  let sheetModeWas = null;
  let sheetTip = null;    // { text, onSkip } Pip's strip at the top of the sheet (the café tour)
  function setFocus() {
    const open = !!sheetMode && sheet.classList.contains('open');
    const sh = open ? sheet.getBoundingClientRect().height : 0;
    const topH = top.getBoundingClientRect().height || 0;
    const inset = open ? 0 : Math.max(0, Number(typeof o.bottomInset === 'function' ? o.bottomInset() : o.bottomInset) || 0);
    view.focusTarget = open ? clamp((topH + (view.H - sh - topH) / 2) / view.H, 0.2, 0.5)
      : inset ? clamp((topH + (view.H - inset - topH) / 2) / view.H, 0.3, 0.5) : 0.5;
    if (reduced()) { view.focus = view.focusTarget; clampCam(); dirty = true; }
  }
  function chip(propId, state, style, size) {
    const c = el('canvas', 'cafe-chip-art');
    const dpr = view.dpr || 1;
    c.width = Math.round(size * dpr); c.height = Math.round(size * dpr);
    c.style.width = c.style.height = size + 'px';
    paintPropChip(c, propId, state, style);
    return c;
  }
  function openBuildSheet(taskId) {
    const cur = currentArea(save);
    if (taskId && CAFE_TASK_BY_ID[taskId]) {
      const info = CAFE_TASK_BY_ID[taskId];
      const st = infoFor(info.areaId).state;
      const t = st.tasks.find((x) => x.id === taskId);
      if (t.style >= 0) { sheetMode = 'restyle'; sheetTask = taskId; sheetStyle = t.style; }
      else if (t.state === 'affordable') { sheetMode = 'styles'; sheetTask = taskId; sheetStyle = 0; }
      else { sheetMode = 'list'; sheetTask = null; }
    } else { sheetMode = 'list'; sheetTask = null; }
    if (!cur && sheetMode === 'list') sheetMode = 'done';
    renderSheet();
    sheet.classList.add('open');
    overlay();
    bubble.classList.remove('show'); clearTimeout(bubbleTimer);
    renderHud();
    requestAnimationFrame(setFocus);
  }
  function closeSheet() {
    sheetMode = null; sheetTask = null; pulse = null;
    if (sheetModeWas) { sheetModeWas = null; emit({ type: 'sheet', mode: null }); }
    sheet.classList.remove('open');
    overlay();
    renderHud();
    setFocus();
    dirty = true;
  }
  function focusProp(taskId) {
    const t = CAFE_TASK_BY_ID[taskId];
    if (!t) return;
    const a = propAnchor(t.task.prop), b = propBox(t.task.prop);
    pulse = { propId: t.task.prop };
    const z = Math.max(cam.zoom, (CAFE_AREA_BY_ID[t.areaId].cam.zoom || 1) * 1.25);
    moveCam({ x: (b[0] + b[2]) / 2, y: (b[1] + b[3]) / 2 || a.y, zoom: Math.min(1.7, z) }, 0.9);
  }
  /** Render the sheet, then tell the host when its page changed (the café tour advances on it). */
  function renderSheet() {
    renderSheetBody();
    if (sheetMode !== sheetModeWas) { sheetModeWas = sheetMode; emit({ type: 'sheet', mode: sheetMode }); }
  }
  function addSheetTip() {
    if (!sheetTip) return;
    const tip = el('div', 'cafe-sheet-tip', `<span class="cafe-bubble-who">Pip</span><span class="cafe-sheet-tip-text">${esc(sheetTip.text)}</span>`);
    tip.setAttribute('role', 'status');
    if (sheetTip.onSkip) {
      const sk = el('button', 'cafe-skip', esc(tr('cafeTour.skip')));
      sk.addEventListener('click', () => { const f = sheetTip && sheetTip.onSkip; sheetTip = null; renderSheet(); if (f) f(); });
      tip.appendChild(sk);
    }
    sheet.appendChild(tip);
  }
  function renderSheetBody() {
    sheet.innerHTML = '';
    const cur = currentArea(save);
    const avail = starsAvailable(save);
    const head = el('div', 'cafe-sheet-head');
    const close = el('button', 'cafe-btn cafe-btn-round cafe-sheet-close', '<span aria-hidden="true">×</span>');
    close.setAttribute('aria-label', tr('common.close'));
    close.addEventListener('click', closeSheet);
    if (sheetMode === 'done') {
      head.appendChild(el('h2', 'cafe-h', esc(tr('cafe.name'))));
      head.appendChild(close);
      sheet.appendChild(head);
      sheet.appendChild(el('p', 'cafe-note cafe-note-big', esc(OUT_OF_CONTENT_LINE)));
      sheet.appendChild(el('p', 'cafe-note', `${STAR} ${esc(tr('cafe.savedForNext', { n: fmt(avail) }))}`));
      return;
    }
    if (sheetMode === 'list') {
      const st = infoFor(cur.id).state;
      pulse = null;
      const firstOpen = st.tasks.find((t) => t.state !== 'done');
      if (firstOpen) focusProp(firstOpen.id);
      // the checklist chip (docs/UX_RETENTION.md item 8c): how many of this area's restores are done, at a glance
      head.innerHTML = `<div><h2 class="cafe-h">${esc(st.name)}</h2><div class="cafe-sub"><span class="cafe-count" role="img" aria-label="${esc(tr('cafe.builtOf', { built: fmt(st.built), total: fmt(st.total) }))}"><span aria-hidden="true">✓ ${esc(tr('cafe.countOf', { built: fmt(st.built), total: fmt(st.total) }))}</span></span> ${STAR} ${esc(tr('cafe.toSpend', { n: fmt(avail) }))}</div></div>`;
      head.appendChild(close);
      sheet.appendChild(head);
      addSheetTip();
      const list = el('ol', 'cafe-tasks');
      const guided = guideRing ? st.tasks.find((t) => t.state === 'affordable') : null;
      for (const t of st.tasks) {
        const li = el('li');
        const b = el('button', `cafe-task is-${t.state}${guided && guided.id === t.id ? ' cafe-guide' : ''}`);
        if (guided && guided.id === t.id) b.insertAdjacentHTML('beforeend', '<span class="cafe-guide-hand" aria-hidden="true"></span>');
        b.appendChild(chip(t.prop, t.state === 'done' ? 'built' : 'broken', Math.max(0, t.style), 52));
        const right = t.state === 'done' ? `<span class="cafe-tag cafe-tag-done">${esc(tr('cafe.done'))}</span>`
          : t.state === 'affordable' ? `<span class="cafe-tag cafe-tag-go">${STAR}${t.cost}</span>`
            : `<span class="cafe-tag cafe-tag-lock">${STAR}${t.cost}<small>${esc(tr('cafe.more', { n: t.need }))}</small></span>`;
        b.insertAdjacentHTML('beforeend', `<span class="cafe-task-name">${esc(t.name)}</span>${right}`);
        b.setAttribute('aria-label', `${t.name}. ${t.state === 'done' ? tr('cafe.taskDone') : t.state === 'affordable' ? trp('cafe.costs', t.cost, { n: t.cost }) : trp('cafe.costsNeed', t.cost, { n: t.cost, need: t.need })}`);
        b.addEventListener('click', () => {
          haptic('tap');
          if (t.state === 'done') { sheetMode = 'restyle'; sheetTask = t.id; sheetStyle = t.style; }
          else if (t.state === 'affordable') { sheetMode = 'styles'; sheetTask = t.id; sheetStyle = 0; }
          else { focusProp(t.id); say(trp('pip.needMore', t.need, { n: t.need }), 0); return; }
          renderSheet(); requestAnimationFrame(setFocus);
        });
        li.appendChild(b); list.appendChild(li);
      }
      sheet.appendChild(list);
      if (st.tasks.some((t) => t.state === 'locked')) {
        const note = el('div', 'cafe-earn', `<span>${esc(tr('cafe.earnNote'))}</span>`);
        if (o.onPlay) { const p = el('button', 'cafe-btn cafe-btn-soft', esc(tr('cafe.playLevel'))); p.addEventListener('click', () => { closeSheet(); o.onPlay(); }); note.appendChild(p); }
        sheet.appendChild(note);
      }
      return;
    }
    // styles / restyle
    const info = CAFE_TASK_BY_ID[sheetTask];
    const t = info.task;
    const isRe = sheetMode === 'restyle';
    focusProp(sheetTask);
    const back = el('button', 'cafe-btn cafe-btn-round cafe-sheet-back', '<span aria-hidden="true">‹</span>');
    back.setAttribute('aria-label', tr('cafe.backToList'));
    back.addEventListener('click', () => {
      if (isRe) applyRestylePreview(null);
      if (currentArea(save)) { sheetMode = 'list'; sheetTask = null; renderSheet(); requestAnimationFrame(setFocus); } else closeSheet();
    });
    head.appendChild(back);
    head.appendChild(el('div', 'cafe-head-mid', `<h2 class="cafe-h">${esc(t.name)}</h2><div class="cafe-sub">${esc(isRe ? tr('cafe.restyleSub') : tr('cafe.styleSub'))}</div>`));
    head.appendChild(close);
    sheet.appendChild(head);
    addSheetTip();
    const row = el('div', 'cafe-styles');
    t.styles.forEach((s, i) => {
      const b = el('button', 'cafe-style' + (i === sheetStyle ? ' is-on' : ''));
      b.setAttribute('aria-pressed', i === sheetStyle ? 'true' : 'false');
      b.appendChild(chip(t.prop, 'built', i, 92));
      b.insertAdjacentHTML('beforeend', `<span class="cafe-style-name">${esc(s.name)}</span>`);
      b.addEventListener('click', () => {
        haptic('tap');
        sheetStyle = i;
        if (isRe) doRestyle(sheetTask, i);
        for (const [k, n] of [...row.children].entries()) { n.classList.toggle('is-on', k === i); n.setAttribute('aria-pressed', k === i ? 'true' : 'false'); }
      });
      row.appendChild(b);
    });
    sheet.appendChild(row);
    if (isRe) {
      const ok = el('button', 'cafe-btn cafe-btn-main cafe-confirm', esc(tr('cafe.lovelyDone')));
      ok.addEventListener('click', () => { if (currentArea(save)) { sheetMode = 'list'; renderSheet(); requestAnimationFrame(setFocus); } else closeSheet(); });
      sheet.appendChild(ok);
    } else {
      const ok = el('button', 'cafe-btn cafe-btn-main cafe-confirm', `${esc(tr('cafe.restoreIt'))} <span class="cafe-cost">${STAR}${taskCost(save, sheetTask)}</span>`);
      ok.addEventListener('click', () => doBuild(sheetTask, sheetStyle));
      sheet.appendChild(ok);
    }
  }
  function applyRestylePreview() { dirty = true; }

  // ---------------------------------------------------------------- actions
  let busy = false;
  async function doBuild(taskId, style) {
    if (busy) return;
    // the very first restore of the café plays the one-time brighten (docs/UX_RETENTION.md item 8b)
    const firstBuild = !brightenPlayed(save) && Object.keys((save.cafe && save.cafe.done) || {}).length === 0;
    const r = buildTask(save, taskId, style);
    if (!r.ok) { say(r.reason === 'stars' ? tr('pip.notEnough') : tr('pip.alreadyDone')); return; }
    busy = true;
    const info = CAFE_TASK_BY_ID[taskId];
    if (firstBuild) { holdUnlit = true; markBrightened(save); } // saved with the build: it never plays twice
    emit({ type: 'build', taskId, style, areaComplete: r.areaComplete });
    sfx('build'); haptic('build');
    const propId = info.task.prop;
    if (!reduced()) wipe = { propId, taskId, style, p: 0, areaId: info.areaId };
    bubble.classList.remove('show');
    refresh();
    closeSheet();
    if (!reduced()) {
      const b = propBox(propId);
      await moveCam({ x: (b[0] + b[2]) / 2, y: (b[1] + b[3]) / 2, zoom: Math.min(1.7, Math.max(cam.zoom, 1.25)) }, 0.8);
      wipe = { propId, taskId, style, p: 0, areaId: info.areaId };
      dirty = true;
      await tw.run(1.0, (p) => { wipe.p = p; dirty = true; }, Ease.inOutQuad);
      wipe = null;
    }
    refresh();
    actor('pip').event('tap');
    const doneN = Object.keys((save.cafe && save.cafe.done) || {}).length;
    guideRing = false;
    if (r.areaComplete && r.reward) {
      if (firstBuild) { holdUnlit = false; refresh(); } // (an area never finishes on its first restore)
      busy = false;
      await celebrate(info.areaId);
      return;
    }
    const a = CAFE_AREA_BY_ID[info.areaId];
    // the café tour speaks for itself after a build (C6 comes once the brighten is over)
    const hush = quiet();
    if (firstBuild) {
      // back out to the whole frontage first, so she sees it brighten and the sign flip
      await moveCam({ x: a.cam.x, y: a.cam.y, zoom: a.cam.zoom || 1 }, 1.0);
      const line = taskId === 'terrace_awning' ? (guideLine || brightenLine()) : cafeLine('task', doneN);
      guideLine = null;
      if (!hush) say(line, taskId === 'terrace_awning' ? 0 : 5200);
      await brighten();
      busy = false;
      emit({ type: 'settled', taskId });
      return;
    }
    // the first-build line names the awning: say it only when the awning is what was built
    if (!hush) { if (guideLine && taskId === 'terrace_awning') say(guideLine, 0); else say(cafeLine('task', doneN)); }
    guideLine = null;
    if (!reduced()) await tw.wait(0.6);
    await moveCam({ x: a.cam.x, y: a.cam.y, zoom: a.cam.zoom || 1 }, 1.0);
    busy = false;
    emit({ type: 'settled', taskId });
  }
  /** The one-time first-restore brighten: the frontage's weathering lifts and "Closed" becomes "Opening soon".
   *  The weathered terrace is copied once and faded out over the brightened bake (instant under Calm). */
  async function brighten() {
    if (!reduced() && typeof document !== 'undefined') {
      const e = renderArea('terrace', infoFor('terrace'), view.dpr * scale());
      if (e) {
        const cv = document.createElement('canvas');
        cv.width = e.canvas.width; cv.height = e.canvas.height;
        cv.getContext('2d').drawImage(e.canvas, 0, 0);
        fadeFrom = { canvas: cv, x0: e.x0, y0: e.y0, w: e.w, h: e.h, p: 0 };
      }
    }
    holdUnlit = false;
    refresh();
    if (fadeFrom) {
      sfx('restyle');
      await tw.run(BRIGHTEN_SECS, (p) => { if (fadeFrom) fadeFrom.p = p; dirty = true; }, Ease.inOutQuad);
      fadeFrom = null; dirty = true;
    }
  }
  function doRestyle(taskId, style) {
    const r = restyle(save, taskId, style);
    if (!r.ok) return;
    emit({ type: 'restyle', taskId, style });
    sfx('restyle');
    refresh();
    const n = Object.keys((save.cafe && save.cafe.done) || {}).length;
    say(cafeLine('restyle', n + style), 3200);
  }

  // ---------------------------------------------------------------- celebration
  let celebrating = null;
  async function celebrate(areaId) {
    areaId = areaId || pendingCelebration(save);
    const area = CAFE_AREA_BY_ID[areaId];
    if (!area || celebrating) return null;
    const st = infoFor(areaId).state;
    if (st.status !== 'complete') return null;
    const preview = areaReward(save, areaId);
    const res = claimArea(save, areaId);
    if (!res.ok) return null;
    celebrating = areaId;
    emit({ type: 'claim', areaId, coins: res.coins, extraCoins: res.extraCoins, keeper: res.keeper, keeperNew: res.keeperNew });
    refresh();
    sfx('celebrate'); haptic('celebrate');
    if (sheetMode) closeSheet();
    bubble.classList.remove('show');
    const b = areaBounds(areaId);
    if (!reduced()) {
      const z = area.cam.zoom || 1;
      await moveCam({ x: b[0] + 330, y: area.cam.y, zoom: z * 1.15 }, 0.9);
      burstPetals(110);
      await moveCam({ x: b[2] - 330, y: area.cam.y, zoom: z * 1.15 }, 2.2, Ease.inOutQuad);
      await moveCam({ x: area.cam.x, y: area.cam.y, zoom: z }, 0.9);
    } else {
      await panTo(areaId, { instant: true, remember: false });
    }
    for (const k of residents()) actor(k.id).event('win');
    showParty(area, res, preview);
    return res;
  }
  function showParty(area, res) {
    const regular = res.keeper && KEEPER_BY_ID[res.keeper];
    const coins = res.coins + res.extraCoins;
    const doneLine = (area.lines && area.lines.done && area.lines.done[0]) || tr('pip.areaDone');
    party.innerHTML = '';
    const card = el('div', 'cafe-card');
    card.innerHTML = `<div class="cafe-card-kicker">${esc(tr('cafe.areaRestored'))}</div><h2 class="cafe-card-title">${esc(area.name)}</h2><p class="cafe-card-line">“${esc(doneLine)}”</p>`;
    const cast = el('div', 'cafe-cast');
    const who = [];
    if (regular && res.keeperNew) who.push(res.keeper);
    who.push('pip');
    for (const id of who) {
      const c = el('canvas', 'cafe-cast-keeper');
      c.dataset.keeper = id;
      c.style.width = c.style.height = (id === 'pip' ? 84 : 112) + 'px';
      cast.appendChild(c);
    }
    card.appendChild(cast);
    const gifts = el('div', 'cafe-gifts');
    gifts.innerHTML = `<div class="cafe-gift"><span class="cafe-coin" aria-hidden="true"></span><b>+${fmt(coins)}</b> ${esc(tr('cafe.coins'))}</div>`
      + (regular && res.keeperNew ? `<div class="cafe-gift cafe-gift-regular"><b>${esc(regular.name)}</b> ${esc(tr('cafe.movedIn'))}</div>`
        : regular ? `<div class="cafe-gift cafe-gift-regular">${esc(tr('cafe.popsBy', { name: regular.name }))}</div>` : '');
    card.appendChild(gifts);
    // fix F8: where we go next, in one muted line (the area card behind keeps the finished area until "Lovely!")
    const nx = currentArea(save);
    card.appendChild(el('p', 'cafe-card-next', esc(nx ? tr('cafe.nextArea', { area: lowerThe(nx.name) }) : tr('cafe.allCorners'))));
    const row = el('div', 'cafe-card-row');
    if (o.onShare) {
      const s = el('button', 'cafe-btn cafe-btn-soft', esc(tr('cafe.sendPostcard')));
      s.addEventListener('click', () => { try { o.onShare(area.id); } catch (e) { console.error(e); } });
      row.appendChild(s);
    }
    const ok = el('button', 'cafe-btn cafe-btn-main', esc(tr('cafe.lovely')));
    ok.addEventListener('click', () => closeParty());
    row.appendChild(ok);
    card.appendChild(row);
    party.appendChild(card);
    party.classList.add('open'); overlay();
    renderHud();
    requestAnimationFrame(() => {
      for (const c of cast.querySelectorAll('canvas')) {
        try { live.animateKeeperCanvas(c, c.dataset.keeper, null, { react: 'win', pad: 10 }); } catch (e) { console.error(e); }
      }
      ok.focus({ preventScroll: true });
    });
  }
  async function closeParty() {
    party.classList.remove('open'); overlay();
    party.innerHTML = '';
    celebrating = null;
    renderHud();
    const next = pendingCelebration(save);
    if (next && o.autoCelebrate) { celebrate(next); return; }
    const cur = currentArea(save);
    if (cur) {
      // a new area she hasn't met: its two-beat intro (A1 reveal, A2 goal card) instead of the old passing lines
      if (o.areaIntros && areaIntroDue(save) === cur.id) { showAreaMeet(cur.id); return; }
      await panTo(cur.id);
      say(cur.lines.intro.slice(0, 2));
    } else say(OUT_OF_CONTENT_LINE, 7000);
  }

  // ---------------------------------------------------------------- the new-area intro (docs/UX_RESTORE_TUTORIAL.md A1-A2)
  let meeting = null;
  async function showAreaMeet(id) {
    const area = CAFE_AREA_BY_ID[id];
    if (!area || meeting || celebrating) return false;
    meeting = id;
    if (sheetMode) closeSheet();
    meet.hidden = true; meet.innerHTML = '';
    renderHud();
    // A1: the camera glides to the new area (a cut in reduced motion) and its name fades in as a title plate
    plate.textContent = area.name;
    plate.classList.remove('show');
    requestAnimationFrame(() => { if (meeting === id) plate.classList.add('show'); });
    await panTo(id);
    if (meeting !== id) return false;
    const lines = area.lines && area.lines.meet;
    say([{ text: (lines && lines.a) || area.lines.intro[0], btn: tr('cafeTour.next'), onBtn: () => meetCard(id) }], 0);
    return true;
  }
  /** A2: a small goal card along the bottom. Every value comes from the rules (areaMeetInfo / areaReward). */
  function meetCard(id) {
    const area = CAFE_AREA_BY_ID[id];
    const m = areaMeetInfo(save, id);
    plate.classList.remove('show');
    if (!area || !m) { meeting = null; return; }
    const regular = m.keeper && KEEPER_BY_ID[m.keeper];
    const reward = regular ? tr('cafeMeet.reward', { name: regular.name, coins: fmt(m.coins) }) : tr('cafeMeet.rewardCoins', { coins: fmt(m.coins) });
    meet.innerHTML = `<h2 class="cafe-meet-name">${esc(m.name)}</h2>`
      + (m.first ? `<div class="cafe-meet-line">${esc(trp('cafeMeet.fixes', m.total, { n: fmt(m.total), cost: fmt(m.first.cost) }))}</div>` : '')
      + `<div class="cafe-meet-line">${esc(reward)}</div>`
      + `<div class="cafe-meet-line cafe-meet-have">${esc(tr('cafeMeet.have', { n: fmt(m.available) }))}</div>`;
    const finish = () => {
      markAreaMet(save, id);
      meeting = null;
      meet.hidden = true; meet.innerHTML = '';
      bubbleQueue = []; nextBubble();
      emit({ type: 'met', areaId: id });
      renderHud();
    };
    const row = el('div', 'cafe-meet-row');
    let main;
    if (m.first && m.first.affordable) {
      main = el('button', 'cafe-btn cafe-btn-main', esc(tr('cafeMeet.start', { name: lowerThe(m.first.name) })));
      main.addEventListener('click', () => { haptic('tap'); finish(); guideRing = true; openBuildSheet(); });
    } else if (o.onPlay) {
      main = el('button', 'cafe-btn cafe-btn-main', esc(tr('cafe.playLevel')));
      main.addEventListener('click', () => { finish(); o.onPlay(); });
    }
    if (main) row.appendChild(main);
    const later = el('button', main ? 'cafe-skip cafe-meet-later' : 'cafe-btn cafe-btn-main', esc(tr('cafeMeet.later')));
    later.addEventListener('click', () => { haptic('tap'); finish(); });
    row.appendChild(later);
    meet.appendChild(row);
    const inset = Math.max(0, Number(typeof o.bottomInset === 'function' ? o.bottomInset() : o.bottomInset) || 0);
    meet.style.bottom = `${Math.round(inset) + 12}px`; // just above Home's bottom bar
    meet.hidden = false;
    say([{ text: (area.lines.meet && area.lines.meet.b) || '' }].filter((x) => x.text), 0);
    requestAnimationFrame(() => { if (main) main.focus({ preventScroll: true }); });
  }

  // ---------------------------------------------------------------- input: drag, pinch, tap, wheel
  const pts = new Map();
  let gesture = null;
  function onDown(e) {
    canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    camMove = null; // a finger on the map stops any camera ease
    const r = canvas.getBoundingClientRect();
    if (pts.size === 1) gesture = { kind: 'pan', sx: e.clientX, sy: e.clientY, cx: cam.x, cy: cam.y, moved: 0, t: performance.now(), r };
    else if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      const mx = (a.x + b.x) / 2 - r.left, my = (a.y + b.y) / 2 - r.top;
      gesture = { kind: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, z0: cam.zoom, w: toWorld(mx, my), moved: 99, r };
    }
    for (const a of actors.values()) a.input();
  }
  function onMove(e) {
    if (!pts.has(e.pointerId) || !gesture) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const sc = scale();
    if (gesture.kind === 'pan' && pts.size === 1) {
      const dx = e.clientX - gesture.sx, dy = e.clientY - gesture.sy;
      gesture.moved = Math.max(gesture.moved, Math.hypot(dx, dy));
      cam.x = gesture.cx - dx / sc; cam.y = gesture.cy - dy / sc;
      clampCam(); dirty = true;
    } else if (gesture.kind === 'pinch' && pts.size >= 2) {
      const [a, b] = [...pts.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      cam.zoom = clamp(gesture.z0 * d / gesture.d0, ZOOM_MIN, ZOOM_MAX);
      const mx = (a.x + b.x) / 2 - gesture.r.left, my = (a.y + b.y) / 2 - gesture.r.top;
      const s2 = scale();
      cam.x = gesture.w[0] - (mx - view.W / 2) / s2; cam.y = gesture.w[1] - (my - view.H * view.focus) / s2;
      clampCam(); dirty = true;
    }
  }
  function onUp(e) {
    if (!pts.has(e.pointerId)) return;
    pts.delete(e.pointerId);
    const g = gesture;
    if (pts.size === 0) {
      gesture = null;
      if (g && g.kind === 'pan' && g.moved < 10 && performance.now() - g.t < 600) tapAt(e.clientX - g.r.left, e.clientY - g.r.top);
    } else if (pts.size === 1) {
      const [p] = [...pts.values()];
      gesture = { kind: 'pan', sx: p.x, sy: p.y, cx: cam.x, cy: cam.y, moved: 99, t: 0, r: canvas.getBoundingClientRect() };
    }
  }
  function onWheel(e) {
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    const w = toWorld(mx, my);
    cam.zoom = clamp(cam.zoom * Math.exp(-e.deltaY * 0.0015), ZOOM_MIN, ZOOM_MAX);
    const s2 = scale();
    cam.x = w[0] - (mx - view.W / 2) / s2; cam.y = w[1] - (my - view.H * view.focus) / s2;
    camMove = null; clampCam(); dirty = true;
  }
  function tapAt(sx, sy) {
    if (busy || celebrating || meeting) return;
    const [wx, wy] = toWorld(sx, sy);
    // a visitor first (their box, padded to at least 24px a side so the target stays ~48px), a Keeper, then a prop
    const padW = 24 / Math.max(0.05, scale());
    for (const g of o.bubble ? [...visitorList()].reverse() : []) {
      const b = visitorBox(g.id, g.x, g.y, VISITOR_R);
      if (b && wx >= b[0] - padW && wx <= b[2] + padW && wy >= b[1] - padW && wy <= b[3] + padW) { haptic('tap'); talkTo(g); return; }
    }
    for (const k of residents()) {
      if (Math.hypot(wx - k.x, wy - (k.y - KEEPER_R * 0.85)) < KEEPER_R * 1.2) { actor(k.id).event('tap'); haptic('tap'); if (k.id === 'pip') say(cafeLine(currentArea(save) && infoFor(currentArea(save).id).state.tasks.some((t) => t.state === 'affordable') ? 'cafe' : 'rest', version)); return; }
    }
    const cur = currentArea(save);
    for (const id of [...PAINT_ORDER].reverse()) {
      const hit = propAt(id, wx, wy, 6 / Math.max(0.2, scale()));
      if (!hit) continue;
      const st = infoFor(id).state;
      const t = st.tasks.find((x) => x.id === hit.taskId);
      if (t.style >= 0) { openBuildSheet(t.id); return; }
      if (cur && id === cur.id) { openBuildSheet(t.state === 'affordable' ? t.id : undefined); if (t.state !== 'affordable') { pulse = { propId: t.prop }; focusProp(t.id); } return; }
      if (st.status === 'locked' && cur) {
        // the first tap on a locked area teaches why once (T-later); after that, the short passing line. Both stay until tapped.
        if (!tipSeen(save, 'later')) {
          markTip(save, 'later'); emit({ type: 'tip', key: 'later' });
          say(tr('cafeTour.tipLater', { area: lowerThe(st.name), current: lowerThe(cur.name) }), 0);
        } else say(tr('pip.laterArea', { area: lowerThe(st.name), current: lowerThe(cur.name) }), 0);
        return;
      }
      return;
    }
  }
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  const onKey = (e) => { if (e.key === 'Escape') { if (party.classList.contains('open')) closeParty(); else if (sheetMode) closeSheet(); } };
  let keyOn = false;
  const listenKeys = (on) => {
    if (on === keyOn) return;
    keyOn = on;
    if (on) document.addEventListener('keydown', onKey); else document.removeEventListener('keydown', onKey);
  };
  listenKeys(true);
  // park: the loop stops and Escape is released while the café is out of the document; wake: back in, carry on
  function park() { if (raf) { cancelAnimationFrame(raf); raf = 0; } listenKeys(false); }
  function wake() {
    if (!alive || !root.isConnected) return;
    listenKeys(true);
    if (!raf) { last = 0; dirty = true; raf = requestAnimationFrame(frame); }
  }
  let ro = null;
  if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(() => { wake(); fit(); setFocus(); }); ro.observe(root); }
  else window.addEventListener('resize', fit);

  // ---------------------------------------------------------------- start
  fit();
  renderHud();
  raf = requestAnimationFrame(frame);
  if (save && save.cafe && !save.cafe.intro && !(o.areaIntros && !pendingCelebration(save) && areaIntroDue(save))) {
    const first = currentArea(save);
    if (first) {
      markIntroSeen(save); emit({ type: 'intro' });
      panTo(first.id, { instant: true });
      if (o.startLine) say(first.lines.intro.slice(), 5600); // (Home: the café tour C1 tells this story instead, fix F9)
    }
  } else if (o.autoCelebrate && pendingCelebration(save)) {
    setTimeout(() => { if (alive) celebrate(); }, reduced() ? 0 : 500);
  } else if (o.areaIntros && areaIntroDue(save)) {
    // she left before the new area was introduced (or closed the app mid-celebration): it shows now (and stands in for the old intro line)
    if (!save.cafe.intro) markIntroSeen(save);
    setTimeout(() => { if (alive && areaIntroDue(save)) showAreaMeet(areaIntroDue(save)); }, reduced() ? 0 : 400);
  } else if (o.startLine) {
    const cur = currentArea(save);
    // docs/UX_RETENTION.md item 4: with a fix she can afford, Pip names it ("We have enough stars to re-hang the striped awning. Shall we?")
    const fix = cur ? nextFix(save) : null;
    if (fix && fix.pip) say(fix.pip);
    else say(cur ? cafeLine(infoFor(cur.id).state.tasks.some((t) => t.state === 'affordable') ? 'cafe' : 'rest', Object.keys(save.cafe ? save.cafe.done : {}).length) : OUT_OF_CONTENT_LINE);
  }

  const api = {
    cam,
    update(nextSave) {
      if (nextSave) save = nextSave;
      wake();
      refresh();
      if (o.autoCelebrate && !celebrating && !busy && pendingCelebration(save)) celebrate();
      else if (o.areaIntros && !celebrating && !busy && !meeting && areaIntroDue(save)) showAreaMeet(areaIntroDue(save));
    },
    openBuildSheet(taskId) { wake(); return openBuildSheet(taskId); },
    /** The first restore (docs/UX_FIRST_RUN.md T8): guide the next build sheet; `line` is said once after the build. */
    guideFirstBuild(line) { guideLine = line || null; guideRing = true; },
    /** Ring + hand on the first affordable row the next time the sheet lists tasks (no line after the build). */
    guideRow() { guideRing = true; if (sheetMode === 'list') renderSheet(); },
    /** Pip's strip at the top of the build sheet (null removes it); onSkip adds a "Skip tour" link. */
    setSheetTip(text, onSkip = null) { sheetTip = text ? { text, onSkip } : null; if (sheetMode) renderSheet(); },
    /** The new-area intro for `areaId` (A1 then A2); false when it can't show now. */
    showAreaMeet(areaId) { wake(); return showAreaMeet(areaId); },
    /** True while an area intro is on screen. */
    get meeting() { return !!meeting; },
    /** A dashed ring on one prop (null clears it): the restyle tip points at something already fixed. */
    pulseProp(propId) { pulse = propId && PROPS[propId] ? { propId } : null; dirty = true; },
    /** Clear Pip's bubble (the tour's own bubble takes over). */
    hush() { bubbleQueue = []; nextBubble(); },
    /** True while a build is playing out (wipe, brighten). */
    get busy() { return busy; },
    say(lines, ms) { wake(); return say(lines, ms); }, // Pip says a line (or lines, one after another); the home uses it for the first-run greeting
    /** Talk to café visitor `id` as if tapped (no-op when they aren't here). */
    talkTo(id) { wake(); const g = visitorList().find((x) => x.id === id); if (g && o.bubble) talkTo(g); return !!g; },
    /** Where visitor `id` stands on screen now (CSS px), or null (tests and screenshots). */
    visitorAt(id) { const g = visitorList().find((x) => x.id === id); return g ? toScreen(g.x, g.y - VISITOR_R) : null; },
    closeSheet,
    panTo(areaId, opts) { wake(); return panTo(areaId, opts); },
    celebrate(areaId) { wake(); return celebrate(areaId); },
    setReduced(v) { reducedFlag = v == null ? null : !!v; for (const a of actors.values()) a.setReduced(reduced()); if (reduced()) petals = []; dirty = true; },
    resize() { wake(); fit(); setFocus(); },
    /** True while the café is in the document and drawing (false once parked or destroyed). */
    get running() { return alive && !!raf; },
    destroy() {
      alive = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      clearTimeout(bubbleTimer);
      tw.clear();
      if (ro) ro.disconnect(); else window.removeEventListener('resize', fit);
      listenKeys(false);
      if (mql) { try { if (mql.removeEventListener) mql.removeEventListener('change', onMql); else if (mql.removeListener) mql.removeListener(onMql); } catch { /* gone */ } }
      root.remove();
    },
  };
  return api;
}
