// Shared e2e session helpers.
//
// Since Lesson 5.5 every /api/todos route requires a JWT, so e2e specs must
// authenticate. The auth endpoints are rate limited (see backend/src/routes/auth.ts):
//
//   POST /api/auth/register → 10 per hour per IP
//   POST /api/auth/login    →  5 per minute per IP
//
// That budget shapes the design here. The obvious approach — register a user in
// every test — burns the hourly cap after a couple of runs and makes the suite
// un-rerunnable, including on CI retries. Instead each spec creates ONE user in
// `beforeAll` and then seeds the resulting access token straight into
// localStorage for each test, which costs no auth requests at all.

import { expect, type APIRequestContext, type Page } from '@playwright/test'

// Must match the key used by frontend/src/lib/authToken.ts.
const TOKEN_KEY = 'todo.accessToken'

export interface E2eUser {
  email: string
  password: string
  accessToken: string
}

const PASSWORD = 'e2e-password-123'

/**
 * Register and log in a throwaway user, returning its credentials and access
 * token. Costs one register + one login, so call this once per spec file.
 */
export async function createE2eUser(
  request: APIRequestContext,
  label: string
): Promise<E2eUser> {
  // Unique email so reruns and parallel workers never collide on the unique index.
  const email = `e2e-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`

  const registered = await request.post('/api/auth/register', {
    data: { email, password: PASSWORD },
  })
  expect(
    registered.status(),
    'register should succeed — if this is 429, the 10/hour limit is spent'
  ).toBe(201)

  const loggedIn = await request.post('/api/auth/login', {
    data: { email, password: PASSWORD },
  })
  expect(
    loggedIn.status(),
    'login should succeed — if this is 429, the 5/minute limit is spent'
  ).toBe(200)

  const { accessToken } = await loggedIn.json()
  return { email, password: PASSWORD, accessToken }
}

/**
 * Put a valid access token in place before any app code runs, so the app boots
 * already signed in. AuthContext validates it via /api/auth/me — no auth
 * rate-limit cost. Call before `page.goto`.
 */
export async function seedSignedInSession(page: Page, accessToken: string): Promise<void> {
  await page.addInitScript(
    ({ key, token }) => window.localStorage.setItem(key, token),
    { key: TOKEN_KEY, token: accessToken }
  )
}

/** Start a test as a true stranger: no access token, no refresh cookie. */
export async function signOutCompletely(page: Page): Promise<void> {
  await page.context().clearCookies()
  await page.goto('/login')
  await page.evaluate((key) => window.localStorage.removeItem(key), TOKEN_KEY)
}

/** Authorization header for direct API calls (page.request carries no token). */
export function authHeaders(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}` }
}

/**
 * Delete every todo owned by the given user, for a clean slate between tests.
 * Ownership is scoped server-side, so this only ever touches this user's rows.
 */
export async function deleteAllTodos(
  request: APIRequestContext,
  accessToken: string
): Promise<void> {
  const headers = authHeaders(accessToken)
  const res = await request.get('/api/todos', { headers })
  expect(res.status(), 'listing todos for cleanup should be authorized').toBe(200)

  const todos = (await res.json()) as Array<{ id: number }>
  for (const todo of todos) {
    await request.delete(`/api/todos/${todo.id}`, { headers })
  }
}
