# Turn 11 — issue 12: Reward set-aside: three leftovers of the review

Read `.claude/skills/implement-prd/RULES.md` before anything else. Those rules apply to this turn.

Use $mattpocock-skills:implement. Use it to implement the issue `.scratch/potions-and-short-rest/issues/12-reward-set-aside-review-leftovers.md`. The issue is the contract: build what it describes and meet every acceptance criterion. Its parent PRD is `.scratch/potions-and-short-rest/PRD.md`.

What the issue could not know:

- Issue 11 is done on this branch (`5329eea`, `f8327e3`). The Board now has two reward-sizing queries, `rewardTreasury(employer)` and `bountyRewardCap(employer, quests)`, each handed to work creation through `WorkContext`, and the Game calls both from `postAssaults()` in `src/sim/game.ts`. The decision on what item 2 requires now is in the issue's Comments ("Decision before turn 11"); follow it: both methods private, `WorkContext` keeps both, and one public yes-or-no Board query replaces the Game's two calls. One `return` where the threshold check is today is equivalent to today's `return` plus `continue`: the answer is the same for every lair until a Bounty is posted, and no check draws randomness. Prove the equivalence with the existing tests of issue 11, which must pass unchanged.
- No behaviour of the game changes. The regression hash tests, their snapshots and `scripts/tune-baseline.json` must not move; if they would, stop and report it, never re-record.
- No existing test changes. The existing Reward set-aside tests pass unchanged; if a test calls a method you make private, stop and say which one.
- The raid tests go through the game's own hourly step, not through a helper that re-declares production code. The reviewer will try these mutations, one at a time; make a test with exact expected figures fail for each:
  1. Remove the `world.postingThreshold` check from the raid's choice of employer.
  2. Change that check from "meets the threshold" to "exceeds the threshold".
  3. Read the treasury left after the rewards owed in that check, for an employer in `board.rewardSetAsideFor`.
- For the catalogues, the reviewer will add a name to the `ServiceKind` union only, then to `SERVICE_KINDS` only, and the same for `EmployerKind` and `EMPLOYER_KINDS`; each of the four must fail `pnpm typecheck`. Show the compiler's error for each in your report, and revert them. The exported names and their values stay the same.
- Documents: `docs/ARCHITECTURE-INTERFACES.md` matches the Board's public surface after the change, and the new test appears in the test table of `docs/ARCHITECTURE.md`. Add a `CHANGELOG.md` line only if that file records internal changes of this kind.
- Put your report in `.scratch/potions-and-short-rest/run/turns/11-12-reward-set-aside-leftovers-report.md` as well as in your final message.

Done means: `pnpm typecheck` and `pnpm test` pass, and your report follows rule 9.
