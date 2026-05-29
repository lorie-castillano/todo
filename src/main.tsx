import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import './index.css'
import { router } from './router'
import { initSentry } from './lib/sentry'

// Initialize Sentry as early as possible to catch all errors.
// Only activates if VITE_SENTRY_DSN is set in environment.
initSentry()

async function bootstrap() {
  // Start MSW service worker in all environments.
  // This app has no real backend — MSW provides the API layer in both
  // dev and production. The service worker intercepts /api/* requests
  // and returns in-memory data (resets on page reload).
  const { startMocking } = await import('./mocks/browser')
  await startMocking()

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  )
}

bootstrap()
