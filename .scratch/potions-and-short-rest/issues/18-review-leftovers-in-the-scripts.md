# Leftovers of the pull request review, in the scripts

Status: needs-triage
Category: enhancement

Found by the two-axis review of the potions pull request at `14d12bf` (2026-10-12). No game behaviour is involved, and none blocked the merge.

## Partial against the PRD

1. **The long-run apothecary check is never compared with the baseline** (PRD user story 52; left open by the closing note of [issue 02](02-measuring-tool-and-baseline.md)). `scripts/tune-baseline.json` holds `apothecaryLongRun`, but `TuneBaseline` in `scripts/tune-report.ts` does not read it, so `TICKS=3000 SEEDS=1..40 SCALES=1.15` always prints "comparison unavailable" and exits 0, even with a treasury below zero or more ruined shops than the 2 of 40 recorded. When ticks and seeds match `apothecaryLongRun`, print PASS or FAIL for "lowest treasury reached is not negative" and "ruined is not above the baseline", and set the exit code.

## Judgement calls

2. **`scripts/assault.ts` reads the boss fight from narration text** (`/Encounter (\d+)\/(\d+)/`). A change of wording would turn "reached boss" to zero with no error. `docs/ARCHITECTURE.md` says scripts read `view()` or a narrow calibration query; the Company's progress could be exposed there. This needs a small addition to the game, which [issue 14](14-assault-script-uses-rules-the-game-dropped.md) did not allow.
3. **The script builds its world with `Game.forTesting`**, which `docs/ARCHITECTURE.md` reserves for scenario tests. Issue 14 asked for exactly this, so either the document names the script as an allowed caller or the entry point gets a name that is not about tests.
4. **`scripts/tune-report.ts` guards a statistic that always exists** (`'goldSpentOnProduction' in view.stats && typeof ... === 'number'`). Typing `stats` and making the report field required removes the branch and its "unavailable" output.

## Comments
