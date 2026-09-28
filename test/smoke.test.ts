import { describe, expect, it } from 'vitest';
import { Game } from '../src/sim/game';

describe('simulation smoke run', () => {
  it('runs 400 ticks without throwing and completes quests', () => {
    const game = new Game({ seed: 42 });
    for (let i = 0; i < 400; i++) game.step();
    const view = game.view();
    const combat = view.events.filter((event) => event.kind === 'combat');
    if (process.env.VERBOSE) {
      for (const event of view.events) console.log(`[${event.tick}] ${event.kind.padEnd(7)} ${event.text}`);
      console.log('--- first combat detail ---');
      console.log(combat[0]?.detail?.slice(0, 25).join('\n'));
      console.log('--- stats', JSON.stringify(view.stats));
      for (const party of view.parties)
        console.log(party.name, party.statusText, 'lvl', party.level, 'gold', party.gold, party.members.map((hero) => `${hero.name} ${hero.heroClass}${hero.level} ${hero.alive ? hero.hp + '/' + hero.maxHp : 'DEAD'} k${hero.kills}`).join(' | '));
    }
    expect(combat.length).toBeGreaterThan(5);
    expect(view.stats.questsCompleted).toBeGreaterThan(0);
    expect(view.parties.every((party) => party.members.some((hero) => hero.alive))).toBe(true);
  });

  it('is deterministic for a given seed', () => {
    const a = new Game({ seed: 7 });
    const b = new Game({ seed: 7 });
    for (let i = 0; i < 150; i++) {
      a.step();
      b.step();
    }
    expect(a.view().events.map((event) => event.text)).toEqual(b.view().events.map((event) => event.text));
  });

  it('keeps complete same-seed worlds identical when their steps are interleaved', () => {
    const a = new Game({ seed: 20260928 });
    const b = new Game({ seed: 20260928 });
    for (let i = 0; i < 120; i++) {
      a.step();
      b.step();
      expect(a.regressionState()).toBe(b.regressionState());
      b.step();
      a.step();
      expect(a.regressionState()).toBe(b.regressionState());
    }
  });

  it('allocates unique entity IDs and preserves world references', () => {
    const game = new Game({ seed: 20260928 });
    for (let i = 0; i < 120; i++) game.step();
    const { town, parties, quests, lairs, idSequences } = JSON.parse(game.regressionState()) as {
      town: { employers: { id: string; assets: { id: string; ownerId: string; questId: string | null }[] }[] };
      parties: { id: string; members: { id: string }[]; questId: string | null }[];
      quests: { id: string; giverId: string; assetId: string | null; lairId: string | null; partyId: string | null }[];
      lairs: { id: string; questId: string | null }[];
      idSequences: Record<string, number>;
    };
    const employers = town.employers;
    const assets = employers.flatMap((employer) => employer.assets);
    const heroes = parties.flatMap((party) => party.members);
    const ids = [
      ...employers.map((employer) => employer.id),
      ...assets.map((asset) => asset.id),
      ...parties.map((party) => party.id),
      ...heroes.map((hero) => hero.id),
      ...quests.map((quest) => quest.id),
      ...lairs.map((lair) => lair.id),
    ];
    expect(new Set(ids).size).toBe(ids.length);
    expect(Object.keys(idSequences).length).toBeGreaterThan(0);
    expect(Object.values(idSequences).every((count) => count > 0)).toBe(true);

    const employerIds = new Set(employers.map((employer) => employer.id));
    const assetIds = new Set(assets.map((asset) => asset.id));
    const partyIds = new Set(parties.map((party) => party.id));
    const questIds = new Set(quests.map((quest) => quest.id));
    const lairIds = new Set(lairs.map((lair) => lair.id));
    expect(assets.every((asset) => employerIds.has(asset.ownerId))).toBe(true);
    expect(assets.every((asset) => asset.questId === null || questIds.has(asset.questId))).toBe(true);
    expect(parties.every((party) => party.questId === null || questIds.has(party.questId))).toBe(true);
    expect(lairs.every((lair) => lair.questId === null || questIds.has(lair.questId))).toBe(true);
    expect(quests.every((quest) => employerIds.has(quest.giverId))).toBe(true);
    expect(quests.every((quest) => quest.assetId === null || assetIds.has(quest.assetId))).toBe(true);
    expect(quests.every((quest) => quest.lairId === null || lairIds.has(quest.lairId))).toBe(true);
    expect(quests.every((quest) => quest.partyId === null || partyIds.has(quest.partyId))).toBe(true);
  });
});
