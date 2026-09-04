import { describe, it, expect, vi } from 'vitest'
import { CircuitBreaker, CircuitBreakerOpenError } from './circuitBreaker.js'

describe('CircuitBreaker', () => {
  it('starts in CLOSED state and allows calls', async () => {
    const breaker = new CircuitBreaker()
    const result = await breaker.execute(() => Promise.resolve('ok'))
    expect(result).toBe('ok')
    expect(breaker.currentState).toBe('CLOSED')
  })

  it('remains CLOSED on intermittent failures below threshold', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 3 })
    let attempts = 0
    const failing = () => {
      attempts++
      return Promise.reject(new Error('boom'))
    }

    await expect(breaker.execute(failing)).rejects.toThrow('boom')
    await expect(breaker.execute(failing)).rejects.toThrow('boom')
    expect(breaker.currentState).toBe('CLOSED')
    expect(attempts).toBe(2)
  })

  it('opens after reaching failure threshold', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 2, openDurationMs: 100 })
    await expect(breaker.execute(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom')
    await expect(breaker.execute(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom')

    expect(breaker.currentState).toBe('OPEN')
    await expect(breaker.execute(() => Promise.resolve('ok'))).rejects.toBeInstanceOf(CircuitBreakerOpenError)
  })

  it('transitions to HALF_OPEN after open duration expires', async () => {
    vi.useFakeTimers()
    const breaker = new CircuitBreaker({ failureThreshold: 1, openDurationMs: 1000 })

    await expect(breaker.execute(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom')
    expect(breaker.currentState).toBe('OPEN')

    await vi.advanceTimersByTimeAsync(1000)
    expect(breaker.currentState).toBe('HALF_OPEN')

    vi.useRealTimers()
  })

  it('closes again after configured successes in HALF_OPEN', async () => {
    vi.useFakeTimers()
    const breaker = new CircuitBreaker({
      failureThreshold: 1,
      successThreshold: 2,
      openDurationMs: 1000,
      halfOpenMaxCalls: 2,
    })

    await expect(breaker.execute(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom')
    expect(breaker.currentState).toBe('OPEN')

    await vi.advanceTimersByTimeAsync(1000)
    const result1 = await breaker.execute(() => Promise.resolve('ok'))
    expect(result1).toBe('ok')
    expect(breaker.currentState).toBe('HALF_OPEN')

    const result2 = await breaker.execute(() => Promise.resolve('ok'))
    expect(result2).toBe('ok')
    expect(breaker.currentState).toBe('CLOSED')

    vi.useRealTimers()
  })

  it('reopens on a failure in HALF_OPEN state', async () => {
    vi.useFakeTimers()
    const breaker = new CircuitBreaker({
      failureThreshold: 1,
      successThreshold: 2,
      openDurationMs: 1000,
      halfOpenMaxCalls: 2,
    })

    await expect(breaker.execute(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom')
    expect(breaker.currentState).toBe('OPEN')

    await vi.advanceTimersByTimeAsync(1000)
    await breaker.execute(() => Promise.resolve('ok'))
    expect(breaker.currentState).toBe('HALF_OPEN')

    await expect(breaker.execute(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom')
    expect(breaker.currentState).toBe('OPEN')

    vi.useRealTimers()
  })

  it('limits concurrent calls in HALF_OPEN to halfOpenMaxCalls', async () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 1,
      successThreshold: 2,
      openDurationMs: 0,
      halfOpenMaxCalls: 1,
    })

    await expect(breaker.execute(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom')
    await breaker.execute(() => Promise.resolve('ok'))

    expect(breaker.currentState).toBe('HALF_OPEN')
    await expect(breaker.execute(() => Promise.resolve('ok'))).rejects.toBeInstanceOf(CircuitBreakerOpenError)
  })
})
