/* ------------------------------------------------------------------
   game.js — simulation + rendering for the tower-defense stage
------------------------------------------------------------------- */

/* =============================== VOID LEGION TROOPER =============================== */
class Enemy {
  constructor(tier, opts = {}) {
    this.tier = tier;                 // 0..4, 'boss' or 'chapterBoss'
    this.chapterBoss = tier === 'chapterBoss' ? opts.bossDef : null;
    this.boss = tier === 'boss' || !!this.chapterBoss;
    this.d = 0;                       // distance marched along the route
    this.x = 0; this.y = 0; this.ang = 0;
    this.seed = rand(0, TAU);
    this.dead = false;
    this.slowT = 0; this.slowF = 1;
    this.burnT = 0; this.burnTick = 0;
    this.hitFlash = 0;
    this.spawnAnim = 0;
    this.swift = !!opts.swift;        // runner
    this.shield = !!opts.shield;      // soaks part of every hit
    this.speedMul = opts.speedMul || 1;
    this.special = opts.special ? SPECIALS[opts.special] : null;   // counter escort
    this.lane = opts.lane || 0;                                    // which road
    this.marked = 0;                  // Nocturne's prep work: takes double damage
    this.backward = 0;                // Jester's confusion: marches the wrong way
    this.hp = this.chapterBoss ? this.chapterBoss.hp
      : this.boss ? Math.round(DREAD.hp * (opts.hpMul || 1)) : 1;
    this.maxHp = this.hp;
    this.r = this.chapterBoss ? 46 : this.boss ? DREAD.r : TROOPS[tier].r;
    this.powerCd = this.chapterBoss ? this.chapterBoss.power.interval * .6 : 0;
    this.step = rand(0, TAU);         // walk cycle offset
  }

  get info() { return this.chapterBoss || (this.boss ? DREAD : TROOPS[this.tier]); }
  get path() { return PATHS[this.lane] || PATHS[0]; }
  get color() { return this.info.color; }
  get speed() {
    return this.info.speed * this.slowF * this.speedMul * (this.swift ? SWIFT_MUL : 1);
  }
  /** does this unit shrug off a damage source carrying these tags? */
  immuneTo(tags) {
    if (!this.special || !this.special.immune || !tags) return false;
    return tags.some((t) => this.special.immune.includes(t));
  }

  update(dt, game) {
    this.spawnAnim = Math.min(1, this.spawnAnim + dt * 4);
    if (this.slowT > 0) { this.slowT -= dt; if (this.slowT <= 0) this.slowF = 1; }
    if (this.hitFlash > 0) this.hitFlash -= dt * 4;

    if (this.burnT > 0) {
      this.burnT -= dt;
      this.burnTick -= dt;
      if (this.burnTick <= 0) {
        this.burnTick = .55;
        game.damage(this, 1, { silent: true, dot: true });
        if (this.dead) return;
      }
      if (Math.random() < dt * 24) {
        game.particles.push(new Particle(this.x + rand(-6, 6), this.y + rand(-8, 4), {
          vx: rand(-14, 14), vy: rand(-46, -22), life: .5, size: rand(2, 4.5),
          color: pick(['#ffd166', '#ff8a3d', '#ff5f2e']), kind: 'spark',
        }));
      }
    }

    if (this.marked > 0) this.marked -= dt;
    if (this.chapterBoss) {
      this.powerCd -= dt;
      if (this.powerCd <= 0) {
        this.powerCd = this.chapterBoss.power.interval;
        game.bossPower(this);
      }
    }

    const v = this.speed;
    if (this.backward > 0) {
      /* confused: marching back the way it came */
      this.backward -= dt;
      this.d = Math.max(0, this.d - v * .6 * dt);
      this.step += dt * v * .09;
      const q = this.path.at(this.d);
      this.x = q.x; this.y = q.y; this.ang = q.ang;
      return;
    }

    this.d += v * dt;
    this.step += dt * v * .09;
    if (this.d >= this.path.length) { game.leak(this); return; }
    const p = this.path.at(this.d);
    this.x = p.x; this.y = p.y; this.ang = p.ang;
  }

  chill(factor, time) {
    if (factor < this.slowF) this.slowF = factor;
    this.slowT = Math.max(this.slowT, time);
  }

  ignite(time) { this.burnT = Math.max(this.burnT, time); }

  draw(ctx, time) {
    const grow = easeOutBack(this.spawnAnim);
    ctx.save();
    ctx.translate(this.x, this.y);

    ctx.fillStyle = 'rgba(0,0,0,.24)';
    ctx.beginPath();
    ctx.ellipse(2, this.r * .82 + 4, this.r * .74, this.r * .3, 0, 0, TAU);
    ctx.fill();

    if (this.chapterBoss) this.drawChapterBoss(ctx, time, grow);
    else if (this.boss) this.drawDread(ctx, time, grow);
    else this.drawTrooper(ctx, time, grow);

    ctx.restore();
  }

  drawTrooper(ctx, time, grow) {
    const info = TROOPS[this.tier];
    ctx.scale(grow * 1.18, grow * 1.18);
    /* troopers stay upright and face the way they are marching */
    if (Math.cos(this.ang) < 0) ctx.scale(-1, 1);

    const swing = Math.sin(this.step * 2) * 3.4;
    const bounce = Math.abs(Math.cos(this.step * 2)) * 1.4;
    ctx.translate(0, -bounce);

    /* legs */
    ctx.fillStyle = '#22262f';
    ctx.save(); ctx.translate(-1.5, 4); ctx.rotate(swing * .06);
    roundRect(ctx, -2.6, 0, 5, 9, 2); ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate(2.5, 4); ctx.rotate(-swing * .06);
    roundRect(ctx, -2.6, 0, 5, 9, 2); ctx.fill(); ctx.restore();

    /* torso plating in the tier colour */
    const g = ctx.createLinearGradient(0, -9, 0, 5);
    g.addColorStop(0, shade(info.color, .18));
    g.addColorStop(1, info.trim);
    ctx.fillStyle = g;
    roundRect(ctx, -6.5, -8, 13, 13, 4); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 1.4; ctx.stroke();

    /* shoulder pads */
    ctx.fillStyle = info.trim;
    roundRect(ctx, -9, -8.5, 4.5, 7, 2); ctx.fill();
    roundRect(ctx, 4.5, -8.5, 4.5, 7, 2); ctx.fill();

    /* rifle held forward */
    ctx.fillStyle = '#171a22';
    roundRect(ctx, 5, -4.5, 12, 2.8, 1.2); ctx.fill();
    ctx.fillStyle = '#3d4453';
    roundRect(ctx, 12, -5.4, 4, 1.6, .8); ctx.fill();

    /* helmet with a hot visor slit */
    ctx.fillStyle = '#2b3040';
    ctx.beginPath(); ctx.arc(0, -12.5, 5.4, 0, TAU); ctx.fill();
    ctx.fillStyle = shade(info.color, -.05);
    ctx.beginPath(); ctx.arc(0, -13.6, 5.4, Math.PI * 1.02, Math.PI * 1.98); ctx.fill();
    const glow = .6 + Math.sin(time * 5 + this.seed) * .4;
    ctx.fillStyle = `rgba(255,60,50,${.6 + glow * .4})`;
    roundRect(ctx, -3.4, -12.6, 7, 2.1, 1); ctx.fill();
    ctx.fillStyle = `rgba(255,180,160,${glow * .5})`;
    roundRect(ctx, 1, -12.4, 2.2, 1.6, .8); ctx.fill();

    if (this.swift) {
      /* speed streaks trailing behind a runner */
      ctx.strokeStyle = 'rgba(255,240,180,.5)'; ctx.lineWidth = 1.4;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-10 - i * 4, -6 + i * 4);
        ctx.lineTo(-17 - i * 5, -6 + i * 4);
        ctx.stroke();
      }
    }
    if (this.shield) {
      const p = .5 + Math.sin(time * 4 + this.seed) * .5;
      ctx.strokeStyle = `rgba(120,220,255,${.45 + p * .35})`;
      ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.arc(0, -5, 14, 0, TAU); ctx.stroke();
      ctx.fillStyle = `rgba(120,220,255,${.1 + p * .07})`;
      ctx.beginPath(); ctx.arc(0, -5, 14, 0, TAU); ctx.fill();
    }
    if (this.special) this.drawSpecial(ctx, time);
    if (this.slowT > 0) {
      ctx.fillStyle = 'rgba(160,230,255,.3)';
      roundRect(ctx, -8, -14, 16, 20, 5); ctx.fill();
    }
    if (this.marked > 0) {
      const p = .6 + Math.sin(time * 9) * .4;
      ctx.strokeStyle = `rgba(255,90,110,${p})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(0, -6, 13, 0, TAU); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-17, -6); ctx.lineTo(-11, -6); ctx.moveTo(11, -6); ctx.lineTo(17, -6);
      ctx.moveTo(0, -23); ctx.lineTo(0, -17); ctx.moveTo(0, 5); ctx.lineTo(0, 11);
      ctx.stroke();
    }
    if (this.backward > 0) {
      ctx.fillStyle = `rgba(200,140,255,${.5 + Math.sin(time * 12) * .3})`;
      ctx.font = 'bold 11px Trebuchet MS, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('?', 0, -24);
    }
    if (this.hitFlash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${clamp(this.hitFlash, 0, .7)})`;
      roundRect(ctx, -8, -16, 16, 22, 5); ctx.fill();
    }
  }

  /** the escort's badge, and the ground ring showing its suppression reach */
  drawSpecial(ctx, time) {
    const sp = this.special;
    const p = .5 + Math.sin(time * 3 + this.seed) * .5;

    ctx.save();
    ctx.strokeStyle = rgba(sp.color, .8);
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(0, -6, 12 + p * 1.5, 0, TAU); ctx.stroke();

    ctx.fillStyle = sp.color;
    ctx.save();
    ctx.translate(0, -22);
    if (sp.badge === 'crystal') {
      ctx.beginPath();
      ctx.moveTo(0, -6); ctx.lineTo(3.4, 0); ctx.lineTo(0, 5); ctx.lineTo(-3.4, 0);
      ctx.closePath(); ctx.fill();
    } else if (sp.badge === 'ring') {
      ctx.lineWidth = 2.2; ctx.strokeStyle = sp.color;
      ctx.beginPath(); ctx.arc(0, 0, 4, 0, TAU); ctx.stroke();
    } else if (sp.badge === 'coil') {
      ctx.lineWidth = 1.6; ctx.strokeStyle = sp.color;
      ctx.beginPath();
      for (let i = 0; i < 3; i++) ctx.arc(0, -3 + i * 3, 3.4, .2, Math.PI - .2);
      ctx.stroke();
    } else {
      ctx.globalAlpha = .8;
      ctx.beginPath();
      ctx.arc(-2.5, 0, 3, 0, TAU); ctx.arc(2.5, -1, 3.4, 0, TAU); ctx.arc(0, 2, 2.6, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    /* a soft halo so the escort is obvious in a crowd */
    const halo = ctx.createRadialGradient(0, -6, 2, 0, -6, 22);
    halo.addColorStop(0, rgba(sp.color, .3));
    halo.addColorStop(1, rgba(sp.color, 0));
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(0, -6, 22, 0, TAU); ctx.fill();
    ctx.restore();
  }

  /** a city's warlord: bigger, lit in its own colour, with a named health bar */
  drawChapterBoss(ctx, time, grow) {
    const bd = this.chapterBoss;
    ctx.scale(grow, grow);
    if (Math.cos(this.ang) < 0) ctx.scale(-1, 1);
    const gait = Math.sin(this.step * 1.4) * 2.5;
    const charge = clamp(1 - this.powerCd / bd.power.interval, 0, 1);

    /* aura, brighter as the next power comes round */
    const halo = ctx.createRadialGradient(0, 0, 8, 0, 0, 62);
    halo.addColorStop(0, rgba(bd.color, .18 + charge * .32));
    halo.addColorStop(1, rgba(bd.color, 0));
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(0, 0, 62, 0, TAU); ctx.fill();

    /* legs */
    ctx.strokeStyle = '#14161f'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    for (const s2 of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s2 * 18, 10);
      ctx.lineTo(s2 * 24 + gait * s2, 26);
      ctx.lineTo(s2 * 17 + gait * s2, 40);
      ctx.stroke();
    }

    /* hull */
    const w = 86, h = 56;
    const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    g.addColorStop(0, shade(bd.color, .1));
    g.addColorStop(.5, '#2b3145');
    g.addColorStop(1, '#12151f');
    ctx.fillStyle = g;
    roundRect(ctx, -w / 2, -h / 2, w, h, 16); ctx.fill();
    ctx.strokeStyle = rgba(bd.color, .8); ctx.lineWidth = 3; ctx.stroke();

    /* shoulder mounts */
    ctx.fillStyle = '#1b2030';
    roundRect(ctx, -w / 2 - 8, -h / 2 + 4, 12, 20, 5); ctx.fill();
    roundRect(ctx, w / 2 - 4, -h / 2 + 4, 12, 20, 5); ctx.fill();

    /* core, winding up between powers */
    const pulse = .5 + Math.sin(time * 6) * .5;
    const core = ctx.createRadialGradient(0, 0, 1, 0, 0, 20 + charge * 8);
    core.addColorStop(0, 'rgba(255,255,255,.95)');
    core.addColorStop(.4, rgba(bd.color, .85));
    core.addColorStop(1, rgba(bd.color, 0));
    ctx.fillStyle = core;
    ctx.beginPath(); ctx.arc(0, 0, (20 + charge * 8) * (.85 + pulse * .15), 0, TAU); ctx.fill();

    /* crown of spikes so it reads as the boss at a glance */
    ctx.fillStyle = rgba(bd.color, .95);
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 12 - 4, -h / 2);
      ctx.lineTo(i * 12, -h / 2 - 14 - Math.abs(i) * -3);
      ctx.lineTo(i * 12 + 4, -h / 2);
      ctx.closePath(); ctx.fill();
    }

    /* name plate + health */
    const p = clamp(this.hp / this.maxHp, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,.6)';
    roundRect(ctx, -52, -h / 2 - 40, 104, 10, 5); ctx.fill();
    const hg = ctx.createLinearGradient(-52, 0, 52, 0);
    hg.addColorStop(0, '#ff5a6e'); hg.addColorStop(1, bd.color);
    ctx.fillStyle = hg;
    roundRect(ctx, -50.5, -h / 2 - 38.5, 101 * p, 7, 3.5); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px Trebuchet MS, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(bd.name.toUpperCase(), 0, -h / 2 - 46);

    if (this.hitFlash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${clamp(this.hitFlash, 0, .8)})`;
      roundRect(ctx, -w / 2, -h / 2, w, h, 16); ctx.fill();
    }
  }

  drawDread(ctx, time, grow) {
    ctx.scale(grow, grow);
    if (Math.cos(this.ang) < 0) ctx.scale(-1, 1);
    const gait = Math.sin(this.step * 1.6) * 2;

    const w = 74, h = 46;
    /* walker legs */
    ctx.strokeStyle = '#1b2030'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    for (const s2 of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s2 * 16, 8);
      ctx.lineTo(s2 * 20 + gait * s2, 20);
      ctx.lineTo(s2 * 14 + gait * s2, 30);
      ctx.stroke();
    }

    /* hull */
    const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    g.addColorStop(0, '#5b6580'); g.addColorStop(.5, DREAD.color); g.addColorStop(1, '#1d2231');
    ctx.fillStyle = g;
    roundRect(ctx, -w / 2, -h / 2, w, h, 12); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 2.5; ctx.stroke();

    /* armour seams */
    ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 1.6;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.moveTo(i * 18, -h / 2 + 5); ctx.lineTo(i * 18, h / 2 - 5); ctx.stroke();
    }

    /* cannon and core */
    ctx.fillStyle = '#171b28';
    roundRect(ctx, w / 2 - 6, -7, 20, 12, 4); ctx.fill();
    const pulse = .55 + Math.sin(time * 5) * .45;
    const core = ctx.createRadialGradient(-4, 0, 1, -4, 0, 13);
    core.addColorStop(0, `rgba(255,80,60,${.7 + pulse * .3})`);
    core.addColorStop(1, 'rgba(255,60,40,0)');
    ctx.fillStyle = core;
    ctx.beginPath(); ctx.arc(-4, 0, 13, 0, TAU); ctx.fill();
    ctx.fillStyle = `rgba(255,180,140,${pulse})`;
    ctx.beginPath(); ctx.arc(-4, 0, 4.5, 0, TAU); ctx.fill();

    /* health bar */
    const p = clamp(this.hp / this.maxHp, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    roundRect(ctx, -34, -h / 2 - 16, 68, 8, 4); ctx.fill();
    const hg = ctx.createLinearGradient(-34, 0, 34, 0);
    hg.addColorStop(0, '#ff5a6e'); hg.addColorStop(1, '#ffd166');
    ctx.fillStyle = hg;
    roundRect(ctx, -32.5, -h / 2 - 14.5, 65 * p, 5, 2.5); ctx.fill();

    if (this.hitFlash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${clamp(this.hitFlash, 0, .8)})`;
      roundRect(ctx, -w / 2, -h / 2, w, h, 12); ctx.fill();
    }
  }
}

