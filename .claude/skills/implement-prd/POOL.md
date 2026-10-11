# The pool: who does what, and how to run them

## Roles

| Role | Agent | Takes |
| --- | --- | --- |
| Implementer | Codex, then Cursor (the order is in `docs/agents/implementation.md`) | Every turn that writes code or tests |
| Slice reviewer | `slice-reviewer` agent (default model) | An issue's implementation: each acceptance criterion with evidence, design rules, behaviour outside the issue |
| Cheap reviewer | opencode | Bug-fix turns, tests-only turns, and re-checks of a correction that is a closed list |
| Product decisions | `prd-answerer` agent (Opus) | A product question an issue does not answer |
| Smoke tester | `smoke-tester` agent (Sonnet, built-in browser) | Running the app and comparing with the last smoke report |
| Orchestrator | you | A diff of three files or fewer that is mechanical: read it yourself instead of spending a reviewer |

One implementer works in the tree at a time, so issues are taken one after another. Reviewers and the smoke tester that run meanwhile use a throwaway worktree, or only read. Running unblocked issues in parallel, each in its own worktree and branch and merged in dependency order, is the planned extension; this version does not do it.

## Running an implementer or opencode

Every wrapper has the same contract: `new` or `resume`, the prompt in a file, and it prints only the session id, the exit code, a `LIMIT` line when a usage limit was hit, and the agent's final message. The full event stream goes to a log file.

```bash
run="${TMPDIR:-/tmp}/prd-run"   # logs and results stay outside the repository
CODEX_TURN_LOG_DIR="$run" scripts/agents/detach.sh "$run/turn-NN.result" \
  scripts/agents/codex-turn.sh new <prompt-file>
CODEX_TURN_LOG_DIR="$run" scripts/agents/detach.sh "$run/turn-NN-fix1.result" \
  scripts/agents/codex-turn.sh resume <session-id> <prompt-file>
```

`cursor-turn.sh` takes the same arguments (`CURSOR_TURN_LOG_DIR`). `opencode-turn.sh new` takes a title before the prompt file (`OPENCODE_TURN_LOG_DIR`). Models are set by environment variables read at the top of each wrapper.

- **Always detached.** `detach.sh` runs the turn in its own session and writes `<result>.done` with the exit code when it ends. A turn started any other way dies with your own time limit.
- **Wait for the marker,** with a monitor that ends when `<result>.done` exists. Re-arm it when it expires; a refactor-sized turn takes 20 to 60 minutes.
- **A silent turn is not a stuck turn.** Before acting, look at the tail of its event log: recent events mean it is working.
- **New task, new session; corrections resume the session** that did the work, so it keeps its context.
- **In zsh, write `${var}:` with braces** in commands; `$var:r` and `$var:c` are modifiers and silently mangle the value.

## The `implement` skill

Implementation turns use the `implement` skill of the mattpocock-skills plugin (test-first, checks, a self-review, a commit). An implementer loads it only when the prompt names it, each in its own way; the pool table in `docs/agents/implementation.md` has the sentence for each. An implementer with no way to load it follows rule 2 of [RULES.md](RULES.md), which asks for the same work. The skill's own review does not replace the review in this flow: the reviewer still checks every turn.

## Usage limits and dead turns

- **`LIMIT` in the result:** switch to the next implementer in the pool. If the working tree has unfinished edits, send the handover prompt in a new session; if it is clean, send the original prompt. When the whole pool is at its limit, stop and report the reset time.
- **A turn that died with no result** (exit 143, a sleep, a lost connection): the session id is in the result file's first line; resume it with a one-line "carry on with the task" prompt.
- **A turn that changed the wrong things:** `git reset --hard <checkpoint>` and start a new session with a rewritten prompt. This is the only time the branch moves backwards.

## Reviews

- Dispatch the `slice-reviewer` agent with: the commit, the issue file, and anything specific to check. Its definition carries the safety rules and the reply shape.
- For opencode, fill the cheap-review template in [PROMPTS.md](PROMPTS.md), save it under `run/reviews/`, and run it detached.
- After every opencode run, check `git status` and `git worktree list` yourself: it approves its own actions, so the prompt's safety rules are the only guard.
- Review two small related commits in one pass.
- Once per issue that touches rules of the game, ask the reviewer for the long sweep named in `docs/agents/implementation.md`: the regression guard covers only a few seeds.

## Lessons this flow already paid for

- A mutation check is the review of a tests-only turn.
- "Single writer" needs a search for writes wrapped in exported helpers, not only direct assignments.
- A production fallback to a default value is how a configuration override silently stops reaching its code.
- A reviewer's `pkill` by pattern once killed the implementer; stop processes by id.
- Stage by `git status`, never by a fixed list of folders.
- The record of the first run, with every lesson, is `docs/agents/orchestration-flow.md`.
