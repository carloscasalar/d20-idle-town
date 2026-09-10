# d20 Town

An idle game set in a fantasy town. Nobles, merchants and factions post D&D-style
contracts, companies of four adventurers show up at the tavern, take the contracts,
fight three encounters (each easy, intermediate or hard), level up, die, get raised
at the temple or merge with other broken companies of the same level. You watch.

Combat is resolved by **[battlecast-engine][engine]**, Bartosz Jedrzejewski's D&D 5e
(2024 SRD) rules and combat-state engine — 317 monsters, 12 hero classes, a full
combat AI and deterministic seeded battles — used here as a plain library, no MCP
server involved. Every die in this game is rolled by that engine; the town, its
people, the contracts and the economy are generated procedurally in this repo.
See [Credits and licence](#credits-and-licence).

[engine]: https://github.com/bjedrzejewski/battlecast-engine

## Run

```bash
npm install
npm run dev        # http://localhost:5173  (add ?seed=anything for a reproducible town)
npm test           # vitest: unit tests + a deterministic 400-hour smoke simulation
npm run build      # typecheck + production bundle in dist/
npx vite-node scripts/calibrate.ts   # win/death rates per difficulty and level, single fights
npx vite-node scripts/tune.ts        # deaths per contract and wipes at several difficulty scales
npx vite-node scripts/variety.ts     # how many different monsters a long run throws at the companies
npx vite-node scripts/assault.ts     # how often a level-matched company clears a lair
npx vite-node scripts/lairs.ts       # a long run, lair events only
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
   Only the first encounter is public. Before signing, the company's best talker
   works the tavern (Persuasion DC 15, bards with advantage); the rich pay the
   temple for a divination that shows the whole job; otherwise a round at the
   tavern buys one fact at a time. On the road the best tracker reads the land
   (Survival DC 15, rangers and druids with advantage). Whatever is still unknown
   comes out when they reach the place.
5. **Lairs send the raids.** Two or three lairs (a crime syndicate in the sewers,
   a goblin warcamp, a dragon's roost with kobold slaves, a necromancer's crypt...)
   sit near every town, level 5 to 8, each with a boss. When trouble of a lair's
   kind hits a holding, the raid is theirs; every raid nobody answers makes the
   lair stronger, richer and quicker to strike again. A company wiped out on a
   lair's business feeds its hoard with everything it carried. Once a company in
   town is close to the lair's level, the guild posts a standing bounty: three to
   five fights ending with the boss, no running from the last one. Companies at
   that level take it now and then; about four in ten clear it, at two deaths an
   attempt, and win the hoard, a rare item, renown and a quiet spell for every
   holding that kind of trouble had taken. Some days later something worse moves in.
2. **Companies arrive.** Every so often four level-1 adventurers turn up at the
   tavern, one for each classic role (front line, support, skirmisher, arcane). A broken company that has waited too long attracts a small band of
   its own level instead.
3. **Companies act**: `idle -> traveling -> questing (3 fights) -> returning ->
   resting -> idle`. Idle companies with spare coin buy potions at the apothecary
   and armour at the smith; on return they pay the innkeeper. Dead members are
   carried to the temple and raised if the purse covers the fee, otherwise the
   company waits to merge with another incomplete company of its level: the two
   become one, anywhere from four to six strong. Bigger companies meet
   proportionally more monsters and split the same pay and XP more ways. Survivors
   still short-handed after three days give up and sign on with the first company
   in town that has room.
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

**How a fight starts.** Chance decides who spots whom: three times in ten the
monsters see the company first, a little less often the company sees them, and
otherwise both sides meet at once. The side that sees first tries to sneak up as a
group (each rolls Stealth against the other side's sharpest passive Perception,
half must pass; untrained creatures use their bare Dexterity and Wisdom, and monster
passive Perception comes off the stat block). A surprised side takes 5 off its
initiative (the 2024 rules' disadvantage, flattened). Half the time the ambushers
close in from every side around a surprised side caught in a loose knot; the other
half they come up behind its back line, where the casters or the leaders stand. Otherwise the company deploys with fighters, barbarians, paladins
and monks in front and everyone else behind, while monsters put their cheapest
bodies forward and their leaders back, or scatter when there are only a couple.
Deep in a lair the defenders are more and more likely to be the ones watching.

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
per contract and companies wiped. The default scale (1.15, `?difficulty=` in the
URL) gives most of a death per contract and a wiped company every few days.

## Layout

```
src/core        seeded RNG, XP table, name generators
src/adventurers heroes (class, level, hp, xp, gear) and parties (merging, stash, renown)
src/items       magic item catalogue and effects
src/town        employers, their holdings (assets), the threats each kind attracts, and lairs
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

**[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** goes module by module: the layer
diagram and the dependency rules, what each file owns, the tick loop and the party
state machine, the exact engine API the adapter uses, how seeding keeps a run
reproducible, and where to add a new theme, holding, item or renderer.
**[CHANGELOG.md](CHANGELOG.md)** lists what landed, by day.

## Credits and licence

**This game does not implement D&D. [battlecast-engine][engine] does.**

Initiative, attacks, saving throws, the damage pipeline, conditions, spells and
concentration, movement and line of sight on the grid, the combat AI, the 317 SRD
monsters and the 12 hero classes at levels 1-20 — all of it is the work of
**Bartosz Jedrzejewski**, extracted from [BattleCast](https://battlecast.gg) and
published as [`battlecast-engine`](https://www.npmjs.com/package/battlecast-engine)
under the MIT licence. Its determinism (same seed, same battle, byte for byte) is
what lets this project calibrate difficulty, run a reproducible smoke simulation
and replay any fight. Without it there would be no game here, only a town.

d20 Town contributes the layer above: the town and its economy, employers and
their holdings, threat themes and encounter budgets, lairs and raids, companies
that merge, retreat, level, retire and die, and the narration. `src/combat` is
the only module that speaks to the engine — see
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#the-battlecast-engine-boundary) for
the exact API surface.

Monster, spell and class data derive from the D&D 5.2 SRD, CC-BY-4.0 by Wizards
of the Coast, and reach this project through the engine's data files.

d20 Town is released under the MIT licence — the same terms as the engine it
builds on — see [LICENSE](LICENSE). Upstream notices are reproduced in full in
[THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).
