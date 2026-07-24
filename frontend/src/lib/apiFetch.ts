// apiFetch — a fetch wrapper that attaches the JWT and transparently refreshes
// it when it expires.
//
// Why wrap fetch?
// - DRY: every authenticated call needs the same Authorization header.
// - Silent refresh: access tokens are short-lived (15m). When one expires the
//   server returns 401; we call /api/auth/refresh (using the httpOnly refresh
//   cookie), store the new access token, and retry the original request ONCE.
//   The user never sees a spurious logout.
// - Central failure handling: if refresh also fails, we clear the token so the
//   next render of a protected route redirects to /login.
//
// Concurrency: many requests can 401 at the same moment. We share a single
// in-flight refresh promise so we only rotate the refresh token once — issuing
// N parallel refreshes would rotate the cookie N times and invalidate itself.
//
// Usage is identical to fetch():
//   const res = await apiFetch('/api/todos', { method: 'POST', body })

import { getToken, setToken, clearToken } from './authToken'
import { refreshSession } from './authApi'

// Build the request with the current token attached.
function withAuth(input: string, init: RequestInit): Promise<Response> {
  const token = getToken()
  const headers = new Headers(init.headers)
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  return fetch(input, { ...init, headers })
}

// Shared in-flight refresh. Null when no refresh is happening.
let refreshPromise: Promise<boolean> | null = null

// Attempt a token refresh, deduplicating concurrent callers. Resolves true if
// a new access token was obtained.
function refreshOnce(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = refreshSession()
      .then((session) => {
        if (session) {
          setToken(session.accessToken)
          return true
        }
        return false
      })
      .catch(() => false)
      .finally(() => {
        // Clear so the next 401 (after this token also expires) can refresh again.
        refreshPromise = null
      })
  }
  return refreshPromise
}

export async function apiFetch(
  input: string,
  init: RequestInit = {}
): Promise<Response> {
  let response = await withAuth(input, init)

  if (response.status === 401) {
    const refreshed = await refreshOnce()
    if (refreshed) {
      // Retry the original request once with the fresh access token.
      response = await withAuth(input, init)
    } else {
      // Refresh failed — session is truly gone. Clear local token; the next
      // protected-route render redirects to /login.
      clearToken()
    }
  }

  return response
}
