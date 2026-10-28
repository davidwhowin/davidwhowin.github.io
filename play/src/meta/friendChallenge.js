// "Challenge a friend" (DESIGN.md): a short code that carries one exact puzzle (seed, tide tier and the
// starting kit) plus the sender's result, so a friend or grandchild plays the identical orb sequence and
// compares. Pure data, no DOM and no imports, so C# can port it byte-for-byte (tests/friend-challenge.test.mjs
// prints fixture vectors).
//
// Code: "NC1-" + base64url(payload) + "." + 6 hex checksum (FNV-1a 32 of the body text, first 6 hex digits),
// the same style as the progress transfer code (src/meta/transfer.js).
//
// Payload bytes:
//   b0      bit0 mode (0 Endless, 1 Daily Nebula) · bits1-2 tide tier (0 Gentle, 1 Standard, 2 Bold; Nebula: 0)
//           · bit3 has a name · bit4 has a café gift · bits5-7 zero
//   b1..b4  Endless: the run seed (uint32, big-endian). Nebula: the puzzle date as the number YYYYMMDD
//   b5      starting kit. Endless: bit0 start Hold, bit1 extra comet, bit2 Opening Perk, bit3 Lucky Start,
//           bit4 gentle first-run spawns, bits5-6 Path (0 none, 1 Gravity, 2 Fusion, 3 Tide), bit7 zero.
//           Nebula: bit0 undo allowed, bits1-4 the day's café twist (NEB_TWISTS index; 0 plain, so older codes are
//           unchanged), bits5-7 zero
//   Endless: score as an unsigned LEB128 varint (shortest form, 0..999,999,999)
//   Nebula:  stars (0..3), drops used (0..255; at least 1 when solved)
//   name:    if bit3, one length byte (1..48) + UTF-8 bytes, already in sanitizeName() form
//   gift:    if bit4, the day the gift was made: days since 2024-01-01 (uint16, big-endian, 0..GIFT_DAY_MAX)
// Nothing may follow. Codes without a gift are byte-for-byte what they were before gifts (bit4 clear).
//
// Postcard gifts (docs/MARKET_MONETIZATION_3.md idea 4): a sender may attach a free GIFT_COINS gift "from the café".
// The game pays it, never the sender. A receiver opens at most one gift per sender code and one gift per day, both
// kept in save.friends.gifts = { day: 'YYYY-MM-DD' of the last gift opened ('' = none), got: [checksums of opened
// codes, oldest first, at most GIFT_KEEP] }. Gifts are sent, never requested: no asking, no reminders, no streaks. No links, no IDs, no device data: only the puzzle and the sender's own result.

export const FRIEND_PREFIX = 'NC1-';
export const MAX_SCORE = 999999999;
export const NAME_MAX = 16; // characters (code points)
const NAME_BYTES_MAX = 48;
export const RECENT_MAX = 5;
export const GIFT_COINS = 50;
export const GIFT_KEEP = 400; // opened-gift codes remembered (one a day at most, so over a year)
export const TIERS = ['gentle', 'standard', 'bold'];
export const PATHS = [null, 'gravity', 'fusion', 'tide'];
/** The Daily's café twists in code order: a copy of levels.js DAILY_TWISTS (no imports here; a test keeps them equal). */
export const NEB_TWISTS = Object.freeze(['plain', 'orders', 'glaze', 'teapot', 'tin', 'relaxed',
  'orders+glaze', 'orders+teapot', 'orders+tin', 'glaze+teapot', 'glaze+tin', 'teapot+tin']);

export const FRIEND_ERRORS = {
  empty: 'Paste the challenge code first.',
  notcode: 'That doesn\'t look like a challenge code. It starts with NC1-',
  newer: 'This challenge came from a newer version of Nova\'s Café. Please update the game, then try again.',
  corrupt: 'That code is incomplete or has a typo. Ask them to send it again, or copy the whole message.',
  invalid: 'That code doesn\'t hold a puzzle this game can play. Ask them to send it again.',
  future: 'That puzzle\'s day hasn\'t arrived here yet. Try again tomorrow.',
};

