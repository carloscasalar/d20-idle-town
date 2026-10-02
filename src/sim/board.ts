import { MAX_RENOWN, PARTY_SIZE, type Party } from '../adventurers/party';
import type { DeepReadonly } from '../core/readonly';
import type { Rng } from '../core/rng';
import { goldStatistics, hoard, loot, purse, sink, source, transfer, treasury, type GoldStatistics } from '../town/coin';
import { difficultyCode, generateAssault, generateQuest, learnQuestIntel, revealAll, type Quest, type QuestKind, type ReadonlyQuest } from '../quests/quest';
import { THEMES, type ThemeId } from '../quests/themes';
import { ASSET_KINDS, type Asset } from '../town/assets';
import { MAX_STRENGTH, type Lair } from '../town/lairs';
import { assetById, serviceOf, type Employer, type Town } from '../town/town';

/** Plain data: ticks for durations, days for income, inclusive cooldown ranges. */
export interface BoardConfig {
  windfallDays: number;
  lootingDays: number;
  bountyRenown: number;
  contractRenown: number;
  failureRenownLoss: number;
  /** Defaults to MAX_RENOWN; other modules use that shared constant. */
  renownCap: number;
  reputationGain: number;
  expiryCooldown: [number, number];
  failureCooldown: [number, number];
  pruningThreshold: number;
  contractOpenTicks: number;
  travelTicks: number;
  difficultyScale: number;
  /** Defaults to PARTY_SIZE; other modules use that shared constant. */
  encounterPartySize: number;
  lairStrengthGain: number;
  /** Defaults to MAX_STRENGTH; other modules use that shared constant. */
  lairStrengthCap: number;
}

export const DEFAULT_BOARD_CONFIG: BoardConfig = {
  windfallDays: 4,
  lootingDays: 2,
  bountyRenown: 3,
  contractRenown: 1,
  failureRenownLoss: 1,
  renownCap: MAX_RENOWN,
  reputationGain: 1,
  expiryCooldown: [4, 10],
  failureCooldown: [2, 8],
  pruningThreshold: 200,
  contractOpenTicks: 72,
  travelTicks: 2,
  difficultyScale: 1.15,
  encounterPartySize: PARTY_SIZE,
  lairStrengthGain: 1,
  lairStrengthCap: MAX_STRENGTH,
};

export interface WorkPosting {
  employer: Employer;
  holding?: Asset;
  theme?: ThemeId;
  level?: number;
  lair?: Lair | null;
}

export interface WorkContext extends BoardContext {
  config: DeepReadonly<BoardConfig>;
  breakLair: (lair: Lair, company: Party, work: ReadonlyQuest, context: BoardContext) => void;
}

/** Kind rules apply consequences; the Board owns terminal status and link release. */
export interface WorkBehavior {
  create: (kind: QuestKind, terms: WorkPosting, context: WorkContext) => Quest;
  post: (work: ReadonlyQuest, terms: WorkPosting, context: WorkContext) => void;
  success: (work: Readonly<Quest>, company: Party, employer: Employer, holding: Asset | undefined, context: WorkContext) => void;
  failure: (work: Readonly<Quest>, company: Party, employer: Employer, holding: Asset | undefined, context: WorkContext) => void;
  acceptance: (work: ReadonlyQuest, company: Party, context: WorkContext) => BoardEvent;
  /** Prepare expiry consequences, validating first. The Board closes work before applying them. */
  expire?: (work: ReadonlyQuest, context: WorkContext) => () => void;
  /** Absence means a broken lair does not withdraw this kind of work. */
  withdrawOnLairBreak?: (work: ReadonlyQuest, context: WorkContext) => void;
}

export type WorkKinds = Readonly<Record<QuestKind, WorkBehavior>>;

export const Contract: WorkBehavior = {
  create: createContract,
  post: postContract,
  success: payContract,
  failure: failContract,
  acceptance: contractAcceptance,
  expire: expireContract,
  withdrawOnLairBreak: withdrawContract,
};

export const Bounty: WorkBehavior = {
  create: createBounty,
  post: postBounty,
  success: payBounty,
  failure: failBounty,
  acceptance: bountyAcceptance,
};

export const WORK_KINDS: WorkKinds = { contract: Contract, assault: Bounty };

/** Game starts the expedition before publishing this acceptance event. */
export interface TakenWork {
  readonly travelTicks: number;
  readonly acceptance: BoardEvent;
}

