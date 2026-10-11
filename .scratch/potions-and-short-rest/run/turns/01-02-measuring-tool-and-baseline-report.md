# Turn 01 — issue 02 implementation report

Implemented the measuring tool, its importable parser and report interfaces,
and `scripts/tune-baseline.json`. Updated `docs/ARCHITECTURE.md`, `CHANGELOG.md`
and the issue Comments. No game code, existing tests, configuration documents
or regression hashes changed. Baseline commit is `4774e43`, with the identical
`ed52b20` game-code note; actual checkout `51dcc00` differs only in run-log docs.

## Checks

- `pnpm typecheck`: passed (exit 0).
- `pnpm exec vitest run test/tune.test.ts`: 29 passed (exit 0). TDD first
  observed failures for missing parsing/report interfaces and invalid input,
  then passed the implemented public behavior.
- `pnpm test`: 608 passed in 30 files (exit 0), including all six regression
  hashes. No tests were skipped or snapshots re-recorded.
- `git diff --check`: passed.
- `git diff ed52b20 4774e43 -- src scripts/tune.ts test`: empty.
- `git diff --numstat -- src test/simulation-regression.test.ts
  test/job-intel-regression.test.ts test/__snapshots__/simulation-regression.test.ts.snap`:
  empty. The regression guard is unchanged because this slice changes no game
  behavior.
- `SEEDS=1,2, TICKS=0 pnpm dlx vite-node scripts/tune.ts`: expected exit 1,
  `tune: SEEDS must not contain empty entries`.
- `TICKS=0 SEEDS=1,2,3 SCALES=1.15 pnpm dlx vite-node scripts/tune.ts`: exit 0;
  three seeds parsed and initialization-only apothecary figures printed.
- Both commands below: exit 0. They ran in detached processes with
  `start_new_session=True`, stdout/stderr redirected outside the repository and
  exit statuses captured separately. Completion was awaited before recording.

## Acceptance criteria and coverage

| Criterion | Test or verification |
| --- | --- |
| Range and list work; trailing comma fails clearly | `test/tune.test.ts`: expands an inclusive seed range; accepts a comma list; rejects an empty seed entry; plus both actual CLI input checks and the 80-seed run |
| Default scales 1, 1.15, 1.25, 1.5, 1.75 | `test/tune.test.ts`: includes the game difficulty in default scales |
| Five metrics printed unrounded | `test/tune.test.ts`: prints all metrics without rounding; raw baseline output below |
| Reproduce table or record all differences | Required 80-seed, five-scale measurement below; every raw difference documented under issue Comments; original seed expansion and aggregation reviewed |
| Checked-in values, commit, commands, long apothecary run | `scripts/tune-baseline.json` records both completed runs, `4774e43`, the `ed52b20` note and relative commands |
| Each metric's deviation and inclusive +/-15% pass/fail | `test/tune.test.ts`: prints five deviations and passes both edges; fails outside either edge; zero-reference behavior; saved-file CLI check recorded below |
| Apothecary ruin, minimum, final treasury; optional production | `test/tune.test.ts`: preserves an intermediate dip and excludes other services; reports production when present; aggregates across seeds; required long-run output without production below |
| No `src/` change, regression guard untouched and running | Empty scoped diffs; all six checks in `test/simulation-regression.test.ts` and `test/job-intel-regression.test.ts` pass in full suite |
| Whole suite green | `pnpm test`: 608 tests, 30 files passed |

## Baseline output

These are the complete stdout/stderr captures from before the baseline file
was recorded. Therefore comparison is printed as unavailable in these initial
measurements. Every scale reproduces the issue's displayed precision; the
checked-in values retain full output precision. The baseline was transcribed directly from the measured output. All raw numeric differences are in issue Comments.

```bash
SEEDS=1..80 SCALES=1,1.15,1.25,1.5,1.75 TICKS=600 pnpm dlx vite-node scripts/tune.ts
```

