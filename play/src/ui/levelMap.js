// Journey level map, v3 "Coast Path": a cozy coastal walk past Nova's Seaside Café, in the spirit of
// Candy Crush / Royal Match maps. One stretch of path per 20-level chapter (chapters.js), each named
// after the café area it restores on a warm ribbon plaque at its gate. The scenery beside the path
// (coves with fishing boats, a harbour jetty, lighthouses, beach huts, rock pools, dunes, beach grass,
// lantern posts, gulls) is painted per chapter in that chapter's time of day (theme.backdropVariant).
// The map reads bottom-up (level 1 at the bottom). Visual spec: DESIGN.md "Journey map look" (v3).
//
// Presentation only: no rules, no game RNG (scenery uses a local seeded generator).
// The top half is pure layout logic (tested in tests/levelMap.test.mjs, no DOM needed). The bottom half
// builds the DOM VIRTUALISED: only the chapter in view and its two neighbours exist in the DOM (scenery
// canvas, path, plaque, level buttons, keeper), so 1,000 levels scroll as smoothly as 20.
import { CHAPTER_SIZE, CHAPTERS } from '../game/chapters.js';
import { SCENE_ORDER, paintCoast, coastPlan, variantOf } from './mapScenery.js';
import { animateKeeperCanvas } from './keeperLive.js';
import { ICONS } from './dom.js';
import { finishWord } from './copy.js';
import { t as tr } from './i18n.js';

export const ZONE_LEVELS = CHAPTER_SIZE;

const fmt = (n) => Number(n).toLocaleString('en-US');

/** 0-based zone for a level (1-based). Zone i = chapter i + 1. */
export function zoneOf(n) {
  return Math.max(0, Math.floor((Math.max(1, Math.floor(Number(n) || 1)) - 1) / ZONE_LEVELS));
}

/** Zones for a Journey of `levelCount` levels, named after the café areas (chapters.js). */
export function mapZones(levelCount) {
  const out = [];
  const count = Math.ceil(levelCount / ZONE_LEVELS);
  for (let i = 0; i < count; i++) {
    const ch = CHAPTERS[i % CHAPTERS.length];
    out.push({
      index: i, id: ch.areaId, name: ch.name, variant: ch.theme.backdropVariant, packTie: ch.packTie,
      motif: SCENE_ORDER[(i * 2) % SCENE_ORDER.length],
      first: i * ZONE_LEVELS + 1, last: Math.min(levelCount, (i + 1) * ZONE_LEVELS),
    });
  }
  return out;
}

/** 'cleared' (every level passed), 'open' (the player's zone) or 'locked'. `cur` = save.journey.level. */
export function zoneState(zone, cur) {
  if (cur > zone.last) return 'cleared';
  if (cur >= zone.first) return 'open';
  return 'locked';
}

/** Stars earned in a zone, and the most possible. */
export function zoneStars(zone, stars) {
  let got = 0;
  for (let n = zone.first; n <= zone.last; n++) got += Math.max(0, Math.min(3, (stars && stars[n]) || 0));
  return { got, max: (zone.last - zone.first + 1) * 3 };
}

/** Café stars in a zone: levels finished (any rating), and how many levels it has. The plaque shows "★ got of max"
 * (one meaning for ★, docs/UX_STARS.md table B). Unity: LevelMapLayout.ZoneCleared. */
export function zoneCleared(zone, stars) {
  let got = 0;
  for (let n = zone.first; n <= zone.last; n++) if (((stars && stars[n]) || 0) > 0) got++;
  return { got, max: zone.last - zone.first + 1 };
}

/**
 * Lay the map out in px (y grows downward, level 1 near the bottom).
 * Each zone = a plaque strip at its bottom (the gate from the zone below) + one row per level.
 * Inside a zone the path winds in smooth waves (2.5 for a full chapter) and returns to the centre at both
 * edges, so every gate sits on the centre line. Returns { width, height, zones, nodes, points }:
 *  zones[i]  = { index, top, height, gateY, bgTop, bgHeight } (gateY = centre of its plaque strip)
 *  nodes[k]  = { n, x, y, zone }
 *  points    = the path in level order: a start point, then nodes with a gate point before each
 *              new zone's first level. point.level = the level this stretch leads to.
 */
