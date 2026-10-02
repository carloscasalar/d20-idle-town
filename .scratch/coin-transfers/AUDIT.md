# Gold movements — Turn 05

Added `test/coin-movements.test.ts` only, plus this document. Production code is
unchanged. This audit describes the current implementation and identifies bugs
for a later fix; the new tests do not assert that omitted bookkeeping is correct.

## Audit

Amounts below are gold pieces. `company` means the code's `Party`, `Holding`
means `Asset`, and `ledger` means the supplied ledger or `Game.stats`. The fields
column lists monetary fields and lifetime statistics affected by the movement,
including hero spending attribution and item statistics. Work status, links,
reputation, renown, equipment and service benefits are mentioned where relevant;
changing a price/quoted reward alone does not move gold.

Each concrete payment has a row even when it uses the same payment primitive.
S00 describes that primitive, not an additional payment to count. Similarly,
C04 and G03 allocate one retirement payment; their combined debit is 25000.

| ID | Where (file, function) | Domain movement | From | To | Exact fields and statistics updated | Class |
| --- | --- | --- | --- | --- | --- | --- |
| C01 | `src/adventurers/party.ts`, `createParty`; called by `Game.arrivals` | A new company's starting purse, including a stranded company's arriving recruits | Outside the recorded world | New company | `gold = 20 × level`, `earned = spent = 0`; new heroes' `goldSpent = 0`. `Game.arrivals` increments `partiesArrived` once, before the company's first decision. | Source |
| C02 | `src/town/town.ts`, `makeEmployer` / `generateTown` | A founding employer's starting treasury | Outside the recorded world | New employer | `treasury` initialized to a random integer: noble 1500–3000, merchant 800–1600, faction 600–1200, temple 800–1400; `earned = spent = 0`. No gold lifetime statistic. | Source |
| C03 | `src/town/lairs.ts`, `createLair`; called by `Game.spawnLair` | Starting Lair hoard, both founding threats and later replacements | Outside the recorded world | New Lair | `hoard.gold = 100 × level`, `hoard.items = []`. No earned/spent counters or gold lifetime statistic. Old cleared Lairs remain recorded; their hoards are not deleted on respawn. | Source |
| C04 | `src/town/town.ts`, `retiredEmployer`; `src/sim/game.ts`, `retire` | Opening capital for the retiring adventurer's business | Retiring company's purse, 5000 of its 25000 payment | New employer | The company debit is combined with G03: `gold −= 25000`, `spent += 25000`, `goldSpentByHeroes += 25000`. New employer `treasury = 5000`, `earned = spent = 0`; this is its opening capital, not subsequent earnings. `retirements += 1` once for the combined operation; no hero `goldSpent` increment. | Transfer (5000) |
| C05 | `src/town/assets.ts`, `createAsset` | A new Holding starts with an empty loot store | Outside the recorded world | Holding loot | `loot = { gold: 0, items: [] }`; no counters/statistics. Included for initialization completeness; adds zero gold. | Source (0) |
| S00 | `src/town/services.ts`, `payForService`; `Game.pay` delegates to it | Shared service payment primitive | Company purse | Employer treasury | For amount A: company `gold −= A`, `spent += A`; employer `treasury += A`, `earned += A`; ledger `goldSpentByHeroes += A`. Company `earned` and employer `spent` unchanged. Hero attribution, if any, is added by the caller. | Transfer |
| S01 | `src/town/services.ts`, `visitTownServices` potion purchase | Buy healing potions | Company | Apothecary | S00 for quantity × `(25 + 10 × company level)`; `potions += quantity`. No individual hero `goldSpent` update and no item statistic. | Transfer |
| S02 | `src/town/services.ts`, nested `buyItem` | Buy a usable magic item from any unruined employer with stock | Company | Selling employer | S00 for `item.price`; recipient hero `goldSpent += price`. Item leaves seller's `stock`, is equipped; replaced gear enters company `stash`. Neither `itemsFound` nor `itemsSold` changes. | Transfer |
| S03 | `src/town/services.ts`, nested `payDues` | Join or renew Adventurers' Guild membership | Company | Guild | S00 for `15 × company level × living member count`; `duesPaidDay = day`, `guildMember = true`. No individual hero spending or other lifetime statistic. | Transfer |
| S04 | `src/town/services.ts`, nested `buyBlessing` | Donation for a temple blessing | Company | Temple | S00 for `40 × company level`; `blessed = true`. No individual hero spending or other lifetime statistic. | Transfer |
| S05 | `src/town/services.ts`, `visitTownServices` armour fitting loop | Fit one or more adventurers with better armour | Company | Smith | S00 for each fitted hero's rounded `(80 + 40 × hero level) × 2.2^old armour tier`; each hero `goldSpent += cost`, `armorTier += 1`. No item statistic. Each debit/credit is recorded even when several fittings share a visit. | Transfer |
| S06 | `src/town/services.ts`, nested `sellLoot` | Sell unwanted loot to the enchanter | Enchanter treasury | Company purse | A = smaller of resale price and treasury. Enchanter `treasury −= A`, `spent += A`; company `gold += A`, `earned += A`; `itemsSold += 1`. Item moves from company stash to shop stock. `goldSpentByHeroes` unchanged. A ruined, full or penniless enchanter pays nothing. | Transfer |
| G04 | `src/sim/game.ts`, `investigate` divination branch | Buy complete Contract intelligence | Company | Temple | S00 for `60 × company level`; Board reveals all intelligence. No hero spending or other lifetime statistic. | Transfer |
| G05 | `src/sim/game.ts`, `investigate` tavern branch | Buy a round to investigate a Contract | Company | Tavern | S00 for `15 × company level`; increments this work's paid `investigations`, reveals one piece of intelligence. No hero spending or other lifetime statistic. Persuasion and reading tracks cost no gold. | Transfer |
| G06 | `src/sim/game.ts`, `recruit` | Resurrect an affordable fallen adventurer | Company | Temple | S00 for `150 + 40 × dead hero level²`; fallen hero `goldSpent += cost`, `resurrections += 1` per hero. Payment precedes recruitment/merging; raising multiple heroes records every payment. | Transfer |
| E01 | `src/sim/expedition.ts`, `arriveHome` rooms branch | Rooms after returning from work | Company | Tavern | S00 for `3 × company level × living member count`. No hero `goldSpent` or other lifetime statistic. No payment when the tavern is ruined or the purse cannot cover the fee. | Transfer |
| E02 | `src/sim/expedition.ts`, `arriveHome` carousing branch | Celebrate successful work | Company | Tavern | S00 for larger of 10 and floor(5% of purse **after rooms**), provided the resurrection reserve remains; company `renown += 1`, capped. No hero spending or other lifetime statistic. Dead members, failure and maximum renown block celebration. | Transfer |
| B01 | `src/sim/board.ts`, `payContract` reward | Pay a completed Contract | Employer treasury | Company purse | Employer `treasury −= reward` (combined with B02), `spent += reward`, `questsCompleted += 1`, `reputation += configured gain`; company `gold += reward`, `earned += reward`, `questsDone += 1`, renown rises by configured amount/cap. Ledger `goldPaid += reward`, `questsCompleted += 1`; an in-kind reward also increments `itemsFound`. No hero spending. Works without a Holding receive this payment but no windfall. | Transfer |
| B02 | `src/sim/board.ts`, `payContract` windfall | Recover income when a Holding is freed | Outside the recorded world | Employer treasury | A = Holding income/day × configured `windfallDays` (default 4). Employer `treasury += A` (combined with B01), `earned += A`; Holding becomes safe. No company balance/counter or gold lifetime statistic changes for this source. Without a Holding A = 0. | Source |
| B03 | `src/sim/board.ts`, `payContract` Holding loot branch | Recover predecessors' gold and gear at a Holding | Holding loot | Company purse | Company `gold += loot.gold`, `earned += loot.gold`; items enter stash, `itemsFound += loot.items.length`; Holding `loot = { gold: 0, items: [] }`. Reward statistics `goldPaid` do not include recovered gold. No employer monetary update. | Transfer |
| B04 | `src/sim/board.ts`, `payBounty` | Guild Bounty payment | Guild treasury | Company purse | Guild `treasury −= reward`, `spent += reward`, `questsCompleted += 1`, `reputation += configured gain`; company `gold += reward`, `earned += reward`, `questsDone += 1`; ledger `goldPaid += reward`, `questsCompleted += 1`; in-kind reward increments `itemsFound`. Lair breaking then gives configured renown, increments `lairsCleared` and triggers G07. | Transfer |
| B05 | `src/sim/board.ts`, `expireContract` and `unansweredRaid` | Loot the employer when an unanswered Contract has an active originating Lair | Employer treasury | Active Lair hoard | A = max(0, min(treasury, Holding income/day × configured `lootingDays`, default 2)). Employer `treasury −= A`, `spent += A`; Lair `hoard.gold += A`, `raidsWon += 1`, strength rises/caps. Board `questsExpired += 1`; `questsFailed`, `goldPaid`, `goldSpentByHeroes` do not rise. First overrun increments Holding `timesRavaged`. | Transfer |
| B06 | `src/sim/board.ts`, `expireContract` without an active origin | Looting loss where no recorded active Lair receives it | Employer treasury | Outside the recorded world | Same A and employer debit/counter as B05; no hoard credit. Includes no origin, missing origin and a cleared origin (`unansweredRaid` returns early). Same expiry statistics. Empty or negative treasury loses zero. | Sink |
| G07 | `src/sim/game.ts`, `payHoard` | Take a broken Lair's hoard | Lair hoard | Company purse | Company `gold += hoard.gold`, `earned += hoard.gold`; hoard items enter stash; `itemsFound += item count`; Lair `hoard = { gold: 0, items: [] }`. No `goldPaid` or `goldSpentByHeroes` increment for hoard gold. | Transfer |
| G08 | `src/sim/game.ts`, `leaveLoot` with a Lair | The wiped company's purse is left with its fallen equipment | Wiped company | Lair hoard | `hoard.gold += company.gold`, company `gold = 0`; **company `spent` is not updated (F01)**. Fallen equipment and wiped stash enter hoard; their originals are emptied. This movement changes no gold/item lifetime statistic; Expedition has already counted deaths and the wipe. If survivors remain, only equipment is left: purse and all gold counters stay unchanged. | Transfer |
| G09 | `src/sim/game.ts`, `leaveLoot` with a Holding and no Lair | The wiped company's purse lies among the fallen at a Holding | Wiped company | Holding loot | `loot.gold += company.gold`, company `gold = 0`; **missing company `spent` (F01)**. Equipment/stash and statistics behave as in G08. If neither destination exists, the function returns and the disbanded company's purse remains recorded; no gold leaves the world. | Transfer |
| P01 | `src/adventurers/party.ts`, `mergeParties`; called by `Game.absorb` | Survivors bring their company's whole purse to the host company | Donor company | Host company | Host `gold += donor.gold`, donor `gold = 0`; **neither host `earned` nor donor `spent` is updated (F02)**. No gold lifetime statistic or individual hero spending changes. Also moves potions/stash; whole purse moves even if some survivors do not fit. | Transfer |
| G01 | `src/sim/game.ts`, `closeTheBooks` income | Daily Holding income | Outside the recorded world | Unruined employer treasury | Employer `treasury += income` (combined with G02), `earned += income`. Safe Holding contributes full income/day; threatened contributes floor(half); ravaged contributes zero. No gold lifetime statistic. Ruined employers are skipped. | Source |
| G02 | `src/sim/game.ts`, `closeTheBooks` upkeep | Pay daily upkeep | Unruined employer treasury | Outside the recorded world | Employer `treasury −= upkeep` (combined with G01), `spent += upkeep`. No recipient or gold lifetime statistic. Debit can put treasury below zero; the same signed amount is recorded in its counters. Ruin does not reset/delete treasury. | Sink |
| G03 | `src/sim/game.ts`, `retire` | Buy the retiring adventurer's business, after retaining its opening capital | Company purse | Outside the recorded world | 20000 leaves the recorded world; another 5000 is C04. The code records **one** total debit: company `gold −= 25000`, `spent += 25000`, `goldSpentByHeroes += 25000`, `retirements += 1`; no hero `goldSpent` update. Equipment is returned to stash; the veteran becomes an employer with C04's starting treasury. | Sink (20000) |

