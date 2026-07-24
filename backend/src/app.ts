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
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { ZodError } from 'zod'
import { config } from './config.js'
import { logger } from './logger.js'
import correlationId from './plugins/correlationId.js'
import prisma from './plugins/prisma.js'
import auth from './plugins/auth.js'
import { healthRoutes } from './routes/health.js'
import { todoRoutes } from './routes/todos.js'
import { authRoutes } from './routes/auth.js'

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

  // --- Security plugins ---
  // Registered before everything so their headers/checks apply to all routes.

  // CORS: allow the frontend dev server to make cross-origin requests.
  // Without this, the browser blocks fetch() from :5173 to :3000.
  await app.register(cors, {
    origin: config.corsOrigin,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  })

  // Helmet: sets security headers (X-Content-Type-Options, X-Frame-Options,
  // Strict-Transport-Security, etc.). Cheap defense-in-depth.
  await app.register(helmet, {
    // Disable CSP in dev — it conflicts with Vite's dev server.
    contentSecurityPolicy: config.isProd,
  })

  // Rate limiter: prevents a single client from flooding the API.
  // 100 requests per minute per IP is generous for a todo app.
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  })

  // --- Application plugins ---
  await app.register(correlationId)
  await app.register(prisma)
  // Auth depends on prisma (for authService), so register it after.
  await app.register(auth)

  // --- OpenAPI / Swagger ---
  // Generates an OpenAPI 3.0 spec from route schemas and serves an
  // interactive API explorer at /docs. AI agents can also consume
  // the spec to understand the API programmatically.
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Todo API',
        description: 'REST API for the Todo app — also powers MCP tools',
        version: '0.1.0',
      },
      servers: [{ url: `http://localhost:${config.port}` }],
    },
  })
  await app.register(swaggerUi, {
    routePrefix: '/docs',
  })

  // --- Routes layer ---
  await app.register(healthRoutes)
  await app.register(authRoutes)
  await app.register(todoRoutes)

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
  // Catches all unhandled errors and formats them into consistent JSON.
  // Special handling for:
  // - ZodError: validation failures → 400 with field-level details
  // - FastifyError: framework errors (e.g., body too large) → their status code
  // - Unknown errors: 500 with internals hidden in production
  app.setErrorHandler((error: FastifyError | ZodError | Error, req, reply) => {
    // --- Zod validation errors ---
    // We use duck-typing (check for `.issues` array) instead of `instanceof`
    // because `instanceof` can fail across ESM module boundaries when Zod
    // is loaded from different paths. The `.issues` property is unique to
    // ZodError and safe to check.
    if ('issues' in error && Array.isArray(error.issues)) {
      req.log.warn({ issues: error.issues }, 'Validation failed')

      const details = error.issues.map((issue: { path: (string | number)[]; message: string }) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }))

      return reply.code(400).send({
        error: 'Validation Error',
        message: 'Request validation failed',
        details,
        correlationId: req.correlationId,
      })
    }

    // --- Fastify / application errors ---
    req.log.error({ err: error }, 'Request error')

    const statusCode = 'statusCode' in error ? (error.statusCode ?? 500) : 500
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
