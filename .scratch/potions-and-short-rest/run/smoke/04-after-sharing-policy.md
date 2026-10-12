# Smoke 04 (potions-and-short-rest run, after issue 06: sharing policy)

- Date: 2026-10-12
- Commit: 16c13fd (branch feature/potions-healing), tree clean.
- URL: http://localhost:5173/?seed=42&difficulty=1.15
- Tooling: built-in browser (`mcp__Claude_Browser__*`), `preview_start` with config `d20-town`.
- Changed on purpose since report 03 (commits 1024ac1, cd06396): each company draws a Potion sharing policy once at creation (company order or most hurt first). It only changes which Bloodied hero is served first when the pack is short. One new random draw per company at creation, so the seeded trajectory and the company names differ from the first tick.

## Procedure as run

1. `preview_start` `d20-town`; navigate to the URL; pause by JS in the same batch as a second navigation: clock Day 1, 00:00, stable over 3 s.
2. Click `step` 30 times by JS (60 ms apart): Day 2, 06:00. Read the four tabs.
3. Click `16x`, poll the clock every 15 ms until 330 h, pause: Day 14, 18:00, exactly 330 h, stable over 3 s (22 s wall time). Read the four tabs, the log, all combat blocks (`details pre`), the console.
4. Navigate to `?seed=42&difficulty=1.5`, pause, read the footer.
5. `preview_stop`.

## After 30 steps (Day 2, 06:00)

- Counters: quests 1/2, gold paid 591, deaths 2, raised 0, wiped 0 (03: 0/2, 0, 4, 0, 0). Trajectory differs from the first tick, as expected.
- Parties (3): The Iron Daggers lvl 2, 337 gp, 5 basic; The Wayward Daggers lvl 1, 44 gp, 2 dead, temple bill 380, 0 potions; Fellowship of the Grim Hounds lvl 1, 50 gp, short rest, 0 potions. (Names differ from 03: The Hollow Hounds, The Broken Wolves.)
- Town: 3 in town, 3 arrived, heroes spent 310 gp, raids 3 / 0 lairs broken, lairs next raid 33h / 10h / 1h (same lair schedule as 03). Eamon Farrow 1336 gp (+17/day). Osric 2506 (+39).
- Board 8 open / 1 in progress. Reads normally.

## After 330 h at 16x (Day 14, 18:00)

- Counters: **quests 65/76, gold paid 36614, deaths 32, raised 5, wiped 2** (03: 62/81, 32249, 60, 7, 5; 02: 64/82, 34152, 57, 8, 3; 01: 69/80, 38921, 40, 7, 2).
- Town: 7 companies in town, 16 arrived (03: 8 / 23), heroes spent 30390 gp (27016), contracts expired 16 (15), magic items found / sold 3 / 1 (2 / 0), retired 0, raids / lairs broken 25 / 0 (29 / 0).
- Lairs: Vermithrax strength 3, raids 3 (2 unanswered), next 63h of 78, hoard 744, bounty posted; Raven strength 7, raids 16 (6 unanswered), next 52h of 54, hoard 828, bounty posted; Hellgate strength 1, raids 6 (0 unanswered), next 61h of 90, hoard 800.
- Employers (treasury, per day): Eamon Farrow (Apothecary) 9012 gp, -3/day, rep 6, 6 done / 4 failed of 12, earned 11740 / spent 3797 (03: 7167, +17); Gideon Farrow 4659; Temple of Bahamut 4329; The Drunken Dragon 976; The Silent Court 856; Guild 808; Brakk Vane 500; Osric 343; Lady Piran Stirling 326; Cartographers' Society 137; Delphine Greycloak's Curiosities last (cut off in my read, positive). No negative treasury seen.
- Parties (8), gold, pack text, status:
  - The Iron Daggers: lvl 6, 2590 gp, resting at the inn, 12/0, 4 heroes (HP 45 max), **"6 basic"**, guild, renown 10
  - The Lucky Foxes: lvl 5, 928 gp, returning, 11/0, 6 heroes, **"0 potions"**, guild, renown 10
  - The Merry Foxes: lvl 5, 898 gp, waiting for recruits (7h), 11/1, 3 dead of 5, temple bill 3450, **"0 potions"**, renown 9
  - The Bold Hounds: lvl 5, 914 gp, resting at the inn, 12/0, 5 heroes, **"11 basic"**, guild, renown 10
  - Order of the Merry Torches: lvl 2, 314 gp, fighting at the Whisper quarry (0/3), 2/2, **"0 potions"**, renown 1
  - Order of the Merry Pilgrims: lvl 4, 810 gp, short rest at the salt mine, 8/0, **"9 basic"**, renown 10
  - The Wandering Daggers: lvl 1, 94 gp, on the road, 0/1, **"0 potions"**, renown 0
  - (8th company of the list not individually recorded beyond the above seven; the Town tab says 7 in town plus one away.)
  - Potions held (seven cards read): 6+0+0+11+0+9+0 = **26** (03: 45). All basic. No "greater", "superior" or "supreme" anywhere; highest company level is 6 (45 max HP), as in 03 no one is near the greater threshold (about 64 max HP).
  - Gold never negative.
