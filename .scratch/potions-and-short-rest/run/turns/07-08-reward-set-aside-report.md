# Turn 07 — issue 08: Reward set-aside

Implemented the issue contract. `board.rewardSetAsideFor` is required by the
Board, defaults to the apothecary alone, accepts town service and employer
kind names, and rejects unknown names. The Board computes each employer's
outstanding `open`/`taken` Contract rewards and supplies the remaining treasury
to new Contract generation. Paid (`done`), failed and expired (`failed`) work
release the amount automatically. No gold is moved at posting, no random draw
is added, and no tuning value moves. Posting thresholds and upkeep are unchanged.
Updated configuration, architecture, public interface documentation and changelog.

The issue's Comments record decisions and the full final-check output. Review
fixed point is starting HEAD `44baee650e6a4bd76c9a45408b2e03ef96c10a99`; the
review covered the working diff and the new test file. Standards and Spec
agents independently found no implementation findings. Their documentation
follow-up was resolved and both confirmed no remaining findings.

## Checks

| Command or check | Result |
| --- | --- |
| `pnpm typecheck` | PASS, including the final production/test surface. Intermediate fixture compile errors were corrected. |
| `pnpm test test/reward-set-aside.test.ts` | PASS: 14 tests. Initial red demonstrated the old 800-gp second reward instead of 160 gp; final outcomes are exact. |
| `pnpm test test/game-config.test.ts -t 'Reward set-aside'` | PASS: 2 tests; initial red rejected the new list as an unknown field. |
| `pnpm test test/reward-set-aside.test.ts test/board.test.ts test/contract-ruin.test.ts test/game-config.test.ts` | PASS: 100 tests. Existing generation callers now supply the required reward treasury; their expectations did not change. |
| `pnpm test` | PASS: 35 files passed, 2 skipped; 743 tests passed, 6 skipped. |
| `TICKS=3000 SEEDS=1..40 SCALES=1.15 pnpm dlx vite-node scripts/tune.ts` | PASS, exit 0. Detached background process, output outside the repository, waited for completion. Real output below. |
| `FROM=1 TO=150 HOURS=1500 pnpm dlx vite-node scripts/combat-sweep.ts` | PASS, exit 0: `no crashes in seeds 1-150 for 1500 hours` (225,000 simulated hours). `dlx` uses the available runner in this repository. |
| Seven targeted mutations, each followed by `pnpm test test/reward-set-aside.test.ts` | All killed: ignoring taken; counting paid; counting failed/expired; applying outside the list; a kind reaching only its service operator; silently defaulting a missing production list; bypassing Board reward-sizing wiring. Original code restored. |
| `git diff --check` | PASS. |
| Standards / Spec code review | PASS / PASS, including final documentation follow-up. |
| Browser smoke | Blocked: no connected browser (`iab` unavailable, browser inventory empty); native Dia access returned “Computer Use was not approved to use Dia”. Approved `pnpm dev` started Vite after the initial sandbox port-bind EPERM; both servers started for attempted smoke checks were stopped. |

Final check 3 ran with **every earlier slice merged**, including issue 06 sharing
policy and issue 07 production (`b0e724e`). Actual output:

```text
tuning: seeds 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40  ticks 3000  tolerance +/-15%
scale 1.15: quests 479.025  failed 111.325  deaths 378.825 (0.7908251135118208/quest)  wiped 32.075 of 111.6  raised 45.925
apothecary: ruined 0 of 40  lowest treasury reached 198  treasury at end (mean) 2439.85  goldSpentOnProduction 54749.375
baseline comparison: unavailable (TICKS=3000; baseline has 600 ticks)
```

Manual comparison with unchanged `scripts/tune-baseline.json.apothecaryLongRun`:
0/40 ruined versus baseline 2/40; lowest +198 gp versus baseline -1,957 gp.
The minimum is above zero and ruin does not exceed the baseline. The script's
600-tick metric comparison is unavailable at 3,000 ticks as expected. No
threshold cause occurred, so the owner's conditional fix was not triggered;
no second run and no retuning were necessary.

## Acceptance criteria and evidence

| Criterion | Covering test or check |
| --- | --- |
| Apothecary rewards sized after open and taken obligations | `test/reward-set-aside.test.ts`: “sizes new rewards after both open and taken Contracts, without moving treasury” (800, 160, 32 gp; treasury 1,000 gp); hourly Game cases (80 gp after 400 owed from 500). |
| Employers outside the list unchanged | “leaves an employer outside the list unchanged and keeps each employer’s obligations separate” (smith rewards 800/800, apothecary 800/160, both treasuries 1,000). |
| Configured kind reaches every employer of that kind | “switches on every employer of a configured kind, including one that runs a service” (every generated merchant posts 800 then 160 gp, treasury 1,000). |
| Amount released on payment, failure and expiry | Three “releases the amount…” cases use Board take/settle/expire and leave another open reward: paid treasury 240/reward 64/purse +800; failed 1,000/672/+0; expired 980/656/+0. Each finished record remains on the Board. |
| List configurable, default apothecary, unknown rejected | Two new configuration tests cover every known name, default, empty list, unknown and missing complete configuration. Board test requires the production list; hourly Game tests prove overrides reach reward sizing. |
| Final check 3 recorded; owner failure rule followed | Exact command/output in Comments and this report; passed with all earlier slices merged, so no failure rule invoked. |
| Posting threshold unchanged unless specified failure | Hourly case posts minimum 20 gp from treasury 1,000 with 980 owed (available 20, below threshold 25); Game posting code unchanged. “leaves upkeep able to take the apothecary below zero” gives -10 gp. |
| Six regression hashes skipped, not re-recorded | Regression tests and snapshots have no diff; final suite has six skipped tests. |
| Suite green | Final `pnpm typecheck` and `pnpm test` pass. |

Regression guard: unchanged. No hashes or snapshots re-recorded, no seed or
expectation changes to `smoke`, `combat-space` seed 75, `lairs` seed 14,
`deployment`, or the seeded company-roster loops. All pass in the full suite.
The tuning baseline is untouched.

Committed on the current branch with message
`Implement configured reward set-aside for outstanding Contracts`.

Questions: none; choices were decided and recorded under Comments under the
issue's No questions rule. New bugs found: none.

Not done: the 30-step/four-tab/fastest-speed/difficulty-1.5 browser smoke,
because no connected browser exists and native access was denied. `RTK.md`
was absent from the repository and searched instruction locations. No issue
acceptance criterion remains unimplemented. The orchestrator pushes.
