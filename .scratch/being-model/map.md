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

- [Slice story](issues/01-slice-story.md): Parties (2, with 3- and 10-Party runs) save a Business-owned Holding from a Boss-led Horde through a Contract on a Board owned by a placeholder Town, along one Road of Milestones; gold is starting Purses, Holding income while safe and set-aside rewards.
- [Being contract](issues/02-being-contract.md): Needs carry kind, Urgency 1–20 and an optional `about`; a Mind has one `consult(question)` returning a Decision with a Reason; a Plan is a fixed list of Actions with a Resolve (a DC met by any other Need) and the Things it relies on; waiting is a Plan with no steps; a failed step consults the Mind next Tick, and news about a Thing the Plan relies on consults it as soon as the Being learns it.
- [Code layout and carry-over](issues/04-code-layout-and-carry-over.md): new core in `src/being/`; `src/core/` and `src/items/` (potions moved in) shared and frozen, hero record, Hit Dice rolls and the coin engine copied and trimmed; a vitest import test keeps three zones apart.
- [Journal, configuration and determinism](issues/08-journal-configuration-and-determinism.md): each Being owns an injected Rng its Mind draws from; a Journal entry records one consultation whole (Tick, Being, number, Question, Needs, Knowledge, Decision with Reason, optional Rng state); a replay reads Decisions from the Journal and restores the Rng, and a scripted Mind fails at once on a mismatch or when it runs out; configuration names Natures and Minds by kind and by Being from registries; `createRun` takes a second, optional argument of implementations (Rng factory, Journal recorder, registry entries, scripts).

## Not yet specified

- Whether the slice needs balance targets at all, or only behaviour that reads as plausible.
- Performance: how many Beings a Tick can afford, and how often Minds are consulted in practice.

## Out of scope

- Town and its people: Government, Governor, Folk, Faction and Workers. A later slice.
- LLM or decision-model Minds. The being contract keeps room for them; only rule-based and scripted Minds are in the slice.
- Switching the UI over to the new core and retiring the current game.
- Who inherits a Thing when its Owner or Proprietor dies (the glossary's open ambiguity). Until settled, the Thing has no Owner.
- Current-game behaviours left for a later slice ([Slice story](issues/01-slice-story.md)): Job intelligence, the Company roster, Bounty, Lair growth and escalating raids, ravaged Holdings and Loot, taking the Hoard, potion sales and restocking, inns, XP and levelling, Contract expiry. The slice tells one story, and these would widen it.
- Several Roads in a radial layout, Holdings beyond Milestone 2 (buildings, supply, guards), outposts and another town's protection ([Slice story](issues/01-slice-story.md)). The slice needs only one Road as a measure of distance.
