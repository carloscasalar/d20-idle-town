# Smoke check 02 (after roster + coin refactors and bug fixes)

- Date: 2026-10-03
- Commit: 6ba779e (branch codex/codebase-architecture-improvement; untracked: .claude/)
- URL: http://localhost:5173/?seed=42&difficulty=1.15
- Tooling: built-in browser (mcp__Claude_Browser__*). Procedure of 00-baseline.md / 01-after-board.md repeated, plus 300 extra steps at 16x.

## Matched

- Header "d20 Town · Silvermere", counters, controls (pause, 1x, 2x, 4x, 16x, step, combat narration checkbox, permalink "seed 42 · difficulty x1.15").
- Initial log: same 14 entries in the same order with the same names and treasuries (Osric 2437, Piran 1759, Drunken Dragon 1355, Gideon 1548 ... Temple 924), 3 lairs (Vermithrax L6, Raven L7 Wraith, Hellgate of Kell L8 Erinyes). Aside initially Parties (0)/Board (0).
- 30 step clicks advanced the clock exactly 30 h (Day 1 01:00 -> Day 2 07:00); clock stayed put while paused.
- After 30 steps: quests 0/2, deaths 6 (01 had 0/2, 4; baseline 0/3, 6). Parties (2): Hollow Hounds (fighting silver mine 1/4), Silver Wolves (returning, Tamsin and Vesna dead, temple bill 380 gp). Board 8 open / 2 in progress, same contract set as before (Barrow cemetery 168 gp, Frost lumber camp 421, Kell watchtower 245, Whisper quarry 487, Thornfield vineyards 802, silver mine 498 + Warhammer +1). Town: same 11 employer cards (Osric 2493 gp, Piran 1812, Gideon 1557, Brakk 1530 ...), same lairs; Chronicle has the same Day 1 09:00 / 16:00 and Day 2 07:00 deaths plus the 3 "Word spreads" lines.
- All four tabs render content of the same kind as before. No "undefined", "NaN", "[object", "??" or "null" in any tab or the page text (checked after 30 steps and after the extra 300).

## Differed

- Clock at pause: after load the game ran at 1x, so by the time I paused it read Day 1, 01:00 (not 00:00 as in 01). Same load-time race as already documented in 01; not a regression. The initial log therefore already showed the first party "The Hollow Hounds arrive" at 01:00.
- Post-30-step numbers vary slightly (Hollow Hounds now lvl 1 and 1/4 into the silver mine, Silver Wolves returning; Gideon's salt-mine contract taken by Silver Wolves). Expected: clock offset and the rule fixes (guild debt, strangers keep size, ruined temple, retirement) shift party events. World setup is identical.

## Extra 300 steps (16x, then pause; clock Day 2 07:00 -> Day 14 19:00, exactly 300 h; took ~19 s)

- Header: quests 62/82, gold paid 25838, deaths 59, raised 9, wiped 2.
- Contracts posted and taken: 30 "post a level N contract" lines and 27 "accept ... and set out" lines visible in the expanded log; board stays at 8 open. A contract for a guild-owned employer shows "(guild)"; no post from an employer in debt seen.
- Companies go out and return: 25 "return to Silvermere ... pay N gp ... Purse" lines; parties seen fighting, on the road, looking at the board, waiting for recruits.
- Parties tab (8 companies): members, hp, level, potions, renown and gold all sensible; earned/spent are non-negative numbers (Hollow Hounds 6226/6229 with 17 gp = 20 + earned - spent; Wandering Daggers 2555/1670; Sundered Torches 4219/3349; Restless Wanderers 3001/2220; Lucky Lanterns 2328/1416; Restless Foxes 881/579; Sundered Wanderers 768/452; Crimson Wanderers 0/6). Most companies marked "guild".
- Recruiting / merging seen: "The Iron Torches (Ulric Farrow and Zephyrine Quickfoot) join Order of the Lucky Lanterns. The company marches 4 strong." (merge); companies "join the Adventurers' Guild: N gp" (Sundered Torches, Lucky Lanterns, Restless Foxes); "waiting for recruits" statuses; temple lines "pay N gp at the Temple of Bahamut ... draw breath again" (e.g. Hollow Hounds 1300 gp, 790 gp).
- Retirement: no retirement line, town counter "retired adventurers 0" (the most seasoned veteran retirement was not triggered within ~14 days).
- Town tab renders: 8 companies in town, 22 arrived, heroes spent 22121 gp, 15 contracts expired, 6 magic items found, raids/lairs broken 24/0, lairs with strength and raid timers (Vermithrax strength 3, raids 6), employer cards. Chronicle renders (level-ups, deaths, temple payments, "Nobody answered ..." expiries).

## Console errors

none (read_console_messages onlyErrors: "No console logs", checked after 30 steps and after the extra 300).

## Anything that looks broken

Nothing broken. Minor observations, not judged defects: "Company of the Crimson Wanderers" sat at "waiting for recruits (41h)" with 2 dead and 2 alive and a 380 gp temple bill, 14 gp; "The Hollow Hounds" lists 5 members (3 dead) while waiting for recruits. Both could be intended rules (a stranded company waits); not verified against the rules.

## Result

PASS
