# Smoke check 04 (after kinds of work, steps and gold reasons as named data)

- Date: 2026-10-03
- Commit: c90ff59 (branch codex/codebase-architecture-improvement; untracked: .claude/)
- URL: http://localhost:5173/?seed=42&difficulty=1.15
- Tooling: built-in browser (mcp__Claude_Browser__*). Procedure of 00/03 repeated, using JS clicks on "step".

## Compared with 03 (identical)

- Load: navigate + pause in one batch, game paused at Day 1, 00:00 (same as 03). 30 steps -> Day 2, 06:00: quests 0/2, deaths 4. One more step -> Day 2, 07:00: quests 0/2, deaths 6, raised 0, wiped 0 (03: same).
- Day 2, 07:00: Parties (2): Hollow Hounds (lvl 1, 28 gp, fighting silver mine 1/4), Silver Wolves (returning 2h, Tamsin and Vesna dead, temple bill 380 gp). Board 8 open / 2 in progress with the contracts and rewards of 03 (Barrow cemetery 168, Frost lumber camp 421, Kell watchtower 245, Whisper quarry 487, Thornfield vineyards 802, silver mine 498 + Warhammer +1 taken by Hollow Hounds, salt mine 596 taken by Silver Wolves). Town: Osric 2493 gp, Piran 1812, Gideon 1557, Brakk 1530, Silent Court 1196; lairs same. Chronicle: same Day 1 09:00 / 16:00 and Day 2 07:00 entries plus the 3 "Word spreads" entries.
- Extra 300 steps (Day 2 07:00 -> Day 14 19:00): quests 62/82, gold paid 25838, deaths 59, raised 9, wiped 2 (03: same). Parties (8): Hollow Hounds lvl 4 waiting for recruits 12/4, Wandering Daggers, Sundered Torches, Restless Wanderers, Lucky Lanterns, Restless Foxes, Sundered Wanderers, Crimson Wanderers (lvl 1, 14 gp, waiting for recruits 41h, 0/1) as in 03. Town: 8 companies, 22 arrived, heroes spent 22121 gp, 15 contracts expired (03: same), magic items found/sold 6/0, raids/lairs broken 24/0.

Differed: nothing.

## Quest cards (Board tab, new badge/origin from the kinds table)

- Sampled all 64 distinct cards that appeared on the Board during the 300 extra steps (seed 42), every step. 17 raid contracts: all show "raid out of <lair>" + "strength N" in the muted row between title and giver row, e.g. "Lay to rest whatever haunts the Barrow cemetery | lvl 1 [E/...] | raid out of the necropolis of Raven | strength 1 | Temple of Bahamut · Undead | 168 gp". Contract cards have no badge (only the "guild" badge on guild-only ones, unchanged). Plain contracts without a lair show no origin row. Taken cards show "taken by ..." as before. Reward line with item ("498 gp + Warhammer +1") intact.
- Seed 42 never posted a lair bounty (lairs broken 0), so extra check on seed 7 (not part of the comparison): at Day 5, 16:00 an open card `<span class="badge assault">lair</span> End the reign of Green Hag | lvl 5 [H/?/?]`, origin row "assault on the Court of Thorns | hoard 500 gp", giver "The Adventurers' Guild · Fey | 750 gp + Shield +1", "2. ? unknown", "3. ? unknown". At Day 10, 03:00 the same card shows "hoard 900 gp" and "taken by The Restless Ravens". Card class `card assault`, badge class `badge assault`, row order and wording as the old template. Nothing missing or wrong.
- No "undefined", "NaN", "[object" or "??" in the page text.

## Difficulty parameter

`?seed=42&difficulty=1.5`: toolbar "seed 42 · difficulty x1.5 · permalink", href `?seed=42&difficulty=1.5`.

## Console errors

None (read_console_messages onlyErrors: "No console logs", checked after the seed-42 run, the seed-7 run and difficulty=1.5).

## Anything broken

Nothing. The dev server started by this check was stopped.

## Result

PASS
