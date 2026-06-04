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

export function useFeatureFlag(name: FlagName, context?: FlagContext): boolean {
  // Memoize on the flag name + userId so we only re-evaluate when they change.
  // This todo app has no auth, so userId is usually undefined ('anonymous').
  // When you add auth in Phase 5, pass the real userId via context.
  return useMemo(
    () => isFeatureEnabled(name, context),
    [name, context?.userId]
  )
}
