# Turn 05, correction 1 — boundary gaps in the gold tests

Your tests and fixes (f78a95f, e2ad6f4) were reviewed: the audit is complete and
70 of 76 mutations were caught. Close the gaps below. Tests only: nothing under
`src/` changes and the regression snapshot stays identical.

Add exact-boundary tests, each with the purse exactly at the limit and one gold
piece below it:

1. Potions (`src/town/services.ts`): the number bought when the purse is exactly
   reserve plus the price of N potions, and one below.
2. Rooms on homecoming (`src/sim/expedition.ts`): a purse exactly equal to the
   fee takes rooms; one below sleeps in the stables.
3. Divination (`Game`, investigating a Contract): a purse that leaves exactly
   twice the reserve buys it; one below does not.
4. Buying a magic item: the budget is the purse minus the reserve. An item
   priced exactly at the budget is bought; one gold piece dearer is not.
5. Carousing: use a purse for which five per cent is not a whole number, so
   rounding down is distinguishable from rounding up.
6. A tavern round when investigating: a purse that leaves exactly the reserve
   buys it; one below does not.

Cases 4 to 6 are currently caught only by the regression snapshot hash; they
need a focused test.

Also:

7. In the "opening gold sources" tests, `assertHolderCounters(world,
   openings(world))` compares the world with itself and cannot fail. Use literal
   opening amounts or delete the assertion.
8. `watchBooks` hard-codes the windfall days, the looting days, the starting
   purse per level, the hoard per level and the retirement price. Read them
   from the exported configuration or constants the game itself uses, so the
   helper does not go stale when a value becomes configurable.
9. The investigation test depends on the internal key `${q.id}:talk`. Set the
   scene through behaviour instead (for example by letting the free attempt
   happen first), so the test survives when that key disappears.

Done means: `pnpm typecheck` and `pnpm test` pass, only `test/` changed, and
your report follows rule 9.
