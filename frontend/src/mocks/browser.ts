// MSW browser integration
// This file is only imported in development (never in production or tests).

import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'
import { seedDatabase } from './db'

// Seed the mock database with initial data
seedDatabase()

// Create the service worker that intercepts requests
export const worker = setupWorker(...handlers)

// Start the worker when this module is imported
export async function startMocking() {
  return worker.start({
    onUnhandledRequest: 'bypass', // Let real requests through if no handler matches
  })
}
