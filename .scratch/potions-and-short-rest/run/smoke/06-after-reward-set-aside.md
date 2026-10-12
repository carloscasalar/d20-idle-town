# Smoke 06 (potions-and-short-rest run, after issue 08: Reward set-aside)

- Date: 2026-10-12
- Commit: 40dbcf7 (branch feature/potions-healing), tree clean. The code change under test is 23c5c2b.
- URL: http://localhost:5173/?seed=42&difficulty=1.15
- Tooling: built-in browser (`mcp__Claude_Browser__*`), `preview_start` with config `d20-town`.
- Changed on purpose since report 05 (commit 23c5c2b): when the apothecary (only, by default) posts a Contract, the reward is sized from its treasury minus the rewards it already owes on Contracts that are open or taken (cap = 0.8 x (treasury - owed), minimum 20 gp). No new random draw. Expected: trajectory equal to 05 until the apothecary first posts while it owes something, then divergence.

## Procedure as run

1. `preview_start` `d20-town`; one batch: navigate to the URL, then click the pause glyph by JS: clock Day 1, 00:00, stable over 3 s. (A first attempt that navigated by JS and paused afterwards read Day 1, 01:00; discarded and redone with the batch, as in 05.)
2. Click `step` 30 times by JS (60 ms apart): Day 2, 06:00. Read the four tabs (tab panel is the `aside`, log is `section.log`) and the log.
3. Click `16x`, poll the clock every 15 ms until 330 h, pause: Day 14, 18:00, exactly 330 h, stable over 3 s. Read Parties, Board, Town, Chronicle, header. During this run the log was scanned for every "Eamon Farrow post a level" line.
4. Second 330 h pass on a fresh load (same URL, same technique) with an extra probe: on each apothecary posting the game was paused, the Board and Town tabs read (apothecary treasury and its open/taken rewards at that hour), then 16x resumed. Pausing does not touch the simulation. Same final figures came out (determinism check). Read the log counts, combat blocks and console on this second pass.
5. Navigate to `?seed=42&difficulty=1.5`, pause, read the footer.
6. `preview_stop`.

## After 30 steps (Day 2, 06:00)

- Counters: quests 1/2, gold paid 591, production spent 125, deaths 2, raised 0, wiped 0. **Identical to 05.**
- Parties (3), Town (3 in town, 3 arrived, heroes spent 310 gp, production 125 gp, raids 3 / 0, lairs next raid 33h / 10h / 1h), Osric 2506 (+39): identical to 05.
- Apothecary Eamon Farrow: treasury **1211 gp**, +17/day, earned 308, spent 166. Identical to 05.
- Log: purchase Day 2, 01:00, The Iron Daggers buy 5 basic healing potions for 250 gp (same). Apothecary posted one Contract so far (Day 1, 04:00, 487 gp, accepted by The Wayward Daggers Day 1, 11:00); the Board shows 8 open / 1 in progress, as in 05.
- **First 30 steps match report 05 exactly.**

## After 330 h at 16x (Day 14, 18:00)

- Counters: **quests 65/76, gold paid 36614, deaths 32, raised 5, wiped 2, production spent 5075. Identical to 05.**
- Town: 7 companies in town, 16 arrived, heroes spent 30390 gp, production 5075 gp, contracts expired 16, magic items found / sold 3 / 1, retired 0, raids / lairs broken 25 / 0. Identical to 05.
- Lairs: Vermithrax strength 3, raids 3 (2 unanswered), next 63h of 78, hoard 744; Raven strength 7, raids 16 (6 unanswered), next 52h of 54, hoard 828; Hellgate strength 1, raids 6, next 61h of 90, hoard 800. Identical to 05.
- Employers: Gideon Farrow 4659 (+9); Temple of Bahamut 4329 (+1); **Eamon Farrow (Apothecary) 3937 gp (-3/day), rep 6, 6 done / 4 failed of 12, earned 11740 / spent 8872**; The Drunken Dragon 976; The Silent Court 856; Guild 808; Brakk Vane 500; Osric 343; Lady Piran Stirling 326; Cartographers' Society 137; Delphine Greycloak's Curiosities 130. **All identical to 05**; no negative treasury anywhere, apothecary not ruined.
- Parties (7), potions held 26, Board 7 open / 4 in progress: same as 05.
- Log window (479 lines): 46 Short rest lines, 13 purchases from Eamon Farrow (62 potions; 62 x 50 = 3100 gp; report 05 wrote 3050, which was an addition slip, the count and lines are the same), 78 combat blocks, 8625 lines, 61 "drinks a basic healing potion" lines. All as in 05.

