# Smoke check 03 (after configuration sections + job-intel module)

- Date: 2026-10-03
- Commit: 518f324 (branch codex/codebase-architecture-improvement; untracked: .claude/)
- URL: http://localhost:5173/?seed=42&difficulty=1.15
- Tooling: built-in browser (mcp__Claude_Browser__*). Procedure of 00-baseline.md / 02-after-roster.md repeated, plus 300 extra steps at 16x.

## Matched (identical to 02-after-roster.md)

- Load: this time navigate + pause were sent in one batch, so the game paused at Day 1, 00:00 (02 paused at 01:00). I therefore did 30 steps (Day 2, 06:00: quests 0/2, deaths 4) plus 1 more step to reproduce 02's timeline exactly (31 steps from 00:00 = 30 steps from 01:00).
- Initial state: same 14 log entries in the same order; treasuries Osric 2437, Piran 1759, Drunken Dragon 1355, Gideon 1548, Eamon 1069, Delphine 1050, Guild 698, Brakk 1527, Silent Court 1194, Cartographers 967, Temple 924; same 3 lairs; Parties (0)/Board (0). Permalink "seed 42 · difficulty x1.15", href `?seed=42&difficulty=1.15`.
- Day 2, 07:00: quests 0/2, deaths 6, raised 0, wiped 0. Parties (2): Hollow Hounds (lvl 1, 28 gp, fighting silver mine 1/4), Silver Wolves (returning 2h, Tamsin and Vesna dead, temple bill 380 gp). Board 8 open / 2 in progress with the same contracts and rewards (Barrow cemetery 168, Frost lumber camp 421, Kell watchtower 245, Whisper quarry 487, Thornfield vineyards 802, silver mine 498 + Warhammer +1, salt mine 596 taken by Silver Wolves). Town: 11 employer cards, Osric 2493 gp, Piran 1812, Gideon 1557, Brakk 1530, Silent Court 1196 ...; lairs same. Chronicle: same Day 1 09:00 / 16:00 and Day 2 07:00 deaths and the 3 "Word spreads" entries.
- Extra 300 steps at 16x (Day 2 07:00 -> Day 14 19:00, exactly 300 h, ~23 s): header quests 62/82, gold paid 25838, deaths 59, raised 9, wiped 2 - the same as 02. Parties (8): Hollow Hounds 6226/6229, Wandering Daggers 2555/1670, Sundered Torches 4219/3349, Restless Wanderers 3001/2220, Lucky Lanterns 2328/1416, Restless Foxes 881/579, Sundered Wanderers 768/452, Crimson Wanderers 0/6 (waiting for recruits 41h) - same as 02. Town: 8 companies, 22 arrived, heroes spent 22121 gp, 15 contracts expired - same as 02. 30 "post a level N contract" lines, 27 "accept ... set out" lines, 25 "return to Silvermere" lines - same as 02.

## Differed

Nothing in the simulation. Only the load-time pause: Day 1, 00:00 now vs 01:00 in 02 (timing race, not a regression; compensated with one extra step).

## Difficulty parameter

- `?seed=42&difficulty=1.5`: toolbar "seed 42 · difficulty x1.5 · permalink", href `?seed=42&difficulty=1.5`; same world setup (Osric treasury 2437); game runs (10 steps -> Day 1, 10:00, quests 0/1, deaths 2).
- `?seed=42` (no difficulty): "difficulty x1.15", href `?seed=42&difficulty=1.15` (default 1.15).
- No parameters at all: random seed, "difficulty x1.15".

## Job intelligence lines (extra 300 steps, expanded log)

56 lines: "buy a round" 15, "works the room" 22, "reads the tracks" 19, "divination" 0 (none occurred in this run; the other three kinds were seen). Example: "Zephyrine Ravenhurst works the room at The Drunken Dragon (Persuasion 18+5 = 23, with advantage vs DC 15): it means 4 fights."

## Rendering

All four tabs render. No "undefined", "NaN", "[object" or "??" in the full page text or any tab. The only "?" is the intentional placeholder row "3. ? / unknown" for an unrevealed encounter on the Board (src/ui/main.ts:148), plus the "…/nobody knows how far it goes" rows.

## Console errors

none (read_console_messages onlyErrors: "No console logs", checked after 31 steps and after the extra 300).

## Anything broken

Nothing. Same minor observation as 02: Crimson Wanderers wait for recruits 41h with 14 gp.

## Result

PASS
