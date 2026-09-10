# Architecture

d20 Town is a headless simulation with a thin browser front-end bolted on. The
whole world lives in one class, `Game`, which owns a seeded RNG and advances by
discrete hourly ticks. Combat — the one part with real rules in it — is
delegated to [battlecast-engine](https://github.com/bjedrzejewski/battlecast-engine)
behind a single adapter module.

Three properties shape every decision below:

1. **Deterministic.** One seed reproduces a town, its people and every die roll
   in every fight, byte for byte. That is what makes the calibration scripts and
   the 400-hour smoke test meaningful.
2. **No DOM in the simulation.** `Game` runs identically in Vitest, in Node
   (`scripts/`) and in the browser. The UI is a subscriber, never a participant.
3. **One door to the rules engine.** Game code never plays D&D itself; it
   describes a fight and asks the engine to resolve it.

## Layers

Dependencies point downward only. Nothing below imports from anything above it.

```
                      ┌──────────────┐
                      │    src/ui    │  browser front-end (DOM, rendering, timer)
                      └──────┬───────┘
                             │ reads state, subscribes to onEvent
                      ┌──────▼───────┐
                      │   src/sim    │  Game: tick loop, state machine, event log
                      └──────┬───────┘
          ┌──────────────┬───┴───────┬──────────────┐
   ┌──────▼─────┐ ┌──────▼─────┐ ┌───▼────────┐ ┌───▼────────┐
   │ adventurers│ │   quests   │ │    town    │ │   items    │
   └──────┬─────┘ └──────┬─────┘ └───┬────────┘ └───┬────────┘
          │              │           │              │
          │       ┌──────▼───────────▼──────────────▼──┐
          └───────►             src/core               │  Rng, XP table, names
                  └────────────────────────────────────┘

   ┌────────────┐
   │ src/combat │  adapter: game types  ->  battlecast-engine  ->  game types
   └──────┬─────┘
          ▼
   battlecast-engine (npm, MIT)
```

`src/combat` sits to one side on purpose: `src/sim` calls into it, and it reads
`adventurers` and `quests` types, but nothing calls back out of it.

## Modules

### `src/core` — primitives with no domain in them

| File | What it holds |
| --- | --- |
| `rng.ts` | `Rng`, a mulberry32 PRNG. `int`, `chance`, `pick`, `weighted`, `shuffle`, and `seed()` which forks a child seed for one combat. `hashString` turns a `?seed=` URL string into a number. |
| `xp.ts` | The 5e XP-to-level table, `levelForXp`, `xpToNextLevel`. |
| `names.ts` | Syllable-based generators for heroes, nobles, merchants, factions, deities, towns and companies. |

Everything random in the game draws from a single `Rng` instance owned by
`Game`, in a fixed order. That order is the determinism contract: inserting a
roll anywhere shifts every subsequent roll in the run.

### `src/adventurers` — the people

- **`hero.ts`** — a `Hero` is a class name, level, XP, HP, armour tier, equipped
  magic items and a kill count. The class chassis (hit points, attacks) comes
  from the engine's `buildHero`; this module layers the game's own progression
  on top: `gainXp`, `healHero`, `killHero`, `resurrectHero`, armour tiers and
  their costs, potion costs and healing, and `combinedEffect`, which folds every
  equipped item into one bundle of AC / weapon / HP / speed / resistance
  modifiers. It also owns out-of-combat skill checks (`rollSkill`,
  `SKILL_ADVANTAGE`) used for tavern investigation and reading the road.
- **`party.ts`** — a `Party` is members, shared gold, potions, stash, renown,
  guild membership and a `PartyStatus`. Four to six strong. `rollClasses` fills
  the four classic roles (front line, support, skirmisher, arcane);
  `mergeParties` folds a broken company into another of the same level.

### `src/items` — the magic-item economy

A deliberately thin catalogue. An `ItemTemplate` carries an `ItemEffect` whose
fields map one-to-one onto engine overrides (`ac`, `weaponBonus`, `hp`, `speed`,
`resistances`), so an item is never cosmetic. `rollStockItem` supplies shop
shelves, `rollLootItem` supplies contract rewards, `resalePrice` prices what the
enchanter buys back.

### `src/town` — the place and its economy

- **`town.ts`** — `Employer` (noble houses, merchants, factions, the temple) and
  the six services (`tavern`, `temple`, `smith`, `apothecary`, `enchanter`,
  `guild`). Employers own holdings, a treasury, upkeep, generosity and
  reputation. `generateTown` builds a whole town from one `Rng`;
  `retiredEmployer` turns a level-8 adventurer with 25,000 gp into a new one.
- **`assets.ts`** — `Asset` (a mine, a road, the docks, a pass, a shrine) with a
  status of `safe | threatened | ravaged`. `ASSET_KINDS` is the table that gives
  each kind its income, its contract titles and — via `rollThreat` — the
  weighted set of threat themes it attracts.
- **`lairs.ts`** — a `Lair` is a themed, levelled home for a boss that sends
  raids, grows in strength and hoard while nobody answers them, and can be
  assaulted. `pickBoss` uses the engine's `calculateDifficulty` to find a stat
  block worth being the last fight.

### `src/quests` — what companies actually do

- **`themes.ts`** — the ten-odd threat themes (`goblins`, `undead`, `dragons`,
  `sea`…). Each theme names a curated roster plus the creature types it sweeps
  in from the SRD, so `themeMonsters` returns both the hand-picked monsters and
  every SRD monster of a matching type (~190 distinct monsters over a long run).
- **`encounters.ts`** — `xpBand` derives the XP budget per difficulty from the
  engine's DMG 2024 thresholds, shifted one tier down (the engine's AI fights to
  the death and this game chains fights). `buildEncounter` fills that budget with
  one of four patterns — `solo`, `horde`, `leader`, `mixed` — falling back to the
  full SRD when a theme has nothing in range. `scaleEncounter` re-sizes a spec
  for companies larger than four.
