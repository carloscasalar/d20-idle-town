# Groups in the slice

Type: grilling
Status: claimed
Blocked by: 01, 02

## Question

How do the slice's Groups work? Decide how a Party's and a Horde's Nature combine their Members' Needs with their own, how the Group's Mind governs (a Party's way of deciding, a Horde following its Boss), which check the Contest for Boss uses when Monsters tie on challenge rating, when a Member breaks off from the Group's Plan, what join and leave Actions the slice needs, and what each Member does when a Horde's Boss falls.

## Comments

From the user, while working the ticket "Being contract": in combat, a threat to flee is faced by the whole Group, not by each Member alone. The Group's Mind decides, and may ask its Members' Minds before deciding. A Group splitting because its Members are polarized is for later, once the being engine is refined; the first slice does not need it.

From [Tick settlement](03-tick-settlement.md): a Contest rolls one check per Being in it. Decide which Member's bonus a Group rolls with, and whether a Group's Action and its Members' Actions are gathered apart.

Decisions while working the ticket (folded into the Answer on resolution):

1. **A Group acts as one.** Its Mind commits to a Plan. Each step is one Action, gathered for the Group as a whole: one trip, one request, one Long rest. That Action carries every Member that is following the Group, so each of them moves, rests or heals with it. A following Member takes no Action of its own that Tick. A Member that breaks off is no longer carried, and its own Action is gathered on its own. The Group's Mind decides by drawing on its Members' Minds, in whatever way it governs: by majority, by what its leader decides, and so on.
2. **A Member that follows its Group holds a `follow` Plan.** This is a new Decision kind, `{ kind: 'follow'; group; resolve }`. It has no steps of its own: each Tick the Group's Action carries the Member. The Member's Mind is consulted only when one of its own Needs meets that Resolve (it may break off), when the Group asks its view, or when the Group is gone. Without it, a following Member would have its Mind consulted every Tick, because the Being contract consults any Being with no Plan. The Being contract's Decision union gains this kind on resolution.
