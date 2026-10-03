# Configuration

One plain object, `GameConfig`, built in `src/sim/config.ts` from each module's
frozen default. A later YAML file can use this shape directly: every value is
a number, a boolean, a string, or a list of those. Nothing is a function, a
class instance, or `undefined`.

`seed` sits at the top. Every other value is a section named
after the module that owns it. A field is not renamed on the way in, and a
duration stays in the unit that module already uses. One tick is one hour.
A day is `TICKS_PER_DAY` (24) in `src/sim/game-rules.ts`, a calendar constant
of the simulation, not a field of this configuration. A value written in ticks
is a count of hours and does not follow that constant.

A range is an inclusive `[min, max]` pair. Overriding a section merges its
fields. Overriding an array or a range replaces that value whole.

Three values have one home. The other module receives them, so overriding the
home changes the game everywhere that value applies.

| Value | Home | Received by |
| --- | --- | --- |
| Company size | `roster.companySize` | Board encounter budgets, Expedition scaling, lair bosses |
| Renown cap | `roster.renownCap` | Board renown gains, Expedition carousing |
| Lair strength cap | `lairs.strengthCap` | Board strength gains, raid interval |

`validateGameConfig` checks a complete document. It reports a missing section,
a missing field, an unknown field, a section that is not an object, a wrong
type, a count that is not a whole number, an empty weight list, a weight list
whose weights are all zero, a negative price, or a range whose minimum exceeds
its maximum. It also checks every name against the catalogue that defines it:
`town.retiredHoldings` and `quests.relicHoldings` against holding kinds,
`quests.guildOnlyKinds` against employer kinds, `services.steps` against the
town-service registry (including `retirement`), and `intel.steps` against the
job-intel registry. A step that is registered but left out of the default list
is still a valid name. An unknown name is a readable error, for example
`services.steps: unknown step "shoe-shine"`. A key under `kinds` that is not a
registered kind is `kinds: unknown kind "survey"`. Coin reasons are not configuration:
a reason's effects are the accounting identity of that movement, kept in code.
`new Game(partial)` and
`Game.forTesting` merge the partial onto these defaults first, then use that
check. A function in the simulation takes the section it uses as a required
argument, so an override of that section reaches every use.

## Top level

| Field | Default | Meaning |
| --- | --- | --- |
| `seed` | 20260907 | World seed. Any finite number. |

## `kinds`

Tunables that belong to one kind of work, keyed by that kind's id. Defined in
`src/sim/kind-config.ts`. A key that is not `contract` or `assault` is rejected.

### `kinds.contract`

| Field | Default | Meaning |
| --- | --- | --- |
| `renown` | 1 | Renown gained when a Contract succeeds |
| `openTicks` | 72 | Hours unanswered work of a kind that expires may stay open |

### `kinds.assault`

| Field | Default | Meaning |
| --- | --- | --- |
| `renown` | 3 | Renown gained for breaking a lair |
| `revealsCount` | true | When the profile says `configured`, posting reveals the encounter count |
| `appetite` | 0.35 | Chance an idle company that can pay a resurrection takes this work |
| `levelGap` | 1 | A bounty is posted once some company is within this many levels of the lair |
| `encounters` | [3, 5] | Fights before the boss, inclusive, plus the boss |
| `difficultyWeights` | easy 2, intermediate 4, hard 2 | Weight of each difficulty on a bounty |
| `rewardPerLevel` | 150 | Guild gold per lair level, limited by the guild's treasury |

## `board`

The Board. Defined in `src/sim/board.ts`.

| Field | Default | Meaning |
| --- | --- | --- |
| `windfallDays` | 4 | Days of holding income recovered when a Contract succeeds |
| `lootingDays` | 2 | Days of holding income lost when an unanswered Contract expires |
| `failureRenownLoss` | 1 | Renown lost when work fails |
| `reputationGain` | 1 | Employer reputation gained on success |
| `expiryCooldown` | [4, 10] | Hours an employer waits after a Contract expires |
| `failureCooldown` | [2, 8] | Hours an employer waits after a Contract fails |
| `pruningThreshold` | 200 | Finished jobs kept before older ones are dropped |
| `travelTicks` | 2 | Hours of outbound travel, handed to the expedition |
| `difficultyScale` | 1.15 | Multiplier on every encounter's XP budget. The browser's `?difficulty=` sets this. |
| `lairStrengthGain` | 1 | Strength a lair gains after an unanswered raid or a failed bounty |

