# Adventurers never drink their healing potions

Status: needs-info

## Problem

Companies buy healing potions at the apothecary and never drink them.

In the short rest (`breather` in `src/sim/expedition.ts`), an adventurer heals
`ceil(maxHp * 0.5)` and only then drinks a potion if `hp < maxHp * 0.5`.
`runCombat` returns living heroes with at least 1 hp, so after the heal they are
always above half and the potion branch is unreachable. The same code was in
`Game.breather` on `main`; the expedition refactor did not introduce it.

`test/expedition.test.ts` pins this as a known defect ("heals a living hero from
1 HP … without drinking a potion"). Delete those tests when this is fixed.

## Intended rule

Recorded in `CONTEXT.md` (Bloodied, Short rest, Healing potion):

- During an encounter, a bloodied adventurer drinks a healing potion if the
  company has one.
- After a short rest, an adventurer who is still bloodied drinks a healing
  potion if the company has one.

Bloodied means half or fewer of maximum hit points (`hp * 2 <= maxHp`).

`CONTEXT.md` describes the intended rule; the code does not implement it yet.

## Findings to build on

**The out-of-combat rule cannot fire while the short rest heals a flat 50%.**
The short rest itself has to change for the second rule to mean anything.

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
`src/combat/battlecast.ts` drives the fight one round at a time. A potion that
costs a hero's action would need a change in the engine. The Bonus Action rule
makes "between rounds, at no action cost" a fair approximation.

Source: https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf

## Open decisions

1. Short rest model: a Hit Dice pool per hero (level dice, refilled by the rest
   at the inn), a dice-free daily budget of about 90% of maximum hit points, or
   simply a smaller flat heal.
2. Potion strength and price: keep the game's values or move to the rulebook's.
3. In-combat drinking between rounds at no action cost: acceptable, or wait for
   engine support.
4. Whether in-combat potions come out of the same shared company supply, and
   how `runCombat` reports how many were drunk.

## Constraints

- This is a behaviour change, kept separate from the architecture refactors.
- It changes every seeded run: refresh
  `test/__snapshots__/simulation-regression.test.ts.snap` in the same commit and
  say so.
- It changes balance (deaths, wipes, gold spent at the apothecary): measure with
  `scripts/tune.ts` and `scripts/calibrate.ts` before and after.
- A Hit Dice pool that rolls dice adds draws to the world `Rng`; decide
  deliberately where in the roll order they go.

## Comments
