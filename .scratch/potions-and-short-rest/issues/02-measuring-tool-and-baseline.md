# Measuring tool and baseline

Status: ready-for-agent

Blocked-by: none - can start immediately

## Parent

[PRD: Hit Dice at the short rest, four healing potion tiers and an apothecary that makes them](../PRD.md), slice 1 of 8. Vocabulary: [CONTEXT.md](../../../CONTEXT.md).

## No questions

The owner is not available while this issue is built. Do not ask and do not wait for an answer. Where this issue or the PRD leaves a choice to the implementer (key names, file locations, log wording), decide and write the decision under Comments. Where this issue gives a rule for a doubt or a failure, follow it.

## What to build

`scripts/tune.ts` becomes the one command that says whether the retuned game still sits where today's game does. This slice changes the script, records today's numbers in a baseline file and changes **no game code**: nothing under `src/` is touched, so every existing test, the six regression hashes included, stays green and untouched.

The script gains (PRD section "`scripts/tune.ts`"):

- Seeds as a range, `SEEDS=1..80`, as well as a comma list. An empty entry (for example a trailing comma) is an error instead of seed 0.
- Default scales `1, 1.15, 1.25, 1.5, 1.75`.
- Unrounded output for the five metrics: quests, failed, deaths per quest, wiped, raised (deaths and arrived are printed too, as the baseline table has them).
- A baseline file checked into the repository holding the per-scale values, the commit they were measured on and the command. The script compares a run against it, prints each metric's deviation and says pass or fail at +/-15%.
- An apothecary report, read from the game view on every tick: apothecaries ruined, the lowest treasury reached, the treasury at the end, and `goldSpentOnProduction` once it exists. The view already exposes each employer's `service`, `treasury` and `ruined`, so the report needs no game code. That statistic does not exist until [issue 07](07-apothecary-production.md); the report must work without it now and show it when it appears.

The argument parsing must live where a test can import it without running the simulation.

## Baseline: reproduce first, then record

The baseline is recorded by this slice, before any change to the game code. Measure on the tip of the branch as it is when this issue starts (game code, scripts and tests are identical to commit `ed52b20` on `feature/potions-healing`).

1. With the changed script on unchanged game code, run seeds 1 to 80, 600 ticks, scales 1, 1.15, 1.25, 1.5, 1.75. The original command was:

   ```
   SEEDS=$(seq 1 80 | paste -sd, -) SCALES=1,1.15,1.25,1.5,1.75 TICKS=600 pnpm dlx vite-node scripts/tune.ts
   ```

   After the change the same run is `SEEDS=1..80`. Do not write the seed list with `seq -s, 1 80`: on macOS it leaves a trailing comma, `Number('')` is 0, and the old script quietly runs 81 seeds with seed 0 included.

2. The output must reproduce this table:

   | Scale | quests | failed | deaths | deaths per quest | wiped | arrived | raised |
   |---|---|---|---|---|---|---|---|
   | 1 | 139.11 | 19.51 | 60.79 | 0.437 | 4.99 | 23.1 | 9.95 |
   | 1.15 | 113.86 | 28.14 | 85.19 | 0.748 | 7.21 | 30.1 | 11.24 |
   | 1.25 | 104.80 | 32.99 | 97.38 | 0.929 | 8.01 | 33.8 | 11.74 |
   | 1.5 | 83.05 | 41.06 | 123.15 | 1.483 | 11.26 | 40.8 | 11.76 |
   | 1.75 | 61.42 | 46.63 | 138.99 | 2.263 | 12.71 | 45.1 | 11.36 |

   If it does not reproduce, treat it as a mistake in the changed script and fix the script until it does. The game code must stay untouched. If after reviewing the script the values still differ, record as the baseline what the real script measures, write each difference from this table in the Comments of this issue, and finish the slice; the later issues then compare against the recorded file, not against the PRD's table.

