import { DEFAULT_COMPANY_ROSTER_CONFIG, type CompanyRosterConfig } from '../adventurers/company-roster';
import { DEFAULT_HERO_ECONOMY, type HeroEconomyConfig } from '../adventurers/hero';
import { freeze } from '../core/freeze';
import { DEFAULT_COMBAT_CONFIG, type CombatConfig } from '../combat/battlecast';
import { DEFAULT_ENCOUNTER_CONFIG, type EncounterConfig } from '../quests/encounters';
import { DEFAULT_JOB_INTEL_CONFIG, type JobIntelConfig } from '../quests/job-intel';
import { DEFAULT_QUEST_CONFIG, type QuestConfig } from '../quests/quest';
import { DEFAULT_HOLDING_CONFIG, type HoldingConfig } from '../town/assets';
import { DEFAULT_ITEM_CONFIG, type ItemConfig } from '../items/items';
import { DEFAULT_LAIR_CONFIG, type LairConfig } from '../town/lairs';
import { DEFAULT_TOWN_SERVICE_CONFIG, type TownServiceConfig } from '../town/services';
import { DEFAULT_TOWN_CONFIG, type TownConfig } from '../town/town';
import { DEFAULT_BOARD_CONFIG, type BoardConfig } from './board';
import { DEFAULT_EXPEDITION_CONFIG, type ExpeditionConfig } from './expedition';
import { DEFAULT_WORLD_CONFIG, TICKS_PER_DAY, type WorldConfig } from './game-rules';

/**
 * One plain configuration. `seed` and the clock sit at the top. Every other
 * value lives in the section of the module that owns it. Shared values
 * (company size, renown cap, lair strength cap) have one home; Game passes
 * that value to the other modules.
 */
export interface GameConfig {
  seed: number;
  ticksPerDay: number;
  board: BoardConfig;
  roster: CompanyRosterConfig;
  intel: JobIntelConfig;
  expedition: ExpeditionConfig;
  services: TownServiceConfig;
  lairs: LairConfig;
  quests: QuestConfig;
  encounters: EncounterConfig;
  heroes: HeroEconomyConfig;
  town: TownConfig;
  holdings: HoldingConfig;
  items: ItemConfig;
  combat: CombatConfig;
  world: WorldConfig;
}

export const DEFAULT_CONFIG: GameConfig = freeze({
  seed: 20260907,
  ticksPerDay: TICKS_PER_DAY,
  board: DEFAULT_BOARD_CONFIG,
  roster: DEFAULT_COMPANY_ROSTER_CONFIG,
  intel: DEFAULT_JOB_INTEL_CONFIG,
  expedition: DEFAULT_EXPEDITION_CONFIG,
  services: DEFAULT_TOWN_SERVICE_CONFIG,
  lairs: DEFAULT_LAIR_CONFIG,
  quests: DEFAULT_QUEST_CONFIG,
  encounters: DEFAULT_ENCOUNTER_CONFIG,
  heroes: DEFAULT_HERO_ECONOMY,
  town: DEFAULT_TOWN_CONFIG,
  holdings: DEFAULT_HOLDING_CONFIG,
  items: DEFAULT_ITEM_CONFIG,
  combat: DEFAULT_COMBAT_CONFIG,
  world: DEFAULT_WORLD_CONFIG,
});

export { TICKS_PER_DAY };

/** Arrays, including `[min, max]` pairs, are replaced whole. Objects merge one level at a time. */
export type DeepPartial<T> = T extends readonly (infer Item)[]
  ? readonly Item[]
  : T extends object
    ? { [Key in keyof T]?: DeepPartial<T[Key]> }
    : T;

export type ConfigResult = { ok: true; config: GameConfig } | { ok: false; errors: string[] };

type Spec =
  | { kind: 'number'; min?: number; max?: number; price?: boolean }
  | { kind: 'range' }
  | { kind: 'boolean' }
  | { kind: 'enum'; values: readonly string[] }
  | { kind: 'strings' }
  | { kind: 'list'; item: Spec }
  | { kind: 'section'; fields: Record<string, Spec> };

const price = { kind: 'number' as const, min: 0, price: true };
const count = { kind: 'number' as const, min: 0 };
const chance = { kind: 'number' as const, min: 0, max: 1 };
const range = { kind: 'range' as const };
const flag = { kind: 'boolean' as const };
const difficulty = { kind: 'enum' as const, values: ['easy', 'intermediate', 'hard'] };
const pattern = { kind: 'enum' as const, values: ['solo', 'horde', 'leader', 'mixed'] };

