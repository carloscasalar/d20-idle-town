# Turn 13 — issue 14: the assault script uses rules the game dropped

Read `.claude/skills/implement-prd/RULES.md` before anything else. Those rules apply to this turn.

Use the project skill "implement" (`.cursor/skills/implement/SKILL.md`). Use it to implement the issue `.scratch/potions-and-short-rest/issues/14-assault-script-uses-rules-the-game-dropped.md`. The issue is the contract (its Agent Brief, in the Comments, holds the desired behaviour and the acceptance criteria): build what it describes and meet every acceptance criterion. Its parent PRD is `.scratch/potions-and-short-rest/PRD.md`.

What the issue could not know:

- Issue 13 is done on this branch (`71c5790`). The Company's drinking is `planDrinkingRound` in `src/adventurers/policies.ts`, and a drink is `drinkPotion` in `src/adventurers/potions.ts`; `scripts/assault.ts` calls `drinkPotion` only so that it typechecks. After this turn the script calls neither.
- The outputs of both scripts before this turn, taken at `ff29ca7` with the default `SEED` and `SCALE`, are in `.scratch/potions-and-short-rest/run/measurements/`: `assault-before-trials-40.txt` (`TRIALS=40`) and `calibrate-before.txt` (no environment). Use them as the "before" of the report; `scripts/calibrate.ts` must print exactly the second file.
- No file under `src/` or `test/` changes. If the game does not expose what the script needs (telling the three outcomes apart, knowing the boss was reached, keeping other Companies and arrivals out of a trial), stop and report what is missing, with the options you see. Do not read private state, and do not add to the game.
- The issue asks for no tests of the script, so the test-first part of the skill does not apply here; the acceptance criteria are shown by running the script. Give the commands and their output in the report, including the two runs with the same `SEED` and `TRIALS`.
- Run scripts with `pnpm dlx vite-node`, not `pnpm exec vite-node`.
- Documents: `README.md` and the scripts table of `docs/ARCHITECTURE.md`, as the issue's criterion says.
- Put your report in `.scratch/potions-and-short-rest/run/turns/13-14-assault-script-plays-the-game-report.md` as well as in your final message.

Done means: `pnpm typecheck` and `pnpm test` pass, and your report follows rule 9.
