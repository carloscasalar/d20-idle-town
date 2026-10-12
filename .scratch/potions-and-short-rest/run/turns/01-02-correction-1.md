# Turn 01, correction 1

Your work was committed as `2d1ecd2` and reviewed. Every acceptance criterion has evidence, the table reproduces and no game code changed. Fix the following; the rules still apply.

1. `scripts/tune.ts` compares a run against the baseline whenever the ticks match, and ignores the seeds the baseline records. On unchanged game code `SEEDS=1..10 SCALES=1,1.25,1.75 TICKS=600` (final check 2 of the PRD, the scale shape) prints `raised: deviation 20.98% FAIL` and exits 1, and so does the default `SEEDS=1,2,3`. A verdict is only meaningful for the run the baseline was measured with. Compare the run's seeds with the baseline's seeds the way ticks are compared already: on a mismatch, say that the seeds differ from the baseline's, print no pass or fail verdict, and do not exit with a failing status. Add a test for it and update the paragraph of `docs/ARCHITECTURE.md` that describes the comparison.

No existing test changes its expected values.

Done means: `pnpm typecheck` and `pnpm test` pass and your report follows rule 9.
