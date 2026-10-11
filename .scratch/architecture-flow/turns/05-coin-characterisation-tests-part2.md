# Turn 05, part 2 — bug fix: the two counter failures you found

Your audit and tests were committed as f78a95f. Fix F01 and F02 from
`.scratch/coin-transfers/AUDIT.md` now. The rules in
`docs/agents/orchestration-flow.md` still apply.

This is a **bug fix** turn. Both occur in the snapshot seeds and change
serialized counters, so the regression snapshot will change. Refresh it once and
say so.

The rule both must satisfy: for every company, purse = starting purse +
`earned` − `spent`, at every tick.

1. **F01, a wiped company's purse.** When a company is wiped out and its purse
   goes to a Lair's hoard or a Holding's loot, the gold leaves the purse without
   being recorded. Record it as `spent` by the company. It is not a purchase:
   the lifetime statistic `goldSpentByHeroes` does not change.

2. **F02, a merge.** When a company's survivors join another and its purse goes
   with them, record it as `spent` by the donor and `earned` by the host. No
   lifetime statistic changes.

For each: a failing focused test first, then the fix, in the place the movement
happens today (do not start the coin-transfer module; that is the next turn).

3. **Remove the exclusions.** The seeded-run counter check in
   `test/coin-movements.test.ts` currently removes these two movements from its
   input. Delete that correction code and its comments, so the strict helper
   sees the real balances for every company on every tick of the three runs.
   If it then fails anywhere, that is a third bug: stop and report it with the
   seed, hour, company and amounts; do not add a new exclusion.

4. Update `.scratch/coin-transfers/AUDIT.md`: the failures section says what was
   found and that it is fixed; the audit rows G08, G09 and P01 list the counters
   now updated.

Done means: `pnpm typecheck` and `pnpm test` pass; each new test fails without
its fix; the seeded counter check has no exclusions; the snapshot was refreshed
once; your report follows rule 9.
