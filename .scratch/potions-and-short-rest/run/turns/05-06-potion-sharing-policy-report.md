Issue 06 is implemented on `feature/potions-healing`. A company draws a Potion sharing policy once, when it is constituted, and both combat and the Short rest serve a short pack in that order. Decisions are under the issue's Comments.

The orders are `company-order` and `most-hurt`, behind `PotionSharing` in `src/adventurers/policies.ts`. The weights are `policies.potionSharing`, default 50 / 50. The draw is the last random step of `createParty`: one `rng.weighted` call, after classes, heroes and the company name. A company with no `policies` is served in company order. A merger does not copy policies, so the host keeps its own. The expedition forwards a recorded policy on the combat options. The companion who gives a potion to a fallen hero is still the first conscious hero in company order. Log lines are unchanged.

Check results:

| Command or check | Result |
| --- | --- |
| `pnpm typecheck` | Pass. |
| `pnpm test` | Pass: 33 files passed, 2 skipped; 707 tests passed, 6 skipped (713). |
| Diff of `test/simulation-regression.test.ts`, `test/job-intel-regression.test.ts`, and their snapshots | Empty. Those files are not in the commit. |
| Smoke, `combat-space` seed 75, `lairs` seed 14, `deployment`, the company roster seeded loops, the combat potion tests | Not in the diff, except the roster files only gained the policies argument on `new CompanyRoster`. Those loops were not edited. They pass inside the full suite. |

The six regression hashes stay skipped. The new draw does change later world events, and the issue forbids re-recording the hashes. The guard while they are skipped is the named survivors above: no new seed and no new expectation in those tests, and they pass.

`test/lairs.test.ts` ("every town starts with lairs and their raids reach the board") is not one of those named survivors. Seed 5 still posts a lair bounty (by hour 3) and still raids, but that bounty is no longer open at hour 600. The test now requires a lair bounty on the open board at some hour of the same 600, plus the original start-of-town and raids checks.

Acceptance coverage:

| Criterion | Coverage and result |
| --- | --- |
| With a short pack, policy (a) serves Bloodied heroes in company order, in combat and at the rest | `test/potion-sharing.test.ts`: "serves Bloodied heroes in company order when that is the policy". Ann 5/10, Bev 6/40, Cid 0/20, two basic potions. Combat expects Ann 10, Bev 14, Cid dead at 0, and the two drink lines in that order. The Short rest expects Ann 10, Bev 14, Cid alive at 0, an empty pack, and the breath line naming Ann then Bev. Pass. |
| With a short pack, policy (b) serves fallen heroes first, then the lowest hit point fraction, in combat and at the rest | "serves fallen heroes first, then the lowest hit point fraction". Combat expects Ann still at 5, Bev 14, Cid alive at 8, and "Ann gives Cid" then "Bev drinks". The rest expects Ann 5, Bev 14, Cid 8, an empty pack, and the breath line naming Cid then Bev. Swapping the orders, sorting by hit points (Cid then Ann), leaving Cid in place (Bev then Ann), or honouring the policy in only one of the two places fails one of these two tests. Pass. |
| The policy is drawn once per company at a fixed place; a seed reproduces its own run | "draws once per company from the seeded generator, and the stream advances the same whatever the weights" admits through the roster. Seeds 1–20 with weights 100/0, 0/100 and 50/50 leave the same next `rng.int` after one company, and the same next int after a second company. Repeating a seed repeats its policies. "advances the world stream the same whatever the weights, and a seed repeats its policy" compares `Game.regressionState()` after one hour. Pass. |
| Weights 100 / 0 always draw company order | The same roster test: seeds 1–20, and a second company on seed 5, are `company-order` under 100 / 0. The game-hour test expects `company-order` for seed 4 under 100 / 0. Pass. |
| A merged company keeps the host's policies | "keeps the host's policies when two companies merge". Host is `most-hurt`, donor is `company-order`, and the host is still `most-hurt` after `roster.merge`. Pass. |
| A company with no recorded policy behaves as (a) | "serves a company with no recorded policy in company order". The fight omits `potionSharing`. The rest deletes `policies`. Both match the company-order hit points and pack. Pass. |
| The weights are configuration, default 50 / 50, validated: the list is not empty or all zero | "defaults to 50 / 50 and rejects an empty list or a list of zeroes". Expects `DEFAULT_CONFIG.policies.potionSharing` of 50 and 50, `policies.potionSharing: empty weight list`, and `policies.potionSharing: every weight is zero`. Pass. |
| The six regression hash tests stay skipped and are not re-recorded | Those files are not in the diff. The full suite reports 6 skipped. Pass. |
| The suite is green | `pnpm typecheck` and `pnpm test` pass. |

## Standards

No hard violation left. Judgement calls:

