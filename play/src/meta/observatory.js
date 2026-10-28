// Observatory (light area meta, docs/RETENTION_RESEARCH.md §5 idea 5). Each Journey chapter (10 levels)
// has one real constellation. The Journey stars the player has already earned in that chapter light its
// stars; a new constellation starts with 1 star lit, and a finished one shows its shape, its name and one
// short, true astronomy fact.
//
// Pure progress shown from save.journey.stars: nothing to buy, no new currency, no save fields, no rule
// change. Mirrored by unity/.../Scripts/Meta/Observatory.cs; the constellation data must stay identical
// (tests/observatory.test.mjs reads the C# file, and fixtures/observatory.json checks the C# logic).
// v3: the Journey has 1,000 levels in 20-level chapters (chapters.js), but the sky keeps its own fixed
// grouping: 15 constellations over the original levels 1-150, 10 levels each (unchanged save meaning).
const CHAPTER_LEVELS = 10;
const LEVEL_COUNT = 150;

/** Journey stars a chapter needs to finish its constellation (2 per level on average, out of 30). */
export const STARS_TO_FINISH = 20;
/** Chapters in the Journey (one constellation each). */
export const CHAPTER_COUNT = Math.ceil(LEVEL_COUNT / CHAPTER_LEVELS);

// Star positions are simplified from the real sky into a 100 x 100 box (x right, y down; north up, east
// left, as seen looking up). b = brightness 1 (faint) .. 3 (bright), used only for the drawn size.
// Star order is the order they light up. lines = pairs of star indices.
const S = (name, x, y, b) => ({ name, x, y, b });

