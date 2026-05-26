// useTodoCommands wraps each TanStack Query mutation with a Command that
// the historyStore can undo/redo. Components call these wrapper functions
// instead of the raw mutations, getting undo/redo "for free".
//
// Trade-off: server-assigned IDs mean that "undo delete" creates a NEW
// todo with a different ID. In production, prefer soft deletes
// (deletedAt timestamps) so the original ID can be restored exactly.

import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { usePushCommand } from '../stores/historyStore'
import {
  useCreateTodo,
  useToggleTodo,
  useEditTodo,
  useDeleteTodo,
  useClearCompleted,
  todoKeys,
} from './useTodos'
import type { Todo } from '../types'

export function useTodoCommands() {
  const queryClient = useQueryClient()
  const pushCommand = usePushCommand()
  const createTodo = useCreateTodo()
  const toggleTodo = useToggleTodo()
  const editTodo = useEditTodo()
  const deleteTodo = useDeleteTodo()
  const clearCompleted = useClearCompleted()

  // Helper: look up a todo from the current cache.
  // Used to capture "before" state for undo (e.g., the old text on EDIT).
  const getTodoFromCache = useCallback(
    (id: number): Todo | undefined => {
      const todos = queryClient.getQueryData<Todo[]>(todoKeys.lists())
      return todos?.find((t) => t.id === id)
    },
    [queryClient],
  )

  // --- ADD ---
  // Execute: create todo on server
  // Undo: delete the created todo
  // Redo: recreate with the same text (gets a NEW server ID)
  const addTodo = useCallback(
    async (text: string): Promise<void> => {
      const created = await createTodo.mutateAsync(text)
      let currentId = created.id
      pushCommand({
        description: `Add "${text}"`,
        undo: async () => {
          await deleteTodo.mutateAsync(currentId)
        },
        redo: async () => {
          const recreated = await createTodo.mutateAsync(text)
          // Track the new ID so a subsequent undo deletes the right row.
          currentId = recreated.id
        },
      })
    },
    [createTodo, deleteTodo, pushCommand],
  )

  // --- TOGGLE ---
  // Symmetric: toggle is its own inverse. We store the previous value
  // and restore it on undo.
  const toggle = useCallback(
    async (id: number): Promise<void> => {
      const before = getTodoFromCache(id)
      if (!before) return
      const nextCompleted = !before.completed
      await toggleTodo.mutateAsync({ id, completed: nextCompleted })
      pushCommand({
        description: nextCompleted ? `Complete "${before.text}"` : `Reopen "${before.text}"`,
        undo: async () => {
          await toggleTodo.mutateAsync({ id, completed: before.completed })
        },
        redo: async () => {
          await toggleTodo.mutateAsync({ id, completed: nextCompleted })
        },
      })
    },
    [getTodoFromCache, toggleTodo, pushCommand],
  )

  // --- EDIT ---
  // Capture old text BEFORE the mutation so undo can restore it.
  const edit = useCallback(
    async (id: number, text: string): Promise<void> => {
      const before = getTodoFromCache(id)
      if (!before) return
      const oldText = before.text
      await editTodo.mutateAsync({ id, text })
      pushCommand({
        description: `Edit "${oldText}" → "${text}"`,
        undo: async () => {
          await editTodo.mutateAsync({ id, text: oldText })
        },
        redo: async () => {
          await editTodo.mutateAsync({ id, text })
        },
      })
    },
    [getTodoFromCache, editTodo, pushCommand],
  )

  // --- DELETE ---
  // Capture the full todo so undo can recreate it. Note: the recreated
  // todo gets a NEW server-assigned ID, so we track it for chained redo.
  const remove = useCallback(
    async (id: number): Promise<void> => {
      const before = getTodoFromCache(id)
      if (!before) return
      let currentId = id
      await deleteTodo.mutateAsync(currentId)
      pushCommand({
        description: `Delete "${before.text}"`,
        undo: async () => {
          // Recreate. We can't restore completed status via createTodo,
          // so if the deleted todo was completed, toggle it after creation.
          const recreated = await createTodo.mutateAsync(before.text)
          currentId = recreated.id
          if (before.completed) {
            await toggleTodo.mutateAsync({ id: currentId, completed: true })
          }
        },
        redo: async () => {
          await deleteTodo.mutateAsync(currentId)
        },
      })
    },
    [getTodoFromCache, createTodo, deleteTodo, toggleTodo, pushCommand],
  )

  // --- CLEAR COMPLETED ---
  // Snapshot all completed todos before clearing so we can recreate them
  // on undo. This is the most expensive command in terms of memory because
  // it can recreate many rows.
  const clearCompletedWithUndo = useCallback(async (): Promise<void> => {
    const todos = queryClient.getQueryData<Todo[]>(todoKeys.lists()) ?? []
    const completedSnapshot = todos.filter((t) => t.completed)
    if (completedSnapshot.length === 0) return
    await clearCompleted.mutateAsync()
    pushCommand({
      description: `Clear ${completedSnapshot.length} completed`,
      undo: async () => {
        // Recreate each as completed. Sequential to avoid duplicate-text
        // races on the server.
        for (const todo of completedSnapshot) {
          const recreated = await createTodo.mutateAsync(todo.text)
          await toggleTodo.mutateAsync({ id: recreated.id, completed: true })
        }
      },
      redo: async () => {
        await clearCompleted.mutateAsync()
      },
    })
  }, [queryClient, clearCompleted, createTodo, toggleTodo, pushCommand])

  return {
    addTodo,
    toggle,
    edit,
    remove,
    clearCompleted: clearCompletedWithUndo,
  }
}
