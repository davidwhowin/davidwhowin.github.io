// Backdrops ("nebulas"): one background theme per Journey chapter (10 levels each), shifting
// every 2 sectors in Endless. Pure data + helpers (no DOM); presentation only, never rules,
// and nothing here touches the game RNG.
//
// Since v3 the default is the light Harbour Window (bottom of this file); the space themes below are the Cosmic look.
// Readability (35–65+ audience): every space theme stays DARK and low-contrast behind the orbs.
// Gradient stops are very dark (HSL lightness about 12% or less) and blob alpha is 0.35 or less
// (tests/backdrops.test.mjs checks both).

export const CHAPTER_LEVELS = 10;
export const SECTORS_PER_BACKDROP = 2;

/**
 * grad: 3 top→bottom stops (at 0, 0.55, 1). blobs: [x, y, r, rgba] in fractions of the
 * screen (r of the longer side). starHue: centre of the tint for the ~15% coloured stars.
 */
export const BACKDROPS = [
  {
    id: 'violet', name: 'Violet Cradle',
    grad: ['#0b0624', '#120a36', '#070418'],
    blobs: [
      [0.15, 0.2, 0.55, 'rgba(120,60,255,0.35)'],
      [0.9, 0.35, 0.5, 'rgba(255,60,180,0.22)'],
      [0.4, 0.85, 0.6, 'rgba(40,140,255,0.25)'],
      [0.75, 0.75, 0.35, 'rgba(60,255,200,0.10)'],
    ],
    starHue: 260,
  },
  {
    id: 'teal', name: 'Teal Reef',
    grad: ['#03141a', '#062229', '#020c10'],
    blobs: [
      [0.2, 0.25, 0.55, 'rgba(30,200,210,0.24)'],
      [0.85, 0.45, 0.45, 'rgba(40,120,255,0.20)'],
      [0.35, 0.85, 0.55, 'rgba(40,230,170,0.16)'],
      [0.8, 0.85, 0.35, 'rgba(120,90,255,0.12)'],
    ],
    starHue: 185,
  },
  {
    id: 'ember', name: 'Ember Drift',
    grad: ['#170806', '#220d09', '#0c0403'],
    blobs: [
      [0.2, 0.2, 0.5, 'rgba(255,110,50,0.20)'],
      [0.9, 0.5, 0.5, 'rgba(255,60,100,0.15)'],
      [0.4, 0.9, 0.55, 'rgba(255,170,70,0.12)'],
      [0.7, 0.15, 0.35, 'rgba(150,60,255,0.12)'],
    ],
    starHue: 30,
  },
  {
    id: 'aurora', name: 'Aurora Veil',
    grad: ['#041016', '#061c1c', '#030a10'],
    blobs: [
      [0.25, 0.15, 0.6, 'rgba(60,255,150,0.18)'],
      [0.8, 0.3, 0.45, 'rgba(70,200,255,0.18)'],
      [0.3, 0.8, 0.5, 'rgba(150,80,255,0.20)'],
      [0.85, 0.85, 0.4, 'rgba(60,255,220,0.10)'],
    ],
    starHue: 150,
  },
  {
    id: 'rose', name: 'Rose Halo',
    grad: ['#140614', '#200a22', '#0b040d'],
    blobs: [
      [0.2, 0.3, 0.55, 'rgba(255,80,170,0.22)'],
      [0.85, 0.2, 0.45, 'rgba(190,70,255,0.20)'],
      [0.5, 0.85, 0.6, 'rgba(255,120,150,0.14)'],
      [0.85, 0.75, 0.35, 'rgba(90,120,255,0.12)'],
    ],
    starHue: 320,
  },
  {
    id: 'sapphire', name: 'Sapphire Deep',
    grad: ['#040a1e', '#071230', '#020612'],
    blobs: [
      [0.2, 0.2, 0.55, 'rgba(40,110,255,0.30)'],
      [0.85, 0.5, 0.5, 'rgba(70,170,255,0.18)'],
      [0.35, 0.9, 0.55, 'rgba(90,70,255,0.20)'],
      [0.7, 0.8, 0.3, 'rgba(60,230,255,0.10)'],
    ],
    starHue: 215,
  },
  {
    id: 'gilded', name: 'Gilded Dust',
    grad: ['#110d05', '#1b1507', '#090703'],
    blobs: [
      [0.25, 0.2, 0.55, 'rgba(255,200,80,0.16)'],
      [0.85, 0.4, 0.45, 'rgba(255,140,60,0.13)'],
      [0.4, 0.85, 0.55, 'rgba(140,90,255,0.16)'],
      [0.85, 0.85, 0.35, 'rgba(255,230,150,0.08)'],
    ],
    starHue: 45,
  },
  {
    id: 'jade', name: 'Jade Hollow',
    grad: ['#04130c', '#071f14', '#020a06'],
    blobs: [
      [0.2, 0.25, 0.55, 'rgba(60,220,120,0.18)'],
      [0.85, 0.35, 0.45, 'rgba(40,200,190,0.16)'],
      [0.4, 0.85, 0.55, 'rgba(120,230,90,0.10)'],
      [0.75, 0.8, 0.35, 'rgba(80,120,255,0.12)'],
    ],
    starHue: 130,
  },
  {
    id: 'storm', name: 'Storm Indigo',
    grad: ['#0a0a1c', '#11112c', '#05050f'],
    blobs: [
      [0.2, 0.2, 0.55, 'rgba(110,120,255,0.24)'],
      [0.85, 0.45, 0.5, 'rgba(150,170,230,0.12)'],
      [0.35, 0.85, 0.55, 'rgba(70,90,200,0.22)'],
      [0.8, 0.15, 0.3, 'rgba(200,220,255,0.08)'],
    ],
    starHue: 235,
  },
  {
    id: 'starforge', name: 'Starforge Heart',
    grad: ['#120616', '#1c0a1e', '#08030a'],
    blobs: [
      [0.5, 0.15, 0.55, 'rgba(255,180,70,0.18)'],
      [0.1, 0.5, 0.5, 'rgba(255,60,190,0.20)'],
      [0.9, 0.6, 0.5, 'rgba(60,170,255,0.18)'],
      [0.45, 0.9, 0.5, 'rgba(150,70,255,0.22)'],
    ],
    starHue: 290,
  },
  // The Outer Reaches (levels 101–150): five chapters past the Starforge, same darkness rules.
  {
    id: 'coral', name: 'Coral Lanterns',
    grad: ['#170908', '#230e0d', '#0b0404'],
    blobs: [
      [0.2, 0.25, 0.55, 'rgba(255,110,90,0.20)'],
      [0.85, 0.4, 0.45, 'rgba(255,170,120,0.14)'],
      [0.35, 0.85, 0.55, 'rgba(40,200,190,0.12)'],
      [0.8, 0.85, 0.35, 'rgba(255,90,140,0.12)'],
    ],
    starHue: 8,
  },
  {
    id: 'citrine', name: 'Citrine Wake',
    grad: ['#0f1206', '#181d09', '#080903'],
    blobs: [
      [0.25, 0.2, 0.55, 'rgba(210,240,80,0.16)'],
      [0.85, 0.45, 0.45, 'rgba(120,230,120,0.12)'],
      [0.4, 0.85, 0.55, 'rgba(255,200,90,0.12)'],
      [0.8, 0.15, 0.3, 'rgba(90,160,255,0.10)'],
    ],
    starHue: 70,
  },
  {
    id: 'crimson', name: 'Crimson Gate',
    grad: ['#16050b', '#230812', '#0b0306'],
    blobs: [
      [0.2, 0.2, 0.55, 'rgba(255,50,100,0.22)'],
      [0.85, 0.45, 0.5, 'rgba(200,40,160,0.16)'],
      [0.4, 0.88, 0.55, 'rgba(255,120,90,0.12)'],
      [0.75, 0.8, 0.3, 'rgba(120,80,255,0.12)'],
    ],
    starHue: 350,
  },
  {
    id: 'quartz', name: 'Quartz Shoals',
    grad: ['#081114', '#0d1a1f', '#04090b'],
    blobs: [
      [0.2, 0.25, 0.55, 'rgba(150,230,255,0.18)'],
      [0.85, 0.35, 0.45, 'rgba(200,190,255,0.14)'],
      [0.4, 0.85, 0.55, 'rgba(110,255,230,0.12)'],
      [0.8, 0.85, 0.35, 'rgba(255,255,255,0.06)'],
    ],
    starHue: 190,
  },
  {
    id: 'horizon', name: 'Event Horizon',
    grad: ['#07050f', '#0e0a1a', '#030207'],
    blobs: [
      [0.5, 0.45, 0.5, 'rgba(255,170,90,0.16)'],
      [0.5, 0.45, 0.25, 'rgba(255,230,180,0.10)'],
      [0.15, 0.15, 0.5, 'rgba(110,70,255,0.20)'],
      [0.85, 0.85, 0.45, 'rgba(60,120,255,0.16)'],
    ],
    starHue: 270,
  },
];

