import { describe, expect, it } from 'vitest';
import { createHero, equipItem, heroAc, wantsItem } from '../src/adventurers/hero';
import { heroOverrides, runCombat } from '../src/combat/battlecast';
import { Rng } from '../src/core/rng';
import { instantiate, ITEM_CATALOGUE, rollLootItem, rollStockItem } from '../src/items/items';
import { COMBAT_RULES } from './helpers/supplied-config';
import { DEFAULT_ITEM_CONFIG } from '../src/items/items';

const itemRng = new Rng(90);
const byName = (name: string) => instantiate(itemRng, ITEM_CATALOGUE.find((t) => t.name === name)!);

describe('magic items', () => {
  it('translate into engine overrides', () => {
    const fighter = createHero(new Rng(1), 3, 'Fighter');
    const baseAc = heroAc(fighter);
    equipItem(fighter, byName('Longsword +1'));
    equipItem(fighter, byName('Shield +1'));
    equipItem(fighter, byName('Ring of Fire Resistance'));
    const o = heroOverrides(fighter, { blessingHp: 9 });
    expect(o.acOverride).toBe(baseAc + 1);
    expect(o.hpOverride).toBe(fighter.maxHp + 9);
    expect(o.additionalResistances).toEqual(['fire']);
    expect(o.weapon?.name).toBe('Longsword +1');
    expect(o.weapon?.attackBonusOverride).toBe(6); // fighter L3: +5 base
    expect(o.weapon?.damageOverride).toBe('1d8+4');
  });

  it('casters do not want swords, and only upgrades are wanted', () => {
    const wizard = createHero(new Rng(2), 3, 'Wizard');
    expect(wantsItem(wizard, byName('Longsword +1'))).toBe(false);
    expect(wantsItem(wizard, byName('Cloak of Protection'))).toBe(true);
    equipItem(wizard, byName('Cloak of Protection'));
    expect(wantsItem(wizard, byName('Cloak of Protection'))).toBe(false);
    expect(wantsItem(wizard, byName('Ring of Protection'))).toBe(true);
  });

  it('a blessed, well-equipped hero survives a fight with hp capped at their own maximum', () => {
    const rng = new Rng(3);
    const fighter = createHero(rng, 3, 'Fighter');
    equipItem(fighter, byName('Amulet of Health'));
    const out = runCombat([fighter], { difficulty: 'easy', monsters: [{ name: 'Goblin Warrior', count: 1, xpEach: 50 }], totalXp: 50, tier: 'Low' }, 5, { ...COMBAT_RULES, blessingHp: 9 });
    const me = out.heroes[0]!;
    expect(me.hp).toBeLessThanOrEqual(fighter.maxHp);
    expect(me.hp).toBeGreaterThan(0);
  });

  it('shops only stock what they trade in', () => {
    const rng = new Rng(4);
    for (let i = 0; i < 30; i++) {
      const item = rollStockItem(rng, 'temple', DEFAULT_ITEM_CONFIG);
      expect(item?.sources).toContain('temple');
    }
  });

  it('allocates unique item IDs from the supplied world RNG', () => {
    const rng = new Rng(5);
    const items = [
      instantiate(rng, ITEM_CATALOGUE[0]!),
      rollStockItem(rng, 'smith', DEFAULT_ITEM_CONFIG)!,
      rollStockItem(rng, 'temple', DEFAULT_ITEM_CONFIG)!,
      ...Array.from({ length: 4 }, () => rollLootItem(rng, 3, DEFAULT_ITEM_CONFIG)),
    ];
    const ids = items.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
