import '@testing-library/jest-dom'
import { beforeAll, afterAll, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import { server } from '../mocks/server'
import { resetDatabase } from '../mocks/server'

// Start MSW server before all tests
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' })
})

// Reset handlers and database after each test
// This ensures test isolation — no state leaks between tests
afterEach(() => {
  server.resetHandlers()
  resetDatabase()
  cleanup()
})

// Clean up after all tests are done
afterAll(() => {
  server.close()
})