// ---------------------------------------------------------------- byte helpers (same as transfer.js)

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function base64url(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] || 0) << 8) | (bytes[i + 2] || 0);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63];
    if (i + 1 < bytes.length) out += B64[(n >> 6) & 63];
    if (i + 2 < bytes.length) out += B64[n & 63];
  }
  return out;
}

function fromBase64url(text) {
  if (text.length % 4 === 1) return null;
  const out = [];
  let buf = 0, bits = 0;
  for (const ch of text) {
    const v = B64.indexOf(ch);
    if (v < 0) return null;
    buf = (buf << 6) | v;
    bits += 6;
    if (bits >= 8) { bits -= 8; out.push((buf >> bits) & 255); }
  }
  return out;
}

/** First 6 hex digits of FNV-1a 32 over the text's UTF-16 code units (ASCII here). */
export function checksum(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0').slice(0, 6);
}

function utf8(s) {
  const out = [];
  for (const ch of s) {
    const c = ch.codePointAt(0);
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return out;
}

/** Strict UTF-8 decode (shortest forms only, no surrogates); null when malformed. */
function fromUtf8(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length;) {
    const b = bytes[i];
    let c, n;
    if (b < 0x80) { c = b; n = 0; } else if ((b & 0xe0) === 0xc0) { c = b & 31; n = 1; } else if ((b & 0xf0) === 0xe0) { c = b & 15; n = 2; } else if ((b & 0xf8) === 0xf0) { c = b & 7; n = 3; } else return null;
    for (let k = 1; k <= n; k++) {
      const x = bytes[i + k];
      if (x === undefined || (x & 0xc0) !== 0x80) return null;
      c = (c << 6) | (x & 63);
    }
    if ((n === 1 && c < 0x80) || (n === 2 && c < 0x800) || (n === 3 && (c < 0x10000 || c > 0x10ffff)) || (c >= 0xd800 && c <= 0xdfff)) return null;
    s += String.fromCodePoint(c);
    i += n + 1;
  }
  return s;
}

// ---------------------------------------------------------------- fields

/**
 * The name as it may appear in a code and on screen: markup characters (< > & " ' `) and control characters
 * removed, runs of whitespace made one space, trimmed, at most NAME_MAX characters. '' = no name.
 */
export function sanitizeName(v) {
  if (typeof v !== 'string') return '';
  let s = '';
  for (const ch of v) {
    const c = ch.codePointAt(0);
    if (c < 32 || (c >= 0x7f && c < 0xa0) || c === 0x2028 || c === 0x2029 || c === 0xfeff || (c >= 0x200b && c <= 0x200f) || (c >= 0x202a && c <= 0x202e) || (c >= 0x2066 && c <= 0x2069)) { s += ' '; continue; }
    if ('<>&"\'`'.includes(ch)) continue;
    s += ch;
  }
  s = s.replace(/\s+/g, ' ').trim();
  return Array.from(s).slice(0, NAME_MAX).join('').trim();
}

/** Plain starting kit for a mode (unknown fields dropped, every field a boolean or a known Path). */
export function normKit(kit, mode = 'endless') {
  const k = kit && typeof kit === 'object' ? kit : {};
  // Nebula: the twist only when not plain, so a plain kit keeps its original shape { undo }
  if (mode === 'nebula') return NEB_TWISTS.indexOf(k.twist) > 0 ? { undo: !!k.undo, twist: k.twist } : { undo: !!k.undo };
  return { hold: !!k.hold, comet: !!k.comet, perk: !!k.perk, lucky: !!k.lucky, gentle: !!k.gentle, path: PATHS.includes(k.path) ? k.path : null };
}

const isInt = (v) => typeof v === 'number' && Number.isInteger(v);

function validDateNum(n) {
  if (!isInt(n)) return false;
  const y = Math.floor(n / 10000), m = Math.floor(n / 100) % 100, d = n % 100;
  if (y < 2024 || y > 2099 || m < 1 || m > 12 || d < 1) return false;
  const dim = [31, (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
  return d <= dim;
}

/** 'YYYY-MM-DD' -> 20261022, or null. */
export function dateNum(key) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || ''));
  if (!m) return null;
  const n = Number(m[1]) * 10000 + Number(m[2]) * 100 + Number(m[3]);
  return validDateNum(n) ? n : null;
}

