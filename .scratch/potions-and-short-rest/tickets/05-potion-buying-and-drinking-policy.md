# Potion buying and drinking policy

Type: grilling (wayfinder:grilling)
State: closed
Claimed-by: carloscasalar (session 2026-10-11)
Blocked-by: 04-potion-catalogue-and-availability

## Question

How does the company's shared supply work once there is more than one kind of potion?
- Representation of the supply (counts per tier, replacing the single `Party.potions`).
- What a company buys with its purse (which tier, how many, reserve rules in `src/town/services.ts`).
- Which potion a Bloodied hero drinks, and which a companion gives to a fallen hero, between rounds and after a short rest.

## Resolution

Decided with carloscasalar on 2026-10-11.

- **Supply.** `Party.potions` becomes a map from tier to count, with keys taken from the configurable catalogue ([04](04-potion-catalogue-and-availability.md)). The same shape travels through `CombatOptions.potions`, `CombatOutcome.potionsDrunk` (counts per tier, subtracted by Expedition), the company merger (adds tier by tier) and the UI ("2 basic, 1 greater"). No per-potion objects.
- **Assured healing.** One number per tier, derived from its configured formula and never typed by hand: each die counts as half its faces plus 1 (a d4 counts 3), plus the fixed bonus. Basic 8, greater 16, superior 32, supreme 50. It is a planning value for buying and for choosing which potion to drink; how much a potion really heals is the ticket [Healing rolls and seeded-run stability](06-healing-rolls-and-seeded-run-stability.md).
- **Stock target (company-wide).** For each living hero, `need = ceil(maxHp x potionCoverFraction)`, with `potionCoverFraction` a configuration value (default 0.5). The company wants the assured healing of its whole pack to reach the sum of the needs, and at least one potion per living hero (without that floor one supreme would "cover" two heroes, but only one can drink per round). Checked on the visit to the apothecary, as today. Replaces `alive.length - p.potions`.
- **Which tier to buy.** One tier per visit, one purchase, one log line. With `N` = sum of needs / living heroes, pick the highest offered tier whose assured healing is at most `N / 2` (about two drinks per hero), or the lowest tier if none. Buy the fewest potions of that tier that meet the target above. If the budget (gold minus the unchanged reserve, one resurrection) cannot pay for that count, step down to a cheaper tier whose count it can pay, and if even basic does not fit, buy as many basic as it affords. A tier the apothecary does not offer is skipped the same way. Result: low tiers dominate; a 32 HP fighter (need 16, `N / 2` = 8) buys two basic; a 90 HP hero (need 45, `N / 2` = 22.5) buys three greater; supreme only appears for heroes of about 200 HP or more.
- **Consequence at the defaults (measured on `fixedHp`, level cap 20).** Maximum hit points at level 20 run from 143 (monk) to 265 (barbarian), with fighter 224 and rogue 203. With `N / 2` as the tier limit: greater appears when the company averages about 64 maximum hit points (around level 6 to 8), superior at about 128 (around level 12 to 15), and supreme at about 200, which only a company of level 18 to 20 barbarians, fighters and rogues reaches. So supreme is practically never bought at the defaults, and the catalogue's top tier is mostly dead weight. Accepted for now; the retune may lower the `N / 2` divisor (make it a configuration value) or `potionCoverFraction`.
- **Which potion a hero drinks.** One selection function, used in combat between rounds and after the Short rest: the smallest tier in the pack whose assured healing covers `maxHp - hp` (for a fallen hero at 0, that is `maxHp`), otherwise the strongest tier in the pack. `maxHp` is the maximum in that fight, blessings and items included, as Bloodied already is. Still at most one potion per Bloodied hero per round; the companion who administers is still the first conscious one in company order.
- **Sharing policy.** Each company has a potion sharing policy behind a swappable interface, like the Hit Dice pacing in [03](03-short-rest-spending-policy.md). It decides the order in which Bloodied heroes get potions when the pack is short, in combat and after the Short rest. Two implementations: (a) company order, today's behaviour; (b) fallen heroes at 0 HP first, then the rest from the lowest to the highest hit point fraction. Drawn once when the company is constituted, from the simulation's seeded RNG, with weights in configuration (default 50 / 50; 100 / 0 reproduces today's behaviour). The company stores a small policies object, so buying or Hit Dice pacing could join later without changing callers. A merger keeps the host's policy. A company with no recorded policy (an older fixture or test setup) uses (a). The game has no save files, only the deterministic regression snapshot, so there is nothing to migrate beyond tests.
- **Configuration.** New: `potionCoverFraction`, sharing policy weights. `potionBase`, `potionPerLevel`, `potionHealMinimum` and `potionHealDivisor` leave, since price comes from the catalogue ([04](04-potion-catalogue-and-availability.md)) and healing from the formula; `potionHeal` and `potionCost` go with them. All documented in `docs/CONFIGURATION.md`.
- **Balance knobs.** `potionCoverFraction` and the policy weights join the movable knobs of [07](07-balance-targets.md); the reserve stays unchanged unless the retune needs it.
- **Passed on.** Real dice or assured values when potions are drunk, the extra RNG draw for the policy at company creation, and the effect on seeded runs: ticket [Healing rolls and seeded-run stability](06-healing-rolls-and-seeded-run-stability.md).
- **Glossary.** Healing potion, Assured healing and Potion sharing policy in `CONTEXT.md`; the two relationship lines about drinking rewritten.
