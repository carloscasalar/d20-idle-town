# Turn 09 — issue 10: A fractional potion price throws after the production sink

Read `.claude/skills/implement-prd/RULES.md` before anything else. Those rules apply to this turn.

Use $mattpocock-skills:implement. Use it to implement the issue `.scratch/potions-and-short-rest/issues/10-fractional-potion-price-throws-after-the-sink.md`. The issue is the contract: build what it describes and meet every acceptance criterion. Its parent PRD is `.scratch/potions-and-short-rest/PRD.md`.

What the issue could not know:

- Issues 02 to 09 are done on this branch. The validation of potion tiers is in `src/sim/config.ts` (the `productionCost` entry already uses `integer: true`; the formula is parsed in the potion tier loop). The tests sit in `test/game-config.test.ts` next to the production cost cases.
- This is configuration validation only: the default configuration stays valid and no behaviour of the game changes, so no random draw moves and the regression guard (the skipped hash tests and the tests listed as surviving) stays exactly as it is. If any test outside `test/game-config.test.ts` needs to change, stop and say why.
- The issue's rule on the formula is "a potion tier's formula cannot heal less than 1", read as: the lowest total the formula can roll is below 1 (for example `1d4-20`, but also `1d4-3`, whose minimum is 0). Work out the minimum from the parsed dice without rolling. A formula whose minimum is exactly 1 (for example `1d4`, or `2d4-1`) stays valid. Say in the error message what was wrong, in the style of the neighbouring messages. The dice module must keep accepting negative bonuses: a Hit Die needs them.
- Reviewers of earlier turns failed on mutations that survived. The reviewer will try, one at a time: dropping `integer: true` from the tier `price`; changing the formula check from "minimum below 1" to "minimum below 0" or "total below 1 at the average"; checking only the first tier of the list instead of every tier; checking the default tiers only; and making a negative-bonus formula with a positive minimum invalid. Make a test fail for each, with exact expected error text.
- Keep `docs/ARCHITECTURE-INTERFACES.md` true if a signature or the surface of a module changes; if nothing changes there, say so.
- Put your report in `.scratch/potions-and-short-rest/run/turns/09-10-fractional-potion-price-report.md` as well as in your final message.

Done means: `pnpm typecheck` and `pnpm test` pass, and your report follows rule 9.
