import { describe, it, expect } from 'vitest'
import { withRetry } from './retry.js'

describe('withRetry', () => {
  it('returns the result on the first attempt when the function succeeds', async () => {
    const result = await withRetry(() => Promise.resolve('ok'), { delayMs: 0 })
    expect(result).toBe('ok')
  })

  it('retries transient failures and eventually succeeds', async () => {
    let attempts = 0
    const result = await withRetry(
      () => {
        attempts++
        if (attempts < 3) {
          return Promise.reject(new Error('transient'))
        }
        return Promise.resolve('ok')
      },
      { maxAttempts: 3, delayMs: 0 }
    )
    expect(result).toBe('ok')
    expect(attempts).toBe(3)
  })

  it('stops retrying when shouldRetry returns false', async () => {
    let attempts = 0
    await expect(
      withRetry(
        () => {
          attempts++
          return Promise.reject(new Error('not found'))
        },
        {
          maxAttempts: 5,
          delayMs: 0,
          shouldRetry: (err) => !(err instanceof Error && err.message.includes('not found')),
        }
      )
    ).rejects.toThrow('not found')
    expect(attempts).toBe(1)
  })

  it('throws the last error after maxAttempts is exhausted', async () => {
    let attempts = 0
    await expect(
      withRetry(
        () => {
          attempts++
          return Promise.reject(new Error(`attempt ${attempts}`))
        },
        { maxAttempts: 2, delayMs: 0 }
      )
    ).rejects.toThrow('attempt 2')
    expect(attempts).toBe(2)
  })
})
