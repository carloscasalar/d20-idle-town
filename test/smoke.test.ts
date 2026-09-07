import { describe, expect, it } from 'vitest';
import { Game } from '../src/sim/game';
import { aliveMembers, partyLevel } from '../src/adventurers/party';

describe('simulation smoke run', () => {
  it('runs 400 ticks without throwing and completes quests', () => {
    const game = new Game({ seed: 42 });
    for (let i = 0; i < 400; i++) game.step();
    const combat = game.events.filter((e) => e.kind === 'combat');
    if (process.env.VERBOSE) {
      for (const e of game.events) console.log(`[${e.tick}] ${e.kind.padEnd(7)} ${e.text}`);
      console.log('--- first combat detail ---');
      console.log(combat[0]?.detail?.slice(0, 25).join('\n'));
      console.log('--- stats', JSON.stringify(game.stats));
      for (const p of game.activeParties)
        console.log(p.name, p.status, 'lvl', partyLevel(p), 'gold', p.gold, p.members.map((h) => `${h.name} ${h.heroClass}${h.level} ${h.alive ? h.hp + '/' + h.maxHp : 'DEAD'} k${h.kills}`).join(' | '));
    }
    expect(combat.length).toBeGreaterThan(5);
    expect(game.stats.questsCompleted).toBeGreaterThan(0);
    expect(game.activeParties.every((p) => aliveMembers(p).length > 0)).toBe(true);
  });

  it('is deterministic for a given seed', () => {
    const a = new Game({ seed: 7 });
    const b = new Game({ seed: 7 });
    for (let i = 0; i < 150; i++) {
      a.step();
      b.step();
    }
    expect(a.events.map((e) => e.text)).toEqual(b.events.map((e) => e.text));
  });
});
