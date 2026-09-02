// TaskManager — orchestrates A2A task lifecycle.
//
// The TaskManager is the brain of the A2A agent. It:
//   1. Receives a task via `sendTask`
//   2. Stores it and emits a status update
//   3. Runs `processTask` asynchronously through a state machine
//      (pending → working → completed / input-required / canceled)
//   4. Parses the user's intent, calls `todoService` when appropriate,
//      and produces artifacts
//   5. Streams status and artifact updates to SSE subscribers
//
// The manager never blocks the HTTP response. `sendTask` returns the task
// in `pending` state and processing continues in the background.

import { EventEmitter } from 'node:events'
import type { FastifyBaseLogger } from 'fastify'
import type {
  Task,
  TaskStatus,
  TaskSendRequest,
  TaskArtifactUpdateEvent,
  TaskStatusUpdateEvent,
  Artifact,
} from './types.js'
import type { TaskStore } from './taskStore.js'
import type { TodoService } from '../services/todoService.js'
import { withRetry, type RetryOptions } from './retry.js'

export interface TaskManagerDependencies {
  taskStore: TaskStore
  todoService: TodoService
  logger: FastifyBaseLogger
  retryOptions?: RetryOptions
  autoProcess?: boolean
}

export type TaskEvent = TaskStatusUpdateEvent | TaskArtifactUpdateEvent
export type TaskEventListener = (event: TaskEvent) => void

export class TaskManager {
  private readonly taskStore: TaskStore
  private readonly todoService: TodoService
  private readonly logger: FastifyBaseLogger
  private readonly retryOptions: RetryOptions
  private readonly autoProcess: boolean
  private readonly emitter = new EventEmitter()

  constructor(deps: TaskManagerDependencies) {
    this.taskStore = deps.taskStore
    this.todoService = deps.todoService
    this.logger = deps.logger
    this.retryOptions = deps.retryOptions ?? {
      maxAttempts: 3,
      delayMs: 200,
      // Don't retry deterministic "not found" errors; they won't fix themselves.
      shouldRetry: (err: unknown) => err instanceof Error && !err.message.includes('not found'),
    }
    this.autoProcess = deps.autoProcess ?? true
    // A2A allows many subscribers per task; disable the default listener leak warning.
    this.emitter.setMaxListeners(0)
  }

  async sendTask(request: TaskSendRequest): Promise<Task> {
    const task = await this.taskStore.create({
      sessionId: request.sessionId,
      status: {
        state: 'pending',
        timestamp: new Date().toISOString(),
      },
      history: [request.message],
      artifacts: [],
      metadata: request.metadata,
    })

    this.emitStatusUpdate(task)

    // Process asynchronously so the caller gets a pending task immediately.
    // setImmediate lets the HTTP response flush before work begins.
    if (this.autoProcess) {
      setImmediate(() => {
        void this.processTask(task.id).catch((err: unknown) => {
          this.logger.error({ err, taskId: task.id }, 'Unhandled task processing error')
        })
      })
    }

    return task
  }

  async getTask(id: string): Promise<Task | null> {
    return this.taskStore.get(id)
  }

  async cancelTask(id: string): Promise<Task | null> {
    const canceled = await this.taskStore.cancel(id)
    if (canceled) {
      this.emitStatusUpdate(canceled)
    }
    return canceled
  }

  /**
   * Subscribe to status and artifact updates for a single task.
   * Returns an unsubscribe function that removes the listener.
   */
  subscribe(id: string, listener: TaskEventListener): () => void {
    this.emitter.on(id, listener)
    return () => {
      this.emitter.off(id, listener)
    }
  }

  async processTask(id: string): Promise<void> {
    try {
      let task = await this.taskStore.get(id)
      if (!task) {
        this.logger.warn({ taskId: id }, 'Task not found for processing')
        return
      }
      if (task.status.state !== 'pending') {
        this.logger.debug({ taskId: id, state: task.status.state }, 'Task not pending, skipping')
        return
      }

      task = await this.transitionStatus(task, {
        state: 'working',
        timestamp: new Date().toISOString(),
        message: {
          role: 'agent',
          parts: [{ type: 'text', text: 'Processing your request...' }],
        },
      })

      const { status, artifact } = await withRetry(
        () => this.executeTask(task),
        this.retryOptions
      )

      let updatedTask = await this.transitionStatus(task, status)
      if (artifact) {
        updatedTask = { ...updatedTask, artifacts: [...updatedTask.artifacts, artifact] }
        await this.taskStore.update(updatedTask)
        this.emitArtifactUpdate(updatedTask, artifact)
      }
    } catch (err) {
      this.logger.error({ err, taskId: id }, 'Task processing failed after retries')
      const task = await this.taskStore.get(id)
      if (task && task.status.state !== 'canceled') {
        await this.transitionStatus(task, {
          state: 'completed',
          timestamp: new Date().toISOString(),
          message: {
            role: 'agent',
            parts: [
              {
                type: 'text',
                text: err instanceof Error ? err.message : 'Task processing failed',
              },
            ],
          },
        })
      }
    }
  }

