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

**Expedition**:
One company's journey on an accepted contract or bounty, including travel, encounters, return and recovery unless the company is wiped out.

**Holding**:
An employer-owned asset that earns income while safe and can be threatened or ravaged.
_Avoid_: Asset in prose; `Asset` remains the code type.

**Lair**:
A threat's stronghold that sends raids, grows stronger when unanswered and can hold lost loot.

**Bloodied**:
An adventurer at half or less of their maximum hit points.

**Short rest**:
The recovery a company takes between two encounters of an expedition.
Implemented by `shortRest`: heals a configured fraction of maximum hit points (default 0.5), rounded up.

**Healing potion**:
A draught from the company's shared supply that restores hit points to the adventurer who drinks it.

## Relationships

- A **Company** accepts one **Contract** or **Bounty** at a time.
- An accepted **Contract** or **Bounty** starts one **Expedition**.
- A **Contract** concerns one **Holding**; a **Bounty** concerns one **Lair**.
- A **Lair** may threaten multiple **Holdings**.
- After each encounter round that does not end the fight, before checking whether to flee, each living **Bloodied** adventurer drinks one **Healing potion** if the **Company** has one. **Bloodied** uses the maximum hit points in that fight, including items and blessings; healing uses the game's `potionHeal` amount.
- After the healing from a **Short rest**, each living adventurer who is still **Bloodied** drinks one **Healing potion** if the **Company** has one. The default rest fraction brings every living adventurer above half, so this applies only with a smaller configured fraction.

## Example dialogue

> **Dev:** "Does the **Expedition** end when the **Company** wins the last encounter?"
> **Domain expert:** "No. The company must return, collect the **Contract** reward or **Bounty**, and rest. A wipe ends the expedition in the field."

> **Dev:** "Does an adventurer drink a **Healing potion** as soon as they are hurt?"
> **Domain expert:** "Only when **Bloodied**. In an encounter they drink between rounds before checking whether to flee; between encounters they take the **Short rest** first and drink only if they are still **Bloodied** afterwards."
