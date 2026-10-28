// Postcard share (docs/RETENTION_RESEARCH.md §5 idea 11). The share sheet sends a pretty picture of the
// player's biggest moment instead of only text: a Supernova or a new best in Endless, a finished Observatory
// constellation, or a Daily Nebula card.
//
// Pure rules + text + layout numbers (no DOM). The picture itself is drawn by src/ui/postcardArt.js; the
// Unity mirror is Scripts/Meta/Postcard.cs (same strings, same numbers) + Scripts/UI/PostcardRender.cs.
//
// Fair by design: nothing on the card links anywhere (no URL, no QR code, no referral code), sharing pays
// nothing, never asks anyone to join, and the card holds no personal data (no name, no device, no ID).
import { backdropForSector, backdropForLevel, chapterStartLevel } from '../game/backdrops.js';
import { t } from '../i18n/index.js'; // text: UI keys postcard.* (docs/LOCALISATION.md phase 4c); the date stays English

export const POSTCARD_W = 1080;
export const POSTCARD_H = 1350;
export const SUPERNOVA_TIER = 10;

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const int = (v) => (Number.isFinite(Number(v)) ? Math.floor(Number(v)) : 0);
const pad2 = (n) => String(n).padStart(2, '0');
const fmt = (n) => Number(n).toLocaleString('en-US');

