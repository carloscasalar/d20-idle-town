# Turn 06, part 2 — bug fix: a guild in debt posts a Bounty with a negative reward

Your coin module (commit 0288d2a) was reviewed. The reviewer found an old bug
that your refactor turned into a crash. Fix the bug first, in its own turn; the
review corrections come in the next turn. The rules in
`docs/agents/orchestration-flow.md` apply.

This is a **bug fix** turn. Refresh the regression snapshot only if it differs,
and say whether it did.

## The bug

`generateAssault` (`src/quests/quest.ts`) sets a Bounty's reward to
`min(guild treasury, 150 × level)`. A guild in debt that is not yet ruined
therefore posts a Bounty with a negative reward. Before the coin module, paying
it moved gold the wrong way (the company paid the guild). Now the coin module
refuses the negative amount and the game crashes: over 1,500 hours, seeds 14,
22, 25, 45 and 71 throw "whole number of gold pieces, not -141" and similar.

## The rule to implement

The guild posts a Bounty only when it can pay one, the same way an employer
posts a Contract only when its treasury is at least the posting threshold that
`postQuests` already uses. Use that same threshold, from the same definition
(do not copy the number). A Bounty's reward is therefore never negative, and
the coin module's refusal stays as it is.

1. A failing test first: a guild in debt, an active Lair and a company strong
   enough for it. Today a negative Bounty is posted; after the fix none is
   posted until the guild's treasury reaches the threshold, and then the Bounty
   is posted normally.
2. A second test runs 1,500 hours of seed 14 through `Game` without throwing.
3. Fix it in the place that decides whether the guild posts a Bounty.
4. Record the rule in `CONTEXT.md` next to Bounty in one sentence.

Do not touch the review corrections in this turn.

Done means: `pnpm typecheck` and `pnpm test` pass; the new tests fail without
the fix; your report follows rule 9 and says whether the snapshot changed.