for (let i = 0; i < BACKDROPS.length; i++) BACKDROPS[i].index = i;

/**
 * Capsule nebulas (Star Capsules, v0.5.0): extra backdrops that are NOT part of the chapter /
 * sector cycle. Owned ones (save.backdropsOwned) can be picked in the Background sheet. They came
 * from Star Capsules before v3 (cut); players who own them keep them.
 * Same darkness rules as the chapter themes.
 */
export const CAPSULE_BACKDROPS = [
  {
    id: 'mint', name: 'Mint Mist', capsule: true,
    grad: ['#04130f', '#06201a', '#020a08'],
    blobs: [
      [0.2, 0.25, 0.55, 'rgba(90,255,190,0.18)'],
      [0.85, 0.4, 0.45, 'rgba(120,220,255,0.14)'],
      [0.4, 0.88, 0.55, 'rgba(160,255,210,0.10)'],
    ],
    starHue: 160,
  },
  {
    id: 'peach', name: 'Peach Dusk', capsule: true,
    grad: ['#170b0a', '#22110e', '#0b0505'],
    blobs: [
      [0.25, 0.2, 0.55, 'rgba(255,160,120,0.18)'],
      [0.85, 0.45, 0.45, 'rgba(255,110,150,0.14)'],
      [0.4, 0.88, 0.55, 'rgba(255,200,140,0.10)'],
    ],
    starHue: 20,
  },
  {
    id: 'lilac', name: 'Lilac Haze', capsule: true,
    grad: ['#100a1c', '#18102a', '#08050f'],
    blobs: [
      [0.2, 0.25, 0.55, 'rgba(200,150,255,0.22)'],
      [0.85, 0.35, 0.45, 'rgba(255,170,230,0.12)'],
      [0.45, 0.88, 0.55, 'rgba(140,160,255,0.14)'],
    ],
    starHue: 275,
  },
  {
    id: 'ocean', name: 'Ocean Hush', capsule: true,
    grad: ['#030d18', '#051626', '#02070d'],
    blobs: [
      [0.2, 0.3, 0.55, 'rgba(60,160,255,0.22)'],
      [0.8, 0.2, 0.4, 'rgba(80,230,230,0.14)'],
      [0.5, 0.88, 0.6, 'rgba(40,90,200,0.20)'],
    ],
    starHue: 205,
  },
  {
    id: 'opal', name: 'Opal Bloom', capsule: true,
    grad: ['#0d0a18', '#141226', '#06050d'],
    blobs: [
      [0.2, 0.2, 0.5, 'rgba(120,255,220,0.16)'],
      [0.85, 0.3, 0.45, 'rgba(255,150,220,0.18)'],
      [0.3, 0.8, 0.5, 'rgba(255,220,130,0.12)'],
      [0.8, 0.85, 0.4, 'rgba(140,140,255,0.18)'],
    ],
    starHue: 300,
  },
];
for (const b of CAPSULE_BACKDROPS) b.index = -1;

