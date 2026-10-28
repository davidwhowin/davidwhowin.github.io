// Perk definitions + pure helpers (no DOM). Icons are inline SVG strings for the UI.
import { withText, TEXT } from '../i18n/index.js';

const svg = (body) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

export const PERKS = [
  {
    id: 'hold', name: TEXT, unique: true, max: 1, color: '#7ad7ff',
    cozy: { name: TEXT, desc: TEXT },
    desc: TEXT,
    icon: svg('<rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="12" cy="12" r="4" fill="currentColor"/>'),
  },
  {
    id: 'comet', name: TEXT, unique: false, max: 9, color: '#ff8a5c',
    cozy: { name: TEXT, desc: TEXT },
    desc: TEXT,
    icon: svg('<circle cx="15" cy="9" r="4" fill="currentColor"/><path d="M12 12L4 20M10 9L5 14M15 14l-4 5"/>'),
  },
  {
    id: 'wild', name: TEXT, unique: false, max: 9, color: '#ff6ad5',
    cozy: { name: TEXT, desc: TEXT },
    desc: TEXT,
    icon: svg('<path d="M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z"/>'),
  },
  {
    id: 'comboEngine', name: TEXT, unique: false, max: 2, color: '#ffd54a',
    cozy: { name: TEXT, desc: TEXT },
    desc: TEXT,
    icon: svg('<circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M5 19l3-3M16 8l3-3"/>'),
  },
  {
    id: 'slowTide', name: TEXT, unique: false, max: 3, color: '#5ce1e6',
    cozy: { name: TEXT, desc: TEXT },
    desc: TEXT,
    icon: svg('<path d="M2 15c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0"/><path d="M2 20c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0"/><path d="M12 3v8M9 8l3 3 3-3"/>'),
  },
  {
    id: 'magnet', name: TEXT, unique: false, max: 5, color: '#ffe08a',
    cozy: { name: TEXT, desc: TEXT },
    desc: TEXT,
    icon: svg('<path d="M6 3v8a6 6 0 0012 0V3"/><path d="M6 7h4M14 7h4"/>'),
  },
  {
    id: 'biggerBang', name: TEXT, unique: true, max: 1, color: '#ff4fd8',
    cozy: { name: TEXT, desc: TEXT },
    desc: TEXT,
    icon: svg('<circle cx="12" cy="12" r="3" fill="currentColor"/><circle cx="12" cy="12" r="7" stroke-dasharray="2 3"/><circle cx="12" cy="12" r="10.5" stroke-dasharray="1 4"/>'),
  },
  {
    id: 'gentle', name: TEXT, unique: false, max: 2, color: '#9fe870',
    cozy: { name: TEXT, desc: TEXT },
    desc: TEXT,
    icon: svg('<path d="M12 21c-5-3-8-7-8-11a8 8 0 0116 0c0 4-3 8-8 11z"/><path d="M12 8v6M9 11h6"/>'),
  },
  {
    id: 'miner', name: TEXT, unique: true, max: 1, color: '#c0c6d6',
    cozy: { name: TEXT, desc: TEXT },
    desc: TEXT,
    icon: svg('<path d="M14 4l6 6M4 20l9-9M15 3l6 6-3 1-4-4z"/><path d="M5 13l-2 4 4-2"/>'),
  },
  {
    id: 'secondWind', name: TEXT, unique: true, max: 1, color: '#7cffb2',
    cozy: { name: TEXT, desc: TEXT },
    desc: TEXT,
    icon: svg('<path d="M12 21s-8-5-8-11a4.5 4.5 0 018-3 4.5 4.5 0 018 3c0 6-8 11-8 11z"/><path d="M9 11h6M12 8v6"/>'),
  },
  {
    id: 'golden', name: TEXT, unique: false, max: 3, color: '#ffc845',
    cozy: { name: TEXT, desc: TEXT },
    desc: TEXT,
    icon: svg('<circle cx="12" cy="12" r="8"/><path d="M12 7v10M9 9.5c0-1.2 1.3-2 3-2s3 .8 3 2-1.3 1.7-3 2.2-3 1-3 2.3 1.3 2 3 2 3-.8 3-2"/>'),
  },
  // ---- rule-bending perks (Fun Wave B)
  {
    id: 'bonds', name: TEXT, unique: true, max: 1, color: '#b69cff',
    cozy: { name: TEXT, desc: TEXT },
    desc: TEXT,
    icon: svg('<circle cx="5" cy="5" r="2.5" fill="currentColor"/><circle cx="19" cy="19" r="2.5" fill="currentColor"/><circle cx="19" cy="5" r="2.5" fill="currentColor"/><circle cx="5" cy="19" r="2.5" fill="currentColor"/><path d="M7 7l10 10M17 7L7 17"/>'),
  },
  {
    id: 'gravityWell', name: TEXT, unique: true, max: 1, color: '#6f8bff',
    cozy: { name: TEXT, desc: TEXT },
    desc: TEXT,
    icon: svg('<ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="5.5" ry="2"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><path d="M12 2v5M10 5l2 2 2-2"/>'),
  },
  {
    id: 'earlyNova', name: TEXT, unique: true, max: 1, color: '#4fc3ff',
    cozy: { name: TEXT, desc: TEXT },
    desc: TEXT,
    icon: svg('<circle cx="12" cy="12" r="4" fill="currentColor"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>'),
  },
  // ---- calm choice perks (v3, DESIGN.md "Warm Oven and Morning Tidy")
  {
    id: 'warmOven', name: TEXT, unique: true, max: 1, color: '#f4a259',
    cozy: { name: TEXT, desc: TEXT },
    desc: TEXT,
    icon: svg('<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M3 11h18"/><rect x="7" y="14" width="10" height="4" rx="1"/><path d="M8 2.5c-.8 1 .8 1.5 0 2.5M12 2.5c-.8 1 .8 1.5 0 2.5M16 2.5c-.8 1 .8 1.5 0 2.5"/>'),
  },
  {
    id: 'morningTidy', name: TEXT, unique: true, max: 1, color: '#8fd3c1',
    cozy: { name: TEXT, desc: TEXT },
    desc: TEXT,
    icon: svg('<path d="M20 3l-7.5 8.5"/><path d="M10 9.5l4.5 4-2.5 7c-3.5-.5-7-3-9-6.5z"/><path d="M6.5 15.5l3 2.5M9 12.5l3.5 3"/>'),
  },
  // ---- Constellations: evolutions, offered only once both parts are owned (parts are kept)
  {
    id: 'meteorShower', name: TEXT, unique: true, max: 1, color: '#ff9f43',
    cozy: { name: TEXT, desc: TEXT },
    evolution: true, requires: ['comet', 'biggerBang'],
    desc: TEXT,
    icon: svg('<circle cx="16" cy="8" r="3.5" fill="currentColor"/><path d="M13 11l-8 8M11 7l-5 5M17 13l-5 5"/><circle cx="6" cy="5" r="1" fill="currentColor"/><circle cx="20" cy="18" r="1" fill="currentColor"/>'),
  },
  {
    id: 'midas', name: TEXT, unique: true, max: 1, color: '#ffb300',
    cozy: { name: TEXT, desc: TEXT },
    evolution: true, requires: ['golden', 'magnet'],
    desc: TEXT,
    icon: svg('<path d="M4 9l4-5h8l4 5-8 11z"/><path d="M4 9h16M9 4l3 5 3-5M12 9v11"/>'),
  },
  {
    id: 'eclipse', name: TEXT, unique: true, max: 1, color: '#e0b3ff',
    cozy: { name: TEXT, desc: TEXT },
    evolution: true, requires: ['comboEngine', 'slowTide'],
    desc: TEXT,
    icon: svg('<circle cx="12" cy="12" r="8"/><path d="M15 4.6A8 8 0 0115 19.4 6.5 6.5 0 0115 4.6z" fill="currentColor"/><path d="M12 1v1.5M12 21.5V23M1 12h1.5M21.5 12H23"/>'),
  },
].map((p) => withText(p, `perk.${p.id}`)); // name, desc and cozy.* are content text perk.<id>.* (docs/LOCALISATION.md phase 4c)

