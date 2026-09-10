import { test, expect } from '@playwright/test'
import {
  createE2eUser,
  seedSignedInSession,
  signOutCompletely,
  type E2eUser,
} from './support/session'

// E2E tests for the route guards (Lesson 3.4 — protected routes).
//
// Prerequisites:
//   docker compose up -d   (starts frontend + backend + db)
//
// These run against the REAL backend, so they also prove the server-side guard:
// an unauthenticated /api/todos call must be rejected, not merely hidden by the
// client-side redirect.
//
// Auth here is deliberately frugal (see e2e/support/session.ts for the full
// rate-limit rationale): ONE register + ONE API login in beforeAll, plus ONE
// real UI login for the round-trip test. Tests that merely need to *be* signed
// in seed the token into localStorage instead of logging in again.

const TODO_INPUT = /what needs to be done/i

let user: E2eUser

test.describe('Route guards — auth redirects', () => {
  test.beforeAll(async ({ request }) => {
    user = await createE2eUser(request, 'guards')
  })

  test.beforeEach(async ({ page }) => {
    await signOutCompletely(page)
  })

  test('redirects an unauthenticated visitor from / to /login', async ({ page }) => {
    await page.goto('/')

    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
    // The app shell must not render behind the login form.
    await expect(page.getByPlaceholder(TODO_INPUT)).not.toBeVisible()
  })

  test('redirects unauthenticated visitors from every protected route', async ({ page }) => {
    for (const path of ['/', '/active', '/completed']) {
      await page.goto(path)
      await expect(page).toHaveURL(/\/login$/)
    }
  })

  test('the login redirect replaces history, so Back does not bounce', async ({ page }) => {
    // Land on a normal page first so there is somewhere to go back to.
    await page.goto('/login')
    await page.goto('/completed')
    await expect(page).toHaveURL(/\/login$/)

    await page.goBack()

    // With `replace`, /completed never entered history — Back lands on the
    // original /login, not in a redirect ping-pong.
    await expect(page).toHaveURL(/\/login$/)
  })

  test('returns the user to their full original destination after logging in', async ({
    page,
  }) => {
    // Deep-link with a query string so this one login covers both the
    // remembered-destination and the query-preservation behaviors.
    await page.goto('/active?q=urgent')
    await expect(page).toHaveURL(/\/login$/)

    await page.getByLabel(/email/i).fill(user.email)
    await page.getByLabel(/password/i).fill(user.password)
    await page.getByRole('button', { name: /sign in/i }).click()

    // pathname-only round-tripping would land on /active and drop ?q=urgent.
    await expect(page).toHaveURL(/\/active\?q=urgent$/)
    await expect(page.getByPlaceholder(TODO_INPUT)).toBeVisible()
  })

  test('redirects an authenticated user away from /login', async ({ page }) => {
    await seedSignedInSession(page, user.accessToken)
    await page.goto('/login')

    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByPlaceholder(TODO_INPUT)).toBeVisible()
    await expect(page.getByRole('button', { name: /create account/i })).not.toBeVisible()
  })

  test('does not flash the login page on reload for a signed-in user', async ({ page }) => {
    await seedSignedInSession(page, user.accessToken)
    await page.goto('/')
    await expect(page.getByPlaceholder(TODO_INPUT)).toBeVisible()

    await page.reload()

    // The guard waits on `loading` instead of guessing, so we should never be
    // sent to /login while the session is still being restored.
    await expect(page.getByPlaceholder(TODO_INPUT)).toBeVisible()
    await expect(page).toHaveURL(/\/$/)
  })

  test('a dead session redirects to /login without a manual reload', async ({ page }) => {
    await seedSignedInSession(page, user.accessToken)
    await page.goto('/')
    await expect(page.getByPlaceholder(TODO_INPUT)).toBeVisible()

    // Simulate the unrecoverable case deterministically: the access token has
    // expired (todo calls 401) AND the refresh cookie is gone (refresh 401).
    // Intercepting is better than waiting 15 minutes for a real expiry, and it
    // costs no rate-limit budget.
    await page.route('**/api/todos**', (route) =>
      route.fulfill({ status: 401, contentType: 'application/json', body: '{}' })
    )
    await page.route('**/api/auth/refresh', (route) =>
      route.fulfill({ status: 401, contentType: 'application/json', body: '{}' })
    )

    // Trigger an authenticated request. apiFetch gets a 401, fails to refresh,
    // and announces the expiry — which must clear React state and redirect.
    // Before the sessionEvents fix, the user sat here until a manual reload.
    const input = page.getByPlaceholder(TODO_INPUT)
    await input.fill('should not save')
    await input.press('Enter')

    await expect(page).toHaveURL(/\/login$/, { timeout: 10_000 })
  })

  test('the backend rejects unauthenticated todo requests', async ({ page }) => {
    // The client guard is UX; this is the guard that actually protects data.
    const res = await page.request.get('/api/todos', {
      headers: { Authorization: '' },
    })

    expect(res.status()).toBe(401)
  })
})
