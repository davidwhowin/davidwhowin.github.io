// Anonymous per-level stats for the soft launch (docs/MARKET_RESEARCH.md "Launch readiness"; DESIGN.md
// "Anonymous level stats"). Only what level design needs, nothing that identifies the player or the device:
//   Journey level attempt: level number, won, quit, drops used, stars, undo used, a booster used, continued
//   (extra drops were really added after running out, by coins or an ad; never whether an ad was offered or tried).
//   Endless run end: sector, score bucket, tide tier, Path, perks picked, quit.
// No device fields, no ad-value or ad-state fields, no advertising ID, no timestamps. The only ID is a random
// install ID that changes every calendar month (UTC) and is not linked to the player; the player can also reset
// it. Each queued event is stamped with the ID it was recorded under and a batch never mixes IDs, so nothing
// recorded under one ID is ever sent under another. The save keeps only the month the ID was made ('YYYY-MM').
// Read-only for the game: nothing here ever changes difficulty, scores or rewards.
//
// Opt-in: nothing is recorded until the player turns sharing on in Settings, and turning it off deletes
// everything waiting. Events wait in a small capped queue in the save (`save.levelStats`, same JSON shape as
// Unity Scripts/Meta/LevelStats.cs). A pluggable sink uploads them. There is no backend yet, so STATS_ENDPOINT
// is empty: the Settings toggle stays hidden and nothing is recorded or sent.
import { PERK_BY_ID, normPath } from '../game/perks.js';

/** The single place for the future upload URL (https only). Empty = stats never leave the device. */
export const STATS_ENDPOINT = '';

export const STATS_SCHEMA = 1;
/** Events kept waiting at most (oldest dropped first, counted in `dropped`). */
export const STATS_QUEUE_MAX = 200;
/** Events per upload batch. */
export const STATS_BATCH_MAX = 50;
/** An upload that has not answered after this long counts as failed (tried again later). */
export const STATS_TIMEOUT_MS = 15000;
/** Lower bounds of the Endless score buckets (a run reports the bucket, never its exact score). */
export const SCORE_BUCKETS = [0, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000];
const TIDES = ['gentle', 'standard', 'bold'];
const ID_RE = /^[0-9a-f]{32}$/;
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * share: null = never chosen (off), true / false = the player's choice. Only true records or sends anything.
 * id / month: the current install ID and the UTC month it was made ('' until the first event).
 */
export function defaultLevelStats() {
  return { share: null, id: '', month: '', queue: [], dropped: 0 };
}

/** An upload endpoint is configured (https only). */
export function statsAvailable(endpoint = STATS_ENDPOINT) {
  return typeof endpoint === 'string' && /^https:\/\/[^\s]+$/i.test(endpoint);
}

/** Sharing is on: an endpoint exists and the player turned it on (opt-in, default off). */
export function sharingOn(save, endpoint = STATS_ENDPOINT) {
  if (!statsAvailable(endpoint)) return false;
  const ls = save && save.levelStats;
  return !!(ls && ls.share === true);
}

/** Events are recorded only while sharing is on, so nothing from before the player said yes is ever sent. */
export function collecting(save, endpoint = STATS_ENDPOINT) {
  return sharingOn(save, endpoint);
}

/** 'local' (no endpoint: nothing is recorded or sent, toggle hidden), 'on' or 'off' (the Settings switch, default off). */
export function statsMode(save, endpoint = STATS_ENDPOINT) {
  if (!statsAvailable(endpoint)) return 'local';
  return sharingOn(save, endpoint) ? 'on' : 'off';
}

const int = (v, min, max) => (typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max ? v : null);
const bool = (v) => (typeof v === 'boolean' ? v : null);

