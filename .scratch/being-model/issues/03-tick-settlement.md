# Tick settlement

Type: prototype
Status: claimed
Blocked by: 02

## Question

How does the world settle a Tick? Decide how it gathers every Being's Action, delivers requests to each Owner and collects the answers within the same Tick, detects a Claim, runs a Contest when a Thing has no Owner, applies outcomes, and in what order. Decide how an Action that lasts several Ticks (travelling a stretch of road, a Long rest) is represented and how it fails part-way.

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
