# Smoke 03 (potions-and-short-rest run, after issue 05: buying policy)

- Date: 2026-10-12
- Commit: fb39038 (branch feature/potions-healing), tree clean.
- URL: http://localhost:5173/?seed=42&difficulty=1.15
- Tooling: built-in browser (`mcp__Claude_Browser__*`), `preview_start` with config `d20-town`.
- Changed on purpose since report 02 (commits e80c126, 3952642): the buying rule. A visiting company restocks until the assured healing of its pack covers half of each living hero's maximum HP, with at least one potion per living hero; one tier per visit (one purchase, one log line); the tier is the highest whose assured healing is at most half the average need, stepping down if the purse minus the resurrection reserve cannot pay. Assured healing here is count*(faces/2+1)+bonus: basic 8, greater 16, superior 32, supreme 50. Basic is the pick while the average need is below 32 (max HP below about 64); greater needs max HP of about 64 or more (level 8-9 and up). Trajectory expected to differ.

## Procedure as run

1. `preview_start` `d20-town`; navigate to the URL; click the pause button by JS. The first attempt (separate navigate and JS calls) paused at Day 1, 02:00 because of page-load latency, so I re-navigated and paused in the same batch as the navigation: clock Day 1, 00:00, stable over 3 s.
2. Read the four tabs at 00:00; click `step` 30 times by JS (60 ms apart): clock Day 2, 06:00. Read Parties, Board, Town, Chronicle and the header counters.
3. Click `16x`, poll the clock every 15 ms until 330 h, click pause: clock Day 14, 18:00, exactly 330 h, stable over 3 s (21 s wall time). (Report 02 stopped at 331 h because of 100 ms polling, so the two end points are one hour apart; trajectories differ anyway.) Read the four tabs, the log, all 78 combat blocks (`details pre`), the console.
4. Navigate to `?seed=42&difficulty=1.5`, pause, read the footer.
5. `preview_stop`.

## After 30 steps (Day 2, 06:00)

Identical to report 02 in every figure: quests 0/2, gold paid 0, deaths 4, raised 0, wiped 0; Town: 2 in town, 3 arrived, heroes spent 12 gp, Osric treasury 2493 (+35), Eamon Farrow 1086 gp (+17/day, earned 58 / spent 41), Guild 755, lairs next raid 33h / 10h / 1h, raids 3; Board 7 open / 2 in progress; Parties The Hollow Hounds lvl 1, 88 gp, "0 potions"; The Broken Wolves lvl 1, 50 gp, "0 potions"; 5 Short rest lines. No purchase happens in the first 30 hours, so the new rule is not yet visible.

## After 330 h at 16x (Day 14, 18:00)

- Counters: **quests 62/81, gold paid 32249, deaths 60, raised 7, wiped 5** (02: 64/82, 34152, 57, 8, 3; 01: 69/80, 38921, 40, 7, 2).
- Town tab: 8 companies in town, 23 arrived so far (02: 20), heroes have spent 27016 gp (29206), contracts expired 15 (16), magic items found / sold 2 / 0 (3 / 0), retired 0, raids / lairs broken 29 / 0 (24 / 0).
- Lairs: Vermithrax strength 5, raids 10 (4 unanswered), next 33h of 66, hoard 1160, bounty posted; Raven strength 8, raids 16 (7 unanswered), next 22h of 48, hoard 1203, bounty posted; Hellgate strength 3, raids 3 (2 unanswered), next 49h of 78, hoard 908.
- Employers (treasury, per day, rep, done/failed of total, earned/spent):
  - **Eamon Farrow (Apothecary): treasury 7167 gp, +17/day, rep 9, pays x1.23, 9 done / 0 failed of 11, earned 11959 / spent 5861** (02: 3792 gp, 7397 earned, 4674 spent). Receives gold, nowhere near ruined.
  - Gideon Farrow: 5358, +9, rep 5, 5/5 of 11, 8420 / 4610
  - Temple of Bahamut: 3057, +1, rep 3, 3/1 of 6, 3430 / 1297
  - The Drunken Dragon: 2975, +24, rep 8, 8/4 of 14, 8370 / 6750
  - Delphine Greycloak's Curiosities: 1013, +0, rep 5, 5/1 of 10, 1780 / 1817
  - The Silent Court: 856, -12, rep 0, 0/0 of 5, 42 / 380
  - Adventurers' Guild: 760, +11, rep 4, 4/2 of 10, 2873 / 2811
  - Countess Osric Stirling: 304, +86, rep 12, 12/2 of 14, 3715 / 5848
  - Cartographers' Society: 233, -6, rep 2, 2/0 of 7, 545 / 1279
  - Brakk Vane: 191, +3, rep 6, 6/0 of 7, 1169 / 2505
  - Lady Piran Stirling: 152, +26, rep 8, 8/4 of 15, 2856 / 4463
  - No negative treasury.
