# The assault script uses rules the game dropped

Status: needs-triage
Category: bug

Found by the architecture review of 2026-10-12. `scripts/assault.ts` estimates how often a Company clears a Bounty. It carries its own short version of what happens between two fights, written before the potions and Short rest work, so its percentages no longer describe the game.

## What it does today

- Between fights it heals every living adventurer for half their maximum hit points, for free. The game no longer has that rule: a Short rest spends Hit Dice.
- It gives the Company four basic potions and never restocks or uses another tier.
- It drinks when hit points are below half the maximum; Bloodied is half or less. ([Issue 13](13-one-drinking-decision-for-the-company.md) replaces this loop with the Company's drinking decision.)
- It turns back when half or fewer of the fighters are left, a line written into the script.
- It imports `COMBAT_RULES`, `QUEST_GENERATION` and `STARTING_GOLD` from `test/helpers/supplied-config`, so a script depends on test code.

## To decide

- Whether the script should run the real Expedition (Short rest, Hit Dice, turn-back) between fights, or be deleted in favour of `scripts/tune.ts`, which already measures whole games.
- Where the values it takes from the test helper should come from.

## Comments
