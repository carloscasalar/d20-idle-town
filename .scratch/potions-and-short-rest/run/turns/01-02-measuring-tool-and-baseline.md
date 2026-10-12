# Turn 01 — issue 02: measuring tool and baseline

Read `.claude/skills/implement-prd/RULES.md` before anything else. Those rules apply to this turn.

Use $mattpocock-skills:implement. Use it to implement the issue `.scratch/potions-and-short-rest/issues/02-measuring-tool-and-baseline.md`. The issue is the contract: build what it describes and meet every acceptance criterion. Its parent PRD is `.scratch/potions-and-short-rest/PRD.md`.

What the issue could not know:

- The branch tip when this turn starts is commit `4774e43`. Its game code, `scripts/tune.ts` and tests are identical to `ed52b20` (the only differences are under `scripts/agents/`). Record `4774e43` as the commit of the baseline, with the note the issue asks for.
- The issue's "No questions" section replaces rule 4 for this turn: where a choice is left to you, decide, write the decision under the issue's `## Comments`, and carry on. Do not stop to ask.
- The two baseline runs are long (80 seeds x 5 scales x 600 ticks; 40 seeds x 3,000 ticks). Run them so that your own command time limit cannot kill them (in the background, output to a file outside the repository, then wait for it), and put the real output of both in your report.
- The commands recorded in the baseline file use relative paths only, with no machine or home folder path.

Done means: `pnpm typecheck` and `pnpm test` pass, and your report follows rule 9.
