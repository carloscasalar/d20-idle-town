# Apothecary production

Status: ready-for-agent

Blocked-by: [04 - Tiered potions with real dice](04-tiered-potions-with-real-dice.md)

## Parent

[PRD: Hit Dice at the short rest, four healing potion tiers and an apothecary that makes them](../PRD.md), slice 6 of 8. Vocabulary: [CONTEXT.md](../../../CONTEXT.md) (Healing potion, Coin movement, Treasury).

## No questions

The owner is not available while this issue is built. Do not ask and do not wait for an answer. Where this issue or the PRD leaves a choice to the implementer (key names, file locations, log wording), decide and write the decision under Comments. Where this issue gives a rule for a doubt or a failure, follow it.

## What to build

The apothecary stops selling potions out of nothing. It makes each potion on demand, instantly, paying a production cost that leaves the world, and earns the difference between price and cost.

- Each catalogue tier gains a production cost, a configuration value per tier, not derived from the price. Defaults: basic 25, greater 100, superior 1,000, supreme 10,000 gp.
- Production: a new coin reason `production`, in code with the rest of the reason table: a sink out of the apothecary's treasury with `spent` true and every other effect false.
- Sale: unchanged, the existing `service` reason. The company's purse pays the apothecary's treasury the full price, counting as `goldSpentByHeroes`; no adventurer is named.
- Per potion the sink runs first and the sale second, with no event between them.
- A new lifetime gold statistic, `goldSpentOnProduction`, moved only by `production`, exposed wherever the other gold statistics are. No count per tier.
- Made on demand, no shelf. The apothecary offers every tier whenever it is not ruined. There is no treasury gate, no reserve and no `reserveDays`: these appeared only in tickets and must not be built. Ruin stays permanent.
- Production is instant. A configuration table of production ticks per tier exists with every value 0. The model reads the table, but a non-zero value has no behaviour; the documentation says so.
- `scripts/tune.ts`: the apothecary report of issue 02 now prints `goldSpentOnProduction`.

Issues 05, 06 and 07 are independent of one another. This issue and issue 05 both edit the `potions` service step; whichever lands second rebases onto the first. The sink-then-sale rule holds for every potion sold, under the temporary buying rule of issue 04 or the policy of issue 05.

## Regression hashes

The six regression hash tests were skipped by issue 03. Leave them skipped. Do not re-record them or update the snapshot; [issue 09](09-retune-confirmation.md) does that once.

## Acceptance criteria

- [ ] Selling a potion sinks its production cost from the apothecary's treasury and then pays the full price into it; the treasury nets price minus cost.
- [ ] `production` moves `spent` and `goldSpentOnProduction` only.
- [ ] `goldSpentOnProduction` is exposed with the other gold statistics and printed by the `tune.ts` apothecary report.
- [ ] Each treasury still equals opening plus earned minus spent.
- [ ] A non-ruined apothecary offers every tier whatever its treasury; no gate, reserve or `reserveDays` exists.
- [ ] The production cost per tier and the production ticks per tier are configuration, validated: costs are not negative, ticks are whole numbers.
- [ ] The production ticks default to 0 for every tier.
- [ ] The six regression hash tests stay skipped and are not re-recorded.
- [ ] The suite is green.

### Tests

New:

- Coin: `production` sinks from the treasury, moves `spent` and `goldSpentOnProduction` only; the sink precedes the sale; the treasury identity still holds.
- Configuration: validation of the production cost and the production ticks.

Prior art: the coin movement tests that hold each treasury equal to opening plus earned minus spent.

## Configuration and documents

- Added: the production cost per tier in the catalogue (25 / 100 / 1,000 / 10,000); the production ticks per tier, default 0 for all. Key names and sections are the implementer's choice, following the rule of `docs/CONFIGURATION.md` that a value lives in the section of the module that owns it.
- Removed: none.
- Not configuration: the `production` reason's effects.
- `docs/CONFIGURATION.md`: the production cost column; the production ticks table; a statement of the production-time deviation: the SRD asks for 1 / 5 / 25 / 62.5 days per potion, the game makes them instantly, the table of ticks is the switch and is all zero.
- `docs/ARCHITECTURE.md`: the `production` reason and `goldSpentOnProduction` where the coin reasons and statistics are described; the new tests in the test table.
- `CHANGELOG.md`: apothecary production and the new statistic.

## Comments


- Turn 06 decisions: each purchased potion has its own `production` sink and
  full-price `service` transfer, in that order. A purchase of several potions
  repeats these adjacent pairs, then adds the pack and emits the existing single
  receipt for the full bill. No adventurer is named on either movement. This
  preserves issue 05's one-tier visit, total hero spending and log wording.
- `productionCost` and `productionTicks` live on each `potions.tiers` catalogue
  row. Both are required, finite, non-negative whole numbers: the coin interface
  takes whole gold pieces, so fractional production costs are rejected before
  play. Costs are independent of selling prices. The ticks table defaults to
  zero throughout; the service reads the configured value but nonzero values
  deliberately leave production instant, as this issue specifies.
- Test seams are the public coin interface, the configured `potions` service
  step, configuration validation, `Game.view()` at receipt and after the hour,
  and the tuning tracker/formatter. Required statistic/catalogue fixture fields
  are migrated. Existing potion buying tests change only production accounting
  assertions and required fields; buying policy cases and receipt expectations
  remain the same. The conservation audit counts the new production sink;
  economic expectations now include it. The six hash tests and snapshots,
  guarded seeds and guarded expectations remain unchanged.
- Review fixed point: the starting HEAD `c75fa65`; review this turn's working
  diff against that commit under both Standards and Spec.
- Review corrections: expose production spending beside the UI's gold statistics
  in both the Town summary and statistics bar. Update the Healing potion
  definition in `CONTEXT.md` so production defaults are described as independent
  configuration, and the existing hourly service test accounts for the new sink.
- Out-of-scope bug found and reproduced: the unchanged selling-price validator
  accepts a fractional potion price (for example 1.5 gp), but coin movements
  require whole gold pieces. An affordable purchase with productionCost 7
  sinks production first, then the per-potion service payment throws. Rule 5
  leaves price validation/fractional coin support for separate work; aggregating
  sales to hide this would violate the required per-potion movement pairs.
- Final checks: `pnpm typecheck` passes; `pnpm test` passes with 727 tests
  passed and six hash tests skipped. The 150-seed, 1,500-hour crash sweep
  completes with no crashes. All 11 targeted mutations fail the tests. Final
  Standards and Spec reviews have no remaining findings. Browser smoke is
  unavailable because there is no connected browser and native browser access
  was denied. Full report: `../run/turns/06-07-apothecary-production-report.md`.