## `roster`

The company roster. Defined in `src/adventurers/company-roster.ts`.

| Field | Default | Meaning |
| --- | --- | --- |
| `maxCompanies` | 8 | Active companies. Disbanded history takes no place. |
| `arrivalInterval` | 10 | Hours between scheduled arrivals, before the spread below |
| `arrivalIntervalMinDivisor` | 2 | Shortest wait is the interval divided by this, rounded up |
| `arrivalIntervalMaxFactor` | 2 | Longest wait is the interval multiplied by this |
| `patienceTicks` | 12 | Idle hours before strangers arrive for a stranded company |
| `disbandTicks` | 72 | Hours before survivors look for a ready host |
| `companySize` | 4 | Arrival size, readiness, and the size encounters and bosses are built for |
| `maxCompanySize` | 6 | Most living members a company may have after a merge |
| `renownCap` | 10 | Highest renown a company can hold |
| `retirementLevel` | 8 | Lowest level at which a veteran may retire |
| `retirementPrice` | 25000 | Gold paid to open a business, after keeping a resurrection reserve |
| `retirementCapitalShare` | 0.2 | Share of that price, rounded down, that opens the treasury. The rest leaves the world. |
| `firstArrivalTick` | 1 | Hour of the first scheduled arrival |
| `arrivalQuestLevelChance` | 0.3 | Chance an arrival matches the level of open work |
| `strangerExtraMembers` | 1 | Extra members a stranger band may bring beyond the empty seats |
| `recruitLevelTolerance` | 1 | Levels a survivor may differ from a host and still join |

## `intel`

Job intelligence. Defined in `src/quests/job-intel.ts`. Expedition reads the
road at `skillDc`.

| Field | Default | Meaning |
| --- | --- | --- |
| `skillDc` | 15 | Difficulty of the free tavern attempt and of reading the road |
| `divinationCostPerLevel` | 60 | Gold per company level for a divination |
| `roundCostPerLevel` | 15 | Gold per company level for a paid round |
| `divinationReserveFactor` | 2 | Resurrection prices that must remain after a divination |
| `roundReserveFactor` | 1 | Resurrection prices that must remain after a paid round |
| `maxRounds` | 2 | Paid rounds one company may buy about one job |
| `revealedAtPosting` | 1 | Encounters already known when a job is posted |
| `steps` | freeAttempt, divination, paidRound | Idle-hour order, by step name. Any name in the job-intel registry |

## `expedition`

Recovery, rooms, and the decision to turn back. Defined in
`src/sim/expedition.ts`. Travel time is received from the Board.

| Field | Default | Meaning |
| --- | --- | --- |
| `restTicks` | 8 | Hours of rest after a homecoming |
| `shortRestHealFraction` | 0.5 | Share of maximum hit points restored at a short rest, rounded up |
| `carousingShare` | 0.05 | Share of the purse spent carousing |
| `carousingMinimum` | 10 | Least gold spent carousing when the company tells the tale |
| `carousingRenown` | 1 | Renown gained by carousing, up to the roster's cap |
| `roomFeePerLevel` | 3 | Gold per company level for rooms |
| `retreatAliveDivisor` | 2 | Turn back when this fraction of the original company, or fewer, is standing. 2 means half or fewer. |
| `retreatHpFraction` | 0.35 | Also turn back when the company is this badly hurt |

## `services`

An idle hour in town. Defined in `src/town/services.ts`.

| Field | Default | Meaning |
| --- | --- | --- |
| `guildDuesPerLevel` | 15 | Gold per company level for a period of guild membership |
| `duesPeriodDays` | 7 | Days that payment covers |
| `blessingCostPerLevel` | 40 | Gold per company level for a blessing |
| `blessingHpPerLevel` | 3 | Bonus hit points per level while blessed. Expedition receives this. |
| `blessingReserveFactor` | 1.5 | Resurrection prices that must remain after a blessing |
| `steps` | potions, loot, items, dues, blessing, retirement, armour | Idle-hour order, by step name. Any name in the town-service registry, including `retirement` |

