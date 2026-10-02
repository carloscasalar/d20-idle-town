# Turn 03c — fix: the smoke test times out in CI

Read `docs/agents/orchestration-flow.md`, section "Rules for the implementing
agent", before anything else. Those rules apply to this turn.

## The failure

CI (`.github/workflows/ci.yml`) fails with:

```
FAIL  test/smoke.test.ts > simulation smoke run > runs 400 ticks without throwing and completes quests
Error: Test timed out in 5000ms.
```

5000 ms is Vitest's default. Commit a2ea112 ("test: allow long simulations to
complete in CI") already gave explicit timeouts to some long tests, one test at
a time. That approach has now missed one.

## What to do

1. **Find out why it got slower.** Time the 400-tick run of seed 42 at the
   current HEAD and at commit b19a8e0 (before potions were drunk in combat; use
   a throwaway `git worktree` under the system temp directory with
   `node_modules` symlinked, and remove it afterwards). Report both timings. If
   the slowdown comes from something wasteful in `src/` (for example repeated
   work per round in `runCombat`), say what it is and how large it is, but
   **do not change `src/` in this turn**; a performance fix would be its own
   task.
2. **Fix the timeouts in one place.** Every test that runs a long simulation
   must have room to finish on a CI machine that is several times slower than
   this one, and the next long test someone adds must not need to remember a
   magic number. Choose the smallest mechanism that gives that (a shared
   constant used by the long tests, or a Vitest project setting), apply it to
   every long-running test in `test/`, and remove the scattered per-test
   numbers it replaces. Do not raise the timeout for fast tests more than you
   need to, and do not shorten or weaken any simulation.
3. **List the slowest tests.** Report the five slowest test cases and their
   local durations, so the margin is visible.

## Out of scope

Any change under `src/`. Any change to what a test asserts. The regression
snapshot stays byte-for-byte identical.

## Done means

`pnpm typecheck` and `pnpm test` pass; `git diff --stat` shows changes only
under `test/` and, if you used one, a Vitest/Vite config file; your report
follows rule 9 and includes the two timings and the slowest-tests list.
