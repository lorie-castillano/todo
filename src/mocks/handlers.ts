// MSW request handlers
// These intercept fetch/XHR requests and return mock responses.
// This is the "fake backend" that makes our app feel real during development.

import { http, HttpResponse, delay } from 'msw'
import { db } from './db'
import type { Todo } from '../types'

// Simulate network latency (100-400ms random)
// This forces us to handle loading states properly.
const networkDelay = () => delay(Math.random() * 300 + 100)

// Type for our todo model from the database
interface DbTodo {
  id: number | string
  text: string
  completed: boolean
  createdAt: number
}

// Transform DB model to our app's Todo type
function toTodo(dbTodo: DbTodo): Todo {
  return {
    id: typeof dbTodo.id === 'string' ? parseInt(dbTodo.id, 10) || Date.now() : dbTodo.id,
    text: dbTodo.text,
    completed: dbTodo.completed,
  }
}

export const handlers = [
  // GET /api/todos — list all todos
  http.get('/api/todos', async () => {
    await networkDelay()
    const todos = db.todo.getAll().map(toTodo)
    return HttpResponse.json(todos)
  }),

  // POST /api/todos — create new todo
  http.post('/api/todos', async ({ request }) => {
    await networkDelay()
    const body = (await request.json()) as { text: string }
    
    // Validation
    if (!body.text?.trim()) {
      return HttpResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    // Duplicate check (case insensitive)
    const existing = db.todo.findFirst({
      where: { text: { equals: body.text.trim() } },
    })
    if (existing) {
      return HttpResponse.json({ error: 'Todo already exists' }, { status: 409 })
    }

    const created = db.todo.create({
      text: body.text.trim(),
      completed: false,
    })

    return HttpResponse.json(toTodo(created), { status: 201 })
  }),

  // PATCH /api/todos/:id — update todo
  http.patch('/api/todos/:id', async ({ request, params }) => {
    await networkDelay()
    const id = parseInt(params.id as string, 10)
    const body = (await request.json()) as Partial<Pick<Todo, 'completed' | 'text'>>

    const existing = db.todo.findFirst({ where: { id: { equals: id } } })
    if (!existing) {
      return HttpResponse.json({ error: 'Todo not found' }, { status: 404 })
    }

    const updated = db.todo.update({
      where: { id: { equals: id } },
      data: {
        ...(body.completed !== undefined && { completed: body.completed }),
        ...(body.text !== undefined && { text: body.text.trim() }),
      },
    })

    return HttpResponse.json(toTodo(updated!))
  }),

  // DELETE /api/todos/:id — delete single todo
  http.delete('/api/todos/:id', async ({ params }) => {
    await networkDelay()
    const id = parseInt(params.id as string, 10)

    const existing = db.todo.findFirst({ where: { id: { equals: id } } })
    if (!existing) {
      return HttpResponse.json({ error: 'Todo not found' }, { status: 404 })
    }

    db.todo.delete({ where: { id: { equals: id } } })
    return new HttpResponse(null, { status: 204 })
  }),

  // DELETE /api/todos?completed=true — clear completed
  http.delete('/api/todos', async ({ request }) => {
    await networkDelay()
    const url = new URL(request.url)
    const completed = url.searchParams.get('completed')

    if (completed === 'true') {
      const completedTodos = db.todo.findMany({ where: { completed: { equals: true } } })
      completedTodos.forEach((todo) => {
        db.todo.delete({ where: { id: { equals: todo.id } } })
      })
    }

    return new HttpResponse(null, { status: 204 })
  }),
]
