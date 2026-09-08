import { buildHero, Encounter, getMonsterByName, type BattleLog, type Creature, type HeroClassName, type MonsterData } from 'battlecast-engine';
import { Rng } from '../core/rng';
import { combinedEffect, heroAc, skillBonus, WEAPON_CLASSES, type Hero } from '../adventurers/hero';
import type { EncounterSpec } from '../quests/encounters';

export type CombatWinner = 'party' | 'monsters' | 'retreat' | 'stalemate';

export interface HeroResult {
  heroId: string;
  hp: number;
  /** Still breathing when the dust settles (includes stabilised "dying" heroes). */
  alive: boolean;
  kills: number;
}

export type Ambush = 'party' | 'monsters' | null;
/** How an ambush is sprung: closing in from every side, or hitting the back line from behind. */
export type AmbushTactic = 'surround' | 'rear';

export interface CombatOutcome {
  winner: CombatWinner;
  rounds: number;
  /** Who caught whom unawares, if anyone. */
  ambush: Ambush;
  /** One sentence on how the fight opened. */
  opening: string;
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
  /** No running from this one (a boss in its own hall). */
  noRetreat?: boolean;
  /** Deep in a lair the defenders are ever more likely to see the company coming: fight index and total. */
  lairDepth?: { index: number; total: number };
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
  const rng = new Rng(seed);
  const enc = new Encounter({ gridSize: GRID, seed });
  const idByHero = new Map<string, string>();
  const heroByCreature = new Map<string, Hero>();

  const monsters: MonsterData[] = [];
  for (const group of spec.monsters) {
    const data = getMonsterByName(group.name);
    if (data) for (let i = 0; i < group.count; i++) monsters.push(data);
  }
  const { ambush, tactic, opening } = resolveOpening(rng, fighters, monsters, opts);
  const layout = deploy(rng, fighters, monsters, ambush, tactic);

  const taken = new Set<string>();
  const place = (wanted: { x: number; y: number } | undefined, add: (pos?: { x: number; y: number }) => void) => {
    if (!wanted) return add();
    for (const pos of candidates(rng, wanted)) {
      if (taken.has(`${pos.x},${pos.y}`)) continue;
      try {
        add(pos);
        taken.add(`${pos.x},${pos.y}`);
        return;
      } catch {
        // occupied by a larger footprint or terrain; try the next cell
      }
    }
    add();
  };

  fighters.forEach((h, i) => {
    place(layout.party[i], (position) => {
      const [added] = enc.addCreature({
        heroClass: h.heroClass,
        heroLevel: h.level,
        team: 'blue',
        heroOverrides: heroOverrides(h, opts),
        ...(position ? { position } : {}),
      });
      if (!added) throw new Error(`engine refused hero ${h.name}`);
      idByHero.set(h.id, added.id);
      heroByCreature.set(added.name, h);
    });
  });
  const monsterIds: string[] = [];
  monsters.forEach((m, i) => {
    place(layout.monsters[i], (position) => {
      const [added] = enc.addCreature({ monster: m.name, team: 'red', ...(position ? { position } : {}) });
      if (added) monsterIds.push(added.id);
    });
  });

  enc.start();
  for (const h of fighters) {
    const carried = h.maxHp - h.hp;
    if (carried > 0) enc.damage(idByHero.get(h.id)!, carried);
  }
  // Surprise, 2024 rules: the surprised side rolls initiative at a disadvantage; here a flat -5.
  if (ambush === 'monsters') penaliseInitiative(enc, fighters.map((h) => idByHero.get(h.id)!));
  if (ambush === 'party') penaliseInitiative(enc, monsterIds);

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
    if (!opts.noRetreat && shouldFlee(enc.creatures, fighters.length)) {
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
    ambush,
    opening,
    lines: [opening, ...lines],
    heroes: results,
    xpEarned: partyWon ? spec.totalXp : 0,
  };
}

const GRID = 16;
const CENTER = { x: 7.5, y: 7.5 };
const SURPRISE_INITIATIVE_PENALTY = 5;

/** Knock the surprised creatures down the initiative order before the first turn is taken. */
function penaliseInitiative(enc: Encounter, ids: string[]): void {
  const state = enc.state;
  if (!state) return;
  const surprised = new Set(ids);
  for (const c of state.creatures) if (surprised.has(c.id)) c.initiative -= SURPRISE_INITIATIVE_PENALTY;
  const byId = new Map(state.creatures.map((c) => [c.id, c]));
  const before = new Map(state.initiativeOrder.map((id, i) => [id, i]));
  state.initiativeOrder.sort((a, b) => (byId.get(b)?.initiative ?? 0) - (byId.get(a)?.initiative ?? 0) || (before.get(a) ?? 0) - (before.get(b) ?? 0));
}

// ---------------------------------------------------------------- who sees whom

function mod(score: number): number {
  return Math.floor((score - 10) / 2);
}