/** A well-formed event (as written by levelEvent / endlessEvent), or null. Any install ID stamp is not part of it. */
export function cleanEvent(e) {
  if (!e || typeof e !== 'object' || Array.isArray(e)) return null;
  if (e.k === 'level') {
    const n = int(e.n, 1, 100000), drops = int(e.drops, 0, 100000), stars = int(e.stars, 0, 3);
    const won = bool(e.won), quit = bool(e.quit), undo = bool(e.undo), booster = bool(e.booster), continued = bool(e.continued);
    if (n == null || drops == null || stars == null || won == null || quit == null || undo == null || booster == null || continued == null) return null;
    return { k: 'level', n, won, quit: won ? false : quit, drops, stars: won ? stars : 0, undo, booster, continued };
  }
  if (e.k === 'endless') {
    const sector = int(e.sector, 1, 100000), bucket = int(e.bucket, 0, Number.MAX_SAFE_INTEGER), quit = bool(e.quit);
    if (sector == null || bucket == null || quit == null || !SCORE_BUCKETS.includes(bucket) || !TIDES.includes(e.tide)) return null;
    const path = e.path == null ? null : normPath(e.path);
    if (e.path != null && !path) return null;
    if (!Array.isArray(e.perks) || e.perks.length > 64 || !e.perks.every((p) => typeof p === 'string' && PERK_BY_ID[p])) return null;
    return { k: 'endless', sector, bucket, tide: e.tide, path, perks: e.perks.slice().sort(), quit };
  }
  return null;
}

/** A queued event: a well-formed event stamped with the install ID it was recorded under (`id`), or null. */
export function cleanQueued(e) {
  const c = cleanEvent(e);
  if (!c || typeof e.id !== 'string' || !ID_RE.test(e.id)) return null;
  c.id = e.id;
  return c;
}

/** The UTC calendar month of a time in ms ('YYYY-MM', '' if invalid). The install ID changes when it does. */
export function utcMonth(now = Date.now()) {
  const d = new Date(Number(now));
  if (!Number.isFinite(d.getTime())) return '';
  return String(d.getUTCFullYear()).padStart(4, '0') + '-' + String(d.getUTCMonth() + 1).padStart(2, '0');
}

/**
 * save.levelStats sanitised on load (missing / malformed = the default; bad events dropped, and so are events
 * without a valid ID stamp). Unless sharing was switched on, any queue, ID or drop count is removed: nothing
 * collected without consent survives a load.
 */
export function sanitizeLevelStats(save) {
  const raw = save.levelStats;
  const ls = defaultLevelStats();
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    if (raw.share === true || raw.share === false) ls.share = raw.share;
    if (typeof raw.id === 'string' && ID_RE.test(raw.id) && typeof raw.month === 'string' && MONTH_RE.test(raw.month)) {
      ls.id = raw.id; ls.month = raw.month;
    }
    if (Array.isArray(raw.queue)) for (const e of raw.queue) { const c = cleanQueued(e); if (c) ls.queue.push(c); }
    if (ls.queue.length > STATS_QUEUE_MAX) ls.queue = ls.queue.slice(-STATS_QUEUE_MAX);
    ls.dropped = int(raw.dropped, 0, Number.MAX_SAFE_INTEGER) ?? 0;
    if (ls.share !== true) { ls.id = ''; ls.month = ''; ls.queue = []; ls.dropped = 0; }
  }
  save.levelStats = ls;
  return ls;
}

function stats(save) {
  if (!save.levelStats || typeof save.levelStats !== 'object' || !Array.isArray(save.levelStats.queue)) save.levelStats = defaultLevelStats();
  if (typeof save.levelStats.month !== 'string') save.levelStats.month = '';
  return save.levelStats;
}

/** Lower bound of the score's bucket (0, 500, 1,000, 2,500 ... 1,000,000). */
export function scoreBucket(score) {
  const s = Math.max(0, Math.floor(Number(score) || 0));
  let b = 0;
  for (const x of SCORE_BUCKETS) if (s >= x) b = x;
  return b;
}

/**
 * The event for a finished Journey attempt, or null when it isn't one: autoplay, the Daily Nebula (a shared
 * daily puzzle, not a Journey level) and a quit before the first drop (the same rule Steady Start uses).
 * quit: the player ended it (pause-menu quit, or a saved run thrown away from the menu), not a loss on the board.
 * continued: extra drops were really added after running out (res.continuesGranted, counted only when coins or an
 * ad actually paid out), so an ad that was offered, tried or failed never shows.
 */
export function levelEvent(res) {
  if (!res || res.mode !== 'journey' || res.autoplay || res.nebula) return null;
  const drops = Math.max(0, Math.floor(Number(res.dropsUsed) || 0));
  if (res.forfeit && drops === 0) return null;
  return cleanEvent({
    k: 'level', n: res.level, won: !!res.won, quit: !res.won && !!res.forfeit, drops,
    stars: res.won ? Math.floor(Number(res.stars) || 0) : 0,
    undo: !!res.undoUsed, booster: !!res.boosterUsed, continued: Number(res.continuesGranted) > 0,
  });
}

