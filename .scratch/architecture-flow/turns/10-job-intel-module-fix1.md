# Turn 10, correction 1 — job intelligence decides what is learned

Your module (commit b3d36c4) was reviewed. Behaviour is proven unchanged and
the snapshot exception is proven: every tick of the three runs matches the
parent once the records are converted back. But the module does not yet own
every write. Fix the following. Still a refactor: the snapshot must not change
again; the rules in `docs/agents/orchestration-flow.md` apply.

1. **The module decides what the road and arrival reveal.** Today `Game`
   builds the writes and passes them in (`learnOnArrival(work, reveal)`,
   `readTheRoad({ learn })`), so the caller decides what arrival reveals. Give
   the expedition what it needs to ask, not to write: for example
   `knowledge: (work) => JobKnowledge` in `ExpeditionContext`, with the
   module's `readTheRoad` and `learnOnArrival` calling the learning operations
   themselves.

2. **The Board hands out operations, not fields.** `Board.knowledge` lets any
   holder of the Board set the two knowledge fields to any value, including
   hiding facts again. Replace it with a handle that offers only the two
   operations knowledge allows: learn the next fact, and reveal every fact.
   Knowledge can only grow.

3. **No other door.** `src/quests/quest.ts` still exports `revealNext`,
   `revealAll` and `learnQuestIntel`, and the module exports
   `revealNextFact`/`revealEveryFact` for production use. Only the module
   writes knowledge: remove the `quest.ts` wrappers and stop exporting the raw
   writers. Tests that call the removed functions may be changed to reach the
   same behaviour through the module's interface, with the same expected
   values; list each edited test by name.

4. **The order test must prove the order.** Swapping divination and the paid
   round in the default steps still passes the module tests. Write a test where
   the tavern stands, the free attempt is already used, and the company can
   afford both: divination must be chosen.

5. **Docs.** Make the "only writer" claim in the docs match the code after
   items 1 to 3. Correct the count of edited expedition tests (six assertions in
   five tests).

Leave configuration plumbing (`DEFAULT_JOB_INTEL_CONFIG` read directly in
`Game`, `ExpeditionContext.skillDc`) for the next task, which puts every module's
configuration into sections of `GameConfig`.

Done means: `pnpm typecheck` and `pnpm test` pass; the snapshot has no diff in
this commit; a search of `src/` finds knowledge written only inside the job
intelligence module; your report follows rule 9 with the list of edited tests.
