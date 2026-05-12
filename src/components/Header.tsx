import { useTheme } from '../ThemeContext'

// Header consumes dark mode from ThemeContext — no props needed.
// This is the power of Context: Header can be deeply nested and
// still access theme state without prop drilling through every parent.

export function Header() {
  const { darkMode, toggleDarkMode } = useTheme()

  return (
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
          onClick={toggleDarkMode}
          className="rounded-lg p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
          aria-label="Toggle dark mode"
        >
          {darkMode ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  )
}
