/* ------------------------------------------------------------------
   game.js — simulation + rendering for the tower-defense stage
------------------------------------------------------------------- */

/* =============================== VOID LEGION TROOPER =============================== */
class Enemy {
  constructor(tier, opts = {}) {
    this.tier = tier;                 // 0..4 or 'boss'
    this.boss = tier === 'boss';
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
    this.hp = this.boss ? DREAD.hp : 1;
    this.maxHp = this.hp;
    this.r = this.boss ? DREAD.r : TROOPS[tier].r;
    this.step = rand(0, TAU);         // walk cycle offset
  }

  get info() { return this.boss ? DREAD : TROOPS[this.tier]; }
  get color() { return this.info.color; }
  get speed() {
    return this.info.speed * this.slowF * this.speedMul * (this.swift ? SWIFT_MUL : 1);
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

    const v = this.speed;
    this.d += v * dt;
    this.step += dt * v * .09;
    if (this.d >= PATH.length) { game.leak(this); return; }
    const p = PATH.at(this.d);
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

    if (this.boss) this.drawDread(ctx, time, grow);
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
    if (this.slowT > 0) {
      ctx.fillStyle = 'rgba(160,230,255,.3)';
      roundRect(ctx, -8, -14, 16, 20, 5); ctx.fill();
    }
    if (this.hitFlash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${clamp(this.hitFlash, 0, .7)})`;
      roundRect(ctx, -8, -16, 16, 22, 5); ctx.fill();
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
  }

  get mods() { return levelMods(this.level); }
  get maxCharges() { return this.def.ability ? this.def.ability.charges[this.level - 1] : 0; }
  get ultReady() { return !!this.def.ability && this.charges > 0; }
  get range() { return this.def.range * this.mods.range; }
  get rate() { return this.def.cooldown * this.mods.rate; }
  get damage() { return this.def.damage + this.mods.damage; }
  get pierce() { return (this.def.pierce || 1) + this.mods.pierce; }
  /** Overdrive collapses the cooldown to a fraction of normal */
  get firingRate() { return this.overdrive > 0 ? this.rate * .17 : this.rate; }

  update(dt, game) {
    this.placeAnim = Math.min(1, this.placeAnim + dt * 3.2);
    if (this.ultAnim > 0) this.ultAnim = Math.max(0, this.ultAnim - dt);
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

    const target = game.firstInRange(this.x, this.y, this.range);
    if (target) {
      const want = Math.atan2(target.y - this.y, target.x - this.x);
      /* short-path angle interpolation */
      let diff = ((want - this.angle + Math.PI * 3) % TAU) - Math.PI;
      this.angle += diff * Math.min(1, dt * 12);
      this.facing = Math.cos(want) < 0 ? -1 : 1;
    }

    if (this.cd <= 0) {
      const kind = this.def.kind;
      if (kind === 'frost' || kind === 'slam') {
        if (game.anyInRange(this.x, this.y, this.range)) { this.fire(game, null); this.cd = this.firingRate; }
      } else if (target) {
        this.fire(game, target); this.cd = this.firingRate;
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
      hits.forEach((e) => game.damage(e, this.damage, { source: this, x: e.x, y: e.y }));
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
          kind: 'dart', color: this.isHero ? '#ffb15c' : '#e9eeff',
          burn: d.burn ? d.burn.time : 0, size: 4,
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
          game.damage(b, this.damage, { source: this, x: b.x, y: b.y });
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
        hits.forEach((b, i) => game.damage(b, Math.max(1, this.damage - (i > 1 ? 1 : 0)), { source: this, x: b.x, y: b.y }));
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
          game.damage(b, this.damage, { source: this, x: b.x, y: b.y });
        }
        game.shake = Math.max(game.shake, 6);
        Sfx.slam();
        break;
      }
      case 'ray': {
        /* weak but constant green energy beam */
        game.beams.push({
          pts: [{ x: this.x + this.facing * 15, y: this.y - 3 }, { x: target.x, y: target.y }],
          life: .15, maxLife: .15, color: d.rayColor || '#5cff9e', width: 3, straight: true,
        });
        game.damage(target, this.damage, { source: this, x: target.x, y: target.y });
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
    if (this.age >= this.life) {
      if (this.kind === 'bomb') game.explode(this.x, this.y, this.blast, this.damage, this.owner);
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

      if (this.kind === 'bomb') {
        game.explode(this.x, this.y, this.blast, this.damage, this.owner);
        this.dead = true; return;
      }
      this.hits.add(b);
      if (this.burn) b.ignite(this.burn);
      game.damage(b, this.damage, { source: this.owner, x: this.x, y: this.y });
      if (--this.pierce <= 0) { this.dead = true; return; }
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    if (this.kind === 'bomb') {
      ctx.rotate(this.spin);
      ctx.fillStyle = '#20263c';
      ctx.beginPath(); ctx.arc(0, 0, this.size, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.3)';
      ctx.beginPath(); ctx.arc(-2, -2, 2, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#ffb15c'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(0, -this.size); ctx.lineTo(2, -this.size - 4); ctx.stroke();
      ctx.fillStyle = '#ffe066';
      ctx.beginPath(); ctx.arc(2.5, -this.size - 5, 1.8 + Math.random(), 0, TAU); ctx.fill();
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
  constructor(level) {
    this.level = level;
    this.d = 0;
    this.speed = 400 + (level - 1) * 80;
    this.r = 32 + (level - 1) * 7;
    this.damage = level >= 3 ? 14 : level === 2 ? 11 : 9;
    this.spin = 0;
    this.age = 0;
    this.dead = false;
    this.x = PATH.at(0).x; this.y = PATH.at(0).y;
    /* brief per-target cooldown so a Dreadnought is chewed, not one-shot */
    this.hitAt = new Map();
    /* the blade hum runs for as long as the saw is on the track */
    this.voice = Sfx.startSaw(level);
  }

  update(dt, game) {
    this.age += dt;
    this.spin += dt * 15;
    this.d += this.speed * dt;
    const p = PATH.at(this.d);
    this.x = p.x; this.y = p.y;

    /* sparks off the track */
    for (let i = 0; i < 2; i++) {
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
      game.damage(b, this.damage, { source: this, x: b.x, y: b.y, silent: true });
      game.spark(b.x, b.y, '#9dffc6', 6);
      this.voice.bite();
    }

    if (this.d >= PATH.length) {
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
        game.damage(e, this.damage, { source: this.t, x: e.x, y: e.y, silent: true });
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
    this.reset(1);
  }

  reset(levelNo = this.levelNo || 1) {
    Sfx.stopAll();
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

  get heroSlotsUsed() { return this.heroesPlaced.size; }
  get heroSlotsFree() { return HERO_SLOTS - this.heroesPlaced.size; }

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
    const stroke = (w, style) => {
      g.strokeStyle = style; g.lineWidth = w;
      g.lineJoin = 'round'; g.lineCap = 'round';
      g.beginPath();
      PATH.points.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
      g.stroke();
    };
    stroke(TRACK_WIDTH + 16, 'rgba(0,0,0,.22)');
    stroke(TRACK_WIDTH + 8, th.trackEdge);
    stroke(TRACK_WIDTH, th.track);
    stroke(TRACK_WIDTH - 12, th.trackMid);

    /* grit scattered along the route */
    for (let d = 0; d < PATH.length; d += 7) {
      const p = PATH.at(d);
      const off = (rng() - .5) * (TRACK_WIDTH - 10);
      const nx = -Math.sin(p.ang) * off, ny = Math.cos(p.ang) * off;
      g.fillStyle = `rgba(${rng() < .5 ? th.grit[0] : th.grit[1]},.55)`;
      g.beginPath(); g.arc(p.x + nx, p.y + ny, .8 + rng() * 1.4, 0, TAU); g.fill();
    }

    /* breach point and the bastion line */
    const start = PATH.at(2), end = PATH.at(PATH.length - 40);
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
    if (PATH.distanceTo(x, y) < TRACK_WIDTH / 2 + 16) return false;
    for (const t of this.towers) if (distSq(t.x, t.y, x, y) < 34 * 34) return false;
    return true;
  }

  tryPlace(x, y) {
    const p = this.placing;
    if (!p) return false;
    const cost = p.isHero ? 0 : p.def.cost;
    if (p.isHero && !this.heroesPlaced.has(p.def.id) && this.heroSlotsFree <= 0) {
      this.floatText(x, y - 20, `Only ${HERO_SLOTS} heroes per mission`, '#ff5a6e', 1.2, 14);
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
    return !!(t && t.def.ability && !this.over && t.charges > 0
      && (this.running || this.enemies.length > 0));
  }

  activateUlt(t) {
    if (!t || !t.def.ability || this.over) return false;
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
      for (let i = 0; i < n; i++) {
        const a = rand(0, TAU);
        this.particles.push(new Particle(t.x, t.y, {
          vx: Math.cos(a) * rand(80, 260), vy: Math.sin(a) * rand(80, 260) - 40,
          life: rand(.4, .9), size: rand(2, 5), color, kind: 'spark', gravity: 90,
        }));
      }
    };

    switch (ab.kind) {
      case 'saw':
        this.saws.push(new Saw(t.level));
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
    for (const grp of this.waves[this.round - 1]) {
      for (let i = 0; i < grp.count; i++) {
        this.queue.push({
          tier: grp.tier, t: grp.delay + i * grp.gap,
          opts: { swift: !!grp.swift, shield: !!grp.shield, speedMul },
        });
      }
    }
    this.queue.sort((a, b) => a.t - b.t);
    this.onEvent('round-start', this.round);
  }

  finishRound() {
    this.running = false;
    const bonus = 95 + this.round * 14 + this.levelNo * 10;
    this.cash += bonus;
    this.floatText(CANVAS_W / 2, 90, `Round ${this.round} cleared  +$${bonus}`, '#4ade80', 2.2, 22);
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
      const first = Save.clearedLevels() < this.levelNo;
      this.runGems = levelReward(this.level) * (first ? 2 : 1);
      Save.addGems(this.runGems);
      Save.clearLevel(this.levelNo);
      Sfx.fanfare();
      this.onEvent('victory', { gems: this.runGems, first, level: this.levelNo });
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
    /* the track exits below the canvas, so pin the warning where it's visible */
    const exit = PATH.at(PATH.length - 70);
    this.floatText(exit.x, Math.min(exit.y, CANVAS_H - 46), `-${dmg}`, '#ff5a6e', 1.1, 20);
    Sfx.leak();
    if (this.lives <= 0) { this.lives = 0; this.end(false); }
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

  anyInRange(x, y, r) {
    const r2 = r * r;
    for (const b of this.enemies) if (!b.dead && distSq(b.x, b.y, x, y) <= r2) return true;
    return false;
  }

  damage(b, amount, opts = {}) {
    if (b.dead) return;
    /* shielded troopers shrug off part of every hit (but never all of it) */
    if (b.shield && !opts.dot) amount = Math.max(1, amount - SHIELD_SOAK);

    if (b.boss) {
      b.hp -= amount;
      b.hitFlash = .6;
      this.spark(b.x, b.y, '#ffb0a0', 3);
      if (b.hp <= 0) {
        b.dead = true;
        this.cash += DREAD.reward;
        this.explodeFx(b.x, b.y, 70, '#ff7a4d');
        this.floatText(b.x, b.y - 40, `+$${DREAD.reward}`, '#ffcf5c', 1.2, 18);
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
      if (b.tier < 0) { b.dead = true; }
      else { b.r = TROOPS[b.tier].r; b.hitFlash = .4; }
    }
  }

  explode(x, y, radius, damage, owner) {
    this.explodeFx(x, y, radius, '#ffb15c');
    this.shake = Math.max(this.shake, 5);
    Sfx.boom();
    for (const b of this.enemies) {
      if (b.dead) continue;
      if (distSq(b.x, b.y, x, y) <= radius * radius) this.damage(b, damage, { source: owner, silent: true });
    }
  }

  /* ---------------- fx ---------------- */
  killFx(x, y, color, armour) {
    /* armour plate shards plus a burst off the power core */
    for (let i = 0; i < 7; i++) {
      const a = rand(0, TAU);
      this.particles.push(new Particle(x, y, {
        vx: Math.cos(a) * rand(40, 190), vy: Math.sin(a) * rand(40, 190) - 50,
        life: rand(.35, .7), size: rand(2, 4.5),
        color: armour ? color : pick([color, '#9aa3b8', '#5c6376']),
        kind: 'shard', gravity: 460,
      }));
    }
    for (let i = 0; i < 4; i++) {
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
    for (let i = 0; i < 22; i++) {
      const a = rand(0, TAU), sp = rand(60, 260);
      this.particles.push(new Particle(x, y, {
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: rand(.3, .7), size: rand(3, 7),
        color: pick([color, '#ffe066', '#ffffff']), kind: 'spark', gravity: 120,
      }));
    }
    for (let i = 0; i < 8; i++) {
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
      this.particles = this.particles.filter((p) => p.life > 0);
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
    for (const t of this.towers) t.update(dt, this);
    for (const p of this.projectiles) if (!p.dead) p.update(dt, this);
    for (const sw of this.saws) if (!sw.dead) sw.update(dt, this);
    for (const ln of this.lances) if (!ln.dead) ln.update(dt, this);

    for (const p of this.particles) p.update(dt);
    for (const r of this.rings) { r.life -= dt; r.r = lerp(r.r, r.max, dt * 9); }
    for (const b of this.beams) b.life -= dt;
    for (const t of this.texts) { t.life -= dt; t.y -= dt * 26; }

    this.enemies = this.enemies.filter((b) => !b.dead);
    this.projectiles = this.projectiles.filter((p) => !p.dead);
    this.saws = this.saws.filter((sw) => !sw.dead);
    this.lances = this.lances.filter((ln) => !ln.dead);
    this.particles = this.particles.filter((p) => p.life > 0);
    this.rings = this.rings.filter((r) => r.life > 0);
    this.beams = this.beams.filter((b) => b.life > 0);
    this.texts = this.texts.filter((t) => t.life > 0);

    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 26);
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 2.4);

    if (this.running && !this.over && !this.queue.length && !this.enemies.length
        && !this.saws.length && !this.lances.length) this.finishRound();
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

    /* lightning beams */
    for (const bm of this.beams) {
      const t = bm.life / bm.maxLife;
      ctx.save();
      ctx.globalAlpha = t;
      ctx.strokeStyle = bm.color;
      ctx.lineWidth = bm.width * t;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.shadowColor = bm.color; ctx.shadowBlur = 16;
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
