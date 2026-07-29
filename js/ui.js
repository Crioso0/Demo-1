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
    $('#btn-play').onclick = () => this.startRun();
    $('#btn-collection').onclick = () => { this.renderCollection(); this.show('collection'); };
    $('#btn-howto').onclick = () => $('#overlay-help').hidden = false;
    $('#btn-help-close').onclick = () => { $('#overlay-help').hidden = true; Save.data.seenHelp = true; Save.flush(); };
    $$('[data-back]').forEach((b) => (b.onclick = () => this.show('menu')));

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
  },

  startRun() {
    this.game.reset();
    this.buildShop();
    this.syncHud(true);
    this.show('game');
    Sfx.resume();
    if (!Save.data.seenHelp) $('#overlay-help').hidden = false;
  },

  quitRun() {
    this.game.reset();
    this.show('menu');
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
         <span class="si-cost${isHero ? ' free' : ''}">${isHero ? 'HERO · free' : '$' + def.cost}</span>`
      : `<span class="si-name">${def.name}</span><span class="si-lock">🔒 in crates</span>`;
    el.appendChild(txt);

    el.onclick = () => {
      if (el.classList.contains('disabled')) return;
      const g = this.game;
      if (g.placing && g.placing.def === def) { g.cancelPlacing(); this.syncShop(); return; }
      g.beginPlacing(def, isHero);
      this.syncShop();
      this.syncInspect();
      Sfx.tone({ freq: 620, dur: .06, type: 'triangle', gain: .03 });
    };

    this.shopItems.push({ el, def, isHero });
    return el;
  },

  syncShop() {
    const g = this.game;
    for (const it of this.shopItems) {
      const owned = !it.isHero || Save.owns(it.def.id);
      const placed = it.isHero && g.heroesPlaced.has(it.def.id);
      const poor = !it.isHero && g.cash < it.def.cost;
      const disabled = !owned || placed || poor;
      it.el.classList.toggle('disabled', disabled);
      it.el.classList.toggle('selected', !!g.placing && g.placing.def === it.def);
      if (it.isHero && owned) {
        const cost = it.el.querySelector('.si-cost');
        if (cost) cost.textContent = placed ? 'HERO · deployed' : 'HERO · free';
      }
    }
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
    $('#hud-round').textContent = `${g.round}/${WAVES.length}`;

    const go = $('#btn-start-round');
    go.classList.toggle('running', g.running);
    go.disabled = g.running || g.over;
    go.querySelector('.go-label').textContent = g.running ? 'Round running…' : 'Start Round';
    go.querySelector('#go-sub').textContent = g.running
      ? `${g.bloons.length} balloons on the map`
      : g.round === 0 ? `${WAVES.length} rounds to win` : `Next: round ${g.round + 1}`;
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
      case 'defeat': setTimeout(() => this.showResult(false, payload), 900); break;
    }
  },

  showResult(win, gems) {
    const card = $('#overlay-result').firstElementChild;
    card.classList.toggle('defeat', !win);
    $('#res-title').textContent = win ? 'Victory!' : 'Overrun!';
    $('#res-sub').textContent = win
      ? `All ${WAVES.length} rounds cleared with ${this.game.lives} lives left.`
      : `The bastion fell on round ${this.game.round}.`;
    $('#res-gems').textContent = `+${gems}`;
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
    Sfx.tone({ freq: 160, to: 420, dur: 1.1, type: 'sawtooth', gain: .03 });
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

  /* =================== input =================== */
  bindCanvas(canvas) {
    const g = this.game;
    const toWorld = (ev) => {
      const r = canvas.getBoundingClientRect();
      return {
        x: ((ev.clientX - r.left) / r.width) * CANVAS_W,
        y: ((ev.clientY - r.top) / r.height) * CANVAS_H,
      };
    };

    canvas.addEventListener('pointermove', (ev) => {
      const p = toWorld(ev);
      g.pointer.x = p.x; g.pointer.y = p.y;
      g.pointer.inside = true;
    });
    canvas.addEventListener('pointerleave', () => { g.pointer.inside = false; });

    canvas.addEventListener('pointerdown', (ev) => {
      Sfx.resume();
      const p = toWorld(ev);
      if (ev.button === 2) { g.cancelPlacing(); this.syncShop(); return; }

      if (g.placing) {
        if (g.tryPlace(p.x, p.y)) { this.syncShop(); this.syncInspect(); }
        return;
      }
      /* select / deselect a placed unit */
      let hit = null;
      for (const t of g.towers) if (distSq(t.x, t.y, p.x, p.y) < 26 * 26) hit = t;
      g.selected = hit;
      /* a charged hero fires on the same click that selects him, so the
         inspect panel is still reachable for upgrading and selling */
      if (hit && hit.def.ability && g.canUseUlt(hit)) g.activateUlt(hit);
      this.syncInspect();
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
