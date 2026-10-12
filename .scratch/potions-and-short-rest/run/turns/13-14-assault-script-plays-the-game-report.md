Issue 14 is not implemented. The game already shows the three endings and whether the last fight was reached, and a trial can keep other companies out. A company placed at the wanted level with the arrival purse never takes the bounty, and the issue does not say what purse to give them. No file under `src/`, `test/`, or `scripts/` was changed.

What a trial can already read, from `Game.forTesting`, `Game.step()`, `Game.view()`, and `Game.onEvent()`:

- The lair is broken when `view.stats.lairsCleared` is 1 and that lair's `status` is `cleared`. The company is then resting.
- The company is back without breaking it when it is still in `view.parties`, `questsFailed` is 1, `partiesWiped` is 0, and the lair is still `active`. Settlement happens on the return, so this is the company in town.
- The company is wiped when `view.stats.partiesWiped` is 1. It leaves `view.parties`. Deaths are `view.stats.heroesDied`.
- The last fight is the boss. Each fight publishes a combat event `Encounter n/m`. Reaching the boss is the event where `n` and `m` are equal. The boss's name can also appear in an earlier fight, so the name is the wrong signal. On one level-5 trial the third of four fights was a lone Mind Flayer and the fourth, the one that wiped the company, was the Mind Flayer with guards.
- Other companies stay out with `roster.maxCompanies: 1` and one company already placed. Over 400 hours that counter `partiesArrived` stayed 0.

`world.maxOpenQuests: 0` is how the stepped trials kept contracts and raids off the board. Bounty posting does not read that limit, so the guild still posts the one lair's bounty. With the default, an hour whose appetite roll fails can send the company out on a contract instead.

The purse, stepped at level 5 with `board.difficultyScale` 1.25:

- Arrival gold is `startingGoldPerLevel * level` from `src/adventurers/hero.ts`, 250 gp. The resurrection gate in `Game` is `resurrectionCost`, 1,150 gp at level 5 (1,590 at 6, 2,710 at 8, 3,390 at 9). For 400 hours the bounty stayed open, the company stayed at "looking at the board", and no fight happened.
- A purse set to exactly that resurrection cost takes the bounty. The apothecary sells nothing, because town purchases keep the resurrection cost back. The same twelve seeds then showed all three endings: lair cleared, returned with the lair still active, and wiped. The pack stayed empty.
- A purse of that cost plus 20,000 gp buys first. On the seed that had cleared with an empty pack, the company bought 11 basic healing potions and the rest of a town kit, then marched, and still cleared. A larger purse can also buy magic items that appear while the appetite roll is still failing. The issue does not name this amount.

Check results:

| Command or check | Result |
| --- | --- |
| `pnpm typecheck` | Pass. |
| `pnpm test` | Pass: 38 files, 784 tests. |
| `TRIALS=5 pnpm dlx vite-node scripts/assault.ts` | Not run. `scripts/assault.ts` is unchanged. |
| Two runs with the same `SEED` and `TRIALS` | Not run. |
| `pnpm dlx vite-node scripts/calibrate.ts` | Not run. The import from `test/helpers/supplied-config` is still there. |

The regression guard did not change. No file under `src/` or `test/` was edited, so the hash tests were not re-recorded.

Acceptance coverage:

| Criterion | Coverage and result |
| --- | --- |
| `TRIALS=5 pnpm dlx vite-node scripts/assault.ts` runs to the end and prints six lines | Not met. The script still runs its own fights. It cannot be pointed at the game until the purse is chosen, because the arrival purse never starts the expedition. |
| Two runs with the same `SEED` and `TRIALS` print the same lines | Not met. No new script run. |
| `scripts/assault.ts` does not import `runCombat`, `healHero`, `takePotion` or `rollDice`, and has no hit point arithmetic | Not met. The file still imports `runCombat` and `healHero`. |
| A search for `test/` in the imports of `scripts/` finds nothing | Not met. `scripts/assault.ts` and `scripts/calibrate.ts` still import `test/helpers/supplied-config`. |
| `scripts/calibrate.ts` prints the same output as before | Not shown. The before output is `.scratch/potions-and-short-rest/run/measurements/calibrate-before.txt`. |
| The report gives the script's output before and after for `TRIALS=40` | Before, from `.scratch/potions-and-short-rest/run/measurements/assault-before-trials-40.txt`: lair L5 vs party L5 cleared 35%, reached boss 60%, deaths/attempt 2.20; L5 vs L6 cleared 48%, 63%, 1.55; L6 vs L6 cleared 40%, 60%, 1.88; L6 vs L7 cleared 40%, 75%, 1.95; L8 vs L8 cleared 20%, 30%, 2.33; L8 vs L9 cleared 25%, 40%, 2.27. After: not run. |
| `README.md` and the scripts table of `docs/ARCHITECTURE.md` still describe what the script measures | Unchanged. Both still say how often a level-matched company clears a lair. |
| No file under `src/` or `test/` changes; the regression hash tests pass without re-recording | Held. The suite passed, including the hash tests, on the unchanged tree. |
| `pnpm typecheck` and `pnpm test` are green | Both pass. |

Questions:

1. What purse does the one company of the trial carry?
   - The arrival purse, `heroes.startingGoldPerLevel` times level. The expedition does not start.
   - Exactly `resurrectionCost` for that level. The company can take the bounty, and the town sells it nothing.
   - Some purse above that cost, so the town restocks potions and the other services before the company marches. The amount has to be named, because it changes what they buy and when they leave.

2. Is `world.maxOpenQuests: 0` the right way to keep the trial on that lair's bounty? Contract and raid posting stop, and the bounty is still posted. The other reading leaves the default, and the company can take a contract.

Bugs: none.

Not done: the assault script, the calibrate import, and the two documents. The purse in question 1 decides whether a trial ever fights. No push.
