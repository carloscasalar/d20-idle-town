Tests only, on top of `04d8b91`. Production code is unchanged. The three new checks passed against that code, so they did not show a defect.

`test/expedition.test.ts` now has three proofs the review asked for:

- `advances the world stream by one seed per Short rest whatever the Hit Dice spent` steps a real `Game`. A level-4 hero with one Hit Die left and the same hero with four dice each take one Short rest. The rest logs show one roll and four rolls. The world generator published by `regressionState()` starts equal and ends equal.
- `gives a potion to a still-Bloodied hero who keeps Hit Dice after the quota` uses a level-2 Fighter and three known encounters, so the quota is one die. A scripted 2 leaves them at 8/30 with `hitDiceSpent` 1, still Bloodied, and they drink. Hit points are 18 and the pack is empty. Both log lines are exact.
- `uses one world seed per fight and one for a separate Short rest hour` scripts `restDice` as 4 then 3. Hit points are `[7, 10, 14, 12]`. The Short rest line is exact. The fight, rest, fight seed order is the same as before.

No other test's expected values changed.

Check results:

| Command or check | Result |
| --- | --- |
| `pnpm typecheck` | Pass (`tsc --noEmit`), after the final test edit. |
| `pnpm exec vitest run test/expedition.test.ts -t "advances the world stream\|keeps Hit Dice after the quota\|uses one world seed per fight"` | Pass: 3 tests. |
| `pnpm test` | Pass: 30 files passed, 2 skipped; 658 tests passed, 6 skipped. |

Each new test was run against the mutation named for it, then the mutation was undone before the final suite:

| Mutation | Failure |
| --- | --- |
| `src/sim/game.ts`: `restDice` set to `() => this.rng` | `advances the world stream…` failed at `expect(oneDie.after).toEqual(fourDice.after)`: `{ s: 483533374641 }` against `{ s: 489028072080 }`. One die and four dice had moved the world generator by different amounts. |
| `src/sim/expedition.ts`: a Bloodied hero drinks only when `hitDiceSpent >= level` | `gives a potion to a still-Bloodied hero…` failed: received `[2, 1, 8]`, expected `[2, 1, 18]`. One die was still unspent, so the potion was skipped and hit points stayed at 8. The other potion tests in `test/expedition.test.ts` still passed. |
| `src/sim/expedition.ts`: applied hit points set to `recovery.hp + 1`, capped at maximum | `uses one world seed per fight…` failed: received `[8, 10, 14, 12]`, expected `[7, 10, 14, 12]`. That 8 still sits inside the old greater-than-1 and at-most-maximum range. |

The regression guard did not change. This turn does not change behaviour, so the six skipped hashes in `test/simulation-regression.test.ts` and `test/job-intel-regression.test.ts` stay skipped for issue 09. No snapshot was re-recorded. The tests named as surviving unchanged were not edited.

Acceptance coverage:

| Criterion | Coverage and result |
| --- | --- |
| 1. Hurt company takes one logged hour; unhurt company has no rest tick, log or draw | `test/expedition.test.ts`: separate Short rest hour; unhurt normal and costly victories; final hurt victory. The rewritten fight/rest test now pins the exact Short rest line. Pass. |
| 2. Quota, full-HP stopping, exhausted hero | `test/hit-dice.test.ts` and the encounter-bound tests in `test/expedition.test.ts`. Pass. Unchanged this turn. |
| 3. Retreat uses post-dice HP and preserves potions | `test/expedition.test.ts`: dice rescue the company; low HP turns back with the pack intact. Pass. Unchanged this turn. |
| 4. Continuing Bloodied heroes drink one old potion in company order, whether or not dice remain | Existing supply cases, plus `gives a potion to a still-Bloodied hero who keeps Hit Dice after the quota`: level 2, one die kept, 8/30, then the potion to 18. Pass. |
| 5. Long rest resets spent dice in every lodging case | `test/expedition.test.ts` homecoming cases. Pass. Unchanged this turn. |
| 6. Level-up, death and resurrection preserve spent dice | `test/hit-dice.test.ts`. Pass. Unchanged this turn. |
| 7. Exactly one world seed per rest, none without it | Expedition mirror streams, plus `advances the world stream by one seed per Short rest whatever the Hit Dice spent` through `Game.step`. Pass. |
| 8. No engine `rollDice` call | `test/dice.test.ts`. Pass. Unchanged this turn. |
| 9. Removed key rejected as unknown | `test/game-config.test.ts`. Pass. Unchanged this turn. |
| 10. Six skipped hashes, issue 09 comments, no re-record | Still skipped. This turn did not edit them. Pass. |
| 11. Green suite | `pnpm typecheck` and `pnpm test` pass. |

Standards review found one hard breach of rule 2: a helper wrote the world generator's state and replayed `seed()`. That helper is gone. The remaining judgement is the `=N` count in the game-wiring test. It does not pin each face. Those faces come from the game's generator, and recomputing them would restate the roll. The count shows that one rest spent one die and the other spent four, so matching generators are not an empty pass. Spec review found the three correction points covered, with no extra behaviour and no production change.

Questions: none. Bugs: none.

Not done: nothing from this turn. The browser smoke check was not repeated; what the game does and shows is unchanged. No push; the orchestrator pushes.
