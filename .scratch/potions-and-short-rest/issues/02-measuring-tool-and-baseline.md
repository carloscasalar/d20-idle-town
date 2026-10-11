# Measuring tool and baseline

Status: ready-for-agent

Blocked-by: none - can start immediately

## Parent

[PRD: Hit Dice at the short rest, four healing potion tiers and an apothecary that makes them](../PRD.md), slice 1 of 8. Vocabulary: [CONTEXT.md](../../../CONTEXT.md).

## What to build

`scripts/tune.ts` becomes the one command that says whether the retuned game still sits where today's game does. This slice changes the script, records today's numbers in a baseline file and changes **no game code**: nothing under `src/` is touched, so every existing test, the six regression hashes included, stays green and untouched.

The script gains (PRD section "`scripts/tune.ts`"):

- Seeds as a range, `SEEDS=1..80`, as well as a comma list. An empty entry (for example a trailing comma) is an error instead of seed 0.
- Default scales `1, 1.15, 1.25, 1.5, 1.75`.
- Unrounded output for the five metrics: quests, failed, deaths per quest, wiped, raised (deaths and arrived are printed too, as the baseline table has them).
- A baseline file checked into the repository holding the per-scale values, the commit they were measured on and the command. The script compares a run against it, prints each metric's deviation and says pass or fail at +/-15%.
- An apothecary report, read from the game view on every tick: apothecaries ruined, the lowest treasury reached, the treasury at the end, and `goldSpentOnProduction` once it exists. That statistic does not exist until [issue 07](07-apothecary-production.md); the report must work without it now and show it when it appears.

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

   If it does not reproduce, stop and report the difference in the Comments of this issue. Do not record a baseline that disagrees with the PRD.

3. Record the baseline file from that run.

4. Record today's long-run apothecary figures with the script: 3,000 ticks, seeds 1 to 40, scale 1.15: apothecaries ruined, lowest treasury reached, treasury at the end. Ticket 09 measured 2 ruined of 40; record what the script measures, in the baseline file, with its command. Final check 3 ([issue 08](08-reward-set-aside.md), [issue 09](09-retune-confirmation.md)) compares against these figures.

## Acceptance criteria

- [ ] `SEEDS=1..80` and `SEEDS=1,2,3` both work; `SEEDS=1,2,` fails with a clear error.
- [ ] The default scales are 1, 1.15, 1.25, 1.5, 1.75.
- [ ] The five metrics are printed unrounded.
- [ ] The script reproduces the table above on unchanged game code.
- [ ] A baseline file is checked in with the per-scale values, the commit and the command, plus the long-run apothecary figures and their command.
- [ ] A run prints each metric's deviation from the baseline and pass or fail at +/-15%.
- [ ] The apothecary report prints apothecaries ruined, lowest treasury reached and treasury at the end, and does not fail while `goldSpentOnProduction` does not exist.
- [ ] `git diff` shows no change under `src/`. The six regression hashes are untouched and their tests still run.
- [ ] The whole suite is green.

### Tests

New:

- `tune.ts` argument parsing: a range, a list, and a trailing comma rejected.

## Configuration and documents

- Configuration keys: none.
- `docs/ARCHITECTURE.md`: the "Tests and calibration" section (the new `tune.ts` usage, the baseline file and the new test in the test table).
- `CHANGELOG.md`: the measuring tool and the recorded baseline.
- `docs/CONFIGURATION.md`: no change.

## Comments
