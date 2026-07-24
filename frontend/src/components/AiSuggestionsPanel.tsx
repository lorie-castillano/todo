import { memo, useMemo, useState } from 'react'
import { generateSuggestions } from '../lib/aiSuggestions'
import type { Todo } from '../types'

// AiSuggestionsPanel — the beta feature gated behind the `aiSuggestions` flag.
//
// Unlike `bulkActions` (a percentage rollout), this flag uses the userList
// strategy: it's visible only to specific account IDs listed in the flag
// registry. That makes it the perfect demo of targeted beta access.
//
// It reads the current todos and offers suggested new ones. "Refresh" rotates
// through the pool; each suggestion has an "Add" button that creates the todo.

interface AiSuggestionsPanelProps {
  todos: Pick<Todo, 'text'>[]
  onAdd: (text: string) => void
}

function AiSuggestionsPanelImpl({ todos, onAdd }: AiSuggestionsPanelProps) {
  // `offset` drives the Refresh button — bumping it rotates the suggestions.
  const [offset, setOffset] = useState(0)

  const suggestions = useMemo(
    () => generateSuggestions(todos, { offset }),
    [todos, offset]
  )

  return (
    <section
      aria-label="AI suggestions"
      className="mx-4 sm:mx-6 my-3 rounded-xl border border-purple-200 dark:border-purple-900/50 bg-purple-50 dark:bg-purple-950/30 p-3 sm:p-4"
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <h2 className="text-sm font-semibold text-purple-800 dark:text-purple-200 flex items-center gap-1.5">
          <span aria-hidden="true">✨</span>
          AI Suggestions
          <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-100">
            Beta
          </span>
        </h2>
        <button
          type="button"
          onClick={() => setOffset((o) => o + 1)}
          className="text-xs text-purple-700 dark:text-purple-300 hover:text-purple-900 dark:hover:text-purple-100 underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-purple-500 rounded px-1"
        >
          Refresh
        </button>
      </div>

      {suggestions.length === 0 ? (
        <p className="text-xs text-purple-700/80 dark:text-purple-300/80">
          No new suggestions right now — you’re all caught up!
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {suggestions.map((text) => (
            <li
              key={text}
              className="flex items-center justify-between gap-2 bg-white dark:bg-gray-800 rounded-lg px-3 py-1.5 border border-purple-100 dark:border-purple-900/40"
            >
              <span className="text-sm text-gray-700 dark:text-gray-200">{text}</span>
              <button
                type="button"
                onClick={() => onAdd(text)}
                className="shrink-0 text-xs px-2.5 py-1 rounded-md bg-purple-600 hover:bg-purple-700 text-white font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                Add
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export const AiSuggestionsPanel = memo(AiSuggestionsPanelImpl)
