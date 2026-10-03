import { describe, expect, it } from 'vitest';
import { DEFAULT_COMPANY_ROSTER_CONFIG } from '../src/adventurers/company-roster';
import { createParty } from '../src/adventurers/party';
import { Rng } from '../src/core/rng';
import type { Quest } from '../src/quests/quest';
import { configFieldPaths } from '../src/sim/config';
import { DEFAULT_CONFIG, Game, resolveGameConfig, validateGameConfig } from '../src/sim/game';
import { createLair, DEFAULT_LAIR_CONFIG } from '../src/town/lairs';
import { LONG_SIMULATION_TIMEOUT_MS } from './helpers/simulation';
import { STARTING_GOLD } from './helpers/supplied-config';

function document(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG)) as Record<string, unknown>;
}

describe('game configuration', () => {
  it('is plain data: a JSON round trip is the same configuration', () => {
    const parsed = document();
    const checked = validateGameConfig(parsed);
    expect(checked.ok).toBe(true);
    if (!checked.ok) return;
    expect(checked.config).toStrictEqual(DEFAULT_CONFIG);
  });

  it('keeps every other default when one field of one section is overridden', () => {
    const resolved = resolveGameConfig({ board: { travelTicks: 9 } });
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.config.board.travelTicks).toBe(9);
    expect(resolved.config.board.windfallDays).toBe(DEFAULT_CONFIG.board.windfallDays);
    expect(resolved.config.kinds.contract.openTicks).toBe(DEFAULT_CONFIG.kinds.contract.openTicks);
    expect(resolved.config.roster).toEqual(DEFAULT_CONFIG.roster);
    expect(resolved.config.world).toEqual(DEFAULT_CONFIG.world);
  });

  it('replaces an array or a range whole', () => {
    const resolved = resolveGameConfig({ board: { expiryCooldown: [1, 2] } });
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.config.board.expiryCooldown).toEqual([1, 2]);
    expect(resolved.config.board.failureCooldown).toEqual(DEFAULT_CONFIG.board.failureCooldown);
  });

  it('reports a missing section, a wrong type, a negative price, and an inverted range', () => {
    const missing = validateGameConfig({ seed: 1 });
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.errors).toContain('missing section board');

    const wrongType = document();
    wrongType.seed = 'later';
    const typed = validateGameConfig(wrongType);
    expect(typed.ok).toBe(false);
    if (!typed.ok) expect(typed.errors).toContain('seed: expected a number, got string');

    const priced = document();
    (priced.roster as { retirementPrice: number }).retirementPrice = -1;
    const price = validateGameConfig(priced);
    expect(price.ok).toBe(false);
    if (!price.ok) expect(price.errors).toContain('roster.retirementPrice: negative price');

    const ranged = document();
    (ranged.board as { expiryCooldown: number[] }).expiryCooldown = [10, 4];
    const range = validateGameConfig(ranged);
    expect(range.ok).toBe(false);
    if (!range.ok) expect(range.errors).toContain('board.expiryCooldown: minimum 10 exceeds maximum 4');
  });

  it('refuses a configuration the boundary rejects', () => {
    expect(() => new Game({ roster: { retirementPrice: -1 } })).toThrow(/roster\.retirementPrice: negative price/);
    expect(() => Game.forTesting({ board: { expiryCooldown: [9, 1] } }, () => {})).toThrow(/minimum 9 exceeds maximum 1/);
  });

  it('freezes every module default', () => {
    expect(Object.isFrozen(DEFAULT_CONFIG)).toBe(true);
    expect(Object.isFrozen(DEFAULT_CONFIG.board)).toBe(true);
    expect(Object.isFrozen(DEFAULT_CONFIG.roster)).toBe(true);
    expect(Object.isFrozen(DEFAULT_CONFIG.intel)).toBe(true);
    expect(Object.isFrozen(DEFAULT_CONFIG.world)).toBe(true);
    expect(Object.isFrozen(DEFAULT_CONFIG.board.expiryCooldown)).toBe(true);
  });

  it('rejects an unknown field, a fractional count, an empty weight list, and a section that is not an object', () => {
    const typo = document();
    (typo.board as Record<string, unknown>).travelTick = 4;
    const unknown = validateGameConfig(typo);
    expect(unknown.ok).toBe(false);
    if (!unknown.ok) expect(unknown.errors).toContain('unknown field board.travelTick');

    const fractional = document();
    (fractional.board as { travelTicks: number }).travelTicks = 1.5;
    const whole = validateGameConfig(fractional);
    expect(whole.ok).toBe(false);
    if (!whole.ok) expect(whole.errors).toContain('board.travelTicks: expected a whole number, got 1.5');

    const emptied = document();
    (emptied.quests as { encounterCounts: unknown[] }).encounterCounts = [];
    const weights = validateGameConfig(emptied);
    expect(weights.ok).toBe(false);
    if (!weights.ok) expect(weights.errors).toContain('quests.encounterCounts: empty weight list');

    const shaped = document();
    shaped.board = 'nope';
    const section = validateGameConfig(shaped);
    expect(section.ok).toBe(false);
    if (!section.ok) {
      expect(section.errors).toContain('board: expected an object, got string');
      expect(section.errors.join('\n')).not.toContain('missing section board');
    }
  });

  it('names every field of the default configuration, and no field the default does not have', () => {
    expect(configurationPaths(DEFAULT_CONFIG).sort()).toStrictEqual([...configFieldPaths()].sort());
  });

  it('waits longer for the next raid when the lair interval is longer', () => {
    const sooner = raidClock(DEFAULT_CONFIG.lairs.baseRaidInterval);
    const later = raidClock(400);
    sooner.step();
    later.step();
    expect(later.view().lairs[0]!.nextRaidIn).toBeGreaterThan(sooner.view().lairs[0]!.nextRaidIn);
  });

  it('meets a different fight when the encounter rounding changes', () => {
    const sharp = scaledFight(0);
    const biased = scaledFight(DEFAULT_CONFIG.encounters.scaleRoundingBias);
    sharp.step();
    biased.step();
    expect(biased.regressionState()).not.toBe(sharp.regressionState());
  });

  it('builds the same world from the parsed configuration, tick for tick, for 400 hours', () => {
    const fromDefault = new Game();
    const fromDocument = new Game(document());
    for (let hour = 0; hour < 400; hour++) {
      fromDefault.step();
      fromDocument.step();
      expect(fromDocument.regressionState()).toBe(fromDefault.regressionState());
    }
  }, LONG_SIMULATION_TIMEOUT_MS);
});

