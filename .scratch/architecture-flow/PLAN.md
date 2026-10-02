# Architecture flow: plan

Branch: `codex/codebase-architecture-improvement`. Flow: `docs/agents/orchestration-flow.md`.

Status values: `todo`, `in-progress`, `done`, `blocked`.

| # | Task | Kind | Status | Commits |
| --- | --- | --- | --- | --- |
| 00 | Baseline smoke check | verify | done | see smoke/00-baseline.md (PASS at b19a8e0) |
| 01 | Adventurers drink potions; name the short rest | bug fix | in-progress | |
| 02 | A ruined employer's holdings keep pointing at failed contracts | bug fix | todo | |
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
