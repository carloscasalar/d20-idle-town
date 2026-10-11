// PROTOTYPE (ticket 09). THROWAWAY. Never commit.
import type { Rng } from './core/rng';

export interface Tier { id: string; dice: number; faces: number; bonus: number; price: number }
export const TIERS: Tier[] = [
  { id: 'basic', dice: 2, faces: 4, bonus: 2, price: 50 },
  { id: 'greater', dice: 4, faces: 4, bonus: 4, price: 200 },
  { id: 'superior', dice: 8, faces: 4, bonus: 8, price: 2000 },
  { id: 'supreme', dice: 10, faces: 4, bonus: 20, price: 20000 },
];
export const assured = (t: Tier) => t.dice * ((t.faces + 1) / 2) + t.bonus;
export const prodCost = (t: Tier) => t.price / 2;
export function roll(rng: Rng, dice: number, faces: number, bonus: number): number {
  let s = bonus;
  for (let i = 0; i < dice; i++) s += rng.int(1, faces);
  return s;
}
export const rollTier = (rng: Rng, t: Tier) => roll(rng, t.dice, t.faces, t.bonus);
export const PROTO = {
  newRules: false, cover: 0.5, divisor: 2, wOrder: 50, wFallen: 50, reserveDays: 3,
  apoCredit: false,
  apothecaryStart: undefined as number | undefined,
  bought: {} as Record<string, number>, drunk: {} as Record<string, number>,
  production: 0, rests: 0, hdRolled: 0,
};
export function resetCounters(): void { PROTO.bought = {}; PROTO.drunk = {}; PROTO.production = 0; PROTO.rests = 0; PROTO.hdRolled = 0; }
export const count = (rec: Record<string, number>, k: string, n = 1) => { rec[k] = (rec[k] ?? 0) + n; };
export function chooseTier(pack: Record<string, number>, missing: number): Tier | undefined {
  const have = TIERS.filter((t) => (pack[t.id] ?? 0) > 0);
  if (have.length === 0) return undefined;
  return have.find((t) => assured(t) >= missing) ?? have[have.length - 1];
}
export const packSize = (pack: Record<string, number>) => TIERS.reduce((s, t) => s + (pack[t.id] ?? 0), 0);
