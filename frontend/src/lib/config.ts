// Environment configuration
//
// Why a config module instead of reading import.meta.env directly?
// - Single source of truth: all env vars in one place
// - Fail-fast validation: missing required vars throw at startup, not silently
// - Type safety: callers get typed values, not `string | undefined`
// - Testability: easy to mock in tests by replacing this module
//
// Vite rules for env vars:
// - Only VITE_* vars are exposed to the browser (security boundary)
// - import.meta.env is replaced at build time (static, not runtime)
// - Use .env.development / .env.production / .env.local for overrides

// --- Helpers ---

function requireEnv(key: string): string {
  const value = import.meta.env[key] as string | undefined
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}\n` +
        `Copy .env.example to .env.development and fill in the values.`
    )
  }
  return value
}

function optionalEnv(key: string, fallback: string): string {
  return (import.meta.env[key] as string | undefined) ?? fallback
}

function boolEnv(key: string, fallback: boolean): boolean {
  const raw = import.meta.env[key] as string | undefined
  if (raw === undefined) return fallback
  return raw === 'true'
}

// --- Config ---
//
// `satisfies` checks the shape without widening literal types.
// This gives us autocomplete on `config.features.devtools` while
// still enforcing that the object matches the expected structure.

interface AppConfig {
  appName: string
  appVersion: string
  apiBaseUrl: string
  isDev: boolean
  isProd: boolean
  features: {
    devtools: boolean
    performanceMonitoring: boolean
  }
}

export const config: AppConfig = {
  appName: optionalEnv('VITE_APP_NAME', 'Todo App'),
  appVersion: optionalEnv('VITE_APP_VERSION', '0.0.0'),

  // Empty string = use relative URLs (works with MSW in dev, same-origin in prod)
  apiBaseUrl: optionalEnv('VITE_API_BASE_URL', ''),

  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,

  features: {
    devtools: boolEnv('VITE_FEATURE_DEVTOOLS', false),
    performanceMonitoring: boolEnv('VITE_FEATURE_PERFORMANCE_MONITORING', false),
  },
} satisfies AppConfig

// Re-export requireEnv for one-off required vars in other modules
export { requireEnv }
