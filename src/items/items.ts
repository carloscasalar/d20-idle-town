import type { Rng } from '../core/rng';

export type ItemSlot = 'weapon' | 'armor' | 'accessory';
export type ItemRarity = 'uncommon' | 'rare';

/** What an item does in combat. Everything here maps onto a battlecast hero override. */
export interface ItemEffect {
  /** Added to armour class. */
  ac?: number;
  /** Added to attack rolls and damage of the hero's main weapon. */
  weaponBonus?: number;
  /** Added to maximum hit points. */
  hp?: number;
  /** Added to walking speed, in feet. */
  speed?: number;
  /** Damage types resisted. */
  resistances?: string[];
}

export interface ItemTemplate {
  name: string;
  slot: ItemSlot;
  rarity: ItemRarity;
  price: number;
  effect: ItemEffect;
  /** Which shops can stock it. */
  sources: ItemSource[];
}

export type ItemSource = 'enchanter' | 'temple' | 'smith';

export interface MagicItem extends ItemTemplate {
  id: string;
}

/**
 * A short, deliberately thin catalogue. Supply is meant to be scarce: a shop
 * restocks one item every few days at most, and contracts rarely pay in kind.
 */
export const ITEM_CATALOGUE: ItemTemplate[] = [
  { name: 'Longsword +1', slot: 'weapon', rarity: 'uncommon', price: 900, effect: { weaponBonus: 1 }, sources: ['smith', 'enchanter'] },
  { name: 'Rapier +1', slot: 'weapon', rarity: 'uncommon', price: 900, effect: { weaponBonus: 1 }, sources: ['smith', 'enchanter'] },
  { name: 'Warhammer +1', slot: 'weapon', rarity: 'uncommon', price: 900, effect: { weaponBonus: 1 }, sources: ['smith', 'temple'] },
  { name: 'Flame Tongue', slot: 'weapon', rarity: 'rare', price: 4500, effect: { weaponBonus: 2 }, sources: ['enchanter'] },
  { name: 'Holy Avenger (lesser)', slot: 'weapon', rarity: 'rare', price: 5000, effect: { weaponBonus: 2, hp: 5 }, sources: ['temple'] },
  { name: 'Shield +1', slot: 'armor', rarity: 'uncommon', price: 800, effect: { ac: 1 }, sources: ['smith', 'enchanter'] },
  { name: 'Chain Mail +1', slot: 'armor', rarity: 'rare', price: 3500, effect: { ac: 2 }, sources: ['smith'] },
  { name: 'Bracers of Defense', slot: 'armor', rarity: 'rare', price: 3200, effect: { ac: 2 }, sources: ['enchanter'] },
  { name: 'Cloak of Protection', slot: 'accessory', rarity: 'uncommon', price: 1200, effect: { ac: 1, hp: 3 }, sources: ['enchanter', 'temple'] },
  { name: 'Amulet of Health', slot: 'accessory', rarity: 'rare', price: 4000, effect: { hp: 20 }, sources: ['temple', 'enchanter'] },
  { name: 'Boots of Striding', slot: 'accessory', rarity: 'uncommon', price: 1000, effect: { speed: 10 }, sources: ['enchanter'] },
  { name: 'Ring of Fire Resistance', slot: 'accessory', rarity: 'uncommon', price: 1500, effect: { resistances: ['fire'] }, sources: ['enchanter', 'temple'] },
  { name: 'Periapt of Wound Closure', slot: 'accessory', rarity: 'uncommon', price: 1300, effect: { hp: 8 }, sources: ['temple'] },
  { name: 'Ring of Protection', slot: 'accessory', rarity: 'rare', price: 3800, effect: { ac: 1, hp: 10 }, sources: ['enchanter'] },
];

let itemCounter = 0;

export function instantiate(template: ItemTemplate): MagicItem {
  return { ...template, id: `item-${++itemCounter}` };
}

/** Roll an item a shop could stock. Rare items are a one-in-four affair. */
export function rollStockItem(rng: Rng, source: ItemSource): MagicItem | null {
  const pool = ITEM_CATALOGUE.filter((t) => t.sources.includes(source));
  if (pool.length === 0) return null;
  const rarity: ItemRarity = rng.chance(0.25) ? 'rare' : 'uncommon';
  const byRarity = pool.filter((t) => t.rarity === rarity);
  return instantiate(rng.pick(byRarity.length > 0 ? byRarity : pool));
}

/** Roll an item found on a job: anything in the catalogue, rarity weighted by contract level. */
export function rollLootItem(rng: Rng, level: number): MagicItem {
  const rareChance = Math.min(0.5, 0.05 + level * 0.04);
  const rarity: ItemRarity = rng.chance(rareChance) ? 'rare' : 'uncommon';
  const byRarity = ITEM_CATALOGUE.filter((t) => t.rarity === rarity);
  return instantiate(rng.pick(byRarity));
}

export function describeEffect(e: ItemEffect): string {
  const parts: string[] = [];
  if (e.weaponBonus) parts.push(`+${e.weaponBonus} to hit and damage`);
  if (e.ac) parts.push(`AC +${e.ac}`);
  if (e.hp) parts.push(`+${e.hp} hp`);
  if (e.speed) parts.push(`speed +${e.speed}`);
  if (e.resistances?.length) parts.push(`resists ${e.resistances.join(', ')}`);
  return parts.join(', ');
}

/** What a shop pays when adventurers sell an item back. */
export function resalePrice(item: MagicItem): number {
  return Math.floor(item.price / 2);
}
