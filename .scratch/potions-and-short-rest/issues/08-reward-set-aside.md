# Reward set-aside

Status: done

Blocked-by: [05 - Buying policy](05-buying-policy.md), [07 - Apothecary production](07-apothecary-production.md)

The PRD's slice table blocks this slice by production only. The owner added the buying policy as a blocker, so that the long-run check this slice runs is measured with the final buying rule.

## Parent

[PRD: Hit Dice at the short rest, four healing potion tiers and an apothecary that makes them](../PRD.md), slice 7 of 8. Vocabulary: [CONTEXT.md](../../../CONTEXT.md) (Reward set-aside, Treasury, Contract, Board).

## No questions

The owner is not available while this issue is built. Do not ask and do not wait for an answer. Where this issue or the PRD leaves a choice to the implementer (key names, file locations, log wording), decide and write the decision under Comments. Where this issue gives a rule for a doubt or a failure, follow it.

## What to build

The apothecary's promised rewards are kept apart from what new rewards are sized from, so paying a reward never leaves its treasury in debt.

- A rule of any employer: the gold promised in the rewards of its Contracts that are posted and not yet paid, failed or expired (`open` or `taken`) is kept out of the treasury that a new reward is sized from (the amount `treasuryShare` applies to).
- Which employers set their rewards aside is a configuration list. An entry is either a town service (for example `apothecary`, the one employer that runs it) or an employer kind (for example `noble`, every employer of that kind). Validation rejects a name that is in neither catalogue. Default: `apothecary` alone. Extending the rule to another employer is adding it to the list.
- The amount is a property of the employer's outstanding work. Whether it is stored or computed from the Board's list is the implementer's choice; the Board stays the only thing that links an employer to its work.
- The amount is released when the Contract is paid, fails or expires.
- Upkeep is unchanged and can still take a treasury below zero.
- Out of scope: switching the rule on for employers other than the apothecary. The rule is built for it; the other employers are untested and still dip into debt.

## Final check 3: the apothecary over a long run

This slice runs final check 3 with the real `scripts/tune.ts` as its own acceptance. [Issue 09](09-retune-confirmation.md) runs it again with every slice merged.

- Run: 3,000 ticks, seeds 1 to 40, scale 1.15 (`TICKS=3000 SEEDS=1..40 SCALES=1.15`).
- Pass: no apothecary treasury below zero at any tick, and no more apothecaries ruined than the figure issue 02 recorded in the baseline file (ticket 09 measured 2 of 40).
- For reference, the prototype had 0 ruined and a lowest treasury of +152 gp. It is evidence, not a reference implementation.
- This is a measurement over 40 seeds, not a guarantee, because upkeep can still take a treasury below zero.
- Write the command and the report's output in the Comments of this issue.
- If issue 06 (sharing policy) is not merged when this runs, say so with the result.

### If the check fails

The owner decided this in advance:

1. If an apothecary treasury goes below zero because of the posting threshold (see the point to confirm below), apply the fix described there and run the check again.
2. If the check still fails, or fails for another reason, do not move any tuning value in this issue. Write the command, the output and the cause you found in the Comments, finish the slice and commit it. Issue 09 runs the check again and is the only issue allowed to retune.

## Point to confirm while implementing

- With the set-aside, an employer's treasury can meet `postingThreshold` while the treasury left after the rewards owed is small or zero, and `minimumReward` (20 gp) still applies to the new reward. The tickets only say that new rewards are sized from the treasury minus the rewards owed. Build it that way first.
- The owner's decision: only if the long-run check shows an apothecary treasury below zero from this cause, make the posting threshold read the same reduced amount (the treasury minus the rewards owed) for the employers in the set-aside list, and leave it as today for every other employer. Then add a test for it, describe it in `docs/CONFIGURATION.md`, run check 3 again and write both runs in the Comments. If the check passes without it, do not change the posting threshold.

## Regression hashes

The six regression hash tests were skipped by issue 03. Leave them skipped. Do not re-record them or update the snapshot; issue 09 does that once.

## Acceptance criteria

- [x] A new reward of the apothecary is sized from its treasury minus the rewards it owes on `open` and `taken` Contracts.
- [x] An employer outside the list is sized as today.
- [x] An employer kind in the list switches the rule on for every employer of that kind.
- [x] The amount set aside is released when the Contract is paid, fails or expires.
- [x] The list is configuration, default the apothecary alone; an entry that is neither a town service nor an employer kind is rejected.
- [x] Final check 3 was run, with its command and output recorded in this issue's Comments. If it failed, the rule of "If the check fails" was followed and the cause is written there.
- [x] The posting threshold is unchanged unless check 3 showed an apothecary treasury below zero from it.
- [x] The six regression hash tests stay skipped and are not re-recorded.
- [x] The suite is green.

### Tests

New:

- Set-aside: a new reward is sized from the treasury minus the rewards owed; an employer outside the list is sized as today; an employer kind in the list switches on every employer of that kind; the amount is released when the Contract is paid, fails or expires.
- Configuration: every entry of the set-aside list is a known town service or employer kind.

## Configuration and documents

