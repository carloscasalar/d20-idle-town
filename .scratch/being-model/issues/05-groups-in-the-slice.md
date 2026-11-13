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
3. **How a Group governs is its Mind's strategy, and strategies are an open set.** The registry of Group Minds holds as many strategies as get written, and adding one never touches the world. The slice ships two:
   - `leader`: the Group's Mind asks only its leader's Mind.
   - `majority`: the Group's Mind asks every following Member's Mind, and a tie goes to the leader's view.

   Choosing the strategy is a Group's first decision when it forms. In the slice every Group starts formed, so configuration names the strategy: a Party defaults to `majority`, and a Horde uses `leader` with its Boss as leader. A three-Party run can show a led Party beside a voting one.
4. **A Party's leader is chosen by its Members when the Party forms, for example by a Contest.** Configuration does not name it, and neither does a fixed rule such as highest level. How the slice makes that choice, and when it happens given that its Parties start formed, is decision 5.
5. **Each Party forms before the first Tick, and its Members choose the leader by a Contest in which each rolls its own best skill.** That is the skill where its bonus is highest: a bard may roll Charisma (Persuasion), a fighter Strength (Athletics). Every Member rolls from the Party's own dice stream, seeded from the run seed, the Tick and the Party's id, in id order. A tie rerolls among those tied. When the leader dies or breaks off, the same Contest runs again among the following Members still standing. A Contest therefore no longer belongs only to a Claim on a Thing: it can also choose who leads a Group, and then rolls from the Group's dice.
6. **A Horde chooses its Boss by the same leader Contest as a Party.** Only the Monsters with the highest challenge rating enter. Each rolls its own best skill from the Horde's dice stream, in id order, and a tie rerolls. This happens before the first Tick, and again whenever there is a new Boss to choose. Choosing who leads any Group is then one rule in the slice: a Horde narrows the field by challenge rating, a Party lets every Member in.
7. **A Group's Mind asks its Members to vote between options.** It drafts a few candidate Decisions from the Group's Needs, such as taking the Contract, resting or waiting. It then asks each Member it consults with a new `vote` Question carrying those options. Each Member picks one by reading its own Needs and Knowledge (a wounded cleric votes to rest) and gives a Reason. `majority` counts the picks, and `leader` takes the leader's pick. Counting is clear-cut, scripted Minds stay easy to write, and this is the main path by which a Member's own Needs shape the Group's choice.
8. **Each vote is a consultation of its own.** It runs inside Decide, while the Group is consulted, asking Members in id order. It gets its own Journal entry under the Member's id, with the Member's next consultation number in that Tick, so replay and scripted Minds work unchanged. A Being's Mind is then consulted in a Tick at most once in Decide, once for each Group that asks its vote, and once as an Owner. On resolution, the Tick settlement Answer's "at most twice" sentence and ADR 0002's list of reasons to consult a Mind gain the vote.
