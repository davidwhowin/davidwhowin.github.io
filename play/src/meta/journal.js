// Skill Journal (v0.5.3, docs/PSYCH_RESEARCH.md §5 G): informational mastery trends for the
// player's own eyes. Compact running totals in the save; real play only (autoplay never counts).
// No ranks, no comparisons with other players, no claims about brain or health benefits.
//
// Save shape (save.journal), kept flat so the Unity port can mirror it 1:1:
//   since:   'YYYY-MM-DD' | null   first local day the journal counted a game
//   games, drops, merged, steps    lifetime totals: finished games, drops, drops that merged,
//                                  cascade steps summed over the drops that merged
//   longest: longest chain (cascade steps from one drop), top: highest orb tier made
//   recent:  [[drops, merged, steps], ...]  the last RECENT_KEEP games, oldest first
//   cur:     { d, m, s, l, t, n } | null    the game in progress (n = last counted drop number,
//                                           so a drop replayed after a reload is not counted twice)
//   feats:   { id: 'YYYY-MM-DD' | '' }      first-time feats; '' = done before the journal existed
import { dayKey } from './daily.js';
import { t } from '../i18n/index.js'; // text: UI keys journal.* (docs/LOCALISATION.md phase 4c)

export const RECENT_KEEP = 30;
export const TREND_RECENT = 10;   // "last 10 games"
export const TREND_MIN_EARLIER = 5; // compare only with at least 5 earlier games
export const CHAIN_FEAT = 5;

// Names are UI keys journal.feat.<id> (getters, so a locale switch shows through; the keys stay literal for the extractor).
export const FEATS = [
  { id: 'firstWin', get name() { return t('journal.feat.firstWin'); } },
  { id: 'threeStar', get name() { return t('journal.feat.threeStar'); } },
  { id: 'chain5', get name() { return t('journal.feat.chain5', { n: CHAIN_FEAT }); } },
  { id: 'tier7', get name() { return t('journal.feat.tier7'); } },
  { id: 'tier9', get name() { return t('journal.feat.tier9'); } },
  { id: 'supernova', get name() { return t('journal.feat.supernova'); } },
  { id: 'sector5', get name() { return t('journal.feat.sector5'); } },
  { id: 'nebula', get name() { return t('journal.feat.nebula'); } },
]
const FEAT_IDS = FEATS.map((f) => f.id);

export function defaultJournal() {
  return { since: null, games: 0, drops: 0, merged: 0, steps: 0, longest: 0, top: 0, recent: [], cur: null, feats: {} };
}

const nat = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Math.floor(Number(v)) : 0);
const isDay = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

function cleanCur(c) {
  if (!c || typeof c !== 'object' || Array.isArray(c)) return null;
  const out = { d: nat(c.d), m: nat(c.m), s: nat(c.s), l: nat(c.l), t: Math.min(10, nat(c.t)), n: nat(c.n) };
  out.m = Math.min(out.m, out.d);
  return out;
}

