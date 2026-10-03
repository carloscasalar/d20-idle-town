import { describe, expect, it } from 'vitest';
import { HERO_CLASS_NAMES } from 'battlecast-engine';
import { createHero, killHero, MAX_ARMOR_TIER, type Hero } from '../src/adventurers/hero';
import {
  buryDead,
  createParty,
  hasRoom,
  isFull,
  mergeParties,
  partyLevel,
  ROLES,
  rollClasses,
  type Party,
} from '../src/adventurers/party';
import { Rng } from '../src/core/rng';
import { instantiate, ITEM_CATALOGUE, type MagicItem } from '../src/items/items';
import type { Quest } from '../src/quests/quest';
import { Game, type GameConfig, type GameScenario } from '../src/sim/game';
import { serviceOf, type Employer } from '../src/town/town';

const TICK = 100;
const DAY = Math.floor(TICK / 24) + 1;

function coversFourRoles(classes: readonly string[]): boolean {
  const used = classes.map(() => false);
  const assign = (role: number): boolean => {
    if (role === ROLES.length) return true;
    for (let index = 0; index < classes.length; index++) {
      if (used[index]) continue;
      if (!ROLES[role]!.some((heroClass) => heroClass === classes[index])) continue;
      used[index] = true;
      if (assign(role + 1)) return true;
      used[index] = false;
    }
    return false;
  };
  return classes.length === ROLES.length && assign(0);
}

function scene(configure: (scenario: GameScenario, rng: Rng) => void, config: Partial<GameConfig> = {}): Game {
  return Game.forTesting({ seed: 42, maxParties: 0, maxOpenQuests: 0, patienceTicks: 10_000, ...config }, (scenario) => {
    scenario.tick = TICK;
    scenario.parties = [];
    scenario.quests = [];
    scenario.lairs = [];
    scenario.events = [];
    scenario.chronicle = [];
    for (const [index, employer] of scenario.town.employers.entries()) {
      employer.name = `Employer ${index}`;
      employer.cooldown = 10_000;
      employer.restockIn = 10_000;
      employer.stock = [];
      employer.assets = [];
      employer.upkeepPerDay = 0;
      employer.treasury = 0;
      employer.favoredPartyId = null;
    }
    configure(scenario, new Rng(7));
  });
}

let nextCompany = 1;

/** A provisioned company whose hour will not be spent in a shop. */
function company(rng: Rng, level: number, living: string[], dead: string[] = []): Party {
  const party = createParty(rng, level, 1, TICK);
  party.id = `company-${nextCompany++}`;
  party.members = [...living, ...dead].map((name) => {
    const hero = createHero(rng, level, 'Fighter');
    hero.name = name;
    hero.armorTier = MAX_ARMOR_TIER;
    return hero;
  });
  for (const hero of party.members) if (dead.includes(hero.name)) killHero(hero);
  party.gold = 0;
  party.potions = 6;
  party.blessed = true;
  party.guildMember = true;
  party.duesPaidDay = DAY;
  return party;
}

function shown(game: Game, id: string) {
  const party = game.view().parties.find((candidate) => candidate.id === id);
  if (!party) throw new Error(`company ${id} is not in town`);
  return party;
}

function namesOf(game: Game, id: string): string[] {
  return shown(game, id).members.map((member) => member.name);
}

interface Snapshot {
  parties: { id: string; status: string; members: { name: string; alive: boolean }[] }[];
  town: { employers: { name: string; title: string; favoredPartyId: string | null; assets: { name: string }[] }[] };
}

function snapshot(game: Game): Snapshot {
  return JSON.parse(game.regressionState()) as Snapshot;
}

function openContract(employerId: string, level: number): Quest {
  return {
    id: 'open-contract', kind: 'contract', title: 'Open contract', place: 'Holding', giverId: employerId,
    assetId: null, lairId: null, theme: 'goblins', level,
    encounters: [], revealed: 0, countRevealed: false, reward: 40, itemReward: null,
    guildOnly: false, status: 'open', partyId: null, postedAt: 0,
  };
}

function takenContract(id: string, employerId: string): Quest {
  return {
    ...openContract(employerId, 1),
    id,
    status: 'taken',
    revealed: 1,
    countRevealed: true,
    encounters: [{ difficulty: 'easy', monsters: [{ name: 'Goblin Warrior', count: 1, xpEach: 50 }], totalXp: 50, tier: 'Low' }],
  };
}

function sword(rng: Rng): MagicItem {
  const template = ITEM_CATALOGUE.find((item) => item.name === 'Longsword +1');
  if (!template) throw new Error('catalogue has no Longsword +1');
  return instantiate(rng, template);
}

function hoursUntilNextArrival(seed: number, arrivalInterval: number): number {
  const game = scene((scenario) => { scenario.tick = 0; }, {
    seed, arrivalInterval, maxParties: 6, patienceTicks: 10_000,
  });
  let steps = 0;
  while (game.view().stats.partiesArrived < 1) {
    game.step();
    steps += 1;
    if (steps > 3) throw new Error(`seed ${seed}: the first company never arrived`);
  }
  const first = steps;
  while (game.view().stats.partiesArrived < 2) {
    game.step();
    steps += 1;
    if (steps - first > 20) throw new Error(`seed ${seed}: the second company never arrived`);
  }
  return steps - first;
}

