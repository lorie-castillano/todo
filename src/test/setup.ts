import '@testing-library/jest-dom'
import { beforeAll, afterAll, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { server } from '../mocks/server'
import { resetDatabase } from '../mocks/server'

// jsdom doesn't implement window.matchMedia. We polyfill it here so
// hooks like useReducedMotion (which call matchMedia) work in tests.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(), // deprecated, kept for compat
    removeListener: vi.fn(), // deprecated, kept for compat
    dispatchEvent: vi.fn(),
  })),
})

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
