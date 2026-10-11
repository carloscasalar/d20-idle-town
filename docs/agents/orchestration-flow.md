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
| Cheap reviewer | opencode, `minimax/MiniMax-M3` (thinking variant) | Reviews of contained bug fixes and tests-only turns, mutation checks, re-checks of a closed correction list | Edit files |
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
- `codex exec resume` takes its options before the `resume` subcommand.

### Cheap reviewer: opencode

Tasks that were delegated to a Sonnet subagent because a cheaper model is
enough go to opencode instead:

```bash
scripts/agents/opencode-turn.sh new <title> .scratch/architecture-flow/reviews/NN-<slug>.md
scripts/agents/opencode-turn.sh resume <session-id> .scratch/architecture-flow/reviews/NN-<slug>-recheck.md
```

The wrapper runs `opencode run --auto --model minimax/MiniMax-M3 --variant thinking
--format json --title <title> "<prompt>"`, logs the event stream and prints only
the session id and the final message. Run it through `scripts/agents/detach.sh`
like the implementers.

Decisions, recorded when it was introduced (turn 11b):

- **What it takes over:** reviews of contained bug fixes and of tests-only turns
  (mutation checks), and re-checks of a correction that is a closed list. Those
  were the Sonnet-subagent reviews.
- **What stays elsewhere:** refactor reviews stay on a default-model Claude
  subagent, because they need design judgement. Smoke checks stay on a Sonnet
  subagent, because they need the built-in browser, which opencode cannot drive.
- **Same prompt, same safety rules:** the review prompts are the ones the
  subagents received (throwaway worktree, no edits, no commits, no killing
  processes by pattern), now saved as files under
  `.scratch/architecture-flow/reviews/` so the history shows them.
- **`--auto` approves every action**, so the prompt's safety rules are the only
  guard. The orchestrator checks `git status` and `git worktree list` after each
  opencode review and reports anything left behind.
- **Trial:** the first opencode review is checked against the same orchestrator
  expectations as a Sonnet review. If it misses what a Sonnet review would have
  caught, or breaks a safety rule, the orchestrator goes back to Sonnet for that
  kind of review and records why.

### Fallback implementer: Cursor

When Codex reports its usage limit, the same turn prompts go to Cursor:

```bash
scripts/agents/cursor-turn.sh new .scratch/architecture-flow/turns/NN-<slug>.md
scripts/agents/cursor-turn.sh resume <session-id> .scratch/architecture-flow/turns/NN-<slug>-fix1.md
```

The wrapper creates a chat with `cursor-agent create-chat` and runs
`cursor-agent -p --trust --force --resume <id> --model grok-4.7-high "<prompt>"`.
`grok-4.7-high` is high effort and not the fast variant. This CLI version
(2026.10.01) rejects the bracket form `grok-4.7[context=500k,effort=high,fast=false]`
and lists no 500k-context variant.

## Prompts and files carry no machine details

Every agent is started in the root of the repository, and every prompt, report
and script refers to files by paths relative to it. Nothing committed names a
user's home folder, a temporary directory, an account or a machine; temporary
locations are written as `$TMPDIR` and the repository root as `$PWD` when a
command needs an absolute path.

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

Stop and report to the user when the implementer hits its usage limit; switch
to the fallback implementer if the user has said so.

Only one implementer works in the working tree at a time. Reviewers and smoke
testers that run while an implementer works use a throwaway `git worktree` and
never kill processes by pattern (`pkill -f vitest` once killed an implementer
whose prompt contained the word); they stop only processes they started, by
process id.

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

## Lessons from flow 1.0

Recorded at the end of the first series (turns 01 to 11b), for turning this flow
into agent and skill files.

- **Characterise, then refactor, in separate turns.** Tests written first and
  committed alone are what made each refactor checkable. Fifteen game bugs
  were fixed during the series, most of them found by those test turns or
  their audits, each before the code around it moved.
- **Ask the implementer to report suspected bugs, never to pin them.** Most of
  the bugs came from that instruction.
- **A mutation check is the review of a tests-only turn.** It found gaps in
  every test turn (between 2 and 19 surviving mutations).
- **The regression snapshot covers three seeds; that is not enough.** A sweep of
  150 seeds over 1,500 hours found two crashes (a negative Bounty, a monster
  that did not fit) the snapshot seeds never reach. Run it once per refactor.
- **Refactor reviews need design judgement; check reviews do not.** Default-model
  reviewers caught second doors, leaked writers and silently ignored overrides
  that tests could not; Sonnet and then opencode/MiniMax handled mutation
  checks and closed correction lists at a fraction of the cost.
- **"Single writer" needs a search for wrapped writes**, not only direct
  assignments: twice the search came out clean because the write was hidden
  behind an exported helper.
- **Ban production fallbacks to defaults.** A `= DEFAULT_*` parameter is how two
  configuration overrides silently stopped reaching their code.
- **Run turns detached, record the session id first, log the event stream.**
  The orchestrator's ten-minute background limit, an overnight sleep and
  connection drops each killed a turn before these were in place.
- **One implementer in the tree; reviewers in throwaway worktrees; never kill by
  pattern.** A reviewer's `pkill -f vitest` once killed the implementer.
- **Usage limits land mid-turn.** A handover prompt that points the next
  implementer at the task file and the working-tree diff, and tells it to
  verify every item, worked both times.
- **Stage by `git status`, and keep the orchestrator's edits out of the
  implementer's commit.**
