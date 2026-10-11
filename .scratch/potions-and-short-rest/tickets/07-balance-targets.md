# Balance targets for the retune

Type: grilling (wayfinder:grilling)
State: open
Claimed-by: carloscasalar (session 2026-10-11)
Blocked-by: —

## Question

What defines "retuned"? Which metrics from `scripts/tune.ts` (quests, failed, deaths per quest, wipes, raises, at each scale) must stay within what margin of the baseline in [issues/01-short-rest-and-potion-divergences.md](../issues/01-short-rest-and-potion-divergences.md), and which knobs (monster difficulty scales, rest frequency, potion supply) may move to get there?

## Notes from other tickets

- From [03-short-rest-spending-policy.md](03-short-rest-spending-policy.md): a Short rest now costs one tick per gap between encounters (so expeditions last longer and time-based rules shift), and the retreat check runs after the Hit Dice are spent, so `retreatHpFraction` no longer measures the raw end-of-fight state. Both must be accounted for in the targets and knobs.
