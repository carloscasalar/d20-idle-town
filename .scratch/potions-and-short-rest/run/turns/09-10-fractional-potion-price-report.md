# Turn 09 — issue 10: A fractional potion price throws after the production sink

Implemented `.scratch/potions-and-short-rest/issues/10-fractional-potion-price-throws-after-the-sink.md` on the current branch, against starting commit `c1c5623`.

A potion tier's selling price is now a whole number of gold, checked the same way as `productionCost`. A tier formula whose lowest total is below 1 is rejected at configuration time. The lowest total is the parsed die count plus the bonus (each die rolls at least 1), with no roll. `1d4` and `2d4-1` stay valid. The default catalogue is unchanged, `src/core/dice.ts` is unchanged, and no other test file moved.

`1d4-3` rolls -2, -1, 0 or 1, so its lowest total is -2. The case that separates "below 1" from "below 0" is `1d4-1`, whose lowest total is 0. `1d4-20` is -19.

Check results:

| Command or check | Result |
| --- | --- |
| `pnpm exec vitest run test/game-config.test.ts -t "fractional selling price"` | Red first: a price of 1.5 was accepted. Green after `integer: true` on the tier price. |
| `pnpm exec vitest run test/game-config.test.ts -t "rejects potion formula"` | Red first: `1d4-1`, `1d4-3` and `1d4-20` were accepted. Green after the lowest-total check. |
| `pnpm typecheck` | Pass. |
| `pnpm exec vitest run test/game-config.test.ts test/dice.test.ts` | Pass: 46 tests. The existing negative-bonus dice case still rolls `1d6-3` to -2. |
| `pnpm test` | Pass: 37 files, 754 tests, none skipped. |
| Targeted mutations, each followed by the new config tests | All killed: dropping `integer: true` from the tier price; lowest total below 0; statistical average below 1; assured healing below 1; only the first tier; the default tiers only; a negative bonus whose lowest total is still at least 1. The original check was restored before the final suite. |
| Standards and Spec reviews | Two independent reviews of `git diff HEAD` against `c1c5623`. No hard violations, no baseline smells, no missing or extra behaviour. |

Regression guard: unchanged. No diff in `test/simulation-regression.test.ts`, `test/job-intel-regression.test.ts`, or their snapshots. Those hash tests are enabled (re-recorded by issue 09) and this turn did not skip or rewrite them. No test outside `test/game-config.test.ts` was edited. No random draw moved. The default configuration stays valid.

`docs/ARCHITECTURE-INTERFACES.md` has no signature change. `src/core/dice.ts` still exports `parseDice`, `rollDice` and `assuredHealing`, and still accepts `NdM-K`. The catalogue sentences for the potion tier and for `validateGameConfig` now state the whole-number price and the lowest total of at least 1, so the written surface matches the check.

Acceptance coverage:

| Acceptance criterion | Covering test |
| --- | --- |
| A tier price that is not a whole number is rejected, in the same words as a fractional production cost | `test/game-config.test.ts`: "rejects a fractional selling price on a later potion tier". Exact error `potions.tiers[1].price: expected a whole number, got 1.5`. Dropping `integer: true` from the tier price fails this test. The bad price is on the second tier of a custom list. |
| A formula whose lowest total is below 1 is rejected on every submitted tier | `test/game-config.test.ts`: "rejects potion formula %s on a later tier because its %s". Exact errors for `1d4-1` (`lowest total 0 is below 1`), `1d4-3` (`lowest total -2 is below 1`) and `1d4-20` (`lowest total -19 is below 1`). The first tier is the valid formula `2d4-1`. Switching the bound to below 0 fails the `1d4-1` case. Checking the average, or assured healing, below 1 accepts all three. Checking only the first tier, or only the default catalogue, accepts the custom later tier. Those two mutations were run against the formula loop and failed these tests. |
| A lowest total of exactly 1 stays valid, including a negative bonus | `test/game-config.test.ts`: "accepts a potion formula whose lowest total is 1, including a negative bonus". `1d4` and `2d4-1` resolve and are stored as given. Rejecting a negative bonus whose lowest total is still positive also adds an error on the `2d4-1` tier of the rejection cases, so those exact error lists fail too. |
| The dice module still accepts a negative bonus | `test/dice.test.ts`: "supports unmodified and negative-bonus dice", unchanged. `src/core/dice.ts` has an empty diff. |
| The default configuration stays valid and no other test moves | `test/game-config.test.ts`: "is plain data: a JSON round trip is the same configuration", unchanged. Full `pnpm test` passes with no other test file edited. |

Questions: none.

Bugs: none.

Not done: no browser smoke and no long combat sweep. This turn changes configuration validation only; the running game and its draws are the same for every configuration that was already valid. No push; the orchestrator pushes.
