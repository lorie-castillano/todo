import {
  useReducer,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useState,
  lazy,
  Suspense,
} from 'react'
import type { Todo } from './types'
import { Header } from './components/Header'
import { TodoForm } from './components/TodoForm'
import { TodoList } from './components/TodoList'
import { TodoFooter } from './components/TodoFooter'
import { ThemeProvider } from './ThemeContext'
import { todoReducer } from './todoReducer'

// CODE SPLITTING: HelpModal is loaded ONLY when the user opens it.
// Vite/Rollup creates a separate chunk that's fetched on demand.
// This shrinks the initial bundle and speeds up first paint.
const HelpModal = lazy(() => import('./components/HelpModal'))

const STORAGE_KEY = 'todos'

// Read initial todos from localStorage.
// This is a plain function, not a hook — it runs once as a lazy initializer.
function loadTodos(): Todo[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored !== null ? (JSON.parse(stored) as Todo[]) : []
  } catch {
    return []
  }
}

// App is the orchestrator. State transitions are now in todoReducer.ts —
// App just dispatches actions and passes data down.

function App() {
  // Help modal visibility — local UI state, kept in App for simplicity.
  const [showHelp, setShowHelp] = useState(false)

  // useReducer's 3rd argument is a lazy initializer function.
  // It receives the 2nd argument (undefined here) and returns the initial state.
  // This is the same pattern as useState's lazy initializer — avoids
  // parsing JSON on every render.
  const [todos, dispatch] = useReducer(todoReducer, undefined, loadTodos)

  // Persist todos to localStorage whenever they change.
  // We skip the first render (same pattern as useLocalStorage)
  // because we just loaded from storage — no need to write back.
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
    } catch {
      console.warn('Failed to save todos to localStorage')
    }
  }, [todos])

  // --- Handlers (wrapped in useCallback for stable references) ---
  //
  // Why useCallback here?
  // Without it, handleToggle is a NEW function on every render.
  // That means TodoItem's `onToggle` prop changes every render,
  // breaking React.memo's shallow comparison and causing re-renders
  // of every TodoItem on every state change.
  //
  // `dispatch` from useReducer is GUARANTEED stable by React, so it's
  // safe to use as the only dependency (or omit since React knows it's stable).

  const handleAdd = useCallback((text: string) => {
    dispatch({ type: 'ADD', text })
  }, [])

  const handleToggle = useCallback((id: number) => {
    dispatch({ type: 'TOGGLE', id })
  }, [])

  const handleDelete = useCallback((id: number) => {
    dispatch({ type: 'DELETE', id })
  }, [])

  const handleClearCompleted = useCallback(() => {
    dispatch({ type: 'CLEAR_COMPLETED' })
  }, [])

  const handleEdit = useCallback((id: number, text: string) => {
    dispatch({ type: 'EDIT', id, text })
  }, [])

  // --- Stable duplicate-check callback via ref pattern ---
  //
  // Problem: if we passed `todos` to TodoItem for duplicate checking,
  // EVERY TodoItem would re-render whenever ANY todo changes (because
  // the todos array is a new reference). React.memo can't help.
  //
  // Solution: keep a ref that always points to the latest todos, and
  // expose a STABLE callback that reads from it. The callback reference
  // never changes, so React.memo works perfectly.
  const todosRef = useRef(todos)
  useEffect(() => {
    todosRef.current = todos
  })

  const isDuplicate = useCallback((text: string, excludeId?: number) => {
    const lower = text.toLowerCase()
    return todosRef.current.some(
      (t) => t.id !== excludeId && t.text.toLowerCase() === lower
    )
  }, [])

  // --- Derived State (memoized) ---
  //
  // These computations are O(n) over todos. For small lists it doesn't matter,
  // but useMemo also ensures TodoFooter's props are stable when todos hasn't
  // changed — which matters once we memoize TodoFooter.
  const remainingCount = useMemo(
    () => todos.filter((todo) => !todo.completed).length,
    [todos]
  )
  const hasCompleted = useMemo(
    () => todos.some((todo) => todo.completed),
    [todos]
  )

  return (
    // ThemeProvider wraps the tree — any descendant can call useTheme()
    // without needing darkMode/onToggleDarkMode props passed down.
    <ThemeProvider>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4 transition-colors duration-300">
        <main className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-lg dark:shadow-gray-900/50 transition-colors duration-300">
          <Header />
          <TodoForm isDuplicate={isDuplicate} onAdd={handleAdd} />
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

      {/*
        Suspense renders `fallback` while the lazy chunk loads.
        Since loading a small chunk on localhost is ~instant, the user
        usually won't see the fallback — but it's required by React.
      */}
      <Suspense fallback={null}>
        {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      </Suspense>
    </ThemeProvider>
  )
}

export default App