export function layoutMap({ levelCount, width, gap = 100, bannerH = 132, padTop = 70, padBottom = 24 }) {
  const zones = mapZones(levelCount);
  const cx = width / 2;
  const amp = Math.max(0, Math.min(width / 2 - 52, 130));
  const zoneH = (z) => bannerH + (z.last - z.first + 1) * gap;
  const height = padTop + padBottom + zones.reduce((a, z) => a + zoneH(z), 0);
  const outZones = [], nodes = [], points = [];
  let bottom = height - padBottom; // running bottom edge of the current zone
  for (const z of zones) {
    const h = zoneH(z);
    const top = bottom - h;
    const gateY = bottom - bannerH / 2;
    outZones.push({ index: z.index, top, height: h, gateY });
    points.push({ x: cx, y: gateY, level: z.first, gate: z.index });
    const k = z.last - z.first + 1;
    const turns = k > 12 ? 5 : 3; // half-waves per zone
    const dir = z.index % 2 === 0 ? 1 : -1;
    for (let i = 0; i < k; i++) {
      const n = z.first + i;
      const t = (i + 1) / (k + 1);
      const x = Math.round(cx + dir * amp * Math.sin(turns * Math.PI * t));
      const y = Math.round(bottom - bannerH - gap * (i + 0.5));
      const node = { n, x, y, zone: z.index };
      nodes.push(node);
      points.push({ x, y, level: n });
    }
    bottom = top;
  }
  // Backgrounds meet exactly at the gates: each zone's art runs from its own gate up to the next
  // zone's gate (the first zone reaches the map bottom, the last one the map top).
  for (let i = 0; i < outZones.length; i++) {
    const bgBottom = i === 0 ? height : outZones[i].gateY;
    const bgTop = i === outZones.length - 1 ? 0 : outZones[i + 1].gateY;
    outZones[i].bgTop = bgTop;
    outZones[i].bgHeight = bgBottom - bgTop;
  }
  return { width, height, zones: outZones, nodes, points };
}

/**
 * Split the path into a lit part (stretches leading to levels the player has reached) and a dim
 * part (locked). Smooth Catmull-Rom curves through the points, as SVG path data.
 * Optional [from, to): only the stretches ending at points[from..to-1] (one zone of a virtualised map);
 * the curves are identical to the full path's.
 */
export function pathSegments(points, cur, from = 1, to = points.length) {
  let lit = '', dim = '';
  const f = (v) => Math.round(v * 10) / 10;
  for (let i = Math.max(1, from); i < Math.min(points.length, to); i++) {
    const p0 = points[Math.max(0, i - 2)], p1 = points[i - 1], p2 = points[i], p3 = points[Math.min(points.length - 1, i + 1)];
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
    const d = `M${f(p1.x)} ${f(p1.y)}C${f(c1x)} ${f(c1y)} ${f(c2x)} ${f(c2y)} ${f(p2.x)} ${f(p2.y)}`;
    if (p2.level <= cur) lit += d; else dim += d;
  }
  return { lit, dim };
}

/** Index range [from, to) of the path stretches drawn with zone `index` (from its gate up to the next gate). */
export function zonePathRange(points, index) {
  const g = points.findIndex((p) => p.gate === index);
  const next = points.findIndex((p) => p.gate === index + 1);
  return { from: Math.max(1, g + 1), to: next < 0 ? points.length : next + 1 };
}

/** Map sizes for a text scale (bigger text gets more room between rows and taller plaques). */
export function mapMetrics(ts = 1) {
  const s = Math.max(1, Math.min(1.5, Number(ts) || 1));
  return { gap: Math.round(100 + (s - 1) * 44), bannerH: Math.round(132 + (s - 1) * 84) };
}

/**
 * Which side of the map is free of the path at local height `y` inside a zone: +1 = right, -1 = left.
 * `pts` = the zone's nodes as [{ x, y }] in local coordinates; the path x is interpolated between them.
 */
export function freeSide(pts, y, width) {
  if (!pts || !pts.length) return 1;
  const s = [...pts].sort((a, b) => a.y - b.y);
  let x;
  if (y <= s[0].y) x = s[0].x;
  else if (y >= s[s.length - 1].y) x = s[s.length - 1].x;
  else {
    for (let i = 1; i < s.length; i++) {
      if (y <= s[i].y) { const t = (y - s[i - 1].y) / Math.max(1, s[i].y - s[i - 1].y); x = s[i - 1].x + (s[i].x - s[i - 1].x) * t; break; }
    }
  }
  return x < width / 2 ? 1 : -1;
}

