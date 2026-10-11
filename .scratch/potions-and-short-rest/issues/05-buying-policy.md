# Buying policy

Status: ready-for-agent

Blocked-by: [04 - Tiered potions with real dice](04-tiered-potions-with-real-dice.md)

## Parent

[PRD: Hit Dice at the short rest, four healing potion tiers and an apothecary that makes them](../PRD.md), slice 4 of 8. Vocabulary: [CONTEXT.md](../../../CONTEXT.md) (Healing potion, Assured healing, Purse).

## What to build

A company restocks until its pack can heal each living hero for half their maximum hit points, with at least one potion per hero, favouring the lower tiers. This replaces the temporary rule of issue 04 (basic only, up to one per living hero).

- Checked on the visit to the apothecary, in the existing `potions` service step. One tier per visit, one purchase, one log line.
- Stock target: for each living hero `need = ceil(maxHp x potionCoverFraction)` (default 0.5). The company wants the assured healing of its whole pack to reach the sum of the needs, and at least one potion per living hero.
- Tier: with `N` = sum of needs / living heroes, the highest offered tier whose assured healing is at most `N / 2`, or the lowest tier if none. The divisor 2 is fixed in code, not configuration.
- Count: the fewest potions of that tier that meet the target. If the budget (purse minus the unchanged reserve of one resurrection) cannot pay for that count, step down to a cheaper tier whose count it can pay; if even basic does not fit, buy as many basic as it affords.
- A ruined apothecary offers nothing: the step returns false and the company goes on with its Hit Dice and the potions it carries. This is the only case in which the shop limits a purchase. There is no treasury gate, no reserve and no `reserveDays`.
- The sale is unchanged: the purse pays the apothecary's treasury the full price as a `service` movement.

Issues 05, 06 and 07 are independent of one another. This issue and issue 07 both edit the `potions` service step; whichever lands second rebases onto the first.

## Regression hashes

The six regression hash tests were skipped by issue 03. Leave them skipped. Do not re-record them or update the snapshot; [issue 09](09-retune-confirmation.md) does that once.

## Acceptance criteria

- [ ] A company below its stock target buys on its visit; one at or above it, with one potion per living hero, buys nothing.
- [ ] A 32 HP fighter alone buys two basic; a 90 HP hero alone buys three greater.
- [ ] A company that cannot afford its chosen tier steps down to a cheaper tier whose count it can pay; if even basic does not fit it buys as many basic as it affords.
- [ ] The resurrection reserve is never spent on potions.
- [ ] One purchase of one tier and one log line per visit.
- [ ] Nothing is bought from a ruined apothecary and the step returns false.
- [ ] `potionCoverFraction` is configuration, default 0.5, validated.
- [ ] The temporary buying rule of issue 04 is gone.
- [ ] The six regression hash tests stay skipped and are not re-recorded.
- [ ] The suite is green.

### Tests

New:

- Buying: the stock target and the floor of one potion per hero; the tier choice (a 32 HP fighter buys two basic, a 90 HP hero three greater); the step-down by budget; the reserve respected; nothing bought from a ruined apothecary.
- Configuration: validation of `potionCoverFraction`.

Rewritten:

- The town service tests of the potion step, already rewritten by issue 04 for the temporary rule, are rewritten again for this buying rule.

## Configuration and documents

- Added: `potionCoverFraction`, default 0.5. Its section is the implementer's choice, following the rule of `docs/CONFIGURATION.md` that a value lives in the section of the module that owns it.
- Removed: none.
- Not configuration: the tier divisor `N / 2`.
- `docs/CONFIGURATION.md`: `potionCoverFraction` and the buying rule in prose.
- `docs/ARCHITECTURE.md`: the new tests in the test table; the `potions` step description if it names the old rule.
- `CHANGELOG.md`: the buying policy.

## Comments
