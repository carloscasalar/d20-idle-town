# Smoke 01 (potions-and-short-rest run, after issue 03: Hit Dice Short rest)

- Date: 2026-10-12
- Commit: fd64e31 (branch feature/potions-healing), tree clean.
- URL: http://localhost:5173/?seed=42&difficulty=1.15
- Tooling: built-in browser (`mcp__Claude_Browser__*`), `preview_start` with config `d20-town`.
- Changed on purpose since baseline 00 (commits 04d8b91, d970272): Short rest spends Hit Dice during its own hour instead of healing half of max HP; Hit Dice pool returns at the Long rest in town. New random draws, so the seeded trajectory is expected to differ.

## Procedure as run

1. `preview_start` `d20-town`; navigate to the URL; at once click `⏸` by JS. First attempt read Day 1, 01:00 after pausing (page ran one hour before the click); I re-navigated and paused again: clock Day 1, 00:00 and stable over 3 s. All figures below come from the second load.
2. At 00:00 read Town, Board, Parties; click `step` 30 times (JS, 60 ms apart). Clock Day 2, 06:00, stable. Read the four tabs and the log.
3. Click `16x`, poll the clock to 330 h, click `⏸`: 22 s of wall time, clock Day 14, 18:00 (exactly 330 h, stable over 4 s). Read the four tabs, the log, all 74 expanded combat blocks, the console.
4. Navigate to `?seed=42&difficulty=1.5`, pause, read the footer.
5. `preview_stop`.

## After 30 steps (Day 2, 06:00)

- Counters: quests 0/2, gold paid 0, deaths 4, raised 0, wiped 0 (same as baseline).
- Town tab figures identical to baseline: 2 in town, 3 arrived, heroes spent 12 gp, Osric treasury 2493 (+35), Eamon Farrow 1086 gp (+17/day, earned 58 / spent 41), Guild 755. Lairs identical (Raven next raid 10h, Vermithrax 33h, Hellgate 1h).
- Board: 7 open, 2 in progress, same two contracts as baseline (silver mine taken by The Hollow Hounds, salt mine taken by the second company).
- Parties (2) differ from baseline: The Hollow Hounds lvl 1, 28 gp, on the road to the silver mine (2h), 0/1, 4 heroes all at full HP, 0 potions, earned 14 / spent 6. The Broken Wolves (baseline name: Company of the Silver Wolves) lvl 1, 20 gp, fighting at the salt mine (1/4), Tamsin Stormcaller Paladin 1 at 4/12, 0 potions.
- Log: 70 lines; **5 Short rest lines** (baseline 0). Examples: "Day 1, 07:00 The Hollow Hounds take a Short rest (1 hour). Ivo Underhill: 2+2=4; 5/10 HP."; "Day 1, 15:00 Company of the Grim Shields take a Short rest (1 hour). Freya Coldwater: 8+2=10; 11/12 HP. ..."; "Day 2, 06:00 The Broken Wolves take a Short rest (1 hour). Tamsin Stormcaller: 1+2=3; 4/12 HP. Fenwick Farrow: 8+2=10; 10/10 HP." The rest line sits on its own hour between encounters (e.g. 07:00 rest, 08:00 next encounter).
- Observation: 2 of the 5 early rest lines carry no dice (Day 1, 09:00 and 17:00 "take a Short rest (1 hour)." alone), presumably because the level-1 Hit Dice were already spent in the previous rest. Plausible, not a defect, but a user sees an hour of rest with nothing happening.
- Chronicle and Board otherwise read normally.

## After ~300 more hours at 16x (Day 14, 18:00, 330 h)

