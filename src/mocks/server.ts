// MSW server integration for tests
// Uses node-based interception instead of service workers.

import { setupServer } from 'msw/node'
import { handlers } from './handlers'
import { db } from './db'

export const server = setupServer(...handlers)

// Helper to reset the database state between tests
export function resetDatabase() {
  // Clear all todos by directly mutating the internal store
  // This is a test-only escape hatch
  const allTodos = db.todo.getAll()
  allTodos.forEach((todo) => {
    db.todo.delete({ where: { id: { equals: todo.id } } })
  })
}
