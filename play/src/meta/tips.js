// Thank-you tip (docs/MARKET_MONETIZATION_3.md idea 6, DESIGN.md "Thank-you tip"). Pure rules, no DOM.
// Mirror: Scripts/Core/Meta/Tips.cs.
//
// Three consumable tips live in Settings › Extras › About Nova Drop, and nowhere else: never a pop-up, a badge, a
// reminder or a "support us" line after a level or an ad. A tip gives a warm thank-you and nothing else: no coins,
// no boosters, no gameplay. The FIRST tip of any size also puts a small tip jar on the café counter as a keepsake.
// The jar is the same whatever the amount (no supporter tiers, no status, no tip count kept).
//
// Save shape: save.purchases.tipJar = true once the keepsake is given (written only when true, like noAdsBundle).
// It sits under purchases, so Transfer progress keeps it on this device (src/meta/transfer.js LOCAL_ONLY_KEYS).

/** The three tip products, smallest first. Consumables: a tip can be given again (no "tip again" prompt, ever). */
export const TIP_IDS = Object.freeze(['tip_small', 'tip_medium', 'tip_large']);
export const isTip = (id) => TIP_IDS.includes(id);

/** The keepsake: a café prop, not an outfit, so it never competes with the Café Club keepsakes. */
export const TIP_JAR = Object.freeze({ id: 'tip_jar', name: 'Tip jar on the café counter' });

/** Plain, honest copy (DESIGN.md). The lead is the About section's only tip text. */
export const TIP_LEAD = "Enjoying Nova's Café? It's made by a tiny team. If you'd like to say thanks, a tip helps us keep it calm and fair. It doesn't unlock anything else.";
export const TIP_FINE = 'A tip is optional and gives no coins, boosters or help in levels. Your first tip puts a little tip jar on the café counter, the same for any amount.';
export const TIP_THANKS = 'Thank you so much. It means a lot to our little team.';
export const TIP_JAR_LINE = 'Pip put a little tip jar on the café counter to remember it by.';

/** True once the tip-jar keepsake is given. */
export function hasTipJar(save) {
  return !!(save && save.purchases && save.purchases.tipJar === true);
}

/**
 * Apply a VERIFIED (or, in the web test build, simulated) tip. Always true for a known tip id, so the store order is
 * confirmed (consumed) every time. Returns { ok, jarNew }: jarNew is true only on the first tip ever.
 * Never touches coins, boosters or anything else.
 */
export function grantTip(save, id) {
  if (!isTip(id) || !save) return { ok: false, jarNew: false };
  if (!save.purchases || typeof save.purchases !== 'object') save.purchases = { starterPack: false, firstPackBonus: false };
  const jarNew = save.purchases.tipJar !== true;
  save.purchases.tipJar = true;
  return { ok: true, jarNew };
}

/** The thank-you line after a tip (the same for every size; the jar sentence only the first time). */
export function tipThanks(jarNew) {
  return jarNew ? `${TIP_THANKS} ${TIP_JAR_LINE}` : TIP_THANKS;
}
