# Turn 05, correction 1 — handover

Read `docs/agents/orchestration-flow.md`, section "Rules for the implementing
agent", then `.scratch/architecture-flow/turns/05-coin-characterisation-tests-fix1.md`,
which is the task. For background, `.scratch/coin-transfers/AUDIT.md` describes
every movement of gold and the test helpers in `test/coin-movements.test.ts`.

Another agent started this task and was cut off part-way by a usage limit. Its
unfinished edits are in the working tree, in `test/coin-movements.test.ts`
(`git diff` shows them). Review them: keep what is correct, fix or remove what
is not, and finish every numbered item of the task. Do not assume any item is
done until you have checked it.

Tests only: nothing under `src/` changes and the regression snapshot stays
byte-for-byte identical. Finish with the report the task asks for, and say which
items you found already done and which you did yourself.
