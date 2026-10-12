# Slice review of turn 10 (issue 11), commit `5329eea`

Reviewer: `slice-reviewer`. Verdict: FAIL on design; every acceptance criterion met and proven.

- Checks: `pnpm typecheck` clean, 770 of 770 tests in 37 files, none skipped; long sweep over seeds 1 to 150 for 1,500 hours with no crash.
- Guard: `test/__snapshots__/`, both regression tests and `scripts/tune-baseline.json` byte-identical to `9c9a2f7`.
- Mutations (a) to (i) of the turn prompt: no survivor. For (i), removing only the game's guards fails by the Board's throw.
- Survivor outside this issue: the raid Contract threshold in `src/sim/game.ts` read from the reduced treasury passes every test. This is item 1 of issue 12.
- Behaviour note: for an unlisted guild a Bounty of zero or less is now skipped by the game and rejected by `Board.postBounty`; the brief's "no Bounty is ever posted with a reward of zero or less" covers it.

Corrections:

1. `generateAssault` takes a union with a fallback branch that reads the guild's treasury; it should take the funding only.
2. `createBounty` in the Board repeats the reward formula of `generateAssault`.
3. `AssaultFunding.rewardTreasury` (cap after the share) and `QuestTerms.rewardTreasury` (treasury before the share) share a name with two meanings.
