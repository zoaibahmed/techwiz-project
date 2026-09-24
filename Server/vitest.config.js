import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 25000,
    hookTimeout: 35000,
    fileParallelism: false,
  },
});
