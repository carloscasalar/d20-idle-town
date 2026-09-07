import { calculateDifficulty, type MonsterData } from 'battlecast-engine';
import { heroName } from '../core/names';
import type { Rng } from '../core/rng';
import type { MagicItem } from '../items/items';
import { THEMES, themeMonsters, type ThemeId } from '../quests/themes';

/**
 * A lair is where the trouble comes from: a boss and its followers, sending
 * raids against the town's holdings until a company goes in and ends it.
 */
export interface Lair {
  id: string;
  name: string;
  place: string;
  theme: ThemeId;
  boss: string;
  level: number;
  /** Grows with every raid that goes unanswered; drives raid frequency. */
  strength: number;
  hoard: { gold: number; items: MagicItem[] };
  status: 'active' | 'cleared';
  raids: number;
  raidsWon: number;
  /** Ticks until the next raid. */
  raidCooldown: number;
  /** The standing contract to clear it, once posted. */
  questId: string | null;
  spawnedAt: number;
  clearedAt: number | null;
}

interface LairKind {
  names: string[];
  places: string[];
}

const LANDMARKS = ['Cragmaw', 'Thunder', 'Widow’s', 'Kell', 'Barrow', 'Ember', 'Frost', 'Hollow', 'Raven', 'Thistle'];

const KINDS: Record<ThemeId, LairKind> = {
  bandits: { names: ['the Undercity syndicate', 'the Black Coin brotherhood', 'the Hooded Court'], places: ['the sewers beneath the old quarter', 'the smugglers’ warren', 'the abandoned counting house'] },
  goblins: { names: ['{name} warcamp', 'the {name} goblin warren', 'the tribe of the Broken Fang'], places: ['{name} caves', 'the {name} warcamp', 'the burned fort at {name} Hill'] },
  undead: { names: ['the crypt of {person}', 'the barrow of the Pale King', 'the necropolis of {name}'], places: ['the sunken crypt at {name}', 'the {name} barrows', 'the black chapel'] },
  beasts: { names: ['the {name} pack', 'the beast warrens of {name}'], places: ['the {name} thicket', 'the deep dens under {name} Ridge'] },
  cultists: { names: ['the hidden temple of the Whispering Eye', 'the Circle of {person}', 'the cult of the Drowned Star'], places: ['the shrine beneath the {name} mill', 'the cellars of the {name} manor', 'the standing stones of {name}'] },
  monstrosities: { names: ['the den beneath {name}', 'the {name} labyrinth'], places: ['the sinkhole at {name}', 'the {name} labyrinth'] },
  giants: { names: ['the steading of {person}', 'the {name} giant hall'], places: ['{name} Peak', 'the giant steps above {name}'] },
  fiends: { names: ['the Hellgate of {name}', 'the pact circle of {person}'], places: ['the ashen crater at {name}', 'the sealed vault under {name} tower'] },
  elementals: { names: ['the rift at {name}', 'the forge of the {name} salamanders'], places: ['the elemental scar at {name}', 'the burning caves of {name}'] },
  sea: { names: ['the pirate haven of {name} Cove', 'the drowned court of {name}'], places: ['{name} Cove', 'the tide caves at {name}'] },
  fey: { names: ['the Court of Thorns', 'the hollow of {person}'], places: ['the faerie ring at {name}', 'the moonlit glade under {name}'] },
  dragons: { names: ['the lair of {dragon}', 'the roost of {dragon}'], places: ['the {name} caverns', 'the crater of {name}'] },
};

const DRAGON_NAMES = ['Vermithrax', 'Ashkarra', 'Nyrlaxeth', 'Old Greyscale', 'Karzûl the Patient', 'Ilthiriax', 'Morrgath'];

let lairCounter = 0;

function fill(rng: Rng, template: string): string {
  return template
    .replace('{name}', rng.pick(LANDMARKS))
    .replace('{person}', heroName(rng))
    .replace('{dragon}', rng.pick(DRAGON_NAMES));
}

/** The strongest monster of the theme that a party of four at this level could face alone in a "high" fight. */
export function pickBoss(theme: ThemeId, level: number): MonsterData {
  const roster = themeMonsters(theme);
  const cap = calculateDifficulty(4, level, 0).thresholds.high;
  const fits = roster.filter((m) => m.xp <= cap).sort((a, b) => b.xp - a.xp);
  return fits[0] ?? roster.sort((a, b) => a.xp - b.xp)[0]!;
}

export function createLair(rng: Rng, theme: ThemeId, level: number, tick: number): Lair {
  const kind = KINDS[theme];
  return {
    id: `lair-${++lairCounter}`,
    name: fill(rng, rng.pick(kind.names)),
    place: fill(rng, rng.pick(kind.places)),
    theme,
    boss: pickBoss(theme, level).name,
    level,
    strength: 1,
    hoard: { gold: 100 * level, items: [] },
    status: 'active',
    raids: 0,
    raidsWon: 0,
    raidCooldown: rng.int(24, 72),
    questId: null,
    spawnedAt: tick,
    clearedAt: null,
  };
}

/** Themes that make sense as a standing lair near a town. */
export const LAIR_THEMES: ThemeId[] = ['bandits', 'goblins', 'undead', 'cultists', 'giants', 'dragons', 'fiends', 'sea', 'fey', 'monstrosities'];

export const MAX_STRENGTH = 10;

/** Hours between raids: a fresh lair strikes every four days or so, a strong one every day and a half. */
export function raidInterval(l: Lair): number {
  return Math.max(36, 96 - Math.min(MAX_STRENGTH, l.strength) * 6);
}

export function describeLair(l: Lair): string {
  return `${l.name} (${THEMES[l.theme].label}, level ${l.level}, ${l.boss})`;
}
