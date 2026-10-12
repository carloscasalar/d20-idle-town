# Turn 11 — issue 12 report

Implemented all issue 12 acceptance criteria. The required checks pass; committing is blocked by the filesystem sandbox.

## What changed

- Added `test/raid-posting-threshold.test.ts`, exercising `Game.forTesting`, the production `Game.step()`, and `Game.view()`. With a configured 1,000 gp threshold, the exact open rewards are `[]` for treasury 999, `[800]` for treasury 1,000, and `[980, 20]` for a listed apothecary with treasury 1,000 and 980 owed. The tests also pin raid counts, treasury, posted counts, linked work and holding status.
- Made both `Board.rewardTreasury` and `Board.bountyRewardCap` private. Both callbacks remain in `WorkContext`. Game now asks the public `canFundBounty(employer, threshold, quests)` at its existing threshold check.
- Added type-only catalogue completeness assertions. Existing `satisfies` checks reject list-only additions; the new assertions reject union-only additions. Exported names, values and ordering are unchanged.
- Updated `docs/ARCHITECTURE-INTERFACES.md` and the Board explanation and test table in `docs/ARCHITECTURE.md`. Left `CHANGELOG.md` unchanged: it has no precedent for internal visibility changes or test hardening of this kind.

The combined Bounty `return` preserves the former threshold `return` plus cap `continue`: funding is unchanged between lairs until a Bounty is posted, and neither query draws randomness. Funding is checked again after every posting. The unchanged issue 11 tests cover threshold deferral, zero rewards, unlisted guilds and multiple lairs in one hour.

## Check results

| Command/check | Result |
| --- | --- |
| `pnpm typecheck` | Passed after implementation and again after reverting catalogue mutations. |
| `pnpm test test/raid-posting-threshold.test.ts` | Passed: 1 file, 3 tests before production changes. |
| Same command with each raid mutation, separately | All failed as intended; all mutations reverted. See figures below. |
| `pnpm test test/raid-posting-threshold.test.ts test/reward-set-aside.test.ts test/lairs.test.ts` | Passed after the Board change: 3 files, 40 tests; existing tests unchanged. |
| `pnpm typecheck` with each catalogue mutation, separately | All four exited 1 as intended; all mutations reverted. Diagnostics below. |
| `pnpm test` | Passed: 38 files, 773 tests, including all six regression hash cases. |
| `git diff --check` | Passed. |
| Byte comparison against turn-start commit `225adb3fe99a400bd25d8074640e4c1f73b36ef5` | All 42 existing test files, helpers, snapshots and `scripts/tune-baseline.json` unchanged. |
| `git add` for the six implementation files | Failed: `.git/index.lock: Operation not permitted`; no commit created. |

Raid mutation failures:

1. Remove the threshold: expected `[]`, received `[799]` for treasury 999.
2. Require exceeding the threshold: expected `[800]`, received `[]`; expected `[980, 20]`, received `[980]`.
3. Read treasury after rewards owed: expected `[980, 20]`, received `[980]` for the listed apothecary.

Direct catalogue diagnostics from the four independent `pnpm typecheck` runs:

```text
ServiceKind union only:
src/town/town.ts(21,41): error TS2344: Type '"review-only-service"' does not satisfy the constraint 'never'.

SERVICE_KINDS list only:
src/town/town.ts(16,96): error TS2322: Type '"review-only-service"' is not assignable to type 'ServiceKind'.

EmployerKind union only:
src/town/town.ts(20,42): error TS2344: Type '"review-only-employer"' does not satisfy the constraint 'never'.

EMPLOYER_KINDS list only:
src/town/town.ts(10,74): error TS2322: Type '"review-only-employer"' is not assignable to type 'EmployerKind'.
```

Union-only additions also triggered existing exhaustive record/switch errors; the diagnostics above show the new completeness checks themselves fail.

## Acceptance criteria

| Criterion | Evidence |
| --- | --- |
| Raid threshold is pinned, including equality and whole treasury for listed employers | All three hourly cases in `test/raid-posting-threshold.test.ts`; all three requested mutations fail with exact figures. |
| Reward-sizing treasury is private; existing Reward set-aside tests survive | Both Board methods are private, WorkContext retains both, and Game uses one yes-or-no query; typecheck and unchanged `test/reward-set-aside.test.ts` and `test/lairs.test.ts` pass. |
| Both kind unions and lists cannot drift | Four reverted catalogue mutation runs fail typechecking with the diagnostics above. |
| Interface documentation and new test table entry match | Reviewed both updated architecture documents against the Board surface and new test. |
| Regression hashes pass without re-recording | All six cases pass in the full suite; regression tests, snapshots and tuning baseline are byte-identical to the turn-start commit. |
| Typecheck and full suite are green | `pnpm typecheck` and `pnpm test` pass. |

## Standards

Parallel read-only code review: no documented-standard violations or baseline smell findings.

## Spec

Parallel read-only code review: no missing requirements, scope creep or incorrect implementation findings. Reviews used `git diff 225adb3fe99a400bd25d8074640e4c1f73b36ef5` plus the untracked new test because staging was refused.

Regression guard: unchanged; no game behavior, random draw, configuration default, snapshot or tuning baseline changed.

Questions and bugs: none found.

Not done: commit. The sandbox refused creation of `.git/index.lock` during staging. Turn rule 7 says, “if your environment refuses the commit, leave the work in the tree and say so.” The implementation and this report remain in the working tree; no files were staged.
