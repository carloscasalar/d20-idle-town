# Architecture

d20 Town is a headless simulation with a thin browser front-end bolted on. The
world advances through `Game`, which owns a seeded RNG and orchestrates
discrete hourly ticks. `CompanyRoster` owns the companies and membership;
`Board` owns the contracts and bounties; Expedition owns
a company’s journey. Combat — the one part with real rules in it — is
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

The UI depends on the simulation. Domain modules reference one another; the
Company roster also dispatches company activities through Expedition and town
services using narrow contexts. No domain module imports Game.

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
          └───────►             src/core               │  Rng, dice, XP, names
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

`dice.ts` parses `NdM+K` (also unmodified dice and negative bonuses), rolls from
an explicit `int(min, max)` source and derives Assured healing from the formula.
Game code never calls the engine's exported `rollDice`: outside `withRng` it
falls back to `Math.random()`. Every game-side die uses this core module.

| File | What it holds |
| --- | --- |
| `rng.ts` | `Rng`, a mulberry32 PRNG. `int`, `chance`, `pick`, `weighted`, `shuffle`, and `seed()` which forks a child seed. The world takes one per combat and one per actual Short rest; the combat adapter takes one more from its own generator for potion rolls. It also allocates namespaced IDs from counters owned by that RNG, without consuming random values. `hashString` turns a `?seed=` URL string into a number. |
| `dice.ts` | Parses `NdM+K` (also unmodified dice and a negative bonus), rolls from an explicit `int(min, max)` source, and derives Assured healing. Game code uses this instead of the engine's `rollDice`. |
| `xp.ts` | The 5e XP-to-level table, `levelForXp`, `xpToNextLevel`. |
| `names.ts` | Syllable-based generators for heroes, nobles, merchants, factions, deities, towns and companies. |

Everything random in the game draws from a single `Rng` instance owned by
`Game`, in a fixed order. That order is the determinism contract: inserting a
roll anywhere shifts every subsequent roll in the run.

Entity IDs use per-kind sequences owned by the same `Rng`. Creating another
`Game` therefore starts its own hero, party, item, asset, employer, lair and
quest IDs at the same values for the same seed. ID allocation does not draw
random values, and factories within one world share the sequence through their
RNG argument. Interleaving two worlds cannot change either world's IDs.

### `src/adventurers` — the people

- **`hero.ts`** — a `Hero` is a class name, level, XP, HP, armour tier, equipped
  magic items and a kill count. The class chassis (hit points, attacks) comes
  from the engine's `buildHero`; this module layers the game's own progression
  on top: `gainXp`, `healHero`, `killHero`, `resurrectHero`, armour tiers and
  their costs, and `combinedEffect`, which folds every
  equipped item into one bundle of AC / weapon / HP / speed / resistance
  modifiers. It also owns out-of-combat skill checks (`rollSkill`,
  `SKILL_ADVANTAGE`) used for tavern investigation and reading the road.
- **`potions.ts`** — the Healing potion catalogue (name, formula, price,
  independent production cost and production ticks) and the
  shared pack, a count per tier. It chooses the potion a Bloodied hero drinks
  and describes the pack for the log. The game view copies that pack in catalogue
  order; the party card joins the view and does not import the catalogue. Combat, the Short rest
  and the apothecary ask it; none of them owns a second price or heal formula.
- **`policies.ts`** — the Potion sharing policy (`company-order` or
  `most-hurt`) and the one weighted draw at company creation. Combat and the
  Short rest ask it for the order of Bloodied heroes. A missing policy is
  company order.
- **`hit-dice.ts`** — die size and Constitution from the engine's `hpFormula`,
  and a pure calculation of Hit Dice spent at a Short rest. The caller writes
  the hero.
- **`party.ts`** — a `Party` is members, shared gold, the potion pack, stash, renown,
  guild membership and a `PartyStatus`. Four to six strong. `rollClasses` fills
  the four classic roles (front line, support, skirmisher, arcane).
  Pure queries also accept deeply read-only companies. Company size and the
  renown cap live on the roster configuration; this module imports no roster
  code. Readiness and room rules belong to the configured roster.
