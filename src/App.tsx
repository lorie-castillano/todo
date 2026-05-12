import { useReducer, useEffect, useRef } from 'react'
import type { Todo } from './types'
import { Header } from './components/Header'
import { TodoForm } from './components/TodoForm'
import { TodoList } from './components/TodoList'
import { TodoFooter } from './components/TodoFooter'
import { ThemeProvider } from './ThemeContext'
import { todoReducer } from './todoReducer'

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

  // --- Handlers now dispatch actions instead of computing state ---
  // Notice how clean these are — they describe intent, not implementation.

  const handleAdd = (text: string) => {
    dispatch({ type: 'ADD', text })
  }

  const handleToggle = (id: number) => {
    dispatch({ type: 'TOGGLE', id })
  }

  const handleDelete = (id: number) => {
    dispatch({ type: 'DELETE', id })
  }

  const handleClearCompleted = () => {
    dispatch({ type: 'CLEAR_COMPLETED' })
  }

  // --- Derived State ---
  const remainingCount = todos.filter((todo) => !todo.completed).length
  const hasCompleted = todos.some((todo) => todo.completed)

  return (
    // ThemeProvider wraps the tree — any descendant can call useTheme()
    // without needing darkMode/onToggleDarkMode props passed down.
    <ThemeProvider>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4 transition-colors duration-300">
        <main className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-lg dark:shadow-gray-900/50 transition-colors duration-300">
          <Header />
          <TodoForm onAdd={handleAdd} />
          <TodoList
            todos={todos}
            onToggle={handleToggle}
            onDelete={handleDelete}
          />
          <TodoFooter
            remainingCount={remainingCount}
            hasCompleted={hasCompleted}
            onClearCompleted={handleClearCompleted}
          />
        </main>
      </div>
    </ThemeProvider>
  )
}

export default App
