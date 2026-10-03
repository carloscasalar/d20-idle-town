# Turn 07b — fix: the long simulation tests time out

Read `docs/agents/orchestration-flow.md`, section "Rules for the implementing
agent", before anything else. Those rules apply to this turn.

This turn changes **tests and test configuration only**. Nothing under `src/`
changes and the regression snapshot stays byte-for-byte identical.

## The problem

On this machine right now a 400-hour run of seed 42 takes 4 to 5 seconds at
every commit of the branch (it took about 1 second earlier tonight: the machine
is slower, not the code). With that, `pnpm test` fails with 12 timeouts: the
Board invariant and the coin bookkeeping checks after every tick of three
400-hour runs, the seed-75 run of 1,500 hours, the lair run and others. A CI
runner is slower still. A suite that passes only on a fast, idle machine is
broken.

## What to do

1. **Measure first.** For each test that runs a long simulation, report its
   duration on this machine, and how much of it is the simulation itself
   versus the checking done after each tick (time a plain run of the same
   seed and length for comparison).
2. **Make the per-tick checks cheap without making them weaker.** If a checker
   re-serialises and re-parses the whole world every tick
   (`JSON.parse(game.regressionState())`), or rebuilds lookup tables it could
   keep, make it incremental or read only what it checks. Every invariant that
   is checked today must still be checked on every tick of every run it covers
   today. Do not sample ticks, shorten runs or drop seeds.
3. **One honest timeout policy.** Long simulations get a timeout that leaves a
   wide margin over their measured duration on a slow machine, defined once
   (the existing `vitest.config.ts` or a named constant used by the long
   tests). Short tests keep a short timeout, so a test that hangs is still
   caught quickly. Say what you chose and the margin it gives.
4. Run `pnpm test` three times in a row and report the slowest duration of each
   long test across the three runs.

## Done means

`pnpm typecheck` and `pnpm test` pass, three times in a row, on this machine;
nothing under `src/` changed; the snapshot is unchanged; your report follows
rule 9 and includes the measurements before and after.
