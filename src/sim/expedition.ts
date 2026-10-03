import { describeHero, gainXp, healHero, isBloodied, killHero, potionHeal, resurrectionCost, type Hero, type HeroEconomyConfig } from '../adventurers/hero';
import { aliveMembers, deadMembers, partyLevel, type Party } from '../adventurers/party';
import type { CombatOptions, CombatOutcome } from '../combat/battlecast';
import { freeze } from '../core/freeze';
import { listNames } from '../core/names';
import type { DeepReadonly } from '../core/readonly';
import type { Rng } from '../core/rng';
import { describeEncounter, scaleEncounter, type EncounterConfig, type EncounterSpec } from '../quests/encounters';
import { learnOnArrival, readTheRoad, type JobIntelConfig, type JobKnowledge } from '../quests/job-intel';
import { difficultyCode, type ReadonlyQuest } from '../quests/quest';
import { purse, treasury, type Coin } from '../town/coin';
import type { WorkProfile } from './work-kinds';
import { serviceOf, type Town } from '../town/town';

/** Recovery, rooms and the decision to turn back. Travel time is received from the Board. */
export interface ExpeditionConfig {
  restTicks: number;
  shortRestHealFraction: number;
  carousingShare: number;
  /** Least gold spent carousing when the company tells the tale. */
  carousingMinimum: number;
  carousingRenown: number;
  roomFeePerLevel: number;
  /** Turn back when this fraction of the original line, or fewer, are still up. 2 means half or fewer. */
  retreatAliveDivisor: number;
  retreatHpFraction: number;
}

export const DEFAULT_EXPEDITION_CONFIG: ExpeditionConfig = freeze({
  restTicks: 8,
  shortRestHealFraction: 0.5,
  carousingShare: 0.05,
  carousingMinimum: 10,
  carousingRenown: 1,
  roomFeePerLevel: 3,
  retreatAliveDivisor: 2,
  retreatHpFraction: 0.35,
});

export type CombatResolver = (heroes: Hero[], spec: DeepReadonly<EncounterSpec>, seed: number, options?: CombatOptions) => CombatOutcome;

export interface ExpeditionEvent {
  kind: 'party' | 'quest' | 'combat' | 'death' | 'levelup' | 'temple' | 'shop';
  text: string;
  detail?: string[];
  chronicle?: boolean;
}

/** Expedition statistics. Gold movements use `ExpeditionContext.coin`. */
export interface ExpeditionLedger {
  heroesDied: number;
  partiesWiped: number;
}

export interface ExpeditionContext {
  /** Required while traveling, questing or returning; resting has no contract. */
  quest?: ReadonlyQuest;
  town: Town;
  rng: Rng;
  ledger: ExpeditionLedger;
  coin: Coin;
  /** Kind profiles for this expedition. A missing kind is an error. */
  kinds: Readonly<Record<string, WorkProfile>>;
  /** Received from the Board. */
  travelTicks: number;
  config: ExpeditionConfig;
  /** Job intelligence, including the skill difficulty of reading the road. */
  intel: JobIntelConfig;
  encounters: EncounterConfig;
  /** Received from the company roster. */
  renownCap: number;
  /** Received from town services. */
  blessingHpPerLevel: number;
  /** Received from the company roster. Encounters were built for a company of this size. */
  companySize: number;
  heroes: HeroEconomyConfig;
  combat: CombatResolver;
  /** Roster-owned disbanding, called at the existing wipe point. */
  disband: (company: Party) => void;
  /** Publish immediately so observers see state at the point of the event. */
  report: (event: ExpeditionEvent) => void;
  /** The job's learning handle. Expedition asks; job intelligence decides what is revealed. */
  knowledge: (work: ReadonlyQuest) => JobKnowledge;
  settleQuest: (quest: ReadonlyQuest, party: Party, success: boolean) => void;
  leaveLoot: (quest: ReadonlyQuest, party: Party, fallen: Hero[]) => void;
}

/** Start the journey after the Board has linked work and company. */
export function startExpedition(company: Party, travelTicks: number): void {
  company.status = 'traveling';
  company.ticksLeft = travelTicks;
  company.idleTicks = 0;
}

/** Advance one non-idle company by one hour. The supplied quest must match its questId. */
export function advanceExpedition(p: Party, context: ExpeditionContext): void {
  switch (p.status) {
    case 'traveling':
      travel(p, currentQuest(p, context), context);
      return;
    case 'questing':
      resolveFight(p, currentQuest(p, context), context);
      return;
    case 'returning': {
      const quest = currentQuest(p, context);
      if (--p.ticksLeft > 0) return;
      arriveHome(p, quest, context);
      return;
    }
    case 'resting':
      if (--p.ticksLeft <= 0) {
        for (const h of aliveMembers(p)) healHero(h, h.maxHp);
        p.status = 'idle';
        p.idleTicks = 0;
      }
      return;
    case 'disbanded':
      return;
    case 'idle':
      throw new Error(`Cannot advance idle company ${p.name} as an expedition.`);
  }
}