- **`company-roster.ts`** — the Company roster owns the company list, arrival
  schedule, strangers, temple recruitment, merging, absorption, disbanding and
  retirement. It exposes deeply read-only `all`, `active` and `byId` queries
  with frozen array copies and live records. Operations accept those views and
  resolve owned companies; a company absent from the roster is an error.
  `updateActive` supplies deeply read-only companies in descending renown
  order, preserving the original population snapshot and stable ties. Game
  uses explicit `wait`, `advance`, `depart`, `visitServices` and
  `seekIntelligence` operations to act on owned companies.
  `bury` removes fallen members through the same ownership check; no free
  membership or disbanding mutator is exported.
  Game still chooses idle work; neither it nor Expedition writes membership.
  Expedition calls its supplied `disband` operation on a wipe; Game connects
  that operation to the roster. Scenario
  setup alone uses the test-only `recordsForScenario` and `replaceForScenario`.
  `CompanyRosterConfig` and `DEFAULT_COMPANY_ROSTER_CONFIG` hold plain data.
  Game's `roster` section is that object. Company size and the renown cap are
  defined here; the Board and Expedition receive them. Context is last and supplies only the operation’s required
  town, Board query, RNG, tick, ledger, the coin and synchronous report.
  `retirementStep` contributes a service function for the caller’s ordered list.

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

- **`services.ts`** — `visitTownServices(party, context, steps)` tries the
  caller's ordered list of steps until one spends the hour. A step is the
  generic `(company, context) => boolean`. `resolveSteps` turns the configured
  names into that list, and `runSteps` walks it. The registry names are
  `potions`, `loot`, `items`, `dues`, `blessing` and `armour`, plus
  `retirement`. `retirement` is the roster's step, registered under that name
  when the list is resolved; services does not know what retirement does. The
  default order is `services.steps` in the configuration. A configuration may
  name any registered step, including one that is not in the default list.
  Each step
  keeps the existing reserve, equipment allocation and synchronous reporting.
  Gold moves through the world's coin object. The potions step makes each
  potion on demand: a `production` sink first, then its full-price `service`
  transfer, with no event between them. A multi-potion purchase repeats that
  pair and reports one receipt afterwards. Every tier is offered while the
  apothecary is not ruined, regardless of treasury. Production ticks are read
  but have no behaviour yet; production is instant and draws no randomness.
  The blessing's hit points per
  level live on the services configuration and are passed into combat setup.

- **`coin.ts`** — the only writer of a gold balance or a gold counter. `openCoin`
  builds one coin for a world, holding that world's gold statistics and the
  reason table. Callers name a purse, treasury, hoard or loot and one of three
  operations on that coin: `transfer`, `source` or `sink`, each with an amount
  and a reason. A reason's effects are named fields. Reasons that must touch
  the same counters share one effect object, and the comment on that object
  says why: `intel` with `service`, income with a windfall, and a forfeit with
  upkeep. Spoils, looting, a wipe and a merger each have their own object.
  Callers use the coin; `transfer`, `source` and `sink` are private to the
  module. A hoard and a loot store have no earned/spent counters. The module
  does not decide whether anyone can afford the amount, and it does not import
  `Game`. The reason table stays in code: the effects are the accounting
  identity of a movement, not a tunable of the world. Factories still set a
  holder's starting amount.
  `production` sets only `spent` and `goldSpentOnProduction`; its other effects
  are false. `GoldStatistics`, `GameStats` and `Game.view().stats` expose
  `goldPaid`, `goldSpentByHeroes` and the lifetime `goldSpentOnProduction`.
  The UI shows production spending in the Town summary and statistics bar. Only
  the built-in `production` reason moves that new statistic.

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
  How much is public at posting comes from the kind's profile
  (`countAtPosting`) through `knowledgeAtPosting`. Later changes to `revealed`
  and `countRevealed` go through the handle only the Board gives out.
  `generateQuest` prices a contract from the holding's income, the difficulty
  mix, the employer's generosity and desperation, limited by `treasuryShare`
  of the required `QuestTerms.rewardTreasury` supplied by the Board before
  applying `minimumReward`. `generateAssault` builds the standing bounty on a lair.