/**
 * The free pockets beside the path in one zone (where the scenery vignettes go): one per bend, on the
 * side away from it. `pts` = the zone's nodes (any coordinates), returns [{ y, side }] bottom-up.
 */
export function zonePockets(pts, width) {
  const cx = width / 2;
  const s = [...pts].sort((a, b) => b.y - a.y);
  const out = [];
  for (let i = 0; i < s.length; i++) {
    const d = Math.abs(s[i].x - cx);
    const prev = i ? Math.abs(s[i - 1].x - cx) : -1, next = i < s.length - 1 ? Math.abs(s[i + 1].x - cx) : -1;
    if (d >= prev && d > next && d > 30) out.push({ y: s[i].y, side: s[i].x < cx ? 1 : -1 });
  }
  return out;
}

/** The current-level marker sits beside its node, on the side away from the next level (-1 left, +1 right). */
export function markerSide(nodes, cur, width) {
  const i = nodes.findIndex((n) => n.n === cur);
  if (i < 0) return 1;
  const me = nodes[i], next = nodes[i + 1] || nodes[i - 1];
  // too close to an edge: always face inwards
  if (me.x < 110) return 1;
  if (me.x > width - 110) return -1;
  if (!next) return me.x < width / 2 ? 1 : -1;
  return next.x > me.x ? -1 : 1;
}

/**
 * Virtualisation: the zones to keep in the DOM for a viewport [viewTop, viewBottom] (map px): every zone
 * whose scenery intersects it, plus one zone either side. Sorted by index.
 */
export function zonesToMount(L, viewTop, viewBottom) {
  const hit = [];
  for (const z of L.zones) if (z.bgTop < viewBottom && z.bgTop + z.bgHeight > viewTop) hit.push(z.index);
  if (!hit.length) {
    // outside the map (overscroll): the nearest zone
    const mid = (viewTop + viewBottom) / 2;
    let best = 0, bd = Infinity;
    for (const z of L.zones) { const d = Math.abs(z.bgTop + z.bgHeight / 2 - mid); if (d < bd) { bd = d; best = z.index; } }
    hit.push(best);
  }
  const lo = Math.max(0, Math.min(...hit) - 1), hi = Math.min(L.zones.length - 1, Math.max(...hit) + 1);
  const out = [];
  for (let i = lo; i <= hi; i++) out.push(i);
  return out;
}

// ------------------------------------------------------------------ DOM

const escHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const LOCK_SVG = (c = '#8a7458') => `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="${c}"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="${c}" stroke-width="2.4"/><circle cx="12" cy="15.4" r="1.6" fill="#f4ead8"/></svg>`;
const packLabel = (tie) => (tie === 'cosmic' ? tr('map.pack.cosmic') : '');

