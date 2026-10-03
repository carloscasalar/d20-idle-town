import { freeze } from '../core/freeze';
import { describeHero, resurrectHero, resurrectionCost, DEFAULT_HERO_ECONOMY, type Hero, type HeroEconomyConfig } from './hero';
import { aliveMembers, createParty, deadMembers, describeParty, partyLevel, type Party, type ReadonlyParty } from './party';
import { listNames } from '../core/names';
import type { DeepReadonly } from '../core/readonly';
import type { Rng } from '../core/rng';
import { seekJobIntelligence, type JobIntelContext, type JobIntelStep } from '../quests/job-intel';
import type { ReadonlyQuest } from '../quests/quest';
import { coinReasons, purse, sink, transfer, treasury, type GoldStatistics } from '../town/coin';
import { visitTownServices, type TownServiceStep, type TownServiceContext } from '../town/services';
import { advanceExpedition, startExpedition, type ExpeditionContext } from '../sim/expedition';
import type { Board, BoardContext, TakenWork } from '../sim/board';
import { DEFAULT_HOLDING_CONFIG, type HoldingConfig } from '../town/assets';
import { retiredEmployer, serviceOf, type Town, type TownConfig, DEFAULT_TOWN_CONFIG } from '../town/town';

/** Plain data; all durations are in ticks. Shared defaults retain their one definition. */
export interface CompanyRosterConfig {
  maxCompanies: number;
  arrivalInterval: number;
  patienceTicks: number;
  disbandTicks: number;
  companySize: number;
  maxCompanySize: number;
  /** Cap on company renown. The Board and Expedition receive this value. */
  renownCap: number;
  retirementLevel: number;
  retirementPrice: number;
  retirementCapitalShare: number;
  firstArrivalTick: number;
  arrivalQuestLevelChance: number;
  strangerExtraMembers: number;
  recruitLevelTolerance: number;
}

export const DEFAULT_COMPANY_ROSTER_CONFIG: CompanyRosterConfig = freeze({
  maxCompanies: 8,
  arrivalInterval: 10,
  patienceTicks: 12,
  disbandTicks: 72,
  companySize: 4,
  maxCompanySize: 6,
  renownCap: 10,
  retirementLevel: 8,
  retirementPrice: 25000,
  retirementCapitalShare: 0.2,
  firstArrivalTick: 1,
  arrivalQuestLevelChance: 0.3,
  strangerExtraMembers: 1,
  recruitLevelTolerance: 1,
});

export interface RosterEvent {
  kind: 'party' | 'death' | 'temple' | 'town';
  text: string;
  chronicle?: boolean;
}

export interface RosterLedger {
  partiesArrived: number;
  resurrections: number;
  retirements: number;
}

export interface RosterEventContext {
  statistics: GoldStatistics;
  report: (event: RosterEvent) => void;
}

export interface RecruitmentContext extends RosterEventContext {
  town: Town;
  ledger: Pick<RosterLedger, 'resurrections'>;
}

export interface RetirementContext extends RosterEventContext {
  town: Town;
  rng: Rng;
  ledger: Pick<RosterLedger, 'retirements'>;
}

export interface ArrivalContext extends Pick<RosterEventContext, 'report'> {
  town: Town;
  rng: Rng;
  tick: number;
  ledger: Pick<RosterLedger, 'partiesArrived'>;
  board: { open(): readonly ReadonlyQuest[] };
}

/** Game assembles these dependencies; each operation accepts only the subset it needs. */
export interface RosterContext extends RosterEventContext {
  town: Town;
  rng: Rng;
  ledger: RosterLedger;
  tick: number;
}

/** Owns company population and membership; Game still chooses idle work. */
export class CompanyRoster {
  private companies: Party[] = [];
  private nextArrival: number;

  constructor(
    private readonly config: DeepReadonly<CompanyRosterConfig> = DEFAULT_COMPANY_ROSTER_CONFIG,
    private readonly heroes: HeroEconomyConfig = DEFAULT_HERO_ECONOMY,
    private readonly townRules: TownConfig = DEFAULT_TOWN_CONFIG,
    private readonly holdings: HoldingConfig = DEFAULT_HOLDING_CONFIG,
  ) {
    this.nextArrival = config.firstArrivalTick;
  }

  all(): readonly ReadonlyParty[] {
    return Object.freeze([...this.companies]);
  }

  active(): readonly ReadonlyParty[] {
    return Object.freeze(this.activeCompanies);
  }

  byId(id: string | null): ReadonlyParty | undefined {
    return id ? this.companies.find((p) => p.id === id) : undefined;
  }

  /** Mutable setup only, backing GameScenario.parties. */
  recordsForScenario(): Party[] {
    return this.companies;
  }

  replaceForScenario(companies: Party[]): void {
    this.companies = companies;
  }

  /** Visit read-only companies for their hourly action, in the existing renown order.
   * Snapshot iteration intentionally includes donors disbanded earlier in this hour.
   */
  updateActive(update: (company: ReadonlyParty) => void): void {
    for (const company of [...this.activeCompanies].sort((a, b) => b.renown - a.renown)) update(company);
  }

