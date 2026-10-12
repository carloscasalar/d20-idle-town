# Turn 12 — issue 13: one drinking decision for the Company

Read `.claude/skills/implement-prd/RULES.md` before anything else. Those rules apply to this turn.

Use $mattpocock-skills:implement. Use it to implement the issue `.scratch/potions-and-short-rest/issues/13-one-drinking-decision-for-the-company.md`. The issue is the contract: build what it describes and meet every acceptance criterion. Its parent PRD is `.scratch/potions-and-short-rest/PRD.md`, and the decision it follows is `docs/adr/0001-actor-decisions-live-with-the-actor.md`.

What the issue could not know:

- No behaviour of the game changes. The regression hash tests, their snapshots and `scripts/tune-baseline.json` must not move; if they would, stop and report it, never re-record.
- What the fight does today, which the plan must reproduce exactly (`runCombat` in `src/combat/battlecast.ts`):
  - the conscious companion is found once, before anyone drinks in that round: the first fighter in company order who is alive, above 0 hit points and not unconscious. It does not change as the round's drinks are applied, and one companion may give several potions;
  - a dead adventurer is not a candidate. A Bloodied adventurer above 0 hit points who is unconscious does not drink and is not given a potion. An adventurer at 0 or fewer hit points is fallen and is given the potion;
  - when nobody is conscious, or the pack has nothing left, the round's drinking stops.
  The description of an adventurer given to the decision must carry enough to tell these cases apart (hit points, maximum, conscious), and nothing of the engine.
- `scripts/assault.ts` imports `takePotion` and has its own potion loop until issue 14, which is the next turn. `pnpm typecheck` covers `scripts/`. In this turn change that script only as far as it needs to typecheck (for example by calling the new operation of `src/adventurers/potions.ts`); its figures need not stay the same.
- Call sites of `choosePotion`, `takePotion` and `potionDrinkText` in the tests may change shape where the export they use moves or goes; expected values stay the same. Name every test moved, removed or edited in the report, as the issue asks.
- The reviewer will try these mutations, one at a time; make a test with exact expected values fail for each:
  1. The decision writes the pack it was given instead of a copy.
  2. A fallen adventurer's missing hit points are `maxHp - hp` instead of the whole maximum.
  3. The strongest covering tier is chosen instead of the smallest.
  4. The last conscious companion gives the potion instead of the first.
  5. A fallen adventurer still drinks when nobody is conscious.
  6. The plan does not run the pack down (two Bloodied adventurers, one potion, both drink).
  7. The decision ignores the Potion sharing policy and always uses company order.
  8. In the fight, the plan's drink is not taken from the fight's copy of the pack, or not counted in `potionsDrunk`.
  9. At the Short rest, the drink is not taken from the Company's pack.
  10. The effect of a drink rolls from a generator other than the one it is given.
- Documents: `docs/ARCHITECTURE.md`, `docs/ARCHITECTURE-INTERFACES.md` and `docs/ARCHITECTURE-IMPROVEMENTS.md`, as the issue's criterion says. `docs/ARCHITECTURE-INTERFACES.md` must match the exports of `src/adventurers/potions.ts` and `src/adventurers/policies.ts` after the change. Add new terms to `CONTEXT.md` only if the issue introduces one.
- Put your report in `.scratch/potions-and-short-rest/run/turns/12-13-one-drinking-decision-report.md` as well as in your final message.

Done means: `pnpm typecheck` and `pnpm test` pass, and your report follows rule 9.
