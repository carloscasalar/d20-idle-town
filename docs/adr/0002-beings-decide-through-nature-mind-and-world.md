---
status: accepted
---

# Beings decide through a Nature and a Mind, and the world settles what happens

The world advances by Beings, not by a central script. Each Tick, every Being's Nature derives its Needs afresh from its state and its Knowledge. Its Mind is consulted only when it has no Plan, a step fails, it learns something new about a Thing its Plan relies on, requests reach it as an Owner, or a Need meets its Resolve. The Mind turns Needs into a Plan of Actions. Beings never change the world themselves: the world gathers every Action of the Tick and settles what comes of it. When Actions collide in a Claim, the Owner of the contested Thing decides, or a Contest does when the Thing has no Owner. Groups (Party, Horde, Business, Town, Government, Faction) are Beings too: a Group's Nature combines its Members' Needs with its own, its Mind is how it governs itself, and Members keep their own Minds. We chose this so that behaviour emerges from what each Being lacks and knows, and so that Nature and Mind can be swapped (rules, an LLM, a decision model) without touching the world. It generalises ADR 0001: an actor's decisions now live in that actor's Mind.

## Considered Options

- **A central loop that runs each system in turn**, as the current `Game.step` does (restock, post work, raids, move companies). Rejected: every new kind of being needs a new step in the loop, and no decision can weigh everything its actor knows.
- **Beings that change the world directly.** Rejected: two Beings could both take the last potion, and an LLM Mind could make an illegal move. Only the world settles Actions.
- **Asking every Mind every Tick.** Rejected: too slow and costly with an LLM Mind, and Beings would change their minds from one Tick to the next. A Plan plus a Resolve checked without the Mind gives commitment cheaply.
- **Settling Claims by a shuffled turn order or by a fixed rule for each kind of Action.** Rejected: the Being that has the say over the Thing should decide, so reputation, grudges and favouritism matter.

## Consequences

- **Each Nature and Mind is chosen by configuration**, by kind of Being with an override for a named Being. A missing entry falls back to a default implementation. An entry naming an implementation that does not exist fails at start-up, so a typo never falls back silently to the default.
- **Every Decision is written to the Journal with its Reason.** A run is reproduced from its seed plus its Journal. A scripted Mind reads its Decisions from a given sequence: tests hand it a sequence written for the test, and replays hand it a Journal. In a test it fails when the sequence runs out instead of improvising.
- **Randomness reaches a Mind only through the world's seeded RNG.** A Mind never uses its own randomness.
- **The combat engine keeps every tactical choice within a Round.** Between Rounds, each side's Nature and Mind decide who drinks, whether to flee or whether to go on.
