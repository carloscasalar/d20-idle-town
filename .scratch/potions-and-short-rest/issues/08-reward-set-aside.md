# Reward set-aside

Status: ready-for-agent

Blocked-by: [05 - Buying policy](05-buying-policy.md), [07 - Apothecary production](07-apothecary-production.md)

The PRD's slice table blocks this slice by production only. The owner added the buying policy as a blocker, so that the long-run check this slice runs is measured with the final buying rule.

## Parent

[PRD: Hit Dice at the short rest, four healing potion tiers and an apothecary that makes them](../PRD.md), slice 7 of 8. Vocabulary: [CONTEXT.md](../../../CONTEXT.md) (Reward set-aside, Treasury, Contract, Board).

## No questions

The owner is not available while this issue is built. Do not ask and do not wait for an answer. Where this issue or the PRD leaves a choice to the implementer (key names, file locations, log wording), decide and write the decision under Comments. Where this issue gives a rule for a doubt or a failure, follow it.

## What to build

The apothecary's promised rewards are kept apart from what new rewards are sized from, so paying a reward never leaves its treasury in debt.

- A rule of any employer: the gold promised in the rewards of its Contracts that are posted and not yet paid, failed or expired (`open` or `taken`) is kept out of the treasury that a new reward is sized from (the amount `treasuryShare` applies to).
- Which employers set their rewards aside is a configuration list. An entry is either a town service (for example `apothecary`, the one employer that runs it) or an employer kind (for example `noble`, every employer of that kind). Validation rejects a name that is in neither catalogue. Default: `apothecary` alone. Extending the rule to another employer is adding it to the list.
- The amount is a property of the employer's outstanding work. Whether it is stored or computed from the Board's list is the implementer's choice; the Board stays the only thing that links an employer to its work.
- The amount is released when the Contract is paid, fails or expires.
- Upkeep is unchanged and can still take a treasury below zero.
- Out of scope: switching the rule on for employers other than the apothecary. The rule is built for it; the other employers are untested and still dip into debt.

## Final check 3: the apothecary over a long run

This slice runs final check 3 with the real `scripts/tune.ts` as its own acceptance. [Issue 09](09-retune-confirmation.md) runs it again with every slice merged.

- Run: 3,000 ticks, seeds 1 to 40, scale 1.15 (`TICKS=3000 SEEDS=1..40 SCALES=1.15`).
- Pass: no apothecary treasury below zero at any tick, and no more apothecaries ruined than the figure issue 02 recorded in the baseline file (ticket 09 measured 2 of 40).
- For reference, the prototype had 0 ruined and a lowest treasury of +152 gp. It is evidence, not a reference implementation.
- This is a measurement over 40 seeds, not a guarantee, because upkeep can still take a treasury below zero.
- Write the command and the report's output in the Comments of this issue.
- If issue 06 (sharing policy) is not merged when this runs, say so with the result.

### If the check fails

The owner decided this in advance:

1. If an apothecary treasury goes below zero because of the posting threshold (see the point to confirm below), apply the fix described there and run the check again.
2. If the check still fails, or fails for another reason, do not move any tuning value in this issue. Write the command, the output and the cause you found in the Comments, finish the slice and commit it. Issue 09 runs the check again and is the only issue allowed to retune.

## Point to confirm while implementing

- With the set-aside, an employer's treasury can meet `postingThreshold` while the treasury left after the rewards owed is small or zero, and `minimumReward` (20 gp) still applies to the new reward. The tickets only say that new rewards are sized from the treasury minus the rewards owed. Build it that way first.
- The owner's decision: only if the long-run check shows an apothecary treasury below zero from this cause, make the posting threshold read the same reduced amount (the treasury minus the rewards owed) for the employers in the set-aside list, and leave it as today for every other employer. Then add a test for it, describe it in `docs/CONFIGURATION.md`, run check 3 again and write both runs in the Comments. If the check passes without it, do not change the posting threshold.

## Regression hashes

The six regression hash tests were skipped by issue 03. Leave them skipped. Do not re-record them or update the snapshot; issue 09 does that once.

## Acceptance criteria

- [ ] A new reward of the apothecary is sized from its treasury minus the rewards it owes on `open` and `taken` Contracts.
- [ ] An employer outside the list is sized as today.
- [ ] An employer kind in the list switches the rule on for every employer of that kind.
- [ ] The amount set aside is released when the Contract is paid, fails or expires.
- [ ] The list is configuration, default the apothecary alone; an entry that is neither a town service nor an employer kind is rejected.
- [ ] Final check 3 was run, with its command and output recorded in this issue's Comments. If it failed, the rule of "If the check fails" was followed and the cause is written there.
- [ ] The posting threshold is unchanged unless check 3 showed an apothecary treasury below zero from it.
- [ ] The six regression hash tests stay skipped and are not re-recorded.
- [ ] The suite is green.

### Tests

New:

- Set-aside: a new reward is sized from the treasury minus the rewards owed; an employer outside the list is sized as today; an employer kind in the list switches on every employer of that kind; the amount is released when the Contract is paid, fails or expires.
- Configuration: every entry of the set-aside list is a known town service or employer kind.

## Configuration and documents

- Added: the list of employers that set their rewards aside, default the apothecary only. The key name and its section are the implementer's choice, following the rule of `docs/CONFIGURATION.md` that a value lives in the section of the module that owns it.
- Removed: none.
- `docs/CONFIGURATION.md`: the list, what an entry may be, and that only the apothecary is tested.
- `docs/ARCHITECTURE.md`: reward sizing where the Board and employers are described; the new tests in the test table.
- `CHANGELOG.md`: the Reward set-aside.

## Comments
