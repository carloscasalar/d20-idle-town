# Turn 04b, correction 1

Your work was committed as 091a2c8 and reviewed. Items 1 and 3 to 7 passed. Four
things must change. Still a refactor: the regression snapshot stays identical,
and the rules in `docs/agents/orchestration-flow.md` apply.

1. **The invariant helper got weaker.** In `test/board.test.ts`,
   `assertBoardInvariant` no longer checks the kind of work on either side. A
   raid Contract also carries a `lairId`, so a Lair whose `questId` names a
   Contract now passes. Restore it: a Lair's `questId` names a Bounty; a
   Holding's `questId` names work that is not a Bounty.

2. **A kind entry can break the Board's invariant.** The entries in the kind
   table write `work.status` themselves, so a registered kind that forgets to
   leaves work `taken` with its company released. The made-up kind in the test
   hides this by spreading the Contract entry. The Board, not the entry, writes
   the terminal status in `settle`, in expiry and when a broken Lair's open
   Contracts are withdrawn. An entry only describes consequences (payment,
   renown, reputation, what happens to the Holding or Lair). Rewrite the
   made-up kind in the test from scratch, without spreading an existing entry,
   so the test proves an entry cannot leave the references inconsistent.

3. **Posting looks things up it was already given.** The Contract and Bounty
   `post` rules find the employer and Holding again by id, with `!`, where the
   old code used the objects passed in. Pass the posting terms through. Remove
   the `work.kind = kind` overwrite in `Board.post`; the function that creates
   the work receives its kind.

4. **One source for each value.** `renownCap`, `encounterPartySize` and
   `lairStrengthCap` in `BoardConfig` duplicate constants still used elsewhere
   (`MAX_RENOWN`, `PARTY_SIZE`, `MAX_STRENGTH`). Each value must have one
   definition: either the config default is built from the existing constant
   and every other user reads the same constant, or the other users read the
   config. Do not leave two numbers that have to be kept equal by hand. Say in
   your report which you chose for each.

Not in this correction: restructuring `GameConfig` into sections, moving job
intel off the Board, or the coin movements inside the kind entries. Those are
later tasks.

Done means: `pnpm typecheck` and `pnpm test` pass; the snapshot has no diff;
your report follows rule 9. Update the report file you wrote
(`.scratch/architecture-flow/turns/04b-board-config-and-kinds-report.md`) so it
describes the final state.
