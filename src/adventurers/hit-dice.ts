import { buildHero } from 'battlecast-engine';
import { parseDice, rollDice, type DiceSource, type DiceRoll } from '../core/dice';
import type { Hero } from './hero';

export interface HitDie {
  faces: number;
  constitution: number;
}

/** Fail at the engine boundary if its class HP formula stops describing level dice plus Constitution. */
export function parseHitPointFormula(formula: string): HitDie {
  try {
    const { count, faces, bonus } = parseDice(formula);
    if (!Number.isInteger(bonus / count)) throw new Error('non-integral Constitution');
    return { faces, constitution: bonus / count };
  } catch {
    throw new Error(`Unsupported engine hpFormula "${formula}"; expected NdM with a total Constitution bonus divisible by N.`);
  }
}

export function rollHitDie(die: HitDie, source: DiceSource): DiceRoll {
  const roll = rollDice(`1d${die.faces}${die.constitution < 0 ? '' : '+'}${die.constitution}`, source);
  return { ...roll, total: Math.max(1, roll.total) };
}

export type HitDicePacing = (hero: Readonly<Hero>, remaining: number, encountersAhead: number) => number;

export const pacedHitDice: HitDicePacing = (_hero, remaining, encountersAhead) => Math.ceil(remaining / encountersAhead);

/** Pure recovery calculation. The caller applies the returned HP and spent pool together. */
export function spendHitDice(hero: Readonly<Hero>, encountersAhead: number, source: DiceSource, pacing: HitDicePacing): {
  hp: number;
  hitDiceSpent: number;
  rolls: DiceRoll[];
} {
  let hp = hero.hp;
  let hitDiceSpent = hero.hitDiceSpent;
  const rolls: DiceRoll[] = [];
  const remaining = hero.level - hitDiceSpent;
  const quota = Math.min(remaining, Math.max(0, Math.floor(pacing(hero, remaining, encountersAhead))));
  if (!hero.alive || hp >= hero.maxHp || quota <= 0) return { hp, hitDiceSpent, rolls };
  const die = parseHitPointFormula(buildHero(hero.heroClass, hero.level).hpFormula);
  while (rolls.length < quota && hp < hero.maxHp) {
    const roll = rollHitDie(die, source);
    rolls.push(roll);
    hitDiceSpent += 1;
    hp = Math.min(hero.maxHp, hp + roll.total);
  }
  return { hp, hitDiceSpent, rolls };
}
