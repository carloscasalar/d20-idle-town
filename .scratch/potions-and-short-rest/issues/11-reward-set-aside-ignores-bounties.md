# The Reward set-aside ignores Bounties

Status: needs-triage

Found by the owner while reviewing [issue 08](08-reward-set-aside.md). Not reachable with the default configuration: `board.rewardSetAsideFor` holds the apothecary alone, and the apothecary never posts a Bounty.

## What happens

The Reward set-aside covers Contracts only. `Board.rewardTreasury` in `src/sim/board.ts` adds up an employer's `open` and `taken` work of kind Contract, and only `generateQuest` in `src/quests/quest.ts` reads the result.

A Bounty is left out on both sides:

- Its reward is not counted as owed when a later Contract of the guild is sized.
- Its own reward is sized from the guild's whole treasury (`Math.min(guild.treasury, assault.rewardPerLevel * lair.level)` in `generateAssault`), whatever the guild already owes.

So with `guild` in the list, the guild can promise its whole treasury in a Bounty and then another 80% of the same treasury in a Contract. The guild also pays upkeep and posts Contracts on its own holdings, so it can go into debt the way the rule is meant to prevent.

Issue 08 asked for Contracts only, and `test/reward-set-aside.test.ts` pins that ("sets aside Contracts only, even when a configured employer also posts a Bounty"). This is a gap in the rule as specified, not a defect of that slice.

## What it should do

The owner's decision: the set-aside applies to both kinds of work. For an employer in the list, the gold promised in its `open` and `taken` Bounties is owed as well, and a new Bounty is sized from the treasury minus what is owed.

To settle before building:

- Whether a Bounty then takes the whole reduced treasury, as today, or `quests.treasuryShare` of it, as a Contract does.
- `CONTEXT.md` defines the Reward set-aside over Contracts; the entry changes with the rule.
- The existing Contracts-only test is replaced.
- Putting `guild` in the default list is a separate decision and needs its own long-run measurement.

## Comments