/* =============================== TOWER =============================== */
class Tower {
  constructor(def, x, y, isHero) {
    this.def = def;
    this.isHero = !!isHero;
    this.x = x; this.y = y;
    this.level = 1;
    this.angle = 0;
    this.facing = 1;
    this.cd = 0;
    this.recoil = 0;
    this.pops = 0;
    this.spent = def.cost || 0;
    this.placeAnim = 0;
    /* activated-ability state */
    this.charges = this.maxCharges;
    this.ultAnim = 0;
    this.overdrive = 0;      // Streak's supersonic window
    this.rampage = 0;        // Breaker off the leash
    this.rampageKills = 0;
    this.disabled = 0;       // knocked offline by a boss power
  }

  get mods() { return levelMods(this.level); }
  get maxCharges() { return this.def.ability ? this.def.ability.charges[this.level - 1] : 0; }
  get ultReady() { return !!this.def.ability && this.charges > 0; }
  get rate() { return this.def.cooldown * this.mods.rate; }
  get damage() { return this.def.damage + this.mods.damage; }
  get pierce() { return (this.def.pierce || 1) + this.mods.pierce; }
  /** a Relay Mast in range widens the reach and shortens the cycle */
  get range() {
    const rampage = this.rampage > 0 ? 2 : 1;
    return this.def.range * this.mods.range * (this.buffRange || 1) * rampage;
  }
  /** Overdrive collapses the cooldown to a fraction of normal; Rally speeds everything up */
  firingRateIn(game) {
    let r = this.overdrive > 0 ? this.rate * .17 : this.rate;
    if (game && game.rally > 0) r *= .5;
    if (this.buffRate) r *= this.buffRate;
    /* each kill during a Rampage shortens the next swing */
    if (this.rampage > 0) r *= Math.max(.28, .5 - this.rampageKills * .02);
    return r;
  }

  update(dt, game) {
    this.placeAnim = Math.min(1, this.placeAnim + dt * 3.2);
    if (this.ultAnim > 0) this.ultAnim = Math.max(0, this.ultAnim - dt);
    if (this.rampage > 0) this.rampage = Math.max(0, this.rampage - dt);
    if (this.overdrive > 0) {
      this.overdrive = Math.max(0, this.overdrive - dt);
      /* he blurs through his own after-images while it lasts */
      if (Math.random() < dt * 30) {
        game.particles.push(new Particle(this.x + rand(-10, 10), this.y + rand(-12, 8), {
          vx: rand(-30, 30), vy: rand(-40, 10), life: .3, size: rand(2, 4),
          color: pick(['#ffd23f', '#ff6a5e', '#fff2b0']), kind: 'spark',
        }));
      }
    }
    if (this.recoil > 0) this.recoil = Math.max(0, this.recoil - dt * 26);
    this.cd -= dt;

    if (this.disabled > 0) {
      this.disabled -= dt;
      this.cd = Math.max(this.cd, .15);
      return;
    }
    if (this.suppressed) { this.cd = Math.max(this.cd, .15); return; }

    const target = game.firstInRange(this.x, this.y, this.range);
    if (target) {
      const want = Math.atan2(target.y - this.y, target.x - this.x);
      /* short-path angle interpolation */
      let diff = ((want - this.angle + Math.PI * 3) % TAU) - Math.PI;
      this.angle += diff * Math.min(1, dt * 12);
      this.facing = Math.cos(want) < 0 ? -1 : 1;
    }

    if (this.def.kind === 'support') return;

    if (this.cd <= 0) {
      const kind = this.def.kind;
      if (kind === 'frost' || kind === 'slam') {
        if (game.anyInRange(this.x, this.y, this.range)) { this.fire(game, null); this.cd = this.firingRateIn(game); }
      } else if (target) {
        this.fire(game, target); this.cd = this.firingRateIn(game);
      }
    }
  }

  fire(game, target) {
    const d = this.def;
    this.recoil = 5;

    /* while Overdrive is up every shot forks between nearby targets */
    if (this.overdrive > 0 && d.ability && d.ability.kind === 'overdrive' && target) {
      const pool = game.enemies.filter((e) => !e.dead
        && distSq(e.x, e.y, this.x, this.y) <= this.range * this.range);
      pool.sort((a, b) => distSq(a.x, a.y, target.x, target.y) - distSq(b.x, b.y, target.x, target.y));
      const hits = pool.slice(0, 3);
      const pts = [{ x: this.x + this.facing * 12, y: this.y - 3 }, ...hits.map((e) => ({ x: e.x, y: e.y }))];
      game.beams.push({ pts, life: .12, maxLife: .12, color: '#ffe27a', width: 2.6 });
      hits.forEach((e) => game.damage(e, this.damage, { source: this, x: e.x, y: e.y, tags: d.tags }));
      Sfx.spark();
      return;
    }

    switch (d.kind) {
      case 'dart': {
        const a = this.angle;
        game.projectiles.push(new Projectile(this, {
          x: this.x + Math.cos(a) * 18, y: this.y + Math.sin(a) * 18,
          vx: Math.cos(a) * d.projSpeed, vy: Math.sin(a) * d.projSpeed,
          damage: this.damage, pierce: this.pierce, life: this.range / d.projSpeed + .12,
          kind: 'dart', color: this.isHero ? (d.color || '#ffb15c') : '#e9eeff',
          burn: d.burn ? d.burn.time : 0, size: 4, tags: d.tags, web: d.web || null,
        }));
        Sfx.shoot();
        break;
      }
      case 'burst': {
        for (let i = 0; i < d.shots; i++) {
          const a = (i / d.shots) * TAU + game.time * .5;
          game.projectiles.push(new Projectile(this, {
            x: this.x + Math.cos(a) * 14, y: this.y + Math.sin(a) * 14,
            vx: Math.cos(a) * d.projSpeed, vy: Math.sin(a) * d.projSpeed,
            damage: this.damage, pierce: this.pierce, life: this.range / d.projSpeed,
            kind: 'tack', color: '#f2f6ff', size: 3.2,
          }));
        }
        Sfx.tack();
        break;
      }
      case 'bomb': {
        const a = this.angle;
        game.projectiles.push(new Projectile(this, {
          x: this.x + Math.cos(a) * 18, y: this.y + Math.sin(a) * 18,
          vx: Math.cos(a) * d.projSpeed, vy: Math.sin(a) * d.projSpeed,
          damage: this.damage, pierce: 1, life: this.range / d.projSpeed,
          kind: 'bomb', color: '#20263c', size: 7, blast: d.blast + (this.level - 1) * 8,
        }));
        Sfx.shoot();
        break;
      }
      case 'frost': {
        game.rings.push({ x: this.x, y: this.y, r: 8, max: this.range, life: .55, maxLife: .55, color: '#a9e9ff' });
        for (const b of game.enemies) {
          if (b.dead || distSq(b.x, b.y, this.x, this.y) > this.range * this.range) continue;
          b.chill(d.slow, d.slowTime);
          game.damage(b, this.damage, { source: this, x: b.x, y: b.y, tags: d.tags });
        }
        Sfx.frost();
        break;
      }
      case 'chain': {
        const hits = [];
        let from = { x: this.x, y: this.y };
        let pool = game.enemies.filter((b) => !b.dead && distSq(b.x, b.y, this.x, this.y) <= this.range * this.range);
        const maxChains = d.chains + (this.level - 1);
        for (let i = 0; i < maxChains && pool.length; i++) {
          pool.sort((a, b) => distSq(a.x, a.y, from.x, from.y) - distSq(b.x, b.y, from.x, from.y));
          const t = pool.shift();
          hits.push(t);
          from = t;
        }
        if (!hits.length) return;
        const pts = [{ x: this.x + this.facing * 13, y: this.y }, ...hits.map((b) => ({ x: b.x, y: b.y }))];
        game.beams.push({ pts, life: .22, maxLife: .22, color: '#8fe6ff', width: 3.4 });
        hits.forEach((b, i) => game.damage(b, Math.max(1, this.damage - (i > 1 ? 1 : 0)),
          { source: this, x: b.x, y: b.y, tags: d.tags }));
        game.shake = Math.max(game.shake, 2);
        Sfx.zap();
        break;
      }
      case 'slam': {
        game.rings.push({ x: this.x, y: this.y, r: 10, max: this.range, life: .45, maxLife: .45, color: '#d8b58a', thick: 7 });
        for (let i = 0; i < 14; i++) {
          const a = rand(0, TAU);
          game.particles.push(new Particle(this.x, this.y, {
            vx: Math.cos(a) * rand(60, 190), vy: Math.sin(a) * rand(60, 190) - 40,
            life: rand(.4, .8), size: rand(2.5, 5.5), color: pick(['#a08054', '#7f6a49', '#c9b28c']),
            kind: 'shard', gravity: 320,
          }));
        }
        for (const b of game.enemies) {
          if (b.dead || distSq(b.x, b.y, this.x, this.y) > this.range * this.range) continue;
          b.d = Math.max(0, b.d - d.knockback);
          b.chill(d.slow, d.slowTime);
          game.damage(b, this.damage, { source: this, x: b.x, y: b.y, tags: d.tags });
        }
        game.shake = Math.max(game.shake, 6);
        Sfx.slam();
        break;
      }
      case 'smash': {
        /* arm's length only, but it flattens everything in the arc */
        game.rings.push({ x: this.x, y: this.y, r: 10, max: this.range, life: .35,
          maxLife: .35, color: '#8bef6a', thick: 8 });
        for (let i = 0; i < 12; i++) {
          const a = rand(0, TAU);
          game.particles.push(new Particle(this.x, this.y, {
            vx: Math.cos(a) * rand(70, 200), vy: Math.sin(a) * rand(70, 200) - 40,
            life: rand(.3, .6), size: rand(2.5, 5), color: pick(['#8bef6a', '#c8b18a', '#6b5a3f']),
            kind: 'shard', gravity: 340,
          }));
        }
        for (const b of game.enemies) {
          if (b.dead || distSq(b.x, b.y, this.x, this.y) > this.range * this.range) continue;
          b.d = Math.max(0, b.d - 18);
          const was = b.dead;
          game.damage(b, this.damage, { source: this, x: b.x, y: b.y, tags: d.tags });
          if (!was && b.dead && this.rampage > 0) this.rampageKills++;
        }
        game.shake = Math.max(game.shake, 5);
        Sfx.smash();
        break;
      }
      case 'cards': {
        /* a fan of three, each card rolling its own damage */
        const base = this.angle;
        for (let i = -1; i <= 1; i++) {
          const a = base + i * .22;
          game.projectiles.push(new Projectile(this, {
            x: this.x + Math.cos(a) * 14, y: this.y + Math.sin(a) * 14,
            vx: Math.cos(a) * d.projSpeed, vy: Math.sin(a) * d.projSpeed,
            damage: randInt(1, 3 + this.level), pierce: this.pierce,
            life: this.range / d.projSpeed + .1,
            kind: 'card', color: '#f4f2ee', size: 4, tags: d.tags,
          }));
        }
        Sfx.cards();
        break;
      }
      case 'ray': {
        /* weak but constant green energy beam */
        game.beams.push({
          pts: [{ x: this.x + this.facing * 15, y: this.y - 3 }, { x: target.x, y: target.y }],
          life: .15, maxLife: .15, color: d.rayColor || '#5cff9e', width: 3, straight: true,
        });
        game.damage(target, this.damage, { source: this, x: target.x, y: target.y, tags: d.tags });
        game.spark(target.x, target.y, d.rayColor || '#9dffc6', 5);
        Sfx.spark();
        break;
      }
    }
  }

