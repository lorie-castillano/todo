// Zod schemas for todo route validation.
//
// These are the TRUST BOUNDARY — the point where untrusted client data
// enters our system. Everything past here (services, Prisma) can assume
// the data is valid.
//
// Each schema validates a specific piece of the HTTP request:
// - Body schemas validate JSON payloads
// - Params schemas validate URL path parameters (:id)
// - Query schemas validate query string parameters (?completed=true)
//
// We export both the schema (for runtime validation) and the inferred
// TypeScript type (for compile-time safety). This ensures the runtime
// checks and the types are always in sync — no drift.

import { z } from 'zod'

// --- Path parameters ---

export const todoParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
})
export type TodoParams = z.infer<typeof todoParamsSchema>

// --- Request bodies ---

export const createTodoSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, 'Text is required')
    .max(500, 'Text must be 500 characters or fewer'),
})
export type CreateTodoBody = z.infer<typeof createTodoSchema>

export const updateTodoSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, 'Text cannot be empty')
    .max(500, 'Text must be 500 characters or fewer')
    .optional(),
  completed: z.boolean().optional(),
})
export type UpdateTodoBody = z.infer<typeof updateTodoSchema>

// --- Query parameters ---

export const listTodosQuerySchema = z.object({
  completed: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
})
export type ListTodosQuery = z.infer<typeof listTodosQuerySchema>
