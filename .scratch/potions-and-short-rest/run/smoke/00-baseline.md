# Smoke baseline 00 (potions-and-short-rest run)

- Date: 2026-10-12
- Commit: 51dcc00 (branch feature/potions-healing). The tree also held untracked `scripts/tune-report.ts` and `test/tune.test.ts` from an implementer working on `scripts/tune.ts` at the same time; no game code changed.
- URL: http://localhost:5173/?seed=42&difficulty=1.15
- Tooling: built-in browser (`mcp__Claude_Browser__*`), `preview_start` with config `d20-town`.
- Nothing was changed on purpose yet: this is the reference for the potions / short-rest run.

## Procedure as run

1. `preview_start` `d20-town`; navigate to the URL; at once click the pause button (`⏸`) by JS. The game starts running at 1x on load; the clock still read Day 1, 00:00 after the click and stayed there over 3 s (so, unlike baseline 00 of architecture-flow, no stray 3 hours).
2. Read the Town and Board tabs at 00:00; click `step` 30 times (JS, 60 ms apart). Clock: Day 2, 06:00 (= 30 h, stable over 2 s). Read the four tabs and the log.
3. Click `16x`, poll the clock until 330 h elapsed, click `⏸`. It took 20 s of wall time; clock Day 14, 18:00 (exactly 330 h, stable). Read the four tabs, the log, the expanded combat lines, the console.
4. Navigate to `?seed=42&difficulty=1.5`, pause, read the header.
5. `preview_stop`.

## Initial state (Day 1, 00:00)

- Header: "d20 Town · Silvermere", quests 0/0, gold paid 0, deaths 0, raised 0, wiped 0. Controls: ⏸ (active after my click; 1x was active before), 1x, 2x, 4x, 16x, step. Footer "seed 42 · difficulty ×1.15 · permalink".
- Log: 15 entries at Day 1, 00:00 (welcome, 11 employer entries, 3 lair entries). Employer treasuries/upkeep (gp): Countess Osric Stirling 2437/48, Lady Piran Stirling 1759/66, The Drunken Dragon 1355/43, Gideon Farrow 1548/27, **Eamon Farrow (Apothecary) 1069/41** (holds Raven lumber camp 39 gp/day, Ember herb gardens 39 gp/day), Delphine Greycloak's Curiosities 1050/26, The Adventurers' Guild 698/34, Brakk Vane 1527/14, The Silent Court 1194/12, The Cartographers' Society 967/16, Temple of Bahamut 924/11.
- Lairs: Vermithrax (L6 Young Blue Dragon, Ember caverns, next raid 63h of 90, hoard 600 gp), Raven necropolis (L7 Wraith, black chapel, 40h of 90, hoard 700 gp), Hellgate of Kell (L8 Erinyes, sealed vault under Thistle tower, 31h of 90, hoard 800 gp). Strength 1, raids 0.
- Parties tab: "Parties (0)", "The tavern is empty. Someone will show up." Board: "Open contracts (0)", "In progress (0)". Town tab: 0 companies, 0 arrived, heroes spent 0 gp.
- Town tab employer order at start (by treasury): Osric, Piran, Gideon, Brakk, Drunken Dragon, Silent Court, Eamon (1069 gp, +37 gp/day, pays x1.23), Delphine, Cartographers, Temple, Guild. Apothecary has no "service" line in the UI beyond the employer card (treasury, +gp/day, reputation, pays multiplier, earned/spent); a ruined apothecary shows "RUINED" with a negative treasury (see Delphine below).

## After 30 steps (Day 2, 06:00)

