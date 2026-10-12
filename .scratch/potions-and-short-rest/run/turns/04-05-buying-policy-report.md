Issue 05 is implemented on `feature/potions-healing`. The potions step restocks a company until the pack's assured healing covers `ceil(maxHp × potionCoverFraction)` for every living hero and the pack holds at least one potion per living hero. One visit buys one tier and writes one shop line. Decisions are under the issue's Comments.

`services.potionCoverFraction` defaults to 0.5 and is a share from 0 to 1. The tier cap is the literal `N / 2` in `src/town/services.ts`. Lowest tier means smallest assured healing, with catalogue order breaking a tie. Cheaper means a strictly lower price. The budget floor is the cheapest tier, not a tier named `basic`. An empty catalogue buys nothing and the step returns false. The temporary `basicTier` helper is gone. `scripts/assault.ts` looks up the default catalogue's basic tier itself; its drinking is unchanged.

Fixtures that used to mean "already stocked" under one basic per hero now carry a pack that meets this target, so those hours still reach retirement or job intelligence: six supreme in the company-roster helper, four greater in the job-intel helper, four supreme on the two level-8 retirement cases. The seeded loop lines in `test/company-roster.test.ts` are not in the diff.

Check results:

| Command or check | Result |
| --- | --- |
| `pnpm typecheck` | Pass. |
| `pnpm test` | Pass: 32 files passed, 2 skipped; 698 tests passed, 6 skipped (704). |
| Diff of `test/simulation-regression.test.ts`, `test/job-intel-regression.test.ts`, and their snapshots | Empty. Those files are not in the commit. |
| Diff of the seeded loops in `test/company-roster.test.ts` and `test/company-roster-interface.test.ts` | No loop lines changed. The roster helper's starting pack changed, outside those loops. |
| Smoke, `combat-space` seed 75, `lairs` seed 14, `deployment` | Not in the diff. They pass inside the full suite. |

The six regression hashes stay skipped. Buying behaviour did change, and the issue forbids re-recording them. The guard while they are skipped is the tests named above: no diff in those files, and they pass.

Acceptance coverage:

| Criterion | Coverage and result |
| --- | --- |
| A company below its stock target buys; one at or above it, with one potion per living hero, buys nothing | `test/potion-buying.test.ts`: "buys two basic for a 32 HP fighter alone"; "buys nothing when the pack already covers half of each living hero and holds one potion each"; "buys one basic so two heroes are not left sharing a single supreme". Pass. |
| A 32 HP fighter alone buys two basic; a 90 HP hero alone buys three greater | "buys two basic for a 32 HP fighter alone" expects `{ basic: 2 }` and 100 gp. "buys three greater for a 90 HP hero alone" expects `{ greater: 3 }` and 600 gp. Pass. |
| A company that cannot afford its chosen tier steps down; if even the cheapest count does not fit it buys as many as it affords | "steps down to six basic when three greater cost one gold more than the purse above the reserve" expects `{ basic: 6 }` and 300 gp. "buys four basic when the six that would meet the target do not fit above the reserve" expects `{ basic: 4 }` and gold left at 190. "steps down the healing ladder to the next cheaper tier whose count the purse can pay" and "buys as many of the cheapest tier as the purse affords when no full count fits" use a catalogue with no tier named basic. Pass. |
| The resurrection reserve is never spent on potions | "buys one basic when two would spend the resurrection reserve" starts at 289 gp and expects 239 gp and `{ basic: 1 }`. Spending the 190 gp reserve to buy both would leave 189 gp. "buys nothing when the purse is exactly the resurrection reserve". The six-basic step-down starts at 789 gp; ignoring the reserve would buy three greater. Pass. |
| One purchase of one tier and one log line per visit | Each purchase test expects `events` to equal one full shop sentence. "steps down to six basic…" expects exactly `{ basic: 6 }`, so a second tier in that visit fails it. The hourly tests in `test/town-services.test.ts` expect the same full sentence, one line. Pass. |
| Nothing is bought from a ruined apothecary and the step returns false | "buys nothing from a ruined apothecary": `bought` is false, gold and pack unchanged, no line. The 32 HP sale starts the treasury at 0 and still pays 100 gp, so ruin is the only shop limit. Pass. |
| `potionCoverFraction` is configuration, default 0.5, validated | `test/game-config.test.ts`: "covers half of maximum hit points by default and rejects a cover fraction outside 0 to 1" (default 0.5, rejects −0.1 and 1.5, rejects a missing field, accepts 1). "covers the whole maximum when potionCoverFraction is 1, so a 32 HP fighter buys two greater" goes through `buyPotions`. Pass. |
| The temporary buying rule of issue 04 is gone | `basicTier` is gone. "buys nothing when the pack already covers…" would fail the old rule, which bought a basic whenever the pack had none. The hourly test buys three basic on top of one greater, not four. "buys the lowest tier by assured healing when the catalogue has no tier named basic" expects `{ minor: 1 }`. Pass. |
| The divisor is the literal 2 | "buys the tier whose assurance is exactly half the need, not the tier just above it": an 80 HP hero and tiers assuring 10, 20 and 20.5 buys two of the 20. `N / 1.5` would buy the 20.5 tier; `N / 3` would buy the 10. "buys two greater for a 64 HP hero…" fails when the cap drops below 16. Pass. |
| The six regression hash tests stay skipped and are not re-recorded | Those files are not in the diff. The full suite reports 6 skipped. Pass. |
| The suite is green | `pnpm typecheck` and `pnpm test` pass. |

