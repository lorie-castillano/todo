// Auth plugin — provides the `authenticate` guard used to protect routes.
//
// How it works:
// 1. Reads the `Authorization: Bearer <token>` header.
// 2. Verifies the JWT via authService.
// 3. Attaches the decoded user to `request.user`.
// 4. Rejects with 401 if the token is missing or invalid.
//
// Usage in a route:
//   fastify.get('/api/todos', { preHandler: fastify.authenticate }, handler)
//
// Why a preHandler decorator instead of a global hook?
// - Selective: public routes (/, /health, /api/auth/*) stay open.
// - Composable: each route opts in explicitly, which is easy to audit.

import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import fp from 'fastify-plugin'

// The authenticated user attached to each request after the guard runs.
export interface AuthUser {
  id: string
  email: string
}

// Module augmentation — teach TypeScript about `request.user` and
// `fastify.authenticate`.
declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser
  }
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate(
    'authenticate',
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const header = request.headers.authorization

      if (!header || !header.startsWith('Bearer ')) {
        await reply.code(401).send({
          error: 'Unauthorized',
          message: 'Missing or malformed Authorization header',
          correlationId: request.correlationId,
        })
        return
      }

      const token = header.slice('Bearer '.length)
      const payload = fastify.authService.verifyToken(token)

      if (!payload) {
        await reply.code(401).send({
          error: 'Unauthorized',
          message: 'Invalid or expired token',
          correlationId: request.correlationId,
        })
        return
      }

      // Attach the authenticated user so handlers can scope data to them.
      request.user = { id: payload.sub, email: payload.email }
    }
  )
}

// Depends on the prisma plugin (for authService), so declare that dependency.
export default fp(authPlugin, {
  name: 'auth',
  dependencies: ['prisma'],
})
