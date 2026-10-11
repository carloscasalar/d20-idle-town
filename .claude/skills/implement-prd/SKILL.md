---
name: implement-prd
description: Orchestrates a pool of coding agents (Codex, Cursor, opencode, Claude subagents) to implement every ready-for-agent issue of a PRD, one reviewed commit at a time. Use when the user wants a PRD or a folder of ready-for-agent issues implemented, or wants to resume such a run.
---

# Implement a PRD

You are the **orchestrator**: you choose the next issue, write the prompt, commit, and judge. An **implementer** writes the code. **Reviewers** verify. Your context is the scarce resource: verbose output (diffs, logs, test output, pages) stays inside the implementer or a subagent, and you read only their final messages.

Input: a PRD folder (`.scratch/<feature-slug>/`). Project specifics (check commands, regression guard, smoke procedure, the pool) are in `docs/agents/implementation.md`; read it first.

## State

Everything a fresh session needs to resume is on disk, under `<prd-folder>/run/`:

- `LOG.md` — one line per turn: issue, kind, implementer, commit, verdict; then lessons.
- `turns/NN-<issue>-<slug>.md` — every prompt sent to an implementer.
- `reviews/` and `smoke/` — prompts and reports of the cheap reviewer and the smoke tester.

Resuming a run means reading `LOG.md` and running the status script; nothing else is remembered.

## Before the first issue

1. The working tree is clean and the branch is the PRD's branch, not the default one.
2. The checks in `docs/agents/implementation.md` pass. A red baseline is fixed, or reported to the user, before any issue starts.
3. A smoke baseline exists in `run/smoke/`; if not, dispatch the `smoke-tester` agent to record one.

## The loop

Repeat until the status script reports nothing workable.

1. **Pick.** `scripts/agents/prd-status.py <prd-folder>` names the next workable issue: `ready-for-agent` with every blocker `done`. Take it in that order.
2. **Brief.** Write the turn prompt from the template in [PROMPTS.md](PROMPTS.md). It points at the issue file, which is the contract; it adds only what the issue cannot know (what earlier turns of this run changed, reviewer notes carried forward). Record the checkpoint commit.
3. **Dispatch** to the first available implementer in the pool, detached, in a new session. See [POOL.md](POOL.md) for the commands, how to wait, usage limits and handovers.
4. **Commit and push.** The implementer normally commits its own work (the `implement` skill ends that way). Look at what it committed (`git show --stat`) and at `git status`: commit anything it left in the tree, whatever its quality, so the turn is on the branch; remove from the commit anything that is not the task's (agent configuration, machine paths). Keep your own files (prompts, log) in commits of their own, then push.
5. **Review** with the reviewer [POOL.md](POOL.md) routes this kind of turn to. A review passes only with evidence for every acceptance criterion of the issue.
6. **Correct** on a failed review: resume the same implementer session with the corrections, then back to step 4. After three failed rounds, reset the branch to the checkpoint, rewrite the prompt, and start a new session. After two such restarts, set the issue to `needs-info` with what blocked it and go to step 1.
7. **Close.** Set the issue's `Status:` to `done`, add a `## Comments` entry with its commits and the review verdict, append to `LOG.md`, commit and push.
8. **Smoke** with the `smoke-tester` agent when `docs/agents/implementation.md` says this issue needs one.

## When the implementer asks a question

An implementer that meets a product question its issue does not answer stops and reports it; it does not guess. Dispatch the `prd-answerer` agent with the question and the PRD folder. Record its answer and reasoning in the issue's `## Comments` as a decision, resume the implementer session with it, and list every such decision in your final report, lowest confidence first.

## When a bug turns up

A bug that blocks the current issue gets its own bug-fix turn before the issue continues. Any other bug becomes a new `needs-triage` issue file in the PRD folder and is left alone.

## Stop and report

Stop when the status script exits 3 (nothing left) or 4 (what remains is blocked or parked as `needs-info`), or when every implementer in the pool is at its usage limit. Report: issues done with their commits, issues parked and why, decisions the `prd-answerer` made, new issues filed, and the state of the checks. Run the full checks and a final smoke check before reporting a finished PRD. The work stays on its branch; opening a pull request is the user's call.

## Rules every prompt carries

The implementer's rules are in [RULES.md](RULES.md); every turn prompt tells the implementer to read them first. Nothing you commit names a home folder, a temporary directory, an account or a machine: agents start in the repository root and prompts use relative paths.