describe('companies arriving', () => {
  it('the first company arrives in the first hour', () => {
    const game = scene((scenario) => { scenario.tick = 0; }, { maxParties: 4 });
    expect(game.view().parties).toHaveLength(0);
    game.step();
    expect(game.view().time).toBe('Day 1, 01:00');
    expect(game.view().stats.partiesArrived).toBe(1);
    expect(game.view().parties).toHaveLength(1);
  });

  it('an arrival interval of 2 hours waits 1 to 4 hours, and both ends occur', () => {
    const waits = new Set<number>();
    for (let seed = 1; seed <= 40; seed++) {
      const wait = hoursUntilNextArrival(seed, 2);
      expect(wait, `seed ${seed}`).toBeGreaterThanOrEqual(1);
      expect(wait, `seed ${seed}`).toBeLessThanOrEqual(4);
      waits.add(wait);
    }
    expect(waits.has(1)).toBe(true);
    expect(waits.has(4)).toBe(true);
  });

  it('an arrival interval of 3 hours waits 2 to 6 hours, and both ends occur', () => {
    const waits = new Set<number>();
    for (let seed = 1; seed <= 40; seed++) {
      const wait = hoursUntilNextArrival(seed, 3);
      expect(wait, `seed ${seed}`).toBeGreaterThanOrEqual(2);
      expect(wait, `seed ${seed}`).toBeLessThanOrEqual(6);
      waits.add(wait);
    }
    expect(waits.has(2)).toBe(true);
    expect(waits.has(6)).toBe(true);
  });

  it('a town that already holds its companies admits nobody', () => {
    const game = scene((scenario, rng) => {
      scenario.parties = [company(rng, 1, ['A', 'B', 'C', 'D']), company(rng, 1, ['E', 'F', 'G', 'H'])];
    }, { maxParties: 2 });
    game.step();
    expect(game.view().stats.partiesArrived).toBe(0);
    expect(game.view().parties).toHaveLength(2);
  });

  it('a disbanded company does not take a place', () => {
    const game = scene((scenario, rng) => {
      const gone = company(rng, 1, ['A', 'B', 'C', 'D']);
      gone.status = 'disbanded';
      scenario.parties = [gone];
    }, { maxParties: 1 });
    game.step();
    expect(game.view().stats.partiesArrived).toBe(1);
    expect(game.view().parties).toHaveLength(1);
    expect(game.view().parties[0]!.members).toHaveLength(4);
  });

  it('a full town spends the arrival, so an empty place is not filled until that wait is up', () => {
    const waits = new Set<number>();
    for (let seed = 1; seed <= 40; seed++) {
      let broken!: Party;
      const game = scene((scenario, rng) => {
        broken = company(rng, 3, ['Ada']);
        broken.idleTicks = 71;
        scenario.parties = [broken, company(rng, 3, ['H1', 'H2', 'H3', 'H4'])];
      }, { seed, maxParties: 2, arrivalInterval: 2 });
      game.step();
      expect(game.view().stats.partiesArrived, `seed ${seed}`).toBe(0);
      expect(game.view().parties, `seed ${seed}`).toHaveLength(1);
      let wait = 0;
      while (game.view().stats.partiesArrived === 0) {
        game.step();
        wait += 1;
        if (wait > 8) throw new Error(`seed ${seed}: no company arrived after a place opened`);
      }
      expect(wait, `seed ${seed}`).toBeGreaterThanOrEqual(1);
      expect(wait, `seed ${seed}`).toBeLessThanOrEqual(4);
      waits.add(wait);
    }
    expect(waits.has(1)).toBe(true);
    expect(waits.has(4)).toBe(true);
  });
});

describe('who arrives', () => {
  it.each([5, 6])('a band of %i has its requested size, with four roles followed by random classes', (size) => {
    const extraClasses = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      const party = createParty(new Rng(seed), 4, size, 17);
      expect(party.members, `seed ${seed}`).toHaveLength(size);
      expect(party.members.every((hero) => hero.level === 4)).toBe(true);
      expect(coversFourRoles(party.members.slice(0, 4).map((hero) => hero.heroClass))).toBe(true);
      for (const hero of party.members.slice(4)) {
        expect(HERO_CLASS_NAMES).toContain(hero.heroClass);
        extraClasses.add(hero.heroClass);
      }
    }
    expect(extraClasses.size).toBeGreaterThan(1);
  });

  it.each([1, 2, 3, 4])('a company asked for %i adventurers has that many, at the level asked', (size) => {
    const party = createParty(new Rng(size), 4, size, 17);
    expect(party.members).toHaveLength(size);
    expect(party.members.map((hero) => hero.level)).toEqual(Array.from({ length: size }, () => 4));
  });

  it('a level-4 company starts with 80 gp', () => {
    expect(createParty(new Rng(4), 4, 4, 0).gold).toBe(80);
  });

  it('a new company is idle, at the hour it arrived', () => {
    const party = createParty(new Rng(3), 2, 4, 17);
    expect(party).toMatchObject({ status: 'idle', idleTicks: 0, questId: null, arrivedAt: 17, potions: 0, renown: 0 });
  });

  it('a new company has paid no dues, is outside the guild and is unblessed', () => {
    const party = createParty(new Rng(3), 2, 4, 17);
    expect(party).toMatchObject({ duesPaidDay: -1, guildMember: false, blessed: false });
  });

  it('with no Contract open, the company that arrives is four adventurers of level 1', () => {
    const game = scene((scenario) => { scenario.tick = 0; }, { maxParties: 4 });
    game.step();
    const arrived = game.view().parties[0]!;
    expect(arrived.members.map((member) => member.level)).toEqual([1, 1, 1, 1]);
    expect(arrived.gold).toBe(20);
    expect(arrived.statusText).toBe('looking at the board');
  });

  it('a company of four covers the four roles', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const game = scene((scenario) => { scenario.tick = 0; }, { seed, maxParties: 4 });
      game.step();
      const classes = game.view().parties[0]!.members.map((member) => member.heroClass);
      expect(coversFourRoles(classes), `seed ${seed}: ${classes.join(', ')}`).toBe(true);
    }
  });

  it('a band of fewer than four is drawn from those roles, front line and arcane both occurring', () => {
    const known = new Set(ROLES.flat());
    let front = false;
    let arcane = false;
    for (let seed = 1; seed <= 40; seed++) {
      const [heroClass] = rollClasses(new Rng(seed), 1);
      expect(known.has(heroClass!), `seed ${seed}`).toBe(true);
      if (ROLES[0]!.includes(heroClass!)) front = true;
      if (ROLES[3]!.includes(heroClass!)) arcane = true;
    }
    expect(front).toBe(true);
    expect(arcane).toBe(true);
    expect(rollClasses(new Rng(1), 3)).toHaveLength(3);
  });

  it("when a Contract is open, an arrival is level 1 or that Contract's level, and both occur", () => {
    const levels = new Set<number>();
    for (let seed = 1; seed <= 40; seed++) {
      const game = scene((scenario) => {
        scenario.tick = 0;
        scenario.quests = [openContract(scenario.town.employers[0]!.id, 6)];
      }, { seed, maxParties: 4, maxOpenQuests: 1 });
      game.step();
      const arrived = game.view().parties[0]!;
      expect([1, 6], `seed ${seed}`).toContain(arrived.level);
      expect(arrived.members.map((member) => member.level)).toEqual([arrived.level, arrived.level, arrived.level, arrived.level]);
      levels.add(arrived.level);
    }
    expect(levels.has(1)).toBe(true);
    expect(levels.has(6)).toBe(true);
  });
});

