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
  state: z.enum(['pending', 'working', 'input-required', 'completed', 'canceled']),
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
