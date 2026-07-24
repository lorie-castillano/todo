// Auth API — typed wrappers around the backend auth endpoints.
//
// Endpoints (proxied to the Fastify backend via Vite):
//   POST /api/auth/register → { user }
//   POST /api/auth/login    → { user, accessToken }
//   GET  /api/auth/me       → { user }   (requires Authorization header)
//
// These functions handle the token lifecycle: login/register store nothing
// automatically — the AuthContext decides when to persist the token. That
// keeps side effects out of the API layer and in the state layer.

import { getToken } from './authToken'

// --- Types ---
// Mirror the backend's SafeUser shape. In a larger monorepo these would live
// in a shared package; here we duplicate the minimal contract.

export interface AuthUser {
  id: string
  email: string
  createdAt?: string
}

export interface LoginResult {
  user: AuthUser
  accessToken: string
}

export interface Credentials {
  email: string
  password: string
}

// --- Error helper ---
// Extracts a friendly message from the backend's error JSON shape:
//   { error, message, correlationId } or { details: [{ field, message }] }

async function extractError(response: Response): Promise<string> {
  try {
    const body = await response.json()
    if (Array.isArray(body?.details) && body.details.length > 0) {
      return body.details.map((d: { message: string }) => d.message).join(', ')
    }
    return body?.message || body?.error || `Request failed (${response.status})`
  } catch {
    return `Request failed (${response.status})`
  }
}

// Note: every auth call uses `credentials: 'include'` so the browser sends and
// stores the httpOnly refresh-token cookie, even cross-origin (Vite :5173 →
// backend :3000 in dev). Without this, Set-Cookie is ignored by the browser.

// --- Register ---
export async function registerUser(creds: Credentials): Promise<AuthUser> {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(creds),
  })

  if (!response.ok) {
    throw new Error(await extractError(response))
  }

  const body = (await response.json()) as { user: AuthUser }
  return body.user
}

// --- Login ---
export async function loginUser(creds: Credentials): Promise<LoginResult> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(creds),
  })

  if (!response.ok) {
    throw new Error(await extractError(response))
  }

  return (await response.json()) as LoginResult
}

// --- Refresh ---
// Exchanges the httpOnly refresh cookie for a new access token (and rotates the
// cookie). Returns the new session, or null if the cookie is missing/expired.
export async function refreshSession(): Promise<LoginResult | null> {
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'include',
  })

  if (!response.ok) return null
  return (await response.json()) as LoginResult
}

// --- Logout ---
// Revokes the refresh token server-side and clears the cookie. Best-effort:
// network failures shouldn't block the client from clearing local state.
export async function logoutRequest(): Promise<void> {
  try {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
  } catch {
    // Ignore — local logout still proceeds.
  }
}

// --- Me ---
// Validates the stored token and returns the current user. Used on app load
// to restore the session. Returns null if there's no valid token.
export async function fetchMe(): Promise<AuthUser | null> {
  const token = getToken()
  if (!token) return null

  const response = await fetch('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok) {
    return null
  }

  const body = (await response.json()) as { user: AuthUser }
  return body.user
}