/**
 * Starlight Season nebulas (src/meta/season.js): three per season theme (one on the free track,
 * two on the premium track). Simple palette variants with the same darkness rules. Owned ones live
 * in save.backdropsOwned like capsule nebulas and are kept forever.
 */
const sn = (id, name, grad, cols, starHue) => ({
  id, name, season: true, grad,
  blobs: [[0.2, 0.25, 0.55, cols[0]], [0.85, 0.4, 0.45, cols[1]], [0.4, 0.88, 0.55, cols[2]]],
  starHue,
});
export const SEASON_BACKDROPS = [
  // Comet Bloom
  sn('sn_sprout', 'Sprout Drift', ['#06120a', '#0b1d12', '#030a05'], ['rgba(150,255,150,0.16)', 'rgba(255,170,220,0.12)', 'rgba(120,230,170,0.10)'], 120),
  sn('sn_petal', 'Petal Haze', ['#160a12', '#22101c', '#0b0509'], ['rgba(255,150,210,0.20)', 'rgba(255,210,150,0.12)', 'rgba(220,140,255,0.12)'], 330),
  sn('sn_bloom', 'Comet Bloom', ['#120a16', '#1c1024', '#08050c'], ['rgba(255,120,200,0.20)', 'rgba(130,255,200,0.16)', 'rgba(255,230,140,0.12)'], 310),
  // Silver Moon
  sn('sn_silver', 'Silver Tide', ['#0a0d14', '#111622', '#05070b'], ['rgba(200,215,255,0.16)', 'rgba(150,180,230,0.12)', 'rgba(220,230,255,0.10)'], 220),
  sn('sn_lunar', 'Lunar Veil', ['#0b0b18', '#131328', '#06060d'], ['rgba(170,170,255,0.18)', 'rgba(230,230,255,0.12)', 'rgba(140,200,255,0.12)'], 240),
  sn('sn_moonrise', 'Moonrise', ['#0d0c12', '#18161f', '#070609'], ['rgba(255,240,200,0.16)', 'rgba(180,190,255,0.16)', 'rgba(255,255,255,0.08)'], 50),
  // Ember Dawn
  sn('sn_dawn', 'Dawn Glow', ['#140c08', '#21140c', '#0a0604'], ['rgba(255,190,120,0.16)', 'rgba(255,140,110,0.12)', 'rgba(255,220,160,0.10)'], 30),
  sn('sn_hearth', 'Hearth Cloud', ['#170a07', '#24100b', '#0b0503'], ['rgba(255,130,80,0.20)', 'rgba(255,190,90,0.14)', 'rgba(255,100,120,0.12)'], 15),
  sn('sn_sunrise', 'Ember Sunrise', ['#150a0c', '#221016', '#0a0506'], ['rgba(255,160,90,0.20)', 'rgba(255,100,160,0.16)', 'rgba(255,230,120,0.12)'], 10),
  // Frost Halo
  sn('sn_snow', 'Snowfield', ['#081016', '#0d1922', '#04080b'], ['rgba(190,240,255,0.16)', 'rgba(255,255,255,0.10)', 'rgba(150,210,255,0.12)'], 195),
  sn('sn_glacier', 'Glacier Glow', ['#04111a', '#071b29', '#02080d'], ['rgba(90,220,255,0.20)', 'rgba(160,255,240,0.14)', 'rgba(80,140,255,0.14)'], 190),
  sn('sn_halo', 'Frost Halo', ['#0a0e1a', '#111829', '#05070d'], ['rgba(170,230,255,0.20)', 'rgba(210,180,255,0.16)', 'rgba(255,255,255,0.10)'], 205),
];
for (const b of SEASON_BACKDROPS) b.index = -1;

