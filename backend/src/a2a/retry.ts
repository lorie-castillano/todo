// Retry utility with exponential backoff.
//
// Agent-to-agent calls are network operations and can fail transiently
// (timeouts, 503s, connection resets). Retrying with backoff gives the
// remote agent a chance to recover without hammering it. The caller decides
// which errors are retriable via the `shouldRetry` predicate.

export interface RetryOptions {
  maxAttempts?: number
  delayMs?: number
  backoffMultiplier?: number
  shouldRetry?: (error: unknown) => boolean
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 3
  const delayMs = options.delayMs ?? 500
  const backoffMultiplier = options.backoffMultiplier ?? 2
  const shouldRetry = options.shouldRetry ?? (() => true)

  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      if (attempt === maxAttempts || !shouldRetry(error)) {
        throw error
      }

      const wait = delayMs * Math.pow(backoffMultiplier, attempt - 1)
      await new Promise<void>((resolve) => setTimeout(resolve, wait))
    }
  }

  // Unreachable because the loop either returns or throws, but TypeScript
  // needs a fallthrough value to satisfy the return type.
  throw lastError
}
