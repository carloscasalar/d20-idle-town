# Turn 02 — issue 03: Hit Dice at the Short rest

Read `.claude/skills/implement-prd/RULES.md` before anything else. Those rules apply to this turn.

Use $mattpocock-skills:implement. Use it to implement the issue `.scratch/potions-and-short-rest/issues/03-hit-dice-at-the-short-rest.md`. The issue is the contract: build what it describes and meet every acceptance criterion. Its parent PRD is `.scratch/potions-and-short-rest/PRD.md`.

What the issue could not know:

- The branch tip when this turn starts is `4cead1d`. Issue 02 is done: `scripts/tune.ts`, `scripts/tune-report.ts`, `scripts/tune-baseline.json` and `test/tune.test.ts` exist and are not part of this issue. Leave them as they are; `test/tune.test.ts` still passes unchanged.
- The issue's "No questions" section replaces rule 4 for this turn: where a choice is left to you, decide, write the decision under the issue's `## Comments`, and carry on. Do not stop to ask.
- The regression guard is not re-recorded in this turn: the issue says to skip the six hash tests with a comment pointing at issue 09. The tests the issue lists under "Survive unchanged" are the guard: no diff in them, still passing.
- Scripts are run with `pnpm dlx vite-node <script>`; `pnpm exec vite-node` does not work in this repository.
- Put your report in `.scratch/potions-and-short-rest/run/turns/02-03-hit-dice-at-the-short-rest-report.md` as well as in your final message.

Done means: `pnpm typecheck` and `pnpm test` pass, and your report follows rule 9.
