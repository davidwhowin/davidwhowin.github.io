// Nova Drop — haptics. Capacitor Haptics plugin on device, navigator.vibrate on web.

const HAPTICS_KEY = 'novadrop.haptics';

let enabled = readEnabled();
let soft = false; // Evening wind-down: every haptic becomes a light tap (presentation only)

function readEnabled() {
  try { return localStorage.getItem(HAPTICS_KEY) !== '0'; } catch (_) { return true; }
}

function plugin() {
  return (typeof window !== 'undefined' && window.Capacitor?.Plugins?.Haptics) || null;
}

// navigator.vibrate patterns (ms) for the web fallback.
const VIBRATE = { light: 8, medium: 16, heavy: [28], success: [12, 40, 18] };

export function setHaptics(b) {
  enabled = !!b;
  try { localStorage.setItem(HAPTICS_KEY, enabled ? '1' : '0'); } catch (_) { /* ignore */ }
}
export function hapticsOn() { return enabled; }
export function setSoftHaptics(b) { soft = !!b; }

/** kind: 'light' | 'medium' | 'heavy' | 'success'. Never throws. */
export function haptic(kind = 'light') {
  if (!enabled) return;
  if (soft) kind = 'light';
  const H = plugin();
  try {
    if (H) {
      let p;
      if (kind === 'success') p = H.notification?.({ type: 'SUCCESS' });
      else p = H.impact?.({ style: kind === 'heavy' ? 'HEAVY' : kind === 'medium' ? 'MEDIUM' : 'LIGHT' });
      if (p && typeof p.catch === 'function') p.catch(() => {});
      return;
    }
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(VIBRATE[kind] ?? VIBRATE.light);
    }
  } catch (_) { /* ignore */ }
}
