import {
  armorUpgradeCost,
  describeHero,
  gainXp,
  healHero,
  killHero,
  MAX_ARMOR_TIER,
  potionCost,
  potionHeal,
  resurrectHero,
  resurrectionCost,
  type Hero,
} from '../adventurers/hero';
import {
  aliveMembers,
  buryDead,
  createParty,
  deadMembers,
  describeParty,
  isFull,
  mergeParties,
  partyLevel,
  PARTY_SIZE,
  type Party,
} from '../adventurers/party';
import { runCombat } from '../combat/battlecast';
import { Rng } from '../core/rng';
import { describeEncounter } from '../quests/encounters';
import { difficultyCode, generateQuest, type Quest } from '../quests/quest';
import { THEMES } from '../quests/themes';
import { ASSET_KINDS, rollThreat, type Asset } from '../town/assets';
import { assetById, dailyIncome, generateTown, serviceOf, type Employer, type Town } from '../town/town';

export type EventKind = 'town' | 'quest' | 'party' | 'combat' | 'death' | 'levelup' | 'temple' | 'reward' | 'economy' | 'shop';

export interface GameEvent {
  tick: number;
  kind: EventKind;
  text: string;
  /** Combat narration lines, shown collapsed under the event. */
  detail?: string[];
}

export interface GameStats {
  questsCompleted: number;
  questsFailed: number;
  questsExpired: number;
  heroesDied: number;
  resurrections: number;
  partiesWiped: number;
  partiesArrived: number;
  goldPaid: number;
  goldSpentByHeroes: number;
  employersRuined: number;
}

export interface GameConfig {
  seed: number;
  maxOpenQuests: number;
  maxParties: number;
  /** Mean ticks between party arrivals. */
  arrivalInterval: number;
  travelTicks: number;
  restTicks: number;
  /** Ticks an incomplete party waits before a band of strangers shows up to fill it. */
  patienceTicks: number;
  /** Days a contract stays on the board before the employer gives up and the asset is overrun. */
  contractDays: number;
  /** Consecutive days in the red before an employer is ruined. */
  ruinDays: number;
}

export const DEFAULT_CONFIG: GameConfig = {
  seed: 20260907,
  maxOpenQuests: 8,
  maxParties: 8,
  arrivalInterval: 10,
  travelTicks: 2,
  restTicks: 8,
  patienceTicks: 12,
  contractDays: 3,
  ruinDays: 3,
};

export const TICKS_PER_DAY = 24;

/** Days of an asset's income the owner recovers when it is retaken (cargo, ore, tolls). */
const WINDFALL_DAYS = 4;
/** Days of income lost to looters when nobody answers the call. */
const LOOTING_DAYS = 2;

export class Game {
  readonly config: GameConfig;
  readonly rng: Rng;
  readonly town: Town;
  tick = 0;
  quests: Quest[] = [];
  parties: Party[] = [];
  events: GameEvent[] = [];
  chronicle: GameEvent[] = [];
  stats: GameStats = {
    questsCompleted: 0,
    questsFailed: 0,
    questsExpired: 0,
    heroesDied: 0,
    resurrections: 0,
    partiesWiped: 0,
    partiesArrived: 0,
    goldPaid: 0,
    goldSpentByHeroes: 0,
    employersRuined: 0,
  };
  private nextArrival: number;
  private debtDays = new Map<string, number>();
  private listeners: ((e: GameEvent) => void)[] = [];

  constructor(config: Partial<GameConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.rng = new Rng(this.config.seed);
    this.town = generateTown(this.rng);
    this.nextArrival = 1;
    const temple = serviceOf(this.town, 'temple');
    this.log('town', `Welcome to ${this.town.name}. Adventurers gather at ${this.town.tavernName}; the ${temple.name} keeps its doors open for the fallen.`);
    for (const e of this.town.employers) {
      const holdings = e.assets.map((a) => `${a.name} (${a.incomePerDay} gp/day)`).join(', ');
      this.log('town', `${e.name} (${e.title}) holds ${holdings}. Treasury ${e.treasury} gp, upkeep ${e.upkeepPerDay} gp/day.`);
    }
  }

  onEvent(listener: (e: GameEvent) => void): void {
    this.listeners.push(listener);
  }