/** Perk ids picked in an Endless run (one entry per stack), sorted. */
export function perksPicked(owned) {
  const out = [];
  if (owned && typeof owned === 'object') {
    for (const id of Object.keys(owned)) {
      if (!PERK_BY_ID[id]) continue;
      const n = Math.max(0, Math.min(16, Math.floor(Number(owned[id]) || 0)));
      for (let i = 0; i < n; i++) out.push(id);
    }
  }
  return out.sort();
}

/** The event for a finished Endless run, or null (autoplay, or a quit before the first drop). quit: ended by the player. */
export function endlessEvent(res) {
  if (!res || res.mode !== 'endless' || res.autoplay) return null;
  if (res.forfeit && !(res.drops > 0)) return null;
  return cleanEvent({
    k: 'endless', sector: Math.max(1, Math.floor(Number(res.sector) || 1)), bucket: scoreBucket(res.score),
    tide: TIDES.includes(res.challenge) ? res.challenge : 'standard',
    path: res.daily ? null : (normPath(res.path) || null), perks: perksPicked(res.owned), quit: !!res.forfeit,
  });
}

/**
 * The install ID for an event recorded now: made on first use and replaced by a fresh random one when the UTC
 * month changes (or after a reset). Events already queued keep the ID they were stamped with.
 */
export function currentId(save, { now = Date.now(), rand = null } = {}) {
  const ls = stats(save);
  const m = utcMonth(now);
  if (!ID_RE.test(ls.id) || ls.month !== m) { ls.id = newInstallId(rand); ls.month = m; }
  return ls.id;
}

/**
 * Queue one event stamped with this month's install ID (capped; the oldest goes first). opts: { now, rand } (tests).
 * Returns the queued event or null.
 */
export function pushEvent(save, ev, opts = {}) {
  const e = cleanEvent(ev);
  if (!e) return null;
  const ls = stats(save);
  e.id = currentId(save, opts);
  ls.queue.push(e);
  while (ls.queue.length > STATS_QUEUE_MAX) { ls.queue.shift(); ls.dropped = (ls.dropped || 0) + 1; }
  return e;
}

/** Book a settled run (main.js settleRun) while sharing is on. Never for autoplay. Returns the queued event or null. */
export function recordRunStats(save, res, endpoint = STATS_ENDPOINT, opts = {}) {
  if (!collecting(save, endpoint)) return null;
  const ev = res && res.mode === 'journey' ? levelEvent(res) : endlessEvent(res);
  return ev ? pushEvent(save, ev, opts) : null;
}

/** The Settings toggle. Off also deletes everything waiting and the install ID. */
export function setSharing(save, on) {
  const ls = stats(save);
  ls.share = !!on;
  if (!on) { ls.queue = []; ls.dropped = 0; ls.id = ''; ls.month = ''; }
  return ls;
}

/**
 * "New anonymous ID": forget the install ID (a fresh random one is made for the next event) and delete everything
 * recorded under the old one, so play from before the reset is never sent, under either ID.
 */
export function resetStatsId(save) {
  const ls = stats(save);
  ls.id = ''; ls.month = ''; ls.queue = []; ls.dropped = 0;
}