/**
 * Comet Week nebulas (src/meta/cometWeek.js): earned by filling the Comet Week meter (one per event, in this
 * order). Same darkness rules; owned ones live in save.backdropsOwned and are kept forever.
 */
const cw = (id, name, grad, cols, starHue) => ({
  id, name, comet: true, grad,
  blobs: [[0.2, 0.25, 0.55, cols[0]], [0.85, 0.4, 0.45, cols[1]], [0.4, 0.88, 0.55, cols[2]]],
  starHue,
});
export const COMET_BACKDROPS = [
  cw('cw_tail', 'Comet Tail', ['#050b18', '#0a1426', '#03060d'], ['rgba(140,210,255,0.20)', 'rgba(255,230,170,0.12)', 'rgba(110,150,255,0.14)'], 200),
  cw('cw_ion', 'Ion Wake', ['#04101a', '#071a28', '#02080d'], ['rgba(90,240,255,0.18)', 'rgba(150,120,255,0.14)', 'rgba(120,255,220,0.10)'], 185),
  cw('cw_coma', 'Coma Glow', ['#0b0d14', '#141824', '#06070b'], ['rgba(170,255,210,0.16)', 'rgba(255,255,230,0.10)', 'rgba(140,200,255,0.14)'], 150),
];
for (const b of COMET_BACKDROPS) b.index = -1;

