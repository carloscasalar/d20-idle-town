import { DEFAULT_COMPANY_ROSTER_CONFIG, type CompanyRosterConfig } from '../adventurers/company-roster';
import { DEFAULT_HERO_ECONOMY, type HeroEconomyConfig } from '../adventurers/hero';
import { freeze } from '../core/freeze';
import { DEFAULT_COMBAT_CONFIG, type CombatConfig } from '../combat/battlecast';
import { DEFAULT_ENCOUNTER_CONFIG, type EncounterConfig } from '../quests/encounters';
import { DEFAULT_JOB_INTEL_CONFIG, INTEL_STEP_NAMES, type JobIntelConfig } from '../quests/job-intel';
import { DEFAULT_QUEST_CONFIG, type QuestConfig } from '../quests/quest';
import { ASSET_KINDS, DEFAULT_HOLDING_CONFIG, type HoldingConfig } from '../town/assets';
import { DEFAULT_ITEM_CONFIG, type ItemConfig } from '../items/items';
import { DEFAULT_LAIR_CONFIG, type LairConfig } from '../town/lairs';
import { DEFAULT_TOWN_SERVICE_CONFIG, SERVICE_STEP_NAMES, type TownServiceConfig } from '../town/services';
import { DEFAULT_TOWN_CONFIG, EMPLOYER_KINDS, type TownConfig } from '../town/town';
import { DEFAULT_BOARD_CONFIG, type BoardConfig } from './board';
import { DEFAULT_EXPEDITION_CONFIG, type ExpeditionConfig } from './expedition';
import { DEFAULT_WORLD_CONFIG, TICKS_PER_DAY, type WorldConfig } from './game-rules';

/**
 * One plain configuration. `seed` sits at the top. Every other value lives in
 * the section of the module that owns it. A day is `TICKS_PER_DAY` hours, a
 * constant of the clock rather than a tunable. Shared values (company size,
 * renown cap, lair strength cap) have one home; Game passes that value to the
 * other modules.
 */
export interface GameConfig {
  seed: number;
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
  | { kind: 'number'; min?: number; max?: number; price?: boolean; integer?: boolean }
  | { kind: 'range'; integer?: boolean }
  | { kind: 'boolean' }
  | { kind: 'enum'; values: readonly string[] }
  | { kind: 'strings'; nonEmpty?: boolean }
  | { kind: 'list'; item: Spec; weights?: boolean }
  | { kind: 'section'; fields: Record<string, Spec> };

const price = { kind: 'number' as const, min: 0, price: true };
const count = { kind: 'number' as const, min: 0, integer: true };
const whole = (min: number): Spec => ({ kind: 'number', min, integer: true });
const fraction = { kind: 'number' as const, min: 0 };
const wholeRange = { kind: 'range' as const, integer: true };
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
    holdings: numberSection(['incomeSpreadMin', 'incomeSpreadSpan'], fraction),
    items: numberSection(['resaleDivisor'], whole(1)),
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
  expiryCooldown: wholeRange,
  failureCooldown: wholeRange,
});

const rosterSpec = withFields(sectionField(GAME_SPEC, 'roster'), {
  arrivalIntervalMinDivisor: whole(1),
  arrivalIntervalMaxFactor: whole(1),
  retirementPrice: price,
  retirementCapitalShare: chance,
  arrivalQuestLevelChance: chance,
});

const intelSpec = withFields(sectionField(GAME_SPEC, 'intel'), {
  divinationCostPerLevel: price,
  roundCostPerLevel: price,
  assaultRevealsCount: flag,
  steps: { kind: 'strings' },
});

const expeditionSpec = withFields(sectionField(GAME_SPEC, 'expedition'), {
  shortRestHealFraction: fraction,
  carousingShare: chance,
  carousingMinimum: price,
  roomFeePerLevel: price,
  retreatHpFraction: chance,
});

