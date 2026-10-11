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

**Values chosen.** One configuration value moves; the apothecary's rules change in two places.

| Knob | Value | Why |
|---|---|---|
| `heroes.startingGoldPerLevel` | **50** (was 20) | A level 1 company starts with 20 gp and the cheapest potion costs 50, so no company could buy anything before its first reward. At 50 every metric sits closer to the baseline than at 20 (resurrections go from -12% to +2% at scale 1.5). 75 and 100 give no better fit and 100 breaks the band (resurrections +25% at 1.5). |
| `potionCoverFraction` | 0.5 (unchanged) | 0.25 to 0.5 pass; 0.75 and 1.0 fail (too easy: failed quests -14% to -24%). |
| Sharing policy weights | 50 / 50 (unchanged) | 100/0 and 0/100 differ from 50/50 by less than the noise; the model cannot tell them apart. |
| Tier divisor | `N / 2`, fixed, no configuration value | See supreme tier below. |
| `board.difficultyScale` | 1.15 (unchanged) | The new rules already sit inside the band at 1.15 and 1.5 without touching it. |
| `expedition.retreatHpFraction` | 0.35 (unchanged) | 0.25 and 0.45 change nothing visible. |
| Encounters per Contract or Bounty | unchanged | Not needed. |
| Apothecary `reserveDays` | **removed** | The offer gate it served is removed (below). |
| Apothecary opening treasury | unchanged | Not needed once the gate is gone. |

