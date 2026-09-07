import { buildHero, Encounter, type BattleLog, type Creature } from 'battlecast-engine';
import { combinedEffect, heroAc, type Hero } from '../adventurers/hero';
import type { EncounterSpec } from '../quests/encounters';

export type CombatWinner = 'party' | 'monsters' | 'retreat' | 'stalemate';

export interface HeroResult {
  heroId: string;
  hp: number;
  /** Still breathing when the dust settles (includes stabilised "dying" heroes). */
  alive: boolean;
  kills: number;
}

export interface CombatOutcome {
  winner: CombatWinner;
  rounds: number;
  /** Battle log lines, straight from the engine's narration. */
  lines: string[];
  heroes: HeroResult[];
  /** Monster XP the party earns (0 unless it won). */
  xpEarned: number;
}

const MAX_ROUNDS = 30;

/**
 * Runs one encounter through battlecast-engine and maps the result back onto
 * the game's heroes. Heroes are inserted with their persistent max HP and any
 * damage they were already carrying.
 */
export interface CombatOptions {
  /** A temple blessing: extra hit points for the whole company. */
  blessingHp?: number;
}

/**
 * Everything the game layers on the class chassis, expressed as engine overrides:
 * the smith's armour, magic items and a blessing. Hit points go through
 * `hpOverride` (which the engine prefers over `hitPointBonus`); the +1 weapon
 * rewrites the hero's main weapon with the class numbers plus the bonus.
 */
export function heroOverrides(h: Hero, opts: CombatOptions = {}): NonNullable<Parameters<Encounter['addCreature']>[0]['heroOverrides']> {
  const fx = combinedEffect(h);
  const out: NonNullable<Parameters<Encounter['addCreature']>[0]['heroOverrides']> = {
    hpOverride: h.maxHp + fx.hp + (opts.blessingHp ?? 0),
    displayName: h.name,
  };
  const acBonus = h.armorTier + fx.ac;
  if (acBonus > 0) out.acOverride = heroAc(h);
  if (fx.speed > 0) out.speedOverride = 30 + fx.speed;
  if (fx.resistances.length > 0) out.additionalResistances = fx.resistances;
  if (fx.weaponBonus > 0) {
    const base = buildHero(h.heroClass, h.level);
    const main = base.actions.find((a) => a.attackBonus !== undefined && typeof a.damage === 'string');
    if (main && main.attackBonus !== undefined) {
      const damage = main.damage as string;
      const m = /^(\d+d\d+)([+-]\d+)?$/.exec(damage.trim());
      const bonusDamage = m ? `${m[1]}${fmtBonus((m[2] ? Number(m[2]) : 0) + fx.weaponBonus)}` : `${damage}+${fx.weaponBonus}`;
      out.weapon = {
        name: `${main.name} +${fx.weaponBonus}`,
        die: m ? m[1]! : '1d8',
        damageType: main.damageType ?? 'slashing',
        type: main.type === 'ranged' ? 'ranged' : 'melee',
        reach: main.reach,
        range: main.range,
        attackBonusOverride: main.attackBonus + fx.weaponBonus,
        damageOverride: bonusDamage,
      };
    }
  }
  return out;
}

function fmtBonus(n: number): string {
  return n === 0 ? '' : n > 0 ? `+${n}` : `${n}`;
}

export function runCombat(heroes: Hero[], spec: EncounterSpec, seed: number, opts: CombatOptions = {}): CombatOutcome {
  const fighters = heroes.filter((h) => h.alive);
  const enc = new Encounter({ gridSize: 16, seed });
  const idByHero = new Map<string, string>();
  const heroByCreature = new Map<string, Hero>();

  for (const h of fighters) {
    const [added] = enc.addCreature({
      heroClass: h.heroClass,
      heroLevel: h.level,
      team: 'blue',
      heroOverrides: heroOverrides(h, opts),
    });
    if (!added) throw new Error(`engine refused hero ${h.name}`);
    idByHero.set(h.id, added.id);
    heroByCreature.set(added.name, h);
  }
  for (const group of spec.monsters) {
    enc.addCreature({ monster: group.name, team: 'red', count: group.count });
  }

  enc.start();
  for (const h of fighters) {
    const carried = h.maxHp - h.hp;
    if (carried > 0) enc.damage(idByHero.get(h.id)!, carried);
  }

  const lines: string[] = [];
  const kills = new Map<string, number>();
  let lastDamageActor: string | null = null;
  let rounds = 0;
  let winner: 'red' | 'blue' | 'draw' | null = null;
  let retreated = false;
  for (let i = 0; i < MAX_ROUNDS; i++) {
    const r = enc.runRound();
    rounds = r.round;
    for (const log of r.logs) {
      lines.push(log.details);
      if (log.type === 'damage') lastDamageActor = log.actor;
      if (log.type === 'death') creditKill(log, lastDamageActor, heroByCreature, kills);
    }
    if (r.isComplete) {
      winner = r.winner;
      break;
    }
    if (shouldFlee(enc.creatures, fighters.length)) {
      retreated = true;
      break;
    }
  }

  const partyWon = winner === 'blue';
  const results: HeroResult[] = [];
  for (const h of fighters) {
    const c = enc.creatures.find((x) => x.id === idByHero.get(h.id));
    if (!c) continue;
    let hp = Math.max(0, c.currentHp);
    let alive = c.isAlive;
    if (alive && hp <= 0) {
      // Dying but not dead. Winners stabilise their friends; anyone left on the field is finished off.
      if (partyWon) hp = 1;
      else alive = false;
    }
    // Bonus hit points (items, blessings) are a buffer on top; what the hero keeps is capped at their own maximum.
    results.push({ heroId: h.id, hp: alive ? Math.max(1, Math.min(h.maxHp, hp)) : 0, alive, kills: kills.get(h.name) ?? 0 });
  }

  const outcome: CombatWinner = partyWon ? 'party' : retreated ? 'retreat' : winner === 'red' ? 'monsters' : 'stalemate';
  return {
    winner: outcome,
    rounds,
    lines,
    heroes: results,
    xpEarned: partyWon ? spec.totalXp : 0,
  };
}

/**
 * Adventurers are not the engine's fight-to-the-death AI. Once half the company is
 * down and the enemy still has most of its hit points, whoever can still run does.
 */
function shouldFlee(creatures: Creature[], startedWith: number): boolean {
  const standing = creatures.filter((c) => c.team === 'blue' && c.isAlive && c.currentHp > 0).length;
  if (standing === 0 || standing > startedWith / 2) return false;
  const monsters = creatures.filter((c) => c.team === 'red');
  const maxHp = monsters.reduce((s, m) => s + m.maxHp, 0);
  const curHp = monsters.reduce((s, m) => s + Math.max(0, m.currentHp), 0);
  return maxHp > 0 && curHp / maxHp > 0.5;
}

/**
 * The engine's death line names the victim as `actor`; the killing blow is the
 * damage entry right before it. Credit that hero, unless the victim was a hero too.
 */
function creditKill(
  death: BattleLog,
  lastDamageActor: string | null,
  heroByCreature: Map<string, Hero>,
  kills: Map<string, number>,
): void {
  if (!lastDamageActor || heroByCreature.has(death.actor)) return;
  const hero = heroByCreature.get(lastDamageActor);
  if (!hero) return;
  kills.set(hero.name, (kills.get(hero.name) ?? 0) + 1);
}