function monsterSkill(m: MonsterData, skill: 'Stealth' | 'Perception'): number {
  const trained = m.skills?.[skill];
  if (typeof trained === 'number') return trained;
  return mod(skill === 'Stealth' ? m.abilities.dex : m.abilities.wis);
}

/** Passive Perception as printed in the stat block, else 10 plus the bonus. */
function monsterPassivePerception(m: MonsterData): number {
  const printed = /Passive Perception (\d+)/i.exec(m.senses ?? '');
  return printed ? Number(printed[1]) : 10 + monsterSkill(m, 'Perception');
}

function heroPassivePerception(h: Hero): number {
  return 10 + skillBonus(h, 'Perception');
}

/** A group sneaks if at least half of them beat the other side's sharpest passive Perception. */
function groupStealth(rng: Rng, bonuses: number[], passive: number): { passed: number; needed: number; success: boolean } {
  const passed = bonuses.filter((b) => rng.int(1, 20) + b >= passive).length;
  const needed = Math.ceil(bonuses.length / 2);
  return { passed, needed, success: passed >= needed };
}

/**
 * Chance decides who spots whom first; the side that does tries to sneak up.
 * Deep in a lair the defenders are more and more likely to be the ones watching.
 */
function resolveOpening(
  rng: Rng,
  fighters: Hero[],
  monsters: MonsterData[],
  opts: CombatOptions,
): { ambush: Ambush; tactic: AmbushTactic; opening: string } {
  const tactic: AmbushTactic = rng.chance(0.5) ? 'surround' : 'rear';
  const how = tactic === 'surround' ? 'closing in from every side' : 'coming up behind the back line';
  if (fighters.length === 0 || monsters.length === 0) return { ambush: null, tactic, opening: 'The field is empty.' };
  let monstersFirst = 0.3;
  if (opts.lairDepth) monstersFirst = 0.3 + 0.5 * (opts.lairDepth.index / Math.max(1, opts.lairDepth.total - 1));
  const partyFirst = (1 - monstersFirst) * 0.43;
  const roll = rng.next();
  const foe = describeMonsters(monsters);
  if (roll < monstersFirst) {
    const passive = Math.max(...fighters.map(heroPassivePerception));
    const check = groupStealth(rng, monsters.map((m) => monsterSkill(m, 'Stealth')), passive);
    const dice = `Stealth ${check.passed}/${monsters.length} vs passive Perception ${passive}`;
    return check.success
      ? { ambush: 'monsters', tactic, opening: `Ambush! ${capitalizeFirst(foe)} catch the company unawares, ${how} (${dice}).` }
      : { ambush: null, tactic, opening: `${capitalizeFirst(foe)} try to sneak up, but the company spots them (${dice}).` };
  }
  if (roll < monstersFirst + partyFirst) {
    const passive = Math.max(...monsters.map(monsterPassivePerception));
    const check = groupStealth(rng, fighters.map((h) => skillBonus(h, 'Stealth')), passive);
    const dice = `Stealth ${check.passed}/${fighters.length} vs passive Perception ${passive}`;
    return check.success
      ? { ambush: 'party', tactic, opening: `The company gets the drop on ${foe}, ${how} (${dice}).` }
      : { ambush: null, tactic, opening: `The company tries to sneak up on ${foe}, but is spotted (${dice}).` };
  }
  return { ambush: null, tactic, opening: `Both sides see each other at once.` };
}

function describeMonsters(monsters: MonsterData[]): string {
  const counts = new Map<string, number>();
  for (const m of monsters) counts.set(m.name, (counts.get(m.name) ?? 0) + 1);
  return [...counts.entries()].map(([n, c]) => (c > 1 ? `${c}x ${n}` : `the ${n}`)).join(', ');
}

function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// ---------------------------------------------------------------- where everyone starts

interface Layout {
  party: ({ x: number; y: number } | undefined)[];
  monsters: ({ x: number; y: number } | undefined)[];
}

const FRONT_LINE = new Set<HeroClassName>(WEAPON_CLASSES.filter((c) => c !== 'Rogue' && c !== 'Ranger'));

/** Rows fan out from the middle: 7, 8, 6, 9, 5, 10 ... */
function rows(count: number, spacing = 1): number[] {
  const out: number[] = [];
  for (let i = 0; out.length < count; i++) {
    const off = Math.ceil(i / 2) * spacing;
    out.push(i % 2 === 0 ? 7 + off : 7 - off);
  }
  return out.map((y) => Math.max(0, Math.min(GRID - 1, y)));
}

/**
 * Company on the right, front line ahead of the back line; monsters on the
 * left, minions (the cheapest) ahead of their betters, or scattered when there
 * are only a couple. An ambush either puts the surprised side in a loose knot
 * in the middle with the ambushers in a ring around them, or leaves the
 * surprised side in marching order and drops the ambushers behind its back line.
 */
