import { MAX_RENOWN, PARTY_SIZE, type Party } from '../adventurers/party';
import type { Rng } from '../core/rng';
import { difficultyCode, generateAssault, generateQuest, type Quest } from '../quests/quest';
import { THEMES, type ThemeId } from '../quests/themes';
import { ASSET_KINDS, type Asset } from '../town/assets';
import { MAX_STRENGTH, type Lair } from '../town/lairs';
import { assetById, serviceOf, type Employer, type Town } from '../town/town';

/** Days of a holding's income the owner recovers when a contract succeeds. */
const WINDFALL_DAYS = 4;
/** Days of income lost to looters when nobody answers a contract. */
const LOOTING_DAYS = 2;
/** Renown for breaking a lair. */
const ASSAULT_RENOWN = 3;

/**
 * The Board owns every contract and bounty. It is the only code that writes
 * `quest.status`, `quest.partyId`, a holding's `questId`, a lair's `questId`,
 * or a company's `questId`.
 */
export class Board {
  private work: Quest[] = [];

  /** Replace the list. Scenario setup assigns `scenario.quests`. */
  replace(work: Quest[]): void {
    this.work = work;
  }

  /**
   * The live list. Scenario setup pushes onto the array it just assigned.
   * Everyone else uses {@link open}, {@link taken}, {@link byId}, or {@link all}.
   */
  records(): Quest[] {
    return this.work;
  }

  /** Every contract and bounty, in posting order. The array itself is read-only. */
  all(): readonly Quest[] {
    return Object.freeze([...this.work]);
  }

  open(): readonly Quest[] {
    return Object.freeze(this.work.filter((quest) => quest.status === 'open'));
  }

  taken(): readonly Quest[] {
    return Object.freeze(this.work.filter((quest) => quest.status === 'taken'));
  }

  byId(id: string | null): Quest | undefined {
    return id ? this.work.find((quest) => quest.id === id) : undefined;
  }

  /** Post a contract for a holding. `origin` is the raiding lair, when the raid is theirs. */
  postContract(employer: Employer, holding: Asset, theme: ThemeId, level: number, origin: Lair | null, context: BoardContext): Quest {
    if (holding.questId !== null) {
      throw new Error(`Cannot post a contract for ${holding.name}: it already has one.`);
    }
    const lair = origin ?? context.lairs.find((candidate) => candidate.status === 'active' && candidate.theme === theme) ?? null;
    const quest = generateQuest(context.rng, {
      employer,
      asset: holding,
      theme,
      level,
      partySize: PARTY_SIZE,
      tick: context.tick,
      difficultyScale: context.difficultyScale,
      lair,
    });
    this.work.push(quest);
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
    return quest;
  }

  /** Post the guild's bounty on a lair. */
  postBounty(lair: Lair, context: BoardContext): Quest {
    if (lair.questId !== null) throw new Error(`Cannot post a bounty on ${lair.name}: it already has one.`);
    const guild = serviceOf(context.town, 'guild');
    const quest = generateAssault(context.rng, lair, guild, PARTY_SIZE, context.tick, context.difficultyScale);
    this.work.push(quest);
    lair.questId = quest.id;
    guild.questsPosted += 1;
    report(
      context,
      'quest',
      `The Adventurers’ Guild posts a bounty on ${lair.name}: "${quest.title}", level ${quest.level}, ${quest.encounters.length} fights ending with ${lair.boss}. ${quest.reward} gp, the ${quest.itemReward?.name ?? 'spoils'}, and whatever the hoard holds (${lair.hoard.gold} gp).`,
      true,
    );
    return quest;
  }

  /** A company accepts open work and sets out. */
  take(company: Party, work: Quest, travelTicks: number, context: BoardContext): void {
    if (work.status !== 'open') throw new Error(`Cannot take "${work.title}": it is ${work.status}, not open.`);
    work.status = 'taken';
    work.partyId = company.id;
    company.questId = work.id;
    company.status = 'traveling';
    company.ticksLeft = travelTicks;
    company.idleTicks = 0;
    const employer = employerById(context.town, work.giverId);
    const lair = lairById(context.lairs, work.lairId);
    if (work.kind === 'assault' && lair) {
      report(context, 'quest', `${company.name} take the guild’s bounty on ${lair.name} and march on ${lair.place}. ${lair.boss} waits at the end of it.`, true);
    } else {
      report(context, 'quest', `${company.name} accept "${work.title}" from ${employer?.name ?? 'an unknown client'} and set out for ${work.place}.`);
    }
  }

