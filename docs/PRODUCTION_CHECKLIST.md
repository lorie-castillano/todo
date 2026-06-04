# Production Deployment Checklist

> Use this checklist before deploying the Todo app to production.
> Each section covers a critical area. All items should be green before go-live.

---

## 1. Infrastructure

- [ ] **Docker images built with production targets** — backend Dockerfile uses multi-stage build (`runtime` target, not `deps`)
- [ ] **Environment variables set** — never hardcode secrets; use platform-provided env management (Vercel, Railway, Fly.io)
- [ ] **Database provisioned** — managed PostgreSQL (e.g., Supabase, Neon, AWS RDS) with connection pooling
- [ ] **DATABASE_URL** points to production database (not `localhost`)
- [ ] **CORS_ORIGIN** set to production frontend URL (not `localhost:5173`)
- [ ] **NODE_ENV=production** — enables Fastify production optimizations and disables dev logging

## 2. Database

- [ ] **Migrations applied** — `npx prisma migrate deploy` run against production database
- [ ] **Backups configured** — automated daily backups with point-in-time recovery
- [ ] **Connection pooling** — use PgBouncer or managed pool (Prisma Accelerate, Supabase pooler)
- [ ] **Indexes verified** — check `EXPLAIN ANALYZE` on common queries
- [ ] **Soft delete cleanup** — scheduled job to purge old soft-deleted records (optional)

## 3. Security

- [ ] **HTTPS everywhere** — TLS certificates for both frontend and backend domains
- [ ] **Helmet enabled** — security headers (CSP, HSTS, X-Frame-Options)
- [ ] **Rate limiting** — per-IP and per-endpoint limits configured for production load
- [ ] **CORS restricted** — only allow the production frontend origin
- [ ] **No secrets in code** — verified with `git log --all -p | grep -i "password\|secret\|key"` (should find nothing)
- [ ] **API authentication** — API keys or OAuth for backend endpoints (Lesson 5.5)
- [ ] **Input validation** — Zod schemas on all endpoints (already done)

## 4. Frontend

- [ ] **Production build** — `npm run build` in `frontend/` produces optimized bundle
- [ ] **Static hosting** — deploy `frontend/dist/` to Vercel, Netlify, or Cloudflare Pages
- [ ] **API base URL** — set `VITE_API_BASE_URL` to production backend URL
- [ ] **MSW disabled** — `VITE_USE_BACKEND=true` in production (MSW only for development)
- [ ] **Error reporting** — Sentry DSN configured for production environment
- [ ] **Bundle size** — run `npm run analyze` and verify no unexpected large dependencies
- [ ] **SPA routing** — `vercel.json` rewrites or equivalent configured for client-side routing

## 5. Backend

- [ ] **Health checks** — `/health/live` and `/health/ready` endpoints accessible
- [ ] **Structured logging** — Pino logs in JSON format, shipped to log aggregator
- [ ] **Graceful shutdown** — SIGTERM handler drains connections before exit
- [ ] **Request timeouts** — prevent runaway requests from consuming resources
- [ ] **Error responses** — no stack traces or internal details leaked to clients
- [ ] **OpenAPI docs** — Swagger UI disabled in production or behind auth

## 6. Monitoring & Observability

- [ ] **Uptime monitoring** — external pinger (UptimeRobot, Better Uptime) hits `/health/live`
- [ ] **Error tracking** — Sentry or equivalent captures both frontend and backend errors
- [ ] **Performance metrics** — Web Vitals (LCP, INP, CLS) reported to analytics
- [ ] **Log aggregation** — centralized logging (Datadog, Grafana Cloud, AWS CloudWatch)
- [ ] **Alerting** — alerts for 5xx spikes, high latency, database connection failures

## 7. CI/CD

- [ ] **All CI checks pass** — lint, typecheck, test, build, backend-check
- [ ] **E2E tests pass** — Playwright suite green against staging environment
- [ ] **Preview deploys** — PRs get preview URLs for manual review
- [ ] **Automated production deploy** — merge to `main` triggers deploy pipeline
- [ ] **Rollback plan** — ability to revert to previous deployment within minutes

## 8. Documentation

- [ ] **README up to date** — setup instructions, architecture overview, contribution guide
- [ ] **ADRs documented** — key decisions recorded in `docs/ADR/`
- [ ] **API documentation** — OpenAPI spec available at `/docs` (staging) or exported
- [ ] **Runbook** — incident response steps for common failures (DB down, high traffic)

---

## Quick Deploy Commands

```bash
# Build and deploy frontend (Vercel)
cd frontend && npm run build && vercel --prod

# Deploy backend (Docker)
cd backend && docker build --target runtime -t todo-backend .
docker run -p 3000:3000 --env-file .env.production todo-backend

# Run production migrations
cd backend && DATABASE_URL=$PROD_DB_URL npx prisma migrate deploy
```

---

*Last updated: June 4, 2026*
