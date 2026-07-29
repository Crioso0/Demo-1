# Void Bastion — hero collector demo

A round-based tower-defense demo that runs in the browser. Ten levels across four
maps, six collectible heroes, and the Void Legion marching on your bastion.

**Play it:** open `index.html` in any modern browser. No build step, no server,
no dependencies, no asset files — every sprite is drawn procedurally on canvas
and all sound is synthesised with WebAudio.

## The loop

1. Pick a level from the campaign screen. Levels unlock in order.
2. Place towers and up to **two heroes** on open ground (not on the route).
3. Start a round; troopers march the route and cost you lives if they reach the
   bastion. Kills pay cash.
4. Clear every round in a level to win it. Levels pay **gems** (double on first
   clear); a failed run still pays for the rounds you held.
5. Spend **150 gems** on a hero crate. Duplicates refund 75. Progress is saved
   to `localStorage`.

## The campaign

Ten levels, escalating across four maps. Later levels add **Dreadnought**
walkers, **Runners** (faster troopers) and **Shielded** troopers that shrug off
part of every hit.

| # | Level | Map | Rounds | Threats |
|---|---|---|---|---|
| 1 | First Contact | Sentry Ridge | 6 | — |
| 2 | Ridge Patrol | Sentry Ridge | 8 | — |
| 3 | Ashfall Landing | Ashfall Crater | 8 | faster legion |
| 4 | Crater Push | Ashfall Crater | 10 | Dreadnought |
| 5 | Frostline Watch | Frostline Outpost | 10 | runners |
| 6 | Deep Freeze | Frostline Outpost | 12 | shielded, Dreadnought |
| 7 | Ridge Assault | Sentry Ridge | 12 | runners, 2× Dreadnought |
| 8 | Molten Siege | Ashfall Crater | 14 | shielded, 2× Dreadnought |
| 9 | Whiteout | Frostline Outpost | 14 | runners, 3× Dreadnought |
| 10 | The Rift | The Rift | 16 | everything, 4× Dreadnought |

Waves are generated deterministically from the level definition, so a level
always plays the same way but escalates with both round and level number.

## The Void Legion

Five grades of trooper — Grunt, Scout, Ranger, Shocker, Elite — where each tier
is a heavier grade of armour. Damage strips one grade at a time, so an Elite
sheds plating down through the ranks before it drops. **Dreadnought** walkers
take sustained fire and spill a squad of Shockers when they break.

## Heroes

Only **two may be deployed per mission**, so the roster choice is part of the
level.

| Hero | Role | Unlock | Ability |
|---|---|---|---|
| **Ember** | Flame Archer | starter | Fast arrows that ignite troopers |
| **Volt** | Storm Caller | crate | Forked lightning across four targets |
| **Terra** | Stone Warden | crate | Ground slam: area damage, knockback, slow |
| **Verdant** | Ring Bearer | crate | Ring beam + **Buzzsaw Construct** ultimate |
| **Streak** | Speedster | crate | Lightning jabs + **Overdrive** ultimate |
| **Paragon** | Solar Sentinel | crate | Solar bolts + **Solar Lance** ultimate |

### Clickable ultimates

Three heroes have an ability you fire yourself — **click the hero on the map**,
press `Q`, or use the green button in the inspect panel.

- **Buzzsaw Construct** (Verdant) — he swells and rolls a giant sawblade the
  full length of the route, shredding everything it passes.
- **Overdrive** (Streak) — a burst of supersonic fire where every shot forks
  between three targets. A ring around him counts the window down.
- **Solar Lance** (Paragon) — a blinding sustained beam that tracks the leading
  trooper and burns everything in the line.

All three scale the same way: **1 use at level 1, 2 at level 2, 3 at level 3**,
refilled at the start of every round. Charge pips float above the hero.

## Towers

Dart Sentry ($200) · Tack Ring ($320) · Frost Totem ($380) · Bomb Lobber ($480).
Everything upgrades twice (more range, faster fire, extra pierce, +1 damage at
level 3) and sells back for 70%.

## Controls

| Input | Action |
|---|---|
| Click shop item, then click map | Place |
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
- **Money** — a bright metallic ding over a register clunk, then coins settling;
  round payouts add a rising flourish on top.
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

10 levels, 4 maps, 6 heroes, 4 towers, 5 troop grades plus Dreadnought walkers.
No meta progression beyond crate unlocks and level unlocks; hero levels reset
each run.

Verdant, Streak and Paragon are original characters built for this demo — a
ring-construct hero, a speedster and a solar sentinel — not licensed ones, and
the Void Legion is likewise this demo's own.
