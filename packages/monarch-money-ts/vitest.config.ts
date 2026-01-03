import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'src/**/*.{test,spec}.?(c|m)[jt]s?(x)',
    ],
    exclude: ['node_modules', 'dist', '.git', 'src/**/*.int.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'coverage/**',
        'dist/**',
        'node_modules/**',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        '**/index.{js,ts}',
      ],
    },
  },
}) 