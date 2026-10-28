// "Challenge a friend" screens (DESIGN.md "Challenge a friend"; codes in src/meta/friendChallenge.js):
//   showFriendSend   - from an Endless or Daily Nebula result: optional name, then Share / Copy a code
//   showFriendEnter  - from the Endless picker: paste a code, see whose challenge it is, Play; the last 5 challenges
//   showFriendResult - after a challenge run: both results side by side, Try again (free, unlimited), Send back
// No links, no referral rewards, no contacts. The name is typed by the player and kept on this device only.
// Postcard gifts (docs/MARKET_MONETIZATION_3.md idea 4): the sender may tick a free café gift onto the code (the game
// pays, never her). The receiver's sheet opens it once per code and once per day, with one plain line, no nag.
import { el, esc, fmt, tap, countUp, ICONS } from './dom.js';
import { Svc } from '../meta/services.js';
import { shareCard, twistLabel } from '../meta/dailyNebula.js';
import { word, pageLook } from './copy.js';
import { t as tr } from './i18n.js';
import { dayKey, daysBetween } from '../meta/daily.js';
import { showAdsInfo, toast, refreshCoins } from './screens.js'; // a function-only cycle (screens.js opens these sheets)
import {
  encodeFriend, decodeFriend, friendErrorText, sanitizeName, shareText, goalLine, resultText, whoName, whose,
  compareFriend, replyChallenge, rememberFriend, recentFriends, normFriend, starText, NAME_MAX,
  claimGift, giftLine, GIFT_TEXT,
} from '../meta/friendChallenge.js';

const root = () => document.querySelector('#screens');
const click = () => Svc.sfx('ui');
const TIER_NAME = { gentle: 'Gentle tide', standard: 'Standard tide', bold: 'Bold tide' };
const PATH_NAME = { gravity: 'Gravity Path', fusion: 'Fusion Path', tide: 'Tide Path' };
const autoplayNote = () => `<div class="autoplay-note">${esc(tr('result.autoplay'))}</div>`;
const FRIEND_ICON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="3"/><circle cx="16.5" cy="9.5" r="2.5"/><path d="M3 19c.6-3 2.6-5 5-5s4.4 2 5 5"/><path d="M13.5 15.2c.8-.8 1.8-1.2 3-1.2 2.1 0 3.6 1.6 4 4"/></svg>';

