import { expect, it } from 'vitest';
import { parseDice, rollDice, assuredHealing } from '../src/core/dice';
import { Rng } from '../src/core/rng';

it('parses a dice formula and rolls from an inclusive scripted source', () => {
  expect(parseDice('2d4+2')).toEqual({ count: 2, faces: 4, bonus: 2 });
  const values = [1, 4];
  expect(rollDice('2d4+2', { int(min, max) {
    expect([min, max]).toEqual([1, 4]);
    return values.shift()!;
  } })).toEqual({ dice: [1, 4], bonus: 2, total: 7 });
});

it.each([['2d4+2', 8], ['4d4+4', 16], ['8d4+8', 32], ['10d4+20', 50]] as const)(
  'derives assured healing for %s', (formula, healing) => {
    expect(assuredHealing(formula)).toBe(healing);
  },
);

it('supports unmodified and negative-bonus dice', () => {
  expect(parseDice('1d6')).toEqual({ count: 1, faces: 6, bonus: 0 });
  expect(rollDice('1d6-3', { int: () => 1 }).total).toBe(-2);
});

it.each(['d6', '2d4 + 2', '2d4+2oops', '0d4', '1d0', '1.5d6', '9007199254740992d4'])('rejects invalid formula %s', (formula) => {
  expect(() => parseDice(formula)).toThrow(/Invalid dice formula/);
});

it('rolls reproducibly within the formula bounds using the game RNG', () => {
  const first = new Rng(42);
  const second = new Rng(42);
  const totals = Array.from({ length: 100 }, () => rollDice('2d4+2', first).total);
  expect(totals).toEqual(Array.from({ length: 100 }, () => rollDice('2d4+2', second).total));
  expect(Math.min(...totals)).toBe(4);
  expect(Math.max(...totals)).toBe(10);
});
