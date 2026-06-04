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

  // MSW cleanup: always unregister any cached service worker first.
  // This ensures a clean slate regardless of which mode we're switching to.
  // Without this, a previously registered MSW worker keeps intercepting
  // requests even after switching to the real backend.
  const registrations = await navigator.serviceWorker.getRegistrations()
  for (const registration of registrations) {
    if (registration.active?.scriptURL.includes('mockServiceWorker')) {
      await registration.unregister()
      logger.debug('MSW service worker unregistered')
    }
  }

  // Start MSW ONLY when there's no real backend.
  // When VITE_USE_BACKEND=true, the Vite dev server proxies /api/*
  // to the Fastify backend on :3000.
  const useBackend = import.meta.env.VITE_USE_BACKEND === 'true'
  if (!useBackend) {
    const { startMocking } = await import('./mocks/browser')
    await startMocking()
    logger.debug('MSW mocking started')
  } else {
    logger.info('Using real backend (MSW disabled)')
  }

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