- Counters: quests 0/2, gold paid 0, deaths 4, raised 0, wiped 0.
- Parties (2):
  - The Hollow Hounds: lvl 1, 28 gp, fighting at the silver mine (0/4), 0 done / 1 failed. Ysolde Ravenhurst Warlock 1 10/10 (2 kills), Delphine Longstride Wizard 1 8/8 (5), Freya Coldwater Paladin 1 12/12 (2), Aldric Goldleaf Ranger 1 12/12 (3). **0 potions**, renown 0, earned 11 / spent 3.
  - Company of the Silver Wolves: lvl 1, 20 gp, fighting at the salt mine (2/4), 0/0. Corvin Farrow Warlock 1 10/10, Tamsin Stormcaller Monk 1 10/10, Fenwick Farrow Druid 1 10/10, Vesna Starling Paladin 1 12/12. **0 potions**, earned 0 / spent 0.
  - All heroes at full HP; party card shows "N potions" in the footer row (format `0 potions · renown 0`, adds `· guild`, `· blessed`).
- Board (8 open, 2 in progress). In progress: "The miners at the silver mine have gone silent" (Osric, 498 gp + Warhammer +1, taken by The Hollow Hounds), "Goblinoids have overrun the salt mine" (Gideon Farrow, 596 gp, taken by Silver Wolves). Open: Barrow cemetery 168 gp, Frost lumber camp 421, Kell watchtower 245, shrine at Ember 227, Raven lumber camp (Eamon Farrow) 162, Barrow catacombs relic 129, Whisper quarry 487, Thornfield vineyards 802.
- Town: 2 companies in town, 3 arrived, heroes spent 12 gp, contracts expired 0, magic items 0/0, retired 0, raids/lairs broken 3/0. Raven necropolis raids 3 (0 unanswered), next 10h of 90; Vermithrax 33h; Hellgate 1h. Treasuries: Osric 2493 (+35/day), Piran 1812, Gideon 1557, Brakk 1530, Drunken Dragon 1391, Silent Court 1196, **Eamon Farrow 1086 gp (+17/day, 0 potions sold yet; earned 58 / spent 41)**, Delphine 1068, Cartographers 983, Temple 925, Guild 755.
- Chronicle (5 entries): Day 1 16:00 Ysolde Blackthorn (Bard 1) of Company of the Grim Shields dies at the Kell road; Day 1 09:00 Hollow Hounds' Piran Brightblade, Ivo Underhill, Aldric Oakenshield left for dead at Thornfield vineyards; then the 3 "Word spreads" entries.
- Log (95 lines at this point): Day 1, 11:00 Hollow Hounds carry their dead to the Temple (190 gp each, purse 20 gp); Day 2, 03:00 the three are laid to rest ("will not be coming back"); no potion purchases, no healing lines outside combat; no "short rest" text anywhere.

## After ~300 more hours at 16x (Day 14, 18:00, 330 h)

- Counters: **quests 62/82, gold paid 25838, deaths 59, raised 8, wiped 2**. Clock paused and stable.
- Town: 8 companies in town, 22 arrived so far, **heroes have spent 21111 gp**, contracts expired 15, magic items found/sold 6 / 0, retired 0, raids / lairs broken 24 / 0.
- Lairs: Vermithrax strength 3, raids 6 (2 unanswered), next 69h of 78, hoard 600 gp; Raven necropolis strength 7, raids 16 (6 unanswered), next 40h of 54, hoard 940 gp + Warhammer +1; Hellgate strength 2, raids 2 (1 unanswered), next 49h of 84, hoard 844 gp.
- Employers (treasury, per day, reputation, pays, done/failed of total, earned/spent):
  - The Drunken Dragon: 6595 gp, +27, rep 8, x1.27, 8/5 of 15, earned 8463 / spent 3223 (Corwyn vineyards overrun)
  - Temple of Bahamut: 5328 gp, +1, rep 3, x1.07, 3/0 of 5, 5496 / 1092; for sale Warhammer +1 900 gp
  - **Eamon Farrow (Apothecary): treasury 4361 gp, +17/day, rep 7, pays x1.23, 7 done / 1 failed of 11, earned 7315 / spent 4023** (Raven lumber camp under threat, Ember herb gardens safe). Not ruined. Grew from 1069 gp.
  - Gideon Farrow: 2819, +45, rep 3, 3/4 of 8, 4528 / 3257; for sale Chain Mail +1 3500 gp, Rapier +1 900 gp
  - Adventurers' Guild: 1870, +57, rep 5, x0.97, 5/1 of 7, 3569 / 2397
  - The Silent Court: 951, +2, rep 2, 2/0 of 5, 378 / 621
  - Lady Piran Stirling: 330, +56, rep 12, 12/4 of 17, 4008 / 5437
  - Countess Osric Stirling: 305, +39, rep 12, 12/4 of 18, 3515 / 5647
  - Brakk Vane: 207, +3, rep 6, 6/0 of 7, 1187 / 2507
  - The Cartographers' Society: 176, +6, rep 1, 1/0 of 7, 277 / 1068 (Ember watchtower overrun)
  - Delphine Greycloak's Curiosities: **-128 gp, RUINED**, rep 3, 3/1 of 6, 594 / 1772; for sale Rapier +1, Longsword +1 (900 gp each)
