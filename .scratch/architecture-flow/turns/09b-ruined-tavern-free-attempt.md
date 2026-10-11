# Turn 09, part 2 — bug fix: a ruined tavern still hears the free attempt

Your job-intel tests are committed. Fix the bug you reported. The rules in
`docs/agents/orchestration-flow.md` apply. This is a **bug fix** turn: refresh
the regression snapshot only if it differs, and say whether it did.

`investigate` in `src/sim/game.ts` lets a company make its free Persuasion
attempt at the tavern even when the tavern's owner is ruined; only the paid
round checks for that. A ruined tavern offers neither. With a ruined tavern the
company goes on to the temple's divination if it can afford it, and otherwise
takes the job.

1. A failing test first, in `test/job-intel.test.ts`, through `Game`.
2. The fix, in the place the decision is made today.

Leave the other thing you reported (`learnQuestIntel` on a fully known job) as
it is: it cannot be reached, and the next turn moves that code.

Done means: `pnpm typecheck` and `pnpm test` pass; the new test fails without
the fix; your report follows rule 9 and says whether the snapshot changed.
