# Architecture flow: plan

Branch: `codex/codebase-architecture-improvement`. Flow: `docs/agents/orchestration-flow.md`.

Status values: `todo`, `in-progress`, `done`, `blocked`.

| # | Task | Kind | Status | Commits |
| --- | --- | --- | --- | --- |
| 00 | Baseline smoke check | verify | done | see smoke/00-baseline.md (PASS at b19a8e0) |
| 01 | Adventurers drink potions; name the short rest | bug fix | done | 89a2062, 8d88993 (1 correction round) |
| 02 | A ruined employer's holdings keep pointing at failed contracts | bug fix | in-progress | |
| 03 | Board: characterisation tests for the contract lifecycle | tests | todo | |
| 04 | Board: deepen the contract lifecycle module | refactor | todo | |
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