- Parties (8), with company gold, potions and hero HP (the card footer is `N potions · guild · renown R`):
  - The Hollow Hounds: lvl 4, **807 gp**, waiting for recruits (0h), 12 done / 4 failed, 4 of 5 listed heroes dead (Aldric Goldleaf Ranger 4, Elowen Frostbeard Monk 4, Maelis Nightriver Rogue 4, Vesna Quickfoot Druid 4), Rhoswen Ashvale Wizard 4 **26/26**, temple bill 3160 gp, **0 potions**, guild, renown 9, earned 6226 / spent 5439
  - Company of the Wandering Daggers: lvl 3, **1125 gp**, looking at the board, 6/2; Elowen Blackthorn Druid 3 24/24, Vesna Silverstring Paladin 4 36/36, Ivo Sable Bard 3 24/24, Maelis Blackthorn Monk 3 24/24, Piran Underhill Wizard 3 20/20; **1 potion**, guild, renown 10, earned 2555 / spent 1450
  - The Sundered Torches: lvl 4, **910 gp**, looking at the board, 7/1; Brenna Thornfield Cleric 4 31/31, Isolde Wyrmsbane Barbarian 4 41/41, Piran Nightriver Paladin 4 36/36, Sylvi Sable Paladin 4 36/36; **4 potions**, guild, renown 10, earned 4219 / spent 3349
  - The Restless Wanderers: lvl 4, **841 gp**, on the road to the Corwyn vineyards (1h), 6/0; Piran Kestrel Cleric 4 31/31, Ronan Ashvale Monk 4 31/31, Brenna Nightriver Barbarian 4 41/41, Piran Blackthorn Paladin 4 36/36, Torvald Stormcaller Bard 4 31/31; **5 potions**, guild, renown 10, earned 3001 / spent 2220
  - Order of the Lucky Lanterns: lvl 3, **932 gp**, resting at the inn (1h), 4/1; **Zephyrine Ravenhurst Bard 2 7/17, Fenwick Duskwarden Ranger 3 16/28** (hurt, resting), Ulric Farrow Ranger 3 28/28, Zephyrine Quickfoot Druid 3 24/24; **0 potions**, guild, renown 7, earned 2328 / spent 1416
  - The Restless Foxes: lvl 2, **322 gp**, on the road to the salt mine (2h), 4/0; Dagny Brightblade Druid 2 17/17, Nym Ravenhurst Bard 2 17/17, Ysolde Silverstring Cleric 2 17/17, Quill Starling Paladin 2 20/20; **4 potions**, guild, renown 7, earned 881 / spent 579
  - Order of the Sundered Wanderers: lvl 2, **336 gp**, looking at the board, 2/0; **Anselm Longstride Sorcerer 1 4/8**, Aldric Underhill Bard 2 17/17, Odalys Vane Paladin 2 20/20, Mira Thornfield Druid 2 17/17; **1 potion**, renown 2, earned 768 / spent 452
  - The Crimson Wanderers: lvl 1, **14 gp**, waiting for recruits (40h), 0/1; Thessaly Ashvale Rogue 1 dead, Yrsa Sable Fighter 1 dead, Brenna Farrow Druid 1 10/10, Dagny Farrow Warlock 1 10/10; temple bill 380 gp, **0 potions**, renown 0, earned 0 / spent 6
  - Potions held across companies: 0+1+4+5+0+4+1+0 = 15.
