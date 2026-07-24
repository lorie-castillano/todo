import { memo } from 'react'

// BulkActionsToolbar — a real feature gated behind the `bulkActions` flag.
//
// This is the "hands-on" side of Lesson 5.5's feature-flag exercise: instead of
// a demo toggle, the flag controls whether this actual productivity feature is
// visible. Because `useFeatureFlag('bulkActions')` buckets on the authenticated
// user's id, a given user consistently sees (or doesn't see) this toolbar across
// sessions — exactly how a real percentage rollout behaves.
//
// Actions:
// - Complete all active todos in one click
// - Clear all completed todos in one click

interface BulkActionsToolbarProps {
  activeCount: number
  completedCount: number
  onCompleteAll: () => void
  onClearCompleted: () => void
}

function BulkActionsToolbarImpl({
  activeCount,
  completedCount,
  onCompleteAll,
  onClearCompleted,
}: BulkActionsToolbarProps) {
  const nothingToDo = activeCount === 0 && completedCount === 0

  return (
    <div
      className="px-4 py-2 sm:px-6 sm:py-2.5 bg-blue-50 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/50 flex items-center gap-3 flex-wrap"
      aria-label="Bulk actions"
    >
      <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
        Bulk actions
      </span>

      <div className="flex items-center gap-2 ml-auto">
        <button
          type="button"
          onClick={onCompleteAll}
          disabled={activeCount === 0}
          className="text-xs px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Complete all{activeCount > 0 ? ` (${activeCount})` : ''}
        </button>
        <button
          type="button"
          onClick={onClearCompleted}
          disabled={completedCount === 0}
          className="text-xs px-2.5 py-1 rounded-md border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Clear completed{completedCount > 0 ? ` (${completedCount})` : ''}
        </button>
      </div>

      {nothingToDo && (
        <span className="sr-only">No todos to act on</span>
      )}
    </div>
  )
}

export const BulkActionsToolbar = memo(BulkActionsToolbarImpl)
