# Tick settlement

Type: prototype
Status: resolved
Blocked by: 02

## Question

How does the world settle a Tick? Decide how it gathers every Being's Action, delivers requests to each Owner and collects the answers within the same Tick, detects a Claim, runs a Contest when a Thing has no Owner, applies outcomes, and in what order. Decide how an Action that lasts several Ticks (travelling a stretch of road, a Long rest) is represented and how it fails part-way.

## Answer

The world settles a Tick in fixed phases. In every phase, Beings, Owners and Things are taken in id order. The numbered decisions under Comments give the reason for each.

1. **Knowledge.** Every Being takes in the world as it stands. How it learns, and what it sees, belongs to "Knowledge in the slice".
2. **Decide.** Each Being decides alone, against the same start-of-Tick world, as the Being contract says. Its Mind is consulted at most once here, and it gives the Action it attempts this Tick: the next step of its Plan, or none while it waits.
3. **Gather.** The world collects every Action. Each Action falls into one of five kinds:
   - a free or lasting Action, such as travel, a Long rest or standing watch;
   - an Owner's Action on its own Thing;
   - a peaceful Action on a Thing someone else owns, which is a request;
   - an Action on a Thing with no Owner;
   - a hostile Action, taken by force.
4. **Owners act.** An Owner's own Actions on its own Things settle first, and it asks nobody (decision 2).
5. **Requests.** Any request that is already impossible fails at once and its Owner is not consulted. Each Owner is consulted once more, with every request still standing about its Things together (a `requests` Question, the next consultation number in the Journal). Its answers apply in turn. Accepting more requests than a Thing allows breaks the being contract and fails the run (decision 3). How many requests a Thing allows is that Thing's own rule: one Party per Contract.
6. **Contests.** A Thing with no Owner and more attempts than it allows is settled by a Contest. Each Being rolls the check the Action calls for. Contestants roll in id order from the Thing's own stream for that Tick, seeded from the run seed, the Tick and the Thing's id, and a tie rerolls among those tied (decision 4). A single attempt just happens.
7. **Force.** A hostile Action (occupying, attacking, stealing) is never a request. It happens unless someone there resists, and resisting sets up a Fight (decision 1). A Fight rolls from its own stream.
8. **Lasting and free Actions** advance one Tick (decision 6). A Long rest broken by any other Action starts over. The hours rested before the break count as a Short rest (decision 5).
9. **Things' own rules** run. For example, a Holding earns income for its Owner while it is safe.
10. **Outcomes.**
    - A completed Action moves the Plan to its next step.
    - A lasting Action still in progress leaves the Plan at that step.
    - A failure, whether refused, contest-lost or impossible, is kept for the Mind at the start of the next Tick.

Within one Tick a Being's Mind is consulted at most twice: once in Decide and once as an Owner in Requests. Nothing in settlement consults a Mind again. What settlement changes reaches each Mind in the next Tick, as a failed step or as Knowledge.

Prototype: [tick-settlement.html](../prototypes/tick-settlement.html), a throwaway file. Its walkthroughs show every phase. Its Q5 defaults to resuming a broken rest, which decision 5 replaces.

The glossary was updated to match, along with ADR 0002's sentence on Claims: Owner, Claim, Contest, Tick, and new being-model relationships on lasting Actions and the Long rest.

**Handed on**

- To "Fight as a Thing": who may resist an Action taken by force, and how resisting sets up the Fight. Also how a Fight that lasts longer than one Tick holds the Beings in it, using its own dice stream.
- To "Knowledge in the slice": what each Being takes in during the Knowledge phase, and what a Being learns from the outcomes of a Tick.
- To "Milestone travel time": how many Ticks a stretch of Road takes. Travel is taken one hour per Tick, and a Being's place on the Road is real state.
- To "Groups in the slice": which Member's bonus a Group rolls with in a Contest, and whether a Group's Action and its Members' Actions are gathered apart.

## Comments

Prototype: [tick-settlement.html](../prototypes/tick-settlement.html) (throwaway; open it in a browser). Its forks Q1–Q5 are the open decisions below; the walkthroughs show each one.

Settlement as prototyped, before the forks are decided. Each Tick runs in fixed phases:
1. Knowledge: each Being takes in the world as it stands.
2. Decide: each Being alone, against the same start-of-Tick world (Being contract).
3. Gather: every Being's Action is collected.
4. Owners act on their own Things.
5. Requests: each Owner answers all its requests in one consultation.
6. Contests settle Things with no Owner.
7. Force.
8. Lasting and free Actions advance one Tick.
9. The Things' own rules run.
10. Outcomes reach the Beings.

No Mind is consulted twice for the same reason within a Tick, and a failure reaches the Mind at the start of the next Tick.

Decisions while working the ticket (folded into the Answer on resolution):

1. **A hostile Action on an owned Thing is not a request: it is taken by force.** Occupying a Holding, attacking a Being or stealing never goes to the Owner for an answer. It happens unless someone there resists, and resisting sets up a Fight ("Fight as a Thing"). Only peaceful Actions on an owned Thing are requests the Owner accepts or refuses. Otherwise the goblins would ask Mara for her Herb garden, she would refuse, and the slice story would never start. The glossary's Owner and Claim entries change to match on resolution.
2. **An Owner's own Actions on its own Things settle before the requests about them.** The Owner has the say over its Things, and acting on them is the most direct use of it. Requests that the Owner's Action has made impossible (taking a withdrawn Contract) fail as impossible, and the Owner is not consulted about them. An Owner acting on its own Thing asks nobody.
3. **An Owner that accepts more requests than its Thing allows breaks the being contract, and the run fails at once**, like a Decision with no Reason. The Owner answers all its requests in one consultation, so it has what it needs to answer them consistently. The world never picks among accepted requests, since any order it used would be arbitrary.
4. **The world rolls from a stream per Thing per Tick**, seeded from the run seed, the Tick and the Thing's id, and contestants roll in id order. The order Beings are asked never changes a roll, and neither does a Being added or removed elsewhere. A Fight gets its own stream when it is set up ("Fight as a Thing"). This settles what "Journal, configuration and determinism" left open: the world's randomness when it settles Actions.
5. **An interrupted Long rest starts over from zero.** The hours rested before the interruption count as a Short rest. Any Tick in which the Party takes another Action interrupts it. The prototype defaults to resuming (option A); this decision replaces it.
6. **An Action that lasts several Ticks is taken one Tick at a time**, as the Being's Action in each Tick, and settled like any other. Each Tick either moves it on, completes it (and the Plan moves to its next step) or fails it. Its progress is the Being's real state: where it stands on the Road, how many hours it has rested. Breaking off part-way leaves that state as it is. A Party that turns back halfway is halfway down the Road, and what a broken rest keeps is decision 5. Between two Ticks of it the Being checks its Plan as usual, so news or a Need meeting its Resolve can pull it off mid-journey.
