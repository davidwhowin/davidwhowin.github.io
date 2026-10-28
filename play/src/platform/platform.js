// Nova Drop — platform facade used by game/UI code.
import { initAudio, playSfx, setMuted as audioSetMuted, isMuted as audioIsMuted, setMusic as audioSetMusic, isMusicOn as audioIsMusicOn, setCalm as audioSetCalm,
  MUSIC_TRACKS, setMusicTracks, pickTrack, previewTrack, currentTrack, musicDebug, setEveningSoft, setNightCalm,
  setSoundBackdrop, previewSoundBackdrop } from './audio.js';
import { haptic as doHaptic, setHaptics as hSet, hapticsOn as hOn, setSoftHaptics } from './haptics.js';

let inited = false;

export const Platform = {
  /** Call once at boot. Safe to call repeatedly. */
  init() {
    if (inited) return;
    inited = true;
    try { initAudio(); } catch (_) { /* ignore */ }
  },
  /** kind: 'light' | 'medium' | 'heavy' | 'success' */
  haptic(kind) { doHaptic(kind); },
  /** name: drop | merge | combo | supernova | tide | perk | gameover | newbest | coin | ui | impact | discover | collect. params e.g. {tier, combo} */
  sfx(name, params) { playSfx(name, params); },
  isNative() {
    try { return !!window.Capacitor?.isNativePlatform?.(); } catch (_) { return false; }
  },
  setMuted(b) { audioSetMuted(b); },
  isMuted() { return audioIsMuted(); },
  /** Ambient music bed (persisted, default on). */
  setMusic(b) { audioSetMusic(b); },
  isMusicOn() { return audioIsMusicOn(); },
  /** Song list [{id, name, blurb}] and which ones may play ({id: bool}, missing = on). */
  musicTracks() { return MUSIC_TRACKS; },
  setMusicTracks(map) { setMusicTracks(map); },
  /** New run / level attempt: pick a random enabled song and loop it (Math.random, not the game RNG). */
  musicNewRun() { return pickTrack(); },
  /** Settings preview: switch to this song now. */
  previewTrack(id) { previewTrack(id); },
  currentTrack() { return currentTrack(); },
  /** Sound backdrop ('music' | 'rain' | 'ocean' | 'garden' | 'piano' | 'silence'), on the music bus. */
  setSoundBackdrop(id) { setSoundBackdrop(id); },
  /** Settings chip: hear a backdrop (a 3 s sample when Music is off; a 20 s collection preview passes seconds). */
  previewSoundBackdrop(id, seconds) { return previewSoundBackdrop(id, seconds); },
  musicDebug() { return musicDebug(); },
  /** Calm = softer, fewer SFX layers (audio also reads it from the save on its own). */
  setCalm(b) { audioSetCalm(b); },
  setHaptics(b) { hSet(b); },
  /** Evening wind-down: softer music bed and light-only haptics (presentation only). */
  setEvening(b) { setEveningSoft(b); setSoftHaptics(b); },
  setNightCalm(on, waves) { setNightCalm(on, waves); },
  hapticsOn() { return hOn(); },
  /**
   * Honest review prompt (src/meta/reviewAsk.js): ask the OS for its standard in-app review sheet. Resolves true
   * when the request was handed to the OS (the OS still decides whether it shows), false when there is no store.
   * Web: there is no store, so this is a no-op that resolves false. Unity (later, both free): Android calls the
   * Google Play In-App Review API (ReviewManager.RequestReviewFlow + LaunchReviewFlow), iOS calls
   * SKStoreReviewController.requestReview (Apple caps it at 3 times a year). Never preceded by a custom
   * "Do you like the game?" question: both stores forbid that gate.
   */
  async requestReview() { return false; },
};
