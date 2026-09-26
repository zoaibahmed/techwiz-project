import { defineConfig } from 'vitest/config';

// Tests run against their own database so they can never alter the data the app shows.
const TEST_DB_NAME = 'techwiz_db_test';

export default defineConfig({
  test: {
    testTimeout: 25000,
    hookTimeout: 35000,
    fileParallelism: false,
    env: { MONGODB_DB_NAME: TEST_DB_NAME },
    globalSetup: './tests/global-setup.js',
  },
});