- **`job-intel.ts`** — job intelligence. It is the only writer, after a job is
  created, of the two public facts (whether the encounter count is known, and
  how many encounters are revealed) and of what each company has tried: a free
  attempt, rounds bought, and a look at the road, named fields per job.
  `Board.knowledge` is the only way to obtain the two operations knowledge
  allows: learn the next fact, or reveal every fact. Knowledge only grows.
  An idle hour tries an ordered list of named steps — `freeAttempt`, then
  `divination`,   then `paidRound` — resolved from `intel.steps` with `resolveSteps`, then
  walked by the same `runSteps` as town services. The validator accepts any
  name in that registry, including one left out of the default list. Reading the road and taking stock on
  arrival call those same operations themselves. `JobIntelConfig` holds the
  skill difficulty, the price per level of divination and of a round, each
  reserve as a multiple of the resurrection price, the limit on paid rounds,
  and that step list. The resurrection price keeps its definition on the hero.
  Divination and rounds pay the world's coin with the `intel` reason.

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
4. Runs the engine's `Encounter` to a conclusion or a round cap. Between unfinished rounds, before checking whether to flee, the company's Potion sharing policy orders its Bloodied heroes and each drinks one potion from the supplied pack: the smallest tier whose assured healing covers the hit points they are missing, or the strongest tier in the pack. A fallen hero counts their fight maximum, blessings and items included, and receives the potion from the first conscious companion in company order. If nobody is conscious, no potion is used. The adapter rolls the formula on `src/core/dice.ts` and passes the total to `heal`. The engine does not roll the potion.
5. Maps the result back to a `CombatOutcome`: winner (`party | monsters |
   retreat | stalemate`), rounds, per-hero HP / alive / kills, XP earned, potions
   drunk, and the engine's narration plus potion-drinking lines.

Game code above this line never sees a `Creature`, a `BattleLog` or a
`MonsterData` instance in flight — only the game's own types.

### `src/sim` — the world

`Game` (`game.ts`) owns the town, the lairs, the stats and the
event log, and exposes one method that matters: `step()`, one in-game hour.
Its configuration is one plain object, `GameConfig`, composed in
`src/sim/config.ts` from each module's own frozen default. `seed` sits at the
top. A day is `TICKS_PER_DAY` (24) in `src/sim/game-rules.ts`, a calendar
constant, not a tunable field. Every other value is a section
(`board`, `roster`, `intel`, `expedition`, `services`, `lairs`, `quests`,
`encounters`, `heroes`, `town`, `holdings`, `items`, `combat`, `world`).
`new Game(partial)` and `Game.forTesting` deep-merge that partial onto the
defaults, replacing arrays and `[min, max]` pairs whole, then reject a result
that is missing a section, has an unknown field, a section that is not an
object, the wrong type, a count that is not a whole number, an empty weight
list, a weight list whose weights are all zero, a name that is not in the
catalogue it names (a holding, an employer kind, or a step), a negative price,
or a range whose minimum exceeds its maximum. A
function that uses a section takes that section as a required argument, so
forgetting it is a type error and an override reaches every use. Nothing in the object is a function, a
class instance or `undefined`, so the same document can later be loaded from
YAML. The field list is [Configuration](CONFIGURATION.md).

