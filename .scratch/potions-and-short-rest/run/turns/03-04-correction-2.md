# Turn 03, correction 2

Your correction was committed as `b9e3260` and re-checked with mutations. Five of the six named mutations now fail a test, the die faces are valid and nothing under `src/` changed. One point remains; the rules still apply.

1. In `src/combat/battlecast.ts`, replacing `opts.dice ?? new Rng(potionSeed)` with `opts.dice ?? rng` (the `seed()` draw kept, the potion rolled from the fight's setup generator instead of the child) passes all 676 tests. Your report says the test "rolls the drink on the child generator taken after placement" fails for it; with the draw kept it does not: that one pinned roll happens to total 6 on both generators. Strengthen that test so the coincidence cannot hold: pin several rolls (more than one drink in the fight, or the same assertion on a second seed), with exact drink lines and hit points. Apply exactly the mutation above, see the test fail, undo it, and quote the failure in your report.

Tests only; no existing expected value changes.

Append your report to `.scratch/potions-and-short-rest/run/turns/03-04-correction-1-report.md` under a "Correction 2" heading as well as giving it in your final message.

Done means: `pnpm typecheck` and `pnpm test` pass and your report follows rule 9.