/**
 * Sky scenes (v0.5.8, src/meta/scenes.js): premium ANIMATED backgrounds from the Shop (Skins tab),
 * bought with coins or earned Stardust. `scene` names the art in src/game/sceneArt.js (layers are
 * pre-rendered once per screen size; only transforms and alpha change per frame, and the motion stops
 * under Calm / reduced motion). grad + blobs are the base nebula under the layers (and the CSS swatch),
 * with the same darkness rules as every other theme. Owned ones live in save.scenesOwned.
 */
const sc = (id, name, scene, grad, cols, starHue, blurb) => ({
  id, name, scene, premium: true, grad, blurb,
  blobs: [[0.2, 0.2, 0.55, cols[0]], [0.85, 0.45, 0.45, cols[1]], [0.4, 0.88, 0.55, cols[2]]],
  starHue,
});
export const SCENE_BACKDROPS = [
  sc('sc_saturn', 'Aurora Over Saturn', 'saturn', ['#03101a', '#061a22', '#03070d'],
    ['rgba(60,255,170,0.16)', 'rgba(90,150,255,0.14)', 'rgba(255,190,120,0.10)'], 160,
    'Green auroras sway above a ringed giant.'),
  sc('sc_comets', 'Comet Rain', 'comets', ['#050a1c', '#09112c', '#030510'],
    ['rgba(90,140,255,0.20)', 'rgba(150,110,255,0.14)', 'rgba(80,220,255,0.10)'], 210,
    'Soft comets glide past a dusty galaxy band.'),
  sc('sc_binary', 'Binary Sunset', 'binary', ['#0c0716', '#1a0c18', '#0a0505'],
    ['rgba(150,80,255,0.16)', 'rgba(255,120,90,0.12)', 'rgba(255,170,90,0.14)'], 25,
    'Two suns circle low over quiet dunes.'),
  sc('sc_deep', 'Deep Field', 'deep', ['#05050e', '#08081a', '#030308'],
    ['rgba(110,90,255,0.14)', 'rgba(255,150,110,0.08)', 'rgba(70,140,255,0.12)'], 230,
    'Thousands of far galaxies drift in layers.'),
  sc('sc_crystal', 'Crystal Nebula', 'crystal', ['#0a0618', '#120a28', '#06040e'],
    ['rgba(150,90,255,0.20)', 'rgba(80,220,255,0.14)', 'rgba(255,120,220,0.12)'], 280,
    'Glassy shards catch slow prism light.'),
];
for (const b of SCENE_BACKDROPS) b.index = -1;

/**
 * Premium themed packs (src/meta/packs.js, DESIGN.md "Premium themed packs"): animated scenes sold for real
 * money as part of a pack (or singly). Same art system, darkness rules and Calm freeze as the Sky scenes,
 * but a separate list: Sky scenes are never sold for money. Owned ones live in save.scenesOwned.
 */