- **`quest.ts`** — a `Quest` is the unit of work: two to six `EncounterSpec`s, a
  reward, an optional item, a giver, the holding at stake and the lair behind it.
  Partial information is a first-class feature: `revealed` / `countRevealed`
  track how much is public, `revealNext` and `revealAll` open it up.
  `generateQuest` prices a contract from the holding's income, the difficulty
  mix, the employer's generosity and desperation; `generateAssault` builds the
  standing bounty on a lair.

### `src/combat` — the adapter, and the only file that knows the engine's shape

`battlecast.ts` is the seam. Given heroes, an `EncounterSpec` and a seed, it:

1. Resolves who spots whom (`resolveOpening`) — surprise, and whether an ambush
   surrounds or hits the back line.
2. Lays both sides out on the grid (`deploy`) — front line forward, casters
   behind; monsters put their cheapest bodies first.
3. Translates each hero into engine overrides (`heroOverrides`): armour tier and
   items become `acOverride`, `hpOverride`, `speedOverride`,
   `additionalResistances`; a +1 weapon is rebuilt from the class's own main
   attack with the bonus folded into attack and damage.
4. Runs the engine's `Encounter` to a conclusion or a round cap.
5. Maps the result back to a `CombatOutcome`: winner (`party | monsters |
   retreat | stalemate`), rounds, per-hero HP / alive / kills, XP earned, and the
   engine's narration lines.

Game code above this line never sees a `Creature`, a `BattleLog` or a
`MonsterData` instance in flight — only the game's own types.

### `src/sim` — the world

`Game` (`game.ts`) owns the town, the parties, the quests, the lairs, the stats
and the event log, and exposes one method that matters: `step()`, one in-game
hour. Its ordering is the game:

```
step()
 ├─ every 24 ticks: closeTheBooks()   employers collect, pay upkeep, go bankrupt
 │                  respawnLairs()    something worse moves into a cleared lair
 ├─ restock()        shops put a magic item on the shelf
 ├─ raids()          lairs strike holdings; unanswered raids make them stronger
 ├─ postQuests()     threatened holdings become contracts on the board
 ├─ postAssaults()   the guild posts a bounty when a company can take a lair
 ├─ arrivals()       new companies turn up at the tavern
 ├─ updateParty()    every company, most renowned first
 └─ expireQuests()   nobody answered; looters move in
```

Each company runs a state machine inside `updateParty`:

```
idle ──accept──► traveling ──arrive──► questing ──cleared/retreat──► returning ──► resting ──► idle
  │                                        │
  │                                        └── wiped ──► disbanded
  └── recruit / shop / merge / retire / take a lair bounty
```

`idle` is where most of the economy happens: recruiting or merging, buying
potions, armour, items and blessings, paying guild dues, selling loot,
investigating a contract, and finally accepting one. `questing` calls `fight`
once per tick until the contract is finished, the company retreats or it is
wiped out.

Two outputs leave the class: `events` (the running log, with collapsed combat
narration in `detail`) and `chronicle` (the highlights — deaths, level-ups,
lairs). `onEvent(listener)` pushes each event as it happens; that is the entire
subscription API a renderer needs.

