/* ------------------------------------------------------------------
   game.js — simulation + rendering for the tower-defense stage
------------------------------------------------------------------- */

/* =============================== BALLOON =============================== */
class Bloon {
  constructor(tier) {
    this.tier = tier;                 // 0..4 or 'moab'
    this.moab = tier === 'moab';
    this.d = 0;                       // distance travelled along the track
    this.x = 0; this.y = 0; this.ang = 0;
    this.seed = rand(0, TAU);
    this.dead = false;
    this.slowT = 0; this.slowF = 1;
    this.burnT = 0; this.burnTick = 0;
    this.hitFlash = 0;
    this.spawnAnim = 0;
    this.hp = this.moab ? MOAB.hp : 1;
    this.maxHp = this.hp;
    this.r = this.moab ? MOAB.r : BLOONS[tier].r;
  }

  get info() { return this.moab ? MOAB : BLOONS[this.tier]; }
  get color() { return this.info.color; }

  update(dt, game) {
    this.spawnAnim = Math.min(1, this.spawnAnim + dt * 4);
    if (this.slowT > 0) { this.slowT -= dt; if (this.slowT <= 0) this.slowF = 1; }
    if (this.hitFlash > 0) this.hitFlash -= dt * 4;

    if (this.burnT > 0) {
      this.burnT -= dt;
      this.burnTick -= dt;
      if (this.burnTick <= 0) {
        this.burnTick = .55;
        game.damage(this, 1, { silent: true });
        if (this.dead) return;
      }
      if (Math.random() < dt * 24) {
        game.particles.push(new Particle(this.x + rand(-6, 6), this.y + rand(-8, 4), {
          vx: rand(-14, 14), vy: rand(-46, -22), life: .5, size: rand(2, 4.5),
          color: pick(['#ffd166', '#ff8a3d', '#ff5f2e']), kind: 'spark',
        }));
      }
    }

    this.d += this.info.speed * this.slowF * dt;
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

    /* soft ground shadow keeps the balloons sitting on the map */
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    ctx.beginPath();
    ctx.ellipse(4, this.r * .9 + 8, this.r * .8, this.r * .32, 0, 0, TAU);
    ctx.fill();

    if (this.moab) this.drawMoab(ctx, time, grow);
    else this.drawBalloon(ctx, time, grow);

    ctx.restore();
  }

  drawBalloon(ctx, time, grow) {
    const wob = Math.sin(time * 5 + this.seed) * .09;
    const squash = 1 + Math.sin(time * 7 + this.seed) * .035;
    ctx.rotate(wob);
    ctx.scale(grow / squash, grow * squash);

    const r = this.r;
    const c = this.color;

    /* knot */
    ctx.fillStyle = shade(c, -.18);
    ctx.beginPath();
    ctx.moveTo(-4, r * .82); ctx.lineTo(4, r * .82); ctx.lineTo(0, r * 1.12);
    ctx.closePath(); ctx.fill();

    /* body */
    const g = ctx.createRadialGradient(-r * .35, -r * .45, r * .1, 0, 0, r * 1.25);
    g.addColorStop(0, shade(c, .32));
    g.addColorStop(.55, c);
    g.addColorStop(1, shade(c, -.22));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * .92, r, 0, 0, TAU);
    ctx.fill();

    /* rim light + specular */
    ctx.strokeStyle = rgba('#ffffff', .22); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.ellipse(0, 0, r * .92, r, 0, 0, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.beginPath(); ctx.ellipse(-r * .32, -r * .38, r * .2, r * .32, -.5, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.25)';
    ctx.beginPath(); ctx.ellipse(r * .3, r * .2, r * .13, r * .2, .4, 0, TAU); ctx.fill();

    if (this.slowT > 0) {
      ctx.fillStyle = 'rgba(160,230,255,.32)';
      ctx.beginPath(); ctx.ellipse(0, 0, r * .95, r * 1.03, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(230,250,255,.75)'; ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        const a = this.seed + i * 2.1;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r * .3, Math.sin(a) * r * .3);
        ctx.lineTo(Math.cos(a) * r * .8, Math.sin(a) * r * .8);
        ctx.stroke();
      }
    }
    if (this.burnT > 0) {
      ctx.fillStyle = `rgba(255,150,60,${.25 + Math.sin(time * 14 + this.seed) * .1})`;
      ctx.beginPath(); ctx.ellipse(0, 0, r * 1.1, r * 1.2, 0, 0, TAU); ctx.fill();
    }
  }