export const CONSTELLATIONS = [
  {
    id: 'cassiopeia', name: 'Cassiopeia', nick: 'The Queen',
    fact: 'From much of the northern half of the world, Cassiopeia never sets. Its W shape circles the North Star all night.',
    stars: [S('Schedar', 70, 64, 3), S('Caph', 90, 38, 3), S('Navi', 52, 40, 3), S('Ruchbah', 32, 58, 2), S('Segin', 12, 30, 2)],
    lines: [[1, 0], [0, 2], [2, 3], [3, 4]],
  },
  {
    id: 'orion', name: 'Orion', nick: 'The Hunter',
    fact: 'Betelgeuse, the red star at Orion\'s shoulder, is so huge that in the Sun\'s place it would reach past the orbit of Mars.',
    stars: [
      S('Alnilam', 50, 50, 3), S('Alnitak', 41, 53, 3), S('Mintaka', 59, 47, 2), S('Betelgeuse', 28, 20, 3),
      S('Bellatrix', 70, 25, 2), S('Rigel', 74, 82, 3), S('Saiph', 34, 86, 2), S('Meissa', 50, 8, 1),
    ],
    lines: [[1, 0], [0, 2], [3, 1], [4, 2], [1, 6], [2, 5], [7, 3], [7, 4]],
  },
  {
    id: 'ursa-major', name: 'Ursa Major', nick: 'The Great Bear',
    fact: 'The two stars at the end of the Big Dipper\'s bowl, Dubhe and Merak, point straight to Polaris, the North Star.',
    stars: [
      S('Dubhe', 80, 26, 3), S('Merak', 80, 54, 3), S('Phecda', 54, 56, 2), S('Megrez', 50, 32, 2),
      S('Alioth', 36, 26, 3), S('Mizar', 22, 22, 3), S('Alkaid', 8, 32, 3),
    ],
    lines: [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 5], [5, 6]],
  },
  {
    id: 'cygnus', name: 'Cygnus', nick: 'The Swan',
    fact: 'Albireo, the swan\'s head, looks like one star, but a small telescope shows two: one gold and one blue.',
    stars: [
      S('Deneb', 52, 10, 3), S('Sadr', 50, 38, 3), S('Fawaris', 22, 30, 2), S('Aljanah', 78, 48, 2),
      S('Eta Cygni', 48, 64, 1), S('Albireo', 46, 90, 2),
    ],
    lines: [[0, 1], [2, 1], [1, 3], [1, 4], [4, 5]],
  },
  {
    id: 'lyra', name: 'Lyra', nick: 'The Harp',
    fact: 'Vega, the brightest star in Lyra, was the first star after the Sun ever to be photographed, in 1850.',
    stars: [
      S('Vega', 40, 14, 3), S('Epsilon Lyrae', 60, 10, 1), S('Zeta Lyrae', 50, 36, 1), S('Sheliak', 44, 82, 2),
      S('Sulafat', 64, 86, 2), S('Delta Lyrae', 70, 42, 1),
    ],
    lines: [[0, 1], [0, 2], [1, 2], [2, 3], [3, 4], [4, 5], [5, 2]],
  },
  {
    id: 'leo', name: 'Leo', nick: 'The Lion',
    fact: 'Regulus, the lion\'s heart, spins so fast, about once every 16 hours, that it bulges out around its middle.',
    stars: [
      S('Regulus', 70, 66, 3), S('Eta Leonis', 68, 48, 1), S('Algieba', 62, 34, 3), S('Adhafera', 66, 20, 1),
      S('Ras Elased', 80, 16, 2), S('Zosma', 32, 34, 2), S('Chertan', 34, 58, 2), S('Denebola', 12, 50, 3),
    ],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [2, 5], [5, 7], [7, 6], [6, 0], [5, 6]],
  },
  {
    id: 'scorpius', name: 'Scorpius', nick: 'The Scorpion',
    fact: 'Antares, the scorpion\'s red heart, gets its name from "rival of Mars", because its red color looks like the planet\'s.',
    stars: [
      S('Antares', 66, 34, 3), S('Acrab', 84, 14, 2), S('Dschubba', 86, 28, 2), S('Fang', 84, 42, 1),
      S('Paikauhale', 60, 46, 1), S('Larawag', 54, 60, 2), S('Xamidimura', 50, 76, 1), S('Sargas', 36, 90, 3),
      S('Girtab', 20, 86, 2), S('Shaula', 14, 72, 3),
    ],
    lines: [[1, 2], [2, 3], [2, 0], [0, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9]],
  },
  {
    id: 'andromeda', name: 'Andromeda', nick: 'The Chained Princess',
    fact: 'Beside Andromeda lies the Andromeda Galaxy, 2.5 million light-years away: the farthest thing most people can see without a telescope.',
    stars: [
      S('Alpheratz', 88, 50, 3), S('Delta Andromedae', 70, 46, 2), S('Mirach', 50, 48, 3), S('Almach', 18, 40, 3),
      S('Mu Andromedae', 50, 30, 1), S('Nu Andromedae', 46, 16, 1),
    ],
    lines: [[0, 1], [1, 2], [2, 3], [2, 4], [4, 5]],
  },
  {
    id: 'perseus', name: 'Perseus', nick: 'The Hero',
    fact: 'Algol, the "Demon Star", dims for a few hours about every 3 days, when a fainter partner star passes in front of it.',
    stars: [
      S('Mirfak', 52, 36, 3), S('Algol', 72, 60, 3), S('Gamma Persei', 58, 18, 2), S('Eta Persei', 62, 6, 1),
      S('Delta Persei', 46, 52, 2), S('Epsilon Persei', 40, 68, 2), S('Zeta Persei', 30, 84, 2),
    ],
    lines: [[3, 2], [2, 0], [0, 4], [4, 5], [5, 6], [0, 1]],
  },
  {
    id: 'crux', name: 'Crux', nick: 'The Southern Cross',
    fact: 'Crux is the smallest of all 88 constellations, yet it is on the flags of Australia, New Zealand and Brazil.',
    stars: [S('Acrux', 54, 90, 3), S('Gacrux', 50, 10, 3), S('Mimosa', 20, 44, 3), S('Imai', 80, 38, 2), S('Ginan', 66, 62, 1)],
    lines: [[1, 0], [2, 3]],
  },
  // The Outer Reaches (levels 101–150)
  {
    id: 'delphinus', name: 'Delphinus', nick: 'The Dolphin',
    fact: 'Two of the Dolphin\'s stars, Sualocin and Rotanev, are a name spelled backwards: Nicolaus Venator, an astronomer\'s assistant.',
    stars: [
      S('Sualocin', 52, 15, 3), S('Rotanev', 60, 35, 3), S('Gamma Delphini', 26, 12, 2), S('Delta Delphini', 38, 28, 2),
      S('Aldulfin', 75, 84, 2),
    ],
    lines: [[0, 1], [1, 3], [3, 2], [2, 0], [1, 4]],
  },
  {
    id: 'gemini', name: 'Gemini', nick: 'The Twins',
    fact: 'Castor looks like one star, but it is really six stars, bound together in three pairs.',
    stars: [
      S('Castor', 20, 16, 3), S('Pollux', 10, 32, 3), S('Mebsuta', 69, 45, 2), S('Tejat', 90, 56, 2),
      S('Wasat', 34, 58, 2), S('Mekbuda', 50, 64, 1), S('Alhena', 75, 81, 3),
    ],
    lines: [[0, 1], [0, 2], [2, 3], [1, 4], [4, 5], [5, 6]],
  },
  {
    id: 'taurus', name: 'Taurus', nick: 'The Bull',
    fact: 'Aldebaran, the bull\'s glowing orange eye, is a giant star about 44 times wider than the Sun.',
    stars: [
      S('Aldebaran', 56, 64, 3), S('Elnath', 17, 25, 3), S('Tianguan', 9, 49, 2), S('Ain', 61, 56, 2),
      S('Hyadum I', 68, 67, 2), S('Lambda Tauri', 82, 77, 1), S('Alcyone', 92, 40, 2),
    ],
    lines: [[4, 3], [3, 1], [4, 0], [0, 2], [4, 5]],
  },
  {
    id: 'corona-borealis', name: 'Corona Borealis', nick: 'The Northern Crown',
    fact: 'T Coronae Borealis, a star in the Northern Crown, flares up as a bright nova about once every 80 years.',
    stars: [
      S('Alphecca', 71, 77, 3), S('Nusakan', 87, 53, 2), S('Theta Coronae', 75, 30, 1), S('Gamma Coronae', 54, 81, 1),
      S('Delta Coronae', 38, 83, 1), S('Epsilon Coronae', 21, 75, 1), S('Iota Coronae', 13, 45, 1),
    ],
    lines: [[2, 1], [1, 0], [0, 3], [3, 4], [4, 5], [5, 6]],
  },
  {
    id: 'sagittarius', name: 'Sagittarius', nick: 'The Archer',
    fact: 'The center of our Milky Way, home to a black hole 4 million times the Sun\'s mass, lies toward Sagittarius.',
    stars: [
      S('Kaus Australis', 66, 79, 3), S('Nunki', 25, 32, 3), S('Ascella', 16, 52, 2), S('Kaus Media', 70, 51, 2),
      S('Kaus Borealis', 61, 25, 2), S('Alnasl', 90, 55, 2), S('Phi Sagittarii', 38, 36, 1), S('Tau Sagittarii', 9, 39, 1),
    ],
    lines: [[5, 3], [3, 0], [5, 0], [3, 4], [4, 6], [3, 6], [6, 1], [1, 7], [7, 2], [2, 6], [0, 2]],
  },
];