// Scoped styles for the Coast Path (cp-*). Injected once; the old space-map lm-* rules in styles.css
// are not used by these elements.
const CSS = `
.map.lm-map.cp-map { background: #e3e6bc; overflow: hidden; contain: layout paint; }
.cp-zone { position: absolute; left: 0; right: 0; }
.cp-zone > canvas { position: absolute; left: 0; top: 0; width: 100%; height: 100%; display: block; z-index: 0; pointer-events: none; }
.cp-veil { position: absolute; inset: 0; z-index: 0; pointer-events: none; background: linear-gradient(0deg, rgba(250,244,232,0), rgba(250,244,232,.32) 280px); }
.cp-path { position: absolute; left: 0; z-index: 1; overflow: visible; pointer-events: none; }
.cp-path path { fill: none; stroke-linecap: round; stroke-linejoin: round; }
.cp-path .edge { stroke: #cfb07a; stroke-width: 38; opacity: .55; }
.cp-path .sand { stroke: #f6e8c4; stroke-width: 30; }
.cp-path .dim { stroke: rgba(150,118,76,.45); stroke-width: 6; stroke-dasharray: 2 16; }
.cp-path .lit { stroke: #f0a63c; stroke-width: 10; stroke-dasharray: 0 19; }
.cp-path .lit2 { stroke: #ffe3a3; stroke-width: 4.5; stroke-dasharray: 0 19; }
.cp-amb { position: absolute; inset: 0; z-index: 1; pointer-events: none; overflow: hidden; }
.cp-amb i { position: absolute; display: block; }
.cp-glint { width: 14px; height: 3px; border-radius: 3px; background: rgba(255,255,255,.85); opacity: 0; animation: cpGlint 4.5s ease-in-out infinite; }
.cp-gull { width: 22px; height: 10px; animation: cpGull 26s linear infinite; opacity: .8; }
.cp-gull::before, .cp-gull::after { content: ''; position: absolute; top: 2px; width: 11px; height: 7px; border-top: 2px solid rgba(80,80,92,.75); border-radius: 50% 50% 0 0; }
.cp-gull::before { left: 0; } .cp-gull::after { right: 0; }
.cp-lamp { width: 40px; height: 40px; margin: -20px 0 0 -20px; border-radius: 50%; background: radial-gradient(circle, rgba(255,214,140,.55), rgba(255,214,140,0) 65%); animation: cpLamp 3.2s ease-in-out infinite; }
@keyframes cpGlint { 0%, 100% { opacity: 0; transform: scaleX(.4); } 45% { opacity: .9; transform: scaleX(1); } }
@keyframes cpGull { 0% { transform: translate(0,0); } 50% { transform: translate(40px,-14px); } 100% { transform: translate(0,0); } }
@keyframes cpLamp { 0%, 100% { opacity: .75; } 50% { opacity: 1; } }
.cp-plaque { position: absolute; left: 50%; z-index: 3; transform: translate(-50%, -50%); width: min(300px, 82%); pointer-events: none; text-align: center; }
.cp-plaque .rib { position: relative; display: block; margin: 0 auto; padding: 10px 16px 9px; border-radius: 16px;
  background: linear-gradient(180deg, #fffaf0, #fbecd2); border: 3px solid #e08a5f; color: #5a3a22;
  box-shadow: 0 4px 0 #b9643f, 0 10px 18px rgba(110,70,30,.25); }
.cp-plaque .rib::before, .cp-plaque .rib::after { content: ''; position: absolute; top: 18px; width: 30px; height: 30px; background: #d8784c; z-index: -1;
  clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%, 30% 50%); }
.cp-plaque .rib::before { left: -22px; }
.cp-plaque .rib::after { right: -22px; transform: scaleX(-1); }
.cp-plaque small { display: block; font-size: calc(13px * var(--ts)); font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #9a3f22; }
.cp-plaque b { display: block; font-size: calc(21px * var(--ts)); line-height: 1.15; margin: 2px 0 3px; color: #4a2e1a; }
.cp-plaque span.sub { display: block; font-size: calc(15px * var(--ts)); color: #7a5a3e; font-weight: 600; }
.cp-plaque .st { color: #8a5a10; } /* text ★ ink (UX_STARS.md): #8a5a10 reads on cream, #e9a21e did not */
.cp-medal { position: absolute; left: 50%; top: -20px; transform: translateX(-50%); width: 34px; height: 34px; border-radius: 50%;
  display: grid; place-items: center; font: 800 calc(15px * var(--ts))/1 inherit; color: #fff8ec;
  background: radial-gradient(circle at 35% 30%, #f7b47e, #d8784c 70%); border: 3px solid #fff6e6; box-shadow: 0 2px 4px rgba(110,70,30,.3); }
.cp-medal svg { width: 18px; height: 18px; }
.cp-plaque.locked .rib { background: linear-gradient(180deg, #f6efe2, #ece2cf); border-color: #c8b08e; box-shadow: 0 4px 0 #a99272, 0 8px 14px rgba(110,70,30,.18); }
.cp-plaque.locked .rib::before, .cp-plaque.locked .rib::after { background: #bba584; }
.cp-plaque.locked .cp-medal { background: radial-gradient(circle at 35% 30%, #efe4cf, #cdb894 70%); }
.cp-plaque.locked b { color: #6e5a44; }
.cp-plaque.cleared .cp-medal { background: radial-gradient(circle at 35% 30%, #ffe08a, #e9a21e 70%); }
.cp-chip { display: inline-block; margin-top: 5px; padding: 2px 10px; border-radius: 999px; font-size: calc(13px * var(--ts)); font-weight: 700;
  background: #3d3a6e; color: #fff3d6; letter-spacing: .03em; }
.cp-node { position: absolute; z-index: 2; width: 72px; height: 72px; margin: -36px 0 0 -36px; padding: 0; border-radius: 50%; border: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: inherit; cursor: pointer;
  -webkit-tap-highlight-color: transparent; touch-action: manipulation;
  color: #5a3414; background: radial-gradient(circle at 36% 30%, #fff1c4, #ffd27a 45%, #f2a94a 100%);
  box-shadow: inset 0 0 0 4px #fff6e3, 0 5px 0 #c98436, 0 8px 14px rgba(110,70,30,.28); }
.cp-node:active { transform: translateY(2px); }
.cp-node .num { font-weight: 800; font-size: calc(24px * var(--ts)); line-height: 1; letter-spacing: -.02em; }
.cp-node .num.d3 { font-size: calc(20px * var(--ts)); }
.cp-node .num.d4 { font-size: calc(16px * var(--ts)); }
.cp-node .stars { margin-top: 3px; display: flex; gap: 1px; line-height: 0; }
/* the finish rating as blossoms (docs/UX_STARS.md table B): filled rose = earned, outline = not yet; never gold */
.cp-node .stars svg { width: calc(14px * var(--ts)); height: calc(14px * var(--ts)); display: block; }
.cp-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
/* stars sit on a small cream pill so earned and empty stars both read against the orange node */
.cp-node:not(.superhard):not(.locked) .stars { padding: 1px 4px 2px; border-radius: 8px; background: rgba(255, 248, 236, .92); }
.cp-node .kind { position: absolute; top: -15px; left: 50%; transform: translateX(-50%); padding: 2px 8px; border-radius: 999px; white-space: nowrap;
  font-size: calc(12px * var(--ts)); font-weight: 800; letter-spacing: .07em; color: #fff8ee; background: #a8432e; box-shadow: 0 2px 0 #7a2e1e; }
.cp-node.hard { background: radial-gradient(circle at 36% 30%, #ffe0c4, #f6a46e 50%, #df7347 100%);
  box-shadow: inset 0 0 0 4px #fff2e4, 0 0 0 4px #c8553d, 0 5px 0 4px #8e3626, 0 10px 16px rgba(110,50,30,.3); }
.cp-node.superhard { color: #fff6e6; background: radial-gradient(circle at 36% 30%, #a8689a, #8a4579 50%, #5e2558 100%);
  box-shadow: inset 0 0 0 3px #f7d58a, 0 0 0 4px #fff3d6, 0 0 0 8px #e9b44c, 0 5px 0 8px #9a6a1c, 0 12px 20px rgba(90,40,80,.35); }
.cp-node.superhard .kind { background: #6e2f68; box-shadow: 0 2px 0 #3e1838, 0 0 0 2px #e9b44c; top: -21px; }
.cp-node.locked { cursor: default; color: #5e4a36; background: radial-gradient(circle at 36% 30%, #fbf4e6, #e8dcc4 60%, #d6c6a8 100%);
  box-shadow: inset 0 0 0 4px #fbf6ec, 0 5px 0 #b9a582, 0 7px 10px rgba(110,70,30,.15); }
.cp-node.locked.hard { box-shadow: inset 0 0 0 4px #fbf6ec, 0 0 0 4px #d9a58c, 0 5px 0 4px #b48a72, 0 7px 10px rgba(110,70,30,.15); }
.cp-node.locked.superhard { color: #5e4a36; background: radial-gradient(circle at 36% 30%, #f6ecf2, #e3d0dc 60%, #cdb3c3 100%);
  box-shadow: inset 0 0 0 3px #fbf6ec, 0 0 0 4px #fbf6ec, 0 0 0 8px #e3c98e, 0 5px 0 8px #bda06a, 0 7px 10px rgba(110,70,30,.15); }
.cp-node.locked .kind { background: #b59a80; box-shadow: 0 2px 0 #8d7660; }
.cp-node.locked.superhard .kind { background: #a58aa0; box-shadow: 0 2px 0 #7b6378, 0 0 0 2px #e3c98e; }
.cp-node .lock { width: 18px; height: 18px; margin-top: 2px; } .cp-node .lock svg { width: 100%; height: 100%; display: block; }
.cp-node.current { width: 86px; height: 86px; margin: -43px 0 0 -43px; z-index: 4; }
.cp-node.current .num { font-size: calc(28px * var(--ts)); }
.cp-node.current .num.d4 { font-size: calc(19px * var(--ts)); }
.cp-node.current::after { content: ''; position: absolute; inset: -9px; border-radius: 50%; border: 3px solid rgba(255,250,236,.95); box-shadow: 0 0 0 3px rgba(240,166,60,.55); animation: cpRing 1.8s ease-in-out infinite; pointer-events: none; }
@keyframes cpRing { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.07); opacity: .7; } }
.cp-node .play { position: absolute; z-index: 1; bottom: -16px; left: 50%; transform: translateX(-50%); padding: 3px 13px; border-radius: 999px;
  font-size: calc(13px * var(--ts)); font-weight: 800; letter-spacing: .08em; color: #fff; background: linear-gradient(180deg, #3f7a3b, #346b31); box-shadow: 0 3px 0 #24501f; }
.cp-marker { position: absolute; z-index: 5; width: 64px; height: 64px; margin: -32px 0 0 -32px; pointer-events: none; }
.cp-marker .pin { position: absolute; inset: 0; border-radius: 50%; background: radial-gradient(circle at 40% 35%, #fffaf0, #f6e6c8); border: 3px solid #fff;
  box-shadow: 0 4px 10px rgba(110,70,30,.3); pointer-events: auto; overflow: hidden; }
.cp-marker canvas { width: 100%; height: 100%; display: block; }
.cp-marker::after { content: ''; position: absolute; top: 50%; width: 0; height: 0; border: 8px solid transparent; margin-top: -8px; }
.cp-marker.right::after { left: -13px; border-right-color: #fff; }
.cp-marker.left::after { right: -13px; border-left-color: #fff; }
.cp-map.cp-calm .cp-glint, .cp-map.cp-calm .cp-gull, .cp-map.cp-calm .cp-lamp, .cp-map.cp-calm .cp-node.current::after { animation: none; }
@media (prefers-reduced-motion: reduce) { .cp-glint, .cp-gull, .cp-lamp, .cp-node.current::after { animation: none !important; } }
`;