/** The sole owner of work and its links to holdings, lairs and companies. */
export class Board {
  private work: Quest[] = [];

  constructor(private readonly config: DeepReadonly<BoardConfig>, private readonly kinds: WorkKinds = WORK_KINDS) {}

  /** Mutable escape hatches used only during Game.forTesting scenario setup. */
  replaceForScenario(work: Quest[]): void {
    this.work = work;
  }

  recordsForScenario(): Quest[] {
    return this.work;
  }

  all(): readonly ReadonlyQuest[] {
    return Object.freeze([...this.work]);
  }

  open(): readonly ReadonlyQuest[] {
    return Object.freeze(this.work.filter((work) => work.status === 'open'));
  }

  taken(): readonly ReadonlyQuest[] {
    return Object.freeze(this.work.filter((work) => work.status === 'taken'));
  }

  byId(id: string | null): ReadonlyQuest | undefined {
    return id ? this.work.find((work) => work.id === id) : undefined;
  }

  /** Post any registered kind, using its creation and posting rules. */
  post(kind: QuestKind, terms: WorkPosting, context: BoardContext): ReadonlyQuest {
    const behavior = this.behavior(kind);
    const rules = this.rules(context);
    const work = behavior.create(kind, terms, rules);
    this.work.push(work);
    behavior.post(work, terms, rules);
    return work;
  }

  postContract(employer: Employer, holding: Asset, theme: ThemeId, level: number, origin: Lair | null, context: BoardContext): ReadonlyQuest {
    return this.post('contract', { employer, holding, theme, level, lair: origin }, context);
  }

  postBounty(lair: Lair, context: BoardContext): ReadonlyQuest {
    return this.post('assault', { employer: serviceOf(context.town, 'guild'), lair }, context);
  }

  /** Link company and work; Expedition owns the journey and Game publishes acceptance. */
  take(company: Party, view: ReadonlyQuest, context: BoardContext): TakenWork {
    const work = this.owned(view);
    if (work.status !== 'open') throw new Error(`Cannot take "${work.title}": it is ${work.status}, not open.`);
    work.status = 'taken';
    work.partyId = company.id;
    company.questId = work.id;
    return { travelTicks: this.config.travelTicks, acceptance: this.behavior(work.kind).acceptance(work, company, this.rules(context)) };
  }

  /** Settlement alone releases the company. */
  settle(view: ReadonlyQuest, company: Party, success: boolean, context: BoardContext): void {
    const work = this.owned(view);
    if (work.status !== 'taken') throw new Error(`Cannot settle "${work.title}": it is ${work.status}, not taken.`);
    const employer = employerById(context.town, work.giverId);
    if (!employer) throw new Error(`Cannot settle "${work.title}": its employer is missing.`);
    company.questId = null;
    const holding = work.assetId ? assetById(context.town, work.assetId) : undefined;
    this.finish(work, success ? 'done' : 'failed', context);
    const behavior = this.behavior(work.kind);
    (success ? behavior.success : behavior.failure)(work, company, employer, holding, this.rules(context));
  }

  /** Expire unanswered work according to its kind, then prune finished records. */
  expireContracts(context: BoardContext): void {
    const rules = this.rules(context);
    for (const work of this.work) {
      if (work.status !== 'open' || context.tick - work.postedAt <= this.config.contractOpenTicks) continue;
      const expire = this.behavior(work.kind).expire;
      if (!expire) continue;
      const consequences = expire(work, rules);
      this.finish(work, 'failed', context);
      context.ledger.questsExpired += 1;
      consequences();
    }
    if (this.work.length > this.config.pruningThreshold) this.work = this.work.filter((work) => work.status === 'open' || work.status === 'taken');
  }

  withdrawOpenWork(employer: Employer, context: BoardContext): void {
    for (const work of this.work) {
      if (work.giverId !== employer.id || work.status !== 'open') continue;
      this.finish(work, 'failed', context);
    }
  }

  learnIntel(work: ReadonlyQuest): string {
    return learnQuestIntel(this.owned(work));
  }

  revealAll(work: ReadonlyQuest): void {
    revealAll(this.owned(work));
  }

  /** Finish work and release only the holding/lair links that name it. */
  private finish(work: Quest, status: 'done' | 'failed', context: BoardContext): void {
    work.status = status;
    const holding = work.assetId ? assetById(context.town, work.assetId) : undefined;
    if (holding?.questId === work.id) holding.questId = null;
    const lair = lairById(context.lairs, work.lairId);
    if (lair?.questId === work.id) lair.questId = null;
  }

