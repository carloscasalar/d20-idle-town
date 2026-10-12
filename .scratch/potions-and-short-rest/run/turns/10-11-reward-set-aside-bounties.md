# Turn 10 — issue 11: The Reward set-aside ignores Bounties

Read `.claude/skills/implement-prd/RULES.md` before anything else. Those rules apply to this turn.

Use $mattpocock-skills:implement. Use it to implement the issue `.scratch/potions-and-short-rest/issues/11-reward-set-aside-ignores-bounties.md`. The issue is the contract: build what it describes and meet every acceptance criterion. Its parent PRD is `.scratch/potions-and-short-rest/PRD.md`.

What the issue could not know:

- Issues 01 to 10 are done on this branch. The checkpoint is `9c9a2f7`: `pnpm typecheck` is clean and 754 tests pass, none skipped.
- The Agent Brief in the issue's Comments holds the owner's three decisions. They settle every point the issue body lists under "To settle before building"; where the two differ, the brief wins.
- The regression hashes are live and must not move. The default `board.rewardSetAsideFor` holds the apothecary alone, which never posts a Bounty, so the default game stays identical tick for tick. If `test/simulation-regression.test.ts`, `test/job-intel-regression.test.ts`, their snapshots or `scripts/tune-baseline.json` would change, that is a bug in the turn: stop and report it, never re-record. A guild outside the list must be sized from exactly its whole treasury, with the same arithmetic as today.
- One asymmetry is intended, leave it: for a listed employer the Bounty posting threshold reads the treasury left after the rewards owed, while the Contract posting threshold (hourly posting and raids) keeps reading the whole treasury, as issue 08 decided.
- One existing test is replaced: "sets aside Contracts only, even when a configured employer also posts a Bounty" in `test/reward-set-aside.test.ts`. No other existing test changes; if one must, stop and say why.
- Test through the real wiring: the posting criterion through the game's own hourly step, and at least one sizing case of each kind of work through the Board itself, not through a helper that rebuilds a production factory.
- The reviewer will try these mutations, one at a time. Make a test with exact expected figures fail for each:
  1. Count only Contracts as owed.
  2. Count only `open` Bounties as owed, or only `taken` ones.
  3. Cap a listed employer's Bounty by the whole treasury left after the rewards owed, instead of `quests.treasuryShare` of it.
  4. Round the cap with `Math.round` or `Math.ceil` instead of rounding down.
  5. Apply `quests.minimumReward` to a Bounty.
  6. Check a listed employer's Bounty threshold against its whole treasury.
  7. Size an unlisted guild's Bounty, or check its threshold, from a reduced treasury or with `treasuryShare`.
  8. Keep counting a Bounty as owed after it is paid, or after it fails.
  9. Post a Bounty with a reward of zero.
- Documents to bring up to date: `CONTEXT.md` (Reward set-aside), `docs/CONFIGURATION.md`, `docs/ARCHITECTURE.md` (including its test table), `docs/ARCHITECTURE-INTERFACES.md` (it goes stale on every signature change) and `CHANGELOG.md`.
- To run a script, use `pnpm dlx vite-node <script>`; `pnpm exec vite-node` does not work here.
- Put your report in `.scratch/potions-and-short-rest/run/turns/10-11-reward-set-aside-bounties-report.md` as well as in your final message.

Done means: `pnpm typecheck` and `pnpm test` pass, and your report follows rule 9.