  private async executeTask(task: Task): Promise<{ status: TaskStatus; artifact?: Artifact }> {
    const userMessage = task.history[0]
    if (!userMessage) {
      return this.buildStatus('input-required', 'No user message found')
    }

    const text = userMessage.parts
      .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
      .map((part) => part.text)
      .join(' ')
      .trim()

    if (!text) {
      return this.buildStatus('input-required', 'Please provide a text request')
    }

    const userId = this.getUserId(task)
    if (!userId) {
      return this.buildStatus('input-required', 'Please provide userId in metadata')
    }

    const lower = text.toLowerCase()

    if (lower.includes('list') && lower.includes('todo')) {
      const filter = lower.includes('completed')
        ? { completed: true }
        : lower.includes('pending')
          ? { completed: false }
          : undefined
      const todos = await this.todoService.list(userId, filter)
      return {
        status: this.buildStatus('completed', `Found ${todos.length} todo(s)`).status,
        artifact: this.buildDataArtifact({ todos }),
      }
    }

    if (lower.includes('create') || lower.includes('add')) {
      const todoText = this.extractTodoText(text)
      if (!todoText) {
        return this.buildStatus('input-required', 'Please specify the todo text')
      }
      const todo = await this.todoService.create({ text: todoText, userId })
      return {
        status: this.buildStatus('completed', `Created todo: ${todo.text}`).status,
        artifact: this.buildDataArtifact({ todo }),
      }
    }

    if (lower.includes('toggle')) {
      const todoId = this.extractTodoId(text)
      if (!todoId) {
        return this.buildStatus('input-required', 'Please specify the todo id to toggle')
      }
      const todo = await this.todoService.toggleCompleted(todoId, userId)
      if (!todo) {
        return this.buildStatus('completed', `Todo ${todoId} not found or already deleted`)
      }
      return {
        status: this.buildStatus('completed', `Toggled todo: ${todo.text}`).status,
        artifact: this.buildDataArtifact({ todo }),
      }
    }

    if (lower.includes('delete') || lower.includes('remove')) {
      const todoId = this.extractTodoId(text)
      if (!todoId) {
        return this.buildStatus('input-required', 'Please specify the todo id to delete')
      }
      const todo = await this.todoService.softDelete(todoId, userId)
      if (!todo) {
        return this.buildStatus('completed', `Todo ${todoId} not found or already deleted`)
      }
      return {
        status: this.buildStatus('completed', `Deleted todo: ${todo.text}`).status,
        artifact: this.buildDataArtifact({ todo }),
      }
    }

    return this.buildStatus(
      'input-required',
      'I can help with: list todos, create/add todo, toggle todo <id>, delete todo <id>. What would you like to do?'
    )
  }

  private getUserId(task: Task): string | null {
    const userId = task.metadata?.userId
    return typeof userId === 'string' ? userId : null
  }

  private extractTodoText(text: string): string | null {
    const match = text.match(/(?:create|add)\s+(?:a\s+)?(?:todo\s+)?(?:to\s+)?(.+)/i)
    if (match?.[1]) return match[1].trim()
    return text.trim() || null
  }

  private extractTodoId(text: string): number | null {
    const match = text.match(/\d+/)
    if (match) return Number.parseInt(match[0], 10)
    return null
  }

  private buildStatus(state: TaskStatus['state'], text: string): { status: TaskStatus } {
    return {
      status: {
        state,
        timestamp: new Date().toISOString(),
        message: {
          role: 'agent',
          parts: [{ type: 'text', text }],
        },
      },
    }
  }

  private buildDataArtifact(data: Record<string, unknown>): Artifact {
    return {
      name: 'result',
      parts: [{ type: 'data', data }],
      index: 0,
    }
  }

  private async transitionStatus(task: Task, status: TaskStatus): Promise<Task> {
    const updated: Task = { ...task, status, updatedAt: new Date().toISOString() }
    await this.taskStore.update(updated)
    this.emitStatusUpdate(updated)
    return updated
  }

  private emitStatusUpdate(task: Task): void {
    const event: TaskStatusUpdateEvent = {
      type: 'task-status-update',
      taskId: task.id,
      status: task.status,
    }
    this.emitter.emit(task.id, event)
  }

  private emitArtifactUpdate(task: Task, artifact: Artifact): void {
    const event: TaskArtifactUpdateEvent = {
      type: 'task-artifact-update',
      taskId: task.id,
      artifact,
    }
    this.emitter.emit(task.id, event)
  }
}

export function createTaskManager(deps: TaskManagerDependencies): TaskManager {
  return new TaskManager(deps)
}
