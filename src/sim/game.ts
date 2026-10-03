import { listNames } from '../core/names';
import { coinReasons, emptyGoldStatistics, hoard, loot, purse, sink, source, transfer, treasury } from '../town/coin';
import { visitTownServices } from '../town/services';
import {
  describeHero,
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
import { describeEffect, rollStockItem, type MagicItem } from '../items/items';
import type { DeepReadonly } from '../core/readonly';
import { hashString, Rng } from '../core/rng';
import { MAX_LEVEL, xpToNextLevel } from '../core/xp';
import { describeEncounter, type Difficulty } from '../quests/encounters';
import { difficultyCode, isFullyKnown, type Quest, type ReadonlyQuest } from '../quests/quest';
import { THEMES, type ThemeId } from '../quests/themes';
import { ASSET_KINDS, rollThreat, type Asset } from '../town/assets';
import { createLair, describeLair, LAIR_THEMES, raidInterval, type Lair } from '../town/lairs';
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
import { Board, DEFAULT_BOARD_CONFIG, type BoardConfig, type BoardContext } from './board';
import { advanceExpedition, startExpedition } from './expedition';

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

export interface GameConfig extends Omit<BoardConfig, 'contractOpenTicks'> {
  seed: number;
  maxOpenQuests: number;
  maxParties: number;
  /** Mean ticks between party arrivals. */
  arrivalInterval: number;
  travelTicks: number;
  restTicks: number;
  /** Fraction of maximum HP healed during a short rest between encounters. */
  shortRestHealFraction: number;
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

/**
 * Mutable setup available only while creating a controlled scenario in a test.
 * A scenario expires as soon as its setup callback returns.
 */
export interface GameScenario {
  tick: number;
  readonly town: Town;
  parties: Party[];
  quests: Quest[];
  lairs: Lair[];
  readonly stats: GameStats;
  events: GameEvent[];
  chronicle: GameEvent[];
}

/** A read-only encounter composition for calibration scripts. */
export interface GameEncounterSample {
  readonly monsters: readonly Readonly<{ name: string; count: number }>[];
}

/** Immutable information a renderer can read without reaching into the simulation. */
export interface GameView {
  readonly time: string;
  readonly difficultyScale: number;
  readonly town: GameTownView;
  readonly parties: readonly GamePartyView[];
  readonly board: Readonly<{
    open: readonly GameQuestView[];
    taken: readonly GameQuestView[];
  }>;
  readonly lairs: readonly GameLairView[];
  readonly stats: Readonly<GameStats>;
  readonly events: readonly GameEventView[];
  readonly chronicle: readonly GameEventView[];
}

export interface GameEventView {
  readonly tick: number;
  readonly kind: EventKind;
  readonly text: string;
  readonly detail?: readonly string[];
}

export interface GameItemView {
  readonly name: string;
  readonly effect: string;
  readonly price: number;
}

export interface GameAssetView {
  readonly name: string;
  readonly kindLabel: string;
  readonly incomePerDay: number;
  readonly status: Asset['status'];
  readonly statusLabel: string;
  readonly hasLoot: boolean;
}

export interface GameEmployerView {
  readonly name: string;
  readonly title: string;
  readonly service: Employer['service'];
  readonly treasury: number;
  readonly dailyNet: number;
  readonly ruined: boolean;
  readonly reputation: number;
  readonly generosity: number;
  readonly questsPosted: number;
  readonly questsCompleted: number;
  readonly questsFailed: number;
  readonly earned: number;
  readonly spent: number;
  readonly assets: readonly GameAssetView[];
  readonly stock: readonly GameItemView[];
}

export interface GameTownView {
  readonly name: string;
  readonly employers: readonly GameEmployerView[];
}

export interface GameLairView {
  readonly name: string;
  readonly status: Lair['status'];
  readonly level: number;
  readonly themeLabel: string;
  readonly boss: string;
  readonly place: string;
  readonly strength: number;
  readonly raids: number;
  readonly raidsWon: number;
  readonly nextRaidIn: number;
  readonly raidInterval: number;
  readonly hoardGold: number;
  readonly hoardItems: readonly string[];
  readonly bountyPosted: boolean;
}

export interface GamePartyView {
  readonly id: string;
  readonly name: string;
  readonly level: number;
  readonly gold: number;
  readonly statusText: string;
  readonly questsDone: number;
  readonly questsFailed: number;
  readonly members: readonly GameHeroView[];
  readonly templeBill: number;
  readonly potions: number;
  readonly blessed: boolean;
  readonly guildMember: boolean;
  readonly renown: number;
  readonly earned: number;
  readonly spent: number;
  readonly stash: readonly string[];
}

export interface GameHeroView {
  readonly name: string;
  readonly heroClass: string;
  readonly level: number;
  readonly alive: boolean;
  readonly hp: number;
  readonly maxHp: number;
  readonly hpPercent: number;
  readonly kills: number;
  readonly xpText: string;
  readonly armorTier: number;
  readonly items: readonly GameItemView[];
}

export interface GameEncounterView {
  readonly number: number;
  readonly difficulty: Difficulty | null;
  readonly description: string | null;
}

export interface GameQuestView {
  readonly id: string;
  readonly kind: Quest['kind'];
  readonly title: string;
  readonly level: number;
  readonly difficultyCode: string;
  readonly giverName: string;
  readonly themeLabel: string;
  readonly guildOnly: boolean;
  readonly reward: number;
  readonly itemReward: GameItemView | null;
  readonly encounterCountKnown: boolean;
  readonly partyName: string | null;
  readonly lair: Readonly<{
    name: string;
    strength: number;
    hoardGold: number;
  }> | null;
  readonly encounters: readonly GameEncounterView[];
}

const { contractOpenTicks: _contractOpenTicks, ...boardDefaults } = DEFAULT_BOARD_CONFIG;

export const DEFAULT_CONFIG: GameConfig = {
  ...boardDefaults,
  seed: 20260907,
  maxOpenQuests: 8,
  maxParties: 8,
  arrivalInterval: 10,
  travelTicks: 2,
  restTicks: 8,
  shortRestHealFraction: 0.5,
  patienceTicks: 12,
  contractDays: 3,
  ruinDays: 3,
  difficultyScale: 1.15,
};

export const TICKS_PER_DAY = 24;

/** An employer posts work only when its treasury is at least this much. */
export const POSTING_THRESHOLD = 25;

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
/** The odds an eligible company goes for a lair on a given idle hour. */
const ASSAULT_APPETITE = 0.35;
/** Days a broken company waits for its own recruits before its survivors sign on with whoever has room. */
const DISBAND_AFTER_DAYS = 3;

export class Game {
  private readonly config: GameConfig;
  private readonly rng: Rng;
  private readonly town: Town;
  private tick = 0;
  private readonly board: Board;
  private parties: Party[] = [];
  private events: GameEvent[] = [];
  private chronicle: GameEvent[] = [];
  private stats: GameStats = {
    questsCompleted: 0,
    questsFailed: 0,
    questsExpired: 0,
    heroesDied: 0,
    resurrections: 0,
    partiesWiped: 0,
    partiesArrived: 0,
    ...emptyGoldStatistics(),
    employersRuined: 0,
    itemsFound: 0,
    itemsSold: 0,
    retirements: 0,
    raids: 0,
    lairsCleared: 0,
  };
  private lairs: Lair[] = [];
  private nextArrival: number;
  private debtDays = new Map<string, number>();
  private listeners: ((event: GameEventView) => void)[] = [];

  constructor(config: Partial<GameConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.board = new Board({
      windfallDays: this.config.windfallDays,
      lootingDays: this.config.lootingDays,
      bountyRenown: this.config.bountyRenown,
      contractRenown: this.config.contractRenown,
      failureRenownLoss: this.config.failureRenownLoss,
      renownCap: this.config.renownCap,
      reputationGain: this.config.reputationGain,
      expiryCooldown: this.config.expiryCooldown,
      failureCooldown: this.config.failureCooldown,
      pruningThreshold: this.config.pruningThreshold,
      contractOpenTicks: TICKS_PER_DAY * this.config.contractDays,
      travelTicks: this.config.travelTicks,
      difficultyScale: this.config.difficultyScale,
      encounterPartySize: this.config.encounterPartySize,
      lairStrengthGain: this.config.lairStrengthGain,
      lairStrengthCap: this.config.lairStrengthCap,
    });
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

  static seedFrom(value: string): number {
    return Number.isFinite(Number(value)) ? Number(value) : hashString(value);
  }

  static formatTime(tick: number): string {
    return formatTime(tick);
  }

  /** Build a controlled world for a scenario test without exposing runtime state. */
  static forTesting(config: Partial<GameConfig>, configure: (scenario: GameScenario) => void): Game {
    const game = new Game(config);
    let configuring = true;
    const duringSetup = <Value>(read: () => Value): Value => {
      if (!configuring) throw new Error('A GameScenario is only available while its setup callback runs.');
      return read();
    };
    const scenario: GameScenario = {
      get tick() { return duringSetup(() => game.tick); },
      set tick(value) { duringSetup(() => { game.tick = value; }); },
      get town() { return duringSetup(() => game.town); },
      get parties() { return duringSetup(() => game.parties); },
      set parties(value) { duringSetup(() => { game.parties = value; }); },
      get quests() { return duringSetup(() => game.board.recordsForScenario()); },
      set quests(value) { duringSetup(() => { game.board.replaceForScenario(value); }); },
      get lairs() { return duringSetup(() => game.lairs); },
      set lairs(value) { duringSetup(() => { game.lairs = value; }); },
      get stats() { return duringSetup(() => game.stats); },
      get events() { return duringSetup(() => game.events); },
      set events(value) { duringSetup(() => { game.events = value; }); },
      get chronicle() { return duringSetup(() => game.chronicle); },
      set chronicle(value) { duringSetup(() => { game.chronicle = value; }); },
    };
    try {
      configure(scenario);
    } finally {
      configuring = false;
    }
    return game;
  }

  /** A stable serialized state for the deterministic regression test. */
  regressionState(): string {
    return JSON.stringify({
      tick: this.tick,
      town: this.town,
      parties: this.parties,
      quests: this.board.all(),
      lairs: this.lairs,
      stats: this.stats,
      events: this.events,
      chronicle: this.chronicle,
      rng: this.rng,
      idSequences: this.rng.idState(),
    });
  }

  /** Encounter compositions accumulated in the world, for calibration scripts. */
  encounterSamples(): readonly GameEncounterSample[] {
    return Object.freeze(this.board.all().flatMap((quest) => quest.encounters.map((encounter) => Object.freeze({
      monsters: Object.freeze(encounter.monsters.map((monster) => Object.freeze({ name: monster.name, count: monster.count }))),
    }))));
  }

  private lairById(id: string | null): Lair | undefined {
    return id ? this.lairs.find((l) => l.id === id) : undefined;
  }

  private get activeLairs(): Lair[] {
    return this.lairs.filter((l) => l.status === 'active');
  }

  private spawnLair(theme: ThemeId, level: number): Lair {
    const lair = createLair(this.rng, theme, level, this.tick);
    this.lairs.push(lair);
    this.chronicleLog('town', `Word spreads of ${describeLair(lair)}, holed up at ${lair.place}. Nothing good will come out of there.`);
    return lair;
  }

  onEvent(listener: (event: GameEventView) => void): void {
    this.listeners.push(listener);
  }

  private get day(): number {
    return Math.floor(this.tick / TICKS_PER_DAY) + 1;
  }

  private get openQuests(): readonly ReadonlyQuest[] {
    return this.board.open();
  }

  private get activeParties(): Party[] {
    return this.parties.filter((p) => p.status !== 'disbanded');
  }

  /** A fresh, immutable snapshot for renderers. */
  view(): GameView {
    const partyNames = new Map(this.parties.map((party) => [party.id, party.name]));
    const lairs = new Map(this.lairs.map((lair) => [lair.id, lair]));
    return Object.freeze({
      time: formatTime(this.tick),
      difficultyScale: this.config.difficultyScale,
      town: Object.freeze({
        name: this.town.name,
        employers: Object.freeze(
          [...this.town.employers]
            .sort((a, b) => Number(a.ruined) - Number(b.ruined) || b.treasury - a.treasury)
            .map((employer) => this.employerView(employer)),
        ),
      }),
      parties: Object.freeze(
        this.activeParties.map((party) => Object.freeze({
          id: party.id,
          name: party.name,
          level: partyLevel(party),
          gold: party.gold,
          statusText: this.partyStatusText(party),
          questsDone: party.questsDone,
          questsFailed: party.questsFailed,
          members: Object.freeze(party.members.map(heroView)),
          templeBill: deadMembers(party).reduce((total, hero) => total + resurrectionCost(hero.level), 0),
          potions: party.potions,
          blessed: party.blessed,
          guildMember: party.guildMember,
          renown: party.renown,
          earned: party.earned,
          spent: party.spent,
          stash: Object.freeze(party.stash.map((item) => item.name)),
        })),
      ),
      board: Object.freeze({
        open: Object.freeze(this.openQuests.map((quest) => this.questView(quest, partyNames, lairs))),
        taken: Object.freeze(this.board.taken().map((quest) => this.questView(quest, partyNames, lairs))),
      }),
      lairs: Object.freeze(
        [...this.lairs]
          .sort((a, b) => Number(a.status !== 'active') - Number(b.status !== 'active'))
          .map((lair) => this.lairView(lair)),
      ),
      stats: Object.freeze({ ...this.stats }),
      events: Object.freeze(this.events.map(eventView)),
      chronicle: Object.freeze(this.chronicle.map(eventView)),
    });
  }

  private employerView(employer: Employer): GameEmployerView {
    return Object.freeze({
      name: employer.name,
      title: employer.title,
      service: employer.service,
      treasury: employer.treasury,
      dailyNet: dailyIncome(employer) - employer.upkeepPerDay,
      ruined: employer.ruined,
      reputation: employer.reputation,
      generosity: employer.generosity,
      questsPosted: employer.questsPosted,
      questsCompleted: employer.questsCompleted,
      questsFailed: employer.questsFailed,
      earned: employer.earned,
      spent: employer.spent,
      assets: Object.freeze(employer.assets.map((asset) => Object.freeze({
        name: asset.name,
        kindLabel: ASSET_KINDS[asset.kind].label,
        incomePerDay: asset.incomePerDay,
        status: asset.status,
        statusLabel: assetStatusLabel(asset),
        hasLoot: asset.loot.gold > 0 || asset.loot.items.length > 0,
      }))),
      stock: Object.freeze(employer.stock.map(itemView)),
    });
  }

  private lairView(lair: Lair): GameLairView {
    return Object.freeze({
      name: lair.name,
      status: lair.status,
      level: lair.level,
      themeLabel: THEMES[lair.theme].label,
      boss: lair.boss,
      place: lair.place,
      strength: lair.strength,
      raids: lair.raids,
      raidsWon: lair.raidsWon,
      nextRaidIn: Math.max(0, lair.raidCooldown),
      raidInterval: raidInterval(lair),
      hoardGold: lair.hoard.gold,
      hoardItems: Object.freeze(lair.hoard.items.map((item) => item.name)),
      bountyPosted: lair.questId !== null,
    });
  }

  private questView(quest: ReadonlyQuest, partyNames: ReadonlyMap<string, string>, lairs: ReadonlyMap<string, Lair>): GameQuestView {
    const lair = quest.lairId ? lairs.get(quest.lairId) : undefined;
    return Object.freeze({
      id: quest.id,
      kind: quest.kind,
      title: quest.title,
      level: quest.level,
      difficultyCode: difficultyCode(quest),
      giverName: this.employerById(quest.giverId)?.name ?? '?',
      themeLabel: THEMES[quest.theme].label,
      guildOnly: quest.guildOnly,
      reward: quest.reward,
      itemReward: quest.itemReward ? itemView(quest.itemReward) : null,
      encounterCountKnown: quest.countRevealed,
      partyName: quest.partyId ? partyNames.get(quest.partyId) ?? null : null,
      lair: lair ? Object.freeze({ name: lair.name, strength: lair.strength, hoardGold: lair.hoard.gold }) : null,
      encounters: Object.freeze(quest.encounters.map((encounter, index) => Object.freeze({
        number: index + 1,
        difficulty: index < quest.revealed ? encounter.difficulty : null,
        description: index < quest.revealed ? describeEncounter(encounter) : null,
      }))),
    });
  }

  private partyStatusText(party: Party): string {
    const quest = this.questById(party.questId);
    switch (party.status) {
      case 'idle':
        return aliveMembers(party).length < PARTY_SIZE ? `waiting for recruits (${party.idleTicks}h)` : 'looking at the board';
      case 'traveling':
        return `on the road to ${quest?.place ?? '?'} (${party.ticksLeft}h)`;
      case 'questing':
        return `fighting at ${quest?.place ?? '?'} (${party.progress}/${quest?.encounters.length ?? '?'})`;
      case 'returning':
        return `returning (${party.ticksLeft}h)`;
      case 'resting':
        return `resting at the inn (${party.ticksLeft}h)`;
      default:
        return party.status;
    }
  }

  private questById(id: string | null): ReadonlyQuest | undefined {
    return this.board.byId(id);
  }

  private employerById(id: string): Employer | undefined {
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
      source(treasury(e), income, 'income', this.stats, coinReasons);
      sink(treasury(e), e.upkeepPerDay, 'upkeep', this.stats, coinReasons);
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
    this.board.withdrawOpenWork(e, this.boardContext());
    this.chronicleLog('economy', `${e.name} are ruined. ${e.title === 'Faction' ? 'The organisation dissolves' : 'Their holdings are sold off'}; no more contracts from them.`);
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
      if (employer.treasury < POSTING_THRESHOLD) continue;
      const free = employer.assets.filter((a) => a.questId === null);
      if (free.length === 0) continue;
      // The overrun holding is always the priority; otherwise trouble strikes at random.
      const asset = free.find((a) => a.status !== 'safe') ?? this.rng.pick(free);
      const theme = rollThreat(this.rng, asset);
      const level = this.pickQuestLevel(employer);
      this.board.postContract(employer, asset, theme, level, null, this.boardContext());
      employer.cooldown = this.rng.int(12, 30);
    }
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
        if (employer.ruined || employer.treasury < POSTING_THRESHOLD) continue;
        for (const asset of employer.assets) {
          if (asset.questId === null && ASSET_KINDS[asset.kind].threats.some((t) => t.item === lair.theme)) targets.push({ employer, asset });
        }
      }
      if (targets.length === 0) continue;
      const { employer, asset } = this.rng.pick(targets);
      const level = this.pickQuestLevel(employer);
      this.board.postContract(employer, asset, lair.theme, level, lair, this.boardContext());
    }
  }

  /** The guild keeps a standing contract on every lair once someone in town could plausibly take it. */
  private postAssaults(): void {
    const guild = serviceOf(this.town, 'guild');
    if (guild.ruined || guild.treasury < POSTING_THRESHOLD) return;
    for (const lair of this.activeLairs) {
      if (lair.questId) continue;
      const strongest = Math.max(0, ...this.activeParties.map(partyLevel));
      if (strongest < lair.level - 1) continue;
      this.board.postBounty(lair, this.boardContext());
    }
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
    if (employer.reputation >= 3 && this.rng.chance(0.1)) return Math.min(MAX_LEVEL, top + 1);
    return this.rng.weighted(weights);
  }

  private expireQuests(): void {
    this.board.expireContracts(this.boardContext());
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
    if (p.status === 'idle') return this.idle(p);
    advanceExpedition(p, {
      quest: this.questById(p.questId),
      town: this.town,
      rng: this.rng,
      ledger: this.stats,
      statistics: this.stats,
      travelTicks: this.config.travelTicks,
      restTicks: this.config.restTicks,
      shortRestHealFraction: this.config.shortRestHealFraction,
      skillDc: SKILL_DC,
      combat: runCombat,
      report: ({ kind, text, detail, chronicle }) => {
        if (chronicle) this.chronicleLog(kind, text);
        else this.log(kind, text, detail);
      },
      learnIntel: (quest) => this.board.learnIntel(quest),
      revealAll: (quest) => this.board.revealAll(quest),
      settleQuest: (quest, party, success) => this.board.settle(quest, party, success, this.boardContext()),
      leaveLoot: (quest, party, fallen) => this.leaveLoot(quest, party, fallen),
    });
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
    const rep = (q: ReadonlyQuest) => this.employerById(q.giverId)?.reputation ?? 0;
    const favored = (q: ReadonlyQuest) => (this.employerById(q.giverId)?.favoredPartyId === p.id ? 1 : 0);
    candidates.sort(
      (a, b) => favored(b) - favored(a) || Math.abs(a.level - level) - Math.abs(b.level - level) || rep(b) - rep(a) || b.reward - a.reward,
    );
    const quest = candidates[0]!;
    if (this.investigate(p, quest)) return;
    this.acceptQuest(p, quest);
  }

  private acceptQuest(p: Party, quest: ReadonlyQuest): void {
    const context = this.boardContext();
    const departure = this.board.take(p, quest, context);
    startExpedition(p, departure.travelTicks);
    context.report(departure.acceptance);
  }

  /**
   * Before signing, a company with coin to spare buys a round at the tavern and
   * asks around: first how long the job is, then what else waits out there.
   * Returns true if the hour went on that.
   */
  private investigate(p: Party, quest: ReadonlyQuest): boolean {
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
          this.log('shop', `${check.hero.name} works the room at ${tavern.name} (Persuasion ${dice} vs DC ${SKILL_DC}): ${this.board.learnIntel(quest)}.`);
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
      transfer(purse(p), treasury(temple), divination, 'service', this.stats, coinReasons);
      this.board.revealAll(quest);
      this.log('temple', `${p.name} pay ${divination} gp for a divination at the ${temple.name}. The priests see "${quest.title}" whole: ${quest.encounters.length} fights [${difficultyCode(quest)}].`);
      return true;
    }

    // Otherwise a round buys one thing at a time.
    const done = p.investigations[quest.id] ?? 0;
    if (done >= MAX_INVESTIGATIONS) return false;
    const cost = INVESTIGATION_COST_PER_LEVEL * level;
    if (tavern.ruined || p.gold - cost < reserve) return false;
    transfer(purse(p), treasury(tavern), cost, 'service', this.stats, coinReasons);
    p.investigations[quest.id] = done + 1;
    this.log('shop', `${p.name} buy a round at ${tavern.name} (${cost} gp) and ask about "${quest.title}": ${this.board.learnIntel(quest)}.`);
    return true;
  }

  /** A retired adventurer's contracts are held a day for their old company. */
  private hasFirstRefusal(q: ReadonlyQuest, p: Party): boolean {
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
      statistics: this.stats,
      report: ({ kind, text, chronicle }) => {
        if (chronicle) this.chronicleLog(kind, text);
        else this.log(kind, text);
      },
      tryRetire: () => this.retire(p),
    });
  }

  /** The most seasoned living veteran may retire when the company can afford a business. */
  private retire(p: Party): boolean {
    const veteran = aliveMembers(p)
      .filter((h) => h.level >= RETIREMENT_LEVEL)
      .sort((a, b) => b.level - a.level || b.xp - a.xp)[0];
    if (!veteran || p.gold < RETIREMENT_PRICE + resurrectionCost(partyLevel(p))) return false;
    p.members = p.members.filter((h) => h !== veteran);
    for (const item of veteran.items) p.stash.push(item);
    veteran.items = [];
    const capital = Math.floor(RETIREMENT_PRICE * 0.2);
    const employer = retiredEmployer(this.rng, veteran.name, p.id);
    // 20,000 leaves the world; 5,000 is the new employer's opening treasury. No event between them.
    sink(purse(p), RETIREMENT_PRICE - capital, 'retirement', this.stats, coinReasons);
    transfer(purse(p), treasury(employer), capital, 'retirement', this.stats, coinReasons);
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
    if (!temple.ruined) {
      for (const dead of deadMembers(p)) {
        const cost = resurrectionCost(dead.level);
        if (p.gold < cost) continue;
        transfer(purse(p), treasury(temple), cost, 'service', this.stats, coinReasons, dead);
        resurrectHero(dead);
        this.stats.resurrections += 1;
        raised.push(dead);
        bill += cost;
      }
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
    const leftover = mergeParties(host, donor, this.stats);
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

  /**
   * Whatever the fallen carried is lost to the field. If a lair is behind the
   * job, its hoard swells with it; otherwise the next company to clear the
   * holding finds it among the bones.
   */
  /** Hand a broken lair's hoard to the company. The Board asks for this when a bounty succeeds. */
  private payHoard(lair: Lair, company: Party): string {
    const gold = lair.hoard.gold;
    const items = lair.hoard.items;
    transfer(hoard(lair), purse(company), gold, 'spoils', this.stats, coinReasons);
    company.stash.push(...items);
    this.stats.itemsFound += items.length;
    lair.hoard.items = [];
    const found = [gold > 0 ? `${gold} gp` : '', ...items.map((item) => item.name)].filter(Boolean).join(', ');
    return found;
  }

  private boardContext(): BoardContext {
    return {
      town: this.town,
      lairs: this.lairs,
      rng: this.rng,
      tick: this.tick,
      ledger: this.stats,
      statistics: this.stats,
      report: ({ kind, text, chronicle }) => {
        if (chronicle) this.chronicleLog(kind, text);
        else this.log(kind, text);
      },
      payHoard: (lair, company) => this.payHoard(lair, company),
    };
  }

  private leaveLoot(quest: ReadonlyQuest, p: Party, fallen: Hero[]): void {
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
      if (lair) transfer(purse(p), hoard(lair), gold, 'wipe', this.stats, coinReasons);
      else if (asset) transfer(purse(p), loot(asset), gold, 'wipe', this.stats, coinReasons);
    }
    store.items.push(...items);
    if (items.length === 0 && gold === 0) return;
    const what = [items.length > 0 ? items.map((i) => i.name).join(', ') : '', gold > 0 ? `${gold} gp` : ''].filter(Boolean).join(' and ');
    if (lair) this.log('death', `${what} go${items.length + (gold > 0 ? 1 : 0) === 1 ? 'es' : ''} to the hoard of ${lair.name} (now ${lair.hoard.gold} gp and ${lair.hoard.items.length} item${lair.hoard.items.length === 1 ? '' : 's'}).`);
    else this.log('death', `${what} lie${items.length + (gold > 0 ? 1 : 0) === 1 ? 's' : ''} among the dead at ${quest.place}.`);
  }

  // ---------------------------------------------------------------- logging

  private log(kind: EventKind, text: string, detail?: string[]): GameEvent {
    const e: GameEvent = { tick: this.tick, kind, text, detail };
    this.events.push(e);
    if (this.events.length > 600) this.events.splice(0, this.events.length - 600);
    for (const listener of this.listeners) listener(eventView(e));
    return e;
  }

  private chronicleLog(kind: EventKind, text: string): void {
    const e = this.log(kind, text);
    this.chronicle.push(e);
    if (this.chronicle.length > 300) this.chronicle.splice(0, this.chronicle.length - 300);
  }
}

function itemView(item: DeepReadonly<MagicItem>): GameItemView {
  return Object.freeze({ name: item.name, effect: describeEffect(item.effect), price: item.price });
}

function heroView(hero: Hero): GameHeroView {
  const nextLevel = xpToNextLevel(hero.level);
  return Object.freeze({
    name: hero.name,
    heroClass: hero.heroClass,
    level: hero.level,
    alive: hero.alive,
    hp: hero.hp,
    maxHp: hero.maxHp,
    hpPercent: Math.round((100 * hero.hp) / hero.maxHp),
    kills: hero.kills,
    xpText: nextLevel ? `${hero.xp}/${nextLevel} xp` : 'max',
    armorTier: hero.armorTier,
    items: Object.freeze(hero.items.map(itemView)),
  });
}

function eventView(event: GameEvent): GameEventView {
  return Object.freeze({
    tick: event.tick,
    kind: event.kind,
    text: event.text,
    ...(event.detail ? { detail: Object.freeze([...event.detail]) } : {}),
  });
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
