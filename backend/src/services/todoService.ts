// Todo service — the business logic layer.
//
// Why a separate service instead of writing Prisma calls in routes?
// - Routes handle HTTP (parse request, set status code, format response).
// - Services handle BUSINESS LOGIC (validation rules, soft-delete semantics).
// - This makes the same logic reusable across REST routes AND MCP tools.
// - Dependency injection: receives `PrismaClient` as a param → easy to mock.
//
// Every function that writes data uses a transaction to guarantee atomicity.
// Every read query filters out soft-deleted records (deletedAt IS NULL).

import type { PrismaClient, Prisma } from '../generated/prisma/client.js'

// --- Types ---
// Re-export the Prisma-generated Todo type for use in routes/handlers.
// We also define input types here so consumers don't import Prisma directly.

export type { Todo } from '../generated/prisma/client.js'

export interface CreateTodoInput {
  text: string
}

export interface UpdateTodoInput {
  text?: string
  completed?: boolean
}

export interface ListTodosFilter {
  completed?: boolean
}

// --- Service factory ---
//
// Returns an object of methods, all closing over the injected `prisma` client.
// This is the "dependency injection via closure" pattern — simpler than a class
// for this size of codebase, and just as testable.

export function createTodoService(prisma: PrismaClient) {
  // Soft-delete filter reused by every read query.
  // `deletedAt: null` in Prisma means "WHERE deleted_at IS NULL".
  const notDeleted = { deletedAt: null } satisfies Prisma.TodoWhereInput

  return {
    // --- List ---
    // Optional filter by completed status. Always excludes soft-deleted.
    async list(filter?: ListTodosFilter) {
      const where: Prisma.TodoWhereInput = { ...notDeleted }

      if (filter?.completed !== undefined) {
        where.completed = filter.completed
      }

      return prisma.todo.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      })
    },

    // --- Get by ID ---
    // Returns null if not found OR soft-deleted (same thing to the caller).
    async getById(id: number) {
      return prisma.todo.findFirst({
        where: { id, ...notDeleted },
      })
    },

    // --- Create ---
    // Wraps in a transaction for consistency. Today it's a single insert,
    // but transactions are free for single ops and ready when we add
    // related writes (e.g., audit log entries) later.
    async create(input: CreateTodoInput) {
      return prisma.$transaction(async (tx) => {
        return tx.todo.create({
          data: {
            text: input.text,
            // completed defaults to false (schema default)
          },
        })
      })
    },

    // --- Update ---
    // Finds the record first to ensure it exists and isn't soft-deleted.
    // Returns null if not found (the route layer maps this to 404).
    async update(id: number, input: UpdateTodoInput) {
      return prisma.$transaction(async (tx) => {
        const existing = await tx.todo.findFirst({
          where: { id, ...notDeleted },
        })
        if (!existing) return null

        return tx.todo.update({
          where: { id },
          data: input,
        })
      })
    },

    // --- Soft delete ---
    // Sets `deletedAt` to now instead of removing the row.
    // The record becomes invisible to list/getById but remains in the DB
    // for audit, undo, and compliance (GDPR "right to erasure" uses hardDelete).
    async softDelete(id: number) {
      return prisma.$transaction(async (tx) => {
        const existing = await tx.todo.findFirst({
          where: { id, ...notDeleted },
        })
        if (!existing) return null

        return tx.todo.update({
          where: { id },
          data: { deletedAt: new Date() },
        })
      })
    },

    // --- Restore ---
    // Reverses a soft delete by clearing `deletedAt`. Useful for undo.
    async restore(id: number) {
      return prisma.$transaction(async (tx) => {
        // Only restore records that ARE soft-deleted.
        const existing = await tx.todo.findFirst({
          where: { id, deletedAt: { not: null } },
        })
        if (!existing) return null

        return tx.todo.update({
          where: { id },
          data: { deletedAt: null },
        })
      })
    },

    // --- Hard delete ---
    // Permanently removes the row. Use sparingly (GDPR erasure requests).
    async hardDelete(id: number) {
      return prisma.$transaction(async (tx) => {
        const existing = await tx.todo.findUnique({ where: { id } })
        if (!existing) return null

        await tx.todo.delete({ where: { id } })
        return existing
      })
    },

    // --- Toggle completed ---
    // Convenience method: flips the completed status.
    async toggleCompleted(id: number) {
      return prisma.$transaction(async (tx) => {
        const existing = await tx.todo.findFirst({
          where: { id, ...notDeleted },
        })
        if (!existing) return null

        return tx.todo.update({
          where: { id },
          data: { completed: !existing.completed },
        })
      })
    },
  }
}

// Inferred type for the service object — useful for typing route handlers.
export type TodoService = ReturnType<typeof createTodoService>
