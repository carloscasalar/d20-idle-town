# Architecture flow: plan

Branch: `codex/codebase-architecture-improvement`. Flow: `docs/agents/orchestration-flow.md`.

Status values: `todo`, `in-progress`, `done`, `blocked`.

| # | Task | Kind | Status | Commits |
| --- | --- | --- | --- | --- |
| 00 | Baseline smoke check | verify | done | see smoke/00-baseline.md (PASS at b19a8e0) |
| 01 | Adventurers drink potions; name the short rest | bug fix | done | 89a2062, 8d88993 (1 correction round) |
| 02 | Dangling contract references (ruined employer, cleared lair, wiped company) | bug fix | done | 7eb395b, e4f8ea6 (no correction rounds) |
| 03 | Board: characterisation tests for the contract lifecycle, plus three bugs they exposed | tests + bug fix | done | 6dd66d2, 762fc66, 5870771 (1 correction round) |
| 03c | The smoke test times out in CI | fix | done | f8f00a0 (Cursor; reviewed by the orchestrator, 3-file diff) |
| 04 | Board: the Board owns the lifecycle and is the single writer of the references | refactor | done | f7e9e4a (Cursor; passed review, two small corrections folded into 04b) |
| 04b | Board: configuration, behaviour per kind of work by data, and three interface leaks | refactor | done | 091a2c8, 37cb0ca, db154f6 (Codex; 1 correction round) |
| 05 | Coin transfers: audit and characterisation tests, plus two counter bugs they exposed | tests + bug fix | done | f78a95f, e2ad6f4, 3e02d62 (Codex, then Cursor; 1 correction round) |
| 06 | Coin transfers: one module moves gold, with reasons as data | refactor | done | 0288d2a, f11e248 (bug fix), a7ed2a9, 991b039 (Cursor; 2 correction rounds) |
| 06c | A fight crashes when a Gargantuan monster does not fit (seed 75) | bug fix | done | b615320 (Cursor; reviewed by Sonnet, no corrections) |
| 07 | Company roster: characterisation tests (arrivals, recruiting, merging, retirement) | tests | done | beb00ac (Cursor), 1e6902c (Codex correction; 13 targeted mutations caught, not re-reviewed) |
| 07b | The long simulation tests time out on a slow machine | test fix | done | 1d5e6ef (Codex; per-tick checking cut from about 5 s to under 2 s a run) |
| 07c | Roster bugs found by turn 07 (band of five arrives as four; ruined temple still raises the dead; retirement does not pick the most seasoned veteran) | bug fix | in-progress | Codex |
| 08 | Company roster: deepen the module, remove the `tryRetire` callback | refactor | todo | |
| 09 | Job intel: characterisation tests (investigation, divination, reading the road) | tests | todo | |
| 10 | Job intel: deepen the module, remove the string-keyed `investigations`; take `learnIntel`/`revealAll` off the Board | refactor | todo | |
| 11 | Configuration: `GameConfig` in sections per module, plain data, ready to load from YAML; remaining `'assault'` branches in `Game` and the expedition; a coin object built once with its statistics and reason table, named effect fields instead of five positional booleans | refactor | todo | |

Not planned: typed domain events (candidate 6). It waits for a second renderer.

Bugs found during a task get a new row inserted before the task continues.

## Log

