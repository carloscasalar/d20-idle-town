import { armorUpgradeCost, equipItem, wantsItem, MAX_ARMOR_TIER, potionCost, resurrectionCost, type Hero } from '../adventurers/hero';
import { aliveMembers, partyLevel, type Party } from '../adventurers/party';
import { listNames } from '../core/names';
import { describeEffect, resalePrice, type MagicItem } from '../items/items';
import { coinReasons, purse, transfer, treasury, type GoldStatistics } from './coin';
import { MAX_STOCK, serviceOf, type Employer, type Town } from './town';

const GUILD_DUES_PER_LEVEL = 15;
const DUES_PERIOD_DAYS = 7;
const BLESSING_COST_PER_LEVEL = 40;
export const BLESSING_HP_PER_LEVEL = 3;

/** Item statistics for a service visit. Gold statistics live on the context. */
export interface ServiceLedger {
  itemsSold: number;
}

export interface ServiceEvent {
  kind: 'shop' | 'temple';
  text: string;
  chronicle?: boolean;
}

export interface TownServiceContext {
  town: Town;
  day: number;
  ledger: ServiceLedger;
  statistics: GoldStatistics;
  /** Publish immediately, so subscribers see state at the same point as the event. */
  report: (event: ServiceEvent) => void;
}

/** One service may spend the hour; false allows the following step to try. */
export type TownServiceStep = (company: Party, context: TownServiceContext) => boolean;

/** Regular services; Game supplies the complete ordered list for its world. */
export const TOWN_PURCHASE_STEPS: readonly TownServiceStep[] = Object.freeze([
  buyPotions, sellLoot, buyMagicItem, payGuildDues, buyBlessing, buyArmour,
]);

/** Try caller-supplied steps in order, stopping as soon as one spends the hour.
 * A false result may still change state, such as a lapsed guild membership.
 * Regular purchases retain one resurrection's cost; blessings retain 1.5 times.
 */
export function visitTownServices(p: Party, services: TownServiceContext, steps: readonly TownServiceStep[]): boolean {
  for (const step of steps) if (step(p, services)) return true;
  return false;
}

export function buyPotions(p: Party, services: TownServiceContext): boolean {
  const { town, level, reserve, alive, pay, log } = serviceVisit(p, services);
  if (p.potions < alive.length) {
    const apothecary = serviceOf(town, 'apothecary');
    const cost = potionCost(level);
    const wanted = alive.length - p.potions;
    const affordable = Math.min(wanted, Math.floor((p.gold - reserve) / cost));
    if (affordable > 0 && !apothecary.ruined) {
      pay(p, apothecary, affordable * cost);
      p.potions += affordable;
      log('shop', `${p.name} buy ${affordable} healing potion${affordable > 1 ? 's' : ''} from ${apothecary.name} for ${affordable * cost} gp.`);
      return true;
    }
  }
  return false;
}

export function buyArmour(p: Party, services: TownServiceContext): boolean {
  const { town, reserve, alive, pay, log } = serviceVisit(p, services);
  const smith = serviceOf(town, 'smith');
  if (!smith.ruined) {
    // Everyone who can afford it gets fitted in the same visit, the worst-armoured first.
    const fitted: string[] = [];
    let bill = 0;
    for (const h of [...alive].sort((a, b) => a.armorTier - b.armorTier)) {
      if (h.armorTier >= MAX_ARMOR_TIER) continue;
      const cost = armorUpgradeCost(h.armorTier, h.level);
      if (p.gold - cost < reserve) continue;
      pay(p, smith, cost, h);
      h.armorTier += 1;
      bill += cost;
      fitted.push(`${h.name} (AC +${h.armorTier})`);
    }
    if (fitted.length > 0) {
      log('shop', fitted.length === alive.length && new Set(alive.map((h) => h.armorTier)).size === 1
        ? `${p.name} pay ${smith.name} ${bill} gp to have the whole company fitted with better armour (AC +${alive[0]!.armorTier}).`
        : `${p.name} pay ${smith.name} ${bill} gp for better armour: ${listNames(fitted)}.`);
      return true;
    }
  }
  return false;
}

