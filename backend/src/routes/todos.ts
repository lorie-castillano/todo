// Todo REST routes — the HTTP layer.
//
// Responsibilities:
// 1. Parse and validate incoming data (Zod schemas via validate())
// 2. Call the service layer (business logic)
// 3. Format the HTTP response (status codes, JSON shape)
//
// This file has ZERO business logic — it's pure HTTP plumbing.
// The same todoService is reused by MCP tools in Lesson 5.4.
//
// Route contract matches the MSW mock handlers so the frontend
// works with zero changes when we swap MSW for the real backend.
//
// Validation uses safeParse (not parse) via the validate() helper.
// This returns a 400 with field-level errors instead of throwing,
// which avoids Fastify's internal error handler intercepting ZodErrors.

import type { FastifyPluginAsync } from 'fastify'
import {
  createTodoSchema,
  updateTodoSchema,
  todoParamsSchema,
  listTodosQuerySchema,
} from '../schemas/todo.js'
import { validate } from '../schemas/validate.js'

export const todoRoutes: FastifyPluginAsync = async (fastify) => {
  // Every todo route requires a valid JWT. The authenticate guard runs
  // before each handler and attaches `req.user`. We attach it via a route-level
  // preHandler on each route below so the ownership scope is explicit.

  // --- GET /api/todos ---
  // List the authenticated user's active (non-deleted) todos.
  // Optional query: ?completed=true or ?completed=false
  fastify.get('/api/todos', { preHandler: fastify.authenticate }, async (req, reply) => {
    const query = await validate(listTodosQuerySchema, req.query, req, reply)
    if (!query) return

    const userId = req.user!.id
    const todos = await fastify.todoService.list(
      userId,
      query.completed !== undefined ? { completed: query.completed } : undefined
    )

    // Map to the shape the frontend expects (id, text, completed).
    // We strip audit fields (createdAt, updatedAt, deletedAt) from
    // the response — the frontend doesn't need them.
    return todos.map((t) => ({
      id: t.id,
      text: t.text,
      completed: t.completed,
    }))
  })

  // --- POST /api/todos ---
  // Create a new todo owned by the authenticated user. Returns 201.
  fastify.post('/api/todos', { preHandler: fastify.authenticate }, async (req, reply) => {
    const body = await validate(createTodoSchema, req.body, req, reply)
    if (!body) return

    const userId = req.user!.id

    // Duplicate check (case-insensitive), scoped to this user's todos.
    const existing = await fastify.todoService.list(userId)
    const duplicate = existing.find(
      (t) => t.text.toLowerCase() === body.text.toLowerCase()
    )
    if (duplicate) {
      return reply.code(409).send({
        error: 'Todo already exists',
        correlationId: req.correlationId,
      })
    }

    const todo = await fastify.todoService.create({ text: body.text, userId })

    return reply.code(201).send({
      id: todo.id,
      text: todo.text,
      completed: todo.completed,
    })
  })

  // --- PATCH /api/todos/:id ---
  // Partial update (text, completed, or both). Scoped to the owner.
  fastify.patch('/api/todos/:id', { preHandler: fastify.authenticate }, async (req, reply) => {
    const params = await validate(todoParamsSchema, req.params, req, reply)
    if (!params) return
    const body = await validate(updateTodoSchema, req.body, req, reply)
    if (!body) return

    const userId = req.user!.id

    // Build update input, only including fields that were provided.
    // This avoids passing `undefined` values which conflict with
    // exactOptionalPropertyTypes in strict TypeScript.
    const input: { text?: string; completed?: boolean } = {}
    if (body.text !== undefined) input.text = body.text
    if (body.completed !== undefined) input.completed = body.completed

    const updated = await fastify.todoService.update(params.id, userId, input)
    if (!updated) {
      return reply.code(404).send({
        error: 'Todo not found',
        correlationId: req.correlationId,
      })
    }

    return {
      id: updated.id,
      text: updated.text,
      completed: updated.completed,
    }
  })

  // --- DELETE /api/todos/:id ---
  // Soft-delete a single todo owned by the authenticated user.
  fastify.delete('/api/todos/:id', { preHandler: fastify.authenticate }, async (req, reply) => {
    const params = await validate(todoParamsSchema, req.params, req, reply)
    if (!params) return

    const userId = req.user!.id
    const deleted = await fastify.todoService.softDelete(params.id, userId)
    if (!deleted) {
      return reply.code(404).send({
        error: 'Todo not found',
        correlationId: req.correlationId,
      })
    }

    return reply.code(204).send()
  })

  // --- DELETE /api/todos?completed=true ---
  // Clear the authenticated user's completed todos (soft-delete each one).
  fastify.delete('/api/todos', { preHandler: fastify.authenticate }, async (req, reply) => {
    const query = await validate(listTodosQuerySchema, req.query, req, reply)
    if (!query) return

    const userId = req.user!.id

    if (query.completed) {
      const completedTodos = await fastify.todoService.list(userId, { completed: true })
      await Promise.all(
        completedTodos.map((t) => fastify.todoService.softDelete(t.id, userId))
      )
    }

    return reply.code(204).send()
  })
}
