import { useState, useRef, useEffect } from 'react'
import type { Todo } from '../types'

// TodoItem with inline editing: double-click to edit, Enter to save, Escape to cancel.
// This demonstrates controlled form patterns with local state for transient UI state.

interface TodoItemProps {
  todo: Todo
  onToggle: (id: number) => void
  onDelete: (id: number) => void
  onEdit: (id: number, text: string) => void
}

// Validation constants
const MAX_LENGTH = 100

export function TodoItem({ todo, onToggle, onDelete, onEdit }: TodoItemProps) {
  // --- Local UI State ---
  // isEditing is LOCAL to this component — App doesn't need to know about it.
  // This is "ephemeral" state that resets when the component unmounts.
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(todo.text)
  const [error, setError] = useState<string | null>(null)

  // Auto-focus the input when entering edit mode
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus()
      inputRef.current?.select() // Select all text for easy replacement
    }
  }, [isEditing])

  // Reset edit value if todo text changes externally (e.g., from another session)
  useEffect(() => {
    if (!isEditing) {
      setEditValue(todo.text)
    }
  }, [todo.text, isEditing])

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
    <li
      className={`group flex items-center gap-3 rounded-lg border p-3 transition-all duration-200 ${
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
        // VIEW MODE: Clickable label
        <label
          htmlFor={`todo-${todo.id}`}
          onDoubleClick={handleDoubleClick}
          className={`flex-1 text-sm transition-colors duration-200 cursor-pointer ${
            todo.completed
              ? 'line-through text-gray-400 dark:text-gray-500'
              : 'text-gray-700 dark:text-gray-200'
          }`}
          title={todo.completed ? 'Cannot edit completed todos' : 'Double-click to edit'}
        >
          {todo.text}
        </label>
      )}

      <button
        type="button"
        onClick={() => onDelete(todo.id)}
        className="text-sm text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-500 rounded px-2 py-1 transition-opacity duration-200"
        aria-label={`Delete todo: ${todo.text}`}
      >
        Delete
      </button>
    </li>
  )
}
