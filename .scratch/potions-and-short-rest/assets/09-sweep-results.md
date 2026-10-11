# Ticket 09: sweep results

Raw output of the throwaway prototype. Deviations are percentages against the baseline measured on `ed52b20` (see the ticket for how). `dpq` is deaths per quest. `worst` is the largest absolute deviation of the five metrics; the acceptance is `worst <= 15`.

## Seeds 1 to 80

| variant | scale | quests | failed | dpq | wiped | raised | worst | apothecary end (gp) | apothecaries ruined | potions bought per run (basic / greater / superior / supreme) |
|---|---|---|---|---|---|---|---|---|---|---|
| new rules, all defaults of the tickets (D0) | 1.15 | -5.7 | -10.0 | +2.4 | -4.0 | -9.7 | 10.0  | 2920 | 5 of 80 | 342.4 / 2.4 / 0 / 0 |
| new rules, all defaults of the tickets (D0) | 1.5 | -7.7 | -10.2 | +3.9 | -3.6 | -14.2 | 14.2  | 3401 | 2 of 80 | 271.3 / 1.1 / 0 / 0 |
| potionCoverFraction 0.25 | 1.15 | -7.1 | -2.5 | +12.7 | +9.0 | -10.6 | 12.7  | 1393 | 3 of 80 | 239.7 / 0 / 0 / 0 |
| potionCoverFraction 0.25 | 1.5 | -5.6 | -5.5 | +6.3 | -3.6 | -4.4 | 6.3  | 1610 | 3 of 80 | 192.1 / 0 / 0 / 0 |
| potionCoverFraction 0.35 | 1.15 | -4.6 | -6.7 | +6.3 | +6.2 | -10.2 | 10.2  | 2037 | 6 of 80 | 287.2 / 0 / 0 / 0 |
| potionCoverFraction 0.35 | 1.5 | -5.3 | -8.4 | +2.9 | -5.3 | -3.6 | 8.4  | 2416 | 0 of 80 | 237.3 / 0 / 0 / 0 |
| potionCoverFraction 0.75 | 1.15 | -8.5 | -13.9 | +1.2 | -7.9 | -18.8 | 18.8 (fails) | 4853 | 0 of 80 | 390.3 / 20.2 / 0 / 0 |
| potionCoverFraction 0.75 | 1.5 | -8.9 | -16.5 | -2.5 | -13.3 | -17.1 | 17.1 (fails) | 4704 | 1 of 80 | 319.9 / 9 / 0 / 0 |
| potionCoverFraction 1.0 | 1.15 | -9.5 | -21.2 | -5.3 | -11.0 | -30.2 | 30.2 (fails) | 6289 | 0 of 80 | 420.7 / 26.5 / 0 / 0 |
| potionCoverFraction 1.0 | 1.5 | -11.6 | -23.8 | -6.2 | -16.5 | -21.8 | 23.8 (fails) | 5146 | 0 of 80 | 323.6 / 10.5 / 0 / 0 |
| tier divisor 1 | 1.15 | -8.8 | -8.7 | +7.4 | -1.5 | -15.5 | 15.5 (fails) | 4710 | 0 of 80 | 278.4 / 40.5 / 0 / 0 |
| tier divisor 1 | 1.5 | -8.0 | -7.9 | +6.7 | -0.4 | -12.4 | 12.4  | 4344 | 0 of 80 | 233.3 / 22.6 / 0 / 0 |
| tier divisor 0.5 | 1.15 | -7.5 | -10.3 | +4.9 | -0.7 | -16.3 | 16.3 (fails) | 5163 | 2 of 80 | 261.4 / 53.6 / 0.2 / 0 |
| tier divisor 0.5 | 1.5 | -8.5 | -11.7 | +3.3 | -6.5 | -9.9 | 11.7  | 4457 | 0 of 80 | 221.5 / 29.2 / 0.1 / 0 |
| tier divisor 4 | 1.15 | -5.2 | -10.1 | +2.1 | -1.8 | -9.4 | 10.1  | 2841 | 5 of 80 | 347.7 / 0 / 0 / 0 |
| tier divisor 4 | 1.5 | -7.5 | -10.2 | +3.5 | -4.0 | -13.4 | 13.4  | 3326 | 2 of 80 | 272.9 / 0 / 0 / 0 |
| sharing weights 100 / 0 | 1.15 | -7.3 | -9.5 | +5.6 | -3.6 | -11.4 | 11.4  | 3072 | 1 of 80 | 347.1 / 2.2 / 0 / 0 |
| sharing weights 100 / 0 | 1.5 | -5.4 | -11.6 | -0.1 | -6.4 | -8.5 | 11.6  | 3308 | 0 of 80 | 282.5 / 0.7 / 0 / 0 |
| sharing weights 0 / 100 | 1.15 | -5.3 | -11.3 | +0.4 | -0.8 | -15.4 | 15.4 (fails) | 2875 | 4 of 80 | 343.2 / 2.4 / 0 / 0 |
| sharing weights 0 / 100 | 1.5 | -7.1 | -9.9 | +4.0 | -2.0 | -12.6 | 12.6  | 3792 | 0 of 80 | 284.2 / 0.9 / 0 / 0 |
| startingGoldPerLevel 50 | 1.15 | -4.6 | -8.6 | +5.9 | +4.7 | -0.3 | 8.6  | 3225 | 4 of 80 | 356.9 / 1.3 / 0 / 0 |
| startingGoldPerLevel 50 | 1.5 | -6.5 | -10.5 | +3.2 | -3.3 | +2.4 | 10.5  | 3657 | 0 of 80 | 292.2 / 1.1 / 0 / 0 |
| startingGoldPerLevel 75 | 1.15 | -3.3 | -7.8 | +2.7 | +3.6 | -4.4 | 7.8  | 3425 | 2 of 80 | 374.3 / 2.1 / 0 / 0 |
| startingGoldPerLevel 75 | 1.5 | -2.1 | -11.3 | -2.4 | -5.9 | +11.8 | 11.8  | 3783 | 1 of 80 | 321.5 / 0.9 / 0 / 0 |
| startingGoldPerLevel 100 | 1.15 | -0.8 | -13.3 | -2.7 | -0.1 | +7.7 | 13.3  | 3683 | 1 of 80 | 398.2 / 2.6 / 0 / 0 |
| startingGoldPerLevel 100 | 1.5 | +0.2 | -11.5 | -5.1 | -6.3 | +25.2 | 25.2 (fails) | 4406 | 1 of 80 | 347.3 / 1.3 / 0 / 0 |
| retreatHpFraction 0.25 | 1.15 | -5.5 | -10.5 | +2.1 | -4.4 | -11.8 | 11.8  | 2871 | 5 of 80 | 344.3 / 2.5 / 0 / 0 |
| retreatHpFraction 0.25 | 1.5 | -6.9 | -11.2 | +2.8 | -1.5 | -14.1 | 14.1  | 3216 | 1 of 80 | 275.9 / 1.4 / 0 / 0 |
| retreatHpFraction 0.45 | 1.15 | -5.6 | -12.0 | -2.3 | -13.2 | -13.3 | 13.3  | 2848 | 6 of 80 | 346.6 / 2.6 / 0 / 0 |
| retreatHpFraction 0.45 | 1.5 | -7.6 | -10.0 | +2.6 | -4.2 | -13.7 | 13.7  | 3393 | 1 of 80 | 271.2 / 1.2 / 0 / 0 |
| purse 50 + reserveDays 0 | 1.15 | -4.9 | -8.2 | +6.6 | +5.5 | -1.0 | 8.2  | 3209 | 4 of 80 | 353.7 / 1.3 / 0 / 0 |
| purse 50 + reserveDays 0 | 1.5 | -6.6 | -10.6 | +3.1 | -3.4 | +2.5 | 10.6  | 3651 | 0 of 80 | 291.7 / 1.1 / 0 / 0 |
| purse 50 + reserveDays 10 | 1.15 | -4.8 | -9.3 | +5.2 | +2.9 | -0.9 | 9.3  | 3158 | 4 of 80 | 349 / 1.1 / 0 / 0 |
| purse 50 + reserveDays 10 | 1.5 | -6.7 | -10.3 | +3.5 | -3.6 | +2.8 | 10.3  | 3679 | 0 of 80 | 289.7 / 1.1 / 0 / 0 |
| purse 50 + apothecary opening treasury 3,000 | 1.15 | -4.0 | -9.6 | +4.0 | +4.7 | +0.1 | 9.6  | 4739 | 0 of 80 | 362.8 / 2.4 / 0 / 0 |
| purse 50 + apothecary opening treasury 3,000 | 1.5 | -7.2 | -10.8 | +3.6 | -4.1 | +2.5 | 10.8  | 5407 | 0 of 80 | 289.6 / 1.3 / 0 / 0 |
| purse 50 + potionCoverFraction 0.4 | 1.15 | -2.6 | -11.2 | +0.4 | +8.6 | -6.0 | 11.2  | 2556 | 3 of 80 | 324.1 / 0 / 0 / 0 |
| purse 50 + potionCoverFraction 0.4 | 1.5 | -3.1 | -7.6 | +2.5 | -2.8 | +7.6 | 7.6  | 2887 | 1 of 80 | 276.5 / 0.1 / 0 / 0 |
| purse 50 + tier divisor 1 | 1.15 | -5.4 | -8.3 | +5.7 | +4.9 | -3.8 | 8.3  | 4554 | 1 of 80 | 297.2 / 40.6 / 0 / 0 |
| purse 50 + tier divisor 1 | 1.5 | -7.6 | -11.3 | +2.3 | -5.1 | -3.4 | 11.3  | 4852 | 0 of 80 | 252.9 / 25.5 / 0 / 0 |
| purse 50 + apothecary credit rule | 1.15 | -4.2 | -10.1 | +3.1 | +2.4 | -0.4 | 10.1  | 6590 | 0 of 80 | 364.4 / 2.1 / 0 / 0 |
| purse 50 + apothecary credit rule | 1.5 | -6.9 | -10.9 | +3.3 | -4.3 | +1.8 | 10.9  | 6512 | 0 of 80 | 291.4 / 1.1 / 0 / 0 |