## `lairs`

A lair's strength, hoard, and raids. Defined in `src/town/lairs.ts`.

| Field | Default | Meaning |
| --- | --- | --- |
| `strengthCap` | 10 | Highest strength. The Board and the raid interval both use this. |
| `initialStrength` | 1 | Strength of a newly spawned lair |
| `hoardGoldPerLevel` | 100 | Gold in a new hoard for each level of the lair |
| `raidCooldown` | [24, 72] | Hours before a new lair can raid |
| `minRaidInterval` | 36 | Shortest time between raids, in hours |
| `baseRaidInterval` | 96 | Raid interval before strength shortens it |
| `raidIntervalPerStrength` | 6 | Hours removed from the interval for each point of strength, up to the cap |

## `quests`

How a Contract or Bounty is sized and paid. Defined in `src/quests/quest.ts`.

| Field | Default | Meaning |
| --- | --- | --- |
| `encounterCounts` | 2×3, 3×4, 4×3, 5×2, 6×1 | Encounter count and its weight. Short jobs are common. |
| `difficultyWeights` | easy 4, intermediate 4, hard 2 | Weight of each difficulty on a Contract |
| `difficultyPay.easy` | 1 | Pay multiplier for an easy fight |
| `difficultyPay.intermediate` | 1.5 | Pay multiplier for an intermediate fight |
| `difficultyPay.hard` | 2.5 | Pay multiplier for a hard fight |
| `ravagedPayFactor` | 1.5 | Extra pay when the holding is ravaged |
| `incomeDays` | 2 | Days of holding income in the base reward |
| `levelPayFactor` | 10 | Added as level × level × this |
| `rewardScale` | 0.6 | Scale applied after generosity and desperation |
| `minimumReward` | 20 | Lowest reward, in gold |
| `treasuryShare` | 0.8 | Most of the employer's treasury a reward may take |
| `relicHoldings` | archive, catacombs, shrine, cemetery | Holdings that can pay with a relic |
| `relicItemChance` | 0.12 | Chance of an item reward from those holdings |
| `ordinaryItemChance` | 0.04 | Chance of an item reward from any other holding |
| `nobleItemChance` | 0.04 | Added when the employer is a noble |
| `guildOnlyKinds` | noble, faction | Employers who post higher-level work through the guild |
| `guildOnlyLevel` | 2 | Level at which that restriction starts |
| `bossLootLevelBonus` | 2 | Levels added when rolling the boss's item |
| `bossGuardCount` | 1 | Guards beside the boss |

## `encounters`

How a fight is filled. Defined in `src/quests/encounters.ts`. Intermediate and
hard bands still use the engine's DMG thresholds.

| Field | Default | Meaning |
| --- | --- | --- |
| `maxMonsters` | 6 | Most creatures in one fight |
| `compositionAttempts` | 30 | Tries before the fallback creature |
| `minimumFallbackXp` | 10 | Creatures at or below this XP are skipped when the theme has nothing in band |
| `patterns` | solo 2, horde 3, leader 3, mixed 2 | Weight of each composition |
| `soloMinFactor` | 0.7 | A solo creature must be at least this share of the band |
| `hordeTargetDivisor` | 3 | The horde aims at the band divided by this |
| `hordeMinimum` | 3 | Fewest creatures in a horde |
| `leaderMinFactor` | 0.35 | A leader is at least this share of the band |
| `leaderMaxFactor` | 0.7 | A leader is at most this share of the band |
| `mixedKinds` | [2, 3] | How many kinds a mixed fight uses |
| `mixedShareDivisor` | 3 | Each mixed group aims at the band divided by this |
| `mixedGroupCap` | 3 | Most of one kind in a mixed fight |
| `scaleRoundingBias` | 0.25 | Added before rounding when a larger company scales a fight |
| `easyBand` | [0.5, 0.85] | An easy fight's share of the intermediate budget |

## `heroes`

