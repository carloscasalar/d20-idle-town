# Hit Dice at the Short rest

Status: ready-for-agent

Blocked-by: [02 - Measuring tool and baseline](02-measuring-tool-and-baseline.md)

## Parent

[PRD: Hit Dice at the short rest, four healing potion tiers and an apothecary that makes them](../PRD.md), slice 2 of 8. Vocabulary: [CONTEXT.md](../../../CONTEXT.md) (Hit Dice, Short rest, Long rest, Bloodied).

## No questions

The owner is not available while this issue is built. Do not ask and do not wait for an answer. Where this issue or the PRD leaves a choice to the implementer (key names, file locations, log wording), decide and write the decision under Comments. Where this issue gives a rule for a doubt or a failure, follow it.

## What to build

A **Short rest** stops healing a flat half of maximum hit points. Each hero has a pool of **Hit Dice**, as many as their level; the rest is one logged hour in which living heroes roll dice from that pool, the company then decides whether to turn back, and those still Bloodied drink a potion if it goes on. The pool returns at the **Long rest** in town.

The potion is still the old one in this slice (flat heal, one count in the pack, level-based price). Tiers arrive with [issue 04](04-tiered-potions-with-real-dice.md).

### Dice module

- One game-side dice module in the core layer parses and rolls `NdM+K` over the game's `Rng`, or over any source offering `int(min, max)` so tests can script it. A formula that does not parse throws.
- It also derives **Assured healing** from a formula: each die counts as half its faces plus 1, plus the fixed bonus. It is never typed by hand.
- The engine's exported `rollDice` is never called by the game (outside `withRng` it falls back to `Math.random()`).

### Hit Dice pool

- Each hero stores `hitDiceSpent`, starting at 0. Remaining dice are level minus spent, so the maximum is the level and a level-up needs no code: a hero who gains a level gains one die and gets no spent die back.
- Die size and Constitution bonus are parsed from the engine's `hpFormula` (for example `5d10+10`) by one function that throws a clear error if the format changes. The SRD class table is not copied into the game.
- A Hit Die heals `1dN + Constitution`, never less than 1. The clamp cannot fire today (Constitution is +2 for every class) but is written.
- The pool resets to 0 spent at the end of the `resting` stage after a homecoming (the Long rest, `restTicks`, 8 hours), in the same place that heals living heroes to full, with or without paid rooms and with or without a ruined tavern.
- Death and resurrection do not touch the pool.
- Not modelled, documented as a divergence: one Long rest per 24 hours.

### Short rest

- After winning an encounter that is not the last, the company rests only if some living hero is below maximum hit points. The rest is its own tick (one hour) with a log line that shows what each hero rolled.
- If nobody is hurt there is no rest, no tick, no log line and no random draw. The retreat check still runs in the combat tick, where only the alive-count condition can fire.
- Order inside the rest tick:
  1. Each living hero spends Hit Dice.
  2. The company decides whether to turn back, with the hit points the dice left (`retreatHpFraction` now reads this state).
  3. If it goes on, each living hero still Bloodied drinks one potion if the pack has one, whether or not they have dice left. A company that turns back keeps its potions.
- In this slice step 3 goes in company order and uses the old flat potion heal. The **Potion sharing policy** is plugged in by [issue 06](06-potion-sharing-policy.md); the tiered, rolled potion by [issue 04](04-tiered-potions-with-real-dice.md).
- Spending is a pacing strategy behind a swappable interface (inputs: hero, dice remaining, encounters ahead; output: a quota of dice). The default quota is `ceil(D / E)`, `D` dice remaining and `E` encounters ahead. The hero rolls one die at a time and stops at the quota or at maximum hit points. A hero with no dice recovers nothing; no error and no special log line. There is no configuration value to choose the strategy.
- Encounters ahead: exact when the job's encounter count is known. Otherwise the most the job could hold, from configuration: the largest `encounterCounts` entry for a Contract, `encounters[1] + 1` (the boss) for a Bounty, never below the encounters already revealed. The boss counts as an encounter.
- The spending function is pure and takes a dice source, so it can be tested alone.

### Seeding

