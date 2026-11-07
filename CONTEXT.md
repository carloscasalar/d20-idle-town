# d20 Town

A town simulation where beings (adventurers, monsters, businesses, townsfolk and those who govern them) act on their own needs. The "Being model" sections describe the new core; the "Current game" sections describe the game as it is built today, where companies take paid work from employers while holdings and lairs change around them.

## Language

### Being model

**Being**:
Something in the world that decides for itself: it has state, needs and chooses its own actions.
_Avoid_: Entity, Agent, Actor

**Nature**:
What a **Being** is, as far as its needs go: a set of need rules, each reading the Being's state and **Knowledge**, where it is included, and perhaps giving a **Need**. A fighter's Nature and a wizard's Nature differ; town and dungeon are not Natures but places the rules read.
_Avoid_: NeedsAssessor, Instinct, category

**Need**:
Something a **Being** lacks right now, with an **Urgency**. Its **Nature** derives it afresh from the Being's state each time; a need is never stored, so it vanishes when the state no longer gives it.
_Avoid_: Desire, Goal (a need is not yet a choice)

**Urgency**:
How pressing a **Need** is, comparable across all the needs of one **Being**.
_Avoid_: Priority (fixed per kind)

**Mind**:
How a **Being** chooses the actions that meet its needs; temperament such as bravery lives here. Two fighters can share a **Nature** and differ in **Mind**.
_Avoid_: Producer, Will, Brain, Strategy (in prose)

**Action**:
One step a **Being** attempts in the world, such as buying a potion or travelling a stretch of road. The world decides whether it happens and what comes of it.
_Avoid_: Move, Command

**Plan**:
The sequence of **Actions** a **Mind** commits to in order to meet one **Need**, such as travel, fight, return and collect. The Being follows it step by step and decides again only when it ends, when a step fails, or when its Mind chooses to break it off.
_Avoid_: Course, Undertaking, Task

**Group**:
A **Being** made of member Beings, such as a party, a horde, a business or a town. Its **Nature** combines its members' needs with its own; its **Mind** is how it governs itself: a strong leader, consensus, a vote, a council.
_Avoid_: Composite, Collective

**Adventurer**:
A **Being** with a class and a level who lives by adventuring work.
_Avoid_: Hero (in prose; `Hero` was the old code type)

**Party**:
A **Group** of **Adventurers** sharing a purse, equipment, renown and work.
_Avoid_: Company (it reads as a business), Band

