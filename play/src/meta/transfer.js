// Transfer progress: a free, offline stand-in for cloud save (DESIGN.md "Transfer progress").
// Settings > Extras makes a code from the save; pasting it on another device replaces that device's progress.
//
// Code format (bit-exact with Unity Scripts/Meta/Transfer.cs; shared fixture Tests/EditMode/Fixtures/transfer.json):
//   "ND1-" + base64url(payload) + "." + 6 hex checksum
//   payload = [method byte] + data, method 0 = raw UTF-8 JSON, 1 = LZW (whichever is shorter; LZW codes 9..14 bits,
//   LSB-first, width fixed by the code index so both sides agree without an end marker)
//   checksum = first 6 hex digits of FNV-1a 32 over the base64url text
//
// What travels: progress, coins, boosters and earned items. Scores and bests come over exactly as they are.
// Never in a code, and on import the device keeps its own value:
//   ads (interstitial caps and counters), removeAds, purchases (incl. purchases.seasons), pass
//   (paid things are restored through the store, never by code), levelStats (anonymous ID + consent to share),
//   runSnap / snapSeq (the run in progress) and settings.reminder (needs this phone's notification permission).
//   Ad consent / ATT live in the ad SDK, not in the save.
// Paid-only cosmetics (Nova Pass skin, Starlight Season premium skins, outfits and nebulas): owned after an import
// only if THIS device already owns them (its own purchases granted them); the code's copies are dropped.
// v3: an old code (made before the café update) still imports: its Stardust, Season, Comet Week, Atlas and Missions
// data is let through (LEGACY_KEYS) and converted by the same one-time migration as a local save (src/meta/migrateV3.js).
// The code never carries a paid season (premium / bought are stripped), so a code can't grant a premium track.

import { normalizeSave, defaultSave } from './save.js';
import { SKINS } from './economy.js';
import { PAID_OUTFITS as LEGACY_PAID_OUTFITS, PAID_NEBULAS, LEGACY_KEYS } from './legacyCatalog.js';
import { CLUB_KEEPSAKE_IDS } from './outfits.js';
import { PACK_SKIN_IDS, PACK_SCENE_IDS } from './packs.js';
import { PAID_BOARDS, PAID_COMBOS, DEFAULT_BOARD, DEFAULT_COMBO } from './looks.js';

export const TRANSFER_VERSION = 1;
export const TRANSFER_PREFIX = `ND${TRANSFER_VERSION}-`;

/** Top-level save keys that never go into a code (the importing device keeps its own). */
export const LOCAL_ONLY_KEYS = ['ads', 'removeAds', 'purchases', 'pass', 'levelStats', 'runSnap', 'snapSeq'];

/** Cosmetics only money can unlock (Nova Pass, Starlight Season premium track, premium themed packs). Never taken from a code. */
export const PAID_SKINS = [...SKINS.filter((x) => x.pass || x.season).map((x) => x.id), ...PACK_SKIN_IDS.filter((id) => !SKINS.some((x) => x.id === id && (x.pass || x.season)))];
export const PAID_SCENES = PACK_SCENE_IDS.slice(); // pack scenes (Sky scenes are bought with coins, so they travel)
/** Paid-only outfits: the former season premium track (src/meta/legacyCatalog.js) and the Café Club keepsakes (src/meta/outfits.js). */
export const PAID_OUTFITS = Object.freeze([...LEGACY_PAID_OUTFITS, ...CLUB_KEEPSAKE_IDS]);
export { PAID_NEBULAS }; // former season premium track: premium + finale nebulas (src/meta/legacyCatalog.js)
export { PAID_BOARDS, PAID_COMBOS }; // pack board + combo skins (src/meta/looks.js); coin ones travel

/** Longest code body read (a real save is a few KB) and most bytes an LZW stream may expand to. Beyond: 'corrupt'. */
export const MAX_BODY = 64 * 1024;
export const MAX_UNPACKED = 1024 * 1024;
/** Deepest nesting of objects / arrays a code's JSON may have (outermost = 1). Same limit as Unity MiniJson.MaxDepth,
 *  which reads saves recursively: deeper is 'corrupt' on both sides (a real save nests about 5 deep). */
export const MAX_DEPTH = 64;

