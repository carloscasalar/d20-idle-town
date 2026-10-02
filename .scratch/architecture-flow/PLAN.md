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
| 04b | Board: configuration, behaviour per kind of work by data, and three interface leaks | refactor | in-progress | Codex |
| 05 | Coin transfers: characterisation tests for every gold movement | tests | todo | |
| 06 | Coin transfers: one module for gold movements | refactor | todo | |
| 07 | Company roster: characterisation tests (arrivals, recruiting, merging, retirement) | tests | todo | |
| 08 | Company roster: deepen the module, remove the `tryRetire` callback | refactor | todo | |
| 09 | Job intel: characterisation tests (investigation, divination, reading the road) | tests | todo | |
| 10 | Job intel: deepen the module, remove the string-keyed `investigations` | refactor | todo | |

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
