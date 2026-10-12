Issue 03 is implemented in commit `04d8b91` on `feature/potions-healing`.
Starting HEAD was `02542b1`, the documentation-only turn brief immediately after
the supplied `4cead1d`. Only issue 03 work was committed.

Hurt companies now take a separate logged Short rest hour. Living heroes spend
paced Hit Dice from one local seeded stream; Expedition checks retreat using
the resulting HP, then shares the existing flat-healing potions in company
order if the company continues. Unhurt companies skip the rest. Long rests
restore living HP and spent dice regardless of lodging. Core dice parsing and
Assured healing, engine HP-formula parsing, pool lifecycle tests, configuration
removal and the requested documentation are included. Decisions are recorded
under the issue's Comments. The minimum-of-1 healing rule was confirmed in
SRD 5.2.1, printed page 187, Short Rest.

Check results:

| Command or check | Result |
| --- | --- |
| `pnpm test test/dice.test.ts` | Initial red: missing module. Then green: 14 tests. |
| `pnpm test test/hit-dice.test.ts` | Initial red: missing module. Then green, including the later combined run: 18 Hit Dice tests. |
| `pnpm test test/dice.test.ts test/hit-dice.test.ts` | 32 passed. |
| `pnpm test test/expedition.test.ts -t 'separate Short rest'` | Red: the old code stayed questing in the combat hour. Then green. |
| `pnpm test test/expedition.test.ts` | 55 passed during incremental work. Expanded coverage passed in the combined run below. |
| `pnpm test test/game-config.test.ts -t 'removed Short rest'` | Red: the old schema accepted the removed key. Then green. |
| `pnpm test test/expedition.test.ts test/game-config.test.ts test/registered-kind.test.ts` | 84 passed. |
| `pnpm typecheck` | Final pass, with repeated passing runs during implementation. An intermediate run caught the old short-rest fixture and a profile fixture; both were migrated before the passing runs. |
| `pnpm test` | Pass: 30 files passed, 2 skipped; 656 tests passed, exactly 6 skipped. Includes unchanged `test/tune.test.ts` and every protected guard test. |
| `pnpm build` | Pass. Vite reports a bundle-size warning for the main chunk (887.55 kB); no build failure. |
| `git diff --check` | Pass. |
| `git diff 4cead1d --` followed by the protected paths | Empty: all named surviving guard tests, issue 02 files and snapshots are unchanged. |
| `rg -n -e rollDice -e withRng src` | Only the game core implementation and its Hit Dice consumer appear; no engine dice import or call. |
| `FROM=1 TO=150 HOURS=1500 pnpm dlx vite-node scripts/combat-sweep.ts` | Running; final result will be recorded before this report is delivered. |
| `pnpm dev --host 127.0.0.1` | Initial sandbox port denial; retry with the required execution permission started Vite successfully on port 5173. |

The six regression hashes were skipped as required because acceptance criteria
1–4 and 7 change the expedition trajectory and random-draw order. Both
parameterized hash suites carry an issue 09 comment. No hash or snapshot was
re-recorded. The active regression guard remains every test named under
“Survive unchanged”; all have no diff and pass. The issue 02 scripts and tuning
test also remain unchanged.

Acceptance coverage:

| Criterion | Coverage and result |
| --- | --- |
| 1. Hurt company takes one logged hour; unhurt company has no rest tick, log or draw | `test/expedition.test.ts`: separate Short rest hour; unhurt normal/costly victories; final hurt victory; log with every roll. Pass. |
| 2. Quota, full-HP stopping, exhausted hero | `test/hit-dice.test.ts`: exact quota examples, pure spending, capped healing, alternative strategy and exhausted/unhurt/dead heroes. `test/expedition.test.ts`: known and unknown Contract/Bounty encounter bounds. Pass. |
| 3. Retreat uses post-dice HP and preserves potions | `test/expedition.test.ts`: dice rescue the company from retreat; still-low HP causes retreat with all potions; original-line loss check after rest; exact 34/35/36% threshold. Pass. |
| 4. Continuing Bloodied heroes drink one old potion in company order | `test/expedition.test.ts`: four supply cases, including a hero with exhausted dice and the half-HP boundary. Exact HP and remaining pack assertions. Pass. |
| 5. Long rest resets spent dice in every lodging case | `test/expedition.test.ts`: paid rooms, insufficient gold and ruined tavern; no early recovery, full HP and zero spent dice after eight hours for living heroes. Pass. |
| 6. Level-up, death and resurrection preserve spent dice | `test/hit-dice.test.ts`: level-up adds exactly one remaining die; death and resurrection retain the spent pool. Pass. |
| 7. Exactly one world seed per rest, none without it | `test/expedition.test.ts`: mirror-world streams across company sizes, levels and exhausted pools; one shared scripted local source across heroes; fight/rest/fight ordering; unhurt and final victories. Pass. |
| 8. No engine `rollDice` call | `test/dice.test.ts`: explicit scripted/seeded source. Source import/call check above confirms the structural ban. Pass. |
| 9. Removed key rejected as unknown | `test/game-config.test.ts`: exact unknown-field error for `expedition.shortRestHealFraction`. Pass. |
| 10. Six skipped hashes, issue 09 comments, no re-record | `test/simulation-regression.test.ts`, `test/job-intel-regression.test.ts`: exactly six skips in the full suite; protected snapshot/hash diff empty. Pass. |
| 11. Green suite | `pnpm typecheck` and `pnpm test` pass. |

Standards review: no findings. Spec review: no findings. The code-review skill's
two agents reviewed `git diff 4cead1d...HEAD` independently against the repository
standards and the issue/PRD. Their work was read-only.

Questions: none; discretionary choices are recorded under Comments. Bugs found:
none. `RTK.md`, referenced by `AGENTS.md`, could not be found; agent/tool
configuration was left alone.

Not done: the interactive browser smoke check (30 steps, four tabs, another
300 hours, console inspection and difficulty ×1.5) could not be performed.
The preview tool is unavailable, there are no connected browsers, opening
Chrome reported “Browser is not available”, and the computer-use tool denied
access to Dia. The server and production build succeeded; the headless smoke
tests passed unchanged. No push was performed; the orchestrator owns pushing.
