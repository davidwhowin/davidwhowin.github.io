// Pseudo-localisation ('qps'): every English string becomes e.g. "[Ŝéttîñĝš ~~~]" so layout problems show up before
// any real translation exists. Accented look-alikes test glyph height (accented capitals at 150% text size), the
// ~35% padding stands in for German/French length, and the brackets show where text is cut off. {params} are kept
// as they are, so interpolation still works. Dev only: turned on by ?locale=qps (src/i18n/index.js), never listed in
// Settings > Comfort > Language, never saved. tools/i18n-pseudo.mjs prints or writes the generated tables.
// docs/LOCALISATION_LAYOUT.md has the screenshots and findings.

export const PSEUDO_ID = 'qps';

const MAP = {
  a: 'à', b: 'ƀ', c: 'ç', d: 'ð', e: 'é', f: 'ƒ', g: 'ĝ', h: 'ĥ', i: 'î', j: 'ĵ', k: 'ķ', l: 'ļ', m: 'ɱ',
  n: 'ñ', o: 'ö', p: 'þ', q: 'ǫ', r: 'ŕ', s: 'š', t: 'ţ', u: 'û', v: 'ṽ', w: 'ŵ', x: 'ẋ', y: 'ý', z: 'ž',
  A: 'Å', B: 'Ɓ', C: 'Ç', D: 'Ð', E: 'É', F: 'Ƒ', G: 'Ĝ', H: 'Ĥ', I: 'Î', J: 'Ĵ', K: 'Ķ', L: 'Ļ', M: 'Ṁ',
  N: 'Ñ', O: 'Ö', P: 'Þ', Q: 'Ǫ', R: 'Ŕ', S: 'Ŝ', T: 'Ţ', U: 'Û', V: 'Ṽ', W: 'Ŵ', X: 'Ẋ', Y: 'Ý', Z: 'Ž',
};

/** Padding share of the visible (non-placeholder) length. */
export const PSEUDO_PAD = 0.35;

/** One English string to pseudo: accents outside {params}, ~35% tilde padding, wrapped in brackets. '' stays ''. */
export function pseudoString(str) {
  if (typeof str !== 'string' || str === '') return str;
  let out = '';
  let visible = 0;
  for (const part of str.split(/(\{\w+\})/)) {
    if (/^\{\w+\}$/.test(part)) { out += part; continue; }
    for (const ch of part) { out += MAP[ch] || ch; visible++; }
  }
  const pad = Math.max(1, Math.ceil(visible * PSEUDO_PAD) - 1);
  return `[${out} ${'~'.repeat(pad)}]`;
}

/** A whole table (key → text) to pseudo, same keys (so plural forms .one / .other stay) in the same order. */
export function pseudoTable(table) {
  const out = {};
  for (const [k, v] of Object.entries(table)) out[k] = pseudoString(v);
  return out;
}

/** The {param} names in a string, sorted (for checks). */
export const paramsOf = (s) => (String(s).match(/\{\w+\}/g) || []).sort();
