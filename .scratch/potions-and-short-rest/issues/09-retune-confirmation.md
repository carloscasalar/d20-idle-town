# Retune confirmation

Status: done

Blocked-by: [05 - Buying policy](05-buying-policy.md), [06 - Potion sharing policy](06-potion-sharing-policy.md), [07 - Apothecary production](07-apothecary-production.md), [08 - Reward set-aside](08-reward-set-aside.md)

## Parent

[PRD: Hit Dice at the short rest, four healing potion tiers and an apothecary that makes them](../PRD.md), slice 8 of 8. Vocabulary: [CONTEXT.md](../../../CONTEXT.md).

## No questions

The owner is not available while this issue is built. Do not ask and do not wait for an answer. Where this issue or the PRD leaves a choice to the implementer (key names, file locations, log wording), decide and write the decision under Comments. Where this issue gives a rule for a doubt or a failure, follow it.

## What to build

No new rule. This slice proves that the game with every slice merged sits where today's game does, then re-records the regression hashes once and closes the documentation.

Run the checks first. Re-record the hashes only after the three checks pass, with the PRD's values or with retuned ones: a changed value moves the trajectories again.

## The three final checks, with the real `scripts/tune.ts`

Compare against the baseline file recorded by [issue 02](02-measuring-tool-and-baseline.md) (commit `ed52b20` on `feature/potions-healing`, seeds 1 to 80, 600 ticks). For reference, its values:

| Scale | quests | failed | deaths | deaths per quest | wiped | arrived | raised |
|---|---|---|---|---|---|---|---|
| 1 | 139.11 | 19.51 | 60.79 | 0.437 | 4.99 | 23.1 | 9.95 |
| 1.15 | 113.86 | 28.14 | 85.19 | 0.748 | 7.21 | 30.1 | 11.24 |
| 1.25 | 104.80 | 32.99 | 97.38 | 0.929 | 8.01 | 33.8 | 11.74 |
| 1.5 | 83.05 | 41.06 | 123.15 | 1.483 | 11.26 | 40.8 | 11.76 |
| 1.75 | 61.42 | 46.63 | 138.99 | 2.263 | 12.71 | 45.1 | 11.36 |

1. **Acceptance.** At scales 1.15 and 1.5, seeds 1 to 80, 600 ticks (`SEEDS=1..80 SCALES=1.15,1.5 TICKS=600`): each of the five metrics (quests, failed, deaths per quest, wiped, raised) within +/-15% of the baseline. Easier than the baseline is not a failure inside the band. About 2% of runs on unchanged code fail this by chance.
2. **Scale shape.** At scales 1, 1.25 and 1.75, with 10 seeds (`SEEDS=1..10 SCALES=1,1.25,1.75`): deaths per quest rises as the scale rises.
3. **Apothecary over a long run.** 3,000 ticks, seeds 1 to 40, scale 1.15 (`TICKS=3000 SEEDS=1..40 SCALES=1.15`): no apothecary treasury below zero at any tick, and no more apothecaries ruined than the figure issue 02 recorded (ticket 09 measured 2 of 40). The prototype had 0 ruined and a lowest treasury of +152 gp. This is a measurement over 40 seeds, not a guarantee, because upkeep can still take a treasury below zero. Issue 08 already ran this check; this is the run on the final rules.

Write each command and its output in the Comments of this issue.

The supreme tier is expected to stay unbought at 600 ticks, and in the 3,000-tick runs too. This is intended; do not add a rule to make it reachable.

### If a check fails

The PRD leaves a changed value to the owner. The owner has decided in advance that this issue retunes on its own, within these limits:

- Knobs, one at a time and in this order: `heroes.startingGoldPerLevel`, `potionCoverFraction`, the sharing weights, `expedition.retreatHpFraction`, the apothecary's opening treasury, the encounters per job. Move to the next knob only when the current one cannot bring the failing metrics inside the band.
- `board.difficultyScale` is not moved: the checks measure at fixed scales, so its default does not change them.
- The Hit Dice rules, the potion formulas, the potion prices and the Long rest do not move. If issue 08 changed the posting threshold, that stays as issue 08 left it.
- Which value to try is your choice, guided by which metric is outside the band and in which direction. The sweep tables in [../assets/09-sweep-results.md](../assets/09-sweep-results.md) are evidence for the direction of each knob, not a reference.
- An attempt is one set of values. It passes only if the three checks pass with that same set. At most 8 attempts after the first failed run.
- Write a table in the Comments with every attempt: the values, the three results and the worst deviation.

If an attempt passes: keep its values as the new defaults, update the tests that assert the old defaults, `docs/CONFIGURATION.md` and `CHANGELOG.md` (each changed value and the reason, from the measurements), and go on to re-record the hashes.

