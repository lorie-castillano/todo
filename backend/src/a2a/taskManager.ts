// TaskManager — orchestrates A2A task lifecycle.
//
// The TaskManager is the brain of the A2A agent. It:
//   1. Receives a task via `sendTask`
//   2. Stores it and emits a status update
//   3. Runs `processTask` asynchronously through a state machine
//      (pending → working → completed / input-required / canceled)
//   4. Delegates the actual work to a TodoWorkerAgent (MCP + A2A hybrid)
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
import type { TodoWorkerAgent, McpToolDefinition } from './todoWorkerAgent.js'
import type { NotificationWorkerAgent, ScheduledNotification } from './notificationWorkerAgent.js'
import { createAgentMesh, type AgentDescriptor, type AgentMesh } from './agentMesh.js'
import { withRetry, type RetryOptions } from './retry.js'

export interface TaskContext {
  correlationId: string | undefined
  taskId: string | undefined
  sourceAgentId: string | undefined
  targetAgentId: string | undefined
  capability: string | undefined
}

export interface TaskManagerDependencies {
  taskStore: TaskStore
  workerAgent: TodoWorkerAgent
  notificationWorker: NotificationWorkerAgent
  logger: FastifyBaseLogger
  retryOptions?: RetryOptions
  autoProcess?: boolean
}

export type TaskEvent = TaskStatusUpdateEvent | TaskArtifactUpdateEvent
export type TaskEventListener = (event: TaskEvent) => void

export class TaskManager {
  private readonly taskStore: TaskStore
  private readonly workerAgent: TodoWorkerAgent
  private readonly notificationWorker: NotificationWorkerAgent
  private readonly agentMesh: AgentMesh
  private readonly logger: FastifyBaseLogger
  private readonly retryOptions: RetryOptions
  private readonly autoProcess: boolean
  private readonly emitter = new EventEmitter()

  constructor(deps: TaskManagerDependencies) {
    this.taskStore = deps.taskStore
    this.workerAgent = deps.workerAgent
    this.notificationWorker = deps.notificationWorker
    this.agentMesh = createAgentMesh({
      todoWorker: deps.workerAgent,
      notificationWorker: deps.notificationWorker,
    })
    this.logger = deps.logger
    this.retryOptions = deps.retryOptions ?? {
      maxAttempts: 3,
      delayMs: 200,
      // Don't retry deterministic "not found" errors or an open circuit breaker; they won't fix themselves.
      shouldRetry: (err: unknown) =>
        err instanceof Error && !err.message.includes('not found') && err.name !== 'CircuitBreakerOpenError',
    }
    this.autoProcess = deps.autoProcess ?? true
    // A2A allows many subscribers per task; disable the default listener leak warning.
    this.emitter.setMaxListeners(0)
  }

  /**
   * Expose the worker's MCP tool definitions so A2A clients can discover
   * which capabilities the Task Manager can delegate to.
   */
  get mcpTools(): McpToolDefinition[] {
    return this.workerAgent.mcpTools
  }

  get agents(): AgentDescriptor[] {
    return this.agentMesh.listAgents()
  }

  get scheduledNotifications(): ScheduledNotification[] {
    return this.notificationWorker.listScheduled()
  }

  async sendTask(request: TaskSendRequest, context?: TaskContext): Promise<Task> {
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
    const taskContext = context ? { ...context, taskId: task.id } : undefined

    // Process asynchronously so the caller gets a pending task immediately.
    // setImmediate lets the HTTP response flush before work begins.
    if (this.autoProcess) {
      setImmediate(() => {
        void this.processTask(task.id, taskContext).catch((err: unknown) => {
          this.logger.error({ err, ...taskContext }, 'Unhandled task processing error')
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

  async processTask(id: string, context?: TaskContext): Promise<void> {
    const log = context
      ? this.logger.child({ taskId: id, correlationId: context.correlationId, sourceAgentId: context.sourceAgentId, targetAgentId: context.targetAgentId, capability: context.capability })
      : this.logger

    try {
      let task = await this.taskStore.get(id)
      if (!task) {
        log.warn('Task not found for processing')
        return
      }
      if (task.status.state !== 'pending') {
        log.debug({ state: task.status.state }, 'Task not pending, skipping')
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
        () => this.executeTask(task, context),
        this.retryOptions
      )

      let updatedTask = await this.transitionStatus(task, status)
      if (artifact) {
        updatedTask = { ...updatedTask, artifacts: [...updatedTask.artifacts, artifact] }
        await this.taskStore.update(updatedTask)
        this.emitArtifactUpdate(updatedTask, artifact)
      }
    } catch (err) {
      log.error({ err }, 'Task processing failed after retries')
      const task = await this.taskStore.get(id)
      if (task && task.status.state !== 'canceled') {
        await this.transitionStatus(task, {
          state: 'failed',
          timestamp: new Date().toISOString(),
          message: {
            role: 'agent',
            parts: [{ type: 'text', text: 'Task processing failed' }],
          },
        })
      }
    }
  }

  private async executeTask(task: Task, context?: TaskContext): Promise<{ status: TaskStatus; artifact?: Artifact }> {
    const result = await this.agentMesh.executeTask(task, context)
    const output: { status: TaskStatus; artifact?: Artifact } = {
      status: this.buildStatus(result.state, result.message),
    }
    if (result.artifact) {
      output.artifact = result.artifact
    }
    return output
  }

  private buildStatus(state: TaskStatus['state'], text: string): TaskStatus {
    return {
      state,
      timestamp: new Date().toISOString(),
      message: {
        role: 'agent',
        parts: [{ type: 'text', text }],
      },
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