  drawMoab(ctx, time, grow) {
    ctx.scale(grow, grow);
    const bob = Math.sin(time * 2 + this.seed) * 2;
    ctx.translate(0, bob);
    ctx.rotate(this.ang * .12);

    const w = 78, h = 44;
    /* fins */
    ctx.fillStyle = '#16407e';
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 4, -6); ctx.lineTo(-w / 2 - 12, -24); ctx.lineTo(-w / 2 - 6, -2); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 4, 6); ctx.lineTo(-w / 2 - 12, 24); ctx.lineTo(-w / 2 - 6, 2); ctx.closePath(); ctx.fill();

    /* hull */
    const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    g.addColorStop(0, '#5ea2ff'); g.addColorStop(.45, MOAB.color); g.addColorStop(1, '#12356e');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 2.5; ctx.stroke();

    /* panelling + shine */
    ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = 1.6;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.ellipse(i * 18, 0, 6, h / 2 - 3, 0, -1.2, 1.2); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,.4)';
    ctx.beginPath(); ctx.ellipse(-8, -12, 20, 5, -.12, 0, TAU); ctx.fill();

    /* nose light */
    const pulse = .6 + Math.sin(time * 6) * .4;
    ctx.fillStyle = `rgba(255,120,120,${pulse})`;
    ctx.beginPath(); ctx.arc(w / 2 - 5, 0, 5, 0, TAU); ctx.fill();

    /* health bar */
    const p = clamp(this.hp / this.maxHp, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    roundRect(ctx, -34, -h / 2 - 15, 68, 8, 4); ctx.fill();
    const hg = ctx.createLinearGradient(-34, 0, 34, 0);
    hg.addColorStop(0, '#ff5a6e'); hg.addColorStop(1, '#ffd166');
    ctx.fillStyle = hg;
    roundRect(ctx, -32.5, -h / 2 - 13.5, 65 * p, 5, 2.5); ctx.fill();

    if (this.hitFlash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${clamp(this.hitFlash, 0, .8)})`;
      ctx.beginPath(); ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, TAU); ctx.fill();
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
    /* activated-ability state (only Verdant has one so far) */
    this.charges = this.maxCharges;
    this.ultAnim = 0;
  }

  get mods() { return levelMods(this.level); }
  get maxCharges() { return this.def.ability ? this.def.ability.charges[this.level - 1] : 0; }
  get ultReady() { return !!this.def.ability && this.charges > 0; }
  get range() { return this.def.range * this.mods.range; }
  get rate() { return this.def.cooldown * this.mods.rate; }
  get damage() { return this.def.damage + this.mods.damage; }
  get pierce() { return (this.def.pierce || 1) + this.mods.pierce; }

  update(dt, game) {
    this.placeAnim = Math.min(1, this.placeAnim + dt * 3.2);
    if (this.ultAnim > 0) this.ultAnim = Math.max(0, this.ultAnim - dt);
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
        if (game.anyInRange(this.x, this.y, this.range)) { this.fire(game, null); this.cd = this.rate; }
      } else if (target) {
        this.fire(game, target); this.cd = this.rate;
      }
    }
  }

  fire(game, target) {
    const d = this.def;
    this.recoil = 5;

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
        Sfx.shoot();
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
        for (const b of game.bloons) {
          if (b.dead || distSq(b.x, b.y, this.x, this.y) > this.range * this.range) continue;
          b.chill(d.slow, d.slowTime);
          game.damage(b, this.damage, { source: this, x: b.x, y: b.y });
        }
        Sfx.tone({ freq: 900, to: 1500, dur: .18, type: 'sine', gain: .03 });
        break;
      }
      case 'chain': {
        const hits = [];
        let from = { x: this.x, y: this.y };
        let pool = game.bloons.filter((b) => !b.dead && distSq(b.x, b.y, this.x, this.y) <= this.range * this.range);
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
        for (const b of game.bloons) {
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
          life: .15, maxLife: .15, color: '#5cff9e', width: 3, straight: true,
        });
        game.damage(target, this.damage, { source: this, x: target.x, y: target.y });
        game.spark(target.x, target.y, '#9dffc6', 5);
        Sfx.tone({ freq: 1150, to: 720, dur: .09, type: 'sine', gain: .022 });
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

    for (const b of game.bloons) {
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
    /* brief per-balloon cooldown so a blimp is chewed, not one-shot */
    this.hitAt = new Map();
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

    for (const b of game.bloons) {
      if (b.dead) continue;
      const rr = this.r + b.r;
      if (distSq(b.x, b.y, this.x, this.y) > rr * rr) continue;
      if ((this.hitAt.get(b) || 0) > this.age) continue;
      this.hitAt.set(b, this.age + .12);
      game.damage(b, this.damage, { source: this, x: b.x, y: b.y, silent: true });
      game.spark(b.x, b.y, '#9dffc6', 6);
    }

    if (this.d >= PATH.length) {
      this.dead = true;
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
    this.reset();
    this.bakeBackground();
  }

  reset() {
    this.time = 0;
    this.lives = 100;
    this.cash = 650;
    this.round = 0;
    this.runGems = 0;
    this.speed = 1;
    this.running = false;      // a round is in progress
    this.over = false;
    this.paused = false;

    this.bloons = [];
    this.towers = [];
    this.projectiles = [];
    this.saws = [];
    this.particles = [];
    this.rings = [];
    this.beams = [];
    this.texts = [];
    this.queue = [];
    this.roundTime = 0;
    this.shake = 0;

    this.placing = null;       // { def, isHero }
    this.selected = null;
    this.pointer = { x: -999, y: -999, valid: false, inside: false };
    this.heroesPlaced = new Set();
  }

  /* ---------------- background baking ---------------- */
  bakeBackground() {
    const c = document.createElement('canvas');
    c.width = CANVAS_W; c.height = CANVAS_H;
    const g = c.getContext('2d');

    /* grass */
    const grass = g.createLinearGradient(0, 0, 0, CANVAS_H);
    grass.addColorStop(0, '#3f7a41');
    grass.addColorStop(.5, '#357038');
    grass.addColorStop(1, '#2b5c30');
    g.fillStyle = grass;
    g.fillRect(0, 0, CANVAS_W, CANVAS_H);

    /* patchy tone variation */
    for (let i = 0; i < 90; i++) {
      const x = rand(0, CANVAS_W), y = rand(0, CANVAS_H), r = rand(40, 130);
      g.fillStyle = `rgba(${Math.random() < .5 ? '80,140,80' : '30,70,40'},.07)`;
      g.beginPath(); g.ellipse(x, y, r, r * .6, rand(0, TAU), 0, TAU); g.fill();
    }
    /* little grass tufts */
    g.lineWidth = 1.3; g.lineCap = 'round';
    for (let i = 0; i < 520; i++) {
      const x = rand(0, CANVAS_W), y = rand(0, CANVAS_H), h = rand(2, 3.6);
      g.strokeStyle = `rgba(${Math.random() < .5 ? '150,205,125' : '46,96,52'},.12)`;
      g.beginPath();
      g.moveTo(x - 3, y); g.quadraticCurveTo(x - 2, y - h, x - 4, y - h * 1.3);
      g.moveTo(x, y); g.quadraticCurveTo(x, y - h, x + 1, y - h * 1.4);
      g.moveTo(x + 3, y); g.quadraticCurveTo(x + 2, y - h, x + 4, y - h * 1.2);
      g.stroke();
    }

    /* --- track --- */
    const stroke = (w, style) => {
      g.strokeStyle = style; g.lineWidth = w;
      g.lineJoin = 'round'; g.lineCap = 'round';
      g.beginPath();
      PATH.points.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
      g.stroke();
    };
    stroke(TRACK_WIDTH + 16, 'rgba(0,0,0,.22)');          // soft drop shadow
    stroke(TRACK_WIDTH + 8, '#5b4a2e');                   // dirt border
    stroke(TRACK_WIDTH, '#8d7146');                       // dirt
    stroke(TRACK_WIDTH - 12, '#9b7f52');                  // lighter centre

    /* gravel speckles along the track */
    for (let d = 0; d < PATH.length; d += 7) {
      const p = PATH.at(d);
      const off = rand(-TRACK_WIDTH / 2 + 5, TRACK_WIDTH / 2 - 5);
      const nx = -Math.sin(p.ang) * off, ny = Math.cos(p.ang) * off;
      g.fillStyle = `rgba(${Math.random() < .5 ? '120,98,62' : '176,152,110'},.55)`;
      g.beginPath(); g.arc(p.x + nx, p.y + ny, rand(.8, 2.2), 0, TAU); g.fill();
    }

    /* entry portal + exit gate */
    const start = PATH.at(2), end = PATH.at(PATH.length - 40);
    g.save();
    g.translate(start.x + 8, start.y);
    g.fillStyle = 'rgba(10,10,20,.65)';
    g.beginPath(); g.ellipse(0, 0, 16, 30, 0, 0, TAU); g.fill();
    g.strokeStyle = '#6f5a38'; g.lineWidth = 6; g.stroke();
    g.restore();

    g.save();
    /* keep the exit marker inside the frame even though the track runs off it */
    g.translate(end.x, Math.min(end.y, CANVAS_H - 70));
    g.fillStyle = 'rgba(255,90,110,.14)';
    g.fillRect(-46, 0, 92, 80);
    g.strokeStyle = 'rgba(255,120,140,.55)'; g.lineWidth = 3;
    g.setLineDash([10, 8]);
    g.beginPath(); g.moveTo(-46, 0); g.lineTo(46, 0); g.stroke();
    g.setLineDash([]);
    g.fillStyle = 'rgba(255,190,200,.8)';
    g.font = 'bold 15px Trebuchet MS, sans-serif';
    g.textAlign = 'center';
    g.fillText('BASTION', 0, -10);
    g.restore();

    /* scenery */
    for (const s of SCENERY) {
      g.save(); g.translate(s.x, s.y); g.scale(s.s, s.s);
      if (s.t === 'tree') {
        g.fillStyle = 'rgba(0,0,0,.25)';
        g.beginPath(); g.ellipse(6, 24, 22, 8, 0, 0, TAU); g.fill();
        g.fillStyle = '#5b4326';
        g.fillRect(-5, 0, 10, 26);
        for (let i = 0; i < 3; i++) {
          g.fillStyle = ['#2f7a3c', '#3a8f47', '#46a552'][i];
          g.beginPath(); g.arc(0, -6 - i * 11, 24 - i * 5, 0, TAU); g.fill();
        }
        g.fillStyle = 'rgba(255,255,255,.12)';
        g.beginPath(); g.arc(-8, -26, 8, 0, TAU); g.fill();
      } else if (s.t === 'rock') {
        g.fillStyle = 'rgba(0,0,0,.25)';
        g.beginPath(); g.ellipse(4, 12, 20, 7, 0, 0, TAU); g.fill();
        const rg = g.createLinearGradient(0, -18, 0, 14);
        rg.addColorStop(0, '#9aa2b4'); rg.addColorStop(1, '#5b6274');
        g.fillStyle = rg;
        g.beginPath();
        g.moveTo(-18, 12); g.lineTo(-11, -12); g.lineTo(4, -18);
        g.lineTo(17, -4); g.lineTo(14, 12); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 2; g.stroke();
      } else {
        g.fillStyle = 'rgba(0,0,0,.2)';
        g.beginPath(); g.ellipse(3, 10, 18, 6, 0, 0, TAU); g.fill();
        for (let i = 0; i < 4; i++) {
          g.fillStyle = ['#2c6b34', '#357c3d', '#3f8f47', '#2c6b34'][i];
          g.beginPath(); g.arc(-12 + i * 8, rand(-2, 4), 10 - (i % 2) * 2, 0, TAU); g.fill();
        }
        g.fillStyle = '#ff6b8a';
        g.beginPath(); g.arc(-6, -4, 2.2, 0, TAU); g.arc(8, 0, 2.2, 0, TAU); g.fill();
      }
      g.restore();
    }

    /* vignette */
    const vig = g.createRadialGradient(CANVAS_W / 2, CANVAS_H / 2, CANVAS_H * .35,
      CANVAS_W / 2, CANVAS_H / 2, CANVAS_H * .95);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,.42)');
    g.fillStyle = vig;
    g.fillRect(0, 0, CANVAS_W, CANVAS_H);

    this.bg = c;
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
    if (!this.canPlaceAt(x, y) || this.cash < cost) {
      Sfx.tone({ freq: 200, to: 120, dur: .12, type: 'square', gain: .04 });
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
    if (this.cash < cost) { Sfx.tone({ freq: 200, to: 120, dur: .12, type: 'square', gain: .04 }); return; }
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
      && (this.running || this.bloons.length > 0));
  }

  activateUlt(t) {
    if (!t || !t.def.ability || this.over) return false;
    if (t.charges <= 0) {
      this.floatText(t.x, t.y - 40, 'No charges left', '#ff5a6e', 1, 14);
      Sfx.tone({ freq: 200, to: 120, dur: .12, type: 'square', gain: .04 });
      return false;
    }
    if (!this.running && !this.bloons.length) {
      this.floatText(t.x, t.y - 40, 'Start a round first', '#ffcf5c', 1, 14);
      Sfx.tone({ freq: 260, to: 180, dur: .12, type: 'square', gain: .035 });
      return false;
    }

    t.charges--;
    t.ultAnim = ULT_ANIM_TIME;
    this.saws.push(new Saw(t.level));
    this.rings.push({ x: t.x, y: t.y, r: 12, max: 150, life: .55, maxLife: .55, color: '#5cff9e', thick: 7 });
    for (let i = 0; i < 26; i++) {
      const a = rand(0, TAU);
      this.particles.push(new Particle(t.x, t.y, {
        vx: Math.cos(a) * rand(80, 260), vy: Math.sin(a) * rand(80, 260) - 40,
        life: rand(.4, .9), size: rand(2, 5), color: pick(['#5cff9e', '#bfffd8', '#1fbf6a']),
        kind: 'spark', gravity: 90,
      }));
    }
    this.floatText(t.x, t.y - 46, t.def.ability.name.toUpperCase() + '!', '#5cff9e', 1.5, 20);
    this.shake = Math.max(this.shake, 9);
    Sfx.saw();
    this.onEvent('shop');
    return true;
  }

  /* ---------------- rounds ---------------- */
  startRound() {
    if (this.running || this.over) return;
    if (this.round >= WAVES.length) return;
    this.round++;
    this.running = true;
    this.roundTime = 0;
    /* ability charges are per round, so every round starts fully loaded */
    for (const t of this.towers) if (t.def.ability) t.charges = t.maxCharges;
    this.queue = [];
    for (const grp of WAVES[this.round - 1]) {
      for (let i = 0; i < grp.count; i++) {
        this.queue.push({ tier: grp.tier, t: grp.delay + i * grp.gap });
      }
    }
    this.queue.sort((a, b) => a.t - b.t);
    this.onEvent('round-start', this.round);
  }

  finishRound() {
    this.running = false;
    const bonus = 95 + this.round * 14;
    this.cash += bonus;
    const gems = this.round === WAVES.length ? 75 : 12;
    this.runGems += gems;
    Save.addGems(gems);
    Save.recordRound(this.round);
    this.floatText(CANVAS_W / 2, 90, `Round ${this.round} cleared  +$${bonus}`, '#4ade80', 2.2, 22);
    Sfx.coin();
    if (this.round >= WAVES.length) this.end(true);
    else this.onEvent('round-end', this.round);
  }

  end(win) {
    if (this.over) return;
    this.over = true;
    this.running = false;
    if (win) Sfx.fanfare(); else Sfx.defeat();
    this.onEvent(win ? 'victory' : 'defeat', this.runGems);
  }

  leak(b) {
    b.dead = true;
    const dmg = b.moab ? MOAB.leak : b.tier + 1;
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
    for (const b of this.bloons) {
      if (b.dead) continue;
      if (distSq(b.x, b.y, x, y) > r2) continue;
      if (b.d > bestD) { bestD = b.d; best = b; }
    }
    return best;
  }

  anyInRange(x, y, r) {
    const r2 = r * r;
    for (const b of this.bloons) if (!b.dead && distSq(b.x, b.y, x, y) <= r2) return true;
    return false;
  }

  damage(b, amount, opts = {}) {
    if (b.dead) return;
    if (b.moab) {
      b.hp -= amount;
      b.hitFlash = .6;
      this.spark(b.x, b.y, '#cfe4ff', 3);
      if (b.hp <= 0) {
        b.dead = true;
        this.cash += MOAB.reward;
        this.explodeFx(b.x, b.y, 70, '#5ea2ff');
        this.floatText(b.x, b.y - 40, `+$${MOAB.reward}`, '#ffcf5c', 1.2, 18);
        this.shake = Math.max(this.shake, 10);
        Sfx.boom();
        /* blimps break into a pack of yellows */
        for (let i = 0; i < 4; i++) {
          const child = new Bloon(3);
          child.d = Math.max(0, b.d - 14 - i * 12);
          child.spawnAnim = .4;
          this.bloons.push(child);
        }
      }
      return;
    }

    while (amount > 0 && !b.dead) {
      const info = BLOONS[b.tier];
      this.cash += info.reward;
      this.popFx(b.x, b.y, info.color);
      if (!opts.silent) Sfx.pop(b.tier);
      amount--;
      b.tier--;
      if (b.tier < 0) { b.dead = true; }
      else { b.r = BLOONS[b.tier].r; b.hitFlash = .4; }
    }
  }

  explode(x, y, radius, damage, owner) {
    this.explodeFx(x, y, radius, '#ffb15c');
    this.shake = Math.max(this.shake, 5);
    Sfx.boom();
    for (const b of this.bloons) {
      if (b.dead) continue;
      if (distSq(b.x, b.y, x, y) <= radius * radius) this.damage(b, damage, { source: owner, silent: true });
    }
  }

  /* ---------------- fx ---------------- */
  popFx(x, y, color) {
    for (let i = 0; i < 7; i++) {
      const a = rand(0, TAU);
      this.particles.push(new Particle(x, y, {
        vx: Math.cos(a) * rand(40, 190), vy: Math.sin(a) * rand(40, 190) - 40,
        life: rand(.35, .7), size: rand(2.5, 5), color, kind: 'shard', gravity: 420,
      }));
    }
    this.rings.push({ x, y, r: 4, max: 26, life: .22, maxLife: .22, color, thick: 2.5 });
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
      return;
    }

    /* spawn queue */
    if (this.running) {
      this.roundTime += dt;
      while (this.queue.length && this.queue[0].t <= this.roundTime) {
        const e = this.queue.shift();
        this.bloons.push(new Bloon(e.tier));
      }
    }

    for (const b of this.bloons) if (!b.dead) b.update(dt, this);
    for (const t of this.towers) t.update(dt, this);
    for (const p of this.projectiles) if (!p.dead) p.update(dt, this);
    for (const sw of this.saws) if (!sw.dead) sw.update(dt, this);

    for (const p of this.particles) p.update(dt);
    for (const r of this.rings) { r.life -= dt; r.r = lerp(r.r, r.max, dt * 9); }
    for (const b of this.beams) b.life -= dt;
    for (const t of this.texts) { t.life -= dt; t.y -= dt * 26; }

    this.bloons = this.bloons.filter((b) => !b.dead);
    this.projectiles = this.projectiles.filter((p) => !p.dead);
    this.saws = this.saws.filter((sw) => !sw.dead);
    this.particles = this.particles.filter((p) => p.life > 0);
    this.rings = this.rings.filter((r) => r.life > 0);
    this.beams = this.beams.filter((b) => b.life > 0);
    this.texts = this.texts.filter((t) => t.life > 0);

    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 26);

    if (this.running && !this.over && !this.queue.length && !this.bloons.length && !this.saws.length) this.finishRound();
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

    /* towers behind balloons when higher on screen — cheap depth sort */
    const drawables = [...this.towers].sort((a, b) => a.y - b.y);
    for (const t of drawables) t.draw(ctx, this.time, this.selected === t);

    for (const b of this.bloons) b.draw(ctx, this.time);
    for (const p of this.projectiles) p.draw(ctx);
    for (const sw of this.saws) sw.draw(ctx, this.time);

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
