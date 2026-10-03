# Turn 08, correction 1 — close the doors around the roster

Your roster (commit e6f1112) was reviewed. Behaviour is preserved exactly, but
the roster is not yet the only writer. Fix the following. Still a refactor: the
regression snapshot stays identical; the rules in
`docs/agents/orchestration-flow.md` apply.

1. **No free mutators.** `mergeParties`, `buryDead` and `disbandCompany` are
   exported functions that bypass the roster's ownership check and its
   configured sizes. Make them private to the roster module. The expedition
   currently disbands a wiped company by calling `disbandCompany(p)` itself: give
   `ExpeditionContext` a `disband` operation supplied by `Game` from the roster,
   so the roster disbands it. `updateActive` must not give callers a way to
   reach a company's members or status other than through the roster.

2. **No import cycle, no workaround file.** Remove the re-exports from
   `src/adventurers/party.ts` that create a cycle with the roster module, and
   delete `src/adventurers/company-size.ts` if it exists only to get around that
   cycle. Each constant has one definition, in the module that owns it.

3. **No duplicate rules.** `isFull` and `hasRoom` in `party.ts` are no longer
   used in `src/` and restate the roster's readiness rule with constants that
   ignore its configuration. Remove them; the roster's own `isReady`/`hasRoom`
   are the rule.

4. **One default list of services.** The order of town services is written
   twice, inline in `Game.shop` and as `TOWN_PURCHASE_STEPS`. Keep one named
   default list and use it.

5. **Issues.** Point `.scratch/company-roster/issues/01-*` and `02-*` at the
   code's new locations.

## Allowed test edits

Items 1 and 3 force edits in `test/party.test.ts`, `test/company-roster.test.ts`,
`test/expedition.test.ts` and `test/coin-movements.test.ts`. In those files you
may change imports, and change a call to a removed function into the
equivalent call through the roster's public interface (or `advanceExpedition`'s
new `disband`), and move a test of `isFull`/`hasRoom` to the roster's
equivalent. Every assertion keeps the same expected values; no assertion is
deleted or loosened; no test is dropped. List every edited test by name with
one sentence each.

Done means: `pnpm typecheck` and `pnpm test` pass; the snapshot has no diff; a
search of `src/` finds no exported function outside the roster that adds,
disbands or merges companies or moves members; no import cycle between
`party.ts` and the roster; your report follows rule 9 with the list of edited
tests.
