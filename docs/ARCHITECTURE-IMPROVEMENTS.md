# Architecture improvements

This file records completed architecture improvements and the evidence used to
choose and verify them. Add later improvements below the current entry.

## 1. Scope entity IDs to each world

**Problem.** Seven module-level counters in the hero, party, item, asset,
employer, lair and quest modules made generated IDs depend on which `Game`
instances and standalone factories had run earlier in the process. Same-seed
worlds could therefore have different complete state when their execution was
interleaved. The simulation already gives each `Game` one `Rng`, so global
counters duplicated ownership outside the world.

**Change.** `Rng` now owns a separate deterministic counter for each ID kind.
Factories use that RNG to allocate IDs, and `instantiate` now takes an RNG as
well. Allocation consumes no random value, so the random roll order and the
combat seed stream are unchanged. Per-kind prefixes keep IDs distinct across
entity types, and each world's sequence remains local to its RNG. `Rng.idState()`
returns a sorted serializable view, which `Game.regressionState()` includes so
counter drift is captured by deterministic trajectory checks.

**Files.** `src/core/rng.ts`; entity factories in `src/adventurers/`,
`src/items/`, `src/town/` and `src/quests/`; updated direct factory callers in
`test/`; determinism description in `docs/ARCHITECTURE.md`.

**Evidence.** The previous counters were module-level variables in the seven
factory modules. `Game` constructs and retains one `Rng`, and all world entity
factories already receive it. A cross-world ID sequence therefore belongs with
that existing world state rather than in the module lifetime.

**Verification.** `pnpm typecheck` passed. `pnpm test` passed all 53 tests
across 10 files, including the three 400-hour trajectory snapshots, the
interleaved same-seed full-state comparison, entity reference integrity, and
uniqueness checks for world entities and item factories. The three snapshot
hashes were intentionally refreshed because `regressionState()` now includes
the allocator counters. The random trajectories and serialized world values
remain the same; the updated hashes now also detect changes to future ID state.

## 2. Give expeditions one module and a combat seam

**Problem.** Travel, fighting, retreat, homecoming and rest were interleaved in
`Game`. Combat outcomes came directly from `runCombat`, so tests could not
script a defeat or wipe and exercise the surrounding company rules directly.

**Change.** `advanceExpedition` now owns the non-idle hourly state machine for
one company. Its interface accepts a combat resolver: `runCombat` in production
and scripted outcomes in tests. `Game` still owns settlement and lost-loot
storage and supplies those operations as callbacks. Events remain synchronous,
and the world RNG still draws one child seed at the same point in each fight.
The shared contract-intelligence wording moved to `learnQuestIntel` so travel
and tavern investigation use the same rule. Private travel, fight-resolution,
short-rest and homecoming functions keep the hourly dispatcher small without
changing the Expedition context or its callbacks.

**Files.** `src/sim/expedition.ts`, `src/sim/game.ts`,
`src/quests/quest.ts`, `src/adventurers/party.ts`, `test/expedition.test.ts`,
`CONTEXT.md`, and the architecture references.

**Evidence.** Expedition tests call `advanceExpedition` with a scripted
combat resolver. They cover short-rest healing at the default half-HP fraction
(rounded up and capped), configurable healing, potion eligibility with supplies
to spare, and bounded combat potion accounting; victory, defeat, retreat,
stalemate and wipe; retreat by survivor count and the 35% average-HP boundary;
survivor XP shares and both company and individual level-up events; successful
and failed homecoming, exact room fees, stables, carousing and its exclusions;
temple costs and blessing removal; successful, failed, repeated and fully-known
road checks; boss and non-boss combat options; invalid company/quest guards;
synchronous casualty visibility and combat-before-loot event ordering; and rest.
The settlement and lost-loot callbacks remain an interim dependency until the
board and coin-transfer modules are deepened.

**Verification.** `pnpm typecheck` and `pnpm test` passed all 97 tests across
11 files, including the unchanged three-seed, 400-hour per-tick trajectory
snapshots. The regression snapshot file has no diff against `HEAD`, and its
SHA-256 checksum before and after these edits is identical. `git diff --check`
passed.

