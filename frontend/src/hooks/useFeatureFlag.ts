// useFeatureFlag — React hook for evaluating feature flags in components
//
// Usage:
//   const showBulkActions = useFeatureFlag('bulkActions')
//   return showBulkActions ? <BulkToolbar /> : null
//
// Why a hook?
// - Clean, declarative component usage
// - Single place to inject user context (userId) for targeting/rollouts
// - Memoized so evaluation doesn't run on every render

import { useMemo } from 'react'
import {
  isFeatureEnabled,
  type FlagName,
  type FlagContext,
} from '../lib/featureFlags'
import { useAuth } from '../context/AuthContext'

export function useFeatureFlag(name: FlagName, context?: FlagContext): boolean {
  // Pull the authenticated user from context. Now that auth is wired (Lesson
  // 5.5), the real userId flows into flag evaluation automatically — so
  // percentage rollouts bucket each user consistently across sessions, and
  // userList targeting works against real account IDs.
  const { user } = useAuth()

  // An explicitly-passed context.userId always wins (useful for testing or
  // evaluating flags on behalf of another user). Otherwise fall back to the
  // logged-in user's id, then to 'anonymous' inside isFeatureEnabled.
  const userId = context?.userId ?? user?.id

  // Memoize on the flag name + resolved userId so we only re-evaluate when
  // they change, not on every render.
  return useMemo(
    () => isFeatureEnabled(name, userId ? { userId } : {}),
    [name, userId]
  )
}
