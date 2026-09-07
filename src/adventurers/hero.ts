import { buildHero, HERO_CLASS_NAMES, type HeroClassName } from 'battlecast-engine';
import { heroName } from '../core/names';
import type { Rng } from '../core/rng';
import { levelForXp, MAX_LEVEL } from '../core/xp';

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

export function describeHero(h: Hero): string {
  return `${h.name} (${h.heroClass} ${h.level})`;
}
