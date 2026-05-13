import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../ThemeContext'

// Header consumes dark mode from ThemeContext — no props needed.
// Adds tap/hover micro-interactions and an icon swap animation.

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
        <motion.button
          type="button"
          onClick={toggleDarkMode}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="rounded-lg p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200 overflow-hidden relative w-9 h-9 flex items-center justify-center"
          aria-label="Toggle dark mode"
        >
          {/* AnimatePresence with mode="wait" ensures one icon exits before the next enters */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={darkMode ? 'sun' : 'moon'}
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute"
            >
              {darkMode ? '☀️' : '🌙'}
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </div>
    </header>
  )
}
