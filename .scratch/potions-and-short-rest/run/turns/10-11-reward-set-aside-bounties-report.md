# Turn 10 — issue 11: Reward set-aside includes Bounties

## What changed

The Board now counts every listed employer's open and taken Contracts and
Bounties as rewards owed. A listed employer's Bounty is capped by the
rounded-down `quests.treasuryShare` of the treasury after those rewards, without
`quests.minimumReward`. The hourly game waits until that remainder meets the
posting threshold, checks it again for each lair, and skips nonpositive rewards.
The Board refuses nonpositive Bounty rewards before generation or posting.
Payment and failure release Bounty obligations through the existing terminal
statuses. Contract thresholds still use the whole treasury, for hourly posting
and raids. Unlisted employers retain their existing arithmetic.

`generateAssault` accepts explicit `AssaultFunding` from the Board while retaining
whole-treasury funding for existing standalone callers. This preserves every
existing test except the expressly authorized Contracts-only replacement.
Updated `CONTEXT.md`, `docs/CONFIGURATION.md`, `docs/ARCHITECTURE.md` (including its
test table), `docs/ARCHITECTURE-INTERFACES.md`, and `CHANGELOG.md`.

Implementation commit: `5329eea` (`Count Bounties in configured reward set-aside`).
The completed report is committed separately. No push performed.

## Checks

| Command or check | Result |
| --- | --- |
| `pnpm test test/reward-set-aside.test.ts` during the accounting, sizing, threshold and zero-reward slices | Red for the intended missing behavior, then green. Final: 30 passed. One intermediate incorrect expected figure was corrected from 20 to 22; production arithmetic was not changed to fit it. |
| `pnpm typecheck` | Passed regularly and at completion. One new fixture's readonly list argument was corrected during development. |
| `pnpm test` | Passed: 37 files, 770 tests, none skipped. Includes all six live regression checks. |
| `git diff --check` | Passed. |
| Temporary mutation runs, each with `pnpm test test/reward-set-aside.test.ts` | All 14 variants failed behavioral assertions. Original production files restored afterward. |
| Byte comparison with `9c9a2f7` | Both regression test files, every snapshot and `scripts/tune-baseline.json` are identical. |
| Original test-block comparison with the pre-turn commit `f0b75bb` | Only the authorized Contracts-only test was replaced; every other existing test block remains verbatim. No other test file changed. |
| `FROM=1 TO=150 HOURS=1500 pnpm dlx vite-node scripts/combat-sweep.ts` | Passed: no crashes in seeds 1–150 for 1,500 hours each (225,000 simulated hours); exit 0. |
| `pnpm dev --host 127.0.0.1` | Sandbox initially denied binding port 5173; the approved retry started Vite successfully. Server stopped after the browser attempt. |
| Browser smoke check | Blocked: IAB and Chrome unavailable; Computer Use rejected Dia access with “Computer Use was not approved to use Dia.” No browser steps or console inspection completed. |

## Regression guard

Unchanged. No hash was re-recorded and no snapshot, baseline, default list,
configuration shape, validation or tuning value changed. The default list still
contains only the apothecary, which posts no Bounty; the full suite confirms the
default seeded trajectories are unchanged. No random draw was added, removed or
reordered on that path.

## Acceptance criteria and their evidence

All behavioral cases below are in `test/reward-set-aside.test.ts`.

| Acceptance criterion | Covering test or check |
| --- | --- |
| Guild Contract deducts open/taken Contracts and Bounties | `sizes a guild Contract after its open and taken Contracts and Bounties`: Bounties 150/150, taken Contract 560, open Contract 112, next Contract 22, treasury unchanged at 1,000. |
| Listed Bounty cap, binding and nonbinding | `sizes a listed guild Bounty with treasury $treasury after a Contract, without a minimum`: treasury 1,003 and Contract 802 yield Bounty 160 (level 2); treasury 1,000 and Contract 800 yield 150 (level 1); treasury 26 and Contract 20 yield 4. |
| Hourly threshold deferral and later posting | `waits for the listed guild’s available treasury, then posts at the threshold next hour`: available 24 posts nothing; next hour's income brings it to 25, posting a reward of 20. `checks the available treasury again after posting each Bounty in the same hour` posts only one reward of 40. |
| Release on Bounty payment/failure | `releases a $ending Bounty while another Bounty stays owed`: payment leaves treasury 850 and next Contract 560; failure leaves treasury 1,000 and next Contract 680. |
| Unlisted Bounty sizing, posting and Contract sizing unchanged | `keeps an unlisted guild’s Bounties and Contracts sized from its whole treasury`: treasury 101 yields Bounties 101/101 and Contracts 80/80. `checks an unlisted guild’s whole treasury even when its rewards owed exceed it`: treasury 25, owed 500, Bounty 25. |
| Contracts-only test replaced | Replaced by the mixed open/taken work test; all other original tests remain verbatim. |
| Regression tests pass, baseline unchanged | Full suite passes all live hash checks; protected files are byte-identical to `9c9a2f7`. |
| All five documents current | Updated domain definition, configuration fields/rules, architecture explanation/test table, generator and Board interfaces, and changelog. Standards and Spec reviews found no stale requirement. |
| Typecheck and full suite green | `pnpm typecheck` passed; `pnpm test`: 770 passed, none skipped. |