  /** Mutating activity operations resolve roster-owned records, never lending them to Game. */
  wait(company: ReadonlyParty): void {
    this.owned(company).idleTicks += 1;
  }

  advance(company: ReadonlyParty, context: ExpeditionContext): void {
    advanceExpedition(this.owned(company), context);
  }

  depart(company: ReadonlyParty, work: ReadonlyQuest, context: { board: Pick<Board, 'take'>; work: BoardContext }): TakenWork {
    const p = this.owned(company);
    const departure = context.board.take(p, work, context.work);
    startExpedition(p, departure.travelTicks);
    return departure;
  }

  visitServices(company: ReadonlyParty, steps: readonly TownServiceStep[], context: TownServiceContext): boolean {
    return visitTownServices(this.owned(company), context, steps);
  }

  /** The supplied steps decide what is learned. This only resolves the owned company. */
  seekIntelligence(company: ReadonlyParty, steps: readonly JobIntelStep[], context: JobIntelContext): boolean {
    return seekJobIntelligence(this.owned(company), context, steps);
  }

  bury(company: ReadonlyParty): readonly DeepReadonly<Hero>[] {
    return buryDead(this.owned(company));
  }

  isReady(company: ReadonlyParty): boolean { return aliveMembers(company).length >= this.config.companySize; }
  hasRoom(company: ReadonlyParty): boolean { return aliveMembers(company).length < this.config.maxCompanySize; }

  disband(company: ReadonlyParty): void { disbandCompany(this.owned(company)); }

  merge(host: ReadonlyParty, donor: ReadonlyParty, context: Pick<RosterEventContext, 'statistics'>): readonly DeepReadonly<Hero>[] {
    return mergeMembers(this.owned(host), this.owned(donor), this.config.maxCompanySize, context.statistics);
  }

  /** The caller places this step in its service list. Services know nothing of its rule. */
  retirementStep(context: RetirementContext): TownServiceStep {
    return (company) => this.retire(company, context);
  }

  arrivals(context: ArrivalContext): void {
    if (context.tick < this.nextArrival) return;
    this.nextArrival = context.tick + context.rng.int(Math.ceil(this.config.arrivalInterval / 2), this.config.arrivalInterval * 2);
    if (this.activeCompanies.length >= this.config.maxCompanies) return;

    const stranded = this.activeCompanies.find((p) => p.status === 'idle' && !this.isReady(p) && p.idleTicks >= this.config.patienceTicks);
    if (stranded) {
      const missing = this.config.companySize - aliveMembers(stranded).length;
      const band = createParty(context.rng, partyLevel(stranded), context.rng.int(Math.max(1, missing), Math.max(1, missing) + this.config.strangerExtraMembers), context.tick, this.heroes.startingGoldPerLevel);
      this.companies.push(band);
      context.ledger.partiesArrived += 1;
      log(context, 'party', `${describeParty(band, this.config.companySize)} arrive at ${context.town.tavernName}: survivors of another company, looking for work.`);
      return;
    }

    let level = 1;
    if (context.board.open().length > 0 && context.rng.chance(this.config.arrivalQuestLevelChance)) level = context.rng.pick(context.board.open()).level;
    const party = createParty(context.rng, level, this.config.companySize, context.tick, this.heroes.startingGoldPerLevel);
    this.companies.push(party);
    context.ledger.partiesArrived += 1;
    log(context, 'party', `${describeParty(party, this.config.companySize)} arrive at ${context.town.tavernName}: ${party.members.map(describeHero).join(', ')}.`);
  }

  /** The most seasoned living veteran may retire when the company can afford a business. */
  retire(company: ReadonlyParty, context: RetirementContext): boolean {
    const p = this.owned(company);
    const veteran = aliveMembers(p)
      .filter((h) => h.level >= this.config.retirementLevel)
      .sort((a, b) => b.level - a.level || b.xp - a.xp)[0];
    if (!veteran || p.gold < this.config.retirementPrice + resurrectionCost(partyLevel(p), this.heroes)) return false;
    p.members = p.members.filter((h) => h !== veteran);
    for (const item of veteran.items) p.stash.push(item);
    veteran.items = [];
    const capital = Math.floor(this.config.retirementPrice * this.config.retirementCapitalShare);
    const employer = retiredEmployer(context.rng, veteran.name, p.id, this.townRules, this.holdings);
    // By default 20,000 leaves the world and 5,000 opens the treasury. No event between them.
    sink(purse(p), this.config.retirementPrice - capital, 'retirement', context.statistics, coinReasons);
    transfer(purse(p), treasury(employer), capital, 'retirement', context.statistics, coinReasons);
    context.town.employers.push(employer);
    context.ledger.retirements += 1;
    chronicleLog(context,
      'town',
      `${describeHero(veteran)} retires from ${p.name}, buys ${employer.assets[0]!.name} for ${this.config.retirementPrice} gp and settles in ${context.town.name}. Old friends will hear of any trouble first.`,
    );
    return true;
  }

