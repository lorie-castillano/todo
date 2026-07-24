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
import { createTodoId } from '../types'
import { apiFetch } from '../lib/apiFetch'

// Query key factory — centralizes cache key patterns
// Makes cache invalidation predictable
export const todoKeys = {
  all: ['todos'] as const,
  lists: () => [...todoKeys.all, 'list'] as const,
  list: (filters: string) => [...todoKeys.lists(), { filters }] as const,
  details: () => [...todoKeys.all, 'detail'] as const,
  detail: (id: number) => [...todoKeys.details(), id] as const,
}

// --- `satisfies` Operator Demonstration ---
//
// The `satisfies` operator (TypeScript 4.9+) checks that an expression
// matches a type WITHOUT widening it. This is perfect for configuration
// objects where you want autocomplete AND precise literal types.

/** Configuration for todo API endpoints. */
export const TODO_ENDPOINTS = {
  list: '/api/todos',
  create: '/api/todos',
  update: (id: number) => `/api/todos/${id}`,
  delete: (id: number) => `/api/todos/${id}`,
  clearCompleted: '/api/todos?completed=true',
} as const satisfies Record<string, string | ((id: number) => string)>

// With `satisfies`:
// - TODO_ENDPOINTS.list is literally '/api/todos' (not widened to string)
// - Autocomplete works for all keys
// - Type error if we add a key that doesn't match the constraint
// - `as const` preserves literal types; `satisfies` validates the shape

/** Type inference from the satisfies object. */
export type TodoEndpoint = keyof typeof TODO_ENDPOINTS

/** Extract route path type (literals, not string). */
export type TodoRoute = typeof TODO_ENDPOINTS['list'] // '/api/todos'

// --- Queries (READ operations) ---

// Fetch all todos
async function fetchTodos(): Promise<Todo[]> {
  const response = await apiFetch(TODO_ENDPOINTS.list)
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
  const response = await apiFetch(TODO_ENDPOINTS.create, {
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
          id: createTodoId(Date.now()), // temporary ID
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
  const response = await apiFetch(TODO_ENDPOINTS.update(id), {
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
  const response = await apiFetch(TODO_ENDPOINTS.update(id), {
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
  const response = await apiFetch(TODO_ENDPOINTS.delete(id), {
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
  const response = await apiFetch(TODO_ENDPOINTS.clearCompleted, {
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

// --- Type-Safe API Response Handling ---
//
// These types and utilities demonstrate how to enforce type safety at
// API boundaries. The `satisfies` operator (see below) is the modern
// way to ensure objects match types while preserving literal inference.

/** Branded error type for API failures. */
export type ApiError = { readonly __brand: 'ApiError'; message: string; status: number }

export function createApiError(message: string, status: number): ApiError {
  return { __brand: 'ApiError', message, status } as ApiError
}

/** Discriminated union for API results: either data or error. */
export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError }

/**
 * Type-safe fetch wrapper that returns a discriminated union.
 * The caller must check `ok` before accessing `data`.
 */
export async function fetchApi<T>(
  url: string,
  options?: RequestInit
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, options)
    if (!response.ok) {
      const errorText = await response.text()
      return {
        ok: false,
        error: createApiError(
          errorText || `HTTP ${response.status}`,
          response.status
        ),
      }
    }
    const data = (await response.json()) as T
    return { ok: true, data }
  } catch (err) {
    return {
      ok: false,
      error: createApiError(
        err instanceof Error ? err.message : 'Network error',
        0
      ),
    }
  }
}

// Example: Using satisfies for theme tokens (in themeStore.ts)
// const THEME_TOKENS = {
//   colors: { primary: '#3b82f6', danger: '#ef4444' },
//   spacing: { sm: '0.5rem', md: '1rem', lg: '1.5rem' },
// } as const satisfies { colors: Record<string, string>; spacing: Record<string, string> }
//
// Now THEME_TOKENS.colors.primary is '#3b82f6' (literal), not string.
// Autocomplete works: THEME_TOKENS.colors. shows 'primary' | 'danger'

