// Auth routes — registration and login.
//
// POST /api/auth/register  → create an account, returns the safe user
// POST /api/auth/login     → verify credentials, returns { user, accessToken }
// GET  /api/auth/me        → return the current user (protected)
//
// These are the only public write endpoints. Everything under /api/todos
// requires a valid token (enforced in the todos route via authenticate).

import type { FastifyPluginAsync } from 'fastify'
import { registerSchema, loginSchema } from '../schemas/auth.js'
import { validate } from '../schemas/validate.js'

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // --- POST /api/auth/register ---
  fastify.post('/api/auth/register', async (req, reply) => {
    const body = await validate(registerSchema, req.body, req, reply)
    if (!body) return

    try {
      const user = await fastify.authService.register({
        email: body.email,
        password: body.password,
      })

      return reply.code(201).send({ user })
    } catch (err) {
      if (err instanceof Error && err.name === 'DuplicateEmailError') {
        return reply.code(409).send({
          error: 'Conflict',
          message: 'Email already registered',
          correlationId: req.correlationId,
        })
      }
      throw err
    }
  })

  // --- POST /api/auth/login ---
  fastify.post('/api/auth/login', async (req, reply) => {
    const body = await validate(loginSchema, req.body, req, reply)
    if (!body) return

    try {
      const { user, tokens } = await fastify.authService.login({
        email: body.email,
        password: body.password,
      })

      return reply.code(200).send({
        user,
        accessToken: tokens.accessToken,
      })
    } catch (err) {
      if (err instanceof Error && err.name === 'AuthenticationError') {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Invalid email or password',
          correlationId: req.correlationId,
        })
      }
      throw err
    }
  })

  // --- GET /api/auth/me ---
  // Returns the authenticated user. Useful for the frontend to restore
  // session state on page reload (validate the stored token).
  fastify.get(
    '/api/auth/me',
    { preHandler: fastify.authenticate },
    async (req) => {
      // `req.user` is guaranteed to be set by the authenticate guard.
      return { user: req.user }
    }
  )
}
