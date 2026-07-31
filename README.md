# Void Bastion — hero collector demo

A round-based tower-defense campaign that runs in the browser. **Six cities, 30
missions, 30 maps, 15 collectible heroes**, counter escorts built to shut your
roster down, and a warlord waiting at the end of every city.

**Play it:** open `index.html` in any modern browser. No build step, no server,
no dependencies, no asset files — every sprite is drawn procedurally on canvas
and all sound is synthesised with WebAudio.

## The loop

1. Pick a level from the campaign screen. Levels unlock in order.
2. Place towers and up to **two heroes** on open ground (not on the route).
3. Start a round; troopers march the route and cost you lives if they reach the
   bastion. Kills pay cash.
4. Clear every round in a level to win it. The clear pays a little; **stars pay
   properly** — 10 / 30 / 80 gems the first time you reach each one, plus a
   250+ bounty for taking every star in a city.
5. Spend gems on cases: a **Field Case** (220) is mostly Rares, a **Vault Case**
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
second, three from the third on — so the early missions are solved with towers.
From the second city, later missions open a **second road** and the legion
arrives from two directions at once.

**Stars** come from how much of the bastion survived: 3★ needs 90% of your
lives, 2★ needs 55%, 1★ is any clear. Every mission's route is generated from
its own seed — 30 distinct maps that never change between plays — and difficulty
is driven by the global mission number, so mission 30 fields roughly ten times
the legion of mission 1.

## The Void Legion

Five grades of trooper — Grunt, Scout, Ranger, Shocker, Elite — where each tier
is a heavier grade of armour. Damage strips one grade at a time, so an Elite
sheds plating down through the ranks before it drops. **Dreadnought** walkers
take sustained fire and spill a squad of Shockers when they break.

## Counter escorts

From level 3 the legion sends escorts built to shut specific heroes down. Each
carries a **tag** it works against, and every hero carries tags of its own — so
the two heroes you bring are a real decision, not a power ranking. **Towers are
never affected**, so a counter wave is a problem to solve rather than a loss.

| Escort | Effect |
|---|---|
| **Riftstone Carrier** | Aura suppresses `solar` — Paragon goes dark near it |
| **Static Dampener** | Aura suppresses `tech` and `electric` — Ironclad, Volt, Streak stall |
| **Ash Shroud** | Aura suppresses `mind` (Nocturne, Jester); immune to `fire` (Ember) |
| **Amber Ring** | Flatly immune to `construct` — Verdant's beam and saw do nothing |

A suppressed hero drains of colour, wears a struck-through ring in the jammer's
colour, stops firing and can't use its ultimate until the escort is dead or out
of range. `kinetic` heroes — **Terra** and **Havoc** — are never countered, so
brute force always has a seat.

## Heroes

Only **two may be deployed per mission**, so the roster choice is part of the
level.

| Hero | Role | Tags | Ability |
|---|---|---|---|
| **Ember** | Flame Archer | fire | Fast arrows that ignite troopers |
| **Volt** | Storm Caller | electric | Forked lightning across four targets |
| **Terra** | Stone Warden | kinetic | Ground slam: area damage, knockback, slow |
| **Verdant** | Ring Bearer | construct | Ring beam + **Buzzsaw Construct** |
| **Streak** | Speedster | electric, speed | Lightning jabs + **Overdrive** |
| **Paragon** | Solar Sentinel | solar | Solar bolts + **Solar Lance** |
| **Nocturne** | Dark Detective | mind, kinetic | Piercing batarang + **Prep Time** |
| **Ironclad** | Arc Armorer | tech | Repulsor bolts + **Micro-Missile Barrage** |
| **Havoc** | Rage Titan | kinetic | Arm's-length smash + **Thunderclap** |
| **Jester** | Chaos Agent | mind, chaos | Razor cards + **Wild Card** |
| **Webline** | Wall-Crawler | agility | Web-shots that slow + **Web Zone** |
| **Skyforge** | Storm Smith | electric, storm | Arcing hammer + **Storm Call** |
| **Bulwark** | Shield Bearer | kinetic | Ricochet shield + **Rally** |
| **Valkyra** | Warrior Princess | kinetic, mystic | Close-quarters sweep + **Lasso of Truth** |
| **Arcanist** | Sorcerer Supreme | mystic | Piercing bolts + **Mirror Portal** |

Ember is the starter; every other hero comes out of crates.

### Clickable ultimates

Three heroes have an ability you fire yourself — **click the hero on the map**,
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

**An ultimate has to be earned.** Most heroes unlock theirs only at **level 3**
— a 3500 investment — and get a **single use per round**. The lighter kits
(Streak, Nocturne, Webline, Bulwark, Quiver, Sable) unlock at level 2 and get
two. Charge pips float above the hero, and the inspect panel says what is still
locked.

Upgrades are flat and steep: **500 then 1500** for a tower, **1000 then 2500**
for a hero. Maxing one hero is most of a mission's income.

## Towers

Dart Sentry ($200) · Tack Ring ($320) · Frost Totem ($380) · Bomb Lobber ($480).
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
| `1`–`4` | Quick-select a tower |
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
css/styles.css    menu, campaign, collection, HUD, crate animations
js/utils.js       math, colour, path and seeded-RNG helpers
js/data.js        maps, troop tiers, campaign, tower/hero defs + all artwork
js/save.js        localStorage profile (gems, heroes, campaign progress)
js/audio.js       WebAudio synthesis
js/game.js        simulation and rendering
js/ui.js          screens, campaign select, shop, crate ceremony
js/main.js        boot + render loop
```

Console handle for tinkering: `BB.game`, `BB.Save`, `BB.UI`.

## Demo scope

30 missions across 6 cities on 30 generated maps, 15 heroes, 4 towers, 5 troop
grades, 4 counter escorts, 6 city warlords and Dreadnought walkers that get
tougher as the campaign runs. No meta progression beyond crate unlocks, stars
and city unlocks; hero levels reset each run.

Every hero, warlord and city here is an original built for this demo — not a
licensed one. The Void Legion, its counter escorts and the six cities are
likewise this demo's own.
