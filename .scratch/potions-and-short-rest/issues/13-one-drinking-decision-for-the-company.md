# One drinking decision for the Company, applied in a fight and at a Short rest

Status: ready-for-agent
Category: enhancement

Found by the architecture review of 2026-10-12 and settled with the owner in the session that followed. It follows [ADR 0001](../../../docs/adr/0001-actor-decisions-live-with-the-actor.md): an actor's decisions live with the actor, and what a thing does lives with the thing.

## The problem

Which adventurers drink a Healing potion, in what order and which tier is a decision of the Company. It is written out twice, and neither copy lives with the Company:

- between the rounds of a fight, in `src/combat/battlecast.ts` (`runCombat`);
- at a Short rest, in `shortRest` of `src/sim/expedition.ts`.

Both run the same sequence: keep the Bloodied, order them by the Potion sharing policy, choose the tier, roll its formula, take the potion out of the pack, heal, narrate. They differ only in who may be given a potion (a fight has fallen adventurers and needs a conscious companion), in how the healing is applied (to the engine's creature, or to the adventurer), and in which pack is written (a fight works on a copy and reports what was drunk).

A third copy in `scripts/assault.ts` has already drifted from the rules. [Issue 14](14-assault-script-uses-rules-the-game-dropped.md) removes it by making the script play the real game.

A rule that weighs anything else the Company knows (a cleric in the company, for example) would have to be added in each copy.

## What to build

**The decision, once, with the Company.** In `src/adventurers/policies.ts`, one pure decision that plans a whole round of drinking. It is given the living adventurers in company order, each with their hit points, their maximum and whether they are conscious, plus the pack, the potion catalogue and the Company's policies. It returns the plan: an ordered list of who drinks, which tier, and who gives it to them when they are fallen. It applies:

- Bloodied, by the one existing definition;
- the order of the Company's Potion sharing policy;
- the choice of tier (the smallest stocked tier whose Assured healing covers the missing hit points, or the strongest stocked when none does; a fallen adventurer is missing their whole maximum). This choice moves out of `src/adventurers/potions.ts`;
- the conscious companion: a fallen adventurer is given the potion by the first conscious companion in company order, and when nobody is conscious nobody drinks;
- the pack running down as the plan is made, without writing the pack it was given.

It rolls no dice, heals nobody and changes nothing. It has no variants and no configuration of its own for now.

**The effect of one drink, once, with the potion.** In `src/adventurers/potions.ts`, one operation for what a potion does when it is drunk: roll its formula from the dice it is given, leave the pack, and give the drink's text. It returns the amount rolled so the caller can heal.

**The fight and the Short rest apply the plan.** Each describes its adventurers, asks for the plan, and for each drink applies the effect and heals in its own way. A fight still does not write the Company's pack: it works on its copy and reports what was drunk, and the Expedition subtracts it afterwards. At a Short rest every living adventurer is conscious, so there is no second variant of the decision.

## Behaviour

No behaviour of the game changes. The same dice are rolled from the same generators in the same order, the event and combat text is the same, and the regression snapshot and `scripts/tune-baseline.json` are not re-recorded.

The whole round can be planned before any die is rolled because no choice depends on a roll: each adventurer drinks at most once in a round and chooses by the hit points they are missing before drinking.

## Tests

- The expectations about order and about the choice of tier are tested once, against the decision, with plain data and no fight or Expedition context.
- `test/potion-sharing.test.ts` runs today the same expectations through a fight and through a Short rest. Those collapse onto the decision. One test stays for the fight and one for the Short rest, each showing that the plan is applied there: the dice rolled, the pack reduced and the text.
- The cases of `test/potions.test.ts` and `test/combat-potions.test.ts` that pin the choice of tier move to the decision's tests. Cases that pin which generator rolls a potion, or the pack accounting of a fight, stay where they are.
- No expected value changes. Name every test moved or removed in the report.

## Acceptance criteria

- [ ] `runCombat` and `shortRest` contain no filter for Bloodied, no call to the Potion sharing policy's order and no choice of tier; both obtain a plan from the Company's decision.
- [ ] Rolling a potion's formula, taking it from the pack and writing the drink's text happen in one operation of `src/adventurers/potions.ts`, used by both.
- [ ] The decision rolls no dice and writes neither the pack nor an adventurer; a test shows the pack and the adventurers it was given are unchanged after planning.
- [ ] A plan for a short pack reflects the pack running down: with one potion and two Bloodied adventurers, only the first in policy order drinks.
- [ ] The choice of tier is no longer exported from `src/adventurers/potions.ts`, and pack helpers nobody outside that file uses are no longer exported.
- [ ] The regression hash tests pass without re-recording, and `scripts/tune-baseline.json` is unchanged.
- [ ] `docs/ARCHITECTURE.md`, `docs/ARCHITECTURE-INTERFACES.md` and `docs/ARCHITECTURE-IMPROVEMENTS.md` describe the decision, the effect and where each lives.
- [ ] `pnpm typecheck` and `pnpm test` are green.

## Out of scope

- How many potions a Company buys. That decision stays in town services until a second purchase has to be weighed against it.
- Variants of the drinking decision, weights for them in the configuration, or a draw when a Company is constituted.
- The turn-back decision of the Short rest and the flee decision of a fight.
- `scripts/assault.ts` (issue 14). If it still has its own potion loop when this issue is built, change it only as far as it needs to typecheck.
- The count of encounters the Short rest paces Hit Dice over.

## Comments
