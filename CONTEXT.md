# d20 Town

A town simulation where companies take paid work from employers while holdings and lairs change around them.

## Language

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

> **Dev:** "Does the **Expedition** end when the **Company** wins the last encounter?"
> **Domain expert:** "No. The company must return, collect the **Contract** reward or **Bounty**, and rest. A wipe ends the expedition in the field."

> **Dev:** "Does an adventurer drink a **Healing potion** as soon as they are hurt?"
> **Domain expert:** "Only when **Bloodied**. In an encounter conscious adventurers drink between rounds before checking whether to flee; a fallen adventurer receives a potion from a conscious companion. Between encounters they take the **Short rest** first, spending **Hit Dice**, and drink only if they are still **Bloodied** afterwards and the company has not turned back."