- Board: 7 open. Reads normally (lair assault on the Vermithrax roost with Ring of Protection, Kell archives cultists, etc.).
- Chronicle (window 579 lines, 62 KB):
  - 46 Short rest lines, 45 with Hit Die rolls (03: 44 / 43). The one without is a rest with nothing to roll.
  - **13 potion purchase lines** from Eamon Farrow (03: 15), all basic, singular/plural correct, price = count x 50: Day 11 04:00 Lucky Foxes 8 for 400; 08:00 Bold Hounds 1 for 50; 13:00 Merry Foxes 11 for 550; 16:00 Merry Pilgrims 1 for 50; Day 12 10:00 Merry Foxes 7 for 350; 10:00 Bold Hounds 4 for 200; 12:00 Lucky Foxes 4 for 200; Day 13 05:00 Iron Daggers 10 for 500; 09:00 Lucky Foxes 3 for 150; 11:00 Merry Pilgrims 1 for 50; 13:00 Bold Hounds 8 for 400; Day 14 07:00 Bold Hounds 1 for 50; 13:00 Merry Pilgrims 3 for 150. Total 3050 gp for 62 potions (03: 3550 / 71).
  - 0 post-rest drink lines (03: 1). 21 "take rooms", 9 "buy a round", 2 "carry their dead".
  - Combat blocks: 78 (03: 78), 8625 lines (03: 6743). **61 "drinks a basic healing potion" lines (03: 48)**, in 28 blocks, all with the formula and a number; 129 "heals" (76), 17 "Healing Word" (12), 23 "revives" (23).

## Comparison with report 03 and explanation

- Quests 65/76 vs 62/81, gold paid 36614 vs 32249 (+13%), wiped 2 vs 5, raised 5 vs 7. **Deaths 32 vs 60**: roughly half, and below all earlier reports (01: 40, 02: 57). Not several times different, but it is the lowest figure so far on this seed. It is consistent with the new draw reshuffling every company and with "most hurt first" companies saving the fallen first, but a single seed cannot tell the policy's effect from noise: I did not test it.
- Purchases and potions drunk are of the same order as 03 (13 vs 15 lines, 62 vs 71 potions, 61 vs 48 combat drinks). Apothecary treasury healthy (9012), not ruined; its per-day income is -3 at the end.
- Company names, composition, number of companies arrived (16 vs 23) differ because of the extra draw at creation. Lair schedule at tick 30 (33h / 10h / 1h) is identical, so the world seed is unchanged for lairs.
- **Policy visibility: not visible anywhere.** Zero matches for "polic", "company order", "most hurt" in the Parties, Board, Town and Chronicle text, in any combat block, in `title` / `aria-label` attributes, or in the whole page HTML. This matches the stated expectation (nothing new in the UI).
- Not exercised: any tier above basic (company level tops at 6). The post-rest drink path in the Chronicle did not appear in this run (0 lines), so the policy at the Short rest is not observable in the UI; in combat, drinks occur normally.

## Difficulty check

`?seed=42&difficulty=1.5` shows "seed 42 · difficulty ×1.5", clock Day 1, 00:00 after pausing. PASS.

## Console

Errors-only read: "No console logs". No "undefined", "NaN", "[object Object]" in the four tabs, the whole page text (579 log lines) or the 8625 combat lines.

## Notes for comparing later runs

- Seed 42 / x1.15 at 30 steps (Day 2, 06:00): quests 1/2, gold paid 591, deaths 2, raised 0, wiped 0; parties The Iron Daggers / The Wayward Daggers / Fellowship of the Grim Hounds.
- At 330 h exactly (Day 14, 18:00): quests 65/76, gold paid 36614, deaths 32, raised 5, wiped 2, heroes spent 30390, potions held 26 (all basic, seven cards), Eamon Farrow 9012 gp (earned 11740 / spent 3797), 46 Short rest lines, 13 purchases (62 potions, 3050 gp), 61 combat drinks, 0 post-rest drinks, 7 companies in town, 16 arrived.
- Same technique as 03: pause in the same batch as the navigation; poll the clock at 15 ms; the Chronicle log is in `document.body.innerText`, combat lines from `details pre`. Short rest rolls read like "7+2=9" (no "d").

## Result

PASS. No console errors, no broken output, the game progresses, purchases read sensibly, company gold never negative, apothecary treasury healthy. The sharing policy is invisible in the UI as expected. Observation (not a failure): deaths 32 vs 60 in 03, the lowest on this seed.
