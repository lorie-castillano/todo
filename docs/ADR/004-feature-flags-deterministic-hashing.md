# ADR-004: Feature Flags with Deterministic Hashing for Percentage Rollouts

**Date**: 2026-05-31
**Status**: Accepted
**Deciders**: Engineering team

---

## Context

We needed a feature flag system to safely roll out new features to subsets of users without deploying separate code. The requirements were:

1. **Boolean flags** — fully on/off
2. **Percentage rollouts** — e.g., 25% of users see the new bulk-actions toolbar
3. **User targeting** — specific user IDs (internal testers, beta users)
4. **Stable assignment** — a user in the 25% rollout must stay in it across sessions and page reloads

The challenge: *stability*. If we use `Math.random()`, a user at 24.9% might see the feature sometimes and not other times — a confusing experience.

---

## Decision

We use **deterministic hashing (FNV-1a style)** to map a user + flag name pair to a stable bucket (0–99):

```ts
function hashToBucket(input: string): number {
  let hash = 2166136261
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return Math.abs(hash) % 100
}

// Usage: bucket = hashToBucket(`${flagName}:${userId}`)
// If bucket < rollout percentage → flag is ON
```

The input is `"flagName:userId"` — combining both ensures:
- Same user gets different buckets for different flags (independent rollouts)
- Same flag + user always produces the same bucket (stable assignment)

---

## Reasoning

### Why FNV-1a style hash

1. **Deterministic** — same input always produces same output, no randomness
2. **Uniform distribution** — values spread evenly across 0–99 with low collision rate
3. **Zero dependencies** — pure math, no library needed, works in any runtime
4. **Fast** — O(n) where n is string length; negligible for short flag+user strings
5. **Independent per flag** — `"bulkActions:user-1"` and `"darkModeV2:user-1"` produce different buckets

### Why not `Math.random()`

- Non-deterministic: different result every call → user experience flickers
- Cannot persist without a database or cookie

### Why not localStorage-based assignment

- Must be cleared when rolling back — operational risk
- Not available in SSR contexts
- Still requires a random seed somewhere

### Why not a server-side flag service (LaunchDarkly, etc.)

- Overkill for Phase 4 (no backend yet)
- Adds network dependency and latency for each flag evaluation
- Will be reconsidered in Phase 5 once the backend is live

---

## Flag Registry Structure

```ts
const FLAGS = {
  bulkActions:   { kind: 'percentage', rollout: 25 },
  aiSuggestions: { kind: 'userList', userIds: ['user-1', 'user-internal'] },
  darkModeV2:    { kind: 'boolean', enabled: true },
} as const satisfies Record<string, FlagRule>
```

`as const satisfies` preserves literal types while enforcing the `FlagRule` discriminated union — TypeScript will error if a new `kind` is added but not handled in `isFeatureEnabled`.

---

## Consequences

### Positive
- Stable user assignment with zero network calls
- Independent rollout per flag
- Type-safe flag names (no typos at call site)
- Exhaustiveness check: adding a new `FlagRule.kind` forces a handler in `isFeatureEnabled`

### Negative
- No real-time flag updates (requires app reload to pick up changes)
- No admin UI — flags are code-level configuration only
- Percentage distribution is approximate (FNV-1a is not cryptographically perfect)

### Future Work (Phase 5+)
- Integrate with backend flag service for real-time updates
- ~~Add real `userId` from authentication (currently defaults to `'anonymous'`)~~ ✅ Done in Lesson 5.5: `useFeatureFlag` now reads the authenticated user's id (see ADR-006). Live features: `bulkActions` (percentage) and `aiSuggestions` (userList).

---

## Related Files

- `src/lib/featureFlags.ts` — flag registry, `isFeatureEnabled`, `hashToBucket`
- `src/hooks/useFeatureFlag.ts` — React hook for component consumption
- `src/lib/featureFlags.test.ts` — unit tests for all three flag strategies
