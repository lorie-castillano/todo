import { describe, it, expect, beforeEach, vi } from 'vitest'
import { pino } from 'pino'
import { createInMemoryTaskStore, type TaskStore } from './taskStore.js'
import { TaskManager, createTaskManager, type TaskEvent } from './taskManager.js'
import { createTodoWorkerAgent, type TodoWorkerAgent } from './todoWorkerAgent.js'
import { createNotificationWorkerAgent, type NotificationWorkerAgent } from './notificationWorkerAgent.js'
import type { TodoService } from '../services/todoService.js'
import type { TaskSendRequest } from './types.js'

function makeMockTodoService(overrides: Partial<TodoService> = {}): TodoService {
  return {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    getById: vi.fn(),
    softDelete: vi.fn(),
    restore: vi.fn(),
    hardDelete: vi.fn(),
    toggleCompleted: vi.fn(),
    ...overrides,
  } as unknown as TodoService
}

function waitForImmediate(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve))
}

describe('TaskManager', () => {
  let taskStore: TaskStore
  let todoService: TodoService
  let workerAgent: TodoWorkerAgent
  let notificationWorker: NotificationWorkerAgent
  let manager: TaskManager

  beforeEach(() => {
    taskStore = createInMemoryTaskStore()
    todoService = makeMockTodoService()
    workerAgent = createTodoWorkerAgent({
      todoService,
      logger: pino({ level: 'silent' }),
    })
    notificationWorker = createNotificationWorkerAgent({ logger: pino({ level: 'silent' }) })
    manager = createTaskManager({
      taskStore,
      workerAgent,
      notificationWorker,
      logger: pino({ level: 'silent' }),
      retryOptions: { maxAttempts: 2, delayMs: 0 },
      autoProcess: false,
    })
  })

  it('sendTask creates a pending task and returns it', async () => {
    const request: TaskSendRequest = {
      message: {
        role: 'user',
        parts: [{ type: 'text', text: 'Create a todo to call mom' }],
      },
      metadata: { userId: 'user-1' },
    }

    const task = await manager.sendTask(request)

    expect(task.status.state).toBe('pending')
    expect(task.history).toHaveLength(1)
    expect(task.history[0]?.parts[0]?.type === 'text' ? task.history[0].parts[0].text : '').toBe(
      'Create a todo to call mom'
    )

    const stored = await taskStore.get(task.id)
    expect(stored).not.toBeNull()
    expect(stored?.status.state).toBe('pending')
  })

  it('processTask creates a todo and emits status + artifact updates', async () => {
    const todo = { id: 1, text: 'call mom', completed: false, userId: 'user-1', deletedAt: null, createdAt: new Date(), updatedAt: new Date() }
    vi.mocked(todoService.create).mockResolvedValue(todo)

    const task = await taskStore.create({
      sessionId: 'session-1',
      status: { state: 'pending', timestamp: new Date().toISOString() },
      history: [{ role: 'user', parts: [{ type: 'text', text: 'Create a todo to call mom' }] }],
      artifacts: [],
      metadata: { userId: 'user-1' },
    })

    const events: TaskEvent[] = []
    manager.subscribe(task.id, (event) => events.push(event))

    await manager.processTask(task.id)

    const updated = await taskStore.get(task.id)
    expect(updated?.status.state).toBe('completed')
    expect(updated?.artifacts).toHaveLength(1)

    const statusEvents = events.filter((e) => e.type === 'task-status-update')
    expect(statusEvents.length).toBeGreaterThanOrEqual(2) // pending/working + completed
    expect(events.some((e) => e.type === 'task-artifact-update')).toBe(true)
    expect(todoService.create).toHaveBeenCalledWith({ text: 'call mom', userId: 'user-1' })
  })

  it('processTask returns input-required when userId is missing', async () => {
    const task = await taskStore.create({
      sessionId: 'session-1',
      status: { state: 'pending', timestamp: new Date().toISOString() },
      history: [{ role: 'user', parts: [{ type: 'text', text: 'Create a todo to call mom' }] }],
      artifacts: [],
      metadata: {},
    })

    await manager.processTask(task.id)

    const updated = await taskStore.get(task.id)
    expect(updated?.status.state).toBe('input-required')
  })

  it('processTask lists todos and returns an artifact', async () => {
    const todos = [
      { id: 1, text: 'buy milk', completed: false, userId: 'user-1', deletedAt: null, createdAt: new Date(), updatedAt: new Date() },
    ]
    vi.mocked(todoService.list).mockResolvedValue(todos)

    const task = await taskStore.create({
      sessionId: 'session-1',
      status: { state: 'pending', timestamp: new Date().toISOString() },
      history: [{ role: 'user', parts: [{ type: 'text', text: 'List my pending todos' }] }],
      artifacts: [],
      metadata: { userId: 'user-1' },
    })

    await manager.processTask(task.id)

    const updated = await taskStore.get(task.id)
    expect(updated?.status.state).toBe('completed')
    expect(updated?.artifacts[0]?.parts[0]?.type === 'data' ? updated.artifacts[0].parts[0].data.todos : []).toEqual(
      todos
    )
    expect(todoService.list).toHaveBeenCalledWith('user-1', { completed: false })
  })

  it('processTask toggles a todo by id', async () => {
    const todo = { id: 5, text: 'buy milk', completed: true, userId: 'user-1', deletedAt: null, createdAt: new Date(), updatedAt: new Date() }
    vi.mocked(todoService.toggleCompleted).mockResolvedValue(todo)

    const task = await taskStore.create({
      sessionId: 'session-1',
      status: { state: 'pending', timestamp: new Date().toISOString() },
      history: [{ role: 'user', parts: [{ type: 'text', text: 'Toggle todo 5' }] }],
      artifacts: [],
      metadata: { userId: 'user-1' },
    })

    await manager.processTask(task.id)

    const updated = await taskStore.get(task.id)
    expect(updated?.status.state).toBe('completed')
    expect(todoService.toggleCompleted).toHaveBeenCalledWith(5, 'user-1')
  })

  it('processTask deletes a todo by id', async () => {
    const todo = { id: 7, text: 'buy milk', completed: false, userId: 'user-1', deletedAt: new Date(), createdAt: new Date(), updatedAt: new Date() }
    vi.mocked(todoService.softDelete).mockResolvedValue(todo)

    const task = await taskStore.create({
      sessionId: 'session-1',
      status: { state: 'pending', timestamp: new Date().toISOString() },
      history: [{ role: 'user', parts: [{ type: 'text', text: 'Delete todo 7' }] }],
      artifacts: [],
      metadata: { userId: 'user-1' },
    })

    await manager.processTask(task.id)

    const updated = await taskStore.get(task.id)
    expect(updated?.status.state).toBe('completed')
    expect(todoService.softDelete).toHaveBeenCalledWith(7, 'user-1')
  })

  it('decomposes a reminder across todo and notification workers', async () => {
    const todo = { id: 2, text: 'call mom', completed: false, userId: 'user-1', deletedAt: null, createdAt: new Date(), updatedAt: new Date() }
    vi.mocked(todoService.create).mockResolvedValue(todo)

    const task = await taskStore.create({
      sessionId: 'session-1',
      status: { state: 'pending', timestamp: new Date().toISOString() },
      history: [{ role: 'user', parts: [{ type: 'text', text: 'Remind me to call mom tomorrow' }] }],
      artifacts: [],
      metadata: { userId: 'user-1' },
    })

    await manager.processTask(task.id)

    const updated = await taskStore.get(task.id)
    expect(updated?.status.state).toBe('completed')
    expect(todoService.create).toHaveBeenCalledWith({ text: 'call mom', userId: 'user-1' })
    expect(notificationWorker.listScheduled()).toEqual([
      expect.objectContaining({ message: 'call mom', schedule: 'tomorrow' }),
    ])
    expect(updated?.artifacts[0]?.parts[0]).toEqual(
      expect.objectContaining({
        type: 'data',
        data: expect.objectContaining({ todo, notification: expect.any(Object) }),
      })
    )
  })

  it('cancelTask transitions a pending task to canceled', async () => {
    const task = await manager.sendTask({
      message: { role: 'user', parts: [{ type: 'text', text: 'List todos' }] },
      metadata: { userId: 'user-1' },
    })

    const canceled = await manager.cancelTask(task.id)

    expect(canceled?.status.state).toBe('canceled')
    const stored = await taskStore.get(task.id)
    expect(stored?.status.state).toBe('canceled')
  })

  it('retries transient failures during execution', async () => {
    let attempts = 0
    vi.mocked(todoService.create).mockImplementation(() => {
      attempts++
      if (attempts < 2) {
        return Promise.reject(new Error('transient database hiccup'))
      }
      return Promise.resolve({ id: 1, text: 'call mom', completed: false, userId: 'user-1', deletedAt: null, createdAt: new Date(), updatedAt: new Date() })
    })

    const task = await taskStore.create({
      sessionId: 'session-1',
      status: { state: 'pending', timestamp: new Date().toISOString() },
      history: [{ role: 'user', parts: [{ type: 'text', text: 'Create a todo to call mom' }] }],
      artifacts: [],
      metadata: { userId: 'user-1' },
    })

    await manager.processTask(task.id)

    const updated = await taskStore.get(task.id)
    expect(updated?.status.state).toBe('completed')
    expect(todoService.create).toHaveBeenCalledTimes(2)
  })

  it('stores a safe failed state without exposing internal errors', async () => {
    vi.mocked(todoService.create).mockRejectedValue(new Error('database password leaked internally'))

    const task = await taskStore.create({
      sessionId: 'session-1',
      status: { state: 'pending', timestamp: new Date().toISOString() },
      history: [{ role: 'user', parts: [{ type: 'text', text: 'Create a todo to call mom' }] }],
      artifacts: [],
      metadata: { userId: 'user-1' },
    })

    await manager.processTask(task.id)

    const updated = await taskStore.get(task.id)
    expect(updated?.status.state).toBe('failed')
    expect(updated?.status.message?.parts).toEqual([
      { type: 'text', text: 'Task processing failed' },
    ])
    expect(JSON.stringify(updated)).not.toContain('database password')
  })

  it('does not retry not-found errors', async () => {
    vi.mocked(todoService.toggleCompleted).mockResolvedValue(null)

    const task = await taskStore.create({
      sessionId: 'session-1',
      status: { state: 'pending', timestamp: new Date().toISOString() },
      history: [{ role: 'user', parts: [{ type: 'text', text: 'Toggle todo 99' }] }],
      artifacts: [],
      metadata: { userId: 'user-1' },
    })

    await manager.processTask(task.id)

    expect(todoService.toggleCompleted).toHaveBeenCalledTimes(1)
    const updated = await taskStore.get(task.id)
    expect(updated?.status.state).toBe('completed')
  })

  it('spawns background processing after sendTask returns', async () => {
    vi.mocked(todoService.create).mockResolvedValue({ id: 1, text: 'call mom', completed: false, userId: 'user-1', deletedAt: null, createdAt: new Date(), updatedAt: new Date() })

    const autoWorker = createTodoWorkerAgent({
      todoService,
      logger: pino({ level: 'silent' }),
    })
    const autoManager = createTaskManager({
      taskStore,
      workerAgent: autoWorker,
      notificationWorker,
      logger: pino({ level: 'silent' }),
      retryOptions: { maxAttempts: 2, delayMs: 0 },
      autoProcess: true,
    })

    const task = await autoManager.sendTask({
      message: { role: 'user', parts: [{ type: 'text', text: 'Create a todo to call mom' }] },
      metadata: { userId: 'user-1' },
    })

    expect(task.status.state).toBe('pending')

    await waitForImmediate()
    await waitForImmediate()

    const updated = await taskStore.get(task.id)
    expect(updated?.status.state).toBe('completed')
  })
})
