A hidden Bounty's Short rest now paces Hit Dice over `kinds.assault.encounters[1]`. That range is the total number of encounters, the boss included, which is what `generateAssault` already builds. The extra `+ 1` is gone from `encountersAhead` in `src/sim/expedition.ts`. The floor at encounters already revealed is unchanged. `generateAssault` and every default are unchanged.

The field description in `src/sim/kind-config.ts` and `docs/CONFIGURATION.md` now says the range is the total number of encounters, the boss included. The `encounterCountSource` paragraph in `docs/ARCHITECTURE.md` no longer says "Bounty upper bound plus the boss". The test row for `test/expedition.test.ts` in that file names the same rule. `docs/ARCHITECTURE-INTERFACES.md` does not name this test or this rule, so it is unchanged. Line 111 of `.scratch/potions-and-short-rest/PRD.md` now says `encounters[1]`, with a note that issue 15 changed it. Issue 03 is untouched.

Check results:

| Command or check | Result |
| --- | --- |
| `pnpm typecheck` | Pass. |
| `pnpm test` | Pass: 38 files, 786 tests. |
| The three Bounty pacing tests before the fix | Fail. The renamed test received 4 where it expects 3. The seed sweep received a pacing bound of 8 where it expects 7. The Short rest logged one Hit Die roll where it expects two. |
| Same tests with `encounters[0]` in place of `encounters[1]` | Fail. The renamed test received 1 where it expects 3. The seed sweep received 4 where it expects 7. The Short rest logged three Hit Die rolls where it expects two. |
| Same tests with the floor at revealed encounters removed | Fail. The renamed test's second expectation received 3 where it expects 6. The other two still passed, because those Bounties had revealed only the first encounter. |

The regression guard did not change. Default `kinds.assault.revealsCount` is true, so a posted Bounty already paces over its exact count, and removing `+ 1` does not move a default world. `test/simulation-regression.test.ts`, `test/job-intel-regression.test.ts`, their snapshots, and `scripts/tune-baseline.json` are not in the diff.

Acceptance coverage:

| Criterion | Test |
| --- | --- |
| For a Bounty whose count is not known, with `kinds.assault.encounters` set to `[2, 4]` and one encounter completed, the encounters ahead are 3 | `uses the configured Bounty total when unknown, never less than revealed` in `test/expedition.test.ts`. First expectation is 3. The second is still 6, with seven encounters revealed and one completed. |
| A test generates Bounties over many seeds with a non-default range and shows that every one has a number of encounters inside the range, both ends reached, the last being the boss; and that the pacing bound for that configuration equals the longest of them | `keeps generated Bounties inside the configured range, boss last, and paces over that longest total`. Seeds 1 through 40, range `[4, 7]`. Minimum length 4, maximum 7, every length inside that range, and the last encounter's first monster is the lair's boss. With the count hidden, encounters ahead at the start are 7. It uses `LONG_SIMULATION_TIMEOUT_MS` from `test/helpers/simulation.ts`. |
| A test through the game with `kinds.assault.revealsCount: false` shows a Short rest on a Bounty pacing over `encounters[1]` | `spends two Hit Dice at a Short rest on a Bounty whose count is hidden`. One `game.step()` on a level-5 company of one, one hit point, one encounter completed, count hidden, default range `[3, 5]`. The Short rest logs two Hit Die rolls and the hero's spent pool is `[2]`. Pacing over `encounters[1] + 1` logs one roll. |
| The descriptions in `src/sim/kind-config.ts`, `docs/CONFIGURATION.md` and `docs/ARCHITECTURE.md` and line 111 of the PRD agree with the generator | Those four texts now say the configured total already includes the boss. The PRD notes that issue 15 made the change. |
| The regression hash tests pass without re-recording, and `scripts/tune-baseline.json` is unchanged | `pnpm test` passed, including both hash files. Those files and `scripts/tune-baseline.json` have no diff. |
| `pnpm typecheck` and `pnpm test` are green | Both pass. |

Questions: none.

Bugs: none.

Not done: nothing.
