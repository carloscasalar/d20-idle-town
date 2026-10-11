# Turn 01, correction 1

Your work was committed as 89a2062 and reviewed. Three things must change. The
rules in `docs/agents/orchestration-flow.md` still apply. This is still the bug
fix turn, so the regression snapshot may be refreshed again; say so.

1. **An unconscious hero cannot drink.** In `runCombat`, a hero at 0 hit points
   who is unconscious but not dead currently "drinks" and is revived. The log
   reads "X is unconscious and cannot act!" followed by "X drinks a healing
   potion." Apply the D&D 2024 rule instead: a potion can be administered to
   another creature.
   - A conscious Bloodied hero drinks their own potion, as now.
   - A hero at 0 hit points receives a potion only if at least one other hero of
     the company is conscious in that fight. The narration line names both:
     the ally who administers it and the hero who receives it. Pick the ally
     deterministically (no new random draw).
   - If no hero is conscious, nobody drinks.
   - Add tests for all three cases through `runCombat` with fixed seeds.
   - D&D requires the ally to be within 5 feet and to spend a Bonus Action; the
     game checks neither. Add that divergence, with the ideal behaviour, to
     `.scratch/potions-and-short-rest/issues/01-short-rest-and-potion-divergences.md`,
     and make the potion rule in `CONTEXT.md` say that a fallen adventurer is
     given the potion by a companion.

2. **The short-rest test does not prove its claim.** In
   `test/expedition.test.ts`, every row of the short-rest table runs out of
   potions, so removing the Bloodied check from `shortRest` leaves it green. Add
   a case with potions to spare where a hero above half does not drink and the
   supply left over proves it. Also restore a test that the default fraction
   (0.5) heals exactly half of maximum hit points, capped at the maximum; that
   coverage was lost when the known-defect tests were deleted.

3. **Do not trust the resolver's count blindly.** In `resolveFight`, a
   `CombatResolver` that reports more potions drunk than the company carried
   drives `potions` negative. The company's supply must never go below zero.
   Add a test with a scripted resolver.

Also fix `docs/ARCHITECTURE-IMPROVEMENTS.md` entry 2: it still says "breather"
and claims coverage of "exact breather healing". Make it true.

Ignore the change to `scripts/agents/codex-turn.sh` in that commit; it was made
by the orchestrator, not by you. Do not touch that file.

Done means: `pnpm typecheck` and `pnpm test` pass, and your report follows
rule 9 and states whether the snapshot changed.