describe('strangers for a company that has waited', () => {
  it('a short idle company that has waited out its patience draws a band of its level instead of a new company', () => {
    const sizes = new Set<number>();
    for (let seed = 1; seed <= 40; seed++) {
      const game = scene((scenario, rng) => {
        const waiting = company(rng, 4, ['Ada', 'Bev']);
        waiting.idleTicks = 12;
        scenario.parties = [waiting];
      }, { seed, maxParties: 4, patienceTicks: 12 });
      game.step();
      const arrivals = game.view().events.filter((event) => event.kind === 'party' && event.text.includes('arrive at'));
      expect(arrivals, `seed ${seed}`).toHaveLength(1);
      expect(arrivals[0]!.text).toContain('survivors of another company');
      const described = /lvl (\d+), (\d+) of 4 needed/.exec(arrivals[0]!.text);
      expect(described?.[1], `seed ${seed}`).toBe('4');
      const size = Number(described?.[2]);
      expect([2, 3], `seed ${seed}`).toContain(size);
      expect(game.view().stats.partiesArrived, `seed ${seed}`).toBe(1);
      expect(game.view().parties.every((party) => party.level === 4), `seed ${seed}`).toBe(true);
      sizes.add(size);
    }
    expect(sizes.has(2)).toBe(true);
    expect(sizes.has(3)).toBe(true);
  });

  it('a company one hour short of its patience gets an ordinary arrival', () => {
    let waiting!: Party;
    const game = scene((scenario, rng) => {
      waiting = company(rng, 4, ['Ada', 'Bev']);
      waiting.idleTicks = 11;
      scenario.parties = [waiting];
    }, { maxParties: 4, patienceTicks: 12 });
    game.step();
    const arrivals = game.view().events.filter((event) => event.kind === 'party' && event.text.includes('arrive at'));
    expect(arrivals).toHaveLength(1);
    expect(arrivals[0]!.text).not.toContain('survivors of another company');
    expect(namesOf(game, waiting.id)).toEqual(['Ada', 'Bev']);
    const arrived = game.view().parties.find((party) => party.id !== waiting.id)!;
    expect(arrived.members.map((member) => member.level)).toEqual([1, 1, 1, 1]);
  });

  it('a full company that has waited does not draw strangers', () => {
    const game = scene((scenario, rng) => {
      const waiting = company(rng, 4, ['A', 'B', 'C', 'D']);
      waiting.idleTicks = 40;
      scenario.parties = [waiting];
    }, { maxParties: 4, patienceTicks: 12 });
    game.step();
    expect(game.view().events.some((event) => event.text.includes('survivors of another company'))).toBe(false);
    expect(game.view().parties.map((party) => party.members.length)).toEqual([4, 4]);
  });

  it('a resting company that is short does not draw strangers', () => {
    let resting!: Party;
    const game = scene((scenario, rng) => {
      resting = company(rng, 4, ['Ada', 'Bev']);
      resting.status = 'resting';
      resting.ticksLeft = 6;
      resting.idleTicks = 40;
      scenario.parties = [resting];
    }, { maxParties: 4, patienceTicks: 12 });
    game.step();
    expect(game.view().events.some((event) => event.text.includes('survivors of another company'))).toBe(false);
    expect(namesOf(game, resting.id)).toEqual(['Ada', 'Bev']);
    expect(shown(game, resting.id).statusText).toBe('resting at the inn (5h)');
  });

  it('an earlier short company that has not waited is passed over', () => {
    let early!: Party;
    let waiting!: Party;
    const game = scene((scenario, rng) => {
      early = company(rng, 2, ['Ada', 'Bev']);
      early.idleTicks = 0;
      waiting = company(rng, 6, ['Cid', 'Dot']);
      waiting.idleTicks = 12;
      scenario.parties = [early, waiting];
    }, { maxParties: 4, patienceTicks: 12 });
    game.step();
    const arrivals = game.view().events.filter((event) => event.text.includes('survivors of another company'));
    expect(arrivals).toHaveLength(1);
    expect(arrivals[0]!.text).toContain('lvl 6');
    expect(namesOf(game, early.id)).toEqual(['Ada', 'Bev']);
  });

  it('a full town does not admit the strangers', () => {
    const game = scene((scenario, rng) => {
      const waiting = company(rng, 4, ['Ada', 'Bev']);
      waiting.idleTicks = 12;
      scenario.parties = [waiting];
    }, { maxParties: 1, patienceTicks: 12 });
    game.step();
    expect(game.view().stats.partiesArrived).toBe(0);
    expect(game.view().events.some((event) => event.text.includes('survivors of another company'))).toBe(false);
    expect(game.view().parties).toHaveLength(1);
  });
});

