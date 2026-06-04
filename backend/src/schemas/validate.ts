// Validation helper — wraps Zod's safeParse into a Fastify-friendly pattern.
//
// Why not just call schema.parse() directly?
// - parse() throws a ZodError. Fastify's internal error handling can
//   intercept it before our custom setErrorHandler sees it, resulting
//   in a generic 500 instead of a structured 400.
// - safeParse() returns a result object (success/error) — no throwing.
//   We check the result and send a 400 ourselves if validation fails.
//
// This helper formats Zod issues into a clean { field, message } array
// that clients can display next to form fields.

import type { ZodType, ZodTypeDef, ZodIssue } from 'zod'
import type { FastifyReply, FastifyRequest } from 'fastify'

interface ValidationError {
  field: string
  message: string
}

function formatIssues(issues: ZodIssue[]): ValidationError[] {
  return issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }))
}

/**
 * Validate data against a Zod schema. Returns the parsed data on success,
 * or sends a 400 response with field-level errors and returns null.
 *
 * Usage in routes:
 * ```ts
 * const body = await validate(createTodoSchema, req.body, req, reply)
 * if (!body) return  // 400 already sent
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function validate<T>(
  schema: ZodType<T, ZodTypeDef, any>,
  data: unknown,
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<T | null> {
  const result = schema.safeParse(data)

  if (result.success) {
    return result.data
  }

  req.log.warn({ issues: result.error.issues }, 'Validation failed')

  await reply.code(400).send({
    error: 'Validation Error',
    message: 'Request validation failed',
    details: formatIssues(result.error.issues),
    correlationId: req.correlationId,
  })

  return null
}
