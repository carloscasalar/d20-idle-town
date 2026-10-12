/** The game's dice always use an explicit source, never the engine's ambient RNG. */
export interface DiceSource {
  int(min: number, max: number): number;
}

export interface DiceFormula {
  count: number;
  faces: number;
  bonus: number;
}

export interface DiceRoll {
  dice: number[];
  bonus: number;
  total: number;
}

export function parseDice(formula: string): DiceFormula {
  const match = /^(\d+)d(\d+)([+-]\d+)?$/.exec(formula);
  if (!match) throw new Error(`Invalid dice formula "${formula}"; expected NdM+K.`);
  const count = Number(match[1]);
  const faces = Number(match[2]);
  const bonus = Number(match[3] ?? 0);
  if (!Number.isSafeInteger(count) || count < 1 || !Number.isSafeInteger(faces) || faces < 1 || !Number.isSafeInteger(bonus)) {
    throw new Error(`Invalid dice formula "${formula}"; dice count and faces must be positive safe integers.`);
  }
  return { count, faces, bonus };
}

export function rollDice(formula: string, source: DiceSource): DiceRoll {
  const { count, faces, bonus } = parseDice(formula);
  const dice = Array.from({ length: count }, () => source.int(1, faces));
  return { dice, bonus, total: dice.reduce((sum, die) => sum + die, bonus) };
}

export function assuredHealing(formula: string): number {
  const { count, faces, bonus } = parseDice(formula);
  return count * (faces / 2 + 1) + bonus;
}