The **Board** (`board.ts`) owns the contracts and bounties. It is the only
code that posts them, accepts them, ends them, or writes the links between a
holding, a lair, a company and that work. Its `BoardConfig` is plain data: numerical
configuration (including inclusive cooldown ranges) and `rewardSetAsideFor`,
a list of town service or employer kind names. Game's `board` section is
that object: `travelTicks` and
`difficultyScale` are not restated anywhere else. How long unanswered work
stays open, and the renown a kind grants, live on `kinds`, keyed by the kind's
id. The exported
`DEFAULT_BOARD_CONFIG` is the one definition of those defaults. The `WORK_KINDS` table
selects small, named Contract and Bounty behaviors for creation, posting,
acceptance wording, success, failure, expiry and withdrawal after a lair falls.
Each entry carries a profile: which renown it grants, the board-card narration,
whether the last fight forbids retreat, whether fights report a lair's depth,
what is known when the work is posted, and how an idle company is offered it.
The expedition and job intelligence read those fields. A profile is required
on every kind, and an expedition is given that table; a missing profile is an
error. Game still posts only through `postContract` and `postBounty`. A new
kind needs a table entry and a posting rule in Game before the world offers
it. Kind
entries do not do gold arithmetic: a Contract's reward and
windfall, a Bounty's payment, an expiry loss and a hoard's payout are coin
movements with reasons. Creators receive the kind, and posting rules receive the original
posting terms. Entries apply consequences; Board operations write terminal
status and release references. Expiry prepares and validates its consequences
before the Board closes work, then applies them after closure. Company size
and the renown cap arrive on the context from the roster; the lair strength
cap arrives from the lair module. Overriding any of those changes every module
that uses it. Query results are deeply read-only TypeScript views, including
encounters and rewards. `knowledge` hands back learn-next and reveal-all;
those operations live in job intelligence, and knowledge only grows. `recordsForScenario` and
`replaceForScenario` are test-only, used by scenario setup; regression serialization uses `all()`.

The Board's `rewardTreasury(employer)` reads that employer's current treasury
and, for an entry in `board.rewardSetAsideFor`, subtracts rewards on its `open`
and `taken` Contracts. A service entry reaches its operator; a kind entry
reaches every employer of that kind. Only the apothecary is enabled by default.
The Board supplies this amount to Contract generation via `WorkContext`.
No duplicate employer-to-work link or stored balance is introduced: paying,
failing or expiring a Contract releases the amount through terminal status.
Posting moves no gold; minimum rewards and upkeep retain their existing
rules. Game still compares posting thresholds with the full treasury; the
40-seed, 3,000-hour acceptance run stayed above zero without a threshold change.

The ordering of `step()` is the game:

```
step()
 ├─ every 24 ticks: closeTheBooks()   employers collect, pay upkeep, go bankrupt
 │                  respawnLairs()    something worse moves into a cleared lair
 ├─ restock()        shops put a magic item on the shelf
 ├─ raids()          lairs strike holdings; unanswered raids make them stronger
 ├─ postQuests()     threatened holdings become contracts on the board
 ├─ postAssaults()   the guild posts a bounty when a company can take a lair
 ├─ roster.arrivals() new companies turn up at the tavern
 ├─ roster.updateActive(updateParty) every company, most renowned first
 └─ expireQuests()   nobody answered; looters move in
```

`Game.acceptQuest` chooses the work and calls the roster’s `depart` operation,
which takes that work through the Board and calls Expedition’s `startExpedition`
on the owned company. Game then publishes the returned acceptance event. The Board links work and company; Expedition sets traveling
status, travel ticks and idle ticks. Event subscribers see the same linked,
traveling company as before.

`updateParty` handles idle companies and sends active ones to
`advanceExpedition` in `expedition.ts`. The Expedition module owns this state
machine for one company and one hour:

```
idle ──accept──► traveling ──arrive──► questing ──cleared/retreat──► returning ──► resting ──► idle
                                      │  ▲
                             hurt win │  │ continue
                                      ▼  │
                                  short-resting ──retreat──► returning
  └── recruit / shop / merge / retire / take a lair bounty

questing ──wiped──► disbanded
```