/** True when the JSON text never nests objects / arrays deeper than `max` (brackets inside strings don't count). */
export function jsonDepthOk(text, max = MAX_DEPTH) {
  let depth = 0, inStr = false;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (inStr) {
      if (c === 92) i++; // backslash: skip the escaped character
      else if (c === 34) inStr = false;
    } else if (c === 34) inStr = true;
    else if (c === 123 || c === 91) { if (++depth > max) return false; }
    else if (c === 125 || c === 93) depth--;
  }
  return true;
}

// ------------------------------------------------------------------ bytes <-> text

function utf8(text) { return new TextEncoder().encode(text); }
function fromUtf8(bytes) { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); }

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

export function base64url(bytes) {
  let out = '';
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + B64[n & 63];
  }
  const rest = bytes.length - i;
  if (rest === 1) {
    const n = bytes[i] << 16;
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63];
  } else if (rest === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63];
  }
  return out;
}

/** base64url (no padding) -> bytes, or null if a character or the length is invalid. */
export function fromBase64url(text) {
  if (text.length % 4 === 1) return null;
  const out = new Uint8Array(Math.floor(text.length * 3 / 4));
  let acc = 0, bits = 0, o = 0;
  for (let i = 0; i < text.length; i++) {
    const v = B64.indexOf(text[i]);
    if (v < 0) return null;
    acc = ((acc << 6) | v) & 0xffffff;
    bits += 6;
    if (bits >= 8) { bits -= 8; out[o++] = (acc >> bits) & 255; }
  }
  return out;
}

/** First 6 hex digits of FNV-1a 32 over the (ASCII) text. */
export function checksum(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i) & 255; h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0').slice(0, 6);
}

// ------------------------------------------------------------------ LZW (9..14 bit codes)

const MAX_BITS = 14;
const MAX_CODES = 1 << MAX_BITS;

function bitLen(x) { let n = 0; while (x > 0) { n++; x >>>= 1; } return n; }
/** Width of the i-th code: enough for every code either side can know at that point. */
function widthAt(i) { return Math.min(MAX_BITS, bitLen(256 + i)); }

export function lzwPack(bytes) {
  const out = [];
  let acc = 0, nbits = 0, idx = 0;
  const emit = (code) => {
    acc |= code << nbits;
    nbits += widthAt(idx++);
    while (nbits >= 8) { out.push(acc & 255); acc >>>= 8; nbits -= 8; }
  };
  if (bytes.length) {
    const dict = new Map();
    let next = 256;
    let w = bytes[0];
    for (let k = 1; k < bytes.length; k++) {
      const c = bytes[k];
      const key = w * 256 + c;
      const hit = dict.get(key);
      if (hit !== undefined) { w = hit; continue; }
      emit(w);
      if (next < MAX_CODES) dict.set(key, next++);
      w = c;
    }
    emit(w);
  }
  if (nbits > 0) out.push(acc & 255);
  return Uint8Array.from(out);
}

/** LZW bytes -> original bytes, or null if the stream is broken. */
export function lzwUnpack(bytes, start = 0) {
  const total = (bytes.length - start) * 8;
  let pos = 0, idx = 0;
  const read = (w) => {
    let v = 0;
    for (let b = 0; b < w; b++, pos++) {
      const bit = (bytes[start + (pos >> 3)] >> (pos & 7)) & 1;
      v |= bit << b;
    }
    return v;
  };
  const table = [];
  for (let i = 0; i < 256; i++) table.push([i]);
  const out = [];
  let prev = null;
  while (total - pos >= widthAt(idx)) {
    const code = read(widthAt(idx));
    idx++;
    let entry;
    if (code < table.length) entry = table[code];
    else if (prev && code === table.length) entry = prev.concat(prev[0]);
    else return null;
    if (out.length + entry.length > MAX_UNPACKED) return null; // decompression bomb: give up
    for (const b of entry) out.push(b);
    if (prev && table.length < MAX_CODES) table.push(prev.concat(entry[0]));
    prev = entry;
  }
  return Uint8Array.from(out);
}

// ------------------------------------------------------------------ code <-> JSON text

/** JSON text -> transfer code (deterministic; Unity Transfer.Encode gives the same code for the same text). */
export function encodeTransfer(json) {
  const raw = utf8(json);
  const packed = lzwPack(raw);
  const useLzw = packed.length < raw.length;
  const data = useLzw ? packed : raw;
  const payload = new Uint8Array(data.length + 1);
  payload[0] = useLzw ? 1 : 0;
  payload.set(data, 1);
  const body = base64url(payload);
  return `${TRANSFER_PREFIX}${body}.${checksum(body)}`;
}