This covers every balance mutation found by searching `src/` for `gold`,
`treasury`, `hoard`, `loot`, `earned` and `spent`. `Hero.goldSpent` is a spending
attribution counter, not another purse to include in world gold. Resale prices,
item prices, reward quotation/generation, UI formatting, and failed payments do
not themselves move gold. Initial counter values and empty Holding loot do not
add gold beyond the initialization rows.

## Rules and measured failures

`totalGold` sums **all** purses, treasuries, Lair hoards and Holding loot.
Disbanded companies, ruined employers and cleared Lairs stay included. Treasury
is signed; clamping debt to zero would contradict G02 and hide differences.
`assertConservation` requires opening total + sources − sinks = closing total.
`assertHolderCounters` independently requires opening balance + earned − spent
for every company and employer, without a skip list or tolerance.

`Game.view()` omits exact Holding loot, disbanded companies, and some work/hero
state. The public `regressionState()` supplies those facts. Combining its copied
state with `onEvent` exposes arrivals before a first purchase or merge and
settlements/expiries before history pruning. This is sufficient to account for
all audited sources and sinks here; no conservation check was waived. Daily
income/upkeep are computed from opening Holdings and employers; windfalls from
completed Contract terms; opening capital from arrival levels; looting sinks
from the payer before expiry and the origin's status. These are not inferred by
subtracting closing totals or by trusting the gold counters under test.