  get day(): number {
    return Math.floor(this.tick / TICKS_PER_DAY) + 1;
  }

  get openQuests(): Quest[] {
    return this.quests.filter((q) => q.status === 'open');
  }

  get activeParties(): Party[] {
    return this.parties.filter((p) => p.status !== 'disbanded');
  }

  questById(id: string | null): Quest | undefined {
    return id ? this.quests.find((q) => q.id === id) : undefined;
  }

  employerById(id: string): Employer | undefined {
    return this.town.employers.find((g) => g.id === id);
  }

  /** Advances the world by one hour. */
  step(): void {
    this.tick += 1;
    if (this.tick % TICKS_PER_DAY === 0) this.closeTheBooks();
    this.postQuests();
    this.arrivals();
    for (const party of this.activeParties) this.updateParty(party);
    this.expireQuests();
  }

  // ---------------------------------------------------------------- economy

  /** Once a day: every employer collects from its holdings and pays its upkeep. */
  private closeTheBooks(): void {
    let earned = 0;
    let paid = 0;
    for (const e of this.town.employers) {
      if (e.ruined) continue;
      const income = dailyIncome(e);
      e.treasury += income - e.upkeepPerDay;
      e.earned += income;
      e.spent += e.upkeepPerDay;
      earned += income;
      paid += e.upkeepPerDay;
      if (e.treasury < 0) {
        const days = (this.debtDays.get(e.id) ?? 0) + 1;
        this.debtDays.set(e.id, days);
        if (days >= this.config.ruinDays) this.ruin(e);
        else this.log('economy', `${e.name} cannot meet their upkeep (${e.treasury} gp). Creditors are circling.`);
      } else {
        this.debtDays.delete(e.id);
      }
    }
    const ravaged = this.town.employers.flatMap((e) => e.assets).filter((a) => a.status !== 'safe').length;
    this.log('economy', `Day ${this.day - 1} closes. Holdings brought in ${earned} gp; upkeep cost ${paid} gp. ${ravaged} holding${ravaged === 1 ? '' : 's'} in trouble.`);
  }

  private ruin(e: Employer): void {
    e.ruined = true;
    this.stats.employersRuined += 1;
    for (const q of this.quests) if (q.giverId === e.id && q.status === 'open') q.status = 'failed';
    this.chronicleLog('economy', `${e.name} are ruined. ${e.title === 'Faction' ? 'The organisation dissolves' : 'Their holdings are sold off'}; no more contracts from them.`);
  }

  /** Coin from adventurers into a town business. */
  private pay(from: Party, to: Employer, amount: number): void {
    from.gold -= amount;
    from.spent += amount;
    to.treasury += amount;
    to.earned += amount;
    this.stats.goldSpentByHeroes += amount;
  }

  // ---------------------------------------------------------------- quests

  private postQuests(): void {
    for (const employer of this.town.employers) {
      if (employer.ruined) continue;
      if (employer.cooldown > 0) {
        employer.cooldown -= 1;
        continue;
      }
      if (this.openQuests.length >= this.config.maxOpenQuests) continue;
      if (employer.treasury < 25) continue;
      const free = employer.assets.filter((a) => a.questId === null);
      if (free.length === 0) continue;
      // The overrun holding is always the priority; otherwise trouble strikes at random.
      const asset = free.find((a) => a.status !== 'safe') ?? this.rng.pick(free);
      const theme = rollThreat(this.rng, asset);
      const level = this.pickQuestLevel(employer);
      const quest = generateQuest(this.rng, { employer, asset, theme, level, partySize: PARTY_SIZE, tick: this.tick });
      this.quests.push(quest);
      asset.questId = quest.id;
      const wasSafe = asset.status === 'safe';
      if (wasSafe) asset.status = 'threatened';
      employer.questsPosted += 1;
      employer.cooldown = this.rng.int(12, 30);
      const lead = wasSafe
        ? `${THEMES[theme].label} threaten ${asset.name}.`
        : capitalize(`${asset.name} is still overrun; ${employer.name} raise the bounty.`);
      this.log('quest', `${lead} ${employer.name} post a level ${quest.level} contract: "${quest.title}" [${difficultyCode(quest)}] for ${quest.reward} gp.`);
    }
  }

