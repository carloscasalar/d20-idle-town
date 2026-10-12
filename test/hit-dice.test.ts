import { buildHero, HERO_CLASS_NAMES } from 'battlecast-engine';
import { expect, it } from 'vitest';
import { createHero, gainXp, killHero, resurrectHero, DEFAULT_HERO_ECONOMY } from '../src/adventurers/hero';
import { parseHitPointFormula, spendHitDice, pacedHitDice, rollHitDie } from '../src/adventurers/hit-dice';
import { Rng } from '../src/core/rng';

it('derives the Hit Die and Constitution from the engine HP formula', () => {
  expect(parseHitPointFormula('5d10+10')).toEqual({ faces: 10, constitution: 2 });
  const expectedFaces = [12, 8, 8, 8, 10, 8, 10, 10, 8, 6, 8, 6];
  expect(HERO_CLASS_NAMES.map((name) => parseHitPointFormula(buildHero(name, 5).hpFormula)))
    .toEqual(expectedFaces.map((faces) => ({ faces, constitution: 2 })));
});

it.each(['5d10 + 10', '5d10+11', 'HP 44', '0d10+0'])('rejects changed engine formula %s clearly', (formula) => {
  expect(() => parseHitPointFormula(formula)).toThrow(/Unsupported engine hpFormula/);
});

it('heals at least one HP from each Hit Die even with negative Constitution', () => {
  expect(rollHitDie({ faces: 6, constitution: -3 }, { int: () => 1 })).toEqual({ dice: [1], bonus: -3, total: 1 });
});

it.each([[5, 3, 2], [4, 2, 2], [1, 6, 1], [0, 3, 0]])('paces %s remaining dice over %s encounters with quota %s', (remaining, ahead, quota) => {
  expect(pacedHitDice(createHero(new Rng(1), 5), remaining!, ahead!)).toBe(quota);
});

it('stops spending at the quota and leaves the input hero unchanged', () => {
  const hero = createHero(new Rng(1), 5, 'Fighter');
  hero.hp = 1;
  hero.hitDiceSpent = 1;
  expect(spendHitDice(hero, 3, { int: () => 4 }, pacedHitDice)).toEqual({
    hp: 13, hitDiceSpent: 3, rolls: [{ dice: [4], bonus: 2, total: 6 }, { dice: [4], bonus: 2, total: 6 }],
  });
  expect([hero.hp, hero.hitDiceSpent]).toEqual([1, 1]);
});

it('stops at maximum HP without rolling more dice', () => {
  const hero = createHero(new Rng(1), 5, 'Fighter');
  hero.hp = hero.maxHp - 2;
  const values = [1];
  const result = spendHitDice(hero, 1, { int: () => {
    if (!values.length) throw new Error('unexpected extra draw');
    return values.shift()!;
  } }, pacedHitDice);
  expect(result).toEqual({ hp: hero.maxHp, hitDiceSpent: 1, rolls: [{ dice: [1], bonus: 2, total: 3 }] });
});

it('allows another pacing strategy but never spends more dice than remain', () => {
  const hero = createHero(new Rng(1), 2, 'Fighter');
  hero.hp = 1;
  hero.hitDiceSpent = 1;
  expect(spendHitDice(hero, 5, { int: () => 2 }, () => 100)).toEqual({
    hp: 5, hitDiceSpent: 2, rolls: [{ dice: [2], bonus: 2, total: 4 }],
  });
});

it.each(['exhausted', 'unhurt', 'dead'])('does not heal or draw for an %s hero', (state) => {
  const hero = createHero(new Rng(1), 2, 'Fighter');
  if (state === 'exhausted') { hero.hp = 1; hero.hitDiceSpent = 2; }
  if (state === 'dead') killHero(hero);
  expect(spendHitDice(hero, 1, { int: () => { throw new Error('unexpected draw'); } }, pacedHitDice)).toEqual({
    hp: hero.hp, hitDiceSpent: hero.hitDiceSpent, rolls: [],
  });
});

it('starts unspent, keeps spent dice on level-up, and gains one remaining die', () => {
  const hero = createHero(new Rng(1), 1, 'Fighter');
  expect(hero.hitDiceSpent).toBe(0);
  hero.hitDiceSpent = 1;
  expect(gainXp(hero, 300)).toBe(1);
  expect([hero.level, hero.hitDiceSpent]).toEqual([2, 1]);
  hero.hp = 1;
  expect(spendHitDice(hero, 1, { int: () => 3 }, pacedHitDice)).toEqual({
    hp: 6, hitDiceSpent: 2, rolls: [{ dice: [3], bonus: 2, total: 5 }],
  });
});

it('leaves spent dice alone through death and resurrection', () => {
  const hero = createHero(new Rng(1), 3, 'Cleric');
  hero.hitDiceSpent = 2;
  killHero(hero);
  expect(hero.hitDiceSpent).toBe(2);
  resurrectHero(hero, DEFAULT_HERO_ECONOMY);
  expect(hero.hitDiceSpent).toBe(2);
});
