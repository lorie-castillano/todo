// Feature flags module — gradual rollouts and runtime feature control
//
// Why feature flags?
// - Decouple deploy from release: ship code dark, enable it later
// - Gradual rollouts: enable for 10% of users, watch metrics, ramp to 100%
// - Kill switch: instantly disable a broken feature without a rollback deploy
// - Targeting: show features to specific users or segments
//
// Evaluation strategies supported:
// 1. boolean      — simple on/off for everyone
// 2. percentage   — enabled for N% of users (deterministic per-user bucketing)
// 3. userList     — enabled only for specific user IDs (beta testers, internal)
//
// Note: This is a client-side implementation suitable for our app. In a larger
// system, flags live in a service (LaunchDarkly, Unleash) so they can change
// without a deploy. The evaluation logic below mirrors how those services work.

import { logger } from './logger'

// --- Flag definitions ---

// A flag is one of three discriminated-union shapes. The `kind` field tells
// the evaluator which strategy to apply — this is a textbook discriminated
// union, giving us exhaustive type-safe handling in `evaluate`.
type FlagRule =
  | { kind: 'boolean'; enabled: boolean }
  | { kind: 'percentage'; rollout: number } // 0–100
  | { kind: 'userList'; userIds: readonly string[] }

// The registry of all flags. Add new flags here as the single source of truth.
// Using `as const` preserves literal flag names for the FlagName type below.
const FLAGS = {
  // Example: a new bulk-actions toolbar, rolled out to 25% of users
  bulkActions: { kind: 'percentage', rollout: 25 },

  // Example: an experimental AI suggestions panel, internal testers only
  aiSuggestions: { kind: 'userList', userIds: ['user-1', 'user-internal'] },

  // Example: a finished feature that's fully on
  darkModeV2: { kind: 'boolean', enabled: true },
} as const satisfies Record<string, FlagRule>

// Derive the union of valid flag names from the registry — callers get
// autocomplete and a compile error if they reference a non-existent flag.
export type FlagName = keyof typeof FLAGS

// --- Deterministic bucketing ---
//
// Hash a string to a stable integer in [0, 99]. Same input always yields the
// same bucket, so a user's rollout assignment never flickers between loads.
// This is a simple FNV-1a-style hash — fast and good enough for bucketing.

function hashToBucket(input: string): number {
  let hash = 2166136261
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  // Convert to unsigned and map to 0–99
  return Math.abs(hash) % 100
}

// --- Evaluation ---

export interface FlagContext {
  // A stable identifier for the current user. Falls back to 'anonymous'
  // so anonymous users still get consistent (if shared) bucketing.
  userId?: string
}

export function isFeatureEnabled(name: FlagName, context: FlagContext = {}): boolean {
  const rule = FLAGS[name] as FlagRule
  const userId = context.userId ?? 'anonymous'

  let result: boolean
  switch (rule.kind) {
    case 'boolean':
      result = rule.enabled
      break

    case 'percentage': {
      // Bucket on userId + flag name so different flags roll out independently
      const bucket = hashToBucket(`${name}:${userId}`)
      result = bucket < rule.rollout
      break
    }

    case 'userList':
      result = rule.userIds.includes(userId)
      break

    default: {
      // Exhaustiveness check: if a new FlagRule kind is added and not handled,
      // TypeScript errors here at compile time.
      const _exhaustive: never = rule
      result = false
      void _exhaustive
    }
  }

  logger.debug('Feature flag evaluated', { flag: name, userId, result })
  return result
}

// Expose the registry shape for tooling/debugging (read-only)
export const featureFlagRegistry = FLAGS
