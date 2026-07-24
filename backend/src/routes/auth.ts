// Auth routes — registration, login, session refresh, and logout.
//
// POST /api/auth/register  → create an account, returns the safe user
// POST /api/auth/login     → verify credentials, returns { user, accessToken }
//                            and sets an httpOnly refresh-token cookie
// POST /api/auth/refresh   → rotate the refresh cookie, return a new access token
// POST /api/auth/logout    → revoke the refresh token and clear the cookie
// GET  /api/auth/me        → return the current user (protected)
//
// Token model:
// - Access token: short-lived JWT, returned in the JSON body. The SPA keeps it
//   in memory/localStorage and sends it as `Authorization: Bearer`.
// - Refresh token: long-lived, delivered ONLY as an httpOnly cookie so JS can't
//   read it (mitigates XSS token theft). Rotated on every refresh.

import type { FastifyPluginAsync, FastifyReply } from 'fastify'
import { registerSchema, loginSchema } from '../schemas/auth.js'
import { validate } from '../schemas/validate.js'
import { config } from '../config.js'
import type { RefreshTokenResult } from '../services/authService.js'

// The cookie name and scope. Scoping the path to /api/auth means the cookie is
// only sent on auth requests, not on every /api/todos call — smaller attack
// surface and less header overhead.
const REFRESH_COOKIE = 'refreshToken'
const REFRESH_COOKIE_PATH = '/api/auth'

// Write the refresh token as a hardened httpOnly cookie.
function setRefreshCookie(reply: FastifyReply, token: RefreshTokenResult): void {
  reply.setCookie(REFRESH_COOKIE, token.token, {
    httpOnly: true, // not readable by document.cookie / JS
    sameSite: 'lax', // sent on top-level navigations, blocks most CSRF
    secure: config.isProd, // HTTPS-only in production
    path: REFRESH_COOKIE_PATH,
    expires: token.expiresAt,
  })
}

// Clear the refresh cookie (logout). Must match path/attributes to delete it.
function clearRefreshCookie(reply: FastifyReply): void {
  reply.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH })
}

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // --- POST /api/auth/register (public) ---
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
      const session = await fastify.authService.login({
        email: body.email,
        password: body.password,
      })

      // Refresh token goes into the httpOnly cookie; access token in the body.
      setRefreshCookie(reply, session.refreshToken)

      return reply.code(200).send({
        user: session.user,
        accessToken: session.accessToken,
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

  // --- POST /api/auth/refresh ---
  // Reads the refresh cookie, rotates it, and returns a new access token.
  // No Authorization header needed — the cookie IS the credential here.
  fastify.post('/api/auth/refresh', async (req, reply) => {
    const rawToken = req.cookies[REFRESH_COOKIE]
    if (!rawToken) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Missing refresh token',
        correlationId: req.correlationId,
      })
    }

    const session = await fastify.authService.refresh(rawToken)
    if (!session) {
      // Invalid/expired/rotated token — clear the stale cookie so the client
      // stops retrying and falls back to login.
      clearRefreshCookie(reply)
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Invalid or expired refresh token',
        correlationId: req.correlationId,
      })
    }

    setRefreshCookie(reply, session.refreshToken)
    return reply.code(200).send({
      user: session.user,
      accessToken: session.accessToken,
    })
  })

  // --- POST /api/auth/logout ---
  // Revokes the current refresh token and clears the cookie. Always succeeds,
  // even if no valid token is present (idempotent).
  fastify.post('/api/auth/logout', async (req, reply) => {
    const rawToken = req.cookies[REFRESH_COOKIE]
    if (rawToken) {
      await fastify.authService.logout(rawToken)
    }
    clearRefreshCookie(reply)
    return reply.code(204).send()
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