- Added: the list of employers that set their rewards aside, default the apothecary only. The key name and its section are the implementer's choice, following the rule of `docs/CONFIGURATION.md` that a value lives in the section of the module that owns it.
- Removed: none.
- `docs/CONFIGURATION.md`: the list, what an entry may be, and that only the apothecary is tested.
- `docs/ARCHITECTURE.md`: reward sizing where the Board and employers are described; the new tests in the test table.
- `CHANGELOG.md`: the Reward set-aside.

## Comments

### Implementation decisions (turn 07)

- Use required `board.rewardSetAsideFor`, default `['apothecary']`. Validate
  against the town service and employer kind catalogues; empty disables it.
  A name matches either catalogue, so `temple` also matches every temple kind.
- Compute outstanding gold on the Board, filtering this employer's `contract`
  work in `open` or `taken`. Payment is `done`; failure and expiry are `failed`
  in the existing model. No stored amount or new employer/work link.
- Expose `Board.rewardTreasury(employer)` to its creators through WorkContext;
  Contract generation requires `QuestTerms.rewardTreasury`. Posting moves no
  gold and adds no random draw.
- Tests use the agreed Board, employer treasury/Coin, configuration and hourly
  Game interfaces, with exact rewards and balances. No questions asked under
  this issue's No questions rule. Keep the existing posting threshold for the
  first run; apply the owner's conditional fix only if check 3 warrants it.
- Run check 3 with issues 02 through 07 merged, including issue 06 sharing
  policy and issue 07 production (`b0e724e`). Compare the apothecary line
  manually with unchanged `apothecaryLongRun` in `scripts/tune-baseline.json`:
  2/40 ruined; lowest treasury -1,957 gp. The script's unavailable metric
  comparison at 3,000 ticks is expected.

### Final check 3 (turn 07)

Command (detached background process, output outside the repository, waited
for completion):

```sh
TICKS=3000 SEEDS=1..40 SCALES=1.15 pnpm dlx vite-node scripts/tune.ts
```

Actual output:

```text
tuning: seeds 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40  ticks 3000  tolerance +/-15%
scale 1.15: quests 479.025  failed 111.325  deaths 378.825 (0.7908251135118208/quest)  wiped 32.075 of 111.6  raised 45.925
apothecary: ruined 0 of 40  lowest treasury reached 198  treasury at end (mean) 2439.85  goldSpentOnProduction 54749.375
baseline comparison: unavailable (TICKS=3000; baseline has 600 ticks)
```

Exit 0. PASS: lowest treasury +198 gp is above zero; 0 ruined of 40 is no
more than baseline 2/40 (baseline lowest -1,957 gp). Issues 02–07 are all
merged, including issue 06 sharing policy and issue 07 production (`b0e724e`).
The printed comparison is unavailable because it compares only the 600-tick
baseline; the apothecary line was compared manually with `apothecaryLongRun`.
`scripts/tune-baseline.json` was not changed. The owner’s threshold fix was
not triggered: the posting threshold stays on full treasury. No tuning value
moves, no second run is required.

### Verification and review (turn 07)

- `pnpm typecheck`: PASS. `pnpm test`: PASS, 743 passed and the six regression
  hashes skipped. The named surviving tests, seeds, expectations, both hash
  files and snapshots are unchanged. No random draw and no tuning value moved.
- Focused Board/configuration checks: 100 tests passed. All seven targeted
  mutations were killed, including each terminal status, taken work, employer
  selection, missing production configuration and creation wiring.
- Standards and Spec code-review agents reviewed against starting HEAD
  `44baee650e6a4bd76c9a45408b2e03ef96c10a99`. No implementation findings;
  provisional threshold wording was replaced with the actual unchanged rule
  after check 3, and both reviewers confirmed no remaining findings.
- Browser smoke could not run: no browser connection; native Dia access was
  denied (“Computer Use was not approved to use Dia”). The dev servers started
  for the attempted checks were stopped. No questions; no new bugs found.
- Full report: `../run/turns/07-08-reward-set-aside-report.md`.

- Long sweep: `FROM=1 TO=150 HOURS=1500 pnpm dlx vite-node scripts/combat-sweep.ts`,
  exit 0; final output: `no crashes in seeds 1-150 for 1500 hours`.
- Turn commit message: `Implement configured reward set-aside for outstanding Contracts`.
  The orchestrator records the commit hash when closing this issue.

### Closed by the orchestrator (2026-10-12)

Commit `23c5c2b` (Codex). Review: PASS in the first round. The slice reviewer found evidence for every acceptance criterion, killed every named mutation, showed that with an empty list the per-tick world hashes equal the parent's on five seeds over 1,200 ticks, reproduced final check 3 exactly (ruined 0 of 40, lowest treasury 198 gp, against the baseline's 2 of 40 and -1,957 gp), and ran the long sweep (`no crashes in seeds 1-150 for 1500 hours`). 743 tests green, 6 skipped. The posting threshold is unchanged, as the check passed without it.

For issue 09: `CONTEXT.md` still says paying a reward "never leaves the treasury negative", while a 20 gp minimum reward can exceed what is left after the rewards owed (the issue allows it and `docs/CONFIGURATION.md` says so). Reviewer notes, not corrected: the threshold read in `raids()` has no test; `Board.rewardTreasury` could be private; `SERVICE_KINDS` would not catch a service added to the union but not to the list.
