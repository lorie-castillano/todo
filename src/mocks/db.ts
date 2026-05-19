// Mock database using @mswjs/data
// This gives us a realistic CRUD API with persistent in-memory storage.
// In tests, we can reset this. In browser dev, it persists until reload.

import { factory, primaryKey } from '@mswjs/data'

export const db = factory({
  todo: {
    id: primaryKey(() => Date.now() + Math.random()),
    text: String,
    completed: Boolean,
    createdAt: () => Date.now(),
  },
})

// Seed with some initial data for demo purposes
export function seedDatabase() {
  const existing = db.todo.getAll()
  if (existing.length === 0) {
    db.todo.create({ text: 'Learn React Query', completed: false })
    db.todo.create({ text: 'Build a production app', completed: false })
    db.todo.create({ text: 'Write tests for API layer', completed: true })
  }
}
