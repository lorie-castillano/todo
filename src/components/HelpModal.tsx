import { motion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { useReducedMotion } from '../hooks/useReducedMotion'

// HelpModal — explains keyboard shortcuts and features.
// This is loaded lazily because most users won't open it,
// so we shouldn't ship its code in the initial bundle.

interface HelpModalProps {
  onClose: () => void
}

// Focus trap utility: keeps Tab navigation within the modal
function useFocusTrap(containerRef: React.RefObject<HTMLElement | null>, isActive: boolean) {
  useEffect(() => {
    if (!isActive || !containerRef.current) return

    const container = containerRef.current
    const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      const focusableElements = Array.from(container.querySelectorAll(focusableSelectors)) as HTMLElement[]
      if (focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]
      const activeElement = document.activeElement as HTMLElement

      // Shift+Tab: going backwards
      if (e.shiftKey) {
        if (activeElement === firstElement || !focusableElements.includes(activeElement)) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        // Tab: going forwards
        if (activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isActive, containerRef])
}

export function HelpModal({ onClose }: HelpModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const prefersReducedMotion = useReducedMotion()

  // Call hook at top level (not inside useEffect) — React Hook rules
  useFocusTrap(modalRef, true)

  // Save previously focused element and handle Escape
  useEffect(() => {
    // Save what was focused before modal opened
    previousFocusRef.current = document.activeElement as HTMLElement

    // Close on Escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      // Return focus to trigger element when modal closes
      previousFocusRef.current?.focus()
    }
  }, [onClose])

  return (
    <motion.div
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-title"
    >
      <motion.div
        ref={modalRef}
        initial={prefersReducedMotion ? false : { scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={prefersReducedMotion ? { opacity: 0 } : { scale: 0.95, opacity: 0 }}
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : { type: 'spring', stiffness: 400, damping: 30 }
        }
        className="max-w-md w-full rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="help-title"
          className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4"
        >
          Keyboard Shortcuts & Tips
        </h2>
        <dl className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
          <div className="flex justify-between">
            <dt>Edit a todo</dt>
            <dd>
              <kbd className="rounded bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs">
                Enter
              </kbd>{' '}
              <span className="text-gray-400">or</span>{' '}
              <kbd className="rounded bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs">
                Double-click
              </kbd>
            </dd>
          </div>
          <div className="flex justify-between">
            <dt>Save edit</dt>
            <dd>
              <kbd className="rounded bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs">
                Enter
              </kbd>
            </dd>
          </div>
          <div className="flex justify-between">
            <dt>Cancel edit</dt>
            <dd>
              <kbd className="rounded bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs">
                Esc
              </kbd>
            </dd>
          </div>
          <div className="flex justify-between">
            <dt>Close this help</dt>
            <dd>
              <kbd className="rounded bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs">
                Esc
              </kbd>{' '}
              <span className="text-gray-400">or</span>{' '}
              <kbd className="rounded bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs">
                Click outside
              </kbd>
            </dd>
          </div>
        </dl>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Got it
        </button>
      </motion.div>
    </motion.div>
  )
}

// Default export so React.lazy can consume it
export default HelpModal
