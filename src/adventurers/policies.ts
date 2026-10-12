import { freeze } from '../core/freeze';
import type { Rng } from '../core/rng';

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
export function potionSharingOf(policy: PotionSharingPolicy | undefined): PotionSharing {
  return policy === 'most-hurt' ? SHARING['most-hurt'] : SHARING['company-order'];
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