  private owned(view: ReadonlyQuest): Quest {
    const work = this.work.find((work) => work.id === view.id);
    if (!work) throw new Error(`Work "${view.title}" is not on this Board.`);
    return work;
  }

  private behavior(kind: QuestKind): WorkBehavior {
    const behavior = this.kinds[kind];
    if (!behavior) throw new Error(`Unknown kind of work: ${kind}.`);
    return behavior;
  }

  private rules(context: BoardContext): WorkContext {
    return { ...context, config: this.config, breakLair: (lair, company, work, context) => this.breakLair(lair, company, work, context) };
  }

  private breakLair(lair: Lair, company: Party, work: ReadonlyQuest, context: BoardContext): void {
    lair.status = 'cleared';
    lair.clearedAt = context.tick;
    context.ledger.lairsCleared += 1;
    const found = context.payHoard(lair, company);
    company.renown = Math.min(this.config.renownCap, company.renown + this.config.bountyRenown);
    for (const candidate of this.work) {
      if (candidate.lairId !== lair.id || candidate.status !== 'open') continue;
      const consequences = this.behavior(candidate.kind).withdrawOnLairBreak;
      if (!consequences) continue;
      this.finish(candidate, 'failed', context);
      consequences(candidate, this.rules(context));
    }
    report(context, 'reward', `${company.name} break ${lair.name}. ${lair.boss} is dead at ${work.place}; the hoard yields ${found || 'nothing but bones'}. Renown ${company.renown}. The ${THEMES[lair.theme].label.toLowerCase()} scatter and every holding they held is free.`, true);
  }
}

interface BoardCounters {
  questsCompleted: number;
  questsFailed: number;
  questsExpired: number;
  itemsFound: number;
  raids: number;
  lairsCleared: number;
}

/**
 * Work statistics. Gold statistics are not written here. The second arm exists
 * so a statistics object that already names `goldPaid` — Game's ledger, and
 * existing Board fixtures — still typechecks. Board code cannot assign it.
 */
export type BoardLedger = BoardCounters | (BoardCounters & Pick<GoldStatistics, 'goldPaid'>);

export interface BoardEvent {
  kind: 'quest' | 'reward' | 'party' | 'economy';
  text: string;
  chronicle?: boolean;
}

export interface BoardContext {
  town: Town;
  lairs: readonly Lair[];
  rng: Rng;
  tick: number;
  ledger: BoardLedger;
  /** Publish immediately so observers see state at the moment of the event. */
  report: (event: BoardEvent) => void;
  /** Move a broken lair's hoard onto the company. Returns what was found, for the chronicle. */
  payHoard: (lair: Lair, company: Party) => string;
}

function createContract(kind: QuestKind, terms: WorkPosting, context: WorkContext): Quest {
  const { employer, holding, theme, level, lair: origin = null } = terms;
  if (!holding || !theme || level === undefined) throw new Error('A Contract needs a holding, theme and level.');
  if (holding.questId !== null) {
    throw new Error(`Cannot post a contract for ${holding.name}: it already has one.`);
  }
  const lair = origin ?? context.lairs.find((candidate) => candidate.status === 'active' && candidate.theme === theme) ?? null;
  const work = generateQuest(context.rng, {
    employer,
    asset: holding,
    theme,
    level,
    partySize: context.config.encounterPartySize,
    tick: context.tick,
    difficultyScale: context.config.difficultyScale,
    lair,
  });
  return { ...work, kind };
}

function postContract(quest: ReadonlyQuest, { employer, holding, lair: origin }: WorkPosting, context: WorkContext): void {
  if (!holding) throw new Error('A Contract needs a holding.');
  const lair = origin ?? lairById(context.lairs, quest.lairId);
  const theme = quest.theme;
  holding.questId = quest.id;
  const wasSafe = holding.status === 'safe';
  if (wasSafe) holding.status = 'threatened';
  employer.questsPosted += 1;
  if (lair) {
    lair.raids += 1;
    context.ledger.raids += 1;
  }
  const who = lair ? `${THEMES[theme].label} out of ${lair.name}` : THEMES[theme].label;
  const lead = wasSafe
    ? `${who} ${lair ? 'raid' : 'threaten'} ${holding.name}.`
    : capitalize(`${holding.name} is still overrun; ${employer.name} raise the bounty.`);
  const extras = [quest.itemReward ? `and a ${quest.itemReward.name}` : '', quest.guildOnly ? '(guild)' : ''].filter(Boolean).join(' ');
  report(context, 'quest', `${lead} ${employer.name} post a level ${quest.level} contract: "${quest.title}" [${difficultyCode(quest)}] for ${quest.reward} gp ${extras}`.trim() + '.');
}