## Seeds 81 to 160 (held out; baseline re-measured on the same seeds)

| variant | scale | quests | failed | dpq | wiped | raised | worst | apothecary end (gp) | apothecaries ruined | potions bought per run (basic / greater / superior / supreme) |
|---|---|---|---|---|---|---|---|---|---|---|
| all defaults | 1.15 | -6.2 | -6.3 | +10.0 | +14.6 | -6.3 | 14.6  | 3060 | 2 of 80 | 347.9 / 3 / 0 / 0 |
| all defaults | 1.5 | -8.1 | -12.5 | +2.7 | -5.7 | -10.5 | 12.5  | 3412 | 2 of 80 | 277.7 / 1 / 0 / 0 |
| purse 50 | 1.15 | -5.8 | -8.6 | +7.9 | +12.0 | -6.9 | 12.0  | 3407 | 1 of 80 | 362.1 / 2.3 / 0 / 0 |
| purse 50 | 1.5 | -5.8 | -11.4 | +1.7 | -2.2 | +1.5 | 11.4  | 3588 | 0 of 80 | 295.8 / 1.1 / 0 / 0 |
| purse 50 + apothecary credit rule | 1.15 | -5.9 | -7.3 | +8.8 | +12.6 | -7.1 | 12.6  | 6867 | 1 of 80 | 364.8 / 2.6 / 0 / 0 |
| purse 50 + apothecary credit rule | 1.5 | -5.8 | -10.7 | +2.5 | -1.6 | +3.0 | 10.7  | 6265 | 0 of 80 | 296 / 1.2 / 0 / 0 |

