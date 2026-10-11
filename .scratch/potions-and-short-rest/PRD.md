# PRD: Hit Dice at the short rest, four healing potion tiers and an apothecary that makes them

Status: needs-triage

Source: the map in [MAP.md](MAP.md) and its closed tickets [01](tickets/01-stronger-healing-potions.md) to [09](tickets/09-retuned-values-prototype.md). Where tickets disagree, [09](tickets/09-retuned-values-prototype.md) wins over 04, 05 and 08 on the apothecary's offer. Vocabulary is that of `CONTEXT.md`.

## Problem Statement

The game says it follows D&D 2024, but healing between and during fights does not:

- A **Short rest** heals a flat half of maximum hit points, for free, as often as the company likes. Over a six-encounter Contract that is up to 250% of a hero's hit points; the rules give a level-N hero N **Hit Dice** per day, worth about 85 to 90% in total.
- A **Healing potion** heals a third of the drinker's maximum hit points and costs `25 + 10 x level` gp. The rules have four potions with fixed dice (2d4+2, 4d4+4, 8d4+8, 10d4+20) and prices that do not depend on the buyer.
- The apothecary sells potions out of nothing: the full price lands in its treasury and no gold leaves the world.
- Correcting these moves the difficulty, so the game must be retuned to stay where it is today.

## Solution

- Each hero has a pool of **Hit Dice**, as many as their level. A **Short rest** is one logged hour in which heroes roll dice from that pool; the pool returns at the **Long rest** in town.
- The apothecary sells the four SRD **Healing potion** tiers at 50 / 200 / 2,000 / 20,000 gp. A company's pack holds a count per tier; it buys by a stock target, drinks the smallest tier that covers the missing hit points, and shares a short pack by its **Potion sharing policy**.
- Healing is rolled with real dice from the game's own seeded generator.
- The apothecary makes each potion on demand, instantly, paying a production cost that leaves the world. It offers every tier while it is not ruined. Its promised rewards are set aside (**Reward set-aside**), so paying one never puts its treasury in debt.
- Difficulty is retuned with one value: `heroes.startingGoldPerLevel` goes from 20 to 50. The result is checked with the real `scripts/tune.ts` against a recorded baseline.

## User Stories

Hit Dice and rests

1. As a player watching a company, I want each hero to have as many Hit Dice as their level, so that healing on the road is a limited daily resource as in D&D 2024.
2. As a player, I want a hero who gains a level to gain one Hit Die without getting spent dice back, so that levelling is not a free heal.
3. As a player, I want the die size and the Constitution bonus of each class to be the ones the combat engine uses for hit points, so that the two never disagree.
4. As a developer, I want a clear error when the engine's hit point formula changes shape, so that a silent wrong die size cannot ship.
5. As a player, I want every living hero's Hit Dice restored at the Long rest in town, so that a rested company starts each expedition whole.
6. As a player, I want that Long rest to restore the dice whether or not the company paid for rooms and whether or not the tavern is ruined, so that recovery does not depend on the inn's fortunes.
7. As a player, I want a hero who died and was raised to keep their pool as it was, so that death is not a way to refill it.
8. As a player, I want a company to take a Short rest only when some living hero is hurt, so that an unhurt company loses no time.
9. As a player, I want a Short rest to cost one hour and appear in the expedition log, so that I can see it and it has a price in time.
10. As a player, I want the log to show what each hero rolled at the rest, so that I can follow the healing.
11. As a player, I want heroes to spread their remaining dice over the encounters still ahead, so that they do not burn the pool at the first rest.
12. As a player, I want a hero to stop rolling at maximum hit points, so that dice are not wasted.
13. As a player, I want the pacing to count the most encounters the job could hold when the count is unknown, so that a company on an unscouted job stays cautious.
14. As a player, I want a hero with no dice left to simply recover nothing, so that the rest still works for the others.
15. As a player, I want the company to decide whether to turn back after the dice are rolled, so that the decision uses the hit points it really has.
16. As a player, I want heroes still Bloodied after the dice to drink a potion if the company goes on, so that potions are the second line and not the first.
17. As a player, I want a company that turns back to keep its potions, so that it does not waste them on the walk home.
18. As a developer, I want the pacing behind a swappable interface, so that another strategy is a new implementation with no change to callers.

