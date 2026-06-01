// Correlation ID plugin — the "middleware layer" for request tracing.
//
// What it does, per request:
// 1. Reuses `req.id` (Fastify's genReqId already resolved the incoming
//    `x-correlation-id` header, falling back to a UUID) as the single
//    source of truth — so reqId and correlationId NEVER diverge.
// 2. Attaches it to the request object (req.correlationId).
// 3. Binds a child logger tagged with that ID (req.log inherits it).
// 4. Echoes the ID back on the response header so clients can log it too.
//
// Why a plugin instead of inline code in every route?
// - Cross-cutting concern: tracing applies to ALL requests uniformly.
// - Fastify plugins encapsulate behavior and register hooks cleanly.
// - Keeps route handlers focused on business logic, not plumbing.

import type { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'

const CORRELATION_HEADER = 'x-correlation-id'

// Module augmentation: tell TypeScript that FastifyRequest now has a
// `correlationId` field. This is the "declaration merging" pattern —
// we extend a third-party type without forking it.
declare module 'fastify' {
  interface FastifyRequest {
    correlationId: string
  }
}

const correlationIdPlugin: FastifyPluginAsync = async (fastify) => {
  // onRequest runs first in the lifecycle — before body parsing, routing,
  // and handlers — so the ID is available everywhere downstream.
  fastify.addHook('onRequest', async (req, reply) => {
    // req.id was set by genReqId (header value or a fresh UUID). Reuse it
    // so the framework's reqId and our correlationId are always identical.
    const correlationId = req.id

    req.correlationId = correlationId

    // Rebind the request logger so every req.log.* call carries the ID.
    req.log = req.log.child({ correlationId })

    // Echo it back so the client can correlate its own logs.
    reply.header(CORRELATION_HEADER, correlationId)
  })
}

// fastify-plugin (fp) prevents Fastify from encapsulating this plugin,
// so the request decoration and hook apply to the entire server, not
// just a sub-scope. Without fp, the decoration would be invisible to
// routes registered outside this plugin's scope.
export default fp(correlationIdPlugin, {
  name: 'correlation-id',
})
