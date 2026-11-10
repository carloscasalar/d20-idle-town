# Code layout and carry-over

Type: grilling
Status: resolved
Blocked by: none

## Question

Where does the new core live in the repo, and how do the leaf modules ADR 0003 keeps (core/, items/, Healing potion tiers, Hit Dice, the coin ledger, hero data) serve both the new core and the current game while the current game keeps running? Decide between moving, sharing or copying them, how their unit tests come along, and how the old and new cores are kept from importing each other.

## Answer

The new core lives in `src/being/`, its tests in `test/being/` and its headless run script in `scripts/being/`. Leaf modules are shared only when the new core will never change their existing behaviour: a shared module is frozen while the current game lives, because any change that shifts an RNG draw breaks the simulation-regression snapshot. Everything else is copied into `src/being/` and trimmed; the original stays for the current game.

| Module | Decision |
|---|---|
| `src/core/` rng, dice, freeze, readonly, xp, names | Shared in place. New functions may be added; existing ones do not change. |
| `src/core/steps.ts` | Left behind, and moved to `src/sim/steps.ts` so `src/core/` is wholly shared. Only import paths in `game.ts`, `services.ts` and `job-intel.ts` change. |
| `src/items/items.ts` | Shared in place. A Thing can wrap it. |
| `src/adventurers/potions.ts` | Moved to `src/items/potions.ts` and shared. Only the current game's import paths change. |
| `src/adventurers/hit-dice.ts` | Copied, keeping only `parseHitPointFormula` and `rollHitDie`. Spending pace becomes a Mind's decision. |
| Hero data (`src/adventurers/hero.ts`) | Copied, keeping only the record and its plain rules: class, level, hp, Hit Dice spent, alive, items, create, heal, kill, equip, AC. XP and levelling are out of this slice ([Slice story](01-slice-story.md)), so gaining xp is not copied yet; `src/core/xp.ts` stays shared for when it is. Pricing (`HeroEconomyConfig`) and `rollSkill` stay behind. |
| `src/town/coin.ts` | Copied, keeping only the movement engine (transfer, source, sink over a reason table). Holders and reasons are left to the slice's economy. |
| `src/combat/battlecast.ts` | Copied and trimmed later, once ADR 0003's condition is met. When is for the Fight as a Thing ticket. |

Tests: every copied function brings its tests into `test/being/`, trimmed to the copied behaviour (`items.test.ts` loses its combat cases, `hit-dice.test.ts` keeps parsing and rolling, `coin.test.ts` keeps the engine). Tests of shared modules stay where they are, not duplicated. Every current-game test in `test/` stays as it is; no test on working code is dropped. Loop tests stay behind, as ADR 0003 says.

Boundary: one vitest test reads every import in `src/`, `test/` and `scripts/` and fails on a forbidden one. No new dependency; CI already runs `pnpm test`. Three zones:

- **Shared** (`src/core/`, `src/items/`): imports only shared and `battlecast-engine`.
- **New core** (`src/being/`, `test/being/`, `scripts/being/`): imports only itself, shared, `battlecast-engine`, Node and vitest.
- **Current game** (everything else under `src/`, `test/`, `scripts/`): imports anything except the new core.

Not decided here: the internal layout of `src/being/`, which follows from the being contract and goes into the PRD, and the names the copies take, which come from `GLOSSARY.md` (Adventurer, not Hero; Purse) when they are written.
