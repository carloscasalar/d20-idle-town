Issue 13 is implemented on `feature/potions-healing`. The Company plans one round of drinking in `planDrinkingRound` (`src/adventurers/policies.ts`). A Healing potion's drink is `drinkPotion` (`src/adventurers/potions.ts`): roll the formula on the dice it is given, take one from the pack, and give the drink's text. The fight and the Short rest describe their adventurers, ask for the plan, and apply each drink. No game behaviour changes.

The plan is given living adventurers in company order. Each one carries an id, a name, hit points, a maximum, and whether they are conscious. Nothing of the engine is passed in. The conscious companion is the first conscious adventurer in that list, chosen once. One companion may give several potions. A dead adventurer is not described. An unconscious adventurer above 0 hit points is not in the plan. An adventurer at 0 or fewer hit points is missing their whole maximum; when they are not conscious, the companion gives them the potion. At a Short rest every living adventurer is conscious, so someone at 0 hit points drinks. When nobody is conscious, or the pack has nothing left, the plan stops. The pack the decision is given is not written; a copy runs down as the plan is made.

Check results:

| Command or check | Result |
| --- | --- |
| `pnpm typecheck` | Pass. |
| `pnpm test` | Pass: 38 files, 784 tests. |
| Diff of `test/simulation-regression.test.ts`, `test/job-intel-regression.test.ts`, their snapshots, and `scripts/tune-baseline.json` | Empty. Those files are not in the commit. |

The regression guard did not change. The hashes were not re-recorded.

Acceptance coverage:

| Criterion | Coverage and result |
| --- | --- |
| `runCombat` and `shortRest` contain no Bloodied filter, no call to the Potion sharing policy's order, and no choice of tier; both obtain a plan | `src/combat/battlecast.ts` describes each living fighter and calls `planDrinkingRound`. `shortRest` in `src/sim/expedition.ts` does the same with every living adventurer conscious. Neither calls `isBloodied`, `potionSharingOf`, or a tier choice. |
| Rolling, taking the potion, and the drink's text happen in one operation of `src/adventurers/potions.ts`, used by both | `drinkPotion`. The fight and the Short rest both call it. `test/potions.test.ts`: "rolls the formula on the dice it is given, takes one from the pack, and gives the drink" expects total 8, the text `Ann drinks a basic healing potion (2d4+2: 8).`, and the pack `{ basic: 1 }`. "names the companion when the potion is given" expects total 10 and `Ann gives Cid a basic healing potion (2d4+2: 10).` |
| The decision rolls no dice and writes neither the pack nor an adventurer | `test/potion-sharing.test.ts`: "leaves the pack and the adventurers it was given unchanged". After a most-hurt plan the pack is still `{ basic: 1, greater: 2 }` and the two adventurers are still Ann then Bev. The decision takes no dice. |
| A short pack runs down: one potion, two Bloodied adventurers, only the first in policy order drinks | "with one potion, only the first Bloodied adventurer in policy order drinks". Most hurt, Ann 5/10 and Bev 6/40, one basic potion. The plan is only Bev. |
| The choice of tier is no longer exported from `src/adventurers/potions.ts`, and pack helpers nobody outside that file uses are no longer exported | `choosePotion` is gone. `takePotion` and `potionDrinkText` are private. `docs/ARCHITECTURE-INTERFACES.md` lists the exports of `potions.ts` and `policies.ts` after the change. |
| The regression hash tests pass without re-recording, and `scripts/tune-baseline.json` is unchanged | Both hash files and the baseline are absent from the diff. The full suite passes. |
| The three architecture documents describe the decision, the effect, and where each lives | `docs/ARCHITECTURE.md`, `docs/ARCHITECTURE-INTERFACES.md`, and `docs/ARCHITECTURE-IMPROVEMENTS.md` (section 9). |
| `pnpm typecheck` and `pnpm test` are green | Both pass. |

The reviewer's mutations, and the test with exact values that fails for each:

