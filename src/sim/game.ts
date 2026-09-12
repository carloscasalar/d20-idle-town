import { listNames } from '../core/names';
import { BLESSING_HP_PER_LEVEL, payForService, visitTownServices } from '../town/services';
import {
  describeHero,
  gainXp,
  healHero,
  killHero,
  potionHeal,
  resurrectHero,
  resurrectionCost,
  rollSkill,
  type Hero,
} from '../adventurers/hero';
import {
  aliveMembers,
  buryDead,
  createParty,
  deadMembers,
  describeParty,
  hasRoom,
  isFull,
  mergeParties,
  partyLevel,
  PARTY_SIZE,
  type Party,
} from '../adventurers/party';
import { runCombat } from '../combat/battlecast';
import { describeEffect, rollStockItem } from '../items/items';
import { Rng } from '../core/rng';
import { describeEncounter, scaleEncounter } from '../quests/encounters';
import { difficultyCode, generateAssault, generateQuest, isFullyKnown, revealAll, revealNext, type Quest } from '../quests/quest';
import { THEMES, type ThemeId } from '../quests/themes';
import { ASSET_KINDS, rollThreat, type Asset } from '../town/assets';
import { createLair, describeLair, LAIR_THEMES, MAX_STRENGTH, raidInterval, type Lair } from '../town/lairs';
import {
  assetById,
  dailyIncome,
  generateTown,
  ITEM_SHOPS,
  MAX_STOCK,
  RETIREMENT_LEVEL,
  RETIREMENT_PRICE,
  retiredEmployer,
  serviceOf,
  type Employer,
  type Town,
} from '../town/town';

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
  itemsFound: number;
  itemsSold: number;
  retirements: number;
  raids: number;
  lairsCleared: number;
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
  /**
   * Multiplier on every encounter's XP budget. 1 = the bands in encounters.ts, which
   * are safe once potions, armour and retreats are in play; 1.15 (scripts/tune.ts) brings
   * back most of a death per contract and a wiped company every few days.
   */
  difficultyScale: number;
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
  difficultyScale: 1.15,
};

export const TICKS_PER_DAY = 24;

