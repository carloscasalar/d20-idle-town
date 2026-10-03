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