| Mutation | Test |
| --- | --- |
| The decision writes the pack it was given | "leaves the pack and the adventurers it was given unchanged" expects `{ basic: 1, greater: 2 }`. |
| A fallen adventurer's missing hit points are `maxHp - hp` | "counts a fallen adventurer as missing their whole maximum, even when hit points are below zero". Cid at −8 of 20 expects tier `close`. `maxHp - hp` is 28, which `flood` covers and `close` does not. |
| The strongest covering tier is chosen | "drinks the smallest tier whose assured healing covers the hit points missing". 8 of 16, every tier stocked, expects `basic`. |
| The last conscious companion gives the potion | "the first conscious companion gives every potion in the round". Ann then Bev are conscious; Cid and Dee have fallen. Both givers are `Ann`. |
| A fallen adventurer still drinks when nobody is conscious | "nobody drinks when nobody is conscious" expects `[]`. |
| The plan does not run the pack down | "with one potion, only the first Bloodied adventurer in policy order drinks" expects only Bev. |
| The decision ignores the Potion sharing policy | "serves fallen adventurers first, then the lowest hit point fraction". Two basic potions. Expects Cid (given by Ann) then Bev, not Ann then Bev. |
| In the fight, the drink is not taken from the fight's copy, or not counted in `potionsDrunk` | `test/combat-potions.test.ts`: "does not overdraw a shared supply when multiple heroes need healing" expects `potionsDrunk` `{ basic: 1 }` and one drink line. On seed 4 the plentiful pack drinks in round 2 and again in round 3, so a copy that is not run down drinks twice. "applies the plan between rounds of a fight" expects `potionsDrunk` `{ basic: 2 }`. |
| At the Short rest, the drink is not taken from the Company's pack | "applies the plan at a Short rest" expects `potions` `{}`. |
| The effect rolls from a generator other than the one it is given | "rolls a different total when it is given a different generator" expects 8 (`4d4+4` of all 1s) and 20 (all 4s). The fight tests "keeps the engine log identical until the first drink whether the potion rolls low or high" and "rolls the drink on the child generator taken after placement" stay in `test/combat-potions.test.ts`. |

Tests moved, removed, or edited:

Moved from `test/potions.test.ts` (`choosing a healing potion`) to `test/potion-sharing.test.ts` (`the company plans a round of drinking`). The expected tier names are the ones those tests had. A wound that is not Bloodied cannot appear in a plan, so two inputs moved to a Bloodied wound with the same hit points missing:

- "drinks the smallest tier whose assured healing covers the hit points missing". Was 12/20, 11/20, 3/20, 0/50. Now 8/16 (missing 8, `basic`), 9/18 (missing 9, `greater`), 3/20 (`superior`), 0/50 (`supreme`).
- "drinks the strongest tier in the pack when none covers the wound". Still 0/51 and tier `greater`. The adventurer is conscious, so they drink.
- "counts a fallen hero as missing their whole maximum, even when hit points are below zero", renamed "…fallen adventurer…". Still −8/20 and 0/20, tier `close`. A conscious companion is in the list so the fallen adventurer is in the plan.
- "ignores an empty count and a tier the pack does not hold". The empty pack is still 1/20 and an empty plan. The supreme-only case was 19/20 and is now 8/16; the tier is still `supreme`.
- "ranks tiers by assured healing when the catalogue lists a stronger tier first". Was 19/20. Now 8/16. The tier is still `basic`.

Removed from `test/potion-sharing.test.ts`, because those expectations now sit on the decision:

- "serves Bloodied heroes in company order when that is the policy" (fight and Short rest).
- "serves fallen heroes first, then the lowest hit point fraction" (fight and Short rest).
- "serves a company with no recorded policy in company order" (fight and Short rest).

Company order is now "serves Bloodied adventurers in company order when that is the policy". The other two names are unchanged. All three test the plan with plain data. Company order with two basic potions is Ann then Bev. Most hurt is Cid, given by Ann, then Bev. No recorded policy matches company order.

Edited in `test/potion-sharing.test.ts`:

- `fight` passes the company's pack into `runCombat` and returns it.
- "applies the plan between rounds of a fight" keeps the old most-hurt fight values (Ann 5, Bev 14, Cid alive at 8, `potionsDrunk` `{ basic: 2 }`, "Ann gives Cid" then "Bev drinks") and expects the pack passed in to stay `{ basic: 2 }`.
- "applies the plan at a Short rest" keeps the old company-order rest values (Ann 10, Bev 14, Cid alive at 0, pack `{}`, the breath line naming Ann then Bev).

Added in `test/potions.test.ts`, under "drinking a healing potion": the three `drinkPotion` tests named above. "lists the tiers a company holds, in catalogue order" is unchanged.

`test/combat-potions.test.ts` is unchanged. "drinks the tier that covers the fight maximum, which the base maximum would not" stays there. It pins the maximum the fight describes (a blessing, so the drink is superior) and `potionsDrunk` `{ superior: 1, greater: 1 }`. The tier table itself is the decision tests above.

`scripts/assault.ts` now calls `drinkPotion` so it typechecks after `takePotion` became private. Its own loop remains until issue 14.

No new term was added to `CONTEXT.md`.

Questions: none.

Bugs: none.

Not done: nothing. No push; the orchestrator pushes.
