# Turn 01 — bug fix: adventurers drink potions; name the short rest

Read `docs/agents/orchestration-flow.md`, section "Rules for the implementing
agent", before anything else. Those rules apply to this turn.

This turn is a **bug fix**. It is allowed, and expected, to change the seeded
simulation and refresh the regression snapshot.

## The bug

Companies buy healing potions and never drink them. Read
`.scratch/potions-and-short-rest/issues/01-adventurers-never-drink-potions.md`
and the potion rules in `CONTEXT.md` (Bloodied, Short rest, Healing potion).

## What to build

1. **Bloodied.** One helper in `src/adventurers/hero.ts` that answers whether a
   hero is Bloodied: half of maximum hit points or fewer (`hp * 2 <= maxHp`).
   Every "badly hurt" check for potions uses it.

2. **Potions during an encounter.** In `runCombat`
   (`src/combat/battlecast.ts`), after each round that does not end the fight
   and before the flee check, every living hero who is Bloodied drinks one
   healing potion while the company has any left. Bloodied is judged against the
   hero's maximum in that fight (so a blessing or an item that raises maximum
   hit points counts).
   - The company's supply comes in through `CombatOptions`; the number drunk
     comes back in `CombatOutcome`. `runCombat` must not know about `Party`.
   - Healing uses the engine's own healing call on the creature, and the amount
     is the game's existing `potionHeal(hero)`. Confirm the engine call exists
     in `node_modules/battlecast-engine` (its DESIGN.md mentions `heal`). If the
     engine offers no way to heal a creature between rounds, stop and report;
     do not fake it by editing engine state.
   - Each potion drunk adds one narration line to the combat lines.
   - This is an approximation of the D&D 2024 rule (a potion is a Bonus Action
     on the hero's turn). Drinking between rounds at no action cost is the
     accepted stand-in, because the engine cannot model the Bonus Action.
   - `src/sim/expedition.ts` passes the company's potions in, subtracts the ones
     drunk, and keeps working with a scripted `CombatResolver`.

3. **Short rest.** Rename the expedition's `breather` to `shortRest` and make it
   the single place that says what a Short Rest does. Keep today's healing
   (half of maximum hit points), but make the fraction a configuration value:
   add it to `GameConfig` with a default of 0.5 and pass it through
   `ExpeditionContext`. After the healing, a hero who is still Bloodied drinks a
   potion if the company has one. With the default fraction that never happens;
   with a smaller fraction it does, and that is how you test it.

4. **Tests**, all through public interfaces:
   - `runCombat`: a Bloodied hero drinks between rounds; nobody drinks when the
     supply is zero; the supply is never overdrawn; the outcome reports the
     number drunk. Use a real fight with a fixed seed chosen so a hero becomes
     Bloodied and the fight lasts more than one round; assert on the outcome and
     narration, not on engine internals.
   - Expedition: potions drunk in a fight are subtracted from the company; with
     a short-rest fraction below 0.5 a still-Bloodied hero drinks after the
     rest and a hero above half does not; with no potions nobody drinks.
   - Delete the "known defect: potions are never drunk during a short rest"
     tests.

5. **Regression snapshot.** Refresh
   `test/__snapshots__/simulation-regression.test.ts.snap` and say so in your
   report.

6. **Balance numbers.** Before changing any code, run `scripts/tune.ts` and keep
   its output. Run it again at the end. Put both outputs, side by side, in your
   report and in the issue file. If the script cannot be run, say exactly why;
   do not change `difficultyScale` or any tuning value either way.

7. **Documents.**
   - Rewrite the issue file so it no longer describes the fixed bug. What
     remains are the divergences from D&D 2024, each with the ideal behaviour:
     the Short Rest heals a flat fraction instead of spending Hit Dice; potions
     heal and cost the game's values instead of 2d4 + 2 for 50 gp; a potion in
     combat is drunk between rounds instead of as a Bonus Action. Rename the
     file to match, keep `Status:` as `needs-triage`, and keep the D&D findings
     and source link.
   - `CONTEXT.md`: keep the terms; make the two potion rules match what is now
     implemented.
   - `docs/ARCHITECTURE.md`, `docs/ARCHITECTURE-INTERFACES.md`, `README.md`:
     update only the sentences this change makes false.
   - `docs/ARCHITECTURE-IMPROVEMENTS.md`: do not add an entry; this is a bug
     fix, not an architecture improvement. Do remove the "Potion finding"
     paragraph from entry 2, since it is no longer true.

## Out of scope

Hit Dice, potion strength or price, retuning difficulty, any other refactor.

## Done means

`pnpm typecheck` and `pnpm test` pass; the snapshot was refreshed once, on
purpose; your report follows rule 9 and includes the before/after balance
numbers.
