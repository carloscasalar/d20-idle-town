# d20 Town

An idle game set in a fantasy town. Nobles, merchants and factions post D&D-style
contracts, companies of four adventurers show up at the tavern, take the contracts,
fight three encounters (each easy, intermediate or hard), level up, die, get raised
at the temple or merge with other broken companies of the same level. You watch.

Combat is resolved by [battlecast-engine](https://github.com/bjedrzejewski/battlecast-engine),
a D&D 5e (2024 SRD) rules engine with 317 monsters and 12 hero classes, used as a
plain library (no MCP server involved). The town, its people and the quests are
generated procedurally in this repo.

## Run

```bash
npm install
npm run dev        # http://localhost:5173  (add ?seed=anything for a reproducible town)
npm test           # vitest: unit tests + a deterministic 400-hour smoke simulation
npm run build      # typecheck + production bundle in dist/
npx vite-node scripts/calibrate.ts   # win/death rates per difficulty and level
```

## How the world ticks

One tick is one in-game hour. Every tick:

1. Quest givers whose cooldown expired post a contract at a level close to the
   companies in town. Each contract has a theme (bandits, undead, giants...),
   a place, three encounters with independently rolled difficulties, and a reward.
2. Every so often a new company of four level-1 adventurers arrives. If a broken
   company has been waiting too long for recruits, a small band of the same level
   turns up instead.
3. Each company advances its state machine:
   `idle -> traveling -> questing (3 fights) -> returning -> resting -> idle`.
   On return the reward is paid, XP is split among survivors, level-ups apply.
   Dead members are carried to the temple; if the purse covers the priests' fee they
   are raised, otherwise the company waits for another incomplete company of its
   level to merge with. A company that loses everyone is gone for good.

Encounters are built from the DMG 2024 XP thresholds shipped with the engine, one
tier lower than the book says because the engine's AI fights to the death and this
game chains three fights. Two house rules keep companies alive: once half of them
are down and the enemy still has most of its hit points, the survivors flee (the
fallen are left behind); and a company that wins but is battered abandons the
contract and walks home. `scripts/calibrate.ts` measures single fresh fights:
easy ~100% wins, intermediate ~95%, hard ~80-90% with about half a death per fight
at the levels companies reach first. A 400-hour smoke run (`npm test`) ends with
roughly 130 contracts completed, 25 deaths, 15 resurrections and 2 companies wiped.

## Layout

```
src/core        seeded RNG, XP table, name generators
src/adventurers heroes (class, level, hp, xp) and parties (merging, level)
src/town        town generation: nobles, merchants, factions, temple, tavern
src/quests      themes (SRD monster rosters), encounter builder, quest generator
src/combat      adapter around battlecast-engine's Encounter API
src/sim         the Game class: tick loop, state machine, event log
src/ui          browser front-end: narrated log + parties / board / town / chronicle
test            vitest
scripts         calibration
```

The simulation has no DOM dependency; `Game` runs the same in tests, Node and the
browser. A pixel-art renderer would subscribe to `game.onEvent` and read
`game.parties` / `game.quests` exactly as the text UI does.

## Credits

Powered by battlecast-engine (MIT). Monster, spell and class data derive from the
D&D 5.2 SRD, CC-BY-4.0 by Wizards of the Coast.
