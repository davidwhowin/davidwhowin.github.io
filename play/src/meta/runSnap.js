// Resume-after-reload snapshot format (Game.snapshotRun / Game.restoreRun). Pure, no DOM.
// A snapshot that fails these checks is discarded, never half-restored.

export const SNAP_VERSION = 2;

// Rules version a snapshot was taken under (stored in snap.build). Bump RULES_VERSION only when
// gameplay rules, levels or the run format change: a saved run from other rules is settled like a
// quit instead of being resumed. A display build bump (screens.js BUILD) never ends saved runs.
// LEGACY_RULES_BUILDS: older tags whose snapshots replay identically under today's rules
// ('v0.5.0' stored the display BUILD). rules-2 (v0.5.2) added the Endless tide tier (run.challenge)
// and Steady Start Wild Orbs on the board: a rules-1 snapshot has neither, so it is exactly a
// Standard run under rules-2 and still resumes. The bump stops an older build (rules-1 only) from
// resuming a Gentle/Bold or Steady Start run under the wrong rules: it settles it like a quit.
// rules-3 (Paths + Resonance) added run.path: a rules-2 snapshot has no Path, so it is exactly a no-Path run under
// rules-3 and still resumes; the bump stops a rules-2 build from resuming a Path run without its Path.
// rules-4 (Zen Drift) added run.zen: a rules-3 snapshot has no Zen flag, so it is exactly a normal run
// under rules-4 and still resumes; the bump stops a rules-3 build from resuming a Zen run with a tide.
// rules-5 (Endless pacing: new tide curves, Slow Tide and Eclipse taper by sector). A rules-4 snapshot keeps its saved
// tide countdown and picks up the new curve at its next tide, so it still resumes (nothing is lost on update); the bump
// stops a rules-4 build from resuming a rules-5 run under the old, faster tide.
// rules-6 (Café moments: run.moments; Gentle and Bold tide tails tamed). A rules-5 snapshot has no run.moments, so it
// keeps playing without them, and picks up the new Gentle / Bold curve at its next tide: it still resumes. The bump
// stops a rules-5 build from resuming a run with an open café ticket it cannot serve.
// rules-7 (two new perks, Warm Oven and Morning Tidy; run.ovenSector). A rules-6 snapshot owns neither perk, so it plays
// on exactly as before (only later perk offers can include the new cards): it still resumes. The bump stops a rules-6
// build from resuming a run that owns a perk it does not know.
// rules-8 (Daily weekly café rotation: run.nebulaTwist). A rules-7 snapshot has no twist, so its Daily is exactly the plain
// board it was taken on: it still resumes. The bump stops a rules-7 build from resuming a twist Daily as the plain board.
// rules-9 (Journey pacing pass, docs/PACING_PASS.md: chapters 9-13 re-planned and 26 later levels re-searched). Endless,
// Daily and Free Play are untouched, so an older snapshot of those still resumes, and so does a Journey level whose spec
// did not change. A Journey snapshot from before rules-9 on one of PACING_PASS_LEVELS would resume on a different board
// and goals than it was taken on, so it is settled like a quit instead (sameRules(build, snap)).
export const RULES_VERSION = 'rules-9';
export const LEGACY_RULES_BUILDS = Object.freeze(['v0.5.0', 'rules-1', 'rules-2', 'rules-3', 'rules-4', 'rules-5', 'rules-6', 'rules-7', 'rules-8']);
/** Journey levels whose spec (getLevel) the pacing pass changed: 0fa9dfb -> 6b3a252, frozen. tests/rules9.test.mjs
 *  re-derives it from git and keeps C# RunSnap.PacingPassLevels equal (fixture runsnap_rules9.json). */
export const PACING_PASS_LEVELS = Object.freeze([
  164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187,
  188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211,
  212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235,
  236, 237, 238, 239, 240, 242, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253, 254, 255, 256, 257, 258, 259, 260, 269,
  292, 330, 331, 332, 375, 411, 415, 447, 449, 460, 462, 504, 506, 526, 539, 584, 657, 667, 688, 693, 733, 745, 748, 777,
  789, 906, 910, 911, 927, 949, 959, 973,
]);
const PATH_IDS = ['gravity', 'fusion', 'tide'];
const CHALLENGE_IDS = ['gentle', 'standard', 'bold'];
// the Daily's café twists other than plain (levels.js DAILY_TWISTS; a test keeps them equal)
const NEB_TWIST_IDS = ['orders', 'glaze', 'teapot', 'tin', 'relaxed', 'orders+glaze', 'orders+teapot', 'orders+tin', 'glaze+teapot', 'glaze+tin', 'teapot+tin'];
/** True when a pre-rules-9 Journey snapshot sits on a level the pacing pass changed (Daily Nebula excluded). */
export const pacingChanged = (s) => !!s && typeof s === 'object' && s.mode === 'journey' && s.nebula == null
  && PACING_PASS_LEVELS.includes(s.levelN);