describe('raising the dead', () => {
  it('a ruined temple leaves the fallen dead and takes no payment', () => {
    let party!: Party;
    let temple!: Employer;
    let ada!: Hero;
    const game = scene((scenario, rng) => {
      temple = serviceOf(scenario.town, 'temple');
      temple.ruined = true;
      party = company(rng, 1, ['Bev', 'Cid', 'Dot'], ['Ada']);
      ada = party.members[3]!;
      party.gold = 190;
      scenario.parties = [party];
    });
    game.step();
    expect(shown(game, party.id).members.find((hero) => hero.name === 'Ada')!.alive).toBe(false);
    expect(ada.goldSpent).toBe(0);
    expect(shown(game, party.id).gold).toBe(190);
    expect(shown(game, party.id).spent).toBe(0);
    expect(temple.treasury).toBe(0);
    expect(game.view().stats).toMatchObject({ resurrections: 0, goldSpentByHeroes: 0 });
    expect(game.view().chronicle.filter((event) => event.kind === 'temple')).toEqual([]);
    expect(game.view().events.filter((event) => event.kind === 'temple')).toEqual([]);
  });

  it('pays for each fallen adventurer the purse can cover', () => {
    let temple!: Employer;
    let ada!: Hero;
    let bev!: Hero;
    const game = scene((scenario, rng) => {
      temple = serviceOf(scenario.town, 'temple');
      const party = company(rng, 1, ['Cid', 'Dot'], ['Ada', 'Bev']);
      ada = party.members[2]!;
      bev = party.members[3]!;
      party.gold = 380;
      scenario.parties = [party];
    });
    game.step();
    expect(ada.alive).toBe(true);
    expect(bev.alive).toBe(true);
    expect(ada.goldSpent).toBe(190);
    expect(bev.goldSpent).toBe(190);
    expect(temple.treasury).toBe(380);
    expect(game.view().stats).toMatchObject({ resurrections: 2, goldSpentByHeroes: 380 });
    expect(game.view().parties[0]!.gold).toBe(0);
  });

  it('reports the temple bill once', () => {
    let party!: Party;
    const game = scene((scenario, rng) => {
      party = company(rng, 1, ['Cid', 'Dot'], ['Ada', 'Bev']);
      party.gold = 380;
      scenario.parties = [party];
    });
    game.step();
    const bills = game.view().chronicle.filter((event) => event.kind === 'temple');
    expect(bills).toHaveLength(1);
    expect(bills[0]!.text).toContain('380 gp');
    expect(bills[0]!.text).toContain('Ada');
    expect(bills[0]!.text).toContain('Bev');
    expect(game.view().events.filter((event) => event.kind === 'temple')).toHaveLength(1);
  });

  it('reports a single raised adventurer drawing breath and their temple bill', () => {
    let party!: Party;
    let temple!: Employer;
    const game = scene((scenario, rng) => {
      temple = serviceOf(scenario.town, 'temple');
      party = company(rng, 1, ['Bev', 'Cid', 'Dot'], ['Ada']);
      party.gold = 190;
      scenario.parties = [party];
    });
    game.step();
    const bill = `${party.name} pay 190 gp at the ${temple.name}. Ada (Fighter 1) draws breath again.`;
    expect(game.view().chronicle.filter((event) => event.kind === 'temple').map((event) => event.text)).toEqual([bill]);
    expect(game.view().events.filter((event) => event.kind === 'temple').map((event) => event.text)).toEqual([bill]);
  });

  it('a company made full by the temple does not merge with an idle short company of the same level', () => {
    let raised!: Party;
    let short!: Party;
    const game = scene((scenario, rng) => {
      raised = company(rng, 1, ['Bev', 'Cid', 'Dot'], ['Ada']);
      raised.gold = 190;
      raised.renown = 5;
      short = company(rng, 1, ['Eve', 'Fay']);
      scenario.parties = [raised, short];
    });
    game.step();
    expect(game.view().stats.resurrections).toBe(1);
    expect(game.view().parties).toHaveLength(2);
    expect(namesOf(game, raised.id)).toEqual(['Bev', 'Cid', 'Dot', 'Ada']);
    expect(shown(game, raised.id).members.every((member) => member.alive)).toBe(true);
    expect(namesOf(game, short.id)).toEqual(['Eve', 'Fay']);
    expect(game.view().events.filter((event) => event.kind === 'party')).toEqual([]);
  });

  it('one gold short of a raising, the fallen stay dead', () => {
    let ada!: Hero;
    const game = scene((scenario, rng) => {
      const party = company(rng, 1, ['Bev', 'Cid', 'Dot'], ['Ada']);
      ada = party.members[3]!;
      party.gold = 189;
      scenario.parties = [party];
    });
    game.step();
    expect(ada.alive).toBe(false);
    expect(ada.goldSpent).toBe(0);
    expect(game.view().parties[0]!.gold).toBe(189);
    expect(game.view().stats.resurrections).toBe(0);
    expect(game.view().chronicle.filter((event) => event.kind === 'temple')).toHaveLength(0);
  });

  it('a fallen adventurer who costs more than the purse does not block a later raising', () => {
    let dear!: Hero;
    let cheap!: Hero;
    const game = scene((scenario, rng) => {
      const party = company(rng, 1, ['Cid', 'Dot'], ['Dear', 'Cheap']);
      dear = party.members[2]!;
      cheap = party.members[3]!;
      dear.level = 5;
      party.gold = 190;
      scenario.parties = [party];
    });
    game.step();
    expect(dear.alive).toBe(false);
    expect(dear.goldSpent).toBe(0);
    expect(cheap.alive).toBe(true);
    expect(cheap.goldSpent).toBe(190);
    expect(game.view().stats.resurrections).toBe(1);
  });
});

describe('incomplete companies of one level', () => {
  it('two idle companies of the same level become one, and the purses become one', () => {
    let host!: Party;
    let donor!: Party;
    const game = scene((scenario, rng) => {
      host = company(rng, 3, ['Ada', 'Bev']);
      host.gold = 40;
      host.renown = 2;
      donor = company(rng, 3, ['Cid', 'Dot']);
      donor.gold = 15;
      scenario.parties = [host, donor];
    });
    game.step();
    expect(game.view().parties).toHaveLength(1);
    expect(namesOf(game, host.id)).toEqual(['Ada', 'Bev', 'Cid', 'Dot']);
    expect(shown(game, host.id).gold).toBe(55);
    expect(snapshot(game).parties.find((party) => party.id === donor.id)?.status).toBe('disbanded');
  });

  it('a short company does not take in another level', () => {
    let first!: Party;
    let second!: Party;
    const game = scene((scenario, rng) => {
      first = company(rng, 3, ['Ada', 'Bev']);
      second = company(rng, 4, ['Cid', 'Dot']);
      scenario.parties = [first, second];
    });
    game.step();
    expect(namesOf(game, first.id)).toEqual(['Ada', 'Bev']);
    expect(namesOf(game, second.id)).toEqual(['Cid', 'Dot']);
  });

  it.each(['resting', 'traveling', 'returning'] as const)('a company that is %s is not taken in', (status) => {
    let idle!: Party;
    let other!: Party;
    const game = scene((scenario, rng) => {
      idle = company(rng, 3, ['Ada', 'Bev']);
      idle.renown = 5;
      other = company(rng, 3, ['Cid', 'Dot']);
      other.status = status;
      other.ticksLeft = 5;
      other.questId = status === 'resting' ? null : 'job';
      scenario.parties = [idle, other];
      if (status !== 'resting') scenario.quests = [takenContract('job', scenario.town.employers[0]!.id)];
    });
    game.step();
    expect(namesOf(game, idle.id)).toEqual(['Ada', 'Bev']);
    expect(namesOf(game, other.id)).toEqual(['Cid', 'Dot']);
  });

  it('a full company is not taken in before the wait is over', () => {
    let short!: Party;
    let full!: Party;
    const game = scene((scenario, rng) => {
      short = company(rng, 3, ['Ada', 'Bev']);
      full = company(rng, 3, ['H1', 'H2', 'H3', 'H4']);
      scenario.parties = [short, full];
    });
    game.step();
    expect(namesOf(game, short.id)).toEqual(['Ada', 'Bev']);
    expect(namesOf(game, full.id)).toEqual(['H1', 'H2', 'H3', 'H4']);
  });

  it('lays the host\'s dead to rest once the company is full, and says so', () => {
    let host!: Party;
    const game = scene((scenario, rng) => {
      host = company(rng, 3, ['Ada', 'Bev', 'Cid'], ['Dot']);
      host.renown = 2;
      scenario.parties = [host, company(rng, 3, ['Eve'])];
    });
    game.step();
    expect(namesOf(game, host.id)).toEqual(['Ada', 'Bev', 'Cid', 'Eve']);
    expect(shown(game, host.id).members.every((member) => member.alive)).toBe(true);
    expect(game.view().events.filter((event) => event.kind === 'death').map((event) => event.text)).toEqual([
      `${host.name} lay Dot to rest. They will not be coming back.`,
    ]);
  });

  it('leaves the donor\'s dead with the temple and disbands the donor when nobody stays behind', () => {
    let donor!: Party;
    const game = scene((scenario, rng) => {
      const host = company(rng, 3, ['Ada', 'Bev', 'Cid']);
      host.renown = 2;
      donor = company(rng, 3, ['Eve'], ['Dot']);
      scenario.parties = [host, donor];
    });
    game.step();
    expect(game.view().parties.find((party) => party.id === donor.id)).toBeUndefined();
    const saved = snapshot(game).parties.find((party) => party.id === donor.id)!;
    expect(saved.status).toBe('disbanded');
    expect(saved.members.map((member) => member.name)).toEqual([]);
    expect(game.view().events.filter((event) => event.kind === 'death').map((event) => event.text)).toEqual([
      `${donor.name} leave Dot in the temple's care for good.`,
    ]);
  });
});

