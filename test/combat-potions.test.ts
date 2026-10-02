import { describe, expect, it } from 'vitest';
import { createHero, isBloodied } from '../src/adventurers/hero';
import { runCombat } from '../src/combat/battlecast';
import { Rng } from '../src/core/rng';
import { instantiate, ITEM_CATALOGUE } from '../src/items/items';
import type { EncounterSpec } from '../src/quests/encounters';

const goblins: EncounterSpec = {
  difficulty: 'intermediate',
  monsters: [{ name: 'Goblin Warrior', count: 4, xpEach: 50 }, { name: 'Goblin Boss', count: 1, xpEach: 200 }],
  totalXp: 400,
  tier: 'Moderate',
};

function company() {
  const rng = new Rng(9);
  return (['Rogue', 'Rogue', 'Wizard', 'Wizard'] as const).map((cls) => createHero(rng, 3, cls));
}

describe('Bloodied', () => {
  it.each([
    { hp: 10, maxHp: 20, expected: true },
    { hp: 11, maxHp: 20, expected: false },
    { hp: 10, maxHp: 21, expected: true },
    { hp: 11, maxHp: 21, expected: false },
  ])('recognises $hp of $maxHp HP', ({ hp, maxHp, expected }) => {
    expect(isBloodied({ hp, maxHp })).toBe(expected);
  });
});

describe('potions in a real encounter', () => {
  it('lets a conscious hero drink when they become Bloodied at exactly half HP between rounds', () => {
    const heroes = company();
    // Seed 2: Lysander takes 10 damage in round 1, leaving 10 of 20 HP.
    const dry = runCombat(heroes, goblins, 2, { potions: 0 });
    const supplied = runCombat(heroes, goblins, 2, { potions: 4 });
    const drink = `${heroes[2]!.name} drinks a healing potion.`;

    expect(dry.rounds).toBeGreaterThan(1);
    expect(dry.heroes[2]!.hp).toBe(10);
    expect(supplied.potionsDrunk).toBe(1);
    expect(supplied.heroes[2]!.hp).toBe(18);
    expect(supplied.lines.filter((line) => line === drink)).toHaveLength(1);
    expect(supplied.lines.indexOf(drink)).toBeGreaterThan(supplied.lines.indexOf('--- Round 1 ---'));
    expect(supplied.lines.indexOf(drink)).toBeLessThan(supplied.lines.indexOf('--- Round 2 ---'));
    expect(heroes[2]!.hp).toBe(20);
  });

  it('has the first conscious companion administer a potion to a hero at 0 HP', () => {
    const heroes = company();
    // Seed 1: Lysander falls in round 1; Nym and the other companions remain conscious.
    const dry = runCombat(heroes, goblins, 1, { potions: 0, noRetreat: true });
    const supplied = runCombat(heroes, goblins, 1, { potions: 1, noRetreat: true });
    const administered = `${heroes[0]!.name} gives ${heroes[2]!.name} a healing potion.`;

    expect(dry.winner).toBe('monsters');
    expect(supplied.winner).toBe('party');
    expect(supplied.potionsDrunk).toBe(1);
    expect(supplied.lines.some((line) => line.includes(`${heroes[2]!.name} drops to 0 HP`))).toBe(true);
    expect(supplied.lines.filter((line) => line === administered)).toHaveLength(1);
    expect(supplied.lines.indexOf(administered)).toBeGreaterThan(supplied.lines.indexOf('--- Round 1 ---'));
    expect(supplied.lines.indexOf(administered)).toBeLessThan(supplied.lines.indexOf('--- Round 2 ---'));
    expect(supplied.lines).not.toContain(`${heroes[2]!.name} drinks a healing potion.`);
  });

  it('uses no potion when the only hero is unconscious at 0 HP', () => {
    const hero = createHero(new Rng(9), 1, 'Wizard');
    const loneGoblin: EncounterSpec = { ...goblins, monsters: [{ name: 'Goblin Warrior', count: 1, xpEach: 50 }], totalXp: 50 };
    const result = runCombat([hero], loneGoblin, 1, { potions: 4, noRetreat: true });

    expect(result.rounds).toBeGreaterThan(1);
    expect(result.lines).toContain(`${hero.name} is unconscious and cannot act!`);
    expect(result.potionsDrunk).toBe(0);
    expect(result.lines.some((line) => line.includes('healing potion'))).toBe(false);
    expect(result.heroes[0]).toMatchObject({ hp: 0, alive: false });
  });

  it('drinks nothing with an empty supply', () => {
    const result = runCombat(company(), goblins, 2, { potions: 0 });

    expect(result.potionsDrunk).toBe(0);
    expect(result.lines.some((line) => line.includes('healing potion'))).toBe(false);
  });

  it.each(['blessing', 'item'] as const)('includes the %s bonus in the Bloodied maximum', (bonus) => {
    const heroes = company();
    const blessingHp = bonus === 'blessing' ? 20 : 0;
    if (bonus === 'item') {
      const rng = new Rng(10);
      const amulet = ITEM_CATALOGUE.find((item) => item.name === 'Amulet of Health')!;
      for (const hero of heroes) hero.items.push(instantiate(rng, amulet));
    }
    // Seed 1 deals 21 damage in round 1: 19 of 40 HP, above half of the base 20.
    const result = runCombat(heroes, goblins, 1, { potions: 1, blessingHp, noRetreat: true });
    const drink = `${heroes[2]!.name} drinks a healing potion.`;

    expect(result.potionsDrunk).toBe(1);
    expect(result.lines.indexOf(drink)).toBeGreaterThan(result.lines.indexOf('--- Round 1 ---'));
    expect(result.lines.indexOf(drink)).toBeLessThan(result.lines.indexOf('--- Round 2 ---'));
  });

  it('does not overdraw a shared supply when multiple heroes need healing', () => {
    const heroes = company();
    const plentiful = runCombat(heroes, goblins, 4, { potions: 10, noRetreat: true });
    const limited = runCombat(heroes, goblins, 4, { potions: 1, noRetreat: true });

    expect(plentiful.potionsDrunk).toBeGreaterThan(1);
    expect(limited.potionsDrunk).toBe(1);
    expect(limited.lines.filter((line) => line.includes('healing potion'))).toHaveLength(1);
  });
});
