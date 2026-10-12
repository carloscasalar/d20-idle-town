# Two cases of the fight's drinking are guarded by no test

Status: needs-triage
Category: enhancement

Found by the review of [issue 13](13-one-drinking-decision-for-the-company.md) on 2026-10-12 (`run/reviews/12-13-slice-review.md`). Neither is a bug: the game behaves as intended. Two changes to `runCombat` in `src/combat/battlecast.ts` would go unnoticed by the tests.

## The gaps

1. **A Company with no recorded policy, in a fight.** `runCombat` hands `opts.potionSharing` to the Company's drinking decision, which serves a Company with no policy in company order. If the fight mapped an absent policy to `most-hurt` before asking for the plan, all 784 tests of that commit still passed. The decision itself is tested for the absent policy; the fight's handing over is not. Issue 13 allowed one fight test, and it uses `most-hurt`.
2. **A fighter above 0 hit points who is unconscious.** The fight describes each fighter to the decision as conscious or not, and a Bloodied fighter above 0 hit points who is unconscious neither drinks nor is given a potion. If the description ignored the engine's `unconscious` condition, all tests still passed. No fight test has such a fighter; that was already so before issue 13.

## To decide at triage

- Whether each case deserves a test through `runCombat`, and for the second whether the engine can put a fighter in that state at all in a scripted fight.
- Whether a dead fighter being left out of the description should have a test of its own: today only the regression hashes notice it.

## Comments
