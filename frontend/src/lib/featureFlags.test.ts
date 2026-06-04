import { describe, it, expect, vi } from 'vitest'

// Logger is noise in these tests — mock it to a no-op.
vi.mock('./logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { isFeatureEnabled } from './featureFlags'

describe('featureFlags', () => {
  describe('boolean flags', () => {
    it('returns true for a fully-enabled boolean flag', () => {
      expect(isFeatureEnabled('darkModeV2')).toBe(true)
    })
  })

  describe('userList flags', () => {
    it('enables the flag for a listed user', () => {
      expect(isFeatureEnabled('aiSuggestions', { userId: 'user-1' })).toBe(true)
    })

    it('disables the flag for an unlisted user', () => {
      expect(isFeatureEnabled('aiSuggestions', { userId: 'random-user' })).toBe(false)
    })

    it('disables the flag for anonymous users', () => {
      expect(isFeatureEnabled('aiSuggestions')).toBe(false)
    })
  })

  describe('percentage flags', () => {
    it('is deterministic — same user always gets the same result', () => {
      const first = isFeatureEnabled('bulkActions', { userId: 'stable-user' })
      const second = isFeatureEnabled('bulkActions', { userId: 'stable-user' })
      const third = isFeatureEnabled('bulkActions', { userId: 'stable-user' })
      expect(first).toBe(second)
      expect(second).toBe(third)
    })

    it('rolls out to roughly the configured percentage across many users', () => {
      // bulkActions is set to 25% rollout
      const TOTAL = 10000
      let enabledCount = 0

      for (let i = 0; i < TOTAL; i++) {
        if (isFeatureEnabled('bulkActions', { userId: `user-${i}` })) {
          enabledCount++
        }
      }

      const actualPct = (enabledCount / TOTAL) * 100
      // Allow a few points of variance from the 25% target
      expect(actualPct).toBeGreaterThan(21)
      expect(actualPct).toBeLessThan(29)
    })
  })
})
