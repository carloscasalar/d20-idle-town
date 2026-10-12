# Turn 04 — issue 05: buying policy

Read `.claude/skills/implement-prd/RULES.md` before anything else. Those rules apply to this turn.

Use the project skill "implement" (`.cursor/skills/implement/SKILL.md`). Use it to implement the issue `.scratch/potions-and-short-rest/issues/05-buying-policy.md`. The issue is the contract: build what it describes and meet every acceptance criterion. Its parent PRD is `.scratch/potions-and-short-rest/PRD.md`.

What the issue could not know:

- Issues 02, 03 and 04 are done on this branch. Issue 04 (commits `2b1c3fc`, `b9e3260`, `59530a0`) added the potion catalogue and pack in `src/adventurers/potions.ts` (tiers with name, formula and price; assured healing derived by `src/core/dice.ts`; the pack as a map from tier to count) and the temporary buying rule in the `potions` step of `src/town/services.ts`, which this issue replaces. Read those files and `test/town-services.test.ts` before you start. Issues 06 and 07 have not started, so nothing to rebase onto.
- Notes left open by the review of issue 04 that touch this issue: a catalogue that is empty or has no tier named `basic` passes validation. This issue speaks of "the lowest tier" and of "basic"; decide what the step does with such a catalogue (lowest and cheaper by the catalogue's own data rather than by a tier's name is the reading that follows rule 6), write the decision under the issue's `## Comments`, and cover it with a test.
- Reviews of earlier turns failed on wiring that only a helper exercised. For this issue: test the buying rule through the service step's own interface with exact counts, tiers, gold and log lines, and make sure a test fails if the reserve of one resurrection is spent, if two tiers are bought in one visit, or if the divisor is not 2.
- The issue's "No questions" section replaces rule 4 for this turn: decide, write the decision under the issue's `## Comments`, and carry on.
- The six regression hash tests are skipped and stay skipped. `smoke`, `combat-space` seed 75, `lairs` seed 14, `deployment` and the seeded loops of the company roster tests keep passing with no diff.
- Scripts are run with `pnpm dlx vite-node <script>`; `pnpm exec vite-node` does not work in this repository.
- Put your report in `.scratch/potions-and-short-rest/run/turns/04-05-buying-policy-report.md` as well as in your final message.

Done means: `pnpm typecheck` and `pnpm test` pass, and your report follows rule 9.
