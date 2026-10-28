// "How ads work here" (v0.6.0, docs/MARKET_RESEARCH.md launch readiness): the plain-English page
// reachable from Settings > Extras and from the ad-break line on result screens.
// Every number is read from AD_RULES / AD_REWARDS (src/ads/adRules.js), the same objects AdDirector
// and game.js use, so the page can never promise something the game doesn't do.
// Pure: no DOM, no save writes. screens.js renders the result.
import { AD_RULES, AD_REWARDS } from '../ads/adRules.js';
import { IAP } from './economy.js';
import { t, tp } from '../i18n/index.js'; // text: UI keys adsInfo.* (docs/LOCALISATION.md phase 4c); the numbers stay AD_RULES'

/** 45 -> "45 seconds", 150 -> "2½ minutes", 180 -> "3 minutes", 60 -> "1 minute". */
export function friendlyDuration(sec) {
  const s = Math.max(0, Math.round(Number(sec) || 0));
  if (s < 60) return tp('adsInfo.seconds', s);
  const m = Math.floor(s / 60), rest = s % 60;
  if (rest === 0) return tp('adsInfo.minutes', m);
  if (rest === 30) return t('adsInfo.minutesHalf', { n: m });
  return tp('adsInfo.seconds', s);
}

const times = (n) => (n === 1 ? t('adsInfo.once') : n === 2 ? t('adsInfo.twice') : t('adsInfo.times', { n }));
const games = (n) => tp('adsInfo.games', n);
const mult = (n) => (n === 2 ? t('adsInfo.double') : t('adsInfo.mult', { n }));

const hoursText = (n) => tp('adsInfo.hours', n);
/** The quiet-evening line (C# AdsInfo.QuietLine must match word for word). Hidden for Remove Ads owners. */
export function quietLine(hours) {
  return t('adsInfo.quiet', { hours: hoursText(Math.max(0, Math.floor(Number(hours) || 0))) });
}

/** The Café Club line on the Remove Ads section (C# AdsInfo.ClubLine must match word for word). */
export const CLUB_ADS_LINE = t('adsInfo.club'); // read once at start-up; adsInfo() reads the key itself

/** The privacy line about anonymous level stats (C# AdsInfo.StatsLine must match word for word). */
export const STATS_LINES = Object.freeze({
  get local() { return t('adsInfo.stats.local'); },
  get on() { return t('adsInfo.stats.on'); },
  get off() { return t('adsInfo.stats.off'); },
});

/**
 * The page content. opts: { removeAds, price, rules, rewards, stats, regular } (rules/rewards default to the real
 * constants; tests pass others to prove the text is generated from them). stats: the anonymous level stats mode
 * from src/meta/levelStats.js statsMode(): 'local' (no endpoint, the default), 'on' or 'off'. regular: the regulars'
 * rarer caps apply to this player (AdDirector.interstitialCaps().regular); it only swaps that rule's line for a
 * quiet thank-you version, never anything else.
 * Returns { title, intro, sections: [{ id, title, lead?, items: string[] }] }.
 */