Potions

19. As a player, I want the four SRD healing potions (basic, greater, superior, supreme), so that high-level companies have potions worth drinking.
20. As a player, I want each tier to heal its SRD dice (2d4+2, 4d4+4, 8d4+8, 10d4+20), so that a potion does not scale with the drinker.
21. As a player, I want potion prices of 50 / 200 / 2,000 / 20,000 gp whatever the buyer's level, so that prices follow the SRD.
22. As a configurer, I want the tiers to be a configurable list with their formula, price and production cost, so that I can drop or change a tier.
23. As a player, I want the company's pack to hold a count per tier, so that I can read "2 basic, 1 greater".
24. As a player, I want a company to restock until its pack can heal each living hero for half their maximum hit points, with at least one potion per hero, so that supply grows with the company.
25. As a player, I want a company to favour the lower tiers and buy one tier per visit, so that purchases stay readable and cheap potions dominate.
26. As a player, I want a company that cannot afford its chosen tier to step down to a cheaper one, so that a poor company still buys something.
27. As a player, I want a company to keep its resurrection reserve when buying potions, so that potions never cost it a raising.
28. As a player, I want a Bloodied hero to drink the smallest tier that covers the hit points they are missing, or the strongest if none does, so that strong potions are not wasted on scratches.
29. As a player, I want a fallen hero to be given a potion by a conscious companion, as today, so that the between-rounds rescue survives.
30. As a player, I want the combat log to show the potion and its roll, so that I can see what a drink did.
31. As a player, I want companies to differ in how they share a short pack (company order, or fallen first and then the most hurt), so that companies have character.
32. As a player, I want a merged company to keep the host's policy, so that a merger has a clear outcome.
33. As a balancer, I want a new company to start with 50 gp per level, so that the retuned game sits closest to today's difficulty.
34. As a player, I accept that the supreme potion is not bought in a 600-hour game, so that the top tier arrives as the game grows instead of by a special rule.

Dice and seeds

35. As a player, I want healing rolled with real dice, so that a potion or a Hit Die can heal more or less than expected.
36. As a developer, I want one dice module for every `NdM+K` roll and for the assured healing figure, so that planning and rolling cannot drift apart.
37. As a developer, I want the engine's own dice never called by the game, so that a run cannot silently stop being reproducible.
38. As a developer, I want a seed to reproduce its own run exactly, so that bugs can be replayed.
39. As a developer, I want healing rolls not to move unrelated world draws, so that a change to healing does not reshuffle the town.
40. As a tester, I want to script the dice in a fight and at a rest, so that tests state exact outcomes.

Apothecary economy

41. As a player, I want the apothecary to pay to make each potion, so that potions remove gold from the world.
42. As a player, I want the apothecary to earn the difference between price and production cost, so that selling potions is a real trade.
43. As a balancer, I want a lifetime statistic of gold spent on production, so that I can measure that sink.
44. As a player, I want the apothecary to offer every tier while it is not ruined, so that a shop short of gold can still sell its way out.
45. As a player, I want a company facing a ruined apothecary to go on with its Hit Dice and the potions it carries, so that the game does not stall.
46. As a player, I want the apothecary's promised rewards kept apart from what new rewards are sized from, so that paying a reward never leaves it in debt.
47. As a developer, I want the set-aside written as a rule of any employer and switched on by a list, so that extending it to other employers is a configuration change.
48. As a configurer, I want a production time per tier that is zero by default, so that production time can be switched on later without a new model.
49. As a reader of the documentation, I want the instant production stated as a deviation from the SRD, so that I know it is deliberate.

Retune and checks

