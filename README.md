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
npx vite-node scripts/calibrate.ts   # win/death rates per difficulty and level, single fights
npx vite-node scripts/tune.ts        # deaths per contract and wipes at several difficulty scales
npx vite-node scripts/variety.ts     # how many different monsters a long run throws at the companies
```

## How the world ticks

One tick is one in-game hour. Every tick:

1. **Trouble finds a holding.** Every employer (noble houses, merchants, factions,
   the temple) owns interests: a mine, a stretch of road, the docks, a mountain
   pass, a shrine. Each kind of interest attracts its own threats (goblins and
   dragons for mines, pirates and sea raiders for the harbour, giants for the
   pass...). When trouble strikes, the holding stops paying and the owner posts a
   contract: two to six encounters with independently rolled difficulties, and a
   reward drawn from what the holding is worth and what the treasury can afford.
   Only the first encounter is public. A company with coin to spare buys a round
   at the tavern to learn how long the job is and what else waits; whatever is
   still unknown comes out when they reach the place.
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

Contracts are posted at the levels of the companies actually in town, never below
the greenest of them. A company takes work at its own level only; after a slow day
it will stretch one level either way, never more, so the small jobs stay for the
companies that need them. Reputation grows with every completed contract; among contracts at its
level a company picks the most reputable employer.

## Coin, and what to do with it

Adventurers spend in real shops, and every coin lands in that shop's treasury:

- **Innkeeper**: rooms after every contract, and a night of carousing after a clean
  success. Tales told in the tavern raise the company's renown; famous companies get
  first pick of the board.
- **Apothecary**: healing potions, drunk between encounters.
- **Smith**: three tiers of armour (+1 AC each, real in combat), and the odd +1 weapon.
- **Temple**: resurrections, blessings (extra hit points for the next contract), and
  a few holy items.
- **Enchanter**: the only shop that trades in magic items in earnest. Also buys loot
  the company cannot use and puts it back on sale, which is where most of the supply
  comes from.
- **Adventurers' Guild**: weekly dues. Noble houses and factions post everything
  above level 1 through the guild, members only.

Magic items are scarce on purpose: a thin catalogue in `src/items/items.ts`, shops
that restock one item every few days at most, and contracts that rarely pay in kind
(old places like archives, catacombs and shrines more often). Each item maps onto a
real engine override: AC, weapon attack and damage, hit points, speed, resistances.

When a company is wiped out, its gold and everything it carried stays on the field,
and the next company to clear that holding finds it among the bones. The fallen a
retreating company leaves behind lose their gear the same way.

A level 8 adventurer whose company holds 25,000 gp retires: they buy a business,
become an employer, and their old company gets a day's first refusal on any contract
they post.

Every threat draws on a roster built from the curated names in `src/quests/themes.ts`
plus every SRD monster of the matching creature type (about 190 different monsters
show up over a long run). A fight is a single big monster, a horde of one kind, a
leader with minions, or a mix of two or three kinds.

Encounters are built from the DMG 2024 XP thresholds shipped with the engine, one
tier lower than the book says because the engine's AI fights to the death and this
game chains three fights. Two house rules keep companies alive: once half of them
are down and the enemy still has most of its hit points, the survivors flee (the
fallen are left behind); and a company that wins but is battered abandons the
contract and walks home. `scripts/calibrate.ts` measures single fresh fights;
`scripts/tune.ts` runs whole towns at several difficulty scales and reports deaths
per contract and companies wiped. The default scale (1.25, `?difficulty=` in the
URL) gives most of a death per contract and a wiped company every few days.

## Layout

```
src/core        seeded RNG, XP table, name generators
src/adventurers heroes (class, level, hp, xp, gear) and parties (merging, stash, renown)
src/items       magic item catalogue and effects
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
