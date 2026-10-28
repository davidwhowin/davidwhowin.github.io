// Café visitors (v3): friendly animal neighbours who drop by the café scene on Home once their area is restored.
// Pure rules and data, no DOM. C# mirror: Scripts/Core/Meta/Visitors.cs (fixtures: tests EditMode visitors.json).
//
// - PURELY COZY: no currency, no timer, no reward beyond a keepsake postcard. Nothing here touches a rule, a
//   score, the store or ads.
// - Arrival: a visitor shows up once their area is celebrated (save.cafe.celebrated holds the area id, the same moment
//   its Keeper moves in). The table is keyed by area id, so a new café area can add a visitor with one entry.
// - Story: each visitor tells a short story, one beat per visit. Tap them and the first beat comes at once; the next
//   beat waits for a new visit, which is "after you finish another game" (save.journal.games, a lifetime count of
//   finished games). No clock is read anywhere. Between beats, a tap gives a rotating chat line.
// - Postcard: hearing the whole story earns that visitor's postcard (painted by src/ui/postcardArt.js), kept in the
//   Postcards album (More > Postcards).
//
// Save shape: save.visitors = { by: { id: { heard, at, talks } }, cards: [id, ...] }
//   heard  story beats told so far (0..story.length)
//   at     save.journal.games when the last beat was told (the next beat needs a higher count)
//   talks  chat lines said so far (picks the next rotating line)
//   cards  postcards earned, in the order they arrived (only visitors whose story is fully heard)

import { withText, t, TEXT, LINES } from '../i18n/index.js';

export const NAT_MAX = 1000000000;

// Names, who-lines, chats, story beats and postcard text are content text visitor.<id>.* (src/i18n/content/en.js).
export const VISITORS = [
  { id: 'hazel', area: 'terrace', name: TEXT, who: TEXT, chats: LINES, story: LINES, card: { title: TEXT, note: TEXT } },
  { id: 'bookclub', area: 'counter', name: TEXT, who: TEXT, chats: LINES, story: LINES, card: { title: TEXT, note: TEXT } },
  { id: 'ducks', area: 'garden', name: TEXT, who: TEXT, chats: LINES, story: LINES, card: { title: TEXT, note: TEXT } },
  { id: 'barnaby', area: 'pier', name: TEXT, who: TEXT, chats: LINES, story: LINES, card: { title: TEXT, note: TEXT } },
  { id: 'juniper', area: 'boathouse', name: TEXT, who: TEXT, chats: LINES, story: LINES, card: { title: TEXT, note: TEXT } },
  { id: 'wren', area: 'beachHuts', name: TEXT, who: TEXT, chats: LINES, story: LINES, card: { title: TEXT, note: TEXT } },
  { id: 'marguerite', area: 'lighthouse', name: TEXT, who: TEXT, chats: LINES, story: LINES, card: { title: TEXT, note: TEXT } },
].map((v) => withText(v, `visitor.${v.id}`));

export const VISITOR_BY_ID = Object.fromEntries(VISITORS.map((v) => [v.id, v]));
export const VISITOR_IDS = VISITORS.map((v) => v.id);

export function defaultVisitors() { return { by: {}, cards: [] }; }

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const nat = (v) => (typeof v === 'number' && Number.isInteger(v) && v >= 0 ? Math.min(v, NAT_MAX) : 0);

/** Repair save.visitors in place: known visitors only, whole numbers in range, postcards only for finished stories. */
export function sanitizeVisitors(s) {
  const raw = isObj(s.visitors) ? s.visitors : {};
  const rby = isObj(raw.by) ? raw.by : {};
  const by = {};
  for (const v of VISITORS) {
    if (!Object.prototype.hasOwnProperty.call(rby, v.id) || !isObj(rby[v.id])) continue;
    const e = rby[v.id];
    by[v.id] = { heard: Math.min(nat(e.heard), v.story.length), at: nat(e.at), talks: nat(e.talks) };
  }
  const full = (id) => !!by[id] && by[id].heard >= VISITOR_BY_ID[id].story.length;
  const cards = [];
  for (const id of Array.isArray(raw.cards) ? raw.cards : []) {
    if (typeof id === 'string' && Object.prototype.hasOwnProperty.call(VISITOR_BY_ID, id) && full(id) && !cards.includes(id)) cards.push(id);
  }
  for (const v of VISITORS) if (full(v.id) && !cards.includes(v.id)) cards.push(v.id);
  s.visitors = { by, cards };
  return s.visitors;
}

