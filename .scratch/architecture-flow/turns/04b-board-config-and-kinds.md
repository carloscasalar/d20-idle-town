# Turn 04b — refactor: Board configuration, behaviour per kind of work, and three leaks

Read `docs/agents/orchestration-flow.md`, section "Rules for the implementing
agent", before anything else. Those rules apply to this turn.

This turn is a **refactor**. Behaviour does not change. The regression snapshot
`test/__snapshots__/simulation-regression.test.ts.snap` must stay byte-for-byte
identical. `test/contract-lifecycle.test.ts`, `test/contract-ruin.test.ts` and
`test/lairs.test.ts` must pass without being edited, except for the one test
named in item 5. `test/expedition.test.ts` and `test/board.test.ts` may be
edited only as the items below require.

## Context

The previous turn (commit f7e9e4a) created `src/sim/board.ts`: the Board owns
all Contracts and Bounties and is the only writer of the references between
work, Holdings, Lairs and companies. It passed review. This turn finishes the
module. Read `src/sim/board.ts`, its callers in `src/sim/game.ts` and
`src/sim/expedition.ts`, and entry 3 of `docs/ARCHITECTURE-IMPROVEMENTS.md`.

Where this is heading, so you design for it: the game's tunable numbers will be
loaded from a YAML file, and new kinds of work will be added without editing the
Board's control flow.

## What to do

1. **Board configuration.** Every tunable number the Board uses becomes a field
   of one plain-data `BoardConfig` object given to the Board when it is
   constructed, with an exported default that reproduces today's values. That
   includes at least: the windfall days, the looting days, the renown for
   breaking a Lair and the renown cap it applies, the two cooldown ranges
   applied on expiry and on failure, the pruning threshold, how long a Contract
   stays open, the travel time set when work is taken, and the difficulty
   scale. Plain data only: numbers, and `[min, max]` pairs for ranges; no
   functions, so it can come from YAML later. `Game` builds it from
   `GameConfig`, whose existing fields keep their names and meaning (tests pass
   them). Operations that today take such a value as a parameter
   (`take(..., travelTicks, ...)`, `expireContracts(..., unansweredFor)`) lose
   that parameter.

2. **Behaviour per kind of work, selected by data.** The Board branches on
   `kind === 'assault'` in four places: settlement, the wording when work is
   taken, whether work can expire, and what is withdrawn when a Lair is broken.
   Replace the branching with one table keyed by kind of work, where each entry
   says how that kind is settled on success and on failure, how its acceptance
   is announced, and whether it expires. Adding a third kind must mean adding
   one entry, not editing the Board's operations. Keep the entries small and
   named in the domain language (Contract, Bounty).

3. **Remove `releaseCompany`.** It is an exported writer that the expedition
   must remember to call before settlement, and between the two calls the work
   is `taken` by a company that no longer names it. Settlement alone releases
   the company. The only reason it exists is that `test/expedition.test.ts`
   stubs the settlement callback and asserts, inside the stub and afterwards,
   that `company.questId` is already null. Change those assertions: the
   expedition's contract is that it hands the finished work to settlement
   exactly once with the right outcome, and that it resets its own state
   (`progress`); clearing the reference is settlement's job and is already
   covered in `test/board.test.ts`. Make sure a test through `Game` still shows
   a company with no work after a wipe and after homecoming.

4. **One owner for the start of an expedition.** `Board.take` also writes
   `company.status`, `ticksLeft` and `idleTicks`, which is expedition state.
   The Board links the work and the company; the expedition module starts the
   journey. Give `src/sim/expedition.ts` the operation that starts it, and have
   a single place in `Game` perform "take the work, then set out", so no caller
   can do one without the other. The acceptance event must still be published
   at the same point, with the same state visible, as today.

5. **The impossible expiry case.** `expireContracts` still silently skips a
   Contract whose employer or Holding is missing, because the test "an expired
   Contract missing its %s is still closed and counted" in
   `test/contract-lifecycle.test.ts` builds that state. It cannot occur in a
   real game: nothing removes employers or Holdings. Delete that test, make the
   state an error like the other two, and add the refusal to
   `test/board.test.ts`.

6. **Read-only really means read-only.** `open()`, `taken()`, `byId()` and
   `all()` return types through which a caller cannot assign to a Contract or
   Bounty (TypeScript `Readonly`, deep enough to cover the fields the Board
   owns). Fix the callers that this breaks by routing the write through the
   Board or by showing it was never a write. `records()` and `replace()` are for
   scenario setup only: `Game.regressionState()` uses `all()`, and nothing else
   outside `Game.forTesting` calls them. Name them so that is obvious.

7. **Parameter order.** Context goes last in every Board operation.

## Tests

- `test/board.test.ts`: a Board built with a non-default `BoardConfig` shows
  each configured value taking effect (one focused test per field or group).
- A test that registers a made-up third kind of work in the table and shows it
  can be posted, taken and settled through the Board without touching the
  Board's operations. If the table cannot be extended from a test, the design
  does not meet item 2.
- The invariant helper keeps running after every operation and after every tick
  of the three 400-hour runs.

## Documents

Update `docs/ARCHITECTURE.md`, `docs/ARCHITECTURE-INTERFACES.md` and entry 3 of
`docs/ARCHITECTURE-IMPROVEMENTS.md` so they describe the Board as it is after
this turn.

## Done means

`pnpm typecheck` and `pnpm test` pass; the snapshot has no diff; your report
follows rule 9, lists the final public interface of the Board and the fields of
`BoardConfig`, and names every test you edited or deleted and why.