  /**
   * Quest levels follow the adventurers who will actually be free to take them,
   * with a little stretch as an employer's reputation grows.
   */
  private pickQuestLevel(employer: Employer): number {
    const free = this.activeParties.filter((p) => p.status === 'idle' || p.status === 'resting');
    const levels = (free.length > 0 ? free : this.activeParties).map(partyLevel);
    const ceiling = Math.max(1, ...levels) + (employer.reputation >= 3 ? 1 : 0);
    if (levels.length > 0 && this.rng.chance(0.7)) return this.rng.pick(levels);
    return this.rng.int(1, ceiling);
  }

  private expireQuests(): void {
    const ttl = TICKS_PER_DAY * this.config.contractDays;
    for (const q of this.quests) {
      if (q.status !== 'open' || this.tick - q.postedAt <= ttl) continue;
      q.status = 'failed';
      this.stats.questsExpired += 1;
      const employer = this.employerById(q.giverId);
      const asset = assetById(this.town, q.assetId);
      if (!employer || !asset) continue;
      asset.questId = null;
      const loss = Math.min(employer.treasury, asset.incomePerDay * LOOTING_DAYS);
      employer.treasury -= loss;
      employer.spent += loss;
      employer.cooldown = Math.min(employer.cooldown, this.rng.int(4, 10));
      if (asset.status === 'threatened') {
        asset.status = 'ravaged';
        asset.timesRavaged += 1;
        this.chronicleLog('economy', `Nobody answered "${q.title}". ${THEMES[q.theme].label} overrun ${asset.name}; ${employer.name} lose ${loss} gp and the income of the ${ASSET_KINDS[asset.kind].label} with it.`);
      } else {
        this.log('economy', `Nobody answered "${q.title}". ${asset.name} stays in enemy hands and ${employer.name} lose another ${loss} gp.`);
      }
    }
    if (this.quests.length > 200) this.quests = this.quests.filter((q) => q.status === 'open' || q.status === 'taken');
  }

  private settleQuest(quest: Quest, p: Party, success: boolean): void {
    const employer = this.employerById(quest.giverId);
    const asset = assetById(this.town, quest.assetId);
    if (asset) asset.questId = null;
    if (!employer) return;
    if (success) {
      quest.status = 'done';
      let windfall = 0;
      if (asset) {
        windfall = asset.incomePerDay * WINDFALL_DAYS;
        asset.status = 'safe';
      }
      employer.treasury += windfall - quest.reward;
      employer.earned += windfall;
      employer.spent += quest.reward;
      employer.questsCompleted += 1;
      employer.reputation += 1;
      p.gold += quest.reward;
      p.earned += quest.reward;
      p.questsDone += 1;
      this.stats.questsCompleted += 1;
      this.stats.goldPaid += quest.reward;
      this.log(
        'reward',
        `${p.name} return to ${this.town.name}. ${employer.name} pay ${quest.reward} gp and ${asset ? `${asset.name} is back in business (+${windfall} gp recovered)` : 'are grateful'}. Purse: ${p.gold} gp.`,
      );
    } else {
      quest.status = 'failed';
      employer.questsFailed += 1;
      p.questsFailed += 1;
      this.stats.questsFailed += 1;
      employer.cooldown = Math.min(employer.cooldown, this.rng.int(2, 8));
      this.log('party', `${p.name} limp back to ${this.town.name} empty-handed.${asset ? ` ${capitalize(asset.name)} remains in enemy hands.` : ''}`);
    }
  }

  // ---------------------------------------------------------------- arrivals

  private arrivals(): void {
    if (this.tick < this.nextArrival) return;
    this.nextArrival = this.tick + this.rng.int(Math.ceil(this.config.arrivalInterval / 2), this.config.arrivalInterval * 2);
    if (this.activeParties.length >= this.config.maxParties) return;

    const stranded = this.activeParties.find((p) => p.status === 'idle' && !isFull(p) && p.idleTicks >= this.config.patienceTicks);
    if (stranded) {
      const missing = PARTY_SIZE - aliveMembers(stranded).length;
      const band = createParty(this.rng, partyLevel(stranded), this.rng.int(1, Math.max(1, missing)), this.tick);
      this.parties.push(band);
      this.stats.partiesArrived += 1;
      this.log('party', `${describeParty(band)} arrive at ${this.town.tavernName}: survivors of another company, looking for work.`);
      return;
    }

    let level = 1;
    if (this.openQuests.length > 0 && this.rng.chance(0.3)) level = this.rng.pick(this.openQuests).level;
    const party = createParty(this.rng, level, PARTY_SIZE, this.tick);
    this.parties.push(party);
    this.stats.partiesArrived += 1;
    this.log('party', `${describeParty(party)} arrive at ${this.town.tavernName}: ${party.members.map(describeHero).join(', ')}.`);
  }

