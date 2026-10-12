# Turn 05, correction 1

Your work was committed as `1024ac1` and reviewed. Both orders work in combat and at the rest, the merger and the default are right, the validation is strict and the long sweep is clean. Fix the following; the rules still apply.

1. `test/lairs.test.ts` was weakened without need. The issue's rule is to look first for a fixed place for the draw that does not break a test. In `src/adventurers/party.ts`, draw the policy after the heroes and before `partyName`: with that placement the original `test/lairs.test.ts` (as in `27539f5`) passes unedited and the suite stays green. Move the draw, restore `test/lairs.test.ts` exactly as it was in `27539f5`, and update the issue's `## Comments` and the "Determinism and seeding" text of `docs/ARCHITECTURE.md` to say where the draw is. If another test then needs a new expectation, stop treating it as free: say which and why in your report.
2. `src/adventurers/party.ts`: `createParty` takes the weights with a default value (`= DEFAULT_POLICIES_CONFIG.potionSharing`). Rule 6: production code takes its configuration as a required argument. Remove the default and pass the weights in `scripts/assault.ts` and in the tests. This default is how the stranded-band call in the roster could lose the configured weights unnoticed (point 3).
3. Add a test where a stranded band arrives through `CompanyRoster.arrivals` under weights 100 / 0 and under 0 / 100, and gets the policy the weights dictate. Today dropping the configured weights from that `createParty` call passes the suite.
4. `test/expedition.test.ts`: the helper builds the combat options with a conditional spread that restates the production code. Replace it with a literal, and add a case where the fight of a `most-hurt` company receives `potionSharing: 'most-hurt'`. Today forwarding a constant `'company-order'` from `src/sim/expedition.ts` passes the suite.
5. `docs/ARCHITECTURE-INTERFACES.md` is stale: the `CompanyRoster(...)` and `createParty(...)` signatures, and `src/adventurers/policies.ts` and `CombatOptions.potionSharing` are missing. Bring it in line with the code.
6. `src/adventurers/policies.ts`: `potionSharingOf` selects with `=== 'most-hurt'`. Behaviour that varies by kind is selected by data: index the table of orders by the policy's name, with company order only when no policy is recorded.

Allowed test edits: `test/lairs.test.ts` goes back to its `27539f5` content; call sites gain the weights argument; the helper of point 4. No other expected value changes. For points 3 and 4, apply the mutation named, see the new test fail, undo it, and quote the failure in your report.

Append your report to `.scratch/potions-and-short-rest/run/turns/05-06-potion-sharing-policy-report.md` under a "Correction 1" heading as well as giving it in your final message.

Done means: `pnpm typecheck` and `pnpm test` pass and your report follows rule 9.
