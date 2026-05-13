import { motion } from 'framer-motion'

// HelpModal — explains keyboard shortcuts and features.
// This is loaded lazily because most users won't open it,
// so we shouldn't ship its code in the initial bundle.

interface HelpModalProps {
  onClose: () => void
}

export function HelpModal({ onClose }: HelpModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-title"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
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
