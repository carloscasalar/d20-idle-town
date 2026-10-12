# Turn 12, correction 1

Your work was committed as `71c5790` and reviewed. The code is behaviour-identical to the checkpoint, every acceptance criterion has evidence, the listed mutations fail and the long sweep is clean. Fix the following; the rules still apply. Since then the branch only gained documents under `.scratch/`.

1. `test/potion-sharing.test.ts`, "applies the plan at a Short rest": it uses company order, which is also what a Company with no policy gets, so `shortRest` can pass `undefined` instead of `p.policies` and all 784 tests still pass. Use `rest('most-hurt')` with the values the Short rest test had at `ff29ca7`: Ann 5, Bev 14, Cid 8 alive, pack `{}`, and the text `The Bold Foxes catch their breath. Cid drinks a basic healing potion (2d4+2: 8). Bev drinks a basic healing potion (2d4+2: 8). 0 potions left.` After the change, passing `undefined` for the policies in `shortRest` must fail this test.
2. `potionSharingOf` is exported from `src/adventurers/policies.ts` and nothing outside that file uses it now. Stop exporting it, and bring `docs/ARCHITECTURE-INTERFACES.md` in line.
3. `holdOneLess` in `src/adventurers/policies.ts` restates the rule of `takePotion` in `src/adventurers/potions.ts` (one less, and the key removed at zero). The pack is owned by `potions.ts`: have the plan run its copy down through one operation of that module instead of a second copy of the rule. Export only what the plan needs.

Allowed test edits: item 1 only, with exactly those expected values. No other test changes; no behaviour changes; snapshots and `scripts/tune-baseline.json` do not move.

Append a "Correction 1" section to `.scratch/potions-and-short-rest/run/turns/12-13-one-drinking-decision-report.md`.

Done means: `pnpm typecheck` and `pnpm test` pass and your report follows rule 9.
