// Nova Drop — AdProvider: the only module that talks to an ad SDK.
// Native (Capacitor): @capacitor-community/admob via window.Capacitor.Plugins.AdMob
// Web: a mock full-screen overlay so the game is fully testable in a browser.
//
// Policy (WHEN to show ads) lives in adDirector.js — this file only knows HOW.
// Every public method resolves (never rejects). Failures resolve false.

// ===========================================================================
// AD CONFIG
// TODO(release): replace these Google TEST ad unit IDs with your real AdMob
// unit IDs before publishing, and set TESTING to false. Shipping test IDs
// earns nothing; clicking your own LIVE ads can get your account banned.
// Also put your real AdMob *App ID* in AndroidManifest.xml / Info.plist (see README).
// ===========================================================================
export const AD_CONFIG = {
  TESTING: true,
  android: {
    // Test App ID: ca-app-pub-3940256099942544~3347511713 (goes in AndroidManifest.xml)
    rewarded: 'ca-app-pub-3940256099942544/5224354917',
    interstitial: 'ca-app-pub-3940256099942544/1033173712',
    banner: 'ca-app-pub-3940256099942544/9214589741', // adaptive banner
  },
  ios: {
    // Test App ID: ca-app-pub-3940256099942544~1458002511 (goes in Info.plist)
    rewarded: 'ca-app-pub-3940256099942544/1712485313',
    interstitial: 'ca-app-pub-3940256099942544/4411468910',
    banner: 'ca-app-pub-3940256099942544/2435281174', // adaptive banner
  },
  // Optional: device IDs that should always receive test ads (from logcat / Xcode console).
  testingDevices: [],
  // Max time to wait for an ad to load at show time before giving up.
  loadTimeoutMs: 5000,
  // Web mock durations (seconds).
  mockRewardedSec: 5,
  mockInterstitialSkipSec: 3,
};

const log = (...a) => { try { console.debug('[Ads]', ...a); } catch (_) {} };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function withTimeout(p, ms, fallback) {
  return Promise.race([Promise.resolve(p).catch(() => fallback), sleep(ms).then(() => fallback)]);
}

function detectNative() {
  try { return !!window.Capacitor?.isNativePlatform?.(); } catch (_) { return false; }
}
function admob() {
  try { return window.Capacitor?.Plugins?.AdMob || null; } catch (_) { return null; }
}
function platformName() {
  try { return window.Capacitor?.getPlatform?.() || 'web'; } catch (_) { return 'web'; }
}
function unitIds() {
  return platformName() === 'ios' ? AD_CONFIG.ios : AD_CONFIG.android;
}

// ---------------------------------------------------------------------------
// Native state

const state = {
  initPromise: null,
  ready: false,          // SDK initialised and allowed to request ads
  rewardedLoaded: false,
  interstitialLoaded: false,
  loadingRewarded: null, // in-flight prepare promise
  loadingInterstitial: null,
  bannerCreated: false,
  bannerVisible: false,
  showing: false,
};

async function nativeInit() {
  const A = admob();
  if (!A) { log('AdMob plugin not found; ads disabled'); return false; }
  try {
    await A.initialize({
      initializeForTesting: AD_CONFIG.TESTING,
      testingDevices: AD_CONFIG.testingDevices,
    });

    // iOS App Tracking Transparency prompt (only asks once; OS remembers).
    if (platformName() === 'ios' && A.trackingAuthorizationStatus) {
      try {
        const t = await A.trackingAuthorizationStatus();
        if (t?.status === 'notDetermined') await A.requestTrackingAuthorization();
      } catch (e) { log('ATT check failed', e); }
    }

    // Google UMP consent (GDPR/UK/Swiss + US state privacy messages).
    try {
      let info = await A.requestConsentInfo();
      log('consent info', info);
      if (info?.isConsentFormAvailable && info?.status === 'REQUIRED') {
        info = await A.showConsentForm();
        log('consent form result', info);
      }
      if (info && info.canRequestAds === false) {
        log('consent says ads cannot be requested');
        return false;
      }
    } catch (e) {
      // Consent errors (e.g. offline) — fall through; SDK serves limited/non-personalised ads per prior choice.
      log('consent flow failed', e);
    }

    state.ready = true;
    preloadRewarded();
    preloadInterstitial();
    return true;
  } catch (e) {
    log('AdMob init failed', e);
    return false;
  }
}

