export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

export interface CircuitBreakerOptions {
  failureThreshold?: number
  successThreshold?: number
  openDurationMs?: number
  halfOpenMaxCalls?: number
}

export class CircuitBreakerOpenError extends Error {
  constructor(message = 'Circuit breaker is open') {
    super(message)
    this.name = 'CircuitBreakerOpenError'
  }
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED'
  private failureCount = 0
  private successCount = 0
  private halfOpenCount = 0
  private nextAttempt = 0

  constructor(private readonly options: CircuitBreakerOptions = {}) {}

  get currentState(): CircuitState {
    if (this.state === 'OPEN' && Date.now() >= this.nextAttempt) {
      this.state = 'HALF_OPEN'
      this.halfOpenCount = 0
      this.successCount = 0
    }
    return this.state
  }

  getCurrentStateForTest(): CircuitState {
    return this.state
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new CircuitBreakerOpenError()
      }
      this.state = 'HALF_OPEN'
      this.halfOpenCount = 0
      this.successCount = 0
    }

    if (this.state === 'HALF_OPEN') {
      const halfOpenMaxCalls = this.options.halfOpenMaxCalls ?? 1
      if (this.halfOpenCount >= halfOpenMaxCalls) {
        throw new CircuitBreakerOpenError()
      }
      this.halfOpenCount++
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (err) {
      this.onFailure()
      throw err
    }
  }

  private onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.successCount++
      const successThreshold = this.options.successThreshold ?? 1
      if (this.successCount >= successThreshold) {
        this.reset()
      }
    } else {
      this.failureCount = 0
    }
  }

  private onFailure(): void {
    const failureThreshold = this.options.failureThreshold ?? 3
    const openDurationMs = this.options.openDurationMs ?? 5000

    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN'
      this.nextAttempt = Date.now() + openDurationMs
      return
    }

    this.failureCount++
    if (this.failureCount >= failureThreshold) {
      this.state = 'OPEN'
      this.nextAttempt = Date.now() + openDurationMs
    }
  }

  private reset(): void {
    this.state = 'CLOSED'
    this.failureCount = 0
    this.successCount = 0
    this.halfOpenCount = 0
    this.nextAttempt = 0
  }
}
