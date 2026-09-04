import { randomUUID } from 'node:crypto'
import type { FastifyBaseLogger } from 'fastify'
import type { Artifact, Task } from './types.js'
import type { WorkerExecutionResult } from './todoWorkerAgent.js'

export interface ScheduledNotification {
  id: string
  taskId: string
  userId: string
  message: string
  schedule: string
  status: 'scheduled'
}

export interface NotificationWorkerAgentDependencies {
  logger: FastifyBaseLogger
}

export class NotificationWorkerAgent {
  readonly id = 'notification-worker'
  readonly capabilities = ['schedule-reminder'] as const
  private readonly logger: FastifyBaseLogger
  private readonly scheduled: ScheduledNotification[] = []

  constructor(deps: NotificationWorkerAgentDependencies) {
    this.logger = deps.logger
  }

  async executeTask(task: Task): Promise<WorkerExecutionResult> {
    const text = task.history[0]?.parts
      .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
      .map((part) => part.text)
      .join(' ')
      .trim()

    const userId = task.metadata?.userId
    if (!text || typeof userId !== 'string') {
      return { state: 'input-required', message: 'A reminder requires text and a userId' }
    }

    const schedule = this.extractSchedule(text)
    if (!schedule) {
      return { state: 'input-required', message: 'Please specify when the reminder should run' }
    }

    const notification: ScheduledNotification = {
      id: randomUUID(),
      taskId: task.id,
      userId,
      message: this.extractMessage(text, schedule),
      schedule,
      status: 'scheduled',
    }
    this.scheduled.push(notification)
    this.logger.info({ taskId: task.id, notificationId: notification.id }, 'Notification scheduled')

    return {
      state: 'completed',
      message: `Scheduled reminder ${schedule}`,
      artifact: this.buildArtifact(notification),
    }
  }

  listScheduled(): ScheduledNotification[] {
    return [...this.scheduled]
  }

  private extractSchedule(text: string): string | null {
    const match = text.match(/\b(tomorrow(?:\s+at\s+[^,.]+)?|today(?:\s+at\s+[^,.]+)?|at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i)
    return match?.[1]?.trim().toLowerCase() ?? null
  }

  private extractMessage(text: string, schedule: string): string {
    return text
      .replace(/^remind\s+me\s+to\s+/i, '')
      .replace(new RegExp(`\\s+${schedule.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*$`, 'i'), '')
      .trim()
  }

  private buildArtifact(notification: ScheduledNotification): Artifact {
    return {
      name: 'notification',
      parts: [{ type: 'data', data: { notification } }],
      index: 0,
    }
  }
}

export function createNotificationWorkerAgent(
  deps: NotificationWorkerAgentDependencies
): NotificationWorkerAgent {
  return new NotificationWorkerAgent(deps)
}