const numberSection = (names: readonly string[], spec: Spec = count): Spec => ({
  kind: 'section',
  fields: Object.fromEntries(names.map((name) => [name, spec])),
});

const GAME_SPEC: Spec = {
  kind: 'section',
  fields: {
    seed: { kind: 'number' },
    ticksPerDay: { kind: 'number', min: 1 },
    board: numberSection([
      'windfallDays', 'lootingDays', 'bountyRenown', 'contractRenown', 'failureRenownLoss',
      'reputationGain', 'pruningThreshold', 'contractOpenTicks', 'travelTicks', 'lairStrengthGain',
    ], count),
    roster: numberSection([
      'maxCompanies', 'arrivalInterval', 'patienceTicks', 'disbandTicks', 'companySize', 'maxCompanySize',
      'renownCap', 'retirementLevel', 'strangerExtraMembers', 'recruitLevelTolerance', 'firstArrivalTick',
    ]),
    intel: numberSection(['skillDc', 'divinationReserveFactor', 'roundReserveFactor', 'maxRounds', 'revealedAtPosting']),
    expedition: numberSection([
      'restTicks', 'carousingRenown', 'retreatAliveDivisor',
    ]),
    services: numberSection(['duesPeriodDays']),
    lairs: numberSection(['strengthCap', 'initialStrength', 'minRaidInterval', 'baseRaidInterval', 'raidIntervalPerStrength']),
    heroes: numberSection(['maxArmorTier', 'potionHealMinimum', 'potionHealDivisor']),
    holdings: numberSection(['incomeSpreadMin', 'incomeSpreadSpan']),
    items: numberSection(['resaleDivisor'], { kind: 'number', min: 1 }),
    world: numberSection([
      'maxOpenQuests', 'postingThreshold', 'ruinDays', 'bountyLevelGap', 'idleLevelWeight', 'busyLevelWeight',
      'stretchReputation', 'idleStretchTicks', 'levelStretch', 'firstRefusalTicks', 'lairRespawnDays',
      'eventLogLimit', 'chronicleLimit',
    ]),
  },
};

function withFields(spec: Spec, fields: Record<string, Spec>): Spec {
  if (spec.kind !== 'section') return spec;
  return { kind: 'section', fields: { ...spec.fields, ...fields } };
}

const boardSpec = withFields(GAME_SPEC.kind === 'section' ? GAME_SPEC.fields.board! : GAME_SPEC, {
  difficultyScale: { kind: 'number', min: 0 },
  expiryCooldown: range,
  failureCooldown: range,
});

const rosterSpec = withFields(sectionField(GAME_SPEC, 'roster'), {
  retirementPrice: price,
  retirementCapitalShare: chance,
  arrivalQuestLevelChance: chance,
});

const intelSpec = withFields(sectionField(GAME_SPEC, 'intel'), {
  divinationCostPerLevel: price,
  roundCostPerLevel: price,
  assaultRevealsCount: flag,
});

const expeditionSpec = withFields(sectionField(GAME_SPEC, 'expedition'), {
  shortRestHealFraction: { kind: 'number', min: 0 },
  carousingShare: chance,
  carousingMinimum: price,
  roomFeePerLevel: price,
  retreatHpFraction: chance,
});

const servicesSpec = withFields(sectionField(GAME_SPEC, 'services'), {
  guildDuesPerLevel: price,
  blessingCostPerLevel: price,
  blessingHpPerLevel: count,
  blessingReserveFactor: { kind: 'number', min: 0 },
});

const lairsSpec = withFields(sectionField(GAME_SPEC, 'lairs'), {
  hoardGoldPerLevel: price,
  raidCooldown: range,
});

const heroesSpec = withFields(sectionField(GAME_SPEC, 'heroes'), {
  armorBase: price,
  armorPerLevel: price,
  armorTierFactor: { kind: 'number', min: 0 },
  resurrectionBase: price,
  resurrectionQuadratic: price,
  potionBase: price,
  potionPerLevel: price,
  startingGoldPerLevel: price,
  resurrectedHpFraction: chance,
  resurrectedHpMinimum: { kind: 'number', min: 1 },
});