const pk = (id, name, scene, pack, grad, cols, starHue, blurb) => ({ ...sc(id, name, scene, grad, cols, starHue, blurb), pack });
export const PACK_BACKDROPS = [
  pk('pk_sushi_counter', 'Sushi Counter', 'sushi', 'sushi', ['#120b08', '#1c110b', '#080504'],
    ['rgba(255,170,90,0.16)', 'rgba(255,120,70,0.10)', 'rgba(255,210,140,0.10)'], 30,
    'A warm sushi bar: lanterns sway, plates glide by on the belt.'),
  pk('pk_sakura', 'Sakura Garden', 'sakura', 'sushi', ['#0c0814', '#160c1c', '#06040a'],
    ['rgba(255,150,200,0.16)', 'rgba(150,120,255,0.12)', 'rgba(255,200,230,0.10)'], 330,
    'Moonlit cherry blossoms drift over a still pond.'),
  pk('pk_lily_pond', 'Lily Pond', 'lilypond', 'koi', ['#0a1820', '#081419', '#04090c'],
    ['rgba(90,200,190,0.14)', 'rgba(150,110,230,0.12)', 'rgba(200,255,140,0.08)'], 170,
    'A twilight pond: lily pads drift, fireflies glow, koi glide below.'),
  pk('pk_rain_temple', 'Rainy Temple', 'raintemple', 'koi', ['#080a16', '#0c1120', '#05070c'],
    ['rgba(255,130,70,0.14)', 'rgba(110,140,220,0.12)', 'rgba(255,190,120,0.08)'], 220,
    'Night rain under a temple eave, warm lanterns swaying.'),
  pk('pk_cat_cafe', 'Rainy Café', 'catcafe', 'cat', ['#120a06', '#1a100a', '#080403'],
    ['rgba(255,170,90,0.16)', 'rgba(120,160,230,0.10)', 'rgba(255,200,140,0.10)'], 30,
    'A cosy café on a rainy night: drops run down the glass, the latte steams, a cat naps on the sill.'),
  pk('pk_cat_rooftop', 'Rooftop Night', 'rooftop', 'cat', ['#060818', '#0c0e22', '#05040c'],
    ['rgba(150,170,255,0.14)', 'rgba(255,190,120,0.08)', 'rgba(120,100,200,0.10)'], 230,
    'City rooftops under the moon: windows twinkle, clouds drift, a cat keeps watch from a chimney.'),
  pk('pk_patisserie_counter', 'Pâtisserie Counter', 'patisserie', 'patisserie', ['#1e0e16', '#160a10', '#0a0408'],
    ['rgba(255,190,150,0.16)', 'rgba(255,150,190,0.12)', 'rgba(255,220,170,0.10)'], 340,
    'A Parisian pâtisserie at closing time: the display case glows, sugar dust drifts, the coffee steams.'),
  pk('pk_patisserie_rooftop', 'Pastel Rooftop', 'pastelroof', 'patisserie', ['#16102a', '#1a1028', '#0a0612'],
    ['rgba(255,170,210,0.14)', 'rgba(190,170,255,0.12)', 'rgba(255,214,150,0.10)'], 290,
    'Paris rooftops at pastel dusk: string lights twinkle, clouds drift, fireflies over a macaron tower.'),
  pk('pk_coral_reef', 'Coral Reef', 'coralreef', 'deepsea', ['#042a34', '#03202a', '#021014'],
    ['rgba(90,220,230,0.16)', 'rgba(255,150,130,0.10)', 'rgba(120,255,200,0.08)'], 185,
    'A sunlit coral reef: light rays shimmer, kelp sways, a little school of fish drifts by.'),
  pk('pk_abyss', 'The Abyss', 'abyss', 'deepsea', ['#030818', '#020614', '#01030a'],
    ['rgba(80,140,255,0.10)', 'rgba(150,110,255,0.08)', 'rgba(100,255,220,0.06)'], 215,
    'The deep sea at night: an anglerfish lure glows, tiny lights twinkle, marine snow drifts down.'),
  pk('pk_garden_shed', 'Potting Shed', 'pottingshed', 'garden', ['#201408', '#180e06', '#0a0603'],
    ['rgba(255,200,120,0.16)', 'rgba(140,200,110,0.10)', 'rgba(255,220,160,0.08)'], 35,
    'A sunny potting shed: dust drifts in the window light, a string of bulbs sways, a ginger cat naps on the bench.'),
  pk('pk_garden_border', 'Summer Border', 'summerborder', 'garden', ['#22140e', '#1a0e0c', '#0a0606'],
    ['rgba(255,190,110,0.16)', 'rgba(255,140,190,0.10)', 'rgba(150,210,110,0.08)'], 25,
    'A cottage flower border at golden hour: hollyhocks sway, butterflies drift, a bee bumbles over the bed.'),
];
for (const b of PACK_BACKDROPS) b.index = -1;

