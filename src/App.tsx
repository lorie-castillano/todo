import { useState, useEffect } from 'react'

function App() {
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

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
          <form
            onSubmit={(e) => e.preventDefault()}
            className="flex gap-2"
          >
            <label htmlFor="todo-input" className="sr-only">
              New todo
            </label>
            <input
              id="todo-input"
              type="text"
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
          <ul className="space-y-2 sm:space-y-3" role="list">
            <li className="group flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 p-3 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200">
              <input
                type="checkbox"
                id="todo-1"
                className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                aria-label="Mark todo as complete"
              />
              <label htmlFor="todo-1" className="flex-1 text-sm text-gray-700 dark:text-gray-200 transition-colors duration-200">
                Learn semantic HTML
              </label>
              <button
                type="button"
                className="text-sm text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-500 rounded px-2 py-1 transition-opacity duration-200"
                aria-label="Delete todo: Learn semantic HTML"
              >
                Delete
              </button>
            </li>
            <li className="group flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 p-3 hover:border-gray-300 dark:hover:border-gray-600 bg-gray-50 dark:bg-gray-800/50 transition-all duration-200">
              <input
                type="checkbox"
                id="todo-2"
                defaultChecked
                className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                aria-label="Mark todo as complete"
              />
              <label htmlFor="todo-2" className="flex-1 text-sm line-through text-gray-400 dark:text-gray-500 transition-colors duration-200">
                Set up project with Vite
              </label>
              <button
                type="button"
                className="text-sm text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-500 rounded px-2 py-1 transition-opacity duration-200"
                aria-label="Delete todo: Set up project with Vite"
              >
                Delete
              </button>
            </li>
          </ul>
        </section>

        <footer className="px-4 py-3 sm:px-6 sm:py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            <span className="font-medium text-gray-700 dark:text-gray-300">1</span> item remaining
          </p>
          <button
            type="button"
            className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 rounded px-2 py-1 transition-colors duration-200"
          >
            Clear completed
          </button>
        </footer>
      </main>
    </div>
  )
}

export default App
