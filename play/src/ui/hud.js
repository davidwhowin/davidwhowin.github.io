// In-game DOM HUD (score, best bar, sector, perks, next/hold/comet, journey goals/drops/boosters).
import { $, el, fmt, ICONS, playStackTop } from './dom.js';
import { paintOrbCanvas } from '../game/orbArt.js';
import { animateKeeperCanvas } from './keeperLive.js';
import { PERK_BY_ID, PATH_BY_ID, pathCount, RESONANCE_AT, perkName } from '../game/perks.js';
import { goalText } from '../game/levels.js';
import { goalCopy, pageLook, word, tierGoalText } from './copy.js'; // goal words: café "stones" in every look
import { tierName } from '../game/tierNames.js'; // display names follow the orb skin
import { raceLine } from '../meta/raceBest.js';
import { bountyText, bountyProgress, BOUNTY_COINS } from '../game/bounties.js';
import { MOMENT_COINS } from '../game/moments.js';
import { t as tr, getLocale } from './i18n.js';

const LOCK = '<svg viewBox="0 0 24 24" width="14" height="14"><rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor"/><path d="M8 11V8a4 4 0 018 0v3" stroke="currentColor" stroke-width="2.5" fill="none"/></svg>';

/**
 * The fixed HUD words written in index.html, re-set from the i18n table at start-up (the HTML keeps the English as
 * the no-JS fallback; English output is unchanged). The undo slot's aria-label stays with the runtime undo labels.
 */
function applyStaticText() {
  const set = (sel, text, attr = null) => { const n = $(sel); if (!n) return; if (attr) n.setAttribute(attr, text); else n.textContent = text; };
  try { document.documentElement.lang = getLocale(); } catch (_) { /* no DOM */ }
  set('#game', tr('hud.static.board'), 'aria-label');
  set('#btn-pause', tr('hud.static.pause'), 'aria-label');
  set('#hud-title', tr('hud.score'));
  set('#sector-label', tr('hud.sector', { n: 1 }));
  set('#drops-chip .drops-label', tr('hud.drops'));
  set('#best-label', `${tr('hud.best')} 0`);
  set('#level-chip .lvl-label', tr('hud.chip.level'));
  set('#btn-auto', tr('hud.static.autoLabel'), 'aria-label');
  set('#btn-auto', tr('hud.static.auto'));
  set('#hold-slot', tr('hud.static.holdLabel'), 'aria-label');
  set('#hold-slot .slot-label', tr('hud.static.hold'));
  set('#next-slot .slot-label', tr('hud.static.next'));
  set('#undo-btn .slot-label', tr('hud.static.undo'));
  set('#comet-btn', tr('hud.static.cometLabel'), 'aria-label');
  set('#comet-btn .slot-label', tr('hud.static.comet'));
}

