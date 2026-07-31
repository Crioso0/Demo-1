/* ------------------------------------------------------------------
   ui.js — screens, shop, hero collection and the crate ceremony
------------------------------------------------------------------- */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const UI = {
  game: null,
  shopItems: [],
  crateBusy: false,

  init(game) {
    this.game = game;
    game.onEvent = (type, payload) => this.onGameEvent(type, payload);

    /* ---- menu ---- */
    $('#btn-play').onclick = () => { this.renderChapters(); this.show('chapters'); };
    $('#btn-back-chapters').onclick = () => { this.renderChapters(); this.show('chapters'); };
    $('#btn-collection').onclick = () => { this.renderCollection(); this.show('collection'); };
    $('#btn-howto').onclick = () => $('#overlay-help').hidden = false;
    $('#btn-help-close').onclick = () => { $('#overlay-help').hidden = true; Save.data.seenHelp = true; Save.flush(); };
    $$('[data-back]').forEach((b) => (b.onclick = () => this.show('menu')));
    $('#btn-res-again').onclick = () => { $('#overlay-result').hidden = true; this.startRun(); };

    /* ---- collection ---- */
    $('#btn-open-crate').onclick = () => this.openCrate();
    $('#btn-crate-continue').onclick = () => this.closeCrate();

    /* ---- game chrome ---- */
    $('#btn-start-round').onclick = () => this.game.startRound();
    $('#btn-speed').onclick = () => this.toggleSpeed();
    $('#btn-quit').onclick = () => this.quitRun();
    $('#btn-upgrade').onclick = () => this.game.selected && this.game.upgrade(this.game.selected);
    $('#btn-sell').onclick = () => this.game.selected && this.game.sell(this.game.selected);
    $('#btn-ult').onclick = () => this.game.selected && this.game.activateUlt(this.game.selected);

    /* ---- results ---- */
    $('#btn-res-again').onclick = () => { $('#overlay-result').hidden = true; this.startRun(); };
    $('#btn-res-menu').onclick = () => { $('#overlay-result').hidden = true; this.show('menu'); };

    this.bindCanvas(game.canvas);
    this.bindKeys();
    this.bindMobile();
    this.bindFullscreen();
    this.bindInstall();
    this.refreshMenu();
  },

  /* =================== screens =================== */
  show(name) {
    $$('.screen').forEach((s) => s.classList.remove('active'));
    $(`#screen-${name}`).classList.add('active');
    if (name === 'menu') this.refreshMenu();
  },

  refreshMenu() {
    $('#menu-gems').textContent = Save.gems;
    $('#menu-roster').textContent = Save.data.heroes.length;
    $('#menu-roster-max').textContent = HEROES.length;
    $('#menu-stars').textContent = Save.totalStars();
    $('#menu-stars-max').textContent = LEVEL_COUNT * 3;

    /* the play button points at wherever you left off */
    const next = LEVELS.find((l) => Save.isUnlocked(l.n) && Save.starsOn(l.n) === 0) || LEVELS[0];
    const ch = CHAPTER_BY_ID[next.chapter];
    $('#menu-play-label').textContent = Save.totalStars() ? 'Continue' : 'Begin Campaign';
    $('#menu-play-sub').textContent = `${ch.name} · Mission ${next.mission}`;
  },

  /* =================== chapters =================== */
  renderChapters() {
    $('#ch-gems').textContent = Save.gems;
    $('#ch-stars').textContent = `${Save.totalStars()} / ${LEVEL_COUNT * 3}`;
    const grid = $('#chapter-grid');
    grid.innerHTML = '';

    CHAPTERS.forEach((ch, i) => {
      const unlocked = Save.chapterUnlocked(ch.id);
      const levels = LEVELS.filter((l) => l.chapter === ch.id);
      const stars = levels.reduce((a, l) => a + Save.starsOn(l.n), 0);
      const max = levels.length * 3;
      const mastered = stars >= max;
      const prev = i > 0 ? CHAPTERS[i - 1] : null;

      const card = document.createElement('button');
      card.className = 'chapter-card' + (unlocked ? '' : ' locked') + (mastered ? ' done' : '');
      card.style.setProperty('--accent', ch.accent);
      card.innerHTML = `
        <span class="ch-n">CITY ${i + 1}${mastered ? ' · MASTERED' : ''}</span>
        <span class="ch-name">${unlocked ? ch.name : '???'}</span>
        <span class="ch-tag">${unlocked ? ch.tag : 'sealed'}</span>
        <span class="ch-blurb">${unlocked ? ch.blurb : `Take every star in ${prev ? prev.name : 'the previous city'} to open this one.`}</span>
        ${unlocked ? `<span class="ch-boss"><b>${ch.boss.name}</b> — ${ch.boss.line}</span>` : ''}
        <span class="ch-bar"><i style="width:${max ? (stars / max) * 100 : 0}%"></i></span>
        <span class="ch-stat"><span>${levels.length} missions</span><b>${stars} / ${max} ★</b></span>
        ${unlocked || !prev ? '' : `<span class="ch-lock">🔒 needs ${
          levels.length * 3 - LEVELS.filter((l) => l.chapter === prev.id)
            .reduce((a, l) => a + Save.starsOn(l.n), 0)} more stars in ${prev.name}</span>`}`;
      card.onclick = () => {
        if (!unlocked) { Sfx.deny(); return; }
        Sfx.click();
        this.renderLevels(ch.id);
        this.show('levels');
      };
      grid.appendChild(card);
    });
  },

  /* =================== campaign =================== */
  renderLevels(chapterId) {
    this.chapterId = chapterId || this.chapterId || CHAPTERS[0].id;
    const ch = CHAPTER_BY_ID[this.chapterId];
    const levels = LEVELS.filter((l) => l.chapter === ch.id);
    const stars = levels.reduce((a, l) => a + Save.starsOn(l.n), 0);
    const max = levels.length * 3;

    $('#lvl-gems').textContent = Save.gems;
    $('#lvl-chapter-name').textContent = ch.name;
    $('#lvl-blurb').textContent = stars >= max
      ? `${ch.name} is fully mastered — the next city is open.`
      : `${ch.blurb} Take all ${max} stars here to open the next city.`;
    $('#lvl-gate').innerHTML = `<b>${stars}</b>/${max} stars`;

    const grid = $('#level-grid');
    grid.innerHTML = '';

    for (const lv of levels) {
      const unlocked = Save.isUnlocked(lv.n);
      const got = Save.starsOn(lv.n);
      const next = unlocked && got === 0;
      const mods = lv.mods || {};

      const card = document.createElement('button');
      card.className = 'level-card' + (got ? ' cleared' : '')
        + (!unlocked ? ' locked' : '') + (next ? ' next' : '');
      card.innerHTML = `
        <span class="lv-stars">${[1, 2, 3].map((k) =>
          `<i class="${got >= k ? 'on' : ''}"></i>`).join('')}</span>
        <span class="lv-n">MISSION ${lv.mission}</span>
        <span class="lv-name">${unlocked ? lv.name.split(' — ')[1] : 'Locked'}</span>
        <span class="lv-map">${lv.rounds} rounds · ${lv.lives} lives</span>
        <span class="lv-meta">
          ${lv.boss ? `<span class="tag boss">${lv.boss.length}× Dreadnought</span>` : ''}
          ${mods.swift ? '<span class="tag swift">Runners</span>' : ''}
          ${mods.shield ? '<span class="tag shield">Shielded</span>' : ''}
          ${(lv.specials || []).map((sid) =>
            `<span class="tag counter" style="--c:${SPECIALS[sid].color}"
                   title="${SPECIALS[sid].desc}">${SPECIALS[sid].short}</span>`).join('')}
          <span class="tag gems">+${levelReward(lv)} gems</span>
        </span>
        ${lv.chapterBoss ? `<span class="lv-boss-name">☠ ${lv.chapterBoss.name}</span>` : ''}`;
      card.onclick = () => {
        if (!unlocked) { Sfx.deny(); return; }
        Sfx.click();
        this.startRun(lv.n);
      };
      grid.appendChild(card);
    }
  },

  startRun(levelNo) {
    this.game.reset(levelNo || this.game.levelNo || 1);
    this.buildShop();
    this.syncHud(true);
    this.show('game');
    Sfx.resume();
    if (this.syncRotateHint) this.syncRotateHint();
    if (!Save.data.seenHelp) $('#overlay-help').hidden = false;
  },

  quitRun() {
    const lv = LEVEL_BY_N[this.game.levelNo];
    this.game.reset(this.game.levelNo);
    this.renderLevels(lv ? lv.chapter : undefined);
    this.show('levels');
  },

  /* =================== shop =================== */
  buildShop() {
    const towerWrap = $('#shop-towers');
    const heroWrap = $('#shop-heroes');
    towerWrap.innerHTML = '';
    heroWrap.innerHTML = '';
    this.shopItems = [];

    TOWERS.forEach((def) => towerWrap.appendChild(this.shopItem(def, false)));
    HEROES.forEach((def) => heroWrap.appendChild(this.shopItem(def, true)));
    this.syncShop();
  },

  shopItem(def, isHero) {
    const owned = !isHero || Save.owns(def.id);
    const el = document.createElement('button');
    el.className = 'shop-item';
    el.dataset.id = def.id;
    el.dataset.hero = isHero ? '1' : '';
    el.title = def.desc;

    const icon = document.createElement('canvas');
    icon.width = 46; icon.height = 46;
    const c = icon.getContext('2d');
    c.translate(23, isHero ? 30 : 25);
    c.scale(.82, .82);
    def.art(c, 1, 0);
    el.appendChild(icon);

    const txt = document.createElement('span');
    txt.className = 'si-txt';
    txt.innerHTML = owned
      ? `<span class="si-name">${def.name}</span>
         <span class="si-cost${isHero ? ' free' : ''}">${isHero
            ? (def.tags ? def.tags.join(' · ') : 'HERO') : '$' + def.cost}</span>`
      : `<span class="si-name">${def.name}</span><span class="si-lock">🔒 in crates</span>`;
    el.appendChild(txt);

    el.onclick = () => {
      if (el.classList.contains('disabled')) return;
      const g = this.game;
      if (g.placing && g.placing.def === def) {
        g.cancelPlacing();
        if (this.coarse) g.pointer.inside = false;
        this.syncShop();
        return;
      }
      g.beginPlacing(def, isHero);
      if (this.coarse) {
        /* no hover on touch — show the ghost immediately, centre of the map */
        g.pointer.x = CANVAS_W / 2;
        g.pointer.y = CANVAS_H / 2;
        g.pointer.inside = true;
      }
      this.syncShop();
      this.syncInspect();
      Sfx.click();
    };

    this.shopItems.push({ el, def, isHero });
    return el;
  },

  syncShop() {
    const g = this.game;
    for (const it of this.shopItems) {
      const owned = !it.isHero || Save.owns(it.def.id);
      const placed = it.isHero && g.heroesPlaced.has(it.def.id);
      const noSlot = it.isHero && !placed && g.heroSlotsFree <= 0;
      const poor = !it.isHero && g.cash < it.def.cost;
      const disabled = !owned || placed || poor || noSlot;
      it.el.classList.toggle('disabled', disabled);
      it.el.classList.toggle('selected', !!g.placing && g.placing.def === it.def);
      if (it.isHero && owned) {
        const cost = it.el.querySelector('.si-cost');
        const tower = placed && g.towers.find((t) => t.def === it.def);
        if (cost) {
          cost.textContent = tower && tower.suppressed ? `⚠ ${tower.suppressed.short}`
            : placed ? 'deployed'
            : noSlot ? 'no slot free'
            : (it.def.tags ? it.def.tags.join(' · ') : 'HERO');
          cost.classList.toggle('warn', !!(tower && tower.suppressed));
        }
      }
    }
    const slots = $('#hero-slots');
    if (slots) slots.textContent = `${g.heroSlotsUsed} / ${HERO_SLOTS} deployed`;
  },

  syncInspect() {
    const t = this.game.selected;
    const panel = $('#inspect');
    if (!t) { panel.hidden = true; return; }
    panel.hidden = false;
    $('#ins-name').textContent = t.def.name;
    $('#ins-level').textContent = `Lv ${t.level}`;
    const rate = (1 / t.rate).toFixed(1);
    $('#ins-stats').innerHTML = `
      <div>Damage <b>${t.damage}</b></div>
      <div>Range <b>${Math.round(t.range)}</b></div>
      <div>Rate <b>${rate}/s</b></div>
      <div>Value <b>$${Math.round(t.spent * .7)}</b></div>`;
    const warn = $('#ins-warn');
    if (t.suppressed) {
      warn.hidden = false;
      warn.textContent = `${t.suppressed.name} is suppressing this hero`;
      warn.style.setProperty('--warn', t.suppressed.color);
    } else {
      warn.hidden = true;
    }

    const ult = $('#btn-ult');
    if (t.def.ability) {
      ult.hidden = false;
      $('#ult-name').textContent = t.def.ability.name;
      $('#ult-charges').textContent = `${t.charges} / ${t.maxCharges}`;
      ult.disabled = !this.game.canUseUlt(t);
    } else {
      ult.hidden = true;
    }

    const up = $('#btn-upgrade');
    if (t.level >= MAX_LEVEL) {
      up.disabled = true; up.textContent = 'Max level';
    } else {
      const cost = upgradeCost(t.def, t.level);
      up.disabled = this.game.cash < cost;
      up.textContent = `Upgrade $${cost}`;
    }
    $('#btn-sell').textContent = `Sell $${Math.round(t.spent * .7)}`;
  },

  syncHud() {
    const g = this.game;
    $('#hud-lives').textContent = g.lives;
    $('#hud-cash').textContent = g.cash;
    $('#hud-round').textContent = `${g.round}/${g.waves.length}`;
    $('#hud-level').textContent = `MISSION ${g.level.mission} · ${g.levelNo}/${LEVEL_COUNT}`;
    $('#hud-map').textContent = CHAPTER_BY_ID[g.level.chapter].name;

    const go = $('#btn-start-round');
    go.classList.toggle('running', g.running);
    go.disabled = g.running || g.over;
    go.querySelector('.go-label').textContent = g.running ? 'Round running…' : 'Start Round';
    go.querySelector('#go-sub').textContent = g.running
      ? `${g.enemies.length} hostiles on the field`
      : g.round === 0 ? `${g.waves.length} rounds to clear` : `Next: round ${g.round + 1}`;
  },

  toggleSpeed() {
    const g = this.game;
    g.speed = g.speed === 1 ? 2 : g.speed === 2 ? 3 : 1;
    const b = $('#btn-speed');
    b.textContent = `${g.speed}×`;
    b.classList.toggle('on', g.speed > 1);
  },

  banner(text) {
    const el = $('#wave-banner');
    el.textContent = text;
    el.classList.remove('show');
    void el.offsetWidth;   // restart the animation
    el.classList.add('show');
  },

  onGameEvent(type, payload) {
    switch (type) {
      case 'round-start': this.banner(`ROUND ${payload}`); break;
      case 'round-end': this.syncShop(); break;
      case 'shop': this.syncShop(); this.syncInspect(); break;
      case 'victory': setTimeout(() => this.showResult(true, payload), 900); break;
      case 'defeat': setTimeout(() => this.showResult(false, payload), 1100); break;
    }
  },

  showResult(win, payload) {
    const g = this.game;
    const gems = payload.gems || 0;
    const card = $('#overlay-result').firstElementChild;
    card.classList.toggle('defeat', !win);

    const done = win && Save.campaignComplete();
    const ch = CHAPTER_BY_ID[g.level.chapter];
    const chapterDone = win && Save.chapterMastered(ch.id);

    $('#res-title').textContent = done ? 'Campaign Complete!'
      : chapterDone ? `${ch.name} Mastered!`
      : win ? 'Mission Clear!' : 'Overrun!';

    const starRow = $('#res-stars');
    starRow.hidden = !win;
    if (win) {
      const kids = Array.from(starRow.children);
      kids.forEach((el, i) => {
        el.className = '';
        void el.offsetWidth;
        el.className = (i < payload.stars ? 'on ' : '') + 'show';
      });
      if (payload.stars === 3) setTimeout(() => Sfx.coin(), 500);
    }

    $('#res-sub').textContent = done
      ? 'Every city is held. The Void Legion is broken on every front.'
      : win
        ? `${g.level.name} held with ${g.lives}/${g.level.lives} lives.`
          + (payload.best ? ' New best!' : '')
          + (chapterDone ? ` The next city is open.` : '')
        : `The bastion fell on round ${g.round} of ${g.waves.length}. `
          + `Three stars needs ${Math.ceil(g.level.lives * .9)} lives left.`;
    $('#res-gems').textContent = `+${gems}`;

    /* offer the next level straight from the result card */
    const again = $('#btn-res-again');
    const hasNext = win && g.levelNo < LEVEL_COUNT;
    again.textContent = hasNext ? `Level ${g.levelNo + 1} →` : win ? 'Play again' : 'Retry level';
    again.onclick = () => {
      $('#overlay-result').hidden = true;
      this.startRun(hasNext ? g.levelNo + 1 : g.levelNo);
    };
    $('#btn-res-menu').textContent = 'Missions';
    $('#btn-res-menu').onclick = () => {
      $('#overlay-result').hidden = true;
      this.renderLevels(g.level.chapter);
      this.show('levels');
    };

    $('#overlay-result').hidden = false;
    this.refreshMenu();
  },

  /* =================== collection =================== */
  renderCollection() {
    $('#col-gems').textContent = Save.gems;
    const wrap = $('#hero-cards');
    wrap.innerHTML = '';

    for (const h of HEROES) {
      const owned = Save.owns(h.id);
      const card = document.createElement('div');
      card.className = 'hero-card' + (owned ? '' : ' locked');
      card.style.setProperty('--glow', h.glow);

      const art = document.createElement('div');
      art.className = 'art';
      const cv = document.createElement('canvas');
      cv.width = 150; cv.height = 150;
      const c = cv.getContext('2d');
      c.translate(75, 92);
      c.scale(2.6, 2.6);
      h.art(c, owned ? 2 : 1, 0);
      art.appendChild(cv);

      card.appendChild(art);
      card.insertAdjacentHTML('beforeend', `
        <h3>${owned ? h.name : '???'}</h3>
        <div class="role">${h.role}</div>
        <div class="desc">${owned ? h.desc : 'Locked. Open a hero crate for a chance to recruit.'}</div>
        ${owned && h.tags ? `<div class="hero-tags">${h.tags
          .map((t) => `<span>${t}</span>`).join('')}</div>` : ''}
        <span class="state ${owned ? 'owned' : 'locked'}">${owned ? '✔ UNLOCKED' : '🔒 LOCKED'}</span>
        ${h.starter ? '<span class="starter">STARTER</span>' : ''}`);
      wrap.appendChild(card);
    }

    const btn = $('#btn-open-crate');
    btn.disabled = Save.gems < 150;
    const note = $('#crate-note');
    if (Save.lockedHeroes().length === 0) note.textContent = 'Full roster! Crates now pay out gems.';
    else if (Save.gems < 150) note.textContent = `${150 - Save.gems} more gems needed.`;
    else note.textContent = 'Ready to open!';
  },

  openCrate() {
    if (this.crateBusy) return;
    if (!Save.spendGems(150)) return;
    this.crateBusy = true;

    const locked = Save.lockedHeroes();
    const isNew = locked.length > 0;
    const hero = isNew ? pick(locked) : pick(HEROES);
    if (isNew) Save.unlock(hero.id);
    else Save.addGems(75);

    const stage = $('#crate-stage');
    stage.className = 'crate-stage';
    $('#reveal-card').style.setProperty('--rare', hero.rarityColor);
    $('#btn-crate-continue').hidden = true;
    $('#overlay-crate').hidden = false;

    Sfx.resume();
    Sfx.crateRumble();
    stage.classList.add('shaking');

    setTimeout(() => {
      stage.classList.remove('shaking');
      stage.classList.add('burst');
      Sfx.crate();
    }, 1250);

    setTimeout(() => {
      /* fill in the reveal card */
      const art = $('#reveal-art');
      art.innerHTML = '';
      const cv = document.createElement('canvas');
      cv.width = 170; cv.height = 170;
      const c = cv.getContext('2d');
      c.translate(85, 104);
      c.scale(3, 3);
      hero.art(c, 3, 0);
      art.appendChild(cv);

      $('#reveal-name').textContent = hero.name;
      $('#reveal-role').textContent = hero.role;
      const tag = $('#reveal-tag');
      tag.textContent = isNew ? `NEW · ${hero.rarity.toUpperCase()}` : 'DUPLICATE · +75 GEMS';
      stage.classList.add('revealed');
      $('#btn-crate-continue').hidden = false;
      if (isNew) Sfx.fanfare(); else Sfx.coin();
    }, 1750);
  },

  closeCrate() {
    $('#overlay-crate').hidden = true;
    this.crateBusy = false;
    this.renderCollection();
    this.refreshMenu();
  },

  /* =================== full screen + install =================== */
  /**
   * Two ways out of browser chrome:
   *   1. the Fullscreen API, where the platform supports it (one tap, nothing to install)
   *   2. adding the app to the home screen, which is the only route on iPhone Safari
   * We can't trigger #2 from script on iOS, so we detect the situation and say
   * exactly what to look for instead of guessing at a menu that keeps moving.
   */
  bindFullscreen() {
    const root = document.documentElement;
    const btn = $('#btn-fullscreen');
    const can = !!(root.requestFullscreen || root.webkitRequestFullscreen);
    btn.hidden = !can;
    if (!can) return;

    const isFull = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
    const paint = () => btn.classList.toggle('on', isFull());

    btn.onclick = async () => {
      try {
        if (isFull()) {
          await (document.exitFullscreen ? document.exitFullscreen() : document.webkitExitFullscreen());
        } else if (root.requestFullscreen) {
          await root.requestFullscreen({ navigationUI: 'hide' });
        } else {
          root.webkitRequestFullscreen();
        }
      } catch (e) { /* the browser said no; the button just does nothing */ }
      paint();
    };
    document.addEventListener('fullscreenchange', paint);
    document.addEventListener('webkitfullscreenchange', paint);
  },

  bindInstall() {
    const card = $('#install-card');
    const title = $('#install-title');
    const body = $('#install-body');
    const go = $('#install-go');
    $('#install-x').onclick = () => { card.hidden = true; this.installDismissed = true; };

    const nav = navigator.userAgent || '';
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || window.matchMedia('(display-mode: fullscreen)').matches
      || window.navigator.standalone === true;
    const iOS = /iPad|iPhone|iPod/.test(nav)
      || (nav.includes('Macintosh') && 'ontouchend' in document);
    /* an in-app webview can't install anything — the user has to get to Safari first */
    const inApp = /FBAN|FBAV|Instagram|Line|Twitter|LinkedIn|Snapchat|Pinterest/i.test(nav)
      || (iOS && !/Safari/.test(nav) && /AppleWebKit/.test(nav))
      || window.self !== window.top;

    if (standalone) return;                 // already installed, nothing to say

    if (inApp) {
      title.textContent = 'Open this in your browser';
      body.innerHTML = 'You are in an app’s built-in browser, which can’t install anything. '
        + 'Use its menu to <b>Open in Safari</b> (or copy the link and paste it there) — '
        + 'then you can add it to your home screen.';
      card.hidden = this.installDismissed;
      return;
    }

    if (iOS) {
      title.textContent = 'Add it to your home screen';
      body.innerHTML = 'In Safari, open the <b>share menu</b> — the <kbd>↑</kbd> box icon, '
        + 'or the <kbd>⋯</kbd> / <kbd>≡</kbd> button if your Safari keeps its controls there — '
        + 'then choose <b>Add to Home Screen</b>. It launches full screen and works offline.';
      card.hidden = this.installDismissed;
      return;
    }

    /* everywhere that supports a real install prompt, offer one button */
    window.addEventListener('beforeinstallprompt', (ev) => {
      ev.preventDefault();
      this.deferredInstall = ev;
      title.textContent = 'Install Void Bastion';
      body.textContent = 'Runs full screen in its own window, and works offline.';
      go.hidden = false;
      card.hidden = this.installDismissed;
    });
    go.onclick = async () => {
      const ev = this.deferredInstall;
      if (!ev) return;
      this.deferredInstall = null;
      card.hidden = true;
      try { await ev.prompt(); } catch (e) { /* dismissed */ }
    };
  },

  /* =================== phones =================== */
  bindMobile() {
    /* iOS keeps audio locked until a gesture — take the first one we get */
    const unlock = () => Sfx.resume();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('touchstart', unlock, { once: true });

    const hint = $('#rotate-hint');
    $('#rotate-hint-x').onclick = () => {
      hint.hidden = true;
      this.hintDismissed = true;
    };
    const sync = () => {
      const portrait = window.matchMedia('(orientation: portrait)').matches;
      const small = window.innerWidth < 900;
      const show = !this.hintDismissed && portrait && small && this.coarse;
      hint.hidden = !show;
      /* say it once, briefly, then stop nagging */
      if (show && !this.hintTimer) {
        this.hintTimer = setTimeout(() => { this.hintDismissed = true; hint.hidden = true; }, 9000);
      }
    };
    window.addEventListener('resize', sync);
    window.addEventListener('orientationchange', () => setTimeout(sync, 200));
    this.syncRotateHint = sync;
    sync();
  },

  /* =================== input =================== */
  bindCanvas(canvas) {
    const g = this.game;
    /* touch has no hover, so placement works as drag-then-release instead */
    const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    this.coarse = coarse;
    let dragging = false;

    const toWorld = (ev) => {
      const r = canvas.getBoundingClientRect();
      return {
        x: ((ev.clientX - r.left) / r.width) * CANVAS_W,
        y: ((ev.clientY - r.top) / r.height) * CANVAS_H,
      };
    };

    /** tap on a placed unit: select it, and fire a charged hero on the same tap */
    const pick = (p) => {
      const reach = coarse ? 34 : 26;
      let hit = null;
      for (const t of g.towers) if (distSq(t.x, t.y, p.x, p.y) < reach * reach) hit = t;
      g.selected = hit;
      if (hit && hit.def.ability && g.canUseUlt(hit)) g.activateUlt(hit);
      this.syncInspect();
    };

    canvas.addEventListener('pointermove', (ev) => {
      const p = toWorld(ev);
      g.pointer.x = p.x; g.pointer.y = p.y;
      g.pointer.inside = true;
      if (coarse && dragging) ev.preventDefault();
    }, { passive: false });

    canvas.addEventListener('pointerleave', () => {
      if (!coarse) g.pointer.inside = false;
    });

    canvas.addEventListener('pointerdown', (ev) => {
      Sfx.resume();
      const p = toWorld(ev);
      if (ev.button === 2) { g.cancelPlacing(); this.syncShop(); return; }

      g.pointer.x = p.x; g.pointer.y = p.y;
      g.pointer.inside = true;

      if (!coarse) {
        /* mouse: click places straight away, the hover preview already showed it */
        if (g.placing) {
          if (g.tryPlace(p.x, p.y)) { this.syncShop(); this.syncInspect(); }
          return;
        }
        pick(p);
        return;
      }

      /* touch: hold the preview under the finger and wait for the lift */
      dragging = true;
      if (canvas.setPointerCapture) {
        try { canvas.setPointerCapture(ev.pointerId); } catch (e) { /* ignore */ }
      }
      ev.preventDefault();
    }, { passive: false });

    canvas.addEventListener('pointerup', (ev) => {
      if (!coarse || !dragging) return;
      dragging = false;
      const p = toWorld(ev);
      g.pointer.x = p.x; g.pointer.y = p.y;

      if (g.placing) {
        if (g.tryPlace(p.x, p.y)) { this.syncShop(); this.syncInspect(); }
        else this.syncShop();
      } else {
        pick(p);
      }
      /* drop the ghost once the finger is gone */
      g.pointer.inside = !!g.placing;
      ev.preventDefault();
    }, { passive: false });

    canvas.addEventListener('pointercancel', () => {
      dragging = false;
      if (coarse) g.pointer.inside = !!g.placing;
    });

    canvas.addEventListener('contextmenu', (ev) => ev.preventDefault());
  },

  bindKeys() {
    window.addEventListener('keydown', (ev) => {
      const g = this.game;
      if (ev.key === 'Escape') {
        g.cancelPlacing(); g.selected = null;
        this.syncShop(); this.syncInspect();
      }
      if (!$('#screen-game').classList.contains('active')) return;
      if (ev.code === 'Space') { ev.preventDefault(); if (!g.running && !g.over) g.startRound(); }
      if (ev.key >= '1' && ev.key <= '4') {
        const def = TOWERS[+ev.key - 1];
        if (def) { g.beginPlacing(def, false); this.syncShop(); }
      }
      if (ev.key.toLowerCase() === 'f') this.toggleSpeed();
      if (ev.key.toLowerCase() === 'q') {
        /* fire the selected hero's ability, or whichever one is charged */
        const t = (g.selected && g.selected.def.ability) ? g.selected
          : g.towers.find((x) => g.canUseUlt(x));
        if (t) g.activateUlt(t);
      }
    });
  },
};
