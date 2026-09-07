import type { Rng } from '../core/rng';
import type { ThemeId } from '../quests/themes';

/**
 * An interest is something an employer owns and earns from: a mine, a stretch
 * of road, a harbour. Each kind of interest attracts its own kind of trouble.
 */
export type AssetKind =
  | 'mine'
  | 'quarry'
  | 'farmland'
  | 'vineyard'
  | 'lumber-camp'
  | 'herb-garden'
  | 'hunting-lodge'
  | 'trade-route'
  | 'mountain-pass'
  | 'port'
  | 'warehouse'
  | 'shrine'
  | 'cemetery'
  | 'archive'
  | 'watchtower'
  | 'catacombs';

export type AssetStatus = 'safe' | 'threatened' | 'ravaged';

export interface Asset {
  id: string;
  kind: AssetKind;
  name: string;
  ownerId: string;
  /** Gold per day while safe. */
  incomePerDay: number;
  status: AssetStatus;
  /** Quest currently posted or in progress for this asset. */
  questId: string | null;
  /** How many times it has been overrun without help. */
  timesRavaged: number;
}

export interface AssetKindDef {
  label: string;
  /** Name templates; {name} is a proper noun from the pool. */
  names: string[];
  nameParts: string[];
  /** Threats that show up here, weighted. */
  threats: { item: ThemeId; weight: number }[];
  /** Base income per day, before the per-instance spread. */
  income: number;
  /** Quest title templates; {place} is the asset name, {threat} the threat label. */
  titles: string[];
}

const MINERALS = ['silver', 'iron', 'copper', 'salt', 'tin', 'gold'];
const SURNAMES = ['Ashvale', 'Corwyn', 'Halloran', 'Kestrel', 'Marrow', 'Stirling', 'Vexley', 'Thornfield', 'Redmoor', 'Greystoke'];
const LANDMARKS = ['Whisper', 'Thunder', 'Raven', 'Widow’s', 'Kell', 'Thistle', 'Ember', 'Frost', 'Hollow', 'Barrow'];

