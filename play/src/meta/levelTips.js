// Hard-level tip card (web v0.5.4, docs/RETENTION_RESEARCH.md idea 6). Presentation only: no rule,
// level or score changes. Before a notably hard Journey level the player sees ONE short, concrete
// strategy tip that fits that level's goals and obstacles, plus the honest label ("22 drops · Hard").
// When: the first attempt of a Hard / Super Hard level not yet won, or once after 2 fails in a row on
// any level from level 10 (TIP_MIN_LEVEL) on. Never on the same screen as the Steady Start offer (that one wins at 3 fails), never
// beside an ad (main.js skips the post-level interstitial and hides the banner), never for autoplay.
// Comfort toggle "Level tips" (settings.levelTips, default on).
// Save: tips.shown { levelN: fail streak when the card was last shown }.
import { tierName, tierNameN, hasPackNames, aTierName, pieceWord, pieceGender, tierGender, tableGrammar, capFirst } from '../game/tierNames.js'; // display names (skin-aware)
import { levelKind, LEVEL_COUNT } from '../game/levels.js';
import { failStreak, shouldOfferSteady } from './steadyStart.js';
import { t, ct } from '../i18n/index.js'; // pure lookup, no UI imports (docs/LOCALISATION.md phase 4)

export const TIP_AFTER_FAILS = 2;
/** No tip card below this level: the tutorial ramp is easy and has its own intro tips. */
export const TIP_MIN_LEVEL = 10;

/** Which of `len` tip variants level n shows (deterministic per level). */
const pick = (len, n) => ((n % len) + len) % len;

/**
 * The one strategy tip for a level (pure; deterministic per level). Text: content keys strategy.* (docs/LOCALISATION.md
 * phase 4); the look's piece word and tier names are passed in as {orb} / {orbs} / {name} / {aName} / {from}.
 */
export function levelTipText(level, skin) {
  const n = level.n || 1;
  const goals = level.goals || [];
  const g = (type) => goals.find((x) => x.type === type);
  const ast = g('asteroids');
  const combo = g('combo');
  const tier = goals.filter((x) => x.type === 'tier').sort((a, b) => b.tier - a.tier)[0];
  const score = g('score');
  const nova = g('supernova');
  const pack = hasPackNames(skin);
  // a pack skin's pieces are sushi, koi or cats, not orbs (display only)
  const orb = pieceWord(false, skin), orbs = pieceWord(true, skin);
  const gender = pieceGender(skin); // a translation agrees "{orb}" lines through key.<gender> variants (English has none)
  const v = pick(2, n); // which of the two variants (asteroids, big tier)
  if (ast) return ct(`strategy.asteroids.${v}`, { orbs });
  if (level.tide) return ct('strategy.tide', { n: level.tide, orbs });
  if (nova) {
    return pack
      ? ct('strategy.supernovaPack', { aName: capFirst(aTierName(10, skin)), from: tierNameN(9, 2, skin), orb, gender: tierGender(9, skin) })
      : ct('strategy.supernova');
  }
  if (tier && tier.tier >= 6) {
    const name = tierName(tier.tier, skin);
    return ct(`strategy.bigTier.${v}`, { name, aName: aTierName(tier.tier, skin), orb, orbs, gender });
  }
  if (combo && combo.count >= 3) return ct('strategy.combo', { count: combo.count, orbs });
  if (score) return ct('strategy.score', { orb, gender });
  if (tier) {
    const name = tierName(tier.tier, skin);
    // English cosmic tips say "two Moon orbs" (singular); a translation names the plural ("zwei Monde")
    const from = pack || tableGrammar() ? tierNameN(tier.tier - 1, 2, skin) : tierName(tier.tier - 1, skin);
    const p = { name, aName: aTierName(tier.tier, skin), from, gender: tierGender(tier.tier - 1, skin) };
    if (!pack) return from ? ct('strategy.tier', p) : ct('strategy.tierFirst', p);
    return from ? ct('strategy.tierPack', p) : ct('strategy.tierPackFirst', p);
  }
  return ct('strategy.calm', { orb, gender });
}

/** Short honest label: "22 drops · Hard". */
export function levelTipLabel(level) {
  const kind = level.kind || levelKind(level.n || 1);
  const n = Number(level.drops || 0).toLocaleString('en-US');
  if (kind === 'superhard') return t('tipLabel.superHard', { n });
  return kind === 'hard' ? t('tipLabel.hard', { n }) : t('tipLabel.normal', { n });
}

function shownMap(save) {
  if (!save.tips || typeof save.tips !== 'object' || Array.isArray(save.tips)) save.tips = { shown: {} };
  const m = save.tips.shown;
  if (!m || typeof m !== 'object' || Array.isArray(m)) save.tips.shown = {};
  return save.tips.shown;
}

/**
 * Show the tip card before this attempt at level n? Never for autoplay, never when the Steady Start
 * offer is due (never both on one screen), never when the setting is off.
 */
export function tipDue(save, n) {
  if (!save || !save.settings || save.settings.levelTips === false || save.settings.autoplay) return false;
  if (!(n >= TIP_MIN_LEVEL)) return false;
  if (shouldOfferSteady(save, n)) return false;
  const streak = failStreak(save, n);
  const m = save.tips && save.tips.shown && typeof save.tips.shown === 'object' ? save.tips.shown : {};
  const last = Object.prototype.hasOwnProperty.call(m, n) ? Math.floor(Number(m[n]) || 0) : -1;
  if (streak >= TIP_AFTER_FAILS) return last < TIP_AFTER_FAILS; // once after 2 fails in a row
  const won = ((save.journey && save.journey.stars && save.journey.stars[n]) || 0) > 0;
  return streak === 0 && !won && levelKind(n) !== 'normal' && last < 0; // first attempt of a Hard level
}

/** The card was shown for this attempt. */
export function markTipShown(save, n) {
  shownMap(save)[n] = failStreak(save, n);
}

/** Save sanitiser: tips.shown { 1..LEVEL_COUNT: integer 0..999 }; settings.levelTips boolean (default on). */
export function sanitizeTips(save) {
  const m = shownMap(save);
  for (const k of Object.keys(m)) {
    const v = Math.floor(Number(m[k]));
    if (!/^[1-9]\d*$/.test(k) || Number(k) > LEVEL_COUNT || !Number.isFinite(v) || v < 0) delete m[k];
    else m[k] = Math.min(999, v);
  }
  for (const k of Object.keys(save.tips)) if (k !== 'shown') delete save.tips[k];
  if (save.settings && typeof save.settings.levelTips !== 'boolean') save.settings.levelTips = true;
}
