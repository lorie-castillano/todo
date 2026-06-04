import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useHistoryStore, type Command } from './historyStore'

// Helper: builds a Command whose execute/undo we can spy on.
function makeCommand(label = 'test'): Command & {
  undoSpy: ReturnType<typeof vi.fn>
  redoSpy: ReturnType<typeof vi.fn>
} {
  const undoSpy = vi.fn().mockResolvedValue(undefined)
  const redoSpy = vi.fn().mockResolvedValue(undefined)
  return {
    description: label,
    undo: undoSpy,
    redo: redoSpy,
    undoSpy,
    redoSpy,
  }
}

beforeEach(() => {
  useHistoryStore.setState({ past: [], future: [] })
})

describe('historyStore', () => {
  describe('push', () => {
    it('adds a command to the past stack', () => {
      useHistoryStore.getState().push(makeCommand('add'))
      expect(useHistoryStore.getState().past).toHaveLength(1)
    })

    it('clears the future stack when a new command is pushed', () => {
      useHistoryStore.setState({ past: [], future: [makeCommand('redoable')] })
      useHistoryStore.getState().push(makeCommand('new'))
      expect(useHistoryStore.getState().future).toHaveLength(0)
    })

    it('caps history at 50 entries', () => {
      const store = useHistoryStore.getState()
      for (let i = 0; i < 60; i++) store.push(makeCommand(`cmd-${i}`))
      expect(useHistoryStore.getState().past).toHaveLength(50)
      // Oldest entries dropped, newest kept
      expect(useHistoryStore.getState().past[0].description).toBe('cmd-10')
    })
  })

  describe('undo', () => {
    it('calls the last command undo and moves it to future', async () => {
      const cmd = makeCommand('delete')
      useHistoryStore.getState().push(cmd)
      await useHistoryStore.getState().undo()
      expect(cmd.undoSpy).toHaveBeenCalledOnce()
      expect(useHistoryStore.getState().past).toHaveLength(0)
      expect(useHistoryStore.getState().future).toHaveLength(1)
    })

    it('is a no-op when past is empty', async () => {
      await useHistoryStore.getState().undo()
      expect(useHistoryStore.getState().past).toHaveLength(0)
    })

    it('restores history if undo throws', async () => {
      const cmd = makeCommand('flaky')
      cmd.undoSpy.mockRejectedValueOnce(new Error('network'))
      useHistoryStore.getState().push(cmd)
      await expect(useHistoryStore.getState().undo()).rejects.toThrow('network')
      expect(useHistoryStore.getState().past).toHaveLength(1)
      expect(useHistoryStore.getState().future).toHaveLength(0)
    })
  })

  describe('redo', () => {
    it('calls the first future command redo and moves it back to past', async () => {
      const cmd = makeCommand('toggle')
      useHistoryStore.getState().push(cmd)
      await useHistoryStore.getState().undo()
      await useHistoryStore.getState().redo()
      expect(cmd.redoSpy).toHaveBeenCalledOnce()
      expect(useHistoryStore.getState().past).toHaveLength(1)
      expect(useHistoryStore.getState().future).toHaveLength(0)
    })

    it('is a no-op when future is empty', async () => {
      await useHistoryStore.getState().redo()
      expect(useHistoryStore.getState().future).toHaveLength(0)
    })

    it('restores history if redo throws', async () => {
      const cmd = makeCommand('flaky-redo')
      cmd.redoSpy.mockRejectedValueOnce(new Error('500'))
      useHistoryStore.getState().push(cmd)
      await useHistoryStore.getState().undo()
      await expect(useHistoryStore.getState().redo()).rejects.toThrow('500')
      expect(useHistoryStore.getState().past).toHaveLength(0)
      expect(useHistoryStore.getState().future).toHaveLength(1)
    })
  })

  describe('clear', () => {
    it('empties both stacks', () => {
      useHistoryStore.getState().push(makeCommand('a'))
      useHistoryStore.getState().push(makeCommand('b'))
      useHistoryStore.getState().clear()
      expect(useHistoryStore.getState().past).toHaveLength(0)
      expect(useHistoryStore.getState().future).toHaveLength(0)
    })
  })
})
