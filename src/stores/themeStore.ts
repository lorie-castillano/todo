import { useEffect } from 'react'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// --- Why Zustand Over Context for Theme? ---
// 1. **No Provider**: Components can read theme anywhere without wrapping.
// 2. **Surgical re-renders**: Only components reading `darkMode` re-render
//    when it changes. With Context, ALL consumers re-render.
// 3. **Built-in persistence**: `persist` middleware replaces our manual
//    `useLocalStorage` + `useEffect` pattern.
// 4. **Less code**: ~15 lines vs ~30 in Context.

interface ThemeState {
  darkMode: boolean
  toggleDarkMode: () => void
  setDarkMode: (value: boolean) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      darkMode: false,
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
      setDarkMode: (value) => set({ darkMode: value }),
    }),
    {
      name: 'theme-storage', // localStorage key (replaces old 'darkMode' key)
      storage: createJSONStorage(() => localStorage),
    },
  ),
)

// --- Selectors ---
// Components that only need to READ the value (not toggle) should use
// these. They prevent re-renders when other store slices change.
export const useDarkMode = (): boolean => useThemeStore((s) => s.darkMode)
export const useToggleDarkMode = (): (() => void) =>
  useThemeStore((s) => s.toggleDarkMode)

// --- DOM Sync Hook ---
// This hook applies the `dark` class to <html> when darkMode changes.
// Called once in `App.tsx`. We separate the DOM side effect from the store
// to keep the store pure and testable (no DOM dependency).
export function useThemeDomSync(): void {
  const darkMode = useDarkMode()
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])
}
