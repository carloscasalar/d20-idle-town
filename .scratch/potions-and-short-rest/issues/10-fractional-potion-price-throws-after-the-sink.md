# A fractional potion price throws after the production sink

Status: ready-for-agent

Found during the implementation run of this PRD (turn 06, [issue 07](07-apothecary-production.md)), by the implementer and confirmed by the reviewer. Not reachable with the default configuration.

## What happens

The validation of a potion tier in `src/sim/config.ts` accepts a selling price that is not a whole number (it only rejects a negative one). Coin movements only move whole gold. With a tier priced at 1.5 gp and a production cost of 7 gp, a company that can afford it visits the apothecary: the `production` sink runs (treasury down 7, `spent` up 7) and then the `service` sale throws. Before issue 07 the same configuration threw too, but with nothing moved.

## What it should do

Reject it at configuration time: a tier's `price` is a whole number, as `productionCost` already is. A test in `test/game-config.test.ts` next to the production cost validation.

## Same class, found by the review of issue 04

A healing formula whose total can be negative, such as `1d4-20`, also passes validation (the dice module accepts negative bonuses because a Hit Die needs them). A potion tier's formula should not be able to heal less than 1; reject it at configuration time as well.

## Comments

- Turn 09 decisions: the whole-number rule is on the potion tier's `price` only, the same `integer: true` flag `productionCost` already uses. Other prices keep the shared price rule.
- A formula is rejected when its lowest total is below 1. That total is the parsed die count plus the bonus, because each die rolls at least 1. It is not rolled, and it is not the average or the assured healing. `1d4` and `2d4-1` stay valid (lowest total 1). `1d4-1` is the lowest total 0. `1d4-3` rolls -2, -1, 0 or 1, so its lowest total is -2, not 0. `1d4-20` is -19. The error is `potions.tiers[N].formula: lowest total N is below 1`.
- `src/core/dice.ts` is unchanged, so a Hit Die can still carry a negative bonus.
- Review fixed point: the starting HEAD `c1c5623`.
- Final checks: `pnpm typecheck` passes; `pnpm test` passes with 754 tests and none skipped. The six hash files are untouched. Full report: `../run/turns/09-10-fractional-potion-price-report.md`.
