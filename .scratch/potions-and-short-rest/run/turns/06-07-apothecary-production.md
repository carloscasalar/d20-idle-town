# Turn 06 — issue 07: apothecary production

Read `.claude/skills/implement-prd/RULES.md` before anything else. Those rules apply to this turn.

Use $mattpocock-skills:implement. Use it to implement the issue `.scratch/potions-and-short-rest/issues/07-apothecary-production.md`. The issue is the contract: build what it describes and meet every acceptance criterion. Its parent PRD is `.scratch/potions-and-short-rest/PRD.md`.

What the issue could not know:

- Issues 02 to 06 are done on this branch. Issue 05 landed first (commits `e80c126`, `3952642`), so the `potions` service step in `src/town/services.ts` already holds the final buying rule: one tier per visit, a count of potions, the full price paid as one `service` movement. This issue builds on that step. The issue asks for the sink first and the sale second per potion, with no event between them; a purchase of several potions is several such pairs. If keeping the purchase's single log line and the existing tests of `test/potion-buying.test.ts` needs a choice about how the coin movements of one purchase are grouped, decide it within that rule and write it under the issue's `## Comments`.
- The potion catalogue is in `src/adventurers/potions.ts` and its validation in `src/sim/config.ts`. The apothecary report of `scripts/tune.ts` (`scripts/tune-report.ts`, `test/tune.test.ts`) already reads `view.stats.goldSpentOnProduction` when it exists and prints "unavailable" when it does not; expose the statistic there, with the other gold statistics, and check the report prints it.
- Reviews of earlier turns failed on wiring that only a helper's unit test exercised, on mutations that survived, and on documents left stale. For this issue: test through the service step and the game view with exact treasuries, statistics and the order of the coin movements; make sure a test fails if the sale precedes the sink, if `production` also moves `goldSpentByHeroes` or any other effect, if the cost is derived from the price, or if a treasury gate comes back. `docs/ARCHITECTURE-INTERFACES.md` is to be kept true whenever a signature or a module's surface changes, besides the documents the issue lists.
- The issue's "No questions" section replaces rule 4 for this turn: decide, write the decision under the issue's `## Comments`, and carry on.
- The six regression hash tests are skipped and stay skipped. `smoke`, `combat-space` seed 75, `lairs` seed 14, `deployment` and the seeded loops of the company roster tests keep passing with no change of seed or expectation. This issue adds no random draw.
- Scripts are run with `pnpm dlx vite-node <script>`; `pnpm exec vite-node` does not work in this repository. The baseline file `scripts/tune-baseline.json` is not re-recorded.
- Put your report in `.scratch/potions-and-short-rest/run/turns/06-07-apothecary-production-report.md` as well as in your final message.

Done means: `pnpm typecheck` and `pnpm test` pass, and your report follows rule 9.
