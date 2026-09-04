// A2A (Agent-to-Agent) protocol routes.
//
// This file implements the public agent-facing HTTP surface:
//   - GET /.well-known/agent.json       → agent capability advertisement
//   - GET /a2a                         → friendly A2A metadata
//   - GET /a2a/worker/tools            → MCP tool definitions for the Todo Worker
//   - POST /a2a/tasks/send             → create a task and start processing
//   - GET  /a2a/tasks/:id              → get current task state
//   - POST /a2a/tasks/:id/cancel       → cancel a task
//   - GET  /a2a/tasks/:id/subscribe    → SSE stream of status/artifact updates
//
// A2A is task-centric, not tool-centric. Other agents discover us via the
// agent card, send a task, and poll or subscribe to updates. The Task Manager
// delegates the actual work to a TodoWorkerAgent, which is a hybrid MCP + A2A
// worker: it receives A2A tasks and exposes the same tool definitions as MCP.

import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import { config } from '../config.js'
import { buildTaskManagerCard } from '../a2a/agentCard.js'
import { taskSendRequestSchema, taskGetRequestSchema } from '../a2a/types.js'
import type { TaskEvent } from '../a2a/taskManager.js'
import { validate } from '../schemas/validate.js'

// Minimal API key auth for A2A task endpoints.
// In dev/test, if no MCP_API_KEY is configured, requests are allowed.
// In production, or when a key is configured, callers must send the
// `X-API-Key` header. Lesson 6.5 will expand this into full agent auth.
async function a2aAuthPreHandler(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  if ((config.isDev || config.isTest) && !config.mcpApiKey) return

  const header = req.headers['x-api-key']
  const apiKey = Array.isArray(header) ? header[0] : header

  if (!apiKey || apiKey !== config.mcpApiKey) {
    return reply.code(401).send({
      error: 'Unauthorized',
      message: 'Invalid or missing API key',
      correlationId: req.correlationId,
    })
  }
}

export const a2aRoutes: FastifyPluginAsync = async (fastify) => {
  // --- Agent discovery ---
  // A2A clients fetch this before sending any task. It is a well-known
  // URL, like `/.well-known/openid-configuration` in OAuth.
  fastify.get('/.well-known/agent.json', async (_req, reply) => {
    const card = buildTaskManagerCard(config.a2aBaseUrl)
    return reply.code(200).send(card)
  })

  // --- Base A2A endpoint ---
  // Friendly metadata for humans/health checks hitting the advertised URL.
  fastify.get('/a2a', async () => ({
    name: 'todo-task-manager',
    protocol: 'A2A',
    discovery: '/.well-known/agent.json',
    version: '0.1.0',
  }))

  fastify.get('/a2a/agents', async (_req, reply) => {
    return reply.code(200).send({ agents: fastify.taskManager.agents })
  })

  fastify.get('/a2a/notifications', { preHandler: a2aAuthPreHandler }, async (_req, reply) => {
    return reply.code(200).send({ notifications: fastify.taskManager.scheduledNotifications })
  })

  // --- Worker tool discovery ---
  // The TodoWorkerAgent is an MCP + A2A hybrid. It exposes the same four
  // todo tool definitions that the stdio MCP server does, but over HTTP so
  // other A2A agents can discover and delegate to them.
  fastify.get('/a2a/worker/tools', async (_req, reply) => {
    const tools = fastify.taskManager.mcpTools
    return reply.code(200).send({ tools })
  })

  // --- Create a task ---
  // Returns immediately with the task in `pending` state. Processing runs
  // asynchronously; callers poll GET /a2a/tasks/:id or subscribe to SSE.
  fastify.post('/a2a/tasks/send', { preHandler: a2aAuthPreHandler }, async (req, reply) => {
    const body = await validate(taskSendRequestSchema, req.body, req, reply)
    if (!body) return

    const task = await fastify.taskManager.sendTask(body)
    return reply.code(202).send(task)
  })

  // --- Get task state ---
  fastify.get('/a2a/tasks/:id', { preHandler: a2aAuthPreHandler }, async (req, reply) => {
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
  })

  // --- Cancel a task ---
  fastify.post('/a2a/tasks/:id/cancel', { preHandler: a2aAuthPreHandler }, async (req, reply) => {
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
  })

  // --- Subscribe to task updates (SSE) ---
  // Sends a `task-status-update` with the current state immediately, then
  // streams every subsequent status/artifact update until the client disconnects.
  fastify.get('/a2a/tasks/:id/subscribe', { preHandler: a2aAuthPreHandler }, async (req, reply) => {
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

    // Track whether we have already ended the stream so we don't write
    // after the connection closes or double-close on terminal events.
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

      // A2A tasks are terminal once completed or canceled. End the SSE
      // stream cleanly so clients (and curl) get an EOF instead of a
      // truncated chunked transfer.
      if (
        event.type === 'task-status-update' &&
        (event.status.state === 'completed' || event.status.state === 'canceled')
      ) {
        cleanup()
      }
    }

    // Send the current state so the client doesn't have to poll first.
    writeEvent({ type: 'task-status-update', taskId: task.id, status: task.status })

    // If the current state is already terminal, we already closed the stream.
    if (!finished) {
      unsubscribe = fastify.taskManager.subscribe(task.id, writeEvent)
      req.raw.on('close', cleanup)
      req.raw.on('end', cleanup)
    }
  })
}
