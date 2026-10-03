import { emptyGoldStatistics, hoard, loot, openCoin, purse, treasury, type Coin } from '../town/coin';
import { TOWN_SERVICE_STEPS } from '../town/services';
import { resolveSteps } from '../core/steps';
import { CompanyRoster, type RosterContext } from '../adventurers/company-roster';
import {
  resurrectionCost,
  type Hero,
} from '../adventurers/hero';
import {
  deadMembers,
  partyLevel,
  type Party,
  type ReadonlyParty,
} from '../adventurers/party';
import { runCombat } from '../combat/battlecast';
import { describeEffect, rollStockItem, type MagicItem } from '../items/items';
import type { DeepReadonly } from '../core/readonly';
import { hashString, Rng } from '../core/rng';
import { MAX_LEVEL, xpToNextLevel } from '../core/xp';
import { describeEncounter, type Difficulty } from '../quests/encounters';
import { JOB_INTEL_STEPS } from '../quests/job-intel';
import { difficultyCode, type Quest, type ReadonlyQuest } from '../quests/quest';
import { THEMES, type ThemeId } from '../quests/themes';
import { ASSET_KINDS, rollThreat, type Asset } from '../town/assets';
import { createLair, describeLair, LAIR_THEMES, raidInterval, type Lair } from '../town/lairs';
import {
  assetById,
  dailyIncome,
  generateTown,
  serviceOf,
  type Employer,
  type Town,
} from '../town/town';
import { Board, type BoardContext } from './board';
import { resolveGameConfig, TICKS_PER_DAY, type DeepPartial, type GameConfig } from './config';

export { TICKS_PER_DAY, type GameConfig, type DeepPartial };
export { DEFAULT_CONFIG, mergeConfig, resolveGameConfig, validateGameConfig } from './config';

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
  /** Badge text from the kind. Empty means no badge. */
  readonly badge: string;
  readonly badgeClass: string;
  /** Board-card line naming the lair, already phrased for this kind. */
  readonly origin: string | null;
  readonly originDetail: string | null;
  readonly encounters: readonly GameEncounterView[];
}

export class Game {
  private readonly config: GameConfig;
  private readonly rng: Rng;
  private readonly town: Town;
  private tick = 0;
  private readonly board: Board;
  private readonly roster: CompanyRoster;
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
  private debtDays = new Map<string, number>();
  private listeners: ((event: GameEventView) => void)[] = [];
  private readonly coin: Coin;

  constructor(partial: DeepPartial<GameConfig> = {}) {
    const resolved = resolveGameConfig(partial);
    if (!resolved.ok) throw new Error(resolved.errors.join('\n'));
    this.config = resolved.config;
    this.board = new Board(this.config.board);
    this.rng = new Rng(this.config.seed);
    this.town = generateTown(this.rng, this.config.town, this.config.holdings);
    this.roster = new CompanyRoster(this.config.roster, this.config.heroes, this.config.town, this.config.holdings);
    this.coin = openCoin(this.stats);
    const temple = serviceOf(this.town, 'temple');
    this.log('town', `Welcome to ${this.town.name}. Adventurers gather at ${this.town.tavernName}; the ${temple.name} keeps its doors open for the fallen.`);
    for (const e of this.town.employers) {
      const holdings = e.assets.map((a) => `${a.name} (${a.incomePerDay} gp/day)`).join(', ');
      this.log('town', `${e.name} (${e.title}) holds ${holdings}. Treasury ${e.treasury} gp, upkeep ${e.upkeepPerDay} gp/day.`);
    }
    const themes = this.rng.shuffle(LAIR_THEMES).slice(0, this.rng.int(...this.config.world.startingLairs));
    for (const theme of themes) this.spawnLair(theme, this.rng.int(...this.config.world.startingLairLevels));
  }

  static seedFrom(value: string): number {
    return Number.isFinite(Number(value)) ? Number(value) : hashString(value);
  }

  static formatTime(tick: number): string {
    return formatTime(tick);
  }

