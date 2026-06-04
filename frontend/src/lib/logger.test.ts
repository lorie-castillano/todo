import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock config to dev mode so all levels emit and we get pretty console output.
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

// Sentry is a no-op in these tests; we only assert console behavior.
vi.mock('@sentry/react', () => ({
  captureMessage: vi.fn(),
  addBreadcrumb: vi.fn(),
}))

import { logger } from './logger'

describe('logger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('emits info logs in dev mode', () => {
    logger.info('hello world')
    expect(console.info).toHaveBeenCalledOnce()
    const logged = (console.info as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(logged).toContain('INFO')
    expect(logged).toContain('hello world')
  })

  it('emits error logs with ERROR level', () => {
    logger.error('something broke')
    expect(console.error).toHaveBeenCalledOnce()
    const logged = (console.error as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(logged).toContain('ERROR')
    expect(logged).toContain('something broke')
  })

  it('includes context as a second console argument', () => {
    logger.warn('rate limit near', { count: 95 })
    const ctx = (console.warn as ReturnType<typeof vi.fn>).mock.calls[0][1]
    expect(ctx).toEqual({ count: 95 })
  })

  it('returns a stable correlation ID across calls', () => {
    const id1 = logger.getCorrelationId()
    const id2 = logger.getCorrelationId()
    expect(id1).toBe(id2)
    expect(id1.length).toBeGreaterThan(0)
  })

  it('embeds a short correlation ID prefix in the log line', () => {
    const cid = logger.getCorrelationId()
    logger.info('traced message')
    const logged = (console.info as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(logged).toContain(cid.slice(0, 8))
  })
})
