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
