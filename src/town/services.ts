import { armorUpgradeCost, equipItem, wantsItem, potionCost, resurrectionCost, type Hero, type HeroEconomyConfig } from '../adventurers/hero';
import { aliveMembers, partyLevel, type Party } from '../adventurers/party';
import { freeze } from '../core/freeze';
import { listNames } from '../core/names';
import { describeEffect, resalePrice, type ItemConfig, type MagicItem } from '../items/items';
import { resolveSteps, runSteps, type Step } from '../core/steps';
import { purse, treasury, type Coin } from './coin';
import { serviceOf, type Employer, type Town } from './town';

/** Prices and limits for an idle hour in town. */
export interface TownServiceConfig {
  guildDuesPerLevel: number;
  duesPeriodDays: number;
  blessingCostPerLevel: number;
  blessingHpPerLevel: number;
  /** Gold that must remain after a blessing, as a multiple of the resurrection price. */
  blessingReserveFactor: number;
  /** Idle-hour order, by step name. `retirement` is the roster's step. */
  steps: readonly string[];
}

export const DEFAULT_TOWN_SERVICE_CONFIG: TownServiceConfig = freeze({
  guildDuesPerLevel: 15,
  duesPeriodDays: 7,
  blessingCostPerLevel: 40,
  blessingHpPerLevel: 3,
  blessingReserveFactor: 1.5,
  steps: ['potions', 'loot', 'items', 'dues', 'blessing', 'retirement', 'armour'],
});

/** The default idle-hour order. */
export const SERVICE_STEP_NAMES = DEFAULT_TOWN_SERVICE_CONFIG.steps;

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
  coin: Coin;
  /** Publish immediately, so subscribers see state at the same point as the event. */
  report: (event: ServiceEvent) => void;
  services: TownServiceConfig;
  heroes: HeroEconomyConfig;
  items: ItemConfig;
  /** Shop shelf size. The town section is its home. */
  maxStock: number;
}

/** One service may spend the hour; false allows the following step to try. */
export type TownServiceStep = Step<Party, TownServiceContext>;

/** Named town services. `retirement` is registered by the roster, not here. */
export const TOWN_SERVICE_STEPS: Readonly<Record<string, TownServiceStep>> = {
  potions: buyPotions,
  loot: sellLoot,
  items: buyMagicItem,
  dues: payGuildDues,
  blessing: buyBlessing,
  armour: buyArmour,
};

/** Every step a configuration may name, including the roster's retirement step. */
export const SERVICE_STEP_REGISTRY: readonly string[] = Object.freeze([...Object.keys(TOWN_SERVICE_STEPS), 'retirement']);

/**
 * The default order, including a retirement step that does nothing.
 * Game resolves `services.steps` and registers the roster's retirement step under that name.
 */
export function defaultTownServiceSteps(): readonly TownServiceStep[] {
  return resolveSteps(DEFAULT_TOWN_SERVICE_CONFIG.steps, { ...TOWN_SERVICE_STEPS, retirement: () => false });
}

/** Try caller-supplied steps in order, stopping as soon as one spends the hour.
 * A false result may still change state, such as a lapsed guild membership.
 * Regular purchases retain one resurrection's cost; blessings retain 1.5 times.
 */
export function visitTownServices(p: Party, services: TownServiceContext, steps: readonly TownServiceStep[]): boolean {
  return runSteps(p, services, steps);
}

export function buyPotions(p: Party, context: TownServiceContext): boolean {
  const { town, level, reserve, alive, pay, log, heroes } = serviceVisit(p, context);
  if (p.potions < alive.length) {
    const apothecary = serviceOf(town, 'apothecary');
    const cost = potionCost(level, heroes);
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

export function buyArmour(p: Party, context: TownServiceContext): boolean {
  const { town, reserve, alive, pay, log, heroes } = serviceVisit(p, context);
  const smith = serviceOf(town, 'smith');
  if (!smith.ruined) {
    // Everyone who can afford it gets fitted in the same visit, the worst-armoured first.
    const fitted: string[] = [];
    let bill = 0;
    for (const h of [...alive].sort((a, b) => a.armorTier - b.armorTier)) {
      if (h.armorTier >= heroes.maxArmorTier) continue;
      const cost = armorUpgradeCost(h.armorTier, h.level, heroes);
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
export function sellLoot(p: Party, context: TownServiceContext): boolean {
  const { town, ledger, log, items, maxStock } = serviceVisit(p, context);
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
  const price = Math.min(resalePrice(item, items), enchanter.treasury);
  if (enchanter.ruined || price <= 0 || enchanter.stock.length >= maxStock) {
    p.stash.push(item);
    return false;
  }
  context.coin.transfer(treasury(enchanter), purse(p), price, 'resale');
  enchanter.stock.push(item);
  ledger.itemsSold += 1;
  log('shop', `${p.name} sell a ${item.name} to ${enchanter.name} for ${price} gp.`);
  return true;
}

/** Buy the best affordable item any member could use. Prices are steep on purpose. */
export function buyMagicItem(p: Party, context: TownServiceContext): boolean {
  const { town, reserve, pay, chronicleLog } = serviceVisit(p, context);
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
export function payGuildDues(p: Party, context: TownServiceContext): boolean {
  const { town, day, reserve, pay, log, services } = serviceVisit(p, context);
  const guild = serviceOf(town, 'guild');
  if (guild.ruined) return false;
  const due = p.duesPaidDay < 0 || day - p.duesPaidDay >= services.duesPeriodDays;
  if (!due) return false;
  const cost = services.guildDuesPerLevel * partyLevel(p) * aliveMembers(p).length;
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
export function buyBlessing(p: Party, context: TownServiceContext): boolean {
  const { town, reserve, pay, log, services } = serviceVisit(p, context);
  if (p.blessed) return false;
  const temple = serviceOf(town, 'temple');
  if (temple.ruined) return false;
  const level = partyLevel(p);
  const cost = services.blessingCostPerLevel * level;
  if (p.gold - cost < reserve * services.blessingReserveFactor) return false;
  pay(p, temple, cost);
  p.blessed = true;
  log('temple', `${p.name} leave ${cost} gp at the ${temple.name} and are blessed (+${services.blessingHpPerLevel * level} hp on their next contract).`);
  return true;
}

/** Per-step inputs and the existing coin/event operations; no random draws. */
function serviceVisit(p: Party, context: TownServiceContext) {
  const { town, day, ledger, coin, report, services, heroes, items, maxStock } = context;
  const pay = (from: Party, to: Employer, amount: number, adventurer?: Hero) =>
    coin.transfer(purse(from), treasury(to), amount, 'service', adventurer);
  const log = (kind: ServiceEvent['kind'], text: string) => report({ kind, text });
  const chronicleLog = (kind: ServiceEvent['kind'], text: string) => report({ kind, text, chronicle: true });
  const level = partyLevel(p);
  return {
    town, day, ledger, coin, pay, log, chronicleLog, level, services, heroes, items, maxStock,
    reserve: resurrectionCost(level, heroes), alive: aliveMembers(p),
  };
}

/** Who gets an item: whoever can use it and carries the least magic already. */
function pickRecipient(members: Hero[], item: MagicItem): Hero | undefined {
  const worth = (h: Hero) => h.items.reduce((s, i) => s + i.price, 0);
  return members
    .filter((h) => wantsItem(h, item))
    .sort((a, b) => a.items.length - b.items.length || worth(a) - worth(b))[0];
}
