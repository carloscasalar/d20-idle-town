# Smoke baseline 00

- Date: 2026-10-02
- Commit: b19a8e0 (branch codex/codebase-architecture-improvement; untracked: scripts/agents/, .claude/launch.json)
- URL: http://localhost:5173/?seed=42&difficulty=1.15
- Tooling: built-in browser (mcp__Claude_Browser__*), no fallback needed.

## Procedure (repeat exactly)

1. Ensure `.claude/launch.json` has config `d20-town` (`pnpm dev`, port 5173); `preview_start` name `d20-town`.
2. Navigate to the URL above. Read the page (read_page, all).
3. Click the "step" button 30 times (done via JS: `button.click()` x30, 60 ms apart). One step = 1 game hour.
4. Click each aside tab (Parties, Board, Town, Chronicle) and read the aside text.
5. Read console messages (errors only).
6. `preview_stop`.

## Initial state (before stepping)

- Header: "d20 Town · Silvermere", clock "Day 1, 00:00", counters: quests 0/0, gold paid 0, deaths 0, raised 0, wiped 0.
- Controls: ⏸ (active/selected, i.e. starts paused), 1x, 2x, 4x, 16x, step. Also "show combat narration" checkbox (checked) and "seed 42 · difficulty x1.15 · permalink" (href `?seed=42&difficulty=1.15`).
- Log: 14 entries, all "Day 1, 00:00": welcome ("Welcome to Silvermere. Adventurers gather at The Drunken Dragon; the Temple of Bahamut keeps its doors..."), 11 employer entries in this order: Countess Osric Stirling, Lady Piran Stirling, The Drunken Dragon, Gideon Farrow, Eamon Farrow, Delphine Greycloak's Curiosities, The Adventurers' Guild, Brakk Vane, The Silent Court, The Cartographers' Society, Temple of Bahamut; then 3 lair entries: roost of Vermithrax (Dragons L6 Young Blue Dragon, Ember caverns), necropolis of Raven (Undead L7 Wraith), Hellgate of Kell (Fiends L8 Erinyes).
- Aside: tabs "Parties (0)", "Board (0)", "Town", "Chronicle"; parties tab says "The tavern is empty. Someone will show up."
- Note: a first JS read just before stepping already showed "Day 1, 03:00" (3 hours elapsed, before any step I clicked). Unclear whether something auto-advanced briefly or the first read_page/navigation raced; the later read confirmed paused (clock stable over 3 s). Compare with the next run: if the clock is 00:00 at the first read, this was a one-off.

## After 30 steps

- Clock: Day 2, 09:00 (30 h from the 03:00 reading). Counters: quests 0/3, gold paid 0, deaths 6, raised 0, wiped 0.
- Log grew (page text 4.2k -> 12.9k chars); latest entries at Day 2, 09:00: Silver Wolves limp back empty-handed, carry their dead to the Temple (190 gp each for Tamsin Stormcaller and Vesna Starling), take rooms at the inn for 6 gp; Crimson Ravens accept "Fey have taken the Thornfield vineyards" from Lady Piran Stirling. Includes "73 combat lines" collapsible.
- Clock stays put while paused (verified over 3 s).

## Tabs (after 30 steps)

- Parties (3): The Hollow Hounds (lvl 2, 28 gp, fighting at the silver mine 3/4; Ysolde Ravenhurst Warlock 2, Delphine Longstride Wizard 2, Freya Coldwater Paladin 2, Aldric Goldleaf Ranger 2); Company of the Silver Wolves (lvl 1, 14 gp, resting at the inn 8h, 0 done/1 failed, Tamsin Stormcaller and Vesna Starling dead, temple bill 380 gp); Company of the Crimson Ravens (lvl 1, 20 gp, on the road to the Thornfield vineyards 2h).
- Board (7): "Open contracts (7)" and "In progress (2)". Open include "Lay to rest whatever haunts the Barrow cemetery" (Temple of Bahamut, 168 gp), "The woodcutters fled the Frost lumber camp" (Brakk Vane, 421 gp), "Relieve the garrison of the Kell watchtower" (Silent Court, 245 gp), "Elementals are squatting in the Whisper quarry" (Countess Osric, 487 gp). In progress: "The miners at the silver mine have gone silent" (Osric, 498 gp + Warhammer +1, taken by The Hollow Hounds) and "Fey have taken the Thornfield vineyards" (Piran, 802 gp).
- Town: heading "Silvermere"; 3 companies in town, 4 arrived so far, heroes spent 18 gp, contracts expired 0, magic items found/sold 0/0, retired 0, raids/lairs broken 3/0. Lairs: Vermithrax (next raid 30h of 90), Raven necropolis (strength 1, raids 3, next raid in 7h of 90), Hellgate of Kell (next raid 88h of 90). Employer cards (first ones): Countess Osric Stirling (treasury 2493 gp, +35/day, pays x1.44, holdings Thistle hunting lodge/silver mine/Whisper quarry), Lady Piran Stirling (1812 gp), Gideon Farrow (1557 gp), Brakk Vane (1530 gp), The Drunken Dragon (1397 gp), The Silent Court (1196 gp)...; 11 employers expected as in the initial log.
- Chronicle: starts with Day 2 08:00 "The Hollow Hounds reach level 2."; then Day 2 07:00 Silver Wolves' Tamsin and Vesna left for dead at the salt mine (3x Gnoll); Day 1 16:00 Ysolde Blackthorn (Bard 1) of Company of the Grim Shields dies at the Kell road; Day 1 09:00 Hollow Hounds' Piran Brightblade, Ivo Underhill, Aldric Oakenshield left for dead at Thornfield vineyards; then the 3 "Word spreads" lair entries at Day 1 00:00.

(Seed is deterministic for the world setup; party actions after step count may depend on whether the first 3 hours elapsed outside the step clicks, so compare world setup strictly and the post-30-step numbers loosely.)

## Console errors

none (read_console_messages onlyErrors: "No console logs"). Dev server started cleanly.

## Result

PASS
