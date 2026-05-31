# Code Review Checklist

> Use this checklist for every PR before requesting a review. A reviewer who sees all boxes checked can focus on design and logic — not style and basics.

---

## 1. Correctness

- [ ] Does the code do what the PR description says it does?
- [ ] Are edge cases handled? (empty list, null/undefined, 0, very large input)
- [ ] Are error paths tested, not just the happy path?
- [ ] Do existing tests still pass? (`npm run test:run`)
- [ ] Is there at least one test for the new behavior?

---

## 2. TypeScript

- [ ] No `any` — use `unknown` + type guard if the shape is truly unknown
- [ ] No non-null assertions (`!`) without a comment explaining why it's safe
- [ ] Return types are explicit on all exported functions
- [ ] New domain concepts use branded types if ID confusion is possible (see `TodoId`)
- [ ] Discriminated unions have exhaustiveness checks (`default: const _x: never = ...`)
- [ ] `satisfies` used instead of type casting where possible

---

## 3. React

- [ ] No missing `key` props in lists
- [ ] No keys that are array indexes when list order can change
- [ ] `useEffect` deps array is correct — no stale closures, no missing deps
- [ ] Expensive computations are wrapped in `useMemo`
- [ ] Event handlers that depend on props/state are wrapped in `useCallback`
- [ ] No direct state mutation — always spread or use immutable update patterns
- [ ] Lazy loading used for heavy components (e.g., `lazy(() => import(...))`)
- [ ] Error boundaries wrap sections that can throw independently

---

## 4. Accessibility (a11y)

- [ ] All interactive elements are reachable by keyboard (`Tab`, `Enter`, `Space`)
- [ ] Buttons have descriptive `aria-label` if their text is not self-explanatory
- [ ] Dynamic content changes are announced via `aria-live` or `role="status"`
- [ ] Color is not the only indicator of state (also use text or icon)
- [ ] Form inputs have associated `<label>` elements (not just placeholder)
- [ ] `axe-core` audit passes: `npm run test:a11y` (or check CI)

---

## 5. Performance

- [ ] No unnecessary re-renders — check with React DevTools Profiler if uncertain
- [ ] Images have explicit `width` and `height` to prevent layout shift (CLS)
- [ ] Heavy libraries are imported lazily or tree-shaken
- [ ] No synchronous operations on the main thread > 50ms
- [ ] `React.memo` used on components that receive stable props and render frequently

---

## 6. Security

- [ ] No secrets, API keys, or tokens hardcoded in source
- [ ] User input is never dangerously rendered as HTML (`dangerouslySetInnerHTML`)
- [ ] External links have `rel="noopener noreferrer"` if `target="_blank"`
- [ ] Environment variables are prefixed `VITE_` and documented in `.env.example`

---

## 7. Error Handling & Observability

- [ ] Errors are caught at the right boundary (not swallowed silently)
- [ ] `reportError()` is called with sufficient context (component, action, userId)
- [ ] Log levels are appropriate: `debug` for dev noise, `warn` for recoverable, `error` for failures
- [ ] New features behind a feature flag if risk of regression is high

---

## 8. Code Quality

- [ ] Functions are short and do one thing (< ~30 lines is a guide, not a rule)
- [ ] Variable and function names describe *what*, not *how*
- [ ] No dead code (unused imports, commented-out blocks, unreachable branches)
- [ ] No magic numbers — constants are named (`const MAX_TODO_LENGTH = 280`)
- [ ] Repeated logic extracted into a shared utility or hook (DRY)
- [ ] No deeply nested ternaries (extract to a named variable or early return)

---

## 9. Architecture

- [ ] New component lives in the right layer (`components/`, `hooks/`, `lib/`, `pages/`)
- [ ] `lib/` files have no React imports (pure logic only)
- [ ] State lives at the right level (URL for filter, Zustand for undo history, TanStack Query for server state)
- [ ] Significant architectural decisions are documented in `docs/ADR/`

---

## 10. Before Merging

- [ ] PR title follows conventional commits format: `feat(scope): description`
- [ ] PR description explains *why* the change was made, not just *what*
- [ ] CI is green (lint, typecheck, tests, a11y audit, build)
- [ ] No merge conflicts
- [ ] Screenshots or a Loom video for UI changes

---

## Severity Guide

| Label | Meaning | Must fix before merge? |
|-------|---------|----------------------|
| 🔴 **Blocker** | Bug, security issue, broken functionality | Yes |
| 🟡 **Suggestion** | Better approach exists but current is acceptable | Author's call |
| 🔵 **Nitpick** | Style, naming preference, minor cleanup | Optional |
| 💡 **Learning** | Educational note, no action needed | No |

---

*This checklist is a living document. Add new items when recurring review comments appear.*
