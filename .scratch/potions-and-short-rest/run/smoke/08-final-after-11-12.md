# Smoke 08 (potions-and-short-rest run, after issues 10, 11 and 12)

- Date: 2026-10-12
- Commit: 60b4970 (branch feature/potions-healing).
- URL: http://localhost:5173/?seed=42&difficulty=1.15
- Tooling: built-in browser, `preview_start` with config `d20-town`; server stopped by id at the end.
- Changed on purpose since report 07 (98e1bae): issue 10 (configuration validation), issue 11 (Bounties in the Reward set-aside, off with the default configuration), issue 12 (internal clean-ups). `git diff --stat 98e1bae HEAD -- src`: quests/quest.ts, sim/board.ts, sim/config.ts, sim/game.ts, town/town.ts (51 insertions, 14 deletions). Expected: identical figures to 07.

## Procedure as run

1. `preview_start` `d20-town`; navigate to the URL and click the pause glyph in the same batch: Day 1, 00:00. (A first load paused by a separate call showed Day 1, 02:00; reloaded and paused in one batch, as in 07.)
2. Click `step` 30 times by JS (60 ms apart): Day 2, 06:00, stable over 3 s. Read the four tabs and the log.
3. Click `16x`, poll the clock every 15 ms until 330 h, pause (21 s): Day 14, 18:00, stable over 3 s. Read Parties, Board, Town, header; open every combat block and count the log.
4. Navigate to `?seed=42&difficulty=1.5`, pause, read the footer.
5. `preview_stop`.

The second 330 h pass of 07 (scan for lines that scroll out of the window) was not repeated: the end state is identical to 07 and 06, which is the determinism check.

## Comparison with report 07: identical

| Figure | 07 | 08 |
| --- | --- | --- |
| After 30 steps | Day 2 06:00, quests 1/2, gold paid 591, production 125, deaths 2, raised 0, wiped 0 | same |
| 30 steps: heroes spent / Eamon Farrow | 310 / 1211 gp (+17/day, earned 308, spent 166) | same |
| 30 steps: pack text | Iron Daggers "5 basic", others "0 potions"; Day 2, 01:00 Iron Daggers buy 5 basic for 250 gp | same |
| 30 steps: town | 3 in town, 3 arrived, expired 0, items 0/0, raids 3/0 | same |
| 330 h | quests 65/76, gold paid 36614, deaths 32, raised 5, wiped 2, production 5075 | same |
| Town | 7 in town, 16 arrived, heroes spent 30390, expired 16, items 3/1, raids 25/0 | same |
| Lairs | Vermithrax 3 (hoard 744), Raven 7 (828), Hellgate 1 (800) | same (the Town card also shows "bounty posted" on Vermithrax and Raven, a label drawn by `src/ui/main.ts`, which did not change) |
| Eamon Farrow | 3937 gp (-3/day), rep 6, 6 done / 4 failed of 12, earned 11740 / spent 8872 | same |
| Other employers | Gideon 4659, Temple 4329, Drunken Dragon 976, Silent Court 856, Guild 808, Brakk 500, Osric 343, Piran 326, Cartographers 137, Delphine 130 | same |
| Potions held | 26 (Iron Daggers 6, Merry Pilgrims 9, Bold Hounds 11) | same (pack rows: 6, 9, 11 basic; four packs "0 potions") |
| Log window | 479 lines, 46 Short rest lines, 13 purchases (62 potions, 3100 gp), 78 combat blocks, 8625 combat lines, 61 drinks, 19 "gives" | same: 399 events + 78 blocks, 46 Short rest lines, 13 purchases (62 potions, 3100 gp), 78 blocks, 8625 combat lines, 61 drinks, 19 "gives"; 9232 text lines with the Board tab open = 9104 + 128 Board lines |
| Board | 7 open / 4 in progress, apothecary Contracts 1293 and 2055 gp | same |
| Difficulty page | "seed 42 · difficulty x1.5", Day 1 00:00 | same |

No difference. Only the basic tier occurs in this seed's 330 h, as in 07.

## Console

Errors-only read after the 330 h run and on the difficulty page: "No console logs". No "NaN", "undefined" or "[object Object]" in the page text with all 78 combat blocks open. All tabs and controls respond, the game progresses to the same end state.

## Result

PASS. Every figure at 30 steps and at 330 h is identical to report 07 (and so to 06), as expected from changes that are off or neutral with the default configuration.
