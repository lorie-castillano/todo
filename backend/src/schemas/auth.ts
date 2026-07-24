// Zod schemas for authentication routes.
//
// These validate register/login payloads. We keep them separate from todo
// schemas because auth has its own trust boundary and error messages.

import { z } from 'zod'

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be 128 characters or fewer'),
})
export type RegisterBody = z.infer<typeof registerSchema>

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})
export type LoginBody = z.infer<typeof loginSchema>
