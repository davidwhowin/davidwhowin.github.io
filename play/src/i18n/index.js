// Tiny i18n: t(key, params) with {name} interpolation, English as the source table, per-key fallback to English.
// Locale: the saved choice (this device, localStorage) if that language is ready, else the device language
// (navigator.languages) if ready, else English. A language becomes selectable in Settings > Comfort > Language only
// once its `ready` flag is true (no machine translations ship). Numbers stay fmt() / toLocaleString('en-US') for now
// (docs/LOCALISATION.md, phase 2). Long-form content text (chapter names, Pip's lines, bakes...) lives in separate
// content tables read by ct() / ctp() / ctList() and withText() (phase 3). No DOM and no UI imports, so src/game and
// src/meta can use it and it runs under node tests. src/ui/i18n.js re-exports this module.
import en from './en.js';
import de from './de.js';
import fr from './fr.js';
import es from './es.js';
import ptBR from './pt-BR.js';
import enContent from './content/en.js';
import deContent from './content/de.js';
import frContent from './content/fr.js';
import esContent from './content/es.js';
import ptBRContent from './content/pt-BR.js';
import { PSEUDO_ID, pseudoTable } from './pseudo.js';

/** Every target language, in menu order. `name` is the endonym (never translated). */
export const LOCALES = [
  { id: 'en', name: 'English', ready: true },
  { id: 'de', name: 'Deutsch', ready: false },
  { id: 'fr', name: 'Français', ready: false },
  { id: 'es', name: 'Español', ready: false },
  { id: 'pt-BR', name: 'Português (Brasil)', ready: false },
];
export const TABLES = { en, de, fr, es, 'pt-BR': ptBR };
/** Long-form content tables (phase 3): chapter, level tip, lesson, keeper, story, bake, book, keepsake and reflection text. */
export const CONTENT = { en: enContent, de: deContent, fr: frContent, es: esContent, 'pt-BR': ptBRContent };
export const LOCALE_KEY = 'novadrop.locale';

/** Best supported locale id for a BCP-47 tag ('de-AT' → 'de', 'pt' / 'pt-PT' → 'pt-BR'), or null. */
export function matchLocale(tag) {
  if (typeof tag !== 'string' || !tag) return null;
  const lower = tag.toLowerCase().replace('_', '-');
  const exact = LOCALES.find((l) => l.id.toLowerCase() === lower);
  if (exact) return exact.id;
  const base = lower.split('-')[0];
  const hit = LOCALES.find((l) => l.id.toLowerCase().split('-')[0] === base);
  return hit ? hit.id : null;
}

export const localeReady = (id) => LOCALES.some((l) => l.id === id && l.ready);

/** The locale to use: the saved choice if ready, else the first ready device language, else 'en'. */
export function resolveLocale(saved, deviceLangs = []) {
  const s = matchLocale(saved);
  if (s && localeReady(s)) return s;
  for (const tag of deviceLangs) {
    const m = matchLocale(tag);
    if (m && localeReady(m)) return m;
  }
  return 'en';
}

function readSaved() {
  try { return typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem(LOCALE_KEY) : null; } catch (_) { return null; }
}
function deviceLangs() {
  try {
    if (typeof navigator === 'undefined') return [];
    return navigator.languages && navigator.languages.length ? [...navigator.languages] : [navigator.language];
  } catch (_) { return []; }
}

let current = resolveLocale(readSaved(), deviceLangs());

/**
 * Dev only: the 'qps' pseudo-locale (src/i18n/pseudo.js) generated from English, UI and content tables alike. Never
 * in LOCALES (so never in the Language row) and never saved; ?locale=qps in the URL turns it on for that page load.
 */
