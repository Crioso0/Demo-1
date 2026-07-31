# Void Bastion — hero collector demo

A round-based tower-defense campaign that runs in the browser. **Six cities, 30
missions, 30 maps, 28 collectible heroes, 8 base units**, squad synergies, hero
mastery that carries between runs, counter escorts built to shut your roster
down, and a warlord waiting at the end of every city.

**Play it:** open `index.html` in any modern browser. No build step, no server,
no dependencies, no asset files — every sprite is drawn procedurally on canvas
and all sound is synthesised with WebAudio.

## The loop

1. Pick a mission from the campaign screen. Missions unlock in order.
2. **Choose your squad.** Every mission opens on a loadout screen: the whole
   roster laid out with class, tags, ultimate and mastery, filterable by class or
   by what you own. Tags the mission's counter escorts shut down are flagged red,
   and the panel beside the grid lights up every **synergy** your picks have
   earned. Only the heroes you bring appear in the in-game shop.
3. Place units and your chosen heroes on open ground (not on the route).
4. Start a round; troopers march the route and cost you lives if they reach the
   bastion. Kills pay cash, and **finishing a round pays a bonus that ramps** —
   small early, several times larger by the last rounds, so a mission's back half
   is where you can actually afford to max something out.
5. Clear every round in a mission to win it. The clear pays a little; **stars pay
   properly** — 10 / 30 / 80 gems the first time you reach each one, plus a
   250+ bounty for taking every star in a city.
6. Spend gems on cases: a **Field Case** (220) is mostly Rares, a **Vault Case**
   (750) is where Legendaries actually come from. Both spin a reel that lands on
   what you won. Duplicates refund by rarity. Progress is saved to
   `localStorage`.

## The campaign

Six cities of five missions each. Clearing a mission opens the next one;
**taking all three stars on every mission in a city is what opens the next
city**, so the campaign asks you to go back and play well, not just play on.

| City | Theme | Warlord | Its trick |
|---|---|---|---|
| **Solaris City** | the shining city | The Magnate | Deploys a drone screen on a timer |
| **Grimhaven** | the rain city | Mister Grin | Laughing gas: the nearest hero stops working |
| **Tempest Bay** | the storm coast | Maelstrom | Surge pulse: every tower in reach goes dark |
| **Ashfall Reach** | the burning flats | The Cinderlord | Knits its own plating back together |
| **Frostline Expanse** | the white silence | The Rimewarden | Flash-freezes everything you own |
| **The Emerald Reach** | the cosmos | The Void Sovereign | Null pulse: every hero offline, and reinforcements |

**Hero slots grow with the campaign** — one in the first city, two in the
second, three from the third on — so the early missions are solved with units,
and the loadout screen only lets you take as many heroes as the mission allows.
Every map has **one road**; the pressure comes from the waves on it, not from
splitting your attention.

**Stars** come from how much of the bastion survived: 3★ needs 90% of your
lives, 2★ needs 55%, 1★ is any clear. Every mission's route is generated from
its own seed — 30 distinct maps that never change between plays — and difficulty
is driven by the global mission number, so mission 30 fields roughly ten times
the legion of mission 1.

## The Void Legion

Five grades of trooper — Grunt, Scout, Ranger, Shocker, Elite — where each tier
is a heavier grade of armour. Damage strips one grade at a time, so an Elite
sheds armour down through the ranks before it drops. **Dreadnought** walkers
take sustained fire and spill a squad of Shockers when they break.

From the third city the legion starts welding **plating** on: extra layers,
drawn as rings around the trooper, that have to come off *before* its armour
grades do. Plating grows with the mission number, so the late campaign is heavy
because every trooper is heavy — not because there is simply more of them. It is
also what stops one big hit deleting a pack: plating wants sustained fire.

## Counter escorts

From level 3 the legion sends escorts built to shut specific heroes down. Each
carries a **tag** it works against, and every hero carries tags of its own — so
the squad you pick on the loadout screen is a real decision, not a power ranking.
**Base units are never affected**, so a counter wave is a problem to solve rather
than a loss.

