import { describe, expect, it } from 'vitest';
import { choosePotion, describePack, type PotionTier } from '../src/adventurers/potions';

const tiers: readonly PotionTier[] = [
  { name: 'basic', formula: '2d4+2', price: 50 },
  { name: 'greater', formula: '4d4+4', price: 200 },
  { name: 'superior', formula: '8d4+8', price: 2000 },
  { name: 'supreme', formula: '10d4+20', price: 20000 },
];

describe('choosing a healing potion', () => {
  it('drinks the smallest tier whose assured healing covers the hit points missing', () => {
    const pack = { basic: 1, greater: 1, superior: 1, supreme: 1 };

    expect(choosePotion(pack, tiers, { hp: 12, maxHp: 20, fallen: false })?.name).toBe('basic');
    expect(choosePotion(pack, tiers, { hp: 11, maxHp: 20, fallen: false })?.name).toBe('greater');
    expect(choosePotion(pack, tiers, { hp: 3, maxHp: 20, fallen: false })?.name).toBe('superior');
    expect(choosePotion(pack, tiers, { hp: 0, maxHp: 50, fallen: false })?.name).toBe('supreme');
  });

  it('drinks the strongest tier in the pack when none covers the wound', () => {
    expect(choosePotion({ basic: 2, greater: 1 }, tiers, { hp: 0, maxHp: 51, fallen: false })?.name).toBe('greater');
  });

  it('counts a fallen hero as missing their whole maximum, even when hit points are below zero', () => {
    const catalogue: readonly PotionTier[] = [
      { name: 'mend', formula: '4d4+4', price: 200 },
      { name: 'close', formula: '2d4+16', price: 400 },
      { name: 'flood', formula: '8d4+8', price: 2000 },
    ];
    const pack = { mend: 1, close: 1, flood: 1 };

    expect(choosePotion(pack, catalogue, { hp: -8, maxHp: 20, fallen: true })?.name).toBe('close');
    expect(choosePotion(pack, catalogue, { hp: 0, maxHp: 20, fallen: true })?.name).toBe('close');
  });

  it('ignores an empty count and a tier the pack does not hold', () => {
    expect(choosePotion({ basic: 0, supreme: 1 }, tiers, { hp: 19, maxHp: 20, fallen: false })?.name).toBe('supreme');
    expect(choosePotion({}, tiers, { hp: 1, maxHp: 20, fallen: false })).toBeUndefined();
  });

  it('ranks tiers by assured healing when the catalogue lists a stronger tier first', () => {
    const reversed = [...tiers].reverse();

    expect(choosePotion({ basic: 1, supreme: 1 }, reversed, { hp: 19, maxHp: 20, fallen: false })?.name).toBe('basic');
  });
});

describe('reading a pack', () => {
  it('lists the tiers a company holds, in catalogue order', () => {
    expect(describePack({ greater: 1, basic: 2, superior: 0 }, tiers)).toBe('2 basic, 1 greater');
    expect(describePack({}, tiers)).toBe('0 potions');
  });
});