export function enablePseudo() {
  TABLES[PSEUDO_ID] = pseudoTable(TABLES.en);
  CONTENT[PSEUDO_ID] = pseudoTable(CONTENT.en);
  current = PSEUDO_ID;
  return current;
}
function pseudoFlag() {
  try { return typeof location !== 'undefined' && /[?&#]locale=qps\b/.test(location.search + location.hash); } catch (_) { return false; }
}
if (pseudoFlag()) enablePseudo();

export function getLocale() { return current; }

/** Pick a locale and remember it on this device. Only ready languages take effect; returns the active locale. */
export function setLocale(id) {
  const m = matchLocale(id);
  if (!m || !localeReady(m)) return current;
  current = m;
  try { if (typeof window !== 'undefined' && window.localStorage) window.localStorage.setItem(LOCALE_KEY, m); } catch (_) { /* private mode */ }
  return current;
}

/** Test hook: switch tables without the ready gate or storage. */
export function _forceLocale(id) { current = id; }

const has = (tbl, key) => !!tbl && Object.prototype.hasOwnProperty.call(tbl, key);
function lookup(key, tables = TABLES) {
  const tbl = tables[current];
  if (has(tbl, key)) return tbl[key];
  if (has(tables.en, key)) return tables.en[key];
  return null;
}

/** Replace {name} with params.name; unknown placeholders stay visible so a missing param shows up on screen. */
export function interpolate(str, params) {
  if (!params) return str;
  return str.replace(/\{(\w+)\}/g, (m, k) => (Object.prototype.hasOwnProperty.call(params, k) && params[k] != null ? String(params[k]) : m));
}

/** Text for `key` in the current locale; falls back to English, then to the key itself so typos are visible. */
export function t(key, params) {
  const s = lookup(key);
  return interpolate(s == null ? key : s, params);
}

/**
 * Plural text: `${key}.${rule}` with the Intl.PluralRules category of `count` for the current locale (French uses
 * 'one' for 0 too), falling back to `${key}.other`. {n} defaults to the raw count; pass n: fmt(count) to format it.
 */
export function tp(key, count, params) {
  return pluralText(TABLES, key, count, params);
}

function pluralText(tables, key, count, params) {
  let rule = count === 1 ? 'one' : 'other';
  try { rule = new Intl.PluralRules(current === PSEUDO_ID ? 'en' : current).select(count); } catch (_) { /* keep the English rule */ }
  const k = lookup(`${key}.${rule}`, tables) != null ? `${key}.${rule}` : `${key}.other`;
  const s = lookup(k, tables);
  return interpolate(s == null ? k : s, { n: count, ...params });
}

// ---------------------------------------------------------------- content tables (phase 3)
// The same lookup as t() / tp() (current locale, then English, then the key itself), over CONTENT instead of TABLES.
// The names differ on purpose: tools/i18n-extract.mjs checks t / tp keys against the UI table and ct / ctp keys
// against the content table.

/** Content text for `key` (src/i18n/content/<locale>.js). */
export function ct(key, params) {
  const s = lookup(key, CONTENT);
  return interpolate(s == null ? key : s, params);
}

/** Content plural: like tp(), over the content tables. */
export function ctp(key, count, params) {
  return pluralText(CONTENT, key, count, params);
}

/**
 * A list of content lines: `${key}.0`, `${key}.1`, ... The length is English's (a translation keeps the same number
 * of lines; a missing line falls back to English).
 */
export function ctList(key, params) {
  const out = [];
  for (let i = 0; has(CONTENT.en, `${key}.${i}`); i++) out.push(ct(`${key}.${i}`, params));
  return out;
}

/** Placeholder for a content string field in a data table (see withText). */
export const TEXT = Symbol('i18n.text');
/** Placeholder for a content list field (an array of lines) in a data table (see withText). */
export const LINES = Symbol('i18n.lines');
/** Every content key (or list key + '.0') a data table asked for through withText; tests check them against English. */
export const CONTENT_KEYS_USED = new Set();

/**
 * Turns TEXT / LINES placeholders in a data table into getters over the content table: under prefix 'chapter.terrace',
 * `name: TEXT` becomes a getter for ct('chapter.terrace.name') and `lines: LINES` one for ctList('chapter.terrace.lines').
 * Plain nested objects and arrays recurse with the field name (or index) added to the prefix; frozen ones are skipped
 * (already done). Field order is kept and the getters are enumerable, so JSON, spreads and the parity fixtures see
 * the same strings as before. Call it before Object.freeze. Returns obj.
 */
export function withText(obj, prefix) {
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    const key = `${prefix}.${k}`;
    if (v === TEXT) {
      CONTENT_KEYS_USED.add(key);
      Object.defineProperty(obj, k, { get: () => ct(key), enumerable: true });
    } else if (v === LINES) {
      CONTENT_KEYS_USED.add(key + '.0');
      Object.defineProperty(obj, k, { get: () => ctList(key), enumerable: true });
    } else if (v && typeof v === 'object' && !Object.isFrozen(v) && (Array.isArray(v) || Object.getPrototypeOf(v) === Object.prototype)) {
      withText(v, key);
    }
  }
  return obj;
}
