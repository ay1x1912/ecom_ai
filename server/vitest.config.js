import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    /**
     * Test files share one MySQL database, so they must not run at the same time —
     * one file's truncation would wipe another's fixtures mid-assertion.
     * Sequential files, with tests inside a file running in order.
     */
    fileParallelism: false,
    sequence: { concurrent: false },
    setupFiles: ['./tests/setup.js'],
    // Concurrency and payment tests do real work against the database.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    include: ['tests/**/*.test.js'],
  },
});
