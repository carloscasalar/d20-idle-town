import { assuredHealing } from '../core/dice';
import { freeze } from '../core/freeze';
import type { Rng } from '../core/rng';
import { isBloodied } from './hero';
import { potionCount, takePotion, type PotionPack, type PotionTier } from './potions';

/** How a company orders Bloodied heroes when the pack is short. */
export type PotionSharingPolicy = 'company-order' | 'most-hurt';

/** Room for a later buying rule or Hit Dice pacing, without a new argument at each caller. */
export interface CompanyPolicies {
  potionSharing: PotionSharingPolicy;
}

/** A Bloodied hero the policy can order. Hit points of 0 are fallen. */
export interface ShareCandidate {
  hp: number;
  maxHp: number;
}

/** Orders the Bloodied heroes it is given. The input is already in company order. */
export interface PotionSharing {
  order<T extends ShareCandidate>(bloodied: readonly T[]): T[];
}

const companyOrder: PotionSharing = {
  order: (bloodied) => [...bloodied],
};

/** Fallen heroes first, then the lowest hit point fraction. Ties keep company order. */
const mostHurt: PotionSharing = {
  order: (bloodied) => bloodied
    .map((hero, index) => ({ hero, index }))
    .sort((a, b) => {
      const aFallen = a.hero.hp <= 0;
      const bFallen = b.hero.hp <= 0;
      if (aFallen !== bFallen) return aFallen ? -1 : 1;
      const fraction = a.hero.hp / a.hero.maxHp - b.hero.hp / b.hero.maxHp;
      return fraction || a.index - b.index;
    })
    .map((entry) => entry.hero),
};

const SHARING: Record<PotionSharingPolicy, PotionSharing> = {
  'company-order': companyOrder,
  'most-hurt': mostHurt,
};

/** A company with no recorded policy is served in company order. */
function potionSharingOf(policy: PotionSharingPolicy | undefined): PotionSharing {
  return policy === undefined ? SHARING['company-order'] : SHARING[policy];
}

export interface PotionSharingWeight {
  policy: PotionSharingPolicy;
  weight: number;
}

/** Weights for the draw at company creation. */
export interface PoliciesConfig {
  potionSharing: readonly PotionSharingWeight[];
}

export const DEFAULT_POLICIES_CONFIG: PoliciesConfig = freeze({
  potionSharing: [
    { policy: 'company-order', weight: 50 },
    { policy: 'most-hurt', weight: 50 },
  ],
});

/** One roll, however the weights are set. */
export function drawPotionSharing(rng: Rng, weights: readonly PotionSharingWeight[]): PotionSharingPolicy {
  return rng.weighted(weights.map((entry) => ({ item: entry.policy, weight: entry.weight })));
}

/** A living adventurer, as the company describes them for one round of drinking. */
export interface DrinkingAdventurer extends ShareCandidate {
  id: string;
  name: string;
  conscious: boolean;
}

/** One drink in the company's plan. `giver` is the conscious companion when the drinker has fallen. */
export interface PlannedDrink {
  id: string;
  name: string;
  tier: PotionTier;
  giver?: string;
}

/**
 * Plans one round of drinking. Rolls no dice and writes neither the pack nor an adventurer.
 * A fallen adventurer is missing their whole maximum and is given the potion by the first
 * conscious companion in company order. When nobody is conscious, nobody drinks.
 */
export function planDrinkingRound(
  adventurers: readonly DrinkingAdventurer[],
  pack: PotionPack,
  catalogue: readonly PotionTier[],
  policies: CompanyPolicies | undefined,
): PlannedDrink[] {
  const companion = adventurers.find((adventurer) => adventurer.conscious);
  if (!companion) return [];

  const bloodied = adventurers.filter((adventurer) =>
    isBloodied(adventurer) && (adventurer.conscious || adventurer.hp <= 0));
  const stock: PotionPack = { ...pack };
  const plan: PlannedDrink[] = [];
  for (const adventurer of potionSharingOf(policies?.potionSharing).order(bloodied)) {
    const missing = adventurer.hp <= 0 ? adventurer.maxHp : adventurer.maxHp - adventurer.hp;
    const tier = chooseTier(stock, catalogue, missing);
    if (!tier) break;
    takePotion(stock, tier.name);
    plan.push({
      id: adventurer.id,
      name: adventurer.name,
      tier,
      ...(adventurer.conscious ? {} : { giver: companion.name }),
    });
  }
  return plan;
}

/** Smallest stocked tier whose assured healing covers the missing hit points, or the strongest stocked. */
function chooseTier(pack: PotionPack, catalogue: readonly PotionTier[], missing: number): PotionTier | undefined {
  const stocked = catalogue.filter((tier) => potionCount(pack, tier.name) > 0);
  if (stocked.length === 0) return undefined;
  const byStrength = [...stocked].sort((a, b) =>
    assuredHealing(a.formula) - assuredHealing(b.formula) || catalogue.indexOf(a) - catalogue.indexOf(b));
  return byStrength.find((tier) => assuredHealing(tier.formula) >= missing) ?? byStrength[byStrength.length - 1];
}
