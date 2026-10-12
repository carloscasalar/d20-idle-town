# Turn 03, correction 1

Your work was committed as `2b1c3fc` and reviewed. The behaviour was found correct, the long sweep is clean and most criteria have evidence. Fix the following; the rules still apply. Points 1 to 3 are tests for wiring that a mutation currently survives; production code changes only if a new test shows a real defect.

1. Selection wiring is unproven. Replacing `choosePotion` with "the first stocked tier" in combat or at the Short rest, or passing the base `maxHp` instead of the fight maximum in combat, passes the whole suite. Add mixed-pack tests through the public interfaces: one in combat where a blessing (or item) makes the fight maximum pick a different tier than the base maximum would, and one at the Short rest where the smallest covering tier is not the first stocked one.
2. Combat seeding is partly unproven. These mutations survive: `new Rng(seed)` built without the `seed()` draw, mirroring the engine's seed, and rolling from the setup `rng`. Add a `runCombat` test in `test/combat-potions.test.ts` without an injected `dice` that pins the exact drink line and the exact hit points, so the production generator is the one under test.
3. `test/expedition.test.ts`: the scripted `restDice` shares one array across calls, so it cannot tell one local generator from two made on the same seed. Make the script able to tell them apart, so rest potions rolling from a second generator fail a test.
4. `test/expedition.test.ts`, "uses the HP after Hit Dice…": the expectation went from 18 to 20 by scripting a d4 that rolls 6. A d4 cannot roll 6. Script faces of 3 and restore the original 18.
5. `docs/ARCHITECTURE-INTERFACES.md` is now false: it lists `potionCost` and `potionHeal` on `hero.ts`, says the pack defaults to "zero", and misses `src/adventurers/potions.ts`, the `catalogue` and `dice` combat options and the potion fields of the expedition context. Bring it in line with the code.
6. `scripts/assault.ts`: the pack shape and the heal source were forced by the removed functions; the change of the drinking threshold from below half to `isBloodied` was not. Restore the script's own threshold. Also `new Rng(1)` per drink makes every heal the same constant: use one generator per fight for the potion rolls, without moving the draws the fight already makes.

Allowed test edits: only the test named in point 4 changes an expected value (back to 18). Every other existing test keeps its expected values. For each new test, apply the mutation named in its point, see it fail, undo it, and say so in your report.

Put your report in `.scratch/potions-and-short-rest/run/turns/03-04-correction-1-report.md` as well as in your final message.

Done means: `pnpm typecheck` and `pnpm test` pass and your report follows rule 9.