let styled = false;
/** This view's few styles live here so the shared stylesheet stays untouched. */
function ensureStyles() {
  if (styled || typeof document === 'undefined') return;
  styled = true;
  const st = document.createElement('style');
  st.dataset.friendChallenge = '';
  st.textContent = `
.fc-card .fc-lead { margin: 4px 0 10px; }
.fc-card label.fc-label { display: block; text-align: left; font-size: calc(15px * var(--ts)); color: var(--muted); margin: 10px 2px 4px; }
.fc-card input.fc-name { width: 100%; font: inherit; font-size: calc(18px * var(--ts)); color: var(--text); background: rgba(0,0,0,.3);
  border: 1px solid var(--stroke); border-radius: 14px; padding: 10px 12px; min-height: 48px; }
.fc-card input.fc-name:focus-visible { outline: 3px solid var(--gold); outline-offset: 2px; }
.fc-card input.fc-name::placeholder { color: var(--muted); }
.fc-card .fc-preview { margin: 12px 0 2px; padding: 12px; border-radius: 16px; background: rgba(0,0,0,.28); border: 1px dashed var(--stroke);
  text-align: left; font-size: calc(15px * var(--ts)); line-height: 1.4; overflow-wrap: anywhere; user-select: text; -webkit-user-select: text; }
.fc-card .fc-small { font-size: calc(15px * var(--ts)); color: var(--muted); margin: 8px 0 0; }
.fc-card .fc-goal { margin: 12px 0 4px; padding: 14px 12px; border-radius: 18px; background: rgba(255,154,232,.10); border: 1px solid rgba(255,154,232,.45); }
/* café looks: a soft café-pink card (--pink #e2847e) under dark ink, AA on cream (title ≈ 11:1, muted line ≈ 5.8:1);
   evening keeps cream ink on walnut; Cosmic keeps the original white on purple */
:root:not([data-look="cosmic"]) .fc-card .fc-goal { background: rgba(226,132,126,.14); border-color: rgba(165,80,74,.5); }
.fc-card .fc-goal b { display: block; font-size: calc(22px * var(--ts)); line-height: 1.2; color: var(--ink-strong, #fff); }
.fc-card .fc-goal span { display: block; margin-top: 6px; font-size: calc(15px * var(--ts)); color: var(--muted); }
.fc-card .fc-recent { margin-top: 14px; text-align: left; }
.fc-card .fc-recent h3 { font-size: calc(16px * var(--ts)); margin: 0 2px 4px; color: var(--muted); font-weight: 600; }
.fc-card .fc-row { display: flex; width: 100%; align-items: center; justify-content: space-between; gap: 10px; margin-top: 6px; padding: 10px 12px;
  min-height: 56px; border-radius: 14px; background: rgba(0,0,0,.2); border: 1px solid var(--stroke); font: inherit; color: inherit; text-align: left; cursor: pointer; }
.fc-card .fc-row b { display: block; font-size: calc(16px * var(--ts)); }
.fc-card .fc-row small { display: block; font-size: calc(15px * var(--ts)); color: var(--muted); }
.fc-card .fc-row .fc-go { color: var(--gold); flex-shrink: 0; font-size: calc(15px * var(--ts)); }
.fc-vs { display: flex; gap: 10px; margin: 14px 0 6px; }
.fc-vs > div { flex: 1 1 0; min-width: 0; padding: 12px 8px; border-radius: 18px; background: rgba(0,0,0,.25); border: 1px solid var(--stroke); }
.fc-vs > div.lead { border-color: var(--gold); background: rgba(255,213,74,.10); }
.fc-vs span { display: block; font-size: calc(15px * var(--ts)); color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fc-vs b { display: block; font-size: calc(26px * var(--ts)); line-height: 1.2; color: var(--ink-strong, #fff); overflow-wrap: break-word; hyphens: none; }
.fc-vs b.fc-neb { font-size: calc(18px * var(--ts)); }
.fc-card .fc-line { font-size: calc(17px * var(--ts)); color: var(--ink-strong, #fff); margin: 6px 0; }
.fc-card .fc-warm { margin: 4px 0 8px; }
.fc-card label.fc-giftopt { display: flex; align-items: flex-start; gap: 10px; text-align: left; margin: 12px 0 2px; padding: 10px 12px;
  border-radius: 14px; background: rgba(255,213,74,.08); border: 1px solid var(--stroke); cursor: pointer; min-height: 48px; }
.fc-card label.fc-giftopt input { width: 24px; height: 24px; margin: 2px 0 0; flex-shrink: 0; accent-color: var(--gold); }
.fc-card label.fc-giftopt b { display: block; font-size: calc(16px * var(--ts)); }
.fc-card label.fc-giftopt small { display: block; font-size: calc(15px * var(--ts)); color: var(--muted); line-height: 1.35; margin-top: 2px; }
.fc-card .fc-gift { margin: 10px 0 2px; padding: 10px 12px; border-radius: 14px; background: rgba(255,213,74,.10); border: 1px solid rgba(255,213,74,.4);
  font-size: calc(15px * var(--ts)); line-height: 1.4; color: var(--text); text-align: left; }
.fc-link { display: inline-flex; align-items: center; gap: 6px; }
.fc-link svg { flex-shrink: 0; }
`;
  document.head.appendChild(st);
}

function open(node) {
  ensureStyles();
  root().appendChild(node);
  const info = node.querySelector('[data-adinfo]');
  if (info) tap(info, () => showAdsInfo(), click);
  return node;
}

function close(node) {
  if (!node || !node.parentNode) return Promise.resolve();
  return new Promise((res) => { node.classList.add('leaving'); setTimeout(() => { node.remove(); res(); }, 180); });
}

