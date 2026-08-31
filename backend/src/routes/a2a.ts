// A2A (Agent-to-Agent) protocol routes.
//
// This file implements the public agent-facing HTTP surface:
//   - GET /.well-known/agent.json  → agent capability advertisement
//   - /a2a/tasks/*                 → task lifecycle endpoints (Lesson 6.2)
//
// A2A is a task-centric protocol, not a tool protocol. Other agents discover
// us via the agent card, send a task, and poll or subscribe to updates.

import type { FastifyPluginAsync } from 'fastify'
import { config } from '../config.js'
import { buildTaskManagerCard } from '../a2a/agentCard.js'

export const a2aRoutes: FastifyPluginAsync = async (fastify) => {
  // --- Agent discovery ---
  // A2A clients fetch this before sending any task. It is a well-known
  // URL, like `/.well-known/openid-configuration` in OAuth.
  fastify.get('/.well-known/agent.json', async (_req, reply) => {
    const card = buildTaskManagerCard(config.a2aBaseUrl)
    return reply.code(200).send(card)
  })

  // --- Task lifecycle endpoints (placeholders for Lesson 6.2) ---
  // The actual implementations will live in the Task Manager service.
  fastify.post('/a2a/tasks/send', async (_req, reply) => {
    return reply.code(501).send({
      error: 'Not Implemented',
      message: 'A2A task dispatch is part of Lesson 6.2.',
      correlationId: _req.correlationId,
    })
  })

  fastify.get('/a2a/tasks/:id', async (_req, reply) => {
    return reply.code(501).send({
      error: 'Not Implemented',
      message: 'A2A task retrieval is part of Lesson 6.2.',
      correlationId: _req.correlationId,
    })
  })

  fastify.post('/a2a/tasks/:id/cancel', async (_req, reply) => {
    return reply.code(501).send({
      error: 'Not Implemented',
      message: 'A2A task cancellation is part of Lesson 6.2.',
      correlationId: _req.correlationId,
    })
  })

  // --- Base A2A endpoint ---
  // Friendly metadata for humans/health checks hitting the advertised URL.
  fastify.get('/a2a', async () => ({
    name: 'todo-task-manager',
    protocol: 'A2A',
    discovery: '/.well-known/agent.json',
    version: '0.1.0',
  }))
}