**Apothecary rules (these refine [08](08-town-economy-of-potions.md)).**
1. *No treasury gate on the offer.* [08](08-town-economy-of-potions.md) offered `floor((treasury - reserve) / cost)` potions per tier. That is dropped: a tier is offered whenever the apothecary is not ruined. The sale pays the full price while the production sink takes half, so making a potion never leaves the shop poorer than before it; the gate protected nothing and, as the diagnosis below shows, was the reason the shop went broke. Everything else of 08 stays (sale as `service`, production as the `production` sink, `goldSpentOnProduction`, production instant). The reserve (`reserveDays`, "Apothecary reserve" in `CONTEXT.md`) disappears with it.
2. *Promised rewards are set aside.* Proposed by the owner. When the apothecary posts a Contract, the reward is reserved: new rewards are sized from the treasury minus the rewards still owed (posted and not yet paid, failed or expired), so paying one never leaves the treasury negative. Prototyped for the apothecary only, by taking the rewards of its Contracts that are `open` or `taken` off the treasury available to `treasuryShare`. Scope, decided by the owner on 2026-10-12: the rule is for every employer, but this effort applies it to the apothecary only, and builds it so that extending it to the others is a small change (the set-aside is a property of any employer's outstanding work, not of the apothecary, and the apothecary is the only one switched on). The other employers are untested: they also dip into debt today.

**Why the apothecary went broke (diagnosis).** The first version of this resolution accepted a residual ruin as a "known consequence" and invented a credit rule to soften it; the owner refused to accept ruin of a business with a 50% margin, and tracing every movement of one shop's treasury found the cause.
- *What the shop does.* With today's rules the apothecary is a conduit: in 3,000 ticks of seed 1 it collects 79,060 gp of sales and 17,865 of holdings and pays 87,513 in rewards and 4,750 of upkeep. It lives near zero, which is why 8 of 20 seeds already dip into debt at some point today (minimum treasury between -54 and -1,012). Ruin needs three days in a row in debt.
- *Why today it recovers.* A shop in debt keeps selling; each sale is income, so it climbs out in a day or two.
- *Why the new rules ruined it.* In seed 1 a reward of 2,844 gp was paid at tick 690 with 1,724 gp in the treasury (rewards are sized when posted, several can be owed at once, and nothing reserves them). With the offer gate of 08 a shop in debt offers no potions, so no sales, and holdings income (71/day) minus upkeep (38/day) cannot climb out of -1,120 in three days: ruined at tick 744.
- *Measured (3,000 ticks, 40 seeds).* Today 2 ruined of 40 (08 measured 2 of 30). With the gate of 08: **21 of 40**. Gate removed: 1 of 40, and 21 of the 40 seeds dipped into debt at some point (worst -1,246 gp). Gate removed and rewards set aside: **0 of 40**, and no seed ever went below zero (lowest treasury over all 40 seeds +152 gp; +394 on average). That is a measurement over 40 seeds, not a guarantee: upkeep can still take a treasury under zero. Opening treasury 3,000 or `reserveDays` 10 did not help (9 and 10 of 20) because neither touches the cause.
- At 600 ticks, the horizon of the acceptance, none of these changes moves the five metrics.

**Ideas explored and not adopted.**
- *Credit rule* (a Contract done for the apothecary halves its production cost until the savings match the reward). It was a response to the wrong cause. Without the gate ruin is already at today's level (1 to 2 of 40), and the credit only raised the shop's final treasury (about 2,300 to 7,300 gp). Dropped by the owner.
- *Half of the apothecary's rewards paid in basic potions* (the shop pays the production cost instead of the price, the company receives the potions). The shop ends with 7% more gold (2,775 against 2,506) but the company gets about 690 free potions in 3,000 ticks (about 89 in 600) and buys 17% fewer, which makes the game easier (deaths per quest at 1.15 from +6% to +3% against the baseline). It passes the acceptance but moves the balance for a small gain, so the owner kept the rules without it.

**Supreme tier (the question in this ticket).** Accepted as unreachable for now, with the divisor left at `N / 2`. At 600 ticks the cause is the economy: the richest company purse over 80 runs was about 8,000 to 9,000 gp against a 20,000 gp price. Lowering the divisor to 1 or 0.5 (measured with the gate of 08 still in place) makes the greater potion common (40 to 54 bought per run instead of 2) and the superior appear at most 0.2 times per run, and still no supreme. In 3,000 ticks, with the final rules (40 runs), purses reached 21,000 to 25,000 gp and the apothecary treasury about 15,500 gp, so price alone no longer blocks it, yet supreme was still never bought and superior only 0.25 to 0.4 times per run: the `N / 2` rule needs an average maximum of about 200 hit points, which only a company of level 18 to 20 barbarians, fighters and rogues has. The owner is fine with the top tier appearing only as the game grows; the same rules will bring it.

**Acceptance result at 600 ticks (seeds 1 to 160: the 80 of [07](07-balance-targets.md) plus 80 held out; each cell is the deviation from the baseline measured on the same seeds, average of the two halves).** Pass means all five within +/-15%.

| Candidate | Scale | quests | failed | deaths per quest | wiped | raised | Pass |
|---|---|---|---|---|---|---|---|
| A: new rules, defaults of the tickets (with the gate of 08) | 1.15 | -5.9% | -8.2% | +6.1% | +5.1% | -8.0% | yes |
| | 1.5 | -7.9% | -11.4% | +3.3% | -4.6% | -12.4% | yes, close |
| **Chosen: purse 50, no gate, rewards set aside** | 1.15 | -5.0% | -9.1% | +6.1% | +8.6% | -4.3% | yes |
| | 1.5 | -6.6% | -10.6% | +3.4% | -2.3% | +1.5% | yes |

Apothecaries ruined at 600 ticks: 0 of 160 at both scales (A: 7 and 4 of 160; the baseline: 0). Scale shape (seeds 1 to 80, deaths per quest, purse 50 with the gate of 08): 0.41 at 1, 0.79 at 1.15, 0.94 at 1.25, 1.53 at 1.5, 2.26 at 1.75, rising as required. It was not rerun with the final apothecary rules; the gaps between scales are large, and the real `tune.ts` check in the PRD covers it.

**Baseline (re-measured as [07](07-balance-targets.md) asked).**
- Commit `ed52b20` (tip of `feature/potions-healing` when measured; the code under test is the same as the tip of the branch because the commits since then only touch documentation). It is not the local `main`: that branch is 129 commits behind and has no `services.ts`, no apothecary and no Contract or Bounty, so "main" in [07](07-balance-targets.md) cannot mean it.
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
- *What it reused.* The real simulator: the same combat engine, quest generation, board, roster, town and coin code, edited on this branch behind one switch (committed as a prototype, reverted in the commit after it, so both are in the history). With the switch off it reproduced the baseline of all 10 checked seeds exactly (and later all 80 at scale 1), so everything outside the new rules is the real thing.
- *What it wrote on top.* The rules of [03](03-short-rest-spending-policy.md), [05](05-potion-buying-and-drinking-policy.md), [06](06-healing-rolls-and-seeded-run-stability.md) and [08](08-town-economy-of-potions.md): a Hit Dice pool per hero read from the engine's `hpFormula`; a Short rest as its own tick with dice, then the retreat check, then potions for the still Bloodied; real dice from the game's `Rng` with a sub-seed for combat potions and one seed per rest; four tiers with assured healing and the buying rule; the apothecary's production sink and `goldSpentOnProduction`; the two sharing policies drawn at company creation; and, for this ticket, the offer without a gate and the set-aside of promised rewards.
- *What it left out or simplified.* Configuration plumbing and validation (the values were set by a switch in code), log lines and UI, the policies object (the prototype stores the policy and the pack on the company), tests. The count of encounters ahead uses the known count when revealed and 6 otherwise (the largest a Contract or Bounty can hold with today's configuration). Production is instant. The set-aside is computed on demand from the Board's list of work, not stored.
- *What it did not check.* The new rules path has no unit tests and was not compared against an independent implementation; its plausibility rests on the figures it produced (about 730 Hit Dice rolled and 250 rests per run at scale 1.15, 340 basic potions bought), on the apothecary's earned and spent adding up, and on the trace of one shop's treasury movement by movement. A transcription mistake would show up as a shift in these metrics, but this is the weakest part of the evidence and the reason the real `tune.ts` check below is required.
- *Not kept as code.* The owner does not want the prototype to condition the implementation: a session built from these tickets should land on something very close. The prototype commits stay in the git history (`4c8d98e`, `60c9945`, `1be03ae` on `feature/potions-healing`), followed by a revert (`103c02f`); the running switches are `PROTO.newRules`, `noGate` and `escrow` in `src/proto.ts` at `1be03ae`; the sweep results are kept in [assets/09-sweep-results.md](../assets/09-sweep-results.md).

**For the PRD.**
- Set `startingGoldPerLevel` to 50, remove the offer gate and `reserveDays`, and add the set-aside of promised rewards for the apothecary only, written so that it is simple to extend to every employer (the owner's decision of 2026-10-12). Implementation notes: the configuration documentation (`docs/CONFIGURATION.md`: the new keys, the removed ones and the production-time deviation) and the migration of the test fixtures that hold a party's shape (`potions` becomes a map, companies gain a policies object) are written by the implementation slices that change the code, not before; the game has no save files, so only tests need migrating.
- Add the checks: the acceptance of [07](07-balance-targets.md) with the real `scripts/tune.ts` (seed range syntax, scale 1.15, unrounded output, baseline file); the scale-shape check at 1, 1.25 and 1.75; a 3,000-tick apothecary check over 40 seeds (ruined no more often than today, 2 of 40, and no treasury below zero: the prototype's lowest was +152 gp).
- State that the supreme tier is expected to stay unbought at 600 ticks and that this is intended.
- The seed-list caveat above belongs in the `tune.ts` change (take a range, `SEEDS=1..80`, as [07](07-balance-targets.md) already says).

## Comments
