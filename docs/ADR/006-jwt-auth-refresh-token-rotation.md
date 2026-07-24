# ADR-006: JWT Authentication with Refresh-Token Rotation

**Date**: 2026-07-24
**Status**: Accepted
**Deciders**: Engineering team

---

## Context

Lesson 5.5 turns the app multi-user. Todos must belong to a user, and the API
must authenticate every request to `/api/todos`. Two questions drove the design:

1. **What token model?** Plain session cookies, a single long-lived JWT, or a
   short access token + long refresh token pair?
2. **Where do tokens live in the browser?** `localStorage`, memory, or cookies?

The tension is the classic **security vs. UX** tradeoff:

- A long-lived token is convenient (users stay logged in) but dangerous if
  stolen — it stays valid for weeks with no way to revoke it.
- A short-lived token is safe (small blast radius) but annoying — users get
  logged out constantly.

---

## Decision

We use a **two-token model** with **refresh-token rotation**:

1. **Access token** — a short-lived JWT (`JWT_EXPIRES_IN`, default **15m**),
   returned in the JSON login response. The SPA stores it and sends it as
   `Authorization: Bearer <token>` on API calls.
2. **Refresh token** — a long-lived opaque random string
   (`REFRESH_TOKEN_TTL_DAYS`, default **7 days**), delivered **only** as an
   `httpOnly` cookie. It is **rotated on every use** and can be **revoked**.

Passwords are hashed with **bcrypt**. Refresh tokens are stored in the DB as
**SHA-256 hashes** (never plaintext).

```
Login  ──▶ { user, accessToken }  +  Set-Cookie: refreshToken (httpOnly)
                                         │
15m later access token expires ─────────┤
                                         ▼
POST /api/auth/refresh (cookie only) ──▶ new accessToken + rotated cookie
```

---

## Reasoning

### Why short access token + long refresh token

- **Small blast radius**: a leaked access token is useless after ~15 minutes.
- **Revocability**: refresh tokens live in the DB, so logout / compromise can
  invalidate a session immediately — impossible with a stateless JWT alone.
- **Good UX**: silent refresh keeps the user logged in without re-typing
  credentials for up to 7 days.

### Why rotation (new refresh token on every refresh)

- **Theft detection**: each refresh token is single-use. If an attacker steals
  one and uses it, the legitimate user's next refresh fails (token already
  rotated), surfacing the breach instead of allowing silent parallel access.
- The old token is revoked in the **same transaction** the new one is created,
  so there is never a window with two valid tokens.

### Why store only a SHA-256 hash of the refresh token

- A database leak cannot be used to forge sessions — the raw token never
  touches storage. Same principle as hashing passwords (SHA-256 is sufficient
  here because refresh tokens are already high-entropy random values; bcrypt is
  reserved for low-entropy human passwords).

### Why `httpOnly` cookie for the refresh token but `localStorage` for the access token

| | Access token | Refresh token |
|---|---|---|
| Lifetime | 15m | 7 days |
| Storage | `localStorage` | `httpOnly` cookie |
| Readable by JS? | Yes (XSS risk) | **No** (XSS-safe) |
| Rationale | Short life limits XSS damage; SPA needs to read it to set the header | Long-lived + powerful, so it must be invisible to JS |

The cookie is hardened: `httpOnly`, `sameSite: 'lax'` (blocks most CSRF while
allowing top-level navigation), `secure` in production (HTTPS-only), and
**path-scoped to `/api/auth`** so it is never sent on `/api/todos` requests —
smaller attack surface and less header overhead.

### Why per-user ownership is enforced in the service layer

Every `todoService` method takes a `userId` and filters on it
(`where: { id, userId, deletedAt: null }`). A user can never read or mutate
another user's todos, even if they guess an ID. Enforcing this in the service
(not just the route) means the same guarantee holds when MCP tools reuse the
service in Lesson 5.7.

---

## Consequences

### Positive
- Short-lived access tokens + revocable, rotating refresh tokens = strong
  security with seamless UX.
- Server-side revocation enables real logout and breach response.
- Ownership scoping centralized in the service layer, reused by REST and (later) MCP.

### Negative
- Stateful refresh tokens require a DB table and a rotation transaction (more
  moving parts than a pure stateless JWT).
- `localStorage` access token is still XSS-readable — acceptable given the 15m
  lifetime, but a fully hardened app would move it to memory + a silent-refresh
  iframe or use `httpOnly` for both with a CSRF token.
- The frontend must handle 401 → silent refresh → retry (implemented in `apiFetch`).

### Future Work
- Reuse-detection: if a revoked refresh token is presented, revoke the entire
  token family (not just the single token).
- ~~Per-route rate limits on `/api/auth/*` (brute-force hardening).~~ ✅ Done (ADR-007): `/login` capped at 5/min and `/register` at 10/hour per IP, backed by the shared Redis store. Next layer: per-account lockout (email-keyed exponential backoff) and CAPTCHA after N failures.
- Move access token to in-memory storage to eliminate the `localStorage` XSS surface.

---

## Related Files

**Backend**
- `backend/src/services/authService.ts` — bcrypt, JWT sign/verify, refresh issue/rotate/revoke
- `backend/src/routes/auth.ts` — register / login / refresh / logout / me + cookie handling
- `backend/src/plugins/auth.ts` — the `authenticate` guard decorator
- `backend/src/services/todoService.ts` — per-user ownership scoping
- `backend/prisma/schema.prisma` — `User`, `RefreshToken`, required `Todo.userId`
- `backend/src/config.ts` — `JWT_SECRET`, `JWT_EXPIRES_IN`, `REFRESH_TOKEN_TTL_DAYS`

**Frontend**
- `frontend/src/context/AuthContext.tsx` — session restore + logout
- `frontend/src/lib/apiFetch.ts` — silent refresh on 401 (shared in-flight promise)
- `frontend/src/lib/authApi.ts` — auth calls with `credentials: 'include'`
- `frontend/src/lib/authToken.ts` — access-token storage