/** Sanitise save.journal on load; old saves get feats they had already achieved (dated ''). */
export function sanitizeJournal(s) {
  const j = s.journal && typeof s.journal === 'object' && !Array.isArray(s.journal) ? s.journal : {};
  const out = defaultJournal();
  out.since = isDay(j.since) ? j.since : null;
  for (const k of ['games', 'drops', 'merged', 'steps', 'longest']) out[k] = nat(j[k]);
  out.merged = Math.min(out.merged, out.drops);
  out.top = Math.min(10, nat(j.top));
  out.recent = (Array.isArray(j.recent) ? j.recent : [])
    .filter((r) => Array.isArray(r) && r.length >= 3)
    .map((r) => { const d = nat(r[0]); return [d, Math.min(d, nat(r[1])), nat(r[2])]; })
    .filter((r) => r[0] > 0)
    .slice(-RECENT_KEEP);
  out.cur = cleanCur(j.cur);
  const f = j.feats && typeof j.feats === 'object' && !Array.isArray(j.feats) ? j.feats : {};
  for (const id of FEAT_IDS) if (id in f && (f[id] === '' || isDay(f[id]))) out.feats[id] = f[id];
  // seed from what the save already proves (no date: it happened before the journal)
  const disc = Array.isArray(s.discovered) ? s.discovered.map(Number).filter(Number.isFinite) : [];
  const st = s.stats || {};
  out.top = Math.max(out.top, Math.min(10, nat(st.highestTier)), ...disc.filter((t) => t <= 10).map(nat), 0);
  const stars = Object.values((s.journey && s.journey.stars) || {}).map(Number);
  const days = (s.nebula && s.nebula.days && typeof s.nebula.days === 'object') ? Object.values(s.nebula.days) : [];
  const proof = {
    firstWin: stars.some((v) => v > 0),
    threeStar: stars.some((v) => v >= 3),
    tier7: out.top >= 7,
    tier9: out.top >= 9,
    supernova: nat(st.supernovas) > 0 || out.top >= 10,
    sector5: nat(st.bestSector) >= 5,
    nebula: days.some((d) => d && d.solved),
  };
  for (const id of FEAT_IDS) if (proof[id] && !(id in out.feats)) out.feats[id] = '';
  s.journal = out;
  return out;
}

function j(save) {
  if (!save.journal || typeof save.journal !== 'object') save.journal = defaultJournal();
  return save.journal;
}

function earn(jr, id, date) {
  if (id in jr.feats) return null;
  jr.feats[id] = date;
  return id;
}

/** A new game starts: a leftover game (e.g. a crash with no saved run) is folded in first. */
export function journalStart(save, date = dayKey()) {
  const jr = j(save);
  if (jr.cur && jr.cur.d > 0) foldCur(jr, date);
  jr.cur = { d: 0, m: 0, s: 0, l: 0, t: 0, n: 0 };
}

/**
 * One drop resolved in a real (non-autoplay) game. steps: cascade steps it caused (0 = no merge).
 * dropNo: the run's drop counter (a drop replayed after a reload is ignored). Returns new feat ids.
 */
export function journalDrop(save, steps, dropNo = 0, date = dayKey()) {
  const jr = j(save);
  if (!jr.cur) jr.cur = { d: 0, m: 0, s: 0, l: 0, t: 0, n: 0 };
  const c = jr.cur;
  if (dropNo > 0 && dropNo <= c.n) return [];
  if (dropNo > 0) c.n = dropNo;
  steps = nat(steps);
  c.d++;
  if (steps > 0) { c.m++; c.s += steps; c.l = Math.max(c.l, steps); }
  return steps >= CHAIN_FEAT ? [earn(jr, 'chain5', date)].filter(Boolean) : [];
}

/** An orb of this tier was made in a real game. Returns new feat ids. */
export function journalTier(save, tier, date = dayKey()) {
  const jr = j(save);
  if (!jr.cur) jr.cur = { d: 0, m: 0, s: 0, l: 0, t: 0, n: 0 };
  tier = Math.min(10, nat(tier));
  jr.cur.t = Math.max(jr.cur.t, tier);
  const out = [];
  if (tier >= 7) out.push(earn(jr, 'tier7', date));
  if (tier >= 9) out.push(earn(jr, 'tier9', date));
  if (tier >= 10) out.push(earn(jr, 'supernova', date));
  return out.filter(Boolean);
}

function foldCur(jr, date) {
  const c = jr.cur;
  jr.cur = null;
  if (!c || c.d <= 0) return false;
  if (!jr.since) jr.since = date;
  jr.games++;
  jr.drops += c.d;
  jr.merged += c.m;
  jr.steps += c.s;
  jr.longest = Math.max(jr.longest, c.l);
  jr.top = Math.max(jr.top, c.t);
  jr.recent = [...jr.recent, [c.d, c.m, c.s]].slice(-RECENT_KEEP);
  return true;
}

