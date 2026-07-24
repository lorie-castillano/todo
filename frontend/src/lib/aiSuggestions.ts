// AI suggestions — the data source behind the beta `aiSuggestions` feature flag.
//
// This is a MOCK implementation with a deliberate seam: `generateSuggestions`
// is a pure function that takes the current todos and returns suggested new
// ones. To go live, swap the body for a real LLM call (e.g. POST /api/ai/suggest)
// — the component and flag wiring stay exactly the same.
//
// Keeping it pure (no network, no randomness by default) makes it trivial to
// unit test and keeps the UI deterministic per input.

import type { Todo } from '../types'

// A small curated pool of generically useful todos. In a real system these
// would come from an LLM conditioned on the user's existing list.
const SUGGESTION_POOL: readonly string[] = [
  'Plan tomorrow’s top 3 priorities',
  'Review and archive completed tasks',
  'Break a big task into smaller steps',
  'Schedule a 15-minute focus block',
  'Reply to pending messages',
  'Tidy up your workspace',
  'Take a short break and stretch',
  'Back up important files',
  'Write down one thing you learned today',
  'Set a reminder for an upcoming deadline',
]

// Suggestions starter set shown when the list is empty — a gentle onboarding.
const EMPTY_STATE_SUGGESTIONS: readonly string[] = [
  'Add your first todo',
  'Plan your day',
  'List this week’s goals',
]

export interface GenerateOptions {
  // How many suggestions to return.
  count?: number
  // Rotates which slice of the pool is returned — lets a "Refresh" button
  // surface different ideas deterministically without real randomness.
  offset?: number
}

// Produce suggestions that are NOT already in the user's list (case-insensitive),
// so we never suggest something they've already got.
export function generateSuggestions(
  todos: Pick<Todo, 'text'>[],
  options: GenerateOptions = {}
): string[] {
  const { count = 3, offset = 0 } = options

  if (todos.length === 0) {
    return EMPTY_STATE_SUGGESTIONS.slice(0, count)
  }

  const existing = new Set(todos.map((t) => t.text.trim().toLowerCase()))
  const available = SUGGESTION_POOL.filter(
    (s) => !existing.has(s.trim().toLowerCase())
  )

  if (available.length === 0) return []

  // Rotate the pool by `offset` so consecutive refreshes cycle through ideas.
  const start = ((offset % available.length) + available.length) % available.length
  const rotated = [...available.slice(start), ...available.slice(0, start)]
  return rotated.slice(0, count)
}
