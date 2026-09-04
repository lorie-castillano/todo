import { describe, it, expect, vi } from 'vitest'
import { withTimeout, TimeoutError } from './timeout.js'

describe('withTimeout', () => {
  it('resolves with the function result when it finishes in time', async () => {
    const result = await withTimeout(Promise.resolve('ok'), 100)
    expect(result).toBe('ok')
  })

  it('rejects with TimeoutError when the promise exceeds the timeout', async () => {
    const slow = new Promise<string>((resolve) => setTimeout(() => resolve('too late'), 200))
    await expect(withTimeout(slow, 10)).rejects.toBeInstanceOf(TimeoutError)
  })

  it('propagates the underlying error when the promise rejects before the timeout', async () => {
    const failing = Promise.reject(new Error('boom'))
    await expect(withTimeout(failing, 100)).rejects.toThrow('boom')
  })

  it('does not leave a dangling timer after the promise resolves', async () => {
    vi.useFakeTimers()
    const promise = withTimeout(Promise.resolve('ok'), 1000)
    const result = await promise
    expect(result).toBe('ok')
    vi.advanceTimersByTime(2000)
    vi.useRealTimers()
  })
})
