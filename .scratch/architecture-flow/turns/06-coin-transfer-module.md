# Turn 06 — refactor: one module moves gold

Read `docs/agents/orchestration-flow.md`, section "Rules for the implementing
agent", before anything else. Those rules apply to this turn.

This turn is a **refactor**. Behaviour does not change. The regression snapshot
`test/__snapshots__/simulation-regression.test.ts.snap` must stay byte-for-byte
identical, and every existing test file must pass **without being edited**. If
you believe one has to change, stop and report why instead of changing it.

## The problem

Every movement of gold hand-edits some combination of `gold`, `treasury`,
`earned`, `spent`, a Lair's hoard, a Holding's loot and the lifetime statistics.
`.scratch/coin-transfers/AUDIT.md` lists every one of them, and two of them were
wrong until the last turn because a line was forgotten. Only one direction
(a company pays an employer) goes through a shared function, `payForService`.

## What to build

A coin module that is the **only code that writes a gold amount or a gold
counter**. After this turn, no other file under `src/` assigns `party.gold`,
`employer.treasury`, a hoard's or a loot store's `gold`, `earned`, `spent`, or
the gold statistics (`goldPaid`, `goldSpentByHeroes`), other than the factories
that create a holder with its starting amount.

Design the interface yourself, within these constraints. Name things in the
domain language; add the terms you introduce to `CONTEXT.md`.

- **Three operations and no more:** a transfer between two holders, a source
  (gold enters the world) and a sink (gold leaves the world). Each takes an
  amount and a **reason**.
- **Four kinds of holder, one way to address them:** a company's purse, an
  employer's treasury, a Lair's hoard, a Holding's loot. Callers name the
  holder; they never touch its fields. A holder that has `earned`/`spent`
  counters has them kept by the module; one that does not (hoard, loot) simply
  has none. Do not change the shape of `Party`, `Employer`, `Lair` or `Asset`:
  the serialized world must stay identical.
- **What a movement does to counters and statistics is decided by its reason,
  from a table.** The audit shows that movements differ in which counters and
  which lifetime statistics they touch (a purchase counts towards
  `goldSpentByHeroes`; a reward towards `goldPaid`; a wiped purse towards
  neither). Encode that as data keyed by reason, not as flags passed by callers
  and not as branches. Adding a new reason must mean adding one entry. The
  table must reproduce today's behaviour exactly, including any inconsistency
  the audit records between similar movements; list those inconsistencies in
  your report rather than "fixing" them.
- **Amounts are whole and never negative.** A negative or fractional amount is
  an error, not a reverse transfer. Whether a holder may go below zero stays
  exactly as today for each movement (an employer's treasury can be in debt);
  do not add new refusals that could change behaviour.
- **No change to the order of `Rng` draws, events, statistics or mutations
  visible to an event observer.** Where code today updates the two sides of a
  transfer with an event published in between, preserve what an observer sees
  at the moment of the event, and say in your report where you had to take
  care.
- **Dependencies are narrow.** The module needs the statistics ledger and
  nothing else from `Game`. `ServiceLedger`, `ExpeditionLedger` and the Board's
  ledger each expose a slice of the same statistics today; if the coin module
  now writes the gold statistics, those slices lose their gold fields rather
  than keeping a second path.
- **The Board's kind entries stop doing arithmetic.** `payContract`,
  `payBounty`, the expiry loss and the hoard payout become movements with
  reasons.
- `payForService` is absorbed; do not keep it as a second door.
- **`Hero.goldSpent`** (what one adventurer has had spent on them) is a gold
  counter too. It is written by the same movement that spends the gold, named
  in the movement, not by a separate line in the caller.
- **Decisions stay with the callers.** Whether a company can afford something
  (the reserve checks) is not the coin module's business; it only moves gold.
- **Two movements are compound today; keep what an observer sees.** Retirement
  debits 25,000 from the company, of which 5,000 becomes the new employer's
  starting treasury and 20,000 leaves the world. Contract settlement nets the
  windfall and the reward into one change of the treasury. Express each as the
  movements it really is, and make sure no event is published between the parts
  that was not published between them before.

### Tests

- The existing tests, in particular `test/coin-movements.test.ts` with its
  conservation and per-holder checks on every tick of the seeded runs, are the
  safety net.
- Add `test/coin.test.ts` through the module's own interface: each operation
  for each kind of holder; each reason updates exactly the counters and
  statistics its table entry says, and no others; the refusals (negative,
  fractional); a made-up reason added to the table from a test, to prove it is
  extended by data.
- Make conservation checkable from the module itself: after any sequence of
  transfers the sum over all holders is unchanged; sources and sinks change it
  by exactly their amount. Property-style over a few hundred random sequences
  with a seeded `Rng` is fine.

### Documents

`docs/ARCHITECTURE.md`, `docs/ARCHITECTURE-INTERFACES.md`: update what this
makes false and add the module. `docs/ARCHITECTURE-IMPROVEMENTS.md`: add an
entry in the format of the existing ones. `.scratch/coin-transfers/AUDIT.md`:
add a column naming the reason each row now uses.

## Done means

`pnpm typecheck` and `pnpm test` pass; the snapshot and all existing test files
show no diff; a search of `src/` shows the gold fields and gold counters are
assigned only in the coin module and in factories; your report follows rule 9,
lists the module's public interface and its table of reasons, and lists any
inconsistency between similar movements that you preserved.