| Escort | Effect |
|---|---|
| **Riftstone Carrier** | Aura suppresses `solar` — Paragon goes dark near it |
| **Static Dampener** | Aura suppresses `tech` and `electric` — Ironclad, Volt, Streak stall |
| **Ash Shroud** | Aura suppresses `mind` (Nocturne, Jester); immune to `fire` (Ember) |
| **Amber Ring** | Flatly immune to `construct` — Verdant's beam and saw do nothing |

A suppressed hero drains of colour, wears a struck-through ring in the jammer's
colour, stops firing and can't use its ultimate until the escort is dead or out
of range. `kinetic` heroes — **Terra**, **Havoc**, **Breaker** — are never
countered, so brute force always has a seat.

## Classes

There are two ways for a hero to be worth a slot, and one kind that is both.

| Class | On the field | On the button |
|---|---|---|
| **Vanguard** | +30% damage, ~18% faster cycle, a little more reach | ultimate lands at 75% |
| **Specialist** | −15% damage, ~15% slower cycle | ultimate lands at **150%** |
| **Icon** | +15% damage, slightly faster, slightly longer | ultimate lands at 120% |

**Every Legendary is an Icon** — no trade-off at all, which is what the case
chase is for. Everything below Legendary is one or the other, so a good squad
usually pairs someone who holds the line with someone who breaks it.

## Squad synergies

Who you bring *together* is its own layer. Ten rules, checked live as you pick,
stacking freely — the panel next to the grid lights up the ones you have earned
and greys the ones still within reach.

| Synergy | Needs | Gives |
|---|---|---|
| **Storm Front** | two `storm`/`electric` heroes | +25% hero damage, 10% faster |
| **Old Guard** | a Vanguard and a Specialist | +10% damage, **+1 ultimate charge each** |
| **Trinity** | three Icons | +18% damage, +10% reach, ultimates +20% |
| **Street Level** | two `kinetic`/`agility`/`tech` heroes | units 15% cheaper, upgrades 12% cheaper |
| **Mystic Circle** | two `mystic` heroes | ultimates land and last **35%** harder |
| **Science Division** | two `tech` heroes | every base unit fires 18% faster, upgrades −15% |
| **Brute Squad** | two `kinetic` heroes | +20% damage, and knockback shoves **twice as far** |
| **Shadow Ops** | two `mind` heroes | +20% cash from kills, ultimates +15% |
| **Solo Act** | one hero on a map that offered more | +45% damage, +12% reach, +1 charge, 250 to start |
| **Full House** | one of every class | +25% cash from kills, heroes 8% faster |

The chips stay pinned above the shop for the whole mission, so you always know
what you are running on.

## Hero mastery

A hero you keep bringing gets better at the job, permanently. Clearing a mission
pays every hero that took the field experience worth the mission number, scaled
by the stars you took. Three ranks:

| Rank | At | Perk |
|---|---|---|
| **Veteran** | 40 | +8% damage |
| **Elite** | 140 | +10% reach |
| **Legend** | 340 | **+1 ultimate charge** |

Mastery shows as pips and a bar on every hero card, on the squad screen and in
the collection, and the result card shows what the run earned. It is the only
progression that survives a run other than the roster itself — the heroes you
actually play become the heroes you rely on.

## Heroes

The squad is chosen **before** the mission on the loadout screen, up to the
mission's slot count, so the roster choice is a decision you make with the map's
escorts in front of you rather than a rail of twenty icons mid-fight. Each card
carries the hero's class, tags and ultimate.

