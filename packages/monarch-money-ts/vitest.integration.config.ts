import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.int.test.ts'],
    exclude: ['node_modules', 'dist', '.git'],
    sequence: { concurrent: false },
    maxWorkers: 1,
  },
})
