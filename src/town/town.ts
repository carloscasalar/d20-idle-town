import { freeze } from '../core/freeze';
import { deityName, factionName, merchantName, nobleName, townName } from '../core/names';
import type { Rng } from '../core/rng';
import type { MagicItem } from '../items/items';
import { createAsset, type Asset, type AssetKind, type HoldingConfig } from './assets';

export type EmployerKind = 'noble' | 'merchant' | 'faction' | 'temple';

/** Every employer kind a configuration may name. */
export const EMPLOYER_KINDS = ['noble', 'merchant', 'faction', 'temple'] as const satisfies readonly EmployerKind[];

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

/** How a town is populated, how its shops restock, and how a threatened holding pays. */
export interface TownConfig {
  maxStock: number;
  restockTicks: { enchanter: number; temple: number; smith: number };
  restockInitialDivisor: number;
  nobleCount: [number, number];
  extraMerchants: [number, number];
  extraFactions: [number, number];
  nobleHoldings: [number, number];
  otherHoldings: [number, number];
  nobleTreasury: [number, number];
  merchantTreasury: [number, number];
  factionTreasury: [number, number];
  templeTreasury: [number, number];
  nobleGenerosityMin: number;
  nobleGenerositySpan: number;
  merchantGenerosityMin: number;
  merchantGenerositySpan: number;
  factionGenerosityMin: number;
  factionGenerositySpan: number;
  templeGenerosityMin: number;
  templeGenerositySpan: number;
  upkeepFactorMin: number;
  upkeepFactorSpan: number;
  initialCooldown: [number, number];
  retiredUpkeepFactor: number;
  retiredGenerosity: number;
  retiredReputation: number;
  retiredCooldown: [number, number];
  /** Holdings a retired adventurer might buy. */
  retiredHoldings: AssetKind[];
  threatenedIncomeDivisor: number;
}

export const DEFAULT_TOWN_CONFIG: TownConfig = freeze({
  maxStock: 2,
  restockTicks: { enchanter: 96, temple: 168, smith: 216 },
  restockInitialDivisor: 2,
  nobleCount: [2, 3],
  extraMerchants: [1, 2],
  extraFactions: [2, 3],
  nobleHoldings: [2, 3],
  otherHoldings: [1, 2],
  nobleTreasury: [1500, 3000],
  merchantTreasury: [800, 1600],
  factionTreasury: [600, 1200],
  templeTreasury: [800, 1400],
  nobleGenerosityMin: 1.3,
  nobleGenerositySpan: 0.5,
  merchantGenerosityMin: 1.0,
  merchantGenerositySpan: 0.4,
  factionGenerosityMin: 0.8,
  factionGenerositySpan: 0.4,
  templeGenerosityMin: 0.9,
  templeGenerositySpan: 0.3,
  upkeepFactorMin: 0.35,
  upkeepFactorSpan: 0.2,
  initialCooldown: [0, 6],
  retiredUpkeepFactor: 0.4,
  retiredGenerosity: 1.2,
  retiredReputation: 1,
  retiredCooldown: [6, 12],
  retiredHoldings: ['vineyard', 'warehouse', 'trade-route', 'hunting-lodge', 'farmland'],
  threatenedIncomeDivisor: 2,
});

const TAVERNS = ['The Prancing Owlbear', 'The Rusty Flagon', 'The Drunken Dragon', 'The Last Ember', 'The Broken Lantern'];

