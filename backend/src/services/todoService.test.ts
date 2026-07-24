// Unit tests for todoService — focused on the Lesson 5.5 ownership guarantee:
// every read and write must be scoped to the authenticated user so one user can
// never see or mutate another user's todos.
//
// Prisma is mocked. Its $transaction supports the callback form used here
// (`prisma.$transaction(async (tx) => ...)`), so the mock invokes the callback
// with a tx that shares the same mocked `todo` delegate.

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTodoService } from './todoService.js'
import type { PrismaClient } from '../generated/prisma/client.js'

function createMockPrisma() {
  const todo = {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }
  return {
    todo,
    // Callback form: run the callback with a tx exposing the same todo delegate.
    $transaction: vi.fn((arg: unknown) =>
      typeof arg === 'function'
        ? (arg as (tx: unknown) => unknown)({ todo })
        : Promise.all(arg as Promise<unknown>[])
    ),
  }
}

type MockPrisma = ReturnType<typeof createMockPrisma>

describe('todoService (per-user scoping)', () => {
  let prisma: MockPrisma
  let service: ReturnType<typeof createTodoService>

  beforeEach(() => {
    prisma = createMockPrisma()
    service = createTodoService(prisma as unknown as PrismaClient)
  })

  // --- list ---
  describe('list', () => {
    it('scopes the query to the user and excludes soft-deleted rows', async () => {
      prisma.todo.findMany.mockResolvedValue([])

      await service.list('user-A')

      const arg = prisma.todo.findMany.mock.calls[0]![0] as {
        where: { userId: string; deletedAt: null }
      }
      expect(arg.where.userId).toBe('user-A')
      expect(arg.where.deletedAt).toBeNull()
    })

    it('applies the completed filter when provided', async () => {
      prisma.todo.findMany.mockResolvedValue([])

      await service.list('user-A', { completed: true })

      const arg = prisma.todo.findMany.mock.calls[0]![0] as {
        where: { userId: string; completed?: boolean }
      }
      expect(arg.where.userId).toBe('user-A')
      expect(arg.where.completed).toBe(true)
    })
  })

  // --- getById ---
  describe('getById', () => {
    it('requires both id AND userId (prevents cross-user reads)', async () => {
      prisma.todo.findFirst.mockResolvedValue(null)

      const result = await service.getById(42, 'user-A')

      const arg = prisma.todo.findFirst.mock.calls[0]![0] as {
        where: { id: number; userId: string; deletedAt: null }
      }
      expect(arg.where.id).toBe(42)
      expect(arg.where.userId).toBe('user-A')
      expect(arg.where.deletedAt).toBeNull()
      expect(result).toBeNull()
    })
  })

  // --- create ---
  describe('create', () => {
    it('stamps the owning userId on the new todo', async () => {
      prisma.todo.create.mockResolvedValue({ id: 1, text: 'hi', userId: 'user-A' })

      await service.create({ text: 'hi', userId: 'user-A' })

      const arg = prisma.todo.create.mock.calls[0]![0] as {
        data: { text: string; userId: string }
      }
      expect(arg.data).toMatchObject({ text: 'hi', userId: 'user-A' })
    })
  })

  // --- update ---
  describe('update', () => {
    it("returns null when the todo isn't owned by the user (no update runs)", async () => {
      prisma.todo.findFirst.mockResolvedValue(null) // not found for this user

      const result = await service.update(7, 'user-A', { text: 'new' })

      expect(result).toBeNull()
      expect(prisma.todo.update).not.toHaveBeenCalled()
    })

    it('updates when the user owns the todo', async () => {
      prisma.todo.findFirst.mockResolvedValue({ id: 7, userId: 'user-A' })
      prisma.todo.update.mockResolvedValue({ id: 7, text: 'new', userId: 'user-A' })

      const result = await service.update(7, 'user-A', { text: 'new' })

      const findArg = prisma.todo.findFirst.mock.calls[0]![0] as {
        where: { id: number; userId: string }
      }
      expect(findArg.where).toMatchObject({ id: 7, userId: 'user-A' })
      expect(result).toMatchObject({ id: 7, text: 'new' })
    })
  })

  // --- softDelete ---
  describe('softDelete', () => {
    it('returns null for a todo owned by someone else', async () => {
      prisma.todo.findFirst.mockResolvedValue(null)

      const result = await service.softDelete(9, 'user-A')

      expect(result).toBeNull()
      expect(prisma.todo.update).not.toHaveBeenCalled()
    })

    it('sets deletedAt when the user owns the todo', async () => {
      prisma.todo.findFirst.mockResolvedValue({ id: 9, userId: 'user-A' })
      prisma.todo.update.mockResolvedValue({ id: 9, deletedAt: new Date() })

      await service.softDelete(9, 'user-A')

      const arg = prisma.todo.update.mock.calls[0]![0] as {
        data: { deletedAt: Date }
      }
      expect(arg.data.deletedAt).toBeInstanceOf(Date)
    })
  })

  // --- toggleCompleted ---
  describe('toggleCompleted', () => {
    it('flips completed based on the current value, scoped to the user', async () => {
      prisma.todo.findFirst.mockResolvedValue({ id: 3, userId: 'user-A', completed: false })
      prisma.todo.update.mockResolvedValue({ id: 3, completed: true })

      await service.toggleCompleted(3, 'user-A')

      const findArg = prisma.todo.findFirst.mock.calls[0]![0] as {
        where: { id: number; userId: string }
      }
      expect(findArg.where).toMatchObject({ id: 3, userId: 'user-A' })

      const updateArg = prisma.todo.update.mock.calls[0]![0] as {
        data: { completed: boolean }
      }
      expect(updateArg.data.completed).toBe(true) // was false → now true
    })

    it('returns null when the user does not own the todo', async () => {
      prisma.todo.findFirst.mockResolvedValue(null)

      const result = await service.toggleCompleted(3, 'user-B')

      expect(result).toBeNull()
      expect(prisma.todo.update).not.toHaveBeenCalled()
    })
  })
})
