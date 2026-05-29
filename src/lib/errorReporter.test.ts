import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { reportError, reportBoundaryError } from './errorReporter'

// Mock the config module so we can control isDev/isProd per test.
// vi.mock is hoisted to the top, so the factory must not reference outer vars.
vi.mock('./config', () => ({
  config: {
    appName: 'Todo App',
    appVersion: '1.0.0',
    apiBaseUrl: '',
    isDev: true,
    isProd: false,
    features: { devtools: false, performanceMonitoring: false },
  },
}))

describe('errorReporter', () => {
  beforeEach(() => {
    // Spy on console.error so we can assert it was called without noisy output
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('logs the error message to console in dev', () => {
    const error = new Error('boom')
    reportError({ error })

    expect(console.error).toHaveBeenCalledOnce()
    const logged = (console.error as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(logged).toContain('boom')
    expect(logged).toContain('Error')
  })

  it('includes context in the formatted report', () => {
    const error = new Error('with context')
    reportError({ error, context: { userId: 42 } })

    const logged = (console.error as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(logged).toContain('userId')
    expect(logged).toContain('42')
  })

  it('reportBoundaryError forwards error and component stack', () => {
    const error = new Error('boundary error')
    const errorInfo = { componentStack: '\n  at App\n  at Root' }

    reportBoundaryError(error, errorInfo)

    const logged = (console.error as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(logged).toContain('boundary error')
    expect(logged).toContain('Component stack')
  })
})