  /** Build a controlled world for a scenario test without exposing runtime state. */
  static forTesting(config: DeepPartial<GameConfig>, configure: (scenario: GameScenario) => void): Game {
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
      get parties() { return duringSetup(() => game.roster.recordsForScenario()); },
      set parties(value) { duringSetup(() => { game.roster.replaceForScenario(value); }); },
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
      parties: this.roster.all(),
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
    const lair = createLair(this.rng, theme, level, this.tick, this.config.roster.companySize, this.config.lairs);
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

  private get activeParties(): readonly ReadonlyParty[] {
    return this.roster.active();
  }

  /** A fresh, immutable snapshot for renderers. */
  view(): GameView {
    const partyNames = new Map(this.roster.all().map((party) => [party.id, party.name]));
    const lairs = new Map(this.lairs.map((lair) => [lair.id, lair]));
    return Object.freeze({
      time: formatTime(this.tick),
      difficultyScale: this.config.board.difficultyScale,
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
          templeBill: deadMembers(party).reduce((total, hero) => total + resurrectionCost(hero.level, this.config.heroes), 0),
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
      dailyNet: dailyIncome(employer, this.config.town.threatenedIncomeDivisor) - employer.upkeepPerDay,
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
      raidInterval: raidInterval(lair, this.config.lairs),
      hoardGold: lair.hoard.gold,
      hoardItems: Object.freeze(lair.hoard.items.map((item) => item.name)),
      bountyPosted: lair.questId !== null,
    });
  }

  private questView(quest: ReadonlyQuest, partyNames: ReadonlyMap<string, string>, lairs: ReadonlyMap<string, Lair>): GameQuestView {
    const lair = quest.lairId ? lairs.get(quest.lairId) : undefined;
    const profile = this.board.profile(quest.kind);
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
      badge: profile.badge,
      badgeClass: profile.badge ? profile.id : '',
      origin: lair ? `${profile.lairRelation} ${lair.name}` : null,
      originDetail: lair ? (profile.lairFigure === 'hoard' ? `hoard ${lair.hoard.gold} gp` : `strength ${lair.strength}`) : null,
      encounters: Object.freeze(quest.encounters.map((encounter, index) => Object.freeze({
        number: index + 1,
        difficulty: index < quest.revealed ? encounter.difficulty : null,
        description: index < quest.revealed ? describeEncounter(encounter) : null,
      }))),
    });
  }

  private partyStatusText(party: ReadonlyParty): string {
    const quest = this.questById(party.questId);
    switch (party.status) {
      case 'idle':
        return !this.roster.isReady(party) ? `waiting for recruits (${party.idleTicks}h)` : 'looking at the board';
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
    this.roster.arrivals({ ...this.rosterContext(), board: this.board });
    // Famous companies get first pick of the board.
    this.roster.updateActive((party) => this.updateParty(party));
    this.expireQuests();
  }

  // ---------------------------------------------------------------- shops

  /** Magic items trickle onto the shelves of the few shops that deal in them. */
  private restock(): void {
    for (const e of this.town.employers) {
      const restock = e.service ? this.config.town.restockTicks[e.service as keyof typeof this.config.town.restockTicks] : undefined;
      if (e.ruined || !restock) continue;
      if (e.stock.length >= this.config.town.maxStock) continue;
      if (--e.restockIn > 0) continue;
      e.restockIn = restock;
      const item = rollStockItem(this.rng, e.service as 'enchanter' | 'temple' | 'smith', this.config.items);
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
      const income = dailyIncome(e, this.config.town.threatenedIncomeDivisor);
      this.coin.source(treasury(e), income, 'income');
      this.coin.sink(treasury(e), e.upkeepPerDay, 'upkeep');
      earned += income;
      paid += e.upkeepPerDay;
      if (e.treasury < 0) {
        const days = (this.debtDays.get(e.id) ?? 0) + 1;
        this.debtDays.set(e.id, days);
        if (days >= this.config.world.ruinDays) this.ruin(e);
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
      if (this.openQuests.length >= this.config.world.maxOpenQuests) continue;
      if (employer.treasury < this.config.world.postingThreshold) continue;
      const free = employer.assets.filter((a) => a.questId === null);
      if (free.length === 0) continue;
      // The overrun holding is always the priority; otherwise trouble strikes at random.
      const asset = free.find((a) => a.status !== 'safe') ?? this.rng.pick(free);
      const theme = rollThreat(this.rng, asset);
      const level = this.pickQuestLevel(employer);
      this.board.postContract(employer, asset, theme, level, null, this.boardContext());
      employer.cooldown = this.rng.int(...this.config.world.postingCooldown);
    }
  }

  // ---------------------------------------------------------------- lairs

  /** Each lair sends raids of its own at a pace set by its strength, at holdings its kind of trouble goes for. */
  private raids(): void {
    for (const lair of this.activeLairs) {
      if (--lair.raidCooldown > 0) continue;
      lair.raidCooldown = raidInterval(lair, this.config.lairs);
      if (this.openQuests.length >= this.config.world.maxOpenQuests) continue;
      const targets: { employer: Employer; asset: Asset }[] = [];
      for (const employer of this.town.employers) {
        if (employer.ruined || employer.treasury < this.config.world.postingThreshold) continue;
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
    if (guild.ruined || guild.treasury < this.config.world.postingThreshold) return;
    for (const lair of this.activeLairs) {
      if (lair.questId) continue;
      const strongest = Math.max(0, ...this.activeParties.map(partyLevel));
      if (strongest < lair.level - this.config.world.bountyLevelGap) continue;
      this.board.postBounty(lair, this.boardContext());
    }
  }

  /** A while after a lair falls, something worse moves in. */
  private respawnLairs(): void {
    for (const lair of this.lairs) {
      if (lair.status !== 'cleared' || lair.clearedAt === null) continue;
      if (this.tick - lair.clearedAt < this.config.world.lairRespawnDays * TICKS_PER_DAY) continue;
      lair.clearedAt = null;
      const theme = this.rng.chance(this.config.world.lairRespawnSameThemeChance) ? lair.theme : this.rng.pick(LAIR_THEMES);
      this.spawnLair(theme, Math.min(MAX_LEVEL, lair.level + this.rng.int(...this.config.world.lairRespawnLevelGain)));
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
    const weights = parties.map((p) => ({
      item: partyLevel(p),
      weight: p.status === 'idle' || p.status === 'resting' ? this.config.world.idleLevelWeight : this.config.world.busyLevelWeight,
    }));
    const top = Math.max(...weights.map((w) => w.item));
    if (employer.reputation >= this.config.world.stretchReputation && this.rng.chance(this.config.world.stretchPostChance)) {
      return Math.min(MAX_LEVEL, top + this.config.world.levelStretch);
    }
    return this.rng.weighted(weights);
  }

  private expireQuests(): void {
    this.board.expireContracts(this.boardContext());
  }

  // ---------------------------------------------------------------- parties

  private updateParty(p: ReadonlyParty): void {
    if (p.status === 'idle') return this.idle(p);
    this.roster.advance(p, {
      quest: this.questById(p.questId),
      town: this.town,
      rng: this.rng,
      ledger: this.stats,
      coin: this.coin,
      kinds: this.board.profiles(),
      travelTicks: this.config.board.travelTicks,
      config: this.config.expedition,
      intel: this.config.intel,
      encounters: this.config.encounters,
      renownCap: this.config.roster.renownCap,
      blessingHpPerLevel: this.config.services.blessingHpPerLevel,
      companySize: this.config.roster.companySize,
      heroes: this.config.heroes,
      combat: (heroes, spec, seed, options) => runCombat(heroes, spec, seed, { ...options, rules: this.config.combat, heroes: this.config.heroes }),
      disband: (company) => this.roster.disband(company),
      report: ({ kind, text, detail, chronicle }) => {
        if (chronicle) this.chronicleLog(kind, text);
        else this.log(kind, text, detail);
      },
      knowledge: (quest) => this.board.knowledge(quest),
      settleQuest: (quest, party, success) => this.board.settle(quest, party, success, this.boardContext()),
      leaveLoot: (quest, party, fallen) => this.leaveLoot(quest, party, fallen),
    });
  }

  private idle(p: ReadonlyParty): void {
    this.roster.wait(p);
    if (!this.roster.isReady(p)) {
      this.roster.recruit(p, this.rosterContext());
      if (!this.roster.isReady(p)) return;
    }
    if (this.shop(p)) return;
    const level = partyLevel(p);
    // Companies take work at their level or a little below; nobody signs up to punch above their weight.
    // A company takes work at its own level. After a slow day it will stretch one level either way,
    // never more: the small jobs are for the companies that need them.
    const stretch = p.idleTicks >= this.config.world.idleStretchTicks ? this.config.world.levelStretch : 0;
    const standing = this.openQuests.find((q) => this.board.profile(q.kind).offer === 'lair' && q.level <= level);
    if (standing && p.gold >= resurrectionCost(level, this.config.heroes) && this.rng.chance(this.config.world.assaultAppetite)) {
      this.acceptQuest(p, standing);
      return;
    }
    const candidates = this.openQuests.filter(
      (q) => this.board.profile(q.kind).offer === 'holding' && Math.abs(q.level - level) <= stretch && (!q.guildOnly || p.guildMember) && this.hasFirstRefusal(q, p),
    );
    if (candidates.length === 0) return;
    // An old friend's contract first, then exact level, then the employer's name, then the pay.
    const rep = (q: ReadonlyQuest) => this.employerById(q.giverId)?.reputation ?? 0;
    const favored = (q: ReadonlyQuest) => (this.employerById(q.giverId)?.favoredPartyId === p.id ? 1 : 0);
    candidates.sort(
      (a, b) => favored(b) - favored(a) || Math.abs(a.level - level) - Math.abs(b.level - level) || rep(b) - rep(a) || b.reward - a.reward,
    );
    const quest = candidates[0]!;
    if (this.roster.seekIntelligence(p, resolveSteps(this.config.intel.steps, JOB_INTEL_STEPS), {
      work: quest,
      knowledge: this.board.knowledge(quest),
      town: this.town,
      rng: this.rng,
      coin: this.coin,
      config: this.config.intel,
      heroes: this.config.heroes,
      report: ({ kind, text }) => this.log(kind, text),
    })) return;
    this.acceptQuest(p, quest);
  }

  private acceptQuest(p: ReadonlyParty, quest: ReadonlyQuest): void {
    const context = this.boardContext();
    const departure = this.roster.depart(p, quest, { board: this.board, work: context });
    context.report(departure.acceptance);
  }

  /** A retired adventurer's contracts are held a day for their old company. */
  private hasFirstRefusal(q: ReadonlyQuest, p: ReadonlyParty): boolean {
    const employer = this.employerById(q.giverId);
    if (!employer?.favoredPartyId || employer.favoredPartyId === p.id) return true;
    const friends = this.roster.byId(employer.favoredPartyId);
    if (!friends || friends.status === 'disbanded') return true;
    return this.tick - q.postedAt >= this.config.world.firstRefusalTicks;
  }

  /** The complete service order is the configured list of step names. */
  private shop(p: ReadonlyParty): boolean {
    const steps = resolveSteps(this.config.services.steps, {
      ...TOWN_SERVICE_STEPS,
      retirement: this.roster.retirementStep(this.rosterContext()),
    });
    return this.roster.visitServices(p, steps, {
      town: this.town,
      day: this.day,
      ledger: this.stats,
      coin: this.coin,
      report: ({ kind, text, chronicle }) => {
        if (chronicle) this.chronicleLog(kind, text);
        else this.log(kind, text);
      },
      services: this.config.services,
      heroes: this.config.heroes,
      items: this.config.items,
      maxStock: this.config.town.maxStock,
    });
  }

  private rosterContext(): RosterContext {
    return {
      town: this.town,
      rng: this.rng,
      tick: this.tick,
      ledger: this.stats,
      coin: this.coin,
      report: ({ kind, text, chronicle }) => {
        if (chronicle) this.chronicleLog(kind, text);
        else this.log(kind, text);
      },
    };
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
    this.coin.transfer(hoard(lair), purse(company), gold, 'spoils');
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
      coin: this.coin,
      report: ({ kind, text, chronicle }) => {
        if (chronicle) this.chronicleLog(kind, text);
        else this.log(kind, text);
      },
      payHoard: (lair, company) => this.payHoard(lair, company),
      companySize: this.config.roster.companySize,
      renownCap: this.config.roster.renownCap,
      lairStrengthCap: this.config.lairs.strengthCap,
      quests: this.config.quests,
      encounters: this.config.encounters,
      intel: this.config.intel,
      items: this.config.items,
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
      if (lair) this.coin.transfer(purse(p), hoard(lair), gold, 'wipe');
      else if (asset) this.coin.transfer(purse(p), loot(asset), gold, 'wipe');
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
    if (this.events.length > this.config.world.eventLogLimit) this.events.splice(0, this.events.length - this.config.world.eventLogLimit);
    for (const listener of this.listeners) listener(eventView(e));
    return e;
  }

  private chronicleLog(kind: EventKind, text: string): void {
    const e = this.log(kind, text);
    this.chronicle.push(e);
    if (this.chronicle.length > this.config.world.chronicleLimit) this.chronicle.splice(0, this.chronicle.length - this.config.world.chronicleLimit);
  }
}

function itemView(item: DeepReadonly<MagicItem>): GameItemView {
  return Object.freeze({ name: item.name, effect: describeEffect(item.effect), price: item.price });
}

function heroView(hero: DeepReadonly<Hero>): GameHeroView {
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
