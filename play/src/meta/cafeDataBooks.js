// Café restoration data, Books 3–9 (chapters 13–50): the village, the river, the cliffs, the seafront,
// the hills, the island and the road home. Pure data, no DOM, no RNG. Spread into CAFE_AREAS / CAFE_BOOKS
// by cafeData.js (this file must not import it). Same shapes and rules as Books 1–2.
//
// Pacing (one area per 20-level chapter, the same rhythm as Books 1–2):
//   every Journey level cleared for the first time earns 1 café star, so chapter c (levels 20c−19 … 20c)
//   earns 20 stars. Books 1–2 cost 219 stars over 12 areas (18–20 each); every area here costs exactly 20
//   (8 tasks, 1–3 stars each). Total 219 + 38 × 20 = 979 stars, so a player who clears every level keeps a
//   steady 21-star cushion: area n (n ≥ 12, 1-based) can be finished at level 20n − 21, the last one at
//   level 979 of 1,000. Nobody runs out of things to restore before the Journey ends.
//
// Art: src/game/cafeArtBooks.js paints every prop named here (prop ids are unique across all areas).

import { withText, ct, TEXT, LINES } from '../i18n/index.js';

const cam = (x, y = -60, zoom = 1) => ({ x, y, zoom });
const reward = () => ({ coins: 300 }); // AREA_REWARD_COINS (kept literal: no import of cafeData.js)
/** task(areaId, key, cost, prop, 'styleA|styleB|styleC') (style ids; the names are content text) */
const task = (areaId, key, cost, prop, styles) => ({
  id: `${areaId}_${key}`, name: TEXT, cost, prop, styles: styles.split('|').map((id) => ({ id, name: TEXT })),
});
/** Area index i (0-based in CAFE_AREAS) sits at world x (i − 1) × 1000 (the rooftop is the only area off the line). */
const at = (i) => (i - 1) * 1000;
function area(i, id, book, tasks, camY = -60) {
  return cafeText({ id, book, chapter: i + 1, name: TEXT, cam: cam(at(i), camY), keeper: null, reward: reward(), tasks: tasks.map((t) => task(id, ...t)).sort((a, b) => a.cost - b.cost), lines: { intro: LINES, done: LINES, meet: { a: TEXT, b: TEXT } } });
}

/**
 * Turns a café area's TEXT / LINES placeholders into content getters (docs/LOCALISATION.md, phase 4b): the area name
 * reads chapter.<areaId>.name (the same words as the chapter), Pip's lines cafe.area.<areaId>.lines.intro / .done, a
 * task cafe.task.<taskId>.name and a style cafe.task.<taskId>.style.<styleId>.name. Used by cafeData.js for Books 1–2.
 */
export function cafeText(a) {
  for (const t of a.tasks) {
    for (const s of t.styles) withText(s, `cafe.task.${t.id}.style.${s.id}`);
    withText(t, `cafe.task.${t.id}`);
  }
  Object.defineProperty(a, 'name', { get: () => ct(`chapter.${a.id}.name`), enumerable: true });
  withText(a.lines, `cafe.area.${a.id}.lines`);
  return a;
}

export const MORE_BOOKS = [
  { book: 3, name: TEXT },
  { book: 4, name: TEXT },
  { book: 5, name: TEXT },
  { book: 6, name: TEXT },
  { book: 7, name: TEXT },
  { book: 8, name: TEXT },
  { book: 9, name: TEXT },
].map((b) => withText(b, `cafe.book.${b.book}`));