const servicesSpec = withFields(sectionField(GAME_SPEC, 'services'), {
  guildDuesPerLevel: price,
  blessingCostPerLevel: price,
  blessingHpPerLevel: count,
  blessingReserveFactor: fraction,
  steps: { kind: 'strings' },
});

const lairsSpec = withFields(sectionField(GAME_SPEC, 'lairs'), {
  hoardGoldPerLevel: price,
  raidCooldown: wholeRange,
});

const heroesSpec = withFields(sectionField(GAME_SPEC, 'heroes'), {
  armorBase: price,
  armorPerLevel: price,
  armorTierFactor: fraction,
  resurrectionBase: price,
  resurrectionQuadratic: price,
  potionBase: price,
  potionPerLevel: price,
  startingGoldPerLevel: price,
  resurrectedHpFraction: chance,
  resurrectedHpMinimum: whole(1),
  skillAdvantageTiebreak: count,
});

const questsSpec: Spec = {
  kind: 'section',
  fields: {
    encounterCounts: { kind: 'list', weights: true, item: { kind: 'section', fields: { count: whole(1), weight: count } } },
    difficultyWeights: { kind: 'list', weights: true, item: { kind: 'section', fields: { difficulty, weight: count } } },
    difficultyPay: numberSection(['easy', 'intermediate', 'hard'], fraction),
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
    assaultEncounters: wholeRange,
    assaultDifficultyWeights: { kind: 'list', weights: true, item: { kind: 'section', fields: { difficulty, weight: count } } },
    bountyPerLevel: price,
    bossLootLevelBonus: count,
    bossGuardCount: count,
  },
};

const encountersSpec: Spec = {
  kind: 'section',
  fields: {
    maxMonsters: whole(1),
    compositionAttempts: whole(1),
    minimumFallbackXp: count,
    patterns: { kind: 'list', weights: true, item: { kind: 'section', fields: { item: pattern, weight: count } } },
    soloMinFactor: chance,
    hordeTargetDivisor: whole(1),
    hordeMinimum: whole(1),
    leaderMinFactor: chance,
    leaderMaxFactor: chance,
    mixedKinds: wholeRange,
    mixedShareDivisor: whole(1),
    mixedGroupCap: whole(1),
    scaleRoundingBias: fraction,
    easyBand: range,
  },
};

const townSpec: Spec = {
  kind: 'section',
  fields: {
    maxStock: count,
    restockTicks: numberSection(['enchanter', 'temple', 'smith'], whole(1)),
    restockInitialDivisor: whole(1),
    nobleCount: wholeRange,
    extraMerchants: wholeRange,
    extraFactions: wholeRange,
    nobleHoldings: wholeRange,
    otherHoldings: wholeRange,
    nobleTreasury: range,
    merchantTreasury: range,
    factionTreasury: range,
    templeTreasury: range,
    nobleGenerosityMin: { kind: 'number', min: 0 },
    nobleGenerositySpan: fraction,
    merchantGenerosityMin: fraction,
    merchantGenerositySpan: fraction,
    factionGenerosityMin: fraction,
    factionGenerositySpan: fraction,
    templeGenerosityMin: fraction,
    templeGenerositySpan: fraction,
    upkeepFactorMin: fraction,
    upkeepFactorSpan: fraction,
    initialCooldown: wholeRange,
    retiredHoldings: { kind: 'strings', nonEmpty: true },
    retiredUpkeepFactor: fraction,
    retiredGenerosity: { kind: 'number', min: 0 },
    retiredReputation: count,
    retiredCooldown: wholeRange,
    threatenedIncomeDivisor: whole(1),
  },
};

const combatSpec: Spec = {
  kind: 'section',
  fields: {
    maxRounds: whole(1),
    surpriseInitiativePenalty: count,
    ambushTacticChance: chance,
    monstersFirstChance: chance,
    lairDepthWatchfulness: fraction,
    partyAmbushFactor: chance,
    fleeCompanyDivisor: whole(1),
    fleeMonsterHpFraction: chance,
    stealthGroupDivisor: whole(1),
    stabilisedHp: whole(1),
  },
};

