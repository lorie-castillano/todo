import { useState, useEffect } from 'react'

// --- TypeScript Types (Lesson 1.5) ---

// An interface defines the "shape" of an object.
// Every Todo must have these exact fields with these exact types.
interface Todo {
  id: number
  text: string
  completed: boolean
}

// --- Component ---

function App() {
  // useState<Todo[]> — the generic <Todo[]> tells TypeScript this state
  // is an array of Todo objects. Without it, TS would infer "never[]".
  const [todos, setTodos] = useState<Todo[]>([])

  // useState<string> — TypeScript can infer this from the initial value "",
  // but being explicit is a good habit for readability.
  const [inputValue, setInputValue] = useState<string>('')

  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  // --- Event Handlers ---

  // e: React.FormEvent<HTMLFormElement> — TypeScript types for form events.
  // This tells TS exactly what kind of event this is, giving you autocomplete
  // on e.currentTarget, e.preventDefault(), etc.
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    // Guard clause: don't add empty todos
    const trimmed = inputValue.trim()
    if (!trimmed) return

    // Create a new Todo object
    const newTodo: Todo = {
      id: Date.now(),  // Simple unique ID (we'll improve this later)
      text: trimmed,
      completed: false,
    }

    // Immutable update: spread existing todos + add the new one
    setTodos([...todos, newTodo])

    // Clear the input
    setInputValue('')
  }

  // Toggle a todo's completed status by ID
  const handleToggle = (id: number) => {
    // .map() creates a NEW array — immutable update
    setTodos(
      todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo,
      ),
    )
  }

  // Delete a todo by ID
  const handleDelete = (id: number) => {
    // .filter() creates a NEW array without the matching todo
    setTodos(todos.filter((todo) => todo.id !== id))
  }

  // Clear all completed todos
  const handleClearCompleted = () => {
    setTodos(todos.filter((todo) => !todo.completed))
  }

  // --- Derived State ---
  // Computed from existing state — no need for separate useState
  const remainingCount = todos.filter((todo) => !todo.completed).length
  const hasCompleted = todos.some((todo) => todo.completed)

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4 transition-colors duration-300">
      <main className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-lg dark:shadow-gray-900/50 transition-colors duration-300">
        <header className="px-4 py-5 sm:px-6 sm:py-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">
                Todo App
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                Stay organized, one task at a time
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDarkMode(!darkMode)}
              className="rounded-lg p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
              aria-label="Toggle dark mode"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </header>

        <section aria-label="Add new todo" className="px-4 py-4 sm:px-6 sm:py-5 border-b border-gray-200 dark:border-gray-700">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <label htmlFor="todo-input" className="sr-only">
              New todo
            </label>
            <input
              id="todo-input"
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="What needs to be done?"
              className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 sm:px-4 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
              autoComplete="off"
            />
            <button
              type="submit"
              className="rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors duration-200"
            >
              Add
            </button>
          </form>
        </section>

        <section aria-label="Todo list" className="px-4 py-4 sm:px-6 sm:py-5">
          {/* Conditional rendering: show empty state or the list */}
          {todos.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">
              No todos yet. Add one above!
            </p>
          ) : (
            <ul className="space-y-2 sm:space-y-3" role="list">
              {/* List rendering with .map() — key={todo.id} is REQUIRED */}
              {todos.map((todo) => (
                <li
                  key={todo.id}
                  className={`group flex items-center gap-3 rounded-lg border p-3 transition-all duration-200 ${
                    todo.completed
                      ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    id={`todo-${todo.id}`}
                    checked={todo.completed}
                    onChange={() => handleToggle(todo.id)}
                    className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                    aria-label={`Mark "${todo.text}" as ${todo.completed ? 'incomplete' : 'complete'}`}
                  />
                  <label
                    htmlFor={`todo-${todo.id}`}
                    className={`flex-1 text-sm transition-colors duration-200 ${
                      todo.completed
                        ? 'line-through text-gray-400 dark:text-gray-500'
                        : 'text-gray-700 dark:text-gray-200'
                    }`}
                  >
                    {todo.text}
                  </label>
                  <button
                    type="button"
                    onClick={() => handleDelete(todo.id)}
                    className="text-sm text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-500 rounded px-2 py-1 transition-opacity duration-200"
                    aria-label={`Delete todo: ${todo.text}`}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="px-4 py-3 sm:px-6 sm:py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {remainingCount}
            </span>{' '}
            {remainingCount === 1 ? 'item' : 'items'} remaining
          </p>
          {/* Conditional rendering: only show button if there are completed todos */}
          {hasCompleted && (
            <button
              type="button"
              onClick={handleClearCompleted}
              className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 rounded px-2 py-1 transition-colors duration-200"
            >
              Clear completed
            </button>
          )}
        </footer>
      </main>
    </div>
  )
}

export default App