50. As a balancer, I want the game to stay within 15% of today's five tuning metrics at scales 1.15 and 1.5, so that the new rules do not change the difficulty.
51. As a balancer, I want deaths per quest still to rise with the difficulty scale, so that the scale keeps its meaning.
52. As a balancer, I want `scripts/tune.ts` to take a seed range, measure scale 1.15, print unrounded values and compare against a recorded baseline, so that the acceptance is one command.
53. As a balancer, I want a long-run report on the apothecary (ruined, lowest treasury, production gold), so that I can prove the shop does not go broke.
54. As a developer, I want the regression hashes re-recorded once, at the end, with a note in the changelog, so that the history shows one deliberate break.

## Implementation Decisions

### Hit Dice pool

- Each hero stores the number of Hit Dice spent, starting at 0 (`hitDiceSpent`). Remaining dice are level minus spent, so the maximum is the level and a level-up needs no code.
- Die size and Constitution bonus are parsed from the engine's `hpFormula` (for example `5d10+10`) by one function that throws a clear error if the format changes. The SRD class table is not copied into the game.
- A Hit Die heals `1dN + Constitution`, never less than 1. The clamp cannot fire today (Constitution is +2 for every class) but is written. The exact SRD 5.2 wording of the minimum was not found; confirm it when implementing.
- The pool resets to 0 spent at the end of the `resting` stage after a homecoming (the **Long rest**, `restTicks`, 8 hours), in the same place that heals living heroes to full, with or without paid rooms and with or without a ruined tavern.
- Death and resurrection do not touch the pool.
- Not modelled, documented as a divergence: one Long rest per 24 hours.

### Short rest

- After winning an encounter that is not the last, the company rests only if some living hero is below maximum hit points. The rest is its own tick (one hour) with a log line. If nobody is hurt there is no rest, no tick, no log line and no random draw; the retreat check still runs in the combat tick, where only the alive-count condition can fire.
- Order inside the rest tick: (1) each living hero spends Hit Dice; (2) the company decides whether to turn back, with the hit points the dice left (`retreatHpFraction` now reads this state); (3) if it goes on, each living hero still Bloodied, in the order of the Potion sharing policy, drinks one potion if the pack has one, whether or not they have dice left. A company that turns back keeps its potions.
- Spending is a pacing strategy behind a swappable interface (inputs: hero, dice remaining, encounters ahead; output: a quota of dice). The default quota is `ceil(D / E)`, `D` dice remaining and `E` encounters ahead. The hero rolls one die at a time and stops at the quota or at maximum hit points. A hero with no dice recovers nothing; no error and no special log line. There is no configuration value to choose the strategy until a second one exists.
- Encounters ahead: exact when the job's encounter count is known. Otherwise the most the job could hold, from configuration: the largest `encounterCounts` entry for a Contract, `encounters[1] + 1` (the boss) for a Bounty, never below the encounters already revealed. The boss counts as an encounter.
- The spending function is pure and takes a dice source, so it can be tested alone.

### Potion catalogue, pack and prices

- The catalogue is a configurable list of tiers. Each tier has a name, a healing formula, a selling price and a production cost. Defaults:

  | Tier | Heals | Price (gp) | Production cost (gp) | Assured healing |
  |---|---|---|---|---|
  | basic | 2d4+2 | 50 | 25 | 8 |
  | greater | 4d4+4 | 200 | 100 | 16 |
  | superior | 8d4+8 | 2,000 | 1,000 | 32 |
  | supreme | 10d4+20 | 20,000 | 10,000 | 50 |

- The production cost is a configuration value per tier, not derived from the price.
- **Assured healing** is derived from the formula by the dice module, never typed: each die counts as half its faces plus 1, plus the fixed bonus. It is a planning value only. "Smaller" and "stronger" tier mean lower and higher assured healing.
- Price no longer depends on the buyer's level. No gating by hero level or town size.
- The company's pack is a map from tier to count, with keys from the catalogue. The same shape travels through the combat options, the combat outcome (potions drunk per tier, subtracted by the Expedition), the company merger (added tier by tier), the game view and the UI ("2 basic, 1 greater"). No per-potion objects.