function currentQuest(p: Party, context: ExpeditionContext): ReadonlyQuest {
  const { quest } = context;
  if (!quest || quest.id !== p.questId) throw new Error(`Missing contract for ${p.name} while ${p.status}.`);
  return quest;
}

function log(context: ExpeditionContext, kind: ExpeditionEvent['kind'], text: string, detail?: string[]): void {
  context.report({ kind, text, ...(detail ? { detail } : {}) });
}

function chronicleLog(context: ExpeditionContext, kind: ExpeditionEvent['kind'], text: string): void {
  context.report({ kind, text, chronicle: true });
}

function travel(p: Party, q: ReadonlyQuest, context: ExpeditionContext): void {
  readTheRoad(p, q, {
    rng: context.rng,
    skillDc: context.intel.skillDc,
    heroes: context.heroes,
    knowledge: context.knowledge(q),
    report: (text) => log(context, 'party', text),
  });
  if (--p.ticksLeft <= 0) {
    p.status = 'questing';
    p.progress = 0;
    const surprise = learnOnArrival(q, context.knowledge(q));
    log(context, 'party', `${p.name} reach ${q.place}${surprise ? ` and take stock: ${q.encounters.length} fights ahead [${difficultyCode(q)}]` : ''}.`);
  }
}

function resolveFight(p: Party, q: ReadonlyQuest, context: ExpeditionContext): void {
  const { town, rng, ledger, travelTicks, combat, settleQuest, leaveLoot } = context;
  const fighters = aliveMembers(p);
  const spec = scaleEncounter(q.encounters[p.progress]!, fighters.length, context.companySize, context.encounters);
  const n = p.progress + 1;
  const profile = fightProfile(q, context);
  const bossFight = profile.lastFightForbidsRetreat && p.progress === q.encounters.length - 1;
  const outcome = combat(fighters, spec, rng.seed(), {
    potions: p.potions,
    ...(p.blessed ? { blessingHp: context.blessingHpPerLevel * partyLevel(p) } : {}),
    noRetreat: bossFight,
    ...(profile.lairDepth ? { lairDepth: { index: p.progress, total: q.encounters.length } } : {}),
  });
  p.potions = Math.max(0, p.potions - outcome.potionsDrunk);

  for (const r of outcome.heroes) {
    const hero = p.members.find((h) => h.id === r.heroId)!;
    hero.kills += r.kills;
    if (r.alive) hero.hp = r.hp;
    else {
      killHero(hero);
      ledger.heroesDied += 1;
    }
  }
  const fallen = fighters.filter((h) => !h.alive);
  const survivors = aliveMembers(p);
  const ambushNote = outcome.ambush === 'monsters' ? ' Ambushed!' : outcome.ambush === 'party' ? ' They strike first.' : '';
  const summary = `Encounter ${n}/${q.encounters.length} (${spec.difficulty}): ${describeEncounter(spec)}.${ambushNote}`;
  const deathNotes = (verb = 'dies') => {
    if (fallen.length === 0) return;
    const plural = verb === 'dies' ? 'die' : 'are left for dead';
    const who = fallen.length === 1 ? `${describeHero(fallen[0]!)} of ${p.name} ${verb}` : `${listNames(fallen.map(describeHero))} of ${p.name} ${plural}`;
    chronicleLog(context, 'death', `${who} at ${q.place} (${describeEncounter(spec)}).`);
  };

  if (outcome.winner === 'party') {
    const share = Math.floor(outcome.xpEarned / Math.max(1, survivors.length));
    const levelled: Hero[] = [];
    for (const h of survivors) if (gainXp(h, share) > 0) levelled.push(h);
    const losses = fallen.length > 0 ? ` Fallen: ${fallen.map((h) => h.name).join(', ')}.` : '';
    log(context, 'combat', `${p.name}: ${summary} Victory in ${outcome.rounds} rounds, ${share} XP each.${losses}`, outcome.lines);
    deathNotes();
    if (levelled.length > 0) {
      const levels = new Set(levelled.map((h) => h.level));
      if (levelled.length === survivors.length && levels.size === 1) chronicleLog(context, 'levelup', `${p.name} reach level ${levelled[0]!.level}.`);
      else chronicleLog(context, 'levelup', `${listNames(levelled.map((h) => `${h.name} (${h.level})`))} of ${p.name} level up.`);
    }

    p.progress += 1;
    if (p.progress < q.encounters.length && shouldRetreat(p, fighters.length, context.config)) {
      log(context, 'party', `${p.name} are too battered to go on. They abandon ${q.place} and turn back.`);
      headHome(p, travelTicks);
      return;
    }
    if (p.progress >= q.encounters.length) {
      log(context, 'quest', `${p.name} have cleared ${q.place} and head back to ${town.name}.`);
      headHome(p, travelTicks);
    } else {
      shortRest(p, context);
    }
    return;
  }

  if (outcome.winner === 'monsters') {
    if (survivors.length === 0) {
      log(context, 'combat', `${p.name}: ${summary} Defeat. Nobody comes back from ${q.place}.`, outcome.lines);
      deathNotes();
      chronicleLog(context, 'death', `${p.name} are wiped out at ${q.place}.`);
      context.disband(p);
      ledger.partiesWiped += 1;
      leaveLoot(q, p, p.members);
      p.progress = 0;
      settleQuest(q, p, false);
    } else {
      log(context, 'combat', `${p.name}: ${summary} Defeat. ${listNames(survivors.map((h) => h.name))} flee with the bodies of ${listNames(fallen.map((h) => h.name))}.`, outcome.lines);
      deathNotes();
      headHome(p, travelTicks);
    }
    return;
  }

  if (outcome.winner === 'retreat') {
    log(context, 'combat', `${p.name}: ${summary} The line breaks. ${listNames(survivors.map((h) => h.name))} ${survivors.length === 1 ? 'runs' : 'run'} for it, leaving ${listNames(fallen.map((h) => h.name))} behind.`, outcome.lines);
    deathNotes('is left for dead');
    leaveLoot(q, p, fallen);
    headHome(p, travelTicks);
    return;
  }

  log(context, 'combat', `${p.name}: ${summary} Neither side can finish it; the party withdraws.`, outcome.lines);
  headHome(p, travelTicks);
}