Retirement is accounted as 5000 retained/transferred capital and a 20000 sink.
It is **not** a 25000 transfer to a 5000 treasury. The new employer's 5000 is its
starting treasury, so its zero earned/spent counters satisfy the employer rule.
No retirement discrepancy is excluded.

**Conservation failures: none found.** The focused transfers, sources and sinks
and all 1200 seeded hourly transitions conserve the recorded balances under the
classifications above.

**Holder-counter failures:**

| Entry | Audit row | Rule broken | Exact discrepancy | Handling |
| --- | --- | --- | --- | --- |
| F01 | G08, G09 | Company purse = opening purse + earned − spent | For a wiped purse of A, actual purse is **A below** the equation. `spent` is missing A; the destination receives A correctly. Focused examples: 37 gp to a Holding and 37 gp to a Lair. | Exclude only that wiped purse movement from the counter input; retain full conservation and exact two-holder gold assertions. |
| F02 | P01 | Company purse = opening purse + earned − spent, on both sides | For donor purse A, host purse is **A above** its equation (missing earned A), donor purse **A below** its equation (missing spent A). Focused example: 5 gp, host 10 → 15, donor 5 → 0. | Exclude only the donor purse transfer from each company's counter input; conserve both purses and keep checking later movements in both companies. |

No employer-counter failures were found. The bug is the missing ledger updates,
not the gold transfers themselves. The focused tests never assert that the
missing `earned`/`spent` values or missing spending statistics are correct. Their
repair remains for a bug-fix turn.