### Buying

- Checked on the visit to the apothecary, in the existing `potions` service step. One tier per visit, one purchase, one log line.
- Stock target: for each living hero `need = ceil(maxHp x potionCoverFraction)` (default 0.5). The company wants the assured healing of its whole pack to reach the sum of the needs, and at least one potion per living hero.
- Tier: with `N` = sum of needs / living heroes, the highest offered tier whose assured healing is at most `N / 2`, or the lowest tier if none. The divisor 2 is fixed in code, not configuration.
- Count: the fewest potions of that tier that meet the target. If the budget (purse minus the unchanged reserve of one resurrection) cannot pay for that count, step down to a cheaper tier whose count it can pay; if even basic does not fit, buy as many basic as it affords.
- A ruined apothecary offers nothing: the step returns false and the company goes on with its Hit Dice and the potions it carries. This is the only case in which the shop limits a purchase.

### Drinking and sharing

- One selection function, used between rounds in combat and at the Short rest: the smallest tier in the pack whose assured healing covers `maxHp - hp` (for a fallen hero, `maxHp`), otherwise the strongest tier in the pack. `maxHp` is the maximum in that fight, blessings and items included, as Bloodied already uses.
- Still at most one potion per Bloodied hero per round, between rounds and before the flee check, at no action cost. The companion who administers to a fallen hero is still the first conscious one in company order.
- **Potion sharing policy**: behind a swappable interface, it orders the Bloodied heroes when the pack is short, in combat and at the rest. Two implementations: (a) company order, today's behaviour; (b) fallen heroes at 0 hit points first, then the rest from the lowest to the highest hit point fraction.
- The policy is drawn once when the company is constituted, from the simulation's seeded generator, at a fixed place in company creation, with configurable weights (default 50 / 50; 100 / 0 reproduces today's order).
- The company stores a small policies object holding it, so buying or Hit Dice pacing can join later without changing callers. A merger keeps the host's policies. A company with no recorded policy uses (a).

### Dice and seeded-run stability

- One game-side dice module in the core layer parses and rolls `NdM+K` over the game's `Rng`, or over any source offering `int(min, max)` so tests can script it. It serves potion formulas, assured healing and Hit Dice. A formula that does not parse throws.
- The engine's exported `rollDice` is never called (outside `withRng` it falls back to `Math.random()`). The engine only receives a number through its `heal` call.
- Combat: the adapter rolls the chosen potion and passes the total to `heal`. The roll comes from a dedicated child generator taken with one `seed()` draw right after placement, after every setup draw, so nothing before it moves and healing does not mirror the engine's stream. The combat options gain an optional dice source for tests. Log line, for example: "Nym drinks a greater healing potion (4d4+4: 14)".
- Short rest: exactly one `seed()` draw from the world stream per rest, and only when a rest happens. Every Hit Die of every hero, then the potions of step 3, roll from one local generator made from that seed, in that order. The world stream advances the same amount per rest whatever the dice spent, the pacing or the company size.
- Promise: a seed reproduces itself, and healing changes never shift unrelated world draws. Trajectories are not byte-identical to today's.

### Apothecary economy

- Sale: the existing `service` reason. The company's purse pays the apothecary's treasury the full price, counting as `goldSpentByHeroes`; no adventurer is named.
- Production: a new coin reason `production`, in code with the rest of the reason table: a sink out of the apothecary's treasury with `spent` true and every other effect false. Per potion the sink runs first and the sale second, with no event between them.
- A new lifetime gold statistic, `goldSpentOnProduction`, moved only by `production`, exposed wherever the other gold statistics are. No count per tier.
- Made on demand, no shelf. The apothecary offers every tier whenever it is not ruined. There is no treasury gate, no reserve and no `reserveDays` (these appeared only in tickets and must not be built).
- Production is instant. A configuration table of production ticks per tier exists with every value 0. The model reads the table, but a non-zero value has no behaviour in this PRD; the documentation says so and names the SRD figures (1, 5, 25 and 62.5 days) as the deviation.
- Ruin stays permanent, for the apothecary as for every service.

