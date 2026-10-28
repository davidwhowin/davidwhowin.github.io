// "Closing time" (DESIGN.md): when a Journey level's goals are done with drops to spare, each spare drop
// becomes a small bonus pop worth CLOSING_POINTS, shown openly on the win card
// ("Closing time bonus: 6 spare drops → +1,500"). Pure rules, mirrored in C# Core (Closing.cs).
// - Stars are decided from drops left BEFORE the bonus (starsFor), so star difficulty is unchanged.
// - The bonus is added to the level's score (an announced rule, the same for every player, never ad-linked).
// - Coins: 1 per spare drop, capped at CLOSING_COIN_CAP, on top of levelReward (only when coins are paid at all).
// - Never in the Daily Nebula (a shared puzzle ranked by stars and drops): no bonus at all there.

export const CLOSING_POINTS = 250;
export const CLOSING_COIN_CAP = 5;

/** The closing-time bonus for a won level with `dropsLeft` spare drops: { drops, score, coins }. */
export function closingBonus(level, dropsLeft) {
  const n = Math.floor(Number(dropsLeft));
  const drops = level && !level.daily && Number.isFinite(n) && n > 0 ? n : 0;
  return { drops, score: drops * CLOSING_POINTS, coins: Math.min(drops, CLOSING_COIN_CAP) };
}

/**
 * Presentation timing (not a rule): seconds between pops so the whole celebration stays within ~2.5 s
 * (pops ≤ 2.0 s plus a short settle), whatever the number of spare drops.
 */
export function closingPace(drops) {
  if (!(drops > 0)) return 0;
  return Math.min(0.24, 2.0 / drops);
}
