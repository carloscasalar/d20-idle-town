import { describe, expect, it } from 'vitest';
import { createParty } from '../src/adventurers/party';
import { Rng } from '../src/core/rng';
import { DEFAULT_CONFIG, Game, validateGameConfig } from '../src/sim/game';
import { SERVICE_STEP_NAMES } from '../src/town/services';
import { STARTING_GOLD } from './helpers/supplied-config';

function document(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG)) as Record<string, unknown>;
}

describe('configured steps', () => {
  it('follows a service list that names armour ahead of potions', () => {
    const potionsFirst = shop(SERVICE_STEP_NAMES);
    const armourFirst = shop(['armour', ...SERVICE_STEP_NAMES.filter((name) => name !== 'armour')]);

    expect(potionsFirst.potions).toBeGreaterThan(0);
    expect(potionsFirst.members.every((hero) => hero.armorTier === 0)).toBe(true);
    expect(armourFirst.potions).toBe(0);
    expect(armourFirst.members.every((hero) => hero.armorTier === 1)).toBe(true);
  });

  it('rejects an unknown step name', () => {
    const value = document();
    (value.services as { steps: string[] }).steps = ['potions', 'shoe-shine'];
    const checked = validateGameConfig(value);
    expect(checked.ok).toBe(false);
    if (!checked.ok) expect(checked.errors).toContain('services.steps: unknown step "shoe-shine"');
  });

  it('rejects a holding that does not exist, a weight list of all zeroes, and an unknown kind', () => {
    const holdings = document();
    (holdings.town as { retiredHoldings: string[] }).retiredHoldings = ['castle'];
    const unknownHolding = validateGameConfig(holdings);
    expect(unknownHolding.ok).toBe(false);
    if (!unknownHolding.ok) expect(unknownHolding.errors).toContain('town.retiredHoldings: unknown holding "castle"');

    const weights = document();
    (weights.quests as { encounterCounts: { count: number; weight: number }[] }).encounterCounts = [{ count: 2, weight: 0 }];
    const zero = validateGameConfig(weights);
    expect(zero.ok).toBe(false);
    if (!zero.ok) expect(zero.errors).toContain('quests.encounterCounts: every weight is zero');

    const kinds = document();
    (kinds.kinds as Record<string, unknown>).survey = { renown: 1 };
    const unknownKind = validateGameConfig(kinds);
    expect(unknownKind.ok).toBe(false);
    if (!unknownKind.ok) expect(unknownKind.errors).toContain('kinds: unknown kind "survey"');
  });
});

function shop(steps: readonly string[]) {
  const company = createParty(new Rng(1), 1, 4, 0, STARTING_GOLD);
  company.gold = 100000;
  const game = Game.forTesting({
    roster: { maxCompanies: 0 },
    world: { maxOpenQuests: 0 },
    services: { steps },
  }, (scenario) => {
    scenario.parties = [company];
  });
  game.step();
  const viewed = game.view().parties[0]!;
  return { potions: viewed.potions, members: viewed.members };
}
