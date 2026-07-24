// Auth service — user registration, login, and JWT signing.
//
// Responsibilities:
// - Hash passwords with bcrypt (salt rounds 10)
// - Verify passwords on login
// - Sign JWT access tokens
// - Return safe user objects (no password hash)
//
// Why bcrypt 10? It takes ~100ms on modern hardware — enough to slow brute
// force, not enough to hurt UX. Increase in production if your threat model
// demands it.

import bcrypt from 'bcrypt'
import crypto from 'node:crypto'
import jwt, { type SignOptions } from 'jsonwebtoken'
import type { PrismaClient } from '../generated/prisma/client.js'
import { config } from '../config.js'

// --- Types ---

export interface SafeUser {
  id: string
  email: string
  createdAt: Date
}

// A raw refresh token plus its expiry. The raw value is only ever returned
// here (to be placed in an httpOnly cookie); the DB stores only its hash.
export interface RefreshTokenResult {
  token: string
  expiresAt: Date
}

export interface AuthTokens {
  accessToken: string
}

// The full result of login/refresh: access token for API calls plus a fresh
// refresh token for the cookie.
export interface SessionResult {
  user: SafeUser
  accessToken: string
  refreshToken: RefreshTokenResult
}

export interface RegisterInput {
  email: string
  password: string
}

export interface LoginInput {
  email: string
  password: string
}

// --- Service factory ---

export function createAuthService(prisma: PrismaClient) {
  // --- Internal helpers ---

  // Sign a short-lived access token for a user.
  function signAccessToken(user: { id: string; email: string }): string {
    const signOptions: SignOptions = {
      expiresIn: config.jwtExpiresIn as NonNullable<SignOptions['expiresIn']>,
    }
    return jwt.sign({ sub: user.id, email: user.email }, config.jwtSecret, signOptions)
  }

  // Hash a raw refresh token with SHA-256. We store/look up only the hash so a
  // DB compromise never exposes a usable token.
  function hashToken(raw: string): string {
    return crypto.createHash('sha256').update(raw).digest('hex')
  }

  // Create a refresh token: a cryptographically-random 256-bit value. We
  // persist its hash + expiry and return the raw token to the caller.
  async function issueRefreshToken(userId: string): Promise<RefreshTokenResult> {
    const raw = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(
      Date.now() + config.refreshTokenTtlDays * 24 * 60 * 60 * 1000
    )

    await prisma.refreshToken.create({
      data: { tokenHash: hashToken(raw), userId, expiresAt },
    })

    return { token: raw, expiresAt }
  }

  return {
    // --- Register ---
    // Hashes the password and creates the user. Throws a duplicate-email error
    // if the email already exists.
    async register(input: RegisterInput): Promise<SafeUser> {
      const existing = await prisma.user.findUnique({
        where: { email: input.email },
      })

      if (existing) {
        const error = new Error('Email already registered')
        error.name = 'DuplicateEmailError'
        throw error
      }

      const passwordHash = await bcrypt.hash(input.password, 10)

      const user = await prisma.user.create({
        data: {
          email: input.email,
          password: passwordHash,
        },
      })

      return {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
      }
    },

    // --- Login ---
    // Verifies credentials and returns an access token + a refresh token. Uses a
    // generic error message so an attacker can't tell whether the email or
    // password was wrong.
    async login(input: LoginInput): Promise<SessionResult> {
      const user = await prisma.user.findUnique({
        where: { email: input.email },
      })

      if (!user) {
        const error = new Error('Invalid email or password')
        error.name = 'AuthenticationError'
        throw error
      }

      const valid = await bcrypt.compare(input.password, user.password)
      if (!valid) {
        const error = new Error('Invalid email or password')
        error.name = 'AuthenticationError'
        throw error
      }

      const safeUser: SafeUser = {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
      }

      return {
        user: safeUser,
        accessToken: signAccessToken(user),
        refreshToken: await issueRefreshToken(user.id),
      }
    },

    // --- Refresh (with rotation) ---
    // Given a raw refresh token, verify it's valid (exists, not revoked, not
    // expired), then ROTATE: revoke the old token and issue a new one. Returns a
    // fresh access token + refresh token, or null if the token is invalid.
    //
    // Rotation is the key defense: a token can only be used once. If an attacker
    // replays a stolen token after the legitimate user has refreshed, the lookup
    // finds a revoked record and we reject it.
    async refresh(rawToken: string): Promise<SessionResult | null> {
      const record = await prisma.refreshToken.findUnique({
        where: { tokenHash: hashToken(rawToken) },
        include: { user: true },
      })

      // Reject if unknown, already revoked, or expired.
      if (!record || record.revokedAt || record.expiresAt < new Date()) {
        return null
      }

      // Rotate atomically: revoke the old token and mint a new one together, so
      // we never end up with two live tokens or none.
      const newRaw = crypto.randomBytes(32).toString('hex')
      const newExpiresAt = new Date(
        Date.now() + config.refreshTokenTtlDays * 24 * 60 * 60 * 1000
      )

      await prisma.$transaction([
        prisma.refreshToken.update({
          where: { id: record.id },
          data: { revokedAt: new Date() },
        }),
        prisma.refreshToken.create({
          data: {
            tokenHash: hashToken(newRaw),
            userId: record.userId,
            expiresAt: newExpiresAt,
          },
        }),
      ])

      return {
        user: {
          id: record.user.id,
          email: record.user.email,
          createdAt: record.user.createdAt,
        },
        accessToken: signAccessToken(record.user),
        refreshToken: { token: newRaw, expiresAt: newExpiresAt },
      }
    },

    // --- Logout ---
    // Revoke a refresh token so it can no longer mint access tokens. Idempotent:
    // an unknown/already-revoked token is a no-op (logout should always succeed).
    async logout(rawToken: string): Promise<void> {
      await prisma.refreshToken.updateMany({
        where: { tokenHash: hashToken(rawToken), revokedAt: null },
        data: { revokedAt: new Date() },
      })
    },

    // --- Verify token ---
    // Decodes and verifies a JWT. Returns the payload or null if invalid/expired.
    verifyToken(token: string): { sub: string; email: string } | null {
      try {
        const payload = jwt.verify(token, config.jwtSecret) as { sub: string; email: string }
        return payload
      } catch {
        return null
      }
    },
  }
}

export type AuthService = ReturnType<typeof createAuthService>
