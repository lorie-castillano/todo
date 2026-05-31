# ADR-003: MSW for API Mocking in Development and Tests

**Date**: 2026-05-31
**Status**: Accepted
**Deciders**: Engineering team

---

## Context

The frontend is being built before the backend exists (Phase 4 before Phase 5). We need a way to:

1. Develop the UI against realistic API responses without a running server
2. Test components that make HTTP calls without network dependency
3. Simulate loading states, errors, and edge cases reliably

---

## Decision

We use **Mock Service Worker (MSW v2)** for all API mocking:

- **In tests** (Vitest + Node.js): MSW runs a Node server (`src/mocks/server.ts`) that intercepts `fetch` calls
- **In development** (browser): MSW registers a Service Worker (`src/mocks/browser.ts`) that intercepts real HTTP requests at the network layer

Both environments share the same handler definitions (`src/mocks/handlers.ts`), ensuring test and dev behavior are identical.

---

## Reasoning

### Why MSW over alternatives

| Approach | Problem |
|----------|---------|
| Manual `fetch` mocking (`vi.mock`) | Per-test boilerplate, doesn't test real HTTP behavior |
| JSON Server | Separate process, no TypeScript, limited control over responses |
| Axios interceptors | Couples mocking to the HTTP client, not portable |
| MSW | Intercepts at network layer, works in browser and Node, handler reuse |

### Key advantages of MSW

1. **Real fetch calls** — components call `fetch()` normally; MSW intercepts before the network. Tests exercise real HTTP behavior.
2. **Shared handlers** — one set of handlers for dev and test. Changing a mock response updates both.
3. **Network-layer isolation** — no coupling to fetch implementation. Swapping to Axios or `ky` requires no mock changes.
4. **Realistic errors** — MSW can simulate 500 errors, 404s, network delays — exactly as a real backend would.
5. **Service Worker in browser** — dev experience mirrors production; the app doesn't know it's mocked.

---

## Migration Plan (Phase 5)

When the real backend is built:

1. Remove `src/mocks/browser.ts` import from `main.tsx` (dev no longer needs MSW)
2. Keep `src/mocks/server.ts` for integration tests (test isolation remains important)
3. Update handlers to match real API contracts for test parity
4. Eventually remove MSW from dev entirely; keep for tests only

---

## Consequences

### Positive
- Frontend development is fully decoupled from backend readiness
- Tests are fast (no real network), deterministic, and isolated
- Realistic error simulation without special test utilities

### Negative
- MSW Service Worker must be registered before the app renders (async bootstrap)
- Service Workers require HTTPS in production (no issue since we serve over HTTPS)
- Developers must remember that dev API calls are mocked — real server bugs won't surface in dev

---

## Related Files

- `src/mocks/handlers.ts` — shared request handlers
- `src/mocks/server.ts` — Node.js test server
- `src/mocks/browser.ts` — browser Service Worker
- `src/App.tsx` — `startMocking()` called in dev mode