describe('survivors signing on', () => {
  it('after 72 hours the survivors sign on with an idle company and give up waiting', () => {
    let broken!: Party;
    let host!: Party;
    const game = scene((scenario, rng) => {
      broken = company(rng, 5, ['Ada']);
      broken.idleTicks = 71;
      host = company(rng, 5, ['H1', 'H2', 'H3', 'H4']);
      scenario.parties = [broken, host];
    });
    game.step();
    expect(game.view().parties.find((party) => party.id === broken.id)).toBeUndefined();
    expect(namesOf(game, host.id)).toEqual(['H1', 'H2', 'H3', 'H4', 'Ada']);
    expect(game.view().events.some((event) => event.kind === 'party' && event.text.includes('give up waiting') && event.text.includes('Ada') && event.text.includes(host.name))).toBe(true);
  });

  it('at 71 hours the survivors keep their own company', () => {
    let broken!: Party;
    const game = scene((scenario, rng) => {
      broken = company(rng, 5, ['Ada']);
      broken.idleTicks = 70;
      scenario.parties = [broken, company(rng, 5, ['H1', 'H2', 'H3', 'H4'])];
    });
    game.step();
    expect(namesOf(game, broken.id)).toEqual(['Ada']);
    expect(shown(game, broken.id).statusText).toBe('waiting for recruits (71h)');
  });

  it('a resting company can take the survivors on', () => {
    let host!: Party;
    const game = scene((scenario, rng) => {
      const broken = company(rng, 5, ['Ada']);
      broken.idleTicks = 71;
      host = company(rng, 5, ['H1', 'H2', 'H3', 'H4']);
      host.status = 'resting';
      host.ticksLeft = 8;
      scenario.parties = [broken, host];
    });
    game.step();
    expect(namesOf(game, host.id)).toEqual(['H1', 'H2', 'H3', 'H4', 'Ada']);
    expect(shown(game, host.id).statusText).toBe('resting at the inn (7h)');
  });

  it.each(['traveling', 'returning', 'questing'] as const)('a company that is %s is not a host', (status) => {
    let broken!: Party;
    let host!: Party;
    const game = scene((scenario, rng) => {
      broken = company(rng, 3, ['Ada']);
      broken.idleTicks = 71;
      host = company(rng, 3, ['H1', 'H2', 'H3', 'H4']);
      host.status = status;
      host.ticksLeft = 5;
      host.questId = 'job';
      host.progress = 0;
      scenario.parties = [broken, host];
      scenario.quests = [takenContract('job', scenario.town.employers[0]!.id)];
    });
    game.step();
    expect(namesOf(game, broken.id)).toEqual(['Ada']);
    const hosts = game.view().parties.filter((party) => party.id !== broken.id);
    expect(hosts.every((party) => party.members.every((member) => member.name !== 'Ada'))).toBe(true);
    if (status !== 'questing') expect(namesOf(game, host.id)).toEqual(['H1', 'H2', 'H3', 'H4']);
  });

  it('the survivors join the closest level, ahead of a smaller company one level away', () => {
    let near!: Party;
    let away!: Party;
    const game = scene((scenario, rng) => {
      const broken = company(rng, 5, ['Ada']);
      broken.idleTicks = 71;
      away = company(rng, 6, ['A1', 'A2', 'A3', 'A4']);
      near = company(rng, 5, ['N1', 'N2', 'N3', 'N4', 'N5']);
      scenario.parties = [broken, away, near];
    });
    game.step();
    expect(namesOf(game, near.id)).toEqual(['N1', 'N2', 'N3', 'N4', 'N5', 'Ada']);
    expect(namesOf(game, away.id)).toEqual(['A1', 'A2', 'A3', 'A4']);
  });

  it('the survivors pass a nearest host of six and join the host with room one level away', () => {
    let broken!: Party;
    let near!: Party;
    let away!: Party;
    const game = scene((scenario, rng) => {
      broken = company(rng, 5, ['Ada', 'Bev']);
      broken.idleTicks = 71;
      near = company(rng, 5, ['N1', 'N2', 'N3', 'N4', 'N5', 'N6']);
      away = company(rng, 6, ['A1', 'A2', 'A3', 'A4']);
      scenario.parties = [broken, near, away];
    });
    game.step();
    expect(namesOf(game, near.id)).toEqual(['N1', 'N2', 'N3', 'N4', 'N5', 'N6']);
    expect(namesOf(game, away.id)).toEqual(['A1', 'A2', 'A3', 'A4', 'Ada', 'Bev']);
    expect(game.view().parties.find((party) => party.id === broken.id)).toBeUndefined();
  });

  it('among hosts of the same level, the survivors join the smallest', () => {
    let small!: Party;
    let large!: Party;
    const game = scene((scenario, rng) => {
      const broken = company(rng, 5, ['Ada']);
      broken.idleTicks = 71;
      large = company(rng, 5, ['L1', 'L2', 'L3', 'L4', 'L5']);
      small = company(rng, 5, ['S1', 'S2', 'S3', 'S4']);
      scenario.parties = [broken, large, small];
    });
    game.step();
    expect(namesOf(game, small.id)).toEqual(['S1', 'S2', 'S3', 'S4', 'Ada']);
    expect(namesOf(game, large.id)).toEqual(['L1', 'L2', 'L3', 'L4', 'L5']);
  });

  it('a company two levels away is not a host', () => {
    let broken!: Party;
    let host!: Party;
    const game = scene((scenario, rng) => {
      broken = company(rng, 5, ['Ada']);
      broken.idleTicks = 71;
      host = company(rng, 3, ['H1', 'H2', 'H3', 'H4']);
      scenario.parties = [broken, host];
    });
    game.step();
    expect(namesOf(game, broken.id)).toEqual(['Ada']);
    expect(namesOf(game, host.id)).toEqual(['H1', 'H2', 'H3', 'H4']);
  });

  it('a company one level away is a host', () => {
    let host!: Party;
    const game = scene((scenario, rng) => {
      const broken = company(rng, 5, ['Ada']);
      broken.idleTicks = 71;
      host = company(rng, 4, ['H1', 'H2', 'H3', 'H4']);
      scenario.parties = [broken, host];
    });
    game.step();
    expect(namesOf(game, host.id)).toEqual(['H1', 'H2', 'H3', 'H4', 'Ada']);
  });

  it('a host of six turns the survivors away and they stay behind', () => {
    let broken!: Party;
    let host!: Party;
    const game = scene((scenario, rng) => {
      broken = company(rng, 5, ['Ada', 'Bev']);
      broken.idleTicks = 71;
      host = company(rng, 5, ['H1', 'H2', 'H3', 'H4', 'H5', 'H6']);
      scenario.parties = [broken, host];
    });
    game.step();
    expect(namesOf(game, broken.id)).toEqual(['Ada', 'Bev']);
    expect(shown(game, broken.id).statusText).toBe('waiting for recruits (72h)');
    expect(namesOf(game, host.id)).toEqual(['H1', 'H2', 'H3', 'H4', 'H5', 'H6']);
  });

  it('a host of five takes one survivor and the other stays behind', () => {
    let broken!: Party;
    let host!: Party;
    const game = scene((scenario, rng) => {
      broken = company(rng, 4, ['Ada', 'Bev']);
      broken.idleTicks = 71;
      host = company(rng, 4, ['H1', 'H2', 'H3', 'H4', 'H5']);
      scenario.parties = [broken, host];
    });
    game.step();
    expect(namesOf(game, host.id)).toEqual(['H1', 'H2', 'H3', 'H4', 'H5', 'Ada']);
    expect(namesOf(game, broken.id)).toEqual(['Bev']);
    expect(snapshot(game).parties.find((party) => party.id === broken.id)?.status).toBe('idle');
    expect(game.view().events.filter((event) => event.kind === 'party').map((event) => event.text)).toEqual([
      `${host.name} take on Ada from ${broken.name}; Bev stay behind waiting for another band.`,
    ]);
  });

  it('when someone stays behind, the donor\'s dead are not buried', () => {
    let broken!: Party;
    const game = scene((scenario, rng) => {
      broken = company(rng, 4, ['Ada', 'Bev'], ['Dot']);
      broken.idleTicks = 71;
      scenario.parties = [broken, company(rng, 4, ['H1', 'H2', 'H3', 'H4', 'H5'])];
    });
    game.step();
    expect(shown(game, broken.id).members.filter((member) => !member.alive).map((member) => member.name)).toEqual(['Dot']);
    expect(game.view().events.filter((event) => event.kind === 'death')).toHaveLength(0);
  });

  it('a short company of the same level is taken in before the survivors sign on elsewhere', () => {
    let waiting!: Party;
    let other!: Party;
    let host!: Party;
    const game = scene((scenario, rng) => {
      waiting = company(rng, 3, ['Ada', 'Bev']);
      waiting.idleTicks = 71;
      waiting.renown = 5;
      other = company(rng, 3, ['Cid', 'Dot']);
      host = company(rng, 3, ['H1', 'H2', 'H3', 'H4']);
      scenario.parties = [waiting, other, host];
    });
    game.step();
    expect(namesOf(game, waiting.id)).toEqual(['Ada', 'Bev', 'Cid', 'Dot']);
    expect(namesOf(game, host.id)).toEqual(['H1', 'H2', 'H3', 'H4']);
    expect(snapshot(game).parties.find((party) => party.id === other.id)?.status).toBe('disbanded');
  });
});

