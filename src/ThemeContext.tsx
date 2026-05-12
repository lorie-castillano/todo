import { createContext, useContext, useEffect } from 'react'
import { useLocalStorage } from './hooks/useLocalStorage'

// --- Context API ---
// Context lets you pass data through the component tree WITHOUT
// manually passing props at every level. It's ideal for "global"
// concerns like theme, auth, or locale.
//
// DO NOT use Context for everything — it causes ALL consumers to
// re-render when the value changes. For frequently changing data
// (like a text input), props are better.

interface ThemeContextValue {
  darkMode: boolean
  toggleDarkMode: () => void
}

// createContext needs a default value. This is used when a component
// reads context but has no Provider above it — mostly useful for tests.
const ThemeContext = createContext<ThemeContextValue | null>(null)

// --- Provider Component ---
// Now uses useLocalStorage — dark mode preference survives page refreshes.

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [darkMode, setDarkMode] = useLocalStorage('darkMode', false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  const toggleDarkMode = () => setDarkMode((prev) => !prev)

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

// --- Custom Hook ---
// Always wrap useContext in a custom hook. This gives you:
// 1. A clear error message if used outside the Provider
// 2. A clean import: `useTheme()` instead of `useContext(ThemeContext)`
// 3. Encapsulation — consumers don't need to import the context itself

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
