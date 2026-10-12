# Potion catalogue and availability

Type: grilling (wayfinder:grilling)
State: closed
Claimed-by: carloscasalar (session 2026-10-11)
Blocked-by: —

## Question

Which potions does the game offer, at what price, and who can buy them?
- Basic only (2d4+2, 50 gp), with richer high-level companies simply buying and drinking more of them; or add greater, superior and supreme.
- Prices: the SRD footnote halves consumables (50 / 200 / 2,000 / 20,000 gp); the unhalved table gives 100 / 400 / 4,000 / 40,000 gp. See [research/healing-potion-tiers.md](../research/healing-potion-tiers.md). Which one applies, and are they configurable.
- How tiers are gated (hero level, town size, apothecary) given the SRD gives no level guidance and says Uncommon/Rare are usually found only in cities.

## Resolution

- **Catalogue: all four SRD tiers**, as data (a configurable list, so a configuration can drop tiers): basic 2d4+2, greater 4d4+4, superior 8d4+8, supreme 10d4+20. The basic-only option was rejected because a 2d4+2 potion is a rounding error for a high-level hero, and drinking is capped at one potion per Bloodied hero per round.
- **Selling price (what the company pays): 50 / 200 / 2,000 / 20,000 gp**, the SRD consumable-halved reading. Each price is a configuration value, replacing `potionBase` and `potionPerLevel`; price no longer depends on the buyer's level.
- **Production cost (what the apothecary pays): half the selling price**, 25 / 100 / 1,000 / 10,000 gp. The basic one matches the SRD Herbalism Kit's 25 gp of raw material. The apothecary earns the difference.
- **Availability is gated by the apothecary's treasury, not by hero level or town size.** There is one town and one apothecary, and the SRD ties no tier to a level. A tier is on offer when the apothecary is not ruined and its treasury still covers that tier's production cost **plus a reserve** after paying it, so a poor shop cannot stake everything on one potion. The reserve is a configuration value; its number belongs to the retuning.
- **Made on demand, no shelf.** At a sale the production cost leaves the world (a sink) and the selling price moves from the company's purse to the apothecary's treasury. Which coin movement reasons these use is left to the fog (town economy).
- **Deferred requirement:** a tier also needs a cleric on the apothecary's payroll, of a level able to cast the matching healing spell. Businesses have no employees yet, so for now treasury alone gates tiers; the requirement waits in the map's fog.
- **Which tier a company buys, and how many** is left to [Potion buying and drinking policy](05-potion-buying-and-drinking-policy.md).

## Comments

- 2026-10-11: [Town economy of potions](08-town-economy-of-potions.md) refines the availability rule: the apothecary offers `floor((treasury - reserve) / cost)` potions per tier, and the reserve is three days of its own upkeep.
- 2026-10-12: [Retuned values prototype](09-retuned-values-prototype.md) supersedes the availability rule above and the refinement of 08: the treasury gate, the reserve and `reserveDays` are removed. A tier is on offer whenever the apothecary is not ruined. Catalogue, prices, production cost and "made on demand, no shelf" stand. The production cost is a configuration value per tier (25 / 100 / 1,000 / 10,000 gp by default), decided by the owner while writing the PRD.
