// UI entry point for i18n. The engine lives in src/i18n/index.js (pure, no DOM, no UI imports) so that src/meta and
// src/game content tables can use it too (docs/LOCALISATION.md). UI files import t / tp from here as before.
export * from '../i18n/index.js';