The raw, unexcluded counter helper was run first against the three seeds. First
failures were seed 7 at hour 37 (`party-2`, 31 actual vs 11 expected), seed 42 at
hour 27 (`party-1`, 28 vs 17), seed 20260907 at hour 25 (`party-1`, 28 vs 14).
Then event-level diagnostics measured every occurrence, not just first failures.
Each amount below is the **additional error introduced by that movement**, not
a previously accumulated company discrepancy.

| Seed | F01 wiped purses: hour, company, missing spent |
| --- | --- |
| 7 | 37: party-4, 20; 69: party-2, 45; 99: party-7, 320; 211: party-14, 324; 244: party-16, 20; 259: party-3, 736; 265: party-17, 20 |
| 42 | 134: party-10, 20; 172: party-6, 579 |
| 20260907 | 43: party-5, 20; 147: party-13, 20; 166: party-9, 89; 173: party-12, 34; 307: party-11, 515 |

For every F02 entry below, the host is above its equation by the listed amount
and the donor is below by that same amount.

| Seed | F02 merges: hour, donor → host, amount |
| --- | --- |
| 7 | 37: party-5 → party-2, 20; 65: party-8 → party-2, 20; 146: party-10 → party-9, 319; 213: party-15 → party-13, 40 |
| 42 | 27: party-2 → party-1, 11; 47: party-4 → party-3, 14; 89: party-9 → party-5, 20; 103: party-7 → party-3, 401; 136: party-12 → party-1, 60; 170: party-14 → party-11, 17; 185: party-3 → party-1, 574; 187: party-5 → party-15, 572; 195: party-16 → party-11, 20; 205: party-8 → party-15, 551; 214: party-17 → party-13, 40; 253: party-19 → party-18, 176 |
| 20260907 | 25: party-2 → party-1, 14; 41: party-1 → party-3, 25; 50: party-4 → party-3, 17; 99: party-7 → party-8, 135; 169: party-15 → party-12, 20; 264: party-16 → party-11, 442; 266: party-8 → party-14, 5; 276: party-18 → party-17, 20; 328: party-20 → party-10, 84; 400: party-3 → party-10, 1149 |

