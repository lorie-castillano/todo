# ADR-007: System Design & Scaling Posture

**Date**: 2026-07-24
**Status**: Accepted
**Deciders**: Engineering team

---

## Context

Lesson 5.6 was a system-design study. Rather than let the analysis evaporate,
this ADR records **the deliberate scaling posture of this app** and the
tradeoffs behind it — so future contributors (and interviewers) understand not
just *what* we run, but *why we haven't scaled further yet.*

The app today is a **modular monolith**: one Fastify process, one PostgreSQL
primary, deployed via Docker Compose. The question this ADR answers: *is that
right, and what is the escalation path when it isn't?*

---

## Decision

We deliberately run the **simplest correct architecture** and will climb the
scaling ladder **only when a measured bottleneck forces each step** — never
preemptively.

| Dimension | Current choice | First escalation | Avoid unless forced |
|-----------|----------------|------------------|---------------------|
| Compute | Single instance (vertical) | Horizontal + load balancer | — |
| Database | Single Postgres primary | Add a **read replica** | **Sharding** |
| Data model | Relational (SQL/Postgres) | — | NoSQL |
| Architecture | Modular monolith | Extract a service at a clean seam | Full microservices |
| API style | REST + Swagger | URI versioning (`/v1`) at first external consumer | GraphQL / gRPC |
| Consistency | Strong (single primary) | Read-your-own-writes on replica | AP / eventual by default |
| Rate limiting | **Shared Redis store** + per-route auth limits | Per-account lockout / CAPTCHA | Distributed token buckets |

---

## Reasoning

### Compute & statelessness
The API is already **horizontally scalable**: access tokens are stateless JWTs
(any instance validates with `JWT_SECRET`) and all shared state lives in
Postgres, not process memory (ADR-006). No sticky sessions required. Vertical
scaling covers current load; horizontal is a config change, not a rewrite.

### Database
Data is deeply relational (`User` owns `Todo[]` and `RefreshToken[]` with FK
cascades), so **SQL is correct** — referential integrity for free. The app is
**read-heavy**, so the first scaling move is a **read replica**, accepting
**replication lag** (eventual consistency) mitigated by read-your-own-writes.
**Sharding is explicitly rejected** for the foreseeable future: `userId` would
be the natural shard key, but a single primary comfortably serves millions of
todo users, and sharding's cost (no cross-shard joins, hard transactions,
rebalancing) buys nothing we need.

### Indexing
The composite index `@@index([userId, completed, deletedAt])` is `userId`-first
by design (leftmost-prefix rule): every query scopes to the authenticated user
via the index — fast *and* privacy-preserving. Indexes are added for columns we
filter/sort on only, accepting slightly slower writes for much faster reads.

### Architecture
A **modular monolith** gives clean layer boundaries (`routes/` → `services/` →
`plugins/`) and fast iteration. Because `authService` and `todoService` are
capability-aligned seams, a service can be **extracted later** if team size or
scale demands — without the network failure modes, orchestration, and
distributed tracing that microservices impose today (ADR-005).

### API & consistency
REST fits flat CRUD resources and one web client; versioning is deferred until
an external consumer exists. The app is **strongly consistent** (single
primary), which matches user expectations (a just-added todo must appear).
Eventual consistency is a tool reserved for scale pressure, adopted as a
conscious C-for-A trade.

### Rate limiting (resolved)
`@fastify/rate-limit` previously used an **in-memory store**, correct for one
instance but wrong under horizontal scaling (a user gets `limit × instanceCount`).
**Resolved**: the limiter now uses a **shared Redis store** when `REDIS_URL` is
set (all instances share one counter), falling back to in-memory for
single-instance dev. It **fails open** (`skipOnError`) so a Redis outage degrades
to "no limiting" rather than taking down the API — an availability-over-strictness
trade.

**Per-route hardening (done)**: the global limit is 100/min, but auth endpoints
get stricter route-level overrides that reuse the same Redis store —
`/api/auth/login` at **5/min per IP** (brute-force / credential-stuffing) and
`/api/auth/register` at **10/hour per IP** (account-creation spam + bcrypt CPU
abuse). Verified: attempts 6+ on login return `429`; the counter lives at Redis
key `fastify-rate-limit-POST/api/auth/login-<ip>`. Remaining follow-up:
per-account lockout (email-keyed backoff) and CAPTCHA after N failures.

Implementation: `backend/src/redis.ts` (client factory), `backend/src/app.ts`
(store wiring + graceful shutdown), `backend/src/routes/auth.ts` (per-route
overrides), `redis` service in `docker-compose.yml`.

---

## Consequences

### Positive
- Minimal operational surface; one stack trace tells the whole story.
- Strong consistency and referential integrity by default — fewer correctness bugs.
- Clean seams keep the horizontal-scale and service-extraction doors open.

### Negative / Known limits
- Single primary is a scaling ceiling and a single point of failure (acceptable pre-scale; replica is the answer).
- `localStorage` access token retains an XSS surface (ADR-006).

### Escalation triggers (when to act)
- **Read latency / DB CPU high** → add read replica.
- **Sustained traffic beyond one instance** → horizontal scale (Redis rate-limit store already in place; set `REDIS_URL`).
- **First external API consumer** → freeze and version `/v1`.
- **Independent team/scale for a capability** → extract that service at its seam.

---

## Related
- ADR-005: Backend as a separate package with Fastify (modular monolith)
- ADR-006: JWT authentication with refresh-token rotation (statelessness, transactions)
- `backend/prisma/schema.prisma` — relational model, cascade deletes, composite index
- `backend/src/plugins/prisma.ts` — connection pooling, DI decoration
- `backend/src/redis.ts` — shared rate-limit store client factory
- `backend/src/app.ts` — CORS, Helmet, rate limiting (Redis store), Swagger