Prices and healing for a hero. Defined in `src/adventurers/hero.ts`.
Armour cost is `(armorBase + armorPerLevel × level) × armorTierFactor ^ tier`.
Resurrection is `resurrectionBase + level² × resurrectionQuadratic`.
A potion costs `potionBase + potionPerLevel × level` and heals at least
`potionHealMinimum`, otherwise maximum hit points divided by `potionHealDivisor`,
rounded up. Resurrection restores `resurrectedHpFraction` of maximum hit points,
and at least `resurrectedHpMinimum`.

| Field | Default | Meaning |
| --- | --- | --- |
| `maxArmorTier` | 3 | Highest armour a smith will fit |
| `armorBase` | 80 | Gold in the armour price before level and tier |
| `armorPerLevel` | 40 | Gold added per level before the tier factor |
| `armorTierFactor` | 2.2 | Multiplier raised to the current tier |
| `resurrectionBase` | 150 | Gold in a resurrection before the level term |
| `resurrectionQuadratic` | 40 | Multiplier on level squared |
| `potionBase` | 25 | Gold in a potion before level |
| `potionPerLevel` | 10 | Gold added per level |
| `potionHealMinimum` | 8 | Least a potion restores |
| `potionHealDivisor` | 3 | Otherwise heal maximum hit points divided by this, rounded up |
| `startingGoldPerLevel` | 20 | Gold a new company carries per level |
| `resurrectedHpFraction` | 0.5 | Share of maximum hit points restored |
| `resurrectedHpMinimum` | 1 | Least hit points a resurrected hero is left with |
| `skillAdvantageTiebreak` | 3 | Extra points a class with advantage counts for when choosing who attempts the check |

## `town`

Who lives in town and what the shops hold. Defined in `src/town/town.ts`.
Generosity is `min + span × a roll from 0 to 1`.

| Field | Default | Meaning |
| --- | --- | --- |
| `maxStock` | 2 | Items a shop keeps on the shelf |
| `restockTicks.enchanter` | 96 | Hours between new enchanter stock |
| `restockTicks.temple` | 168 | Hours between new temple stock |
| `restockTicks.smith` | 216 | Hours between new smith stock |
| `restockInitialDivisor` | 2 | A new shop's first restock waits the period divided by this |
| `nobleCount` | [2, 3] | Noble houses |
| `extraMerchants` | [1, 2] | Merchants beyond the shops |
| `extraFactions` | [2, 3] | Factions |
| `nobleHoldings` | [2, 3] | Holdings a noble starts with |
| `otherHoldings` | [1, 2] | Holdings anyone else starts with |
| `nobleTreasury` | [1500, 3000] | A noble's opening gold |
| `merchantTreasury` | [800, 1600] | A merchant's opening gold |
| `factionTreasury` | [600, 1200] | A faction's opening gold |
| `templeTreasury` | [800, 1400] | A temple's opening gold |
| `nobleGenerosityMin` | 1.3 | Lowest noble generosity |
| `nobleGenerositySpan` | 0.5 | Added spread |
| `merchantGenerosityMin` | 1.0 | Lowest merchant generosity |
| `merchantGenerositySpan` | 0.4 | Added spread |
| `factionGenerosityMin` | 0.8 | Lowest faction generosity |
| `factionGenerositySpan` | 0.4 | Added spread |
| `templeGenerosityMin` | 0.9 | Lowest temple generosity |
| `templeGenerositySpan` | 0.3 | Added spread |
| `upkeepFactorMin` | 0.35 | Lowest daily upkeep, as a share of income |
| `upkeepFactorSpan` | 0.2 | Added spread |
| `initialCooldown` | [0, 6] | Hours before an employer may post |
| `retiredUpkeepFactor` | 0.4 | A retired adventurer's upkeep, as a share of income |
| `retiredGenerosity` | 1.2 | A retired adventurer's generosity |
| `retiredReputation` | 1 | Reputation a new retired employer starts with |
| `retiredCooldown` | [6, 12] | Hours before they post |
| `retiredHoldings` | vineyard, warehouse, trade-route, hunting-lodge, farmland | Holdings a retired adventurer might buy, in the order the draw considers them |
| `threatenedIncomeDivisor` | 2 | A threatened holding pays income divided by this |