## 3. Give the Board the lifecycle of contracts and bounties

**Problem.** Posting, accepting, settling, expiring and withdrawing work lived
as private methods on `Game`. Four links had to agree — the work's status and
company, the holding's contract, the lair's bounty, and the company's work —
and each transition updated them by hand. `quest.ts` only creates and reveals
work; it guards no transition.

**Change.** `Board` owns the work list and is the sole writer of its status,
company and holding/lair/company links. Every tunable Board value is supplied
as plain `BoardConfig` data; the exported default reproduces existing tuning.
Game builds it from `GameConfig`, retaining the existing fields and converting
`contractDays` to ticks. The `WORK_KINDS` table contains named Contract and
Bounty entries. Each supplies creation/posting, success/failure, acceptance
wording, and optional expiry and withdrawal after a lair falls. A third kind
can be registered in an injected table and posted through `post` without
editing the Board's operations. Creators receive the kind; posting rules use
the supplied terms without looking up the employer or holding again. Entries
apply consequences to read-only work; the Board writes terminal status and
releases references for settlement, expiry and withdrawal. Expiry validates
and prepares its consequences before the Board closes work, then applies them
after closure. Shared defaults come from `MAX_RENOWN`, `PARTY_SIZE` and
`MAX_STRENGTH`, and other users read the same constants.

`take` links the work and company and returns travel time and an acceptance
event. The single `Game.acceptQuest` operation takes work, calls Expedition's
`startExpedition`, then publishes that event with the same state visible as
before. Expedition owns traveling status, timers and idle progress. On a wipe
or homecoming it resets encounter progress and calls settlement once with the
outcome. Settlement alone releases the company; `releaseCompany` is removed.

Queries expose deeply read-only work, including encounters and item rewards.
Game and Expedition route intelligence changes through Board operations.
`recordsForScenario` and `replaceForScenario` support `scenario.quests` only
inside `Game.forTesting`; regression state reads `all()`. Board contexts go
last, and configuration values are no longer operation parameters. Expiry
without a Contract's employer or holding now throws before closing or counting
it, matching the real world's invariant that neither entity is removed.

Game still chooses posting times, raids, bounty eligibility and company
preferences, stores lost loot and pays a broken lair's hoard when asked. Random
draw order, settlement accounting and narrative text are preserved.

**Files.** Board, Game, Expedition and the read-only query types/readers;
`test/board.test.ts`, the permitted Expedition assertions/context adapters, the
one removed lifecycle test, and the architecture references.

**Evidence.** Direct Board tests exercise every configuration field, a
registered Escort defined from scratch, its posting, acceptance, both
settlement outcomes, expiry/non-expiry and withdrawal after a lair falls, and
refusal of orphaned Contract expiry. The invariant rejects a lair linked to a
raid Contract and a holding linked to a Bounty. Posting tests verify the
supplied objects are used.
Compile-time checks prohibit assignments through every work query, including
nested encounters and rewards. Game tests check acceptance subscriber state
and company release after Contract and Bounty wipes and homecomings. The link
invariant runs after each Board transition and every tick of 400-hour runs for
seeds 7, 42 and 20260907. Existing lifecycle, ruin and lair tests remain intact
except deletion of “an expired Contract missing its %s is still closed and
counted”, replaced by the Board refusal test.

**Verification.** `pnpm typecheck` passed. `pnpm test` passed all 324 tests
across 15 files, including the unchanged three-seed, 400-hour trajectory
snapshots. `git diff --check` passed. The regression snapshot has no diff and
its SHA-256 checksum is identical before and after the refactor. The final
interface, configuration fields and exact test edits are recorded in the
[turn report](../.scratch/architecture-flow/turns/04b-board-config-and-kinds-report.md).

## 4. Give coin one module

**Problem.** Every movement of gold edited some combination of a purse, a
treasury, a hoard, a loot store, `earned`, `spent`, an adventurer's
`goldSpent` and the lifetime statistics by hand. Only a company paying an
employer went through a shared function, `payForService`. Two of those
hand-edited lines had been wrong until the previous turn because a counter
was forgotten.

