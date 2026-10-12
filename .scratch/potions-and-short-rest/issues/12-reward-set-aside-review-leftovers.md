# Reward set-aside: three leftovers of the review

Status: needs-triage

Noted by the slice reviewer of [issue 08](08-reward-set-aside.md) and left uncorrected when that issue was closed; confirmed still open by the owner's review. None changes what the game does with the default configuration.

## 1. The posting threshold read in `raids()` has no test

`world.postingThreshold` is read in three places in `src/sim/game.ts`: `postQuests()`, `raids()` and `postAssaults()`. Issue 08 decided that the threshold keeps reading the full treasury, including for employers in the set-aside list.

- `postQuests()` is pinned by the hourly case of `test/reward-set-aside.test.ts` (treasury 1,000, 980 owed, a 20 gp Contract is posted).
- `postAssaults()` is pinned by `test/lairs.test.ts`.
- `raids()` is not pinned by any test: a raid picks its target among the employers whose treasury meets the threshold.

Add a test that a raid does not post a Contract for an employer below the threshold and does post one at the threshold, and that for an employer in the set-aside list the threshold reads the full treasury, not the treasury minus the rewards owed.

## 2. `Board.rewardTreasury` is public without need

`Board.rewardTreasury(employer)` in `src/sim/board.ts` is a public method. Its only caller is the Board itself, which hands it to work creation through `WorkContext.rewardTreasury`. Make the method private, or drop it from the public surface some other way, and update `docs/ARCHITECTURE-INTERFACES.md` if it names it.

## 3. `SERVICE_KINDS` is not checked for completeness

`SERVICE_KINDS` in `src/town/town.ts` is declared `as const satisfies readonly ServiceKind[]`. That checks every member is a `ServiceKind`, not that every `ServiceKind` is in the list. A service added to the union and forgotten in the list compiles, and `board.rewardSetAsideFor` then rejects its name as unknown.

Make the compiler catch it, for example by deriving `ServiceKind` from the list. `EMPLOYER_KINDS` in the same file has the same shape and the same gap.

## Comments
