// Predictable ad breaks (v0.5.3, docs/PSYCH_RESEARCH.md §5 J): the plain-English line shown on
// result screens. The forecast itself comes from AdDirector.adBreakForecast() (read-only; it
// never changes caps or timing). Kept separate so main.js / screens.js need no static import of
// the ads module, which is loaded fail-safe.
import { quietUntilLabel, quietForecastLine } from './quietEvening.js';
import { t, tp } from '../i18n/index.js'; // pure lookup, no UI imports (docs/LOCALISATION.md phase 4)

/**
 * f: a forecast from forecastAdBreak() ({kind:'removed'|'quiet'|'maybe'|'none', gamesUntil, until}), or null.
 * doneButton: the screen has a "Done for now" button (which never shows an interstitial).
 * Returns the line, or null to show nothing.
 */
export function adBreakLine(f, { doneButton = false } = {}) {
  if (!f || typeof f !== 'object' || !f.kind) return null;
  if (f.kind === 'removed') return t('adBreak.removed');
  if (f.kind === 'quiet') return quietForecastLine(quietUntilLabel(f.until));
  if (f.kind === 'maybe') return doneButton ? t('adBreak.maybeDone') : t('adBreak.maybe');
  if (f.kind !== 'none') return null;
  const n = Math.max(1, Math.floor(Number(f.gamesUntil) || 1));
  return tp('adBreak.none', n, { n });
}
