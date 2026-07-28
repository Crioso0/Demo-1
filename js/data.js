/* ------------------------------------------------------------------
   data.js — the map, the balloons, the towers, the heroes, the waves.
   All artwork is procedural canvas drawing so the demo ships as
   plain files with zero assets to load.
------------------------------------------------------------------- */

/* ---------------- map ---------------- */
const CANVAS_W = 1120;
const CANVAS_H = 640;
const TRACK_WIDTH = 46;

const PATH = buildPath([
  { x: -50, y: 132 },
  { x: 292, y: 132 },
  { x: 292, y: 330 },
  { x: 806, y: 330 },
  { x: 806, y: 148 },
  { x: 1042, y: 148 },
  { x: 1042, y: 520 },
  { x: 186, y: 520 },
  { x: 186, y: 700 },
]);

/* scenery blobs — generated once, drawn into the cached background */
const SCENERY = [
  { t: 'tree', x: 92, y: 300, s: 1.15 }, { t: 'tree', x: 148, y: 392, s: .9 },
  { t: 'tree', x: 60, y: 452, s: 1.0 }, { t: 'tree', x: 470, y: 96, s: 1.05 },
  { t: 'tree', x: 556, y: 60, s: .85 }, { t: 'tree', x: 640, y: 118, s: 1.1 },
  { t: 'tree', x: 940, y: 300, s: .95 }, { t: 'tree', x: 930, y: 396, s: 1.12 },
  { t: 'tree', x: 706, y: 596, s: 1.0 }, { t: 'tree', x: 800, y: 590, s: .88 },
  { t: 'rock', x: 400, y: 232, s: 1.0 }, { t: 'rock', x: 620, y: 456, s: 1.2 },
  { t: 'rock', x: 1002, y: 604, s: .9 }, { t: 'rock', x: 240, y: 60, s: .8 },
  { t: 'bush', x: 350, y: 430, s: 1 }, { t: 'bush', x: 520, y: 470, s: 1.2 },
  { t: 'bush', x: 880, y: 76, s: 1 }, { t: 'bush', x: 120, y: 600, s: 1.1 },
  { t: 'bush', x: 980, y: 452, s: .9 }, { t: 'bush', x: 690, y: 232, s: 1.05 },
];

/* ---------------- balloons ---------------- */
const BLOONS = [
  { name: 'Red',    color: '#e2402f', speed: 62,  r: 13, reward: 1 },
  { name: 'Blue',   color: '#3f7bff', speed: 80,  r: 14, reward: 1 },
  { name: 'Green',  color: '#2fbf6a', speed: 98,  r: 15, reward: 1 },
  { name: 'Yellow', color: '#ffd53f', speed: 142, r: 16, reward: 2 },
  { name: 'Pink',   color: '#ff77c8', speed: 178, r: 17, reward: 2 },
];
const MOAB = {
  name: 'M.O.A.B.', color: '#2b6fd6', speed: 46, r: 34, hp: 120, reward: 40, leak: 15,
};

/* ---------------- waves ---------------- */
/* group = { tier: 0-4 | 'moab', count, gap (s), delay (s) } */
const WAVES = [
  [{ tier: 0, count: 12, gap: .60, delay: 0 }],
  [{ tier: 0, count: 22, gap: .42, delay: 0 }],
  [{ tier: 0, count: 10, gap: .45, delay: 0 }, { tier: 1, count: 8, gap: .5, delay: 5.5 }],
  [{ tier: 1, count: 18, gap: .38, delay: 0 }],
  [{ tier: 1, count: 12, gap: .35, delay: 0 }, { tier: 2, count: 8, gap: .5, delay: 5 }],
  [{ tier: 2, count: 20, gap: .34, delay: 0 }],
  [{ tier: 2, count: 14, gap: .3, delay: 0 }, { tier: 3, count: 8, gap: .55, delay: 5 }],
  [{ tier: 2, count: 24, gap: .24, delay: 0 }, { tier: 3, count: 12, gap: .42, delay: 7 }],
  [{ tier: 3, count: 18, gap: .3, delay: 0 }, { tier: 1, count: 20, gap: .22, delay: 2 }],
  [{ tier: 'moab', count: 1, gap: 1, delay: 0 }, { tier: 2, count: 14, gap: .35, delay: 3 }],
  [{ tier: 3, count: 26, gap: .24, delay: 0 }, { tier: 4, count: 6, gap: .6, delay: 6 }],
  [{ tier: 4, count: 16, gap: .34, delay: 0 }, { tier: 3, count: 18, gap: .26, delay: 2 }],
  [{ tier: 4, count: 26, gap: .26, delay: 0 }],
  [{ tier: 'moab', count: 2, gap: 4, delay: 0 }, { tier: 3, count: 24, gap: .24, delay: 4 }],
  [{ tier: 'moab', count: 3, gap: 3.2, delay: 0 }, { tier: 4, count: 30, gap: .22, delay: 5 },
   { tier: 3, count: 20, gap: .2, delay: 14 }],
];

