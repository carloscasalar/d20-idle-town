# Turn 05 — tests: characterise every movement of gold before it moves

Read `docs/agents/orchestration-flow.md`, section "Rules for the implementing
agent", before anything else. Those rules apply to this turn.

This turn adds **tests and one document only**. Do not change anything under
`src/`. The regression snapshot must stay byte-for-byte identical.

## Why

The next turn gives every movement of gold one home (a coin-transfer module).
Today each movement hand-edits some combination of `gold`, `treasury`,
`earned`, `spent`, a hoard, a Holding's loot and the lifetime statistics, in
`src/town/services.ts`, `src/sim/board.ts`, `src/sim/expedition.ts` and
`src/sim/game.ts`. Only one direction (company pays an employer) goes through a
shared function, `payForService`.

## 1. The audit

Write `.scratch/coin-transfers/AUDIT.md`: one table row per place in `src/` that
changes a gold amount. Columns: where (file and function), what it is in domain
terms, where the gold comes from, where it goes, and exactly which fields and
statistics it updates on each side. Include at least: every service purchase;
loot sold to the enchanter; guild dues; blessing; armour; divination and tavern
investigation; resurrection; rooms and carousing; Contract reward and windfall;
Bounty reward; hoard payout; loot left by the fallen and loot found at a
Holding; a wiped company's purse; retirement; daily income and upkeep; the
looting loss when a Contract expires; a new company's starting purse and a new
employer's starting treasury.

Then classify each row as one of: a **transfer** (gold leaves one holder and
reaches another, same amount), a **source** (gold enters the world) or a
**sink** (gold leaves the world).

## 2. The bookkeeping rules, checked

Two rules the game's own counters imply. For each, write a reusable test helper
and run it after every tick of a 400-hour run for seeds 7, 42 and 20260907, and
in the focused tests below.

- **Conservation.** Total gold in the world (every company's purse, every
  employer's treasury, every Lair's hoard, every Holding's loot) changes from
  one tick to the next only by the sources and sinks in your audit. If the
  public interface does not expose enough to compute the sources and sinks for a
  tick, say so in the report and check what can be checked.
- **Each holder's counters add up.** For a company: purse = starting purse +
  `earned` − `spent`. For an employer: treasury = starting treasury + `earned`
  − `spent`.

**Expect these to fail somewhere.** Do not weaken a helper to make it pass and
do not pin the failing behaviour. For every movement that breaks a rule, list it
in the report with the audit row, the rule it breaks and the amount by which it
is off, and exclude exactly that movement from the seeded-run check with a
comment naming the report entry, so the helper still guards everything else.

## 3. Focused tests for uncovered movements

For every audit row not already asserted with exact amounts on both sides by an
existing test, add one in `test/coin-movements.test.ts`, through public
interfaces (`Game`, `visitTownServices`, `advanceExpedition`, `Board`). Assert
exact values: both holders and every counter the row names. Existing tests are
listed nowhere, so check `test/town-services.test.ts`,
`test/expedition.test.ts`, `test/contract-lifecycle.test.ts` and
`test/board.test.ts` before adding a duplicate; say in the report which rows
were already covered and by which test.

## Rules for these tests

Same as turn 03: one behaviour per test, exact numbers not restated formulas,
no spying, nothing tied to where the code lives. If a behaviour looks like a
bug, report it; do not pin it.

## Done means

`pnpm typecheck` and `pnpm test` pass; nothing under `src/` changed; the
snapshot is unchanged; the report follows rule 9 and contains: the list of
movements that break each rule, the rows already covered, and one mutation per
`describe` block that would make it fail.
