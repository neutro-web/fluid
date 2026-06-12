import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'packages/fluid/src/core/**/*.test.ts',
      'packages/fluid/src/testing/**/*.test.ts',
      'packages/fluid/src/tokens/**/*.test.ts',
    ],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
})