| Hero | Class | Role | Tags | Ability |
|---|---|---|---|---|
| **Ember** | Vanguard | Flame Archer | fire | Fast arrows that ignite troopers |
| **Volt** | Vanguard | Storm Caller | electric | Forked lightning across four targets |
| **Terra** | Vanguard | Stone Warden | kinetic | Ground slam: area damage, knockback, slow |
| **Verdant** | Icon | Ring Bearer | construct | Ring beam + **Buzzsaw Construct** |
| **Streak** | Specialist | Speedster | electric, speed | Lightning jabs + **Overdrive** |
| **Paragon** | Icon | Solar Sentinel | solar | Constant eye beams + **Solar Lance** |
| **Nocturne** | Specialist | Dark Detective | mind, kinetic | Piercing batarang + **Prep Time** |
| **Ironclad** | Icon | Arc Armorer | tech | Repulsor bolts + **Micro-Missile Barrage** |
| **Havoc** | Icon | Rage Titan | kinetic | Arm's-length smash + **Thunderclap** |
| **Jester** | Icon | Chaos Agent | mind, chaos | Razor cards + **Wild Card** |
| **Webline** | Vanguard | Wall-Crawler | agility | Web-shots that slow + **Web Zone** |
| **Skyforge** | Icon | Storm Smith | electric, storm | Arcing hammer + **Storm Call** |
| **Bulwark** | Specialist | Shield Bearer | kinetic | Ricochet shield + **Rally** |
| **Valkyra** | Icon | Warrior Princess | kinetic, mystic | Close-quarters sweep + **Lasso of Truth** |
| **Arcanist** | Icon | Sorcerer Supreme | mystic | Piercing bolts + **Mirror Portal** |
| **Quiver** | Vanguard | Marksman | kinetic | Longest-reach heavy arrows + **Full Quiver** |
| **Tempest** | Specialist | Weather Witch | storm | A standing cold front + **Downpour** |
| **Sable** | Vanguard | Infiltrator | kinetic, tech | Fast close-range baton work + **Expose** |
| **Adamant** | Icon | Storm Tyrant | electric, storm | Chained lightning + **Judgement** |
| **Breaker** | Icon | Engine of Ruin | kinetic | Bone-crushing smash + **Rampage** |
| **Tide** | Vanguard | Deep King | water, kinetic | A sheet of water that shoves + **Riptide** |
| **Wraith** | Specialist | The Watcher | mind | Psychic chain + **Mindwipe** |
| **Claw** | Vanguard | The Feral | kinetic | Short, fast, **never suppressed** + **Frenzy** |
| **Blink** | Vanguard | The Displaced | agility, mystic | Quick shots + **Fold Space** |
| **Nova** | Specialist | Cosmic Ace | solar, cosmic | Piercing photon bolts + **Binary** |
| **Circuit** | Icon | Machine Mind | tech | Tech beam **and a buff field** + **Overclock** |
| **Panther** | Icon | Kinetic Stalker | kinetic, tech | Fast claw strikes + **Kinetic Release** |
| **Hex** | Icon | Reality Witch | mystic, chaos | Hex bolts + **Unmake** |

Ember is the starter; every other hero comes out of cases.

**Paragon is the rarest thing in the game.** He pulls at roughly a quarter
the rate of any other Legendary, and he is built to feel unfair when you get
him: no projectile at all, just a pair of heat beams straight out of his eyes
that connect the instant they fire — nothing to lead, nothing to dodge. Every
few seconds he comes down on the road in a shockwave, or freezes the whole
field with a breath, both on their own timers with nothing to click. The lance
is only the part you aim.

### Clickable ultimates

Most heroes have an ability you fire yourself — **click the hero on the map**,
press `Q`, or use the green button in the inspect panel.

- **Buzzsaw Construct** (Verdant) — he swells and rolls a giant sawblade the
  full length of the route, shredding everything it passes.
- **Overdrive** (Streak) — a burst of supersonic fire where every shot forks
  between three targets. A ring around him counts the window down.
- **Solar Lance** (Paragon) — a blinding sustained beam that tracks the leading
  trooper and burns everything in the line.
- **Prep Time** (Nocturne) — no powers, just homework: marks every hostile on
  the field so **everything you own hits them twice as hard** for the duration.
  The strongest setup tool in the game.
- **Micro-Missile Barrage** (Ironclad) — his pods snap open and empty up to 18
  homing micro-missiles that seek targets and detonate.
- **Thunderclap** (Havoc) — both fists down: huge-radius damage that stuns
  everything caught and throws it back down the route.
