import { describe, expect, it } from 'vitest';
import { describePack, drinkPotion, type PotionTier } from '../src/adventurers/potions';

const tiers: readonly PotionTier[] = [
  { name: 'basic', formula: '2d4+2', price: 50, productionCost: 25, productionTicks: 0 },
  { name: 'greater', formula: '4d4+4', price: 200, productionCost: 100, productionTicks: 0 },
  { name: 'superior', formula: '8d4+8', price: 2000, productionCost: 1000, productionTicks: 0 },
  { name: 'supreme', formula: '10d4+20', price: 20000, productionCost: 10000, productionTicks: 0 },
];

describe('drinking a healing potion', () => {
  it('rolls the formula on the dice it is given, takes one from the pack, and gives the drink', () => {
    const pack = { basic: 2 };
    const drink = drinkPotion(pack, tiers[0]!, { int: () => 3 }, 'Ann');

    expect(drink).toEqual({ total: 8, text: 'Ann drinks a basic healing potion (2d4+2: 8).' });
    expect(pack).toEqual({ basic: 1 });
  });

  it('names the companion when the potion is given', () => {
    const pack = { basic: 1 };
    const drink = drinkPotion(pack, tiers[0]!, { int: () => 4 }, 'Cid', 'Ann');

    expect(drink).toEqual({ total: 10, text: 'Ann gives Cid a basic healing potion (2d4+2: 10).' });
    expect(pack).toEqual({});
  });

  it('rolls a different total when it is given a different generator', () => {
    const low = drinkPotion({ greater: 1 }, tiers[1]!, { int: () => 1 }, 'Bev');
    const high = drinkPotion({ greater: 1 }, tiers[1]!, { int: () => 4 }, 'Bev');

    expect(low).toEqual({ total: 8, text: 'Bev drinks a greater healing potion (4d4+4: 8).' });
    expect(high).toEqual({ total: 20, text: 'Bev drinks a greater healing potion (4d4+4: 20).' });
  });
});

describe('reading a pack', () => {
  it('lists the tiers a company holds, in catalogue order', () => {
    expect(describePack({ greater: 1, basic: 2, superior: 0 }, tiers)).toBe('2 basic, 1 greater');
    expect(describePack({}, tiers)).toBe('0 potions');
  });
});
