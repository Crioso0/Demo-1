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

    /* ---- loadout ---- */
    $('#btn-loadout-back').onclick = () => {
      Sfx.click();
      const lv = LEVEL_BY_N[this.loadoutLevel];
      this.renderLevels(lv ? lv.chapter : undefined);
      this.show('levels');
    };
    $('#btn-deploy').onclick = () => {
      if (!this.loadout || !this.loadout.length) { Sfx.deny(); return; }
      Sfx.click();
      this.startRun(this.loadoutLevel);
    };

    /* ---- collection ---- */
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
        this.openLoadout(lv.n);
      };
      grid.appendChild(card);
    }
  },

  /* =================== loadout =================== */
  /* Twenty heroes in the shop rail was noise — the squad is chosen here, before
     the mission, and only those heroes show up on the map screen. */
  openLoadout(levelNo) {
    this.loadoutLevel = levelNo;
    const lv = LEVEL_BY_N[levelNo];
    const slots = lv.heroSlots;
    const owned = HEROES.filter((h) => Save.owns(h.id));

    /* carry the last squad forward, then top up to the slot count so a map that
       hands out another slot never opens with it empty */
    const squad = (this.loadout || []).filter((id) => Save.owns(id)).slice(0, slots);
    for (const h of owned) {
      if (squad.length >= slots) break;
      if (!squad.includes(h.id)) squad.push(h.id);
    }
    this.loadout = squad;

    $('#lo-title').textContent = lv.name.split(' — ')[1] || lv.name;
    const escorts = (lv.specials || []).map((s) => SPECIALS[s].short);
    $('#lo-sub').textContent =
      `Mission ${lv.mission} of ${CHAPTER_BY_ID[lv.chapter].name} — `
      + `${slots} hero slot${slots > 1 ? 's' : ''} on this map. `
      + (escorts.length
        ? `Counter escorts on the field: ${escorts.join(', ')} — tags they shut down are marked in red.`
        : 'No counter escorts on this one.');

    this.renderLoadout();
    this.show('loadout');
  },

  renderLoadout() {
    const lv = LEVEL_BY_N[this.loadoutLevel];
    const slots = lv.heroSlots;
    const grid = $('#loadout-grid');
    grid.innerHTML = '';

    /* suppressed tags on this map, so the choice can be an informed one */
    const jammed = new Set();
    for (const sid of lv.specials || []) {
      const sp = SPECIALS[sid];
      for (const t of (sp.suppress || []).concat(sp.immune || [])) jammed.add(t);
    }

    for (const def of HEROES) {
      const owned = Save.owns(def.id);
      const picked = this.loadout.includes(def.id);

      const card = document.createElement('button');
      card.className = 'lo-card' + (picked ? ' picked' : '') + (owned ? '' : ' locked');
      card.style.setProperty('--r', def.rarityColor);

      const icon = document.createElement('canvas');
      icon.width = 64; icon.height = 64;
      const c = icon.getContext('2d');
      c.translate(32, 42); c.scale(1.05, 1.05);
      def.art(c, 1, 0);

      const rar = document.createElement('i');
      rar.className = 'lo-rar';
      card.appendChild(rar);
      card.appendChild(icon);

      const name = document.createElement('span');
      name.className = 'lo-name';
      name.textContent = owned ? def.name : '???';
      const role = document.createElement('span');
      role.className = 'lo-role';
      role.textContent = owned ? def.role : 'Locked — found in cases';
      card.appendChild(name);
      card.appendChild(role);

      if (owned && def.ability) {
        const ult = document.createElement('span');
        ult.className = 'lo-ult';
        ult.textContent = def.ability.name || 'Ultimate';
        card.appendChild(ult);
      }

      if (owned) {
        const tags = document.createElement('span');
        tags.className = 'lo-tags';
        for (const t of def.tags || []) {
          const s = document.createElement('span');
          s.textContent = t;
          if (jammed.has(t)) { s.style.background = 'rgba(255,90,90,.22)'; s.style.color = '#ffb0b0'; }
          tags.appendChild(s);
        }
        card.appendChild(tags);
      }

      if (picked) {
        const tick = document.createElement('i');
        tick.className = 'lo-tick';
        tick.textContent = '✓';
        card.appendChild(tick);
      }

      card.onclick = () => {
        if (!owned) { Sfx.deny(); return; }
        const at = this.loadout.indexOf(def.id);
        if (at >= 0) this.loadout.splice(at, 1);
        else if (this.loadout.length >= slots) {
          /* full — swap out the oldest pick rather than making them untick first */
          this.loadout.shift();
          this.loadout.push(def.id);
        } else this.loadout.push(def.id);
        Sfx.click();
        this.renderLoadout();
      };
      grid.appendChild(card);
    }

    $('#lo-count').textContent = `${this.loadout.length} / ${slots} picked`;

    const bar = $('#lo-picked');
    bar.innerHTML = '';
    for (let i = 0; i < slots; i++) {
      const id = this.loadout[i];
      const slot = document.createElement('div');
      slot.className = 'loadout-slot' + (id ? '' : ' empty');
      if (!id) { slot.textContent = 'Empty slot'; bar.appendChild(slot); continue; }
      const def = HERO_BY_ID[id];
      const icon = document.createElement('canvas');
      icon.width = 30; icon.height = 30;
      const c = icon.getContext('2d');
      c.translate(15, 21); c.scale(.52, .52);
      def.art(c, 1, 0);
      slot.appendChild(icon);
      slot.appendChild(document.createTextNode(def.name));
      bar.appendChild(slot);
    }

    $('#btn-deploy').disabled = this.loadout.length === 0;
    $('#btn-deploy').textContent = this.loadout.length
      ? `Deploy ${this.loadout.length === 1 ? HERO_BY_ID[this.loadout[0]].name : this.loadout.length + ' heroes'} →`
      : 'Pick a hero';
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
    /* only the squad picked on the loadout screen — the rail used to carry the
       whole roster, which read as twenty options for two slots */
    const squad = (this.loadout && this.loadout.length)
      ? this.loadout.map((id) => HERO_BY_ID[id]).filter(Boolean)
      : HEROES.filter((h) => Save.owns(h.id));
    squad.forEach((def) => heroWrap.appendChild(this.shopItem(def, true)));
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
    if (slots) slots.textContent = `${g.heroSlotsUsed} / ${g.heroSlots} deployed`;
  },

  syncInspect() {
    const t = this.game.selected;
    const panel = $('#inspect');
    if (!t) { panel.hidden = true; return; }
    panel.hidden = false;
    $('#ins-name').textContent = t.def.name;
    $('#ins-level').textContent = `Lv ${t.level}`;
    const support = t.def.kind === 'support';
    const rate = (1 / t.rate).toFixed(1);
    $('#ins-stats').innerHTML = support
      ? `<div>Boost <b>+${Math.round(t.def.buff.range * 100)}% range</b></div>
         <div>Reach <b>${Math.round(t.range)}</b></div>
         <div>Rate <b>+${Math.round((1 - t.def.buff.rate) * 100)}%</b></div>
         <div>Value <b>$${Math.round(t.spent * .7)}</b></div>`
      : `<div>Damage <b>${t.damage}</b></div>
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
      const locked = t.maxCharges === 0;
      $('#ult-name').textContent = locked
        ? `${t.def.ability.name} — locked` : t.def.ability.name;
      $('#ult-charges').textContent = locked
        ? (t.def.ability.unlockNote || 'Upgrade to unlock')
        : `${t.charges} / ${t.maxCharges}`;
      ult.classList.toggle('locked', locked);
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

    /* the label is derived, not remembered — reset() used to leave it stale */
    const sp = $('#btn-speed');
    if (sp) {
      sp.textContent = `${g.speed}×`;
      sp.classList.toggle('on', g.speed > 1);
    }

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
    const bits = [];
    if (payload.bounty) bits.push(`${payload.bounty} from stars`);
    if (payload.cityBonus) bits.push(`${payload.cityBonus} city bounty`);
    const note = $('#res-gem-note');
    if (note) { note.textContent = bits.join(' · '); note.hidden = !bits.length; }

    /* offer the next level straight from the result card */
    const again = $('#btn-res-again');
    const hasNext = win && g.levelNo < LEVEL_COUNT;
    again.textContent = hasNext ? `Mission ${g.levelNo + 1} →` : win ? 'Play again' : 'Retry mission';
    again.onclick = () => {
      $('#overlay-result').hidden = true;
      /* a new mission may hand out another hero slot, so re-pick the squad;
         a retry keeps the one you already chose */
      if (hasNext) this.openLoadout(g.levelNo + 1);
      else this.startRun(g.levelNo);
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

    this.renderCrates();
  },

  /* ---- cases ---- */
  renderCrates() {
    const list = $('#crate-list');
    list.innerHTML = '';
    const locked = Save.lockedHeroes();

    for (const crate of CRATES) {
      const afford = Save.gems >= crate.cost;
      const btn = document.createElement('button');
      btn.className = 'case-btn';
      btn.style.setProperty('--c', crate.accent);
      btn.disabled = !afford || this.crateBusy;
      const odds = ['Rare', 'Epic', 'Legendary']
        .map((r) => `<i style="--o:${RARITY_COLOR[r]}; flex:${Math.max(1, (crate.odds[r] || 0) * 100)}"
                        title="${r} ${Math.round((crate.odds[r] || 0) * 100)}%"></i>`).join('');
      btn.innerHTML = `
        <span class="cb-top">
          <span class="cb-name">${crate.name}</span>
          <span class="cb-cost">${crate.cost} gems</span>
        </span>
        <span class="cb-blurb">${crate.blurb}</span>
        <span class="cb-odds">${odds}</span>`;
      btn.onclick = () => this.openCrate(crate);
      list.appendChild(btn);
    }

    const note = $('#crate-note');
    if (!locked.length) note.textContent = 'Full roster — cases now pay out gems instead.';
    else if (Save.gems < CRATES[0].cost) {
      note.textContent = `${CRATES[0].cost - Save.gems} more gems for a ${CRATES[0].name}.`;
    } else note.textContent = `${locked.length} hero${locked.length > 1 ? 'es' : ''} still out there.`;
  },

  /** a small canvas portrait, used for both reel tiles and the result */
  heroTile(def, size, scale) {
    const cv = document.createElement('canvas');
    cv.width = size; cv.height = size;
    const c = cv.getContext('2d');
    c.translate(size / 2, size * .64);
    c.scale(scale, scale);
    def.art(c, 2, 0);
    return cv;
  },

  /**
   * The case reel: a long strip of heroes that flies past a marker and slows
   * to a stop on the one you won. The winner is decided first — the spin is
   * presentation, but the tension is real because the odds are.
   */
  openCrate(crate) {
    if (this.crateBusy) return;
    if (Save.gems < crate.cost) { Sfx.deny(); return; }
    if (!Save.spendGems(crate.cost)) { Sfx.deny(); return; }
    this.crateBusy = true;

    const locked = Save.lockedHeroes();
    const isNew = locked.length > 0;
    const pool = isNew ? locked : HEROES.filter((h) => !h.starter);
    const won = rollCrate(crate, pool);
    const refund = DUPE_REFUND[won.rarity] || 60;
    if (isNew) Save.unlock(won.id); else Save.addGems(refund);

    /* build the strip: filler drawn from everything, winner at a fixed slot */
    const reel = $('#reel');
    const stage = $('#case-stage');
    reel.innerHTML = '';
    reel.style.transition = 'none';
    reel.style.transform = 'translateX(0)';
    $('#case-result').hidden = true;
    $('#btn-crate-continue').hidden = true;
    $('#case-name').textContent = crate.name;
    $('#case-odds').textContent = ['Legendary', 'Epic', 'Rare']
      .map((r) => `${r} ${Math.round((crate.odds[r] || 0) * 100)}%`).join('  ·  ');
    stage.style.setProperty('--r', RARITY_COLOR[won.rarity]);

    const WIN_INDEX = 46;
    const TOTAL = WIN_INDEX + 12;
    const all = HEROES.filter((h) => !h.starter);
    for (let i = 0; i < TOTAL; i++) {
      const def = i === WIN_INDEX ? won : pick(all);
      const cell = document.createElement('div');
      cell.className = 'reel-item';
      cell.style.setProperty('--r', RARITY_COLOR[def.rarity] || '#5b8dd6');
      cell.appendChild(this.heroTile(def, 84, 1.5));
      reel.appendChild(cell);
    }

    $('#overlay-crate').hidden = false;
    Sfx.resume();

    /* measure a tile so the maths survives any breakpoint */
    requestAnimationFrame(() => {
      const cell = reel.children[0];
      const step = cell.getBoundingClientRect().width + 8;
      const frame = $('.reel-frame').getBoundingClientRect().width;
      /* land the winner under the marker, a little off-centre so it feels real */
      const jitter = (Math.random() - .5) * (step * .5);
      const target = (WIN_INDEX * step) + step / 2 - frame / 2 + 10 + jitter;

      const DUR = 6.4;
      reel.style.transition = `transform ${DUR}s cubic-bezier(.08,.62,.12,1)`;
      reel.style.transform = `translateX(${-target}px)`;

      /* tick as each tile crosses the marker — the ticks thin out as it slows */
      let last = -1;
      const startedAt = performance.now();
      const tick = () => {
        const t = (performance.now() - startedAt) / 1000;
        const m = new DOMMatrixReadOnly(getComputedStyle(reel).transform);
        const idx = Math.floor((-m.m41 + frame / 2) / step);
        if (idx !== last) { last = idx; Sfx.reelTick(); }
        if (t < DUR + .1) this.reelRaf = requestAnimationFrame(tick);
      };
      this.reelRaf = requestAnimationFrame(tick);

      setTimeout(() => {
        cancelAnimationFrame(this.reelRaf);
        const res = $('#case-result');
        $('#case-hero').innerHTML = '';
        $('#case-hero').appendChild(this.heroTile(won, 96, 1.8));
        $('#case-rarity').textContent = won.rarity.toUpperCase();
        $('#case-hero-name').textContent = won.name;
        $('#case-tag').textContent = isNew ? 'NEW HERO' : `DUPLICATE · +${refund} GEMS`;
        res.style.setProperty('--r', RARITY_COLOR[won.rarity]);
        res.hidden = false;
        $('#btn-crate-continue').hidden = false;
        if (won.rarity === 'Legendary') { Sfx.fanfare(); Sfx.crate(); }
        else if (isNew) Sfx.crate();
        else Sfx.coin();
      }, DUR * 1000 + 120);
    });
  },

  closeCrate() {
    cancelAnimationFrame(this.reelRaf);
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
