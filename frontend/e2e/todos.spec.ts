import { test, expect } from '@playwright/test'
import {
  createE2eUser,
  seedSignedInSession,
  authHeaders,
  deleteAllTodos,
  type E2eUser,
} from './support/session'

// E2E tests for the full-stack todo app.
//
// Prerequisites:
//   docker compose up -d   (starts frontend + backend + db)
//
// These tests run against the REAL backend + PostgreSQL — not MSW mocks.
// Data persists across page reloads, which we verify.
//
// Auth: /api/todos requires a JWT and scopes rows per owner (Lesson 5.5), so
// this spec runs as its own throwaway user. That also isolates it — the
// cleanup below can only ever delete this user's todos.

let user: E2eUser

test.describe('Todo App — Full-Stack E2E', () => {
  test.beforeAll(async ({ request }) => {
    user = await createE2eUser(request, 'todos')
  })

  test.beforeEach(async ({ page }) => {
    // Sign in before app code runs, then clear this user's todos via the API.
    await seedSignedInSession(page, user.accessToken)
    await deleteAllTodos(page.request, user.accessToken)
    await page.goto('/')
  })

  test('shows empty state when no todos exist', async ({ page }) => {
    // The todo list should be empty after cleanup
    const todoItems = page.locator('[data-testid="todo-item"]')
    await expect(todoItems).toHaveCount(0)
  })

  test('can add a todo and see it in the list', async ({ page }) => {
    const input = page.getByPlaceholder(/what needs to be done/i)
    await input.fill('Buy groceries')
    await input.press('Enter')

    // Wait for the todo to appear in the list
    await expect(page.getByText('Buy groceries')).toBeVisible()
  })

  test('todo persists after page reload (PostgreSQL)', async ({ page }) => {
    // Add a todo
    const input = page.getByPlaceholder(/what needs to be done/i)
    await input.fill('Persistent todo')
    await input.press('Enter')
    await expect(page.getByText('Persistent todo')).toBeVisible()

    // Reload — data should come from PostgreSQL, not in-memory
    await page.reload()
    await expect(page.getByText('Persistent todo')).toBeVisible()
  })

  test('can toggle a todo as completed', async ({ page }) => {
    // Add a todo
    const input = page.getByPlaceholder(/what needs to be done/i)
    await input.fill('Toggle me')
    await input.press('Enter')
    await expect(page.getByText('Toggle me')).toBeVisible()

    // Click the checkbox to toggle
    const checkbox = page.getByRole('checkbox').first()
    await checkbox.click()

    // Verify it's checked
    await expect(checkbox).toBeChecked()
  })

  test('can delete a todo', async ({ page }) => {
    // Add a todo
    const input = page.getByPlaceholder(/what needs to be done/i)
    await input.fill('Delete me')
    await input.press('Enter')
    await expect(page.getByText('Delete me')).toBeVisible()

    // Hover to reveal delete button, then click
    const todoItem = page.getByText('Delete me', { exact: true }).locator('..')
    await todoItem.hover()
    const deleteBtn = page.getByRole('button', { name: /delete todo: delete me/i })
    await deleteBtn.click()

    // Should be gone from the todo list
    await expect(page.getByText('Delete me', { exact: true })).not.toBeVisible()
  })

  test('can filter by active and completed', async ({ page }) => {
    const input = page.getByPlaceholder(/what needs to be done/i)

    // Add two todos
    await input.fill('Active task')
    await input.press('Enter')
    await input.fill('Completed task')
    await input.press('Enter')

    // Complete "Completed task" — find its checkbox specifically
    const completedItem = page.getByText('Completed task', { exact: true }).locator('..')
    await completedItem.getByRole('checkbox').click()

    // Filter: Active
    await page.getByRole('link', { name: /active/i }).click()
    await expect(page.getByText('Active task', { exact: true })).toBeVisible()
    await expect(page.getByText('Completed task', { exact: true })).not.toBeVisible()

    // Filter: Completed
    await page.getByRole('link', { name: /completed/i }).click()
    await expect(page.getByText('Completed task', { exact: true })).toBeVisible()
    await expect(page.getByText('Active task', { exact: true })).not.toBeVisible()

    // Filter: All
    await page.getByRole('link', { name: /all/i }).click()
    await expect(page.getByText('Active task', { exact: true })).toBeVisible()
    await expect(page.getByText('Completed task', { exact: true })).toBeVisible()
  })

  test('can clear completed todos', async ({ page }) => {
    const input = page.getByPlaceholder(/what needs to be done/i)

    // Add and complete a todo
    await input.fill('Clear me')
    await input.press('Enter')
    const checkbox = page.getByRole('checkbox').first()
    await checkbox.click()

    // Click clear completed
    const clearBtn = page.getByRole('button', { name: /clear completed/i })
    await clearBtn.click()

    // Should be gone
    await expect(page.getByText('Clear me')).not.toBeVisible()
  })

  test('API returns proper validation errors', async ({ page }) => {
    // POST with empty text should return 400. The request must be authenticated,
    // otherwise the auth guard returns 401 first and we never reach validation.
    const res = await page.request.post('/api/todos', {
      headers: authHeaders(user.accessToken),
      data: { text: '' },
    })
    expect(res.status()).toBe(400)

    const body = await res.json()
    // Validation response uses "error" key with field details
    expect(body.error).toBeDefined()
  })

  test('health check endpoint is reachable', async ({ page }) => {
    // Health check lives at /health/ready on the backend (not under /api)
    // so we call the backend directly — the Vite proxy only forwards /api/*
    const res = await page.request.get('http://localhost:3000/health/ready')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('ready')
  })
})
