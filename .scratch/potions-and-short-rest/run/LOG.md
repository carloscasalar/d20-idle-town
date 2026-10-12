# Run log: potions and short rest

Branch `feature/potions-healing`. Run started 2026-10-12 at checkpoint `4774e43` (typecheck clean, 579 tests green).

## Turns

| Turn | Issue | Kind | Implementer | Commit | Verdict |
| --- | --- | --- | --- | --- | --- |
| 01 | 02 measuring tool and baseline | feature | Codex | `2d1ecd2` | FAIL: verdict given for seeds other than the baseline's |
| 01 fix 1 | 02 | correction | Codex (same session) | `fd30c23` | PASS (orchestrator re-check); issue done |
| 02 | 03 Hit Dice at the Short rest | feature | Codex (LIMIT after commit, back 05:28) | `04d8b91` | FAIL: three acceptance points without a test; no wrong behaviour; long sweep clean |
| 02 fix 1 | 03 | tests only | Cursor (new session) | `d970272` | PASS (orchestrator mutation re-check); issue done |
| 03 | 04 tiered potions with real dice | feature | Cursor | `2b1c3fc` | FAIL: wiring unproven by tests, an impossible die face, stale interfaces doc, unforced change in `scripts/assault.ts`; long sweep clean |
| 03 fix 1 | 04 | correction | Cursor (same session) | `b9e3260` | FAIL (opencode): one mutation of six survives, and the report claimed it failed |
| 03 fix 2 | 04 | tests only | Cursor (same session) | `59530a0` | PASS (orchestrator mutation re-check); issue done |
| 04 | 05 buying policy | feature | Cursor | `e80c126` | FAIL: two mutations survive (`floor` in the need, step-down strength filter); behaviour correct; long sweep clean |
| 04 fix 1 | 05 | tests only | Cursor (same session) | `3952642` | PASS (orchestrator mutation re-check); issue done |
| 05 | 06 Potion sharing policy | feature | Cursor | `1024ac1` | FAIL: a test weakened instead of moving the draw, a default for configuration, two unproven wirings, stale interfaces doc; long sweep clean |
| 05 fix 1 | 06 | correction | Cursor (same session) | `cd06396` | PASS (orchestrator read and mutation re-check); issue done |

## Lessons

- `pnpm exec vite-node` (as written in `docs/agents/implementation.md`) fails with "Command not found"; `pnpm dlx vite-node` works. Prompts of this run use `pnpm dlx`.
- The baseline comparison of `scripts/tune.ts` gives a verdict only for seeds 1..80 at 600 ticks; the long-run apothecary figures are in `scripts/tune-baseline.json` but are not compared by the script.
- A test helper that re-declares a production factory hides the production wiring: ask for one test through the game's own interface.
- An implementer's "this mutation fails" can describe a different mutation than the one asked: give the exact line to change, and re-run it.
- A test that pins one small dice total can pass by coincidence on another generator: pin several rolls.
- When a new draw breaks a seeded test, ask the implementer to try other fixed places for the draw before it edits the test; the reviewer found one in minutes.
- `docs/ARCHITECTURE-INTERFACES.md` goes stale on every issue that changes a signature: name it in each prompt.
