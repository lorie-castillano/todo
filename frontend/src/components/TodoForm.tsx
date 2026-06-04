import { useState, useRef } from 'react'

interface TodoFormProps {
  // Stable callback from parent so this component doesn't depend on the
  // todos array (which changes reference on every state update).
  isDuplicate: (text: string, excludeId?: number) => boolean
  onAdd: (text: string) => void
}

const MAX_LENGTH = 100

export function TodoForm({ isDuplicate, onAdd }: TodoFormProps) {
  const [inputValue, setInputValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const validate = (text: string): string | null => {
    const trimmed = text.trim()
    if (!trimmed) return 'Todo cannot be empty'
    if (trimmed.length > MAX_LENGTH) return `Maximum ${MAX_LENGTH} characters`
    if (isDuplicate(trimmed)) return 'This todo already exists'
    return null
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const trimmed = inputValue.trim()
    const validationError = validate(trimmed)

    if (validationError) {
      setError(validationError)
      return
    }

    // OPTIMISTIC UI: Clear input immediately for snappy feel
    // The todo will appear in the list after reducer processes
    setInputValue('')
    setError(null)
    onAdd(trimmed)
    // Keep focus on input so user can immediately type next todo
    inputRef.current?.focus()
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
    if (error) setError(null) // Clear error on type
  }

  return (
    <section
      aria-label="Add new todo"
      className="px-4 py-4 sm:px-6 sm:py-5 border-b border-gray-200 dark:border-gray-700"
    >
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1 flex flex-col gap-1">
          <input
            ref={inputRef}
            id="todo-input"
            type="text"
            value={inputValue}
            onChange={handleChange}
            placeholder="What needs to be done?"
            className={`w-full rounded-lg border bg-white dark:bg-gray-700 px-3 py-2 sm:px-4 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 ${
              error
                ? 'border-red-300 dark:border-red-600 focus:ring-red-500'
                : 'border-gray-300 dark:border-gray-600'
            }`}
            autoComplete="off"
            maxLength={MAX_LENGTH + 10}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? 'todo-error' : undefined}
          />
          {error && (
            <span id="todo-error" className="text-xs text-red-500 dark:text-red-400">
              {error}
            </span>
          )}
        </div>
        <button
          type="submit"
          className="rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors duration-200"
        >
          Add
        </button>
      </form>
    </section>
  )
}
