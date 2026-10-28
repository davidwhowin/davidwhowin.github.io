// Sound backdrop (DESIGN.md "Sound backdrop"): what plays under the game when Music is on.
// 'music' plays the café songs (the default for everyone, new and existing players); the others
// are calm, fully synthesized soundscapes (src/platform/ambience.js) for winding down; 'silence' plays
// nothing under the SFX. Presentation only: rules, scores and ads are untouched.
//
// Save field (Unity port: same name and values):
//   settings.soundBackdrop  'music' | 'cafe' | 'rain' | 'ocean' | 'garden' | 'piano' | 'silence'
//   Old saves and bad values fall back to 'music' (no change for existing players); NEW saves start on
//   'music' too (the v3 café songs), see NEW_PLAYER_SOUND_BACKDROP (save.js defaultSave reads it).
//   The same field may also hold a sound-collection backdrop id (src/meta/soundCollections.js, web prototype:
//   'awning' | 'cups' | 'murmur'); those survive the web migration and Unity keeps them (Meta/SoundCollections.cs).

import { COLLECTION_BACKDROP_IDS } from './soundCollections.js';
import { withText, TEXT } from '../i18n/index.js';

export const SOUND_BACKDROPS = [
  { id: 'music', name: TEXT, blurb: TEXT },
  { id: 'cafe', name: TEXT, blurb: TEXT },
  { id: 'rain', name: TEXT, blurb: TEXT },
  { id: 'ocean', name: TEXT, blurb: TEXT },
  { id: 'garden', name: TEXT, blurb: TEXT },
  { id: 'piano', name: TEXT, blurb: TEXT },
  { id: 'silence', name: TEXT, blurb: TEXT },
].map((b) => withText(b, `sound.${b.id}`)); // name and blurb: content text sound.<id>.* (docs/LOCALISATION.md phase 4c)

export const SOUND_BACKDROP_IDS = SOUND_BACKDROPS.map((b) => b.id);
export const DEFAULT_SOUND_BACKDROP = 'music';
/** What a brand-new save starts on (v3: the café songs; the 'cafe' ambience stays a choice). */
export const NEW_PLAYER_SOUND_BACKDROP = 'music';

/** A valid backdrop id (anything unknown falls back to the default). */
export function normSoundBackdrop(id) {
  return SOUND_BACKDROP_IDS.includes(id) || COLLECTION_BACKDROP_IDS.includes(id) ? id : DEFAULT_SOUND_BACKDROP;
}

/** Save migration: older saves (no field) and bad values get the default. */
export function sanitizeSoundBackdrop(s) {
  if (!s || !s.settings) return;
  s.settings.soundBackdrop = normSoundBackdrop(s.settings.soundBackdrop);
}
