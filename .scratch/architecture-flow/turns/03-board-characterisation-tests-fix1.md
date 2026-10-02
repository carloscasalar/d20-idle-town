# Turn 03, correction 1 — close the gaps a mutation check found

Your tests were committed as 6dd66d2. A reviewer applied 205 small mutations to
the lifecycle code; 190 were caught. Close the gaps below. Tests only: nothing
under `src/` changes and the regression snapshot stays identical. The rules in
`docs/agents/orchestration-flow.md` still apply.

Add a test that fails for each of these surviving mutations:

1. `pickQuestLevel`: `reputation >= 3` changed to `>= 1`. Prove that an employer
   with reputation 2 never posts above the strongest company.
2. `raids`: the raiding Lair replaced by `null` in the call to `threaten`. With
   two active Lairs of the same theme, prove the Contract's origin is the Lair
   that raided.
3. `settleQuest`: the loot condition reduced to "has items". Prove gold-only
   loot left at a Holding is collected, and items-only loot too, each in a
   direct test rather than a seeded run.
4. `expireQuests`: the first-overrun chronicle entry downgraded to a plain log
   entry. Prove the first overrun is in the chronicle and a repeated one is not.
5. `acceptQuest`: `quest.kind === 'assault' && lair` reduced to `lair`. Prove a
   taken Contract that has a Lair behind it gets the ordinary acceptance entry,
   not the Bounty chronicle entry.

Random ranges were asserted from a single seed, so widening them goes unnoticed.
For each of these, run the scene over about 40 seeds and assert both that every
value is inside the range and that the lowest and highest values of the range
both occur:

6. the employer's cooldown after posting a Contract (12 to 30);
7. the employer's shortened cooldown after an unanswered Contract (4 to 10);
8. the level added when a Lair respawns (1 or 2).

Also:

9. The three-line employer setup repeated about a dozen times becomes one helper.
10. Where a test asserts on a whole English sentence only to detect that
    something happened, prefer asserting the event's kind plus the one fact that
    matters (a name, an amount). Leave sentence assertions only where the
    wording is the behaviour under test.

Do not touch the test "an open assault fills the board's Contract cap" in this
correction.

Done means: `pnpm typecheck` and `pnpm test` pass, `git diff --stat` shows only
`test/contract-lifecycle.test.ts`, and your report follows rule 9.