export const MORE_AREAS = [
  // ------------------------------------------------------------------ Book 3 "The Village"
  area(12, 'bakery', 3, [
    ['door', 1, 'bakeryDoor', 'duck-egg-blue|cherry-red|sage-green'],
    ['sign', 2, 'bakerySign', 'gold-leaf|cream-and-cocoa|chalkboard'],
    ['awning', 2, 'bakeryAwning', 'raspberry-stripe|butter-stripe|mint-stripe'],
    ['window', 3, 'bakeryWindow', 'cottage-loaves|iced-buns|plaited-bread'],
    ['bench', 3, 'bakeryBench', 'oak-bench|painted-pine|wrought-iron'],
    ['boxes', 3, 'bakeryBoxes', 'red-geraniums|lavender|pink-petunias'],
    ['bike', 3, 'bakeryBike', 'butter-yellow|post-box-red|duck-egg-blue'],
    ['lamps', 3, 'bakeryLamps', 'lantern|brass-carriage|globe'],
  ]),
  area(13, 'bookshop', 3, [
    ['sign', 1, 'bookSign', 'forest-green|navy-and-gold|plum'],
    ['door', 2, 'bookDoor', 'bottle-green|oxblood|ink-blue'],
    ['window', 2, 'bookWindow', 'old-favourites|seaside-stories|poetry-corner'],
    ['trolley', 3, 'bookTrolley', 'oak-trolley|painted-cart|wicker-baskets'],
    ['chairs', 3, 'bookChairs', 'rattan|deckchair-stripe|cushioned-bench'],
    ['lights', 3, 'bookLights', 'paper-lanterns|warm-bulbs|little-stars'],
    ['planters', 3, 'bookPlanters', 'terracotta|blue-glaze|old-tin-cans'],
    ['cat', 3, 'bookCat', 'wicker-basket|patchwork-cushion|apple-crate'],
  ]),
  area(14, 'villageGreen', 3, [
    ['bench', 1, 'greenBench', 'weathered-oak|sage-green|cream'],
    ['fence', 2, 'greenFence', 'white-pickets|pale-blue|natural-wood'],
    ['beds', 2, 'greenBeds', 'cottage-pinks|sweet-peas|marigolds'],
    ['well', 3, 'greenWell', 'flint-and-thatch|brick-and-tile|painted-wood'],
    ['maypole', 3, 'greenMaypole', 'rainbow-ribbons|pastel-ribbons|red-and-white'],
    ['bunting', 3, 'greenBunting', 'summer-fete|sugared-almond|blue-and-white'],
    ['tree', 3, 'greenTree', 'summer-green|autumn-gold|spring-blossom'],
    ['picnic', 3, 'greenPicnic', 'red-gingham|blue-check|patchwork'],
  ]),
  area(15, 'chapel', 3, [
    ['gate', 1, 'chapelGate', 'oak-and-slate|painted-white|green-oak'],
    ['bench', 2, 'chapelBench', 'teak|stone|painted-blue'],
    ['bell', 2, 'chapelBell', 'bronze|silver|gold'],
    ['window', 3, 'chapelWindow', 'sea-glass|rose-glass|sunrise-glass'],
    ['door', 3, 'chapelDoor', 'studded-oak|duck-egg-blue|deep-red'],
    ['roses', 3, 'chapelRoses', 'blush-pink|cream|crimson'],
    ['lanterns', 3, 'chapelLanterns', 'iron-lanterns|jam-jar-candles|brass-lamps'],
    ['tree', 3, 'chapelTree', 'dark-yew|silver-birch|cherry-blossom'],
  ], -90),
  area(16, 'market', 3, [
    ['clock', 2, 'marketClock', 'green-and-gold|black-and-gold|cream'],
    ['fruit', 2, 'marketFruit', 'red-stripe|green-stripe|yellow-stripe'],
    ['cheese', 2, 'marketCheese', 'blue-stripe|pink-stripe|orange-stripe'],
    ['flowers', 2, 'marketFlowers', 'sunflowers|tulips|sweet-williams'],
    ['crates', 3, 'marketCrates', 'carrots|cabbages|squash'],
    ['bunting', 3, 'marketBunting', 'bright-flags|pastel-flags|union-of-stripes'],
    ['fountain', 3, 'marketFountain', 'pale-stone|painted-iron|mosaic-bowl'],
    ['lights', 3, 'marketLights', 'festoon-bulbs|lanterns|little-globes'],
  ]),
  area(17, 'postOffice', 3, [
    ['box', 1, 'postBox', 'pillar-box-red|royal-blue|heritage-green'],
    ['sign', 2, 'postSign', 'red-and-gold|cream-and-black|blue-and-white'],
    ['door', 2, 'postDoor', 'glossy-red|bottle-green|navy'],
    ['bike', 3, 'postBike', 'post-box-red|racing-green|sky-blue'],
    ['parcels', 3, 'postParcels', 'brown-paper|striped-boxes|hampers'],
    ['phone', 3, 'postPhone', 'red|cream|green'],
    ['board', 3, 'postBoard', 'oak-frame|green-frame|painted-blue'],
    ['baskets', 3, 'postBaskets', 'fuchsia|trailing-lobelia|sunny-mix'],
  ]),
  // ------------------------------------------------------------------ Book 4 "The Riverside"
  area(18, 'orchard', 4, [
    ['gate', 1, 'orchardGate', 'silver-oak|painted-white|green'],
    ['crates', 2, 'orchardCrates', 'red-apples|green-apples|golden-pears'],
    ['scarecrow', 2, 'orchardScarecrow', 'straw-hat|tweed-cap|flowery-bonnet'],
    ['apples', 3, 'orchardApples', 'red-apples|blossom|golden-apples'],
    ['plums', 3, 'orchardPlums', 'purple-plums|blossom|cherries'],
    ['press', 3, 'orchardPress', 'oak-press|painted-red|green-iron'],
    ['hives', 3, 'orchardHives', 'white-hives|pastel-hives|straw-skeps'],
    ['table', 3, 'orchardTable', 'scrubbed-pine|painted-blue|old-barn-door'],
  ]),
  area(19, 'mill', 4, [
    ['door', 1, 'millDoor', 'weathered-oak|barn-red|sage'],
    ['sacks', 2, 'millSacks', 'plain-sacking|striped-sacks|stamped-sacks'],
    ['cart', 2, 'millCart', 'natural-wood|painted-blue|painted-red'],
    ['wheel', 3, 'millWheel', 'oak-paddles|iron-rim|painted-green'],
    ['sign', 3, 'millSign', 'cream-board|carved-wood|blue-enamel'],
    ['bench', 3, 'millBench', 'oak|green-iron|white'],
    ['lamps', 3, 'millLamps', 'lantern|brass-carriage|globe'],
    ['beds', 3, 'millBeds', 'foxgloves|hollyhocks|lupins'],
  ]),
  area(20, 'bridge', 4, [
    ['post', 1, 'bridgePost', 'white-arms|green-arms|natural-oak'],
    ['reeds', 2, 'bridgeReeds', 'yellow-iris|blue-iris|bulrushes'],
    ['lamps', 2, 'bridgeLamps', 'lantern|brass-carriage|globe'],
    ['arch', 3, 'bridgeArch', 'honey-stone|grey-granite|red-brick'],
    ['willow', 3, 'bridgeWillow', 'summer-willow|golden-willow|silver-willow'],
    ['bench', 3, 'bridgeBench', 'oak|green-iron|white'],
    ['boat', 3, 'bridgeBoat', 'blue-and-white|red-and-cream|green-and-gold'],
    ['flowers', 3, 'bridgeFlowers', 'cornflowers|poppies|ox-eye-daisies'],
  ]),
  area(21, 'pond', 4, [
    ['lilies', 1, 'pondLilies', 'white-lilies|pink-lilies|yellow-lilies'],
    ['house', 2, 'pondHouse', 'red-roof|blue-roof|thatched-roof'],
    ['jetty', 2, 'pondJetty', 'oak-boards|silvered-wood|painted-white'],
    ['boat', 3, 'pondBoat', 'blue-and-white|red-and-cream|green-and-gold'],
    ['bench', 3, 'pondBench', 'oak|green-iron|white'],
    ['trees', 3, 'pondTrees', 'silver-birch|copper-beech|rowan'],
    ['kiosk', 3, 'pondKiosk', 'striped-hut|painted-shed|little-cabin'],
    ['lamps', 3, 'pondLamps', 'lantern|brass-carriage|globe'],
  ]),
  area(22, 'schoolhouse', 4, [
    ['bell', 1, 'schoolBell', 'bronze|silver|gold'],
    ['sign', 2, 'schoolSign', 'cream-and-green|blue-and-white|red-and-gold'],
    ['door', 2, 'schoolDoor', 'bottle-green|primrose|pillar-box-red'],
    ['swing', 3, 'schoolSwing', 'red-frame|blue-frame|wooden-frame'],
    ['hopscotch', 3, 'schoolHopscotch', 'rainbow-chalk|pastel-chalk|white-chalk'],
    ['garden', 3, 'schoolGarden', 'sunflowers|runner-beans|pumpkins'],
    ['bench', 3, 'schoolBench', 'oak|green|sky-blue'],
    ['board', 3, 'schoolBoard', 'classic-slate|green-board|painted-frame'],
  ]),
  area(23, 'tearoom', 4, [
    ['sign', 1, 'teaSign', 'rose-teapot|blue-willow|gold-teapot'],
    ['door', 2, 'teaDoor', 'rose-pink|duck-egg-blue|primrose'],
    ['awning', 2, 'teaAwning', 'pink-stripe|blue-stripe|lilac-stripe'],
    ['window', 3, 'teaWindow', 'victoria-sponges|scones-and-jam|lemon-drizzle'],
    ['tables', 3, 'teaTables', 'wrought-iron|painted-pine|mosaic'],
    ['trolley', 3, 'teaTrolley', 'silver-trolley|painted-wood|gold-trim'],
    ['roses', 3, 'teaRoses', 'blush-pink|cream|crimson'],
    ['bunting', 3, 'teaBunting', 'floral-prints|polka-dots|lace-doilies'],
  ]),
  // ------------------------------------------------------------------ Book 5 "The Cliffs"
  area(24, 'clifftop', 5, [
    ['stile', 1, 'cliffStile', 'natural-oak|painted-white|green'],
    ['post', 2, 'cliffPost', 'oak-post|white-arms|acorn-sign'],
    ['bench', 2, 'cliffBench', 'weathered-oak|sea-blue|white'],
    ['scope', 3, 'cliffScope', 'brass|sea-green|signal-red'],
    ['shelter', 3, 'cliffShelter', 'slate-roof|green-roof|thatched'],
    ['tree', 3, 'cliffTree', 'hawthorn|rowan-berries|blossom'],
    ['thrift', 3, 'cliffThrift', 'sea-pinks|purple-heather|yellow-gorse'],
    ['kite', 3, 'cliffKite', 'rainbow-diamond|red-box-kite|blue-bird'],
  ], -110),
  area(25, 'cove', 5, [
    ['shells', 1, 'coveShells', 'cockles|scallops|mussels'],
    ['boat', 2, 'coveBoat', 'blue-and-white|red-and-cream|green-and-gold'],
    ['chairs', 2, 'coveChairs', 'red-stripe|blue-stripe|rainbow'],
    ['hut', 3, 'coveHut', 'sky-blue|sunny-yellow|seafoam'],
    ['windbreak', 3, 'coveWindbreak', 'candy-stripe|ocean-stripe|lemon-stripe'],
    ['fire', 3, 'coveFire', 'ring-of-stones|iron-bowl|shell-circle'],
    ['flags', 3, 'coveFlags', 'bright-flags|sailcloth|nautical'],
    ['lanterns', 3, 'coveLanterns', 'jam-jars|ship-lanterns|paper-moons'],
  ]),
  area(26, 'rockPools', 5, [
    ['sign', 1, 'poolsSign', 'driftwood|sea-blue|coral'],
    ['nets', 2, 'poolsNets', 'bright-buckets|pastel-buckets|tin-buckets'],
    ['pool', 2, 'poolsPool', 'starfish|anemones|little-crabs'],
    ['pool2', 3, 'poolsPool2', 'shrimp|sea-snails|pink-weed'],
    ['hut', 3, 'poolsHut', 'coral-pink|sea-green|sunshine'],
    ['steps', 3, 'poolsSteps', 'driftwood|painted-blue|rope-rails'],
    ['ring', 3, 'poolsRing', 'red-and-white|orange|blue-and-white'],
    ['plants', 3, 'poolsPlants', 'sea-kale|thrift|samphire'],
  ]),
  area(27, 'boatyard', 5, [
    ['sign', 1, 'yardSign', 'white-on-blue|gold-on-green|red-on-cream'],
    ['winch', 2, 'yardWinch', 'green-iron|red-iron|black-and-brass'],
    ['tins', 2, 'yardTins', 'harbour-blues|sunset-reds|meadow-greens'],
    ['boat', 3, 'yardBoat', 'blue-hull|red-hull|green-hull'],
    ['doors', 3, 'yardDoors', 'tarred-black|sea-blue|barn-red'],
    ['dinghy', 3, 'yardDinghy', 'primrose|sky-blue|coral'],
    ['lamps', 3, 'yardLamps', 'lantern|brass-carriage|globe'],
    ['flags', 3, 'yardFlags', 'signal-flags|pennants|bunting'],
  ]),
  area(28, 'fishmonger', 5, [
    ['sign', 1, 'fishSign', 'blue-and-white|navy-and-gold|sea-green'],
    ['awning', 2, 'fishAwning', 'blue-stripe|green-stripe|red-stripe'],
    ['stall', 2, 'fishStall', 'on-crushed-ice|on-slate|in-baskets'],
    ['pots', 3, 'fishPots', 'withy-pots|blue-nets|red-nets'],
    ['crates', 3, 'fishCrates', 'blue-boxes|wooden-boxes|red-boxes'],
    ['board', 3, 'fishBoard', 'slate|blackboard|painted-driftwood'],
    ['buoys', 3, 'fishBuoys', 'bright-buoys|glass-floats|striped-buoys'],
    ['lamps', 3, 'fishLamps', 'ship-lamps|brass-carriage|globe'],
  ]),
  area(29, 'icecream', 5, [
    ['cone', 1, 'iceCone', 'strawberry|mint-choc|vanilla'],
    ['parasols', 2, 'iceParasols', 'candy-stripe|pastel-stripe|sunny-stripe'],
    ['tables', 2, 'iceTables', 'wrought-iron|painted-pine|mosaic'],
    ['hut', 3, 'iceHut', 'strawberry-pink|mint-green|lemon'],
    ['cart', 3, 'iceCart', 'pink-and-white|blue-and-white|yellow-and-white'],
    ['bunting', 3, 'iceBunting', 'sweetie-colours|pastels|red-and-white'],
    ['menu', 3, 'iceMenu', 'pink-board|blackboard|driftwood'],
    ['planters', 3, 'icePlanters', 'petunias|marigolds|lavender'],
  ]),
  // ------------------------------------------------------------------ Book 6 "The Seafront"
  area(30, 'promenade', 6, [
    ['railings', 1, 'promRailings', 'seafront-blue|mint-green|white'],
    ['lamps', 2, 'promLamps', 'lantern|brass-carriage|globe'],
    ['benches', 2, 'promBenches', 'oak|green-iron|sky-blue'],
    ['shelter', 3, 'promShelter', 'cream-and-green|white-and-blue|pink-and-cream'],
    ['chairs', 3, 'promChairs', 'red-stripe|blue-stripe|rainbow'],
    ['clock', 3, 'promClock', 'spring-bulbs|summer-bedding|autumn-mums'],
    ['kiosk', 3, 'promKiosk', 'striped-kiosk|green-kiosk|blue-kiosk'],
    ['lights', 3, 'promLights', 'festoon-bulbs|lanterns|little-globes'],
  ]),
  area(31, 'pavilion', 6, [
    ['flag', 1, 'pavFlag', 'club-colours|sky-blue|sunshine'],
    ['clock', 2, 'pavClock', 'white-face|black-and-gold|green-and-cream'],
    ['bench', 2, 'pavBench', 'white|green|natural-oak'],
    ['tables', 3, 'pavTables', 'wrought-iron|painted-pine|mosaic'],
    ['score', 3, 'pavScore', 'black-board|green-board|white-board'],
    ['roller', 3, 'pavRoller', 'green-iron|red-iron|blue-iron'],
    ['baskets', 3, 'pavBaskets', 'fuchsia|trailing-lobelia|sunny-mix'],
    ['bunting', 3, 'pavBunting', 'club-colours|pastels|union-of-stripes'],
  ]),
  area(32, 'carousel', 6, [
    ['ticket', 1, 'carTicket', 'red-and-gold|blue-and-gold|green-and-gold'],
    ['lights', 2, 'carLights', 'warm-bulbs|coloured-bulbs|little-stars'],
    ['organ', 2, 'carOrgan', 'red-and-gold|green-and-gold|blue-and-gold'],
    ['canopy', 3, 'carCanopy', 'red-and-cream|blue-and-cream|pink-and-cream'],
    ['horses', 3, 'carHorses', 'classic-greys|pastel-ponies|golden-manes'],
    ['rail', 3, 'carRail', 'gold|white|red'],
    ['balloons', 3, 'carBalloons', 'rainbow|pastels|hearts'],
    ['bench', 3, 'carBench', 'oak|green-iron|sky-blue'],
  ]),
  area(33, 'arcade', 6, [
    ['doors', 1, 'arcDoors', 'red-and-gold|blue-and-silver|green-and-gold'],
    ['sign', 2, 'arcSign', 'warm-bulbs|rainbow-bulbs|gold-bulbs'],
    ['lights', 2, 'arcLights', 'festoon-bulbs|little-stars|coloured-globes'],
    ['photo', 3, 'arcPhoto', 'red-curtain|blue-curtain|velvet-green'],
    ['crane', 3, 'arcCrane', 'teddies|ducks|bunnies'],
    ['ride', 3, 'arcRide', 'pink-teacup|blue-teacup|gold-teacup'],
    ['candy', 3, 'arcCandy', 'pink-candyfloss|blue-candyfloss|rainbow-swirl'],
    ['planters', 3, 'arcPlanters', 'petunias|marigolds|lavender'],
  ]),
  area(34, 'harbourInn', 6, [
    ['sign', 1, 'innSign', 'the-anchor|the-mermaid|the-lantern'],
    ['door', 2, 'innDoor', 'deep-green|oxblood|navy'],
    ['baskets', 2, 'innBaskets', 'fuchsia|trailing-lobelia|sunny-mix'],
    ['tables', 3, 'innTables', 'natural-oak|painted-blue|painted-green'],
    ['barrels', 3, 'innBarrels', 'oak-barrels|painted-barrels|barrel-planters'],
    ['lights', 3, 'innLights', 'festoon-bulbs|lanterns|little-globes'],
    ['board', 3, 'innBoard', 'blackboard|slate|driftwood'],
    ['lamps', 3, 'innLamps', 'ship-lamps|brass-carriage|globe'],
  ]),
  area(35, 'quay', 6, [
    ['bollards', 1, 'quayBollards', 'black-and-white|harbour-blue|red'],
    ['pots', 2, 'quayPots', 'withy-pots|blue-nets|red-nets'],
    ['nets', 2, 'quayNets', 'green-nets|blue-nets|orange-nets'],
    ['crane', 3, 'quayCrane', 'harbour-green|signal-red|navy'],
    ['boat', 3, 'quayBoat', 'blue-hull|red-hull|green-hull'],
    ['lamps', 3, 'quayLamps', 'ship-lamps|brass-carriage|globe'],
    ['benches', 3, 'quayBenches', 'oak|green-iron|sky-blue'],
    ['flags', 3, 'quayFlags', 'signal-flags|pennants|bunting'],
  ]),
  area(36, 'lifeboat', 6, [
    ['bell', 1, 'lifeBell', 'bronze|silver|gold'],
    ['board', 2, 'lifeBoard', 'blue-and-gold|red-and-gold|green-and-gold'],
    ['doors', 2, 'lifeDoors', 'lifeboat-blue|signal-red|white'],
    ['boat', 3, 'lifeBoat', 'blue-and-orange|red-and-white|green-and-cream'],
    ['flag', 3, 'lifeFlag', 'blue-ensign|red-ensign|house-flag'],
    ['rings', 3, 'lifeRings', 'red-and-white|orange|blue-and-white'],
    ['lamps', 3, 'lifeLamps', 'ship-lamps|brass-carriage|globe'],
    ['bench', 3, 'lifeBench', 'oak|green-iron|sky-blue'],
  ]),
  // ------------------------------------------------------------------ Book 7 "The Hills"
  area(37, 'windmill', 7, [
    ['door', 1, 'windDoor', 'black-tar|sea-blue|barn-red'],
    ['cap', 2, 'windCap', 'white-cap|green-cap|copper-cap'],
    ['sacks', 2, 'windSacks', 'plain-sacking|striped-sacks|stamped-sacks'],
    ['sails', 3, 'windSails', 'white-canvas|red-canvas|cream-lattice'],
    ['fence', 3, 'windFence', 'natural-wood|white-rails|green-rails'],
    ['flowers', 3, 'windFlowers', 'poppies|cornflowers|ox-eye-daisies'],
    ['bench', 3, 'windBench', 'oak|green-iron|white'],
    ['cart', 3, 'windCart', 'natural-wood|painted-blue|painted-red'],
  ], -130),
  area(38, 'dairy', 7, [
    ['churns', 1, 'dairyChurns', 'polished-steel|painted-blue|painted-red'],
    ['gate', 2, 'dairyGate', 'silver-oak|painted-white|green'],
    ['doors', 2, 'dairyDoors', 'barn-red|sage-green|cream'],
    ['cow', 3, 'dairyCow', 'daisy-chain|cow-bell|flower-crown'],
    ['hay', 3, 'dairyHay', 'round-bales|square-bales|bales-and-bunting'],
    ['stand', 3, 'dairyStand', 'eggs-and-milk|honey-and-jam|flowers-and-eggs'],
    ['hens', 3, 'dairyHens', 'red-roof|blue-roof|green-roof'],
    ['vane', 3, 'dairyVane', 'cockerel|cow|running-hare'],
  ]),
  area(39, 'vineyard', 7, [
    ['sign', 1, 'vineSign', 'burgundy-and-gold|green-and-cream|rustic-wood'],
    ['barrels', 2, 'vineBarrels', 'oak-barrels|painted-barrels|barrel-planters'],
    ['cart', 2, 'vineCart', 'natural-wood|painted-blue|painted-red'],
    ['rows', 3, 'vineRows', 'red-grapes|green-grapes|autumn-leaves'],
    ['table', 3, 'vineTable', 'scrubbed-oak|white-linen|painted-blue'],
    ['lights', 3, 'vineLights', 'festoon-bulbs|lanterns|little-globes'],
    ['pergola', 3, 'vinePergola', 'oak-beams|white-beams|green-beams'],
    ['pots', 3, 'vinePots', 'lavender|rosemary|olive-trees'],
  ]),
  area(40, 'meadow', 7, [
    ['sign', 1, 'meadowSign', 'natural-oak|white-arms|green-arms'],
    ['hives', 2, 'meadowHives', 'white-hives|pastel-hives|straw-skeps'],
    ['picnic', 2, 'meadowPicnic', 'red-gingham|blue-check|patchwork'],
    ['flowers', 3, 'meadowFlowers', 'poppies-and-cornflowers|ox-eye-daisies|foxgloves'],
    ['bench', 3, 'meadowBench', 'weathered-oak|sage-green|cream'],
    ['boxes', 3, 'meadowBoxes', 'natural-wood|pastel-painted|little-cottages'],
    ['poppies', 3, 'meadowPoppies', 'red-poppies|welsh-poppies|white-poppies'],
    ['gate', 3, 'meadowGate', 'silver-oak|painted-white|green'],
  ]),
  area(41, 'woodland', 7, [
    ['sign', 1, 'woodSign', 'natural-oak|green-arms|painted-owl'],
    ['logs', 2, 'woodLogs', 'oak-logs|birch-logs|mossy-logs'],
    ['stools', 2, 'woodStools', 'red-spotted|brown-caps|pastel-caps'],
    ['bridge', 3, 'woodBridge', 'rustic-oak|green-rails|rope-rails'],
    ['bench', 3, 'woodBench', 'split-log|carved-oak|mossy-log'],
    ['lanterns', 3, 'woodLanterns', 'jam-jars|paper-lanterns|little-stars'],
    ['bluebells', 3, 'woodBluebells', 'bluebells|wild-garlic|primroses'],
    ['den', 3, 'woodDen', 'bark-roof|moss-roof|shingle-roof'],
  ]),
  area(42, 'observatoryHill', 7, [
    ['bench', 1, 'obsBench', 'oak|green-iron|midnight-blue'],
    ['lamps', 2, 'obsLamps', 'lantern|brass-carriage|globe'],
    ['sign', 2, 'obsSign', 'midnight-and-gold|cream-and-navy|copper'],
    ['dome', 3, 'obsDome', 'copper-green|silver|midnight-blue'],
    ['scope', 3, 'obsScope', 'brass|navy-and-brass|white'],
    ['chart', 3, 'obsChart', 'midnight|deep-purple|ocean-blue'],
    ['lights', 3, 'obsLights', 'little-stars|moons|warm-bulbs'],
    ['blankets', 3, 'obsBlankets', 'tartan|patchwork|starry-navy'],
  ], -150),
  // ------------------------------------------------------------------ Book 8 "The Island"
  area(43, 'island', 8, [
    ['sign', 1, 'isleSign', 'driftwood|sea-blue|coral'],
    ['kayaks', 2, 'isleKayaks', 'bright-kayaks|pastel-kayaks|wooden-canoes'],
    ['jetty', 2, 'isleJetty', 'oak-boards|silvered-wood|painted-white'],
    ['palms', 3, 'islePalms', 'cabbage-palms|tall-palms|palms-and-agave'],
    ['hammock', 3, 'isleHammock', 'rainbow-stripe|sea-blue|sunset'],
    ['shack', 3, 'isleShack', 'sea-blue|sunny-yellow|coral'],
    ['lanterns', 3, 'isleLanterns', 'jam-jars|ship-lanterns|paper-moons'],
    ['picnic', 3, 'islePicnic', 'red-gingham|blue-check|patchwork'],
  ]),
  area(44, 'ferry', 8, [
    ['bollards', 1, 'fryBollards', 'black-and-white|harbour-blue|red'],
    ['board', 2, 'fryBoard', 'blue-board|cream-board|green-board'],
    ['gangway', 2, 'fryGangway', 'white-rails|oak-rails|rope-rails'],
    ['shelter', 3, 'fryShelter', 'cream-and-green|white-and-blue|pink-and-cream'],
    ['boat', 3, 'fryBoat', 'red-funnel|blue-funnel|green-funnel'],
    ['lamps', 3, 'fryLamps', 'ship-lamps|brass-carriage|globe'],
    ['benches', 3, 'fryBenches', 'oak|green-iron|sky-blue'],
    ['flags', 3, 'fryFlags', 'signal-flags|pennants|bunting'],
  ]),
  area(45, 'islandCafe', 8, [
    ['sign', 1, 'icafeSign', 'sea-blue|coral|sunshine'],
    ['awning', 2, 'icafeAwning', 'blue-stripe|coral-stripe|lemon-stripe'],
    ['door', 2, 'icafeDoor', 'turquoise|coral|primrose'],
    ['tables', 3, 'icafeTables', 'wrought-iron|painted-pine|mosaic'],
    ['window', 3, 'icafeWindow', 'lemon-cakes|cream-teas|fruit-tarts'],
    ['lights', 3, 'icafeLights', 'festoon-bulbs|shell-lights|little-globes'],
    ['planters', 3, 'icafePlanters', 'geraniums|agapanthus|lavender'],
    ['board', 3, 'icafeBoard', 'blackboard|painted-driftwood|slate'],
  ]),
  area(46, 'festival', 8, [
    ['sign', 1, 'festSign', 'harvest-gold|apple-red|plum'],
    ['bunting', 2, 'festBunting', 'autumn-leaves|bright-flags|gingham'],
    ['hay', 2, 'festHay', 'round-bales|square-bales|bales-and-rugs'],
    ['wagon', 3, 'festWagon', 'pumpkins|apples-and-pears|sheaves-of-wheat'],
    ['tent', 3, 'festTent', 'red-and-white|green-and-cream|blue-and-white'],
    ['pumpkins', 3, 'festPumpkins', 'orange-pumpkins|pale-pumpkins|little-gourds'],
    ['lanterns', 3, 'festLanterns', 'paper-lanterns|pumpkin-lanterns|jam-jars'],
    ['table', 3, 'festTable', 'pies-and-bread|fruit-and-cheese|jams-and-cakes'],
  ]),
  // ------------------------------------------------------------------ Book 9 "Homeward"
  area(47, 'station', 9, [
    ['clock', 1, 'stnClock', 'white-face|black-and-gold|green-and-cream'],
    ['sign', 2, 'stnSign', 'cream-and-green|blue-and-white|red-and-cream'],
    ['trolley', 2, 'stnTrolley', 'leather-cases|hat-boxes|picnic-hampers'],
    ['canopy', 3, 'stnCanopy', 'cream-and-green|white-and-blue|red-and-cream'],
    ['engine', 3, 'stnEngine', 'engine-green|royal-blue|crimson'],
    ['benches', 3, 'stnBenches', 'oak|green-iron|sky-blue'],
    ['baskets', 3, 'stnBaskets', 'fuchsia|trailing-lobelia|sunny-mix'],
    ['lamps', 3, 'stnLamps', 'lantern|brass-carriage|globe'],
  ]),
  area(48, 'seaWall', 9, [
    ['rings', 1, 'wallRings', 'red-and-white|orange|blue-and-white'],
    ['railings', 2, 'wallRailings', 'seafront-blue|mint-green|white'],
    ['mural', 2, 'wallMural', 'waves-and-gulls|fish-and-shells|sunset'],
    ['chalets', 3, 'wallChalets', 'rainbow-row|pastel-row|blue-and-white'],
    ['lamps', 3, 'wallLamps', 'lantern|brass-carriage|globe'],
    ['benches', 3, 'wallBenches', 'oak|green-iron|sky-blue'],
    ['scope', 3, 'wallScope', 'brass|sea-green|signal-red'],
    ['flags', 3, 'wallFlags', 'signal-flags|pennants|bunting'],
  ]),
  area(49, 'homecoming', 9, [
    ['bunting', 1, 'homeBunting', 'every-colour|pastels|gold-and-white'],
    ['banner', 2, 'homeBanner', 'gold-letters|rainbow-letters|rose-letters'],
    ['lanterns', 2, 'homeLanterns', 'paper-lanterns|jam-jars|brass-lamps'],
    ['table', 3, 'homeTable', 'white-linen|gingham|floral'],
    ['lights', 3, 'homeLights', 'festoon-bulbs|little-stars|lanterns'],
    ['cake', 3, 'homeCake', 'victoria-sponge|chocolate|lemon-and-rose'],
    ['arch', 3, 'homeArch', 'roses|wildflowers|sunflowers'],
    ['fireworks', 3, 'homeFireworks', 'gold-stars|rainbow-bursts|silver-rain'],
  ]),
];
