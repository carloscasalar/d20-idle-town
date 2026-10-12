# Hit Dice pool model

Type: grilling (wayfinder:grilling)
State: closed
Claimed-by: carloscasalar (session 2026-10-11)
Blocked-by: —

## Question

How does a hero's Hit Dice pool work in this game?
- Where does the state live (on `Hero`), and what does a level-up do to the pool?
- The die size per class (SRD: d12 Barbarian; d10 Fighter, Paladin, Ranger; d8 Bard, Cleric, Druid, Monk, Rogue, Warlock; d6 Sorcerer, Wizard).
- Where the Constitution modifier comes from (engine gives +2 for every class today).
- When the pool recovers. Already decided: all dice return on a Long Rest, which happens on return to town after an inn rest of at least 8 hours. Confirm how that maps onto the Expedition's return and recovery.

## Resolution

- **Per hero, stored as spent dice.** `Hero` gets one field, `hitDiceSpent`, starting at 0 in `createHero`. Remaining dice are `level - hitDiceSpent`, so the maximum is the level. Gaining a level therefore adds a die and leaves spent ones spent, with no level-up code. The engine does not do this for the game: it has no pool and no rests, it only returns stats for a level.
- **Die size and Constitution** come from the engine's `hpFormula`, parsed in one function in `hero.ts` that throws a clear error if the format changes, with a test. The SRD table is not duplicated in the game.
- **Recovery** is the end of the `resting` stage after a homecoming (`restTicks`, 8 hours), in the block that already heals living heroes to full. This is the **Long rest**. It applies whether or not the company pays for rooms and whether or not the tavern is ruined. A test must verify that `hitDiceSpent` goes back to 0 after the rest.
- **Death and resurrection** do not touch the pool; the hero recovers it at the next Long rest.
- **Not modelled:** the limit of one Long rest per 24 hours. Documented as a divergence.
- **Glossary:** Hit Dice and Long rest added to `CONTEXT.md`.
