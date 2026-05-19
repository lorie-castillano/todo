// TanStack Query hooks for todo API operations
//
// Pattern: Each operation is split into:
// 1. query hook (read) — useSuspenseQuery or useQuery
// 2. mutation hook (write) — useMutation
//
// Benefits:
// - Automatic caching and deduplication
// - Background refetching when data is stale
// - Optimistic updates (UI updates before API confirms)
// - Automatic loading/error states
// - Request cancellation on unmount

import {
  useQuery,
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import type { Todo } from '../types'

// Query key factory — centralizes cache key patterns
// Makes cache invalidation predictable
export const todoKeys = {
  all: ['todos'] as const,
  lists: () => [...todoKeys.all, 'list'] as const,
  list: (filters: string) => [...todoKeys.lists(), { filters }] as const,
  details: () => [...todoKeys.all, 'detail'] as const,
  detail: (id: number) => [...todoKeys.details(), id] as const,
}

// --- Queries (READ operations) ---

// Fetch all todos
async function fetchTodos(): Promise<Todo[]> {
  const response = await fetch('/api/todos')
  if (!response.ok) {
    throw new Error('Failed to fetch todos')
  }
  return response.json()
}

// Standard query hook (manual loading state handling)
export function useTodos() {
  return useQuery({
    queryKey: todoKeys.lists(),
    queryFn: fetchTodos,
  })
}

// Suspense-enabled query hook (for use with React Suspense)
// The parent component must be wrapped in <Suspense fallback={...}>
export function useTodosSuspense() {
  return useSuspenseQuery({
    queryKey: todoKeys.lists(),
    queryFn: fetchTodos,
  })
}

// --- Mutations (WRITE operations) ---

// ADD todo mutation
async function createTodo(text: string): Promise<Todo> {
  const response = await fetch('/api/todos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create todo')
  }

  return response.json()
}

export function useCreateTodo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createTodo,

    // OPTIMISTIC UPDATE: Update cache before API responds
    // This makes the UI feel instant, even with slow networks.
    onMutate: async (newText) => {
      // Cancel any in-flight refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: todoKeys.lists() })

      // Snapshot previous value for rollback on error
      const previousTodos = queryClient.getQueryData<Todo[]>(todoKeys.lists())

      // Optimistically add new todo to cache
      // We use a temporary ID that will be replaced by the server response
      queryClient.setQueryData<Todo[]>(todoKeys.lists(), (old) => {
        const optimisticTodo: Todo = {
          id: Date.now(), // temporary ID
          text: newText,
          completed: false,
        }
        return old ? [optimisticTodo, ...old] : [optimisticTodo]
      })

      // Return context for rollback
      return { previousTodos }
    },

    // If mutation fails, roll back to previous value
    onError: (_err, _newText, context) => {
      if (context?.previousTodos) {
        queryClient.setQueryData(todoKeys.lists(), context.previousTodos)
      }
    },

    // Always refetch after error or success to ensure server state is correct
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: todoKeys.lists() })
    },
  })
}

// TOGGLE todo mutation
async function updateTodo({
  id,
  completed,
}: {
  id: number
  completed: boolean
}): Promise<Todo> {
  const response = await fetch(`/api/todos/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed }),
  })

  if (!response.ok) {
    throw new Error('Failed to update todo')
  }

  return response.json()
}

export function useToggleTodo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateTodo,

    onMutate: async ({ id, completed }) => {
      await queryClient.cancelQueries({ queryKey: todoKeys.lists() })
      const previousTodos = queryClient.getQueryData<Todo[]>(todoKeys.lists())

      queryClient.setQueryData<Todo[]>(todoKeys.lists(), (old) => {
        return old?.map((todo) =>
          todo.id === id ? { ...todo, completed } : todo
        )
      })

      return { previousTodos }
    },

    onError: (_err, _variables, context) => {
      if (context?.previousTodos) {
        queryClient.setQueryData(todoKeys.lists(), context.previousTodos)
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: todoKeys.lists() })
    },
  })
}

// EDIT todo text mutation
async function editTodoText({
  id,
  text,
}: {
  id: number
  text: string
}): Promise<Todo> {
  const response = await fetch(`/api/todos/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to edit todo')
  }

  return response.json()
}

export function useEditTodo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: editTodoText,

    onMutate: async ({ id, text }) => {
      await queryClient.cancelQueries({ queryKey: todoKeys.lists() })
      const previousTodos = queryClient.getQueryData<Todo[]>(todoKeys.lists())

      queryClient.setQueryData<Todo[]>(todoKeys.lists(), (old) => {
        return old?.map((todo) => (todo.id === id ? { ...todo, text } : todo))
      })

      return { previousTodos }
    },

    onError: (_err, _variables, context) => {
      if (context?.previousTodos) {
        queryClient.setQueryData(todoKeys.lists(), context.previousTodos)
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: todoKeys.lists() })
    },
  })
}

// DELETE todo mutation
async function deleteTodo(id: number): Promise<void> {
  const response = await fetch(`/api/todos/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error('Failed to delete todo')
  }
}

export function useDeleteTodo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteTodo,

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: todoKeys.lists() })
      const previousTodos = queryClient.getQueryData<Todo[]>(todoKeys.lists())

      queryClient.setQueryData<Todo[]>(todoKeys.lists(), (old) => {
        return old?.filter((todo) => todo.id !== id)
      })

      return { previousTodos }
    },

    onError: (_err, _id, context) => {
      if (context?.previousTodos) {
        queryClient.setQueryData(todoKeys.lists(), context.previousTodos)
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: todoKeys.lists() })
    },
  })
}

// CLEAR COMPLETED mutation
async function clearCompleted(): Promise<void> {
  const response = await fetch('/api/todos?completed=true', {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error('Failed to clear completed todos')
  }
}

export function useClearCompleted() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: clearCompleted,

    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: todoKeys.lists() })
      const previousTodos = queryClient.getQueryData<Todo[]>(todoKeys.lists())

      queryClient.setQueryData<Todo[]>(todoKeys.lists(), (old) => {
        return old?.filter((todo) => !todo.completed)
      })

      return { previousTodos }
    },

    onError: (_err, _variables, context) => {
      if (context?.previousTodos) {
        queryClient.setQueryData(todoKeys.lists(), context.previousTodos)
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: todoKeys.lists() })
    },
  })
}
