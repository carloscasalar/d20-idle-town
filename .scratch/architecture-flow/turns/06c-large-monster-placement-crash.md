# Turn 06c — bug fix: a fight crashes when a large monster does not fit

Read `docs/agents/orchestration-flow.md`, section "Rules for the implementing
agent", before anything else. Those rules apply to this turn.

This is a **bug fix** turn. Refresh the regression snapshot only if it differs,
and say whether it did and why.

## The bug

Running seed 75 for 1,500 hours through `Game` throws from battlecast-engine:

```
Only 0 of 1 Roc(s) fit in the red team's zone on a NxN grid.
```

It is raised in `node_modules/battlecast-engine/dist/api/encounter.js` when a
creature is added and no position in its team's zone can hold it. A Roc is
Gargantuan (20 by 20 feet). The game's combat adapter, `src/combat/battlecast.ts`
(`runCombat`, `deploy`, the `place` helper and the grid size), places monsters
and falls back to letting the engine choose; that fallback is what throws. The
crash is old: it also happens on the commit before the coin module.

## What to do

1. **Reproduce it with a focused test** through `runCombat`: the smallest
   party and encounter that make a Gargantuan monster fail to fit (find the
   cause first: grid size, zone size, other creatures already in the zone, or
   the order of placement). Add the 1,500-hour seed 75 run through `Game` as a
   second test. Both fail before the fix.
2. **Find the cause and fix it in the game's code, not in the engine.** The
   fight must go ahead with every monster the encounter asked for, if the D&D
   2024 rules allow that many creatures of that size in the space. Prefer a fix
   that does not change any fight that already worked: for example placing the
   largest creatures first, or giving a fight that contains Huge or Gargantuan
   creatures the room they need. Explain in your report why the fix you chose
   changes no fight that did not crash before, or, if it does, how many and why.
3. **If the engine itself cannot model it** (for example no grid large enough
   is allowed), keep the game running with the closest honest approximation,
   encapsulate it behind a name that says what it is, and record the limitation
   and the ideal behaviour as an issue in `.scratch/combat/issues/`, with
   `Status: needs-triage`.
4. Run the 1,500-hour sweep of seeds 1 to 150 through `Game` once at the end
   (in a test that is skipped by default or in a script; do not add a slow test
   to the default suite) and report any other crash, with seed, hour and
   message. Do not fix other crashes in this turn.

## Out of scope

The coin module, the Board, and any other refactor.

## Done means

`pnpm typecheck` and `pnpm test` pass; both new tests fail without the fix;
your report follows rule 9, explains the cause, says whether the snapshot
changed, and lists the sweep result.