**Change.** `src/town/coin.ts` is now the only code that writes a gold balance
or a gold counter, other than the factories that create a holder with its
starting amount. Callers name a purse, treasury, hoard or loot and use one of
three operations — transfer, source, sink — with an amount and a reason.
`coinReasons` decides the counters and statistics. Each context that moves
gold carries a `GoldStatistics`. `ServiceLedger`, `ExpeditionLedger` and
`BoardLedger` carry no gold field. `payForService` is gone. The Board's Contract reward,
windfall, Bounty, expiry loss and hoard payout are movements. Retirement is
a 20,000 gp sink and a 5,000 gp transfer onto the new employer's opening
treasury, with no event between them. Contract settlement is a windfall
source and a reward transfer before the reward event; holding loot still
moves after that event.

**Files.** `src/town/coin.ts`, the call sites in Game, Board, Expedition,
services and `mergeParties`, `test/coin.test.ts`, `CONTEXT.md`, and the
architecture references. The audit's Reason column names each row's entry.

**Evidence.** `test/coin.test.ts` drives every operation for every kind of
holder, checks each reason against its table entry (including a reason added
from the test), refuses a negative and a fractional amount, and checks
conservation over 400 seeded random movements. The existing coin-movement
tests, including conservation and per-holder checks on every tick of the
three 400-hour runs, were not edited.

**Verification.** `pnpm typecheck` passed. `pnpm test` passed all 374 tests
across 17 files, including the unchanged three-seed, 400-hour trajectory
snapshots. `git diff --check` passed. The regression snapshot has no diff.
Its SHA-256 is `84469c230e1e08ca637af7dc7bdec70af68e619b7d04a1ef6f04c8899763c39a`,
the same checksum recorded after the previous turn.

## 5. Give the Company roster its lifecycle and services an ordered list

**Problem.** Game owned the company population, arrival timing, stranded
companies' strangers, temple recruitment, merging, disbanding and retirement.
Party helpers moved members and supplies, and Expedition independently marked
wiped companies as disbanded. Service priority was split between the town
services module's fixed sequence and a callback into Game for retirement.

**Change.** `CompanyRoster` now owns the company list and arrival schedule,
recruitment, joining other companies, disbanding and retirement. Queries expose
deeply read-only companies through `all`, `active` and `byId`, with frozen
array copies and live records. Operations accept query views and resolve owned
records. `updateActive` supplies deeply read-only records to Game's hourly actions in the existing
stable renown order over the population at the start of the hour; a donor
absorbed during that hour still receives its original scheduled update.
`recordsForScenario` and `replaceForScenario` back `scenario.parties` during
setup, and disbanded history remains in the roster. Game keeps idle work
selection, investigation and acceptance reporting. Explicit roster operations
apply idle waiting, services, investigation bookkeeping/payments, Board
acceptance and Expedition advancement to owned records. Expedition's wipe
calls its supplied `disband` operation, connected to the roster by Game.
Merging, burial and disbanding helpers are private; there are no compatibility
exports or duplicate readiness/capacity rules.

