// Structured logging with Pino.
//
// This is the server-side counterpart to the browser logger in
// src/lib/logger.ts. Same concepts — levels, structured fields,
// correlation IDs — but tuned for Node.js and high throughput.
//
// Why Pino?
// - Fastest Node logger (writes NDJSON, minimal overhead per log)
// - Fastify uses it internally, so request logs and ours share a format
// - Child loggers let us bind a correlation ID once and inherit it
//
// Dev vs prod output:
// - dev:  pretty, colorized, human-readable (via pino-pretty transport)
// - prod: newline-delimited JSON (NDJSON) that log aggregators parse

import { pino, type Logger, type LoggerOptions } from 'pino'
import { config } from './config.js'

// --- Base logger ---
//
// In development we route through pino-pretty for readable output.
// In production we emit raw JSON for machine parsing (Datadog, Loki, etc.).

// Build options object first. Because tsconfig has exactOptionalPropertyTypes,
// we must OMIT `transport` entirely in prod rather than set it to `undefined`.
const options: LoggerOptions = {
  level: config.logLevel,

  // Base fields attached to every log line for filtering across services.
  base: {
    service: 'todo-server',
    env: config.nodeEnv,
  },

  // Redact sensitive fields so secrets never leak into logs.
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', '*.password'],
    censor: '[REDACTED]',
  },
}

// Pretty-print only in dev. In prod we leave transport unset → raw JSON.
if (config.isDev) {
  options.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss.l',
      ignore: 'pid,hostname',
    },
  }
}

export const logger: Logger = pino(options)

// --- Child logger factory ---
//
// Create a logger bound to a correlation ID. Every line it emits carries
// the ID, so you can grep one request's full journey through the server.
export function childLogger(correlationId: string): Logger {
  return logger.child({ correlationId })
}