/** The challenge a finished run can send (its own seed, tide, kit and real result), or null. */
export function challengeFromResult(res, name = '') {
  if (!res || res.autoplay || !res.kit) return null;
  if (res.mode === 'journey') {
    if (!res.nebula) return null;
    return normFriend({ mode: 'nebula', date: res.nebula, kit: res.kit, stars: res.won ? res.stars : 0, drops: Math.min(255, res.dropsUsed | 0), name });
  }
  if (res.zen) return null;
  return normFriend({ mode: 'endless', seed: res.seed >>> 0, tier: res.challenge, kit: res.kit, score: Math.floor(res.score || 0), name });
}

/** Can this result card offer "Challenge someone"? */
export function canChallenge(res) {
  return !!challengeFromResult(res) && (res.mode === 'journey' ? (res.dropsUsed | 0) > 0 : (res.drops | 0) > 0);
}

/** The result-card link: "Challenge someone to beat 12,340" (wired by bindChallengeLink). */
export function challengeLinkHtml(res) {
  if (!canChallenge(res)) return '';
  const t = res.mode === 'journey' ? tr('friend.linkPuzzle') : tr('friend.linkBeat', { n: fmt(res.score) });
  return `<div class="link-row"><button class="linkish fc-link" data-friendsend>${FRIEND_ICON}<span>${esc(t)}</span></button></div>`;
}

export function bindChallengeLink(app, node, res) {
  const b = node && node.querySelector('[data-friendsend]');
  if (b) tap(b, () => showFriendSend(app, res), click);
}

/** What the puzzle is, in a few words: "Endless · Gentle tide · Gravity Path" / "Today's Special 2026-10-22 · café orders". */
function puzzleLine(c) {
  if (c.mode === 'nebula') return [`${word('dailyPuzzle', pageLook())} ${c.date}`, c.kit.twist ? twistLabel(c.kit.twist) : ''].filter(Boolean).join(' · ');
  return [tr('friend.endless'), TIER_NAME[c.tier], c.kit.path ? PATH_NAME[c.kit.path] : ''].filter(Boolean).join(' · ');
}

/** Share or copy the text; returns true when it left the device or reached the clipboard. */
async function sendText(text) {
  const r = await shareCard(text);
  if (r === 'copied') toast(tr('friend.copied'), true);
  else if (r === 'shared') toast(tr('friend.sent'), true);
  else if (r === 'failed') toast(tr('friend.copyFailed'));
  return r === 'copied' || r === 'shared';
}

/**
 * Send sheet: an optional name (typed by the player, remembered on this device only), the message preview, and
 * Share (the phone's share sheet) or Copy. `res` is the finished run; `base` (Send back) a ready challenge.
 */
