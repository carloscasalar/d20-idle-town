# Turn 07 — issue 08: Reward set-aside

Read `.claude/skills/implement-prd/RULES.md` before anything else. Those rules apply to this turn.

Use $mattpocock-skills:implement. Use it to implement the issue `.scratch/potions-and-short-rest/issues/08-reward-set-aside.md`. The issue is the contract: build what it describes and meet every acceptance criterion. Its parent PRD is `.scratch/potions-and-short-rest/PRD.md`.

What the issue could not know:

- Issues 02 to 07 are all done on this branch, issue 06 (the sharing policy) included, so final check 3 runs with every earlier slice merged; say so with the result. Issue 07 (commit `b0e724e`) added the `production` sink and the `goldSpentOnProduction` statistic, which the apothecary report of `scripts/tune.ts` now prints.
- Final check 3 is `TICKS=3000 SEEDS=1..40 SCALES=1.15 pnpm dlx vite-node scripts/tune.ts` (`pnpm exec vite-node` does not work in this repository). The figures to compare with are under `apothecaryLongRun` in `scripts/tune-baseline.json`: 2 of 40 ruined, lowest treasury -1,957 gp. The script does not compare the long run by itself (it prints "comparison unavailable" at 3,000 ticks): compare by reading the apothecary line, or extend the script's report to compare with `apothecaryLongRun` if that is small; either way the baseline values are not re-recorded. The run is long: start it so your own command time limit cannot kill it (in the background, output to a file outside the repository, then wait for it), and paste the real output in the issue's Comments and in your report.
- The issue's "If the check fails" and "Point to confirm" sections are the owner's decisions in advance; follow them exactly. No tuning value moves in this issue.
- Reviews of earlier turns failed on wiring that only a helper's unit test exercised, on mutations that survived, and on documents left stale. For this issue: test through the Board and the employer's own interfaces with exact rewards and treasuries; make sure a test fails if the set-aside counts `paid`, `failed` or `expired` Contracts, if it ignores `taken` ones, if it applies to an employer outside the list, if an employer kind in the list reaches only one employer of that kind, if the amount is not released at each of the three endings, or if the list has a production default that hides a missing configuration. Keep `docs/ARCHITECTURE-INTERFACES.md` true whenever a signature or a module's surface changes, besides the documents the issue lists.
- The issue's "No questions" section replaces rule 4 for this turn: decide, write the decision under the issue's `## Comments`, and carry on.
- The six regression hash tests are skipped and stay skipped. `smoke`, `combat-space` seed 75, `lairs` seed 14, `deployment` and the seeded loops of the company roster tests keep passing with no change of seed or expectation. This issue adds no random draw.
- Put your report in `.scratch/potions-and-short-rest/run/turns/07-08-reward-set-aside-report.md` as well as in your final message.

Done means: `pnpm typecheck` and `pnpm test` pass, and your report follows rule 9.