  draw(ctx, time, selected) {
    const pop = easeOutBack(this.placeAnim);
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(pop, pop);

    if (this.disabled > 0) {
      ctx.save();
      ctx.filter = 'grayscale(1) brightness(.7)';
      if (this.def.rotates) { ctx.save(); ctx.rotate(this.angle); this.def.art(ctx, this.level, time); ctx.restore(); }
      else if (this.isHero) { ctx.save(); ctx.scale(this.facing, 1); this.def.art(ctx, this.level, time); ctx.restore(); }
      else this.def.art(ctx, this.level, time);
      ctx.restore();
      const p = .5 + Math.sin(time * 14) * .5;
      ctx.strokeStyle = `rgba(150,220,255,${.5 + p * .4})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, -2, 22, 0, TAU); ctx.stroke();
      for (let i = 0; i < 4; i++) {
        const a = time * 3 + (i * TAU) / 4;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 16, -2 + Math.sin(a) * 16);
        ctx.lineTo(Math.cos(a) * 26, -2 + Math.sin(a) * 26);
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    if (this.def.rotates) {
      ctx.save();
      ctx.rotate(this.angle);
      ctx.translate(-this.recoil, 0);
      this.def.art(ctx, this.level, time);
      ctx.restore();
    } else if (this.isHero) {
      /* mid-ultimate the hero swells and blazes */
      const ult = this.ultAnim > 0 ? Math.sin((1 - this.ultAnim / ULT_ANIM_TIME) * Math.PI) : 0;
      if (ult > 0) ctx.scale(1 + ult * .9, 1 + ult * .9);

      /* heroes stay upright and simply face their target */
      if (this.def.glow) {
        const r = 34 + ult * 26;
        const gl = ctx.createRadialGradient(0, 0, 4, 0, 0, r);
        gl.addColorStop(0, ult > 0 ? `rgba(90,255,150,${.45 + ult * .5})` : this.def.glow);
        gl.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gl;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
      }

      /* a jammed hero: drained of colour, ringed in the jammer's own light */
      if (this.suppressed) {
        ctx.save();
        ctx.filter = 'grayscale(1) brightness(.65)';
        ctx.save(); ctx.scale(this.facing, 1);
        this.def.art(ctx, this.level, time);
        ctx.restore();
        ctx.restore();

        const p = .5 + Math.sin(time * 5) * .5;
        ctx.strokeStyle = rgba(this.suppressed.color, .5 + p * .4);
        ctx.lineWidth = 2.2;
        ctx.setLineDash([5, 4]);
        ctx.lineDashOffset = time * 16;
        ctx.beginPath(); ctx.arc(0, -2, 24, 0, TAU); ctx.stroke();
        ctx.setLineDash([]);
        /* a struck-through circle: this one is offline */
        ctx.strokeStyle = rgba(this.suppressed.color, .95);
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, -30, 6.5, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-4.6, -34.6); ctx.lineTo(4.6, -25.4); ctx.stroke();
        ctx.restore();
        return;
      }

      /* Overdrive: after-images, crackle and a ring counting the window down */
      if (this.overdrive > 0) {
        const dur = this.def.ability.duration[this.level - 1];
        const left = clamp(this.overdrive / dur, 0, 1);
        ctx.save();
        ctx.globalAlpha = .3;
        for (let i = 1; i <= 3; i++) {
          ctx.save();
          ctx.translate(-this.facing * i * 7, 0);
          ctx.scale(this.facing, 1);
          ctx.globalAlpha = .26 - i * .06;
          this.def.art(ctx, this.level, time - i * .05);
          ctx.restore();
        }
        ctx.restore();

        ctx.strokeStyle = `rgba(255,214,80,${.45 + Math.sin(time * 30) * .3})`;
        ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.arc(0, -2, 26, 0, TAU); ctx.stroke();
        for (let i = 0; i < 5; i++) {
          const a = time * 14 + (i * TAU) / 5;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * 22, -2 + Math.sin(a) * 22);
          ctx.lineTo(Math.cos(a + .25) * 32, -2 + Math.sin(a + .25) * 32);
          ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(255,255,255,.9)';
        ctx.lineWidth = 3.4; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(0, -2, 31, -Math.PI / 2, -Math.PI / 2 + TAU * left);
        ctx.stroke();
      }

      /* a charged ability advertises itself with a slow pulsing ring */
      if (this.ultReady && ult === 0) {
        const p = .5 + Math.sin(time * 3.4) * .5;
        ctx.strokeStyle = `rgba(92,255,158,${.25 + p * .45})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, 26 + p * 4, 0, TAU); ctx.stroke();
      }

      ctx.save();
      ctx.scale(this.facing, 1);
      this.def.art(ctx, this.level, time);
      ctx.restore();

      if (ult > 0) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = `rgba(70,255,140,${ult * .16})`;
        ctx.beginPath(); ctx.arc(0, -4, 20, 0, TAU); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = `rgba(180,255,210,${ult * .8})`;
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(0, -4, 22 + ult * 4, 0, TAU); ctx.stroke();
      }

      /* level pips */
      ctx.fillStyle = '#ffd977';
      for (let i = 0; i < this.level; i++) {
        starPath(ctx, -6 + i * 6, 20, 5, 3.2, 1.4);
        ctx.fill();
      }

      /* ability charges, one pip per use left */
      if (this.def.ability) {
        const n = this.maxCharges;
        for (let i = 0; i < n; i++) {
          const cx = -(n - 1) * 4.5 + i * 9;
          const lit = i < this.charges;
          ctx.beginPath(); ctx.arc(cx, -32, 3.4, 0, TAU);
          ctx.fillStyle = lit ? '#5cff9e' : 'rgba(255,255,255,.16)';
          ctx.fill();
          if (lit) {
            ctx.strokeStyle = 'rgba(180,255,210,.9)'; ctx.lineWidth = 1.2; ctx.stroke();
          }
        }
      }
    } else {
      this.def.art(ctx, this.level, time);
    }
    ctx.restore();

    /* a mast quietly shows what it is covering */
    if (this.def.kind === 'support') {
      ctx.save();
      ctx.strokeStyle = `rgba(176,164,255,${selected ? .55 : .22})`;
      ctx.fillStyle = `rgba(176,164,255,${selected ? .1 : .045})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(this.x, this.y, this.range, 0, TAU);
      ctx.fill(); ctx.stroke();
      ctx.restore();
    } else if (this.buffRange > 1) {
      ctx.save();
      ctx.strokeStyle = `rgba(190,175,255,${.35 + Math.sin(time * 3) * .15})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(this.x, this.y, 21, -1.1, -2.05, true); ctx.stroke();
      ctx.restore();
    }

    if (selected) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,.5)';
      ctx.fillStyle = 'rgba(255,255,255,.07)';
      ctx.lineWidth = 2;
      ctx.setLineDash([7, 6]);
      ctx.lineDashOffset = -time * 22;
      ctx.beginPath(); ctx.arc(this.x, this.y, this.range, 0, TAU);
      ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }
}

/* =============================== PROJECTILE =============================== */
class Projectile {
  constructor(owner, o) {
    Object.assign(this, o);
    this.owner = owner;
    this.dead = false;
    this.hits = new Set();
    this.age = 0;
    this.spin = rand(0, TAU);
  }