export const PERK_BY_ID = Object.fromEntries(PERKS.map((p) => [p.id, p]));

export function isPerkAvailable(id, owned) {
  const p = PERK_BY_ID[id];
  if (!p) return false;
  return (owned[id] || 0) < p.max;
}

export const EVOLUTIONS = PERKS.filter((p) => p.evolution);

/** Eclipse pushes the tide back up to 2 drops through this sector, then up to 1 (it fades, never vanishes). */
export const ECLIPSE_FULL = 6;

/** Most drops one Eclipse push gives in a sector: 2 (sectors 1–6), then 1. */
export function eclipseMax(sector = 1) {
  return Math.max(1, sector) <= ECLIPSE_FULL ? 2 : 1;
}

/**
 * Eclipse: drops the tide is pushed back after a drop whose cascade had `steps` merge steps.
 * Fires on 3+ steps (2+ extra cascade steps after the first merge), whatever comboStart is;
 * +eclipseMax(sector) drops (2, then 1 from sector 7), never past the full tide interval.
 */
export function eclipseGain(steps, tideK, dropsUntilTide, sector = 1) {
  if (steps < 3) return 0;
  return Math.max(0, Math.min(eclipseMax(sector), tideK - dropsUntilTide));
}

// ---- Warm Oven and Morning Tidy (DESIGN.md "Warm Oven and Morning Tidy"). Both are deterministic: no rng.