function preloadRewarded() {
  const A = admob();
  if (!A || !state.ready || state.rewardedLoaded) return Promise.resolve(state.rewardedLoaded);
  if (state.loadingRewarded) return state.loadingRewarded;
  state.loadingRewarded = A.prepareRewardVideoAd({ adId: unitIds().rewarded, isTesting: AD_CONFIG.TESTING })
    .then(() => { state.rewardedLoaded = true; log('rewarded loaded'); return true; })
    .catch((e) => { state.rewardedLoaded = false; log('rewarded load failed', e); return false; })
    .finally(() => { state.loadingRewarded = null; });
  return state.loadingRewarded;
}

function preloadInterstitial() {
  const A = admob();
  if (!A || !state.ready || state.interstitialLoaded) return Promise.resolve(state.interstitialLoaded);
  if (state.loadingInterstitial) return state.loadingInterstitial;
  state.loadingInterstitial = A.prepareInterstitial({ adId: unitIds().interstitial, isTesting: AD_CONFIG.TESTING })
    .then(() => { state.interstitialLoaded = true; log('interstitial loaded'); return true; })
    .catch((e) => { state.interstitialLoaded = false; log('interstitial load failed', e); return false; })
    .finally(() => { state.loadingInterstitial = null; });
  return state.loadingInterstitial;
}

/** Resolve when any of the given plugin events fires (or after maxMs). Returns {promise, cleanup}. */
function waitForEvents(A, names, maxMs) {
  const handles = [];
  let done;
  const promise = new Promise((resolve) => {
    done = resolve;
    names.forEach((n) => {
      try {
        const h = A.addListener(n, (info) => resolve({ event: n, info }));
        handles.push(h);
      } catch (_) { /* ignore */ }
    });
    if (maxMs) setTimeout(() => resolve({ event: 'timeout' }), maxMs);
  });
  const cleanup = () => {
    handles.forEach(async (h) => { try { (await h)?.remove?.(); } catch (_) {} });
    done?.({ event: 'cleanup' });
  };
  return { promise, cleanup };
}

async function nativeRewarded(placement) {
  const A = admob();
  if (!A || !state.ready) return false;
  if (!state.rewardedLoaded) await withTimeout(preloadRewarded(), AD_CONFIG.loadTimeoutMs, false);
  if (!state.rewardedLoaded) { log('rewarded not available', placement); return false; }

  let earned = false;
  let rewardHandle = null;
  try { rewardHandle = A.addListener('onRewardedVideoAdReward', () => { earned = true; }); } catch (_) {}
  const closed = waitForEvents(A, ['onRewardedVideoAdDismissed', 'onRewardedVideoAdFailedToShow'], 0);
  state.rewardedLoaded = false;
  try {
    const item = await A.showRewardVideoAd();
    if (item && (Number(item.amount) > 0 || item.type)) earned = true;
    // Some plugin versions resolve on reward before the ad is closed — wait for dismissal.
    await withTimeout(closed.promise, 60000, null);
  } catch (e) {
    log('rewarded show failed', e);
  } finally {
    closed.cleanup();
    try { (await rewardHandle)?.remove?.(); } catch (_) {}
    preloadRewarded(); // preload next
  }
  log('rewarded result', placement, earned);
  return earned;
}

async function nativeInterstitial(placement) {
  const A = admob();
  if (!A || !state.ready) return false;
  if (!state.interstitialLoaded) await withTimeout(preloadInterstitial(), AD_CONFIG.loadTimeoutMs, false);
  if (!state.interstitialLoaded) { log('interstitial not available', placement); return false; }
  const closed = waitForEvents(A, ['interstitialAdDismissed', 'interstitialAdFailedToShow'], 0);
  state.interstitialLoaded = false;
  let shown = false;
  try {
    await A.showInterstitial();
    shown = true;
    await withTimeout(closed.promise, 60000, null);
  } catch (e) {
    log('interstitial show failed', e);
  } finally {
    closed.cleanup();
    preloadInterstitial();
  }
  return shown;
}

async function nativeShowBanner() {
  const A = admob();
  if (!A || !state.ready) return false;
  try {
    if (state.bannerCreated) await A.resumeBanner();
    else {
      await A.showBanner({
        adId: unitIds().banner,
        adSize: 'ADAPTIVE_BANNER',
        position: 'BOTTOM_CENTER',
        margin: 0,
        isTesting: AD_CONFIG.TESTING,
      });
      state.bannerCreated = true;
    }
    state.bannerVisible = true;
    return true;
  } catch (e) {
    log('banner failed', e);
    state.bannerCreated = false;
    return false;
  }
}