function makeEmployer(rng: Rng, kind: EmployerKind, service: ServiceKind | null, deity: string, tavernName: string, town: TownConfig, holdings: HoldingConfig): Employer {
  let name: string;
  let title: string;
  let generosity: number;
  let treasury: number;
  switch (kind) {
    case 'noble':
      name = nobleName(rng);
      title = `House ${name.split(' ').pop()}`;
      generosity = town.nobleGenerosityMin + rng.next() * town.nobleGenerositySpan;
      treasury = rng.int(...town.nobleTreasury);
      break;
    case 'merchant': {
      const m = merchantName(rng);
      name = m.name;
      title = service ? SERVICE_TITLES[service] : m.trade;
      generosity = town.merchantGenerosityMin + rng.next() * town.merchantGenerositySpan;
      treasury = rng.int(...town.merchantTreasury);
      break;
    }
    case 'faction':
      name = factionName(rng);
      name = name.charAt(0).toUpperCase() + name.slice(1);
      title = 'Faction';
      generosity = town.factionGenerosityMin + rng.next() * town.factionGenerositySpan;
      treasury = rng.int(...town.factionTreasury);
      break;
    case 'temple':
      name = `Temple of ${deity.split(',')[0]}`;
      title = 'Temple';
      generosity = town.templeGenerosityMin + rng.next() * town.templeGenerositySpan;
      treasury = rng.int(...town.templeTreasury);
      break;
  }
  if (service === 'tavern') name = tavernName;
  if (service === 'guild') name = 'The Adventurers’ Guild';
  if (service === 'enchanter') name = `${name}’s Curiosities`;
  const id = rng.id('employer');
  const pool = service ? SERVICE_ASSETS[service] : EMPLOYER_ASSETS[kind];
  const assetCount = kind === 'noble' ? rng.int(...town.nobleHoldings) : rng.int(...town.otherHoldings);
  const kinds = rng.shuffle(pool).slice(0, assetCount);
  const assets = kinds.map((k) => createAsset(rng, k, id, holdings));
  const income = assets.reduce((s, a) => s + a.incomePerDay, 0);
  const restock = service ? town.restockTicks[service as keyof TownConfig['restockTicks']] : undefined;
  return {
    id,
    name,
    kind,
    title,
    service,
    assets,
    treasury,
    upkeepPerDay: Math.round(income * (town.upkeepFactorMin + rng.next() * town.upkeepFactorSpan)),
    generosity: Math.round(generosity * 100) / 100,
    reputation: 0,
    cooldown: rng.int(...town.initialCooldown),
    ruined: false,
    questsPosted: 0,
    questsCompleted: 0,
    questsFailed: 0,
    earned: 0,
    spent: 0,
    stock: [],
    restockIn: restock ? Math.floor(restock / town.restockInitialDivisor) : 0,
    favoredPartyId: null,
  };
}

/** A high-level adventurer buys a business and becomes an employer in their own right. */
export function retiredEmployer(rng: Rng, heroName: string, partyId: string, town: TownConfig, holdings: HoldingConfig): Employer {
  const id = rng.id('employer');
  const kind: AssetKind = rng.pick(town.retiredHoldings);
  const asset = createAsset(rng, kind, id, holdings);
  return {
    id,
    name: heroName,
    kind: 'merchant',
    title: 'Retired adventurer',
    service: null,
    assets: [asset],
    treasury: 0,
    upkeepPerDay: Math.round(asset.incomePerDay * town.retiredUpkeepFactor),
    generosity: town.retiredGenerosity,
    reputation: town.retiredReputation,
    cooldown: rng.int(...town.retiredCooldown),
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

export function generateTown(rng: Rng, town: TownConfig, holdings: HoldingConfig): Town {
  const deity = deityName(rng);
  const tavernName = rng.pick(TAVERNS);
  const employers: Employer[] = [];
  const make = (kind: EmployerKind, service: ServiceKind | null) => makeEmployer(rng, kind, service, deity, tavernName, town, holdings);
  for (let i = 0; i < rng.int(...town.nobleCount); i++) employers.push(make('noble', null));
  employers.push(make('merchant', 'tavern'));
  employers.push(make('merchant', 'smith'));
  employers.push(make('merchant', 'apothecary'));
  employers.push(make('merchant', 'enchanter'));
  employers.push(make('faction', 'guild'));
  for (let i = 0; i < rng.int(...town.extraMerchants); i++) employers.push(make('merchant', null));
  for (let i = 0; i < rng.int(...town.extraFactions); i++) employers.push(make('faction', null));
  employers.push(make('temple', 'temple'));

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

export function dailyIncome(e: Employer, threatenedDivisor: number): number {
  return e.assets.reduce((s, a) => s + (a.status === 'safe' ? a.incomePerDay : a.status === 'threatened' ? Math.floor(a.incomePerDay / threatenedDivisor) : 0), 0);
}
