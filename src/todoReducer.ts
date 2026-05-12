import type { Todo } from './types'

// --- Action Types ---
// A discriminated union: each action has a unique `type` string
// and its own specific payload. TypeScript uses the `type` field
// to narrow the union — inside each case of the switch, TS knows
// exactly which payload fields exist.

type TodoAction =
  | { type: 'ADD'; text: string }
  | { type: 'EDIT'; id: number; text: string }
  | { type: 'TOGGLE'; id: number }
  | { type: 'DELETE'; id: number }
  | { type: 'CLEAR_COMPLETED' }

// --- Reducer ---
// A pure function: same inputs → same outputs, no side effects.
// This makes it trivially testable — no React, no DOM, just data in → data out.

export function todoReducer(state: Todo[], action: TodoAction): Todo[] {
  switch (action.type) {
    case 'ADD':
      return [
        ...state,
        {
          id: Date.now(),
          text: action.text,
          completed: false,
        },
      ]

    case 'EDIT':
      // Ignore empty text — this is handled in the UI, but defense in depth
      if (!action.text.trim()) return state
      return state.map((todo) =>
        todo.id === action.id ? { ...todo, text: action.text.trim() } : todo,
      )

    case 'TOGGLE':
      return state.map((todo) =>
        todo.id === action.id
          ? { ...todo, completed: !todo.completed }
          : todo,
      )

    case 'DELETE':
      return state.filter((todo) => todo.id !== action.id)

    case 'CLEAR_COMPLETED':
      return state.filter((todo) => !todo.completed)

    default:
      // This line is unreachable if all action types are handled.
      // TypeScript will error here if you add a new action type
      // but forget to handle it — this is called "exhaustive checking."
      return state
  }
}
