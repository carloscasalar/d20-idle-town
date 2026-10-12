# Smoke 02 (potions-and-short-rest run, after issue 04: four healing potion tiers)

- Date: 2026-10-12
- Commit: f756121 (branch feature/potions-healing), tree clean.
- URL: http://localhost:5173/?seed=42&difficulty=1.15
- Tooling: built-in browser (`mcp__Claude_Browser__*`), `preview_start` with config `d20-town`.
- Changed on purpose since report 01 (commits 2b1c3fc, b9e3260, 59530a0): single healing potion became four tiers (basic 2d4+2, greater 4d4+4, superior 8d4+8, supreme 10d4+20) rolled with real dice; a pack is a count per tier shown as text; companies buy only basic, up to one per living hero, 50 gp each; drink lines name the potion and its roll; heroes start with 50 gp per level (was 20). New random draws, so the seeded trajectory is expected to differ.

## Procedure as run

1. `preview_start` `d20-town`; navigate to the URL; click the pause button by JS at once. Clock Day 1, 00:00 and stable over 3 s (first try, no re-navigation needed).
2. Read Parties, Board, Town, Chronicle at 00:00 (empty, "The tavern is empty"); click `step` 30 times by JS (60 ms apart): clock Day 2, 06:00. Read the four tabs and the header counters.
3. Click `16x`, poll the clock every 100 ms to 330 h, click pause: the clock stopped at Day 14, 19:00 (331 h, one hour over the target because of the polling interval; stable over 3 s; 21 s wall time). Read the four tabs, the log, all 73 expanded combat blocks (`details pre`), the console.
4. Navigate to `?seed=42&difficulty=1.5`, pause, read the footer.
5. `preview_stop`.

## After 30 steps (Day 2, 06:00)

- Counters: quests 0/2, gold paid 0, deaths 4, raised 0, wiped 0 (same as report 01).
- Town tab: 2 in town, 3 arrived, heroes spent 12 gp, Osric treasury 2493 (+35), Eamon Farrow 1086 gp (+17/day, earned 58 / spent 41), Guild 755: identical to report 01. Lairs identical (Raven next raid 10h, Vermithrax 33h, Hellgate 1h). Board: 7 open, 2 in progress, same contracts.
- Parties (2): The Hollow Hounds lvl 1, **88 gp**, on the road to the silver mine (2h), 0/1, Piran Brightblade Druid 10/10, Ysolde Ravenhurst Warlock 10/10, Freya Coldwater Paladin 12/12, Ysolde Blackthorn Bard 10/10; **"0 potions"** · renown 0; earned 44 / spent 6. The Broken Wolves lvl 1, **50 gp**, fighting at the salt mine (1/4), Tamsin Stormcaller Paladin 4/12, others 10/10; **"0 potions"**; earned 0 / spent 0. (Report 01 had 28 gp and 20 gp: consistent with 50 gp per level start.)
- Log: 5 Short rest lines (same count as report 01); 3 of them with Hit Dice rolls, 2 with nothing after "(1 hour)." as before.

## After ~330 more hours at 16x (Day 14, 19:00, 331 h)

