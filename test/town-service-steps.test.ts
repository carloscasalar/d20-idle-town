import { expect, it } from 'vitest';
import { createParty } from '../src/adventurers/party';
import { Rng } from '../src/core/rng';
import { emptyGoldStatistics } from '../src/town/coin';
import { buyPotions, buyArmour, visitTownServices, type TownServiceStep, type TownServiceContext } from '../src/town/services';
import { generateTown } from '../src/town/town';

it('inserts a made-up service between potions and armour using only the supplied list', () => {
  const rng = new Rng(1);
  const town = generateTown(rng);
  const company = createParty(rng, 1, 4, 0);
  company.gold = 10000;
  const events: string[] = [];
  const context: TownServiceContext = {
    town, day: 1, ledger: { itemsSold: 0 }, statistics: emptyGoldStatistics(),
    report: (event) => events.push(event.text),
  };
  let shoeCleaning = 0;
  let spendsHour = true;
  const cleanShoes: TownServiceStep = (p) => {
    expect(p.potions).toBe(4);
    expect(p.members.every((h) => h.armorTier === 0)).toBe(true);
    shoeCleaning += 1;
    return spendsHour;
  };
  const steps = [buyPotions, cleanShoes, buyArmour];
  expect(visitTownServices(company, context, steps)).toBe(true);
  expect(company.potions).toBe(4);
  expect(shoeCleaning).toBe(0);
  expect(visitTownServices(company, context, steps)).toBe(true);
  expect(shoeCleaning).toBe(1);
  expect(events).toHaveLength(1);
  expect(company.members.every((h) => h.armorTier === 0)).toBe(true);
  spendsHour = false;
  expect(visitTownServices(company, context, steps)).toBe(true);
  expect(shoeCleaning).toBe(2);
  expect(company.members.every((h) => h.armorTier === 1)).toBe(true);
  expect(events).toHaveLength(2);
  expect(visitTownServices(company, context, [])).toBe(false);
});
