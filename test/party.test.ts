import { describe, expect, it } from 'vitest';
import { createHero, gainXp, killHero, resurrectHero, resurrectionCost } from '../src/adventurers/hero';
import { aliveMembers, createParty, isFull, mergeParties, partyLevel } from '../src/adventurers/party';
import { Rng } from '../src/core/rng';

describe('hero progression', () => {
  it('levels up on the 5e thresholds and grows max hp', () => {
    const h = createHero(new Rng(1), 1, 'Fighter');
    expect(h.maxHp).toBe(12);
    expect(gainXp(h, 299)).toBe(0);
    expect(gainXp(h, 1)).toBe(1);
    expect(h.level).toBe(2);
    expect(h.maxHp).toBeGreaterThan(12);
    expect(h.hp).toBe(h.maxHp);
    expect(gainXp(h, 2400)).toBe(2); // 2700 total -> level 4
    expect(h.level).toBe(4);
  });

  it('dead heroes earn nothing and come back at half hp', () => {
    const h = createHero(new Rng(2), 3);
    killHero(h);
    expect(gainXp(h, 5000)).toBe(0);
    expect(h.alive).toBe(false);
    resurrectHero(h);
    expect(h.alive).toBe(true);
    expect(h.hp).toBe(Math.floor(h.maxHp / 2));
    expect(resurrectionCost(3)).toBeGreaterThan(resurrectionCost(1));
  });
});

describe('party merging', () => {
  it('takes every donor survivor while there is room for six', () => {
    const rng = new Rng(5);
    const host = createParty(rng, 3, 4, 0);
    const donor = createParty(rng, 3, 4, 0);
    killHero(host.members[0]!);
    killHero(host.members[1]!);
    killHero(donor.members[0]!);
    host.gold = 10;
    donor.gold = 5;
    const leftover = mergeParties(host, donor);
    expect(isFull(host)).toBe(true);
    expect(aliveMembers(host).length).toBe(5); // 2 + 3: room for six, so everyone comes along
    expect(leftover.length).toBe(0);
    expect(aliveMembers(donor).length).toBe(0);
    expect(host.gold).toBe(15);
    expect(partyLevel(host)).toBe(3);
  });
});

describe('bigger companies', () => {
  it('meet proportionally more monsters', async () => {
    const { scaleEncounter } = await import('../src/quests/encounters');
    const spec = { difficulty: 'intermediate' as const, monsters: [{ name: 'Goblin Warrior', count: 4, xpEach: 50 }, { name: 'Goblin Boss', count: 1, xpEach: 200 }], totalXp: 400, tier: 'Moderate' };
    const six = scaleEncounter(spec, 6);
    expect(six.monsters[0]!.count).toBe(6);
    expect(six.monsters[1]!.count).toBe(1);
    expect(six.totalXp).toBe(500);
    expect(scaleEncounter(spec, 4)).toBe(spec);
  });
});
