import type { Game, GameScenario } from '../../src/sim/game';

// Long runs measured up to 10s locally under suite contention. Allow plenty of
// room for a loaded machine/CI; ordinary tests retain Vitest's 5s timeout.
export const LONG_SIMULATION_TIMEOUT_MS = 120_000;

export type SimulationState = Pick<GameScenario, 'tick' | 'town' | 'parties' | 'quests' | 'lairs' | 'stats'>;

/** Read domain facts through Game's public regression interface. Its stable
 * serialization puts event history after these fields. Avoid parsing that
 * growing history on every observation; Game still owns serialization. */
export function readSimulationState(game: Game): SimulationState {
  const serialized = game.regressionState();
  const history = serialized.indexOf(',"events":');
  if (history === -1) throw new Error('Regression state is missing its event history boundary');
  return JSON.parse(`${serialized.slice(0, history)}}`) as SimulationState;
}
