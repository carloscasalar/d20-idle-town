# Smoke 07 (potions-and-short-rest run, final check before the PRD is reported finished)

- Date: 2026-10-12
- Commit: 98e1bae (branch feature/potions-healing), tree clean. `git diff --stat 40dbcf7 HEAD -- src` is empty: no file under `src/` changed since report 06.
- URL: http://localhost:5173/?seed=42&difficulty=1.15
- Tooling: built-in browser (`mcp__Claude_Browser__*`), `preview_start` with config `d20-town`.
- Changed on purpose since report 06 (commits e63b1e8, 21291d8, 827e863): nothing in the game (regression hashes re-recorded, documents corrected). Expected: identical to 06.

## Procedure as run

1. `preview_start` `d20-town`; one batch: navigate to the URL, then click the pause glyph by JS: Day 1, 00:00.
2. Click `step` 30 times by JS (60 ms apart): Day 2, 06:00, stable. Read the four tabs and the log.
3. Click `16x`, poll the clock every 15 ms until 330 h, pause: Day 14, 18:00, stable over 3 s. Read Parties, Board, Town, Chronicle, header; expand every combat block and scan the log.
4. Second 330 h pass on a fresh load (same technique) that scans the log every 40 ms for lines that scroll out of the 479-line window ("catch their breath", purchases, any tier other than basic). Same final figures came out (determinism).
5. Navigate to `?seed=42&difficulty=1.5`, pause, read the footer.
6. `preview_stop`.

## Comparison with report 06: identical

| Figure | 06 | 07 |
| --- | --- | --- |
| After 30 steps | Day 2 06:00, quests 1/2, gold paid 591, production 125, deaths 2, raised 0, wiped 0 | same |
| 30 steps: heroes spent / Eamon Farrow | 310 / 1211 gp (+17/day, earned 308, spent 166) | same |
| 30 steps: pack text | Iron Daggers "5 basic", others "0 potions" | same; purchase Day 2, 01:00 Iron Daggers buy 5 basic for 250 gp |
| 330 h | quests 65/76, gold paid 36614, deaths 32, raised 5, wiped 2, production 5075 | same |
| Town | 7 in town, 16 arrived, heroes spent 30390, contracts expired 16, items 3/1, raids 25/0 | same |
| Lairs | Vermithrax 3 (hoard 744), Raven 7 (828), Hellgate 1 (800) | same |
| Eamon Farrow | 3937 gp (-3/day), rep 6, 6 done / 4 failed of 12, earned 11740 / spent 8872 | same |
| Other employers | Gideon 4659, Temple 4329, Drunken Dragon 976, Silent Court 856, Guild 808, Brakk 500, Osric 343, Piran 326, Cartographers 137, Delphine 130 | same |
| Potions held | 26 (Iron Daggers 6, Merry Pilgrims 9, Bold Hounds 11) | same |
| Log window | 479 lines, 46 Short rest lines, 13 purchases (62 potions, 3100 gp), 78 combat blocks, 8625 combat lines, 61 drinks | same (9104 lines with the blocks open = 479 + 8625), 61 drinks, 19 "gives" lines |
| Board | 7 open / 4 in progress, apothecary Contracts 1293 and 2055 gp | same |

No difference from 06. The `difficulty=1.5` page shows "seed 42 · difficulty x1.5", Day 1, 00:00.

## Final read of the feature as a user (seed 42, x1.15)

