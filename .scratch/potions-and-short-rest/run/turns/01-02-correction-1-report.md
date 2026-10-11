# Turn 01, correction 1 report

Fixed the reported false baseline verdict in `scripts/tune.ts`: comparison now
requires both the recorded tick count and seed sample. A seed mismatch says the
seeds differ from the baseline's, prints no metric or overall PASS/FAIL verdict,
and does not cause a failing exit status. `scripts/tune-report.ts` exposes this
comparison decision through `compareScaleToBaseline`, which the CLI uses.
Updated the comparison paragraph of `docs/ARCHITECTURE.md` and recorded the
order-independent seed matching decision under the issue Comments.

## Checks

- `pnpm exec vitest run test/tune.test.ts`: 34 tests passed, exit 0. The new
  mismatch test first failed for the reported behavior: it observed metric
  verdicts and exit code 1 instead of the expected unavailable message and 0.
- `pnpm typecheck`: passed, exit 0.
- `pnpm test`: 613 tests passed in 30 files, exit 0; all six regression checks ran.
- `git diff --check`: passed, exit 0.
- `git diff 2d1ecd2 -- src scripts/tune-baseline.json test/simulation-regression.test.ts test/job-intel-regression.test.ts test/__snapshots__/simulation-regression.test.ts.snap`:
  empty. No game code, baseline data or regression guard changed. The guard
  needs no re-recording because only measuring-tool verdict selection changed.
- `SEEDS=1..10 SCALES=1,1.25,1.75 TICKS=600 pnpm dlx vite-node scripts/tune.ts`:
  passed, exit 0. All three scales report seed mismatch, no PASS/FAIL verdict;
  deaths per quest rises across the scales.
- `pnpm dlx vite-node scripts/tune.ts` with default arguments: passed, exit 0.
  All five scales report seed mismatch, no PASS/FAIL verdict.
- Inspection of both complete captured CLI outputs: exit statuses are 0,
  exactly three/five seed-mismatch messages, and no PASS/FAIL verdicts.

Both simulation checks ran detached, with stdout/stderr and completion markers
outside the repository. Their complete captured output follows.

## Acceptance criteria and coverage

| Correction requirement | Test or verification |
| --- | --- |
| Compare run seeds with baseline seeds before giving a verdict | `test/tune.test.ts`: reports different seeds without any metric verdict or failing status; leaves default seed sample without a baseline verdict |
| Mismatch explicitly says seeds differ; prints no PASS/FAIL; succeeds | Exact output-line and exit-code assertions in the two tests above; both actual CLI checks below |
| Reject missing, extra or duplicate seed samples even at the same size | `test/tune.test.ts`: rejects a different sample of the same size, for `1,2,4` and `1,2,2` versus `1..3` |
| Matching seed sample retains baseline comparisons | `test/tune.test.ts`: compares matching seeds and still fails a metric outside the band, including a reversed seed list; existing comparison tests retain their expectations |
| Add a regression test and update comparison documentation | Five added tests in `baseline run selection`; revised `docs/ARCHITECTURE.md` comparison paragraph |
| No existing test expected value changes | Test diff adds an import and the new describe block; all previous tests and expected values remain untouched |
| Required checks pass | `pnpm typecheck` and `pnpm test` both exit 0 |

Original issue 02 behavior, measured baseline and existing acceptance evidence
remain unchanged outside this requested correction.

## Actual CLI output

```bash
SEEDS=1..10 SCALES=1,1.25,1.75 TICKS=600 pnpm dlx vite-node scripts/tune.ts
```

```text
tuning: seeds 1,2,3,4,5,6,7,8,9,10  ticks 600  tolerance +/-15%
scale 1: quests 140.7  failed 17.9  deaths 59 (0.4193319118692253/quest)  wiped 5.2 of 22.7  raised 10
apothecary: ruined 0 of 10  lowest treasury reached -145  treasury at end (mean) 7441.9  goldSpentOnProduction unavailable
baseline comparison: unavailable (seeds differ from baseline's 1..80)
scale 1.25: quests 105.6  failed 33.7  deaths 100.7 (0.9535984848484849/quest)  wiped 8.5 of 34.6  raised 14.2
apothecary: ruined 0 of 10  lowest treasury reached 455  treasury at end (mean) 5958.3  goldSpentOnProduction unavailable
baseline comparison: unavailable (seeds differ from baseline's 1..80)
scale 1.75: quests 64.7  failed 45.8  deaths 137.7 (2.1282843894899535/quest)  wiped 13.2 of 44.9  raised 12.5
apothecary: ruined 0 of 10  lowest treasury reached 824  treasury at end (mean) 5564.6  goldSpentOnProduction unavailable
baseline comparison: unavailable (seeds differ from baseline's 1..80)
```

```bash
pnpm dlx vite-node scripts/tune.ts
```

```text
tuning: seeds 1,2,3  ticks 600  tolerance +/-15%
scale 1: quests 139.33333333333334  failed 17.666666666666668  deaths 61 (0.43779904306220097/quest)  wiped 5 of 22.666666666666668  raised 11.333333333333334
apothecary: ruined 0 of 3  lowest treasury reached -145  treasury at end (mean) 6621  goldSpentOnProduction unavailable
baseline comparison: unavailable (seeds differ from baseline's 1..80)
scale 1.15: quests 104.33333333333333  failed 28.333333333333332  deaths 86.66666666666667 (0.8306709265175719/quest)  wiped 8.333333333333334 of 31.666666666666668  raised 10.333333333333334
apothecary: ruined 0 of 3  lowest treasury reached 1326  treasury at end (mean) 5293.333333333333  goldSpentOnProduction unavailable
baseline comparison: unavailable (seeds differ from baseline's 1..80)
scale 1.25: quests 105  failed 37.333333333333336  deaths 110.33333333333333 (1.0507936507936508/quest)  wiped 9 of 36.333333333333336  raised 15.333333333333334
apothecary: ruined 0 of 3  lowest treasury reached 1193  treasury at end (mean) 6844  goldSpentOnProduction unavailable
baseline comparison: unavailable (seeds differ from baseline's 1..80)
scale 1.5: quests 79.33333333333333  failed 39  deaths 118 (1.4873949579831933/quest)  wiped 10.333333333333334 of 39.333333333333336  raised 9.333333333333334
apothecary: ruined 0 of 3  lowest treasury reached 981  treasury at end (mean) 6035.333333333333  goldSpentOnProduction unavailable
baseline comparison: unavailable (seeds differ from baseline's 1..80)
scale 1.75: quests 75.66666666666667  failed 47.333333333333336  deaths 145.66666666666666 (1.9251101321585904/quest)  wiped 14.333333333333334 of 45.666666666666664  raised 12.333333333333334
apothecary: ruined 0 of 3  lowest treasury reached 1326  treasury at end (mean) 4331.666666666667  goldSpentOnProduction unavailable
baseline comparison: unavailable (seeds differ from baseline's 1..80)
```

## Review, questions, bugs and remaining work

Standards review: no findings. Spec review: no findings. Both independent
reviewers confirmed the requested seed gating, public-interface tests, unchanged
existing expectations and baseline/guard, and matching documentation.

No questions were asked. The reported bug is fixed: comparing a different seed
sample with the 80-seed baseline could previously produce a false failure on
unchanged game code, triggered by either CLI command above. No other bug was
discovered or fixed. Nothing requested remains unimplemented.

Only this correction's six code, test and document files belong in its commit.
The preexisting untracked correction prompt in
`.scratch/potions-and-short-rest/run/turns/01-02-correction-1.md` is left untouched.
