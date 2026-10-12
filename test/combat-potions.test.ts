import { describe, expect, it } from 'vitest';
import { createHero, isBloodied } from '../src/adventurers/hero';
import { DEFAULT_POTION_CONFIG, type PotionConfig } from '../src/adventurers/potions';
import { runCombat } from '../src/combat/battlecast';
import type { DiceSource } from '../src/core/dice';
import { Rng } from '../src/core/rng';
import { instantiate, ITEM_CATALOGUE } from '../src/items/items';
import type { EncounterSpec } from '../src/quests/encounters';
import type { Quest } from '../src/quests/quest';
import { Game } from '../src/sim/game';
import { createParty } from '../src/adventurers/party';
import { DEFAULT_POLICIES_CONFIG } from '../src/adventurers/policies';
import { COMBAT_RULES, STARTING_GOLD } from './helpers/supplied-config';

/** 3 and 3 make 2d4+2 equal 8, the old heal of a 20 HP hero. */
const eights: DiceSource = { int: () => 3 };

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
    const dry = runCombat(heroes, goblins, 2, { ...COMBAT_RULES, potions: {}, dice: eights });
    const supplied = runCombat(heroes, goblins, 2, { ...COMBAT_RULES, potions: { basic: 4 }, dice: eights });
    const drink = `${heroes[2]!.name} drinks a basic healing potion (2d4+2: 8).`;

    expect(dry.rounds).toBeGreaterThan(1);
    expect(dry.heroes[2]!.hp).toBe(10);
    expect(supplied.potionsDrunk).toEqual({ basic: 1 });
    expect(supplied.heroes[2]!.hp).toBe(18);
    expect(supplied.lines.filter((line) => line === drink)).toHaveLength(1);
    expect(supplied.lines.indexOf(drink)).toBeGreaterThan(supplied.lines.indexOf('--- Round 1 ---'));
    expect(supplied.lines.indexOf(drink)).toBeLessThan(supplied.lines.indexOf('--- Round 2 ---'));
    expect(heroes[2]!.hp).toBe(20);
  });

  it('has the first conscious companion administer a potion to a hero at 0 HP', () => {
    const heroes = company();
    // Seed 1: Lysander falls in round 1; Nym and the other companions remain conscious.
    const dry = runCombat(heroes, goblins, 1, { ...COMBAT_RULES, potions: {}, dice: eights, noRetreat: true });
    const supplied = runCombat(heroes, goblins, 1, { ...COMBAT_RULES, potions: { basic: 1 }, dice: eights, noRetreat: true });
    const administered = `${heroes[0]!.name} gives ${heroes[2]!.name} a basic healing potion (2d4+2: 8).`;

    expect(dry.winner).toBe('monsters');
    expect(supplied.winner).toBe('party');
    expect(supplied.potionsDrunk).toEqual({ basic: 1 });
    expect(supplied.lines.some((line) => line.includes(`${heroes[2]!.name} drops to 0 HP`))).toBe(true);
    expect(supplied.lines.filter((line) => line === administered)).toHaveLength(1);
    expect(supplied.lines.indexOf(administered)).toBeGreaterThan(supplied.lines.indexOf('--- Round 1 ---'));
    expect(supplied.lines.indexOf(administered)).toBeLessThan(supplied.lines.indexOf('--- Round 2 ---'));
    expect(supplied.lines.some((line) => line.startsWith(`${heroes[2]!.name} drinks`))).toBe(false);
  });

  it('uses no potion when the only hero is unconscious at 0 HP', () => {
    const hero = createHero(new Rng(9), 1, 'Wizard');
    const loneGoblin: EncounterSpec = { ...goblins, monsters: [{ name: 'Goblin Warrior', count: 1, xpEach: 50 }], totalXp: 50 };
    const result = runCombat([hero], loneGoblin, 1, { ...COMBAT_RULES, potions: { basic: 4 }, dice: eights, noRetreat: true });

    expect(result.rounds).toBeGreaterThan(1);
    expect(result.lines).toContain(`${hero.name} is unconscious and cannot act!`);
    expect(result.potionsDrunk).toEqual({});
    expect(result.lines.some((line) => line.includes('healing potion'))).toBe(false);
    expect(result.heroes[0]).toMatchObject({ hp: 0, alive: false });
  });

  it('drinks nothing with an empty supply', () => {
    const result = runCombat(company(), goblins, 2, { ...COMBAT_RULES, potions: {}, dice: eights });

    expect(result.potionsDrunk).toEqual({});
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
    const result = runCombat(heroes, goblins, 1, { ...COMBAT_RULES, potions: { basic: 1 }, dice: eights, blessingHp, noRetreat: true });
    const drink = `${heroes[2]!.name} drinks a basic healing potion (2d4+2: 8).`;

    expect(result.potionsDrunk).toEqual({ basic: 1 });
    expect(result.lines.indexOf(drink)).toBeGreaterThan(result.lines.indexOf('--- Round 1 ---'));
    expect(result.lines.indexOf(drink)).toBeLessThan(result.lines.indexOf('--- Round 2 ---'));
  });

  it('does not overdraw a shared supply when multiple heroes need healing', () => {
    const heroes = company();
    const plentiful = runCombat(heroes, goblins, 4, { ...COMBAT_RULES, potions: { basic: 10 }, dice: eights, noRetreat: true });
    const limited = runCombat(heroes, goblins, 4, { ...COMBAT_RULES, potions: { basic: 1 }, dice: eights, noRetreat: true });

    expect(Object.values(plentiful.potionsDrunk).reduce((sum, count) => sum + count, 0)).toBeGreaterThan(1);
    expect(limited.potionsDrunk).toEqual({ basic: 1 });
    expect(limited.lines.filter((line) => line.includes('healing potion'))).toHaveLength(1);
  });

  it('keeps the engine log identical until the first drink whether the potion rolls low or high', () => {
    const low = runCombat(company(), goblins, 2, { ...COMBAT_RULES, potions: { basic: 4 }, dice: { int: () => 1 } });
    const high = runCombat(company(), goblins, 2, { ...COMBAT_RULES, potions: { basic: 4 }, dice: { int: () => 4 } });
    const lowDrink = low.lines.find((line) => line.includes('healing potion'))!;
    const highDrink = high.lines.find((line) => line.includes('healing potion'))!;

    expect(lowDrink).toContain('(2d4+2: 4)');
    expect(highDrink).toContain('(2d4+2: 10)');
    expect(low.lines.slice(0, low.lines.indexOf(lowDrink))).toEqual(high.lines.slice(0, high.lines.indexOf(highDrink)));
  });

  it('drinks the tier that covers the fight maximum, which the base maximum would not', () => {
    const heroes = company();
    const result = runCombat(heroes, goblins, 1, {
      ...COMBAT_RULES,
      potions: { basic: 1, greater: 1, superior: 1 },
      dice: eights,
      blessingHp: 20,
      noRetreat: true,
    });
    const drinks = result.lines.filter((line) => line.includes('healing potion'));

    expect(drinks[0]).toBe(`${heroes[2]!.name} drinks a superior healing potion (8d4+8: 32).`);
    expect(result.potionsDrunk).toEqual({ superior: 1, greater: 1 });
  });

  it('leaves the engine log unchanged when two formulas heal the same total with different numbers of dice', () => {
    const twoDice: PotionConfig = { tiers: [{ name: 'basic', formula: '2d4+2', price: 50 }] };
    const oneDie: PotionConfig = { tiers: [{ name: 'basic', formula: '1d4+4', price: 50 }] };
    const many = runCombat(company(), goblins, 2, {
      ...COMBAT_RULES, catalogue: twoDice, potions: { basic: 4 }, dice: { int: () => 3 },
    });
    const few = runCombat(company(), goblins, 2, {
      ...COMBAT_RULES, catalogue: oneDie, potions: { basic: 4 }, dice: { int: () => 4 },
    });

    expect(many.lines.some((line) => line.includes('(2d4+2: 8)'))).toBe(true);
    expect(few.lines.some((line) => line.includes('(1d4+4: 8)'))).toBe(true);
    expect(many.lines.filter((line) => !line.includes('healing potion'))).toEqual(
      few.lines.filter((line) => !line.includes('healing potion')),
    );
  });

  it('rolls the drink on the child generator taken after placement', () => {
    const heroes = company();
    const result = runCombat(heroes, goblins, 2, { ...COMBAT_RULES, potions: { basic: 4 } });

    expect(result.lines.filter((line) => line.includes('healing potion'))).toEqual([
      `${heroes[2]!.name} drinks a basic healing potion (2d4+2: 6).`,
    ]);
    expect(result.heroes.map((hero) => hero.hp)).toEqual([24, 24, 16, 20]);
    expect(result.potionsDrunk).toEqual({ basic: 1 });

    // Seed 2's single 2d4+2 totals 6 on the setup generator too. Seed 4 drinks twice.
    const longer = runCombat(company(), goblins, 4, { ...COMBAT_RULES, potions: { basic: 8 }, noRetreat: true });
    expect(longer.lines.filter((line) => line.includes('healing potion'))).toEqual([
      `${heroes[2]!.name} drinks a basic healing potion (2d4+2: 5).`,
      `${heroes[0]!.name} gives ${heroes[2]!.name} a basic healing potion (2d4+2: 10).`,
    ]);
    expect(longer.heroes.map((hero) => hero.hp)).toEqual([24, 24, 10, 8]);
    expect(longer.potionsDrunk).toEqual({ basic: 2 });
  });
});