/** Warm Oven: the smallest piece that warms the oven (tier 5, a Planet in the space names). */
export const OVEN_MIN_TIER = 5;
/** Warm Oven: drops the tide waits, at most once per sector (never past the full interval). */
export const OVEN_GAIN = 2;

/**
 * Warm Oven: drops the tide is pushed back after a player drop whose cascade's biggest merge made a piece of
 * `madeTier`. Fires when madeTier >= OVEN_MIN_TIER and the oven has not given anything this sector yet
 * (`ovenSector` = the sector it last gave in, 0 = never). A full tide gives 0 and leaves the oven for later.
 */
export function ovenGain(madeTier, tideK, dropsUntilTide, sector, ovenSector = 0) {
  if (ovenSector === sector || madeTier < OVEN_MIN_TIER) return 0;
  return Math.max(0, Math.min(OVEN_GAIN, tideK - dropsUntilTide));
}

/** Morning Tidy: the tier lifted off the board at each new sector (tier 1, Dust / the smallest piece). */
export const TIDY_TIER = 1;

/** Display name of a perk for the look: the café name by default, the original space name for the Cosmic look. */
export function perkName(id, look) {
  const p = PERK_BY_ID[id];
  if (!p) return id;
  return look !== 'cosmic' && p.cozy ? p.cozy.name : p.name;
}

/** Display description of a perk for the look (café copy by default; the space copy for the Cosmic look). */
export function perkDesc(id, look) {
  const p = PERK_BY_ID[id];
  if (!p) return '';
  return look !== 'cosmic' && p.cozy ? p.cozy.desc : p.desc;
}

/** A Path's one-line pitch for the look (café copy names the café perks; the Cosmic look keeps the space line). */
export function pathLine(id, look) {
  const p = PATH_BY_ID[normPath(id)];
  if (!p) return '';
  return look !== 'cosmic' && p.cozyLine ? p.cozyLine : p.line;
}

/** Evolutions the player has unlocked (owns both parts) but not taken yet, in list order. */
export function readyEvolutions(owned = {}, zen = false) {
  return EVOLUTIONS.filter((e) => !owned[e.id] && !(zen && ZEN_EXCLUDED.includes(e.id)) && e.requires.every((id) => (owned[id] || 0) > 0)).map((e) => e.id);
}

