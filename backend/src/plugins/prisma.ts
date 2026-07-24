// Prisma plugin — manages the database client lifecycle.
//
// What it does:
// 1. Creates a pg.Pool for connection pooling (reuses connections).
// 2. Wraps it in a Prisma driver adapter so Prisma speaks to OUR pool.
// 3. Creates the PrismaClient and decorates the Fastify instance.
// 4. Registers onClose hooks to disconnect both Prisma and the pool.
//
// Why a driver adapter (pg.Pool) instead of Prisma's built-in connection?
// - Prisma 6 requires an explicit adapter or Accelerate URL.
// - pg.Pool gives us fine-grained control: pool size, idle timeout, etc.
// - The pool is shared — if we later add raw SQL or other tools, they
//   reuse the same connections instead of opening a second pool.
//
// Why a plugin instead of a global singleton?
// - Lifecycle: Fastify manages startup/shutdown order automatically.
// - Testability: tests can create their own instance (or mock it).
// - Encapsulation: database config stays in one place, not scattered.

import type { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client.js'
import { config } from '../config.js'
import { createTodoService, type TodoService } from '../services/todoService.js'
import { createAuthService, type AuthService } from '../services/authService.js'

// Module augmentation — extend FastifyInstance so TypeScript knows about
// `app.prisma`, `app.todoService`, and `app.authService` everywhere.
declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
    todoService: TodoService
    authService: AuthService
  }
}

const prismaPlugin: FastifyPluginAsync = async (fastify) => {
  // --- Connection pool ---
  // pg.Pool manages a pool of connections. Requests borrow a connection,
  // use it, and return it — avoiding the overhead of connect/disconnect
  // on every query. The defaults (max 10) are fine for local dev; tune
  // in production via env vars.
  const pool = new pg.Pool({ connectionString: config.databaseUrl })

  // Verify the connection works at startup (fail-fast).
  await pool.query('SELECT 1')
  fastify.log.info('Database connected')

  // --- Prisma with driver adapter ---
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  // Decorate the instance — makes `app.prisma` and `app.todoService`
  // available in all routes via Fastify's dependency injection.
  fastify.decorate('prisma', prisma)
  fastify.decorate('todoService', createTodoService(prisma))
  fastify.decorate('authService', createAuthService(prisma))

  // --- Cleanup on shutdown ---
  // Disconnect Prisma first (drains in-flight queries), then close the
  // pool (releases all connections back to PostgreSQL).
  fastify.addHook('onClose', async () => {
    fastify.log.info('Disconnecting database')
    await prisma.$disconnect()
    await pool.end()
  })
}

export default fp(prismaPlugin, {
  name: 'prisma',
})