`idle` delegates recruiting and merging to the roster, then chooses purchases and work: buying
potions, armour, items and blessings, paying guild dues and selling loot
through `visitTownServices`,
learning about a contract through `seekJobIntelligence`, and finally accepting one. During `questing`, the
Expedition module resolves one fight per tick, applies casualties and XP,
subtracts combat potions, schedules a Short rest for a hurt company after a
non-final victory, and reports events synchronously. It takes a
combat resolver through an interface: `runCombat` is the production adapter,
while tests supply scripted outcomes. A wipe or homecoming resets expedition
progress and hands the finished work and outcome to settlement exactly once.
Game forwards that callback to the Board, which alone releases the company.
On a wipe, Expedition first invokes its roster-supplied `disband` operation at
the same point before loot storage, wipe counting and settlement as before.
Expedition asks job intelligence to read the road and to take stock on arrival,
passing the job's learning handle; the module decides what each reveals. Expiring
a Contract without its employer or holding is an error before it is closed or
counted; real games never remove those entities. Lost-loot storage stays in `Game` and is called at the same
point in the journey. A broken lair's hoard is paid out by `Game` when the
Board asks, after the bounty is paid and before the chronicle line.

After a non-final victory, a hurt company spends the next tick in
`short-resting`. Expedition records the original line for the retreat check.
`adventurers/hit-dice.ts` derives die size and Constitution from the engine's
`hpFormula` and purely calculates recovery, returning HP, spent dice and rolls.
Its required pacing strategy receives hero, dice remaining and encounters ahead;
the default spreads remaining dice with `ceil(D / E)`, stopping at full HP.
The profile's `encounterCountSource` selects the configured upper bound when the
count is unknown (Contract counts, or Bounty upper bound plus the boss), never
below what job intelligence has revealed. A known count uses the exact total.
The rest logs rolls, checks retreat using the resulting HP, then gives each
still-Bloodied living hero one rolled Healing potion, in the company's Potion
sharing policy order, if the company continues. Those potion rolls use the same local generator as the Hit
Dice, after every Hit Die. An unhurt company checks losses in the combat tick and skips
the rest. Level-up adds a remaining die without changing `hitDiceSpent`; death
and resurrection preserve the pool. The town Long rest resets living heroes'
spent dice alongside full HP at the end of eight hours, even without paid rooms
or with a ruined tavern. Divergence from SRD 5.2.1: the game does not enforce
one Long rest per 24 hours.

Renderers cross two seams: `onEvent(listener)` pushes each log event as it
happens, and `view()` returns a fresh immutable snapshot for the current frame.
The view resolves the relationships and derived values a renderer needs — party
status, board links, holding labels and net income, and lair timing — without
making the renderer import domain modules. `Game` keeps its mutable world
private: scripts read `view()` or a narrow immutable calibration query, and
scenario tests configure a world only within `Game.forTesting()`.

### `src/ui` — one subscriber

`main.ts` creates a `Game` from the URL (`?seed=`, `?difficulty=`), drives
`step()` on a timer at selectable speeds, appends events to the log as they
arrive and re-renders four tabs — parties, board, town, chronicle — from
`game.view()`. It reads; it never writes. A pixel-art renderer would attach the
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
- That `Rng` owns a separate sequence for each entity ID kind; counters are
  scoped to the world and do not advance the random stream. `regressionState()`
  includes a sorted, serializable snapshot of those counters so changes that
  affect future IDs are part of the deterministic regression contract.
- Every combat gets a child seed from `this.rng.seed()`, so a fight is
  reproducible on its own and the engine's internal rolls never disturb the
  world stream.
- Every actual Short rest consumes exactly one world `seed()` and makes one
  local `Rng` for all heroes' Hit Dice, in company order, and then for the
  potions drunk by heroes still Bloodied. Spending, company size, pacing and
  how many potions are drunk never alter that world-stream cost. An unhurt
  company consumes no rest seed. Trajectories change with these new seeds but
  reproduce themselves.
