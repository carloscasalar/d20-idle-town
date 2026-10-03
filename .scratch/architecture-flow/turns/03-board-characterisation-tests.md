# Turn 03 — tests: characterise the contract lifecycle before it moves

Read `docs/agents/orchestration-flow.md`, section "Rules for the implementing
agent", before anything else. Those rules apply to this turn.

This turn adds **tests only**. Do not change anything under `src/`. The
regression snapshot must stay byte-for-byte identical.

## Why

The next turn moves the lifecycle of Contracts and Bounties out of `Game`
(`src/sim/game.ts`) into its own module, the Board. Today that behaviour is
covered almost only by the 400-hour seeded runs. Before it moves, every rule in
it needs a direct test that will still be valid after the move.

## What to cover

Write the tests against the **public `Game` interface** (`Game.forTesting` to
set the scene, `step()` to run, `view()` and events to observe; use
`JSON.parse(game.regressionState())` only for facts `view()` does not show).
These tests must not depend on where the code lives, so they survive the
refactor unchanged. Put them in `test/contract-lifecycle.test.ts`.

Read these methods of `Game` and cover every rule in them: `postQuests`,
`threaten`, `pickQuestLevel`, `raids`, `postAssaults`, `raidSucceeded`,
`acceptQuest`, `hasFirstRefusal`, the contract-choosing part of `idle`,
`expireQuests`, `settleQuest`, `settleAssault`, `clearLair`, `ruin`,
`respawnLairs`. At minimum:

- **Posting a Contract:** which employers may post (not ruined, off cooldown,
  treasury threshold, a free Holding); an overrun Holding is chosen before a
  safe one; the board's open-contract cap; the Holding becomes threatened and
  refers to the contract; a Lair of the same theme becomes its origin and its
  raid count goes up; the level comes from the companies in town.
- **Raids:** a Lair raids only when its cooldown ends, only Holdings its theme
  threatens, never one that already has a contract; the cooldown is reset.
- **Posting a Bounty:** only when the guild is not ruined, the Lair is active and
  has no Bounty, and some company is within one level of the Lair.
- **Taking work:** level match and the one-level stretch after a slow day;
  guild-only work needs membership; the preference order (favoured employer,
  closest level, reputation, reward); first refusal for a retired adventurer's
  old company for one day; the appetite and reserve conditions for a Bounty;
  the references set on both sides when work is taken.
- **Expiry:** only open Contracts past their time, never a Bounty; the employer's
  loss is capped by the treasury; the Holding is released and becomes ravaged
  the first time and stays so afterwards; an unanswered raid makes its Lair
  stronger and richer; the employer's cooldown is shortened; old finished work
  is pruned once the list is long.
- **Settling a Contract:** success (reward, windfall, Holding safe, reputation,
  renown and its cap, item reward, loot left by a previous company) and failure
  (counters, renown floor, cooldown, the Lair growing bolder).
- **Settling a Bounty:** success (reward, item, hoard gold and items, renown,
  the Lair cleared, every open Contract from that Lair withdrawn and its Holding
  made safe) and failure (the Lair grows stronger and the Bounty can be posted
  again).
- **Ruin** and **Lair respawn:** whatever the earlier tests in
  `test/contract-ruin.test.ts` and `test/lairs.test.ts` do not already cover.

Where a rule involves a random draw, arrange the scene so the outcome does not
depend on it, or assert the range. Do not spy on the `Rng`.

## Rules for these tests

- One behaviour per test, named in the domain language of `CONTEXT.md`.
- Assert exact values where the rule is exact (gold, counters, status).
- No test may restate the code's formula; write the expected number.
- A test that cannot fail is worse than no test. For each `describe` block, say
  in your report one mutation of the code that would make it fail.
- **If a behaviour looks like a bug, do not write a test that pins it.** List it
  in your report with the method, the trigger and why it looks wrong.
- If a rule cannot be reached through the public interface, list it in your
  report instead of adding a back door.

## Done means

`pnpm typecheck` and `pnpm test` pass; nothing under `src/` changed; the
snapshot file is unchanged; your report follows rule 9 and includes the list of
suspected bugs and the list of rules you could not reach.