- Counters: **quests 69/80, gold paid 38921, deaths 40, raised 7, wiped 2** (baseline 62/82, 25838, 59, 8, 2).
- Town tab: 7 companies in town, 16 arrived so far, **heroes have spent 31770 gp** (baseline 21111), contracts expired 17 (15), magic items found / sold 5 / 0 (6 / 0), retired 0, raids / lairs broken 25 / 0 (24 / 0).
- Lairs: Vermithrax strength 4, raids 8 (3 unanswered), next 63h of 72, hoard 1230 gp + Shield +1, bounty posted; Raven necropolis strength 7, raids 14 (6 unanswered), next 10h of 54, hoard 916 gp + Rapier +1, bounty posted; Hellgate strength 1, raids 3 (0 unanswered), next 61h of 90, hoard 800 gp.
- Employers (treasury, per day, rep, done/failed of total, earned/spent):
  - Temple of Bahamut: 5853 gp, -11, rep 2, 2/1 of 5, 6302 / 1373 (cemetery overrun)
  - Gideon Farrow: 5685, +45, rep 10, 10/1 of 11, 12520 / 8383
  - The Drunken Dragon: 4137, +43, rep 9, 9/3 of 14, 9553 / 6771
  - **Eamon Farrow (Apothecary): treasury 3410 gp, +17/day, rep 9, pays x1.23, 9 done / 0 failed of 12, earned 8482 / spent 6141** (baseline 4361). Not ruined.
  - Adventurers' Guild: 917, +23, rep 4, 4/1 of 10, 3577 / 3358
  - The Silent Court: 856, -12, rep 0, 0/0 of 5, 42 / 380 (Kell watchtower overrun)
  - Delphine Greycloak's Curiosities: 414, +8, rep 6, 6/1 of 9, 2870 / 3506 (not ruined; baseline was RUINED at -128); for sale Ring of Protection 3800 gp
  - Lady Piran Stirling: 300, +35, rep 11, 11/2 of 16, 3711 / 5170
  - Brakk Vane: 201, +3, rep 5, 5/0 of 6, 1101 / 2427
  - Countess Osric Stirling: 193, +69, rep 11, 11/2 of 14, 3371 / 5615
  - The Cartographers' Society: 167, +16, rep 2, 2/0 of 7, 479 / 1279
- Parties (7) with company gold, potions, HP:
  - The Hollow Hounds: lvl 4, 1247 gp, resting at the inn (5h), 11/2; Ysolde Ravenhurst Warlock 4 31/31, Ysolde Blackthorn Bard 4 31/31, Tamsin Stormcaller Paladin 4 36/36, Fenwick Farrow Warlock 4 31/31, Delphine Oakenshield Monk 4 31/31; 3 potions, guild, renown 10, earned 6332 / spent 5105
  - Company of the Sundered Hounds: lvl 5, 950 gp, returning (2h), 11/1; Nym Redmoor Monk 5, Piran Sable Paladin 5, Soren Longstride Wizard 5, Fenwick Starling Cleric 5 all dead, Ysolde Nightriver Rogue 5 20/38; temple bill 4600 gp, 0 potions, guild, renown 9, earned 9418 / spent 8488
  - Order of the Gilded Daggers: lvl 4, 800 gp, on the road to the Kell archives (1h), 10/0; four heroes at full HP (30/30, 31/31 x3); 3 potions, renown 10, earned 4372 / spent 3592
  - The Bold Foxes: lvl 4, 1011 gp, returning (2h), 8/1; five heroes at full HP; 3 potions, guild, renown 10, earned 5464 / spent 4473
  - The Iron Blades: lvl 4, 2392 gp, resting at the inn (3h), 9/0; Nym Sable Bard 4 16/31, Elowen Blackthorn Barbarian 4 24/41, Jorunn Redmoor Wizard 4 1/26, Vidar Ravenhurst Ranger 4 14/36; 0 potions, guild, renown 10, earned 5503 / spent 3151, stash Shield +1, Boots of Striding
  - Company of the Iron Foxes: lvl 2, 315 gp, fighting at the salt mine (0/3), 4/1; five heroes at full HP; 2 potions, guild, renown 7, earned 1004 / spent 709
  - Company of the Hollow Banners: lvl 2, 364 gp, resting at the inn (2h), 2/0; Maelis Starling Cleric 2 7/17, Piran Hollowmere Rogue 2 17/17, Corvin Duskwarden Barbarian 1 dead, Garrick Thornfield Warlock 2 1/17; temple bill 190 gp, 0 potions, renown 3, earned 531 / spent 187
  - Potions held across companies: 3+0+3+3+0+2+0 = 11 (baseline 15).
  - New on the card vs the baseline text: hero names show "AC+N" suffixes and item names (e.g. "Boots of Striding"); these may have existed in the baseline UI and were not captured, no sign of a defect.