describe('company level and capacity', () => {
  it('company level counts only the living', () => {
    const mixed = createParty(new Rng(1), 1, 3, 0);
    mixed.members[0]!.level = 1;
    mixed.members[1]!.level = 2;
    killHero(mixed.members[2]!);
    mixed.members[2]!.level = 9;
    expect(partyLevel(mixed)).toBe(2);
  });

  it('company level is 1 when nobody is alive', () => {
    const wiped = createParty(new Rng(2), 8, 2, 0);
    for (const hero of wiped.members) killHero(hero);
    expect(partyLevel(wiped)).toBe(1);
  });

  it('three level-1 adventurers and one level-2 adventurer make a level-1 company', () => {
    const party = createParty(new Rng(1), 1, 4, 0);
    party.members[3]!.level = 2;
    expect(partyLevel(party)).toBe(1);
  });

  it('four living adventurers are a full company, and the dead do not count', () => {
    const party = createParty(new Rng(3), 1, 4, 0);
    expect(isFull(party)).toBe(true);
    killHero(party.members[0]!);
    expect(isFull(party)).toBe(false);
    party.members.push(createHero(new Rng(4), 1, 'Fighter'));
    expect(isFull(party)).toBe(true);
  });

  it('a company has room until six living adventurers, and the dead do not count', () => {
    const rng = new Rng(5);
    const party = createParty(rng, 1, 4, 0);
    expect(hasRoom(party)).toBe(true);
    party.members.push(createHero(rng, 1, 'Fighter'));
    expect(aliveCount(party)).toBe(5);
    expect(hasRoom(party)).toBe(true);
    party.members.push(createHero(rng, 1, 'Fighter'));
    expect(hasRoom(party)).toBe(false);
    killHero(party.members[0]!);
    expect(aliveCount(party)).toBe(5);
    expect(hasRoom(party)).toBe(true);
  });
});

