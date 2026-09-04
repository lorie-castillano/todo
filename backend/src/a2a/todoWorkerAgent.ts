// TodoWorkerAgent — a hybrid MCP + A2A worker.
//
// The worker exposes the same four todo tools that the MCP server does, but
// it receives work through A2A tasks instead of MCP tool calls. This is the
// bridge between the two protocols: the A2A Task Manager delegates todo
// requests to this worker, and the worker fulfills them using the shared
// todoService business logic.
//
// In Lesson 6.4 this worker will become a standalone service in the agent mesh.

import type { FastifyBaseLogger } from 'fastify'
import type { Task, Artifact } from './types.js'
import type { TodoService } from '../services/todoService.js'
import { TODO_MCP_TOOLS, type McpToolDefinition } from '../mcp/toolDefinitions.js'
import { CircuitBreaker } from './circuitBreaker.js'
import { withTimeout } from './timeout.js'
import type { TaskContext } from './taskManager.js'

export type { McpToolDefinition }

export interface WorkerExecutionResult {
  state: 'completed' | 'input-required'
  message: string
  artifact?: Artifact
}

export interface TodoWorkerAgentDependencies {
  todoService: TodoService
  logger: FastifyBaseLogger
  timeoutMs?: number
  circuitBreaker?: CircuitBreaker
}

export class TodoWorkerAgent {
  private readonly todoService: TodoService
  private readonly logger: FastifyBaseLogger
  private readonly timeoutMs: number
  private readonly circuitBreaker: CircuitBreaker

  constructor(deps: TodoWorkerAgentDependencies) {
    this.todoService = deps.todoService
    this.logger = deps.logger
    this.timeoutMs = deps.timeoutMs ?? 30000
    this.circuitBreaker = deps.circuitBreaker ?? new CircuitBreaker()
  }

  /**
   * MCP-style tool definitions advertised by this worker.
   * A2A agents can fetch these from `GET /a2a/worker/tools` to understand
   * which capabilities this worker provides.
   */
  get mcpTools(): McpToolDefinition[] {
    return TODO_MCP_TOOLS
  }

  /**
   * Execute an A2A task by mapping its user message to the appropriate
   * todo operation. Returns a result that the Task Manager turns into a
   * task status update and optional artifact.
   */
  async executeTask(task: Task, context?: TaskContext): Promise<WorkerExecutionResult> {
    const logContext = { taskId: task.id, ...context }
    return this.circuitBreaker.execute(() => withTimeout(this.runTask(task, logContext), this.timeoutMs))
  }

  private async runTask(task: Task, context: Record<string, unknown>): Promise<WorkerExecutionResult> {
    this.logger.debug(context, 'TodoWorkerAgent executing task')

    const userMessage = task.history[0]
    if (!userMessage) {
      return this.buildResult('input-required', 'No user message found')
    }

    const text = userMessage.parts
      .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
      .map((part) => part.text)
      .join(' ')
      .trim()

    if (!text) {
      return this.buildResult('input-required', 'Please provide a text request')
    }

    const userId = this.getUserId(task)
    if (!userId) {
      return this.buildResult('input-required', 'Please provide userId in metadata')
    }

    const lower = text.toLowerCase()

    if (lower.includes('list') && lower.includes('todo')) {
      const filter = lower.includes('completed')
        ? { completed: true }
        : lower.includes('pending')
          ? { completed: false }
          : undefined
      const todos = await this.todoService.list(userId, filter)
      return this.buildResult('completed', `Found ${todos.length} todo(s)`, { todos })
    }

    if (lower.includes('create') || lower.includes('add')) {
      const todoText = this.extractTodoText(text)
      if (!todoText) {
        return this.buildResult('input-required', 'Please specify the todo text')
      }
      const todo = await this.todoService.create({ text: todoText, userId })
      return this.buildResult('completed', `Created todo: ${todo.text}`, { todo })
    }

    if (lower.includes('toggle')) {
      const todoId = this.extractTodoId(text)
      if (!todoId) {
        return this.buildResult('input-required', 'Please specify the todo id to toggle')
      }
      const todo = await this.todoService.toggleCompleted(todoId, userId)
      if (!todo) {
        return this.buildResult('completed', `Todo ${todoId} not found or already deleted`)
      }
      return this.buildResult('completed', `Toggled todo: ${todo.text}`, { todo })
    }

    if (lower.includes('delete') || lower.includes('remove')) {
      const todoId = this.extractTodoId(text)
      if (!todoId) {
        return this.buildResult('input-required', 'Please specify the todo id to delete')
      }
      const todo = await this.todoService.softDelete(todoId, userId)
      if (!todo) {
        return this.buildResult('completed', `Todo ${todoId} not found or already deleted`)
      }
      return this.buildResult('completed', `Deleted todo: ${todo.text}`, { todo })
    }

    this.logger.debug({ text, ...context }, 'Unknown worker command')
    return this.buildResult(
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

  private buildResult(
    state: WorkerExecutionResult['state'],
    message: string,
    data?: Record<string, unknown>
  ): WorkerExecutionResult {
    const result: WorkerExecutionResult = { state, message }
    if (data) {
      result.artifact = this.buildDataArtifact(data)
    }
    return result
  }

  private buildDataArtifact(data: Record<string, unknown>): Artifact {
    return {
      name: 'result',
      parts: [{ type: 'data', data }],
      index: 0,
    }
  }
}

export function createTodoWorkerAgent(deps: TodoWorkerAgentDependencies): TodoWorkerAgent {
  return new TodoWorkerAgent(deps)
}
