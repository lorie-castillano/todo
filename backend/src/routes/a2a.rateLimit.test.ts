import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import rateLimit from '@fastify/rate-limit'
import cookie from '@fastify/cookie'
import type { TodoService } from '../services/todoService.js'
import type { Task } from '../a2a/types.js'
import correlationId from '../plugins/correlationId.js'

let a2aRoutes: typeof import('./a2a.js').a2aRoutes
let taskStorePlugin: typeof import('../a2a/taskStore.js').default
let taskManagerPlugin: typeof import('../plugins/taskManager.js').default

const AGENT_1_KEY = 'agent-1-key-0123456789-abcdef-0123456789'
const AGENT_2_KEY = 'agent-2-key-0123456789-abcdef-0123456789'

function makeMockTodoService(): TodoService {
  return {
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({
      id: 1,
      text: 'call mom',
      completed: false,
      userId: 'user-1',
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    update: vi.fn(),
    getById: vi.fn(),
    softDelete: vi.fn(),
    restore: vi.fn(),
    hardDelete: vi.fn(),
    toggleCompleted: vi.fn(),
  } as unknown as TodoService
}

async function buildTestApp(todoService?: TodoService): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false,
    genReqId: (req) => {
      const header = req.headers['x-correlation-id']
      return typeof header === 'string' && header.length > 0 ? header : 'test-correlation'
    },
  })
  await app.register(cookie)
  await app.register(rateLimit, { max: 10000, timeWindow: '1 minute' })
  await app.register(correlationId)
  await app.register(taskStorePlugin)
  app.decorate('todoService', todoService ?? makeMockTodoService())
  await app.register(taskManagerPlugin)
  await app.register(a2aRoutes)
  await app.ready()
  return app
}

beforeAll(async () => {
  process.env.A2A_AGENT_CREDENTIALS = JSON.stringify([
    {
      id: 'agent-1',
      key: AGENT_1_KEY,
      capabilities: ['tasks/send', 'tasks/read'],
    },
    {
      id: 'agent-2',
      key: AGENT_2_KEY,
      capabilities: ['tasks/send'],
    },
  ])

  vi.resetModules()
  const a2aModule = await import('./a2a.js')
  const taskStoreModule = await import('../a2a/taskStore.js')
  const taskManagerModule = await import('../plugins/taskManager.js')
  a2aRoutes = a2aModule.a2aRoutes
  taskStorePlugin = taskStoreModule.default
  taskManagerPlugin = taskManagerModule.default
})

describe('A2A route authentication', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestApp()
  })

  afterEach(async () => {
    await app.close()
  })

  it('returns 401 when no API key is provided', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/a2a/tasks/send',
      payload: {
        message: { role: 'user', parts: [{ type: 'text', text: 'List todos' }] },
        metadata: { userId: 'user-1' },
      },
    })

    expect(response.statusCode).toBe(401)
    expect(response.json()).toMatchObject({ error: 'Unauthorized' })
  })

  it('returns 401 for an invalid API key', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/a2a/tasks/send',
      headers: { 'x-api-key': 'invalid-key-0123456789-abcdef-01234', 'x-agent-id': 'agent-1' },
      payload: {
        message: { role: 'user', parts: [{ type: 'text', text: 'List todos' }] },
        metadata: { userId: 'user-1' },
      },
    })

    expect(response.statusCode).toBe(401)
  })

  it('returns 403 when the agent lacks the required capability', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/a2a/tasks/unknown-id',
      headers: { 'x-api-key': AGENT_2_KEY, 'x-agent-id': 'agent-2' },
    })

    expect(response.statusCode).toBe(403)
    expect(response.json()).toMatchObject({ error: 'Forbidden' })
  })

  it('allows an agent with the required capability', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/a2a/tasks/send',
      headers: { 'x-api-key': AGENT_1_KEY, 'x-agent-id': 'agent-1' },
      payload: {
        message: { role: 'user', parts: [{ type: 'text', text: 'List todos' }] },
        metadata: { userId: 'user-1' },
      },
    })

    expect(response.statusCode).toBe(202)
  })

  it('echoes the correlation id on responses', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/a2a/tasks/send',
      headers: {
        'x-api-key': AGENT_1_KEY,
        'x-agent-id': 'agent-1',
        'x-correlation-id': 'route-auth-test-123',
      },
      payload: {
        message: { role: 'user', parts: [{ type: 'text', text: 'List todos' }] },
        metadata: { userId: 'user-1' },
      },
    })

    expect(response.statusCode).toBe(202)
    expect(response.headers['x-correlation-id']).toBe('route-auth-test-123')
  })
})

