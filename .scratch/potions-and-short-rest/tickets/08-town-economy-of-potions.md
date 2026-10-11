# Town economy of potions

Type: grilling (wayfinder:grilling)
State: closed
Claimed-by: carloscasalar (session 2026-10-11)
Blocked-by: —

## Question

How do potions move gold through the town, and what happens to the town when the apothecary is poor or ruined?
- Which coin movement reasons the sale and the production use, and which counters and lifetime statistics each touches (`src/town/coin.ts`). Today a company pays the apothecary with the `service` reason; [04](04-potion-catalogue-and-availability.md) makes the production cost (half the price) leave the world as a sink while the full price moves from the company's purse to the apothecary's treasury.
- The numeric reserve the apothecary keeps ([04](04-potion-catalogue-and-availability.md) left it to the fog): its configuration name, whether it is an absolute amount or scales with something, and how it relates to the treasury other duties already draw on (posting threshold, rewards taking up to `treasuryShare` of the treasury, daily upkeep).
- How the offer rule reads for a purchase of several potions: per potion, or for the whole batch, and what the company can buy when the treasury covers only part of it ([05](05-potion-buying-and-drinking-policy.md) steps down tiers by budget but does not say how the apothecary side limits the count).
- A poor or ruined apothecary over a long run: what a company does with no potions on offer, whether the shop can recover (ruin is permanent today), and whether the potion margin should be allowed to rescue or sink it.

## Notes from other tickets

- From [04](04-potion-catalogue-and-availability.md): made on demand, no shelf; a tier is offered while the apothecary is not ruined and its treasury covers the production cost plus a reserve; the reserve's number belongs to the retuning, the reason names to this ticket.
- From [07](07-balance-targets.md): the apothecary's starting treasury and the reserve are movable knobs only if the retune needs them. This ticket fixes the reserve's shape and a default; [09](09-retuned-values-prototype.md) may move the default.
- Facts of the current code, for orientation: the apothecary is a merchant employer with 1 to 2 holdings out of herb gardens (30 gp/day) and lumber camp (40 gp/day), each times 0.7 to 1.3, upkeep 35% to 55% of that income, an opening treasury of 800 to 1,600 gp, ruin after `ruinDays` (3) in debt. It also posts contracts like any employer.

## Resolution

Decided with carloscasalar on 2026-10-11. Facts measured on `main` for this ticket (30 seeds, unchanged code): the apothecary was never ruined in 600 ticks and in 2 of 30 runs in 3,000 ticks; its treasury ended at about 5,500 gp after 600 ticks (opening 800 to 1,600) and about 3,800 gp after 3,000, with minimums averaging 1,150 and -84. The SRD research is in [research/potion-crafting-time.md](../research/potion-crafting-time.md).

- **Coin reasons.** The sale uses the existing `service` reason: the company's purse pays the apothecary's treasury the full price, counting as `goldSpentByHeroes`, as today. No adventurer is named, so no `goldSpent` per hero moves. The production cost is a new reason `production`, in code with the rest of the reason table: a sink out of the apothecary's treasury with `spent` true and every other effect false. `spent` must be true because tests hold that each treasury equals its opening plus `earned` minus `spent`. Per potion the sink runs first and the sale second, with no event between them, as `retirement` does.
- **Statistic.** A new lifetime statistic among the coin effects, working name `goldSpentOnProduction`, moved only by `production`, so the retune can measure how much gold the potions remove from the world. No count per tier; that is read from the sales.
- **What the apothecary offers.** Computed when the company arrives, before any sale: of each tier, `floor((treasury - reserve) / production cost)` potions, never below zero, and none when the apothecary is ruined. The company buys the fewest it wants of its chosen tier, limited to that count; [05](05-potion-buying-and-drinking-policy.md)'s step-down to a cheaper tier now also triggers when the apothecary cannot offer enough. This refines [04](04-potion-catalogue-and-availability.md)'s "offered while the treasury covers the cost plus a reserve". Consequence for the retune: the supreme tier (10,000 gp per potion) needs more than 10,000 gp in the treasury on top of the company's own buying limit.
- **Reserve.** Gold kept back from production so a purchase never leaves the apothecary short of the days that separate it from ruin: `reserveDays x upkeepPerDay` of that apothecary, with `reserveDays` a configuration value defaulting to 3 (the same as `ruinDays`, which is a different setting that this one does not read). About 20 to 165 gp for the shops generated today. The default is a first guess; the retune ([09](09-retuned-values-prototype.md)) may move it.
- **Production time (deviation, documented).** The SRD asks for 1 day of work per basic potion, and 5, 25 and 62.5 days for the other tiers, one potion per batch, with no rule for a shop making them on demand ([research](../research/potion-crafting-time.md)). The game keeps production instant: a configuration table of production ticks per tier, with every value 0, so time can be switched on later without changing the model. The documentation says so as a deviation. Time and the apothecary's staff go together and are in the map's fog.
- **Rewards.** No special rule. The apothecary has one treasury; potion margin can grow the rewards it posts, and a large reward can lower the treasury enough to switch tiers off. The retune watches this through the apothecary's treasury and the new statistic.
- **Poor or ruined apothecary.** No new rule. With nothing on offer the purchase step returns false and the company goes on with the Hit Dice and whatever potions it still carries. Ruin stays permanent for every service. A retired adventurer taking over a ruined business and bringing their own wealth is a separate idea, in the map's fog.
- **Documentation.** The correction to `healing-potion-tiers.md` (its "Magic Item Crafting Cost" line gives the table values before the consumables halving; the raw material cost is half) is in the map's fog under documentation updates. The production costs of [04](04-potion-catalogue-and-availability.md) match the SRD raw materials exactly.
- **Glossary.** Healing potion's supply sentence rewritten and Apothecary reserve added in `CONTEXT.md`.

- 2026-10-11: [Retuned values prototype](09-retuned-values-prototype.md) refines "Rewards: no special rule": a Contract done for the apothecary gives it a production discount (half cost) until the savings equal the reward. Without it, 12 of 20 apothecaries were ruined in 3,000 ticks; with it, 7 of 20.