export class Hud {
  constructor(handlers = {}) {
    this.root = $('#hud');
    this.top = $('#hud-top');
    this.bottom = $('#hud-bottom');
    this.scoreEl = $('#score');
    this.titleEl = $('#hud-title');
    this.bestFill = $('#best-fill');
    this.bestLabel = $('#best-label');
    this.bestBar = $('#best-bar');
    this.sectorLabel = $('#sector-label');
    this.sectorFill = $('#sector-fill');
    this.perksEl = $('#perk-icons');
    this.nextCanvas = $('#next-slot canvas');
    this.holdBtn = $('#hold-slot');
    this.holdCanvas = $('#hold-slot canvas');
    this.cometBtn = $('#comet-btn');
    this.cometCount = $('#comet-count');
    this.dropsChip = $('#drops-chip');
    this.dropsNum = $('#drops-num');
    this.dropsLabel = this.dropsChip && this.dropsChip.querySelector('.drops-label');
    this.goalsEl = $('#goals');
    this.boostersEl = $('#boosters');
    this.hintEl = $('#hint');
    this.levelChip = $('#level-chip');
    this.levelNum = $('#level-num');
    this.levelLabel = this.levelChip && this.levelChip.querySelector('.lvl-label');
    this.autoBtn = $('#btn-auto');
    this.keeperBuddy = $('#keeper-buddy');
    this.keeperSayEl = $('#keeper-say');
    this.keeperId = null;
    this.sayTimer = 0;
    this.autoRun = false; // set by the game: this run is an autoplay run (never saved)
    $('#comet-icon').innerHTML = ICONS.comet;
    this.undoBtn = $('#undo-btn');
    this.undoCount = $('#undo-count');
    if (this.undoBtn) $('#undo-icon').innerHTML = ICONS.undo;
    this.undoKey = '';
    this.h = handlers;
    applyStaticText();
    this.lastPerkKey = '';
    this.lastLevel = null;
    this.goalNodes = [];
    this.boosterNodes = {};
    this.lastScore = 0;
    this.skin = 'classic';
    this.numbers = true;
    this.shapes = false; // Comfort: tier symbols on orbs (colour-blind friendly)

    const bind = (node, fn) => node && node.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); fn(); });
    bind($('#btn-pause'), () => this.h.onPause && this.h.onPause());
    bind(this.holdBtn, () => this.h.onHold && this.h.onHold());
    bind(this.cometBtn, () => this.h.onComet && this.h.onComet());
    bind(this.autoBtn, () => this.h.onAuto && this.h.onAuto());
    bind(this.undoBtn, () => this.h.onUndo && this.h.onUndo());
    // block canvas input under HUD controls
    for (const n of [this.top, this.bottom]) n.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) e.stopPropagation(); });

    const boosterText = {
      comet: [tr('hud.static.comet'), tr('hud.static.cometLabel')],
      wild: [tr('hud.static.wild'), tr('hud.static.wildLabel')],
      shuffle: [tr('hud.static.shuffle'), tr('hud.static.shuffleLabel')],
    };
    for (const id of ['comet', 'wild', 'shuffle']) {
      const [cap, aria] = boosterText[id];
      const b = el(`<button class="slot booster" data-id="${id}" aria-label="${aria}">
        <span class="slot-icon">${ICONS[id]}</span><b class="badge">0</b><span class="slot-label">${cap}</span></button>`);
      bind(b, () => this.h.onBooster && this.h.onBooster(id));
      this.boostersEl.appendChild(b);
      this.boosterNodes[id] = b;
    }
  }

  show() {
    this.root.classList.remove('hidden');
    if (this.keeperActor) { this.keeperActor.active = true; this.keeperActor.dirty = true; this.keeperActor.react('input'); }
    if (this.keeperId) requestAnimationFrame(() => this.setKeeper(this.keeperId, true));
  }
  hide() { this.root.classList.add('hidden'); this.hideHint(); this.hideKeeperSay(); if (this.keeperActor) this.keeperActor.active = false; }

  /** Star Keeper buddy next to the score (cosmetic only). */
  setKeeper(id, force = false, outfit = this.keeperOutfit || null) {
    if (!this.keeperBuddy) return;
    if (id === this.keeperId && outfit === (this.keeperOutfit || null) && !force) return;
    this.keeperId = id;
    this.keeperOutfit = outfit; // Starlight Season Keeper outfit (cosmetic only)
    const canvas = this.keeperBuddy.querySelector('canvas');
    if (!this.keeperActor) {
      // a living buddy: breathes, blinks, watches the aim and falling pieces, dozes after 8 s idle
      this.keeperActor = animateKeeperCanvas(canvas, id, outfit, { pad: 10, sleepAfter: 8000, tap: false, onFrame: (anim) => this.keeperLook(anim) });
    } else {
      this.keeperActor.set(id, outfit);
      this.keeperActor.dirty = true;
    }
  }

  /** Eye target provider (set by main.js): returns { x, y } in client px, or null to look around freely. */
  setKeeperLookSource(fn) { this.keeperLookFn = fn; this.keeperRect = null; }

  keeperLook(anim) {
    const pt = this.keeperLookFn ? this.keeperLookFn() : null;
    if (!pt) { anim.setLook(0, 0, false); return; }
    // the buddy does not move during play; measure it now and then, not every frame
    this.keeperRectAge = (this.keeperRectAge || 0) + 1;
    if (!this.keeperRect || this.keeperRectAge > 120) {
      this.keeperRect = this.keeperBuddy.getBoundingClientRect();
      this.keeperRectAge = 0;
    }
    const b = this.keeperRect;
    const dx = pt.x - (b.left + b.width / 2), dy = pt.y - (b.top + b.height / 2);
    const d = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, d / 60); // a little softer when the point is close
    anim.setLook((dx / d) * k, (dy / d) * k, true);
  }

  /** A cosmetic reaction from the buddy (merge, chain, danger, win, lose, ...). Never tied to ads. */
  keeperReact(name, n) { if (this.keeperActor) this.keeperActor.react(name, n); }

  /** Any player input during play: resets the doze timer and wakes the buddy. */
  keeperPoke() { if (this.keeperActor) this.keeperActor.react('input'); }

  /** A short speech bubble under the buddy; fades after a few seconds and never blocks input. */
  keeperSay(text, ms = 3200) {
    const n = this.keeperSayEl;
    if (!n || !text) return;
    n.textContent = text;
    n.classList.remove('hidden', 'out', 'pop');
    void n.offsetWidth; // restart the pop animation
    n.classList.add('pop');
    // the buddy's mouth moves while the bubble reads (about 55 ms a letter, capped)
    if (this.keeperActor) { this.keeperActor.anim.talk(Math.min(ms, 600 + text.length * 55)); this.keeperActor.react('input'); }
    // inside the top of the board, below the drop preview (never over the score, goals or the next piece), and under
    // the rule box / tip when one shows; toasts then stack below this bubble (screens.js placeToasts)
    n.style.top = playStackTop(this.root, ['#hint']) + 'px';
    clearTimeout(this.sayTimer);
    this.sayTimer = setTimeout(() => {
      n.classList.add('out');
      this.sayTimer = setTimeout(() => this.hideKeeperSay(), 320);
    }, ms);
    // a board banner that starts while the bubble reads (a chain banner): the bubble fades aside until it has gone
    // (main.js waits for the start banner before the line, so this is only the mid-run case)
    clearInterval(this.sayWatch);
    n.classList.remove('aside');
    this.sayWatch = setInterval(() => {
      let left = 0;
      try { left = Number(this.bannerLeft && this.bannerLeft()) || 0; } catch (_) { left = 0; }
      n.classList.toggle('aside', left > 0.02);
    }, 100);
  }

  hideKeeperSay() {
    clearTimeout(this.sayTimer);
    clearInterval(this.sayWatch);
    if (this.keeperSayEl) this.keeperSayEl.classList.add('hidden');
  }

  setMode(mode) {
    this.mode = mode;
    this.undoKey = '';
    if (this.undoBtn) this.undoBtn.style.display = 'none';
    this.root.classList.remove('nebula');
    this.root.classList.remove('book');
    if (this.bookTray) this.bookTray.hidden = true;
    if (this.bookHintBtn) this.bookHintBtn.hidden = true;
    if (this.dropsLabel) this.dropsLabel.textContent = tr('hud.drops');
    this.root.classList.toggle('mode-journey', mode === 'journey');
    this.root.classList.toggle('mode-endless', mode !== 'journey');
    this.titleEl.textContent = tr('hud.score');
    this.lastLevel = null;
    this.autoRun = false;
    this.lastPerkKey = '';
  }

  /** Space taken by HUD at top/bottom (CSS px), for board layout. */
  measure() {
    const wasHidden = this.root.classList.contains('hidden');
    if (wasHidden) { this.root.style.visibility = 'hidden'; this.root.classList.remove('hidden'); }
    const t = this.top.getBoundingClientRect().bottom;
    const b = window.innerHeight - this.bottom.getBoundingClientRect().top;
    if (wasHidden) { this.root.classList.add('hidden'); this.root.style.visibility = ''; }
    return { top: t + 4, bottom: b + 4 };
  }

  setScore(v) {
    this.scoreEl.textContent = fmt(v);
    if (v > this.lastScore) {
      this.scoreEl.classList.remove('bump');
      void this.scoreEl.offsetWidth;
      this.scoreEl.classList.add('bump');
    }
    this.lastScore = v;
  }

  /**
   * ghost (optional): where this tier's best run was after the same number of drops ("Race your
   * best", src/meta/raceBest.js). Drawn as a faint tick on the bar; the label says ahead / behind.
   */
  setBestProgress(score, best, daily = false, ghost = null) {
    // 'zen' = Zen Drift (its own best); 'friend' = Challenge a friend (racing the friend's real score, not a best)
    const friend = daily === 'friend';
    const label = friend ? (this.friendLabel || tr('hud.best.friend')) : daily === 'zen' ? tr('hud.best.zen') : daily ? tr('hud.best.today') : tr('hud.best');
    const g = this.bestGhost || (this.bestGhost = $('#best-ghost'));
    const showGhost = !!best && ghost != null && ghost > 0 && score <= best;
    if (g) {
      g.hidden = !showGhost;
      if (showGhost) g.style.left = (Math.min(1, ghost / best) * 100).toFixed(1) + '%';
    }
    if (!best) {
      this.bestFill.style.width = '100%';
      this.fitBest(friend ? [tr('hud.best.friendZero', { label }), tr('hud.best.anyScore')] : [tr('hud.best.first', { label }), tr('hud.best.firstShort', { label })]);
      return;
    }
    const p = Math.min(1, score / best);
    this.bestFill.style.width = (p * 100).toFixed(1) + '%';
    if (showGhost && !this.autoRun) {
      this.bestBar.classList.remove('passed');
      // big numbers at large text: drop words before the label could overflow the bar
      const line = raceLine(score, ghost);
      this.fitBest([`${label} ${fmt(best)} · ${line}`, `${fmt(best)} · ${line}`, line]);
      this.bestBar.setAttribute('aria-label', tr('hud.best.ghostLabel', { best: fmt(best), ghost: fmt(ghost), race: raceLine(score, ghost) }));
      return;
    }
    this.bestBar.removeAttribute('aria-label');
    if (this.autoRun && score > best) {
      // autoplay scores are never saved, so no "NEW BEST" claim
      this.bestBar.classList.remove('passed');
      this.fitBest([tr('hud.best.autoplay', { label, best: fmt(best) }), tr('hud.best.autoplayShort')]);
    } else if (score > best) {
      this.bestBar.classList.add('passed');
      const plus = `+${fmt(score - best)}`;
      this.fitBest([friend ? tr('hud.best.ahead', { label, plus }) : tr('hud.best.new', { plus }), plus]);
    } else {
      this.bestBar.classList.remove('passed');
      this.fitBest([tr('hud.best.toGo', { label, best: fmt(best), left: fmt(best - score) }), tr('hud.best.toGoShort', { left: fmt(best - score) })]);
    }
  }

  /** The BEST label is 15px (QA1): show the first wording that fits the bar (big numbers or big text drop words). */
  fitBest(opts) {
    for (const t of opts) {
      this.bestLabel.textContent = t;
      if (this.bestLabel.scrollWidth <= this.bestBar.clientWidth) break;
    }
  }

  newBest() { this.bestBar.classList.add('passed'); }

  /** In-run autoplay toggle state (AUTO pill). */
  /** The AUTO test pill shows only while Autoplay (test) is on, or in a dev build (docs/UX_FIRST_RUN.md Q4). */
  setAutoVisible(on) { if (this.autoBtn) this.autoBtn.hidden = !on; }
  /** The first-run lesson's quiet HUD: no AUTO, Undo or booster buttons while she learns. */
  setTutorialHud(on) { this.root.classList.toggle('tutorial', !!on); }
  setAuto(on) {
    if (!this.autoBtn) return;
    this.autoBtn.classList.toggle('on', !!on);
    this.autoBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  setSector(n, p) {
    this.sectorLabel.textContent = tr('hud.sector', { n });
    this.sectorFill.style.width = (p * 100).toFixed(1) + '%';
  }

  /** Owned perk icons, led by the Path chip ("Gravity 2/3", then "Gravity · Resonance") when the run has a Path. */
  setPerks(owned, path = null, bounty = null, moment = null) {
    // the café ticket's drops-left count is updated in place (momentCount), so a ticket ticking down never rebuilds
    // the row or repaints its canvas
    const key = JSON.stringify(owned) + '|' + (path || '') + '|' + (bounty ? `${bounty.s}:${bounty.kind}:${bounty.prog}:${bounty.done}` : '')
      + '|' + (moment ? `${moment.tier}` : '');
    if (key === this.lastPerkKey) { this.momentCount(moment); return; }
    this.lastPerkKey = key;
    this.momentEl = null;
    this.perksEl.innerHTML = '';
    // Sector bounties: this sector's optional side goal, with a check once it's done. It sits on its own fixed line
    // (present from the run's first frame, so the HUD height measured at run start never changes between sectors)
    // and long goals end in "…" rather than wrapping.
    if (bounty) {
      const text = bountyText(bounty);
      const prog = bountyProgress(bounty);
      const aria = bounty.done
        ? tr('hud.bounty.done', { text, coins: BOUNTY_COINS })
        : prog ? tr('hud.bounty.progress', { text, prog, coins: BOUNTY_COINS }) : tr('hud.bounty.open', { text, coins: BOUNTY_COINS });
      const row = el(`<div class="bounty-row"><div class="bounty-chip${bounty.done ? ' done' : ''}" id="bounty-chip" role="img" aria-label="${aria}" title="${aria}"><span class="bc-mark" aria-hidden="true">${bounty.done ? '✓' : '○'}</span><span class="bc-text">${text}</span>${prog && !bounty.done ? `<b>${prog}</b>` : ''}</div></div>`);
      // Café moments: the open Order ticket (the Journey ticket look) beside the bounty, with the drops it has left
      // ("10 drops"); tapping it says the order again (onMomentTap)
      if (moment) {
        const t = el(`<div class="goal order moment-ticket" id="moment-ticket" role="button" tabindex="0"><canvas></canvas><span class="goal-count"></span></div>`);
        const go = (e) => { if (e) { e.preventDefault(); e.stopPropagation(); } if (this.onMomentTap) this.onMomentTap(); };
        t.addEventListener('click', go);
        t.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') go(e); });
        row.appendChild(t);
        this.momentEl = t;
        this.momentLeft = null;
        this.momentCount(moment);
        requestAnimationFrame(() => paintOrbCanvas(t.querySelector('canvas'), { tier: moment.tier, number: this.numbers, shape: this.shapes }, this.skin));
      }
      this.perksEl.appendChild(row);
    }
    const P = path && PATH_BY_ID[path];
    if (P) {
      const n = Math.min(RESONANCE_AT, pathCount(path, owned));
      const on = n >= RESONANCE_AT;
      const label = on ? tr('hud.path.on', { name: P.name }) : tr('hud.path.count', { name: P.name, n, total: RESONANCE_AT });
      const aria = on ? tr('hud.path.onLabel', { name: P.name, resonance: P.resonance }) : tr('hud.path.countLabel', { name: P.name, n, total: RESONANCE_AT });
      this.perksEl.appendChild(el(`<div class="path-chip${on ? ' on' : ''}" id="path-chip" style="--pc:${P.color}" role="img" aria-label="${aria}" title="${aria}">${label}</div>`));
    }
    for (const id of Object.keys(owned)) {
      const p = PERK_BY_ID[id];
      if (!p) continue;
      const n = owned[id];
      this.perksEl.appendChild(el(`<div class="perk-icon${p.evolution ? ' evo' : ''}" title="${perkName(p.id, pageLook())}" style="color:${p.color}">${p.icon}${n > 1 ? `<b>${n}</b>` : ''}</div>`));
    }
  }

  /** Café ticket: drops left, in place ("10 drops", "1 drop"). */
  momentCount(moment) {
    const t = this.momentEl;
    if (!t || !moment || this.momentLeft === moment.left) return;
    this.momentLeft = moment.left;
    const name = tierName(moment.tier, this.skin);
    const drops = `${moment.left.toLocaleString('en-US')} drop${moment.left === 1 ? '' : 's'}`;
    const aria = tr('hud.moment.label', { name, drops, coins: MOMENT_COINS });
    t.setAttribute('aria-label', aria);
    t.setAttribute('title', aria);
    t.querySelector('.goal-count').textContent = drops;
  }

  setNext(spec, skin) {
    this.skin = skin;
    paintOrbCanvas(this.nextCanvas, spec ? { ...spec, number: this.numbers, shape: this.shapes } : null, skin);
  }

  setHold(spec, visible, enabled, skin) {
    this.holdBtn.style.visibility = visible ? 'visible' : 'hidden';
    if (!visible) return;
    this.holdBtn.classList.toggle('disabled', !enabled);
    paintOrbCanvas(this.holdCanvas, spec ? { ...spec, number: this.numbers, shape: this.shapes } : null, skin);
  }

  setComets(n, active) {
    this.cometBtn.style.visibility = n > 0 || active ? 'visible' : 'hidden';
    this.cometCount.textContent = n;
    this.cometBtn.classList.toggle('active', !!active);
  }

  // ---------------------------------------------------------------- journey

  setLevel(level) {
    if (this.lastLevel === level) return;
    this.lastLevel = level;
    // the score keeps its "SCORE" caption; the level has its own chip on the goals row
    this.titleEl.textContent = tr('hud.score');
    const nebula = !!level.daily;
    this.root.classList.toggle('nebula', nebula); // Daily Nebula: boosters hidden
    // Puzzle Books: no score, no boosters; the chip says PUZZLE and the drop counter counts the pieces left
    this.root.classList.toggle('book', !!level.book);
    if (this.dropsLabel) this.dropsLabel.textContent = level.book ? tr('hud.pieces') : tr('hud.drops');
    if (this.levelChip && level.book) {
      this.levelNum.textContent = level.n;
      this.levelLabel.textContent = tr('hud.chip.puzzle');
      for (const k of ['hard', 'superhard', 'nebula']) this.levelChip.classList.remove(k);
      this.levelChip.setAttribute('aria-label', tr('hud.chip.puzzleLabel', { n: level.n }));
    } else if (this.levelChip) {
      this.levelNum.textContent = nebula ? Number(String(level.daily).slice(8)) : level.n;
      this.levelLabel.textContent = nebula ? tr('hud.chip.daily') : level.kind === 'superhard' ? tr('hud.chip.superhard') : level.kind === 'hard' ? tr('hud.chip.hard') : tr('hud.chip.level');
      this.levelChip.classList.toggle('hard', !nebula && level.kind === 'hard');
      this.levelChip.classList.toggle('superhard', !nebula && level.kind === 'superhard');
      this.levelChip.classList.toggle('nebula', nebula);
      this.levelChip.setAttribute('aria-label', nebula ? `${word('dailyPuzzle', pageLook())} ${level.daily}`
        : level.kind === 'normal' ? tr('hud.chip.levelLabel', { n: level.n })
          : level.kind === 'superhard' ? tr('hud.chip.superhardLabel', { n: level.n }) : tr('hud.chip.hardLabel', { n: level.n }));
    }
    this.goalsEl.innerHTML = '';
    this.goalNodes = level.goals.map((g) => {
      let ico;
      if (g.type === 'tier' || g.type === 'order') ico = '<canvas></canvas>';
      else ico = `<span class="goal-ico">${ICONS[g.type === 'asteroids' ? 'asteroid' : g.type] || ''}</span>`;
      // Café Orders: a small order ticket (piece icon + how many are still wanted), no caption
      const n = g.type === 'order'
        ? el(`<div class="goal order" role="img">${ico}<span class="goal-count">×${g.count}</span></div>`)
        : g.type === 'tier' && g.tier < 10
          // UX_OPPORTUNITIES 12: say "or bigger" in words under the piece name, not a cryptic "Cocoa Mug+"; tap re-reads it
          ? el(`<div class="goal goal-tier">${ico}<div><span class="goal-name">${goalCopy(goalText(g, true), pageLook())}</span><span class="goal-line"><span class="goal-count">0/${fmt(g.count)}</span> <span class="goal-more">${tr('hud.goal.orBigger')}</span></span></div></div>`)
          : el(`<div class="goal">${ico}<div><span class="goal-name">${goalCopy(tierGoalText(g, goalText(g, true), true), pageLook())}</span><span class="goal-count">0/${fmt(g.count)}</span></div></div>`);
      this.goalsEl.appendChild(n);
      if (g.type === 'tier' || g.type === 'order') {
        requestAnimationFrame(() => paintOrbCanvas(n.querySelector('canvas'), { tier: g.tier, number: this.numbers, shape: this.shapes }, this.skin));
      }
      return n;
    });
  }

  /** quiet: Closing time counts spare drops down after a win, so the chip keeps its normal colour (no low / crit). */
  setDrops(left, total, quiet = false) {
    this.dropsNum.textContent = left;
    if (this.root.classList.contains('book')) quiet = true; // a book's pieces are not a countdown to beat
    this.dropsChip.classList.toggle('low', !quiet && left <= Math.max(5, total * 0.2) && left > 2);
    this.dropsChip.classList.toggle('crit', !quiet && left <= 2);
  }

  /**
   * Re-read a rule (docs/UX_MECHANICS.md P2): the order ticket and the teapot chip become tappable and say their rule
   * as a toast; glaze levels get a small "Glaze ?" info chip on the goals row. help: { orders, teapot, glaze } texts,
   * isNew: { orders, teapot } (a small "?" mark while the mechanic is new), glazeChip: show the glaze chip.
   * onTap(text) shows the toast. Presentation only.
   */
  setGoalHelp(level, help = {}, onTap = null) {
    if (!level || !this.goalNodes) return;
    const isNew = help.isNew || {};
    const wire = (n, text, label, mark) => {
      n.classList.add('goal-help');
      n.setAttribute('role', 'button');
      n.setAttribute('tabindex', '0');
      n.setAttribute('aria-label', label);
      n.style.pointerEvents = 'auto';
      if (mark && !n.querySelector('.goal-q')) n.appendChild(el('<span class="goal-q" aria-hidden="true">?</span>'));
      const go = (e) => { if (e) { e.preventDefault(); e.stopPropagation(); } if (onTap) onTap(text); };
      n.addEventListener('click', go);
      n.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') go(e); });
    };
    level.goals.forEach((g, i) => {
      const n = this.goalNodes[i];
      if (!n) return;
      if (g.type === 'order' && help.orders) wire(n, help.orders, tr('hud.help.orders', { help: help.orders }), isNew.orders);
      if (g.type === 'teapot' && help.teapot) wire(n, help.teapot, tr('hud.help.teapot', { help: help.teapot }), isNew.teapot);
      if (g.type === 'tier' && g.tier < 10) {
        const t = tr('hud.help.tier', { goal: goalCopy(tierGoalText(g, goalText(g)), pageLook()) });
        wire(n, t, tr('hud.help.goal', { help: t }), false);
      }
    });
    for (const old of this.goalsEl.querySelectorAll('.glaze-info')) old.remove();
    if (help.glazeChip && help.glaze) {
      const n = el(`<div class="goal glaze-info"><span class="goal-name">${tr('hud.glaze')}</span></div>`);
      this.goalsEl.appendChild(n);
      wire(n, help.glaze, tr('hud.help.glaze', { help: help.glaze }), true);
    }
    // cookie tins (docs/UX_TINS.md T3): same small info chip, same look
    if (help.tinChip && help.tin) {
      const n = el(`<div class="goal glaze-info tin-info"><span class="goal-name">${tr('hud.tin')}</span></div>`);
      this.goalsEl.appendChild(n);
      wire(n, help.tin, tr('hud.help.tin', { help: help.tin }), true);
    }
  }

  /**
   * Second cup (+1 drop): a gentle bump of the drops number. The note is a toast (screens.secondCupToast).
   */
  secondCup(reduced = false) {
    const chip = this.dropsChip;
    if (!chip || typeof document === 'undefined') return;
    // the note itself is a toast placed under the HUD (screens.secondCupToast, docs/UX_MECHANICS.md P4): it never
    // covers the LEVEL chip or the order ticket. Here the number gets a gentle "+1" bump (not under Calm).
    if (!reduced && this.dropsNum.animate) this.dropsNum.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 480, easing: 'ease-out' });
  }

  setGoals(level, prog) {
    level.goals.forEach((g, i) => {
      const n = this.goalNodes[i];
      if (!n) return;
      const v = Math.min(prog[i], g.count);
      n.querySelector('.goal-count').textContent = g.type === 'order' ? (v >= g.count ? '' : `×${g.count - v}`)
        : g.type === 'score' ? `${fmt(v)}/${fmt(g.count)}` : `${v}/${g.count}`;
      n.classList.toggle('done', v >= g.count);
      n.title = g.type === 'tier' ? tierGoalText(g, tierName(g.tier)) : goalCopy(goalText(g), pageLook());
      if (g.type === 'tier') n.setAttribute('aria-label', tr('hud.goal.tierLabel', { goal: tierGoalText(g, tierName(g.tier)), v, total: g.count }));
      if (g.type === 'order') n.setAttribute('aria-label', v >= g.count ? tr('hud.goal.orderServed', { name: tierName(g.tier) }) : tr('hud.goal.orderLeft', { n: g.count - v, name: tierName(g.tier) }));
    });
  }

  /** Screen-space centre of a HUD node (CSS px), or null if hidden. */
  anchorOf(node) {
    if (!node) return null;
    const b = node.getBoundingClientRect();
    if (!b.width || !b.height) return null;
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  }
  scoreAnchor() { return this.anchorOf(this.scoreEl); }
  goalAnchor(i) {
    const n = this.goalNodes[i];
    return this.anchorOf(n && (n.querySelector('canvas, .goal-ico') || n));
  }

  pulseGoal(i) {
    const n = this.goalNodes[i];
    if (!n) return;
    n.classList.remove('pop');
    void n.offsetWidth;
    n.classList.add('pop');
  }

  setBoosters(state) {
    for (const id of Object.keys(state)) {
      const b = this.boosterNodes[id];
      const s = state[id];
      if (!b) continue;
      b.classList.toggle('locked', !s.unlocked); // locked boosters are hidden (styles.css), never teased
      b.hidden = !s.unlocked;
      b.classList.toggle('active', !!s.active);
      const badge = b.querySelector('.badge');
      if (!s.unlocked) { badge.innerHTML = LOCK; badge.classList.remove('plus'); badge.classList.add('lockb'); }
      else if (s.count > 0) { badge.textContent = s.count; badge.classList.remove('plus', 'lockb', 'empty'); }
      else { badge.textContent = '0'; badge.classList.remove('plus', 'lockb'); badge.classList.add('empty'); } // a quiet 0, never a green "+" buy badge (UX_FEATURE_GATES 5)
    }
  }

  /** Journey Undo button (Fun Wave D): shows 1, then 0 once used. Dimmed unless an undo can happen now. */
  setUndo(st) {
    const b = this.undoBtn;
    if (!b || !st) return;
    const key = `${st.show ? 1 : 0}${st.left}${st.ready ? 1 : 0}${st.free ? 1 : 0}`;
    if (key === this.undoKey) return;
    this.undoKey = key;
    b.style.display = st.show ? '' : 'none';
    this.undoCount.textContent = st.left;
    b.classList.toggle('disabled', !st.ready);
    b.classList.toggle('spent', st.left <= 0);
    b.setAttribute('aria-disabled', st.ready ? 'false' : 'true');
    b.classList.toggle('free', !!st.free);
    if (st.free) { // Puzzle Books: undo as often as you like, so no count
      b.setAttribute('aria-label', st.ready ? tr('hud.undo.label') : tr('hud.undo.labelWait'));
      return;
    }
    b.setAttribute('aria-label', st.left <= 0 ? tr('hud.undo.used')
      : st.ready ? tr('hud.undo.oneLeft') : tr('hud.undo.oneLeftWait'));
  }

  /**
   * Puzzle Books: the next pieces after NEXT (up to 2 more, in order) in a small tray, so the whole order can be planned.
   * specs: [{ tier }, ...] or null to hide.
   */
  setBookTray(specs, skin) {
    if (!this.bookTray) {
      const next = $('#next-slot');
      if (!next) return;
      this.bookTray = el(`<div class="slot passive book-tray" aria-label="${tr('hud.book.trayLabel')}"><span class="book-tray-orbs"></span><span class="slot-label">${tr('hud.book.then')}</span></div>`);
      next.after(this.bookTray);
    }
    const list = (specs || []).filter(Boolean).slice(0, 2);
    this.bookTray.hidden = !specs;
    if (!specs) return;
    const key = list.map((s) => s.tier).join(',') + (skin || '');
    if (key === this.bookTrayKey) return;
    this.bookTrayKey = key;
    const box = this.bookTray.querySelector('.book-tray-orbs');
    box.innerHTML = list.length ? list.map(() => '<canvas class="orb-canvas mini"></canvas>').join('') : '<span class="book-tray-end">·</span>';
    box.querySelectorAll('canvas').forEach((cv, i) => paintOrbCanvas(cv, { ...list[i], number: this.numbers, shape: this.shapes }, skin));
    this.bookTray.setAttribute('aria-label', list.length ? tr('hud.book.thenLabel', { list: list.map((s) => tierName(s.tier)).join(', ') }) : tr('hud.book.trayEnd'));
  }

  /** Puzzle Books: the free "Show me a first drop" chip (after 2 tries, before the first drop). Never a pop-up. */
  setBookHint(show, onTap) {
    if (!this.bookHintBtn) {
      this.bookHintBtn = el(`<button class="book-hint-chip" type="button">${tr('hud.book.hint')}</button>`);
      this.bookHintBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); if (this.bookHintTap) this.bookHintTap(); });
      this.bottom.prepend(this.bookHintBtn);
    }
    this.bookHintTap = onTap || null;
    this.bookHintBtn.hidden = !show;
  }

  showHint(text) {
    this.hintEl.textContent = text;
    this.hintEl.classList.remove('hidden');
  }
  hideHint() { this.hintEl.classList.add('hidden'); }
}
