# Short rest and healing potion divergences from D&D 2024

Status: needs-triage

## Remaining divergences and ideal behaviour

1. **Short Rest recovery.** `shortRest` heals a configured flat fraction of
   maximum hit points, rounded up (default 0.5). A living adventurer still
   Bloodied afterwards drinks one potion while the company has supplies.
   **Ideal:** spend Hit Dice from a daily pool, rolling each die plus the
   Constitution modifier (minimum 1), and recover the pool on a Long Rest.
2. **Potion strength and price.** A potion heals `max(8, ceil(maxHp / 3))` and
   costs `25 + 10 × level` gp.
   **Ideal:** a Potion of Healing restores 2d4 + 2 hit points and costs 50 gp.
3. **Potion timing in combat.** After every unfinished round, before the flee
   check, each conscious Bloodied hero drinks one potion while the shared supply
   lasts; a fallen hero at 0 HP receives one from a conscious companion if any
   remain. Bloodied uses the maximum HP in that fight, including blessings and
   items. `CombatOptions.potions` supplies the pack; `CombatOutcome.potionsDrunk`
   reports consumption for Expedition to subtract. Healing uses the engine's
   public `Encounter.heal` call and the game's existing `potionHeal` amount.
   **Ideal:** drinking or giving the potion to a creature within 5 feet costs a
   Bonus Action on the hero's turn. Between rounds at no action cost remains
   the accepted approximation because the engine cannot model that Bonus Action.
4. **Administering a potion.** The first conscious companion in company order
   gives a potion to a living hero at 0 HP. The game checks neither the distance
   between them nor whether the companion has a Bonus Action available. If no
   hero is conscious, no potion is used.
   **Ideal:** the conscious companion must be within 5 feet of the recipient
   and spend their Bonus Action on their turn to administer the potion.

Hit Dice, potion strength and price, and difficulty retuning are deferred.

## D&D findings

**D&D 2024 short rest (SRD 5.2.1, verified).** A level-N character has N Hit
Dice per day, all regained on a long rest. At a short rest they spend any number;
each heals one roll plus the Constitution modifier, minimum 1. Die size: d12
Barbarian; d10 Fighter, Paladin, Ranger; d8 Bard, Cleric, Druid, Monk, Rogue,
Warlock; d6 Sorcerer, Wizard. The whole pool is worth about 85–90% of maximum
hit points for the day (about 65% at level 1); one die is about 0.9/N of maximum.
The current flat 50% per rest can total 250% over a six-encounter contract.

**D&D 2024 Potion of Healing (SRD 5.2.1, verified).** Heals 2d4 + 2, costs
50 gp, and is a Bonus Action to drink or to give to a creature within 5 feet.
The game's potion heals about a third of maximum hit points and costs
`25 + 10 × level` gp.

**In-combat drinking is feasible only between rounds.** battlecast-engine has no
potions, but it exposes a heal call and `runCombat` in
`src/combat/battlecast.ts` drives the fight one round at a time. Modelling
potion drinking as a Bonus Action on a hero's turn would need engine support
in this adapter. The Bonus Action rule makes "between rounds, at no action cost" a fair approximation.

Source: https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf

## Balance measurement

Both runs use `pnpm exec vite-node scripts/tune.ts`: 600 ticks, seeds 1, 2, 3,
and the script's unchanged scales. `tsx` is not installed; the installed
`vite-node` runner executes the script successfully. No tuning values changed.

| Before | After |
| --- | --- |
| `scale 1: quests 143  failed 25  deaths 69 (0.48/quest)  wiped 4.7 of 25  raised 12` | `scale 1: quests 139  failed 18  deaths 61 (0.44/quest)  wiped 5.0 of 23  raised 11` |
| `scale 1.25: quests 109  failed 38  deaths 117 (1.07/quest)  wiped 10.3 of 40  raised 15` | `scale 1.25: quests 100  failed 40  deaths 117 (1.17/quest)  wiped 9.7 of 38  raised 15` |
| `scale 1.5: quests 70  failed 43  deaths 133 (1.90/quest)  wiped 13.7 of 43  raised 13` | `scale 1.5: quests 79  failed 39  deaths 118 (1.49/quest)  wiped 10.3 of 39  raised 9` |
| `scale 1.75: quests 72  failed 49  deaths 140 (1.94/quest)  wiped 11.0 of 45  raised 14` | `scale 1.75: quests 63  failed 45  deaths 146 (2.31/quest)  wiped 15.7 of 44  raised 13` |

### Correction 1

Measured again with the same runner, 600 ticks, seeds 1, 2, 3 and unchanged
scales. The reported aggregate balance numbers are identical; potion
administration narration changes the regression trajectories.

| Before correction 1 | After correction 1 |
| --- | --- |
| `scale 1: quests 139  failed 18  deaths 61 (0.44/quest)  wiped 5.0 of 23  raised 11` | `scale 1: quests 139  failed 18  deaths 61 (0.44/quest)  wiped 5.0 of 23  raised 11` |
| `scale 1.25: quests 100  failed 40  deaths 117 (1.17/quest)  wiped 9.7 of 38  raised 15` | `scale 1.25: quests 100  failed 40  deaths 117 (1.17/quest)  wiped 9.7 of 38  raised 15` |
| `scale 1.5: quests 79  failed 39  deaths 118 (1.49/quest)  wiped 10.3 of 39  raised 9` | `scale 1.5: quests 79  failed 39  deaths 118 (1.49/quest)  wiped 10.3 of 39  raised 9` |
| `scale 1.75: quests 63  failed 45  deaths 146 (2.31/quest)  wiped 15.7 of 44  raised 13` | `scale 1.75: quests 63  failed 45  deaths 146 (2.31/quest)  wiped 15.7 of 44  raised 13` |

## Comments