/** Equip loot from the stash where it helps; sell the rest to the enchanter, who puts it back on sale. */
export function sellLoot(p: Party, services: TownServiceContext): boolean {
  const { town, ledger, statistics, log } = serviceVisit(p, services);
  if (p.stash.length === 0) return false;
  const equipped: string[] = [];
  let guard = 0;
  while (guard++ < 20) {
    const idx = p.stash.findIndex((i) => pickRecipient(aliveMembers(p), i));
    if (idx < 0) break;
    const item = p.stash.splice(idx, 1)[0]!;
    const taker = pickRecipient(aliveMembers(p), item)!;
    const replaced = equipItem(taker, item);
    if (replaced) p.stash.push(replaced);
    equipped.push(`${taker.name} the ${item.name}`);
  }
  if (equipped.length > 0) {
    log('shop', `${p.name} share out their finds: ${listNames(equipped)}.`);
    return true;
  }
  const item = p.stash.shift()!;
  const enchanter = serviceOf(town, 'enchanter');
  const price = Math.min(resalePrice(item), enchanter.treasury);
  if (enchanter.ruined || price <= 0 || enchanter.stock.length >= MAX_STOCK) {
    p.stash.push(item);
    return false;
  }
  transfer(treasury(enchanter), purse(p), price, 'resale', statistics, coinReasons);
  enchanter.stock.push(item);
  ledger.itemsSold += 1;
  log('shop', `${p.name} sell a ${item.name} to ${enchanter.name} for ${price} gp.`);
  return true;
}

/** Buy the best affordable item any member could use. Prices are steep on purpose. */
export function buyMagicItem(p: Party, services: TownServiceContext): boolean {
  const { town, reserve, pay, chronicleLog } = serviceVisit(p, services);
  const budget = p.gold - reserve;
  let best: { shop: Employer; item: MagicItem; hero: Hero } | null = null;
  for (const shop of town.employers) {
    if (shop.ruined) continue;
    for (const item of shop.stock) {
      if (item.price > budget) continue;
      const hero = pickRecipient(aliveMembers(p), item);
      if (!hero) continue;
      if (!best || item.price > best.item.price) best = { shop, item, hero };
    }
  }
  if (!best) return false;
  best.shop.stock = best.shop.stock.filter((i) => i !== best!.item);
  pay(p, best.shop, best.item.price, best.hero);
  const replaced = equipItem(best.hero, best.item);
  if (replaced) p.stash.push(replaced);
  chronicleLog('shop', `${best.hero.name} buys a ${best.item.name} from ${best.shop.name} for ${best.item.price} gp (${describeEffect(best.item.effect)}).`);
  return true;
}

/** Weekly dues keep a company on the guild's books; noble and faction contracts go through the guild. */
export function payGuildDues(p: Party, services: TownServiceContext): boolean {
  const { town, day, reserve, pay, log } = serviceVisit(p, services);
  const guild = serviceOf(town, 'guild');
  if (guild.ruined) return false;
  const due = p.duesPaidDay < 0 || day - p.duesPaidDay >= DUES_PERIOD_DAYS;
  if (!due) return false;
  const cost = GUILD_DUES_PER_LEVEL * partyLevel(p) * aliveMembers(p).length;
  if (p.gold - cost < reserve) {
    if (p.guildMember) {
      p.guildMember = false;
      log('shop', `${p.name} cannot pay their guild dues (${cost} gp). Their membership lapses.`);
    }
    return false;
  }
  pay(p, guild, cost);
  p.duesPaidDay = day;
  const joined = !p.guildMember;
  p.guildMember = true;
  log('shop', `${p.name} ${joined ? 'join the Adventurers’ Guild' : 'pay their guild dues'}: ${cost} gp.`);
  return true;
}

/** A donation at the temple buys the company a blessing for its next contract. */
export function buyBlessing(p: Party, services: TownServiceContext): boolean {
  const { town, reserve, pay, log } = serviceVisit(p, services);
  if (p.blessed) return false;
  const temple = serviceOf(town, 'temple');
  if (temple.ruined) return false;
  const level = partyLevel(p);
  const cost = BLESSING_COST_PER_LEVEL * level;
  if (p.gold - cost < reserve * 1.5) return false;
  pay(p, temple, cost);
  p.blessed = true;
  log('temple', `${p.name} leave ${cost} gp at the ${temple.name} and are blessed (+${BLESSING_HP_PER_LEVEL * level} hp on their next contract).`);
  return true;
}

/** Per-step inputs and the existing coin/event operations; no random draws. */
function serviceVisit(p: Party, services: TownServiceContext) {
  const { town, day, ledger, statistics, report } = services;
  const pay = (from: Party, to: Employer, amount: number, adventurer?: Hero) =>
    transfer(purse(from), treasury(to), amount, 'service', statistics, coinReasons, adventurer);
  const log = (kind: ServiceEvent['kind'], text: string) => report({ kind, text });
  const chronicleLog = (kind: ServiceEvent['kind'], text: string) => report({ kind, text, chronicle: true });
  const level = partyLevel(p);
  return { town, day, ledger, statistics, pay, log, chronicleLog, level, reserve: resurrectionCost(level), alive: aliveMembers(p) };
}

/** Who gets an item: whoever can use it and carries the least magic already. */
function pickRecipient(members: Hero[], item: MagicItem): Hero | undefined {
  const worth = (h: Hero) => h.items.reduce((s, i) => s + i.price, 0);
  return members
    .filter((h) => wantsItem(h, item))
    .sort((a, b) => a.items.length - b.items.length || worth(a) - worth(b))[0];
}