/**
 * Seaside Café (v3 default look, DESIGN.md "v3 PIVOT"): the café window over the harbour cove, free for everyone.
 * 'harbour' is the default (sunrise); 'harbour_<variant>' are the six chapter moods from chapters.js
 * BACKDROP_VARIANTS (same scene, different sky / weather / props; see seasideScenes.js HARBOUR_VARIANTS).
 * This is the one LIGHT backdrop family, so it is kept out of BACKDROPS (whose darkness tests stay as they are);
 * it is meant to sit behind the opaque Driftwood tray. light: true tells the renderer to skip the drifting
 * space stars. grad is the base under the scene layers and the CSS swatch.
 */
const HARBOUR_GRADS = {
  sunrise: ['#f6cdbb', '#a9d2cf', '#8a6440'], noon: ['#8cc6e6', '#4fa6b8', '#8a6440'], rain: ['#97a4ac', '#6f8a90', '#7a5a3c'],
  golden: ['#f0ae70', '#6c9ea2', '#8a6440'], dusk: ['#56598a', '#45587a', '#6a4a30'], starry: ['#141f3c', '#1c2c4a', '#4a3420'],
};
const harbourTheme = (variant, id, name) => ({
  id, name, scene: 'harbour', variant, seaside: true, light: true, free: true, index: -1,
  grad: HARBOUR_GRADS[variant], blobs: [], starHue: 40,
  blurb: 'The view from the café window: boats, gulls and a lighthouse across the cove.',
});
export const HARBOUR_VARIANT_NAMES = { sunrise: 'Sunrise', noon: 'Noon', rain: 'Rainy Day', golden: 'Golden Hour', dusk: 'Dusk', starry: 'Starry Night' };
export const SEASIDE_BACKDROPS = [
  harbourTheme('sunrise', 'harbour', 'Harbour Window'),
  ...Object.entries(HARBOUR_VARIANT_NAMES).map(([v, n]) => harbourTheme(v, 'harbour_' + v, 'Harbour · ' + n)),
];

/** Backdrop id for the harbour scene in a chapters.js BACKDROP_VARIANTS mood ('harbour' for unknown / missing). */
export function harbourBackdropId(variant) {
  return HARBOUR_VARIANT_NAMES[variant] ? 'harbour_' + variant : 'harbour';
}

/**
 * Cosmic look (v3): every id that belongs to the original space style, so Looks can group them as one pack.
 * W1 wires this into the Looks screen; nothing here changes ownership.
 */
export const COSMIC_PACK = {
  id: 'cosmic',
  name: 'Cosmic',
  skins: ['classic', 'neon', 'candy', 'gold', 'aurora', 'pearl', 'prism'],
  boards: ['nova', 'starglass', 'nebula_velvet', 'brass_observatory'],
  combos: ['stardust', 'comet_sparks', 'aurora_veil', 'constellation'],
  backdrops: BACKDROPS.map((b) => b.id),
};

export const BACKDROP_BY_ID = Object.fromEntries([...BACKDROPS, ...CAPSULE_BACKDROPS, ...SEASON_BACKDROPS, ...COMET_BACKDROPS, ...SCENE_BACKDROPS, ...PACK_BACKDROPS, ...SEASIDE_BACKDROPS].map((b) => [b.id, b]));

/** 1-based Journey level → 0-based chapter (clamped to the themes we have). */
export function chapterOf(level) {
  const n = Math.max(1, Math.floor(Number(level) || 1));
  return Math.min(BACKDROPS.length - 1, Math.floor((n - 1) / CHAPTER_LEVELS));
}

/** First Journey level of a chapter (1-based). */
export function chapterStartLevel(index) { return index * CHAPTER_LEVELS + 1; }