/**
 * A real game was settled (finished, quit or ended from the menu). Folds the game into the
 * totals and records result feats. res: the run result from game.js. Returns new feat ids.
 */
export function journalRunEnd(save, res, date = dayKey()) {
  const jr = j(save);
  foldCur(jr, date);
  const out = [];
  if (res && res.mode === 'journey' && res.won && !res.nebula) {
    out.push(earn(jr, 'firstWin', date));
    if (res.stars >= 3) out.push(earn(jr, 'threeStar', date));
  }
  if (res && res.mode === 'journey' && res.won && res.nebula) out.push(earn(jr, 'nebula', date));
  // sector feats follow the sector stats: Standard tide only (DESIGN.md v0.5.2)
  if (res && res.mode === 'endless' && (res.daily || !res.challenge || res.challenge === 'standard') && res.sector >= 5) out.push(earn(jr, 'sector5', date));
  return out.filter(Boolean);
}

/** An autoplay game (or one switched to autoplay): nothing it did is kept. */
export function journalDiscard(save) {
  j(save).cur = null;
}

const avgChain = (merged, steps) => (merged > 0 ? steps / merged : 0);
const mergePct = (drops, merged) => (drops > 0 ? (merged / drops) * 100 : 0);

function sumRows(rows) {
  return rows.reduce((a, r) => ({ d: a.d + r[0], m: a.m + r[1], s: a.s + r[2] }), { d: 0, m: 0, s: 0 });
}

const pct = (v) => t('journal.pct', { v });
const steps = (v) => t('journal.steps', { v });

function compare(now, before, digits, unit) {
  const a = Number(now.toFixed(digits)), b = Number(before.toFixed(digits));
  const f = (v) => unit(v.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits }));
  if (a === b) return t('journal.same', { v: f(b) });
  return a > b ? t('journal.up', { v: f(b) }) : t('journal.down', { v: f(b) });
}

/** Everything the Skill Journal page shows. Pure. */
export function journalSummary(save) {
  const jr = save.journal && typeof save.journal === 'object' ? save.journal : defaultJournal();
  const recent = Array.isArray(jr.recent) ? jr.recent : [];
  const res = {
    games: jr.games || 0,
    drops: jr.drops || 0,
    mergePct: mergePct(jr.drops, jr.merged),
    avgChain: avgChain(jr.merged, jr.steps),
    longest: jr.longest || 0,
    top: jr.top || 0,
    since: jr.since || null,
    trend: null,
    spark: recent.map((r) => mergePct(r[0], r[1])),
    feats: FEATS.map((f) => ({ ...f, done: f.id in (jr.feats || {}), date: (jr.feats || {})[f.id] ?? null })),
  };
  if (recent.length >= TREND_RECENT + TREND_MIN_EARLIER) {
    const last = sumRows(recent.slice(-TREND_RECENT));
    const early = sumRows(recent.slice(0, -TREND_RECENT));
    const lp = mergePct(last.d, last.m), ep = mergePct(early.d, early.m);
    const lc = avgChain(last.m, last.s), ec = avgChain(early.m, early.s);
    res.trend = {
      earlierGames: recent.length - TREND_RECENT,
      mergePct: lp, mergePctBefore: ep, avgChain: lc, avgChainBefore: ec,
      lines: [
        t('journal.trendMerge', { n: TREND_RECENT, v: pct(String(Math.round(lp))), cmp: compare(lp, ep, 0, pct) }),
        t('journal.trendChain', { n: TREND_RECENT, v: steps(lc.toFixed(1)), cmp: compare(lc, ec, 1, steps) }),
      ],
    };
  }
  return res;
}

/** '2026-10-21' -> 'Oct 21, 2026'; '' -> 'Before the journal started'. */
export function featDateText(d) {
  if (d === '') return t('journal.beforeStart');
  if (!isDay(d)) return '';
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
