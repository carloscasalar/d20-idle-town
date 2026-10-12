# Turn 05 — issue 06: Potion sharing policy

Read `.claude/skills/implement-prd/RULES.md` before anything else. Those rules apply to this turn.

Use the project skill "implement" (`.cursor/skills/implement/SKILL.md`). Use it to implement the issue `.scratch/potions-and-short-rest/issues/06-potion-sharing-policy.md`. The issue is the contract: build what it describes and meet every acceptance criterion. Its parent PRD is `.scratch/potions-and-short-rest/PRD.md`.

What the issue could not know:

- Issues 02 to 05 are done on this branch. Potions are handed out in two places, both in company order today: between rounds in `src/combat/battlecast.ts` and at step 3 of the Short rest in `src/sim/expedition.ts`; both call the selection function of `src/adventurers/potions.ts`. Issue 05 (commits `e80c126`, `3952642`) replaced the buying rule in `src/town/services.ts` and is not touched here. Issue 07 has not started.
- Reviews of earlier turns failed on wiring that only a unit test of a helper exercised, and on mutations that survived. For this issue, cover through the public interfaces (a fight run by the combat adapter, a Short rest run by the expedition, company creation by the roster or the game): each order in combat and at the rest with a pack shorter than the Bloodied heroes, with exact hit points and packs; the draw happening exactly once per company and at a fixed place (the world stream advances the same whatever the weights); a merger keeping the host's policies; a company with no recorded policy served in company order. Make sure a test fails if the two orders are swapped, if policy (b) sorts by hit points instead of hit point fraction, if fallen heroes are not first, if the rest ignores the policy while combat honours it (and the other way round), or if the merger takes the donor's policies.
- The issue's rule for a surviving test that the new draw breaks is in its "Tests" section: look for a fixed place for the draw first, then migrate keeping what the test checks, and write it in the Comments.
- The issue's "No questions" section replaces rule 4 for this turn: decide, write the decision under the issue's `## Comments`, and carry on.
- The six regression hash tests are skipped and stay skipped.
- Scripts are run with `pnpm dlx vite-node <script>`; `pnpm exec vite-node` does not work in this repository.
- Put your report in `.scratch/potions-and-short-rest/run/turns/05-06-potion-sharing-policy-report.md` as well as in your final message.

Done means: `pnpm typecheck` and `pnpm test` pass, and your report follows rule 9.
