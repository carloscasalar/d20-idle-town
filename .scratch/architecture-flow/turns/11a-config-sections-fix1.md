# Turn 11a, correction 1 — every override reaches every use

Your configuration (commit 518f324) was reviewed. Default behaviour is identical
to the parent on 30 seeds over 1,500 hours, and about 60 moved values were
checked. But some overrides do not reach every use, which the documents claim.
Fix the following. Still a refactor: the regression snapshot stays identical;
the rules in `docs/agents/orchestration-flow.md` apply.

1. **Two overrides are ignored.** `Game` calls `raidInterval(lair)` without the
   `lairs` section (overriding `lairs.baseRaidInterval` changes the view but not
   when raids happen), and the expedition calls `scaleEncounter` without the
   `encounters` section. Pass them. Add one test per override proving the game
   behaves differently with it.

2. **Make the cause impossible.** Production code must not fall back to a
   default: remove every `= DEFAULT_*` parameter default and `?? DEFAULT_*`
   fallback in `src/` (quest, services, job intelligence, combat, lairs, hero,
   items, town), so forgetting to pass a section is a type error. Tests pass
   the defaults explicitly; that is an allowed test edit (only how arguments are
   built; same expected values).

3. **Remaining literals and copies.** Move the roster's arrival spread (`/ 2`,
   `* 2`), the `+3` skill-advantage tiebreak in `hero.ts` and the retiree's
   holdings list in `town.ts` into their sections, or say in your report why
   each is not a game rule. Delete `MIN_ENCOUNTERS`, `MAX_ENCOUNTERS`,
   `BLESSING_HP_PER_LEVEL` (unused) and `MAX_ARMOR_TIER` (tests only; tests read
   the configuration instead).

4. **A stricter validator.** Reject unknown keys at every level (a typo such as
   `travelTick` must be an error), require whole numbers for counts, reject
   empty weight lists, and report a section that is not an object as a wrong
   type rather than missing. Add a test that walks `DEFAULT_CONFIG` and fails if
   the validator's field list does not cover every field, so the two lists
   cannot drift apart.

5. **`ticksPerDay` out of the configuration.** Values given in ticks
   (`idleStretchTicks`, `firstRefusalTicks`, `contractOpenTicks`, `disbandTicks`,
   `restockTicks`) do not follow it, so changing it would silently break them.
   The length of a day is a calendar constant of the simulation, not a tunable
   rule: take it out of the configuration and keep one named constant.

6. **The round-trip test.** Validate the parsed object without merging it with
   defaults (so a field lost in serialisation is caught), compare with
   `toStrictEqual`, and remove the `not.toContain('undefined')` assertion that
   cannot fail.

7. **Documents.** In `docs/CONFIGURATION.md`: `postingThreshold` applies to
   every employer, not only the guild; `carousingMinimum` is the least amount
   spent, not a threshold; retreat and flight happen at half or fewer, not fewer
   than half. Make the "one override reaches every use" claims in
   `docs/ARCHITECTURE-IMPROVEMENTS.md` and `docs/ARCHITECTURE-INTERFACES.md` true
   after this correction.

Done means: `pnpm typecheck` and `pnpm test` pass; the snapshot has no diff; a
search of `src/` finds no `DEFAULT_` fallback in production code paths; your
report follows rule 9 and lists the edited tests by file.
