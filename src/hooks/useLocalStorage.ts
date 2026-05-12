import { useState, useEffect, useRef } from 'react'

// --- Custom Hook: useLocalStorage ---
//
// A custom hook is just a function that uses other hooks.
// Naming convention: always start with "use" — this tells React
// to enforce the Rules of Hooks (no conditional calls, no loops).
//
// This hook syncs a piece of state to localStorage so it survives
// page refreshes. It's a drop-in replacement for useState.

export function useLocalStorage<T>(key: string, initialValue: T) {
  // Lazy initializer: the function passed to useState runs ONCE on mount.
  // We read from localStorage here so we don't parse JSON on every render.
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key)
      return stored !== null ? (JSON.parse(stored) as T) : initialValue
    } catch {
      // If localStorage is corrupted or parsing fails, use the default
      return initialValue
    }
  })

  // useRef to track if this is the first render.
  // We skip writing to localStorage on mount because we just READ from it.
  const isFirstRender = useRef(true)

  useEffect(() => {
    // Skip the first render — we don't want to write back what we just read
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // localStorage might be full or disabled (private browsing)
      console.warn(`Failed to save "${key}" to localStorage`)
    }
  }, [key, value])

  return [value, setValue] as const
  // "as const" makes the return type a readonly tuple [T, SetStateAction<T>]
  // instead of (T | SetStateAction<T>)[]. This lets destructuring work:
  //   const [todos, setTodos] = useLocalStorage('todos', [])
  //   todos is T, setTodos is the setter — not a union of both.
}
