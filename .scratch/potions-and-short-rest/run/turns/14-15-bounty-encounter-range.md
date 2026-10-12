# Turn 14 — issue 15: a Bounty's encounter range counts the boss

Read `.claude/skills/implement-prd/RULES.md` before anything else. Those rules apply to this turn.

Use the project skill "implement" (`.cursor/skills/implement/SKILL.md`). Use it to implement the issue `.scratch/potions-and-short-rest/issues/15-bounty-encounter-range-counts-the-boss.md`. The issue is the contract: build what it describes and meet every acceptance criterion. Its parent PRD is `.scratch/potions-and-short-rest/PRD.md`.

What the issue could not know:

- Issues 13 and 14 are done on this branch (`71c5790`, `1a983c6`, `a82db33`). `shortRest` in `src/sim/expedition.ts` now applies the Company's drinking plan (`planDrinkingRound`); `encountersAhead` is unchanged since the issue was written.
- This is a bug fix: a failing test first, then the fix, in the place the decision is made today (`encountersAhead`). `generateAssault` and every default stay as they are.
- The only existing test that changes is the one the issue names in `test/expedition.test.ts` (renamed, first expected value 4 to 3, second unchanged). The regression hash tests, their snapshots and `scripts/tune-baseline.json` must not move; if they would, stop and report it, never re-record.
- The test through the game with `kinds.assault.revealsCount: false` goes through the game's own step and shows exact figures (the Hit Dice a Company spends at a Short rest on a Bounty) that differ between pacing over `encounters[1]` and over `encounters[1] + 1`. The reviewer will restore the `+ 1` and expects that test, and the renamed one, to fail.
- The reviewer will also try: the floor at the revealed encounters removed; `encounters[0]` instead of `encounters[1]`. Each must fail a test with an exact expected value.
- A new long test uses the shared timeout of `test/helpers/simulation.ts`.
- Documents: the field's description in `src/sim/kind-config.ts`, `docs/CONFIGURATION.md`, the paragraph on `encounterCountSource` in `docs/ARCHITECTURE.md`, line 111 of the PRD with a note that this issue changed it, and the test table of `docs/ARCHITECTURE.md` and `docs/ARCHITECTURE-INTERFACES.md` if they name the test or the rule.
- Put your report in `.scratch/potions-and-short-rest/run/turns/14-15-bounty-encounter-range-report.md` as well as in your final message.

Done means: `pnpm typecheck` and `pnpm test` pass, the new tests fail without the fix, and your report follows rule 9.
