// The one note slot on a result card (docs/UX_RESULT_CARDS.md, UI rule 5): anything "new" or "changed" competes for a
// single line by a fixed priority, and the rest wait for a later card or live elsewhere. Pure: no DOM, no text.
// Presentation only; never reads or depends on ad state, the device or spending.

/** Journey win note priority (§1): goodnight > gift > tricky bonus > the one-time replay explainer.
 * Warm Streak is not a note any more: it works silently (owner's call, docs/UX_RESULT_CARDS.md "Silent effects"). */
export const WIN_NOTE_ORDER = Object.freeze(['goodnight', 'gift', 'tricky', 'replay']);

/**
 * Which note a Journey win card shows, or null for none. `due` holds a flag per candidate (true = it applies now).
 * The first one in WIN_NOTE_ORDER that applies wins; on a quiet win nothing is shown.
 */
export function winNote(due) {
  if (!due) return null;
  for (const k of WIN_NOTE_ORDER) if (due[k]) return k;
  return null;
}

/** Endless / Daily highlight priority (§5 block 4): records > Path unlock > café orders > bounty > best moment > next goal. */
export const RUN_HIGHLIGHT_ORDER = Object.freeze(['goodnight', 'records', 'path', 'moment', 'bounty', 'chain', 'goal']);

/** Which single highlight an Endless or Daily result shows, or null. Same shape as winNote. */
export function runHighlight(due) {
  if (!due) return null;
  for (const k of RUN_HIGHLIGHT_ORDER) if (due[k]) return k;
  return null;
}
