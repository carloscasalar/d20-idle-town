/**
 * Job intelligence: what is publicly known about a Contract or Bounty, what
 * each company has tried in order to learn it, and every way of learning.
 *
 * The Board keeps the job and is the only code that gives out a handle.
 * That handle can only learn the next fact or reveal every fact. What a
 * company has tried lives on the company; this module is the only writer of
 * those attempts. Knowledge only grows.
 *
 * An idle hour tries an ordered list of steps, the same shape as town services:
 * true when that step spends the hour. Reading the road and taking stock on
 * arrival are the other ways of learning.
 */

import { aliveMembers, partyLevel, type JobInquiry, type Party } from '../adventurers/party';
import { resurrectionCost, rollSkill, type HeroEconomyConfig } from '../adventurers/hero';
import { freeze } from '../core/freeze';
import type { DeepReadonly } from '../core/readonly';
import type { Rng } from '../core/rng';
import { resolveSteps, runSteps, type Step } from '../core/steps';
import { purse, treasury, type Coin } from '../town/coin';
import { serviceOf, type Town } from '../town/town';
import type { EncounterSpec } from './encounters';

/**
 * What a caller may do to public knowledge. Both operations only reveal more.
 * A fully known job makes `learnNext` throw.
 */
export interface JobKnowledge {
  learnNext(): string;
  revealAll(): void;
}

/** Plain data. The resurrection price keeps its definition on the hero. */
export interface JobIntelConfig {
  /** Difficulty of the free attempt and of reading the road. */
  skillDc: number;
  /** Divination price for each level of the company. */
  divinationCostPerLevel: number;
  /** Price of one paid round for each level of the company. */
  roundCostPerLevel: number;
  /**
   * Gold that must remain after a divination, as a multiple of the
   * resurrection price for the company's level.
   */
  divinationReserveFactor: number;
  /**
   * Gold that must remain after a paid round, as a multiple of the
   * resurrection price for the company's level.
   */
  roundReserveFactor: number;
  /** Paid rounds one company may buy about one job. */
  maxRounds: number;
  /** Encounters revealed when a job is posted. */
  revealedAtPosting: number;
  /** A bounty shows its encounter count as soon as it is posted. */
  assaultRevealsCount: boolean;
  /** Idle-hour order, by step name. */
  steps: readonly string[];
}

export const DEFAULT_JOB_INTEL_CONFIG: JobIntelConfig = freeze({
  skillDc: 15,
  divinationCostPerLevel: 60,
  roundCostPerLevel: 15,
  divinationReserveFactor: 2,
  roundReserveFactor: 1,
  maxRounds: 2,
  revealedAtPosting: 1,
  assaultRevealsCount: true,
  steps: ['freeAttempt', 'divination', 'paidRound'],
});

/** Names a configuration may use for an idle hour of job intelligence. */
export const INTEL_STEP_NAMES = DEFAULT_JOB_INTEL_CONFIG.steps;

export interface IntelWork {
  readonly id: string;
  readonly title: string;
  readonly countRevealed: boolean;
  readonly revealed: number;
  readonly encounters: readonly DeepReadonly<EncounterSpec>[];
}

export interface JobIntelEvent {
  kind: 'shop' | 'temple';
  text: string;
}

export interface JobIntelContext {
  work: IntelWork;
  /** Learning handle for `work`. The module calls it; the caller does not write. */
  knowledge: JobKnowledge;
  town: Town;
  rng: Rng;
  coin: Coin;
  config: JobIntelConfig;
  /** Resurrection price. */
  heroes: HeroEconomyConfig;
  report: (event: JobIntelEvent) => void;
}

/** True when the hour is spent. A false result may still record an attempt. */
export type JobIntelStep = Step<Party, JobIntelContext>;

/** The idle-hour order, resolved from the default names. */
export function defaultJobIntelSteps(): readonly JobIntelStep[] {
  return resolveSteps(DEFAULT_JOB_INTEL_CONFIG.steps, JOB_INTEL_STEPS);
}

/**
 * Try the supplied steps in order. Stops at the first one that spends the hour.
 * A job that is already fully known spends nothing.
 */
export function seekJobIntelligence(company: Party, context: JobIntelContext, steps: readonly JobIntelStep[]): boolean {
  if (isFullyKnown(context.work)) return false;
  return runSteps(company, context, steps);
}

export interface RoadIntelContext {
  rng: Rng;
  skillDc: number;
  heroes: HeroEconomyConfig;
  /** The job being travelled. The module decides what a successful reading reveals. */
  knowledge: JobKnowledge;
  report: (text: string) => void;
}

/** What this company has tried for this job, if it has tried anything. */
export function jobInquiry(company: { readonly investigations: readonly DeepReadonly<JobInquiry>[] }, jobId: string): DeepReadonly<JobInquiry> | undefined {
  return company.investigations.find((inquiry) => inquiry.jobId === jobId);
}

export function isFullyKnown(work: { readonly countRevealed: boolean; readonly revealed: number; readonly encounters: { readonly length: number } }): boolean {
  return work.countRevealed && work.revealed >= work.encounters.length;
}

/** "I/?/?" for a three-fight job with one known; "I/…" while even the length is a secret. */
export function difficultyCode(work: {
  readonly countRevealed: boolean;
  readonly revealed: number;
  readonly encounters: readonly { readonly difficulty: string }[];
}): string {
  const known = work.encounters.slice(0, work.revealed).map((encounter) => encounter.difficulty[0]!.toUpperCase());
  if (!work.countRevealed) return work.revealed < work.encounters.length ? `${known.join('/')}/…` : known.join('/');
  const hidden = work.encounters.length - work.revealed;
  return [...known, ...Array.from({ length: hidden }, () => '?')].join('/');
}

