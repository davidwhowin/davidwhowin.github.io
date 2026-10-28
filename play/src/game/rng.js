// Seeded RNG utilities (mulberry32). Pure, no DOM.

export function mulberry32(seed) {
  let a = (seed >>> 0) || 0x9e3779b9;
  const rng = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  rng.int = (n) => Math.floor(rng() * n);
  rng.range = (lo, hi) => lo + rng() * (hi - lo);
  rng.pick = (arr) => arr[Math.floor(rng() * arr.length)];
  rng.getState = () => a;
  rng.setState = (s) => { a = s >>> 0; };
  return rng;
}

/** FNV-1a string hash -> uint32 */
export function hashString(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Derive an independent stream seed from a base seed and a label. */
export function deriveSeed(seed, label) {
  return (hashString(String(label)) ^ Math.imul((seed >>> 0) + 0x9e3779b9, 0x85ebca6b)) >>> 0;
}

/** YYYYMMDD number for a local date. */
export function dateSeed(d = new Date()) {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

export function randomSeed() {
  try {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] >>> 0;
  } catch (_) {
    return (Math.random() * 4294967296) >>> 0;
  }
}

/** Pick an index from an array of non-negative weights. */
export function pickWeighted(rng, weights) {
  let total = 0;
  for (const w of weights) total += w;
  let x = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    x -= weights[i];
    if (x < 0) return i;
  }
  return weights.length - 1;
}
