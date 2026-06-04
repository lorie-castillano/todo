import { defineConfig } from '@playwright/test'

// E2E tests run against the full Docker stack:
//   docker compose up -d  (starts frontend + backend + db)
//
// The frontend runs at :5173 with Vite proxy forwarding /api/* to backend:3000.
// Tests use Chromium only for speed — add more browsers in CI if needed.

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // sequential — tests share database state
  retries: 0,
  timeout: 15_000,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
})