- Each fight takes one child seed from the world. After the opening, deployment
  and placement draws, the adapter takes one further `seed()` from that child
  for potion rolls. Those rolls use a generator made from that seed, or the
  dice source on the combat options when a test supplies one. The engine
  receives a number from `heal` and does not roll the potion, so a low roll and a high roll leave the
  same engine log until the first drink.
- Potion rolls and Hit Dice go through `src/core/dice.ts`, which parses `NdM+K`
  (also unmodified dice and a negative bonus) and rolls from an explicit
  `int(min, max)` source. Game code does not call
  the engine's `rollDice`. Outside the engine's `withRng`, that function falls
  back to `Math.random()`.
- Constituting a company draws its Potion sharing policy once, from the same
  generator, after that company's classes and heroes are chosen and before its
  name. The draw is one weighted roll whatever the weights are, so later world
  draws move by that one step and a seed still reproduces itself. The company keeps
  the result on a policies object. Combat and the Short rest ask that policy
  only for the order in which Bloodied heroes are served. A company with no
  recorded policy is served in company order. A merger keeps the host's policies.
- The engine is itself deterministic under a seed, so `seed + tick order` fixes
  the entire run.

Practical consequence: any change to the *order* of rolls in `step()` changes
every seeded expectation downstream, including the smoke test. That is
intentional — it is how a whole-world regression gets noticed. The smoke test
checks repeatability. The three whole-world hashes and three stripped-world
hashes were re-recorded once after Hit Dice, healing potions, sharing,
production and reward set-aside, and those six tests are enabled. Smoke,
combat-space seed 75, lairs seed 14, deployment, the company roster seeded
loops and these hashes are the regression guard. The combat potion tests on
seeds 1 and 2 keep those fights, with a scripted 2d4+2 of 8.

## Tests and calibration

