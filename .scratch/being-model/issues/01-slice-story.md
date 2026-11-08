# Slice story

Type: grilling
Status: resolved
Blocked by: none

## Question

Which Beings, Things and places does the first slice hold, and what run must it be able to tell from start to finish? For example: a Party restocks Healing potions from the apothecary Business, a Horde from a Lair threatens a Holding, the Holding's Owner posts a Contract on the Board, the Party takes it, travels, fights, returns, collects and rests. Decide which Beings are in (Party, Adventurer, Horde, Monster, Boss, Business and Proprietor), which Things (Holding, Lair, Board, Contract, Bounty, Healing potion), and which current-game behaviours the story leaves for later.

## Answer

**Beings in the slice**

- **Party** and **Adventurer**: two Parties in the default run, with three- and ten-Party runs as further examples.
- **Horde** and **Monster**, each Horde led by its **Boss**. Boss is a role: the Monster with the highest challenge rating, with a Contest among those tied. The Boss owns its Lair.
- An apothecary **Business** and its **Proprietor**. In this slice it only owns the Holding and posts the Contract; it sells nothing.
- A placeholder **Town** with no Members, no needs of its own and a Mind that accepts every request to post or remove a job. It exists only to own the Board until the real Town arrives.

**Things and places in the slice**

- One **Road**, named after where it ends, marked in **Milestones**. The town and everything in it stand at Milestone 0. The town is only a place here, not the Town Being.
- **Holdings** owned by the Business, at a configurable Milestone of 2 or closer. A Holding earns income for its Owner while it is safe and earns none while it is threatened.
- **Lairs**, at a configurable Milestone of 3 or beyond.
- The **Board**, owned by the placeholder Town.
- **Contracts**, each owned by the Being that posted it.
- **Healing potions**: each Party starts with a supply. Nobody buys or makes them in this slice.
- The number of Parties, Holdings, Lairs and Hordes comes from configuration. The default run has one Holding, one Lair and one Horde.

**Gold**

- Starting Purses come from configuration.
- Holdings earn income while safe.
- A Contract's reward is set aside in its poster's Purse when posted and is never more than the poster's free gold. A configurable minimum reward applies: a Being whose free gold is below it cannot post. Posting never leaves a Purse negative.

**The run**

1. A Horde, led by its Boss, leaves its Lair for a Holding and stays there threatening it. The Holding's income stops.
2. The Business posts a Contract on the Board and sets the reward aside.
3. Parties ask to take the Contract. That is a Claim, and the Business, as the Contract's Owner, answers it.
4. The chosen Party travels Milestone by Milestone, fights the Horde at the Holding, returns, collects the reward from the Business and takes a Long rest under the open sky (no inn).
5. The Holding is safe again and its income resumes.
6. If the Party flees or is wiped out, the Contract goes back on the Board with its reward still set aside, and another Party may take it.

**Left for later** (out of scope for this map)

Job intelligence; the Company roster (arrivals, recruiting, merging, disbanding, retiring); Bounty; Lair growth and escalating raids; ravaged Holdings and Loot; taking the Hoard; potion sales and restocking; inns; XP and levelling; Contract expiry; more than one Road in a radial layout; Holdings beyond Milestone 2 (buildings, supply, guards); outposts and another town's protection.

**Glossary changes**

Boss is now a role (highest CR, Contest on ties) and the Horde is led by it. New terms: Road and Milestone. New relationships: a poster never promises more than its free gold and cannot post below the minimum reward; a Party takes its Long rest in an inn, or under the open sky when there is no room.

**Handed on**

- Which check the Contest for Boss uses: "Groups in the slice".
- How long a Milestone takes and whether that grows linearly or logarithmically: "Milestone travel time".
