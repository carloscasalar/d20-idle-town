Issue 04 is implemented on `feature/potions-healing`. Starting HEAD was `f41ab37`.
Only this issue's work is in the commit. Decisions are under the issue's Comments.

The single level-scaled potion is the four SRD tiers (basic 2d4+2 / 50 gp,
greater 4d4+4 / 200, superior 8d4+8 / 2,000, supreme 10d4+20 / 20,000).
Assured healing comes from `src/core/dice.ts` and is never stored. A company
pack is a count per tier. Between combat rounds and at the Short rest, a
Bloodied hero drinks the smallest stocked tier whose assured healing covers
the missing hit points, or the strongest tier in the pack; a fallen hero counts
`maxHp`. Combat rolls on a child generator taken with one `seed()` after
placement and passes the total to the engine's `heal`. Rest potions roll on
the same local generator as the Hit Dice, after every Hit Die, with no extra
world draw. Buying stays temporary: the tier named `basic` only, up to one per
living hero, at the catalogue price, keeping one resurrection in reserve,
nothing from a ruined apothecary, paid to the treasury as a `service`.
`heroes.startingGoldPerLevel` is 50. Resurrection at level 1 is 190 gp
(`150 + 1² × 40`), so a new company still cannot buy before its first reward.
That reason is not in `docs/CONFIGURATION.md` or `CHANGELOG.md`. The four old
potion keys and `potionCost` / `potionHeal` are gone.

`scripts/assault.ts` had to change so it typechecks: the pack is a map, and a
Bloodied hero between fights drinks one basic potion from the catalogue on a
private generator, so the script's combat seeds stay put. `scripts/tune*.ts`,
`scripts/tune-baseline.json` and `test/tune.test.ts` were not modified.
`CONTEXT.md` was left as it is: it describes the buying policy of later issues.

Check results:

| Command or check | Result |
| --- | --- |
| `pnpm typecheck` | Pass, after the review fixes as well. |
| `pnpm test` | Pass: 31 files passed, 2 skipped; 673 tests passed, 6 skipped (679). |
| Diff of `test/simulation-regression.test.ts`, `test/job-intel-regression.test.ts`, their snapshots, `test/tune.test.ts`, `scripts/tune.ts`, `scripts/tune-baseline.json` | Empty. |
| Diff of the seeded loops in `test/company-roster.test.ts` and `test/company-roster-interface.test.ts` | No added or removed loop lines. Gold and pack fixtures outside those loops were updated. |
| Smoke, `combat-space` seed 75, `lairs` seed 14, `deployment` | Not in the diff. They pass inside the full suite. |

The six regression hashes stay skipped. Behaviour did change (potion healing,
the combat sub-seed, and starting gold), and the issue forbids re-recording
them. The guard while they are skipped is the tests named under "Survive
unchanged": no diff, and they pass.

Acceptance coverage:

