# Turn 06, correction 2 — finish the typed gold statistics

You stopped correctly on item 1 of the last correction and reported the three
fixtures that block it. You may now edit them, within these limits. Still a
refactor: the regression snapshot stays identical; the rules in
`docs/agents/orchestration-flow.md` apply.

1. **Finish item 1.** Every context that moves gold carries a properly typed
   gold-statistics object, or a coin object built once with one; a missing one
   is a type error, not a runtime throw and not an optional parameter. No cast,
   no union, no optional statistics parameter anywhere in `src/`, including
   `mergeParties`. Remove `goldPaid` from `BoardLedger` and `goldSpentByHeroes`
   from the expedition and service ledgers if the gold statistics now live
   elsewhere.

2. **Allowed fixture edits.** In `test/board.test.ts` (`world()`),
   `test/expedition.test.ts` (`setup()`), `test/coin-movements.test.ts` (the
   service and homecoming ledgers) and `test/party.test.ts` (the
   `mergeParties` calls), you may change how a ledger, context or statistics
   object is **built**, and you may change an assertion only so that it reads
   the **same value from where it now lives**. Every assertion keeps the same
   expected number. Do not delete an assertion, loosen one (`toEqual` to
   `toMatchObject`, exact to range), or drop a test. List every edited line
   range in your report with one sentence each.

3. No other existing test file changes.

Done means: `pnpm typecheck` and `pnpm test` pass; the snapshot has no diff;
`grep` finds no `as` cast on gold statistics and no optional statistics
parameter in `src/`; your report follows rule 9 and lists the fixture edits.
