# d20 Town

A town simulation where companies take paid work from employers while holdings and lairs change around them.

## Language

**Company**:
A group of adventurers sharing a purse, equipment, renown and work.
_Avoid_: Party in prose; `Party` remains the code type.

**Contract**:
Work posted by an employer to recover a threatened holding through a sequence of encounters.

**Bounty**:
Work posted by the guild to clear a lair through a sequence of encounters.

**Board**:
The posted contracts and bounties. It is the only thing that links a holding, a lair, or a company to that work.

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
The recovery a company takes between two encounters of an expedition.
Implemented by `shortRest`: heals a configured fraction of maximum hit points (default 0.5), rounded up.

**Healing potion**:
A draught from the company's shared supply that restores hit points to the adventurer who drinks it or receives it from a companion.

## Relationships

- The **Board** posts, accepts, and ends each **Contract** and **Bounty**.
- A **Company** accepts one **Contract** or **Bounty** at a time.
- An accepted **Contract** or **Bounty** starts one **Expedition**.
- A **Contract** concerns one **Holding**; a **Bounty** concerns one **Lair**.
- A **Lair** may threaten multiple **Holdings**.
- After each encounter round that does not end the fight, before checking whether to flee, each conscious **Bloodied** adventurer drinks one **Healing potion** if the **Company** has one. A fallen adventurer at 0 hit points who is not dead is given the potion by a conscious companion, chosen first in company order. If no companion is conscious, nobody uses a potion. **Bloodied** uses the maximum hit points in that fight, including items and blessings; healing uses the game's `potionHeal` amount. The game does not check distance or spend a Bonus Action when administering a potion; D&D 2024 requires the companion to be within 5 feet and spend a Bonus Action.
- After the healing from a **Short rest**, each living adventurer who is still **Bloodied** drinks one **Healing potion** if the **Company** has one. The default rest fraction brings every living adventurer above half, so this applies only with a smaller configured fraction.

## Example dialogue

> **Dev:** "Does the **Expedition** end when the **Company** wins the last encounter?"
> **Domain expert:** "No. The company must return, collect the **Contract** reward or **Bounty**, and rest. A wipe ends the expedition in the field."

> **Dev:** "Does an adventurer drink a **Healing potion** as soon as they are hurt?"
> **Domain expert:** "Only when **Bloodied**. In an encounter conscious adventurers drink between rounds before checking whether to flee; a fallen adventurer receives a potion from a conscious companion. Between encounters they take the **Short rest** first and drink only if they are still **Bloodied** afterwards."
