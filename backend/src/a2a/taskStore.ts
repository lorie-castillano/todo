// Task store for the A2A Task Manager.
//
// A2A tasks are long-lived stateful objects, not one-shot HTTP requests.
// The store abstraction lets the Task Manager persist tasks without caring
// whether the backing storage is in-memory (prototype) or PostgreSQL
// (production). Swapping the implementation later requires zero route changes.

import { randomUUID } from 'node:crypto'
import type { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import type { Task } from './types.js'

// Input type for creating a task. The store owns id and timestamp generation.
export type CreateTaskInput = Omit<Task, 'id' | 'createdAt' | 'updatedAt'>

export interface TaskStore {
  create(input: CreateTaskInput): Promise<Task>
  get(id: string): Promise<Task | null>
  update(task: Task): Promise<Task>
  cancel(id: string): Promise<Task | null>
}

export function createInMemoryTaskStore(): TaskStore {
  const tasks = new Map<string, Task>()

  return {
    async create(input) {
      const now = new Date().toISOString()
      const task: Task = {
        ...input,
        id: randomUUID(),
        createdAt: now,
        updatedAt: now,
      }
      tasks.set(task.id, task)
      return task
    },

    async get(id) {
      return tasks.get(id) ?? null
    },

    async update(task) {
      const existing = tasks.get(task.id)
      if (!existing) {
        throw new Error(`Task not found: ${task.id}`)
      }
      const updated: Task = { ...task, updatedAt: new Date().toISOString() }
      tasks.set(updated.id, updated)
      return updated
    },

    async cancel(id) {
      const existing = tasks.get(id)
      if (!existing) return null
      if (
        existing.status.state === 'completed' ||
        existing.status.state === 'failed' ||
        existing.status.state === 'canceled'
      ) {
        return existing
      }
      const canceled: Task = {
        ...existing,
        status: {
          state: 'canceled',
          timestamp: new Date().toISOString(),
          message: {
            role: 'agent',
            parts: [{ type: 'text', text: 'Task canceled by caller' }],
          },
        },
        updatedAt: new Date().toISOString(),
      }
      tasks.set(id, canceled)
      return canceled
    },
  }
}

// Module augmentation — lets route handlers use `fastify.taskStore`.
declare module 'fastify' {
  interface FastifyInstance {
    taskStore: TaskStore
  }
}

const taskStorePlugin: FastifyPluginAsync = async (fastify) => {
  const store = createInMemoryTaskStore()
  fastify.decorate('taskStore', store)
}

export default fp(taskStorePlugin, {
  name: 'taskStore',
})