3. Record the baseline file from that run. As its commit, record the commit the run was made on, and note that its game code is identical to `ed52b20`.

4. Record today's long-run apothecary figures with the script: 3,000 ticks, seeds 1 to 40, scale 1.15: apothecaries ruined, lowest treasury reached, treasury at the end. Ticket 09 measured 2 ruined of 40; record what the script measures, in the baseline file, with its command. Final check 3 ([issue 08](08-reward-set-aside.md), [issue 09](09-retune-confirmation.md)) compares against these figures.

## Acceptance criteria

- [x] `SEEDS=1..80` and `SEEDS=1,2,3` both work; `SEEDS=1,2,` fails with a clear error.
- [x] The default scales are 1, 1.15, 1.25, 1.5, 1.75.
- [x] The five metrics are printed unrounded.
- [x] The script reproduces the table above on unchanged game code, or every difference is written in the Comments.
- [x] A baseline file is checked in with the per-scale values, the commit and the command, plus the long-run apothecary figures and their command.
- [x] A run prints each metric's deviation from the baseline and pass or fail at +/-15%.
- [x] The apothecary report prints apothecaries ruined, lowest treasury reached and treasury at the end, and does not fail while `goldSpentOnProduction` does not exist.
- [x] `git diff` shows no change under `src/`. The six regression hashes are untouched and their tests still run.
- [x] The whole suite is green.

### Tests

New:

- `tune.ts` argument parsing: a range, a list, and a trailing comma rejected.

## Configuration and documents

- Configuration keys: none.
- `docs/ARCHITECTURE.md`: the "Tests and calibration" section (the new `tune.ts` usage, the baseline file and the new test in the test table).
- `CHANGELOG.md`: the measuring tool and the recorded baseline.
- `docs/CONFIGURATION.md`: no change.

## Comments

### Turn 01 decisions

- Use `scripts/tune-report.ts` for importable parsing and reporting, and
  `scripts/tune-baseline.json` for the checked-in structured measurements.
- Keep the existing defaults of seeds `1,2,3` and 600 ticks; use the five scales
  required by this issue. Reject invalid or descending ranges, non-whole or
  negative seeds, non-positive/non-finite scales and invalid tick counts. Seed
  0 is allowed explicitly; empty entries never become seed 0. Zero ticks are
  allowed for an initialization-only measurement.
- Compare the five metrics at the same tick count as the tuning baseline. A
  different tick count prints comparison unavailable; an unrecorded scale at
  600 ticks or a failed metric comparison exits with status 1. An absent baseline
  prints unavailable so the initial measurement can run before recording it.
  Zero baseline metrics pass only if the new value is also zero. The +/-15%
  edges are inclusive, allowing floating-point epsilon at the boundary.
- Observe the initial game view and every post-step view. Sum ruined shops and
  total shops across seeds; take the minimum treasury across all shops and
  ticks, including ruined shops; report mean final treasury total per seed.
  Report mean final `goldSpentOnProduction` when every seed exposes it, and
  `unavailable` otherwise. A lifetime counter is read, not added every tick.
- The checkout started at `51dcc00`, which adds only run-log documents to
  `4774e43`. Per the turn instruction, record baseline commit `4774e43`.
  `git diff ed52b20 4774e43 -- src scripts/tune.ts test` is empty: the game code,
  original measuring script and existing tests are identical to `ed52b20`.
- Test the parsing seam named by the issue, and the report's public interfaces
  with fixed input views and expected output. Long baseline runs are detached,
  with logs and exit status outside the repository. Their real output will be
  included in the turn report.

### Recorded measurements

Both detached required runs finished with exit status 0. All five scales
reproduce the issue table at its displayed precision. The original aggregation
and seed expansion were reviewed: exactly 80 seeds, no seed 0, the same
per-seed means and total-deaths/total-quests ratio as the original script.
The baseline retains raw values. Every numerical difference from the printed
table is listed below as `table -> measured`; identical values are omitted.

