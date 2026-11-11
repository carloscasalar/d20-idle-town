# Journal, configuration and determinism

Type: grilling
Status: resolved
Blocked by: 02

## Question

What goes in the Journal and how is a run reproduced? Decide the record of a Decision and its Reason, how a scripted Mind reads its Decisions from a sequence in tests and replays, how configuration picks a Nature and a Mind by kind of Being with an override for a named Being (failing at start-up on an unknown name), and how the world's seeded RNG reaches each Mind without making runs depend on the order Beings are asked.

## Answer

A run is reproduced from its seed, its configuration and a Journal, using the implementations it was started with. The numbered decisions under Comments give the reason for each.

```ts
type JournalEntry = {
  tick: number
  being: BeingId
  n: number                 // the consultation's number within this Tick, from 0
  question: Question
  needs: Need[]             // what the Mind saw
  knowledge: Knowledge
  decision: Decision        // carries its Reason
  rng?: RngState            // the Being's Rng after the Decision, when the recorder saves it
}

interface JournalRecorder { record(entry: JournalEntry): void }

// configuration: plain data, names from registries in code
beings: {
  kinds: { [kind: string]: { nature?: string; mind?: string } }
  named: { [beingName: string]: { nature?: string; mind?: string } }
}

createRun(
  { seed, config },
  {                                        // all optional
    rngFor?: (being: BeingId) => Rng,      // default: new Rng(hashString(`${seed}:${being}`))
    journal?: JournalRecorder,             // default: records every entry, no Rng state
    natures?: Record<string, Nature>,      // added to the registries
    minds?: Record<string, Mind>,
    scripts?: Record<BeingName, Partial<JournalEntry>[]>,  // sequences for scripted Minds
  },
)
```

- **Randomness.** Each Being owns an injected Rng and its Mind draws only from it, so the order Beings are asked never changes a draw. Handing several Beings one instance gives a shared stream when wanted.
- **Replay.** A run meant for replay injects a recorder that saves Rng state. A replay gives each Being a Mind that reads its Decisions from that Journal and restores its Rng after each one. A run recorded without Rng state is not replayable that way; the core does not force it to be. `src/core/rng.ts` gains functions to save and restore state; existing functions are unchanged.
- **Scripted Minds** (tests and replays) fail the run at once when the sequence runs out or the next entry does not match the consultation: Tick, consultation number, Question, Needs or Knowledge. The error names the Being, the Tick and the first field that differs. A test script may leave fields out, and only the fields it gives are checked.
- **Configuration** picks a Nature and a Mind by kind, with an override by Being name. A missing entry uses the kind's default. These fail at start-up: an unknown implementation name, a kind with no registered default, and a Being configured with the scripted Mind but given no sequence. An override for a Being that is never created is reported when the run ends.

Left to [Tick settlement](03-tick-settlement.md): the randomness the world itself draws when it settles Actions (Contests, Fights, travel), and how it stays independent of the order Beings are asked.

## Comments

Decisions while working the ticket (folded into the Answer on resolution):

1. **Each Being owns an Rng, given to it when it is created and passed to its Mind on every consultation.** By default it is seeded from the run seed and the Being's id (`hashString`), so the order Beings are asked never changes what any of them draws. The Rng is injected, not built by the Being, so a run or a test can hand several Beings the same instance when one shared stream is wanted.
2. **A Journal entry can carry the state of the Being's Rng after the Decision, and a replay restores it**, so a Decision read from the Journal leaves the Rng where the Mind left it. What gets recorded is an injected implementation, like the Rng itself: tests inject one that records the state; a real run injects one that records no state. Saving and restoring state are new functions on `src/core/rng.ts` (allowed by [Code layout and carry-over](04-code-layout-and-carry-over.md): new functions, existing ones unchanged).
3. **Whether a run can be replayed depends on the implementations it starts with, not on a rule of the core.** A run meant for replay injects a Journal recorder that saves the Rng state; replaying it hands each Being a Mind that reads its Decisions from that Journal and restores the Rng after each one. A run started with a recorder that saves no state is not replayable that way, and nothing forces it to be.
4. **A Journal entry records one consultation whole: the Tick, the Being's id, the consultation's number within that Tick, the Question, the Needs and Knowledge the Mind saw, the Decision with its Reason, and the optional Rng state (decision 2).** Needs and Knowledge make an entry readable on its own, explaining why a Being decided, and let a replay check that it reached the same inputs. Entries are larger for it.
5. **A Mind that reads its Decisions from a sequence fails the run at once when the next entry does not match what it is asked, or when the sequence has run out**, in tests and replays alike. A mismatch is a different Tick, consultation number, Question, Needs or Knowledge; the error names the Being, the Tick and the first field that differs. A test's script may leave out Tick, Needs and Knowledge, and then only what it gives is checked.
6. **Configuration names a Nature and a Mind by string, per kind of Being and per named Being, from registries in code**, so it stays plain data. A missing entry uses the kind's default. An unknown implementation name, or a kind with no registered default, fails at start-up with a readable error such as `beings.named.Ilsa.mind: unknown mind "scriptd"`. An override for a named Being that is never created is reported when the run ends, not at start-up, because Beings such as a new Boss appear during the run.
7. **Creating a run takes the seed and configuration, plus an optional second argument of implementations:** an Rng factory per Being, a Journal recorder, extra registry entries (Natures and Minds), and sequences by Being name for scripted Minds. Defaults are a per-Being Rng seeded from the run seed and the Being's id, and a recorder that writes every entry without Rng state. A Being configured with the scripted Mind and given no sequence fails at start-up.