/**
 * True when a snapshot's `build` tag was taken under the current rules. Pass the snapshot itself (`s`) to also settle an
 * older Journey run on a level the pacing pass changed (rules-9); without it only the tag is checked.
 */
export const sameRules = (b, s = null) => b === RULES_VERSION || (LEGACY_RULES_BUILDS.includes(b) && !pacingChanged(s));

const num = (v) => typeof v === 'number' && Number.isFinite(v);
const int = (v) => num(v) && Math.floor(v) === v;
const orb = (o) => !!o && typeof o === 'object' && int(o.tier) && o.tier >= 1;

/** True when `s` is a well-formed snapshot for this format version and (optionally) this build. */
export function validRunSnap(s, build = null) {
  try {
    if (!s || typeof s !== 'object' || s.v !== SNAP_VERSION) return false;
    if (build != null && s.build !== build) return false;
    if (s.mode !== 'endless' && s.mode !== 'journey') return false;
    if (!int(s.seq) || s.seq < 1) return false;
    const r = s.run;
    if (!r || typeof r !== 'object' || r.mode !== s.mode) return false;
    for (const k of ['score', 'drops', 'activeTime', 'revivesUsed', 'comets', 'wildPending', 'tideK']) if (!num(r[k])) return false;
    if (!(r.dropsUntilTide === null || num(r.dropsUntilTide))) return false;
    if (!orb(r.current) || !orb(r.next)) return false;
    if (r.hold != null && !orb(r.hold)) return false;
    if (!r.owned || typeof r.owned !== 'object' || Array.isArray(r.owned)) return false;
    const b = r.board;
    if (!b || !int(b.cols) || !int(b.rows) || !int(b.nextId) || !Array.isArray(b.cells) || b.cells.length !== b.cols * b.rows) return false;
    for (const c of b.cells) if (c !== null && (typeof c !== 'object' || !int(c.id))) return false;
    if (!s.rngs || !int(s.rngs.rng) || !int(s.rngs.tideRng)) return false;
    if (s.mode === 'endless') {
      if (!int(r.sector) || r.sector < 1 || !int(s.rngs.perkRng)) return false;
      if (r.daily && typeof r.dailyKey !== 'string') return false;
      // tide tier (absent before rules-2 = Standard); the daily challenge is always Standard
      if (r.challenge != null && (!CHALLENGE_IDS.includes(r.challenge) || (r.daily && r.challenge !== 'standard'))) return false;
      // Path (absent before rules-3 = no Path); never on the daily challenge
      if (r.path != null && (!PATH_IDS.includes(r.path) || r.daily)) return false;
      // Zen Drift (absent before rules-4 = a normal run): never daily, no Path, Standard spawns, no tide
      if (r.zen != null && (r.zen !== true || r.daily || r.path != null || (r.challenge != null && r.challenge !== 'standard') || r.dropsUntilTide !== null)) return false;
      // Warm Oven: the sector it last gave in (absent before rules-7 / until it first fires = never)
      if (r.ovenSector != null && !(int(r.ovenSector) && r.ovenSector >= 1 && r.ovenSector <= r.sector)) return false;
    } else {
      if (r.zen != null) return false; // Zen Drift is Endless only
      if (!num(r.dropsLeft) || !Array.isArray(r.prog) || !int(s.rngs.shuffleRng)) return false;
      if (r.path != null) return false; // Paths are Endless only
      if (r.steady != null && typeof r.steady !== 'boolean') return false;
      if (r.steady && s.nebula != null) return false; // Steady Start never applies to the Daily Nebula
      // Nova Streak Wild Orbs used at the start (v0.5.6; absent = 0). They are ordinary board Wild Orbs, so
      // rules-2 is unchanged and an older build replays such a run exactly.
      if (r.streak != null && !(int(r.streak) && r.streak >= 0 && r.streak <= 3)) return false;
      if (r.streak && s.nebula != null) return false; // never in the Daily Nebula
      // Second cup drops granted so far this attempt (absent = 0; already included in dropsLeft)
      if (r.secondCups != null && !(int(r.secondCups) && r.secondCups >= 0 && r.secondCups <= 2)) return false;
      if (r.secondCups && s.nebula != null) return false; // never in the Daily Nebula
      if (s.nebula != null ? typeof s.nebula !== 'string' : !(int(s.levelN) && s.levelN >= 1)) return false;
      // the Daily's weekly café twist (absent = plain): a known twist, on a Daily only
      if (r.nebulaTwist != null && (s.nebula == null || !NEB_TWIST_IDS.includes(r.nebulaTwist))) return false;
    }
    if (s.pending != null && (typeof s.pending !== 'object' || typeof s.pending.type !== 'string')) return false;
    return true;
  } catch (_) { return false; }
}
