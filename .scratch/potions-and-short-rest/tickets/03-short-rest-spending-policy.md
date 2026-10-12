# Short rest spending policy

Type: grilling (wayfinder:grilling)
State: closed
Claimed-by: carloscasalar (session 2026-10-11)
Blocked-by: 02-hit-dice-pool-model

## Question

At a short rest, how many Hit Dice does each hero spend (all, until not Bloodied, until full, until the next die would overheal)? Does "a hero still Bloodied after the rest drinks a potion" survive, and in what order? What happens to a hero with an empty pool?

## Resolution

- **When it happens.** After winning an encounter that is not the last, the Short rest is taken only if some living hero is below maximum hit points. It costs one tick (one hour) and appears in the expedition log. If nobody is hurt there is no rest, no tick and no log line; the retreat check still runs in the combat tick (only the alive-count condition can fire).
- **Order inside the rest tick.** (1) Each living hero spends Hit Dice. (2) The company decides whether to turn back, with the hit points the dice left. (3) If it goes on, each living hero still Bloodied drinks one potion if the company has one, whether or not they have dice left. A company that turns back keeps its potions.
- **Spending policy.** A strategy behind a swappable interface (inputs: hero, dice remaining, encounters ahead; output: dice quota). Default quota is `ceil(D / E)`, with `D` dice remaining and `E` encounters ahead, so one die when `E > D`. The hero rolls one die at a time and stops at the quota or at maximum hit points, whichever comes first. A level 1 hero (one die) spends it at the first rest and depends on potions afterwards. Another strategy (for example "spend while the next die would not overheal on average") is a new implementation, with no change to callers.
- **Encounters ahead.** Exact when the job's encounter count is known. Otherwise the most the job could hold, derived from configuration: contracts the largest `encounterCounts` entry; bounties `encounters[1] + 1` (the boss); never below the encounters already revealed. The boss counts as an encounter. No new configuration value.
- **Empty pool.** A hero with no dice recovers nothing at the rest; only the potion step can help. No error, no special log line.
- **Configuration.** `shortRestHealFraction` is removed, with its validation and documentation. There is no configuration value to choose the strategy until a second one exists.
- **Passed on.** Real rolls or averages and the effect on seeded runs: ticket "Healing rolls and seeded-run stability". The extra hour per rest (it shifts contract expiry, lair growth and holding income) and the new meaning of `retreatHpFraction` (evaluated after the dice, not at the end of the fight): ticket "Balance targets for the retune".
- **Glossary.** Short rest and its relationship line rewritten in `CONTEXT.md`.
