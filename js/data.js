/* ------------------------------------------------------------------
   data.js — maps, the Void Legion, the campaign, towers and heroes.
   All artwork is procedural canvas drawing so the demo ships as
   plain files with zero assets to load.
------------------------------------------------------------------- */

/* ---------------- stage ---------------- */
const CANVAS_W = 1120;
const CANVAS_H = 640;
const TRACK_WIDTH = 46;

/* how many heroes may be deployed in a single run */
const HERO_SLOTS = 2;

/* ---------------- chapters ----------------
   Six cities, five missions each. Every mission gets its own procedurally
   generated route, so all thirty maps are distinct but a city still reads as
   one place. Clearing a mission opens the next; taking all three stars on
   every mission in a city is what opens the next city. */
const CHAPTERS = [
  {
    id: 'solaris', name: 'Solaris City', tag: 'The shining city',
    blurb: 'Deco towers and open plazas. The legion tests the brightest city on the map first.',
    accent: '#4fa8ff', decor: 'city',
    theme: {
      ground: ['#3f5a86', '#33496e', '#26375a'],
      tuftLight: '150,200,255', tuftDark: '30,48,84',
      trackEdge: '#1e2b47', track: '#6a7fa8', trackMid: '#7d92bd',
      grit: ['70,95,140', '190,215,255'],
    },
    boss: {
      id: 'magnate', name: 'The Magnate', color: '#7fd4ff',
      hp: 260, speed: 40, reward: 120,
      power: { kind: 'summon', interval: 6, count: 3 },
      line: 'Deploys a drone screen — kill the escorts or drown in them.',
    },
  },
  {
    id: 'grimhaven', name: 'Grimhaven', tag: 'The rain city',
    blurb: 'Gargoyles, gas lamps and permanent drizzle. Something in the dark is laughing.',
    accent: '#a97bff', decor: 'gothic',
    theme: {
      ground: ['#2b2c3d', '#232433', '#191a26'],
      tuftLight: '130,140,190', tuftDark: '18,18,28',
      trackEdge: '#12131c', track: '#3d4055', trackMid: '#4b4f67',
      grit: ['70,72,100', '150,155,195'],
    },
    boss: {
      id: 'grin', name: 'Mister Grin', color: '#b06cf0',
      hp: 320, speed: 52, reward: 150,
      power: { kind: 'gas', interval: 5.5, radius: 210, duration: 3 },
      line: 'Laughing gas: whichever hero is closest simply stops working.',
    },
  },
  {
    id: 'tempest', name: 'Tempest Bay', tag: 'The storm coast',
    blurb: 'A drowned harbour under permanent thunderheads. The water is not the problem.',
    accent: '#38d9c0', decor: 'coast',
    theme: {
      ground: ['#1f5a63', '#18464f', '#11333a'],
      tuftLight: '140,240,230', tuftDark: '10,50,58',
      trackEdge: '#0d2b31', track: '#4d7d84', trackMid: '#5d9199',
      grit: ['40,90,98', '170,225,230'],
    },
    boss: {
      id: 'maelstrom', name: 'Maelstrom', color: '#5bc8ff',
      hp: 420, speed: 48, reward: 180,
      power: { kind: 'emp', interval: 7, radius: 240, duration: 2.4 },
      line: 'Surge pulse: every tower in reach goes dark for a few seconds.',
    },
  },
  {
    id: 'ashfall', name: 'Ashfall Reach', tag: 'The burning flats',
    blurb: 'Cinder plains where the ground itself is still cooling. Fire is useless here.',
    accent: '#ff7a3d', decor: 'volcanic',
    theme: {
      ground: ['#4a3634', '#3a2926', '#2a1d1b'],
      tuftLight: '196,104,58', tuftDark: '60,38,32',
      trackEdge: '#2a1c18', track: '#5d4038', trackMid: '#6d4c41',
      grit: ['96,60,48', '190,110,70'],
    },
    boss: {
      id: 'cinderlord', name: 'The Cinderlord', color: '#ff9a3d',
      hp: 520, speed: 44, reward: 210,
      power: { kind: 'regen', interval: 3, amount: 22 },
      line: 'Burns hotter as it takes hits, and knits its own plating back together.',
    },
  },
  {
    id: 'frostline', name: 'Frostline Expanse', tag: 'The white silence',
    blurb: 'Whiteout country. Machinery seizes, and so does anything you have built.',
    accent: '#9fe4ff', decor: 'ice',
    theme: {
      ground: ['#dfe9f5', '#c6d6e8', '#aabdd4'],
      tuftLight: '255,255,255', tuftDark: '140,164,192',
      trackEdge: '#4a5a72', track: '#6d7f97', trackMid: '#7e91aa',
      grit: ['70,90,115', '210,225,245'],
    },
    boss: {
      id: 'rimewarden', name: 'The Rimewarden', color: '#c8f0ff',
      hp: 640, speed: 40, reward: 250,
      power: { kind: 'freeze', interval: 6.5, radius: 280, duration: 3 },
      line: 'Flash-freezes everything you own inside a huge radius.',
    },
  },
  {
    id: 'reach', name: 'The Emerald Reach', tag: 'The cosmos',
    blurb: 'Past the last beacon, where the ring-light fails. The Sovereign is waiting.',
    accent: '#3ef07a', decor: 'void',
    theme: {
      ground: ['#2b2450', '#221c42', '#181432'],
      tuftLight: '150,120,255', tuftDark: '60,44,120',
      trackEdge: '#140f2c', track: '#3b3168', trackMid: '#4a3d80',
      grit: ['90,72,160', '180,150,255'],
    },
    boss: {
      id: 'sovereign', name: 'The Void Sovereign', color: '#9dff6b',
      hp: 900, speed: 36, reward: 400,
      power: { kind: 'null', interval: 8, radius: 340, duration: 4, count: 4 },
      line: 'Null pulse: every hero on the field goes offline, and more keep coming.',
    },
  },
];
const CHAPTER_BY_ID = Object.fromEntries(CHAPTERS.map((c) => [c.id, c]));
const MISSIONS_PER_CHAPTER = 5;

/* ---------------- procedural routes ----------------
   Four route families, each guaranteed not to cross itself so towers always
   have somewhere legal to stand. The seed picks the family and its shape, so
   every mission has its own map and that map never changes. */
