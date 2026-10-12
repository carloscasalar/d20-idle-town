# Smoke 09 (potions-and-short-rest run, after issues 13, 14 and 15)

- Date: 2026-10-12
- Commit: 5cb506a (branch feature/potions-healing).
- URL: http://localhost:5173/?seed=42&difficulty=1.15
- Tooling: built-in browser, `preview_start` with config `d20-town`; server stopped by id at the end.
- Changed on purpose since report 08 (60b4970): issue 13 (refactor, identical dice and text), issue 14 (scripts only), issue 15 (acts only when `kinds.assault.revealsCount` is false). Expected: identical figures to 08.

## Procedure as run

1. `preview_start` `d20-town`; navigate to the URL and click the pause glyph in the same batch: Day 1, 00:00.
2. Click `step` 30 times by JS (60 ms apart): Day 2, 06:00, stable over 2-3 s. Read Parties, Board, Town (panel text) and the log.
3. Click `16x`, poll the clock element every tick until 300 h more (330 h in all), pause: Day 14, 18:00, stable over 3 s. Read Parties, Board, Town and header; open every combat block and count the log.
4. Navigate to `?seed=42&difficulty=1.5`, pause, read the footer.
5. `preview_stop`.

Note: a first 330 h attempt polled by reading the whole page text, which is slow, and overshot to Day 16 00:00 (quests 71/84, deaths 41, wiped 4). That was a measuring artefact (the 16x run went 360 h), not a game difference. It was discarded and the whole run redone from a reload with the cheap clock poll; all figures below come from the redo.

## Comparison with report 08: identical

| Figure | 08 | 09 |
| --- | --- | --- |
| After 30 steps | Day 2 06:00, quests 1/2, gold paid 591, production 125, deaths 2, raised 0, wiped 0 | same |
| 30 steps: heroes spent / Eamon Farrow | 310 / 1211 gp (+17/day, earned 308, spent 166) | same |
| 30 steps: pack text | Iron Daggers "5 basic", others "0 potions"; Day 2, 01:00 Iron Daggers buy 5 basic for 250 gp | same |
| 30 steps: town | 3 in town, 3 arrived, expired 0, items 0/0, raids 3/0 | same |
| 330 h | Day 14 18:00, quests 65/76, gold paid 36614, deaths 32, raised 5, wiped 2, production 5075 | same |
| Town | 7 in town, 16 arrived, heroes spent 30390, expired 16, items 3/1, raids 25/0 | same |
| Lairs | Vermithrax 3 (hoard 744), Raven 7 (828), Hellgate 1 (800) | same, with "bounty posted" on Vermithrax and Raven as in 08 |
| Eamon Farrow | 3937 gp (-3/day), rep 6, 6 done / 4 failed of 12, earned 11740 / spent 8872 | same |
| Other employers | Gideon 4659, Temple 4329, Drunken Dragon 976, Silent Court 856, Guild 808, Brakk 500, Osric 343, Piran 326, Cartographers 137, Delphine 130 | same |
| Potions held | 26 (Iron Daggers 6, Merry Pilgrims 9, Bold Hounds 11) | same (pack rows 6, 9, 11 basic; four packs "0 potions") |
| Log window | 400 children (399 events + 78 blocks), 46 Short rest lines, 13 purchases (62 potions, 3100 gp), 78 combat blocks, 8625 combat lines, 61 drinks, 19 "gives" | 400 children, 78 blocks, 9104 log lines, 46 Short rest lines, 13 purchases (62 potions, 3100 gp), 61 "drinks a basic healing potion", 19 "gives ... a basic healing potion"; combat text 8703 = 8625 + 78 block headers |
| Board | 7 open / 4 in progress, apothecary Contracts 1293 and 2055 gp | same |
| Difficulty page | "seed 42 · difficulty x1.5" | same ("seed 42 · difficulty ×1.5"); the first pause landed at Day 1, 02:00 because the game was already running, as noted in 08 for a separate pause call |

Potion lines: "drinks a basic healing potion (2d4+2: N)" and "gives X a basic healing potion (2d4+2: N)" read normally, no empty names or amounts. "catch their breath" does not occur in the Chronicle (0 lines); the Short rest lines read "The Iron Daggers take a Short rest (1 hour). <Name>: 3+2=5; 7/10 HP." as before. Only the basic tier occurs in this seed's 330 h, as in 07 and 08.

## Console

Errors-only read after the 30 steps, after the 330 h run and on the difficulty page: "No console logs". No "NaN", "undefined" or "[object Object]" in the Chronicle text with all 78 combat blocks open. Tabs and controls respond, the game progresses to the same end state.

## Result

PASS. Every figure at 30 steps and at 330 h is identical to report 08 (and so to 07 and 06), as expected from a refactor, a scripts-only change and a change that acts only with a non-default configuration.