async function nativeHideBanner() {
  const A = admob();
  if (!A || !state.bannerCreated) return;
  try { await A.hideBanner(); } catch (e) { log('hide banner failed', e); }
  state.bannerVisible = false;
}

// ---------------------------------------------------------------------------
// Web mock

const MOCK_STYLE = `
.nd-ad-mock{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;
  background:radial-gradient(circle at 50% 35%,#2a2350 0%,#0b0a1a 70%);color:#fff;
  font:500 16px/1.4 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;opacity:0;transition:opacity .2s ease;
  padding:env(safe-area-inset-top) 16px env(safe-area-inset-bottom);}
.nd-ad-mock.on{opacity:1}
.nd-ad-mock .lbl{position:absolute;top:calc(env(safe-area-inset-top) + 14px);left:16px;font-size:12px;letter-spacing:.08em;
  text-transform:uppercase;background:rgba(255,255,255,.12);padding:4px 8px;border-radius:6px}
.nd-ad-mock .tr{position:absolute;top:calc(env(safe-area-inset-top) + 10px);right:12px;display:flex;gap:8px;align-items:center}
.nd-ad-mock .cnt{font-size:13px;opacity:.8;background:rgba(0,0,0,.35);padding:6px 10px;border-radius:999px}
.nd-ad-mock button{font:inherit;color:#fff;border:0;cursor:pointer;border-radius:999px;padding:8px 14px;background:rgba(255,255,255,.16)}
.nd-ad-mock button.primary{background:linear-gradient(135deg,#7b5cff,#36c2ff);font-weight:700;padding:12px 26px;font-size:17px}
.nd-ad-mock .card{text-align:center;max-width:320px}
.nd-ad-mock .orb{width:110px;height:110px;margin:0 auto 18px;border-radius:50%;
  background:radial-gradient(circle at 35% 30%,#fff 0%,#9ad8ff 18%,#5b6bff 55%,#2a1b6b 100%);
  box-shadow:0 0 40px #5b8bff88;animation:ndAdPulse 1.6s ease-in-out infinite}
.nd-ad-mock .bar{height:4px;background:rgba(255,255,255,.15);border-radius:4px;overflow:hidden;margin:18px auto 0;width:220px}
.nd-ad-mock .bar i{display:block;height:100%;width:0;background:#7bd3ff;transition:width 1s linear}
.nd-ad-mock .small{font-size:13px;opacity:.7;margin-top:8px}
@keyframes ndAdPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
.nd-ad-banner{position:fixed;left:50%;transform:translateX(-50%);bottom:env(safe-area-inset-bottom);z-index:2147482000;
  width:min(100%,360px);height:50px;display:flex;align-items:center;justify-content:center;gap:8px;
  background:#1b1836;color:#cfd3ff;border-top:1px solid #3a3570;font:500 12px system-ui,sans-serif;pointer-events:none}
`;

function injectMockStyle() {
  if (document.getElementById('nd-ad-mock-style')) return;
  const s = document.createElement('style');
  s.id = 'nd-ad-mock-style';
  s.textContent = MOCK_STYLE;
  document.head.appendChild(s);
}

/**
 * kind: 'rewarded' | 'interstitial'. Resolves true when a rewarded ad was
 * watched to completion (or an interstitial was shown), false if closed early.
 */