describe('A2A per-agent rate limiting', () => {
  it('rate limits per agent identity, not globally', async () => {
    const app = await buildTestApp()

    const sendAs = async (apiKey: string, agentId: string): Promise<number> => {
      const response = await app.inject({
        method: 'POST',
        url: '/a2a/tasks/send',
        headers: { 'x-api-key': apiKey, 'x-agent-id': agentId },
        payload: {
          message: { role: 'user', parts: [{ type: 'text', text: 'List todos' }] },
          metadata: { userId: 'user-1' },
        },
      })
      return response.statusCode
    }

    const codes: number[] = []
    for (let i = 0; i < 32; i++) {
      codes.push(await sendAs(AGENT_1_KEY, 'agent-1'))
    }

    expect(codes.filter((code) => code === 202).length).toBe(30)
    expect(codes.filter((code) => code === 429).length).toBe(2)

    const agent2First = await sendAs(AGENT_2_KEY, 'agent-2')
    expect(agent2First).toBe(202)

    await app.close()
  })

  it('returns structured 429 response with limit headers', async () => {
    const app = await buildTestApp()

    let lastResponse!: Awaited<ReturnType<FastifyInstance['inject']>>
    for (let i = 0; i < 31; i++) {
      lastResponse = await app.inject({
        method: 'POST',
        url: '/a2a/tasks/send',
        headers: { 'x-api-key': AGENT_1_KEY, 'x-agent-id': 'agent-1' },
        payload: {
          message: { role: 'user', parts: [{ type: 'text', text: 'List todos' }] },
          metadata: { userId: 'user-1' },
        },
      })
    }

    expect(lastResponse.statusCode).toBe(429)
    expect(Number(lastResponse.headers['x-ratelimit-limit'])).toBe(30)
    expect(lastResponse.json()).toMatchObject({ statusCode: 429, error: 'Too Many Requests' })

    await app.close()
  })
})

describe('A2A correlation context propagation', () => {
  it('propagates correlationId and agent identity through task processing', async () => {
    const todoService = makeMockTodoService()
    const app = await buildTestApp(todoService)

    const response = await app.inject({
      method: 'POST',
      url: '/a2a/tasks/send',
      headers: {
        'x-api-key': AGENT_1_KEY,
        'x-agent-id': 'agent-1',
        'x-correlation-id': 'context-propagation-test',
      },
      payload: {
        message: { role: 'user', parts: [{ type: 'text', text: 'Create a todo to call mom' }] },
        metadata: { userId: 'user-1' },
      },
    })

    expect(response.statusCode).toBe(202)
    const task = response.json() as Task

    await new Promise((resolve) => setImmediate(resolve))
    await new Promise((resolve) => setImmediate(resolve))

    const fetched = await app.inject({
      method: 'GET',
      url: `/a2a/tasks/${task.id}`,
      headers: { 'x-api-key': AGENT_1_KEY, 'x-agent-id': 'agent-1' },
    })

    expect(fetched.statusCode).toBe(200)
    expect(todoService.create).toHaveBeenCalledWith({ text: 'call mom', userId: 'user-1' })

    await app.close()
  })
})