const worldSpec = withFields(sectionField(GAME_SPEC, 'world'), {
  assaultAppetite: chance,
  stretchPostChance: chance,
  lairRespawnSameThemeChance: chance,
  postingCooldown: wholeRange,
  startingLairs: wholeRange,
  startingLairLevels: wholeRange,
  lairRespawnLevelGain: wholeRange,
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

/** Every field the validator knows, including fields inside a weighted list. */
export function configFieldPaths(): readonly string[] {
  return listFields(SPEC, '');
}

function listFields(spec: Spec, path: string): string[] {
  if (spec.kind === 'section') {
    return Object.entries(spec.fields).flatMap(([key, field]) => {
      const next = path ? `${path}.${key}` : key;
      const nested = field.kind === 'section' || field.kind === 'list' ? listFields(field, next) : [];
      return [next, ...nested];
    });
  }
  if (spec.kind === 'list') return listFields(spec.item, `${path}[]`);
  return [];
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
  if (errors.length === 0 && isPlainObject(value)) checkNames(value, errors);
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, config: value as GameConfig };
}

/** Names a configuration may use, each checked against the catalogue that defines it. */
const NAME_LISTS: readonly { path: string; label: string; allowed: readonly string[] }[] = [
  { path: 'town.retiredHoldings', label: 'holding', allowed: Object.keys(ASSET_KINDS) },
  { path: 'quests.relicHoldings', label: 'holding', allowed: Object.keys(ASSET_KINDS) },
  { path: 'quests.guildOnlyKinds', label: 'employer kind', allowed: EMPLOYER_KINDS },
  { path: 'services.steps', label: 'step', allowed: SERVICE_STEP_NAMES },
  { path: 'intel.steps', label: 'step', allowed: INTEL_STEP_NAMES },
];

function checkNames(value: Record<string, unknown>, errors: string[]): void {
  for (const list of NAME_LISTS) {
    const names = namesAt(value, list.path);
    if (!names) continue;
    for (const name of names) {
      if (!list.allowed.includes(name)) errors.push(`${list.path}: unknown ${list.label} "${name}"`);
    }
  }
}

function namesAt(value: Record<string, unknown>, path: string): readonly string[] | undefined {
  const found = path.split('.').reduce<unknown>((current, key) => (isPlainObject(current) ? current[key] : undefined), value);
  if (!Array.isArray(found) || found.some((item) => typeof item !== 'string')) return undefined;
  return found as string[];
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
      errors.push(path ? `${path}: expected an object, got ${seen(value)}` : 'expected a configuration object');
      return;
    }
    for (const key of Object.keys(value)) {
      if (!(key in spec.fields)) errors.push(`unknown field ${path ? `${path}.${key}` : key}`);
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
    if (spec.integer && !Number.isInteger(value)) {
      errors.push(`${place}: expected a whole number, got ${value}`);
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
    if (spec.integer && (!Number.isInteger(value[0]) || !Number.isInteger(value[1]))) {
      errors.push(`${place}: expected a [min, max] pair of whole numbers`);
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
      return;
    }
    if (spec.nonEmpty && value.length === 0) errors.push(`${place}: empty list`);
    return;
  }
  if (!Array.isArray(value)) {
    errors.push(`${place}: expected a list`);
    return;
  }
  if (spec.weights && value.length === 0) {
    errors.push(`${place}: empty weight list`);
    return;
  }
  value.forEach((item, index) => check(item, spec.item, `${place}[${index}]`, errors));
  if (spec.weights && value.length > 0 && value.every((item) => isPlainObject(item) && item.weight === 0)) {
    errors.push(`${place}: every weight is zero`);
  }
}

function seen(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'a list';
  return typeof value;
}
