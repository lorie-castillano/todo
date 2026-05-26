import { useState, useCallback, useMemo, lazy, Suspense } from 'react'
import { useLocation } from 'react-router-dom'
import { Header } from './components/Header'
import { TodoForm } from './components/TodoForm'
import { TodoList } from './components/TodoList'
import { TodoFooter } from './components/TodoFooter'
import { FilterNav } from './components/FilterNav'
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

// Get filter type from URL pathname
function getFilterFromPath(path: string): 'all' | 'active' | 'completed' {
  if (path === '/active') return 'active'
  if (path === '/completed') return 'completed'
  return 'all'
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
// Now with URL-driven filtering via React Router.
// The filter state comes from the URL (/active, /completed, /)
// instead of local state — making it bookmarkable and shareable.

function App() {
  const [showHelp, setShowHelp] = useState(false)
  const location = useLocation()

  // Get filter from URL (e.g., /active → 'active')
  const filter = getFilterFromPath(location.pathname)

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

  // --- Filtered Todos (URL-driven) ---
  const filteredTodos = useMemo(() => {
    switch (filter) {
      case 'active':
        return todos.filter((t) => !t.completed)
      case 'completed':
        return todos.filter((t) => t.completed)
      default:
        return todos
    }
  }, [todos, filter])

  // --- Derived State ---
  const remainingCount = useMemo(
    () => todos.filter((todo) => !todo.completed).length,
    [todos]
  )
  const hasCompleted = useMemo(
    () => todos.some((todo) => todo.completed),
    [todos]
  )

  // Filter counts for navigation
  const filterCounts = useMemo(
    () => ({
      all: todos.length,
      active: remainingCount,
      completed: todos.length - remainingCount,
    }),
    [todos.length, remainingCount]
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
            {/* Filter Navigation — URL-driven */}
            <div className="px-4 pt-2 pb-1 sm:px-6 sm:pt-3 border-b border-gray-100 dark:border-gray-700/50">
              <FilterNav counts={filterCounts} />
            </div>

            <TodoList
              todos={filteredTodos}
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

        <Suspense fallback={null}>
          {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
        </Suspense>
      </div>
  )
}

export default App