- Board: 7 open, 2 in progress. In progress: "Reopen the salt mine" (lvl 2, Piran, 268 gp, guild, taken by The Restless Foxes), "The cellars of the Corwyn vineyards are not empty" (lvl 4, Drunken Dragon, 768 gp, taken by The Restless Wanderers). Open: Kell watchtower bandits lvl 2 (297 gp), Barrow cemetery grave robbers lvl 1 (130), Frost lumber camp goblinoids lvl 5 (165), Raven lumber camp hunt lvl 1 (422), Ember watchtower lvl 3 (585), Reopen the silver mine lvl 3 (244 gp + Periapt of Wound Closure), Thistle hunting lodge lvl 2 (244).
- Chronicle: 97 lines; head: Day 14 08:00 Vesna Silverstring (4) level up; Day 14 08:00 Hollow Hounds' Aldric Goldleaf, Elowen Frostbeard, Maelis Nightriver, Vesna Quickfoot left for dead at the Thistle hunting lodge (Green Hag, 6x Dryad); Day 14 03:00 Sundered Wanderers pay 190 gp at the Temple, Anselm Longstride (Sorcerer 1) draws breath again; Lucky Lanterns pay 310 gp, Zephyrine Ravenhurst (Bard 2) draws breath again; Day 13 15:00 Zephyrine Ravenhurst dies at the Frost lumber camp (4x Giant Spider).
- Log window holds the last 499 lines (starts around Day 11). In it:
  - **11 potion purchases** from Eamon Farrow: Day 11 21:00 Hollow Hounds 2 for 130 gp; Day 12 02:00 Sundered Torches 4 for 220; Day 12 17:00 Restless Foxes 1 for 35; Day 12 21:00 Restless Wanderers 3 for 195; Day 13 03:00 Lucky Lanterns 4 for 220; Day 13 09:00 Hollow Hounds 1 for 65; Day 13 18:00 Restless Foxes 4 for 140; Day 13 23:00 Wandering Daggers 1 for 55; Day 14 02:00 Hollow Hounds 4 for 260; Day 14 03:00 Sundered Wanderers 1 for 45; Day 14 16:00 Sundered Torches 1 for 65. Unit price 35-65 gp (rises with level/party).
  - 28 "take rooms at The Drunken Dragon for N gp" lines (e.g. 12, 36, 48 gp); 15 "buy a round" lines; 5 "better armour" payments; 3 blessing lines; 8 "carry their dead to the Temple" lines.
  - Combat lines (84 collapsible blocks, 7692 lines in the window): 15 "drinks a healing potion", 99 "heals" (spell healing), 31 "revives ... with Healing Word". **No "short rest" text anywhere** in log or combat lines; the only rest is "resting at the inn (Nh)" on the party card.

## Difficulty check

`?seed=42&difficulty=1.5` shows "seed 42 · difficulty ×1.5 · permalink", permalink `?seed=42&difficulty=1.5`, clock Day 1, 00:00 after pausing. PASS.

## Console

Only vite debug lines ("[vite] connecting...", "[vite] connected."). Errors-only read: "No console logs". No "undefined", "NaN" or "[object Object]" seen in the aside tabs or log text.

## Notes for comparing later runs

- The world is deterministic for a given seed; the 30-step and 330 h figures should repeat exactly while no game code changes. Later runs that change potions, short rests or HP will move the party cards (potions, HP, company gold), the apothecary treasury (Eamon Farrow, 1069 gp at start, 1086 at 30 h, 4361 at 330 h), potion purchase lines, "heroes have spent", gold paid, deaths (59), raised (8) and wiped (2).
- Pause behavior: the game starts at 1x and runs on load; the clock was still 00:00 when pausing by JS right after navigation.
- Other untracked files in the tree at this moment (`scripts/tune-report.ts`, `test/tune.test.ts`) belong to the other implementer and do not affect the app.

## Result

PASS (baseline recorded, no console errors, no broken output)
