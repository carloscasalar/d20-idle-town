# Smoke check 01 (after Board refactor)

- Date: 2026-10-02
- Commit: 16bc45a (branch codex/codebase-architecture-improvement)
- URL: http://localhost:5173/?seed=42&difficulty=1.15
- Tooling: built-in browser (mcp__Claude_Browser__*), no fallback needed. Procedure of 00-baseline.md repeated, plus ~200 extra steps.

## Matched the baseline

- Header "d20 Town · Silvermere"; initial clock "Day 1, 00:00" (after pausing right after load); counters 0/0, 0, 0, 0, 0.
- Controls: pause, 1x, 2x, 4x, 16x, step, "show combat narration" checkbox, permalink "seed 42 · difficulty x1.15".
- Initial log: same 14 entries, same order, same names and numbers as baseline: welcome, 11 employers (Countess Osric Stirling ... Temple of Bahamut; treasuries 2437, 1759, 1355 ...), 3 lairs (Vermithrax L6, Raven L7 Wraith, Hellgate of Kell L8 Erinyes). Initial aside: Parties (0), Board (0), "The tavern is empty. Someone will show up."
- 30 step clicks (60 ms apart) advanced the clock exactly 30 h (Day 1 00:00 -> Day 2 06:00; baseline was 03:00 -> 09:00, same delta). Clock stayed put while paused.
- All four tabs rendered non-empty content of the same kind: Parties (cards with members, hp, potions, renown), Board (Open contracts / In progress), Town (lairs + 11 employer cards, same names/treasuries as baseline, e.g. Osric 2493 gp, Piran 1812, Gideon 1557, Brakk 1530), Chronicle (starts with the same Day 1 09:00 and 16:00 entries as baseline plus the 3 lair "Word spreads" lines).

## Differed

- Initial speed: on page load the game is running at 1x (the "1x" button is active, the clock advances ~3 h per 4 s), not paused. The baseline's unexplained "Day 1, 03:00" first reading is therefore explained: it was the live 1x clock, not a one-off. I pressed pause right after load (clock still 00:00) before stepping. Not a regression as far as I can tell (baseline note says "starts paused" after it was paused).
- After 30 steps: quests 0/2, deaths 4 (baseline 0/3, 6); Parties (2): Hollow Hounds (lvl 1, fighting silver mine 0/4) and Silver Wolves (fighting salt mine 2/4) vs baseline 3 parties. Board 8 open / 2 in progress vs 7 / 2. Expected: baseline's clock offset (3 h before stepping) and rule changes shift the party events. Contract names and values are the same set as baseline (Barrow cemetery 168 gp, Frost lumber camp 421 gp, Kell watchtower 245 gp, Whisper quarry 487 gp, silver mine 498 gp + Warhammer +1).
- Parties now show "N potions" and board cards show difficulty bracket e.g. "lvl 1 [E/...]" (new UI/rules, not in baseline).

## Extra ~200 steps (16x, then pause; clock Day 2 06:00 -> Day 10 15:00 = 201 h)

- Contracts get posted and taken: many "post a level N contract" and "accept ... and set out" entries; board stays at ~8 open; header quests 32/48, gold paid 13528.
- Companies go out and return: many "return to Silvermere. X pay N gp ... Purse" lines, e.g. Silver Wolves, Merry Torches, Wayward Banners, Hollow Hounds, Order of the Hollow Oaths; parties in varied states (returning, resting at the inn, looking at the board). Deaths 44, raised 2, wiped 2; temple pays and revivals appear.
- Town tab still renders (5 companies, 18 arrived, 15 raids, lairs growing, employers with earned/spent). Chronicle renders (level-ups, deaths, expired contracts).
- Healing potions: YES. "buy N healing potions from Eamon Farrow" town lines, and in combat lines "X drinks a healing potion." and "X gives Y a healing potion." (74 collapsible combat blocks expanded).
- Text scan of the whole page (61k chars) and each tab for undefined / NaN / [object / ?? / null: no hits.

## Console errors

none (read_console_messages onlyErrors: "No console logs", checked after 30 steps and after the extra 200).

## Anything that looks broken

Nothing. No stuck parties, board keeps receiving contracts, no placeholders.
Minor observation only: board cards read "lvl 1 [E/...]" and "nobody knows how far it goes" (looks like intentional hidden-stage text).

## Result

PASS