- **Wild Card** (Jester) — every hostile draws its own fate: blown up, stunned,
  turned around to march backwards, or shaken down for pocket money.
- **Web Zone** (Webline) — strings a stretch of the route; anything crossing it
  crawls.
- **Storm Call** (Skyforge) — a walking barrage of lightning bolts down the
  whole route.
- **Rally** (Bulwark) — every tower and hero on the field fires at **double
  rate** while it holds.
- **Lasso of Truth** (Valkyra) — binds every hostile in place and drags them
  backwards.
- **Mirror Portal** (Arcanist) — folds the route and drops the entire legion up
  to two thirds of the way back.
- **Judgement** (Adamant) — the sky opens over the whole map and a standing
  lightning field burns everything on the route for the duration.
- **Rampage** (Breaker) — he goes berserk: double reach, and every kill makes the
  next swing faster.
- **Riptide** (Tide) — the whole route becomes a river: everything on it wades,
  and takes the current for the duration.
- **Mindwipe** (Wraith) — the legion's orders are erased: they turn around and
  march back the way they came, taking double from everything on the way.
- **Frenzy** (Claw) — damage stacks with every kill and holds for the window.
  He is also the only hero **no escort can suppress**, ever.
- **Fold Space** (Blink) — folds the leading half of the road back down the
  route. Cheap, repeatable, and it buys the line real time.
- **Binary** (Nova) — she lights up and burns a standing beam down the road for
  the duration.
- **Overclock** (Circuit) — the whole field into the red: **every unit you own
  fires at triple rate** until it burns out.
- **Kinetic Release** (Panther) — the suit drinks every impact the round throws
  at it and gives the lot back in one shockwave. The worse the fight, the bigger
  the answer.
- **Unmake** (Hex) — the plating simply stops having happened, across the whole
  field, and the survivors drop a grade. The clean answer to a late-campaign
  wave.
- **Full Quiver** (Quiver) — empties the quiver in one volley down the route.
- **Downpour** (Tempest) — drowns the whole field: everything slows to a crawl.
- **Expose** (Sable) — finds the seams in every suit of armour on the map.

**An ultimate has to be earned.** Most heroes unlock theirs only at **level 3**
— a 3500 investment — and get a **single use per round**. The lighter kits
(Streak, Nocturne, Webline, Bulwark, Quiver, Sable) unlock at level 2 and get
two. Charge pips float above the hero, and the inspect panel says what is still
locked.

Upgrades are flat and steep: **500 then 1500** for a tower, **1000 then 2500**
for a hero. Maxing one hero is most of a mission's income.

## Base units

Eight of them, named for what they are rather than what they shoot:

| Unit | Cost | What it does |
|---|---|---|
| **Auto-Sentry** | $200 | The cheap workhorse — single-target, fast |
| **Precinct Squad** | $300 | A city patrol: two officers, steady paired fire |
| **Shrapnel Ring** | $320 | Fires a ring of shrapnel in every direction |
| **Frost Pylon** | $380 | Chills everything in reach so it walks slower |
| **Mortar Post** | $480 | Lobs a shell that detonates on impact |
| **Cryo Battery** | $620 | A deep freeze — heavy slow over a wide radius |
| **Relay Mast** | $700 | Fires nothing. Gives every unit in its ring more range and a faster trigger |
| **Siege Tank** | $950 | Slow, enormous shells, tears through armour grades |

Everything upgrades twice (more range, faster fire, extra pierce, +1 damage at
level 3) and sells back for 70%.

## Install it on a phone

The best way to play on a phone is as an installed app — full screen, no browser
chrome, works with no signal, and progress is kept on the device.

**Build it**

```
node build.js --pwa           # writes docs/ (app shell, manifest, service worker)
node tools/make-icons.js      # regenerates the app icons (needs playwright)
```

`docs/` is a complete, self-contained web app: one HTML file with everything
inlined, plus a manifest, icons and an offline service worker.

