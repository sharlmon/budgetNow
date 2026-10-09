import { defineConfig } from 'vitest/config'

// Unit tests only. The browser tests in tests/e2e are run by Playwright (npm run test:e2e).
export default defineConfig({
  test: { include: ['tests/**/*.test.ts'], exclude: ['tests/e2e/**', 'node_modules/**'] },
})
