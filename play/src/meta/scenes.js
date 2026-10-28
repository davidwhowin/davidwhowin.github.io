// Sky scenes (v0.5.8) and Cosmic pack nebulas (v3): coin-priced backgrounds in the Shop (Skins tab). Pure functions,
// no DOM.
//
// Fairness rules (DESIGN.md "Sky scenes", v3 "Ethics"):
//  - Cosmetic only: a background never changes a rule, a score or a seed.
//  - Coins only (v3: Stardust is gone). No ad-gating, no timers, no "limited" copy, no rotation pressure, no draws:
//    you see exactly what you get (a full-screen live preview for scenes) before buying.
//  - Not sold for real money directly. Coins can be topped up with coin packs as usual, so the coin
//    price shows its ≈ $ equivalent at the base pack rate, like every other coin price.
//  - Owned forever. save.scenesOwned = [scene id, ...]; save.backdropsOwned = [nebula id, ...] (sanitised on load).
//  - v3: the nebulas that used to come only from Star Capsules or Comet Week are sold directly in the Cosmic pack
//    at COSMIC_NEBULA_PRICE coins each. Season nebulas are not sold (they stay with whoever earned or bought them).
import { SCENE_BACKDROPS, BACKDROP_BY_ID } from '../game/backdrops.js';
import { CAPSULE_NEBULAS, COMET_PRIZES, THEMES } from './legacyCatalog.js';

/** Same price for every scene: about a week of ordinary play. */
export const SCENE_PRICE = Object.freeze({ coins: 3000 });
/** Former capsule and Comet Week nebulas, sold in the Cosmic pack. */
export const COSMIC_NEBULA_PRICE = 1500;
export const COSMIC_NEBULAS = Object.freeze([...CAPSULE_NEBULAS, ...COMET_PRIZES]);

export const SCENES = SCENE_BACKDROPS;
export const isScene = (id) => !!(BACKDROP_BY_ID[id] && BACKDROP_BY_ID[id].scene);

export function ownsScene(save, id) {
  return !!(save && Array.isArray(save.scenesOwned) && save.scenesOwned.includes(id));
}

const coinsOf = (save) => Math.max(0, Math.floor(Number(save.coins) || 0));

/**
 * Buy a Sky scene for coins. Returns true and adds it to save.scenesOwned, or false (unknown id, already owned, not
 * enough coins, or any currency other than coins). Never touches anything else.
 */
export function buyScene(save, id, currency = 'coins') {
  // Sky scenes only: pack scenes (PACK_BACKDROPS, src/meta/packs.js) are never sold for coins
  if (currency !== 'coins' || !SCENE_BACKDROPS.some((b) => b.id === id) || ownsScene(save, id)) return false;
  const have = coinsOf(save);
  if (have < SCENE_PRICE.coins) return false;
  save.coins = have - SCENE_PRICE.coins;
  if (!Array.isArray(save.scenesOwned)) save.scenesOwned = [];
  save.scenesOwned.push(id);
  return true;
}

export function ownsNebula(save, id) {
  return !!(save && Array.isArray(save.backdropsOwned) && save.backdropsOwned.includes(id));
}

/** Buy a Cosmic pack nebula (former capsule / Comet Week nebula) for COSMIC_NEBULA_PRICE coins. */
export function buyNebula(save, id) {
  if (!COSMIC_NEBULAS.includes(id) || !BACKDROP_BY_ID[id] || ownsNebula(save, id)) return false;
  const have = coinsOf(save);
  if (have < COSMIC_NEBULA_PRICE) return false;
  save.coins = have - COSMIC_NEBULA_PRICE;
  if (!Array.isArray(save.backdropsOwned)) save.backdropsOwned = [];
  save.backdropsOwned.push(id);
  return true;
}

/** Repair save.scenesOwned in place: known scene ids only (Sky scenes and pack scenes), no duplicates. */
export function sanitizeScenes(save) {
  const owned = Array.isArray(save.scenesOwned) ? save.scenesOwned : [];
  save.scenesOwned = owned.filter((id, i) => typeof id === 'string' && isScene(id) && owned.indexOf(id) === i);
  return save.scenesOwned;
}

const LEGACY_NEBULAS = new Set([...COSMIC_NEBULAS, ...THEMES.flatMap((t) => t.nebulas)]);

/**
 * Repair save.backdropsOwned in place: strings only, no duplicates, and only ids that are (or were) owned nebulas.
 * Lenient on purpose: a legacy nebula id is kept even if the art catalogue moves it, so nothing owned is ever lost.
 */
export function sanitizeBackdropsOwned(save) {
  const owned = Array.isArray(save.backdropsOwned) ? save.backdropsOwned : [];
  const ok = (id) => LEGACY_NEBULAS.has(id) || !!(BACKDROP_BY_ID[id] && BACKDROP_BY_ID[id].index === -1 && !BACKDROP_BY_ID[id].scene);
  save.backdropsOwned = owned.filter((id, i) => typeof id === 'string' && ok(id) && owned.indexOf(id) === i);
  return save.backdropsOwned;
}

/** Second-tab safety helper: true if the stored save owns a different set of scenes or nebulas. */
export function scenesDiffer(mem, stored) {
  if (!stored || typeof stored !== 'object') return false;
  const list = (v) => JSON.stringify(Array.isArray(v) ? v.slice().sort() : []);
  return list(mem && mem.scenesOwned) !== list(stored.scenesOwned) || list(mem && mem.backdropsOwned) !== list(stored.backdropsOwned);
}
