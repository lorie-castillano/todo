// Sentry initialization
//
// Why a separate module?
// - Sentry.init() must run once at app startup, before any errors occur
// - Keeps initialization logic out of main.tsx
// - Easy to conditionally enable/disable based on config
//
// To activate: set VITE_SENTRY_DSN in .env.production (or .env.local for testing)

import * as Sentry from '@sentry/react'

export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined

  if (!dsn) {
    // Dev mode or missing config — Sentry stays disabled, no-op
    return
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE, // 'development' | 'production'
    release: import.meta.env.VITE_APP_VERSION,

    // Performance monitoring (optional, sends Web Vitals)
    integrations: [
      Sentry.browserTracingIntegration(),
    ],

    // Only sample 10% of sessions for performance traces
    // (adjust based on your Sentry plan limits)
    tracesSampleRate: 0.1,

    // Only send errors in production (dev errors are too noisy)
    beforeSend(event) {
      // TODO: Remove this comment and uncomment the DEV check when ready for production
      // if (import.meta.env.DEV) {
      //   // Log to console instead of sending in dev
      //   console.log('[Sentry] Would send error:', event)
      //   return null // Drop the event
      // }
      return event
    },
  })

  console.log('[Sentry] Initialized for production error tracking')
}

// Re-export for convenience
export { Sentry }
