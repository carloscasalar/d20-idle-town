import { deityName, factionName, merchantName, nobleName, townName } from '../core/names';
import type { Rng } from '../core/rng';
import type { MagicItem } from '../items/items';
import { createAsset, type Asset, type AssetKind } from './assets';

export type EmployerKind = 'noble' | 'merchant' | 'faction' | 'temple';

/** Shops where adventurers spend coin. Each belongs to one employer. */
export type ServiceKind = 'tavern' | 'temple' | 'smith' | 'apothecary' | 'enchanter' | 'guild';

export interface Employer {
  id: string;
  name: string;
  kind: EmployerKind;
  /** "House Valmont", "Spice Merchant", "Faction", "Temple". */
  title: string;
  /** Shop this employer runs in town, if any. */
  service: ServiceKind | null;
  assets: Asset[];
  treasury: number;
  /** Fixed daily costs: retainers, tithes, rent. */
  upkeepPerDay: number;
  /** Multiplier on contract rewards. */
  generosity: number;
  /** Grows with completed contracts. Reputable employers attract companies first. */
  reputation: number;
  cooldown: number;
  ruined: boolean;
  questsPosted: number;
  questsCompleted: number;
  questsFailed: number;
  /** Lifetime ledger. */
  earned: number;
  spent: number;
  /** Magic items for sale. Only shops that trade in them ever hold any. */
  stock: MagicItem[];
  /** Ticks until the shop puts something new on the shelf. */
  restockIn: number;
  /** A retired adventurer's old company gets first refusal on their contracts. */
  favoredPartyId: string | null;
}

export interface Town {
  name: string;
  employers: Employer[];
  tavernName: string;
  deity: string;
}

const EMPLOYER_ASSETS: Record<EmployerKind, AssetKind[]> = {
  noble: ['mine', 'farmland', 'mountain-pass', 'vineyard', 'hunting-lodge', 'quarry'],
  merchant: ['trade-route', 'port', 'warehouse', 'quarry', 'lumber-camp'],
  faction: ['archive', 'watchtower', 'catacombs', 'trade-route', 'shrine'],
  temple: ['shrine', 'cemetery', 'catacombs'],
};

const SERVICE_ASSETS: Record<ServiceKind, AssetKind[]> = {
  tavern: ['vineyard', 'trade-route'],
  temple: ['shrine', 'cemetery'],
  smith: ['mine', 'quarry'],
  apothecary: ['herb-garden', 'lumber-camp'],
  enchanter: ['archive', 'catacombs'],
  guild: ['watchtower', 'trade-route'],
};

const SERVICE_TITLES: Record<ServiceKind, string> = {
  tavern: 'Innkeeper',
  temple: 'Temple',
  smith: 'Master Smith',
  apothecary: 'Apothecary',
  enchanter: 'Enchanter',
  guild: 'Adventurers’ Guild',
};

/** Shops that keep magic items on the shelf, and how often (ticks) something new turns up. */
export const ITEM_SHOPS: Partial<Record<ServiceKind, number>> = { enchanter: 24 * 4, temple: 24 * 7, smith: 24 * 9 };
export const MAX_STOCK = 2;

/** What it costs a company to set one of its own up in business. Meant to be a lifetime's earnings. */
export const RETIREMENT_PRICE = 25000;
export const RETIREMENT_LEVEL = 8;

const TAVERNS = ['The Prancing Owlbear', 'The Rusty Flagon', 'The Drunken Dragon', 'The Last Ember', 'The Broken Lantern'];

let employerCounter = 0;

