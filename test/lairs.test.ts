import { describe, expect, it } from 'vitest';
import { createHero, rollSkill, skillBonus } from '../src/adventurers/hero';
import { rollClasses } from '../src/adventurers/party';
import { Rng } from '../src/core/rng';
import { generateAssault } from '../src/quests/quest';
import { createLair, pickBoss } from '../src/town/lairs';
import { generateTown, serviceOf } from '../src/town/town';
import { Game } from '../src/sim/game';

describe('lairs', () => {
  it('have a boss the theme can field and an assault that ends with it', () => {
    const rng = new Rng(11);
    const lair = createLair(rng, 'goblins', 6, 0);
    expect(pickBoss('goblins', 6).name).toBe(lair.boss);
    const town = generateTown(rng);
    const q = generateAssault(rng, lair, serviceOf(town, 'guild'), 4, 0);
    expect(q.kind).toBe('assault');
    expect(q.encounters.length).toBeGreaterThanOrEqual(4);
    expect(q.encounters.length).toBeLessThanOrEqual(7);
    expect(q.encounters[q.encounters.length - 1]!.monsters[0]!.name).toBe(lair.boss);
    expect(q.itemReward).not.toBeNull();
    expect(q.guildOnly).toBe(false);
  });

  it('every town starts with lairs and their raids reach the board', () => {
    const g = new Game({ seed: 5 });
    expect(g.lairs.length).toBeGreaterThanOrEqual(2);
    for (let i = 0; i < 300; i++) g.step();
    expect(g.stats.raids).toBeGreaterThan(0);
    expect(g.quests.some((q) => q.lairId !== null)).toBe(true);
  });
});

describe('skill checks', () => {
  it('bards persuade with advantage and rangers read the land', () => {
    const rng = new Rng(2);
    const bard = createHero(rng, 3, 'Bard');
    const fighter = createHero(rng, 3, 'Fighter');
    const ranger = createHero(rng, 3, 'Ranger');
    expect(skillBonus(bard, 'Persuasion')).toBeGreaterThan(skillBonus(fighter, 'Persuasion'));
    const talk = rollSkill(rng, [fighter, bard, ranger], 'Persuasion', 15)!;
    expect(talk.hero).toBe(bard);
    expect(talk.advantage).toBe(true);
    const tracks = rollSkill(rng, [fighter, bard, ranger], 'Survival', 15)!;
    expect(tracks.hero).toBe(ranger);
  });

  it('full companies cover the four roles', () => {
    const rng = new Rng(3);
    for (let i = 0; i < 20; i++) {
      const classes = rollClasses(rng, 4);
      expect(new Set(classes).size).toBe(4);
      expect(classes.some((c) => ['Cleric', 'Druid', 'Bard'].includes(c))).toBe(true);
    }
  });
});
