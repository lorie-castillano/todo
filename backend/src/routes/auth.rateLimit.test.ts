// Integration tests for the PER-ROUTE rate limits on the auth endpoints.
//
// Strategy: mount the REAL `authRoutes` (so we exercise the actual
// `config.rateLimit` overrides in auth.ts) on a minimal Fastify app with:
//   - an IN-MEMORY rate-limit store (deterministic, no Redis dependency)
//   - a MOCKED authService (no DB, no bcrypt — we only care about status codes)
// then fire requests via app.inject() and assert when 429s kick in.
//
// Why in-memory instead of Redis? The per-route caps we're testing (5/min for
// login, 10/hour for register) apply regardless of the backing store — the
// store only changes WHERE the counter lives (see ADR-007), not the limit.
// Keeping the store in-memory makes the test fast and hermetic.

import { describe, it, expect, beforeEach, vi } from 'vitest'
import Fastify, {
  type FastifyInstance,
  type FastifyRequest,
  type FastifyReply,
} from 'fastify'
import cookie from '@fastify/cookie'
import rateLimit from '@fastify/rate-limit'
import { authRoutes } from './auth.js'
import type { AuthService } from '../services/authService.js'

// A fully-stubbed AuthService; tests override just the method under exercise.
function makeAuthService(overrides: Partial<AuthService> = {}): AuthService {
  return {
    register: vi.fn(),
    login: vi.fn(),
    verifyToken: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
    ...overrides,
  } as unknown as AuthService
}

async function buildTestApp(authService: AuthService): Promise<FastifyInstance> {
  const app = Fastify()
  await app.register(cookie)
  // Global default is 100/min; auth routes override this per-route.
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' })
  app.decorate('authService', authService)
  // /me registers with `preHandler: fastify.authenticate`, so the decorator
  // must exist at registration time. A no-op stub is enough here.
  app.decorate(
    'authenticate',
    async (_req: FastifyRequest, _reply: FastifyReply): Promise<void> => {},
  )
  await app.register(authRoutes)
  await app.ready()
  return app
}

const jsonHeaders = { 'content-type': 'application/json' }

// Helper: an Error whose `name` the route checks to map to a 401.
function authError(): Error {
  return Object.assign(new Error('bad credentials'), { name: 'AuthenticationError' })
}

describe('auth route rate limiting', () => {
  describe('POST /api/auth/login — 5 per minute', () => {
    let app: FastifyInstance

    beforeEach(async () => {
      // Simulate repeated FAILED logins — the brute-force scenario.
      app = await buildTestApp(
        makeAuthService({ login: vi.fn().mockRejectedValue(authError()) }),
      )
    })

    it('allows the first 5 attempts (401) then blocks with 429', async () => {
      const payload = JSON.stringify({ email: 'a@b.com', password: 'wrong-pass' })
      const codes: number[] = []

      for (let i = 0; i < 7; i++) {
        const res = await app.inject({
          method: 'POST',
          url: '/api/auth/login',
          headers: jsonHeaders,
          payload,
        })
        codes.push(res.statusCode)
      }

      // 5 reach the handler (401 invalid creds); the 6th+ are rate-limited.
      expect(codes.slice(0, 5)).toEqual([401, 401, 401, 401, 401])
      expect(codes.slice(5)).toEqual([429, 429])
    })

    it('advertises the 5/min limit and returns a structured 429 body', async () => {
      const payload = JSON.stringify({ email: 'a@b.com', password: 'wrong-pass' })
      let res!: Awaited<ReturnType<FastifyInstance['inject']>>

      for (let i = 0; i < 6; i++) {
        res = await app.inject({
          method: 'POST',
          url: '/api/auth/login',
          headers: jsonHeaders,
          payload,
        })
      }

      expect(res.statusCode).toBe(429)
      expect(Number(res.headers['x-ratelimit-limit'])).toBe(5)
      expect(res.json()).toMatchObject({ statusCode: 429, error: 'Too Many Requests' })
    })
  })

  describe('POST /api/auth/register — 10 per hour', () => {
    let app: FastifyInstance

    beforeEach(async () => {
      app = await buildTestApp(
        makeAuthService({
          register: vi
            .fn()
            .mockResolvedValue({ id: 'u1', email: 'a@b.com', createdAt: new Date() }),
        }),
      )
    })

    it('allows the first 10 registrations (201) then blocks with 429', async () => {
      const codes: number[] = []

      for (let i = 0; i < 12; i++) {
        const res = await app.inject({
          method: 'POST',
          url: '/api/auth/register',
          headers: jsonHeaders,
          payload: JSON.stringify({ email: `u${i}@b.com`, password: 'password123' }),
        })
        codes.push(res.statusCode)
      }

      expect(codes.slice(0, 10)).toEqual(Array<number>(10).fill(201))
      expect(codes.slice(10)).toEqual([429, 429])
    })

    it('uses a limit distinct from login (10, not 5)', async () => {
      let res!: Awaited<ReturnType<FastifyInstance['inject']>>

      for (let i = 0; i < 11; i++) {
        res = await app.inject({
          method: 'POST',
          url: '/api/auth/register',
          headers: jsonHeaders,
          payload: JSON.stringify({ email: `x${i}@b.com`, password: 'password123' }),
        })
      }

      expect(res.statusCode).toBe(429)
      expect(Number(res.headers['x-ratelimit-limit'])).toBe(10)
    })
  })
})