/**
 * How much is public when work is posted.
 * `configured` follows assaultRevealsCount; a boolean is that kind's own rule.
 */
export function knowledgeAtPosting(
  countAtPosting: boolean | 'configured',
  config: JobIntelConfig,
): { revealed: number; countRevealed: boolean } {
  const countRevealed = countAtPosting === 'configured' ? config.assaultRevealsCount : countAtPosting;
  return { revealed: config.revealedAtPosting, countRevealed };
}

/** One try per job, while the tavern stands. Success and failure both spend the hour. */
export function freeAttempt(company: Party, context: JobIntelContext): boolean {
  const tavern = serviceOf(context.town, 'tavern');
  if (tavern.ruined || jobInquiry(company, context.work.id)?.freeAttempt) return false;
  ensureInquiry(company, context.work.id).freeAttempt = true;
  const check = rollSkill(context.rng, aliveMembers(company), 'Persuasion', context.config.skillDc, context.heroes);
  if (!check) return false;
  const dice = diceText(check);
  const dc = context.config.skillDc;
  if (check.success) {
    const learned = context.knowledge.learnNext();
    context.report({ kind: 'shop', text: `${check.hero.name} works the room at ${tavern.name} (Persuasion ${dice} vs DC ${dc}): ${learned}.` });
  } else {
    context.report({ kind: 'shop', text: `${check.hero.name} tries to get the regulars at ${tavern.name} talking about "${context.work.title}" (Persuasion ${dice} vs DC ${dc}) and gets nowhere.` });
  }
  return true;
}

/** The priests see the whole job. The company must keep twice the usual reserve. */
export function divination(company: Party, context: JobIntelContext): boolean {
  const temple = serviceOf(context.town, 'temple');
  if (temple.ruined) return false;
  const level = partyLevel(company);
  const cost = context.config.divinationCostPerLevel * level;
  const reserve = resurrectionCost(level, context.heroes) * context.config.divinationReserveFactor;
  if (company.gold - cost < reserve) return false;
  context.coin.transfer(purse(company), treasury(temple), cost, 'intel');
  context.knowledge.revealAll();
  context.report({
    kind: 'temple',
    text: `${company.name} pay ${cost} gp for a divination at the ${temple.name}. The priests see "${context.work.title}" whole: ${context.work.encounters.length} fights [${difficultyCode(context.work)}].`,
  });
  return true;
}

/** One round buys one fact, up to the configured limit, while the tavern stands. */
export function paidRound(company: Party, context: JobIntelContext): boolean {
  const done = jobInquiry(company, context.work.id)?.roundsBought ?? 0;
  if (done >= context.config.maxRounds) return false;
  const tavern = serviceOf(context.town, 'tavern');
  const level = partyLevel(company);
  const cost = context.config.roundCostPerLevel * level;
  const reserve = resurrectionCost(level, context.heroes) * context.config.roundReserveFactor;
  if (tavern.ruined || company.gold - cost < reserve) return false;
  context.coin.transfer(purse(company), treasury(tavern), cost, 'intel');
  ensureInquiry(company, context.work.id).roundsBought = done + 1;
  const learned = context.knowledge.learnNext();
  context.report({ kind: 'shop', text: `${company.name} buy a round at ${tavern.name} (${cost} gp) and ask about "${context.work.title}": ${learned}.` });
  return true;
}

/** One look at the road per company per job. A fully known job is not read. */
export function readTheRoad(
  company: Party,
  work: { readonly id: string; readonly countRevealed: boolean; readonly revealed: number; readonly encounters: { readonly length: number } },
  context: RoadIntelContext,
): void {
  if (isFullyKnown(work) || jobInquiry(company, work.id)?.roadRead) return;
  ensureInquiry(company, work.id).roadRead = true;
  const check = rollSkill(context.rng, aliveMembers(company), 'Survival', context.skillDc, context.heroes);
  if (!check) return;
  const dice = diceText(check);
  if (check.success) context.report(`On the road, ${check.hero.name} reads the tracks (Survival ${dice} vs DC ${context.skillDc}): ${context.knowledge.learnNext()}.`);
  else context.report(`${check.hero.name} tries to read the tracks along the road (Survival ${dice} vs DC ${context.skillDc}) and learns nothing.`);
}

/**
 * Taking stock on arrival. Reveals every remaining fact and returns whether
 * the company still had something to learn before that.
 */
export function learnOnArrival(
  work: { readonly countRevealed: boolean; readonly revealed: number; readonly encounters: { readonly length: number } },
  knowledge: JobKnowledge,
): boolean {
  const surprise = !isFullyKnown(work);
  knowledge.revealAll();
  return surprise;
}

function ensureInquiry(company: Party, jobId: string): JobInquiry {
  const found = company.investigations.find((inquiry) => inquiry.jobId === jobId);
  if (found) return found;
  const created: JobInquiry = { jobId, freeAttempt: false, roundsBought: 0, roadRead: false };
  company.investigations.push(created);
  return created;
}

function diceText(check: { roll: number; bonus: number; total: number; advantage: boolean }): string {
  return `${check.roll}${check.bonus >= 0 ? '+' : ''}${check.bonus} = ${check.total}${check.advantage ? ', with advantage' : ''}`;
}

/** Named idle-hour steps. Game resolves `intel.steps` against this registry. */
export const JOB_INTEL_STEPS: Readonly<Record<string, JobIntelStep>> = Object.freeze({
  freeAttempt,
  divination,
  paidRound,
});
