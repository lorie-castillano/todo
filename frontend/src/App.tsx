import { useState, useCallback, useMemo, lazy, Suspense } from 'react'
import { useLocation } from 'react-router-dom'
import { Header } from './components/Header'
import { TodoForm } from './components/TodoForm'
import { TodoList } from './components/TodoList'
import { TodoFooter } from './components/TodoFooter'
import { FilterNav } from './components/FilterNav'
import { LiveRegion } from './components/LiveRegion'
import { UndoRedoControls } from './components/UndoRedoControls'
import { BulkActionsToolbar } from './components/BulkActionsToolbar'
import { AiSuggestionsPanel } from './components/AiSuggestionsPanel'
import { useTodos } from './hooks/useTodos'
import { useTodoCommands } from './hooks/useTodoCommands'
import { useFeatureFlag } from './hooks/useFeatureFlag'

// CODE SPLITTING: HelpModal is loaded ONLY when the user opens it.
const HelpModal = lazy(() => import('./components/HelpModal'))

// MSW startup moved to main.tsx where it's controlled by VITE_USE_BACKEND.
// When VITE_USE_BACKEND=true, MSW is skipped and requests go to the real backend.

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
  const [announcement, setAnnouncement] = useState('')
  const location = useLocation()

  // Get filter from URL (e.g., /active → 'active')
  const filter = getFilterFromPath(location.pathname)

  // --- Data Fetching ---
  const { data: todos = [], isLoading, isError, error, refetch } = useTodos()

  // --- Mutations wrapped with undo/redo command pattern ---
  // Each call to addTodo/toggle/edit/remove/clearCompleted records a Command
  // in the history store. The user can undo/redo via the UI buttons or
  // keyboard shortcuts (⌘Z / ⌘⇧Z).
  const { addTodo, toggle, edit, remove, clearCompleted } = useTodoCommands()

  // --- Feature flag: bulk actions ---
  // Gated behind a percentage rollout keyed on the authenticated user's id.
  // The same user consistently gets the same experience across sessions.
  const showBulkActions = useFeatureFlag('bulkActions')

  // --- Feature flag: AI suggestions (beta) ---
  // userList strategy: visible only to specific account IDs in the registry.
  const showAiSuggestions = useFeatureFlag('aiSuggestions')

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

  // --- Handlers with screen reader announcements ---
  // Each handler awaits the command (so optimistic updates settle before
  // we measure counts), but we fire-and-forget at the call site since
  // these are user click handlers, not awaited by the renderer.
  const handleAdd = useCallback(
    (text: string) => {
      void addTodo(text)
      setAnnouncement(`Todo added: ${text}. ${remainingCount + 1} items remaining.`)
    },
    [addTodo, remainingCount]
  )

  const handleToggle = useCallback(
    (id: number) => {
      const todo = todos.find((t) => t.id === id)
      if (todo) {
        const newCompleted = !todo.completed
        void toggle(id)
        setAnnouncement(
          newCompleted
            ? `Todo completed: ${todo.text}`
            : `Todo marked as active: ${todo.text}`
        )
      }
    },
    [toggle, todos]
  )

  const handleEdit = useCallback(
    (id: number, text: string) => {
      const todo = todos.find((t) => t.id === id)
      void edit(id, text)
      setAnnouncement(`Todo edited${todo ? ` from "${todo.text}"` : ''} to "${text}"`)
    },
    [edit, todos]
  )

  const handleDelete = useCallback(
    (id: number) => {
      const todo = todos.find((t) => t.id === id)
      void remove(id)
      setAnnouncement(`Todo deleted${todo ? `: ${todo.text}` : ''}. ${Math.max(0, remainingCount - (todo?.completed ? 0 : 1))} items remaining.`)
    },
    [remove, todos, remainingCount]
  )

  const handleClearCompleted = useCallback(() => {
    const completedCount = todos.filter(t => t.completed).length
    void clearCompleted()
    setAnnouncement(`${completedCount} completed ${completedCount === 1 ? 'todo' : 'todos'} cleared. ${remainingCount} items remaining.`)
  }, [clearCompleted, todos, remainingCount])

  // Bulk action: mark every active todo as completed. Each toggle records its
  // own undo command, so the user can still undo the batch step by step.
  const handleCompleteAll = useCallback(() => {
    const active = todos.filter((t) => !t.completed)
    active.forEach((t) => void toggle(t.id))
    setAnnouncement(
      `${active.length} ${active.length === 1 ? 'todo' : 'todos'} marked complete.`
    )
  }, [toggle, todos])

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
      {/* Screen reader announcements for dynamic updates */}
      <LiveRegion message={announcement} />

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
            {/* Filter Navigation — URL-driven, with undo/redo controls */}
            <div className="px-4 pt-2 pb-1 sm:px-6 sm:pt-3 border-b border-gray-100 dark:border-gray-700/50 flex items-center justify-between gap-3 flex-wrap">
              <FilterNav counts={filterCounts} />
              <UndoRedoControls />
            </div>

            {/* Bulk actions — only for users in the `bulkActions` rollout */}
            {showBulkActions && (
              <BulkActionsToolbar
                activeCount={remainingCount}
                completedCount={filterCounts.completed}
                onCompleteAll={handleCompleteAll}
                onClearCompleted={handleClearCompleted}
              />
            )}

            {/* AI suggestions — beta, userList-targeted */}
            {showAiSuggestions && (
              <AiSuggestionsPanel todos={todos} onAdd={handleAdd} />
            )}

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
