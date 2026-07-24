// Environment configuration with runtime validation.
//
// Why validate env vars with Zod instead of reading process.env directly?
// - Fail-fast: a missing or malformed var crashes at STARTUP with a clear
//   message, not deep in a request handler hours later.
// - Type safety: callers get `config.port: number`, not `string | undefined`.
// - Coercion: env vars are always strings; Zod coerces "3000" → 3000 for us.
// - Single source of truth: every env var the server reads is declared here.

import { z } from 'zod'

// --- Schema ---
//
// Each field documents what the server needs to run. Defaults make local
// dev frictionless; production can override via real environment variables.

const envSchema = z.object({
  // z.coerce.number() turns the string "3000" into the number 3000.
  PORT: z.coerce.number().int().positive().default(3000),

  HOST: z.string().default('0.0.0.0'),

  // Restrict to known values — a typo like "prod" fails validation.
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
    .default('info'),

  CORS_ORIGIN: z.string().url().default('http://localhost:5173'),

  // PostgreSQL connection string. Prisma uses this directly.
  // The default matches docker-compose.yml for zero-config local dev.
  DATABASE_URL: z
    .string()
    .url()
    .default('postgresql://todo_user:todo_pass@localhost:5432/todo_dev?schema=public'),

  // JWT secret for signing access tokens. Required in production.
  // In dev, a hardcoded default is fine for local testing but NEVER use it in prod.
  JWT_SECRET: z.string().min(32).default('dev-secret-do-not-use-in-production-32chars'),

  // Access token lifetime. Short-lived tokens limit blast radius if leaked.
  JWT_EXPIRES_IN: z.string().default('15m'),

  // Refresh token lifetime in days. Long-lived, but revocable and rotated on
  // every use, so a leaked token has a short practical window.
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
})

// --- Parse & validate ---
//
// safeParse returns a result object instead of throwing, so we can print
// a friendly, actionable error and exit cleanly.

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  // .format() gives a readable nested view of which fields failed and why.
  console.error('❌ Invalid environment configuration:')
  console.error(JSON.stringify(parsed.error.format(), null, 2))
  console.error('\nCopy backend/.env.example to backend/.env and fix the values above.')
  process.exit(1)
}

// --- Typed, frozen config ---
//
// `as const`-like immutability: freezing prevents accidental mutation of
// config at runtime, which would be a hard-to-trace bug.

export const config = Object.freeze({
  port: parsed.data.PORT,
  host: parsed.data.HOST,
  nodeEnv: parsed.data.NODE_ENV,
  logLevel: parsed.data.LOG_LEVEL,
  corsOrigin: parsed.data.CORS_ORIGIN,
  databaseUrl: parsed.data.DATABASE_URL,
  jwtSecret: parsed.data.JWT_SECRET,
  jwtExpiresIn: parsed.data.JWT_EXPIRES_IN,
  refreshTokenTtlDays: parsed.data.REFRESH_TOKEN_TTL_DAYS,
  isDev: parsed.data.NODE_ENV === 'development',
  isProd: parsed.data.NODE_ENV === 'production',
  isTest: parsed.data.NODE_ENV === 'test',
})

// Inferred type, exported for use in function signatures and tests.
export type Config = typeof config