The seeded check tracks initial purses/treasuries once. It recognizes F01 by a
wipe with a recorded loot destination and F02 by adventurer IDs moving between
companies. At those public event boundaries it removes only that movement's
purse change minus any counter change already recorded. Comments name F01/F02.
The strict helper then receives a copy with those movements removed from its
counter input. A future implementation that correctly records them needs zero
correction; the test does not demand the bug persist. No company or tick is
skipped. Conservation always sees the actual, unadjusted balances, including
the bug movements. Controlled focused fixtures establish their opening ledger
at setup; it is never rebased after a movement.

## Existing coverage and added tests

The four requested files were read before adding tests. Existing exact amounts
on both sides are reused instead of adding duplicate sale, reward or loot tests:

| Audit rows already covered | Existing file and test(s) |
| --- | --- |
| S06 sale | `test/town-services.test.ts`: “sells unwanted loot for the available treasury and records both ledgers” — company 17, enchanter 0, both counters, `itemsSold = 1`. |
| B01 reward | `test/contract-lifecycle.test.ts`: “a Contract without a Holding pays the company without granting a windfall” — company 60/earned 50, employer 950/spent 50; “returning companies receive the exact reward and both ledgers record the payment” adds exact `goldPaid` and completion statistics. |
| B02 windfall | `test/contract-lifecycle.test.ts`: “recovering a Holding returns forty gold in windfall to its employer” — treasury 990, earned 40; reward tests account for the combined −50 debit. `test/board.test.ts`: “uses configured windfall days when a Contract restores income” asserts a configured 70 gp source. |
| B03 Holding loot | `test/contract-lifecycle.test.ts`: “a company collects gold-only loot left at a Holding” and “a company recovers and empties the gold and items left by its predecessors” — 37 gp store empties, company 97/earned 87, exact item statistics and reward accounting. |
| B04 Bounty | `test/contract-lifecycle.test.ts`: “the guild pays the exact Bounty and records payment, completion and reputation” — company 60/earned 50, guild 950/spent 50, exact lifetime statistics. |
| G07 hoard | `test/contract-lifecycle.test.ts`: “the company takes all hoard gold and items and leaves the hoard empty” — 137 gp hoard empties, company 197/earned 187, two items counted, `goldPaid` remains the 50 gp Bounty. |
| B06 looting sink | `test/contract-lifecycle.test.ts`: “unanswered work costs an employer with $treasury gold exactly $loss gold” — 7 → 0 or 100 → 80, exact spent/expiry counters; “an expired Contract cannot strengthen or enrich a cleared Lair” — employer 980/spent 20, cleared hoard 0. |

Other existing tests provide useful partial coverage but lack the new tests'
complete literal balances/counters:

- Potions, item purchases and armour tests in `town-services.test.ts` derive
  expectations from price functions or omit a company/employer counter. Dues and
  blessing tests do not assert the recipient's earned ledger.
