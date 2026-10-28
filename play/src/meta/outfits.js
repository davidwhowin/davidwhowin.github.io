// Keeper outfits (from the cut Starlight Season premium track). Pure functions, no DOM.
// The legacy four are no longer earnable in v3: whoever owns one keeps it and can still wear it. Seasonal
// paths add new free ones (SEASON_OUTFITS); the Café Club gives café keepsakes (CLUB_KEEPSAKES). The catalogue is frozen in
// src/meta/legacyCatalog.js.
//
// Save shape: save.outfits = { owned: [outfitId...], equipped: outfitId | null }
import { OUTFITS as LEGACY_OUTFITS } from './legacyCatalog.js';

/** Outfits earned on a seasonal path (src/meta/seasonal.js). Free, kept forever. Ids are permanent. */
export const SEASON_OUTFITS = Object.freeze([
  Object.freeze({ id: 'knithat', name: 'Knitted Bobble Hat' }),
  Object.freeze({ id: 'earmuffs', name: 'Fluffy Earmuffs' }),
]);
/**
 * Café Club keepsakes (src/meta/pass.js): one comes with each 30-day Club block, in this order, kept forever.
 * The order is the member's own (block 1 gives the first, block 2 the second, ...), never the calendar, so no
 * keepsake is ever "this month only" or "last chance". After all six, a Club month gives no new keepsake (the shop
 * says so). Paid-only: Transfer progress keeps them local (src/meta/transfer.js). Ids are permanent.
 */
export const CLUB_KEEPSAKES = Object.freeze([
  Object.freeze({ id: 'cafe_beret', name: 'Café Beret' }),
  Object.freeze({ id: 'teacup_hat', name: 'Teacup Hat' }),
  Object.freeze({ id: 'baker_toque', name: 'Baker’s Toque' }),
  Object.freeze({ id: 'gingham_bow', name: 'Gingham Bow' }),
  Object.freeze({ id: 'seaside_sunhat', name: 'Seaside Sun Hat' }),
  Object.freeze({ id: 'croissant_clip', name: 'Croissant Clip' }),
]);
export const CLUB_KEEPSAKE_IDS = Object.freeze(CLUB_KEEPSAKES.map((o) => o.id));
export const OUTFITS = Object.freeze([...LEGACY_OUTFITS, ...SEASON_OUTFITS, ...CLUB_KEEPSAKES]);
export const OUTFIT_BY_ID = Object.freeze(Object.fromEntries(OUTFITS.map((o) => [o.id, o])));

export function defaultOutfits() { return { owned: [], equipped: null }; }

/** Repair save.outfits in place (only known outfit ids; equipped must be owned). */
export function sanitizeOutfits(save) {
  const o = save.outfits && typeof save.outfits === 'object' && !Array.isArray(save.outfits) ? save.outfits : defaultOutfits();
  const raw = Array.isArray(o.owned) ? o.owned : [];
  const owned = raw.filter((id, i) => typeof id === 'string' && OUTFIT_BY_ID[id] && raw.indexOf(id) === i);
  save.outfits = { owned, equipped: owned.includes(o.equipped) ? o.equipped : null };
  return save.outfits;
}

export function equipOutfit(save, id) {
  if (!save.outfits) sanitizeOutfits(save);
  if (id == null) { save.outfits.equipped = null; return true; }
  if (!save.outfits.owned.includes(id)) return false;
  save.outfits.equipped = id;
  return true;
}

export function equippedOutfit(save) {
  const o = save && save.outfits;
  return o && o.equipped && Array.isArray(o.owned) && o.owned.includes(o.equipped) ? o.equipped : null;
}
