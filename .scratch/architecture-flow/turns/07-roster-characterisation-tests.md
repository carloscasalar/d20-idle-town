# Turn 07 — tests: characterise how companies arrive, fill up, merge and retire

Read `docs/agents/orchestration-flow.md`, section "Rules for the implementing
agent", before anything else. Those rules apply to this turn.

This turn adds **tests only**. Do not change anything under `src/`. The
regression snapshot must stay byte-for-byte identical.

## Why

The next turn gives the population of companies one home (a company roster
module) and removes the `tryRetire` callback that `visitTownServices` takes
from `Game`. Today that behaviour is spread between `Game` (`arrivals`,
`recruit`, `absorb`, `retire`, the stranded-band rule) and
`src/adventurers/party.ts` (`createParty`, `rollClasses`, `mergeParties`,
`buryDead`, `isFull`, `hasRoom`, `partyLevel`). Before it moves, every rule needs
a direct test that stays valid after the move.

## What to cover

Write the tests against public interfaces: `Game` (`Game.forTesting` to set the
scene, `step()`, `view()`, events; `JSON.parse(game.regressionState())` only for
facts `view()` does not show) and the exported functions of `party.ts`. Put them
in `test/company-roster.test.ts`. Read the methods named above and cover every
rule in them. At minimum:

- **Arrivals:** the arrival interval and its range; the cap on companies in
  town; a new company's size and level (level 1, or the level of an open
  Contract some of the time); the four roles a full company covers.
- **Strangers who fill a stranded company:** when it happens (an idle company
  that is not full and has waited its patience), the size and level of the band,
  and that it arrives instead of a new company that hour.
- **Recruiting:** the temple raises the dead the company can afford, cheapest
  rule first as the code does it, each paid separately, with the bill reported
  once; then merging with another idle, incomplete company of the same level;
  after the disband period, the survivors join a host that is idle or resting,
  full, has room, and is within one level, closest level first and then the
  smallest; a host with six turns the rest away and they stay behind.
- **Merging and burying:** who moves, the six-member cap, the leftovers, the
  donor disbanded only when nobody is left behind, the dead buried and reported
  when a company becomes full, the purse moving with the survivors.
- **Retirement:** who may retire (level, purse above price plus reserve), what
  the veteran leaves (items to the stash), the new employer (its Holding,
  starting treasury, the favoured company), that it happens at its place in the
  order of town services (after blessings, before armour), and the old
  company's first refusal on the new employer's Contracts.
- **Party helpers:** `partyLevel` with dead members and with none alive,
  `isFull`, `hasRoom`, `mergeParties` and `buryDead` return values.

Where a rule involves a random draw, arrange the scene so the outcome does not
depend on it, or run it over about 40 seeds and assert the range and that both
ends occur. Do not spy on the `Rng`.

Check `test/party.test.ts`, `test/town-services.test.ts`,
`test/coin-movements.test.ts` and `test/lairs.test.ts` first, and do not
duplicate what they already assert exactly; say in your report which rules
were already covered and by which test.

## Rules for these tests

One behaviour per test, named in the domain language of `CONTEXT.md`; exact
numbers, not restated formulas; no spying; nothing tied to where the code lives.
For each `describe` block, name in your report one mutation of the code that
would make it fail. **If a behaviour looks like a bug, do not pin it:** list it
with the method, the trigger and why it looks wrong. If a rule cannot be reached
through a public interface, list it instead of adding a back door.

## Done means

`pnpm typecheck` and `pnpm test` pass; nothing under `src/` changed; the
snapshot is unchanged; your report follows rule 9 and includes the suspected
bugs, the rules already covered elsewhere, and the rules you could not reach.