/** First Endless sector that shows a theme on its first lap (sector 1 → theme 0). */
export function sectorStart(index) { return index * SECTORS_PER_BACKDROP + 1; }

export function backdropForLevel(level) { return BACKDROPS[chapterOf(level)]; }

/** Endless / Daily: a new theme every 2 sectors, cycling through all of them (1–2 → 0, 3–4 → 1, …). */
export function backdropForSector(sector) {
  const s = Math.max(1, Math.floor(Number(sector) || 1));
  return BACKDROPS[Math.floor((s - 1) / SECTORS_PER_BACKDROP) % BACKDROPS.length];
}

/** The last chapter nebula Endless can unlock (index 9, Starforge Heart): the Outer Reaches (10-14) unlock only in the Journey. */
export const ENDLESS_UNLOCK_MAX = 9;

/** Ids the player may pick in Settings: Journey chapter reached, or Endless best sector reached (first 10 only; + owned capsule, season and Comet Week nebulas and sky scenes). */
export function unlockedBackdrops(save) {
  const level = (save && save.journey && Number(save.journey.level)) || 1; // next level to play = reached
  const sector = (save && save.stats && Number(save.stats.bestSector)) || 1;
  const ids = BACKDROPS.filter((b, i) => i === 0 || level >= chapterStartLevel(i) || (i <= ENDLESS_UNLOCK_MAX && sector >= sectorStart(i))).map((b) => b.id);
  const owned = (save && Array.isArray(save.backdropsOwned)) ? save.backdropsOwned : [];
  for (const b of CAPSULE_BACKDROPS) if (owned.includes(b.id)) ids.push(b.id);
  for (const b of SEASON_BACKDROPS) if (owned.includes(b.id)) ids.push(b.id);
  for (const b of COMET_BACKDROPS) if (owned.includes(b.id)) ids.push(b.id);
  const scenes = (save && Array.isArray(save.scenesOwned)) ? save.scenesOwned : [];
  for (const b of SCENE_BACKDROPS) if (scenes.includes(b.id)) ids.push(b.id);
  for (const b of PACK_BACKDROPS) if (scenes.includes(b.id)) ids.push(b.id);
  for (const b of SEASIDE_BACKDROPS) ids.push(b.id); // Seaside Café: free for everyone
  return ids;
}

export function isBackdropUnlocked(save, id) { return unlockedBackdrops(save).includes(id); }

/**
 * The theme to show. setting: 'auto' or a theme id (unknown or locked ids fall back to auto).
 * context: { mode: 'menu' } | { mode: 'journey', level } | { mode: 'endless' | 'daily', sector }.
 * Auto: menus follow the player's current Journey chapter; Daily follows sectors like Endless
 * (same for everyone, starting at theme 0).
 */
export function resolveBackdrop(setting, context, save) {
  if (setting && setting !== 'auto' && BACKDROP_BY_ID[setting] && isBackdropUnlocked(save, setting)) {
    return BACKDROP_BY_ID[setting];
  }
  const c = context || { mode: 'menu' };
  if (c.mode === 'journey') return backdropForLevel(c.level);
  if (c.mode === 'endless' || c.mode === 'daily') return backdropForSector(c.sector);
  return backdropForLevel((save && save.journey && save.journey.level) || 1);
}

/** CSS background for a small swatch preview (same colours as the canvas nebula). */
export function backdropSwatchCss(theme) {
  const t = theme || BACKDROPS[0];
  const blobs = t.blobs.map(([x, y, r, col]) => {
    // swatches are tiny: lift blob alpha a little so the hue reads, still within the theme's palette
    const vivid = col.replace(/,\s*([\d.]+)\)$/, (_, a) => `,${Math.min(0.85, Number(a) * 2.2).toFixed(2)})`);
    return `radial-gradient(circle at ${Math.round(x * 100)}% ${Math.round(y * 100)}%, ${vivid}, rgba(0,0,0,0) ${Math.round(r * 100)}%)`;
  });
  return [...blobs, `linear-gradient(180deg, ${t.grad[0]}, ${t.grad[1]} 55%, ${t.grad[2]})`].join(', ');
}