- Rooms in `expedition.test.ts` use computed fees/balances. Carousing lacks the
  tavern's earned assertion; the new cases assert 12, 22 and 62 gp total bills,
  purses 188, 190 and 950, and both ledgers.
- Retirement in `town-services.test.ts` checks the employer count but not the
  new 5000 gp treasury or the 20000 gp world sink.
- Expiry tests in `contract-lifecycle.test.ts` separately check the payer loss
  and the active Lair's gain; the new active-origin test checks both together.
  `board.test.ts` covers configured three-day looting, not both holder balances.
- `expedition.test.ts` covers leave-loot callbacks, not actual Game purse/store
  amounts. The new Game cases assert 37 gp wipe transfers and actual fallen
  equipment destinations while survivors retain 37 gp.
- `party.test.ts` checks a host's merged purse, not donor purse or its ledger
  rule. New coverage checks both purses without pinning F02's missing counters.

New focused tests cover S00–S05; G04–G06; E01–E02; C04/G03 retirement;
G01–G02 income/upkeep, including signed debt; B05 active-origin looting;
G08–G09 wipes and surviving-company equipment loss; P01 merge conservation;
C01–C03/C05 opening balances. All use `Game`, `visitTownServices` or
`advanceExpedition`; fixtures use public constructors. There is no spying,
private runtime access, RNG call counting, or production-location assertion.
Both bookkeeping helpers are reused in the focused tests and after every tick
of the 400-hour runs for seeds 7, 42 and 20260907.

## Mutation sensitivity

One hypothetical mutation for **each new describe block** follows. Production
mutations were not applied: this turn forbids changing `src/`.

| Describe block | Mutation that makes it fail |
| --- | --- |
| service purchase ledgers | Omit the recipient employer's `earned` increment on a service payment: exact earned and the holder equation both fail. |
| paid investigation | Charge 61 gp for level-one divination instead of 60: purse 940 and temple treasury 1060 assertions fail. |
| resurrection payment | Omit the raised hero's 190 gp `goldSpent` attribution: the exact hero ledger fails. |
| homecoming payments | Omit the tavern's carousing `earned` credit: its exact earned ledger and holder equation fail. |
| retirement capital | Seed the new business with 4999 gp: the 5000 treasury assertion and conservation fail by 1 gp. |
| daily income and upkeep | Round threatened income up instead of down for an 11 gp/day Holding: expected earned 16/treasury 1016 fail by 1 gp. |
| expiry looting | Debit the employer 20 gp without crediting the active Lair: expected hoard 120 and conservation fail. |
| company purse transfers | Empty a donor's 5 gp purse without crediting its host: expected host 15 and conservation fail by 5 gp. |
| bookkeeping across 400 hours | Pay a Contract company one extra gp without changing its employer payment: the tick's conservation fails; no F01/F02 exclusion applies to the reward. |
| opening gold sources | Give a new company 21 gp rather than 20: the literal opening purse, independently accounted arrival source and holder equation fail. |
| fallen equipment and the surviving purse | Move the shared purse along with one fallen adventurer's gear despite survivors: expected purse 37 and destination gold 11/100 fail. |

## Verification and remaining work

Final checks: `pnpm typecheck` passed; `pnpm test` passed (16 test files,
350 tests, including 26 new tests). The three 400-hour runs check both rules
after each of their 1200 ticks. Only the new test file and this document were
added; `git diff --exit-code -- src` passed. The pre-existing untracked
`.claude/` directory was left untouched.

The regression snapshot's opening SHA-256 was
`76b408738e20921bb37d66952cabe61799593c2be08aabf314f3775ffae3a468`.
The final hash is identical; `git diff --exit-code --
test/__snapshots__/simulation-regression.test.ts.snap` passed. The snapshot is
byte-for-byte unchanged. F01/F02 are reported for a separate
bug-fix turn; they were neither fixed under `src/` nor pinned as correct.
The supplied instructions reference `RTK.md`; that file was absent from this
repository and its parent paths, so no additional instructions could be read
from it. No other requested work is intentionally omitted.