| Path | What it covers |
| --- | --- |
| `test/reward-set-aside.test.ts` | Board and hourly-game reward sizing with exact treasuries, open/taken obligations, three endings, every configured merchant, service/kind isolation, empty and missing lists, Contract-only accounting and unchanged upkeep |
| `test/potions.test.ts` | Smallest covering tier, strongest fallback, a fallen hero's maximum, pack wording |
| `test/apothecary-production.test.ts` | Exact per-potion sink/sale order and balances, one receipt after all pairs, independent configured costs, instant nonzero ticks, every tier from a treasury in debt, permanent ruin, game-view statistics and tuning report |
| `test/coin.test.ts` | Coin reasons and holder accounting, including production moving only spent and lifetime production spending |
| `test/coin-movements.test.ts` | Service purchases, paid rounds, resurrection, homecoming, retirement, income, expiry, windfall and purse movements, including a 400-hour bookkeeping run |
| `test/game-config.test.ts` | Configuration validation, including required Reward set-aside lists, known service/kind names, empty-list disabling, required production costs and ticks, default zero ticks and invalid production values |
| `test/potion-buying.test.ts` | Stock target, tier choice, budget step-down, resurrection reserve, one tier per visit, ruined and empty catalogues, `potionCoverFraction` |
| `test/potion-sharing.test.ts` | Both sharing orders in combat and at the Short rest, no recorded policy, one draw per company, host policies on a merger, weight validation |
| `test/dice.test.ts` | Formula parsing, scripted and seeded rolls, bounds, invalid formulas, derived Assured healing |
| `test/hit-dice.test.ts` | Engine HP parser, minimum healing, pure spending, quota, full-HP stopping, exhausted heroes, level-up, death and resurrection |
| `test/expedition.test.ts` | Separate Short rest hour, dice/retreat/potion order, shared local rolls including rest potions, world seed isolation, encounter bounds, Long rest in every lodging case |
| `test/combat-potions.test.ts` | Between-round drinking, scripted 2d4+2, engine log stable until the first drink, and one world seed per fight however many potion dice are rolled |
| `test/combat-space.test.ts` | A Gargantuan creature's space on the battlefield |
| `test/smoke.test.ts` | A deterministic 400-hour run: no crashes, and the world produces contracts, deaths and coin |
| `test/town-services.test.ts` | Public hourly ticks: purchase priorities, reserve thresholds, ledgers, stock, equipment allocation, guild renewal, blessings and retirement ordering |
| `test/game-access.test.ts` | State boundary: scenario setup expires before the game runs, and event subscribers receive immutable data |
| `test/game-view.test.ts` | Immutable renderer snapshots: party states, linked board data, town economy, lairs, counters and chronicle |
| `test/simulation-regression.test.ts` | Three seeds, 400 hours each: SHA-256 references over every tick’s domain state, RNG state and event history |
| `test/simulation-state.test.ts` | `regressionState()` reads domain facts and does not retain event history |
| `test/company-roster.test.ts` | Existing hourly characterization of arrivals, recruiting, merging, disbanding and retirement |
| `test/company-roster-interface.test.ts` | Direct roster operations, configuration, deeply read-only queries and synchronous event state |
| `test/company-roster-ownership.test.ts` | Refusals of merge, burial and disbanding for companies outside the roster |
| `test/town-service-steps.test.ts` | Caller-supplied service order with a made-up step between potions and armour |
| `test/configured-steps.test.ts` | A configured service order the game follows, and names the validator rejects |
| `test/registered-kind.test.ts` | A made-up kind posted, taken, fought and settled from its table entry |
| `test/job-intel.test.ts` | Hourly characterization of learning a contract or bounty |
| `test/job-intel-module.test.ts` | Job intelligence through its own interface: each way of learning, each refusal, and a made-up step |
| `test/job-intel-regression.test.ts` | Three seeds, 400 hours: with investigations removed, the world matches the re-recorded baseline |
| `test/board.test.ts` | Board invariants, configuration, registered kinds, ownership and expedition hand-off |
| `test/contract-lifecycle.test.ts` | Posting, levels, raids, bounties, choice, expiry, success, failure and lair respawn |
| `test/contract-ruin.test.ts` | Employer ruin releases open contracts without changing holding status |
| `test/tune.test.ts` | Seed ranges and lists, invalid arguments, default scales, unrounded reports, inclusive baseline comparison, apothecary treasury tracking and production spending from a real configured game purchase |
| `scripts/combat-sweep.ts` | Long runs for seeds 1–150, 1,500 hours each, reporting crashes |
| `test/party.test.ts` | Hero progression on the 5e thresholds, death and resurrection, merging, party levels |
| `test/encounters.test.ts` | XP bands land inside the engine's own thresholds |
| `test/items.test.ts` | Item effects reach the engine as overrides |
| `test/lairs.test.ts` | Boss selection, assault generation, skill checks, lairs inside a live game |
| `test/deployment.test.ts` | Opening, surprise and grid placement |
| `scripts/calibrate.ts` | Win/death rates per difficulty and level, single fresh fights |
| `scripts/tune.ts` | Whole towns at several difficulty scales: unrounded tuning metrics, baseline deviations and tick-by-tick apothecary finances |
| `scripts/variety.ts` | How many distinct monsters a long run throws up |
| `scripts/assault.ts` | How often a level-matched company clears a lair |
| `scripts/lairs.ts` | A long run, lair events only |

The calibration scripts print numbers to read before touching `difficultyScale`
or the XP bands. `scripts/tune.ts` also compares the five tuning metrics (quests,
failed, deaths per quest, wiped, raised) with `scripts/tune-baseline.json`,
printing each percentage deviation and PASS or FAIL at an inclusive +/-15%.
A failed comparison exits with status 1. Deaths and companies arrived are
printed alongside the five metrics; none of these values is rounded.

```bash
SEEDS=1..80 SCALES=1,1.15,1.25,1.5,1.75 TICKS=600 pnpm dlx vite-node scripts/tune.ts
SEEDS=1..40 SCALES=1.15 TICKS=3000 pnpm dlx vite-node scripts/tune.ts
```

