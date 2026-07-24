# Todo App

A production-grade Todo application built as a learning curriculum for full-stack, AI-ready engineering. It demonstrates senior-level patterns across a **React + TypeScript frontend** and a **Fastify + PostgreSQL backend**: URL-driven state, accessibility, performance monitoring, error boundaries, feature flags, structured logging, CI/CD, JWT authentication with refresh-token rotation, and per-user data ownership.

> **Curriculum**: This app is the hands-on project for a 9-phase engineering curriculum covering React, Node.js, MCP, A2A, system design, AI governance, and more.

---

## Features

- **Full CRUD** — create, edit, toggle, delete todos with optimistic updates
- **Authentication** — register/login with bcrypt + JWT access tokens and rotating, revocable refresh tokens (httpOnly cookie)
- **Per-user data** — todos are scoped to the authenticated user; no cross-user access
- **Feature-flagged UI** — bulk-actions toolbar (percentage rollout) and AI suggestions panel (beta userList targeting)
- **URL-driven filtering** — `/`, `/active`, `/completed` are bookmarkable and shareable
- **Undo/redo** — command pattern with keyboard shortcuts (⌘Z / ⌘⇧Z)
- **Accessibility** — WCAG 2.1 AA: keyboard navigation, ARIA live regions, screen reader announcements
- **Error boundaries** — graceful fallback UI with Sentry reporting
- **Performance monitoring** — Web Vitals (LCP, INP, CLS, TTFB, FCP) sent to Sentry
- **Structured logging** — log levels, correlation IDs, Sentry integration
- **Feature flags** — boolean, percentage rollout, and user-list targeting strategies
- **Dark mode** — system preference detection via `prefers-color-scheme`
- **CI/CD** — GitHub Actions: lint, test, build, accessibility audit on every PR

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript (strict mode) |
| Build | Vite |
| Styling | TailwindCSS |
| Routing | React Router v7 |
| Data fetching | TanStack Query v5 |
| API mocking | MSW v2 |
| Testing | Vitest + Testing Library + vitest-axe |
| Error monitoring | Sentry |
| CI/CD | GitHub Actions + Vercel |

### Backend

| Layer | Technology |
|-------|-----------|
| Framework | Fastify 5 + TypeScript (strict mode) |
| Database | PostgreSQL + Prisma ORM |
| Auth | JWT (access) + rotating refresh tokens, bcrypt password hashing |
| Validation | Zod (request bodies, params, query, env) |
| Security | Helmet, CORS (credentials), rate limiting |
| Logging | Pino (structured, correlation IDs) |
| API docs | OpenAPI / Swagger UI at `/docs` |
| Runtime | Docker Compose (db + backend + frontend + pgAdmin) |

---

## Getting Started

### Prerequisites

- Node.js 20+ (LTS)
- npm 10+

### Install

```bash
npm install
```

### Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SENTRY_DSN` | Optional | Sentry DSN for error reporting (omit in dev) |
| `VITE_APP_VERSION` | Optional | App version tag shown in error reports |

### Run

```bash
npm run dev        # Start dev server (http://localhost:5173)
npm run build      # Production build
npm run preview    # Preview production build locally
```

### Test

```bash
npm test           # Run all tests (watch mode)
npm run test:run   # Run tests once (CI mode)
npm run lint       # ESLint + TypeScript checks
npm run typecheck  # Type-check without emitting
```

---

## Project Structure

```
src/
├── components/       # UI components (single responsibility)
│   ├── ErrorBoundary.tsx   # Catches render errors, reports to Sentry
│   ├── TodoItem.tsx        # Individual todo with inline edit
│   ├── TodoList.tsx        # Renders filtered list with AnimatedList
│   ├── AnimatedList.tsx    # Generic animated list <AnimatedList<T>>
│   ├── List.tsx            # Generic typed list <List<T>>
│   └── ...
├── hooks/            # Custom React hooks
│   ├── useTodos.ts         # Data fetching with TanStack Query
│   ├── useTodoCommands.ts  # Undo/redo command pattern
│   └── useFeatureFlag.ts   # Feature flag evaluation hook
├── lib/              # Pure logic, no React deps
│   ├── config.ts           # Env config (type-safe, validated)
│   ├── errorReporter.ts    # Error reporting (Sentry + context)
│   ├── featureFlags.ts     # Feature flag engine
│   ├── logger.ts           # Structured logger with correlation IDs
│   ├── sentry.ts           # Sentry initialization
│   └── webVitals.ts        # Web Vitals → Sentry
├── stores/           # Zustand state (undo/redo history)
├── mocks/            # MSW handlers for API mocking
├── pages/            # Route-level page components
├── types.ts          # Shared domain types (TodoId branded type, etc.)
├── router.tsx        # React Router config
└── main.tsx          # App entry point (bootstrap, Sentry, Web Vitals)

docs/
├── ADR/              # Architecture Decision Records
└── CODE_REVIEW_CHECKLIST.md
```

---

## Architecture Overview

### Data Flow

```
URL (/active) → React Router → App.tsx (getFilterFromPath)
                                    ↓
                             useTodos (TanStack Query → MSW → in-memory store)
                                    ↓
                             useTodoCommands (command pattern → undo/redo)
                                    ↓
                             Zustand history store
```

### Key Patterns

- **Branded types** — `TodoId = number & { __brand: 'TodoId' }` prevents ID misuse at compile time
- **Command pattern** — every mutation is a reversible `Command` object stored in history
- **URL-driven state** — filter is derived from the URL, not local state (bookmarkable)
- **Generic components** — `List<T>` and `AnimatedList<T>` are reusable without `any`
- **Feature flags** — deterministic FNV-1a hashing for stable percentage rollouts

### Error Handling

```
Render error → ErrorBoundary → reportBoundaryError() → Sentry
Runtime error → try/catch → reportError() → Sentry (prod) / console (dev)
```

### Observability Stack

```
User session → logger (correlation ID) → Sentry breadcrumbs
Web Vitals → sendToSentry() → Sentry performance dashboard
Error boundary → reportBoundaryError(correlationId) → Sentry issue
```

---

## Architecture Decision Records

See [`docs/ADR/`](./docs/ADR/) for documented architectural decisions:

- [ADR-001: URL-driven filtering over local state](./docs/ADR/001-url-driven-filtering.md)
- [ADR-002: Command pattern for undo/redo](./docs/ADR/002-command-pattern-undo-redo.md)
- [ADR-003: MSW for API mocking in tests](./docs/ADR/003-msw-api-mocking.md)
- [ADR-004: Feature flags with deterministic hashing](./docs/ADR/004-feature-flags-deterministic-hashing.md)
- [ADR-005: Backend as a separate package with Fastify](./docs/ADR/005-backend-monorepo-fastify.md)
- [ADR-006: JWT authentication with refresh-token rotation](./docs/ADR/006-jwt-auth-refresh-token-rotation.md)

---

## Contributing

See [`docs/CODE_REVIEW_CHECKLIST.md`](./docs/CODE_REVIEW_CHECKLIST.md) for what we look for in every PR.
