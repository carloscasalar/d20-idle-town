# Town economy of potions

Type: grilling (wayfinder:grilling)
State: open
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
- From [07](07-balance-targets.md): the apothecary's starting treasury and the reserve are movable knobs only if the retune needs them; this ticket fixes the reserve's meaning, the retune picks its value.
- Facts of the current code, for orientation: the apothecary is a merchant employer with 1 to 2 holdings out of herb gardens (30 gp/day) and lumber camp (40 gp/day), each times 0.7 to 1.3, upkeep 35% to 55% of that income, an opening treasury of 800 to 1,600 gp, ruin after `ruinDays` (3) in debt. It also posts contracts like any employer.
