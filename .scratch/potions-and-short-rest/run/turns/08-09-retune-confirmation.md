# Turn 08 — issue 09: retune confirmation

Read `.claude/skills/implement-prd/RULES.md` before anything else. Those rules apply to this turn.

Use $mattpocock-skills:implement. Use it to implement the issue `.scratch/potions-and-short-rest/issues/09-retune-confirmation.md`. The issue is the contract: do what it describes, in its order, and meet every acceptance criterion. Its parent PRD is `.scratch/potions-and-short-rest/PRD.md`.

What the issue could not know:

- Issues 02 to 08 are done on this branch; issue 08 did not change the posting threshold. `scripts/tune.ts` gives a pass or fail verdict against `scripts/tune-baseline.json` only for seeds 1..80 at 600 ticks (check 1: it exits 1 when a metric is outside +/-15%). Check 2 (`SEEDS=1..10`) and check 3 (3,000 ticks) print "comparison unavailable"; read their lines yourself. For check 3 the figures to compare with are under `apothecaryLongRun` in the baseline file (2 of 40 ruined, lowest treasury -1,957 gp); issue 08 measured 0 of 40 and a lowest treasury of 198 gp on the same rules.
- Commands: `pnpm dlx vite-node scripts/tune.ts` with the variables the issue gives (`pnpm exec vite-node` does not work in this repository). The runs are long: start each so your own command time limit cannot kill it (in the background, output to a file outside the repository, then wait for it) and paste the real output in the issue's Comments and in your report. The baseline file's measured values are never re-recorded; its note saying the game does not expose `goldSpentOnProduction` yet is now false and may be corrected as text only.
- The owner's rule for a failed check is in the issue ("If a check fails"): the order of the knobs, one at a time, at most 8 attempts, the table of attempts, and what to do if none passes. Follow it exactly. It is the one place in this run where tuning values may move.
- Only after the three checks pass with one set of values: re-record the six hashes once and remove the skips. If a later step of this turn changes game code or a default again, the hashes are stale: re-record them last, and say in your report which commit of the game code they were recorded on.
- Documentation pass, with points the reviews of earlier issues left for this one: `CONTEXT.md` says paying a reward "never leaves the treasury negative", but a 20 gp minimum reward can exceed what is left after the rewards owed (issue 08 allows it and `docs/CONFIGURATION.md` says so): reword it to what the code does. `docs/ARCHITECTURE-INTERFACES.md` is read against the code as well as the three documents the issue lists. `docs/agents/implementation.md` and the skills are not yours to edit (rule 7).
- The issue's "No questions" section replaces rule 4 for this turn: decide, write the decision under the issue's `## Comments`, and carry on. Do not set the issue's `Status:` to `done`; the orchestrator does that. Set it to `ready-for-human` only in the case the issue names.
- Put your report in `.scratch/potions-and-short-rest/run/turns/08-09-retune-confirmation-report.md` as well as in your final message.

Done means: `pnpm typecheck` and `pnpm test` pass, with no skipped regression test unless the issue's 8-attempt rule applied, and your report follows rule 9.
