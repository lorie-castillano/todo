import { describe, it, expect, vi } from 'vitest'

// Logger is noise in these tests — mock it to a no-op.
vi.mock('./logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { isFeatureEnabled, isInPercentageRollout } from './featureFlags'

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

    it('enables the flag for the onboarded demo/beta user', () => {
      // 'mock-user-1' was added to the aiSuggestions userList (Lesson 5.5),
      // simulating onboarding a real beta account by its id.
      expect(isFeatureEnabled('aiSuggestions', { userId: 'mock-user-1' })).toBe(true)
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

  // Simulates a real gradual rollout: bumping a flag 0 → 25 → 100 and observing
  // who gets it. Uses the pure helper so we can vary the percentage freely.
  describe('gradual rollout ramp (0 → 25 → 100)', () => {
    const users = Array.from({ length: 10000 }, (_, i) => `user-${i}`)
    const enabledAt = (rollout: number) =>
      users.filter((u) => isInPercentageRollout('bulkActions', u, rollout))

    it('enables nobody at 0%', () => {
      expect(enabledAt(0)).toHaveLength(0)
    })

    it('enables everybody at 100%', () => {
      expect(enabledAt(100)).toHaveLength(users.length)
    })

    it('enables roughly a quarter at 25%', () => {
      const pct = (enabledAt(25).length / users.length) * 100
      expect(pct).toBeGreaterThan(21)
      expect(pct).toBeLessThan(29)
    })

    it('is monotonic — raising the rollout never removes a user', () => {
      // Every user enabled at 25% must still be enabled at 50% and 100%.
      const at25 = new Set(enabledAt(25))
      const at50 = new Set(enabledAt(50))
      const at100 = new Set(enabledAt(100))

      for (const u of at25) {
        expect(at50.has(u)).toBe(true)
        expect(at100.has(u)).toBe(true)
      }
      // And the cohort only grows.
      expect(at50.size).toBeGreaterThanOrEqual(at25.size)
      expect(at100.size).toBeGreaterThanOrEqual(at50.size)
    })

    it('keeps a single user stable as the rollout ramps up', () => {
      // Once a user is in, they stay in. Find the rollout at which a user first
      // becomes enabled, then confirm they remain enabled for all higher values.
      const userId = 'ramp-stable-user'
      let firstEnabledAt = -1
      for (let r = 0; r <= 100; r++) {
        if (isInPercentageRollout('bulkActions', userId, r)) {
          firstEnabledAt = r
          break
        }
      }
      // From that point on, they must never flip back off.
      if (firstEnabledAt >= 0) {
        for (let r = firstEnabledAt; r <= 100; r++) {
          expect(isInPercentageRollout('bulkActions', userId, r)).toBe(true)
        }
      }
    })
  })
})
