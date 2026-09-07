import { describeHero, gainXp, healHero, killHero, resurrectHero, resurrectionCost, type Hero } from '../adventurers/hero';
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
import { generateTown, type QuestGiver, type Town } from '../town/town';

export type EventKind = 'town' | 'quest' | 'party' | 'combat' | 'death' | 'levelup' | 'temple' | 'reward';

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
  heroesDied: number;
  resurrections: number;
  partiesWiped: number;
  partiesArrived: number;
  goldPaid: number;
}

export interface GameConfig {
  seed: number;
  maxOpenQuests: number;
  maxParties: number;
  /** Mean ticks between party arrivals. */
  arrivalInterval: number;
  travelTicks: number;
  restTicks: number;
  /** Ticks an incomplete party waits before it stops hoping for the temple and looks for recruits. */
  patienceTicks: number;
}

export const DEFAULT_CONFIG: GameConfig = {
  seed: 20260907,
  maxOpenQuests: 8,
  maxParties: 8,
  arrivalInterval: 10,
  travelTicks: 2,
  restTicks: 8,
  patienceTicks: 12,
};

export const TICKS_PER_DAY = 24;

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
    heroesDied: 0,
    resurrections: 0,
    partiesWiped: 0,
    partiesArrived: 0,
    goldPaid: 0,
  };
  private nextArrival: number;
  private listeners: ((e: GameEvent) => void)[] = [];

  constructor(config: Partial<GameConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.rng = new Rng(this.config.seed);
    this.town = generateTown(this.rng);
    this.nextArrival = 1;
    this.log('town', `Welcome to ${this.town.name}. Adventurers gather at ${this.town.tavern}; the ${this.town.temple.name} keeps its doors open for the fallen.`);
    for (const g of this.town.givers) {
      this.log('town', `${g.name} (${g.title}) is looking for sellswords. Interests: ${g.themes.map((t) => THEMES[t].label).join(', ')}.`);
    }
  }

  onEvent(listener: (e: GameEvent) => void): void {
    this.listeners.push(listener);
  }

  get day(): number {
    return Math.floor(this.tick / TICKS_PER_DAY) + 1;
  }

  get hour(): number {
    return this.tick % TICKS_PER_DAY;
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

  giverById(id: string): QuestGiver | undefined {
    return this.town.givers.find((g) => g.id === id);
  }

  /** Advances the world by one hour. */
  step(): void {
    this.tick += 1;
    this.postQuests();
    this.arrivals();
    for (const party of this.activeParties) this.updateParty(party);
    this.expireQuests();
  }

  // ---------------------------------------------------------------- quests

  private postQuests(): void {
    for (const giver of this.town.givers) {
      if (giver.cooldown > 0) {
        giver.cooldown -= 1;
        continue;
      }
      if (this.openQuests.length >= this.config.maxOpenQuests) continue;
      const level = this.pickQuestLevel(giver);
      const quest = generateQuest(this.rng, giver, level, PARTY_SIZE, this.tick);
      this.quests.push(quest);
      giver.questsPosted += 1;
      giver.cooldown = this.rng.int(6, 18);
      this.log(
        'quest',
        `${giver.name} posts a level ${quest.level} contract: "${quest.title}" [${difficultyCode(quest)}] for ${quest.reward} gp.`,
      );
    }
  }

  /** Quest levels follow the adventurers in town, with a little stretch as a giver's reputation grows. */
  private pickQuestLevel(giver: QuestGiver): number {
    const levels = this.activeParties.map(partyLevel);
    const ceiling = Math.max(1, ...levels) + (giver.reputation >= 3 ? 1 : 0);
    if (levels.length > 0 && this.rng.chance(0.7)) return this.rng.pick(levels);
    return this.rng.int(1, ceiling);
  }

  private expireQuests(): void {
    const ttl = TICKS_PER_DAY * 4;
    for (const q of this.quests) {
      if (q.status === 'open' && this.tick - q.postedAt > ttl) {
        q.status = 'failed';
        const g = this.giverById(q.giverId);
        this.log('quest', `Nobody took "${q.title}". ${g?.name ?? 'The client'} withdraws the contract.`);
      }
    }
    // Keep the ledger from growing forever.
    if (this.quests.length > 200) this.quests = this.quests.filter((q) => q.status === 'open' || q.status === 'taken');
  }

  // ---------------------------------------------------------------- arrivals

  private arrivals(): void {
    if (this.tick < this.nextArrival) return;
    this.nextArrival = this.tick + this.rng.int(Math.ceil(this.config.arrivalInterval / 2), this.config.arrivalInterval * 2);
    if (this.activeParties.length >= this.config.maxParties) return;

    // A stranded party that has waited too long attracts a small band of the same level.
    const stranded = this.activeParties.find((p) => p.status === 'idle' && !isFull(p) && p.idleTicks >= this.config.patienceTicks);
    if (stranded) {
      const missing = PARTY_SIZE - aliveMembers(stranded).length;
      const band = createParty(this.rng, partyLevel(stranded), this.rng.int(1, Math.max(1, missing)), this.tick);
      this.parties.push(band);
      this.stats.partiesArrived += 1;
      this.log('party', `${describeParty(band)} arrive at ${this.town.tavern}: survivors of another company, looking for work.`);
      return;
    }

    let level = 1;
    if (this.openQuests.length > 0 && this.rng.chance(0.3)) level = this.rng.pick(this.openQuests).level;
    const party = createParty(this.rng, level, PARTY_SIZE, this.tick);
    this.parties.push(party);
    this.stats.partiesArrived += 1;
    this.log(
      'party',
      `${describeParty(party)} arrive at ${this.town.tavern}: ${party.members.map(describeHero).join(', ')}.`,
    );
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
    const level = partyLevel(p);
    // Companies take work at their level or one below; nobody signs up to punch above their weight.
    const candidates = this.openQuests.filter((q) => q.level <= level && q.level >= level - 1);
    if (candidates.length === 0) return;
    // Prefer exact level matches; otherwise the best paid.
    candidates.sort((a, b) => Math.abs(a.level - level) - Math.abs(b.level - level) || b.reward - a.reward);
    const quest = candidates[0]!;
    quest.status = 'taken';
    quest.partyId = p.id;
    p.questId = quest.id;
    p.status = 'traveling';
    p.ticksLeft = this.config.travelTicks;
    p.idleTicks = 0;
    const giver = this.giverById(quest.giverId);
    this.log('quest', `${p.name} accept "${quest.title}" from ${giver?.name ?? 'an unknown client'} and set out for ${quest.place}.`);
  }

  /** Fill empty seats: temple first if the coin is there, then merge with another incomplete band. */
  private recruit(p: Party): void {
    for (const dead of deadMembers(p)) {
      const cost = resurrectionCost(dead.level);
      if (p.gold < cost) continue;
      p.gold -= cost;
      resurrectHero(dead);
      this.town.temple.resurrections += 1;
      this.town.temple.goldTaken += cost;
      this.stats.resurrections += 1;
      this.chronicleLog('temple', `${p.name} pay ${cost} gp at the ${this.town.temple.name}. ${describeHero(dead)} draws breath again.`);
    }
    if (isFull(p)) return;

    const level = partyLevel(p);
    const donor = this.activeParties.find(
      (o) => o !== p && o.status === 'idle' && !isFull(o) && partyLevel(o) === level,
    );
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
      // Anyone still dead after merging is mourned and left in the temple's records.
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

    const giver = this.giverById(quest.giverId);
    if (outcome.winner === 'party') {
      const share = Math.floor(outcome.xpEarned / Math.max(1, survivors.length));
      const levelUps: string[] = [];
      for (const h of survivors) {
        const before = h.level;
        if (gainXp(h, share) > 0) levelUps.push(`${h.name} reaches level ${h.level} (was ${before})`);
      }
      const losses = fallen.length > 0 ? ` Fallen: ${fallen.map((h) => h.name).join(', ')}.` : '';
      this.log(
        'combat',
        `${p.name}: ${summary} Victory in ${outcome.rounds} rounds, ${share} XP each.${losses}`,
        outcome.lines,
      );
      for (const h of fallen) this.chronicleLog('death', `${describeHero(h)} of ${p.name} dies at ${quest.place} (${describeEncounter(spec)}).`);
      for (const text of levelUps) this.chronicleLog('levelup', `${text}.`);

      p.progress += 1;
      if (p.progress < quest.encounters.length && this.shouldRetreat(p, fighters.length)) {
        quest.status = 'failed';
        this.stats.questsFailed += 1;
        if (giver) giver.questsFailed += 1;
        p.status = 'returning';
        p.ticksLeft = this.config.travelTicks;
        this.log('party', `${p.name} are too battered to go on. They abandon ${quest.place} and turn back.`);
        return;
      }
      if (p.progress >= quest.encounters.length) {
        quest.status = 'done';
        p.status = 'returning';
        p.ticksLeft = this.config.travelTicks;
        this.log('quest', `${p.name} have cleared ${quest.place} and head back to ${this.town.name}.`);
      } else {
        // A breather between fights: a short rest's worth of healing.
        for (const h of survivors) healHero(h, Math.ceil(h.maxHp * 0.5));
      }
      return;
    }

    if (outcome.winner === 'monsters') {
      quest.status = 'failed';
      this.stats.questsFailed += 1;
      if (giver) giver.questsFailed += 1;
      if (survivors.length === 0) {
        this.log('combat', `${p.name}: ${summary} Defeat. Nobody comes back from ${quest.place}.`, outcome.lines);
        for (const h of fallen) this.chronicleLog('death', `${describeHero(h)} of ${p.name} dies at ${quest.place} (${describeEncounter(spec)}).`);
        this.chronicleLog('death', `${p.name} are wiped out at ${quest.place}.`);
        p.status = 'disbanded';
        this.stats.partiesWiped += 1;
      } else {
        this.log(
          'combat',
          `${p.name}: ${summary} Defeat. ${survivors.map((h) => h.name).join(', ')} flee with the bodies of ${fallen.map((h) => h.name).join(', ')}.`,
          outcome.lines,
        );
        for (const h of fallen) this.chronicleLog('death', `${describeHero(h)} of ${p.name} dies at ${quest.place} (${describeEncounter(spec)}).`);
        p.status = 'returning';
        p.ticksLeft = this.config.travelTicks;
      }
      return;
    }

    if (outcome.winner === 'retreat') {
      quest.status = 'failed';
      this.stats.questsFailed += 1;
      if (giver) giver.questsFailed += 1;
      this.log(
        'combat',
        `${p.name}: ${summary} The line breaks. ${survivors.map((h) => h.name).join(', ')} ${survivors.length === 1 ? 'runs' : 'run'} for it, leaving ${fallen.map((h) => h.name).join(', ')} behind.`,
        outcome.lines,
      );
      for (const h of fallen) this.chronicleLog('death', `${describeHero(h)} of ${p.name} is left for dead at ${quest.place} (${describeEncounter(spec)}).`);
      p.status = 'returning';
      p.ticksLeft = this.config.travelTicks;
      return;
    }

    // Stalemate: the fight dragged on and the party pulls back.
    quest.status = 'failed';
    this.stats.questsFailed += 1;
    this.log('combat', `${p.name}: ${summary} Neither side can finish it; the party withdraws.`, outcome.lines);
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
    const giver = this.giverById(quest.giverId);
    p.questId = null;
    p.progress = 0;
    if (quest.status === 'done') {
      p.gold += quest.reward;
      p.questsDone += 1;
      this.stats.questsCompleted += 1;
      this.stats.goldPaid += quest.reward;
      if (giver) {
        giver.questsCompleted += 1;
        giver.reputation += 1;
      }
      this.log('reward', `${p.name} return to ${this.town.name}. ${giver?.name ?? 'The client'} pays ${quest.reward} gp. Purse: ${p.gold} gp.`);
    } else {
      p.questsFailed += 1;
      this.log('party', `${p.name} limp back to ${this.town.name} empty-handed.`);
    }
    const dead = deadMembers(p);
    if (dead.length > 0) {
      const bill = dead.map((h) => `${h.name}: ${resurrectionCost(h.level)} gp`).join(', ');
      this.log('temple', `${p.name} carry their dead to the ${this.town.temple.name}. The priests ask ${bill}. Purse: ${p.gold} gp.`);
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

export function formatTime(tick: number): string {
  const day = Math.floor(tick / TICKS_PER_DAY) + 1;
  const hour = tick % TICKS_PER_DAY;
  return `Day ${day}, ${String(hour).padStart(2, '0')}:00`;
}

export function heroStatusLine(h: Hero): string {
  return h.alive ? `${h.hp}/${h.maxHp} hp` : 'dead';
}