const questsSpec: Spec = {
  kind: 'section',
  fields: {
    encounterCounts: { kind: 'list', item: { kind: 'section', fields: { count: { kind: 'number', min: 1 }, weight: count } } },
    difficultyWeights: { kind: 'list', item: { kind: 'section', fields: { difficulty, weight: count } } },
    difficultyPay: numberSection(['easy', 'intermediate', 'hard'], { kind: 'number', min: 0 }),
    ravagedPayFactor: { kind: 'number', min: 0 },
    incomeDays: count,
    levelPayFactor: count,
    rewardScale: { kind: 'number', min: 0 },
    minimumReward: price,
    treasuryShare: chance,
    relicHoldings: { kind: 'strings' },
    relicItemChance: chance,
    ordinaryItemChance: chance,
    nobleItemChance: chance,
    guildOnlyKinds: { kind: 'strings' },
    guildOnlyLevel: count,
    assaultEncounters: range,
    assaultDifficultyWeights: { kind: 'list', item: { kind: 'section', fields: { difficulty, weight: count } } },
    bountyPerLevel: price,
    bossLootLevelBonus: count,
    bossGuardCount: count,
  },
};

const encountersSpec: Spec = {
  kind: 'section',
  fields: {
    maxMonsters: { kind: 'number', min: 1 },
    compositionAttempts: { kind: 'number', min: 1 },
    minimumFallbackXp: count,
    patterns: { kind: 'list', item: { kind: 'section', fields: { item: pattern, weight: count } } },
    soloMinFactor: chance,
    hordeTargetDivisor: { kind: 'number', min: 1 },
    hordeMinimum: { kind: 'number', min: 1 },
    leaderMinFactor: chance,
    leaderMaxFactor: chance,
    mixedKinds: range,
    mixedShareDivisor: { kind: 'number', min: 1 },
    mixedGroupCap: { kind: 'number', min: 1 },
    scaleRoundingBias: count,
    easyBand: range,
  },
};

const townSpec: Spec = {
  kind: 'section',
  fields: {
    maxStock: count,
    restockTicks: numberSection(['enchanter', 'temple', 'smith'], { kind: 'number', min: 1 }),
    restockInitialDivisor: { kind: 'number', min: 1 },
    nobleCount: range,
    extraMerchants: range,
    extraFactions: range,
    nobleHoldings: range,
    otherHoldings: range,
    nobleTreasury: range,
    merchantTreasury: range,
    factionTreasury: range,
    templeTreasury: range,
    nobleGenerosityMin: { kind: 'number', min: 0 },
    nobleGenerositySpan: count,
    merchantGenerosityMin: { kind: 'number', min: 0 },
    merchantGenerositySpan: count,
    factionGenerosityMin: { kind: 'number', min: 0 },
    factionGenerositySpan: count,
    templeGenerosityMin: { kind: 'number', min: 0 },
    templeGenerositySpan: count,
    upkeepFactorMin: count,
    upkeepFactorSpan: count,
    initialCooldown: range,
    retiredUpkeepFactor: count,
    retiredGenerosity: { kind: 'number', min: 0 },
    retiredReputation: count,
    retiredCooldown: range,
    threatenedIncomeDivisor: { kind: 'number', min: 1 },
  },
};

const combatSpec: Spec = {
  kind: 'section',
  fields: {
    maxRounds: { kind: 'number', min: 1 },
    surpriseInitiativePenalty: count,
    ambushTacticChance: chance,
    monstersFirstChance: chance,
    lairDepthWatchfulness: count,
    partyAmbushFactor: chance,
    fleeCompanyDivisor: { kind: 'number', min: 1 },
    fleeMonsterHpFraction: chance,
    stealthGroupDivisor: { kind: 'number', min: 1 },
    stabilisedHp: { kind: 'number', min: 1 },
  },
};

const worldSpec = withFields(sectionField(GAME_SPEC, 'world'), {
  assaultAppetite: chance,
  stretchPostChance: chance,
  lairRespawnSameThemeChance: chance,
  postingCooldown: range,
  startingLairs: range,
  startingLairLevels: range,
  lairRespawnLevelGain: range,
});

const itemsSpec = withFields(sectionField(GAME_SPEC, 'items'), {
  stockRareChance: chance,
  lootRareBase: chance,
  lootRarePerLevel: chance,
  lootRareCap: chance,
});

