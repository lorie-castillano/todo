// apiFetch — a thin fetch wrapper that attaches the JWT to every request.
//
// Why wrap fetch?
// - DRY: every authenticated call needs the same Authorization header.
// - Central 401 handling: if the token is rejected (expired/invalid), we clear
//   it so the app falls back to the login flow on the next render.
//
// Usage is identical to fetch():
//   const res = await apiFetch('/api/todos', { method: 'POST', body })

import { getToken, clearToken } from './authToken'

export async function apiFetch(
  input: string,
  init: RequestInit = {}
): Promise<Response> {
  const token = getToken()

  // Merge our headers with any caller-provided headers.
  const headers = new Headers(init.headers)
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(input, { ...init, headers })

  // If the server rejects our token, clear it. The next render of a protected
  // route will redirect to /login. We don't redirect here to keep this layer
  // free of router/UI concerns.
  if (response.status === 401) {
    clearToken()
  }

  return response
}