  /** Settle taken work as succeeded or failed, including payment and a broken lair. */
  settle(work: Quest, company: Party, success: boolean, context: BoardContext): void {
    if (work.status !== 'taken') throw new Error(`Cannot settle "${work.title}": it is ${work.status}, not taken.`);
    releaseCompany(company);
    const employer = employerById(context.town, work.giverId);
    const holding = work.assetId ? assetById(context.town, work.assetId) : undefined;
    if (holding) holding.questId = null;
    if (!employer) throw new Error(`Cannot settle "${work.title}": its employer is missing.`);
    if (work.kind === 'assault') {
      this.settleBounty(work, company, employer, success, context);
      return;
    }
    if (success) this.payContract(work, company, employer, holding, context);
    else this.failContract(work, company, employer, holding, context);
  }

  /** Fail open contracts that have waited longer than `unansweredFor` ticks, then drop finished work. */
  expireContracts(context: BoardContext, unansweredFor: number): void {
    for (const contract of this.work) {
      if (contract.status !== 'open' || contract.kind === 'assault' || context.tick - contract.postedAt <= unansweredFor) continue;
      contract.status = 'failed';
      context.ledger.questsExpired += 1;
      const employer = employerById(context.town, contract.giverId);
      const holding = contract.assetId ? assetById(context.town, contract.assetId) : undefined;
      // A contract can be closed and counted even when its employer or holding is already gone.
      if (!employer || !holding) continue;
      holding.questId = null;
      const loss = Math.max(0, Math.min(employer.treasury, holding.incomePerDay * LOOTING_DAYS));
      employer.treasury -= loss;
      employer.spent += loss;
      const lair = lairById(context.lairs, contract.lairId);
      if (lair) unansweredRaid(lair, loss);
      employer.cooldown = Math.min(employer.cooldown, context.rng.int(4, 10));
      if (holding.status === 'threatened') {
        holding.status = 'ravaged';
        holding.timesRavaged += 1;
        report(context, 'economy', `Nobody answered "${contract.title}". ${THEMES[contract.theme].label} overrun ${holding.name}; ${employer.name} lose ${loss} gp and the income of the ${ASSET_KINDS[holding.kind].label} with it.`, true);
      } else {
        report(context, 'economy', `Nobody answered "${contract.title}". ${capitalize(holding.name)} stays in enemy hands and ${employer.name} lose another ${loss} gp.`);
      }
    }
    if (this.work.length > 200) this.work = this.work.filter((quest) => quest.status === 'open' || quest.status === 'taken');
  }

  /** Withdraw an employer's open work when that employer is ruined. */
  withdrawOpenWork(employer: Employer, context: BoardContext): void {
    for (const quest of this.work) {
      if (quest.giverId !== employer.id || quest.status !== 'open') continue;
      quest.status = 'failed';
      const holding = quest.assetId ? assetById(context.town, quest.assetId) : undefined;
      if (holding?.questId === quest.id) holding.questId = null;
      const lair = lairById(context.lairs, quest.lairId);
      if (lair?.questId === quest.id) lair.questId = null;
    }
  }

