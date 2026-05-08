function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <main className="w-full max-w-lg bg-white rounded-xl shadow-md">
        <header className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-800">Todo App</h1>
          <p className="text-sm text-gray-500 mt-1">Stay organized, one task at a time</p>
        </header>

        <section aria-label="Add new todo" className="p-6 border-b border-gray-200">
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
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoComplete="off"
            />
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Add
            </button>
          </form>
        </section>

        <section aria-label="Todo list" className="p-6">
          <ul className="space-y-3" role="list">
            <li className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
              <input
                type="checkbox"
                id="todo-1"
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                aria-label="Mark todo as complete"
              />
              <label htmlFor="todo-1" className="flex-1 text-sm text-gray-700">
                Learn semantic HTML
              </label>
              <button
                type="button"
                className="text-sm text-red-500 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 rounded px-2 py-1"
                aria-label="Delete todo: Learn semantic HTML"
              >
                Delete
              </button>
            </li>
            <li className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
              <input
                type="checkbox"
                id="todo-2"
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                aria-label="Mark todo as complete"
              />
              <label htmlFor="todo-2" className="flex-1 text-sm text-gray-700 line-through text-gray-400">
                Set up project with Vite
              </label>
              <button
                type="button"
                className="text-sm text-red-500 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 rounded px-2 py-1"
                aria-label="Delete todo: Set up project with Vite"
              >
                Delete
              </button>
            </li>
          </ul>
        </section>

        <footer className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
          <p className="text-sm text-gray-500">
            <span className="font-medium text-gray-700">1</span> item remaining
          </p>
          <button
            type="button"
            className="text-sm text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400 rounded px-2 py-1"
          >
            Clear completed
          </button>
        </footer>
      </main>
    </div>
  )
}

export default App
