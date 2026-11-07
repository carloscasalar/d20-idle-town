---
status: accepted
---

# The being model is a new core, keeping only the leaf modules of the current game

The being model ([ADR 0002](0002-beings-decide-through-nature-mind-and-world.md)) turns the current game inside out: `Game`, `Board`, `CompanyRoster` and `Expedition` orchestrate everything from one loop, and the being model has no such loop. We build it as a new core, test first, instead of refactoring the current one. We carry over only the modules that do not depend on that loop: `core/` (rng, dice, xp, names, freeze), `items/`, the Healing potion tiers, Hit Dice, the coin ledger and the hero data. These modules come over with their own unit tests. The combat adapter comes over once the drinking round has moved out of it into the Party's Mind and its encounter description no longer depends on `quests/`. `CONTEXT.md` lists the behaviour worth keeping. The tests of the loop (contract lifecycle, expedition, company roster, board, simulation regression) stay behind as reference and are not ported.

## Considered Options

- **Refactor in place.** Rejected: the current game would have to keep working at every intermediate step, so each change would be paid for twice, and the regression snapshot pins outputs the new model will not reproduce.
- **Start with nothing.** Rejected: dice, the RNG, potions, Hit Dice and the coin ledger are already clean, tested and free of the loop.

## Consequences

- Determinism stays a property of the new core: one seed, plus a Journal for Minds that are not deterministic, reproduces a run. The outputs of the current game are not reproduced.
