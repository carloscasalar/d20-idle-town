import { buildHero, HERO_CLASS_NAMES, type HeroClassName } from 'battlecast-engine';
import { heroName } from '../core/names';
import type { Rng } from '../core/rng';
import { levelForXp, MAX_LEVEL } from '../core/xp';
import type { ItemEffect, ItemSlot, MagicItem } from '../items/items';

export interface Hero {
  id: string;
  name: string;
  heroClass: HeroClassName;
  level: number;
  xp: number;
  maxHp: number;
  hp: number;
  alive: boolean;
  kills: number;
  deaths: number;
  /** Armour upgrades bought at the smith; each tier is +1 AC. */
  armorTier: number;
  /** Lifetime gold spent on this hero (gear, potions, resurrections). */
  goldSpent: number;
  /** Equipped magic items, at most one per slot. */
  items: MagicItem[];
}

/** The class chassis attacks with a weapon rather than a cantrip; +1 swords are wasted on the rest. */
export const WEAPON_CLASSES: HeroClassName[] = ['Barbarian', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue'];

export function itemInSlot(hero: Hero, slot: ItemSlot): MagicItem | undefined {
  return hero.items.find((i) => i.slot === slot);
}

/** Whether `item` would be an upgrade for this hero: empty slot, or strictly better than what is worn. */
export function wantsItem(hero: Hero, item: MagicItem): boolean {
  if (item.slot === 'weapon' && !WEAPON_CLASSES.includes(hero.heroClass)) return false;
  const current = itemInSlot(hero, item.slot);
  return !current || current.price < item.price;
}

/** Equip an item, returning whatever it replaced. */
export function equipItem(hero: Hero, item: MagicItem): MagicItem | undefined {
  const current = itemInSlot(hero, item.slot);
  hero.items = hero.items.filter((i) => i !== current);
  hero.items.push(item);
  return current;
}

/** Sum of the effects of everything the hero wears. */
export function combinedEffect(hero: Hero): Required<Pick<ItemEffect, 'ac' | 'weaponBonus' | 'hp' | 'speed'>> & { resistances: string[] } {
  const total = { ac: 0, weaponBonus: 0, hp: 0, speed: 0, resistances: [] as string[] };
  for (const i of hero.items) {
    total.ac += i.effect.ac ?? 0;
    total.weaponBonus += i.effect.weaponBonus ?? 0;
    total.hp += i.effect.hp ?? 0;
    total.speed += i.effect.speed ?? 0;
    for (const r of i.effect.resistances ?? []) if (!total.resistances.includes(r)) total.resistances.push(r);
  }
  return total;
}

export const MAX_ARMOR_TIER = 3;

export function armorUpgradeCost(tier: number, level: number): number {
  return Math.round((80 + 40 * level) * Math.pow(2.2, tier));
}

/** What the hero's AC is in combat: class chassis, the smith's work, and magic on top. */
export function heroAc(hero: Hero): number {
  return buildHero(hero.heroClass, hero.level).ac + hero.armorTier + combinedEffect(hero).ac;
}

let heroCounter = 0;

/** Fixed hit points for a class/level, the way the engine's hero builder computes them. */
export function fixedHp(heroClass: HeroClassName, level: number): number {
  return buildHero(heroClass, level).hp;
}

export function createHero(rng: Rng, level: number, heroClass?: HeroClassName): Hero {
  const cls = heroClass ?? rng.pick(HERO_CLASS_NAMES);
  const maxHp = fixedHp(cls, level);
  return {
    id: `hero-${++heroCounter}`,
    name: heroName(rng),
    heroClass: cls,
    level,
    xp: 0,
    maxHp,
    hp: maxHp,
    alive: true,
    kills: 0,
    deaths: 0,
    armorTier: 0,
    goldSpent: 0,
    items: [],
  };
}

/** Adds XP and applies level-ups. Returns the number of levels gained. */
export function gainXp(hero: Hero, amount: number): number {
  if (!hero.alive) return 0;
  hero.xp += amount;
  const newLevel = Math.min(MAX_LEVEL, levelForXp(hero.xp));
  const gained = newLevel - hero.level;
  if (gained > 0) {
    const oldMax = hero.maxHp;
    hero.level = newLevel;
    hero.maxHp = fixedHp(hero.heroClass, newLevel);
    hero.hp = Math.min(hero.maxHp, hero.hp + (hero.maxHp - oldMax));
  }
  return gained;
}

export function healHero(hero: Hero, amount: number): void {
  if (!hero.alive) return;
  hero.hp = Math.min(hero.maxHp, hero.hp + amount);
}

export function killHero(hero: Hero): void {
  hero.alive = false;
  hero.hp = 0;
  hero.deaths += 1;
}

export function resurrectHero(hero: Hero): void {
  hero.alive = true;
  hero.hp = Math.max(1, Math.floor(hero.maxHp / 2));
}

/** Gold the temple asks to bring someone back. Grows with level, like a 5e diamond bill would. */
export function resurrectionCost(level: number): number {
  return 150 + level * level * 40;
}

/** A healing draught scaled to the buyer's level: one potion is about a third of a hero's hit points. */
export function potionCost(level: number): number {
  return 25 + 10 * level;
}

export function potionHeal(hero: Hero): number {
  return Math.max(8, Math.ceil(hero.maxHp / 3));
}

/** Skills a class is good at beyond the numbers: the bard talks, the ranger reads the land. Rolled with advantage. */
export const SKILL_ADVANTAGE: Record<string, HeroClassName[]> = {
  Persuasion: ['Bard'],
  Survival: ['Ranger', 'Druid'],
};

const ABILITY_FOR_SKILL: Record<string, keyof ReturnType<typeof buildHero>['abilities']> = {
  Persuasion: 'cha',
  Survival: 'wis',
  Perception: 'wis',
  Stealth: 'dex',
};

/** The hero's total bonus on a skill: proficiency where the class has it, else the bare ability modifier. */
export function skillBonus(hero: Hero, skill: string): number {
  const data = buildHero(hero.heroClass, hero.level);
  const trained = data.skills?.[skill];
  if (typeof trained === 'number') return trained;
  const ability = ABILITY_FOR_SKILL[skill] ?? 'wis';
  return Math.floor((data.abilities[ability] - 10) / 2);
}

export interface SkillRoll {
  hero: Hero;
  roll: number;
  bonus: number;
  total: number;
  advantage: boolean;
  success: boolean;
}

/** The best member attempts the check; d20 (twice, keep the best, if their class has advantage) plus their bonus. */
export function rollSkill(rng: Rng, members: Hero[], skill: string, dc: number): SkillRoll | null {
  const alive = members.filter((h) => h.alive);
  if (alive.length === 0) return null;
  const hero = [...alive].sort((a, b) => skillBonus(b, skill) + (SKILL_ADVANTAGE[skill]?.includes(b.heroClass) ? 3 : 0) - (skillBonus(a, skill) + (SKILL_ADVANTAGE[skill]?.includes(a.heroClass) ? 3 : 0)))[0]!;
  const advantage = SKILL_ADVANTAGE[skill]?.includes(hero.heroClass) ?? false;
  const d1 = rng.int(1, 20);
  const d2 = rng.int(1, 20);
  const roll = advantage ? Math.max(d1, d2) : d1;
  const bonus = skillBonus(hero, skill);
  return { hero, roll, bonus, total: roll + bonus, advantage, success: roll + bonus >= dc };
}

export function describeHero(h: Hero): string {
  return `${h.name} (${h.heroClass} ${h.level})`;
}