describe('combat potion dice wired by the game', () => {
  it('advances the world stream by one combat seed whether or not potions are rolled', () => {
    const dry = fightThroughTheGame({});
    const supplied = fightThroughTheGame({ basic: 8 });

    expect(supplied.drinks).toBeGreaterThan(0);
    expect(dry.drinks).toBe(0);
    expect(dry.before).toEqual(supplied.before);
    expect(dry.after).toEqual(supplied.after);
  });
});

function fightThroughTheGame(potions: { basic?: number }): { before: { s: number }; after: { s: number }; drinks: number } {
  const party = createParty(new Rng(1), 3, 4, 0, STARTING_GOLD, DEFAULT_POLICIES_CONFIG.potionSharing);
  party.members = company();
  party.potions = potions;
  party.status = 'questing';
  party.questId = 'q-potions';
  party.gold = 0;
  const quest: Quest = {
    id: 'q-potions', kind: 'contract', title: 'Clear the road', place: 'Stonebridge',
    giverId: 'employer', assetId: null, lairId: null, theme: 'goblins', level: 1,
    encounters: [goblins], revealed: 1, countRevealed: true,
    reward: 100, itemReward: null, guildOnly: false, status: 'taken', partyId: party.id, postedAt: 0,
  };
  const game = Game.forTesting({
    seed: 9,
    roster: { maxCompanies: 1, firstArrivalTick: 1000 },
    world: { maxOpenQuests: 0 },
  }, (scenario) => {
    scenario.lairs = [];
    scenario.parties = [party];
    scenario.quests = [quest];
    for (const employer of scenario.town.employers) {
      employer.stock = [];
      employer.restockIn = 1000;
    }
  });
  const before = JSON.parse(game.regressionState()).rng as { s: number };
  game.step();
  const detail = game.view().events.flatMap((event) => event.detail ?? []);
  const after = JSON.parse(game.regressionState()).rng as { s: number };
  return { before, after, drinks: detail.filter((line) => line.includes('healing potion')).length };
}
