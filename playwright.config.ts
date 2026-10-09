import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { defineConfig } from '@playwright/test'

const port = 3100

// Browser tests run the real app (dev server with the dev-only auth bypass and an in-process Postgres), so every
// screen, the sync engine and the API are exercised together. Signing in through Clerk itself needs real
// credentials, so that one flow is checked by hand on a Vercel preview.
export default defineConfig({
  testDir: 'tests/e2e',
  workers: 1, // all tests share one account, so they run one at a time
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    // Locally use the Chrome already installed; CI downloads Playwright's own Chromium.
    channel: process.env.CI ? undefined : 'chrome',
    viewport: { width: 430, height: 900 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: `npx nuxt dev --port ${port}`,
    url: `http://localhost:${port}/api/state`,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
    env: { DEV_AUTH_BYPASS: '1', RATE_LIMIT_MULTIPLIER: '50', PGLITE_DIR: join(tmpdir(), `budgetnow-e2e-${process.pid}`) },
  },
})
