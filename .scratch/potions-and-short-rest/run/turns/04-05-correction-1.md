# Turn 04, correction 1

Your work was committed as `e80c126` and reviewed. The behaviour was found correct, the long sweep is clean and every acceptance criterion has a test. Two mutations of `src/town/services.ts` survive the suite; add the two tests below. Tests only; the rules still apply.

1. `test/potion-buying.test.ts`: every fixture has an even `maxHp`, so `floor` instead of `ceil` in the need passes. Add an odd case: a 33 HP hero alone buys three basic for 150 gp (`floor` would buy two).
2. `test/potion-buying.test.ts`: pin the decision in the issue's Comments that the step-down skips tiers stronger than the chosen one. Catalogue `weak` 1d2+2 at 10 gp, `mid` 2d4+2 at 100 gp, `odd` 4d4+4 at 50 gp; one 40 HP hero whose purse is the reserve plus 299 gp: expect five `weak` for 50 gp (without the filter the step buys two `odd`). Check the arithmetic against the code before you pin it; if the rule as written gives another exact result, pin that and say why.

No existing expected value changes. For each new test, apply the mutation named in its point, see it fail, undo it, and quote the failure in your report.

Append your report to `.scratch/potions-and-short-rest/run/turns/04-05-buying-policy-report.md` under a "Correction 1" heading as well as giving it in your final message.

Done means: `pnpm typecheck` and `pnpm test` pass and your report follows rule 9.