export function showFriendSend(app, res, base = null) {
  const save = app.save;
  const fr = save.friends || (save.friends = { name: '', list: [] });
  let name = sanitizeName(fr.name);
  let gift = true; // a free café gift rides along unless she unticks it (the game pays, never the sender)
  const withGift = (c) => (c && gift ? normFriend({ ...c, gift: dayKey() }) : c);
  const make = () => withGift(base ? normFriend({ ...base, name, gift: null }) : challengeFromResult(res, name));
  if (!make()) return null;
  const node = open(el(`<div class="screen modal"><div class="card fc-card" role="dialog" aria-modal="true" aria-labelledby="fc-send-title">
    <h2 id="fc-send-title">${esc(base ? tr('friend.sendBack') : tr('friend.challenge'))}</h2>
    <p class="fc-lead">${esc(tr('friend.sendLead'))}</p>
    <label class="fc-label" for="fc-name">${esc(tr('friend.nameLabel'))}</label>
    <input class="fc-name" id="fc-name" data-name maxlength="${NAME_MAX}" placeholder="${esc(tr('friend.namePlaceholder'))}" autocomplete="off" autocapitalize="words" spellcheck="false" value="${esc(name)}">
    <label class="fc-giftopt"><input type="checkbox" data-gift checked><span><b>${esc(GIFT_TEXT.toggle)}</b><small>${esc(GIFT_TEXT.note)}</small></span></label>
    <div class="fc-preview" data-preview aria-live="polite"></div>
    <button class="btn primary" data-share>${esc(tr('friend.send'))}</button>
    <button class="btn ghost" data-copy>${esc(tr('friend.copy'))}</button>
    <p class="fc-small">${esc(tr('friend.privacy'))}</p>
    <button class="btn ghost" data-x>${esc(tr('common.back'))}</button>
  </div></div>`));
  const input = node.querySelector('[data-name]');
  const preview = node.querySelector('[data-preview]');
  let cur = null, text = '';
  const refresh = () => {
    const c = make();
    cur = c && encodeFriend(c);
    text = cur ? shareText(c, cur) : '';
    preview.textContent = c && c.name ? tr('friend.from', { name: c.name, text }) : text;
  };
  refresh();
  input.addEventListener('input', () => {
    name = sanitizeName(input.value);
    fr.name = name; // kept on this device only; never filled in from anywhere else
    refresh();
  });
  input.addEventListener('change', () => { input.value = name; app.persist(); });
  node.querySelector('[data-gift]').addEventListener('change', (e) => { gift = !!e.target.checked; refresh(); });
  const send = async (copyOnly) => {
    if (!cur) return;
    app.persist();
    const msg = name ? tr('friend.from', { name, text }) : text;
    let ok;
    if (copyOnly) {
      ok = false;
      try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(msg); ok = true; } } catch (_) { ok = false; }
      if (ok) toast(tr('friend.copied'), true); else ok = await sendText(msg);
    } else ok = await sendText(msg);
    if (ok) { rememberFriend(save, cur, { mine: true }); app.persist(); }
  };
  tap(node.querySelector('[data-share]'), () => send(false), click);
  tap(node.querySelector('[data-copy]'), () => send(true), click);
  tap(node.querySelector('[data-x]'), () => { app.persist(); close(node); }, click);
  return node;
}

/** "Mum's challenge · Endless · Standard tide" row text for the recent list. */
function recentRowHtml({ entry, challenge: c }, i) {
  const title = entry.mine ? tr('friend.youSent', { text: resultText(c) }) : c.mode === 'nebula' ? tr('friend.whoseChallenge', { whose: whose(c), text: resultText(c) }) : tr('friend.whoseBeat', { whose: whose(c), n: fmt(c.score) });
  let sub = puzzleLine(c);
  if (!entry.mine && entry.best != null) sub += c.mode === 'nebula' ? (entry.best.stars ? tr('friend.recentYou', { n: fmt(entry.best.drops), stars: starText(entry.best.stars) }) : tr('friend.recentNotSolved')) : tr('friend.recentBest', { n: fmt(entry.best) });
  return `<button class="fc-row" data-recent="${i}"><span><b>${esc(title)}</b><small>${esc(sub)}</small></span><span class="fc-go">${esc(tr('friend.playGo'))}</span></button>`;
}

/** A Nebula code from a day that hasn't started here yet can't be played (its puzzle isn't out). */
function playableHere(c) {
  if (c.mode !== 'nebula') return true;
  const d = daysBetween(dayKey(), c.date);
  return d == null || d <= 0;
}

/**
 * Enter-code sheet (Endless picker): paste a code (the whole message works), see "Mum's challenge: beat 12,340",
 * then Play. A bad code only shows a friendly line. The last 5 challenges (sent and received) sit below.
 */