const SPEC: Spec = {
  kind: 'section',
  fields: {
    seed: { kind: 'number' },
    ticksPerDay: { kind: 'number', min: 1 },
    board: boardSpec,
    roster: rosterSpec,
    intel: intelSpec,
    expedition: expeditionSpec,
    services: servicesSpec,
    lairs: lairsSpec,
    quests: questsSpec,
    encounters: encountersSpec,
    heroes: heroesSpec,
    town: townSpec,
    holdings: sectionField(GAME_SPEC, 'holdings'),
    items: itemsSpec,
    combat: combatSpec,
    world: worldSpec,
  },
};

function sectionField(spec: Spec, name: string): Spec {
  if (spec.kind !== 'section') throw new Error(`missing section ${name}`);
  const field = spec.fields[name];
  if (!field) throw new Error(`missing section ${name}`);
  return field;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Deep-merge a partial onto a base. Arrays and ranges replace the previous value whole. */
export function mergeConfig(base: unknown, override: unknown): unknown {
  if (override === undefined) return base;
  if (Array.isArray(override) || !isPlainObject(override) || !isPlainObject(base)) return override;
  const merged: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) continue;
    merged[key] = mergeConfig(base[key], value);
  }
  return merged;
}

/**
 * Check a complete configuration, such as the object a YAML loader would return.
 * A missing section, a wrong type, a negative price, or a range whose minimum
 * exceeds its maximum is reported in words. A valid value is returned as `GameConfig`.
 */
export function validateGameConfig(value: unknown): ConfigResult {
  const errors: string[] = [];
  check(value, SPEC, '', errors);
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, config: value as GameConfig };
}

/** Fill a deep partial from the defaults, then validate the result. */
export function resolveGameConfig(partial: unknown = {}): ConfigResult {
  if (partial === undefined) return validateGameConfig(DEFAULT_CONFIG);
  if (!isPlainObject(partial)) return { ok: false, errors: ['expected a configuration object'] };
  return validateGameConfig(mergeConfig(DEFAULT_CONFIG, partial));
}

function check(value: unknown, spec: Spec, path: string, errors: string[]): void {
  const place = path || 'configuration';
  if (spec.kind === 'section') {
    if (!isPlainObject(value)) {
      errors.push(path ? `missing section ${path}` : 'expected a configuration object');
      return;
    }
    for (const [key, field] of Object.entries(spec.fields)) {
      const next = path ? `${path}.${key}` : key;
      if (!(key in value) || value[key] === undefined) {
        errors.push(field.kind === 'section' ? `missing section ${next}` : `missing field ${next}`);
        continue;
      }
      check(value[key], field, next, errors);
    }
    return;
  }
  if (spec.kind === 'number') {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      errors.push(`${place}: expected a number, got ${seen(value)}`);
      return;
    }
    if (spec.price && value < 0) {
      errors.push(`${place}: negative price`);
      return;
    }
    if (spec.min !== undefined && value < spec.min) {
      errors.push(`${place}: expected a number >= ${spec.min}, got ${value}`);
    }
    if (spec.max !== undefined && value > spec.max) {
      errors.push(`${place}: expected a number <= ${spec.max}, got ${value}`);
    }
    return;
  }
  if (spec.kind === 'range') {
    if (!Array.isArray(value) || value.length !== 2 || typeof value[0] !== 'number' || typeof value[1] !== 'number' || !Number.isFinite(value[0]) || !Number.isFinite(value[1])) {
      errors.push(`${place}: expected a [min, max] pair of numbers`);
      return;
    }
    if (value[0] > value[1]) errors.push(`${place}: minimum ${value[0]} exceeds maximum ${value[1]}`);
    return;
  }
  if (spec.kind === 'boolean') {
    if (typeof value !== 'boolean') errors.push(`${place}: expected true or false, got ${seen(value)}`);
    return;
  }
  if (spec.kind === 'enum') {
    if (typeof value !== 'string' || !spec.values.includes(value)) {
      errors.push(`${place}: expected one of ${spec.values.join(', ')}, got ${seen(value)}`);
    }
    return;
  }
  if (spec.kind === 'strings') {
    if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
      errors.push(`${place}: expected a list of strings`);
    }
    return;
  }
  if (!Array.isArray(value)) {
    errors.push(`${place}: expected a list`);
    return;
  }
  value.forEach((item, index) => check(item, spec.item, `${place}[${index}]`, errors));
}

function seen(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'a list';
  return typeof value;
}