function makeEmployer(rng: Rng, kind: EmployerKind, service: ServiceKind | null, deity: string, tavernName: string): Employer {
  let name: string;
  let title: string;
  let generosity: number;
  let treasury: number;
  switch (kind) {
    case 'noble':
      name = nobleName(rng);
      title = `House ${name.split(' ').pop()}`;
      generosity = 1.3 + rng.next() * 0.5;
      treasury = rng.int(1500, 3000);
      break;
    case 'merchant': {
      const m = merchantName(rng);
      name = m.name;
      title = service ? SERVICE_TITLES[service] : m.trade;
      generosity = 1.0 + rng.next() * 0.4;
      treasury = rng.int(800, 1600);
      break;
    }
    case 'faction':
      name = factionName(rng);
      name = name.charAt(0).toUpperCase() + name.slice(1);
      title = 'Faction';
      generosity = 0.8 + rng.next() * 0.4;
      treasury = rng.int(600, 1200);
      break;
    case 'temple':
      name = `Temple of ${deity.split(',')[0]}`;
      title = 'Temple';
      generosity = 0.9 + rng.next() * 0.3;
      treasury = rng.int(800, 1400);
      break;
  }
  if (service === 'tavern') name = tavernName;
  if (service === 'guild') name = 'The Adventurers’ Guild';
  if (service === 'enchanter') name = `${name}’s Curiosities`;
  const id = `employer-${++employerCounter}`;
  const pool = service ? SERVICE_ASSETS[service] : EMPLOYER_ASSETS[kind];
  const assetCount = kind === 'noble' ? rng.int(2, 3) : rng.int(1, 2);
  const kinds = rng.shuffle(pool).slice(0, assetCount);
  const assets = kinds.map((k) => createAsset(rng, k, id));
  const income = assets.reduce((s, a) => s + a.incomePerDay, 0);
  return {
    id,
    name,
    kind,
    title,
    service,
    assets,
    treasury,
    upkeepPerDay: Math.round(income * (0.35 + rng.next() * 0.2)),
    generosity: Math.round(generosity * 100) / 100,
    reputation: 0,
    cooldown: rng.int(0, 6),
    ruined: false,
    questsPosted: 0,
    questsCompleted: 0,
    questsFailed: 0,
    earned: 0,
    spent: 0,
    stock: [],
    restockIn: service && ITEM_SHOPS[service] ? Math.floor(ITEM_SHOPS[service]! / 2) : 0,
    favoredPartyId: null,
  };
}

/** A high-level adventurer buys a business and becomes an employer in their own right. */
export function retiredEmployer(rng: Rng, heroName: string, partyId: string, gold: number): Employer {
  const id = `employer-${++employerCounter}`;
  const kind: AssetKind = rng.pick(['vineyard', 'warehouse', 'trade-route', 'hunting-lodge', 'farmland']);
  const asset = createAsset(rng, kind, id);
  return {
    id,
    name: heroName,
    kind: 'merchant',
    title: 'Retired adventurer',
    service: null,
    assets: [asset],
    treasury: gold,
    upkeepPerDay: Math.round(asset.incomePerDay * 0.4),
    generosity: 1.2,
    reputation: 1,
    cooldown: rng.int(6, 12),
    ruined: false,
    questsPosted: 0,
    questsCompleted: 0,
    questsFailed: 0,
    earned: 0,
    spent: 0,
    stock: [],
    restockIn: 0,
    favoredPartyId: partyId,
  };
}

export function generateTown(rng: Rng): Town {
  const deity = deityName(rng);
  const tavernName = rng.pick(TAVERNS);
  const employers: Employer[] = [];
  for (let i = 0; i < rng.int(2, 3); i++) employers.push(makeEmployer(rng, 'noble', null, deity, tavernName));
  employers.push(makeEmployer(rng, 'merchant', 'tavern', deity, tavernName));
  employers.push(makeEmployer(rng, 'merchant', 'smith', deity, tavernName));
  employers.push(makeEmployer(rng, 'merchant', 'apothecary', deity, tavernName));
  employers.push(makeEmployer(rng, 'merchant', 'enchanter', deity, tavernName));
  employers.push(makeEmployer(rng, 'faction', 'guild', deity, tavernName));
  for (let i = 0; i < rng.int(1, 2); i++) employers.push(makeEmployer(rng, 'merchant', null, deity, tavernName));
  for (let i = 0; i < rng.int(2, 3); i++) employers.push(makeEmployer(rng, 'faction', null, deity, tavernName));
  employers.push(makeEmployer(rng, 'temple', 'temple', deity, tavernName));

  const seen = new Set<string>();
  for (const e of employers) {
    while (seen.has(e.name)) e.name = e.kind === 'faction' ? factionName(rng) : nobleName(rng);
    seen.add(e.name);
  }
  return { name: townName(rng), employers, tavernName, deity };
}

export function serviceOf(town: Town, service: ServiceKind): Employer {
  const e = town.employers.find((x) => x.service === service);
  if (!e) throw new Error(`town has no ${service}`);
  return e;
}

export function assetById(town: Town, id: string): Asset | undefined {
  for (const e of town.employers) {
    const a = e.assets.find((x) => x.id === id);
    if (a) return a;
  }
  return undefined;
}

export function dailyIncome(e: Employer): number {
  return e.assets.reduce((s, a) => s + (a.status === 'safe' ? a.incomePerDay : a.status === 'threatened' ? Math.floor(a.incomePerDay / 2) : 0), 0);
}
