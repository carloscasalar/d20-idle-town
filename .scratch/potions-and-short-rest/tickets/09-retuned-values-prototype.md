# Retuned values prototype

Type: prototype (wayfinder:prototype)
State: closed
Claimed-by: carloscasalar (session 2026-10-11)
Blocked-by: 08-town-economy-of-potions

## Question

Which concrete values make the new rules pass the acceptance of [Balance targets for the retune](07-balance-targets.md)? A throwaway economy and combat model (not the shipped code) lets us react to numbers before the PRD fixes them.

Values to choose, all within the knobs [07](07-balance-targets.md) allows:
- `potionCoverFraction` (0.5 by default, [05](05-potion-buying-and-drinking-policy.md)).
- The sharing policy weights (50 / 50 by default).
- The tier divisor of the buying rule, currently the fixed `N / 2` of [05](05-potion-buying-and-drinking-policy.md). Candidate knob for the supreme tier question: at the defaults only a company averaging about 200 maximum hit points buys it, so the top tier is practically dead. Decide whether to make the divisor a configuration value and lower it, change `potionCoverFraction`, or accept an unreachable supreme tier.
- `board.difficultyScale` default, `expedition.retreatHpFraction`, encounters per Contract or Bounty, and the starting purse of new level-1 companies (`heroes.startingGoldPerLevel`).
- The apothecary's reserve and starting treasury, only if the model shows they are needed (their meaning is fixed by [Town economy of potions](08-town-economy-of-potions.md)).

The prototype is judged against the acceptance of [07](07-balance-targets.md): all five `tune.ts` metrics within +/-15% at scales 1.15 and 1.5 over seeds 1 to 80, and deaths per quest still rising with the scale at 1, 1.25 and 1.75. Part of the ticket is deciding how much of the real simulator the prototype can reuse and what that means for how far its numbers can be trusted; the final confirmation with the real `tune.ts` belongs to implementation and goes in the PRD as a check.

## Notes from other tickets

- From [03](03-short-rest-spending-policy.md): a Short rest costs one tick per gap, and `retreatHpFraction` is evaluated after the Hit Dice are spent.
- From [06](06-healing-rolls-and-seeded-run-stability.md): healing rolls are real dice; the model must roll, not average.
- From [08](08-town-economy-of-potions.md): the apothecary offers `floor((treasury - reserve) / cost)` potions per tier, so the supreme tier also needs more than 10,000 gp in its treasury; the reserve is `reserveDays x upkeepPerDay` with `reserveDays` 3 by default (a first guess, free to move); production is instant; the baseline apothecary treasury averaged about 5,500 gp after 600 ticks. Measure through the apothecary's treasury and the production statistic `goldSpentOnProduction`.
- The prices, healing formulas and Hit Dice rules do not move ([07](07-balance-targets.md)).

## Resolution

Decided with carloscasalar on 2026-10-11, after reading the sweep tables in [assets/09-sweep-results.md](../assets/09-sweep-results.md).

**Values chosen.** One value moves; one rule is added.

| Knob | Value | Why |
|---|---|---|
| `heroes.startingGoldPerLevel` | **50** (was 20) | A level 1 company starts with 20 gp and the cheapest potion costs 50, so no company could buy anything before its first reward. At 50 every metric sits closer to the baseline than at 20 (resurrections go from -12% to +2% at scale 1.5). 75 and 100 give no better fit and 100 breaks the band (resurrections +25% at 1.5). |
| `potionCoverFraction` | 0.5 (unchanged) | 0.25 to 0.5 pass; 0.75 and 1.0 fail (too easy: failed quests -14% to -24%). |
| Sharing policy weights | 50 / 50 (unchanged) | 100/0 and 0/100 differ from 50/50 by less than the noise; the model cannot tell them apart. |
| Tier divisor | `N / 2`, fixed, no configuration value | See supreme tier below. |
| `board.difficultyScale` | 1.15 (unchanged) | The new rules already sit inside the band at 1.15 and 1.5 without touching it. |
| `expedition.retreatHpFraction` | 0.35 (unchanged) | 0.25 and 0.45 change nothing visible. |
| Encounters per Contract or Bounty | unchanged | Not needed. |
| Apothecary `reserveDays` | 3 (unchanged) | 0, 3 and 10 give the same numbers; the reserve does not decide whether the shop survives. |
| Apothecary opening treasury | unchanged | 3,000 instead of 800 to 1,600 removes the early ruins at 600 ticks but does not fix the long run (below). |

