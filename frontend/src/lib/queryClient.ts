// TanStack Query configuration
// QueryClient is the brain of React Query — it manages caching,
// background refetching, deduplication, and optimistic updates.

import { QueryClient } from '@tanstack/react-query'

// Check if we're in a test environment
const isTest = import.meta.env.VITEST === true

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Time before cached data is considered stale (5 minutes)
      staleTime: 1000 * 60 * 5,

      // Time to keep inactive data in cache (10 minutes)
      gcTime: 1000 * 60 * 10,

      // Retry failed requests 2 times before showing error
      // In tests, don't retry — fail fast
      retry: isTest ? 0 : 2,

      // Refetch when window regains focus (good for keeping data fresh)
      // Disabled in tests for predictability
      refetchOnWindowFocus: !isTest,

      // Don't throw errors to Error Boundary — handle them in components
      throwOnError: false,
    },
    mutations: {
      // Retry failed mutations once (disabled in tests)
      retry: isTest ? 0 : 1,
    },
  },
})
