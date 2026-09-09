// A2A (Agent-to-Agent) protocol types and Zod schemas.
//
// These are based on Google's A2A protocol draft and define the shape of:
//   - AgentCard          → advertised at `/.well-known/agent.json`
//   - Task / TaskStatus  → the lifecycle of delegated work
//   - Message / Part     → the content exchanged between agents
//   - Artifact           → structured outputs produced by a task
//
// Why Zod instead of just TypeScript interfaces?
// - Runtime validation at the boundary
// - Type inference keeps schemas and types in one source of truth
// - A2A messages come from untrusted remote agents; validate everything.

import { z } from 'zod'

// --- Agent capability advertisement ---

export const agentCapabilitiesSchema = z.object({
  streaming: z.boolean().default(false),
  pushNotifications: z.boolean().default(false),
  stateTransitionHistory: z.boolean().default(false),
})

export const agentAuthenticationSchema = z.object({
  schemes: z.array(z.string()),
  credentials: z.string().optional(),
})

export const skillSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  tags: z.array(z.string()).default([]),
  examples: z.array(z.string()).default([]),
  inputModes: z.array(z.string()).optional(),
  outputModes: z.array(z.string()).optional(),
})

export const agentCardSchema = z.object({
  name: z.string(),
  description: z.string(),
  url: z.string().url(),
  version: z.string(),
  capabilities: agentCapabilitiesSchema,
  authentication: agentAuthenticationSchema.nullable().optional(),
  defaultInputModes: z.array(z.string()).default(['text']),
  defaultOutputModes: z.array(z.string()).default(['text']),
  skills: z.array(skillSchema).default([]),
  metadata: z.record(z.unknown()).optional(),
})

export type AgentCapabilities = z.infer<typeof agentCapabilitiesSchema>
export type AgentAuthentication = z.infer<typeof agentAuthenticationSchema>
export type Skill = z.infer<typeof skillSchema>
export type AgentCard = z.infer<typeof agentCardSchema>

// --- Message parts ---
// A Part is the smallest unit of agent communication.
// It is a discriminated union by `type` so consumers can switch safely.

export const textPartSchema = z.object({
  type: z.literal('text'),
  text: z.string(),
})

export const filePartSchema = z.object({
  type: z.literal('file'),
  file: z.object({
    name: z.string().optional(),
    mimeType: z.string().optional(),
    bytes: z.string().optional(),
    uri: z.string().url().optional(),
  }),
})

export const dataPartSchema = z.object({
  type: z.literal('data'),
  data: z.record(z.unknown()),
})

export const partSchema = z.discriminatedUnion('type', [
  textPartSchema,
  filePartSchema,
  dataPartSchema,
])

export type TextPart = z.infer<typeof textPartSchema>
export type FilePart = z.infer<typeof filePartSchema>
export type DataPart = z.infer<typeof dataPartSchema>
export type Part = z.infer<typeof partSchema>

// --- Messages ---

export const messageSchema = z.object({
  role: z.enum(['user', 'agent']),
  parts: z.array(partSchema),
  metadata: z.record(z.unknown()).optional(),
})

export type Message = z.infer<typeof messageSchema>

// --- Task status ---
// State machine: pending → working → (input-required → working)* → completed/canceled

export const taskStatusSchema = z.object({
  state: z.enum(['pending', 'working', 'input-required', 'completed', 'failed', 'canceled']),
  message: messageSchema.optional(),
  timestamp: z.string().datetime().optional(),
})

export type TaskStatus = z.infer<typeof taskStatusSchema>

// --- Artifacts ---
// Structured output produced by a task, e.g., a created todo record.

export const artifactSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  parts: z.array(partSchema),
  metadata: z.record(z.unknown()).optional(),
  index: z.number().int().nonnegative(),
})

export type Artifact = z.infer<typeof artifactSchema>

// --- Task ---

export const taskSchema = z.object({
  id: z.string(),
  sessionId: z.string().optional(),
  status: taskStatusSchema,
  history: z.array(messageSchema).default([]),
  artifacts: z.array(artifactSchema).default([]),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
})

export type Task = z.infer<typeof taskSchema>

// --- Push notifications ---

export const pushNotificationConfigSchema = z.object({
  url: z.string().url(),
  token: z.string().optional(),
})

export type PushNotificationConfig = z.infer<typeof pushNotificationConfigSchema>

// --- Request / response envelopes ---

