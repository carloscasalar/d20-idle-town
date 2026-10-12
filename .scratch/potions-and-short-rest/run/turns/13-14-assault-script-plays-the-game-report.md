`scripts/assault.ts` now plays each trial in the game. One company and one lair are placed through `Game.forTesting`, and the script steps until that lair is broken, the company is back with the bounty failed, or the company is wiped. The purse is `resurrectionCost(level, heroes) + heroes.startingGoldPerLevel * level` from `src/adventurers/hero.ts`. The pack is left empty for the town to fill, and `services.steps` is left at its default. `roster.maxCompanies` is 1. `world.maxOpenQuests` is 0, with a comment that bounty posting does not read that limit. A trial that has not taken the bounty after 1,000 hours throws; so does one whose expedition has not ended, or one that another company enters. The last fight is read from the combat event `Encounter n/n`. Cleared, wiped, and the failed return are read from `Game.view()` (`lairsCleared`, `partiesWiped`, `questsFailed`, `heroesDied`).

`scripts/calibrate.ts` takes `DEFAULT_COMBAT_CONFIG`, `DEFAULT_HERO_ECONOMY`, and `DEFAULT_POTION_CONFIG` from the modules that define them. `README.md` and the scripts table in `docs/ARCHITECTURE.md` describe the measurement as one company against one lair's bounty.

Check results:

| Command or check | Result |
| --- | --- |
| `pnpm typecheck` | Pass. |
| `pnpm test` | Pass: 38 files, 784 tests. |
| `TRIALS=5 pnpm dlx vite-node scripts/assault.ts` | Pass. Six lines, below. Two runs with that command (default `SEED` 7) printed the same lines. |
| `TRIALS=40 pnpm dlx vite-node scripts/assault.ts` | Pass. Six lines, below. Default `SEED` 7 and `SCALE` 1.25. |
| `pnpm dlx vite-node scripts/calibrate.ts` | Pass. Output matches `.scratch/potions-and-short-rest/run/measurements/calibrate-before.txt`. |
| Search for `test/` in the imports of `scripts/` | Nothing. |

The regression guard did not change. No file under `src/` or `test/` was edited, and the hash tests passed without re-recording.

`TRIALS=5` (both runs):

```
lair L5 vs party L5: cleared 40%  reached boss 60%  deaths/attempt 2.20
lair L5 vs party L6: cleared 80%  reached boss 80%  deaths/attempt 0.40
lair L6 vs party L6: cleared 20%  reached boss 40%  deaths/attempt 2.00
lair L6 vs party L7: cleared 20%  reached boss 60%  deaths/attempt 2.60
lair L8 vs party L8: cleared 60%  reached boss 60%  deaths/attempt 0.80
lair L8 vs party L9: cleared 40%  reached boss 100%  deaths/attempt 2.40
```

`TRIALS=40` before, from `.scratch/potions-and-short-rest/run/measurements/assault-before-trials-40.txt`:

```
lair L5 vs party L5: cleared 35%  reached boss 60%  deaths/attempt 2.20
lair L5 vs party L6: cleared 48%  reached boss 63%  deaths/attempt 1.55
lair L6 vs party L6: cleared 40%  reached boss 60%  deaths/attempt 1.88
lair L6 vs party L7: cleared 40%  reached boss 75%  deaths/attempt 1.95
lair L8 vs party L8: cleared 20%  reached boss 30%  deaths/attempt 2.33
lair L8 vs party L9: cleared 25%  reached boss 40%  deaths/attempt 2.27
```

`TRIALS=40` after:

```
lair L5 vs party L5: cleared 50%  reached boss 55%  deaths/attempt 1.73
lair L5 vs party L6: cleared 48%  reached boss 70%  deaths/attempt 1.77
lair L6 vs party L6: cleared 33%  reached boss 60%  deaths/attempt 2.45
lair L6 vs party L7: cleared 35%  reached boss 50%  deaths/attempt 2.13
lair L8 vs party L8: cleared 25%  reached boss 50%  deaths/attempt 2.52
lair L8 vs party L9: cleared 35%  reached boss 60%  deaths/attempt 2.40
```

`scripts/calibrate.ts` with no environment:

```
L1 easy         band 100-170  win 95%  deaths/fight 0.23  tpk 5%  rounds 2.6
L1 intermediate band 200-299  win 90%  deaths/fight 0.38  tpk 3%  rounds 3.5
L1 hard         band 300-350  win 83%  deaths/fight 0.45  tpk 3%  rounds 3.5
L2 easy         band 200-340  win 95%  deaths/fight 0.17  tpk 3%  rounds 3.1
L2 intermediate band 400-599  win 88%  deaths/fight 0.47  tpk 5%  rounds 4.3
L2 hard         band 600-700  win 85%  deaths/fight 0.40  tpk 0%  rounds 4.5
L3 easy         band 300-510  win 98%  deaths/fight 0.05  tpk 0%  rounds 3.0
L3 intermediate band 600-899  win 100%  deaths/fight 0.07  tpk 0%  rounds 4.0
L3 hard         band 900-1250  win 80%  deaths/fight 0.60  tpk 3%  rounds 5.9
L5 easy         band 1000-1700  win 100%  deaths/fight 0.10  tpk 0%  rounds 3.3
L5 intermediate band 2000-2999  win 85%  deaths/fight 0.47  tpk 5%  rounds 5.2
L5 hard         band 3000-3700  win 88%  deaths/fight 0.38  tpk 3%  rounds 6.3
L8 easy         band 2000-3400  win 100%  deaths/fight 0.05  tpk 0%  rounds 5.2
L8 intermediate band 4000-6799  win 83%  deaths/fight 0.53  tpk 5%  rounds 5.1
L8 hard         band 6800-7600  win 60%  deaths/fight 1.02  tpk 5%  rounds 5.2
```

Acceptance coverage:

| Criterion | Coverage and result |
| --- | --- |
| `TRIALS=5 pnpm dlx vite-node scripts/assault.ts` runs to the end and prints six lines with cleared, reached boss and deaths per attempt | The command above. Six lines, each with those three figures. |
| Two runs with the same `SEED` and `TRIALS` print the same lines | The same command run twice, default `SEED` 7 and `TRIALS=5`. The two outputs matched. |
| `scripts/assault.ts` does not import `runCombat`, `healHero`, `takePotion` or `rollDice`, and has no hit point arithmetic | The file imports none of those names and does not read hit points. |
| A search for `test/` in the imports of `scripts/` finds nothing | Search of `scripts/` found no such import. `scripts/calibrate.ts` now uses the combat, hero, and potion module defaults. |
| `scripts/calibrate.ts` prints the same output as before | `pnpm dlx vite-node scripts/calibrate.ts` matches the before file. The output is shown above. |
| The report gives the script's output before and after for `TRIALS=40` | Both blocks are above. The figures moved. |
| `README.md` and the scripts table of `docs/ARCHITECTURE.md` still describe what the script measures | The run comment and the `scripts/assault.ts` row now say one company against one lair's bounty, including cleared, reached the boss, and deaths per attempt in the table. |
| No file under `src/` or `test/` changes; the regression hash tests pass without re-recording | `git diff` of `src/` and `test/` is empty. `pnpm test` passed, including the hash tests. |
| `pnpm typecheck` and `pnpm test` are green | Both pass. |

The issue asks for no tests of the script, so the runs above are the coverage.

Questions: none.

Bugs: none.

Not done: nothing. No push.