export function showFriendEnter(app, prefill = '') {
  const save = app.save;
  const node = open(el(`<div class="screen modal"><div class="card fc-card" role="dialog" aria-modal="true" aria-labelledby="fc-enter-title">
    <h2 id="fc-enter-title">${esc(tr('friend.enterTitle'))}</h2>
    <div data-step1>
      <p class="fc-lead">${esc(tr('friend.enterLead'))}</p>
      <textarea class="tr-code" data-in rows="3" placeholder="NC1-…" aria-label="${esc(tr('friend.enterLabel'))}" autocapitalize="off" autocomplete="off" autocorrect="off" spellcheck="false"></textarea>
      <p class="tr-error" data-err role="alert" hidden></p>
      <button class="btn primary" data-check>${esc(tr('friend.check'))}</button>
    </div>
    <div data-step2 hidden>
      <div class="fc-goal"><b data-goal></b><span data-what></span></div>
      <p class="fc-small" data-kit></p>
      <p class="fc-gift" data-giftline hidden></p>
      <button class="btn primary hero" data-play>${ICONS.play.replace('<svg', '<svg width="22" height="22"')} ${esc(tr('common.play'))}</button>
      <button class="btn ghost" data-other>${esc(tr('friend.other'))}</button>
    </div>
    <div class="fc-recent" data-recentbox></div>
    <button class="btn ghost" data-x>${esc(tr('common.back'))}</button>
  </div></div>`));
  const input = node.querySelector('[data-in]');
  const err = node.querySelector('[data-err]');
  const step1 = node.querySelector('[data-step1]');
  const step2 = node.querySelector('[data-step2]');
  const showErr = (t) => { err.textContent = t; err.hidden = !t; };
  let chosen = null, chosenCode = '';
  const renderRecent = () => {
    const box = node.querySelector('[data-recentbox]');
    const list = recentFriends(save);
    box.innerHTML = list.length ? `<h3>${esc(tr('friend.recent'))}</h3>${list.map(recentRowHtml).join('')}` : '';
    box.hidden = !list.length;
    box.querySelectorAll('[data-recent]').forEach((b) => tap(b, () => { const it = list[Number(b.dataset.recent)]; if (it) pick(it.challenge, it.entry.code); }, click));
  };
  const pick = (c, code) => {
    if (!playableHere(c)) { showErr(friendErrorText('future')); return; }
    chosen = c; chosenCode = code;
    node.querySelector('[data-goal]').textContent = goalLine(c);
    node.querySelector('[data-what]').textContent = tr('friend.sameOrbs', { puzzle: puzzleLine(c) });
    node.querySelector('[data-kit]').textContent = kitLine(c);
    openGift(code);
    step1.hidden = true; step2.hidden = false;
    showErr('');
  };
  // A café gift on the code opens here, once per code and once per day (meta claimGift); a plain line, never a nag
  const openGift = (code) => {
    const r = claimGift(save, code, dayKey());
    const line = node.querySelector('[data-giftline]');
    line.textContent = giftLine(r.status);
    line.hidden = !line.textContent;
    if (r.ok) { app.persist(); refreshCoins(save); Svc.sfx('coin'); }
  };
  input.addEventListener('input', () => showErr(''));
  tap(node.querySelector('[data-check]'), () => {
    const r = decodeFriend(input.value);
    if (!r.ok) { showErr(friendErrorText(r.error)); return; }
    pick(r.challenge, r.code);
  }, click);
  tap(node.querySelector('[data-other]'), () => { chosen = null; step2.hidden = true; step1.hidden = false; input.value = ''; }, click);
  tap(node.querySelector('[data-play]'), () => {
    if (!chosen) return;
    rememberFriend(save, chosenCode, { mine: false });
    app.persist();
    close(node);
    app.startFriend({ ...chosen, code: chosenCode });
  }, click);
  tap(node.querySelector('[data-x]'), () => close(node), click);
  renderRecent();
  if (prefill) { input.value = prefill; }
  return node;
}

/** The starting kit, in plain words (both players get exactly this, whatever they own). */
function kitLine(c) {
  if (c.mode === 'nebula') return c.kit.undo ? tr('friend.kit.undo') : tr('friend.kit.noUndo');
  const k = c.kit;
  const bits = [k.hold ? tr('friend.kit.hold') : '', k.comet ? tr('friend.kit.comet') : '', k.perk ? tr('friend.kit.perk') : '', k.lucky ? tr('friend.kit.lucky') : ''].filter(Boolean);
  return bits.length ? tr('friend.kit.list', { list: bits.join(tr('friend.kit.sep')) }) : tr('friend.kit.none');
}

/**
 * After a challenge run: both real results side by side, warm and honest. Try again is free and unlimited;
 * Send back replies with this score on the same puzzle. Scores are never altered and never become a best.
 */