## Standards

Hard violation found, then fixed: the rewritten hourly tests matched fragments of the shop line (`includes('buy 2 basic…')`). They now expect the whole sentence, with the company name and the apothecary name taken from the fixture. Rule 2 of `.claude/skills/implement-prd/RULES.md`.

Judgement calls left as they are:

- `byAssuredHealing` repeats the ordering in `choosePotion` (assured healing, then catalogue index). The buying step and drinking both mean "smaller" the same way; the one-liner stays next to the purchase.
- The pack's assured healing is summed in the step. The step already asks `assuredHealing` and `potionCount`; a second pack helper was not added.
- `receipt()` in the step tests shares the potion plural with the shop line. The count, tier and price in each assertion are literals.

## Spec

The first spec pass said the 32 HP, 64 HP and 90 HP examples still pass when the cap is `N / 1.5`. That was fixed before commit by the 80 HP catalogue whose next tier assures 20.5, one half-point above `N / 2`. No missing requirement and no scope creep remain. Empty catalogue, price 0, tie-breaks and the removal of `basicTier` match the Comments.

Review summary: Standards had one hard violation, fixed, and three judgement calls left in place. Spec had one partial guard on the divisor, fixed by the 80 HP catalogue test.

Questions: none.

Bugs: none left open.

Not done: the party card was not opened in a browser. No UI code changed; the card still reads the pack the view already orders. No push; the orchestrator pushes.

## Correction 1

Two tests were added to `test/potion-buying.test.ts`. No production code and no existing expected value changed.

A 33 HP hero alone has need `ceil(33 × 0.5) = 17`. Half of that is 8.5, so the tier is basic (assured 8) and the count is `ceil(17 / 8) = 3`, which is 150 gp. `floor` would make the need 16 and the count 2. The test expects `{ basic: 3 }`, gold `RESERVE + 850`, and one line for 150 gp.

The step-down catalogue is `weak` 1d2+2 (assured 4, 10 gp), `mid` 2d4+2 (assured 8, 100 gp), `odd` 4d4+4 (assured 16, 50 gp), one 40 HP hero, purse reserve + 299 gp. Need is 20 and the cap is 10, so the chosen tier is `mid`. Three mid cost 300 gp, which the purse cannot pay. `odd` is cheaper than `mid` but stronger (16 > 8), so the written filter skips it. Five `weak` cost 50 gp and fit. That is the result the Comments describe, so the test pins `{ weak: 5 }`, gold `RESERVE + 249`, and one line for 50 gp. Without the filter the step would buy two `odd` (100 gp), which also fits.

Each mutation was applied, the new test failed, and the mutation was undone.

`Math.ceil` changed to `Math.floor` on the need:

```
FAIL  test/potion-buying.test.ts > buying potions through the potions step > buys three basic for a 33 HP hero alone
AssertionError: expected { basic: 2 } to deeply equal { basic: 3 }

- Expected
+ Received

  {
-   "basic": 3,
+   "basic": 2,
  }
```

The strength filter removed from the step-down:

```
FAIL  test/potion-buying.test.ts > buying potions through the potions step > steps down to five weak when the stronger cheaper tier is above the chosen one
AssertionError: expected { odd: 2 } to deeply equal { weak: 5 }

- Expected
+ Received

  {
-   "weak": 5,
+   "odd": 2,
  }
```

Check results:

| Command or check | Result |
| --- | --- |
| `pnpm typecheck` | Pass. |
| `pnpm test` | Pass: 32 files passed, 2 skipped; 700 tests passed, 6 skipped (706). |
| Regression hashes, seeded loops, smoke, combat-space seed 75, lairs seed 14, deployment | Not in this diff. `src/town/services.ts` is unchanged. |

Questions: none. Bugs: none. Not done: nothing left from this correction.
