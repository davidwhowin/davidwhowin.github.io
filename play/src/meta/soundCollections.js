// Sound collections (docs/MARKET_MONETIZATION_NEXT.md section 6, action 5): extra procedural soundscapes,
// three per collection, shown as their own chip group in Settings > Sound > Background sound.
// Unity port: Scripts/Meta/SoundCollections.cs + Platform/Ambience.cs. No store exists yet, so the whole collection is behind
// SOUND_COLLECTIONS_FOR_SALE. While it is false every collection backdrop is simply free to pick.
// When it is true (later) a not-owned collection shows a small price on its chips, and a tap plays a
// 20-second free preview, then the previous background sound comes back. No purchase is wired here, and
// it is never a pop-up. Every existing backdrop stays free forever.
//
// Save: the choice is the existing settings.soundBackdrop string (no new field). Unity keeps these ids
// (same field). Ownership (for later) would read save.soundCollectionsOwned.

import { withText, TEXT } from '../i18n/index.js';

export const SOUND_COLLECTIONS_FOR_SALE = false;
export const SOUND_COLLECTION_PRICE = '$1.99';
export const SOUND_PREVIEW_SECONDS = 20;

export const SOUND_COLLECTIONS = [
  {
    id: 'rainyCafe',
    name: TEXT,
    blurb: TEXT,
    backdrops: [
      withText({ id: 'awning', name: TEXT, blurb: TEXT }, 'sound.awning'),
      withText({ id: 'cups', name: TEXT, blurb: TEXT }, 'sound.cups'),
      withText({ id: 'murmur', name: TEXT, blurb: TEXT }, 'sound.murmur'),
    ],
  },
].map((c) => withText(c, `soundCollection.${c.id}`)); // text: content soundCollection.<id>.* and sound.<backdrop id>.* (docs/LOCALISATION.md phase 4c)

/** Every backdrop that belongs to a collection, flat, with its collection id. */
export const COLLECTION_BACKDROPS = SOUND_COLLECTIONS.flatMap((c) => c.backdrops.map((b) => ({ ...b, collection: c.id })));
export const COLLECTION_BACKDROP_IDS = COLLECTION_BACKDROPS.map((b) => b.id);

/** The collection a backdrop id belongs to, or null for the free list (music, rain, ocean ...). */
export function collectionOf(id) {
  const b = COLLECTION_BACKDROPS.find((x) => x.id === id);
  return b ? SOUND_COLLECTIONS.find((c) => c.id === b.collection) : null;
}

/** Does the save own this collection? (No purchase exists yet; the list is read defensively.) */
export function ownsCollection(save, collectionId) {
  const owned = save && Array.isArray(save.soundCollectionsOwned) ? save.soundCollectionsOwned : [];
  return owned.includes(collectionId);
}

/** Can the player keep this backdrop as their background sound? Free ones always; collections when not for sale or owned. */
export function canUseBackdrop(id, save, forSale = SOUND_COLLECTIONS_FOR_SALE) {
  const c = collectionOf(id);
  if (!c) return true;
  return !forSale || ownsCollection(save, c.id);
}

/** The small price to show on a chip, or null (free, owned, or not for sale). */
export function chipPrice(id, save, forSale = SOUND_COLLECTIONS_FOR_SALE) {
  return canUseBackdrop(id, save, forSale) ? null : SOUND_COLLECTION_PRICE;
}

/** What should actually play for the saved choice: a locked collection backdrop falls back to the songs. */
export function playableBackdrop(id, save, forSale = SOUND_COLLECTIONS_FOR_SALE) {
  return canUseBackdrop(id, save, forSale) ? id : 'music';
}

/**
 * A 20-second free preview of a locked backdrop. Pure: the caller injects the audio hooks and the timer,
 * so tests run it with a fake clock.
 *   play(id)    start hearing the backdrop now
 *   restore()   go back to the saved background sound
 *   setTimer(fn, ms) / clearTimer(handle)   default setTimeout / clearTimeout
 *   now()       ms clock (default Date.now), used for remaining()
 * Returns { id, endsAt, remaining(), active(), cancel() }. Starting a new preview should cancel the old one.
 */
export function startSoundPreview({ id, play, restore, seconds = SOUND_PREVIEW_SECONDS, setTimer = setTimeout, clearTimer = clearTimeout, now = Date.now }) {
  const ms = Math.max(0, seconds) * 1000;
  const t0 = now();
  let live = true;
  const end = () => {
    if (!live) return;
    live = false;
    try { restore && restore(); } catch (_) { /* never let audio break the game */ }
  };
  try { play && play(id); } catch (_) { /* ignore */ }
  const handle = setTimer(end, ms);
  return {
    id,
    endsAt: t0 + ms,
    remaining: () => (live ? Math.max(0, t0 + ms - now()) : 0),
    active: () => live,
    /** Stop early (another chip tapped, Settings closed): restores the saved sound once. */
    cancel() { if (!live) return; clearTimer(handle); end(); },
  };
}
