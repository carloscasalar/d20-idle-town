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
