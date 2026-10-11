# Turn 07, correction 1 — close the roster gaps a mutation check found

Your roster tests (commit beb00ac) were reviewed: 86 mutations, 67 caught. Close
the gaps below in `test/company-roster.test.ts`. Tests only: nothing under
`src/` changes and the regression snapshot stays identical. The rules in
`docs/agents/orchestration-flow.md` apply.

Add a test that fails for each surviving mutation:

1. `recruit`: the early return after raising is dropped, so a company the temple
   has just made full still merges. Scene: raising makes the company full while
   an idle, short company of the same level is in town; nothing merges.
2. `recruit`: `hasRoom` dropped from the host filter. Scene: a host of six at
   the nearest level beside a host of four one level away; the survivors join
   the one with room.
3. `partyLevel` rounding: a company of levels 1, 1, 1, 2 is level 1 (rounding
   up would give 2).
4. Reports: the temple bill for a single raised adventurer ("draws breath",
   singular); the partial-merge report naming who stays behind; the retirement
   chronicle line.
5. Retirement: assert the company's purse after retiring, the new employer's
   starting treasury (5,000), the retirements statistic, and that the old
   company then takes the new employer's first Contract while another company
   must wait.
6. `createParty`: a new company starts with no dues paid, outside the guild and
   unblessed.

Also:

7. Split the test that bundles several `mergeParties` behaviours into one test
   per behaviour, and move the `partyLevel`, `isFull` and `hasRoom` tests out of
   "merging and burying" into their own block.
8. The test's own copy of the four roles duplicates data from `src/`. Import it
   (export it from `src/adventurers/party.ts` if it is not exported; that one
   export is the only change allowed under `src/`).

Done means: `pnpm typecheck` passes, `test/company-roster.test.ts` passes, only
that file (and at most the one export) changed, and your report follows rule 9.