/**
 * Zen Drift (DESIGN.md "Zen Drift"): there is no tide and no loss to undo, so the perks that only
 * act on the tide or on a loss are never offered (Slow Tide, Second Wind, Warm Oven, and Eclipse, which
 * needs Slow Tide). Every other perk works exactly as in Endless.
 */
export const ZEN_EXCLUDED = ['slowTide', 'secondWind', 'eclipse', 'warmOven'];

/**
 * Card hint for a regular perk that is half of a Constellation (null otherwise).
 * { evo, partner, complete } — complete = the partner is already owned.
 */
export function perkHint(id, owned = {}, zen = false) {
  for (const e of EVOLUTIONS) {
    if (owned[e.id] || !e.requires.includes(id) || (zen && ZEN_EXCLUDED.includes(e.id))) continue;
    const partner = e.requires.find((x) => x !== id);
    return { evo: e.id, partner, complete: (owned[partner] || 0) > 0 };
  }
  return null;
}

/**
 * Offer `count` distinct perks the player can still take. Deterministic given rng.
 * When a Constellation is ready (both parts owned, not yet taken) it is GUARANTEED one
 * slot (rerolls keep it); evolutions are never offered otherwise. With nothing ready the
 * rng is consumed exactly as before.
 * `path` (Paths + Resonance): the chosen Path's perks weigh PATH_WEIGHT instead of 1 in each draw
 * (one rng() call per card, same count as without a path). No path = the exact classic sequence.
 */
export function offerPerks(rng, owned = {}, count = 3, exclude = [], path = null, zen = false) {
  const ready = readyEvolutions(owned, zen);
  const evo = ready.length ? ready[ready.length > 1 ? Math.floor(rng() * ready.length) : 0] : null;
  const want = evo ? count - 1 : count;
  const regular = (p) => !p.evolution && isPerkAvailable(p.id, owned) && !(zen && ZEN_EXCLUDED.includes(p.id));
  let pool = PERKS.filter((p) => regular(p) && !exclude.includes(p.id)).map((p) => p.id);
  if (pool.length < want) {
    // fall back to allowing the excluded ones again
    pool = PERKS.filter(regular).map((p) => p.id);
  }
  const out = [];
  const pp = PATH_BY_ID[normPath(path)];
  while (out.length < want && pool.length) {
    let i;
    if (!pp) i = Math.floor(rng() * pool.length);
    else {
      // integer weights: the same arithmetic in C# (Perks.Offer)
      let total = 0;
      for (const id of pool) total += pp.perks.includes(id) ? PATH_WEIGHT : 1;
      let x = rng() * total;
      i = pool.length - 1;
      for (let k = 0; k < pool.length; k++) {
        x -= pp.perks.includes(pool[k]) ? PATH_WEIGHT : 1;
        if (x < 0) { i = k; break; }
      }
    }
    out.push(pool.splice(i, 1)[0]);
  }
  if (evo) out.splice(Math.floor(rng() * (out.length + 1)), 0, evo);
  return out;
}

// ---- Paths + Resonance (Endless, DESIGN.md "Paths and Resonance"). A Path only BIASES which regular
// perks are offered; Constellations, perk effects and scoring are unchanged. No path (null) = classic.

/** Offer weight of a perk that belongs to the chosen Path (others weigh 1). */
export const PATH_WEIGHT = 3;
/** Perk stacks of your Path needed for Resonance. */
export const RESONANCE_AT = 3;
/** Tide Resonance: drops the tide is pushed back per pulse (never past the full interval). */
export const RESONANCE_TIDE = 2;