function generateRoute(seed) {
  const rng = mulberry32(seed);
  const pickOne = (arr) => arr[(rng() * arr.length) | 0];
  const M = 96;                       // keep turns off the very edge
  const family = pickOne(['serpentine', 'vertical', 'comb', 'spiral']);
  const pts = [];

  if (family === 'serpentine') {
    const bands = 3 + ((rng() * 3) | 0);                 // 3..5 horizontal legs
    const top = M + rng() * 40;
    const gap = (CANVAS_H - top - M) / (bands - 1);
    let leftToRight = rng() < .5;
    pts.push({ x: leftToRight ? -50 : CANVAS_W + 50, y: top });
    for (let i = 0; i < bands; i++) {
      const y = top + gap * i;
      const near = M + rng() * 70;
      const far = CANVAS_W - M - rng() * 70;
      const a = leftToRight ? near : far;
      const b = leftToRight ? far : near;
      pts.push({ x: a, y }, { x: b, y });
      if (i < bands - 1) pts.push({ x: b, y: y + gap });
      leftToRight = !leftToRight;
    }
    const last = pts[pts.length - 1];
    pts.push({ x: last.x, y: CANVAS_H + 60 });

  } else if (family === 'vertical') {
    const bands = 3 + ((rng() * 3) | 0);                 // vertical legs
    const left = M + rng() * 40;
    const gap = (CANVAS_W - left - M) / (bands - 1);
    let topToBottom = rng() < .5;
    pts.push({ x: left, y: topToBottom ? -50 : CANVAS_H + 50 });
    for (let i = 0; i < bands; i++) {
      const x = left + gap * i;
      const near = M + rng() * 50;
      const far = CANVAS_H - M - rng() * 50;
      const a = topToBottom ? near : far;
      const b = topToBottom ? far : near;
      pts.push({ x, y: a }, { x, y: b });
      if (i < bands - 1) pts.push({ x: x + gap, y: b });
      topToBottom = !topToBottom;
    }
    const last = pts[pts.length - 1];
    pts.push({ x: CANVAS_W + 60, y: last.y });

  } else if (family === 'comb') {
    const teeth = 3 + ((rng() * 2) | 0);                 // up-down switchbacks
    const spine = rng() < .5 ? M + 40 + rng() * 60 : CANVAS_H - M - 40 - rng() * 60;
    const other = spine < CANVAS_H / 2 ? CANVAS_H - M - rng() * 60 : M + rng() * 60;
    const step = (CANVAS_W - M * 2) / (teeth * 2 - 1);
    pts.push({ x: -50, y: spine });
    let up = true;
    for (let i = 0; i < teeth * 2; i++) {
      const x = M + step * i;
      const y = up ? spine : other;
      pts.push({ x, y });
      up = !up;
      if (i < teeth * 2 - 1) pts.push({ x, y: up ? spine : other });
    }
    const last = pts[pts.length - 1];
    pts.push({ x: CANVAS_W + 60, y: last.y });

  } else {
    /* spiral inward — long route, lots of adjacency for towers */
    let l = M - 20 + rng() * 30, r = CANVAS_W - M + 20 - rng() * 30;
    let t = M - 20 + rng() * 30, b = CANVAS_H - M + 20 - rng() * 30;
    const inset = 100 + rng() * 30;
    pts.push({ x: -50, y: t });
    for (let i = 0; i < 2; i++) {
      pts.push({ x: r, y: t });
      pts.push({ x: r, y: b });
      pts.push({ x: l, y: b });
      if (i === 1) break;
      t += inset; l += inset;
      pts.push({ x: l, y: t });
      r -= inset; b -= inset;
    }
    const last = pts[pts.length - 1];
    pts.push({ x: last.x, y: -60 });
  }

  return pts;
}

/* ---------------- the 30 maps ---------------- */
const MAPS = [];
CHAPTERS.forEach((ch, ci) => {
  for (let i = 0; i < MISSIONS_PER_CHAPTER; i++) {
    const seed = 9000 + ci * 137 + i * 29;
    MAPS.push({
      id: `${ch.id}-${i + 1}`,
      name: `${ch.name} ${['I', 'II', 'III', 'IV', 'V'][i]}`,
      chapter: ch.id,
      seed,
      decor: ch.decor,
      theme: ch.theme,
      points: generateRoute(seed),
    });
  }
});
const MAP_BY_ID = Object.fromEntries(MAPS.map((m) => [m.id, m]));

/* scattered scenery — kept clear of the route */
function generateScenery(path, map, count = 30) {
  const rng = mulberry32(map.seed ^ 0x2f1d);
  const kinds = {
    forest: ['tree', 'tree', 'tree', 'rock', 'bush', 'bush'],
    volcanic: ['rock', 'rock', 'lava', 'deadtree', 'lava'],
    ice: ['pine', 'pine', 'ice', 'rock', 'ice'],
    void: ['crystal', 'crystal', 'rock', 'rift'],
    city: ['building', 'building', 'planter', 'lamp', 'building'],
    gothic: ['spire', 'deadtree', 'lamp', 'spire', 'rock'],
    coast: ['water', 'rock', 'palm', 'water', 'palm'],
  }[map.decor];

  const out = [];
  let guard = 0;
  while (out.length < count && guard++ < 4000) {
    const x = 40 + rng() * (CANVAS_W - 80);
    const y = 40 + rng() * (CANVAS_H - 80);
    if (path.distanceTo(x, y) < 62) continue;
    const a = path.at(0), b = path.at(path.length);
    if (distSq(x, y, a.x, a.y) < 110 * 110) continue;
    if (distSq(x, y, b.x, b.y) < 130 * 130) continue;
    if (out.some((s) => distSq(s.x, s.y, x, y) < 68 * 68)) continue;
    out.push({ t: kinds[(rng() * kinds.length) | 0], x, y, s: .78 + rng() * .5 });
  }
  return out;
}

/* the live map — rebound by setMap() */
let CURRENT_MAP = MAPS[0];
let PATH = buildPath(CURRENT_MAP.points);
let SCENERY = generateScenery(PATH, CURRENT_MAP);

function setMap(id) {
  CURRENT_MAP = MAP_BY_ID[id] || MAPS[0];
  PATH = buildPath(CURRENT_MAP.points);
  SCENERY = generateScenery(PATH, CURRENT_MAP);
  return CURRENT_MAP;
}

/* ---------------- the Void Legion ---------------- */
/* Each tier is a heavier grade of armour. Damage strips a grade at a time,
   so an Elite sheds plating down through the ranks before it drops. */
const TROOPS = [
  { name: 'Grunt',  color: '#8d94a8', trim: '#5a6076', speed: 62,  r: 12, reward: 1 },
  { name: 'Scout',  color: '#4f86d6', trim: '#2c4f86', speed: 80,  r: 13, reward: 1 },
  { name: 'Ranger', color: '#3fb173', trim: '#227048', speed: 98,  r: 14, reward: 1 },
  { name: 'Shocker',color: '#e0be3f', trim: '#8f7716', speed: 142, r: 15, reward: 2 },
  { name: 'Elite',  color: '#d4568f', trim: '#7d2b53', speed: 178, r: 16, reward: 2 },
];
const DREAD = {
  name: 'Dreadnought', color: '#3a4157', speed: 46, r: 34, hp: 120, reward: 40, leak: 15,
};

/* ---------------- counter units ----------------
   Each special escort shuts down a different slice of the roster, either by
   suppressing heroes that carry a tag while it is nearby, or by being flatly
   immune to that kind of damage. Towers are never affected — they stay the
   backbone so a counter wave is a problem to solve, not an instant loss. */
const SPECIALS = {
  riftstone: {
    id: 'riftstone', name: 'Riftstone Carrier', color: '#7cff6b', badge: 'crystal',
    aura: 155, suppress: ['solar'],
    short: 'Riftstone', desc: 'Its shard smothers solar power — Paragon goes dark nearby.',
  },
  amber: {
    id: 'amber', name: 'Amber Ring', color: '#ffc53f', badge: 'ring',
    immune: ['construct'],
    short: 'Amber Ring', desc: 'A rival ring: completely immune to construct damage.',
  },
  dampener: {
    id: 'dampener', name: 'Static Dampener', color: '#5bc8ff', badge: 'coil',
    aura: 165, suppress: ['tech', 'electric'],
    short: 'Dampener', desc: 'Kills circuits and current — tech and electric heroes stall out.',
  },
  shroud: {
    id: 'shroud', name: 'Ash Shroud', color: '#c07bff', badge: 'smoke',
    aura: 145, suppress: ['mind'], immune: ['fire'],
    short: 'Ash Shroud', desc: 'Fireproof, and its haze blanks out trickery and marks.',
  },
};
const SPECIAL_LIST = Object.values(SPECIALS);

/* modifiers a wave can carry */
const SWIFT_MUL = 1.45;   // faster runners
const SHIELD_SOAK = 1;    // shielded troopers shrug off this much of every hit

/* ---------------- campaign ----------------
   30 missions: six cities of five. Difficulty is driven by the global mission
   number, so the thirtieth fight is a very different animal from the first. */
const LEVELS = [];
CHAPTERS.forEach((ch, ci) => {
  for (let i = 0; i < MISSIONS_PER_CHAPTER; i++) {
    const n = ci * MISSIONS_PER_CHAPTER + i + 1;
    const last = i === MISSIONS_PER_CHAPTER - 1;
    /* counter escorts start in the second city and stack up from there */
    const pool = ['dampener', 'riftstone', 'amber', 'shroud'];
    const specials = ci === 0 ? [] : pool.slice(0, clamp(ci, 1, 4));
    LEVELS.push({
      n,
      chapter: ch.id,
      mission: i + 1,
      map: `${ch.id}-${i + 1}`,
      name: `${ch.name} — ${['Landfall', 'Push', 'Crossfire', 'Siege', 'Showdown'][i]}`,
      rounds: 6 + ci + Math.floor(i * 1.5),
      tiers: clamp(2 + ci, 2, TROOPS.length),
      cash: 650 + ci * 60,
      lives: Math.max(60, 100 - ci * 6),
      specials,
      /* every city's fifth mission is its boss fight */
      chapterBoss: last ? ch.boss : null,
      boss: last ? [Math.max(3, 6 + ci)] : (i >= 2 ? [4 + i] : null),
      mods: {
        speed: 1 + ci * .035,
        swift: ci >= 1 && i >= 1,
        shield: ci >= 2 && i >= 1,
      },
    });
  }
});
const LEVEL_COUNT = LEVELS.length;
const LEVEL_BY_N = Object.fromEntries(LEVELS.map((l) => [l.n, l]));

