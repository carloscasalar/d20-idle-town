import { describe, expect, it } from 'vitest';
import { DEFAULT_COMPANY_ROSTER_CONFIG } from '../src/adventurers/company-roster';
import { Game } from '../src/sim/game';
import { createParty } from '../src/adventurers/party';
import { DEFAULT_POLICIES_CONFIG } from '../src/adventurers/policies';
import { armorUpgradeCost, createHero, resurrectionCost } from '../src/adventurers/hero';
import { Rng } from '../src/core/rng';
import { instantiate, ITEM_CATALOGUE } from '../src/items/items';
import { DEFAULT_TOWN_CONFIG, type Employer } from '../src/town/town';
import { STARTING_GOLD } from './helpers/supplied-config';
import { DEFAULT_HERO_ECONOMY } from '../src/adventurers/hero';

// Exercise the public hourly tick, with unrelated arrivals, raids and restocking disabled.
function setup(level = 1, tick = 0) {
  const rng = new Rng(8);
  const party = createParty(rng, level, 4, 0, STARTING_GOLD, DEFAULT_POLICIES_CONFIG.potionSharing);
  party.members = Array.from({ length: 4 }, () => createHero(rng, level, 'Fighter'));
  party.potions = { basic: 4 };
  party.blessed = true;
  party.guildMember = true;
  party.duesPaidDay = 1;
  for (const hero of party.members) hero.armorTier = DEFAULT_HERO_ECONOMY.maxArmorTier;
  const shops = new Map<NonNullable<Employer['service']>, Employer>();
  const game = Game.forTesting({ seed: 42, roster: { maxCompanies: 1 }, world: { maxOpenQuests: 0 } }, (scenario) => {
    scenario.tick = tick;
    scenario.lairs = [];
    scenario.parties = [party];
    for (const employer of scenario.town.employers) {
      employer.stock = [];
      employer.restockIn = 1000;
      if (employer.service) shops.set(employer.service, employer);
    }
  });
  return { game, party, reserve: resurrectionCost(level, DEFAULT_HERO_ECONOMY), shop: (service: NonNullable<Employer['service']>) => shops.get(service)! };
}
const itemRng = new Rng(9);
const item = (name: string) => instantiate(itemRng, ITEM_CATALOGUE.find((i) => i.name === name)!);

