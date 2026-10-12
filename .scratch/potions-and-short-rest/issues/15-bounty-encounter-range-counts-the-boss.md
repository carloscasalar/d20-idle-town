# A Bounty's encounter range counts the boss; the Short rest paces over one too many

Status: ready-for-agent
Category: bug

Found by the architecture review of 2026-10-12 and settled with the owner the same day.

## The problem

Three places disagree on what `kinds.assault.encounters` (default `[3, 5]`) means.

- **The generator** (`generateAssault` in `src/quests/quest.ts`) draws a number in that range, both ends included, and builds that number minus one fights and then the boss. A Bounty therefore has 3 to 5 encounters in all, the boss among them. It has done so since Bounties were added.
- **The description of the field** in `src/sim/kind-config.ts` and in `docs/CONFIGURATION.md` says "Fights before the boss, inclusive, plus the boss", which reads as 4 to 6 encounters. It was written later and does not describe the generator.
- **The Short rest pacing** (`encountersAhead` in `src/sim/expedition.ts`) follows that description: when a Bounty's encounter count is not known it paces Hit Dice over `encounters[1] + 1`, which is 6. The PRD (line 111) and [issue 03](03-hit-dice-at-the-short-rest.md) asked for exactly that, taking the description at its word.

With the default configuration nothing shows, because a Bounty reveals its encounter count when posted and the pacing then uses the exact count. With `kinds.assault.revealsCount: false`, a Company spreads its Hit Dice over an encounter that can never come, and so spends fewer at each Short rest than the rule intends.

## Decision

The generator is right. The range is the total number of encounters of a Bounty, the boss included, and it stays configurable through `kinds.assault.encounters` as it is today. The most a Bounty could hold is `encounters[1]`.

## What to change

- When a Bounty's encounter count is not known, the Short rest paces Hit Dice over `encounters[1]`, never below the encounters already revealed. Contracts are unchanged.
- The field's description in `src/sim/kind-config.ts` and `docs/CONFIGURATION.md` says the range is the total number of encounters, the boss included.
- `docs/ARCHITECTURE.md` (the paragraph on `encounterCountSource`) no longer says "Bounty upper bound plus the boss".
- Line 111 of the PRD is corrected to `encounters[1]`, with a note that this issue changed it. Issue 03 is closed history and stays as written.
- The test "uses the configured Bounty upper bound plus its boss when unknown, never less than revealed" in `test/expedition.test.ts` is renamed and its first expected value changes from 4 to 3 (range `[2, 4]`, one encounter completed). Its second expectation, the floor at the revealed encounters, keeps its value.

`generateAssault` does not change. No default changes.

## Acceptance criteria

- [ ] For a Bounty whose count is not known, with `kinds.assault.encounters` set to `[2, 4]` and one encounter completed, the encounters ahead are 3.
- [ ] A test generates Bounties over many seeds with a non-default range and shows that every one has a number of encounters inside the range, both ends reached, the last being the boss; and that the pacing bound for that configuration equals the longest of them.
- [ ] A test through the game with `kinds.assault.revealsCount: false` shows a Short rest on a Bounty pacing over `encounters[1]`.
- [ ] The descriptions in `src/sim/kind-config.ts`, `docs/CONFIGURATION.md` and `docs/ARCHITECTURE.md` and line 111 of the PRD agree with the generator.
- [ ] The regression hash tests pass without re-recording, and `scripts/tune-baseline.json` is unchanged.
- [ ] `pnpm typecheck` and `pnpm test` are green.

## Out of scope

- The number of encounters a Bounty has, and any change to `generateAssault`.
- Letting each kind of work answer its own maximum instead of `encounterCountSource` (candidate 4 of the architecture review).
- The pacing of Contracts.

## Comments