/** 20261022 -> '2026-10-22'. */
export function dateKeyOf(n) {
  const s = String(n);
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

/**
 * A challenge object in canonical form, or null when any field is out of bounds.
 * Endless: { v:1, mode:'endless', seed, tier, kit, score, name }
 * Nebula:  { v:1, mode:'nebula', date:'YYYY-MM-DD', seed (YYYYMMDD), tier:'standard', kit, stars, drops, score:0, name }
 * Either may end with gift:'YYYY-MM-DD' (the day a café gift was attached); the key is absent without a gift.
 */
export function normFriend(c) {
  if (!c || typeof c !== 'object') return null;
  const name = sanitizeName(c.name);
  if (c.mode === 'nebula') {
    const seed = c.date != null ? dateNum(c.date) : (validDateNum(c.seed) ? c.seed : null);
    if (seed == null) return null;
    const stars = c.stars, drops = c.drops;
    if (!isInt(stars) || stars < 0 || stars > 3 || !isInt(drops) || drops < 0 || drops > 255 || (stars > 0 && drops < 1)) return null;
    return withGift({ v: 1, mode: 'nebula', date: dateKeyOf(seed), seed, tier: 'standard', kit: normKit(c.kit, 'nebula'), stars, drops, score: 0, name }, c.gift);
  }
  if (c.mode !== 'endless') return null;
  if (!isInt(c.seed) || c.seed < 0 || c.seed > 0xffffffff) return null;
  if (!TIERS.includes(c.tier)) return null;
  if (!isInt(c.score) || c.score < 0 || c.score > MAX_SCORE) return null;
  return withGift({ v: 1, mode: 'endless', seed: c.seed, tier: c.tier, kit: normKit(c.kit), score: c.score, name }, c.gift);
}

/** Add `gift` only when there is one, so a challenge without a gift keeps its original shape. */
function withGift(f, gift) {
  const g = normGift(gift);
  if (g) f.gift = g;
  return f;
}

// ---------------------------------------------------------------- gift day

const GIFT_EPOCH = Date.UTC(2024, 0, 1);
const DAY_MS = 86400000;

/** 'YYYY-MM-DD' -> days since 2024-01-01 (0..GIFT_DAY_MAX), or null. */
export function giftDayNum(key) {
  const n = dateNum(key);
  if (n == null) return null;
  return Math.round((Date.UTC(Math.floor(n / 10000), Math.floor(n / 100) % 100 - 1, n % 100) - GIFT_EPOCH) / DAY_MS);
}

/** Days since 2024-01-01 -> 'YYYY-MM-DD'. */
export function giftDayKey(day) {
  const t = new Date(GIFT_EPOCH + day * DAY_MS);
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`;
}

/** The last day a gift can carry (2099-12-31, the same bound as every other date in a code). */
export const GIFT_DAY_MAX = 27758;

/** A gift field in canonical form ('YYYY-MM-DD') or null (no gift / not a valid day). */
function normGift(v) {
  return typeof v === 'string' && dateNum(v) != null ? v : null;
}

// ---------------------------------------------------------------- codec

/** Challenge object -> 'NC1-…' code, or null when it isn't valid. */
export function encodeFriend(c) {
  const f = normFriend(c);
  if (!f) return null;
  const nb = f.name ? utf8(f.name) : [];
  const neb = f.mode === 'nebula';
  const gd = f.gift ? giftDayNum(f.gift) : null;
  const b = [(neb ? 1 : 0) | ((neb ? 0 : TIERS.indexOf(f.tier)) << 1) | (nb.length ? 8 : 0) | (gd != null ? 16 : 0),
    (f.seed >>> 24) & 255, (f.seed >>> 16) & 255, (f.seed >>> 8) & 255, f.seed & 255];
  if (neb) b.push((f.kit.undo ? 1 : 0) | (Math.max(0, NEB_TWISTS.indexOf(f.kit.twist)) << 1), f.stars, f.drops);
  else {
    const k = f.kit;
    b.push((k.hold ? 1 : 0) | (k.comet ? 2 : 0) | (k.perk ? 4 : 0) | (k.lucky ? 8 : 0) | (k.gentle ? 16 : 0) | (PATHS.indexOf(k.path) << 5));
    let v = f.score;
    do { let x = v % 128; v = Math.floor(v / 128); if (v) x |= 128; b.push(x); } while (v);
  }
  if (nb.length) b.push(nb.length, ...nb);
  if (gd != null) b.push((gd >> 8) & 255, gd & 255);
  const body = FRIEND_PREFIX + base64url(b);
  return body + '.' + checksum(body);
}

/**
 * Text -> { ok:true, challenge } or { ok:false, error } (a FRIEND_ERRORS key). Whitespace and the text around
 * the code are ignored, so the whole share message can be pasted.
 */
export function decodeFriend(text) {
  const raw = String(text == null ? '' : text);
  if (!raw.trim()) return { ok: false, error: 'empty' };
  const compact = raw.replace(/\s+/g, '');
  const m = /NC(\d+)-([A-Za-z0-9_-]+)\.([0-9a-fA-F]{6})/.exec(compact);
  if (!m) {
    const v = /NC(\d+)-/.exec(compact);
    if (v && Number(v[1]) > 1) return { ok: false, error: 'newer' };
    return { ok: false, error: v ? 'corrupt' : 'notcode' };
  }
  if (Number(m[1]) > 1) return { ok: false, error: 'newer' };
  if (m[1] !== '1') return { ok: false, error: 'notcode' };
  const body = FRIEND_PREFIX + m[2];
  if (checksum(body) !== m[3].toLowerCase()) return { ok: false, error: 'corrupt' };
  const b = fromBase64url(m[2]);
  if (!b) return { ok: false, error: 'corrupt' };
  const bad = { ok: false, error: 'invalid' };
  if (b.length < 6 || (b[0] & 0xe0)) return bad;
  const neb = (b[0] & 1) === 1;
  const tierIx = (b[0] >> 1) & 3;
  const hasName = (b[0] & 8) === 8;
  const hasGift = (b[0] & 16) === 16;
  const seed = ((b[1] << 24) | (b[2] << 16) | (b[3] << 8) | b[4]) >>> 0;
  let i = 6, c;
  if (neb) {
    if (tierIx !== 0 || (b[5] & 0xe0) || ((b[5] >> 1) & 15) >= NEB_TWISTS.length || b.length < 8) return bad;
    c = { mode: 'nebula', seed, kit: normKit({ undo: (b[5] & 1) === 1, twist: NEB_TWISTS[(b[5] >> 1) & 15] }, 'nebula'), stars: b[6], drops: b[7] };
    i = 8;
    if (!validDateNum(seed)) return bad;
  } else {
    if (tierIx > 2 || (b[5] & 0x80)) return bad;
    const k = b[5];
    let score = 0, mul = 1, x;
    do {
      x = b[i++];
      if (x === undefined || mul > 128 ** 4) return bad;
      score += (x & 127) * mul; mul *= 128;
    } while (x & 128);
    if (x === 0 && mul > 128) return bad; // not the shortest form
    c = { mode: 'endless', seed, tier: TIERS[tierIx], score,
      kit: { hold: !!(k & 1), comet: !!(k & 2), perk: !!(k & 4), lucky: !!(k & 8), gentle: !!(k & 16), path: PATHS[(k >> 5) & 3] } };
  }
  let name = '';
  if (hasName) {
    const len = b[i++];
    if (!len || len > NAME_BYTES_MAX || i + len > b.length) return bad;
    name = fromUtf8(b.slice(i, i + len));
    i += len;
    if (!name || sanitizeName(name) !== name) return bad;
  }
  if (hasGift) {
    if (i + 2 > b.length) return bad;
    const day = (b[i] << 8) | b[i + 1];
    i += 2;
    if (day > GIFT_DAY_MAX) return bad;
    c.gift = giftDayKey(day);
  }
  if (i !== b.length) return bad;
  c.name = name;
  const f = normFriend(c);
  if (!f) return bad;
  return { ok: true, challenge: f, code: body + '.' + m[3].toLowerCase() };
}

export function friendErrorText(err) {
  return FRIEND_ERRORS[err] || FRIEND_ERRORS.corrupt;
}

// ---------------------------------------------------------------- words

const n = (v) => Math.floor(v || 0).toLocaleString('en-US');

/** "Mum", or "Your friend" when the code had no name. */
export function whoName(c) { return (c && c.name) || 'Your friend'; }
/** "Mum's", "Your friend's". */
export function whose(c) { return `${whoName(c)}'s`; }
export const starText = (s) => '★'.repeat(s) + '☆'.repeat(3 - s);

/** What the sender did: "12,340" (Endless) / "solved in 14 drops ★★★" / "not solved yet". */
export function resultText(c) {
  if (c.mode === 'nebula') return c.stars > 0 ? `solved in ${n(c.drops)} drops ${starText(c.stars)}` : 'not solved yet';
  return n(c.score);
}

/** "Mum's challenge: beat 12,340" (the enter-code card and the run banner). */
export function goalLine(c) {
  if (c.mode === 'nebula') return c.stars > 0 ? `${whose(c)} challenge: solve it in ${n(c.drops)} drops or fewer` : `${whose(c)} challenge: solve this puzzle`;
  return `${whose(c)} challenge: beat ${n(c.score)}`;
}

/** The message that goes with a code. No link: the code is all a friend needs. A gift adds one plain line. */
export function shareText(c, code) {
  const g = c.gift ? ` ${GIFT_TEXT.share}` : '';
  if (c.mode === 'nebula') {
    const d = c.stars > 0 ? `I solved this Nova's Café puzzle in ${n(c.drops)} drops ${starText(c.stars)}. Can you beat that?` : 'Can you solve this Nova\'s Café puzzle? It beat me!';
    return `${d}${g} Code: ${code}`;
  }
  return `Can you beat my ${n(c.score)} in Nova's Café?${g} Code: ${code}`;
}

/**
 * Gift words (warm and plain; the café pays, never the sender; nothing asks for a gift or a reply).
 * `line` keys are giftStatus() results ('ready' is shown once the gift has been opened).
 */
export const GIFT_TEXT = Object.freeze({
  toggle: 'Add a little gift from the café',
  note: `A little gift from the café rides along with your challenge: ${n(GIFT_COINS)} coins for them. The café pays, so your own coins stay yours.`,
  share: `A little gift from the café rides along: ${n(GIFT_COINS)} coins.`,
  line: Object.freeze({
    ready: `A little gift from the café came with this code: ${n(GIFT_COINS)} coins, now in your purse.`,
    claimed: 'You have already opened the café gift on this code.',
    today: 'You have opened a café gift today. This one will keep for another day.',
    mine: 'This is the gift you sent. It opens for the person you send it to.',
    future: 'This gift is dated a day that hasn\'t arrived here yet. It will keep.',
  }),
});

/** The gift line for a status ('' when the code carries no gift). */
export function giftLine(status) { return GIFT_TEXT.line[status] || ''; }

/** A short label for one run: "13,050" or "14 drops ★★★" / "not solved". */
function shortResult(mode, r) {
  if (mode === 'nebula') return r.stars > 0 ? `${n(r.drops)} drops ${starText(r.stars)}` : 'not solved';
  return n(r.score);
}

/**
 * Compare the player's run with the challenge (real numbers only, never altered).
 * mine: { score } (Endless) or { stars, drops } (Nebula; stars 0 = not solved).
 * Nebula: more stars wins, then fewer drops; both unsolved is a tie.
 * Returns { outcome: 'win'|'lose'|'tie', line: "You 13,050 · Mum 12,340", title }.
 */
export function compareFriend(c, mine) {
  let diff;
  if (c.mode === 'nebula') {
    const ms = Math.max(0, Math.min(3, Math.floor(mine.stars || 0)));
    const md = Math.floor(mine.drops || 0);
    diff = ms !== c.stars ? ms - c.stars : ms === 0 ? 0 : c.drops - md;
  } else diff = Math.floor(mine.score || 0) - c.score;
  const outcome = diff > 0 ? 'win' : diff < 0 ? 'lose' : 'tie';
  const line = `You ${shortResult(c.mode, mine)} · ${whoName(c)} ${shortResult(c.mode, c)}`;
  const title = outcome === 'win' ? 'You won!' : outcome === 'tie' ? 'A perfect tie!' : 'So close, try again?';
  return { outcome, line, title };
}

/** The reply on the same puzzle: same seed, tier and kit, the player's own result and (optional) name. */
export function replyChallenge(c, mine, name = '') {
  if (c.mode === 'nebula') return normFriend({ mode: 'nebula', seed: c.seed, kit: c.kit, stars: Math.max(0, Math.min(3, mine.stars | 0)), drops: Math.max(0, Math.min(255, mine.drops | 0)), name });
  return normFriend({ mode: 'endless', seed: c.seed, tier: c.tier, kit: c.kit, score: Math.max(0, Math.min(MAX_SCORE, Math.floor(mine.score || 0))), name });
}

// ---------------------------------------------------------------- save (save.friends)

/** Default save field: the player's own name (typed by them, '' until then) and the last RECENT_MAX challenges. */
export function defaultFriends() { return { name: '', list: [], gifts: { day: '', got: [] } }; }

/** Same puzzle = same mode and seed (and tier for Endless, café twist for the Daily); the rest of the kit comes with the seed. */
export function samePuzzle(a, b) {
  const tw = (c) => (c.kit && NEB_TWISTS.includes(c.kit.twist) ? c.kit.twist : 'plain');
  return !!a && !!b && a.mode === b.mode && a.seed === b.seed && (a.mode === 'nebula' ? tw(a) === tw(b) : a.tier === b.tier);
}

/**
 * Clean save.friends in place: entries must hold a valid code; `mine` true = sent by this player;
 * `best` = this player's best result on it (Endless score / Nebula {stars,drops}) or null; `at` ms.
 */
export function sanitizeFriends(s) {
  const f = s.friends && typeof s.friends === 'object' && !Array.isArray(s.friends) ? s.friends : {};
  const out = { name: sanitizeName(f.name), list: [], gifts: cleanGifts(f.gifts) };
  for (const e of Array.isArray(f.list) ? f.list : []) {
    if (!e || typeof e !== 'object' || typeof e.code !== 'string' || e.code.length > 200) continue;
    const d = decodeFriend(e.code);
    if (!d.ok || out.list.some((x) => samePuzzle(decodeFriend(x.code).challenge, d.challenge) && !!x.mine === !!e.mine)) continue;
    out.list.push({ code: d.code, mine: !!e.mine, best: cleanBest(d.challenge.mode, e.best), at: isInt(e.at) && e.at > 0 ? e.at : 0 });
    if (out.list.length >= RECENT_MAX) break;
  }
  s.friends = out;
  return out;
}

/** save.friends.gifts: { day: a valid 'YYYY-MM-DD' or '', got: unique 6-hex checksums, the newest GIFT_KEEP }. */
function cleanGifts(g) {
  const o = g && typeof g === 'object' && !Array.isArray(g) ? g : {};
  const got = [];
  for (const k of Array.isArray(o.got) ? o.got : []) if (typeof k === 'string' && /^[0-9a-f]{6}$/.test(k) && !got.includes(k)) got.push(k);
  return { day: typeof o.day === 'string' && dateNum(o.day) != null ? o.day : '', got: got.slice(-GIFT_KEEP) };
}

function cleanBest(mode, b) {
  if (b == null) return null;
  if (mode === 'nebula') {
    if (!b || typeof b !== 'object' || !isInt(b.stars) || b.stars < 0 || b.stars > 3 || !isInt(b.drops) || b.drops < 0 || b.drops > 255) return null;
    return { stars: b.stars, drops: b.drops };
  }
  return isInt(b) && b >= 0 && b <= MAX_SCORE ? b : null;
}

/** Is result a better than result b on this mode (null b = anything is better)? */
function better(mode, a, b) {
  if (b == null) return true;
  if (mode === 'nebula') return a.stars !== b.stars ? a.stars > b.stars : a.stars > 0 && a.drops < b.drops;
  return a > b;
}

/**
 * Put a challenge at the top of the recent list (newest first, at most RECENT_MAX). The same puzzle from the same
 * side replaces its old entry (keeping the player's best on it). Returns the entry.
 */
export function rememberFriend(s, code, { mine = false, now = Date.now() } = {}) {
  const fr = s.friends && Array.isArray(s.friends.list) ? s.friends : sanitizeFriends(s);
  const d = decodeFriend(code);
  if (!d.ok) return null;
  const old = fr.list.find((x) => !!x.mine === !!mine && samePuzzle(decodeFriend(x.code).challenge, d.challenge));
  const e = { code: d.code, mine: !!mine, best: old ? old.best : null, at: now };
  fr.list = [e, ...fr.list.filter((x) => x !== old)].slice(0, RECENT_MAX);
  return e;
}

/** Book the player's result on a received challenge (keeps their best on it; never touches any other best). */
export function recordFriendResult(s, code, mine) {
  const fr = s.friends && Array.isArray(s.friends.list) ? s.friends : sanitizeFriends(s);
  const d = decodeFriend(code);
  if (!d.ok) return null;
  let e = fr.list.find((x) => !x.mine && samePuzzle(decodeFriend(x.code).challenge, d.challenge));
  if (!e) e = rememberFriend(s, code);
  const mode = d.challenge.mode;
  const r = mode === 'nebula' ? { stars: Math.max(0, Math.min(3, mine.stars | 0)), drops: Math.max(0, Math.min(255, mine.drops | 0)) } : Math.max(0, Math.min(MAX_SCORE, Math.floor(mine.score || 0)));
  if (better(mode, r, e.best)) e.best = r;
  return e;
}

/** The recent list, decoded, for the enter-code sheet: [{ entry, challenge }]. */
export function recentFriends(s) {
  const list = s.friends && Array.isArray(s.friends.list) ? s.friends.list : [];
  const out = [];
  for (const e of list) { const d = decodeFriend(e.code); if (d.ok) out.push({ entry: e, challenge: d.challenge }); }
  return out;
}

// ---------------------------------------------------------------- café gifts (save.friends.gifts)

function giftState(s) {
  const fr = s.friends && Array.isArray(s.friends.list) ? s.friends : sanitizeFriends(s);
  if (!fr.gifts || !Array.isArray(fr.gifts.got) || typeof fr.gifts.day !== 'string') fr.gifts = cleanGifts(fr.gifts);
  return fr;
}

/** Today's local day key, 'YYYY-MM-DD' (the same as meta/daily.js dayKey, kept local so this module stays dependency-free). */
function localDay(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Can this device open the gift on a code today? 'none' (no gift on it, or not a code), 'mine' (this player sent it),
 * 'claimed' (already opened here), 'future' (dated more than a day ahead of here), 'today' (a gift was already opened
 * today; it keeps), 'ready'. `today` is the local 'YYYY-MM-DD'.
 */
export function giftStatus(s, code, today = localDay()) {
  const d = decodeFriend(code);
  if (!d.ok || !d.challenge.gift) return 'none';
  const fr = giftState(s);
  if (fr.list.some((e) => e.mine && e.code === d.code)) return 'mine';
  if (fr.gifts.got.includes(d.code.slice(-6))) return 'claimed';
  const td = giftDayNum(today);
  if (td != null && giftDayNum(d.challenge.gift) > td + 1) return 'future';
  if (fr.gifts.day && (td == null || fr.gifts.day >= today)) return 'today';
  return 'ready';
}

/**
 * Open the gift on a code: when giftStatus is 'ready', add GIFT_COINS to the player's coins (paid by the game, never
 * by the sender), remember the code and the day. Returns { ok, status, coins } (coins 0 unless ok).
 */
export function claimGift(s, code, today = localDay()) {
  const status = giftStatus(s, code, today);
  if (status !== 'ready') return { ok: false, status, coins: 0 };
  const fr = giftState(s);
  const key = decodeFriend(code).code.slice(-6);
  fr.gifts.got = [...fr.gifts.got, key].slice(-GIFT_KEEP);
  fr.gifts.day = giftDayNum(today) != null ? today : fr.gifts.day;
  s.coins = Math.max(0, Math.floor((Number(s.coins) || 0) + GIFT_COINS));
  return { ok: true, status, coins: GIFT_COINS };
}