- Short rest log lines with the Hit Dice rolled: visible and sensible. Example: "Day 14, 17:00 The Lucky Foxes take a Short rest (1 hour). Ulric Goldleaf: 6+2=8, 8+2=10; 38/38 HP. Wren Nightriver: 3+2=5, 3+2=5, 2+2=4, 6+2=8; 44/44 HP." (each die + modifier = healing, then HP after). The line lists one entry per hero that rolled; the die size is not named in the text, only the rolls. 46 such lines in the final window, none with NaN/undefined.
- Potion drink lines with tier, formula and roll, in combat: visible, e.g. "Quill Coldwater drinks a basic healing potion (2d4+2: 8)." (61 in the final window) and "Quill Coldwater gives Fenwick Thornfield a basic healing potion (2d4+2: 6)." (19). Only the basic tier occurs in this seed's 330 h; no greater/superior/supreme line appeared, so those tier names were not seen on screen in this run.
- Potion drink lines after a rest: visible, but none is in the final 479-line window. The second pass caught one when it was written: "Day 4, 12:00 The Iron Daggers catch their breath. Ivo Underhill drinks a basic healing potion (2d4+2: 8). 1 basic left." Reads sensibly (tier, formula, roll, what is left).
- Pack text on every party card: yes. Every card (3 at 30 steps, 7 at 330 h) ends with a pack row: "6 basic · guild · renown 10", "9 basic · renown 10", "11 basic · guild · renown 10", or "0 potions · renown N" for an empty pack. Reads sensibly.
- Potion purchase lines (tier, count, price): visible, e.g. "The Bold Hounds buy 1 basic healing potion from Eamon Farrow for 50 gp.", "The Merry Foxes buy 11 basic healing potions from Eamon Farrow for 550 gp." Singular/plural right; unit price 50 gp throughout (13 in the window, 62 potions, 3100 gp; 55 seen over the whole pass by scanning).
- "spent on potion production" in the Town tab: visible, 125 gp at 30 steps, 5075 gp at 330 h (also in the header as "production spent").
- Apothecary treasury: Eamon Farrow 1069 at start (report 00), 1211 at 30 steps, 3937 at 330 h, never negative at any checkpoint (report 06's probe of every posting: 1069 .. 3862 minimum 1069). Not ruined (6 done / 4 failed of 12). Income per day shown as -3 at the end (the figure excludes production), as in 05 and 06. Healthy, not ruined.
- Shown differently from what a player might expect: a Short rest line names the rolled dice but not the die size; otherwise nothing odd.

## Whole-feature comparison with the very first report (00-baseline.md, before the feature)

Seed 42, x1.15, 330 h (Day 14, 18:00):

| | 00 baseline | 07 final |
| --- | --- | --- |
| Quests | 62/82 | 65/76 |
| Gold paid | 25838 | 36614 |
| Deaths | 59 | 32 |
| Raised | 8 | 5 |
| Wiped | 2 | 2 |
| Heroes have spent | 21111 gp | 30390 gp |
| Production spent | not shown (0, feature absent) | 5075 gp |
| Eamon Farrow treasury | 4361 gp (earned 7315 / spent 4023, 7 done / 1 failed of 11) | 3937 gp (earned 11740 / spent 8872, 6 done / 4 failed of 12) |
| Potions held | 15 (no tiers, "N potions") | 26 (tiered "N basic") |
| Potion purchases in window | 11 (35-65 gp each, variable) | 13 (62 potions, flat 50 gp each) |
| Companies in town / arrived | 8 / 22 | 7 / 16 |
| Short rest text | none anywhere | 46 lines |
| Delphine Greycloak's Curiosities | -128 gp, RUINED | 130 gp, not ruined |
| Contracts expired | 15 | 16 |
| Raids / lairs broken | 24 / 0 | 25 / 0 |

Deaths almost halved and gold paid is up by about 42 percent, as intended by the potions and Short rests; the apothecary stays solvent and still grows from 1069 gp.

## Console

Errors-only read after the first 330 h pass, after the second pass, and on the difficulty page: "No console logs". No "undefined", "NaN" or "[object Object]" in the page text or in the 9104 log lines with all combat blocks open. Game progresses to the same end state on both passes; no empty panels, all four tabs and controls respond.

## Result

PASS. First 30 steps and all 330 h figures are identical to report 06, as expected from a change set that touched no file under `src/`. All six feature points are visible and read sensibly (greater tiers not seen on screen in this seed). Apothecary never negative, not ruined.
