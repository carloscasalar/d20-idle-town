# Run log: potions and short rest

Branch `feature/potions-healing`. Run started 2026-10-12 at checkpoint `4774e43` (typecheck clean, 579 tests green).

## Turns

| Turn | Issue | Kind | Implementer | Commit | Verdict |
| --- | --- | --- | --- | --- | --- |
| 01 | 02 measuring tool and baseline | feature | Codex | `2d1ecd2` | FAIL: verdict given for seeds other than the baseline's |
| 01 fix 1 | 02 | correction | Codex (same session) | `fd30c23` | PASS (orchestrator re-check); issue done |
| 02 | 03 Hit Dice at the Short rest | feature | Codex (LIMIT after commit, back 05:28) | `04d8b91` | FAIL: three acceptance points without a test; no wrong behaviour; long sweep clean |
| 02 fix 1 | 03 | tests only | Cursor (new session) | `d970272` | PASS (orchestrator mutation re-check); issue done |

## Lessons

- `pnpm exec vite-node` (as written in `docs/agents/implementation.md`) fails with "Command not found"; `pnpm dlx vite-node` works. Prompts of this run use `pnpm dlx`.
- The baseline comparison of `scripts/tune.ts` gives a verdict only for seeds 1..80 at 600 ticks; the long-run apothecary figures are in `scripts/tune-baseline.json` but are not compared by the script.
- A test helper that re-declares a production factory hides the production wiring: ask for one test through the game's own interface.
