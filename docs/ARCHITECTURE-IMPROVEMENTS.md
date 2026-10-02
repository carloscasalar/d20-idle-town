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