  update(dt, game) {
    this.age += dt;

    /* micro-missiles steer toward their mark */
    if (this.kind === 'missile') {
      if (!this.target || this.target.dead) {
        this.target = game.firstInRange(this.x, this.y, 900);
      }
      if (this.target) {
        const want = Math.atan2(this.target.y - this.y, this.target.x - this.x);
        const cur = Math.atan2(this.vy, this.vx);
        let diff = ((want - cur + Math.PI * 3) % TAU) - Math.PI;
        const a = cur + diff * Math.min(1, dt * 6);
        const sp = Math.hypot(this.vx, this.vy);
        this.vx = Math.cos(a) * sp;
        this.vy = Math.sin(a) * sp;
      }
      if (Math.random() < dt * 60) {
        game.particles.push(new Particle(this.x, this.y, {
          vx: rand(-20, 20), vy: rand(-20, 20), life: .25, size: rand(2, 4),
          color: pick(['#ffd9a0', '#ff8a5c', '#9aa3b8']), kind: 'smoke',
        }));
      }
    }

    if (this.age >= this.life) {
      if (this.kind === 'bomb' || this.kind === 'missile') {
        game.explode(this.x, this.y, this.blast, this.damage, this.owner, this.tags);
      }
      this.dead = true; return;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.spin += dt * 14;

    if (this.x < -30 || this.x > CANVAS_W + 30 || this.y < -30 || this.y > CANVAS_H + 30) {
      this.dead = true; return;
    }

    for (const b of game.enemies) {
      if (b.dead || this.hits.has(b)) continue;
      const rr = b.r + this.size;
      if (distSq(b.x, b.y, this.x, this.y) > rr * rr) continue;

      if (this.kind === 'bomb' || this.kind === 'missile') {
        game.explode(this.x, this.y, this.blast, this.damage, this.owner, this.tags);
        this.dead = true; return;
      }
      this.hits.add(b);
      if (this.burn) b.ignite(this.burn);
      if (this.web) b.chill(this.web.slow, this.web.time);
      game.damage(b, this.damage, { source: this.owner, x: this.x, y: this.y, tags: this.tags });
      if (--this.pierce <= 0) { this.dead = true; return; }
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    if (this.kind === 'missile') {
      ctx.rotate(Math.atan2(this.vy, this.vx));
      ctx.fillStyle = '#d8dee9';
      roundRect(ctx, -5, -2, 10, 4, 1.6); ctx.fill();
      ctx.fillStyle = '#c53a30';
      ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(1, 2.4); ctx.lineTo(1, -2.4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = `rgba(255,${170 + Math.random() * 60},80,.95)`;
      ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(-11 - Math.random() * 4, 0);
      ctx.lineTo(-5, 1.8); ctx.closePath(); ctx.fill();
    } else if (this.kind === 'bomb') {
      ctx.rotate(this.spin);
      ctx.fillStyle = '#20263c';
      ctx.beginPath(); ctx.arc(0, 0, this.size, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.3)';
      ctx.beginPath(); ctx.arc(-2, -2, 2, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#ffb15c'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(0, -this.size); ctx.lineTo(2, -this.size - 4); ctx.stroke();
      ctx.fillStyle = '#ffe066';
      ctx.beginPath(); ctx.arc(2.5, -this.size - 5, 1.8 + Math.random(), 0, TAU); ctx.fill();
    } else if (this.kind === 'card') {
      ctx.rotate(this.spin);
      ctx.fillStyle = '#f4f2ee';
      roundRect(ctx, -3, -4.5, 6, 9, 1.4); ctx.fill();
      ctx.fillStyle = this.damage > 2 ? '#c8324f' : '#16121c';
      ctx.beginPath(); ctx.arc(0, 0, 1.4, 0, TAU); ctx.fill();
    } else if (this.kind === 'tack') {
      ctx.rotate(Math.atan2(this.vy, this.vx));
      ctx.fillStyle = this.color;
      ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-4, 2.4); ctx.lineTo(-4, -2.4); ctx.closePath(); ctx.fill();
    } else {
      ctx.rotate(Math.atan2(this.vy, this.vx));
      /* motion streak */
      const grad = ctx.createLinearGradient(-16, 0, 6, 0);
      grad.addColorStop(0, rgba('#ffffff', 0));
      grad.addColorStop(1, this.color === '#ffb15c' ? 'rgba(255,177,92,.85)' : 'rgba(230,238,255,.8)');
      ctx.strokeStyle = grad; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(4, 0); ctx.stroke();
      ctx.fillStyle = this.color;
      ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(-2, 3); ctx.lineTo(-2, -3); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
}

/* =============================== SAW CONSTRUCT =============================== */
/* Verdant's ultimate: a ring-construct sawblade that rolls the whole track. */
const ULT_ANIM_TIME = 1.1;

class Saw {
  constructor(level, lane = 0) {
    this.level = level;
    this.lane = lane;
    this.d = 0;
    this.speed = 400 + (level - 1) * 80;
    this.r = 32 + (level - 1) * 7;
    this.damage = level >= 3 ? 14 : level === 2 ? 11 : 9;
    this.spin = 0;
    this.age = 0;
    this.dead = false;
    this.path = PATHS[lane] || PATHS[0];
    this.x = this.path.at(0).x; this.y = this.path.at(0).y;
    /* brief per-target cooldown so a Dreadnought is chewed, not one-shot */
    this.hitAt = new Map();
    /* the blade hum runs for as long as the saw is on the track */
    this.voice = Sfx.startSaw(level);
  }

  update(dt, game) {
    this.age += dt;
    this.spin += dt * 15;
    this.d += this.speed * dt;
    const p = this.path.at(this.d);
    this.x = p.x; this.y = p.y;

    /* sparks off the track */
    for (let i = 0, n = game.n(2); i < n; i++) {
      const a = rand(0, TAU);
      game.particles.push(new Particle(this.x, this.y, {
        vx: Math.cos(a) * rand(50, 220), vy: Math.sin(a) * rand(50, 220),
        life: rand(.2, .5), size: rand(1.5, 3.5),
        color: pick(['#5cff9e', '#bfffd8', '#1fbf6a']), kind: 'spark', gravity: 60,
      }));
    }

    for (const b of game.enemies) {
      if (b.dead) continue;
      const rr = this.r + b.r;
      if (distSq(b.x, b.y, this.x, this.y) > rr * rr) continue;
      if ((this.hitAt.get(b) || 0) > this.age) continue;
      this.hitAt.set(b, this.age + .12);
      game.damage(b, this.damage, { source: this, x: b.x, y: b.y, silent: true, tags: ['construct'] });
      game.spark(b.x, b.y, '#9dffc6', 6);
      this.voice.bite();
    }

    if (this.d >= this.path.length) {
      this.dead = true;
      this.voice.stop();
      game.explodeFx(this.x, this.y, 70, '#5cff9e');
      game.shake = Math.max(game.shake, 6);
    }
  }

  draw(ctx, time) {
    ctx.save();
    ctx.translate(this.x, this.y);

    /* construct glow */
    const gl = ctx.createRadialGradient(0, 0, this.r * .3, 0, 0, this.r * 1.75);
    gl.addColorStop(0, 'rgba(92,255,158,.55)');
    gl.addColorStop(1, 'rgba(92,255,158,0)');
    ctx.fillStyle = gl;
    ctx.beginPath(); ctx.arc(0, 0, this.r * 1.75, 0, TAU); ctx.fill();

    const blade = (radius, spin, alpha) => {
      ctx.save();
      ctx.rotate(spin);
      const ri = radius * .82;
      const teeth = 12;
      const w = (TAU / teeth) * .38;

      /* raked teeth around the rim */
      ctx.fillStyle = `rgba(200,255,222,${.85 * alpha})`;
      for (let i = 0; i < teeth; i++) {
        const a = (i / teeth) * TAU;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a - w) * ri, Math.sin(a - w) * ri);
        ctx.lineTo(Math.cos(a - w * .25) * radius, Math.sin(a - w * .25) * radius);
        ctx.lineTo(Math.cos(a + w * .55) * radius, Math.sin(a + w * .55) * radius);
        ctx.lineTo(Math.cos(a + w) * ri, Math.sin(a + w) * ri);
        ctx.closePath();
        ctx.fill();
      }

      /* the disc itself */
      const g = ctx.createRadialGradient(0, 0, ri * .15, 0, 0, ri);
      g.addColorStop(0, `rgba(225,255,238,${.9 * alpha})`);
      g.addColorStop(.55, `rgba(70,240,135,${.8 * alpha})`);
      g.addColorStop(1, `rgba(20,150,78,${.9 * alpha})`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, ri, 0, TAU); ctx.fill();
      ctx.strokeStyle = `rgba(225,255,238,${.95 * alpha})`;
      ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.arc(0, 0, ri, 0, TAU); ctx.stroke();

      /* spokes sell the spin */
      ctx.strokeStyle = `rgba(12,110,58,${.55 * alpha})`;
      ctx.lineWidth = 2.6;
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * TAU;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * ri * .32, Math.sin(a) * ri * .32);
        ctx.lineTo(Math.cos(a) * ri * .88, Math.sin(a) * ri * .88);
        ctx.stroke();
      }
      ctx.restore();
    };

    blade(this.r, this.spin, 1);
    /* the level-3 construct runs a second counter-rotating blade */
    if (this.level >= 3) blade(this.r * .72, -this.spin * 1.4, .8);

    /* hub */
    ctx.fillStyle = 'rgba(230,255,240,.9)';
    ctx.beginPath(); ctx.arc(0, 0, this.r * .22, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(120,255,180,.9)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, this.r * .38, 0, TAU); ctx.stroke();

    if (this.level >= 3) {
      ctx.strokeStyle = `rgba(180,255,210,${.5 + Math.sin(time * 20) * .3})`;
      ctx.lineWidth = 1.6;
      for (let i = 0; i < 3; i++) {
        const a = time * 6 + (i * TAU) / 3;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * this.r * 1.05, Math.sin(a) * this.r * 1.05);
        ctx.lineTo(Math.cos(a + .4) * this.r * 1.5, Math.sin(a + .4) * this.r * 1.5);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}

/* =============================== SOLAR LANCE =============================== */
/* Paragon's ultimate: a sustained beam that tracks the leading trooper and
   burns everything standing in the line. */
class Lance {
  constructor(tower, duration) {
    this.t = tower;
    this.life = duration;
    this.max = duration;
    this.tick = 0;
    this.angle = tower.angle;
    this.dead = false;
    this.width = 15 + tower.level * 3;
    this.damage = 2 + tower.level;
    this.voice = Sfx.startLance();
    this.end = { x: tower.x, y: tower.y };
  }

  update(dt, game) {
    this.life -= dt;

    /* sweep toward whichever trooper is furthest along */
    const target = game.firstInRange(this.t.x, this.t.y, 4000);
    if (target) {
      const want = Math.atan2(target.y - this.t.y, target.x - this.t.x);
      let diff = ((want - this.angle + Math.PI * 3) % TAU) - Math.PI;
      this.angle += diff * Math.min(1, dt * 5);
      this.t.facing = Math.cos(this.angle) < 0 ? -1 : 1;
    }

    /* the beam runs off the edge of the field */
    const reach = 1600;
    this.end = {
      x: this.t.x + Math.cos(this.angle) * reach,
      y: this.t.y + Math.sin(this.angle) * reach,
    };

    this.tick -= dt;
    if (this.tick <= 0) {
      this.tick = .1;
      const w = this.width;
      for (const e of game.enemies) {
        if (e.dead) continue;
        const d2 = pointSegDistSq(e.x, e.y, this.t.x, this.t.y, this.end.x, this.end.y);
        if (d2 > (w + e.r) * (w + e.r)) continue;
        game.damage(e, this.damage, { source: this.t, x: e.x, y: e.y, silent: true, tags: ['solar'] });
        e.ignite(1.2);
        if (Math.random() < .5) game.spark(e.x, e.y, '#ffd9a0', 4);
      }
      game.flash = Math.max(game.flash, .18);
    }

    if (Math.random() < dt * 40) {
      const k = rand(.2, 1);
      game.particles.push(new Particle(
        lerp(this.t.x, this.end.x, k * .35), lerp(this.t.y, this.end.y, k * .35), {
          vx: rand(-50, 50), vy: rand(-70, -10), life: rand(.2, .5), size: rand(2, 4.5),
          color: pick(['#fff3c4', '#ffb15c', '#ff7a3d']), kind: 'spark',
        }));
    }

    if (this.life <= 0) {
      this.dead = true;
      this.voice.stop();
      game.flash = Math.max(game.flash, .3);
    }
  }

  draw(ctx, time) {
    /* fade in and out at the ends of the burn */
    const k = clamp(Math.min(this.life, this.max - this.life) / .18, 0, 1);
    const w = this.width * k;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    const grad = ctx.createLinearGradient(this.t.x, this.t.y, this.end.x, this.end.y);
    grad.addColorStop(0, `rgba(255,255,235,${.95 * k})`);
    grad.addColorStop(.25, `rgba(255,190,110,${.75 * k})`);
    grad.addColorStop(1, 'rgba(255,110,60,0)');

    /* outer bloom, then the searing core */
    ctx.lineCap = 'round';
    ctx.strokeStyle = grad;
    ctx.lineWidth = w * 2.4;
    ctx.globalAlpha = .35;
    ctx.beginPath(); ctx.moveTo(this.t.x, this.t.y); ctx.lineTo(this.end.x, this.end.y); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(this.t.x, this.t.y); ctx.lineTo(this.end.x, this.end.y); ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,255,${.95 * k})`;
    ctx.lineWidth = Math.max(1, w * .32 + Math.sin(time * 40) * 1.2);
    ctx.beginPath(); ctx.moveTo(this.t.x, this.t.y); ctx.lineTo(this.end.x, this.end.y); ctx.stroke();

    /* muzzle flare at the eyes */
    const fl = ctx.createRadialGradient(this.t.x, this.t.y - 6, 1, this.t.x, this.t.y - 6, 22 * k);
    fl.addColorStop(0, `rgba(255,250,225,${.55 * k})`);
    fl.addColorStop(1, 'rgba(255,140,60,0)');
    ctx.fillStyle = fl;
    ctx.beginPath(); ctx.arc(this.t.x, this.t.y - 6, 22 * k, 0, TAU); ctx.fill();
    ctx.restore();
  }
}

/* =============================== CASH PICKUP =============================== */
/* Money is still collected automatically — these only exist so earning it
   reads and sounds good. They pop off a kill, arc, then home to the counter. */
const CASH_TARGET = { x: 150, y: 26 };

class Coin {
  constructor(x, y, value) {
    this.x = x; this.y = y;
    this.value = value;
    this.vx = rand(-90, 90);
    this.vy = rand(-210, -130);
    this.age = 0;
    this.pop = .28 + Math.random() * .18;   // free-flight time before it homes
    this.dead = false;
    this.spin = rand(0, TAU);
    this.spinV = rand(6, 13) * (Math.random() < .5 ? -1 : 1);
  }

  update(dt) {
    this.age += dt;
    this.spin += this.spinV * dt;
    if (this.age < this.pop) {
      this.vy += 620 * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      return;
    }
    /* then it accelerates toward the cash readout */
    const k = clamp((this.age - this.pop) / .5, 0, 1);
    const speed = lerp(340, 1500, k * k);
    const dx = CASH_TARGET.x - this.x, dy = CASH_TARGET.y - this.y;
    const len = Math.hypot(dx, dy) || 1;
    this.x += (dx / len) * speed * dt;
    this.y += (dy / len) * speed * dt;
    if (len < 26) this.dead = true;
  }

  draw(ctx) {
    const w = Math.abs(Math.cos(this.spin));
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = 'rgba(255,220,120,.28)';
    ctx.beginPath(); ctx.arc(0, 0, 8, 0, TAU); ctx.fill();
    const g = ctx.createLinearGradient(0, -7, 0, 7);
    g.addColorStop(0, '#fff2b8'); g.addColorStop(.5, '#ffc63f'); g.addColorStop(1, '#c98a13');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(0, 0, Math.max(1.4, 6 * w), 6, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(120,80,10,.55)'; ctx.lineWidth = 1;
    ctx.stroke();
    if (w > .45) {
      ctx.fillStyle = 'rgba(140,95,15,.75)';
      ctx.font = 'bold 7px Trebuchet MS, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('$', 0, 2.5);
    }
    ctx.restore();
  }
}

/* =============================== PARTICLE =============================== */
class Particle {
  constructor(x, y, o) {
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0; this.gravity = 0;
    this.life = .5; this.size = 3; this.color = '#fff'; this.kind = 'spark';
    this.rot = rand(0, TAU); this.spin = rand(-8, 8);
    Object.assign(this, o);
    this.maxLife = this.life;
  }

  update(dt) {
    this.life -= dt;
    this.vy += this.gravity * dt;
    this.vx *= 1 - dt * 1.4;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rot += this.spin * dt;
  }

  draw(ctx) {
    const t = clamp(this.life / this.maxLife, 0, 1);
    ctx.save();
    ctx.globalAlpha = this.kind === 'smoke' ? t * .5 : t;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.fillStyle = this.color;
    if (this.kind === 'shard') {
      const s = this.size * (.6 + t * .6);
      ctx.beginPath();
      ctx.moveTo(-s, -s * .6); ctx.quadraticCurveTo(0, -s * 1.4, s, -s * .4);
      ctx.quadraticCurveTo(s * .3, s, -s * .5, s * .7);
      ctx.closePath(); ctx.fill();
    } else if (this.kind === 'smoke') {
      ctx.beginPath(); ctx.arc(0, 0, this.size * (1.6 - t), 0, TAU); ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(0, 0, this.size * t, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
}

/* =============================== GAME =============================== */
class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.bg = null;
    this.onEvent = () => {};
    this.map = null;
    this.fx = 1;
    this.reset(1);
  }

  reset(levelNo = this.levelNo || 1) {
    Sfx.stopAll();
    /* phones render the same fight with a lighter particle budget */
    const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    this.fx = coarse || window.innerWidth < 900 ? .5 : 1;
    this.levelNo = clamp(levelNo, 1, LEVEL_COUNT);
    this.level = LEVELS[this.levelNo - 1];
    if (!this.map || this.map !== this.level.map) this.setMapAndBake(this.level.map);
    this.waves = buildLevelWaves(this.level);

    this.time = 0;
    this.lives = this.level.lives;
    this.cash = this.level.cash;
    this.round = 0;
    this.runGems = 0;
    this.speed = 1;
    this.running = false;      // a round is in progress
    this.over = false;
    this.paused = false;

    this.enemies = [];
    this.towers = [];
    this.projectiles = [];
    this.saws = [];
    this.lances = [];
    this.coins = [];
    this.webs = [];
    this.strikes = [];
    this.rally = 0;
    this.judgement = 0;
    this.judgementDmg = 6;
    this.judgementTick = 0;
    this.downpour = 0;
    this.downpourDmg = 2;
    this.downpourTick = 0;
    this.exposed = 0;
    this.streak = 0;
    this.streakT = 0;
    this.particles = [];
    this.rings = [];
    this.beams = [];
    this.texts = [];
    this.queue = [];
    this.roundTime = 0;
    this.shake = 0;
    this.flash = 0;

    this.placing = null;       // { def, isHero }
    this.selected = null;
    this.pointer = { x: -999, y: -999, valid: false, inside: false };
    this.heroesPlaced = new Set();
  }

  get heroSlots() { return (this.level && this.level.heroSlots) || 1; }
  get heroSlotsUsed() { return this.heroesPlaced.size; }
  get heroSlotsFree() { return this.heroSlots - this.heroesPlaced.size; }

  setMapAndBake(id) {
    setMap(id);
    this.map = id;
    this.bakeBackground();
  }

  /* ---------------- background baking ---------------- */
  bakeBackground() {
    const map = CURRENT_MAP;
    const th = map.theme;
    const rng = mulberry32(map.seed ^ 0x5f3a);
    const c = document.createElement('canvas');
    c.width = CANVAS_W; c.height = CANVAS_H;
    const g = c.getContext('2d');

    /* ground */
    const ground = g.createLinearGradient(0, 0, 0, CANVAS_H);
    ground.addColorStop(0, th.ground[0]);
    ground.addColorStop(.5, th.ground[1]);
    ground.addColorStop(1, th.ground[2]);
    g.fillStyle = ground;
    g.fillRect(0, 0, CANVAS_W, CANVAS_H);

    /* patchy tone variation */
    for (let i = 0; i < 90; i++) {
      const x = rng() * CANVAS_W, y = rng() * CANVAS_H, r = 70 + rng() * 120;
      g.fillStyle = `rgba(${rng() < .5 ? th.tuftLight : th.tuftDark},.035)`;
      g.beginPath(); g.ellipse(x, y, r, r * .6, rng() * TAU, 0, TAU); g.fill();
    }

    /* ground detail — tufts, cinders or frost flecks depending on the map */
    g.lineWidth = 1.3; g.lineCap = 'round';
    for (let i = 0; i < 520; i++) {
      const x = rng() * CANVAS_W, y = rng() * CANVAS_H, h = 2 + rng() * 1.6;
      g.strokeStyle = `rgba(${rng() < .5 ? th.tuftLight : th.tuftDark},.12)`;
      g.beginPath();
      g.moveTo(x - 3, y); g.quadraticCurveTo(x - 2, y - h, x - 4, y - h * 1.3);
      g.moveTo(x, y); g.quadraticCurveTo(x, y - h, x + 1, y - h * 1.4);
      g.moveTo(x + 3, y); g.quadraticCurveTo(x + 2, y - h, x + 4, y - h * 1.2);
      g.stroke();
    }

    /* --- the route --- */
    const stroke = (pts, w, style) => {
      g.strokeStyle = style; g.lineWidth = w;
      g.lineJoin = 'round'; g.lineCap = 'round';
      g.beginPath();
      pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
      g.stroke();
    };
    /* every layer of every road, so crossings look built rather than stacked */
    for (const w of [[TRACK_WIDTH + 16, 'rgba(0,0,0,.22)'], [TRACK_WIDTH + 8, th.trackEdge],
                     [TRACK_WIDTH, th.track], [TRACK_WIDTH - 12, th.trackMid]]) {
      for (const pth of PATHS) stroke(pth.points, w[0], w[1]);
    }

    /* grit scattered along each route */
    for (const pth of PATHS) {
      for (let d = 0; d < pth.length; d += 7) {
        const p = pth.at(d);
        const off = (rng() - .5) * (TRACK_WIDTH - 10);
        const nx = -Math.sin(p.ang) * off, ny = Math.cos(p.ang) * off;
        g.fillStyle = `rgba(${rng() < .5 ? th.grit[0] : th.grit[1]},.55)`;
        g.beginPath(); g.arc(p.x + nx, p.y + ny, .8 + rng() * 1.4, 0, TAU); g.fill();
      }
    }

    /* breach point and the bastion line, once per road */
    for (const pth of PATHS) this.drawRoadMarkers(g, pth);

    /* scenery */
    for (const s2 of SCENERY) {
      g.save(); g.translate(s2.x, s2.y); g.scale(s2.s, s2.s);
      this.drawDecor(g, s2.t, rng);
      g.restore();
    }

    /* vignette */
    const vig = g.createRadialGradient(CANVAS_W / 2, CANVAS_H / 2, CANVAS_H * .35,
      CANVAS_W / 2, CANVAS_H / 2, CANVAS_H * .95);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,.45)');
    g.fillStyle = vig;
    g.fillRect(0, 0, CANVAS_W, CANVAS_H);

    this.bg = c;
  }

  /** the red breach mouth and the blue bastion gate for one road */
  drawRoadMarkers(g, pth) {
    const start = pth.at(2), end = pth.at(pth.length - 40);
    g.save();
    g.translate(start.x, start.y);
    g.rotate(start.ang);
    g.fillStyle = 'rgba(255,60,50,.18)';
    g.beginPath(); g.ellipse(0, 0, 14, 30, 0, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,90,70,.55)'; g.lineWidth = 4;
    g.beginPath(); g.ellipse(0, 0, 14, 30, 0, 0, TAU); g.stroke();
    g.restore();

    g.save();
    const gx = clamp(end.x, 60, CANVAS_W - 60);
    const gy = clamp(end.y, 60, CANVAS_H - 70);
    g.translate(gx, gy);
    g.rotate(Math.abs(Math.cos(end.ang)) > .5 ? Math.PI / 2 : 0);
    g.fillStyle = 'rgba(90,200,255,.14)';
    g.fillRect(-46, 0, 92, 80);
    g.strokeStyle = 'rgba(120,210,255,.6)'; g.lineWidth = 3;
    g.setLineDash([10, 8]);
    g.beginPath(); g.moveTo(-46, 0); g.lineTo(46, 0); g.stroke();
    g.setLineDash([]);
    g.restore();
    g.font = 'bold 14px Trebuchet MS, sans-serif';
    g.textAlign = 'center';
    const label = 'BASTION';
    const lw = g.measureText(label).width + 18;
    g.fillStyle = 'rgba(8,14,30,.72)';
    roundRect(g, gx - lw / 2, gy - 26, lw, 20, 10); g.fill();
    g.strokeStyle = 'rgba(120,210,255,.5)'; g.lineWidth = 1.4; g.stroke();
    g.fillStyle = '#cfe6ff';
    g.fillText(label, gx, gy - 12);
  }

  /** one piece of scenery, drawn around the origin */
  drawDecor(g, kind, rng) {
    const shadow = (w, h) => {
      g.fillStyle = 'rgba(0,0,0,.25)';
      g.beginPath(); g.ellipse(4, h, w, w * .32, 0, 0, TAU); g.fill();
    };

    switch (kind) {
      case 'tree':
        shadow(22, 24);
        g.fillStyle = '#5b4326'; g.fillRect(-5, 0, 10, 26);
        for (let i = 0; i < 3; i++) {
          g.fillStyle = ['#2f7a3c', '#3a8f47', '#46a552'][i];
          g.beginPath(); g.arc(0, -6 - i * 11, 24 - i * 5, 0, TAU); g.fill();
        }
        g.fillStyle = 'rgba(255,255,255,.12)';
        g.beginPath(); g.arc(-8, -26, 8, 0, TAU); g.fill();
        break;

      case 'pine':
        shadow(20, 26);
        g.fillStyle = '#4a3a28'; g.fillRect(-4, 6, 8, 20);
        for (let i = 0; i < 3; i++) {
          g.fillStyle = ['#1f5240', '#28654e', '#2f7a5c'][i];
          g.beginPath();
          g.moveTo(0, -34 + i * 12); g.lineTo(16 - i * 2, 2 + i * 4); g.lineTo(-16 + i * 2, 2 + i * 4);
          g.closePath(); g.fill();
        }
        g.fillStyle = 'rgba(255,255,255,.75)';
        g.beginPath(); g.moveTo(0, -34); g.lineTo(6, -20); g.lineTo(-6, -20); g.closePath(); g.fill();
        break;

      case 'deadtree':
        shadow(14, 18);
        g.strokeStyle = '#3a2b24'; g.lineWidth = 5; g.lineCap = 'round';
        g.beginPath(); g.moveTo(0, 18); g.lineTo(0, -18); g.stroke();
        g.lineWidth = 3;
        g.beginPath(); g.moveTo(0, -4); g.lineTo(-13, -16);
        g.moveTo(0, -10); g.lineTo(12, -20); g.stroke();
        break;

      case 'rock': {
        shadow(20, 12);
        const rg = g.createLinearGradient(0, -18, 0, 14);
        rg.addColorStop(0, '#9aa2b4'); rg.addColorStop(1, '#5b6274');
        g.fillStyle = rg;
        g.beginPath();
        g.moveTo(-18, 12); g.lineTo(-11, -12); g.lineTo(4, -18);
        g.lineTo(17, -4); g.lineTo(14, 12); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 2; g.stroke();
        break;
      }

      case 'bush':
        shadow(18, 10);
        for (let i = 0; i < 4; i++) {
          g.fillStyle = ['#2c6b34', '#357c3d', '#3f8f47', '#2c6b34'][i];
          g.beginPath(); g.arc(-12 + i * 8, (rng() - .5) * 6, 10 - (i % 2) * 2, 0, TAU); g.fill();
        }
        break;

      case 'lava': {
        const lg = g.createRadialGradient(0, 0, 2, 0, 0, 22);
        lg.addColorStop(0, 'rgba(255,220,120,.95)');
        lg.addColorStop(.45, 'rgba(255,120,40,.85)');
        lg.addColorStop(1, 'rgba(140,30,10,0)');
        g.fillStyle = lg;
        g.beginPath(); g.ellipse(0, 0, 22, 13, 0, 0, TAU); g.fill();
        g.fillStyle = 'rgba(60,30,24,.9)';
        g.beginPath(); g.ellipse(0, 0, 24, 15, 0, 0, TAU);
        g.ellipse(0, 0, 18, 10, 0, 0, TAU);
        g.fill('evenodd');
        break;
      }

      case 'ice': {
        shadow(16, 10);
        const ig = g.createLinearGradient(0, -20, 0, 12);
        ig.addColorStop(0, 'rgba(235,250,255,.95)');
        ig.addColorStop(1, 'rgba(140,190,225,.9)');
        g.fillStyle = ig;
        g.beginPath();
        g.moveTo(0, -22); g.lineTo(11, 4); g.lineTo(2, 12); g.lineTo(-10, 2); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 1.4; g.stroke();
        break;
      }

      case 'crystal': {
        const cg = g.createLinearGradient(0, -26, 0, 12);
        cg.addColorStop(0, 'rgba(210,170,255,.95)');
        cg.addColorStop(1, 'rgba(90,60,190,.9)');
        g.fillStyle = cg;
        g.beginPath();
        g.moveTo(0, -26); g.lineTo(10, -2); g.lineTo(4, 12); g.lineTo(-7, 6); g.lineTo(-9, -8);
        g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,255,255,.35)';
        g.beginPath(); g.moveTo(0, -24); g.lineTo(4, -4); g.lineTo(-1, 2); g.closePath(); g.fill();
        break;
      }

      case 'building': {
        shadow(24, 16);
        const h = 34 + rng() * 26;
        const w = 26 + rng() * 14;
        const bg = g.createLinearGradient(0, -h, 0, 14);
        bg.addColorStop(0, '#5b7099'); bg.addColorStop(1, '#28344f');
        g.fillStyle = bg;
        roundRect(g, -w / 2, -h, w, h + 14, 3); g.fill();
        g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1.6; g.stroke();
        /* lit windows */
        g.fillStyle = 'rgba(255,214,130,.75)';
        for (let yy = -h + 7; yy < 6; yy += 9) {
          for (let xx = -w / 2 + 5; xx < w / 2 - 4; xx += 8) {
            if (rng() < .45) continue;
            g.fillRect(xx, yy, 3.4, 4.4);
          }
        }
        /* deco crown */
        g.fillStyle = '#7f95bd';
        roundRect(g, -w / 2 - 2, -h - 4, w + 4, 5, 2); g.fill();
        break;
      }

      case 'planter': {
        shadow(16, 10);
        g.fillStyle = '#3c4a68';
        roundRect(g, -13, 0, 26, 11, 3); g.fill();
        for (let i = 0; i < 3; i++) {
          g.fillStyle = ['#2f7a3c', '#3a8f47', '#46a552'][i];
          g.beginPath(); g.arc(-7 + i * 7, -5 + rng() * 3, 7, 0, TAU); g.fill();
        }
        break;
      }

      case 'lamp': {
        shadow(9, 14);
        g.strokeStyle = '#1d2334'; g.lineWidth = 3;
        g.beginPath(); g.moveTo(0, 14); g.lineTo(0, -18); g.stroke();
        const lg = g.createRadialGradient(0, -22, 1, 0, -22, 16);
        lg.addColorStop(0, 'rgba(255,224,150,.9)');
        lg.addColorStop(1, 'rgba(255,200,110,0)');
        g.fillStyle = lg;
        g.beginPath(); g.arc(0, -22, 16, 0, TAU); g.fill();
        g.fillStyle = '#ffe6a8';
        g.beginPath(); g.arc(0, -22, 4, 0, TAU); g.fill();
        break;
      }

      case 'spire': {
        shadow(18, 16);
        const sg = g.createLinearGradient(0, -40, 0, 16);
        sg.addColorStop(0, '#4a4f6b'); sg.addColorStop(1, '#20233a');
        g.fillStyle = sg;
        g.beginPath();
        g.moveTo(0, -42); g.lineTo(11, -12); g.lineTo(13, 16); g.lineTo(-13, 16); g.lineTo(-11, -12);
        g.closePath(); g.fill();
        g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 1.6; g.stroke();
        /* a gargoyle silhouette perched on the ledge */
        g.fillStyle = '#171a2a';
        g.beginPath();
        g.arc(0, -14, 5, Math.PI, TAU);
        g.lineTo(7, -8); g.lineTo(-7, -8); g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,110,110,.75)';
        g.beginPath(); g.arc(-2, -15, 1.1, 0, TAU); g.arc(2, -15, 1.1, 0, TAU); g.fill();
        break;
      }

      case 'water': {
        const wg = g.createRadialGradient(0, 0, 2, 0, 0, 26);
        wg.addColorStop(0, 'rgba(150,240,230,.55)');
        wg.addColorStop(.6, 'rgba(60,160,170,.4)');
        wg.addColorStop(1, 'rgba(30,90,110,0)');
        g.fillStyle = wg;
        g.beginPath(); g.ellipse(0, 0, 26, 14, 0, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(190,255,250,.5)'; g.lineWidth = 1.2;
        for (let i = 0; i < 3; i++) {
          g.beginPath(); g.ellipse(0, 1 + i * 3, 18 - i * 5, 8 - i * 2.5, 0, .2, Math.PI - .2); g.stroke();
        }
        break;
      }

      case 'palm': {
        shadow(14, 18);
        g.strokeStyle = '#6b5637'; g.lineWidth = 4; g.lineCap = 'round';
        g.beginPath(); g.moveTo(0, 18); g.quadraticCurveTo(-4, 0, 2, -18); g.stroke();
        g.fillStyle = '#2f7a5c';
        for (let i = 0; i < 5; i++) {
          const a = -Math.PI / 2 + (i - 2) * .55;
          g.save(); g.translate(2, -18); g.rotate(a);
          g.beginPath();
          g.moveTo(0, 0); g.quadraticCurveTo(11, -5, 20, 2); g.quadraticCurveTo(11, 3, 0, 3);
          g.closePath(); g.fill();
          g.restore();
        }
        break;
      }

      case 'rift': {
        const rg2 = g.createRadialGradient(0, 0, 1, 0, 0, 26);
        rg2.addColorStop(0, 'rgba(220,180,255,.85)');
        rg2.addColorStop(.5, 'rgba(140,90,255,.5)');
        rg2.addColorStop(1, 'rgba(80,40,180,0)');
        g.fillStyle = rg2;
        g.beginPath(); g.ellipse(0, 0, 12, 26, .3, 0, TAU); g.fill();
        break;
      }
    }
  }

  /* ---------------- placement ---------------- */
  beginPlacing(def, isHero) {
    this.placing = { def, isHero };
    this.selected = null;
    this.canvas.classList.add('placing');
  }

  cancelPlacing() {
    this.placing = null;
    this.canvas.classList.remove('placing');
    this.onEvent('shop');
  }

  canPlaceAt(x, y) {
    if (x < 26 || y < 26 || x > CANVAS_W - 26 || y > CANVAS_H - 26) return false;
    if (distanceToAnyPath(x, y) < TRACK_WIDTH / 2 + 16) return false;
    for (const t of this.towers) if (distSq(t.x, t.y, x, y) < 34 * 34) return false;
    return true;
  }

  tryPlace(x, y) {
    const p = this.placing;
    if (!p) return false;
    const cost = p.isHero ? 0 : p.def.cost;
    if (p.isHero && !this.heroesPlaced.has(p.def.id) && this.heroSlotsFree <= 0) {
      this.floatText(x, y - 20,
        `Only ${this.heroSlots} hero${this.heroSlots > 1 ? 'es' : ''} on this mission`,
        '#ff5a6e', 1.3, 14);
      Sfx.deny();
      return false;
    }
    if (!this.canPlaceAt(x, y) || this.cash < cost) {
      Sfx.deny();
      return false;
    }
    const t = new Tower(p.def, x, y, p.isHero);
    this.towers.push(t);
    this.cash -= cost;
    if (p.isHero) this.heroesPlaced.add(p.def.id);
    this.floatText(x, y - 26, p.isHero ? p.def.name + '!' : `-$${cost}`, p.isHero ? '#a97bff' : '#ffcf5c');
    for (let i = 0; i < 12; i++) {
      const a = rand(0, TAU);
      this.particles.push(new Particle(x, y, {
        vx: Math.cos(a) * rand(30, 120), vy: Math.sin(a) * rand(30, 120),
        life: .45, size: rand(2, 4), color: '#dfe8ff', kind: 'spark',
      }));
    }
    this.shake = Math.max(this.shake, 3);
    Sfx.place();
    this.selected = t;
    this.cancelPlacing();
    return true;
  }

  sell(t) {
    const idx = this.towers.indexOf(t);
    if (idx < 0) return;
    this.towers.splice(idx, 1);
    if (t.isHero) this.heroesPlaced.delete(t.def.id);
    const refund = Math.round(t.spent * .7);
    this.cash += refund;
    this.floatText(t.x, t.y - 20, `+$${refund}`, '#4ade80');
    this.selected = null;
    Sfx.coin();
    this.onEvent('shop');
  }

  upgrade(t) {
    if (t.level >= MAX_LEVEL) return;
    const cost = upgradeCost(t.def, t.level);
    if (this.cash < cost) { Sfx.deny(); return; }
    this.cash -= cost;
    t.spent += cost;
    t.level++;
    t.placeAnim = .55;
    if (t.def.ability) t.charges = t.maxCharges;   // a new tier hands back a full set
    this.floatText(t.x, t.y - 26, `LV ${t.level}`, '#8fe6ff');
    for (let i = 0; i < 18; i++) {
      const a = rand(0, TAU);
      this.particles.push(new Particle(t.x, t.y, {
        vx: Math.cos(a) * rand(40, 150), vy: Math.sin(a) * rand(40, 150) - 30,
        life: .6, size: rand(2, 4.5), color: pick(['#8fe6ff', '#ffd977', '#ffffff']), kind: 'spark', gravity: 160,
      }));
    }
    Sfx.coin();
    this.onEvent('shop');
  }

  /* ---------------- activated abilities ---------------- */
  canUseUlt(t) {
    return !!(t && t.def.ability && !this.over && t.charges > 0 && !t.suppressed && !(t.disabled > 0)
      && (this.running || this.enemies.length > 0));
  }

  activateUlt(t) {
    if (!t || !t.def.ability || this.over) return false;
    if (t.disabled > 0) {
      this.floatText(t.x, t.y - 40, 'Offline', '#ff5a6e', 1.1, 13);
      Sfx.deny();
      return false;
    }
    if (t.suppressed) {
      this.floatText(t.x, t.y - 40, `${t.suppressed.short} is jamming him`, '#ff5a6e', 1.3, 13);
      Sfx.deny();
      return false;
    }
    if (t.charges <= 0) {
      this.floatText(t.x, t.y - 40, 'No charges left', '#ff5a6e', 1, 14);
      Sfx.deny();
      return false;
    }
    if (!this.running && !this.enemies.length) {
      this.floatText(t.x, t.y - 40, 'Start a round first', '#ffcf5c', 1, 14);
      Sfx.deny();
      return false;
    }

    const ab = t.def.ability;
    t.charges--;
    t.ultAnim = ULT_ANIM_TIME;

    const burst = (color, n = 26) => {
      this.rings.push({ x: t.x, y: t.y, r: 12, max: 150, life: .55, maxLife: .55, color, thick: 7 });
      for (let i = 0, k = this.n(n); i < k; i++) {
        const a = rand(0, TAU);
        this.particles.push(new Particle(t.x, t.y, {
          vx: Math.cos(a) * rand(80, 260), vy: Math.sin(a) * rand(80, 260) - 40,
          life: rand(.4, .9), size: rand(2, 5), color, kind: 'spark', gravity: 90,
        }));
      }
    };

    switch (ab.kind) {
      case 'saw':
        this.saws.push(new Saw(t.level, this.busiestLane()));
        burst('#5cff9e');
        Sfx.ultCharge();
        break;
      case 'overdrive':
        t.overdrive = ab.duration[t.level - 1];
        burst('#ffd23f', 34);
        this.flash = Math.max(this.flash, .25);
        Sfx.overdrive();
        break;
      case 'lance':
        this.lances.push(new Lance(t, ab.duration[t.level - 1]));
        burst('#ffe9a8', 30);
        this.flash = Math.max(this.flash, .45);
        Sfx.lanceStart();
        break;

      case 'mark': {
        /* prep work: every hostile currently on the field takes double damage */
        const dur = ab.duration[t.level - 1];
        let n = 0;
        for (const e of this.enemies) {
          if (e.dead) continue;
          e.marked = Math.max(e.marked, dur);
          n++;
          this.spark(e.x, e.y, '#ff5a6e', 3);
        }
        this.markedUntil = this.time + dur;
        burst('#8fa8d8', 22);
        this.floatText(t.x, t.y - 66, `${n} marked`, '#ff8a98', 1.3, 15);
        Sfx.mark();
        break;
      }

      case 'missiles': {
        const salvo = ab.salvo[t.level - 1];
        for (let i = 0; i < salvo; i++) {
          const a = rand(0, TAU);
          this.projectiles.push(new Projectile(t, {
            x: t.x, y: t.y - 6,
            vx: Math.cos(a) * rand(150, 260), vy: Math.sin(a) * rand(150, 260),
            damage: 2 + t.level, pierce: 1, life: 3.5, kind: 'missile',
            color: '#ff8a5c', size: 5, blast: 46 + t.level * 6, tags: t.def.tags,
          }));
        }
        burst('#ff8a5c', 24);
        Sfx.missiles();
        break;
      }

      case 'thunderclap': {
        const radius = ab.radius[t.level - 1];
        this.rings.push({ x: t.x, y: t.y, r: 16, max: radius, life: .7, maxLife: .7,
          color: '#a8ff8a', thick: 12 });
        this.rings.push({ x: t.x, y: t.y, r: 8, max: radius * .6, life: .5, maxLife: .5,
          color: '#ffffff', thick: 6 });
        for (const e of this.enemies) {
          if (e.dead || distSq(e.x, e.y, t.x, t.y) > radius * radius) continue;
          e.d = Math.max(0, e.d - 90);
          e.chill(0, 1.6);                       // flat stun
          this.damage(e, 5 + t.level * 2, { source: t, x: e.x, y: e.y, tags: t.def.tags });
        }
        for (let i = 0, kn = this.n(40); i < kn; i++) {
          const a = rand(0, TAU);
          this.particles.push(new Particle(t.x, t.y, {
            vx: Math.cos(a) * rand(120, 420), vy: Math.sin(a) * rand(120, 420) - 40,
            life: rand(.4, .9), size: rand(2.5, 6),
            color: pick(['#a8ff8a', '#e6ffd8', '#8a7a5a']), kind: 'shard', gravity: 300,
          }));
        }
        this.shake = Math.max(this.shake, 16);
        this.flash = Math.max(this.flash, .3);
        Sfx.thunderclap();
        break;
      }

      case 'webzone': {
        const r = ab.radius[t.level - 1];
        const lead = this.leadDistance();
        const lanePath = PATHS[lead.lane] || PATHS[0];
        const p = lanePath.at(clamp(lead.d + 60, 0, lanePath.length));
        this.webs.push({
          x: p.x, y: p.y, r, life: ab.duration[t.level - 1],
          maxLife: ab.duration[t.level - 1], slow: .3, seed: rand(0, TAU),
        });
        burst('#e8eefc', 20);
        this.floatText(t.x, t.y - 66, 'WEB ZONE', '#e8eefc', 1.2, 15);
        Sfx.web();
        break;
      }

      case 'stormcall': {
        /* bolts walk down the route one after another */
        const strikes = ab.strikes[t.level - 1];
        const targets = [...this.enemies].filter((e) => !e.dead).sort((a, b) => b.d - a.d);
        for (let i = 0; i < strikes; i++) {
          const e = targets[i % Math.max(1, targets.length)];
          const at = e ? { x: e.x, y: e.y } : PATH.at(rand(0, PATH.length));
          this.strikes.push({ x: at.x, y: at.y, delay: i * .09, life: .3, maxLife: .3,
            damage: 3 + t.level, done: false, tags: t.def.tags });
        }
        burst('#cfe6ff', 26);
        this.flash = Math.max(this.flash, .3);
        Sfx.stormcall();
        break;
      }

      case 'rally': {
        this.rally = Math.max(this.rally, ab.duration[t.level - 1]);
        burst('#7fb0ff', 30);
        for (const other of this.towers) {
          this.rings.push({ x: other.x, y: other.y, r: 6, max: 40, life: .5, maxLife: .5,
            color: '#7fb0ff', thick: 3 });
        }
        this.floatText(t.x, t.y - 66, 'RALLY — DOUBLE RATE', '#9fc4ff', 1.6, 16);
        Sfx.rally();
        break;
      }

      case 'lasso': {
        const dur = ab.duration[t.level - 1];
        let n = 0;
        for (const e of this.enemies) {
          if (e.dead) continue;
          e.chill(0, dur);                       // bound in place
          e.d = Math.max(0, e.d - 40);
          n++;
        }
        burst('#ffc85a', 28);
        this.floatText(t.x, t.y - 66, `${n} bound`, '#ffd77a', 1.4, 16);
        Sfx.lasso();
        break;
      }

      case 'portal': {
        const frac = ab.send[t.level - 1];
        let n = 0;
        for (const e of this.enemies) {
          if (e.dead) continue;
          const before = e.d;
          e.d = Math.max(0, e.d - e.path.length * frac);
          if (e.d < before) n++;
          const p2 = e.path.at(e.d);
          this.rings.push({ x: p2.x, y: p2.y, r: 4, max: 26, life: .4, maxLife: .4,
            color: '#ff9a4d', thick: 3 });
          e.x = p2.x; e.y = p2.y;
        }
        burst('#ff9a4d', 34);
        this.flash = Math.max(this.flash, .3);
        this.floatText(t.x, t.y - 66, `${n} sent back`, '#ffb37a', 1.5, 16);
        Sfx.portal();
        break;
      }

      case 'volley': {
        const shots = ab.shots[t.level - 1];
        const marks = [...this.enemies].filter((e) => !e.dead).sort((a, b) => b.d - a.d);
        for (let i = 0; i < shots; i++) {
          const e = marks[i % Math.max(1, marks.length)];
          if (!e) break;
          const a = rand(0, TAU);
          this.projectiles.push(new Projectile(t, {
            x: t.x + Math.cos(a) * 12, y: t.y - 30 - i * 4,
            vx: (e.x - t.x) * 1.6, vy: (e.y - t.y) * 1.6,
            damage: 3 + t.level, pierce: 2, life: .9, kind: 'dart',
            color: '#d8f0a0', size: 4, tags: t.def.tags,
          }));
        }
        burst('#c9ef8a', 22);
        Sfx.volley();
        break;
      }

      case 'downpour': {
        this.downpour = Math.max(this.downpour, ab.duration[t.level - 1]);
        this.downpourDmg = 1 + t.level;
        burst('#c9d6f0', 26);
        this.floatText(t.x, t.y - 66, 'DOWNPOUR', '#dbe8ff', 1.5, 17);
        Sfx.downpour();
        break;
      }

      case 'expose': {
        this.exposed = Math.max(this.exposed, ab.duration[t.level - 1]);
        burst('#c8506a', 24);
        for (const e of this.enemies) if (!e.dead) this.spark(e.x, e.y, '#ff8aa8', 3);
        this.floatText(t.x, t.y - 66, 'ARMOUR EXPOSED', '#ff9ab0', 1.6, 16);
        Sfx.expose();
        break;
      }

      case 'judgement': {
        /* a standing storm: everything pinned and struck, repeatedly */
        this.judgement = Math.max(this.judgement, ab.duration[t.level - 1]);
        this.judgementDmg = 4 + t.level * 2;
        burst('#ffd23f', 34);
        this.flash = Math.max(this.flash, .4);
        this.floatText(t.x, t.y - 70, 'JUDGEMENT', '#ffe27a', 1.8, 20);
        Sfx.judgement();
        break;
      }

      case 'rampage': {
        t.rampage = ab.duration[t.level - 1];
        t.rampageKills = 0;
        burst('#cfc4e8', 32);
        this.shake = Math.max(this.shake, 12);
        this.floatText(t.x, t.y - 66, 'RAMPAGE', '#e8dcff', 1.6, 18);
        Sfx.rampage();
        break;
      }

      case 'wildcard': {
        /* every hostile draws a card and lives with it */
        let blown = 0, stunned = 0, turned = 0, robbed = 0;
        for (const e of [...this.enemies]) {
          if (e.dead) continue;
          const roll = Math.random();
          if (roll < .3) {
            this.explode(e.x, e.y, 54, 4 + t.level, t, t.def.tags);
            blown++;
          } else if (roll < .58) {
            e.chill(0, 2.2);
            stunned++;
            this.spark(e.x, e.y, '#b06cf0', 4);
          } else if (roll < .82) {
            e.backward = 2.4;
            turned++;
            this.floatText(e.x, e.y - 22, '?!', '#c08cff', .8, 13);
          } else {
            const purse = 20 + this.levelNo * 3;
            this.cash += purse;
            this.spawnCoins(e.x, e.y, 2, purse);
            robbed++;
          }
        }
        burst('#b06cf0', 30);
        this.floatText(t.x, t.y - 66,
          `${blown} blown · ${stunned} stunned · ${turned} turned · ${robbed} robbed`,
          '#d8b0ff', 2, 14);
        this.flash = Math.max(this.flash, .25);
        Sfx.wildcard();
        break;
      }
    }

    this.floatText(t.x, t.y - 46, ab.name.toUpperCase() + '!', t.def.rarityColor || '#5cff9e', 1.5, 20);
    this.shake = Math.max(this.shake, 9);
    this.onEvent('shop');
    return true;
  }

  /* ---------------- rounds ---------------- */
  startRound() {
    if (this.running || this.over) return;
    if (this.round >= this.waves.length) return;
    this.round++;
    this.running = true;
    this.roundTime = 0;
    /* ability charges are per round, so every round starts fully loaded */
    for (const t of this.towers) if (t.def.ability) t.charges = t.maxCharges;
    this.queue = [];
    const speedMul = (this.level.mods && this.level.mods.speed) || 1;
    const lanes = PATHS.length;
    let laneTick = 0;
    for (const grp of this.waves[this.round - 1]) {
      for (let i = 0; i < grp.count; i++) {
        this.queue.push({
          tier: grp.tier, t: grp.delay + i * grp.gap,
          opts: {
            swift: !!grp.swift, shield: !!grp.shield, speedMul, special: grp.special,
            bossDef: grp.tier === 'chapterBoss' ? this.level.chapterBoss : null,
            /* split the wave across every road the map has */
            lane: lanes > 1 ? (laneTick++) % lanes : 0,
            /* Dreadnoughts get tougher as the campaign goes on */
            hpMul: 1 + (this.levelNo - 1) * .13,
          },
        });
      }
    }
    this.queue.sort((a, b) => a.t - b.t);
    this.onEvent('round-start', this.round);
  }

  finishRound() {
    this.running = false;
    const bonus = roundBonus(this.round, this.waves.length, this.levelNo);
    this.cash += bonus;
    this.floatText(CANVAS_W / 2, 90, `Round ${this.round} cleared  +$${bonus}`, '#4ade80', 2.2, 22);
    for (let i = 0; i < 12; i++) {
      const c = new Coin(CANVAS_W / 2 + rand(-90, 90), 120 + rand(-20, 20), bonus / 12);
      c.pop = .35 + i * .05;
      this.coins.push(c);
    }
    Sfx.cash();
    if (this.round >= this.waves.length) this.end(true);
    else this.onEvent('round-end', this.round);
  }

  end(win) {
    if (this.over) return;
    this.over = true;
    Sfx.stopAll();
    this.running = false;
    if (win) {
      const had = Save.starsOn(this.levelNo);
      const first = had === 0;
      const stars = starsFor(this.lives, this.level.lives);
      const best = stars > had;
      /* the clear pays a little; the stars pay properly */
      const bounty = starBounty(had, Math.max(had, stars));
      const chapterIdx = CHAPTERS.findIndex((c) => c.id === this.level.chapter);
      const wasMastered = Save.chapterMastered(this.level.chapter);
      Save.clearLevel(this.levelNo, stars);
      const nowMastered = Save.chapterMastered(this.level.chapter);
      const cityBonus = !wasMastered && nowMastered ? chapterBounty(chapterIdx) : 0;

      this.runGems = levelReward(this.level) * (first ? 2 : 1) + bounty + cityBonus;
      Save.addGems(this.runGems);
      Sfx.fanfare();
      this.onEvent('victory', {
        gems: this.runGems, first, level: this.levelNo, stars, best, bounty, cityBonus,
      });
    } else {
      /* a failed run still pays for the rounds that were held */
      this.runGems = Math.max(0, (this.round - 1) * 4);
      if (this.runGems) Save.addGems(this.runGems);
      Sfx.defeat();
      this.onEvent('defeat', { gems: this.runGems, level: this.levelNo });
    }
  }

  leak(b) {
    b.dead = true;
    const dmg = b.boss ? DREAD.leak : b.tier + 1;
    this.lives -= dmg;
    this.shake = Math.max(this.shake, 7);
    /* the road may exit off-canvas, so pin the warning where it's visible */
    const lane = b.path || PATH;
    const exit = lane.at(lane.length - 70);
    this.floatText(exit.x, Math.min(exit.y, CANVAS_H - 46), `-${dmg}`, '#ff5a6e', 1.1, 20);
    Sfx.leak();
    if (this.lives <= 0) { this.lives = 0; this.end(false); }
  }

  /* ---------------- boss powers ---------------- */
  /**
   * Each city warlord has one trick, fired on a timer. Tower lockouts are
   * always brief and always telegraphed by the boss's charging core.
   */
  bossPower(b) {
    const pw = b.chapterBoss.power;
    const col = b.chapterBoss.color;
    this.rings.push({ x: b.x, y: b.y, r: 20, max: pw.radius || 180,
      life: .6, maxLife: .6, color: col, thick: 9 });
    this.shake = Math.max(this.shake, 7);

    switch (pw.kind) {
      case 'summon': {
        for (let i = 0; i < pw.count; i++) {
          const e = new Enemy(clamp(2 + Math.floor(this.levelNo / 10), 0, 4), {
            speedMul: b.speedMul,
          });
          e.d = Math.max(0, b.d - 20 - i * 16);
          e.spawnAnim = .2;
          this.enemies.push(e);
        }
        this.floatText(b.x, b.y - 66, 'DRONE SCREEN', col, 1.3, 15);
        Sfx.bossSummon();
        break;
      }
      case 'gas': {
        /* the nearest hero simply stops working for a moment */
        let best = null, bd = Infinity;
        for (const t of this.towers) {
          if (!t.isHero) continue;
          const d2 = distSq(t.x, t.y, b.x, b.y);
          if (d2 < bd && d2 <= pw.radius * pw.radius) { bd = d2; best = t; }
        }
        if (best) {
          best.disabled = Math.max(best.disabled || 0, pw.duration);
          this.floatText(best.x, best.y - 44, 'LAUGHING GAS', col, 1.3, 14);
        }
        Sfx.bossGas();
        break;
      }
      case 'emp':
      case 'freeze': {
        let n = 0;
        for (const t of this.towers) {
          if (distSq(t.x, t.y, b.x, b.y) > pw.radius * pw.radius) continue;
          t.disabled = Math.max(t.disabled || 0, pw.duration);
          n++;
        }
        this.floatText(b.x, b.y - 66,
          pw.kind === 'freeze' ? `FLASH FREEZE · ${n}` : `SURGE PULSE · ${n}`, col, 1.4, 16);
        this.flash = Math.max(this.flash, .2);
        if (pw.kind === 'freeze') Sfx.bossFreeze(); else Sfx.bossEmp();
        break;
      }
      case 'regen': {
        b.hp = Math.min(b.maxHp, b.hp + pw.amount);
        this.floatText(b.x, b.y - 66, `+${pw.amount}`, '#7dff9c', 1, 15);
        for (let i = 0; i < 10; i++) {
          const a = rand(0, TAU);
          this.particles.push(new Particle(b.x + Math.cos(a) * 40, b.y + Math.sin(a) * 40, {
            vx: -Math.cos(a) * 90, vy: -Math.sin(a) * 90, life: .45, size: rand(2, 4),
            color: '#ffb15c', kind: 'spark',
          }));
        }
        Sfx.bossRegen();
        break;
      }
      case 'null': {
        for (const t of this.towers) {
          if (!t.isHero) continue;
          if (distSq(t.x, t.y, b.x, b.y) > pw.radius * pw.radius) continue;
          t.disabled = Math.max(t.disabled || 0, pw.duration);
        }
        for (let i = 0; i < pw.count; i++) {
          const e = new Enemy(4, { speedMul: b.speedMul, shield: true });
          e.d = Math.max(0, b.d - 24 - i * 18);
          e.spawnAnim = .2;
          this.enemies.push(e);
        }
        this.floatText(b.x, b.y - 70, 'NULL PULSE', col, 1.6, 18);
        this.flash = Math.max(this.flash, .4);
        Sfx.bossNull();
        break;
      }
    }
  }

  /* ---------------- support masts ---------------- */
  /** recomputed each step: who is standing inside a Relay Mast's ring */
  updateBuffs() {
    const masts = this.towers.filter((t) => t.def.kind === 'support');
    for (const t of this.towers) {
      let range = 1, rate = 1;
      if (t.def.kind !== 'support') {
        for (const m of masts) {
          const r = m.def.range * m.mods.range;
          if (distSq(m.x, m.y, t.x, t.y) > r * r) continue;
          /* masts do not stack in full — the best one wins, plus a little */
          range = Math.max(range, 1 + m.def.buff.range * (1 + (m.level - 1) * .25));
          rate = Math.min(rate, m.def.buff.rate - (m.level - 1) * .05);
        }
      }
      t.buffRange = range;
      t.buffRate = rate;
    }
  }

  /* ---------------- counter escorts ---------------- */
  /**
   * Recomputed each step: a hero is suppressed while an escort that counters
   * one of its tags is inside its own aura. Towers are never suppressed.
   */
  updateSuppression() {
    const auras = [];
    for (const e of this.enemies) {
      if (!e.dead && e.special && e.special.suppress) auras.push(e);
    }
    for (const t of this.towers) {
      if (!t.isHero || !t.def.tags) { t.suppressed = null; continue; }
      let hit = null;
      for (const e of auras) {
        const r = e.special.aura;
        if (distSq(e.x, e.y, t.x, t.y) > r * r) continue;
        if (!e.special.suppress.some((tag) => t.def.tags.includes(tag))) continue;
        hit = e.special;
        break;
      }
      if (hit && !t.suppressed) {
        this.floatText(t.x, t.y - 40, 'SUPPRESSED', hit.color, 1.1, 13);
        Sfx.suppress();
      }
      t.suppressed = hit;
    }
  }

  /* ---------------- combat helpers ---------------- */
  firstInRange(x, y, r) {
    let best = null, bestD = -1;
    const r2 = r * r;
    for (const b of this.enemies) {
      if (b.dead) continue;
      if (distSq(b.x, b.y, x, y) > r2) continue;
      if (b.d > bestD) { bestD = b.d; best = b; }
    }
    return best;
  }

  /** how far along its own road the leading trooper is, and on which road */
  leadDistance() {
    let best = 0, lane = 0;
    for (const e of this.enemies) if (!e.dead && e.d > best) { best = e.d; lane = e.lane; }
    return { d: best, lane };
  }

  /** the road carrying the most trouble right now */
  busiestLane() {
    if (PATHS.length < 2) return 0;
    const tally = new Array(PATHS.length).fill(0);
    for (const e of this.enemies) if (!e.dead) tally[e.lane] = (tally[e.lane] || 0) + 1;
    return tally.indexOf(Math.max(...tally));
  }

  anyInRange(x, y, r) {
    const r2 = r * r;
    for (const b of this.enemies) if (!b.dead && distSq(b.x, b.y, x, y) <= r2) return true;
    return false;
  }

  damage(b, amount, opts = {}) {
    if (b.dead) return;

    /* a counter escort simply refuses the damage type it is built against */
    if (opts.tags && b.immuneTo(opts.tags)) {
      if (!b.immuneShown || this.time - b.immuneShown > .6) {
        b.immuneShown = this.time;
        this.floatText(b.x, b.y - 26, 'IMMUNE', b.special.color, .8, 13);
        this.spark(b.x, b.y, b.special.color, 5);
        Sfx.deflect();
      }
      return;
    }

    /* Nocturne's mark doubles everything that lands on it */
    if (b.marked > 0) amount *= 2;

    /* Sable's work: seams found, so plate stops helping and hits bite deeper */
    if (this.exposed > 0) amount += 1;
    else if (b.shield && !opts.dot) amount = Math.max(1, amount - SHIELD_SOAK);

    if (b.boss) {
      b.hp -= amount;
      b.hitFlash = .6;
      this.spark(b.x, b.y, '#ffb0a0', 3);
      if (b.hp <= 0) {
        b.dead = true;
        const reward = b.chapterBoss ? b.chapterBoss.reward : DREAD.reward;
        this.cash += reward;
        if (b.chapterBoss) {
          this.floatText(CANVAS_W / 2, 140, `${b.chapterBoss.name} DOWN`, b.chapterBoss.color, 2.6, 30);
          this.flash = Math.max(this.flash, .5);
          this.shake = Math.max(this.shake, 18);
          for (let i = 0; i < 3; i++) {
            this.explodeFx(b.x + rand(-30, 30), b.y + rand(-30, 30), 90, b.chapterBoss.color);
          }
        }
        this.spawnCoins(b.x, b.y, 4, reward);
        this.cashChime();
        this.explodeFx(b.x, b.y, 70, '#ff7a4d');
        this.floatText(b.x, b.y - 40, `+$${reward}`, '#ffcf5c', 1.2, 18);
        this.shake = Math.max(this.shake, 10);
        Sfx.boom();
        /* a wrecked walker spills the squad riding inside it */
        for (let i = 0; i < 4; i++) {
          const child = new Enemy(3, { speedMul: b.speedMul });
          child.d = Math.max(0, b.d - 14 - i * 12);
          child.spawnAnim = .4;
          this.enemies.push(child);
        }
      }
      return;
    }

    while (amount > 0 && !b.dead) {
      const info = TROOPS[b.tier];
      this.cash += info.reward;
      this.killFx(b.x, b.y, info.color, b.tier > 0);
      if (!opts.silent) Sfx.kill(b.tier);
      amount--;
      b.tier--;
      if (b.tier < 0) {
        b.dead = true;
        this.spawnCoins(b.x, b.y, 1 + (b.special ? 1 : 0), info.reward);
        this.cashChime();
      } else { b.r = TROOPS[b.tier].r; b.hitFlash = .4; }
    }
  }

  explode(x, y, radius, damage, owner, tags) {
    this.explodeFx(x, y, radius, '#ffb15c');
    this.shake = Math.max(this.shake, 5);
    Sfx.boom();
    for (const b of this.enemies) {
      if (b.dead) continue;
      if (distSq(b.x, b.y, x, y) <= radius * radius) {
        this.damage(b, damage, { source: owner, silent: true, tags });
      }
    }
  }

  /** particle count, trimmed on small screens */
  n(count) { return Math.max(1, Math.round(count * this.fx)); }

  /* ---------------- cash feedback ---------------- */
  /** coins arc out of a kill and fly to the counter; balance is untouched */
  spawnCoins(x, y, n, value) {
    const many = Math.min(n, 4);
    for (let i = 0; i < many; i++) this.coins.push(new Coin(x, y, value));
  }

  /** a kill streak only raises the pitch of the chime — no economy change */
  cashChime() {
    this.streak = Math.min(this.streak + 1, 24);
    this.streakT = 1.4;
    Sfx.pickup(this.streak);
  }

  /* ---------------- fx ---------------- */
  killFx(x, y, color, armour) {
    /* armour plate shards plus a burst off the power core */
    for (let i = 0, n = this.n(7); i < n; i++) {
      const a = rand(0, TAU);
      this.particles.push(new Particle(x, y, {
        vx: Math.cos(a) * rand(40, 190), vy: Math.sin(a) * rand(40, 190) - 50,
        life: rand(.35, .7), size: rand(2, 4.5),
        color: armour ? color : pick([color, '#9aa3b8', '#5c6376']),
        kind: 'shard', gravity: 460,
      }));
    }
    for (let i = 0, n = this.n(4); i < n; i++) {
      const a = rand(0, TAU);
      this.particles.push(new Particle(x, y, {
        vx: Math.cos(a) * rand(60, 150), vy: Math.sin(a) * rand(60, 150),
        life: .22, size: rand(1.5, 3), color: '#ff6a4d', kind: 'spark',
      }));
    }
    this.rings.push({ x, y, r: 4, max: 24, life: .2, maxLife: .2, color: '#ff8a6a', thick: 2.2 });
  }

  explodeFx(x, y, radius, color) {
    this.rings.push({ x, y, r: 6, max: radius, life: .4, maxLife: .4, color, thick: 6 });
    for (let i = 0, n = this.n(22); i < n; i++) {
      const a = rand(0, TAU), sp = rand(60, 260);
      this.particles.push(new Particle(x, y, {
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: rand(.3, .7), size: rand(3, 7),
        color: pick([color, '#ffe066', '#ffffff']), kind: 'spark', gravity: 120,
      }));
    }
    for (let i = 0, n = this.n(8); i < n; i++) {
      this.particles.push(new Particle(x + rand(-10, 10), y + rand(-10, 10), {
        vx: rand(-30, 30), vy: rand(-60, -20),
        life: rand(.5, 1), size: rand(6, 12), color: '#8a8f9e', kind: 'smoke',
      }));
    }
  }

  spark(x, y, color, n = 4) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU);
      this.particles.push(new Particle(x, y, {
        vx: Math.cos(a) * rand(30, 90), vy: Math.sin(a) * rand(30, 90),
        life: .25, size: rand(1.5, 3), color, kind: 'spark',
      }));
    }
  }

  floatText(x, y, text, color, life = .9, size = 15) {
    this.texts.push({ x, y, text, color, life, maxLife: life, size });
  }

  /* ---------------- main step ---------------- */
  update(dtReal) {
    if (this.paused) return;
    const steps = this.speed > 1 ? Math.ceil(this.speed) : 1;
    const dt = (dtReal * this.speed) / steps;
    for (let s = 0; s < steps; s++) this.step(dt);
  }

  step(dt) {
    this.time += dt;

    /* once the run is decided the field freezes and only fx play out */
    if (this.over) {
      for (const p of this.particles) p.update(dt);
      for (const r of this.rings) { r.life -= dt; r.r = lerp(r.r, r.max, dt * 9); }
      for (const b of this.beams) b.life -= dt;
      for (const t of this.texts) { t.life -= dt; t.y -= dt * 26; }
      for (const c of this.coins) c.update(dt);
      this.webs = []; this.strikes = [];
      this.particles = this.particles.filter((p) => p.life > 0);
      this.coins = this.coins.filter((c) => !c.dead);
      this.rings = this.rings.filter((r) => r.life > 0);
      this.beams = this.beams.filter((b) => b.life > 0);
      this.texts = this.texts.filter((t) => t.life > 0);
      if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 26);
      if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 2.4);
      return;
    }

    /* spawn queue */
    if (this.running) {
      this.roundTime += dt;
      while (this.queue.length && this.queue[0].t <= this.roundTime) {
        const e = this.queue.shift();
        this.enemies.push(new Enemy(e.tier, e.opts));
      }
    }

    for (const b of this.enemies) if (!b.dead) b.update(dt, this);
    this.updateSuppression();
    this.updateBuffs();
    for (const t of this.towers) t.update(dt, this);
    for (const p of this.projectiles) if (!p.dead) p.update(dt, this);
    for (const sw of this.saws) if (!sw.dead) sw.update(dt, this);
    for (const ln of this.lances) if (!ln.dead) ln.update(dt, this);
    if (this.rally > 0) this.rally -= dt;
    if (this.exposed > 0) this.exposed -= dt;
    if (this.judgement > 0) {
      this.judgement -= dt;
      this.judgementTick -= dt;
      for (const e of this.enemies) if (!e.dead) e.chill(0, .25);
      if (this.judgementTick <= 0) {
        this.judgementTick = .45;
        for (const e of [...this.enemies]) {
          if (e.dead) continue;
          this.damage(e, this.judgementDmg, { x: e.x, y: e.y, silent: true, tags: ['electric'] });
          if (Math.random() < .4) this.spark(e.x, e.y, '#ffe27a', 4);
        }
        this.shake = Math.max(this.shake, 4);
        Sfx.zap();
      }
    }
    if (this.downpour > 0) {
      this.downpour -= dt;
      this.downpourTick -= dt;
      for (const e of this.enemies) if (!e.dead) e.chill(.45, .3);
      if (this.downpourTick <= 0) {
        this.downpourTick = .6;
        for (const e of [...this.enemies]) {
          if (!e.dead) this.damage(e, this.downpourDmg, { x: e.x, y: e.y, silent: true, tags: ['storm'] });
        }
      }
    }
    for (const w of this.webs) {
      w.life -= dt;
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (distSq(e.x, e.y, w.x, w.y) <= w.r * w.r) e.chill(w.slow, .3);
      }
    }
    this.webs = this.webs.filter((w) => w.life > 0);

    for (const st of this.strikes) {
      if (st.delay > 0) { st.delay -= dt; continue; }
      if (!st.done) {
        st.done = true;
        for (const e of this.enemies) {
          if (e.dead) continue;
          if (distSq(e.x, e.y, st.x, st.y) > 46 * 46) continue;
          this.damage(e, st.damage, { x: e.x, y: e.y, silent: true, tags: st.tags });
        }
        this.spark(st.x, st.y, '#cfe6ff', 8);
        this.shake = Math.max(this.shake, 3);
        Sfx.zap();
      }
      st.life -= dt;
    }
    this.strikes = this.strikes.filter((st) => st.delay > 0 || st.life > 0);

    for (const c of this.coins) c.update(dt);
    if (this.streakT > 0) {
      this.streakT -= dt;
      if (this.streakT <= 0) this.streak = 0;
    }
    for (const p of this.particles) p.update(dt);
    for (const r of this.rings) { r.life -= dt; r.r = lerp(r.r, r.max, dt * 9); }
    for (const b of this.beams) b.life -= dt;
    for (const t of this.texts) { t.life -= dt; t.y -= dt * 26; }

    this.enemies = this.enemies.filter((b) => !b.dead);
    this.projectiles = this.projectiles.filter((p) => !p.dead);
    this.saws = this.saws.filter((sw) => !sw.dead);
    this.lances = this.lances.filter((ln) => !ln.dead);
    this.particles = this.particles.filter((p) => p.life > 0);
    this.coins = this.coins.filter((c) => !c.dead);
    this.rings = this.rings.filter((r) => r.life > 0);
    this.beams = this.beams.filter((b) => b.life > 0);
    this.texts = this.texts.filter((t) => t.life > 0);

    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 26);
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 2.4);

    if (this.running && !this.over && !this.queue.length && !this.enemies.length
        && !this.saws.length && !this.lances.length && !this.strikes.length) this.finishRound();
  }

  /* ---------------- draw ---------------- */
  draw() {
    const ctx = this.ctx;
    ctx.save();
    if (this.shake > .2) {
      ctx.translate(rand(-this.shake, this.shake), rand(-this.shake, this.shake));
    }

    ctx.drawImage(this.bg, 0, 0);

    /* range preview under everything else */
    if (this.placing && this.pointer.inside) {
      const { x, y } = this.pointer;
      const ok = this.canPlaceAt(x, y) && this.cash >= (this.placing.isHero ? 0 : this.placing.def.cost);
      ctx.save();
      ctx.fillStyle = ok ? 'rgba(120,255,170,.13)' : 'rgba(255,90,110,.16)';
      ctx.strokeStyle = ok ? 'rgba(150,255,190,.8)' : 'rgba(255,120,140,.85)';
      ctx.lineWidth = 2; ctx.setLineDash([8, 6]); ctx.lineDashOffset = -this.time * 30;
      ctx.beginPath(); ctx.arc(x, y, this.placing.def.range, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.restore();
    }

    /* web zones sit under everything */
    for (const w of this.webs) {
      const k = clamp(w.life / w.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = .18 + k * .22;
      ctx.fillStyle = '#e8eefc';
      ctx.beginPath(); ctx.arc(w.x, w.y, w.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(240,246,255,.8)';
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU + w.seed;
        ctx.beginPath();
        ctx.moveTo(w.x, w.y);
        ctx.lineTo(w.x + Math.cos(a) * w.r, w.y + Math.sin(a) * w.r);
        ctx.stroke();
      }
      for (let ring = 1; ring <= 3; ring++) {
        ctx.beginPath();
        ctx.arc(w.x, w.y, (w.r / 3) * ring, 0, TAU);
        ctx.stroke();
      }
      ctx.restore();
    }

    /* rings (ground fx) */
    for (const r of this.rings) {
      const t = r.life / r.maxLife;
      ctx.save();
      ctx.globalAlpha = t * .85;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = (r.thick || 3) * t;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, TAU); ctx.stroke();
      ctx.restore();
    }

    /* cheap depth sort so units overlap believably */
    const drawables = [...this.towers].sort((a, b) => a.y - b.y);
    for (const t of drawables) t.draw(ctx, this.time, this.selected === t);

    for (const b of this.enemies) b.draw(ctx, this.time);
    for (const p of this.projectiles) p.draw(ctx);
    for (const sw of this.saws) sw.draw(ctx, this.time);
    for (const ln of this.lances) ln.draw(ctx, this.time);

    /* Storm Call bolts */
    for (const st of this.strikes) {
      if (st.delay > 0 || st.life <= 0) continue;
      const k = st.life / st.maxLife;
      ctx.save();
      ctx.globalAlpha = k;
      ctx.strokeStyle = '#e8f4ff';
      ctx.lineWidth = 3 * k + 1;
      if (this.fx > .75) { ctx.shadowColor = '#9fd0ff'; ctx.shadowBlur = 18; }
      ctx.beginPath();
      ctx.moveTo(st.x + rand(-14, 14), 0);
      let y = 0;
      while (y < st.y - 10) {
        y += 26;
        ctx.lineTo(st.x + rand(-16, 16), Math.min(y, st.y));
      }
      ctx.lineTo(st.x, st.y);
      ctx.stroke();
      ctx.restore();
    }

    /* lightning beams */
    for (const bm of this.beams) {
      const t = bm.life / bm.maxLife;
      ctx.save();
      ctx.globalAlpha = t;
      ctx.strokeStyle = bm.color;
      ctx.lineWidth = bm.width * t;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (this.fx > .75) { ctx.shadowColor = bm.color; ctx.shadowBlur = 16; }
      ctx.beginPath();
      bm.pts.forEach((p, i) => {
        if (i === 0) { ctx.moveTo(p.x, p.y); return; }
        if (bm.straight) { ctx.lineTo(p.x, p.y); return; }
        const prev = bm.pts[i - 1];
        /* jagged mid point for a lightning feel */
        const mx = (prev.x + p.x) / 2 + rand(-9, 9);
        const my = (prev.y + p.y) / 2 + rand(-9, 9);
        ctx.lineTo(mx, my); ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = bm.width * t * .4;
      ctx.stroke();
      ctx.restore();
    }

    for (const p of this.particles) p.draw(ctx);
    for (const c of this.coins) c.draw(ctx);

    /* floating text */
    for (const t of this.texts) {
      const a = clamp(t.life / t.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.font = `900 ${t.size}px Trebuchet MS, sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.65)';
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
      ctx.restore();
    }

    /* Judgement: the sky itself is the weapon */
    if (this.judgement > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(255,220,120,${.06 + Math.sin(this.time * 20) * .05})`;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.strokeStyle = 'rgba(255,230,150,.75)';
      ctx.lineWidth = 2;
      const n = this.fx > .75 ? 5 : 3;
      for (let i = 0; i < n; i++) {
        const x = ((this.time * 300 + i * 331) % CANVAS_W);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        let y = 0;
        while (y < CANVAS_H) { y += 70; ctx.lineTo(x + rand(-26, 26), y); }
        ctx.stroke();
      }
      ctx.restore();
    }

    /* Downpour: rain across the whole board while it lasts */
    if (this.downpour > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(190,220,255,.35)';
      ctx.lineWidth = 1.2;
      const t = this.time * 900;
      for (let i = 0; i < (this.fx > .75 ? 90 : 45); i++) {
        const x = (i * 137.5 + t * .7) % (CANVAS_W + 60) - 30;
        const y = (i * 271.3 + t) % (CANVAS_H + 60) - 30;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 14); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(90,130,190,.12)';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.restore();
    }

    /* an ability flash washes over the whole field */
    if (this.flash > .01) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(255,240,210,${clamp(this.flash, 0, .55)})`;
      ctx.fillRect(-20, -20, CANVAS_W + 40, CANVAS_H + 40);
      ctx.restore();
    }

    /* ghost of the unit being placed */
    if (this.placing && this.pointer.inside) {
      const { x, y } = this.pointer;
      const ok = this.canPlaceAt(x, y) && this.cash >= (this.placing.isHero ? 0 : this.placing.def.cost);
      ctx.save();
      ctx.globalAlpha = .8;
      ctx.translate(x, y);
      if (!ok) ctx.filter = 'grayscale(1)';
      this.placing.def.art(ctx, 1, this.time);
      ctx.restore();
    }

    ctx.restore();
  }
}
