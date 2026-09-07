import {
  armorUpgradeCost,
  describeHero,
  equipItem,
  wantsItem,
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
import { describeEffect, resalePrice, rollStockItem, type MagicItem } from '../items/items';
import { Rng } from '../core/rng';
import { describeEncounter } from '../quests/encounters';
import { difficultyCode, generateQuest, type Quest } from '../quests/quest';
import { THEMES } from '../quests/themes';
import { ASSET_KINDS, rollThreat, type Asset } from '../town/assets';
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
   * are safe once potions, armour and retreats are in play; 1.25 (scripts/tune.ts) brings
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
  difficultyScale: 1.25,
};

export const TICKS_PER_DAY = 24;

/** Days of an asset's income the owner recovers when it is retaken (cargo, ore, tolls). */
const WINDFALL_DAYS = 4;
/** Days of income lost to looters when nobody answers the call. */
const LOOTING_DAYS = 2;
/** Guild dues per member per week, times the company level. */
const GUILD_DUES_PER_LEVEL = 15;
const DUES_PERIOD_DAYS = 7;
/** A blessing costs this much per company level and adds this many hit points per level. */
const BLESSING_COST_PER_LEVEL = 40;
const BLESSING_HP_PER_LEVEL = 3;
/** Share of the purse a company drinks through after a job well done. */
const CAROUSING_SHARE = 0.05;
const MAX_RENOWN = 10;

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
    this.restock();
    this.postQuests();
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
      const quest = generateQuest(this.rng, {
        employer,
        asset,
        theme,
        level,
        partySize: PARTY_SIZE,
        tick: this.tick,
        difficultyScale: this.config.difficultyScale,
      });
      this.quests.push(quest);
      asset.questId = quest.id;
      const wasSafe = asset.status === 'safe';
      if (wasSafe) asset.status = 'threatened';
      employer.questsPosted += 1;
      employer.cooldown = this.rng.int(12, 30);
      const lead = wasSafe
        ? `${THEMES[theme].label} threaten ${asset.name}.`
        : capitalize(`${asset.name} is still overrun; ${employer.name} raise the bounty.`);
      const extras = [quest.itemReward ? `and a ${quest.itemReward.name}` : '', quest.guildOnly ? '(guild)' : ''].filter(Boolean).join(' ');
      this.log('quest', `${lead} ${employer.name} post a level ${quest.level} contract: "${quest.title}" [${difficultyCode(quest)}] for ${quest.reward} gp ${extras}`.trim() + '.');
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
        this.log('economy', `Nobody answered "${q.title}". ${capitalize(asset.name)} stays in enemy hands and ${employer.name} lose another ${loss} gp.`);
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
    // A company takes work at its own level. After a slow day it will stoop one level, never more:
    // the small jobs are for the companies that need them.
    const lowest = p.idleTicks >= TICKS_PER_DAY ? level - 1 : level;
    const candidates = this.openQuests.filter(
      (q) => q.level <= level && q.level >= lowest && (!q.guildOnly || p.guildMember) && this.hasFirstRefusal(q, p),
    );
    if (candidates.length === 0) return;
    // An old friend's contract first, then exact level, then the employer's name, then the pay.
    const rep = (q: Quest) => this.employerById(q.giverId)?.reputation ?? 0;
    const favored = (q: Quest) => (this.employerById(q.giverId)?.favoredPartyId === p.id ? 1 : 0);
    candidates.sort(
      (a, b) => favored(b) - favored(a) || Math.abs(a.level - level) - Math.abs(b.level - level) || rep(b) - rep(a) || b.reward - a.reward,
    );
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

  /** A retired adventurer's contracts are held a day for their old company. */
  private hasFirstRefusal(q: Quest, p: Party): boolean {
    const employer = this.employerById(q.giverId);
    if (!employer?.favoredPartyId || employer.favoredPartyId === p.id) return true;
    const friends = this.parties.find((o) => o.id === employer.favoredPartyId);
    if (!friends || friends.status === 'disbanded') return true;
    return this.tick - q.postedAt >= TICKS_PER_DAY;
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

    if (this.sellLoot(p, reserve)) return true;
    if (this.buyItem(p, reserve)) return true;
    if (this.payDues(p, reserve)) return true;
    if (this.buyBlessing(p, reserve)) return true;
    if (this.retire(p)) return true;

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

  /** Equip loot from the stash where it helps; sell the rest to the enchanter, who puts it back on sale. */
  private sellLoot(p: Party, _reserve: number): boolean {
    if (p.stash.length === 0) return false;
    const item = p.stash.shift()!;
    const taker = pickRecipient(aliveMembers(p), item);
    if (taker) {
      const replaced = equipItem(taker, item);
      if (replaced) p.stash.push(replaced);
      this.log('shop', `${taker.name} takes up the ${item.name} (${describeEffect(item.effect)}).`);
      return true;
    }
    const enchanter = serviceOf(this.town, 'enchanter');
    const price = Math.min(resalePrice(item), enchanter.treasury);
    if (enchanter.ruined || price <= 0 || enchanter.stock.length >= MAX_STOCK) {
      p.stash.push(item);
      return false;
    }
    enchanter.treasury -= price;
    enchanter.spent += price;
    enchanter.stock.push(item);
    p.gold += price;
    p.earned += price;
    this.stats.itemsSold += 1;
    this.log('shop', `${p.name} sell a ${item.name} to ${enchanter.name} for ${price} gp.`);
    return true;
  }

  /** Buy the best affordable item any member could use. Prices are steep on purpose. */
  private buyItem(p: Party, reserve: number): boolean {
    const budget = p.gold - reserve;
    let best: { shop: Employer; item: MagicItem; hero: Hero } | null = null;
    for (const shop of this.town.employers) {
      if (shop.ruined) continue;
      for (const item of shop.stock) {
        if (item.price > budget) continue;
        const hero = pickRecipient(aliveMembers(p), item);
        if (!hero) continue;
        if (!best || item.price > best.item.price) best = { shop, item, hero };
      }
    }
    if (!best) return false;
    best.shop.stock = best.shop.stock.filter((i) => i !== best!.item);
    this.pay(p, best.shop, best.item.price);
    best.hero.goldSpent += best.item.price;
    const replaced = equipItem(best.hero, best.item);
    if (replaced) p.stash.push(replaced);
    this.chronicleLog('shop', `${best.hero.name} buys a ${best.item.name} from ${best.shop.name} for ${best.item.price} gp (${describeEffect(best.item.effect)}).`);
    return true;
  }

  /** Weekly dues keep a company on the guild's books; noble and faction contracts go through the guild. */
  private payDues(p: Party, reserve: number): boolean {
    const guild = serviceOf(this.town, 'guild');
    if (guild.ruined) return false;
    const due = p.duesPaidDay < 0 || this.day - p.duesPaidDay >= DUES_PERIOD_DAYS;
    if (!due) return false;
    const cost = GUILD_DUES_PER_LEVEL * partyLevel(p) * aliveMembers(p).length;
    if (p.gold - cost < reserve) {
      if (p.guildMember) {
        p.guildMember = false;
        this.log('shop', `${p.name} cannot pay their guild dues (${cost} gp). Their membership lapses.`);
      }
      return false;
    }
    this.pay(p, guild, cost);
    p.duesPaidDay = this.day;
    const joined = !p.guildMember;
    p.guildMember = true;
    this.log('shop', `${p.name} ${joined ? 'join the Adventurers’ Guild' : 'pay their guild dues'}: ${cost} gp.`);
    return true;
  }

  /** A donation at the temple buys the company a blessing for its next contract. */
  private buyBlessing(p: Party, reserve: number): boolean {
    if (p.blessed) return false;
    const temple = serviceOf(this.town, 'temple');
    if (temple.ruined) return false;
    const level = partyLevel(p);
    const cost = BLESSING_COST_PER_LEVEL * level;
    if (p.gold - cost < reserve * 1.5) return false;
    this.pay(p, temple, cost);
    p.blessed = true;
    this.log('temple', `${p.name} leave ${cost} gp at the ${temple.name} and are blessed (+${BLESSING_HP_PER_LEVEL * level} hp on their next contract).`);
    return true;
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
    const outcome = runCombat(fighters, spec, this.rng.seed(), p.blessed ? { blessingHp: BLESSING_HP_PER_LEVEL * partyLevel(p) } : {});

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
        this.leaveLoot(quest, p, p.members);
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
      this.leaveLoot(quest, p, fallen);
      this.headHome(p);
      return;
    }

    this.log('combat', `${p.name}: ${summary} Neither side can finish it; the party withdraws.`, outcome.lines);
    this.headHome(p);
  }

  /** Whatever the fallen carried stays on the field for the next company to find. */
  private leaveLoot(quest: Quest, p: Party, fallen: Hero[]): void {
    const asset = assetById(this.town, quest.assetId);
    if (!asset) return;
    const items = fallen.flatMap((h) => h.items);
    for (const h of fallen) h.items = [];
    const wiped = p.status === 'disbanded';
    if (wiped) {
      items.push(...p.stash);
      p.stash = [];
      asset.loot.gold += p.gold;
      p.gold = 0;
    }
    asset.loot.items.push(...items);
    if (items.length > 0 || (wiped && asset.loot.gold > 0)) {
      const what = [items.length > 0 ? items.map((i) => i.name).join(', ') : '', wiped && asset.loot.gold > 0 ? `${asset.loot.gold} gp` : ''].filter(Boolean).join(' and ');
      this.log('death', `${what} lie${items.length + (wiped ? 1 : 0) === 1 ? 's' : ''} among the dead at ${quest.place}.`);
    }
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

/** Who gets an item: whoever can use it and carries the least magic already. */
function pickRecipient(members: Hero[], item: MagicItem): Hero | undefined {
  const worth = (h: Hero) => h.items.reduce((s, i) => s + i.price, 0);
  return members
    .filter((h) => wantsItem(h, item))
    .sort((a, b) => a.items.length - b.items.length || worth(a) - worth(b))[0];
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
