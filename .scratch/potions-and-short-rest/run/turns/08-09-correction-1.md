# Turn 08, correction 1

Your work was committed as `e63b1e8` and `21291d8` and reviewed. The three checks, the six hashes and the behaviour are sound, and most of the documentation matches the code. The documentation pass missed the points below. Documents only: no code, no test, no hash changes; the rules still apply.

1. `docs/ARCHITECTURE.md`, the list of configuration sections (around lines 259-260): it omits `kinds`, `potions` and `policies`, which `src/sim/config.ts` has.
2. `docs/ARCHITECTURE.md` (around lines 265-266) and `docs/ARCHITECTURE-INTERFACES.md` (around line 200, "holding, employer kind, or step"): the description of what the validator rejects is incomplete. It also rejects an unknown town-service name in `board.rewardSetAsideFor`, a potion formula that does not parse and a duplicate tier name.
3. `docs/CONFIGURATION.md` (around lines 31-35): the list of name checks omits `board.rewardSetAsideFor`. The rejection of a duplicate tier name is documented nowhere; add it beside the catalogue table (around line 291).
4. `CHANGELOG.md` (around line 15): "The earlier hashes are the deliberate break" reads oddly. Say plainly that the six regression hashes were re-recorded once, on purpose, because the healing rules change every seeded trajectory.

Read each statement against `src/sim/config.ts` before you write it; if the code says something different from this list, the code wins and your report says where.

Append your report to `.scratch/potions-and-short-rest/run/turns/08-09-retune-confirmation-report.md` under a "Correction 1" heading as well as giving it in your final message. Use a commit subject in the style of the branch (`docs: ...`).

Done means: `pnpm typecheck` and `pnpm test` pass and your report follows rule 9.