  // ---------------------------------------------------------------- parties

  private updateParty(p: Party): void {
    switch (p.status) {
      case 'idle':
        this.idle(p);
        break;
      case 'traveling':
        if (--p.ticksLeft <= 0) {
          p.status = 'questing';
          p.progress = 0;
          const q = this.questById(p.questId)!;
          this.log('party', `${p.name} reach ${q.place}.`);
        }
        break;
      case 'questing':
        this.fight(p);
        break;
      case 'returning':
        if (--p.ticksLeft <= 0) this.arriveHome(p);
        break;
      case 'resting':
        if (--p.ticksLeft <= 0) {
          for (const h of aliveMembers(p)) healHero(h, h.maxHp);
          p.status = 'idle';
          p.idleTicks = 0;
        }
        break;
      case 'disbanded':
        break;
    }
  }

  private idle(p: Party): void {
    p.idleTicks += 1;
    if (!isFull(p)) {
      this.recruit(p);
      if (!isFull(p)) return;
    }
    if (this.shop(p)) return;
    const level = partyLevel(p);
    // Companies take work at their level or a little below; nobody signs up to punch above their weight.
    const candidates = this.openQuests.filter((q) => q.level <= level && q.level >= level - 2);
    if (candidates.length === 0) return;
    // Exact level first, then the employer's name, then the pay.
    const rep = (q: Quest) => this.employerById(q.giverId)?.reputation ?? 0;
    candidates.sort((a, b) => Math.abs(a.level - level) - Math.abs(b.level - level) || rep(b) - rep(a) || b.reward - a.reward);
    const quest = candidates[0]!;
    quest.status = 'taken';
    quest.partyId = p.id;
    p.questId = quest.id;
    p.status = 'traveling';
    p.ticksLeft = this.config.travelTicks;
    p.idleTicks = 0;
    const employer = this.employerById(quest.giverId);
    this.log('quest', `${p.name} accept "${quest.title}" from ${employer?.name ?? 'an unknown client'} and set out for ${quest.place}.`);
  }

  /**
   * Adventurers with coin to spare visit the shops: potions first, then the
   * smith. One purchase per hour keeps the log readable. Returns true if they
   * spent the hour shopping.
   */
  private shop(p: Party): boolean {
    const level = partyLevel(p);
    const reserve = resurrectionCost(level);
    const alive = aliveMembers(p);

    if (p.potions < alive.length) {
      const apothecary = serviceOf(this.town, 'apothecary');
      const cost = potionCost(level);
      const wanted = alive.length - p.potions;
      const affordable = Math.min(wanted, Math.floor((p.gold - reserve) / cost));
      if (affordable > 0 && !apothecary.ruined) {
        this.pay(p, apothecary, affordable * cost);
        p.potions += affordable;
        this.log('shop', `${p.name} buy ${affordable} healing potion${affordable > 1 ? 's' : ''} from ${apothecary.name} for ${affordable * cost} gp.`);
        return true;
      }
    }

    const smith = serviceOf(this.town, 'smith');
    if (!smith.ruined) {
      const candidate = [...alive].sort((a, b) => a.armorTier - b.armorTier)[0];
      if (candidate && candidate.armorTier < MAX_ARMOR_TIER) {
        const cost = armorUpgradeCost(candidate.armorTier, candidate.level);
        if (p.gold - cost >= reserve) {
          this.pay(p, smith, cost);
          candidate.armorTier += 1;
          candidate.goldSpent += cost;
          this.log('shop', `${candidate.name} pays ${smith.name} ${cost} gp for better armour (AC +${candidate.armorTier}).`);
          return true;
        }
      }
    }
    return false;
  }