/** "October 22, 2026" (fixed English month names, never the device locale). */
export function postcardDate(d = new Date()) {
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** "2026-10-22" for the file name. */
function isoDay(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }

/** Endless mode label on the card: "Endless", "Endless · Gentle tide", "Endless · Bold tide", "Daily Challenge". */
export function runModeLabel(res) {
  if (res && res.daily) return t('postcard.mode.daily');
  if (res && res.challenge === 'gentle') return t('postcard.mode.gentle');
  if (res && res.challenge === 'bold') return t('postcard.mode.bold');
  return t('postcard.mode.endless');
}

/**
 * The postcard for a finished Endless run, or null when the run has no big moment.
 * Qualifies: a real (non-autoplay) run with at least one Supernova, or one that beat an earlier best.
 * A first-ever score is not a "new best" (nothing was beaten), the same rule as the result card's banner.
 */
export function runPostcard(res, now = new Date()) {
  if (!res || res.autoplay || res.mode === 'journey') return null;
  const supernovas = Math.max(0, int(res.supernovas));
  const beat = !!res.isNewBest && int(res.bestBefore) > 0;
  if (!supernovas && !beat) return null;
  const score = Math.max(0, int(res.score));
  const nova = supernovas > 0;
  return {
    kind: nova ? 'supernova' : 'best',
    kicker: nova ? (beat ? t('postcard.run.kickerNovaBest') : t('postcard.run.kickerNova')) : t('postcard.run.kickerBest'),
    title: nova ? (supernovas === 1 ? t('postcard.run.titleNovaOne') : t('postcard.run.titleNovaMany', { n: fmt(supernovas) })) : t('postcard.run.titleBest'),
    big: fmt(score),
    bigLabel: t('postcard.run.points'),
    sub: t('postcard.run.sub', { mode: runModeLabel(res), n: fmt(Math.max(1, int(res.sector))) }),
    hero: { type: 'orb', tier: nova ? SUPERNOVA_TIER : Math.max(1, Math.min(SUPERNOVA_TIER, int(res.maxTier) || 1)) },
    backdrop: backdropForSector(Math.max(1, int(res.sector))).id,
    date: postcardDate(now),
    day: isoDay(now),
    score, supernovas,
  };
}

/** The postcard for an Observatory chapter view (observatory.chapterView), or null unless it is finished. */
export function constellationPostcard(view, now = new Date()) {
  if (!view || !view.complete || !view.c) return null;
  const c = view.c;
  return {
    kind: 'constellation',
    kicker: t('postcard.constellation.kicker'),
    title: c.name,
    big: '',
    bigLabel: '',
    sub: t('postcard.constellation.sub', { nick: c.nick, first: fmt(view.levels.first), last: fmt(view.levels.last) }), // the Deck says "Levels", not "Chapter" (UX_STARS §7)
    hero: { type: 'constellation', index: view.index },
    backdrop: backdropForLevel(chapterStartLevel(view.index)).id,
    date: postcardDate(now),
    day: isoDay(now),
    name: c.name, nick: c.nick,
  };
}

/** The postcard for a Daily Nebula scored attempt (dailyNebula record), or null when there is none. */
export function nebulaPostcard(key, rec, now = new Date()) {
  if (!rec || !key) return null;
  const drops = Math.max(0, int(rec.drops));
  const won = !!rec.won;
  const stars = won ? Math.max(1, Math.min(3, int(rec.stars) || 1)) : 0;
  return {
    kind: 'nebula',
    kicker: t('postcard.nebula.kicker'),
    title: won ? t('postcard.nebula.solved') : t('postcard.nebula.tried'),
    big: '',
    bigLabel: '',
    sub: drops === 1 ? t('postcard.nebula.sub.one', { key, n: fmt(drops) }) : t('postcard.nebula.sub.other', { key, n: fmt(drops) }),
    hero: { type: 'stars', stars },
    backdrop: 'violet',
    date: postcardDate(now),
    day: isoDay(now),
  };
}

/**
 * The words that go with the picture. Link-free: no URL, no code, no "join me". The Daily Nebula keeps its
 * existing share text (with the emoji grid), passed as `nebulaText`.
 */
export function postcardCaption(m, nebulaText = '') {
  if (!m) return '';
  if (m.kind === 'supernova') {
    return m.supernovas === 1
      ? t('postcard.caption.novaOne', { big: m.big })
      : t('postcard.caption.novaMany', { n: fmt(m.supernovas), big: m.big });
  }
  if (m.kind === 'best') return t('postcard.caption.best', { big: m.big });
  if (m.kind === 'constellation') return t('postcard.caption.constellation', { name: m.name, nick: m.nick });
  if (m.kind === 'nebula') return nebulaText || t('postcard.caption.nebula', { sub: m.sub });
  if (m.kind === 'visitor') return t('postcard.caption.visitor', { from: m.from });
  return '';
}

/**
 * A café visitor's keepsake postcard (src/meta/visitors.js): `v` is the visitor's table entry. It is painted as a
 * real seaside postcard (src/ui/postcardArt.js paints kind 'visitor' on cream card, not on the nebula).
 */
export function visitorPostcard(v, now = new Date()) {
  if (!v || !v.card) return null;
  return {
    kind: 'visitor',
    id: v.id,
    kicker: t('postcard.visitor.kicker', { name: String(v.name).toUpperCase() }),
    title: v.card.title,
    big: '',
    bigLabel: '',
    sub: v.card.note,
    from: v.name,
    hero: { type: 'visitor', id: v.id },
    backdrop: 'cafe',
    date: postcardDate(now),
    day: isoDay(now),
  };
}

/** "nova-drop-supernova-2026-10-22.png" */
export function postcardFileName(m) {
  return `nova-drop-${(m && m.kind) || 'postcard'}-${(m && m.day) || isoDay(new Date())}.png`;
}

/**
 * Layout of the 1080 x 1350 card (pixels, y = top of the text box's middle line). Shared by web and Unity so
 * both draw the same card. Everything sits inside the frame, top to bottom: kicker, hero, title, big number,
 * subtitle, then the game name and date at the foot.
 */
export function postcardLayout(w = POSTCARD_W, h = POSTCARD_H) {
  const k = w / POSTCARD_W;
  const r = (v) => Math.round(v * k);
  return {
    w, h,
    margin: r(48),
    frameRadius: r(56),
    frameWidth: r(4),
    textMaxW: w - r(48) * 2 - r(80),
    kickerY: r(150), kickerSize: r(44),
    heroCx: Math.round(w / 2), heroCy: r(470), heroR: r(220),
    titleY: r(800), titleSize: r(76),
    bigY: r(920), bigSize: r(128),
    bigLabelY: r(1010), bigLabelSize: r(32),
    subY: r(1070), subSize: r(40),
    brandY: r(1200), brandSize: r(64),
    dateY: r(1262), dateSize: r(34),
  };
}

/**
 * The layout for one card: a card without a big number (constellation, Nebula) moves its subtitle up under
 * the title so there is no empty band.
 */
export function postcardLayoutFor(m, w = POSTCARD_W, h = POSTCARD_H) {
  const L = postcardLayout(w, h);
  if (m && !m.big) L.subY = L.titleY + Math.round((110 * w) / POSTCARD_W);
  return L;
}
