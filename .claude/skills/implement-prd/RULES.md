# Rules for the implementing agent

Every turn prompt refers to this file. They apply to any agent that writes code in a run of `implement-prd`.

1. **The issue is the contract.** Build what its "What to build" and "Acceptance criteria" say, in the vocabulary of `CONTEXT.md`. Where the issue and the PRD disagree, the issue wins.
2. **Tests first.** For each acceptance criterion, write a test that fails for the right reason, then make it pass. Test through a module's own interface: observable outcomes, exact expected values, no spying on internals, no assertion that restates the code's formula.
3. **Change only what the issue describes.** Behaviour outside the acceptance criteria stays as it is. Tests the issue names as surviving unchanged are left exactly as they are and still pass. When the project's regression guard (see `docs/agents/implementation.md`) has to change, it changes once, and your report says which criterion caused it.
4. **A product question stops the turn.** If the issue does not say what should happen in a case you must decide, stop and report the question with the options you see. Leave the decision to the orchestrator.
5. **A bug is reported.** A bug you find on the way is described in your report (where, how to trigger it, why it is wrong). Fix it only when the prompt asks you to. Tests describe intended behaviour, never a bug.
6. **Design for extension.** Tunable values live in the configuration section of the module that owns them. A module is the single writer of what it owns; other code asks it. Behaviour that varies by kind is selected by data. Production code takes its configuration as a required argument.
7. **Stay in scope.** Leave agent, editor and tool configuration, `AGENTS.md`, `CLAUDE.md` and the skills alone. The orchestrator commits and pushes.
8. **Use relative paths** in everything you write: code, documents, reports.
9. **Report plainly.** End with: what changed; the result of each check command; whether the regression guard changed and why; each acceptance criterion with the test that covers it; questions and bugs; anything not done, with the reason.