/** The visit count: finished games (save.journal.games). A new story beat needs a higher count than the last one. */
export function visitStamp(save) { return nat(save && isObj(save.journal) ? save.journal.games : 0); }

function celebrated(save) {
  const c = save && isObj(save.cafe) && Array.isArray(save.cafe.celebrated) ? save.cafe.celebrated : [];
  return c;
}

/** True once visitor `id`'s area is celebrated. */
export function visitorHere(save, id) {
  const v = VISITOR_BY_ID[id];
  return !!v && celebrated(save).includes(v.area);
}

/** Visitors currently at the café, in table order. */
export function visitorsHere(save) { return VISITORS.filter((v) => celebrated(save).includes(v.area)); }

function entry(save, id) {
  const vs = save.visitors && isObj(save.visitors.by) ? save.visitors.by : null;
  return vs && isObj(vs[id]) ? vs[id] : null;
}

/** { here, heard, of, ready, done }: ready = a story beat is waiting for a tap now. */
export function visitorStatus(save, id) {
  const v = VISITOR_BY_ID[id];
  if (!v) return null;
  const e = entry(save, id);
  const heard = e ? Math.min(nat(e.heard), v.story.length) : 0;
  const here = visitorHere(save, id);
  const of = v.story.length;
  const ready = here && heard < of && (heard === 0 || visitStamp(save) > nat(e && e.at));
  return { here, heard, of, ready, done: heard >= of };
}

/**
 * Tap on visitor `id`. Returns null when they are not here, else
 * { kind: 'story' | 'chat', line, heard, of, done, card, wait }:
 *   story: the next story beat (heard counts it); card = this beat finished the story and added the postcard.
 *   chat:  a rotating line; wait = more story comes after the next finished game.
 */
export function talkToVisitor(save, id) {
  const v = VISITOR_BY_ID[id];
  if (!v || !visitorHere(save, id)) return null;
  if (!isObj(save.visitors)) save.visitors = defaultVisitors();
  if (!isObj(save.visitors.by)) save.visitors.by = {};
  if (!Array.isArray(save.visitors.cards)) save.visitors.cards = [];
  let e = save.visitors.by[id];
  if (!isObj(e)) e = save.visitors.by[id] = { heard: 0, at: 0, talks: 0 };
  e.heard = Math.min(nat(e.heard), v.story.length); e.at = nat(e.at); e.talks = nat(e.talks);
  const of = v.story.length, stamp = visitStamp(save);
  if (e.heard < of && (e.heard === 0 || stamp > e.at)) {
    const line = v.story[e.heard];
    e.heard++; e.at = stamp;
    const done = e.heard >= of;
    let card = false;
    if (done && !save.visitors.cards.includes(id)) { save.visitors.cards.push(id); card = true; }
    return { kind: 'story', line, heard: e.heard, of, done, card, wait: false };
  }
  const line = v.chats[e.talks % v.chats.length];
  e.talks = Math.min(NAT_MAX, e.talks + 1);
  return { kind: 'chat', line, heard: e.heard, of, done: e.heard >= of, card: false, wait: e.heard < of };
}

/** Earned postcards (visitor ids, in the order they arrived). */
export function visitorCards(save) {
  const c = save && isObj(save.visitors) && Array.isArray(save.visitors.cards) ? save.visitors.cards : [];
  return c.filter((id) => Object.prototype.hasOwnProperty.call(VISITOR_BY_ID, id));
}

/** The small grey line under a visitor's words in the bubble: story progress, or '' when there is nothing to say. */
export function visitorNote(r) {
  if (!r) return '';
  if (r.kind === 'story') return r.done ? t('visitor.note.done') : t('visitor.note.progress', { heard: r.heard, of: r.of });
  if (r.wait) return r.heard === 0 ? '' : t('visitor.note.wait', { heard: r.heard, of: r.of });
  return '';
}

/** True when the Postcards album has something to show: a visitor has arrived or a card is kept. */
export function albumOpen(save) { return visitorsHere(save).length > 0 || visitorCards(save).length > 0; }