- `createParty` defaults the weight list so existing direct calls still draw. The roster passes the configured list, so an override reaches constitution.
- `CompanyPolicies` holds only `potionSharing`. The issue asked for that object so a later buying rule or Hit Dice pacing can join it.
- The fallen-first sort and the fraction sort live in one comparator. A fallen hero is at 0 hit points, so the fraction alone would also put them first; the explicit check is what the issue names, and the combat and rest expectations fail if Cid is not served ahead of Ann.

## Spec

Both orders, the draw, the merger, the missing policy, and the weight checks are in `test/potion-sharing.test.ts` and go through `runCombat`, `advanceExpedition`, `CompanyRoster` and `Game`. Tier choice and the administering companion are unchanged: Cid is given the potion by Ann, the first conscious hero in company order. No requirement is missing and nothing outside the issue was added, other than the lairs assertion noted above.

Review summary: Standards had no hard violation and three judgement calls left in place. Spec had no missing requirement.

Questions: none.

Bugs: none left open.

Not done: nothing. No push; the orchestrator pushes.

## Correction 1

The policy is now drawn after the heroes and before the company name. `createParty` takes the weight list as a required argument. A stranded band arriving through the roster gets the weights that roster was given. The expedition test expects a literal options object, and a `most-hurt` company is forwarded as `most-hurt`. `potionSharingOf` indexes the table of orders by name. The interface document matches those signatures.

`test/lairs.test.ts` is the `27539f5` file again, plus the required weights argument on its two `createParty` calls. The hour-600 assertion is the original one, and it passes. No other test needed a new expectation.

Check results:

| Command or check | Result |
| --- | --- |
| `pnpm typecheck` | Pass. |
| `pnpm test` | Pass: 33 files passed, 2 skipped; 709 tests passed, 6 skipped (715). |
| Diff of the regression hash tests and their snapshots | Empty. |
| `test/lairs.test.ts` against `27539f5` | The assertion is unchanged. The file adds the weights import and passes that list into the two `createParty` calls. |

The regression guard did not change. The six hashes stay skipped. Moving the draw before the name left every other expected value as it was.

The stranded-band mutation was the call in `src/adventurers/company-roster.ts` receiving `DEFAULT_POLICIES_CONFIG.potionSharing` instead of `this.policies.potionSharing`. `test/potion-sharing.test.ts` ("gives a stranded band the policy the roster weights dictate") then failed:

```
AssertionError: expected 'most-hurt' to be 'company-order'

Expected: "company-order"
Received: "most-hurt"

 ❯ test/potion-sharing.test.ts:251:38
     expect(arrive(companyOrderOnly)).toBe('company-order');
```

That call was put back. The fight mutation was `src/sim/expedition.ts` forwarding `potionSharing: 'company-order'` on every fight. `test/expedition.test.ts` ("passes a most-hurt policy into the fight") then failed:

```
-   "potionSharing": "most-hurt",
+   "potionSharing": "company-order",
```

That forwarding was put back.

| Criterion | Coverage and result |
| --- | --- |
| The draw is after the heroes and before the name, and the original lairs test passes | `test/lairs.test.ts`: "every town starts with lairs and their raids reach the board", restored. Seed 5, 600 hours, a lair bounty still open. Pass. |
| The weights are a required argument, passed by the script and the tests | `createParty` has no default. `scripts/assault.ts` and every direct call pass `DEFAULT_POLICIES_CONFIG.potionSharing`. The roster still passes `this.policies.potionSharing`. |
| A stranded band gets the policy the weights dictate | "gives a stranded band the policy the roster weights dictate". Weights 100 / 0 yield `company-order`. Weights 0 / 100 yield `most-hurt`. Pass. The mutation above fails it. |
| The expedition options expectation is a literal, and a most-hurt fight receives `most-hurt` | "passes a blessing and the no-retreat rule into the final lair fight" expects `potionSharing: 'company-order'` as a literal, which is the policy that setup draws. "passes a most-hurt policy into the fight" expects `potionSharing: 'most-hurt'`. Pass. The mutation above fails the second. |
| The interface document matches the code | `docs/ARCHITECTURE-INTERFACES.md` now has `CompanyRoster(..., policies)`, `createParty(..., sharingWeights)`, `src/adventurers/policies.ts`, and `CombatOptions.potionSharing`. |
| An order is selected by the policy's name | `potionSharingOf` returns `SHARING[policy]`, and company order only when `policy` is `undefined`. The fight and rest tests still pass for both orders and for a company with no recorded policy. |
| The six regression hash tests stay skipped | Those files are not in the diff. The suite reports 6 skipped. |

## Standards

No hard violation left. The script and the direct tests pass the module's default list because they are not the roster. The roster passes the list it was constructed with, including into the stranded band.

## Spec

The six corrections are in the tests and the documents above. No requirement from the correction is missing. No expected value outside the allowed edits was changed.

Review summary: Standards had no hard violation. Spec had no missing requirement.

Questions: none.

Bugs: none left open.

Not done: nothing. No push; the orchestrator pushes.
