# Turn 03, part 2 — bug fix: three lifecycle bugs you reported

Your test corrections are committed. The reviewer confirmed three of the bugs
you reported. Fix them now, each with a failing test first, in
`test/contract-lifecycle.test.ts`. The rules in
`docs/agents/orchestration-flow.md` still apply.

This is a **bug fix** turn. Refresh the regression snapshot only if the tests
show it differs, and say whether it changed and which fix caused it.

1. **An unanswered Contract cannot make an indebted employer richer.** In
   `expireQuests`, the looting loss is `min(treasury, income × days)`, which is
   negative when the treasury is negative: the treasury rises, `spent` falls and
   the Lair's hoard loses gold. The loss can never be negative. An employer with
   nothing loses nothing, and the Lair gains nothing.

2. **No Contract above level 20.** `pickQuestLevel` returns the strongest
   company's level plus one for a reputable employer, with no cap. D&D
   characters stop at level 20. Use the existing maximum-level constant rather
   than a new literal; if none is exported where you need it, export the one
   that exists.

3. **A cleared Lair does not grow.** A Contract taken before its Lair was
   cleared, and failed afterwards, still calls `raidSucceeded` on that Lair.
   Only an active Lair grows stronger or richer from a raid that succeeds.
   Check the other caller of `raidSucceeded` (expiry) for the same case.

4. **Record one rule question; do not change the behaviour.** An open Bounty
   counts against the board's Contract cap and never expires, so every active
   Lair permanently uses one slot. Write
   `.scratch/contract-lifecycle/issues/02-bounties-use-contract-slots.md` with
   `Status: needs-triage`: the current behaviour, why it is questionable, and
   two or three possible rules. Keep it short. Leave the existing test that
   describes the current behaviour as it is.

Not a bug, no change: a Bounty is posted once the strongest company is at least
one level below the Lair, with no upper bound. If no test states that rule in
those words, add one.

Done means: `pnpm typecheck` and `pnpm test` pass; each new test fails without
its fix; your report follows rule 9.
