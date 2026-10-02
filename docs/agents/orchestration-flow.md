# Orchestrated agent flow (1.0)

How the architecture work on this repo is run: one orchestrator that plans and
judges, one implementing agent that writes code, and short-lived subagents that
verify. This document is the record of the flow so it can later be turned into
agent and skill files, or pointed at a different implementing agent.

State lives in `.scratch/architecture-flow/`:

- `PLAN.md` — the ordered task list and its status.
- `turns/NN-<slug>.md` — the exact prompt sent for each turn, committed with the
  work it produced.
- `smoke/` — browser smoke-check reports.

## Roles

| Role | Who | Does | Does not |
| --- | --- | --- | --- |
| Orchestrator | Claude Code session | Chooses the next task, decides module interfaces, writes the turn prompt, commits and pushes, decides pass or fail | Read large diffs or logs itself; write production code |
| Implementer | Codex CLI (`gpt-6.1-sol`, high effort) | One task per session: tests, refactor or fix | Commit, push, or add agent configuration |
| Reviewer | Subagent, default model, one per turn | Checks the turn's diff against the turn prompt and runs the checks; returns pass or a short list of corrections | Edit files |
| Smoke tester | Subagent, Sonnet, built-in browser | Runs the app and compares with the baseline in `smoke/` | Edit files |

The orchestrator's context is the scarce resource. Everything verbose (event
streams, diffs, test output, page contents) stays inside the implementer or a
subagent, which report back in a few lines.

## Implementer invocation

```bash
scripts/agents/codex-turn.sh new .scratch/architecture-flow/turns/NN-<slug>.md
scripts/agents/codex-turn.sh resume <session-id> .scratch/architecture-flow/turns/NN-<slug>-fix1.md
```

The wrapper runs `codex exec -m gpt-6.1-sol -c model_reasoning_effort="high"
--approve-for-me --json -o <file>`, sends the event stream to a log file, and
prints only the session id, the exit code and the agent's final message.

- New task, new session. Corrections to the same task resume its session.
- The model and effort are passed per call; the user's Codex config is not edited.

## The loop for one task

1. The orchestrator writes the turn prompt and records the checkpoint commit.
2. The implementer runs the turn.
3. The orchestrator commits and pushes the result, whatever its quality, so each
   turn is one commit and corrections show up as their own diff.
4. A reviewer subagent checks the commit against the prompt.
5. Pass: move on. Fail: resume the session with the corrections, back to step 3.
6. After three failed rounds: `git reset` the branch to the checkpoint, rewrite
   the prompt, and start a new session. After two such restarts, stop and report
   why the task could not be completed.
7. After each finished candidate (not each turn), a smoke tester checks the app.

Stop and report to the user when the implementer hits its usage limit.

## Rules for the implementing agent

Every turn prompt refers to this section.

1. **Tests before refactoring.** Behaviour that is about to move must be covered
   by tests first, in a turn of its own, so the tests are proven against the old
   code.
2. **A refactor does not change behaviour.**
   `test/__snapshots__/simulation-regression.test.ts.snap` must stay
   byte-for-byte identical in a refactor turn. A turn that needs it changed has
   failed. Only a turn explicitly labelled as a bug fix may refresh it, and must
   say so.
3. **Bugs are fixed before the refactor continues.** A bug found on the way is
   reported, not pinned in a test and not silently fixed inside a refactor. It
   gets its own bug-fix turn.
4. **D&D 5e 2024 (SRD 5.2.1) is the north star for domain questions.** Where the
   game diverges from it, or battlecast-engine cannot model it, do not change
   the behaviour. Encapsulate the current behaviour behind a name taken from the
   D&D term (for example `shortRest`), and record the divergence and the ideal
   behaviour as an issue under `.scratch/`.
5. **Design for what comes next.** Tunable numbers will move to YAML and
   behaviour will be extended. Prefer: values passed in as configuration over
   constants buried in logic; small interfaces; behaviour selected by data over
   branching on names; no knowledge shared between modules through string
   conventions or call ordering.
6. **Test through a module's own interface.** No spying on internals, no
   counting `Rng` calls, no assertions that restate the code's formula.
7. **Use the domain language** in `CONTEXT.md`. New D&D knowledge gained during
   a turn is added there.
8. **Stay in scope.** Do not add hooks, skills, agent or editor configuration,
   or copies of existing skills. Do not edit `AGENTS.md` or `CLAUDE.md`. Do not
   commit or push.
9. **Report plainly.** End with: what changed, the result of `pnpm typecheck`
   and `pnpm test`, whether the regression snapshot changed, and anything not
   done with the reason.
