import { deityName, factionName, merchantName, nobleName, townName } from '../core/names';
import type { Rng } from '../core/rng';
import { THEME_IDS, type ThemeId } from '../quests/themes';

export type GiverKind = 'noble' | 'merchant' | 'faction';

export interface QuestGiver {
  id: string;
  name: string;
  kind: GiverKind;
  /** Flavour: "House Valmont", "Spice Merchant", ... */
  title: string;
  themes: ThemeId[];
  /** Reward multiplier. Nobles pay well, factions pay in favours. */
  wealth: number;
  /** Grows with completed quests; unlocks higher-level postings. */
  reputation: number;
  /** Ticks until this giver posts again. */
  cooldown: number;
  questsPosted: number;
  questsCompleted: number;
  questsFailed: number;
}

export interface Temple {
  name: string;
  deity: string;
  resurrections: number;
  goldTaken: number;
}

export interface Town {
  name: string;
  givers: QuestGiver[];
  temple: Temple;
  tavern: string;
}

const GIVER_THEMES: Record<GiverKind, ThemeId[]> = {
  noble: ['bandits', 'undead', 'giants', 'dragons', 'fiends', 'monstrosities'],
  merchant: ['bandits', 'goblins', 'beasts', 'monstrosities', 'elementals'],
  faction: ['cultists', 'undead', 'fiends', 'goblins', 'elementals', 'dragons', 'beasts'],
};

const TAVERNS = ['The Prancing Owlbear', 'The Rusty Flagon', 'The Drunken Dragon', 'The Last Ember', 'The Broken Lantern'];

let giverCounter = 0;

function pickThemes(rng: Rng, kind: GiverKind): ThemeId[] {
  const pool = rng.shuffle(GIVER_THEMES[kind]);
  const chosen = pool.slice(0, rng.int(2, 3));
  return chosen.length > 0 ? chosen : [rng.pick(THEME_IDS)];
}

function makeGiver(rng: Rng, kind: GiverKind): QuestGiver {
  let name: string;
  let title: string;
  let wealth: number;
  if (kind === 'noble') {
    name = nobleName(rng);
    title = `House ${name.split(' ').pop()}`;
    wealth = 1.3 + rng.next() * 0.5;
  } else if (kind === 'merchant') {
    const m = merchantName(rng);
    name = m.name;
    title = m.trade;
    wealth = 1.0 + rng.next() * 0.4;
  } else {
    name = factionName(rng);
    name = name.charAt(0).toUpperCase() + name.slice(1);
    title = 'Faction';
    wealth = 0.8 + rng.next() * 0.4;
  }
  return {
    id: `giver-${++giverCounter}`,
    name,
    kind,
    title,
    themes: pickThemes(rng, kind),
    wealth: Math.round(wealth * 100) / 100,
    reputation: 0,
    cooldown: rng.int(0, 6),
    questsPosted: 0,
    questsCompleted: 0,
    questsFailed: 0,
  };
}

export function generateTown(rng: Rng): Town {
  const givers: QuestGiver[] = [];
  const counts: Record<GiverKind, number> = { noble: rng.int(2, 3), merchant: rng.int(2, 3), faction: rng.int(2, 3) };
  for (const kind of ['noble', 'merchant', 'faction'] as GiverKind[]) {
    for (let i = 0; i < counts[kind]; i++) givers.push(makeGiver(rng, kind));
  }
  // Avoid two factions with the same name.
  const seen = new Set<string>();
  for (const g of givers) {
    while (seen.has(g.name)) g.name = g.kind === 'faction' ? factionName(rng) : nobleName(rng);
    seen.add(g.name);
  }
  const deity = deityName(rng);
  return {
    name: townName(rng),
    givers,
    temple: { name: `Temple of ${deity.split(',')[0]}`, deity, resurrections: 0, goldTaken: 0 },
    tavern: rng.pick(TAVERNS),
  };
}