### Why the 330 h figures do not differ

The set-aside did take effect, but only at the very end of the window and with no gold effect yet. Probe of every apothecary posting (hour of the run, treasury at that hour, rewards it already had open or taken before the new one, reward posted, cap = floor(0.8 x (treasury - owed))):

| Posted | Treasury | Owed before | Reward | Cap | Bound? |
| --- | --- | --- | --- | --- | --- |
| Day 1, 04:00 | 1069 | 0 | 487 | 855 | no |
| Day 4, 04:00 | 1370 | 0 | 260 | 1096 | no |
| Day 4, 21:00 | 1645 | 260 | 174 | 1108 | no |
| Day 5, 13:00 | 2299 | 260 | 372 | 1631 | no |
| Day 6, 20:00 | 2846 | 372 | 620 | 1979 | no |
| Day 8, 06:00 | 3071 | 372 | 392 | 2159 | no |
| Day 9, 08:00 | 3006 | 0 | 1210 | 2404 | no |
| Day 10, 17:00 | 2694 | 0 | 2115 | 2155 | no (close) |
| Day 11, 23:00 | 3261 | 2115 | 496 | 917 | no |
| Day 12, 18:00 | 3633 | 496 | 260 | 2509 | no |
| Day 13, 23:00 | 3840 | 260 | 1293 | 2864 | no |
| Day 14, 12:00 | 3862 | 1293 | **2055** | **2055** | **yes (exactly)** |

- The last posting ("Wild Beasts trample the Ember herb gardens", 2055 gp, taken from a treasury of 3862 with 1293 already owed) is the first one the set-aside capped; without it the cap would have been 3089. That contract was still open at 330 h, so nothing was paid and no counter, treasury or earned/spent figure moved. Divergence will show from here on. The Board shows two apothecary Contracts at the end, 1293 and 2055 gp (sum 3348 against a treasury of 3937).
- The minimum reward (20 gp) was never reached in this window.
- Other employers' rewards: untouched; their counters and treasuries equal 05.

## Apothecary solvency

Treasury read at each posting: 1069 .. 3862, never below 1069; 3937 at the end; the Town tab never showed a negative treasury at any checkpoint; apothecary not ruined (6 done / 4 failed of 12, the same). Income per day shown as -3 at the end, as in 05 (the per-day figure excludes production).

## Difficulty check

`?seed=42&difficulty=1.5` shows "seed 42 · difficulty ×1.5", Day 1, 00:00, production spent 0. PASS.

## Console

Errors-only read after both 330 h passes and after the difficulty page: "No console logs". No "undefined", "NaN", "[object Object]" in the page text or in the 8625 combat lines. Game progresses to the same end state on both passes.

## Notes for comparing later runs

- Seed 42 / x1.15, 30 steps (Day 2, 06:00): quests 1/2, gold paid 591, deaths 2, raised 0, wiped 0, production spent 125, Eamon Farrow 1211 gp (earned 308 / spent 166), heroes spent 310.
- 330 h (Day 14, 18:00): quests 65/76, gold paid 36614, deaths 32, raised 5, wiped 2, production spent 5075, heroes spent 30390, Eamon Farrow 3937 gp (earned 11740 / spent 8872), potions held 26, 46 Short rest lines, 13 visible purchases (62 potions), 61 combat drinks, 7 in town, 16 arrived.
- Apothecary posts in 330 h: 12 (rewards 487, 260, 174, 372, 620, 392, 1210, 2115, 496, 260, 1293, 2055). The last one, 2055, is set-aside capped; a later issue or longer run should differ from 05 after Day 14, 12:00 (the contract is open, its payment is pending).
- Technique: tab panel is `aside`, log is `section.log`; pause in the same batch as the navigation; poll the clock at 15 ms; to probe state at a posting, pause on the log line, read Board and Town, resume.

## Result

PASS. First 30 steps and all 330 h figures match report 05; the only difference that exists (the apothecary's last Contract, 2055 gp instead of a larger uncapped reward) is explained by the stated change and has not yet moved any gold. Apothecary never negative, not ruined, other employers unchanged. No console errors, no NaN/undefined/[object Object], game progresses, difficulty x1.5 shows.
