# Turn 02 — bug fix: a ruined employer leaves dangling contract references

Read `docs/agents/orchestration-flow.md`, section "Rules for the implementing
agent", before anything else. Those rules apply to this turn.

This turn is a **bug fix**. It may refresh the regression snapshot if, and only
if, the fix changes the serialized world state; say so in your report.

## The bug

`Game.ruin()` in `src/sim/game.ts` marks every open contract of the ruined
employer as failed, but leaves the other side of each reference in place:

- the Holding keeps `asset.questId` pointing at the failed contract;
- if the ruined employer is the guild, the Lair keeps `lair.questId` pointing at
  the failed Bounty.

The invariant the world should keep: **a Holding's `questId`, and a Lair's
`questId`, point only at a contract or bounty that is `open` or `taken`.**
Every other path that ends a contract (expiry, settlement, clearing a lair)
already clears the reference.

## What to do

1. **Test first.** Write a failing test that drives the public `Game` interface
   to ruin an employer that has an open contract, and asserts that afterwards no
   Holding of that employer refers to a failed contract. Do the same for a
   ruined guild with a posted Bounty. Use `Game.forTesting` only to set the
   scene, and assert through `view()` or, if `view()` cannot show it, through
   `JSON.parse(game.regressionState())`. If neither can express the assertion,
   stop and report rather than adding a new back door.
2. **Fix `ruin()`** so the invariant holds. Do not change what else happens when
   an employer is ruined (statistics, events, the Holding's status).
3. **Audit, report, do not fix.** Read every place that sets or clears
   `quest.status`, `asset.questId`, `lair.questId` and `party.questId`. List, in
   your report, any other path that can break the invariant above or leave a
   company pointing at a contract that is not `taken`. For each, give the method
   and the sequence of events that triggers it. Do not fix them in this turn.
4. **Regression snapshot.** Run the tests. If the snapshot differs, refresh it
   and say that it changed and why. If it does not differ, leave it alone.

## Out of scope

Moving the contract lifecycle out of `Game` (that is the next task), any other
refactor, any rule change.

## Done means

`pnpm typecheck` and `pnpm test` pass; the new tests fail without the fix and
pass with it (say how you checked); your report follows rule 9 and includes the
audit list from step 3.

## One leftover from turn 01

`src/combat/battlecast.ts` has a stale comment near the potion loop ("one potion
per living Bloodied hero"). Make it match the code. Nothing else in that file.
