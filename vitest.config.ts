import { defineConfig } from 'vitest/config';

// Hundreds of ticks finish in about 2s locally. A CI runner is several times
// slower than that and already exceeds Vitest's 5s default, so every test —
// including the next long simulation — gets this ceiling.
const LONG_SIMULATION_TIMEOUT_MS = 20_000;

export default defineConfig({
  test: {
    testTimeout: LONG_SIMULATION_TIMEOUT_MS,
  },
});
