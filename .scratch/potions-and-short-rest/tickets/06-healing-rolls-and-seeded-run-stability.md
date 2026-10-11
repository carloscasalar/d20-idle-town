# Healing rolls and seeded-run stability

Type: grilling (wayfinder:grilling)
State: open
Claimed-by: —
Blocked-by: 03-short-rest-spending-policy, 05-potion-buying-and-drinking-policy

## Notes from other tickets

- From [05-potion-buying-and-drinking-policy.md](05-potion-buying-and-drinking-policy.md): each tier has an "assured healing" value (half the faces plus 1 per die, plus the bonus) used only to plan purchases and to pick which potion to drink; this ticket decides what a potion actually heals. Each company also draws a sharing policy from the seeded RNG when it is constituted, which is one more draw and moves seeded trajectories on its own.

## Question

Are Hit Die and potion rolls real dice drawn from the simulation's seeded RNG, or averages? Where do rolls happen (expedition code, or the combat adapter through the engine's `heal`)? What does the change do to seeded trajectories and the existing regression and characterisation tests?
