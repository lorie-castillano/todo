// TodoFooter shows the remaining count and "Clear completed" button.
// Notice it receives DERIVED data (remainingCount, hasCompleted)
// rather than the full todos array — it only gets what it needs to render.

interface TodoFooterProps {
  remainingCount: number
  hasCompleted: boolean
  onClearCompleted: () => void
}

export function TodoFooter({
  remainingCount,
  hasCompleted,
  onClearCompleted,
}: TodoFooterProps) {
  return (
    <footer className="px-4 py-3 sm:px-6 sm:py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
        <span className="font-medium text-gray-700 dark:text-gray-300">
          {remainingCount}
        </span>{' '}
        {remainingCount === 1 ? 'item' : 'items'} remaining
      </p>
      {hasCompleted && (
        <button
          type="button"
          onClick={onClearCompleted}
          className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 rounded px-2 py-1 transition-colors duration-200"
        >
          Clear completed
        </button>
      )}
    </footer>
  )
}