const int = (v) => (Number.isFinite(Number(v)) ? Math.floor(Number(v)) : 0);
const clamp3 = (v) => Math.max(0, Math.min(3, int(v)));

/** 0-based chapter of a 1-based Journey level (not clamped to the constellation list). */
export function chapterOfLevel(level) { return Math.floor((Math.max(1, int(level)) - 1) / CHAPTER_LEVELS); }
/** First and last level of a chapter (1-based, the last one capped at LEVEL_COUNT). */
export function chapterLevels(ch) {
  const first = ch * CHAPTER_LEVELS + 1;
  return { first, last: Math.min(LEVEL_COUNT, first + CHAPTER_LEVELS - 1) };
}

/** Journey stars earned in a chapter (each level counts up to 3). */
export function chapterStars(stars, ch) {
  const map = stars || {};
  const { first, last } = chapterLevels(ch);
  let n = 0;
  for (let lv = first; lv <= last; lv++) n += clamp3(map[lv]);
  return n;
}

/** Lit stars of a constellation with `total` stars for `chStars` chapter stars: 1 to start, all at STARS_TO_FINISH. */
export function litCount(chStars, total) {
  if (total <= 1) return total;
  const s = Math.max(0, Math.min(STARS_TO_FINISH, int(chStars)));
  return Math.min(total, 1 + Math.floor((s * (total - 1)) / STARS_TO_FINISH));
}