- Parties (8), company gold, pack text, status (gold never negative; all positive):
  - Company of the Sundered Hounds: lvl 5, 1151 gp, fighting at the Ember road (1/4), 12/0, 4 heroes (HP 38, 44, 32, 38 max), **"10 basic"**, guild, renown 10
  - The Bold Daggers: lvl 4, 813 gp, short rest at the Barrow catacombs, 9/0, 4 heroes, **"9 basic"**, renown 10
  - Fellowship of the Grim Blades: lvl 4, 806 gp, short rest at the Ember herb gardens, 9/1, 5 heroes, **"10 basic"**, blessed, guild, renown 10
  - The Lucky Shields: lvl 3, 525 gp, fighting at the Frost lumber camp (3/5), 3/4, 5 heroes, **"0 potions"** (see below), guild, renown 4
  - Company of the Iron Torches: lvl 4, 1065 gp, resting at the inn, 10/0, 4 heroes, **"7 basic"**, guild, renown 10
  - Fellowship of the Lucky Wolves: lvl 3, 574 gp, fighting at the salt mine (2/3), 6/1, 5 heroes, **"8 basic"**, guild, renown 10
  - Company of the Bold Pilgrims: lvl 4, 666 gp, returning, 5/0, 3 alive of 4, temple bill 790, **"1 basic"**, guild, renown 9
  - The Hollow Oaths: lvl 1, 186 gp, waiting for recruits (8h), 1/1, 2 alive of 4, temple bill 380, **"0 potions"**, renown 1
  - Pack text seen: "N basic" (1, 7, 8, 9, 10, 10) and "0 potions". **No "greater", "superior" or "supreme" anywhere** (cards, log, combat). Potions held across companies: 10+9+10+0+7+8+1+0 = **45** (02: 18). Highest company level is 5.
  - Explanation of no higher tier: greater (assured 16) needs an average need above 32, i.e. max HP of about 64, a level 8-9 hero; no company here is above level 5 (max HP 23-44). Counts match the rule: Sundered Hounds need (19+22+16+19)=76 / 8 = 9.5, so 10; Lucky Shields (before fighting) 70 / 8 = 8.75, so 9, bought exactly 9.
  - Company with temple bill and no potions: The Hollow Oaths (186 gp, 2 dead, bill 380: purse below the resurrection reserve, so nothing to spend). The Lucky Shields' 0 is real: bought 9 at Day 14 05:00, drank 1 after the first rest ("5 basic left"), the rest in combat (3 in fight 1, rest in fights 2-3).
