# Turn 02, part 2 — bug fix: the two dangling references your audit found

Your fix was committed as 7eb395b and passed review. The reviewer confirmed
both defects from your audit. Fix them now, in the same way: failing test first,
then the fix. The rules in `docs/agents/orchestration-flow.md` still apply.

This is a **bug fix** turn. Both defects occur in the snapshot seeds, so the
regression snapshot will change. Refresh it once and say so.

1. **A cleared Lair still points at its finished Bounty.** After
   `settleAssault()` succeeds and `clearLair()` runs, `lair.questId` still names
   the `done` Bounty, so `view()` reports `bountyPosted: true` for a cleared
   Lair. A Lair's `questId` must point only at an `open` or `taken` Bounty.

2. **A wiped-out company still points at its failed contract.** When a company
   is wiped out in `resolveFight()` and the contract is settled as failed,
   `party.questId` (and `party.progress`) keep their old values on the disbanded
   company. A company's `questId` must point only at a `taken` contract or
   bounty. Decide where the reference is cleared so that the expedition module
   and `Game` do not both have to remember to do it; say what you chose and why.

Tests go through public interfaces: `Game` for (1); `advanceExpedition` with a
scripted resolver for (2), plus one `Game`-level check if the clearing ends up
in `Game`.

3. **Record one open rule question as an issue; do not change the behaviour.**
   A contract already `taken` when its employer is ruined is still settled
   normally: the ruined employer pays the reward and gains reputation. Write
   `.scratch/contract-lifecycle/issues/01-ruined-employer-still-pays.md` with
   `Status: needs-triage`, describing the current behaviour, why it is
   questionable, and two or three possible rules. Keep it short.

Out of scope: the unreachable early returns in `settleQuest`, `settleAssault`
and `expireQuests` (missing employer, lair or holding), and the pruning of old
contracts. The next task moves the contract lifecycle into its own module and
deals with them there.

Done means: `pnpm typecheck` and `pnpm test` pass; the new tests fail without
the fixes; the snapshot was refreshed once; your report follows rule 9.
