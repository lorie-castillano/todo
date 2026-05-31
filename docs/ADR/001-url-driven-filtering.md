# ADR-001: URL-Driven Filtering Over Local State

**Date**: 2026-05-31
**Status**: Accepted
**Deciders**: Engineering team

---

## Context

The Todo app needs to support three filter views: All, Active, and Completed. The question was: where does the filter state live?

**Option A**: `useState` in `App.tsx`
**Option B**: URL path (`/`, `/active`, `/completed`)

---

## Decision

We chose **Option B: URL-driven filtering** via React Router.

The filter is derived from the current URL pathname using `getFilterFromPath(location.pathname)` in `App.tsx`. Navigation between filters uses `<Link>` components, which update the URL and trigger a re-render.

---

## Reasoning

### Why URL state wins

1. **Shareability** — a user can copy the URL `/completed` and share it. With `useState`, that link would always open on "All".
2. **Bookmarkability** — browsers can bookmark a filtered view natively.
3. **Back/forward navigation** — the browser's history stack works for free. With `useState`, the back button does nothing meaningful.
4. **Deep linking** — future backend integration or email links can point to a specific filter.
5. **No sync required** — the URL *is* the state. No `useEffect` to keep them in sync.

### Why we rejected `useState`

- Ephemeral: filter resets on refresh
- No shareability
- Forces manual sync between state and URL if we ever want routing

---

## Consequences

### Positive
- Filters are bookmarkable, shareable, and SEO-friendly
- Browser navigation works as expected
- Zero state sync complexity

### Negative
- Requires React Router as a dependency
- Component must call `useLocation()` — slightly more complex than `useState`
- Programmatic navigation needs `useNavigate()` instead of a simple setter

### Neutral
- Filter state is now global (URL), not local — this is appropriate since filtering is a page-level concern

---

## Related Files

- `src/App.tsx` — `getFilterFromPath()` and filter derivation
- `src/router.tsx` — route definitions
- `src/components/FilterNav.tsx` — `<Link>` components for navigation