- Board: 8 open, 6 in progress. Reads normally (lair assault on the roost of Vermithrax 523 gp + Rapier +1 with hoard 1160; Kell road bandits 1524 gp; others). No empty panels.
- Chronicle: reads normally (66 KB, 585 lines in window). In it:
  - 44 Short rest lines (43 with Hit Dice rolls; 02: 40 all with rolls). The one without is a rest with nothing to roll, as in earlier reports.
  - **15 potion purchase lines from Eamon Farrow** (02: 11), all basic, all one tier and one count, singular/plural correct, price always count x 50: Day 12 05:00 Sundered Hounds 4 for 200; 07:00 Grim Blades 10 for 500; 09:00 Iron Torches 1 for 50; 12:00 Lucky Wolves 5 for 250; 14:00 Bold Pilgrims 1 for 50; 17:00 Bold Daggers 2 for 100; Day 13 06:00 Sundered Hounds 7 for 350; 08:00 Lucky Wolves 8 for 400; 10:00 Grim Blades 4 for 200; 12:00 Bold Daggers 2 for 100; 12:00 Bold Pilgrims 4 for 200; Day 14 04:00 Iron Torches 9 for 450; 05:00 Lucky Shields 9 for 450; 08:00 Lucky Wolves 1 for 50; 09:00 Sundered Hounds 4 for 200. Total 3550 gp for 71 potions. Largest single purchase 10 potions.
  - 1 post-rest drink line: "Day 14, 14:00 The Lucky Shields catch their breath. Ivo Silverstring drinks a basic healing potion (2d4+2: 5). 5 basic left."
  - 22 "take rooms", 16 "buy a round", 1 "carry their dead to the Temple".
  - Combat blocks: 78, 6743 lines (02: 73, 6623). **48 "drinks a basic healing potion" lines (02: 24)**, in 27 blocks, all with the formula and a number; 76 "heals" (104), 12 "Healing Word" (17), 23 "revives" (21). All drinks are basic.

## Comparison with report 02 and explanation

- 30 steps: identical (no purchases yet).
- 330 h: quests 62/81 vs 64/82, deaths 60 vs 57, raised 7 vs 8, wiped 5 vs 3, gold paid 32249 vs 34152 (-5%), heroes spent 27016 vs 29206. Same order of magnitude as 01 and 02. Deaths and failed quests are not several times higher or lower. Wipes 5 vs 3 is within one-seed noise.
- Purchases: 15 vs 11 purchase lines, 71 potions bought in the window vs about 40; packs hold 45 vs 18 potions; combat drinks doubled (48 vs 24). This is the intended effect of buying to half of max HP, not one per hero. Packs are bigger than one per living hero (9 to 10 for 4 to 5 heroes).
- Not exercised: any tier above basic. Supreme was expected never to be bought and was not. Greater not reached because company level tops out at 5 in 330 h. A longer run (or a higher-level seed) would be needed to see "N basic, M greater" on a card; the multi-tier pack text is therefore unverified in the UI.
- Apothecary treasury roughly doubled (3792 to 7167 gp, earned 11959 vs 7397), consistent with the larger sales. Not ruined.

## Difficulty check

`?seed=42&difficulty=1.5` shows "seed 42 · difficulty ×1.5", permalink `?seed=42&difficulty=1.5`, clock Day 1, 00:00 after pausing. PASS.

## Console

Errors-only read: "No console logs". No "undefined", "NaN", "[object Object]" in any tab, the 585 log lines or the 6743 combat lines (scan returned nothing).

## Notes for comparing later runs

- Seed 42 / x1.15 reference figures at 30 steps: unchanged from report 02. At 330 h exactly (Day 14, 18:00; this report polled at 15 ms): quests 62/81, gold paid 32249, deaths 60, raised 7, wiped 5, heroes spent 27016, potions held 45 (all basic), Eamon Farrow 7167 gp (earned 11959 / spent 5861), 44 Short rest lines, 15 purchases (71 potions, 3550 gp), 48 potions drunk in combat, 1 post-rest drink, 8 companies, 23 arrived.
- Poll the clock at 15 ms to stop at exactly 330 h; pause immediately in the same batch as the navigation to start at 00:00 (a separate call lands at 02:00).
- Tab text: slice after the last "Chronicle\n" in `document.body.innerText`; buttons are found by text; the Chronicle log lines are in `document.body.innerText` lines; combat lines come from `details pre`.

## Result

PASS (no console errors, no broken output, game progresses, purchase lines read sensibly, company gold never negative, apothecary treasury healthy; differences from report 02 are explained by the new buying rule). One gap: no tier above basic occurred in this run, so the multi-tier pack text is untested here.
