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
});
