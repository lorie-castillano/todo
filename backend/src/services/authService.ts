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
import jwt, { type SignOptions } from 'jsonwebtoken'
import type { PrismaClient } from '../generated/prisma/client.js'
import { config } from '../config.js'

// --- Types ---

export interface SafeUser {
  id: string
  email: string
  createdAt: Date
}

export interface AuthTokens {
  accessToken: string
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
    // Verifies credentials and returns a signed JWT. Uses a generic error
    // message so an attacker can't tell whether the email or password was wrong.
    async login(input: LoginInput): Promise<{ user: SafeUser; tokens: AuthTokens }> {
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

      const signOptions: SignOptions = {
        expiresIn: config.jwtExpiresIn as NonNullable<SignOptions['expiresIn']>,
      }
      const accessToken = jwt.sign(
        { sub: user.id, email: user.email },
        config.jwtSecret,
        signOptions
      )

      return {
        user: {
          id: user.id,
          email: user.email,
          createdAt: user.createdAt,
        },
        tokens: { accessToken },
      }
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
