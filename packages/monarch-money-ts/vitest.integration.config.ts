import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.int.test.ts'],
    exclude: ['node_modules', 'dist', '.git'],
    sequence: { concurrent: false },
    testTimeout: 30000, // 30 seconds for integration tests hitting real APIs
    // Force all tests through a single worker thread to avoid API rate limiting
    // and shared auth state issues. Both min/max must be 1 to prevent thread pool
    // conflicts (vitest defaults minThreads to CPU count, which would exceed maxThreads).
    poolOptions: {
      threads: {
        minThreads: 1,
        maxThreads: 1,
      }
    }
  },
})
