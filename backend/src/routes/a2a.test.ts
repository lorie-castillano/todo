// Integration tests for A2A routes.
//
// We mount the real a2aRoutes on a minimal Fastify app with the taskStore
// and taskManager plugins. todoService is mocked so no database is needed.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import { a2aRoutes } from './a2a.js'
import { agentCardSchema, type Task } from '../a2a/types.js'
import type { CreateTaskInput } from '../a2a/taskStore.js'
import taskStore from '../a2a/taskStore.js'
import taskManager from '../plugins/taskManager.js'
import type { TodoService } from '../services/todoService.js'

function makeMockTodoService(): TodoService {
  return {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    getById: vi.fn(),
    softDelete: vi.fn(),
    restore: vi.fn(),
    hardDelete: vi.fn(),
    toggleCompleted: vi.fn(),
  } as unknown as TodoService
}

async function buildTestApp(todoService?: TodoService): Promise<FastifyInstance> {
  const app = Fastify({ logger: false })
  const service = todoService ?? makeMockTodoService()

  // Order matters: taskStore plugin, then todoService decorator, then
  // taskManager plugin (which declares these decorators as dependencies).
  await app.register(taskStore)
  app.decorate('todoService', service)
  await app.register(taskManager)
  await app.register(a2aRoutes)
  await app.ready()
  return app
}

function makeSendPayload(text: string, metadata?: Record<string, unknown>) {
  return {
    message: {
      role: 'user',
      parts: [{ type: 'text', text }],
    },
    metadata,
  }
}

function makeTaskInput(overrides: Partial<CreateTaskInput> = {}): CreateTaskInput {
  return {
    sessionId: 'session-1',
    status: { state: 'pending', timestamp: new Date().toISOString() },
    history: [{ role: 'user', parts: [{ type: 'text', text: 'List my todos' }] }],
    artifacts: [],
    ...overrides,
  }
}

