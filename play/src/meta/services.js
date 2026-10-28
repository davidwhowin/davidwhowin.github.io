// Defensive facade over Platform / AdDirector. main.js registers the real modules
// (loaded via dynamic import so a missing/broken module can never break the game).
// Every call is wrapped: failures are swallowed, ad promises resolve false.

let Platform = null;
let AdDirector = null;

export function registerServices(mods = {}) {
  if (mods.Platform) Platform = mods.Platform;
  if (mods.AdDirector) AdDirector = mods.AdDirector;
}

function call(obj, fn, ...args) {
  try {
    if (obj && typeof obj[fn] === 'function') return obj[fn](...args);
  } catch (e) { /* never break gameplay */ }
  return undefined;
}

async function callAsync(obj, fn, fallback, ...args) {
  try {
    if (obj && typeof obj[fn] === 'function') {
      const v = await obj[fn](...args);
      return v === undefined ? fallback : v;
    }
  } catch (e) { /* ignore */ }
  return fallback;
}

// Bottom banner overlays the page: body.has-banner adds scroll room under screens while it shows.
let lastAdAt = 0; // when the last full-screen ad finished (the evening offer never follows an ad)
let bannerGen = 0; // ignores a late "shown" result after the banner was already hidden
function setBannerSpace(on) { try { document.body.classList.toggle('has-banner', !!on); } catch (_) { /* no DOM (tests) */ } }

export const Svc = {
  // --- platform
  sfx(name, params) { call(Platform, 'sfx', name, params); },
  haptic(kind) { call(Platform, 'haptic', kind); },
  setMuted(b) { call(Platform, 'setMuted', !!b); },
  setMusic(b) { call(Platform, 'setMusic', !!b); },
  musicTracks() { return call(Platform, 'musicTracks') || []; },
  setMusicTracks(map) { call(Platform, 'setMusicTracks', map); },
  /** Returns the picked song id (or null). */
  musicNewRun() { return call(Platform, 'musicNewRun') || null; },
  previewTrack(id) { call(Platform, 'previewTrack', id); },
  currentTrack() { return call(Platform, 'currentTrack') || null; },
  setSoundBackdrop(id) { call(Platform, 'setSoundBackdrop', id); },
  previewSoundBackdrop(id, seconds) { return !!call(Platform, 'previewSoundBackdrop', id, seconds); },
  musicDebug() { return call(Platform, 'musicDebug') || null; },
  setHaptics(b) { call(Platform, 'setHaptics', !!b); },
  setEvening(b) { call(Platform, 'setEvening', !!b); },
  /** Evening calm (src/meta/windDown.js): quieter music and sound effects, the calmest song, optional waves. */
  setNightCalm(on, waves) { call(Platform, 'setNightCalm', !!on, !!waves); },
  isNative() { return !!call(Platform, 'isNative'); },
  /** OS review prompt (platform.requestReview). Resolves false on the web or on any failure. */
  async requestReview() { return !!(await callAsync(Platform, 'requestReview', false)); },

  // --- ads (all optional for the player, all fail-safe)
  onRunStart() { call(AdDirector, 'onRunStart'); },
  onRunEnd(info) { call(AdDirector, 'onRunEnd', info); },
  canOfferRevive(runState) { return !!call(AdDirector, 'canOfferRevive', runState); },
  reviveEmphasis(info) {
    const r = call(AdDirector, 'reviveEmphasis', info);
    return r && typeof r === 'object' ? r : { emphasise: false, message: 'Continue this run?' };
  },
  async showRewarded(placement) {
    const shown = !!(await callAsync(AdDirector, 'showRewarded', false, placement));
    if (shown) lastAdAt = Date.now();
    return shown;
  },
  async maybeShowInterstitial(placement) {
    // never let an interstitial hang the UI
    const p = callAsync(AdDirector, 'maybeShowInterstitial', false, placement);
    const shown = !!(await p);
    if (shown) lastAdAt = Date.now();
    return shown;
  },
  /** Seconds since a full-screen ad (rewarded or interstitial) finished; Infinity if none this session. */
  secondsSinceAd() { return lastAdAt ? (Date.now() - lastAdAt) / 1000 : Infinity; },
  setRemoveAds(b) { call(AdDirector, 'setRemoveAds', !!b); if (b) { bannerGen++; setBannerSpace(false); } },
  removeAdsOwned() { return !!call(AdDirector, 'removeAdsOwned'); },
  /** True once the regulars' (rarer) ad-break caps apply: the save's own play-day count only (AdDirector.interstitialCaps). */
  adsRegular() { const c = call(AdDirector, 'interstitialCaps'); return !!(c && c.regular); },
  /** Read-only ad-break forecast for result screens (null if ads are unavailable). */
  adBreakForecast(opts) {
    const f = call(AdDirector, 'adBreakForecast', opts);
    return f && typeof f === 'object' ? f : null;
  },
  /** Quiet evening: why the Today button is hidden (a string), or null to show it. Hidden when ads are unavailable. */
  /** A Cafe Club month is running (How ads work here hides the quiet-evening line). */
  adsClubActive() { return !!call(AdDirector, 'clubActive'); },
  quietOfferBlock() {
    if (!AdDirector) return 'ads unavailable';
    const r = call(AdDirector, 'quietOfferBlock');
    return r === undefined ? 'ads unavailable' : r;
  },
  /** Read-only { active, until, leftMs } of the quiet evening ({ active: false } when ads are unavailable). */
  quietState() {
    const q = call(AdDirector, 'quietState');
    return q && typeof q === 'object' ? q : { active: false, until: 0, leftMs: 0 };
  },
  /** Plays the quiet-evening video the player chose; resolves true only if the quiet evening started. */
  async startQuietEvening() {
    const ok = !!(await callAsync(AdDirector, 'startQuietEvening', false));
    if (ok) lastAdAt = Date.now();
    return ok;
  },
  showMenuBanner() {
    const gen = ++bannerGen;
    try {
      const p = call(AdDirector, 'showMenuBanner');
      if (p && p.then) p.then((ok) => { if (gen === bannerGen) setBannerSpace(ok); }, () => {});
    } catch (_) {}
  },
  hideBanner() {
    bannerGen++; setBannerSpace(false);
    try { const p = call(AdDirector, 'hideBanner'); if (p && p.catch) p.catch(() => {}); } catch (_) {}
  },
  adsAvailable() { return !!AdDirector; },
  /** Puzzle Books open (DESIGN.md "Puzzle Books"): no ads of any kind while true; the banner is hidden. */
  setInBook(b) { if (b) { bannerGen++; setBannerSpace(false); } call(AdDirector, 'setInBook', !!b); },
};