function configurationPaths(value: unknown, path = ''): string[] {
  if (!isRecord(value)) return [];
  return Object.entries(value).flatMap(([key, child]) => {
    const next = path ? `${path}.${key}` : key;
    return [next, ...nestedPaths(child, next)];
  });
}

function nestedPaths(value: unknown, path: string): string[] {
  if (isRecord(value)) return configurationPaths(value, path);
  return listItemPaths(value, path);
}

function listItemPaths(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const paths: string[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    for (const [key, child] of Object.entries(item)) {
      const next = `${path}[].${key}`;
      if (seen.has(next)) continue;
      seen.add(next);
      paths.push(next, ...nestedPaths(child, next));
    }
  }
  return paths;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function raidClock(baseRaidInterval: number): Game {
  return Game.forTesting({
    roster: { maxCompanies: 0 },
    world: { maxOpenQuests: 0 },
    lairs: { baseRaidInterval },
  }, (scenario) => {
    const lair = createLair(new Rng(1), 'goblins', 1, 0, DEFAULT_COMPANY_ROSTER_CONFIG.companySize, DEFAULT_LAIR_CONFIG);
    lair.raidCooldown = 1;
    scenario.lairs = [lair];
  });
}

function scaledFight(scaleRoundingBias: number): Game {
  const party = createParty(new Rng(3), 1, 5, 0, STARTING_GOLD);
  party.status = 'questing';
  party.questId = 'quest-scaled';
  const quest: Quest = {
    id: 'quest-scaled', kind: 'contract', title: 'Clear the mill', place: 'the Old Mill', giverId: 'employer-1', assetId: null, lairId: null,
    theme: 'goblins', level: 1, encounters: [
      { difficulty: 'easy', monsters: [{ name: 'Goblin Warrior', count: 3, xpEach: 50 }], totalXp: 150, tier: 'Low' },
    ],
    revealed: 1, countRevealed: true, reward: 40, itemReward: null, guildOnly: false, status: 'taken', partyId: party.id, postedAt: 0,
  };
  return Game.forTesting({
    seed: 3,
    roster: { maxCompanies: 0 },
    world: { maxOpenQuests: 0 },
    encounters: { scaleRoundingBias },
  }, (scenario) => {
    quest.giverId = scenario.town.employers[0]!.id;
    scenario.parties = [party];
    scenario.quests = [quest];
  });
}