### Reward set-aside

- A rule of any employer: the gold promised in the rewards of its Contracts that are posted and not yet paid, failed or expired (`open` or `taken`) is kept out of the treasury that a new reward is sized from (the amount `treasuryShare` applies to).
- Which employers set their rewards aside is a configuration list. An entry is either a town service (for example `apothecary`, the one employer that runs it) or an employer kind (for example `noble`, every employer of that kind); validation rejects a name that is in neither catalogue. Default: `apothecary` alone. Extending the rule to another employer is adding it to the list.
- The amount is a property of the employer's outstanding work. Whether it is stored or computed from the Board's list is the implementer's choice; the Board stays the only thing that links an employer to its work.
- Upkeep is unchanged and can still take a treasury below zero.

### Configuration

Appears:
- The potion catalogue (per tier: name, formula, price, production cost).
- `potionCoverFraction`, default 0.5.
- The sharing policy weights, default 50 / 50.
- The production ticks per tier, default 0 for all.
- The list of employers that set their rewards aside, default the apothecary only.

Disappears, with validation and documentation:
- `expedition.shortRestHealFraction`.
- `heroes.potionBase`, `heroes.potionPerLevel`, `heroes.potionHealMinimum`, `heroes.potionHealDivisor`, and the price and heal functions that read them.

Never built: the apothecary reserve and `reserveDays` of tickets 04 and 08. They existed only in the tickets, ticket 09 removed them, and no key or rule for them is added.

Changes default:
- `heroes.startingGoldPerLevel`: 20 to 50.

Unchanged, confirmed by ticket 09: `board.difficultyScale` 1.15, `expedition.retreatHpFraction` 0.35, the encounter counts of Contracts and Bounties, the apothecary's opening treasury, the buying reserve of one resurrection.

Not configuration: the tier divisor `N / 2`, the pacing strategy, the `production` reason's effects.

The key names not written above, and the section each new key lives in, are the implementer's choice, following the rule of `docs/CONFIGURATION.md` that a value lives in the section of the module that owns it. Validation covers: every formula parses, prices and production costs are not negative, production ticks are whole numbers, the weight list is not empty or all zero, every entry of the set-aside list is a known town service or employer kind, and unknown or missing fields as today.

### Documentation the implementation updates

Each slice updates the documents its code changes, in the same commit:

