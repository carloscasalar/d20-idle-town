/**
 * Named data for each kind of work. A new kind is one profile plus one
 * behaviour entry on the Board. Game, the expedition and job intelligence
 * read these fields; they do not branch on the kind's name.
 */

export type QuestKind = 'contract' | 'assault' | (string & {});

export interface RenownAmounts {
  contractRenown: number;
  bountyRenown: number;
}

export interface WorkProfile {
  readonly id: QuestKind;
  /** Gold of renown this kind grants when it succeeds. `none` grants nothing. */
  readonly renown: 'contractRenown' | 'bountyRenown' | 'none';
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
   * `configured` follows the intel section's assaultRevealsCount flag.
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

export function renownGain(profile: WorkProfile, amounts: RenownAmounts): number {
  switch (profile.renown) {
    case 'contractRenown':
      return amounts.contractRenown;
    case 'bountyRenown':
      return amounts.bountyRenown;
    default:
      return 0;
  }
}

export const contractProfile: WorkProfile = Object.freeze({
  id: 'contract',
  renown: 'contractRenown',
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
  renown: 'bountyRenown',
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
