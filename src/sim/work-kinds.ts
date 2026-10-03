/**
 * Named data for each kind of work. A new kind is one profile plus one
 * behaviour entry on the Board, and a posting rule in Game. The expedition
 * and job intelligence read these fields.
 */

import type { DeepReadonly } from '../core/readonly';
import { renownOf, type WorkKindConfigs } from './kind-config';

export type QuestKind = 'contract' | 'assault' | (string & {});

export interface WorkProfile {
  readonly id: QuestKind;
  /** `configured` grants the renown in this kind's configuration. `none` grants nothing. */
  readonly renown: 'configured' | 'none';
  /** Badge on the board card. Empty means no badge. The kind's id is the badge's CSS class. */
  readonly badge: string;
  /** Phrase before a lair's name on the board card. */
  readonly lairRelation: string;
  /** Which figure to show beside that lair. */
  readonly lairFigure: 'hoard' | 'strength';
  /** The last encounter cannot be fled. */
  readonly lastFightForbidsRetreat: boolean;
  /** Each fight reports how deep the company is in the lair. */
  readonly lairDepth: boolean;
  /**
   * Whether the encounter count is public when the work is posted.
   * `configured` follows that kind's `revealsCount`.
   */
  readonly countAtPosting: boolean | 'configured';
  /**
   * How an idle company is offered this work.
   * `lair` — at or below the company's level, when it can afford a resurrection and the appetite roll succeeds.
   * `holding` — within stretch, the guild gate and first refusal, then sorted.
   * `none` — not offered while the company is idle.
   */
  readonly offer: 'lair' | 'holding' | 'none';
}

export function renownGain(profile: WorkProfile, kinds: DeepReadonly<WorkKindConfigs>): number {
  if (profile.renown === 'none') return 0;
  return renownOf(kinds, profile.id);
}

export const contractProfile: WorkProfile = Object.freeze({
  id: 'contract',
  renown: 'configured',
  badge: '',
  lairRelation: 'raid out of',
  lairFigure: 'strength',
  lastFightForbidsRetreat: false,
  lairDepth: false,
  countAtPosting: false,
  offer: 'holding',
});

export const assaultProfile: WorkProfile = Object.freeze({
  id: 'assault',
  renown: 'configured',
  badge: 'lair',
  lairRelation: 'assault on',
  lairFigure: 'hoard',
  lastFightForbidsRetreat: true,
  lairDepth: true,
  countAtPosting: 'configured',
  offer: 'lair',
});

export const EMPTY_PROFILE: WorkProfile = Object.freeze({
  id: 'unregistered',
  renown: 'none',
  badge: '',
  lairRelation: 'raid out of',
  lairFigure: 'strength',
  lastFightForbidsRetreat: false,
  lairDepth: false,
  countAtPosting: false,
  offer: 'none',
});

export function profilesById(extra: Readonly<Record<string, WorkProfile>> = {}): Readonly<Record<string, WorkProfile>> {
  return {
    [contractProfile.id]: contractProfile,
    [assaultProfile.id]: assaultProfile,
    ...extra,
  };
}