All roster tuning is plain `CompanyRosterConfig` data, with exported defaults.
Game builds it from `GameConfig`, keeping the existing names (`maxParties`,
`arrivalInterval`, `patienceTicks`) and converting the new `disbandDays` to
`disbandTicks`. Shared sizes and retirement thresholds retain one definition.
`party.ts` defines the shared sizes once and imports no roster code; the
workaround `company-size.ts` has been deleted. Operations
receive only their required town, Board query, RNG, tick, counters, gold
statistics and synchronous event reporter; context goes last. The full
interface and numerical configuration are listed in
[Architecture interfaces](ARCHITECTURE-INTERFACES.md#company-roster-configuration).

`visitTownServices` tries caller-supplied `TownServiceStep` functions until one
spends the hour. Six small steps retain the existing purchases and equipment
rules. `defaultTownServiceSteps` constructs the sole default list: potions,
loot, magic items, guild dues, blessing, a caller-contributed company step,
then armour. Game contributes roster retirement; standalone visits contribute
no action. Adding or reordering a
service means editing the supplied list. The services module has no retirement
rule or callback. Coin reasons, synchronous event points, statistics and random
draw order are preserved, including spending an arrival before checking the
company cap and transferring all supplies in a partial merge.

**Files.** `src/adventurers/company-roster.ts`, Party, Hero, Game,
Expedition and town services; `test/company-roster-interface.test.ts` and
`test/town-service-steps.test.ts`; the permitted coin-movement call and its list
import; `CONTEXT.md` and the architecture references.

**Evidence.** The existing 468 tests passed against the old code before the
extraction, then passed unchanged except the permitted no-retirement service
call. Twenty-three new tests exercise roster queries and every operation,
configuration, event-time visibility, owned merger/burial/disbanding, and a made-up
service placed between potions and armour. Compile-time assertions prohibit
membership, status, hero and item mutations through roster queries. A search
of `src/` finds company additions, member removals/transfers and disbanding
writes only in the roster module. The services callback has been removed.

**Verification.** `pnpm typecheck` passed. `pnpm test` passed all 491 tests
across 22 files. `git diff --check` passed. The regression snapshot has no diff;
its SHA-256 remains
`84469c230e1e08ca637af7dc7bdec70af68e619b7d04a1ef6f04c8899763c39a`.
`scripts/combat-sweep.ts` completed seeds 1–150 for 1,500 hours each
(225,000 simulated hours) with no crashes.

**Correction 1.** The first review found public free mutators, mutable hourly
iteration, a Party/roster import cycle, duplicate readiness rules and two
service-order definitions. These have been removed. Existing tests now use
owned roster operations and roster-supplied Expedition disbanding, retaining
all expected values and test cases. Ownership refusal and compile-time hourly
view checks cover the closed boundary; the two roster rule-question issues
now point to the moved code. The prior sweep above belongs to the original
extraction; this correction is checked with the existing regression suite.

Correction verification: `pnpm typecheck` and `pnpm test` passed all 493 tests
across 23 files; the regression snapshot is byte-for-byte unchanged and
`git diff --check` passed. All 589 existing matchers and their expected values
in the adapted files are unchanged. Every edited test is named in the
[correction report](../.scratch/architecture-flow/turns/08-company-roster-correction-1-report.md).

## 6. Give job intelligence one module

**Problem.** What a company knows about a Contract or Bounty, and how it finds
out, was spread across the job record, the Board, Game's idle hour, the road
and arrival in Expedition, and a string-keyed map on the company. The Board and
the roster grew pass-throughs (`learnIntel`, `revealAll`, `recordInvestigation`,
`payService`) so Game could write those facts without holding the records.

**Change.** `src/quests/job-intel.ts` is job intelligence. After a job is
created, it is the only writer of the two public facts — whether the encounter
count is known, and how many encounters are revealed — and of what each company
has tried. The Board keeps the job and `knowledge` returns the two operations
knowledge allows: learn the next fact, and reveal every fact. Knowledge only
grows. What a company has tried is one record per job, with `freeAttempt`,
`roundsBought` and `roadRead`, not string keys. An idle hour tries an ordered
list of steps in the same shape as town services. `defaultJobIntelSteps` is the
free attempt, then divination, then a paid round. Reading the road and taking
stock on arrival call those operations themselves; the caller passes the
handle, not the write. Divination and rounds pay through the coin module with
reason `intel`, whose counters match `service`. `JobIntelConfig` holds the
skill difficulty, both prices per level, both reserve multiples, and the round
limit. The resurrection price keeps its definition on the hero. Learning the
next fact about a job that is already fully known throws. The Board and roster
pass-throughs are gone, and `quest.ts` no longer wraps the writers.

**Files.** `src/quests/job-intel.ts`, Quest, Party, Board, Game, Expedition,
the company roster and coin reasons; `test/job-intel-module.test.ts` and
`test/job-intel-regression.test.ts`; six assertions in five tests in
`test/expedition.test.ts`; call sites in `test/job-intel.test.ts` and
`test/board.test.ts` that named the removed Board methods; `CONTEXT.md` and
the architecture references.

**Evidence.** Module tests drive each way of learning, a ruined tavern, a
ruined temple, both reserves, the round limit, one free attempt per job, and a
made-up step placed in the list. Learning another fact about a fully known job
throws. The three-seed, 400-hour proof compares every tick with
`investigations` removed to hashes taken from the code before the records
changed shape. Those hashes match, so the regression snapshot was refreshed
once, only because the inquiry records changed shape.

**Verification.** `pnpm typecheck` passed. `pnpm test` passed all 563 tests
across 26 files. The regression snapshot was refreshed once; with each
company's investigations removed, the three 400-hour trajectories match the
hashes recorded before this turn. `scripts/combat-sweep.ts` completed seeds
1–150 for 1,500 hours each (225,000 simulated hours) with no crashes.

## 7. One configuration, in sections

**Problem.** `GameConfig` was a flat object. It renamed module fields
(`maxParties` for `maxCompanies`, `disbandDays` for `disbandTicks`,
`contractDays` for `contractOpenTicks`), converted days to ticks with the
literal 72, and restated defaults the Board already defined. The renown cap
and the lair strength cap each had a module default and a second constant, so
overriding one did not change the other. Other rules — starting lairs, the
posting threshold, investigation and carousing, shop restock, item rarity —
still lived as literals beside the code that used them.

**Change.** `GameConfig` is one plain object. `seed` sits at the top. A day is
`TICKS_PER_DAY` (24) in `src/sim/game-rules.ts`, a calendar constant, not a
tunable field. Every other value is the owning module's configuration, defined
once in that module and frozen. `DEFAULT_CONFIG` is composed from those
defaults. No field is renamed or converted between units on the way in.
Company size and the renown cap live on the roster; the lair strength cap
lives on the lair module. The Board and Expedition receive them. The raid
clock passes the lairs section into `raidInterval`, and Expedition passes the
encounters section into `scaleEncounter`. Job intelligence is its own section,
and Expedition reads the road's difficulty from that section. `new Game` and
`Game.forTesting` accept a deep partial: sections merge, and arrays and
`[min, max]` pairs replace whole. `validateGameConfig` checks an unknown
document and returns the configuration or a list of readable errors. The game
uses that check whenever it is given a configuration. A test serialises
`DEFAULT_CONFIG` with `JSON.stringify`, parses it back, validates that object
without merging defaults, and runs 400 hours of one seed from both objects.
The field list is [Configuration](CONFIGURATION.md).

**Files.** `src/sim/config.ts`, `src/sim/game-rules.ts`, `src/core/freeze.ts`;
the module defaults in Board, roster, job intelligence, Expedition, services,
lairs, quests, encounters, heroes, town, holdings, items and combat; `Game`
and the browser `?difficulty=` entry; tests and scripts that built a flat
configuration; `docs/CONFIGURATION.md` and the architecture references.

**Evidence.** The regression snapshot is the behaviour. Each moved number is
the value the code already used. Shared caps are passed into the module that
used to read the second constant. The raid clock and encounter scaling receive
the same section the rest of the game uses. A production function takes its
section as a required argument, so one override reaches every use.

**Verification.** `pnpm typecheck` passed. `pnpm test` passed all 571 tests
across 27 files. The regression snapshot has no diff. Its SHA-256 is
`cbbf8cc5c7c6a321866dd4db3b27bef401a39557a003c05d7480ce703d2d7343`.

**Correction 1.** The review found two overrides that never reached the clock
or the fight: the raid interval was computed without the lairs section, and
encounter scaling without the encounters section. Both now receive that
section. Production functions no longer fill a missing section from
`DEFAULT_*`; the caller passes it, and tests pass the module default
explicitly. The arrival spread, the skill-advantage tiebreak, and a retiree's
holdings moved into their sections. `ticksPerDay` left the configuration; a
day remains `TICKS_PER_DAY`. The validator rejects an unknown key, a
fractional count, an empty weight list, and a section that is not an object.
The round trip validates the parsed object on its own.

Correction verification: `pnpm typecheck` passed. `pnpm test` passed all 575
tests across 27 files. The regression snapshot has no diff. Its SHA-256
remains `cbbf8cc5c7c6a321866dd4db3b27bef401a39557a003c05d7480ce703d2d7343`.
