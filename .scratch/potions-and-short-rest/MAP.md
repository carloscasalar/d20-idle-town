# Map: short rest and healing potions in D&D 2024 terms

Label: wayfinder:map

## Destination

A `PRD.md` in this directory that decides how the game models Hit Dice at a short rest, healing potion tiers, and the difficulty retuning they force, ready to be split by `to-issues`. Implementation is not part of this map.

## Notes

- Starting material: [issues/01-short-rest-and-potion-divergences.md](issues/01-short-rest-and-potion-divergences.md). Do not edit it.
- Domain language lives in `CONTEXT.md` (Short rest, Healing potion, Bloodied, Expedition). Consult it, and sharpen it while grilling.
- Rules win over game balance (D&D 2024 by default), but a deviation is allowed when it is documented and has a configuration knob, as in `docs/CONFIGURATION.md`. Retune difficulty to absorb the rule, not the other way round.
- `battlecast-engine` 0.1.1 is the latest published version (checked 2026-10-11). It has no Bonus Action modelling. `buildHero` gives Constitution 14 (+2) to every class tested and its `hpFormula` (for example `5d10+10`) carries the hit die size and the Constitution bonus. The engine models one battle from a fresh start: it has no Hit Dice pool and no rests, so the pool is game state.
- Long Rest (decided): restores all Hit Dice. It is the existing `resting` stage after a homecoming (`restTicks`, 8 hours); a test must prove the pool is reset there. If travel between adventures ever skips the town, the company must camp 8 hours to get the same benefit. This map only decides when the Hit Dice pool recovers, nothing more about Long Rest.
- Price of stronger potions: the SRD rarity table gives 100/400/4,000/40,000 gp for Common/Uncommon/Rare/Very Rare, with a footnote halving consumables. See [research/healing-potion-tiers.md](research/healing-potion-tiers.md).
- Future hook, not in this map: brewing potions during free time by a caster whose background grants Herbalism Kit proficiency (wizard, warlock, sorcerer, cleric, perhaps paladin and ranger). Keep the potion model open to it.
- Tickets live in [tickets/](tickets/). Each has `Type`, `State`, `Claimed-by` and `Blocked-by` lines. Frontier = open, unclaimed, every blocker closed.

## Decisions so far

- [Stronger healing potions in D&D 2024](tickets/01-stronger-healing-potions.md) — four potions (2d4+2, 4d4+4, 8d4+8, 10d4+20) by rarity; only the basic one has an SRD price of its own; stronger prices follow from the rarity table.
- [Hit Dice pool model](tickets/02-hit-dice-pool-model.md) — one pool per hero stored as dice spent (max = level, so a level-up needs no update); die size and Constitution read from the engine's `hpFormula`; reset at the end of `resting` with a test; death and resurrection leave it alone.
- [Short rest spending policy](tickets/03-short-rest-spending-policy.md) — rest only when someone is hurt, costs one logged tick; dice spent by a swappable pacing strategy (default `ceil(D / E)`, stop at full HP), then retreat check, then potions for the still Bloodied if the company goes on; `shortRestHealFraction` removed.
- [Potion catalogue and availability](tickets/04-potion-catalogue-and-availability.md) — all four tiers as configurable data; company pays 50 / 200 / 2,000 / 20,000 gp; apothecary makes each on demand for half that and offers a tier only while its treasury covers the cost plus a reserve; no level or town-size gating.
- [Balance targets for the retune](tickets/07-balance-targets.md) — re-measure baseline on `main` (seeds 1-80, scales 1/1.15/1.25/1.5/1.75); all five `tune.ts` metrics within +/-15% at 1.15 and 1.5 (80 seeds), scale shape at the rest; movable knobs listed, rules and potion prices fixed.

## Not yet specified

- Concrete retuned values (potion supply per level, `difficultyScale`, `retreatHpFraction`, encounters per job, starting purse). The targets and allowed knobs are settled ([07](tickets/07-balance-targets.md)); what remains is choosing the values. Needs the rules above settled first and probably a throwaway prototype of the economy.
- Interaction with town economy: which coin movement reasons the production sink and the potion sale use, the numeric reserve the apothecary keeps, and how a ruined or poor apothecary affects potion supply over a long run.
- Apothecary staffing: a tier needing a cleric on the payroll whose level can cast the matching healing spell. Waits until businesses have employees; until then treasury alone gates tiers.
- Documentation updates to `CONTEXT.md` and `docs/CONFIGURATION.md` once the rules are fixed.
- Whether any saved games or fixtures hold hero or party shapes that would need migrating.

## Out of scope

- Potion drinking and administering as a Bonus Action on the hero's turn, and the 5-foot distance for giving a potion. The engine cannot model either; the "between rounds, no action cost" approximation stays. Reopens only as a new effort if the engine changes.
- Brewing potions with the Herbalism Kit (see the future hook in Notes), healing from spells, death saving throws, and a full Long Rest mechanic beyond the Hit Dice recovery moment.