/** gems paid out for finishing a mission (first clear pays double) */
function levelReward(lv) { return 18 + lv.n * 4; }

/** stars are earned on how much of the bastion survived */
const STAR_THRESHOLDS = [0, .55, .9];      // 1★ clear, 2★ 55% lives, 3★ 90%
function starsFor(livesLeft, livesStart) {
  const k = livesStart > 0 ? livesLeft / livesStart : 0;
  if (k >= STAR_THRESHOLDS[2]) return 3;
  if (k >= STAR_THRESHOLDS[1]) return 2;
  return 1;
}

/**
 * Waves are generated rather than hand-authored — deterministic, so a mission
 * always plays the same, but escalating hard with the global mission number.
 */
function buildLevelWaves(lv) {
  const waves = [];
  const mods = lv.mods || {};
  const diff = 1 + (lv.n - 1) * .085;

  for (let r = 1; r <= lv.rounds; r++) {
    const p = lv.rounds > 1 ? (r - 1) / (lv.rounds - 1) : 1;
    const top = clamp(Math.round(p * (lv.tiers - 1)), 0, TROOPS.length - 1);
    const groups = [];

    /* the city boss headlines the final round of a showdown */
    if (lv.chapterBoss && r === lv.rounds) {
      groups.push({ tier: 'chapterBoss', count: 1, gap: 1, delay: 1.5 });
    }
    if (lv.boss && lv.boss.includes(r)) {
      groups.push({ tier: 'boss', count: 1 + Math.floor(lv.n / 9), gap: 3.2, delay: 0 });
    }

    const count = Math.round((9 + r * 2.2) * diff);
    const gap = Math.max(.16, .58 - p * .24 - lv.n * .004);
    groups.push({
      tier: top, count, gap, delay: groups.length ? 2.5 : 0,
      swift: !!mods.swift && r % 3 === 0,
    });

    if (top > 0) {
      groups.push({
        tier: Math.max(0, top - 1), count: Math.round(count * .85), gap: gap * .8,
        delay: 4.5, shield: !!mods.shield && r % 2 === 0,
      });
    }
    if (top > 2 && r > lv.rounds * .5) {
      groups.push({
        tier: top - 2, count: Math.round(count * 1.1), gap: gap * .7, delay: 8.5,
        swift: !!mods.swift,
      });
    }

    /* counter escorts thicken as the mission runs on */
    if (lv.specials.length && r >= Math.max(2, Math.ceil(lv.rounds * .3))) {
      lv.specials.forEach((sid, i) => {
        if ((r + i) % 2) return;
        groups.push({
          tier: clamp(top - 1, 1, TROOPS.length - 1),
          count: 2 + Math.floor(p * 4) + Math.floor(lv.n / 8),
          gap: 1.5, delay: 6 + i * 3.5, special: sid,
          shield: !!mods.shield && p > .6,
        });
      });
    }
    waves.push(groups);
  }
  return waves;
}

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
  verdant(ctx, lvl, t) {
    const bob = Math.sin(t * 2.2) * 1.8;
    const pulse = .75 + Math.sin(t * 4) * .25;
    ctx.save(); ctx.translate(0, bob);

    /* he hovers, so the ground gets a glow instead of a shadow */
    const hover = ctx.createRadialGradient(0, 15, 1, 0, 15, 19);
    hover.addColorStop(0, `rgba(70,255,140,${.45 * pulse})`);
    hover.addColorStop(1, 'rgba(70,255,140,0)');
    ctx.fillStyle = hover;
    ctx.beginPath(); ctx.ellipse(0, 15, 19, 7, 0, 0, TAU); ctx.fill();

    /* legs */
    ctx.fillStyle = '#0d1a13';
    roundRect(ctx, -7.5, 2, 6, 12, 3); ctx.fill();
    roundRect(ctx, 1.5, 2, 6, 12, 3); ctx.fill();

    /* torso */
    const g = ctx.createLinearGradient(0, -12, 0, 6);
    g.addColorStop(0, '#4dff9b'); g.addColorStop(1, '#0e8b4c');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-8.5, -11); ctx.lineTo(8.5, -11);
    ctx.quadraticCurveTo(11, -2, 8, 5); ctx.lineTo(-8, 5);
    ctx.quadraticCurveTo(-11, -2, -8.5, -11);
    ctx.fill();
    /* black shoulders */
    ctx.fillStyle = '#101c16';
    roundRect(ctx, -12.5, -11.5, 5.5, 11, 2.5); ctx.fill();
    roundRect(ctx, 7, -11.5, 5.5, 11, 2.5); ctx.fill();

    /* chest emblem — a ring construct glyph */
    ctx.strokeStyle = '#eafff2'; ctx.lineWidth = 1.7;
    ctx.beginPath(); ctx.arc(0, -4, 4, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#eafff2';
    ctx.fillRect(-5.4, -4.85, 10.8, 1.7);

    /* head: jaw, mask, visor slit */
    ctx.fillStyle = '#f0c49b';
    ctx.beginPath(); ctx.arc(0, -16, 6, 0, TAU); ctx.fill();
    ctx.fillStyle = '#15a15a';
    ctx.beginPath(); ctx.arc(0, -16, 6, Math.PI * .94, Math.PI * 2.06); ctx.fill();
    ctx.fillStyle = '#2a1a10';
    ctx.beginPath(); ctx.arc(0, -20.5, 6, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
    ctx.fillStyle = '#eafff2';
    ctx.beginPath(); ctx.ellipse(2.6, -17.2, 2.1, 1.2, -.12, 0, TAU); ctx.fill();

    /* extended fist with the power ring */
    ctx.fillStyle = '#101c16';
    roundRect(ctx, 8, -6, 10, 7.5, 3.2); ctx.fill();
    const orb = ctx.createRadialGradient(20, -2.2, 0, 20, -2.2, 8 * pulse);
    orb.addColorStop(0, 'rgba(220,255,235,.95)');
    orb.addColorStop(.4, `rgba(80,255,150,${.75 * pulse})`);
    orb.addColorStop(1, 'rgba(60,240,130,0)');
    ctx.fillStyle = orb;
    ctx.beginPath(); ctx.arc(20, -2.2, 8 * pulse, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#bfffd8'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.arc(18.5, -2.2, 3.2, 0, TAU); ctx.stroke();

    /* level 3 gets orbiting construct sparks */
    if (lvl > 2) {
      ctx.fillStyle = '#9dffc6';
      for (let i = 0; i < 4; i++) {
        const a = t * 2.2 + (i * TAU) / 4;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * 20, -4 + Math.sin(a) * 9, 1.9, 0, TAU);
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(120,255,180,.45)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.ellipse(0, -4, 20, 9, 0, 0, TAU); ctx.stroke();
    }
    ctx.restore();
  },
  streak(ctx, lvl, t) {
    const bob = Math.sin(t * 3.4) * 1.4;
    ctx.save(); ctx.translate(0, bob);

    /* he never quite stands still — a low blur skirt under the feet */
    ctx.fillStyle = 'rgba(255,190,60,.22)';
    ctx.beginPath(); ctx.ellipse(-4, 13, 17, 4.5, 0, 0, TAU); ctx.fill();

    /* crackle around the boots */
    ctx.strokeStyle = `rgba(255,225,120,${.5 + Math.sin(t * 18) * .3})`;
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 3; i++) {
      const a = t * 9 + i * 2.1;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 12, 9 + Math.sin(a) * 3);
      ctx.lineTo(Math.cos(a) * 18, 12 + Math.sin(a) * 4);
      ctx.stroke();
    }

    ctx.fillStyle = '#7d1520';
    roundRect(ctx, -7.5, 2, 6, 12, 3); ctx.fill();
    roundRect(ctx, 1.5, 2, 6, 12, 3); ctx.fill();

    /* suit */
    const g = ctx.createLinearGradient(0, -13, 0, 6);
    g.addColorStop(0, '#f0453f'); g.addColorStop(1, '#8e1119');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-8.5, -11); ctx.lineTo(8.5, -11);
    ctx.quadraticCurveTo(11, -2, 8, 5); ctx.lineTo(-8, 5);
    ctx.quadraticCurveTo(-11, -2, -8.5, -11);
    ctx.fill();

    /* chest bolt */
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.moveTo(1, -10); ctx.lineTo(-3.5, -3.5); ctx.lineTo(-.5, -3.5);
    ctx.lineTo(-2.5, 2.5); ctx.lineTo(3.5, -5); ctx.lineTo(.5, -5);
    ctx.closePath(); ctx.fill();

    /* helm with wing flashes */
    ctx.fillStyle = '#d93a34';
    ctx.beginPath(); ctx.arc(0, -16, 6.2, 0, TAU); ctx.fill();
    ctx.fillStyle = '#f7d9c0';
    ctx.beginPath(); ctx.arc(1.5, -14.5, 4.4, -.5, 1.9); ctx.fill();
    ctx.fillStyle = '#ffd23f';
    for (const s2 of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s2 * 5.5, -18.5);
      ctx.lineTo(s2 * 12, -21.5 + Math.sin(t * 14 + s2) * 1.2);
      ctx.lineTo(s2 * 5.5, -15.5);
      ctx.closePath(); ctx.fill();
    }

    /* trailing after-images while idle */
    ctx.globalAlpha = .18;
    for (let i = 1; i <= (lvl > 2 ? 3 : 2); i++) {
      ctx.fillStyle = '#ff6a5e';
      ctx.beginPath();
      ctx.ellipse(-10 - i * 6, -2, 5 - i, 11 - i * 1.6, 0, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  },
  paragon(ctx, lvl, t) {
    const bob = Math.sin(t * 1.9) * 2.2;
    ctx.save(); ctx.translate(0, bob);

    /* hovering, so a soft light pool rather than a shadow */
    const pool = ctx.createRadialGradient(0, 15, 1, 0, 15, 18);
    pool.addColorStop(0, 'rgba(120,190,255,.4)');
    pool.addColorStop(1, 'rgba(120,190,255,0)');
    ctx.fillStyle = pool;
    ctx.beginPath(); ctx.ellipse(0, 15, 18, 6.5, 0, 0, TAU); ctx.fill();

    /* cape */
    ctx.fillStyle = '#a8202c';
    ctx.beginPath();
    ctx.moveTo(-7, -11);
    ctx.quadraticCurveTo(-19 - Math.sin(t * 2.2) * 3, 0, -12, 14);
    ctx.lineTo(-2, 6); ctx.lineTo(-4, -10);
    ctx.closePath(); ctx.fill();

    ctx.fillStyle = '#1d3f8f';
    roundRect(ctx, -7.5, 2, 6, 12, 3); ctx.fill();
    roundRect(ctx, 1.5, 2, 6, 12, 3); ctx.fill();

    /* suit */
    const g = ctx.createLinearGradient(0, -13, 0, 6);
    g.addColorStop(0, '#3f7ee8'); g.addColorStop(1, '#16357c');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-8.5, -11); ctx.lineTo(8.5, -11);
    ctx.quadraticCurveTo(11, -2, 8, 5); ctx.lineTo(-8, 5);
    ctx.quadraticCurveTo(-11, -2, -8.5, -11);
    ctx.fill();

    /* crest: a solar diamond */
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.moveTo(0, -9.5); ctx.lineTo(4.5, -5); ctx.lineTo(0, -.5); ctx.lineTo(-4.5, -5);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#a8202c';
    ctx.beginPath();
    ctx.moveTo(0, -7.5); ctx.lineTo(2.4, -5); ctx.lineTo(0, -2.5); ctx.lineTo(-2.4, -5);
    ctx.closePath(); ctx.fill();

    /* head */
    ctx.fillStyle = '#f7d9c0';
    ctx.beginPath(); ctx.arc(0, -16, 6.2, 0, TAU); ctx.fill();
    ctx.fillStyle = '#16181f';
    ctx.beginPath(); ctx.arc(0, -19.5, 6.4, Math.PI * 1.02, Math.PI * 1.98); ctx.fill();
    ctx.beginPath(); ctx.arc(-4.5, -17.5, 2.6, 0, TAU); ctx.fill();

    /* eyes banked with heat */
    const heat = .55 + Math.sin(t * 3) * .45;
    ctx.fillStyle = `rgba(255,${120 - heat * 60},60,${.55 + heat * .45})`;
    ctx.beginPath();
    ctx.ellipse(2, -16.5, 2.4, 1.1, 0, 0, TAU);
    ctx.ellipse(-2.6, -16.5, 1.8, 1, 0, 0, TAU);
    ctx.fill();
    if (lvl > 2) {
      ctx.strokeStyle = `rgba(255,190,90,${heat * .7})`;
      ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(4, -16.4); ctx.lineTo(11, -16.2); ctx.stroke();
    }
    ctx.restore();
  },
  nocturne(ctx, lvl, t) {
    const bob = Math.sin(t * 1.7) * 1.2;
    ctx.save(); ctx.translate(0, bob);
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath(); ctx.ellipse(0, 14, 15, 5, 0, 0, TAU); ctx.fill();

    /* cape sweeping behind */
    ctx.fillStyle = '#14171f';
    ctx.beginPath();
    ctx.moveTo(-6, -11);
    ctx.quadraticCurveTo(-22 - Math.sin(t * 1.6) * 3, 2, -14, 15);
    ctx.lineTo(14, 15);
    ctx.quadraticCurveTo(21 + Math.sin(t * 1.6) * 3, 2, 6, -11);
    ctx.closePath(); ctx.fill();

    ctx.fillStyle = '#1c2029';
    roundRect(ctx, -7.5, 2, 6, 12, 3); ctx.fill();
    roundRect(ctx, 1.5, 2, 6, 12, 3); ctx.fill();

    const g = ctx.createLinearGradient(0, -12, 0, 6);
    g.addColorStop(0, '#39404f'); g.addColorStop(1, '#161a23');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-8.5, -11); ctx.lineTo(8.5, -11);
    ctx.quadraticCurveTo(11, -2, 8, 5); ctx.lineTo(-8, 5);
    ctx.quadraticCurveTo(-11, -2, -8.5, -11);
    ctx.fill();

    /* utility belt */
    ctx.fillStyle = '#d8ac3f';
    roundRect(ctx, -8, 1, 16, 3.4, 1.5); ctx.fill();
    /* chest sigil */
    ctx.fillStyle = '#0d1016';
    ctx.beginPath();
    ctx.moveTo(-5, -6); ctx.quadraticCurveTo(0, -2, 5, -6);
    ctx.quadraticCurveTo(2, -8.5, 0, -6.5); ctx.quadraticCurveTo(-2, -8.5, -5, -6);
    ctx.fill();

    /* cowl with ears */
    ctx.fillStyle = '#232833';
    ctx.beginPath(); ctx.arc(0, -15, 6, 0, TAU); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-5.5, -18); ctx.lineTo(-4, -26); ctx.lineTo(-1.5, -18); ctx.closePath();
    ctx.moveTo(5.5, -18); ctx.lineTo(4, -26); ctx.lineTo(1.5, -18); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#3a3f4c';
    ctx.beginPath(); ctx.arc(0, -12.5, 6, Math.PI * .1, Math.PI * .9); ctx.fill();
    /* lit eye slits */
    ctx.fillStyle = lvl > 2 ? '#8fdcff' : '#dfe7f5';
    roundRect(ctx, -4.6, -16.6, 3.6, 1.7, .8); ctx.fill();
    roundRect(ctx, 1, -16.6, 3.6, 1.7, .8); ctx.fill();

    /* batarang ready in hand */
    ctx.fillStyle = '#8f98ab';
    ctx.save(); ctx.translate(13, -2); ctx.rotate(t * 3);
    ctx.beginPath();
    ctx.moveTo(-6, 0); ctx.lineTo(0, -3); ctx.lineTo(6, 0); ctx.lineTo(0, 2); ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.restore();
  },
  ironclad(ctx, lvl, t) {
    const bob = Math.sin(t * 2.1) * 1.6;
    ctx.save(); ctx.translate(0, bob);

    /* repulsor wash under the boots */
    const jet = ctx.createRadialGradient(0, 15, 1, 0, 15, 17);
    jet.addColorStop(0, 'rgba(140,210,255,.45)');
    jet.addColorStop(1, 'rgba(140,210,255,0)');
    ctx.fillStyle = jet;
    ctx.beginPath(); ctx.ellipse(0, 15, 17, 6, 0, 0, TAU); ctx.fill();

    ctx.fillStyle = '#8f1f26';
    roundRect(ctx, -7.5, 2, 6, 12, 3); ctx.fill();
    roundRect(ctx, 1.5, 2, 6, 12, 3); ctx.fill();

    /* armour */
    const g = ctx.createLinearGradient(0, -12, 0, 6);
    g.addColorStop(0, '#e04b3a'); g.addColorStop(1, '#8d1c22');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-8.5, -11); ctx.lineTo(8.5, -11);
    ctx.quadraticCurveTo(11, -2, 8, 5); ctx.lineTo(-8, 5);
    ctx.quadraticCurveTo(-11, -2, -8.5, -11);
    ctx.fill();
    ctx.fillStyle = '#e8b93f';
    roundRect(ctx, -10.5, -11, 5, 10, 2.5); ctx.fill();
    roundRect(ctx, 5.5, -11, 5, 10, 2.5); ctx.fill();

    /* arc reactor */
    const pulse = .7 + Math.sin(t * 4) * .3;
    const core = ctx.createRadialGradient(0, -5, 0, 0, -5, 8 * pulse);
    core.addColorStop(0, 'rgba(240,255,255,.98)');
    core.addColorStop(.45, `rgba(130,225,255,${.85 * pulse})`);
    core.addColorStop(1, 'rgba(90,180,255,0)');
    ctx.fillStyle = core;
    ctx.beginPath(); ctx.arc(0, -5, 8 * pulse, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#f0e6c0'; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.arc(0, -5, 3.6, 0, TAU); ctx.stroke();

    /* helm */
    ctx.fillStyle = '#e8b93f';
    ctx.beginPath(); ctx.arc(0, -15, 6.2, 0, TAU); ctx.fill();
    ctx.fillStyle = '#c53a30';
    ctx.beginPath(); ctx.arc(0, -17, 6.2, Math.PI * 1.02, Math.PI * 1.98); ctx.fill();
    ctx.fillStyle = '#cffaff';
    roundRect(ctx, -4.4, -16, 3.4, 1.9, .9); ctx.fill();
    roundRect(ctx, 1, -16, 3.4, 1.9, .9); ctx.fill();

    /* palm repulsor charged */
    ctx.fillStyle = '#e8b93f';
    roundRect(ctx, 8, -6, 9, 7, 3); ctx.fill();
    const pr = ctx.createRadialGradient(17, -2.5, 0, 17, -2.5, 7 * pulse);
    pr.addColorStop(0, 'rgba(230,250,255,.95)');
    pr.addColorStop(1, 'rgba(110,200,255,0)');
    ctx.fillStyle = pr;
    ctx.beginPath(); ctx.arc(17, -2.5, 7 * pulse, 0, TAU); ctx.fill();

    if (lvl > 2) {
      /* shoulder pods snapped open at max tier */
      ctx.fillStyle = '#4a4f5e';
      roundRect(ctx, -13, -14, 6, 4, 1.5); ctx.fill();
      roundRect(ctx, 7, -14, 6, 4, 1.5); ctx.fill();
    }
    ctx.restore();
  },
  havoc(ctx, lvl, t) {
    const breathe = Math.sin(t * 1.6) * 1.4;
    ctx.save(); ctx.translate(0, breathe * .4);
    ctx.fillStyle = 'rgba(0,0,0,.34)';
    ctx.beginPath(); ctx.ellipse(0, 15, 20, 6.5, 0, 0, TAU); ctx.fill();

    /* legs */
    ctx.fillStyle = '#4b3a86';
    roundRect(ctx, -9, 4, 8, 11, 3); ctx.fill();
    roundRect(ctx, 1, 4, 8, 11, 3); ctx.fill();

    /* enormous torso */
    const g = ctx.createLinearGradient(0, -14, 0, 8);
    g.addColorStop(0, '#7ee060'); g.addColorStop(1, '#2f7c31');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-13, -8);
    ctx.quadraticCurveTo(-15, 6, -9, 7);
    ctx.lineTo(9, 7);
    ctx.quadraticCurveTo(15, 6, 13, -8);
    ctx.quadraticCurveTo(8, -13, 0, -12);
    ctx.quadraticCurveTo(-8, -13, -13, -8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 1.5; ctx.stroke();

    /* slabs of arm, knuckles down */
    ctx.fillStyle = '#5fbe49';
    ctx.save(); ctx.translate(-14, -4); ctx.rotate(-.25 + breathe * .04);
    roundRect(ctx, -5, 0, 9, 16, 4.5); ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate(14, -4); ctx.rotate(.25 - breathe * .04);
    roundRect(ctx, -4, 0, 9, 16, 4.5); ctx.fill(); ctx.restore();

    /* small head sunk into the shoulders */
    ctx.fillStyle = '#6ccf52';
    roundRect(ctx, -6, -20, 12, 10, 4.5); ctx.fill();
    ctx.fillStyle = '#123d16';
    roundRect(ctx, -4.5, -17.5, 3.4, 1.8, .8); ctx.fill();
    roundRect(ctx, 1.1, -17.5, 3.4, 1.8, .8); ctx.fill();
    /* clenched jaw */
    ctx.fillStyle = '#e9ffe2';
    roundRect(ctx, -3, -12.6, 6, 1.5, .6); ctx.fill();

    if (lvl > 2) {
      ctx.strokeStyle = `rgba(140,255,120,${.35 + Math.sin(t * 6) * .25})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, -2, 24, 0, TAU); ctx.stroke();
    }
    ctx.restore();
  },
  jester(ctx, lvl, t) {
    const bob = Math.sin(t * 2.6) * 1.5;
    ctx.save(); ctx.translate(0, bob);
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath(); ctx.ellipse(0, 14, 14, 5, 0, 0, TAU); ctx.fill();

    ctx.fillStyle = '#2d6b3a';
    roundRect(ctx, -7.5, 2, 6, 12, 3); ctx.fill();
    roundRect(ctx, 1.5, 2, 6, 12, 3); ctx.fill();

    /* long purple coat */
    const g = ctx.createLinearGradient(0, -12, 0, 8);
    g.addColorStop(0, '#a35cd8'); g.addColorStop(1, '#4d2170');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-9, -11); ctx.lineTo(9, -11);
    ctx.quadraticCurveTo(12, 0, 9, 9); ctx.lineTo(-9, 9);
    ctx.quadraticCurveTo(-12, 0, -9, -11);
    ctx.fill();
    /* lapels and flower */
    ctx.fillStyle = '#f0a83c';
    ctx.beginPath();
    ctx.moveTo(-4, -11); ctx.lineTo(0, -3); ctx.lineTo(4, -11); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#4ade80';
    ctx.beginPath(); ctx.arc(-6, -8, 2.4, 0, TAU); ctx.fill();

    /* chalk-white face */
    ctx.fillStyle = '#f4f2ee';
    ctx.beginPath(); ctx.arc(0, -16, 6.2, 0, TAU); ctx.fill();
    /* green hair */
    ctx.fillStyle = '#3fbf5f';
    ctx.beginPath(); ctx.arc(0, -18.5, 6.4, Math.PI * 1.02, Math.PI * 1.98); ctx.fill();
    for (const s2 of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s2 * 4, -19);
      ctx.quadraticCurveTo(s2 * 11, -18 + Math.sin(t * 5 + s2) * 1.5, s2 * 7, -12);
      ctx.quadraticCurveTo(s2 * 6, -16, s2 * 4, -19);
      ctx.fill();
    }
    /* eyes and the grin */
    ctx.fillStyle = '#16121c';
    ctx.beginPath(); ctx.arc(-2.2, -17, 1.2, 0, TAU); ctx.arc(2.2, -17, 1.2, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#c8324f'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, -14.5, 3.6, .15, Math.PI - .15); ctx.stroke();

    /* fanned cards */
    ctx.save(); ctx.translate(12, -1);
    for (let i = -1; i <= 1; i++) {
      ctx.save(); ctx.rotate(i * .3 + Math.sin(t * 2) * .08);
      ctx.fillStyle = '#f4f2ee';
      roundRect(ctx, -2, -7, 4.4, 9, 1); ctx.fill();
      ctx.fillStyle = i === 0 ? '#c8324f' : '#16121c';
      ctx.beginPath(); ctx.arc(.2, -2.5, 1, 0, TAU); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    ctx.restore();
  },
  webline(ctx, lvl, t) {
    const bob = Math.sin(t * 3) * 1.6;
    ctx.save(); ctx.translate(0, bob);
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath(); ctx.ellipse(0, 14, 13, 4.5, 0, 0, TAU); ctx.fill();

    /* crouched, coiled */
    ctx.fillStyle = '#1d3f8f';
    roundRect(ctx, -8, 3, 6.5, 11, 3); ctx.fill();
    roundRect(ctx, 1.5, 3, 6.5, 11, 3); ctx.fill();
    const g = ctx.createLinearGradient(0, -12, 0, 6);
    g.addColorStop(0, '#e0433f'); g.addColorStop(1, '#95201f');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-8.5, -10); ctx.lineTo(8.5, -10);
    ctx.quadraticCurveTo(11, -1, 8, 6); ctx.lineTo(-8, 6);
    ctx.quadraticCurveTo(-11, -1, -8.5, -10);
    ctx.fill();
    /* web lines across the chest */
    ctx.strokeStyle = 'rgba(20,25,45,.75)'; ctx.lineWidth = .8;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath(); ctx.moveTo(i * 3.4, -10); ctx.lineTo(i * 2, 6); ctx.stroke();
    }
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.arc(0, -12, 5 + i * 4.5, .5, Math.PI - .5); ctx.stroke();
    }
    /* mask with big lenses */
    ctx.fillStyle = '#d0392f';
    ctx.beginPath(); ctx.arc(0, -15, 6.2, 0, TAU); ctx.fill();
    ctx.fillStyle = '#f2f6ff';
    ctx.beginPath();
    ctx.ellipse(-2.6, -15.6, 3, 2.1, .35, 0, TAU);
    ctx.ellipse(2.6, -15.6, 3, 2.1, -.35, 0, TAU);
    ctx.fill();
    /* a line of web trailing from the wrist */
    ctx.strokeStyle = 'rgba(240,246,255,.7)'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(10, -2);
    ctx.quadraticCurveTo(17, -6 + Math.sin(t * 4) * 2, 22, -1);
    ctx.stroke();
    ctx.restore();
  },
  skyforge(ctx, lvl, t) {
    const bob = Math.sin(t * 1.9) * 1.6;
    ctx.save(); ctx.translate(0, bob);
    ctx.fillStyle = 'rgba(0,0,0,.32)';
    ctx.beginPath(); ctx.ellipse(0, 14, 16, 5.5, 0, 0, TAU); ctx.fill();

    /* cape */
    ctx.fillStyle = '#8f1f2e';
    ctx.beginPath();
    ctx.moveTo(-7, -11);
    ctx.quadraticCurveTo(-19 - Math.sin(t * 2) * 3, 2, -12, 15);
    ctx.lineTo(-1, 7); ctx.lineTo(-4, -10);
    ctx.closePath(); ctx.fill();

    ctx.fillStyle = '#2a2f3d';
    roundRect(ctx, -7.5, 2, 6, 12, 3); ctx.fill();
    roundRect(ctx, 1.5, 2, 6, 12, 3); ctx.fill();

    const g = ctx.createLinearGradient(0, -12, 0, 6);
    g.addColorStop(0, '#9aa6bd'); g.addColorStop(1, '#4a5468');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-9, -11); ctx.lineTo(9, -11);
    ctx.quadraticCurveTo(11.5, -2, 8, 5); ctx.lineTo(-8, 5);
    ctx.quadraticCurveTo(-11.5, -2, -9, -11);
    ctx.fill();
    /* armour discs */
    ctx.fillStyle = '#cfd8ea';
    for (const dx of [-4.5, 4.5]) {
      ctx.beginPath(); ctx.arc(dx, -5, 2.6, 0, TAU); ctx.fill();
    }

    /* winged helm */
    ctx.fillStyle = '#f0d9a8';
    ctx.beginPath(); ctx.arc(0, -15, 6, 0, TAU); ctx.fill();
    ctx.fillStyle = '#b8c3d8';
    ctx.beginPath(); ctx.arc(0, -17, 6.2, Math.PI * 1.02, Math.PI * 1.98); ctx.fill();
    ctx.fillStyle = '#e8eefc';
    for (const s2 of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s2 * 5, -18);
      ctx.lineTo(s2 * 12, -25 + Math.sin(t * 3) * 1.2);
      ctx.lineTo(s2 * 5, -15);
      ctx.closePath(); ctx.fill();
    }

    /* hammer, wreathed in current */
    ctx.save(); ctx.translate(15, 0); ctx.rotate(Math.sin(t * 2) * .15);
    ctx.fillStyle = '#6b5a44';
    roundRect(ctx, -1.6, -2, 3.2, 15, 1.4); ctx.fill();
    ctx.fillStyle = '#aeb8ca';
    roundRect(ctx, -6, -12, 12, 10, 2.5); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.strokeStyle = `rgba(150,230,255,${.5 + Math.sin(t * 18) * .4})`;
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 3; i++) {
      const a = t * 7 + i * 2.1;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 8, -7 + Math.sin(a) * 8);
      ctx.lineTo(Math.cos(a) * 13, -7 + Math.sin(a) * 13);
      ctx.stroke();
    }
    ctx.restore();
    ctx.restore();
  },
  bulwark(ctx, lvl, t) {
    const bob = Math.sin(t * 2) * 1.2;
    ctx.save(); ctx.translate(0, bob);
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath(); ctx.ellipse(0, 14, 14, 5, 0, 0, TAU); ctx.fill();

    ctx.fillStyle = '#1b2a52';
    roundRect(ctx, -7.5, 2, 6, 12, 3); ctx.fill();
    roundRect(ctx, 1.5, 2, 6, 12, 3); ctx.fill();

    const g = ctx.createLinearGradient(0, -12, 0, 6);
    g.addColorStop(0, '#3f6fd0'); g.addColorStop(1, '#1c3576');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-8.5, -11); ctx.lineTo(8.5, -11);
    ctx.quadraticCurveTo(11, -2, 8, 5); ctx.lineTo(-8, 5);
    ctx.quadraticCurveTo(-11, -2, -8.5, -11);
    ctx.fill();
    /* chest star */
    ctx.fillStyle = '#f2f6ff';
    starPath(ctx, 0, -5, 5, 4.6, 2);
    ctx.fill();

    ctx.fillStyle = '#f0c9a0';
    ctx.beginPath(); ctx.arc(0, -15, 5.8, 0, TAU); ctx.fill();
    ctx.fillStyle = '#3f6fd0';
    ctx.beginPath(); ctx.arc(0, -17, 6, Math.PI * 1.02, Math.PI * 1.98); ctx.fill();
    ctx.fillStyle = '#f2f6ff';
    for (const s2 of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s2 * 5, -18.5); ctx.lineTo(s2 * 9.5, -21); ctx.lineTo(s2 * 5, -15.5);
      ctx.closePath(); ctx.fill();
    }

    /* the shield, held out and spinning slowly */
    ctx.save(); ctx.translate(13, 0); ctx.rotate(t * 1.4);
    const rings = ['#d8443f', '#f2f6ff', '#d8443f', '#2f5fc0'];
    rings.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.arc(0, 0, 9 - i * 2.1, 0, TAU); ctx.fill();
    });
    ctx.fillStyle = '#f2f6ff';
    starPath(ctx, 0, 0, 5, 2.6, 1.1);
    ctx.fill();
    ctx.restore();
    ctx.restore();
  },
  valkyra(ctx, lvl, t) {
    const bob = Math.sin(t * 2.2) * 1.3;
    ctx.save(); ctx.translate(0, bob);
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath(); ctx.ellipse(0, 14, 14, 5, 0, 0, TAU); ctx.fill();

    /* skirt + boots */
    ctx.fillStyle = '#2f4fa8';
    ctx.beginPath();
    ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.lineTo(10, 12); ctx.lineTo(-10, 12);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#a8202c';
    roundRect(ctx, -7.5, 10, 6, 5, 2); ctx.fill();
    roundRect(ctx, 1.5, 10, 6, 5, 2); ctx.fill();

    /* bodice */
    const g = ctx.createLinearGradient(0, -12, 0, 2);
    g.addColorStop(0, '#d84a3c'); g.addColorStop(1, '#8e1d24');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-8, -11); ctx.lineTo(8, -11);
    ctx.quadraticCurveTo(10, -4, 7, 1); ctx.lineTo(-7, 1);
    ctx.quadraticCurveTo(-10, -4, -8, -11);
    ctx.fill();
    ctx.fillStyle = '#e8b93f';
    ctx.beginPath();
    ctx.moveTo(0, -9); ctx.lineTo(4, -5); ctx.lineTo(0, -2); ctx.lineTo(-4, -5);
    ctx.closePath(); ctx.fill();

    /* head, dark hair, tiara */
    ctx.fillStyle = '#1c1620';
    ctx.beginPath(); ctx.arc(0, -14, 7.4, 0, TAU); ctx.fill();
    ctx.fillStyle = '#f2d2b0';
    ctx.beginPath(); ctx.arc(.5, -15, 5.4, 0, TAU); ctx.fill();
    ctx.fillStyle = '#e8b93f';
    roundRect(ctx, -5, -21, 10, 2.4, 1); ctx.fill();
    ctx.fillStyle = '#d84a3c';
    ctx.beginPath(); ctx.arc(.5, -20.4, 1.5, 0, TAU); ctx.fill();

    /* bracers + glowing lasso */
    ctx.fillStyle = '#dfe6f5';
    roundRect(ctx, -13, -5, 5, 6, 2); ctx.fill();
    roundRect(ctx, 8, -5, 5, 6, 2); ctx.fill();
    ctx.strokeStyle = `rgba(255,200,90,${.6 + Math.sin(t * 5) * .3})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(17, 2, 7, 4.5, Math.sin(t * 2) * .3, 0, TAU);
    ctx.stroke();
    ctx.restore();
  },
  arcanist(ctx, lvl, t) {
    const bob = Math.sin(t * 1.7) * 2;
    ctx.save(); ctx.translate(0, bob);

    /* he hovers over a faint sigil */
    ctx.strokeStyle = `rgba(255,140,60,${.35 + Math.sin(t * 2) * .2})`;
    ctx.lineWidth = 1.4;
    ctx.save(); ctx.translate(0, 15); ctx.scale(1, .38); ctx.rotate(t * .8);
    ctx.beginPath(); ctx.arc(0, 0, 17, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 12, 0, TAU); ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 12, Math.sin(a) * 12);
      ctx.lineTo(Math.cos(a) * 17, Math.sin(a) * 17);
      ctx.stroke();
    }
    ctx.restore();

    /* cloak */
    ctx.fillStyle = '#a8202c';
    ctx.beginPath();
    ctx.moveTo(-7, -11);
    ctx.quadraticCurveTo(-20 - Math.sin(t * 1.8) * 4, 2, -13, 14);
    ctx.lineTo(13, 14);
    ctx.quadraticCurveTo(20 + Math.sin(t * 1.8) * 4, 2, 7, -11);
    ctx.closePath(); ctx.fill();

    const g = ctx.createLinearGradient(0, -12, 0, 6);
    g.addColorStop(0, '#3d4a6b'); g.addColorStop(1, '#1c2338');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-7.5, -11); ctx.lineTo(7.5, -11);
    ctx.quadraticCurveTo(10, -2, 7, 6); ctx.lineTo(-7, 6);
    ctx.quadraticCurveTo(-10, -2, -7.5, -11);
    ctx.fill();

    /* amulet */
    const pulse = .7 + Math.sin(t * 3.5) * .3;
    ctx.fillStyle = `rgba(140,240,180,${pulse})`;
    ctx.beginPath(); ctx.ellipse(0, -5, 2.6, 3.4, 0, 0, TAU); ctx.fill();

    ctx.fillStyle = '#f0c9a0';
    ctx.beginPath(); ctx.arc(0, -15, 5.8, 0, TAU); ctx.fill();
    ctx.fillStyle = '#20242f';
    ctx.beginPath(); ctx.arc(0, -17.5, 6, Math.PI * 1.02, Math.PI * 1.98); ctx.fill();
    ctx.fillStyle = '#c8ccd8';
    roundRect(ctx, -6.5, -14.5, 2.6, 4, 1); ctx.fill();

    /* a conjured ring in the raised hand */
    ctx.save(); ctx.translate(15, -6); ctx.rotate(t * 2.2);
    ctx.strokeStyle = `rgba(255,150,60,${.75 + Math.sin(t * 6) * .25})`;
    ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(0, 0, 7, .3, TAU - .3); ctx.stroke();
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(0, 0, 4, .8, TAU - .2); ctx.stroke();
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
    burn: { dps: 1, time: 2.4 }, color: '#ff8a3d', tags: ['fire'],
    desc: 'Rapid flaming arrows that set balloons alight for extra damage over time.',
  },
  {
    id: 'volt', name: 'Volt', role: 'Storm Caller', art: Art.volt,
    rarity: 'Rare', rarityColor: '#62d9ff', glow: 'rgba(90,200,255,.45)',
    range: 168, cooldown: 1.1, damage: 2, kind: 'chain', chains: 4, color: '#62d9ff',
    tags: ['electric'],
    desc: 'Calls down forked lightning that arcs between up to four balloons at once.',
  },
  {
    id: 'terra', name: 'Terra', role: 'Stone Warden', art: Art.terra,
    rarity: 'Epic', rarityColor: '#a97bff', glow: 'rgba(160,120,255,.45)',
    range: 118, cooldown: 1.8, damage: 3, kind: 'slam', knockback: 46,
    slow: .35, slowTime: 1.4, color: '#9bbf78', tags: ['kinetic'],
    desc: 'Shatters the ground, damaging every nearby balloon and shoving them backwards.',
  },
  {
    id: 'verdant', name: 'Verdant', role: 'Ring Bearer', art: Art.verdant,
    rarity: 'Legendary', rarityColor: '#3ef07a', glow: 'rgba(60,240,130,.45)',
    range: 150, cooldown: .72, damage: 1, kind: 'ray', color: '#3ef07a', tags: ['construct'],
    /* the only hero with a player-triggered ability */
    ability: {
      kind: 'saw',
      name: 'Buzzsaw Construct',
      charges: [1, 2, 3],   // by hero level
      hint: 'Click Verdant to unleash',
    },
    desc: 'A weak ring beam chips away on its own — click him to grow huge and roll a giant '
        + 'sawblade construct down the whole track.',
  },
  {
    id: 'streak', name: 'Streak', role: 'Speedster', art: Art.streak,
    rarity: 'Epic', rarityColor: '#ffd23f', glow: 'rgba(255,200,60,.45)',
    range: 142, cooldown: .28, damage: 1, kind: 'ray', color: '#ffd23f', rayColor: '#ffe27a',
    tags: ['electric', 'speed'],
    ability: {
      kind: 'overdrive',
      name: 'Overdrive',
      charges: [1, 2, 3],
      duration: [5, 6.5, 8],
      hint: 'Click Streak to go supersonic',
    },
    desc: 'Snaps off quick lightning jabs. Click him to enter Overdrive — a burst of supersonic '
        + 'fire where every shot forks between targets.',
  },
  {
    id: 'paragon', name: 'Paragon', role: 'Solar Sentinel', art: Art.paragon,
    rarity: 'Legendary', rarityColor: '#4fa8ff', glow: 'rgba(90,170,255,.45)',
    range: 182, cooldown: 1.25, damage: 2, pierce: 2, projSpeed: 660, kind: 'dart',
    color: '#4fa8ff', tags: ['solar'],
    ability: {
      kind: 'lance',
      name: 'Solar Lance',
      charges: [1, 2, 3],
      duration: [2.2, 2.8, 3.4],
      hint: 'Click Paragon to fire the lance',
    },
    desc: 'Hurls heavy solar bolts. Click him to open his eyes and sweep a blinding beam across '
        + 'the field, burning everything it touches.',
  },
  {
    id: 'nocturne', name: 'Nocturne', role: 'Dark Detective', art: Art.nocturne,
    rarity: 'Epic', rarityColor: '#8fa8d8', glow: 'rgba(120,150,210,.4)',
    range: 165, cooldown: .8, damage: 2, pierce: 4, projSpeed: 520, kind: 'dart',
    color: '#8fa8d8', tags: ['mind', 'kinetic'],
    ability: {
      kind: 'mark',
      name: 'Prep Time',
      charges: [1, 2, 3],
      duration: [6, 8, 10],
      hint: 'Click Nocturne to mark the field',
    },
    desc: 'No powers — just a batarang that cuts through a whole file of troopers. His prep work '
        + 'marks every hostile on the field so everything you own hits them twice as hard.',
  },
  {
    id: 'ironclad', name: 'Ironclad', role: 'Arc Armorer', art: Art.ironclad,
    rarity: 'Legendary', rarityColor: '#ff8a5c', glow: 'rgba(255,140,80,.42)',
    range: 172, cooldown: .5, damage: 2, pierce: 1, projSpeed: 720, kind: 'dart',
    color: '#e04b3a', tags: ['tech'],
    ability: {
      kind: 'missiles',
      name: 'Micro-Missile Barrage',
      charges: [1, 2, 3],
      salvo: [8, 12, 18],
      hint: 'Click Ironclad to empty the pods',
    },
    desc: 'Repulsor bolts on a fast cycle. His shoulder pods snap open and empty a swarm of '
        + 'homing micro-missiles across the field.',
  },
  {
    id: 'havoc', name: 'Havoc', role: 'Rage Titan', art: Art.havoc,
    rarity: 'Legendary', rarityColor: '#6ccf52', glow: 'rgba(110,210,80,.42)',
    range: 96, cooldown: 1.5, damage: 5, kind: 'smash', color: '#6ccf52', tags: ['kinetic'],
    ability: {
      kind: 'thunderclap',
      name: 'Thunderclap',
      charges: [1, 2, 3],
      radius: [230, 280, 340],
      hint: 'Click Havoc to bring both fists down',
    },
    desc: 'Hits like a falling building but only at arm’s length. Thunderclap flattens everything '
        + 'in a huge radius, stuns it and throws it back down the route.',
  },
  {
    id: 'jester', name: 'Jester', role: 'Chaos Agent', art: Art.jester,
    rarity: 'Legendary', rarityColor: '#b06cf0', glow: 'rgba(175,110,240,.42)',
    range: 155, cooldown: .62, damage: 1, pierce: 2, projSpeed: 560, kind: 'cards',
    color: '#a35cd8', tags: ['mind', 'chaos'],
    ability: {
      kind: 'wildcard',
      name: 'Wild Card',
      charges: [1, 2, 3],
      hint: 'Click Jester and see what happens',
    },
    desc: 'Fans out razor cards for wildly inconsistent damage. Wild Card deals every hostile on '
        + 'the field a random fate — blown up, stunned, sent marching backwards, or shaken down '
        + 'for pocket money.',
  },
  {
    id: 'webline', name: 'Webline', role: 'Wall-Crawler', art: Art.webline,
    rarity: 'Epic', rarityColor: '#e0433f', glow: 'rgba(224,67,63,.4)',
    range: 158, cooldown: .34, damage: 1, pierce: 2, projSpeed: 700, kind: 'dart',
    color: '#e0433f', tags: ['agility'],
    web: { slow: .45, time: 2.2 },
    ability: {
      kind: 'webzone',
      name: 'Web Zone',
      charges: [1, 2, 3],
      duration: [5, 7, 9],
      radius: [140, 165, 195],
      hint: 'Click Webline to string the route',
    },
    desc: 'Quick web-shots that gum troopers up as they run. Web Zone strings the whole area and '
        + 'anything crossing it crawls.',
  },
  {
    id: 'skyforge', name: 'Skyforge', role: 'Storm Smith', art: Art.skyforge,
    rarity: 'Legendary', rarityColor: '#b8c3d8', glow: 'rgba(170,215,255,.45)',
    range: 176, cooldown: 1.15, damage: 3, kind: 'chain', chains: 3,
    color: '#aeb8ca', tags: ['electric', 'storm'],
    ability: {
      kind: 'stormcall',
      name: 'Storm Call',
      charges: [1, 2, 3],
      strikes: [10, 16, 24],
      hint: 'Click Skyforge to call the sky down',
    },
    desc: 'A thrown hammer that arcs between targets. Storm Call drops a barrage of lightning '
        + 'bolts across the whole route, one after another.',
  },
  {
    id: 'bulwark', name: 'Bulwark', role: 'Shield Bearer', art: Art.bulwark,
    rarity: 'Epic', rarityColor: '#3f6fd0', glow: 'rgba(90,150,235,.42)',
    range: 168, cooldown: .95, damage: 2, pierce: 6, projSpeed: 480, kind: 'dart',
    color: '#3f6fd0', tags: ['kinetic'],
    ability: {
      kind: 'rally',
      name: 'Rally',
      charges: [1, 2, 3],
      duration: [6, 8, 10],
      hint: 'Click Bulwark to rally the line',
    },
    desc: 'A ricocheting shield that cuts through a whole column. Rally hardens the whole '
        + 'defence: every tower and hero fires far faster while it holds.',
  },
  {
    id: 'valkyra', name: 'Valkyra', role: 'Warrior Princess', art: Art.valkyra,
    rarity: 'Legendary', rarityColor: '#e8b93f', glow: 'rgba(232,185,63,.45)',
    range: 132, cooldown: .55, damage: 4, kind: 'smash',
    color: '#d84a3c', tags: ['kinetic', 'mystic'],
    ability: {
      kind: 'lasso',
      name: 'Lasso of Truth',
      charges: [1, 2, 3],
      duration: [4, 5.5, 7],
      hint: 'Click Valkyra to bind the line',
    },
    desc: 'Sword and bracers at close quarters, hitting everything in reach. The lasso binds every '
        + 'hostile on the field in place and drags them backwards.',
  },
  {
    id: 'arcanist', name: 'Arcanist', role: 'Sorcerer Supreme', art: Art.arcanist,
    rarity: 'Legendary', rarityColor: '#ff8a3d', glow: 'rgba(255,150,80,.45)',
    range: 190, cooldown: 1.35, damage: 3, pierce: 3, projSpeed: 560, kind: 'dart',
    color: '#ff8a3d', tags: ['mystic'],
    ability: {
      kind: 'portal',
      name: 'Mirror Portal',
      charges: [1, 2, 3],
      send: [.35, .5, .68],
      hint: 'Click Arcanist to fold the route',
    },
    desc: 'Bolts of raw spellwork that punch through ranks. Mirror Portal opens a gate under the '
        + 'legion and drops every hostile a long way back down the route.',
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
