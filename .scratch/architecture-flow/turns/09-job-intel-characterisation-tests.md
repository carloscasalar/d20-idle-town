# Turn 09 — tests: characterise what a company learns about a job

Read `docs/agents/orchestration-flow.md`, section "Rules for the implementing
agent", before anything else. Those rules apply to this turn.

This turn adds **tests only**. Do not change anything under `src/`. The
regression snapshot must stay byte-for-byte identical.

## Why

The next turn gives job intelligence one home. Today what a company knows about
a Contract or Bounty, and how it finds out, is spread across:

- `src/quests/quest.ts`: `revealed`, `countRevealed`, `revealNext`, `revealAll`,
  `isFullyKnown`, `learnQuestIntel` and the wording of what was learned;
- `src/sim/board.ts`: `learnIntel` and `revealAll` pass-throughs;
- `src/sim/game.ts`: `investigate` (a Persuasion check at the tavern, a paid
  divination at the temple, paid rounds at the tavern, the limit on rounds);
- `src/sim/expedition.ts`: reading the road with a Survival check, and
  revealing everything on arrival;
- `Party.investigations`, a map whose keys are strings built from a contract id
  plus `:talk`, `:tracks` or nothing.

Before it moves, every rule needs a direct test that stays valid after the move
and that does **not** depend on those string keys (they are what the next turn
removes).

## What to cover

Write the tests against public interfaces: `Game` (`Game.forTesting`, `step()`,
`view()` including each Contract's encounters and whether their count is known,
events), `advanceExpedition`, the Board, and the exported functions of
`quest.ts`. Put them in `test/job-intel.test.ts`. At minimum:

- **What is known when a Contract is posted:** the first encounter only; the
  number of encounters unknown.
- **Learning in order:** the count first, then one encounter at a time; nothing
  more once all is known; the wording reported for each.
- **The free attempt at the tavern:** one per company per job; it happens before
  any paid option; success reveals one piece, failure reveals nothing; who rolls
  and with what advantage (the bard).
- **Divination:** its price per company level, the reserve it must leave, that
  it reveals everything, the temple paid, and that a ruined temple offers none.
- **Paid rounds:** the price per level, the reserve, the limit per company per
  job, one piece each, and a ruined tavern offers none.
- **The order of choices** in an idle hour: free attempt, then divination if
  rich enough, then a round, then taking the job; an hour spent investigating
  is not spent taking the job.
- **Reading the road:** one Survival check per company per job while travelling,
  none for a fully known job, the ranger's advantage, success and failure.
- **Arrival:** everything is revealed and the report says whether it was a
  surprise.
- **Separation:** what one company has tried for one job does not affect
  another company or another job.

Check `test/expedition.test.ts`, `test/coin-movements.test.ts`,
`test/lairs.test.ts` and `test/contract-lifecycle.test.ts` first and do not
duplicate what they already assert exactly; say in the report which rules were
already covered and by which test. If an existing test depends on the string
keys of `Party.investigations`, list it in the report (do not change it).

## Rules for these tests

One behaviour per test in the domain language; exact numbers; no spying on
internals or the `Rng`; nothing tied to where the code lives or to the string
keys. Where a check's success depends on a die, arrange it with the difficulty
or the party so the outcome is certain, or run it over about 40 seeds and assert
both outcomes occur. For each `describe` block, name one mutation that would
make it fail. **If a behaviour looks like a bug, report it; do not pin it.** If a
rule cannot be reached through a public interface, list it.

## Done means

`pnpm typecheck` and `pnpm test` pass; nothing under `src/` changed; the
snapshot is unchanged; your report follows rule 9 and lists suspected bugs,
rules covered elsewhere, existing tests that use the string keys, and rules you
could not reach.
