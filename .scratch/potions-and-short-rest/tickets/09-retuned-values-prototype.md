# Retuned values prototype

Type: prototype (wayfinder:prototype)
State: open
Claimed-by: —
Blocked-by: 08-town-economy-of-potions

## Question

Which concrete values make the new rules pass the acceptance of [Balance targets for the retune](07-balance-targets.md)? A throwaway economy and combat model (not the shipped code) lets us react to numbers before the PRD fixes them.

Values to choose, all within the knobs [07](07-balance-targets.md) allows:
- `potionCoverFraction` (0.5 by default, [05](05-potion-buying-and-drinking-policy.md)).
- The sharing policy weights (50 / 50 by default).
- The tier divisor of the buying rule, currently the fixed `N / 2` of [05](05-potion-buying-and-drinking-policy.md). Candidate knob for the supreme tier question: at the defaults only a company averaging about 200 maximum hit points buys it, so the top tier is practically dead. Decide whether to make the divisor a configuration value and lower it, change `potionCoverFraction`, or accept an unreachable supreme tier.
- `board.difficultyScale` default, `expedition.retreatHpFraction`, encounters per Contract or Bounty, and the starting purse of new level-1 companies (`heroes.startingGoldPerLevel`).
- The apothecary's reserve and starting treasury, only if the model shows they are needed (their meaning is fixed by [Town economy of potions](08-town-economy-of-potions.md)).

The prototype is judged against the acceptance of [07](07-balance-targets.md): all five `tune.ts` metrics within +/-15% at scales 1.15 and 1.5 over seeds 1 to 80, and deaths per quest still rising with the scale at 1, 1.25 and 1.75. Part of the ticket is deciding how much of the real simulator the prototype can reuse and what that means for how far its numbers can be trusted; the final confirmation with the real `tune.ts` belongs to implementation and goes in the PRD as a check.

## Notes from other tickets

- From [03](03-short-rest-spending-policy.md): a Short rest costs one tick per gap, and `retreatHpFraction` is evaluated after the Hit Dice are spent.
- From [06](06-healing-rolls-and-seeded-run-stability.md): healing rolls are real dice; the model must roll, not average.
- The prices, healing formulas and Hit Dice rules do not move ([07](07-balance-targets.md)).
