# Turn 10 — refactor: job intelligence in one module

Read `docs/agents/orchestration-flow.md`, section "Rules for the implementing
agent", before anything else. Those rules apply to this turn.

This turn is a **refactor**. Behaviour does not change. Read the two exceptions
below carefully: they are the only ones.

## The problem

What a company knows about a Contract or Bounty, and how it finds out, is spread
over five places: `revealed`, `countRevealed`, `revealNext`, `revealAll`,
`isFullyKnown` and `learnQuestIntel` in `src/quests/quest.ts`; `learnIntel` and
`revealAll` pass-throughs on the Board; `investigate` in `src/sim/game.ts`;
reading the road and the reveal on arrival in `src/sim/expedition.ts`; and
`Party.investigations`, a map whose keys are strings built from a contract id
plus `:talk`, `:tracks` or nothing. The roster also gained
`recordInvestigation` and `payService` to support it.

## What to build

1. **A job intelligence module** that owns: what is publicly known about each
   job (the encounter count and how many encounters are revealed), what each
   company has tried for each job (its free attempt at the tavern, its paid
   rounds, its look at the road), and every way of learning (the free attempt,
   divination, paid rounds, reading the road, arrival). It is the only code
   that writes those facts. Name it in the domain language; add the term to
   `CONTEXT.md`.

2. **What a company has tried is typed, not string-keyed.** Replace the
   `Party.investigations` string keys with a structure in which "free attempt
   made", "rounds bought" and "road read" are named fields per job.

3. **The ways of learning in an idle hour are an ordered list of steps**, the
   same shape as the town service steps (`(company, context) => boolean`, true
   when the hour is spent), with a named default list reproducing today's order:
   the free attempt, then divination, then a paid round. Adding a way of
   learning means adding an entry.

4. **Gold through the coin module, with its own reason.** Divination and paid
   rounds move gold through the coin module with a new reason (for example
   `intel`) whose effects equal those of the reason they use today, so no
   counter or statistic changes.

5. **Remove the stopgaps.** The Board's `learnIntel` and `revealAll`, and the
   roster's `recordInvestigation` and `payService`, go away; their callers use
   the new module. The Board keeps owning its records; give the intelligence
   module the narrowest write access to the two knowledge fields it needs, and
   nothing else.

6. **Configuration.** Plain-data configuration with an exported default
   reproducing today's values: at least the skill difficulty, the price per
   level of divination and of a round, the reserve rule for each, and the limit
   on paid rounds. A value that already has a definition elsewhere keeps it.

7. `learnQuestIntel` on a job that is already fully known currently returns the
   wording of the last encounter; it is never reached. Make it impossible by
   construction or an error, and say which.

## The two exceptions

**A. The regression snapshot may change, but only because of item 2.**
`Party.investigations` is part of the serialized world, so changing its shape
changes the snapshot hash. That is the only allowed reason. Prove it: add a test
(or extend an existing test helper) that, for seeds 7, 42 and 20260907 over 400
hours, compares at every tick the serialized world with the investigation
records removed against the same run at the commit before this turn, or
equivalently converts the new records back to the old key form and compares the
whole world. Report how you proved it. Then refresh the snapshot once.

**B. Allowed test edits.** Six tests in `test/expedition.test.ts` read
`` `${quest.id}:tracks` ``. You may rewrite only those assertions so they check
the same fact through public behaviour or the new module's interface, with the
same expected outcome. List each edited test by name. No other existing test
file changes, and no assertion elsewhere is deleted or loosened.

## Constraints

- No change to the order of `Rng` draws, events, statistics or gold movements.
- Dependencies passed in narrowly; context last; read-only views for queries.
- The safety nets: `test/job-intel.test.ts`, `test/coin-movements.test.ts`,
  `test/expedition.test.ts`, `test/contract-lifecycle.test.ts`.

## Tests

Add tests through the new module's interface for each way of learning, each
refusal (a ruined tavern or temple, the reserve, the round limit, one attempt
per job), and one that inserts a made-up way of learning into the step list to
prove the order is data. After the change, run `scripts/combat-sweep.ts` (seeds
1 to 150, 1,500 hours) and report any crash.

## Documents

`docs/ARCHITECTURE.md`, `docs/ARCHITECTURE-INTERFACES.md`: update and add the
module. `docs/ARCHITECTURE-IMPROVEMENTS.md`: add an entry.

## Done means

`pnpm typecheck` and `pnpm test` pass; the snapshot changed only as exception A
allows, with the proof described; no string keys for investigations remain in
`src/` or `test/`; the Board and roster stopgaps are gone; your report follows
rule 9, lists the module's public interface, its configuration, the edited
tests, and the sweep result.