function mockAd(kind, placement) {
  return new Promise((resolve) => {
    try {
      injectMockStyle();
      const rewarded = kind === 'rewarded';
      const total = rewarded ? AD_CONFIG.mockRewardedSec : AD_CONFIG.mockInterstitialSkipSec;
      const el = document.createElement('div');
      el.className = 'nd-ad-mock';
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-label', 'Advertisement (demo)');
      el.innerHTML = `
        <div class="lbl">Ad (demo)</div>
        <div class="tr"><span class="cnt"></span><button class="close" type="button"></button></div>
        <div class="card">
          <div class="orb"></div>
          <div style="font-size:20px;font-weight:700">Your ad here</div>
          <div class="small">Mock ${rewarded ? 'rewarded' : 'interstitial'} ad · placement: ${String(placement || '-')}</div>
          <div class="bar"><i></i></div>
          <div style="margin-top:22px"><button class="primary claim" type="button" style="display:none">${rewarded ? 'Claim reward' : 'Continue'}</button></div>
        </div>`;
      const cnt = el.querySelector('.cnt');
      const closeBtn = el.querySelector('.close');
      const claim = el.querySelector('.claim');
      const bar = el.querySelector('.bar i');
      // Rewarded: closing early is allowed but forfeits the reward. Interstitial: no close until skip.
      closeBtn.textContent = rewarded ? '✕ Close (no reward)' : '';
      closeBtn.style.display = rewarded ? '' : 'none';

      let left = total;
      let finished = false;
      let settled = false;
      const stopEvents = (e) => e.stopPropagation();
      ['pointerdown', 'touchstart', 'click', 'keydown'].forEach((t) => el.addEventListener(t, stopEvents));

      const end = (result) => {
        if (settled) return;
        settled = true;
        clearInterval(timer);
        el.classList.remove('on');
        setTimeout(() => { el.remove(); resolve(result); }, 200);
      };
      const tick = () => {
        left--;
        bar.style.width = `${Math.min(100, ((total - left) / total) * 100)}%`;
        if (left > 0) { cnt.textContent = rewarded ? `Reward in ${left}s` : `Skip in ${left}s`; return; }
        finished = true;
        clearInterval(timer);
        cnt.textContent = rewarded ? 'Reward earned' : '';
        cnt.style.display = rewarded ? '' : 'none';
        closeBtn.textContent = rewarded ? '✕ Close' : 'Skip ›';
        closeBtn.style.display = '';
        claim.style.display = '';
      };
      cnt.textContent = rewarded ? `Reward in ${left}s` : `Skip in ${left}s`;
      closeBtn.addEventListener('click', () => end(rewarded ? finished : true));
      claim.addEventListener('click', () => end(true));

      document.body.appendChild(el);
      requestAnimationFrame(() => {
        el.classList.add('on');
        bar.style.width = `${(1 / total) * 100}%`;
      });
      const timer = setInterval(tick, 1000);
    } catch (e) {
      log('mock ad failed', e);
      resolve(false);
    }
  });
}

let mockBannerEl = null;
function mockShowBanner() {
  try {
    injectMockStyle();
    if (!mockBannerEl) {
      mockBannerEl = document.createElement('div');
      mockBannerEl.className = 'nd-ad-banner';
      mockBannerEl.innerHTML = '<b>Ad (demo)</b><span>· banner placeholder</span>';
    }
    if (!mockBannerEl.isConnected) document.body.appendChild(mockBannerEl);
    return true;
  } catch (_) { return false; }
}
function mockHideBanner() {
  try { mockBannerEl?.remove(); } catch (_) {}
}

// ---------------------------------------------------------------------------
// Public API

export const AdProvider = {
  /** true when running inside a native Capacitor shell. */
  get isNative() { return detectNative(); },

  /** Initialise SDK + consent (native) — idempotent, resolves true when ads can be requested. */
  init() {
    if (state.initPromise) return state.initPromise;
    state.initPromise = (async () => {
      try {
        if (detectNative()) return await nativeInit();
        log('web mode: using mock ad overlay');
        return true;
      } catch (e) { log('init error', e); return false; }
    })();
    return state.initPromise;
  },

  /** Resolves true only if the user watched to completion and earned the reward. */
  async showRewarded(placement) {
    if (state.showing) return false;
    state.showing = true;
    try {
      await this.init();
      return detectNative() ? await nativeRewarded(placement) : await mockAd('rewarded', placement);
    } catch (e) { log('showRewarded error', e); return false; }
    finally { state.showing = false; }
  },

  /** Resolves once the interstitial is closed (or failed). Value: whether one was shown. */
  async showInterstitial(placement) {
    if (state.showing) return false;
    state.showing = true;
    try {
      await this.init();
      return detectNative() ? await nativeInterstitial(placement) : await mockAd('interstitial', placement);
    } catch (e) { log('showInterstitial error', e); return false; }
    finally { state.showing = false; }
  },

  /** Main-menu banner only. Never call during gameplay. */
  async showBanner() {
    try {
      await this.init();
      return detectNative() ? await nativeShowBanner() : mockShowBanner();
    } catch (_) { return false; }
  },

  async hideBanner() {
    try { if (detectNative()) await nativeHideBanner(); else mockHideBanner(); } catch (_) {}
    return true;
  },

  /** Lets players change their consent choice later (Settings → Privacy). Resolves boolean. */
  async showPrivacyOptions() {
    try {
      const A = admob();
      if (!detectNative() || !A?.showPrivacyOptionsForm) return false;
      await A.showPrivacyOptionsForm();
      return true;
    } catch (e) { log('privacy options failed', e); return false; }
  },
};
