// Café restoration data (v3, "Nova's Seaside Café"). Pure data, no DOM, no RNG.
//
// One café area per 20-level Journey chapter (src/game/chapters.js: CHAPTERS[c-1].areaId).
// Each area has 7–8 tasks costing 1–3 café stars (18–20 in total); every task offers 3 styles,
// and a built task can be restyled for free at any time. Finishing an area pays reward.coins
// once and moves its keeper (a "Regular") in for free; an already-owned Regular pays +300 coins
// instead, and so does an area with no Regular (keeper: null). The logic lives in
// src/meta/cafe.js; the art (prop painters and their placement) in src/game/cafeArt.js.
//
// Save shape: save.cafe = {
//   v: 2,                      // schema version (2: awning-first terrace prices)
//   done: { taskId: styleIdx }, // built tasks and their chosen style (0..2)
//   celebrated: [areaId, ...], // areas whose completion reward has been paid (paid once)
//   cam: areaId,               // area the camera last rested on ('terrace' for new saves)
//   intro: bool,               // the opening "shall we bring it back?" moment has been shown
//   oldPrices: true,           // only on v1 saves that built exactly one of steps/awning: they keep 1/2 ★ (cafe.js)
// }
//
// Stars are DERIVED, never stored, so they can't drift or be bought:
//   earned    = number of Journey levels n with journey.stars[n] >= 1 (1 per level, first clear)
//   spent     = sum of cost over tasks in `done`
//   available = max(0, earned - spent)
//
// Ethics: no energy or lives, no timers, no adverts, no buying stars or skips, and no area or
// style is ever paid. Nothing here reads coins, the shop or advert state.
//
// Area shape: { id, book, chapter, name, cam: { x, y, zoom }, keeper, reward: { coins },
//   tasks: [{ id, name, cost, prop, styles: [{ id, name } ×3] }], lines: { intro: [], done: [] } }
//   cam: world position of the area's centre on the café panorama (1 area = 1000 units wide,
//   y grows downward, 0 = eye level of the ground floor). Book 1 runs left to right Terrace →
//   Counter → Kitchen → Garden → Pier, the Rooftop sits above the Counter, and Book 2 continues
//   to the right along the harbour. keeper: keepers.js id or null.
//   Task ids start with `${areaId}_`; prop ids are unique across all areas (cafeArt.js PROPS).
//   Tasks are listed in the order the build sheet shows them (cheapest first).

import { MORE_AREAS, MORE_BOOKS, cafeText } from './cafeDataBooks.js';
import { withText, ct, TEXT, LINES } from '../i18n/index.js';

export const CAFE_VERSION = 2; // 2: awning-first terrace prices (v1 saves may keep the old ones, see cafe.js)
export const AREA_REWARD_COINS = 300;
/** Coins paid instead of a Regular when the area's Regular is already owned (or it has none). */
export const REGULAR_FALLBACK_COINS = 300;

export const CAFE_BOOKS = [
  { book: 1, name: TEXT },
  { book: 2, name: TEXT },
].map((b) => withText(b, `cafe.book.${b.book}`)).concat(MORE_BOOKS); // Books 3–9 (chapters 13–50): src/meta/cafeDataBooks.js

/** Shown once every area is finished (around level 979 for a player who clears every level). Stars keep banking. */
export const OUT_OF_CONTENT_LINE = ct('cafe.outOfContent');

const cam = (x, y, zoom = 1) => ({ x, y, zoom });
const reward = () => ({ coins: AREA_REWARD_COINS });
const st = (...ids) => ids.map((id) => ({ id, name: TEXT }));
const task = (id, cost, prop, styles) => ({ id, name: TEXT, cost, prop, styles });