function createBounty(kind: QuestKind, { employer, lair }: WorkPosting, context: WorkContext): Quest {
  if (!lair) throw new Error('A Bounty needs a lair.');
  if (lair.questId !== null) throw new Error(`Cannot post a bounty on ${lair.name}: it already has one.`);
  const work = generateAssault(context.rng, lair, employer, context.config.encounterPartySize, context.tick, context.config.difficultyScale);
  return { ...work, kind };
}

function postBounty(quest: ReadonlyQuest, { employer: guild, lair }: WorkPosting, context: WorkContext): void {
  if (!lair) throw new Error('A Bounty needs a lair.');
  lair.questId = quest.id;
  guild.questsPosted += 1;
  report(
    context,
    'quest',
    `The Adventurers’ Guild posts a bounty on ${lair.name}: "${quest.title}", level ${quest.level}, ${quest.encounters.length} fights ending with ${lair.boss}. ${quest.reward} gp, the ${quest.itemReward?.name ?? 'spoils'}, and whatever the hoard holds (${lair.hoard.gold} gp).`,
    true,
  );
}

function contractAcceptance(work: ReadonlyQuest, company: Party, context: WorkContext): BoardEvent {
  const employer = employerById(context.town, work.giverId);
  return { kind: 'quest', text: `${company.name} accept "${work.title}" from ${employer?.name ?? 'an unknown client'} and set out for ${work.place}.` };
}

function bountyAcceptance(work: ReadonlyQuest, company: Party, context: WorkContext): BoardEvent {
  const lair = lairById(context.lairs, work.lairId);
  if (!lair) return contractAcceptance(work, company, context);
  return { kind: 'quest', text: `${company.name} take the guild’s bounty on ${lair.name} and march on ${lair.place}. ${lair.boss} waits at the end of it.`, chronicle: true };
}

function bountyLair(work: ReadonlyQuest, context: BoardContext): Lair {
  const lair = lairById(context.lairs, work.lairId);
  if (!lair) throw new Error(`Cannot settle bounty "${work.title}": its lair is missing.`);
  return lair;
}

function withdrawContract(work: ReadonlyQuest, context: WorkContext): void {
  const holding = work.assetId ? assetById(context.town, work.assetId) : undefined;
  if (holding) {
    holding.status = 'safe';
  }
}

function payContract(work: Readonly<Quest>, company: Party, employer: Employer, holding: Asset | undefined, context: WorkContext): void {
  let windfall = 0;
  if (holding) {
    windfall = holding.incomePerDay * context.config.windfallDays;
    holding.status = 'safe';
  }
  const statistics = goldStatistics(context.ledger);
  // Windfall and reward used to be one treasury assignment. Both finish before the reward event.
  source(treasury(employer), windfall, 'windfall', statistics);
  transfer(treasury(employer), purse(company), work.reward, 'reward', statistics);
  employer.questsCompleted += 1;
  employer.reputation += context.config.reputationGain;
  company.questsDone += 1;
  company.renown = Math.min(context.config.renownCap, company.renown + context.config.contractRenown);
  context.ledger.questsCompleted += 1;
  let inKind = '';
  if (work.itemReward) {
    company.stash.push(work.itemReward);
    context.ledger.itemsFound += 1;
    inKind = ` and a ${work.itemReward.name}`;
  }
  report(
    context,
    'reward',
    `${company.name} return to ${context.town.name}. ${employer.name} pay ${work.reward} gp${inKind}; ${holding ? `${holding.name} is back in business (+${windfall} gp recovered)` : 'the client is grateful'}. Purse: ${company.gold} gp.`,
  );
  if (holding && (holding.loot.gold > 0 || holding.loot.items.length > 0)) {
    const found = [holding.loot.items.map((item) => item.name).join(', '), holding.loot.gold > 0 ? `${holding.loot.gold} gp` : ''].filter(Boolean).join(' and ');
    const items = holding.loot.items;
    transfer(loot(holding), purse(company), holding.loot.gold, 'spoils', statistics);
    company.stash.push(...items);
    context.ledger.itemsFound += items.length;
    holding.loot.items = [];
    report(context, 'reward', `Among the bones at ${holding.name}, ${company.name} find ${found}: all that is left of the last company that came this way.`, true);
  }
}

