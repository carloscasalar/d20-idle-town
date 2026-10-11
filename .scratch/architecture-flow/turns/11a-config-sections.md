# Turn 11a — refactor: one configuration, in sections, ready for YAML

Read `docs/agents/orchestration-flow.md`, section "Rules for the implementing
agent", before anything else. Those rules apply to this turn.

This turn is a **refactor**. Behaviour does not change. The regression snapshot
stays byte-for-byte identical.

## Where this is heading

The game's tunable values will be loaded from a YAML file. This turn does **not**
add YAML or a YAML dependency. It makes the configuration ready for it: one
plain-data object, in sections, each section owned by one module, with one
definition of every default.

## The problem

Each module now has its own plain-data configuration (the Board, the company
roster, job intelligence, the coin module's reasons), but `GameConfig` is a flat
object that merges some of their fields under other names (`maxParties` for
`maxCompanies`, `disbandDays` for `disbandTicks`, `contractDays` for
`contractOpenTicks`), translates between units with literals (72), and restates
some defaults (`travelTicks`, `difficultyScale`) that the modules also define.
Some values have a module default but are still read from a constant elsewhere,
so overriding them changes only one module (the renown cap, the Lair strength
cap). Other tunable values still live as constants in `Game` and elsewhere (for
example the starting number and levels of Lairs, the respawn delay, the posting
threshold, the investigation and carousing values, the windfall and looting
days if not yet in a section).

## What to build

1. **`GameConfig` in sections.** One plain-data object: `seed` and the
   game-wide values at the top level, and one section per module holding that
   module's configuration exactly as the module defines it (for example
   `board`, `roster`, `intel`, and a section for whatever `Game` itself still
   decides, such as posting and Lairs). Each module's default is defined once,
   in the module, and `DEFAULT_CONFIG` is composed from those defaults. No
   field is renamed or converted between units on the way in.

2. **Every tunable value has one home.** Search `src/` for numeric literals and
   module constants that are game rules rather than D&D tables (prices, delays,
   chances, caps, thresholds, counts) and move each into the section of the
   module that uses it. Leave D&D reference data (the XP table, monster stat
   blocks, class tables) where it is. Where one value is used by two modules
   (the renown cap, the Lair strength cap, the company size), it has one home
   and the other module receives it; overriding it changes the game everywhere
   it applies. List in your report every value you moved, with its old and new
   location.

3. **Partial overrides.** `new Game(partialConfig)` and `Game.forTesting` accept
   a deep partial: a test or the browser can override one field of one section
   and keep every other default. Merging is deep for sections and replaces
   arrays and `[min, max]` pairs whole.

4. **YAML-ready, proven.** A test serialises `DEFAULT_CONFIG` with
   `JSON.stringify`, parses it back and shows that a game built from the parsed
   object produces the same world as one built from the default, tick for tick,
   for 400 hours of one seed. Nothing in the configuration is a function, a
   class instance or `undefined`.

5. **Validation at the boundary.** A function that takes an unknown value (what
   a YAML loader would return) and returns a valid `GameConfig` or a list of
   readable errors (missing section, wrong type, a negative price, a range whose
   minimum exceeds its maximum). The game uses it when it is given a config.
   Do not add a schema library; plain TypeScript is enough.

## Carried over from earlier reviews

- Job intelligence gets its own section; `Game` stops reading
  `DEFAULT_JOB_INTEL_CONFIG` directly, and `ExpeditionContext.skillDc` is
  replaced by that section. Freeze every module's default.
- `GameConfig`'s defaults must not restate the Board's (`travelTicks`,
  `difficultyScale`, `contractDays` against `contractOpenTicks`).

## Allowed test edits

Tests and scripts that build a `Game` with flat fields (`maxParties`,
`maxOpenQuests`, `contractDays`, `difficultyScale`, ...) must change to the
sectioned form. You may change only how the configuration object is written;
every assertion keeps its expected value. List the files you edited. The browser
entry point (`src/ui/main.ts`, `?difficulty=`) keeps working.

## Documents

`docs/ARCHITECTURE.md`, `docs/ARCHITECTURE-INTERFACES.md`: describe the
configuration. `docs/ARCHITECTURE-IMPROVEMENTS.md`: add an entry. Add a short
`docs/CONFIGURATION.md` listing every section and field with its default and
meaning, written so that someone could write the YAML file from it.

## Done means

`pnpm typecheck` and `pnpm test` pass; the snapshot has no diff; no game-rule
literal remains outside a configuration default (list any you deliberately
left, with the reason); your report follows rule 9 and lists the moved values
and the edited test files.