describe('A2A discovery endpoint', () => {
  it('returns a valid agent card at /.well-known/agent.json', async () => {
    const app = await buildTestApp()

    const response = await app.inject({
      method: 'GET',
      url: '/.well-known/agent.json',
    })

    expect(response.statusCode).toBe(200)

    const body = response.json()
    const parsed = agentCardSchema.safeParse(body)
    expect(parsed.success).toBe(true)

    if (parsed.success) {
      expect(parsed.data.name).toBe('todo-task-manager')
      expect(parsed.data.skills.length).toBeGreaterThan(0)
      expect(parsed.data.skills.some((skill) => skill.id === 'manage_todos')).toBe(true)
    }

    await app.close()
  })

  it('advertises the a2a base route metadata', async () => {
    const app = await buildTestApp()

    const response = await app.inject({
      method: 'GET',
      url: '/a2a',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      name: 'todo-task-manager',
      protocol: 'A2A',
      discovery: '/.well-known/agent.json',
    })

    await app.close()
  })

  it('discovers specialized workers in the local agent mesh', async () => {
    const app = await buildTestApp()

    const response = await app.inject({ method: 'GET', url: '/a2a/agents' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      agents: expect.arrayContaining([
        expect.objectContaining({ id: 'todo-worker' }),
        expect.objectContaining({ id: 'notification-worker' }),
      ]),
    })

    await app.close()
  })

  it('exposes worker MCP tool definitions at /a2a/worker/tools', async () => {
    const app = await buildTestApp()

    const response = await app.inject({
      method: 'GET',
      url: '/a2a/worker/tools',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.tools).toBeInstanceOf(Array)
    expect(body.tools.some((tool: { name: string }) => tool.name === 'create_todo')).toBe(true)

    await app.close()
  })
})

describe('A2A task lifecycle endpoints', () => {
  let app: FastifyInstance
  let todoService: TodoService

  beforeEach(async () => {
    todoService = makeMockTodoService()
    vi.mocked(todoService.list).mockResolvedValue([])
    vi.mocked(todoService.create).mockResolvedValue({
      id: 1,
      text: 'call mom',
      completed: false,
      userId: 'user-1',
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    app = await buildTestApp(todoService)
  })

  afterEach(async () => {
    await app.close()
  })

  it('POST /a2a/tasks/send creates a pending task and returns 202', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/a2a/tasks/send',
      payload: makeSendPayload('Create a todo to call mom', { userId: 'user-1' }),
    })

    expect(response.statusCode).toBe(202)
    const task = response.json() as Task
    expect(task.status.state).toBe('pending')
  })

  it('POST /a2a/tasks/send rejects an invalid payload', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/a2a/tasks/send',
      payload: {},
    })

    expect(response.statusCode).toBe(400)
  })

  it('GET /a2a/tasks/:id returns the task state', async () => {
    const task = await app.taskStore.create(makeTaskInput())

    const response = await app.inject({
      method: 'GET',
      url: `/a2a/tasks/${task.id}`,
    })

    expect(response.statusCode).toBe(200)
    const fetched = response.json() as Task
    expect(fetched.id).toBe(task.id)
    expect(fetched.status.state).toBe('pending')
  })

  it('GET /a2a/tasks/:id returns 404 for unknown tasks', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/a2a/tasks/unknown-id',
    })

    expect(response.statusCode).toBe(404)
  })

  it('POST /a2a/tasks/:id/cancel cancels a pending task', async () => {
    const task = await app.taskStore.create(makeTaskInput())

    const response = await app.inject({
      method: 'POST',
      url: `/a2a/tasks/${task.id}/cancel`,
    })

    expect(response.statusCode).toBe(200)
    const canceled = response.json() as Task
    expect(canceled.id).toBe(task.id)
    expect(canceled.status.state).toBe('canceled')
  })

  it('POST /a2a/tasks/:id/cancel returns 404 for unknown tasks', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/a2a/tasks/unknown-id/cancel',
    })

    expect(response.statusCode).toBe(404)
  })

  it('end-to-end: create task flows through the state machine', async () => {
    vi.mocked(todoService.create).mockResolvedValue({
      id: 1,
      text: 'call mom',
      completed: false,
      userId: 'user-1',
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const task = await app.taskStore.create(
      makeTaskInput({
        history: [
          {
            role: 'user',
            parts: [{ type: 'text', text: 'Create a todo to call mom' }],
          },
        ],
        metadata: { userId: 'user-1' },
      })
    )

    await app.taskManager.processTask(task.id)

    const response = await app.inject({
      method: 'GET',
      url: `/a2a/tasks/${task.id}`,
    })

    expect(response.statusCode).toBe(200)
    const updated = response.json() as Task
    expect(updated.status.state).toBe('completed')
    expect(updated.artifacts).toHaveLength(1)
    expect(todoService.create).toHaveBeenCalledWith({ text: 'call mom', userId: 'user-1' })
  })

  it('end-to-end: reminder fans out to todo and notification workers', async () => {
    const task = await app.taskStore.create(
      makeTaskInput({
        history: [
          {
            role: 'user',
            parts: [{ type: 'text', text: 'Remind me to call mom tomorrow' }],
          },
        ],
        metadata: { userId: 'user-1' },
      })
    )

    await app.taskManager.processTask(task.id)

    const response = await app.inject({ method: 'GET', url: '/a2a/notifications' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      notifications: [expect.objectContaining({ message: 'call mom', schedule: 'tomorrow' })],
    })
    expect(todoService.create).toHaveBeenCalledWith({ text: 'call mom', userId: 'user-1' })
  })

  it('end-to-end: missing userId results in input-required', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/a2a/tasks/send',
      payload: makeSendPayload('Create a todo to call mom'),
    })

    expect(response.statusCode).toBe(202)
    const created = response.json() as Task

    // sendTask schedules processTask via setImmediate; wait two ticks.
    await new Promise((resolve) => setImmediate(resolve))
    await new Promise((resolve) => setImmediate(resolve))

    const get = await app.inject({
      method: 'GET',
      url: `/a2a/tasks/${created.id}`,
    })

    expect(get.statusCode).toBe(200)
    const task = get.json() as Task
    expect(task.status.state).toBe('input-required')
  })
})
