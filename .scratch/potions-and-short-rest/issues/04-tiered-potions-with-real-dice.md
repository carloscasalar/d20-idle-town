# Tiered potions with real dice

Status: ready-for-agent

Blocked-by: [03 - Hit Dice at the Short rest](03-hit-dice-at-the-short-rest.md)

## Parent

[PRD: Hit Dice at the short rest, four healing potion tiers and an apothecary that makes them](../PRD.md), slice 3 of 8. Vocabulary: [CONTEXT.md](../../../CONTEXT.md) (Healing potion, Assured healing, Bloodied).

## What to build

The single potion that heals a third of the drinker's hit points becomes the four SRD **Healing potion** tiers, rolled with real dice from the game's own seeded generator. The company's pack holds a count per tier, and a Bloodied hero drinks the smallest tier that covers what they are missing.

### Catalogue, prices and pack

- The catalogue is a configurable list of tiers. In this slice each tier has a name, a healing formula and a selling price. The production cost per tier is added by [issue 07](07-apothecary-production.md). Defaults:

  | Tier | Heals | Price (gp) | Assured healing |
  |---|---|---|---|
  | basic | 2d4+2 | 50 | 8 |
  | greater | 4d4+4 | 200 | 16 |
  | superior | 8d4+8 | 2,000 | 32 |
  | supreme | 10d4+20 | 20,000 | 50 |

- **Assured healing** is derived from the formula by the dice module of issue 03, never typed. "Smaller" and "stronger" tier mean lower and higher assured healing.
- Price no longer depends on the buyer's level. No gating by hero level or town size.
- The company's pack is a map from tier to count, with keys from the catalogue. The same shape travels through the combat options, the combat outcome (potions drunk per tier, subtracted by the Expedition), the company merger (added tier by tier), the game view and the UI ("2 basic, 1 greater"). No per-potion objects.

### Drinking

- One selection function, used between rounds in combat and at the Short rest: the smallest tier in the pack whose assured healing covers `maxHp - hp` (for a fallen hero, `maxHp`), otherwise the strongest tier in the pack. `maxHp` is the maximum in that fight, blessings and items included, as Bloodied already uses.
- Still at most one potion per Bloodied hero per round, between rounds and before the flee check, at no action cost. The companion who administers to a fallen hero is still the first conscious one in company order.
- Bloodied heroes are still served in company order. The **Potion sharing policy** arrives with [issue 06](06-potion-sharing-policy.md).

### Rolling and seeding

- Combat: the adapter rolls the chosen potion with the dice module and passes the total to the engine's `heal`. The engine only receives a number; its `rollDice` is never called. The roll comes from a dedicated child generator taken with one `seed()` draw right after placement, after every setup draw, so nothing before it moves and healing does not mirror the engine's stream. The combat options gain an optional dice source for tests. Log line, for example: "Nym drinks a greater healing potion (4d4+4: 14)".
- Short rest: the potions of step 3 roll from the same local generator as the Hit Dice, made from the rest's single seed, after every Hit Die of every hero. No extra world draw.
- Healing changes never shift unrelated world draws.

### Buying is temporary in this slice

Buying stays as today, adapted to the catalogue: **basic only, up to one per living hero, at the catalogue price** (50 gp), with the unchanged reserve of one resurrection, nothing from a ruined apothecary, and the full price paid to the apothecary's treasury as a `service` movement as today. This is deliberately temporary: [issue 05](05-buying-policy.md) replaces it with the stock target and tier choice. Do not build any part of the buying policy here.

### Starting gold

- `heroes.startingGoldPerLevel` goes from 20 to 50.

## Regression hashes

The six regression hash tests were skipped by issue 03. Leave them skipped. Do not re-record them or update the snapshot; [issue 09](09-retune-confirmation.md) does that once.

## Point to confirm while implementing

- Ticket 09 gives as the reason for `startingGoldPerLevel` 50 that a level 1 company with 20 gp could not buy the 50 gp potion. That reason does not hold: the potion budget is the purse minus one resurrection (190 gp at level 1), so a new company buys no potion before its first reward at 50 gp either. The value stays 50 because the sweep measured it as the closest fit to today's difficulty. Confirm the budget arithmetic in the code, and do not write the "cannot afford the potion" reason in `docs/CONFIGURATION.md` or `CHANGELOG.md`.

## Acceptance criteria

- [ ] The catalogue is configuration: four default tiers with name, formula and price; a tier can be dropped or changed.
- [ ] The pack is a map from tier to count in the company, combat options, combat outcome, merger, game view and UI.
- [ ] A Bloodied hero drinks the smallest covering tier, otherwise the strongest; a fallen hero counts `maxHp`.
- [ ] Potions heal their rolled formula, in combat and at the rest, and the log shows the potion and its roll.
- [ ] The combat potion roll comes from a sub-seed taken after placement; the rest potions roll from the rest's seed after the Hit Dice.
- [ ] A company buys basic potions only, up to one per living hero, at 50 gp each, keeping its resurrection reserve; nothing from a ruined apothecary.
- [ ] `heroes.potionBase`, `heroes.potionPerLevel`, `heroes.potionHealMinimum`, `heroes.potionHealDivisor` and the price and heal functions that read them are gone; the keys are rejected as unknown.
- [ ] `heroes.startingGoldPerLevel` defaults to 50.
- [ ] The six regression hash tests stay skipped and are not re-recorded.
- [ ] The suite is green.

### Tests

New:

- Drinking: the smallest covering tier, otherwise the strongest; a fallen hero counts `maxHp`.
- Engine stream: the same fight with potions rolled low or high has an identical engine log until the first drink.
- Configuration: every catalogue formula parses, prices are not negative, unknown or missing fields as today; the four removed keys are rejected as unknown.

Rewritten:

- The town service tests of the potion step, for the catalogue price and the temporary rule of this slice. Issue 05 rewrites them again for the final buying rule.

Survive, by scripting:

- The combat potion tests on seeds 1 and 2 and the "hp 18" expectation. The roll comes from a sub-seed after placement, so the fights are the same; a scripted source giving 3 and 3 makes 2d4+2 equal 8, the old heal of a 20 HP hero. Migrate them that way instead of re-deriving the scenarios.

Survive unchanged: `smoke`, `combat-space` seed 75, `lairs` seed 14, `deployment`, the seeded loops of the company roster tests.

Fixture migration:

- `potions` becomes a map from tier to count. About a dozen test files and the test helpers hold a company's shape; this slice migrates every one that sets `potions`. The game has no save files, so nothing else migrates.

## Configuration and documents

- Added: the potion catalogue (per tier: name, formula, price). The key name and its section are the implementer's choice, following the rule of `docs/CONFIGURATION.md` that a value lives in the section of the module that owns it.
- Removed: `heroes.potionBase`, `heroes.potionPerLevel`, `heroes.potionHealMinimum`, `heroes.potionHealDivisor`.
- Changed default: `heroes.startingGoldPerLevel` 20 to 50.
- `docs/CONFIGURATION.md`: the catalogue table; the removed keys; the `heroes` prose (the potion price and heal formulas go); `startingGoldPerLevel` 50.
- `docs/ARCHITECTURE.md`: the combat potion sub-seed and the rest potions in "Determinism and seeding"; the new tests in the test table.
- `CHANGELOG.md`: the four potion tiers rolled with real dice, the pack per tier, the new starting gold.

## Comments
