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
| `SEEDS=1..80 SCALES=1.15,1.5 TICKS=600 pnpm dlx vite-node scripts/tune.ts` | PASS, exit 0. Worst deviation: failed at scale 1.15, -11.02%. Every compared metric is inside +/-15%. Real output is in the issue Comments. |
| `SEEDS=1..10 SCALES=1,1.25,1.75 TICKS=600 pnpm dlx vite-node scripts/tune.ts` | PASS, exit 0. Deaths per quest: scale 1 is 0.42208774583963693, scale 1.25 is 0.9464459591041869, scale 1.75 is 2.2915980230642505. The figure rises with the scale. The script prints "comparison unavailable" because the seeds are not 1..80. |
| `TICKS=3000 SEEDS=1..40 SCALES=1.15 pnpm dlx vite-node scripts/tune.ts` | PASS, exit 0. Ruined 0 of 40 (baseline 2 of 40). Lowest treasury 198 gp, which is not below zero (baseline -1,957 gp). The script prints "comparison unavailable" at 3,000 ticks. |
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