describe('town services through an hourly tick', () => {
  it('buys two basic for four level-1 fighters when four would meet the stock target and the purse keeps one resurrection', () => {
    const { game, party, reserve, shop } = setup();
    expect(reserve).toBe(190);
    expect(party.members.map((hero) => hero.maxHp)).toEqual([12, 12, 12, 12]);
    party.potions = {};
    party.guildMember = false;
    party.duesPaidDay = -1;
    party.gold = 290;
    const apothecary = shop('apothecary');
    Object.assign(apothecary, { treasury: 1000, earned: 0, spent: 0 });
    game.step();
    expect(party.potions).toEqual({ basic: 2 });
    expect(party.gold).toBe(190);
    expect(party.spent).toBe(100);
    expect(game.view().stats).toMatchObject({ goldSpentByHeroes: 100, goldSpentOnProduction: 50 });
    expect(apothecary.treasury).toBe(1050);
    expect(apothecary.earned).toBe(100);
    expect(apothecary.spent).toBe(50);
    expect(party.guildMember).toBe(false);
    expect(game.view().events.filter((event) => event.text.includes('healing potion')).map((event) => event.text)).toEqual([
      `${party.name} buy 2 basic healing potions from ${apothecary.name} for 100 gp.`,
    ]);
  });

  it('counts a greater already in the pack, and buys three basic rather than one basic per hero', () => {
    const { game, party, shop } = setup();
    party.potions = { greater: 1 };
    party.gold = 100000;
    game.step();
    expect(party.potions).toEqual({ basic: 3, greater: 1 });
    expect(party.spent).toBe(150);
    expect(Object.keys(game.view().parties[0]!.potions)).toEqual(['basic', 'greater']);
    expect(game.view().events.filter((event) => event.text.includes('healing potion')).map((event) => event.text)).toEqual([
      `${party.name} buy 3 basic healing potions from ${shop('apothecary').name} for 150 gp.`,
    ]);
  });

  it('leaves a new level-1 purse of 50 gp untouched, because one resurrection costs 190 gp', () => {
    const { game, party, reserve } = setup();
    expect(reserve).toBe(190);
    party.potions = {};
    party.gold = 50;
    game.step();
    expect(party.gold).toBe(50);
    expect(party.potions).toEqual({});
    expect(party.spent).toBe(0);
  });

  it.each(['apothecary', 'enchanter', 'guild', 'temple', 'smith'] as const)('does not buy from a ruined %s', (service) => {
    const { game, party, reserve, shop } = setup();
    party.gold = reserve + 2000;
    if (service === 'apothecary') party.potions = {};
    if (service === 'enchanter') shop(service).stock = [item('Shield +1')];
    if (service === 'guild') party.duesPaidDay = -1;
    if (service === 'temple') party.blessed = false;
    if (service === 'smith') party.members[0]!.armorTier = 0;
    shop(service).ruined = true;
    const before = structuredClone(party);
    game.step();
    expect(party.gold).toBe(before.gold);
    expect(party.members).toEqual(before.members);
    expect(party.potions).toEqual(before.potions);
    expect(party.blessed).toBe(before.blessed);
    expect(party.spent).toBe(0);
  });

  it('shares useful loot before buying items and returns replaced equipment to the stash', () => {
    const { game, party, shop } = setup();
    for (const hero of party.members) hero.items = [item('Longsword +1')];
    const weaker = party.members[0]!.items[0]!;
    const stronger = item('Flame Tongue');
    party.stash = [stronger];
    party.gold = 10000;
    const stock = item('Amulet of Health');
    shop('temple').stock = [stock];
    game.step();
    expect(party.members[0]!.items).toContain(stronger);
    expect(party.stash).toContain(weaker);
    expect(shop('temple').stock).toContain(stock);
    expect(party.spent).toBe(0);
  });

  it('sells unwanted loot for the available treasury and records both ledgers', () => {
    const { game, party, shop } = setup();
    for (const hero of party.members) hero.items = [item('Flame Tongue')];
    const unwanted = item('Longsword +1');
    party.stash = [unwanted];
    party.gold = 0;
    const enchanter = shop('enchanter');
    enchanter.treasury = 17;
    const spent = enchanter.spent;
    game.step();
    expect(party.stash).toEqual([]);
    expect(enchanter.stock).toContain(unwanted);
    expect(enchanter.treasury).toBe(0);
    expect(enchanter.spent).toBe(spent + 17);
    expect(party.gold).toBe(17);
    expect(party.earned).toBe(17);
    expect(game.view().stats.itemsSold).toBe(1);
    expect(game.view().stats.goldSpentByHeroes).toBe(0);
  });

  it.each(['ruined', 'full', 'poor'] as const)('keeps unwanted loot when the enchanter is %s', (reason) => {
    const { game, party, shop } = setup();
    for (const hero of party.members) hero.items = [item('Flame Tongue')];
    const unwanted = item('Longsword +1');
    party.stash = [unwanted];
    party.gold = 0;
    const enchanter = shop('enchanter');
    if (reason === 'ruined') enchanter.ruined = true;
    if (reason === 'poor') enchanter.treasury = 0;
    if (reason === 'full') enchanter.stock = Array.from({ length: DEFAULT_TOWN_CONFIG.maxStock }, () => item('Longsword +1'));
    game.step();
    expect(party.stash).toEqual([unwanted]);
    expect(game.view().stats.itemsSold).toBe(0);
  });

  it('buys the most expensive usable affordable item and credits its seller', () => {
    const { game, party, reserve, shop } = setup();
    const cheap = item('Shield +1');
    const best = item('Amulet of Health');
    const expensive = item('Flame Tongue');
    const seller = shop('enchanter');
    seller.stock = [cheap, best, expensive];
    party.gold = reserve + best.price;
    const treasury = seller.treasury;
    const earned = seller.earned;
    game.step();
    expect(party.members[0]!.items).toContain(best);
    expect(party.members[0]!.goldSpent).toBe(best.price);
    expect(party.gold).toBe(reserve);
    expect(seller.stock).toEqual([cheap, expensive]);
    expect(seller.treasury).toBe(treasury + best.price);
    expect(seller.earned).toBe(earned + best.price);
    expect(game.view().stats.goldSpentByHeroes).toBe(best.price);
    expect(game.view().chronicle.at(-1)?.kind).toBe('shop');
  });

  it('gives a purchased item to the least-equipped living member who can use it', () => {
    const { game, party, reserve, shop } = setup();
    party.members[0]!.items = [item('Shield +1')];
    const purchase = item('Amulet of Health');
    shop('temple').stock = [purchase];
    party.gold = reserve + purchase.price;
    game.step();
    expect(party.members[1]!.items).toContain(purchase);
    expect(party.members[1]!.goldSpent).toBe(purchase.price);
  });

  it('joins the guild before buying a blessing and does not renew early', () => {
    const { game, party, reserve } = setup();
    party.guildMember = false;
    party.duesPaidDay = -1;
    party.blessed = false;
    party.gold = reserve * 2 + 100;
    game.step();
    expect(party.guildMember).toBe(true);
    expect(party.duesPaidDay).toBe(1);
    expect(party.spent).toBe(60);
    expect(party.blessed).toBe(false);
    game.step();
    expect(party.blessed).toBe(true);
    expect(party.spent).toBe(100);
  });

  it.each([true, false])('renews weekly dues only when affordable (%s)', (affordable) => {
    const { game, party, reserve, shop } = setup(1, 7 * 24);
    party.gold = reserve + (affordable ? 60 : 59);
    const treasury = shop('guild').treasury;
    game.step();
    expect(party.guildMember).toBe(affordable);
    expect(party.duesPaidDay).toBe(affordable ? 8 : 1);
    expect(party.spent).toBe(affordable ? 60 : 0);
    expect(shop('guild').treasury).toBe(treasury + party.spent);
  });

  it.each([0, -1])('requires an extra half reserve for a blessing (budget offset %s)', (offset) => {
    const { game, party, reserve, shop } = setup();
    party.blessed = false;
    party.gold = reserve * 1.5 + 40 + offset;
    const treasury = shop('temple').treasury;
    game.step();
    expect(party.blessed).toBe(offset === 0);
    expect(party.spent).toBe(offset === 0 ? 40 : 0);
    expect(shop('temple').treasury).toBe(treasury + party.spent);
  });

  it('fits the worst-armoured first, stopping at the reserve and recording hero spending', () => {
    const { game, party, reserve, shop } = setup();
    party.members[0]!.armorTier = 1;
    party.members[1]!.armorTier = 0;
    const cost = armorUpgradeCost(0, 1, DEFAULT_HERO_ECONOMY);
    party.gold = reserve + cost;
    const treasury = shop('smith').treasury;
    game.step();
    expect(party.members.map((h) => h.armorTier)).toEqual([1, 1, DEFAULT_HERO_ECONOMY.maxArmorTier, DEFAULT_HERO_ECONOMY.maxArmorTier]);
    expect(party.members[1]!.goldSpent).toBe(cost);
    expect(party.gold).toBe(reserve);
    expect(shop('smith').treasury).toBe(treasury + cost);
    expect(game.view().stats.goldSpentByHeroes).toBe(cost);
  });

  it('fits multiple members in one hour, upgrading each only once', () => {
    const { game, party, reserve } = setup();
    for (const hero of party.members) hero.armorTier = 0;
    party.gold = reserve + 4 * armorUpgradeCost(0, 1, DEFAULT_HERO_ECONOMY);
    game.step();
    expect(party.members.map((h) => h.armorTier)).toEqual([1, 1, 1, 1]);
    expect(party.gold).toBe(reserve);
  });

  it('retires a veteran before fitting armour, preserving the existing spending rules', () => {
    const { game, party, reserve } = setup(8);
    party.potions = { supreme: 4 }; // already at the stock target, so this hour is retirement
    for (const hero of party.members) hero.armorTier = 0;
    const veteran = party.members[0]!;
    party.gold = DEFAULT_COMPANY_ROSTER_CONFIG.retirementPrice + reserve;
    const employers = game.view().town.employers.length;
    game.step();
    expect(party.members).not.toContain(veteran);
    expect(party.members.map((h) => h.armorTier)).toEqual([0, 0, 0]);
    expect(party.gold).toBe(reserve);
    expect(party.spent).toBe(DEFAULT_COMPANY_ROSTER_CONFIG.retirementPrice);
    expect(veteran.goldSpent).toBe(0);
    expect(game.view().stats.retirements).toBe(1);
    expect(game.view().town.employers).toHaveLength(employers + 1);
  });
});
