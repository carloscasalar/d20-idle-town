# Turn 02, correction 1 — issue 03: three missing tests

Read `.claude/skills/implement-prd/RULES.md` before anything else. Those rules apply to this turn.

Use the project skill "implement" (`.cursor/skills/implement/SKILL.md`).

Another agent implemented the issue `.scratch/potions-and-short-rest/issues/03-hit-dice-at-the-short-rest.md` as commit `04d8b91` and was then cut off by a usage limit, so this correction comes to you in a new session. Read the issue and the commit (`git show 04d8b91`) first. The review found evidence for every acceptance criterion except the points below, and found no wrong behaviour: this is a tests-only turn. Production code changes only if a new test shows a real defect; in that case say so in your report.

1. Nothing exercises the production wiring of the rest dice. `test/helpers/expedition-rules.ts` declares its own factory, so replacing `restDice` in `src/sim/game.ts` with `() => this.rng` passes the whole suite. Add a test, through the game's own interface, that fails when the Hit Dice of a rest do not roll from a local generator made from the one rest seed (for example: the world stream advances the same amount per rest whatever the dice spent).
2. `test/expedition.test.ts`: every hero who drinks in the Short rest potion tests has an empty pool, so "whether or not they have dice left" is unproven (limiting potions to heroes with no dice left passes every test). Add a hero of level 2 or more who keeps dice after spending the quota, is still Bloodied, and drinks.
3. `test/expedition.test.ts`, "uses one world seed per fight and one for a separate Short rest hour": it asserts with `toBeGreaterThan` / `toBeLessThanOrEqual` on real dice. Script `restDice` and assert the exact hit points and the exact log line.

Existing tests keep their expected values, apart from the test named in point 3. Each new test must fail for the right reason against a mutated production code (try the mutation named in each point, then undo it) and your report says so.

Put your report in `.scratch/potions-and-short-rest/run/turns/02-03-correction-1-report.md` as well as in your final message.

Done means: `pnpm typecheck` and `pnpm test` pass and your report follows rule 9.
