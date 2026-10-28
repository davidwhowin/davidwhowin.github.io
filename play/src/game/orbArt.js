// Procedural orb / asteroid (café: pebble) art for all skins, with an offscreen sprite cache.
import { mulberry32 } from './rng.js';
import { drawSushi, drawSushiNumber, sushiColor, sushiIdle } from './sushiArt.js';
import { drawKoi, drawKoiNumber, koiColor, koiIdle, koiAnimate } from './koiArt.js';
import { koiMergeFx, koiPopFx } from './koiFx.js';
import { drawCat, catColor, catIdle, CAT_NAMES } from './catArt.js';
import { drawPastry, pastryColor, pastryIdle, PASTRY_NAMES } from './patisserieArt.js';
import { drawSeaCreature, seaColor, seaIdle, SEA_NAMES } from './deepseaArt.js';
import { drawGardenPiece, gardenColor, gardenIdle, GARDEN_NAMES } from './gardenArt.js';
import { drawSeaside, seasideColor, seasideIdle, SEASIDE_NAMES } from './seasideArt.js';
import { drawPebbleShape } from './pebbleArt.js';
import { drawCafeClassics, drawCafeNumber, cafeClassicsColor, cafeClassicsIdle, CAFE_CLASSICS_NAMES } from './cafeClassicsArt.js';

const CLASSIC = [
  null,
  { base: '#9a86e0', light: '#ece4ff', dark: '#3f2f7a', glow: '#b39cff' }, // 1 Dust
  { base: '#c89a6a', light: '#f6dcbc', dark: '#5f3e22', glow: '#e0b080' }, // 2 Pebble
  { base: '#e5603b', light: '#ffb394', dark: '#6e1e0e', glow: '#ff7a50' }, // 3 Rock
  { base: '#cfd6e6', light: '#ffffff', dark: '#5f6884', glow: '#e4ecff' }, // 4 Moon
  { base: '#22b583', light: '#a4f7d3', dark: '#0a4e3c', glow: '#3dffb0' }, // 5 Planet
  { base: '#8b5cff', light: '#d8c8ff', dark: '#2f1680', glow: '#a77bff' }, // 6 Ringed Planet
  { base: '#ff8f2e', light: '#ffd8a4', dark: '#8a3404', glow: '#ffa040' }, // 7 Gas Giant
  { base: '#ffd23a', light: '#fffbe0', dark: '#c27400', glow: '#ffe066' }, // 8 Star
  { base: '#3fa8ff', light: '#e2f4ff', dark: '#0b3f8f', glow: '#5cc8ff' }, // 9 Blue Giant
  { base: '#ff4fd8', light: '#ffffff', dark: '#7a0f6a', glow: '#ff80ec' }, // 10 Supernova
];

// Simple Circles ('basic', the default look): one clear, warm colour per tier with a big number in the middle.
// Neighbouring tiers differ in hue AND lightness (an Okabe-Ito style set, softened for the café), so they stay apart
// with colour-blindness too; the number always says the tier. ink 'dark': a dark number on the light colours.
// Port: unity/NovaDrop/Assets/NovaDrop/Scripts/Art/OrbArt.cs Basic / DrawBasic.
export const BASIC = [
  null,
  { base: '#6db6e4', light: '#c4e5f8', dark: '#3b82b4', ink: 'light' }, // 1 sky blue
  { base: '#f2a541', light: '#fcd9a2', dark: '#c67a17', ink: 'light' }, // 2 apricot
  { base: '#33a884', light: '#a3dcc8', dark: '#1d7a5e', ink: 'light' }, // 3 sea green
  { base: '#f4d35e', light: '#fbefb8', dark: '#c9a42c', ink: 'dark' },  // 4 butter yellow
  { base: '#3e78bf', light: '#9cbde4', dark: '#265388', ink: 'light' }, // 5 harbour blue
  { base: '#e2683a', light: '#f6b597', dark: '#ad4519', ink: 'light' }, // 6 terracotta
  { base: '#c97aab', light: '#ebc3dc', dark: '#99517f', ink: 'light' }, // 7 rose mauve
  { base: '#9b6a4c', light: '#d4b29c', dark: '#6c4630', ink: 'light' }, // 8 cocoa
  { base: '#8573c9', light: '#c8bdea', dark: '#5a4a9a', ink: 'light' }, // 9 lavender
  { base: '#b83a62', light: '#e597ae', dark: '#82203f', ink: 'light' }, // 10 berry
];
/** Simple Circles number colours: [fill, outline] for a tier (white with a soft dark outline, or dark on light). */
export function basicInk(tier) {
  const c = BASIC[Math.max(1, Math.min(10, tier | 0))];
  return c.ink === 'dark' ? ['#3a2a1e', 'rgba(255,250,236,0.85)'] : ['#ffffff', 'rgba(43,26,18,0.82)'];
}
/** Simple Circles number size as a fraction of the orb radius (bigger than the Numbers-setting digits). */
export const basicNumberScale = (tier) => (tier >= 10 ? 0.86 : 1.06);

const NEON_HUES = [0, 225, 42, 0, 182, 118, 280, 22, 58, 200, 318];
const CANDY_HUES = [0, 265, 30, 350, 195, 150, 290, 15, 52, 210, 325];
const AURORA_HUES = [0, 250, 32, 8, 205, 150, 275, 28, 50, 192, 320];
const PEARL_HUES = [0, 260, 30, 5, 210, 155, 285, 40, 55, 195, 330];
const PRISM_HUES = [0, 240, 25, 355, 190, 135, 275, 15, 50, 205, 315];

// Former Starlight Season orb skins (kept by players who earned them; v3 cut the Season): palette variants of the Aurora / Pearl / Prism
// styles. Hues stay one per tier and distinct (shifted as a whole), so tiers read the same way.
const shift = (hues, d) => hues.map((h, i) => (i ? (h + d) % 360 : 0));
export const SEASON_SKIN_ART = Object.freeze({
  blossom: { style: 'pearl', hues: shift(PEARL_HUES, 330) },
  moonstone: { style: 'pearl', hues: shift(PEARL_HUES, 190) },
  cinder: { style: 'aurora', hues: shift(AURORA_HUES, 20) },
  frost: { style: 'prism', hues: shift(PRISM_HUES, 180) },
});

