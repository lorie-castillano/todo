// Web Vitals monitoring — Core Web Vitals (LCP, FID, CLS) + additional metrics
//
// Why monitor Web Vitals?
// - Google uses these for search ranking (SEO)
// - Directly correlates with user experience and bounce rates
// - Identifies performance regressions before users complain
//
// What we track:
// - LCP (Largest Contentful Paint): loading performance — how fast main content appears
// - FID (First Input Delay): interactivity — time from click to response
// - CLS (Cumulative Layout Shift): visual stability — elements shouldn't jump around
// - TTFB (Time to First Byte): server response time
// - FCP (First Contentful Paint): first paint time
//
// To activate: import and call initWebVitals() in main.tsx (already done if using this module)
// Metrics are sent to Sentry as transactions for tracking.

import { onCLS, onINP, onLCP, onTTFB, onFCP, type Metric } from 'web-vitals'
import * as Sentry from '@sentry/react'

// Thresholds from Google Core Web Vitals standards
// Note: INP replaced FID as the interactivity metric in 2024
const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },      // ms - Largest Contentful Paint
  INP: { good: 200, poor: 500 },        // ms - Interaction to Next Paint (replaces FID)
  CLS: { good: 0.1, poor: 0.25 },       // unitless - Cumulative Layout Shift
  TTFB: { good: 600, poor: 1000 },      // ms - Time to First Byte
  FCP: { good: 1800, poor: 3000 },      // ms - First Contentful Paint
} as const

type MetricName = keyof typeof THRESHOLDS

function getRating(name: MetricName, value: number): 'good' | 'needs-improvement' | 'poor' {
  const t = THRESHOLDS[name]
  if (value <= t.good) return 'good'
  if (value <= t.poor) return 'needs-improvement'
  return 'poor'
}

function sendToSentry(metric: Metric) {
  const name = metric.name as MetricName
  const rating = getRating(name, metric.value)

  // Send as a breadcrumb/context with the metric data
  // Sentry will aggregate these for performance monitoring
  Sentry.addBreadcrumb({
    category: 'web-vitals',
    message: `${metric.name}: ${formatValue(metric)} (${rating})`,
    data: {
      metricName: metric.name,
      metricValue: metric.value,
      metricRating: rating,
      metricUnit: getUnit(metric.name),
      // Navigation info for context
      url: window.location.href,
    },
    level: rating === 'good' ? 'info' : rating === 'needs-improvement' ? 'warning' : 'error',
  })

  // Also log to console in dev for visibility
  if (import.meta.env.DEV) {
    console.log(`[WebVitals] ${metric.name}: ${formatValue(metric)} (${rating})`)
  }
}

function getUnit(name: string): string {
  // CLS is unitless, others are milliseconds
  return name === 'CLS' ? '' : 'millisecond'
}

function formatValue(metric: Metric): string {
  if (metric.name === 'CLS') {
    return metric.value.toFixed(3)
  }
  return `${Math.round(metric.value)}ms`
}

export function initWebVitals(): void {
  // Only run in browser (not SSR)
  if (typeof window === 'undefined') return

  // Core Web Vitals
  onLCP(sendToSentry)   // Loading
  onINP(sendToSentry)  // Interactivity (replaces FID)
  onCLS(sendToSentry)  // Visual stability

  // Additional helpful metrics
  onTTFB(sendToSentry) // Server response
  onFCP(sendToSentry)  // First paint

  if (import.meta.env.DEV) {
    console.log('[WebVitals] Initialized — metrics will log to console and Sentry')
  }
}
