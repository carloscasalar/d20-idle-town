import type { Rng } from './rng';

const HERO_FIRST = [
  'Brakk', 'Elowen', 'Torvald', 'Maelis', 'Garrick', 'Sylvi', 'Osric', 'Nym', 'Dagny', 'Fenwick',
  'Isolde', 'Kael', 'Ronan', 'Thessaly', 'Ulric', 'Vesna', 'Wren', 'Ysolde', 'Aldric', 'Brenna',
  'Corvin', 'Delphine', 'Eamon', 'Freya', 'Gideon', 'Halla', 'Ivo', 'Jorunn', 'Lysander', 'Mira',
  'Odalys', 'Piran', 'Quill', 'Rhoswen', 'Soren', 'Tamsin', 'Vidar', 'Yrsa', 'Zephyrine', 'Anselm',
];
const HERO_LAST = [
  'Ironjaw', 'Ashvale', 'Stormcaller', 'Quickfoot', 'Duskwarden', 'Brightblade', 'Hollowmere',
  'Thornfield', 'Greycloak', 'Emberly', 'Frostbeard', 'Nightriver', 'Oakenshield', 'Ravenhurst',
  'Silverstring', 'Underhill', 'Wyrmsbane', 'Goldleaf', 'Blackthorn', 'Redmoor', 'Starling',
  'Vane', 'Hearthstone', 'Marrow', 'Coldwater', 'Longstride', 'Farrow', 'Kestrel', 'Sable',
];
const NOBLE_HOUSES = [
  'Valmont', 'Ashcombe', 'Delacroix', 'Ravensworth', 'Montclair', 'Halloran', 'Stirling', 'Vexley',
  'Aubrecht', 'Corwyn', 'Fairweather', 'Greystoke',
];
const NOBLE_TITLES = ['Lord', 'Lady', 'Baron', 'Baroness', 'Count', 'Countess', 'Magistrate', 'Seneschal'];
const MERCHANT_TRADES = [
  'Spice Merchant', 'Caravan Master', 'Guildmaster of Smiths', 'Silk Trader', 'Master Brewer',
  'Horse Breeder', 'Gem Cutter', 'Shipwright', 'Apothecary', 'Grain Factor',
];
const FACTIONS = [
  'the Gilded Lantern', 'the Order of the Ashen Vigil', 'the Wardens of the Old Road',
  'the Cartographers’ Society', 'the Brotherhood of the Coin', 'the Circle of Thorns',
  'the Night Watch', 'the Scholars of the Grey Tower', 'the Hunters’ Lodge', 'the Silent Court',
];
const TEMPLE_DEITIES = [
  'Pelor, the Dawnfather', 'the Raven Queen', 'Ioun, the Knowing Mistress', 'Bahamut, the Platinum Dragon',
  'Sarenrae, the Dawnflower', 'Moradin, the All-Father',
];
const TOWN_A = ['Ash', 'Bright', 'Cold', 'Dun', 'Elm', 'Fair', 'Grim', 'High', 'Iron', 'King’s', 'Mist', 'Oak', 'Raven', 'Silver', 'Thorn', 'West'];
const TOWN_B = ['ford', 'haven', 'bridge', 'hollow', 'march', 'keep', 'mere', 'reach', 'stead', 'water', 'gate', 'crossing'];
const PARTY_A = ['The', 'The', 'The', 'Company of the', 'Order of the', 'Fellowship of the'];
const PARTY_B = ['Crimson', 'Wandering', 'Iron', 'Gilded', 'Hollow', 'Broken', 'Silver', 'Merry', 'Grim', 'Lucky', 'Restless', 'Sundered', 'Bold', 'Wayward'];
const PARTY_C = ['Blades', 'Lanterns', 'Hounds', 'Crows', 'Wolves', 'Shields', 'Wanderers', 'Daggers', 'Torches', 'Banners', 'Pilgrims', 'Foxes', 'Ravens', 'Oaths'];

export function heroName(rng: Rng): string {
  return `${rng.pick(HERO_FIRST)} ${rng.pick(HERO_LAST)}`;
}

export function nobleName(rng: Rng): string {
  return `${rng.pick(NOBLE_TITLES)} ${rng.pick(HERO_FIRST)} ${rng.pick(NOBLE_HOUSES)}`;
}

export function merchantName(rng: Rng): { name: string; trade: string } {
  return { name: `${rng.pick(HERO_FIRST)} ${rng.pick(HERO_LAST)}`, trade: rng.pick(MERCHANT_TRADES) };
}

export function factionName(rng: Rng): string {
  return rng.pick(FACTIONS);
}

export function deityName(rng: Rng): string {
  return rng.pick(TEMPLE_DEITIES);
}

export function townName(rng: Rng): string {
  return `${rng.pick(TOWN_A)}${rng.pick(TOWN_B)}`;
}

export function partyName(rng: Rng): string {
  return `${rng.pick(PARTY_A)} ${rng.pick(PARTY_B)} ${rng.pick(PARTY_C)}`;
}

/** "A", "A and B", "A, B and C". */
export function listNames(names: string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}
