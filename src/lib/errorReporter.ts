// Error reporting module
//
// Why abstract error reporting behind a module?
// - Swap reporting services (Sentry → Datadog → custom) without touching ErrorBoundary
// - Add context (user, app version, environment) in one place
// - Gate reporting behind config flags so dev console stays clean
// - Testable: mock this module in tests instead of mocking Sentry's SDK
//
// Current implementation: logs to console in dev, sends to Sentry in production.
// To activate Sentry: npm install @sentry/react and fill in VITE_SENTRY_DSN.

import type { ErrorInfo } from 'react'
import * as Sentry from '@sentry/react'
import { config } from './config'

// --- Types ---

export interface ErrorReport {
  error: Error
  errorInfo?: ErrorInfo
  context?: Record<string, unknown>
}

// --- Internal helpers ---

function formatReport(report: ErrorReport): string {
  const lines = [
    `[ErrorReporter] ${report.error.name}: ${report.error.message}`,
    report.errorInfo?.componentStack
      ? `Component stack:${report.errorInfo.componentStack}`
      : null,
    report.context ? `Context: ${JSON.stringify(report.context, null, 2)}` : null,
  ]
  return lines.filter(Boolean).join('\n')
}

// --- Sentry integration ---
//
// Sentry is initialized in main.tsx via initSentry().
// If VITE_SENTRY_DSN is not set, Sentry.init() was a no-op and captureException
// will simply do nothing (no-op when client is not initialized).

function reportToSentry(report: ErrorReport): void {
  // Capture the error with additional context
  Sentry.captureException(report.error, {
    extra: {
      componentStack: report.errorInfo?.componentStack,
      appVersion: config.appVersion,
      url: window.location.href,
      ...report.context,
    },
  })
}

// --- Public API ---

export function reportError(report: ErrorReport): void {
  if (config.isDev) {
    // In dev: always log to console with full detail
    console.error(formatReport(report))
    return
  }

  // In production: log a minimal message and send to Sentry
  console.error(`[Error] ${report.error.message}`)
  reportToSentry(report)
}

// Convenience wrapper for ErrorBoundary's onError signature
export function reportBoundaryError(error: Error, errorInfo: ErrorInfo): void {
  reportError({
    error,
    errorInfo,
    context: {
      appVersion: config.appVersion,
      url: window.location.href,
    },
  })
}