export const ASSET_KINDS: Record<AssetKind, AssetKindDef> = {
  mine: {
    label: 'mine', income: 60,
    names: ['the {name} mine'], nameParts: MINERALS,
    threats: [{ item: 'goblins', weight: 4 }, { item: 'dragons', weight: 2 }, { item: 'undead', weight: 2 }, { item: 'monstrosities', weight: 2 }, { item: 'elementals', weight: 1 }],
    titles: ['{threat} have overrun {place}', 'Reopen {place}', 'The miners at {place} have gone silent', 'Clear the lower galleries of {place}'],
  },
  quarry: {
    label: 'quarry', income: 40,
    names: ['the {name} quarry'], nameParts: LANDMARKS,
    threats: [{ item: 'goblins', weight: 3 }, { item: 'giants', weight: 3 }, { item: 'monstrosities', weight: 2 }, { item: 'elementals', weight: 1 }],
    titles: ['{threat} are squatting in {place}', 'Get the stonecutters back to {place}', 'Something crawled out of {place}'],
  },
  farmland: {
    label: 'farmland', income: 35,
    names: ['the {name} farms'], nameParts: SURNAMES,
    threats: [{ item: 'beasts', weight: 4 }, { item: 'goblins', weight: 3 }, { item: 'bandits', weight: 2 }, { item: 'undead', weight: 1 }],
    titles: ['Protect the harvest at {place}', '{threat} are raiding {place}', 'The tenants of {place} beg for help'],
  },
  vineyard: {
    label: 'vineyard', income: 45,
    names: ['the {name} vineyards'], nameParts: SURNAMES,
    threats: [{ item: 'bandits', weight: 3 }, { item: 'beasts', weight: 3 }, { item: 'fiends', weight: 1 }, { item: 'cultists', weight: 1 }],
    titles: ['Save the vintage at {place}', '{threat} have taken {place}', 'The cellars of {place} are not empty'],
  },
  'lumber-camp': {
    label: 'lumber camp', income: 40,
    names: ['the {name} lumber camp'], nameParts: LANDMARKS,
    threats: [{ item: 'beasts', weight: 4 }, { item: 'monstrosities', weight: 3 }, { item: 'goblins', weight: 2 }, { item: 'giants', weight: 1 }],
    titles: ['The woodcutters fled {place}', 'Hunt whatever stalks {place}', '{threat} at {place}'],
  },
  'herb-garden': {
    label: 'herb gardens', income: 30,
    names: ['the {name} herb gardens'], nameParts: LANDMARKS,
    threats: [{ item: 'beasts', weight: 3 }, { item: 'monstrosities', weight: 2 }, { item: 'cultists', weight: 2 }, { item: 'undead', weight: 1 }],
    titles: ['Recover the harvest from {place}', '{threat} trample {place}', 'The gardeners will not return to {place}'],
  },
  'hunting-lodge': {
    label: 'hunting lodge', income: 30,
    names: ['the {name} hunting lodge'], nameParts: LANDMARKS,
    threats: [{ item: 'beasts', weight: 4 }, { item: 'monstrosities', weight: 3 }, { item: 'giants', weight: 1 }, { item: 'dragons', weight: 1 }],
    titles: ['A man-eater near {place}', 'Retake {place}', '{threat} drove the gamekeepers from {place}'],
  },
  'trade-route': {
    label: 'trade route', income: 55,
    names: ['the {name} road'], nameParts: LANDMARKS,
    threats: [{ item: 'bandits', weight: 5 }, { item: 'beasts', weight: 2 }, { item: 'goblins', weight: 2 }, { item: 'monstrosities', weight: 1 }],
    titles: ['Caravans vanish on {place}', 'Clear {place} of {threat}', 'Escort the convoy along {place}', 'Recover the stolen cargo on {place}'],
  },
  'mountain-pass': {
    label: 'mountain pass', income: 50,
    names: ['{name} Pass'], nameParts: LANDMARKS,
    threats: [{ item: 'giants', weight: 4 }, { item: 'beasts', weight: 2 }, { item: 'monstrosities', weight: 2 }, { item: 'dragons', weight: 2 }, { item: 'elementals', weight: 1 }],
    titles: ['{threat} hold {place}', 'Reopen {place} before the snows', 'The toll station at {place} is silent'],
  },
  port: {
    label: 'harbour', income: 70,
    names: ['the {name} docks'], nameParts: LANDMARKS,
    threats: [{ item: 'bandits', weight: 4 }, { item: 'sea', weight: 3 }, { item: 'cultists', weight: 2 }, { item: 'undead', weight: 1 }],
    titles: ['Pirates at {place}', 'Something climbs out of the water at {place}', 'Break the smuggling ring at {place}', 'Clear the warehouses of {place}'],
  },
  warehouse: {
    label: 'warehouse', income: 35,
    names: ['the {name} warehouse'], nameParts: SURNAMES,
    threats: [{ item: 'bandits', weight: 4 }, { item: 'monstrosities', weight: 2 }, { item: 'undead', weight: 1 }, { item: 'cultists', weight: 1 }],
    titles: ['Thieves in {place}', 'Nobody who enters {place} comes out', '{threat} broke into {place}'],
  },
  shrine: {
    label: 'shrine', income: 25,
    names: ['the shrine at {name}'], nameParts: LANDMARKS,
    threats: [{ item: 'undead', weight: 3 }, { item: 'cultists', weight: 3 }, { item: 'fiends', weight: 2 }, { item: 'beasts', weight: 1 }],
    titles: ['Consecrate {place} again', '{threat} defile {place}', 'The pilgrims’ road to {place} is unsafe'],
  },
  cemetery: {
    label: 'cemetery', income: 20,
    names: ['the {name} cemetery'], nameParts: LANDMARKS,
    threats: [{ item: 'undead', weight: 5 }, { item: 'cultists', weight: 2 }, { item: 'beasts', weight: 1 }],
    titles: ['The dead walk in {place}', 'Grave robbers at {place}', 'Lay to rest whatever haunts {place}'],
  },
  archive: {
    label: 'archive', income: 30,
    names: ['the {name} archives'], nameParts: LANDMARKS,
    threats: [{ item: 'cultists', weight: 3 }, { item: 'undead', weight: 2 }, { item: 'fiends', weight: 2 }, { item: 'monstrosities', weight: 2 }],
    titles: ['Recover the stolen tomes of {place}', 'Something was let loose in {place}', '{threat} in {place}'],
  },
  watchtower: {
    label: 'watchtower', income: 25,
    names: ['the {name} watchtower'], nameParts: LANDMARKS,
    threats: [{ item: 'goblins', weight: 3 }, { item: 'bandits', weight: 3 }, { item: 'giants', weight: 1 }, { item: 'dragons', weight: 1 }],
    titles: ['Relieve the garrison of {place}', '{threat} took {place}', 'Light the beacon of {place} again'],
  },
  catacombs: {
    label: 'catacombs', income: 20,
    names: ['the {name} catacombs'], nameParts: LANDMARKS,
    threats: [{ item: 'undead', weight: 4 }, { item: 'fiends', weight: 2 }, { item: 'monstrosities', weight: 2 }, { item: 'cultists', weight: 1 }],
    titles: ['Seal the lower levels of {place}', 'Something stirs beneath {place}', 'Retrieve the relic from {place}'],
  },
};

let assetCounter = 0;

export function createAsset(rng: Rng, kind: AssetKind, ownerId: string): Asset {
  const def = ASSET_KINDS[kind];
  const name = rng.pick(def.names).replace('{name}', rng.pick(def.nameParts));
  const spread = 0.7 + rng.next() * 0.6;
  return {
    id: `asset-${++assetCounter}`,
    kind,
    name,
    ownerId,
    incomePerDay: Math.round(def.income * spread),
    status: 'safe',
    questId: null,
    timesRavaged: 0,
  };
}

export function rollThreat(rng: Rng, asset: Asset): ThemeId {
  return rng.weighted(ASSET_KINDS[asset.kind].threats);
}
