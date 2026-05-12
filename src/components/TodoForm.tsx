import { useState } from 'react'

// TodoForm owns its OWN input state — the parent doesn't need to know
// about every keystroke. It only tells the parent when a todo is submitted.
// This is called "lifting state up only when necessary."

interface TodoFormProps {
  onAdd: (text: string) => void
}

export function TodoForm({ onAdd }: TodoFormProps) {
  // Input state is LOCAL to this component — not lifted to App
  const [inputValue, setInputValue] = useState('')

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const trimmed = inputValue.trim()
    if (!trimmed) return

    // Call the parent's callback with just the text
    onAdd(trimmed)

    // Clear the local input
    setInputValue('')
  }

  return (
    <section
      aria-label="Add new todo"
      className="px-4 py-4 sm:px-6 sm:py-5 border-b border-gray-200 dark:border-gray-700"
    >
      <form onSubmit={handleSubmit} className="flex gap-2">
        <label htmlFor="todo-input" className="sr-only">
          New todo
        </label>
        <input
          id="todo-input"
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="What needs to be done?"
          className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 sm:px-4 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
          autoComplete="off"
        />
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