  /** Fill empty seats: temple first if the coin is there, then merge with another incomplete band. */
  recruit(company: ReadonlyParty, context: RecruitmentContext): void {
    const p = this.owned(company);
    const temple = serviceOf(context.town, 'temple');
    const raised: Hero[] = [];
    let bill = 0;
    if (!temple.ruined) {
      for (const dead of deadMembers(p)) {
        const cost = resurrectionCost(dead.level, this.heroes);
        if (p.gold < cost) continue;
        transfer(purse(p), treasury(temple), cost, 'service', context.statistics, coinReasons, dead);
        resurrectHero(dead, this.heroes);
        context.ledger.resurrections += 1;
        raised.push(dead);
        bill += cost;
      }
    }
    if (raised.length > 0) {
      chronicleLog(context, 'temple', `${p.name} pay ${bill} gp at the ${temple.name}. ${listNames(raised.map(describeHero))} ${raised.length === 1 ? 'draws' : 'draw'} breath again.`);
    }
    if (this.isReady(p)) return;

    const level = partyLevel(p);
    const donor = this.activeCompanies.find((o) => o !== p && o.status === 'idle' && !this.isReady(o) && partyLevel(o) === level);
    if (donor) {
      this.absorb(p, donor, false, context);
      return;
    }
    // Nobody in the same boat. After a few days the survivors sign on with whoever has room.
    if (p.idleTicks < this.config.disbandTicks) return;
    const host = this.activeCompanies
      .filter((o) => o !== p && (o.status === 'idle' || o.status === 'resting') && this.isReady(o) && this.hasRoom(o) && Math.abs(partyLevel(o) - level) <= this.config.recruitLevelTolerance)
      .sort((a, b) => Math.abs(partyLevel(a) - level) - Math.abs(partyLevel(b) - level) || aliveMembers(a).length - aliveMembers(b).length)[0];
    if (!host) return;
    this.absorb(host, p, true, context);
  }

  /** Donor survivors join the host while there is room; a host with six turns the rest away. */
  absorb(hostView: ReadonlyParty, donorView: ReadonlyParty, gaveUp: boolean, context: RosterEventContext): void {
    const host = this.owned(hostView);
    const donor = this.owned(donorView);
    const donorName = donor.name;
    const donorMembers = aliveMembers(donor).map((h) => h.name);
    const leftover = this.merge(host, donor, context);
    const size = aliveMembers(host).length;
    if (leftover.length === 0) {
      for (const h of buryDead(donor)) log(context, 'death', `${donorName} leave ${h.name} in the temple's care for good.`);
      this.disband(donor);
      log(context,
        'party',
        gaveUp
          ? `${donorName} give up waiting. ${listNames(donorMembers)} sign on with ${host.name}, now ${size} strong.`
          : `${donorName} (${listNames(donorMembers)}) join ${host.name}. The company marches ${size} strong.`,
      );
    } else {
      log(context, 'party', `${host.name} take on ${listNames(donorMembers.filter((n) => !leftover.some((h) => h.name === n)))} from ${donorName}; ${listNames(leftover.map((h) => h.name))} stay behind waiting for another band.`);
    }
    if (this.isReady(host)) {
      for (const h of buryDead(host)) log(context, 'death', `${host.name} lay ${h.name} to rest. They will not be coming back.`);
    }
  }

  private get activeCompanies(): Party[] {
    return this.companies.filter((p) => p.status !== 'disbanded');
  }

  private owned(view: ReadonlyParty): Party {
    const company = this.companies.find((p) => p.id === view.id);
    if (!company) throw new Error(`Company ${view.name} is not in this roster.`);
    return company;
  }
}

function mergeMembers(host: Party, donor: Party, maxCompanySize: number, statistics: GoldStatistics): Hero[] {
  const moved: Hero[] = [];
  for (const h of aliveMembers(donor)) {
    if (aliveMembers(host).length >= maxCompanySize) break;
    host.members.push(h);
    moved.push(h);
  }
  donor.members = donor.members.filter((h) => !moved.includes(h));
  transfer(purse(donor), purse(host), donor.gold, 'merger', statistics, coinReasons);
  host.potions += donor.potions;
  donor.potions = 0;
  host.stash.push(...donor.stash);
  donor.stash = [];
  host.renown = Math.max(host.renown, donor.renown);
  return aliveMembers(donor);
}

/** Drops fallen members who will never be raised (party gave up on them). */
function buryDead(p: Party): Hero[] {
  const dead = deadMembers(p);
  p.members = p.members.filter((m) => m.alive);
  return dead;
}

/** Private disbanding, reached only through roster ownership checks. */
function disbandCompany(company: Party): void { company.status = 'disbanded'; }

function log(context: Pick<RosterEventContext, 'report'>, kind: RosterEvent['kind'], text: string): void {
  context.report({ kind, text });
}
function chronicleLog(context: Pick<RosterEventContext, 'report'>, kind: RosterEvent['kind'], text: string): void {
  context.report({ kind, text, chronicle: true });
}