- Exactly one `seed()` draw from the world stream per rest, and only when a rest happens. Every Hit Die of every hero rolls from one local generator made from that seed, in order. The world stream advances the same amount per rest whatever the dice spent, the pacing or the company size.
- A seed reproduces its own run. Trajectories are not byte-identical to today's.

## Regression hashes: skip them here

This is the first slice that changes behaviour, so it breaks the six regression hashes. In this slice:

- Mark the three tests of `test/simulation-regression.test.ts` (snapshot in `test/__snapshots__/`) and the three `STRIPPED_WORLD` tests of `test/job-intel-regression.test.ts` as skipped, each with a comment pointing at [issue 09](09-retune-confirmation.md), which re-records them once.
- Do not re-record the hashes or update the snapshot. No slice before issue 09 records them.

## Point to confirm while implementing

- The SRD 5.2 wording of the Hit Die minimum of 1 was not found when the PRD was written (ticket 06). Look for it in the SRD and write in the Comments the wording found, or that it was not found. The rule does not change either way: a Hit Die heals `1dN + Constitution`, never less than 1. The clamp cannot fire with today's classes, so this has no effect on the game.

## Acceptance criteria

- [ ] A hurt company after a non-final victory spends one hour on a Short rest with a log line showing each hero's rolls; an unhurt company spends no tick, logs nothing and draws nothing.
- [ ] Heroes roll at most their quota, stop at maximum hit points, and a hero with no dice recovers nothing.
- [ ] The retreat decision uses the hit points after the dice; a company that turns back keeps its potions.
- [ ] A still-Bloodied hero drinks one (old) potion after the retreat check if the company goes on, in company order.
- [ ] `hitDiceSpent` is 0 after the Long rest with and without paid rooms, and with a ruined tavern.
- [ ] Level-up keeps spent dice; death and resurrection leave the pool alone.
- [ ] One world `seed()` per rest, none without a rest.
- [ ] The game never calls the engine's `rollDice`.
- [ ] `expedition.shortRestHealFraction` is gone and rejected as an unknown key.
- [ ] The six regression hash tests are skipped with a comment pointing at issue 09; none is re-recorded.
- [ ] The suite is green.

### Tests

New:

- Dice module: parse, scripted roll, bounds, assured healing of the four default tier formulas (`2d4+2` 8, `4d4+4` 16, `8d4+8` 32, `10d4+20` 50), a parse failure throws.
- Hit point formula parser: die size and Constitution for the engine's classes; a changed format throws.
- Hit Dice: minimum 1 per die; the spending function stops at maximum hit points and at the quota; the default quota; a hero with no dice recovers nothing; encounters ahead for a known count, an unknown Contract and an unknown Bounty.
- Long rest: `hitDiceSpent` is 0 after the rest, with and without paid rooms. Level-up keeps spent dice. Death and resurrection leave the pool alone.
- Short rest: no rest, no tick, no log line and no seed draw when nobody is hurt; exactly one world seed per rest whatever the dice spent; the order dice, retreat check, potions; a company that turns back keeps its potions.
- Configuration: `shortRestHealFraction` is rejected as unknown.

Rewritten:

- The three short-rest tests of the expedition suite (the 50% heal and `shortRestHealFraction: 0.25`).
- "uses one world seed per fight, takes a short rest, and returns after clearing the contract": its mirror generator now has a rest seed between the fights, so its assertion and its name change.

Dice are scripted through the dice source instead of searching for a lucky seed.

Survive unchanged: `smoke` (determinism and interleaving), `combat-space` seed 75, `lairs` seed 14, `deployment`, the seeded loops of the company roster tests, and the combat potion tests (combat is not touched here).

Fixture migration: heroes gain `hitDiceSpent`; migrate any test helper or fixture that builds a hero by hand.

## Configuration and documents

- Removed: `expedition.shortRestHealFraction`, with its validation.
- Added: none.
- `docs/CONFIGURATION.md`: remove `shortRestHealFraction`; describe `retreatHpFraction` as evaluated after the Hit Dice.
- `docs/ARCHITECTURE.md`: the dice module and the ban on the engine's dice; the rest seed in "Determinism and seeding"; the new tests in the test table; the Long rest per 24 hours divergence.
- `CHANGELOG.md`: Hit Dice at the Short rest. Do not mention re-recorded hashes; that note belongs to issue 09.

## Comments