### `src/ui` — one subscriber

`main.ts` creates a `Game` from the URL (`?seed=`, `?difficulty=`), drives
`step()` on a timer at selectable speeds, appends events to the log as they
arrive and re-renders four tabs — parties, board, town, chronicle — from public
`Game` state. It reads; it never writes. A pixel-art renderer would attach the
same way (see [`design/pixel-art/README.md`](../design/pixel-art/README.md)).

## The battlecast-engine boundary

The engine is used as a plain library. No MCP server is involved, at build time
or at run time. The complete API surface this project touches:

| Import | Used in | For |
| --- | --- | --- |
| `Encounter` | `src/combat/battlecast.ts` | Build, populate and run one fight |
| `buildHero` | `src/combat`, `src/adventurers/hero.ts` | The class chassis: HP, attacks, AC |
| `HERO_CLASS_NAMES`, `HeroClassName` | `src/adventurers`, `scripts/` | The twelve playable classes |
| `getMonsterByName`, `monsters` | `src/quests/themes.ts`, `src/combat` | The SRD bestiary |
| `calculateDifficulty` | `src/quests/encounters.ts`, `src/town/lairs.ts` | DMG 2024 XP thresholds |
| `MonsterData`, `Creature`, `BattleLog` | types only | |

Everything else — the town, the economy, contracts, lairs, renown, retreats,
magic items, progression between fights — is this repo's.

Two house rules live above the engine because the engine's AI fights to the
death: a company that has lost half its number to a mostly-healthy enemy flees
(`shouldRetreat` plus the adapter's `retreat` winner), and a company that wins a
fight badly hurt abandons the contract and walks home.

## Determinism and seeding

- `Game` holds one `Rng`, seeded from `config.seed` (or `?seed=` hashed with
  `hashString`).
- Every combat gets a child seed from `this.rng.seed()`, so a fight is
  reproducible on its own and the engine's internal rolls never disturb the
  world stream.
- The engine is itself deterministic under a seed, so `seed + tick order` fixes
  the entire run.

Practical consequence: any change to the *order* of rolls in `step()` changes
every seeded expectation downstream, including the smoke test. That is
intentional — it is how a whole-world regression gets noticed.

## Tests and calibration

| Path | What it covers |
| --- | --- |
| `test/smoke.test.ts` | A deterministic 400-hour run: no crashes, and the world produces contracts, deaths and coin |
| `test/party.test.ts` | Hero progression on the 5e thresholds, death and resurrection, merging, party levels |
| `test/encounters.test.ts` | XP bands land inside the engine's own thresholds |
| `test/items.test.ts` | Item effects reach the engine as overrides |
| `test/lairs.test.ts` | Boss selection, assault generation, skill checks, lairs inside a live game |
| `test/deployment.test.ts` | Opening, surprise and grid placement |
| `scripts/calibrate.ts` | Win/death rates per difficulty and level, single fresh fights |
| `scripts/tune.ts` | Whole towns at several difficulty scales: deaths per contract, wipes |
| `scripts/variety.ts` | How many distinct monsters a long run throws up |
| `scripts/assault.ts` | How often a level-matched company clears a lair |
| `scripts/lairs.ts` | A long run, lair events only |

The scripts are measurement, not assertion: they print numbers you read before
touching `difficultyScale` or the XP bands.

## Extension points

- **A new threat theme** — add it to `ThemeId` and `THEME_LIST` in
  `src/quests/themes.ts` (curated names plus creature types), then wire it into
  the weights of an asset kind in `src/town/assets.ts`, and into `LAIR_THEMES`
  if it should be able to hold a lair.
- **A new holding** — add an `AssetKind` and its `AssetKindDef` (income, titles,
  threat weights) in `src/town/assets.ts`. Nothing else needs to change.
- **A new magic item** — add an `ItemTemplate` to `ITEM_CATALOGUE` in
  `src/items/items.ts`. If its effect needs a field the engine exposes but
  `ItemEffect` does not, add it there and map it in `heroOverrides`.
- **A new renderer** — construct a `Game`, subscribe with `onEvent`, read
  `game.parties`, `game.quests`, `game.town`, `game.lairs`. Do not reach into
  private state; if something you need is not public, that is the bug.
- **Tuning difficulty** — `difficultyScale` in `GameConfig` (or `?difficulty=`)
  multiplies every encounter's XP budget. Measure with `scripts/tune.ts` before
  and after.