describe('merging and burying', () => {
  it('moves every survivor while the host has room for six', () => {
    const rng = new Rng(6);
    const host = createParty(rng, 2, 4, 0);
    const donor = createParty(rng, 2, 3, 0);
    const fallen = donor.members[2]!;
    killHero(fallen);
    const survivors = donor.members.filter((hero) => hero.alive);
    const leftover = mergeParties(host, donor, { goldPaid: 0, goldSpentByHeroes: 0 });
    expect(leftover).toEqual([]);
    expect(aliveCount(host)).toBe(6);
    expect(host.members).toEqual(expect.arrayContaining(survivors));
    expect(donor.members).toEqual([fallen]);
  });

  it('leaves the fallen with the donor', () => {
    const rng = new Rng(6);
    const host = createParty(rng, 2, 4, 0);
    const donor = createParty(rng, 2, 3, 0);
    const fallen = donor.members[2]!;
    killHero(fallen);
    mergeParties(host, donor, { goldPaid: 0, goldSpentByHeroes: 0 });
    expect(donor.members).toEqual([fallen]);
    expect(host.members).not.toContain(fallen);
  });

  it('brings the donor purse into the host purse', () => {
    const rng = new Rng(6);
    const host = createParty(rng, 2, 4, 0);
    const donor = createParty(rng, 2, 2, 0);
    host.gold = 10;
    donor.gold = 7;
    mergeParties(host, donor, { goldPaid: 0, goldSpentByHeroes: 0 });
    expect(host.gold).toBe(17);
    expect(donor.gold).toBe(0);
  });

  it('brings the donor potions into the host pack', () => {
    const rng = new Rng(6);
    const host = createParty(rng, 2, 4, 0);
    const donor = createParty(rng, 2, 2, 0);
    host.potions = 1;
    donor.potions = 3;
    mergeParties(host, donor, { goldPaid: 0, goldSpentByHeroes: 0 });
    expect(host.potions).toBe(4);
    expect(donor.potions).toBe(0);
  });

  it('brings the donor finds into the host stash', () => {
    const rng = new Rng(6);
    const host = createParty(rng, 2, 4, 0);
    const donor = createParty(rng, 2, 2, 0);
    const hostFind = sword(rng);
    const donorFind = sword(rng);
    host.stash = [hostFind];
    donor.stash = [donorFind];
    mergeParties(host, donor, { goldPaid: 0, goldSpentByHeroes: 0 });
    expect(host.stash).toEqual([hostFind, donorFind]);
    expect(donor.stash).toEqual([]);
  });

  it.each([
    { hostRenown: 2, donorRenown: 9 },
    { hostRenown: 9, donorRenown: 2 },
  ])('keeps the greater renown when the host has $hostRenown and the donor has $donorRenown', ({ hostRenown, donorRenown }) => {
    const rng = new Rng(6);
    const host = createParty(rng, 2, 4, 0);
    const donor = createParty(rng, 2, 2, 0);
    host.renown = hostRenown;
    donor.renown = donorRenown;
    mergeParties(host, donor, { goldPaid: 0, goldSpentByHeroes: 0 });
    expect(host.renown).toBe(9);
  });

  it('returns the living who do not fit, and not the dead', () => {
    const rng = new Rng(7);
    const host = createParty(rng, 2, 4, 0);
    host.members.push(createHero(rng, 2, 'Fighter'));
    const donor = createParty(rng, 2, 4, 0);
    const [first, second, third, fallen] = donor.members;
    killHero(fallen!);
    const leftover = mergeParties(host, donor, { goldPaid: 0, goldSpentByHeroes: 0 });
    expect(leftover).toEqual([second, third]);
    expect(aliveCount(host)).toBe(6);
    expect(host.members).toContain(first);
    expect(donor.members).toEqual([second, third, fallen]);
  });

  it('a host of six takes nobody', () => {
    const rng = new Rng(8);
    const host = createParty(rng, 2, 4, 0);
    host.members.push(createHero(rng, 2, 'Fighter'), createHero(rng, 2, 'Fighter'));
    const donor = createParty(rng, 2, 2, 0);
    const staying = [...donor.members];
    const leftover = mergeParties(host, donor, { goldPaid: 0, goldSpentByHeroes: 0 });
    expect(leftover).toEqual(staying);
    expect(aliveCount(host)).toBe(6);
    expect(donor.members).toEqual(staying);
  });

  it('returns the fallen and leaves the living', () => {
    const party = createParty(new Rng(9), 1, 4, 0);
    const [ada, bev, cid, dot] = party.members;
    killHero(bev!);
    killHero(dot!);
    expect(buryDead(party)).toEqual([bev, dot]);
    expect(party.members).toEqual([ada, cid]);
    expect(buryDead(party)).toEqual([]);
  });
});

