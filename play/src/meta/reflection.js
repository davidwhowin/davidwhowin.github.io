// Fail reflection (Wave E, research feature C). Read-only: it looks at the final board and
// the goals, never at an RNG, and never changes anything. One short, kind, TRUE line plus one
// tip after a Journey fail or an Endless game over. Never "so close!" unless it is true.
// Pip's lines and tips are content text reflect.* (src/i18n/content/en.js, docs/LOCALISATION.md phase 3). tierCount
// uses the locale's tier plurals (tierNameN); English keeps pluralName.
import { tierName, tierNameN, pluralName, hasPackNames, tierGender } from '../game/tierNames.js'; // display names (skin-aware)
import { ct, ctp } from '../i18n/index.js';

const fmt = (n) => Math.floor(n || 0).toLocaleString('en-US');
const COLUMN_COUNT = 5; // reflect.col.0 .. reflect.col.4: 'left', 'second', 'middle', 'fourth', 'right'
const columnName = (i) => (i >= 0 && i < COLUMN_COUNT ? ct(`reflect.col.${i}`) : ct('reflect.col.other'));

/** "1 Planet", "2 Moons", "3 Dust" (Dust has no plural); a pack skin uses its own names ("2 Tuna nigiri"). */
export function tierCount(n, tier, skin) {
  if (!tierName(tier, skin)) return `${fmt(n)} ${n === 1 ? 'orb' : pluralName('orb')}`;
  return `${fmt(n)} ${tierNameN(tier, n, skin)}`; // the locale's plural (English: pluralName)
}

/** Plain read-only analysis of a board ({ cols, rows, cells }). */
export function analyseBoard(board) {
  const out = { heights: [], asteroids: 0, kinds: 0, filled: 0, total: 0 };
  if (!board || !Array.isArray(board.cells)) return out;
  const { cols, rows, cells } = board;
  out.total = cols * rows;
  const kinds = new Set();
  for (let c = 0; c < cols; c++) {
    let h = 0;
    for (let r = 0; r < rows; r++) {
      const x = cells[r * cols + c];
      if (!x) continue;
      h++;
      out.filled++;
      if (x.kind === 'asteroid') out.asteroids++;
      else if (x.tier) kinds.add(x.tier);
    }
    out.heights.push(h);
  }
  out.kinds = kinds.size;
  return out;
}

function goalShort(g, left) {
  switch (g.type) {
    case 'tier': return tierCount(left, g.tier);
    case 'asteroids': return ctp('reflect.goal.asteroids', left, { n: fmt(left) });
    case 'score': return ct('reflect.goal.score', { n: fmt(left) });
    case 'supernova': return tierCount(left, 10);
    case 'combo': return ct('reflect.goal.combo', { count: g.count });
    default: return '';
  }
}

const GOAL_TIPS = {
  get tier() { return ct('reflect.tip.tier'); },
  get asteroids() { return ct('reflect.tip.asteroids'); },
  get score() { return ct('reflect.tip.score'); },
  get combo() { return ct('reflect.tip.combo'); },
  get supernova() { // names follow the orb skin (display only)
    return hasPackNames() ? ct('reflect.tip.supernovaPack', { big: tierNameN(10, 2), from: tierNameN(9, 2), gender: tierGender(9) })
      : ct('reflect.tip.supernova');
  },
};

/** The board's own story: { line, tip } or null when nothing stands out. */
function boardStory(a, reason) {
  const h = a.heights;
  if (h.length >= 3) {
    const sorted = h.slice().sort((x, y) => y - x);
    const top = sorted[0];
    const col = h.indexOf(top);
    if (top > 0 && top - sorted[1] >= 2) {
      return { line: ct('reflect.line.column', { col: columnName(col) }), tip: ct('reflect.tip.spread') };
    }
    const left = h[0] + h[1], right = h[h.length - 1] + h[h.length - 2];
    if (Math.abs(left - right) >= 4) {
      return { line: ct(left > right ? 'reflect.line.sideLeft' : 'reflect.line.sideRight'), tip: ct('reflect.tip.spread') };
    }
  }
  if (a.asteroids >= 2) {
    return { line: ct('reflect.line.asteroids', { n: fmt(a.asteroids) }), tip: GOAL_TIPS.asteroids };
  }
  if (a.kinds >= 5) {
    return { line: ct('reflect.line.kinds', { n: fmt(a.kinds) }), tip: ct('reflect.tip.kinds') };
  }
  if (reason === 'tide') {
    return { line: ct('reflect.line.tide'), tip: ct('reflect.tip.tide') };
  }
  return null;
}

/**
 * res: { mode: 'journey'|'endless', reason, board, goals?, prog?, forfeit? }
 * Returns { line, tip } or null (forfeits and empty input get no reflection).
 */
export function failReflection(res) {
  if (!res || res.forfeit || res.won) return null;
  const a = analyseBoard(res.board);
  const story = boardStory(a, res.reason);
  if (res.mode === 'journey' && Array.isArray(res.goals) && Array.isArray(res.prog)) {
    const unmet = [];
    res.goals.forEach((g, i) => {
      const left = g.count - (res.prog[i] || 0);
      if (left > 0) unmet.push({ g, left });
    });
    if (unmet.length) {
      const parts = unmet.map((u) => goalShort(u.g, u.left)).filter(Boolean);
      let line;
      if (unmet.length === 1 && unmet[0].g.type === 'combo') line = ct('reflect.line.lastGoal', { goal: `${parts[0][0].toUpperCase()}${parts[0].slice(1)}` });
      else if (unmet.length === 1) line = ct('reflect.line.short', { goal: parts[0] });
      else line = ct('reflect.line.stillToGo', { goals: parts.join(ct('reflect.and')) });
      // the board explains a full/tide loss best; running out of drops is about the goal
      const tip = res.reason !== 'drops' && story ? story.tip : GOAL_TIPS[unmet[0].g.type] || GOAL_TIPS.tier;
      return { line, tip };
    }
  }
  if (story) return story;
  if (a.filled >= a.total && a.total > 0) {
    return { line: ct('reflect.line.full'), tip: ct('reflect.tip.next') };
  }
  return { line: ct('reflect.line.top'), tip: ct('reflect.tip.next') };
}