function deploy(rng: Rng, fighters: Hero[], monsters: MonsterData[], ambush: Ambush, tactic: AmbushTactic): Layout {
  if (ambush === 'monsters' && tactic === 'surround') {
    const party = knot(rng, fighters.length);
    return { party, monsters: ring(rng, monsters.length, party) };
  }
  if (ambush === 'party' && tactic === 'surround') {
    const mons = knot(rng, monsters.length);
    return { party: ring(rng, fighters.length, mons), monsters: mons };
  }
  if (ambush === 'monsters') {
    // The company marches further into the field; the monsters come out behind its casters.
    return { party: partyFormation(fighters, 7, 10), monsters: rearGuard(rng, monsters.length, 13) };
  }
  if (ambush === 'party') {
    // The monsters sit further right; the company comes at their leaders from behind.
    return { party: rearGuard(rng, fighters.length, 2), monsters: monsterFormation(rng, monsters, 8, 5) };
  }
  return { party: partyFormation(fighters, 10, 13), monsters: monsterFormation(rng, monsters, 5, 2) };
}

function partyFormation(fighters: Hero[], frontX: number, backX: number): Layout['party'] {
  const front = fighters.map((h, i) => [h, i] as const).filter(([h]) => FRONT_LINE.has(h.heroClass));
  const back = fighters.map((h, i) => [h, i] as const).filter(([h]) => !FRONT_LINE.has(h.heroClass));
  const party: Layout['party'] = new Array(fighters.length);
  rows(front.length).forEach((y, k) => (party[front[k]![1]] = { x: frontX, y }));
  rows(back.length).forEach((y, k) => (party[back[k]![1]] = { x: backX, y }));
  return party;
}

function monsterFormation(rng: Rng, monsters: MonsterData[], frontX: number, backX: number): Layout['monsters'] {
  const mons: Layout['monsters'] = new Array(monsters.length);
  if (monsters.length <= 2) {
    monsters.forEach((_, i) => (mons[i] = { x: rng.int(Math.max(1, backX - 1), frontX + 1), y: rng.int(2, 13) }));
    return mons;
  }
  const sorted = monsters.map((m, i) => [m, i] as const).sort((a, b) => a[0].xp - b[0].xp);
  const cheapest = sorted[0]![0].xp;
  const minions = sorted.filter(([m]) => m.xp <= cheapest * 2.5 || m.xp < sorted[sorted.length - 1]![0].xp / 3);
  const leaders = sorted.filter((e) => !minions.includes(e));
  rows(minions.length, 2).forEach((y, k) => (mons[minions[k]![1]] = { x: frontX, y }));
  rows(leaders.length, 2).forEach((y, k) => (mons[leaders[k]![1]] = { x: backX, y }));
  return mons;
}

/** A line two deep at the given column, jittered so it reads as a rush rather than a parade. */
function rearGuard(rng: Rng, count: number, x: number): { x: number; y: number }[] {
  return rows(count).map((y, i) => ({ x: clamp(x + (i % 2 === 0 ? 0 : rng.int(0, 1))), y }));
}

/** A loose cluster near the middle of the field. */
function knot(rng: Rng, count: number): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  while (out.length < count) {
    const p = { x: rng.int(6, 9), y: rng.int(5, 10) };
    if (!out.some((o) => o.x === p.x && o.y === p.y)) out.push(p);
  }
  return out;
}

/** Evenly spaced around the knot, three to four squares out. */
function ring(rng: Rng, count: number, around: { x: number; y: number }[]): { x: number; y: number }[] {
  const cx = around.reduce((s, p) => s + p.x, 0) / Math.max(1, around.length) || CENTER.x;
  const cy = around.reduce((s, p) => s + p.y, 0) / Math.max(1, around.length) || CENTER.y;
  const start = rng.next() * Math.PI * 2;
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    const a = start + (i / count) * Math.PI * 2;
    const r = 3 + (i % 2);
    out.push({ x: clamp(Math.round(cx + Math.cos(a) * r)), y: clamp(Math.round(cy + Math.sin(a) * r)) });
  }
  return out;
}

function clamp(v: number): number {
  return Math.max(0, Math.min(GRID - 1, v));
}

/** The wanted cell first, then its neighbours in a widening, shuffled search. */
function candidates(rng: Rng, wanted: { x: number; y: number }): { x: number; y: number }[] {
  const out = [wanted];
  for (let d = 1; d <= 3; d++) {
    const shell: { x: number; y: number }[] = [];
    for (let dx = -d; dx <= d; dx++) for (let dy = -d; dy <= d; dy++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== d) continue;
      const x = wanted.x + dx, y = wanted.y + dy;
      if (x >= 0 && y >= 0 && x < GRID && y < GRID) shell.push({ x, y });
    }
    out.push(...rng.shuffle(shell));
  }
  return out;
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
