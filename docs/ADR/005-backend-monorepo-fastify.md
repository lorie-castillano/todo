# ADR-005: Backend as a Separate Package with Fastify

**Date**: 2026-06-01
**Status**: Accepted
**Deciders**: Engineering team

---

## Context

Phase 5 adds a real backend to replace the MSW mock API. Two foundational decisions were needed:

1. **Where does the backend live?** Same package as the frontend, a separate package in the same repo, or a separate repo entirely?
2. **Which HTTP framework?** Express, Fastify, Hono, or Nest?

---

## Decision

1. **Structure**: The backend lives in a `server/` directory with its **own `package.json`**, sharing the same git repository (a lightweight monorepo).
2. **Framework**: **Fastify 5** with TypeScript, Pino for logging, and Zod for validation.

```
todo/
├── src/            # Frontend (React + Vite)
├── server/         # Backend (Fastify) — own package.json, own node_modules
│   └── src/
│       ├── index.ts          # entry + graceful shutdown
│       ├── app.ts            # buildApp() factory (testable)
│       ├── config.ts         # Zod-validated env
│       ├── logger.ts         # Pino logger
│       ├── plugins/          # middleware layer (correlation ID)
│       └── routes/           # routes layer (health checks)
└── docs/
```

---

## Reasoning

### Why a separate package (not same package)

- **Dependency isolation**: Fastify/Pino must never end up in the frontend bundle. Separate `node_modules` makes this structural, not a discipline problem.
- **Independent tooling**: backend uses `tsx`/`tsc` to Node; frontend uses Vite. Separate tsconfigs avoid conflicting compiler targets (Node ESM vs browser).
- **Clear boundary**: the API contract between them is HTTP, not shared imports.

### Why a monorepo (not a separate repo)

- **Atomic changes**: a feature touching both frontend and backend lands in one commit/PR — no cross-repo version dance.
- **Shared types later**: Phase 5.6 can extract a `shared/` types package consumed by both sides.
- **Learning simplicity**: one repo to clone, one place to track progress.

### Why Fastify (not Express)

| Criterion | Fastify | Express |
|-----------|---------|---------|
| Performance | ~2x faster (benchmarks) | Baseline |
| Schema validation | Built-in (JSON Schema) | Manual / middleware |
| TypeScript support | First-class, typed instance | Via `@types`, weaker |
| Logging | Pino built in | Bring your own |
| Plugin system | Encapsulated, ordered | Loose middleware chain |
| Async/await | Native, returns-as-response | Callback-oriented legacy |

Fastify's encapsulated plugin model also maps cleanly onto the layered
architecture we want (plugins = middleware, routes = handlers, services = logic).

### Why Pino + Zod

- **Pino**: fastest Node logger; Fastify uses it internally, so framework and app logs share one format and destination. Child loggers give per-request correlation IDs for free.
- **Zod**: validates env at startup (fail-fast) and will validate request bodies in Lesson 5.3 — one validation library across the whole stack (the frontend uses it too).

---

## Key Patterns Established

- **App factory** (`buildApp()`): builds the instance without listening, so tests use `app.inject()` for in-memory requests — no ports, no flakiness.
- **Correlation ID single source of truth**: `genReqId` resolves the `x-correlation-id` header (or generates a UUID) into `req.id`; the correlation plugin reuses `req.id` so `reqId === correlationId` always.
- **Liveness vs readiness**: `/health` (process alive) is separate from `/health/ready` (dependencies available) so a slow DB doesn't trigger needless restarts.
- **Graceful shutdown**: `SIGTERM`/`SIGINT` drain in-flight requests via `app.close()` with a 10s force-exit guard.

---

## Consequences

### Positive
- Frontend and backend evolve independently but ship together
- Type-safe, fast, schema-first backend foundation
- Observability (correlation IDs, structured logs) built in from line one

### Negative
- Two `npm install` locations (`/` and `/server`)
- Two `node_modules` directories (more disk, but isolated)
- Developers must remember which package a command runs in

### Future Work
- Lesson 5.2: PostgreSQL + Prisma; wire DB check into `/health/ready`
- Lesson 5.3: Zod request validation + centralized error formatting
- Lesson 5.6: extract a shared types package for end-to-end type safety

---

## Related Files

- `server/package.json`, `server/tsconfig.json`
- `server/src/index.ts` — entry + graceful shutdown
- `server/src/app.ts` — app factory
- `server/src/config.ts` — Zod env validation
- `server/src/logger.ts` — Pino logger
- `server/src/plugins/correlationId.ts` — request tracing
- `server/src/routes/health.ts` — liveness + readiness