describe('retirement', () => {
  it('equal-level veterans retire by experience, then by their order in the company', () => {
    let party!: Party;
    const game = scene((scenario, rng) => {
      party = company(rng, 8, ['Ada', 'Bev', 'Cid', 'Dot']);
      party.members[0]!.xp = 20_000;
      party.members[1]!.xp = 40_000;
      party.members[2]!.xp = 40_000;
      party.members[3]!.xp = 30_000;
      party.gold = 100_000;
      scenario.parties = [party];
    });
    game.step();
    expect(namesOf(game, party.id)).toEqual(['Ada', 'Cid', 'Dot']);
    expect(game.view().town.employers.find((employer) => employer.title === 'Retired adventurer')?.name).toBe('Bev');
    expect(game.view().stats.retirements).toBe(1);
  });

  it('the highest-level living veteran retires even when earlier members have more experience', () => {
    let party!: Party;
    const game = scene((scenario, rng) => {
      party = company(rng, 8, ['Ada', 'Bev', 'Cid', 'Dot'], ['Eve']);
      party.members[0]!.xp = 50_000;
      party.members[1]!.level = 10;
      party.members[2]!.level = 9;
      party.members[2]!.xp = 40_000;
      party.members[4]!.level = 12;
      party.gold = 100_000;
      scenario.parties = [party];
    });
    game.step();
    expect(namesOf(game, party.id)).toEqual(['Ada', 'Cid', 'Dot', 'Eve']);
    expect(game.view().town.employers.find((employer) => employer.title === 'Retired adventurer')?.name).toBe('Bev');
    expect(game.view().stats.retirements).toBe(1);
  });

  it('a company below level 8 does not retire', () => {
    let party!: Party;
    const game = scene((scenario, rng) => {
      party = company(rng, 7, ['Ada', 'Bev', 'Cid', 'Dot']);
      party.gold = 100_000;
      scenario.parties = [party];
    });
    game.step();
    expect(namesOf(game, party.id)).toEqual(['Ada', 'Bev', 'Cid', 'Dot']);
    expect(game.view().stats.retirements).toBe(0);
    expect(game.view().town.employers.some((employer) => employer.title === 'Retired adventurer')).toBe(false);
  });

  it('a fallen adventurer of level 8 does not retire', () => {
    let party!: Party;
    const game = scene((scenario, rng) => {
      party = company(rng, 3, ['Ada', 'Bev', 'Cid', 'Eve'], ['Dot']);
      party.members[4]!.level = 8;
      party.gold = 100_000;
      scenario.parties = [party];
    });
    game.step();
    expect(namesOf(game, party.id)).toEqual(['Ada', 'Bev', 'Cid', 'Eve', 'Dot']);
    expect(shown(game, party.id).members.find((member) => member.name === 'Dot')!.alive).toBe(false);
    expect(shown(game, party.id).gold).toBe(100_000);
    expect(game.view().stats.retirements).toBe(0);
  });

  it('a level-8 company one gold short of 27710 does not retire', () => {
    let party!: Party;
    const game = scene((scenario, rng) => {
      party = company(rng, 8, ['Ada', 'Bev', 'Cid', 'Dot']);
      party.gold = 27_709;
      scenario.parties = [party];
    });
    game.step();
    expect(namesOf(game, party.id)).toEqual(['Ada', 'Bev', 'Cid', 'Dot']);
    expect(shown(game, party.id).gold).toBe(27_709);
    expect(game.view().stats.retirements).toBe(0);
  });

  it('the veteran leaves their gear in the company stash', () => {
    let party!: Party;
    const game = scene((scenario, rng) => {
      party = company(rng, 8, ['Ada', 'Bev', 'Cid', 'Dot']);
      party.gold = 27_710;
      party.members[0]!.items = [sword(rng)];
      scenario.parties = [party];
    });
    game.step();
    expect(namesOf(game, party.id)).toEqual(['Bev', 'Cid', 'Dot']);
    expect(shown(game, party.id).stash).toEqual(['Longsword +1']);
  });

  it('buys a blessing before anyone retires', () => {
    let party!: Party;
    const game = scene((scenario, rng) => {
      party = company(rng, 8, ['Ada', 'Bev', 'Cid', 'Dot']);
      party.blessed = false;
      party.gold = 27_710;
      scenario.parties = [party];
    });
    game.step();
    expect(shown(game, party.id)).toMatchObject({ blessed: true, gold: 27_390 });
    expect(namesOf(game, party.id)).toEqual(['Ada', 'Bev', 'Cid', 'Dot']);
    expect(game.view().stats.retirements).toBe(0);
  });

  it('the veteran founds an employer with one Holding, and the old company has first refusal on its Contracts', () => {
    let veterans!: Party;
    let others!: Party;
    const game = scene((scenario, rng) => {
      veterans = company(rng, 8, ['Ada', 'Bev', 'Cid', 'Dot', 'Ian']);
      veterans.gold = 27_710;
      others = company(rng, 8, ['Eve', 'Fay', 'Gil', 'Hal']);
      others.gold = 0;
      others.renown = 5;
      scenario.parties = [veterans, others];
    }, { maxParties: 2, maxOpenQuests: 4 });
    game.step();
    const founded = snapshot(game).town.employers.find((employer) => employer.title === 'Retired adventurer');
    expect(founded?.favoredPartyId).toBe(veterans.id);
    expect(founded?.assets).toHaveLength(1);
    const employer = game.view().town.employers.find((candidate) => candidate.title === 'Retired adventurer')!;
    expect(employer.assets).toHaveLength(1);
    expect(employer.treasury).toBe(5_000);
    expect(shown(game, veterans.id).gold).toBe(2_710);
    expect(game.view().stats.retirements).toBe(1);
    expect(game.view().chronicle.filter((event) => event.kind === 'town').map((event) => event.text)).toEqual([
      `Ada (Fighter 8) retires from ${veterans.name}, buys ${employer.assets[0]!.name} for 25000 gp and settles in ${game.view().town.name}. Old friends will hear of any trouble first.`,
    ]);

    let firstContract: string | undefined;
    for (let hour = 0; hour < 16 && !firstContract; hour++) {
      game.step();
      const open = game.view().board.open;
      if (open.length === 0) continue;
      firstContract = open[0]!.id;
      expect(open).toHaveLength(1);
      expect(open[0]).toMatchObject({ giverName: 'Ada', level: 8, guildOnly: false });
      expect(game.view().board.taken).toHaveLength(0);
      expect(shown(game, others.id).statusText).toBe('looking at the board');
      expect(namesOf(game, veterans.id)).toEqual(['Bev', 'Cid', 'Dot', 'Ian']);
    }
    expect(firstContract).toBeDefined();
    for (let hour = 0; hour < 4 && game.view().board.taken.length === 0; hour++) {
      game.step();
      expect(shown(game, others.id).statusText).toBe('looking at the board');
    }
    expect(game.view().board.open).toHaveLength(0);
    expect(game.view().board.taken).toHaveLength(1);
    expect(game.view().board.taken[0]).toMatchObject({ id: firstContract, giverName: 'Ada', partyName: veterans.name });
    expect(snapshot(game).parties.find((party) => party.id === veterans.id)?.status).toBe('traveling');
    expect(shown(game, others.id).statusText).toBe('looking at the board');
  });
});

function aliveCount(party: Party): number {
  return party.members.filter((hero) => hero.alive).length;
}
