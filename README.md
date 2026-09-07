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

1. **Trouble finds a holding.** Every employer (noble houses, merchants, factions,
   the temple) owns interests: a mine, a stretch of road, the docks, a mountain
   pass, a shrine. Each kind of interest attracts its own threats (goblins and
   dragons for mines, pirates and sea raiders for the harbour, giants for the
   pass...). When trouble strikes, the holding stops paying and the owner posts a
   contract: three encounters with independently rolled difficulties, and a reward
   drawn from what the holding is worth and what the treasury can afford.
2. **Companies arrive.** Every so often four level-1 adventurers turn up at the
   tavern. A broken company that has waited too long attracts a small band of
   its own level instead.
3. **Companies act**: `idle -> traveling -> questing (3 fights) -> returning ->
   resting -> idle`. Idle companies with spare coin buy potions at the apothecary
   and armour at the smith; on return they pay the innkeeper. Dead members are
   carried to the temple and raised if the purse covers the fee, otherwise the
   company waits to merge with another incomplete company of its level.
4. **Once a day the books close.** Employers collect from safe holdings (half from
   threatened ones, nothing from overrun ones) and pay their upkeep. A completed
   contract returns the holding to business plus a windfall of several days of its
   income; a contract nobody answers means looters strip the holding, which stays
   overrun until someone retakes it. Three days in the red and an employer is ruined.
   Coin adventurers spend in town lands in the shopkeepers' treasuries, so a busy
   town keeps its own economy turning.

Reputation grows with every completed contract; idle companies pick the most
reputable employer among contracts at their level.

Encounters are built from the DMG 2024 XP thresholds shipped with the engine, one
tier lower than the book says because the engine's AI fights to the death and this
game chains three fights. Two house rules keep companies alive: once half of them
are down and the enemy still has most of its hit points, the survivors flee (the
fallen are left behind); and a company that wins but is battered abandons the
contract and walks home. `scripts/calibrate.ts` measures single fresh fights.

## Layout

```
src/core        seeded RNG, XP table, name generators
src/adventurers heroes (class, level, hp, xp) and parties (merging, level)
src/town        employers, their holdings (assets) and the threats each kind attracts
src/quests      threat rosters (SRD monsters), encounter builder, quest generator
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