- Scale 1.0: quests 139.11 -> 139.1125; failed 19.51 -> 19.5125; deaths 60.79 -> 60.7875; deathsPerQuest 0.437 -> 0.43696648396082305; wiped 4.99 -> 4.9875; arrived 23.1 -> 23.1375.
- Scale 1.15: quests 113.86 -> 113.8625; failed 28.14 -> 28.1375; deaths 85.19 -> 85.1875; deathsPerQuest 0.748 -> 0.7481611592930069; wiped 7.21 -> 7.2125; arrived 30.1 -> 30.0625; raised 11.24 -> 11.2375.
- Scale 1.25: failed 32.99 -> 32.9875; deaths 97.38 -> 97.375; deathsPerQuest 0.929 -> 0.9291507633587787; wiped 8.01 -> 8.0125; raised 11.74 -> 11.7375.
- Scale 1.5: failed 41.06 -> 41.0625; deathsPerQuest 1.483 -> 1.4828416616496087; wiped 11.26 -> 11.2625; arrived 40.8 -> 40.7625; raised 11.76 -> 11.7625.
- Scale 1.75: quests 61.42 -> 61.425; failed 46.63 -> 46.625; deaths 138.99 -> 138.9875; deathsPerQuest 2.263 -> 2.262718762718763; wiped 12.71 -> 12.7125; arrived 45.1 -> 45.0875; raised 11.36 -> 11.3625.

The 3,000-tick run at scale 1.15 records 2 ruined apothecaries of 40
(the same count as ticket 09), lowest treasury -1957 gp, and mean final
treasury 3832.925 gp. `goldSpentOnProduction` is unavailable in this game
version. Negative treasuries are existing economy behavior, recorded without
changing the game; the later reward set-aside and retune issues handle the
long-run acceptance. Full raw output is in
`../run/turns/01-02-measuring-tool-and-baseline-report.md`.

### Verification and review

`pnpm typecheck` passed. `pnpm exec vitest run test/tune.test.ts` passed all
29 new tests; `pnpm test` passed all 608 tests in 30 files, including all six
unchanged regression hashes. Both independent code-review axes report no
findings. The saved-file CLI check with seeds `1,2,3`, 600 ticks and scale 1.15
prints all five deviations: four PASS and wiped FAIL at +15.540150202195266%,
correctly returning exit 1 for that smaller sample. The full captured output,
checks and acceptance-criterion coverage are in the turn report. No questions
or new bugs; no requested implementation remains. The commit containing this
comment contains the measuring tool, baseline, tests and documentation only.

### Turn 01, correction 1

The previous comparison ignored baseline seeds, so a smaller seed sample could
receive a failing verdict against the 80-seed baseline on unchanged game code.
Correction: require matching ticks and seeds before comparing any metric or
checking for an unrecorded scale. A seed mismatch prints that the seeds differ
from the baseline's and returns no verdict with a successful exit status.

Decision: match the seed sample regardless of list order, preserving how the
metrics average independent seeded runs. Every seed in the recorded inclusive
range must occur exactly once; missing, extra or duplicate seeds differ from
the baseline. The recorded baseline and all existing test expectations remain
unchanged. The comparison decision lives at the public report interface so
tests can verify printed lines and exit status without running a simulation.

Verification: the new mismatch test first observed the reported false verdict
and exit 1, then passed after seed gating. All 34 tune tests and all 613 tests
in 30 files pass; `pnpm typecheck` passes. Both the ten-seed scale-shape CLI and
the default CLI exit 0, print only seed-mismatch messages for comparisons, and
print no PASS/FAIL verdicts. Both code-review axes report no findings. Baseline
measurements, game code, all six regression hashes and every existing test
expectation are unchanged. Full correction report and actual CLI outputs:
`../run/turns/01-02-correction-1-report.md`.