Nonpositive reward coverage also goes through real interfaces: `refuses a Board
Bounty whose treasury %s cannot fund a positive reward` checks treasuries 0, -10
and 1, with no posted record/link/counter; the hourly zero-reward table checks
shares 0 and 0.01, and a zero per-level reward for both listed and unlisted guilds.

## Mutation evidence

| Requested mutation | Exact-value test that failed |
| --- | --- |
| 1. Contracts only owed | Mixed work test: Contract 560. |
| 2. Only open or only taken Bounties owed | Both variants: mixed work test, Contract 560. |
| 3. Whole reduced treasury as Bounty cap | Binding case: Bounty 160, not 201. |
| 4. Round or ceil the cap | Both variants: binding case, Bounty 160, not 161. |
| 5. Apply Contract minimum to Bounty | Small positive case: Bounty 4, not 20. |
| 6. Listed threshold reads whole treasury | Hourly deferral: no Bounty at available 24. |
| 7. Reduce unlisted sizing/threshold or apply share | Three variants: unlisted whole-treasury tests, Bounties 101 and 25, Contracts 80, or no change to obligations outside the list. |
| 8. Keep paid/failed Bounty owed | Both variants: release tests, subsequent Contracts 560/680. |
| 9. Allow a zero reward to post | Removed both hourly skips and Board refusal: Board rejects posting and hourly results remain empty. |

## Review

Two read-only reviews used `git diff 9c9a2f7...5329eea`, excluding the two
pre-turn orchestration files introduced by `f0b75bb`.

### Standards

No documented-standard breaches or baseline smell findings. Board retains
ownership, configuration remains required, the funding compatibility serves
existing callers, and tests use real interfaces and exact expected values.
Total: 0 hard violations, 0 heuristic smells.

### Spec

No missing, partial, incorrect or out-of-scope requirements found. Accounting,
sizing, threshold deferral, release, unchanged unlisted/default behavior, test
preservation and documentation match the owner brief. Total: 0 findings.

## Questions, bugs and anything not done

No unresolved product questions and no discovered production bugs. The owner
brief settled the issue's decisions. Browser smoke remains unperformed because
the available computer tools rejected browser access; its 30 steps, accelerated
run, four-tab inspection, console inspection and difficulty display check could
not be completed. The live regression checks and real hourly integration tests
passed. The referenced `RTK.md` was absent from the repository root and inspected
parent locations; no agent/editor/tool configuration was changed.

## Correction 1

### What changed

Implementation commit: `f8327e3` (`Require explicit Bounty caps and centralize reward sizing`).

`generateAssault` now accepts `AssaultFunding` only. The Employer/treasury union
and compatibility branch are removed. Its field is now `rewardCap`, accurately
naming the amount after any treasury share; `QuestTerms.rewardTreasury` remains
the treasury before the share. Bounty generation holds the sole per-level/cap
formula. `createBounty` checks the returned `work.reward` instead of repeating
that formula, rejecting a nonpositive reward before the Board inserts work or
establishes posting links.

The existing ruin fixture generates zero-valued work directly with an empty
guild treasury. Generation still supports that fixture; posting validation
belongs to the Board. A direct invalid Board posting attempt now generates the
work before rejecting it. The hourly game still skips nonpositive rewards
before generation, and default random draws and trajectories remain unchanged.

