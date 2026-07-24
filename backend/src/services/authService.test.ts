// Unit tests for authService — the security-critical core of Lesson 5.5.
//
// Strategy: mock the Prisma client so these tests are fast, deterministic, and
// require no database. We assert on BEHAVIOR (what gets hashed, what queries
// run, what tokens come back) rather than implementation details where possible.
//
// bcrypt and jsonwebtoken are used for real — they're pure/self-contained, and
// exercising them proves the hashing and JWT wiring actually work end to end.

import { describe, it, expect, beforeEach, vi } from 'vitest'
import bcrypt from 'bcrypt'
import crypto from 'node:crypto'
import { createAuthService } from './authService.js'
import { config } from '../config.js'
import type { PrismaClient } from '../generated/prisma/client.js'

// --- Mock Prisma ---
//
// A minimal fake exposing just the methods authService touches. Each is a
// vi.fn() so tests can set return values and assert call arguments.
function createMockPrisma() {
  return {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    // $transaction just runs the array of prepared promises, mirroring Prisma.
    $transaction: vi.fn((ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
  }
}

type MockPrisma = ReturnType<typeof createMockPrisma>

// Helper: the sha256 hex the service uses for refresh-token lookups.
const sha256 = (raw: string) => crypto.createHash('sha256').update(raw).digest('hex')

describe('authService', () => {
  let prisma: MockPrisma
  let service: ReturnType<typeof createAuthService>

  beforeEach(() => {
    prisma = createMockPrisma()
    service = createAuthService(prisma as unknown as PrismaClient)
  })

  // --- register ---
  describe('register', () => {
    it('hashes the password and returns a safe user (no password)', async () => {
      prisma.user.findUnique.mockResolvedValue(null)
      const createdAt = new Date()
      prisma.user.create.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        password: 'hashed',
        createdAt,
      })

      const result = await service.register({ email: 'a@b.com', password: 'password123' })

      // The stored password must be a bcrypt hash, never the plaintext.
      const createArg = prisma.user.create.mock.calls[0]![0] as {
        data: { password: string }
      }
      expect(createArg.data.password).not.toBe('password123')
      expect(await bcrypt.compare('password123', createArg.data.password)).toBe(true)

      // The returned object is the SafeUser shape — no password field.
      expect(result).toEqual({ id: 'u1', email: 'a@b.com', createdAt })
      expect(result).not.toHaveProperty('password')
    })

    it('throws DuplicateEmailError when the email already exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'a@b.com' })

      await expect(
        service.register({ email: 'a@b.com', password: 'password123' })
      ).rejects.toMatchObject({ name: 'DuplicateEmailError' })

      expect(prisma.user.create).not.toHaveBeenCalled()
    })
  })

  // --- login ---
  describe('login', () => {
    it('throws AuthenticationError when the user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null)

      await expect(
        service.login({ email: 'missing@b.com', password: 'password123' })
      ).rejects.toMatchObject({ name: 'AuthenticationError' })
    })

    it('throws AuthenticationError when the password is wrong', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        password: await bcrypt.hash('correct-password', 10),
        createdAt: new Date(),
      })

      await expect(
        service.login({ email: 'a@b.com', password: 'wrong-password' })
      ).rejects.toMatchObject({ name: 'AuthenticationError' })
    })

    it('returns a valid access token and a persisted refresh token on success', async () => {
      const createdAt = new Date()
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        password: await bcrypt.hash('password123', 10),
        createdAt,
      })
      prisma.refreshToken.create.mockResolvedValue({})

      const session = await service.login({ email: 'a@b.com', password: 'password123' })

      // Access token decodes to the right subject/email.
      const payload = service.verifyToken(session.accessToken)
      expect(payload).toMatchObject({ sub: 'u1', email: 'a@b.com' })

      // A refresh token was returned and persisted as a HASH (not the raw value).
      expect(session.refreshToken.token).toMatch(/^[a-f0-9]{64}$/)
      const createArg = prisma.refreshToken.create.mock.calls[0]![0] as {
        data: { tokenHash: string; userId: string }
      }
      expect(createArg.data.userId).toBe('u1')
      expect(createArg.data.tokenHash).toBe(sha256(session.refreshToken.token))
      expect(createArg.data.tokenHash).not.toBe(session.refreshToken.token)
    })
  })

  // --- verifyToken ---
  describe('verifyToken', () => {
    it('returns null for a malformed/invalid token', () => {
      expect(service.verifyToken('not.a.jwt')).toBeNull()
    })
  })

  // --- refresh (rotation) ---
  describe('refresh', () => {
    it('returns null for an unknown token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null)
      expect(await service.refresh('some-raw-token')).toBeNull()
    })

    it('returns null for a revoked token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt1',
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 100000),
        userId: 'u1',
        user: { id: 'u1', email: 'a@b.com', createdAt: new Date() },
      })
      expect(await service.refresh('raw')).toBeNull()
    })

    it('returns null for an expired token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt1',
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000), // already expired
        userId: 'u1',
        user: { id: 'u1', email: 'a@b.com', createdAt: new Date() },
      })
      expect(await service.refresh('raw')).toBeNull()
    })

    it('rotates a valid token: revokes the old one and issues a new pair', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 100000),
        userId: 'u1',
        user: { id: 'u1', email: 'a@b.com', createdAt: new Date() },
      })
      prisma.refreshToken.update.mockResolvedValue({})
      prisma.refreshToken.create.mockResolvedValue({})

      const session = await service.refresh('old-raw-token')

      expect(session).not.toBeNull()
      // Old token revoked.
      const updateArg = prisma.refreshToken.update.mock.calls[0]![0] as {
        where: { id: string }
        data: { revokedAt: Date }
      }
      expect(updateArg.where.id).toBe('rt1')
      expect(updateArg.data.revokedAt).toBeInstanceOf(Date)

      // New token created with a fresh, different hash.
      const createArg = prisma.refreshToken.create.mock.calls[0]![0] as {
        data: { tokenHash: string; userId: string }
      }
      expect(createArg.data.userId).toBe('u1')
      expect(createArg.data.tokenHash).toBe(sha256(session!.refreshToken.token))
      expect(createArg.data.tokenHash).not.toBe(sha256('old-raw-token'))

      // Rotation happened inside a transaction (atomic revoke + create).
      expect(prisma.$transaction).toHaveBeenCalledOnce()

      // A usable new access token comes back.
      expect(service.verifyToken(session!.accessToken)).toMatchObject({ sub: 'u1' })
    })
  })

  // --- logout ---
  describe('logout', () => {
    it('revokes the matching, not-yet-revoked token by hash', async () => {
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 })

      await service.logout('raw-token')

      const arg = prisma.refreshToken.updateMany.mock.calls[0]![0] as {
        where: { tokenHash: string; revokedAt: null }
        data: { revokedAt: Date }
      }
      expect(arg.where.tokenHash).toBe(sha256('raw-token'))
      expect(arg.where.revokedAt).toBeNull()
      expect(arg.data.revokedAt).toBeInstanceOf(Date)
    })
  })

  // --- config sanity ---
  it('uses a refresh TTL that produces a future expiry', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      password: await bcrypt.hash('password123', 10),
      createdAt: new Date(),
    })
    prisma.refreshToken.create.mockResolvedValue({})

    const session = await service.login({ email: 'a@b.com', password: 'password123' })
    const msUntilExpiry = session.refreshToken.expiresAt.getTime() - Date.now()

    // Roughly config.refreshTokenTtlDays in the future (allow small slack).
    const expectedMs = config.refreshTokenTtlDays * 24 * 60 * 60 * 1000
    expect(msUntilExpiry).toBeGreaterThan(expectedMs - 5000)
    expect(msUntilExpiry).toBeLessThanOrEqual(expectedMs)
  })
})
