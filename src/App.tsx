import { useState, useCallback, useMemo, lazy, Suspense } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from './lib/queryClient'
import { Header } from './components/Header'
import { TodoForm } from './components/TodoForm'
import { TodoList } from './components/TodoList'
import { TodoFooter } from './components/TodoFooter'
import { ThemeProvider } from './ThemeContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import {
  useTodos,
  useCreateTodo,
  useToggleTodo,
  useEditTodo,
  useDeleteTodo,
  useClearCompleted,
} from './hooks/useTodos'

// CODE SPLITTING: HelpModal is loaded ONLY when the user opens it.
const HelpModal = lazy(() => import('./components/HelpModal'))

// Start MSW in development mode (browser only, not in tests)
// Tests use server.ts (Node.js), browser uses browser.ts (Service Worker)
if (import.meta.env.DEV && !import.meta.env.VITEST) {
  const { startMocking } = await import('./mocks/browser')
  startMocking()
}

// --- Loading Spinner Component ---
function LoadingSpinner() {
  return (
    <div className="flex justify-center py-12" role="status" aria-label="Loading todos">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400" />
    </div>
  )
}

// --- Error Display Component ---
function ErrorDisplay({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="p-6 text-center">
      <p className="text-red-600 dark:text-red-400 mb-4">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
      >
        Retry
      </button>
    </div>
  )
}

// --- Main App Component ---
// Now using TanStack Query for server state management.
// Benefits:
// - Automatic caching with background refetching
// - Optimistic updates for instant UI feedback
// - Built-in loading and error states
// - Request deduplication

function App() {
  const [showHelp, setShowHelp] = useState(false)

  // --- Data Fetching ---
  const { data: todos = [], isLoading, isError, error, refetch } = useTodos()

  // --- Mutations (with optimistic updates) ---
  const createTodo = useCreateTodo()
  const toggleTodo = useToggleTodo()
  const editTodo = useEditTodo()
  const deleteTodo = useDeleteTodo()
  const clearCompleted = useClearCompleted()

  // --- Handlers ---
  const handleAdd = useCallback(
    (text: string) => {
      createTodo.mutate(text)
    },
    [createTodo]
  )

  const handleToggle = useCallback(
    (id: number) => {
      const todo = todos.find((t) => t.id === id)
      if (todo) {
        toggleTodo.mutate({ id, completed: !todo.completed })
      }
    },
    [toggleTodo, todos]
  )

  const handleEdit = useCallback(
    (id: number, text: string) => {
      editTodo.mutate({ id, text })
    },
    [editTodo]
  )

  const handleDelete = useCallback(
    (id: number) => {
      deleteTodo.mutate(id)
    },
    [deleteTodo]
  )

  const handleClearCompleted = useCallback(() => {
    clearCompleted.mutate()
  }, [clearCompleted])

  // --- Derived State ---
  const remainingCount = useMemo(
    () => todos.filter((todo) => !todo.completed).length,
    [todos]
  )
  const hasCompleted = useMemo(
    () => todos.some((todo) => todo.completed),
    [todos]
  )

  // --- Duplicate Check (using cache data) ---
  const isDuplicate = useCallback(
    (text: string, excludeId?: number) => {
      const lower = text.toLowerCase()
      return todos.some(
        (t) => t.id !== excludeId && t.text.toLowerCase() === lower
      )
    },
    [todos]
  )

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4 transition-colors duration-300">
        <main className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-lg dark:shadow-gray-900/50 transition-colors duration-300">
          <Header />

          <TodoForm isDuplicate={isDuplicate} onAdd={handleAdd} />

          {/* Loading State */}
          {isLoading && <LoadingSpinner />}

          {/* Error State */}
          {isError && (
            <ErrorDisplay
              message={error?.message || 'Failed to load todos'}
              onRetry={() => refetch()}
            />
          )}

          {/* Success State */}
          {!isLoading && !isError && (
            <>
              <TodoList
                todos={todos}
                isDuplicate={isDuplicate}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onEdit={handleEdit}
              />
              <TodoFooter
                remainingCount={remainingCount}
                hasCompleted={hasCompleted}
                onClearCompleted={handleClearCompleted}
              />
            </>
          )}

          <div className="px-4 pb-4 sm:px-6 sm:pb-5">
            <button
              type="button"
              onClick={() => setShowHelp(true)}
              className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            >
              Keyboard shortcuts
            </button>
          </div>
        </main>
      </div>

      <Suspense fallback={null}>
        {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      </Suspense>

      {/* TanStack Query Devtools — press Shift+Alt+Q to toggle */}
      <ReactQueryDevtools initialIsOpen={false} />
    </ThemeProvider>
  )
}

// --- Root Component with Providers ---
// ErrorBoundary catches React render errors.
// QueryClientProvider gives the whole tree access to React Query.

export default function AppWithProviders() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
