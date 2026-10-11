# Potion sharing policy

Status: ready-for-agent

Blocked-by: [04 - Tiered potions with real dice](04-tiered-potions-with-real-dice.md)

## Parent

[PRD: Hit Dice at the short rest, four healing potion tiers and an apothecary that makes them](../PRD.md), slice 5 of 8. Vocabulary: [CONTEXT.md](../../../CONTEXT.md) (Potion sharing policy, Bloodied, Company roster).

## No questions

The owner is not available while this issue is built. Do not ask and do not wait for an answer. Where this issue or the PRD leaves a choice to the implementer (key names, file locations, log wording), decide and write the decision under Comments. Where this issue gives a rule for a doubt or a failure, follow it.

## What to build

Companies differ in how they share a short pack. Each company has a **Potion sharing policy**, chosen once when it is constituted, that orders its Bloodied heroes when potions are handed out, between rounds in combat and at step 3 of the Short rest.

- The policy sits behind a swappable interface. Two implementations:
  - (a) company order, today's behaviour;
  - (b) fallen heroes at 0 hit points first, then the rest from the lowest to the highest hit point fraction.
- The policy is drawn once when the company is constituted, from the simulation's seeded generator, at a fixed place in company creation, with configurable weights (default 50 / 50; 100 / 0 reproduces today's order).
- The company stores a small policies object holding it, so buying or Hit Dice pacing can join later without changing callers.
- A merger keeps the host's policies.
- A company with no recorded policy uses (a).
- The policy only orders who is served. Which tier each hero drinks (issue 04) and who administers to a fallen hero (the first conscious companion in company order) do not change.

Issues 05, 06 and 07 are independent of one another.

## Regression hashes

The six regression hash tests were skipped by issue 03. Leave them skipped. Do not re-record them or update the snapshot; [issue 09](09-retune-confirmation.md) does that once.

## Acceptance criteria

- [ ] With a short pack, a company on policy (a) serves its Bloodied heroes in company order, in combat and at the rest.
- [ ] With a short pack, a company on policy (b) serves fallen heroes first, then from the lowest to the highest hit point fraction, in combat and at the rest.
- [ ] The policy is drawn once per company at a fixed place in company creation from the seeded generator; a seed reproduces its own run.
- [ ] Weights 100 / 0 always draw company order.
- [ ] A merged company keeps the host's policies.
- [ ] A company with no recorded policy behaves as (a).
- [ ] The weights are configuration, default 50 / 50, validated: the list is not empty or all zero.
- [ ] The six regression hash tests stay skipped and are not re-recorded.
- [ ] The suite is green.

### Tests

New:

- Sharing: both orders; the default for a company with no policy; a merger keeps the host's; the weights 100 / 0 always draw company order.
- Configuration: validation of the weights.

Survive unchanged, according to the PRD: `smoke` (determinism and interleaving), `combat-space` seed 75, `lairs` seed 14, `deployment`, the seeded loops of the company roster tests, and the combat potion tests migrated by issue 04 (a company with no recorded policy uses company order). This slice adds a draw to company creation. If one of these tests breaks, first look for a fixed place in company creation where the draw does not break it. If there is none, migrate the test keeping what it checks (a new seed or a new expectation) and write in the Comments which test changed and why.

Fixture migration:

- Companies gain a policies object. About a dozen test files and the test helpers hold a company's shape; this slice migrates those that need the new field.

## Configuration and documents

- Added: the sharing policy weights, default 50 / 50. The key name and its section are the implementer's choice, following the rule of `docs/CONFIGURATION.md` that a value lives in the section of the module that owns it.
- Removed: none.
- Not configuration: the Hit Dice pacing strategy.
- `docs/CONFIGURATION.md`: the weights and the two orders.
- `docs/ARCHITECTURE.md`: the policy draw in "Determinism and seeding"; the policies object on the company; the new tests in the test table.
- `CHANGELOG.md`: the Potion sharing policy.

## Comments
