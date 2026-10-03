# Turn 08 — refactor: the company roster, and town services as an ordered list

Read `docs/agents/orchestration-flow.md`, section "Rules for the implementing
agent", before anything else. Those rules apply to this turn.

This turn is a **refactor**. Behaviour does not change. The regression snapshot
`test/__snapshots__/simulation-regression.test.ts.snap` must stay byte-for-byte
identical, and every existing test file must pass without being edited, with one
exception named in item 3. If you believe another test has to change, stop and
report why.

## The problem

The population of companies is managed by `Game` (`src/sim/game.ts`): the list
of companies, the arrival schedule, the band of strangers for a stranded
company, recruiting (the temple, merging with another short company, joining a
host after the disband period), `absorb` and retirement. `src/adventurers/party.ts`
holds the helpers they use. Town services (`src/town/services.ts`) need
retirement in the middle of their order of visits, so they take a `tryRetire`
callback that calls back into `Game`: the order of services is spread across two
modules and joined by a callback.

## What to build

1. **A company roster module** that owns the companies in town: the list, the
   arrival schedule, strangers for a stranded company, recruiting, merging and
   absorbing, disbanding, and retirement. It is the only code that adds a
   company, removes or disbands one, or moves adventurers between companies.
   `Game` asks it for the companies it needs (all, active, by id) through
   read-only views, as it does with the Board. Name it in the domain language;
   add the term to `CONTEXT.md`.

2. **Town services as an ordered list of steps.** Replace the fixed sequence
   in `visitTownServices` and the `tryRetire` callback with a list of service
   steps, each a small function that may spend the hour, tried in order until
   one does. The default list reproduces today's order exactly: potions, loot,
   magic items, guild dues, blessing, retirement, armour. Retirement is a step
   contributed by the roster module; the services module no longer knows that
   retirement exists. Adding a service, or changing the order, means editing the
   list, which is data the caller supplies.

3. **Allowed test edit.** `test/coin-movements.test.ts` passes
   `tryRetire: () => false` when it calls `visitTownServices`. You may change
   only how that call's context or step list is built, so it means the same
   thing (no retirement). No assertion changes.

4. **Configuration.** The roster's tunable numbers become one plain-data
   configuration object with an exported default reproducing today's values,
   built by `Game` from `GameConfig` without renaming any `GameConfig` field:
   at least the cap on companies, the arrival interval, the patience before
   strangers come, the disband period, the company sizes, the retirement level,
   the retirement price and the share of it that becomes the new business's
   capital. Plain data only, so it can come from YAML later. A value that
   already has one definition elsewhere keeps that one definition.

5. **Constraints.**
   - No change to the order of `Rng` draws, events, statistics or gold
     movements. Gold still moves only through the coin module, with the same
     reasons.
   - Dependencies are passed in narrowly (town, board, coin statistics, `Rng`,
     tick, a way to report events), not `Game`.
   - The roster's operations take the context last, as the Board's do.
   - `GameScenario` (`Game.forTesting`) keeps `scenario.parties` with the same
     meaning, backed by the roster, through clearly named scenario-only
     accessors, as the Board does.
   - Whoever chooses work for an idle company (`idle`, today in `Game`) stays in
     `Game` for now; it calls the roster and the Board.

## Tests

- The existing tests are the safety net, in particular
  `test/company-roster.test.ts`, `test/party.test.ts`,
  `test/town-services.test.ts` and `test/coin-movements.test.ts`.
- Add tests through the roster module's own interface for each operation, and
  one through `visitTownServices` that supplies a custom step list (a made-up
  service inserted between two existing ones) to prove the order is data.
- After the change, run `scripts/combat-sweep.ts` (seeds 1 to 150, 1,500 hours)
  and report any crash.

## Documents

`docs/ARCHITECTURE.md`, `docs/ARCHITECTURE-INTERFACES.md`: update what this
makes false and add the module. `docs/ARCHITECTURE-IMPROVEMENTS.md`: add an
entry in the format of the existing ones.

## Done means

`pnpm typecheck` and `pnpm test` pass; the snapshot has no diff; no existing
test file changed other than the one call in item 3; a search of `src/` shows
companies are added, removed or disbanded and adventurers moved between
companies only in the roster module; `tryRetire` no longer exists; your report
follows rule 9, lists the roster's public interface, its configuration fields,
and the sweep result.