```text
tuning: seeds 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80  ticks 600  tolerance +/-15%
scale 1: quests 139.1125  failed 19.5125  deaths 60.7875 (0.43696648396082305/quest)  wiped 4.9875 of 23.1375  raised 9.95
apothecary: ruined 0 of 80  lowest treasury reached -484  treasury at end (mean) 6645.9125  goldSpentOnProduction unavailable
baseline comparison: unavailable (scripts/tune-baseline.json not recorded yet)
scale 1.15: quests 113.8625  failed 28.1375  deaths 85.1875 (0.7481611592930069/quest)  wiped 7.2125 of 30.0625  raised 11.2375
apothecary: ruined 0 of 80  lowest treasury reached -165  treasury at end (mean) 6121.3  goldSpentOnProduction unavailable
baseline comparison: unavailable (scripts/tune-baseline.json not recorded yet)
scale 1.25: quests 104.8  failed 32.9875  deaths 97.375 (0.9291507633587787/quest)  wiped 8.0125 of 33.8  raised 11.7375
apothecary: ruined 0 of 80  lowest treasury reached 355  treasury at end (mean) 6409.3375  goldSpentOnProduction unavailable
baseline comparison: unavailable (scripts/tune-baseline.json not recorded yet)
scale 1.5: quests 83.05  failed 41.0625  deaths 123.15 (1.4828416616496087/quest)  wiped 11.2625 of 40.7625  raised 11.7625
apothecary: ruined 0 of 80  lowest treasury reached 354  treasury at end (mean) 5767.8125  goldSpentOnProduction unavailable
baseline comparison: unavailable (scripts/tune-baseline.json not recorded yet)
scale 1.75: quests 61.425  failed 46.625  deaths 138.9875 (2.262718762718763/quest)  wiped 12.7125 of 45.0875  raised 11.3625
apothecary: ruined 0 of 80  lowest treasury reached -336  treasury at end (mean) 4497.0375  goldSpentOnProduction unavailable
baseline comparison: unavailable (scripts/tune-baseline.json not recorded yet)
```

```bash
SEEDS=1..40 SCALES=1.15 TICKS=3000 pnpm dlx vite-node scripts/tune.ts
```

```text
tuning: seeds 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40  ticks 3000  tolerance +/-15%
scale 1.15: quests 479.6  failed 126.875  deaths 389.55 (0.8122393661384487/quest)  wiped 29.95 of 115.85  raised 50.1
apothecary: ruined 2 of 40  lowest treasury reached -1957  treasury at end (mean) 3832.925  goldSpentOnProduction unavailable
baseline comparison: unavailable (scripts/tune-baseline.json not recorded yet)
```

## Questions, bugs and remaining work

No questions were asked; discretionary choices are recorded in issue Comments.
No new game bug was discovered. The existing apothecary economy reaches a
negative treasury in the required long run (-1957 gp, 2 ruined of 40); reproduce
with the second command above. That deficit is the behavior this baseline
records for the later reward set-aside and retune slices. It is unchanged here.

The smoke check and combat sweep are not required for this measuring-only slice
because it changes no game rules or UI. All issue 02 acceptance criteria are fulfilled. No requested work remains
unimplemented. Final reviews and comparison verification follow.

## Saved-file comparison verification

`SEEDS=1,2,3 SCALES=1.15 TICKS=600 pnpm dlx vite-node scripts/tune.ts`
exited 1 and produced the following actual output. It verifies the saved-file
integration, all five deviations, PASS and FAIL labels, and failure exit status.
This three-seed sample differs from the recorded 80-seed sample: its wipe rate
is 15.540150202195266% above the baseline, so the failure is correct.

```text
tuning: seeds 1,2,3  ticks 600  tolerance +/-15%
scale 1.15: quests 104.33333333333333  failed 28.333333333333332  deaths 86.66666666666667 (0.8306709265175719/quest)  wiped 8.333333333333334 of 31.666666666666668  raised 10.333333333333334
apothecary: ruined 0 of 3  lowest treasury reached 1326  treasury at end (mean) 5293.333333333333  goldSpentOnProduction unavailable
baseline quests: deviation -8.369012332125738% PASS
baseline failed: deviation 0.695986968754626% PASS
baseline deathsPerQuest: deviation 11.0283414475211% PASS
baseline wiped: deviation 15.540150202195266% FAIL
baseline raised: deviation -8.045977011494253% PASS
baseline comparison: FAIL
```

A separate Node verification of `scripts/tune-baseline.json` passed: all five
rows formatted at the issue table's displayed precision equal the table,
commit is `4774e43`, and both commands use relative paths. Final
`pnpm typecheck` passed after recording the baseline.

## Standards review

No findings. The independent reviewer verified relative paths, baseline commit
and identity note, raw measurement agreement, recorded decisions, unchanged
game code/guards, and rule 9 report coverage. Documented-standard violations: 0;
actionable judgment-call smells: 0.

## Spec review

No findings. The independent reviewer verified both required measurements,
relative commands, `4774e43` and `ed52b20` notes, complete raw-output captures,
all numerical differences under Comments and acceptance coverage.

Nothing remains unimplemented. No questions were asked. Existing negative
treasuries are recorded without changing game behavior. The commit containing
this report includes only issue 02 implementation, tests, baseline and documents.