/** Chapter stars needed for the next lit star (null once every star is lit). */
export function starsForNext(lit, total) {
  if (lit >= total || total <= 1) return null;
  return Math.ceil((lit * STARS_TO_FINISH) / (total - 1));
}

/** True when the player has reached chapter ch (its first level is open) or already has stars there. */
export function chapterReached(save, ch) {
  const j = (save && save.journey) || {};
  return int(j.level || 1) >= chapterLevels(ch).first || chapterStars(j.stars, ch) > 0;
}

/** One chapter's view: constellation, stars earned, lit stars, done or not, stars still needed for the next one. */
export function chapterView(save, ch) {
  const c = CONSTELLATIONS[ch];
  const j = (save && save.journey) || {};
  const stars = chapterStars(j.stars, ch);
  const total = c.stars.length;
  const lit = litCount(stars, total);
  const next = starsForNext(lit, total);
  return {
    index: ch, c, reached: chapterReached(save, ch), stars, lit, total, complete: lit >= total,
    toNext: next == null ? 0 : next - stars,
    levels: chapterLevels(ch),
  };
}

/** Every chapter's view, in order. */
export function observatoryState(save) {
  const out = [];
  for (let ch = 0; ch < CHAPTER_COUNT; ch++) out.push(chapterView(save, ch));
  return out;
}

/** How many constellations are finished (the menu tile shows "done/total"). */
export function completedCount(save) {
  return observatoryState(save).filter((v) => v.complete).length;
}

/**
 * The chapter whose constellation this Journey win just finished, or -1. Call AFTER the win was saved
 * (save.journey.stars[level] holds the new best); prevStars is the level's best before the win.
 */
export function newlyCompleted(save, level, prevStars) {
  const n = int(level);
  if (n < 1 || n > LEVEL_COUNT) return -1;
  const ch = chapterOfLevel(n);
  if (ch >= CHAPTER_COUNT) return -1;
  const j = (save && save.journey) || {};
  const now = chapterStars(j.stars, ch);
  const gained = Math.max(0, clamp3((j.stars || {})[n]) - clamp3(prevStars));
  const total = CONSTELLATIONS[ch].stars.length;
  return litCount(now, total) >= total && litCount(now - gained, total) < total ? ch : -1;
}

/** "Chapter 2 · Levels 11–20" */
export function chapterLabel(ch) {
  const { first, last } = chapterLevels(ch);
  return `Chapter ${ch + 1} · Levels ${first}–${last}`;
}

/** Plain progress line for a chapter view. */
export function progressLine(v) {
  if (!v.reached) return `Reach Level ${v.levels.first} to begin`;
  if (v.complete) return `All ${v.total} stars lit`;
  return `${v.lit} of ${v.total} stars lit · ${v.toNext} more Journey star${v.toNext === 1 ? '' : 's'} light${v.toNext === 1 ? 's' : ''} the next one`;
}
