import { create } from 'zustand'

// --- Command Pattern for Undo/Redo ---
//
// Why this design?
// Our todos live on a server (via TanStack Query), so we can't snapshot
// state arrays for undo. Instead, we record COMMANDS — each command
// knows how to execute and how to reverse itself. This is the same
// pattern used by VSCode, Figma, Photoshop, and most production editors.
//
// Each command is a self-contained unit:
//   - execute(): performs the action (server mutation)
//   - undo(): reverses the action (compensating server mutation)
//   - description: short label for UI like "Undo: Delete 'Buy milk'"
//
// The history store keeps two stacks:
//   - past: commands that have been executed (can be undone)
//   - future: commands that were undone (can be redone)

export interface Command {
  /** Reverses the command on the server. */
  undo: () => Promise<void>
  /** Re-applies the command on the server (used by redo). */
  redo: () => Promise<void>
  /** Human-readable label shown in UI tooltips. */
  description: string
}

interface HistoryState {
  past: Command[]
  future: Command[]
  /**
   * Push a command after a successful initial action. The command knows
   * how to undo itself (compensating mutation) and how to redo itself
   * (re-applying the original mutation).
   */
  push: (command: Command) => void
  undo: () => Promise<void>
  redo: () => Promise<void>
  /** Clears both stacks. Useful after a hard refresh or user logout. */
  clear: () => void
}

// Max history entries to prevent unbounded memory growth.
// 50 is generous for an interactive app and matches VSCode's default.
const MAX_HISTORY = 50

export const useHistoryStore = create<HistoryState>()((set, get) => ({
  past: [],
  future: [],

  push: (command) =>
    set((state) => ({
      // Cap the history at MAX_HISTORY by dropping the oldest entry.
      // This keeps the undo stack bounded and prevents memory leaks
      // in long-running sessions.
      past: [...state.past, command].slice(-MAX_HISTORY),
      // Any new command invalidates the redo stack — this matches
      // user mental models (try "undo, edit, redo" in any editor;
      // the redo is gone).
      future: [],
    })),

  undo: async () => {
    const { past } = get()
    if (past.length === 0) return
    const command = past[past.length - 1]
    // Optimistically move the command to `future` BEFORE awaiting.
    // If the undo throws, we restore the original order in the catch.
    set({
      past: past.slice(0, -1),
      future: [command, ...get().future],
    })
    try {
      await command.undo()
    } catch (error) {
      // Restore on failure so the user can retry. We log here because
      // the caller (a button click handler) might not surface the error.
      console.error('Undo failed; restoring history:', error)
      set({
        past: [...get().past, command],
        future: get().future.slice(1),
      })
      throw error
    }
  },

  redo: async () => {
    const { future } = get()
    if (future.length === 0) return
    const command = future[0]
    set({
      past: [...get().past, command],
      future: future.slice(1),
    })
    try {
      await command.redo()
    } catch (error) {
      console.error('Redo failed; restoring history:', error)
      set({
        past: get().past.slice(0, -1),
        future: [command, ...get().future],
      })
      throw error
    }
  },

  clear: () => set({ past: [], future: [] }),
}))

// --- Selectors ---
// Components subscribing to just `canUndo`/`canRedo` won't re-render
// when other parts of the store change.
export const useCanUndo = (): boolean =>
  useHistoryStore((s) => s.past.length > 0)
export const useCanRedo = (): boolean =>
  useHistoryStore((s) => s.future.length > 0)
export const useUndo = (): (() => Promise<void>) =>
  useHistoryStore((s) => s.undo)
export const useRedo = (): (() => Promise<void>) =>
  useHistoryStore((s) => s.redo)
export const usePushCommand = (): ((command: Command) => void) =>
  useHistoryStore((s) => s.push)
