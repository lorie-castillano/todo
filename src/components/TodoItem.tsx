import { useState, useRef, useEffect, memo } from 'react'
import { motion } from 'framer-motion'
import { useReducedMotion } from '../hooks/useReducedMotion'
import type { Todo } from '../types'

// TodoItem with inline editing: double-click to edit, Enter to save, Escape to cancel.
// This demonstrates controlled form patterns with local state for transient UI state.

interface TodoItemProps {
  todo: Todo
  // Stable callback so this component can be memoized.
  isDuplicate: (text: string, excludeId?: number) => boolean
  onToggle: (id: number) => void
  onDelete: (id: number) => void
  onEdit: (id: number, text: string) => void
}

// Validation constants
const MAX_LENGTH = 100

// React.memo skips re-renders when props are shallow-equal.
// Combined with stable callbacks from App, completing/editing one
// todo no longer re-renders unrelated todos.
function TodoItemImpl({ todo, isDuplicate, onToggle, onDelete, onEdit }: TodoItemProps) {
  // --- Accessibility: Respect user's motion preferences ---
  const prefersReducedMotion = useReducedMotion()

  // --- Local UI State ---
  // isEditing is LOCAL to this component — App doesn't need to know about it.
  // This is "ephemeral" state that resets when the component unmounts.
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(todo.text)
  const [error, setError] = useState<string | null>(null)

  // --- Adjust state on prop change (React official pattern) ---
  // When `todo.text` changes externally (e.g., another session edited it)
  // and we're NOT currently editing, sync the displayed value.
  //
  // We track the previous prop with state and compare during render.
  // This is the canonical alternative to "setState in useEffect" — it
  // runs synchronously, avoiding cascading renders.
  // See: https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [prevText, setPrevText] = useState(todo.text)
  if (!isEditing && prevText !== todo.text) {
    setPrevText(todo.text)
    setEditValue(todo.text)
  }

  // Auto-focus the input when entering edit mode
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus()
      inputRef.current?.select() // Select all text for easy replacement
    }
  }, [isEditing])

  const handleDoubleClick = () => {
    if (!todo.completed) {
      setIsEditing(true)
      setEditValue(todo.text)
      setError(null)
    }
  }

  const validate = (text: string): string | null => {
    const trimmed = text.trim()
    if (!trimmed) return 'Todo text cannot be empty'
    if (trimmed.length > MAX_LENGTH) return `Maximum ${MAX_LENGTH} characters`
    if (isDuplicate(trimmed, todo.id)) return 'This todo already exists'
    return null
  }

  const handleSave = () => {
    const validationError = validate(editValue)
    if (validationError) {
      setError(validationError)
      return
    }

    // Only call onEdit if the value actually changed
    if (editValue.trim() !== todo.text) {
      onEdit(todo.id, editValue.trim())
    }
    setIsEditing(false)
    setError(null)
  }

  const handleCancel = () => {
    setEditValue(todo.text)
    setIsEditing(false)
    setError(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    }
  }

  return (
    <motion.li
      layout={!prefersReducedMotion}
      initial={prefersReducedMotion ? false : { opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -20, scale: 0.95 }}
      transition={
        prefersReducedMotion
          ? { duration: 0 }
          : {
              type: 'spring',
              stiffness: 500,
              damping: 30,
              opacity: { duration: 0.2 },
            }
      }
      className={`group flex items-center gap-3 rounded-lg border p-3 ${
        todo.completed
          ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
    >
      <input
        type="checkbox"
        id={`todo-${todo.id}`}
        checked={todo.completed}
        onChange={() => onToggle(todo.id)}
        className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
        aria-label={`Mark "${todo.text}" as ${todo.completed ? 'incomplete' : 'complete'}`}
      />

      {isEditing ? (
        // EDIT MODE: Controlled input with validation
        <div className="flex-1 flex flex-col gap-1">
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => {
              setEditValue(e.target.value)
              setError(null) // Clear error on change
            }}
            onKeyDown={handleKeyDown}
            onBlur={handleSave} // Save on blur (clicking outside)
            className="w-full rounded border border-blue-300 dark:border-blue-600 bg-white dark:bg-gray-700 px-2 py-1 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Edit todo text"
            maxLength={MAX_LENGTH + 10} // Allow typing but validate on save
          />
          {error && (
            <span className="text-xs text-red-500 dark:text-red-400">
              {error}
            </span>
          )}
        </div>
      ) : (
        // VIEW MODE: Clickable text with keyboard support
        <span
          onDoubleClick={handleDoubleClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !todo.completed) {
              e.preventDefault()
              handleDoubleClick()
            }
          }}
          tabIndex={todo.completed ? -1 : 0}
          role={todo.completed ? undefined : 'button'}
          aria-label={todo.completed ? undefined : `Edit todo: ${todo.text}`}
          className={`flex-1 text-sm transition-colors duration-200 ${
            todo.completed
              ? 'line-through text-gray-400 dark:text-gray-500'
              : 'text-gray-700 dark:text-gray-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1'
          }`}
          title={todo.completed ? 'Cannot edit completed todos' : 'Double-click or press Enter to edit'}
        >
          {todo.text}
        </span>
      )}

      <button
        type="button"
        onClick={() => onDelete(todo.id)}
        className="text-sm text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-500 rounded px-2 py-1 transition-opacity duration-200"
        aria-label={`Delete todo: ${todo.text}`}
      >
        Delete
      </button>
    </motion.li>
  )
}

// Memoized export — props are shallow-compared on each render.
// Re-renders only if `todo`, `isDuplicate`, `onToggle`, `onDelete`, or `onEdit` changes.
export const TodoItem = memo(TodoItemImpl)