// aurora: Nova Pass exclusive. pearl, prism: bought with coins in the shop (src/meta/economy.js).
// blossom, moonstone, cinder, frost: former Season rewards, kept forever by the players who earned them.
/**
 * Premium pack skins drawn by their own module (additive registry: one entry per pack).
 * draw(ctx, r, tier, frame, dpr) paints a piece; color(tier); idle(t, tier) -> { frame, sx, sy }; names[1..10].
 * freeform: the piece is a free-standing shaped object (no disc); badges still draw on top.
 * centreNumber: the skin always shows a big number in the middle of the piece (drawn by number(ctx, r, tier),
 * never on a wild piece), so the Numbers setting's corner badge is skipped.
 */
export const PACK_SKIN_ART = {
  cat: { draw: drawCat, color: catColor, idle: catIdle, names: CAT_NAMES, freeform: true },
  patisserie: { draw: drawPastry, color: pastryColor, idle: pastryIdle, names: PASTRY_NAMES, freeform: true },
  deepsea: { draw: drawSeaCreature, color: seaColor, idle: seaIdle, names: SEA_NAMES, freeform: true },
  garden: { draw: drawGardenPiece, color: gardenColor, idle: gardenIdle, names: GARDEN_NAMES, freeform: true },
  seaside: { draw: drawSeaside, color: seasideColor, idle: seasideIdle, names: SEASIDE_NAMES, freeform: true }, // 2,500-coin shop skin
  cafeclassics: { draw: drawCafeClassics, color: cafeClassicsColor, idle: cafeClassicsIdle, names: CAFE_CLASSICS_NAMES, freeform: true, centreNumber: drawCafeNumber }, // default look (free)
};

/** Tier display names of a pack skin (shop preview), or [] for skins without names. */
export const packTierNames = (skin) => (PACK_SKIN_ART[skin] && PACK_SKIN_ART[skin].names) || [];

export const SKIN_IDS = ['basic', 'classic', 'neon', 'candy', 'gold', 'aurora', 'pearl', 'prism', ...Object.keys(SEASON_SKIN_ART), 'sushi', 'koi', ...Object.keys(PACK_SKIN_ART)];

/**
 * Per-skin presentation flags. freeform: pieces are free-standing shapes (premium packs), not round orbs, so the
 * shared pipeline skips round extras such as the white merge-flash disc (a soft glow is used instead).
 */
export const SKIN_FLAGS = { sushi: { freeform: true } };
export const isFreeform = (skin) => !!((SKIN_FLAGS[skin] && SKIN_FLAGS[skin].freeform) || (FREEFORM[skin] && FREEFORM[skin].freeform) || (PACK_SKIN_ART[skin] && PACK_SKIN_ART[skin].freeform));

/** Main colour of a tier (for particles, text) in a skin. */
export function tierColor(tier, skin = 'classic') {
  tier = Math.max(1, Math.min(10, tier | 0));
  if (skin === 'basic') return BASIC[tier].base;
  if (skin === 'neon') return `hsl(${NEON_HUES[tier]},100%,62%)`;
  if (skin === 'candy') return `hsl(${CANDY_HUES[tier]},85%,72%)`;
  if (skin === 'gold') return tier >= 8 ? '#ffe9a0' : CLASSIC[tier].glow;
  if (skin === 'aurora') return `hsl(${AURORA_HUES[tier]},90%,66%)`;
  if (skin === 'pearl') return `hsl(${PEARL_HUES[tier]},70%,78%)`;
  if (skin === 'prism') return `hsl(${PRISM_HUES[tier]},95%,68%)`;
  if (skin === 'sushi') return sushiColor(tier);
  if (FREEFORM[skin]) return FREEFORM[skin].color(tier);
  if (PACK_SKIN_ART[skin]) return PACK_SKIN_ART[skin].color(tier);
  const sv = SEASON_SKIN_ART[skin];
  if (sv) return sv.style === 'pearl' ? `hsl(${sv.hues[tier]},70%,78%)` : sv.style === 'prism' ? `hsl(${sv.hues[tier]},95%,68%)` : `hsl(${sv.hues[tier]},90%,66%)`;
  return CLASSIC[tier].glow;
}

/** Orb radius as a fraction of half a cell: bigger tiers are a touch bigger. */
export function orbRadiusFactor(tier) {
  return 0.76 + Math.min(10, tier) * 0.018;
}

// ---------------------------------------------------------------- helpers

function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); }

function sphere(ctx, r, col) {
  const g = ctx.createRadialGradient(-r * 0.38, -r * 0.42, r * 0.05, -r * 0.1, -r * 0.1, r * 1.25);
  g.addColorStop(0, col.light);
  g.addColorStop(0.42, col.base);
  g.addColorStop(1, col.dark);
  ctx.fillStyle = g;
  circle(ctx, 0, 0, r);
  ctx.fill();
}

function gloss(ctx, r, a = 0.55) {
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.5, 0, -r * 0.35, -r * 0.5, r * 0.6);
  g.addColorStop(0, `rgba(255,255,255,${a})`);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(-r * 0.32, -r * 0.46, r * 0.5, r * 0.32, -0.5, 0, Math.PI * 2);
  ctx.fill();
  // rim light
  ctx.strokeStyle = `rgba(255,255,255,${a * 0.35})`;
  ctx.lineWidth = Math.max(1, r * 0.06);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.92, 0.15 * Math.PI, 0.65 * Math.PI);
  ctx.stroke();
}

function crater(ctx, x, y, rr, dark, light) {
  ctx.fillStyle = dark;
  circle(ctx, x, y, rr); ctx.fill();
  ctx.strokeStyle = light;
  ctx.lineWidth = Math.max(0.8, rr * 0.28);
  ctx.beginPath(); ctx.arc(x, y, rr, 0.2 * Math.PI, 1.0 * Math.PI); ctx.stroke();
}

function rays(ctx, n, rIn, rOut, width, color, rot = 0, jag = 0, rng = null) {
  ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2;
    const len = rOut * (jag && rng ? 1 - jag * rng() : (i % 2 ? 0.78 : 1));
    ctx.beginPath();
    ctx.moveTo(Math.cos(a - width) * rIn, Math.sin(a - width) * rIn);
    ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
    ctx.lineTo(Math.cos(a + width) * rIn, Math.sin(a + width) * rIn);
    ctx.closePath();
    ctx.fill();
  }
}