export function showFriendResult(app, res, { onAgain, onHome }) {
  const f = res.friend;
  const neb = f.mode === 'nebula';
  const mine = neb ? { stars: res.won ? res.stars : 0, drops: res.dropsUsed | 0 } : { score: Math.floor(res.score || 0) };
  const cmp = compareFriend(f, mine);
  const who = whoName(f);
  const warm = cmp.outcome === 'win' ? tr('friend.warm.win', { who })
    : cmp.outcome === 'tie' ? tr('friend.warm.tie')
      : neb ? tr('friend.warm.nebula') : tr('friend.warm.toGo', { n: fmt(f.score - mine.score) });
  const best = res.friendEntry && res.friendEntry.best;
  const bestLine = !res.autoplay && best != null && cmp.outcome !== 'win'
    ? (neb ? (best.stars ? tr('friend.bestDrops', { n: fmt(best.drops), stars: starText(best.stars) }) : '') : best > mine.score ? tr('friend.bestScore', { n: fmt(best) }) : '')
    : '';
  const val = (r) => (neb ? (r.stars ? `${esc(tr('friend.drops', { n: fmt(r.drops) }))}<br>${starText(r.stars)}` : esc(tr('friend.notSolved'))) : fmt(r.score));
  const node = open(el(`<div class="screen modal"><div class="card result-card fc-card">
    ${cmp.outcome === 'win' ? `<div class="new-best">${esc(tr('friend.won'))}</div>` : ''}
    <h2>${esc(cmp.title)}</h2>
    ${res.autoplay ? autoplayNote() : ''}
    <p>${esc(tr('friend.resultWhat', { whose: whose(f), puzzle: puzzleLine(f) }))}</p>
    <div class="fc-vs" role="group" aria-label="${esc(cmp.line)}">
      <div class="${cmp.outcome !== 'lose' ? 'lead' : ''}"><span>${esc(tr('friend.you'))}</span><b class="${neb ? 'fc-neb' : ''}" data-mine>${neb ? val(mine) : '0'}</b></div>
      <div class="${cmp.outcome !== 'win' ? 'lead' : ''}"><span>${esc(who)}</span><b class="${neb ? 'fc-neb' : ''}">${val(f)}</b></div>
    </div>
    <p class="fc-line">${esc(cmp.line)}${cmp.outcome === 'win' ? esc(tr('friend.youWon')) : ''}</p>
    <p class="fc-warm">${esc(warm)}</p>
    ${bestLine ? `<p class="fc-small">${esc(bestLine)}</p>` : ''}
    ${!neb && res.coins > 0 ? `<div class="earn-row"><div class="earn"><span class="coin"></span><span>+${fmt(res.coins)}</span></div></div>` : ''}
    <p class="fc-small">${esc(tr('friend.separate'))}</p>
    <button class="btn primary hero" data-again>${esc(tr('friend.tryAgain'))}</button>
    ${res.autoplay ? '' : `<button class="btn pink" data-reply>${esc(cmp.outcome === 'win' ? tr('friend.sendBack') : tr('friend.sendScore', { who }))}</button>`}
    <button class="btn ghost" data-home>${esc(tr('result.home'))}</button>
    ${res.adLine && !res.autoplay ? `<button class="result-note ad-note" data-adinfo aria-label="${esc(tr('result.adLineLabel', { line: res.adLine }))}">${esc(res.adLine)} <span class="ad-why">${esc(tr('result.adWhy'))}</span></button>` : ''}
  </div></div>`));
  if (!neb) countUp(node.querySelector('[data-mine]'), 0, mine.score, Math.min(1400, 400 + mine.score / 8));
  if (cmp.outcome === 'win') setTimeout(() => { Svc.sfx('newbest'); Svc.haptic('success'); }, 500);
  tap(node.querySelector('[data-reply]'), () => {
    const back = replyChallenge(f, mine, sanitizeName(app.save.friends && app.save.friends.name));
    if (back) showFriendSend(app, null, back);
  }, click);
  let leaving = false;
  tap(node.querySelector('[data-again]'), () => { if (leaving) return; leaving = true; close(node); onAgain(); }, click);
  tap(node.querySelector('[data-home]'), () => { if (leaving) return; leaving = true; close(node); onHome(); }, click);
  return node;
}