**Supreme tier (the question in this ticket).** Accepted as unreachable for now, with the divisor left at `N / 2`. The cause is the economy, not the divisor: the richest company purse over 80 runs of 600 ticks was about 8,000 to 9,000 gp against a 20,000 gp price, and the apothecary treasury peaked at 8,830 against the 10,000 gp plus reserve it needs to offer one. Lowering the divisor to 1 or 0.5 makes the greater potion common (40 to 54 bought per run instead of 2) and the superior appear at most 0.2 times per run, and still no supreme. In 3,000 ticks (20 runs) supreme was still never bought and superior 0.1 to 3 times per run. The owner is fine with the top tier appearing only as the game grows; the same rules will bring it.

**New rule: apothecary credit.** Proposed by the owner after the sweep showed the apothecary going broke in long runs. When a company completes a Contract the apothecary posted, the apothecary gains an abstract advantage (raw materials or workers) that halves the production cost of its potions until the savings equal the reward it paid. Prototyped as: the apothecary holds a credit counter; completing its Contract adds the reward to the counter; each potion produced is discounted by the smaller of the counter and half its production cost, and the counter falls by the discount. The offered count of [08](08-town-economy-of-potions.md) is still computed from the full cost. The company's price does not change, so only the apothecary's margin moves. Effect (purse 50): at 600 ticks all five metrics stay in the band (table below) and apothecaries ruined fall from 5 of 160 to 1 of 160 at scale 1.15; at 3,000 ticks the ruined share falls from 12 of 20 to 7 of 20. It refines [08](08-town-economy-of-potions.md) "no special rule for rewards". Details the PRD must fix: whether the credit is capped (the prototype does not cap it), whether it survives a ruined shop (ruin is permanent, so it does not matter), and the name in `CONTEXT.md`.

**Residual: the apothecary in long runs.** With the new rules the apothecary keeps half of every potion sale, where today it keeps all of it, and its rewards are the bulk of what it spends (by subtraction: upkeep is about 3,100 gp of the 87,800 it spends in 3,000 ticks; the rest is reward and posting costs, not itemised). At 3,000 ticks with purse 50: ruined 12 of 20 (today 0 of 20); with the credit rule 7 of 20. Opening treasury 3,000 gives 9 of 20, `reserveDays` 10 gives 10 of 20. The movable knobs of [07](07-balance-targets.md) cannot fix it; prices are fixed, and the apothecary's income and upkeep (`town` and `holdings` sections) are outside them. The owner's decision: accept it as a known consequence and put a 3,000-tick apothecary check in the PRD (fraction of apothecaries ruined, treasury at the end); if it is still ruinous after the credit rule the owner does not know what else would save them, so that stays open for the implementation session to measure with the real code.

**Acceptance result at 600 ticks (seeds 1 to 160: the 80 of [07](07-balance-targets.md) plus 80 held out; each cell is the deviation from the baseline measured on the same seeds, average of the two halves).** Pass means all five within +/-15%.

| Candidate | Scale | quests | failed | deaths per quest | wiped | raised | Pass |
|---|---|---|---|---|---|---|---|
| A: new rules, defaults of the tickets | 1.15 | -5.9% | -8.2% | +6.1% | +5.1% | -8.0% | yes |
| | 1.5 | -7.9% | -11.4% | +3.3% | -4.6% | -12.4% | yes, close |
| B: A with purse 50 | 1.15 | -5.2% | -8.6% | +6.8% | +8.3% | -3.5% | yes |
| | 1.5 | -6.2% | -10.9% | +2.4% | -2.7% | +1.9% | yes |
| **Chosen: B with the apothecary credit** | 1.15 | -5.1% | -8.7% | +5.9% | +7.3% | -3.7% | yes |
| | 1.5 | -6.4% | -10.8% | +2.9% | -3.0% | +2.4% | yes |

Scale shape (seeds 1 to 80, deaths per quest, purse 50 without the credit): 0.41 at 1, 0.79 at 1.15, 0.94 at 1.25, 1.53 at 1.5, 2.26 at 1.75, rising as required. Not rerun with the credit rule, whose only effect is on the apothecary.

**Baseline (re-measured as [07](07-balance-targets.md) asked).**
- Commit `ed52b20` (tip of `feature/potions-healing`; the code under test is identical to its tip because the commits since the last change to `src/` only touch documentation). It is not the local `main`: that branch is 129 commits behind and has no `services.ts`, no apothecary and no Contract or Bounty, so "main" in [07](07-balance-targets.md) cannot mean it.
- Seeds 1 to 80, 600 ticks, `Game({ seed, board: { difficultyScale } })`, same fields as `scripts/tune.ts` but unrounded. Seeds 81 to 160 were measured too, as a held-out half.

