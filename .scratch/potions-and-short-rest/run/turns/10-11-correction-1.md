# Turn 10, correction 1

Your work was committed as `5329eea` and reviewed. Every acceptance criterion is met and proven, all the listed mutations are killed, the regression guard is byte-identical and the long sweep is clean. Fix the following; the rules still apply.

1. `src/quests/quest.ts`, `generateAssault`: its funding parameter is a union, `AssaultFunding | Pick<Employer, 'id' | 'treasury'>`, with an `'rewardTreasury' in guild ? … : guild.treasury` branch. The brief says Bounty generation receives the treasury to size from "instead of reading the guild's treasury itself", and that branch exists only for tests and one script. Accept `AssaultFunding` only and remove the branch.
2. `src/sim/board.ts`, `createBounty`: it repeats the `Math.min(cap, rewardPerLevel * lair.level)` formula that `generateAssault` already holds. Keep the formula in one place.
3. `AssaultFunding.rewardTreasury` is the cap after the share, while `QuestTerms.rewardTreasury` is the treasury left before the share: one name, two meanings. Either give Bounty generation the same meaning as a Contract's, or rename the field to what it holds. Keep `docs/ARCHITECTURE-INTERFACES.md` true to the result.

Allowed test edits, forced by correction 1: the call sites of `generateAssault` in `test/board.test.ts`, `test/lairs.test.ts`, `test/contract-ruin.test.ts` and `scripts/assault.ts` change the shape of the argument they pass (the guild's whole treasury, as today). No assertion and no expected value changes in those files. If anything else must change, stop and say why.

The regression hashes, their snapshots and `scripts/tune-baseline.json` still must not move, and the nine mutation families of the turn prompt must still be killed.

Append what you did to `.scratch/potions-and-short-rest/run/turns/10-11-reward-set-aside-bounties-report.md` under a "Correction 1" heading.

Done means: `pnpm typecheck` and `pnpm test` pass and your report follows rule 9.