/**
 * Pasted text -> { ok: true, json } or { ok: false, error } with error one of
 * 'empty' | 'prefix' | 'newer' | 'checksum' | 'corrupt'. Spaces and line breaks (chat apps wrap long codes)
 * and text around the code are ignored.
 */
export function decodeTransfer(text) {
  const s = String(text == null ? '' : text).replace(/\s+/g, '');
  if (!s) return { ok: false, error: 'empty' };
  const head = /[Nn][Dd](\d{1,3})-/.exec(s);
  if (!head) return { ok: false, error: 'prefix' };
  const ver = Number(head[1]);
  if (ver > TRANSFER_VERSION) return { ok: false, error: 'newer' };
  if (ver !== TRANSFER_VERSION) return { ok: false, error: 'prefix' };
  const m = /^([A-Za-z0-9_-]+)\.([0-9A-Fa-f]{6})/.exec(s.slice(head.index + head[0].length));
  if (m && m[1].length > MAX_BODY) return { ok: false, error: 'corrupt' };
  if (!m || checksum(m[1]) !== m[2].toLowerCase()) return { ok: false, error: 'checksum' };
  const payload = fromBase64url(m[1]);
  if (!payload || payload.length < 1) return { ok: false, error: 'corrupt' };
  let bytes;
  if (payload[0] === 0) bytes = payload.subarray(1);
  else if (payload[0] === 1) bytes = lzwUnpack(payload, 1);
  else return { ok: false, error: 'corrupt' };
  if (!bytes) return { ok: false, error: 'corrupt' };
  try { return { ok: true, json: fromUtf8(bytes) }; } catch (_) { return { ok: false, error: 'corrupt' }; }
}

/** Plain words for each error (players 35-65). Nothing is changed on any error. */
export const TRANSFER_ERRORS = {
  empty: 'Paste your transfer code first.',
  prefix: "That doesn't look like a Nova's Café transfer code. A code starts with ND1-.",
  newer: 'This code comes from a newer version of Nova\'s Café. Please update the game, then try again.',
  checksum: 'This code is incomplete or has a typo. Copy the whole code again and paste it here.',
  corrupt: "This code couldn't be read. Make a new code on your other device and try again.",
};

export function transferErrorText(error) {
  return TRANSFER_ERRORS[error] || TRANSFER_ERRORS.corrupt;
}

// ------------------------------------------------------------------ save <-> code

/** Copy of the save with the device-only parts removed (what goes into a code). */
export function transferPayload(save) {
  const p = JSON.parse(JSON.stringify(save));
  for (const k of LOCAL_ONLY_KEYS) delete p[k];
  if (p.settings && typeof p.settings === 'object') delete p.settings.reminder;
  if (p.season && typeof p.season === 'object') { delete p.season.premium; delete p.season.bought; }
  return p;
}

/** The save -> transfer code. */
export function exportCode(save) {
  return encodeTransfer(JSON.stringify(transferPayload(save)));
}

/**
 * Pasted code -> { ok: true, data } (the parsed save object, not yet sanitised) or { ok: false, error }.
 * Accepts codes made by the web game and by the Unity app (same save shape).
 */
export function readCode(text) {
  const r = decodeTransfer(text);
  if (!r.ok) return r;
  if (!jsonDepthOk(r.json)) return { ok: false, error: 'corrupt' }; // Unity's reader stops at the same depth
  let data;
  try { data = JSON.parse(r.json); } catch (_) { return { ok: false, error: 'corrupt' }; }
  if (!data || typeof data !== 'object' || Array.isArray(data) || typeof data.v !== 'number') return { ok: false, error: 'corrupt' };
  return { ok: true, data };
}

/** { level, best, coins } for the plain confirm ("Level X, best Y, coins Z"). */
export function transferSummary(save) {
  const n = (v, d) => (Number.isFinite(Number(v)) ? Math.max(0, Math.floor(Number(v))) : d);
  return {
    level: Math.max(1, n(save && save.journey && save.journey.level, 1)),
    best: n(save && save.best, 0),
    coins: n(save && save.coins, 0),
  };
}