// Path name, line, cozyLine and resonance are content text path.<id>.* (src/i18n/content/en.js, docs/LOCALISATION.md
// phase 4b). Rules only read id and perks.
export const PATHS = [
  {
    id: 'gravity', name: TEXT, color: '#6f8bff',
    perks: ['comet', 'biggerBang', 'gravityWell', 'earlyNova', 'morningTidy'],
    line: TEXT, cozyLine: TEXT, resonance: TEXT,
  },
  {
    id: 'fusion', name: TEXT, color: '#ffd54a',
    perks: ['comboEngine', 'golden', 'magnet', 'bonds', 'wild'],
    line: TEXT, cozyLine: TEXT, resonance: TEXT,
  },
  {
    id: 'tide', name: TEXT, color: '#5ce1e6',
    perks: ['slowTide', 'gentle', 'hold', 'secondWind', 'miner', 'warmOven'],
    line: TEXT, cozyLine: TEXT, resonance: TEXT,
  },
].map((p) => withText(p, `path.${p.id}`));

export const PATH_BY_ID = Object.fromEntries(PATHS.map((p) => [p.id, p]));

/** A known path id, or null (no path: classic offers). */
export function normPath(id) {
  return typeof id === 'string' && Object.prototype.hasOwnProperty.call(PATH_BY_ID, id) ? id : null;
}

/** The path a regular perk belongs to (null for Constellations / unknown ids). */
export function perkPath(id) {
  for (const p of PATHS) if (p.perks.includes(id)) return p.id;
  return null;
}

/** Owned stacks of the path's perks (0 without a path). */
export function pathCount(path, owned = {}) {
  const p = PATH_BY_ID[normPath(path)];
  if (!p) return 0;
  let n = 0;
  for (const id of p.perks) n += owned[id] || 0;
  return n;
}

/** Resonance is on once you hold RESONANCE_AT stacks of your Path's perks. */
export function resonanceActive(path, owned = {}) {
  return pathCount(path, owned) >= RESONANCE_AT;
}

/** Tide Resonance push: +2 drops, never past the full tide interval. */
export function resonanceTideGain(tideK, dropsUntilTide) {
  return Math.max(0, Math.min(RESONANCE_TIDE, tideK - dropsUntilTide));
}

/**
 * One Resonance pulse (pure; the controllers apply it): what it gives for this path.
 * Gravity { comets: 1 } · Fusion { wild: 1 } (current orb, else next, else the next spawn)
 * · Tide { tide: resonanceTideGain }. Never touches any rng, the score or the board.
 */
export function resonancePulse(path, tideK, dropsUntilTide) {
  const p = normPath(path);
  if (p === 'gravity') return { comets: 1, wild: 0, tide: 0 };
  if (p === 'fusion') return { comets: 0, wild: 1, tide: 0 };
  if (p === 'tide') return { comets: 0, wild: 0, tide: resonanceTideGain(tideK, dropsUntilTide) };
  return { comets: 0, wild: 0, tide: 0 };
}

/** Translate owned perk stacks into concrete modifiers. */
export function buildRunMods(owned = {}, extra = {}) {
  const n = (id) => owned[id] || 0;
  return {
    boardOpts: {
      comboStart: 1 + n('comboEngine'),
      bangRadius: n('biggerBang') ? 2 : 1,
      crackDamage: n('miner') ? 2 : 1,
      minerBonus: n('miner') ? 50 : 0,
      goldenMult: n('midas') ? 5 : 3,
      scoreMult: 1,
      diagonal: n('bonds') > 0,
      gravityWell: n('gravityWell') > 0,
      earlyNova: n('earlyNova') > 0,
      cometRadius: n('meteorShower') ? 1 : 0,
    },
    slowTide: n('slowTide'),
    gentle: n('gentle') + (extra.silentGentle || 0),
    goldenChance: n('midas') ? Math.min(0.35, 0.1 * n('golden') + 0.05) : Math.min(0.3, 0.1 * n('golden')),
    eclipse: n('eclipse') > 0,
    coinBonus: 0.3 * n('magnet'),
    hold: n('hold') > 0,
    secondWind: n('secondWind') > 0,
    warmOven: n('warmOven') > 0,
    morningTidy: n('morningTidy') > 0,
  };
}