**Monster**:
A **Being** whose **Actions** head to pillage, killing and stealing. Most have a plain **Mind** that follows their **Horde**; notable ones think for themselves.
_Avoid_: Creature (in prose; the combat engine's word for anything that fights)

**Horde**:
A **Group** of **Monsters**, led by its strongest or deadliest **Member** or by a **Boss**. When its leader falls, each Member's own needs decide whether it flees, follows a new leader or stays.
_Avoid_: Warband, Pack

**Boss**:
A **Being** that leads a **Horde** and needs to gather wealth, followers, minions and territory. It is the **Owner** of its **Lair** and the Lair's **Hoard**.
_Avoid_: Villain, Overlord

**Business**:
A **Group** that makes or sells something, headed by its **Proprietor** and staffed by **Workers**. It is the **Owner** of its stock, its building and its own gold, which is not its Proprietor's.
_Avoid_: Shop, Establishment, Company

**Proprietor**:
The **Being** at the head of a **Business**: whoever had the gold to open or buy it. The Business's **Mind** defers to the Proprietor's, and the Proprietor takes profits from it by an **Action**.
_Avoid_: Owner (that word is for **Things**), Boss (a Horde's leader)

**Worker**:
A **Being** hired by a **Business** from a **Folk**, who needs above all to earn enough to live. Dismissed, it returns to its Folk.
_Avoid_: Employee, Labourer

**Town**:
A **Group** whose **Members** are its **Businesses**, its **Folks** and its **Factions**, and the **Owner** of its treasury and public buildings. Its **Mind** defers to its **Government**.
_Avoid_: City, Settlement (in prose; a town's size names it in the world, not in the model)

**Government**:
A **Group** of one or more **Governors** whose **Mind** is its form: a single ruler decides alone, a council votes, an assembly seeks consensus. A coup or a revolution changes that form. It has needs of its own, such as staying in power, that need not match the **Town**'s.
_Avoid_: Rule, Regime, Authority

**Governor**:
A **Being** that is a **Member** of a **Government**. The ruler's title (sheriff, count, duke, king) follows from the Town's size and the Government's form; nobody chooses it.
_Avoid_: Ruler (unless it rules alone), Official

**Folk**:
A share of a **Town**'s people alike in ancestry and trade, such as forty dwarf miners or a hundred and twenty human farmers, standing as one **Being** with a head count, wealth and mood. **Workers** are hired from a Folk and return to it.
_Avoid_: Populace, Estate, Cohort, Class (a D&D class is fighter or wizard)

**Faction**:
A **Group** of **Folks** and named **Beings** drawn together by a shared interest: a trade, an ancestry, later a faith. A Folk may belong to several. Factions are not set in advance; they form when enough Beings share a need and fade when it goes.
_Avoid_: Guild (one kind of Faction), Party (that is adventurers), Estate

**Member**:
A **Being** that belongs to a **Group**. It keeps its own **Mind** and may break off from the Group's **Plan**, but it joins or leaves only by an explicit **Action** (join, leave, expel). A Being may be a Member of several Groups, such as a **Worker** of a **Business** who is also in a **Faction**.
_Avoid_: Child, Part

**Knowledge**:
What a **Being** believes about the world beyond its own state: what it sees where it is and what it learned before, which may be out of date or wrong. Its **Nature** and **Mind** read only its state and its Knowledge, never the world itself.
_Avoid_: Perception, View, World state

**Owner**:
The **Being** that has the say over a **Thing**, such as the apothecary **Business** over its potions or a job's poster over its Contract. Every **Action** on an owned Thing is a request its Owner accepts or refuses; a Thing whose Owner is gone has no Owner, and anyone may take from it.
_Avoid_: Keeper, Controller

**Claim**:
Two or more **Beings** attempting, in the same tick, **Actions** that cannot all happen, such as buying the last potion. The **Owner** of the Thing they want answers all the requests at once; with no Owner, a **Contest** decides.
_Avoid_: Conflict, Race

**Contest**:
A roll between the Beings of a **Claim**, with the check the **Action** calls for: Stealth to slip in first, Athletics to grab, and so on.
_Avoid_: Tie-break, Opposed roll

**Resolve**:
The **Urgency** above which a **Being** breaks off its **Plan**, set by its **Mind** when it commits: a brave Mind sets it high, a cowardly one low. Checking it does not consult the Mind.
_Avoid_: Threshold, Breaking point

**Tick**:
One hour of world time. Each tick every **Being**'s **Nature** derives its needs afresh and the Being takes the next step of its **Plan**; its **Mind** is consulted only when it has no Plan, a step fails, requests reach it as an **Owner**, or a need passes its **Resolve**.
_Avoid_: Turn, Round (those belong to combat)

**Fight**:
A **Thing** the world sets up to resolve a fight **Action**, played round by round by the combat engine, which keeps every tactical choice inside a **Round**.
_Avoid_: Battle, Combat (in prose)

**Round**:
One exchange of a **Fight**, below the **Tick**. Between Rounds each side reaches a decision point: its **Nature** derives needs from the Fight and its **Mind** chooses who drinks, whether to flee or to go on.
_Avoid_: Turn

**Decision**:
A choice a **Mind** makes when it is consulted, together with its **Reason**.
_Avoid_: Choice, Output

**Reason**:
The short sentence a **Mind** gives for a **Decision**, such as "raise taxes: the treasury cannot pay the watch". It explains a Being's behaviour and feeds the chronicle.
_Avoid_: Rationale, Explanation

**Journal**:
The record of every **Decision** of a run. Replaying a run reads each Decision from the Journal instead of consulting a Mind that may not decide the same way twice.
_Avoid_: Log, Chronicle (the chronicle is what the player reads)

**Thing**:
Something in the world with state and rules but no will of its own, such as a building, a Holding, a Lair, a Contract or an item.
_Avoid_: Object, Asset (in prose)

### Current game

**Company**:
A group of adventurers sharing a purse, equipment, renown and work.
_Avoid_: Party in prose; `Party` remains the code type.

**Company roster**:
The companies in town, including their arrival schedule, recruitment, joining other companies, disbanding and retirement. It alone changes company membership.

**Contract**:
Work posted by an employer to recover a threatened holding through a sequence of encounters.

**Bounty**:
Work posted by the guild to clear a lair through a sequence of encounters, and only when the guild's treasury meets the same threshold an employer needs to post a Contract.

**Board**:
The posted contracts and bounties. It is the only thing that links a holding, a lair, or a company to that work.

**Job intelligence**:
What is publicly known about a Contract or Bounty — whether its encounter count is known, and how many of its encounters are revealed — what each company has tried in order to learn that, and the ways of learning: a free attempt at the tavern, a divination, a paid round, reading the road, and taking stock on arrival.
_Avoid_: investigation as the name of this module.

**Expedition**:
One company's journey on an accepted contract or bounty, including travel, encounters, return and recovery unless the company is wiped out.

**Holding**:
An employer-owned asset that earns income while safe and can be threatened or ravaged.
_Avoid_: Asset in prose; `Asset` remains the code type.

**Lair**:
A threat's stronghold that sends raids, grows stronger when unanswered and can hold a hoard.

**Purse**:
A company's gold.

**Treasury**:
An employer's gold.

**Hoard**:
The gold and gear stored in a Lair.

**Loot**:
The gold and gear left at a Holding.

**Coin movement**:
Gold moving by a transfer between two holders, a source into the world, or a sink out of it. The reason decides which counters and lifetime statistics move with it.

**Bloodied**:
An adventurer at half or less of their maximum hit points.

**Short rest**:
The hour a company takes between two encounters of an expedition when at least one living adventurer is below their maximum hit points. Each living adventurer spends Hit Dice to recover hit points, the company decides whether to turn back, and then those still **Bloodied** drink a **Healing potion** if the company goes on. The game does not rest when everyone is unhurt.

**Hit Dice**:
An adventurer's pool of healing dice, as many as their level. Spent at a Short rest; every spent die returns at a Long rest. Gaining a level adds one die. Dying and being raised leave the pool as it was.

**Long rest**:
The rest a Company takes in town after an Expedition returns, lasting at least eight hours. It restores every living adventurer's hit points and all their Hit Dice. The game does not limit it to one per 24 hours.

**Healing potion**:
A draught from the company's shared supply that restores hit points to the adventurer who drinks it or receives it from a companion. It comes in four tiers (basic, greater, superior, supreme), healing 2d4+2, 4d4+4, 8d4+8 and 10d4+20. The company buys them from the apothecary at 50, 200, 2,000 and 20,000 gp; the apothecary makes each on demand, instantly, for a configured production cost out of its treasury (defaults 25, 100, 1,000 and 10,000 gp, independent of the selling price), and offers every tier for as long as it is not ruined. A company restocks until its supply can heal each living adventurer for half their maximum hit points, with at least one potion per adventurer, favouring the lower tiers; an adventurer drinks the smallest tier that covers the hit points they are missing, or the strongest if none does.

**Reward set-aside**:
The gold an employer has promised in the rewards of its open and taken Contracts and Bounties and not yet paid. It is kept out of what new rewards are sized from, and released when work is paid or fails (including an expired Contract). For a listed employer, both kinds use the configured treasury share of what is left, rounded down. A Contract is still at least 20 gp, so that minimum can exceed what is left and paying it can leave the treasury negative; a Bounty has no minimum and is never posted for zero or less. A listed employer posts a Bounty only when what is left meets the posting threshold; Contract thresholds still read the whole treasury. Employers outside the list size Bounties and check their threshold from the whole treasury. Only the apothecary sets its rewards aside by default; the rule is built so that any employer can.

**Assured healing**:
The healing a **Healing potion** tier is counted on for when buying and choosing: each die counts as half its faces plus 1, plus the fixed bonus (basic 8, greater 16, superior 32, supreme 50).

**Potion sharing policy**:
How a company orders its **Bloodied** adventurers when its supply is short: by company order, or fallen adventurers first and then the most hurt. Chosen once, when the company is constituted; a merger keeps the host's.

**Space**:
The squares a creature controls on the battlefield. In the 2024 rules a Huge creature's space is 15 by 15 feet (three squares) and a Gargantuan creature's space is 20 by 20 feet (four squares). The battlefield is 16 squares, 80 feet, on a side.

## Relationships

### Being model

- Social class is not modelled: it is how wealth happens to be spread among **Folks** and named **Beings**.
- Each **Folk** grows or shrinks by a rule of the world that reads its wealth and mood; its **Mind** only chooses how to react (emigrate, protest, join a **Faction**).
- A **Town** starts ruled by a sheriff. **Factions** that gain weight press for a say by **Actions** (petition, charter, revolt), and the **Government**'s form changes as they win it.
- Any **Being** that needs armed help may post a **Contract** (to save a **Holding**) or a **Bounty** (to clear a **Lair**), paid from its own gold. "Employer" is only the role of whoever posted it.
- The **Board** is a **Thing** whose **Owner** is the **Town**. Each posted job's **Owner** is the Being that posted it, and it answers the requests to take it.
- Several Contracts and Bounties may target the same threat, posted by different Beings; together they make clearing it more attractive.
- A **Contract** is a hire: a **Party** asks its poster to take it, and once taken it is that Party's alone. A **Bounty** is open: nobody takes it, and whoever shows its poster that the **Lair** is cleared claims the reward, which the poster, as its **Owner**, may pay or refuse. One Party may collect a Contract and a Bounty for the same deed, and Parties may race for one Bounty.
- The gold promised in a posted job is set aside in its poster's own state, so its **Nature** sees less gold free.

### Current game

- The **Board** posts, accepts, and ends each **Contract** and **Bounty**.
- **Job intelligence** is the only writer, after a job is posted, of what is publicly known about it and of what each company has tried in order to learn it.
- The **Company roster** admits companies, recruits adventurers, brings companies together and records disbanding and retirement.
- A **Company** accepts one **Contract** or **Bounty** at a time.
- An accepted **Contract** or **Bounty** starts one **Expedition**.
- A **Contract** concerns one **Holding**; a **Bounty** concerns one **Lair**.
- A **Lair** may threaten multiple **Holdings**.
- After each encounter round that does not end the fight, before checking whether to flee, the company's **Potion sharing policy** orders its **Bloodied** adventurers and each one in turn, if the supply is not empty, drinks one **Healing potion**. A fallen adventurer at 0 hit points who is not dead is given the potion by a conscious companion, chosen first in company order. If no companion is conscious, nobody uses a potion. **Bloodied** uses the maximum hit points in that fight, including items and blessings. The game does not check distance or spend a Bonus Action when administering a potion; D&D 2024 requires the companion to be within 5 feet and spend a Bonus Action.
- At a **Short rest**, each living adventurer first spends **Hit Dice**: as many as the company's pacing allows, one at a time, stopping at maximum hit points. The pacing spreads the remaining dice over the encounters still ahead, counting the most the job could hold when their number is not known. The company then decides whether to turn back, using the hit points the dice left. If it goes on, each living adventurer who is still **Bloodied**, in the order of the **Potion sharing policy**, drinks one **Healing potion** if the **Company** has one, whether or not they have dice left. An adventurer with no Hit Dice recovers nothing at the rest.
- An encounter places every creature it asked for, on a cell where that creature's **Space** lies on the battlefield and does not overlap another creature.

## Example dialogue

### Being model

> **Dev:** "The cleric is at half hit points. Does its **Nature** make it drink a **Healing potion**?"
> **Domain expert:** "No. The Nature only gives the **Need** to heal, more urgent in a dungeon than in town. The **Mind** chooses the **Action**: in a dungeon a potion, in town a night at the inn, since resting restores the hit points anyway."

> **Dev:** "Two **Parties** want the last potion. Who gets it?"
> **Domain expert:** "It is a **Claim**. The apothecary **Business** is the potions' **Owner**, so its **Mind**, which defers to its **Proprietor**, answers both requests. If the shop had no Owner left, a **Contest** would decide."

### Current game

> **Dev:** "Does the **Expedition** end when the **Company** wins the last encounter?"
> **Domain expert:** "No. The company must return, collect the **Contract** reward or **Bounty**, and rest. A wipe ends the expedition in the field."

> **Dev:** "Does an adventurer drink a **Healing potion** as soon as they are hurt?"
> **Domain expert:** "Only when **Bloodied**. In an encounter conscious adventurers drink between rounds before checking whether to flee; a fallen adventurer receives a potion from a conscious companion. Between encounters they take the **Short rest** first, spending **Hit Dice**, and drink only if they are still **Bloodied** afterwards and the company has not turned back."

## Flagged ambiguities

- Open: the being model has not yet named its gold. In the current game **Purse** is a company's gold and **Treasury** an employer's, but a **Town** now owns a treasury and a **Business**'s gold is kept apart from its **Proprietor**'s, with no name yet.
- Open: who inherits a **Business**, or any **Thing**, when its **Owner** or **Proprietor** dies. Until it is settled, the Thing simply has no Owner.

- In the current game a **Bounty** is accepted like a **Contract** and posted only by the guild. In the being model a Bounty is never taken: whoever clears the Lair claims it, and any Being may post one.
- Grouping a town's people into three wealth ranks (commoners, burghers, nobility) was considered and dropped: every conflict became rich against poor. People gather instead in **Folks** by ancestry and trade and in **Factions** by shared interest.
- The current game calls a group of adventurers a **Company** and avoids "party". The being model calls it a **Party**, because a **Business** is now a Being too and "company" reads as one. "Company" below describes the current game only.
- A **Lair** was described as growing stronger when unanswered. In the being model a Lair is a **Thing**: it is the **Beings** living in it (a horde, a boss) who grow; an emptied Lair stays a place another horde can take.