/** Days of an asset's income the owner recovers when it is retaken (cargo, ore, tolls). */
const WINDFALL_DAYS = 4;
/** Days of income lost to looters when nobody answers the call. */
const LOOTING_DAYS = 2;
/** Share of the purse a company drinks through after a job well done. */
const CAROUSING_SHARE = 0.05;
const MAX_RENOWN = 10;
/** Asking around about a job costs this much per company level, and a company asks at most this many times. */
const INVESTIGATION_COST_PER_LEVEL = 15;
const MAX_INVESTIGATIONS = 2;
/** A divination at the temple lays the whole job bare, for a price per company level. */
const DIVINATION_COST_PER_LEVEL = 60;
const SKILL_DC = 15;
/** Lairs: how many the town starts with, their level range, and how long a cleared one stays quiet. */
const STARTING_LAIRS: [number, number] = [2, 3];
const LAIR_LEVELS: [number, number] = [5, 8];
const LAIR_RESPAWN_DAYS = 12;
/** Renown for breaking a lair, and the odds an eligible company goes for it on a given idle hour. */
const ASSAULT_RENOWN = 3;
const ASSAULT_APPETITE = 0.35;
/** Days a broken company waits for its own recruits before its survivors sign on with whoever has room. */
const DISBAND_AFTER_DAYS = 3;

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
    itemsFound: 0,
    itemsSold: 0,
    retirements: 0,
    raids: 0,
    lairsCleared: 0,
  };
  lairs: Lair[] = [];
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
    const themes = this.rng.shuffle(LAIR_THEMES).slice(0, this.rng.int(...STARTING_LAIRS));
    for (const theme of themes) this.spawnLair(theme, this.rng.int(...LAIR_LEVELS));
  }

  lairById(id: string | null): Lair | undefined {
    return id ? this.lairs.find((l) => l.id === id) : undefined;
  }

  get activeLairs(): Lair[] {
    return this.lairs.filter((l) => l.status === 'active');
  }

  private spawnLair(theme: ThemeId, level: number): Lair {
    const lair = createLair(this.rng, theme, level, this.tick);
    this.lairs.push(lair);
    this.chronicleLog('town', `Word spreads of ${describeLair(lair)}, holed up at ${lair.place}. Nothing good will come out of there.`);
    return lair;
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
    if (this.tick % TICKS_PER_DAY === 0) {
      this.closeTheBooks();
      this.respawnLairs();
    }
    this.restock();
    this.raids();
    this.postQuests();
    this.postAssaults();
    this.arrivals();
    // Famous companies get first pick of the board.
    for (const party of [...this.activeParties].sort((a, b) => b.renown - a.renown)) this.updateParty(party);
    this.expireQuests();
  }

  // ---------------------------------------------------------------- shops

  /** Magic items trickle onto the shelves of the few shops that deal in them. */
  private restock(): void {
    for (const e of this.town.employers) {
      if (e.ruined || !e.service || !ITEM_SHOPS[e.service]) continue;
      if (e.stock.length >= MAX_STOCK) continue;
      if (--e.restockIn > 0) continue;
      e.restockIn = ITEM_SHOPS[e.service]!;
      const item = rollStockItem(this.rng, e.service as 'enchanter' | 'temple' | 'smith');
      if (!item) continue;
      e.stock.push(item);
      this.log('shop', `${e.name} put a ${item.name} on the shelf (${describeEffect(item.effect)}) for ${item.price} gp.`);
    }
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
    payForService(from, to, amount, this.stats);
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
      this.threaten(employer, asset, rollThreat(this.rng, asset), null);
      employer.cooldown = this.rng.int(12, 30);
    }
  }

  /** Trouble at a holding becomes a contract. If a lair of that kind is active, the raid is theirs. */
  private threaten(employer: Employer, asset: Asset, theme: ThemeId, from: Lair | null): Quest {
    const lair = from ?? this.activeLairs.find((l) => l.theme === theme) ?? null;
    const level = this.pickQuestLevel(employer);
    const quest = generateQuest(this.rng, {
      employer,
      asset,
      theme,
      level,
      partySize: PARTY_SIZE,
      tick: this.tick,
      difficultyScale: this.config.difficultyScale,
      lair,
    });
    this.quests.push(quest);
    asset.questId = quest.id;
    const wasSafe = asset.status === 'safe';
    if (wasSafe) asset.status = 'threatened';
    employer.questsPosted += 1;
    if (lair) {
      lair.raids += 1;
      this.stats.raids += 1;
    }
    const who = lair ? `${THEMES[theme].label} out of ${lair.name}` : THEMES[theme].label;
    const lead = wasSafe
      ? `${who} ${lair ? 'raid' : 'threaten'} ${asset.name}.`
      : capitalize(`${asset.name} is still overrun; ${employer.name} raise the bounty.`);
    const extras = [quest.itemReward ? `and a ${quest.itemReward.name}` : '', quest.guildOnly ? '(guild)' : ''].filter(Boolean).join(' ');
    this.log('quest', `${lead} ${employer.name} post a level ${quest.level} contract: "${quest.title}" [${difficultyCode(quest)}] for ${quest.reward} gp ${extras}`.trim() + '.');
    return quest;
  }

  // ---------------------------------------------------------------- lairs

  /** Each lair sends raids of its own at a pace set by its strength, at holdings its kind of trouble goes for. */
  private raids(): void {
    for (const lair of this.activeLairs) {
      if (--lair.raidCooldown > 0) continue;
      lair.raidCooldown = raidInterval(lair);
      if (this.openQuests.length >= this.config.maxOpenQuests) continue;
      const targets: { employer: Employer; asset: Asset }[] = [];
      for (const employer of this.town.employers) {
        if (employer.ruined || employer.treasury < 25) continue;
        for (const asset of employer.assets) {
          if (asset.questId === null && ASSET_KINDS[asset.kind].threats.some((t) => t.item === lair.theme)) targets.push({ employer, asset });
        }
      }
      if (targets.length === 0) continue;
      const { employer, asset } = this.rng.pick(targets);
      this.threaten(employer, asset, lair.theme, lair);
    }
  }

  /** The guild keeps a standing contract on every lair once someone in town could plausibly take it. */
  private postAssaults(): void {
    const guild = serviceOf(this.town, 'guild');
    if (guild.ruined) return;
    for (const lair of this.activeLairs) {
      if (lair.questId) continue;
      const strongest = Math.max(0, ...this.activeParties.map(partyLevel));
      if (strongest < lair.level - 1) continue;
      const quest = generateAssault(this.rng, lair, guild, PARTY_SIZE, this.tick, this.config.difficultyScale);
      this.quests.push(quest);
      lair.questId = quest.id;
      guild.questsPosted += 1;
      this.chronicleLog('quest', `The Adventurers’ Guild posts a bounty on ${lair.name}: "${quest.title}", level ${quest.level}, ${quest.encounters.length} fights ending with ${lair.boss}. ${quest.reward} gp, the ${quest.itemReward?.name ?? 'spoils'}, and whatever the hoard holds (${lair.hoard.gold} gp).`);
    }
  }

  /** Raids that go unanswered make the lair bolder and richer. */
  private raidSucceeded(lair: Lair, gold: number): void {
    lair.raidsWon += 1;
    lair.strength = Math.min(MAX_STRENGTH, lair.strength + 1);
    lair.hoard.gold += gold;
  }

  private clearLair(lair: Lair, p: Party, quest: Quest): void {
    lair.status = 'cleared';
    lair.clearedAt = this.tick;
    this.stats.lairsCleared += 1;
    const gold = lair.hoard.gold;
    p.gold += gold;
    p.earned += gold;
    p.stash.push(...lair.hoard.items);
    this.stats.itemsFound += lair.hoard.items.length;
    const found = [gold > 0 ? `${gold} gp` : '', ...lair.hoard.items.map((i) => i.name)].filter(Boolean).join(', ');
    lair.hoard = { gold: 0, items: [] };
    p.renown = Math.min(MAX_RENOWN, p.renown + ASSAULT_RENOWN);
    // Everything that kind of trouble had going stops.
    for (const q of this.quests) {
      if (q.lairId === lair.id && q.kind === 'contract' && q.status === 'open') {
        q.status = 'failed';
        const asset = q.assetId ? assetById(this.town, q.assetId) : undefined;
        if (asset) {
          asset.questId = null;
          asset.status = 'safe';
        }
      }
    }
    this.chronicleLog('reward', `${p.name} break ${lair.name}. ${lair.boss} is dead at ${quest.place}; the hoard yields ${found || 'nothing but bones'}. Renown ${p.renown}. The ${THEMES[lair.theme].label.toLowerCase()} scatter and every holding they held is free.`);
  }

  /** A while after a lair falls, something worse moves in. */
  private respawnLairs(): void {
    for (const lair of this.lairs) {
      if (lair.status !== 'cleared' || lair.clearedAt === null) continue;
      if (this.tick - lair.clearedAt < LAIR_RESPAWN_DAYS * TICKS_PER_DAY) continue;
      lair.clearedAt = null;
      const theme = this.rng.chance(0.5) ? lair.theme : this.rng.pick(LAIR_THEMES);
      this.spawnLair(theme, Math.min(20, lair.level + this.rng.int(1, 2)));
    }
  }

  /**
   * Contracts are posted at the levels of the companies actually in town, never
   * below the greenest of them. Free companies weigh more than busy ones, and a
   * reputable employer occasionally posts one level above the best company,
   * which is work for them once they level up.
   */
  private pickQuestLevel(employer: Employer): number {
    const parties = this.activeParties;
    if (parties.length === 0) return 1;
    const weights = parties.map((p) => ({ item: partyLevel(p), weight: p.status === 'idle' || p.status === 'resting' ? 3 : 1 }));
    const top = Math.max(...weights.map((w) => w.item));
    if (employer.reputation >= 3 && this.rng.chance(0.1)) return top + 1;
    return this.rng.weighted(weights);
  }

  private expireQuests(): void {
    const ttl = TICKS_PER_DAY * this.config.contractDays;
    for (const q of this.quests) {
      if (q.status !== 'open' || q.kind === 'assault' || this.tick - q.postedAt <= ttl) continue;
      q.status = 'failed';
      this.stats.questsExpired += 1;
      const employer = this.employerById(q.giverId);
      const asset = q.assetId ? assetById(this.town, q.assetId) : undefined;
      if (!employer || !asset) continue;
      asset.questId = null;
      const loss = Math.min(employer.treasury, asset.incomePerDay * LOOTING_DAYS);
      employer.treasury -= loss;
      employer.spent += loss;
      const lair = this.lairById(q.lairId);
      if (lair) this.raidSucceeded(lair, loss);
      employer.cooldown = Math.min(employer.cooldown, this.rng.int(4, 10));
      if (asset.status === 'threatened') {
        asset.status = 'ravaged';
        asset.timesRavaged += 1;
        this.chronicleLog('economy', `Nobody answered "${q.title}". ${THEMES[q.theme].label} overrun ${asset.name}; ${employer.name} lose ${loss} gp and the income of the ${ASSET_KINDS[asset.kind].label} with it.`);
      } else {
        this.log('economy', `Nobody answered "${q.title}". ${capitalize(asset.name)} stays in enemy hands and ${employer.name} lose another ${loss} gp.`);
      }
    }
    if (this.quests.length > 200) this.quests = this.quests.filter((q) => q.status === 'open' || q.status === 'taken');
  }

  private settleQuest(quest: Quest, p: Party, success: boolean): void {
    const employer = this.employerById(quest.giverId);
    const asset = quest.assetId ? assetById(this.town, quest.assetId) : undefined;
    if (asset) asset.questId = null;
    if (!employer) return;
    if (quest.kind === 'assault') {
      this.settleAssault(quest, p, employer, success);
      return;
    }
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
      p.renown = Math.min(MAX_RENOWN, p.renown + 1);
      this.stats.questsCompleted += 1;
      this.stats.goldPaid += quest.reward;
      let inKind = '';
      if (quest.itemReward) {
        p.stash.push(quest.itemReward);
        this.stats.itemsFound += 1;
        inKind = ` and a ${quest.itemReward.name}`;
      }
      this.log(
        'reward',
        `${p.name} return to ${this.town.name}. ${employer.name} pay ${quest.reward} gp${inKind}; ${asset ? `${asset.name} is back in business (+${windfall} gp recovered)` : 'the client is grateful'}. Purse: ${p.gold} gp.`,
      );
      if (asset && (asset.loot.gold > 0 || asset.loot.items.length > 0)) {
        const found = [asset.loot.items.map((i) => i.name).join(', '), asset.loot.gold > 0 ? `${asset.loot.gold} gp` : ''].filter(Boolean).join(' and ');
        p.gold += asset.loot.gold;
        p.earned += asset.loot.gold;
        p.stash.push(...asset.loot.items);
        this.stats.itemsFound += asset.loot.items.length;
        asset.loot = { gold: 0, items: [] };
        this.chronicleLog('reward', `Among the bones at ${asset.name}, ${p.name} find ${found}: all that is left of the last company that came this way.`);
      }
    } else {
      quest.status = 'failed';
      employer.questsFailed += 1;
      p.questsFailed += 1;
      p.renown = Math.max(0, p.renown - 1);
      this.stats.questsFailed += 1;
      employer.cooldown = Math.min(employer.cooldown, this.rng.int(2, 8));
      const lair = this.lairById(quest.lairId);
      if (lair) this.raidSucceeded(lair, 0);
      this.log('party', `${p.name} limp back to ${this.town.name} empty-handed.${asset ? ` ${capitalize(asset.name)} remains in enemy hands.` : ''}`);
    }
  }

  private settleAssault(quest: Quest, p: Party, guild: Employer, success: boolean): void {
    const lair = this.lairById(quest.lairId);
    if (!lair) return;
    if (success) {
      quest.status = 'done';
      guild.treasury -= quest.reward;
      guild.spent += quest.reward;
      guild.questsCompleted += 1;
      guild.reputation += 1;
      p.gold += quest.reward;
      p.earned += quest.reward;
      p.questsDone += 1;
      this.stats.questsCompleted += 1;
      this.stats.goldPaid += quest.reward;
      if (quest.itemReward) {
        p.stash.push(quest.itemReward);
        this.stats.itemsFound += 1;
      }
      this.log('reward', `${p.name} return to ${this.town.name} to a hero’s welcome. The guild pays its bounty of ${quest.reward} gp${quest.itemReward ? ` and hands over the ${quest.itemReward.name}` : ''}.`);
      this.clearLair(lair, p, quest);
    } else {
      quest.status = 'failed';
      lair.questId = null;
      lair.strength = Math.min(MAX_STRENGTH, lair.strength + 1);
      guild.questsFailed += 1;
      p.questsFailed += 1;
      p.renown = Math.max(0, p.renown - 1);
      this.stats.questsFailed += 1;
      this.log('party', `${p.name} come back from ${lair.place} beaten. ${capitalize(lair.name)} stands, and grows bolder.`);
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
      const band = createParty(this.rng, partyLevel(stranded), this.rng.int(Math.max(1, missing), Math.max(1, missing) + 1), this.tick);
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
        this.readTheLand(p);
        if (--p.ticksLeft <= 0) {
          p.status = 'questing';
          p.progress = 0;
          const q = this.questById(p.questId)!;
          const surprise = !isFullyKnown(q);
          revealAll(q);
          this.log('party', `${p.name} reach ${q.place}${surprise ? ` and take stock: ${q.encounters.length} fights ahead [${difficultyCode(q)}]` : ''}.`);
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
    // A company takes work at its own level. After a slow day it will stretch one level either way,
    // never more: the small jobs are for the companies that need them.
    const stretch = p.idleTicks >= TICKS_PER_DAY ? 1 : 0;
    const assault = this.openQuests.find((q) => q.kind === 'assault' && q.level <= level);
    if (assault && p.gold >= resurrectionCost(level) && this.rng.chance(ASSAULT_APPETITE)) {
      this.acceptQuest(p, assault);
      return;
    }
    const candidates = this.openQuests.filter(
      (q) => q.kind === 'contract' && Math.abs(q.level - level) <= stretch && (!q.guildOnly || p.guildMember) && this.hasFirstRefusal(q, p),
    );
    if (candidates.length === 0) return;
    // An old friend's contract first, then exact level, then the employer's name, then the pay.
    const rep = (q: Quest) => this.employerById(q.giverId)?.reputation ?? 0;
    const favored = (q: Quest) => (this.employerById(q.giverId)?.favoredPartyId === p.id ? 1 : 0);
    candidates.sort(
      (a, b) => favored(b) - favored(a) || Math.abs(a.level - level) - Math.abs(b.level - level) || rep(b) - rep(a) || b.reward - a.reward,
    );
    const quest = candidates[0]!;
    if (this.investigate(p, quest)) return;
    this.acceptQuest(p, quest);
  }

  private acceptQuest(p: Party, quest: Quest): void {
    quest.status = 'taken';
    quest.partyId = p.id;
    p.questId = quest.id;
    p.status = 'traveling';
    p.ticksLeft = this.config.travelTicks;
    p.idleTicks = 0;
    const employer = this.employerById(quest.giverId);
    const lair = this.lairById(quest.lairId);
    if (quest.kind === 'assault' && lair) {
      this.chronicleLog('quest', `${p.name} take the guild’s bounty on ${lair.name} and march on ${lair.place}. ${lair.boss} waits at the end of it.`);
    } else {
      this.log('quest', `${p.name} accept "${quest.title}" from ${employer?.name ?? 'an unknown client'} and set out for ${quest.place}.`);
    }
  }

  /**
   * Before signing, a company with coin to spare buys a round at the tavern and
   * asks around: first how long the job is, then what else waits out there.
   * Returns true if the hour went on that.
   */
  private investigate(p: Party, quest: Quest): boolean {
    if (isFullyKnown(quest)) return false;
    const level = partyLevel(p);
    const reserve = resurrectionCost(level);
    const tavern = serviceOf(this.town, 'tavern');

    // Talk first: a good tongue gets the regulars talking for free. One try per job.
    if (!p.investigations[`${quest.id}:talk`]) {
      p.investigations[`${quest.id}:talk`] = 1;
      const check = rollSkill(this.rng, aliveMembers(p), 'Persuasion', SKILL_DC);
      if (check) {
        const dice = `${check.roll}${check.bonus >= 0 ? '+' : ''}${check.bonus} = ${check.total}${check.advantage ? ', with advantage' : ''}`;
        if (check.success) {
          this.log('shop', `${check.hero.name} works the room at ${tavern.name} (Persuasion ${dice} vs DC ${SKILL_DC}): ${this.learn(quest)}.`);
        } else {
          this.log('shop', `${check.hero.name} tries to get the regulars at ${tavern.name} talking about "${quest.title}" (Persuasion ${dice} vs DC ${SKILL_DC}) and gets nowhere.`);
        }
        return true;
      }
    }

    // The rich ask the priests, who see the whole thing.
    const temple = serviceOf(this.town, 'temple');
    const divination = DIVINATION_COST_PER_LEVEL * level;
    if (!temple.ruined && p.gold - divination >= reserve * 2) {
      this.pay(p, temple, divination);
      revealAll(quest);
      this.log('temple', `${p.name} pay ${divination} gp for a divination at the ${temple.name}. The priests see "${quest.title}" whole: ${quest.encounters.length} fights [${difficultyCode(quest)}].`);
      return true;
    }

    // Otherwise a round buys one thing at a time.
    const done = p.investigations[quest.id] ?? 0;
    if (done >= MAX_INVESTIGATIONS) return false;
    const cost = INVESTIGATION_COST_PER_LEVEL * level;
    if (tavern.ruined || p.gold - cost < reserve) return false;
    this.pay(p, tavern, cost);
    p.investigations[quest.id] = done + 1;
    this.log('shop', `${p.name} buy a round at ${tavern.name} (${cost} gp) and ask about "${quest.title}": ${this.learn(quest)}.`);
    return true;
  }

  /** Reveal the next thing about a job and say what it was. */
  private learn(quest: Quest): string {
    const learned = revealNext(quest);
    if (learned === 'count') return `it means ${quest.encounters.length} fights`;
    const next = quest.encounters[quest.revealed - 1]!;
    return `the next fight will be ${describeEncounter(next)} (${next.difficulty})`;
  }

  /** On the road, whoever reads tracks best gets one look at what lies ahead. One try per job. */
  private readTheLand(p: Party): void {
    const quest = this.questById(p.questId);
    if (!quest || isFullyKnown(quest) || p.investigations[`${quest.id}:tracks`]) return;
    p.investigations[`${quest.id}:tracks`] = 1;
    const check = rollSkill(this.rng, aliveMembers(p), 'Survival', SKILL_DC);
    if (!check) return;
    const dice = `${check.roll}${check.bonus >= 0 ? '+' : ''}${check.bonus} = ${check.total}${check.advantage ? ', with advantage' : ''}`;
    if (check.success) this.log('party', `On the road, ${check.hero.name} reads the tracks (Survival ${dice} vs DC ${SKILL_DC}): ${this.learn(quest)}.`);
    else this.log('party', `${check.hero.name} tries to read the tracks along the road (Survival ${dice} vs DC ${SKILL_DC}) and learns nothing.`);
  }

  /** A retired adventurer's contracts are held a day for their old company. */
  private hasFirstRefusal(q: Quest, p: Party): boolean {
    const employer = this.employerById(q.giverId);
    if (!employer?.favoredPartyId || employer.favoredPartyId === p.id) return true;
    const friends = this.parties.find((o) => o.id === employer.favoredPartyId);
    if (!friends || friends.status === 'disbanded') return true;
    return this.tick - q.postedAt >= TICKS_PER_DAY;
  }

  /** Spend this idle hour on the town's services, keeping retirement in Game. */
  private shop(p: Party): boolean {
    return visitTownServices(p, {
      town: this.town,
      day: this.day,
      ledger: this.stats,
      report: ({ kind, text, chronicle }) => {
        if (chronicle) this.chronicleLog(kind, text);
        else this.log(kind, text);
      },
      tryRetire: () => this.retire(p),
    });
  }

  /** The richest, most seasoned adventurer in town may hang up the sword and buy a business. */
  private retire(p: Party): boolean {
    const veteran = aliveMembers(p).find((h) => h.level >= RETIREMENT_LEVEL);
    if (!veteran || p.gold < RETIREMENT_PRICE + resurrectionCost(partyLevel(p))) return false;
    p.gold -= RETIREMENT_PRICE;
    p.spent += RETIREMENT_PRICE;
    this.stats.goldSpentByHeroes += RETIREMENT_PRICE;
    p.members = p.members.filter((h) => h !== veteran);
    for (const item of veteran.items) p.stash.push(item);
    veteran.items = [];
    const employer = retiredEmployer(this.rng, veteran.name, p.id, Math.floor(RETIREMENT_PRICE * 0.2));
    this.town.employers.push(employer);
    this.stats.retirements += 1;
    this.chronicleLog(
      'town',
      `${describeHero(veteran)} retires from ${p.name}, buys ${employer.assets[0]!.name} for ${RETIREMENT_PRICE} gp and settles in ${this.town.name}. Old friends will hear of any trouble first.`,
    );
    return true;
  }

  /** Fill empty seats: temple first if the coin is there, then merge with another incomplete band. */
  private recruit(p: Party): void {
    const temple = serviceOf(this.town, 'temple');
    const raised: Hero[] = [];
    let bill = 0;
    for (const dead of deadMembers(p)) {
      const cost = resurrectionCost(dead.level);
      if (p.gold < cost) continue;
      this.pay(p, temple, cost);
      dead.goldSpent += cost;
      resurrectHero(dead);
      this.stats.resurrections += 1;
      raised.push(dead);
      bill += cost;
    }
    if (raised.length > 0) {
      this.chronicleLog('temple', `${p.name} pay ${bill} gp at the ${temple.name}. ${listNames(raised.map(describeHero))} ${raised.length === 1 ? 'draws' : 'draw'} breath again.`);
    }
    if (isFull(p)) return;

    const level = partyLevel(p);
    const donor = this.activeParties.find((o) => o !== p && o.status === 'idle' && !isFull(o) && partyLevel(o) === level);
    if (donor) {
      this.absorb(p, donor);
      return;
    }
    // Nobody in the same boat. After a few days the survivors sign on with whoever has room.
    if (p.idleTicks < DISBAND_AFTER_DAYS * TICKS_PER_DAY) return;
    const host = this.activeParties
      .filter((o) => o !== p && (o.status === 'idle' || o.status === 'resting') && isFull(o) && hasRoom(o) && Math.abs(partyLevel(o) - level) <= 1)
      .sort((a, b) => Math.abs(partyLevel(a) - level) - Math.abs(partyLevel(b) - level) || aliveMembers(a).length - aliveMembers(b).length)[0];
    if (!host) return;
    this.absorb(host, p, true);
  }

  /** Donor survivors join the host while there is room; a host with six turns the rest away. */
  private absorb(host: Party, donor: Party, gaveUp = false): void {
    const donorName = donor.name;
    const donorMembers = aliveMembers(donor).map((h) => h.name);
    const leftover = mergeParties(host, donor);
    const size = aliveMembers(host).length;
    if (leftover.length === 0) {
      for (const h of buryDead(donor)) this.log('death', `${donorName} leave ${h.name} in the temple's care for good.`);
      donor.status = 'disbanded';
      this.log(
        'party',
        gaveUp
          ? `${donorName} give up waiting. ${listNames(donorMembers)} sign on with ${host.name}, now ${size} strong.`
          : `${donorName} (${listNames(donorMembers)}) join ${host.name}. The company marches ${size} strong.`,
      );
    } else {
      this.log('party', `${host.name} take on ${listNames(donorMembers.filter((n) => !leftover.some((h) => h.name === n)))} from ${donorName}; ${listNames(leftover.map((h) => h.name))} stay behind waiting for another band.`);
    }
    if (isFull(host)) {
      for (const h of buryDead(host)) this.log('death', `${host.name} lay ${h.name} to rest. They will not be coming back.`);
    }
  }

  private fight(p: Party): void {
    const quest = this.questById(p.questId)!;
    const fighters = aliveMembers(p);
    const spec = scaleEncounter(quest.encounters[p.progress]!, fighters.length);
    const n = p.progress + 1;
    const bossFight = quest.kind === 'assault' && p.progress === quest.encounters.length - 1;
    const outcome = runCombat(fighters, spec, this.rng.seed(), {
      ...(p.blessed ? { blessingHp: BLESSING_HP_PER_LEVEL * partyLevel(p) } : {}),
      noRetreat: bossFight,
      ...(quest.kind === 'assault' ? { lairDepth: { index: p.progress, total: quest.encounters.length } } : {}),
    });

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
    const ambushNote = outcome.ambush === 'monsters' ? ' Ambushed!' : outcome.ambush === 'party' ? ' They strike first.' : '';
    const summary = `Encounter ${n}/${quest.encounters.length} (${spec.difficulty}): ${describeEncounter(spec)}.${ambushNote}`;
    const deathNotes = (verb = 'dies') => {
      if (fallen.length === 0) return;
      const plural = verb === 'dies' ? 'die' : 'are left for dead';
      const who = fallen.length === 1 ? `${describeHero(fallen[0]!)} of ${p.name} ${verb}` : `${listNames(fallen.map(describeHero))} of ${p.name} ${plural}`;
      this.chronicleLog('death', `${who} at ${quest.place} (${describeEncounter(spec)}).`);
    };

    if (outcome.winner === 'party') {
      const share = Math.floor(outcome.xpEarned / Math.max(1, survivors.length));
      const levelled: Hero[] = [];
      for (const h of survivors) if (gainXp(h, share) > 0) levelled.push(h);
      const losses = fallen.length > 0 ? ` Fallen: ${fallen.map((h) => h.name).join(', ')}.` : '';
      this.log('combat', `${p.name}: ${summary} Victory in ${outcome.rounds} rounds, ${share} XP each.${losses}`, outcome.lines);
      deathNotes();
      if (levelled.length > 0) {
        const levels = new Set(levelled.map((h) => h.level));
        if (levelled.length === survivors.length && levels.size === 1) this.chronicleLog('levelup', `${p.name} reach level ${levelled[0]!.level}.`);
        else this.chronicleLog('levelup', `${listNames(levelled.map((h) => `${h.name} (${h.level})`))} of ${p.name} level up.`);
      }

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
        this.leaveLoot(quest, p, p.members);
        this.settleQuest(quest, p, false);
      } else {
        this.log(
          'combat',
          `${p.name}: ${summary} Defeat. ${listNames(survivors.map((h) => h.name))} flee with the bodies of ${listNames(fallen.map((h) => h.name))}.`,
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
        `${p.name}: ${summary} The line breaks. ${listNames(survivors.map((h) => h.name))} ${survivors.length === 1 ? 'runs' : 'run'} for it, leaving ${listNames(fallen.map((h) => h.name))} behind.`,
        outcome.lines,
      );
      deathNotes('is left for dead');
      this.leaveLoot(quest, p, fallen);
      this.headHome(p);
      return;
    }

    this.log('combat', `${p.name}: ${summary} Neither side can finish it; the party withdraws.`, outcome.lines);
    this.headHome(p);
  }

  /**
   * Whatever the fallen carried is lost to the field. If a lair is behind the
   * job, its hoard swells with it; otherwise the next company to clear the
   * holding finds it among the bones.
   */
  private leaveLoot(quest: Quest, p: Party, fallen: Hero[]): void {
    const lair = this.lairById(quest.lairId);
    const asset = quest.assetId ? assetById(this.town, quest.assetId) : undefined;
    const store = lair ? lair.hoard : asset?.loot;
    if (!store) return;
    const items = fallen.flatMap((h) => h.items);
    for (const h of fallen) h.items = [];
    const wiped = p.status === 'disbanded';
    let gold = 0;
    if (wiped) {
      items.push(...p.stash);
      p.stash = [];
      gold = p.gold;
      store.gold += gold;
      p.gold = 0;
    }
    store.items.push(...items);
    if (items.length === 0 && gold === 0) return;
    const what = [items.length > 0 ? items.map((i) => i.name).join(', ') : '', gold > 0 ? `${gold} gp` : ''].filter(Boolean).join(' and ');
    if (lair) this.log('death', `${what} go${items.length + (gold > 0 ? 1 : 0) === 1 ? 'es' : ''} to the hoard of ${lair.name} (now ${lair.hoard.gold} gp and ${lair.hoard.items.length} item${lair.hoard.items.length === 1 ? '' : 's'}).`);
    else this.log('death', `${what} lie${items.length + (gold > 0 ? 1 : 0) === 1 ? 's' : ''} among the dead at ${quest.place}.`);
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

    p.blessed = false;
    const tavern = serviceOf(this.town, 'tavern');
    const fee = 3 * partyLevel(p) * aliveMembers(p).length;
    if (!tavern.ruined && p.gold >= fee) {
      this.pay(p, tavern, fee);
      let line = `${p.name} take rooms at ${tavern.name} for ${fee} gp.`;
      if (success && dead.length === 0 && p.renown < MAX_RENOWN) {
        const spree = Math.max(10, Math.floor(p.gold * CAROUSING_SHARE));
        if (p.gold - spree >= resurrectionCost(partyLevel(p))) {
          this.pay(p, tavern, spree);
          p.renown = Math.min(MAX_RENOWN, p.renown + 1);
          line += ` They drink ${spree} gp away telling the tale (renown ${p.renown}).`;
        }
      }
      this.log('shop', line);
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