// Text (area, task and style names, Pip's intro and done lines) is content text (src/i18n/content/en.js, cafeText).
export const CAFE_AREAS = [
  // ------------------------------------------------------------------ Book 1 "The Café"
  {
    id: 'terrace', book: 1, chapter: 1, name: TEXT, cam: cam(0, -60), keeper: 'luna', reward: reward(),
    tasks: [
      // docs/UX_RETENTION.md item 8: the awning first (1 ★), a big visible change; the steps move to 2 ★ (area total
      // unchanged). Saves that built one of the two under the old prices keep them (cafe.js OLD_TERRACE_COSTS).
      task('terrace_awning', 1, 'awning', st('coral', 'mint', 'butter')),
      task('terrace_sign', 1, 'sign', st('seafoam', 'navy', 'driftwood')),
      task('terrace_steps', 2, 'steps', st('stone', 'tile', 'oak')),
      task('terrace_tables', 2, 'tables', st('iron', 'painted', 'mosaic')),
      task('terrace_chairs', 3, 'chairs', st('rattan', 'deck', 'bench')),
      task('terrace_planters', 3, 'planters', st('geranium', 'lavender', 'marigold')),
      task('terrace_lights', 3, 'lights', st('bulbs', 'lanterns', 'shells')),
      task('terrace_door', 3, 'door', st('blue', 'sage', 'yellow')),
    ],
    lines: { intro: LINES, done: LINES },
  },
  {
    id: 'counter', book: 1, chapter: 2, name: TEXT, cam: cam(1000, -60), keeper: 'bloop', reward: reward(),
    tasks: [
      task('counter_menu', 1, 'menuBoard', st('chalk', 'shells', 'painted')),
      task('counter_till', 1, 'till', st('brass', 'mint', 'cherry')),
      task('counter_stools', 2, 'stools', st('red', 'stripe', 'rush')),
      task('counter_lamps', 2, 'pendants', st('copper', 'milk', 'wicker')),
      task('counter_case', 3, 'pastryCase', st('scones', 'tarts', 'swirls')),
      task('counter_espresso', 3, 'espresso', st('brass', 'cream', 'pistachio')),
      task('counter_shelves', 3, 'cupShelves', st('willow', 'rainbow', 'seaglass')),
      task('counter_bar', 3, 'bar', st('oak', 'duckegg', 'tiled')),
    ],
    lines: { intro: LINES, done: LINES },
  },
  {
    id: 'kitchen', book: 1, chapter: 3, name: TEXT, cam: cam(2000, -60), keeper: 'ember', reward: reward(),
    tasks: [
      task('kitchen_window', 1, 'kitchenWindow', st('gingham', 'lace', 'shutters')),
      task('kitchen_pans', 2, 'pans', st('copper', 'duckegg', 'cherry')),
      task('kitchen_spices', 2, 'spiceShelf', st('glass', 'tins', 'clay')),
      task('kitchen_table', 2, 'bakingTable', st('block', 'marble', 'farm')),
      task('kitchen_sink', 2, 'sink', st('porcelain', 'stone', 'copper')),
      task('kitchen_range', 3, 'range', st('cream', 'green', 'blue')),
      task('kitchen_dresser', 3, 'dresser', st('pine', 'sage', 'butter')),
      task('kitchen_bread', 3, 'bread', st('sourdough', 'plait', 'buns')),
    ],
    lines: { intro: LINES, done: LINES },
  },
  {
    id: 'garden', book: 1, chapter: 4, name: TEXT, cam: cam(3000, -60), keeper: 'zip', reward: reward(),
    tasks: [
      task('garden_gate', 1, 'gate', st('picket', 'lattice', 'twig')),
      task('garden_path', 1, 'gardenPath', st('shells', 'brick', 'stones')),
      task('garden_herbs', 2, 'herbs', st('rosemary', 'mint', 'basil')),
      task('garden_birdbath', 2, 'birdbath', st('stone', 'glazed', 'copper')),
      task('garden_bench', 3, 'gardenBench', st('white', 'green', 'sunflower')),
      task('garden_arch', 3, 'arch', st('roses', 'jasmine', 'clematis')),
      task('garden_tree', 3, 'tree', st('lemon', 'blossom', 'orange')),
      task('garden_borders', 3, 'borders', st('cottage', 'blue', 'sunset')),
    ],
    lines: { intro: LINES, done: LINES },
  },
  {
    id: 'pier', book: 1, chapter: 5, name: TEXT, cam: cam(4000, -60), keeper: 'nimbus', reward: reward(),
    tasks: [
      task('pier_boards', 1, 'pierBoards', st('grey', 'teak', 'white')),
      task('pier_buoys', 1, 'buoys', st('redwhite', 'rainbow', 'glass')),
      task('pier_lamps', 2, 'pierLamps', st('iron', 'brass', 'globe')),
      task('pier_telescope', 2, 'seaScope', st('brass', 'mint', 'red')),
      task('pier_rail', 3, 'pierRail', st('white', 'rope', 'blue')),
      task('pier_boat', 3, 'rowboat', st('red', 'sky', 'yellow')),
      task('pier_hut', 3, 'teaHut', st('candy', 'blue', 'sorbet')),
      task('pier_flags', 3, 'pierFlags', st('pastel', 'nautical', 'rainbow')),
    ],
    lines: { intro: LINES, done: LINES },
  },
  {
    id: 'rooftop', book: 1, chapter: 6, name: TEXT, cam: cam(1000, -440, 1.15), keeper: 'nova', reward: reward(),
    tasks: [
      task('rooftop_hatch', 1, 'hatch', st('navy', 'oak', 'green')),
      task('rooftop_blankets', 1, 'blankets', st('tartan', 'knit', 'patchwork')),
      task('rooftop_rail', 2, 'deckRail', st('white', 'rope', 'stars')),
      task('rooftop_plants', 2, 'nightPlants', st('jasmine', 'moon', 'stock')),
      task('rooftop_seats', 3, 'loungers', st('loungers', 'cushions', 'swing')),
      task('rooftop_lights', 3, 'deckLights', st('moons', 'stars', 'globes')),
      task('rooftop_telescope', 3, 'telescope', st('brass', 'midnight', 'copper')),
      task('rooftop_chart', 3, 'starChart', st('parchment', 'midnight', 'watercolour')),
    ],
    lines: { intro: LINES, done: LINES },
  },
  // ------------------------------------------------------------------ Book 2 "The Harbour"
  {
    id: 'boathouse', book: 2, chapter: 7, name: TEXT, cam: cam(5000, -60), keeper: 'gus', reward: reward(),
    tasks: [
      task('boathouse_oars', 1, 'oars', st('tips', 'yellow', 'pastel')),
      task('boathouse_ropes', 1, 'ropes', st('hemp', 'red', 'blue')),
      task('boathouse_lantern', 2, 'shipLantern', st('brass', 'red', 'green')),
      task('boathouse_flags', 2, 'signalFlags', st('nautical', 'pastel', 'sunset')),
      task('boathouse_doors', 3, 'boathouseDoors', st('red', 'navy', 'green')),
      task('boathouse_slipway', 3, 'slipway', st('stone', 'timber', 'cobble')),
      task('boathouse_boat', 3, 'dinghy', st('varnish', 'redwhite', 'bluewhite')),
      task('boathouse_roof', 3, 'boathouseRoof', st('slate', 'terracotta', 'tin')),
    ],
    lines: { intro: LINES, done: LINES },
  },
  {
    id: 'flowerStall', book: 2, chapter: 8, name: TEXT, cam: cam(6000, -60), keeper: null, reward: reward(),
    tasks: [
      task('flowerStall_buckets', 1, 'buckets', st('tulips', 'sunflowers', 'sweetpeas')),
      task('flowerStall_sign', 1, 'stallSign', st('chalk', 'tin', 'wood')),
      task('flowerStall_canopy', 2, 'stallCanopy', st('pink', 'green', 'lilac')),
      task('flowerStall_baskets', 2, 'hangingBaskets', st('fuchsia', 'petunia', 'daisy')),
      task('flowerStall_cart', 3, 'flowerCart', st('red', 'blue', 'wood')),
      task('flowerStall_bike', 3, 'flowerBike', st('mint', 'cream', 'red')),
      task('flowerStall_wreaths', 3, 'wreaths', st('shell', 'lavender', 'berry')),
      task('flowerStall_table', 3, 'pottingTable', st('terracotta', 'enamel', 'jars')),
    ],
    lines: { intro: LINES, done: LINES },
  },
  {
    id: 'beachHuts', book: 2, chapter: 9, name: TEXT, cam: cam(7000, -60), keeper: null, reward: reward(),
    tasks: [
      task('beachHuts_walk', 1, 'boardwalk', st('bleached', 'driftwood', 'blue')),
      task('beachHuts_windbreak', 1, 'windbreak', st('candy', 'blue', 'sun')),
      task('beachHuts_hut1', 2, 'hut1', st('mint', 'coral', 'lemon')),
      task('beachHuts_chairs', 2, 'deckchairs', st('stripes', 'pastel', 'navy')),
      task('beachHuts_bunting', 3, 'hutBunting', st('pastel', 'spots', 'sunset')),
      task('beachHuts_hut2', 3, 'hut2', st('sky', 'lilac', 'peach')),
      task('beachHuts_hut3', 3, 'hut3', st('sea', 'rose', 'navy')),
      task('beachHuts_parasol', 3, 'parasols', st('fringe', 'stripe', 'scallop')),
    ],
    lines: { intro: LINES, done: LINES },
  },
  {
    id: 'lighthouse', book: 2, chapter: 10, name: TEXT, cam: cam(8000, -110), keeper: null, reward: reward(),
    tasks: [
      task('lighthouse_path', 1, 'rockPath', st('gravel', 'flags', 'boards')),
      task('lighthouse_door', 1, 'keeperDoor', st('red', 'blue', 'green')),
      task('lighthouse_pinks', 2, 'seaPinks', st('pink', 'white', 'yellow')),
      task('lighthouse_vane', 2, 'weathervane', st('ship', 'fish', 'gull')),
      task('lighthouse_cottage', 3, 'cottage', st('white', 'pink', 'yellow')),
      task('lighthouse_stripes', 3, 'lighthouseTower', st('red', 'blue', 'green')),
      task('lighthouse_lamp', 3, 'beacon', st('gold', 'white', 'rose')),
      task('lighthouse_bench', 3, 'pointBench', st('oak', 'blue', 'stone')),
    ],
    lines: { intro: LINES, done: LINES },
  },
  {
    id: 'bandstand', book: 2, chapter: 11, name: TEXT, cam: cam(9000, -60), keeper: null, reward: reward(),
    tasks: [
      task('bandstand_steps', 1, 'bandSteps', st('stone', 'white', 'brick')),
      task('bandstand_stands', 2, 'musicStands', st('brass', 'black', 'wood')),
      task('bandstand_rails', 2, 'bandRails', st('green', 'white', 'blue')),
      task('bandstand_bunting', 2, 'bandBunting', st('flags', 'pastel', 'gold')),
      task('bandstand_chairs', 3, 'foldingChairs', st('green', 'stripe', 'white')),
      task('bandstand_roof', 3, 'bandRoof', st('redwhite', 'mint', 'navy')),
      task('bandstand_lights', 3, 'bandLights', st('bulbs', 'stars', 'lanterns')),
      task('bandstand_flowers', 3, 'flowerRing', st('red', 'blue', 'mixed')),
    ],
    lines: { intro: LINES, done: LINES },
  },
  {
    id: 'ferryDock', book: 2, chapter: 12, name: TEXT, cam: cam(10000, -60), keeper: null, reward: reward(),
    tasks: [
      task('ferryDock_bell', 1, 'dockBell', st('brass', 'bronze', 'silver')),
      task('ferryDock_board', 2, 'timetable', st('chalk', 'enamel', 'wood')),
      task('ferryDock_benches', 2, 'dockBenches', st('oak', 'green', 'blue')),
      task('ferryDock_lamps', 3, 'dockLamps', st('iron', 'brass', 'white')),
      task('ferryDock_parcels', 3, 'parcels', st('brown', 'crates', 'hampers')),
      task('ferryDock_booth', 3, 'ticketBooth', st('red', 'blue', 'green')),
      task('ferryDock_gangway', 3, 'gangway', st('white', 'rope', 'wood')),
      task('ferryDock_ferry', 3, 'ferry', st('red', 'blue', 'green')),
    ],
    lines: { intro: LINES, done: LINES },
  },
  // Books 3–9: 38 more areas, one per chapter 13–50, 20 stars each (pacing in cafeDataBooks.js).
].map(cafeText).concat(MORE_AREAS);

export const CAFE_AREA_BY_ID = Object.fromEntries(CAFE_AREAS.map((a) => [a.id, a]));

/** Every task across all areas, by id, with its area id: { [taskId]: { task, areaId, areaIndex } }. */
export const CAFE_TASK_BY_ID = Object.fromEntries(CAFE_AREAS.flatMap((a, i) => a.tasks.map((t) => [t.id, { task: t, areaId: a.id, areaIndex: i }])));

// Pip's café lines. Picked by a counter (e.g. tasks built so far), never at random.
export const CAFE_LINES = withText({
  cafe: LINES, // home / café screen, stars waiting to be spent
  rest: LINES, // home / café screen, nothing affordable right now
  task: LINES, // right after a task is built
  restyle: LINES, // right after a restyle
}, 'cafe.line');

/** A fresh save.cafe (also what migrateV3 writes for existing players). */
export function defaultCafe() {
  return { v: CAFE_VERSION, done: {}, celebrated: [], cam: CAFE_AREAS[0].id, intro: false };
}
