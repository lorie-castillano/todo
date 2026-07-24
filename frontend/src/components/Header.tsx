import { motion, AnimatePresence } from 'framer-motion'
import { useDarkMode, useToggleDarkMode } from '../stores/themeStore'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { useAuth } from '../context/AuthContext'

// Header consumes dark mode from the Zustand theme store — no props needed.
// Adds tap/hover micro-interactions and an icon swap animation.
// Respects user's reduced motion preferences for accessibility.

export function Header() {
  // Two selectors instead of one context object — each subscribes to a single
  // slice. If the store gains more state later, this component won't re-render
  // when that unrelated state changes.
  const darkMode = useDarkMode()
  const toggleDarkMode = useToggleDarkMode()
  const prefersReducedMotion = useReducedMotion()
  const { user, logout } = useAuth()

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
        <div className="flex items-center gap-2">
          <motion.button
            type="button"
            onClick={toggleDarkMode}
            whileHover={prefersReducedMotion ? undefined : { scale: 1.1 }}
            whileTap={prefersReducedMotion ? undefined : { scale: 0.9 }}
            className="rounded-lg p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200 overflow-hidden relative w-9 h-9 flex items-center justify-center"
            aria-label="Toggle dark mode"
          >
            {/* AnimatePresence with mode="wait" ensures one icon exits before the next enters */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={darkMode ? 'sun' : 'moon'}
                initial={prefersReducedMotion ? { opacity: 0 } : { rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { rotate: 90, opacity: 0 }}
                transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2 }}
                className="absolute"
              >
                {darkMode ? '☀️' : '🌙'}
              </motion.span>
            </AnimatePresence>
          </motion.button>
        </div>
      </div>

      {/* Signed-in user row: email + logout. Only shown when authenticated. */}
      {user && (
        <div className="mt-3 flex items-center justify-between text-xs sm:text-sm">
          <span className="text-gray-500 dark:text-gray-400 truncate" title={user.email}>
            Signed in as <span className="font-medium text-gray-700 dark:text-gray-300">{user.email}</span>
          </span>
          <button
            type="button"
            onClick={logout}
            className="ml-3 shrink-0 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          >
            Log out
          </button>
        </div>
      )}
    </header>
  )
}
