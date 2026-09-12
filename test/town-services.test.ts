import { describe, expect, it } from 'vitest';
import { Game } from '../src/sim/game';
import { createParty } from '../src/adventurers/party';
import { armorUpgradeCost, createHero, MAX_ARMOR_TIER, potionCost, resurrectionCost } from '../src/adventurers/hero';
import { Rng } from '../src/core/rng';
import { instantiate, ITEM_CATALOGUE } from '../src/items/items';
import { MAX_STOCK, RETIREMENT_PRICE, serviceOf } from '../src/town/town';

// Exercise the public hourly tick, with unrelated arrivals, raids and restocking disabled.
function setup(level = 1) {
  const game = new Game({ seed: 42, maxParties: 1, maxOpenQuests: 0 });
  game.lairs = [];
  const rng = new Rng(8);
  const party = createParty(rng, level, 4, 0);
  party.members = Array.from({ length: 4 }, () => createHero(rng, level, 'Fighter'));
  party.potions = 4;
  party.blessed = true;
  party.guildMember = true;
  party.duesPaidDay = 1;
  for (const hero of party.members) hero.armorTier = MAX_ARMOR_TIER;
  game.parties = [party];
  for (const employer of game.town.employers) {
    employer.stock = [];
    employer.restockIn = 1000;
  }
  return { game, party, reserve: resurrectionCost(level), shop: (service: Parameters<typeof serviceOf>[1]) => serviceOf(game.town, service) };
}
const item = (name: string) => instantiate(ITEM_CATALOGUE.find((i) => i.name === name)!);

describe('town services through an hourly tick', () => {
  it('buys affordable potions, preserves the reserve and spends the hour before guild dues', () => {
    const { game, party, reserve, shop } = setup();
    party.potions = 0;
    party.guildMember = false;
    party.duesPaidDay = -1;
    party.gold = reserve + potionCost(1) * 2;
    const apothecary = shop('apothecary');
    const treasury = apothecary.treasury;
    const earned = apothecary.earned;
    game.step();
    expect(party.potions).toBe(2);
    expect(party.gold).toBe(reserve);
    expect(party.spent).toBe(potionCost(1) * 2);
    expect(game.stats.goldSpentByHeroes).toBe(party.spent);
    expect(apothecary.treasury).toBe(treasury + party.spent);
    expect(apothecary.earned).toBe(earned + party.spent);
    expect(party.guildMember).toBe(false);
  });

  it.each(['apothecary', 'enchanter', 'guild', 'temple', 'smith'] as const)('does not buy from a ruined %s', (service) => {
    const { game, party, reserve, shop } = setup();
    party.gold = reserve + 2000;
    if (service === 'apothecary') party.potions = 0;
    if (service === 'enchanter') shop(service).stock = [item('Shield +1')];
    if (service === 'guild') party.duesPaidDay = -1;
    if (service === 'temple') party.blessed = false;
    if (service === 'smith') party.members[0]!.armorTier = 0;
    shop(service).ruined = true;
    const before = structuredClone(party);
    game.step();
    expect(party.gold).toBe(before.gold);
    expect(party.members).toEqual(before.members);
    expect(party.potions).toBe(before.potions);
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
    expect(game.stats.itemsSold).toBe(1);
    expect(game.stats.goldSpentByHeroes).toBe(0);
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
    if (reason === 'full') enchanter.stock = Array.from({ length: MAX_STOCK }, () => item('Longsword +1'));
    game.step();
    expect(party.stash).toEqual([unwanted]);
    expect(game.stats.itemsSold).toBe(0);
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
    expect(game.stats.goldSpentByHeroes).toBe(best.price);
    expect(game.chronicle.at(-1)?.kind).toBe('shop');
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
    const { game, party, reserve, shop } = setup();
    game.tick = 7 * 24;
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
    const cost = armorUpgradeCost(0, 1);
    party.gold = reserve + cost;
    const treasury = shop('smith').treasury;
    game.step();
    expect(party.members.map((h) => h.armorTier)).toEqual([1, 1, MAX_ARMOR_TIER, MAX_ARMOR_TIER]);
    expect(party.members[1]!.goldSpent).toBe(cost);
    expect(party.gold).toBe(reserve);
    expect(shop('smith').treasury).toBe(treasury + cost);
    expect(game.stats.goldSpentByHeroes).toBe(cost);
  });

  it('fits multiple members in one hour, upgrading each only once', () => {
    const { game, party, reserve } = setup();
    for (const hero of party.members) hero.armorTier = 0;
    party.gold = reserve + 4 * armorUpgradeCost(0, 1);
    game.step();
    expect(party.members.map((h) => h.armorTier)).toEqual([1, 1, 1, 1]);
    expect(party.gold).toBe(reserve);
  });

  it('retires a veteran before fitting armour, preserving the existing spending rules', () => {
    const { game, party, reserve } = setup(8);
    for (const hero of party.members) hero.armorTier = 0;
    const veteran = party.members[0]!;
    party.gold = RETIREMENT_PRICE + reserve;
    const employers = game.town.employers.length;
    game.step();
    expect(party.members).not.toContain(veteran);
    expect(party.members.map((h) => h.armorTier)).toEqual([0, 0, 0]);
    expect(party.gold).toBe(reserve);
    expect(party.spent).toBe(RETIREMENT_PRICE);
    expect(veteran.goldSpent).toBe(0);
    expect(game.stats.retirements).toBe(1);
    expect(game.town.employers).toHaveLength(employers + 1);
  });
});
