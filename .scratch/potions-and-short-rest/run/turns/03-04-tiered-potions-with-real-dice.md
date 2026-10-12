# Turn 03 — issue 04: tiered potions with real dice

Read `.claude/skills/implement-prd/RULES.md` before anything else. Those rules apply to this turn.

Use the project skill "implement" (`.cursor/skills/implement/SKILL.md`). Use it to implement the issue `.scratch/potions-and-short-rest/issues/04-tiered-potions-with-real-dice.md`. The issue is the contract: build what it describes and meet every acceptance criterion. Its parent PRD is `.scratch/potions-and-short-rest/PRD.md`.

What the issue could not know:

- Issues 02 and 03 are done on this branch. Issue 03 (commits `04d8b91`, `d970272`) added the dice module `src/core/dice.ts` (parse, roll over a dice source, assured healing), the Hit Dice pool `src/adventurers/hit-dice.ts`, and the Short rest hour in `src/sim/expedition.ts`, whose dice come from `restDice(seed)` wired in `src/sim/game.ts` with one world `seed()` per rest. The rest potions of this issue roll from that same local generator, after every Hit Die. Read those files and their tests before you start.
- `test/expedition.test.ts` has a test through `Game.step` ("advances the world stream by one seed per Short rest whatever the Hit Dice spent") that guards the production wiring of the rest dice. Give the combat potion sub-seed the same kind of guard: a test through the game's or the combat adapter's own interface that fails if the potion roll draws from the world generator or from the engine's stream, not only a test over a helper that re-declares the wiring.
- The issue's "No questions" section replaces rule 4 for this turn: where a choice is left to you, decide, write the decision under the issue's `## Comments`, and carry on. Do not stop to ask.
- The six regression hash tests are skipped and stay skipped. The tests the issue lists under "Survive unchanged" are the guard: no diff in them, still passing. `scripts/tune*.ts`, `scripts/tune-baseline.json` and `test/tune.test.ts` are not part of this issue, except for a change the new pack shape forces on the script; say so in your report if it does.
- Scripts are run with `pnpm dlx vite-node <script>`; `pnpm exec vite-node` does not work in this repository.
- Put your report in `.scratch/potions-and-short-rest/run/turns/03-04-tiered-potions-with-real-dice-report.md` as well as in your final message.

Done means: `pnpm typecheck` and `pnpm test` pass, and your report follows rule 9.
