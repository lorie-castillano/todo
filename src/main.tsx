import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import './index.css'
import { router } from './router'
import { initSentry } from './lib/sentry'
import { initWebVitals } from './lib/webVitals'
import { logger } from './lib/logger'

// Initialize Sentry as early as possible to catch all errors.
// Only activates if VITE_SENTRY_DSN is set in environment.
initSentry()

// Initialize Web Vitals monitoring for performance metrics.
// Reports LCP, INP, CLS, TTFB, FCP to Sentry and console.
initWebVitals()

async function bootstrap() {
  logger.info('App bootstrapping', { correlationId: logger.getCorrelationId() })

  // Start MSW service worker in all environments.
  // This app has no real backend — MSW provides the API layer in both
  // dev and production. The service worker intercepts /api/* requests
  // and returns in-memory data (resets on page reload).
  const { startMocking } = await import('./mocks/browser')
  await startMocking()
  logger.debug('MSW mocking started')

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  )
  logger.info('App rendered')
}

bootstrap().catch((error) => {
  logger.error('App failed to bootstrap', {
    error: error instanceof Error ? error.message : String(error),
  })
})