export const taskSendRequestSchema = z.object({
  id: z.string().optional(),
  sessionId: z.string().optional(),
  message: messageSchema,
  acceptedOutputModes: z.array(z.string()).optional(),
  pushNotification: pushNotificationConfigSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
})

export const taskGetRequestSchema = z.object({
  id: z.string(),
})

export const taskCancelRequestSchema = z.object({
  id: z.string(),
})

export type TaskSendRequest = z.infer<typeof taskSendRequestSchema>
export type TaskGetRequest = z.infer<typeof taskGetRequestSchema>
export type TaskCancelRequest = z.infer<typeof taskCancelRequestSchema>

// --- SSE events ---

export const taskStatusUpdateEventSchema = z.object({
  type: z.literal('task-status-update'),
  taskId: z.string(),
  status: taskStatusSchema,
})

export const taskArtifactUpdateEventSchema = z.object({
  type: z.literal('task-artifact-update'),
  taskId: z.string(),
  artifact: artifactSchema,
})

export type TaskStatusUpdateEvent = z.infer<typeof taskStatusUpdateEventSchema>
export type TaskArtifactUpdateEvent = z.infer<typeof taskArtifactUpdateEventSchema>

// --- Advanced TypeScript patterns (Lesson 4.6) ---
//
// These types demonstrate type-level programming patterns that keep the A2A
// surface type-safe, self-documenting, and resistant to accidental misuse.

// 1. Branded types — type-safe IDs that cannot be mixed up at compile time.
//    A plain `string` or `number` could be a TodoId, UserId, or AgentId.
//    Brands let the compiler distinguish them without runtime overhead.

export type TodoId = number & { __brand: 'TodoId' }
export type UserId = string & { __brand: 'UserId' }
export type AgentId = string & { __brand: 'AgentId' }
export type TaskId = string & { __brand: 'TaskId' }

export function brandTodoId(id: number): TodoId {
  return id as TodoId
}

export function brandUserId(id: string): UserId {
  return id as UserId
}

export function brandAgentId(id: string): AgentId {
  return id as AgentId
}

export function brandTaskId(id: string): TaskId {
  return id as TaskId
}

// 2. Template literal types — type-safe A2A route paths and capability names.
//    These give us autocomplete and prevent typos in route/capability strings.

export type A2aCapability =
  | 'tasks/send'
  | 'tasks/read'
  | 'tasks/cancel'
  | 'tasks/subscribe'
  | 'notifications/read'

export type A2aRoute<T extends A2aCapability = A2aCapability> = `/a2a/${T}`

export type A2aEventName = 'task-status-update' | 'task-artifact-update'

// 3. Conditional types — derive response shapes from the request capability.
//    `A2aResponseFor<'tasks/send'>` becomes `Task`, etc.

export interface A2aResponseMap {
  'tasks/send': Task
  'tasks/read': Task
  'tasks/cancel': Task
  'tasks/subscribe': AsyncGenerator<A2aEvent, void, unknown>
  'notifications/read': { notifications: unknown[] }
}

export type A2aResponseFor<C extends A2aCapability> = C extends keyof A2aResponseMap
  ? A2aResponseMap[C]
  : unknown

// 4. Mapped types — derive read-only / partial variants of A2A message types.
//    Also used to build a map from every Zod schema to its inferred type.

export type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K]
}

export type SchemaObject = Record<string, z.ZodType<unknown, z.ZodTypeDef, unknown>>

export type InferredFromSchemas<T extends SchemaObject> = {
  [K in keyof T]: T[K] extends z.ZodType<infer U, z.ZodTypeDef, unknown> ? U : never
}

// 5. Async generator types — typed stream of A2A events for SSE endpoints.

export type A2aEvent = TaskStatusUpdateEvent | TaskArtifactUpdateEvent

export type TaskEventStream = AsyncGenerator<A2aEvent, void, unknown>

// 6. Type guards — narrow an unknown A2A event to a specific subtype at runtime.

export function isTaskStatusUpdateEvent(event: A2aEvent): event is TaskStatusUpdateEvent {
  return event.type === 'task-status-update'
}

export function isTaskArtifactUpdateEvent(event: A2aEvent): event is TaskArtifactUpdateEvent {
  return event.type === 'task-artifact-update'
}

// 7. Type assertion — throw a typed error when a value fails a runtime check.
//    Assertion signatures (`asserts value is T`) let the compiler narrow after the call.

export function assertAgentId(value: unknown): asserts value is AgentId {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError('Expected a non-empty agent id string')
  }
}
