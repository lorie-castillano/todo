// Redis client factory — shared store for distributed rate limiting.
//
// Why Redis for rate limiting?
// - @fastify/rate-limit's default store is IN-MEMORY, scoped to a single
//   process. Run two backend instances behind a load balancer and each keeps
//   its own counter, so a user effectively gets `limit × instanceCount`
//   requests. That silently defeats the limit under horizontal scaling.
// - A shared Redis store gives all instances ONE counter, so the limit is
//   enforced globally no matter which instance serves a given request.
//
// See docs/ADR/007-system-design-scaling-posture.md for the full rationale.

import { Redis } from 'ioredis'
import type { Logger } from 'pino'

// Options tuned per @fastify/rate-limit's Redis recommendations.
export function createRedisClient(url: string, log: Logger): Redis {
  const client = new Redis(url, {
    // Fail fast instead of hanging a request while Redis is unreachable.
    connectTimeout: 500,

    // Don't retry a single command forever — surface the error quickly so
    // rate-limit's `skipOnError` (fail-open) can let the request through.
    maxRetriesPerRequest: 1,

    // Reject commands immediately when disconnected rather than buffering
    // them in an unbounded offline queue (which would delay requests).
    enableOfflineQueue: false,
  })

  // Log connection lifecycle. `error` MUST have a listener or ioredis will
  // throw on the process; we log and rely on fail-open behavior downstream.
  client.on('connect', () => log.info('Redis connected (rate-limit store)'))
  client.on('error', (err: Error) => log.error({ err }, 'Redis error'))

  return client
}
