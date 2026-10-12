# Smoke 05 (potions-and-short-rest run, after issue 07: on-demand potion production)

- Date: 2026-10-12
- Commit: b31de17 (branch feature/potions-healing), tree clean. The code change under test is b0e724e.
- URL: http://localhost:5173/?seed=42&difficulty=1.15
- Tooling: built-in browser (`mcp__Claude_Browser__*`), `preview_start` with config `d20-town`.
- Changed on purpose since report 04 (commit b0e724e): the apothecary makes each potion on demand and pays a production cost that leaves the world (basic 25 gp, half of the 50 gp price) before the sale, so it nets 25 gp per basic potion. New lifetime statistic "spent on potion production". No new random draw.

## Procedure as run

1. `preview_start` `d20-town`; navigate to the URL; click the pause button (shows as a pause glyph) right after load, then navigate again and pause by JS in the same batch: clock Day 1, 00:00, stable over 3 s.
2. Click `step` 30 times by JS (60 ms apart): Day 2, 06:00. Read the tabs (the tab panel is the `aside`; the log is a separate `section`, so the page text always contains the log).
3. Click `16x`, poll the clock every 15 ms until 330 h, pause: Day 14, 18:00, exactly 330 h, stable over 3 s (21 s wall time). Read Parties and Town, the log, all combat blocks (`details pre`), the console.
4. Re-ran 30 steps on a fresh load to read the early purchase line.
5. Navigate to `?seed=42&difficulty=1.5`, pause, read the footer.
6. `preview_stop`.

## After 30 steps (Day 2, 06:00)

- Counters: quests 1/2, gold paid 591, deaths 2, raised 0, wiped 0. **Identical to 04.** New header counter "production spent 125".
- Parties (3): The Iron Daggers lvl 2, 337 gp, "5 basic", earned 591 / spent 304; The Wayward Daggers lvl 1, 44 gp, 2 dead, temple bill 380, 0 potions; Fellowship of the Grim Hounds lvl 1, 50 gp, short rest, 0 potions. Same as 04.
- Town: 3 in town, 3 arrived, heroes spent 310 gp (same), **spent on potion production 125 gp**, raids 3 / 0, lairs next raid 33h / 10h / 1h (same). Osric 2506 (+39) same.
- Apothecary Eamon Farrow: treasury **1211 gp** (04: 1336; difference exactly 125), +17/day, earned 308, spent 166 (41 upkeep + 125 production).
- Log: one purchase, Day 2 01:00, The Iron Daggers buy 5 basic healing potions for 250 gp. 5 x 25 = 125 = the statistic. Exact.
- Board 8 open / 1 in progress. Reads normally.

## After 330 h at 16x (Day 14, 18:00)

- Counters: **quests 65/76, gold paid 36614, deaths 32, raised 5, wiped 2. Identical to 04.** Header "production spent 5075".
- Town: 7 companies in town, 16 arrived, heroes spent 30390 gp, **spent on potion production 5075 gp** (a number, 5075 = 203 x 25), contracts expired 16, magic items found / sold 3 / 1, retired 0, raids / lairs broken 25 / 0. All identical to 04 except the new line.
- Lairs: same as 04 (Vermithrax strength 3, raids 3 (2 unanswered), next 63h of 78, hoard 744; Raven strength 7, raids 16 (6 unanswered), next 52h of 54, hoard 828; Hellgate strength 1, raids 6, next 61h of 90, hoard 800).
- Employers (treasury, per day): Gideon Farrow 4659 (+9); Temple of Bahamut 4329 (+1); **Eamon Farrow (Apothecary) 3937 gp (-3/day)**, rep 6, 6 done / 4 failed of 12, **earned 11740 / spent 8872** (04: 9012, earned 11740, spent 3797); The Drunken Dragon 976; The Silent Court 856; Guild 808; Brakk Vane 500; Osric 343; Lady Piran Stirling 326; Cartographers' Society 137; Delphine Greycloak's Curiosities 130. No negative treasury anywhere; the apothecary is not ruined.
- Apothecary arithmetic: 9012 - 3937 = 5075 = production spent; spent 8872 - 3797 = 5075; earned unchanged at 11740. The trajectory did not diverge at all, so the smaller treasury did not change any posted reward.
- Parties (7, same as 04): Iron Daggers lvl 6, 2590 gp, "6 basic", earned 10059 / spent 7519; Lucky Foxes lvl 5, 928 gp, 0 potions; Merry Foxes lvl 5, 898 gp, 3 dead, temple bill 3450, 0 potions; Bold Hounds lvl 5, 914 gp, "11 basic"; Merry Torches lvl 2, 314 gp, 0 potions; Merry Pilgrims lvl 4, 810 gp, "9 basic"; Wandering Daggers lvl 1, 94 gp, 0 potions. Potions held 26 (same as 04). Board 7 open.
- Chronicle (400-line window from Day 11 on): 46 Short rest lines (04: 46), 13 purchase lines from Eamon Farrow, identical text and prices to 04 (62 potions, 3050 gp, price = count x 50). Combat blocks 78, 8625 lines, 61 "drinks a basic healing potion" lines, all as in 04.

## Production statistic check

- Statistic visible in two places: the header ("production spent N") and the Town tab ("spent on potion production N gp"). Both read as numbers, match each other at both checkpoints (125, 5075).
- 30 steps: 5 potions bought (250 gp paid) -> 125 gp = 25 x 5. Exact.
- 330 h: the 400-line log window only covers Day 11 onward, so the full purchase count cannot be read. 5075 / 25 = 203 whole potions, and heroes paid 203 x 50 = 10150 gp for them (a third of the 30390 gp heroes spent), which is consistent with half. In the visible window 62 potions were bought, i.e. 1550 gp of production, well under 5075, as expected for 330 h.

## Comparison with report 04 and explanation

- Every counter, party, lair, log line and combat count equals 04. Only changes: the new statistic (header and Town tab) and the apothecary's treasury and spent, both lower by exactly the production total (5075 at 330 h, 125 at 30 steps). All explained by the stated change. No random-draw drift, as expected.
- Note: apothecary income per day is -3 at the end in both 04 and 05 (the per-day figure does not include production).

## Difficulty check

`?seed=42&difficulty=1.5` shows "seed 42 · difficulty ×1.5", Day 1, 00:00, production spent 0. PASS.

## Console

Errors-only read: "No console logs". No "undefined", "NaN", "[object Object]" in the page text (400 log lines, tabs) or the 8625 combat lines.

## Notes for comparing later runs

- Seed 42 / x1.15 at 30 steps (Day 2, 06:00): quests 1/2, gold paid 591, deaths 2, raised 0, wiped 0, production spent 125, Eamon Farrow 1211 gp (earned 308 / spent 166), heroes spent 310.
- At 330 h (Day 14, 18:00): quests 65/76, gold paid 36614, deaths 32, raised 5, wiped 2, production spent 5075, heroes spent 30390, Eamon Farrow 3937 gp (earned 11740 / spent 8872), potions held 26, 46 Short rest lines, 13 visible purchases (62 potions, 3050 gp), 61 combat drinks, 7 in town, 16 arrived.
- Technique: tab panel is `aside`, log is `section.log`; pause in the same batch as the navigation; poll the clock at 15 ms.

## Result

PASS. No console errors, no broken output, game progresses, new statistic visible and correct (exact at 30 steps, consistent at 330 h), apothecary solvent (3937 gp), no negative treasury, trajectory identical to 04.
