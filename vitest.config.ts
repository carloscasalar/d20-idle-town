import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Long simulation tests opt into the shared allowance in test/helpers/simulation.ts.
    testTimeout: 5_000,
  },
});
