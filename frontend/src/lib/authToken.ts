// Auth token storage — single source of truth for the JWT access token.
//
// Why centralize this?
// - One place to change storage strategy (localStorage → cookie → memory).
// - The fetch layer and auth context both read/write the token here, so they
//   never drift out of sync.
//
// Security note: localStorage is vulnerable to XSS (any injected script can
// read it). For this app it's an acceptable tradeoff; a hardened production
// app would use httpOnly cookies + CSRF tokens. We document this in the
// production checklist.

const TOKEN_KEY = 'todo.accessToken'

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    // localStorage can throw in private mode / SSR — fail closed (no token).
    return null
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    // Ignore write failures; the user will just need to log in again.
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    // No-op.
  }
}
