# Turn 07c — bug fix: three roster bugs, two rule questions, one slow test

Read `docs/agents/orchestration-flow.md`, section "Rules for the implementing
agent", before anything else. Those rules apply to this turn.

This is a **bug fix** turn. Refresh the regression snapshot only if it differs,
and say whether it did and which fix caused it.

The roster tests (`test/company-roster.test.ts`) found these. Fix each with a
failing test first, in that file.

1. **A band of five arrives as four.** `rollClasses` (`src/adventurers/party.ts`)
   returns at most four classes, so when a stranded company asks for a band of
   five, `createParty` builds four. A band has the size it was asked for; the
   first four still cover the four roles, and any further member gets a class
   by the same random rule the rest of the game uses for an extra member. If
   there is no such rule, use one draw from the list of classes, and say so.

2. **A ruined temple still raises the dead.** `recruit` (`src/sim/game.ts`) pays
   the temple and raises the fallen even when the temple is ruined. Every other
   service refuses when its employer is ruined; so does this one. The dead stay
   dead and nothing is paid.

3. **Retirement does not pick the most seasoned veteran.** `retire` takes the
   first living member at or above the retirement level; the code's own comment
   says the most seasoned retires. The highest level retires; between equal
   levels, the one with the most experience; if still equal, the first in the
   company.

Then:

4. **Record two rule questions as issues; do not change the behaviour.** In
   `.scratch/company-roster/issues/`, each with `Status: needs-triage`, the
   current behaviour, why it is questionable and two or three possible rules:
   - `01-temple-raises-in-company-order.md`: the temple raises the fallen in
     the company's order, as far as the purse goes, rather than as many as
     possible or the cheapest first.
   - `02-partial-merge-takes-everything.md`: when only some survivors of a
     company fit in the host, the whole purse, the potions and the stash go to
     the host, and those who stay behind are left with nothing.

5. **One slow test.** `test/deployment.test.ts`, "ambushes come out both ways
   over many seeds", takes about a second and uses the default 5-second timeout.
   Give it the shared long-simulation timeout from `test/helpers/simulation.ts`.

Done means: `pnpm typecheck` and `pnpm test` pass; each new test fails without
its fix; your report follows rule 9 and says whether the snapshot changed.