/** Imported ids minus paid-only ones, plus the paid-only ids this device already owns. */
function mergePaid(imported, local, paid) {
  const out = (Array.isArray(imported) ? imported : []).filter((id) => !paid.includes(id));
  for (const id of Array.isArray(local) ? local : []) if (paid.includes(id) && !out.includes(id)) out.push(id);
  return out;
}

/**
 * The imported save (already sanitised) with this device's local-only values put back (mutates and returns it).
 * The device's ad caps / counters, Remove Ads, purchases (and the seasons bought), Nova Pass, stats ID and consent and
 * reminder stay exactly as they were here (the same objects, so a stats upload in flight keeps its queue). Paid-only
 * cosmetics come from this device only; an equipped one that is not owned here falls back to the default. The run in
 * progress is dropped (it belongs to the old progress) and snapSeq moves on so another open tab never writes over it.
 */
export function keepLocal(imported, local) {
  for (const k of ['ads', 'removeAds', 'purchases', 'pass', 'levelStats']) {
    if (k in local) imported[k] = local[k]; else delete imported[k];
  }
  delete imported.runSnap;
  imported.snapSeq = (Number.isInteger(local.snapSeq) && local.snapSeq >= 0 ? local.snapSeq : 0) + 1;
  if (imported.settings && local.settings && local.settings.reminder) imported.settings.reminder = local.settings.reminder;
  // paid-only cosmetics: this device's own
  const sk = imported.skins;
  sk.owned = mergePaid(sk.owned, local.skins && local.skins.owned, PAID_SKINS);
  for (const id of ['classic', 'basic', 'cafeclassics']) if (!sk.owned.includes(id)) sk.owned.unshift(id);
  if (!sk.owned.includes(sk.equipped)) sk.equipped = 'cafeclassics';
  const of = imported.outfits;
  of.owned = mergePaid(of.owned, local.outfits && local.outfits.owned, PAID_OUTFITS);
  if (!of.owned.includes(of.equipped)) of.equipped = null;
  imported.backdropsOwned = mergePaid(imported.backdropsOwned, local.backdropsOwned, PAID_NEBULAS);
  if (PAID_NEBULAS.includes(imported.settings.backdrop) && !imported.backdropsOwned.includes(imported.settings.backdrop)) imported.settings.backdrop = 'auto';
  imported.scenesOwned = mergePaid(imported.scenesOwned, local.scenesOwned, PAID_SCENES);
  if (PAID_SCENES.includes(imported.settings.backdrop) && !imported.scenesOwned.includes(imported.settings.backdrop)) imported.settings.backdrop = 'auto';
  for (const [key, paid, def] of [['boardSkins', PAID_BOARDS, DEFAULT_BOARD], ['comboSkins', PAID_COMBOS, DEFAULT_COMBO]]) {
    const v = imported[key];
    v.owned = mergePaid(v.owned, local[key] && local[key].owned, paid);
    if (!v.owned.includes(def)) v.owned.unshift(def);
    if (!v.owned.includes(v.equipped)) v.equipped = def;
  }
  // Puzzle Books bought: this device's own (a code never grants a paid book; the store's restore brings it back).
  // Solved pages, the page in progress and bookplates do travel with the code.
  const lb = local.books && Array.isArray(local.books.owned) ? local.books.owned : [];
  if (imported.books) imported.books.owned = lb.slice();
  return imported;
}

/**
 * Sanitised save built from a pasted code's data, keeping this device's local-only values. Only keys the save knows
 * (defaultSave) are taken from the code, plus an old code's LEGACY_KEYS so the v3 migration can convert them. Does not change `local` (its local-only objects are shared, not copied).
 */
export function importedSave(data, local) {
  const known = defaultSave();
  const picked = {};
  for (const k of Object.keys(data || {})) if (Object.prototype.hasOwnProperty.call(known, k) || LEGACY_KEYS.includes(k)) picked[k] = data[k];
  const s = normalizeSave(JSON.parse(JSON.stringify(picked)));
  s.v = known.v; // a Unity code says v: 2; the web save keeps its own shape number
  return keepLocal(s, local);
}

/**
 * Replace `save` IN PLACE with the imported progress (every module holding the save object sees it) and return it.
 * The caller persists and reloads. Use only after the player confirmed.
 */
export function applyImport(save, data) {
  const next = importedSave(data, save);
  for (const k of Object.keys(save)) if (!(k in next)) delete save[k];
  Object.assign(save, next);
  return save;
}