- Board: 8 open, 4 in progress. In progress: Ember shrine cultists (lvl 4, taken by The Bold Foxes), man-eater near Thistle hunting lodge (lvl 5 raid, taken by Sundered Hounds), Reopen the salt mine (Iron Foxes), Kell archives tomes (Gilded Daggers). Open includes two lair assaults (Ember caverns 900 gp + Cloak of Protection; Raven necropolis 1050 gp + Ring of Protection) plus six local contracts (Corwyn vineyards 2393 gp, Ember herb gardens 1573 gp, Kell watchtower 694, Ember road 431, Thistle quarry 324, Frost lumber camp 160).
- Chronicle: reads normally (65 KB of text on the tab including the log).
- Log window holds the last 491 lines (starts around Day 10). In it:
  - **41 Short rest lines, all with Hit Dice rolls** (format `Name: d+CON=heal[, d+CON=heal]; HP/MAX HP`), e.g. "Day 12, 11:00 The Iron Blades take a Short rest (1 hour). Nym Sable: 7+2=9; 24/24 HP. ... Jorunn Redmoor: 1+2=3; 17/20 HP."; last one "Day 14, 17:00 Company of the Sundered Hounds take a Short rest (1 hour). Piran Sable: 4+2=6, 5+2=7; 24/44 HP. Fenwick Starling: 1+2=3, 4+2=6; 10/38 HP. Ysolde Nightriver: 8+2=10; 38/38 HP." (those two heroes are dead on the card at the same hour's end, i.e. the company then fought again.)
  - 14 potion purchase lines from Eamon Farrow (baseline 11), unit price 35-65 gp, e.g. "Day 12, 13:00 Company of the Iron Foxes buy 5 healing potions ... for 175 gp".
  - New potion line: "Day 13, 00:00 Company of the Iron Foxes catch their breath. 1 potion drunk; 3 left." and "Day 13, 02:00 ... 1 potion drunk; 1 left." (2 in window): potions drunk outside combat after the turn-back decision works.
  - 21 "take rooms" lines, 21 "buy a round", 4 "carry their dead to the Temple".
  - No "Hit Dice" wording appears anywhere in the UI text; the dice show only as `d+2=N` inside the Short rest line.
  - Combat blocks: 74, 7162 lines (baseline 84 and 7692). In them: 40 "drinks a healing potion" (baseline 15), 99 "heals" (99), 20 "Healing Word" lines, 29 "revives" (31).

## Comparison with baseline and explanation

- Trajectory diverges after the first few encounters (different hero names and rosters from 30 steps), explained by the new Hit Dice draws shifting the seeded random order. The Town-tab economy and the contracts at 30 steps are identical, the divergence is in party rosters.
- Quests 69/80 vs 62/82, deaths 40 vs 59 (about 32% lower), raised 7 vs 8, wiped 2 vs 2, gold paid 38921 vs 25838 (+50%). Same order of magnitude; deaths are not several times lower. Direction is plausible: heroes now rest and use potions between encounters, so they fight healthier, finish more quests and spend more (heroes spent 31770 vs 21111). Not a defect, but worth the tuning review the PRD already schedules.
- Potions drunk in combat 40 vs 15 and held at the end 11 vs 15, consistent with the new post-rest potion step.
- Short rest lines appear as expected (baseline had none).

## Difficulty check

`?seed=42&difficulty=1.5` shows "seed 42 · difficulty ×1.5 · permalink", permalink `?seed=42&difficulty=1.5`, clock Day 1, 00:00 after pausing. PASS.

## Console

Errors-only read: "No console logs". Full read: vite debug "connecting/connected" lines and one "[vite] server connection lost. Polling for restart..." followed by a reconnect (dev-server hiccup during the session, not an app error; the tree had no changes). No "undefined", "NaN" or "[object Object]" in any tab, the log or the 7162 expanded combat lines.

## Notes for comparing later runs

- Seed 42 / ×1.15 reference figures at 30 steps: quests 0/2, deaths 4, 5 Short rest lines; at 330 h: quests 69/80, gold paid 38921, deaths 40, raised 7, wiped 2, heroes spent 31770, potions held 11, Eamon Farrow 3410 gp, 41 Short rest lines in the log window, 14 potion purchases, 40 potions drunk in combat.
- Pause quirk: if the click comes late the clock shows Day 1, 01:00; re-navigate and pause again to get a clean 00:00.
- Combat lines are `<details><summary>N combat lines</summary><pre>` blocks; read them from the `details pre` elements (clicking a summary toggles it, so do not click twice).

## Result

PASS (no console errors, no broken output, game progresses; differences from the baseline are explained by the new Hit Dice draws).
