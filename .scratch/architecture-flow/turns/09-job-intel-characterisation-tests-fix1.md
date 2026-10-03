# Turn 09, correction 1 — the road check's difficulty

The reviewer ran 51 mutations against `test/job-intel.test.ts`; 49 were caught.
Tests only: nothing under `src/` changes and the regression snapshot stays
identical. The rules in `docs/agents/orchestration-flow.md` apply.

1. **The Survival difficulty on the road is never tested at its boundary.**
   Changing the road check in `src/sim/expedition.ts` to roll against the
   difficulty plus one, or minus one, goes unnoticed: the tests use difficulty
   0, 100, or 15 over many seeds. Find a seed and a company for which the roll
   plus bonus equals the difficulty exactly, and assert success at a difficulty
   equal to that total and failure at one above it. Do the same for the free
   Persuasion attempt at the tavern if it is not already pinned at its boundary.

2. **Prices per level are only checked at level 3.** Add one other level for
   divination and for a round, so a price that ignores the level is caught.

3. **Wording.** Where a test asserts on a phrase of the log ("gets nowhere",
   "buy a round") only to detect what happened, assert the observable fact
   instead (what is now known about the job, what was paid and to whom, whether
   the hour was spent). Keep a wording assertion only where the wording is the
   behaviour under test.

(The reviewer's other point, a test that worked around the ruined-tavern bug, was
already replaced in your bug fix.)

Done means: `pnpm typecheck` and `pnpm test` pass, only `test/job-intel.test.ts`
changed, and your report follows rule 9.
