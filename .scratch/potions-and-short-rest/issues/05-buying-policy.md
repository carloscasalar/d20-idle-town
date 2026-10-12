# Buying policy

Status: done

Blocked-by: [04 - Tiered potions with real dice](04-tiered-potions-with-real-dice.md)

## Parent

[PRD: Hit Dice at the short rest, four healing potion tiers and an apothecary that makes them](../PRD.md), slice 4 of 8. Vocabulary: [CONTEXT.md](../../../CONTEXT.md) (Healing potion, Assured healing, Purse).

## No questions

The owner is not available while this issue is built. Do not ask and do not wait for an answer. Where this issue or the PRD leaves a choice to the implementer (key names, file locations, log wording), decide and write the decision under Comments. Where this issue gives a rule for a doubt or a failure, follow it.

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

Decisions left to this slice:

- `potionCoverFraction` lives on `services` in `src/town/services.ts`, the module that owns the apothecary visit. It is a share from 0 to 1 inclusive, the same check as the other hit-point shares. The default is 0.5.
- The tier cap is the literal `N / 2` inside the potions step. It is not a configuration field.
- An empty catalogue buys nothing and the step returns false.
- "Lowest tier" is the smallest assured healing. Catalogue order breaks a tie: the earlier entry is the lower one. "Cheaper" is a strictly lower price. The budget floor ("basic" in the issue text) is the lowest price, then the lowest assured healing, then catalogue order. The step does not look up a tier by the name `basic`.
- Step-down walks cheaper tiers that are no stronger than the chosen tier, strongest first, and buys the first whose full count the purse can pay above one resurrection. If none fits, it buys as many of the floor tier as that budget pays, up to that tier's full count.
- A price of 0 is free, so the step does not divide the purse by zero. The purchase still keeps the reserve, because the purse does not move.
- The shop line stays `${company} buy ${count} ${tier} healing potion(s) from ${apothecary} for ${cost} gp.` One line, and no adventurer is named on the `service` movement.
- `scripts/assault.ts` looks up the tier named `basic` in the default catalogue itself, so it still typechecks after `basicTier` is removed. The script's drinking is unchanged.

### Closed by the orchestrator (2026-10-12)

Commits `e80c126` (the feature) and `3952642` (correction 1, tests only), both by Cursor. Review: the slice reviewer found the behaviour correct, worked the examples and five cases of its own through the step, confirmed the four fixture edits as forced, ran the long sweep (`no crashes in seeds 1-150 for 1500 hours`), and failed the first round on two surviving mutations (`floor` in the need; the strength filter of the step-down). The correction pinned both; the orchestrator confirmed the `floor` mutation now fails. 700 tests green, 6 skipped.

Reviewer notes, not corrected: buying reads the hero's own `maxHp`, so blessing hit points are excluded, unlike Bloodied; a pack key outside the catalogue counts toward the one-potion-per-hero floor but adds no healing.
