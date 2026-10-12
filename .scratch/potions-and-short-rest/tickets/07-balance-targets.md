# Balance targets for the retune

Type: grilling (wayfinder:grilling)
State: closed
Claimed-by: carloscasalar (session 2026-10-11)
Blocked-by: —

## Question

What defines "retuned"? Which metrics from `scripts/tune.ts` (quests, failed, deaths per quest, wipes, raises, at each scale) must stay within what margin of the baseline in [issues/01-short-rest-and-potion-divergences.md](../issues/01-short-rest-and-potion-divergences.md), and which knobs (monster difficulty scales, rest frequency, potion supply) may move to get there?

## Notes from other tickets

- From [03-short-rest-spending-policy.md](03-short-rest-spending-policy.md): a Short rest now costs one tick per gap between encounters (so expeditions last longer and time-based rules shift), and the retreat check runs after the Hit Dice are spent, so `retreatHpFraction` no longer measures the raw end-of-fight state. Both must be accounted for in the targets and knobs.

## Resolution

Decided with carloscasalar on 2026-10-11. A throwaway Opus review measured the current code to check the margins; its numbers are in the table below.

**Baseline.** The "After" table in [issues/01](../issues/01-short-rest-and-potion-divergences.md) is stale: the rows at scales 1.25 and 1.75 no longer reproduce (more than 10 commits touched `src/` since it was recorded; 1 and 1.5 still match). It stays as history, never as the reference. Before any change, re-measure on `main` with seeds 1 to 80, 600 ticks, scales 1, 1.15, 1.25, 1.5, 1.75, and record the commit SHA and the exact command in the PRD. 1.15 is `board.difficultyScale`'s shipped default and `tune.ts` does not measure it today.

**Metrics.** All five of `tune.ts` are kept: quests, failed, deaths per quest, wiped, raised. Compare unrounded values (`tune.ts` rounds `raised` to a whole number, which is about 9% of its value).

**Acceptance.**
- At scales 1.15 and 1.5, with seeds 1 to 80: every one of the five metrics within +/-15% of the re-measured baseline.
- At scales 1, 1.25 and 1.75, with 10 seeds: deaths per quest still rises as the scale rises (holds in 99% of 10-seed draws on unchanged code).
- Why 80 seeds: on unchanged code the all-five check at +/-15% fails by chance 80% of the time with 10 seeds, 49% with 20, 30% with 30, 17% with 40, 7% with 60, 2% with 80. About 4 minutes for 2 scales. Judgement calls, not measured: the +/-15% band and accepting about 2% false failures. Not measured: how reliably the check catches a real 15% shift.
- Easier than baseline is not a failure by itself, as long as it stays inside the band and the scale shape holds.

Noise on unchanged code (200 seeds, coefficient of variation of a 10-seed group): quests 4-5%, failed 4-5%, deaths per quest 7%, wiped 9%, raised 5-9%.

**Knobs that may move to get inside the band.**
- `board.difficultyScale` default.
- Number of encounters per Contract or Bounty.
- Potion buying: how many a company buys per visit and the gold it keeps in reserve (`services`).
- `expedition.retreatHpFraction` (0.35 today): allowed, because the retreat check now runs after the Hit Dice are spent and no longer measures the raw end-of-fight state ([03](03-short-rest-spending-policy.md)).
- Starting purse of new level-1 companies (`heroes.startingGoldPerLevel`), so they can afford more potions.
- Apothecary starting resources. The request was an initial potion stock; [04](04-potion-catalogue-and-availability.md) chose treasury-gated production on demand, so there is no potion stock to enlarge and the equivalent knob is the apothecary's starting treasury and reserve. Moves only if the retune needs it.

**Knobs that must not move** (D&D 2024 rules, not balance): Hit Dice per level and die size, the healing potion formulas, Long Rest restoring all Hit Dice. Potion prices stay as [04](04-potion-catalogue-and-availability.md) set them (50 / 200 / 2,000 / 20,000 gp).

**Accepted consequences, not retuned away** ([03](03-short-rest-spending-policy.md)): a Short rest costs one tick per gap between encounters, so expeditions last longer and fewer quests fit in 600 ticks. That moves `quests` and other time-based rules; the retune absorbs it through the knobs above.

**For the PRD.** `scripts/tune.ts` needs: a seed range (for example `SEEDS=1..80`), scale 1.15 in its list, unrounded output, and a check against the recorded baseline.

## Comments