- Turn 01: review failed once. Unconscious heroes at 0 hp were drinking potions (61 of 210 in the reviewer's probe), and the short-rest test did not prove the Bloodied check. Fixed in one correction; the second review passed. World state is identical between the two commits; only narration changed.
- Wrapper: `codex exec resume` rejects `--approve-for-me` after the subcommand; options must come before `resume`.
- Lesson: the orchestrator's own edits must not share a commit with the implementer's turn, or the reviewer flags them as out of scope.
- Turn 02: passed review first time (7eb395b), snapshot unchanged. Codex's audit found two more dangling references (cleared Lair keeps its Bounty; wiped company keeps its contract); the reviewer confirmed both and added latent ones for the Board task: unreachable early returns in `settleQuest`/`settleAssault`/`expireQuests`, and pruning of old contracts while something may still reference them. Part 2 fixes the two confirmed ones.
- Turn 02 part 2: passed review first time (e4f8ea6). The reviewer's per-tick diff confirmed the snapshot change is only the cleared references. Open rule question recorded in `.scratch/contract-lifecycle/issues/01-ruined-employer-still-pays.md`.
- Turn 03: the reviewer ran 205 mutations against the 134 new tests; 15 survived (5 real gaps, 5 single-seed ranges, 5 acceptable). One correction closed the ten that mattered. Codex reported five suspected bugs instead of pinning them; three were confirmed and fixed (negative looting loss, level-21 Contracts, a cleared Lair growing), one was the orchestrator's wording error, one became issue `contract-lifecycle/02`. None of the three occurs in the snapshot seeds, so the snapshot did not change.
- Lesson: asking the reviewer for a mutation check is what made a "tests only" turn reviewable. Asking the implementer to report suspected bugs rather than pin them found three real ones.
- Lesson: review two small related commits in one reviewer pass; it saved a round.
- Turn 04: Codex hit its usage limit while still reading the code (session 01a0fd9d-5021-7363-b7b9-eb75e237e0f6, no file changed). The message said to try again at 10:04 PM on 2026-10-02. Flow stopped here by rule. To continue: start turn 04 again in a new session with the same prompt.
- Fallback implementer added: Cursor with `grok-4.7-high` (`scripts/agents/cursor-turn.sh`). Turn 03c (CI timeout) goes first, then turn 04 restarts on Cursor.
- Turn 03c: Cursor found the 400-tick run is about 16% slower since potions are drunk in combat (more heroes standing, slightly more rounds), all inside the engine's `runRound`. One project-wide 20 s timeout in `vitest.config.ts` replaces the per-test numbers. A diff this small was reviewed by the orchestrator directly instead of spending a reviewer subagent.
- Turn 04: two Cursor runs were killed by the orchestrator's 10-minute background limit before any file changed (a large refactor spends that long reading). Fixed with `scripts/agents/detach.sh` (the turn runs in its own session; a monitor waits for a marker file) and by logging Cursor's event stream. The resumed turn took about 18 minutes and passed review: behaviour preserved line for line, single writer confirmed, the invariant helper kills a seeded mutation. Leaks the reviewer named go to 04b: `releaseCompany`, shallow read-only views, `take` writing expedition state, an impossible expiry case kept alive by a test.
- Lesson: print and record the session id before a turn starts; log the event stream, not only the final message.
- Turn 04b: failed review narrowly once (kind entries could break the invariant; the invariant helper had been weakened; posting re-looked-up objects). One correction passed. Reviewer notes carried forward to task 11: `DEFAULT_CONFIG` restates Board defaults (`travelTicks`, `difficultyScale`, `contractDays` vs `contractOpenTicks`), and overriding `renownCap`/`lairStrengthCap` affects only the Board.
- Lesson: the orchestrator's staging pattern missed `scripts/`; stage by `git status`, not by a fixed list of directories.
- Turn 05: conservation holds on all 1,200 seeded ticks; the per-holder rule exposed two bugs (a wiped purse and a merge were not recorded in `earned`/`spent`), fixed in e2ad6f4. The reviewer's 76 mutations left six boundary survivors; the tests-only correction was cut off by Codex's usage limit (retry after 4:26 AM on 2026-10-03) with partial edits in the working tree, and was handed to Cursor in a new session.
- Lesson: a usage limit can land mid-turn. The handover prompt points the next implementer at the task file and at `git diff`, and tells it to verify every item rather than trust the partial work.
- Turn 05 correction: Codex had in fact finished all nine items before its limit cut it off; Cursor verified each against the payment code and kept the diff unchanged (3e02d62).
- Turn 06: the reviewer's 1,500-hour sweep over 150 seeds found that a guild in debt posts a Bounty with a negative reward; the coin module's new refusal turned that old bug into a crash on five seeds. Fixed first (f11e248: Bounties use the Contract posting threshold), then two corrections typed the gold statistics and froze the reason table. Fixture edits were allowed only to move where an expected value is read from.
- Lesson: a long random sweep (150 seeds × 1,500 hours) found what the three 400-hour regression seeds never reach. Worth running once per refactor.
- The same sweep found an older crash (seed 75: a Gargantuan Roc does not fit the red team's zone). Bug-fix turn 06c before the roster work.
- Turn 06c: the engine's placement scan gave up although the field had room; the adapter now tries every in-bounds origin only after the engine throws, so fights that placed before are unchanged. A 150-seed, 1,500-hour sweep runs clean. First review on Sonnet instead of the default model: it verified the same depth of claims (fallback reached only on the placement error, no random draw, tests fail without the fix) at a lower cost. One non-blocking weakness noted: the focused test asserts only the sixth Roc's name.
- Lesson: a Sonnet reviewer is enough for a contained bug fix; keep the default model for refactor reviews where design judgement matters.
- Turn 07: Cursor took about an hour. It reported five suspected bugs. Three are bugs (a band of five is built as four by `rollClasses`; a ruined temple is still paid to raise the dead, unlike every other service; retirement takes the first level-8 veteran, not the most seasoned as the code's own comment says) and go to turn 07c. Two are rule questions for an issue (the temple raises the fallen in company order, not the cheapest first; a partial merge moves the whole purse, potions and stash to the host, leaving those who stay behind with nothing).
- The suite now times out on this machine: a 400-hour run takes 4-5 s at every commit tonight (about 1 s earlier), so the machine is slower, not the code. Per-tick checkers make the long tests several times slower than the simulation. Turn 07b.
- Turn 07b: the Cursor run stalled overnight (the machine slept), then died with exit 143 while reconnecting for the fourth time; no file had changed. Codex's limit had reset by then, so the turn restarted on Codex in a new session.
- Turn 07 review (Sonnet): 86 mutations, 67 caught; seven real gaps, correction prompt queued until 07b ends (one implementer in the tree at a time).
- Incident: the reviewer ran `pkill -f vitest` to clear its own hung mutation run, which also matched the Cursor 07b process (its prompt text contains "vitest"). That, not only the reconnects, is what killed 07b with exit 143. Rule added to the flow: reviewers stop only processes they started, by id.
- Turn 07 correction: not sent to a reviewer again. It was a list of seven named mutations, and Codex reported checking 13 targeted mutations in a temporary copy; the one source change is a single export. Saving a review where the correction is a closed checklist.
