// UndoRedoControls renders two buttons that drive the historyStore.
// Disabled state comes from selectors so the buttons only re-render when
// the relevant stack length changes (not on every store update).

import { useCallback, useEffect } from 'react'
import { useCanRedo, useCanUndo, useRedo, useUndo } from '../stores/historyStore'

export function UndoRedoControls() {
  const canUndo = useCanUndo()
  const canRedo = useCanRedo()
  const undo = useUndo()
  const redo = useRedo()

  // Wrap in handlers that swallow errors so a failed mutation does not
  // crash the click. The store already logs the error and restores history.
  const handleUndo = useCallback(() => {
    undo().catch(() => {})
  }, [undo])
  const handleRedo = useCallback(() => {
    redo().catch(() => {})
  }, [redo])

  // Keyboard shortcuts: Cmd/Ctrl+Z for undo, Cmd/Ctrl+Shift+Z for redo.
  // Matches industry conventions (VSCode, Figma, Google Docs).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const isMod = event.metaKey || event.ctrlKey
      if (!isMod || event.key.toLowerCase() !== 'z') return
      // Ignore when focus is in an editable field — let the browser handle
      // native undo on inputs/textareas, which most users expect.
      const target = event.target as HTMLElement | null
      const tag = target?.tagName
      const isEditable =
        tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable
      if (isEditable) return
      event.preventDefault()
      if (event.shiftKey) {
        handleRedo()
      } else {
        handleUndo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleUndo, handleRedo])

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleUndo}
        disabled={!canUndo}
        aria-label="Undo"
        title="Undo (⌘Z)"
        className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
      >
        ↶ Undo
      </button>
      <button
        type="button"
        onClick={handleRedo}
        disabled={!canRedo}
        aria-label="Redo"
        title="Redo (⌘⇧Z)"
        className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
      >
        ↷ Redo
      </button>
    </div>
  )
}
