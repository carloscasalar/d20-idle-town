# Being contract

Type: prototype
Status: resolved
Blocked by: none

## Question

What are the shapes of Nature, Need, Urgency, Mind, Plan, Action, Decision, Reason and Resolve, as code a Being implements? Decide what a Nature reads (state and Knowledge only), what scale Urgency uses, what a Mind returns when consulted, how a Plan's next step is taken, what counts as a failed step, and how Resolve is checked without consulting the Mind. Prototype it with toy Beings, independent of the slice story.

## Answer

A Being implements a Nature and a Mind with the shapes below. The numbered decisions under Comments give the reason for each.

```ts
type Urgency = number            // integers 1–20 for both a Need and a Resolve; a Resolve reads like a DC
type Need = { kind: string; urgency: Urgency; about?: ThingId; note: string }
type NeedRule<S, K> = (state: S, knowledge: K) => Need | null       // no world in the signature
type Nature<S, K> = { name: string; rules: NeedRule<S, K>[] }

type Plan = {
  forNeed: { kind: string; about?: ThingId } | null   // null while waiting
  steps: Action[]                 // fixed when the Mind commits; [] means waiting
  next: number
  resolve: Urgency
  reliesOn: ThingId[]             // new Knowledge about these consults the Mind
}

type Question =                   // one way in; kinds will grow
  | { kind: 'what-next'; why: 'no-plan' | 'plan-finished' | 'need-gone' | 'step-failed' | 'news' | 'resolve-met';
      failure?: Failure; metBy?: Need; plan?: Plan }
  | { kind: 'requests'; requests: Request[] }       // as Owner
  // later: a Group asking a Member's view (Groups in the slice), a decision point between Rounds (Fight as a Thing)
type Failure = { action: Action; how: 'refused' | 'contest-lost' | 'impossible'; why: string }

type Decision = { reason: Reason } & (
  | { kind: 'commit'; forNeed; steps: Action[]; resolve: Urgency; reliesOn: ThingId[] }
  | { kind: 'carry-on'; resolve: Urgency }          // must exceed the Need that met the Resolve, so a Need at 20 cannot be carried past
  | { kind: 'wait'; resolve: Urgency; reliesOn: ThingId[] }   // 1 when nothing is lacking
  | { kind: 'answers'; answers: { request: string; accept: boolean; reason: Reason }[] })

interface Mind<S, K> { consult(q: Question, c: { needs: Need[]; state: S; knowledge: K; rng: Rng }): Decision }
```

The Being's side of a Tick asks its Mind only when it must:
1. Its Nature derives its Needs afresh from state and Knowledge.
2. The Mind is consulted, in this order of reasons, when:
   - a step failed last Tick;
   - there is no Plan, the Plan is finished, or the Plan's own Need is gone;
   - Knowledge changed about a Thing the Plan relies on;
   - a Need other than the Plan's own has Urgency at or above the Resolve. While waiting, every Need counts.
3. Otherwise it takes the Plan's next step. A success moves the Plan on. A failure is kept for the Mind at the start of the next Tick.

Each of these breaks the contract and fails the run at once:
- a Decision with no Reason;
- a Resolve outside 1–20;
- a commit with no steps;
- a carry-on that does not raise the Resolve above the Need that met it;
- answers that do not answer each request exactly once.

Prototype: [being-contract.html](../prototypes/being-contract.html), a throwaway file. It predates decisions 1, 1b, 2, 8b and 9: it uses 0–100, a strict "above" check, separate `decide`/`answer` methods, no watched Things and no `about`.

The glossary (Need, Urgency, Plan, Resolve, Tick) and ADR 0002's list of reasons to consult a Mind were updated to match.

## Comments

Prototype: [being-contract.html](../prototypes/being-contract.html) (throwaway; open it in a browser).

Decisions while working the ticket (folded into the Answer on resolution):

1. **Urgency scale: integers 0–20**, to read like d20 numbers. Resolve uses the same scale, so a Resolve reads like a DC. A Mind may roll against it when consulted, through the world's seeded RNG. Example: Ilsa's fear passes her Resolve 15, so her Mind is consulted and rolls a Wisdom save to overcome it and stay. The check that consults the Mind stays roll-free; the roll happens inside the Mind.
1b. **A Need breaks a Plan when its Urgency meets or exceeds the Resolve**, as a roll that meets a DC succeeds. A Need always has Urgency 1 or more: a rule that would give 0 gives no Need. A Being with nothing to do waits with Resolve 1.
2. **A Mind has a single way in: `consult(question)`.** The question names its kind: what to do (no Plan, a step failed, a Need met its Resolve), requests reaching it as an Owner, its Group asking its view, a decision point between Rounds. Every answer is a Decision with a Reason. So the Journal records every consultation the same way, a scripted Mind or a replay just reads the next Decision, and a new kind of question adds a kind, not a method.
3. **A Plan is a fixed list of Actions, set when the Mind commits; the next step is the next Action in the list.** Steps are data, never code, so an LLM Mind can return a Plan and the Journal records it whole in one Decision. A Plan adapts only when the Mind is consulted again. How one Action lasts several Ticks belongs to the ticket "Tick settlement".
4. **A Plan ends when its own Need is gone**, and the Mind is consulted as if the Being had no Plan. A Need that only eases, without disappearing, does not end the Plan.
5. **Only other Needs can meet a Plan's Resolve; the Need the Plan serves never does.** Resolve means how much else it takes to pull the Being off its Plan, which is where temperament shows: a cautious Mind sets it low, a bold one high. If a worsening own Need turns out to matter, a Plan could later carry a separate ceiling for it without changing what Resolve means.
6. **Waiting is a Plan with no steps and a Resolve.** A Mind with nothing to do answers "wait" with a Resolve and is consulted again only when a Need meets it; with nothing lacking it waits with Resolve 1. A Mind may wait above Needs it chooses to put up with for now. A waiting Plan serves no Need, so every Need counts against its Resolve.
7. **Carrying on must raise the Resolve above the Need that met it**, or the Decision breaks the contract and the run fails at once. A Mind that wants to reconsider soon raises it by a single point.
8a. **A step fails in one of three ways: refused by the Owner, lost a Contest, or impossible in the world.** All three reach the Mind the same way, as a failed step with how and why in words, and the Plan stays at that step. The Mind is consulted at the start of the next Tick, so a Being takes one Action per Tick and a failed step costs that Tick; its Reason starts from the failure.
8b. **A Plan names the Things it relies on (the shop, the Lair, the Contract), and a change in the Being's Knowledge about any of them consults its Mind.** The check needs no Mind. This adds a fifth reason to consult a Mind, so the glossary's Tick and ADR 0002's list of triggers are updated on resolution. How Knowledge is learned stays with the ticket "Knowledge in the slice".
9. **A Nature's rule reads only state and Knowledge and gives one Need or none. A Need carries a kind, an Urgency, an optional `about` naming a Thing, and a short note in words.** `about` lets two Needs of the same kind stand side by side (two threatened Holdings), and identifies the Plan's own Need and the Things a Plan relies on. The note feeds Reasons and gives an LLM Mind a reading of the Need.
10. **Resolve runs 1–20, like Urgency, and a Need at 20 cannot be ignored**, like a natural 20. No Resolve can exceed it, so the Mind must commit to a Plan for it, at which point it is the Plan's own Need and stops counting. A Mind that refuses is consulted every Tick while the Need stays at 20.
11. **A waiting Plan also names the Things it relies on**, the same as any Plan (8b). Ilsa waits watching the woods, so learning that the wolf has gone consults her Mind.
