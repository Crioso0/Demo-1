# Balloon Bastion — hero collector demo

A round-based balloon tower-defense demo that runs in the browser. You start with
one hero, earn gems by clearing rounds, and spend them on crates to unlock the
other three.

**Play it:** open `index.html` in any modern browser. No build step, no server,
no dependencies, no asset files — every sprite is drawn procedurally on canvas
and all sound is synthesised with WebAudio.

## The loop

1. Place towers and heroes on the grass (not on the track).
2. Start a round; balloons walk the track and cost you lives if they reach the
   bastion. Popping them pays cash.
3. Clear a round → cash bonus + **12 gems**. Clear all 15 → **75 gems**.
4. Spend **150 gems** on a hero crate in the Heroes screen. Duplicates refund 75
   gems. Progress is saved to `localStorage`.

Round 10, 14 and 15 send **M.O.A.B.** blimps that take a lot of damage and break
into a pack of yellows.

## Heroes

| Hero | Role | Unlock | Ability |
|---|---|---|---|
| **Ember** | Flame Archer | starter | Fast arrows that ignite balloons for damage over time |
| **Volt** | Storm Caller | crate | Forked lightning that arcs between up to four balloons |
| **Terra** | Stone Warden | crate | Ground slam: area damage, knockback and a slow |
| **Verdant** | Ring Bearer | crate | Weak ring beam, plus a clickable sawblade ultimate |

Heroes cost nothing to deploy but only one of each can be on the map.

### Verdant's ultimate

Verdant is the only hero with an ability you fire yourself. His passive is a
weak green energy beam; **click him on the map** (or press `Q`, or use the green
button in the inspect panel) to grow huge and roll a giant sawblade construct
down the entire track, shredding everything it rolls over.

Charges go by level — **1 use at level 1, 2 at level 2, 3 at level 3** — and the
level-3 construct is bigger, faster, hits harder and runs a second
counter-rotating blade. Charges refill at the start of every round, so the limit
is per round rather than per run. Charge pips float above his head, and he wears
a pulsing ring while a charge is available.

## Towers

Dart Sentry ($200) · Tack Ring ($320) · Frost Totem ($380) · Bomb Lobber ($480).
Everything upgrades twice (more range, faster fire, extra pierce, +1 damage at
level 3) and sells back for 70%.

## Controls

| Input | Action |
|---|---|
| Click shop item, then click map | Place |
| Click a placed unit | Inspect / upgrade / sell |
| `Space` | Start next round |
| `1`–`4` | Quick-select a tower |
| `F` / speed button | 1× → 2× → 3× |
| `Q` / click Verdant | Fire the sawblade ultimate |
| `Esc` / right-click | Cancel placement |

## Layout

```
index.html        screens + markup
css/styles.css    menu, collection, HUD, crate-opening animations
js/utils.js       math, colour and path helpers
js/data.js        map, balloon tiers, wave table, tower/hero defs + all artwork
js/save.js        localStorage profile (gems, unlocked heroes)
js/audio.js       WebAudio sound effects
js/game.js        simulation and rendering
js/ui.js          screens, shop, hero collection, crate ceremony
js/main.js        boot + render loop
```

Console handle for tinkering: `BB.game`, `BB.Save`, `BB.UI`.

## Demo scope

15 rounds, one map, 4 heroes, 4 towers, 5 balloon tiers + blimps. No meta
progression beyond the crate unlocks, and hero levels reset each run.

Verdant is an original character built for this demo — a green ring-construct
hero, not a licensed one.
