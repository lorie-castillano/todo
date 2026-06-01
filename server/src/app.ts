// App factory — builds a fully-configured Fastify instance WITHOUT
// starting to listen on a port.
//
// Why separate "build" from "listen"?
// - Testability: tests call buildApp() then app.inject({ method, url }) to
//   fire simulated requests in-memory — no real network, no port conflicts.
// - Reusability: the same factory powers the real server (index.ts) and
//   the test suite, guaranteeing they exercise identical configuration.
//
// This is the standard Fastify pattern for production-grade servers.

import Fastify, { type FastifyError } from 'fastify'
import { config } from './config.js'
import { logger } from './logger.js'
import correlationId from './plugins/correlationId.js'
import { healthRoutes } from './routes/health.js'

// Return type is intentionally inferred. Passing a custom Pino
// `loggerInstance` specializes the FastifyInstance's logger generic, so
// annotating with the default `FastifyInstance` would cause a mismatch.
export async function buildApp() {
  const app = Fastify({
    // Reuse our configured Pino logger instead of Fastify's default.
    // Now framework logs and our logs share one format and destination.
    loggerInstance: logger,

    // Fastify can generate its own request IDs, but we manage correlation
    // IDs ourselves via the plugin, using the client-provided header.
    genReqId: (req) => {
      const header = req.headers['x-correlation-id']
      return typeof header === 'string' && header.length > 0
        ? header
        : crypto.randomUUID()
    },

    // Trust the X-Forwarded-* headers when behind a reverse proxy / load
    // balancer (needed later for correct client IPs and rate limiting).
    trustProxy: true,
  })

  // --- Plugins (middleware layer) ---
  // Registered first so their hooks apply to all routes below.
  await app.register(correlationId)

  // --- Routes layer ---
  await app.register(healthRoutes)

  // --- Root route: a friendly landing response ---
  app.get('/', async () => ({
    name: 'todo-server',
    status: 'running',
    docs: '/health',
  }))

  // --- 404 handler ---
  app.setNotFoundHandler((req, reply) => {
    req.log.warn({ url: req.url, method: req.method }, 'Route not found')
    return reply.code(404).send({
      error: 'Not Found',
      message: `Route ${req.method} ${req.url} does not exist`,
      correlationId: req.correlationId,
    })
  })

  // --- Centralized error handler ---
  // A full version (with Zod error formatting) arrives in Lesson 5.3.
  // For now we ensure errors are logged with their correlation ID and
  // never leak stack traces to clients in production.
  app.setErrorHandler((error: FastifyError, req, reply) => {
    req.log.error({ err: error }, 'Request error')

    const statusCode = error.statusCode ?? 500
    const message =
      statusCode >= 500 && config.isProd
        ? 'Internal Server Error' // hide internals in prod
        : error.message

    return reply.code(statusCode).send({
      error: error.name,
      message,
      correlationId: req.correlationId,
    })
  })

  return app
}