function failContract(work: Readonly<Quest>, company: Party, employer: Employer, holding: Asset | undefined, context: WorkContext): void {
  employer.questsFailed += 1;
  company.questsFailed += 1;
  company.renown = Math.max(0, company.renown - context.config.failureRenownLoss);
  context.ledger.questsFailed += 1;
  employer.cooldown = Math.min(employer.cooldown, context.rng.int(...context.config.failureCooldown));
  const lair = lairById(context.lairs, work.lairId);
  if (lair) unansweredRaid(lair, context);
  report(context, 'party', `${company.name} limp back to ${context.town.name} empty-handed.${holding ? ` ${capitalize(holding.name)} remains in enemy hands.` : ''}`);
}

function payBounty(work: Readonly<Quest>, company: Party, guild: Employer, _holding: Asset | undefined, context: WorkContext): void {
  const lair = bountyLair(work, context);
  transfer(treasury(guild), purse(company), work.reward, 'reward', goldStatistics(context.ledger));
  guild.questsCompleted += 1;
  guild.reputation += context.config.reputationGain;
  company.questsDone += 1;
  context.ledger.questsCompleted += 1;
  if (work.itemReward) {
    company.stash.push(work.itemReward);
    context.ledger.itemsFound += 1;
  }
  report(context, 'reward', `${company.name} return to ${context.town.name} to a hero’s welcome. The guild pays its bounty of ${work.reward} gp${work.itemReward ? ` and hands over the ${work.itemReward.name}` : ''}.`);
  context.breakLair(lair, company, work, context);
}

function failBounty(work: Readonly<Quest>, company: Party, guild: Employer, _holding: Asset | undefined, context: WorkContext): void {
  const lair = bountyLair(work, context);
  lair.strength = Math.min(context.config.lairStrengthCap, lair.strength + context.config.lairStrengthGain);
  guild.questsFailed += 1;
  company.questsFailed += 1;
  company.renown = Math.max(0, company.renown - context.config.failureRenownLoss);
  context.ledger.questsFailed += 1;
  report(context, 'party', `${company.name} come back from ${lair.place} beaten. ${capitalize(lair.name)} stands, and grows bolder.`);
}

function expireContract(contract: ReadonlyQuest, context: WorkContext): () => void {
  const employer = employerById(context.town, contract.giverId);
  const holding = contract.assetId ? assetById(context.town, contract.assetId) : undefined;
  if (!employer) throw new Error(`Cannot expire "${contract.title}": its employer is missing.`);
  if (!holding) throw new Error(`Cannot expire "${contract.title}": its holding is missing.`);
  return () => {
    const loss = Math.max(0, Math.min(employer.treasury, holding.incomePerDay * context.config.lootingDays));
    const lair = lairById(context.lairs, contract.lairId);
    const statistics = goldStatistics(context.ledger);
    if (lair?.status === 'active') transfer(treasury(employer), hoard(lair), loss, 'looting', statistics);
    else sink(treasury(employer), loss, 'forfeit', statistics);
    if (lair) unansweredRaid(lair, context);
    employer.cooldown = Math.min(employer.cooldown, context.rng.int(...context.config.expiryCooldown));
    if (holding.status === 'threatened') {
      holding.status = 'ravaged';
      holding.timesRavaged += 1;
      report(context, 'economy', `Nobody answered "${contract.title}". ${THEMES[contract.theme].label} overrun ${holding.name}; ${employer.name} lose ${loss} gp and the income of the ${ASSET_KINDS[holding.kind].label} with it.`, true);
    } else {
      report(context, 'economy', `Nobody answered "${contract.title}". ${capitalize(holding.name)} stays in enemy hands and ${employer.name} lose another ${loss} gp.`);
    }
  };
}

function employerById(town: Town, id: string): Employer | undefined {
  return town.employers.find((employer) => employer.id === id);
}

function lairById(lairs: readonly Lair[], id: string | null): Lair | undefined {
  return id ? lairs.find((lair) => lair.id === id) : undefined;
}

function unansweredRaid(lair: Lair, context: WorkContext): void {
  if (lair.status !== 'active') return;
  lair.raidsWon += 1;
  lair.strength = Math.min(context.config.lairStrengthCap, lair.strength + context.config.lairStrengthGain);
}

function report(context: BoardContext, kind: BoardEvent['kind'], text: string, chronicle = false): void {
  context.report({ kind, text, ...(chronicle ? { chronicle: true } : {}) });
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