## Shape of the scale (seeds 1 to 80)

| scale | baseline dpq | all defaults dpq | purse 50 dpq |
|---|---|---|---|
| 1 | 0.437 | 0.426 | 0.406 |
| 1.15 | 0.748 | 0.766 | 0.792 |
| 1.25 | 0.929 | 0.946 | 0.937 |
| 1.5 | 1.483 | 1.541 | 1.53 |
| 1.75 | 2.263 | 2.249 | 2.259 |

## Long runs: 3000 ticks, seeds 1 to 20, scale 1.15

| variant | quests | apothecaries ruined | apothecary end (gp) | gold burnt in production | bought basic / greater / superior / supreme |
|---|---|---|---|---|---|
| today (baseline) | 486.2 | 0 of 20 | 4062 | 0 | 0 / 0 / 0 / 0 |
| purse 50, divisor 2 | 458.7 | 12 of 20 | 1552 | 41578 | 1324.9 / 83.5 / 0.1 / 0 |
| purse 50, divisor 1 | 449.9 | 10 of 20 | 2545 | 55595 | 1120.4 / 261.9 / 1.4 / 0 |
| purse 50, divisor 0.5 | 438.3 | 9 of 20 | 1917 | 55511 | 1022.9 / 267.9 / 3.1 / 0 |
| purse 50 + opening treasury 3,000 | 448.85 | 9 of 20 | 2377 | 45020 | 1365.6 / 107.3 / 0.1 / 0 |
| purse 50 + reserveDays 10 | 458.3 | 10 of 20 | 1241 | 34606 | 1121.8 / 65.6 / 0 / 0 |
| purse 50 + apothecary credit rule | 3000 ticks, 20 seeds | 7 of 20 | 11229 | 29053 | not recorded |

Apothecary accounting over 3000 ticks, 20 seeds: today earned 90,572 and spent 87,819 (ruined 0 of 20); new rules with purse 50 earned 94,217 and spent 93,974 of which 41,578 was production (ruined 12 of 20); with the credit rule earned 124,403, spent 114,483 of which 29,053 was production (ruined 7 of 20).
