# Slice review of turn 12 (issue 13), commit `71c5790`

Reviewer: `slice-reviewer`. Verdict: FAIL on one test gap; the code is behaviour-identical to `ff29ca7`.

- Checks: `pnpm typecheck` clean, `pnpm test` 784 passed. Snapshots, `scripts/tune-baseline.json`, both regression tests and `test/combat-potions.test.ts` have no diff.
- Long sweep: 150 of 150 seeds for 1500 hours, no crash.
- Mutations killed: pack written, fallen missing `maxHp - hp`, strongest covering tier, last companion, drink with nobody conscious, pack not run down, policy ignored, fight copy not reduced, `potionsDrunk` not counted, rest pack not reduced, wrong generator, rest dice source, fight heal, rest heal, unconscious-above-0 filter, dead included (only the hashes catch this one).
- Survivors: `shortRest` passing `undefined` for the policies; the fight mapping an absent policy to `most-hurt`; the fight's `conscious` ignoring the `unconscious` condition (not guarded at `ff29ca7` either).
- Notes: `potionSharingOf` exported with no outside user; `holdOneLess` restates `takePotion`.

Correction sent: `turns/12-13-correction-1.md`.