/** 32 random hex digits. `rand` (tests) returns a byte 0..255. */
export function newInstallId(rand = null) {
  const bytes = new Uint8Array(16);
  if (typeof rand === 'function') for (let i = 0; i < 16; i++) bytes[i] = rand() & 255;
  else {
    try { globalThis.crypto.getRandomValues(bytes); } catch (_) { for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256); }
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** The queued events of the next batch: the oldest ones stamped with the same ID as the first (at most max), or []. */
export function batchItems(save, max = STATS_BATCH_MAX) {
  const q = stats(save).queue;
  const out = [];
  if (!q.length) return out;
  const id = q[0].id, cap = Math.max(1, max);
  for (const e of q) { if (e.id !== id || out.length >= cap) break; out.push(e); }
  return out;
}

/** The batch JSON for queued events: { schema, id, build, events }, id = the ID they were recorded under. */
export function batchOf(items, build = '') {
  const events = items.map((e) => { const { id: _id, ...ev } = e; return ev; });
  return { schema: STATS_SCHEMA, id: items[0].id, build: String(build || ''), events };
}

/** The next upload batch or null when nothing waits. A batch never mixes install IDs. */
export function makeBatch(save, { build = '', max = STATS_BATCH_MAX } = {}) {
  const items = batchItems(save, max);
  return items.length ? batchOf(items, build) : null;
}

/**
 * What an upload's HTTP status means: 'sent' (2xx); 'reject' (any other 4xx except 408 / 429: the batch is dropped
 * and counted, never retried); 'retry' (408, 429, 5xx, no answer: tried again later).
 */
export function statusOutcome(status) {
  const s = Number(status);
  if (s >= 200 && s < 300) return 'sent';
  if (s >= 400 && s < 500 && s !== 408 && s !== 429) return 'reject';
  return 'retry';
}

/** The default sink: keeps everything on the device (nothing is ever sent). */
export const localSink = Object.freeze({ id: 'local', send: async () => 'retry' });

/**
 * POST a batch as JSON to `url`. No cookies, no credentials, no extra headers. Resolves 'sent', 'reject' or 'retry'
 * (statusOutcome). Gives up after timeoutMs and aborts the request, so an upload can never hang.
 */
export function httpSink(url, fetchFn = (typeof fetch === 'function' ? fetch : null), timeoutMs = STATS_TIMEOUT_MS) {
  return {
    id: 'http',
    async send(batch) {
      if (!fetchFn || !statsAvailable(url)) return 'retry';
      const ctl = typeof AbortController === 'function' ? new AbortController() : null;
      let timer = null;
      const timeout = new Promise((resolve) => {
        timer = setTimeout(() => { try { if (ctl) ctl.abort(); } catch (_) { /* ignore */ } resolve('retry'); }, timeoutMs);
      });
      const post = (async () => {
        try {
          const init = {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(batch),
            credentials: 'omit', cache: 'no-store', keepalive: true, referrerPolicy: 'no-referrer',
          };
          if (ctl) init.signal = ctl.signal;
          const r = await fetchFn(url, init);
          if (!r) return 'retry';
          return statusOutcome(typeof r.status === 'number' ? r.status : (r.ok ? 200 : 0));
        } catch (_) { return 'retry'; }
      })();
      try { return await Promise.race([post, timeout]); }
      finally { clearTimeout(timer); }
    },
  };
}

/** The sink to use now: the upload sink only while sharing is on, otherwise the local one. */
export function sinkFor(save, endpoint = STATS_ENDPOINT, fetchFn) {
  return sharingOn(save, endpoint) ? httpSink(endpoint, fetchFn) : localSink;
}

let inFlight = false;

/**
 * Try to upload what waits (at most `maxBatches` batches). Sent events leave the queue; after a retryable failure
 * they wait for the next try; a batch the server rejects (4xx other than 408 / 429) is dropped and counted in
 * `dropped`. With the local sink nothing happens. Returns the number of events sent.
 */
export async function flushLevelStats(save, { endpoint = STATS_ENDPOINT, sink = null, build = '', maxBatches = 4 } = {}) {
  if (inFlight || !sharingOn(save, endpoint)) return 0;
  const out = sink || sinkFor(save, endpoint);
  if (out.id === 'local') return 0;
  inFlight = true;
  let sent = 0;
  try {
    for (let i = 0; i < maxBatches; i++) {
      const items = batchItems(save);
      if (!items.length) break;
      let res = 'retry';
      try {
        const r = await out.send(batchOf(items, build));
        res = r === true || r === 'sent' ? 'sent' : r === 'reject' ? 'reject' : 'retry';
      } catch (_) { res = 'retry'; }
      if (res === 'retry') break;
      const done = new Set(items);
      const ls = stats(save);
      const before = ls.queue.length;
      ls.queue = ls.queue.filter((e) => !done.has(e)); // by identity: events added meanwhile stay
      const gone = before - ls.queue.length; // 0 when the queue was cleared mid-upload (switched off / new ID)
      if (res === 'sent') sent += items.length;
      else ls.dropped = (ls.dropped || 0) + gone;
      if (!sharingOn(save, endpoint)) break; // switched off mid-upload
    }
  } finally { inFlight = false; }
  return sent;
}