| Criterion | Coverage and result |
| --- | --- |
| Catalogue is configuration: four defaults, a tier can be dropped or changed | `test/game-config.test.ts`: "offers the four healing potion tiers and lets a tier be dropped or repriced"; "rejects a potion tier with a bad formula, a negative price, an unknown field, or a missing field". Pass. |
| Pack is a map through the company, combat options, combat outcome, merger, game view and UI | `test/company-roster.test.ts`: "brings the donor potions into the host pack". `test/combat-potions.test.ts` asserts `potionsDrunk` per tier. `test/town-services.test.ts`: "buys only basic potions…" asserts view key order `basic`, then `greater`. The party card joins that ordered map in `src/ui/main.ts` (`potionSupply`). Pass. |
| Smallest covering tier, otherwise the strongest; a fallen hero counts `maxHp` | `test/potions.test.ts`: "drinks the smallest tier…", "drinks the strongest tier…", "counts a fallen hero as missing their whole maximum…". Pass. |
| Rolled formula in combat and at the rest; the log shows the potion and the roll | `test/combat-potions.test.ts` scripted 3 and 3, so 2d4+2 heals 8, and the drink line names the formula. `test/expedition.test.ts`: "gives a potion to a still-Bloodied hero who keeps Hit Dice after the quota" expects `drinks a basic healing potion (2d4+2: 8)`. Pass. |
| Combat sub-seed after placement; rest potions from the rest seed after the Hit Dice | `test/combat-potions.test.ts`: seeds 1 and 2 still reach hp 18 with a scripted 8, so the sub-seed is after placement. "leaves the engine log unchanged when two formulas heal the same total with different numbers of dice" fails if the drink uses the engine stream. "advances the world stream by one combat seed whether or not potions are rolled" goes through `Game.step` and fails if the drink uses the world generator. `test/expedition.test.ts`: "rolls rest potions from that same seed, with no further world draw"; the scripted Hit Die faces are consumed before the potion faces. Pass. |
| Buy basic only, one per living hero, 50 gp, resurrection reserve, nothing from a ruined apothecary | `test/town-services.test.ts`: the 50 gp purchase, the greater-potion cap, and "leaves a new level-1 purse of 50 gp untouched, because one resurrection costs 190 gp". Ruined-apothecary cases pay nothing. `test/coin-movements.test.ts` records the `service` movement. Pass. |
| Old keys and `potionCost` / `potionHeal` are gone; the keys are unknown | `test/game-config.test.ts`: "rejects the removed potion price and heal keys as unknown". The functions are gone from `src/adventurers/hero.ts`. Pass. |
| `heroes.startingGoldPerLevel` defaults to 50 | `test/game-config.test.ts` round-trips the default. `test/company-roster.test.ts`: "a level-4 company starts with 200 gp". Pass. |
| Six regression hash tests stay skipped and are not re-recorded | Those files are not in the diff. The full suite reports 6 skipped. Pass. |
| The suite is green | `pnpm typecheck` and `pnpm test` pass. |

## Standards

Hard violations found in the pre-commit diff, then fixed:

- `docs/CONFIGURATION.md` had `resurrectedHpFraction`, `resurrectedHpMinimum` and `skillAdvantageTiebreak` in the potions table. They are `heroes` fields. They are back in the heroes table.
- `scripts/assault.ts` rolled a second literal `2d4+2`. It now asks the catalogue for the basic tier's formula, and uses `isBloodied` and `potionCount`. The private generator stays, so combat seeds do not move.
- `src/town/services.ts` stored the living count in `held` when the basic tier was missing. It now returns without buying. The shop line uses the tier's name.

Judgement calls left as they are:

- Combat and the Short rest both call `choosePotion`, `rollDice`, `takePotion` and `potionDrinkText`. The two sites differ (fallen companion, engine `heal` versus `healHero`, the drunk tally), so they were not folded into one function.
- `src/ui/main.ts` joins the view map instead of calling `describePack`. `docs/ARCHITECTURE.md` says a renderer does not import domain modules, and the view is already in catalogue order. The architecture sentence that said the module describes the party card was corrected.

## Spec

(a) The review said the combat sub-seed was only half-guarded, because the world-stream test would still pass if the drink used the engine, and the engine-log tests inject `dice`. The engine case is the adapter test "leaves the engine log unchanged when two formulas heal the same total with different numbers of dice": `2d4+2` scripted as 3 and 3, and `1d4+4` scripted as 4, both heal 8, and the engine lines match. Using the engine's stream for those two formulas would diverge. The world case is "advances the world stream by one combat seed whether or not potions are rolled", through `Game.step`. Seeds 1 and 2 with a scripted 8 still end at hp 18, so the `seed()` draw is after placement.

(b) No scope creep. Tune scripts and the surviving guard tests are untouched.

(c) The misplaced heroes rows in the potions table were the one wrong implementation. Fixed before commit.

Review summary: Standards had three hard violations, all fixed, and two judgement calls left in place. Spec had one partial-guard reading, answered by the two public-interface tests, and one wrong document table, fixed.

Questions: none.

Bugs: `docs/ARCHITECTURE-INTERFACES.md` still lists `potionCost` and `potionHeal` on `hero.ts`. The issue's document list does not include that file, so it was left unchanged.

Not done: the party card was not exercised in a browser. This session has no browser tools. The label is `potionSupply` over the ordered view map; the view order is tested. No push; the orchestrator pushes.
