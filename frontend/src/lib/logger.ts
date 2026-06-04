// Structured logging module (browser)
//
// Why a logger instead of raw console.* calls?
// - Log levels: filter noise (debug) from signal (error) per environment
// - Structured output: consistent shape that's easy to search and parse
// - Correlation IDs: group related events to trace a user's journey
// - Centralized routing: send errors to Sentry, debug only to dev console
// - Security: controlled output prevents leaking sensitive data in prod
//
// This mirrors the backend logging we'll build in Phase 5 (Pino). Same
// concepts — levels, structured fields, correlation IDs — different runtime.

import * as Sentry from '@sentry/react'
import { config } from './config'

// --- Log levels ---
//
// Ordered by severity. We only emit logs at or above the configured
// minimum level, so production can silence `debug`/`info` noise.

const LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
} as const

type LogLevel = keyof typeof LEVELS

// Minimum level to emit. Dev shows everything; prod hides debug/info.
const MIN_LEVEL: LogLevel = config.isDev ? 'debug' : 'warn'

// Structured context attached to every log entry.
type LogContext = Record<string, unknown>

// --- Correlation ID ---
//
// A correlation ID groups all log entries from a single page session.
// When a user reports "it broke", you can filter Sentry/logs by this ID
// to reconstruct the exact sequence of events that led to the issue.

function generateCorrelationId(): string {
  // crypto.randomUUID is available in all modern browsers
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  // Fallback for very old environments / jsdom
  return `cid-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

// One correlation ID per page load. Persisted on the module so every
// log call in this session shares it.
const correlationId = generateCorrelationId()

// --- Core log function ---

interface LogEntry {
  level: LogLevel
  message: string
  correlationId: string
  timestamp: string
  appVersion: string
  context?: LogContext
}

function shouldLog(level: LogLevel): boolean {
  return LEVELS[level] >= LEVELS[MIN_LEVEL]
}

function buildEntry(level: LogLevel, message: string, context?: LogContext): LogEntry {
  return {
    level,
    message,
    correlationId,
    timestamp: new Date().toISOString(),
    appVersion: config.appVersion,
    ...(context ? { context } : {}),
  }
}

function emit(level: LogLevel, message: string, context?: LogContext): void {
  if (!shouldLog(level)) return

  const entry = buildEntry(level, message, context)

  // In dev: pretty, human-readable console output with the right method
  if (config.isDev) {
    const consoleMethod = level === 'debug' ? 'log' : level
    console[consoleMethod](
      `[${entry.timestamp}] ${level.toUpperCase()} (${correlationId.slice(0, 8)}): ${message}`,
      context ?? ''
    )
    return
  }

  // In production: emit structured JSON (parseable by log aggregators)
  // and forward warnings/errors to Sentry for alerting.
  console[level === 'debug' ? 'log' : level](JSON.stringify(entry))

  if (level === 'error') {
    Sentry.captureMessage(message, {
      level: 'error',
      extra: { correlationId, ...context },
    })
  } else if (level === 'warn') {
    Sentry.addBreadcrumb({
      category: 'log',
      level: 'warning',
      message,
      data: { correlationId, ...context },
    })
  }
}

// --- Public API ---

export const logger = {
  debug: (message: string, context?: LogContext) => emit('debug', message, context),
  info: (message: string, context?: LogContext) => emit('info', message, context),
  warn: (message: string, context?: LogContext) => emit('warn', message, context),
  error: (message: string, context?: LogContext) => emit('error', message, context),

  // Expose the correlation ID so it can be attached to API requests,
  // error reports, etc. — enabling end-to-end tracing.
  getCorrelationId: () => correlationId,
}
