import type { Artifact, Task } from './types.js'
import type { TodoWorkerAgent, WorkerExecutionResult } from './todoWorkerAgent.js'
import type { NotificationWorkerAgent } from './notificationWorkerAgent.js'
import type { TaskContext } from './taskManager.js'

export interface AgentMeshDependencies {
  todoWorker: TodoWorkerAgent
  notificationWorker: NotificationWorkerAgent
}

export interface AgentDescriptor {
  id: string
  capabilities: readonly string[]
}

export class AgentMesh {
  private readonly todoWorker: TodoWorkerAgent
  private readonly notificationWorker: NotificationWorkerAgent

  constructor(deps: AgentMeshDependencies) {
    this.todoWorker = deps.todoWorker
    this.notificationWorker = deps.notificationWorker
  }

  listAgents(): AgentDescriptor[] {
    return [
      { id: 'todo-worker', capabilities: ['list-todos', 'create-todo', 'toggle-todo', 'delete-todo'] },
      { id: this.notificationWorker.id, capabilities: this.notificationWorker.capabilities },
    ]
  }

  async executeTask(task: Task, context?: TaskContext): Promise<WorkerExecutionResult> {
    if (!this.isReminder(task)) {
      return this.todoWorker.executeTask(task, this.workerContext(context, 'todo-worker', 'manage-todos'))
    }

    const todoTask = this.toTodoTask(task)
    const [todoResult, notificationResult] = await Promise.all([
      this.todoWorker.executeTask(
        todoTask,
        this.workerContext(context, 'todo-worker', 'create-todo')
      ),
      this.notificationWorker.executeTask(
        task,
        this.workerContext(context, 'notification-worker', 'schedule-reminder')
      ),
    ])

    if (todoResult.state === 'input-required' || notificationResult.state === 'input-required') {
      return {
        state: 'input-required',
        message: [todoResult.message, notificationResult.message].join(' '),
      }
    }

    return {
      state: 'completed',
      message: 'Created the todo and scheduled its reminder',
      artifact: this.combineArtifacts(todoResult.artifact, notificationResult.artifact),
    }
  }

  private workerContext(
    context: TaskContext | undefined,
    targetAgentId: string,
    capability: string
  ): TaskContext | undefined {
    return context ? { ...context, targetAgentId, capability } : undefined
  }

  private isReminder(task: Task): boolean {
    return task.history[0]?.parts.some(
      (part) => part.type === 'text' && /^remind\s+me\s+to\s+/i.test(part.text.trim())
    ) ?? false
  }

  private toTodoTask(task: Task): Task {
    return {
      ...task,
      history: task.history.map((message, index) =>
        index === 0
          ? {
              ...message,
              parts: message.parts.map((part) =>
                part.type === 'text'
                  ? {
                      type: 'text' as const,
                      text: `Create a todo to ${part.text
                        .replace(/^remind\s+me\s+to\s+/i, '')
                        .replace(/\s+(?:tomorrow|today)(?:\s+at\s+[^,.]+)?.*$/i, '')
                        .trim()}`,
                    }
                  : part
              ),
            }
          : message
      ),
    }
  }

  private combineArtifacts(todo?: Artifact, notification?: Artifact): Artifact {
    const todoData = todo?.parts.find((part) => part.type === 'data')
    const notificationData = notification?.parts.find((part) => part.type === 'data')

    return {
      name: 'reminder-workflow-result',
      parts: [
        {
          type: 'data',
          data: {
            ...(todoData?.type === 'data' ? todoData.data : {}),
            ...(notificationData?.type === 'data' ? notificationData.data : {}),
          },
        },
      ],
      index: 0,
    }
  }
}

export function createAgentMesh(deps: AgentMeshDependencies): AgentMesh {
  return new AgentMesh(deps)
}