/** Between encounters, heal living heroes, then give each still-Bloodied hero one potion if available. */
function shortRest(p: Party, context: ExpeditionContext): void {
  let drunk = 0;
  for (const h of aliveMembers(p)) {
    healHero(h, Math.ceil(h.maxHp * context.config.shortRestHealFraction));
    if (p.potions > 0 && isBloodied(h)) {
      p.potions -= 1;
      drunk += 1;
      healHero(h, potionHeal(h, context.heroes));
    }
  }
  if (drunk > 0) log(context, 'party', `${p.name} catch their breath. ${drunk} potion${drunk > 1 ? 's' : ''} drunk; ${p.potions} left.`);
}

function headHome(p: Party, travelTicks: number): void {
  p.status = 'returning';
  p.ticksLeft = travelTicks;
}

function arriveHome(p: Party, q: ReadonlyQuest, context: ExpeditionContext): void {
  const { town, coin, settleQuest } = context;
  const { restTicks } = context.config;
  const success = p.progress >= q.encounters.length && aliveMembers(p).length > 0;
  p.progress = 0;
  settleQuest(q, p, success);

  const dead = deadMembers(p);
  if (dead.length > 0) {
    const temple = serviceOf(town, 'temple');
    const bill = dead.map((h) => `${h.name}: ${resurrectionCost(h.level, context.heroes)} gp`).join(', ');
    log(context, 'temple', `${p.name} carry their dead to the ${temple.name}. The priests ask ${bill}. Purse: ${p.gold} gp.`);
  }

  p.blessed = false;
  const tavern = serviceOf(town, 'tavern');
  const fee = context.config.roomFeePerLevel * partyLevel(p) * aliveMembers(p).length;
  if (!tavern.ruined && p.gold >= fee) {
    coin.transfer(purse(p), treasury(tavern), fee, 'service');
    let line = `${p.name} take rooms at ${tavern.name} for ${fee} gp.`;
    if (success && dead.length === 0 && p.renown < context.renownCap) {
      const spree = Math.max(context.config.carousingMinimum, Math.floor(p.gold * context.config.carousingShare));
      if (p.gold - spree >= resurrectionCost(partyLevel(p), context.heroes)) {
        coin.transfer(purse(p), treasury(tavern), spree, 'service');
        p.renown = Math.min(context.renownCap, p.renown + context.config.carousingRenown);
        line += ` They drink ${spree} gp away telling the tale (renown ${p.renown}).`;
      }
    }
    log(context, 'shop', line);
  } else {
    log(context, 'party', `${p.name} cannot afford rooms and bed down in the stables.`);
  }
  p.status = 'resting';
  p.ticksLeft = restTicks;
}

function fightProfile(q: ReadonlyQuest, context: ExpeditionContext): WorkProfile {
  const profile = context.kinds[q.kind];
  if (!profile) throw new Error(`No profile for kind of work "${q.kind}".`);
  return profile;
}

function shouldRetreat(p: Party, startedWith: number, config: ExpeditionConfig): boolean {
  const alive = aliveMembers(p);
  if (alive.length <= startedWith / config.retreatAliveDivisor) return true;
  const hpFraction = alive.reduce((s, h) => s + h.hp / h.maxHp, 0) / alive.length;
  return hpFraction < config.retreatHpFraction;
}