function numberText(ctx, r, tier, fill, stroke) {
  ctx.font = `800 ${Math.round(r * (tier >= 10 ? 0.82 : 0.95))}px Fredoka, "Baloo 2", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (stroke) {
    ctx.lineWidth = Math.max(2, r * 0.14);
    ctx.strokeStyle = stroke;
    ctx.lineJoin = 'round';
    ctx.strokeText(String(tier), 0, r * 0.06);
  }
  ctx.fillStyle = fill;
  ctx.fillText(String(tier), 0, r * 0.06);
}

// ---------------------------------------------------------------- simple circles (default)

/** A flat-ish warm disc: soft drop shadow, gentle top-left light, a darker rim and a cream edge. The number is drawn
 * on top by drawOrb (always, whatever the Numbers setting), so wild orbs can hide it. */
function drawBasic(ctx, r, tier) {
  const col = BASIC[tier];
  // soft drop shadow, a little below
  ctx.fillStyle = 'rgba(74,48,32,0.20)';
  circle(ctx, 0, r * 0.07, r * 0.99); ctx.fill();
  // body: mostly the flat base colour, lighter towards the top left, a touch deeper at the bottom
  const g = ctx.createRadialGradient(-r * 0.32, -r * 0.38, r * 0.05, 0, 0, r * 1.08);
  g.addColorStop(0, col.light);
  g.addColorStop(0.4, col.base);
  g.addColorStop(0.8, col.base);
  g.addColorStop(1, col.dark);
  ctx.fillStyle = g;
  circle(ctx, 0, 0, r * 0.96); ctx.fill();
  // darker rim, then a thin cream edge like a glazed plate
  ctx.strokeStyle = col.dark;
  ctx.lineWidth = r * 0.07;
  circle(ctx, 0, 0, r * 0.92); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,248,232,0.75)';
  ctx.lineWidth = r * 0.04;
  circle(ctx, 0, 0, r * 0.975); ctx.stroke();
  // soft highlight, top left
  ctx.fillStyle = 'rgba(255,255,255,0.24)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.3, -r * 0.52, r * 0.4, r * 0.17, -0.45, 0, Math.PI * 2);
  ctx.fill();
}

// ---------------------------------------------------------------- classic

function drawClassic(ctx, r, tier) {
  const col = CLASSIC[tier];
  const rng = mulberry32(tier * 977);

  // behind-sphere decorations
  if (tier === 8) {
    ctx.save();
    ctx.globalAlpha = 0.85;
    rays(ctx, 12, r * 0.8, r * 1.38, 0.13, 'rgba(255,220,90,0.9)', 0.1);
    ctx.restore();
  } else if (tier === 9) {
    ctx.save();
    rays(ctx, 16, r * 0.8, r * 1.45, 0.08, 'rgba(140,210,255,0.85)', 0);
    ctx.restore();
  } else if (tier === 10) {
    ctx.save();
    rays(ctx, 18, r * 0.7, r * 1.5, 0.12, 'rgba(255,120,230,0.9)', 0, 0.35, rng);
    rays(ctx, 9, r * 0.6, r * 1.3, 0.1, 'rgba(120,240,255,0.9)', 0.2, 0.2, rng);
    ctx.restore();
  }
  if (tier === 6) {
    // ring back half
    ctx.save();
    ctx.rotate(-0.38);
    ctx.strokeStyle = 'rgba(255,214,160,0.9)';
    ctx.lineWidth = r * 0.16;
    ctx.beginPath(); ctx.ellipse(0, 0, r * 1.42, r * 0.42, 0, Math.PI, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  // glow + sphere
  ctx.save();
  ctx.shadowColor = col.glow;
  ctx.shadowBlur = r * (tier >= 8 ? 0.9 : 0.45);
  sphere(ctx, r, col);
  ctx.restore();

  // surface features (clipped)
  ctx.save();
  circle(ctx, 0, 0, r); ctx.clip();
  switch (tier) {
    case 1:
      for (let i = 0; i < 9; i++) {
        const a = rng() * Math.PI * 2, d = rng() * r * 0.8;
        ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.45)' : 'rgba(60,40,100,0.35)';
        circle(ctx, Math.cos(a) * d, Math.sin(a) * d, r * (0.06 + rng() * 0.07)); ctx.fill();
      }
      break;
    case 2:
      ctx.fillStyle = 'rgba(90,55,25,0.35)';
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.ellipse((rng() - 0.5) * r * 1.2, (rng() - 0.4) * r * 1.2, r * (0.12 + rng() * 0.12), r * 0.09, rng() * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 3:
      crater(ctx, r * 0.3, r * 0.2, r * 0.24, 'rgba(110,25,10,0.55)', 'rgba(255,190,160,0.5)');
      crater(ctx, -r * 0.35, r * 0.35, r * 0.15, 'rgba(110,25,10,0.5)', 'rgba(255,190,160,0.45)');
      crater(ctx, -r * 0.05, -r * 0.4, r * 0.12, 'rgba(110,25,10,0.45)', 'rgba(255,190,160,0.4)');
      break;
    case 4:
      crater(ctx, r * 0.25, r * 0.15, r * 0.28, 'rgba(120,130,160,0.45)', 'rgba(255,255,255,0.6)');
      crater(ctx, -r * 0.4, -r * 0.05, r * 0.17, 'rgba(120,130,160,0.4)', 'rgba(255,255,255,0.55)');
      crater(ctx, -r * 0.05, r * 0.52, r * 0.13, 'rgba(120,130,160,0.4)', 'rgba(255,255,255,0.5)');
      crater(ctx, r * 0.1, -r * 0.5, r * 0.1, 'rgba(120,130,160,0.35)', 'rgba(255,255,255,0.5)');
      break;
    case 5:
      ctx.fillStyle = 'rgba(30,110,220,0.55)';
      ctx.beginPath(); ctx.ellipse(r * 0.35, r * 0.3, r * 0.5, r * 0.32, 0.6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-r * 0.5, -r * 0.2, r * 0.3, r * 0.45, -0.3, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = r * 0.09;
      ctx.beginPath(); ctx.arc(-r * 0.1, r * 0.1, r * 0.75, -2.6, -1.6); ctx.stroke();
      ctx.beginPath(); ctx.arc(r * 0.2, -r * 0.2, r * 0.9, 0.5, 1.1); ctx.stroke();
      break;
    case 6:
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(-r, -r * 0.25, r * 2, r * 0.18);
      ctx.fillStyle = 'rgba(30,10,90,0.22)';
      ctx.fillRect(-r, r * 0.15, r * 2, r * 0.2);
      break;
    case 7: {
      const bands = [-0.62, -0.3, 0.02, 0.34, 0.62];
      bands.forEach((y, i) => {
        ctx.fillStyle = i % 2 ? 'rgba(140,50,5,0.35)' : 'rgba(255,240,210,0.3)';
        ctx.beginPath();
        ctx.moveTo(-r, y * r);
        for (let x = -r; x <= r; x += r / 6) ctx.lineTo(x, y * r + Math.sin(x / r * 5 + i) * r * 0.04);
        ctx.lineTo(r, y * r + r * 0.16); ctx.lineTo(-r, y * r + r * 0.16);
        ctx.closePath(); ctx.fill();
      });
      ctx.fillStyle = 'rgba(200,40,20,0.7)';
      ctx.beginPath(); ctx.ellipse(r * 0.3, r * 0.3, r * 0.2, r * 0.12, 0, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 8: {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      g.addColorStop(0, 'rgba(255,255,255,0.9)');
      g.addColorStop(0.5, 'rgba(255,240,150,0.3)');
      g.addColorStop(1, 'rgba(255,160,0,0)');
      ctx.fillStyle = g; circle(ctx, 0, 0, r); ctx.fill();
      for (let i = 0; i < 14; i++) {
        ctx.fillStyle = 'rgba(255,150,0,0.22)';
        circle(ctx, (rng() - 0.5) * r * 1.6, (rng() - 0.5) * r * 1.6, r * 0.1); ctx.fill();
      }
      break;
    }
    case 9: {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      g.addColorStop(0, 'rgba(255,255,255,0.95)');
      g.addColorStop(0.45, 'rgba(180,230,255,0.4)');
      g.addColorStop(1, 'rgba(0,80,200,0)');
      ctx.fillStyle = g; circle(ctx, 0, 0, r); ctx.fill();
      break;
    }
    case 10: {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.35, 'rgba(255,230,255,0.9)');
      g.addColorStop(1, 'rgba(255,60,200,0)');
      ctx.fillStyle = g; circle(ctx, 0, 0, r); ctx.fill();
      break;
    }
  }
  ctx.restore();

  if (tier === 6) {
    // ring front half
    ctx.save();
    ctx.rotate(-0.38);
    ctx.strokeStyle = 'rgba(255,226,180,0.95)';
    ctx.lineWidth = r * 0.16;
    ctx.beginPath(); ctx.ellipse(0, 0, r * 1.42, r * 0.42, 0, 0, Math.PI); ctx.stroke();
    ctx.strokeStyle = 'rgba(120,70,30,0.45)';
    ctx.lineWidth = r * 0.04;
    ctx.beginPath(); ctx.ellipse(0, 0, r * 1.3, r * 0.36, 0, 0, Math.PI); ctx.stroke();
    ctx.restore();
  }
  gloss(ctx, r, tier >= 8 ? 0.35 : 0.55);
}

// ---------------------------------------------------------------- other skins

function drawNeon(ctx, r, tier) {
  const h = NEON_HUES[tier];
  const c = `hsl(${h},100%,62%)`;
  ctx.save();
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, `hsla(${h},90%,20%,1)`);
  g.addColorStop(1, '#07061a');
  ctx.fillStyle = g;
  ctx.shadowColor = c; ctx.shadowBlur = r * 0.6;
  circle(ctx, 0, 0, r * 0.96); ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.shadowColor = c; ctx.shadowBlur = r * 0.45;
  ctx.strokeStyle = c;
  ctx.lineWidth = r * 0.13;
  circle(ctx, 0, 0, r * 0.88); ctx.stroke();
  ctx.lineWidth = r * 0.04;
  ctx.strokeStyle = `hsla(${h},100%,85%,0.9)`;
  circle(ctx, 0, 0, r * 0.68); ctx.stroke();
  // tick marks = tier count
  ctx.lineWidth = r * 0.06;
  ctx.strokeStyle = `hsla(${h},100%,80%,0.8)`;
  for (let i = 0; i < tier; i++) {
    const a = -Math.PI / 2 + (i - (tier - 1) / 2) * 0.26;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * 1.02, Math.sin(a) * r * 1.02);
    ctx.lineTo(Math.cos(a) * r * 1.16, Math.sin(a) * r * 1.16);
    ctx.stroke();
  }
  ctx.shadowBlur = r * 0.35;
  numberText(ctx, r * 0.8, tier, `hsl(${h},100%,88%)`, null);
  ctx.restore();
}

function drawCandy(ctx, r, tier) {
  const h = CANDY_HUES[tier];
  ctx.save();
  ctx.shadowColor = `hsla(${h},90%,70%,0.8)`; ctx.shadowBlur = r * 0.35;
  sphere(ctx, r, { light: `hsl(${h},100%,93%)`, base: `hsl(${h},85%,72%)`, dark: `hsl(${h},60%,45%)` });
  ctx.restore();
  ctx.save();
  circle(ctx, 0, 0, r); ctx.clip();
  // swirl stripes
  ctx.strokeStyle = 'rgba(255,255,255,0.42)';
  ctx.lineWidth = r * 0.17;
  const n = 3 + (tier % 3);
  for (let i = 0; i < n; i++) {
    ctx.beginPath();
    const a0 = (i / n) * Math.PI * 2;
    for (let t = 0; t <= 1.001; t += 0.1) {
      const a = a0 + t * 2.4, d = t * r * 1.05;
      const x = Math.cos(a) * d, y = Math.sin(a) * d;
      if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
  numberText(ctx, r * 0.78, tier, '#ffffff', `hsla(${h},70%,35%,0.85)`);
  gloss(ctx, r, 0.75);
}

function drawGold(ctx, r, tier) {
  const col = CLASSIC[tier];
  ctx.save();
  ctx.shadowColor = 'rgba(255,200,80,0.8)'; ctx.shadowBlur = r * 0.45;
  const g = ctx.createLinearGradient(-r, -r, r, r);
  g.addColorStop(0, '#fff3c0'); g.addColorStop(0.35, '#f4c542'); g.addColorStop(0.6, '#b07a12'); g.addColorStop(1, '#ffe08a');
  ctx.fillStyle = g;
  circle(ctx, 0, 0, r); ctx.fill();
  ctx.restore();
  // gem with (tier+2) facets
  const sides = Math.min(12, tier + 2);
  const gr = r * 0.68;
  const pts = [];
  for (let i = 0; i < sides; i++) {
    const a = -Math.PI / 2 + (i / sides) * Math.PI * 2;
    pts.push([Math.cos(a) * gr, Math.sin(a) * gr]);
  }
  const gg = ctx.createRadialGradient(-gr * 0.3, -gr * 0.3, 0, 0, 0, gr * 1.1);
  gg.addColorStop(0, col.light); gg.addColorStop(0.5, col.base); gg.addColorStop(1, col.dark);
  ctx.fillStyle = gg;
  ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = Math.max(1, r * 0.035);
  for (const [x, y] of pts) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(x, y); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(90,60,0,0.6)';
  ctx.lineWidth = Math.max(1, r * 0.06);
  ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.stroke();
  gloss(ctx, r, 0.6);
}

/** Aurora (Nova Pass exclusive): a night-sky sphere in the tier hue with glowing northern-light ribbons. */
function drawAurora(ctx, r, tier, hues = AURORA_HUES) {
  const h = hues[tier];
  ctx.save();
  ctx.shadowColor = `hsla(${h},90%,60%,0.75)`; ctx.shadowBlur = r * 0.4;
  sphere(ctx, r, { light: `hsl(${h},70%,62%)`, base: `hsl(${h},65%,30%)`, dark: `hsl(${(h + 30) % 360},70%,10%)` });
  ctx.restore();
  ctx.save();
  circle(ctx, 0, 0, r * 0.98); ctx.clip();
  const rng = mulberry32(tier * 97 + 3);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  for (let i = 0; i < 6; i++) { circle(ctx, (rng() - 0.5) * r * 1.5, -r * 0.1 - rng() * r * 0.8, r * (0.02 + rng() * 0.025)); ctx.fill(); }
  ctx.globalCompositeOperation = 'lighter';
  const bands = 2 + (tier >= 6 ? 1 : 0);
  for (let b = 0; b < bands; b++) {
    const y0 = -r * 0.25 + b * r * 0.32;
    const g = ctx.createLinearGradient(-r, 0, r, 0);
    g.addColorStop(0, 'hsla(150,100%,60%,0)');
    g.addColorStop(0.3, `hsla(${150 + b * 25},100%,62%,0.55)`);
    g.addColorStop(0.65, `hsla(${190 + b * 60},100%,68%,0.5)`);
    g.addColorStop(1, 'hsla(300,100%,70%,0)');
    ctx.strokeStyle = g;
    ctx.lineWidth = r * (0.2 - b * 0.04);
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let t = 0; t <= 1.001; t += 0.05) {
      const x = -r + t * 2 * r;
      const y = y0 + Math.sin(t * Math.PI * 2 + b * 1.7 + tier) * r * 0.12;
      if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
  gloss(ctx, r, 0.45);
}

/** Pearl (Star Capsule, Rare): soft pearly spheres in the tier hue with a gentle sheen ring. */
function drawPearl(ctx, r, tier, hues = PEARL_HUES) {
  const h = hues[tier];
  ctx.save();
  ctx.shadowColor = `hsla(${h},80%,75%,0.7)`; ctx.shadowBlur = r * 0.35;
  sphere(ctx, r, { light: `hsl(${h},60%,96%)`, base: `hsl(${h},55%,74%)`, dark: `hsl(${h},40%,38%)` });
  ctx.restore();
  ctx.save();
  circle(ctx, 0, 0, r * 0.98); ctx.clip();
  // iridescent sheen band
  const g = ctx.createLinearGradient(-r, -r, r, r);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.42, `hsla(${(h + 60) % 360},90%,85%,0.35)`);
  g.addColorStop(0.55, `hsla(${(h + 180) % 360},90%,88%,0.3)`);
  g.addColorStop(0.7, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-r, -r, r * 2, r * 2);
  ctx.restore();
  // tier dots around the rim (count = tier, readable without colour)
  ctx.fillStyle = `hsla(${h},50%,30%,0.55)`;
  for (let i = 0; i < tier; i++) {
    const a = Math.PI / 2 + (i - (tier - 1) / 2) * 0.3;
    circle(ctx, Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8, r * 0.05); ctx.fill();
  }
  gloss(ctx, r, 0.7);
}

/** Prism (Star Capsule, Epic): a cut-glass orb with rainbow facets around a glowing core. */
function drawPrism(ctx, r, tier, hues = PRISM_HUES) {
  const h = hues[tier];
  ctx.save();
  ctx.shadowColor = `hsla(${h},95%,65%,0.8)`; ctx.shadowBlur = r * 0.45;
  sphere(ctx, r, { light: `hsl(${h},90%,80%)`, base: `hsl(${h},80%,45%)`, dark: `hsl(${h},70%,16%)` });
  ctx.restore();
  ctx.save();
  circle(ctx, 0, 0, r * 0.98); ctx.clip();
  const facets = 6 + (tier % 3) * 2;
  for (let i = 0; i < facets; i++) {
    const a0 = (i / facets) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((i + 1) / facets) * Math.PI * 2 - Math.PI / 2;
    ctx.fillStyle = `hsla(${(h + i * (360 / facets)) % 360},100%,72%,${i % 2 ? 0.16 : 0.28})`;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a0) * r * 0.42, Math.sin(a0) * r * 0.42);
    ctx.lineTo(Math.cos(a0) * r * 1.05, Math.sin(a0) * r * 1.05);
    ctx.lineTo(Math.cos(a1) * r * 1.05, Math.sin(a1) * r * 1.05);
    ctx.lineTo(Math.cos(a1) * r * 0.42, Math.sin(a1) * r * 0.42);
    ctx.closePath(); ctx.fill();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = Math.max(1, r * 0.03);
  ctx.beginPath();
  for (let i = 0; i <= facets; i++) {
    const a = (i / facets) * Math.PI * 2 - Math.PI / 2;
    if (i === 0) ctx.moveTo(Math.cos(a) * r * 0.42, Math.sin(a) * r * 0.42); else ctx.lineTo(Math.cos(a) * r * 0.42, Math.sin(a) * r * 0.42);
  }
  ctx.stroke();
  const core = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.45);
  core.addColorStop(0, 'rgba(255,255,255,0.85)');
  core.addColorStop(1, `hsla(${h},100%,70%,0)`);
  ctx.fillStyle = core;
  circle(ctx, 0, 0, r * 0.45); ctx.fill();
  ctx.restore();
  gloss(ctx, r, 0.55);
}

// ---------------------------------------------------------------- asteroid

function drawAsteroidShape(ctx, r, hp, variant) {
  const rng = mulberry32(variant * 131 + 7);
  const n = 10;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const d = r * (0.8 + rng() * 0.22);
    pts.push([Math.cos(a) * d, Math.sin(a) * d]);
  }
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = r * 0.25; ctx.shadowOffsetY = r * 0.08;
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r * 1.1);
  g.addColorStop(0, '#b5b9c6'); g.addColorStop(0.55, '#6d7282'); g.addColorStop(1, '#383b48');
  ctx.fillStyle = g;
  ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.clip();
  for (let i = 0; i < 4; i++) {
    crater(ctx, (rng() - 0.5) * r * 1.1, (rng() - 0.5) * r * 1.1, r * (0.1 + rng() * 0.12), 'rgba(40,42,55,0.5)', 'rgba(220,225,240,0.35)');
  }
  if (hp <= 1) {
    ctx.save();
    ctx.strokeStyle = '#ffb04a';
    ctx.shadowColor = '#ff7a1a'; ctx.shadowBlur = r * 0.3;
    ctx.lineWidth = Math.max(1.5, r * 0.08);
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.7, -r * 0.3); ctx.lineTo(-r * 0.2, -r * 0.05); ctx.lineTo(-r * 0.05, -r * 0.5); ctx.lineTo(r * 0.35, -r * 0.1); ctx.lineTo(r * 0.8, -r * 0.2);
    ctx.moveTo(-r * 0.2, -r * 0.05); ctx.lineTo(-r * 0.1, r * 0.4); ctx.lineTo(r * 0.3, r * 0.75);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(20,20,30,0.7)';
  ctx.lineWidth = Math.max(1, r * 0.05);
  ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.stroke();
}

// ---------------------------------------------------------------- sprite cache

const cache = new Map();
const PAD = 1.62;

function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') {
    try { return new OffscreenCanvas(w, h); } catch (_) { /* fall through */ }
  }
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function sprite(keyStr, r, dpr, painter) {
  let s = cache.get(keyStr);
  if (s) return s;
  if (cache.size > 600) cache.clear();
  const size = Math.ceil(r * 2 * PAD * dpr);
  const cv = makeCanvas(size, size);
  const ctx = cv.getContext('2d');
  ctx.translate(size / 2, size / 2);
  ctx.scale(dpr, dpr);
  painter(ctx);
  s = { canvas: cv, half: size / 2 / dpr };
  cache.set(keyStr, s);
  return s;
}

export function clearArtCache() { cache.clear(); }

export function orbSprite(tier, skin, r, dpr, frame = 0) {
  const rq = Math.max(4, Math.round(r));
  if (skin === 'sushi') return sprite(`o|sushi|${tier}|${rq}|${dpr}|${frame}`, rq, dpr, (ctx) => drawSushi(ctx, rq, tier, frame));
  const ff = FREEFORM[skin];
  if (ff) return sprite(`o|${skin}|${tier}|${rq}|${dpr}|${frame}`, rq, dpr, (ctx) => ff.draw(ctx, rq, tier, frame));
  const pa = PACK_SKIN_ART[skin];
  if (pa) return sprite(`o|${skin}|${tier}|${rq}|${dpr}|${frame}`, rq, dpr, (ctx) => pa.draw(ctx, rq, tier, frame, dpr));
  return sprite(`o|${skin}|${tier}|${rq}|${dpr}`, rq, dpr, (ctx) => {
    if (skin === 'basic') drawBasic(ctx, rq, tier);
    else if (skin === 'neon') drawNeon(ctx, rq, tier);
    else if (skin === 'candy') drawCandy(ctx, rq, tier);
    else if (skin === 'gold') drawGold(ctx, rq, tier);
    else if (skin === 'aurora') drawAurora(ctx, rq, tier);
    else if (skin === 'pearl') drawPearl(ctx, rq, tier);
    else if (skin === 'prism') drawPrism(ctx, rq, tier);
    else if (SEASON_SKIN_ART[skin]) {
      const sv = SEASON_SKIN_ART[skin];
      if (sv.style === 'pearl') drawPearl(ctx, rq, tier, sv.hues);
      else if (sv.style === 'prism') drawPrism(ctx, rq, tier, sv.hues);
      else drawAurora(ctx, rq, tier, sv.hues);
    } else drawClassic(ctx, rq, tier);
  });
}

/**
 * The board blocker ('asteroid' in the rules). look 'cosmic' draws the cratered asteroid; any other look (the café,
 * default) draws a smooth gray harbour pebble (src/game/pebbleArt.js). Presentation only.
 */
export function asteroidSprite(hp, variant, r, dpr, look = 'seaside') {
  const rq = Math.max(4, Math.round(r));
  if (look !== 'cosmic') return sprite(`p|${hp}|${variant % 6}|${rq}|${dpr}`, rq, dpr, (ctx) => drawPebbleShape(ctx, rq, hp, variant % 6));
  return sprite(`a|${hp}|${variant % 6}|${rq}|${dpr}`, rq, dpr, (ctx) => drawAsteroidShape(ctx, rq, hp, variant % 6));
}

// ---------------------------------------------------------------- tier shapes (Comfort pack)
// One plain symbol per tier so tiers can be told apart without colour. Cached sprites, so the
// per-frame cost is one extra drawImage per orb (only when the setting is on).

/** Symbol name for a tier (1..10). Exported for tests / legends. */
export const TIER_SHAPES = ['', 'dot', 'ring', 'triangle', 'square', 'diamond', 'pentagon', 'hexagon', 'star', 'cross', 'burst'];

function polyPath(ctx, n, rr, rot = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2;
    const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
    if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
  }
  ctx.closePath();
}

function starPath(ctx, n, rOut, rIn, rot = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i / (n * 2)) * Math.PI * 2;
    const rr = i % 2 ? rIn : rOut;
    const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
    if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
  }
  ctx.closePath();
}

/** Draw tier symbol of size s centred at the origin (white with a dark outline). */
function shapeGlyph(ctx, tier, s) {
  const name = TIER_SHAPES[Math.max(1, Math.min(10, tier))];
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const outline = Math.max(1.5, s * 0.32);
  const paint = (strokeOnly = false) => {
    ctx.strokeStyle = 'rgba(15,8,40,0.92)';
    ctx.lineWidth = strokeOnly ? outline + s * 0.34 : outline;
    ctx.stroke();
    if (strokeOnly) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = s * 0.3; ctx.stroke(); }
    else { ctx.fillStyle = '#ffffff'; ctx.fill(); }
  };
  switch (name) {
    case 'dot': ctx.beginPath(); ctx.arc(0, 0, s * 0.45, 0, Math.PI * 2); paint(); break;
    case 'ring': ctx.beginPath(); ctx.arc(0, 0, s * 0.72, 0, Math.PI * 2); paint(true); break;
    case 'triangle': polyPath(ctx, 3, s * 1.05); paint(); break;
    case 'square': ctx.beginPath(); ctx.rect(-s * 0.7, -s * 0.7, s * 1.4, s * 1.4); paint(); break;
    case 'diamond': polyPath(ctx, 4, s * 0.98); paint(); break;
    case 'pentagon': polyPath(ctx, 5, s * 0.9); paint(); break;
    case 'hexagon': polyPath(ctx, 6, s * 0.9, 0); paint(); break;
    case 'star': starPath(ctx, 5, s * 1.05, s * 0.45); paint(); break;
    case 'cross': {
      const a = s * 0.95, b = s * 0.32;
      ctx.beginPath();
      ctx.moveTo(-b, -a); ctx.lineTo(b, -a); ctx.lineTo(b, -b); ctx.lineTo(a, -b); ctx.lineTo(a, b); ctx.lineTo(b, b);
      ctx.lineTo(b, a); ctx.lineTo(-b, a); ctx.lineTo(-b, b); ctx.lineTo(-a, b); ctx.lineTo(-a, -b); ctx.lineTo(-b, -b);
      ctx.closePath(); paint(); break;
    }
    default: starPath(ctx, 8, s * 1.08, s * 0.5); paint(); break; // burst
  }
}

/** Cached symbol sprite: centred (no numbers) or as a small corner badge (numbers also shown). */
export function shapeSprite(tier, r, dpr, badge) {
  const rq = Math.max(4, Math.round(r));
  return sprite(`s|${tier}|${rq}|${dpr}|${badge ? 1 : 0}`, rq, dpr, (ctx) => {
    if (badge) {
      ctx.translate(rq * 0.64, rq * 0.64);
      ctx.beginPath(); ctx.arc(0, 0, rq * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(15,8,40,0.88)'; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = Math.max(1, rq * 0.05); ctx.stroke();
      shapeGlyph(ctx, tier, rq * 0.22);
    } else {
      shapeGlyph(ctx, tier, rq * 0.36);
    }
  });
}

/** Cached number badge for skins whose art fills the middle (Sushi Bar). */
function numberBadgeSprite(tier, r, dpr) {
  const rq = Math.max(4, Math.round(r));
  return sprite(`n|${tier}|${rq}|${dpr}`, rq, dpr, (ctx) => drawSushiNumber(ctx, rq, tier));
}

/**
 * Draw an orb centred at (x,y) with radius r (CSS px).
 * opt.anim: idle animation allowed (Sushi Bar blink + squish, driven by opt.time). Callers pass false under
 * Calm / reduced motion, so the orb holds its rest pose. Animation is a cached frame + a transform, never a repaint.
 */
export function drawOrb(ctx, x, y, r, tier, skin, dpr, opt = {}) {
  const k = r / Math.max(4, Math.round(r));
  if (FREEFORM[skin]) { drawFreeform(ctx, x, y, r, k, tier, skin, dpr, opt); return; }
  const pa = PACK_SKIN_ART[skin];
  if (pa) {
    const idle = opt.anim && !opt.wild ? pa.idle(opt.time || 0, tier) : null;
    const s = orbSprite(tier, skin, r, dpr, idle ? idle.frame : 0);
    const half = s.half * k;
    if (idle) {
      ctx.save();
      ctx.translate(x, y + r * 0.9); // breathe from the contact shadow
      ctx.scale(idle.sx, idle.sy);
      ctx.drawImage(s.canvas, -half, -r * 0.9 - half, half * 2, half * 2);
      ctx.restore();
    } else ctx.drawImage(s.canvas, x - half, y - half, half * 2, half * 2);
    if (pa.centreNumber) {
      // Café Classics: the big centred number always shows (never on a wild piece), Numbers setting or not.
      // Cached as its own sprite and drawn without the idle squish, so it stays crisp and steady.
      if (!opt.wild) {
        const rq = Math.max(4, Math.round(r));
        const ns = sprite(`cn|${skin}|${tier}|${rq}|${dpr}`, rq, dpr, (c) => pa.centreNumber(c, rq, tier));
        const nh = ns.half * k;
        ctx.drawImage(ns.canvas, x - nh, y - nh, nh * 2, nh * 2);
      }
    } else if (opt.number && !opt.wild) {
      const nb = numberBadgeSprite(tier, r, dpr);
      const nh = nb.half * k;
      ctx.drawImage(nb.canvas, x - nh, y - nh, nh * 2, nh * 2);
    }
    if (opt.shape && !opt.wild) {
      const ss = shapeSprite(tier, r, dpr, true);
      const sh = ss.half * k;
      ctx.drawImage(ss.canvas, x - sh, y - sh, sh * 2, sh * 2);
    }
    if (opt.golden) drawGoldenOverlay(ctx, x, y, r, opt.time || 0);
    if (opt.wild) drawWildOverlay(ctx, x, y, r, opt.time || 0);
    return;
  }
  if (skin === 'sushi') {
    const idle = opt.anim && !opt.wild ? sushiIdle(opt.time || 0, tier) : null;
    const s = orbSprite(tier, skin, r, dpr, idle ? idle.frame : 0);
    const half = s.half * k;
    if (idle) {
      ctx.save();
      ctx.translate(x, y + r * 0.9); // squish from the bottom of the plate
      ctx.scale(idle.sx, idle.sy);
      ctx.drawImage(s.canvas, -half, -r * 0.9 - half, half * 2, half * 2);
      ctx.restore();
    } else ctx.drawImage(s.canvas, x - half, y - half, half * 2, half * 2);
    if (opt.number && !opt.wild) {
      const nb = numberBadgeSprite(tier, r, dpr);
      const nh = nb.half * k;
      ctx.drawImage(nb.canvas, x - nh, y - nh, nh * 2, nh * 2);
    }
    if (opt.shape && !opt.wild) {
      const ss = shapeSprite(tier, r, dpr, true);
      const sh = ss.half * k;
      ctx.drawImage(ss.canvas, x - sh, y - sh, sh * 2, sh * 2);
    }
    if (opt.golden) drawGoldenOverlay(ctx, x, y, r, opt.time || 0);
    if (opt.wild) drawWildOverlay(ctx, x, y, r, opt.time || 0);
    return;
  }
  const s = orbSprite(tier, skin, r, dpr);
  const half = s.half * k;
  ctx.drawImage(s.canvas, x - half, y - half, half * 2, half * 2);
  const plainSkin = skin === 'classic' || skin === 'gold' || skin === 'aurora' || skin === 'pearl' || skin === 'prism' || !!SEASON_SKIN_ART[skin]; // other skins paint their own numbers
  if (skin === 'basic') {
    // Simple Circles IS the number skin: the big number always shows (never on a wild orb), Numbers setting or not
    if (!opt.wild) {
      const [fill, stroke] = basicInk(tier);
      ctx.save();
      ctx.translate(x, y);
      numberText(ctx, r * basicNumberScale(tier) / (tier >= 10 ? 0.82 : 0.95), tier, fill, stroke);
      ctx.restore();
    }
  } else if (opt.number && !opt.wild && plainSkin) {
    ctx.save();
    ctx.translate(x, y);
    numberText(ctx, r * 0.72, tier, '#ffffff', 'rgba(15,8,40,0.9)');
    ctx.restore();
  }
  if (opt.shape && !opt.wild) {
    // a symbol next to a number goes in the corner (Simple Circles always has its number)
    const ss = shapeSprite(tier, r, dpr, !!opt.number || !plainSkin);
    const sh = ss.half * k;
    ctx.drawImage(ss.canvas, x - sh, y - sh, sh * 2, sh * 2);
  }
  if (opt.golden) drawGoldenOverlay(ctx, x, y, r, opt.time || 0);
  if (opt.wild) drawWildOverlay(ctx, x, y, r, opt.time || 0);
}

/**
 * Free-standing pack pieces (freeform: no disc, no shared rim). The skin's own art paints the whole piece
 * inside radius r, so hit areas and physics are unchanged; number + shape badges and overlays draw on top.
 */
const FREEFORM = {
  // animate: layered idle (wobbling glass, swirling film, rising beads); mergeFx / popFx: see koiFx.js
  koi: { freeform: true, draw: drawKoi, number: drawKoiNumber, color: koiColor, idle: koiIdle, animate: koiAnimate, mergeFx: koiMergeFx, popFx: koiPopFx },
};

/** Per-skin piece effect hooks ({ mergeFx, popFx }), or null when the skin uses the default look. */
export function skinFx(skin) {
  const f = FREEFORM[skin];
  return f && (f.mergeFx || f.popFx) ? { mergeFx: f.mergeFx || null, popFx: f.popFx || null } : null;
}
function drawFreeform(ctx, x, y, r, k, tier, skin, dpr, opt) {
  const art = FREEFORM[skin];
  const idle = opt.anim && !opt.wild ? art.idle(opt.time || 0, tier) : null;
  // layered animation: live idle, or a Calm still frame while a merge/pop is mid-way (fish swimming in, glass gone)
  const layered = art.animate && !opt.wild && (idle || opt.bare || (opt.fishS != null && opt.fishS < 0.999));
  const s = layered ? null : orbSprite(tier, skin, r, dpr, idle ? idle.frame : 0);
  const half = s ? s.half * k : 0;
  if (layered) {
    art.animate(ctx, x, y, r, k, tier, idle ? opt.time || 0 : 0, (code) => orbSprite(tier, skin, r, dpr, code), { still: !idle, bare: !!opt.bare, fishS: opt.fishS });
  } else if (idle) {
    const pivot = r * 0.84; // squish + tilt about the contact point
    ctx.save();
    ctx.translate(x, y + pivot);
    if (idle.rot) ctx.rotate(idle.rot);
    ctx.scale(idle.sx, idle.sy);
    ctx.drawImage(s.canvas, -half, -pivot - half, half * 2, half * 2);
    ctx.restore();
  } else ctx.drawImage(s.canvas, x - half, y - half, half * 2, half * 2);
  if (opt.number && !opt.wild) {
    const rq = Math.max(4, Math.round(r));
    const nb = sprite(`n|${skin}|${tier}|${rq}|${dpr}`, rq, dpr, (c) => art.number(c, rq, tier));
    const nh = nb.half * k;
    ctx.drawImage(nb.canvas, x - nh, y - nh, nh * 2, nh * 2);
  }
  if (opt.shape && !opt.wild) {
    const ss = shapeSprite(tier, r, dpr, true);
    const sh = ss.half * k;
    ctx.drawImage(ss.canvas, x - sh, y - sh, sh * 2, sh * 2);
  }
  if (opt.golden) drawGoldenOverlay(ctx, x, y, r, opt.time || 0);
  if (opt.wild) drawWildOverlay(ctx, x, y, r, opt.time || 0);
}

export function drawAsteroid(ctx, x, y, r, hp, variant, dpr, look = 'seaside') {
  const s = asteroidSprite(hp, variant, r, dpr, look);
  const k = r / Math.max(4, Math.round(r));
  const half = s.half * k;
  ctx.drawImage(s.canvas, x - half, y - half, half * 2, half * 2);
}

export function drawGoldenOverlay(ctx, x, y, r, t) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,214,90,0.95)';
  ctx.shadowColor = '#ffcc33'; ctx.shadowBlur = r * 0.4;
  ctx.lineWidth = Math.max(2, r * 0.1);
  circle(ctx, x, y, r * 1.02); ctx.stroke();
  // orbiting glint
  const a = t * 2.2;
  const gx = x + Math.cos(a) * r * 1.02, gy = y + Math.sin(a) * r * 1.02;
  ctx.fillStyle = '#fff6cf';
  ctx.beginPath();
  const s = r * 0.22;
  ctx.moveTo(gx, gy - s); ctx.lineTo(gx + s * 0.3, gy - s * 0.3); ctx.lineTo(gx + s, gy); ctx.lineTo(gx + s * 0.3, gy + s * 0.3);
  ctx.lineTo(gx, gy + s); ctx.lineTo(gx - s * 0.3, gy + s * 0.3); ctx.lineTo(gx - s, gy); ctx.lineTo(gx - s * 0.3, gy - s * 0.3);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

export function drawWildOverlay(ctx, x, y, r, t) {
  ctx.save();
  ctx.lineWidth = Math.max(2.5, r * 0.14);
  const n = 12;
  for (let i = 0; i < n; i++) {
    const a0 = t * 2 + (i / n) * Math.PI * 2;
    ctx.strokeStyle = `hsl(${(i / n) * 360 + t * 120},100%,65%)`;
    ctx.beginPath(); ctx.arc(x, y, r * 1.06, a0, a0 + (Math.PI * 2) / n + 0.02); ctx.stroke();
  }
  ctx.font = `900 ${Math.round(r * 0.75)}px Fredoka, system-ui, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = Math.max(2, r * 0.14); ctx.strokeStyle = 'rgba(30,0,40,0.8)';
  ctx.strokeText('★', x, y + r * 0.05);
  ctx.fillStyle = '#fff';
  ctx.fillText('★', x, y + r * 0.05);
  ctx.restore();
}

/** Render an orb spec into a small DOM canvas (HUD, shop previews). */
export function paintOrbCanvas(canvas, spec, skin, time = 0) {
  if (!canvas) return;
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const w = canvas.clientWidth || canvas.width || 48;
  const h = canvas.clientHeight || canvas.height || 48;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  if (!spec) return;
  const r = Math.min(w, h) / 2 / 1.45;
  drawOrb(ctx, w / 2, h / 2, r, spec.tier, skin, dpr, { golden: spec.golden, wild: spec.wild, time, number: !!spec.number, shape: !!spec.shape, anim: !!spec.anim });
}
