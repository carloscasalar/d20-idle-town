import { assuredHealing } from '../core/dice';
import { freeze } from '../core/freeze';

/** One Healing potion tier. The name is the pack key. */
export interface PotionTier {
  name: string;
  formula: string;
  price: number;
}

/** The Healing potion catalogue. Production cost arrives with a later slice. */
export interface PotionConfig {
  tiers: readonly PotionTier[];
}

export const DEFAULT_POTION_CONFIG: PotionConfig = freeze({
  tiers: [
    { name: 'basic', formula: '2d4+2', price: 50 },
    { name: 'greater', formula: '4d4+4', price: 200 },
    { name: 'superior', formula: '8d4+8', price: 2000 },
    { name: 'supreme', formula: '10d4+20', price: 20000 },
  ],
});

/** Counts per tier name. A missing key is zero. */
export type PotionPack = Record<string, number>;

export function potionCount(pack: PotionPack, name: string): number {
  return pack[name] ?? 0;
}

/** The temporary buying rule of this slice: the tier named basic, if the catalogue still has it. */
export function basicTier(catalogue: readonly PotionTier[]): PotionTier | undefined {
  return catalogue.find((tier) => tier.name === 'basic');
}

/**
 * Smallest stocked tier whose assured healing covers the missing hit points,
 * or the strongest stocked tier when none does. A fallen hero is missing their
 * whole maximum, not `maxHp - hp`.
 */
export function choosePotion(
  pack: PotionPack,
  catalogue: readonly PotionTier[],
  wound: { hp: number; maxHp: number; fallen: boolean },
): PotionTier | undefined {
  const missing = wound.fallen ? wound.maxHp : wound.maxHp - wound.hp;
  const stocked = catalogue.filter((tier) => potionCount(pack, tier.name) > 0);
  if (stocked.length === 0) return undefined;
  const byStrength = [...stocked].sort((a, b) =>
    assuredHealing(a.formula) - assuredHealing(b.formula) || catalogue.indexOf(a) - catalogue.indexOf(b));
  return byStrength.find((tier) => assuredHealing(tier.formula) >= missing) ?? byStrength[byStrength.length - 1];
}

export function givePotions(pack: PotionPack, name: string, count: number): void {
  if (count <= 0) return;
  pack[name] = potionCount(pack, name) + count;
}

export function takePotion(pack: PotionPack, name: string): void {
  const left = potionCount(pack, name) - 1;
  if (left > 0) pack[name] = left;
  else delete pack[name];
}

/** Subtract what a fight drank, and never leave a negative count. */
export function spendPotions(pack: PotionPack, drunk: PotionPack): void {
  for (const [name, count] of Object.entries(drunk)) {
    const left = potionCount(pack, name) - count;
    if (left > 0) pack[name] = left;
    else delete pack[name];
  }
}

export function mergePotionPacks(host: PotionPack, donor: PotionPack): void {
  for (const [name, count] of Object.entries(donor)) givePotions(host, name, count);
  for (const name of Object.keys(donor)) delete donor[name];
}

/** Positive counts only, in catalogue order, so a renderer can read the pack without the catalogue. */
export function packInCatalogueOrder(pack: PotionPack, catalogue: readonly PotionTier[]): PotionPack {
  const ordered: PotionPack = {};
  for (const tier of catalogue) {
    const count = potionCount(pack, tier.name);
    if (count > 0) ordered[tier.name] = count;
  }
  return ordered;
}

/** "2 basic, 1 greater", or "0 potions" when the pack is empty. */
export function describePack(pack: PotionPack, catalogue: readonly PotionTier[]): string {
  const parts = Object.entries(packInCatalogueOrder(pack, catalogue)).map(([name, count]) => `${count} ${name}`);
  return parts.length > 0 ? parts.join(', ') : '0 potions';
}

export function potionDrinkText(drinker: string, tier: PotionTier, total: number, giver?: string): string {
  const draught = `a ${tier.name} healing potion (${tier.formula}: ${total})`;
  return giver ? `${giver} gives ${drinker} ${draught}.` : `${drinker} drinks ${draught}.`;
}