## `holdings`

How far a holding's income sits from its kind's figure. Defined in
`src/town/assets.ts`. The income of each kind stays in the holding catalogue.

| Field | Default | Meaning |
| --- | --- | --- |
| `incomeSpreadMin` | 0.7 | Lowest income, as a share of the kind's figure |
| `incomeSpreadSpan` | 0.6 | Added spread, so income runs from 0.7 to 1.3 of that figure |

## `items`

What a shop pays, and how often a found or stocked item is rare. Defined in
`src/items/items.ts`. The catalogue of items stays a content table.
A found item is rare with chance `min(lootRareCap, lootRareBase + level × lootRarePerLevel)`.

| Field | Default | Meaning |
| --- | --- | --- |
| `resaleDivisor` | 2 | A shop pays the price divided by this, rounded down |
| `stockRareChance` | 0.25 | Chance a shop stocks a rare item rather than an uncommon one |
| `lootRareBase` | 0.05 | Chance a found item is rare before level |
| `lootRarePerLevel` | 0.04 | Added to that chance for each level of the job |
| `lootRareCap` | 0.5 | The chance never rises above this |

## `combat`

House rules around a fight. Defined in `src/combat/battlecast.ts`. The grid,
base speed, the d20, and passive Perception stay with the battlefield and the
rules of the game.

| Field | Default | Meaning |
| --- | --- | --- |
| `maxRounds` | 30 | Rounds before a fight is a stalemate |
| `surpriseInitiativePenalty` | 5 | Initiative penalty for the surprised side |
| `ambushTacticChance` | 0.5 | Chance an ambushing side picks one tactic rather than the other |
| `monstersFirstChance` | 0.3 | Chance the monsters act before the company is set |
| `lairDepthWatchfulness` | 0.5 | Added to that chance deeper in a lair |
| `partyAmbushFactor` | 0.43 | Share of the remaining chance that the company ambushes instead |
| `fleeCompanyDivisor` | 2 | Monsters flee when this fraction of the company, or fewer, is standing. 2 means half or fewer. |
| `fleeMonsterHpFraction` | 0.5 | Monsters also flee when they are this badly hurt |
| `stealthGroupDivisor` | 2 | A side sneaks when at least this fraction of them beat passive Perception. 2 means half. |
| `stabilisedHp` | 1 | Hit points a dying winner is left with |

## `world`

What Game still decides: posting, ruin, and the lairs the town starts with.
Defined in `src/sim/game-rules.ts`.

| Field | Default | Meaning |
| --- | --- | --- |
| `maxOpenQuests` | 8 | Open jobs the Board will hold |
| `postingThreshold` | 25 | Treasury an employer needs before posting a contract, and before a lair will raid one of their holdings. The guild also needs it before posting a bounty. |
| `postingCooldown` | [12, 30] | Hours an employer waits after posting |
| `ruinDays` | 3 | Days in debt before an employer is ruined |
| `idleLevelWeight` | 3 | Weight of an idle or resting company's level when choosing what to post |
| `busyLevelWeight` | 1 | Weight of a company that is away, when choosing what to post |
| `stretchReputation` | 3 | Reputation at which an employer may post above the best company in town |
| `stretchPostChance` | 0.1 | Chance of that higher posting |
| `idleStretchTicks` | 24 | Idle hours after which a company will take work off its own level |
| `levelStretch` | 1 | Levels of that stretch, and levels an employer may post above the best company |
| `firstRefusalTicks` | 24 | Hours a favoured company has before anyone else may take the work |
| `startingLairs` | [2, 3] | Lairs the town begins with |
| `startingLairLevels` | [5, 8] | Levels of those lairs |
| `lairRespawnDays` | 12 | Days before a cleared lair's ground is occupied again |
| `lairRespawnSameThemeChance` | 0.5 | Chance the new lair keeps the old theme |
| `lairRespawnLevelGain` | [1, 2] | Levels the new lair gains, still within the level cap |
| `eventLogLimit` | 600 | Events kept in the log |
| `chronicleLimit` | 300 | Lines kept in the chronicle |