  private payContract(work: Quest, company: Party, employer: Employer, holding: Asset | undefined, context: BoardContext): void {
    work.status = 'done';
    let windfall = 0;
    if (holding) {
      windfall = holding.incomePerDay * WINDFALL_DAYS;
      holding.status = 'safe';
    }
    employer.treasury += windfall - work.reward;
    employer.earned += windfall;
    employer.spent += work.reward;
    employer.questsCompleted += 1;
    employer.reputation += 1;
    company.gold += work.reward;
    company.earned += work.reward;
    company.questsDone += 1;
    company.renown = Math.min(MAX_RENOWN, company.renown + 1);
    context.ledger.questsCompleted += 1;
    context.ledger.goldPaid += work.reward;
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
      company.gold += holding.loot.gold;
      company.earned += holding.loot.gold;
      company.stash.push(...holding.loot.items);
      context.ledger.itemsFound += holding.loot.items.length;
      holding.loot = { gold: 0, items: [] };
      report(context, 'reward', `Among the bones at ${holding.name}, ${company.name} find ${found}: all that is left of the last company that came this way.`, true);
    }
  }

  private failContract(work: Quest, company: Party, employer: Employer, holding: Asset | undefined, context: BoardContext): void {
    work.status = 'failed';
    employer.questsFailed += 1;
    company.questsFailed += 1;
    company.renown = Math.max(0, company.renown - 1);
    context.ledger.questsFailed += 1;
    employer.cooldown = Math.min(employer.cooldown, context.rng.int(2, 8));
    const lair = lairById(context.lairs, work.lairId);
    if (lair) unansweredRaid(lair, 0);
    report(context, 'party', `${company.name} limp back to ${context.town.name} empty-handed.${holding ? ` ${capitalize(holding.name)} remains in enemy hands.` : ''}`);
  }

  private settleBounty(work: Quest, company: Party, guild: Employer, success: boolean, context: BoardContext): void {
    const lair = lairById(context.lairs, work.lairId);
    if (!lair) throw new Error(`Cannot settle bounty "${work.title}": its lair is missing.`);
    if (success) {
      lair.questId = null;
      work.status = 'done';
      guild.treasury -= work.reward;
      guild.spent += work.reward;
      guild.questsCompleted += 1;
      guild.reputation += 1;
      company.gold += work.reward;
      company.earned += work.reward;
      company.questsDone += 1;
      context.ledger.questsCompleted += 1;
      context.ledger.goldPaid += work.reward;
      if (work.itemReward) {
        company.stash.push(work.itemReward);
        context.ledger.itemsFound += 1;
      }
      report(context, 'reward', `${company.name} return to ${context.town.name} to a hero’s welcome. The guild pays its bounty of ${work.reward} gp${work.itemReward ? ` and hands over the ${work.itemReward.name}` : ''}.`);
      this.breakLair(lair, company, work, context);
    } else {
      work.status = 'failed';
      lair.questId = null;
      lair.strength = Math.min(MAX_STRENGTH, lair.strength + 1);
      guild.questsFailed += 1;
      company.questsFailed += 1;
      company.renown = Math.max(0, company.renown - 1);
      context.ledger.questsFailed += 1;
      report(context, 'party', `${company.name} come back from ${lair.place} beaten. ${capitalize(lair.name)} stands, and grows bolder.`);
    }
  }

  private breakLair(lair: Lair, company: Party, work: Quest, context: BoardContext): void {
    lair.status = 'cleared';
    lair.clearedAt = context.tick;
    context.ledger.lairsCleared += 1;
    const found = context.payHoard(lair, company);
    company.renown = Math.min(MAX_RENOWN, company.renown + ASSAULT_RENOWN);
    for (const contract of this.work) {
      if (contract.lairId !== lair.id || contract.kind !== 'contract' || contract.status !== 'open') continue;
      contract.status = 'failed';
      const holding = contract.assetId ? assetById(context.town, contract.assetId) : undefined;
      if (holding) {
        holding.questId = null;
        holding.status = 'safe';
      }
    }
    report(context, 'reward', `${company.name} break ${lair.name}. ${lair.boss} is dead at ${work.place}; the hoard yields ${found || 'nothing but bones'}. Renown ${company.renown}. The ${THEMES[lair.theme].label.toLowerCase()} scatter and every holding they held is free.`, true);
  }
}

export interface BoardLedger {
  questsCompleted: number;
  questsFailed: number;
  questsExpired: number;
  goldPaid: number;
  itemsFound: number;
  raids: number;
  lairsCleared: number;
}

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
  difficultyScale: number;
  ledger: BoardLedger;
  /** Publish immediately so observers see state at the moment of the event. */
  report: (event: BoardEvent) => void;
  /** Move a broken lair's hoard onto the company. Returns what was found, for the chronicle. */
  payHoard: (lair: Lair, company: Party) => string;
}

/**
 * Drop the company's link to its work. Settlement does this too; an expedition
 * releases the company first so the settlement callback still sees it already gone.
 */
export function releaseCompany(company: Party): void {
  company.questId = null;
}

function employerById(town: Town, id: string): Employer | undefined {
  return town.employers.find((employer) => employer.id === id);
}

function lairById(lairs: readonly Lair[], id: string | null): Lair | undefined {
  return id ? lairs.find((lair) => lair.id === id) : undefined;
}

function unansweredRaid(lair: Lair, gold: number): void {
  if (lair.status !== 'active') return;
  lair.raidsWon += 1;
  lair.strength = Math.min(MAX_STRENGTH, lair.strength + 1);
  lair.hoard.gold += gold;
}

function report(context: BoardContext, kind: BoardEvent['kind'], text: string, chronicle = false): void {
  context.report({ kind, text, ...(chronicle ? { chronicle: true } : {}) });
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
