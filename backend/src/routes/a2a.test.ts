// Integration test for A2A discovery.
//
// We mount the real a2aRoutes on a minimal Fastify app so we verify the
// `/.well-known/agent.json` endpoint returns a valid, well-formed agent card.
// No database is needed — this route is pure HTTP + the agent card builder.

import { describe, it, expect } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import { a2aRoutes } from './a2a.js'
import { agentCardSchema } from '../a2a/types.js'

async function buildTestApp(): Promise<FastifyInstance> {
  const app = Fastify()
  await app.register(a2aRoutes)
  await app.ready()
  return app
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

  it('stubs task lifecycle endpoints with 501', async () => {
    const app = await buildTestApp()

    const send = await app.inject({ method: 'POST', url: '/a2a/tasks/send', payload: {} })
    expect(send.statusCode).toBe(501)

    const get = await app.inject({ method: 'GET', url: '/a2a/tasks/task-123' })
    expect(get.statusCode).toBe(501)

    const cancel = await app.inject({ method: 'POST', url: '/a2a/tasks/task-123/cancel' })
    expect(cancel.statusCode).toBe(501)

    await app.close()
  })
})
