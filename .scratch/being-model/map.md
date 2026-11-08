# Map: the being model's first slice

Label: wayfinder:map

## Destination

A `PRD.md` in this directory for the first vertical slice of the new core described in [ADR 0002](../../docs/adr/0002-beings-decide-through-nature-mind-and-world.md) and [ADR 0003](../../docs/adr/0003-new-being-core-keeps-only-the-leaf-modules.md), ready to be split by `to-issues`. The slice runs headless (tests and a script, no UI) and keeps the seam the UI uses today: create a run from a seed and a configuration, step one Tick, read a plain read-only snapshot, subscribe to an event stream. When the frontier is empty, `to-prd` writes the PRD. Implementation is not part of this map.

## Notes

- This is a new core, not a refactor: behaviour changes along with the architecture. The current game stays as it is and keeps running until a later slice switches the UI over.
- Domain language lives in `GLOSSARY.md` (the "Being model" sections). Use its terms and avoid the synonyms it lists; sharpen it while grilling.
- Grilling tickets call the `grilling` and `domain-modeling` skills; prototype tickets call `prototype`. Prototypes are throwaway and linked from the ticket, never merged into `src/`.
- The UI seam today: `src/ui/main.ts` uses only `new Game({ seed, ... })`, `game.step()`, `game.view()` (plain `Game*View` types) and `game.onEvent(listener)`. The shape is kept; the snapshot's contents may change.
- The combat engine already runs one Round at a time (`enc.runRound()` in `src/combat/battlecast.ts`), so the decision points between Rounds need no engine change.
- No regression parity with the current game (ADR 0003). Determinism is required: a seed plus a Journal reproduces a run.
- Tickets live in [issues/](issues/), each with `Type`, `Status` and `Blocked by` lines, as `docs/agents/issue-tracker.md` describes.

## Decisions so far

## Not yet specified

- The slice's economy: where gold comes from and goes (Holding income, upkeep, a Business's production), and the coin movement reasons in Being terms. Waits on the slice story.
- How places and distance are represented, and how long travelling a stretch of road takes. Waits on the slice story and on Tick settlement.
- Whether the slice needs balance targets at all, or only behaviour that reads as plausible.
- Performance: how many Beings a Tick can afford, and how often Minds are consulted in practice.

## Out of scope

- Town and its people: Government, Governor, Folk, Faction and Workers. A later slice.
- LLM or decision-model Minds. The being contract keeps room for them; only rule-based and scripted Minds are in the slice.
- Switching the UI over to the new core and retiring the current game.
- Who inherits a Thing when its Owner or Proprietor dies (the glossary's open ambiguity). Until settled, the Thing has no Owner.
