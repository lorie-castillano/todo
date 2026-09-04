import type {
  FastifyPluginAsync,
  FastifyRequest,
  FastifyReply,
  onRequestHookHandler,
} from 'fastify'
import { config } from '../config.js'
import { buildTaskManagerCard } from '../a2a/agentCard.js'
import { taskSendRequestSchema, taskGetRequestSchema } from '../a2a/types.js'
import type { TaskEvent, TaskContext } from '../a2a/taskManager.js'
import { validate } from '../schemas/validate.js'
import { resolveAgentIdentity, hasCapability } from '../a2a/agentAuth.js'

const A2A_RATE_LIMITS: Record<string, { max: number; timeWindow: string }> = {
  'tasks/send': { max: 30, timeWindow: '1 minute' },
  'tasks/read': { max: 100, timeWindow: '1 minute' },
  'tasks/cancel': { max: 20, timeWindow: '1 minute' },
  'tasks/subscribe': { max: 20, timeWindow: '1 minute' },
  'notifications/read': { max: 60, timeWindow: '1 minute' },
}

function a2aRateLimitConfig(requiredCapability: string) {
  const limit = A2A_RATE_LIMITS[requiredCapability] ?? { max: 100, timeWindow: '1 minute' }
  return {
    ...limit,
    keyGenerator: (req: FastifyRequest) => req.agentIdentity?.id ?? req.ip,
  }
}

function a2aAuthOnRequest(requiredCapability?: string): onRequestHookHandler {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const identity = resolveAgentIdentity(req)
    if (!identity) {
      req.log.warn({ url: req.url, method: req.method }, 'A2A authentication failed')
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Invalid or missing API key',
        correlationId: req.correlationId,
      })
    }

    req.agentIdentity = identity

    if (requiredCapability && !hasCapability(identity.capabilities, requiredCapability)) {
      req.log.warn({ agentId: identity.id, requiredCapability }, 'A2A capability denied')
      return reply.code(403).send({
        error: 'Forbidden',
        message: `Agent lacks required capability: ${requiredCapability}`,
        correlationId: req.correlationId,
      })
    }
  }
}

function buildTaskContext(req: FastifyRequest, capability: string): TaskContext {
  return {
    correlationId: req.correlationId,
    taskId: undefined,
    sourceAgentId: req.agentIdentity?.id,
    targetAgentId: 'todo-task-manager',
    capability,
  }
}

export const a2aRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/.well-known/agent.json', async (_req, reply) => {
    const card = buildTaskManagerCard(config.a2aBaseUrl)
    return reply.code(200).send(card)
  })

  fastify.get('/a2a', async () => ({
    name: 'todo-task-manager',
    protocol: 'A2A',
    discovery: '/.well-known/agent.json',
    version: '0.1.0',
  }))

  fastify.get('/a2a/agents', async () => ({ agents: fastify.taskManager.agents }))

  fastify.get(
    '/a2a/notifications',
    {
      onRequest: [a2aAuthOnRequest('notifications/read')],
      config: { rateLimit: a2aRateLimitConfig('notifications/read') },
    },
    async (_req, reply) => {
      return reply.code(200).send({ notifications: fastify.taskManager.scheduledNotifications })
    }
  )

  fastify.get('/a2a/worker/tools', async (_req, reply) => {
    const tools = fastify.taskManager.mcpTools
    return reply.code(200).send({ tools })
  })

  fastify.post(
    '/a2a/tasks/send',
    {
      onRequest: [a2aAuthOnRequest('tasks/send')],
      config: { rateLimit: a2aRateLimitConfig('tasks/send') },
    },
    async (req, reply) => {
      const body = await validate(taskSendRequestSchema, req.body, req, reply)
      if (!body) return

      const context = buildTaskContext(req, 'tasks/send')
      const task = await fastify.taskManager.sendTask(body, context)
      return reply.code(202).send(task)
    }
  )

  fastify.get(
    '/a2a/tasks/:id',
    {
      onRequest: [a2aAuthOnRequest('tasks/read')],
      config: { rateLimit: a2aRateLimitConfig('tasks/read') },
    },
    async (req, reply) => {
      const params = await validate(taskGetRequestSchema, req.params, req, reply)
      if (!params) return

      const task = await fastify.taskManager.getTask(params.id)
      if (!task) {
        return reply.code(404).send({
          error: 'Not Found',
          message: `Task ${params.id} not found`,
          correlationId: req.correlationId,
        })
      }
      return reply.code(200).send(task)
    }
  )

  fastify.post(
    '/a2a/tasks/:id/cancel',
    {
      onRequest: [a2aAuthOnRequest('tasks/cancel')],
      config: { rateLimit: a2aRateLimitConfig('tasks/cancel') },
    },
    async (req, reply) => {
      const params = await validate(taskGetRequestSchema, req.params, req, reply)
      if (!params) return

      const task = await fastify.taskManager.cancelTask(params.id)
      if (!task) {
        return reply.code(404).send({
          error: 'Not Found',
          message: `Task ${params.id} not found`,
          correlationId: req.correlationId,
        })
      }
      return reply.code(200).send(task)
    }
  )

  fastify.get(
    '/a2a/tasks/:id/subscribe',
    {
      onRequest: [a2aAuthOnRequest('tasks/subscribe')],
      config: { rateLimit: a2aRateLimitConfig('tasks/subscribe') },
    },
    async (req, reply) => {
      const params = await validate(taskGetRequestSchema, req.params, req, reply)
      if (!params) return

      const task = await fastify.taskManager.getTask(params.id)
      if (!task) {
        return reply.code(404).send({
          error: 'Not Found',
          message: `Task ${params.id} not found`,
          correlationId: req.correlationId,
        })
      }

      reply.hijack()
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      })

      let finished = false
      let unsubscribe: (() => void) | undefined

      const cleanup = (): void => {
        if (finished) return
        finished = true
        if (unsubscribe) unsubscribe()
        req.raw.removeListener('close', cleanup)
        req.raw.removeListener('end', cleanup)
        reply.raw.end()
      }

      const writeEvent = (event: TaskEvent): void => {
        if (finished) return
        reply.raw.write(`data: ${JSON.stringify(event)}\n\n`)

        if (
          event.type === 'task-status-update' &&
          (event.status.state === 'completed' ||
            event.status.state === 'failed' ||
            event.status.state === 'canceled')
        ) {
          cleanup()
        }
      }

      writeEvent({ type: 'task-status-update', taskId: task.id, status: task.status })

      if (!finished) {
        unsubscribe = fastify.taskManager.subscribe(task.id, writeEvent)
        req.raw.on('close', cleanup)
        req.raw.on('end', cleanup)
      }
    }
  )
}
