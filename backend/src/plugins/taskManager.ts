// TaskManager plugin — registers the A2A task orchestrator on Fastify.
//
// Why a plugin?
// - It receives `taskStore`, `todoService`, and the logger from Fastify's
//   dependency injection instead of importing globals.
// - It declares decorator dependencies so Fastify fails fast if prerequisites
//   are missing.

import type { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import { createTaskManager, TaskManager } from '../a2a/taskManager.js'

declare module 'fastify' {
  interface FastifyInstance {
    taskManager: TaskManager
  }
}

const taskManagerPlugin: FastifyPluginAsync = async (fastify) => {
  const manager = createTaskManager({
    taskStore: fastify.taskStore,
    todoService: fastify.todoService,
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