All seven authorized generator call sites now explicitly pass the same guild ID
and whole treasury as `{ id, rewardCap }`. No assertion or expected value was
changed. `test/reward-set-aside.test.ts` is unchanged. Updated both architecture
documents to describe the strict funding interface and returned-reward check.
This supersedes the original report's compatibility-union justification and
its statement that the Board rejects invalid rewards before generation.

### Checks

| Command or check | Result |
| --- | --- |
| `pnpm typecheck` | Initial strict signature exposed exactly the seven authorized call sites; passed after migration and at completion. |
| `pnpm test test/reward-set-aside.test.ts test/board.test.ts test/lairs.test.ts test/contract-ruin.test.ts` | Final: 96 passed across four files. An intermediate attempt to reject zero in the generator broke the existing ruin fixture; validation was kept in the Board instead, without changing its fixture or assertions. |
| `pnpm test` | Passed: 37 files, 770 tests, none skipped, including all six live regression checks. |
| `TRIALS=1 pnpm dlx vite-node scripts/assault.ts` | Passed, exit 0; all six configured level/company combinations ran with explicit funding. This is a script wiring check, not a balance measurement. |
| Four-file call-site audit against correction start `cf64ba8` | Exact match to argument-shape replacements only. All seven treasury values, assertions, expected values and remaining file contents preserved. No other test file changed. |
| Protected-file comparison against `9c9a2f7` | Both regression test files, every snapshot and `scripts/tune-baseline.json` remain byte-identical. |
| Mutation runs using `pnpm test test/reward-set-aside.test.ts` | All 14 variants across all nine families failed behavioral tests; original production files restored. Covers Contracts-only accounting, open-only/taken-only Bounties, whole remainder, round/ceil, minimum reward, whole listed threshold, reduced/shared unlisted cap and reduced unlisted threshold, paid/failed obligations, and zero posting. The zero mutant now removes the Board's returned-reward check and hourly skips. |
| Formula/interface audit | One per-level/cap `Math.min` expression, in generation; no funding union, treasury fallback branch or stale `AssaultFunding.rewardTreasury` references in current architecture docs. |
| `git diff --check` | Passed. |

The regression guard did not change. No re-recording, default, validation,
tuning or baseline change was needed. The original accepted long sweep remains
valid; it was not repeated for this correction.

### Acceptance evidence

The original acceptance matrix above remains applicable, with its exact-value
tests unchanged. In particular:

| Criterion | Covering test/check |
| --- | --- |
| Mixed open/taken Contract and Bounty obligations | `sizes a guild Contract after its open and taken Contracts and Bounties` (560, 112, 22). |
| Listed binding/nonbinding cap without a minimum | Listed guild Bounty table (160, 150, 4). |
| Hourly deferral and later threshold posting | Listed available-treasury test (none at 24; reward 20 at 25), plus same-hour recheck (40). |
| Bounty payment/failure releases obligations | Bounty release table (subsequent Contracts 560/680). |
| Unlisted sizing and threshold unchanged | Whole-treasury Board test (Bounties 101, Contracts 80) and hourly test (Bounty 25 despite owed 500). |
| Authorized old test replaced, other assertions preserved | Original replacement unchanged; correction call-site audit permits only the seven shape changes. |
| Live regression hashes and baseline preserved | Full suite and byte comparison against `9c9a2f7`. |
| Documentation current | Original five rule documents remain true; architecture and interface docs now reflect `rewardCap`, strict funding and validation before posting. |
| Typecheck/full suite green | Commands above: typecheck clean, 770 tests passed. |
| Correction 1: strict funding only | Compiler rejected all seven Employer arguments; their explicit funding replacements typecheck and pass focused tests/script wiring. |
| Correction 2: formula in one place | Formula audit, unchanged cap tests and Board zero-reward refusal tests. |
| Correction 3: unambiguous field and truthful interfaces | `rewardCap` supplied by every caller; both architecture documents audited against code. |

### Review

Read-only reviews used `git diff cf64ba8...f8327e3`.

- **Standards:** 0 documented breaches, 0 heuristic smells. Formula ownership,
  explicit funding, narrow call-site edits and documentation satisfy the rules.
- **Spec:** 0 findings. All three corrections and original behavior are preserved;
  no assertion, expected value, regression guard or unrelated behavior changed.

### Questions, bugs and anything not done

No unresolved product questions, newly discovered production bugs or unfinished
correction work. No assertions or expected values needed changing. The prior
browser smoke limitation remains as recorded above; no browser smoke or new
long sweep was attempted for this interface/formula correction. No push performed.
