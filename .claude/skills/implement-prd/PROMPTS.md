# Prompt templates

Fill the `<...>` parts. `$mattpocock-skills:implement` is how Codex is told to load that skill; it only loads when named like this, and an implementer without it falls back to the rules. Save each prompt under `<prd-folder>/run/` before sending it, so the history shows what was asked. Keep them short: the issue file and the rules carry the detail.

## Turn (new session)

```markdown
# Turn NN — <issue number and title>

Read `.claude/skills/implement-prd/RULES.md` before anything else. Those rules apply to this turn.

Use $mattpocock-skills:implement to implement the issue `<prd-folder>/issues/<file>.md`. If you have no such skill, follow rule 2 of the rules instead; the work is the same. The issue is the contract: build what it describes and meet every acceptance criterion. Its parent PRD is `<prd-folder>/PRD.md`.

<Only if needed: what earlier turns of this run changed that the issue could not know; reviewer notes carried forward.>

Done means: <check commands from docs/agents/implementation.md> pass, and your report follows rule 9.
```

## Bug-fix turn (new session)

```markdown
# Turn NN — bug fix: <what is wrong, in one line>

Read `.claude/skills/implement-prd/RULES.md` before anything else.

<Where it is, how to trigger it, why it is wrong, the rule to implement.>

Use $mattpocock-skills:implement if you have it. A failing test first, then the fix, in the place the decision is made today. Nothing else changes.

Done means: the checks pass, the new test fails without the fix, and your report follows rule 9.
```

## Correction (resume the same session)

```markdown
# Turn NN, correction K

Your work was committed as <hash> and reviewed. <One line on what passed.> Fix the following; the rules still apply.

1. <Concrete correction: where, what is wrong, what it must be.>
2. ...

<Allowed test edits, if a correction forces any: which files, and that expected values stay the same.>

Done means: the checks pass and your report follows rule 9.
```

## Decision (resume the same session, after `prd-answerer`)

```markdown
# Turn NN — your question, answered

Question: <the implementer's question>
Decision: <the answer>
Why: <the reasoning and where in the PRD it comes from>

It is recorded in the issue's Comments. Continue the turn with it.
```

## Handover (new session on another implementer, after a usage limit)

```markdown
# Turn NN — handover

Read `.claude/skills/implement-prd/RULES.md`, then `<the original turn prompt file>`, which is the task.

Another agent started this task and was cut off by a usage limit. Its unfinished edits are in the working tree (`git status`, `git diff`). Review them: keep what is correct, fix or remove what is not, and finish every part of the task. Treat nothing as done until you have checked it yourself.

Finish with the report the task asks for, and say what you found already done and what you did.
```

## Cheap review (opencode)

```markdown
You are a strict code reviewer. Reply in English. You are started in the root of the repository; every path below is relative to it.

## Safety rules
- Change nothing in this repository: no edits, commits, stashes, resets or checkouts.
- Work in a throwaway worktree: `git worktree add --detach "$TMPDIR/review-NN" <hash>`, link `node_modules` from `$PWD`, run everything there, and remove it when you finish.
- Stop only processes you started, by process id.

## What to review
Commit <hash> (`<subject>`). What was asked: `<prompt file>`. Rules: `.claude/skills/implement-prd/RULES.md`.

Check, with the commands you ran and what they showed:
1. The check commands pass.
2. Each requested item is done. <List the items, or point at the numbered corrections.>
3. <For tests: apply at least N small mutations to <the code under test>, one at a time, and list every survivor.>
4. <For a bug fix: the new test fails when the fix is reverted.>
5. Nothing outside the request changed.

## Reply
At most 200 words: VERDICT (PASS or FAIL), CHECKS, ITEMS (one line each), CORRECTIONS (numbered, concrete; empty if PASS).
```