- Counters: **quests 64/82, gold paid 34152, deaths 57, raised 8, wiped 3** (report 01: 69/80, 38921, 40, 7, 2; baseline 00: 62/82, 25838, 59, 8, 2).
- Town tab: 8 companies in town, 20 arrived so far, **heroes have spent 29206 gp** (01: 31770), contracts expired 16 (17), magic items found / sold 3 / 0 (5 / 0), retired 0, raids / lairs broken 24 / 0 (25 / 0).
- Lairs: Vermithrax strength 5, raids 4 (4 unanswered), next 56h of 66, hoard 600 gp, bounty posted; Raven strength 6, raids 15 (5 unanswered), next 45h of 60, hoard 824 gp, bounty posted; Hellgate strength 4, raids 5 (3 unanswered), next 36h of 72, hoard 976 gp.
- Employers (treasury, per day, rep, done/failed of total, earned/spent):
  - Temple of Bahamut: 6914 gp, -11, rep 1, 1/1 of 5, 6628 / 638
  - The Drunken Dragon: 5326, +24, rep 10, 10/3 of 14, 9714 / 5743
  - Gideon Farrow: 3822, +9, rep 7, 7/5 of 12, 9320 / 7046
  - **Eamon Farrow (Apothecary): treasury 3792 gp, +17/day, rep 5, pays x1.23, 5 done / 3 failed of 10, earned 7397 / spent 4674** (01: 3410 gp, 8482 earned). Receives gold, not ruined.
  - Delphine Greycloak's Curiosities: 1468, -18, rep 1, 1/2 of 10, 2090 / 1672
  - Lady Piran Stirling: 333, +81, rep 12, 12/1 of 13, 3911 / 5337
  - Countess Osric Stirling: 274, +56, rep 12, 12/2 of 15, 3561 / 5724
  - The Silent Court: 274, +16, rep 1, 1/0 of 5, 154 / 1074
  - Adventurers' Guild: 227, +45, rep 4, 4/0 of 8, 3017 / 3488
  - Brakk Vane: 205, +21, rep 6, 6/0 of 7, 1169 / 2491
  - Cartographers' Society: 204, +16, rep 5, 5/1 of 8, 870 / 1633
- Parties (8) with company gold, pack text, status:
  - The Hollow Hounds: lvl 5, 1159 gp, looking at the board, 11/2; five heroes all at full HP (38/38 x4, Paladin 44/44); **"5 basic"**, guild, renown 10, earned 8233 / spent 7124
  - Company of the Sundered Hounds: lvl 5, 1064 gp, waiting for recruits (29h), 11/1; two dead (Monk, Wizard), two at full; temple bill 2300 gp; **"0 potions"**
  - Order of the Iron Hounds: lvl 4, 798 gp, on the road to the Kell archives (2h), 10/1; five alive at full HP, Druid 3 dead; temple bill 510; **"5 basic"**, blessed, guild
  - Company of the Merry Banners: lvl 5, 922 gp, looking at the board, 10/0; four at full HP; **"3 basic"**, renown 10
  - The Crimson Wolves: lvl 3, 619 gp, fighting at the Kell road (0/5), 6/2; five at full HP; **"5 basic"**, guild
  - Order of the Sundered Lanterns: lvl 3, 501 gp, waiting for recruits (71h), 4/1; two dead; temple bill 1020; **"0 potions"**
  - Fellowship of the Broken Pilgrims: lvl 4, 780 gp, waiting for recruits (20h), 2/1; three dead; temple bill 2370; **"0 potions"**
  - The Gilded Ravens: lvl 2, 246 gp, resting at the inn (1h), 2/1; two dead; temple bill 620; **"0 potions"**
  - Pack text seen: "N basic" (counts 3 and 5) and "0 potions" for an empty pack. No "[object Object]", "undefined", JSON or NaN. Greater/superior/supreme never appear, as expected in this slice. Potions held across companies: 5+0+5+3+5+0+0+0 = 18 (01: 11; baseline 15).
  - Observation: companies with a temple bill and no potions are the ones with dead heroes; companies with full HP all hold the maximum of one potion per living hero (5 heroes, 5 basic).