- `docs/CONFIGURATION.md`: the new keys and tables; the removed keys; the `heroes` prose (potion price and heal formulas go); `startingGoldPerLevel` 50; `retreatHpFraction` described as evaluated after the Hit Dice; a statement of the production-time deviation (the SRD asks for 1 / 5 / 25 / 62.5 days per potion, the game makes them instantly, the table of ticks is the switch and is all zero).
- `docs/ARCHITECTURE.md`: the test table and the seeding section (the rest seed, the combat potion sub-seed, the policy draw, the dice module, the ban on the engine's dice).
- `CHANGELOG.md`: the feature, and the re-recorded regression hashes.
- `CONTEXT.md` already holds the vocabulary (Hit Dice, Long rest, Short rest, Healing potion, Assured healing, Potion sharing policy, Reward set-aside). Check it still matches at the end; change it only if the code ends up different.

### `scripts/tune.ts`

- Seeds accept a range, `SEEDS=1..80`, as well as a comma list. An empty entry is an error instead of seed 0.
- The default scales include 1.15: 1, 1.15, 1.25, 1.5, 1.75.
- Output is unrounded for the five metrics: quests, failed, deaths per quest, wiped, raised.
- A baseline file checked into the repository holds the per-scale values, the commit they were measured on and the command. The script compares a run against it, prints each metric's deviation and says pass or fail at +/-15%.
- An apothecary report, read from the game view on every tick: apothecaries ruined, the lowest treasury reached, the treasury at the end, and `goldSpentOnProduction` once it exists.
- The baseline is recorded before any change to the game code.

## Testing Decisions

A good test here states behaviour through a module's public interface (a rest heals this much with these scripted dice, a visit buys these potions with this purse), not how the code gets there. Dice are scripted through the dice source instead of searching for a lucky seed. Prior art: the expedition tests with their rules helper, the combat potion tests, the coin movement tests that hold each treasury equal to opening plus earned minus spent, the configuration validation tests, and the town service step tests.

### New

- Dice module: parse, scripted roll, bounds, assured healing of the four default tiers (8, 16, 32, 50), a parse failure throws.
- Hit point formula parser: die size and Constitution for the engine's classes; a changed format throws.
- Hit Dice: minimum 1 per die; the spending function stops at maximum hit points and at the quota; the default quota; a hero with no dice recovers nothing; encounters ahead for a known count, an unknown Contract and an unknown Bounty.
- Long rest: `hitDiceSpent` is 0 after the rest, with and without paid rooms. Level-up keeps spent dice. Death and resurrection leave the pool alone.
- Short rest: no rest, no tick, no log line and no seed draw when nobody is hurt; exactly one world seed per rest whatever the dice spent; the order dice, retreat check, potions; a company that turns back keeps its potions.
- Buying: the stock target and the floor of one potion per hero; the tier choice (a 32 HP fighter buys two basic, a 90 HP hero three greater); the step-down by budget; the reserve respected; nothing bought from a ruined apothecary.
- Drinking: the smallest covering tier, otherwise the strongest; a fallen hero counts `maxHp`.
- Sharing: both orders; the default for a company with no policy; a merger keeps the host's; the weights 100 / 0 always draw company order.
- Engine stream: the same fight with potions rolled low or high has an identical engine log until the first drink.
- Coin: `production` sinks from the treasury, moves `spent` and `goldSpentOnProduction` only; the sink precedes the sale; the treasury identity still holds.
- Set-aside: a new reward is sized from the treasury minus the rewards owed; an employer outside the list is sized as today; an employer kind in the list switches on every employer of that kind; the amount is released when the Contract is paid, fails or expires.
- Configuration: validation of every new key; the removed keys are rejected as unknown.
- `tune.ts` argument parsing: a range, a list, and a trailing comma rejected.

### Rewritten

- The three short-rest tests of the expedition suite (the 50% heal and `shortRestHealFraction: 0.25`).
- "uses one world seed per fight, takes a short rest, and returns after clearing the contract": its mirror generator now has a rest seed between the fights, so its assertion and its name change.
- The town service tests of the potion step, for the new buying rule and prices.

### Survive

- By scripting: the combat potion tests on seeds 1 and 2 and the "hp 18" expectation. The roll comes from a sub-seed after placement, so the fights are the same; a scripted source giving 3 and 3 makes 2d4+2 equal 8, the old heal of a 20 HP hero. Migrate them that way instead of re-deriving the scenarios.
- Unchanged: `smoke` (determinism and interleaving), `combat-space` seed 75, `lairs` seed 14, `deployment`, and the seeded loops of the company roster tests.

### Fixture migration

- `potions` becomes a map from tier to count and companies gain a policies object. About a dozen test files and the test helpers hold a company's shape. Each is migrated by the slice that changes that shape. The game has no save files, so nothing else migrates.

### Regression hashes

- The three hashes of the simulation regression test and the three `STRIPPED_WORLD` hashes of the job-intel regression test break with the first slice that changes behaviour. That slice marks those tests skipped, with a comment pointing at the last slice. No slice in between records them.
- The last slice re-records all six once, re-enables the tests and notes it in `CHANGELOG.md`. The job-intel hash keeps its purpose ("nothing but investigations moved") only against this new baseline.

### Final checks with the real `scripts/tune.ts`

Baseline: commit `ed52b20` on `feature/potions-healing`. The game code, scripts and tests are identical from there to the tip of the branch when this PRD was written (the later commits are documentation, and a prototype followed by its revert). It is not the local `main`, which is far behind. Command used:

```
SEEDS=$(seq 1 80 | paste -sd, -) SCALES=1,1.15,1.25,1.5,1.75 TICKS=600 pnpm dlx vite-node scripts/tune.ts
```

Do not write the seed list with `seq -s, 1 80`: on macOS it leaves a trailing comma, `Number('')` is 0, and the script quietly runs 81 seeds with seed 0 included. After the `tune.ts` change the same run is `SEEDS=1..80`.

Baseline values (seeds 1 to 80, 600 ticks, unrounded):

| Scale | quests | failed | deaths | deaths per quest | wiped | arrived | raised |
|---|---|---|---|---|---|---|---|
| 1 | 139.11 | 19.51 | 60.79 | 0.437 | 4.99 | 23.1 | 9.95 |
| 1.15 | 113.86 | 28.14 | 85.19 | 0.748 | 7.21 | 30.1 | 11.24 |
| 1.25 | 104.80 | 32.99 | 97.38 | 0.929 | 8.01 | 33.8 | 11.74 |
| 1.5 | 83.05 | 41.06 | 123.15 | 1.483 | 11.26 | 40.8 | 11.76 |
| 1.75 | 61.42 | 46.63 | 138.99 | 2.263 | 12.71 | 45.1 | 11.36 |

The first slice must reproduce this table with the changed script on unchanged game code before recording the baseline file. Ticket 09 measured it with an unrounded copy of the script.

1. **Acceptance (ticket 07).** At scales 1.15 and 1.5, seeds 1 to 80, 600 ticks: each of the five metrics (quests, failed, deaths per quest, wiped, raised) within +/-15% of the baseline. Easier than the baseline is not a failure inside the band. About 2% of runs on unchanged code fail this by chance.
2. **Scale shape (ticket 07).** At scales 1, 1.25 and 1.75, with 10 seeds (1 to 10): deaths per quest rises as the scale rises.
3. **Apothecary over a long run.** 3,000 ticks, seeds 1 to 40, scale 1.15: no apothecary treasury below zero at any tick, and no more apothecaries ruined than today. Today is 2 of 40 in ticket 09; the first slice records the figure with the script. The prototype had 0 ruined and a lowest treasury of +152 gp. This is a measurement over 40 seeds, not a guarantee, because upkeep can still take a treasury below zero.

If a check fails, the knobs of ticket 07 may move (`board.difficultyScale`, encounters per job, `potionCoverFraction`, the sharing weights, `retreatHpFraction`, `startingGoldPerLevel`, the apothecary's opening treasury). The Hit Dice rules, the potion formulas, the potion prices and the Long rest do not move. A changed value is the owner's decision, not the implementer's.

The supreme tier is expected to stay unbought at 600 ticks, and in the 3,000-tick runs too. This is intended.

## Out of Scope

- Drinking and administering a potion as a Bonus Action on the hero's turn, and the 5-foot distance for giving one. The engine cannot model either; "between rounds, no action cost" stays. Reopens only as a new effort if the engine changes.
- Brewing potions with the Herbalism Kit, healing from spells, death saving throws, and a full Long rest mechanic beyond the moment the Hit Dice recover.
- Apothecary staffing and production time: a tier needing a cleric on the payroll able to cast the matching healing spell, and the SRD's days of work per potion shared among the shop's workers. Waits until businesses have employees. Until then production is instant and every tier is offered while the shop is not ruined.
- Taking over a ruined service: a retired adventurer buying a ruined apothecary, or any ruined service, with their own wealth. `retirement` keeps founding a new business.
- Switching the reward set-aside on for employers other than the apothecary. The rule is built for it; the other employers are untested and still dip into debt.
- A second Hit Dice pacing strategy, a configurable tier divisor, a credit rule for the apothecary, and rewards paid in potions (explored in ticket 09 and not adopted).
- Any rule to make the supreme tier reachable sooner.

## Further Notes

### Suggested vertical slices for `to-issues`

Each slice ends with the suite green (the six regression hashes skipped from slice 2 until slice 8 re-records them) and with its documentation updated.

| # | Slice | Delivers | Blocked by |
|---|---|---|---|
| 1 | Measuring tool and baseline | `tune.ts` with the seed range, scale 1.15, unrounded output, baseline file and comparison, and the apothecary report. Reproduces the table above on unchanged game code and records today's long-run apothecary figures. No game code changes. | none |
| 2 | Hit Dice at the Short rest | The dice module; `hitDiceSpent`; the hit point formula parser; the rest as its own logged tick with pacing, retreat check and the potion step (still the old potion); one seed per rest; reset at the Long rest; `shortRestHealFraction` removed. Skips the six regression hashes. | 1 |
| 3 | Tiered potions with real dice | The catalogue in configuration; the pack as a map through combat, expedition, merger, view and UI; the drinking selection; potions rolled from the combat sub-seed and the rest seed; the old potion price and heal keys removed; `startingGoldPerLevel` 50. Buying stays as today for this slice: basic only, up to one per living hero, at the catalogue price. Migrates the `potions` fixtures and the combat potion tests. | 2 |
| 4 | Buying policy | The stock target with `potionCoverFraction`, the tier choice, the step-down by budget, one purchase and one log line per visit. | 3 |
| 5 | Potion sharing policy | The policies object on the company, the two orders, the seeded draw with its weights, the merger rule, the fixture migration for policies. | 3 |
| 6 | Apothecary production | The per-tier production cost; the `production` reason; `goldSpentOnProduction` (and in the `tune.ts` report); the production ticks table at zero with the documented deviation. | 3 |
| 7 | Reward set-aside | The rule for any employer, the configuration list with the apothecary alone, reward sizing from the treasury minus the rewards owed. Runs final check 3 (the long-run apothecary report) as its own acceptance. | 6 |
| 8 | Retune confirmation | The three final checks with the real `tune.ts`; the six regression hashes re-recorded once and re-enabled; `CHANGELOG.md`; the test table and seeding section of `docs/ARCHITECTURE.md`; a last read of `docs/CONFIGURATION.md` and `CONTEXT.md` against the code. | 4, 5, 6, 7 |

Slices 4, 5 and 6 are independent of one another. Slice 7 follows 6 so that the long-run apothecary check it runs has production in place.

### Points to confirm while implementing

- The SRD 5.2 wording of the Hit Die minimum of 1 (ticket 06).
- With the set-aside, an employer's treasury can meet `postingThreshold` while the treasury left after the rewards owed is small or zero, and `minimumReward` (20 gp) still applies to the new reward. The tickets only say that new rewards are sized from the treasury minus the rewards owed. If the long-run check shows a treasury below zero from this, ask the owner whether the posting threshold should read the same reduced amount.
- Ticket 09 gives as the reason for `startingGoldPerLevel` 50 that a level 1 company with 20 gp could not buy the 50 gp potion. In the game code the potion budget is the purse minus one resurrection (190 gp at level 1), so a new company buys no potion before its first reward at 50 gp either. The value stays 50 because the sweep measured it as the closest fit; only the stated reason does not hold.
- The scale shape of the final rules was measured in the prototype only with the offer gate of ticket 08 still in place; check 2 covers it.

### How far the prototype's numbers can be trusted

Ticket 09's figures come from a throwaway implementation on the real simulator, without tests and since reverted (commits `4c8d98e`, `60c9945`, `1be03ae`, reverted in `103c02f`). It is evidence for the chosen values, not a reference implementation: build from this PRD and the tickets, not from those commits. The sweep tables are in [assets/09-sweep-results.md](assets/09-sweep-results.md).

## Comments
