// useReducedMotion — respects user's motion preferences
//
// Some users have vestibular disorders (dizziness, nausea) triggered by
// motion/animation. They can set "Reduce motion" in their OS preferences.
// This hook detects that preference and lets us disable/simplify animations.
//
// Uses `useSyncExternalStore` — the canonical React 18+ pattern for
// subscribing to external state sources (like media queries). This avoids
// the anti-pattern of "setState inside useEffect" and provides:
// - Tearing prevention during concurrent rendering
// - SSR support via getServerSnapshot
// - Cleaner cleanup (subscription is managed by React)

import { useSyncExternalStore } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

/** Subscribe to media query changes. Returns a cleanup function. */
function subscribe(callback: () => void): () => void {
  const mediaQuery = window.matchMedia(QUERY)
  mediaQuery.addEventListener('change', callback)
  return () => mediaQuery.removeEventListener('change', callback)
}

/** Read the current value of the media query. */
function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches
}

/** Server-side fallback — assume no preference (don't disable animations). */
function getServerSnapshot(): boolean {
  return false
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
