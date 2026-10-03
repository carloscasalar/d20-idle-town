# Turn 11b, correction 1

Your turn (commit c90ff59) was reviewed. Behaviour is identical on 20 seeds over
1,500 hours, including the quest-card HTML, and the test edits are faithful. Fix
the following. Still a refactor: the snapshot stays identical; the rules in
`docs/agents/orchestration-flow.md` apply.

1. **The coin module's second door.** `transfer`, `source` and `sink` are still
   exported as free functions; only `test/coin.test.ts` uses them. Make them
   private to the module and change that test to go through the coin object
   (`openCoin(statistics, table)`), keeping every expected value.

2. **A kind's own renown.** `payContract` in `src/sim/board.ts` adds renown from
   the hard-coded Contract profile, so a new kind that reuses the Contract
   payment ignores its own `renown` field. Use the work's own profile, as
   breaking a Lair already does.

3. **No silent empty profile.** `ExpeditionContext.kinds` is optional and falls
   back to `profilesById()`, and `WorkBehavior.profile` is optional: a caller
   that leaves either out turns a registered kind into the empty profile
   without an error. Make them required, or pass the work's profile directly.

4. **Step names come from the registry.** The validator checks step names
   against the default lists, so a registered step that is not in a default
   list cannot be named in a configuration. Check against the registry keys
   (with `retirement` for services).

5. **The made-up kind and `Game`.** The registered-kind test drives the Board
   and the expedition by hand; `Game` cannot register a kind and only posts
   through `postContract`/`postBounty`. Do not add that to `Game` in this turn.
   Correct the documents instead: say exactly what a new kind needs today (a
   table entry, plus a posting rule in `Game`), and remove "Game does not gain a
   branch".

6. **Configuration fields named after a kind.** `assaultRevealsCount`,
   `assaultAppetite` and `bountyRenown` (and any other field named after a
   kind) move into a per-kind part of the configuration keyed by the kind's id,
   so a YAML file describes each kind in one place. Keep every default and the
   validator's checks; the validator rejects a per-kind entry for a kind that
   does not exist.

7. **Only intended sharing of effects.** Reasons that must have the same
   effects share one object (`intel` with `service`; income with windfall;
   forfeit with upkeep), each with a one-line comment saying why. Reasons that
   only happen to match today (`wipe` and `looting` with `loss`; `merger` with
   `exchange`) get their own objects.

8. **Documents.** In `docs/ARCHITECTURE-INTERFACES.md`, the Board and expedition
   contexts carry the coin object and the kinds, not "gold statistics"; the
   step lists are resolved with `resolveSteps`, not `runSteps`. Mark
   `replaceForScenario` and `recordsForScenario` as test-only wherever they are
   documented.

Allowed test edits: as in the original turn (construction only, same expected
values), plus `test/coin.test.ts` for item 1 and the configuration shape for
item 6. List edited tests by name.

Done means: `pnpm typecheck` and `pnpm test` pass; the snapshot has no diff;
your report follows rule 9.
