// Health check routes — the "routes layer".
//
// Two distinct checks, because orchestrators ask two different questions:
//
//   GET /health        → Liveness:  "Is the process alive?"
//                        If this fails, restart the container.
//
//   GET /health/ready  → Readiness: "Can it serve traffic right now?"
//                        If this fails, stop routing requests (but don't
//                        restart — the process is fine, a dependency isn't).
//
// Keeping them separate prevents a slow/unavailable database from causing
// pointless container restarts (which would make an outage worse).

import type { FastifyPluginAsync } from 'fastify'

// Track when the process started so we can report uptime.
const startedAt = Date.now()

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  // --- Liveness ---
  // Cheap and dependency-free. If the event loop can answer this, we're alive.
  fastify.get('/health', async () => {
    return {
      status: 'ok',
      uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
      timestamp: new Date().toISOString(),
    }
  })

  // --- Readiness ---
  // Today there are no external dependencies, so we're always ready.
  // In Lesson 5.2 we'll check the database connection here and return
  // 503 Service Unavailable if it's down.
  fastify.get('/health/ready', async (_req, reply) => {
    const checks = {
      // database: await checkDatabase(),  // ← added in Lesson 5.2
    }

    const allHealthy = Object.values(checks).every(Boolean)

    if (!allHealthy) {
      // 503 tells load balancers "don't send me traffic yet".
      return reply.code(503).send({ status: 'not-ready', checks })
    }

    return { status: 'ready', checks }
  })
}
