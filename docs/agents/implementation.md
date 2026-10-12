# Implementing a PRD in this repo

Project facts for the `implement-prd` skill (`.claude/skills/implement-prd/`). The skill describes the loop; this file holds what is true only here.

## Checks

Every turn ends with both passing:

```bash
pnpm typecheck
pnpm test
```

Long simulations in the tests share one timeout (`test/helpers/simulation.ts`); a new long test uses it.

## Regression guard

`test/simulation-regression.test.ts` hashes the whole world at every tick of three seeded 400-hour runs (`test/__snapshots__/`), and `test/job-intel-regression.test.ts` does the same with investigation records stripped. A feature issue usually changes them. The issue says how to treat them (re-record once, or skip until a named later issue); when it says nothing, they are re-recorded once in the turn that changes behaviour, and the report names the acceptance criterion that caused it. While an issue keeps the hashes skipped, the tests it lists as surviving unchanged are the guard: no diff, still passing.

Every random draw comes from one seeded generator in a fixed order, so a new draw shifts every later one. An issue that adds dice says where in the order they go.

## Long sweep

The guard covers three seeds. Once per issue that changes the rules of the game, the reviewer runs:

```bash
FROM=1 TO=150 HOURS=1500 pnpm dlx vite-node scripts/combat-sweep.ts
```

It must finish with no crash.

## Balance

`pnpm dlx vite-node scripts/tune.ts` prints deaths, wipes and failures per difficulty scale. An issue that moves difficulty says which baseline to compare with; the tuning values change only when an issue says so.

## Smoke check

- Start: `preview_start` with the `d20-town` configuration in `.claude/launch.json` (`pnpm dev`, port 5173).
- Address: `/?seed=42&difficulty=1.15`. The game starts running on load: pause it at once.
- Steps: 30 single steps; read the four tabs (Parties, Board, Town, Chronicle); then about 300 more hours at the fastest speed and pause; read the tabs and the console again. Check `difficulty=1.5` shows ×1.5.
- When: after every issue that changes what the game does or shows, and before reporting a finished PRD.
- Reports of the first run, with the figures to compare, are in `.scratch/architecture-flow/smoke/`.

## North star

Domain questions are answered by the D&D 5e 2024 rules (SRD 5.2.1). Where the game diverges, or the combat engine (battlecast-engine) cannot model a rule, the current behaviour stays behind a name taken from the D&D term and the divergence is recorded as an issue. New D&D knowledge goes into `CONTEXT.md`.

## The pool

| Order | Implementer | Wrapper | Model | Sentence that loads the `implement` skill |
| --- | --- | --- | --- | --- |
| 1 | Codex | `scripts/agents/codex-turn.sh` | `gpt-6.1-sol`, high effort | Use $mattpocock-skills:implement. |
| 2 | Cursor | `scripts/agents/cursor-turn.sh` | `grok-4.7-high` | Use the project skill "implement" (`.cursor/skills/implement/SKILL.md`). |
| 3 | opencode | `scripts/agents/opencode-turn.sh` | `minimax/MiniMax-M3`, thinking | Read `.cursor/skills/implement/SKILL.md` and work the way it says. |

Take the first implementer that is not at its usage limit; when all three are, stop and report the reset times. Codex has the plugin installed. Cursor and opencode do not, so `.cursor/skills/implement/` holds a copy of that one skill (see `THIRD-PARTY-NOTICES.md`), which Cursor loads as a project skill and opencode reads as a file; refresh the copy when the plugin's version of it changes. The skills it calls, `tdd` and `code-review`, must be installed for the implementer.

Cheap reviewer: opencode through `scripts/agents/opencode-turn.sh` (`minimax/MiniMax-M3`, thinking). A turn that opencode implemented is never cheap-reviewed by opencode: a Sonnet subagent takes that review with the same prompt. Claude agents: `.claude/agents/` (`slice-reviewer`, `smoke-tester`, `prd-answerer`).

## Tracker

Issues and their states: `docs/agents/issue-tracker.md` and `docs/agents/triage-labels.md`. The run's own files live in `<prd-folder>/run/`.