  /** Fill empty seats: temple first if the coin is there, then merge with another incomplete band. */
  private recruit(p: Party): void {
    const temple = serviceOf(this.town, 'temple');
    for (const dead of deadMembers(p)) {
      const cost = resurrectionCost(dead.level);
      if (p.gold < cost) continue;
      this.pay(p, temple, cost);
      dead.goldSpent += cost;
      resurrectHero(dead);
      this.stats.resurrections += 1;
      this.chronicleLog('temple', `${p.name} pay ${cost} gp at the ${temple.name}. ${describeHero(dead)} draws breath again.`);
    }
    if (isFull(p)) return;

    const level = partyLevel(p);
    const donor = this.activeParties.find((o) => o !== p && o.status === 'idle' && !isFull(o) && partyLevel(o) === level);
    if (!donor) return;
    const donorName = donor.name;
    const donorMembers = aliveMembers(donor).map((h) => h.name);
    const leftover = mergeParties(p, donor);
    if (leftover.length === 0) {
      donor.status = 'disbanded';
      this.log('party', `${donorName} (${donorMembers.join(', ')}) join ${p.name}. The two companies march as one.`);
    } else {
      this.log('party', `${p.name} recruit from ${donorName}; ${leftover.map((h) => h.name).join(', ')} stay behind waiting for another band.`);
    }
    if (isFull(p)) {
      for (const h of buryDead(p)) this.log('death', `${p.name} lay ${h.name} to rest. They will not be coming back.`);
    }
  }

  private fight(p: Party): void {
    const quest = this.questById(p.questId)!;
    const spec = quest.encounters[p.progress]!;
    const n = p.progress + 1;
    const fighters = aliveMembers(p);
    const outcome = runCombat(fighters, spec, this.rng.seed());

    for (const r of outcome.heroes) {
      const hero = p.members.find((h) => h.id === r.heroId)!;
      hero.kills += r.kills;
      if (r.alive) {
        hero.hp = r.hp;
      } else {
        killHero(hero);
        this.stats.heroesDied += 1;
      }
    }
    const fallen = fighters.filter((h) => !h.alive);
    const survivors = aliveMembers(p);
    const summary = `Encounter ${n}/3 (${spec.difficulty}): ${describeEncounter(spec)}.`;
    const deathNotes = () => {
      for (const h of fallen) this.chronicleLog('death', `${describeHero(h)} of ${p.name} dies at ${quest.place} (${describeEncounter(spec)}).`);
    };

    if (outcome.winner === 'party') {
      const share = Math.floor(outcome.xpEarned / Math.max(1, survivors.length));
      const levelUps: string[] = [];
      for (const h of survivors) {
        const before = h.level;
        if (gainXp(h, share) > 0) levelUps.push(`${h.name} reaches level ${h.level} (was ${before})`);
      }
      const losses = fallen.length > 0 ? ` Fallen: ${fallen.map((h) => h.name).join(', ')}.` : '';
      this.log('combat', `${p.name}: ${summary} Victory in ${outcome.rounds} rounds, ${share} XP each.${losses}`, outcome.lines);
      deathNotes();
      for (const text of levelUps) this.chronicleLog('levelup', `${text}.`);

      p.progress += 1;
      if (p.progress < quest.encounters.length && this.shouldRetreat(p, fighters.length)) {
        this.log('party', `${p.name} are too battered to go on. They abandon ${quest.place} and turn back.`);
        this.headHome(p);
        return;
      }
      if (p.progress >= quest.encounters.length) {
        this.log('quest', `${p.name} have cleared ${quest.place} and head back to ${this.town.name}.`);
        this.headHome(p);
      } else {
        this.breather(p);
      }
      return;
    }

    if (outcome.winner === 'monsters') {
      if (survivors.length === 0) {
        this.log('combat', `${p.name}: ${summary} Defeat. Nobody comes back from ${quest.place}.`, outcome.lines);
        deathNotes();
        this.chronicleLog('death', `${p.name} are wiped out at ${quest.place}.`);
        p.status = 'disbanded';
        this.stats.partiesWiped += 1;
        this.settleQuest(quest, p, false);
      } else {
        this.log(
          'combat',
          `${p.name}: ${summary} Defeat. ${survivors.map((h) => h.name).join(', ')} flee with the bodies of ${fallen.map((h) => h.name).join(', ')}.`,
          outcome.lines,
        );
        deathNotes();
        this.headHome(p);
      }
      return;
    }

    if (outcome.winner === 'retreat') {
      this.log(
        'combat',
        `${p.name}: ${summary} The line breaks. ${survivors.map((h) => h.name).join(', ')} ${survivors.length === 1 ? 'runs' : 'run'} for it, leaving ${fallen.map((h) => h.name).join(', ')} behind.`,
        outcome.lines,
      );
      for (const h of fallen) this.chronicleLog('death', `${describeHero(h)} of ${p.name} is left for dead at ${quest.place} (${describeEncounter(spec)}).`);
      this.headHome(p);
      return;
    }

    this.log('combat', `${p.name}: ${summary} Neither side can finish it; the party withdraws.`, outcome.lines);
    this.headHome(p);
  }