If no attempt passes after 8: restore the values the earlier issues left (the PRD's), leave the six regression hash tests skipped, do not re-record them, write the table of attempts in the Comments, set this issue's `Status:` to `ready-for-human` and finish. Still do the documentation pass below for everything except the hashes.

## Point to confirm while implementing

- The scale shape of the final rules was measured in the prototype only with the offer gate of ticket 08 still in place, and that gate was not built. Check 2 is the first real measurement of it: report its three values, not only pass or fail.

## Regression hashes: re-record once

Issue 03 skipped six tests; no slice since has recorded them. After the checks pass:

- `test/simulation-regression.test.ts`: update the three snapshot hashes in `test/__snapshots__/simulation-regression.test.ts.snap` and remove the skip.
- `test/job-intel-regression.test.ts`: replace the three `STRIPPED_WORLD` hashes and remove the skip. Its purpose ("nothing but investigations moved") holds only against this new baseline.
- Remove the comments that pointed at this issue.
- Note the re-recording in `CHANGELOG.md`, so the history shows one deliberate break.

## Acceptance criteria

- [ ] Check 1 passes at scales 1.15 and 1.5, with command and output in the Comments.
- [ ] Check 2 passes, with the three deaths-per-quest values in the Comments.
- [ ] Check 3 passes, with command and output in the Comments.
- [ ] If a check failed with the PRD's values: the retune rule of "If a check fails" was followed and the table of attempts is in the Comments.
- [ ] Or, after 8 failed attempts: the PRD's values are restored, the hashes stay skipped, and this issue's `Status:` is `ready-for-human`. The criteria below about the hashes then do not apply.
- [ ] The six regression hashes are re-recorded once, both tests are re-enabled and no skip remains.
- [ ] `CHANGELOG.md` notes the re-recorded hashes.
- [ ] `docs/ARCHITECTURE.md`, `docs/CONFIGURATION.md` and `CONTEXT.md` match the code.
- [ ] The suite is green with no skipped regression test.

### Tests

- Re-recorded and re-enabled: the three hashes of the simulation regression test and the three `STRIPPED_WORLD` hashes of the job-intel regression test.
- New: none.

## Configuration and documents

- Configuration keys: none added or removed. Defaults change only through the retune rule of "If a check fails".
- `CHANGELOG.md`: the re-recorded regression hashes; check that the feature as a whole reads correctly from the entries the earlier slices added.
- `docs/ARCHITECTURE.md`: a last pass over the test table and the "Determinism and seeding" section (the rest seed, the combat potion sub-seed, the policy draw, the dice module, the ban on the engine's dice). Each earlier slice added its own lines; fix what is missing or contradictory.
- `docs/CONFIGURATION.md`: a last read against the code: the new keys and tables, the removed keys, the `heroes` prose, `startingGoldPerLevel` 50 (without the "cannot afford the potion" reason), `retreatHpFraction` after the Hit Dice, the production-time deviation.
- `CONTEXT.md` already holds the vocabulary (Hit Dice, Long rest, Short rest, Healing potion, Assured healing, Potion sharing policy, Reward set-aside). Check it still matches; change it only if the code ended up different.

## Comments

The three checks passed on the first run, with the values issues 02 to 08 left. No knob moved, so there is no table of attempts. The scale-shape command in this issue omits `TICKS`; the script default is 600, and the command below sets it so the run is the 600-tick shape in the baseline table. The supreme tier was not given a rule to make it reachable. `scripts/tune-baseline.json` keeps every measured value; only the aggregation note for `goldSpentOnProduction` was corrected, because the game now exposes that statistic and these results were recorded before it did. The six hashes were recorded after these checks, on game code `23c5c2b` (`src/` is unchanged since that commit). The job-intel regression title now says "baseline world": "pre-change world" described the hashes this slice replaced.

Check 2 deaths per quest, seeds 1 to 10, 600 ticks: scale 1 is 0.42208774583963693, scale 1.25 is 0.9464459591041869, scale 1.75 is 2.2915980230642505. The figure rises as the scale rises.

### Check 1

`SEEDS=1..80 SCALES=1.15,1.5 TICKS=600 pnpm dlx vite-node scripts/tune.ts`

Exit 0.

```text
tuning: seeds 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80  ticks 600  tolerance +/-15%
scale 1.15: quests 109.55  failed 25.0375  deaths 82.6875 (0.7547923322683706/quest)  wiped 7.4625 of 29.4375  raised 10.325
apothecary: ruined 0 of 80  lowest treasury reached 237  treasury at end (mean) 3057.675  goldSpentOnProduction 8772.5
baseline quests: deviation -3.7874629487320233% PASS
baseline failed: deviation -11.01732563305197% PASS
baseline deathsPerQuest: deviation 0.8863294883725374% PASS
baseline wiped: deviation 3.466204506065858% PASS
baseline raised: deviation -8.120133481646285% PASS
baseline comparison: PASS
scale 1.5: quests 79.9625  failed 37.45  deaths 119.2875 (1.4917930279818665/quest)  wiped 10.6375 of 38.9125  raised 11.95
apothecary: ruined 0 of 80  lowest treasury reached 238  treasury at end (mean) 3480.9625  goldSpentOnProduction 7213.125
baseline quests: deviation -3.7176399759181114% PASS
baseline failed: deviation -8.79756468797564% PASS
baseline deathsPerQuest: deviation 0.6036629913877464% PASS
baseline wiped: deviation -5.549389567147614% PASS
baseline raised: deviation 1.5940488841657812% PASS
baseline comparison: PASS
```

### Check 2

`SEEDS=1..10 SCALES=1,1.25,1.75 TICKS=600 pnpm dlx vite-node scripts/tune.ts`

Exit 0. The script prints "comparison unavailable" because the seed sample is not 1..80. Deaths per quest: 0.42208774583963693, then 0.9464459591041869, then 2.2915980230642505.

```text
tuning: seeds 1,2,3,4,5,6,7,8,9,10  ticks 600  tolerance +/-15%
scale 1: quests 132.2  failed 15.4  deaths 55.8 (0.42208774583963693/quest)  wiped 5.2 of 21.4  raised 10.3
apothecary: ruined 0 of 10  lowest treasury reached 353  treasury at end (mean) 2807.4  goldSpentOnProduction 8827.5
baseline comparison: unavailable (seeds differ from baseline's 1..80)
scale 1.25: quests 102.7  failed 29.6  deaths 97.2 (0.9464459591041869/quest)  wiped 8.8 of 32.6  raised 10.9
apothecary: ruined 0 of 10  lowest treasury reached 316  treasury at end (mean) 3276.4  goldSpentOnProduction 8292.5
baseline comparison: unavailable (seeds differ from baseline's 1..80)
scale 1.75: quests 60.7  failed 44.3  deaths 139.1 (2.2915980230642505/quest)  wiped 13 of 45  raised 12.4
apothecary: ruined 0 of 10  lowest treasury reached 549  treasury at end (mean) 2724.9  goldSpentOnProduction 5652.5
baseline comparison: unavailable (seeds differ from baseline's 1..80)
```

### Check 3

`TICKS=3000 SEEDS=1..40 SCALES=1.15 pnpm dlx vite-node scripts/tune.ts`

Exit 0. The script prints "comparison unavailable" at 3,000 ticks. Read against `apothecaryLongRun` in `scripts/tune-baseline.json` (2 of 40 ruined, lowest treasury -1,957 gp): ruined 0 of 40, and the lowest treasury reached is 198 gp, which is not below zero.

```text
tuning: seeds 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40  ticks 3000  tolerance +/-15%
scale 1.15: quests 479.025  failed 111.325  deaths 378.825 (0.7908251135118208/quest)  wiped 32.075 of 111.6  raised 45.925
apothecary: ruined 0 of 40  lowest treasury reached 198  treasury at end (mean) 2439.85  goldSpentOnProduction 54749.375
baseline comparison: unavailable (TICKS=3000; baseline has 600 ticks)
```

### Closed by the orchestrator (2026-10-12)

Commits `e63b1e8` (hashes re-recorded and re-enabled, documents), `21291d8` (the check transcripts in the report) and `827e863` (correction 1, documents only), all by Cursor; Codex reached its usage limit before changing anything. The three checks passed with the values the earlier issues left, so nothing was retuned. Evidence: a second, independent run of the three checks on the same game code (`23c5c2b`) gave identical figures; the slice reviewer recomputed the ten deviations of check 1 from the baseline file (worst -11.0%, failed at scale 1.15), re-ran check 2 (0.422, 0.946, 2.292 deaths per quest) and confirmed the hashes fail when a potion formula changes and pass twice in a row. Review: failed the first round on documentation only (configuration sections and validator rejections missing from three documents, one unclear changelog sentence); the orchestrator read the correction against `src/sim/config.ts`. 749 tests green, none skipped; long sweep `no crashes in seeds 1-150 for 1500 hours`.

Reviewer notes, not corrected, older than this PRD: the `town.ts` row of `docs/ARCHITECTURE-INTERFACES.md` names constants that no longer exist; `docs/agents/implementation.md` gives `pnpm exec vite-node`, which does not work (`pnpm dlx vite-node` does).