`SEEDS` accepts an inclusive ascending range or a comma list such as `1,2,3`.
Empty entries, including a trailing comma, are errors. Seeds are non-negative
whole numbers. Defaults are seeds `1,2,3`, 600 ticks and scales
`1,1.15,1.25,1.5,1.75`. Scales must be positive finite numbers and ticks must
be non-negative whole numbers. Parsing and report logic live in
`scripts/tune-report.ts`, which can be imported without running a simulation.

The baseline records the measured commit, commands, per-scale metrics and the
3,000-tick apothecary figures. Comparisons require the baseline's tick count and
seed sample: 600 ticks and seeds 1 through 80, each exactly once. Seed-list order
does not matter. A different tick count or seed sample is reported as
unavailable, prints no PASS or FAIL verdict and does not cause a failing exit
status. This includes the default three seeds and the ten-seed scale-shape run.
With matching ticks and seeds, an unrecorded scale exits with status 1. When
initially recording a baseline, a missing file is reported as unavailable.

The apothecary report reads `Game.view()` at initialization and after every tick.
Ruined and total shops are counts across seeds; lowest treasury is the minimum
of any apothecary at any observed tick, including after ruin. Treasury at the
end is the mean final apothecary treasury total per seed. `goldSpentOnProduction`
is the mean final lifetime statistic per seed, exposed by the game with its
other gold statistics. Reports of older observations that lack it still print
unavailable. Other services do not enter these figures.

## Extension points

- **A new threat theme** — add it to `ThemeId` and `THEME_LIST` in
  `src/quests/themes.ts` (curated names plus creature types), then wire it into
  the weights of an asset kind in `src/town/assets.ts`, and into `LAIR_THEMES`
  if it should be able to hold a lair.
- **A new kind of work** — add one profile and one `WorkBehavior` to the Board's
  kind table, and a posting rule in `Game`. The profile names whether it grants
  the renown in `kinds.<id>`, the narration, whether the last fight forbids
  retreat, whether fights report a lair's depth, what is known at posting, and
  how an idle company is offered it. Creation, posting, success, failure,
  acceptance, and optional expiry or withdrawal supply the rest. `post`,
  `take` and `settle` dispatch the table entry. The expedition reads the
  profile it is given. Today `Game` only posts through `postContract` and
  `postBounty`, so a kind that is only in the table is never offered by the
  world until `Game` has a rule that posts it. Its tunables go in `kinds`,
  under its id.
- **A new town service** — add a named step to the town-service registry.
  `services.steps` names which of those run, in
  order; `resolveSteps` looks the names up. Retirement is the name
  `retirement`, not a slot in the list.
- **A new way of learning in an idle hour** — add a named step to the job-intel
  registry. `intel.steps` names which of those run; `resolveSteps` looks the
  names up, and `runSteps` walks the result.
- **A new holding** — add an `AssetKind` and its `AssetKindDef` (income, titles,
  threat weights) in `src/town/assets.ts`. Nothing else needs to change.
- **A new magic item** — add an `ItemTemplate` to `ITEM_CATALOGUE` in
  `src/items/items.ts`. If its effect needs a field the engine exposes but
  `ItemEffect` does not, add it there and map it in `heroOverrides`.
- **A new renderer** — construct a `Game`, subscribe with `onEvent`, and read
  the immutable snapshot from `game.view()`. If a renderer needs a relationship
  or derived value that is absent from the view, add it there rather than
  importing the domain modules.
- **A scenario test** — build the world in a `Game.forTesting(config, setup)`
  callback. The mutable scenario expires before `step()` can run; assert the
  outcome through `view()` or a purpose-built query.
- **Tuning difficulty** — `board.difficultyScale` in the game configuration
  (or `?difficulty=`) multiplies every encounter's XP budget. Measure with
  `scripts/tune.ts` before and after. Every other tunable lives in a section
  of the same configuration; the fields and their defaults are listed in
  [Configuration](CONFIGURATION.md).
