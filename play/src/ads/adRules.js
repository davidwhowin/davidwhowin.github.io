// Nova Drop: the ad caps and ad rewards as plain data (no side effects, no SDK).
// AdDirector enforces AD_RULES; the in-game "How ads work here" page (src/meta/adsInfo.js) is
// written from the same objects, so the page can never drift from what the game actually does.
// The C# port keeps the same numbers in Scripts/Ads/AdDirector.cs. Don't loosen these without
// updating DESIGN.md (Ads).

export const AD_RULES = Object.freeze({
  MIN_LIFETIME_RUNS: 3,        // no interstitial until this many games have been finished
  MIN_SEC_SINCE_ANY_AD: 150,   // gap after any ad (chosen or not)
  MIN_RUN_SEC: 45,             // the game just finished lasted at least this long
  MIN_SEC_SINCE_REWARDED: 180, // gap after an ad the player chose to watch
  RUNS_PER_INTERSTITIAL: 2,    // at most one interstitial per this many games
  // Fewer ad breaks for regulars (DESIGN.md Ads): once the player has played on REGULAR_DAYS distinct days (her own
  // save.playDays, src/meta/playDays.js), the two caps below apply instead, whichever is STRICTER (AdDirector takes the
  // max). They can only make ad breaks rarer, never more frequent. Never tied to ad value, spending or device data.
  REGULAR_DAYS: 14,                    // distinct play days before the regulars' caps apply
  REGULAR_RUNS_PER_INTERSTITIAL: 3,    // regulars: at most one interstitial per this many games
  REGULAR_MIN_SEC_SINCE_ANY_AD: 240,   // regulars: gap after any ad
  // Quiet evening (DESIGN.md Ads; src/meta/quietEvening.js): one rewarded video the player chooses on the Today sheet turns
  // interstitials off for this many hours, at most once per local day. It can only remove ad breaks, never add any.
  QUIET_HOURS: 3,
  EMPHASIS_RATIO: 0.8,         // revive offer is emphasised at >= 80% of the best (honest copy only)
  JOURNEY_FROM_LEVEL: 12,      // Journey: interstitials only after a won level from this level on
  MENU_BANNER: false,          // retired with the bottom tab bar (v0.6.14): AdMob warns that banners next to navigation
                               // cause accidental taps, so there is no banner anywhere. The two gates below stay for C# parity.
  MENU_BANNER_FROM_RUNS: 3,    // no menu banner until this many games have been finished
  MENU_BANNER_AFTER_LEVEL: 3,  // ...and not until this Journey level is cleared (same as onboarding MENU_EXTRAS_AFTER_LEVEL)
});

/** What the optional (rewarded) ads give. game.js reads these, so the page and the game agree. */
export const AD_REWARDS = Object.freeze({
  REVIVES_PER_RUN: 1,  // Endless: one "continue" offer per run
  REVIVE_ROWS: 3,      // a continue clears the top rows of orbs
  FAIL_AD_DROPS: 3,    // Journey: extra drops for an ad when out of drops (once per attempt)
  COIN_MULTIPLIER: 2,  // result screens: double the coins just earned
  DAILY_MULTIPLIER: 2, // daily reward x2
});

export const REWARDED_PLACEMENTS = Object.freeze(['revive', 'double_coins', 'reroll', 'daily_x2', 'quiet_evening']);
