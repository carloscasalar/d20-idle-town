# Leftovers of the pull request review, in the game's code

Status: needs-triage
Category: enhancement

Found by the two-axis review of the potions pull request at `14d12bf` (2026-10-12). None changes what the game does today, and none blocked the merge. They are kept in one issue so they can be triaged, split or dropped together.

## Against a documented standard

1. **The potion buying plan lives with the town services, not with the Company.** `planPotionPurchase` in `src/town/services.ts` decides which tier, how many and how to step down, and its setting `services.potionCoverFraction` sits with it. [ADR 0001](../../../docs/adr/0001-actor-decisions-live-with-the-actor.md) says "how many potions to buy is the Company's". [Issue 13](13-one-drinking-decision-for-the-company.md) left it out of scope on purpose ("stays in town services until a second purchase has to be weighed against it"), and `docs/ARCHITECTURE.md` still describes the potions step as living in services. Either move the plan and its setting to `src/adventurers/policies.ts`, leaving production and payment in `buyPotions`, or have the ADR and the architecture document say the same thing about where it stays and why.

## Two things for the owner to decide

2. **Pacing over an unknown encounter count cannot happen in play** (PRD user story 13, issue 15). A Company only reaches a fight through `travel()`, which calls `learnOnArrival`, which reveals everything; so `q.countRevealed` is always true by the first Short rest and the `Math.max(maximum, q.revealed)` branch of `encountersAhead` in `src/sim/expedition.ts` runs only in tests that place a Company already resting. `src/quests/job-intel.ts` did not change in the potions work, so this was already so before it.
   - **A.** Accept it: say in the PRD and the documents that the rule is a safeguard, and relabel or drop the test that injects the state.
   - **B.** Stop arrival from revealing the encounter count, so an unscouted Company really paces over the upper bound. This changes play and the regression hashes.
3. **A production cost above the selling price is accepted by validation.** The PRD asks only that neither is negative. A probe with a cost of 500 gp on the 50 gp tier took the apothecary's treasury to about -13,000 gp with no crash. Decide whether validation should refuse it or whether a loss-making tier is allowed configuration.

## Judgement calls (small)

4. The ordering of tiers by strength (assured healing, then catalogue index) is written in `chooseTier` of `src/adventurers/policies.ts` and again as `byAssuredHealing` in `src/town/services.ts`. One comparator exported from `src/adventurers/potions.ts` could serve both.
5. `src/sim/expedition.ts` unpacks `p.policies` into `potionSharing` and `runCombat` wraps it back into `{ potionSharing }`. `CombatOptions.policies?: CompanyPolicies`, passed straight through, keeps the next policy from needing a new option on both sides.
6. `runCombat` counts `potionsDrunk` by editing the pack by hand; `givePotions(potionsDrunk, name, 1)` does it inside `potions.ts`.
7. `['company-order', 'most-hurt']` in `src/sim/config.ts` repeats the `PotionSharingPolicy` union and the keys of `SHARING`. One const list exported from `policies.ts` with `satisfies`, as `SERVICE_KINDS` does in `town.ts`.
8. `spendPotions` repeats the body of `takePotion` in `src/adventurers/potions.ts` (set the count, drop the key at zero).

## Comments
