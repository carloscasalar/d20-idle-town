# Turn 06, correction 1 — the coin module's review corrections

The negative Bounty is fixed and committed. Now the review corrections to your
coin module. Still a refactor: the regression snapshot stays identical, and the
rules in `docs/agents/orchestration-flow.md` apply. Existing test files other
than `test/coin.test.ts` must not be edited.

1. **No casts and no union to make the types fit.** Remove the
   `goldStatistics(object)` cast and the `BoardLedger` union. Today
   `ExpeditionLedger` and `ServiceLedger` no longer declare the gold fields, but
   the coin module still writes them on the object it is given, so a ledger
   without them would silently become `NaN`. Every context that moves gold
   carries a properly typed gold-statistics object, or a coin object built
   once with it; choose one, and make a missing statistics object a type error.
   If that forces you to edit an existing test fixture, stop and report which
   one and why instead.

2. **The reason test checks the table against itself.** In `test/coin.test.ts`,
   "each reason" derives its expectations from `coinReasons`, so changing the
   `merger`, `resale` or `windfall` entry leaves it green. Write each reason's
   expected effects as literal values in the test (which counters and which
   statistics move, by how much), one row per reason.

3. **A typed, frozen table.** Freeze `coinReasons`. A reason is a typed key, so
   a typo is a compile error. Tests that need a made-up reason build their own
   table and pass it in (as a constructor or function input), instead of adding
   an entry to the shared module-level table.

4. **Leftovers.** Remove the default `statistics = emptyGoldStatistics()` in
   `mergeParties` and the unused `gold` parameter of `retiredEmployer`.

Done means: `pnpm typecheck` and `pnpm test` pass; the snapshot has no diff; no
existing test file other than `test/coin.test.ts` changed; your report follows
rule 9.