- Board: 7 open, 2 in progress (Kell road convoy taken by The Crimson Wolves, Kell archives cultists taken by Order of the Iron Hounds). Open includes a lair assault on the roost of Vermithrax (900 gp + Warhammer +1), a Cultists contract at the Ember herb gardens, the Barrow cemetery raid, and four more. Reads normally.
- Chronicle: reads normally (66 KB of text). Log window about 480 lines plus the 15 pinned Day 1 introductory lines (495 matches of the line pattern). In it:
  - 40 Short rest lines, all with Hit Dice rolls (01: 41), e.g. "Day 14, 07:00 The Gilded Ravens take a Short rest (1 hour). Kael Vane: 3+2=5; 14/17 HP. ...".
  - **11 potion purchase lines from Eamon Farrow** (01: 14), all "buy N basic healing potion(s) ... for N*50 gp" (unit price now a flat 50), e.g. "Day 11, 08:00 Order of the Iron Hounds buy 5 basic healing potions from Eamon Farrow for 250 gp." and "Day 11, 18:00 The Crimson Wolves buy 1 basic healing potion from Eamon Farrow for 50 gp." Singular/plural reads correctly.
  - 1 post-rest drink line: "Day 11, 04:00 The Crimson Wolves catch their breath. Ivo Thornfield drinks a basic healing potion (2d4+2: 6). 4 basic left." (01 had 2 in window, in the old "1 potion drunk; 3 left" wording; the "left" count now names the tier.)
  - 26 "take rooms", 20 "buy a round", 10 "carry their dead to the Temple".
  - Combat blocks: 73, 6623 lines (01: 74 and 7162). In them: **24 "drinks a ... healing potion" lines (01: 40), all in the form "X drinks a basic healing potion (2d4+2: N)."**, rolls 7 to 10 seen in samples (within 4-10 for 2d4+2); 104 "heals" (99), 17 "Healing Word" (20), 21 "revives" (29). No drink line lacks the formula or the number.

## Comparison with report 01 and explanation

- First 30 steps: the same counters and Town figures as report 01 (gold at 88 / 50 differs, as expected from 50 gp per level start); the trajectory diverges later through the new dice (potion rolls shift the random order) and the new starting gold.
- 330 h: quests 64/82 vs 69/80, deaths 57 vs 40 (up about 40%, back to the baseline 59), raised 8 vs 7, wiped 3 vs 2, gold paid 34152 vs 38921 (-12%), heroes spent 29206 vs 31770. Same order of magnitude as both earlier reports; nothing several times higher or lower. Deaths move back toward the baseline: plausibly because the basic potion is now bought at 50 gp (up to one per hero) and heals 2d4+2 (about 7) rather than the old potion, and combat potion use is 24 against 40. Worth the PRD's scheduled tuning review, not a defect. One seed, one run, so it may also be noise.
- Eamon Farrow still receives gold from sales (earned 7397, treasury 3792).
- Pack text: sensible for every card. An empty pack reads "0 potions" (not blank).

## Difficulty check

`?seed=42&difficulty=1.5` shows "seed 42 · difficulty ×1.5", permalink `?seed=42&difficulty=1.5`, clock Day 1, 00:00 after pausing. PASS.

## Console

Errors-only read: "No console logs". No "undefined", "NaN", "[object Object]" or raw JSON in any tab, the log, or the 6623 expanded combat lines.

## Notes for comparing later runs

- Seed 42 / x1.15 reference figures at 30 steps: quests 0/2, deaths 4, 5 Short rest lines, Hollow Hounds 88 gp, Broken Wolves 50 gp; at 331 h (Day 14, 19:00): quests 64/82, gold paid 34152, deaths 57, raised 8, wiped 3, heroes spent 29206, potions held 18 (all basic), Eamon Farrow 3792 gp, 40 Short rest lines, 11 potion purchases, 24 potions drunk in combat, 1 post-rest drink, 8 companies, 20 arrived.
- The clock after the 16x poll stops one hour past 330 when polled every 100 ms (331 h); poll more tightly if the exact 330 h is needed.
- Combat lines are `<details><summary>N combat lines</summary><pre>` blocks; read them from the `details pre` elements.
- `main` innerText on every tab includes the log; slice after the last "Chronicle" tab label to read only the tab body.

## Result

PASS (no console errors, no broken output, game progresses; pack text and drink lines read as intended; differences from report 01 are explained by the new potion dice, prices and starting gold).