**Serve it with GitHub Pages** — Settings → Pages → *Deploy from a branch* →
branch `claude/hero-collector-demo-game-dl8kvs`, folder `/docs`. GitHub Pages
needs the repository to be public on a free plan.

**Then on iPhone**: open the Pages URL in Safari → Share → *Add to Home Screen*.
It launches full screen with no Safari UI, and runs offline after the first load.

`node build.js` on its own writes `dist/void-bastion.html`, a single file you can
open directly or hand to anyone — no server needed.

## Phones

The layout responds to the screen it is on. In **portrait** the map goes
full-width with the shop as swipeable rails underneath and a pinned action bar;
in **landscape** it is the map plus a compact icon rail, which is the better way
to play. Overlays scroll so nothing is ever out of reach on a short screen, and
chrome respects the notch and home indicator.

Touch has no hover, so placement is **drag-then-release**: pick a tower, the
ghost and its range appear on the map, drag to position it and lift to build. A
plain tap works too. Tapping a hero selects it *and* fires its ultimate if a
charge is ready. Phones also run a lighter particle budget so a 400-strong wave
stays smooth.

## Controls

| Input | Action |
|---|---|
| Click shop item, then click map | Place |
| Touch: pick, then drag on map and lift | Place |
| Click a placed unit | Inspect / upgrade / sell |
| Click a hero with a charge | Fire their ultimate |
| `Space` | Start next round |
| `1`–`8` | Quick-select a base unit |
| `Q` | Fire an ultimate |
| `F` / speed button | 1× → 2× → 3× |
| `Esc` / right-click | Cancel placement |

## Sound

Every effect is synthesised at runtime — there are no audio files. Each is built
from two primitives (a pitched `tone` and filtered `noise`, both with
attack/hold/decay envelopes and a sweepable cutoff) layered to match the real
thing, mixed through a compressor so a wave of simultaneous kills can't clip.

- **Trooper down** — armour cracking apart over a low thud, with a fizz off the
  ruptured power core. Heavier grades crack lower and duller. A gate thins the
  stack when one trooper sheds several grades in a single frame.
- **Money** — coins burst off every kill, arc, then fly to the counter and land
  with a chime that climbs a semitone per kill in a streak. Round payouts shower
  a dozen coins over a ka-ching. Collection is still automatic and payouts are
  unchanged — this is feedback, not a new mechanic to manage.
- **Sawblade** — a *sustained* voice: a blade tone plus its octave, amplitude-
  modulated at the rate the teeth pass, over grind noise. It spins up, bites on
  each cut, and spins down.
- **Solar Lance** — a sustained searing voice, a detuned pair over a wide band
  of roaring noise, running for as long as the beam burns.
- **Overdrive** — a sonic-boom crack into an electric whine that holds for the
  duration.
- **Explosion** a hard crack with a plateau before the tail, **dart** an airy
  thwip, **tacks** a metallic scatter, **frost** an icy rush, **lightning** a
  bright crackle with a thunder tail, **slam** a deep impact with debris.

## Layout

```
index.html        screens + markup
css/styles.css    menu, campaign, loadout, collection, HUD, case animations
js/utils.js       math, colour, path and seeded-RNG helpers
js/data.js        maps, troop tiers, campaign, unit/hero defs + all artwork
js/save.js        localStorage profile (gems, heroes, campaign progress)
js/audio.js       WebAudio synthesis
js/game.js        simulation and rendering
js/ui.js          screens, campaign select, loadout, shop, case ceremony
js/main.js        boot + render loop
```

Console handle for tinkering: `BB.game`, `BB.Save`, `BB.UI`.

## Demo scope

30 missions across 6 cities on 30 generated maps, 28 heroes in three classes,
10 squad synergies, 3 mastery ranks per hero, 8 base units, 5 troop grades,
plating that thickens with the campaign, 4 counter escorts, 6 city warlords and
Dreadnought walkers that get tougher as the campaign runs. Hero *levels* still
reset each run — mastery is what carries.

Every hero, warlord and city here is an original built for this demo — not a
licensed one. The Void Legion, its counter escorts and the six cities are
likewise this demo's own.
