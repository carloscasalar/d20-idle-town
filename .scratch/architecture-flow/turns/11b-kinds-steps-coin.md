# Turn 11b — refactor: kinds of work, steps and gold reasons as named data

Read `docs/agents/orchestration-flow.md`, section "Rules for the implementing
agent", before anything else. Those rules apply to this turn.

This turn is a **refactor**. Behaviour does not change. The regression snapshot
stays byte-for-byte identical, and no existing test file changes except as item
5 allows.

## Context

The previous turn put every tunable value into sections of `GameConfig`. What is
still not data, or not addressable by name from a YAML file:

1. **Kinds of work.** The Board selects behaviour per kind of work from a table,
   but `Game`, the expedition (`src/sim/expedition.ts`) and job intelligence
   (`knowledgeAtPosting` takes the literals `'contract' | 'assault'`) still
   branch on the kind. Move every remaining per-kind difference (which renown
   and narration apply, whether the last fight forbids retreat, how deep a Lair
   is, what is known when the work is posted) into the kind table as named
   fields, so a new kind of work is one entry. Search `src/` for `'assault'`
   and `'contract'`: after this turn they appear only in the kind table and in
   the type that names the kinds.

2. **One step mechanism.** Town services and job intelligence each have their
   own step type and dispatcher with the same shape
   (`(company, context) => boolean`). Make one generic step type and one
   function that runs a list of steps. Every step has a name. The default lists
   are lists of names resolved against a registry of steps, so a YAML file can
   say `services: [potions, loot, items, dues, blessing, retirement, armour]`;
   no positional slot remains for the roster's retirement step. An unknown name
   is a validation error with a readable message, reported by the configuration
   validator from the previous turn.

3. **The coin module, built once.** Today the reason table and the gold
   statistics are passed into every movement, and a reason's effects are five
   positional booleans. Build a coin object once, with its statistics and its
   reason table, and have callers use it. A reason's effects are named fields.
   Where two reasons must have the same effects (`intel` and `service`), say so
   once instead of copying the flags. The reason table becomes part of the
   configuration only if a reason's effects are a game rule rather than code;
   decide, and say why in the report.

4. **One way to build a job's knowledge handle.** `jobKnowledge(record)` is
   still exported, so any holder of a writable Contract can build a handle. Only
   the Board gives one out.

5. **Names are checked against what exists.** `town.retiredHoldings`,
   `quests.relicHoldings` and `quests.guildOnlyKinds` accept any string today: a
   configuration with `retiredHoldings: ['castle']` passes validation and breaks
   at the first retirement. The validator checks every name in the
   configuration (kinds of work, holdings, steps, coin reasons) against the
   catalogue it refers to, and rejects a weight list whose weights are all zero.
   Remove the unused `testRoster` from `test/helpers/supplied-config.ts`.

6. **Allowed test edits.** Tests that construct steps, the coin context or a
   knowledge handle directly may change how those are built, keeping every
   expected value. List each edited test by name.

## Tests

Add: a made-up kind of work registered in the kind table and taken through a
whole expedition (posted, taken, fought, settled) without editing `Game`, the
expedition or job intelligence; a configuration naming the services in a
different order that the game follows; a configuration with an unknown step
name that the validator rejects. Run `scripts/combat-sweep.ts` at the end.

## Documents

Update `docs/ARCHITECTURE.md`, `docs/ARCHITECTURE-INTERFACES.md`,
`docs/CONFIGURATION.md` and add an entry to `docs/ARCHITECTURE-IMPROVEMENTS.md`.

## Done means

`pnpm typecheck` and `pnpm test` pass; the snapshot has no diff; the searches in
item 1 come back clean; your report follows rule 9 and lists the edited tests
and the sweep result.
