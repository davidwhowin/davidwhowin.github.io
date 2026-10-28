// First-session rewards: "New discovery" for each orb tier the player makes for the
// first time ever, plus an early milestone gift. Meta only: never touches score or rules.
// Save fields (additive, backward compatible): save.discovered = [tier, ...].

export const DISCOVERY_MIN_TIER = 2;           // Dust (1) is never "made", so start at Pebble
export const discoveryReward = (tier) => 15 * tier; // Pebble 30 ... Supernova 150 (810 total)

/** Milestone gifts for first clears of early Journey levels. */
export const LEVEL_GIFTS = { 5: { skin: 'seaside' } }; // Seaside Café pieces (docs/UX_RETENTION.md item 3: a café gift in a café game)

/**
 * Existing players (save made before this feature) get their known tiers marked as
 * discovered without a reward, so nobody gets a flood of cards.
 * `raw` is the parsed localStorage object (or null for a new player).
 */
export function seedDiscoveries(save, raw) {
  if (raw && Array.isArray(raw.discovered)) return;
  const known = [];
  if (raw && (raw.runs || 0) > 0) {
    const hi = Math.max(0, Math.floor(Number(raw.stats && raw.stats.highestTier) || 0));
    for (let t = DISCOVERY_MIN_TIER; t <= Math.min(10, hi); t++) known.push(t);
  }
  save.discovered = known;
}

/** Mark a tier as made. Returns the coin reward (0 if already discovered). Adds the coins. */
export function discoverTier(save, tier) {
  if (tier < DISCOVERY_MIN_TIER || tier > 10) return 0;
  if (!Array.isArray(save.discovered)) save.discovered = [];
  if (save.discovered.includes(tier)) return 0;
  save.discovered.push(tier);
  const coins = discoveryReward(tier);
  save.coins += coins;
  return coins;
}

/** Grant the milestone gift for a first clear of level n. Returns { skin } or null. */
export function claimLevelGift(save, n) {
  const g = LEVEL_GIFTS[n];
  if (!g) return null;
  if (g.skin) {
    if (save.skins.owned.includes(g.skin)) return null;
    save.skins.owned.push(g.skin);
    return { skin: g.skin };
  }
  return null;
}