  /** A short rest between fights, and a potion for anyone still badly hurt. */
  private breather(p: Party): void {
    let drunk = 0;
    for (const h of aliveMembers(p)) {
      healHero(h, Math.ceil(h.maxHp * 0.5));
      if (p.potions > 0 && h.hp < h.maxHp * 0.5) {
        p.potions -= 1;
        drunk += 1;
        healHero(h, potionHeal(h));
      }
    }
    if (drunk > 0) this.log('party', `${p.name} catch their breath. ${drunk} potion${drunk > 1 ? 's' : ''} drunk; ${p.potions} left.`);
  }

  private headHome(p: Party): void {
    p.status = 'returning';
    p.ticksLeft = this.config.travelTicks;
  }

  /** Adventurers who lost half the company, or are mostly out of hit points, go home. */
  private shouldRetreat(p: Party, startedWith: number): boolean {
    const alive = aliveMembers(p);
    if (alive.length <= startedWith / 2) return true;
    const hpFraction = alive.reduce((s, h) => s + h.hp / h.maxHp, 0) / alive.length;
    return hpFraction < 0.35;
  }

  private arriveHome(p: Party): void {
    const quest = this.questById(p.questId)!;
    const success = p.progress >= quest.encounters.length && aliveMembers(p).length > 0;
    p.questId = null;
    p.progress = 0;
    this.settleQuest(quest, p, success);

    const dead = deadMembers(p);
    if (dead.length > 0) {
      const temple = serviceOf(this.town, 'temple');
      const bill = dead.map((h) => `${h.name}: ${resurrectionCost(h.level)} gp`).join(', ');
      this.log('temple', `${p.name} carry their dead to the ${temple.name}. The priests ask ${bill}. Purse: ${p.gold} gp.`);
    }

    const tavern = serviceOf(this.town, 'tavern');
    const fee = 3 * partyLevel(p) * aliveMembers(p).length;
    if (!tavern.ruined && p.gold >= fee) {
      this.pay(p, tavern, fee);
      this.log('shop', `${p.name} take rooms at ${tavern.name} for ${fee} gp.`);
    } else {
      this.log('party', `${p.name} cannot afford rooms and bed down in the stables.`);
    }
    p.status = 'resting';
    p.ticksLeft = this.config.restTicks;
  }

  // ---------------------------------------------------------------- logging

  private log(kind: EventKind, text: string, detail?: string[]): GameEvent {
    const e: GameEvent = { tick: this.tick, kind, text, detail };
    this.events.push(e);
    if (this.events.length > 600) this.events.splice(0, this.events.length - 600);
    for (const l of this.listeners) l(e);
    return e;
  }

  private chronicleLog(kind: EventKind, text: string): void {
    const e = this.log(kind, text);
    this.chronicle.push(e);
    if (this.chronicle.length > 300) this.chronicle.splice(0, this.chronicle.length - 300);
  }
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatTime(tick: number): string {
  const day = Math.floor(tick / TICKS_PER_DAY) + 1;
  const hour = tick % TICKS_PER_DAY;
  return `Day ${day}, ${String(hour).padStart(2, '0')}:00`;
}

export function heroStatusLine(h: Hero): string {
  return h.alive ? `${h.hp}/${h.maxHp} hp` : 'dead';
}

export function assetStatusLabel(a: Asset): string {
  return a.status === 'safe' ? 'safe' : a.status === 'threatened' ? 'under threat' : 'overrun';
}