export function adsInfo({ removeAds = false, price = null, rules = AD_RULES, rewards = AD_REWARDS, stats = 'local', regular = false, club = false } = {}) {
  const R = rules, W = rewards;
  const cost = price || (IAP.find((x) => x.id === 'remove_ads') || {}).price || '';
  const firstFree = R.MIN_LIFETIME_RUNS - 1;
  const sections = [];

  sections.push({
    id: 'chosen',
    title: t('adsInfo.chosen.title'),
    lead: t('adsInfo.chosen.lead'),
    items: [
      t('adsInfo.chosen.revive', { times: times(W.REVIVES_PER_RUN), rows: W.REVIVE_ROWS }),
      t('adsInfo.chosen.drops', { n: W.FAIL_AD_DROPS, times: times(1) }),
      t('adsInfo.chosen.coins', { mult: mult(W.COIN_MULTIPLIER) }),
      t('adsInfo.chosen.daily', { mult: mult(W.DAILY_MULTIPLIER) }),
      t('adsInfo.chosen.perks'),
      ...(removeAds || club ? [] : [quietLine(R.QUIET_HOURS)]), // the offer is hidden from owners and Club members
    ],
  });

  const firstLine = firstFree <= 0 ? t('adsInfo.breaks.minRuns', { games: games(R.MIN_LIFETIME_RUNS) })
    : firstFree === 1 ? t('adsInfo.breaks.minRunsFirstOne', { games: games(R.MIN_LIFETIME_RUNS) })
    : t('adsInfo.breaks.minRunsFirstMany', { games: games(R.MIN_LIFETIME_RUNS), n: firstFree });
  sections.push({
    id: 'breaks',
    title: t('adsInfo.breaks.title'),
    lead: removeAds ? t('adsInfo.breaks.leadOwned') : t('adsInfo.breaks.lead'),
    items: [
      firstLine,
      t('adsInfo.breaks.every', { games: games(R.RUNS_PER_INTERSTITIAL) }),
      t('adsInfo.breaks.sinceAny', { time: friendlyDuration(R.MIN_SEC_SINCE_ANY_AD) }),
      t('adsInfo.breaks.sinceRewarded', { time: friendlyDuration(R.MIN_SEC_SINCE_REWARDED) }),
      t('adsInfo.breaks.runLength', { time: friendlyDuration(R.MIN_RUN_SEC) }),
      t('adsInfo.breaks.journey', { level: R.JOURNEY_FROM_LEVEL }),
      (regular && !removeAds ? t('adsInfo.breaks.regularNow', {
        days: R.REGULAR_DAYS, games: games(R.REGULAR_RUNS_PER_INTERSTITIAL), time: friendlyDuration(R.REGULAR_MIN_SEC_SINCE_ANY_AD),
      }) : t('adsInfo.breaks.regularLater', {
        days: R.REGULAR_DAYS, games: games(R.REGULAR_RUNS_PER_INTERSTITIAL), time: friendlyDuration(R.REGULAR_MIN_SEC_SINCE_ANY_AD),
      })),
    ],
  });

  sections.push({
    id: 'never',
    title: t('adsInfo.never.title'),
    items: [t('adsInfo.never.midGame'), t('adsInfo.never.nebula'), t('adsInfo.never.beforeTip'), t('adsInfo.never.noSurprise')],
  });

  sections.push({
    id: 'banner',
    title: t('adsInfo.banner.title'),
    items: [!R.MENU_BANNER
      ? t('adsInfo.banner.none')
      : removeAds
      ? t('adsInfo.banner.owned')
      : t('adsInfo.banner.menu', { games: games(R.MENU_BANNER_FROM_RUNS), level: R.MENU_BANNER_AFTER_LEVEL })],
  });

  sections.push({
    id: 'fair',
    title: t('adsInfo.fair.title'),
    items: [t('adsInfo.fair.difficulty'), t('adsInfo.fair.scores'), t('adsInfo.fair.losing')],
  });

  sections.push({
    id: 'privacy',
    title: t('adsInfo.privacy.title'),
    items: [t('adsInfo.privacy.noProfiling'), t('adsInfo.privacy.admob'), STATS_LINES[stats] || STATS_LINES.local],
  });

  sections.push({
    id: 'remove',
    title: t('adsInfo.remove.title'),
    items: [removeAds
      ? t('adsInfo.remove.owned')
      : cost ? t('adsInfo.remove.offerPrice', { price: cost }) : t('adsInfo.remove.offer'),
    ...(removeAds ? [] : [t('adsInfo.club')])],
  });

  return {
    title: t('adsInfo.title'),
    intro: t('adsInfo.intro'),
    sections,
  };
}

/** The whole page as plain text (tests, and a quick way to check the copy). */
export function adsInfoText(opts) {
  const p = adsInfo(opts);
  return [p.title, p.intro, ...p.sections.flatMap((s) => [s.title, s.lead || '', ...s.items])].filter(Boolean).join('\n');
}