/* ---------------- procedural art ---------------- */
/* every unit draws itself around (0,0) facing +X; the game rotates. */
const Art = {
  /* --- shared bits --- */
  base(ctx, c1, c2, r = 17) {
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    ctx.beginPath(); ctx.ellipse(0, r * .55, r * 1.05, r * .62, 0, 0, TAU); ctx.fill();
    const g = ctx.createLinearGradient(0, -r, 0, r);
    g.addColorStop(0, c1); g.addColorStop(1, c2);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.22)';
    ctx.beginPath(); ctx.ellipse(-r * .3, -r * .38, r * .42, r * .26, -.5, 0, TAU); ctx.fill();
  },

  /* --- towers --- */
  sentry(ctx, lvl, t) {
    Art.base(ctx, '#7f8db5', '#3b4670');
    /* barrel */
    ctx.fillStyle = '#232a46';
    roundRect(ctx, 0, -6.5, 27, 13, 5); ctx.fill();
    ctx.fillStyle = '#39436c';
    roundRect(ctx, 4, -4.5, 14, 4, 2); ctx.fill();
    /* muzzle + loaded dart */
    ctx.fillStyle = '#c9d4f5';
    roundRect(ctx, 22, -5.5, 7, 11, 3); ctx.fill();
    ctx.fillStyle = lvl > 1 ? '#ffd977' : '#eef3ff';
    ctx.beginPath(); ctx.moveTo(36, 0); ctx.lineTo(28, 3.4); ctx.lineTo(28, -3.4); ctx.closePath(); ctx.fill();
    /* hub */
    ctx.fillStyle = lvl > 1 ? '#ffcf5c' : '#8fa3d8';
    ctx.beginPath(); ctx.arc(-3, 0, 6.5, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath(); ctx.arc(-3, 0, 2.4, 0, TAU); ctx.fill();
    if (lvl > 2) { ctx.fillStyle = '#ffcf5c'; starPath(ctx, -3, -15, 5, 5, 2.2); ctx.fill(); }
  },
  tack(ctx, lvl, t) {
    Art.base(ctx, '#d79a54', '#7c4a1c');
    ctx.save(); ctx.rotate(t * 1.6);
    ctx.fillStyle = '#e8eefc';
    for (let i = 0; i < 8; i++) {
      ctx.rotate(TAU / 8);
      ctx.beginPath(); ctx.moveTo(9, -2.6); ctx.lineTo(21, 0); ctx.lineTo(9, 2.6); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = lvl > 1 ? '#ffcf5c' : '#5c3a15';
    ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.fill();
  },
  frost(ctx, lvl, t) {
    Art.base(ctx, '#9fe4ff', '#3b7fb5');
    ctx.save(); ctx.rotate(t * .7);
    ctx.strokeStyle = '#eaffff'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      ctx.rotate(TAU / 6);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -15);
      ctx.moveTo(0, -9); ctx.lineTo(4.5, -13); ctx.moveTo(0, -9); ctx.lineTo(-4.5, -13);
      ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = lvl > 1 ? '#ffffff' : '#d8f6ff';
    ctx.beginPath(); ctx.arc(0, 0, 5.5 + Math.sin(t * 3) * .6, 0, TAU); ctx.fill();
  },
  bomb(ctx, lvl, t) {
    Art.base(ctx, '#6d7590', '#33384f');
    ctx.fillStyle = '#1d2133';
    ctx.save(); ctx.rotate(-.35);
    roundRect(ctx, -2, -8, 26, 16, 7); ctx.fill();
    ctx.fillStyle = '#454d6b'; roundRect(ctx, 16, -6, 8, 12, 4); ctx.fill();
    ctx.restore();
    ctx.fillStyle = lvl > 1 ? '#ffcf5c' : '#8a92ad';
    ctx.beginPath(); ctx.arc(-4, 2, 6, 0, TAU); ctx.fill();
  },

  /* --- heroes --- */
  ember(ctx, lvl, t) {
    const bob = Math.sin(t * 2.4) * 1.2;
    ctx.save(); ctx.translate(0, bob);

    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath(); ctx.ellipse(0, 13, 14, 5.5, 0, 0, TAU); ctx.fill();

    /* cloak */
    const g = ctx.createLinearGradient(0, -14, 0, 14);
    g.addColorStop(0, '#ff9a4d'); g.addColorStop(1, '#932a17');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -12); ctx.quadraticCurveTo(13, -4, 10, 13);
    ctx.lineTo(-10, 13); ctx.quadraticCurveTo(-13, -4, 0, -12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1.4; ctx.stroke();

    /* face inside a hood */
    ctx.fillStyle = '#ffd9b0';
    ctx.beginPath(); ctx.ellipse(1, -14, 5.4, 5.8, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2a1710';
    ctx.beginPath(); ctx.arc(3, -15, 1.3, 0, TAU); ctx.fill();
    ctx.fillStyle = '#c8452a';
    ctx.beginPath();
    ctx.arc(0, -15, 8, Math.PI * .78, Math.PI * 2.16);
    ctx.quadraticCurveTo(-2, -8, -7, -9);
    ctx.fill();

    /* single flame plume — brighter core inside a soft outer tongue */
    const f = Math.sin(t * 7) * 1.6, f2 = Math.cos(t * 5.5) * 1.2;
    ctx.fillStyle = '#ff6a1e';
    ctx.beginPath();
    ctx.moveTo(-5, -20);
    ctx.quadraticCurveTo(-7 + f2, -27, -1 + f, -34);
    ctx.quadraticCurveTo(4 + f2, -27, 5, -20);
    ctx.quadraticCurveTo(0, -17.5, -5, -20);
    ctx.fill();
    ctx.fillStyle = '#ffd15c';
    ctx.beginPath();
    ctx.moveTo(-2.6, -20.5);
    ctx.quadraticCurveTo(-3.4 + f2 * .6, -25, -.4 + f * .7, -29.5);
    ctx.quadraticCurveTo(2.4, -25, 2.6, -20.5);
    ctx.quadraticCurveTo(0, -19, -2.6, -20.5);
    ctx.fill();

    /* bow, held out front */
    ctx.strokeStyle = lvl > 1 ? '#ffd977' : '#d9a066'; ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(11, -1, 11, -1.25, 1.25); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(14.5, -11.4); ctx.lineTo(14.5, 9.4); ctx.stroke();
    /* nocked arrow glows while idle */
    ctx.strokeStyle = 'rgba(255,190,90,.9)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(8, -1); ctx.lineTo(19, -1); ctx.stroke();
    ctx.restore();
  },
  volt(ctx, lvl, t) {
    const bob = Math.sin(t * 2.1 + 1) * 1.4;
    ctx.save(); ctx.translate(0, bob);
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath(); ctx.ellipse(0, 12, 15, 6, 0, 0, TAU); ctx.fill();
    const g = ctx.createLinearGradient(0, -16, 0, 14);
    g.addColorStop(0, '#7ee6ff'); g.addColorStop(1, '#2b46a8');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -13); ctx.quadraticCurveTo(13, -4, 10, 13);
    ctx.lineTo(-10, 13); ctx.quadraticCurveTo(-13, -4, 0, -13); ctx.fill();
    ctx.fillStyle = '#e9f3ff';
    ctx.beginPath(); ctx.arc(0, -15, 7, 0, TAU); ctx.fill();
    /* visor */
    ctx.fillStyle = '#0d2a55';
    roundRect(ctx, -6, -17, 12, 5, 2.5); ctx.fill();
    /* orb */
    const pulse = .8 + Math.sin(t * 5) * .2;
    ctx.fillStyle = 'rgba(140,225,255,.35)';
    ctx.beginPath(); ctx.arc(13, 0, 9 * pulse, 0, TAU); ctx.fill();
    ctx.fillStyle = lvl > 1 ? '#fff' : '#bff0ff';
    ctx.beginPath(); ctx.arc(13, 0, 4.5 * pulse, 0, TAU); ctx.fill();
    /* sparks */
    ctx.strokeStyle = 'rgba(190,240,255,.9)'; ctx.lineWidth = 1.4;
    for (let i = 0; i < 3; i++) {
      const a = t * 4 + (i * TAU) / 3;
      ctx.beginPath();
      ctx.moveTo(13 + Math.cos(a) * 7, Math.sin(a) * 7);
      ctx.lineTo(13 + Math.cos(a) * 11, Math.sin(a) * 11);
      ctx.stroke();
    }
    ctx.restore();
  },
  terra(ctx, lvl, t) {
    const bob = Math.sin(t * 1.6) * 1;
    ctx.save(); ctx.translate(0, bob);
    ctx.fillStyle = 'rgba(0,0,0,.32)';
    ctx.beginPath(); ctx.ellipse(0, 13, 17, 6.5, 0, 0, TAU); ctx.fill();
    const g = ctx.createLinearGradient(0, -16, 0, 15);
    g.addColorStop(0, '#a3b58f'); g.addColorStop(1, '#4a5340');
    ctx.fillStyle = g;
    roundRect(ctx, -12, -12, 24, 26, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 2; ctx.stroke();
    /* mossy shoulders */
    ctx.fillStyle = '#6fbf5a';
    ctx.beginPath(); ctx.ellipse(-9, -9, 6, 4, -.4, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(9, -10, 5, 3.4, .4, 0, TAU); ctx.fill();
    /* head */
    ctx.fillStyle = '#8c9b7a';
    roundRect(ctx, -7, -22, 14, 12, 5); ctx.fill();
    ctx.fillStyle = lvl > 1 ? '#ffd977' : '#d9ffb0';
    ctx.beginPath(); ctx.arc(-3, -16, 1.9, 0, TAU); ctx.arc(3, -16, 1.9, 0, TAU); ctx.fill();
    /* hammer */
    ctx.save(); ctx.translate(14, 2); ctx.rotate(Math.sin(t * 1.6) * .12 - .3);
    ctx.fillStyle = '#5a4630'; roundRect(ctx, -1.6, -4, 3.2, 16, 1.5); ctx.fill();
    ctx.fillStyle = '#7e8a95'; roundRect(ctx, -7, -12, 14, 9, 3); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.restore();
    ctx.restore();
  },
};

/* ---------------- towers ---------------- */
const TOWERS = [
  {
    id: 'sentry', name: 'Dart Sentry', cost: 200, art: Art.sentry, rotates: true,
    range: 132, cooldown: .58, damage: 1, pierce: 2, projSpeed: 560, kind: 'dart',
    color: '#8fa3d8', desc: 'Reliable single-target darts.',
  },
  {
    id: 'tack', name: 'Tack Ring', cost: 320, art: Art.tack,
    range: 96, cooldown: 1.05, damage: 1, pierce: 1, projSpeed: 330, kind: 'burst', shots: 8,
    color: '#d79a54', desc: 'Fires eight tacks in a ring. Great on corners.',
  },
  {
    id: 'frost', name: 'Frost Totem', cost: 380, art: Art.frost,
    range: 112, cooldown: 1.7, damage: 1, kind: 'frost', slow: .45, slowTime: 2.2,
    color: '#9fe4ff', desc: 'Chilling pulse slows every balloon in range.',
  },
  {
    id: 'bomb', name: 'Bomb Lobber', cost: 480, art: Art.bomb, rotates: true,
    range: 158, cooldown: 1.5, damage: 2, projSpeed: 300, kind: 'bomb', blast: 54,
    color: '#8a92ad', desc: 'Lobs explosives that damage a whole cluster.',
  },
];

/* ---------------- heroes ---------------- */
const HEROES = [
  {
    id: 'ember', name: 'Ember', role: 'Flame Archer', art: Art.ember,
    rarity: 'Starter', rarityColor: '#ff9a4d', glow: 'rgba(255,140,60,.45)',
    starter: true,
    range: 158, cooldown: .36, damage: 1, pierce: 1, projSpeed: 620, kind: 'dart',
    burn: { dps: 1, time: 2.4 }, color: '#ff8a3d',
    desc: 'Rapid flaming arrows that set balloons alight for extra damage over time.',
  },
  {
    id: 'volt', name: 'Volt', role: 'Storm Caller', art: Art.volt,
    rarity: 'Rare', rarityColor: '#62d9ff', glow: 'rgba(90,200,255,.45)',
    range: 168, cooldown: 1.1, damage: 2, kind: 'chain', chains: 4, color: '#62d9ff',
    desc: 'Calls down forked lightning that arcs between up to four balloons at once.',
  },
  {
    id: 'terra', name: 'Terra', role: 'Stone Warden', art: Art.terra,
    rarity: 'Epic', rarityColor: '#a97bff', glow: 'rgba(160,120,255,.45)',
    range: 118, cooldown: 1.8, damage: 3, kind: 'slam', knockback: 46,
    slow: .35, slowTime: 1.4, color: '#9bbf78',
    desc: 'Shatters the ground, damaging every nearby balloon and shoving them backwards.',
  },
];

const HERO_BY_ID = Object.fromEntries(HEROES.map((h) => [h.id, h]));
const TOWER_BY_ID = Object.fromEntries(TOWERS.map((t) => [t.id, t]));
const UNIT_BY_ID = { ...TOWER_BY_ID, ...HERO_BY_ID };

/* upgrade curve — shared by towers and heroes */
const MAX_LEVEL = 3;
function upgradeCost(def, level) {
  const base = def.cost || 300; // heroes are free to place, priced off 300
  return Math.round(base * (level === 1 ? .85 : 1.6));
}
function levelMods(level) {
  return {
    range: 1 + (level - 1) * .14,
    rate: 1 - (level - 1) * .22,      // cooldown multiplier
    damage: level === 3 ? 1 : 0,      // flat bonus at level 3
    pierce: level - 1,
  };
}
