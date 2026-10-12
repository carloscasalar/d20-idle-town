# Turn 08 — issue 09: Retune confirmation

The three tune checks passed on the first run, with the values issues 02 to 08 left. No knob moved. The six regression hashes were re-recorded once on game code `23c5c2b` (`src/` is unchanged since that commit, and this turn does not change it). Documentation now matches that code, including the reward set-aside wording in `CONTEXT.md`.

## What changed

- Re-enabled `test/simulation-regression.test.ts` and `test/job-intel-regression.test.ts` and replaced the six hashes. The job-intel title now says "baseline world", because "pre-change world" described the hashes this slice replaced.
- `CHANGELOG.md` records that deliberate break. No tuning default moved.
- `scripts/tune-baseline.json`: the `goldSpentOnProduction` aggregation note now says the game exposes the statistic and these measured results omit it because they predate it. Measured values are unchanged.
- `CONTEXT.md`: a posted reward is still at least 20 gp, so that minimum can exceed what is left after the rewards owed, and paying it can leave the treasury negative.
- `docs/ARCHITECTURE.md`: determinism (rest seed, potion sub-seed, policy draw, dice module, ban on the engine's dice), the core file table, the test table, and the Short rest / combat potion order.
- `docs/ARCHITECTURE-INTERFACES.md`: `dice.ts`, `hit-dice.ts`, `hitDiceSpent`, the shared pack, policy order at the Short rest, and the minimum reward that can exceed the set-aside remainder.
- `docs/CONFIGURATION.md` already matched the code (heroes prose, `startingGoldPerLevel` 50, `retreatHpFraction` after Hit Dice, production-time deviation, removed keys). It was not edited.
- Issue Comments hold the three commands and their output. `Status:` stays `ready-for-agent`.

## Checks

| Command or check | Result |
| --- | --- |
| `SEEDS=1..80 SCALES=1.15,1.5 TICKS=600 pnpm dlx vite-node scripts/tune.ts` | PASS, exit 0. Worst deviation: failed at scale 1.15, -11.02%. Every compared metric is inside +/-15%. |
| `SEEDS=1..10 SCALES=1,1.25,1.75 TICKS=600 pnpm dlx vite-node scripts/tune.ts` | PASS, exit 0. Deaths per quest: scale 1 is 0.42208774583963693, scale 1.25 is 0.9464459591041869, scale 1.75 is 2.2915980230642505. The figure rises with the scale. The script prints "comparison unavailable" because the seeds are not 1..80. |
| `TICKS=3000 SEEDS=1..40 SCALES=1.15 pnpm dlx vite-node scripts/tune.ts` | PASS, exit 0. Ruined 0 of 40 (baseline 2 of 40). Lowest treasury 198 gp, which is not below zero (baseline -1,957 gp). The script prints "comparison unavailable" at 3,000 ticks. |

Check 1 output:

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

Check 2 output:

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

Check 3 output:

```text
tuning: seeds 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40  ticks 3000  tolerance +/-15%
scale 1.15: quests 479.025  failed 111.325  deaths 378.825 (0.7908251135118208/quest)  wiped 32.075 of 111.6  raised 45.925
apothecary: ruined 0 of 40  lowest treasury reached 198  treasury at end (mean) 2439.85  goldSpentOnProduction 54749.375
baseline comparison: unavailable (TICKS=3000; baseline has 600 ticks)
```
| `pnpm typecheck` | PASS. |
| `pnpm test` | PASS: 37 files, 749 tests, none skipped. |
| `git diff --check` | PASS. |
| Standards / Spec code review | PASS / PASS after the core-table follow-up. Standards had no hard breach. Spec's missing `dice.ts` row and the `seed()` description were corrected; the reviewer then closed that finding. |

The scale-shape command in the issue omits `TICKS`. The script default is 600, and the command above sets it so the run is the 600-tick shape in the baseline table.

## Acceptance criteria and evidence

| Criterion | Covering test or check |
| --- | --- |
| Check 1 passes at scales 1.15 and 1.5, with command and output in the Comments | The check 1 command above, exit 0, output pasted in the issue Comments. |
| Check 2 passes, with the three deaths-per-quest values in the Comments | The check 2 command above. Values 0.42208774583963693, 0.9464459591041869, 2.2915980230642505. |
| Check 3 passes, with command and output in the Comments | The check 3 command above. 0 of 40 ruined, lowest treasury 198 gp. |
| If a check failed: the retune rule and the table of attempts | No check failed. No knob moved. The Comments say there is no table of attempts. |
| Or, after 8 failed attempts, restore values and leave hashes skipped | Does not apply. |
| The six regression hashes are re-recorded once, both tests re-enabled, no skip remains | `test/simulation-regression.test.ts` and its snapshot; `test/job-intel-regression.test.ts` `STRIPPED_WORLD`. `pnpm test` reports 749 passed and no skip. |
| `CHANGELOG.md` notes the re-recorded hashes | The 2026-10-12 entry. |
| `docs/ARCHITECTURE.md`, `docs/CONFIGURATION.md` and `CONTEXT.md` match the code | Architecture and `CONTEXT.md` updated. Configuration was read against the code and already matched, including `docs/ARCHITECTURE-INTERFACES.md`. |
| The suite is green with no skipped regression test | `pnpm typecheck` and `pnpm test`. |

Regression guard: changed, because the issue requires the six hashes to be re-recorded once after the checks pass. They were recorded on game code `23c5c2b`. No other seeded expectation was edited.

## Review

### Standards

No hard breaches. The diff re-records the six hashes, drops the skip comments, and aligns the glossary and architecture docs with the code. That matches `docs/agents/implementation.md`. Judgement calls: some new prose says "heroes" where the glossary says adventurer, following the existing architecture file; adding older suites to the test index is one reconciliation pass. The word "investigation" was removed from the new coin-movements row.

### Spec

The first pass found the core file table still describing `seed()` as combat-only and omitting `dice.ts`. That is now closed. No scope creep: no `src/` change and no tuning default moved.

Questions: none. Choices are under the issue Comments. New bugs found: none.

Not done: the issue `Status:` is still `ready-for-agent`; the orchestrator sets `done`. Issue 08's reviewer notes (an untested threshold read in `raids()`, `Board.rewardTreasury` visibility, and `SERVICE_KINDS` not covering a service added only to the union) stay as recorded there. This issue does not change that code. The orchestrator pushes.

## Correction 1

Documents only. Read against `src/sim/config.ts` before writing. The code matches this correction: `GameConfig` has `kinds`, then `potions` and `policies` after `heroes`; `NAME_LISTS` checks `board.rewardSetAsideFor` against employer kinds and town services together; `checkPotionFormulas` rejects a formula `parseDice` cannot parse and a repeated tier name (`potions.tiers: duplicate tier "..."`). Nothing in the correction list disagreed with the code.

### What changed

- `docs/ARCHITECTURE.md`: the section list is `kinds`, `board`, `roster`, `intel`, `expedition`, `services`, `lairs`, `quests`, `encounters`, `heroes`, `potions`, `policies`, `town`, `holdings`, `items`, `combat`, `world`. The validator sentence also names a town service in `board.rewardSetAsideFor`, a potion formula that does not parse, and a duplicate potion tier name.
- `docs/ARCHITECTURE-INTERFACES.md`: the same three rejections.
- `docs/CONFIGURATION.md`: the name-check list includes `board.rewardSetAsideFor` against employer kinds and town services. Beside the catalogue table, a duplicate tier name is rejected, for example `potions.tiers: duplicate tier "basic"`.
- `CHANGELOG.md`: the six regression hashes were re-recorded once, on purpose, because the healing rules change every seeded trajectory.

No code, test, hash, or tuning value changed.

### Checks

| Command | Result |
| --- | --- |
| `pnpm typecheck` | PASS. |
| `pnpm test` | PASS: 37 files, 749 tests, none skipped. |

Regression guard: unchanged. No hash, snapshot, or seeded expectation was edited.

| Point | Where it is written |
| --- | --- |
| Section list includes `kinds`, `potions` and `policies` | `docs/ARCHITECTURE.md`, the `GameConfig` section list, in the order of `GameConfig` |
| Validator also rejects an unknown `board.rewardSetAsideFor` name, a formula that does not parse, and a duplicate tier name | `docs/ARCHITECTURE.md` and `docs/ARCHITECTURE-INTERFACES.md`, the `validateGameConfig` sentences |
| Name checks include `board.rewardSetAsideFor`; duplicate tier name is documented | `docs/CONFIGURATION.md`, the name-check list and the sentence beside the catalogue table |
| Changelog says the hashes were re-recorded once, on purpose | `CHANGELOG.md`, the 2026-10-12 hash entry |

Questions: none. Bugs: none. Not done: none of the four points.