function injectCss() {
  if (typeof document === 'undefined' || document.getElementById('cp-map-style')) return;
  const st = document.createElement('style');
  st.id = 'cp-map-style';
  st.textContent = CSS;
  document.head.appendChild(st);
}

function reducedMotion() {
  try {
    return document.body.classList.contains('calm')
      || !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch (_) { return false; }
}

/** Scale the canvas for device pixels (capped: soft art needs no 3x) and return a 2D context in CSS px. */
function prep(canvas, w, h, maxDpr) {
  const dpr = Math.min(maxDpr, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
  canvas.width = Math.max(1, Math.round(w * dpr));
  canvas.height = Math.max(1, Math.round(h * dpr));
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

/** Ambient life for one mounted zone (glinting water, a drifting gull, lantern glow after dark). CSS only. */
function ambientHtml(plan, variant) {
  const look = variantOf(variant);
  let html = '';
  plan.glints.forEach((g, i) => { html += `<i class="cp-glint" style="left:${g.x - 7}px;top:${g.y}px;animation-delay:-${(i * 1.3) % 4.5}s"></i>`; });
  plan.gulls.slice(0, 2).forEach((g, i) => { html += `<i class="cp-gull" style="left:${g.x}px;top:${g.y - 40}px;animation-delay:-${i * 9}s"></i>`; });
  if (look.lamps >= 0.7) plan.lanterns.forEach((l, i) => { html += `<i class="cp-lamp" style="left:${l.x}px;top:${l.y - 28}px;animation-delay:-${(i * 0.7) % 3.2}s"></i>`; });
  return html ? `<div class="cp-amb">${html}</div>` : '';
}

/**
 * Build the map into `host` (an empty element in the Levels screen).
 * opts: { levelCount, cur, stars, kindOf(n) -> 'normal'|'hard'|'superhard', ts, onPick(n), bindTap(el, fn),
 *         keeper: { id, outfit } (the marker avatar; Pip by default) }
 * kindOf is only called for levels in mounted zones.
 * Returns { layout, scrollToCurrent(), destroy(), mounted() }.
 */
export function buildLevelMap(host, opts) {
  injectCss();
  const { levelCount, cur, stars, kindOf, onPick, bindTap } = opts;
  const width = Math.max(280, Math.round(host.clientWidth || 390));
  const m = mapMetrics(opts.ts);
  const L = layoutMap({ levelCount, width, gap: m.gap, bannerH: m.bannerH });
  const zones = mapZones(levelCount);
  const calm = reducedMotion();
  host.style.height = `${L.height}px`;
  host.classList.add('cp-map');
  host.classList.toggle('cp-calm', calm);
  const scroller = host.closest('.screen') || null;
  const live = new Map(); // zone index -> { el, canvas, raf }
  const curZone = zoneOf(Math.min(cur, levelCount));
  const svgNS = 'http://www.w3.org/2000/svg';

  function mountZone(i) {
    const zl = L.zones[i], z = zones[i];
    const st = zoneState(z, cur);
    const look = variantOf(z.variant);
    const el = document.createElement('div');
    el.className = `cp-zone ${st}`;
    el.dataset.zone = String(i);
    el.style.top = `${zl.bgTop}px`; el.style.height = `${zl.bgHeight}px`;
    el.style.background = look.base;
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    el.appendChild(canvas);
    const myNodes = L.nodes.filter((nd) => nd.zone === i);
    const pts = myNodes.map((nd) => ({ x: nd.x, y: nd.y - zl.bgTop }));
    const P = { w: width, h: zl.bgHeight, index: i, variant: z.variant, pts, pockets: zonePockets(pts, width) };
    if (st === 'locked') el.insertAdjacentHTML('beforeend', '<div class="cp-veil"></div>');
    if (!calm) el.insertAdjacentHTML('beforeend', ambientHtml(coastPlan(P), z.variant));

    // the footpath for this stretch (global coordinates in the viewBox, so curves join the neighbours)
    const r = zonePathRange(L.points, i);
    const all = pathSegments(L.points, Infinity, r.from, r.to).lit;
    const { lit, dim } = pathSegments(L.points, cur, r.from, r.to);
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', 'cp-path');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('width', String(width)); svg.setAttribute('height', String(zl.bgHeight));
    svg.setAttribute('viewBox', `0 ${zl.bgTop} ${width} ${zl.bgHeight}`);
    svg.style.top = '0px';
    svg.innerHTML = `<path class="edge" d="${all}"/><path class="sand" d="${all}"/><path class="dim" d="${dim}"/>`
      + `<path class="lit" d="${lit}"/><path class="lit2" d="${lit}"/>`;
    el.appendChild(svg);

    // the gate plaque: café area name on a warm ribbon
    const s = zoneCleared(z, stars);
    const isNext = st === 'locked' && curZone === i - 1;
    const range = escHtml(tr('map.levels', { first: fmt(z.first), last: fmt(z.last) }));
    const sub = st === 'locked'
      ? range
      : `${range} · <span class="st" aria-hidden="true">★</span> ${escHtml(tr('map.starsOf', { got: fmt(s.got), max: fmt(s.max) }))}<span class="cp-sr"> ${escHtml(tr('map.cafeStars'))}</span>`;
    const chip = z.packTie && packLabel(z.packTie) ? `<span class="cp-chip">${escHtml(packLabel(z.packTie))}</span>` : '';
    const pl = document.createElement('div');
    pl.className = `cp-plaque ${st}${isNext ? ' next' : ''}`;
    pl.style.top = `${zl.gateY - zl.bgTop}px`;
    pl.innerHTML = `<div class="rib" role="heading" aria-level="2"><i class="cp-medal" aria-hidden="true">${st === 'locked' ? LOCK_SVG('#9a8160') : i + 1}</i>`
      + `<small>${escHtml(isNext ? tr('map.chapterNext', { n: i + 1 }) : st === 'cleared' ? tr('map.chapterDone', { n: i + 1 }) : tr('map.chapter', { n: i + 1 }))}</small><b>${escHtml(z.name)}</b><span class="sub">${sub}</span>${chip}</div>`;
    el.appendChild(pl);

    // level buttons
    let curNode = null;
    for (const nd of myNodes) {
      const n = nd.n;
      const kind = kindOf(n);
      const got = Math.max(0, Math.min(3, (stars && stars[n]) || 0));
      const locked = n > cur, current = n === cur, won = n < cur || got > 0;
      const btn = document.createElement('button');
      btn.className = `cp-node ${kind}${locked ? ' locked' : ''}${current ? ' current' : ''}${won ? ' won' : ''}`;
      btn.style.left = `${nd.x}px`; btn.style.top = `${nd.y - zl.bgTop}px`;
      btn.dataset.n = String(n);
      btn.setAttribute('aria-label', locked ? tr('map.node.locked', { n: fmt(n) }) : [
        tr('map.node', { n: fmt(n) }),
        kind !== 'normal' ? (kind === 'superhard' ? tr('map.node.superHard') : tr('map.node.hard')) : '',
        current ? tr('map.node.next') : got > 0 ? finishWord(got) : '',
      ].filter(Boolean).join(', '));
      const digits = String(n).length;
      btn.innerHTML = `${kind !== 'normal' ? `<span class="kind">${escHtml(kind === 'superhard' ? tr('map.kind.superHard') : tr('map.kind.hard'))}</span>` : ''}`
        + `<span class="num${digits >= 4 ? ' d4' : digits === 3 ? ' d3' : ''}">${fmt(n)}</span>`
        + (locked ? `<span class="lock">${LOCK_SVG(kind === 'superhard' ? '#9a7f94' : '#a08a6c')}</span>` : '')
        + (won && !current ? `<span class="stars" aria-hidden="true">${ICONS.blossom.repeat(got)}${ICONS.blossomEmpty.repeat(3 - got)}</span>` : '')
        + (current ? `<span class="play">${escHtml(tr('map.play'))}</span>` : '');
      if (locked) btn.tabIndex = -1;
      else bindTap(btn, () => onPick(n));
      el.appendChild(btn);
      if (current) curNode = nd;
    }

    // the player's Keeper lives beside the current level (breathes, blinks, hops when tapped)
    if (curNode) {
      const side = markerSide(L.nodes, cur, width);
      const mk = document.createElement('div');
      mk.className = `cp-marker ${side < 0 ? 'left' : 'right'}`;
      mk.style.left = `${curNode.x + side * 82}px`; mk.style.top = `${curNode.y - zl.bgTop - 6}px`;
      mk.setAttribute('aria-hidden', 'true');
      mk.innerHTML = '<span class="pin"><canvas></canvas></span>';
      el.appendChild(mk);
      const k = opts.keeper || {};
      requestAnimationFrame(() => animateKeeperCanvas(mk.querySelector('canvas'), k.id || 'pip', k.outfit || null, { tapTarget: mk.querySelector('.pin') }));
    }

    // insert in index order (keeps tab order bottom-up) and paint the scenery on the next frame
    let before = null;
    for (const [j, b] of live) if (j > i && (!before || +before.el.dataset.zone > j)) before = b;
    host.insertBefore(el, before ? before.el : null);
    // (about 20 ms per chapter; neighbours are mounted ahead of the viewport, so idle time is enough)
    const rec = { el, canvas, raf: 0, idle: 0 };
    const paint = () => {
      rec.raf = 0; rec.idle = 0;
      if (!el.isConnected) return;
      const ctx = prep(canvas, width, zl.bgHeight, 1.25);
      if (ctx) paintCoast(ctx, P);
    };
    if (i === curZone || typeof requestIdleCallback !== 'function') rec.raf = requestAnimationFrame(paint);
    else rec.idle = requestIdleCallback(paint, { timeout: 120 });
    live.set(i, rec);
  }

  function unmountZone(i) {
    const rec = live.get(i);
    if (!rec) return;
    if (rec.raf) cancelAnimationFrame(rec.raf);
    if (rec.idle) cancelIdleCallback(rec.idle);
    rec.canvas.width = 0; rec.canvas.height = 0; // free the bitmap now (iOS canvas memory)
    rec.el.remove(); // the keeper actor stops itself once its canvas is disconnected
    live.delete(i);
  }

  function viewport() {
    const vh = (scroller && scroller.clientHeight) || (typeof window !== 'undefined' && window.innerHeight) || 800;
    if (!scroller) return { top: 0, bottom: vh };
    const top = scroller.getBoundingClientRect().top - host.getBoundingClientRect().top;
    return { top, bottom: top + vh };
  }

  function sync() {
    const v = viewport();
    const want = new Set(zonesToMount(L, v.top, v.bottom));
    for (const i of [...live.keys()]) if (!want.has(i)) unmountZone(i);
    for (const i of want) if (!live.has(i)) mountZone(i);
  }

  let raf = 0;
  function onScroll() { if (!raf) raf = requestAnimationFrame(() => { raf = 0; sync(); }); }
  if (scroller) scroller.addEventListener('scroll', onScroll, { passive: true });
  sync();

  return {
    layout: L,
    mounted: () => [...live.keys()].sort((a, b) => a - b),
    scrollToCurrent() {
      const n = Math.max(1, Math.min(cur, levelCount));
      const nd = L.nodes[n - 1];
      if (scroller && nd) {
        const hostTop = host.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
        scroller.scrollTop = Math.max(0, hostTop + nd.y - scroller.clientHeight / 2);
      }
      sync();
    },
    destroy() {
      if (scroller) scroller.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
      for (const i of [...live.keys()]) unmountZone(i);
    },
  };
}