| Scale | quests | failed | deaths | deaths per quest | wiped | arrived | raised |
|---|---|---|---|---|---|---|---|
| 1 | 139.11 | 19.51 | 60.79 | 0.437 | 4.99 | 23.1 | 9.95 |
| 1.15 | 113.86 | 28.14 | 85.19 | 0.748 | 7.21 | 30.1 | 11.24 |
| 1.25 | 104.80 | 32.99 | 97.38 | 0.929 | 8.01 | 33.8 | 11.74 |
| 1.5 | 83.05 | 41.06 | 123.15 | 1.483 | 11.26 | 40.8 | 11.76 |
| 1.75 | 61.42 | 46.63 | 138.99 | 2.263 | 12.71 | 45.1 | 11.36 |

- The command of the real script: `SEEDS=$(seq 1 80 | paste -sd, -) SCALES=1,1.15,1.25,1.5,1.75 TICKS=600 pnpm dlx vite-node scripts/tune.ts`. Do not write it with `seq -s, 1 80`: on macOS that leaves a trailing comma, `Number('')` is 0, and the script quietly runs 81 seeds (seed 0 included). That is the only reason its rounded output differs from the table (failed 19 at scale 1 instead of 20). The rounded output otherwise matches: 139 / 114 / 105 / 83 / 62 quests.
- Runs are deterministic: the same seed gives the same result whether 10 or 80 seeds share a process.
- Noise between halves: the baseline's deaths per quest moved from 0.748 to 0.713 (-5%) between seeds 1-80 and 81-160, and the all-defaults candidate's wiped count from 6.92 to 7.83 (+13%) with nothing changed but the seeds. Wiped is the noisiest metric (9% per 10 seeds in [07](07-balance-targets.md)); a 15% band over 80 seeds is not a loose test for it.

**How far to trust the numbers.**
- *What it reused.* The real simulator: the same combat engine, quest generation, board, roster, town and coin code, edited in the working tree of this branch behind one switch, never committed. With the switch off it reproduced the baseline of all 10 checked seeds exactly (and later all 80 at scale 1), so everything outside the new rules is the real thing.
- *What it wrote on top.* The rules of [03](03-short-rest-spending-policy.md), [05](05-potion-buying-and-drinking-policy.md), [06](06-healing-rolls-and-seeded-run-stability.md) and [08](08-town-economy-of-potions.md): a Hit Dice pool per hero read from the engine's `hpFormula`; a Short rest as its own tick with dice, then the retreat check, then potions for the still Bloodied; real dice from the game's `Rng` with a sub-seed for combat potions and one seed per rest; four tiers with assured healing and the buying rule; the apothecary offering `floor((treasury - reserve) / cost)` per tier with the production sink and `goldSpentOnProduction`; the two sharing policies drawn at company creation.
- *What it left out or simplified.* Configuration plumbing and validation (the values were set by a switch in code), log lines and UI, the policies object (the prototype stores the policy and the pack on the company), tests. The count of encounters ahead uses the known count when revealed and 6 otherwise (the largest a Contract or Bounty can hold with today's configuration). Production is instant.
- *What it did not check.* The new rules path has no unit tests and was not compared against an independent implementation; its plausibility rests on the figures it produced (about 730 Hit Dice rolled and 250 rests per run at scale 1.15, 340 basic potions bought) and on the apothecary accounting of earned and spent adding up. A transcription mistake would show up as a shift in these metrics, but this is the weakest part of the evidence and the reason the real `tune.ts` check below is required.
- *Not kept.* The prototype code is discarded, by the owner's choice: an implementation session built from these tickets should land on something very close. The sweep results are kept in [assets/09-sweep-results.md](../assets/09-sweep-results.md).

**For the PRD.**
- Set `startingGoldPerLevel` to 50 and add the apothecary credit rule.
- Add the checks: the acceptance of [07](07-balance-targets.md) with the real `scripts/tune.ts` (seed range syntax, scale 1.15, unrounded output, baseline file); the scale-shape check at 1, 1.25 and 1.75; the 3,000-tick apothecary check above.
- State that the supreme tier is expected to stay unbought at 600 ticks and that this is intended.
- The seed-list caveat above belongs in the `tune.ts` change (take a range, `SEEDS=1..80`, as [07](07-balance-targets.md) already says).

## Comments
