# Turn 04 — refactor: the Board owns the lifecycle of Contracts and Bounties

Read `docs/agents/orchestration-flow.md`, section "Rules for the implementing
agent", before anything else. Those rules apply to this turn.

This turn is a **refactor**. Behaviour does not change. The regression snapshot
`test/__snapshots__/simulation-regression.test.ts.snap` must stay byte-for-byte
identical, and these test files must pass **without being edited**:
`test/contract-lifecycle.test.ts`, `test/contract-ruin.test.ts`,
`test/lairs.test.ts`, `test/expedition.test.ts`. If you believe one of them has
to change, stop and report why instead of changing it.

## The problem

The lifecycle of Contracts and Bounties lives in `Game` (`src/sim/game.ts`) as a
dozen private methods. Four references have to agree at all times, and today
that agreement is maintained by hand in many places:

- `quest.status` and `quest.partyId`
- `asset.questId` (a Holding's current Contract)
- `lair.questId` (a Lair's current Bounty)
- `party.questId` (a company's current work)

Three bugs of exactly this kind were fixed in the last two turns. `src/quests/quest.ts`
only creates and reveals; it guards no transition.

## What to build

A **Board** module, `src/sim/board.ts`, that owns the list of Contracts and
Bounties and is the **only code that writes those four references**. After this
turn, no other file assigns `quest.status`, `quest.partyId`, `asset.questId`,
`lair.questId` or `party.questId`. That includes `src/sim/expedition.ts`, which
today clears `party.questId` itself in two places: settling work through the
Board clears it instead. (`party.progress` stays the expedition's.)

The invariant the Board keeps, after every operation:

1. A Holding's `questId` names a Contract that is `open` or `taken`, and that
   Contract names the Holding.
2. A Lair's `questId` names a Bounty that is `open` or `taken`, and that Bounty
   names the Lair.
3. A company's `questId` names work that is `taken` by that company, and that
   work's `partyId` names the company.
4. Work that is `done` or `failed` is referred to by nothing.

### Operations

Design the interface yourself, within these constraints. Name things in the
domain language of `CONTEXT.md` (Contract, Bounty, Holding, Lair, Company); add
"Board" to `CONTEXT.md`.

- **Posting:** post a Contract for a Holding (today `threaten`), post a Bounty on
  a Lair (the creation part of `postAssaults`).
- **Taking:** a company accepts open work (`acceptQuest`).
- **Ending:** settle taken work as succeeded or failed (`settleQuest`,
  `settleAssault`, and the part of `clearLair` that withdraws the Lair's open
  Contracts); expire unanswered Contracts (`expireQuests`, including pruning);
  withdraw an employer's open work when it is ruined (the part of `ruin` that
  touches contracts).
- **Queries** the rest of the game needs: open work, taken work, work by id.
  Return read-only views of the list; nobody outside the Board pushes to it,
  filters it in place or reassigns it.

What stays in `Game` for now, calling the Board: when an employer decides to
post (`postQuests`, `pickQuestLevel`), when a Lair raids (`raids`), when the
guild decides to post a Bounty (the eligibility part of `postAssaults`), which
work a company prefers (`idle`, `hasFirstRefusal`), the coin and loot movements
that are not about the references (`leaveLoot`, hoard payout). Do not move those
in this turn. Where an operation above mixes reference bookkeeping with coin,
renown or statistics (settlement does), move the whole operation to the Board;
a later task extracts the coin movements.

### Constraints

- **Small interface, no leaked internals.** Callers must not need to know the
  order in which references are updated, and must not be able to leave them
  half-updated. One call does one whole transition.
- **Dependencies are passed in, narrowly.** The Board needs the town, the lairs,
  the `Rng`, the tick, a ledger for statistics and a way to report events. Take
  what it needs through a small context, as `advanceExpedition` and
  `visitTownServices` do; do not pass `Game`. Events stay synchronous: an
  observer sees state as it is at the moment of the event.
- **No change to the order of `Rng` draws**, events or statistics updates.
- **States that cannot happen are not silently tolerated.** `settleQuest`,
  `settleAssault` and `expireQuests` return early when an employer, Lair or
  Holding is missing, which would leave work stuck as `taken`. Those states are
  now impossible by construction; make them throw with a clear message. Say in
  your report which early returns you converted.
- **`GameScenario` (used by `Game.forTesting`) keeps working**: tests assign
  `scenario.quests = [...]`. Keep that property with the same meaning, backed by
  the Board.
- **`ExpeditionContext` gets narrower, not wider.** Its `settleQuest` callback
  now leads to the Board; `leaveLoot` stays as it is.
- Keep the constants where they are for now, as named constants; the next turn
  turns them into configuration. Do not start that here.

### Tests

- The existing lifecycle tests through `Game` are the safety net; they stay
  untouched.
- Add `test/board.test.ts`, through the Board's own interface, with: one test
  per operation showing the references on both sides after the call, and the
  refusals (accepting work that is not open, settling work that is not taken,
  posting a second Contract for a Holding that has one, posting a second Bounty
  on a Lair).
- Add an **invariant check** as a reusable test helper that takes the world
  state and asserts the four numbered invariants above. Use it (a) after every
  operation in `test/board.test.ts` and (b) after every tick of a 400-hour run
  for seeds 7, 42 and 20260907.

### Documents

`docs/ARCHITECTURE.md` and `docs/ARCHITECTURE-INTERFACES.md`: update what this
makes false, and add the Board. `docs/ARCHITECTURE-IMPROVEMENTS.md`: add entry 3
in the format of the existing entries. `CONTEXT.md`: add Board.

## Done means

`pnpm typecheck` and `pnpm test` pass; the snapshot and the four protected test
files show no diff; a search of `src/` shows the four references are assigned
only in `src/sim/board.ts` (and in the factories that create a new object with
its initial value); your report follows rule 9, lists the Board's public
interface, and lists the early returns you converted to errors.
