import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './packages/fluid/src',
  testMatch: ['**/*.integration.ts'],
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: process.env['TEST_BASE_URL'] ?? 'http://localhost:6006',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit',   use: { ...devices['Desktop Safari'] } },
  ],
  webServer: process.env['TEST_BASE_URL']
    ? undefined
    : {
        command: 'pnpm --filter @neutro/storybook dev',
        url: 'http://localhost:6006',
        reuseExistingServer: !process.env['CI'],
        timeout: 120_000,
      },
})
