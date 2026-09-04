// TaskManager plugin — registers the A2A task orchestrator on Fastify.
//
// Why a plugin?
// - It receives `taskStore`, `todoService`, and the logger from Fastify's
//   dependency injection instead of importing globals.
// - It composes the TodoWorkerAgent (MCP + A2A hybrid) and passes it to the
//   TaskManager, so the orchestrator delegates actual work to the worker.
// - It declares decorator dependencies so Fastify fails fast if prerequisites
//   are missing.

import type { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import { createTaskManager, TaskManager } from '../a2a/taskManager.js'
import { createTodoWorkerAgent } from '../a2a/todoWorkerAgent.js'
import { createNotificationWorkerAgent } from '../a2a/notificationWorkerAgent.js'

declare module 'fastify' {
  interface FastifyInstance {
    taskManager: TaskManager
  }
}

const taskManagerPlugin: FastifyPluginAsync = async (fastify) => {
  const workerAgent = createTodoWorkerAgent({
    todoService: fastify.todoService,
    logger: fastify.log,
  })

  const notificationWorker = createNotificationWorkerAgent({ logger: fastify.log })

  const manager = createTaskManager({
    taskStore: fastify.taskStore,
    workerAgent,
    notificationWorker,
    logger: fastify.log,
  })

  fastify.decorate('taskManager', manager)
}

export default fp(taskManagerPlugin, {
  name: 'taskManager',
  decorators: {
    fastify: ['taskStore', 'todoService'],
  },
})
