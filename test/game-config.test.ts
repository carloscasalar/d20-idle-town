import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, Game, resolveGameConfig, validateGameConfig } from '../src/sim/game';
import { LONG_SIMULATION_TIMEOUT_MS } from './helpers/simulation';

function document(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG)) as Record<string, unknown>;
}

describe('game configuration', () => {
  it('is plain data: a JSON round trip is the same configuration', () => {
    const parsed = document();
    expect(parsed).toEqual(DEFAULT_CONFIG);
    expect(JSON.stringify(parsed)).not.toContain('undefined');
  });

  it('keeps every other default when one field of one section is overridden', () => {
    const resolved = resolveGameConfig({ board: { travelTicks: 9 } });
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.config.board.travelTicks).toBe(9);
    expect(resolved.config.board.windfallDays).toBe(DEFAULT_CONFIG.board.windfallDays);
    expect(resolved.config.board.contractOpenTicks).toBe(DEFAULT_CONFIG.board.contractOpenTicks);
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
