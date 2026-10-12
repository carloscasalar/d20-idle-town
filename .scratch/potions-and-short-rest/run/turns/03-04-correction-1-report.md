Correction 1 for issue 04 is on `feature/potions-healing`, after `2b1c3fc`.
The fight and the Short rest already chose the tier and the generator correctly.
The new tests are what fail when that wiring is replaced. Production combat,
expedition and potion code are unchanged.

What changed:

- `test/combat-potions.test.ts` drinks a mixed pack through `runCombat` with a blessing of 20. The fight maximum makes Lysander drink superior (`8d4+8: 32`) between rounds 1 and 2. The base maximum of 20 would drink basic. A second test calls `runCombat` with no injected `dice` and pins the drink line `(2d4+2: 6)` and hit points `[24, 24, 16, 20]`.
- `test/expedition.test.ts` drinks greater, not the stocked basic, through `advanceExpedition` when 16 hit points are missing. `scriptedRestDice` lets the first call consume the face list and a later call replay it from the start. The "HP after Hit Dice" test rolls 6 on the fighter's d10 and 3 on the potion's d4, and expects 18 again.
- `docs/ARCHITECTURE-INTERFACES.md` drops `potionCost` and `potionHeal`, describes an empty pack, and adds `src/adventurers/potions.ts`, `options.catalogue`, `options.dice`, and the expedition catalogue and `restDice`.
- `scripts/assault.ts` drinks only when hit points are below half, and rolls each fight's potions on one private generator so the script's combat seeds stay put.

The d4 cannot be the same face as the hit die if the result is to stay 18. After one d10 of 6 a level-1 fighter on 2 HP is on 10. A 2d4+2 of 3 and 3 heals 8, which is 18. A face of 3 on the d10 as well would finish on 15. The script therefore returns 3 only when the die has 4 faces.

Mutations, each applied, observed, and undone:

| Mutation | Result |
| --- | --- |
| Combat: first stocked tier instead of `choosePotion` | Fails "drinks the tier that covers the fight maximum…". Received a basic potion (`2d4+2: 8`) instead of superior (`8d4+8: 32`). 15 other combat tests passed. |
| Combat: `h.maxHp` instead of the fight maximum | Same failure: basic instead of superior. |
| Short rest: first stocked tier instead of `choosePotion` | Fails "drinks the smallest covering tier when that is not the first potion stocked". Hit points were 22, not 30. 74 other expedition tests passed. |
| `new Rng(seed)` with no `seed()` draw | Fails "rolls the drink on the child generator taken after placement". The drink line array differed. A probe of that mutation rolled `(2d4+2: 7)` and left 17 HP. |
| Potion rolls taken from the setup `rng` | Same test failed. The probe rolled `(2d4+2: 7)` and left 17 HP. |
| Rest potions rolled on a second `restDice` of the same seed | Five tests failed: the 4, 2 and 1 potion sharing cases (the first generator's tail was left unconsumed), "gives a potion…" (16 HP became 15), and the new greater-tier test (30 HP became 29). |

Checks:

| Command | Result |
| --- | --- |
| `pnpm typecheck` | Pass, after `scriptedRestDice` was called with no extra argument. |
| `pnpm test` | Pass: 31 files passed, 2 skipped; 676 tests passed, 6 skipped (682). |

The regression guard did not change. The six hash tests stay skipped and were not edited. No game rule moved, so nothing was re-recorded.

Acceptance coverage:

| Point | Coverage |
| --- | --- |
| 1. Mixed pack through the public fight and rest | `test/combat-potions.test.ts` "drinks the tier that covers the fight maximum, which the base maximum would not". `test/expedition.test.ts` "drinks the smallest covering tier when that is not the first potion stocked". Both fail the named mutations. |
| 2. Unscripted combat drink line and hit points | `test/combat-potions.test.ts` "rolls the drink on the child generator taken after placement". Fails both seeding mutations. |
| 3. One rest generator is not two from the same seed | `scriptedRestDice` in `test/expedition.test.ts`. The second-generator mutation fails the sharing cases, "gives a potion…", and the new greater-tier test. |
| 4. d4 faces of 3, expectation 18 | `test/expedition.test.ts` "uses the HP after Hit Dice to continue when the company was below the retreat threshold". This is the only previous expectation that changed, from `[20, 20, 20, 20]` to `[18, 18, 18, 18]`. |
| 5. Interfaces doc matches the code | `docs/ARCHITECTURE-INTERFACES.md`. |
| 6. Assault threshold and one generator per fight | `scripts/assault.ts`: `h.hp < h.maxHp * 0.5`, and `new Rng(i + 1)` created once per encounter, not from the script `rng`. |

## Standards

The review called the assault threshold a second copy of Bloodied, and `new Rng(i + 1)` a draw outside the script's generator. The correction asks for the script's own below-half check, and for a generator that does not move the draws the fight already makes. Those two lines stay. It also called the replay branch of `scriptedRestDice` unused, and the d4-versus-d10 face split a stand-in. The replay is what makes the second-generator mutation fail. The face split is what keeps the d10 on 6 and the d4 on 3. The new Short rest test repeats the shape of the quota test beside it; that is the public setup the rest already uses.

## Spec

No missing requirement, no scope creep, and nothing implemented against the six points.

Questions: none.

Bugs: none. The mutations failed in the tests and the production wiring was left as it was.

Not done: nothing from this correction. No push; the orchestrator pushes.
